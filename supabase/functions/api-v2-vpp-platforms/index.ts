import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

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
  const rl = applyRateLimit(req, 'api-v2-vpp-platforms');
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
  const province = url.searchParams.get('province');

  try {
    // Fetch VPP platforms
    let platformsQuery = supabase
      .from('vpp_platforms')
      .select('*');

    if (province) {
      platformsQuery = platformsQuery.eq('province_code', province);
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

