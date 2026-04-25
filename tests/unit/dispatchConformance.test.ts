import dispatchWeights from '../../src/lib/modelWeights/dispatch-pinn-v2.json';
import {
  type MlpWeights,
  forwardMlp,
  validateMlpWeights,
} from '../../src/lib/modelInference';
import dispatchFixture from '../fixtures/dispatch-pinn-conformance.json';

describe('dispatch Python↔TS conformance', () => {
  it('matches the exported simulator fixture within a tight tolerance', () => {
    const typedWeights = dispatchWeights as unknown as MlpWeights;
    expect(validateMlpWeights(typedWeights)).toBe(true);

    expect(dispatchFixture.training_artifact_sha).toBe(typedWeights.manifest.training_artifact_sha);
    expect(dispatchFixture.simulator_config.version).toBe('pandapower-dcopf-ieee30-v1');
    expect(dispatchFixture.feature_columns).toHaveLength(7);
    expect(dispatchFixture.feature_columns.at(-1)).toBe('previous_dispatch_mw');
    expect(dispatchFixture.rows.length).toBeGreaterThanOrEqual(20);

    for (const row of dispatchFixture.rows) {
      expect(row.features).toHaveLength(7);
      const predicted = forwardMlp(typedWeights, row.features);
      const rawDelta = Math.abs(predicted - row.expected_dispatch_mw);
      const normalizedPredicted = Math.round(predicted * 10) / 10;
      const normalizedExpected = Math.round(row.expected_dispatch_mw * 10) / 10;
      expect(Math.abs(normalizedPredicted - normalizedExpected)).toBeLessThanOrEqual(1e-5);
      expect(rawDelta).toBeLessThanOrEqual(5e-3);
    }
  });
});
