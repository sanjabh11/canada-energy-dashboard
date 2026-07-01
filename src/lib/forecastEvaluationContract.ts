// ============================================================================
// Evaluation Contract — Standardized Forecast Evaluation Framework
//
// Provides a contract-based evaluation framework for forecast models.
// Each contract defines required metrics, acceptance thresholds, and
// rolling-origin cross-validation configuration. Models are evaluated
// against the contract to produce structured pass/fail results.
// ============================================================================

export type EvaluationHorizon = '1h' | '6h' | '24h' | '168h' | '720h' | '8760h';

export type ModelClass =
  | 'persistence'
  | 'seasonal_naive'
  | 'seasonal_decomposition'
  | 'weather_adjusted'
  | 'tsfm_zero_shot'
  | 'tsfm_finetuned'
  | 'conformal_cp'
  | 'msarx_garch'
  | 'lightgbm'
  | 'stgnn';

export interface RequiredMetric {
  name: 'mae' | 'mape' | 'rmse' | 'crps' | 'pinball_loss' | 'coverage_rate' | 'skill_score';
  horizons: EvaluationHorizon[];
  description: string;
}

export interface AcceptanceThreshold {
  metric: string;
  horizon: EvaluationHorizon;
  threshold: number;
  operator: '<=' | '>=' | '==';
  severity: 'must_pass' | 'should_pass' | 'informational';
}

export interface EvaluationContract {
  contractVersion: string;
  modelClass: ModelClass;
  modelName: string;
  horizons: EvaluationHorizon[];
  requiredMetrics: RequiredMetric[];
  acceptanceThresholds: AcceptanceThreshold[];
  rollingOriginConfig: {
    minTrainSize: number;
    stepSize: number;
    nFolds: number;
    testWindowSize: number;
  };
  dataRequirements: string[];
  reproducibility: {
    seedRequired: boolean;
    codeVersionRequired: boolean;
    dataVersionRequired: boolean;
  };
}

export interface EvaluationResult {
  modelName: string;
  modelClass: ModelClass;
  horizon: EvaluationHorizon;
  metrics: Record<string, number>;
  passedThresholds: boolean;
  failedThresholds: string[];
  evaluationTimestamp: string;
  rollingOriginFolds: number;
  reproducibilitySeed?: number;
}

export const DEFAULT_EVALUATION_CONTRACT: EvaluationContract = {
  contractVersion: 'eval-contract-v1',
  modelClass: 'seasonal_decomposition',
  modelName: 'default',
  horizons: ['1h', '24h', '168h'],
  requiredMetrics: [
    { name: 'mae', horizons: ['1h', '24h', '168h'], description: 'Mean Absolute Error in MW' },
    { name: 'mape', horizons: ['1h', '24h', '168h'], description: 'Mean Absolute Percentage Error' },
    { name: 'rmse', horizons: ['1h', '24h', '168h'], description: 'Root Mean Square Error in MW' },
    { name: 'crps', horizons: ['24h', '168h'], description: 'Continuous Ranked Probability Score' },
    { name: 'coverage_rate', horizons: ['24h', '168h'], description: 'Prediction interval coverage rate' },
    { name: 'skill_score', horizons: ['24h', '168h'], description: 'Skill score vs persistence baseline' },
  ],
  acceptanceThresholds: [
    { metric: 'mape', horizon: '1h', threshold: 3.0, operator: '<=', severity: 'must_pass' },
    { metric: 'mape', horizon: '24h', threshold: 5.0, operator: '<=', severity: 'must_pass' },
    { metric: 'mape', horizon: '168h', threshold: 8.0, operator: '<=', severity: 'should_pass' },
    { metric: 'coverage_rate', horizon: '24h', threshold: 0.90, operator: '>=', severity: 'must_pass' },
    { metric: 'coverage_rate', horizon: '168h', threshold: 0.85, operator: '>=', severity: 'should_pass' },
    { metric: 'skill_score', horizon: '24h', threshold: 0.15, operator: '>=', severity: 'should_pass' },
    { metric: 'skill_score', horizon: '168h', threshold: 0.10, operator: '>=', severity: 'informational' },
  ],
  rollingOriginConfig: {
    minTrainSize: 336,
    stepSize: 24,
    nFolds: 10,
    testWindowSize: 24,
  },
  dataRequirements: [
    'Time series must be hourly with no gaps > 3 hours',
    'At least 2 weeks of training data required',
    'Weather features (if used) must align temporally with demand data',
    'All data must be in UTC or clearly timezone-labeled',
  ],
  reproducibility: {
    seedRequired: true,
    codeVersionRequired: true,
    dataVersionRequired: true,
  },
};

/**
 * Evaluate a model's metrics against the evaluation contract thresholds.
 */
export function evaluateAgainstContract(
  contract: EvaluationContract,
  results: Array<{ horizon: EvaluationHorizon; metrics: Record<string, number> }>,
  modelName: string,
  modelClass: ModelClass,
): EvaluationResult[] {
  const evalResults: EvaluationResult[] = [];

  for (const result of results) {
    const failedThresholds: string[] = [];
    let allPassed = true;

    for (const threshold of contract.acceptanceThresholds) {
      if (threshold.horizon !== result.horizon) continue;
      const value = result.metrics[threshold.metric];
      if (value === undefined) {
        failedThresholds.push(`${threshold.metric}@${threshold.horizon}: missing`);
        allPassed = false;
        continue;
      }

      const passed =
        threshold.operator === '<=' ? value <= threshold.threshold :
        threshold.operator === '>=' ? value >= threshold.threshold :
        value === threshold.threshold;

      if (!passed && threshold.severity === 'must_pass') {
        failedThresholds.push(
          `${threshold.metric}@${threshold.horizon}: ${value} ${threshold.operator} ${threshold.threshold} FAILED`,
        );
        allPassed = false;
      } else if (!passed && threshold.severity === 'should_pass') {
        failedThresholds.push(
          `${threshold.metric}@${threshold.horizon}: ${value} ${threshold.operator} ${threshold.threshold} WARNING`,
        );
      }
    }

    evalResults.push({
      modelName,
      modelClass,
      horizon: result.horizon,
      metrics: result.metrics,
      passedThresholds: allPassed,
      failedThresholds,
      evaluationTimestamp: new Date().toISOString(),
      rollingOriginFolds: contract.rollingOriginConfig.nFolds,
    });
  }

  return evalResults;
}

/**
 * Generate a summary report from evaluation results.
 */
export function generateEvaluationSummary(results: EvaluationResult[]): string {
  const lines: string[] = [
    '# Forecast Evaluation Summary',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Results by Model and Horizon',
    '',
    '| Model | Horizon | MAPE | CRPS | Coverage | Skill | Pass |',
    '|-------|---------|------|------|----------|-------|------|',
  ];

  for (const r of results) {
    const mape = r.metrics.mape?.toFixed(2) ?? '—';
    const crps = r.metrics.crps?.toFixed(3) ?? '—';
    const coverage = r.metrics.coverage_rate?.toFixed(2) ?? '—';
    const skill = r.metrics.skill_score?.toFixed(2) ?? '—';
    const pass = r.passedThresholds ? '✅' : '❌';
    lines.push(`| ${r.modelName} | ${r.horizon} | ${mape}% | ${crps} | ${coverage} | ${skill} | ${pass} |`);
  }

  lines.push('', '## Failed Thresholds', '');
  const failures = results.filter((r) => r.failedThresholds.length > 0);
  if (failures.length === 0) {
    lines.push('None — all thresholds passed.');
  } else {
    for (const f of failures) {
      lines.push(`### ${f.modelName} @ ${f.horizon}`);
      for (const fail of f.failedThresholds) {
        lines.push(`- ${fail}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
