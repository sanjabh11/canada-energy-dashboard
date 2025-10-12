// Supabase Edge Function: api-v2-innovation-market-opportunities
// Endpoint: GET /api/v2/innovation/market-opportunities?technology_focus=<category>
// Returns funding opportunities and partnerships for innovations

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
    const url = new URL(req.url);
    const technologyFocus = url.searchParams.get('technology_focus');

    // Get funding opportunities
    let fundingQuery = supabase
      .from('innovation_funding_opportunities')
      .select('*')
      .eq('status', 'active');

    if (technologyFocus) {
      fundingQuery = fundingQuery.contains('technology_focus', [technologyFocus]);
    }

    const { data: funding, error: fundingError } = await fundingQuery;

    if (fundingError) {
      return new Response(JSON.stringify({ error: fundingError.message }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      });
    }

    // Get partnerships
    let partnershipQuery = supabase
      .from('innovation_partnerships')
      .select('*')
      .eq('partnership_status', 'available');

    if (technologyFocus) {
      partnershipQuery = partnershipQuery.contains('technology_interests', [technologyFocus]);
    }

    const { data: partnerships, error: partnershipError } = await partnershipQuery;

    if (partnershipError) {
      return new Response(JSON.stringify({ error: partnershipError.message }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      });
    }

    return new Response(JSON.stringify({
      funding_opportunities: funding,
      partnerships: partnerships,
      technology_focus: technologyFocus || 'all'
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
