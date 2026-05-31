import { describe, expect, it } from 'vitest';
import {
  buildForecastBenchmarkFailureNotes,
  buildOntarioPublicUtilitySampleCsv,
  buildOntarioPublicUtilitySampleManifestMarkdown,
  buildUtilityForecastPackage,
  buildUtilityStarterCsv,
  generateOntarioPublicUtilitySampleRows,
  generateUtilityLoadSampleRows,
  ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST,
  parseIesoPublicDemandCsv,
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

  it('publishes a public-derived Ontario system sample with a provenance manifest', () => {
    const rows = generateOntarioPublicUtilitySampleRows();
    const csv = buildOntarioPublicUtilitySampleCsv();
    const manifest = buildOntarioPublicUtilitySampleManifestMarkdown();
    const parsed = parseUtilityHistoricalLoadCsv(csv);

    expect(rows.length).toBeGreaterThan(24 * 21);
    expect(rows[0].source_system).toBe(ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.id);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0].geography_level).toBe('system');
    expect(manifest).toContain(ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.source_url);
    expect(manifest).toContain(ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.source_file);
    expect(manifest).toContain('customer LDC history');
    expect(manifest).toContain('Transform version');

    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.label,
      isSampleData: false,
      sourceKind: 'public_system_sample',
    });

    expect(forecastPackage.input_provenance_summary.source_kind).toBe('public_system_sample');
    expect(forecastPackage.source_manifest.id).toBe(ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.id);
    expect(forecastPackage.source_manifest.hash).toMatch(/^fnv1a-/);
    expect(forecastPackage.warnings).toContain('Public-derived Ontario system sample is workflow proof only; it is not customer LDC history or production utility telemetry.');
    expect(forecastPackage.assumptions.some((assumption) => assumption.includes(ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.id))).toBe(true);
  });

  it('parses raw IESO public demand CSV rows into public-system forecast inputs', () => {
    const rawIesoCsv = [
      'Created,2026-05-29 07:31',
      'Date,Hour,Market Demand,Ontario Demand',
      '2026-01-01,1,16320,14520',
      '2026-01-01,2,15840,14010',
      '2026-01-01,24,17100,15175',
    ].join('\n');

    const parsed = parseIesoPublicDemandCsv(rawIesoCsv);
    const genericParsed = parseUtilityHistoricalLoadCsv(rawIesoCsv);

    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows[0]).toMatchObject({
      timestamp: '2026-01-01T00:00:00.000Z',
      geography_level: 'system',
      geography_id: 'IESO-ONTARIO-SYSTEM',
      demand_mw: 14520,
      gross_load_mw: 16320,
      source_system: ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.id,
    });
    expect(parsed.rows[2].timestamp).toBe('2026-01-01T23:00:00.000Z');
    expect(genericParsed.rows).toEqual(parsed.rows);
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
    expect(forecastPackage.evidence_report.rolling_origin_splits.length).toBeGreaterThan(0);
    expect(forecastPackage.evidence_report.validation_method).toBe('rolling_origin_cv');
    expect(forecastPackage.evidence_report.champion_challenger.champion).toBe('transparent_trend_seasonal');
    expect(forecastPackage.evidence_report.benchmark_failure_notes[0]).toContain('Baseline win: persistence baseline');
    expect(forecastPackage.warnings).toContain(forecastPackage.evidence_report.benchmark_failure_notes[0]);
    expect(forecastPackage.cases.expected.yearly).toHaveLength(10);
    expect(forecastPackage.scenario_matrix.base.label).toBe('expected');
    expect(forecastPackage.oeb_rows).toHaveLength(5);
    expect(forecastPackage.reliability_proxy.horizon_scores).toHaveLength(10);
    expect(forecastPackage.profiles_8760[0]?.points).toHaveLength(8760);
    expect(new Set(forecastPackage.profiles_8760.map((profile) => profile.case_label))).toEqual(new Set(['expected']));
    expect(forecastPackage.assumptions).toContain('8,760-hour profile previews are generated for the expected case only; low and high cases remain annual scenario rows unless a full grid-planning export is added.');
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
    expect(csv).toContain('# Source Kind: green_button_cmd');
    expect(csv).toContain('benchmark_metric,value');
    expect(csv).toContain('# Source Manifest:');
    expect(csv).toContain('rolling_split,train_start,train_end');
    expect(csv).toContain('mean_interval_score_mw');
    expect(csv).toContain('evidence_metric,value');
    expect(csv).toContain('benchmark_failure_note_count');
    expect(csv).toContain('benchmark_failure_note');
    expect(csv).toContain('mae,');
    expect(csv).toContain('persistence_mae,');
    expect(csv).toContain('seasonal_naive_mae,');
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

  it('emits a buyer-visible failure note when a naive baseline wins', () => {
    const notes = buildForecastBenchmarkFailureNotes({
      mae: 12,
      mape: 4,
      rmse: 15,
      persistence_mae: 7,
      persistence_mape: 2,
      persistence_rmse: 9,
      seasonal_naive_mae: 8,
      seasonal_naive_mape: 3,
      seasonal_naive_rmse: 10,
      skill_score_vs_persistence: -71.43,
      skill_score_vs_seasonal: -50,
      r_squared: 0.2,
      sample_size: 72,
    });

    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain('Baseline win: persistence baseline MAE 7.00 MW');
    expect(notes[0]).toContain('accuracy uplift as unproven');
    expect(notes[0]).toContain('buyer-facing accuracy claims');
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
