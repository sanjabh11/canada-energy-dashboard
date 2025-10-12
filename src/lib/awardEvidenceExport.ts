/**
 * Award Evidence Export with Validation
 * Ensures dashboard KPIs match export JSON within 1% tolerance
 */

import { validateAwardEvidenceQuick } from './validateAwardEvidence';

export interface DashboardKPIs {
  monthly_curtailment_avoided_mwh: number;
  monthly_opportunity_cost_saved_cad: number;
  solar_forecast_mae_percent: number;
  wind_forecast_mae_percent: number;
  roi_benefit_cost?: number;
}

export interface AwardExportJSON {
  curtailment: {
    total_avoided_mwh: number;
    total_savings_cad: number;
    roi_percent: number;
  };
  forecast: {
    solar_mae_1h: number;
    wind_mae_1h: number;
    baseline_uplift_percent: number;
  };
  data_quality: {
    sample_count: number;
    completeness_percent: number;
    provenance: string;
    confidence_percent: number;
  };
  storage: {
    alignment_pct_renewable: number;
    soc_bounds_compliance: boolean;
    total_actions: number;
    expected_revenue_cad: number;
  };
  ops_health: {
    ingestion_uptime_percent: number;
    forecast_job_success_percent: number;
    avg_job_latency_ms: number;
    data_freshness_minutes: number;
  };
}

/**
 * Export award evidence with validation
 * Blocks export if mismatches exceed 1% tolerance
 */
export async function exportAwardEvidence(
  dashboardKPIs: DashboardKPIs,
  exportJSON: AwardExportJSON
): Promise<{ success: boolean; data?: Blob; error?: string }> {
  
  // Flatten export JSON to match dashboard field names
  const flatExport = {
    monthly_curtailment_avoided_mwh: exportJSON.curtailment.total_avoided_mwh,
    monthly_opportunity_cost_saved_cad: exportJSON.curtailment.total_savings_cad,
    solar_forecast_mae_percent: exportJSON.forecast.solar_mae_1h,
    wind_forecast_mae_percent: exportJSON.forecast.wind_mae_1h,
    roi_benefit_cost: exportJSON.curtailment.roi_percent
  };

  // Validate alignment
  const validation = validateAwardEvidenceQuick(dashboardKPIs, flatExport);

  if (!validation.ok) {
    const errorMsg = `Evidence mismatch detected! Fields out of tolerance: ${validation.mismatches.join(', ')}`;
    console.error('[AWARD EXPORT] Validation failed:', errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }

  // Create CSV export with provenance
  const csvContent = [
    '# CANADIAN ENERGY DASHBOARD - AWARD EVIDENCE EXPORT',
    `# Generated: ${new Date().toISOString()}`,
    `# Validation: PASSED (tolerance: 1%)`,
    '',
    '## CURTAILMENT REDUCTION',
    `Monthly Curtailment Avoided (MWh),${exportJSON.curtailment.total_avoided_mwh}`,
    `Monthly Opportunity Cost Saved (CAD),${exportJSON.curtailment.total_savings_cad}`,
    `ROI (%),${exportJSON.curtailment.roi_percent}`,
    `Provenance,Historical`,
    '',
    '## FORECAST ACCURACY',
    `Solar MAE 1h (%),${exportJSON.forecast.solar_mae_1h}`,
    `Wind MAE 1h (%),${exportJSON.forecast.wind_mae_1h}`,
    `Baseline Uplift (%),${exportJSON.forecast.baseline_uplift_percent}`,
    `Calibration,ECCC Weather Observations`,
    '',
    '## DATA QUALITY',
    `Sample Count,${exportJSON.data_quality.sample_count}`,
    `Completeness (%),${exportJSON.data_quality.completeness_percent}`,
    `Provenance,${exportJSON.data_quality.provenance}`,
    `Confidence (%),${exportJSON.data_quality.confidence_percent}`,
    '',
    '## STORAGE DISPATCH',
    `Renewable Alignment (%),${exportJSON.storage.alignment_pct_renewable}`,
    `SoC Bounds Compliance,${exportJSON.storage.soc_bounds_compliance ? 'YES' : 'NO'}`,
    `Total Actions (30 days),${exportJSON.storage.total_actions}`,
    `Expected Revenue (CAD),${exportJSON.storage.expected_revenue_cad}`,
    '',
    '## OPS HEALTH',
    `Ingestion Uptime (%),${exportJSON.ops_health.ingestion_uptime_percent}`,
    `Forecast Job Success (%),${exportJSON.ops_health.forecast_job_success_percent}`,
    `Avg Job Latency (ms),${exportJSON.ops_health.avg_job_latency_ms}`,
    `Data Freshness (min),${exportJSON.ops_health.data_freshness_minutes}`,
    '',
    '## VALIDATION',
    `Dashboard-Export Alignment,VERIFIED`,
    `Tolerance,1%`,
    `Mismatches,0`,
    `Status,READY FOR SUBMISSION`
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  return {
    success: true,
    data: blob
  };
}

/**
 * Download award evidence CSV
 */
export function downloadAwardEvidence(blob: Blob, filename: string = 'award-evidence.csv') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Example usage:
 * 
 * const dashboardKPIs = {
 *   monthly_curtailment_avoided_mwh: 679,
 *   monthly_opportunity_cost_saved_cad: 42500,
 *   solar_forecast_mae_percent: 4.5,
 *   wind_forecast_mae_percent: 8.2
 * };
 * 
 * const exportJSON = { ... }; // From API
 * 
 * const result = await exportAwardEvidence(dashboardKPIs, exportJSON);
 * if (result.success && result.data) {
 *   downloadAwardEvidence(result.data);
 * } else {
 *   alert(result.error);
 * }
 */
