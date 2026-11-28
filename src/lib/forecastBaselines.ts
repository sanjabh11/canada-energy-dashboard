/**
 * Forecast Baseline Utilities
 *
 * Provides baseline forecast methods for comparison:
 * - Persistence forecast (current value projected forward)
 * - Seasonal average (historical patterns)
 * - Naive forecast (last known value)
 */

export interface BaselineForecast {
  method: 'persistence' | 'seasonal' | 'naive';
  values: number[];
  mae: number;
  rmse: number;
  /**
   * False when the baseline could not be generated (e.g. training history
   * shorter than the seasonal period). Unavailable baselines carry empty
   * values and non-finite metrics; callers must exclude them from skill
   * scores and champion/challenger comparisons instead of treating them as
   * zero-error "perfect" baselines.
   */
  available: boolean;
}

/**
 * Compute uplift safely with proper validation
 */
export function computeUplift(mae: number, base: number): number {
  if (!isFinite(mae) || !isFinite(base) || base <= 0) return 0;
  return ((base - mae) / base) * 100;
}

/**
 * Persistence forecast: assumes current value continues
 */
export function persistenceForecast(currentValue: number, horizonHours: number): BaselineForecast {
  if (!Number.isInteger(horizonHours) || horizonHours <= 0 || !Number.isFinite(currentValue)) {
    return {
      method: 'persistence',
      values: [],
      mae: Number.NaN,
      rmse: Number.NaN,
      available: false,
    };
  }
  const values = Array(horizonHours).fill(currentValue);

  return {
    method: 'persistence',
    values,
    mae: 0, // Will be calculated against actuals
    rmse: 0,
    available: true,
  };
}

/**
 * Fixed-origin seasonal-naive forecast: repeat only the last observed season.
 */
export function seasonalNaiveForecast(
  trainingValues: number[],
  horizon: number,
  seasonalPeriod: number,
  offsetFromOrigin = 0,
): BaselineForecast {
  if (
    !Number.isInteger(horizon) ||
    horizon <= 0 ||
    !Number.isInteger(seasonalPeriod) ||
    seasonalPeriod <= 0 ||
    !Number.isInteger(offsetFromOrigin) ||
    offsetFromOrigin < 0 ||
    trainingValues.length < seasonalPeriod
  ) {
    // An unavailable baseline must never masquerade as a zero-error
    // "perfect" baseline in downstream skill-score comparisons.
    return { method: 'seasonal', values: [], mae: Number.NaN, rmse: Number.NaN, available: false };
  }

  const lastSeason = trainingValues.slice(-seasonalPeriod);
  return {
    method: 'seasonal',
    values: Array.from(
      { length: horizon },
      (_, index) => lastSeason[(offsetFromOrigin + index) % seasonalPeriod],
    ),
    mae: 0,
    rmse: 0,
    available: true,
  };
}

/**
 * Calculate Mean Absolute Error
 */
function calculateMAE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) {
    // Mismatched or empty inputs are not measurable; NaN keeps them out of
    // finite-metric comparisons instead of pretending the error was zero.
    return Number.NaN;
  }

  const errors = actual.map((a, i) => Math.abs(a - predicted[i]));
  return errors.reduce((sum, e) => sum + e, 0) / errors.length;
}

/**
 * Calculate Mean Absolute Percentage Error
 */
function calculateMAPE(actual: number[], predicted: number[]): number {
  if (
    actual.length !== predicted.length ||
    actual.length === 0 ||
    actual.some((value) => value <= 0)
  ) {
    return Number.NaN;
  }

  const errors = actual.map((a, i) => Math.abs((a - predicted[i]) / a));

  return (errors.reduce((sum, e) => sum + e, 0) / errors.length) * 100;
}

/**
 * Calculate Root Mean Square Error
 */
function calculateRMSE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) {
    return Number.NaN;
  }

  const squaredErrors = actual.map((a, i) => Math.pow(a - predicted[i], 2));
  return Math.sqrt(squaredErrors.reduce((sum, e) => sum + e, 0) / squaredErrors.length);
}

/** Score predictions that were generated from one declared forecast origin. */
export function calculateForecastErrorMetrics(
  actual: number[],
  predicted: number[],
): { mae: number; mape: number; rmse: number } {
  if (actual.length !== predicted.length || actual.length === 0) {
    return { mae: Number.NaN, mape: Number.NaN, rmse: Number.NaN };
  }

  return {
    mae: calculateMAE(actual, predicted),
    mape: calculateMAPE(actual, predicted),
    rmse: calculateRMSE(actual, predicted),
  };
}

/**
 * Persistence Baseline: Predicts future = current value
 * This is the simplest naive forecast: "tomorrow will be like today"
 */
export function calculatePersistenceBaseline(
  actual: number[],
  horizon: number = 1,
): { mae: number; mape: number; rmse: number } {
  if (actual.length <= horizon) {
    return { mae: Number.NaN, mape: Number.NaN, rmse: Number.NaN };
  }

  // For persistence at horizon h: forecast[t+h] = actual[t]
  const forecasts: number[] = [];
  const actuals: number[] = [];

  for (let i = 0; i < actual.length - horizon; i++) {
    forecasts.push(actual[i]); // Persistence: use current value
    actuals.push(actual[i + horizon]); // Compare to actual future value
  }

  return {
    mae: calculateMAE(actuals, forecasts),
    mape: calculateMAPE(actuals, forecasts),
    rmse: calculateRMSE(actuals, forecasts),
  };
}

/**
 * Seasonal Naive Baseline: Predicts future = same time last week
 * This accounts for weekly patterns (e.g., weekday vs weekend)
 */
export function calculateSeasonalNaiveBaseline(
  actual: number[],
  horizon: number = 1,
  seasonalPeriod: number = 168, // 1 week in hours
): { mae: number; mape: number; rmse: number } {
  if (actual.length < seasonalPeriod + horizon) {
    return { mae: Number.NaN, mape: Number.NaN, rmse: Number.NaN };
  }

  // For seasonal naive at horizon h: forecast[t+h] = actual[t+h-168]
  const forecasts: number[] = [];
  const actuals: number[] = [];

  for (
    let targetIndex = seasonalPeriod - 1 + horizon;
    targetIndex < actual.length;
    targetIndex += 1
  ) {
    const forecastOrigin = targetIndex - horizon;
    let sourceIndex = targetIndex - seasonalPeriod;
    while (sourceIndex > forecastOrigin) sourceIndex -= seasonalPeriod;
    if (sourceIndex < 0) continue;

    forecasts.push(actual[sourceIndex]); // Repeat the last observed seasonal pattern.
    actuals.push(actual[targetIndex]);
  }

  return {
    mae: calculateMAE(actuals, forecasts),
    mape: calculateMAPE(actuals, forecasts),
    rmse: calculateRMSE(actuals, forecasts),
  };
}

/**
 * Calculate confidence interval using bootstrap
 */
export function calculateBootstrapCI(
  errors: number[],
  confidence: number = 0.95,
  nBootstrap: number = 1000,
): { lower: number; upper: number } {
  if (errors.length === 0) {
    return { lower: 0, upper: 0 };
  }

  const means: number[] = [];
  const n = errors.length;

  for (let i = 0; i < nBootstrap; i++) {
    // Resample with replacement
    const sample: number[] = [];
    for (let j = 0; j < n; j++) {
      const idx = Math.floor(Math.random() * n);
      sample.push(errors[idx]);
    }

    const mean = sample.reduce((sum, e) => sum + e, 0) / n;
    means.push(mean);
  }

  means.sort((a, b) => a - b);

  const alpha = 1 - confidence;
  const lowerIdx = Math.floor((alpha / 2) * nBootstrap);
  const upperIdx = Math.floor((1 - alpha / 2) * nBootstrap);

  return {
    lower: means[lowerIdx],
    upper: means[upperIdx],
  };
}

/**
 * Calculate uplift percentage vs baseline
 */
export function calculateUplift(modelMAE: number, baselineMAE: number): number {
  if (!Number.isFinite(baselineMAE) || baselineMAE <= 0 || !Number.isFinite(modelMAE)) return 0;
  return ((baselineMAE - modelMAE) / baselineMAE) * 100;
}

export interface BaselineMetrics {
  persistence: { mae: number; mape: number; rmse: number };
  seasonalNaive: { mae: number; mape: number; rmse: number };
  uplift: {
    vsPersistence: number;
    vsSeasonalNaive: number;
  };
  sampleCount: number;
  confidence: { lower: number; upper: number };
}

/**
 * Comprehensive baseline comparison for a forecast model
 */
export function compareToBaselines(
  actual: number[],
  modelPredictions: number[],
  horizon: number = 1,
): BaselineMetrics {
  // Calculate model performance
  const modelMAE = calculateMAE(actual, modelPredictions);
  const modelMAPE = calculateMAPE(actual, modelPredictions);
  const modelRMSE = calculateRMSE(actual, modelPredictions);

  // Calculate persistence baseline
  const persistence = calculatePersistenceBaseline(actual, horizon);

  // Calculate seasonal naive baseline
  const seasonalNaive = calculateSeasonalNaiveBaseline(actual, horizon);

  // Calculate uplift
  const upliftPersistence = calculateUplift(modelMAE, persistence.mae);
  const upliftSeasonal = calculateUplift(modelMAE, seasonalNaive.mae);

  // Calculate confidence intervals
  const errors = actual.map((a, i) => Math.abs(a - modelPredictions[i]));
  const ci = calculateBootstrapCI(errors);

  return {
    persistence,
    seasonalNaive,
    uplift: {
      vsPersistence: upliftPersistence,
      vsSeasonalNaive: upliftSeasonal,
    },
    sampleCount: actual.length,
    confidence: ci,
  };
}

/**
 * Format baseline comparison for display
 */
export function formatBaselineComparison(modelMAE: number, metrics: BaselineMetrics): string {
  return `
Model MAE: ${modelMAE.toFixed(2)}%
Persistence MAE: ${metrics.persistence.mae.toFixed(2)}%
Seasonal Naive MAE: ${metrics.seasonalNaive.mae.toFixed(2)}%

Uplift vs Persistence: +${metrics.uplift.vsPersistence.toFixed(1)}%
Uplift vs Seasonal Naive: +${metrics.uplift.vsSeasonalNaive.toFixed(1)}%

Sample Count: ${metrics.sampleCount}
95% CI: [${metrics.confidence.lower.toFixed(2)}, ${metrics.confidence.upper.toFixed(2)}]
  `.trim();
}

/**
 * Determine if forecast meets industry standards
 * Solar: MAE < 6%, Wind: MAE < 8%
 */
export function meetsIndustryStandard(
  mae: number,
  sourceType: 'solar' | 'wind',
): { meets: boolean; target: number; margin: number } {
  const target = sourceType === 'solar' ? 6 : 8;
  const meets = mae <= target;
  const margin = target - mae;

  return { meets, target, margin };
}

/**
 * Calculate skill score (relative improvement over baseline)
 * Skill Score = 1 - (Model Error / Baseline Error)
 * Perfect model = 1, Same as baseline = 0, Worse than baseline < 0
 */
export function calculateSkillScore(modelMAE: number, baselineMAE: number): number {
  if (
    !Number.isFinite(baselineMAE) ||
    baselineMAE <= 0 ||
    !Number.isFinite(modelMAE) ||
    modelMAE < 0
  )
    return Number.NaN;
  return 1 - modelMAE / baselineMAE;
}
