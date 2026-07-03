import { describe, expect, it } from 'vitest';
import { hampelFilter } from '../../src/lib/dataContract';

describe('hampelFilter', () => {
  it('detects a spike when MAD is non-zero (varied series with outlier)', () => {
    const data = [98, 102, 99, 101, 500, 100, 103];
    const result = hampelFilter(data, 3, 3.0);

    expect(result.nOutliers).toBeGreaterThanOrEqual(1);
    expect(result.outlierIndices).toContain(4);
    expect(result.values[4]).not.toBe(500);
  });

  it('skips flat series with zero MAD (no false outliers)', () => {
    const result = hampelFilter([50, 50, 50, 50, 50], 3, 3.0);

    expect(result.nOutliers).toBe(0);
    expect(result.outlierIndices).toHaveLength(0);
  });

  it('skips spike in near-flat series where MAD rounds to 0', () => {
    const result = hampelFilter([100, 100, 100, 100, 500, 100, 100], 3, 3.0);

    expect(result.nOutliers).toBe(0);
  });

  it('returns empty result for empty array', () => {
    const result = hampelFilter([], 3, 3.0);

    expect(result.nOutliers).toBe(0);
    expect(result.values).toHaveLength(0);
  });

  it('does not flag outliers in arrays with fewer than 3 elements', () => {
    const result = hampelFilter([10, 20], 3, 3.0);

    expect(result.nOutliers).toBe(0);
    expect(result.values).toEqual([10, 20]);
  });

  it('preserves non-outlier values unchanged', () => {
    const input = [100, 102, 98, 101, 99, 103, 97];
    const result = hampelFilter(input, 3, 3.0);

    expect(result.nOutliers).toBe(0);
    expect(result.values).toEqual(input);
  });

  it('detects multiple outliers in a noisy series', () => {
    const data = [100, 102, 98, 500, 101, 99, 900, 103, 97];
    const result = hampelFilter(data, 3, 3.0);

    expect(result.nOutliers).toBeGreaterThanOrEqual(1);
    expect(result.outlierIndices).toContain(3);
  });

  it('includes method string with window and sigma info', () => {
    const result = hampelFilter([1, 2, 3, 4, 5], 3, 3.0);

    expect(result.method).toContain('Hampel');
    expect(result.method).toContain('window=7');
    expect(result.method).toContain('n_sigmas=3');
  });
});
