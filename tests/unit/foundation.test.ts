import { describe, expect, it } from 'vitest';
import { buildDataProvenance, canAccessPhase4Experience, getFreshnessStatus } from '../../src/lib/foundation';

describe('foundation helpers', () => {
  it('marks fallback data as demo', () => {
    expect(getFreshnessStatus({ isFallback: true, lastUpdated: '2026-04-03T00:00:00.000Z' })).toBe('demo');
  });

  it('marks old data as stale', () => {
    expect(
      getFreshnessStatus({
        lastUpdated: '2026-01-01T00:00:00.000Z',
        staleAfterHours: 24,
        now: new Date('2026-04-03T00:00:00.000Z'),
      }),
    ).toBe('stale');
  });

  it('builds provenance payloads with derived freshness status and advanced trust/license fields', () => {
    const meta = buildDataProvenance({
      source: 'AESO',
      lastUpdated: '2026-04-03T00:00:00.000Z',
      staleAfterHours: 24,
      now: new Date('2026-04-03T12:00:00.000Z'),
      trustTier: 'official_historical',
      licenseNotes: 'Open Government Licence - Alberta',
      calculationMethod: 'Hourly average aggregation',
      evidenceHash: 'a5c8e31b816a22b7c4d51628d9c22',
    });

    expect(meta.source).toBe('AESO');
    expect(meta.isFallback).toBe(false);
    expect(meta.freshnessStatus).toBe('live');
    expect(meta.trustTier).toBe('official_historical');
    expect(meta.licenseNotes).toBe('Open Government Licence - Alberta');
    expect(meta.calculationMethod).toBe('Hourly average aggregation');
    expect(meta.evidenceHash).toBe('a5c8e31b816a22b7c4d51628d9c22');
  });

  it('gates phase 4 surfaces by default', () => {
    expect(canAccessPhase4Experience({ DEV: false, VITE_ENABLE_PHASE4_EXPERIMENTS: 'false' })).toBe(false);
    expect(canAccessPhase4Experience({ DEV: true })).toBe(false);
    expect(canAccessPhase4Experience({ DEV: false, VITE_ENABLE_PHASE4_EXPERIMENTS: 'true' })).toBe(true);
  });
});
