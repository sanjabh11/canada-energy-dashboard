/**
 * Pure TIER compliance-economics helpers for the ROI calculator route.
 *
 * Extracted from TIERROICalculator.tsx so the pathway math is unit-testable
 * and free of React/browser dependencies (audit remediation G8–G11).
 *
 * Claim boundaries:
 * - Direct Investment is modeled as an undetermined, bounded scenario — never
 *   a point estimate and never a recommended pathway. Its current publication
 *   status has not been verified, and the Canada–Alberta
 *   implementation agreement caps eligible direct investment at 50% of
 *   eligible capital and up to 50% of directly attributable operating costs
 *   net of public support. No credit conversion rate is assumed, so the route
 *   does not imply eligibility.
 * - Pathway amounts are CAD (TIER prices are CAD/tonne). CEIP fees are USD to
 *   match the subscription catalog (src/lib/pricingCatalog.ts). Cross-currency
 *   net math is suppressed unless the caller supplies a current, sourced FX rate.
 * - Fees and net-ROI outputs are floored at zero where they represent
 *   amounts. ROI% is suppressed (null) when gross savings are zero or inputs
 *   are incomplete, so the UI can show an honest empty state rather than a
 *   misleading number.
 */

import type { TierRoiResults } from './tierProofPack';
import { checkRateFreshness } from './tierPricing';
import type { TierRateFreshness, TierRateProvenance } from './tierPricing';

/** Official Alberta TIER regulation page (Direct Investment Standard status). */
export const TIER_REGULATION_URL =
  'https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation';

/** Currency of every TIER pathway amount (fund price, market credits are CAD/t). */
export const TIER_PATHWAY_CURRENCY = 'CAD' as const;

/** Currency CEIP bills in — matches src/lib/pricingCatalog.ts (all plans USD). */
export const CEIP_FEE_CURRENCY = 'USD' as const;

/** CEIP industrial tier: USD 1,500/mo × 12 (pricingCatalog industrial_tier). */
export const CEIP_ANNUAL_BASE_FEE_USD = 18_000;

/** Success-fee share applied to modeled gross savings. Floored at 0. */
export const SUCCESS_FEE_RATE = 0.2;

/** Canada–Alberta implementation agreement: eligible capital share cap. */
export const DI_ELIGIBLE_CAPITAL_SHARE = 0.5;

/** Canada–Alberta implementation agreement: attributable opex share cap (net of public support). */
export const DI_ATTRIBUTABLE_OPEX_SHARE = 0.5;

export type TierPathwayId = 'fund_payment' | 'market_credits' | 'direct_investment';

/** Pathways whose cost is determined under current published guidance. */
export type TierDeterminedPathwayId = 'fund_payment' | 'market_credits';

export type TierInputKey =
  | 'annualEmissionsTonnes'
  | 'benchmarkExceedanceTonnes'
  | 'directInvestmentCapexCad'
  | 'fundPriceCadPerTonne'
  | 'marketCreditPriceCadPerTonne';

export interface TierRoiInputs {
  annualEmissionsTonnes: number;
  benchmarkExceedanceTonnes: number;
  directInvestmentCapexCad: number;
  fundPriceCadPerTonne: number;
  marketCreditPriceCadPerTonne: number;
  /**
   * Provenance for the fund-price input. Missing or stale provenance
   * suppresses positive-savings, ranking, and CTA outputs ('stale_inputs').
   */
  fundPriceProvenance?: TierRateProvenance | null;
  /**
   * Provenance for the market-credit price input. Missing or stale provenance
   * suppresses positive-savings, ranking, and CTA outputs ('stale_inputs').
   */
  marketCreditProvenance?: TierRateProvenance | null;
}

export interface TierRoiOptions {
  /**
   * Evaluation date used for rate-freshness checks. Defaults to today, which
   * is a *planning* date only — it is not an authoritative pricing timestamp.
   * Tests and exports should inject a fixed date for deterministic results.
   */
  asOf?: Date;
}

export interface TierFeeConfig {
  /** Annual CEIP platform fee in USD (catalog currency). */
  annualBaseFeeUsd: number;
  /** Success-fee share of modeled gross savings, floored at 0. */
  successFeeRate: number;
  /** Sourced, dated USD→CAD rate for cross-currency net math. Null suppresses it. */
  usdToCadPlanningRate: number | null;
  /** A rate is accepted only with current, HTTPS, validated source evidence. */
  usdToCadEvidence: {
    sourceUrl: string;
    observedAt: string;
    claimLabel: 'validated';
  } | null;
}

export const DEFAULT_TIER_FEE_CONFIG: TierFeeConfig = {
  annualBaseFeeUsd: CEIP_ANNUAL_BASE_FEE_USD,
  successFeeRate: SUCCESS_FEE_RATE,
  usdToCadPlanningRate: null,
  usdToCadEvidence: null,
};

/** Why a suppressed output is hidden — the UI renders an honest empty state. */
export type TierSuppressionReason =
  'inputs_incomplete' | 'stale_inputs' | 'no_positive_savings' | 'missing_fx';

export type TierScenarioStatus =
  'incomplete_inputs' | 'stale_inputs' | 'no_savings' | 'savings_identified';

export interface TierDirectInvestmentScenario {
  /** Always undetermined until the current Standard status is verified. */
  status: 'undetermined_pending_standard';
  /** Planned facility capex (CAD). */
  capexCad: number;
  /** Max capital count eligible toward credits: 50% of eligible capital. */
  eligibleCapitalCapCad: number;
  /** Max share of attributable operating costs (net of public support). */
  attributableOpexShareCapPct: number;
  /**
   * Credited tonnes are unknown until the Standard's current publication status is verified; bounded
   * only by [0, benchmark exceedance].
   */
  creditedTonnesRange: { low: number; high: number };
  /**
   * Illustrative cost envelope in CAD: best case assumes the investment fully
   * covers the exceedance (unverified), worst case assumes zero recognized
   * credits so the full fund payment is still owed on top of sunk capex.
   */
  costRangeCad: { low: number; high: number };
  note: string;
}

export interface TierPathwayComparisonEntry {
  id: TierPathwayId;
  /** Whether the pathway cost is determined under current published guidance. */
  determined: boolean;
  /** CAD point estimate for determined pathways; null when undetermined. */
  costCad: number | null;
  /** CAD envelope for undetermined pathways; null when determined. */
  costRangeCad: { low: number; high: number } | null;
}

export type TierRecommendation =
  /** Positive modeled savings vs the fund baseline — market credits are the cheapest determined pathway. */
  | { kind: 'market_credits' }
  /** Fund payment is the cheapest determined pathway; no savings vs doing nothing. */
  | { kind: 'pay_fund' }
  /** Missing/zero inputs — no recommendation, honest empty state. */
  | { kind: 'none'; reason: TierSuppressionReason };

export interface TierRoiComputation {
  inputsComplete: boolean;
  /** Input keys that were missing or non-finite. */
  missingInputs: TierInputKey[];
  status: TierScenarioStatus;
  /**
   * ISO timestamp of the evaluation date used for rate-freshness checks.
   * Planning date only — not an authoritative pricing timestamp.
   */
  evaluatedAsOf: string;
  /** Per-rate freshness results for the fund and market-credit price inputs. */
  rateFreshness: {
    fundPrice: TierRateFreshness;
    marketCreditPrice: TierRateFreshness;
  };
  /**
   * True when either rate input is stale or lacks provenance. When true,
   * positive-savings, ranking, and CTA outputs are suppressed (nulls) and the
   * recommendation is `{ kind: 'none', reason: 'stale_inputs' }`.
   */
  ratesStale: boolean;
  /** Currency of every pathway/savings amount. */
  pathwayCurrency: typeof TIER_PATHWAY_CURRENCY;
  /** Currency of every CEIP fee amount. */
  feeCurrency: typeof CEIP_FEE_CURRENCY;
  /** The disclosed planning FX actually used for CAD-equivalent fee math. */
  usdToCadPlanningRate: number | null;
  pathways: {
    fundPayment: { costCad: number; priceCadPerTonne: number };
    marketCredits: { costCad: number; priceCadPerTonne: number };
    directInvestment: TierDirectInvestmentScenario;
  };
  /** All three pathways, for the UI comparison. */
  comparison: TierPathwayComparisonEntry[];
  /**
   * Cheapest determined pathway (fund payment vs market credits). Direct
   * Investment is excluded because its credit treatment is not determined
   * until the Standard's current publication status is verified. Null when inputs are incomplete.
   */
  bestDeterminedPathway: TierDeterminedPathwayId | null;
  recommendation: TierRecommendation;
  /** max(0, fundPayment - marketCredits); null when inputs incomplete. */
  grossSavingsCad: number | null;
  fees: {
    baseUsd: number;
    /** Floored at 0; null when no FX conversion is available. */
    successUsd: number | null;
    /** Floored at 0; null when no FX conversion is available. */
    totalUsd: number | null;
    /** CAD equivalent at the disclosed planning FX; null when FX unavailable. */
    totalCadEquivalent: number | null;
  };
  /** max(0, grossSavings - fee); null when inputs incomplete or FX unavailable. */
  netSavingsCad: number | null;
  /** Suppressed (null) when inputs incomplete or gross savings <= 0. */
  roiPercent: number | null;
  suppressionReason: TierSuppressionReason | null;
  /** Plain-language boundary notes for the results panel and exports. */
  notes: string[];
}

/**
 * A pilot-request CTA requires current pricing evidence, positive modeled net
 * savings, and a usable dated FX rate. Rendering a draft scenario alone is
 * never sufficient to invite a paid pilot request.
 */
export function canRequestTierPilot(input: {
  pricingEvidenceFresh: boolean;
  ratesStale: boolean;
  status: TierScenarioStatus;
  netSavingsCad: number | null;
  roiPercent: number | null;
}): boolean {
  return (
    input.pricingEvidenceFresh &&
    !input.ratesStale &&
    input.status === 'savings_identified' &&
    input.netSavingsCad !== null &&
    Number.isFinite(input.netSavingsCad) &&
    input.netSavingsCad > 0 &&
    input.roiPercent !== null &&
    Number.isFinite(input.roiPercent)
  );
}

const TIER_DI_NOTE =
  'Direct Investment credit treatment is undetermined because the current publication ' +
  'status of Alberta’s Direct Investment Standard has not been verified. The Canada-Alberta implementation agreement ' +
  'caps eligible direct investment at 50% of eligible capital and up to 50% of ' +
  'directly attributable operating costs net of public support.';

const TIER_STALE_RATE_NOTE =
  'Rate inputs are stale or missing provenance: fund/market price evidence exceeded its ' +
  'freshness window or lacks a dated source. Savings, pathway ranking, ROI, and buyer CTAs ' +
  'are withheld until dated rate evidence is refreshed.';

export const TIER_SCENARIO_BOUNDARY_NOTES: string[] = [
  'Values are scenario estimates for planning only — not compliance, legal, tax, or trading advice.',
  TIER_DI_NOTE,
  'CEIP fees are billed in USD; CAD-equivalent figures and net savings are suppressed unless current, sourced USD-to-CAD evidence is provided.',
];

export const MAX_FX_EVIDENCE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function getVerifiedFxRate(config: TierFeeConfig, nowMs = Date.now()): number | null {
  const rate = config.usdToCadPlanningRate;
  const evidence = config.usdToCadEvidence;
  if (!isFiniteNumber(rate) || rate <= 0 || !evidence || evidence.claimLabel !== 'validated')
    return null;
  const observedAt = Date.parse(evidence.observedAt);
  if (
    !Number.isFinite(observedAt) ||
    observedAt > nowMs + 5 * 60 * 1000 ||
    nowMs - observedAt > MAX_FX_EVIDENCE_AGE_MS
  )
    return null;
  try {
    if (new URL(evidence.sourceUrl).protocol !== 'https:') return null;
  } catch {
    return null;
  }
  return rate;
}

function isFiniteNumber(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Compute the TIER pathway comparison and CEIP net-ROI scenario.
 *
 * Never throws on bad input — non-finite or missing inputs yield
 * `inputsComplete: false` and an honest empty state.
 */
export function computeTierRoiScenario(
  inputs: TierRoiInputs,
  feeConfig: TierFeeConfig = DEFAULT_TIER_FEE_CONFIG,
  options: TierRoiOptions = {},
): TierRoiComputation {
  // `asOf` is the planning evaluation date for rate-freshness checks; it is
  // injectable so tests pin it deterministically. It is not an authoritative
  // pricing timestamp.
  const asOf = options.asOf ?? new Date();
  const evaluatedAsOf = asOf.toISOString();
  const rateFreshness = {
    fundPrice: checkRateFreshness(inputs.fundPriceProvenance ?? null, asOf),
    marketCreditPrice: checkRateFreshness(inputs.marketCreditProvenance ?? null, asOf),
  };
  const ratesStale = rateFreshness.fundPrice.stale || rateFreshness.marketCreditPrice.stale;

  const fx = getVerifiedFxRate(feeConfig, asOf.getTime());
  const missingInputs: TierInputKey[] = [];
  if (!isFiniteNumber(inputs.annualEmissionsTonnes)) missingInputs.push('annualEmissionsTonnes');
  if (!isFiniteNumber(inputs.benchmarkExceedanceTonnes))
    missingInputs.push('benchmarkExceedanceTonnes');
  if (!isFiniteNumber(inputs.directInvestmentCapexCad))
    missingInputs.push('directInvestmentCapexCad');
  if (!isFiniteNumber(inputs.fundPriceCadPerTonne)) missingInputs.push('fundPriceCadPerTonne');
  if (!isFiniteNumber(inputs.marketCreditPriceCadPerTonne))
    missingInputs.push('marketCreditPriceCadPerTonne');

  const inputsComplete = missingInputs.length === 0;

  // Negative inputs are clamped to zero — a negative exceedance simply means
  // no compliance liability for the facility.
  const exceedance = Math.max(
    0,
    isFiniteNumber(inputs.benchmarkExceedanceTonnes) ? inputs.benchmarkExceedanceTonnes : 0,
  );
  const capex = Math.max(
    0,
    isFiniteNumber(inputs.directInvestmentCapexCad) ? inputs.directInvestmentCapexCad : 0,
  );
  const fundPrice = Math.max(
    0,
    isFiniteNumber(inputs.fundPriceCadPerTonne) ? inputs.fundPriceCadPerTonne : 0,
  );
  const marketPrice = Math.max(
    0,
    isFiniteNumber(inputs.marketCreditPriceCadPerTonne) ? inputs.marketCreditPriceCadPerTonne : 0,
  );

  const fundPaymentCad = exceedance * fundPrice;
  const marketCreditsCad = exceedance * marketPrice;

  // Direct Investment: no credit rate is assumed. The bounded envelope runs
  // from "investment alone" (if a future Standard credits the full exceedance)
  // to "investment plus the entire fund payment" (if zero credits materialize).
  const directInvestment: TierDirectInvestmentScenario = {
    status: 'undetermined_pending_standard',
    capexCad: capex,
    eligibleCapitalCapCad: capex * DI_ELIGIBLE_CAPITAL_SHARE,
    attributableOpexShareCapPct: DI_ATTRIBUTABLE_OPEX_SHARE,
    creditedTonnesRange: { low: 0, high: exceedance },
    costRangeCad: { low: capex, high: capex + fundPaymentCad },
    note: TIER_DI_NOTE,
  };

  const comparison: TierPathwayComparisonEntry[] = [
    { id: 'fund_payment', determined: true, costCad: fundPaymentCad, costRangeCad: null },
    { id: 'market_credits', determined: true, costCad: marketCreditsCad, costRangeCad: null },
    {
      id: 'direct_investment',
      determined: false,
      costCad: null,
      costRangeCad: directInvestment.costRangeCad,
    },
  ];

  if (!inputsComplete) {
    return {
      inputsComplete: false,
      missingInputs,
      status: 'incomplete_inputs',
      evaluatedAsOf,
      rateFreshness,
      ratesStale,
      pathwayCurrency: TIER_PATHWAY_CURRENCY,
      feeCurrency: CEIP_FEE_CURRENCY,
      usdToCadPlanningRate: fx,
      pathways: {
        fundPayment: { costCad: fundPaymentCad, priceCadPerTonne: fundPrice },
        marketCredits: { costCad: marketCreditsCad, priceCadPerTonne: marketPrice },
        directInvestment,
      },
      comparison,
      bestDeterminedPathway: null,
      recommendation: { kind: 'none', reason: 'inputs_incomplete' },
      grossSavingsCad: null,
      fees: {
        baseUsd: Math.max(0, feeConfig.annualBaseFeeUsd),
        successUsd: null,
        totalUsd: null,
        totalCadEquivalent: null,
      },
      netSavingsCad: null,
      roiPercent: null,
      suppressionReason: 'inputs_incomplete',
      notes: TIER_SCENARIO_BOUNDARY_NOTES,
    };
  }

  // Stale or unprovenanced rate inputs suppress every positive-savings,
  // ranking, and CTA-facing output — the result must never present optimistic
  // economics computed from out-of-window or unsourced prices.
  const bestDeterminedPathway: TierDeterminedPathwayId | null =
    ratesStale || fx === null || fx <= 0
      ? null
      : marketCreditsCad <= fundPaymentCad
        ? 'market_credits'
        : 'fund_payment';

  // Gross savings are measured against the fund baseline and floored at zero;
  // suppressed (null) when either rate input is stale.
  const grossSavingsCad = ratesStale
    ? null
    : Math.max(0, fundPaymentCad - Math.min(fundPaymentCad, marketCreditsCad));

  const baseFeeUsd = Math.max(0, feeConfig.annualBaseFeeUsd);
  const successFeeUsd =
    !ratesStale && fx !== null && fx > 0 && grossSavingsCad !== null
      ? Math.max(0, (grossSavingsCad / fx) * Math.max(0, feeConfig.successFeeRate))
      : null;
  const totalFeeUsd = successFeeUsd === null ? null : Math.max(0, baseFeeUsd + successFeeUsd);
  const totalFeeCadEquivalent = totalFeeUsd === null || fx === null ? null : totalFeeUsd * fx;
  const netSavingsCad =
    grossSavingsCad === null || totalFeeCadEquivalent === null
      ? null
      : Math.max(0, grossSavingsCad - totalFeeCadEquivalent);

  const noPositiveSavings = grossSavingsCad === null || grossSavingsCad <= 0 || exceedance <= 0;
  const roiPercent =
    noPositiveSavings ||
    netSavingsCad === null ||
    totalFeeCadEquivalent === null ||
    totalFeeCadEquivalent <= 0
      ? null
      : Math.max(0, (netSavingsCad / totalFeeCadEquivalent) * 100);

  const status: TierScenarioStatus = ratesStale
    ? 'stale_inputs'
    : noPositiveSavings
      ? 'no_savings'
      : 'savings_identified';
  const recommendation: TierRecommendation = ratesStale
    ? { kind: 'none', reason: 'stale_inputs' }
    : fx === null || fx <= 0
      ? { kind: 'none', reason: 'missing_fx' }
      : noPositiveSavings
        ? exceedance <= 0
          ? { kind: 'none', reason: 'no_positive_savings' }
          : { kind: 'pay_fund' }
        : { kind: 'market_credits' };

  return {
    inputsComplete: true,
    missingInputs,
    status,
    evaluatedAsOf,
    rateFreshness,
    ratesStale,
    pathwayCurrency: TIER_PATHWAY_CURRENCY,
    feeCurrency: CEIP_FEE_CURRENCY,
    usdToCadPlanningRate: fx,
    pathways: {
      fundPayment: { costCad: fundPaymentCad, priceCadPerTonne: fundPrice },
      marketCredits: { costCad: marketCreditsCad, priceCadPerTonne: marketPrice },
      directInvestment,
    },
    comparison,
    bestDeterminedPathway,
    recommendation,
    grossSavingsCad,
    fees: {
      baseUsd: baseFeeUsd,
      successUsd: successFeeUsd,
      totalUsd: totalFeeUsd,
      totalCadEquivalent: totalFeeCadEquivalent,
    },
    netSavingsCad,
    roiPercent,
    suppressionReason: ratesStale
      ? 'stale_inputs'
      : noPositiveSavings
        ? 'no_positive_savings'
        : fx === null || fx <= 0
          ? 'missing_fx'
          : null,
    notes: ratesStale
      ? [...TIER_SCENARIO_BOUNDARY_NOTES, TIER_STALE_RATE_NOTE]
      : TIER_SCENARIO_BOUNDARY_NOTES,
  };
}

/**
 * Format a monetary amount with an explicit currency code ("CAD 18,000" /
 * "USD 18,000") so every monetary output carries a visible currency unit.
 */
export function formatTierAmount(value: number, currency: 'CAD' | 'USD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Project the computation onto the legacy TierRoiResults shape consumed by
 * tierProofPack.ts. Mapping notes:
 * - `directInvestment` uses the conservative (high) bound of the undetermined
 *   envelope — the memo never presents DI as cheaper than it could be.
 * - `ceipFee`/`netSavings` are CAD equivalents so the memo's CAD labels stay
 *   accurate.
 * - `bestOption` maps `bestDeterminedPathway`: 'market_credits' | 'fund_payment'
 *   | 'none'. 'direct_investment' is deliberately never produced until the
 *   current Alberta Standard status and buyer eligibility are verified.
 */
export function toTierRoiResultsView(computation: TierRoiComputation): TierRoiResults {
  return {
    fundPayment: computation.pathways.fundPayment.costCad,
    marketCredits: computation.pathways.marketCredits.costCad,
    directInvestment: computation.pathways.directInvestment.costRangeCad.high,
    ceipFee: computation.fees.totalCadEquivalent,
    netSavings: computation.netSavingsCad,
    roiPercent: computation.roiPercent,
    bestOption:
      computation.recommendation.kind === 'none'
        ? 'none'
        : (computation.bestDeterminedPathway ?? 'none'),
  };
}
