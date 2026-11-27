export type MlDataSource = { name: string; url?: string; lastUpdated?: string };

export type EvaluationSummary = {
  mae?: number;
  rmse?: number;
  directional_accuracy?: number;
  auc?: number;
  precision?: number;
  recall?: number;
  mape?: number;
  physics_violation_rate?: number;
  f1?: number;
  top3_localization_accuracy?: number;
  validation_loss?: number;
  sample_count: number;
};

export type SimulatorConfig = {
  name: string;
  version: string;
  scenario_count: number;
  topology?: string;
};

export type ForecastTrainingDataProfile = 'real' | 'mixed' | 'synthetic' | 'simulator-calibrated';

export type SharedForecastMeta = {
  model_version: string;
  generated_at: string;
  valid_at: string;
  confidence_score: number;
  data_sources: MlDataSource[];
  is_fallback: boolean;
  staleness_status: 'fresh' | 'stale' | 'unknown';
  methodology: string;
  warnings: string[];
  training_data_profile?: ForecastTrainingDataProfile;
  evaluation_summary?: EvaluationSummary;
  calibration_status?: 'calibrated' | 'uncalibrated' | 'drifting';
  claim_label?: 'estimated' | 'advisory' | 'validated' | 'model_extracted';
  training_artifact_sha?: string;
  simulator_config?: SimulatorConfig;
  trained_at?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (to - from) / DAY_MS);
}

/**
 * Hard cap for scenario magnitudes (tonnes or CAD). Inputs beyond this are
 * clamped so absurd values (e.g. 1e308) cannot produce Infinity pathway costs
 * or silent $0 results. Mirrors src/lib/mlForecasting.ts — keep in sync.
 */
const MAX_SCENARIO_NUMERIC = 1e12;

/**
 * Upper bound for per-tonne prices (CAD/t) and the DI credit rate (0–1).
 * Finite-but-huge prices would otherwise overflow pathway costs into
 * Infinity and round() would silently flatten them to $0.
 * Mirrors src/lib/mlForecasting.ts — keep in sync.
 */
const MAX_SCENARIO_PRICE = 1e6;

/**
 * Coerce a value to a finite number. Returns undefined when the value is not
 * a number or numeric string — used so malformed caller prices count as
 * "not supplied" rather than silently becoming NaN or a $0 pathway.
 */
function coerceFiniteNumber(value: unknown): number | undefined {
  const parsed =
    typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')
      ? Number(value)
      : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Numeric input read with a hard fallback: malformed values use `fallback`. */
function numOr(value: unknown, fallback: number): number {
  return coerceFiniteNumber(value) ?? fallback;
}

/**
 * Database-row reader: a stored rate must be positive and finite to be
 * usable. Non-positive or malformed row values fall through to the scenario
 * defaults instead of injecting a $0/negative price into the fill.
 */
function coercePositiveNumber(value: unknown): number | undefined {
  const n = coerceFiniteNumber(value);
  return n != null && n > 0 ? n : undefined;
}

/**
 * A tier_market_rates row is usable only when it contributes at least one
 * positive finite price — lets the handler skip a malformed newest row and
 * fall back to an older valid one instead of silently using defaults.
 */
export function tierRateRowHasUsablePrice(
  rateRow: Record<string, unknown> | null | undefined,
): boolean {
  return (
    coercePositiveNumber(rateRow?.fund_price_cad_per_tonne) != null ||
    coercePositiveNumber(rateRow?.market_credit_price_cad_per_tonne) != null
  );
}

/** YYYY-MM-DD passthrough; malformed or missing values fall back to today. */
function normalizeIsoDate(value: unknown): string {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
    ? value
    : new Date().toISOString().slice(0, 10);
}

export function buildMeta(params: {
  modelVersion: string;
  validAt: string;
  confidenceScore: number;
  dataSources: MlDataSource[];
  isFallback: boolean;
  methodology: string;
  warnings?: string[];
  generatedAt?: string;
  staleAfterDays?: number;
  trainingDataProfile?: ForecastTrainingDataProfile;
  evaluationSummary?: EvaluationSummary;
  calibrationStatus?: 'calibrated' | 'uncalibrated' | 'drifting';
  claimLabel?: 'estimated' | 'advisory' | 'validated' | 'model_extracted';
  trainingArtifactSha?: string;
  simulatorConfig?: SimulatorConfig;
  trainedAt?: string;
}) {
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const orderedSourceDates = params.dataSources
    .map((source) => source.lastUpdated)
    .filter((value): value is string => Boolean(value))
    .sort();
  const freshestSourceDate = orderedSourceDates.length > 0
    ? orderedSourceDates[orderedSourceDates.length - 1]
    : undefined;
  const staleAfterDays = params.staleAfterDays ?? 90;
  const stalenessStatus = freshestSourceDate
    ? daysBetween(freshestSourceDate, generatedAt) > staleAfterDays ? 'stale' : 'fresh'
    : 'unknown';

  const meta: SharedForecastMeta = {
    model_version: params.modelVersion,
    generated_at: generatedAt,
    valid_at: params.validAt,
    confidence_score: round(clamp(params.confidenceScore), 4),
    data_sources: params.dataSources,
    is_fallback: params.isFallback,
    staleness_status: stalenessStatus,
    methodology: params.methodology,
    warnings: params.warnings ?? [],
  };

  if (params.trainingDataProfile !== undefined) meta.training_data_profile = params.trainingDataProfile;
  if (params.evaluationSummary !== undefined) meta.evaluation_summary = params.evaluationSummary;
  if (params.calibrationStatus !== undefined) meta.calibration_status = params.calibrationStatus;
  if (params.claimLabel !== undefined) meta.claim_label = params.claimLabel;
  if (params.trainingArtifactSha !== undefined) meta.training_artifact_sha = params.trainingArtifactSha;
  if (params.simulatorConfig !== undefined) meta.simulator_config = params.simulatorConfig;
  if (params.trainedAt !== undefined) meta.trained_at = params.trainedAt;

  return meta;
}

// Regulated TIER credit use limit by compliance year: credits may satisfy at
// most this share of the obligation; the remainder is owed to the TIER fund
// regardless of market price. Mirrors src/lib/tierPricing.ts
// getTierCreditUseLimit — keep schedules in sync (60%/2023, 70%/2024,
// 80%/2025, 90%/2026+; earlier years clamp to the earliest step).
const TIER_CREDIT_USE_LIMIT_SCHEDULE: ReadonlyArray<{
  fromYear: number;
  maxCreditShare: number;
}> = [
  { fromYear: 2023, maxCreditShare: 0.6 },
  { fromYear: 2024, maxCreditShare: 0.7 },
  { fromYear: 2025, maxCreditShare: 0.8 },
  { fromYear: 2026, maxCreditShare: 0.9 },
];

function getTierCreditUseLimit(complianceYear?: number): number {
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

/**
 * Normalize a caller-supplied compliance year. Accepts integers >= 2000 and
 * clean four-digit strings (coerced); anything else — 0, 1999, malformed
 * strings, non-integers — falls back to `fallbackYear` so a malformed value
 * can never silently price the wrong schedule step. Mirrors the local
 * normalizer in src/lib/mlForecasting.ts — keep in sync.
 */
function normalizeTierComplianceYear(raw: unknown, fallbackYear: number): number {
  const candidate =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && /^\d{4}$/.test(raw.trim())
        ? Number(raw.trim())
        : Number.NaN;
  return Number.isInteger(candidate) && candidate >= 2000 ? candidate : fallbackYear;
}

/**
 * Read caller-supplied TIER prices across both naming conventions and both
 * assumption containers (creditAssumptions / credit_assumptions). Explicit
 * caller values win under any supported spelling; used by the tier-simulator
 * handler so a snake_case payload can never be silently displaced by a
 * database default fill.
 */
export function readTierSuppliedPrices(body: Record<string, unknown> | null | undefined): {
  marketPrice: unknown;
  fundPrice: unknown;
  lastVerifiedAt: unknown;
} {
  const camel = (body?.creditAssumptions ?? {}) as Record<string, unknown>;
  const snake = (body?.credit_assumptions ?? {}) as Record<string, unknown>;
  return {
    marketPrice:
      camel.marketCreditPriceCadPerTonne ?? camel.market_credit_price_cad_per_tonne ??
      snake.marketCreditPriceCadPerTonne ?? snake.market_credit_price_cad_per_tonne,
    fundPrice:
      camel.fundPriceCadPerTonne ?? camel.fund_price_cad_per_tonne ??
      snake.fundPriceCadPerTonne ?? snake.fund_price_cad_per_tonne,
    lastVerifiedAt:
      camel.lastVerifiedAt ?? camel.last_verified_at ??
      snake.lastVerifiedAt ?? snake.last_verified_at,
  };
}

/** True when the caller supplied both TIER prices under any supported spelling and both are numeric. */
export function tierPricesFullySupplied(body: Record<string, unknown> | null | undefined): boolean {
  const supplied = readTierSuppliedPrices(body);
  return (
    coerceFiniteNumber(supplied.marketPrice) != null &&
    coerceFiniteNumber(supplied.fundPrice) != null
  );
}

/**
 * Date score used for freshness comparison. Only primitive strings and finite
 * numbers may carry date meaning — arrays (["2030-01-01"] would otherwise
 * parse as a valid date), objects, booleans, null, symbols and bigint input
 * are treated as unverified (oldest). The primitive check runs BEFORE the
 * Date constructor so non-JSON-typable values can never reach coercion.
 */
function scoreVerifiedDate(d: unknown): number {
  if (typeof d === 'string' ? d.trim() === '' : typeof d !== 'number' || !Number.isFinite(d)) {
    return Number.NEGATIVE_INFINITY;
  }
  const t = new Date(d as string | number).getTime();
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
}

/**
 * Per-field TIER price resolution. For each price the caller did not supply,
 * scan rows in freshness order and take the FIRST row that supplies THAT
 * specific field — so a newest row carrying only a redundant price can never
 * shadow an older row holding the actually-missing one. Each resolved price
 * keeps its own provenance date (the caller's date for caller prices, the
 * source row's observed_at for row prices); the combined verification date is
 * the OLDEST contributing date, and any price that falls back to a
 * provenance-free engine default leaves combined freshness unknown — the
 * engine then applies its conservative stale default instead of a DB date
 * that would falsely mark a fallback value fresh.
 */
function resolveTierPrices(
  supplied: { marketPrice: unknown; fundPrice: unknown; lastVerifiedAt: unknown },
  rateRows: Array<Record<string, unknown> | null | undefined> | null | undefined,
): { marketPrice: number; fundPrice: number; lastVerifiedAt: unknown } {
  // "Caller-supplied" must mean "the fill will actually use the caller value"
  // — a malformed value that falls through to row/default must not carry
  // caller provenance. Same predicate as the fill below (coerceFiniteNumber).
  const callerMarket = coerceFiniteNumber(supplied.marketPrice);
  const callerFund = coerceFiniteNumber(supplied.fundPrice);
  const rows = Array.isArray(rateRows) ? rateRows : [];
  const marketRow =
    callerMarket == null
      ? rows.find((row) => coercePositiveNumber(row?.market_credit_price_cad_per_tonne) != null) ?? null
      : null;
  const fundRow =
    callerFund == null
      ? rows.find((row) => coercePositiveNumber(row?.fund_price_cad_per_tonne) != null) ?? null
      : null;
  const marketPrice = callerMarket ?? coercePositiveNumber(marketRow?.market_credit_price_cad_per_tonne) ?? 25;
  const fundPrice = callerFund ?? coercePositiveNumber(fundRow?.fund_price_cad_per_tonne) ?? 95;
  const marketProvenanced = callerMarket != null || marketRow != null;
  const fundProvenanced = callerFund != null || fundRow != null;
  if (!marketProvenanced || !fundProvenanced) {
    return { marketPrice, fundPrice, lastVerifiedAt: undefined };
  }
  const marketDate = callerMarket != null ? supplied.lastVerifiedAt : marketRow?.observed_at;
  const fundDate = callerFund != null ? supplied.lastVerifiedAt : fundRow?.observed_at;
  if (marketDate == null || fundDate == null) {
    return { marketPrice, fundPrice, lastVerifiedAt: undefined };
  }
  // Mixed provenance is only as honest as its weakest side — the older
  // contributing date wins and an unparseable date scores as oldest.
  return {
    marketPrice,
    fundPrice,
    lastVerifiedAt:
      scoreVerifiedDate(marketDate) <= scoreVerifiedDate(fundDate) ? marketDate : fundDate,
  };
}

/**
 * Normalize caller TIER assumptions into the canonical camelCase
 * creditAssumptions container the engine reads first, then fill any missing
 * prices from the freshest tier_market_rates rows. Each missing price is
 * resolved independently against the row list — the first row supplying THAT
 * field wins, so a newest row that only carries a redundant price cannot
 * shadow an older row holding the actually-missing one. Explicit caller
 * values under any supported spelling or container always win over the
 * database fill, and are consolidated so a snake_case or split-container
 * payload cannot be shadowed by the engine's container-level precedence.
 * A fully canonical body, or an assumption-free body with no rate rows, is
 * returned unchanged.
 */
export function fillTierPriceDefaultsFromRates(
  body: Record<string, unknown> | null | undefined,
  rateRows: Array<Record<string, unknown> | null | undefined> | null | undefined,
): Record<string, unknown> {
  const resolved = { ...(body ?? {}) };
  const camel = (resolved.creditAssumptions ?? {}) as Record<string, unknown>;
  const snake = (resolved.credit_assumptions ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(rateRows) ? rateRows : [];
  const hasRows = rows.some(tierRateRowHasUsablePrice);
  const hasAssumptions = resolved.creditAssumptions != null || resolved.credit_assumptions != null;
  if (!hasRows && !hasAssumptions) return resolved;
  const canonical =
    resolved.credit_assumptions == null &&
    coerceFiniteNumber(camel.marketCreditPriceCadPerTonne) != null &&
    coerceFiniteNumber(camel.fundPriceCadPerTonne) != null;
  if (!hasRows && canonical) return resolved;

  const supplied = readTierSuppliedPrices(resolved);
  const creditRate =
    camel.directInvestmentCreditRate ?? camel.direct_investment_credit_rate ??
    snake.directInvestmentCreditRate ?? snake.direct_investment_credit_rate;
  const px = resolveTierPrices(supplied, rows);
  resolved.creditAssumptions = {
    ...snake,
    ...camel,
    ...(creditRate != null ? { directInvestmentCreditRate: creditRate } : {}),
    marketCreditPriceCadPerTonne: px.marketPrice,
    fundPriceCadPerTonne: px.fundPrice,
    // Only stamp a verification date when every price in play is
    // attributable — a partial DB row or a provenance-free default must never
    // make a fallback price look freshly verified. Both spellings are
    // overwritten: a leftover caller `last_verified_at` carried by the
    // ...snake spread would otherwise resurrect a deliberately-dropped date.
    lastVerifiedAt: px.lastVerifiedAt,
    last_verified_at: px.lastVerifiedAt,
  };
  delete resolved.credit_assumptions;
  return resolved;
}

/**
 * Single-row convenience wrapper over fillTierPriceDefaultsFromRates —
 * retained for callers/tests that already resolved one usable rate row.
 */
export function fillTierPriceDefaultsFromRate(
  body: Record<string, unknown> | null | undefined,
  rateRow: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return fillTierPriceDefaultsFromRates(body, rateRow ? [rateRow] : []);
}

export function calculateTierScenario(input: any) {
  const asOfDate = normalizeIsoDate(input.asOfDate ?? input.as_of_date);
  const assumptions = input.creditAssumptions ?? input.credit_assumptions ?? {};
  const exceedance = Math.min(Math.max(0, numOr(input.benchmarkExceedanceTonnes ?? input.benchmark_exceedance_tonnes, 0)), MAX_SCENARIO_NUMERIC);
  const capex = Math.min(Math.max(0, numOr(input.directInvestmentCapexCad ?? input.direct_investment_capex_cad, 0)), MAX_SCENARIO_NUMERIC);
  const discountRate = numOr(input.discountRate ?? input.discount_rate, 0.08);
  const fundPrice = Math.min(Math.max(0, numOr(assumptions.fundPriceCadPerTonne ?? assumptions.fund_price_cad_per_tonne, 95)), MAX_SCENARIO_PRICE);
  const marketPrice = Math.min(Math.max(0, numOr(assumptions.marketCreditPriceCadPerTonne ?? assumptions.market_credit_price_cad_per_tonne, 25)), MAX_SCENARIO_PRICE);
  const creditRate = Math.min(Math.max(0, numOr(assumptions.directInvestmentCreditRate ?? assumptions.direct_investment_credit_rate, 0.8)), 1);
  // Bound caller/row-supplied verification dates: a finite number is accepted
  // (epoch semantics preserved); strings are length-capped so attacker input
  // cannot smuggle unbounded text into persisted result metadata.
  const lastVerifiedAtRaw = assumptions.lastVerifiedAt ?? assumptions.last_verified_at;
  const lastVerifiedAt =
    (typeof lastVerifiedAtRaw === 'string' && lastVerifiedAtRaw.length <= 64) ||
    (typeof lastVerifiedAtRaw === 'number' && Number.isFinite(lastVerifiedAtRaw))
      ? (lastVerifiedAtRaw as string)
      : '2026-02-01';
  const creditedTonnes = fundPrice > 0 ? Math.min(exceedance, (capex * creditRate) / fundPrice) : 0;
  const residualTonnes = Math.max(0, exceedance - creditedTonnes);

  const complianceYear = normalizeTierComplianceYear(
    input.complianceYear ?? input.compliance_year,
    new Date(`${asOfDate}T00:00:00.000Z`).getUTCFullYear(),
  );
  const creditUseLimit = getTierCreditUseLimit(complianceYear);
  const creditEligibleTonnes = exceedance * creditUseLimit;
  const fundRemainderTonnes = exceedance - creditEligibleTonnes;

  const fundPaymentCost = round(exceedance * fundPrice);
  const marketCreditsCost = round(
    creditEligibleTonnes * marketPrice + fundRemainderTonnes * fundPrice,
  );
  const directInvestmentCost = round(capex + residualTonnes * fundPrice);
  const candidates = [
    ['fund_payment', fundPaymentCost],
    ['market_credits', marketCreditsCost],
    ['direct_investment', directInvestmentCost],
  ].sort((a: any, b: any) => a[1] - b[1]);
  const warnings: string[] = [];
  if (daysBetween(lastVerifiedAt, asOfDate) > 90) {
    warnings.push('TIER pricing assumptions are stale; verify current Alberta rules before using for a binding decision.');
  }
  if (discountRate < 0 || discountRate > 0.5) {
    warnings.push('Discount rate is outside the normal scenario range; review financing assumptions.');
  }

  return {
    annualEmissionsTonnes: Math.min(Math.max(0, numOr(input.annualEmissionsTonnes ?? input.annual_emissions_tonnes, 0)), MAX_SCENARIO_NUMERIC),
    benchmarkExceedanceTonnes: exceedance,
    pathways: {
      fundPayment: { costCad: fundPaymentCost, priceCadPerTonne: fundPrice },
      marketCredits: {
        costCad: marketCreditsCost,
        priceCadPerTonne: marketPrice,
        creditUseLimit,
        creditEligibleTonnes: round(creditEligibleTonnes, 3),
        fundRemainderTonnes: round(fundRemainderTonnes, 3),
      },
      directInvestment: {
        costCad: directInvestmentCost,
        capexCad: capex,
        creditedTonnes: round(creditedTonnes, 3),
        residualTonnes: round(residualTonnes, 3),
      },
    },
    bestPathway: candidates[0][0],
    estimatedSavingsCad: round(fundPaymentCost - Number(candidates[0][1])),
    warnings,
    meta: buildMeta({
      modelVersion: 'tier-deterministic-v1',
      validAt: `${asOfDate}T00:00:00.000Z`,
      confidenceScore: warnings.length ? 0.74 : 0.9,
      dataSources: [{ name: 'Alberta TIER pricing assumptions', url: 'https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation', lastUpdated: lastVerifiedAt }],
      isFallback: false,
      methodology: 'Deterministic compliance pathway cost comparison; market credits blend credits up to the regulated credit use limit with a fund payment on the remainder; estimates are not binding financial advice.',
      warnings,
      generatedAt: `${asOfDate}T00:00:00.000Z`,
      claimLabel: 'estimated',
    }),
  };
}

export function evaluateRateWatchdog(input: any) {
  // numOr + caps mirror the tier path so malformed inputs can't emit NaN or
  // Infinity savings (asymmetric hardening was flagged in the wedge audit).
  const usageKwh = Math.min(Math.max(0, numOr(input.usageKwh ?? input.usage_kwh, 600)), MAX_SCENARIO_NUMERIC);
  const currentRate = Math.min(Math.max(0, numOr(input.currentRateCadPerKwh ?? input.current_rate_cad_per_kwh, 0.1205)), MAX_SCENARIO_NUMERIC);
  const offers = Array.isArray(input.retailerOffers ?? input.retailer_offers)
    ? input.retailerOffers ?? input.retailer_offers
    : [];
  const evaluatedOffers = offers.map((offer: any) => {
    const fixedRate = Math.min(Math.max(0, numOr(offer.fixedRateCadPerKwh ?? offer.fixed_rate_cad_per_kwh ?? (offer.fixedRate != null ? offer.fixedRate / 100 : 0), 0)), MAX_SCENARIO_NUMERIC);
    const cancellationFee = Math.min(Math.max(0, numOr(offer.cancellationFeeCad ?? offer.cancellation_fee_cad, 0)), MAX_SCENARIO_NUMERIC);
    const monthlySavingsCad = (currentRate - fixedRate) * usageKwh;
    return {
      id: offer.id,
      name: offer.name,
      fixedRateCadPerKwh: fixedRate,
      termMonths: numOr(offer.termMonths ?? offer.term_months ?? offer.term, 0),
      estimatedMonthlySavingsCad: round(monthlySavingsCad),
      estimatedYearlySavingsCad: round(monthlySavingsCad * 12 - cancellationFee),
      percentSavings: currentRate > 0 ? round(((currentRate - fixedRate) / currentRate) * 100, 1) : 0,
    };
  }).sort((a: any, b: any) => b.estimatedYearlySavingsCad - a.estimatedYearlySavingsCad);
  const bestOffer = evaluatedOffers[0] ?? null;
  const warnings = ['Savings are estimates before delivery charges, taxes, bill-specific riders, and contract eligibility checks.'];
  return {
    province: input.province ?? 'AB',
    provider: input.provider ?? 'Default RoLR provider',
    usageKwh,
    currentRateCadPerKwh: currentRate,
    bestOffer,
    offers: evaluatedOffers,
    estimatedMonthlySavingsCad: bestOffer ? Math.max(0, bestOffer.estimatedMonthlySavingsCad) : 0,
    estimatedYearlySavingsCad: bestOffer ? Math.max(0, bestOffer.estimatedYearlySavingsCad) : 0,
    claimLabel: 'estimated',
    warnings,
    meta: buildMeta({
      modelVersion: 'rate-watchdog-v1',
      validAt: `${input.asOfDate ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
      confidenceScore: 0.78,
      dataSources: [{ name: 'Alberta UCA RoLR and retailer comparison assumptions', lastUpdated: input.asOfDate }],
      isFallback: true,
      methodology: 'Rate comparison calculator using current/default RoLR rate and user usage assumptions.',
      warnings,
      claimLabel: 'estimated',
    }),
  };
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function pearson(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 2) return 0;
  const xMean = mean(x);
  const yMean = mean(y);
  const numerator = x.reduce((sum, value, index) => sum + (value - xMean) * (y[index] - yMean), 0);
  const denominator = Math.sqrt(
    x.reduce((sum, value) => sum + (value - xMean) ** 2, 0) *
    y.reduce((sum, value) => sum + (value - yMean) ** 2, 0),
  );
  return denominator === 0 ? 0 : numerator / denominator;
}

export function rankFeaturesRfeV1(rows: Array<Record<string, number>>, targetKey: string, minFeatures = 3) {
  const featureNames = Object.keys(rows[0] ?? {}).filter((key) => key !== targetKey);
  const target = rows.map((row) => Number(row[targetKey]));
  const sortedTarget = [...target].sort((left, right) => left - right);
  const targetThreshold = sortedTarget.length ? sortedTarget[Math.floor(sortedTarget.length / 2)] : 0;
  const rankings = featureNames.map((feature) => ({
    feature,
    score: round(Math.abs(pearson(rows.map((row) => Number(row[feature])), target)), 6),
    retained: true,
    dropReason: null as string | null,
  })).sort((a, b) => b.score - a.score || a.feature.length - b.feature.length || a.feature.localeCompare(b.feature));
  const retained = new Set(rankings.map((ranking) => ranking.feature));
  for (const ranking of [...rankings].reverse()) {
    if (retained.size <= minFeatures) break;
    if (ranking.score < 0.05) {
      retained.delete(ranking.feature);
      ranking.retained = false;
      ranking.dropReason = 'low_signal';
    }
  }
  const retainedFeatures = rankings.filter((ranking) => retained.has(ranking.feature)).map((ranking) => ranking.feature);
  const droppedFeatures = rankings
    .filter((ranking) => !retained.has(ranking.feature))
    .map((ranking) => ({
      feature: ranking.feature,
      reason: ranking.dropReason ?? 'recursive_elimination',
      score: ranking.score,
    }));
  return {
    modelVersion: 'svm-rfe-adapter-v1',
    retainedFeatures,
    droppedFeatures,
    rankings,
    trainingSummary: {
      samples: rows.length,
      positiveRate: round(target.length ? target.filter((value) => value >= targetThreshold).length / target.length : 0, 4),
      targetThreshold,
      margin: round(Math.max(0, (rankings[0]?.score ?? 0) - (rankings[rankings.length - 1]?.score ?? 0)), 4),
    },
  };
}

function normalizedDistance(left: number[], right: number[]) {
  const cleanLeft = left.filter(Number.isFinite).sort((a, b) => a - b);
  const cleanRight = right.filter(Number.isFinite).sort((a, b) => a - b);
  if (!cleanLeft.length || !cleanRight.length) return 0;
  const n = Math.max(cleanLeft.length, cleanRight.length);
  const scale = Math.max(Math.max(...cleanLeft) - Math.min(...cleanLeft), Math.max(...cleanRight) - Math.min(...cleanRight), Math.abs(mean(cleanLeft)), Math.abs(mean(cleanRight)), 1);
  let distance = 0;
  for (let i = 0; i < n; i++) {
    const q = n === 1 ? 0 : i / (n - 1);
    distance += Math.abs(cleanLeft[Math.round(q * (cleanLeft.length - 1))] - cleanRight[Math.round(q * (cleanRight.length - 1))]) / scale;
  }
  return distance / n;
}

export function detectDrift(input: any) {
  const threshold = Number(input.threshold ?? 0.3);
  const metrics: Record<string, any> = {};
  let driftDetected = false;
  let maxDistance = 0;
  for (const feature of Object.keys(input.baseline ?? {})) {
    // Untrusted shapes must not TypeError — a non-array distribution is an
    // empty distribution, not a per-request 500.
    const distance = round(normalizedDistance(
      Array.isArray(input.baseline[feature]) ? input.baseline[feature] : [],
      Array.isArray(input.recent?.[feature]) ? input.recent[feature] : [],
    ), 6);
    metrics[feature] = { distance, threshold, drift: distance > threshold };
    driftDetected ||= distance > threshold;
    maxDistance = Math.max(maxDistance, distance);
  }
  return {
    modelVersion: 'wasserstein-drift-v1',
    status: driftDetected ? 'drift_detected' : 'stable',
    metrics,
    confidenceMultiplier: round(driftDetected ? Math.max(0.4, 1 - maxDistance) : 1, 4),
    recommendation: driftDetected ? 'Lower forecast confidence and schedule model retraining.' : 'No retraining trigger from distribution drift.',
  };
}

export function forecastPriceSpikeRisk(input: any) {
  const rules = [
    { hit: Number(input.poolPriceCadPerMwh ?? input.pool_price_cad_per_mwh ?? 0) >= 700, reason: 'current_pool_price_elevated' },
    { hit: Number(input.reserveMarginPercent ?? input.reserve_margin_percent ?? 0) <= 5, reason: 'reserve_margin_tight' },
    { hit: Number(input.demandMw ?? input.demand_mw ?? 0) >= 11000, reason: 'demand_near_peak' },
    { hit: Number(input.windGenerationMw ?? input.wind_generation_mw ?? 0) <= 250, reason: 'low_wind_generation' },
    { hit: Number(input.temperatureC ?? input.temperature_c ?? 0) <= -25 || Number(input.temperatureC ?? input.temperature_c ?? 0) >= 30, reason: 'extreme_temperature' },
  ];
  const hits = rules.filter((rule) => rule.hit);
  return { modelVersion: 'bagged-threshold-price-spike-v1', spikeThresholdCadPerMwh: 1000, riskScore: round(clamp(hits.length / rules.length), 4), reasons: hits.map((rule) => rule.reason) };
}

export function evaluateGridRisk(input: any) {
  const topology = input.topology && typeof input.topology === 'object' ? input.topology : { nodes: [], edges: [] };
  const edges = Array.isArray(topology.edges) ? topology.edges : [];
  const recommendations = Array.isArray(input.recommendations) ? input.recommendations : [];
  const overloadedEdges = edges.filter((edge: any) => Number(edge.limitMw ?? edge.limit_mw ?? 0) > 0 && Math.abs(Number(edge.currentMw ?? edge.current_mw ?? 0)) / Number(edge.limitMw ?? edge.limit_mw) >= 0.9);
  const recommendationResults = recommendations.map((recommendation: any) => {
    const violations: string[] = [];
    if (Number(recommendation.magnitudeMw ?? recommendation.magnitude_mw ?? 0) > Number(recommendation.maxCapacityMw ?? recommendation.max_capacity_mw ?? 0)) violations.push('capacity_limit_exceeded');
    if (Number(recommendation.magnitudeMw ?? recommendation.magnitude_mw ?? 0) > Number(recommendation.rampLimitMwPerHour ?? recommendation.ramp_limit_mw_per_hour ?? 0)) violations.push('ramp_limit_exceeded');
    if (Number(input.reserveMarginPercent ?? input.reserve_margin_percent ?? 0) < 3 && recommendation.action !== 'hold') violations.push('reserve_margin_critical');
    return { id: recommendation.id, accepted: violations.length === 0, violations };
  });
  const riskScore = clamp((Number(input.reserveMarginPercent ?? input.reserve_margin_percent ?? 0) < 3 ? 0.35 : 0) + (Math.abs(Number(input.frequencyHz ?? input.frequency_hz ?? 60) - 60) > 0.15 ? 0.25 : 0) + overloadedEdges.length * 0.15 + (recommendationResults.some((item: any) => !item.accepted) ? 0.2 : 0));
  return { modelVersion: 'constraint-grid-risk-v1', region: input.region ?? 'AB', systemStatus: riskScore >= 0.7 ? 'critical' : riskScore >= 0.45 ? 'stressed' : 'stable', riskScore: round(riskScore, 4), overloadedEdges, recommendationResults, methodology: 'Constraint-aware advisory validation; not a full AC optimal power-flow solver.' };
}
