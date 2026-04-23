import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { buildMeta, evaluateGridRisk } from "../_shared/mlForecasting.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const jsonHeaders = { "Content-Type": "application/json" };

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const rl = applyRateLimit(req, "grid-risk");
  if (rl.response) return rl.response;
  const cors = createCorsHeaders(req);
  const path = new URL(req.url).pathname.replace(/\/functions\/v1\/grid-risk\b/, "") || "/";

  if (req.method !== "POST" || !["/evaluate", "/"].includes(path)) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  const body = await req.json().catch(() => ({}));
  const result = evaluateGridRisk(body);
  const response = {
    ...result,
    meta: buildMeta({
      modelVersion: "constraint-grid-risk-v1",
      validAt: new Date().toISOString(),
      confidenceScore: Math.max(0.4, 1 - result.riskScore / 2),
      dataSources: [{ name: "Topology snapshot and dispatch recommendation payload" }],
      isFallback: false,
      methodology: result.methodology,
      warnings: ["Advisory constraint validation only; not a full AC optimal power-flow solver."],
    }),
  };

  if (supabase) {
    await supabase.from("ml_alert_evaluations").insert({
      alert_type: "grid_risk",
      province: String(body.region ?? "AB"),
      subject_key: "dispatch_constraint",
      input_payload: body,
      result_payload: response,
      claim_label: "scenario-based",
      confidence_score: response.meta.confidence_score,
      warnings: response.meta.warnings,
    });
  }

  return new Response(JSON.stringify(response), { status: 200, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
});
