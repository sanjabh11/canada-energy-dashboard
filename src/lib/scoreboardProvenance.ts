import { buildDataProvenance, type DataProvenanceMeta, type FreshnessStatus } from './foundation';

export interface MetricCandidate<T> {
  value: T | null | undefined;
  source: string;
  lastUpdated?: string | null;
  freshnessStatus?: FreshnessStatus;
  isFallback?: boolean;
  note?: string;
  staleAfterHours?: number;
}

export interface ResolvedMetric<T> {
  value: T | null;
  meta: DataProvenanceMeta;
}

interface AnalyticsPageProvenanceOptions {
  connectionStatuses: Array<{ status: string }>;
  lastUpdated?: string | null;
  hasSupplementedData?: boolean;
  excludedLowQualityCount?: number;
}

interface DashboardFreshnessOptions {
  connectionStatuses: Array<{ status?: string | null; source?: string | null }>;
  lastUpdated?: string | null;
  fallbackLastUpdated?: string | null;
  noteWhenFallback?: string;
  liveSource?: string;
  fallbackSource?: string;
  staleAfterHours?: number;
}

function hasUsableValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return true;
}

export function extractLatestIsoTimestamp(...values: Array<string | Date | null | undefined>): string | null {
  const timestamps = values
    .map((value) => {
      if (!value) return null;
      const parsed = value instanceof Date ? value : new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    })
    .filter((value): value is Date => value !== null);

  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.reduce((latest, current) => (
    current.getTime() > latest.getTime() ? current : latest
  )).toISOString();
}

export function resolveMetricCandidate<T>(
  candidates: MetricCandidate<T>[],
  options: { defaultSource?: string; defaultNote?: string; staleAfterHours?: number } = {},
): ResolvedMetric<T> {
  const selected = candidates.find((candidate) => hasUsableValue(candidate.value));

  if (!selected) {
    return {
      value: null,
      meta: buildDataProvenance({
        source: options.defaultSource ?? 'Unavailable',
        lastUpdated: null,
        isFallback: true,
        staleAfterHours: options.staleAfterHours ?? 24,
        note: options.defaultNote ?? 'No verified source is currently available for this metric.',
      }),
    };
  }

  const meta = buildDataProvenance({
    source: selected.source,
    lastUpdated: selected.lastUpdated ?? null,
    isFallback: selected.isFallback,
    staleAfterHours: selected.staleAfterHours ?? options.staleAfterHours ?? 24,
    note: selected.note,
  });

  return {
    value: selected.value ?? null,
    meta: selected.freshnessStatus ? { ...meta, freshnessStatus: selected.freshnessStatus } : meta,
  };
}

export function buildAnalyticsPageProvenance({
  connectionStatuses,
  lastUpdated,
  hasSupplementedData = false,
  excludedLowQualityCount = 0,
}: AnalyticsPageProvenanceOptions): DataProvenanceMeta {
  const hasFallbackConnection = connectionStatuses.some((status) => status.status === 'fallback');
  const hasErroredConnection = connectionStatuses.some((status) => status.status === 'error');
  const allConnected = connectionStatuses.length > 0 && connectionStatuses.every((status) => status.status === 'connected');
  const isFallback = hasFallbackConnection || hasSupplementedData;

  const note = isFallback
    ? excludedLowQualityCount > 0
      ? `${excludedLowQualityCount} low-completeness records were excluded and supplemented analytics remain visible.`
      : 'Some analytics tiles currently rely on supplemented or fallback inputs.'
    : hasErroredConnection
      ? 'Analytics provenance is incomplete because at least one upstream dataset failed to connect.'
      : 'Analytics metrics are derived from connected provincial generation and Ontario demand datasets.';

  return buildDataProvenance({
    source: isFallback
      ? 'Mixed analytics fallback inputs'
      : allConnected
        ? 'Provincial generation + Ontario demand datasets'
        : 'Analytics provenance unavailable',
    lastUpdated: lastUpdated ?? null,
    isFallback,
    staleAfterHours: 24,
    note,
  });
}

export function buildDashboardFreshnessProvenance({
  connectionStatuses,
  lastUpdated,
  fallbackLastUpdated,
  noteWhenFallback = 'At least one displayed dataset is running in fallback mode.',
  liveSource = 'Connected energy datasets',
  fallbackSource = 'Fallback energy datasets',
  staleAfterHours = 1,
}: DashboardFreshnessOptions): DataProvenanceMeta {
  const hasFallbackConnection = connectionStatuses.some((status) => (
    status.status === 'fallback' || status.source === 'fallback'
  ));
  const hasVerifiedTimestamp = Boolean(lastUpdated ?? fallbackLastUpdated);

  return buildDataProvenance({
    source: hasFallbackConnection
      ? fallbackSource
      : hasVerifiedTimestamp
        ? liveSource
        : 'Energy datasets not yet verified',
    lastUpdated: lastUpdated ?? fallbackLastUpdated ?? null,
    isFallback: hasFallbackConnection,
    staleAfterHours,
    note: hasFallbackConnection
      ? noteWhenFallback
      : hasVerifiedTimestamp
        ? 'Dashboard freshness is derived from connected energy datasets.'
        : 'No verified dashboard timestamp is available yet.',
  });
}
