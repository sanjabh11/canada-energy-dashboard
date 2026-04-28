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
    expect(forecastPackage.scenario_matrix.base.label).toBe('expected');
    expect(forecastPackage.oeb_rows).toHaveLength(5);
    expect(forecastPackage.reliability_proxy.horizon_scores).toHaveLength(10);
    expect(forecastPackage.profiles_8760[0]?.points).toHaveLength(8760);
    expect(forecastPackage.regulatory_exports.ontario.scenario_matrix_rows.length).toBeGreaterThan(0);
    expect(forecastPackage.input_provenance_summary.live_surfaces.length).toBeGreaterThan(0);
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
      sourceKind: 'green_button_cmd',
    });

    const csv = utilityForecastPackageToCsv(forecastPackage);

    expect(forecastPackage.summary.granularity).toBe('monthly');
    expect(csv).toContain('# Utility Demand Forecast Package');
    expect(csv).toContain('reliability_proxy_horizon');
    expect(csv).toContain('live_surface_source');
    expect(csv).toContain('expected');
    expect(forecastPackage.input_provenance_summary.source_kind).toBe('green_button_cmd');
  });

  it('exports Alberta planning summaries with horizon rows', () => {
    const forecastPackage = buildUtilityForecastPackage({
      rows: generateUtilityLoadSampleRows('Alberta', 'hourly'),
      scenario: buildScenario('Alberta'),
      sourceLabel: 'alberta-starter.csv',
      isSampleData: false,
    });

    const csv = utilityForecastPackageToAlbertaCsv(forecastPackage);

    expect(csv).toContain('# Alberta Distribution Plan Data Schedule');
    expect(csv).toContain('horizon_year,geography_id,geography_level');
    expect(csv).toContain('AB-FEEDER');
  });

  it('falls back to simple benchmark metrics when holdout backtesting cannot train safely on the available hourly window', () => {
    const sampleRows = generateUtilityLoadSampleRows('Ontario', 'hourly');
    const reference = sampleRows[0];
    const rows = sampleRows
      .filter((row) => row.geography_id === reference.geography_id && row.customer_class === reference.customer_class)
      .slice(0, 24 * 14);

    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'ontario-14-day-window.csv',
      isSampleData: false,
    });

    expect(forecastPackage.benchmark.sample_size).toBeGreaterThan(0);
    expect(forecastPackage.warnings).toContain('Benchmark backtest fallback applied: Insufficient data for backtesting.');
  });

  it('applies gross-load reconstitution when the input provides gross demand above net demand', () => {
    const customCsv = [
      'timestamp,geography_level,geography_id,customer_class,demand_mw,net_load_mw,gross_load_mw,customer_count',
      '2025-01-01T00:00:00.000Z,feeder,ON-FEEDER-9,residential,10,10,12,1500',
      '2025-01-01T01:00:00.000Z,feeder,ON-FEEDER-9,residential,10.2,10.2,12.1,1500',
      '2025-01-01T02:00:00.000Z,feeder,ON-FEEDER-9,residential,10.4,10.4,12.3,1500',
    ].join('\n');
    const parsed = parseUtilityHistoricalLoadCsv(customCsv);
    const forecastPackage = buildUtilityForecastPackage({
      rows: parsed.rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'gross-test.csv',
      isSampleData: false,
    });

    expect(forecastPackage.input_provenance_summary.gross_reconstitution_applied).toBe(true);
    expect(forecastPackage.input_provenance_summary.quality_counts.some((entry) => entry.flag === 'gross_reconstituted' && entry.count > 0)).toBe(true);
  });
});
