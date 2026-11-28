import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkoutDisabledResponse,
  handleStripeCheckoutRequest,
  isCheckoutEnabled,
  type StripeCheckoutConfig,
} from '../../supabase/functions/stripe-create-checkout-session/handler';

// _shared/cors.ts reads Deno.env.get('CORS_ALLOWED_ORIGINS') when attaching
// CORS headers; stub the Deno global the same way supabaseCors.test.ts does.
type DenoStub = { env: { get(name: string): string | undefined } };
const originalDeno = (globalThis as typeof globalThis & { Deno?: DenoStub }).Deno;

function config(overrides: Partial<StripeCheckoutConfig> = {}): StripeCheckoutConfig {
  return {
    checkoutEnabled: 'true',
    stripeCheckoutEnabled: 'true',
    supabaseUrl: 'https://supabase.example',
    supabaseAnonKey: 'anon-key',
    stripeSecretKey: 'sk_test_mocked',
    priceEdubiz: 'price_edubiz_123',
    pricePro: 'price_pro_123',
    frontendBaseUrl: 'https://app.example.com',
    fetchImpl: vi.fn<typeof fetch>(async () => {
      throw new Error('fetchImpl must not be called while checkout is gated');
    }),
    verifyBearerToken: vi.fn(async () => null),
    ...overrides,
  };
}

function request(params: {
  method?: string;
  origin?: string;
  token?: string;
  body?: unknown;
} = {}): Request {
  const headers = new Headers();
  if (params.origin) headers.set('Origin', params.origin);
  if (params.token !== undefined) headers.set('Authorization', `Bearer ${params.token}`);
  return new Request('https://functions.example/stripe-create-checkout-session', {
    method: params.method ?? 'POST',
    headers,
    body: params.body === undefined ? undefined : JSON.stringify(params.body),
  });
}

describe('stripe-create-checkout-session — CEIP_CHECKOUT_ENABLED hard gate', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { Deno?: DenoStub }).Deno = {
      env: { get: () => undefined },
    };
  });

  afterEach(() => {
    (globalThis as typeof globalThis & { Deno?: DenoStub }).Deno = originalDeno;
  });

  it('returns 403 checkout_disabled when the env flag is unset — no Stripe fetch issued', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const verifyBearerToken = vi.fn(async () => ({ id: 'user-1', email: 'member@example.test' }));
    const res = await handleStripeCheckoutRequest(
      // A fully valid-looking request: bearer token + checkout body. The gate
      // must deny BEFORE auth verification or any Stripe call.
      request({ token: 'valid-token', body: { tier: 'pro' } }),
      config({ checkoutEnabled: undefined, fetchImpl, verifyBearerToken }),
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'checkout_disabled' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(verifyBearerToken).not.toHaveBeenCalled();
  });

  it.each(['', '1', 'TRUE', 'True', 'yes', 'enabled', ' true', 'true '])(
    'rejects non-exact flag value %p — only the literal string "true" enables checkout',
    async (flag) => {
      const fetchImpl = vi.fn<typeof fetch>();
      const res = await handleStripeCheckoutRequest(
        request({ token: 'valid-token', body: { tier: 'pro' } }),
        config({ checkoutEnabled: flag, fetchImpl }),
      );
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'checkout_disabled' });
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it('gate is evaluated before method/CORS handling — disabled OPTIONS preflight is refused too', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const res = await handleStripeCheckoutRequest(
      request({ method: 'OPTIONS', origin: 'https://canada-energy.netlify.app' }),
      config({ checkoutEnabled: undefined, fetchImpl }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'checkout_disabled' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('env "true" proceeds past the gate into the auth path — unauthenticated POST gets 401, not 403-disabled', async () => {
    const verifyBearerToken = vi.fn(async () => null);
    const res = await handleStripeCheckoutRequest(
      request({ token: 'invalid-or-expired-token', body: { tier: 'pro' } }),
      config({ verifyBearerToken }),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).not.toBe('checkout_disabled');
    expect(body.error).toBe('Unauthorized');
    // Auth verification was attempted — proof the request got PAST the gate.
    expect(verifyBearerToken).toHaveBeenCalledWith('invalid-or-expired-token');
  });

  it('env "true" with no Authorization header still reaches auth denial (401), proving the gate passed', async () => {
    const res = await handleStripeCheckoutRequest(
      request({ body: { tier: 'edubiz' } }),
      config(),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' });
  });

  it('direct handler invocation cannot bypass the gate — the check lives inside the handler', async () => {
    // Calling handleStripeCheckoutRequest directly (as index.ts does after
    // rate limiting) must still enforce the gate — it is not a wrapper-only
    // check that a direct caller could skip.
    const fetchImpl = vi.fn<typeof fetch>();
    const res = await handleStripeCheckoutRequest(
      request({ token: 'valid-token', body: { tier: 'pro' } }),
      config({ checkoutEnabled: 'false', fetchImpl }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'checkout_disabled' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('enabled + authenticated + configured end-to-end creates the Stripe session via injected fetch', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/cs_test_1', id: 'cs_test_1' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ));
    const verifyBearerToken = vi.fn(async () => ({ id: 'user-1', email: 'member@example.test' }));

    const res = await handleStripeCheckoutRequest(
      request({ token: 'valid-token', body: { tier: 'pro' } }),
      config({ fetchImpl, verifyBearerToken }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
      id: 'cs_test_1',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe('https://api.stripe.com/v1/checkout/sessions');
    expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer sk_test_mocked');
  });
});

describe('stripe-create-checkout-session — gate helpers', () => {
  it('isCheckoutEnabled is exact-string only', () => {
    expect(isCheckoutEnabled(config({ checkoutEnabled: 'true' }))).toBe(true);
    for (const flag of [undefined, '', 'false', '1', 'TRUE', 'yes']) {
      expect(isCheckoutEnabled(config({ checkoutEnabled: flag }))).toBe(false);
    }
  });

  it('checkoutDisabledResponse is a 403 JSON denial', async () => {
    (globalThis as typeof globalThis & { Deno?: DenoStub }).Deno = {
      env: { get: () => undefined },
    };
    const res = checkoutDisabledResponse(request({ origin: 'https://canada-energy.netlify.app' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'checkout_disabled' });
    (globalThis as typeof globalThis & { Deno?: DenoStub }).Deno = originalDeno;
  });
});
