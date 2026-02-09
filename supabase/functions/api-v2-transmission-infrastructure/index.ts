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
  const rl = applyRateLimit(req, 'api-v2-transmission-infrastructure');
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
  const voltage = url.searchParams.get('voltage');

  try {
    // Fetch transmission lines
    let linesQuery = supabase
      .from('transmission_lines')
      .select('*');

    if (province) {
      linesQuery = linesQuery.eq('province_code', province);
    }

    if (voltage) {
      linesQuery = linesQuery.eq('voltage_kv', parseInt(voltage));
    }

    const { data: lines, error: linesError } = await linesQuery
      .eq('status', 'In Service')
      .order('voltage_kv', { ascending: false })
      .limit(100);

    if (linesError) {
      console.error('Transmission lines query failed', linesError);
    }

    // Fetch substations
    let substationsQuery = supabase
      .from('substations')
      .select('*');

    if (province) {
      substationsQuery = substationsQuery.eq('province_code', province);
    }

    const { data: substations, error: substationsError } = await substationsQuery
      .eq('status', 'In Service')
      .order('transformer_capacity_mva', { ascending: false })
      .limit(100);

    if (substationsError) {
      console.error('Substations query failed', substationsError);
    }

    // Fetch recent congestion events
    const { data: congestion, error: congestionError } = await supabase
      .from('transmission_congestion')
      .select(`
        *,
        transmission_lines!inner(
          line_name,
          province_code,
          operator,
          voltage_kv
        )
      `)
      .gte('congestion_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('congestion_timestamp', { ascending: false })
      .limit(500);

    if (congestionError) {
      console.warn('Congestion query failed', congestionError);
    }

    // Fetch grid expansion projects
    let projectsQuery = supabase
      .from('grid_expansion_projects')
      .select('*');

    if (province) {
      projectsQuery = projectsQuery.eq('province_code', province);
    }

    const { data: projects, error: projectsError } = await projectsQuery
      .in('project_status', ['Under Construction', 'Approved', 'Planning'])
      .order('expected_in_service_date', { ascending: true });

    if (projectsError) {
      console.warn('Grid expansion projects query failed', projectsError);
    }

    // Fetch congestion summary
    const { data: congestionSummary, error: summaryError } = await supabase
      .from('transmission_congestion_summary')
      .select('*')
      .order('congestion_events', { ascending: false });

    if (summaryError) {
      console.warn('Congestion summary query failed', summaryError);
    }

    // Calculate statistics
    const totalLineCapacity = (lines ?? []).reduce((sum, l) => sum + (l.thermal_limit_mw ?? 0), 0);
    const totalSubstationCapacity = (substations ?? []).reduce((sum, s) => sum + (s.transformer_capacity_mva ?? 0), 0);
    const congestionEvents = (congestion ?? []).length;
    const totalProjectInvestment = (projects ?? []).reduce((sum, p) => sum + (p.estimated_capex_cad_millions ?? 0), 0);

    const payload = {
      transmission_lines: lines ?? [],
      substations: substations ?? [],
      congestion_events: congestion ?? [],
      expansion_projects: projects ?? [],
      congestion_summary: congestionSummary ?? [],
      statistics: {
        total_line_capacity_mw: totalLineCapacity,
        transmission_lines_count: (lines ?? []).length,
        total_substation_capacity_mva: totalSubstationCapacity,
        substations_count: (substations ?? []).length,
        recent_congestion_events: congestionEvents,
        active_expansion_projects: (projects ?? []).length,
        total_project_investment_millions: totalProjectInvestment,
      },
      metadata: {
        province: province || 'All',
        voltage: voltage || 'All',
        source: 'TSOs (IESO, AESO, etc.), NERC, CER',
        last_updated: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled transmission infrastructure API error', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
