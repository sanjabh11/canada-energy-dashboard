import { describe, expect, it } from 'vitest';
import { calculateTierScenario as calculateTierScenarioLocal } from '../../src/lib/mlForecasting';
import { calculateTierScenario as calculateTierScenarioEdge } from '../../supabase/functions/_shared/mlForecasting';

const BASE_INPUT = {
  annualEmissionsTonnes: 150_000,
  benchmarkExceedanceTonnes: 20_000,
  directInvestmentCapexCad: 500_000,
  creditAssumptions: {
    fundPriceCadPerTonne: 95,
    marketCreditPriceCadPerTonne: 25,
    directInvestmentCreditRate: 0,
    lastVerifiedAt: '2026-06-02',
  },
  discountRate: 0.08,
};

const runBoth = (input: Record<string, unknown>) => ({
  edge: calculateTierScenarioEdge(input),
  local: calculateTierScenarioLocal(input as never),
});

const expectEngineParity = (edge: any, local: any) => {
  expect(edge.pathways.marketCredits.costCad).toBe(local.pathways.marketCredits.costCad);
  expect(edge.pathways.marketCredits.creditUseLimit).toBe(
    local.pathways.marketCredits.creditUseLimit,
  );
  expect(edge.pathways.marketCredits.creditEligibleTonnes).toBe(
    local.pathways.marketCredits.creditEligibleTonnes,
  );
  expect(edge.pathways.marketCredits.fundRemainderTonnes).toBe(
    local.pathways.marketCredits.fundRemainderTonnes,
  );
  expect(edge.pathways.fundPayment.costCad).toBe(local.pathways.fundPayment.costCad);
  expect(edge.pathways.directInvestment.costCad).toBe(local.pathways.directInvestment.costCad);
  expect(edge.bestPathway).toBe(local.bestPathway);
  expect(edge.estimatedSavingsCad).toBe(local.estimatedSavingsCad);
};

describe('TIER edge/local parity — regulated credit use limit', () => {
  it.each(Array.from({ length: 36 }, (_, i) => 2000 + i))(
    'returns identical results across the whole schedule for compliance year %i',
    (complianceYear) => {
      const input = { ...BASE_INPUT, complianceYear, asOfDate: `${complianceYear}-06-01` };
      const { edge, local } = runBoth(input);
      expectEngineParity(edge, local);
    },
  );

  it('blends 2025 at the 80% use limit on both engines (peer-review regression)', () => {
    const { edge, local } = runBoth({
      ...BASE_INPUT,
      complianceYear: 2025,
      asOfDate: '2025-06-01',
    });

    // 16,000 t credits × $25 + 4,000 t fund remainder × $95 = $780,000.
    // The pre-fix Edge path returned $500,000 (100% market credits).
    expect(local.pathways.marketCredits.costCad).toBe(780_000);
    expect(edge.pathways.marketCredits.costCad).toBe(780_000);
    expect(edge.pathways.marketCredits.creditUseLimit).toBe(0.8);
  });

  it('defaults to the asOf year on both engines when complianceYear is omitted', () => {
    const { edge, local } = runBoth({ ...BASE_INPUT, asOfDate: '2024-06-01' });

    expect(edge.pathways.marketCredits.creditUseLimit).toBe(0.7);
    expect(local.pathways.marketCredits.creditUseLimit).toBe(0.7);
    expectEngineParity(edge, local);
  });

  it('handles a raw snake_case payload on the edge path', () => {
    // No camelCase keys present — exercises the snake_case fallbacks end-to-end.
    const edge = calculateTierScenarioEdge({
      annual_emissions_tonnes: 150_000,
      benchmark_exceedance_tonnes: 20_000,
      direct_investment_capex_cad: 0,
      compliance_year: 2023,
      as_of_date: '2023-06-01',
      credit_assumptions: {
        fund_price_cad_per_tonne: 95,
        market_credit_price_cad_per_tonne: 25,
        direct_investment_credit_rate: 0,
        last_verified_at: '2023-01-01',
      },
    });
    expect(edge.pathways.marketCredits.creditUseLimit).toBe(0.6);
    // 12,000 t × $25 + 8,000 t × $95 = $1,060,000
    expect(edge.pathways.marketCredits.costCad).toBe(1_060_000);
  });

  it('coerces a four-digit string year identically on both engines', () => {
    const { edge, local } = runBoth({
      ...BASE_INPUT,
      complianceYear: '2025',
      asOfDate: '2026-06-01',
    });
    // "2025" must price at the 80% step — not silently fall back to the
    // asOf year (2026 → 90%).
    expect(edge.pathways.marketCredits.creditUseLimit).toBe(0.8);
    expect(local.pathways.marketCredits.creditUseLimit).toBe(0.8);
    expectEngineParity(edge, local);
  });

  it.each([0, 1999, 2025.5, -2024, 'garbage', '20255', '  ', null, NaN])(
    'falls back to the asOf year on both engines for malformed compliance year %p',
    (badYear) => {
      const { edge, local } = runBoth({
        ...BASE_INPUT,
        complianceYear: badYear,
        asOfDate: '2025-06-01',
      });
      expect(edge.pathways.marketCredits.creditUseLimit).toBe(0.8);
      expect(local.pathways.marketCredits.creditUseLimit).toBe(0.8);
      expectEngineParity(edge, local);
    },
  );
});
