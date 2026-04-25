import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { evaluateRateWatchdog } from "../_shared/mlForecasting.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const jsonHeaders = { "Content-Type": "application/json" };

async function resolveRateWatchdogInput(body: any) {
  const resolved = { ...body };
  if (!supabase) return resolved;

  const hasOffers = Array.isArray(resolved.retailerOffers ?? resolved.retailer_offers) && (resolved.retailerOffers ?? resolved.retailer_offers).length > 0;
  if (hasOffers) return resolved;

  const { data } = await supabase
    .from("retailer_rate_offers")
    .select("*")
    .eq("active", true)
    .order("observed_at", { ascending: false })
    .limit(50);

  if (!Array.isArray(data) || data.length === 0) return resolved;

  resolved.retailerOffers = data.map((offer) => ({
    id: offer.retailer_key,
    name: offer.retailer_name,
    fixedRateCadPerKwh: Number(offer.fixed_rate_cad_per_kwh ?? 0),
    termMonths: Number(offer.term_months ?? 0),
    cancellationFeeCad: Number(offer.cancellation_fee_cad ?? 0),
    sourceName: offer.source_name,
    sourceUrl: offer.source_url,
    observedAt: offer.observed_at,
    active: offer.active ?? true,
    claimLabel: offer.claim_label ?? "estimated",
  }));

  return resolved;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const rl = applyRateLimit(req, "rate-watchdog");
  if (rl.response) return rl.response;
  const cors = createCorsHeaders(req);
  const path = new URL(req.url).pathname.replace(/\/functions\/v1\/rate-watchdog\b/, "") || "/";

  if (req.method !== "POST" || !["/evaluate", "/"].includes(path)) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  const body = await req.json().catch(() => ({}));
  const resolvedBody = await resolveRateWatchdogInput(body);
  const result = evaluateRateWatchdog(resolvedBody);

  if (supabase) {
    await supabase.from("ml_alert_evaluations").insert({
      alert_type: "rate_watchdog",
      province: result.province,
      subject_key: result.provider,
      input_payload: resolvedBody,
      result_payload: result,
      claim_label: result.claimLabel,
      confidence_score: result.meta.confidence_score,
      warnings: result.warnings,
    });
  }

  return new Response(JSON.stringify(result), { status: 200, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
});
