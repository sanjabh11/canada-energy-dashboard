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

describe('TIER edge/local parity — regulated credit use limit', () => {
  it.each([2023, 2024, 2025, 2026, 2030])(
    'returns identical market-credits cost and blend fields for compliance year %i',
    (complianceYear) => {
      const input = { ...BASE_INPUT, complianceYear, asOfDate: `${complianceYear}-06-01` };
      const edge = calculateTierScenarioEdge(input);
      const local = calculateTierScenarioLocal(input);

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
      expect(edge.pathways.directInvestment.costCad).toBe(
        local.pathways.directInvestment.costCad,
      );
      expect(edge.bestPathway).toBe(local.bestPathway);
      expect(edge.estimatedSavingsCad).toBe(local.estimatedSavingsCad);
    },
  );

  it('blends 2025 at the 80% use limit on both engines (peer-review regression)', () => {
    const input = { ...BASE_INPUT, complianceYear: 2025, asOfDate: '2025-06-01' };
    const edge = calculateTierScenarioEdge(input);
    const local = calculateTierScenarioLocal(input);

    // 16,000 t credits × $25 + 4,000 t fund remainder × $95 = $780,000.
    // The pre-fix Edge path returned $500,000 (100% market credits).
    expect(local.pathways.marketCredits.costCad).toBe(780_000);
    expect(edge.pathways.marketCredits.costCad).toBe(780_000);
    expect(edge.pathways.marketCredits.creditUseLimit).toBe(0.8);
  });

  it('defaults to the asOf year on both engines when complianceYear is omitted', () => {
    const input = { ...BASE_INPUT, asOfDate: '2024-06-01' };
    const edge = calculateTierScenarioEdge(input);
    const local = calculateTierScenarioLocal(input);

    expect(edge.pathways.marketCredits.creditUseLimit).toBe(0.7);
    expect(edge.pathways.marketCredits.costCad).toBe(local.pathways.marketCredits.costCad);
  });

  it('accepts snake_case compliance_year on the edge path', () => {
    const input = {
      ...BASE_INPUT,
      compliance_year: 2023,
      benchmark_exceedance_tonnes: 20_000,
      asOfDate: '2023-06-01',
    };
    const edge = calculateTierScenarioEdge(input as never);
    expect(edge.pathways.marketCredits.creditUseLimit).toBe(0.6);
    // 12,000 t × $25 + 8,000 t × $95 = $1,060,000
    expect(edge.pathways.marketCredits.costCad).toBe(1_060_000);
  });
});
