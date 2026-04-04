export type FreshnessStatus = 'live' | 'stale' | 'demo' | 'unknown';

export interface DataProvenanceMeta {
  source: string;
  last_updated: string | null;
  freshness_status: FreshnessStatus;
  is_fallback: boolean;
}

export function getFreshnessStatus(params: {
  lastUpdated?: string | null;
  isFallback?: boolean;
  staleAfterHours?: number;
}): FreshnessStatus {
  const { lastUpdated, isFallback = false, staleAfterHours = 24 } = params;

  if (isFallback) return 'demo';
  if (!lastUpdated) return 'unknown';

  const parsed = new Date(lastUpdated);
  if (Number.isNaN(parsed.getTime())) return 'unknown';

  const ageHours = (Date.now() - parsed.getTime()) / (1000 * 60 * 60);
  return ageHours <= staleAfterHours ? 'live' : 'stale';
}

export function buildDataProvenance(params: {
  source: string;
  lastUpdated?: string | null;
  isFallback?: boolean;
  staleAfterHours?: number;
}): DataProvenanceMeta {
  const lastUpdated = params.lastUpdated ?? null;

  return {
    source: params.source,
    last_updated: lastUpdated,
    freshness_status: getFreshnessStatus({
      lastUpdated,
      isFallback: params.isFallback,
      staleAfterHours: params.staleAfterHours,
    }),
    is_fallback: params.isFallback ?? false,
  };
}
