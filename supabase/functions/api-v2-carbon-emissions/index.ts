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

const VALID_PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK'];

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
  const province = url.searchParams.get('province');
  const year = url.searchParams.get('year');

  if (!isApiKeyValid(req)) {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      message: 'Missing or invalid API key',
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (province && !VALID_PROVINCES.includes(province)) {
    return new Response(JSON.stringify({ error: 'Invalid province parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (year) {
    const parsedYear = parseInt(year, 10);
    if (!Number.isFinite(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      return new Response(JSON.stringify({ error: 'Invalid year parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    // Fetch provincial emissions
    let emissionsQuery = supabase
      .from('provincial_ghg_emissions')
      .select('*')
      .eq('reporting_quarter', 'Annual');

    if (province) {
      emissionsQuery = emissionsQuery.eq('province_code', province);
    }

    if (year) {
      emissionsQuery = emissionsQuery.eq('reporting_year', parseInt(year));
    }

    const { data: emissions, error: emissionsError } = await emissionsQuery
      .order('reporting_year', { ascending: false })
      .limit(10);

    if (emissionsError) {
      console.error('Emissions query failed', emissionsError);
    }

    // Fetch emissions factors
    const { data: emissionsFactors, error: factorsError } = await supabase
      .from('generation_source_emissions')
      .select('*')
      .order('lifecycle_emissions_gco2_per_kwh', { ascending: false });

    if (factorsError) {
      console.error('Emissions factors query failed', factorsError);
    }

    // Fetch carbon targets
    const { data: targets, error: targetsError } = await supabase
      .from('carbon_reduction_targets')
      .select('*')
      .order('target_year', { ascending: true });

    if (targetsError) {
      console.warn('Carbon targets query failed', targetsError);
    }

    // Fetch avoided emissions
    let avoidedQuery = supabase
      .from('avoided_emissions')
      .select('*');

    if (province) {
      avoidedQuery = avoidedQuery.eq('province_code', province);
    }

    const { data: avoided, error: avoidedError } = await avoidedQuery
      .order('reporting_year', { ascending: false })
      .limit(10);

    if (avoidedError) {
      console.warn('Avoided emissions query failed', avoidedError);
    }

    // Fetch emissions summary
    const { data: summary, error: summaryError } = await supabase
      .from('provincial_emissions_summary')
      .select('*')
      .order('reporting_year', { ascending: false })
      .limit(50);

    if (summaryError) {
      console.warn('Emissions summary query failed', summaryError);
    }

    // Calculate statistics
    const totalEmissions = (emissions ?? []).reduce((sum, e) => sum + (e.total_emissions_tco2e ?? 0), 0);
    const totalAvoided = (avoided ?? []).reduce((sum, a) => sum + (a.total_avoided_tco2e ?? 0), 0);
    const avgIntensity = (emissions ?? []).length > 0
      ? (emissions ?? []).reduce((sum, e) => sum + (e.emissions_intensity_gco2_per_kwh ?? 0), 0) / (emissions ?? []).length
      : null;

    const payload = {
      emissions: emissions ?? [],
      emissions_factors: emissionsFactors ?? [],
      targets: targets ?? [],
      avoided_emissions: avoided ?? [],
      summary: summary ?? [],
      statistics: {
        total_emissions_tco2e: totalEmissions,
        total_avoided_tco2e: totalAvoided,
        net_emissions_tco2e: totalEmissions - totalAvoided,
        avg_grid_intensity_gco2_per_kwh: avgIntensity,
        emissions_count: (emissions ?? []).length,
      },
      metadata: {
        province: province || 'All',
        year: year || 'Latest',
        source: 'Environment and Climate Change Canada, IPCC',
        last_updated: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled carbon emissions API error', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
