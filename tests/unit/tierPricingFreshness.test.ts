import { describe, expect, it } from 'vitest';
import {
  buildTierAppendixMarkdown,
  buildTierMemoDescriptor,
  buildTierPricingFreshnessGate,
  type TierProofSnapshot,
} from '../../src/lib/tierProofPack';
import {
  DEFAULT_TIER_PRICING,
  getPricingDataQualityWarning,
  getTIERPricingProvenance,
  isPricingStale,
} from '../../src/lib/tierPricing';

function makeSnapshot(overrides: Partial<TierProofSnapshot> = {}): TierProofSnapshot {
  const now = Date.now();
  return {
    annualEmissions: 100_000,
    benchmarkExceedance: 1_000,
    directInvestCapex: 100_000,
    pricing: {
      ...DEFAULT_TIER_PRICING,
      lastVerifiedAt: new Date(now).toISOString().slice(0, 10),
    },
    marketPrice: 25,
    results: {
      fundPayment: 95_000,
      marketCredits: 25_000,
      directInvestment: 195_000,
      ceipFee: 1_000,
      netSavings: 20_000,
      roiPercent: 42,
      bestOption: 'market_credits',
    },
    simulatorResult: null,
    simulatorSource: 'local_fallback',
    liveTierMarketRateSource: {
      sourceName: 'Test registry quote',
      sourceUrl: 'https://example.test/market-rate',
      observedAt: new Date(now).toISOString(),
      claimLabel: 'validated',
    },
    ...overrides,
  };
}

describe('TIER pricing evidence gate', () => {
  it('treats invalid, future, and over-age pricing dates as stale', () => {
    const now = new Date('2026-10-05T12:00:00.000Z');
    expect(isPricingStale({ ...DEFAULT_TIER_PRICING, lastVerifiedAt: 'not-a-date' }, now)).toBe(true);
    expect(isPricingStale({ ...DEFAULT_TIER_PRICING, lastVerifiedAt: '2026-10-06' }, now)).toBe(true);
    expect(isPricingStale({ ...DEFAULT_TIER_PRICING, lastVerifiedAt: '2026-06-02' }, now)).toBe(true);
    expect(isPricingStale({ ...DEFAULT_TIER_PRICING, lastVerifiedAt: '2026-09-01' }, now)).toBe(false);
  });

  it('identifies the market price as a planning fallback in provenance', () => {
    expect(getTIERPricingProvenance(DEFAULT_TIER_PRICING).isFallback).toBe(true);
    expect(getPricingDataQualityWarning({
      ...DEFAULT_TIER_PRICING,
      source: `${DEFAULT_TIER_PRICING.source} (ENV OVERRIDE)`,
      lastVerifiedAt: '2026-09-01',
    })).toContain('unverified environment override');
  });

  it('accepts current dated pricing only with a validated HTTPS market source', () => {
    const gate = buildTierPricingFreshnessGate(makeSnapshot());
    expect(gate.status).toBe('fresh');
    expect(gate.blocksStrongSavingsClaim).toBe(false);
  });

  it.each([
    ['missing source', null],
    ['HTTP source', {
      sourceName: 'Test registry quote',
      sourceUrl: 'http://example.test/market-rate',
      observedAt: new Date().toISOString(),
      claimLabel: 'validated' as const,
    }],
    ['estimated source', {
      sourceName: 'Test registry quote',
      sourceUrl: 'https://example.test/market-rate',
      observedAt: new Date().toISOString(),
      claimLabel: 'estimated' as const,
    }],
    ['invalid observation date', {
      sourceName: 'Test registry quote',
      sourceUrl: 'https://example.test/market-rate',
      observedAt: 'not-a-date',
      claimLabel: 'validated' as const,
    }],
  ])('blocks strong claims for %s', (_label, source) => {
    const snapshot = makeSnapshot({
      liveTierMarketRateSource: source as TierProofSnapshot['liveTierMarketRateSource'],
    });
    const gate = buildTierPricingFreshnessGate(snapshot);
    expect(gate.status).toBe('stale');
    expect(gate.blocksStrongSavingsClaim).toBe(true);
  });

  it('blocks invalid, future, and over-age fund-price verification dates', () => {
    const invalid = makeSnapshot({ pricing: { ...DEFAULT_TIER_PRICING, lastVerifiedAt: 'unknown' } });
    const future = makeSnapshot({
      pricing: {
        ...DEFAULT_TIER_PRICING,
        lastVerifiedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      },
    });
    const old = makeSnapshot({
      pricing: {
        ...DEFAULT_TIER_PRICING,
        lastVerifiedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      },
    });

    for (const snapshot of [invalid, future, old]) {
      expect(buildTierPricingFreshnessGate(snapshot).blocksStrongSavingsClaim).toBe(true);
    }
  });

  it('withholds stale savings, ROI, and ranking from memo and appendix exports', () => {
    const snapshot = makeSnapshot({
      liveTierMarketRateSource: {
        sourceName: 'Expired registry quote',
        sourceUrl: 'https://example.test/market-rate',
        observedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        claimLabel: 'validated',
      },
    });

    const memo = buildTierMemoDescriptor(snapshot);
    const memoText = memo.sections.flatMap((section) => section.body).join('\n');
    const appendix = buildTierAppendixMarkdown(snapshot);

    expect(memoText).toContain('No pathway ranked');
    expect(memoText).toContain('Net savings and ROI withheld');
    expect(memoText).not.toContain('CAD 20,000 (42% ROI)');
    expect(appendix).toContain('Freshness gate: stale');
    expect(appendix).toContain('Net savings / ROI: withheld');
    expect(appendix).not.toContain('CAD 20,000 / 42%');
    expect(memo.nextStep).toContain('Refresh current source pricing');
  });
});
