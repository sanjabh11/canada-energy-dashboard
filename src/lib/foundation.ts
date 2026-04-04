export type FreshnessStatus = 'live' | 'stale' | 'demo' | 'unknown';

export interface DataProvenanceMeta {
  source: string;
  lastUpdated: string | null;
  freshnessStatus: FreshnessStatus;
  isFallback: boolean;
  note?: string;
  sourceUrl?: string;
}

interface BuildDataProvenanceOptions {
  source: string;
  lastUpdated?: string | null;
  isFallback?: boolean;
  staleAfterHours?: number;
  now?: Date;
  note?: string;
  sourceUrl?: string;
}

export function getFreshnessStatus(options: {
  lastUpdated?: string | null;
  isFallback?: boolean;
  staleAfterHours?: number;
  now?: Date;
}): FreshnessStatus {
  const { lastUpdated, isFallback = false, staleAfterHours = 24, now = new Date() } = options;

  if (isFallback) return 'demo';
  if (!lastUpdated) return 'unknown';

  const parsed = new Date(lastUpdated);
  if (Number.isNaN(parsed.getTime())) return 'unknown';

  const ageHours = (now.getTime() - parsed.getTime()) / (1000 * 60 * 60);
  return ageHours <= staleAfterHours ? 'live' : 'stale';
}

export function buildDataProvenance(options: BuildDataProvenanceOptions): DataProvenanceMeta {
  return {
    source: options.source,
    lastUpdated: options.lastUpdated ?? null,
    freshnessStatus: getFreshnessStatus({
      lastUpdated: options.lastUpdated,
      isFallback: options.isFallback,
      staleAfterHours: options.staleAfterHours,
      now: options.now,
    }),
    isFallback: options.isFallback ?? false,
    note: options.note,
    sourceUrl: options.sourceUrl,
  };
}

export function canAccessPhase4Experience(env: Record<string, string | boolean | undefined>): boolean {
  return env.VITE_ENABLE_PHASE4_EXPERIMENTS === 'true';
}

export function isFoundationRepairMode(env: Record<string, string | boolean | undefined>): boolean {
  return !canAccessPhase4Experience(env);
}
