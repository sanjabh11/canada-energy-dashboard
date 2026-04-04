import { describe, expect, it } from 'vitest';
import { getDemoDataForQuery } from '../../supabase/functions/nl2sql/demo_data';

describe('nl2sql helpers', () => {
  it('returns seeded demo data for known query shapes', () => {
    const rows = getDemoDataForQuery(
      "SELECT timestamp, demand_mw FROM grid_snapshots WHERE province = 'AB' ORDER BY timestamp DESC",
      5,
    ) as Array<{ province?: string; demand_mw?: number }>;

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].province).toBe('AB');
    expect(typeof rows[0].demand_mw).toBe('number');
  });

  it('returns no demo data for unsupported tables', () => {
    const rows = getDemoDataForQuery('SELECT * FROM totally_unknown_table', 5);
    expect(rows).toEqual([]);
  });
});
