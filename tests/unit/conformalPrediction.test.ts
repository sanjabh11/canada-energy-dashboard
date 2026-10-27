import { describe, expect, it } from 'vitest';
import {
  ConformalPredictor,
  RollingCalibrationWindow,
  aciCalibrate,
  calibrateCqrInterval,
  computeCqrScores,
  conformalQuantile,
  cqrCalibrate,
  initAciState,
  updateAciState,
  type QuantileForecast,
} from '../../src/lib/conformalPrediction';

const qf = (lower: number, upper: number, median = (lower + upper) / 2): QuantileForecast => ({
  lower,
  upper,
  median,
});

describe('conformalPrediction', () => {
  describe('computeCqrScores', () => {
    it('throws on forecast/actual length mismatch', () => {
      expect(() => computeCqrScores([qf(90, 110)], [])).toThrow(/mismatch/i);
    });

    it('computes symmetric nonconformity scores', () => {
      const scores = computeCqrScores(
        [qf(90, 110), qf(90, 110), qf(90, 110)],
        [95, 120, 80],
      );
      // inside: max(90-95, 95-110) = -5; above: 120-110=10; below: 90-80=10
      expect(scores).toEqual([-5, 10, 10]);
    });
  });

  describe('conformalQuantile', () => {
    it('returns 0 for an empty calibration set', () => {
      expect(conformalQuantile([], 0.1)).toBe(0);
    });

    it('uses the finite-sample formula ceil((n+1)(1-alpha))/n', () => {
      const scores = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      // n=9, alpha=0.1 -> rank = ceil(10 * 0.9) = 9 -> largest element
      expect(conformalQuantile(scores, 0.1)).toBe(9);
      // alpha=0.5 -> rank = ceil(10 * 0.5) = 5
      expect(conformalQuantile(scores, 0.5)).toBe(5);
    });

    it('clamps the rank to the sample size', () => {
      const scores = [1, 2, 3];
      // alpha=0.001 -> rank = ceil(4*0.999)=4 -> clamped to 3
      expect(conformalQuantile(scores, 0.001)).toBe(3);
    });
  });

  describe('calibrateCqrInterval', () => {
    it('widens the base interval by the conformal quantile', () => {
      const interval = calibrateCqrInterval([1, 2, 3, 4, 5, 6, 7, 8, 9], qf(90, 110, 100), 0.1);
      expect(interval.lower).toBeCloseTo(81);
      expect(interval.upper).toBeCloseTo(119);
      expect(interval.median).toBe(100);
      expect(interval.coverage).toBeCloseTo(0.9);
      expect(interval.halfWidth).toBeCloseTo(19);
      expect(interval.calibrated).toBe(true);
    });

    it('marks intervals as uncalibrated when q-hat is zero', () => {
      const interval = calibrateCqrInterval([], qf(90, 110), 0.1);
      expect(interval.lower).toBe(90);
      expect(interval.upper).toBe(110);
      expect(interval.calibrated).toBe(false);
    });
  });

  describe('cqrCalibrate', () => {
    it('returns interval plus diagnostics and flags small calibration sets', () => {
      const { interval, calibration } = cqrCalibrate(
        [qf(90, 110), qf(90, 110), qf(90, 110)],
        [95, 120, 80],
        qf(100, 120, 110),
        0.2,
      );
      expect(calibration.calibrationSize).toBe(3);
      expect(calibration.sufficient).toBe(false);
      expect(calibration.coverage).toBeCloseTo(0.8);
      expect(interval.upper).toBeGreaterThanOrEqual(120);
      expect(interval.lower).toBeLessThanOrEqual(100);
    });
  });

  describe('ACI state', () => {
    it('initializes with target alpha and defaults', () => {
      const state = initAciState(0.1);
      expect(state.alpha).toBe(0.1);
      expect(state.gamma).toBe(0.01);
      expect(state.recentCoverage).toEqual([]);
    });

    it('narrows alpha after coverage and widens after a miss (same day)', () => {
      const ts = '2026-10-05T12:00:00.000Z';
      const covered = updateAciState(initAciState(0.1), true, ts);
      expect(covered.alpha).toBeCloseTo(0.1 + 0.01 * 0.1);
      const missed = updateAciState(initAciState(0.1), false, ts);
      expect(missed.alpha).toBeCloseTo(0.1 + 0.01 * (0.1 - 1));
      expect(missed.alpha).toBeLessThan(covered.alpha);
    });

    it('resets alpha to target at the start of a new day', () => {
      const drifted = { ...initAciState(0.1), alpha: 0.4, lastResetDate: '2026-10-04' };
      const next = updateAciState(drifted, true, '2026-10-05T00:00:00.000Z');
      expect(next.lastResetDate).toBe('2026-10-05');
      expect(next.alpha).toBeCloseTo(0.1 + 0.01 * 0.1);
    });

    it('tracks empirical coverage over the rolling window', () => {
      let state = initAciState(0.1, 0.01, 3);
      const ts = '2026-10-05T00:00:00.000Z';
      state = updateAciState(state, true, ts);
      state = updateAciState(state, false, ts);
      state = updateAciState(state, true, ts);
      expect(state.empiricalCoverage).toBeCloseTo(2 / 3);
    });
  });

  describe('aciCalibrate', () => {
    it('uses the adaptive alpha from ACI state', () => {
      const state = initAciState(0.2);
      const { interval, alpha } = aciCalibrate([1, 2, 3, 4, 5], qf(90, 110), state);
      expect(alpha).toBe(0.2);
      expect(interval.coverage).toBeCloseTo(0.8);
    });
  });

  describe('RollingCalibrationWindow', () => {
    it('evicts oldest records beyond max size', () => {
      const window = new RollingCalibrationWindow(3, 365);
      const base = { forecast: qf(0, 10), nonconformityScore: 1 };
      window.add({ ...base, timestamp: '2026-01-01T00:00:00.000Z', actual: 1, covered: true });
      window.add({ ...base, timestamp: '2026-01-02T00:00:00.000Z', actual: 2, covered: true });
      window.add({ ...base, timestamp: '2026-01-03T00:00:00.000Z', actual: 3, covered: true });
      window.add({ ...base, timestamp: '2026-01-04T00:00:00.000Z', actual: 4, covered: false });
      const records = window.getRecords();
      expect(records).toHaveLength(3);
      expect(records[0].actual).toBe(2);
      expect(records[2].actual).toBe(4);
    });
  });

  describe('ConformalPredictor', () => {
    it('accumulates calibration records and exposes diagnostics', () => {
      const predictor = new ConformalPredictor({ targetAlpha: 0.1 });
      predictor.recordObservation(qf(90, 110), 100, '2026-10-05T00:00:00.000Z');
      predictor.recordObservation(qf(90, 110), 130, '2026-10-05T01:00:00.000Z');
      const diagnostics = predictor.getDiagnostics();
      expect(diagnostics.calibrationSize).toBe(2);
      expect(diagnostics.empiricalCoverage).toBeCloseTo(0.5);
    });
  });
});
