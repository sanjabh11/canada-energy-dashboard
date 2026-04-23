import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { buildMeta, detectDrift } from "../_shared/mlForecasting.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const jsonHeaders = { "Content-Type": "application/json" };

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const rl = applyRateLimit(req, "model-monitor");
  if (rl.response) return rl.response;
  const cors = createCorsHeaders(req);
  const path = new URL(req.url).pathname.replace(/\/functions\/v1\/model-monitor\b/, "") || "/";

  if (req.method !== "POST" || !["/drift", "/"].includes(path)) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  const body = await req.json().catch(() => ({}));
  const result = detectDrift(body);
  const modelKey = String(body.model_key ?? body.modelKey ?? "wasserstein-drift-v1");
  const domain = String(body.domain ?? "forecast");
  const province = body.province ? String(body.province) : null;

  if (supabase) {
    const rows = Object.entries(result.metrics).map(([featureName, metric]: [string, any]) => ({
      model_key: modelKey,
      domain,
      province,
      feature_name: featureName,
      distance: metric.distance,
      threshold: metric.threshold,
      drift_detected: metric.drift,
      confidence_multiplier: result.confidenceMultiplier,
      recommendation: result.recommendation,
    }));
    if (rows.length > 0) await supabase.from("ml_drift_metrics").insert(rows);
  }

  const response = {
    ...result,
    meta: buildMeta({
      modelVersion: "wasserstein-drift-v1",
      validAt: new Date().toISOString(),
      confidenceScore: result.confidenceMultiplier,
      dataSources: [{ name: "Baseline and recent feature payload" }],
      isFallback: false,
      methodology: "Quantile Wasserstein-style distance for baseline-vs-recent feature drift.",
      warnings: result.status === "drift_detected" ? ["Model confidence downgraded because feature drift exceeded threshold."] : [],
    }),
  };

  return new Response(JSON.stringify(response), { status: 200, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
});
