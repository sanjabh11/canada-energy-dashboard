import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const ledger = readFileSync(
  resolve(process.cwd(), 'docs/remediation/MIGRATION_DEVIATION_LEDGER.md'),
  'utf8',
);

describe('migration and data deviation ledger contract', () => {
  it('keeps repository and target migration counts explicit', () => {
    expect(ledger).toContain('122 active `.sql` files plus one `.disabled` file = 123 directory entries');
    expect(ledger).toContain('123 target records reported during the owner-led replay');
    expect(ledger).toContain('117 repository migration names replayed plus six target-only entries');
    expect(ledger).toContain('Five files cover six target entries because the two extension entries are intentionally merged');
    expect(ledger).toContain('exact CI receipt pending');
  });

  it('keeps every unresolved data boundary visible and non-fabricated', () => {
    expect(ledger).toContain('| Null or invalid required fields | 41 |');
    expect(ledger).toContain('| Missing foreign-key parent | 48 |');
    expect(ledger).toContain('| **Total** | **89** | No fabricated values and no silent drop |');
    expect(ledger).toContain('`NOT_REPLAYED`');
    expect(ledger).toContain('`PENDING_OWNER_DATA_PACKET`');
    expect(ledger).toContain('`PENDING_DATA_STEWARD`');

    for (const table of [
      'der_assets_summary',
      'energy_events',
      'onet_related_occupations',
      'smr_vendors',
    ]) {
      expect(ledger).toContain(`| \`${table}\` |`);
    }

    expect(ledger).toMatch(/zero-byte\s+placeholders/);
    expect(ledger).toMatch(/must never be presented as recovery\s+evidence/);
  });
});
