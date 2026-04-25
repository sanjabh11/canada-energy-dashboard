import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/jobExecutionLog', () => ({
  logFallbackEvent: vi.fn().mockResolvedValue(undefined),
}));

import { logFallbackEvent } from '../../src/lib/jobExecutionLog';
import { runMlForecast } from '../../src/lib/mlForecastingClient';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('mlForecastingClient pv_fault routing', () => {
  it('logs fallback telemetry when the trained PV gate is off', async () => {
    vi.stubEnv('VITE_TRAINED_PV_FAULT_ENABLED', 'false');

    const result = await runMlForecast({
      domain: 'pv_fault',
      province: 'AB',
      horizon_hours: 6,
      scenario: {
        nodes: [
          { id: 'pv-a', expectedOutputMw: 2.4, observedOutputMw: 1.2, voltageV: 545, inverterTempC: 61, irradiance: 780 },
          { id: 'pv-b', expectedOutputMw: 2.2, observedOutputMw: 2.1, voltageV: 598, inverterTempC: 44, irradiance: 760 },
          { id: 'pv-c', expectedOutputMw: 2.1, observedOutputMw: 0.2, voltageV: 504, inverterTempC: 79, irradiance: 640, offline: true },
        ],
        edges: [
          { fromNodeId: 'pv-a', toNodeId: 'pv-b', weight: 1 },
          { fromNodeId: 'pv-b', toNodeId: 'pv-c', weight: 1 },
        ],
      },
    });

    expect(result.source).toBe('local_fallback');
    expect(result.data.analysis.runtimeMode).toBe('heuristic');
    expect(result.data.meta.claim_label).toBe('advisory');
    expect(logFallbackEvent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logFallbackEvent).mock.calls[0][0]).toMatchObject({
      jobName: 'ml-forecast:pv-fault-runtime',
      domain: 'pv_fault',
      source: 'local_pv_fault_runtime',
    });
  });

  it('returns the trained PV runtime without emitting fallback telemetry', async () => {
    vi.stubEnv('VITE_TRAINED_PV_FAULT_ENABLED', 'true');

    const result = await runMlForecast({
      domain: 'pv_fault',
      province: 'AB',
      horizon_hours: 6,
      scenario: {
        nodes: [
          { id: 'pv-a', expectedOutputMw: 2.4, observedOutputMw: 1.2, voltageV: 545, inverterTempC: 61, irradiance: 780 },
          { id: 'pv-b', expectedOutputMw: 2.2, observedOutputMw: 2.1, voltageV: 598, inverterTempC: 44, irradiance: 760 },
          { id: 'pv-c', expectedOutputMw: 2.1, observedOutputMw: 0.2, voltageV: 504, inverterTempC: 79, irradiance: 640, offline: true },
        ],
        edges: [
          { fromNodeId: 'pv-a', toNodeId: 'pv-b', weight: 1 },
          { fromNodeId: 'pv-b', toNodeId: 'pv-c', weight: 1 },
        ],
      },
    });

    expect(result.source).toBe('local_fallback');
    expect(result.data.analysis.runtimeMode).toBe('trained');
    expect(result.data.meta.training_data_profile).toBe('simulator-calibrated');
    expect(result.data.meta.claim_label).toBe('validated');
    expect(logFallbackEvent).not.toHaveBeenCalled();
  });
});
