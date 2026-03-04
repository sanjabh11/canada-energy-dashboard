import { DATA_CONFIDENCE_CONFIG } from '../config/dataConfidenceConfig';
import type { AESODataConfidence } from './aesoService';

export type DataSourceName =
  | 'aeso_pool'
  | 'forecast_dataset'
  | 'tier_inputs'
  | 'compliance_pack';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface DataSnapshot {
  source: DataSourceName;
  lastUpdated: string;
  sampleCount?: number;
  dataConfidence?: AESODataConfidence;
  dataSource?: 'api' | 'cached';
  label?: string;
}

export interface ConfidenceResult {
  source: DataSourceName;
  level: ConfidenceLevel;
  score: number;
  maxAgeHours: number;
  ageHours: number;
  lastUpdated: string;
  reason?: string;
  label?: string;
}

export interface ExportGateResult {
  allowed: boolean;
  reason?: string;
  confidence: ConfidenceLevel;
  blockedSources: DataSourceName[];
  results: ConfidenceResult[];
  evaluatedAt: string;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toHours = (from: Date, to: Date): number => Math.max(0, (to.getTime() - from.getTime()) / 3_600_000);

const getThresholdHours = (source: DataSourceName, now: Date): number => {
  if (source === 'aeso_pool' || source === 'compliance_pack') {
    const hour = now.getHours();
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
    return isPeak
      ? DATA_CONFIDENCE_CONFIG.AESO_POOL_STALE_HOURS_PEAK
      : DATA_CONFIDENCE_CONFIG.AESO_POOL_STALE_HOURS_OFFPEAK;
  }

  if (source === 'forecast_dataset') {
    return DATA_CONFIDENCE_CONFIG.FORECAST_DATA_STALE_HOURS;
  }

  return DATA_CONFIDENCE_CONFIG.TIER_INPUT_STALE_DAYS * 24;
};

const toLevel = (score: number): ConfidenceLevel => {
  if (score >= 0.8) return 'high';
  if (score >= 0.55) return 'medium';
  return 'low';
};

const sourceLabel = (source: DataSourceName): string => {
  if (source === 'aeso_pool') return 'AESO pool price feed';
  if (source === 'forecast_dataset') return 'Forecast benchmark dataset';
  if (source === 'tier_inputs') return 'TIER input assumptions';
  return 'Compliance export package inputs';
};

export function getConfidence(snapshot: DataSnapshot, now: Date = new Date()): ConfidenceResult {
  const parsed = new Date(snapshot.lastUpdated);
  if (Number.isNaN(parsed.getTime())) {
    return {
      source: snapshot.source,
      level: 'low',
      score: 0,
      maxAgeHours: getThresholdHours(snapshot.source, now),
      ageHours: Number.POSITIVE_INFINITY,
      lastUpdated: snapshot.lastUpdated,
      reason: `${sourceLabel(snapshot.source)} has an invalid last-updated timestamp.`,
      label: snapshot.label,
    };
  }

  const maxAgeHours = getThresholdHours(snapshot.source, now);
  const ageHours = toHours(parsed, now);
  let score = clamp(1 - ageHours / maxAgeHours, 0, 1);
  let reason: string | undefined;

  if (snapshot.dataConfidence === 'cached' || snapshot.dataSource === 'cached') {
    score = Math.min(score, 0.25);
    reason = `${sourceLabel(snapshot.source)} is running on cached fallback data.`;
  }

  const level = toLevel(score);
  if (!reason && level === 'low') {
    reason = `${sourceLabel(snapshot.source)} is stale (${ageHours.toFixed(1)}h old; max ${maxAgeHours}h).`;
  }

  return {
    source: snapshot.source,
    level,
    score: Number(score.toFixed(2)),
    maxAgeHours,
    ageHours: Number(ageHours.toFixed(2)),
    lastUpdated: parsed.toISOString(),
    reason,
    label: snapshot.label,
  };
}

const levelWeight: Record<ConfidenceLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function assertExportAllowed(
  snapshots: DataSnapshot[],
  minLevel: ConfidenceLevel = 'medium',
  now: Date = new Date()
): ExportGateResult {
  const results = snapshots.map((snapshot) => getConfidence(snapshot, now));
  const threshold = levelWeight[minLevel];
  const blocked = results.filter((result) => levelWeight[result.level] < threshold);
  const minConfidence = results.reduce<ConfidenceLevel>((lowest, current) =>
    levelWeight[current.level] < levelWeight[lowest] ? current.level : lowest
  , 'high');

  if (blocked.length === 0) {
    return {
      allowed: true,
      confidence: minConfidence,
      blockedSources: [],
      results,
      evaluatedAt: now.toISOString(),
    };
  }

  const reason = blocked
    .map((entry) => entry.reason || `${sourceLabel(entry.source)} has low confidence.`)
    .join(' ');

  return {
    allowed: false,
    reason,
    confidence: minConfidence,
    blockedSources: blocked.map((entry) => entry.source),
    results,
    evaluatedAt: now.toISOString(),
  };
}
