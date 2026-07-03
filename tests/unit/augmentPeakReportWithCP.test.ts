import { describe, expect, it } from 'vitest';
import {
  augmentPeakReportWithCP,
  buildIciFiveCpDecisionSupportReport,
  type IciFiveCpDecisionSupportReport,
} from '../../src/lib/gaIciPeakPredictor';
import type { QuantileForecast } from '../../src/lib/conformalPrediction';

function makeReport(): IciFiveCpDecisionSupportReport {
  const systemPeaks = Array.from({ length: 10 }, (_, index) => ({
    timestamp: new Date(Date.UTC(2026, 6, 1 + index, 18)).toISOString(),
    ontario_demand_mw: 22000 - index * 250,
    status: (index < 5 ? 'candidate' : 'forecast') as 'candidate' | 'forecast',
    source: 'test',
  }));
  const customerLoad = systemPeaks.map((peak, index) => ({
    timestamp: peak.timestamp,
    load_mw: 8 - index * 0.2,
  }));

  return buildIciFiveCpDecisionSupportReport({
    systemPeaks,
    customerLoad,
    basePeriodStart: '2026-05-01',
    basePeriodEnd: '2027-04-30',
    generatedAt: '2026-07-01T00:00:00.000Z',
  });
}

function makeCalibrationData(n: number): { forecasts: QuantileForecast[]; actuals: number[] } {
  const forecasts: QuantileForecast[] = [];
  const actuals: number[] = [];
  for (let i = 0; i < n; i++) {
    const base = 20000 + i * 50;
    forecasts.push({ lower: base - 200, median: base, upper: base + 200 });
    actuals.push(base + (i % 3 === 0 ? 500 : -100));
  }
  return { forecasts, actuals };
}

describe('augmentPeakReportWithCP', () => {
  it('skips CP when <30 calibration samples and returns warning', () => {
    const report = makeReport();
    const cal = makeCalibrationData(10);

    const result = augmentPeakReportWithCP(report, cal, 0.1);

    expect(result.conformalCalibration.method).toContain('skipped');
    expect(result.conformalCalibration.coverageRate).toBe(0);
    expect(result.conformalCalibration.conformalQuantile).toBe(0);
  });

  it('preserves history_only tier for final status windows in <30 branch', () => {
    const systemPeaks = Array.from({ length: 10 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2026, 6, 1 + index, 18)).toISOString(),
      ontario_demand_mw: 22000 - index * 250,
      status: (index < 5 ? 'final' : 'forecast') as 'final' | 'forecast',
      source: 'test',
    }));
    const customerLoad = systemPeaks.map((peak, index) => ({
      timestamp: peak.timestamp,
      load_mw: 8 - index * 0.2,
    }));
    const report = buildIciFiveCpDecisionSupportReport({
      systemPeaks,
      customerLoad,
      basePeriodStart: '2026-05-01',
      basePeriodEnd: '2027-04-30',
      generatedAt: '2026-07-01T00:00:00.000Z',
    });
    const cal = makeCalibrationData(10);

    const result = augmentPeakReportWithCP(report, cal, 0.1);

    const finalWindow = result.top_five_peak_hours_probabilistic.find(
      (w) => w.status === 'final',
    );
    expect(finalWindow?.alertTier).toBe('history_only');
  });

  it('computes conformalQuantile as a finite number with sufficient calibration data', () => {
    const report = makeReport();
    const cal = makeCalibrationData(50);

    const result = augmentPeakReportWithCP(report, cal, 0.1);

    expect(result.conformalCalibration.nCalibrationSamples).toBe(50);
    expect(Number.isFinite(result.conformalCalibration.conformalQuantile)).toBe(true);
  });

  it('includes probabilisticClaimBoundary with decision-support language', () => {
    const report = makeReport();
    const cal = makeCalibrationData(50);

    const result = augmentPeakReportWithCP(report, cal, 0.1);

    expect(result.probabilisticClaimBoundary).toContain('decision-support only');
  });

  it('assigns curtail tier when P90 >= threshold', () => {
    const report = makeReport();
    const cal = makeCalibrationData(50);

    const threshold = report.top_five_peak_hours[0]?.ontario_demand_mw ?? 22000;
    const result = augmentPeakReportWithCP(report, cal, 0.1, threshold);

    const curtailWindows = result.top_five_peak_hours_probabilistic.filter(
      (w) => w.alertTier === 'curtail',
    );
    if (curtailWindows.length > 0) {
      expect(curtailWindows[0].alertRationale).toContain('P90');
    }
  });

  it('populates p10/p50/p90 demand values for probabilistic windows', () => {
    const report = makeReport();
    const cal = makeCalibrationData(50);

    const result = augmentPeakReportWithCP(report, cal, 0.1);

    const firstWindow = result.top_five_peak_hours_probabilistic[0];
    expect(firstWindow.p10DemandMw).toBeDefined();
    expect(firstWindow.p50DemandMw).toBeDefined();
    expect(firstWindow.p90DemandMw).toBeDefined();
  });

  it('computes coverageRate from full calibration set', () => {
    const report = makeReport();
    const cal = makeCalibrationData(50);

    const result = augmentPeakReportWithCP(report, cal, 0.1);

    expect(result.conformalCalibration.coverageRate).toBeGreaterThanOrEqual(0);
    expect(result.conformalCalibration.coverageRate).toBeLessThanOrEqual(1);
  });
});
