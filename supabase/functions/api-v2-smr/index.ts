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
  const rl = applyRateLimit(req, 'api-v2-smr');
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
  const projectId = url.searchParams.get('project_id');
  const province = url.searchParams.get('province');
  const status = url.searchParams.get('status');

  try {
    // Fetch SMR projects - simplified to only query the main table
    let query = supabase
      .from('smr_projects')
      .select('*');

    if (projectId) {
      query = query.eq('id', projectId);
    }

    if (province) {
      query = query.eq('province_code', province);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: projects, error: projectsError } = await query.order('target_commercial_operation', { ascending: true });

    if (projectsError) {
      console.error('SMR projects query failed', projectsError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch SMR projects',
        details: projectsError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate summary statistics from the projects data
    const totalProjects = (projects ?? []).length;
    const totalCapacity = (projects ?? []).reduce((sum, p) => sum + (p.capacity_mwe || 0), 0);
    const totalInvestment = (projects ?? []).reduce((sum, p) => sum + (p.estimated_capex_cad || 0), 0);

    const payload = {
      projects: projects ?? [],
      vendors: [], // Will be populated when smr_technology_vendors table is available
      summary: [{
        total_projects: totalProjects,
        total_capacity_mw: totalCapacity,
        total_investment_cad: totalInvestment,
        projects_by_status: (projects ?? []).reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      }],
      metadata: {
        total_projects: totalProjects,
        source: 'CNSC, OPG, SaskPower, NB Power',
        last_updated: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled SMR API error', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
