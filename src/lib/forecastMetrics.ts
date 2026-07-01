// ============================================================================
// Forecast Metrics — Error metrics and benchmark comparison helpers
//
// Pure functions for computing forecast accuracy metrics (MAE, MAPE, RMSE,
// skill scores, R²) and comparing model performance against baselines.
// ============================================================================

import type { ForecastMetrics } from './demandForecaster';

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function computeMetrics(
  actuals: number[],
  predictions: number[],
  persistence: { mae: number; mape: number; rmse: number },
  seasonal: { mae: number; mape: number; rmse: number },
): ForecastMetrics {
  if (actuals.length === 0 || predictions.length === 0) {
    return zeroMetrics();
  }

  const mae = meanAbsoluteError(actuals, predictions);
  const mape = meanAbsolutePercentageError(actuals, predictions);
  const rmse = rootMeanSquaredError(actuals, predictions);
  const meanActual = actuals.reduce((sum, value) => sum + value, 0) / actuals.length;
  const ssRes = actuals.reduce((sum, actual, index) => sum + (actual - predictions[index]) ** 2, 0);
  const ssTot = actuals.reduce((sum, actual) => sum + (actual - meanActual) ** 2, 0);

  return {
    mae: round(mae, 2),
    mape: round(mape, 2),
    rmse: round(rmse, 2),
    persistence_mae: round(persistence.mae, 2),
    persistence_mape: round(persistence.mape, 2),
    persistence_rmse: round(persistence.rmse, 2),
    seasonal_naive_mae: round(seasonal.mae, 2),
    seasonal_naive_mape: round(seasonal.mape, 2),
    seasonal_naive_rmse: round(seasonal.rmse, 2),
    skill_score_vs_persistence: persistence.mae > 0 ? round((1 - mae / persistence.mae) * 100, 2) : 0,
    skill_score_vs_seasonal: seasonal.mae > 0 ? round((1 - mae / seasonal.mae) * 100, 2) : 0,
    r_squared: ssTot > 0 ? round(1 - ssRes / ssTot, 2) : 0,
    sample_size: actuals.length,
  };
}

export function zeroMetrics(): ForecastMetrics {
  return {
    mae: 0,
    mape: 0,
    rmse: 0,
    persistence_mae: 0,
    persistence_mape: 0,
    persistence_rmse: 0,
    seasonal_naive_mae: 0,
    seasonal_naive_mape: 0,
    seasonal_naive_rmse: 0,
    skill_score_vs_persistence: 0,
    skill_score_vs_seasonal: 0,
    r_squared: 0,
    sample_size: 0,
  };
}

export function meanAbsoluteError(actuals: number[], predictions: number[]): number {
  return actuals.reduce((sum, actual, index) => sum + Math.abs(actual - predictions[index]), 0) / actuals.length;
}

export function meanAbsolutePercentageError(actuals: number[], predictions: number[]): number {
  return (
    actuals.reduce((sum, actual, index) => {
      if (actual === 0) return sum;
      return sum + Math.abs((actual - predictions[index]) / actual);
    }, 0) / actuals.length
  ) * 100;
}

export function rootMeanSquaredError(actuals: number[], predictions: number[]): number {
  return Math.sqrt(
    actuals.reduce((sum, actual, index) => sum + (actual - predictions[index]) ** 2, 0) / actuals.length,
  );
}

export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return { slope: 0, intercept: 0 };
  }

  const count = x.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let index = 0; index < count; index += 1) {
    sumX += x[index];
    sumY += y[index];
    sumXY += x[index] * y[index];
    sumXX += x[index] * x[index];
  }

  const denominator = count * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-10) {
    return { slope: 0, intercept: sumY / count };
  }

  const slope = (count * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / count;
  return { slope, intercept };
}

export function buildForecastBenchmarkFailureNotes(benchmark: ForecastMetrics): string[] {
  const baselineCandidates = [
    { label: 'persistence baseline', mae: benchmark.persistence_mae },
    { label: 'seasonal-naive baseline', mae: benchmark.seasonal_naive_mae },
  ].filter((candidate) => Number.isFinite(candidate.mae) && candidate.mae > 0);

  if (!Number.isFinite(benchmark.mae) || benchmark.mae <= 0 || benchmark.sample_size <= 0 || baselineCandidates.length === 0) {
    return [];
  }

  const bestBaseline = baselineCandidates.reduce((best, candidate) => (
    candidate.mae < best.mae ? candidate : best
  ));

  if (benchmark.mae <= bestBaseline.mae) {
    return [];
  }

  return [
    `Baseline win: ${bestBaseline.label} MAE ${bestBaseline.mae.toFixed(2)} MW beats transparent trend-seasonal MAE ${benchmark.mae.toFixed(2)} MW; treat accuracy uplift as unproven and review model inputs before making buyer-facing accuracy claims.`,
  ];
}
