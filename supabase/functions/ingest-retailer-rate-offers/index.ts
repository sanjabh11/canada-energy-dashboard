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

function fallbackOffers() {
  const observedAt = new Date().toISOString();
  return [
    {
      source_name: "UCA Alberta retailer comparison board",
      source_url: "https://ucahelps.alberta.ca/cost-comparison-tool.aspx",
      observed_at: observedAt,
      retailer_key: "enmax",
      retailer_name: "ENMAX Energy",
      province: "AB",
      fixed_rate_cad_per_kwh: 0.0999,
      term_months: 12,
      cancellation_fee_cad: 0,
      green_option: true,
      promo_text: "No deposit required",
      active: true,
      claim_label: "estimated",
      metadata: { source_mode: "fallback" },
    },
    {
      source_name: "UCA Alberta retailer comparison board",
      source_url: "https://ucahelps.alberta.ca/cost-comparison-tool.aspx",
      observed_at: observedAt,
      retailer_key: "atco",
      retailer_name: "ATCOenergy",
      province: "AB",
      fixed_rate_cad_per_kwh: 0.0929,
      term_months: 36,
      cancellation_fee_cad: 75,
      green_option: true,
      promo_text: "Price match guarantee",
      active: true,
      claim_label: "estimated",
      metadata: { source_mode: "fallback" },
    },
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const rl = applyRateLimit(req, "ingest-retailer-rate-offers");
  if (rl.response) return rl.response;
  const cors = createCorsHeaders(req);
  const path = new URL(req.url).pathname.replace(/\/functions\/v1\/ingest-retailer-rate-offers\b/, "") || "/";

  if (req.method !== "POST" || !["/ingest", "/"].includes(path)) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  const startedAt = Date.now();
  const body = await req.json().catch(() => ({}));
  const observedAt = String(body.observed_at ?? new Date().toISOString());
  const sourceName = String(body.source_name ?? "UCA Alberta retailer comparison board");
  const sourceUrl = String(body.source_url ?? "https://ucahelps.alberta.ca/cost-comparison-tool.aspx");
  const rows = Array.isArray(body.offers) && body.offers.length > 0
    ? body.offers.map((offer: any) => ({
      source_name: String(offer.source_name ?? sourceName),
      source_url: String(offer.source_url ?? sourceUrl),
      observed_at: String(offer.observed_at ?? observedAt),
      retailer_key: String(offer.retailer_key ?? offer.id ?? offer.retailerKey ?? "offer"),
      retailer_name: String(offer.retailer_name ?? offer.name ?? "Retailer"),
      province: String(offer.province ?? "AB"),
      fixed_rate_cad_per_kwh: Number(offer.fixed_rate_cad_per_kwh ?? offer.fixedRateCadPerKwh ?? 0),
      term_months: Number(offer.term_months ?? offer.termMonths ?? 12),
      cancellation_fee_cad: Number(offer.cancellation_fee_cad ?? offer.cancellationFeeCad ?? 0),
      green_option: Boolean(offer.green_option ?? offer.greenOption ?? false),
      promo_text: offer.promo_text ?? offer.promoText ?? null,
      active: offer.active ?? true,
      claim_label: offer.claim_label ?? "estimated",
      metadata: offer.metadata ?? { source_mode: "body" },
    }))
    : fallbackOffers();

  let opsRunId: string | null = null;
  let opsRunStartedAt: string | undefined;
  try {
    if (supabase) {
      const opsRun = await startOpsRun(supabase, {
        jobName: "ingest-retailer-rate-offers",
        runType: "ingestion",
        metadata: {
          row_count: rows.length,
        },
      });
      opsRunId = opsRun.id;
      opsRunStartedAt = opsRun.started_at;
      const { error } = await supabase.from("retailer_rate_offers").upsert(rows, { onConflict: "source_name,observed_at,retailer_key" });
      if (error) throw error;
      await finishOpsRun(supabase, opsRunId, "success", {
        jobName: "ingest-retailer-rate-offers",
        startedAt: opsRunStartedAt,
        metadata: { row_count: rows.length },
      });
      await logJobExecution(supabase, {
        jobName: "ingest-retailer-rate-offers",
        jobType: "cron",
        status: "success",
        durationMs: Math.max(0, Date.now() - startedAt),
        metadata: { row_count: rows.length },
      });
    }

    return jsonResponse(req, 200, {
      ok: true,
      source_name: sourceName,
      row_count: rows.length,
      rows,
    }, rl.headers);
  } catch (error) {
    if (supabase && opsRunId) {
      await finishOpsRun(supabase, opsRunId, "failure", {
        jobName: "ingest-retailer-rate-offers",
        startedAt: opsRunStartedAt,
        errorMessage: error instanceof Error ? error.message : String(error),
        metadata: { row_count: rows.length },
      }).catch(() => null);
      await logJobExecution(supabase, {
        jobName: "ingest-retailer-rate-offers",
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
