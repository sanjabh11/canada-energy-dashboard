type UtilityApiDemoAction =
  | 'start_demo'
  | 'poll_demo'
  | 'activate_demo'
  | 'sync_demo'
  | 'revoke_demo';

interface UpstashPipeline {
  zremrangebyscore(key: string, min: number, max: number): void;
  zadd(key: string, input: { score: number; member: string }): void;
  zcard(key: string): void;
  pexpire(key: string, milliseconds: number): void;
  exec(): Promise<unknown[]>;
}

interface UpstashRedisLike {
  pipeline(): UpstashPipeline;
}

async function importUpstashRedisModule() {
  const dynamicImport = new Function('moduleUrl', 'return import(moduleUrl);') as (
    moduleUrl: string,
  ) => Promise<{ Redis: new (config: { url: string; token: string }) => UpstashRedisLike }>;
  return dynamicImport('https://deno.land/x/upstash_redis@v1.31.0/mod.ts');
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

const RATE_LIMITS: Record<UtilityApiDemoAction, UtilityApiDemoRateLimitConfig> = {
  start_demo: { windowMs: 10 * 60 * 1000, maxRequests: 2 },
  poll_demo: { windowMs: 10 * 60 * 1000, maxRequests: 60 },
  activate_demo: { windowMs: 10 * 60 * 1000, maxRequests: 6 },
  sync_demo: { windowMs: 10 * 60 * 1000, maxRequests: 20 },
  revoke_demo: { windowMs: 10 * 60 * 1000, maxRequests: 4 },
};

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

async function checkBucket(
  redis: UpstashRedisLike,
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
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, { score: params.now, member });
  pipeline.zcard(key);
  pipeline.pexpire(key, config.windowMs + 60_000);
  const [, , countResult] = await pipeline.exec();
  const count = Number(countResult ?? 0);
  const remaining = Math.max(0, config.maxRequests - count);
  return {
    allowed: count <= config.maxRequests,
    remaining,
    limit: config.maxRequests,
    resetAt: params.now + config.windowMs,
    scope: params.scope,
  };
}

export function createUtilityApiDemoRateLimiter(): UtilityApiDemoRateLimiter {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL') ?? '';
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') ?? '';
  if (!url || !token) {
    throw new Error('Upstash Redis is not configured for UtilityAPI live demo rate limiting.');
  }
  let redisPromise: Promise<UpstashRedisLike> | null = null;

  return {
    async check(input) {
      if (!redisPromise) {
        redisPromise = importUpstashRedisModule().then((module) => {
          const Redis = module.Redis;
          return new Redis({ url, token });
        });
      }
      const redis = await redisPromise;
      const now = input.now ?? Date.now();
      const operator = await checkBucket(redis, {
        scope: 'operator',
        action: input.action,
        identifier: input.operatorId,
        now,
      });
      const ip = await checkBucket(redis, {
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
