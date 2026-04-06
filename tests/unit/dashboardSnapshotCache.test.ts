import { afterEach, describe, expect, it } from 'vitest';
import { loadDashboardSnapshot, saveDashboardSnapshot } from '../../src/lib/dashboardSnapshotCache';

class MemoryStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

afterEach(() => {
  delete (globalThis as typeof globalThis & { window?: Window }).window;
});

describe('dashboardSnapshotCache', () => {
  it('saves and loads snapshots through localStorage', () => {
    const localStorage = new MemoryStorage();
    (globalThis as { window?: unknown }).window = { localStorage: localStorage as unknown as Storage };

    saveDashboardSnapshot('dashboard-key', { answer: 42 });

    const snapshot = loadDashboardSnapshot<{ answer: number }>('dashboard-key');
    expect(snapshot?.payload).toEqual({ answer: 42 });
    expect(snapshot?.cachedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns null when storage is unavailable', () => {
    expect(loadDashboardSnapshot('missing')).toBeNull();
  });

  it('returns null for corrupt JSON payloads', () => {
    const localStorage = new MemoryStorage();
    localStorage.setItem('broken', '{not-json');
    (globalThis as { window?: unknown }).window = { localStorage: localStorage as unknown as Storage };

    expect(loadDashboardSnapshot('broken')).toBeNull();
  });
});
