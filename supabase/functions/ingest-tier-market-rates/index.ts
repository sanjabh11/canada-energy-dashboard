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

function buildFallbackRow() {
  const observedAt = new Date().toISOString();
  const dayFactor = new Date().getUTCDate() % 5;
  return {
    source_name: "NGX carbon credit daily settles",
    source_url: "https://www.ngx.com/",
    observed_at: observedAt,
    market_credit_price_cad_per_tonne: round(24.5 + dayFactor * 0.4, 2),
    fund_price_cad_per_tonne: 95,
    claim_label: "estimated",
    quality_status: "fresh",
    metadata: {
      source_mode: "fallback",
      note: "Seed row generated because no external feed rows were supplied.",
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const rl = applyRateLimit(req, "ingest-tier-market-rates");
  if (rl.response) return rl.response;
  const cors = createCorsHeaders(req);
  const path = new URL(req.url).pathname.replace(/\/functions\/v1\/ingest-tier-market-rates\b/, "") || "/";

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
      source_name: String(row.source_name ?? "NGX carbon credit daily settles"),
      source_url: String(row.source_url ?? "https://www.ngx.com/"),
      observed_at: String(row.observed_at ?? new Date().toISOString()),
      market_credit_price_cad_per_tonne: Number(row.market_credit_price_cad_per_tonne ?? row.marketCreditPriceCadPerTonne ?? 0),
      fund_price_cad_per_tonne: Number(row.fund_price_cad_per_tonne ?? row.fundPriceCadPerTonne ?? 95),
      claim_label: row.claim_label ?? "estimated",
      quality_status: String(row.quality_status ?? "fresh"),
      metadata: row.metadata ?? { source_mode: "body" },
    }))
    : [buildFallbackRow()];

  let opsRunId: string | null = null;
  let opsRunStartedAt: string | undefined;
  try {
    if (supabase) {
      const opsRun = await startOpsRun(supabase, {
        jobName: "ingest-tier-market-rates",
        runType: "ingestion",
        metadata: {
          row_count: rows.length,
        },
      });
      opsRunId = opsRun.id;
      opsRunStartedAt = opsRun.started_at;
      const { error } = await supabase.from("tier_market_rates").upsert(rows, { onConflict: "source_name,observed_at" });
      if (error) throw error;
      await finishOpsRun(supabase, opsRunId, "success", {
        jobName: "ingest-tier-market-rates",
        startedAt: opsRunStartedAt,
        metadata: { row_count: rows.length },
      });
      await logJobExecution(supabase, {
        jobName: "ingest-tier-market-rates",
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
        jobName: "ingest-tier-market-rates",
        startedAt: opsRunStartedAt,
        errorMessage: error instanceof Error ? error.message : String(error),
        metadata: { row_count: rows.length },
      }).catch(() => null);
      await logJobExecution(supabase, {
        jobName: "ingest-tier-market-rates",
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
