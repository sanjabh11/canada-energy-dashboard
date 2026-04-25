import { afterEach, describe, expect, it, vi } from 'vitest';
import { runMlForecast } from '../../src/lib/mlForecastingClient';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('pv fault trained-path soak', () => {
  it('keeps the trained PV runtime active across repeated calls', async () => {
    vi.stubEnv('VITE_TRAINED_PV_FAULT_ENABLED', 'true');

    const results = await Promise.all(
      Array.from({ length: 5 }, () => runMlForecast({
        domain: 'pv_fault',
        province: 'AB',
        horizon_hours: 6,
        scenario: {
          nodes: [
            { id: 'pv-a', expectedOutputMw: 2.6, observedOutputMw: 1.0, voltageV: 540, inverterTempC: 62, irradiance: 780 },
            { id: 'pv-b', expectedOutputMw: 2.4, observedOutputMw: 2.2, voltageV: 598, inverterTempC: 43, irradiance: 760 },
            { id: 'pv-c', expectedOutputMw: 2.1, observedOutputMw: 0.2, voltageV: 502, inverterTempC: 79, irradiance: 640, offline: true },
          ],
          edges: [
            { fromNodeId: 'pv-a', toNodeId: 'pv-b', weight: 1 },
            { fromNodeId: 'pv-b', toNodeId: 'pv-c', weight: 1 },
          ],
        },
      })),
    );

    for (const result of results) {
      expect(result.data.analysis.runtimeMode).toBe('trained');
      expect(result.data.meta.training_data_profile).toBe('simulator-calibrated');
      expect(result.data.meta.claim_label).toBe('validated');
      expect(result.data.analysis.topSuspects.length).toBeGreaterThan(0);
    }
  });
});
