import { describe, expect, it } from 'vitest';
import pvWeights from '../../src/lib/modelWeights/pv-gnn-v2.json';
import {
  buildPvFaultNodeFeatureVector,
  forwardGnn,
  type GnnWeights,
  validateGnnWeights,
} from '../../src/lib/modelInference';
import pvFixture from '../fixtures/pv-gnn-conformance.json';

describe('pv fault Python↔TS conformance', () => {
  it('matches the exported simulator fixture within a tight tolerance', () => {
    const typedWeights = pvWeights as unknown as GnnWeights;
    expect(validateGnnWeights(typedWeights)).toBe(true);

    expect(pvFixture.training_artifact_sha).toBe(typedWeights.manifest.training_artifact_sha);
    expect(pvFixture.simulator_config.version).toBe('pvlib-mv_oberrhein-gnn-v1');
    expect(pvFixture.feature_columns).toEqual([
      'output_delta_ratio',
      'voltage_penalty',
      'thermal_penalty',
      'irradiance_deficit',
      'offline_flag',
    ]);
    expect(pvFixture.rows).toHaveLength(20);

    const classCounts = pvFixture.rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.predicted_fault_class] = (acc[row.predicted_fault_class] ?? 0) + 1;
      expect(row.top_margin).toBeGreaterThanOrEqual(0);
      expect(row.label_margin).toBeGreaterThanOrEqual(0);
      return acc;
    }, {});
    expect(classCounts).toEqual({
      healthy_cluster: 4,
      inverter_trip: 4,
      soiling_cluster: 4,
      hot_spot_derating: 4,
      localized_short_circuit: 4,
    });

    for (const row of pvFixture.rows) {
      const prediction = forwardGnn(
        typedWeights,
        row.nodes.map((node) => ({
          id: node.id,
          features: buildPvFaultNodeFeatureVector({
            expectedOutputMw: node.expected_output_mw,
            observedOutputMw: node.observed_output_mw,
            voltageV: node.voltage_v,
            inverterTempC: node.inverter_temp_c,
            irradiance: node.irradiance,
            offline: node.offline,
          }),
        })),
        row.edges.map((edge) => ({
          from: edge.from,
          to: edge.to,
          weight: edge.weight,
        })),
      );

      const rawDelta = Math.abs(prediction.confidenceScore - row.expected_confidence_score);
      expect(rawDelta).toBeLessThanOrEqual(5e-3);
      expect(prediction.topSuspects.map((entry) => entry.nodeId)).toEqual(row.expected_top_suspects.map((entry) => entry.nodeId));
      expect(prediction.topEdges.map((entry) => [entry.from, entry.to])).toEqual(
        row.expected_top_edges.map((entry) => [entry.fromNodeId, entry.toNodeId]),
      );
      if (row.label_margin >= 0.05) {
        expect(prediction.faultClass).toBe(row.expected_fault_class);
      } else {
        expect(prediction.classProbabilities[row.expected_fault_class]).toBeGreaterThan(0);
      }
    }
  });
});
