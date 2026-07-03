import { describe, expect, it } from 'vitest';
import { computeFleetSCR, WEAK_GRID_FIXTURES } from '../../src/lib/weakGridFixtures';

describe('computeFleetSCR', () => {
  it('returns error for empty fixtures array', () => {
    const result = computeFleetSCR([]);

    expect(result.overallAssessment).toBe('weak');
    expect(result.advisoryLabel).toContain('ERROR');
    expect(result.nodeResults).toHaveLength(0);
  });

  it('returns error when fixture has empty topology (no nodes)', () => {
    const result = computeFleetSCR([
      {
        key: 'empty',
        label: 'Empty',
        province: 'AB',
        sourceMode: 'fixture',
        note: '',
        scenario: {
          shortCircuitLevelKa: 5,
          minimumShortCircuitKa: 8,
          inverterPenetrationPct: 40,
          reserveMarginPercent: 10,
          topology: { nodes: [], edges: [] },
        },
      },
    ]);

    expect(result.advisoryLabel).toContain('ERROR');
    expect(result.nodeResults).toHaveLength(0);
  });

  it('aggregates SCR across multiple fixtures', () => {
    const result = computeFleetSCR([
      WEAK_GRID_FIXTURES.pincher_creek,
      WEAK_GRID_FIXTURES.fort_macleod,
    ]);

    expect(result.nodeResults.length).toBeGreaterThan(0);
    expect(result.minScr).toBeLessThanOrEqual(result.maxScr);
    expect(result.meanScr).toBeGreaterThanOrEqual(result.minScr);
    expect(result.method).toContain('fixture');
  });

  it('classifies overall assessment as weak when any weak node exists', () => {
    const result = computeFleetSCR([WEAK_GRID_FIXTURES.pincher_creek]);

    if (result.weakNodes.length > 0) {
      expect(result.overallAssessment).toBe('weak');
    }
  });

  it('includes advisory label with weak node count when weak', () => {
    const result = computeFleetSCR([WEAK_GRID_FIXTURES.pincher_creek]);

    if (result.overallAssessment === 'weak') {
      expect(result.advisoryLabel).toContain('weak node');
    }
  });
});
