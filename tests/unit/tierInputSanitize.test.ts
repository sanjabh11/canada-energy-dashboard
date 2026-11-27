import { describe, expect, it } from 'vitest';
import { sanitizeTierInputPayload } from '../../supabase/functions/_shared/tierInputSanitize';

describe('sanitizeTierInputPayload — ml_alert_evaluations input allowlist', () => {
  it('keeps scenario fields in both spellings', () => {
    const clean = sanitizeTierInputPayload({
      annualEmissionsTonnes: 150_000,
      benchmark_exceedance_tonnes: 20_000,
      complianceYear: 2030,
      as_of_date: '2030-06-01',
      discountRate: 0.08,
      creditAssumptions: { marketCreditPriceCadPerTonne: 25, fundPriceCadPerTonne: 95 },
    });
    expect(clean.annualEmissionsTonnes).toBe(150_000);
    expect(clean.benchmark_exceedance_tonnes).toBe(20_000);
    expect(clean.complianceYear).toBe(2030);
  });

  it('drops unknown top-level fields (PII, facility identifiers)', () => {
    const clean = sanitizeTierInputPayload({
      benchmarkExceedanceTonnes: 20_000,
      email: 'person@example.com',
      facility_id: 'FAC-123',
      company_name: 'Acme',
      evil: 'yes',
    });
    expect(clean).toEqual({ benchmarkExceedanceTonnes: 20_000 });
  });

  it('drops non-scalar values in non-container keys', () => {
    const clean = sanitizeTierInputPayload({
      benchmarkExceedanceTonnes: 20_000,
      asOfDate: ['2026-01-01'],
      complianceYear: { year: 2030 },
      annualEmissionsTonnes: 'lots',
      discountRate: null,
    });
    expect(clean.asOfDate).toBeUndefined();
    expect(clean.complianceYear).toBeUndefined();
    // Scalars — including strings and nulls — are kept.
    expect(clean.annualEmissionsTonnes).toBe('lots');
    expect(clean.discountRate).toBeNull();
  });

  it('allowlists nested assumption keys in both containers', () => {
    const clean = sanitizeTierInputPayload({
      creditAssumptions: {
        marketCreditPriceCadPerTonne: 25,
        fundPriceCadPerTonne: 95,
        lastVerifiedAt: '2026-06-01',
        ssn: '123-45-6789',
        nested: { leak: true },
      },
      credit_assumptions: {
        market_credit_price_cad_per_tonne: 30,
        other: 'drop-me',
      },
    });
    const camel = clean.creditAssumptions as Record<string, unknown>;
    const snake = clean.credit_assumptions as Record<string, unknown>;
    expect(camel).toEqual({
      marketCreditPriceCadPerTonne: 25,
      fundPriceCadPerTonne: 95,
      lastVerifiedAt: '2026-06-01',
    });
    expect(snake).toEqual({ market_credit_price_cad_per_tonne: 30 });
  });

  it('does not allow __proto__ or other exotic keys through', () => {
    const body = JSON.parse(
      '{"benchmarkExceedanceTonnes":20000,"__proto__":{"polluted":true},"creditAssumptions":{"marketCreditPriceCadPerTonne":25,"__proto__":{"x":1}}}',
    ) as Record<string, unknown>;
    const clean = sanitizeTierInputPayload(body);
    expect(clean.__proto__).toBe(Object.prototype);
    expect((clean as Record<string, unknown>).polluted).toBeUndefined();
    const camel = clean.creditAssumptions as Record<string, unknown>;
    expect(camel).toEqual({ marketCreditPriceCadPerTonne: 25 });
  });

  it('replaces a non-object assumptions container with an empty object', () => {
    const clean = sanitizeTierInputPayload({ creditAssumptions: 'garbage' });
    expect(clean.creditAssumptions).toEqual({});
  });

  it('returns an empty object for an empty body', () => {
    expect(sanitizeTierInputPayload({})).toEqual({});
  });
});

describe('scalar length bounds', () => {
  it('drops oversized top-level strings but keeps bounded siblings', () => {
    const clean = sanitizeTierInputPayload({ asOfDate: 'x'.repeat(1_000), complianceYear: 2030 });
    expect(clean.asOfDate).toBeUndefined();
    expect(clean.complianceYear).toBe(2030);
  });

  it('drops oversized assumption strings so they cannot reach result_payload via metadata', () => {
    const clean = sanitizeTierInputPayload({
      creditAssumptions: { lastVerifiedAt: 'v'.repeat(10_000), fundPriceCadPerTonne: 95 },
    });
    const assumptions = clean.creditAssumptions as Record<string, unknown>;
    expect(assumptions.lastVerifiedAt).toBeUndefined();
    expect(assumptions.fundPriceCadPerTonne).toBe(95);
  });

  it('keeps bounded strings unchanged', () => {
    const clean = sanitizeTierInputPayload({
      asOfDate: '2030-06-01',
      creditAssumptions: { lastVerifiedAt: '2026-10-01' },
    });
    expect(clean.asOfDate).toBe('2030-06-01');
    expect((clean.creditAssumptions as Record<string, unknown>).lastVerifiedAt).toBe('2026-10-01');
  });
});
