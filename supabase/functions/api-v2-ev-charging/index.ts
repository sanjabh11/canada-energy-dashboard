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

    // Fetch EV adoption tracking
    const { data: adoption, error: adoptionError } = await supabase
      .from('ev_adoption_tracking')
      .select('*')
      .order('tracking_period_end', { ascending: false })
      .limit(10);

    if (adoptionError) {
      console.error('Adoption tracking query failed', adoptionError);
    }

    // Fetch infrastructure summary
    const { data: summary, error: summaryError } = await supabase
      .from('ev_charging_infrastructure_summary')
      .select('*');

    if (summaryError) {
      console.warn('Infrastructure summary query failed', summaryError);
    }

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
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
