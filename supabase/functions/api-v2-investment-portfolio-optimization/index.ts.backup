// Supabase Edge Function: api-v2-investment-portfolio-optimization
// Endpoint: POST /api/v2/investment/portfolio-optimization
// Body: { project_ids: [uuid], discount_rate: 0.08 }
// Returns portfolio optimization analysis

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { project_ids, discount_rate = 0.08 } = await req.json();

    if (!project_ids || !Array.isArray(project_ids)) {
      return new Response(JSON.stringify({ error: 'project_ids array required' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 400,
      });
    }

    // Get NPV for each project
    const results = [];
    for (const projectId of project_ids) {
      const { data, error } = await supabase.rpc('calculate_project_npv', {
        project_uuid: projectId,
        discount_rate: discount_rate
      });

      if (error) {
        results.push({ project_id: projectId, error: error.message });
      } else {
        results.push({ project_id: projectId, ...data[0] });
      }
    }

    // Calculate portfolio metrics
    const validResults = results.filter(r => !r.error);
    const totalNPV = validResults.reduce((sum, r) => sum + (r.npv || 0), 0);
    const totalInvestment = validResults.reduce((sum, r) => sum + (r.total_capex || 0), 0);

    return new Response(JSON.stringify({
      portfolio_analysis: {
        total_npv: totalNPV,
        total_investment: totalInvestment,
        net_return: totalNPV - totalInvestment,
        project_count: validResults.length,
        discount_rate: discount_rate
      },
      project_results: results
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500,
    });
  }
});
