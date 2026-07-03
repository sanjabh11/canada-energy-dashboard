import { describe, expect, it } from 'vitest';
import { imputeMissing } from '../../src/lib/dataContract';

describe('imputeMissing', () => {
  it('linearly interpolates a single gap between valid points', () => {
    const result = imputeMissing([10, null, 30], 'linear');

    expect(result.values[1]).toBeCloseTo(20, 5);
    expect(result.nImputed).toBe(1);
    expect(result.imputedIndices).toContain(1);
  });

  it('forward-fills missing values at the end from the last valid value', () => {
    const result = imputeMissing([10, 20, null], 'forward');

    expect(result.values[2]).toBe(20);
    expect(result.nImputed).toBe(1);
  });

  it('forward-fill leaves NaN at start when no previous valid value exists', () => {
    const result = imputeMissing([null, 10, 20], 'forward');

    expect(Number.isNaN(result.values[0])).toBe(true);
    expect(result.nImputed).toBe(0);
  });

  it('seasonal imputation fills from same position in previous cycle', () => {
    const data = [5, 10, 5, 10, null, 10];
    const result = imputeMissing(data, 'seasonal', 4);

    expect(result.values[4]).toBe(5);
    expect(result.nImputed).toBe(1);
  });

  it('seasonal imputation leaves NaN when no previous cycle value exists', () => {
    const result = imputeMissing([5, null, 5, null], 'seasonal', 2);

    expect(Number.isNaN(result.values[1])).toBe(true);
    expect(Number.isNaN(result.values[3])).toBe(true);
  });

  it('returns all NaN for all-null input with linear method', () => {
    const result = imputeMissing([null, null, null], 'linear');

    expect(result.nImputed).toBe(0);
    expect(Number.isNaN(result.values[0])).toBe(true);
  });

  it('returns unchanged values when there are no gaps', () => {
    const result = imputeMissing([10, 20, 30], 'linear');

    expect(result.nImputed).toBe(0);
    expect(result.values).toEqual([10, 20, 30]);
  });

  it('linear interpolation extrapolates backward when only next value exists', () => {
    const result = imputeMissing([null, null, 30], 'linear');

    expect(result.values[0]).toBe(30);
    expect(result.values[1]).toBe(30);
    expect(result.nImputed).toBe(2);
  });

  it('includes method string with method name', () => {
    const result = imputeMissing([1, null, 3], 'linear');

    expect(result.method).toContain('linear');
  });

  it('includes seasonal period in method string when seasonal', () => {
    const result = imputeMissing([1, null, 3], 'seasonal', 24);

    expect(result.method).toContain('period=24');
  });
});
