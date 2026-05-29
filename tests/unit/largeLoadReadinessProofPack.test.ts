import { describe, expect, it } from 'vitest';
import {
  buildLargeLoadDescriptor,
  buildLargeLoadProofBundle,
  buildLargeLoadReadinessSummary,
} from '../../src/lib/largeLoadReadinessProofPack';

describe('largeLoadReadiness proof workflow', () => {
  it('keeps non-Alberta scenarios bounded to planning-only mode', () => {
    const summary = buildLargeLoadReadinessSummary({
      selectedProvince: 'ON',
      queueData: null,
      dcData: null,
      input: {
        requestedMw: 120,
        timelineBand: '12-24 months',
        onSiteGenerationMw: 20,
        byopStorageContributionMw: 10,
      },
    });

    const descriptor = buildLargeLoadDescriptor({
      input: {
        requestedMw: 120,
        timelineBand: '12-24 months',
        onSiteGenerationMw: 20,
        byopStorageContributionMw: 10,
      },
      summary,
    });

    expect(buildLargeLoadProofBundle().artifacts[0].label).toBe('Readiness summary');
    expect(buildLargeLoadProofBundle().artifacts[0].commercialProofState).toBe('constructed_commercial_scenario');
    expect(buildLargeLoadProofBundle().artifacts[0].doNotClaim).toContain('Engineering approval');
    expect(summary.readinessBand).toBe('alberta_only');
    expect(descriptor.sections[1].body).toContain('Readiness band: alberta only');
    expect(descriptor.sections.find((section) => section.heading === 'No-approval guardrail')).toBeTruthy();
  });
});
