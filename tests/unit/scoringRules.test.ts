import { describe, it, expect } from 'vitest';
import {
  pinballLoss,
  meanPinballLoss,
  computeCRPS,
  computeBrierScore,
  computeCoverageRate,
  computeMAE,
  computeRMSE,
  computeMAPE,
  computeSkillScore,
  evaluateForecast,
} from '../../src/lib/scoringRules';

describe('pinballLoss', () => {
  it('returns 0 when forecast equals actual', () => {
    expect(pinballLoss(100, 100, 0.5)).toBe(0);
  });

  it('penalizes overforecast more at low quantile', () => {
    const over = pinballLoss(100, 110, 0.1);
    const under = pinballLoss(100, 90, 0.1);
    expect(over).toBeGreaterThan(under);
  });

  it('penalizes underforecast more at high quantile', () => {
    const under = pinballLoss(100, 90, 0.9);
    const over = pinballLoss(100, 110, 0.9);
    expect(under).toBeGreaterThan(over);
  });

  it('is symmetric at median quantile', () => {
    expect(pinballLoss(100, 110, 0.5)).toBe(pinballLoss(100, 90, 0.5));
  });
});

describe('meanPinballLoss', () => {
  it('returns 0 for perfect forecasts', () => {
    expect(meanPinballLoss([100, 200], [100, 200], 0.5)).toBe(0);
  });

  it('computes mean over array', () => {
    const result = meanPinballLoss([100, 100], [110, 90], 0.5);
    expect(result).toBe(5);
  });

  it('throws on length mismatch', () => {
    expect(() => meanPinballLoss([1], [1, 2], 0.5)).toThrow('len mismatch');
  });
});

describe('computeCRPS', () => {
  it('returns 0 for perfect quantile forecasts', () => {
    expect(computeCRPS([100], [100], [100], [100])).toBe(0);
  });

  it('averages pinball at P10/P50/P90', () => {
    const result = computeCRPS([100], [90], [100], [110]);
    expect(result).toBeGreaterThan(0);
    // P50 is perfect, P10 and P90 each off by 10
    // pinball(100,90,0.1) = max(0.1*10, -0.9*10) = 1
    // pinball(100,100,0.5) = 0
    // pinball(100,110,0.9) = max(0.9*(-10), 0.1*10) = 1
    // CRPS = (1 + 0 + 1) / 3 = 0.6667
    expect(result).toBeCloseTo(2 / 3, 5);
  });
});

describe('computeBrierScore', () => {
  it('returns 0 for perfect predictions', () => {
    expect(computeBrierScore([1, 0, 1], [1, 0, 1])).toBe(0);
  });

  it('returns 1 for completely wrong predictions', () => {
    expect(computeBrierScore([1, 1], [0, 0])).toBe(1);
  });

  it('computes mean squared error of probabilities', () => {
    expect(computeBrierScore([0.8, 0.3], [1, 0])).toBeCloseTo(0.065, 5);
  });
});

describe('computeCoverageRate', () => {
  it('returns 1 when all actuals within intervals', () => {
    expect(computeCoverageRate([95, 100, 105], [90, 90, 90], [110, 110, 110])).toBe(1);
  });

  it('returns 0 when all actuals outside intervals', () => {
    expect(computeCoverageRate([50, 200], [90, 90], [110, 110])).toBe(0);
  });

  it('returns 0.5 for mixed', () => {
    expect(computeCoverageRate([100, 200], [90, 90], [110, 110])).toBe(0.5);
  });
});

describe('computeMAE', () => {
  it('returns 0 for perfect forecasts', () => {
    expect(computeMAE([100, 200], [100, 200])).toBe(0);
  });
  it('computes mean absolute error', () => {
    expect(computeMAE([100, 200], [110, 190])).toBe(10);
  });
});

describe('computeRMSE', () => {
  it('returns 0 for perfect forecasts', () => {
    expect(computeRMSE([100, 200], [100, 200])).toBe(0);
  });
  it('computes root mean square error', () => {
    expect(computeRMSE([100, 100], [110, 90])).toBeCloseTo(10, 5);
  });
});

describe('computeMAPE', () => {
  it('returns 0 for perfect forecasts', () => {
    expect(computeMAPE([100, 200], [100, 200])).toBe(0);
  });
  it('computes mean absolute percentage error', () => {
    expect(computeMAPE([100, 200], [110, 190])).toBeCloseTo(7.5, 5);
  });
});

describe('computeSkillScore', () => {
  it('returns 0 when model equals baseline', () => {
    expect(computeSkillScore(100, 100)).toBe(0);
  });
  it('returns positive when model beats baseline', () => {
    expect(computeSkillScore(80, 100)).toBeCloseTo(0.2, 5);
  });
  it('returns 0 when baseline is 0', () => {
    expect(computeSkillScore(50, 0)).toBe(0);
  });
});

describe('evaluateForecast', () => {
  it('computes all metrics from input', () => {
    const metrics = evaluateForecast({
      actuals: [100, 200],
      pointForecast: [110, 190],
      p10: [90, 180],
      p50: [100, 200],
      p90: [110, 220],
      lower: [85, 170],
      upper: [115, 230],
      baselineMAE: 20,
    });
    expect(metrics.mae).toBe(10);
    expect(metrics.crps).toBeGreaterThan(0);
    expect(metrics.coverage_rate).toBe(1);
    expect(metrics.skill_score).toBeCloseTo(0.5, 5);
  });

  it('works with point forecast only', () => {
    const metrics = evaluateForecast({
      actuals: [100],
      pointForecast: [110],
    });
    expect(metrics.mae).toBe(10);
    expect(metrics.crps).toBeUndefined();
    expect(metrics.coverage_rate).toBeUndefined();
  });
});
