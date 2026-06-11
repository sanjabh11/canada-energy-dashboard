/**
 * CEIP Claim and Evidence Registry
 * 
 * Maps all top-10 commercial proof-pack routes to their corresponding data tables,
 * official datasets, claim boundaries, and fallback paths.
 */

export type ClaimStatus = 'source-backed' | 'hybrid' | 'demo-only' | 'roadmap' | 'blocked';

export interface ProofPackClaim {
  id: string;
  route: string;
  name: string;
  claimStatus: ClaimStatus;
  primaryBuyer: string;
  boundary: string;
  doNotClaim: string[];
  sources: string[];
  fallbackPath: string;
  freshnessSLA: string; // SLA requirements
}

export const PROOF_PACK_REGISTRY: Record<string, ProofPackClaim> = {
  'utility-demand-forecast': {
    id: 'utility-demand-forecast',
    route: '/utility-demand-forecast',
    name: 'Utility Demand Forecast Planning Pack',
    claimStatus: 'hybrid',
    primaryBuyer: 'LDCs, REAs, utility consultants',
    boundary: 'Buyer LDC load history is required before claiming buyer-specific forecast validity.',
    doNotClaim: ['customer LDC history', 'production utility onboarding', 'real customer data'],
    sources: ['demand_forecasts', 'ieso_daily_summary', 'aeso_generation_mix'],
    fallbackPath: 'Uses provincial historical system load averages and seasonal-naive baselines.',
    freshnessSLA: 'Last 24 hours of grid observations.',
  },
  'forecast-benchmarking': {
    id: 'forecast-benchmarking',
    route: '/forecast-benchmarking',
    name: 'Forecast Benchmarking and Provenance Layer',
    claimStatus: 'source-backed',
    primaryBuyer: 'Forecast reviewers, consultants',
    boundary: 'Benchmark evidence must remain attached to forecast exports.',
    doNotClaim: ['full data sovereignty', 'SOC 2 certified', 'certified Indigenous data sovereignty'],
    sources: ['forecast_performance', 'ml_model_registry'],
    fallbackPath: 'Static benchmark package parameters or sample persistence data.',
    freshnessSLA: 'Refreshed on each model update cycle.',
  },
  'regulatory-filing': {
    id: 'regulatory-filing',
    route: '/regulatory-filing',
    name: 'OEB/AUC Regulatory Filing Packs',
    claimStatus: 'hybrid',
    primaryBuyer: 'Regulatory teams, consultants',
    boundary: 'Filing-prep support only; not legal, counsel, or regulator approval.',
    doNotClaim: ['regulator submission automation', 'filing counsel approval', 'legal compliance opinion'],
    sources: ['provincial_generation', 'resilience_assets'],
    fallbackPath: 'Chapter 5 or Rule 005 sample matrices and prefilled templates.',
    freshnessSLA: 'Aligned with current annual/semi-annual OEB/AUC revisions.',
  },
  'ga-ici-5cp': {
    id: 'ga-ici-5cp',
    route: '/ga-ici-5cp',
    name: 'Ontario GA/ICI 5CP Decision-Support Pack',
    claimStatus: 'source-backed',
    primaryBuyer: 'Ontario Class A industrials, energy managers, advisors',
    boundary: 'Decision support only; no guaranteed savings, final IESO settlement, eligibility, or curtailment instruction.',
    doNotClaim: ['guaranteed savings', 'final settlement', 'curtailment instruction'],
    sources: ['ieso_daily_summary', 'ieso_interconnection_queue'],
    fallbackPath: 'IESO official 5CP actuals and estimated historical peak day offsets.',
    freshnessSLA: 'Hourly peak actuals during high-demand summer/winter months.',
  },
  'byo-csv-proof': {
    id: 'byo-csv-proof',
    route: '/byo-csv-proof',
    name: 'Privacy-Preserving BYO-CSV Proof Generator',
    claimStatus: 'source-backed',
    primaryBuyer: 'Utility privacy, security, procurement, and planning reviewers',
    boundary: 'Local/redacted proof only; no PII-free certification, no privacy-risk claim, or production connector approval.',
    doNotClaim: ['PII-free certification', 'privacy-risk claim', 'production connector approval'],
    sources: ['data_freshness_status'],
    fallbackPath: 'Client-side local parsing with direct browser-only redaction.',
    freshnessSLA: 'Immediate client execution; zero server-side retention.',
  },
  'roi-calculator': {
    id: 'roi-calculator',
    route: '/roi-calculator',
    name: 'TIER Compliance Savings Pack',
    claimStatus: 'hybrid',
    primaryBuyer: 'Alberta industrial emitters, EPCs',
    boundary: 'Source-dated planning memo only; not trading, tax, legal, or guaranteed-savings advice.',
    doNotClaim: ['live TIER market pricing', 'real-time credit price', 'trade execution', 'tax advice'],
    sources: ['tier_market_rates'],
    fallbackPath: 'Default administrative fund rates ($95/tonne) and advisory credit schedules.',
    freshnessSLA: 'Annual regulatory schedule rates.',
  },
  'credit-banking': {
    id: 'credit-banking',
    route: '/credit-banking',
    name: 'TIER Credit Banking Audit Pack',
    claimStatus: 'demo-only',
    primaryBuyer: 'CFOs, compliance leads',
    boundary: 'Allocation/audit support only; not broker execution or registry certification.',
    doNotClaim: ['broker execution', 'registry certification', 'tax advice'],
    sources: ['tier_market_rates'],
    fallbackPath: 'Local state simulations with realistic sample transaction ledgers.',
    freshnessSLA: 'Updated on compliance milestone runs.',
  },
  'asset-health': {
    id: 'asset-health',
    route: '/asset-health',
    name: 'Asset Health Executive Capex Pack',
    claimStatus: 'demo-only',
    primaryBuyer: 'Asset managers, municipal utilities',
    boundary: 'CBRM-lite planning support only; no SCADA or predictive-maintenance automation claim.',
    doNotClaim: ['SCADA', 'predictive-maintenance automation', 'ADMS', 'power-flow'],
    sources: ['resilience_assets'],
    fallbackPath: 'Pre-calibrated asset class lifetime and risk profile mockups.',
    freshnessSLA: 'Manual engineering assessment date labels.',
  },
  'utility-security': {
    id: 'utility-security',
    route: '/utility-security',
    name: 'Utility Security Procurement Pack',
    claimStatus: 'source-backed',
    primaryBuyer: 'Utility security and procurement reviewers',
    boundary: 'Security review evidence only; no SOC 2 or procurement approval claim.',
    doNotClaim: ['SOC 2 certification', 'procurement approval claim', 'NERC CIP compliance'],
    sources: ['data_freshness_status'],
    fallbackPath: 'Static repository architecture and encryption posture records.',
    freshnessSLA: 'Checked against current commit and repository configurations.',
  },
  'shadow-billing': {
    id: 'shadow-billing',
    route: '/shadow-billing',
    name: 'Shadow Billing Invoice Proof Pack',
    claimStatus: 'demo-only',
    primaryBuyer: 'Municipal/public-sector energy managers',
    boundary: 'Savings are limited to supplied and mapped fields.',
    doNotClaim: ['guaranteed savings', 'billing connector', 'certified audit'],
    sources: ['retailer_rate_offers'],
    fallbackPath: 'Sample rate mapping and standard distributor invoice definitions.',
    freshnessSLA: 'Monthly distributor utility rate schedules.',
  },
};

/**
 * Returns the claim registry metadata for a given route path or ID.
 */
export function getClaimForRoute(routeOrId: string): ProofPackClaim | undefined {
  const clean = routeOrId.replace(/^\//, '');
  return PROOF_PACK_REGISTRY[clean] || Object.values(PROOF_PACK_REGISTRY).find(c => c.route === routeOrId);
}
