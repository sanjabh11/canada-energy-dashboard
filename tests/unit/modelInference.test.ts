import dispatchWeights from '../../src/lib/modelWeights/dispatch-pinn-v2.json';
import pvWeights from '../../src/lib/modelWeights/pv-gnn-v2.json';
import {
  DISPATCH_INPUT_WIDTH,
  isDispatchProductionArtifact,
  isPvFaultProductionArtifact,
  type GnnWeights,
  type MlpWeights,
  forwardGnn,
  forwardMlp,
  isPlaceholderVersion,
  isProductionArtifact,
  buildPvFaultNodeFeatureVector,
  validateGnnWeights,
  validateMlpWeights,
} from '../../src/lib/modelInference';
import { buildDispatchFeatureVector } from '../../src/lib/advancedForecasting';

const typedPvWeights = pvWeights as unknown as GnnWeights;

const tieBreakWeights: GnnWeights = {
  manifest: {
    ...typedPvWeights.manifest,
    training_artifact_sha: 'tie-break-sha-001',
    simulator_config: {
      ...typedPvWeights.manifest.simulator_config,
      version: 'pvlib-tie-break-v1',
      scenario_count: 5000,
    },
    metrics: {
      f1: 0.8,
      top3_localization_accuracy: 0.9,
      validation_loss: 0.05,
    },
    warnings: [],
  },
  node_projection: {
    activation: 'linear',
    bias: [0.54324],
    weights: [[0, 0, 0, 0, 0]],
  },
  edge_weights: [0.2],
  iterations: 1,
  class_thresholds: {
    healthy_cluster: 0.1,
    inverter_trip: 0.2,
    soiling_cluster: 0.3,
    hot_spot_derating: 0.4,
    localized_short_circuit: 0.5,
  },
};

describe('model inference bootstrap', () => {
  it('validates and runs the placeholder dispatch MLP deterministically', () => {
    const typedDispatchWeights = dispatchWeights as unknown as MlpWeights;
    expect(validateMlpWeights(typedDispatchWeights)).toBe(true);
    expect(typedDispatchWeights.feature_means.length).toBe(DISPATCH_INPUT_WIDTH);

    const features = buildDispatchFeatureVector({
      loadMw: 7600,
      temperatureC: 4,
      windGenerationMw: 1600,
      solarGenerationMw: 700,
      reserveMarginPercent: 10,
      rampLimitMwPerHour: 330,
      previousDispatchMw: 295,
    });
    const first = forwardMlp(typedDispatchWeights, features);
    const second = forwardMlp(typedDispatchWeights, features);

    expect(Number.isFinite(first)).toBe(true);
    expect(first).toBe(second);
    expect(features).toHaveLength(DISPATCH_INPUT_WIDTH);
    expect(features.at(-1)).toBe(295);
  });

  it('validates and runs the placeholder PV graph model deterministically', () => {
    const typedPvWeights = pvWeights as unknown as GnnWeights;
    expect(validateGnnWeights(typedPvWeights)).toBe(true);
    expect(isPvFaultProductionArtifact(typedPvWeights)).toBe(true);
    expect(typedPvWeights.node_projection.weights[0]).toHaveLength(5);

    const result = forwardGnn(
      typedPvWeights,
      [
        { id: 'n1', features: buildPvFaultNodeFeatureVector({ expectedOutputMw: 2.5, observedOutputMw: 1.4, voltageV: 552, inverterTempC: 62, irradiance: 720, offline: false }) },
        { id: 'n2', features: buildPvFaultNodeFeatureVector({ expectedOutputMw: 2.2, observedOutputMw: 2.1, voltageV: 598, inverterTempC: 44, irradiance: 760, offline: false }) },
        { id: 'n3', features: buildPvFaultNodeFeatureVector({ expectedOutputMw: 2.4, observedOutputMw: 0.1, voltageV: 505, inverterTempC: 79, irradiance: 640, offline: true }) },
      ],
      [
        { from: 'n1', to: 'n2', weight: 0.4 },
        { from: 'n2', to: 'n3', weight: 0.3 },
      ],
    );

    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(1);
    expect(result.topSuspects.length).toBeGreaterThan(0);
    expect(result.topEdges.length).toBeGreaterThan(0);
    expect(result.faultClass).toEqual(expect.any(String));
  });

  it('sorts PV suspects by 3-decimal risk buckets with alphabetical tie-breaks', () => {
    const ranked = forwardGnn(
      tieBreakWeights,
      [
        { id: 'pv-b', features: [0, 0, 0, 0, 0] },
        { id: 'pv-a', features: [0, 0, 0, 0, 0] },
      ],
      [],
    );

    expect(ranked.topSuspects.map((entry) => entry.nodeId)).toEqual(['pv-a', 'pv-b']);
    expect(ranked.topSuspects[0]?.riskScore).toBeCloseTo(ranked.topSuspects[1]?.riskScore ?? 0, 6);
  });

  it('sorts PV edges by 3-decimal risk buckets with alphabetical tie-breaks', () => {
    const ranked = forwardGnn(
      {
        ...tieBreakWeights,
        node_projection: {
          activation: 'linear',
          bias: [0],
          weights: [[1, 0, 0, 0, 0]],
        },
      },
      [
        { id: 'pv-a', features: [0.1, 0, 0, 0, 0] },
        { id: 'pv-b', features: [0.9, 0, 0, 0, 0] },
        { id: 'pv-c', features: [0.8, 0, 0, 0, 0] },
      ],
      [
        { from: 'pv-a', to: 'pv-b', weight: 0.1 },
        { from: 'pv-b', to: 'pv-c', weight: 1 },
      ],
    );

    expect(ranked.topEdges.map((entry) => [entry.from, entry.to])).toEqual([
      ['pv-b', 'pv-c'],
      ['pv-a', 'pv-b'],
    ]);
  });

  it('rejects malformed weight artifacts', () => {
    const typedPvWeights = pvWeights as unknown as GnnWeights;
    expect(validateMlpWeights({})).toBe(false);
    expect(validateGnnWeights({})).toBe(false);
    expect(isPvFaultProductionArtifact(typedPvWeights)).toBe(true);
  });

  it('treats placeholder simulator versions as non-production artifacts', () => {
    expect(isPlaceholderVersion('placeholder-0.0.0')).toBe(true);
    expect(isPlaceholderVersion('pandapower-2026.05')).toBe(false);
    expect(isProductionArtifact(dispatchWeights.manifest as any)).toBe(true);
    expect(isDispatchProductionArtifact(dispatchWeights as unknown as MlpWeights)).toBe(true);
    expect(
      isProductionArtifact({
        ...dispatchWeights.manifest,
        simulator_config: {
          ...dispatchWeights.manifest.simulator_config,
          scenario_count: 4999,
        },
      } as any),
    ).toBe(false);
    expect(
      isProductionArtifact({
        ...dispatchWeights.manifest,
        metrics: {
          ...dispatchWeights.manifest.metrics,
          physics_violation_rate: 0.2,
        },
      } as any),
    ).toBe(false);
    expect(
      isDispatchProductionArtifact({
        ...(dispatchWeights as unknown as MlpWeights),
        feature_means: dispatchWeights.feature_means.slice(0, 6),
        feature_stds: dispatchWeights.feature_stds.slice(0, 6),
        layers: [
          {
            ...dispatchWeights.layers[0],
            weights: dispatchWeights.layers[0].weights.map((row) => row.slice(0, 6)),
          },
          dispatchWeights.layers[1],
        ],
      } as MlpWeights),
    ).toBe(false);
    expect(
      isPvFaultProductionArtifact({
        ...typedPvWeights,
        manifest: {
          ...typedPvWeights.manifest,
          simulator_config: {
            ...typedPvWeights.manifest.simulator_config,
            scenario_count: 4999,
          },
        },
      } as GnnWeights),
    ).toBe(false);
    expect(
      isPvFaultProductionArtifact({
        ...typedPvWeights,
        class_thresholds: {
          ...typedPvWeights.class_thresholds,
          localized_short_circuit: 0.3,
        },
      } as GnnWeights),
    ).toBe(false);
    expect(
      isPvFaultProductionArtifact({
        ...typedPvWeights,
        manifest: {
          ...typedPvWeights.manifest,
          metrics: {
            ...typedPvWeights.manifest.metrics,
            f1: 0.31,
            top3_localization_accuracy: 0.51,
            validation_loss: 0.091,
          },
        },
      } as GnnWeights),
    ).toBe(false);
    expect(
      isPvFaultProductionArtifact({
        ...typedPvWeights,
        manifest: {
          ...typedPvWeights.manifest,
          simulator_config: {
            ...typedPvWeights.manifest.simulator_config,
            version: 'placeholder-pvlib-v1',
          },
        },
      } as GnnWeights),
    ).toBe(false);
  });
});
