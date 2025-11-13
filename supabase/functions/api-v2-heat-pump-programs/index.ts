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
  const programLevel = url.searchParams.get('program_level'); // Federal, Provincial, Utility, Municipal

  try {
    // Fetch rebate programs
    let programsQuery = supabase
      .from('heat_pump_rebate_programs')
      .select('*')
      .in('status', ['Active - Accepting Applications', 'Active - Waitlist']);

    if (province && province !== 'CA') {
      programsQuery = programsQuery.or(`province_code.eq.${province},province_code.eq.CA`);
    }

    if (programLevel) {
      programsQuery = programsQuery.eq('program_level', programLevel);
    }

    const { data: programs, error: programsError } = await programsQuery
      .order('base_rebate_amount_cad', { ascending: false });

    if (programsError) {
      console.error('Heat pump programs query failed', programsError);
    }

    // Summary data to be populated when additional tables are created
    const deploymentStats = [];
    const adoptionSummary = [];
    const programsSummary = [];

    // Calculate statistics from programs
    const totalFunding = (programs ?? []).reduce((sum, p) => sum + (p.total_program_budget_cad ?? 0), 0);
    const avgRebate = (programs ?? []).length > 0
      ? (programs ?? []).reduce((sum, p) => sum + (p.base_rebate_amount_cad ?? 0), 0) / (programs ?? []).length
      : 0;

    const payload = {
      programs: programs ?? [],
      deployment_stats: deploymentStats ?? [],
      adoption_summary: adoptionSummary ?? [],
      programs_summary: programsSummary ?? [],
      statistics: {
        total_programs: (programs ?? []).length,
        total_funding_available_cad: totalFunding,
        avg_rebate_amount_cad: avgRebate,
        latest_installation_count: null,
        latest_period: null,
      },
      metadata: {
        province: province ?? 'All',
        source: 'NRCan, Provincial Energy Ministries, Utilities',
        last_updated: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled heat pump programs API error', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
