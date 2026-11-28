/**
 * whop-webhook behavior tests (Codex audit).
 *
 * The request logic lives in supabase/functions/whop-webhook/handler.ts —
 * a Deno-free module that runs under vitest with an injected Supabase
 * client stub. HMAC is computed with Node's native crypto.subtle, the
 * same Web Crypto API the handler uses, so signatures here are real.
 *
 * A couple of source-contract assertions are kept as regression guards:
 * 'verify_token' must stay unhandled (it lives in whop-verify-access) and
 * the whop-signature HMAC check must run before any action dispatch.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  handleWhopWebhookRequest,
  type WhopSupabaseClient,
  type WhopWebhookConfig,
} from '../../supabase/functions/whop-webhook/handler';

const SECRET = 'whop_test_webhook_secret';
const PRODUCT_TIER_MAP: Record<string, string> = {
  prod_basic_1: 'basic',
  prod_pro_1: 'pro',
  prod_team_1: 'team',
};

// ---------------------------------------------------------------------------
// HMAC helper — same algorithm Whop/the handler use (HMAC-SHA256 → hex).
// ---------------------------------------------------------------------------
async function signBody(body: string, secret = SECRET): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Recording Supabase stub — mirrors the PostgREST surface the handler uses:
//   from('webhook_events').select('id').eq('event_id', id).single()
//   from('entitlements').upsert(row, { onConflict })
//   from('entitlements').update(row).eq('whop_user_id', id)
//   from('payments').insert(row)
//   from('webhook_events').insert(row)
// `seenEventIds` simulates the webhook_events table for idempotency replay.
// ---------------------------------------------------------------------------
interface StubCalls {
  upserts: { table: string; row: Record<string, unknown>; options: unknown }[];
  updates: { table: string; row: Record<string, unknown>; column: string; value: unknown }[];
  inserts: { table: string; row: Record<string, unknown> }[];
}

// Typed so `error` doesn't widen to implicit `any` under noImplicitAny
// (strictNullChecks is off in this tsconfig, so a bare `null` loses its type).
const NO_ERROR = null as { message: string } | null;

function makeSupabaseStub(seenEventIds = new Set<string>()) {
  const calls: StubCalls = { upserts: [], updates: [], inserts: [] };
  const client: WhopSupabaseClient = {
    from(table: string) {
      return {
        select: () => ({
          eq: (_column: string, value: string) => ({
            single: async () => ({
              data: seenEventIds.has(value) ? { id: 'existing-event' } : null,
              error: NO_ERROR,
            }),
          }),
        }),
        upsert: async (row: Record<string, unknown>, options: unknown) => {
          calls.upserts.push({ table, row, options });
          return { error: NO_ERROR };
        },
        update: (row: Record<string, unknown>) => ({
          eq: async (column: string, value: unknown) => {
            calls.updates.push({ table, row, column, value });
            return { error: NO_ERROR };
          },
        }),
        insert: async (row: Record<string, unknown>) => {
          calls.inserts.push({ table, row });
          if (table === 'webhook_events' && typeof row.event_id === 'string') {
            seenEventIds.add(row.event_id);
          }
          return { error: NO_ERROR };
        },
      };
    },
  };
  return { client, calls };
}

function configFor(
  stub: ReturnType<typeof makeSupabaseStub>,
  overrides: Partial<WhopWebhookConfig> = {},
): WhopWebhookConfig {
  return {
    whopWebhookSecret: SECRET,
    supabaseUrl: 'https://supabase.example',
    supabaseServiceRoleKey: 'service-role-key',
    productTierMap: { ...PRODUCT_TIER_MAP },
    createClient: vi.fn(() => stub.client),
    ...overrides,
  };
}

function whopPayload(params: {
  action?: string;
  data?: Record<string, unknown>;
} = {}) {
  return {
    action: params.action ?? 'membership.went_valid',
    data: {
      id: 'mem_123',
      user_id: 'whop_user_1',
      product_id: 'prod_pro_1',
      status: 'active',
      valid: true,
      created_at: 1_700_000_000,
      ...params.data,
    },
  };
}

async function signedRequest(
  body: string,
  opts: { secret?: string; v1Prefix?: boolean; signature?: string } = {},
): Promise<Request> {
  const hex = opts.signature ?? (await signBody(body, opts.secret ?? SECRET));
  return new Request('https://functions.example/whop-webhook', {
    method: 'POST',
    headers: { 'whop-signature': opts.v1Prefix ? `v1=${hex}` : hex },
    body,
  });
}

function unsignedRequest(body: string): Request {
  return new Request('https://functions.example/whop-webhook', {
    method: 'POST',
    body,
  });
}

describe('whop-webhook — signature gate', () => {
  it('rejects non-POST requests with 405 before touching the body', async () => {
    const stub = makeSupabaseStub();
    const config = configFor(stub);
    const res = await handleWhopWebhookRequest(
      new Request('https://functions.example/whop-webhook', { method: 'GET' }),
      config,
    );
    expect(res.status).toBe(405);
    expect(await res.text()).toBe('Method not allowed');
    expect(config.createClient).not.toHaveBeenCalled();
  });

  it('rejects a missing whop-signature header with 401 — no Supabase client created', async () => {
    const stub = makeSupabaseStub();
    const config = configFor(stub);
    const res = await handleWhopWebhookRequest(
      unsignedRequest(JSON.stringify(whopPayload())),
      config,
    );
    expect(res.status).toBe(401);
    expect(await res.text()).toBe('Invalid signature');
    expect(config.createClient).not.toHaveBeenCalled();
    expect(stub.calls.upserts).toHaveLength(0);
  });

  it('rejects an invalid signature with 401 — no entitlement upsert', async () => {
    const stub = makeSupabaseStub();
    const config = configFor(stub);
    const body = JSON.stringify(whopPayload());
    const res = await handleWhopWebhookRequest(
      await signedRequest(body, { signature: 'f'.repeat(64) }),
      config,
    );
    expect(res.status).toBe(401);
    expect(config.createClient).not.toHaveBeenCalled();
    expect(stub.calls.upserts).toHaveLength(0);
    expect(stub.calls.inserts).toHaveLength(0);
  });

  it('rejects a signature computed with the wrong secret', async () => {
    const stub = makeSupabaseStub();
    const config = configFor(stub);
    const body = JSON.stringify(whopPayload());
    const res = await handleWhopWebhookRequest(
      await signedRequest(body, { secret: 'a_different_secret' }),
      config,
    );
    expect(res.status).toBe(401);
    expect(config.createClient).not.toHaveBeenCalled();
  });

  it('rejects a tampered body whose signature no longer matches', async () => {
    const stub = makeSupabaseStub();
    const config = configFor(stub);
    const body = JSON.stringify(whopPayload());
    const req = await signedRequest(body);
    // Rebuild the request with a mutated body under the original signature.
    const tampered = new Request(req, { body: body.replace('mem_123', 'mem_999') });
    const res = await handleWhopWebhookRequest(tampered, config);
    expect(res.status).toBe(401);
    expect(config.createClient).not.toHaveBeenCalled();
  });

  it('fails closed (401) when WHOP_WEBHOOK_SECRET is unset — even with a well-formed header', async () => {
    const stub = makeSupabaseStub();
    const config = configFor(stub, { whopWebhookSecret: '' });
    const body = JSON.stringify(whopPayload());
    const res = await handleWhopWebhookRequest(
      await signedRequest(body, { secret: 'attacker_controlled' }),
      config,
    );
    expect(res.status).toBe(401);
    expect(config.createClient).not.toHaveBeenCalled();
  });

  it('accepts the "v1=<hex>" signature header format', async () => {
    const stub = makeSupabaseStub();
    const res = await handleWhopWebhookRequest(
      await signedRequest(JSON.stringify(whopPayload()), { v1Prefix: true }),
      configFor(stub),
    );
    expect(res.status).toBe(200);
  });
});

describe('whop-webhook — event dispatch', () => {
  it('valid HMAC + membership.went_valid with mapped product_id upserts entitlement at the mapped tier', async () => {
    const stub = makeSupabaseStub();
    const body = JSON.stringify(whopPayload());
    const res = await handleWhopWebhookRequest(
      await signedRequest(body),
      configFor(stub),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      message: 'Membership activated: pro',
    });

    expect(stub.calls.upserts).toHaveLength(1);
    const upsert = stub.calls.upserts[0]!;
    expect(upsert.table).toBe('entitlements');
    expect(upsert.row).toMatchObject({
      user_id: 'whop_user_1',
      whop_user_id: 'whop_user_1',
      tier: 'pro',
      status: 'active',
      provider: 'whop',
      provider_id: 'mem_123',
      product_id: 'prod_pro_1',
    });
    expect(upsert.options).toEqual({ onConflict: 'whop_user_id' });

    // Idempotency record written with identifier only — never the raw payload.
    const eventInsert = stub.calls.inserts.find((i) => i.table === 'webhook_events');
    expect(eventInsert?.row).toMatchObject({
      event_id: 'membership.went_valid_mem_123_1700000000',
      event_type: 'membership.went_valid',
      provider: 'whop',
      success: true,
      payload: null,
    });
  });

  it('uses metadata.user_id as the internal user id when present', async () => {
    const stub = makeSupabaseStub();
    const body = JSON.stringify(
      whopPayload({ data: { metadata: { user_id: 'internal_user_9' } } }),
    );
    const res = await handleWhopWebhookRequest(await signedRequest(body), configFor(stub));
    expect(res.status).toBe(200);
    expect(stub.calls.upserts[0]!.row.user_id).toBe('internal_user_9');
    expect(stub.calls.upserts[0]!.row.whop_user_id).toBe('whop_user_1');
  });

  it('maps an unknown product_id to the free tier', async () => {
    const stub = makeSupabaseStub();
    const body = JSON.stringify(whopPayload({ data: { product_id: 'prod_unmapped_x' } }));
    const res = await handleWhopWebhookRequest(await signedRequest(body), configFor(stub));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      message: 'Membership activated: free',
    });
    expect(stub.calls.upserts[0]!.row.tier).toBe('free');
  });

  it('membership.went_invalid marks the entitlement cancelled', async () => {
    const stub = makeSupabaseStub();
    const body = JSON.stringify(whopPayload({ action: 'membership.went_invalid' }));
    const res = await handleWhopWebhookRequest(await signedRequest(body), configFor(stub));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, message: 'Membership deactivated' });
    expect(stub.calls.updates).toHaveLength(1);
    expect(stub.calls.updates[0]).toMatchObject({
      table: 'entitlements',
      row: { status: 'cancelled' },
      column: 'whop_user_id',
      value: 'whop_user_1',
    });
    expect(stub.calls.upserts).toHaveLength(0);
  });

  it('payment.succeeded records a payments row without touching entitlements', async () => {
    const stub = makeSupabaseStub();
    const body = JSON.stringify(
      whopPayload({ action: 'payment.succeeded', data: { id: 'pay_42' } }),
    );
    const res = await handleWhopWebhookRequest(await signedRequest(body), configFor(stub));
    expect(res.status).toBe(200);
    const paymentInsert = stub.calls.inserts.find((i) => i.table === 'payments');
    expect(paymentInsert?.row).toMatchObject({
      whop_payment_id: 'pay_42',
      whop_user_id: 'whop_user_1',
      product_id: 'prod_pro_1',
      status: 'succeeded',
      provider: 'whop',
    });
    expect(stub.calls.upserts).toHaveLength(0);
    expect(stub.calls.updates).toHaveLength(0);
  });

  it('payment.failed marks the entitlement past_due', async () => {
    const stub = makeSupabaseStub();
    const body = JSON.stringify(whopPayload({ action: 'payment.failed' }));
    const res = await handleWhopWebhookRequest(await signedRequest(body), configFor(stub));
    expect(res.status).toBe(200);
    expect(stub.calls.updates[0]).toMatchObject({
      table: 'entitlements',
      row: { status: 'past_due' },
      column: 'whop_user_id',
      value: 'whop_user_1',
    });
  });

  it('acknowledges a signed-but-unknown event type (e.g. membership.updated) with 200 and no entitlement writes', async () => {
    const stub = makeSupabaseStub();
    const body = JSON.stringify(whopPayload({ action: 'membership.updated' }));
    const res = await handleWhopWebhookRequest(await signedRequest(body), configFor(stub));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, message: 'Event type not handled' });
    expect(stub.calls.upserts).toHaveLength(0);
    expect(stub.calls.updates).toHaveLength(0);
    expect(stub.calls.inserts.filter((i) => i.table !== 'webhook_events')).toHaveLength(0);
    // Still recorded for idempotency.
    expect(stub.calls.inserts.some((i) => i.table === 'webhook_events')).toBe(true);
  });

  it('verify_token: signature is verified but no action is taken', async () => {
    const stub = makeSupabaseStub();
    const body = JSON.stringify(
      whopPayload({
        action: 'verify_token',
        data: { license_key: 'LK-secret-value', email: 'member@example.test' },
      }),
    );
    const res = await handleWhopWebhookRequest(await signedRequest(body), configFor(stub));
    // A valid signature means the request was authenticated — but the
    // action is deliberately unhandled and must not echo token/license
    // material or PII back.
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true, message: 'Event type not handled' });
    expect(JSON.stringify(json)).not.toContain('LK-secret-value');
    expect(JSON.stringify(json)).not.toContain('member@example.test');
    expect(stub.calls.upserts).toHaveLength(0);
    expect(stub.calls.updates).toHaveLength(0);
  });
});

describe('whop-webhook — idempotency', () => {
  it('replayed delivery returns {status:"duplicate"} and performs a single upsert', async () => {
    const seenEventIds = new Set<string>();
    const stub = makeSupabaseStub(seenEventIds);
    const body = JSON.stringify(whopPayload());

    const first = await handleWhopWebhookRequest(await signedRequest(body), configFor(stub));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ success: true });
    expect(stub.calls.upserts).toHaveLength(1);

    const second = await handleWhopWebhookRequest(await signedRequest(body), configFor(stub));
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ status: 'duplicate' });
    // No second upsert, no second webhook_events insert.
    expect(stub.calls.upserts).toHaveLength(1);
    expect(stub.calls.inserts.filter((i) => i.table === 'webhook_events')).toHaveLength(1);
  });
});

describe('whop-webhook — failure modes', () => {
  it('malformed JSON with a valid signature returns 500, not a stack/echo', async () => {
    const stub = makeSupabaseStub();
    const res = await handleWhopWebhookRequest(
      await signedRequest('{not json'),
      configFor(stub),
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});

// ---------------------------------------------------------------------------
// Source-contract regression guards (kept from the original grep-based suite).
// ---------------------------------------------------------------------------
const HANDLER_SOURCE = readFileSync(
  path.resolve(__dirname, '../../supabase/functions/whop-webhook/handler.ts'),
  'utf8',
);
const INDEX_SOURCE = readFileSync(
  path.resolve(__dirname, '../../supabase/functions/whop-webhook/index.ts'),
  'utf8',
);

describe('whop-webhook — source contracts', () => {
  it('verify_token stays intentionally absent; HMAC check precedes dispatch', () => {
    expect(HANDLER_SOURCE).not.toMatch(/case\s+['"]verify_token['"]/);
    expect(HANDLER_SOURCE).not.toMatch(/action\s*===?\s*['"]verify_token['"]/);

    const verifyIdx = HANDLER_SOURCE.indexOf('verifySignature(rawBody, signature');
    const dispatchIdx = HANDLER_SOURCE.indexOf('switch (payload.action)');
    expect(verifyIdx).toBeGreaterThan(-1);
    expect(dispatchIdx).toBeGreaterThan(verifyIdx);
    expect(HANDLER_SOURCE).toContain("req.headers.get('whop-signature')");
    expect(HANDLER_SOURCE).toContain("message: 'Event type not handled'");
  });

  it('index.ts is a thin bootstrap that delegates to handleWhopWebhookRequest', () => {
    expect(INDEX_SOURCE).toContain('serve(');
    expect(INDEX_SOURCE).toContain('handleWhopWebhookRequest');
    // Crypto/dispatch must not live in the bootstrap file.
    expect(INDEX_SOURCE).not.toContain('crypto.subtle');
    expect(INDEX_SOURCE).not.toContain('switch (payload.action)');
  });
});
