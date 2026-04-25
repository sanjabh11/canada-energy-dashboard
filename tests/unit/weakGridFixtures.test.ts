import { describe, expect, it } from 'vitest';
import { DEFAULT_WEAK_GRID_FIXTURE_KEY, getWeakGridFixture, WEAK_GRID_FIXTURES } from '../../src/lib/weakGridFixtures';

describe('weak grid fixtures', () => {
  it('returns the default fixture when the requested key is unknown', () => {
    const fallback = getWeakGridFixture('missing-fixture');

    expect(fallback.key).toBe(DEFAULT_WEAK_GRID_FIXTURE_KEY);
    expect(fallback.sourceMode).toBe('fixture');
  });

  it('keeps named Alberta weak-grid examples available for the dashboard', () => {
    const pincher = getWeakGridFixture('pincher_creek');
    const fortMacleod = WEAK_GRID_FIXTURES.fort_macleod;

    expect(pincher.province).toBe('AB');
    expect(pincher.scenario.topology.nodes.map((node) => node.id)).toContain('pincher-1');
    expect(fortMacleod.scenario.topology.nodes.map((node) => node.id)).toContain('fortmac-1');
    expect(fortMacleod.note).toContain('advisory');
  });
});
