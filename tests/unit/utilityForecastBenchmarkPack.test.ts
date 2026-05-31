import { describe, expect, it } from 'vitest';
import {
  buildBenchmarkScenario,
  buildUtilityMultiDatasetBenchmarkPack,
  householdDemandRecordsToUtilityRows,
  ontarioDemandRecordsToUtilityRows,
  utilityMultiDatasetBenchmarkPackToCsv,
  utilityMultiDatasetBenchmarkPackToMarkdown,
  type PublicHouseholdDemandRecord,
  type PublicOntarioDemandRecord,
} from '../../src/lib/utilityForecastBenchmarkPack';
import { generateOntarioPublicUtilitySampleRows } from '../../src/lib/utilityForecasting';

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

    expect(pack.version).toBe('utility-multi-dataset-benchmark-v2');
    expect(pack.dataset_count).toBe(2);
    expect(pack.buyer_specific_accuracy_claim).toBe(false);
    expect(pack.datasets.every((dataset) => dataset.sample_size > 0)).toBe(true);
    expect(pack.datasets.every((dataset) => dataset.rolling_origin_split_count >= 3)).toBe(true);
    expect(pack.datasets.every((dataset) => dataset.scientific_diagnostics.seasonal_mase > 0)).toBe(true);
    expect(pack.datasets.every((dataset) => dataset.scientific_diagnostics.interval_nominal_coverage_pct === 90)).toBe(true);
    expect(pack.datasets[0].scientific_diagnostics.notes.join(' ')).toContain('in-sample');
    expect(pack.aggregate.mean_best_naive_scaled_mae).toBeGreaterThan(0);
    expect(pack.aggregate.maximum_interval_calibration_gap_pct).toBeGreaterThanOrEqual(0);
    expect(pack.methodology_references.map((reference) => reference.label).join(' ')).toContain('Hyndman');
    expect(pack.datasets[0].benchmark_failure_notes[0]).toContain('Baseline win:');
    expect(markdown).toContain('Buyer-specific accuracy claim: no');
    expect(markdown).toContain('Mean seasonal MASE');
    expect(markdown).toContain('Methodology references');
    expect(markdown).toContain('Scale-free and interval diagnostics are adversarial review aids');
    expect(markdown).toContain('## Boundaries');
    expect(csv).toContain('dataset_id,label,jurisdiction,source_scope');
    expect(csv).toContain('seasonal_mase');
    expect(csv).toContain('interval_calibration_gap_pct');
    expect(csv).toContain('buyer_specific_accuracy_claim');
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
