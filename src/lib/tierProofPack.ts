import type { TierScenarioResult } from './mlForecasting';
import type { TIERPricingConfig } from './tierPricing';
import type {
  ProofArtifactDefinition,
  ProofDocumentDescriptor,
  ProofPackBundle,
} from './proofPack';

export interface TierRoiResults {
  fundPayment: number;
  marketCredits: number;
  directInvestment: number;
  ceipFee: number | null;
  netSavings: number | null;
  roiPercent: number | null;
  bestOption: 'market_credits' | 'direct_investment' | 'fund_payment' | 'none';
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

interface TierSourceCurrencyItem {
  label: string;
  sourceUrl: string;
  sourceDate: string;
  reviewedAt: string;
  currentUse: string;
  verifyBeforeOutbound: string;
  doNotClaim: string;
}

function buildTierSourceCurrencyItems(snapshot: TierProofSnapshot): TierSourceCurrencyItem[] {
  return [
    {
      label: 'Government of Alberta TIER regulation overview',
      sourceUrl: 'https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation',
      sourceDate: 'Fall 2025 amendments and Order in Council 369/2025; page reviewed 2026-06-02',
      reviewedAt: '2026-06-02',
      currentUse:
        'Compliance options, direct-investment amendment context, annual compliance report timing, verification-documents dependency, compliance-cost-containment trigger, and buyer-specific eligibility caveats.',
      verifyBeforeOutbound:
        'Confirm the Alberta page still lists the December 2025 amendments, current Direct Investment standard status, June 30 annual compliance reporting requirement, current verification-document links, and any newer compliance-workshop or guidance updates before sending a CFO memo.',
      doNotClaim:
        'Do not claim direct-investment eligibility, compliance approval, legal advice, tax treatment, or verified reporting completeness without buyer-specific review.',
    },
    {
      label: snapshot.pricing.source,
      sourceUrl: snapshot.pricing.sourceUrl,
      sourceDate: `${snapshot.pricing.effectiveDate}; implementation agreement published 2026-05-15`,
      reviewedAt: snapshot.pricing.lastVerifiedAt,
      currentUse: `Headline fund-price basis of CAD ${snapshot.pricing.fundPrice}/t plus annual headline and minimum-transfer-price schedules carried for planning context.`,
      verifyBeforeOutbound:
        'Confirm no newer Alberta or Canada-Alberta pricing guidance supersedes the May 15, 2026 implementation-agreement source, annual headline schedule, minimum transfer-price floor schedule, Direct Investment caps, or carbon contracts for difference terms before external use.',
      doNotClaim:
        'Do not claim future-year price floors, executed trade pricing, credit eligibility, carbon-contract entitlement, or binding compliance economics as final buyer advice.',
    },
    {
      label: snapshot.liveTierMarketRateSource?.sourceName ?? snapshot.pricing.marketPriceSource,
      sourceUrl: snapshot.liveTierMarketRateSource?.sourceUrl ?? snapshot.pricing.sourceUrl,
      sourceDate: snapshot.liveTierMarketRateSource?.observedAt ?? snapshot.pricing.lastVerifiedAt,
      reviewedAt: snapshot.liveTierMarketRateSource?.observedAt ?? snapshot.pricing.lastVerifiedAt,
      currentUse: `Market-credit scenario input of CAD ${snapshot.marketPrice}/t labeled ${snapshot.liveTierMarketRateSource?.claimLabel ?? 'fallback'} in the current route state.`,
      verifyBeforeOutbound:
        'Replace fallback pricing with a live quote, registry-backed source, or buyer-approved price source before making strong savings claims.',
      doNotClaim:
        'Do not claim real-time market pricing, executed trade pricing, or guaranteed savings from this scenario input.',
    },
  ];
}

export function buildTierPricingFreshnessGate(
  snapshot: TierProofSnapshot,
  asOf: Date = new Date(),
): {
  status: 'fresh' | 'stale';
  message: string;
  blocksStrongSavingsClaim: boolean;
} {
  // `asOf` is the planning evaluation date (injectable for deterministic
  // tests/exports); it is not an authoritative pricing timestamp.
  const now = asOf.getTime();
  const pricingDateText = snapshot.pricing.lastVerifiedAt;
  const pricingDate = Date.parse(
    /^\d{4}-\d{2}-\d{2}$/.test(pricingDateText) ? `${pricingDateText}T00:00:00Z` : pricingDateText,
  );
  const pricingFresh =
    Number.isFinite(pricingDate) &&
    pricingDate <= now + 5 * 60 * 1000 &&
    now - pricingDate <= 90 * 24 * 60 * 60 * 1000 &&
    Number.isFinite(snapshot.pricing.fundPrice) &&
    snapshot.pricing.fundPrice >= 0;
  const observedAt = snapshot.liveTierMarketRateSource?.observedAt
    ? Date.parse(snapshot.liveTierMarketRateSource.observedAt)
    : Number.NaN;
  let marketSourceIsHttps = false;
  try {
    marketSourceIsHttps =
      new URL(snapshot.liveTierMarketRateSource?.sourceUrl ?? '').protocol === 'https:';
  } catch {
    marketSourceIsHttps = false;
  }
  const marketRateFresh =
    Number.isFinite(observedAt) &&
    observedAt <= now + 5 * 60 * 1000 &&
    now - observedAt <= 30 * 24 * 60 * 60 * 1000 &&
    Number.isFinite(snapshot.marketPrice) &&
    snapshot.marketPrice >= 0 &&
    snapshot.liveTierMarketRateSource?.claimLabel === 'validated' &&
    Boolean(snapshot.liveTierMarketRateSource?.sourceName?.trim()) &&
    marketSourceIsHttps;
  const stale = !pricingFresh || !marketRateFresh;
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
  const claimLabel =
    snapshot.liveTierMarketRateSource?.claimLabel ??
    snapshot.simulatorResult?.meta.claim_label ??
    'estimated';
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
    freshnessState:
      snapshot.liveTierMarketRateSource?.observedAt ?? snapshot.pricing.lastVerifiedAt,
    boundedClaimsDisclaimer:
      'This memo supports scenario review and pilot qualification only. It is not binding trading, tax, or legal advice.',
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
    `Direct investment credit treatment is undetermined because the current publication status of the Alberta Direct Investment Standard has not been verified. The memo shows a bounded cost range and never presents it as eligible. The Canada–Alberta agreement limits eligible investment to 50% of eligible capital and up to 50% of attributable operating costs net of public support.`,
    `Official headline price schedule carried for scenario context: ${headlineSchedule}.`,
    `Minimum transfer-price floor schedule begins in 2030 for future-year planning context: ${priceFloorSchedule}.`,
    ...snapshot.pricing.policyNotes,
    `The route models one facility scenario at a time and uses CEIP fee logic shown in the route UI.`,
  ];
}

export function buildTierProofBundle(snapshot: TierProofSnapshot): ProofPackBundle {
  return {
    title: 'TIER CFO memo pack',
    summary:
      'Export a draft TIER scenario memo with pricing provenance and assumptions for owner review; price, buyer outcomes, and pilot availability remain unvalidated.',
    artifacts: [
      buildArtifact(
        'tier-cfo-memo-pdf',
        'CFO memo PDF',
        'pdf',
        `tier_cfo_memo_${new Date().toISOString().slice(0, 10)}.pdf`,
        'Draft scenario memo for one facility compliance discussion; validate assumptions before relying on it.',
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
      buildArtifact(
        'tier-source-currency-checklist',
        'Source currency checklist',
        'md',
        `tier_source_currency_checklist_${new Date().toISOString().slice(0, 10)}.md`,
        'Dated Alberta TIER and pricing-source checklist to refresh before outbound buyer use.',
        snapshot,
      ),
    ],
  };
}

export function buildTierMemoDescriptor(snapshot: TierProofSnapshot): ProofDocumentDescriptor {
  const pricingGate = buildTierPricingFreshnessGate(snapshot);
  const recommendation = pricingGate.blocksStrongSavingsClaim
    ? 'No pathway ranked until current pricing evidence passes the freshness gate'
    : snapshot.results.bestOption === 'market_credits'
      ? 'Buy market credits'
      : snapshot.results.bestOption === 'fund_payment'
        ? 'Pay the TIER fund'
        : snapshot.results.bestOption === 'direct_investment'
          ? 'Direct investment remains undetermined — current Standard status unverified'
          : 'No pathway ranked until current pricing and FX evidence is available';
  const hasRankedPathway =
    !pricingGate.blocksStrongSavingsClaim &&
    (snapshot.results.bestOption === 'market_credits' ||
      snapshot.results.bestOption === 'fund_payment');
  const feeLine = pricingGate.blocksStrongSavingsClaim
    ? 'CEIP success fee and CAD-equivalent amounts withheld pending current pricing and sourced FX evidence'
    : snapshot.results.ceipFee === null
      ? 'CEIP fee: USD fee applies; CAD equivalent unavailable pending sourced FX'
      : `CEIP fee: CAD ${snapshot.results.ceipFee.toLocaleString()}`;
  const savingsLine = pricingGate.blocksStrongSavingsClaim
    ? 'Net savings and ROI withheld pending current pricing and sourced FX evidence'
    : snapshot.results.netSavings === null || snapshot.results.roiPercent === null
      ? 'Net savings and ROI: unavailable pending current pricing and sourced FX'
      : `Net savings: CAD ${snapshot.results.netSavings.toLocaleString()} (${snapshot.results.roiPercent.toFixed(0)}% ROI)`;
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
    summary:
      'Draft, one-facility compliance scenario comparison. Current source and currency gates control whether ranked economics are available.',
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
          feeLine,
          savingsLine,
          recommendation,
        ],
      },
      {
        heading: 'Pricing provenance',
        kind: 'bullet_list',
        body: [
          `Fund price source: ${snapshot.pricing.source} (${snapshot.pricing.effectiveDate})`,
          `Fund price source URL: ${snapshot.pricing.sourceUrl}`,
          'Official Alberta TIER source: https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation',
          snapshot.liveTierMarketRateSource
            ? `Market price source: ${snapshot.liveTierMarketRateSource.sourceName ?? 'live market source'} observed ${snapshot.liveTierMarketRateSource.observedAt ?? 'unknown date'}`
            : `Market price source: fallback planning input only (not a current market quote); snapshot dated ${snapshot.pricing.lastVerifiedAt}`,
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
          pricingGate.blocksStrongSavingsClaim
            ? 'No pathway is ranked because current primary-source pricing evidence has not passed the freshness gate.'
            : hasRankedPathway
              ? `${recommendation} is currently the lowest-cost route under the stated scenario assumptions.`
              : `${recommendation}.`,
          pricingGate.blocksStrongSavingsClaim
            ? 'Refresh current source pricing and obtain buyer-approved inputs before considering a pilot request.'
            : hasRankedPathway
              ? 'Use this memo to qualify a pilot that validates live pricing, buyer-specific assumptions, and the final compliance-year decision path.'
              : 'Provide sourced USD/CAD evidence and complete buyer-specific inputs before ranking pathways.',
        ],
      },
    ],
    nextStep: pricingGate.blocksStrongSavingsClaim
      ? 'Refresh current source pricing and obtain buyer-approved inputs before considering a pilot request.'
      : hasRankedPathway
        ? 'Book a pilot review with finance and compliance stakeholders, then replace the starter assumptions with facility-specific numbers.'
        : 'Provide sourced USD/CAD evidence and complete buyer-specific inputs before ranking pathways.',
  };
}

export function buildTierSourceCurrencyChecklistMarkdown(snapshot: TierProofSnapshot): string {
  const items = buildTierSourceCurrencyItems(snapshot);
  return [
    '# TIER source currency checklist',
    '',
    'This checklist is the outbound-use gate for Alberta TIER CFO memo exports. It keeps policy, fund-price, market-price, and direct-investment assumptions separate from buyer-specific approval.',
    '',
    '## Source review register',
    ...items.flatMap((item) => [
      `- Source: ${item.label}`,
      `  - URL: ${item.sourceUrl}`,
      `  - Source date: ${item.sourceDate}`,
      `  - Reviewed at: ${item.reviewedAt}`,
      `  - Current CEIP use: ${item.currentUse}`,
      `  - Verify before outbound use: ${item.verifyBeforeOutbound}`,
      `  - Do not claim: ${item.doNotClaim}`,
    ]),
    '',
    '## Buyer-use gate',
    '- Replace fallback market pricing with a live quote, registry-backed source, or buyer-approved source before making any strong savings claim.',
    '- Verify facility eligibility, compliance year, Direct Investment pathway details, verification costs, and reporting status with the buyer before recommending a pathway.',
    '- Treat the memo as scenario planning only; legal, tax, trading, and final compliance decisions remain outside CEIP proof.',
    '',
    '## Outbound-use refresh checklist',
    '- [ ] Re-open the Alberta TIER regulation page and confirm the Fall 2025 amendments, Direct Investment standard status, June 30 compliance-reporting requirement, and verification-document links.',
    '- [ ] Re-open the Canada-Alberta implementation agreement source and confirm the annual headline price schedule, 2030-2040 minimum transfer-price floor schedule, Direct Investment caps, and any carbon-contracts-for-difference updates.',
    '- [ ] Replace fallback market pricing with a live quote, registry-backed view, or buyer-approved price source retained outside this repository.',
    '- [ ] Attach facility-specific eligibility, compliance-year, verification-cost, and reviewer notes before using the memo outside a planning discussion.',
    '- [ ] Keep legal, tax, trading, compliance approval, guaranteed savings, and executed-credit-price claims out of the outbound artifact unless buyer counsel and source evidence are separately retained.',
  ].join('\n');
}

export function buildTierAppendixMarkdown(snapshot: TierProofSnapshot): string {
  const warnings = snapshot.simulatorResult?.warnings ?? [];
  const pricingGate = buildTierPricingFreshnessGate(snapshot);
  const feeLine = pricingGate.blocksStrongSavingsClaim
    ? 'CEIP success fee and CAD-equivalent amounts withheld pending current pricing and sourced FX evidence'
    : snapshot.results.ceipFee === null
      ? 'CAD equivalent unavailable pending sourced FX'
      : `CAD ${snapshot.results.ceipFee.toLocaleString()}`;
  const savingsLine =
    pricingGate.blocksStrongSavingsClaim ||
    snapshot.results.netSavings === null ||
    snapshot.results.roiPercent === null
      ? 'withheld pending current pricing and sourced FX evidence'
      : `CAD ${snapshot.results.netSavings.toLocaleString()} / ${snapshot.results.roiPercent.toFixed(0)}%`;
  return [
    '# TIER scenario appendix',
    '',
    '## Scenario pathway values (not recommendations)',
    `- Fund payment: CAD ${snapshot.results.fundPayment.toLocaleString()}`,
    `- Market credits: CAD ${snapshot.results.marketCredits.toLocaleString()}`,
    `- Direct investment: CAD ${snapshot.results.directInvestment.toLocaleString()}`,
    `- CEIP fee: ${feeLine}`,
    `- Net savings / ROI: ${savingsLine}`,
    `- Freshness gate: ${pricingGate.status} — ${pricingGate.message}`,
    '- Direct-investment credit treatment remains undetermined until the current Alberta Standard status is verified.',
    '',
    '## Warnings',
    ...(warnings.length > 0
      ? warnings.map((warning) => `- ${warning}`)
      : ['- No additional warnings in the current simulator response']),
  ].join('\n');
}
