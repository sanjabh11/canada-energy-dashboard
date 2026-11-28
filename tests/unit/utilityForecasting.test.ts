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
import type { UtilityHistoricalLoadRow } from '../../src/lib/types/utilityForecasting';
import { calculateSeasonalNaiveBaseline } from '../../src/lib/forecastBaselines';

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

  it('publishes a synthetic Ontario system-demand fixture with a provenance manifest', () => {
    const rows = generateOntarioPublicUtilitySampleRows();
    const csv = buildOntarioPublicUtilitySampleCsv();
    const manifest = buildOntarioPublicUtilitySampleManifestMarkdown();
    const parsed = parseUtilityHistoricalLoadCsv(csv);

    expect(rows.length).toBeGreaterThan(24 * 21);
    expect(rows[0].source_system).toBe('ceip-synthetic-ieso-public-system-fixture-v1');
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0].geography_level).toBe('system');
    expect(manifest).toContain(ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.source_url);
    expect(manifest).toContain('Referenced source file');
    expect(manifest).toContain('customer LDC history');
    expect(manifest).toContain('Bundled fixture transform version');
    expect(manifest).toContain('not downloaded, transformed, or validated against the referenced IESO CSV');

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
    expect(forecastPackage.source_manifest.fetchedAt).toBeNull();
    expect(forecastPackage.source_manifest.isSyntheticFixture).toBe(true);
    expect(forecastPackage.source_manifest.sourceFile).toContain('bundled-synthetic-fixture:');
    expect(forecastPackage.source_manifest.sourceAttribution).toContain('Synthetic CEIP fixture');
    expect(forecastPackage.source_manifest.sourceTermsUrl).toBe('https://www.ieso.ca/terms-of-use');
    expect(csv).toContain('Synthetic CEIP fixture');
    expect(csv).toContain('# Reference terms (for separately imported IESO material; not a license determination for this fixture)');
    expect(forecastPackage.warnings.some((warning) => warning.includes('Synthetic Ontario system-demand fixture is generated locally'))).toBe(true);
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

    const forecastPackage = buildUtilityForecastPackage({
      rows: parsed.rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.source_file,
      sourceKind: 'public_system_sample',
    });
    expect(forecastPackage.source_manifest.isSyntheticFixture).toBe(false);
    expect(forecastPackage.source_manifest.sourceFile).toBe(ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.source_file);
    expect(forecastPackage.source_manifest.transformVersion).toBe('ieso-apo-derived-transform-v1');
    expect(forecastPackage.source_manifest.sourceAttribution).toContain('Independent Electricity System Operator');
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
    expect(forecastPackage.evidence_report.benchmark_failure_notes).toEqual([]);
    expect(forecastPackage.evidence_report.interval_status).toBe('measured');
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

  it('scores empirical interval coverage on untouched test data and baselines on the test window only', () => {
    const rows: UtilityHistoricalLoadRow[] = Array.from({ length: 600 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2025, 0, 1) + index * 3_600_000).toISOString(),
      geography_level: 'feeder',
      geography_id: 'STEP-F1',
      customer_class: 'general',
      demand_mw: index < 576 ? 100 : 500,
      gross_load_mw: index < 576 ? 100 : 500,
      source_system: 'step-fixture',
    }));

    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'step-series.csv',
      isSampleData: true,
      sourceKind: 'uploaded_historical',
    });

    const splits = forecastPackage.evidence_report.rolling_origin_splits;
    expect(splits.length).toBeGreaterThan(0);
    const lastSplit = splits[splits.length - 1];
    expect(lastSplit.test_count).toBe(24);
    expect(lastSplit.interval_coverage_pct).toBeLessThan(50);
    expect(lastSplit.persistence_mae).toBeGreaterThan(10);
    expect(forecastPackage.evidence_report.empirical_interval_coverage_pct).not.toBeNull();
    expect(forecastPackage.evidence_report.empirical_interval_coverage_pct!).toBeLessThan(91.67);
    expect(forecastPackage.evidence_report.interval_measured_split_count).toBe(3);
    expect(forecastPackage.evidence_report.interval_calibration_sample_count).toBe(216);
    expect(forecastPackage.evidence_report.interval_calibration_sample_uses).toBe(504);
    expect(forecastPackage.evidence_report.interval_test_sample_count).toBe(72);
    expect(forecastPackage.evidence_report.interval_method_note).toContain('calibration windows overlap across folds');
  });

  it('keeps a perfect zero-error baseline as a challenger without inventing skill', () => {
    const rows: UtilityHistoricalLoadRow[] = Array.from({ length: 600 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2025, 0, 1) + index * 3_600_000).toISOString(),
      geography_level: 'feeder',
      geography_id: 'FLAT-F1',
      customer_class: 'general',
      demand_mw: 100,
      gross_load_mw: 100,
    }));

    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'flat-baseline.csv',
      sourceKind: 'uploaded_historical',
    });

    expect(forecastPackage.benchmark.persistence_mae).toBe(0);
    expect(Number.isNaN(forecastPackage.benchmark.skill_score_vs_persistence)).toBe(true);
    expect(forecastPackage.evidence_report.champion_challenger.challenger).toBe('persistence');
    expect(forecastPackage.evidence_report.champion_challenger.decision_reason).toContain(
      'zero holdout MAE',
    );
  });

  it('aligns rolling seasonal-naive phase after a non-period calibration tail', () => {
    const rows: UtilityHistoricalLoadRow[] = Array.from({ length: 408 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2025, 0, 1) + index * 3_600_000).toISOString(),
      geography_level: 'feeder',
      geography_id: 'PHASE-F1',
      customer_class: 'general',
      demand_mw: 100 + index,
      gross_load_mw: 100 + index,
      source_system: 'seasonal-phase-fixture',
    }));
    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'seasonal-phase.csv',
      sourceKind: 'uploaded_historical',
    });
    const lastSplit = forecastPackage.evidence_report.rolling_origin_splits.at(-1);
    const fitValues = rows.slice(0, 256).map((row) => row.demand_mw);
    const expectedPredictions = Array.from({ length: 24 }, (_, index) =>
      fitValues[fitValues.length - 24 + ((128 + index) % 24)],
    );
    const actuals = rows.slice(384).map((row) => row.demand_mw);
    const expectedMae = actuals.reduce(
      (sum, actual, index) => sum + Math.abs(actual - expectedPredictions[index]),
      0,
    ) / actuals.length;

    expect(lastSplit?.train_count).toBe(256);
    expect(lastSplit?.calibration_count).toBe(128);
    expect(lastSplit?.seasonal_naive_mae).toBeCloseTo(expectedMae, 2);
  });

  it('uses the measured system level instead of summing parent and child rows', () => {
    const rows: UtilityHistoricalLoadRow[] = Array.from({ length: 48 }, (_, index) => {
      const timestamp = new Date(Date.UTC(2025, 0, 1) + index * 3_600_000).toISOString();
      const common = { timestamp, customer_class: 'general', source_system: 'hierarchy-fixture' };
      return [
        { ...common, geography_level: 'system' as const, geography_id: 'SYSTEM', demand_mw: 1_000, gross_load_mw: 1_000, customer_count: 100 },
        { ...common, geography_level: 'feeder' as const, geography_id: 'F1', demand_mw: 400, gross_load_mw: 400, customer_count: 40 },
        { ...common, geography_level: 'feeder' as const, geography_id: 'F2', demand_mw: 600, gross_load_mw: 600, customer_count: 60 },
      ];
    }).flat();

    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'mixed-hierarchy.csv',
      sourceKind: 'uploaded_historical',
    });

    expect(forecastPackage.summary.row_count).toBe(144);
    expect(forecastPackage.summary.baseline_peak_mw).toBe(1_000);
    expect(forecastPackage.summary.baseline_energy_gwh).toBe(48);
    expect(forecastPackage.evidence_report.hierarchy_reconciliation.status).toBe('reconciled');
    expect(forecastPackage.evidence_report.hierarchy_completeness_scope).toBe('complete_system');
    // A measured system series is preferred over child levels: it answers the
    // total directly and cannot silently omit a wholly absent child entity.
    expect(forecastPackage.geography_allocations.every((row) => row.geography_level === 'system')).toBe(true);
    expect(forecastPackage.summary.geography_count).toBe(1);
    expect(forecastPackage.summary.geographies).toEqual(['SYSTEM']);
    expect(forecastPackage.warnings.some((warning) => warning.includes('complete system geography/customer-class grid'))).toBe(true);
  });

  it('uses a complete parent series when child geography intervals are missing', () => {
    const rows: UtilityHistoricalLoadRow[] = Array.from({ length: 48 }, (_, index) => {
      const timestamp = new Date(Date.UTC(2025, 0, 1) + index * 3_600_000).toISOString();
      const common = { timestamp, customer_class: 'general', source_system: 'partial-hierarchy-fixture' };
      return [
        { ...common, geography_level: 'system' as const, geography_id: 'SYSTEM', demand_mw: 1_000, gross_load_mw: 1_000 },
        { ...common, geography_level: 'feeder' as const, geography_id: 'F1', demand_mw: 400, gross_load_mw: 400 },
        ...(index % 2 === 0
          ? [{ ...common, geography_level: 'feeder' as const, geography_id: 'F2', demand_mw: 600, gross_load_mw: 600 }]
          : []),
      ];
    }).flat();

    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'partial-hierarchy.csv',
      sourceKind: 'uploaded_historical',
    });

    expect(forecastPackage.summary.baseline_peak_mw).toBe(1_000);
    expect(forecastPackage.summary.geographies).toEqual(['SYSTEM']);
    expect(forecastPackage.evidence_report.hierarchy_completeness_scope).toBe('complete_system');
    expect(forecastPackage.geography_allocations.every((row) => row.geography_id === 'SYSTEM')).toBe(true);
    expect(forecastPackage.warnings.some((warning) => warning.includes('complete system geography/customer-class grid'))).toBe(true);
  });

  it('scores 24-step rolling and 72-step holdout baselines from the same fixed training origin', () => {
    const rows: UtilityHistoricalLoadRow[] = Array.from({ length: 600 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2025, 0, 1) + index * 3_600_000).toISOString(),
      geography_level: 'feeder',
      geography_id: 'ORIGIN-F1',
      customer_class: 'general',
      demand_mw: index < 528 ? 100 + (index % 24) : index < 576 ? 500 : 1000,
      gross_load_mw: index < 528 ? 100 + (index % 24) : index < 576 ? 500 : 1000,
      source_system: 'fixed-origin-fixture',
    }));

    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'fixed-origin.csv',
      isSampleData: false,
      sourceKind: 'uploaded_historical',
    });
    const holdoutTrain = rows.slice(0, 528).map((row) => row.demand_mw);
    const holdoutActuals = rows.slice(528).map((row) => row.demand_mw);
    const holdoutSeason = holdoutTrain.slice(-24);
    const expectedPersistenceMae = holdoutActuals.reduce(
      (sum, actual) => sum + Math.abs(actual - holdoutTrain[holdoutTrain.length - 1]),
      0,
    ) / holdoutActuals.length;
    const expectedSeasonalMae = holdoutActuals.reduce(
      (sum, actual, index) => sum + Math.abs(actual - holdoutSeason[index % 24]),
      0,
    ) / holdoutActuals.length;

    expect(forecastPackage.benchmark.sample_size).toBe(72);
    expect(forecastPackage.benchmark.persistence_mae).toBeCloseTo(expectedPersistenceMae, 2);
    expect(forecastPackage.benchmark.seasonal_naive_mae).toBeCloseTo(expectedSeasonalMae, 2);

    const lastRollingSplit = forecastPackage.evidence_report.rolling_origin_splits.at(-1);
    expect(lastRollingSplit?.test_count).toBe(24);
    expect(lastRollingSplit?.train_count).toBe(408);
    expect(lastRollingSplit?.calibration_count).toBe(168);
    expect(lastRollingSplit?.persistence_mae).toBeCloseTo(1000 - 123, 2);
    expect(lastRollingSplit?.seasonal_naive_mae).toBeCloseTo(1000 - 111.5, 2);
  });

  it('reports interval evidence as unavailable when history cannot support rolling calibration', () => {
    const rows: UtilityHistoricalLoadRow[] = Array.from({ length: 48 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2025, 0, 1) + index * 3_600_000).toISOString(),
      geography_level: 'feeder',
      geography_id: 'SHORT-F1',
      customer_class: 'general',
      demand_mw: 100 + index,
      gross_load_mw: 100 + index,
      source_system: 'short-history-fixture',
    }));
    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'short-history.csv',
      isSampleData: false,
      sourceKind: 'uploaded_historical',
    });
    const csv = utilityForecastPackageToCsv(forecastPackage);

    expect(forecastPackage.evidence_report.interval_status).toBe('insufficient_history');
    expect(forecastPackage.evidence_report.empirical_interval_coverage_pct).toBeNull();
    expect(forecastPackage.evidence_report.mean_interval_width_mw).toBeNull();
    expect(csv).toContain('interval_evidence_status,insufficient_history');
    expect(csv).toContain('empirical_interval_coverage_pct,not_available');
  });

  it('aligns seasonal naive one-step targets to the matching prior season index', () => {
    const metrics = calculateSeasonalNaiveBaseline([1, 2, 3, 4, 5, 6], 1, 3);

    expect(metrics.mae).toBe(3);
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
      sourceTrust: {
        owner_bound: true,
        freshness_status: 'live',
        fetched_at: '2026-08-20T12:00:00.000Z',
        observed_at: '2026-08-20T11:00:00.000Z',
      },
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

  it('refuses Green Button forecast packages without owner-bound live read proof', () => {
    expect(() => buildUtilityForecastPackage({
      rows: generateUtilityLoadSampleRows('Ontario', 'hourly'),
      scenario: buildScenario('Ontario'),
      sourceLabel: 'unbound-green-button-history',
      isSampleData: false,
      sourceKind: 'green_button_cmd',
    })).toThrow('owner-bound live read proof');
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

describe('utility forecast time-axis validity', () => {
  function makeRows(intervalMs: number, length = 48): UtilityHistoricalLoadRow[] {
    return Array.from({ length }, (_, index) => ({
      timestamp: new Date(Date.UTC(2025, 0, 1) + index * intervalMs).toISOString(),
      geography_level: 'system',
      geography_id: 'SYSTEM',
      customer_class: 'general',
      demand_mw: 100 + index,
    }));
  }

  it('keeps regular hourly data eligible for measured evidence', () => {
    const forecastPackage = buildUtilityForecastPackage({
      rows: makeRows(3_600_000),
      scenario: buildScenario('Ontario'),
      sourceLabel: 'hourly-regular.csv',
    });

    expect(forecastPackage.evidence_report.time_axis_status).toBe('regular_hourly');
    expect(forecastPackage.evidence_report.baseline_status).not.toBe('unsupported_time_axis');
    expect(Number.isFinite(forecastPackage.summary.baseline_energy_gwh)).toBe(true);
  });

  it('marks daily cadence as exploratory and suppresses time-based benchmark and energy values', () => {
    const forecastPackage = buildUtilityForecastPackage({
      rows: makeRows(24 * 3_600_000),
      scenario: buildScenario('Ontario'),
      sourceLabel: 'daily.csv',
    });

    expect(forecastPackage.evidence_report.time_axis_status).toBe('unsupported');
    expect(forecastPackage.evidence_report.baseline_status).toBe('unsupported_time_axis');
    expect(forecastPackage.evidence_report.interval_status).toBe('unsupported_time_axis');
    expect(forecastPackage.evidence_report.rolling_origin_splits).toHaveLength(0);
    expect(Number.isNaN(forecastPackage.benchmark.mae)).toBe(true);
    expect(Number.isNaN(forecastPackage.summary.baseline_energy_gwh)).toBe(true);
    expect(Number.isNaN(forecastPackage.cases.expected.yearly[0].annual_energy_gwh)).toBe(true);
  });

  it('accepts consecutive monthly timestamps as monthly cadence', () => {
    const rows = Array.from({ length: 24 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2023, index, 1)).toISOString(),
      geography_level: 'system' as const,
      geography_id: 'SYSTEM',
      customer_class: 'general',
      demand_mw: 100 + index,
    }));
    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'monthly-regular.csv',
    });

    expect(forecastPackage.evidence_report.time_axis_status).toBe('regular_monthly');
    expect(Number.isFinite(forecastPackage.summary.baseline_energy_gwh)).toBe(true);
  });
});
