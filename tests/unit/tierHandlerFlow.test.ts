import { describe, expect, it } from 'vitest';
import {
  fillTierPriceDefaultsFromRate,
  fillTierPriceDefaultsFromRates,
  calculateTierScenario,
} from '../../supabase/functions/_shared/mlForecasting';
import { runTierScenario, type TierScenarioDb } from '../../supabase/functions/_shared/tierScenarioHandler';
import { sanitizeTierInputPayload } from '../../supabase/functions/_shared/tierInputSanitize';
import { boundedPersistedPayload } from '../../supabase/functions/_shared/persistedPayload';

const BASE_INPUT = {
  annualEmissionsTonnes: 150_000,
  benchmarkExceedanceTonnes: 20_000,
  directInvestmentCapexCad: 500_000,
  complianceYear: 2030,
  asOfDate: '2030-06-01',
  discountRate: 0.08,
};

const FRESH_ROW = {
  market_credit_price_cad_per_tonne: 30,
  fund_price_cad_per_tonne: 95,
  observed_at: '2026-10-01',
};

const assumptionsOf = (filled: Record<string, unknown>) =>
  filled.creditAssumptions as Record<string, unknown>;

describe('lastVerifiedAt provenance', () => {
  it('stamps row observed_at only when ALL prices came from the row', () => {
    const body: Record<string, unknown> = { ...BASE_INPUT };
    const filled = fillTierPriceDefaultsFromRate(body, FRESH_ROW);
    expect(assumptionsOf(filled).lastVerifiedAt).toBe('2026-10-01');
  });

  it('a caller future-dated claim cannot freshen mixed provenance — the older date wins', () => {
    const body: Record<string, unknown> = {
      ...BASE_INPUT,
      credit_assumptions: { market_credit_price_cad_per_tonne: 40, last_verified_at: '2999-01-01' },
    };
    const filled = fillTierPriceDefaultsFromRate(body, FRESH_ROW);
    // caller market (dated 2999) + row fund (dated 2026) → weakest link governs.
    expect(assumptionsOf(filled).lastVerifiedAt).toBe('2026-10-01');
  });

  it('combined freshness stays unprovenanced when a caller price has no date', () => {
    const body: Record<string, unknown> = {
      ...BASE_INPUT,
      credit_assumptions: { market_credit_price_cad_per_tonne: 40 },
    };
    const filled = fillTierPriceDefaultsFromRate(body, FRESH_ROW);
    expect(assumptionsOf(filled).lastVerifiedAt).toBeUndefined();
    expect(assumptionsOf(filled).last_verified_at).toBeUndefined();
  });

  it('combined freshness stays unprovenanced when any price falls back to an engine default', () => {
    const body: Record<string, unknown> = {
      ...BASE_INPUT,
      credit_assumptions: { market_credit_price_cad_per_tonne: 40, last_verified_at: '2030-05-01' },
    };
    const filled = fillTierPriceDefaultsFromRate(body, null); // no row → fund = provenance-free default
    expect(assumptionsOf(filled).lastVerifiedAt).toBeUndefined();
    expect(assumptionsOf(filled).last_verified_at).toBeUndefined();
    const result = calculateTierScenario(filled);
    expect(result.meta.staleness_status).toBe('stale');
    expect(result.meta.data_sources[0].lastUpdated).toBe('2026-02-01');
  });

  it('regression: a leftover snake-spelling date cannot resurrect dropped provenance', () => {
    // Before the fix, `...snake` carried `last_verified_at` into the merged
    // container even when the resolver returned undefined — the engine's
    // `?? last_verified_at` read then stamped a fresh caller date onto a
    // provenance-free default price.
    const body: Record<string, unknown> = {
      ...BASE_INPUT,
      credit_assumptions: { market_credit_price_cad_per_tonne: 40, last_verified_at: '2030-05-01' },
    };
    const result = calculateTierScenario(fillTierPriceDefaultsFromRate(body, null));
    expect(result.meta.staleness_status).toBe('stale');
    expect(result.meta.data_sources[0].lastUpdated).toBe('2026-02-01');
  });

  it('regression: a malformed caller price cannot carry caller provenance', () => {
    // 'abc' is not a usable price — the fill takes the row value, so the
    // row's older date must govern, not the caller's fresh claim.
    const body: Record<string, unknown> = {
      ...BASE_INPUT,
      credit_assumptions: {
        market_credit_price_cad_per_tonne: 'abc',
        fund_price_cad_per_tonne: 90,
        last_verified_at: '2030-05-01',
      },
    };
    const result = calculateTierScenario(fillTierPriceDefaultsFromRate(body, FRESH_ROW));
    expect(result.meta.staleness_status).toBe('stale');
    expect(result.meta.data_sources[0].lastUpdated).toBe('2026-10-01');
  });

  it('an unparseable caller date counts as unverified (oldest) in mixed provenance', () => {
    const body: Record<string, unknown> = {
      ...BASE_INPUT,
      credit_assumptions: { market_credit_price_cad_per_tonne: 40, last_verified_at: 'garbage' },
    };
    const filled = fillTierPriceDefaultsFromRate(body, FRESH_ROW);
    // 'garbage' scores as unverified/oldest → it governs → the engine marks it stale.
    expect(assumptionsOf(filled).lastVerifiedAt).toBe('garbage');
  });
});

describe('handler flow — persisted payloads stay bounded under malicious values', () => {
  it('input and result payloads cannot smuggle unbounded or non-scalar content', () => {
    const malicious: Record<string, unknown> = {
      ...BASE_INPUT,
      asOfDate: 'x'.repeat(1_000),
      extraArray: new Array(1_000).fill('x'),
      creditAssumptions: {
        marketCreditPriceCadPerTonne: 40,
        fundPriceCadPerTonne: 95,
        lastVerifiedAt: 'v'.repeat(10_000),
        nested: { deep: { evil: true } },
      },
    };
    const filled = fillTierPriceDefaultsFromRate(malicious, FRESH_ROW);
    const result = calculateTierScenario(filled);
    const inputPayload = sanitizeTierInputPayload(filled);

    // Persisted input: allowlisted bounded scalars only.
    expect(inputPayload.asOfDate).toBeUndefined();
    expect(inputPayload.extraArray).toBeUndefined();
    const assumptions = inputPayload.creditAssumptions as Record<string, unknown>;
    expect(assumptions.lastVerifiedAt).toBeUndefined();
    expect(assumptions.nested).toBeUndefined();
    expect(assumptions.marketCreditPriceCadPerTonne).toBe(40);

    // Persisted result: serialized payload under the 64KB cap and no
    // unbounded caller text in metadata.
    expect(new TextEncoder().encode(JSON.stringify(result)).length).toBeLessThanOrEqual(65536);
    expect(result.meta.data_sources.length).toBeGreaterThan(0);
    expect(String(result.meta.data_sources[0].lastUpdated ?? '').length).toBeLessThanOrEqual(64);
    // The oversized caller date collapses to the conservative stale default.
    expect(result.meta.staleness_status).toBe('stale');
  });
});

describe('fillTierPriceDefaultsFromRates — per-field row selection', () => {
  const MARKET_ONLY_NEWER = { market_credit_price_cad_per_tonne: 40, observed_at: '2026-10-01' };
  const FUND_ONLY_OLDER = { fund_price_cad_per_tonne: 90, observed_at: '2026-09-01' };

  it('a newest row carrying only a redundant price cannot shadow an older row holding the missing one', () => {
    // Caller supplies market — only fund is missing. The newest row has a
    // usable (but redundant) market price; the older row carries fund.
    const body: Record<string, unknown> = {
      ...BASE_INPUT,
      credit_assumptions: { market_credit_price_cad_per_tonne: 40, last_verified_at: '2030-05-01' },
    };
    const filled = fillTierPriceDefaultsFromRates(body, [MARKET_ONLY_NEWER, FUND_ONLY_OLDER]);
    const assumptions = assumptionsOf(filled);
    expect(assumptions.fundPriceCadPerTonne).toBe(90);
    // per-price provenance: fund sourced from the 2026-09-01 row — the
    // weakest (oldest) contributing date governs the combined date.
    expect(assumptions.lastVerifiedAt).toBe('2026-09-01');
  });

  it('complementary partial rows each contribute the field they carry', () => {
    const body: Record<string, unknown> = { ...BASE_INPUT };
    const filled = fillTierPriceDefaultsFromRates(body, [MARKET_ONLY_NEWER, FUND_ONLY_OLDER]);
    const assumptions = assumptionsOf(filled);
    expect(assumptions.marketCreditPriceCadPerTonne).toBe(40);
    expect(assumptions.fundPriceCadPerTonne).toBe(90);
    expect(assumptions.lastVerifiedAt).toBe('2026-09-01');
  });

  it('a malformed newest row is skipped per-field, older usable row still fills', () => {
    const rows = [
      { market_credit_price_cad_per_tonne: 'junk', fund_price_cad_per_tonne: -5, observed_at: '2026-10-15' },
      FUND_ONLY_OLDER,
    ];
    const filled = fillTierPriceDefaultsFromRates({ ...BASE_INPUT }, rows);
    const assumptions = assumptionsOf(filled);
    expect(assumptions.fundPriceCadPerTonne).toBe(90);
    // market had no usable row → provenance-free default → combined date unknown.
    expect(assumptions.marketCreditPriceCadPerTonne).toBe(25);
    expect(assumptions.lastVerifiedAt).toBeUndefined();
  });
});

describe('runTierScenario — DB mocked at the handler boundary', () => {
  const makeDb = (
    rows: Array<Record<string, unknown>> | null,
    opts: { failList?: boolean; failInsert?: string } = {},
  ) => {
    const inserts: Record<string, unknown>[] = [];
    const db: TierScenarioDb = {
      async listTierMarketRates() {
        if (opts.failList) return { data: null, error: { message: 'boom' } };
        return { data: rows, error: null };
      },
      async insertMlAlertEvaluation(row: Record<string, unknown>) {
        inserts.push(row);
        return { error: opts.failInsert ? { message: opts.failInsert } : null };
      },
    };
    return { db, inserts };
  };

  it.each([
    ['object', { evil: true }],
    ['array', ['2030-01-01']],
    ['boolean', true],
    ['number', 12345],
    ['invalid string', 'garbage'],
    ['oversized string', 'x'.repeat(500)],
  ])('hostile lastVerifiedAt (%s) cannot throw or claim freshness', async (_label, hostile) => {
    const { db, inserts } = makeDb([]);
    const body = {
      ...BASE_INPUT,
      credit_assumptions: { market_credit_price_cad_per_tonne: 40, last_verified_at: hostile },
    };
    const { result } = await runTierScenario(body, db);
    // Engine bound rejects non-primitive/oversized values → conservative
    // stale default — never a caller-controlled freshness claim.
    expect(result.meta.staleness_status).toBe('stale');
    const lastUpdated = result.meta.data_sources[0].lastUpdated;
    expect(typeof lastUpdated === 'string' || typeof lastUpdated === 'number').toBe(true);
    expect(String(lastUpdated ?? '').length).toBeLessThanOrEqual(64);
    expect(inserts).toHaveLength(1);
  });

  it('a valid caller date survives and a row still fills the missing price', async () => {
    const { db } = makeDb([{ fund_price_cad_per_tonne: 90, observed_at: '2026-09-01' }]);
    const body = {
      ...BASE_INPUT,
      credit_assumptions: { market_credit_price_cad_per_tonne: 40, last_verified_at: '2026-10-01' },
    };
    const { result } = await runTierScenario(body, db);
    // caller market (2026-10-01) + row fund (2026-09-01) → oldest governs.
    expect(result.meta.data_sources[0].lastUpdated).toBe('2026-09-01');
  });

  it('a rate-table read failure degrades to defaults and still persists a bounded evaluation', async () => {
    const { db, inserts } = makeDb(null, { failList: true });
    const { result, insertErrorMessage } = await runTierScenario({ ...BASE_INPUT }, db);
    expect(insertErrorMessage).toBeNull();
    expect(inserts).toHaveLength(1);
    expect(result.meta.claim_label).toBe('estimated');
    expect(new TextEncoder().encode(JSON.stringify(result)).length).toBeLessThanOrEqual(65536);
  });

  it('persisted input excludes arbitrary/nested/sensitive caller fields; result payload is bounded and labelled', async () => {
    const { db, inserts } = makeDb([{ market_credit_price_cad_per_tonne: 30, fund_price_cad_per_tonne: 95, observed_at: '2026-10-01' }]);
    const hostile = {
      ...BASE_INPUT,
      extraArray: ['x'],
      nestedSecret: { token: 'abc' },
      creditAssumptions: { nested: { deep: { evil: true } }, smuggled: 'value' },
    };
    const { insertErrorMessage } = await runTierScenario(hostile, db);
    expect(insertErrorMessage).toBeNull();
    expect(inserts).toHaveLength(1);
    const row = inserts[0];
    expect(row.claim_label).toBe('estimated');
    expect(typeof row.confidence_score).toBe('number');
    expect(Array.isArray(row.warnings)).toBe(true);
    const input = row.input_payload as Record<string, unknown>;
    expect(input.extraArray).toBeUndefined();
    expect(input.nestedSecret).toBeUndefined();
    const assumptions = input.creditAssumptions as Record<string, unknown>;
    expect(assumptions.nested).toBeUndefined();
    expect(assumptions.smuggled).toBeUndefined();
    // Both prices sourced from the row → row observed_at is the stamped date.
    expect(assumptions.lastVerifiedAt).toBe('2026-10-01');
    expect(new TextEncoder().encode(JSON.stringify(row.result_payload)).length).toBeLessThanOrEqual(65536);
  });

  it('insert failure is reported, not thrown — the computed result still returns', async () => {
    const { db } = makeDb([], { failInsert: 'db gone' });
    const { result, insertErrorMessage } = await runTierScenario({ ...BASE_INPUT }, db);
    expect(insertErrorMessage).toBe('db gone');
    expect(result.meta.model_version).toBe('tier-deterministic-v1');
  });

  it('a fully caller-supplied body skips the rate table entirely', async () => {
    let queried = 0;
    const db: TierScenarioDb = {
      async listTierMarketRates() { queried++; return { data: [], error: null }; },
      async insertMlAlertEvaluation() { return { error: null }; },
    };
    const body = {
      ...BASE_INPUT,
      creditAssumptions: {
        marketCreditPriceCadPerTonne: 40,
        fundPriceCadPerTonne: 95,
        lastVerifiedAt: '2026-10-01',
      },
    };
    const { result } = await runTierScenario(body, db);
    expect(queried).toBe(0);
    expect(result.pathways.marketCredits.priceCadPerTonne).toBe(40);
  });
});

describe('boundedPersistedPayload — generic untrusted-persistence bound', () => {
  it('truncates oversized strings, arrays, keys and depth; drops non-JSON-safe types', () => {
    const hostile = {
      long: 'x'.repeat(2000),
      arr: new Array(500).fill(1),
      nested: { a: { b: { c: { d: { e: { f: { g: 'deep' } } } } } } },
      bad: Number.NaN,
      sym: Symbol('s'),
      fn: () => 1,
      ok: 'fine',
    };
    const out = boundedPersistedPayload(hostile) as Record<string, unknown>;
    expect((out.long as string).length).toBe(512);
    expect((out.arr as unknown[]).length).toBe(100);
    expect(JSON.stringify(out.nested)).toContain('[truncated:depth]');
    expect(out.bad).toBeNull();
    expect(out.sym).toBeNull();
    expect(out.fn).toBeNull();
    expect(out.ok).toBe('fine');
    expect(() => JSON.stringify(out)).not.toThrow();
  });

  it('a payload over the byte cap collapses to a bounded marker, not raw persistence', () => {
    // Sanitized values are capped per-field, but a wide×deep structure can
    // still exceed the serialized byte cap — the marker is the backstop.
    const inner = Object.fromEntries(Array.from({ length: 64 }, (_, i) => [`k${i}`, 'x'.repeat(512)]));
    const huge = Object.fromEntries(Array.from({ length: 64 }, (_, i) => [`g${i}`, inner]));
    const out = boundedPersistedPayload(huge);
    expect(out).toEqual({ error: 'payload_oversize' });
    expect(new TextEncoder().encode(JSON.stringify(out)).length).toBeLessThanOrEqual(65536);
  });
});
