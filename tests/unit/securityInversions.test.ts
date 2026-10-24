/**
 * Assertion-inversion proofs for five security properties (auditor gap).
 *
 * Every case crafts input that would pass a NAIVE check — a well-formed
 * three-segment token, a correctly shaped 64-hex signature, a CSV file that
 * exists with the canonical header, a truthy-looking env flag, a
 * schema-valid lead payload — and asserts the real guard still rejects it.
 * Each rejection is paired with a control or call evidence so the assertion
 * cannot be vacuously true.
 *
 * Guards under test:
 *   (a) Whop session — netlify/functions/_shared/utilityConnectorOwner.ts
 *       `verifyWhopSessionToken`: identity comes only from a successful Whop
 *       API response; a forged JWT-shaped token is rejected even when the
 *       verifier path is fully exercised.
 *   (b) whop-webhook HMAC — supabase/functions/whop-webhook/handler.ts:
 *       a tampered body or a secret mismatch rejects before dispatch.
 *   (c) CASL suppression registry — scripts/lib/suppression-registry.mjs
 *       `loadSuppressionRegistry` fails closed on missing consent fields.
 *   (d) stripe-checkout kill-switch —
 *       supabase/functions/stripe-create-checkout-session/handler.ts:
 *       truthy-but-not-exact-'true' flags fail closed before auth/Stripe.
 *   (e) anonymous lead write — direct anon/authenticated PostgREST inserts
 *       into lead_intake_submissions are denied post-migration (real RLS
 *       via PGlite) even for payload the function validator accepts.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

import {
  verifyWhopSessionToken,
  WHOP_VERIFICATION_TARGETS,
} from '../../netlify/functions/_shared/utilityConnectorOwner';
import {
  handleWhopWebhookRequest,
  type WhopSupabaseClient,
  type WhopWebhookConfig,
} from '../../supabase/functions/whop-webhook/handler';
import {
  handleStripeCheckoutRequest,
  type StripeCheckoutConfig,
} from '../../supabase/functions/stripe-create-checkout-session/handler';
import { validateLeadIntakeSubmission } from '../../netlify/functions/leads';

// ---------------------------------------------------------------------------
// (a) Whop session verifier
// ---------------------------------------------------------------------------

function jwtWithPayload(payload: Record<string, unknown>): string {
  const segment = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${segment({ alg: 'HS256', typ: 'JWT' })}.${segment(payload)}.${segment({ sig: 'forged' })}`;
}

describe('inversion: Whop session token verification', () => {
  it('rejects a forged but well-formed JWT even though the verifier path runs end-to-end', async () => {
    // Naive check would accept: three base64url segments, payload parses,
    // carries sub/email/name — everything a shape-only verifier needs.
    const forged = jwtWithPayload({
      sub: 'attacker-controlled-user',
      email: 'attacker@example.test',
      name: 'Forged Member',
      iss: 'https://api.whop.com',
      aud: 'app_whop',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const seenAuthorizations: string[] = [];
    const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
      seenAuthorizations.push(new Headers(init?.headers).get('Authorization') ?? '');
      return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 401 });
    });

    const result = await verifyWhopSessionToken(forged, { fetchImpl, mode: 'live' });

    expect(result.valid).toBe(false);
    expect(result.identity).toBeUndefined();
    // Non-vacuous: the forged token actually travelled to every Whop
    // verification target as a Bearer credential and was still not
    // promoted into identity.
    expect(seenAuthorizations).toHaveLength(WHOP_VERIFICATION_TARGETS.length);
    for (const header of seenAuthorizations) {
      expect(header).toBe(`Bearer ${forged}`);
    }
  });

  it('rejects a forged token even when a naive decode-only verifier would accept it (simulated path)', async () => {
    // In simulated mode the token is decoded locally — but only a payload
    // carrying a provider subject is accepted. A shaped token whose payload
    // is valid JSON yet has no sub/user_id must still fail.
    const noSubject = jwtWithPayload({ email: 'attacker@example.test' });
    const notJson = `header.${Buffer.from('this is not json').toString('base64url')}.sig`;

    for (const token of [noSubject, notJson]) {
      const result = await verifyWhopSessionToken(token, { mode: 'simulated' });
      expect(result.valid).toBe(false);
      expect(result.identity).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// (b) whop-webhook HMAC gate
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = 'whop_test_webhook_secret';

async function signBody(body: string, secret = WEBHOOK_SECRET): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function webhookConfig(createClient: WhopWebhookConfig['createClient'], secret = WEBHOOK_SECRET): WhopWebhookConfig {
  return {
    whopWebhookSecret: secret,
    supabaseUrl: 'https://supabase.example',
    supabaseServiceRoleKey: 'service-role-key',
    productTierMap: { prod_pro_1: 'pro' },
    createClient,
  };
}

function webhookBody(): string {
  return JSON.stringify({
    action: 'membership.went_valid',
    data: {
      id: 'mem_123',
      user_id: 'whop_user_1',
      product_id: 'prod_pro_1',
      status: 'active',
      valid: true,
      created_at: 1_700_000_000,
    },
  });
}

describe('inversion: whop-webhook HMAC signature gate', () => {
  it('rejects a tampered body presented under a real, well-formed signature', async () => {
    // Naive check would accept: the header IS a valid hex HMAC-SHA256 of a
    // genuine Whop-shaped payload — just not of THIS body.
    const createClient = vi.fn((): WhopSupabaseClient => ({ from: () => ({}) }));
    const original = webhookBody();
    const signature = await signBody(original);
    const tampered = original.replace('whop_user_1', 'whop_attacker');

    const res = await handleWhopWebhookRequest(
      new Request('https://functions.example/whop-webhook', {
        method: 'POST',
        headers: { 'whop-signature': signature },
        body: tampered,
      }),
      webhookConfig(createClient),
    );

    expect(res.status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('rejects a correctly formatted signature computed under a mismatched secret', async () => {
    const createClient = vi.fn((): WhopSupabaseClient => ({ from: () => ({}) }));
    const body = webhookBody();
    // Attacker signs with their own secret — format-perfect 64-hex output.
    const forgedSignature = await signBody(body, 'attacker_controlled_secret');

    const res = await handleWhopWebhookRequest(
      new Request('https://functions.example/whop-webhook', {
        method: 'POST',
        headers: { 'whop-signature': `v1=${forgedSignature}` },
        body,
      }),
      webhookConfig(createClient),
    );

    expect(res.status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (c) CASL suppression registry — fail closed on missing consent fields
// ---------------------------------------------------------------------------

interface SuppressionRegistryResult {
  ok: boolean;
  schema: string | null;
  failures: string[];
  isSuppressed: (label: string) => boolean;
  suppressionDateFor: (label: string) => string | null;
}
interface SuppressionRegistryModule {
  loadSuppressionRegistry: (repoRoot: string, filePath: string) => SuppressionRegistryResult;
}

let loadSuppressionRegistry: SuppressionRegistryModule['loadSuppressionRegistry'];
const tempRoots: string[] = [];

function makeRegistryRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-suppression-'));
  tempRoots.push(root);
  return root;
}

function writeRegistry(root: string, csv: string): string {
  const filePath = path.join(root, 'registry.csv');
  writeFileSync(filePath, csv, 'utf8');
  return filePath;
}

const LIVE_HEADER = 'email,domain,reason,source,suppressed_at,suppressed_by';
const LEGACY_HEADER = 'target_label,suppression_date,source_row,reason';

beforeAll(async () => {
  // scripts/lib is untyped .mjs; a non-literal specifier keeps tsc from
  // requiring declarations while vite-node resolves the file URL at runtime.
  const module = (await import(
    /* @vite-ignore */ new URL('../../scripts/lib/suppression-registry.mjs', import.meta.url).href
  )) as unknown as SuppressionRegistryModule;
  loadSuppressionRegistry = module.loadSuppressionRegistry;
});

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('inversion: CASL suppression registry fail-closed', () => {
  it('fails closed when the registry file is absent', () => {
    const root = makeRegistryRoot();
    const result = loadSuppressionRegistry(root, path.join(root, 'does-not-exist.csv'));
    expect(result.ok).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.isSuppressed('anyone@example.test')).toBe(false);
  });

  it('rejects a canonical-header registry whose rows drop consent fields', () => {
    const root = makeRegistryRoot();
    // Naive check would accept: file exists, readable, header is the exact
    // canonical live schema. Rows omit the CASL consent basis (`reason`),
    // carry an invalid suppressed_at, or name no suppressible identity.
    const csv = [
      LIVE_HEADER,
      'person@example.test,,,outreach-response-log row 7,2026-10-01,owner',
      ',,unsubscribe,outreach-response-log row 8,2026-10-02,owner',
      'other@example.test,,owner_suppression,outreach-response-log row 9,99/99/9999,owner',
    ].join('\n');
    const result = loadSuppressionRegistry(root, writeRegistry(root, csv));

    expect(result.ok).toBe(false);
    expect(result.failures.join('\n')).toMatch(/row 2:.*reason is required/);
    expect(result.failures.join('\n')).toMatch(/row 3:.*email or domain is required/);
    expect(result.failures.join('\n')).toMatch(/row 4:.*suppressed_at must be a valid/);
  });

  it('rejects a legacy-schema row with an out-of-vocabulary suppression reason', () => {
    const root = makeRegistryRoot();
    // target_label passes the handle shape; the reason is a plausible word
    // that is NOT in SUPPRESSION_REASONS — a vocabulary check a naive
    // "has a value" test would pass.
    const csv = [LEGACY_HEADER, 'acme-corp,2026-10-05,12,marketing-do-not-contact'].join('\n');
    const result = loadSuppressionRegistry(root, writeRegistry(root, csv));

    expect(result.ok).toBe(false);
    expect(result.failures.join('\n')).toMatch(/reason must be one of/);
  });

  it('control: a fully populated registry loads and suppresses the identity', () => {
    const root = makeRegistryRoot();
    const csv = [
      LIVE_HEADER,
      'person@example.test,,unsubscribe,outreach-response-log row 7,2026-10-01,owner',
    ].join('\n');
    const result = loadSuppressionRegistry(root, writeRegistry(root, csv));

    expect(result.ok).toBe(true);
    expect(result.schema).toBe('live-identity');
    expect(result.isSuppressed('person@example.test')).toBe(true);
    expect(result.suppressionDateFor('PERSON@example.test')).toBe('2026-10-01');
  });
});

// ---------------------------------------------------------------------------
// (d) stripe-checkout kill-switch — fail closed on non-exact flags
// ---------------------------------------------------------------------------

type DenoStub = { env: { get(name: string): string | undefined } };
const originalDeno = (globalThis as typeof globalThis & { Deno?: DenoStub }).Deno;

function stripeConfig(overrides: Partial<StripeCheckoutConfig> = {}): StripeCheckoutConfig {
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
      throw new Error('Stripe must never be reached while a gate is closed');
    }),
    verifyBearerToken: vi.fn(async () => ({ id: 'user_1', email: 'buyer@example.test' })),
    ...overrides,
  };
}

function checkoutRequest(): Request {
  return new Request('https://functions.example/stripe-create-checkout-session', {
    method: 'POST',
    headers: { Authorization: 'Bearer plausible-looking-token' },
    body: JSON.stringify({ tier: 'pro' }),
  });
}

describe('inversion: stripe-checkout kill-switch', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { Deno?: DenoStub }).Deno = {
      env: { get: () => undefined },
    };
  });
  afterAll(() => {
    (globalThis as typeof globalThis & { Deno?: DenoStub }).Deno = originalDeno;
  });

  it.each([
    ['unset', undefined],
    ['empty string', ''],
    ['uppercase TRUE', 'TRUE'],
    ['numeric 1', '1'],
    ['yes', 'yes'],
    ['true with trailing space', 'true '],
  ])('returns 403 checkout_disabled for a truthy-looking flag %s — before auth or Stripe', async (_label, flag) => {
    // Naive check would accept: every value above is JavaScript-truthy (or
    // plausible operator intent) — only the exact string 'true' may pass.
    const config = stripeConfig({ checkoutEnabled: flag });
    const res = await handleStripeCheckoutRequest(checkoutRequest(), config);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'checkout_disabled' });
    expect(config.fetchImpl).not.toHaveBeenCalled();
    expect(config.verifyBearerToken).not.toHaveBeenCalled();
  });

  it('returns 503 when the outer flag is exactly true but the legacy inner gate is missing', async () => {
    const config = stripeConfig({ stripeCheckoutEnabled: undefined });
    const res = await handleStripeCheckoutRequest(checkoutRequest(), config);

    expect(res.status).toBe(503);
    expect(config.fetchImpl).not.toHaveBeenCalled();
    expect(config.verifyBearerToken).not.toHaveBeenCalled();
  });

  it('never reaches Stripe for an authenticated request when the price allowlist is unconfigured', async () => {
    // Both flags exactly 'true', bearer token verifies — but no price id is
    // configured for the tier, so the allowlist lookup fails closed.
    const config = stripeConfig({ priceEdubiz: '', pricePro: '' });
    const res = await handleStripeCheckoutRequest(checkoutRequest(), config);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Stripe price not configured for tier pro' });
    expect(config.verifyBearerToken).toHaveBeenCalledOnce();
    expect(config.fetchImpl).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (e) anonymous lead write denial — real Postgres RLS via PGlite
// ---------------------------------------------------------------------------

const LEAD_BASE_SQL = `
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE FUNCTION auth.role() RETURNS text AS $$
    SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon')::text;
  $$ LANGUAGE sql STABLE;

  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN;

  CREATE TABLE IF NOT EXISTS public.lead_intake_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    team_size TEXT,
    industry TEXT,
    message TEXT,
    source_route TEXT NOT NULL DEFAULT '/enterprise',
    channel TEXT NOT NULL DEFAULT 'direct',
    segment TEXT NOT NULL DEFAULT 'consultancy',
    campaign_id TEXT NOT NULL DEFAULT 'enterprise_2026q1',
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'qualified', 'disqualified', 'contacted')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE public.lead_intake_submissions ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "service role manage lead_intake_submissions"
    ON public.lead_intake_submissions FOR ALL
    USING (auth.role() = 'service_role');

  GRANT INSERT ON public.lead_intake_submissions TO anon, authenticated;
  CREATE POLICY "anon and authenticated can insert lead_intake_submissions"
    ON public.lead_intake_submissions FOR INSERT
    WITH CHECK (auth.role() IN ('anon', 'authenticated', 'service_role'));

  GRANT ALL ON public.lead_intake_submissions TO service_role;
`;

const LEAD_MIGRATION_SQL = readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20261006001_revoke_public_lead_writes.sql'),
  'utf8',
);

async function tryLeadInsertAs(db: PGlite, role: 'anon' | 'authenticated' | 'service_role') {
  await db.query(`SET request.jwt.claim.role = '${role}'`);
  await db.query(`SET ROLE ${role}`);
  try {
    await db.query(
      `INSERT INTO public.lead_intake_submissions
         (contact_name, email, source_route, segment, campaign_id)
       VALUES ('Audit Probe', 'probe@example.test', '/enterprise', 'consultancy', 'enterprise_2026q1')`,
    );
    return { allowed: true, error: '' };
  } catch (error) {
    return { allowed: false, error: String(error) };
  } finally {
    await db.query('RESET ROLE');
    await db.query('RESET request.jwt.claim.role');
  }
}

describe('inversion: anonymous direct lead writes are denied by RLS', () => {
  it('denies a fully schema-valid insert as anon/authenticated while service_role still writes', async () => {
    // The payload is deliberately crafted to pass the netlify/leads.ts
    // validator — every required field present, valid email, lengths inside
    // bounds — so "the input is well-formed" cannot be the reason for denial.
    const naivePayload = {
      contact_name: 'Audit Probe',
      email: 'probe@example.test',
      source_route: '/enterprise',
      segment: 'consultancy',
      campaign_id: 'enterprise_2026q1',
    };
    const validation = validateLeadIntakeSubmission(naivePayload);
    expect(validation.ok).toBe(true);

    const db = new PGlite();
    try {
      await db.exec(LEAD_BASE_SQL);
      await db.exec(LEAD_MIGRATION_SQL);

      const anon = await tryLeadInsertAs(db, 'anon');
      const authed = await tryLeadInsertAs(db, 'authenticated');
      expect(anon.allowed).toBe(false);
      expect(authed.allowed).toBe(false);
      expect(anon.error).toMatch(/permission denied|row-level security|violates/i);

      // Control: the table itself is writable — denial is role-based, not a
      // broken fixture.
      const service = await tryLeadInsertAs(db, 'service_role');
      expect(service.allowed).toBe(true);
    } finally {
      await db.close();
    }
  });
});
