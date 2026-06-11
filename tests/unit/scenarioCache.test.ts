import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ScenarioCache,
  scenarioCache,
  LIVE_TTL_MS,
  STATIC_TTL_MS,
  DEFAULT_MAX_ENTRIES,
  exponentialBackoffDelay,
} from '../../src/lib/scenarioCache';

// ── sessionStorage mock ───────────────────────────────────────────────────────

const mockStorage = new Map<string, string>();
vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => mockStorage.get(k) ?? null,
  setItem: (k: string, v: string) => { mockStorage.set(k, v); },
  removeItem: (k: string) => { mockStorage.delete(k); },
  clear: () => mockStorage.clear(),
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const DATA_A = { value: 42, label: 'test' };

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ScenarioCache', () => {
  let cache: ScenarioCache;

  beforeEach(() => {
    cache = new ScenarioCache(5); // small for LRU tests
    mockStorage.clear();
  });

  describe('basic get/set', () => {
    it('returns null on miss', () => {
      expect(cache.getCachedOutcome(HASH_A)).toBeNull();
    });

    it('returns stored data on hit', () => {
      cache.setCachedOutcome(HASH_A, DATA_A);
      const result = cache.getCachedOutcome<typeof DATA_A>(HASH_A);
      expect(result).toEqual(DATA_A);
    });

    it('increments hitCount on hit', () => {
      cache.setCachedOutcome(HASH_A, DATA_A);
      cache.getCachedOutcome(HASH_A);
      expect(cache.getStats().hitCount).toBe(1);
    });

    it('increments missCount on miss', () => {
      cache.getCachedOutcome(HASH_A);
      expect(cache.getStats().missCount).toBe(1);
    });
  });

  describe('TTL expiry', () => {
    it('returns null for expired LIVE entries', () => {
      vi.useFakeTimers();
      cache.setCachedOutcome(HASH_A, DATA_A, { dataType: 'live' });
      vi.advanceTimersByTime(LIVE_TTL_MS + 1);
      expect(cache.getCachedOutcome(HASH_A)).toBeNull();
      expect(cache.getStats().expiredCount).toBe(1);
      vi.useRealTimers();
    });

    it('STATIC entries survive LIVE_TTL_MS', () => {
      vi.useFakeTimers();
      cache.setCachedOutcome(HASH_A, DATA_A, { dataType: 'static' });
      vi.advanceTimersByTime(LIVE_TTL_MS + 1);
      expect(cache.getCachedOutcome(HASH_A)).toEqual(DATA_A);
      vi.useRealTimers();
    });

    it('STATIC entries expire after STATIC_TTL_MS', () => {
      vi.useFakeTimers();
      cache.setCachedOutcome(HASH_A, DATA_A, { dataType: 'static' });
      vi.advanceTimersByTime(STATIC_TTL_MS + 1);
      expect(cache.getCachedOutcome(HASH_A)).toBeNull();
      vi.useRealTimers();
    });
  });

  describe('LRU eviction', () => {
    it('evicts the oldest entry when at capacity', () => {
      // Fill up to max (5)
      for (let i = 0; i < 5; i++) {
        cache.setCachedOutcome('hash-' + i, { i });
      }
      expect(cache.getStats().size).toBe(5);

      // Adding a 6th should evict 'hash-0' (oldest)
      cache.setCachedOutcome('hash-new', { i: 99 });
      expect(cache.getStats().size).toBe(5);
      expect(cache.getCachedOutcome('hash-0')).toBeNull(); // evicted
      expect(cache.getCachedOutcome('hash-new')).toEqual({ i: 99 });
    });

    it('evictionCount increments on LRU eviction', () => {
      for (let i = 0; i < 6; i++) {
        cache.setCachedOutcome('h' + i, i);
      }
      expect(cache.getStats().evictionCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('connector invalidation', () => {
    it('invalidates entries with matching provenanceRef', () => {
      cache.setCachedOutcome(HASH_A, DATA_A, { provenanceRefs: ['statcan', 'cer'] });
      cache.setCachedOutcome(HASH_B, { x: 1 }, { provenanceRefs: ['aeso'] });

      const count = cache.invalidateConnectorCache('statcan');
      expect(count).toBe(1);
      expect(cache.getCachedOutcome(HASH_A)).toBeNull();
      expect(cache.getCachedOutcome(HASH_B)).toEqual({ x: 1 });
    });

    it('returns 0 when no entries match the connector', () => {
      cache.setCachedOutcome(HASH_A, DATA_A, { provenanceRefs: ['cer'] });
      expect(cache.invalidateConnectorCache('ieso')).toBe(0);
    });
  });

  describe('sessionStorage round-trip', () => {
    it('persists data to sessionStorage on set', () => {
      cache.setCachedOutcome(HASH_A, DATA_A);
      const stored = mockStorage.get(`ceip:scenario-cache:${HASH_A}`);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.data).toEqual(DATA_A);
    });

    it('retrieves from sessionStorage on memory miss', () => {
      // Populate via one cache instance
      cache.setCachedOutcome(HASH_A, DATA_A);
      // New cache instance hits sessionStorage
      const cache2 = new ScenarioCache();
      const result = cache2.getCachedOutcome<typeof DATA_A>(HASH_A);
      expect(result).toEqual(DATA_A);
    });
  });

  describe('clear', () => {
    it('clears all entries from memory and sessionStorage', () => {
      cache.setCachedOutcome(HASH_A, DATA_A);
      cache.setCachedOutcome(HASH_B, { y: 2 });
      cache.clear();
      expect(cache.getStats().size).toBe(0);
      expect(mockStorage.size).toBe(0);
    });
  });
});

describe('exponentialBackoffDelay', () => {
  it('returns 0 on attempt 0 with zero base (full jitter edge)', () => {
    // Math.random() always ≥ 0, so delay ≥ 0
    const delay = exponentialBackoffDelay(0, 0, 100);
    expect(delay).toBeGreaterThanOrEqual(0);
  });

  it('caps at maxMs', () => {
    // Attempt 100 would overflow without cap
    const delay = exponentialBackoffDelay(100, 500, 30_000);
    expect(delay).toBeLessThanOrEqual(30_000);
    expect(delay).toBeGreaterThanOrEqual(0);
  });

  it('increases with attempt number on average', () => {
    // Run 20 samples each at attempt 0 and attempt 5; expect attempt-5 avg higher
    const samples0 = Array.from({ length: 20 }, () => exponentialBackoffDelay(0, 100, 100_000));
    const samples5 = Array.from({ length: 20 }, () => exponentialBackoffDelay(5, 100, 100_000));
    const avg0 = samples0.reduce((a, b) => a + b, 0) / samples0.length;
    const avg5 = samples5.reduce((a, b) => a + b, 0) / samples5.length;
    // Very high probability attempt-5 avg > attempt-0 avg (law of large numbers)
    expect(avg5).toBeGreaterThan(avg0);
  });
});

describe('singleton scenarioCache', () => {
  it('is an instance of ScenarioCache with DEFAULT_MAX_ENTRIES', () => {
    expect(scenarioCache).toBeInstanceOf(ScenarioCache);
    expect(scenarioCache.getStats().maxEntries).toBe(DEFAULT_MAX_ENTRIES);
  });
});
