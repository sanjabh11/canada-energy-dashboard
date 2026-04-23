import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { buildMeta, forecastPriceSpikeRisk, rankFeaturesRfeV1 } from "../_shared/mlForecasting.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const jsonHeaders = { "Content-Type": "application/json" };

function clamp(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 4): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function positiveForecast(base: number, hour: number, domain: string): number {
  const daily = Math.sin((hour / 24) * Math.PI * 2);
  const trend = hour * 0.04;
  const multiplier = domain === "solar" ? Math.max(0, daily) : 1 + daily * 0.08;
  return Math.max(0, Math.round((base * multiplier + trend) * 100) / 100);
}

function dot(left: number[], right: number[]): number {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function forecastGasBasisSpread(input: {
  aecoCadPerGj: number;
  henryHubCadPerGj: number;
  pipelineCurtailmentPct: number;
  storageDeficitPct: number;
  temperatureC: number;
  basisLag1: number;
  basisLag7: number;
  trainingRows?: Array<{
    aecoCadPerGj: number;
    henryHubCadPerGj: number;
    pipelineCurtailmentPct: number;
    storageDeficitPct: number;
    temperatureC: number;
    basisLag1: number;
    basisLag7: number;
    spreadCadPerGj: number;
  }>;
  backtestRows?: Array<{
    aecoCadPerGj: number;
    henryHubCadPerGj: number;
    pipelineCurtailmentPct: number;
    storageDeficitPct: number;
    temperatureC: number;
    basisLag1: number;
    basisLag7: number;
    spreadCadPerGj: number;
  }>;
  sourceProfile?: 'synthetic' | 'mixed' | 'real';
}) {
  const defaultTrainingRows = [
    { aecoCadPerGj: 1.85, henryHubCadPerGj: 3.25, pipelineCurtailmentPct: 1, storageDeficitPct: 2, temperatureC: 2, basisLag1: 1.35, basisLag7: 1.25, spreadCadPerGj: 1.35 },
    { aecoCadPerGj: 2.05, henryHubCadPerGj: 3.35, pipelineCurtailmentPct: 4, storageDeficitPct: 8, temperatureC: -10, basisLag1: 1.3, basisLag7: 1.28, spreadCadPerGj: 1.45 },
    { aecoCadPerGj: 1.55, henryHubCadPerGj: 3.05, pipelineCurtailmentPct: 9, storageDeficitPct: 14, temperatureC: -24, basisLag1: 1.6, basisLag7: 1.75, spreadCadPerGj: 1.85 },
    { aecoCadPerGj: 1.25, henryHubCadPerGj: 2.95, pipelineCurtailmentPct: 12, storageDeficitPct: 18, temperatureC: -31, basisLag1: 1.7, basisLag7: 1.9, spreadCadPerGj: 2.05 },
  ];
  const trainingRows = Array.isArray(input.trainingRows) && input.trainingRows.length ? input.trainingRows : defaultTrainingRows;
  const featureNames = ['aecoCadPerGj', 'henryHubCadPerGj', 'pipelineCurtailmentPct', 'storageDeficitPct', 'temperatureC', 'basisLag1', 'basisLag7'] as const;
  const target = trainingRows.map((row) => row.spreadCadPerGj);
  const targetMean = mean(target);
  const centeredTarget = target.map((value) => value - targetMean);
  const weights = featureNames.map((feature) => {
    const values = trainingRows.map((row) => Number(row[feature]));
    const featureMean = mean(values);
    const centeredValues = values.map((value) => value - featureMean);
    const numerator = centeredValues.reduce((sum, value, index) => sum + value * centeredTarget[index], 0);
    const denominator = centeredValues.reduce((sum, value) => sum + value ** 2, 0) || 1;
    return numerator / denominator;
  });
  const featureWeights = featureNames.reduce((acc, feature, index) => {
    acc[feature] = round(Math.abs(weights[index]), 6);
    return acc;
  }, {} as Record<string, number>);
  const selectedFeatures = Object.entries(featureWeights).sort((left, right) => right[1] - left[1]).slice(0, 4).map(([feature]) => feature);
  const inputVector = featureNames.map((feature) => Number(input[feature]));
  const predictedSpread = round(targetMean + dot(weights, inputVector), 4);
  const wideningRisk = clamp(
    (input.pipelineCurtailmentPct / 15) * 0.35
    + (input.storageDeficitPct / 20) * 0.25
    + (Math.max(0, -input.temperatureC) / 35) * 0.15
    + (predictedSpread / 3.5) * 0.25,
  );
  const drivers = selectedFeatures.map((feature) => {
    switch (feature) {
      case 'pipelineCurtailmentPct':
        return 'pipeline_curtailment_pressure';
      case 'storageDeficitPct':
        return 'storage_deficit_pressure';
      case 'temperatureC':
        return 'weather_driven_basis_expansion';
      case 'basisLag1':
      case 'basisLag7':
        return 'persistent_basis_momentum';
      case 'aecoCadPerGj':
        return 'aeco_price_floor';
      case 'henryHubCadPerGj':
        return 'henry_hub_reference';
      default:
        return feature;
    }
  });
  const backtestRows = Array.isArray(input.backtestRows) && input.backtestRows.length
    ? input.backtestRows
    : trainingRows.slice(-Math.max(4, Math.min(12, Math.floor(trainingRows.length / 3))));
  const backtestPredictions = backtestRows.map((row) => {
    const vector = featureNames.map((feature) => Number(row[feature]));
    const predicted = round(targetMean + dot(weights, vector), 4);
    return {
      observed: Number(row.spreadCadPerGj),
      predicted,
      residual: round(predicted - Number(row.spreadCadPerGj), 4),
    };
  });
  const backtestResiduals = backtestPredictions.map((point) => point.residual);
  const sourceProfile = input.sourceProfile ?? (Array.isArray(input.trainingRows) && input.trainingRows.length ? 'mixed' : 'synthetic');
  const directionalAccuracy = backtestPredictions.length
    ? backtestPredictions.filter((point) => Math.sign(point.predicted - targetMean) === Math.sign(point.observed - targetMean)).length / backtestPredictions.length
    : 0;
  return {
    modelVersion: 'aeco-henry-basis-v1',
    predictedSpreadCadPerGj: predictedSpread,
    wideningRisk: round(wideningRisk, 4),
    selectedFeatures,
    featureWeights,
    drivers,
    backtest: {
      sampleCount: backtestPredictions.length,
      maeCadPerGj: round(mean(backtestResiduals.map((value) => Math.abs(value))), 4),
      rmseCadPerGj: round(Math.sqrt(mean(backtestResiduals.map((value) => value ** 2))), 4),
      directionalAccuracy: round(directionalAccuracy, 4),
      residualBiasCadPerGj: round(mean(backtestResiduals), 4),
      sourceProfile,
    },
    sourceProfile,
    methodology: 'Linear basis spread forecast with feature selection over AECO, Henry Hub, curtailment, storage, and weather drivers.',
  };
}

function simulateByopMultiAgent(input: {
  baseLoadMw: number;
  flexibilityPct: number;
  onSiteGenerationMw: number;
  storageCapacityMwh: number;
  storagePowerMw: number;
  utilityImportCapMw: number;
  priceSignalCadPerMwh: number;
  hours?: number;
}) {
  const hours = Math.max(1, input.hours ?? 24);
  const storageCapacityMwh = Math.max(0.01, input.storageCapacityMwh);
  let storageSocMwh = storageCapacityMwh * 0.45;
  const aggregateLoadSeries: Array<{ hour: number; facilityLoadMw: number; netImportMw: number; storageSocPct: number }> = [];
  let peakImportMw = 0;
  let gridReductionMw = 0;
  for (let hour = 0; hour < hours; hour++) {
    const dailyCurve = 1 + 0.12 * Math.sin((hour / 24) * Math.PI * 2 - Math.PI / 3);
    const priceSensitiveShift = clamp(input.flexibilityPct / 100) * (input.priceSignalCadPerMwh / 250);
    const facilityLoadMw = Math.max(0, input.baseLoadMw * dailyCurve * (1 - priceSensitiveShift * (hour >= 16 && hour <= 21 ? 0.18 : 0.05)));
    const onsiteGenerationMw = Math.max(0, input.onSiteGenerationMw * Math.max(0.25, 0.75 + 0.25 * Math.sin((hour / 24) * Math.PI * 2 - Math.PI / 2)));
    const dispatchWindow = input.priceSignalCadPerMwh >= 120 && (hour >= 16 && hour <= 21) ? 1 : input.priceSignalCadPerMwh <= 60 && (hour >= 0 && hour <= 6) ? -1 : 0;
    const storageDispatchMw = Math.max(
      -input.storagePowerMw,
      Math.min(
        input.storagePowerMw,
        dispatchWindow === 1
          ? Math.min(input.storagePowerMw, storageSocMwh)
          : dispatchWindow === -1
            ? -Math.min(input.storagePowerMw, storageCapacityMwh - storageSocMwh)
            : 0,
      ),
    );
    storageSocMwh = Math.max(0, Math.min(storageCapacityMwh, storageSocMwh - storageDispatchMw));
    const netImportMw = Math.max(0, facilityLoadMw - onsiteGenerationMw - storageDispatchMw);
    const cappedImportMw = Math.min(netImportMw, input.utilityImportCapMw);
    peakImportMw = Math.max(peakImportMw, cappedImportMw);
    gridReductionMw = Math.max(gridReductionMw, facilityLoadMw - cappedImportMw);
    aggregateLoadSeries.push({
      hour,
      facilityLoadMw: round(facilityLoadMw, 4),
      netImportMw: round(cappedImportMw, 4),
      storageSocPct: round((storageSocMwh / storageCapacityMwh) * 100, 4),
    });
  }
  const policySensitivity = clamp(
    (input.flexibilityPct / 100) * 0.4
    + Math.min(1, input.storageCapacityMwh / Math.max(1, input.baseLoadMw * 4)) * 0.3
    + Math.min(1, input.onSiteGenerationMw / Math.max(1, input.baseLoadMw)) * 0.3,
  );
  return {
    modelVersion: 'byop-mas-v1',
    peakImportMw: round(peakImportMw, 4),
    gridReductionMw: round(gridReductionMw, 4),
    aggregateLoadSeries,
    agentSummary: {
      facility: { baselineLoadMw: round(input.baseLoadMw, 4), flexibilityPct: round(input.flexibilityPct, 2) },
      storage: { capacityMwh: round(storageCapacityMwh, 4), powerMw: round(input.storagePowerMw, 4) },
      onsiteGeneration: { ratedMw: round(input.onSiteGenerationMw, 4) },
      utility: { importCapMw: round(input.utilityImportCapMw, 4), priceSignalCadPerMwh: round(input.priceSignalCadPerMwh, 4) },
    },
    policySensitivity: round(policySensitivity, 4),
    methodology: 'Multi-agent BYOP simulation with facility, storage, onsite generation, and utility policy interactions.',
  };
}

function calculatePolicyOverlayRisk(input: {
  assetLifeYears: number;
  emissionsIntensity: number;
  carbonPriceCadPerTonne: number;
  policyDeadlineYear: number;
  currentYear?: number;
  ccusOptionalityScore?: number;
  electrificationReadinessScore?: number;
}) {
  const currentYear = input.currentYear ?? new Date().getFullYear();
  const yearsToDeadline = Math.max(0, input.policyDeadlineYear - currentYear);
  const carbonExposure = clamp(input.emissionsIntensity / 1_000);
  const deadlinePressure = clamp(1 - Math.min(1, yearsToDeadline / Math.max(1, input.assetLifeYears)));
  const carbonPressure = clamp((input.carbonPriceCadPerTonne / 150) * carbonExposure);
  const ccusPressure = clamp(1 - clamp(input.ccusOptionalityScore ?? 0.5));
  const electrificationPressure = clamp(1 - clamp(input.electrificationReadinessScore ?? 0.5));
  const drivers = [
    { driver: 'policy_deadline', score: deadlinePressure, label: 'Policy Deadline Proximity' },
    { driver: 'carbon_exposure', score: carbonPressure, label: 'Carbon Price Exposure' },
    { driver: 'ccus_optionalities', score: ccusPressure * 0.75, label: 'CCUS Optionality Gap' },
    { driver: 'electrification_readiness', score: electrificationPressure * 0.65, label: 'Electrification Readiness Gap' },
  ].sort((left, right) => right.score - left.score);
  return {
    modelVersion: 'policy-overlay-v1',
    strandedAssetRiskScore: round(clamp(drivers.reduce((sum, entry) => sum + entry.score, 0) / drivers.length), 4),
    dominantDriver: drivers[0]?.driver ?? 'policy_deadline',
    policyDrivers: drivers,
    horizonYears: Math.max(1, input.assetLifeYears),
    methodology: 'Policy overlay scoring combining deadline pressure, carbon exposure, CCUS optionality, and electrification readiness.',
  };
}

function analyzePvFaultGraph(input: {
  nodes: Array<{ id: string; expectedOutputMw: number; observedOutputMw: number; voltageV: number; inverterTempC: number; irradiance?: number; offline?: boolean }>;
  edges: Array<{ fromNodeId: string; toNodeId: string; weight?: number }>;
}) {
  const scores = input.nodes.map((node) => {
    const outputDelta = Math.abs(node.expectedOutputMw - node.observedOutputMw) / Math.max(1, node.expectedOutputMw);
    const voltagePenalty = Math.max(0, Math.abs(node.voltageV - 600) / 600);
    const thermalPenalty = Math.max(0, (node.inverterTempC - 45) / 55);
    const offlinePenalty = node.offline ? 1 : 0;
    const riskScore = clamp(outputDelta * 0.45 + voltagePenalty * 0.2 + thermalPenalty * 0.2 + offlinePenalty * 0.6);
    return {
      nodeId: node.id,
      riskScore: round(riskScore, 4),
      reason: riskScore >= 0.8 ? 'strong_local_anomaly' : riskScore >= 0.5 ? 'graph_propagated_anomaly' : 'background_signal',
    };
  }).sort((left, right) => right.riskScore - left.riskScore);
  const topEdges = input.edges.map((edge) => ({
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    riskScore: round(((scores.find((score) => score.nodeId === edge.fromNodeId)?.riskScore ?? 0) + (scores.find((score) => score.nodeId === edge.toNodeId)?.riskScore ?? 0)) / 2, 4),
  })).sort((left, right) => right.riskScore - left.riskScore);
  const topScore = scores[0]?.riskScore ?? 0;
  return {
    modelVersion: 'pv-gnn-v1',
    topSuspects: scores.slice(0, 5),
    topEdges: topEdges.slice(0, 5),
    faultClass: topScore >= 0.75 ? 'localized_pv_fault' : topScore >= 0.45 ? 'regional_derating' : 'healthy_cluster',
    confidenceScore: round(topScore, 4),
    methodology: 'Graph message-passing localization over inverter, voltage, and output deviations.',
  };
}

function evaluateWeakGridShortCircuit(input: {
  region: string;
  shortCircuitLevelKa?: number;
  minimumShortCircuitKa?: number;
  inverterPenetrationPct?: number;
  reserveMarginPercent?: number;
  topology?: { nodes?: Array<{ id: string; shortCircuitKa?: number }>; edges?: Array<{ limitMw: number; currentMw: number }> };
}) {
  const shortCircuitLevelKa = Math.max(0, Number(input.shortCircuitLevelKa ?? 5));
  const minimumShortCircuitKa = Math.max(0.1, Number(input.minimumShortCircuitKa ?? 8));
  const inverterPenetrationPct = Math.max(0, Number(input.inverterPenetrationPct ?? 35));
  const reserveMarginPercent = Math.max(0, Number(input.reserveMarginPercent ?? 6));
  const edges = input.topology?.edges ?? [];
  const overloadedEdgeShare = edges.length ? edges.filter((edge) => Math.abs(edge.currentMw) / Math.max(1, edge.limitMw) >= 0.9).length / edges.length : 0;
  const nodeAssessments = (input.topology?.nodes ?? []).map((node) => {
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
  ].filter(Boolean);
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
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const rl = applyRateLimit(req, "ml-forecast");
  if (rl.response) return rl.response;
  const cors = createCorsHeaders(req);
  const path = new URL(req.url).pathname.replace(/\/functions\/v1\/ml-forecast\b/, "") || "/";

  if (req.method !== "POST" || !["/run", "/"].includes(path)) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  const body = await req.json().catch(() => ({}));
  const domain = String(body.domain ?? "load");
  const province = String(body.province ?? "AB").toUpperCase();
  const horizonHours = Math.min(168, Math.max(1, Number(body.horizon_hours ?? body.horizonHours ?? 24)));
  const now = new Date();
  const scenario = body.scenario ?? {};
  const sampleRows = [
    { temperature_c: -15, demand_mw: 11500, reserve_margin_percent: 4, wind_generation_mw: 150, target: 850 },
    { temperature_c: 5, demand_mw: 9800, reserve_margin_percent: 12, wind_generation_mw: 900, target: 120 },
    { temperature_c: 30, demand_mw: 11200, reserve_margin_percent: 5, wind_generation_mw: 260, target: 650 },
    { temperature_c: 18, demand_mw: 9000, reserve_margin_percent: 18, wind_generation_mw: 700, target: 80 },
  ];
  const featureRanking = rankFeaturesRfeV1(sampleRows, "target", 3);
  const priceSpike = forecastPriceSpikeRisk({
    province,
    poolPriceCadPerMwh: Number(scenario.poolPriceCadPerMwh ?? 250),
    demandMw: Number(scenario.demandMw ?? 10500),
    reserveMarginPercent: Number(scenario.reserveMarginPercent ?? 8),
    windGenerationMw: Number(scenario.windGenerationMw ?? 500),
    temperatureC: Number(scenario.temperatureC ?? 0),
  });

  let analysis: Record<string, unknown> | null = null;
  let modelVersion = domain === "price_spike" ? "bagged-threshold-price-spike-v1" : "svm-rfe-adapter-v1";
  let confidenceScore = domain === "price_spike" ? Math.max(0.45, 1 - priceSpike.riskScore / 2) : 0.76;
  let methodology = "Lightweight v1 forecast adapter with positive forecasts, feature ranking, and baseline-ready metadata.";
  let warnings = ["Backtest against persistence and seasonal-naive baselines before claiming uplift."];

  const base = domain === "price_spike" ? Number(scenario.poolPriceCadPerMwh ?? 250) : domain === "solar" ? 400 : 10000;
  let predictions = Array.from({ length: horizonHours }, (_, index) => {
    const validAt = new Date(now.getTime() + (index + 1) * 60 * 60 * 1000).toISOString();
    const predictedValue = domain === "price_spike" ? positiveForecast(base, index + 1, "price") : positiveForecast(base, index + 1, domain);
    return {
      valid_at: validAt,
      target_name: domain === "price_spike" ? "pool_price" : `${domain}_forecast`,
      predicted_value: predictedValue,
      unit: domain === "price_spike" ? "CAD/MWh" : "MW",
      confidence_lower: Math.max(0, predictedValue * 0.9),
      confidence_upper: predictedValue * 1.1,
      risk_score: domain === "price_spike" ? priceSpike.riskScore : null,
      drivers: domain === "price_spike" ? priceSpike.reasons : featureRanking.retainedFeatures,
      synthetic: false,
    };
  });

  if (domain === "price_spike") {
    analysis = priceSpike;
    modelVersion = priceSpike.modelVersion;
    confidenceScore = Math.max(0.45, 1 - priceSpike.riskScore / 2);
    methodology = "Bagged threshold ensemble calibrated for Alberta price-spike screening.";
  } else if (domain === "gas_basis") {
    const gasBasis = forecastGasBasisSpread({
      aecoCadPerGj: Number(scenario.aecoCadPerGj ?? 1.65),
      henryHubCadPerGj: Number(scenario.henryHubCadPerGj ?? 3.05),
      pipelineCurtailmentPct: Number(scenario.pipelineCurtailmentPct ?? 7),
      storageDeficitPct: Number(scenario.storageDeficitPct ?? 10),
      temperatureC: Number(scenario.temperatureC ?? -12),
      basisLag1: Number(scenario.basisLag1 ?? 1.45),
      basisLag7: Number(scenario.basisLag7 ?? 1.4),
    });
    analysis = gasBasis;
    modelVersion = gasBasis.modelVersion;
    confidenceScore = Math.max(0.48, 1 - gasBasis.wideningRisk / 2);
    methodology = gasBasis.methodology;
    warnings = ["Synthetic default corpus is used unless real AECO and Henry Hub history is supplied."];
    predictions = predictions.map((prediction, index) => {
      const drift = Math.sin(((index + 1) / 24) * Math.PI * 2) * 0.05;
      const spread = Math.max(0, gasBasis.predictedSpreadCadPerGj + drift);
      return {
        ...prediction,
        target_name: "aeco_henry_basis_spread",
        unit: "CAD/GJ",
        predicted_value: round(spread, 4),
        confidence_lower: round(Math.max(0, spread - 0.2), 4),
        confidence_upper: round(spread + 0.2, 4),
        risk_score: gasBasis.wideningRisk,
        drivers: gasBasis.drivers,
      };
    });
  } else if (domain === "byop_load") {
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
    warnings = ["BYOP results are scenario-based and do not replace site-specific interconnection studies."];
    predictions = byop.aggregateLoadSeries.map((point) => ({
      valid_at: new Date(now.getTime() + (point.hour + 1) * 60 * 60 * 1000).toISOString(),
      target_name: "net_import",
      predicted_value: point.netImportMw,
      unit: "MW",
      confidence_lower: round(Math.max(0, point.netImportMw * 0.92), 4),
      confidence_upper: round(point.netImportMw * 1.08, 4),
      risk_score: round(1 - byop.policySensitivity, 4),
      drivers: ["facility_load", "onsite_generation", "storage_dispatch", "utility_cap"],
      synthetic: false,
    }));
  } else if (domain === "pv_fault") {
    const pvFault = analyzePvFaultGraph({
      nodes: Array.isArray(scenario.nodes) ? scenario.nodes as Array<any> : [
        { id: "inv-1", expectedOutputMw: 2.6, observedOutputMw: 1.1, voltageV: 540, inverterTempC: 61, irradiance: 780 },
        { id: "inv-2", expectedOutputMw: 2.4, observedOutputMw: 2.2, voltageV: 598, inverterTempC: 43, irradiance: 760 },
        { id: "inv-3", expectedOutputMw: 2.1, observedOutputMw: 1.6, voltageV: 565, inverterTempC: 57, irradiance: 740 },
      ],
      edges: Array.isArray(scenario.edges) ? scenario.edges as Array<any> : [
        { fromNodeId: "inv-1", toNodeId: "inv-2", weight: 1 },
        { fromNodeId: "inv-2", toNodeId: "inv-3", weight: 1 },
      ],
    });
    analysis = pvFault;
    modelVersion = pvFault.modelVersion;
    confidenceScore = pvFault.confidenceScore;
    methodology = pvFault.methodology;
    warnings = ["Graph fault localization should be validated against feeder events before automated dispatch actions."];
    predictions = [];
  } else if (domain === "policy_overlay") {
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
    warnings = ["Policy overlay is scenario-based and should be paired with project-specific regulatory review."];
    predictions = Array.from({ length: Math.min(horizonHours, 12) }, (_, index) => {
      const year = Number(scenario.currentYear ?? new Date().getFullYear()) + index;
      const risk = clamp(overlay.strandedAssetRiskScore + index * 0.03);
      return {
        valid_at: `${year}-01-01T00:00:00.000Z`,
        target_name: "stranded_asset_risk",
        predicted_value: round(risk, 4),
        unit: "risk_score",
        confidence_lower: round(Math.max(0, risk - 0.08), 4),
        confidence_upper: round(Math.min(1, risk + 0.08), 4),
        risk_score: round(risk, 4),
        drivers: overlay.policyDrivers.map((driver: any) => driver.driver),
        synthetic: false,
      };
    });
  } else if (domain === "short_circuit") {
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
    warnings = weakGrid.warnings.length ? weakGrid.warnings : ["Weak-grid screening is advisory and not a replacement for protection studies."];
    predictions = [];
  }

  const meta = buildMeta({
    modelVersion,
    validAt: predictions[0]?.valid_at ?? now.toISOString(),
    confidenceScore,
    dataSources: [{ name: "Existing weather/load/AESO feature adapters" }],
    isFallback: true,
    methodology,
    warnings,
  });

  let runId: string | null = null;
  if (supabase) {
    const { data: run } = await supabase.from("ml_forecast_runs").insert({
      model_key: meta.model_version,
      model_version: meta.model_version,
      domain,
      province,
      horizon_hours: horizonHours,
      scenario,
      confidence_score: meta.confidence_score,
      is_fallback: meta.is_fallback,
      staleness_status: meta.staleness_status,
      methodology: meta.methodology,
      warnings: meta.warnings,
      data_sources: meta.data_sources,
      valid_at: meta.valid_at,
    }).select("id").single();
    runId = run?.id ?? null;
    if (runId) {
      await supabase.from("ml_forecast_predictions").insert(predictions.map((prediction) => ({ ...prediction, run_id: runId })));
      await supabase.from("ml_feature_rankings").insert(featureRanking.rankings.map((ranking: any, index: number) => ({
        run_id: runId,
        model_key: "svm-rfe-adapter-v1",
        feature_name: ranking.feature,
        rank: index + 1,
        score: ranking.score,
        retained: ranking.retained,
        drop_reason: ranking.dropReason,
      })));
    }
  }

  return new Response(JSON.stringify({ run_id: runId, domain, province, predictions, feature_ranking: featureRanking, analysis, price_spike: domain === "price_spike" ? priceSpike : null, meta }), { status: 200, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
});
