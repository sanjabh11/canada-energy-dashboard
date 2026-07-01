// ============================================================================
// Utility CSV Serializer — Forecast package and row-level CSV export
//
// Provides CSV serialization for utility historical load rows and
// complete forecast packages, including Alberta-specific regulatory format.
// ============================================================================

import type { UtilityForecastPackage, UtilityHistoricalLoadRow } from './types/utilityForecasting';
import { TEMPLATE_HEADERS } from './utilityCsvParser';

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function utilityRowsToCsv(rows: UtilityHistoricalLoadRow[]): string {
  const header = TEMPLATE_HEADERS.join(',');
  const body = rows.map((row) => [
    row.timestamp,
    row.geography_level,
    row.geography_id,
    row.customer_class,
    round(row.demand_mw, 3),
    row.weather_zone ?? '',
    row.temperature_c ?? '',
    row.net_load_mw ?? '',
    row.gross_load_mw ?? '',
    row.customer_count ?? '',
    row.source_system ?? '',
    row.feeder_id ?? '',
    row.substation_id ?? '',
  ].join(','));

  return [header, ...body].join('\n');
}

export function utilityForecastPackageToCsv(forecastPackage: UtilityForecastPackage): string {
  const lines = [
    '# Utility Demand Forecast Package',
    `# Jurisdiction: ${forecastPackage.jurisdiction}`,
    `# Generated: ${forecastPackage.generated_at}`,
    `# Source: ${forecastPackage.source_label}`,
    `# Source Kind: ${forecastPackage.input_provenance_summary.source_kind}`,
    `# Source Manifest: ${forecastPackage.source_manifest.id}`,
    `# Source File: ${forecastPackage.source_manifest.sourceFile}`,
    `# Source Hash: ${forecastPackage.source_manifest.hash}`,
    `# Transform Version: ${forecastPackage.source_manifest.transformVersion}`,
    `# Fallback: ${forecastPackage.input_provenance_summary.live_surfaces.some((surface) => surface.is_fallback)}`,
    `# Provenance: ${forecastPackage.provenance.type}`,
    `# Assumption Pack: ${forecastPackage.input_provenance_summary.assumption_pack_version}`,
    '',
    'case,year,peak_demand_mw,annual_energy_gwh,customer_count,growth_rate_pct,scenario_delta_mw,utilization_pct,weather_factor',
  ];

  for (const [caseKey, forecastCase] of Object.entries(forecastPackage.cases)) {
    for (const year of forecastCase.yearly) {
      lines.push([
        caseKey,
        year.year,
        year.peak_demand_mw,
        year.annual_energy_gwh,
        year.customer_count,
        year.growth_rate_pct,
        year.scenario_delta_mw,
        year.utilization_pct,
        year.weather_factor,
      ].join(','));
    }
  }

  lines.push('', 'benchmark_metric,value');
  [
    ['mae', forecastPackage.benchmark.mae],
    ['mape', forecastPackage.benchmark.mape],
    ['rmse', forecastPackage.benchmark.rmse],
    ['persistence_mae', forecastPackage.benchmark.persistence_mae],
    ['persistence_mape', forecastPackage.benchmark.persistence_mape],
    ['persistence_rmse', forecastPackage.benchmark.persistence_rmse],
    ['seasonal_naive_mae', forecastPackage.benchmark.seasonal_naive_mae],
    ['seasonal_naive_mape', forecastPackage.benchmark.seasonal_naive_mape],
    ['seasonal_naive_rmse', forecastPackage.benchmark.seasonal_naive_rmse],
    ['skill_score_vs_persistence_pct', forecastPackage.benchmark.skill_score_vs_persistence],
    ['skill_score_vs_seasonal_naive_pct', forecastPackage.benchmark.skill_score_vs_seasonal],
    ['sample_size', forecastPackage.benchmark.sample_size],
  ].forEach(([metric, value]) => {
    lines.push(`${metric},${value}`);
  });

  lines.push('', 'rolling_split,train_start,train_end,test_start,test_end,mae,mape,rmse,persistence_mae,seasonal_naive_mae,interval_coverage_pct,mean_interval_score_mw');
  forecastPackage.evidence_report.rolling_origin_splits.forEach((split) => {
    lines.push([
      split.split_id,
      split.train_start,
      split.train_end,
      split.test_start,
      split.test_end,
      split.mae,
      split.mape,
      split.rmse,
      split.persistence_mae,
      split.seasonal_naive_mae,
      split.interval_coverage_pct,
      split.mean_interval_score_mw,
    ].join(','));
  });

  lines.push('', 'evidence_metric,value');
  [
    ['model_version', forecastPackage.evidence_report.model_version],
    ['validation_method', forecastPackage.evidence_report.validation_method],
    ['conformal_interval_coverage_pct', forecastPackage.evidence_report.conformal_interval_coverage_pct],
    ['conformal_interval_width_mw', forecastPackage.evidence_report.conformal_interval_width_mw],
    ['champion_model', forecastPackage.evidence_report.champion_challenger.champion],
    ['challenger_model', forecastPackage.evidence_report.champion_challenger.challenger],
    ['benchmark_failure_note_count', forecastPackage.evidence_report.benchmark_failure_notes.length],
    ['hierarchy_status', forecastPackage.evidence_report.hierarchy_reconciliation.status],
    ['hierarchy_max_error_mw', forecastPackage.evidence_report.hierarchy_reconciliation.max_reconciliation_error_mw],
  ].forEach(([metric, value]) => {
    lines.push(`${metric},${value}`);
  });

  lines.push('', 'benchmark_failure_note');
  if (forecastPackage.evidence_report.benchmark_failure_notes.length > 0) {
    forecastPackage.evidence_report.benchmark_failure_notes.forEach((note) => {
      lines.push(`"${note.replace(/"/g, '""')}"`);
    });
  } else {
    lines.push('none');
  }

  lines.push('', 'reliability_proxy_horizon,score,band,peak_utilization_pct,reserve_headroom_mw,weather_stress_pct');
  forecastPackage.reliability_proxy.horizon_scores.forEach((row) => {
    lines.push([
      row.horizon_year,
      row.score,
      row.band,
      row.peak_utilization_pct,
      row.reserve_headroom_mw,
      row.weather_stress_pct,
    ].join(','));
  });

  lines.push('', 'live_surface_source,observed_at,freshness_status,is_fallback,source_kind,quality_flags');
  forecastPackage.input_provenance_summary.live_surfaces.forEach((surface) => {
    lines.push([
      surface.source,
      surface.observed_at ?? '',
      surface.freshness_status,
      surface.is_fallback,
      surface.source_kind,
      `"${surface.quality_flags.join('|')}"`,
    ].join(','));
  });

  lines.push('', 'hosting_capacity_horizon,geography_id,geography_level,projected_der_mw,limit_mw,severity,message');
  forecastPackage.hosting_capacity_warnings.forEach((warning) => {
    lines.push([
      warning.horizon_year,
      warning.geography_id,
      warning.geography_level,
      warning.projected_der_mw,
      warning.limit_mw,
      warning.severity,
      `"${warning.message.replace(/"/g, '""')}"`,
    ].join(','));
  });

  lines.push('', 'assumption');
  forecastPackage.assumptions.forEach((assumption) => {
    lines.push(`"${assumption.replace(/"/g, '""')}"`);
  });

  return lines.join('\n');
}

export function utilityForecastPackageToAlbertaCsv(forecastPackage: UtilityForecastPackage): string {
  const lines = [
    '# Alberta Distribution Plan Data Schedule',
    `# Generated: ${forecastPackage.generated_at}`,
    `# Source: ${forecastPackage.source_label}`,
    '',
    'horizon_year,geography_id,geography_level,peak_demand_mw,annual_energy_gwh,customer_count,growth_rate_pct,large_point_load_mw,industrial_opt_out_mw,der_offset_mw,deferred_peak_load_mw,reliability_proxy_score,hosting_capacity_limit_mw,notes',
  ];

  forecastPackage.regulatory_exports.alberta.data_schedule_rows.forEach((row) => {
    lines.push([
      row.horizon_year,
      row.geography_id,
      row.geography_level,
      row.peak_demand_mw,
      row.annual_energy_gwh,
      row.customer_count,
      row.growth_rate_pct,
      row.large_point_load_mw,
      row.industrial_opt_out_mw,
      row.der_offset_mw,
      row.deferred_peak_load_mw,
      row.reliability_proxy_score,
      row.hosting_capacity_limit_mw,
      `"${row.notes.replace(/"/g, '""')}"`,
    ].join(','));
  });

  return lines.join('\n');
}
