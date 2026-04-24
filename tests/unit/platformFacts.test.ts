import { describe, expect, it } from 'vitest';
import { getFeatureReleaseDisplay } from '../../src/lib/featureFlags';
import {
  describeFreshness,
  getProvinceCoverageFact,
  getRecordCountFact,
  getTerritoryCoverageFact,
} from '../../src/lib/platformFacts';

describe('platform facts', () => {
  it('returns canonical province coverage without folding territories into the same count', () => {
    expect(getProvinceCoverageFact()).toEqual({
      label: 'Provinces Covered',
      value: '10/10',
      note: 'Province-only coverage. Territories are tracked separately where supported.',
    });

    expect(getTerritoryCoverageFact()).toEqual({
      label: 'Territories Supported',
      value: '3/3',
      note: 'Shown separately from province coverage to avoid jurisdiction drift.',
    });
  });

  it('describes freshness using live, stale, or updated labels', () => {
    const now = new Date('2026-04-24T12:00:00.000Z');

    expect(describeFreshness({
      timestamp: '2026-04-24T11:55:00.000Z',
      now,
      staleAfterHours: 1,
    })).toBe('Live • Updated 5 min ago');

    expect(describeFreshness({
      timestamp: '2026-04-24T07:00:00.000Z',
      now,
      staleAfterHours: 1,
    })).toBe('Stale • Updated 5h ago');
  });

  it('labels record counts by scope', () => {
    expect(getRecordCountFact(1234, 'loaded')).toEqual({
      label: 'Loaded Records',
      value: '1,234',
    });

    expect(getRecordCountFact(42, 'visible')).toEqual({
      label: 'Visible Records',
      value: '42',
    });
  });

  it('marks roadmap items as overdue after their estimated quarter passes', () => {
    const overdue = getFeatureReleaseDisplay(
      {
        status: 'deferred',
        comingSoon: true,
        estimatedRelease: 'Phase 2 - Q1 2026',
      },
      new Date('2026-04-24T12:00:00.000Z'),
    );

    const upcoming = getFeatureReleaseDisplay(
      {
        status: 'deferred',
        comingSoon: true,
        estimatedRelease: 'Phase 2 - Q3 2026',
      },
      new Date('2026-04-24T12:00:00.000Z'),
    );

    expect(overdue).toEqual({
      label: 'Overdue',
      tone: 'danger',
      note: 'Est. Phase 2 - Q1 2026',
    });

    expect(upcoming.label).toBe('Coming Soon');
    expect(upcoming.tone).toBe('info');
  });
});
