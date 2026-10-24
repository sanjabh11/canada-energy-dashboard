import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const inventoryPath = resolve(
  process.cwd(),
  'docs/remediation/SUPABASE_SECURITY_OBJECT_INVENTORY_2026-10-24.md',
);
const inventory = readFileSync(inventoryPath, 'utf8');

function tableRowsBetween(startMarker: string, endMarker: string) {
  const start = inventory.indexOf(startMarker);
  const end = inventory.indexOf(endMarker, start + startMarker.length);
  expect(start, `missing inventory section: ${startMarker}`).toBeGreaterThanOrEqual(0);
  expect(end, `missing inventory section boundary: ${endMarker}`).toBeGreaterThan(start);

  return inventory
    .slice(start, end)
    .split('\n')
    .filter((line) => line.startsWith('| `'));
}

describe('Supabase security inventory evidence contract', () => {
  it('keeps all application views at the owner-staging proof layer', () => {
    const rows = tableRowsBetween('## Application-owned ordinary views', 'The two extension-managed');

    expect(rows).toHaveLength(26);
    expect(rows.every((row) => row.endsWith('`owner-staging-fix` |'))).toBe(true);
    expect(inventory).not.toContain('PENDING_OWNER_CLASSIFICATION');
  });

  it('separates extension views and materialized views from application view counts', () => {
    const extensionRows = tableRowsBetween(
      'The two extension-managed public views are recorded separately:',
      '## Materialized views exposed',
    );
    const materializedRows = tableRowsBetween('## Materialized views exposed', '## Required owner staging packet');

    expect(extensionRows).toHaveLength(2);
    expect(extensionRows.every((row) => row.endsWith('`not-applicable-with-evidence` |'))).toBe(true);
    expect(materializedRows).toHaveLength(5);
    expect(materializedRows.every((row) => row.endsWith('`owner-staging-fix` |'))).toBe(true);
  });
});
