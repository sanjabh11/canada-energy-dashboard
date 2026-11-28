import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { readBoundedBody } from "../_shared/boundedBody.ts";
import { runTierScenario, type TierScenarioDb } from "../_shared/tierScenarioHandler.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const jsonHeaders = { "Content-Type": "application/json" };

// Adapt the supabase-js query builder to the mockable core interface so the
// decision path (row fetch, per-field fill, engine, bounded persistence) is
// unit-testable without Deno or a live database.
const tierDb: TierScenarioDb | null = supabase
  ? {
      listTierMarketRates: async (limit) => {
        const res = await supabase
          .from("tier_market_rates")
          .select("*")
          .order("observed_at", { ascending: false })
          .limit(limit);
        return { data: (res.data ?? null) as Array<Record<string, unknown>> | null, error: res.error };
      },
      insertMlAlertEvaluation: async (row) => {
        const res = await supabase.from("ml_alert_evaluations").insert(row);
        return { error: res.error };
      },
    }
  : null;

function resolveFunctionPath(req: Request): string {
  const pathname = new URL(req.url).pathname.replace(/\/+$/, "") || "/";
  const stripped = pathname
    .replace(/^\/functions\/v1\/tier-simulator\b/, "")
    .replace(/^\/tier-simulator\b/, "");
  return stripped || "/";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const rl = applyRateLimit(req, "tier-simulator");
  if (rl.response) return rl.response;
  const cors = createCorsHeaders(req);
  const path = resolveFunctionPath(req);

  if (req.method !== "POST" || !["/evaluate", "/"].includes(path)) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  // Bounded streaming read: the byte cap is enforced WHILE bytes arrive and
  // the stream is cancelled on overflow — a missing or misleading
  // Content-Length, or a body that is buffered before it is measured, must
  // never let the cap be bypassed.
  const MAX_BODY_BYTES = 65536;
  const bodyRead = await readBoundedBody(req, MAX_BODY_BYTES);
  if (!bodyRead.ok) {
    const tooLarge = bodyRead.reason === "too_large";
    return new Response(
      JSON.stringify({ error: tooLarge ? "Payload too large" : "Body read failed" }),
      { status: tooLarge ? 413 : 400, headers: { ...cors, ...jsonHeaders, ...rl.headers } },
    );
  }
  const rawText = bodyRead.text ?? "";
  let parsed: unknown = {};
  if (rawText.trim() !== "") {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return new Response(JSON.stringify({ error: "Malformed JSON body" }), { status: 400, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return new Response(JSON.stringify({ error: "Body must be a JSON object" }), { status: 400, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  const { result, insertErrorMessage } = await runTierScenario(
    parsed as Record<string, unknown>,
    tierDb,
  );
  if (insertErrorMessage) {
    console.error("ml_alert_evaluations insert failed:", insertErrorMessage);
  }

  return new Response(JSON.stringify(result), { status: 200, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
});
