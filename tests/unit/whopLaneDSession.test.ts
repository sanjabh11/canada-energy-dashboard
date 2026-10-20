/**
 * @vitest-environment jsdom
 *
 * Lane D — G12 whop session security tests.
 *
 * Asserts that a `whop_user` blob in localStorage is never trusted as an
 * entitlement source on its own: a restored profile must stay unverified
 * (free tier) until a server-side entitlement check confirms it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('../../src/lib/pricingCatalog', () => ({
  CEIP_PRICING: {
    direct: { free: 0, consumer_watchdog: 9, professional: 149, industrial_tier: 1500, municipal: 5900, sovereign: 2500 },
    whop: { whop_basic: 29, whop_pro: 99, whop_team: 299 },
    currency: 'USD',
  },
}));

const FORGED_PRO_USER = {
  id: 'whop_attacker_1',
  email: 'attacker@example.com',
  tier: 'pro',
  subscriptionStatus: 'active',
  features: ['ai_copilot', 'full_data_access'],
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLoginAt: '2026-01-01T00:00:00.000Z',
  isWhopUser: true,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** fetch stub: only the server session response controls identity and tier. */
function stubFetch(session: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/auth/session')) {
      return jsonResponse(session);
    }
    if (url.includes('/api/auth/login') || url.includes('/api/auth/logout')) {
      return jsonResponse({ success: true });
    }
    return jsonResponse({ error: 'not found' }, 404);
  }));
}

async function freshClient() {
  vi.resetModules();
  const mod = await import('../../src/lib/whop');
  return mod;
}

describe('whop Lane D — restored session trust (G12)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/dashboard');
    vi.stubEnv('VITE_WHOP_MODE', 'simulated');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('does not grant paid entitlements from a forged localStorage profile + cookie', async () => {
    // The browser cache claims pro; verified server storage has no paid row.
    localStorage.setItem('whop_user', JSON.stringify(FORGED_PRO_USER));
    stubFetch({
      authenticated: true,
      user: { id: FORGED_PRO_USER.id, email: FORGED_PRO_USER.email },
      hasAccess: false,
      tier: 'free',
    });

    const { whopClient } = await freshClient();
    await whopClient.initialize();

    expect(whopClient.isSessionVerified()).toBe(true);
    expect(whopClient.getCurrentTier()).toBe('free');
    expect(whopClient.hasFeature('ai_copilot')).toBe(false);
    expect(whopClient.hasTierAccess('basic')).toBe(false);
  });

  it('adopts the server-returned tier only after entitlement confirmation', async () => {
    // Stored blob claims 'team'; server confirms only 'basic' — server wins.
    const forged = { ...FORGED_PRO_USER, tier: 'team' };
    localStorage.setItem('whop_user', JSON.stringify(forged));
    stubFetch({
      authenticated: true,
      user: { id: FORGED_PRO_USER.id, email: FORGED_PRO_USER.email },
      hasAccess: true,
      tier: 'basic',
    });

    const { whopClient } = await freshClient();
    await whopClient.initialize();

    expect(whopClient.isSessionVerified()).toBe(true);
    expect(whopClient.getCurrentTier()).toBe('basic');
    expect(whopClient.hasTierAccess('pro')).toBe(false);
  });

  it('restores entitlements for verified existing customers', async () => {
    localStorage.setItem('whop_user', JSON.stringify(FORGED_PRO_USER));
    stubFetch({
      authenticated: true,
      user: { id: FORGED_PRO_USER.id, email: FORGED_PRO_USER.email },
      hasAccess: true,
      tier: 'pro',
    });

    const { whopClient } = await freshClient();
    await whopClient.initialize();

    expect(whopClient.isSessionVerified()).toBe(true);
    expect(whopClient.getCurrentTier()).toBe('pro');
    expect(whopClient.hasFeature('ai_copilot')).toBe(true);
  });

  it('clears the stored profile when no server session exists', async () => {
    localStorage.setItem('whop_user', JSON.stringify(FORGED_PRO_USER));
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ authenticated: false })));

    const { whopClient } = await freshClient();
    await whopClient.initialize();

    expect(localStorage.getItem('whop_user')).toBeNull();
    expect(whopClient.getCurrentUser()).toBeNull();
    expect(whopClient.getCurrentTier()).toBe('free');
  });

  it('fails closed when the session endpoint is unreachable', async () => {
    localStorage.setItem('whop_user', JSON.stringify(FORGED_PRO_USER));
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));

    const { whopClient } = await freshClient();
    await whopClient.initialize();

    expect(whopClient.isSessionVerified()).toBe(false);
    expect(whopClient.getCurrentTier()).toBe('free');
    expect(whopClient.hasTierAccess('basic')).toBe(false);
  });

  it('uses only the server-returned identity and entitlement after token login', async () => {
    stubFetch({
      authenticated: true,
      user: { id: 'server-confirmed-user', email: 'server@example.com' },
      hasAccess: false,
      tier: 'team',
    });

    const { whopClient } = await freshClient();
    const user = await whopClient.loginFromToken('opaque-test-token');

    expect(user.id).toBe('server-confirmed-user');
    expect(user.tier).toBe('free');
    expect(whopClient.isSessionVerified()).toBe(true);
    const loginRequest = vi.mocked(fetch).mock.calls
      .find(([input]) => String(input).includes('/api/auth/login'));
    expect(loginRequest).toBeDefined();
    expect(JSON.parse(String(loginRequest?.[1]?.body))).toEqual({ token: 'opaque-test-token' });
  });
});

describe('whop Lane D — dead OAuth path removal (G12)', () => {
  it('whop.ts no longer exports the unmatched OAuth redirect/callback flow', () => {
    const source = readFileSync(
      path.resolve(__dirname, '../../src/lib/whop.ts'),
      'utf8',
    );
    expect(source).not.toContain('export function getWhopLoginUrl');
    expect(source).not.toContain('export async function handleWhopCallback');
    expect(source).not.toContain('/api/auth/whop/callback');
    expect(source).not.toContain('/auth/whop/callback');
  });

  it('whop.ts gates entitlements behind session verification', () => {
    const source = readFileSync(
      path.resolve(__dirname, '../../src/lib/whop.ts'),
      'utf8',
    );
    expect(source).toContain('sessionVerified');
    expect(source).toContain('isSessionVerified');
    // No unconditional restore of a stored user as authenticated identity.
    expect(source).not.toMatch(/data\.authenticated[^]*?this\.currentUser = JSON\.parse/);
  });
});
