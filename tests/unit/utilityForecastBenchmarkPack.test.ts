import { describe, expect, it } from 'vitest';
import {
  buildBenchmarkScenario,
  buildUtilityMultiDatasetBenchmarkPack,
  buildUtilityForecastTrustRetainedEvidenceExtract,
  householdDemandRecordsToUtilityRows,
  ontarioDemandRecordsToUtilityRows,
  utilityMultiDatasetBenchmarkPackToCsv,
  utilityMultiDatasetBenchmarkPackToMarkdown,
  type PublicHouseholdDemandRecord,
  type PublicOntarioDemandRecord,
} from '../../src/lib/utilityForecastBenchmarkPack';
import { generateOntarioPublicUtilitySampleRows } from '../../src/lib/utilityForecasting';
import type { UtilityHistoricalLoadRow } from '../../src/lib/types/utilityForecasting';

describe('utilityForecastBenchmarkPack', () => {
  it('builds a multi-dataset benchmark pack without buyer-specific accuracy claims', () => {
    const pack = buildUtilityMultiDatasetBenchmarkPack([
      {
        dataset_id: 'ieso-public-system-sample',
        label: 'IESO public system sample',
        jurisdiction: 'Ontario',
        source_scope: 'public_system_sample',
        source_kind: 'public_system_sample',
        rows: generateOntarioPublicUtilitySampleRows(),
        scenario: buildBenchmarkScenario('Ontario'),
      },
      {
        dataset_id: 'ontario-public-demand-sample',
        label: 'Ontario public demand sample',
        jurisdiction: 'Ontario',
        source_scope: 'public_benchmark_sample',
        source_kind: 'public_enrichment',
        rows: ontarioDemandRecordsToUtilityRows(buildOntarioDemandRecords()),
        scenario: buildBenchmarkScenario('Ontario'),
      },
    ], '2026-05-31T00:00:00.000Z');

    const markdown = utilityMultiDatasetBenchmarkPackToMarkdown(pack);
    const csv = utilityMultiDatasetBenchmarkPackToCsv(pack);

    expect(pack.version).toBe('utility-multi-dataset-benchmark-v6');
    expect(pack.dataset_count).toBe(2);
    expect(pack.buyer_specific_accuracy_claim).toBe(false);
    expect(pack.datasets.every((dataset) => dataset.sample_size > 0)).toBe(true);
    expect(pack.datasets.every((dataset) => dataset.rolling_origin_split_count >= 3)).toBe(true);
    expect(pack.datasets.every((dataset) => dataset.scientific_diagnostics.seasonal_mase > 0)).toBe(true);
    expect(pack.datasets.every((dataset) => dataset.scientific_diagnostics.interval_nominal_coverage_pct === 90)).toBe(true);
    expect(pack.datasets.every((dataset) => dataset.scientific_diagnostics.mean_interval_score_mw > 0)).toBe(true);
    expect(pack.datasets.every((dataset) => dataset.scientific_diagnostics.interval_score_to_mae_ratio > 0)).toBe(true);
    expect(pack.datasets[0].scientific_diagnostics.notes.join(' ')).toContain('same hierarchy-selected, normalized series');
    expect(pack.datasets[0].scientific_diagnostics.notes.join(' ')).toContain('Mean interval score');
    expect(pack.aggregate.mean_best_naive_scaled_mae).toBeGreaterThan(0);
    expect(pack.aggregate.mean_interval_score_mw).toBeGreaterThan(0);
    expect(pack.aggregate.mean_interval_score_to_mae_ratio).toBeGreaterThan(0);
    expect(pack.aggregate.maximum_interval_calibration_gap_pct).toBeGreaterThanOrEqual(0);
    expect(pack.evaluation_results).toBeDefined();
    expect(pack.evaluation_results.length).toBeGreaterThan(0);
    expect(pack.evaluation_results[0].modelName).toBe('transparent_trend_seasonal');
    expect(pack.evaluation_results[0].modelClass).toBe('seasonal_decomposition');
    expect(pack.datasets[0].holdout_horizon).toBe('72h');
    // v6: per-fold test-window steps are reported separately from the
    // one-based forecast lead range measured at each fold's fit origin.
    expect(pack.datasets[0].interval_validation_folds).toHaveLength(3);
    expect(pack.datasets[0].interval_validation_folds[0]).toMatchObject({
      test_window_steps: 24,
      forecast_lead_start: 169,
      forecast_lead_end: 192,
    });
    expect(
      pack.datasets[0].interval_validation_folds.every(
        (fold) => fold.forecast_lead_end - fold.forecast_lead_start + 1 === fold.test_window_steps,
      ),
    ).toBe(true);
    expect(pack.evaluation_results[0].horizon).toBe('72h');
    expect(pack.evaluation_results[0].metrics.coverage_rate).toBeUndefined();
    expect(pack.evaluation_results[0].metrics.mae).toBeGreaterThan(0);
    expect(pack.evaluation_results[0].metrics.mape).toBeGreaterThan(0);
    expect(pack.evaluation_results[0].rollingOriginFolds).toBe(0);
    expect(pack.evaluation_results[0].passedThresholds).toBe(false);
    expect(pack.evaluation_results[0].failedThresholds.join(' ')).toContain('metrics are descriptive only');
    expect(pack.methodology_references.map((reference) => reference.label).join(' ')).toContain('Hyndman');
    expect(pack.methodology_references.map((reference) => reference.use).join(' ')).toContain('central 90% interval score');
    expect(pack.datasets[0].benchmark_failure_notes[0]).toContain('Baseline win:');
    expect(markdown).toContain('Buyer-specific accuracy claim: no');
    expect(markdown).toContain('Mean seasonal MASE');
    expect(markdown).toContain('Mean empirical 90% interval score');
    expect(markdown).toContain('Primary holdout horizon: 72h');
    expect(markdown).toContain('interval validation: 24-step test windows at forecast leads 169-192');
    expect(markdown).toContain('Methodology references');
    expect(markdown).toContain('Scale-free and interval diagnostics are adversarial review aids');
    expect(markdown).toContain('## Boundaries');
    expect(csv).toContain('dataset_id,label,jurisdiction,source_scope');
    expect(csv).toContain('interval_test_window_steps');
    expect(csv).toContain('interval_forecast_lead_start');
    expect(csv).toContain('interval_forecast_lead_end');
    expect(csv).not.toContain('interval_validation_horizon');
    expect(csv).toContain('seasonal_mase');
    expect(csv).toContain('interval_calibration_gap_pct');
    expect(csv).toContain('mean_interval_score_mw');
    expect(csv).toContain('interval_score_to_mae_ratio');
    expect(csv).toContain('buyer_specific_accuracy_claim');
  });

  it('computes MASE from the same normalized gross-load series used by holdout metrics', () => {
    const rows: UtilityHistoricalLoadRow[] = Array.from({ length: 600 }, (_, index) => {
      const demand = 50 + (index % 24);
      const gross = 100 + (index % 24) * 2;
      return {
        timestamp: new Date(Date.UTC(2025, 0, 1) + index * 3_600_000).toISOString(),
        geography_level: 'feeder',
        geography_id: 'MASE-F1',
        customer_class: 'general',
        demand_mw: demand,
        gross_load_mw: gross,
        source_system: 'gross-normalization-fixture',
      };
    });
    const pack = buildUtilityMultiDatasetBenchmarkPack([{
      dataset_id: 'gross-normalization',
      label: 'Gross normalization fixture',
      jurisdiction: 'Ontario',
      source_scope: 'buyer_supplied_anonymized',
      source_kind: 'uploaded_historical',
      rows,
      scenario: buildBenchmarkScenario('Ontario'),
    }]);
    const dataset = pack.datasets[0];
    const normalized = Array.from({ length: 600 }, (_, index) => 100 + (index % 24) * 2);
    const fit = normalized.slice(0, -72);
    const seasonalScale = fit.slice(24).reduce(
      (sum, value, index) => sum + Math.abs(value - fit[index]),
      0,
    ) / (fit.length - 24);
    const fallbackOneStepScale = fit.slice(1).reduce(
      (sum, value, index) => sum + Math.abs(value - fit[index]),
      0,
    ) / (fit.length - 1);
    const effectiveScale = seasonalScale || fallbackOneStepScale;

    expect(dataset.holdout_horizon).toBe('72h');
    expect(dataset.scientific_diagnostics.seasonal_mase).toBeCloseTo(
      dataset.metrics.mae / effectiveScale,
      3,
    );
    expect(dataset.scientific_diagnostics.seasonal_mase).not.toBeCloseTo(dataset.metrics.mae, 2);
    expect(dataset.scientific_diagnostics.notes.join(' ')).toContain('same hierarchy-selected, normalized series');
  });

  it('converts public household demand records into bounded utility forecast rows', () => {
    const records: PublicHouseholdDemandRecord[] = [
      {
        datetime: '2023-01-01T00:00:00.000Z',
        household_id: 'HH_001',
        electricity_demand: 3.5,
        temperature: -2.1,
        location: 'UK_LONDON',
      },
    ];

    const rows = householdDemandRecordsToUtilityRows(records);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      timestamp: '2023-01-01T00:00:00.000Z',
      geography_level: 'feeder',
      geography_id: 'UK_LONDON',
      customer_class: 'residential',
      demand_mw: 0.0035,
      customer_count: 1,
      feeder_id: 'HH_001',
    });
  });

  it('builds a validator-ready forecast trust retained extract from buyer benchmark diagnostics', () => {
    const pack = buildUtilityMultiDatasetBenchmarkPack([
      {
        dataset_id: 'buyer-redacted-load-history',
        label: 'Buyer redacted load history',
        jurisdiction: 'Ontario',
        source_scope: 'buyer_supplied_anonymized',
        source_kind: 'uploaded_historical',
        rows: generateOntarioPublicUtilitySampleRows(),
        scenario: buildBenchmarkScenario('Ontario'),
      },
    ], '2026-05-31T00:00:00.000Z');

    const extract = buildUtilityForecastTrustRetainedEvidenceExtract(pack, {
      recordDate: '2026-05-31',
      route: '/forecast-benchmarking',
      buyerDataCoveragePct: 90,
      timeToArtifactHours: 24,
      reviewerRole: 'utility planning reviewer',
      reviewerAcceptance: 'accepted',
      reviewerFeedbackStatus: 'complete',
      day14Decision: 'proceed',
      commercialCommitmentStatus: 'paid_pilot',
      commercialCommitmentEvidence: 'paid pilot evidence retained in redacted commercial appendix',
    });

    expect(extract).toContain('proof_pack_id: forecast_benchmark_provenance');
    expect(extract).toContain('source_scope: buyer_supplied_anonymized');
    expect(extract).toContain('pii_screen_result: redacted');
    expect(extract).toContain('buyer_data_coverage_pct: 90');
    expect(extract).toContain('time_to_artifact_hours: 24');
    expect(extract).toContain('reviewer_acceptance: accepted');
    expect(extract).toContain('reviewer_feedback_status: complete');
    expect(extract).toContain('day_14_decision: proceed');
    expect(extract).toContain('commercial_commitment_status: paid_pilot');
    expect(extract).toContain('commercial_commitment_evidence: paid pilot evidence retained in redacted commercial appendix');
    expect(extract).toMatch(/MAE \d+(?:\.\d+)? MW/);
    expect(extract).toMatch(/MAPE \d+(?:\.\d+)?%/);
    expect(extract).toMatch(/RMSE \d+(?:\.\d+)? MW/);
    expect(extract).toMatch(/persistence MAE \d+(?:\.\d+)? MW/);
    expect(extract).toMatch(/seasonal-naive MAE \d+(?:\.\d+)? MW/);
    expect(extract).toMatch(/rolling-origin split count \d+/);
    expect(extract).toMatch(/empirical interval coverage \d+(?:\.\d+)?%/);
    expect(extract).toContain('mean empirical 90pct interval score MW');
    expect(extract).toContain('interval score to MAE ratio');
    expect(extract).toContain('champion/challenger decision');
    expect(extract).toContain('buyer-specific accuracy claim: no');
    expect(extract).toContain('Do not claim guaranteed accuracy');
  });
});

function buildOntarioDemandRecords(): PublicOntarioDemandRecord[] {
  return Array.from({ length: 24 * 35 }, (_, index) => {
    const timestamp = new Date(Date.UTC(2023, 0, 1, index));
    const hour = timestamp.getUTCHours();
    const dailyShape = 1200 * Math.sin((hour / 24) * Math.PI * 2);
    const weeklyShape = index % (24 * 7) < 24 * 5 ? 700 : -500;
    const trend = index * 1.2;
    return {
      datetime: timestamp.toISOString(),
      total_demand_mw: 18000 + dailyShape + weeklyShape + trend,
    };
  });
}
