import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type DemandRecord = {
  hour: string;
  market_demand_mw: number | null;
  ontario_demand_mw: number | null;
};

type GenerationByProvince = {
  province_code: string | null;
  generation_gwh: number;
};

type GenerationSummary = {
  total_generation_gwh: number | null;
  by_province: GenerationByProvince[];
  window_start: string;
  window_end: string;
};

type AlbertaRecord = {
  timestamp: string;
  total_gen_mw: number | null;
  total_demand_mw: number | null;
  pool_price_cad: number | null;
};

type WeatherRecord = {
  timestamp: string;
  station_id: string;
  temperature_c: number | null;
  wind_speed_m_s: number | null;
};

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

async function getLatestDemand(): Promise<DemandRecord | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("ontario_hourly_demand")
    .select("hour, market_demand_mw, ontario_demand_mw")
    .order("hour", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load Ontario demand", error);
    return null;
  }

  return data as DemandRecord | null;
}

async function getGenerationSummary(): Promise<GenerationSummary | null> {
  if (!supabase) return null;

  const windowStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const windowStart = windowStartDate.toISOString().slice(0, 10);
  const windowEnd = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("provincial_generation")
    .select("province_code, generation_gwh")
    .gte("date", windowStart)
    .lte("date", windowEnd);

  if (error) {
    console.error("Failed to load provincial generation", error);
    return null;
  }

  const aggregates = new Map<string, number>();
  for (const row of data ?? []) {
    const province = (row as { province_code: string | null }).province_code ?? "UNSPECIFIED";
    const value = (row as { generation_gwh: number | null }).generation_gwh ?? 0;
    aggregates.set(province, (aggregates.get(province) ?? 0) + value);
  }

  const byProvince: GenerationByProvince[] = Array.from(aggregates.entries()).map(([province_code, generation_gwh]) => ({
    province_code,
    generation_gwh,
  }));

  const total_generation_gwh = byProvince.reduce((sum, record) => sum + record.generation_gwh, 0);

  return {
    total_generation_gwh,
    by_province: byProvince.sort((a, b) => (b.generation_gwh - a.generation_gwh)),
    window_start: windowStart,
    window_end: windowEnd,
  };
}

async function getLatestAlbertaRecord(): Promise<AlbertaRecord | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("alberta_supply_demand")
    .select("timestamp, total_gen_mw, total_demand_mw, pool_price_cad")
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load Alberta supply/demand", error);
    return null;
  }

  return data as AlbertaRecord | null;
}

async function getLatestWeather(): Promise<WeatherRecord[] | null> {
  if (!supabase) return null;

  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("weather_data")
    .select("timestamp, station_id, temperature_c, wind_speed_m_s")
    .gte("timestamp", since)
    .order("timestamp", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Failed to load weather data", error);
    return null;
  }

  return data as WeatherRecord[] | null;
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

  try {
    const [demand, generation, alberta, weather] = await Promise.all([
      getLatestDemand(),
      getGenerationSummary(),
      getLatestAlbertaRecord(),
      getLatestWeather(),
    ]);

    const payload = {
      timestamp: new Date().toISOString(),
      demand,
      generation,
      alberta,
      weather,
      metadata: {
        sources: [
          "ontario_hourly_demand",
          "provincial_generation",
          "alberta_supply_demand",
          "weather_data",
        ],
        window: generation
          ? { start: generation.window_start, end: generation.window_end }
          : null,
        totals: {
          national_generation_gwh: generation?.total_generation_gwh ?? null,
        },
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unhandled error in national overview", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
