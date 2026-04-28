import { afterEach, describe, expect, it } from 'vitest';
import {
  buildUtilityApiDemoSessionFromXml,
  createEmptyUtilityApiDemoSession,
} from '../../src/lib/utilityApiDemo';
import bundledFixtureXml from '../../src/fixtures/utilityapi-demo-green-button.xml?raw';
import {
  clearActiveUtilityApiDemoPointer,
  clearAllUtilityApiDemoSessions,
  loadActiveUtilityApiDemoPointer,
  loadUtilityApiDemoSession,
  saveUtilityApiDemoSession,
} from '../../src/lib/utilityApiDemoStorage';

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

afterEach(async () => {
  clearActiveUtilityApiDemoPointer();
  await clearAllUtilityApiDemoSessions();
  delete (globalThis as typeof globalThis & { window?: Window }).window;
});

describe('utilityApiDemoStorage', () => {
  it('stores only the session pointer in sessionStorage while persisting heavy session data in IndexedDB-backed cache', async () => {
    const sessionStorage = new MemoryStorage();
    (globalThis as { window?: unknown }).window = { sessionStorage: sessionStorage as unknown as Storage };

    const session = buildUtilityApiDemoSessionFromXml({
      sessionId: 'fixture-session',
      mode: 'fixture',
      status: 'replayed',
      rawXml: bundledFixtureXml,
    });

    await saveUtilityApiDemoSession(session);

    const pointer = loadActiveUtilityApiDemoPointer();
    const restored = await loadUtilityApiDemoSession('fixture-session');

    expect(pointer).toEqual({
      sessionId: 'fixture-session',
      mode: 'fixture',
      status: 'replayed',
    });
    expect(sessionStorage.length).toBe(1);
    expect(restored?.rawXml).toContain('<espi:IntervalReading>');
    expect(restored?.parsedRows.length).toBe(48);
    expect(restored?.forecastPackage?.summary.interval_count).toBe(48);
    expect(restored?.summary.warnings).toContain(
      'AI upsampled: 12 hourly intervals → 48 15-minute intervals (60m → 15m).',
    );
    expect(restored?.parsedRows.every((row) => row.quality_flags?.includes('upsampled_15min'))).toBe(true);
  }, 15000);

  it('can persist a lightweight live session before XML sync is complete', async () => {
    const sessionStorage = new MemoryStorage();
    (globalThis as { window?: unknown }).window = { sessionStorage: sessionStorage as unknown as Storage };

    const session = createEmptyUtilityApiDemoSession('live-session', 'live', 'auth_pending');
    session.referral = 'demo-referral';

    await saveUtilityApiDemoSession(session);

    const restored = await loadUtilityApiDemoSession('live-session');
    expect(restored?.referral).toBe('demo-referral');
    expect(restored?.rawXml).toBeNull();
    expect(restored?.parsedRows).toEqual([]);
  });
});
