// Supabase Edge Function: api-v2-innovation-technology-readiness
// Endpoint: GET /api/v2/innovation/technology-readiness?innovation_id=<uuid>
// Returns technology readiness score for an innovation

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
    const innovationId = url.searchParams.get('innovation_id');

    if (!innovationId) {
      return new Response(JSON.stringify({ error: 'innovation_id parameter required' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 400,
      });
    }

    // Call the calculate_innovation_readiness_score function
    const { data, error } = await supabase.rpc('calculate_innovation_readiness_score', {
      innovation_uuid: innovationId,
      assessment_date: new Date().toISOString().split('T')[0]
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      });
    }

    return new Response(JSON.stringify(data), {
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
