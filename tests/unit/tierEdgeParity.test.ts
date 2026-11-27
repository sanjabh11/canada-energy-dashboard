import { describe, expect, it } from 'vitest';
import {
  calculateTierScenario as calculateTierScenarioLocal,
  evaluateRateWatchdog as evaluateRateWatchdogLocal,
} from '../../src/lib/mlForecasting';
import {
  calculateTierScenario as calculateTierScenarioEdge,
  evaluateRateWatchdog as evaluateRateWatchdogEdge,
  fillTierPriceDefaultsFromRate,
  tierPricesFullySupplied,
} from '../../supabase/functions/_shared/mlForecasting';
import { calculateComplianceCosts } from '../../src/lib/tierPricing';

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
  expect(edge.pathways.directInvestment.creditedTonnes).toBe(
    local.pathways.directInvestment.creditedTonnes,
  );
  expect(edge.pathways.directInvestment.residualTonnes).toBe(
    local.pathways.directInvestment.residualTonnes,
  );
  expect(edge.bestPathway).toBe(local.bestPathway);
  expect(edge.estimatedSavingsCad).toBe(local.estimatedSavingsCad);
  expect(edge.annualEmissionsTonnes).toBe(local.annualEmissionsTonnes);
  expect(edge.meta.valid_at).toBe(local.meta.valid_at);
  // Freshness/confidence metadata must match too — a lastVerifiedAt
  // divergence that produces identical warnings but different staleness
  // would otherwise slip through parity.
  expect(edge.meta.staleness_status).toBe(local.meta.staleness_status);
  expect(edge.meta.confidence_score).toBe(local.meta.confidence_score);
  expect(edge.meta.data_sources?.map((s: any) => s.lastUpdated)).toEqual(
    local.meta.data_sources?.map((s: any) => s.lastUpdated),
  );
  expect(edge.warnings).toEqual(local.warnings);
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

  it('matches the local engine on odd tonnage (19,999 t — fractional blend rounding)', () => {
    const { edge, local } = runBoth({
      ...BASE_INPUT,
      benchmarkExceedanceTonnes: 19_999,
      complianceYear: 2025,
      asOfDate: '2025-06-01',
    });
    expectEngineParity(edge, local);
  });
});

describe('tier-simulator handler price fill — precedence over tier_market_rates', () => {
  const rateRow = {
    market_credit_price_cad_per_tonne: 30,
    fund_price_cad_per_tonne: 95,
    observed_at: '2026-10-01',
  };
  const rest: Record<string, unknown> = { ...BASE_INPUT };
  delete rest.creditAssumptions;
  const callerPrices = { marketCreditPriceCadPerTonne: 20, fundPriceCadPerTonne: 90 };

  it.each([
    ['camelCase container', { creditAssumptions: { marketCreditPriceCadPerTonne: 20, fundPriceCadPerTonne: 90 } }],
    ['snake_case container', { credit_assumptions: { market_credit_price_cad_per_tonne: 20, fund_price_cad_per_tonne: 90 } }],
    ['snake fields inside camel container', { creditAssumptions: { market_credit_price_cad_per_tonne: 20, fund_price_cad_per_tonne: 90 } }],
    ['camel fields inside snake container', { credit_assumptions: { marketCreditPriceCadPerTonne: 20, fundPriceCadPerTonne: 90 } }],
    ['split across containers', { creditAssumptions: { marketCreditPriceCadPerTonne: 20 }, credit_assumptions: { fund_price_cad_per_tonne: 90 } }],
  ])('honors %s caller prices — the DB row must not displace them', (_label, assumptions) => {
    const body = { ...rest, ...assumptions };
    expect(tierPricesFullySupplied(body)).toBe(true);
    const filled = fillTierPriceDefaultsFromRate(body, rateRow);
    // The engine must price with the caller's 20/90 — equivalent to an
    // explicit canonical-camel run (20 vs BASE_INPUT's 25 discriminates).
    const expected = calculateTierScenarioEdge({ ...rest, creditAssumptions: callerPrices });
    const result = calculateTierScenarioEdge(filled);
    expect(result.pathways.marketCredits.costCad).toBe(expected.pathways.marketCredits.costCad);
    expect(result.pathways.fundPayment.costCad).toBe(expected.pathways.fundPayment.costCad);
  });

  it('fills only the missing price on a partial snake_case payload', () => {
    const body = { ...rest, credit_assumptions: { market_credit_price_cad_per_tonne: 20 } };
    expect(tierPricesFullySupplied(body)).toBe(false);
    const filled = fillTierPriceDefaultsFromRate(body, rateRow);
    const filledAssumptions = filled.creditAssumptions as Record<string, unknown>;
    expect(filledAssumptions.marketCreditPriceCadPerTonne).toBe(20);
    expect(filledAssumptions.fundPriceCadPerTonne).toBe(95);
    // Mixed provenance: the caller's price must NOT inherit the row's
    // observed_at — the fill stays unprovenanced rather than misattributing
    // DB freshness to caller input.
    expect(filledAssumptions.lastVerifiedAt).toBeUndefined();
    expect(filled.credit_assumptions).toBeUndefined();
    // Fund price must come from the row, not the engine default — same 95
    // here, so assert the field value directly above.
  });

  it('keeps caller prices with engine defaults when no rate row is available', () => {
    const body = { ...rest, credit_assumptions: { market_credit_price_cad_per_tonne: 20 } };
    const filled = fillTierPriceDefaultsFromRate(body, null);
    const noRowAssumptions = filled.creditAssumptions as Record<string, unknown>;
    expect(noRowAssumptions.marketCreditPriceCadPerTonne).toBe(20);
    expect(noRowAssumptions.fundPriceCadPerTonne).toBe(95);
    expect(filled.credit_assumptions).toBeUndefined();
    expect(fillTierPriceDefaultsFromRate(rest, null)).toEqual(rest);
  });

  it('normalizes a snake_case container into the canonical camelCase container', () => {
    const filled = fillTierPriceDefaultsFromRate(
      { ...rest, credit_assumptions: { market_credit_price_cad_per_tonne: 20, fund_price_cad_per_tonne: 90 } },
      rateRow,
    );
    const normAssumptions = filled.creditAssumptions as Record<string, unknown>;
    expect(normAssumptions.marketCreditPriceCadPerTonne).toBe(20);
    expect(normAssumptions.fundPriceCadPerTonne).toBe(90);
    expect(filled.credit_assumptions).toBeUndefined();
  });
});

describe('calculateComplianceCosts — zero obligation guard', () => {
  it('returns 0% savings instead of NaN when exceedance is zero', () => {
    const costs = calculateComplianceCosts(0);
    expect(Number.isFinite(costs.savingsPercentage)).toBe(true);
    expect(costs.savingsPercentage).toBe(0);
    expect(costs.arbitrageSavings).toBe(0);
  });
});

describe('malformed input hardening', () => {
  const RATE_ROW = {
    market_credit_price_cad_per_tonne: 30,
    fund_price_cad_per_tonne: 95,
    observed_at: '2026-10-01',
  };

  it.each(['abc', 'NaN', {}, [], Infinity, -Infinity, '   '])(
    'treats malformed market price %p as not supplied — DB/default fill applies',
    (badPrice) => {
      const rest: Record<string, unknown> = { ...BASE_INPUT };
      delete rest.creditAssumptions;
      const body = {
        ...rest,
        credit_assumptions: {
          market_credit_price_cad_per_tonne: badPrice,
          fund_price_cad_per_tonne: 90,
        },
      };
      // An invalid price does not count as "fully supplied" → DB fill proceeds.
      expect(tierPricesFullySupplied(body)).toBe(false);
      const filled = fillTierPriceDefaultsFromRate(body, RATE_ROW);
      const assumptions = filled.creditAssumptions as Record<string, unknown>;
      expect(assumptions.marketCreditPriceCadPerTonne).toBe(30);
      expect(assumptions.fundPriceCadPerTonne).toBe(90);
      // Engine never prices market credits at $0/NaN because of malformed input.
      const result = calculateTierScenarioEdge({
        ...BASE_INPUT,
        creditAssumptions: {
          ...BASE_INPUT.creditAssumptions,
          marketCreditPriceCadPerTonne: badPrice,
        },
      });
      expect(Number.isFinite(result.pathways.marketCredits.costCad)).toBe(true);
      expect(result.pathways.marketCredits.costCad).toBeGreaterThan(0);
    },
  );

  it('keeps edge/local parity on malformed prices', () => {
    const { edge, local } = runBoth({
      ...BASE_INPUT,
      creditAssumptions: {
        ...BASE_INPUT.creditAssumptions,
        marketCreditPriceCadPerTonne: 'abc',
      },
    });
    expectEngineParity(edge, local);
    expect(edge.pathways.marketCredits.costCad).toBeGreaterThan(0);
  });

  it.each(['garbage', '2026/06/01', null, undefined])(
    'normalizes malformed asOfDate %p to a valid date on both engines',
    (badDate) => {
      const { edge, local } = runBoth({ ...BASE_INPUT, asOfDate: badDate });
      expect(edge.meta.valid_at).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
      expect(local.meta.valid_at).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
      expectEngineParity(edge, local);
    },
  );
});

describe('engine parity — snake_case payloads', () => {
  it('honors snake_case fields identically on both engines', () => {
    const snakeInput: Record<string, unknown> = {
      annual_emissions_tonnes: 150_000,
      benchmark_exceedance_tonnes: 19_999,
      direct_investment_capex_cad: 500_000,
      compliance_year: 2030,
      as_of_date: '2030-06-01',
      discount_rate: 0.08,
      credit_assumptions: {
        fund_price_cad_per_tonne: 95,
        market_credit_price_cad_per_tonne: 25,
        direct_investment_credit_rate: 0,
        last_verified_at: '2026-06-02',
      },
    };
    const { edge, local } = runBoth(snakeInput);
    expectEngineParity(edge, local);
  });
});

describe('fillTierPriceDefaultsFromRate — canonical early return', () => {
  it('returns the body unchanged when camel prices are complete and no rate row exists', () => {
    const body = { ...BASE_INPUT };
    expect(fillTierPriceDefaultsFromRate(body, null)).toEqual(body);
  });
});

describe('price precedence — explicit zero, missing row, mixed containers', () => {
  it('preserves an explicit zero price as caller-supplied', () => {
    const body = {
      ...BASE_INPUT,
      creditAssumptions: {
        marketCreditPriceCadPerTonne: 0,
        fundPriceCadPerTonne: 90,
      },
    };
    expect(tierPricesFullySupplied(body)).toBe(true);
    const filled = fillTierPriceDefaultsFromRate(body, null);
    const assumptions = filled.creditAssumptions as Record<string, unknown>;
    expect(assumptions.marketCreditPriceCadPerTonne).toBe(0);
    expect(assumptions.fundPriceCadPerTonne).toBe(90);
  });

  it('fills only the missing price from the rate row and never overwrites caller values', () => {
    const body = {
      ...BASE_INPUT,
      credit_assumptions: { market_credit_price_cad_per_tonne: 40 },
    };
    delete (body as Record<string, unknown>).creditAssumptions;
    const filled = fillTierPriceDefaultsFromRate(body, {
      market_credit_price_cad_per_tonne: 30,
      fund_price_cad_per_tonne: 95,
      observed_at: '2026-10-01',
    });
    const assumptions = filled.creditAssumptions as Record<string, unknown>;
    expect(assumptions.marketCreditPriceCadPerTonne).toBe(40);
    expect(assumptions.fundPriceCadPerTonne).toBe(95);
  });

  it('applies defaults when no rate row exists and only one price is supplied', () => {
    const body = {
      ...BASE_INPUT,
      credit_assumptions: { market_credit_price_cad_per_tonne: 40 },
    };
    delete (body as Record<string, unknown>).creditAssumptions;
    const filled = fillTierPriceDefaultsFromRate(body, null);
    const assumptions = filled.creditAssumptions as Record<string, unknown>;
    expect(assumptions.marketCreditPriceCadPerTonne).toBe(40);
    expect(assumptions.fundPriceCadPerTonne).toBe(95);
  });
});

describe('numeric boundary and warning parity', () => {
  it('caps finite-but-huge prices identically on both engines', () => {
    const { edge, local } = runBoth({
      ...BASE_INPUT,
      creditAssumptions: {
        ...BASE_INPUT.creditAssumptions,
        marketCreditPriceCadPerTonne: 1e9,
        fundPriceCadPerTonne: 1e9,
      },
    });
    expectEngineParity(edge, local);
    expect(Number.isFinite(edge.pathways.marketCredits.costCad)).toBe(true);
    expect(Number.isFinite(edge.pathways.fundPayment.costCad)).toBe(true);
  });

  it('keeps parity on fractional tonnage', () => {
    const { edge, local } = runBoth({
      ...BASE_INPUT,
      benchmarkExceedanceTonnes: 19_999.5,
      annualEmissionsTonnes: 149_999.9,
    });
    expectEngineParity(edge, local);
  });

  it('keeps parity when the assumptions container is absent entirely', () => {
    const input: Record<string, unknown> = { ...BASE_INPUT };
    delete input.creditAssumptions;
    const { edge, local } = runBoth(input);
    expectEngineParity(edge, local);
  });

  it('emits the discount-range warning identically on both engines', () => {
    const { edge, local } = runBoth({ ...BASE_INPUT, discountRate: 0.9 });
    expectEngineParity(edge, local);
    expect(edge.warnings.some((w: string) => w.includes('Discount rate'))).toBe(true);
  });

  it('keeps parity on a non-string lastVerifiedAt (epoch ms)', () => {
    const { edge, local } = runBoth({
      ...BASE_INPUT,
      creditAssumptions: {
        ...BASE_INPUT.creditAssumptions,
        lastVerifiedAt: 1748900000000,
      },
    });
    expectEngineParity(edge, local);
  });

  it('keeps parity when a negative price is supplied (clamped to 0)', () => {
    const { edge, local } = runBoth({
      ...BASE_INPUT,
      creditAssumptions: {
        ...BASE_INPUT.creditAssumptions,
        marketCreditPriceCadPerTonne: -50,
      },
    });
    expectEngineParity(edge, local);
    expect(edge.pathways.marketCredits.priceCadPerTonne).toBe(0);
  });

  it('caps prices just above the scenario bound identically', () => {
    const { edge, local } = runBoth({
      ...BASE_INPUT,
      creditAssumptions: {
        ...BASE_INPUT.creditAssumptions,
        marketCreditPriceCadPerTonne: 1e6 + 1,
        fundPriceCadPerTonne: 1e6 + 0.5,
      },
    });
    expectEngineParity(edge, local);
    expect(edge.pathways.marketCredits.priceCadPerTonne).toBe(1e6);
  });
});

describe('rate-watchdog edge/local parity', () => {
  const WATCHDOG_SNAKE = {
    usage_kwh: 850,
    current_rate_cad_per_kwh: 0.1505,
    retailer_offers: [
      { id: 'a', name: 'Cheap', fixed_rate_cad_per_kwh: 0.129, term_months: 12, cancellation_fee_cad: 100 },
      { id: 'b', name: 'Legacy', fixedRate: 14.5, term: 24 }, // legacy cents spelling
      { id: 'c', name: 'Bad', fixed_rate_cad_per_kwh: 'garbage' },
    ],
    as_of_date: '2030-06-01',
  };

  const comparable = (r: any) => ({
    province: r.province,
    provider: r.provider,
    usageKwh: r.usageKwh,
    currentRateCadPerKwh: r.currentRateCadPerKwh,
    monthly: r.estimatedMonthlySavingsCad,
    yearly: r.estimatedYearlySavingsCad,
    offerRates: r.offers.map((o: any) => o.fixedRateCadPerKwh),
    offerTerms: r.offers.map((o: any) => o.termMonths),
    offerYearly: r.offers.map((o: any) => o.estimatedYearlySavingsCad),
    offerMonthly: r.offers.map((o: any) => o.estimatedMonthlySavingsCad),
    bestOfferId: r.bestOffer?.id ?? null,
  });

  it('produces identical numbers and defaults on snake_case + legacy offer spellings', () => {
    const edge = evaluateRateWatchdogEdge(WATCHDOG_SNAKE);
    const local = evaluateRateWatchdogLocal(WATCHDOG_SNAKE);
    expect(comparable(edge)).toEqual(comparable(local));
  });

  it('produces identical results on camelCase input', () => {
    const camel = {
      province: 'AB',
      provider: 'RoLR',
      usageKwh: 850,
      currentRateCadPerKwh: 0.1505,
      retailerOffers: [
        { id: 'a', name: 'Cheap', fixedRateCadPerKwh: 0.129, termMonths: 12, cancellationFeeCad: 100 },
      ],
      asOfDate: '2030-06-01',
    };
    expect(comparable(evaluateRateWatchdogEdge(camel))).toEqual(comparable(evaluateRateWatchdogLocal(camel)));
  });

  it('never emits NaN/Infinity on hostile offers', () => {
    const hostile = {
      usage_kwh: 1e308,
      current_rate_cad_per_kwh: -5,
      retailer_offers: [{ id: 'x', fixed_rate_cad_per_kwh: Infinity, cancellation_fee_cad: -1e9 }],
    };
    const { offers, estimatedYearlySavingsCad } = evaluateRateWatchdogEdge(hostile);
    expect(Number.isFinite(offers[0].fixedRateCadPerKwh)).toBe(true);
    expect(Number.isFinite(estimatedYearlySavingsCad)).toBe(true);
  });
});
