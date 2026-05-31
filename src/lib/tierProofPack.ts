import type { TierScenarioResult } from './mlForecasting';
import { isPricingStale, type TIERPricingConfig } from './tierPricing';
import type {
  ProofArtifactDefinition,
  ProofDocumentDescriptor,
  ProofPackBundle,
} from './proofPack';

export interface TierRoiResults {
  fundPayment: number;
  marketCredits: number;
  directInvestment: number;
  ceipFee: number;
  netSavings: number;
  roiPercent: number;
  bestOption: 'market_credits' | 'direct_investment';
}

export interface TierProofSnapshot {
  annualEmissions: number;
  benchmarkExceedance: number;
  directInvestCapex: number;
  pricing: TIERPricingConfig;
  marketPrice: number;
  results: TierRoiResults;
  simulatorResult: TierScenarioResult | null;
  simulatorSource: 'edge' | 'local_fallback';
  liveTierMarketRateSource: {
    sourceName?: string;
    sourceUrl?: string;
    observedAt?: string;
    claimLabel?: 'estimated' | 'advisory' | 'validated';
  } | null;
}

export function buildTierPricingFreshnessGate(snapshot: TierProofSnapshot): {
  status: 'fresh' | 'stale';
  message: string;
  blocksStrongSavingsClaim: boolean;
} {
  const stale = isPricingStale(snapshot.pricing) || !snapshot.liveTierMarketRateSource;
  return {
    status: stale ? 'stale' : 'fresh',
    message: stale
      ? 'Pricing must be refreshed with a live quote, registry-backed source, or buyer-approved source before making strong savings claims.'
      : 'Pricing has a current source attachment for scenario review; final compliance decisions still require buyer approval.',
    blocksStrongSavingsClaim: stale,
  };
}

function buildArtifact(
  id: string,
  label: string,
  format: ProofArtifactDefinition['format'],
  filename: string,
  description: string,
  snapshot: TierProofSnapshot,
): ProofArtifactDefinition {
  const claimLabel = snapshot.liveTierMarketRateSource?.claimLabel
    ?? snapshot.simulatorResult?.meta.claim_label
    ?? 'estimated';
  const freshnessGate = buildTierPricingFreshnessGate(snapshot);
  return {
    id,
    label,
    format,
    filename,
    audience: 'CFO or compliance lead',
    generatedAt: new Date().toISOString(),
    jurisdiction: 'Alberta',
    sourceSummary: snapshot.liveTierMarketRateSource
      ? `${snapshot.pricing.source} plus ${snapshot.liveTierMarketRateSource.sourceName ?? 'market source'}`
      : `${snapshot.pricing.source} with fallback market pricing`,
    sourceManifestId: `tier-pricing-${snapshot.pricing.effectiveDate}-${snapshot.pricing.lastVerifiedAt}`,
    verificationStatus: freshnessGate.status === 'stale' ? 'source_stale' : 'verified_source',
    doNotClaim: [
      'Real-time credit price',
      'Trading, tax, or legal advice',
      'Guaranteed savings',
      'Direct-investment eligibility without buyer-specific validation',
      'Price-floor or future-year credit eligibility without current Alberta guidance',
    ],
    assumptions: buildTierAssumptions(snapshot),
    claimLabel,
    isFallback: !snapshot.liveTierMarketRateSource || snapshot.simulatorSource === 'local_fallback',
    freshnessState: snapshot.liveTierMarketRateSource?.observedAt ?? snapshot.pricing.lastVerifiedAt,
    boundedClaimsDisclaimer: 'This memo supports scenario review and pilot qualification only. It is not binding trading, tax, or legal advice.',
    description,
  };
}

export function buildTierAssumptions(snapshot: TierProofSnapshot): string[] {
  const headlineSchedule = snapshot.pricing.headlinePriceSchedule
    .map(({ year, priceCadPerTonne }) => `${year}: CAD ${priceCadPerTonne}/t`)
    .join('; ');
  const priceFloorSchedule = snapshot.pricing.priceFloorSchedule
    .map(({ year, priceCadPerTonne }) => `${year}: CAD ${priceCadPerTonne}/t`)
    .join('; ');

  return [
    `Fund price basis is CAD ${snapshot.pricing.fundPrice}/t effective ${snapshot.pricing.effectiveDate}.`,
    `Market credit pricing is ${snapshot.liveTierMarketRateSource ? 'source-dated' : 'fallback'} at CAD ${snapshot.marketPrice}/t; the memo does not claim real-time pricing.`,
    `Direct investment uses the route’s current credit-rate assumption and remains sensitive to Alberta TIER eligibility, timing, credit-reactivation rules, and buyer-specific verification.`,
    `Official headline price schedule carried for scenario context: ${headlineSchedule}.`,
    `Minimum transfer-price floor schedule begins in 2030 for future-year planning context: ${priceFloorSchedule}.`,
    ...snapshot.pricing.policyNotes,
    `The route models one facility scenario at a time and uses CEIP fee logic shown in the route UI.`,
  ];
}

export function buildTierProofBundle(snapshot: TierProofSnapshot): ProofPackBundle {
  return {
    title: 'TIER CFO memo pack',
    summary: 'Export a finance-readable TIER compliance memo with pricing provenance, scenario assumptions, and a direct next step for a paid pilot.',
    artifacts: [
      buildArtifact(
        'tier-cfo-memo-pdf',
        'CFO memo PDF',
        'pdf',
        `tier_cfo_memo_${new Date().toISOString().slice(0, 10)}.pdf`,
        'Board-ready scenario memo for one facility compliance decision.',
        snapshot,
      ),
      buildArtifact(
        'tier-cfo-memo-html',
        'CFO memo HTML',
        'html',
        `tier_cfo_memo_${new Date().toISOString().slice(0, 10)}.html`,
        'Browser-readable memo with the same scenario framing as the PDF.',
        snapshot,
      ),
      buildArtifact(
        'tier-raw-appendix',
        'Raw scenario appendix',
        'md',
        `tier_scenario_appendix_${new Date().toISOString().slice(0, 10)}.md`,
        'Appendix with raw pathway numbers, warnings, and simulator provenance.',
        snapshot,
      ),
    ],
  };
}

export function buildTierMemoDescriptor(snapshot: TierProofSnapshot): ProofDocumentDescriptor {
  const recommendation = snapshot.results.bestOption === 'market_credits' ? 'Buy market credits' : 'Use direct investment';
  return {
    definition: buildArtifact(
      'tier-cfo-memo',
      'CFO memo',
      'pdf',
      `tier_cfo_memo_${new Date().toISOString().slice(0, 10)}.pdf`,
      'Finance-readable memo for the current facility scenario.',
      snapshot,
    ),
    title: 'TIER compliance decision memo',
    summary: 'One-facility compliance comparison across fund payment, market credits, and direct investment with explicit source provenance.',
    sections: [
      {
        heading: 'Scenario inputs',
        kind: 'bullet_list',
        body: [
          `Annual emissions: ${snapshot.annualEmissions.toLocaleString()} tCO2e`,
          `Benchmark exceedance: ${snapshot.benchmarkExceedance.toLocaleString()} tonnes`,
          `Direct investment capex: CAD ${snapshot.directInvestCapex.toLocaleString()}`,
        ],
      },
      {
        heading: 'Pathway comparison',
        kind: 'bullet_list',
        body: [
          `Fund payment: CAD ${snapshot.results.fundPayment.toLocaleString()}`,
          `Market credits: CAD ${snapshot.results.marketCredits.toLocaleString()}`,
          `Direct investment pathway: CAD ${snapshot.results.directInvestment.toLocaleString()}`,
          `CEIP fee: CAD ${snapshot.results.ceipFee.toLocaleString()}`,
          `Net savings: CAD ${snapshot.results.netSavings.toLocaleString()} (${snapshot.results.roiPercent.toFixed(0)}% ROI)`,
        ],
      },
      {
        heading: 'Pricing provenance',
        kind: 'bullet_list',
        body: [
          `Fund price source: ${snapshot.pricing.source} (${snapshot.pricing.effectiveDate})`,
          snapshot.liveTierMarketRateSource
            ? `Market price source: ${snapshot.liveTierMarketRateSource.sourceName ?? 'live market source'} observed ${snapshot.liveTierMarketRateSource.observedAt ?? 'unknown date'}`
            : `Market price source: fallback pricing verified ${snapshot.pricing.lastVerifiedAt}`,
          `Headline price schedule: ${snapshot.pricing.headlinePriceSchedule.map(({ year, priceCadPerTonne }) => `${year} CAD ${priceCadPerTonne}/t`).join('; ')}`,
          `Future price-floor schedule: ${snapshot.pricing.priceFloorSchedule.map(({ year, priceCadPerTonne }) => `${year} CAD ${priceCadPerTonne}/t`).join('; ')}`,
          `Scenario engine: ${snapshot.simulatorResult?.meta.model_version ?? 'tier-deterministic-v1'} via ${snapshot.simulatorSource}`,
          `Freshness gate: ${buildTierPricingFreshnessGate(snapshot).message}`,
        ],
      },
      {
        heading: 'Direct-investment sensitivity',
        kind: 'bullet_list',
        body: [
          `Base direct-investment capex: CAD ${snapshot.directInvestCapex.toLocaleString()}`,
          `Low sensitivity (-20% capex): CAD ${(snapshot.directInvestCapex * 0.8).toLocaleString()}`,
          `High sensitivity (+20% capex): CAD ${(snapshot.directInvestCapex * 1.2).toLocaleString()}`,
          'Direct-investment economics remain sensitive to eligibility, credit creation timing, verification cost, and buyer capital constraints.',
        ],
      },
      {
        heading: 'Recommendation',
        kind: 'paragraphs',
        body: [
          `${recommendation} is currently the lowest-cost route under the assumptions above.`,
          'Use this memo to qualify a pilot that validates live pricing, buyer-specific assumptions, and the final compliance-year decision path.',
        ],
      },
    ],
    nextStep: 'Book a pilot review with finance and compliance stakeholders, then replace the starter assumptions with facility-specific numbers.',
  };
}

export function buildTierAppendixMarkdown(snapshot: TierProofSnapshot): string {
  const warnings = snapshot.simulatorResult?.warnings ?? [];
  return [
    '# TIER scenario appendix',
    '',
    '## Raw pathway values',
    `- Fund payment: CAD ${snapshot.results.fundPayment.toLocaleString()}`,
    `- Market credits: CAD ${snapshot.results.marketCredits.toLocaleString()}`,
    `- Direct investment: CAD ${snapshot.results.directInvestment.toLocaleString()}`,
    `- CEIP fee: CAD ${snapshot.results.ceipFee.toLocaleString()}`,
    `- Net savings: CAD ${snapshot.results.netSavings.toLocaleString()}`,
    '',
    '## Warnings',
    ...(warnings.length > 0 ? warnings.map((warning) => `- ${warning}`) : ['- No additional warnings in the current simulator response']),
  ].join('\n');
}
