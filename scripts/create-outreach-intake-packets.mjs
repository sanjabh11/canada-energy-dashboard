#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
const values = new Map();
let force = false;
let dryRun = false;

const requiredColumns = [
  'activity_date',
  'target_label',
  'route',
  'proof_pack_id',
  'reply_status',
  'reviewer_role',
  'pilot_evidence_register_action',
  'next_action',
];

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--force') {
    force = true;
    continue;
  }
  if (arg === '--dry-run') {
    dryRun = true;
    continue;
  }
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[index + 1] ?? '';
    index += 1;
    if (!['log-file', 'output-dir', 'target-label'].includes(key)) {
      failures.push(`Unknown option: ${arg}`);
    } else if (!value || value.startsWith('--')) {
      failures.push(`${arg} requires a value.`);
    } else if (values.has(key)) {
      failures.push(`Duplicate option: ${arg}`);
    } else {
      values.set(key, value);
    }
    continue;
  }
  failures.push(`Unexpected positional argument: ${arg}`);
}

function printUsage() {
  console.log(`Usage:
  pnpm run create:outreach-intake-packets -- --log-file path/to/outreach-response-log.csv --output-dir /tmp/ceip-outreach-intake-packets

Options:
  --log-file <csv>          Required. Valid outreach response log.
  --output-dir <dir>        Required. Destination for generated intake packet folders.
  --target-label <label>    Optional. Generate only matching anonymized target_label rows.
  --dry-run                 Validate and print planned packets without writing files.
  --force                   Overwrite generated files in a non-empty output directory.
`);
}

function displayPath(filePath) {
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join('/');
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) return relativePath;
  return filePath.split(path.sep).join('/');
}

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'outreach-row';
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => String(cell).trim().length > 0)) rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => String(cell).trim().length > 0)) rows.push(row);
  return rows;
}

function normalizeColumn(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const headers = rows[0].map(normalizeColumn);
  return rows.slice(1).map((row, index) => {
    const entry = { __rowNumber: index + 2 };
    for (let cellIndex = 0; cellIndex < headers.length; cellIndex += 1) {
      entry[headers[cellIndex]] = (row[cellIndex] ?? '').trim();
    }
    return entry;
  });
}

function runNode(scriptRelativePath, scriptArgs) {
  return execFileSync(process.execPath, [path.join(repoRoot, scriptRelativePath), ...scriptArgs], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function validateRequiredInput() {
  if (!values.has('log-file')) failures.push('Missing required option: --log-file');
  if (!values.has('output-dir')) failures.push('Missing required option: --output-dir');

  const logFile = values.has('log-file') ? path.resolve(repoRoot, values.get('log-file')) : null;
  if (logFile && !existsSync(logFile)) failures.push(`Outreach response log not found: ${displayPath(logFile)}`);

  if (failures.length > 0) {
    console.error('Outreach intake packet generation failed:\n');
    for (const failure of failures) console.error(`- ${failure}`);
    console.error('');
    printUsage();
    process.exit(1);
  }
}

validateRequiredInput();

const logFile = path.resolve(repoRoot, values.get('log-file'));
const outputDir = path.resolve(repoRoot, values.get('output-dir'));
const targetLabelFilter = values.get('target-label') ?? null;

try {
  runNode('scripts/validate-outreach-response-log.mjs', [logFile]);
} catch (error) {
  console.error('Outreach intake packet generation failed: outreach log did not pass validation.\n');
  const stderr = error?.stderr ? String(error.stderr).trim() : '';
  const stdout = error?.stdout ? String(error.stdout).trim() : '';
  if (stderr) console.error(stderr);
  if (stdout) console.error(stdout);
  process.exit(1);
}

const rows = parseCsv(readFileSync(logFile, 'utf8'));
const headers = new Set((rows[0] ?? []).map(normalizeColumn));
const missingColumns = requiredColumns.filter((column) => !headers.has(column));
if (missingColumns.length > 0) {
  console.error('Outreach intake packet generation failed:\n');
  console.error(`- Missing required column(s): ${missingColumns.join(', ')}`);
  process.exit(1);
}

const responseRows = rowsToObjects(rows);
const createPacketRows = responseRows.filter((row) => {
  if (row.pilot_evidence_register_action !== 'create_intake_packet') return false;
  if (targetLabelFilter && row.target_label !== targetLabelFilter) return false;
  return true;
});
const skippedRows = responseRows.filter((row) => !createPacketRows.includes(row));

if (existsSync(outputDir) && readdirSync(outputDir).length > 0 && !force && !dryRun) {
  console.error(`Output directory is not empty: ${displayPath(outputDir)}`);
  console.error('Use --force to overwrite generated intake packet files.');
  process.exit(1);
}

function packetDirFor(row) {
  return path.join(outputDir, `${row.activity_date}-${slugify(row.target_label)}-${slugify(row.route.replace(/^\//, ''))}`);
}

const plannedPackets = createPacketRows.map((row) => ({
  rowNumber: row.__rowNumber,
  targetLabel: row.target_label,
  route: row.route,
  proofPackId: row.proof_pack_id,
  replyStatus: row.reply_status,
  outputDir: packetDirFor(row),
}));

if (dryRun) {
  console.log('Outreach intake packet dry run complete.');
  console.log(`Log: ${displayPath(logFile)}`);
  console.log(`Planned intake packets: ${plannedPackets.length}`);
  for (const packet of plannedPackets) {
    console.log(`- Row ${packet.rowNumber}: ${packet.targetLabel} / ${packet.route} -> ${displayPath(packet.outputDir)}`);
  }
  console.log(`Skipped rows: ${skippedRows.length}`);
  console.log('Confidence movement: none; dry run only.');
  process.exit(0);
}

if (force && existsSync(outputDir)) rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const createdPackets = [];
for (const packet of plannedPackets) {
  const createArgs = [
    '--route',
    packet.route,
    '--output-dir',
    packet.outputDir,
    '--record-date',
    responseRows.find((row) => row.__rowNumber === packet.rowNumber).activity_date,
  ];
  if (force) createArgs.push('--force');
  runNode('scripts/create-pilot-evidence-intake-packet.mjs', createArgs);
  runNode('scripts/validate-pilot-evidence-register.mjs', [
    path.join(packet.outputDir, 'pilot-evidence-register-starter.csv'),
  ]);
  createdPackets.push(packet);
}

const manifestPath = path.join(outputDir, 'outreach-intake-packet-manifest.json');
const readmePath = path.join(outputDir, 'README.md');
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceLog: displayPath(logFile),
  confidenceMovement: 'none',
  createdPacketCount: createdPackets.length,
  skippedRowCount: skippedRows.length,
  packets: createdPackets.map((packet) => ({
    rowNumber: packet.rowNumber,
    targetLabel: packet.targetLabel,
    route: packet.route,
    proofPackId: packet.proofPackId,
    replyStatus: packet.replyStatus,
    outputDir: displayPath(packet.outputDir),
    starterRegister: displayPath(path.join(packet.outputDir, 'pilot-evidence-register-starter.csv')),
  })),
  skippedRows: skippedRows.map((row) => ({
    rowNumber: row.__rowNumber,
    targetLabel: row.target_label,
    route: row.route,
    action: row.pilot_evidence_register_action,
    reason: row.pilot_evidence_register_action === 'create_intake_packet'
      ? 'filtered by --target-label'
      : 'pilot_evidence_register_action is not create_intake_packet',
  })),
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
writeFileSync(readmePath, [
  '# CEIP Outreach Intake Packet Batch',
  '',
  `Source log: \`${displayPath(logFile)}\``,
  '',
  'This batch was generated from validated outreach response rows with `pilot_evidence_register_action=create_intake_packet`.',
  'It creates route-specific starter packet folders only. It does not create buyer proof, move confidence, or satisfy the 95% market-confidence gate.',
  '',
  '## Created Packets',
  '',
  createdPackets.length === 0
    ? '- None. No matching `create_intake_packet` outreach rows were found.'
    : createdPackets.map((packet) => `- Row ${packet.rowNumber}: \`${packet.targetLabel}\` / \`${packet.route}\` -> \`${displayPath(packet.outputDir)}\``).join('\n'),
  '',
  '## Next Commands',
  '',
  '```bash',
  `pnpm run report:buyer-evidence-readiness -- --root ${displayPath(outputDir)}`,
  `pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root path/to/redacted-artifacts`,
  '```',
  '',
  'Replace starter rows only after real redacted buyer artifacts, reviewer acceptance, feedback completion, timing, coverage, and commercial commitment evidence exist.',
  '',
].join('\n'), 'utf8');

console.log('Outreach intake packet generation complete.');
console.log(`Log: ${displayPath(logFile)}`);
console.log(`Output directory: ${displayPath(outputDir)}`);
console.log(`Created intake packets: ${createdPackets.length}`);
for (const packet of createdPackets) {
  console.log(`- Row ${packet.rowNumber}: ${packet.targetLabel} / ${packet.route} -> ${displayPath(packet.outputDir)}`);
}
console.log(`Skipped rows: ${skippedRows.length}`);
console.log(`Manifest: ${displayPath(manifestPath)}`);
console.log('Confidence movement: none; generated intake packets are starter scaffolding only.');
