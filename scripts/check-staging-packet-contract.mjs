import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const STAGING_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'staging');

export const REQUIRED_PACKET_FILES = Object.freeze([
  'FOUR_TABLE_DECISIONS.md',
  'FUNCTION_DEPLOYMENT_MANIFEST.md',
  'MIGRATION_REPLAY_COMPARISON.md',
  'OWNER_SIGNOFF_MATRIX.md',
  'STORAGE_RECEIPT_TEMPLATE.md',
  'SUPABASE_OWNER_RUNBOOK.md',
  'WITHHELD_ROWS_RECONCILIATION_PACKET.md',
]);

const SOURCE_ONLY_TABLES = Object.freeze([
  'der_assets_summary',
  'energy_events',
  'onet_related_occupations',
  'smr_vendors',
]);

const PILOT_FUNCTIONS = Object.freeze([
  'lead-capture',
  'whop-verify-access',
  'whop-webhook',
]);

/**
 * @typedef {Record<string, string>} StagingPacketTexts
 * @typedef {{ ok: boolean, mode: 'template'|'owner-data', checks: string[], errors: string[] }} StagingPacketResult
 */

function requireText(packets, file, label, predicate, errors, checks) {
  const text = packets[file];
  if (typeof text !== 'string') {
    errors.push(`${label}: missing ${file}`);
    return '';
  }
  if (!predicate(text)) errors.push(`${label}: contract mismatch in ${file}`);
  else checks.push(label);
  return text;
}

function validateFourTableDecisions(packets, errors, checks) {
  const text = packets['FOUR_TABLE_DECISIONS.md'];
  if (typeof text !== 'string') {
    errors.push('four-table decisions: missing packet');
    return;
  }
  const missing = SOURCE_ONLY_TABLES.filter((table) => !text.includes(`| \`${table}\` |`));
  if (missing.length > 0) errors.push(`four-table decisions: missing ${missing.join(', ')}`);
  else checks.push('four-table decisions');
}

function validateFunctionAllowlist(packets, errors, checks) {
  const text = packets['FUNCTION_DEPLOYMENT_MANIFEST.md'];
  if (typeof text !== 'string') {
    errors.push('function allowlist: missing packet');
    return;
  }
  const section = text.match(/2\.\s*`lead-capture`[\s\S]*?5\.\s*Set each intended cron/)?.[0] ?? '';
  const found = [...section.matchAll(/^\s*[2-4]\.\s*`([^`]+)`/gm)].map((match) => match[1]);
  if (found.length !== PILOT_FUNCTIONS.length || found.some((name, index) => name !== PILOT_FUNCTIONS[index])) {
    errors.push(`function allowlist: expected ${PILOT_FUNCTIONS.join(', ')}, found ${found.join(', ') || 'none'}`);
  } else if (
    !text.includes('0/110 functions deployed') ||
    !text.includes('CRON_LIVE_<FUNC>') ||
    !/no global cron switch/i.test(text)
  ) {
    errors.push('function allowlist: missing undeployed baseline or per-function cron safety gate');
  } else {
    checks.push('function allowlist');
  }
}

function validateWithheldRows(packets, errors, checks) {
  const text = packets['WITHHELD_ROWS_RECONCILIATION_PACKET.md'];
  if (typeof text !== 'string') {
    errors.push('89-row reconciliation boundary: missing packet');
    return 'template';
  }
  const totalsOkay =
    text.includes('41 null/invalid required fields') &&
    text.includes('48 missing FK parents') &&
    /89 rows/.test(text) &&
    text.includes('Hashed row refs') &&
    text.includes('no fabrication');
  if (!totalsOkay) errors.push('89-row reconciliation boundary: expected 41 + 48 = 89 and hashed references');
  const template = text.includes('| (table) |');
  if (!template) {
    const rowLines = text
      .split('\n')
      .filter((line) => /^\|\s*[^-|][^|]*\|\s*(null-invalid|fk-absent)\s*\|/i.test(line));
    if (rowLines.length !== 89) errors.push(`89-row reconciliation boundary: expected 89 row records, found ${rowLines.length}`);
  }
  if (totalsOkay && (template || !errors.some((error) => error.startsWith('89-row reconciliation boundary:')))) {
    checks.push('89-row reconciliation boundary');
  }
  return template ? 'template' : 'owner-data';
}

export function validateStagingPacketTexts(packets) {
  const errors = [];
  const checks = [];

  for (const file of REQUIRED_PACKET_FILES) {
    if (typeof packets[file] !== 'string') errors.push(`packet set: missing ${file}`);
  }

  validateFourTableDecisions(packets, errors, checks);
  const mode = validateWithheldRows(packets, errors, checks);
  validateFunctionAllowlist(packets, errors, checks);

  const replay = packets['MIGRATION_REPLAY_COMPARISON.md'];
  if (typeof replay !== 'string') {
    errors.push('migration replay counts: missing packet');
  } else if (
    !replay.includes('122 active') ||
    !replay.includes('123 records') ||
    !replay.includes('6 target-only') ||
    !replay.includes('ported to 5 repo files') ||
    !replay.includes('NOT ported')
  ) {
    errors.push('migration replay counts: expected 122/123/6-to-5 reconciliation and non-destructive deviations');
  } else {
    checks.push('migration replay counts');
  }

  const storage = packets['STORAGE_RECEIPT_TEMPLATE.md'];
  if (typeof storage !== 'string') {
    errors.push('storage receipt fields: missing packet');
  } else {
    const storageFields = [
      ['File 1 name/bytes/sha256', 'file 1'],
      ['File 2 name/bytes/sha256', 'file 2'],
      ['Readback hash (matches upload)', 'readback hash'],
      ['Bucket RLS/public setting', 'bucket policy'],
    ];
    const missing = storageFields.filter(([needle]) => !storage.includes(needle)).map(([, label]) => label);
    if (missing.length > 0) errors.push(`storage receipt fields: missing ${missing.join(', ')}`);
    else checks.push('storage receipt fields');
  }

  requireText(
    packets,
    'OWNER_SIGNOFF_MATRIX.md',
    'owner sign-off matrix',
    (text) =>
      Array.from({ length: 13 }, (_, index) => `| ${index + 1} |`).every((row) => text.includes(row)) &&
      text.includes('0/11'),
    errors,
    checks,
  );

  requireText(
    packets,
    'SUPABASE_OWNER_RUNBOOK.md',
    'owner runbook stop gates',
    (text) =>
      text.includes('Stop conditions') &&
      text.includes('CRON_LIVE_<FUNC>') &&
      /unset[\s\S]*until[\s\S]*synthetic smoke tests/i.test(text) &&
      /must not (unpause|apply|deploy|upload)/i.test(text) &&
      text.includes('rollback'),
    errors,
    checks,
  );

  return { ok: errors.length === 0, mode, checks, errors };
}

export function readStagingPacketTexts(root = STAGING_DIR) {
  return Object.fromEntries(
    REQUIRED_PACKET_FILES.map((file) => [file, readFileSync(resolve(root, file), 'utf8')]),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validateStagingPacketTexts(readStagingPacketTexts());
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}
