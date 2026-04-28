import { describe, expect, it } from 'vitest';
import { upsampleToQuarterHour } from '../../src/lib/intervalUpsampler';
import type { UtilityHistoricalLoadRow } from '../../src/lib/utilityForecasting';

function makeHourlyRow(startEpochSeconds: number, demandMw: number): UtilityHistoricalLoadRow {
  return {
    timestamp: new Date(startEpochSeconds * 1000).toISOString(),
    geography_level: 'system',
    geography_id: 'ON-TEST-1',
    customer_class: 'mixed',
    demand_mw: demandMw,
    source_system: 'green_button_cmd',
    quality_flags: [],
  };
}

const BASE_EPOCH = 1_700_000_000;
const HOUR = 3600;
const QUARTER = 900;

describe('upsampleToQuarterHour', () => {
  it('returns wasUpsampled=false and original rows unchanged for empty input', () => {
    const result = upsampleToQuarterHour([]);
    expect(result.wasUpsampled).toBe(false);
    expect(result.rows).toHaveLength(0);
    expect(result.originalIntervalCount).toBe(0);
    expect(result.upsampledIntervalCount).toBe(0);
  });

  it('returns wasUpsampled=false unchanged for already 15-min spaced rows', () => {
    const rows = [
      makeHourlyRow(BASE_EPOCH, 1.0),
      makeHourlyRow(BASE_EPOCH + QUARTER, 1.1),
      makeHourlyRow(BASE_EPOCH + QUARTER * 2, 1.2),
    ];
    const result = upsampleToQuarterHour(rows);
    expect(result.wasUpsampled).toBe(false);
    expect(result.rows).toHaveLength(3);
  });

  it('returns wasUpsampled=false unchanged for mixed granularity rows', () => {
    const rows = [
      makeHourlyRow(BASE_EPOCH, 1.0),
      makeHourlyRow(BASE_EPOCH + HOUR, 1.1),
      makeHourlyRow(BASE_EPOCH + HOUR + QUARTER, 1.2),
    ];
    const result = upsampleToQuarterHour(rows);
    expect(result.wasUpsampled).toBe(false);
    expect(result.rows).toHaveLength(3);
  });

  it('upsamples 3 hourly rows into 12 quarter-hour rows', () => {
    const rows = [
      makeHourlyRow(BASE_EPOCH, 1.0),
      makeHourlyRow(BASE_EPOCH + HOUR, 2.0),
      makeHourlyRow(BASE_EPOCH + HOUR * 2, 3.0),
    ];
    const result = upsampleToQuarterHour(rows);
    expect(result.wasUpsampled).toBe(true);
    expect(result.rows).toHaveLength(12);
    expect(result.originalIntervalCount).toBe(3);
    expect(result.upsampledIntervalCount).toBe(12);
  });

  it('upsamples a single hourly row into 4 quarter-hour rows with flat extrapolation', () => {
    const rows = [makeHourlyRow(BASE_EPOCH, 2.5)];
    const result = upsampleToQuarterHour(rows);
    expect(result.wasUpsampled).toBe(true);
    expect(result.rows).toHaveLength(4);
    const totalEnergy = result.rows.reduce((sum, r) => sum + r.demand_mw * 0.25, 0);
    expect(Math.abs(totalEnergy - 2.5 * 1.0)).toBeLessThan(1e-6);
  });

  it('preserves total energy (volumetric integrity) within 1e-9 tolerance', () => {
    const rows = [
      makeHourlyRow(BASE_EPOCH, 10.0),
      makeHourlyRow(BASE_EPOCH + HOUR, 20.0),
      makeHourlyRow(BASE_EPOCH + HOUR * 2, 5.0),
      makeHourlyRow(BASE_EPOCH + HOUR * 3, 15.0),
    ];
    const originalEnergyMwh = rows.reduce((sum, r) => sum + r.demand_mw * 1.0, 0);
    const result = upsampleToQuarterHour(rows);
    const upsampledEnergyMwh = result.rows.reduce((sum, r) => sum + r.demand_mw * 0.25, 0);
    expect(Math.abs(upsampledEnergyMwh - originalEnergyMwh)).toBeLessThan(1e-6);
  });

  it('adds upsampled_15min quality flag to all output rows', () => {
    const rows = [
      makeHourlyRow(BASE_EPOCH, 3.0),
      makeHourlyRow(BASE_EPOCH + HOUR, 4.0),
    ];
    const result = upsampleToQuarterHour(rows);
    expect(result.wasUpsampled).toBe(true);
    for (const row of result.rows) {
      expect(row.quality_flags).toContain('upsampled_15min');
    }
  });

  it('preserves existing quality flags alongside upsampled_15min', () => {
    const rows: UtilityHistoricalLoadRow[] = [
      { ...makeHourlyRow(BASE_EPOCH, 1.0), quality_flags: ['vee_estimated', 'missing_temperature'] },
      { ...makeHourlyRow(BASE_EPOCH + HOUR, 2.0), quality_flags: ['meter_gap_filled'] },
    ];
    const result = upsampleToQuarterHour(rows);
    const firstFourFlags = result.rows.slice(0, 4).map((r) => r.quality_flags ?? []);
    for (const flags of firstFourFlags) {
      expect(flags).toContain('upsampled_15min');
      expect(flags).toContain('vee_estimated');
    }
  });

  it('produces timestamps spaced exactly 900s apart', () => {
    const rows = [
      makeHourlyRow(BASE_EPOCH, 1.0),
      makeHourlyRow(BASE_EPOCH + HOUR, 2.0),
      makeHourlyRow(BASE_EPOCH + HOUR * 2, 3.0),
    ];
    const result = upsampleToQuarterHour(rows);
    for (let i = 1; i < result.rows.length; i++) {
      const prev = Date.parse(result.rows[i - 1].timestamp);
      const curr = Date.parse(result.rows[i].timestamp);
      expect(curr - prev).toBe(QUARTER * 1000);
    }
  });

  it('first output timestamp matches first input timestamp', () => {
    const rows = [
      makeHourlyRow(BASE_EPOCH, 5.0),
      makeHourlyRow(BASE_EPOCH + HOUR, 6.0),
    ];
    const result = upsampleToQuarterHour(rows);
    expect(result.rows[0].timestamp).toBe(new Date(BASE_EPOCH * 1000).toISOString());
  });
});
