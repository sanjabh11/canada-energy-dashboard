export interface StreamHealthCounts {
  healthy: number;
  degraded: number;
  error: number;
  total: number;
}

export function computeStreamHealthRatio(summary: StreamHealthCounts): number | null {
  if (summary.total <= 0) return null;
  return (summary.healthy + (summary.degraded * 0.5)) / summary.total;
}

export function computeRatePercent(successful: number, total: number): number | null {
  if (total <= 0) return null;
  return (successful / total) * 100;
}

export function computeAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function freshnessFactor(dataFreshnessMinutes: number | null): number | null {
  if (dataFreshnessMinutes === null) return null;
  if (dataFreshnessMinutes <= 10) return 1;
  if (dataFreshnessMinutes <= 60) return 0.99;
  return 0.96;
}
