import { describe, expect, it } from 'vitest';
import {
  utilityForecastPackageToAlbertaCsv,
  utilityForecastPackageToCsv,
  utilityRowsToCsv,
} from '../../src/lib/utilityCsvSerializer';
import {
  buildUtilityBenchmarkAppendixMarkdown,
  buildUtilityJurisdictionCsv,
} from '../../src/lib/utilityForecastProofPack';
import {
  buildUtilityForecastPackage,
  generateOntarioPublicUtilitySampleRows,
} from '../../src/lib/utilityForecasting';
import type { UtilityHistoricalLoadRow } from '../../src/lib/types/utilityForecasting';
import { REGULATORY_TEMPLATES, templateToCSV } from '../../src/lib/regulatoryTemplates';

function scenario() {
  return {
    jurisdiction: 'Ontario' as const,
    planning_horizon_years: [1, 5],
    weather_case: 'median' as const,
    annual_load_growth_pct: 1,
    committed_load_mw: 0,
    ev_growth_mw: 0,
    heat_pump_growth_mw: 0,
    der_offset_mw: 0,
    demand_response_reduction_mw: 0,
    demand_response_shift_pct: 0,
    capacity_buffer_pct: 15,
  };
}

function unsupportedAxisPackage() {
  const rows = generateOntarioPublicUtilitySampleRows().slice(0, 48).map((row, index) => ({
    ...row,
    quality_flags: index === 0 ? [...(row.quality_flags ?? []), 'timezone_ambiguous' as const] : row.quality_flags,
  }));
  return buildUtilityForecastPackage({
    rows,
    scenario: scenario(),
    sourceLabel: '=sample.csv,\n# injected metadata',
    sourceKind: 'uploaded_historical',
  });
}

describe('utility CSV export safety', () => {
  it('quotes CSV delimiters and neutralizes spreadsheet formulas in string fields', () => {
    const row: UtilityHistoricalLoadRow = {
      timestamp: '2026-01-01T00:00:00.000Z',
      geography_level: 'feeder',
      geography_id: '=HYPERLINK("x","y"),\nsecond line',
      customer_class: 'general, commercial',
      demand_mw: Number.NaN,
      quality_flags: [],
    };

    const csv = utilityRowsToCsv([row]);

    expect(csv).toContain('"\'=HYPERLINK(""x"",""y""),\nsecond line"');
    expect(csv).toContain('"general, commercial"');
    expect(csv).toContain('not_available');
  });

  it('applies the same formula and non-finite handling to jurisdiction template CSVs', () => {
    const csv = templateToCSV(REGULATORY_TEMPLATES.oeb_dsp_scenario_matrix, [{
      horizon_year: 1,
      scenario: '=1+1',
      peak_demand_mw: 10,
      annual_energy_gwh: Number.NaN,
      delta_vs_base_mw: 0,
      reliability_proxy_score: 1,
      notes: '@SUM(A1:A2),\nsecond line',
    }]);

    expect(csv).toContain("'=1+1");
    expect(csv).toContain('not_available');
    expect(csv).toContain('"\'@SUM(A1:A2),\nsecond line"');
    expect(csv).not.toContain('NaN');
  });

  it('keeps unsupported forecast values unavailable in CSV, Alberta, and memo exports', () => {
    const forecastPackage = unsupportedAxisPackage();
    const csv = utilityForecastPackageToCsv(forecastPackage);
    const albertaCsv = utilityForecastPackageToAlbertaCsv(forecastPackage);
    const jurisdictionCsv = buildUtilityJurisdictionCsv(forecastPackage);
    const appendix = buildUtilityBenchmarkAppendixMarkdown(forecastPackage);

    expect(forecastPackage.evidence_report.time_axis_status).toBe('unsupported');
    expect(forecastPackage.evidence_report.interval_status).toBe('unsupported_time_axis');
    expect(forecastPackage.evidence_report.empirical_interval_coverage_pct).toBeNull();
    expect(csv).toContain('time_axis_status,unsupported');
    expect(csv).toContain('not_available');
    expect(csv).not.toContain('NaN');
    expect(csv).not.toMatch(/^# injected metadata$/m);
    expect(albertaCsv).not.toContain('NaN');
    expect(jurisdictionCsv).toContain('not_available');
    expect(jurisdictionCsv).not.toContain('NaN');
    expect(appendix).toContain('not available');
    expect(appendix).toContain('Content fingerprint (FNV-1a; non-cryptographic; sampled for large datasets)');
    expect(appendix).not.toContain('NaN');
  });
});
