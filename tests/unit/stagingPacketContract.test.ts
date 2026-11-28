import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  validateStagingPacketTexts,
  type StagingPacketTexts,
} from '../../scripts/check-staging-packet-contract.mjs';

const ROOT = resolve(process.cwd());
const PACKET_FILES = [
  'FOUR_TABLE_DECISIONS.md',
  'FUNCTION_DEPLOYMENT_MANIFEST.md',
  'MIGRATION_REPLAY_COMPARISON.md',
  'OWNER_SIGNOFF_MATRIX.md',
  'STORAGE_RECEIPT_TEMPLATE.md',
  'SUPABASE_OWNER_RUNBOOK.md',
  'WITHHELD_ROWS_RECONCILIATION_PACKET.md',
] as const;

function currentPackets(): StagingPacketTexts {
  return Object.fromEntries(
    PACKET_FILES.map((file) => [
      file,
      readFileSync(resolve(ROOT, 'docs/staging', file), 'utf8'),
    ]),
  ) as StagingPacketTexts;
}

describe('staging packet contract', () => {
  it('accepts the current owner-run packet set', () => {
    const result = validateStagingPacketTexts(currentPackets());

    expect(result.errors).toEqual([]);
    expect(result.mode).toBe('template');
    expect(result.checks).toEqual(
      expect.arrayContaining([
        'four-table decisions',
        '89-row reconciliation boundary',
        'function allowlist',
        'storage receipt fields',
        'migration replay counts',
        'owner sign-off matrix',
        'owner runbook stop gates',
      ]),
    );
  });

  it('rejects a packet that loses one source-only table', () => {
    const packets = currentPackets();
    packets['FOUR_TABLE_DECISIONS.md'] = packets['FOUR_TABLE_DECISIONS.md'].replace(
      /\| `smr_vendors` \|[\s\S]*?\n/,
      '',
    );

    const result = validateStagingPacketTexts(packets);

    expect(result.errors.join('\n')).toMatch(/smr_vendors/);
  });

  it('rejects a changed 89-row class total', () => {
    const packets = currentPackets();
    packets['WITHHELD_ROWS_RECONCILIATION_PACKET.md'] = packets[
      'WITHHELD_ROWS_RECONCILIATION_PACKET.md'
    ].replace('41 null/invalid required fields, 48 missing FK parents', '40 null/invalid required fields, 48 missing FK parents');

    const result = validateStagingPacketTexts(packets);

    expect(result.errors.join('\n')).toMatch(/41.*48|89-row/);
  });

  it('rejects a broadened function deployment list', () => {
    const packets = currentPackets();
    packets['FUNCTION_DEPLOYMENT_MANIFEST.md'] = packets[
      'FUNCTION_DEPLOYMENT_MANIFEST.md'
    ].replace('4. `whop-webhook`', '4. `unreviewed-function`\n4. `whop-webhook`');

    const result = validateStagingPacketTexts(packets);

    expect(result.errors.join('\n')).toMatch(/unreviewed-function|allowlist/);
  });

  it('rejects a storage packet that omits readback evidence', () => {
    const packets = currentPackets();
    packets['STORAGE_RECEIPT_TEMPLATE.md'] = packets[
      'STORAGE_RECEIPT_TEMPLATE.md'
    ].replace('| Readback hash (matches upload) | |', '');

    const result = validateStagingPacketTexts(packets);

    expect(result.errors.join('\n')).toMatch(/readback/i);
  });
});
