declare const Deno: { env: { get(name: string): string | undefined } };
import { isCronAuthorized } from "../_shared/cronAuth.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { saveDashboardSummarySnapshot } from "../_shared/dashboardSnapshots.ts";
import { callLLM } from "../llm/call_llm_adapter.ts";
import { finishOpsRun, logFallbackEvent, logJobExecution, startOpsRun } from "../_shared/jobLogging.ts";
import { handleGroundsourceRequest } from "./groundsourceHandler.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GROUNDSOURCE_DAILY_TOKEN_BUDGET = Number(Deno.env.get("GROUNDSOURCE_DAILY_TOKEN_BUDGET") ?? 180000);
const GROUNDSOURCE_MAX_DURATION_MS = Number(Deno.env.get("GROUNDSOURCE_MAX_DURATION_MS") ?? 120000);
const GROUNDSOURCE_MAX_EVENTS_PER_DAY = 200;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// Thin adapter: every request decision lives in groundsourceHandler.ts so
// the handler boundary (auth, SSRF policy, error redaction) is unit-testable
// without Deno, the network, or a live Supabase client.
serve(async (req) => {
  return handleGroundsourceRequest(
    req,
    {
      isAuthorized: (req) => isCronAuthorized(req),
      createCorsHeaders,
      handleCorsOptions,
      applyRateLimit,
    },
    {
      supabase,
      fetchImpl: fetch,
      callLlm: (request) => callLLM(request),
      saveSnapshot: (args) => saveDashboardSummarySnapshot(args),
      ops: {
        startOpsRun: (sb, context) => startOpsRun(sb as never, context as never),
        finishOpsRun: (sb, runId, status, context) => finishOpsRun(sb as never, runId, status, context as never),
        logFallbackEvent: (sb, context) => logFallbackEvent(sb as never, context as never),
        logJobExecution: (sb, context) => logJobExecution(sb as never, context as never),
      },
      budgets: {
        dailyTokenBudget: GROUNDSOURCE_DAILY_TOKEN_BUDGET,
        maxDurationMs: GROUNDSOURCE_MAX_DURATION_MS,
        maxEventsPerDay: GROUNDSOURCE_MAX_EVENTS_PER_DAY,
      },
    },
  );
});
