/**
 * B19 – Scenario Outcome Cache
 *
 * LRU cache for expensive scenario computation results, keyed by the
 * deterministic scenario hash from B01 (hashScenario).
 *
 * Architecture:
 * - Memory-first: O(1) Map lookup before any storage I/O
 * - sessionStorage fallback: persists across soft refreshes within same tab
 * - LRU eviction: oldest entry removed when capacity (maxEntries) exceeded
 * - Two TTL tiers:
 *     LIVE_TTL_MS  (15 min) — connector-backed data that may change
 *     STATIC_TTL_MS (24 hr) — CER/StatCan projections that rarely change
 * - Connector-scoped invalidation: invalidateConnectorCache() clears all
 *   entries that reference a given connector ID in their provenanceRefs
 *
 * Design: zero external dependencies; works in browser (sessionStorage) and
 * test environments (memory-only, sessionStorage stubbed).
 *
 * References:
 * - B01 hashScenario (src/lib/validators/scenarios.ts)
 * - B05 OfficialDataConnector freshness (src/lib/connectors/index.ts)
 * - B09 AgentHardening withFallback (src/lib/agentHardening.ts)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const LIVE_TTL_MS = 15 * 60 * 1000;       // 15 minutes
export const STATIC_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const DEFAULT_MAX_ENTRIES = 50;
export const STORAGE_KEY_PREFIX = 'ceip:scenario-cache:';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CacheDataType = 'live' | 'static';

export interface CacheEntry<T = unknown> {
  hash: string;
  data: T;
  storedAt: number;        // Date.now() epoch ms
  ttlMs: number;           // LIVE_TTL_MS or STATIC_TTL_MS
  dataType: CacheDataType;
  /** Connector IDs that contributed to this cache entry */
  provenanceRefs: string[];
}

export interface CacheStats {
  size: number;
  maxEntries: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  expiredCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage helpers (graceful fallback if sessionStorage unavailable)
// ─────────────────────────────────────────────────────────────────────────────

function tryReadStorage(hash: string): CacheEntry | null {
  try {
    const raw = sessionStorage?.getItem(STORAGE_KEY_PREFIX + hash);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function tryWriteStorage(entry: CacheEntry): void {
  try {
    sessionStorage?.setItem(STORAGE_KEY_PREFIX + entry.hash, JSON.stringify(entry));
  } catch {
    // QuotaExceededError or sessionStorage unavailable — silent ignore
  }
}

function tryDeleteStorage(hash: string): void {
  try {
    sessionStorage?.removeItem(STORAGE_KEY_PREFIX + hash);
  } catch {
    // silent
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ScenarioCache class
// ─────────────────────────────────────────────────────────────────────────────

export class ScenarioCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;
  private expiredCount = 0;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  /**
   * Retrieve a cached outcome by scenario hash.
   * Returns null on miss, stale (expired), or storage read failure.
   */
  getCachedOutcome<T = unknown>(hash: string): T | null {
    // Memory-first
    let entry = this.store.get(hash) ?? null;

    // sessionStorage fallback
    if (!entry) {
      entry = tryReadStorage(hash) as CacheEntry<T> | null;
      if (entry) {
        this.store.set(hash, entry);
        this._promoteToHead(hash);
      }
    }

    if (!entry) {
      this.missCount++;
      return null;
    }

    // TTL check
    if (Date.now() - entry.storedAt > entry.ttlMs) {
      this.expiredCount++;
      this._evict(hash);
      return null;
    }

    this.hitCount++;
    this._promoteToHead(hash); // LRU: mark as recently used
    return entry.data as T;
  }

  /**
   * Store a scenario outcome.
   * Evicts the LRU entry if at capacity.
   */
  setCachedOutcome<T = unknown>(
    hash: string,
    data: T,
    options: {
      dataType?: CacheDataType;
      ttlMs?: number;
      provenanceRefs?: string[];
    } = {},
  ): void {
    const {
      dataType = 'live',
      ttlMs = dataType === 'static' ? STATIC_TTL_MS : LIVE_TTL_MS,
      provenanceRefs = [],
    } = options;

    if (this.store.size >= this.maxEntries && !this.store.has(hash)) {
      this._evictLRU();
    }

    const entry: CacheEntry<T> = {
      hash,
      data,
      storedAt: Date.now(),
      ttlMs,
      dataType,
      provenanceRefs,
    };

    this.store.set(hash, entry);
    tryWriteStorage(entry);
  }

  /**
   * Invalidate all cache entries that reference a specific connector ID.
   * Used when a connector reports a fresh pull that supersedes stale cache.
   */
  invalidateConnectorCache(connectorId: string): number {
    let invalidated = 0;
    for (const [hash, entry] of this.store.entries()) {
      if (entry.provenanceRefs.includes(connectorId)) {
        this._evict(hash);
        invalidated++;
      }
    }
    return invalidated;
  }

  /** Remove a single entry by hash */
  invalidate(hash: string): boolean {
    return this._evict(hash);
  }

  /** Clear entire cache (memory + sessionStorage entries we know about) */
  clear(): void {
    for (const hash of Array.from(this.store.keys())) {
      tryDeleteStorage(hash);
    }
    this.store.clear();
  }

  /** Current cache statistics (read-only snapshot) */
  getStats(): CacheStats {
    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
      hitCount: this.hitCount,
      missCount: this.missCount,
      evictionCount: this.evictionCount,
      expiredCount: this.expiredCount,
    };
  }

  /** Reset counters (useful between tests) */
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
    this.expiredCount = 0;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _evict(hash: string): boolean {
    const had = this.store.has(hash);
    if (had) {
      this.store.delete(hash);
      tryDeleteStorage(hash);
      this.evictionCount++;
    }
    return had;
  }

  /**
   * Evict the Least Recently Used entry.
   * Map insertion order acts as LRU when `_promoteToHead` re-inserts on access.
   */
  private _evictLRU(): void {
    const oldest = this.store.keys().next().value;
    if (oldest !== undefined) {
      this._evict(oldest);
    }
  }

  /**
   * Promote an entry to the "head" (most recently used) by re-inserting it.
   * Only effective if the hash already exists in the Map.
   */
  private _promoteToHead(hash: string): void {
    const entry = this.store.get(hash);
    if (!entry) return;
    this.store.delete(hash);
    this.store.set(hash, entry);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton (shared across the app; reset via `scenarioCache.clear()`)
// ─────────────────────────────────────────────────────────────────────────────

export const scenarioCache = new ScenarioCache(DEFAULT_MAX_ENTRIES);

// ─────────────────────────────────────────────────────────────────────────────
// Exponential back-off helper (also used in B09 circuit half-open)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate exponential back-off delay with full jitter.
 * Safe to call in tests (no actual sleep; returns the intended delay ms).
 *
 * @param attempt  0-based attempt number
 * @param baseMs   Base delay in ms (default: 500)
 * @param maxMs    Max delay cap in ms (default: 30 000)
 * @returns Delay in ms (includes random jitter)
 */
export function exponentialBackoffDelay(
  attempt: number,
  baseMs = 500,
  maxMs = 30_000,
): number {
  const uncapped = baseMs * Math.pow(2, attempt);
  const capped = Math.min(uncapped, maxMs);
  return Math.floor(Math.random() * capped); // full jitter
}

/**
 * Async helper that actually sleeps for the computed delay.
 * Do NOT use in unit tests — call `exponentialBackoffDelay` directly there.
 */
export async function sleepWithBackoff(attempt: number, baseMs = 500, maxMs = 30_000): Promise<void> {
  const delay = exponentialBackoffDelay(attempt, baseMs, maxMs);
  await new Promise<void>((resolve) => setTimeout(resolve, delay));
}
