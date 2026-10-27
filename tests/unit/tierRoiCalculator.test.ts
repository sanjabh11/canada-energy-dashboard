import { describe, expect, it } from 'vitest';
import {
  CEIP_ANNUAL_BASE_FEE_USD,
  CEIP_FEE_CURRENCY,
  DEFAULT_TIER_FEE_CONFIG,
  DI_ELIGIBLE_CAPITAL_SHARE,
  TIER_PATHWAY_CURRENCY,
  TIER_REGULATION_URL,
  computeTierRoiScenario,
  canRequestTierPilot,
  formatTierAmount,
  toTierRoiResultsView,
  type TierFeeConfig,
  type TierRoiInputs,
} from '../../src/lib/tierCalculations';

const FRESH_RATE_DATE = new Date().toISOString().slice(0, 10);

const BASE_INPUTS: TierRoiInputs = {
  annualEmissionsTonnes: 150_000,
  benchmarkExceedanceTonnes: 20_000,
  directInvestmentCapexCad: 500_000,
  fundPriceCadPerTonne: 95,
  marketCreditPriceCadPerTonne: 25,
  fundPriceProvenance: {
    asOfDate: FRESH_RATE_DATE,
    source: 'Test fund-price source',
    sourceUrl: 'https://example.test/fund',
    maxAgeDays: 90,
  },
  marketCreditProvenance: {
    asOfDate: FRESH_RATE_DATE,
    source: 'Test market quote',
    sourceUrl: 'https://example.test/market',
    maxAgeDays: 30,
  },
};

const FIXTURE_FX_FOR_MATH_TESTS = 1.36;
const FEE_CONFIG_FOR_MATH_TESTS: TierFeeConfig = {
  ...DEFAULT_TIER_FEE_CONFIG,
  usdToCadPlanningRate: FIXTURE_FX_FOR_MATH_TESTS,
  usdToCadEvidence: {
    sourceUrl: 'https://example.test/fx-quote',
    observedAt: new Date().toISOString(),
    claimLabel: 'validated',
  },
};

function compute(overrides: Partial<TierRoiInputs> = {}, feeConfig?: Partial<TierFeeConfig>) {
  return computeTierRoiScenario(
    { ...BASE_INPUTS, ...overrides },
    { ...FEE_CONFIG_FOR_MATH_TESTS, ...feeConfig },
  );
}

describe('computeTierRoiScenario — pathway comparison', () => {
  it('includes all three pathways in the comparison', () => {
    const result = compute();
    expect(result.comparison.map((p) => p.id)).toEqual([
      'fund_payment',
      'market_credits',
      'direct_investment',
    ]);
  });

  it('computes the fund payment pathway as exceedance × fund price', () => {
    const result = compute({ benchmarkExceedanceTonnes: 10_000, fundPriceCadPerTonne: 95 });
    expect(result.pathways.fundPayment.costCad).toBe(950_000);
    expect(result.comparison.find((p) => p.id === 'fund_payment')?.costCad).toBe(950_000);
  });

  it('selects market credits as best determined pathway when cheaper than the fund', () => {
    const result = compute();
    expect(result.bestDeterminedPathway).toBe('market_credits');
    expect(result.recommendation).toEqual({ kind: 'market_credits' });
    expect(result.status).toBe('savings_identified');
  });

  it('selects the fund payment pathway when market credits cost more', () => {
    const result = compute({ marketCreditPriceCadPerTonne: 120 });
    expect(result.bestDeterminedPathway).toBe('fund_payment');
    expect(result.recommendation).toEqual({ kind: 'pay_fund' });
    expect(result.grossSavingsCad).toBe(0);
    expect(result.status).toBe('no_savings');
  });

  it('never returns direct investment as the best determined pathway', () => {
    // Even with zero capex (the most flattering possible DI input), the
    // undetermined pathway is excluded from best-option selection.
    const cheapDi = compute({ directInvestmentCapexCad: 0 });
    expect(cheapDi.bestDeterminedPathway).not.toBe('direct_investment');
    const expensiveDi = compute({ directInvestmentCapexCad: 10_000_000 });
    expect(expensiveDi.bestDeterminedPathway).not.toBe('direct_investment');
  });

  it('cannot win a comparison even with maximally favorable hypothetical inputs', () => {
    // G10: even with free capex, a huge market price, and sourced FX, Direct
    // Investment is undetermined and excluded from ranking and exports.
    const result = compute({
      directInvestmentCapexCad: 0,
      marketCreditPriceCadPerTonne: 10_000,
    });
    expect(result.pathways.directInvestment.status).toBe('undetermined_pending_standard');
    expect(result.bestDeterminedPathway).not.toBe('direct_investment');
    expect(result.recommendation.kind).not.toBe('market_credits');
    expect(result.recommendation).toEqual({ kind: 'pay_fund' });
    expect(result.comparison.find((p) => p.id === 'direct_investment')).toMatchObject({
      determined: false,
      costCad: null,
    });
    expect(toTierRoiResultsView(result).bestOption).not.toBe('direct_investment');
  });
});

describe('TIER pilot-request gate', () => {
  const candidate = {
    pricingEvidenceFresh: true,
    ratesStale: false,
    status: 'savings_identified' as const,
    netSavingsCad: 10_000,
    roiPercent: 25,
  };

  it('allows a request only with fresh evidence and positive net savings', () => {
    expect(canRequestTierPilot(candidate)).toBe(true);
    expect(canRequestTierPilot({ ...candidate, pricingEvidenceFresh: false })).toBe(false);
    expect(canRequestTierPilot({ ...candidate, ratesStale: true })).toBe(false);
    expect(canRequestTierPilot({ ...candidate, status: 'no_savings' })).toBe(false);
    expect(canRequestTierPilot({ ...candidate, netSavingsCad: null })).toBe(false);
    expect(canRequestTierPilot({ ...candidate, roiPercent: null })).toBe(false);
  });
});

describe('computeTierRoiScenario — direct investment boundary', () => {
  it('labels the pathway undetermined pending the Alberta Standard', () => {
    const di = compute().pathways.directInvestment;
    expect(di.status).toBe('undetermined_pending_standard');
    expect(di.note).toContain('Direct Investment Standard');
    const comparisonEntry = compute().comparison.find((p) => p.id === 'direct_investment');
    expect(comparisonEntry?.determined).toBe(false);
    expect(comparisonEntry?.costCad).toBeNull();
    expect(comparisonEntry?.costRangeCad).not.toBeNull();
  });

  it('bounds DI cost between capex alone and capex plus the full fund payment', () => {
    const di = compute({ directInvestmentCapexCad: 500_000, benchmarkExceedanceTonnes: 20_000 })
      .pathways.directInvestment;
    expect(di.costRangeCad.low).toBe(500_000);
    expect(di.costRangeCad.high).toBe(500_000 + 20_000 * 95);
    expect(di.creditedTonnesRange).toEqual({ low: 0, high: 20_000 });
  });

  it('applies the 50% eligible-capital cap from the Canada-Alberta agreement', () => {
    const di = compute({ directInvestmentCapexCad: 500_000 }).pathways.directInvestment;
    expect(di.eligibleCapitalCapCad).toBe(500_000 * DI_ELIGIBLE_CAPITAL_SHARE);
    expect(DI_ELIGIBLE_CAPITAL_SHARE).toBe(0.5);
    expect(di.attributableOpexShareCapPct).toBe(0.5);
  });
});

describe('computeTierRoiScenario — fees and ROI suppression', () => {
  it('floors the success fee at zero when there are no savings', () => {
    const result = compute({ marketCreditPriceCadPerTonne: 200 });
    expect(result.fees.successUsd).toBe(0);
    expect(result.fees.totalUsd).toBe(CEIP_ANNUAL_BASE_FEE_USD);
  });

  it('floors net savings at zero when fees exceed modeled savings', () => {
    // Gross savings: 100 t × (95 - 90) = CAD 500 — far below the USD fee.
    const result = compute({ benchmarkExceedanceTonnes: 100, marketCreditPriceCadPerTonne: 90 });
    expect(result.grossSavingsCad).toBe(500);
    expect(result.netSavingsCad).toBe(0);
    expect(result.netSavingsCad).toBeGreaterThanOrEqual(0);
    expect(result.fees.totalUsd).not.toBeNull();
    expect(result.fees.totalUsd!).toBeGreaterThanOrEqual(0);
  });

  it('suppresses ROI% when gross savings are zero or negative', () => {
    const zero = compute({ benchmarkExceedanceTonnes: 0 });
    expect(zero.roiPercent).toBeNull();
    expect(zero.suppressionReason).toBe('no_positive_savings');

    const marketAboveFund = compute({ marketCreditPriceCadPerTonne: 150 });
    expect(marketAboveFund.roiPercent).toBeNull();
    expect(marketAboveFund.suppressionReason).toBe('no_positive_savings');
  });

  it('reports a positive floored ROI% when savings cover the fee', () => {
    const result = compute();
    expect(result.roiPercent).not.toBeNull();
    expect(result.roiPercent!).toBeGreaterThanOrEqual(0);
    // sanity: gross = 20,000 × (95-25) = CAD 1.4M; net > 0
    expect(result.grossSavingsCad).toBe(1_400_000);
    expect(result.netSavingsCad!).toBeGreaterThan(0);
  });
});

describe('computeTierRoiScenario — missing and zero inputs', () => {
  it('returns an honest empty state for non-finite inputs', () => {
    const result = compute({ benchmarkExceedanceTonnes: Number.NaN });
    expect(result.inputsComplete).toBe(false);
    expect(result.missingInputs).toContain('benchmarkExceedanceTonnes');
    expect(result.status).toBe('incomplete_inputs');
    expect(result.recommendation).toEqual({ kind: 'none', reason: 'inputs_incomplete' });
    expect(result.grossSavingsCad).toBeNull();
    expect(result.netSavingsCad).toBeNull();
    expect(result.roiPercent).toBeNull();
  });

  it('returns no recommendation for zero exceedance', () => {
    const result = compute({ benchmarkExceedanceTonnes: 0 });
    expect(result.inputsComplete).toBe(true);
    expect(result.status).toBe('no_savings');
    expect(result.recommendation).toEqual({ kind: 'none', reason: 'no_positive_savings' });
    expect(result.roiPercent).toBeNull();
  });

  it('clamps negative inputs to zero instead of producing negative costs', () => {
    const result = compute({ benchmarkExceedanceTonnes: -5_000, directInvestmentCapexCad: -10 });
    expect(result.pathways.fundPayment.costCad).toBe(0);
    expect(result.pathways.marketCredits.costCad).toBe(0);
    expect(result.pathways.directInvestment.capexCad).toBe(0);
    expect(result.status).toBe('no_savings');
  });
});

describe('currency labeling (audit G11)', () => {
  it('keeps pathway amounts in CAD and CEIP fees in USD', () => {
    const result = compute();
    expect(result.pathwayCurrency).toBe('CAD');
    expect(TIER_PATHWAY_CURRENCY).toBe('CAD');
    expect(result.feeCurrency).toBe('USD');
    expect(CEIP_FEE_CURRENCY).toBe('USD');
    expect(result.fees.baseUsd).toBe(18_000);
    expect(result.usdToCadPlanningRate).toBe(FIXTURE_FX_FOR_MATH_TESTS);
    expect(DEFAULT_TIER_FEE_CONFIG.usdToCadPlanningRate).toBeNull();
  });

  it('suppresses cross-currency outputs when no FX conversion is provided', () => {
    const result = compute({}, { usdToCadPlanningRate: null });
    expect(result.fees.successUsd).toBeNull();
    expect(result.fees.totalUsd).toBeNull();
    expect(result.fees.totalCadEquivalent).toBeNull();
    expect(result.netSavingsCad).toBeNull();
    expect(result.roiPercent).toBeNull();
    // Same-currency pathway figures remain available.
    expect(result.grossSavingsCad).toBe(1_400_000);
  });

  it('does not rank pathways or present ROI from the default configuration without FX evidence', () => {
    const result = computeTierRoiScenario(BASE_INPUTS);
    expect(result.fees.totalCadEquivalent).toBeNull();
    expect(result.netSavingsCad).toBeNull();
    expect(result.roiPercent).toBeNull();
    expect(result.bestDeterminedPathway).toBeNull();
    expect(result.recommendation.kind).toBe('none');
    const projection = toTierRoiResultsView(result);
    expect(projection.ceipFee).toBeNull();
    expect(projection.netSavings).toBeNull();
    expect(projection.roiPercent).toBeNull();
    expect(projection.bestOption).toBe('none');
  });

  it('rejects a numeric FX value without current validated source evidence', () => {
    const noProvenance = computeTierRoiScenario(BASE_INPUTS, {
      ...DEFAULT_TIER_FEE_CONFIG,
      usdToCadPlanningRate: FIXTURE_FX_FOR_MATH_TESTS,
    });
    const staleEvidence = computeTierRoiScenario(BASE_INPUTS, {
      ...FEE_CONFIG_FOR_MATH_TESTS,
      usdToCadEvidence: {
        ...FEE_CONFIG_FOR_MATH_TESTS.usdToCadEvidence!,
        observedAt: '2020-01-01T00:00:00Z',
      },
    });
    expect(noProvenance.usdToCadPlanningRate).toBeNull();
    expect(noProvenance.netSavingsCad).toBeNull();
    expect(staleEvidence.usdToCadPlanningRate).toBeNull();
    expect(staleEvidence.roiPercent).toBeNull();
  });

  it('formats every monetary output with a visible currency unit', () => {
    expect(formatTierAmount(18_000, 'USD')).toContain('USD');
    expect(formatTierAmount(18_000, 'CAD')).toContain('CAD');
    expect(formatTierAmount(18_000, 'USD')).not.toBe(formatTierAmount(18_000, 'CAD'));
  });
});

describe('boundary notes and proof-pack projection', () => {
  it('attaches plain-language uncertainty and eligibility notes', () => {
    const result = compute();
    const joined = result.notes.join(' ');
    expect(joined).toContain('scenario estimates');
    expect(joined).toContain('Direct Investment Standard');
    expect(TIER_REGULATION_URL).toContain('alberta.ca');
  });

  it('projects a conservative legacy view for proof-pack exports', () => {
    const result = compute();
    const view = toTierRoiResultsView(result);
    expect(view.fundPayment).toBe(1_900_000);
    expect(view.marketCredits).toBe(500_000);
    // DI projected at its conservative upper bound, never the attractive end.
    expect(view.directInvestment).toBe(500_000 + 1_900_000);
    // DI can never be exported as the recommended option while undetermined.
    expect(view.bestOption).toBe('market_credits');
    expect(view.ceipFee).toBeGreaterThanOrEqual(0);
    expect(view.netSavings).toBeGreaterThanOrEqual(0);
  });
});

describe('computeTierRoiScenario — rate freshness gate (audit G9a)', () => {
  const AS_OF = new Date('2026-06-15T12:00:00.000Z');

  const provenance = (asOfDate: string, maxAgeDays = 30) => ({
    asOfDate,
    source: 'Pinned test source',
    sourceUrl: 'https://example.test/rate',
    maxAgeDays,
  });

  it('suppresses savings, ranking, and CTA outputs when the fund rate is stale', () => {
    const result = computeTierRoiScenario(
      {
        ...BASE_INPUTS,
        fundPriceProvenance: provenance('2026-01-01', 90),
        // Keep the market rate in-window relative to the injected asOf date so
        // only the fund rate trips the freshness gate.
        marketCreditProvenance: provenance('2026-06-10', 30),
      },
      FEE_CONFIG_FOR_MATH_TESTS,
      { asOf: AS_OF },
    );
    expect(result.ratesStale).toBe(true);
    expect(result.rateFreshness.fundPrice.stale).toBe(true);
    expect(result.rateFreshness.fundPrice.reason).toBe('stale');
    expect(result.rateFreshness.marketCreditPrice.stale).toBe(false);
    expect(result.status).toBe('stale_inputs');
    expect(result.suppressionReason).toBe('stale_inputs');
    expect(result.recommendation).toEqual({ kind: 'none', reason: 'stale_inputs' });
    expect(result.bestDeterminedPathway).toBeNull();
    expect(result.grossSavingsCad).toBeNull();
    expect(result.netSavingsCad).toBeNull();
    expect(result.roiPercent).toBeNull();
    expect(result.fees.successUsd).toBeNull();
    expect(result.fees.totalUsd).toBeNull();
    expect(result.fees.totalCadEquivalent).toBeNull();
    expect(result.notes.join(' ')).toContain('stale or missing provenance');
    const view = toTierRoiResultsView(result);
    expect(view.bestOption).toBe('none');
    expect(view.netSavings).toBeNull();
    expect(view.roiPercent).toBeNull();
  });

  it('suppresses outputs when rate provenance is missing entirely', () => {
    const noFundProvenance = computeTierRoiScenario(
      { ...BASE_INPUTS, fundPriceProvenance: null },
      FEE_CONFIG_FOR_MATH_TESTS,
      { asOf: AS_OF },
    );
    expect(noFundProvenance.ratesStale).toBe(true);
    expect(noFundProvenance.rateFreshness.fundPrice.reason).toBe('missing_provenance');
    expect(noFundProvenance.recommendation).toEqual({ kind: 'none', reason: 'stale_inputs' });
    expect(noFundProvenance.netSavingsCad).toBeNull();

    const noMarketProvenance = computeTierRoiScenario(
      { ...BASE_INPUTS, marketCreditProvenance: undefined },
      FEE_CONFIG_FOR_MATH_TESTS,
      { asOf: AS_OF },
    );
    expect(noMarketProvenance.ratesStale).toBe(true);
    expect(noMarketProvenance.rateFreshness.marketCreditPrice.reason).toBe('missing_provenance');
    expect(noMarketProvenance.grossSavingsCad).toBeNull();
  });

  it('treats unparseable, future-dated, and unsourced rates as stale', () => {
    for (const bad of [
      provenance('not-a-date'),
      provenance('2027-01-01'), // after the injected asOf date
      { ...provenance(FRESH_RATE_DATE), source: '   ' },
      { ...provenance(FRESH_RATE_DATE), maxAgeDays: 0 },
    ]) {
      const result = computeTierRoiScenario(
        { ...BASE_INPUTS, marketCreditProvenance: bad },
        FEE_CONFIG_FOR_MATH_TESTS,
        { asOf: AS_OF },
      );
      expect(result.ratesStale).toBe(true);
      expect(result.recommendation.kind).toBe('none');
      expect(result.grossSavingsCad).toBeNull();
    }
  });

  it('honours the injected asOf planning date so staleness is deterministic', () => {
    const inputs: TierRoiInputs = {
      ...BASE_INPUTS,
      fundPriceProvenance: provenance('2026-06-01', 90),
      marketCreditProvenance: provenance('2026-06-01', 30),
    };
    // FX evidence is dated near the injected evaluation date so the FX gate
    // stays fresh while the rate-freshness window is exercised.
    const feeAt = (asOf: Date): TierFeeConfig => ({
      ...FEE_CONFIG_FOR_MATH_TESTS,
      usdToCadEvidence: {
        sourceUrl: 'https://example.test/fx-quote',
        observedAt: asOf.toISOString(),
        claimLabel: 'validated',
      },
    });
    const fresh = computeTierRoiScenario(inputs, feeAt(new Date('2026-06-15T00:00:00.000Z')), {
      asOf: new Date('2026-06-15T00:00:00.000Z'),
    });
    expect(fresh.ratesStale).toBe(false);
    expect(fresh.recommendation).toEqual({ kind: 'market_credits' });
    expect(fresh.grossSavingsCad).toBe(1_400_000);

    const aged = computeTierRoiScenario(inputs, feeAt(new Date('2026-07-05T00:00:00.000Z')), {
      asOf: new Date('2026-07-05T00:00:00.000Z'), // market rate now >30 days old
    });
    expect(aged.ratesStale).toBe(true);
    expect(aged.rateFreshness.marketCreditPrice.reason).toBe('stale');
    expect(aged.rateFreshness.fundPrice.stale).toBe(false);
    expect(aged.recommendation).toEqual({ kind: 'none', reason: 'stale_inputs' });
  });
});
