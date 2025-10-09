import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,https://canada-energy.netlify.app")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function buildCorsHeaders(originHeader: string | null): Record<string, string> {
  const origin = originHeader && ALLOWED_ORIGINS.includes(originHeader)
    ? originHeader
    : ALLOWED_ORIGINS[0] ?? "http://localhost:5173";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

const SUPABASE_URL = Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY")
  ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? "";

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const VALID_PROVINCES = new Set([
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
]);

function normalizeProvince(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return VALID_PROVINCES.has(normalized) ? normalized : null;
}

async function fetchGeneration(province: string, windowStart: string, windowEnd: string) {
  if (!supabase) return { total: 0, bySource: [] as Array<{ source: string; generation_gwh: number }> };

  const { data, error } = await supabase
    .from("provincial_generation")
    .select("source, generation_gwh")
    .eq("province_code", province)
    .gte("date", windowStart)
    .lte("date", windowEnd);

  if (error) {
    console.error("provincial_generation query failed", { province, error });
    return { total: 0, bySource: [] };
  }

  const aggregates = new Map<string, number>();
  for (const row of data ?? []) {
    const source = (row as { source: string | null }).source ?? "unspecified";
    const value = (row as { generation_gwh: number | null }).generation_gwh ?? 0;
    aggregates.set(source, (aggregates.get(source) ?? 0) + value);
  }

  const bySource = Array.from(aggregates.entries())
    .map(([source, generation_gwh]) => ({ source, generation_gwh }))
    .sort((a, b) => b.generation_gwh - a.generation_gwh);

  const total = bySource.reduce((sum, record) => sum + record.generation_gwh, 0);

  return { total, bySource };
}

async function fetchOntarioDemand(): Promise<{ hour: string; market_demand_mw: number | null } | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("ontario_hourly_demand")
    .select("hour, market_demand_mw")
    .order("hour", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("ontario_hourly_demand query failed", error);
    return null;
  }

  return data as { hour: string; market_demand_mw: number | null } | null;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: "Supabase client not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const provinceParam = normalizeProvince(url.searchParams.get("province"));
  const windowDays = Number(url.searchParams.get("window_days") ?? 30);
  const safeWindowDays = Number.isFinite(windowDays) && windowDays > 0 ? Math.min(windowDays, 180) : 30;

  if (!provinceParam) {
    return new Response(JSON.stringify({ error: "Invalid or missing province parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - safeWindowDays * 24 * 60 * 60 * 1000);
  const windowStartStr = windowStart.toISOString().slice(0, 10);
  const windowEndStr = windowEnd.toISOString().slice(0, 10);

  try {
    const [generation, ontarioDemand] = await Promise.all([
      fetchGeneration(provinceParam, windowStartStr, windowEndStr),
      provinceParam === "ON" ? fetchOntarioDemand() : Promise.resolve(null),
    ]);

    const payload = {
      province: provinceParam,
      period: {
        start: windowStartStr,
        end: windowEndStr,
        days: safeWindowDays,
      },
      generation: {
        total_gwh: generation.total,
        by_source: generation.bySource,
      },
      latest_demand: ontarioDemand,
      metadata: {
        sources: ["provincial_generation"].concat(provinceParam === "ON" ? ["ontario_hourly_demand"] : []),
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unhandled provincial metrics error", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
