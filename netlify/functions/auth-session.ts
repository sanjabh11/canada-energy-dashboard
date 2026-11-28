/**
 * Server-verified legacy Whop session endpoints.
 *
 * The browser-provided profile is never identity or entitlement evidence.
 * Every restore verifies the HttpOnly token with Whop and reads the local
 * entitlement cache server-side. If entitlement storage is unavailable, the
 * verified identity is limited to the free tier.
 */

import {
  createOwnerDataClient,
  getCurrentWhopEntitlement,
  parseCookieHeader,
  verifyWhopSessionToken,
} from './_shared/utilityConnectorOwner';

const COOKIE_NAME = 'whop_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const MAX_TOKEN_LENGTH = 8_192;
const MAX_BODY_LENGTH = 16_384;
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'https://canada-energy.netlify.app',
  'https://ceip.netlify.app',
]);
const TIERS = new Set(['free', 'basic', 'pro', 'team']);

type Identity = { providerId: string; email?: string; name?: string };
type Entitlement = { tier: 'free' | 'basic' | 'pro' | 'team'; expiryDate: string | null };
interface AuthEvent {
  httpMethod: string;
  path?: string;
  headers: Record<string, string | undefined>;
  body?: string | null;
}

function header(event: AuthEvent, name: string): string | undefined {
  return event.headers[name.toLowerCase()] ?? event.headers[name];
}

function responseHeaders(origin?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
  }
  return headers;
}

function json(statusCode: number, body: unknown, origin?: string, extraHeaders: Record<string, string> = {}) {
  return {
    statusCode,
    headers: { ...responseHeaders(origin), ...extraHeaders },
    body: JSON.stringify(body),
  };
}

function buildCookie(token: string, maxAge: number): string {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${maxAge}`,
  ].join('; ');
}

function clearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function verifiedIdentity(identity: Identity) {
  return {
    id: identity.providerId,
    email: identity.email ?? '',
    ...(identity.name ? { name: identity.name } : {}),
  };
}

function parsePath(path: string): string {
  return path
    .replace(/^\/.netlify\/functions\/auth-session/, '')
    .replace(/^\/api\/auth/, '') || '/';
}

function isProviderUnavailable(result: { httpStatus?: number; retryable?: boolean }): boolean {
  return result.retryable === true
    || result.httpStatus === undefined
    || result.httpStatus >= 500
    || result.httpStatus === 408
    || result.httpStatus === 429;
}

function verifierMode(): string {
  // Simulated tokens are accepted only by an explicitly opted-in local
  // non-production process. A VITE_* build variable can never enable this.
  if (
    process.env.WHOP_AUTH_MODE === 'simulated'
    && process.env.NODE_ENV !== 'production'
    && process.env.AUTH_SESSION_ALLOW_SIMULATED === 'true'
  ) return 'simulated';
  return 'live';
}

async function currentEntitlement(providerId: string): Promise<Entitlement> {
  try {
    const client = createOwnerDataClient();
    return await getCurrentWhopEntitlement(client, providerId);
  } catch {
    // The paused/unavailable database must never turn into paid access.
    return { tier: 'free', expiryDate: null };
  }
}

async function verifyToken(token: string) {
  return verifyWhopSessionToken(token, { mode: verifierMode() });
}

const handler = async (event: AuthEvent) => {
  const origin = header(event, 'origin');
  const path = parsePath(event.path ?? '/');
  const headers = responseHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return json(403, { error: 'Origin not allowed' }, origin);
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod === 'POST' && (path === '/login' || path === '/')) {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return json(403, { error: 'Origin not allowed' }, origin);
    if (!(header(event, 'content-type') ?? '').toLowerCase().includes('application/json')) {
      return json(415, { error: 'JSON required' }, origin);
    }
    if ((event.body ?? '').length > MAX_BODY_LENGTH) {
      return json(413, { error: 'Request is too large' }, origin);
    }

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(event.body ?? '{}');
      body = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return json(400, { error: 'Invalid request body' }, origin);
    }

    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token || token.length > MAX_TOKEN_LENGTH) {
      return json(400, { error: 'Invalid session token' }, origin);
    }

    const verification = await verifyToken(token);
    if (!verification.valid || !verification.identity?.providerId) {
      if (isProviderUnavailable(verification)) {
        return json(503, { error: 'Identity verification is temporarily unavailable' }, origin);
      }
      return json(401, { error: 'Invalid or expired session' }, origin);
    }

    return json(200, { success: true, user: verifiedIdentity(verification.identity) }, origin, {
      'Set-Cookie': buildCookie(token, COOKIE_MAX_AGE),
    });
  }

  if (event.httpMethod === 'POST' && path === '/logout') {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return json(403, { error: 'Origin not allowed' }, origin);
    return json(200, { success: true }, origin, { 'Set-Cookie': clearCookie() });
  }

  if (event.httpMethod === 'GET' && (path === '/session' || path === '/')) {
    const token = parseCookieHeader(header(event, 'cookie'), COOKIE_NAME);
    if (!token) return json(200, { authenticated: false }, origin);

    const verification = await verifyToken(token);
    if (!verification.valid || !verification.identity?.providerId) {
      if (isProviderUnavailable(verification)) {
        return json(503, { authenticated: false, error: 'Identity verification is temporarily unavailable' }, origin);
      }
      return json(401, { authenticated: false }, origin, { 'Set-Cookie': clearCookie() });
    }

    const entitlement = await currentEntitlement(verification.identity.providerId);
    const tier = TIERS.has(entitlement.tier) ? entitlement.tier : 'free';
    return json(200, {
      authenticated: true,
      user: verifiedIdentity(verification.identity),
      hasAccess: tier !== 'free',
      tier,
      subscriptionStatus: tier === 'free' ? 'none' : 'active',
      subscriptionEndDate: entitlement.expiryDate ?? undefined,
    }, origin);
  }

  if (!['GET', 'POST', 'OPTIONS'].includes(event.httpMethod)) {
    return json(405, { error: 'Method not allowed' }, origin, { Allow: 'GET, POST, OPTIONS' });
  }
  return json(404, { error: 'Not found' }, origin);
};

export { handler };
