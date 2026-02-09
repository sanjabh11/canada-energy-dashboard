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
  const rl = applyRateLimit(req, 'api-v2-ev-charging');
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
  const network = url.searchParams.get('network');
  const chargerType = url.searchParams.get('charger_type');

  try {
    // Fetch charging stations
    let stationsQuery = supabase
      .from('ev_charging_stations')
      .select('*')
      .eq('status', 'Operational');

    if (province) {
      stationsQuery = stationsQuery.eq('province_code', province);
    }

    if (network) {
      stationsQuery = stationsQuery.eq('network', network);
    }

    if (chargerType) {
      stationsQuery = stationsQuery.eq('charger_type', chargerType);
    }

    const { data: stations, error: stationsError } = await stationsQuery
      .order('max_power_kw', { ascending: false })
      .limit(100);

    if (stationsError) {
      console.error('EV stations query failed', stationsError);
    }

    // Fetch charging networks
    const { data: networks, error: networksError } = await supabase
      .from('ev_charging_networks')
      .select('*')
      .order('station_count_canada', { ascending: false });

    if (networksError) {
      console.error('Networks query failed', networksError);
    }

    // Summary data to be populated when additional tables are created
    const adoption = [];
    const summary = [];

    // Calculate statistics
    const totalCapacity = (stations ?? []).reduce((sum, s) => sum + (s.total_site_capacity_kw ?? 0), 0);
    const v2gCapableCount = (stations ?? []).filter(s => s.v2g_capable === true).length;

    const payload = {
      stations: stations ?? [],
      networks: networks ?? [],
      adoption: adoption ?? [],
      summary: summary ?? [],
      statistics: {
        total_stations: (stations ?? []).length,
        total_capacity_kw: totalCapacity,
        v2g_capable_stations: v2gCapableCount,
        network_count: (networks ?? []).length,
      },
      metadata: {
        province: province ?? 'All',
        source: 'NRCan, Tesla, Electrify Canada, FLO, ChargePoint',
        last_updated: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled EV charging API error', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
