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
  const year = url.searchParams.get('year');

  try {
    // Fetch interconnection points
    let interconnectionsQuery = supabase
      .from('interconnection_points')
      .select('*');

    if (province) {
      interconnectionsQuery = interconnectionsQuery.eq('canadian_province', province);
    }

    const { data: interconnections, error: interconnectionsError } = await interconnectionsQuery
      .eq('status', 'Active')
      .order('capacity_mw', { ascending: false });

    if (interconnectionsError) {
      console.error('Interconnections query failed', interconnectionsError);
    }

    // Fetch provincial trade summary
    let tradeQuery = supabase
      .from('provincial_trade_summary')
      .select('*');

    if (province) {
      tradeQuery = tradeQuery.eq('province_code', province);
    }

    if (year) {
      tradeQuery = tradeQuery.eq('reporting_year', parseInt(year));
    }

    const { data: trade, error: tradeError } = await tradeQuery
      .is('reporting_month', null) // Annual data only
      .order('reporting_year', { ascending: false })
      .limit(10);

    if (tradeError) {
      console.error('Trade summary query failed', tradeError);
    }

    // Fetch trade agreements
    const { data: agreements, error: agreementsError } = await supabase
      .from('electricity_trade_agreements')
      .select('*')
      .eq('status', 'Active')
      .order('start_date', { ascending: false });

    if (agreementsError) {
      console.warn('Trade agreements query failed', agreementsError);
    }

    // Fetch cross-border trade summary
    let summaryQuery = supabase
      .from('cross_border_trade_summary')
      .select('*');

    if (province) {
      summaryQuery = summaryQuery.eq('province_code', province);
    }

    const { data: summary, error: summaryError } = await summaryQuery
      .order('reporting_year', { ascending: false })
      .limit(50);

    if (summaryError) {
      console.warn('Trade summary query failed', summaryError);
    }

    // Calculate statistics
    const totalInterconnectionCapacity = (interconnections ?? []).reduce((sum, i) => sum + (i.capacity_mw ?? 0), 0);
    const latestTrade = (trade ?? []).length > 0 ? trade[0] : null;
    const totalExports = (trade ?? []).reduce((sum, t) => sum + (t.total_exports_gwh ?? 0), 0);
    const totalImports = (trade ?? []).reduce((sum, t) => sum + (t.total_imports_gwh ?? 0), 0);

    const payload = {
      interconnections: interconnections ?? [],
      trade_summary: trade ?? [],
      agreements: agreements ?? [],
      annual_summary: summary ?? [],
      statistics: {
        total_interconnection_capacity_mw: totalInterconnectionCapacity,
        interconnection_count: (interconnections ?? []).length,
        latest_trade: latestTrade,
        total_exports_gwh: totalExports,
        total_imports_gwh: totalImports,
        net_exports_gwh: totalExports - totalImports,
        active_agreements: (agreements ?? []).length,
      },
      metadata: {
        province: province || 'All',
        year: year || 'Latest',
        source: 'Statistics Canada, NEB/CER, EIA',
        last_updated: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled cross-border trade API error', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
