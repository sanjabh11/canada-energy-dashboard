/**
 * ADWIN (Adaptive Windowing) Concept Drift Detector
 *
 * Dynamically adjusts the sizing of historical data windows by monitoring
 * the model's prediction error. When a statistically significant change
 * in variance or error is detected between sub-windows, a drift event
 * is signaled, triggering model retraining.
 *
 * Reference:
 *   - Bifet & Gavaldà, "Learning from Time-Changing Data with Adaptive
 *     Windowing" (SIAM SDM, 2007)
 *   - GitHub: https://github.com/MLegkovskis/ADWIN
 *
 * Usage:
 *   const detector = new AdwinDriftDetector({ delta: 0.002 });
 *   detector.addObservation(predictionError, timestamp);
 *   if (detector.driftDetected) { triggerRetrain(); }
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AdwinConfig {
  /** Significance level (default: 0.002). Lower = fewer false alarms. */
  delta: number;
  /** Minimum window size before checking for drift (default: 30). */
  minWindowLength: number;
  /** Maximum window size (default: 1000). Prevents unbounded memory. */
  maxWindowLength: number;
  /** Compression threshold for bucket merging (default: 5). */
  maxBuckets: number;
}

export const DEFAULT_ADWIN_CONFIG: AdwinConfig = {
  delta: 0.002,
  minWindowLength: 30,
  maxWindowLength: 1000,
  maxBuckets: 5,
};

export interface DriftEvent {
  timestamp: string;
  type: 'warning' | 'drift';
  oldWindowSize: number;
  newWindowSize: number;
  meanBefore: number;
  meanAfter: number;
  varianceBefore: number;
  varianceAfter: number;
  epsilon: number;
}

export interface AdwinDiagnostics {
  windowSize: number;
  totalObservations: number;
  driftCount: number;
  warningCount: number;
  lastDriftTimestamp: string | null;
  currentMean: number;
  currentVariance: number;
  isDrifting: boolean;
}

// ============================================================================
// ADWIN IMPLEMENTATION
// ============================================================================

interface Bucket {
  count: number;
  sum: number;
  variance: number;
}

/**
 * ADWIN drift detector using an exponentially weighted moving window
 * with variance-based hypothesis testing.
 *
 * The algorithm maintains a sliding window of recent observations and
 * continuously tests whether the distribution of the most recent
 * observations differs significantly from the older ones.
 */
export class AdwinDriftDetector {
  private config: AdwinConfig;
  private window: number[] = [];
  private buckets: Bucket[] = [];
  private totalObservations = 0;
  private driftCount = 0;
  private warningCount = 0;
  private lastDriftTimestamp: string | null = null;
  private events: DriftEvent[] = [];

  constructor(config: Partial<AdwinConfig> = {}) {
    this.config = { ...DEFAULT_ADWIN_CONFIG, ...config };
  }

  /**
   * Add a new observation (e.g., prediction error or absolute residual).
   *
   * Returns true if drift was detected, false otherwise.
   */
  addObservation(value: number, timestamp?: string): boolean {
    const ts = timestamp ?? new Date().toISOString();
    this.totalObservations++;

    // Add to window
    this.window.push(value);
    if (this.window.length > this.config.maxWindowLength) {
      this.window.shift();
    }

    // Add bucket
    this.buckets.push({ count: 1, sum: value, variance: 0 });
    this.compressBuckets();

    // Check for drift
    if (this.window.length < this.config.minWindowLength) {
      return false;
    }

    return this.detectDrift(ts);
  }

  private compressBuckets(): void {
    while (this.buckets.length > this.config.maxBuckets) {
      // Merge last two buckets
      const b1 = this.buckets[this.buckets.length - 2];
      const b2 = this.buckets[this.buckets.length - 1];
      const merged: Bucket = {
        count: b1.count + b2.count,
        sum: b1.sum + b2.sum,
        variance: this.computeMergedVariance(b1, b2),
      };
      this.buckets.splice(this.buckets.length - 2, 2, merged);
    }
  }

  private computeMergedVariance(b1: Bucket, b2: Bucket): number {
    const n1 = b1.count;
    const n2 = b2.count;
    const n = n1 + n2;
    if (n === 0) return 0;
    const m1 = b1.sum / n1;
    const m2 = b2.sum / n2;
    const m = (b1.sum + b2.sum) / n;
    const v1 = b1.variance * (n1 - 1);
    const v2 = b2.variance * (n2 - 1);
    return (v1 + v2 + n1 * (m1 - m) ** 2 + n2 * (m2 - m) ** 2) / (n - 1);
  }

  private detectDrift(timestamp: string): boolean {
    const n = this.window.length;
    if (n < this.config.minWindowLength) return false;

    // Try all possible split points
    for (let i = 1; i < n - this.config.minWindowLength; i++) {
      const w1 = this.window.slice(0, i);
      const w2 = this.window.slice(i);

      const n1 = w1.length;
      const n2 = w2.length;

      const mean1 = w1.reduce((s, v) => s + v, 0) / n1;
      const mean2 = w2.reduce((s, v) => s + v, 0) / n2;

      const var1 = this.computeVariance(w1, mean1);
      const var2 = this.computeVariance(w2, mean2);

      // ADWIN variance estimate
      const epsCut = this.computeEpsilon(n1, n2);

      const meanDiff = Math.abs(mean1 - mean2);

      if (meanDiff >= epsCut) {
        // Drift detected — shrink window to the newer portion
        const event: DriftEvent = {
          timestamp,
          type: meanDiff >= epsCut * 1.5 ? 'drift' : 'warning',
          oldWindowSize: n,
          newWindowSize: n2,
          meanBefore: Math.round(mean1 * 1000) / 1000,
          meanAfter: Math.round(mean2 * 1000) / 1000,
          varianceBefore: Math.round(var1 * 1000) / 1000,
          varianceAfter: Math.round(var2 * 1000) / 1000,
          epsilon: Math.round(epsCut * 1000) / 1000,
        };

        if (event.type === 'drift') {
          this.driftCount++;
          this.lastDriftTimestamp = timestamp;
          // Cut the window to the new portion
          this.window = w2;
          this.rebuildBuckets();
        } else {
          this.warningCount++;
        }

        this.events.push(event);
        if (this.events.length > 100) this.events.shift();

        return event.type === 'drift';
      }
    }

    return false;
  }

  private computeVariance(values: number[], mean: number): number {
    if (values.length < 2) return 0;
    const sumSq = values.reduce((s, v) => s + (v - mean) ** 2, 0);
    return sumSq / (values.length - 1);
  }

  /**
   * Compute the ADWIN epsilon cut value for hypothesis testing.
   *
   * ε_cut = sqrt( (1/(2n1)) * ln(4/δ') ) + sqrt( (1/(2n2)) * ln(4/δ') )
   *
   * where δ' = δ / ln(n) accounts for multiple testing.
   */
  private computeEpsilon(n1: number, n2: number): number {
    const n = n1 + n2;
    const deltaPrime = this.config.delta / Math.log(Math.max(2, n));
    const lnTerm = Math.log(4 / deltaPrime);

    const eps1 = Math.sqrt(lnTerm / (2 * n1));
    const eps2 = Math.sqrt(lnTerm / (2 * n2));

    // Scale by variance estimate
    const allValues = this.window;
    const globalMean = allValues.reduce((s, v) => s + v, 0) / allValues.length;
    const globalVar = this.computeVariance(allValues, globalMean);
    const varScale = Math.sqrt(Math.max(globalVar, 1e-10));

    return (eps1 + eps2) * varScale;
  }

  private rebuildBuckets(): void {
    this.buckets = [];
    for (const v of this.window) {
      this.buckets.push({ count: 1, sum: v, variance: 0 });
    }
    // Compress
    while (this.buckets.length > this.config.maxBuckets) {
      const b1 = this.buckets[this.buckets.length - 2];
      const b2 = this.buckets[this.buckets.length - 1];
      const merged: Bucket = {
        count: b1.count + b2.count,
        sum: b1.sum + b2.sum,
        variance: this.computeMergedVariance(b1, b2),
      };
      this.buckets.splice(this.buckets.length - 2, 2, merged);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  get driftDetected(): boolean {
    return this.events.length > 0 && this.events[this.events.length - 1].type === 'drift';
  }

  get isDrifting(): boolean {
    return this.window.length < this.config.minWindowLength
      ? false
      : this.events.length > 0 &&
          Date.now() - new Date(this.lastDriftTimestamp ?? 0).getTime() < 3600_000;
  }

  getDiagnostics(): AdwinDiagnostics {
    const mean =
      this.window.length > 0 ? this.window.reduce((s, v) => s + v, 0) / this.window.length : 0;
    const variance = this.computeVariance(this.window, mean);

    return {
      windowSize: this.window.length,
      totalObservations: this.totalObservations,
      driftCount: this.driftCount,
      warningCount: this.warningCount,
      lastDriftTimestamp: this.lastDriftTimestamp,
      currentMean: Math.round(mean * 1000) / 1000,
      currentVariance: Math.round(variance * 1000) / 1000,
      isDrifting: this.isDrifting,
    };
  }

  getEvents(): DriftEvent[] {
    return [...this.events];
  }

  reset(): void {
    this.window = [];
    this.buckets = [];
    this.totalObservations = 0;
    this.driftCount = 0;
    this.warningCount = 0;
    this.lastDriftTimestamp = null;
    this.events = [];
  }
}

/**
 * Create an ADWIN detector configured for demand forecasting drift.
 *
 * Uses conservative defaults suitable for hourly energy demand data
 * where seasonal patterns can cause natural variance shifts.
 */
export function createDemandForecastDriftDetector(): AdwinDriftDetector {
  return new AdwinDriftDetector({
    delta: 0.002,
    minWindowLength: 48, // 2 days of hourly data
    maxWindowLength: 2016, // 12 weeks of hourly data
    maxBuckets: 5,
  });
}

/**
 * Create an ADWIN detector configured for price spike model drift.
 *
 * More sensitive since price spikes are rare and drift can be costly.
 */
export function createPriceSpikeDriftDetector(): AdwinDriftDetector {
  return new AdwinDriftDetector({
    delta: 0.005,
    minWindowLength: 24, // 1 day
    maxWindowLength: 720, // 30 days
    maxBuckets: 5,
  });
}
