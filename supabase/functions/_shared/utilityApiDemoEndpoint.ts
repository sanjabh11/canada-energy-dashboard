import { createCorsHeaders } from './cors.ts';
import {
  countUtilityApiDemoStartsForMonth,
  findReusableUtilityApiDemoAuthorization,
  insertUtilityApiDemoAuthorization,
  updateUtilityApiDemoAuthorization,
} from './utilityApiDemoAuthorizationStore.ts';
import {
  createUtilityApiDemoRateLimiter,
  type UtilityApiDemoCombinedRateLimitResult,
  type UtilityApiDemoRateLimiter,
} from './utilityApiDemoDistributedRateLimit.ts';
import {
  runActivateUtilityApiDemo,
  runPollUtilityApiDemo,
  runRevokeUtilityApiDemo,
  runStartUtilityApiDemo,
  runSyncUtilityApiDemo,
} from './utilityApiDemoRuntime.ts';

type FetchLike = typeof fetch;

type UtilityApiDemoAction =
  | 'start_demo'
  | 'poll_demo'
  | 'activate_demo'
  | 'sync_demo'
  | 'revoke_demo';

interface UtilityApiDemoOperatorIdentity {
  userId: string;
  email: string;
}

interface UtilityApiDemoRuntimeDeps {
  apiToken: string;
  formUid: string;
  fetchImpl?: FetchLike;
}

interface UtilityApiDemoLogInput {
  endpoint: string;
  method: string;
  statusCode: number;
  ipAddress?: string | null;
  responseTimeMs?: number | null;
  extra?: Record<string, unknown> | null;
}

interface UtilityApiDemoAuthResult {
  operator: UtilityApiDemoOperatorIdentity | null;
  status: number;
  body: Record<string, unknown> | null;
}

const DEFAULT_MONTHLY_START_BUDGET = 10;
const ALLOWED_SCENARIOS = new Set([
  'commercial',
  'residential',
  'nointervals',
  'partialintervals',
  'pending_manual_after',
  'wait_to_login_after',
  'revoked',
  'badlogin',
  'badlogin_after',
  'empty',
]);

export interface UtilityApiDemoEndpointDeps {
  apiToken: string;
  formUid: string;
  fetchImpl?: FetchLike;
  now?: () => number;
  liveEnabled?: boolean;
  operatorEmailAllowlist?: string;
  monthlyStartBudget?: number;
  supabase?: any;
  rateLimiter?: UtilityApiDemoRateLimiter;
  authenticateOperator?: (req: Request, supabase: any) => Promise<UtilityApiDemoAuthResult>;
  logUsage?: (input: UtilityApiDemoLogInput) => Promise<void>;
}

function getAction(input: unknown): UtilityApiDemoAction | null {
  switch (input) {
    case 'start_demo':
    case 'poll_demo':
    case 'activate_demo':
    case 'sync_demo':
    case 'revoke_demo':
      return input;
    default:
      return null;
  }
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
}

function parseScenario(input: unknown): string {
  const value = typeof input === 'string' ? input.trim().toLowerCase() : '';
  return value || 'commercial';
}

function parseAllowlist(raw: string | undefined): Set<string> {
  return new Set(
    String(raw ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function rateLimitHeaders(result: UtilityApiDemoCombinedRateLimitResult | null): Record<string, string> {
  if (!result) return {};
  return {
    'X-RateLimit-Limit': result.effective.limit.toString(),
    'X-RateLimit-Remaining': result.effective.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.effective.resetAt / 1000).toString(),
  };
}

function safeErrorDetail(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]');
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

function startOfUtcMonth(now: number) {
  const date = new Date(now);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function buildAuthFailure(status: number, error: string, code: string): UtilityApiDemoAuthResult {
  return {
    operator: null,
    status,
    body: { error, code },
  };
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

async function defaultAuthenticateOperator(req: Request, supabase: any): Promise<UtilityApiDemoAuthResult> {
  const token = extractBearerToken(req);
  if (!token) {
    return buildAuthFailure(401, 'UtilityAPI live demo actions require a Supabase operator session.', 'missing_operator_token');
  }

  const { data, error } = await supabase.auth.getUser(token);
  const user = data?.user ?? null;
  const email = user?.email?.trim().toLowerCase() ?? null;
  if (error || !user || !email) {
    return buildAuthFailure(401, 'Invalid or expired Supabase operator session.', 'invalid_operator_token');
  }

  return {
    operator: {
      userId: user.id,
      email,
    },
    status: 200,
    body: null,
  };
}

async function logUsage(
  deps: UtilityApiDemoEndpointDeps,
  input: UtilityApiDemoLogInput,
) {
  if (deps.logUsage) {
    await deps.logUsage(input);
    return;
  }

  if (!('Deno' in globalThis)) return;

  try {
    const module = await import('./rateLimit.ts');
    await module.logApiUsage(input);
  } catch {
    // Logging must not break the public demo route.
  }
}

async function applyAuthAndLiveGuards(
  req: Request,
  deps: UtilityApiDemoEndpointDeps,
  corsHeaders: Record<string, string>,
): Promise<{ response: Response | null; operator: UtilityApiDemoOperatorIdentity | null; supabase: any | null }> {
  if (!deps.liveEnabled) {
    return {
      response: json({
        error: 'UtilityAPI live mode is disabled.',
        code: 'live_disabled',
      }, 403, corsHeaders),
      operator: null,
      supabase: null,
    };
  }

  const allowlist = parseAllowlist(deps.operatorEmailAllowlist);
  if (allowlist.size === 0) {
    return {
      response: json({
        error: 'Operator allowlist is not configured for UtilityAPI live mode.',
        code: 'operator_allowlist_missing',
      }, 503, corsHeaders),
      operator: null,
      supabase: null,
    };
  }

  let supabase: any;
  try {
    if (deps.supabase) {
      supabase = deps.supabase;
    } else {
      const module = await import('./utilityConnector.ts');
      supabase = module.getUtilityConnectorClient();
    }
  } catch {
    return {
      response: json({
        error: 'Supabase service role configuration missing for UtilityAPI live mode.',
        code: 'supabase_not_configured',
      }, 503, corsHeaders),
      operator: null,
      supabase: null,
    };
  }

  const authResult = await (deps.authenticateOperator ?? defaultAuthenticateOperator)(req, supabase);
  if (!authResult.operator) {
    return {
      response: json(authResult.body ?? { error: 'Unauthorized', code: 'unauthorized' }, authResult.status, corsHeaders),
      operator: null,
      supabase,
    };
  }

  if (!allowlist.has(authResult.operator.email)) {
    return {
      response: json({
        error: 'Authenticated Supabase session is not authorized for UtilityAPI live mode.',
        code: 'operator_not_allowlisted',
      }, 403, corsHeaders),
      operator: null,
      supabase,
    };
  }

  return {
    response: null,
    operator: authResult.operator,
    supabase,
  };
}

async function applyDistributedRateLimit(
  action: UtilityApiDemoAction,
  req: Request,
  deps: UtilityApiDemoEndpointDeps,
  operator: UtilityApiDemoOperatorIdentity,
  corsHeaders: Record<string, string>,
): Promise<{ response: Response | null; result: UtilityApiDemoCombinedRateLimitResult | null; ipAddress: string }> {
  const ipAddress = getClientIp(req);
  let limiter: UtilityApiDemoRateLimiter;
  try {
    limiter = deps.rateLimiter ?? createUtilityApiDemoRateLimiter();
  } catch (error) {
    return {
      response: json({
        error: 'Distributed rate limiting is unavailable for UtilityAPI live mode.',
        code: 'rate_limiter_unavailable',
        detail: safeErrorDetail(error),
      }, 503, corsHeaders),
      result: null,
      ipAddress,
    };
  }

  let result: UtilityApiDemoCombinedRateLimitResult;
  try {
    result = await limiter.check({
      action,
      operatorId: operator.userId,
      ipAddress,
      now: (deps.now ?? Date.now)(),
    });
  } catch (error) {
    return {
      response: json({
        error: 'Distributed rate limiting failed for UtilityAPI live mode.',
        code: 'rate_limiter_failed',
        detail: safeErrorDetail(error),
      }, 503, corsHeaders),
      result: null,
      ipAddress,
    };
  }

  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil((result.effective.resetAt - (deps.now ?? Date.now)()) / 1000));
    return {
      response: json({
        error: 'Rate limit exceeded for UtilityAPI live demo actions.',
        code: 'rate_limit_exceeded',
        retry_after_seconds: retryAfter,
        rate_limit_limit: result.effective.limit,
        rate_limit_remaining: result.effective.remaining,
        rate_limit_reset: Math.ceil(result.effective.resetAt / 1000),
      }, 429, {
        ...corsHeaders,
        ...rateLimitHeaders(result),
        'Retry-After': retryAfter.toString(),
      }),
      result,
      ipAddress,
    };
  }

  return { response: null, result, ipAddress };
}

async function persistUtilityApiDemoState(
  supabase: any,
  lookup: {
    id?: string | null;
    authorization_uid?: string | null;
    referral?: string | null;
  },
  patch: Record<string, unknown>,
) {
  await updateUtilityApiDemoAuthorization(supabase, lookup, patch);
}

async function handleStartDemo(
  body: Record<string, unknown>,
  deps: UtilityApiDemoEndpointDeps,
  supabase: any,
  operator: UtilityApiDemoOperatorIdentity,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const scenario = parseScenario(body.scenario);
  if (!ALLOWED_SCENARIOS.has(scenario)) {
    return {
      status: 400,
      body: {
        error: `Unsupported UtilityAPI demo scenario: ${String(body.scenario)}.`,
        code: 'unsupported_scenario',
      },
    };
  }

  const reusable = await findReusableUtilityApiDemoAuthorization(supabase, {
    operatorUserId: operator.userId,
    scenario,
    utility: 'DEMO',
  });

  if (reusable && (reusable.authorization_uid || reusable.referral)) {
    try {
      const reusedPoll = await runPollUtilityApiDemo({
        authorization_uid: reusable.authorization_uid,
        referral: reusable.authorization_uid ? undefined : reusable.referral,
      }, {
        apiToken: deps.apiToken,
        formUid: deps.formUid,
        fetchImpl: deps.fetchImpl,
      });

      const terminal = reusedPoll.body.stage === 'revoked' || reusedPoll.body.stage === 'errored';
      await persistUtilityApiDemoState(supabase, { id: reusable.id }, {
        operator_email: operator.email,
        authorization_uid: reusedPoll.body.authorization_uid ?? reusable.authorization_uid,
        referral: reusedPoll.body.referral ?? reusable.referral,
        meter_uids: Array.isArray(reusedPoll.body.meter_uids) ? reusedPoll.body.meter_uids : reusable.meter_uids,
        last_stage: typeof reusedPoll.body.stage === 'string' ? reusedPoll.body.stage : reusable.last_stage,
        last_status: typeof reusedPoll.body.authorization_status === 'string'
          ? reusedPoll.body.authorization_status
          : (typeof reusedPoll.body.user_status === 'string' ? reusedPoll.body.user_status : reusable.last_status),
        last_polled_at: new Date((deps.now ?? Date.now)()).toISOString(),
        last_error: typeof reusedPoll.body.error === 'string' ? reusedPoll.body.error : null,
        revoked_at: terminal && reusedPoll.body.stage === 'revoked' ? new Date((deps.now ?? Date.now)()).toISOString() : reusable.revoked_at,
      });

      if (!terminal) {
        return {
          status: reusedPoll.status,
          body: {
            ...reusedPoll.body,
            reused: true,
            scenario,
          },
        };
      }
    } catch (error) {
      await persistUtilityApiDemoState(supabase, { id: reusable.id }, {
        last_error: error instanceof Error ? error.message : 'Reusable authorization refresh failed.',
      });
    }
  }

  const budget = Number.isFinite(deps.monthlyStartBudget) ? Math.max(1, Number(deps.monthlyStartBudget)) : DEFAULT_MONTHLY_START_BUDGET;
  const monthWindow = startOfUtcMonth((deps.now ?? Date.now)());
  const monthlyCount = await countUtilityApiDemoStartsForMonth(supabase, {
    startedAtGte: monthWindow.start,
    startedAtLt: monthWindow.end,
    utility: 'DEMO',
  });

  if (monthlyCount >= budget) {
    return {
      status: 409,
      body: {
        error: 'UtilityAPI live monthly start budget exhausted.',
        code: 'monthly_start_budget_exhausted',
        monthly_start_budget: budget,
        monthly_start_count: monthlyCount,
      },
    };
  }

  const created = await runStartUtilityApiDemo({ scenario }, {
    apiToken: deps.apiToken,
    formUid: deps.formUid,
    fetchImpl: deps.fetchImpl,
  });

  if (created.status >= 200 && created.status < 300) {
    await insertUtilityApiDemoAuthorization(supabase, {
      operator_user_id: operator.userId,
      operator_email: operator.email,
      scenario,
      utility: 'DEMO',
      referral: typeof created.body.referral === 'string' ? created.body.referral : null,
      authorization_uid: typeof created.body.authorization_uid === 'string' ? created.body.authorization_uid : null,
      meter_uids: Array.isArray(created.body.meter_uids) ? created.body.meter_uids as string[] : [],
      last_stage: typeof created.body.stage === 'string' ? created.body.stage : 'authorization_pending',
      last_status: typeof created.body.authorization_status === 'string'
        ? created.body.authorization_status
        : (typeof created.body.user_status === 'string' ? created.body.user_status : null),
      last_error: null,
    });
  }

  return {
    status: created.status,
    body: {
      ...created.body,
      reused: false,
      scenario,
      monthly_start_budget: budget,
      monthly_start_count: created.status >= 200 && created.status < 300 ? monthlyCount + 1 : monthlyCount,
    },
  };
}

export async function handleUtilityApiDemoRequest(req: Request, deps: UtilityApiDemoEndpointDeps): Promise<Response> {
  const corsHeaders = createCorsHeaders(req);

  if (req.method !== 'POST') {
    return json({ error: 'Unsupported UtilityAPI demo action.' }, 405, corsHeaders);
  }

  const startedAt = (deps.now ?? Date.now)();
  const body = await req.json().catch(() => ({}));
  const action = getAction(body?.action);

  if (!action) {
    return json({ error: 'Unsupported UtilityAPI demo action.' }, 405, corsHeaders);
  }

  const authResult = await applyAuthAndLiveGuards(req, deps, corsHeaders);
  if (authResult.response) {
    return authResult.response;
  }

  const operator = authResult.operator!;
  const supabase = authResult.supabase!;
  const rateLimit = await applyDistributedRateLimit(action, req, deps, operator, corsHeaders);
  const ipAddress = rateLimit.ipAddress;
  if (rateLimit.response) {
    await logUsage(deps, {
      endpoint: 'utilityapi-demo',
      method: req.method,
      statusCode: 429,
      ipAddress,
      responseTimeMs: (deps.now ?? Date.now)() - startedAt,
      extra: {
        action,
        operator_user_id: operator.userId,
        operator_email: operator.email,
        stage: 'rate_limited',
        outcome: 'denied',
      },
    });
    return rateLimit.response;
  }

  let result: { status: number; body: Record<string, unknown> };
  try {
    switch (action) {
      case 'start_demo':
        result = await handleStartDemo(body as Record<string, unknown>, deps, supabase, operator);
        break;
      case 'poll_demo':
        result = await runPollUtilityApiDemo({
          referral: body?.referral,
          authorization_uid: body?.authorization_uid,
        }, {
          apiToken: deps.apiToken,
          formUid: deps.formUid,
          fetchImpl: deps.fetchImpl,
        });
        await persistUtilityApiDemoState(supabase, {
          authorization_uid: typeof body?.authorization_uid === 'string' ? body.authorization_uid : null,
          referral: typeof body?.referral === 'string' ? body.referral : null,
        }, {
          operator_email: operator.email,
          authorization_uid: typeof result.body.authorization_uid === 'string' ? result.body.authorization_uid : body?.authorization_uid ?? null,
          referral: typeof result.body.referral === 'string' ? result.body.referral : body?.referral ?? null,
          meter_uids: Array.isArray(result.body.meter_uids) ? result.body.meter_uids : [],
          last_stage: typeof result.body.stage === 'string' ? result.body.stage : null,
          last_status: typeof result.body.authorization_status === 'string'
            ? result.body.authorization_status
            : (typeof result.body.user_status === 'string' ? result.body.user_status : null),
          last_polled_at: new Date((deps.now ?? Date.now)()).toISOString(),
          last_error: typeof result.body.error === 'string' ? result.body.error : null,
          revoked_at: result.body.stage === 'revoked' ? new Date((deps.now ?? Date.now)()).toISOString() : null,
        });
        break;
      case 'activate_demo':
        result = await runActivateUtilityApiDemo({
          authorization_uid: body?.authorization_uid,
          meter_uids: body?.meter_uids,
        }, {
          apiToken: deps.apiToken,
          formUid: deps.formUid,
          fetchImpl: deps.fetchImpl,
        });
        await persistUtilityApiDemoState(supabase, {
          authorization_uid: typeof body?.authorization_uid === 'string' ? body.authorization_uid : null,
        }, {
          meter_uids: Array.isArray(result.body.meter_uids) ? result.body.meter_uids : [],
          last_stage: typeof result.body.stage === 'string' ? result.body.stage : null,
          last_status: typeof result.body.authorization_status === 'string'
            ? result.body.authorization_status
            : (typeof result.body.user_status === 'string' ? result.body.user_status : 'collection_pending'),
          last_error: typeof result.body.error === 'string' ? result.body.error : null,
        });
        break;
      case 'sync_demo':
        result = await runSyncUtilityApiDemo({
          authorization_uid: body?.authorization_uid,
        }, {
          apiToken: deps.apiToken,
          formUid: deps.formUid,
          fetchImpl: deps.fetchImpl,
        });
        await persistUtilityApiDemoState(supabase, {
          authorization_uid: typeof body?.authorization_uid === 'string' ? body.authorization_uid : null,
        }, {
          meter_uids: Array.isArray(result.body.meter_uids) ? result.body.meter_uids : [],
          last_stage: typeof result.body.stage === 'string' ? result.body.stage : null,
          last_status: typeof result.body.authorization_status === 'string'
            ? result.body.authorization_status
            : (typeof result.body.user_status === 'string' ? result.body.user_status : null),
          last_synced_at: result.status >= 200 && result.status < 300 ? new Date((deps.now ?? Date.now)()).toISOString() : null,
          last_error: typeof result.body.error === 'string' ? result.body.error : null,
        });
        break;
      case 'revoke_demo':
        result = await runRevokeUtilityApiDemo({
          authorization_uid: body?.authorization_uid,
        }, {
          apiToken: deps.apiToken,
          formUid: deps.formUid,
          fetchImpl: deps.fetchImpl,
        });
        await persistUtilityApiDemoState(supabase, {
          authorization_uid: typeof body?.authorization_uid === 'string' ? body.authorization_uid : null,
        }, {
          last_stage: typeof result.body.stage === 'string' ? result.body.stage : 'revoked',
          last_status: 'revoked',
          last_error: typeof result.body.error === 'string' ? result.body.error : null,
          revoked_at: result.status >= 200 && result.status < 300 ? new Date((deps.now ?? Date.now)()).toISOString() : null,
        });
        break;
    }
  } catch (error) {
    await logUsage(deps, {
      endpoint: 'utilityapi-demo',
      method: req.method,
      statusCode: 500,
      ipAddress,
      responseTimeMs: (deps.now ?? Date.now)() - startedAt,
      extra: {
        action,
        operator_user_id: operator.userId,
        operator_email: operator.email,
        stage: 'exception',
        outcome: 'error',
      },
    });
    return json({
      error: error instanceof Error ? error.message : 'UtilityAPI demo action failed.',
      code: 'utilityapi_demo_exception',
    }, 500, {
      ...corsHeaders,
      ...rateLimitHeaders(rateLimit.result),
    });
  }

  const responseBody = {
    ...result.body,
    rate_limit_limit: rateLimit.result?.effective.limit,
    rate_limit_remaining: rateLimit.result?.effective.remaining,
    rate_limit_reset: rateLimit.result ? Math.ceil(rateLimit.result.effective.resetAt / 1000) : undefined,
  };

  await logUsage(deps, {
    endpoint: 'utilityapi-demo',
    method: req.method,
    statusCode: result.status,
    ipAddress,
    responseTimeMs: (deps.now ?? Date.now)() - startedAt,
    extra: {
      action,
      operator_user_id: operator.userId,
      operator_email: operator.email,
      stage: typeof result.body.stage === 'string' ? result.body.stage : null,
      outcome: result.status >= 200 && result.status < 300 ? 'success' : 'error',
      reused: result.body.reused === true,
    },
  });

  return json(responseBody, result.status, {
    ...corsHeaders,
    ...rateLimitHeaders(rateLimit.result),
  });
}
