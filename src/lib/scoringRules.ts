import type { QuantileForecast } from './conformalPrediction';

export function pinballLoss(actual: number, forecast: number, quantile: number): number {
  const d = actual - forecast;
  return Math.max(quantile * d, (quantile - 1) * d);
}

export function meanPinballLoss(a: number[], f: number[], q: number): number {
  if (a.length !== f.length) throw new Error('len mismatch');
  if (!a.length) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += pinballLoss(a[i], f[i], q);
  return s / a.length;
}

export function computeCRPS(a: number[], p10: number[], p50: number[], p90: number[]): number {
  return (
    (meanPinballLoss(a, p10, 0.1) + meanPinballLoss(a, p50, 0.5) + meanPinballLoss(a, p90, 0.9)) / 3
  );
}

export function computeBrierScore(probs: number[], outcomes: number[]): number {
  if (probs.length !== outcomes.length) throw new Error('len mismatch');
  if (!probs.length) return 0;
  let s = 0;
  for (let i = 0; i < probs.length; i++) {
    const d = probs[i] - outcomes[i];
    s += d * d;
  }
  return s / probs.length;
}

export function computeCoverageRate(a: number[], lo: number[], hi: number[]): number {
  if (a.length !== lo.length || a.length !== hi.length) throw new Error('len mismatch');
  if (!a.length) return 0;
  let c = 0;
  for (let i = 0; i < a.length; i++) if (a[i] >= lo[i] && a[i] <= hi[i]) c++;
  return c / a.length;
}

export function computeMAE(a: number[], f: number[]): number {
  if (a.length !== f.length) throw new Error('len mismatch');
  if (!a.length) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - f[i]);
  return s / a.length;
}

export function computeRMSE(a: number[], f: number[]): number {
  if (a.length !== f.length) throw new Error('len mismatch');
  if (!a.length) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - f[i];
    s += d * d;
  }
  return Math.sqrt(s / a.length);
}

export function computeMAPE(a: number[], f: number[]): number {
  if (a.length !== f.length) throw new Error('len mismatch');
  let s = 0,
    n = 0;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i]) > 1e-6) {
      s += Math.abs((a[i] - f[i]) / a[i]);
      n++;
    }
  }
  return n ? (s / n) * 100 : 0;
}

export function computeSkillScore(modelMAE: number, baselineMAE: number): number {
  if (baselineMAE === 0) return 0;
  return (baselineMAE - modelMAE) / baselineMAE;
}

export interface ForecastEvaluationInput {
  actuals: number[];
  pointForecast: number[];
  p10?: number[];
  p50?: number[];
  p90?: number[];
  lower?: number[];
  upper?: number[];
  baselineMAE?: number;
}

export function evaluateForecast(input: ForecastEvaluationInput): Record<string, number> {
  const { actuals, pointForecast } = input;
  const metrics: Record<string, number> = {
    mae: computeMAE(actuals, pointForecast),
    rmse: computeRMSE(actuals, pointForecast),
    mape: computeMAPE(actuals, pointForecast),
  };
  if (input.p10 && input.p50 && input.p90) {
    metrics.crps = computeCRPS(actuals, input.p10, input.p50, input.p90);
    metrics.pinball_loss = meanPinballLoss(actuals, input.p50, 0.5);
  }
  if (input.lower && input.upper) {
    metrics.coverage_rate = computeCoverageRate(actuals, input.lower, input.upper);
  }
  if (input.baselineMAE !== undefined) {
    metrics.skill_score = computeSkillScore(metrics.mae, input.baselineMAE);
  }
  return metrics;
}
