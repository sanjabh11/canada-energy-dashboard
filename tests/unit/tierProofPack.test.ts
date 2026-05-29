import { describe, expect, it } from 'vitest';
import { DEFAULT_TIER_PRICING } from '../../src/lib/tierPricing';
import {
  buildTierAppendixMarkdown,
  buildTierAssumptions,
  buildTierMemoDescriptor,
  buildTierProofBundle,
  buildTierPricingFreshnessGate,
  type TierProofSnapshot,
} from '../../src/lib/tierProofPack';

function buildSnapshot(overrides: Partial<TierProofSnapshot> = {}): TierProofSnapshot {
  return {
    annualEmissions: 162000,
    benchmarkExceedance: 24000,
    directInvestCapex: 650000,
    pricing: DEFAULT_TIER_PRICING,
    marketPrice: 27,
    results: {
      fundPayment: 2280000,
      marketCredits: 648000,
      directInvestment: 910000,
      ceipFee: 120000,
      netSavings: 1250000,
      roiPercent: 1041,
      bestOption: 'market_credits',
    },
    simulatorResult: null,
    simulatorSource: 'local_fallback',
    liveTierMarketRateSource: null,
    ...overrides,
  };
}

describe('tierProofPack', () => {
  it('marks fallback pricing honestly when no live market source is present', () => {
    const bundle = buildTierProofBundle(buildSnapshot());

    expect(bundle.title).toBe('TIER CFO memo pack');
    expect(bundle.artifacts).toHaveLength(3);
    expect(bundle.artifacts[0].isFallback).toBe(true);
    expect(bundle.artifacts[0].claimLabel).toBe('estimated');
    expect(bundle.artifacts[0].verificationStatus).toBe('source_stale');
    expect(buildTierPricingFreshnessGate(buildSnapshot()).blocksStrongSavingsClaim).toBe(true);
  });

  it('promotes live provenance into the memo descriptor when a validated rate exists', () => {
    const snapshot = buildSnapshot({
      simulatorSource: 'edge',
      liveTierMarketRateSource: {
        sourceName: 'ICAP Carbon Action',
        sourceUrl: 'https://example.com/icap',
        observedAt: '2026-04-15T00:00:00.000Z',
        claimLabel: 'validated',
      },
    });

    const bundle = buildTierProofBundle(snapshot);
    const descriptor = buildTierMemoDescriptor(snapshot);
    const appendix = buildTierAppendixMarkdown(snapshot);
    const provenanceSection = descriptor.sections.find((section) => section.heading === 'Pricing provenance');

    expect(bundle.artifacts[0].isFallback).toBe(false);
    expect(bundle.artifacts[0].claimLabel).toBe('validated');
    expect(bundle.artifacts[0].doNotClaim).toContain('Guaranteed savings');
    expect(buildTierAssumptions(snapshot).join(' ')).toContain('source-dated');
    expect(buildTierAssumptions(snapshot).join(' ')).not.toMatch(/live[-_]observed/);
    expect(buildTierAssumptions(snapshot).join(' ')).toContain('Direct investment');
    expect(provenanceSection?.body).toContain('Market price source: ICAP Carbon Action observed 2026-04-15T00:00:00.000Z');
    expect(descriptor.sections.find((section) => section.heading === 'Direct-investment sensitivity')).toBeTruthy();
    expect(appendix).toContain('# TIER scenario appendix');
    expect(appendix).toContain('Market credits: CAD 648,000');
  });
});
