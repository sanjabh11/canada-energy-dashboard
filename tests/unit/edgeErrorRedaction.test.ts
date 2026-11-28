import { describe, expect, it, vi } from 'vitest';
import {
  handleGroundsourceRequest,
  redactSourceUrl,
  isFetchableAllowlistUrl,
  boundedErrorMessage,
  sanitizedErrorForLog,
  type GroundsourceHttpDeps,
  type GroundsourceIngestionDeps,
} from '../../supabase/functions/groundsource-miner/groundsourceHandler';

const SENTINEL = 'SENTINEL_SECRET_9f3b_do_not_leak';

const httpDeps = (authorized = true): GroundsourceHttpDeps => ({
  isAuthorized: () => authorized,
  createCorsHeaders: () => ({ 'Access-Control-Allow-Origin': 'https://app.test' }),
  handleCorsOptions: () => new Response(null, { status: 204 }),
  applyRateLimit: () => ({ headers: {} }),
});

type MockChain = {
  select: () => MockChain;
  upsert: (rows: unknown) => MockChain;
  insert: (rows: unknown) => MockChain;
  update: () => MockChain;
  eq: () => MockChain;
  in: () => MockChain;
  gte: () => Promise<{ data: unknown[]; error: unknown; count: number }>;
  single: () => Promise<{ data: unknown; error: unknown }>;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
};

/** Minimal chainable Supabase stand-in that records writes per table. */
function makeSupabaseMock() {
  const writes: Array<{ table: string; rows: unknown }> = [];
  const makeChain = (table: string): MockChain => ({
    select: () => makeChain(table),
    upsert: (rows: unknown) => {
      writes.push({ table, rows });
      return makeChain(table);
    },
    insert: (rows: unknown) => {
      writes.push({ table, rows });
      return makeChain(table);
    },
    update: () => makeChain(table),
    eq: () => makeChain(table),
    in: () => makeChain(table),
    gte: () => Promise.resolve({ data: [], error: null, count: 0 }),
    single: async () => ({ data: { id: 'mock-id', source_url: 'mock' }, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
  });
  return { writes, from: (table: string) => makeChain(table) };
}

function makeDeps(overrides: Partial<GroundsourceIngestionDeps> = {}): GroundsourceIngestionDeps {
  return {
    supabase: null,
    fetchImpl: vi.fn(async () => new Response('<html><body>public page</body></html>', { status: 200 })),
    callLlm: async () => ({ source_confidence: 0.9, provenance_notes: [], events: [] }),
    saveSnapshot: vi.fn(async () => undefined),
    ops: {
      startOpsRun: vi.fn(async () => ({ id: 'run-1', started_at: new Date().toISOString() })),
      finishOpsRun: vi.fn(async () => ({})),
      logFallbackEvent: vi.fn(async () => ({})),
      logJobExecution: vi.fn(async () => ({})),
    },
    budgets: { dailyTokenBudget: 100_000, maxDurationMs: 60_000, maxEventsPerDay: 200 },
    ...overrides,
  };
}

const postJson = (body: unknown) =>
  new Request('https://edge.test/functions/v1/groundsource-miner/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    duplex: 'half',
  } as RequestInit);

describe('groundsource handler — error redaction at the response boundary', () => {
  it('a thrown sentinel never reaches the response body; status stays 500', async () => {
    const deps = makeDeps();
    deps.supabase = makeSupabaseMock();
    deps.ops.startOpsRun = vi.fn(async () => {
      throw new Error(`db exploded with credential ${SENTINEL}`);
    });

    const res = await handleGroundsourceRequest(postJson({ source_group: 'utility_public' }), httpDeps(true), deps);
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain(SENTINEL);
    expect(JSON.parse(text).error).toBe('Internal error');
  });

  it('unauthorized requests get 401 before any fetch, body read, or persistence', async () => {
    const deps = makeDeps();
    deps.supabase = makeSupabaseMock();

    const res = await handleGroundsourceRequest(
      postJson({ sample_sources: [{ url: 'https://evil.example/x?key=1', text: 't' }] }),
      httpDeps(false),
      deps,
    );
    expect(res.status).toBe(401);
    expect(deps.fetchImpl).not.toHaveBeenCalled();
    expect(deps.ops.startOpsRun).not.toHaveBeenCalled();
    expect(deps.saveSnapshot).not.toHaveBeenCalled();
  });
});

describe('groundsource handler — SSRF lockdown on caller-supplied sources', () => {
  it('sample_sources carrying only a URL are never fetched and never persisted', async () => {
    const sb = makeSupabaseMock();
    const deps = makeDeps({ supabase: sb });
    const res = await handleGroundsourceRequest(
      postJson({
        source_group: 'utility_public',
        sample_sources: [
          { name: 'evil-internal', url: 'http://169.254.169.254/latest/meta-data' },
          { name: 'evil-userinfo', url: 'https://user:hunter2@internal.example/x?token=abc' },
        ],
      }),
      httpDeps(true),
      deps,
    );
    expect(res.status).toBe(200);
    // No fetch — caller URLs are never fetched, allowlist or not.
    expect(deps.fetchImpl).not.toHaveBeenCalled();
    // No source rows persisted — skipped entries produce no documents/events.
    expect(sb.writes.filter((w) => w.table === 'ml_source_documents' || w.table === 'ml_intelligence_events')).toHaveLength(0);
    const payload = JSON.parse(await res.text());
    expect(payload.documents).toEqual([]);
    expect(payload.events).toEqual([]);
  });

  it('sample_sources with inline text are processed without fetch and leak no URL material', async () => {
    const sb = makeSupabaseMock();
    const deps = makeDeps({ supabase: sb });
    const res = await handleGroundsourceRequest(
      postJson({
        source_group: 'utility_public',
        sample_sources: [
          {
            name: 'fixture',
            url: 'https://user:hunter2@evil.example/secret/path?api_key=supersecret123&x=1#frag',
            text: 'Alberta outage reported on the distribution feeder.',
          },
        ],
      }),
      httpDeps(true),
      deps,
    );
    expect(res.status).toBe(200);
    expect(deps.fetchImpl).not.toHaveBeenCalled();
    const text = await res.text();
    expect(text).not.toContain('api_key');
    expect(text).not.toContain('supersecret123');
    expect(text).not.toContain('user:hunter2');
    expect(text).not.toContain('evil.example');
    // Caller URLs are replaced by stable sample IDs everywhere.
    expect(JSON.parse(text).meta.data_sources[0].url).toBe('sample://1');
    // Persisted document rows carry the stable ID, never the caller URL.
    const docWrite = sb.writes.find((w) => w.table === 'ml_source_documents');
    expect(JSON.stringify(docWrite)).not.toContain('evil.example');
    expect(JSON.stringify(docWrite)).toContain('sample://1');
  });

  it('allowlist fetch uses redirect:error and only re-validated https URLs', async () => {
    const deps = makeDeps();
    const res = await handleGroundsourceRequest(
      postJson({ source_group: 'utility_public', max_items: 2 }),
      httpDeps(true),
      deps,
    );
    expect(res.status).toBe(200);
    expect(deps.fetchImpl).toHaveBeenCalledTimes(2);
    for (const call of (deps.fetchImpl as ReturnType<typeof vi.fn>).mock.calls) {
      const [url, init] = call as [string, RequestInit];
      expect(url.startsWith('https://')).toBe(true);
      expect(init.redirect).toBe('error');
      // No credentials in the fetched URL.
      expect(new URL(url).username).toBe('');
    }
  });

  it('fetch rejection keeps the run heuristic without leaking upstream detail', async () => {
    const deps = makeDeps({
      fetchImpl: vi.fn(async () => {
        throw new Error(`connection refused to https://user:pw@upstream/${SENTINEL}`);
      }),
    });
    const res = await handleGroundsourceRequest(
      postJson({ source_group: 'utility_public', max_items: 1 }),
      httpDeps(true),
      deps,
    );
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain(SENTINEL);
  });
});

describe('groundsource handler — LLM fallback uses bounded reason codes', () => {
  it('a failing LLM produces reason codes, not raw error text, in caller fields', async () => {
    const deps = makeDeps({
      callLlm: async () => {
        throw new Error(`Gemini 500 upstream at https://key.example/${SENTINEL}`);
      },
    });
    const res = await handleGroundsourceRequest(
      postJson({
        source_group: 'utility_public',
        sample_sources: [{ name: 'fixture', text: 'Ontario price spike observed.' }],
      }),
      httpDeps(true),
      deps,
    );
    expect(res.status).toBe(200);
    const payload = JSON.parse(await res.text());
    expect(payload.fallback_reason).toBe('fixture: llm_request_failed');
    const text = JSON.stringify(payload);
    expect(text).not.toContain(SENTINEL);
    expect(text).not.toContain('Gemini 500');
    expect(text).not.toContain('key.example');
  });
});

describe('redactSourceUrl', () => {
  it('strips userinfo, query, and fragment from https URLs', () => {
    expect(redactSourceUrl('https://user:pw@host.example/a/b?token=zzz#frag')).toBe('https://host.example/a/b');
    expect(redactSourceUrl('http://h.example/p?x=1')).toBe('http://h.example/p');
  });

  it('keeps stable pseudo-URL identities without echoing secrets', () => {
    expect(redactSourceUrl('sample://3')).toBe('sample://3');
    expect(redactSourceUrl('not a url ?key=1')).toBe('redacted-source');
  });
});

describe('isFetchableAllowlistUrl', () => {
  it('accepts plain https allowlist URLs only', () => {
    expect(isFetchableAllowlistUrl('https://www.aeso.ca/')).toBe(true);
    expect(isFetchableAllowlistUrl('http://www.aeso.ca/')).toBe(false);
    expect(isFetchableAllowlistUrl('https://user:pw@www.aeso.ca/')).toBe(false);
    expect(isFetchableAllowlistUrl('https://www.aeso.ca:8443/')).toBe(false);
    expect(isFetchableAllowlistUrl('https://')).toBe(false);
    expect(isFetchableAllowlistUrl('file:///etc/passwd')).toBe(false);
  });
});

describe('boundedErrorMessage / sanitizedErrorForLog', () => {
  it('bounds and normalizes internal error text for telemetry', () => {
    const long = 'x'.repeat(1000);
    expect(boundedErrorMessage(new Error(long))).toHaveLength(300);
    expect(boundedErrorMessage('plain string')).toBe('plain string');
    expect(boundedErrorMessage(new Error('a\nb\tc'))).toBe('a b c');
  });

  it('emits a compact code+message shape instead of a raw error object', () => {
    const shaped = sanitizedErrorForLog({ code: 'PGRST301', message: 'y'.repeat(500), stack: 'nope' });
    expect(shaped.code).toBe('PGRST301');
    expect((shaped.message as string).length).toBeLessThanOrEqual(80);
    expect(shaped.stack).toBeUndefined();
  });
});
