/**
 * Shared Rate Limiting and API Usage Logging Utility
 * 
 * Provides in-memory rate limiting with configurable limits per endpoint.
 * Also logs API usage to Supabase for monitoring.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Lazily created Supabase client for logging only
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// In-memory rate limit store (per-instance, resets on cold start)
// Key: clientId (IP or API key), Value: { count, windowStart }
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

// Default rate limit configuration
const DEFAULT_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 60,     // 60 requests per minute
};

// Endpoint-specific rate limits (more restrictive for expensive operations)
const ENDPOINT_LIMITS: Record<string, { windowMs: number; maxRequests: number }> = {
  'llm': { windowMs: 60 * 1000, maxRequests: 20 },
  'llm-lite': { windowMs: 60 * 1000, maxRequests: 30 },
  'help': { windowMs: 60 * 1000, maxRequests: 30 },
  'digital-twin': { windowMs: 60 * 1000, maxRequests: 10 },
  'opportunity-detector': { windowMs: 60 * 1000, maxRequests: 20 },
  'household-advisor': { windowMs: 60 * 1000, maxRequests: 20 },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

/**
 * Check if a request should be rate limited
 * @param clientId - Unique identifier for the client (IP address or API key)
 * @param endpoint - The endpoint being accessed (for endpoint-specific limits)
 */
export function checkRateLimit(clientId: string, endpoint?: string): RateLimitResult {
  const config = endpoint && ENDPOINT_LIMITS[endpoint] 
    ? ENDPOINT_LIMITS[endpoint] 
    : DEFAULT_RATE_LIMIT;
  
  const now = Date.now();
  const key = `${clientId}:${endpoint || 'default'}`;
  const entry = rateLimitStore.get(key);
  
  // Clean up old entries periodically (every 100th check)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries(config.windowMs);
  }
  
  if (!entry || now - entry.windowStart >= config.windowMs) {
    // New window
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      limit: config.maxRequests,
      resetAt: now + config.windowMs,
    };
  }
  
  // Within existing window
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      limit: config.maxRequests,
      resetAt: entry.windowStart + config.windowMs,
    };
  }
  
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    limit: config.maxRequests,
    resetAt: entry.windowStart + config.windowMs,
  };
}

/**
 * Clean up expired rate limit entries to prevent memory leaks
 */
function cleanupExpiredEntries(windowMs: number): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart >= windowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get client identifier from request (IP address or API key)
 */
export function getClientId(req: Request): string {
  // Try API key first (more reliable for authenticated requests)
  const apiKey = req.headers.get('apikey') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (apiKey && apiKey.length > 10) {
    return `key:${apiKey.substring(0, 20)}`;
  }
  
  // Fall back to IP address
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
  return `ip:${ip}`;
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  };
}

/**
 * Create a 429 Too Many Requests response
 */
export function rateLimitExceededResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
        ...rateLimitHeaders(result),
      },
    }
  );
}

// ============ API Usage Logging ============

export interface ApiUsageLogInput {
  endpoint: string;
  method: string;
  statusCode: number;
  apiKey?: string | null;
  ipAddress?: string | null;
  responseTimeMs?: number | null;
  extra?: Record<string, unknown> | null;
}

export async function logApiUsage(input: ApiUsageLogInput): Promise<void> {
  if (!supabase) {
    // If we cannot create a client (e.g. missing env vars), fail silently.
    return;
  }

  const payload = {
    endpoint: input.endpoint,
    method: input.method,
    status_code: input.statusCode,
    api_key: input.apiKey ?? null,
    ip_address: input.ipAddress ?? null,
    response_time_ms: input.responseTimeMs ?? null,
    extra: input.extra ?? null,
  };

  const { error } = await supabase.from("api_usage").insert(payload);

  if (error) {
    console.error("Failed to insert api_usage log:", error);
  }
}
