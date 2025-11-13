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
  const platformId = url.searchParams.get('platform_id');
  const province = url.searchParams.get('province');

  try {
    // Fetch VPP platforms
    let platformsQuery = supabase
      .from('vpp_platforms')
      .select('*')
      .eq('status', 'Active');

    if (platformId) {
      platformsQuery = platformsQuery.eq('id', platformId);
    }

    if (province) {
      platformsQuery = platformsQuery.contains('province_code', [province]);
    }

    const { data: platforms, error: platformsError } = await platformsQuery
      .order('aggregated_capacity_mw', { ascending: false });

    if (platformsError) {
      console.error('VPP platforms query failed', platformsError);
    }

    // Summary data to be populated when additional tables are created
    const derAssets = [];
    const dispatchEvents = [];
    const drPrograms = [];
    const summary = [];
    const fleetComposition = [];

    // Calculate statistics
    const totalCapacity = (platforms ?? []).reduce((sum, p) => sum + (p.aggregated_capacity_mw ?? 0), 0);
    const totalAssets = (platforms ?? []).reduce((sum, p) => sum + (p.enrolled_assets_count ?? 0), 0);

    const payload = {
      platforms: platforms ?? [],
      der_assets_summary: {
        total_count: (derAssets ?? []).length,
        by_type: (derAssets ?? []).reduce((acc, asset) => {
          acc[asset.der_type] = (acc[asset.der_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      dispatch_events: dispatchEvents ?? [],
      demand_response_programs: drPrograms ?? [],
      summary: summary ?? [],
      fleet_composition: fleetComposition ?? [],
      statistics: {
        total_platforms: (platforms ?? []).length,
        total_aggregated_capacity_mw: totalCapacity,
        total_enrolled_assets: totalAssets,
        recent_dispatch_events: (dispatchEvents ?? []).length,
      },
      metadata: {
        province: province ?? 'All',
        source: 'IESO Peak Perks, EPCOR, Solartility, EnergyHub',
        last_updated: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled VPP platforms API error', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
