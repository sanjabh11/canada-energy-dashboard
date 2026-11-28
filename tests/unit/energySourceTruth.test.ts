import { describe, expect, it } from 'vitest';
import {
  buildObservedGridStatusRow,
  classifySourceBatch,
  normalizeAuthoritativeTimestamp,
  parseFiniteNumber,
} from '../../supabase/functions/_shared/energySourceTruth';

describe('energy source truth contract', () => {
  it('parses finite numeric source values without manufacturing zeroes', () => {
    expect(parseFiniteNumber('12.5')).toBe(12.5);
    expect(parseFiniteNumber(0)).toBe(0);
    expect(parseFiniteNumber('')).toBeNull();
    expect(parseFiniteNumber('not-a-number')).toBeNull();
    expect(parseFiniteNumber(undefined)).toBeNull();
  });

  it('preserves unobserved grid measurements as null', () => {
    expect(buildObservedGridStatusRow({
      timestamp: '2026-07-01T12:00:00Z',
      demand_mw: '100',
      source: 'IESO',
    }, { region: 'Ontario', dataSource: 'IESO' })).toEqual({
      region: 'Ontario',
      demand_mw: 100,
      supply_mw: null,
      reserve_margin: null,
      frequency_hz: null,
      voltage_kv: null,
      congestion_index: null,
      data_source: 'IESO',
      status: null,
      captured_at: '2026-07-01T12:00:00.000Z',
    });

    expect(buildObservedGridStatusRow({
      timestamp: '2026-07-01T12:00:00Z',
      demand_mw: 100,
      supply_mw: 125,
      frequency_hz: 60,
      voltage_kv: 120,
      status: 'observed',
    }, { region: 'Ontario', dataSource: 'IESO' })?.reserve_margin).toBe(0.25);
  });

  it('accepts only authoritative timestamp-shaped values', () => {
    expect(normalizeAuthoritativeTimestamp('2026-07-01T12:00:00Z')).toBe('2026-07-01T12:00:00.000Z');
    expect(normalizeAuthoritativeTimestamp('2026-07-01')).toBe('2026-07-01T00:00:00.000Z');
    expect(normalizeAuthoritativeTimestamp('12')).toBeNull();
    expect(normalizeAuthoritativeTimestamp('')).toBeNull();
    expect(normalizeAuthoritativeTimestamp(null)).toBeNull();
  });

  it('fails closed for empty source batches', () => {
    expect(classifySourceBatch([], 'IESO')).toEqual({
      usable: false,
      message: 'IESO returned no usable records.',
    });
  });

  it('accepts a non-empty source batch only when every row has a source timestamp', () => {
    expect(classifySourceBatch([
      { timestamp: '2026-07-01T12:00:00Z' },
      { timestamp: '2026-07-01T13:00:00Z' },
    ], 'AESO')).toEqual({ usable: true, message: null });

    expect(classifySourceBatch([
      { timestamp: '2026-07-01T12:00:00Z' },
      { timestamp: null },
    ], 'AESO')).toEqual({
      usable: false,
      message: 'AESO returned a record without an authoritative source timestamp.',
    });
  });
});
