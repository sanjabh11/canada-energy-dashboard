import { describe, expect, it, vi } from 'vitest';
import {
  handleWhopVerifyAccessRequest,
  parseAllowedOrigins,
  parseWhopIdList,
  parseWhopProductTierMap,
  WHOP_IDENTITY_VERIFICATION_TARGETS,
  type WhopVerifyAccessConfig,
} from '../../supabase/functions/whop-verify-access/index';

const ALLOWED_ORIGIN = 'https://canada-energy.netlify.app';

// Server-held CEIP product allowlist used by the test config. Memberships
// are recognized ONLY by these exact IDs — never by product name.
const CEIP_PRODUCTS = {
  starter: 'prod_ceip_starter',
  pro: 'prod_ceip_pro',
  enterprise: 'prod_ceip_enterprise',
} as const;

function config(overrides: Partial<WhopVerifyAccessConfig> = {}): WhopVerifyAccessConfig {
  return {
    whopApiKey: 'server-key',
    allowedOrigins: [ALLOWED_ORIGIN],
    ceipProductIds: Object.values(CEIP_PRODUCTS),
    ceipExperienceIds: ['exp_ceip_main'],
    ceipProductTierMap: {
      [CEIP_PRODUCTS.starter]: 'starter',
      [CEIP_PRODUCTS.pro]: 'pro',
      [CEIP_PRODUCTS.enterprise]: 'enterprise',
    },
    isProduction: false,
    fetchImpl: vi.fn<typeof fetch>(async () => response({ data: [] })),
    ...overrides,
  };
}

function request(params: {
  method?: string;
  origin?: string;
  token?: string;
  iframeToken?: string;
  query?: string;
  body?: unknown;
}): Request {
  const headers = new Headers();
  if (params.origin) headers.set('Origin', params.origin);
  if (params.token !== undefined) headers.set('Authorization', `Bearer ${params.token}`);
  if (params.iframeToken !== undefined) headers.set('x-whop-user-token', params.iframeToken);
  return new Request(
    `https://functions.example/whop-verify-access${params.query ?? ''}`,
    {
      method: params.method ?? 'POST',
      headers,
      body: params.body === undefined ? undefined
        : typeof params.body === 'string' ? params.body : JSON.stringify(params.body),
    },
  );
}

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** fetchImpl that resolves the caller token to `providerId`, then serves memberships. */
function liveWhopFetch(providerId: string, memberships: unknown[]) {
  return vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url === 'https://api.whop.com/oauth/userinfo') {
      return response({ sub: providerId, email: 'member@example.test' });
    }
    if (url === 'https://api.whop.com/v5/me') {
      return response({ error: 'unreachable' }, 500);
    }
    if (url.includes('/api/v5/memberships')) {
      return response({ data: memberships });
    }
    return response({ error: 'unexpected' }, 404);
  });
}

const ACTIVE_PRO_MEMBERSHIP = [
  { status: 'active', product_id: CEIP_PRODUCTS.pro },
];

describe('whop-verify-access — identity contract hardening', () => {
  it('rejects an empty bearer token', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: '   ' }),
      config({ fetchImpl }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ hasAccess: false, tier: 'free' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('never reads a token from URL query params — header/bearer only', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', ACTIVE_PRO_MEMBERSHIP);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, query: '?whop_user_token=valid-token&token=valid-token' }),
      config({ fetchImpl }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      hasAccess: false,
      tier: 'free',
      reason: 'token_required',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('verifies the iframe-injected x-whop-user-token header the same as Bearer', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', ACTIVE_PRO_MEMBERSHIP);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, iframeToken: 'iframe-token-1' }),
      config({ fetchImpl }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ hasAccess: true, tier: 'pro' });
    expect(body.user.id).toBe('whop-user-A');

    // The iframe token must be what was sent to Whop for verification.
    const verifyCall = fetchImpl.mock.calls.find(([input]) =>
      String(input) === 'https://api.whop.com/oauth/userinfo');
    expect(verifyCall).toBeDefined();
    const headers = (verifyCall![1]?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer iframe-token-1');
  });

  it('prefers x-whop-user-token over Authorization when both are present', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', ACTIVE_PRO_MEMBERSHIP);
    await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, iframeToken: 'iframe-token', token: 'bearer-token' }),
      config({ fetchImpl }),
    );
    const verifyCall = fetchImpl.mock.calls.find(([input]) =>
      String(input) === 'https://api.whop.com/oauth/userinfo');
    const headers = (verifyCall![1]?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer iframe-token');
  });

  it('rejects a forged token when Whop returns 401 on every target', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => response({ error: 'invalid_token' }, 401));
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'forged-token', body: { userId: 'victim' } }),
      config({ fetchImpl }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      hasAccess: false,
      tier: 'free',
      features: [],
      reason: 'verification_failed',
    });
  });

  it('ignores a cross-user body userId — identity comes only from the verified token', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', ACTIVE_PRO_MEMBERSHIP);
    const res = await handleWhopVerifyAccessRequest(
      request({
        origin: ALLOWED_ORIGIN,
        token: 'token-for-user-A',
        body: { userId: 'whop-user-B-victim', experienceId: 'exp_1' },
      }),
      config({ fetchImpl }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hasAccess).toBe(true);
    expect(body.tier).toBe('pro');
    expect(body.user).toEqual({ id: 'whop-user-A', email: 'member@example.test' });
    expect(body.verificationSource).toBe('oauth_userinfo');

    // The membership lookup must be scoped to the VERIFIED id, never the body's.
    const membershipCall = fetchImpl.mock.calls.find(([input]) =>
      String(input).includes('/api/v5/memberships'));
    expect(membershipCall).toBeDefined();
    expect(String(membershipCall![0])).toContain('user_id=whop-user-A');
    expect(String(membershipCall![0])).not.toContain('whop-user-B-victim');
  });

  it('returns the entitlement for a valid existing member', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', ACTIVE_PRO_MEMBERSHIP);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({ fetchImpl }),
    );
    const body = await res.json();
    expect(body).toMatchObject({
      hasAccess: true,
      tier: 'pro',
      features: expect.arrayContaining(['exports']),
    });
  });

  it('fails closed when the member has no active membership', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', [
      { status: 'cancelled', product_id: CEIP_PRODUCTS.pro },
    ]);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({ fetchImpl }),
    );
    expect(await res.json()).toMatchObject({ hasAccess: false, tier: 'free' });
  });

  it('rejects POSTs from unlisted origins and emits no ACAO header', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', ACTIVE_PRO_MEMBERSHIP);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: 'https://attacker.example', token: 'valid-token' }),
      config({ fetchImpl }),
    );
    expect(res.status).toBe(403);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects OPTIONS preflights from unlisted origins', async () => {
    const res = await handleWhopVerifyAccessRequest(
      request({ method: 'OPTIONS', origin: 'https://attacker.example' }),
      config(),
    );
    expect(res.status).toBe(403);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('answers preflight only for allowlisted origins', async () => {
    const res = await handleWhopVerifyAccessRequest(
      request({ method: 'OPTIONS', origin: ALLOWED_ORIGIN }),
      config(),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN);
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('x-whop-user-token');
  });

  it('fails closed when Whop verification is unreachable', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => { throw new Error('network down'); });
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({ fetchImpl }),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      hasAccess: false,
      tier: 'free',
      reason: 'verification_unavailable',
    });
  });

  it('fails closed when the membership lookup errors after a valid token', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes('/api/v5/memberships')) throw new Error('db edge down');
      return response({ sub: 'whop-user-A' });
    });
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({ fetchImpl }),
    );
    expect(await res.json()).toMatchObject({ hasAccess: false, tier: 'free' });
  });

  it('deploy gate: refuses to serve in production without WHOP_ALLOWED_ORIGINS', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', ACTIVE_PRO_MEMBERSHIP);
    const res = await handleWhopVerifyAccessRequest(
      request({ token: 'valid-token' }),
      config({ fetchImpl, isProduction: true, allowedOrigins: [] }),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      hasAccess: false,
      tier: 'free',
      reason: 'deploy_gated_unconfigured',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('deploy gate: refuses to serve in production without WHOP_API_KEY', async () => {
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({ isProduction: true, whopApiKey: '' }),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ reason: 'deploy_gated_unconfigured' });
  });

  it('deploy gate: refuses to serve in production without ANY CEIP ID allowlist', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', ACTIVE_PRO_MEMBERSHIP);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({
        fetchImpl,
        isProduction: true,
        ceipProductIds: [],
        ceipExperienceIds: [],
      }),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      hasAccess: false,
      tier: 'free',
      reason: 'deploy_gated_unconfigured',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('deploy gate: experience-only config is valid in production and grants access', async () => {
    // A deployment that configures ONLY WHOP_CEIP_EXPERIENCE_IDS (no
    // product IDs) must not be gated — it is a legitimate configuration.
    const fetchImpl = liveWhopFetch('whop-user-A', [
      { status: 'active', experience_id: 'exp_ceip_main' },
    ]);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({
        fetchImpl,
        isProduction: true,
        ceipProductIds: [],
        ceipExperienceIds: ['exp_ceip_main'],
        ceipProductTierMap: { exp_ceip_main: 'pro' },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ hasAccess: true, tier: 'pro' });
  });

  it('deploy gate: product-only config remains valid in production', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', ACTIVE_PRO_MEMBERSHIP);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({
        fetchImpl,
        isProduction: true,
        ceipExperienceIds: [],
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ hasAccess: true, tier: 'pro' });
  });

  it('fails closed (not grants) outside production when WHOP_API_KEY is missing', async () => {
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({ whopApiKey: '' }),
    );
    expect(await res.json()).toMatchObject({
      hasAccess: false,
      tier: 'free',
      reason: 'verification_unconfigured',
    });
  });
});

describe('whop-verify-access — CEIP product-ID tier mapping', () => {
  it('denies an active membership in an UNRELATED product (the core gap)', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', [
      { status: 'active', product_id: 'prod_some_other_app', product: { id: 'prod_some_other_app', name: 'Unrelated Course Pro' } },
    ]);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({ fetchImpl }),
    );
    const body = await res.json();
    expect(body).toMatchObject({ hasAccess: false, tier: 'free', features: [] });
    // Identity still verifies — only the entitlement is denied.
    expect(body.user.id).toBe('whop-user-A');
  });

  it('never matches on product NAME — a name-similar product with an unknown ID is denied', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', [
      { status: 'active', product: { name: 'CEIP Enterprise Suite', id: 'prod_impostor' } },
    ]);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({ fetchImpl }),
    );
    expect(await res.json()).toMatchObject({ hasAccess: false, tier: 'free' });
  });

  it.each([
    ['product_id', { status: 'active', product_id: CEIP_PRODUCTS.pro }],
    ['product.id', { status: 'active', product: { id: CEIP_PRODUCTS.pro } }],
    ['plan_id', { status: 'active', plan_id: CEIP_PRODUCTS.pro }],
    ['plan.product_id', { status: 'active', plan: { product_id: CEIP_PRODUCTS.pro } }],
    ['experience_id', { status: 'active', experience_id: CEIP_PRODUCTS.pro }],
  ])('maps a configured CEIP product via %s', async (_shape, membership) => {
    const fetchImpl = liveWhopFetch('whop-user-A', [membership]);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({ fetchImpl }),
    );
    expect(await res.json()).toMatchObject({ hasAccess: true, tier: 'pro' });
  });

  it('honors a trialing membership in a configured product', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', [
      { status: 'trialing', product_id: CEIP_PRODUCTS.starter },
    ]);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({ fetchImpl }),
    );
    expect(await res.json()).toMatchObject({ hasAccess: true, tier: 'starter' });
  });

  it.each(['expired', 'cancelled', 'canceled', 'past_due', 'unpaid', 'completed'])(
    'denies a %s membership even in a configured product',
    async (status) => {
      const fetchImpl = liveWhopFetch('whop-user-A', [
        { status, product_id: CEIP_PRODUCTS.enterprise },
      ]);
      const res = await handleWhopVerifyAccessRequest(
        request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
        config({ fetchImpl }),
      );
      expect(await res.json()).toMatchObject({ hasAccess: false, tier: 'free' });
    },
  );

  it('fails closed when no product-ID config exists at all', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', ACTIVE_PRO_MEMBERSHIP);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({ fetchImpl, ceipProductIds: [], ceipExperienceIds: [], ceipProductTierMap: {} }),
    );
    expect(await res.json()).toMatchObject({ hasAccess: false, tier: 'free' });
  });

  it('fails closed for a configured product ID with no tier-map entry', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', [
      { status: 'active', product_id: 'prod_ceip_unmapped' },
    ]);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({ fetchImpl, ceipProductIds: ['prod_ceip_unmapped'] }),
    );
    expect(await res.json()).toMatchObject({ hasAccess: false, tier: 'free' });
  });

  it('keeps the best tier when unrelated and CEIP memberships coexist', async () => {
    const fetchImpl = liveWhopFetch('whop-user-A', [
      { status: 'active', product_id: 'prod_unrelated' },
      { status: 'active', product_id: CEIP_PRODUCTS.starter },
      { status: 'cancelled', product_id: CEIP_PRODUCTS.enterprise },
      { status: 'trialing', product_id: CEIP_PRODUCTS.pro },
    ]);
    const res = await handleWhopVerifyAccessRequest(
      request({ origin: ALLOWED_ORIGIN, token: 'valid-token' }),
      config({ fetchImpl }),
    );
    expect(await res.json()).toMatchObject({ hasAccess: true, tier: 'pro' });
  });
});

describe('whop-verify-access — contract metadata', () => {
  it('parses a comma-separated allowlist and treats unset as deny-all', () => {
    expect(parseAllowedOrigins(' https://a.example ,https://b.example ,')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
    expect(parseAllowedOrigins(undefined)).toEqual([]);
    expect(parseAllowedOrigins('   ')).toEqual([]);
  });

  it('parses Whop ID lists and the JSON product→tier map fail-closed', () => {
    expect(parseWhopIdList(' prod_a , prod_b ,,')).toEqual(['prod_a', 'prod_b']);
    expect(parseWhopIdList(undefined)).toEqual([]);

    expect(parseWhopProductTierMap('{"prod_x":"pro","prod_y":"STARTER"}')).toEqual({
      prod_x: 'pro',
      prod_y: 'starter',
    });
    // Invalid JSON, non-object JSON, and unknown tiers all parse to {}.
    expect(parseWhopProductTierMap('not-json')).toEqual({});
    expect(parseWhopProductTierMap('["prod_x"]')).toEqual({});
    expect(parseWhopProductTierMap('{"prod_x":"platinum"}')).toEqual({});
    expect(parseWhopProductTierMap(undefined)).toEqual({});
  });

  it('documents verification targets honestly — userinfo confirmed, /v5/me last + unconfirmed', () => {
    const targets = WHOP_IDENTITY_VERIFICATION_TARGETS;
    expect(targets.length).toBeGreaterThanOrEqual(2);

    const userinfo = targets.find((t) => t.url.endsWith('/oauth/userinfo'));
    const legacy = targets.find((t) => t.url.endsWith('/v5/me'));

    // /oauth/userinfo is docs-confirmed for OAuth user tokens.
    expect(userinfo?.docsStatus).toMatch(/confirmed_in_official_whop_docs/i);
    expect(userinfo?.docsStatus).not.toMatch(/unconfirmed|unverified/i);

    // /v5/me is NOT confirmed — flagged, and kept LAST in the chain.
    expect(legacy?.docsStatus).toMatch(/unconfirmed|unverified/i);
    expect(targets[targets.length - 1].url).toBe('https://api.whop.com/v5/me');
  });
});
