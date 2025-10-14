import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:5173,https://canada-energy.netlify.app")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function buildCorsHeaders(originHeader: string | null): Record<string, string> {
  const origin = originHeader && ALLOWED_ORIGINS.includes(originHeader)
    ? originHeader
    : ALLOWED_ORIGINS[0] ?? "http://localhost:5173";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

const SUPABASE_URL = Deno.env.get("EDGE_SUPABASE_URL")
  ?? Deno.env.get("SUPABASE_URL")
  ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY")
  ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? "";

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Resilience hazards function misconfigured", {
      hasUrl: !!SUPABASE_URL,
      hasKey: !!SUPABASE_SERVICE_ROLE_KEY,
    });
    return new Response(
      JSON.stringify({ error: "Supabase credentials missing for resilience hazards function" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: "Supabase client not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { data, error } = await supabase
      .from("resilience_hazard_assessments")
      .select("asset_id, asset_uuid, scenario, time_horizon_years, flooding, wildfire, hurricane, sea_level_rise, extreme_heat, drought, landslide, erosion, overall_risk, generated_at")
      .limit(1000);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ hazards: data ?? [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to load resilience hazards", err);
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    return new Response(
      JSON.stringify({
        error: "Failed to load resilience hazards",
        details: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
