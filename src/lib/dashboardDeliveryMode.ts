export type DashboardDeliveryMode = 'live' | 'persisted_snapshot' | 'browser_cache' | 'unavailable';

export interface DashboardDeliveryModeInput {
  hasData: boolean;
  usingCachedSnapshot: boolean;
  snapshotType?: 'live' | 'persisted_snapshot';
  isFallback?: boolean;
}

export function resolveDashboardDeliveryMode({
  hasData,
  usingCachedSnapshot,
  snapshotType,
  isFallback,
}: DashboardDeliveryModeInput): DashboardDeliveryMode {
  if (!hasData) return 'unavailable';
  if (usingCachedSnapshot) return 'browser_cache';
  if (snapshotType === 'persisted_snapshot' || isFallback === true) return 'persisted_snapshot';
  return 'live';
}
