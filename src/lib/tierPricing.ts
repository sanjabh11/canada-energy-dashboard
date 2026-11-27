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

/**
 * Provenance attached to a single rate constant (fund price or market-credit
 * price). `asOfDate` is the date the rate was last verified against `source`;
 * `maxAgeDays` is the freshness window after which the rate must be treated as
 * stale and downstream savings/ranking outputs suppressed.
 */
export interface TierRateProvenance {
  /** ISO 8601 date (or datetime) the rate was last verified against its source. */
  asOfDate: string;
  /** Human-readable authority or source name. Required and non-empty. */
  source: string;
  /** Optional HTTPS URL to the source document. */
  sourceUrl?: string;
  /** Maximum age in days before the rate is treated as stale. Must be > 0. */
  maxAgeDays: number;
}

/** Why a rate failed its freshness check. */
export type TierRateStaleReason = 'missing_provenance' | 'invalid_as_of' | 'future_dated' | 'stale';

export interface TierRateFreshness {
  /** True when the rate is stale or lacks usable provenance. */
  stale: boolean;
  reason: TierRateStaleReason | null;
  asOfDate: string | null;
  maxAgeDays: number | null;
  /** Whole-fraction days between the rate's asOfDate and the evaluation date. */
  ageDays: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Freshness check for a provenance-carrying rate. `asOf` is injected so tests
 * and exports can pin the evaluation date; the default `new Date()` is a
 * *planning* date only — it is not an authoritative pricing timestamp.
 *
 * A rate with missing provenance, an unparseable or future-dated asOfDate, or
 * an age beyond its own `maxAgeDays` is stale. Stale rates must suppress
 * positive-savings, ranking, and CTA outputs downstream rather than produce
 * optimistic numbers.
 */
export function checkRateFreshness(
  rate: TierRateProvenance | null | undefined,
  asOf: Date = new Date(),
): TierRateFreshness {
  const asOfMs = asOf.getTime();
  const missing: TierRateFreshness = {
    stale: true,
    reason: 'missing_provenance',
    asOfDate: null,
    maxAgeDays: null,
    ageDays: null,
  };
  if (!rate) return missing;
  if (
    typeof rate.asOfDate !== 'string' ||
    rate.asOfDate.trim() === '' ||
    typeof rate.source !== 'string' ||
    rate.source.trim() === '' ||
    !Number.isFinite(rate.maxAgeDays) ||
    rate.maxAgeDays <= 0
  ) {
    return missing;
  }
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(rate.asOfDate)
    ? Date.parse(`${rate.asOfDate}T00:00:00Z`)
    : Date.parse(rate.asOfDate);
  if (!Number.isFinite(parsed)) {
    return {
      stale: true,
      reason: 'invalid_as_of',
      asOfDate: rate.asOfDate,
      maxAgeDays: rate.maxAgeDays,
      ageDays: null,
    };
  }
  const ageDays = (asOfMs - parsed) / DAY_MS;
  if (parsed > asOfMs + 5 * 60 * 1000) {
    return {
      stale: true,
      reason: 'future_dated',
      asOfDate: rate.asOfDate,
      maxAgeDays: rate.maxAgeDays,
      ageDays,
    };
  }
  if (ageDays > rate.maxAgeDays) {
    return {
      stale: true,
      reason: 'stale',
      asOfDate: rate.asOfDate,
      maxAgeDays: rate.maxAgeDays,
      ageDays,
    };
  }
  return {
    stale: false,
    reason: null,
    asOfDate: rate.asOfDate,
    maxAgeDays: rate.maxAgeDays,
    ageDays,
  };
}

/** Fund-rate freshness window: quarterly source review cadence. */
export const TIER_FUND_RATE_MAX_AGE_DAYS = 90;

/** Market-credit rate freshness window: matches the 30-day market evidence gate. */
export const TIER_MARKET_RATE_MAX_AGE_DAYS = 30;

/**
 * TIER credit use limit — the maximum share of a facility's compliance
 * obligation that may be met with credits (emission offsets, emission
 * performance credits, sequestration credits). The remainder of the
 * obligation must be met by a TIER fund payment. The limit rises 10
 * percentage points per year: 60% (2023), 70% (2024), 80% (2025),
 * 90% (2026 and later).
 *
 * Source: Alberta Environment and Protected Areas, "TIER Compliance
 * Workshop 2025" (official deck, credit use limit schedule slide):
 * https://www.alberta.ca/system/files/epa-tier-compliance-workshop-2025.pdf
 */
export const TIER_CREDIT_USE_LIMIT_SOURCE_URL =
  'https://www.alberta.ca/system/files/epa-tier-compliance-workshop-2025.pdf';

export const TIER_CREDIT_USE_LIMIT_SCHEDULE: ReadonlyArray<{
  fromYear: number;
  maxCreditShare: number;
}> = [
  { fromYear: 2023, maxCreditShare: 0.6 },
  { fromYear: 2024, maxCreditShare: 0.7 },
  { fromYear: 2025, maxCreditShare: 0.8 },
  { fromYear: 2026, maxCreditShare: 0.9 },
];

/**
 * Maximum share of a compliance obligation payable with credits for a given
 * compliance year. Years after the last scheduled step keep the last step
 * (90% from 2026); years before the first scheduled step clamp to the
 * earliest entry so savings are never overstated by an assumed 100% credit
 * coverage.
 */
export function getTierCreditUseLimit(complianceYear?: number): number {
  const year =
    typeof complianceYear === 'number' && Number.isFinite(complianceYear)
      ? Math.floor(complianceYear)
      : new Date().getUTCFullYear();
  let share = TIER_CREDIT_USE_LIMIT_SCHEDULE[0].maxCreditShare;
  for (const step of TIER_CREDIT_USE_LIMIT_SCHEDULE) {
    if (year >= step.fromYear) share = step.maxCreditShare;
  }
  return share;
}

export interface TIERPricingConfig {
  /** TIER fund price in $/tonne (compliance payment to Alberta government) */
  fundPrice: number;

  /** EPC/Offset market credit price in $/tonne (purchase from market) */
  marketCreditPrice: number;

  /** Provenance for the fund-price rate constant (asOfDate/source/maxAgeDays). */
  fundPriceProvenance: TierRateProvenance;

  /** Provenance for the market-credit price rate constant (asOfDate/source/maxAgeDays). */
  marketCreditProvenance: TierRateProvenance;

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
  fundPriceProvenance: {
    asOfDate: '2026-06-02',
    source: 'Canada-Alberta Implementation Agreement (May 15, 2026) — TIER headline price',
    sourceUrl:
      'https://www.pm.gc.ca/en/news/backgrounders/2026/05/15/implementation-agreement-canada-alberta-memorandum-understanding',
    maxAgeDays: TIER_FUND_RATE_MAX_AGE_DAYS,
  },
  marketCreditProvenance: {
    asOfDate: '2026-06-02',
    source: 'CEIP fallback secondary-market planning snapshot (replace before buyer use)',
    maxAgeDays: TIER_MARKET_RATE_MAX_AGE_DAYS,
  },
  effectiveDate: '2026-01-01',
  source: 'Canada-Alberta Implementation Agreement (May 15, 2026) — TIER headline price',
  sourceUrl:
    'https://www.pm.gc.ca/en/news/backgrounders/2026/05/15/implementation-agreement-canada-alberta-memorandum-understanding',
  lastVerifiedAt: '2026-06-02',
  isFrozen: true,
  periodLabel: '2026 headline price reviewed May 2026',
  marketPriceSource: 'CEIP fallback secondary-market planning snapshot',
  marketPriceDisclosure:
    'Fallback only. Replace with a live quote or registry-backed market data before buyer approval.',
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
  return boundedPrice(config.fundPrice) - boundedPrice(config.marketCreditPrice);
}

/**
 * Calculate percentage savings vs fund price
 * @returns Percentage (0-100) of cost reduction
 */
export function calculateSavingsPercentage(
  config: TIERPricingConfig = DEFAULT_TIER_PRICING,
): number {
  const fundPrice = boundedPrice(config.fundPrice);
  return fundPrice > 0
    ? ((fundPrice - boundedPrice(config.marketCreditPrice)) / fundPrice) * 100
    : 0;
}

/**
 * Format pricing for display with provenance context
 */
export function formatPricingWithProvenance(
  config: TIERPricingConfig = DEFAULT_TIER_PRICING,
): string {
  const frozenLabel = config.isFrozen ? ' frozen' : '';
  return `Fund: CAD ${config.fundPrice}/t${frozenLabel} (${config.source}) | Market: CAD ${config.marketCreditPrice}/t fallback (${config.periodLabel})`;
}

/**
 * Get TIER pricing configuration
 *
 * Checks for environment variable overrides (for testing/emergency updates),
 * falls back to DEFAULT_TIER_PRICING.
 */
function parsePositiveEnvNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const parsed = parseFloat(raw);
  // Upper bound matches the engines' MAX_SCENARIO_PRICE so a runaway env
  // value can't produce Infinity economics downstream.
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 1_000_000 ? parsed : null;
}

export function getTIERPricing(): TIERPricingConfig {
  // Check for environment overrides — only positive finite prices count;
  // a malformed env value falls back to the default rather than poisoning
  // the pricing config with NaN.
  const envFundPrice = parsePositiveEnvNumber(import.meta.env?.VITE_TIER_FUND_PRICE);
  const envMarketPrice = parsePositiveEnvNumber(import.meta.env?.VITE_TIER_MARKET_PRICE);

  if (envFundPrice != null || envMarketPrice != null) {
    return {
      ...DEFAULT_TIER_PRICING,
      fundPrice: envFundPrice ?? DEFAULT_TIER_PRICING.fundPrice,
      marketCreditPrice: envMarketPrice ?? DEFAULT_TIER_PRICING.marketCreditPrice,
      // An environment override is an unverified planning input. Never advance
      // its evidence date just because the app was built or restarted; the
      // provenance keeps the original asOfDate so staleness still trips.
      fundPriceProvenance: {
        ...DEFAULT_TIER_PRICING.fundPriceProvenance,
        source: `${DEFAULT_TIER_PRICING.fundPriceProvenance.source} (ENV OVERRIDE)`,
      },
      marketCreditProvenance: {
        ...DEFAULT_TIER_PRICING.marketCreditProvenance,
        source: `${DEFAULT_TIER_PRICING.marketCreditProvenance.source} (ENV OVERRIDE)`,
      },
      source: `${DEFAULT_TIER_PRICING.source} (ENV OVERRIDE)`,
      marketPriceDisclosure:
        'Unverified environment override. Do not use for buyer-approved savings or pricing decisions.',
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
export function isPricingStale(
  config: TIERPricingConfig = DEFAULT_TIER_PRICING,
  now: Date = new Date(),
): boolean {
  const verifiedAt = new Date(`${config.lastVerifiedAt}T00:00:00.000Z`);
  if (
    !Number.isFinite(verifiedAt.getTime()) ||
    verifiedAt.getTime() > now.getTime() + 5 * 60 * 1000
  )
    return true;
  const daysSinceVerification = (now.getTime() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceVerification > 90;
}

/**
 * Get data quality warning if pricing is stale
 */
export function getPricingDataQualityWarning(
  config: TIERPricingConfig = DEFAULT_TIER_PRICING,
): string | null {
  if (config.source.includes('(ENV OVERRIDE)')) {
    return 'TIER pricing includes an unverified environment override. Treat affected values as planning inputs only.';
  }
  if (isPricingStale(config)) {
    return `TIER pricing data is stale (last verified ${config.lastVerifiedAt}). Please verify current rates.`;
  }
  return null;
}

export function getTIERPricingProvenance(
  config: TIERPricingConfig = DEFAULT_TIER_PRICING,
): TIERPricingProvenance {
  return {
    source: `${config.source}; ${config.marketPriceSource}`,
    sourceUrl: config.sourceUrl,
    lastUpdated: config.lastVerifiedAt,
    isFallback:
      config.source.includes('(ENV OVERRIDE)') ||
      config.marketPriceDisclosure.toLowerCase().includes('fallback'),
  };
}

/**
 * Calculate total compliance cost via different pathways
 */
export interface CompliancePathwayCosts {
  fundPayment: number;
  /** Blended cost: credits up to the regulated use limit plus fund payment on the remainder. */
  marketCredits: number;
  arbitrageSavings: number;
  savingsPercentage: number;
  /** Regulated credit use limit applied (fraction of obligation, e.g. 0.9). */
  creditUseLimit: number;
}

/** Magnitude guards mirroring the engines (MAX_SCENARIO_NUMERIC/PRICE): keep
 * pricing-path arithmetic finite even when a caller bypasses the env parser. */
const MAX_HELPER_NUMERIC = 1e12;
const MAX_HELPER_PRICE = 1e6;
const boundedNumeric = (v: number): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Math.min(Math.max(0, Number.isFinite(n) ? n : 0), MAX_HELPER_NUMERIC);
};
const boundedPrice = (v: number): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Math.min(Math.max(0, Number.isFinite(n) ? n : 0), MAX_HELPER_PRICE);
};

export function calculateComplianceCosts(
  benchmarkExceedanceTonnes: number,
  config: TIERPricingConfig = DEFAULT_TIER_PRICING,
  complianceYear?: number,
): CompliancePathwayCosts {
  const exceedance = boundedNumeric(benchmarkExceedanceTonnes);
  const fundPrice = boundedPrice(config.fundPrice);
  const marketCreditPrice = boundedPrice(config.marketCreditPrice);
  const creditUseLimit = getTierCreditUseLimit(complianceYear);
  const fundPayment = exceedance * fundPrice;
  const marketCredits =
    exceedance * creditUseLimit * marketCreditPrice + exceedance * (1 - creditUseLimit) * fundPrice;
  const arbitrageSavings = fundPayment - marketCredits;
  const savingsPercentage = fundPayment > 0 ? (arbitrageSavings / fundPayment) * 100 : 0;

  return {
    fundPayment,
    marketCredits,
    arbitrageSavings,
    savingsPercentage,
    creditUseLimit,
  };
}
