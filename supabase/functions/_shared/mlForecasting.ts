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
  claim_label?: 'estimated' | 'advisory' | 'validated';
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
  claimLabel?: 'estimated' | 'advisory' | 'validated';
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

export function calculateTierScenario(input: any) {
  const asOfDate = input.asOfDate ?? new Date().toISOString().slice(0, 10);
  const assumptions = input.creditAssumptions ?? {};
  const exceedance = Math.max(0, Number(input.benchmarkExceedanceTonnes ?? input.benchmark_exceedance_tonnes ?? 0));
  const capex = Math.max(0, Number(input.directInvestmentCapexCad ?? input.direct_investment_capex_cad ?? 0));
  const fundPrice = Math.max(0, Number(assumptions.fundPriceCadPerTonne ?? assumptions.fund_price_cad_per_tonne ?? 95));
  const marketPrice = Math.max(0, Number(assumptions.marketCreditPriceCadPerTonne ?? assumptions.market_credit_price_cad_per_tonne ?? 25));
  const creditRate = Math.max(0, Number(assumptions.directInvestmentCreditRate ?? assumptions.direct_investment_credit_rate ?? 0.8));
  const lastVerifiedAt = assumptions.lastVerifiedAt ?? assumptions.last_verified_at ?? '2026-02-01';
  const creditedTonnes = fundPrice > 0 ? Math.min(exceedance, (capex * creditRate) / fundPrice) : 0;
  const residualTonnes = Math.max(0, exceedance - creditedTonnes);
  const fundPaymentCost = round(exceedance * fundPrice);
  const marketCreditsCost = round(exceedance * marketPrice);
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

  return {
    annualEmissionsTonnes: Math.max(0, Number(input.annualEmissionsTonnes ?? input.annual_emissions_tonnes ?? 0)),
    benchmarkExceedanceTonnes: exceedance,
    pathways: {
      fundPayment: { costCad: fundPaymentCost, priceCadPerTonne: fundPrice },
      marketCredits: { costCad: marketCreditsCost, priceCadPerTonne: marketPrice },
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
      methodology: 'Deterministic compliance pathway cost comparison; estimates are not binding financial advice.',
      warnings,
      generatedAt: `${asOfDate}T00:00:00.000Z`,
      claimLabel: 'estimated',
    }),
  };
}

export function evaluateRateWatchdog(input: any) {
  const usageKwh = Math.max(0, Number(input.usageKwh ?? input.usage_kwh ?? 600));
  const currentRate = Math.max(0, Number(input.currentRateCadPerKwh ?? input.current_rate_cad_per_kwh ?? 0.1205));
  const offers = Array.isArray(input.retailerOffers ?? input.retailer_offers)
    ? input.retailerOffers ?? input.retailer_offers
    : [];
  const evaluatedOffers = offers.map((offer: any) => {
    const fixedRate = Math.max(0, Number(offer.fixedRateCadPerKwh ?? offer.fixed_rate_cad_per_kwh ?? (offer.fixedRate != null ? offer.fixedRate / 100 : 0)));
    const monthlySavingsCad = (currentRate - fixedRate) * usageKwh;
    return {
      id: offer.id,
      name: offer.name,
      fixedRateCadPerKwh: fixedRate,
      termMonths: Number(offer.termMonths ?? offer.term_months ?? offer.term ?? 0),
      estimatedMonthlySavingsCad: round(monthlySavingsCad),
      estimatedYearlySavingsCad: round(monthlySavingsCad * 12 - Math.max(0, Number(offer.cancellationFeeCad ?? offer.cancellation_fee_cad ?? 0))),
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
    const distance = round(normalizedDistance(input.baseline[feature], input.recent?.[feature] ?? []), 6);
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
  const topology = input.topology ?? { nodes: [], edges: [] };
  const recommendations = input.recommendations ?? [];
  const overloadedEdges = topology.edges.filter((edge: any) => Number(edge.limitMw ?? edge.limit_mw ?? 0) > 0 && Math.abs(Number(edge.currentMw ?? edge.current_mw ?? 0)) / Number(edge.limitMw ?? edge.limit_mw) >= 0.9);
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
