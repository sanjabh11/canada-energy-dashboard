/**
 * whop-mini token contract tests (Codex audit).
 *
 * The mini-app must treat the Whop iframe token strictly as a credential:
 * sent once to the whop-verify-access edge function as a Bearer token,
 * never decoded locally, never trusted for identity or tier. Any failure
 * resolves to a free-tier guest.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  extractWhopUserToken,
  mapWhopMiniTier,
  verifyWhopMiniAccess,
} from '../../src/components/whop-mini/WhopMiniApp';

const EDGE_BASE = 'https://example.functions.supabase.co';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const VERIFIED_MEMBER = {
  hasAccess: true,
  tier: 'pro',
  features: ['basic_dashboard', 'exports'],
  user: { id: 'whop_verified_1', email: 'member@example.test' },
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('whop-mini — extractWhopUserToken', () => {
  it('reads the token only from the known Whop iframe params', () => {
    expect(extractWhopUserToken('?whop_user_token=abc123')).toBe('abc123');
    expect(extractWhopUserToken('?token=def')).toBe('def');
    expect(extractWhopUserToken('?whop_token=ghi')).toBe('ghi');
    expect(extractWhopUserToken('?foo=bar')).toBeNull();
    expect(extractWhopUserToken('')).toBeNull();
    expect(extractWhopUserToken('?whop_user_token=   ')).toBeNull();
  });
});

describe('whop-mini — verifyWhopMiniAccess', () => {
  it('POSTs the token as Bearer to whop-verify-access and uses the server response', async () => {
    vi.stubEnv('VITE_SUPABASE_EDGE_BASE', EDGE_BASE);
    vi.stubEnv('VITE_WHOP_EXPERIENCE_ID', 'exp_ceip_main');
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(VERIFIED_MEMBER));

    const user = await verifyWhopMiniAccess('the-whop-token', fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe(`${EDGE_BASE}/whop-verify-access`);
    expect(init?.method).toBe('POST');
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer the-whop-token');
    expect(headers.apikey).toBeUndefined();
    expect(JSON.parse(String(init?.body))).toEqual({ experienceId: 'exp_ceip_main' });

    expect(user).toEqual({
      id: 'whop_verified_1',
      email: 'member@example.test',
      tier: 'pro',
      isWhopUser: true,
    });
  });

  it('NEVER decodes the token locally — a forged JWT claiming enterprise resolves to the server tier', async () => {
    vi.stubEnv('VITE_SUPABASE_EDGE_BASE', EDGE_BASE);
    // A hand-crafted JWT whose payload claims enterprise access.
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: 'attacker', tier: 'enterprise', email: 'a@b.c' }),
    ).toString('base64url');
    const forgedToken = `header.${forgedPayload}.signature`;

    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ hasAccess: false, tier: 'free', user: { id: 'whop_verified_1' } }));

    const user = await verifyWhopMiniAccess(forgedToken, fetchImpl);

    expect(user.id).toBe('whop_verified_1');
    expect(user.tier).toBe('free');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns a free-tier verified member when the server reports hasAccess=false', async () => {
    vi.stubEnv('VITE_SUPABASE_EDGE_BASE', EDGE_BASE);
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ hasAccess: false, tier: 'free', user: { id: 'whop_user_no_access' } }));

    const user = await verifyWhopMiniAccess('token', fetchImpl);
    expect(user).toMatchObject({ id: 'whop_user_no_access', tier: 'free', isWhopUser: true });
  });

  it('fails closed to guest when the edge base is not configured', async () => {
    vi.stubEnv('VITE_SUPABASE_EDGE_BASE', '');
    const fetchImpl = vi.fn<typeof fetch>();
    const user = await verifyWhopMiniAccess('token', fetchImpl);
    expect(user).toMatchObject({ tier: 'free', isWhopUser: false });
    expect(user.id).toMatch(/^guest_/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails closed to guest on non-2xx responses', async () => {
    vi.stubEnv('VITE_SUPABASE_EDGE_BASE', EDGE_BASE);
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ hasAccess: false, tier: 'free', reason: 'verification_failed' }, 401));
    const user = await verifyWhopMiniAccess('bad-token', fetchImpl);
    expect(user).toMatchObject({ tier: 'free', isWhopUser: false });
  });

  it('fails closed to guest on network errors', async () => {
    vi.stubEnv('VITE_SUPABASE_EDGE_BASE', EDGE_BASE);
    const fetchImpl = vi.fn<typeof fetch>(async () => { throw new Error('network down'); });
    const user = await verifyWhopMiniAccess('token', fetchImpl);
    expect(user).toMatchObject({ tier: 'free', isWhopUser: false });
  });

  it('fails closed to guest when the response carries no verified user id', async () => {
    vi.stubEnv('VITE_SUPABASE_EDGE_BASE', EDGE_BASE);
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ hasAccess: true, tier: 'pro', user: {} }));
    const user = await verifyWhopMiniAccess('token', fetchImpl);
    expect(user).toMatchObject({ tier: 'free', isWhopUser: false });
  });
});

describe('whop-mini — tier mapping', () => {
  it('maps whop-verify-access tiers onto mini-app tiers, unknown → free', () => {
    expect(mapWhopMiniTier('pro')).toBe('pro');
    expect(mapWhopMiniTier('enterprise')).toBe('pro');
    expect(mapWhopMiniTier('starter')).toBe('basic');
    expect(mapWhopMiniTier('basic')).toBe('basic');
    expect(mapWhopMiniTier('free')).toBe('free');
    expect(mapWhopMiniTier('enterprise-ultra')).toBe('free');
    expect(mapWhopMiniTier(undefined)).toBe('free');
    expect(mapWhopMiniTier({ tier: 'pro' })).toBe('free');
  });
});

describe('whop-mini — source contract', () => {
  const source = readFileSync(
    path.resolve(__dirname, '../../src/components/whop-mini/WhopMiniApp.tsx'),
    'utf8',
  );

  it('never calls the whop-webhook function or sends a verify_token action', () => {
    expect(source).not.toContain('whop-webhook');
    expect(source).not.toContain('verify_token');
    expect(source).toContain('/whop-verify-access');
  });

  it('never decodes the token locally (no atob/JWT-payload branch)', () => {
    expect(source).not.toContain('atob(');
    expect(source).not.toContain("split('.')");
  });

  it('sends the token only as a Bearer credential, never in a request body', () => {
    expect(source).toContain('`Bearer ${token}`');
    // The verification POST body carries only optional experience context.
    expect(source).not.toMatch(/body:\s*JSON\.stringify\([^)]*token/i);
  });
});
