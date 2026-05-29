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

export type CreditBankingSourceMode = 'starter_ledger' | 'constructed_commercial_scenario' | 'uploaded_ledger';

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
    verificationStatus: isConstructed
      ? 'constructed_scenario'
      : sourceMode === 'starter_ledger'
        ? 'needs_buyer_data'
        : 'owner_supplied_required',
    doNotClaim: [
      'Broker quote or trade execution',
      'Registry certification',
      'Legal compliance opinion',
      'Live market price without refreshed source evidence',
    ],
    assumptions: [
      'Allocation is deterministic and follows earliest-expiry active lots first.',
      'This workflow supports audit-ready planning and does not execute broker trades.',
      'Pricing is a disclosed snapshot and must be refreshed before final purchase approval.',
    ],
    claimLabel: isConstructed ? 'constructed-scenario' : sourceMode === 'starter_ledger' ? 'advisory' : 'owner-supplied',
    isFallback: sourceMode === 'starter_ledger',
    freshnessState: pricing.lastVerifiedAt,
    commercialProofState: isConstructed ? 'constructed_commercial_scenario' : 'standard',
    boundedClaimsDisclaimer: 'This dashboard supports compliance planning only. It does not provide a broker quote, legal opinion, or registry certification.',
    description,
  };
}

export function buildCreditBankingProofBundle(
  sourceMode: CreditBankingSourceMode,
  pricing: TIERPricingConfig,
): ProofPackBundle {
  return {
    title: 'Credit banking audit pack',
    summary: 'Export a position memo, allocation schedule, and expiry-risk register tied to the current TIER pricing disclosure.',
    artifacts: [
      buildArtifact(
        'credit-position-memo',
        'Credit position memo',
        'html',
        `tier_credit_position_${new Date().toISOString().slice(0, 10)}.html`,
        'Primary audit-ready position summary for compliance and finance review.',
        sourceMode,
        pricing,
      ),
      buildArtifact(
        'credit-allocation-schedule',
        'Allocation schedule CSV',
        'csv',
        `tier_credit_allocation_${new Date().toISOString().slice(0, 10)}.csv`,
        'Compliance-year allocation schedule with estimated remaining market cost.',
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
    .filter((holding) => holding.status !== 'expired')
    .sort((left, right) => left.expiryYear - right.expiryYear)
    .slice(0, 4);

  return {
    definition: buildArtifact(
      'credit-position-memo',
      'Credit position memo',
      'html',
      `tier_credit_position_${new Date().toISOString().slice(0, 10)}.html`,
      'Primary memo for the current TIER banking workflow.',
      args.sourceMode,
      args.pricing,
    ),
    title: 'TIER credit banking position memo',
    summary: 'Compliance-year allocation, expiry pressure, and pricing provenance for the current credit ledger.',
    sections: [
      {
        heading: 'Portfolio summary',
        kind: 'bullet_list',
        body: [
          `Total active credits: ${args.summary.totalCredits.toLocaleString()} tonnes`,
          `Current portfolio value: CAD ${args.summary.currentValue.toLocaleString()}`,
          `Average acquisition cost: CAD ${args.summary.avgCost.toFixed(2)} / tonne`,
          `Fund cost avoided: CAD ${args.summary.fundValueSaved.toLocaleString()}`,
          `Coverage ratio: ${args.summary.coverageRatio.toFixed(0)}%`,
        ],
      },
      {
        heading: 'Compliance-year allocation',
        kind: 'bullet_list',
        body: args.allocations.map((row) => `${row.year}: ${row.allocated.toLocaleString()}t allocated, ${row.remaining.toLocaleString()}t remaining`),
      },
      {
        heading: 'Expiry and concentration watch',
        kind: 'bullet_list',
        body: expiringLots.map((holding) => `${holding.type} vintage ${holding.vintage}: ${holding.quantity.toLocaleString()}t expires in ${holding.expiryYear}`),
      },
      {
        heading: 'No-broker audit guardrails',
        kind: 'bullet_list',
        body: [
          'Use the allocation schedule as planning evidence only; it does not place or recommend a trade.',
          'Refresh pricing and registry status before CFO approval.',
          'Keep evidence of ledger source, expiry dates, allocation order, and remaining liability attached to the pilot file.',
        ],
      },
    ],
    nextStep: 'Replace starter files with the buyer’s registry ledger and compliance liability export, then use the allocation schedule in the pilot review.',
  };
}
