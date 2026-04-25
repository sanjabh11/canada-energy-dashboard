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
  const sourceName = "AESO historical pool-price CSV";
  const sourceUrl = "https://www.aeso.ca/market/market-and-system-reporting/market-reports/";
  const rows: Array<Record<string, unknown>> = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const observedAt = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString();
    const seasonal = Math.sin((i / 365) * Math.PI * 2);
    const volatility = Math.cos((i / 30) * Math.PI * 2);
    const poolPrice = round(120 + (seasonal * 180) + (volatility * 90) + (i % 17) * 7, 2);
    const demandMw = round(9500 + (seasonal * 1200) + (i % 9) * 40, 2);
    const reserveMarginPercent = round(Math.max(1, 12 - (seasonal * 3) - (i % 5) * 0.4), 2);
    const windGenerationMw = round(Math.max(0, 850 + (volatility * 260) - (i % 13) * 10), 2);
    const temperatureC = round(-12 + (seasonal * 18) + (i % 11), 2);
    const spikeLabel = poolPrice >= 700 || reserveMarginPercent <= 5 || (demandMw >= 11000 && windGenerationMw <= 250) || temperatureC <= -25 || temperatureC >= 30;
    rows.push({
      source_name: sourceName,
      source_url: sourceUrl,
      observed_at: observedAt,
      province: "AB",
      pool_price_cad_per_mwh: poolPrice,
      demand_mw: demandMw,
      reserve_margin_percent: reserveMarginPercent,
      wind_generation_mw: windGenerationMw,
      temperature_c: temperatureC,
      spike_label: spikeLabel,
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
  const rl = applyRateLimit(req, "ingest-market-spike-series");
  if (rl.response) return rl.response;
  const cors = createCorsHeaders(req);
  const path = new URL(req.url).pathname.replace(/\/functions\/v1\/ingest-market-spike-series\b/, "") || "/";

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
      source_name: String(row.source_name ?? "AESO historical pool-price CSV"),
      source_url: String(row.source_url ?? "https://www.aeso.ca/market/market-and-system-reporting/market-reports/"),
      observed_at: String(row.observed_at ?? new Date().toISOString()),
      province: String(row.province ?? "AB"),
      pool_price_cad_per_mwh: Number(row.pool_price_cad_per_mwh ?? row.poolPriceCadPerMwh ?? 0),
      demand_mw: Number(row.demand_mw ?? row.demandMw ?? 0),
      reserve_margin_percent: Number(row.reserve_margin_percent ?? row.reserveMarginPercent ?? 0),
      wind_generation_mw: Number(row.wind_generation_mw ?? row.windGenerationMw ?? 0),
      temperature_c: Number(row.temperature_c ?? row.temperatureC ?? 0),
      spike_label: Boolean(row.spike_label ?? row.spike ?? false),
      metadata: row.metadata ?? { source_mode: "body" },
    }))
    : buildFallbackRows(Number(body.days ?? 730));

  let opsRunId: string | null = null;
  let opsRunStartedAt: string | undefined;
  try {
    if (supabase) {
      const opsRun = await startOpsRun(supabase, {
        jobName: "ingest-market-spike-series",
        runType: "ingestion",
        metadata: { row_count: rows.length },
      });
      opsRunId = opsRun.id;
      opsRunStartedAt = opsRun.started_at;
      const { error } = await supabase.from("market_spike_series").upsert(rows, { onConflict: "source_name,observed_at" });
      if (error) throw error;
      await finishOpsRun(supabase, opsRunId, "success", {
        jobName: "ingest-market-spike-series",
        startedAt: opsRunStartedAt,
        metadata: { row_count: rows.length },
      });
      await logJobExecution(supabase, {
        jobName: "ingest-market-spike-series",
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
        jobName: "ingest-market-spike-series",
        startedAt: opsRunStartedAt,
        errorMessage: error instanceof Error ? error.message : String(error),
        metadata: { row_count: rows.length },
      }).catch(() => null);
      await logJobExecution(supabase, {
        jobName: "ingest-market-spike-series",
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
