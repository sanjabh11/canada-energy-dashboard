/**
 * TIER (Technology Innovation and Emissions Reduction) Pricing Configuration
 * 
 * Single source of truth for Alberta TIER compliance pricing data.
 * Provides provenance metadata for transparency and auditability.
 * 
 * Data Sources:
 * - Alberta TIER Regulation: https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation
 * - Canada-Alberta Implementation Agreement, May 15 2026:
 *   https://www.pm.gc.ca/en/news/backgrounders/2026/05/15/implementation-agreement-canada-alberta-memorandum-understanding
 * - S&P Global Commodity Insights (market credit prices)
 * - ICAP Carbon Action (market data)
 */

export interface TIERPricingConfig {
  /** TIER fund price in $/tonne (compliance payment to Alberta government) */
  fundPrice: number;
  
  /** EPC/Offset market credit price in $/tonne (purchase from market) */
  marketCreditPrice: number;
  
  /** ISO date when these prices took effect */
  effectiveDate: string;
  
  /** Authority source for fund price (e.g., "Alberta.ca TIER Regulation") */
  source: string;
  
  /** URL to official source documentation */
  sourceUrl: string;
  
  /** ISO date when CEIP last verified these prices */
  lastVerifiedAt: string;
  
  /** Whether fund price is currently frozen by regulation */
  isFrozen: boolean;
  
  /** Quarter/period label for display (e.g., "Q4 2025") */
  periodLabel: string;

  /** Fallback market-price source used when no live quote is available in-route */
  marketPriceSource: string;

  /** Optional URL for the fallback market-price basis */
  marketPriceSourceUrl?: string;

  /** Plain-language disclosure for the fallback market-price basis */
  marketPriceDisclosure: string;

  /** Current official headline price schedule used for long-range scenario caveats */
  headlinePriceSchedule: Array<{ year: number; priceCadPerTonne: number }>;

  /** Current official minimum transfer-price floor schedule, when applicable */
  priceFloorSchedule: Array<{ year: number; priceCadPerTonne: number }>;

  /** Current policy notes that must travel with CFO-facing proof packs */
  policyNotes: string[];
}

export interface TIERPricingProvenance {
  source: string;
  sourceUrl: string;
  lastUpdated: string;
  isFallback: boolean;
}

/**
 * Default TIER pricing configuration
 * 
 * Fund price uses the 2026 TIER headline-price basis published in the
 * Canada-Alberta implementation agreement on May 15, 2026. Market credits remain
 * a CEIP fallback planning snapshot until the buyer replaces them with a live
 * quote, registry-backed view, or buyer-approved source.
 */
export const DEFAULT_TIER_PRICING: TIERPricingConfig = {
  fundPrice: 95,
  marketCreditPrice: 25,
  effectiveDate: '2026-01-01',
  source: 'Canada-Alberta Implementation Agreement TIER headline price',
  sourceUrl: 'https://www.pm.gc.ca/en/news/backgrounders/2026/05/15/implementation-agreement-canada-alberta-memorandum-understanding',
  lastVerifiedAt: '2026-06-02',
  isFrozen: true,
  periodLabel: '2026 headline price reviewed May 2026',
  marketPriceSource: 'CEIP fallback secondary-market planning snapshot',
  marketPriceDisclosure: 'Fallback only. Replace with a live quote or registry-backed market data before buyer approval.',
  headlinePriceSchedule: [
    { year: 2026, priceCadPerTonne: 95 },
    { year: 2027, priceCadPerTonne: 100 },
    { year: 2028, priceCadPerTonne: 100 },
    { year: 2029, priceCadPerTonne: 100 },
    { year: 2030, priceCadPerTonne: 115 },
    { year: 2031, priceCadPerTonne: 118 },
    { year: 2032, priceCadPerTonne: 121 },
    { year: 2033, priceCadPerTonne: 124 },
    { year: 2034, priceCadPerTonne: 127 },
    { year: 2035, priceCadPerTonne: 130 },
    { year: 2036, priceCadPerTonne: 132 },
    { year: 2037, priceCadPerTonne: 134 },
    { year: 2038, priceCadPerTonne: 136 },
    { year: 2039, priceCadPerTonne: 138 },
    { year: 2040, priceCadPerTonne: 140 },
  ],
  priceFloorSchedule: [
    { year: 2030, priceCadPerTonne: 60 },
    { year: 2031, priceCadPerTonne: 63 },
    { year: 2032, priceCadPerTonne: 67 },
    { year: 2033, priceCadPerTonne: 71 },
    { year: 2034, priceCadPerTonne: 75 },
    { year: 2035, priceCadPerTonne: 80 },
    { year: 2036, priceCadPerTonne: 85 },
    { year: 2037, priceCadPerTonne: 90 },
    { year: 2038, priceCadPerTonne: 95 },
    { year: 2039, priceCadPerTonne: 100 },
    { year: 2040, priceCadPerTonne: 110 },
  ],
  policyNotes: [
    'Alberta TIER direct-investment guidance is a current policy dependency; eligibility and credit treatment must be validated before buyer approval.',
    'The Canada-Alberta implementation agreement limits Direct Investment eligible amounts to 50% of eligible capital and up to 50% of directly attributable operating costs, net of public support, before buyer-specific eligibility review.',
    'Alberta intends to enact minimum transfer-price floor regulations by December 31, 2026; do not treat the planning schedule as executed trade pricing.',
    'Verified annual compliance reports are due by June 30 of the following year under Alberta TIER reporting guidance.',
    'The Canada-Alberta implementation agreement targets stronger TIER credit market prices over time and a minimum transfer-price floor beginning in 2030.',
  ],
};

/**
 * Calculate arbitrage spread between fund price and market credits
 * @returns Dollar amount per tonne of potential savings
 */
export function calculateArbitrageSpread(config: TIERPricingConfig = DEFAULT_TIER_PRICING): number {
  return config.fundPrice - config.marketCreditPrice;
}

/**
 * Calculate percentage savings vs fund price
 * @returns Percentage (0-100) of cost reduction
 */
export function calculateSavingsPercentage(config: TIERPricingConfig = DEFAULT_TIER_PRICING): number {
  return ((config.fundPrice - config.marketCreditPrice) / config.fundPrice) * 100;
}

/**
 * Format pricing for display with provenance context
 */
export function formatPricingWithProvenance(
  config: TIERPricingConfig = DEFAULT_TIER_PRICING
): string {
  const frozenLabel = config.isFrozen ? ' frozen' : '';
  return `Fund: $${config.fundPrice}/t${frozenLabel} (${config.source}) | Market: $${config.marketCreditPrice}/t fallback (${config.periodLabel})`;
}

/**
 * Get TIER pricing configuration
 * 
 * Checks for environment variable overrides (for testing/emergency updates),
 * falls back to DEFAULT_TIER_PRICING.
 */
export function getTIERPricing(): TIERPricingConfig {
  // Check for environment overrides
  const envFundPrice = import.meta.env?.VITE_TIER_FUND_PRICE;
  const envMarketPrice = import.meta.env?.VITE_TIER_MARKET_PRICE;
  
  if (envFundPrice || envMarketPrice) {
    return {
      ...DEFAULT_TIER_PRICING,
      fundPrice: envFundPrice ? parseFloat(envFundPrice) : DEFAULT_TIER_PRICING.fundPrice,
      marketCreditPrice: envMarketPrice ? parseFloat(envMarketPrice) : DEFAULT_TIER_PRICING.marketCreditPrice,
      source: `${DEFAULT_TIER_PRICING.source} (ENV OVERRIDE)`,
      lastVerifiedAt: new Date().toISOString().split('T')[0]
    };
  }
  
  return DEFAULT_TIER_PRICING;
}

/**
 * React hook for accessing TIER pricing (convenience wrapper)
 * 
 * Note: Pricing is static config, but hook pattern allows future
 * dynamic fetching if needed.
 */
export function useTIERPricing(): TIERPricingConfig {
  return getTIERPricing();
}

/**
 * Check if pricing data is stale (>90 days since verification)
 */
export function isPricingStale(config: TIERPricingConfig = DEFAULT_TIER_PRICING, now: Date = new Date()): boolean {
  const verifiedAt = new Date(config.lastVerifiedAt);
  const daysSinceVerification = (now.getTime() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceVerification > 90;
}

/**
 * Get data quality warning if pricing is stale
 */
export function getPricingDataQualityWarning(config: TIERPricingConfig = DEFAULT_TIER_PRICING): string | null {
  if (isPricingStale(config)) {
    return `TIER pricing data is stale (last verified ${config.lastVerifiedAt}). Please verify current rates.`;
  }
  return null;
}

export function getTIERPricingProvenance(config: TIERPricingConfig = DEFAULT_TIER_PRICING): TIERPricingProvenance {
  return {
    source: config.source,
    sourceUrl: config.sourceUrl,
    lastUpdated: config.lastVerifiedAt,
    isFallback: false,
  };
}

/**
 * Calculate total compliance cost via different pathways
 */
export interface CompliancePathwayCosts {
  fundPayment: number;
  marketCredits: number;
  arbitrageSavings: number;
  savingsPercentage: number;
}

export function calculateComplianceCosts(
  benchmarkExceedanceTonnes: number,
  config: TIERPricingConfig = DEFAULT_TIER_PRICING
): CompliancePathwayCosts {
  const fundPayment = benchmarkExceedanceTonnes * config.fundPrice;
  const marketCredits = benchmarkExceedanceTonnes * config.marketCreditPrice;
  const arbitrageSavings = fundPayment - marketCredits;
  const savingsPercentage = (arbitrageSavings / fundPayment) * 100;
  
  return {
    fundPayment,
    marketCredits,
    arbitrageSavings,
    savingsPercentage
  };
}
