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
  const rl = applyRateLimit(req, 'api-v2-heat-pump-programs');
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
  const programLevel = url.searchParams.get('program_level');

  try {
    // Fetch heat pump programs
    let programsQuery = supabase
      .from('heat_pump_programs')
      .select('*');

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
