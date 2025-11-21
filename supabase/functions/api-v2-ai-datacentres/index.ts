// Supabase Edge Function: api-v2-ai-datacentres
// Fetches AI data centre registry, power consumption, and grid impact data
// Strategic Priority: Alberta's $100B AI data centre strategy

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { logApiUsage } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Input validation constants
const VALID_PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
const VALID_DC_STATUSES = ['Proposed', 'Interconnection Queue', 'Under Construction', 'Operational', 'Commissioning', 'Decommissioned'];

// CORS configuration
function getCorsHeaders(req: Request) {
  const allowedOrigins = (Deno.env.get('CORS_ALLOWED_ORIGINS') || 'http://localhost:5173').split(',');
  const origin = req.headers.get('origin') || '';
  const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');

  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || allowedOrigins[0]) : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function isApiKeyValid(req: Request): boolean {
  const headerKey = req.headers.get('apikey') || '';
  const authHeader = req.headers.get('authorization') || '';
  let token = '';
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim();
  }

  const allowedKeys = [
    Deno.env.get('EDGE_SUPABASE_ANON_KEY') || '',
    Deno.env.get('SUPABASE_ANON_KEY') || '',
  ].filter(Boolean);

  if (allowedKeys.length === 0) {
    // If no public anon key is configured, do not hard-fail on API key
    return true;
  }

  return allowedKeys.includes(headerKey) || (token && allowedKeys.includes(token));
}

// Input validation
function validateProvince(input: string | null): string {
  const province = (input || 'AB').toUpperCase().trim();
  if (!VALID_PROVINCES.includes(province)) {
    return 'AB';  // Default to Alberta if invalid
  }
  return province;
}

function validateStatus(input: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  return VALID_DC_STATUSES.includes(trimmed) ? trimmed : null;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const start = Date.now();
  const url = new URL(req.url);
  const ipAddress =
    req.headers.get('x-forwarded-for') ||
    req.headers.get('cf-connecting-ip') ||
    null;
  const apiKey = req.headers.get('apikey');

  async function safeLog(statusCode: number, extra?: Record<string, unknown>) {
    try {
      await logApiUsage({
        endpoint: 'api-v2-ai-datacentres',
        method: req.method,
        statusCode,
        apiKey: apiKey || null,
        ipAddress,
        responseTimeMs: Date.now() - start,
        extra: {
          province: url.searchParams.get('province') || undefined,
          status: url.searchParams.get('status') || undefined,
          ...extra,
        },
      });
    } catch (_err) {
      // Logging failures should never affect the main response path
    }
  }

  if (req.method === 'OPTIONS') {
    await safeLog(204);
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== 'GET') {
    await safeLog(405);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 405,
    });
  }

  if (!isApiKeyValid(req)) {
    await safeLog(401);
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      message: 'Missing or invalid API key',
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 401,
    });
  }

  try {

    // Validate inputs
    const province = validateProvince(url.searchParams.get('province'));
    const status = validateStatus(url.searchParams.get('status'));
    const includeTimeseries = url.searchParams.get('timeseries') === 'true';

    // Fetch AI data centres
    let dcQuery = supabase
      .from('ai_data_centres')
      .select('*')
      .eq('province', province)
      .order('contracted_capacity_mw', { ascending: false });

    if (status) {
      dcQuery = dcQuery.eq('status', status);
    }

    const { data: dataCentres, error: dcError } = await dcQuery;

    if (dcError) throw dcError;

    // Calculate total capacity metrics
    const totalContractedMW = dataCentres?.reduce((sum, dc) => sum + (dc.contracted_capacity_mw || 0), 0) || 0;
    const operationalMW = dataCentres?.filter(dc => dc.status === 'Operational')
      .reduce((sum, dc) => sum + (dc.average_load_mw || 0), 0) || 0;
    const queuedMW = dataCentres?.filter(dc => dc.status === 'Interconnection Queue')
      .reduce((sum, dc) => sum + (dc.contracted_capacity_mw || 0), 0) || 0;

    // Get latest power consumption if requested
    let powerData = null;
    if (includeTimeseries && dataCentres && dataCentres.length > 0) {
      const { data: power } = await supabase
        .from('ai_dc_power_consumption')
        .select('*')
        .in('data_centre_id', dataCentres.map(dc => dc.id))
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(100);

      powerData = power || [];
    }

    // Get Alberta grid capacity snapshot (use maybeSingle to handle empty table)
    const { data: gridCapacity } = await supabase
      .from('alberta_grid_capacity')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();  // Returns null if table empty, no HTTP 406 error

    const response = {
      data_centres: dataCentres || [],
      summary: {
        total_count: dataCentres?.length || 0,
        total_contracted_capacity_mw: totalContractedMW,
        operational_capacity_mw: operationalMW,
        queued_capacity_mw: queuedMW,
        by_status: getStatusBreakdown(dataCentres || []),
        by_operator: getOperatorBreakdown(dataCentres || []),
        average_pue: calculateAveragePUE(dataCentres || []),
      },
      grid_impact: gridCapacity ? {
        current_peak_demand_mw: gridCapacity.current_peak_demand_mw,
        total_dc_load_mw: gridCapacity.total_dc_load_mw,
        dc_percentage_of_peak: gridCapacity.dc_percentage_of_peak,
        total_queue_mw: gridCapacity.total_queue_mw,
        dc_queue_mw: gridCapacity.dc_queue_mw,
        reliability_rating: gridCapacity.reliability_rating,
        phase1_allocated_mw: gridCapacity.phase1_allocated_mw,
        phase1_remaining_mw: gridCapacity.phase1_remaining_mw,
      } : null,
      power_consumption: powerData,
      metadata: {
        province,
        last_updated: new Date().toISOString(),
        data_source: 'Canada Energy Dashboard',
        strategic_context: 'Alberta $100B AI Data Centre Strategy',
      }
    };
    await safeLog(200, {
      data_centres_count: dataCentres?.length || 0,
    });

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    });
  } catch (err) {
    console.error('AI Data Centres API error:', err);
    await safeLog(500, { error: String(err) });
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: 'Failed to fetch AI data centres data'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500,
    });
  }
});

function getStatusBreakdown(dataCentres: any[]) {
  const breakdown: Record<string, number> = {};
  dataCentres.forEach(dc => {
    const status = dc.status || 'Unknown';
    breakdown[status] = (breakdown[status] || 0) + 1;
  });
  return breakdown;
}

function getOperatorBreakdown(dataCentres: any[]) {
  const breakdown: Record<string, { count: number; total_capacity_mw: number }> = {};
  dataCentres.forEach(dc => {
    const operator = dc.operator || 'Unknown';
    if (!breakdown[operator]) {
      breakdown[operator] = { count: 0, total_capacity_mw: 0 };
    }
    breakdown[operator].count += 1;
    breakdown[operator].total_capacity_mw += dc.contracted_capacity_mw || 0;
  });
  return breakdown;
}

function calculateAveragePUE(dataCentres: any[]) {
  const pueValues = dataCentres
    .map(dc => dc.pue_actual || dc.pue_design)
    .filter(pue => pue != null && pue > 0);

  if (pueValues.length === 0) return null;

  const avgPue = pueValues.reduce((sum, pue) => sum + pue, 0) / pueValues.length;
  return Math.round(avgPue * 100) / 100;
}
