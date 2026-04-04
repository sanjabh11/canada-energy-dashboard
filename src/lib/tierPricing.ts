/**
 * TIER (Technology Innovation and Emissions Reduction) Pricing Configuration
 * 
 * Single source of truth for Alberta TIER compliance pricing data.
 * Provides provenance metadata for transparency and auditability.
 * 
 * Data Sources:
 * - Alberta TIER Regulation: https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation
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
 * Fund price frozen at $95/tonne by Alberta government (May 2025)
 * Market credits trading ~$25/tonne (Q4 2025 data from S&P/ICAP)
 * Effective: May 2025 freeze | Verified: February 2026
 */
export const DEFAULT_TIER_PRICING: TIERPricingConfig = {
  fundPrice: 95,
  marketCreditPrice: 25,
  effectiveDate: '2025-05-01',
  source: 'Alberta.ca TIER Regulation',
  sourceUrl: 'https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation',
  lastVerifiedAt: '2026-02-01',
  isFrozen: true,
  periodLabel: 'Q4 2025'
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
  return `Fund: $${config.fundPrice}/t | Market: $${config.marketCreditPrice}/t (${config.periodLabel}, ${config.source})`;
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
export function isPricingStale(config: TIERPricingConfig = DEFAULT_TIER_PRICING): boolean {
  const verifiedAt = new Date(config.lastVerifiedAt);
  const now = new Date();
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
