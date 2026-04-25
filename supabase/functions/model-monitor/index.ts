import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { buildMeta, detectDrift } from "../_shared/mlForecasting.ts";
import { finishOpsRun, logJobExecution, startOpsRun } from "../_shared/jobLogging.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") ?? "";
const GITHUB_REPOSITORY = Deno.env.get("GITHUB_REPOSITORY") ?? "";
const RETRAIN_WORKFLOW_FILE = Deno.env.get("RETRAIN_WORKFLOW_FILE") ?? "cron-model-retrain.yml";
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const jsonHeaders = { "Content-Type": "application/json" };

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  return authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    || authHeader === `Bearer ${CRON_SECRET}`
    || req.headers.get("x-supabase-cron") === "true";
}

async function dispatchRetrainWorkflow(payload: Record<string, unknown>) {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    return { dispatched: false, skipped: true };
  }

  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/${RETRAIN_WORKFLOW_FILE}/dispatches`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      ref: "main",
      inputs: payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub workflow dispatch failed with HTTP ${response.status}`);
  }

  return { dispatched: true, skipped: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const rl = applyRateLimit(req, "model-monitor");
  if (rl.response) return rl.response;
  const cors = createCorsHeaders(req);
  const path = new URL(req.url).pathname.replace(/\/functions\/v1\/model-monitor\b/, "") || "/";

  if (req.method !== "POST" || !["/drift", "/"].includes(path)) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  const startedAt = Date.now();
  const body = await req.json().catch(() => ({}));
  const result = detectDrift(body);
  const modelKey = String(body.model_key ?? body.modelKey ?? "wasserstein-drift-v1");
  const domain = String(body.domain ?? "forecast");
  const province = body.province ? String(body.province) : null;
  const driftDetected = result.status === "drift_detected";
  let opsRunId: string | null = null;
  let opsRunStartedAt: string | undefined;
  let retrainDispatch: { dispatched: boolean; skipped: boolean } | null = null;

  if (supabase) {
    const opsRun = await startOpsRun(supabase, {
      jobName: "model-monitor",
      runType: "maintenance",
      metadata: {
        model_key: modelKey,
        domain,
        province,
        drift_detected: driftDetected,
      },
    }).catch(() => null);
    opsRunId = opsRun?.id ?? null;
    opsRunStartedAt = opsRun?.started_at;
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

    if (driftDetected) {
      await logJobExecution(supabase, {
        jobName: `${modelKey}:retrain-dispatch`,
        jobType: "retrain",
        status: "pending",
        metadata: {
          model_key: modelKey,
          domain,
          province,
          recommendation: result.recommendation,
          retrain_mode: "github_actions",
          workflow_file: RETRAIN_WORKFLOW_FILE,
        },
      });

      retrainDispatch = await dispatchRetrainWorkflow({
        model_key: modelKey,
        domain,
        province: province ?? "",
        status: result.status,
        recommendation: result.recommendation,
      }).catch((error) => ({
        dispatched: false,
        skipped: false,
        error: error instanceof Error ? error.message : String(error),
      })) as any;
    }

    if (opsRunId) {
      await finishOpsRun(supabase, opsRunId, "success", {
        jobName: "model-monitor",
        startedAt: opsRunStartedAt,
        metadata: {
          model_key: modelKey,
          domain,
          province,
          drift_detected: driftDetected,
          retrain_requested: driftDetected,
          retrain_dispatch: retrainDispatch,
        },
        errorMessage: null,
      }).catch(() => null);
    }
  }

  const response = {
    ...result,
    retrain_requested: driftDetected,
    retrain_dispatch: retrainDispatch,
    meta: buildMeta({
      modelVersion: "wasserstein-drift-v1",
      validAt: new Date().toISOString(),
      confidenceScore: result.confidenceMultiplier,
      dataSources: [{ name: "Baseline and recent feature payload" }],
      isFallback: false,
      methodology: "Quantile Wasserstein-style distance for baseline-vs-recent feature drift.",
      trainingDataProfile: "mixed",
      calibrationStatus: driftDetected ? "drifting" : "calibrated",
      claimLabel: "advisory",
      warnings: result.status === "drift_detected" ? ["Model confidence downgraded because feature drift exceeded threshold."] : [],
    }),
  };

  return new Response(JSON.stringify(response), { status: 200, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
});
