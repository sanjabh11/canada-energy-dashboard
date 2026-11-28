import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createOwnerDataClient: vi.fn(),
  getCurrentWhopEntitlement: vi.fn(),
  verifyWhopSessionToken: vi.fn(),
}));

vi.mock('../../netlify/functions/_shared/utilityConnectorOwner', () => ({
  createOwnerDataClient: mocks.createOwnerDataClient,
  getCurrentWhopEntitlement: mocks.getCurrentWhopEntitlement,
  verifyWhopSessionToken: mocks.verifyWhopSessionToken,
  parseCookieHeader(cookieHeader: string | undefined, cookieName: string) {
    const value = cookieHeader?.split(';').map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!value) return null;
    try { return decodeURIComponent(value); } catch { return value; }
  },
}));

import { handler } from '../../netlify/functions/auth-session';

const verifiedIdentity = {
  providerId: 'whop_verified_user',
  email: 'verified@example.test',
  name: 'Verified Member',
  verificationSource: 'oauth_userinfo' as const,
};

function event(params: {
  httpMethod: string;
  path?: string;
  headers?: Record<string, string>;
  body?: string;
}) {
  return {
    httpMethod: params.httpMethod,
    path: params.path ?? '/.netlify/functions/auth-session/session',
    headers: params.headers ?? {},
    body: params.body,
  } as never;
}

async function invoke(input: Parameters<typeof handler>[0]) {
  return handler(input);
}

describe('auth-session server trust boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyWhopSessionToken.mockResolvedValue({ valid: true, identity: verifiedIdentity });
    mocks.createOwnerDataClient.mockReturnValue({});
    mocks.getCurrentWhopEntitlement.mockResolvedValue({ tier: 'pro', expiryDate: '2026-12-01T00:00:00.000Z' });
  });

  it('rejects an empty session token without contacting Whop', async () => {
    for (const body of [JSON.stringify({ token: '' }), JSON.stringify({}), JSON.stringify({ token: '   ' })]) {
      const result = await invoke(event({
        httpMethod: 'POST',
        path: '/.netlify/functions/auth-session/login',
        headers: { origin: 'https://canada-energy.netlify.app', 'content-type': 'application/json' },
        body,
      }));
      expect(result.statusCode).toBe(400);
      expect(result.headers['Set-Cookie']).toBeUndefined();
    }
    expect(mocks.verifyWhopSessionToken).not.toHaveBeenCalled();
  });

  it('rejects forged tokens and does not mint a cookie', async () => {
    mocks.verifyWhopSessionToken.mockResolvedValue({ valid: false, httpStatus: 401, retryable: false });
    const result = await invoke(event({
      httpMethod: 'POST',
      path: '/.netlify/functions/auth-session/login',
      headers: { origin: 'https://canada-energy.netlify.app', 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'fake-token', user: { id: 'attacker', tier: 'team' } }),
    }));

    expect(result.statusCode).toBe(401);
    expect(result.headers['Set-Cookie']).toBeUndefined();
    expect(JSON.parse(result.body)).toEqual({ error: 'Invalid or expired session' });
  });

  it('uses provider identity and ignores the caller-supplied profile at login', async () => {
    const result = await invoke(event({
      httpMethod: 'POST',
      path: '/.netlify/functions/auth-session/login',
      headers: { origin: 'https://canada-energy.netlify.app', 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'opaque-test-token', user: { id: 'attacker', tier: 'team' } }),
    }));

    expect(result.statusCode).toBe(200);
    expect(result.headers['Set-Cookie']).toContain('HttpOnly');
    expect(result.headers['Set-Cookie']).toContain('Secure');
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      user: { id: 'whop_verified_user', email: 'verified@example.test', name: 'Verified Member' },
    });
    expect(JSON.parse(result.body)).not.toHaveProperty('user.tier');
  });

  it('derives identity from the cookie and entitlement from server storage', async () => {
    const result = await invoke(event({
      httpMethod: 'GET',
      headers: { cookie: 'whop_session=opaque-test-token' },
    }));

    expect(result.statusCode).toBe(200);
    expect(mocks.verifyWhopSessionToken).toHaveBeenCalledWith('opaque-test-token', expect.objectContaining({ mode: 'live' }));
    expect(mocks.getCurrentWhopEntitlement).toHaveBeenCalledWith({}, 'whop_verified_user');
    expect(JSON.parse(result.body)).toEqual({
      authenticated: true,
      user: { id: 'whop_verified_user', email: 'verified@example.test', name: 'Verified Member' },
      hasAccess: true,
      tier: 'pro',
      subscriptionStatus: 'active',
      subscriptionEndDate: '2026-12-01T00:00:00.000Z',
    });
  });

  it('fails closed with 503 when Whop verification is unavailable', async () => {
    mocks.verifyWhopSessionToken.mockResolvedValue({ valid: false, retryable: true });
    const result = await invoke(event({
      httpMethod: 'POST',
      path: '/.netlify/functions/auth-session/login',
      headers: { origin: 'https://canada-energy.netlify.app', 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'opaque-test-token' }),
    }));

    expect(result.statusCode).toBe(503);
    expect(result.headers['Set-Cookie']).toBeUndefined();
    expect(JSON.parse(result.body)).toEqual({ error: 'Identity verification is temporarily unavailable' });
  });

  it('session restore cannot be redirected to another user — identity comes from the token', async () => {
    // A cookie for user A plus any client-side claim about user B must still
    // resolve identity/entitlement for user A only.
    const result = await invoke(event({
      httpMethod: 'GET',
      headers: { cookie: 'whop_session=opaque-test-token' },
    }));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.user.id).toBe('whop_verified_user');
    expect(mocks.getCurrentWhopEntitlement).toHaveBeenCalledWith({}, 'whop_verified_user');
    expect(mocks.getCurrentWhopEntitlement).not.toHaveBeenCalledWith({}, expect.not.stringContaining('whop_verified_user'));
  });

  it('fails to free tier when entitlement storage is unavailable', async () => {
    mocks.createOwnerDataClient.mockImplementation(() => { throw new Error('unavailable'); });
    const result = await invoke(event({ httpMethod: 'GET', headers: { cookie: 'whop_session=opaque-test-token' } }));

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toMatchObject({ authenticated: true, hasAccess: false, tier: 'free' });
  });

  it('rejects cross-origin session creation', async () => {
    const result = await invoke(event({
      httpMethod: 'POST',
      path: '/.netlify/functions/auth-session/login',
      headers: { origin: 'https://attacker.example', 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'opaque-test-token' }),
    }));

    expect(result.statusCode).toBe(403);
    expect(mocks.verifyWhopSessionToken).not.toHaveBeenCalled();
  });

  it('clears a cookie only after Whop rejects its token', async () => {
    mocks.verifyWhopSessionToken.mockResolvedValue({ valid: false, httpStatus: 401, retryable: false });
    const result = await invoke(event({ httpMethod: 'GET', headers: { cookie: 'whop_session=invalid-token' } }));

    expect(result.statusCode).toBe(401);
    expect(result.headers['Set-Cookie']).toContain('Max-Age=0');
  });
});
