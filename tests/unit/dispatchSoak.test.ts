import { afterEach, describe, expect, it, vi } from 'vitest';
import { runMlForecast } from '../../src/lib/mlForecastingClient';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('dispatch trained-path soak', () => {
  it('keeps the trained dispatch runtime active across repeated calls', async () => {
    vi.stubEnv('VITE_TRAINED_DISPATCH_ENABLED', 'true');

    const results = await Promise.all(
      Array.from({ length: 5 }, () => runMlForecast({
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
      })),
    );

    for (const result of results) {
      expect(result.data.analysis.runtimeMode).toBe('trained');
      expect(result.data.meta.training_data_profile).toBe('simulator-calibrated');
      expect(result.data.meta.claim_label).toBe('validated');
      expect(result.data.predictions).toHaveLength(6);
    }
  });
});
