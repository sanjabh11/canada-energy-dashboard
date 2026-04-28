import type { UtilityHistoricalLoadRow } from './utilityForecasting';

const HOURLY_SECONDS = 3600;
const QUARTER_HOUR_SECONDS = 900;
const SUB_INTERVALS = HOURLY_SECONDS / QUARTER_HOUR_SECONDS;
const ENERGY_TOLERANCE = 1e-9;

export interface UpsampleResult {
  rows: UtilityHistoricalLoadRow[];
  wasUpsampled: boolean;
  originalIntervalCount: number;
  upsampledIntervalCount: number;
}

function isHourlySpaced(rows: UtilityHistoricalLoadRow[]): boolean {
  if (rows.length < 2) return rows.length === 1;
  for (let i = 1; i < rows.length; i++) {
    const prev = Date.parse(rows[i - 1].timestamp);
    const curr = Date.parse(rows[i].timestamp);
    if (!Number.isFinite(prev) || !Number.isFinite(curr)) return false;
    const gapSeconds = (curr - prev) / 1000;
    if (Math.abs(gapSeconds - HOURLY_SECONDS) > 1) return false;
  }
  return true;
}

function isAlreadyQuarterHour(rows: UtilityHistoricalLoadRow[]): boolean {
  if (rows.length < 2) return false;
  const gapSeconds = (Date.parse(rows[1].timestamp) - Date.parse(rows[0].timestamp)) / 1000;
  return Math.abs(gapSeconds - QUARTER_HOUR_SECONDS) <= 1;
}

function linearInterp(a: number, b: number, fraction: number): number {
  return a + (b - a) * fraction;
}

function upsampleOneHour(
  row: UtilityHistoricalLoadRow,
  prevDemandMw: number,
  nextDemandMw: number,
): UtilityHistoricalLoadRow[] {
  const startMs = Date.parse(row.timestamp);
  const originalEnergyMwh = row.demand_mw * 1;

  const rawSubDemands: number[] = [];
  for (let s = 0; s < SUB_INTERVALS; s++) {
    const fractionAtMidpoint = (s + 0.5) / SUB_INTERVALS;
    rawSubDemands.push(linearInterp(prevDemandMw, nextDemandMw, fractionAtMidpoint));
  }

  const rawSubEnergySum = rawSubDemands.reduce((acc, d) => acc + d * 0.25, 0);
  const correctionFactor = rawSubEnergySum > ENERGY_TOLERANCE
    ? originalEnergyMwh / rawSubEnergySum
    : 1;

  const baseFlags: string[] = Array.from(row.quality_flags ?? []);
  if (!baseFlags.includes('upsampled_15min')) {
    baseFlags.push('upsampled_15min');
  }

  return rawSubDemands.map((rawDemand, s) => ({
    ...row,
    timestamp: new Date(startMs + s * QUARTER_HOUR_SECONDS * 1000).toISOString(),
    demand_mw: Number((rawDemand * correctionFactor).toFixed(6)),
    quality_flags: baseFlags as UtilityHistoricalLoadRow['quality_flags'],
  }));
}

export function upsampleToQuarterHour(rows: UtilityHistoricalLoadRow[]): UpsampleResult {
  const noOp: UpsampleResult = {
    rows,
    wasUpsampled: false,
    originalIntervalCount: rows.length,
    upsampledIntervalCount: rows.length,
  };

  if (rows.length === 0) return noOp;
  if (rows.length >= 2 && isAlreadyQuarterHour(rows)) return noOp;
  if (!isHourlySpaced(rows)) return noOp;

  const output: UtilityHistoricalLoadRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const prevDemand = i === 0 ? row.demand_mw : rows[i - 1].demand_mw;
    const nextDemand = i === rows.length - 1 ? row.demand_mw : rows[i + 1].demand_mw;

    const leftAnchor = linearInterp(prevDemand, row.demand_mw, 0.5);
    const rightAnchor = linearInterp(row.demand_mw, nextDemand, 0.5);
    output.push(...upsampleOneHour(row, leftAnchor, rightAnchor));
  }

  return {
    rows: output,
    wasUpsampled: true,
    originalIntervalCount: rows.length,
    upsampledIntervalCount: output.length,
  };
}
