import { describe, expect, it } from 'vitest';
import { computeMetrics, meanAbsolutePercentageError } from '../../src/lib/forecastMetrics';
import { calculateForecastErrorMetrics } from '../../src/lib/forecastBaselines';

describe('forecast percentage and skill metrics', () => {
  it('marks MAPE unavailable when actuals include zero or negative values', () => {
    expect(Number.isNaN(meanAbsolutePercentageError([0, 10], [100, 15]))).toBe(true);
    expect(Number.isNaN(meanAbsolutePercentageError([-10, 10], [-5, 15]))).toBe(true);
    expect(Number.isNaN(calculateForecastErrorMetrics([0, 10], [100, 15]).mape)).toBe(true);
  });

  it('does not report skill against a zero-error baseline as zero skill', () => {
    const metrics = computeMetrics(
      [10, 20],
      [10, 18],
      { mae: 0, mape: 0, rmse: 0 },
      { mae: 2, mape: 5, rmse: 2 },
    );

    expect(Number.isNaN(metrics.skill_score_vs_persistence)).toBe(true);
    expect(Number.isFinite(metrics.skill_score_vs_seasonal)).toBe(true);
  });
});
