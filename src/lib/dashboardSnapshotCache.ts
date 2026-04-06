export interface CachedDashboardSnapshot<T> {
  payload: T;
  cachedAt: string;
}

function isStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadDashboardSnapshot<T>(key: string): CachedDashboardSnapshot<T> | null {
  if (!isStorageAvailable()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CachedDashboardSnapshot<T>;
  } catch {
    return null;
  }
}

export function saveDashboardSnapshot<T>(key: string, payload: T): void {
  if (!isStorageAvailable()) return;

  try {
    const snapshot: CachedDashboardSnapshot<T> = {
      payload,
      cachedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    return;
  }
}
