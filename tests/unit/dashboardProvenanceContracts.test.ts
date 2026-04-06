import { describe, expect, it } from 'vitest';
import { computeRenewablePenetration } from '../../src/components/AnalyticsTrendsDashboard';
import { buildDashboardFreshnessProvenance } from '../../src/lib/scoreboardProvenance';

describe('dashboard provenance contracts', () => {
  it('marks dashboard freshness as demo when any connection is running in fallback mode', () => {
    const meta = buildDashboardFreshnessProvenance({
      connectionStatuses: [
        { status: 'connected', source: 'stream' },
        { status: 'fallback', source: 'fallback' },
      ],
      lastUpdated: '2026-04-05T08:00:00.000Z',
    });

    expect(meta.source).toBe('Fallback energy datasets');
    expect(meta.isFallback).toBe(true);
    expect(meta.freshnessStatus).toBe('demo');
  });

  it('does not claim connected live provenance before any verified timestamp exists', () => {
    const meta = buildDashboardFreshnessProvenance({
      connectionStatuses: [{ status: 'connecting', source: 'stream' }],
      lastUpdated: null,
    });

    expect(meta.source).toBe('Energy datasets not yet verified');
    expect(meta.isFallback).toBe(false);
    expect(meta.freshnessStatus).toBe('unknown');
  });

  it('returns fully reference data when there are not enough observed provinces', () => {
    const result = computeRenewablePenetration([
      {
        province: 'Ontario',
        province_code: 'ON',
        generation_type: 'nuclear steam turbine',
        megawatt_hours: 9000,
        date: '2026-04-05',
      } as any,
      {
        province: 'Ontario',
        province_code: 'ON',
        generation_type: 'wind power turbine',
        megawatt_hours: 1000,
        date: '2026-04-05',
      } as any,
    ]);

    expect(result.summary.usesReferenceOnly).toBe(true);
    expect(result.summary.observedProvinceCount).toBe(0);
    expect(result.provinces.every((province) => province.data_origin === 'reference')).toBe(true);
  });

  it('marks missing provinces as supplemented when observed data is partial but usable', () => {
    const result = computeRenewablePenetration([
      {
        province: 'Ontario',
        province_code: 'ON',
        generation_type: 'nuclear steam turbine',
        megawatt_hours: 9000,
        date: '2026-04-05',
      } as any,
      {
        province: 'Ontario',
        province_code: 'ON',
        generation_type: 'wind power turbine',
        megawatt_hours: 1000,
        date: '2026-04-05',
      } as any,
      {
        province: 'Alberta',
        province_code: 'AB',
        generation_type: 'wind power turbine',
        megawatt_hours: 2000,
        date: '2026-04-05',
      } as any,
      {
        province: 'Alberta',
        province_code: 'AB',
        generation_type: 'combustible fuels',
        megawatt_hours: 8000,
        date: '2026-04-05',
      } as any,
      {
        province: 'Quebec',
        province_code: 'QC',
        generation_type: 'hydraulic turbine',
        megawatt_hours: 9500,
        date: '2026-04-05',
      } as any,
      {
        province: 'Quebec',
        province_code: 'QC',
        generation_type: 'wind power turbine',
        megawatt_hours: 500,
        date: '2026-04-05',
      } as any,
    ]);

    expect(result.summary.usesReferenceOnly).toBe(false);
    expect(result.summary.observedProvinceCount).toBe(3);
    expect(result.summary.supplementedProvinceCount).toBeGreaterThan(0);
    expect(result.provinces.find((province) => province.province === 'ON')?.data_origin).toBe('observed');
    expect(result.provinces.find((province) => province.province === 'BC')?.data_origin).toBe('supplemented');
  });
});
