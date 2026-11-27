import {
  calculateForecastErrorMetrics,
  calculatePersistenceBaseline,
  calculateSeasonalNaiveBaseline,
  calculateSkillScore,
  compareToBaselines,
  computeUplift,
  meetsIndustryStandard,
  persistenceForecast,
  seasonalNaiveForecast,
} from '../../src/lib/forecastBaselines';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('forecastBaselines', () => {
  it('returns zero uplift for invalid baseline inputs', () => {
    expect(computeUplift(5, 0)).toBe(0);
    expect(computeUplift(Number.NaN, 10)).toBe(0);
    expect(computeUplift(5, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('computes a zero-error persistence baseline for a flat series', () => {
    expect(calculatePersistenceBaseline([50, 50, 50], 1)).toEqual({
      mae: 0,
      mape: 0,
      rmse: 0,
    });
  });

  it('repeats only the last complete season for a fixed-origin horizon', () => {
    const forecast = seasonalNaiveForecast([1, 2, 3, 4], 7, 2);
    expect(forecast.available).toBe(true);
    expect(forecast.values).toEqual([3, 4, 3, 4, 3, 4, 3]);
  });

  it('marks the seasonal baseline unavailable when history is shorter than a season', () => {
    const forecast = seasonalNaiveForecast([1, 2, 3, 4, 5, 6, 7, 8], 24, 24);
    expect(forecast.available).toBe(false);
    expect(forecast.values).toEqual([]);
    expect(Number.isFinite(forecast.mae)).toBe(false);
    expect(Number.isFinite(forecast.rmse)).toBe(false);
  });

  it('never reports zero error for empty or mismatched metric inputs', () => {
    expect(calculateForecastErrorMetrics([1, 2], []).mae).toBeNaN();
    expect(calculateForecastErrorMetrics([], []).mape).toBeNaN();
    expect(calculateForecastErrorMetrics([1, 2, 3], [1, 2]).rmse).toBeNaN();
    expect(calculatePersistenceBaseline([10, 10], 1).mae).toBe(0);
    expect(calculatePersistenceBaseline([10], 1).mae).toBeNaN();
    expect(calculateSeasonalNaiveBaseline([1, 2, 3], 1, 168).mae).toBeNaN();
    expect(persistenceForecast(12, 0).available).toBe(false);
  });

  it('keeps seasonal phase aligned when the forecast starts after a non-period calibration tail', () => {
    const training = Array.from({ length: 48 }, (_, index) => index);

    expect(seasonalNaiveForecast(training, 4, 24, 128).values).toEqual([32, 33, 34, 35]);
  });

  it('compares a perfect model against baselines', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const actual = Array.from({ length: 200 }, () => 50);
    const metrics = compareToBaselines(actual, actual, 1);

    expect(metrics.sampleCount).toBe(200);
    expect(metrics.persistence.mae).toBe(0);
    expect(metrics.seasonalNaive.mae).toBe(0);
    expect(metrics.confidence).toEqual({ lower: 0, upper: 0 });
  });

  it('evaluates industry thresholds and skill score correctly', () => {
    expect(meetsIndustryStandard(5.5, 'solar')).toEqual({
      meets: true,
      target: 6,
      margin: 0.5,
    });
    expect(calculateSkillScore(12, 10)).toBeCloseTo(-0.2);
    expect(Number.isNaN(calculateSkillScore(0, 0))).toBe(true);
    expect(Number.isNaN(calculateSkillScore(12, Number.NaN))).toBe(true);
  });
});
