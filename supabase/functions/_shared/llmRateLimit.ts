// Pure dual-bucket rate-limit verdict logic for the llm app's DB-backed
// limiter — kept Deno-free so the deny path is unit-testable. The previous
// inline implementation hardcoded ok:true and silently never denied; these
// helpers make the verdict semantics explicit and covered.

export interface LlmRateLimitResult {
  ok: boolean;
  remaining?: number;
  limit?: number;
}

export function effectiveLlmQuota(rowLimit: number, configuredLimit: number): number {
  if (!Number.isFinite(rowLimit) || rowLimit < 1 || !Number.isFinite(configuredLimit) || configuredLimit < 1) {
    throw new Error('Invalid rate limiter quota');
  }
  return Math.min(rowLimit, configuredLimit);
}

/**
 * Per-bucket verdict: a request is allowed while the used count stays within
 * the quota. `used <= limit` is deliberate — the RPC increments before the
 * check, so used==limit means this request consumed the final slot.
 */
export function llmRateLimitVerdict(used: number, limit: number): LlmRateLimitResult {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 0;
  if (!Number.isFinite(used) || used < 1) return { ok: false, remaining: 0, limit: safeLimit };
  const safeUsed = used;
  return safeUsed <= safeLimit
    ? { ok: true, remaining: Math.max(0, safeLimit - safeUsed), limit: safeLimit }
    : { ok: false, remaining: 0, limit: safeLimit };
}

/**
 * Combine dual-bucket verdicts (caller-controlled user id + rotation-proof
 * network identity): deny when EITHER bucket is exhausted, otherwise report
 * the most-constrained remaining allowance.
 */
export function combineRateLimitResults(results: LlmRateLimitResult[]): LlmRateLimitResult {
  const denied = results.find((r) => !r.ok);
  if (denied) return denied;
  return results.reduce((a, b) => ((a.remaining ?? 0) <= (b.remaining ?? 0) ? a : b));
}
