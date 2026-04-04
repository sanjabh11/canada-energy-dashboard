import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { buildDataProvenance } from "../_shared/dataProvenance.ts";

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

type DemandSeriesResult = {
  rows: DemandRow[];
  provenance: {
    source: string;
    last_updated: string | null;
    freshness_status: 'live' | 'stale' | 'demo' | 'unknown';
    is_fallback: boolean;
  };
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

function getLatestDate(values: string[]): string | null {
  const valid = values
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  return valid[0]?.toISOString() ?? null;
}

/**
 * Generate synthetic Ontario demand data for fallback
 */
function generateSyntheticDemandData(windowStart: string, days: number): DemandRow[] {
  const result: DemandRow[] = [];
  const startDate = new Date(windowStart);

  // Base demand with seasonal and daily patterns
  const baselineDemand = 15000; // MW

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = currentDate.toISOString().slice(0, 10);

    // Add realistic variation:
    // - Seasonal pattern (higher in winter/summer, lower in spring/fall)
    const dayOfYear = Math.floor((currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const seasonalFactor = 1 + 0.15 * Math.cos((dayOfYear / 365) * 2 * Math.PI); // ±15% seasonal variation

    // - Day of week pattern (lower on weekends)
    const dayOfWeek = currentDate.getDay();
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.92 : 1.0;

    // - Random daily variation
    const randomFactor = 1 + (Math.random() - 0.5) * 0.08; // ±4% random variation

    const averageMw = baselineDemand * seasonalFactor * weekendFactor * randomFactor;

    result.push({
      bucket_date: dateStr,
      average_mw: Math.round(averageMw)
    });
  }

  return result;
}

async function loadOntarioDemandSeries(windowStart: string, days: number): Promise<DemandSeriesResult> {
  if (!supabase) {
    console.warn('No Supabase client, using synthetic demand data');
    const rows = generateSyntheticDemandData(windowStart, days);
    return {
      rows,
      provenance: buildDataProvenance({
        source: 'Synthetic Ontario demand model',
        lastUpdated: getLatestDate(rows.map((row) => row.bucket_date)),
        isFallback: true,
        staleAfterHours: 24,
      }),
    };
  }

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
      console.error('Ontario demand fallback query failed, using synthetic data', fallbackError);
      const rows = generateSyntheticDemandData(windowStart, days);
      return {
        rows,
        provenance: buildDataProvenance({
          source: 'Synthetic Ontario demand model',
          lastUpdated: getLatestDate(rows.map((row) => row.bucket_date)),
          isFallback: true,
          staleAfterHours: 24,
        }),
      };
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

    const aggregated = Array.from(buckets.entries())
      .map(([bucket_date, stats]) => ({
        bucket_date,
        average_mw: stats.count > 0 ? stats.sum / stats.count : null,
      }))
      .sort((a, b) => a.bucket_date.localeCompare(b.bucket_date));

    // If we got less than 3 days of data, use synthetic data instead
    if (aggregated.length < 3) {
      console.warn(`Only ${aggregated.length} days of demand data found, using synthetic data`);
      const rows = generateSyntheticDemandData(windowStart, days);
      return {
        rows,
        provenance: buildDataProvenance({
          source: 'Synthetic Ontario demand model',
          lastUpdated: getLatestDate(rows.map((row) => row.bucket_date)),
          isFallback: true,
          staleAfterHours: 24,
        }),
      };
    }

    return {
      rows: aggregated,
      provenance: buildDataProvenance({
        source: 'Ontario hourly demand manual aggregation',
        lastUpdated: getLatestDate(aggregated.map((row) => row.bucket_date)),
        isFallback: false,
        staleAfterHours: 24,
      }),
    };
  }

  const result = (data ?? []) as DemandRow[];

  // If we got less than 3 days of data, use synthetic data instead
  if (result.length < 3) {
    console.warn(`Only ${result.length} days of demand data found, using synthetic data`);
    const rows = generateSyntheticDemandData(windowStart, days);
    return {
      rows,
      provenance: buildDataProvenance({
        source: 'Synthetic Ontario demand model',
        lastUpdated: getLatestDate(rows.map((row) => row.bucket_date)),
        isFallback: true,
        staleAfterHours: 24,
      }),
    };
  }

  return {
    rows: result,
    provenance: buildDataProvenance({
      source: 'Ontario hourly demand daily average',
      lastUpdated: getLatestDate(result.map((row) => row.bucket_date)),
      isFallback: false,
      staleAfterHours: 24,
    }),
  };
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

function resolveObservedWindow(
  generationRows: GenerationRow[],
  demandRows: Array<{ date: string; average_mw: number | null }>,
  fallbackStart: string,
  fallbackEnd: string,
): { start: string; end: string } {
  const dates = [
    ...generationRows.map((row) => row.date).filter((date): date is string => Boolean(date)),
    ...demandRows.map((row) => row.date).filter((date): date is string => Boolean(date)),
  ].sort((a, b) => a.localeCompare(b));

  if (dates.length === 0) {
    return { start: fallbackStart, end: fallbackEnd };
  }

  return {
    start: dates[0] ?? fallbackStart,
    end: dates[dates.length - 1] ?? fallbackEnd,
  };
}

serve(async (req) => {
  const rl = applyRateLimit(req, 'api-v2-analytics-trends');
  if (rl.response) return rl.response;

  const corsHeaders = createCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
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
    const [generationRows, demandSeries] = await Promise.all([
      loadGenerationSeries(windowStartStr),
      loadOntarioDemandSeries(windowStartStr, timeframe.days),
    ]);

    const generationSeries = transformGeneration(generationRows);
    const demandRows = demandSeries.rows;
    const transformedDemandSeries = transformDemand(demandRows);
    const observedWindow = resolveObservedWindow(
      generationRows,
      transformedDemandSeries,
      windowStartStr,
      windowEnd.toISOString().slice(0, 10),
    );

    const uniqueGenDates = new Set(generationRows.map((r) => (r as { date: string }).date));
    const effectiveDays = Math.min(uniqueGenDates.size, timeframe.days);
    const completenessPct = timeframe.days > 0 ? (effectiveDays / timeframe.days) * 100 : 0;
    const excludedDays = timeframe.days - effectiveDays;
    const demandSampleCount = transformedDemandSeries.length;
    const generationProvenance = buildDataProvenance({
      source: 'provincial_generation',
      lastUpdated: getLatestDate(generationRows.map((row) => row.date)),
      isFallback: generationRows.length === 0,
      staleAfterHours: 24 * 7,
    });

    const payload = {
      timeframe: timeframe.label,
      window: {
        start: observedWindow.start,
        end: observedWindow.end,
        days: timeframe.days,
        days_effective: effectiveDays,
      },
      generation: generationSeries,
      ontario_demand: transformedDemandSeries,
      metadata: {
        sources: [generationProvenance.source, demandSeries.provenance.source],
        completeness_pct: parseFloat(completenessPct.toFixed(2)),
        excluded_days_below_threshold: Math.max(0, excludedDays),
        completeness_threshold_pct: 95,
        demand_sample_count: demandSampleCount,
        provenance: {
          generation: generationProvenance,
          ontario_demand: demandSeries.provenance,
        },
        is_fallback: generationProvenance.is_fallback || demandSeries.provenance.is_fallback,
      },
      provenance: {
        generation: generationProvenance,
        ontario_demand: demandSeries.provenance,
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
