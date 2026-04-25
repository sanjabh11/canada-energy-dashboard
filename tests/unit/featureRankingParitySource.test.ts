import { describe, expect, it, vi } from 'vitest';
import { fetchFeatureRankingParitySummary } from '../../src/lib/featureRankingParitySource';

describe('feature ranking parity source', () => {
  it('returns artifact metadata when the static summary exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        overlapRatio: 1,
        parityPassed: true,
        datasetFingerprint: 'abc',
      }),
    }));

    const result = await fetchFeatureRankingParitySummary();
    expect(result.available).toBe(true);
    expect(result.statusLabel).toBe('aligned parity passed');
    expect(result.artifact?.datasetFingerprint).toBe('abc');
  });

  it('falls back cleanly when the artifact is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const result = await fetchFeatureRankingParitySummary();
    expect(result.available).toBe(false);
    expect(result.statusLabel).toBe('artifact not uploaded yet');
    expect(result.artifact).toBeNull();
  });
});
