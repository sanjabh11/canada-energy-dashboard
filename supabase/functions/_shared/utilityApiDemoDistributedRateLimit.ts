type UtilityApiDemoAction =
  | 'start_demo'
  | 'poll_demo'
  | 'activate_demo'
  | 'sync_demo'
  | 'revoke_demo';

type FetchLike = typeof fetch;

type UpstashCommandValue = string | number;
type UpstashCommand = [string, ...UpstashCommandValue[]];

interface UpstashCommandResult {
  result?: unknown;
  error?: string;
}

interface UpstashExecutor {
  execTransaction(commands: UpstashCommand[]): Promise<UpstashCommandResult[]>;
}

interface UtilityApiDemoRateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface UtilityApiDemoRateLimitBucketResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  scope: 'operator' | 'ip';
}

export interface UtilityApiDemoCombinedRateLimitResult {
  allowed: boolean;
  operator: UtilityApiDemoRateLimitBucketResult;
  ip: UtilityApiDemoRateLimitBucketResult;
  effective: UtilityApiDemoRateLimitBucketResult;
}

export interface UtilityApiDemoRateLimiter {
  check(input: {
    action: UtilityApiDemoAction;
    operatorId: string;
    ipAddress: string;
    now?: number;
  }): Promise<UtilityApiDemoCombinedRateLimitResult>;
}

interface UtilityApiDemoRateLimiterOptions {
  fetchImpl?: FetchLike;
  url?: string;
  token?: string;
}

const RATE_LIMITS: Record<UtilityApiDemoAction, UtilityApiDemoRateLimitConfig> = {
  start_demo: { windowMs: 10 * 60 * 1000, maxRequests: 2 },
  poll_demo: { windowMs: 10 * 60 * 1000, maxRequests: 60 },
  activate_demo: { windowMs: 10 * 60 * 1000, maxRequests: 6 },
  sync_demo: { windowMs: 10 * 60 * 1000, maxRequests: 20 },
  revoke_demo: { windowMs: 10 * 60 * 1000, maxRequests: 4 },
};

function getEnv(name: string): string | undefined {
  const denoGlobal = globalThis as typeof globalThis & {
    Deno?: {
      env?: {
        get: (key: string) => string | undefined;
      };
    };
  };
  return denoGlobal.Deno?.env?.get(name);
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function buildBucketKey(scope: 'operator' | 'ip', action: UtilityApiDemoAction, identifier: string) {
  return `utilityapi-demo:rate-limit:${scope}:${action}:${identifier}`;
}

function pickEffectiveBucket(
  operator: UtilityApiDemoRateLimitBucketResult,
  ip: UtilityApiDemoRateLimitBucketResult,
): UtilityApiDemoRateLimitBucketResult {
  if (!operator.allowed) return operator;
  if (!ip.allowed) return ip;
  if (operator.remaining !== ip.remaining) {
    return operator.remaining < ip.remaining ? operator : ip;
  }
  return operator.resetAt <= ip.resetAt ? operator : ip;
}

function readCommandResult(result: UpstashCommandResult | undefined, index: number): unknown {
  if (!result || typeof result !== 'object') {
    throw new Error(`Upstash transaction returned an invalid response at index ${index}.`);
  }

  if (typeof result.error === 'string' && result.error.length > 0) {
    throw new Error(`Upstash transaction command ${index} failed: ${result.error}`);
  }

  return result.result;
}

function createUpstashExecutor(options: {
  url: string;
  token: string;
  fetchImpl?: FetchLike;
}): UpstashExecutor {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = `${normalizeBaseUrl(options.url)}/multi-exec`;

  return {
    async execTransaction(commands) {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commands),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Upstash REST request failed with ${response.status}: ${body || response.statusText}`);
      }

      const payload = await response.json().catch(() => null);
      if (!Array.isArray(payload)) {
        throw new Error('Upstash REST request returned a non-array transaction response.');
      }

      return payload as UpstashCommandResult[];
    },
  };
}

async function checkBucket(
  executor: UpstashExecutor,
  params: {
    scope: 'operator' | 'ip';
    action: UtilityApiDemoAction;
    identifier: string;
    now: number;
  },
): Promise<UtilityApiDemoRateLimitBucketResult> {
  const config = RATE_LIMITS[params.action];
  const key = buildBucketKey(params.scope, params.action, params.identifier);
  const member = `${params.now}:${crypto.randomUUID()}`;
  const windowStart = params.now - config.windowMs;
  const commands: UpstashCommand[] = [
    ['ZREMRANGEBYSCORE', key, 0, windowStart],
    ['ZADD', key, params.now, member],
    ['ZCARD', key],
    ['PEXPIRE', key, config.windowMs + 60_000],
  ];
  const results = await executor.execTransaction(commands);
  readCommandResult(results[0], 0);
  readCommandResult(results[1], 1);
  const count = Number(readCommandResult(results[2], 2) ?? 0);
  readCommandResult(results[3], 3);
  const remaining = Math.max(0, config.maxRequests - count);
  return {
    allowed: count <= config.maxRequests,
    remaining,
    limit: config.maxRequests,
    resetAt: params.now + config.windowMs,
    scope: params.scope,
  };
}

export function createUtilityApiDemoRateLimiter(
  options: UtilityApiDemoRateLimiterOptions = {},
): UtilityApiDemoRateLimiter {
  const url = options.url ?? getEnv('UPSTASH_REDIS_REST_URL') ?? '';
  const token = options.token ?? getEnv('UPSTASH_REDIS_REST_TOKEN') ?? '';
  if (!url || !token) {
    throw new Error('Upstash Redis is not configured for UtilityAPI live demo rate limiting.');
  }

  const executor = createUpstashExecutor({
    url,
    token,
    fetchImpl: options.fetchImpl,
  });

  return {
    async check(input) {
      const now = input.now ?? Date.now();
      const operator = await checkBucket(executor, {
        scope: 'operator',
        action: input.action,
        identifier: input.operatorId,
        now,
      });
      const ip = await checkBucket(executor, {
        scope: 'ip',
        action: input.action,
        identifier: input.ipAddress || 'unknown',
        now,
      });
      const effective = pickEffectiveBucket(operator, ip);
      return {
        allowed: operator.allowed && ip.allowed,
        operator,
        ip,
        effective,
      };
    },
  };
}
