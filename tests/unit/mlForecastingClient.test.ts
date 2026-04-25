import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/jobExecutionLog', () => ({
  logFallbackEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/edge', () => ({
  fetchEdgePostJson: vi.fn().mockRejectedValue(new Error('edge unavailable')),
}));

import { logFallbackEvent } from '../../src/lib/jobExecutionLog';
import { classifyEdgeFallbackReason, ingestGroundsourceEvents, runMlForecast } from '../../src/lib/mlForecastingClient';

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

describe('mlForecastingClient groundsource routing', () => {
  it('returns a heuristic fallback payload when the edge call fails', async () => {
    const result = await ingestGroundsourceEvents({
      source_group: 'utility_public',
      max_items: 2,
    });

    expect(result.source).toBe('local_fallback');
    expect(result.data.extraction_mode).toBe('heuristic');
    expect(result.data.fallback_reason).toBe('edge_function_unavailable');
    expect(result.data.meta.claim_label).toBe('advisory');
    expect(result.data.meta.is_fallback).toBe(true);
    expect(result.data.event_count).toBe(0);
  });

  it('classifies common browser edge failures into actionable fallback reasons', () => {
    expect(classifyEdgeFallbackReason('Request failed: 404 Not Found')).toBe('edge_undeployed');
    expect(classifyEdgeFallbackReason('Request failed: 401 Unauthorized')).toBe('edge_unauthorized');
    expect(classifyEdgeFallbackReason('Failed to fetch')).toBe('edge_cors_failed');
    expect(classifyEdgeFallbackReason('Supabase Edge fetch disabled via configuration')).toBe('edge_disabled');
  });
});
