// Supabase Edge Function: api-v2-resilience-adaptation-plan
// Endpoint: POST /api/v2/resilience/adaptation-plan
// Body: { asset_id: uuid, climate_scenario: 'RCP4.5' }
// Returns adaptation plan recommendations

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
    const { asset_id, climate_scenario = 'RCP4.5' } = await req.json();

    if (!asset_id) {
      return new Response(JSON.stringify({ error: 'asset_id required' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 400,
      });
    }

    // Get asset details
    const { data: asset, error: assetError } = await supabase
      .from('resilience_assets')
      .select('*')
      .eq('id', asset_id)
      .single();

    if (assetError) {
      return new Response(JSON.stringify({ error: assetError.message }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      });
    }

    // Get climate projections
    const { data: climate, error: climateError } = await supabase
      .from('climate_projections')
      .select('*')
      .eq('scenario_name', climate_scenario)
      .eq('region', asset.province)
      .order('last_updated', { ascending: false })
      .limit(1)
      .single();

    if (climateError) {
      return new Response(JSON.stringify({ error: climateError.message }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      });
    }

    // Get resilience assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('resilience_assessments')
      .select('*')
      .eq('asset_id', asset_id)
      .eq('climate_scenario', climate_scenario)
      .order('assessment_date', { ascending: false })
      .limit(1)
      .single();

    if (assessmentError) {
      return new Response(JSON.stringify({ error: assessmentError.message }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      });
    }

    // Generate adaptation recommendations based on assessment
    const recommendations = [];
    if (assessment.overall_resilience_score < 50) {
      recommendations.push({
        action: 'Infrastructure hardening',
        priority: 'high',
        estimated_cost: asset.replacement_cost * 0.1,
        timeframe: '2-3 years'
      });
    }
    if (assessment.flood_vulnerability_score > 70) {
      recommendations.push({
        action: 'Flood protection measures',
        priority: 'critical',
        estimated_cost: asset.replacement_cost * 0.15,
        timeframe: '1-2 years'
      });
    }
    if (assessment.adaptive_capacity_score < 60) {
      recommendations.push({
        action: 'Monitoring and maintenance upgrade',
        priority: 'medium',
        estimated_cost: asset.replacement_cost * 0.05,
        timeframe: '6-12 months'
      });
    }

    return new Response(JSON.stringify({
      asset: asset.asset_name,
      climate_scenario: climate_scenario,
      overall_resilience_score: assessment.overall_resilience_score,
      recommendations: recommendations
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
