import { describe, expect, it } from 'vitest';
import {
  buildUtilityForecastPackage,
  buildUtilityStarterCsv,
  generateUtilityLoadSampleRows,
  parseUtilityHistoricalLoadCsv,
  utilityForecastPackageToAlbertaCsv,
  utilityForecastPackageToCsv,
  type UtilityPlanningScenario,
} from '../../src/lib/utilityForecasting';

function buildScenario(jurisdiction: 'Ontario' | 'Alberta'): UtilityPlanningScenario {
  return {
    jurisdiction,
    planning_horizon_years: [1, 5, 10],
    weather_case: 'median',
    annual_load_growth_pct: jurisdiction === 'Ontario' ? 1.4 : 1.7,
    committed_load_mw: 4,
    ev_growth_mw: 3,
    heat_pump_growth_mw: 2,
    der_offset_mw: 1.5,
    demand_response_reduction_mw: 1,
    demand_response_shift_pct: 4,
    capacity_buffer_pct: 18,
  };
}

describe('utilityForecasting', () => {
  it('parses starter CSV content into normalized utility rows', () => {
    const csv = buildUtilityStarterCsv('Ontario', 'hourly');
    const parsed = parseUtilityHistoricalLoadCsv(csv);

    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.length).toBeGreaterThan(500);
    expect(parsed.rows[0].geography_level).toBe('feeder');
    expect(parsed.rows[0].customer_class.length).toBeGreaterThan(0);
  });

  it('builds an Ontario utility forecast package with benchmark proof and OEB rows', () => {
    const forecastPackage = buildUtilityForecastPackage({
      rows: generateUtilityLoadSampleRows('Ontario', 'hourly'),
      scenario: buildScenario('Ontario'),
      sourceLabel: 'ontario-starter.csv',
      isSampleData: true,
    });

    expect(forecastPackage.summary.granularity).toBe('hourly');
    expect(forecastPackage.benchmark.sample_size).toBeGreaterThan(0);
    expect(forecastPackage.cases.expected.yearly).toHaveLength(10);
    expect(forecastPackage.oeb_rows).toHaveLength(5);
    expect(forecastPackage.assumptions.length).toBeGreaterThanOrEqual(4);
  });

  it('reconciles geography allocations back to the expected peak by highlighted horizon', () => {
    const forecastPackage = buildUtilityForecastPackage({
      rows: generateUtilityLoadSampleRows('Alberta', 'hourly'),
      scenario: buildScenario('Alberta'),
      sourceLabel: 'alberta-starter.csv',
      isSampleData: true,
    });

    forecastPackage.highlighted_years.forEach((year) => {
      const expectedPeak = forecastPackage.cases.expected.yearly.find((row) => row.year === year)?.peak_demand_mw ?? 0;
      const allocationPeak = forecastPackage.geography_allocations
        .filter((allocation) => allocation.horizon_year === year)
        .reduce((sum, allocation) => sum + allocation.peak_demand_mw, 0);

      expect(allocationPeak).toBeCloseTo(expectedPeak, 1);
    });
  });

  it('supports monthly planning inputs and exports a generic package csv', () => {
    const forecastPackage = buildUtilityForecastPackage({
      rows: generateUtilityLoadSampleRows('Ontario', 'monthly'),
      scenario: buildScenario('Ontario'),
      sourceLabel: 'ontario-monthly.csv',
      isSampleData: false,
    });

    const csv = utilityForecastPackageToCsv(forecastPackage);

    expect(forecastPackage.summary.granularity).toBe('monthly');
    expect(csv).toContain('# Utility Demand Forecast Package');
    expect(csv).toContain('expected');
  });

  it('exports Alberta planning summaries with horizon rows', () => {
    const forecastPackage = buildUtilityForecastPackage({
      rows: generateUtilityLoadSampleRows('Alberta', 'hourly'),
      scenario: buildScenario('Alberta'),
      sourceLabel: 'alberta-starter.csv',
      isSampleData: false,
    });

    const csv = utilityForecastPackageToAlbertaCsv(forecastPackage);

    expect(csv).toContain('# Alberta Utility Planning Summary');
    expect(csv).toContain('1y');
    expect(csv).toContain('10y');
  });
});
