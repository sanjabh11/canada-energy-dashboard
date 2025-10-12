/**
 * Award Evidence Validation Utility
 * 
 * Validates that award evidence exports match dashboard KPIs exactly
 * and include all required fields for award submission.
 */

export interface AwardEvidenceExport {
  // Model Information
  model_name: string;
  model_version: string;
  
  // Time Period
  period: {
    start_date: string;
    end_date: string;
    duration_days: number;
  };
  
  // Curtailment Metrics
  curtailment: {
    total_avoided_mwh: number;
    total_savings_cad: number;
    roi_percent: number;
    events_count: number;
    avg_reduction_per_event_mw: number;
  };
  
  // Forecast Performance
  forecast: {
    solar_mae_1h: number;
    solar_mae_24h: number;
    wind_mae_1h?: number;
    wind_mae_24h?: number;
    baseline_uplift_percent: number;
  };
  
  // Data Quality
  data_quality: {
    sample_count: number;
    completeness_percent: number;
    provenance: 'Historical' | 'Real-Time' | 'Indicative';
    confidence_percent: number;
  };
  
  // Storage Dispatch
  storage?: {
    alignment_pct_renewable: number;
    soc_bounds_compliance: boolean;
    total_actions: number;
    expected_revenue_cad: number;
  };
  
  // Ops Health
  ops_health: {
    ingestion_uptime_percent: number;
    forecast_job_success_percent: number;
    avg_job_latency_ms: number;
    data_freshness_minutes: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  completeness_score: number;
}

/**
 * Validate award evidence export against requirements
 */
export function validateAwardEvidence(evidence: Partial<AwardEvidenceExport>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let completeness = 0;
  const totalFields = 25; // Total required fields

  // Model Information
  if (!evidence.model_name) {
    errors.push('Missing model_name');
  } else {
    completeness++;
  }
  
  if (!evidence.model_version) {
    errors.push('Missing model_version');
  } else {
    completeness++;
  }

  // Period
  if (!evidence.period?.start_date) {
    errors.push('Missing period.start_date');
  } else {
    completeness++;
  }
  
  if (!evidence.period?.end_date) {
    errors.push('Missing period.end_date');
  } else {
    completeness++;
  }
  
  if (!evidence.period?.duration_days) {
    errors.push('Missing period.duration_days');
  } else {
    completeness++;
  }

  // Curtailment - Critical for award
  if (!evidence.curtailment) {
    errors.push('Missing curtailment metrics (critical for award)');
  } else {
    if (evidence.curtailment.total_avoided_mwh === undefined) {
      errors.push('Missing curtailment.total_avoided_mwh');
    } else if (evidence.curtailment.total_avoided_mwh <= 0) {
      warnings.push('curtailment.total_avoided_mwh is zero or negative');
      completeness++;
    } else {
      completeness++;
    }
    
    if (evidence.curtailment.total_savings_cad === undefined) {
      errors.push('Missing curtailment.total_savings_cad');
    } else {
      completeness++;
    }
    
    if (evidence.curtailment.roi_percent === undefined) {
      errors.push('Missing curtailment.roi_percent');
    } else if (evidence.curtailment.roi_percent < 1.0) {
      warnings.push('ROI < 1.0 (not economically viable)');
      completeness++;
    } else {
      completeness++;
    }
    
    if (evidence.curtailment.events_count === undefined) {
      errors.push('Missing curtailment.events_count');
    } else {
      completeness++;
    }
    
    if (evidence.curtailment.avg_reduction_per_event_mw === undefined) {
      errors.push('Missing curtailment.avg_reduction_per_event_mw');
    } else {
      completeness++;
    }
  }

  // Forecast Performance
  if (!evidence.forecast) {
    errors.push('Missing forecast performance metrics');
  } else {
    if (evidence.forecast.solar_mae_1h === undefined) {
      errors.push('Missing forecast.solar_mae_1h');
    } else {
      completeness++;
    }
    
    if (evidence.forecast.solar_mae_24h === undefined) {
      errors.push('Missing forecast.solar_mae_24h');
    } else {
      completeness++;
    }
    
    if (evidence.forecast.baseline_uplift_percent === undefined) {
      errors.push('Missing forecast.baseline_uplift_percent');
    } else if (evidence.forecast.baseline_uplift_percent < 0) {
      warnings.push('Baseline uplift is negative (performing worse than baseline)');
      completeness++;
    } else {
      completeness++;
    }
    
    // Wind is optional
    if (evidence.forecast.wind_mae_1h !== undefined) {
      completeness += 0.5;
    }
    if (evidence.forecast.wind_mae_24h !== undefined) {
      completeness += 0.5;
    }
  }

  // Data Quality - Critical for credibility
  if (!evidence.data_quality) {
    errors.push('Missing data_quality metrics (critical for credibility)');
  } else {
    if (evidence.data_quality.sample_count === undefined) {
      errors.push('Missing data_quality.sample_count');
    } else if (evidence.data_quality.sample_count < 100) {
      warnings.push('Sample count < 100 (may not be statistically significant)');
      completeness++;
    } else {
      completeness++;
    }
    
    if (evidence.data_quality.completeness_percent === undefined) {
      errors.push('Missing data_quality.completeness_percent');
    } else if (evidence.data_quality.completeness_percent < 95) {
      warnings.push('Completeness < 95% (may affect reliability)');
      completeness++;
    } else {
      completeness++;
    }
    
    if (!evidence.data_quality.provenance) {
      errors.push('Missing data_quality.provenance');
    } else if (evidence.data_quality.provenance === 'Indicative') {
      warnings.push('Using Indicative data (prefer Historical or Real-Time for awards)');
      completeness++;
    } else {
      completeness++;
    }
    
    if (evidence.data_quality.confidence_percent === undefined) {
      errors.push('Missing data_quality.confidence_percent');
    } else if (evidence.data_quality.confidence_percent < 70) {
      warnings.push('Confidence < 70% (may need calibration)');
      completeness++;
    } else {
      completeness++;
    }
  }

  // Storage (optional but valuable)
  if (evidence.storage) {
    if (evidence.storage.alignment_pct_renewable !== undefined) {
      completeness++;
    }
    if (evidence.storage.soc_bounds_compliance !== undefined) {
      completeness++;
    }
    if (evidence.storage.total_actions !== undefined) {
      completeness++;
    }
    if (evidence.storage.expected_revenue_cad !== undefined) {
      completeness++;
    }
  }

  // Ops Health
  if (!evidence.ops_health) {
    warnings.push('Missing ops_health metrics (valuable for demonstrating reliability)');
  } else {
    if (evidence.ops_health.ingestion_uptime_percent !== undefined) {
      completeness++;
      if (evidence.ops_health.ingestion_uptime_percent < 99.0) {
        warnings.push('Ingestion uptime < 99% (may affect reliability claim)');
      }
    }
    
    if (evidence.ops_health.forecast_job_success_percent !== undefined) {
      completeness++;
      if (evidence.ops_health.forecast_job_success_percent < 98.0) {
        warnings.push('Forecast job success < 98% (may affect reliability claim)');
      }
    }
    
    if (evidence.ops_health.avg_job_latency_ms !== undefined) {
      completeness++;
    }
    
    if (evidence.ops_health.data_freshness_minutes !== undefined) {
      completeness++;
    }
  }

  const completeness_score = (completeness / totalFields) * 100;
  const valid = errors.length === 0 && completeness_score >= 80;

  return {
    valid,
    errors,
    warnings,
    completeness_score
  };
}

/**
 * Generate CSV export for curtailment data
 */
export function exportCurtailmentCSV(events: any[]): string {
  const headers = [
    'Event ID',
    'Occurred At',
    'Province',
    'Curtailed MW',
    'Duration (hours)',
    'Avoided Cost (CAD)',
    'Reason',
    'Mitigation',
    'Expected Reduction MW',
    'Confidence',
    'Provenance'
  ];

  const rows = events.map(event => [
    event.id,
    event.occurred_at,
    event.province,
    event.curtailed_mw?.toFixed(2) || '0',
    event.duration_hours?.toFixed(1) || '0',
    event.avoided_cost_cad?.toFixed(2) || '0',
    event.reason || 'Unknown',
    event.mitigation_strategy || 'None',
    event.expected_reduction_mw?.toFixed(2) || '0',
    event.confidence?.toFixed(2) || '0',
    event.provenance || 'Unknown'
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

/**
 * Compare export values against dashboard KPIs (strict validation)
 */
export function compareToDashboard(
  exportData: AwardEvidenceExport,
  dashboardKpis: Record<string, number>
): { matches: boolean; differences: string[] } {
  const differences: string[] = [];
  const tolerance = 0.01; // 1% tolerance for floating point

  const fields = [
    { key: 'monthly_curtailment_avoided_mwh', exportPath: 'curtailment.total_avoided_mwh', label: 'Curtailment Avoided' },
    { key: 'monthly_opportunity_cost_saved_cad', exportPath: 'curtailment.total_savings_cad', label: 'Savings' },
    { key: 'solar_forecast_mae_percent', exportPath: 'forecast.solar_mae_1h', label: 'Solar MAE (1h)' },
    { key: 'wind_forecast_mae_percent', exportPath: 'forecast.wind_mae_1h', label: 'Wind MAE (1h)' },
    { key: 'roi_percent', exportPath: 'curtailment.roi_percent', label: 'ROI' }
  ];

  for (const field of fields) {
    const dashboardValue = dashboardKpis[field.key];
    if (dashboardValue === undefined) continue;

    // Navigate export path
    const pathParts = field.exportPath.split('.');
    let exportValue: any = exportData;
    for (const part of pathParts) {
      exportValue = exportValue?.[part];
    }

    if (exportValue === undefined) {
      differences.push(`${field.label}: Missing in export`);
      continue;
    }

    const diff = Math.abs(Number(exportValue) - Number(dashboardValue));
    const pctDiff = dashboardValue !== 0 ? (diff / Math.abs(dashboardValue)) * 100 : diff;
    
    if (pctDiff > tolerance) {
      differences.push(
        `${field.label} mismatch: Export=${Number(exportValue).toFixed(2)}, ` +
        `Dashboard=${Number(dashboardValue).toFixed(2)} (${pctDiff.toFixed(2)}% difference)`
      );
    }
  }

  return {
    matches: differences.length === 0,
    differences
  };
}

/**
 * Quick validator for dashboard-export alignment (EXACT IMPLEMENTATION)
 */
export function validateAwardEvidenceQuick(dashboard: any, exportJson: any) {
  const TOL = 0.01;
  const fields = ['monthly_curtailment_avoided_mwh','monthly_opportunity_cost_saved_cad','solar_forecast_mae_percent','wind_forecast_mae_percent'];
  const mismatches = fields.filter(f => Math.abs(Number(dashboard[f] ?? 0) - Number(exportJson[f] ?? 0)) > TOL * Math.max(1, Number(dashboard[f] ?? 0)));
  return { ok: mismatches.length === 0, mismatches };
}
