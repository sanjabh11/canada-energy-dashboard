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
  const projectId = url.searchParams.get('project_id');
  const province = url.searchParams.get('province');
  const status = url.searchParams.get('status');

  try {
    // Fetch SMR projects
    let query = supabase
      .from('smr_projects')
      .select(`
        *,
        smr_regulatory_milestones (
          milestone_type,
          milestone_date,
          milestone_status,
          notes
        )
      `);

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
      return new Response(JSON.stringify({ error: 'Failed to fetch SMR projects' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch technology vendors
    const { data: vendors, error: vendorsError } = await supabase
      .from('smr_technology_vendors')
      .select('*')
      .order('vendor_name');

    if (vendorsError) {
      console.warn('Failed to fetch SMR vendors', vendorsError);
    }

    // Fetch summary statistics
    const { data: summary, error: summaryError } = await supabase
      .from('smr_projects_summary')
      .select('*');

    if (summaryError) {
      console.warn('Failed to fetch SMR summary', summaryError);
    }

    const payload = {
      projects: projects ?? [],
      vendors: vendors ?? [],
      summary: summary ?? [],
      metadata: {
        total_projects: (projects ?? []).length,
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
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
