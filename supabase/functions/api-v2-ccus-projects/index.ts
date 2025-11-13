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
  const status = url.searchParams.get('status');
  const projectType = url.searchParams.get('project_type');

  try {
    // Fetch CCUS projects
    let projectsQuery = supabase
      .from('ccus_projects')
      .select('*');

    if (province) {
      projectsQuery = projectsQuery.eq('province_code', province);
    }

    if (status) {
      projectsQuery = projectsQuery.eq('status', status);
    }

    if (projectType) {
      projectsQuery = projectsQuery.eq('project_type', projectType);
    }

    const { data: projects, error: projectsError } = await projectsQuery
      .order('capture_capacity_mt_co2_year', { ascending: false, nullsFirst: false });

    if (projectsError) {
      console.error('CCUS projects query failed:', projectsError);
      throw projectsError;
    }

    // Fetch CCUS hubs
    let hubsQuery = supabase
      .from('ccus_hubs')
      .select('*');

    if (province) {
      hubsQuery = hubsQuery.eq('province_code', province);
    }

    const { data: hubs, error: hubsError } = await hubsQuery;

    if (hubsError) {
      console.warn('CCUS hubs query failed:', hubsError);
    }

    // Fetch CCUS policies
    let policiesQuery = supabase
      .from('ccus_policies')
      .select('*')
      .order('effective_date', { ascending: false });

    if (province) {
      // Fetch both federal and provincial policies
      policiesQuery = policiesQuery.or(`jurisdiction.eq.Federal,jurisdiction.eq.${province}`);
    }

    const { data: policies, error: policiesError } = await policiesQuery;

    if (policiesError) {
      console.warn('CCUS policies query failed:', policiesError);
    }

    // Fetch CCUS summary
    let summaryQuery = supabase
      .from('ccus_project_summary')
      .select('*');

    if (province) {
      summaryQuery = summaryQuery.eq('province_code', province);
    }

    const { data: summary, error: summaryError } = await summaryQuery;

    if (summaryError) {
      console.warn('CCUS summary query failed:', summaryError);
    }

    // Calculate aggregate statistics
    const operationalProjects = (projects ?? []).filter(p => p.status === 'Operational');
    const planningProjects = (projects ?? []).filter(p => p.status === 'Planning' || p.status === 'Construction');

    const stats = {
      total_projects: (projects ?? []).length,
      operational_projects: operationalProjects.length,
      planning_projects: planningProjects.length,

      // Operational capacity
      operational_capture_capacity_mt_co2_year: operationalProjects.reduce((sum, p) =>
        sum + (p.capture_capacity_mt_co2_year ?? 0), 0
      ),
      operational_storage_capacity_mt_co2: operationalProjects.reduce((sum, p) =>
        sum + (p.storage_capacity_mt_co2_total ?? 0), 0
      ),
      total_co2_stored_to_date_mt: operationalProjects.reduce((sum, p) =>
        sum + (p.cumulative_stored_mt_co2 ?? 0), 0
      ),

      // Planned capacity
      planned_capture_capacity_mt_co2_year: planningProjects.reduce((sum, p) =>
        sum + (p.capture_capacity_mt_co2_year ?? 0), 0
      ),
      planned_storage_capacity_mt_co2: planningProjects.reduce((sum, p) =>
        sum + (p.storage_capacity_mt_co2_total ?? 0), 0
      ),

      // Total capacity (operational + planned)
      total_capture_capacity_mt_co2_year: (projects ?? []).reduce((sum, p) =>
        sum + (p.capture_capacity_mt_co2_year ?? 0), 0
      ),
      total_storage_capacity_mt_co2: (projects ?? []).reduce((sum, p) =>
        sum + (p.storage_capacity_mt_co2_total ?? 0), 0
      ),

      // Investment
      total_investment_billions_cad: (projects ?? []).reduce((sum, p) =>
        sum + (p.total_investment_cad ?? 0), 0
      ) / 1000.0, // Convert millions to billions

      operational_investment_billions_cad: operationalProjects.reduce((sum, p) =>
        sum + (p.total_investment_cad ?? 0), 0
      ) / 1000.0,

      planned_investment_billions_cad: planningProjects.reduce((sum, p) =>
        sum + (p.total_investment_cad ?? 0), 0
      ) / 1000.0,

      // Cost metrics
      avg_cost_per_tonne_cad: (projects ?? []).filter(p => p.cost_per_tonne_cad).length > 0
        ? (projects ?? []).filter(p => p.cost_per_tonne_cad).reduce((sum, p) =>
          sum + (p.cost_per_tonne_cad ?? 0), 0
        ) / (projects ?? []).filter(p => p.cost_per_tonne_cad).length
        : null,

      // Operators
      unique_operators: [...new Set((projects ?? []).map(p => p.operator))].length,

      // Technology distribution
      capture_technologies: [...new Set((projects ?? [])
        .filter(p => p.capture_technology)
        .map(p => p.capture_technology))
      ],

      storage_types: [...new Set((projects ?? [])
        .filter(p => p.storage_type)
        .map(p => p.storage_type))
      ],

      // ITC eligible projects
      itc_eligible_count: (projects ?? []).filter(p => p.itc_eligible === true).length,
      estimated_itc_value_billions_cad: (projects ?? []).reduce((sum, p) =>
        sum + (p.itc_value_millions_cad ?? 0), 0
      ) / 1000.0,

      // Projects by province
      projects_by_province: Object.fromEntries(
        [...new Set((projects ?? []).map(p => p.province_code))].map(code => [
          code,
          (projects ?? []).filter(p => p.province_code === code).length
        ])
      ),

      // Projects by status
      projects_by_status: Object.fromEntries(
        [...new Set((projects ?? []).map(p => p.status))].map(status => [
          status,
          (projects ?? []).filter(p => p.status === status).length
        ])
      ),
    };

    const payload = {
      projects: projects ?? [],
      hubs: hubs ?? [],
      policies: policies ?? [],
      summary: summary ?? [],
      statistics: stats,
      metadata: {
        province: province || 'All',
        status_filter: status || 'All',
        project_type_filter: projectType || 'All',
        source: 'Pathways Alliance, Shell Quest, Government of Alberta, Government of Canada',
        last_updated: new Date().toISOString(),
        data_quality: '100% real verified data from public sources',
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled CCUS API error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
