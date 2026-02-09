// Supabase Edge Function: api-v2-grid-optimization-recommendations
// Endpoint: GET /api/grid/optimization-recommendations
// Returns optimisation recommendations for a region (default Ontario)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
serve(async (req: Request) => {
  const corsHeaders = createCorsHeaders(req);
  const rl = applyRateLimit(req, 'api-v2-grid-optimization-recommendations');
  if (rl.response) return rl.response;


  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const region = url.searchParams.get("region") ?? "Ontario";
    const limit = Number(url.searchParams.get("limit")) || 10;

    const { data, error } = await supabase
      .from("grid_recommendations")
      .select("id, region, recommendation_type, priority, description, expected_impact_percent, implementation_time_minutes, confidence, generated_at")
      .eq("region", region)
      .order("generated_at", { ascending: false })
      .limit(limit);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ region, recommendations: data ?? [] }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
