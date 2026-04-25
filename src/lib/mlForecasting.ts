import {
  analyzePvFaultGraph,
  calculatePolicyOverlayRisk,
  evaluatePhysicsInformedDispatch,
  evaluateSecurityConstrainedDispatch,
  backtestRareEventResampling,
  forecastGasBasisSpread,
  forecastPriceSpikeRiskForest,
  generateKMeansSmote,
  rankFeaturesSvmRfeV2,
  simulateByopMultiAgent,
} from './advancedForecasting';
import dispatchWeights from './modelWeights/dispatch-pinn-v2.json';
import pvWeights from './modelWeights/pv-gnn-v2.json';

export interface MlDataSource {
  name: string;
  url?: string;
  lastUpdated?: string;
}

export interface EvaluationSummary {
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
}

export interface SimulatorConfig {
  name: string;
  version: string;
  scenario_count: number;
  topology?: string;
}

export type ForecastTrainingDataProfile = 'real' | 'mixed' | 'synthetic' | 'simulator-calibrated';

export interface SharedForecastMeta {
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
}

export {
  analyzePvFaultGraph,
  calculatePolicyOverlayRisk,
  backtestRareEventResampling,
  evaluatePhysicsInformedDispatch,
  evaluateSecurityConstrainedDispatch,
  forecastGasBasisSpread,
  forecastPriceSpikeRiskForest,
  generateKMeansSmote,
  rankFeaturesSvmRfeV2,
  simulateByopMultiAgent,
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

export function buildForecastResponseMeta(params: {
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
}): SharedForecastMeta {
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const staleAfterDays = params.staleAfterDays ?? 90;
  const freshestSourceDate = params.dataSources
    .map((source) => source.lastUpdated)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  const staleness_status = freshestSourceDate
    ? daysBetween(freshestSourceDate, generatedAt) > staleAfterDays ? 'stale' : 'fresh'
    : 'unknown';

  const meta: SharedForecastMeta = {
    model_version: params.modelVersion,
    generated_at: generatedAt,
    valid_at: params.validAt,
    confidence_score: round(clamp(params.confidenceScore), 4),
    data_sources: params.dataSources,
    is_fallback: params.isFallback,
    staleness_status,
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

export interface TierScenarioInput {
  annualEmissionsTonnes: number;
  benchmarkExceedanceTonnes: number;
  directInvestmentCapexCad: number;
  creditAssumptions: {
    fundPriceCadPerTonne: number;
    marketCreditPriceCadPerTonne: number;
    directInvestmentCreditRate: number;
    lastVerifiedAt: string;
  };
  discountRate: number;
  asOfDate?: string;
}

export interface TierScenarioResult {
  annualEmissionsTonnes: number;
  benchmarkExceedanceTonnes: number;
  pathways: {
    fundPayment: { costCad: number; priceCadPerTonne: number };
    marketCredits: { costCad: number; priceCadPerTonne: number };
    directInvestment: { costCad: number; capexCad: number; creditedTonnes: number; residualTonnes: number };
  };
  bestPathway: 'fund_payment' | 'market_credits' | 'direct_investment';
  estimatedSavingsCad: number;
  warnings: string[];
  meta: SharedForecastMeta;
}

export function calculateTierScenario(input: TierScenarioInput): TierScenarioResult {
  const asOfDate = input.asOfDate ?? new Date().toISOString().slice(0, 10);
  const exceedance = Math.max(0, input.benchmarkExceedanceTonnes);
  const capex = Math.max(0, input.directInvestmentCapexCad);
  const fundPrice = Math.max(0, input.creditAssumptions.fundPriceCadPerTonne);
  const marketPrice = Math.max(0, input.creditAssumptions.marketCreditPriceCadPerTonne);
  const creditRate = Math.max(0, input.creditAssumptions.directInvestmentCreditRate);
  const creditedTonnes = fundPrice > 0 ? Math.min(exceedance, (capex * creditRate) / fundPrice) : 0;
  const residualTonnes = Math.max(0, exceedance - creditedTonnes);

  const fundPaymentCost = round(exceedance * fundPrice);
  const marketCreditsCost = round(exceedance * marketPrice);
  const directInvestmentCost = round(capex + residualTonnes * fundPrice);

  const candidates = [
    ['fund_payment', fundPaymentCost] as const,
    ['market_credits', marketCreditsCost] as const,
    ['direct_investment', directInvestmentCost] as const,
  ].sort((a, b) => a[1] - b[1]);

  const warnings: string[] = [];
  if (daysBetween(input.creditAssumptions.lastVerifiedAt, asOfDate) > 90) {
    warnings.push('TIER pricing assumptions are stale; verify current Alberta rules before using for a binding decision.');
  }
  if (input.discountRate < 0 || input.discountRate > 0.5) {
    warnings.push('Discount rate is outside the normal scenario range; review financing assumptions.');
  }

  return {
    annualEmissionsTonnes: Math.max(0, input.annualEmissionsTonnes),
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
    estimatedSavingsCad: round(fundPaymentCost - candidates[0][1]),
    warnings,
    meta: buildForecastResponseMeta({
      modelVersion: 'tier-deterministic-v1',
      validAt: `${asOfDate}T00:00:00.000Z`,
      confidenceScore: warnings.length > 0 ? 0.74 : 0.9,
      dataSources: [
        {
          name: 'Alberta TIER pricing assumptions',
          url: 'https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation',
          lastUpdated: input.creditAssumptions.lastVerifiedAt,
        },
      ],
      isFallback: false,
      methodology: 'Deterministic compliance pathway cost comparison; estimates are not binding financial advice.',
      warnings,
      generatedAt: `${asOfDate}T00:00:00.000Z`,
      claimLabel: 'estimated',
    }),
  };
}

export interface RetailerOfferInput {
  id: string;
  name: string;
  fixedRateCadPerKwh: number;
  termMonths: number;
  cancellationFeeCad?: number;
}

export function evaluateRateWatchdog(input: {
  province: string;
  usageKwh: number;
  currentRateCadPerKwh: number;
  provider: string;
  retailerOffers: RetailerOfferInput[];
  asOfDate?: string;
}) {
  const usageKwh = Math.max(0, input.usageKwh);
  const currentRate = Math.max(0, input.currentRateCadPerKwh);
  const evaluatedOffers = input.retailerOffers.map((offer) => {
    const monthlySavingsCad = (currentRate - Math.max(0, offer.fixedRateCadPerKwh)) * usageKwh;
    const yearlySavingsCad = monthlySavingsCad * 12 - Math.max(0, offer.cancellationFeeCad ?? 0);
    return {
      ...offer,
      estimatedMonthlySavingsCad: round(monthlySavingsCad),
      estimatedYearlySavingsCad: round(yearlySavingsCad),
      percentSavings: currentRate > 0 ? round(((currentRate - offer.fixedRateCadPerKwh) / currentRate) * 100, 1) : 0,
    };
  }).sort((a, b) => b.estimatedYearlySavingsCad - a.estimatedYearlySavingsCad);

  const bestOffer = evaluatedOffers[0] ?? null;
  const warnings = [
    'Savings are estimates before delivery charges, taxes, bill-specific riders, and contract eligibility checks.',
  ];

  return {
    province: input.province,
    provider: input.provider,
    usageKwh,
    currentRateCadPerKwh: currentRate,
    bestOffer,
    offers: evaluatedOffers,
    estimatedMonthlySavingsCad: bestOffer ? Math.max(0, bestOffer.estimatedMonthlySavingsCad) : 0,
    estimatedYearlySavingsCad: bestOffer ? Math.max(0, bestOffer.estimatedYearlySavingsCad) : 0,
    claimLabel: 'estimated' as const,
    warnings,
    meta: buildForecastResponseMeta({
      modelVersion: 'rate-watchdog-v1',
      validAt: `${input.asOfDate ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
      confidenceScore: 0.78,
      dataSources: [{ name: 'Alberta UCA RoLR and retailer comparison assumptions', lastUpdated: input.asOfDate }],
      isFallback: true,
      methodology: 'Rate comparison calculator using current/default RoLR rate and user usage assumptions.',
      warnings,
      claimLabel: 'estimated',
      generatedAt: `${input.asOfDate ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
    }),
  };
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - avg) ** 2)));
}

function pearson(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  const xMean = mean(x);
  const yMean = mean(y);
  const numerator = x.reduce((sum, value, index) => sum + (value - xMean) * (y[index] - yMean), 0);
  const denominator = Math.sqrt(
    x.reduce((sum, value) => sum + (value - xMean) ** 2, 0)
    * y.reduce((sum, value) => sum + (value - yMean) ** 2, 0)
  );
  return denominator === 0 ? 0 : numerator / denominator;
}

export function rankFeaturesRfeV1(
  rows: Array<Record<string, number>>,
  targetKey: string,
  options: { minFeatures?: number; correlationPruneThreshold?: number } = {},
) {
  return rankFeaturesSvmRfeV2(rows, targetKey, {
    minFeatures: options.minFeatures,
  });
}

function normalizedQuantileDistance(left: number[], right: number[]): number {
  const cleanLeft = left.filter(Number.isFinite).sort((a, b) => a - b);
  const cleanRight = right.filter(Number.isFinite).sort((a, b) => a - b);
  if (cleanLeft.length === 0 || cleanRight.length === 0) return 0;
  const n = Math.max(cleanLeft.length, cleanRight.length);
  const leftRange = Math.max(...cleanLeft) - Math.min(...cleanLeft);
  const rightRange = Math.max(...cleanRight) - Math.min(...cleanRight);
  const scale = Math.max(leftRange, rightRange, Math.abs(mean(cleanLeft)), Math.abs(mean(cleanRight)), 1);
  let distance = 0;
  for (let i = 0; i < n; i++) {
    const q = n === 1 ? 0 : i / (n - 1);
    const leftIdx = Math.min(cleanLeft.length - 1, Math.round(q * (cleanLeft.length - 1)));
    const rightIdx = Math.min(cleanRight.length - 1, Math.round(q * (cleanRight.length - 1)));
    distance += Math.abs(cleanLeft[leftIdx] - cleanRight[rightIdx]) / scale;
  }
  return distance / n;
}

export function detectWassersteinDrift(input: {
  baseline: Record<string, number[]>;
  recent: Record<string, number[]>;
  threshold?: number;
}) {
  const threshold = input.threshold ?? 0.3;
  const metrics: Record<string, { distance: number; threshold: number; drift: boolean }> = {};
  let maxDistance = 0;
  for (const feature of Object.keys(input.baseline)) {
    const distance = round(normalizedQuantileDistance(input.baseline[feature], input.recent[feature] ?? []), 6);
    metrics[feature] = { distance, threshold, drift: distance > threshold };
    maxDistance = Math.max(maxDistance, distance);
  }
  const status = Object.values(metrics).some((metric) => metric.drift)
    ? 'drift_detected'
    : 'stable';
  return {
    modelVersion: 'wasserstein-drift-v1',
    status,
    metrics,
    confidenceMultiplier: round(status === 'drift_detected' ? Math.max(0.4, 1 - maxDistance) : 1, 4),
    recommendation: status === 'drift_detected'
      ? 'Lower forecast confidence and schedule model retraining.'
      : 'No retraining trigger from distribution drift.',
  };
}

export function forecastPriceSpikeRisk(input: {
  province: string;
  poolPriceCadPerMwh: number;
  demandMw: number;
  reserveMarginPercent: number;
  windGenerationMw: number;
  temperatureC: number;
  trainingRows?: Array<Parameters<typeof forecastPriceSpikeRiskForest>[0]['trainingRows'] extends Array<infer T> ? T : never>;
}) {
  return {
    ...forecastPriceSpikeRiskForest(input),
    modelVersion: 'random-forest-price-spike-v1',
  };
}

export function evaluateGridRisk(input: {
  region: string;
  reserveMarginPercent: number;
  frequencyHz: number;
  loadMw?: number;
  availableGenerationMw?: number;
  recommendations: Array<{ id: string; action: string; magnitudeMw: number; maxCapacityMw: number; rampLimitMwPerHour: number }>;
  topology: {
    nodes: Array<{ id: string; status: string; capacityMw: number }>;
    edges: Array<{ fromNodeId: string; toNodeId: string; limitMw: number; currentMw: number }>;
  };
}) {
  return evaluateSecurityConstrainedDispatch({
    region: input.region,
    reserveMarginPercent: input.reserveMarginPercent,
    frequencyHz: input.frequencyHz,
    loadMw: input.loadMw,
    availableGenerationMw: input.availableGenerationMw,
    recommendations: input.recommendations,
    topology: input.topology,
  });
}

export interface WeakGridShortCircuitResult {
  modelVersion: string;
  region: string;
  weakGridRiskScore: number;
  shortCircuitLevelKa: number;
  status: 'stable' | 'watch' | 'warning' | 'critical';
  weakNodes: string[];
  nodeAssessments: Array<{
    nodeId: string;
    shortCircuitKa: number;
    riskBand: 'stable' | 'watch' | 'warning' | 'critical';
    ruleTags: string[];
    flagged: boolean;
  }>;
  ruleMappings: Array<{
    ruleId: string;
    ruleLabel: string;
    triggered: boolean;
    description: string;
    nodeIds: string[];
  }>;
  thresholds: {
    minimumShortCircuitKa: number;
    inverterPenetrationPct: number;
    reserveMarginPercent: number;
  };
  alertCondition: 'monitor' | 'operator_watch' | 'immediate_review';
  warnings: string[];
  methodology: string;
}

export function evaluateWeakGridShortCircuit(input: {
  region: string;
  shortCircuitLevelKa?: number;
  minimumShortCircuitKa?: number;
  inverterPenetrationPct?: number;
  reserveMarginPercent?: number;
  topology?: {
    nodes?: Array<{ id: string; status?: string; capacityMw?: number; shortCircuitKa?: number }>;
    edges?: Array<{ fromNodeId: string; toNodeId: string; limitMw: number; currentMw: number }>;
  };
}) {
  const shortCircuitLevelKa = Math.max(0, Number(input.shortCircuitLevelKa ?? 5));
  const minimumShortCircuitKa = Math.max(0.1, Number(input.minimumShortCircuitKa ?? 8));
  const inverterPenetrationPct = Math.max(0, Number(input.inverterPenetrationPct ?? 35));
  const reserveMarginPercent = Math.max(0, Number(input.reserveMarginPercent ?? 6));
  const edges = input.topology?.edges ?? [];
  const nodes = input.topology?.nodes ?? [];
  const overloadedEdgeShare = edges.length
    ? edges.filter((edge) => Math.abs(edge.currentMw) / Math.max(1, edge.limitMw) >= 0.9).length / edges.length
    : 0;
  const nodeAssessments = nodes.map((node) => {
    const nodeShortCircuitKa = Math.max(0, Number(node.shortCircuitKa ?? shortCircuitLevelKa));
    const flagged = nodeShortCircuitKa < minimumShortCircuitKa;
    const ruleTags = [
      flagged ? 'aeso_short_circuit_minimum' : null,
      inverterPenetrationPct >= 40 ? 'aeso_high_inverter_penetration' : null,
      reserveMarginPercent <= 6 ? 'aeso_reserve_margin_watch' : null,
    ].filter((tag): tag is string => Boolean(tag));
    const riskBand: 'stable' | 'watch' | 'warning' | 'critical' = flagged
      ? (nodeShortCircuitKa < minimumShortCircuitKa * 0.75 ? 'critical' : 'warning')
      : overloadedEdgeShare > 0 ? 'watch' : 'stable';
    return {
      nodeId: node.id,
      shortCircuitKa: round(nodeShortCircuitKa, 4),
      riskBand,
      ruleTags,
      flagged,
    };
  });
  const weakNodes = nodeAssessments.filter((node) => node.flagged).map((node) => node.nodeId);

  const weakGridRiskScore = round(clamp(
    ((minimumShortCircuitKa - shortCircuitLevelKa) / minimumShortCircuitKa) * 0.45
    + clamp(inverterPenetrationPct / 100) * 0.2
    + clamp((10 - reserveMarginPercent) / 10) * 0.15
    + clamp(overloadedEdgeShare) * 0.2,
  ), 4);

  const warnings = [
    shortCircuitLevelKa < minimumShortCircuitKa ? 'Short-circuit strength is below the configured minimum.' : null,
    inverterPenetrationPct >= 40 ? 'High inverter penetration increases sensitivity to weak-grid events.' : null,
    overloadedEdgeShare > 0 ? 'Transmission loading is elevated on one or more monitored edges.' : null,
  ].filter((warning): warning is string => Boolean(warning));

  const ruleMappings = [
    {
      ruleId: 'AESO-SC-001',
      ruleLabel: 'Short-circuit minimum',
      triggered: weakNodes.length > 0,
      description: 'Nodes below the minimum short-circuit threshold require protection review.',
      nodeIds: weakNodes,
    },
    {
      ruleId: 'AESO-SC-002',
      ruleLabel: 'Inverter penetration watch',
      triggered: inverterPenetrationPct >= 40,
      description: 'High inverter penetration can amplify weak-grid sensitivity.',
      nodeIds: nodeAssessments.filter((node) => node.ruleTags.includes('aeso_high_inverter_penetration')).map((node) => node.nodeId),
    },
    {
      ruleId: 'AESO-SC-003',
      ruleLabel: 'Reserve margin watch',
      triggered: reserveMarginPercent <= 6,
      description: 'Thin reserve margins reduce operational headroom for weak-grid mitigation.',
      nodeIds: nodeAssessments.filter((node) => node.ruleTags.includes('aeso_reserve_margin_watch')).map((node) => node.nodeId),
    },
    {
      ruleId: 'AESO-SC-004',
      ruleLabel: 'Congested edge pressure',
      triggered: overloadedEdgeShare > 0,
      description: 'High transmission loading around weak nodes should trigger additional review.',
      nodeIds: [],
    },
  ];

  return {
    modelVersion: 'weak-grid-short-circuit-v1',
    region: input.region,
    weakGridRiskScore,
    shortCircuitLevelKa: round(shortCircuitLevelKa, 4),
    status: weakGridRiskScore >= 0.75 ? 'critical' : weakGridRiskScore >= 0.55 ? 'warning' : weakGridRiskScore >= 0.35 ? 'watch' : 'stable',
    weakNodes,
    nodeAssessments,
    ruleMappings,
    thresholds: {
      minimumShortCircuitKa,
      inverterPenetrationPct: round(inverterPenetrationPct, 2),
      reserveMarginPercent: round(reserveMarginPercent, 2),
    },
    alertCondition: weakGridRiskScore >= 0.75 ? 'immediate_review' : weakGridRiskScore >= 0.55 ? 'operator_watch' : 'monitor',
    warnings,
    methodology: 'Weak-grid screening using short-circuit level, inverter penetration, reserve margin, and congested-edge pressure.',
  } satisfies WeakGridShortCircuitResult;
}

export type MlForecastDomain =
  | 'load'
  | 'price_spike'
  | 'solar'
  | 'wind'
  | 'gas_basis'
  | 'dispatch'
  | 'byop_load'
  | 'pv_fault'
  | 'policy_overlay'
  | 'short_circuit';

export function buildLocalMlForecastRun(input: {
  domain: MlForecastDomain | string;
  province: string;
  horizon_hours: number;
  scenario?: Record<string, unknown>;
  force_refresh?: boolean;
}) {
  const now = new Date();
  const domain = String(input.domain ?? 'load') as MlForecastDomain;
  const province = String(input.province ?? 'AB').toUpperCase();
  const scenario = input.scenario ?? {};
  const horizonHours = Math.min(168, Math.max(1, Number(input.horizon_hours ?? 24)));
  const sampleRows = [
    { temperature_c: -15, demand_mw: 11500, reserve_margin_percent: 4, wind_generation_mw: 150, target: 850 },
    { temperature_c: 5, demand_mw: 9800, reserve_margin_percent: 12, wind_generation_mw: 900, target: 120 },
    { temperature_c: 30, demand_mw: 11200, reserve_margin_percent: 5, wind_generation_mw: 260, target: 650 },
    { temperature_c: 18, demand_mw: 9000, reserve_margin_percent: 18, wind_generation_mw: 700, target: 80 },
  ];
  const featureRanking = rankFeaturesRfeV1(sampleRows, 'target', { minFeatures: 3 });
  const positiveForecast = (base: number, hour: number, forecastDomain: string) => {
    const daily = Math.sin((hour / 24) * Math.PI * 2);
    const trend = hour * 0.04;
    const multiplier = forecastDomain === 'solar' ? Math.max(0, daily) : 1 + daily * 0.08;
    return Math.max(0, Math.round((base * multiplier + trend) * 100) / 100);
  };

  let analysis: any = null;
  let modelVersion = 'svm-rfe-adapter-v1';
  let confidenceScore = 0.76;
  let methodology = 'Lightweight v1 forecast adapter with positive forecasts, feature ranking, and baseline-ready metadata.';
  let warnings = ['Backtest against persistence and seasonal-naive baselines before claiming uplift.'];
  let isFallback = true;
  let dataSources: MlDataSource[] = [{ name: 'Existing weather/load/AESO feature adapters' }];
  let trainingDataProfile: 'real' | 'mixed' | 'synthetic' | 'simulator-calibrated' | undefined;
  let evaluationSummary: EvaluationSummary | undefined;
  let calibrationStatus: 'calibrated' | 'uncalibrated' | 'drifting' | undefined;
  let claimLabel: 'estimated' | 'advisory' | 'validated' | undefined;
  let predictions = Array.from({ length: horizonHours }, (_, index) => {
    const validAt = new Date(now.getTime() + (index + 1) * 60 * 60 * 1000).toISOString();
    const predictedValue = positiveForecast(domain === 'solar' ? 400 : 10000, index + 1, domain);
    return {
      valid_at: validAt,
      target_name: `${domain}_forecast`,
      predicted_value: predictedValue,
      unit: 'MW',
      confidence_lower: Math.max(0, predictedValue * 0.9),
      confidence_upper: predictedValue * 1.1,
      risk_score: null,
      drivers: featureRanking.retainedFeatures,
      synthetic: false,
    };
  });

  if (domain === 'price_spike') {
    const spike = forecastPriceSpikeRisk({
      province,
      poolPriceCadPerMwh: Number(scenario.poolPriceCadPerMwh ?? 250),
      demandMw: Number(scenario.demandMw ?? 10500),
      reserveMarginPercent: Number(scenario.reserveMarginPercent ?? 8),
      windGenerationMw: Number(scenario.windGenerationMw ?? 500),
      temperatureC: Number(scenario.temperatureC ?? 0),
      trainingRows: Array.isArray(scenario.trainingRows) ? scenario.trainingRows as any : undefined,
    });
    analysis = spike;
    modelVersion = spike.modelVersion;
    confidenceScore = Math.max(0.45, 1 - spike.riskScore / 2);
    methodology = spike.methodology;
    trainingDataProfile = spike.trainingDataProfile;
    evaluationSummary = spike.evaluationSummary;
    calibrationStatus = spike.calibrationStatus;
    claimLabel = spike.claimLabel;
    predictions = predictions.map((prediction) => ({
      ...prediction,
      target_name: 'pool_price',
      unit: 'CAD/MWh',
      predicted_value: positiveForecast(Number(scenario.poolPriceCadPerMwh ?? 250), Number(new Date(prediction.valid_at).getHours()) || 1, 'price'),
      risk_score: spike.riskScore,
      drivers: spike.reasons,
    }));
  } else if (domain === 'dispatch') {
    const dispatchResult = evaluatePhysicsInformedDispatch({
      loadMw: Number(scenario.loadMw ?? scenario.demandMw ?? 10000),
      temperatureC: Number(scenario.temperatureC ?? 0),
      windGenerationMw: Number(scenario.windGenerationMw ?? 500),
      solarGenerationMw: Number(scenario.solarGenerationMw ?? 0),
      reserveMarginPercent: Number(scenario.reserveMarginPercent ?? 8),
      rampLimitMwPerHour: Number(scenario.rampLimitMwPerHour ?? 300),
      availableGenerationMw: Number(scenario.availableGenerationMw ?? Math.max(1000, Number(scenario.loadMw ?? scenario.demandMw ?? 10000) * 1.1)),
      previousDispatchMw: scenario.previousDispatchMw != null ? Number(scenario.previousDispatchMw) : undefined,
      hourOfDay: scenario.hourOfDay != null ? Number(scenario.hourOfDay) : undefined,
    }, dispatchWeights as any);
    analysis = dispatchResult;
    modelVersion = dispatchResult.modelVersion;
    confidenceScore = dispatchResult.confidenceScore;
    methodology = dispatchResult.methodology;
    warnings = dispatchResult.runtimeMode === 'trained'
      ? ['Simulator-calibrated dispatch runtime active; partner-data validation still pending.']
      : [
        dispatchResult.fallbackReason === 'placeholder_artifact_gate'
          ? 'Dispatch runtime remains heuristic until simulator-trained weights replace the placeholder artifact.'
          : 'Dispatch runtime remains heuristic until trained weights are enabled.',
      ];
    trainingDataProfile = dispatchResult.trainingDataProfile;
    evaluationSummary = dispatchResult.evaluationSummary;
    calibrationStatus = dispatchResult.calibrationStatus;
    claimLabel = dispatchResult.claimLabel;
    isFallback = dispatchResult.runtimeMode !== 'trained';
    dataSources = dispatchResult.runtimeMode === 'trained'
      ? [{ name: dispatchResult.simulatorConfig?.name ?? 'pandapower IEEE-30 simulator', lastUpdated: dispatchResult.trainedAt }]
      : [{ name: 'Existing weather/load/AESO feature adapters' }];
    predictions = Array.from({ length: horizonHours }, (_, index) => {
      const validAt = new Date(now.getTime() + (index + 1) * 60 * 60 * 1000).toISOString();
      return {
        valid_at: validAt,
        target_name: 'dispatch_mw',
        predicted_value: round(dispatchResult.predictedDispatchMw, 4),
        unit: 'MW',
        confidence_lower: round(Math.max(0, dispatchResult.predictedDispatchMw * 0.92), 4),
        confidence_upper: round(dispatchResult.predictedDispatchMw * 1.08, 4),
        risk_score: round(1 - dispatchResult.confidenceScore, 4),
        drivers: dispatchResult.constraintViolations.length > 0
          ? dispatchResult.constraintViolations
          : ['load', 'temperature', 'wind', 'solar', 'reserve', 'ramp'],
        synthetic: false,
      };
    });
  } else if (domain === 'gas_basis') {
    const gasBasis = forecastGasBasisSpread({
      aecoCadPerGj: Number(scenario.aecoCadPerGj ?? 1.65),
      henryHubCadPerGj: Number(scenario.henryHubCadPerGj ?? 3.05),
      pipelineCurtailmentPct: Number(scenario.pipelineCurtailmentPct ?? 7),
      storageDeficitPct: Number(scenario.storageDeficitPct ?? 10),
      temperatureC: Number(scenario.temperatureC ?? -12),
      basisLag1: Number(scenario.basisLag1 ?? 1.45),
      basisLag7: Number(scenario.basisLag7 ?? 1.4),
      trainingRows: Array.isArray(scenario.historyRows) ? scenario.historyRows as any : undefined,
      backtestRows: Array.isArray(scenario.backtestRows) ? scenario.backtestRows as any : undefined,
      sourceProfile: (scenario.sourceProfile === 'real' || scenario.sourceProfile === 'mixed' || scenario.sourceProfile === 'synthetic')
        ? scenario.sourceProfile
        : Array.isArray(scenario.historyRows) ? 'mixed' : 'synthetic',
    });
    analysis = gasBasis;
    modelVersion = gasBasis.modelVersion;
    confidenceScore = Math.max(0.48, 1 - gasBasis.wideningRisk / 2);
    methodology = gasBasis.methodology;
    trainingDataProfile = gasBasis.sourceProfile;
    evaluationSummary = {
      sample_count: gasBasis.backtest.sample_count,
      mae: gasBasis.backtest.maeCadPerGj,
      rmse: gasBasis.backtest.rmseCadPerGj,
      directional_accuracy: gasBasis.backtest.directionalAccuracy,
    };
    calibrationStatus = gasBasis.backtest.sample_count > 0 && gasBasis.backtest.directionalAccuracy >= 0.6
      ? 'calibrated'
      : gasBasis.backtest.sample_count > 0
        ? 'drifting'
        : 'uncalibrated';
    claimLabel = gasBasis.sourceProfile === 'real' && gasBasis.backtest.sample_count > 0
      ? 'validated'
      : gasBasis.sourceProfile === 'mixed'
        ? 'advisory'
        : 'estimated';
    warnings = gasBasis.sourceProfile === 'synthetic'
      ? ['Synthetic default corpus is used unless real AECO and Henry Hub history is supplied.']
      : [
        'AECO/Henry Hub history supplied; backtest metrics are computed against observed spread rows.',
        ...(gasBasis.backtest.sample_count > 0 ? [] : ['Gas basis backtest history is empty; confidence should remain advisory.']),
      ];
    predictions = predictions.map((prediction, index) => {
      const drift = Math.sin(((index + 1) / 24) * Math.PI * 2) * 0.05;
      const spread = Math.max(0, gasBasis.predictedSpreadCadPerGj + drift);
      return {
        ...prediction,
        target_name: 'aeco_henry_basis_spread',
        unit: 'CAD/GJ',
        predicted_value: round(spread, 4),
        confidence_lower: round(Math.max(0, spread - 0.2), 4),
        confidence_upper: round(spread + 0.2, 4),
        risk_score: gasBasis.wideningRisk,
        drivers: gasBasis.drivers,
      };
    });
  } else if (domain === 'byop_load') {
    const byop = simulateByopMultiAgent({
      baseLoadMw: Number(scenario.baseLoadMw ?? scenario.demandMw ?? 120),
      flexibilityPct: Number(scenario.flexibilityPct ?? 18),
      onSiteGenerationMw: Number(scenario.onSiteGenerationMw ?? 42),
      storageCapacityMwh: Number(scenario.storageCapacityMwh ?? 160),
      storagePowerMw: Number(scenario.storagePowerMw ?? 40),
      utilityImportCapMw: Number(scenario.utilityImportCapMw ?? 110),
      priceSignalCadPerMwh: Number(scenario.priceSignalCadPerMwh ?? 145),
      hours: horizonHours,
    });
    analysis = byop;
    modelVersion = byop.modelVersion;
    confidenceScore = 0.81;
    methodology = byop.methodology;
    warnings = ['BYOP results are scenario-based and do not replace site-specific interconnection studies.'];
    trainingDataProfile = 'synthetic';
    claimLabel = 'advisory';
    predictions = byop.aggregateLoadSeries.map((point) => ({
      valid_at: new Date(now.getTime() + (point.hour + 1) * 60 * 60 * 1000).toISOString(),
      target_name: 'net_import',
      predicted_value: point.netImportMw,
      unit: 'MW',
      confidence_lower: round(Math.max(0, point.netImportMw * 0.92), 4),
      confidence_upper: round(point.netImportMw * 1.08, 4),
      risk_score: round(1 - byop.policySensitivity, 4),
      drivers: ['facility_load', 'onsite_generation', 'storage_dispatch', 'utility_cap'],
      synthetic: false,
    }));
  } else if (domain === 'pv_fault') {
    const pvFault = analyzePvFaultGraph({
      nodes: (scenario.nodes as Array<any> | undefined) ?? [
        { id: 'inv-1', expectedOutputMw: 2.6, observedOutputMw: 1.1, voltageV: 540, inverterTempC: 61, irradiance: 780 },
        { id: 'inv-2', expectedOutputMw: 2.4, observedOutputMw: 2.2, voltageV: 598, inverterTempC: 43, irradiance: 760 },
        { id: 'inv-3', expectedOutputMw: 2.1, observedOutputMw: 1.6, voltageV: 565, inverterTempC: 57, irradiance: 740 },
      ],
      edges: (scenario.edges as Array<any> | undefined) ?? [
        { fromNodeId: 'inv-1', toNodeId: 'inv-2', weight: 1 },
        { fromNodeId: 'inv-2', toNodeId: 'inv-3', weight: 1 },
      ],
      trainedWeights: pvWeights as any,
    });
    analysis = pvFault;
    modelVersion = pvFault.modelVersion;
    confidenceScore = pvFault.confidenceScore;
    methodology = pvFault.methodology;
    warnings = pvFault.runtimeMode === 'trained'
      ? ['Simulator-calibrated PV fault runtime active; partner feeder validation remains pending.']
      : ['Graph fault localization should be validated against feeder events before automated dispatch actions.'];
    trainingDataProfile = pvFault.runtimeMode === 'trained'
      ? pvFault.trainingDataProfile
      : 'synthetic';
    evaluationSummary = pvFault.runtimeMode === 'trained'
      ? pvFault.evaluationSummary
      : undefined;
    calibrationStatus = pvFault.runtimeMode === 'trained'
      ? pvFault.calibrationStatus
      : undefined;
    claimLabel = pvFault.runtimeMode === 'trained'
      ? pvFault.claimLabel
      : 'advisory';
    isFallback = pvFault.runtimeMode !== 'trained';
    dataSources = pvFault.runtimeMode === 'trained'
      ? [{ name: pvFault.simulatorConfig?.name ?? 'pvlib simulator', lastUpdated: pvFault.trainedAt }]
      : [{ name: 'Existing inverter telemetry and feeder topology adapters' }];
    if (pvFault.runtimeMode === 'trained') {
      modelVersion = pvFault.modelVersion;
    }
    predictions = [];
  } else if (domain === 'policy_overlay') {
    const overlay = calculatePolicyOverlayRisk({
      assetLifeYears: Number(scenario.assetLifeYears ?? 25),
      emissionsIntensity: Number(scenario.emissionsIntensity ?? 540),
      carbonPriceCadPerTonne: Number(scenario.carbonPriceCadPerTonne ?? 95),
      policyDeadlineYear: Number(scenario.policyDeadlineYear ?? 2035),
      currentYear: Number(scenario.currentYear ?? new Date().getFullYear()),
      ccusOptionalityScore: Number(scenario.ccusOptionalityScore ?? 0.35),
      electrificationReadinessScore: Number(scenario.electrificationReadinessScore ?? 0.4),
    });
    analysis = overlay;
    modelVersion = overlay.modelVersion;
    confidenceScore = Math.max(0.5, 1 - overlay.strandedAssetRiskScore / 2);
    methodology = overlay.methodology;
    warnings = ['Policy overlay is scenario-based and should be paired with project-specific regulatory review.'];
    trainingDataProfile = 'synthetic';
    claimLabel = 'advisory';
    predictions = Array.from({ length: Math.min(horizonHours, 12) }, (_, index) => {
      const year = (Number(scenario.currentYear ?? new Date().getFullYear()) + index);
      const risk = clamp(overlay.strandedAssetRiskScore + index * 0.03);
      return {
        valid_at: `${year}-01-01T00:00:00.000Z`,
        target_name: 'stranded_asset_risk',
        predicted_value: round(risk, 4),
        unit: 'risk_score',
        confidence_lower: round(Math.max(0, risk - 0.08), 4),
        confidence_upper: round(Math.min(1, risk + 0.08), 4),
        risk_score: round(risk, 4),
        drivers: overlay.policyDrivers.map((driver) => driver.driver),
        synthetic: false,
      };
    });
  } else if (domain === 'short_circuit') {
    const weakGrid = evaluateWeakGridShortCircuit({
      region: province,
      shortCircuitLevelKa: Number(scenario.shortCircuitLevelKa ?? 5.4),
      minimumShortCircuitKa: Number(scenario.minimumShortCircuitKa ?? 8),
      inverterPenetrationPct: Number(scenario.inverterPenetrationPct ?? 42),
      reserveMarginPercent: Number(scenario.reserveMarginPercent ?? 6),
      topology: scenario.topology as any,
    });
    analysis = weakGrid;
    modelVersion = weakGrid.modelVersion;
    confidenceScore = Math.max(0.45, 1 - weakGrid.weakGridRiskScore / 2);
    methodology = weakGrid.methodology;
    warnings = weakGrid.warnings.length ? weakGrid.warnings : ['Weak-grid screening is advisory and not a replacement for protection studies.'];
    trainingDataProfile = 'synthetic';
    claimLabel = 'advisory';
    predictions = [];
  }

  const meta = buildForecastResponseMeta({
    modelVersion,
    validAt: predictions[0]?.valid_at ?? now.toISOString(),
    confidenceScore,
    dataSources,
    isFallback,
    methodology,
    warnings,
    trainingDataProfile,
    evaluationSummary,
    calibrationStatus,
    claimLabel,
  });

  return {
    run_id: null,
    domain,
    province,
    predictions,
    feature_ranking: featureRanking,
    analysis,
    meta,
  };
}
