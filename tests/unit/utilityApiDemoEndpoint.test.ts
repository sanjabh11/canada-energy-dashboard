import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleUtilityApiDemoRequest } from '../../supabase/functions/_shared/utilityApiDemoEndpoint';

type AuthorizationRow = {
  id: string;
  operator_user_id: string;
  operator_email: string;
  scenario: string;
  utility: string;
  referral: string | null;
  authorization_uid: string | null;
  meter_uids: string[];
  last_stage: string | null;
  last_status: string | null;
  started_at: string;
  last_polled_at: string | null;
  last_synced_at: string | null;
  revoked_at: string | null;
  last_error: string | null;
  created_at?: string;
  updated_at?: string;
};

describe('utilityApiDemoEndpoint', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { Deno?: { env: { get: (key: string) => string | undefined } } }).Deno = {
      env: {
        get: () => undefined,
      },
    };
  });

  afterEach(() => {
    delete (globalThis as typeof globalThis & { Deno?: unknown }).Deno;
  });

  it('returns 403 when live mode is disabled', async () => {
    const response = await handleUtilityApiDemoRequest(makeRequest({ action: 'start_demo' }), {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      liveEnabled: false,
      operatorEmailAllowlist: 'ops@example.com',
      logUsage: async () => {},
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: 'live_disabled',
    });
  });

  it('returns 401 when the operator bearer token is missing', async () => {
    const response = await handleUtilityApiDemoRequest(makeRequest(
      { action: 'start_demo' },
      { omitAuthorization: true },
    ), {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      liveEnabled: true,
      operatorEmailAllowlist: 'ops@example.com',
      supabase: {
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
      },
      logUsage: async () => {},
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      code: 'missing_operator_token',
    });
  });

  it('returns 403 when the authenticated operator is not allowlisted', async () => {
    const response = await handleUtilityApiDemoRequest(makeRequest({ action: 'start_demo' }), {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      liveEnabled: true,
      operatorEmailAllowlist: 'ops@example.com',
      supabase: {
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: 'op-1',
                email: 'outside@example.com',
              },
            },
            error: null,
          }),
        },
      },
      logUsage: async () => {},
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: 'operator_not_allowlisted',
    });
  });

  it('returns 429 with standard rate-limit headers when the distributed limiter denies the request', async () => {
    const response = await handleUtilityApiDemoRequest(makeRequest({ action: 'start_demo' }), {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      liveEnabled: true,
      operatorEmailAllowlist: 'ops@example.com',
      authenticateOperator: async () => ({
        operator: { userId: 'op-1', email: 'ops@example.com' },
        status: 200,
        body: null,
      }),
      supabase: {},
      rateLimiter: {
        check: async () => ({
          allowed: false,
          operator: { allowed: false, remaining: 0, limit: 2, resetAt: 1_717_171_710_000, scope: 'operator' },
          ip: { allowed: true, remaining: 5, limit: 10, resetAt: 1_717_171_710_000, scope: 'ip' },
          effective: { allowed: false, remaining: 0, limit: 2, resetAt: 1_717_171_710_000, scope: 'operator' },
        }),
      },
      logUsage: async () => {},
    });

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeTruthy();
    expect(response.headers.get('X-RateLimit-Limit')).toBe('2');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(await response.json()).toMatchObject({
      code: 'rate_limit_exceeded',
    });
  });

  it('fails closed with 503 when the distributed limiter throws', async () => {
    const response = await handleUtilityApiDemoRequest(makeRequest({ action: 'poll_demo', authorization_uid: 'auth-1' }), {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      liveEnabled: true,
      operatorEmailAllowlist: 'ops@example.com',
      authenticateOperator: async () => ({
        operator: { userId: 'op-1', email: 'ops@example.com' },
        status: 200,
        body: null,
      }),
      supabase: {},
      rateLimiter: {
        check: async () => {
          throw new Error('redis unavailable');
        },
      },
      logUsage: async () => {},
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: 'rate_limiter_failed',
    });
  });

  it('reuses an existing operator authorization instead of creating a new DEMO start', async () => {
    const store = createAuthorizationStore([
      buildAuthorizationRow({
        id: 'existing-row',
        operator_user_id: 'op-1',
        operator_email: 'ops@example.com',
        scenario: 'commercial',
        utility: 'DEMO',
        referral: 'demo-referral',
        authorization_uid: 'auth-reuse-1',
        meter_uids: ['meter-1'],
        last_stage: 'meters_discovered',
        last_status: 'active',
      }),
    ]);
    let startSubmitCalled = false;

    const response = await handleUtilityApiDemoRequest(makeRequest({ action: 'start_demo' }), {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      liveEnabled: true,
      operatorEmailAllowlist: 'ops@example.com',
      supabase: store.supabase,
      authenticateOperator: async () => ({
        operator: { userId: 'op-1', email: 'ops@example.com' },
        status: 200,
        body: null,
      }),
      rateLimiter: allowRateLimiter(),
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes('/test-submit')) {
          startSubmitCalled = true;
          return jsonResponse({ referral: 'fresh-referral' });
        }
        if (url.includes('/api/v2/authorizations/auth-reuse-1')) {
          return jsonResponse({
            uid: 'auth-reuse-1',
            utility: 'DEMO',
            is_test: true,
            user_status: 'active',
            meters: [
              {
                uid: 'meter-1',
                interval_count: 96,
                bill_count: 3,
                status: 'complete',
              },
            ],
          });
        }
        throw new Error(`Unexpected fetch URL: ${url}`);
      },
      logUsage: async () => {},
    });

    expect(response.status).toBe(200);
    expect(startSubmitCalled).toBe(false);
    expect(store.rows).toHaveLength(1);
    expect(await response.json()).toMatchObject({
      reused: true,
      authorization_uid: 'auth-reuse-1',
      stage: 'collection_ready',
    });
  });

  it('returns 409 when the monthly new-start budget is exhausted', async () => {
    const store = createAuthorizationStore(
      Array.from({ length: 10 }, (_, index) => buildAuthorizationRow({
        id: `row-${index + 1}`,
        operator_user_id: `op-${index + 1}`,
        operator_email: `ops-${index + 1}@example.com`,
        scenario: 'commercial',
        utility: 'DEMO',
        referral: `ref-${index + 1}`,
        authorization_uid: `auth-${index + 1}`,
        meter_uids: [],
        last_stage: 'revoked',
        last_status: 'revoked',
        started_at: `2026-04-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
        revoked_at: `2026-04-${String(index + 1).padStart(2, '0')}T01:00:00.000Z`,
      })),
    );

    const response = await handleUtilityApiDemoRequest(makeRequest({ action: 'start_demo' }), {
      apiToken: 'demo-api-token',
      formUid: 'form-123',
      liveEnabled: true,
      operatorEmailAllowlist: 'ops@example.com',
      monthlyStartBudget: 10,
      now: () => Date.parse('2026-04-27T12:00:00.000Z'),
      supabase: store.supabase,
      authenticateOperator: async () => ({
        operator: { userId: 'op-1', email: 'ops@example.com' },
        status: 200,
        body: null,
      }),
      rateLimiter: allowRateLimiter(),
      fetchImpl: async () => {
        throw new Error('test-submit should not be called when the monthly budget is exhausted');
      },
      logUsage: async () => {},
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: 'monthly_start_budget_exhausted',
      monthly_start_budget: 10,
      monthly_start_count: 10,
    });
  });
});

function makeRequest(
  body: Record<string, unknown>,
  options: {
    omitAuthorization?: boolean;
    token?: string;
    ipAddress?: string;
  } = {},
) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'x-forwarded-for': options.ipAddress ?? '203.0.113.9',
  });
  if (!options.omitAuthorization) {
    headers.set('Authorization', `Bearer ${options.token ?? 'operator-jwt'}`);
  }
  return new Request('https://example.com/functions/v1/utilityapi-demo', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function allowRateLimiter() {
  return {
    check: async () => ({
      allowed: true,
      operator: { allowed: true, remaining: 9, limit: 10, resetAt: 1_717_171_710_000, scope: 'operator' as const },
      ip: { allowed: true, remaining: 9, limit: 10, resetAt: 1_717_171_710_000, scope: 'ip' as const },
      effective: { allowed: true, remaining: 9, limit: 10, resetAt: 1_717_171_710_000, scope: 'operator' as const },
    }),
  };
}

function buildAuthorizationRow(overrides: Partial<AuthorizationRow>): AuthorizationRow {
  return {
    id: overrides.id ?? 'row-1',
    operator_user_id: overrides.operator_user_id ?? 'op-1',
    operator_email: overrides.operator_email ?? 'ops@example.com',
    scenario: overrides.scenario ?? 'commercial',
    utility: overrides.utility ?? 'DEMO',
    referral: overrides.referral ?? null,
    authorization_uid: overrides.authorization_uid ?? null,
    meter_uids: overrides.meter_uids ?? [],
    last_stage: overrides.last_stage ?? 'authorization_pending',
    last_status: overrides.last_status ?? null,
    started_at: overrides.started_at ?? '2026-04-27T00:00:00.000Z',
    last_polled_at: overrides.last_polled_at ?? null,
    last_synced_at: overrides.last_synced_at ?? null,
    revoked_at: overrides.revoked_at ?? null,
    last_error: overrides.last_error ?? null,
    created_at: overrides.created_at ?? '2026-04-27T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-04-27T00:00:00.000Z',
  };
}

function createAuthorizationStore(initialRows: AuthorizationRow[]) {
  const rows = initialRows.map((row) => ({ ...row, meter_uids: [...row.meter_uids] }));

  class QueryBuilder {
    private mode: 'select' | 'insert' | 'update' = 'select';
    private filters: Array<(row: AuthorizationRow) => boolean> = [];
    private orderColumn: keyof AuthorizationRow | null = null;
    private orderAscending = true;
    private limitCount: number | null = null;
    private headCount = false;
    private insertPayload: Record<string, unknown> | null = null;
    private updatePayload: Record<string, unknown> | null = null;

    select(_columns?: string, options?: { head?: boolean; count?: 'exact' }) {
      this.headCount = options?.head === true && options?.count === 'exact';
      return this;
    }

    eq(column: keyof AuthorizationRow | string, value: unknown) {
      this.filters.push((row) => row[column as keyof AuthorizationRow] === value);
      return this;
    }

    is(column: keyof AuthorizationRow | string, value: unknown) {
      this.filters.push((row) => row[column as keyof AuthorizationRow] === value);
      return this;
    }

    gte(column: keyof AuthorizationRow | string, value: unknown) {
      this.filters.push((row) => String(row[column as keyof AuthorizationRow] ?? '') >= String(value ?? ''));
      return this;
    }

    lt(column: keyof AuthorizationRow | string, value: unknown) {
      this.filters.push((row) => String(row[column as keyof AuthorizationRow] ?? '') < String(value ?? ''));
      return this;
    }

    order(column: keyof AuthorizationRow | string, options?: { ascending?: boolean }) {
      this.orderColumn = column as keyof AuthorizationRow;
      this.orderAscending = options?.ascending !== false;
      return this;
    }

    limit(value: number) {
      this.limitCount = value;
      return this;
    }

    insert(payload: Record<string, unknown>) {
      this.mode = 'insert';
      this.insertPayload = payload;
      return this;
    }

    update(payload: Record<string, unknown>) {
      this.mode = 'update';
      this.updatePayload = payload;
      return this;
    }

    async single() {
      if (this.mode === 'insert') {
        const created = buildAuthorizationRow({
          ...(this.insertPayload as Partial<AuthorizationRow>),
          id: `row-${rows.length + 1}`,
        });
        rows.push(created);
        return { data: created, error: null };
      }

      const result = this.filteredRows()[0] ?? null;
      return { data: result, error: null };
    }

    async maybeSingle() {
      if (this.mode === 'update') {
        const matches = this.filteredRows();
        const target = matches[0] ?? null;
        if (target && this.updatePayload) {
          Object.assign(target, this.updatePayload);
        }
        return { data: target, error: null };
      }

      const result = this.filteredRows()[0] ?? null;
      return { data: result, error: null };
    }

    then<TResult1 = unknown, TResult2 = never>(
      onfulfilled?: ((value: { data?: AuthorizationRow[]; count?: number; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve(this.execute()).then(onfulfilled ?? undefined, onrejected ?? undefined);
    }

    private execute() {
      const filtered = this.filteredRows();
      if (this.headCount) {
        return { count: filtered.length, error: null };
      }
      return { data: filtered, error: null };
    }

    private filteredRows() {
      let filtered = rows.filter((row) => this.filters.every((predicate) => predicate(row)));
      if (this.orderColumn) {
        filtered = [...filtered].sort((left, right) => {
          const leftValue = String(left[this.orderColumn] ?? '');
          const rightValue = String(right[this.orderColumn] ?? '');
          const comparison = leftValue.localeCompare(rightValue);
          return this.orderAscending ? comparison : -comparison;
        });
      }
      if (this.limitCount !== null) {
        filtered = filtered.slice(0, this.limitCount);
      }
      return filtered;
    }
  }

  return {
    rows,
    supabase: {
      from(tableName: string) {
        if (tableName !== 'utilityapi_demo_operator_authorizations') {
          throw new Error(`Unexpected table requested in test store: ${tableName}`);
        }
        return new QueryBuilder();
      },
    },
  };
}
