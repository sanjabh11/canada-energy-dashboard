import { describe, expect, it } from 'vitest';
import {
  combineRateLimitResults,
  llmRateLimitVerdict,
  effectiveLlmQuota,
} from '../../supabase/functions/_shared/llmRateLimit.ts';

describe('llmRateLimitVerdict — per-bucket allow/deny', () => {
  it('allows while used stays within quota', () => {
    expect(llmRateLimitVerdict(1, 30)).toEqual({ ok: true, remaining: 29, limit: 30 });
    expect(llmRateLimitVerdict(30, 30)).toEqual({ ok: true, remaining: 0, limit: 30 });
  });

  it('denies once the incremented count exceeds the quota', () => {
    // Regression guard: the inline implementation this replaces hardcoded
    // ok:true and the limiter never denied. The RPC increments first, so
    // used==limit+1 means this request ran over.
    expect(llmRateLimitVerdict(31, 30)).toEqual({ ok: false, remaining: 0, limit: 30 });
    expect(llmRateLimitVerdict(100, 5)).toEqual({ ok: false, remaining: 0, limit: 5 });
  });

  it('treats malformed counts conservatively', () => {
    expect(llmRateLimitVerdict(Number.NaN, 30)).toEqual({ ok: false, remaining: 0, limit: 30 });
    expect(llmRateLimitVerdict(5, Number.NaN)).toEqual({ ok: false, remaining: 0, limit: 0 });
  });
});

describe('effectiveLlmQuota', () => {
  it('enforces the configured ceiling while preserving stricter row quotas', () => {
    expect(effectiveLlmQuota(60, 30)).toBe(30);
    expect(effectiveLlmQuota(10, 30)).toBe(10);
  });
  it('rejects invalid values', () => {
    expect(() => effectiveLlmQuota(NaN, 30)).toThrow();
    expect(() => effectiveLlmQuota(60, 0)).toThrow();
  });
});

describe('combineRateLimitResults — dual-bucket semantics', () => {
  it('denies when EITHER bucket is exhausted', () => {
    expect(
      combineRateLimitResults([
        { ok: true, remaining: 10, limit: 30 },
        { ok: false, remaining: 0, limit: 30 },
      ]),
    ).toEqual({ ok: false, remaining: 0, limit: 30 });
    expect(
      combineRateLimitResults([
        { ok: false, remaining: 0, limit: 30 },
        { ok: true, remaining: 10, limit: 30 },
      ]),
    ).toEqual({ ok: false, remaining: 0, limit: 30 });
  });

  it('reports the most-constrained remaining when both allow', () => {
    expect(
      combineRateLimitResults([
        { ok: true, remaining: 25, limit: 30 },
        { ok: true, remaining: 3, limit: 30 },
      ]),
    ).toEqual({ ok: true, remaining: 3, limit: 30 });
  });
});
