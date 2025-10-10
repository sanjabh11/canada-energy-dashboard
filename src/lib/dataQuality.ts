/**
 * Data Quality & Completeness Filters
 * 
 * Ensures award evidence metrics exclude low-quality data periods.
 * Industry standard: ≥95% completeness for headline KPIs.
 */

import type { ProvenanceMetadata } from './types/provenance';

export interface DataQualityMetrics {
  expected_points: number;
  actual_points: number;
  completeness_percent: number;
  missing_points: number;
  quality_grade: 'excellent' | 'good' | 'acceptable' | 'poor' | 'insufficient';
  meets_award_standard: boolean;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number | null;
  quality?: number;
  provenance?: ProvenanceMetadata;
}

/**
 * Calculate data completeness for a time window
 * 
 * @param data - Time series data points
 * @param expectedInterval - Expected interval in minutes (e.g., 15, 30, 60)
 * @param windowStart - Start of evaluation window
 * @param windowEnd - End of evaluation window
 */
export function calculateCompleteness(
  data: TimeSeriesPoint[],
  expectedInterval: number,
  windowStart: Date,
  windowEnd: Date
): DataQualityMetrics {
  const windowDuration = (windowEnd.getTime() - windowStart.getTime()) / (60 * 1000); // minutes
  const expectedPoints = Math.floor(windowDuration / expectedInterval);
  
  // Count valid data points within window
  const validPoints = data.filter(d => {
    const timestamp = new Date(d.timestamp);
    return (
      d.value !== null &&
      !isNaN(d.value) &&
      timestamp >= windowStart &&
      timestamp <= windowEnd
    );
  }).length;

  const completeness = (validPoints / Math.max(expectedPoints, 1)) * 100;
  const missing = expectedPoints - validPoints;

  // Grade assignment
  let grade: DataQualityMetrics['quality_grade'];
  if (completeness >= 98) {
    grade = 'excellent';
  } else if (completeness >= 95) {
    grade = 'good';
  } else if (completeness >= 90) {
    grade = 'acceptable';
  } else if (completeness >= 70) {
    grade = 'poor';
  } else {
    grade = 'insufficient';
  }

  return {
    expected_points: expectedPoints,
    actual_points: validPoints,
    completeness_percent: completeness,
    missing_points: missing,
    quality_grade: grade,
    meets_award_standard: completeness >= 95,
  };
}

/**
 * Filter time series to only include high-quality periods
 * 
 * Returns only data from days/windows meeting minimum completeness threshold
 */
export function filterHighQualityPeriods(
  data: TimeSeriesPoint[],
  expectedInterval: number,
  minCompleteness: number = 95,
  periodHours: number = 24
): TimeSeriesPoint[] {
  if (data.length === 0) return [];

  // Group by periods
  const periods = new Map<string, TimeSeriesPoint[]>();
  
  data.forEach(point => {
    const timestamp = new Date(point.timestamp);
    const periodKey = getPeriodKey(timestamp, periodHours);
    
    if (!periods.has(periodKey)) {
      periods.set(periodKey, []);
    }
    periods.get(periodKey)!.push(point);
  });

  // Filter periods by completeness
  const highQualityData: TimeSeriesPoint[] = [];

  periods.forEach((periodData, periodKey) => {
    const [start, end] = parsePeriodKey(periodKey, periodHours);
    const quality = calculateCompleteness(
      periodData,
      expectedInterval,
      start,
      end
    );

    if (quality.completeness_percent >= minCompleteness) {
      highQualityData.push(...periodData);
    }
  });

  return highQualityData.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Calculate daily completeness summary
 */
export interface DailyQuality {
  date: string;
  completeness_percent: number;
  quality_grade: DataQualityMetrics['quality_grade'];
  sample_count: number;
  meets_standard: boolean;
}

export function calculateDailyQuality(
  data: TimeSeriesPoint[],
  expectedInterval: number
): DailyQuality[] {
  const dailyData = new Map<string, TimeSeriesPoint[]>();

  data.forEach(point => {
    const date = new Date(point.timestamp).toISOString().split('T')[0];
    if (!dailyData.has(date)) {
      dailyData.set(date, []);
    }
    dailyData.get(date)!.push(point);
  });

  const results: DailyQuality[] = [];

  dailyData.forEach((dayData, date) => {
    const start = new Date(date + 'T00:00:00Z');
    const end = new Date(date + 'T23:59:59Z');
    
    const quality = calculateCompleteness(dayData, expectedInterval, start, end);

    results.push({
      date,
      completeness_percent: quality.completeness_percent,
      quality_grade: quality.quality_grade,
      sample_count: quality.actual_points,
      meets_standard: quality.meets_award_standard,
    });
  });

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get period key for grouping (e.g., "2024-10-01" for daily)
 */
function getPeriodKey(timestamp: Date, periodHours: number): string {
  if (periodHours === 24) {
    return timestamp.toISOString().split('T')[0];
  } else {
    const periodStart = new Date(timestamp);
    periodStart.setHours(Math.floor(timestamp.getHours() / periodHours) * periodHours, 0, 0, 0);
    return periodStart.toISOString();
  }
}

/**
 * Parse period key back to start/end dates
 */
function parsePeriodKey(periodKey: string, periodHours: number): [Date, Date] {
  const start = new Date(periodKey);
  const end = new Date(start.getTime() + periodHours * 60 * 60 * 1000);
  return [start, end];
}

/**
 * Calculate aggregate quality metrics
 */
export interface AggregateQuality {
  total_periods: number;
  high_quality_periods: number;
  high_quality_percent: number;
  average_completeness: number;
  total_samples: number;
  valid_samples: number;
}

export function calculateAggregateQuality(
  dailyQuality: DailyQuality[]
): AggregateQuality {
  const total = dailyQuality.length;
  const highQuality = dailyQuality.filter(d => d.meets_standard).length;
  const avgCompleteness = dailyQuality.reduce((sum, d) => sum + d.completeness_percent, 0) / Math.max(total, 1);
  const totalSamples = dailyQuality.reduce((sum, d) => sum + d.sample_count, 0);

  return {
    total_periods: total,
    high_quality_periods: highQuality,
    high_quality_percent: (highQuality / Math.max(total, 1)) * 100,
    average_completeness: avgCompleteness,
    total_samples: totalSamples,
    valid_samples: totalSamples, // Simplified - already filtered
  };
}

/**
 * Quality filter for forecast evaluation
 * 
 * Only include forecasts where both prediction and actual have high quality
 */
export interface ForecastPair {
  forecast: number;
  actual: number;
  timestamp: string;
  forecast_quality?: number;
  actual_quality?: number;
}

export function filterHighQualityForecasts(
  forecasts: ForecastPair[],
  minQuality: number = 0.95
): ForecastPair[] {
  return forecasts.filter(f => {
    const fquality = f.forecast_quality ?? 1.0;
    const aquality = f.actual_quality ?? 1.0;
    return fquality >= minQuality && aquality >= minQuality;
  });
}

/**
 * Add completeness metadata to metrics
 */
export interface MetricWithQuality<T> {
  value: T;
  sample_count: number;
  completeness_percent: number;
  quality_grade: string;
  includes_award_grade_data_only: boolean;
}

export function annotateWithQuality<T>(
  value: T,
  quality: DataQualityMetrics
): MetricWithQuality<T> {
  return {
    value,
    sample_count: quality.actual_points,
    completeness_percent: quality.completeness_percent,
    quality_grade: quality.quality_grade,
    includes_award_grade_data_only: quality.meets_award_standard,
  };
}

/**
 * Quality badge for UI display
 */
export function getQualityBadge(completeness: number): {
  label: string;
  color: string;
  icon: string;
} {
  if (completeness >= 98) {
    return { label: 'Excellent', color: 'green', icon: '⭐' };
  } else if (completeness >= 95) {
    return { label: 'Good', color: 'blue', icon: '✓' };
  } else if (completeness >= 90) {
    return { label: 'Acceptable', color: 'yellow', icon: '○' };
  } else if (completeness >= 70) {
    return { label: 'Poor', color: 'orange', icon: '⚠' };
  } else {
    return { label: 'Insufficient', color: 'red', icon: '✗' };
  }
}

/**
 * Calculate gap analysis for missing data
 */
export interface DataGap {
  start: string;
  end: string;
  duration_minutes: number;
  expected_points: number;
  severity: 'minor' | 'moderate' | 'major';
}

export function findDataGaps(
  data: TimeSeriesPoint[],
  expectedInterval: number,
  minGapMinutes: number = 60
): DataGap[] {
  if (data.length < 2) return [];

  const gaps: DataGap[] = [];
  const sorted = [...data].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].timestamp);
    const curr = new Date(sorted[i].timestamp);
    const gapMinutes = (curr.getTime() - prev.getTime()) / (60 * 1000);

    if (gapMinutes > expectedInterval * 1.5 && gapMinutes >= minGapMinutes) {
      const expectedPoints = Math.floor(gapMinutes / expectedInterval) - 1;
      
      let severity: DataGap['severity'];
      if (gapMinutes < 180) {
        severity = 'minor';
      } else if (gapMinutes < 720) {
        severity = 'moderate';
      } else {
        severity = 'major';
      }

      gaps.push({
        start: sorted[i - 1].timestamp,
        end: sorted[i].timestamp,
        duration_minutes: gapMinutes,
        expected_points: expectedPoints,
        severity,
      });
    }
  }

  return gaps;
}
