import { describe, expect, it } from 'vitest';
import {
  computeAverage,
  computeRatePercent,
  computeStreamHealthRatio,
  freshnessFactor,
} from '../../supabase/functions/_shared/opsHealthTruth';

describe('ops health truth contract', () => {
  it('does not invent a stream-health ratio when no stream evidence exists', () => {
    expect(computeStreamHealthRatio({ healthy: 0, degraded: 0, error: 0, total: 0 })).toBeNull();
  });

  it('weights degraded streams at half value when evidence exists', () => {
    expect(computeStreamHealthRatio({ healthy: 1, degraded: 1, error: 0, total: 2 })).toBe(0.75);
  });

  it('returns unavailable rates and averages for empty evidence windows', () => {
    expect(computeRatePercent(0, 0)).toBeNull();
    expect(computeAverage([])).toBeNull();
  });

  it('returns a freshness factor only when freshness evidence exists', () => {
    expect(freshnessFactor(null)).toBeNull();
    expect(freshnessFactor(5)).toBe(1);
    expect(freshnessFactor(30)).toBe(0.99);
    expect(freshnessFactor(120)).toBe(0.96);
  });
});
