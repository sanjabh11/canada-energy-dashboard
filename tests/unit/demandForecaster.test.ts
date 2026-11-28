import { describe, expect, it } from 'vitest';
import {
  DemandForecaster,
  computeDemandStats,
  forecastToCSV,
  type DemandRecord,
} from '../../src/lib/demandForecaster';

function makeDemandRecords(hours: number, startIso = '2026-01-01T00:00:00.000Z'): DemandRecord[] {
  const start = new Date(startIso).getTime();
  const records: DemandRecord[] = [];
  for (let i = 0; i < hours; i++) {
    const t = new Date(start + i * 3600_000);
    const hour = t.getUTCHours();
    // Deterministic diurnal pattern: 16000 MW base + evening bump.
    const demand = 16000 + (hour >= 17 && hour <= 20 ? 2000 : hour >= 6 && hour <= 9 ? 1000 : 0);
    records.push({
      datetime: t.toISOString(),
      hour_ending: (hour + 1) % 24 || 24,
      total_demand_mw: demand,
      hourly_demand_gwh: demand / 1000,
      date: t.toISOString().slice(0, 10),
    });
  }
  return records;
}

describe('DemandForecaster', () => {
  it('throws when training data covers fewer than two weekly cycles', () => {
    const forecaster = new DemandForecaster();
    expect(() => forecaster.train(makeDemandRecords(100))).toThrow(/Insufficient training data/);
  });

  it('throws when forecasting before training', () => {
    const forecaster = new DemandForecaster();
    expect(() =>
      forecaster.forecast({ horizon_hours: 24, include_confidence_interval: false, confidence_level: 0.95, use_temperature: false }),
    ).toThrow(/not trained/i);
  });

  it('trains on two weeks of hourly data and produces a model state', () => {
    const forecaster = new DemandForecaster();
    const state = forecaster.train(makeDemandRecords(336));
    expect(state.training_size).toBe(336);
    expect(state.seasonal_profile.hourly).toHaveLength(24);
    expect(state.seasonal_profile.weekly).toHaveLength(7);
    expect(state.seasonal_profile.monthly).toHaveLength(12);
    expect(state.mean_demand).toBeGreaterThan(15000);
  });

  it('produces one forecast point per horizon hour', () => {
    const forecaster = new DemandForecaster();
    forecaster.train(makeDemandRecords(336));
    const points = forecaster.forecast({
      horizon_hours: 48,
      include_confidence_interval: false,
      confidence_level: 0.95,
      use_temperature: false,
    });
    expect(points).toHaveLength(48);
    for (const point of points) {
      expect(point.forecast_mw).toBeGreaterThan(0);
      expect(point.datetime).toMatch(/T\d{2}:00:00\.000Z$/);
      expect(Number.isFinite(point.persistence_mw)).toBe(true);
      expect(Number.isFinite(point.seasonal_naive_mw)).toBe(true);
    }
  });

  it('advances forecast timestamps hourly from the last training record', () => {
    const forecaster = new DemandForecaster();
    const data = makeDemandRecords(336);
    forecaster.train(data);
    const points = forecaster.forecast({
      horizon_hours: 3,
      include_confidence_interval: false,
      confidence_level: 0.95,
      use_temperature: false,
    });
    const last = new Date(data[data.length - 1].datetime).getTime();
    points.forEach((point, i) => {
      expect(new Date(point.datetime).getTime()).toBe(last + (i + 1) * 3600_000);
    });
  });
});

describe('computeDemandStats', () => {
  it('returns zeroed stats for empty input', () => {
    const stats = computeDemandStats([]);
    expect(stats).toMatchObject({ count: 0, mean_mw: 0, min_mw: 0, max_mw: 0, std_mw: 0 });
  });

  it('computes mean/min/max over the dataset', () => {
    const stats = computeDemandStats(makeDemandRecords(168));
    expect(stats.count).toBe(168);
    expect(stats.min_mw).toBe(16000);
    expect(stats.max_mw).toBe(18000);
    expect(stats.mean_mw).toBeGreaterThan(16000);
  });
});

describe('forecastToCSV', () => {
  it('emits a header row and one line per forecast point', () => {
    const forecaster = new DemandForecaster();
    forecaster.train(makeDemandRecords(336));
    const points = forecaster.forecast({
      horizon_hours: 5,
      include_confidence_interval: false,
      confidence_level: 0.95,
      use_temperature: false,
    });
    const csv = forecastToCSV(points);
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(6);
    expect(lines[0]).toMatch(/datetime.*forecast/i);
  });
});
