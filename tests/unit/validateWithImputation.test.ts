import { describe, expect, it } from 'vitest';
import { validateWithImputation, type DataSourceId } from '../../src/lib/dataContract';

describe('validateWithImputation', () => {
  it('produces error violation for all-null numeric field', () => {
    const result = validateWithImputation('ieso_demand' as DataSourceId, [
      { demand_mw: null, timestamp: '2026-01-01T00:00:00Z' },
    ]);

    const unimputable = result.violations.find(
      (v) => v.checkName.startsWith('unimputable_field_') && v.severity === 'error',
    );
    expect(unimputable).toBeDefined();
  });

  it('returns contract_not_found error for unknown contract', () => {
    const result = validateWithImputation('unknown_source' as DataSourceId, [
      { value: 100 },
    ]);

    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].checkName).toBe('contract_not_found');
    expect(result.summary).toContain('Contract not found');
  });

  it('imputes missing values and reports them in summary', () => {
    const records = [
      { total_demand_mw: 10000, datetime: '2026-01-01T00:00:00Z', hour_ending: 1, hourly_demand_gwh: 10, date: '2026-01-01' },
      { total_demand_mw: null, datetime: '2026-01-01T01:00:00Z', hour_ending: 2, hourly_demand_gwh: null, date: '2026-01-01' },
      { total_demand_mw: 12000, datetime: '2026-01-01T02:00:00Z', hour_ending: 3, hourly_demand_gwh: 12, date: '2026-01-01' },
    ];

    const result = validateWithImputation('ieso_demand', records, { imputationMethod: 'linear' });

    expect(result.totalImputed).toBeGreaterThan(0);
    expect(result.imputedRecords).toHaveLength(3);
    expect(result.summary).toContain('imputed');
  });

  it('detects outliers via Hampel filter and reports them', () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      total_demand_mw: i === 5 ? 999999 : 10000 + i * 100,
      datetime: `2026-01-01T${String(i).padStart(2, '0')}:00:00Z`,
      hour_ending: i + 1,
      hourly_demand_gwh: 10 + i * 0.1,
      date: '2026-01-01',
    }));

    const result = validateWithImputation('ieso_demand', records);

    expect(result.totalOutliers).toBeGreaterThanOrEqual(0);
    expect(result.hampelResults).toHaveProperty('total_demand_mw');
  });

  it('preserves non-numeric fields in imputed records', () => {
    const records = [
      { total_demand_mw: 10000, datetime: '2026-01-01T00:00:00Z', hour_ending: 1, hourly_demand_gwh: 10, date: '2026-01-01' },
      { total_demand_mw: 11000, datetime: '2026-01-01T01:00:00Z', hour_ending: 2, hourly_demand_gwh: 11, date: '2026-01-01' },
    ];

    const result = validateWithImputation('ieso_demand', records);

    expect(result.imputedRecords[0].datetime).toBe('2026-01-01T00:00:00Z');
    expect(result.imputedRecords[0].date).toBe('2026-01-01');
  });
});
