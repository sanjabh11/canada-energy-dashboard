import { describe, expect, it, vi } from 'vitest';
import {
  getCurrentWhopEntitlement,
  parseCookieHeader,
  verifyWhopSessionToken,
  WHOP_VERIFICATION_TARGETS,
  type OwnerDataClient,
} from '../../netlify/functions/_shared/utilityConnectorOwner';

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('utilityConnectorOwner', () => {
  it('verifies current Whop sessions through OAuth userinfo', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.whop.com/oauth/userinfo');
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer live-token');
      return response({ sub: 'whop-user-1', email: 'owner@example.com', name: 'Owner' });
    });

    const result = await verifyWhopSessionToken('live-token', { fetchImpl });

    expect(result).toEqual({
      valid: true,
      identity: {
        providerId: 'whop-user-1',
        email: 'owner@example.com',
        name: 'Owner',
        verificationSource: 'oauth_userinfo',
      },
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('uses the legacy Whop endpoint only as a verified compatibility fallback', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => (
      String(input).endsWith('/oauth/userinfo')
        ? response({ error: 'unsupported' }, 404)
        : response({ id: 'legacy-whop-user' })
    ));

    const result = await verifyWhopSessionToken('legacy-token', { fetchImpl });

    expect(result.identity).toMatchObject({
      providerId: 'legacy-whop-user',
      verificationSource: 'legacy_me',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not treat a live JWT payload as identity proof when Whop rejects it', async () => {
    const encodedPayload = Buffer.from(JSON.stringify({ sub: 'spoofed-user' })).toString('base64url');
    const fakeJwt = `header.${encodedPayload}.signature`;
    const fetchImpl = vi.fn(async () => response({ error: 'invalid_token' }, 401));

    const result = await verifyWhopSessionToken(fakeJwt, { fetchImpl });

    expect(result.valid).toBe(false);
    expect(result.identity).toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('fails closed and marks retryable when Whop is unreachable on every target', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => { throw new Error('network down'); });

    const result = await verifyWhopSessionToken('live-token', { fetchImpl });

    expect(result.valid).toBe(false);
    expect(result.identity).toBeUndefined();
    expect(result.retryable).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(WHOP_VERIFICATION_TARGETS.length);
  });

  it('fails closed and marks retryable when Whop returns 5xx on every target', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => response({ error: 'upstream' }, 503));

    const result = await verifyWhopSessionToken('live-token', { fetchImpl });

    expect(result.valid).toBe(false);
    expect(result.identity).toBeUndefined();
    expect(result.retryable).toBe(true);
  });

  it('documents every verification target honestly against official Whop docs', () => {
    expect(WHOP_VERIFICATION_TARGETS.length).toBeGreaterThanOrEqual(2);
    // /oauth/userinfo is documented for OAuth user tokens (verified 2026-10-08
    // against docs.whop.com); /v5/me remains unconfirmed and is kept last as a
    // legacy fallback flagged for owner confirmation before hosted deploy.
    const userinfo = WHOP_VERIFICATION_TARGETS.find((t) => t.url.endsWith('/oauth/userinfo'));
    expect(userinfo?.verificationSource).toBe('oauth_userinfo');
    expect(userinfo?.docsStatus).toMatch(/confirmed_in_official_whop_docs/i);
    const legacy = WHOP_VERIFICATION_TARGETS.find((t) => t.url.endsWith('/v5/me'));
    expect(legacy?.verificationSource).toBe('legacy_me');
    expect(legacy?.docsStatus).toContain('before_hosted_deploy');
  });

  it('keeps simulated mode explicit and separate from live verification', async () => {
    const payload = Buffer.from(JSON.stringify({ sub: 'simulated-user', email: 'sim@example.com' })).toString('base64url');
    const result = await verifyWhopSessionToken(`header.${payload}.signature`, { mode: 'simulated' });

    expect(result).toEqual({
      valid: true,
      identity: {
        providerId: 'simulated-user',
        email: 'sim@example.com',
        verificationSource: 'simulated',
      },
    });
  });

  it('parses only the requested cookie and tolerates encoded values', () => {
    expect(parseCookieHeader('other=ignore; whop_session=opaque%2Btoken; flag=yes', 'whop_session')).toBe('opaque+token');
    expect(parseCookieHeader('other=ignore', 'whop_session')).toBeNull();
  });

  it('grants only the strongest active, current entitlement from server storage', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (_input, _init) => response([
      { tier: 'team', status: 'active', start_date: '2026-01-01T00:00:00.000Z', expiry_date: '2026-09-01T00:00:00.000Z' },
      { tier: 'basic', status: 'active', start_date: '2026-01-01T00:00:00.000Z', expiry_date: '2026-12-01T00:00:00.000Z' },
      { tier: 'pro', status: 'cancelled', start_date: '2026-01-01T00:00:00.000Z', expiry_date: null },
      { tier: 'team', status: 'active', start_date: '2027-01-01T00:00:00.000Z', expiry_date: null },
    ]));
    const client: OwnerDataClient = {
      supabaseUrl: 'https://example.supabase.co',
      serviceRoleKey: 'not-a-real-key',
      anonKey: '',
      fetchImpl,
    };

    await expect(getCurrentWhopEntitlement(client, 'whop-user-1', new Date('2026-10-06T00:00:00.000Z')))
      .resolves.toEqual({ tier: 'basic', expiryDate: '2026-12-01T00:00:00.000Z' });
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('whop_user_id=eq.whop-user-1');
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('provider=eq.whop');
  });

  it('fails to a free entitlement when all rows are expired or malformed', async () => {
    const client: OwnerDataClient = {
      supabaseUrl: 'https://example.supabase.co',
      serviceRoleKey: 'not-a-real-key',
      anonKey: '',
      fetchImpl: vi.fn<typeof fetch>(async () => response([
        { tier: 'team', status: 'active', start_date: '2026-01-01T00:00:00.000Z', expiry_date: '2026-09-01T00:00:00.000Z' },
        { tier: 'unlisted', status: 'active', start_date: null, expiry_date: null },
      ])),
    };

    await expect(getCurrentWhopEntitlement(client, 'whop-user-1', new Date('2026-10-06T00:00:00.000Z')))
      .resolves.toEqual({ tier: 'free', expiryDate: null });
  });
});
