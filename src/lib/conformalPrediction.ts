/**
 * Conformal Prediction Module
 *
 * Implements Conformalized Quantile Regression (CQR) and Adaptive Conformal
 * Inference (ACI) to produce finite-sample calibrated prediction intervals
 * with guaranteed marginal coverage.
 *
 * References:
 *   - Romano et al. "Conformalized Quantile Regression" (NeurIPS 2019)
 *   - Gibbs & Candes "Adaptive Conformal Inference" (NeurIPS 2021)
 *   - Angelopoulos & Bates "A Gentle Introduction to Conformal Prediction"
 *     (Foundations and Trends in ML, 2023)
 *
 * Regulatory context:
 *   OEB/AER/CER filings require calibrated uncertainty with documented
 *   coverage guarantees. Bootstrap MC intervals assume i.i.d. and lack
 *   finite-sample coverage proofs. CP intervals are distribution-free.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuantileForecast {
  /** Lower quantile prediction (e.g., q0.05) */
  lower: number;
  /** Median / point forecast (e.g., q0.50) */
  median: number;
  /** Upper quantile prediction (e.g., q0.95) */
  upper: number;
}

export interface ConformalInterval {
  /** Calibrated lower bound */
  lower: number;
  /** Calibrated upper bound */
  upper: number;
  /** Point forecast (median) */
  median: number;
  /** Nominal coverage level (e.g., 0.90 for 90% intervals) */
  coverage: number;
  /** Half-width of the interval (upper - lower) / 2 */
  halfWidth: number;
  /** Whether the interval was widened by conformal calibration */
  calibrated: boolean;
}

export interface CalibrationRecord {
  /** Timestamp of the observation */
  timestamp: string;
  /** The actual observed value */
  actual: number;
  /** The forecast that was made */
  forecast: QuantileForecast;
  /** Whether the actual fell within the conformal interval */
  covered: boolean;
  /** The nonconformity score for this observation */
  nonconformityScore: number;
}

export interface ACIState {
  /** Current adaptive significance level (starts at target alpha) */
  alpha: number;
  /** Target miscoverage rate (e.g., 0.10 for 90% coverage) */
  targetAlpha: number;
  /** Learning rate for ACI updates (gamma, default 0.01) */
  gamma: number;
  /** Rolling window of coverage outcomes (true = covered) */
  recentCoverage: boolean[];
  /** Maximum window size for rolling coverage tracking */
  windowSize: number;
  /** Last reset timestamp (daily reset) */
  lastResetDate: string;
  /** Empirical coverage rate over the rolling window */
  empiricalCoverage: number;
}

export interface ConformalCalibrationResult {
  /** The conformal quantile (empirical quantile of nonconformity scores) */
  conformalQuantile: number;
  /** Number of calibration samples used */
  calibrationSize: number;
  /** Nominal coverage level */
  coverage: number;
  /** Nonconformity scores from the calibration set */
  scores: number[];
  /** Whether sufficient calibration data exists */
  sufficient: boolean;
}

// ── CQR: Conformalized Quantile Regression ───────────────────────────────────

/**
 * Compute nonconformity scores for CQR.
 *
 * For each calibration point (y_i, [l_i, u_i]):
 *   score_i = max(l_i - y_i, y_i - u_i)
 *
 * A large score means the interval missed the target badly.
 */
export function computeCqrScores(forecasts: QuantileForecast[], actuals: number[]): number[] {
  if (forecasts.length !== actuals.length) {
    throw new Error(
      `CQR score mismatch: ${forecasts.length} forecasts vs ${actuals.length} actuals`,
    );
  }
  return forecasts.map((f, i) => {
    const y = actuals[i];
    return Math.max(f.lower - y, y - f.upper);
  });
}

/**
 * Compute the conformal quantile from calibration scores.
 *
 * Uses the standard conformal quantile: ceil((n+1) * (1-alpha)) / n
 * which guarantees finite-sample marginal coverage ≥ 1-alpha.
 *
 * @param scores Nonconformity scores from the calibration set
 * @param alpha Target miscoverage rate (e.g., 0.10 for 90% coverage)
 * @returns The conformal quantile threshold q̂
 */
export function conformalQuantile(scores: number[], alpha: number): number {
  const n = scores.length;
  if (n === 0) return 0;

  const sorted = [...scores].sort((a, b) => a - b);
  // Standard conformal quantile with finite-sample correction
  const rank = Math.ceil((n + 1) * (1 - alpha));
  const clampedRank = Math.max(1, Math.min(n, rank));
  return sorted[clampedRank - 1];
}

/**
 * Calibrate a CQR interval using a calibration set.
 *
 * Given calibration scores, compute the conformal quantile q̂ and
 * widen the base quantile forecast by q̂ on both sides:
 *   [lower - q̂, upper + q̂]
 *
 * @param calibrationScores Nonconformity scores from calibration data
 * @param forecast The base quantile forecast to calibrate
 * @param alpha Target miscoverage rate
 * @returns Calibrated conformal interval
 */
export function calibrateCqrInterval(
  calibrationScores: number[],
  forecast: QuantileForecast,
  alpha: number,
): ConformalInterval {
  const qHat = conformalQuantile(calibrationScores, alpha);
  const lower = forecast.lower - qHat;
  const upper = forecast.upper + qHat;
  const halfWidth = (upper - lower) / 2;

  return {
    lower,
    upper,
    median: forecast.median,
    coverage: 1 - alpha,
    halfWidth,
    calibrated: qHat > 0,
  };
}

/**
 * Full CQR calibration pipeline.
 *
 * @param calibrationForecasts Quantile forecasts for the calibration set
 * @param calibrationActuals Actual values for the calibration set
 * @param targetForecast The forecast to calibrate
 * @param alpha Target miscoverage rate (e.g., 0.10 for 90% intervals)
 * @returns Calibrated interval and calibration diagnostics
 */
export function cqrCalibrate(
  calibrationForecasts: QuantileForecast[],
  calibrationActuals: number[],
  targetForecast: QuantileForecast,
  alpha: number,
): { interval: ConformalInterval; calibration: ConformalCalibrationResult } {
  const scores = computeCqrScores(calibrationForecasts, calibrationActuals);
  const qHat = conformalQuantile(scores, alpha);
  const interval = calibrateCqrInterval(scores, targetForecast, alpha);

  const calibration: ConformalCalibrationResult = {
    conformalQuantile: qHat,
    calibrationSize: scores.length,
    coverage: 1 - alpha,
    scores,
    sufficient: scores.length >= 30,
  };

  return { interval, calibration };
}

// ── ACI: Adaptive Conformal Inference ────────────────────────────────────────

/**
 * Initialize ACI state.
 *
 * @param targetAlpha Desired miscoverage rate (e.g., 0.10 for 90% coverage)
 * @param gamma Learning rate for alpha adaptation (default 0.01)
 * @param windowSize Rolling window for coverage tracking (default 50)
 * @returns Initial ACI state
 */
export function initAciState(targetAlpha: number, gamma = 0.01, windowSize = 50): ACIState {
  return {
    alpha: targetAlpha,
    targetAlpha,
    gamma,
    recentCoverage: [],
    windowSize,
    lastResetDate: new Date().toISOString().slice(0, 10),
    empiricalCoverage: 1 - targetAlpha,
  };
}

/**
 * Update ACI state after observing whether the last interval covered.
 *
 * ACI update rule (Gibbs & Candes 2021):
 *   alpha_{t+1} = alpha_t + gamma * (alpha_target - 1{miss_t})
 *
 * If we missed (miss=1), alpha increases → wider intervals.
 * If we covered (miss=0), alpha decreases → narrower intervals.
 *
 * @param state Current ACI state
 * @param covered Whether the actual value fell within the interval
 * @param timestamp ISO timestamp of the observation
 * @returns Updated ACI state
 */
export function updateAciState(state: ACIState, covered: boolean, timestamp: string): ACIState {
  const today = timestamp.slice(0, 10);

  // Daily reset: reset alpha to target at the start of each day
  let alpha = state.alpha;
  if (today !== state.lastResetDate) {
    alpha = state.targetAlpha;
  }

  // ACI update: alpha_{t+1} = alpha_t + gamma * (alpha_target - 1{miss})
  const miss = covered ? 0 : 1;
  alpha = alpha + state.gamma * (state.targetAlpha - miss);
  // Clamp alpha to [0.001, 0.999] to avoid degenerate intervals
  alpha = Math.max(0.001, Math.min(0.999, alpha));

  // Update rolling coverage window
  const recentCoverage = [...state.recentCoverage, covered];
  if (recentCoverage.length > state.windowSize) {
    recentCoverage.shift();
  }

  const empiricalCoverage =
    recentCoverage.length > 0
      ? recentCoverage.filter(Boolean).length / recentCoverage.length
      : 1 - state.targetAlpha;

  return {
    alpha,
    targetAlpha: state.targetAlpha,
    gamma: state.gamma,
    recentCoverage,
    windowSize: state.windowSize,
    lastResetDate: today,
    empiricalCoverage,
  };
}

/**
 * Produce an ACI-calibrated conformal interval.
 *
 * Combines CQR calibration with the adaptive alpha from ACI state.
 * The adaptive alpha replaces the fixed alpha in the conformal quantile
 * computation, allowing the interval width to auto-adjust based on
 * recent coverage performance.
 *
 * @param calibrationScores Nonconformity scores from calibration set
 * @param forecast Base quantile forecast
 * @param aciState Current ACI state (uses aciState.alpha as the adaptive alpha)
 * @returns Calibrated interval and updated calibration info
 */
export function aciCalibrate(
  calibrationScores: number[],
  forecast: QuantileForecast,
  aciState: ACIState,
): { interval: ConformalInterval; alpha: number } {
  const interval = calibrateCqrInterval(calibrationScores, forecast, aciState.alpha);

  return {
    interval: {
      ...interval,
      coverage: 1 - aciState.alpha,
    },
    alpha: aciState.alpha,
  };
}

// ── Rolling Calibration Window ────────────────────────────────────────────────

/**
 * Maintain a rolling window of calibration records for online conformal prediction.
 *
 * As new observations arrive, old ones are evicted (FIFO) to keep the
 * calibration set fresh and responsive to distributional shifts.
 */
export class RollingCalibrationWindow {
  private records: CalibrationRecord[] = [];

  constructor(
    private readonly maxSize: number = 500,
    private readonly maxAgeDays: number = 30,
  ) {}

  /** Add a new calibration record */
  add(record: CalibrationRecord): void {
    this.records.push(record);
    this.evict();
  }

  /** Get current nonconformity scores from the calibration window */
  getScores(): number[] {
    return this.records.map((r) => r.nonconformityScore);
  }

  /** Get current calibration size */
  get size(): number {
    return this.records.length;
  }

  /** Whether the window has sufficient data for conformal calibration */
  get sufficient(): boolean {
    return this.records.length >= 30;
  }

  /** Get recent coverage rate */
  get empiricalCoverage(): number {
    if (this.records.length === 0) return 0;
    return this.records.filter((r) => r.covered).length / this.records.length;
  }

  /** Get all calibration records (for diagnostics) */
  getRecords(): CalibrationRecord[] {
    return [...this.records];
  }

  /** Evict old records based on size and age limits */
  private evict(): void {
    // Evict by size
    if (this.records.length > this.maxSize) {
      this.records = this.records.slice(-this.maxSize);
    }
    // Evict by age
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.maxAgeDays);
    const cutoffIso = cutoff.toISOString();
    this.records = this.records.filter((r) => r.timestamp >= cutoffIso);
  }
}

// ── Full Conformal Prediction Engine ─────────────────────────────────────────

/**
 * Full conformal prediction engine combining CQR + ACI with a rolling
 * calibration window for online deployment.
 *
 * Usage:
 *   const engine = new ConformalPredictor({ targetAlpha: 0.10 });
 *   // During calibration phase: engine.recordObservation(forecast, actual);
 *   // During prediction: const interval = engine.predict(forecast);
 */
export interface ConformalPredictorOptions {
  /** Target miscoverage rate (default 0.10 → 90% coverage) */
  targetAlpha?: number;
  /** ACI learning rate (default 0.01) */
  gamma?: number;
  /** Rolling window size for ACI coverage tracking (default 50) */
  aciWindowSize?: number;
  /** Max calibration records (default 500) */
  maxCalibrationSize?: number;
  /** Max calibration age in days (default 30) */
  maxCalibrationAgeDays?: number;
}

export class ConformalPredictor {
  readonly aciState: ACIState;
  readonly calibrationWindow: RollingCalibrationWindow;
  readonly targetAlpha: number;

  constructor(options: ConformalPredictorOptions = {}) {
    this.targetAlpha = options.targetAlpha ?? 0.1;
    this.aciState = initAciState(
      this.targetAlpha,
      options.gamma ?? 0.01,
      options.aciWindowSize ?? 50,
    );
    this.calibrationWindow = new RollingCalibrationWindow(
      options.maxCalibrationSize ?? 500,
      options.maxCalibrationAgeDays ?? 30,
    );
  }

  /**
   * Record an observation for calibration.
   *
   * Computes the nonconformity score, updates the calibration window,
   * and updates the ACI state.
   *
   * @param forecast The quantile forecast that was made
   * @param actual The actual observed value
   * @param timestamp ISO timestamp (defaults to now)
   */
  recordObservation(
    forecast: QuantileForecast,
    actual: number,
    timestamp: string = new Date().toISOString(),
  ): void {
    const score = Math.max(forecast.lower - actual, actual - forecast.upper);
    const covered = actual >= forecast.lower && actual <= forecast.upper;

    this.calibrationWindow.add({
      timestamp,
      actual,
      forecast,
      covered,
      nonconformityScore: score,
    });

    // Update ACI state
    const currentState = this.aciState;
    const newState = updateAciState(currentState, covered, timestamp);
    Object.assign(this.aciState, newState);
  }

  /**
   * Produce a conformal-calibrated prediction interval.
   *
   * Uses CQR with the adaptive alpha from ACI.
   * If insufficient calibration data, falls back to the raw quantile forecast.
   *
   * @param forecast Base quantile forecast to calibrate
   * @returns Calibrated conformal interval
   */
  predict(forecast: QuantileForecast): ConformalInterval {
    const scores = this.calibrationWindow.getScores();

    if (!this.calibrationWindow.sufficient) {
      // Insufficient calibration data — return uncalibrated interval
      return {
        lower: forecast.lower,
        upper: forecast.upper,
        median: forecast.median,
        coverage: 1 - this.targetAlpha,
        halfWidth: (forecast.upper - forecast.lower) / 2,
        calibrated: false,
      };
    }

    const { interval } = aciCalibrate(scores, forecast, this.aciState);
    return interval;
  }

  /** Get current empirical coverage rate from the calibration window */
  get empiricalCoverage(): number {
    return this.calibrationWindow.empiricalCoverage;
  }

  /** Get current calibration window size */
  get calibrationSize(): number {
    return this.calibrationWindow.size;
  }

  /** Get current adaptive alpha */
  get currentAlpha(): number {
    return this.aciState.alpha;
  }

  /** Whether the predictor has sufficient calibration data */
  get isCalibrated(): boolean {
    return this.calibrationWindow.sufficient;
  }

  /**
   * Get a diagnostic summary of the conformal predictor state.
   */
  getDiagnostics(): {
    targetAlpha: number;
    currentAlpha: number;
    calibrationSize: number;
    empiricalCoverage: number;
    isCalibrated: boolean;
    aciWindowCoverage: number;
  } {
    return {
      targetAlpha: this.targetAlpha,
      currentAlpha: this.aciState.alpha,
      calibrationSize: this.calibrationWindow.size,
      empiricalCoverage: this.calibrationWindow.empiricalCoverage,
      isCalibrated: this.calibrationWindow.sufficient,
      aciWindowCoverage: this.aciState.empiricalCoverage,
    };
  }
}

// ── Helper: Convert MC quantiles to QuantileForecast ─────────────────────────

/**
 * Convert Monte Carlo quantile output (from UncertaintyEngine) into
 * a QuantileForecast suitable for conformal calibration.
 *
 * @param quantiles Quantile object from SampleStatistics
 * @returns QuantileForecast with p5/p50/p95
 */
export function mcQuantilesToForecast(quantiles: {
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}): QuantileForecast {
  return {
    lower: quantiles.p5,
    median: quantiles.p50,
    upper: quantiles.p95,
  };
}

/**
 * Convert a point forecast + standard error into a QuantileForecast
 * using a normal approximation (for models without native quantiles).
 *
 * @param pointForecast The point estimate
 * @param stdError Standard error of the forecast
 * @param zLower Z-score for lower bound (default -1.645 for 5th percentile)
 * @param zUpper Z-score for upper bound (default +1.645 for 95th percentile)
 */
export function normalToQuantileForecast(
  pointForecast: number,
  stdError: number,
  zLower = -1.645,
  zUpper = 1.645,
): QuantileForecast {
  return {
    lower: pointForecast + zLower * stdError,
    median: pointForecast,
    upper: pointForecast + zUpper * stdError,
  };
}
