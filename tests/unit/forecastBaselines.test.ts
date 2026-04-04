import {
  calculatePersistenceBaseline,
  calculateSkillScore,
  compareToBaselines,
  computeUplift,
  meetsIndustryStandard,
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
  });
});
