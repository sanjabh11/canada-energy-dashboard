import { describe, expect, it } from 'vitest';
import { forecastEvChargingLoad } from '../../src/lib/evChargingForecast';
import { estimateProsumerFlexibilityMcdCp } from '../../src/lib/advancedForecasting';
import { aggregateFleetForecastWithCopula } from '../../src/lib/uncertaintyEngine';

describe('forecast coverage semantics', () => {
  it('labels EV forecast intervals as targets and training metrics as in-sample', () => {
    const station = {
      id: 'station-1',
      name: 'Sample station',
      latitude: 43.7,
      longitude: -79.4,
      powerKw: 50,
      connectorType: 'level2' as const,
      nPorts: 4,
      region: 'Ontario',
    };
    const historicalRecords = Array.from({ length: 200 }, (_, index) => ({
      stationId: station.id,
      timestamp: new Date(Date.UTC(2026, 0, 1) + index * 3_600_000).toISOString(),
      energyKwh: 10 + (index % 8),
      sessionCount: 3,
      occupancyPct: 0.4,
    }));
    const forecast = forecastEvChargingLoad({
      stations: [station],
      historicalRecords,
      horizonHours: 2,
      model: 'seasonal_naive',
    });

    expect(forecast.forecasts).toHaveLength(2);
    expect(forecast.forecasts[0]).toHaveProperty('targetCoverageRate', 0.9);
    expect(forecast.forecasts[0]).toHaveProperty('intervalLower');
    expect(forecast.metrics).toMatchObject({ targetCoverageRate: 0.9, scope: 'training_in_sample' });
    expect(forecast.metadata.intervalEvidence).toBe('target_only');
    expect(forecast.metadata.methodology).toContain('not measured coverage');
  });

  it('labels simulated prosumer intervals as target-only', () => {
    const result = estimateProsumerFlexibilityMcdCp({
      facilityLoadMw: 10,
      onSiteGenerationMw: 2,
      batteryCapacityMwh: 20,
      batteryPowerMw: 5,
      batterySocPct: 50,
      priceForecastCadPerMwh: 80,
      priceLowerCadPerMwh: 60,
      priceUpperCadPerMwh: 100,
      flexibilityPct: 0.2,
      nDropoutSamples: 20,
    });

    expect(result.targetCoverageRate).toBe(0.9);
    expect(result.intervalLowerMw).toBeLessThanOrEqual(result.intervalUpperMw);
    expect(result.metadata.intervalEvidence).toBe('target_only');
    expect(result.metadata.methodology).toContain('no observed holdout data');
  });

  it('does not report a measured target for an empty fleet forecast', () => {
    const result = aggregateFleetForecastWithCopula({
      fleetId: 'empty-fleet',
      siteForecasts: [],
      copula: { type: 'independence' },
    });

    expect(result.targetCoverageRate).toBeNull();
    expect(result.coverageEvidenceStatus).toBe('no_forecast');
    expect(result.metadata.historicalCoverageInput).toBeNull();
  });
});
