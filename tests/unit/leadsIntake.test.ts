import { describe, expect, it, vi } from 'vitest';
import {
  computeLeadIntakeDedupToken,
  extractClientIp,
  allowIntakeRequest,
  _resetIntakeRateLimitsForTests,
  handleLeadsRequest,
  hasHoneypotValue,
  validateLeadIntakeSubmission,
  INTAKE_MAX_PER_IP_PER_HOUR,
  INTAKE_MAX_GLOBAL_PER_HOUR,
  MAX_INTAKE_BODY_BYTES,
} from '../../netlify/functions/leads';
import { buildLeadIntakePayload } from '../../src/lib/leadIntake';

/**
 * Stubbed-persistence tests for the public lead intake handler (audit G6/G7).
 * No network: LeadIntakeDeps.fetchImpl fully replaces the Supabase boundary.
 */

const STUB_ENV = {
  SUPABASE_URL: 'https://stub.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'stub-service-key',
  LEAD_INTAKE_ENABLED: 'true',
  LEAD_INTAKE_NOTICE_APPROVED: 'true',
  LEAD_INTAKE_DEDUP_SECRET: 'test-dedup-secret-at-least-32-bytes-long',
} as NodeJS.ProcessEnv;

let ipCounter = 0;
function uniqueIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

let emailCounter = 0;
function uniqueEmail(): string {
  emailCounter += 1;
  return `lead-${emailCounter}@example.com`;
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

/**
 * fetchImpl stub: GETs (dedup select) return `getRows`; POSTs (insert) are
 * recorded and return a minimal-PostgREST-style success.
 */
function makeFetchImpl(getRows: unknown[] = []) {
  const calls: FetchCall[] = [];
  const fetchImpl = vi.fn(async (url: unknown, init?: StubRequestInit) => {
    const method = init?.method ?? 'GET';
    const call: FetchCall = { url: String(url), method };
    if (init?.body) call.body = JSON.parse(init.body) as Record<string, unknown>;
    calls.push(call);
    if (method === 'GET') {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => getRows,
      } as unknown as Response;
    }
    return {
      ok: true,
      status: 201,
      statusText: 'Created',
      json: async () => ({}),
    } as unknown as Response;
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}

function makeEvent(body: unknown, headers: Record<string, string> = {}) {
  const trustedIp =
    headers['x-nf-client-connection-ip'] ?? headers['x-forwarded-for']?.split(',')[0] ?? uniqueIp();
  return {
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-nf-client-connection-ip': trustedIp,
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function validSubmission(overrides: Record<string, unknown> = {}) {
  return {
    company_name: 'Acme Energy',
    contact_name: 'Jane Lead',
    email: uniqueEmail(),
    phone: '+1-403-555-0100',
    team_size: '50',
    industry: 'industrial',
    message: 'Interested in TIER compliance.',
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

describe('handleLeadsRequest — lead intake pipeline', () => {
  it('accepts a valid submission and inserts exactly one row', async () => {
    const { fetchImpl, calls } = makeFetchImpl([]);
    const res = await handleLeadsRequest(makeEvent(intakeBody(validSubmission())), {
      fetchImpl,
      env: STUB_ENV,
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ success: true, message: 'Lead intake stored' });

    const gets = calls.filter((c) => c.method === 'GET');
    const posts = calls.filter((c) => c.method === 'POST');
    expect(gets).toHaveLength(1); // dedup select-before-insert
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toContain('/rest/v1/lead_intake_submissions');
    expect(posts[0].body?.contact_name).toBe('Jane Lead');
    expect(gets[0].url).toContain('created_at=gte.');
  });

  it('drops unknown submission fields instead of persisting them', async () => {
    const { fetchImpl, calls } = makeFetchImpl([]);
    const res = await handleLeadsRequest(
      makeEvent(intakeBody(validSubmission({ is_admin: true, role: 'superuser' }))),
      { fetchImpl, env: STUB_ENV },
    );

    expect(res.statusCode).toBe(200);
    const post = calls.find((c) => c.method === 'POST');
    expect(post).toBeDefined();
    expect(post?.body).not.toHaveProperty('is_admin');
    expect(post?.body).not.toHaveProperty('role');
  });

  it('rejects an oversized body with 413 before parsing (measured size)', async () => {
    const { fetchImpl, calls } = makeFetchImpl([]);
    const oversized = 'x'.repeat(MAX_INTAKE_BODY_BYTES + 1);
    const res = await handleLeadsRequest(makeEvent(oversized), {
      fetchImpl,
      env: STUB_ENV,
    });

    expect(res.statusCode).toBe(413);
    expect(JSON.parse(res.body)).toEqual({ error: 'Request body too large' });
    expect(calls).toHaveLength(0);
  });

  it('rejects an oversized declared Content-Length with 413 even if body is small', async () => {
    const { fetchImpl } = makeFetchImpl([]);
    const res = await handleLeadsRequest(
      makeEvent(intakeBody(validSubmission()), {
        'content-length': String(MAX_INTAKE_BODY_BYTES + 1),
      }),
      { fetchImpl, env: STUB_ENV },
    );
    expect(res.statusCode).toBe(413);
  });

  it('rejects a malformed email with a generic 400', async () => {
    const { fetchImpl, calls } = makeFetchImpl([]);
    const res = await handleLeadsRequest(
      makeEvent(intakeBody(validSubmission({ email: 'not-an-email' }))),
      { fetchImpl, env: STUB_ENV },
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'Invalid lead intake submission' });
    expect(calls).toHaveLength(0);
  });

  it('rejects submissions missing required fields with a generic 400', async () => {
    const { fetchImpl, calls } = makeFetchImpl([]);
    const submission = validSubmission();
    delete (submission as Record<string, unknown>).campaign_id;

    const res = await handleLeadsRequest(makeEvent(intakeBody(submission)), {
      fetchImpl,
      env: STUB_ENV,
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'Invalid lead intake submission' });
    expect(calls).toHaveLength(0);
  });

  it('returns generic success without inserting when a honeypot field is filled', async () => {
    for (const trapField of ['website', 'company_url']) {
      const { fetchImpl, calls } = makeFetchImpl([]);
      const res = await handleLeadsRequest(
        makeEvent(intakeBody(validSubmission({ [trapField]: 'https://spam.example' }))),
        { fetchImpl, env: STUB_ENV },
      );

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ success: true, message: 'Lead intake stored' });
      expect(calls).toHaveLength(0); // no dedup select, no insert
    }
  });

  it('deduplicates an identical resubmission via the persistence select', async () => {
    const { fetchImpl, calls } = makeFetchImpl([{ id: 'existing-row' }]);
    const submission = validSubmission();

    const res = await handleLeadsRequest(makeEvent(intakeBody(submission)), {
      fetchImpl,
      env: STUB_ENV,
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ success: true, message: 'Lead intake stored' });
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0);
  });

  it('deduplicates a repeat submission in-memory without a second DB round-trip', async () => {
    const { fetchImpl, calls } = makeFetchImpl([]);
    const ip = uniqueIp();
    const submission = validSubmission();

    const first = await handleLeadsRequest(
      makeEvent(intakeBody(submission), { 'x-forwarded-for': ip }),
      { fetchImpl, env: STUB_ENV },
    );
    const second = await handleLeadsRequest(
      makeEvent(intakeBody({ ...submission, message: 'changed message but same intent' }), {
        'x-forwarded-for': ip,
      }),
      { fetchImpl, env: STUB_ENV },
    );

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    // One dedup select + one insert total; the repeat was served from cache.
    expect(calls.filter((c) => c.method === 'GET')).toHaveLength(1);
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1);
  });

  it('returns idempotent success when concurrent duplicate inserts hit the unique index', async () => {
    _resetIntakeRateLimitsForTests();
    let insertAttempts = 0;
    const fetchImpl = vi.fn(async (_url: unknown, init?: StubRequestInit) => {
      if ((init?.method ?? 'GET') === 'GET') {
        return { ok: true, status: 200, statusText: 'OK', json: async (): Promise<unknown[]> => [] } as unknown as Response;
      }
      insertAttempts += 1;
      return insertAttempts === 1
        ? { ok: true, status: 201, statusText: 'Created', json: async () => ({}) } as unknown as Response
        : { ok: false, status: 409, statusText: 'Conflict', json: async () => ({ code: '23505' }) } as unknown as Response;
    });
    const submission = validSubmission();
    const event = makeEvent(intakeBody(submission), { 'x-nf-client-connection-ip': uniqueIp() });
    const deps = { fetchImpl: fetchImpl as unknown as typeof fetch, env: STUB_ENV };

    const [first, second] = await Promise.all([
      handleLeadsRequest(event, deps),
      handleLeadsRequest(event, deps),
    ]);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(insertAttempts).toBe(2);
    _resetIntakeRateLimitsForTests();
  });

  it('throttles a single IP to the hourly bucket and returns 429', async () => {
    const { fetchImpl } = makeFetchImpl([]);
    const ip = uniqueIp();
    const deps = { fetchImpl, env: STUB_ENV };

    for (let i = 0; i < INTAKE_MAX_PER_IP_PER_HOUR; i += 1) {
      const res = await handleLeadsRequest(
        makeEvent(intakeBody(validSubmission()), { 'x-forwarded-for': ip }),
        deps,
      );
      expect(res.statusCode).toBe(200);
    }

    const throttled = await handleLeadsRequest(
      makeEvent(intakeBody(validSubmission()), { 'x-forwarded-for': ip }),
      deps,
    );
    expect(throttled.statusCode).toBe(429);
    expect(JSON.parse(throttled.body)).toEqual({ error: 'Too many requests' });

    // A different IP is unaffected by the first IP's exhausted bucket.
    const otherIp = await handleLeadsRequest(
      makeEvent(intakeBody(validSubmission()), { 'x-forwarded-for': uniqueIp() }),
      deps,
    );
    expect(otherIp.statusCode).toBe(200);
  });

  it('does not let a rate-limited IP consume the last shared quota slot', () => {
    _resetIntakeRateLimitsForTests();
    const now = Date.now();
    const cappedIp = uniqueIp();

    for (let i = 0; i < INTAKE_MAX_PER_IP_PER_HOUR; i += 1) {
      expect(allowIntakeRequest(cappedIp, now)).toBe(true);
    }
    for (let i = 0; i < INTAKE_MAX_GLOBAL_PER_HOUR - INTAKE_MAX_PER_IP_PER_HOUR - 1; i += 1) {
      expect(allowIntakeRequest(uniqueIp(), now)).toBe(true);
    }

    expect(allowIntakeRequest(cappedIp, now)).toBe(false);
    expect(allowIntakeRequest(uniqueIp(), now)).toBe(true);
    _resetIntakeRateLimitsForTests();
  });

  it('fails closed when live-intake approval or the deduplication secret is missing', async () => {
    const { fetchImpl, calls } = makeFetchImpl([]);
    const event = makeEvent(intakeBody(validSubmission()));

    const disabled = await handleLeadsRequest(event, {
      fetchImpl,
      env: { ...STUB_ENV, LEAD_INTAKE_ENABLED: 'false' },
    });
    const unapproved = await handleLeadsRequest(event, {
      fetchImpl,
      env: { ...STUB_ENV, LEAD_INTAKE_NOTICE_APPROVED: 'false' },
    });
    const missingSecret = await handleLeadsRequest(event, {
      fetchImpl,
      env: { ...STUB_ENV, LEAD_INTAKE_DEDUP_SECRET: '' },
    });

    expect(disabled.statusCode).toBe(503);
    expect(unapproved.statusCode).toBe(503);
    expect(missingSecret.statusCode).toBe(503);
    expect(calls).toHaveLength(0);
  });
});

describe('validateLeadIntakeSubmission', () => {
  it('passes a fully populated valid submission', () => {
    const result = validateLeadIntakeSubmission(validSubmission());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.submission.contact_name).toBe('Jane Lead');
      expect(result.submission.email).toBe(result.submission.email.toLowerCase());
    }
  });

  it('rejects non-string field types and nulls on required fields', () => {
    expect(validateLeadIntakeSubmission(validSubmission({ email: 42 })).ok).toBe(false);
    expect(validateLeadIntakeSubmission(validSubmission({ contact_name: null })).ok).toBe(false);
    expect(validateLeadIntakeSubmission(validSubmission({ contact_name: ['Jane'] })).ok).toBe(
      false,
    );
  });

  it('rejects over-length fields', () => {
    expect(
      validateLeadIntakeSubmission(validSubmission({ contact_name: 'n'.repeat(201) })).ok,
    ).toBe(false);
    expect(
      validateLeadIntakeSubmission(validSubmission({ message: 'm'.repeat(2001) })).ok,
    ).toBe(false);
    expect(
      validateLeadIntakeSubmission(validSubmission({ campaign_id: 'c'.repeat(101) })).ok,
    ).toBe(false);
  });

  it('rejects non-object metadata and oversized metadata', () => {
    expect(validateLeadIntakeSubmission(validSubmission({ metadata: ['a'] })).ok).toBe(false);
    expect(
      validateLeadIntakeSubmission(
        validSubmission({ metadata: { blob: 'x'.repeat(5000) } }),
      ).ok,
    ).toBe(false);
  });

  it('keeps allowlisted primitive metadata and strips facility/unknown values unless pilot_request is true', () => {
    const facilityMeta = {
      annual_emissions: 50000,
      benchmark_exceedance: 12,
      direct_invest_capex: 250000,
      compliance_year: 2027,
      facility_size_mw: 4,
      client_count: '7',
      nested: { secret: 'drop-me' },
      arbitrary_text: 'drop-me',
    };

    const contactOnly = validateLeadIntakeSubmission(
      validSubmission({ metadata: { ...facilityMeta, pilot_request: false } }),
    );
    expect(contactOnly.ok).toBe(true);
    if (contactOnly.ok) {
      expect(contactOnly.submission.metadata).toEqual({ client_count: '7' });
    }

    const pilot = validateLeadIntakeSubmission(
      validSubmission({ metadata: { ...facilityMeta, pilot_request: true } }),
    );
    expect(pilot.ok).toBe(true);
    if (pilot.ok) {
      expect(pilot.submission.metadata).toEqual({
        annual_emissions: 50000,
        benchmark_exceedance: 12,
        direct_invest_capex: 250000,
        compliance_year: 2027,
        client_count: '7',
        pilot_request: true,
      });
    }
  });
});

describe('computeLeadIntakeDedupToken', () => {
  const base = {
    email: 'Lead@Example.com',
    segment: 'industrial',
    campaign_id: 'c1',
    source_route: '/tier',
  };

  it('is stable across email case and identical within a day', () => {
    const now = new Date('2026-09-01T12:00:00Z');
    const secret = 'test-dedup-secret-at-least-32-bytes-long';
    const a = computeLeadIntakeDedupToken(base, secret, now);
    const b = computeLeadIntakeDedupToken({ ...base, email: 'lead@example.com' }, secret, now);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes across day buckets and across intent', () => {
    const secret = 'test-dedup-secret-at-least-32-bytes-long';
    const a = computeLeadIntakeDedupToken(base, secret, new Date('2026-09-01T12:00:00Z'));
    const nextDay = computeLeadIntakeDedupToken(base, secret, new Date('2026-09-02T12:00:00Z'));
    const otherCampaign = computeLeadIntakeDedupToken(
      { ...base, campaign_id: 'c2' },
      secret,
      new Date('2026-09-01T12:00:00Z'),
    );
    const otherSecret = computeLeadIntakeDedupToken(
      base,
      'a-different-dedup-secret-that-is-32-bytes-or-longer',
      new Date('2026-09-01T12:00:00Z'),
    );
    expect(a).not.toBe(nextDay);
    expect(a).not.toBe(otherCampaign);
    expect(a).not.toBe(otherSecret);
  });

  it('rejects a deduplication secret that is too short', () => {
    expect(() => computeLeadIntakeDedupToken(base, 'short-secret')).toThrow(/at least 32 bytes/);
  });
});

describe('extractClientIp and hasHoneypotValue', () => {
  it('uses the Netlify client IP header and ignores caller-controlled IP headers', () => {
    expect(
      extractClientIp({ 'x-nf-client-connection-ip': '203.0.113.9', 'x-forwarded-for': '1.2.3.4' }),
    ).toBe('203.0.113.9');
    expect(extractClientIp({ 'X-Forwarded-For': ' 10.1.2.3 , 10.9.9.9' })).toBe('unknown');
    expect(extractClientIp({ 'client-ip': '10.1.2.3' })).toBe('unknown');
    expect(extractClientIp({})).toBe('unknown');
  });

  it('detects filled honeypot fields only when non-empty', () => {
    expect(hasHoneypotValue({ website: 'http://x' })).toBe(true);
    expect(hasHoneypotValue({ company_url: ' y ' })).toBe(true);
    expect(hasHoneypotValue({ website: '   ' })).toBe(false);
    expect(hasHoneypotValue({ company_name: 'Acme' })).toBe(false);
    expect(hasHoneypotValue('nope')).toBe(false);
  });
});

describe('buildLeadIntakePayload — client payload minimization (G7)', () => {
  const baseSubmission = {
    company_name: 'Acme Energy',
    contact_name: 'Jane Lead',
    email: 'jane@example.com',
    source_route: '/roi-calculator',
    channel: 'direct' as const,
    segment: 'industrial',
    campaign_id: 'roi_calculator_2026q1',
  };

  const facilityMetadata = {
    annual_emissions: 50000,
    benchmark_exceedance: 12.5,
    direct_invest_capex: 250000,
    compliance_year: 2027,
    scenario: 'direct_investment',
    facility_load_mw: 4,
    nested: { private: true },
  };

  it('strips facility-level fields from contact-only submissions', () => {
    const payload = buildLeadIntakePayload({
      ...baseSubmission,
      metadata: { ...facilityMetadata, pilot_request: false, lead_type: 'report' },
    });

    const metadata = payload.metadata as Record<string, unknown>;
    expect(metadata).toEqual({ lead_type: 'report' });
    expect(metadata).not.toHaveProperty('pilot_request');
    expect(metadata).not.toHaveProperty('annual_emissions');
  });

  it('retains facility-level fields only when pilot_request is true', () => {
    const payload = buildLeadIntakePayload({
      ...baseSubmission,
      metadata: { ...facilityMetadata, pilot_request: true },
    });
    expect(payload.metadata).toEqual({
      annual_emissions: 50000,
      benchmark_exceedance: 12.5,
      direct_invest_capex: 250000,
      compliance_year: 2027,
      pilot_request: true,
    });
  });

  it('honors the options.pilotRequest opt-in flag', () => {
    const payload = buildLeadIntakePayload(
      { ...baseSubmission, metadata: facilityMetadata },
      { pilotRequest: true },
    );
    expect(payload.metadata).toEqual({
      annual_emissions: 50000,
      benchmark_exceedance: 12.5,
      direct_invest_capex: 250000,
      compliance_year: 2027,
      pilot_request: true,
    });
  });

  it('produces a payload the server schema accepts', () => {
    const payload = buildLeadIntakePayload({
      ...baseSubmission,
      metadata: { ...facilityMetadata, pilot_request: true },
    });
    const result = validateLeadIntakeSubmission(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.submission.metadata).toEqual({
        annual_emissions: 50000,
        benchmark_exceedance: 12.5,
        direct_invest_capex: 250000,
        compliance_year: 2027,
        pilot_request: true,
      });
    }
  });
});
