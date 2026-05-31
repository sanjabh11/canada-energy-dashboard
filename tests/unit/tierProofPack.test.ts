import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIER_PRICING,
  formatPricingWithProvenance,
  isPricingStale,
} from '../../src/lib/tierPricing';
import {
  buildTierAppendixMarkdown,
  buildTierAssumptions,
  buildTierMemoDescriptor,
  buildTierProofBundle,
  buildTierPricingFreshnessGate,
  buildTierSourceCurrencyChecklistMarkdown,
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
  it('uses the current 2026 frozen TIER headline-price basis with source provenance', () => {
    expect(DEFAULT_TIER_PRICING.fundPrice).toBe(95);
    expect(DEFAULT_TIER_PRICING.isFrozen).toBe(true);
    expect(DEFAULT_TIER_PRICING.lastVerifiedAt).toBe('2026-05-31');
    expect(DEFAULT_TIER_PRICING.sourceUrl).toContain('pm.gc.ca');
    expect(DEFAULT_TIER_PRICING.headlinePriceSchedule).toEqual(expect.arrayContaining([
      { year: 2026, priceCadPerTonne: 95 },
      { year: 2030, priceCadPerTonne: 115 },
      { year: 2040, priceCadPerTonne: 140 },
    ]));
    expect(DEFAULT_TIER_PRICING.priceFloorSchedule).toEqual(expect.arrayContaining([
      { year: 2030, priceCadPerTonne: 60 },
      { year: 2040, priceCadPerTonne: 110 },
    ]));
    expect(DEFAULT_TIER_PRICING.policyNotes.join(' ')).toContain('June 30');
    expect(formatPricingWithProvenance()).toContain('Fund: $95/t frozen');
    expect(isPricingStale(DEFAULT_TIER_PRICING, new Date('2026-05-31T12:00:00.000Z'))).toBe(false);
  });

  it('marks fallback pricing honestly when no live market source is present', () => {
    const bundle = buildTierProofBundle(buildSnapshot());

    expect(bundle.title).toBe('TIER CFO memo pack');
    expect(bundle.artifacts).toHaveLength(4);
    expect(bundle.artifacts[0].isFallback).toBe(true);
    expect(bundle.artifacts[0].claimLabel).toBe('estimated');
    expect(bundle.artifacts[0].verificationStatus).toBe('source_stale');
    expect(bundle.artifacts[0].doNotClaim).toContain('Price-floor or future-year credit eligibility without current Alberta guidance');
    expect(bundle.artifacts[3].label).toBe('Source currency checklist');
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
    const sourceCurrency = buildTierSourceCurrencyChecklistMarkdown(snapshot);
    const provenanceSection = descriptor.sections.find((section) => section.heading === 'Pricing provenance');

    expect(bundle.artifacts[0].isFallback).toBe(false);
    expect(bundle.artifacts[0].claimLabel).toBe('validated');
    expect(bundle.artifacts[0].doNotClaim).toContain('Guaranteed savings');
    expect(buildTierAssumptions(snapshot).join(' ')).toContain('source-dated');
    expect(buildTierAssumptions(snapshot).join(' ')).not.toMatch(/live[-_]observed/);
    expect(buildTierAssumptions(snapshot).join(' ')).toContain('Direct investment');
    expect(buildTierAssumptions(snapshot).join(' ')).toContain('Minimum transfer-price floor schedule begins in 2030');
    expect(buildTierAssumptions(snapshot).join(' ')).toContain('Verified annual compliance reports are due by June 30');
    expect(provenanceSection?.body).toContain('Market price source: ICAP Carbon Action observed 2026-04-15T00:00:00.000Z');
    const provenanceBody = Array.isArray(provenanceSection?.body)
      ? provenanceSection.body.join(' ')
      : provenanceSection?.body ?? '';
    expect(provenanceBody).toContain('Headline price schedule: 2026 CAD 95/t');
    expect(provenanceBody).toContain('Future price-floor schedule: 2030 CAD 60/t');
    expect(provenanceBody).toContain('Official Alberta TIER source');
    expect(descriptor.sections.find((section) => section.heading === 'Direct-investment sensitivity')).toBeTruthy();
    expect(appendix).toContain('# TIER scenario appendix');
    expect(appendix).toContain('Market credits: CAD 648,000');
    expect(sourceCurrency).toContain('# TIER source currency checklist');
    expect(sourceCurrency).toContain('Fall 2025 amendments');
    expect(sourceCurrency).toContain('Direct Investment standard status');
    expect(sourceCurrency).toContain('June 30 annual compliance reporting requirement');
    expect(sourceCurrency).toContain('Replace fallback market pricing');
  });
});
