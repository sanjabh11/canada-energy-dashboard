import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "https://canada-energy.netlify.app",
  "https://*.netlify.app",
];

const envAllowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(new Set([
  ...envAllowedOrigins,
  ...DEFAULT_ALLOWED_ORIGINS,
]));

function buildCorsHeaders(originHeader: string | null): Record<string, string> {
  const fallbackOrigin = ALLOWED_ORIGINS[0] ?? DEFAULT_ALLOWED_ORIGINS[0];

  const origin = originHeader && ALLOWED_ORIGINS.includes(originHeader)
    ? originHeader
    : fallbackOrigin;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

const SUPABASE_URL = Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY")
  ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? Deno.env.get("EDGE_SUPABASE_ANON_KEY")
  ?? Deno.env.get("SUPABASE_ANON_KEY")
  ?? "";

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

type TrendTimeframe = {
  label: string;
  days: number;
};

const TIMEFRAME_MAP: Record<string, TrendTimeframe> = {
  '7d': { label: 'last_7_days', days: 7 },
  '30d': { label: 'last_30_days', days: 30 },
  '90d': { label: 'last_90_days', days: 90 },
  '180d': { label: 'last_180_days', days: 180 },
};

function resolveTimeframe(raw: string | null): TrendTimeframe {
  if (!raw) return TIMEFRAME_MAP['30d'];
  const normalized = raw.toLowerCase();
  return TIMEFRAME_MAP[normalized] ?? TIMEFRAME_MAP['30d'];
}

type GenerationRow = {
  date: string;
  province_code: string | null;
  generation_gwh: number | null;
};

type DemandRow = {
  bucket_date: string;
  average_mw: number | null;
};

async function loadGenerationSeries(windowStart: string): Promise<GenerationRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('provincial_generation')
    .select('date, province_code, generation_gwh')
    .gte('date', windowStart)
    .order('date', { ascending: true });

  if (error) {
    console.error('Generation trend query failed', error);
    return [];
  }

  return (data ?? []) as GenerationRow[];
}

async function loadOntarioDemandSeries(windowStart: string): Promise<DemandRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .rpc('ontario_hourly_demand_daily_avg', { start_date: windowStart });

  if (error) {
    console.warn('Daily demand RPC missing, falling back to manual aggregation', error);

    const { data: fallback, error: fallbackError } = await supabase
      .from('ontario_hourly_demand')
      .select('hour, market_demand_mw')
      .gte('hour', `${windowStart}T00:00:00Z`)
      .order('hour', { ascending: true });

    if (fallbackError) {
      console.error('Ontario demand fallback query failed', fallbackError);
      return [];
    }

    const buckets = new Map<string, { sum: number; count: number }>();
    for (const row of fallback ?? []) {
      const hour = (row as { hour: string }).hour;
      const mw = (row as { market_demand_mw: number | null }).market_demand_mw ?? 0;
      const bucket = hour.slice(0, 10);
      const current = buckets.get(bucket) ?? { sum: 0, count: 0 };
      current.sum += mw;
      current.count += 1;
      buckets.set(bucket, current);
    }

    return Array.from(buckets.entries())
      .map(([bucket_date, stats]) => ({
        bucket_date,
        average_mw: stats.count > 0 ? stats.sum / stats.count : null,
      }))
      .sort((a, b) => a.bucket_date.localeCompare(b.bucket_date));
  }

  return (data ?? []) as DemandRow[];
}

function transformGeneration(rows: GenerationRow[]): {
  national: Array<{ date: string; generation_gwh: number }>;
  by_province: Record<string, Array<{ date: string; generation_gwh: number }>>;
} {
  const nationalBuckets = new Map<string, number>();
  const provincialBuckets = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const date = row.date ?? 'unknown';
    const province = row.province_code ?? 'UNSPECIFIED';
    const value = row.generation_gwh ?? 0;

    nationalBuckets.set(date, (nationalBuckets.get(date) ?? 0) + value);

    const provinceBucket = provincialBuckets.get(province) ?? new Map<string, number>();
    provinceBucket.set(date, (provinceBucket.get(date) ?? 0) + value);
    provincialBuckets.set(province, provinceBucket);
  }

  const national = Array.from(nationalBuckets.entries())
    .map(([date, generation_gwh]) => ({ date, generation_gwh }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const by_province: Record<string, Array<{ date: string; generation_gwh: number }>> = {};
  for (const [province, bucket] of provincialBuckets.entries()) {
    by_province[province] = Array.from(bucket.entries())
      .map(([date, generation_gwh]) => ({ date, generation_gwh }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  return { national, by_province };
}

function transformDemand(rows: DemandRow[]): Array<{ date: string; average_mw: number | null }> {
  return rows
    .map((row) => ({ date: row.bucket_date, average_mw: row.average_mw }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase client not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const timeframe = resolveTimeframe(url.searchParams.get('timeframe'));

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - timeframe.days * 24 * 60 * 60 * 1000);
  const windowStartStr = windowStart.toISOString().slice(0, 10);

  try {
    const [generationRows, demandRows] = await Promise.all([
      loadGenerationSeries(windowStartStr),
      loadOntarioDemandSeries(windowStartStr),
    ]);

    const generationSeries = transformGeneration(generationRows);
    const demandSeries = transformDemand(demandRows);

    const uniqueGenDates = new Set(generationRows.map((r) => (r as { date: string }).date));
    const effectiveDays = Math.min(uniqueGenDates.size, timeframe.days);
    const completenessPct = timeframe.days > 0 ? (effectiveDays / timeframe.days) * 100 : 0;
    const excludedDays = timeframe.days - effectiveDays;
    const demandSampleCount = demandSeries.length;

    const payload = {
      timeframe: timeframe.label,
      window: {
        start: windowStartStr,
        end: windowEnd.toISOString().slice(0, 10),
        days: timeframe.days,
        days_effective: effectiveDays,
      },
      generation: generationSeries,
      ontario_demand: demandSeries,
      metadata: {
        sources: ['provincial_generation', 'ontario_hourly_demand'],
        completeness_pct: parseFloat(completenessPct.toFixed(2)),
        excluded_days_below_threshold: Math.max(0, excludedDays),
        completeness_threshold_pct: 95,
        demand_sample_count: demandSampleCount,
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled analytics trends error', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
