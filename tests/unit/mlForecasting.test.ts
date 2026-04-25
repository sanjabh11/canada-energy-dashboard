import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildLocalMlForecastRun,
  calculateTierScenario,
  analyzePvFaultGraph,
  evaluateRateWatchdog,
  rankFeaturesRfeV1,
  detectWassersteinDrift,
  forecastPriceSpikeRisk,
  forecastGasBasisSpread,
  evaluateGridRisk,
  evaluateWeakGridShortCircuit,
  buildForecastResponseMeta,
  backtestRareEventResampling,
} from '../../src/lib/mlForecasting';
import pvWeights from '../../src/lib/modelWeights/pv-gnn-v2.json';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('mlForecasting shared engine', () => {
  it('calculates deterministic TIER pathways with stale pricing warnings', () => {
    const result = calculateTierScenario({
      annualEmissionsTonnes: 150000,
      benchmarkExceedanceTonnes: 20000,
      directInvestmentCapexCad: 500000,
      creditAssumptions: {
        fundPriceCadPerTonne: 95,
        marketCreditPriceCadPerTonne: 25,
        directInvestmentCreditRate: 0.8,
        lastVerifiedAt: '2026-02-01',
      },
      discountRate: 0.08,
      asOfDate: '2026-07-15',
    });

    expect(result.pathways.fundPayment.costCad).toBe(1_900_000);
    expect(result.pathways.marketCredits.costCad).toBe(500_000);
    expect(result.bestPathway).toBe('market_credits');
    expect(result.estimatedSavingsCad).toBe(1_400_000);
    expect(result.warnings).toContain('TIER pricing assumptions are stale; verify current Alberta rules before using for a binding decision.');
  });

  it('evaluates RoLR savings as estimates and never guarantees savings', () => {
    const result = evaluateRateWatchdog({
      province: 'AB',
      usageKwh: 700,
      currentRateCadPerKwh: 0.1205,
      provider: 'Default RoLR provider',
      retailerOffers: [
        { id: 'offer-a', name: 'Retailer A', fixedRateCadPerKwh: 0.099, termMonths: 24 },
        { id: 'offer-b', name: 'Retailer B', fixedRateCadPerKwh: 0.125, termMonths: 12 },
      ],
      asOfDate: '2026-04-01',
    });

    expect(result.bestOffer?.id).toBe('offer-a');
    expect(result.estimatedMonthlySavingsCad).toBeCloseTo(15.05, 2);
    expect(result.claimLabel).toBe('estimated');
    expect(JSON.stringify(result).toLowerCase()).not.toContain('guaranteed');
  });

  it('ranks redundant features and retains the strongest signals', () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      temperature_c: i,
      wind_speed_kmh: 20 - i,
      duplicate_temperature: i * 2,
      noise: i % 2 === 0 ? 1 : -1,
      target: 100 + i * 10,
    }));

    const result = rankFeaturesRfeV1(rows, 'target', { minFeatures: 2, correlationPruneThreshold: 0.98 });

    expect(result.retainedFeatures.length).toBe(2);
    expect(
      result.retainedFeatures.includes('temperature_c')
      || result.retainedFeatures.includes('duplicate_temperature'),
    ).toBe(true);
    expect(
      result.droppedFeatures.some((feature) => ['temperature_c', 'duplicate_temperature'].includes(feature.feature)),
    ).toBe(true);
    expect(result.rankings[0].score).toBeGreaterThan(result.rankings[result.rankings.length - 1].score);
  });

  it('detects high Wasserstein-style drift and downgrades confidence', () => {
    const result = detectWassersteinDrift({
      baseline: { temperature_c: [0, 1, 2, 3, 4], demand_mw: [100, 105, 110, 115, 120] },
      recent: { temperature_c: [10, 11, 12, 13, 14], demand_mw: [130, 135, 140, 145, 150] },
      threshold: 0.35,
    });

    expect(result.status).toBe('drift_detected');
    expect(result.confidenceMultiplier).toBeLessThan(1);
    expect(result.metrics.temperature_c.distance).toBeGreaterThan(0.35);
  });

  it('forecasts Alberta price spike risk from bagged threshold rules', () => {
    const result = forecastPriceSpikeRisk({
      province: 'AB',
      poolPriceCadPerMwh: 850,
      demandMw: 11600,
      reserveMarginPercent: 3,
      windGenerationMw: 100,
      temperatureC: -28,
    });

    expect(result.spikeThresholdCadPerMwh).toBe(1000);
    expect(result.riskScore).toBeGreaterThan(0.65);
    expect(result.reasons.length).toBeGreaterThan(1);
  });

  it('rejects physically impossible dispatch recommendations', () => {
    const result = evaluateGridRisk({
      region: 'AB',
      reserveMarginPercent: 2,
      frequencyHz: 59.82,
      recommendations: [
        { id: 'bad', action: 'increase_transfer', magnitudeMw: 300, maxCapacityMw: 200, rampLimitMwPerHour: 100 },
        { id: 'ok', action: 'hold', magnitudeMw: 0, maxCapacityMw: 200, rampLimitMwPerHour: 100 },
      ],
      topology: {
        nodes: [{ id: 'sub-1', status: 'online', capacityMw: 100 }],
        edges: [{ fromNodeId: 'sub-1', toNodeId: 'sub-2', limitMw: 200, currentMw: 190 }],
      },
    });

    expect(['stressed', 'critical']).toContain(result.systemStatus);
    expect(result.recommendationResults.find((item) => item.id === 'bad')?.accepted).toBe(false);
    expect(result.riskScore).toBeGreaterThan(0.6);
  });

  it('builds shared response metadata without negative confidence', () => {
    const meta = buildForecastResponseMeta({
      modelVersion: 'ml-v1',
      validAt: '2026-04-23T00:00:00.000Z',
      confidenceScore: -1,
      dataSources: [{ name: 'sample', url: 'https://example.com', lastUpdated: '2026-04-01' }],
      isFallback: true,
      methodology: 'test',
      warnings: ['sample warning'],
      trainingDataProfile: 'real',
      evaluationSummary: { sample_count: 4, mae: 1.2, rmse: 1.4 },
      calibrationStatus: 'calibrated',
      claimLabel: 'validated',
    });

    expect(meta.confidence_score).toBe(0);
    expect(meta.staleness_status).toBe('fresh');
    expect(meta.warnings).toContain('sample warning');
    expect(meta.training_data_profile).toBe('real');
    expect(meta.evaluation_summary?.sample_count).toBe(4);
    expect(meta.calibration_status).toBe('calibrated');
    expect(meta.claim_label).toBe('validated');
  });

  it('preserves simulator-calibrated provenance only when explicitly provided', () => {
    const enriched = buildForecastResponseMeta({
      modelVersion: 'ml-v2',
      validAt: '2026-04-23T00:00:00.000Z',
      confidenceScore: 0.9,
      dataSources: [{ name: 'simulator', lastUpdated: '2026-04-01' }],
      isFallback: false,
      methodology: 'placeholder',
      trainingDataProfile: 'simulator-calibrated',
      trainingArtifactSha: 'sha-42',
      simulatorConfig: {
        name: 'pandapower',
        version: 'placeholder-0.0.0',
        scenario_count: 50000,
        topology: 'IEEE-30',
      },
      trainedAt: '2026-04-24T00:00:00.000Z',
    });

    expect(enriched.training_data_profile).toBe('simulator-calibrated');
    expect(enriched.training_artifact_sha).toBe('sha-42');
    expect(enriched.simulator_config?.scenario_count).toBe(50000);
    expect(enriched.trained_at).toBe('2026-04-24T00:00:00.000Z');

    const minimal = buildForecastResponseMeta({
      modelVersion: 'ml-v2',
      validAt: '2026-04-23T00:00:00.000Z',
      confidenceScore: 0.9,
      dataSources: [{ name: 'simulator', lastUpdated: '2026-04-01' }],
      isFallback: false,
      methodology: 'placeholder',
    });

    expect('training_data_profile' in minimal).toBe(false);
    expect('training_artifact_sha' in minimal).toBe(false);
    expect('simulator_config' in minimal).toBe(false);
    expect('trained_at' in minimal).toBe(false);
  });

  it('keeps dispatch on the heuristic path until the simulator-calibrated gate opens', () => {
    const dispatchRun = buildLocalMlForecastRun({
      domain: 'dispatch',
      province: 'AB',
      horizon_hours: 6,
      scenario: {
        loadMw: 10250,
        temperatureC: -18,
        windGenerationMw: 380,
        solarGenerationMw: 40,
        reserveMarginPercent: 7,
        rampLimitMwPerHour: 320,
        previousDispatchMw: 10140,
      },
    });

    expect(dispatchRun.analysis.runtimeMode).toBe('heuristic');
    expect(dispatchRun.analysis.fallbackReason).toBeDefined();
    expect(dispatchRun.meta.model_version).toBe('physics-constrained-dispatch-v2');
    expect(dispatchRun.meta.training_data_profile).toBeUndefined();
    expect(dispatchRun.meta.claim_label).toBe('advisory');
    expect(dispatchRun.predictions).toHaveLength(6);
    expect(dispatchRun.analysis.featureContributions.previousDispatch).toBe(10140);
  });

  it('screens weak grids with short-circuit and inverter pressure', () => {
    const result = evaluateWeakGridShortCircuit({
      region: 'AB',
      shortCircuitLevelKa: 5.1,
      minimumShortCircuitKa: 8,
      inverterPenetrationPct: 44,
      reserveMarginPercent: 5,
      topology: {
        nodes: [
          { id: 'pincher-1', shortCircuitKa: 5.1 },
          { id: 'pincher-2', shortCircuitKa: 6.4 },
        ],
        edges: [{ fromNodeId: 'pincher-1', toNodeId: 'pincher-2', limitMw: 180, currentMw: 170 }],
      },
    });

    expect(result.modelVersion).toBe('weak-grid-short-circuit-v1');
    expect(result.status).not.toBe('stable');
    expect(result.weakNodes).toContain('pincher-1');
    expect(result.nodeAssessments[0].ruleTags.length).toBeGreaterThan(0);
    expect(result.ruleMappings.some((rule) => rule.triggered)).toBe(true);
    expect(result.alertCondition).toBe('monitor');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('builds gas basis runs with backtest metadata and policy overlay domains', () => {
    const gasBasis = forecastGasBasisSpread({
      aecoCadPerGj: 1.62,
      henryHubCadPerGj: 3.08,
      pipelineCurtailmentPct: 8,
      storageDeficitPct: 11,
      temperatureC: -14,
      basisLag1: 1.42,
      basisLag7: 1.38,
      trainingRows: [
        { aecoCadPerGj: 1.62, henryHubCadPerGj: 3.08, pipelineCurtailmentPct: 8, storageDeficitPct: 11, temperatureC: -14, basisLag1: 1.42, basisLag7: 1.38, spreadCadPerGj: 1.91 },
        { aecoCadPerGj: 1.58, henryHubCadPerGj: 3.01, pipelineCurtailmentPct: 6, storageDeficitPct: 9, temperatureC: -10, basisLag1: 1.37, basisLag7: 1.33, spreadCadPerGj: 1.82 },
        { aecoCadPerGj: 1.47, henryHubCadPerGj: 2.98, pipelineCurtailmentPct: 10, storageDeficitPct: 13, temperatureC: -20, basisLag1: 1.53, basisLag7: 1.49, spreadCadPerGj: 2.05 },
        { aecoCadPerGj: 1.69, henryHubCadPerGj: 3.22, pipelineCurtailmentPct: 4, storageDeficitPct: 6, temperatureC: -6, basisLag1: 1.29, basisLag7: 1.24, spreadCadPerGj: 1.68 },
      ],
      backtestRows: [
        { aecoCadPerGj: 1.52, henryHubCadPerGj: 3.05, pipelineCurtailmentPct: 9, storageDeficitPct: 12, temperatureC: -16, basisLag1: 1.41, basisLag7: 1.35, spreadCadPerGj: 1.94 },
        { aecoCadPerGj: 1.44, henryHubCadPerGj: 2.94, pipelineCurtailmentPct: 11, storageDeficitPct: 15, temperatureC: -23, basisLag1: 1.58, basisLag7: 1.51, spreadCadPerGj: 2.11 },
      ],
      sourceProfile: 'real',
    });
    const mlGasBasis = buildLocalMlForecastRun({
      domain: 'gas_basis',
      province: 'AB',
      horizon_hours: 24,
      scenario: {
        aecoCadPerGj: 1.62,
        henryHubCadPerGj: 3.08,
        pipelineCurtailmentPct: 8,
        storageDeficitPct: 11,
        temperatureC: -14,
        basisLag1: 1.42,
        basisLag7: 1.38,
        historyRows: [
          { aecoCadPerGj: 1.62, henryHubCadPerGj: 3.08, pipelineCurtailmentPct: 8, storageDeficitPct: 11, temperatureC: -14, basisLag1: 1.42, basisLag7: 1.38, spreadCadPerGj: 1.91 },
          { aecoCadPerGj: 1.58, henryHubCadPerGj: 3.01, pipelineCurtailmentPct: 6, storageDeficitPct: 9, temperatureC: -10, basisLag1: 1.37, basisLag7: 1.33, spreadCadPerGj: 1.82 },
          { aecoCadPerGj: 1.47, henryHubCadPerGj: 2.98, pipelineCurtailmentPct: 10, storageDeficitPct: 13, temperatureC: -20, basisLag1: 1.53, basisLag7: 1.49, spreadCadPerGj: 2.05 },
          { aecoCadPerGj: 1.69, henryHubCadPerGj: 3.22, pipelineCurtailmentPct: 4, storageDeficitPct: 6, temperatureC: -6, basisLag1: 1.29, basisLag7: 1.24, spreadCadPerGj: 1.68 },
        ],
        backtestRows: [
          { aecoCadPerGj: 1.52, henryHubCadPerGj: 3.05, pipelineCurtailmentPct: 9, storageDeficitPct: 12, temperatureC: -16, basisLag1: 1.41, basisLag7: 1.35, spreadCadPerGj: 1.94 },
        ],
        sourceProfile: 'real',
      },
    });
    const overlay = buildLocalMlForecastRun({
      domain: 'policy_overlay',
      province: 'AB',
      horizon_hours: 12,
      scenario: {
        assetLifeYears: 25,
        emissionsIntensity: 540,
        carbonPriceCadPerTonne: 95,
        policyDeadlineYear: 2035,
      },
    });

    expect(gasBasis.backtest.sample_count).toBeGreaterThan(0);
    expect(gasBasis.sourceProfile).toBe('real');
    expect(gasBasis.backtest.directionalAccuracy).toBeGreaterThanOrEqual(0);
    expect(mlGasBasis.analysis).toBeTruthy();
    expect(mlGasBasis.predictions[0]?.unit).toBe('CAD/GJ');
    expect(mlGasBasis.feature_ranking.trainingSummary.samples).toBeGreaterThan(0);
    expect(Array.isArray(mlGasBasis.feature_ranking.droppedFeatures)).toBe(true);
    expect(overlay.analysis).toBeTruthy();
    expect(overlay.predictions[0]?.target_name).toBe('stranded_asset_risk');
  });

  it('builds local ml forecast runs for byop, pv fault, and weak-grid domains', () => {
    const byop = buildLocalMlForecastRun({
      domain: 'byop_load',
      province: 'AB',
      horizon_hours: 24,
      scenario: {
        baseLoadMw: 120,
        flexibilityPct: 20,
        onSiteGenerationMw: 42,
        storageCapacityMwh: 160,
        storagePowerMw: 40,
        utilityImportCapMw: 110,
        priceSignalCadPerMwh: 145,
      },
    });
    const pvFault = buildLocalMlForecastRun({
      domain: 'pv_fault',
      province: 'AB',
      horizon_hours: 24,
    });
    const weakGrid = buildLocalMlForecastRun({
      domain: 'short_circuit',
      province: 'AB',
      horizon_hours: 24,
      scenario: {
        shortCircuitLevelKa: 5.4,
        minimumShortCircuitKa: 8,
        inverterPenetrationPct: 42,
      },
    });

    expect(byop.analysis?.modelVersion).toBe('byop-mas-v1');
    expect(byop.predictions.length).toBeGreaterThan(0);
    expect(byop.analysis?.agentSummary?.utility?.importCapMw).toBeGreaterThan(0);
    expect(pvFault.analysis?.modelVersion).toBe('graph-message-passing-pv-fault-v2');
    expect(pvFault.analysis?.topEdges?.length).toBeGreaterThan(0);
    expect(pvFault.predictions.length).toBe(0);
    expect(weakGrid.analysis?.modelVersion).toBe('weak-grid-short-circuit-v1');
  });

  it('activates the simulator-calibrated pv fault runtime when the flag is enabled', () => {
    vi.stubEnv('VITE_TRAINED_PV_FAULT_ENABLED', 'true');
    const trained = analyzePvFaultGraph({
      nodes: [
        { id: 'pv-a', expectedOutputMw: 2.8, observedOutputMw: 2.6, voltageV: 596, inverterTempC: 41, irradiance: 820 },
        { id: 'pv-b', expectedOutputMw: 2.7, observedOutputMw: 1.2, voltageV: 548, inverterTempC: 68, irradiance: 690 },
        { id: 'pv-c', expectedOutputMw: 2.5, observedOutputMw: 0.2, voltageV: 505, inverterTempC: 81, irradiance: 640, offline: true },
      ],
      edges: [
        { fromNodeId: 'pv-a', toNodeId: 'pv-b', weight: 0.5 },
        { fromNodeId: 'pv-b', toNodeId: 'pv-c', weight: 0.4 },
      ],
      trainedWeights: pvWeights as any,
    });

    expect(trained.runtimeMode).toBe('trained');
    expect(trained.claimLabel).toBe('validated');
    expect(trained.calibrationStatus).toBe('calibrated');
    expect(trained.trainingArtifactSha).toBe(pvWeights.manifest.training_artifact_sha);
    expect(trained.simulatorConfig?.scenario_count).toBe(20000);
    expect(trained.topSuspects.map((entry) => entry.nodeId)).toEqual(['pv-b', 'pv-a', 'pv-c']);
  });

  it('tracks SMOTE synthetic lineage and backtest metrics without surfacing synthetic rows', () => {
    const result = backtestRareEventResampling([
      { x: 0, y: 0, failure: 0 },
      { x: 0.1, y: 0.2, failure: 0 },
      { x: 0.2, y: 0.1, failure: 0 },
      { x: 0.3, y: 0.3, failure: 0 },
      { x: 0.4, y: 0.2, failure: 0 },
      { x: 0.9, y: 0.9, failure: 1 },
      { x: 1.0, y: 1.1, failure: 1 },
    ], 'failure', { minorityLabel: 1, targetMinorityCount: 6 });

    expect(result.syntheticLineage.length).toBeGreaterThan(0);
    expect(result.before.recall).toBeGreaterThanOrEqual(0);
    expect(result.after.recall).toBeGreaterThanOrEqual(result.before.recall);
    expect(JSON.stringify(result)).not.toContain('"synthetic":true');
  });
});
