import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY")
  ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? Deno.env.get("EDGE_SUPABASE_ANON_KEY")
  ?? Deno.env.get("SUPABASE_ANON_KEY")
  ?? "";

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

const jsonHeaders: Record<string, string> = { "Content-Type": "application/json" };

function getCorsHeaders(originHeader: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": originHeader || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function handleSystemState(req: Request, cors: Record<string, string>): Promise<Response> {
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Supabase client not configured" }), {
      status: 500,
      headers: { ...cors, ...jsonHeaders },
    });
  }

  const body = await req.json().catch(() => ({} as any));
  const regionRaw = (body.region as string | undefined) ?? "canada";
  const region = regionRaw.toLowerCase();

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const provinceCodes = region === "ontario"
    ? ["ON"]
    : region === "alberta"
      ? ["AB"]
      : region === "quebec"
        ? ["QC"]
        : region === "bc"
          ? ["BC"]
          : [];

  let genQuery = supabase
    .from("provincial_generation")
    .select("date, province_code, source, generation_gwh")
    .eq("date", today);

  if (provinceCodes.length > 0) {
    genQuery = genQuery.in("province_code", provinceCodes);
  }

  const { data: genRows, error: genError } = await genQuery;

  if (genError) {
    console.error("digital-twin/system-state generation error:", genError);
  }

  const rows = (genRows ?? []) as Array<{
    date: string | null;
    province_code: string | null;
    source: string | null;
    generation_gwh: number | null;
  }>;

  let totalGenerationGwh = 0;
  let renewableGwh = 0;

  const renewableSources = new Set(["hydro", "water", "wind", "solar", "biomass", "storage"]);

  for (const row of rows) {
    const value = typeof row.generation_gwh === "number" ? row.generation_gwh : 0;
    totalGenerationGwh += value;
    const source = (row.source ?? "").toString().toLowerCase();
    if (renewableSources.has(source)) {
      renewableGwh += value;
    }
  }

  const totalGenerationMw = totalGenerationGwh > 0 ? (totalGenerationGwh * 1000) / 24 : 0;
  const renewablePct = totalGenerationGwh > 0 ? (renewableGwh / totalGenerationGwh) * 100 : 0;

  let totalDemandMw = 0;

  if (region === "alberta") {
    const { data: demandRows } = await supabase
      .from("alberta_supply_demand")
      .select("total_demand_mw")
      .order("timestamp", { ascending: false })
      .limit(1);

    if (demandRows && demandRows.length > 0) {
      const v = (demandRows[0] as any).total_demand_mw;
      totalDemandMw = typeof v === "number" ? v : 0;
    }
  } else {
    const { data: demandRows } = await supabase
      .from("ontario_hourly_demand")
      .select("market_demand_mw")
      .order("hour", { ascending: false })
      .limit(1);

    if (demandRows && demandRows.length > 0) {
      const v = (demandRows[0] as any).market_demand_mw;
      totalDemandMw = typeof v === "number" ? v : 0;
    }
  }

  const reserveMargin = totalDemandMw > 0
    ? Math.max(-50, Math.min(100, ((totalGenerationMw - totalDemandMw) / totalDemandMw) * 100))
    : 0;

  const fossilShare = renewablePct < 100 ? Math.max(0, 100 - renewablePct) : 0;
  const carbonIntensity = 50 + (fossilShare / 100) * 350;

  const systemState = {
    timestamp: now.toISOString(),
    total_generation_mw: Number(totalGenerationMw.toFixed(1)),
    total_demand_mw: Number(totalDemandMw.toFixed(1)),
    reserve_margin_percent: Number(reserveMargin.toFixed(1)),
    frequency_hz: 60.0,
    system_stability:
      reserveMargin < 0 ? "critical"
      : reserveMargin < 5 ? "stressed"
      : "stable",
    renewable_percentage: Number(renewablePct.toFixed(1)),
    carbon_intensity_g_co2_per_kwh: Math.round(carbonIntensity),
    economic_dispatch_cost_cad: Math.round(totalDemandMw * 100),
    nodes: [],
    flows: [],
    weather_impact: {
      temperature_effect_mw: 0,
      wind_generation_mw: 0,
      solar_generation_mw: 0,
      precipitation_impact: 0,
    },
  };

  return new Response(JSON.stringify(systemState), {
    status: 200,
    headers: { ...cors, ...jsonHeaders },
  });
}

serve(async (req) => {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  const cors = getCorsHeaders(origin);
  const path = url.pathname.replace(/\/functions\/v1\/digital-twin\b/, "") || "/";

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (path === "/system-state" && req.method === "POST") {
    try {
      return await handleSystemState(req, cors);
    } catch (e) {
      console.error("digital-twin/system-state error:", e);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...cors, ...jsonHeaders },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { ...cors, ...jsonHeaders },
  });
});

export {};
