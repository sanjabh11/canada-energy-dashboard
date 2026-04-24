import { getFreshnessStatus, type FreshnessStatus } from './foundation';
import type { FeatureConfig, FeatureStatus } from './featureFlags';

export const CANADIAN_PROVINCES_TOTAL = 10;
export const CANADIAN_TERRITORIES_TOTAL = 3;
export const DASHBOARD_POLLING_CADENCE = '30s polling';

export interface CoverageFact {
  label: string;
  value: string;
  note?: string;
}

export interface RecordCountFact {
  label: 'Loaded Records' | 'Visible Records' | 'Filtered Records';
  value: string;
}

export interface FreshnessDisplayOptions {
  timestamp?: string | Date | null;
  status?: FreshnessStatus;
  isFallback?: boolean;
  staleAfterHours?: number;
  now?: Date;
}

export interface ReleaseDisplay {
  label: string;
  note?: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
}

function parseTimestamp(timestamp?: string | Date | null): Date | null {
  if (!timestamp) return null;
  const parsed = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRelativeAge(timestamp: Date, now: Date): string {
  const diffMs = Math.max(0, now.getTime() - timestamp.getTime());
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function parseQuarterEnd(estimate?: string | null): Date | null {
  if (!estimate) return null;

  const quarterMatch = estimate.match(/Q([1-4])\s*(\d{4})/i);
  if (!quarterMatch) return null;

  const quarter = Number(quarterMatch[1]);
  const year = Number(quarterMatch[2]);

  if (!Number.isFinite(quarter) || !Number.isFinite(year)) return null;

  const monthIndexByQuarter = [2, 5, 8, 11];
  const dayByQuarter = [31, 30, 30, 31];

  return new Date(Date.UTC(year, monthIndexByQuarter[quarter - 1], dayByQuarter[quarter - 1], 23, 59, 59, 999));
}

export function getProvinceCoverageFact(): CoverageFact {
  return {
    label: 'Provinces Covered',
    value: `${CANADIAN_PROVINCES_TOTAL}/${CANADIAN_PROVINCES_TOTAL}`,
    note: 'Province-only coverage. Territories are tracked separately where supported.',
  };
}

export function getTerritoryCoverageFact(): CoverageFact {
  return {
    label: 'Territories Supported',
    value: `${CANADIAN_TERRITORIES_TOTAL}/${CANADIAN_TERRITORIES_TOTAL}`,
    note: 'Shown separately from province coverage to avoid jurisdiction drift.',
  };
}

export function getRecordCountFact(
  count: number,
  scope: 'loaded' | 'visible' | 'filtered' = 'loaded',
): RecordCountFact {
  const labelMap = {
    loaded: 'Loaded Records',
    visible: 'Visible Records',
    filtered: 'Filtered Records',
  } as const;

  return {
    label: labelMap[scope],
    value: Math.max(0, Math.floor(count)).toLocaleString('en-CA'),
  };
}

export function describeFreshness({
  timestamp,
  status,
  isFallback = false,
  staleAfterHours = 1,
  now = new Date(),
}: FreshnessDisplayOptions): string {
  const parsed = parseTimestamp(timestamp);
  const freshness = status ?? getFreshnessStatus({
    lastUpdated: parsed ? parsed.toISOString() : null,
    isFallback,
    staleAfterHours,
    now,
  });

  if (freshness === 'unknown') return 'Unknown';
  if (freshness === 'demo') return 'Fallback data';
  if (!parsed) return 'Unknown';

  const relativeAge = formatRelativeAge(parsed, now);
  return freshness === 'live'
    ? `Live • Updated ${relativeAge}`
    : `Stale • Updated ${relativeAge}`;
}

export function getFeatureReleaseDisplay(
  feature: Pick<FeatureConfig, 'status' | 'estimatedRelease' | 'comingSoon'>,
  now = new Date(),
): ReleaseDisplay {
  switch (feature.status as FeatureStatus) {
    case 'production_ready':
      return { label: 'Production Ready', tone: 'success' };
    case 'acceptable':
      return { label: 'Available', tone: 'info' };
    case 'partial':
      return { label: 'Limited', tone: 'warning' };
    case 'deferred': {
      const estimatedRelease = feature.estimatedRelease?.trim();
      const dueDate = parseQuarterEnd(estimatedRelease);
      const isOverdue = Boolean(dueDate && dueDate.getTime() < now.getTime());

      return {
        label: isOverdue ? 'Overdue' : 'Coming Soon',
        tone: isOverdue ? 'danger' : 'info',
        note: estimatedRelease ? `Est. ${estimatedRelease}` : 'Roadmap item',
      };
    }
    default:
      return { label: 'Available', tone: 'info' };
  }
}
