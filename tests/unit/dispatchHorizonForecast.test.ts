import { describe, expect, it } from 'vitest';
import {
  dispatchHorizonForecast,
  HORIZON_MODEL_MAP,
  type HorizonConfig,
} from '../../src/lib/mlForecasting';

function makeHistoricalDemand(hours: number, base: number = 10000): number[] {
  return Array.from({ length: hours }, (_, i) => {
    const hourOfDay = i % 24;
    const dailyPattern = Math.sin((hourOfDay / 24) * Math.PI * 2) * 0.1;
    return Math.round(base * (1 + dailyPattern) + (i / 24) * 10);
  });
}

function makeWeatherFeatures(hours: number, base: number = 18): number[] {
  return Array.from({ length: hours }, (_, i) => base + Math.sin((i / 24) * Math.PI * 2) * 5);
}

describe('dispatchHorizonForecast', () => {
  it('generates day-ahead forecast with 24 values reflecting diurnal pattern', () => {
    const config: HorizonConfig = {
      horizon: 'day_ahead',
      hoursAhead: 24,
      modelPreference: 'auto',
      weatherRequired: true,
    };
    const result = dispatchHorizonForecast(config, {
      historicalDemand: makeHistoricalDemand(168),
      weatherFeatures: makeWeatherFeatures(24),
    });

    expect(result.pointForecast).toHaveLength(24);
    expect(result.horizon).toBe('day_ahead');
    expect(result.metadata.weatherUsed).toBe(true);
    expect(result.modelUsed).toBe(HORIZON_MODEL_MAP.day_ahead.defaultModel);
  });

  it('generates week-ahead forecast with 168 values', () => {
    const config: HorizonConfig = {
      horizon: 'week_ahead',
      hoursAhead: 168,
      modelPreference: 'auto',
      weatherRequired: true,
    };
    const result = dispatchHorizonForecast(config, {
      historicalDemand: makeHistoricalDemand(336),
      weatherFeatures: makeWeatherFeatures(168),
    });

    expect(result.pointForecast).toHaveLength(168);
    expect(result.horizon).toBe('week_ahead');
  });

  it('generates month-ahead forecast with 720 values', () => {
    const config: HorizonConfig = {
      horizon: 'month_ahead',
      hoursAhead: 720,
      modelPreference: 'auto',
      weatherRequired: false,
    };
    const result = dispatchHorizonForecast(config, {
      historicalDemand: makeHistoricalDemand(1440),
    });

    expect(result.pointForecast).toHaveLength(720);
    expect(result.horizon).toBe('month_ahead');
  });

  it('generates seasonal-ahead forecast with 2160 values', () => {
    const config: HorizonConfig = {
      horizon: 'seasonal_ahead',
      hoursAhead: 2160,
      modelPreference: 'auto',
      weatherRequired: false,
    };
    const result = dispatchHorizonForecast(config, {
      historicalDemand: makeHistoricalDemand(8760),
    });

    expect(result.pointForecast).toHaveLength(2160);
    expect(result.horizon).toBe('seasonal_ahead');
  });

  it('returns flat forecast at mean for n<24 (insufficient data)', () => {
    const config: HorizonConfig = {
      horizon: 'day_ahead',
      hoursAhead: 24,
      modelPreference: 'auto',
      weatherRequired: false,
    };
    const result = dispatchHorizonForecast(config, {
      historicalDemand: [10, 20, 30],
    });

    const mean = 20;
    expect(result.pointForecast).toHaveLength(24);
    expect(result.pointForecast.every((v) => v === mean)).toBe(true);
  });

  it('clamps negative demand to non-negative values', () => {
    const config: HorizonConfig = {
      horizon: 'day_ahead',
      hoursAhead: 24,
      modelPreference: 'auto',
      weatherRequired: true,
    };
    const result = dispatchHorizonForecast(config, {
      historicalDemand: makeHistoricalDemand(168, 100),
      weatherFeatures: Array.from({ length: 24 }, () => -40),
    });

    expect(result.pointForecast.every((v) => v >= 0)).toBe(true);
  });

  it('generates conformal intervals when calibration data > 10 points', () => {
    const config: HorizonConfig = {
      horizon: 'day_ahead',
      hoursAhead: 24,
      modelPreference: 'auto',
      weatherRequired: false,
      conformalCalibration: Array.from({ length: 20 }, (_, i) => 100 + i * 5),
    };
    const result = dispatchHorizonForecast(config, {
      historicalDemand: makeHistoricalDemand(168),
    });

    expect(result.conformalInterval).toBeDefined();
    expect(result.conformalInterval!.lower).toHaveLength(24);
    expect(result.conformalInterval!.upper).toHaveLength(24);
  });

  it('does not generate conformal intervals when calibration data <= 10', () => {
    const config: HorizonConfig = {
      horizon: 'day_ahead',
      hoursAhead: 24,
      modelPreference: 'auto',
      weatherRequired: false,
      conformalCalibration: [1, 2, 3, 4, 5],
    };
    const result = dispatchHorizonForecast(config, {
      historicalDemand: makeHistoricalDemand(168),
    });

    expect(result.conformalInterval).toBeUndefined();
  });

  it('uses specified model when modelPreference is not auto', () => {
    const config: HorizonConfig = {
      horizon: 'day_ahead',
      hoursAhead: 24,
      modelPreference: 'lgbm',
      weatherRequired: false,
    };
    const result = dispatchHorizonForecast(config, {
      historicalDemand: makeHistoricalDemand(168),
    });

    expect(result.modelUsed).toBe('lgbm');
    expect(result.metadata.modelRationale).toContain('lgbm');
  });

  it('sets weatherUsed to false when weather is required but not provided', () => {
    const config: HorizonConfig = {
      horizon: 'day_ahead',
      hoursAhead: 24,
      modelPreference: 'auto',
      weatherRequired: true,
    };
    const result = dispatchHorizonForecast(config, {
      historicalDemand: makeHistoricalDemand(168),
    });

    expect(result.metadata.weatherUsed).toBe(false);
  });

  it('includes modelRationale in metadata', () => {
    const config: HorizonConfig = {
      horizon: 'day_ahead',
      hoursAhead: 24,
      modelPreference: 'auto',
      weatherRequired: false,
    };
    const result = dispatchHorizonForecast(config, {
      historicalDemand: makeHistoricalDemand(168),
    });

    expect(result.metadata.modelRationale).toContain('Day-ahead');
    expect(result.metadata.hoursAhead).toBe(24);
  });
});
