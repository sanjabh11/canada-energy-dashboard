import { describe, expect, it } from 'vitest';
import { buildAnalyticsPageProvenance, extractLatestIsoTimestamp, resolveMetricCandidate } from '../../src/lib/scoreboardProvenance';

describe('scoreboard provenance helpers', () => {
  it('prefers the first verified metric candidate and preserves provenance metadata', () => {
    const resolved = resolveMetricCandidate<number>([
      {
        value: null,
        source: 'Fallback sample',
        isFallback: true,
      },
      {
        value: 18250,
        source: 'Transition KPI service',
        lastUpdated: '2026-04-04T10:00:00.000Z',
        isFallback: false,
        staleAfterHours: 1,
      },
    ]);

    expect(resolved.value).toBe(18250);
    expect(resolved.meta.source).toBe('Transition KPI service');
    expect(resolved.meta.isFallback).toBe(false);
    expect(resolved.meta.lastUpdated).toBe('2026-04-04T10:00:00.000Z');
  });

  it('returns demo provenance when analytics inputs are supplemented', () => {
    const meta = buildAnalyticsPageProvenance({
      connectionStatuses: [{ status: 'connected' }, { status: 'connected' }],
      lastUpdated: '2026-04-04T09:30:00.000Z',
      hasSupplementedData: true,
      excludedLowQualityCount: 3,
    });

    expect(meta.source).toBe('Mixed analytics fallback inputs');
    expect(meta.isFallback).toBe(true);
    expect(meta.freshnessStatus).toBe('demo');
  });

  it('extracts the latest valid timestamp across sources', () => {
    expect(
      extractLatestIsoTimestamp(
        '2026-04-04T08:00:00.000Z',
        '2026-04-04T11:15:00.000Z',
        null,
        'invalid',
      ),
    ).toBe('2026-04-04T11:15:00.000Z');
  });
});
