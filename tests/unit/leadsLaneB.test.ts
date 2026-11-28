import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  allowIntakeRequest,
  extractClientIp,
  handleLeadsRequest,
  _resetIntakeRateLimitsForTests,
  INTAKE_MAX_PER_IP_PER_HOUR,
  INTAKE_MAX_GLOBAL_PER_HOUR,
  MAX_INTAKE_BODY_BYTES,
} from '../../netlify/functions/leads';

/**
 * Lane B remediation tests (audit G6/G7): dedup fail-closed semantics,
 * proxy-identity hardening, and the public-write RLS revocation migration.
 * No network: LeadIntakeDeps.fetchImpl fully replaces the Supabase boundary.
 */

const STUB_ENV = {
  SUPABASE_URL: 'https://stub.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'stub-service-key',
  LEAD_INTAKE_ENABLED: 'true',
  LEAD_INTAKE_NOTICE_APPROVED: 'true',
  LEAD_INTAKE_DEDUP_SECRET: 'test-dedup-secret-at-least-32-bytes-long',
} as NodeJS.ProcessEnv;

const GENERIC_SUCCESS = { success: true, message: 'Lead intake stored' };

let ipCounter = 0;
function uniqueIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

let emailCounter = 0;
function uniqueEmail(): string {
  emailCounter += 1;
  return `laneb-lead-${emailCounter}@example.com`;
}

interface StubRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface FetchCall {
  url: string;
  method: string;
  body?: Record<string, unknown>;
}

type StubResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
};

function makeResponse(overrides: Partial<StubResponse> = {}): StubResponse {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => [],
    ...overrides,
  };
}

/**
 * fetchImpl stub. GETs return `getOutcome` (default: empty array — no
 * duplicate); POSTs return `postOutcome` (default: 201) and are recorded.
 * Either outcome may be a Response-like object or a thrown Error.
 */
function makeFetchImpl(
  getOutcome: StubResponse | Error = makeResponse(),
  postOutcome: StubResponse | Error = makeResponse({
    status: 201,
    statusText: 'Created',
    json: async () => ({}),
  }),
) {
  const calls: FetchCall[] = [];
  const fetchImpl = vi.fn(async (url: unknown, init?: StubRequestInit) => {
    const method = init?.method ?? 'GET';
    const call: FetchCall = { url: String(url), method };
    if (init?.body) call.body = JSON.parse(init.body) as Record<string, unknown>;
    calls.push(call);
    const outcome = method === 'GET' ? getOutcome : postOutcome;
    if (outcome instanceof Error) throw outcome;
    return outcome as unknown as Response;
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}

function makeEvent(body: unknown, headers: Record<string, string> = {}) {
  return {
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function makeTrustedEvent(body: unknown, extraHeaders: Record<string, string> = {}) {
  return makeEvent(body, {
    'x-nf-client-connection-ip': uniqueIp(),
    ...extraHeaders,
  });
}

function validSubmission(overrides: Record<string, unknown> = {}) {
  return {
    company_name: 'Acme Energy',
    contact_name: 'Jane Lead',
    email: uniqueEmail(),
    phone: '+1-403-555-0100',
    source_route: '/tier-compliance',
    channel: 'direct',
    segment: 'industrial',
    campaign_id: 'tier-compliance-landing',
    ...overrides,
  };
}

function intakeBody(submission: Record<string, unknown>) {
  return { action: 'intake', submission };
}

beforeEach(() => {
  _resetIntakeRateLimitsForTests();
});

describe('G6: 20261006001_revoke_public_lead_writes.sql drops direct public writes', () => {
  const migrationPath = resolve(
    process.cwd(),
    'supabase/migrations/20261006001_revoke_public_lead_writes.sql',
  );
  const sql = readFileSync(migrationPath, 'utf8');

  it('drops the anon/authenticated insert policy on lead_intake_submissions', () => {
    expect(sql).toContain(
      'DROP POLICY IF EXISTS "anon and authenticated can insert lead_intake_submissions"',
    );
    expect(sql).toMatch(/DROP POLICY IF EXISTS[\s\S]*?ON public\.lead_intake_submissions;/);
  });

  it('revokes INSERT from the public roles as defense in depth', () => {
    expect(sql).toContain('REVOKE INSERT ON public.lead_intake_submissions FROM anon');
    expect(sql).toContain('REVOKE INSERT ON public.lead_intake_submissions FROM authenticated');
  });

  it('leaves the service_role FOR ALL policy intact', () => {
    expect(sql).not.toContain('service role manage lead_intake_submissions');
    expect(sql).not.toMatch(/DROP POLICY[^\n]*service role/i);
  });

  it('documents apply order and owner-gated hosted verification', () => {
    expect(sql).toMatch(/APPLY ORDER/i);
    expect(sql).toMatch(/OWNER-GATED/i);
    expect(sql).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});

describe('dedup-token insert payload', () => {
  it('includes a keyed dedup_token in the insert row and metadata', async () => {
    const { fetchImpl, calls } = makeFetchImpl();
    const res = await handleLeadsRequest(makeTrustedEvent(intakeBody(validSubmission())), {
      fetchImpl,
      env: STUB_ENV,
    });

    expect(res.statusCode).toBe(200);
    const post = calls.find((c) => c.method === 'POST');
    expect(post).toBeDefined();
    expect(post?.body?.dedup_token).toMatch(/^[0-9a-f]{64}$/);
    const metadata = post?.body?.metadata as Record<string, unknown> | undefined;
    expect(metadata?.dedup_token).toBe(post?.body?.dedup_token);
  });
});

describe('dedup check failure fails closed for writes', () => {
  const failureModes: Array<[string, StubResponse | Error]> = [
    ['lookup request throws (DB unreachable)', new Error('connect ECONNREFUSED')],
    [
      'lookup returns non-OK status',
      makeResponse({ ok: false, status: 500, statusText: 'Internal Server Error' }),
    ],
    [
      'lookup returns unreadable/non-array payload',
      makeResponse({ json: async () => ({ message: 'PostgREST proxy error' }) }),
    ],
  ];

  it.each(failureModes)(
    'returns the oracle-safe generic success without writing when %s',
    async (_label, getOutcome) => {
      const { fetchImpl, calls } = makeFetchImpl(getOutcome);
      const res = await handleLeadsRequest(makeTrustedEvent(intakeBody(validSubmission())), {
        fetchImpl,
        env: STUB_ENV,
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual(GENERIC_SUCCESS);
      // Fail closed for writes: no insert was attempted.
      expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0);
    },
  );

  it('does not cache the dedup token on a failed check, so a retry after recovery still writes', async () => {
    const submission = validSubmission();
    const event = makeTrustedEvent(intakeBody(submission));

    const down = makeFetchImpl(new Error('boom'));
    const first = await handleLeadsRequest(event, { fetchImpl: down.fetchImpl, env: STUB_ENV });
    expect(first.statusCode).toBe(200);
    expect(down.calls.filter((c) => c.method === 'POST')).toHaveLength(0);

    const up = makeFetchImpl();
    const second = await handleLeadsRequest(event, { fetchImpl: up.fetchImpl, env: STUB_ENV });
    expect(second.statusCode).toBe(200);
    // The retry was not suppressed by an in-memory dedup entry — it inserted.
    expect(up.calls.filter((c) => c.method === 'POST')).toHaveLength(1);
  });
});

describe('concurrent duplicate submissions hitting the unique index', () => {
  it('treats an insert-side 409 unique conflict as idempotent generic success', async () => {
    const { fetchImpl, calls } = makeFetchImpl(
      makeResponse(),
      makeResponse({ ok: false, status: 409, statusText: 'Conflict', json: async () => ({ code: '23505' }) }),
    );
    const res = await handleLeadsRequest(makeTrustedEvent(intakeBody(validSubmission())), {
      fetchImpl,
      env: STUB_ENV,
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(GENERIC_SUCCESS);
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1);
  });

  it('treats an ambiguous SQLSTATE 23505 under a non-409 status as idempotent success', async () => {
    const { fetchImpl } = makeFetchImpl(
      makeResponse(),
      makeResponse({ ok: false, status: 400, statusText: 'Bad Request', json: async () => ({ code: '23505' }) }),
    );
    const res = await handleLeadsRequest(makeTrustedEvent(intakeBody(validSubmission())), {
      fetchImpl,
      env: STUB_ENV,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(GENERIC_SUCCESS);
  });

  it('two parallel identical submissions yield two generic successes and at most one committed row', async () => {
    let insertAttempts = 0;
    const fetchImpl = vi.fn(async (_url: unknown, init?: StubRequestInit) => {
      if ((init?.method ?? 'GET') === 'GET') {
        return makeResponse({ json: async (): Promise<unknown[]> => [] }) as unknown as Response;
      }
      insertAttempts += 1;
      return insertAttempts === 1
        ? (makeResponse({ status: 201, statusText: 'Created', json: async () => ({}) }) as unknown as Response)
        : (makeResponse({ ok: false, status: 409, statusText: 'Conflict', json: async () => ({ code: '23505' }) }) as unknown as Response);
    });
    const event = makeTrustedEvent(intakeBody(validSubmission()));
    const deps = { fetchImpl: fetchImpl as unknown as typeof fetch, env: STUB_ENV };

    const [first, second] = await Promise.all([
      handleLeadsRequest(event, deps),
      handleLeadsRequest(event, deps),
    ]);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    // Both attempted the insert (check-then-insert race); the unique index —
    // not the response path — is what collapses them to one row.
    expect(insertAttempts).toBe(2);
  });

  it('fails closed with a generic 500 on a non-dedup insert failure', async () => {
    const { fetchImpl } = makeFetchImpl(
      makeResponse(),
      makeResponse({ ok: false, status: 500, statusText: 'Internal Server Error', json: async () => ({ code: 'XX000' }) }),
    );
    const res = await handleLeadsRequest(makeTrustedEvent(intakeBody(validSubmission())), {
      fetchImpl,
      env: STUB_ENV,
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ error: 'Internal server error' });
  });
});

describe('HMAC dedup key absence fails closed', () => {
  it('returns 503 and performs no persistence calls when LEAD_INTAKE_DEDUP_SECRET is missing', async () => {
    const { fetchImpl, calls } = makeFetchImpl();
    const env = { ...STUB_ENV } as NodeJS.ProcessEnv;
    delete env.LEAD_INTAKE_DEDUP_SECRET;

    const res = await handleLeadsRequest(makeTrustedEvent(intakeBody(validSubmission())), {
      fetchImpl,
      env,
    });
    expect(res.statusCode).toBe(503);
    expect(calls).toHaveLength(0);
  });

  it('returns 503 when the dedup secret is below the 32-byte minimum', async () => {
    const { fetchImpl, calls } = makeFetchImpl();
    const res = await handleLeadsRequest(makeTrustedEvent(intakeBody(validSubmission())), {
      fetchImpl,
      env: { ...STUB_ENV, LEAD_INTAKE_DEDUP_SECRET: 'too-short' },
    });
    expect(res.statusCode).toBe(503);
    expect(calls).toHaveLength(0);
  });
});

describe('request-shape abuse controls', () => {
  it('rejects a measured oversized body with 413 and no persistence calls', async () => {
    const { fetchImpl, calls } = makeFetchImpl();
    const oversized = 'x'.repeat(MAX_INTAKE_BODY_BYTES + 1);
    const res = await handleLeadsRequest(makeTrustedEvent(oversized), {
      fetchImpl,
      env: STUB_ENV,
    });
    expect(res.statusCode).toBe(413);
    expect(JSON.parse(res.body)).toEqual({ error: 'Request body too large' });
    expect(calls).toHaveLength(0);
  });

  it('rejects malformed JSON with a generic 400 and no persistence calls', async () => {
    const { fetchImpl, calls } = makeFetchImpl();
    const res = await handleLeadsRequest(makeTrustedEvent('{not valid json,,,'), {
      fetchImpl,
      env: STUB_ENV,
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'Invalid request body' });
    expect(calls).toHaveLength(0);
  });

  it('returns the generic success without writing when a honeypot field is filled', async () => {
    const { fetchImpl, calls } = makeFetchImpl();
    const res = await handleLeadsRequest(
      makeTrustedEvent(intakeBody(validSubmission({ website: 'https://spam.example' }))),
      { fetchImpl, env: STUB_ENV },
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(GENERIC_SUCCESS);
    expect(calls).toHaveLength(0);
  });
});

describe('proxy identity and rate limiting', () => {
  it('extractClientIp trusts only the platform header and rejects spoofed/malformed values', () => {
    // Trusted platform header wins over spoofable XFF.
    expect(
      extractClientIp({
        'x-nf-client-connection-ip': ' 203.0.113.9 ',
        'x-forwarded-for': '1.2.3.4',
      }),
    ).toBe('203.0.113.9');
    // IPv6 / IPv4-mapped tokens are accepted.
    expect(extractClientIp({ 'x-nf-client-connection-ip': '2001:db8::1' })).toBe('2001:db8::1');
    expect(extractClientIp({ 'x-nf-client-connection-ip': '::ffff:10.0.0.1' })).toBe('::ffff:10.0.0.1');
    // Spoofed forwarding headers are never trusted.
    expect(extractClientIp({ 'x-forwarded-for': ' 10.1.2.3 , 10.9.9.9' })).toBe('unknown');
    expect(extractClientIp({ 'x-real-ip': '10.1.2.3', 'client-ip': '10.1.2.3' })).toBe('unknown');
    // Malformed or oversized platform-header values fall back to 'unknown'
    // rather than becoming attacker-chosen bucket keys.
    expect(extractClientIp({ 'x-nf-client-connection-ip': '"><script>' })).toBe('unknown');
    expect(extractClientIp({ 'x-nf-client-connection-ip': 'x'.repeat(65) })).toBe('unknown');
    expect(extractClientIp({})).toBe('unknown');
  });

  it('rate-limits requests that share the fallback bucket regardless of spoofed XFF rotation', async () => {
    const { fetchImpl, calls } = makeFetchImpl();
    const deps = { fetchImpl, env: STUB_ENV };

    // No trusted platform header: every request lands in the shared 'unknown'
    // bucket even though each spoofs a different XFF chain.
    for (let i = 0; i < INTAKE_MAX_PER_IP_PER_HOUR; i += 1) {
      const res = await handleLeadsRequest(
        makeEvent(intakeBody(validSubmission()), {
          'x-forwarded-for': `192.0.2.${i}, 10.0.0.${i}`,
        }),
        deps,
      );
      expect(res.statusCode).toBe(200);
    }

    const throttled = await handleLeadsRequest(
      makeEvent(intakeBody(validSubmission()), { 'x-forwarded-for': '203.0.113.99' }),
      deps,
    );
    expect(throttled.statusCode).toBe(429);
    expect(JSON.parse(throttled.body)).toEqual({ error: 'Too many requests' });
    // The throttled request never reached persistence.
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(INTAKE_MAX_PER_IP_PER_HOUR);
  });

  it('a malformed platform-header value cannot mint a private bucket', async () => {
    const { fetchImpl } = makeFetchImpl();
    const deps = { fetchImpl, env: STUB_ENV };

    // Drain the shared 'unknown' bucket first.
    for (let i = 0; i < INTAKE_MAX_PER_IP_PER_HOUR; i += 1) {
      await handleLeadsRequest(makeEvent(intakeBody(validSubmission())), deps);
    }

    // A garbage platform-header value still resolves to 'unknown', so it is
    // throttled together with the missing-header requests above.
    const res = await handleLeadsRequest(
      makeEvent(intakeBody(validSubmission()), {
        'x-nf-client-connection-ip': 'not-an-ip!!',
      }),
      deps,
    );
    expect(res.statusCode).toBe(429);
  });

  it('throttles a burst from a single trusted IP at the hourly cap', async () => {
    const { fetchImpl } = makeFetchImpl();
    const deps = { fetchImpl, env: STUB_ENV };
    const ip = uniqueIp();

    for (let i = 0; i < INTAKE_MAX_PER_IP_PER_HOUR; i += 1) {
      const res = await handleLeadsRequest(
        makeEvent(intakeBody(validSubmission()), { 'x-nf-client-connection-ip': ip }),
        deps,
      );
      expect(res.statusCode).toBe(200);
    }
    const throttled = await handleLeadsRequest(
      makeEvent(intakeBody(validSubmission()), { 'x-nf-client-connection-ip': ip }),
      deps,
    );
    expect(throttled.statusCode).toBe(429);
  });

  it('enforces the global intake cap across distinct IPs', () => {
    const now = Date.now();
    for (let i = 0; i < INTAKE_MAX_GLOBAL_PER_HOUR; i += 1) {
      expect(allowIntakeRequest(uniqueIp(), now)).toBe(true);
    }
    // Global bucket is exhausted: even a never-seen trusted IP is denied.
    expect(allowIntakeRequest(uniqueIp(), now)).toBe(false);
    expect(allowIntakeRequest('unknown', now)).toBe(false);
  });
});
