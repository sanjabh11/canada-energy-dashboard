/**
 * Token-shape gate fuzzing for the Whop session surfaces.
 *
 * Two layers are exercised with the real code path (no module mocks for the
 * verifier — the handler calls the real `verifyWhopSessionToken`, with the
 * Whop API emulated by a fetch stub that only accepts one provider-issued
 * token):
 *
 *   Layer 1 — verifyWhopSessionToken
 *     (netlify/functions/_shared/utilityConnectorOwner.ts)
 *     Expected error class: `{ valid: false, error: string }` — never throws,
 *     never fabricates identity. An empty token short-circuits locally with
 *     'Whop session cookie is missing.' BEFORE any network call; every other
 *     token is forwarded to Whop and only a provider-side acceptance may
 *     produce `valid: true`.
 *
 *   Layer 2 — auth-session /login
 *     (netlify/functions/auth-session.ts)
 *     Expected error class: HTTP 400 `{ error: 'Invalid session token' }` for
 *     shape failures (missing/empty/non-string/>8192 bytes) — raised BEFORE
 *     the verifier runs. HTTP 401 `{ error: 'Invalid or expired session' }`
 *     when a shaped token reaches the verifier and the provider rejects it.
 *     503 is reserved for provider outages (retryable), which none of these
 *     deterministic rejections should produce.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { verifyWhopSessionToken } from '../../netlify/functions/_shared/utilityConnectorOwner';
import { handler as authSessionHandler } from '../../netlify/functions/auth-session';

const PROVIDER_ISSUED_TOKEN = 'provider-issued-token';

function segment(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function jwtWithPayload(payload: Record<string, unknown>): string {
  return `${segment({ alg: 'HS256', typ: 'JWT' })}.${segment(payload)}.${segment({ sig: 'x' })}`;
}

/** Emulates the Whop API: exactly one bearer token is real. */
function providerFetchStub() {
  return vi.fn<typeof fetch>(async (_input, init) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const auth = headers.Authorization ?? headers.authorization ?? '';
    if (auth === `Bearer ${PROVIDER_ISSUED_TOKEN}`) {
      return new Response(JSON.stringify({ sub: 'whop_user_real' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'invalid_token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

const now = Math.floor(Date.now() / 1000);
const forgedValidShape = jwtWithPayload({
  sub: 'attacker-controlled-user',
  iss: 'https://api.whop.com',
  aud: 'app_whop',
  exp: now + 3600,
});

const FORGED_OR_MALFORMED_TOKENS: ReadonlyArray<[string, string]> = [
  ['expired exp', jwtWithPayload({ sub: 'attacker', exp: now - 3600, iss: 'https://api.whop.com', aud: 'app_whop' })],
  ['wrong aud', jwtWithPayload({ sub: 'attacker', exp: now + 3600, iss: 'https://api.whop.com', aud: 'some-other-app' })],
  ['forged iss', jwtWithPayload({ sub: 'attacker', exp: now + 3600, iss: 'https://attacker.example', aud: 'app_whop' })],
  ['two-segment token', `${segment({ alg: 'none' })}.${segment({ sub: 'attacker' })}`],
  ['four-segment token', `${segment({ alg: 'none' })}.${segment({ sub: 'attacker' })}.${segment({ x: 1 })}.extra`],
  ['truncated mid-payload', forgedValidShape.slice(0, Math.floor(forgedValidShape.length / 2))],
  ['non-base64url chars', 'header.%%%.sign@ture'],
  ['null bytes', 'abc\x00def\x00ghi'],
  ['oversized (>8KB)', `${segment({ alg: 'none' })}.${'a'.repeat(9_000)}.sig`],
];

describe('token shape gate — verifyWhopSessionToken (live provider)', () => {
  it.each(FORGED_OR_MALFORMED_TOKENS)('rejects %s without fabricating identity', async (_label, token) => {
    const fetchImpl = providerFetchStub();
    const result = await verifyWhopSessionToken(token, { fetchImpl, mode: 'live' });

    expect(result.valid).toBe(false);
    expect(result.identity).toBeUndefined();
    // Non-vacuous: the token actually reached the provider path — the guard
    // delegated verification and propagated the rejection.
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('control: the provider-issued token verifies — the stub is not vacuously rejecting', async () => {
    const fetchImpl = providerFetchStub();
    const result = await verifyWhopSessionToken(PROVIDER_ISSUED_TOKEN, { fetchImpl, mode: 'live' });

    expect(result.valid).toBe(true);
    expect(result.identity?.providerId).toBe('whop_user_real');
  });

  it.each([
    ['empty string', ''],
    ['whitespace only', '   \t\n  '],
  ])('rejects %s locally without contacting the provider', async (_label, token) => {
    const fetchImpl = providerFetchStub();
    const result = await verifyWhopSessionToken(token, { fetchImpl, mode: 'live' });

    expect(result).toMatchObject({ valid: false, error: 'Whop session cookie is missing.' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects when the provider answers 200 without a subject claim', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));
    const result = await verifyWhopSessionToken(forgedValidShape, { fetchImpl, mode: 'live' });

    expect(result.valid).toBe(false);
    expect(result.identity).toBeUndefined();
  });
});

describe('token shape gate — auth-session /login', () => {
  let providerStub: ReturnType<typeof providerFetchStub>;

  const ORIGIN = 'https://canada-energy.netlify.app';

  function loginEvent(body: string) {
    return {
      httpMethod: 'POST',
      path: '/.netlify/functions/auth-session/login',
      headers: { origin: ORIGIN, 'content-type': 'application/json' },
      body,
    } as never;
  }

  beforeEach(() => {
    providerStub = providerFetchStub();
    vi.stubGlobal('fetch', providerStub);
    // Force the live verifier path deterministically regardless of the
    // developer's shell env.
    vi.stubEnv('WHOP_AUTH_MODE', '');
    vi.stubEnv('AUTH_SESSION_ALLOW_SIMULATED', '');
    vi.stubEnv('WHOP_MODE', '');
    vi.stubEnv('VITE_WHOP_MODE', '');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([
    ['empty string', JSON.stringify({ token: '' })],
    ['missing field', JSON.stringify({})],
    ['whitespace', JSON.stringify({ token: '   ' })],
    ['non-string token', JSON.stringify({ token: 12345 })],
  ])('400 Invalid session token — %s never reaches the verifier', async (_label, body) => {
    const res = await authSessionHandler(loginEvent(body));

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'Invalid session token' });
    expect(res.headers['Set-Cookie']).toBeUndefined();
    expect(providerStub).not.toHaveBeenCalled();
  });

  it('400 Invalid session token — a token over 8192 bytes is rejected before verification', async () => {
    const res = await authSessionHandler(
      loginEvent(JSON.stringify({ token: `t.${'a'.repeat(9_000)}.z` })),
    );

    expect(res.statusCode).toBe(400);
    expect(providerStub).not.toHaveBeenCalled();
  });

  it.each(FORGED_OR_MALFORMED_TOKENS.filter(([label]) => label !== 'oversized (>8KB)'))(
    '401 Invalid or expired session — %s is forwarded and rejected by the provider',
    async (_label, token) => {
      const res = await authSessionHandler(loginEvent(JSON.stringify({ token })));

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toEqual({ error: 'Invalid or expired session' });
      expect(res.headers['Set-Cookie']).toBeUndefined();
      // Non-vacuous: the token passed the local shape gate and was verified
      // against the provider, which rejected it.
      expect(providerStub).toHaveBeenCalled();
    },
  );

  it('control: the provider-issued token logs in and mints an HttpOnly cookie', async () => {
    const res = await authSessionHandler(
      loginEvent(JSON.stringify({ token: PROVIDER_ISSUED_TOKEN })),
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ success: true });
    expect(res.headers['Set-Cookie']).toContain('HttpOnly');
  });
});
