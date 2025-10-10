/**
 * Baseline Forecast Models
 * 
 * Implements naive forecasting methods for comparison:
 * - Persistence (t+1 = t)
 * - Seasonal Naive (t+1 = same hour last week/day)
 * 
 * Essential for proving AI/ML value over simple heuristics.
 */

export interface ForecastBaseline {
  method: 'persistence' | 'seasonal_naive_daily' | 'seasonal_naive_weekly';
  predicted_value: number;
  confidence_interval_lower: number;
  confidence_interval_upper: number;
  notes: string;
}

export interface BaselineComparison {
  ai_forecast: number;
  persistence: number;
  seasonal_naive: number;
  ai_improvement_vs_persistence_percent: number;
  ai_improvement_vs_seasonal_percent: number;
  recommended_method: string;
}

/**
 * Persistence Forecast: Next value = current value
 * 
 * Simplest baseline - assumes no change. Surprisingly effective
 * for short horizons (1-3h) in stable conditions.
 */
export function persistenceForecast(
  currentValue: number,
  historicalStdDev?: number
): ForecastBaseline {
  const stdDev = historicalStdDev || currentValue * 0.15; // Default 15% variability
  
  return {
    method: 'persistence',
    predicted_value: currentValue,
    confidence_interval_lower: Math.max(0, currentValue - 1.96 * stdDev),
    confidence_interval_upper: currentValue + 1.96 * stdDev,
    notes: 'Assumes no change from current value',
  };
}

/**
 * Seasonal Naive Forecast: Next value = same hour yesterday
 * 
 * Captures daily patterns (solar follows sun, demand follows schedules).
 * Better than persistence for 6-24h horizons.
 */
export function seasonalNaiveDailyForecast(
  sameHourYesterday: number,
  historicalStdDev?: number
): ForecastBaseline {
  const stdDev = historicalStdDev || sameHourYesterday * 0.20; // 20% variability
  
  return {
    method: 'seasonal_naive_daily',
    predicted_value: sameHourYesterday,
    confidence_interval_lower: Math.max(0, sameHourYesterday - 1.96 * stdDev),
    confidence_interval_upper: sameHourYesterday + 1.96 * stdDev,
    notes: 'Assumes same value as 24h ago',
  };
}

/**
 * Seasonal Naive Forecast: Next value = same hour last week
 * 
 * Captures weekly patterns (weekday vs weekend). Useful for
 * demand forecasting and longer horizons (24-48h).
 */
export function seasonalNaiveWeeklyForecast(
  sameHourLastWeek: number,
  historicalStdDev?: number
): ForecastBaseline {
  const stdDev = historicalStdDev || sameHourLastWeek * 0.25; // 25% variability
  
  return {
    method: 'seasonal_naive_weekly',
    predicted_value: sameHourLastWeek,
    confidence_interval_lower: Math.max(0, sameHourLastWeek - 1.96 * stdDev),
    confidence_interval_upper: sameHourLastWeek + 1.96 * stdDev,
    notes: 'Assumes same value as 7 days ago',
  };
}

/**
 * Calculate forecast error metrics (MAE, MAPE, RMSE)
 */
export interface ForecastError {
  mae: number;          // Mean Absolute Error
  mape: number;         // Mean Absolute Percentage Error
  rmse: number;         // Root Mean Squared Error
  sample_count: number;
}

export function calculateForecastError(
  forecasts: number[],
  actuals: number[]
): ForecastError {
  if (forecasts.length !== actuals.length || forecasts.length === 0) {
    return { mae: 0, mape: 0, rmse: 0, sample_count: 0 };
  }

  let sumAbsError = 0;
  let sumAbsPercentError = 0;
  let sumSquaredError = 0;
  let validSamples = 0;

  for (let i = 0; i < forecasts.length; i++) {
    const forecast = forecasts[i];
    const actual = actuals[i];

    // Skip invalid values
    if (actual === 0 || isNaN(forecast) || isNaN(actual)) {
      continue;
    }

    const absError = Math.abs(forecast - actual);
    sumAbsError += absError;
    sumAbsPercentError += (absError / actual) * 100;
    sumSquaredError += (forecast - actual) ** 2;
    validSamples++;
  }

  if (validSamples === 0) {
    return { mae: 0, mape: 0, rmse: 0, sample_count: 0 };
  }

  return {
    mae: sumAbsError / validSamples,
    mape: sumAbsPercentError / validSamples,
    rmse: Math.sqrt(sumSquaredError / validSamples),
    sample_count: validSamples,
  };
}

/**
 * Compare AI forecast against baselines
 * 
 * Returns improvement percentages and recommended method.
 */
export function compareToBaselines(
  aiForecast: number,
  actual: number,
  persistence: number,
  seasonalNaive: number
): BaselineComparison {
  const aiError = Math.abs(aiForecast - actual);
  const persistenceError = Math.abs(persistence - actual);
  const seasonalError = Math.abs(seasonalNaive - actual);

  // Calculate improvement (negative = AI worse than baseline)
  const improvementVsPersistence = 
    ((persistenceError - aiError) / Math.max(persistenceError, 0.01)) * 100;
  
  const improvementVsSeasonal = 
    ((seasonalError - aiError) / Math.max(seasonalError, 0.01)) * 100;

  // Determine best method
  const errors = [
    { method: 'AI Forecast', error: aiError },
    { method: 'Persistence', error: persistenceError },
    { method: 'Seasonal Naive', error: seasonalError },
  ];
  const best = errors.reduce((min, curr) => curr.error < min.error ? curr : min);

  return {
    ai_forecast: aiForecast,
    persistence,
    seasonal_naive: seasonalNaive,
    ai_improvement_vs_persistence_percent: improvementVsPersistence,
    ai_improvement_vs_seasonal_percent: improvementVsSeasonal,
    recommended_method: best.method,
  };
}

/**
 * Select best baseline for a given forecast horizon
 * 
 * Rules of thumb:
 * - 1h: Persistence often wins
 * - 3-6h: Seasonal naive daily
 * - 12-24h: Seasonal naive daily or weekly
 * - 48h+: Seasonal naive weekly
 */
export function selectBaselineForHorizon(
  horizonHours: number,
  currentValue: number,
  sameHourYesterday?: number,
  sameHourLastWeek?: number
): ForecastBaseline {
  if (horizonHours <= 3) {
    return persistenceForecast(currentValue);
  } else if (horizonHours <= 24 && sameHourYesterday !== undefined) {
    return seasonalNaiveDailyForecast(sameHourYesterday);
  } else if (sameHourLastWeek !== undefined) {
    return seasonalNaiveWeeklyForecast(sameHourLastWeek);
  } else {
    // Fallback to persistence
    return persistenceForecast(currentValue);
  }
}

/**
 * Calculate rolling baseline performance over time window
 * 
 * Used for aggregate metrics like "AI forecast improved 56% over
 * persistence baseline across 720 forecasts"
 */
export interface BaselinePerformance {
  method: string;
  mae: number;
  mape: number;
  rmse: number;
  sample_count: number;
  vs_ai_improvement_percent: number;
}

export function calculateBaselinePerformance(
  aiForecasts: number[],
  actuals: number[],
  baselineForecasts: number[],
  baselineMethod: string
): BaselinePerformance {
  const aiError = calculateForecastError(aiForecasts, actuals);
  const baselineError = calculateForecastError(baselineForecasts, actuals);

  const improvement = baselineError.mae > 0
    ? ((baselineError.mae - aiError.mae) / baselineError.mae) * 100
    : 0;

  return {
    method: baselineMethod,
    mae: baselineError.mae,
    mape: baselineError.mape,
    rmse: baselineError.rmse,
    sample_count: baselineError.sample_count,
    vs_ai_improvement_percent: improvement,
  };
}

/**
 * Generate baseline forecasts from historical data
 * 
 * Helper function to compute persistence and seasonal baselines
 * from a time series array.
 */
export function generateBaselinesFromHistory(
  historicalData: Array<{ timestamp: string; value: number }>,
  targetTimestamp: string,
  horizonHours: number
): {
  persistence?: number;
  seasonal_daily?: number;
  seasonal_weekly?: number;
} {
  const targetTime = new Date(targetTimestamp).getTime();
  const currentTime = targetTime - horizonHours * 60 * 60 * 1000;

  // Find current value (for persistence)
  const current = historicalData.find(d => 
    Math.abs(new Date(d.timestamp).getTime() - currentTime) < 30 * 60 * 1000 // 30 min window
  );

  // Find same hour yesterday
  const oneDayAgo = currentTime - 24 * 60 * 60 * 1000;
  const yesterday = historicalData.find(d =>
    Math.abs(new Date(d.timestamp).getTime() - oneDayAgo) < 30 * 60 * 1000
  );

  // Find same hour last week
  const oneWeekAgo = currentTime - 7 * 24 * 60 * 60 * 1000;
  const lastWeek = historicalData.find(d =>
    Math.abs(new Date(d.timestamp).getTime() - oneWeekAgo) < 30 * 60 * 1000
  );

  return {
    persistence: current?.value,
    seasonal_daily: yesterday?.value,
    seasonal_weekly: lastWeek?.value,
  };
}
