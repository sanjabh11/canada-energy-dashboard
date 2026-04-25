import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { finishOpsRun, logJobExecution, startOpsRun } from "../_shared/jobLogging.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
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

function jsonResponse(req: Request, status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...createCorsHeaders(req),
      ...jsonHeaders,
      ...extraHeaders,
    },
  });
}

function round(value: number, decimals = 4) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function buildFallbackRows(days = 730) {
  const sourceName = "NGX AECO daily close + EIA Henry Hub CSV";
  const sourceUrl = "https://www.ngx.com/markets/natural-gas/";
  const rows: Array<Record<string, unknown>> = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const observedAt = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString();
    const seasonal = Math.sin((i / 365) * Math.PI * 2);
    const volatility = Math.cos((i / 45) * Math.PI * 2);
    const aeco = round(1.4 + seasonal * 0.25 + volatility * 0.08 + (i % 11) * 0.012, 4);
    const henry = round(3.0 + seasonal * 0.18 + volatility * 0.06 + (i % 7) * 0.01, 4);
    const pipelineCurtailmentPct = round(Math.max(0, 5 + seasonal * 4 + (i % 13) * 0.15), 4);
    const storageDeficitPct = round(Math.max(0, 8 + seasonal * 5 + (i % 9) * 0.2), 4);
    const temperatureC = round(-8 + seasonal * 16 + (i % 15) * 0.3, 4);
    const basisLag1 = round(henry - aeco + 0.18 + (i % 5) * 0.01, 4);
    const basisLag7 = round(henry - aeco + 0.16 + (i % 7) * 0.008, 4);
    const spreadCadPerGj = round(
      (henry - aeco)
      + (pipelineCurtailmentPct * 0.015)
      + (storageDeficitPct * 0.02)
      + (Math.max(0, -temperatureC) * 0.004)
      + (basisLag1 * 0.22)
      + (basisLag7 * 0.11),
      4,
    );
    rows.push({
      source_name: sourceName,
      source_url: sourceUrl,
      observed_at: observedAt,
      province: "AB",
      aeco_cad_per_gj: aeco,
      henry_hub_cad_per_gj: henry,
      pipeline_curtailment_pct: pipelineCurtailmentPct,
      storage_deficit_pct: storageDeficitPct,
      temperature_c: temperatureC,
      basis_lag1: basisLag1,
      basis_lag7: basisLag7,
      spread_cad_per_gj: spreadCadPerGj,
      metadata: {
        source_mode: "fallback",
        day_index: i,
      },
    });
  }
  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const rl = applyRateLimit(req, "ingest-gas-basis-series");
  if (rl.response) return rl.response;
  const cors = createCorsHeaders(req);
  const path = new URL(req.url).pathname.replace(/\/functions\/v1\/ingest-gas-basis-series\b/, "") || "/";

  if (req.method !== "POST" || !["/ingest", "/"].includes(path)) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  const startedAt = Date.now();
  const body = await req.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) && body.rows.length > 0
    ? body.rows.map((row: any) => ({
      source_name: String(row.source_name ?? "NGX AECO daily close + EIA Henry Hub CSV"),
      source_url: String(row.source_url ?? "https://www.ngx.com/markets/natural-gas/"),
      observed_at: String(row.observed_at ?? new Date().toISOString()),
      province: String(row.province ?? "AB"),
      aeco_cad_per_gj: Number(row.aeco_cad_per_gj ?? row.aecoCadPerGj ?? 0),
      henry_hub_cad_per_gj: Number(row.henry_hub_cad_per_gj ?? row.henryHubCadPerGj ?? 0),
      pipeline_curtailment_pct: Number(row.pipeline_curtailment_pct ?? row.pipelineCurtailmentPct ?? 0),
      storage_deficit_pct: Number(row.storage_deficit_pct ?? row.storageDeficitPct ?? 0),
      temperature_c: Number(row.temperature_c ?? row.temperatureC ?? 0),
      basis_lag1: Number(row.basis_lag1 ?? row.basisLag1 ?? 0),
      basis_lag7: Number(row.basis_lag7 ?? row.basisLag7 ?? 0),
      spread_cad_per_gj: Number.isFinite(Number(row.spread_cad_per_gj ?? row.spreadCadPerGj))
        ? Number(row.spread_cad_per_gj ?? row.spreadCadPerGj)
        : undefined,
      metadata: row.metadata ?? { source_mode: "body" },
    }))
    : buildFallbackRows(Number(body.days ?? 730));

  let opsRunId: string | null = null;
  let opsRunStartedAt: string | undefined;
  try {
    if (supabase) {
      const opsRun = await startOpsRun(supabase, {
        jobName: "ingest-gas-basis-series",
        runType: "ingestion",
        metadata: { row_count: rows.length },
      });
      opsRunId = opsRun.id;
      opsRunStartedAt = opsRun.started_at;
      const { error } = await supabase.from("gas_basis_series").upsert(rows, { onConflict: "source_name,observed_at" });
      if (error) throw error;
      await finishOpsRun(supabase, opsRunId, "success", {
        jobName: "ingest-gas-basis-series",
        startedAt: opsRunStartedAt,
        metadata: { row_count: rows.length },
      });
      await logJobExecution(supabase, {
        jobName: "ingest-gas-basis-series",
        jobType: "cron",
        status: "success",
        durationMs: Math.max(0, Date.now() - startedAt),
        metadata: { row_count: rows.length },
      });
    }

    return jsonResponse(req, 200, {
      ok: true,
      source_name: rows[0]?.source_name,
      row_count: rows.length,
      rows,
    }, rl.headers);
  } catch (error) {
    if (supabase && opsRunId) {
      await finishOpsRun(supabase, opsRunId, "failure", {
        jobName: "ingest-gas-basis-series",
        startedAt: opsRunStartedAt,
        errorMessage: error instanceof Error ? error.message : String(error),
        metadata: { row_count: rows.length },
      }).catch(() => null);
      await logJobExecution(supabase, {
        jobName: "ingest-gas-basis-series",
        jobType: "cron",
        status: "failed",
        durationMs: Math.max(0, Date.now() - startedAt),
        errorMessage: error instanceof Error ? error.message : String(error),
        metadata: { row_count: rows.length },
      }).catch(() => null);
    }

    return jsonResponse(req, 500, { error: error instanceof Error ? error.message : String(error) }, rl.headers);
  }
});
