import type { TIERPricingConfig } from './tierPricing';
import type {
  ProofArtifactDefinition,
  ProofDocumentDescriptor,
  ProofPackBundle,
} from './proofPack';
import type {
  CreditAllocationRow,
  CreditHolding,
  CreditPortfolioSummary,
} from './creditBankingSupport';
import { checkRateFreshness, isPricingStale } from './tierPricing';

export type CreditBankingSourceMode =
  'starter_ledger' | 'constructed_commercial_scenario' | 'uploaded_ledger';

function buildArtifact(
  id: string,
  label: string,
  format: ProofArtifactDefinition['format'],
  filename: string,
  description: string,
  sourceMode: CreditBankingSourceMode,
  pricing: TIERPricingConfig,
): ProofArtifactDefinition {
  const isConstructed = sourceMode === 'constructed_commercial_scenario';
  // Stale covers the config-level verification date plus each rate constant's
  // own asOfDate/maxAgeDays provenance window.
  const isPricingOutdated =
    isPricingStale(pricing) ||
    checkRateFreshness(pricing.fundPriceProvenance).stale ||
    checkRateFreshness(pricing.marketCreditProvenance).stale;
  return {
    id,
    label,
    format,
    filename,
    audience: 'Compliance lead or CFO',
    generatedAt: new Date().toISOString(),
    jurisdiction: 'Alberta',
    sourceSummary: `${pricing.source} with ${
      isConstructed
        ? 'constructed industrial credit holdings and liabilities'
        : sourceMode === 'starter_ledger'
          ? 'starter credit lots and liabilities'
          : 'uploaded ledger and liability files'
    }`,
    sourceManifestId: `tier-credit-ledger-${sourceMode}-${pricing.lastVerifiedAt}`,
    verificationStatus: isPricingOutdated
      ? 'source_stale'
      : isConstructed
        ? 'constructed_scenario'
        : sourceMode === 'starter_ledger'
          ? 'needs_buyer_data'
          : 'owner_supplied_required',
    doNotClaim: [
      'Broker quote or trade execution',
      'Registry certification',
      'Legal compliance opinion',
      'Current market value, savings or remaining market cost: no verified live quote is included',
    ],
    assumptions: [
      'Allocation is deterministic and follows earliest-expiry active lots first.',
      'This workflow creates a draft allocation schedule only; it does not establish compliance, eligibility, or broker execution.',
      'Market value, savings, and estimated remaining market cost are suppressed until current source evidence is supplied.',
    ],
    claimLabel: isConstructed
      ? 'constructed-scenario'
      : sourceMode === 'starter_ledger'
        ? 'advisory'
        : 'owner-supplied',
    isFallback: true,
    freshnessState: `market_quote_unavailable; pricing_review:${pricing.lastVerifiedAt}${isPricingOutdated ? '; stale' : ''}`,
    commercialProofState: isConstructed ? 'constructed_commercial_scenario' : 'standard',
    boundedClaimsDisclaimer:
      'This dashboard supports compliance planning only. It does not provide a broker quote, legal opinion, or registry certification.',
    description,
  };
}

export function buildCreditBankingProofBundle(
  sourceMode: CreditBankingSourceMode,
  pricing: TIERPricingConfig,
): ProofPackBundle {
  return {
    title: 'Credit banking audit pack',
    summary:
      'Export a draft position memo, unpriced allocation schedule, and expiry-risk register. Market valuation is withheld without a current quote.',
    artifacts: [
      buildArtifact(
        'credit-position-memo',
        'Credit position memo',
        'html',
        `tier_credit_position_${new Date().toISOString().slice(0, 10)}.html`,
        'Draft position summary for buyer review; not a compliance or finance approval artifact.',
        sourceMode,
        pricing,
      ),
      buildArtifact(
        'credit-allocation-schedule',
        'Allocation schedule CSV',
        'csv',
        `tier_credit_allocation_${new Date().toISOString().slice(0, 10)}.csv`,
        'Compliance-year allocation schedule with remaining tonnes; market cost is withheld until a current quote is supplied.',
        sourceMode,
        pricing,
      ),
      buildArtifact(
        'credit-expiry-risk',
        'Expiry-risk register',
        'csv',
        `tier_credit_expiry_risk_${new Date().toISOString().slice(0, 10)}.csv`,
        'Lot-level view of expiry pressure and remaining active credits.',
        sourceMode,
        pricing,
      ),
    ],
  };
}

export function buildCreditPositionDescriptor(args: {
  sourceMode: CreditBankingSourceMode;
  pricing: TIERPricingConfig;
  summary: CreditPortfolioSummary;
  allocations: CreditAllocationRow[];
  holdings: CreditHolding[];
}): ProofDocumentDescriptor {
  const expiringLots = args.holdings
    .filter((holding) => holding.status === 'available' || holding.status === 'allocated')
    .sort((left, right) => left.expiryYear - right.expiryYear)
    .slice(0, 4);

  return {
    definition: buildArtifact(
      'credit-position-memo',
      'Credit position memo',
      'html',
      `tier_credit_position_${new Date().toISOString().slice(0, 10)}.html`,
      'Draft memo for the TIER banking planning workflow.',
      args.sourceMode,
      args.pricing,
    ),
    title: 'TIER credit banking position memo',
    summary:
      'Draft compliance-year allocation and expiry arithmetic; current market valuation and savings are unavailable.',
    sections: [
      {
        heading: 'Portfolio summary',
        kind: 'bullet_list',
        body: [
          `Total active credits: ${args.summary.totalCredits.toLocaleString()} tonnes`,
          `Current portfolio market value: ${args.summary.currentValue === null ? 'not available; current verified quote required' : `CAD ${args.summary.currentValue.toLocaleString()}`}`,
          `Recorded average acquisition cost: CAD ${args.summary.avgCost.toFixed(2)} / tonne (based on supplied ledger purchase prices)`,
          `Fund cost comparison: ${args.summary.fundValueSaved === null ? 'withheld; current verified fund rate and comparable lot evidence required' : `CAD ${args.summary.fundValueSaved.toLocaleString()}`}`,
          `Coverage ratio: ${args.summary.coverageRatio.toFixed(0)}%`,
        ],
      },
      {
        heading: 'Compliance-year allocation',
        kind: 'bullet_list',
        body: args.allocations.map(
          (row) =>
            `${row.year}: ${row.allocated.toLocaleString()}t allocated, ${row.remaining.toLocaleString()}t remaining`,
        ),
      },
      {
        heading: 'Expiry and concentration watch',
        kind: 'bullet_list',
        body: expiringLots.map(
          (holding) =>
            `${holding.type} vintage ${holding.vintage}: ${holding.quantity.toLocaleString()}t expires in ${holding.expiryYear}`,
        ),
      },
      {
        heading: 'No-broker audit guardrails',
        kind: 'bullet_list',
        body: [
          'Use the allocation schedule as planning evidence only; it does not place or recommend a trade.',
          'Obtain dated buyer-approved pricing and verify registry status before any financial or compliance decision.',
          'Keep evidence of ledger source, expiry dates, allocation order, and remaining liability attached to the pilot file.',
        ],
      },
    ],
    nextStep:
      'Replace starter files with the buyer’s registry ledger and compliance liability export, then use the allocation schedule in the pilot review.',
  };
}
