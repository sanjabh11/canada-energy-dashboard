import { describe, expect, it, vi } from 'vitest';
import {
  parseCookieHeader,
  verifyWhopSessionToken,
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
});
