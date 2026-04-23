import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { calculateTierScenario } from "../_shared/mlForecasting.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const jsonHeaders = { "Content-Type": "application/json" };

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const rl = applyRateLimit(req, "tier-simulator");
  if (rl.response) return rl.response;
  const cors = createCorsHeaders(req);
  const path = new URL(req.url).pathname.replace(/\/functions\/v1\/tier-simulator\b/, "") || "/";

  if (req.method !== "POST" || !["/evaluate", "/"].includes(path)) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  const body = await req.json().catch(() => ({}));
  const result = calculateTierScenario(body);

  if (supabase) {
    await supabase.from("ml_alert_evaluations").insert({
      alert_type: "tier_simulator",
      province: "AB",
      subject_key: "tier_pathway",
      input_payload: body,
      result_payload: result,
      claim_label: "estimated",
      confidence_score: result.meta.confidence_score,
      warnings: result.warnings,
    });
  }

  return new Response(JSON.stringify(result), { status: 200, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
});
