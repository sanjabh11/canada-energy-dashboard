#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
const values = new Map();
let force = false;

const outreachResponseLogColumns = [
  'activity_date',
  'channel',
  'target_label',
  'buyer_lane',
  'proof_pack_id',
  'route',
  'rating',
  'variant_id',
  'caveat_used',
  'artifact_promised',
  'reply_status',
  'response_summary',
  'pain_signal',
  'requested_input',
  'reviewer_role',
  'commercial_commitment_status',
  'next_action',
  'pilot_evidence_register_action',
  'notes',
];

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--force') {
    force = true;
    continue;
  }
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[index + 1] ?? '';
    index += 1;
    if (!value || value.startsWith('--')) {
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
  pnpm run create:outreach-response-log -- --output-dir /tmp/ceip-outreach-response-log

Options:
  --output-dir <dir>     Required. Destination for the outreach log workspace.
  --file-name <name>     Optional. Defaults to outreach-response-log.csv.
  --force                Overwrite generated files in a non-empty output directory.
`);
}

function displayPath(filePath) {
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join('/');
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) return relativePath;
  return filePath.split(path.sep).join('/');
}

function validateFileName(fileName) {
  if (!fileName) return '--file-name cannot be blank.';
  if (fileName.includes('/') || fileName.includes('\\') || path.basename(fileName) !== fileName) {
    return '--file-name must be a plain file name, not a path.';
  }
  if (!fileName.toLowerCase().endsWith('.csv')) return '--file-name must end with .csv.';
  return null;
}

if (!values.has('output-dir')) failures.push('Missing required option: --output-dir');

const fileName = values.get('file-name') ?? 'outreach-response-log.csv';
const fileNameFailure = validateFileName(fileName);
if (fileNameFailure) failures.push(fileNameFailure);

if (failures.length > 0) {
  console.error('Outreach response log generation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

const outputDir = path.resolve(repoRoot, values.get('output-dir'));
if (existsSync(outputDir) && readdirSync(outputDir).length > 0 && !force) {
  console.error(`Output directory is not empty: ${displayPath(outputDir)}`);
  console.error('Use --force to overwrite generated outreach-log files.');
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const logPath = path.join(outputDir, fileName);
const readmePath = path.join(outputDir, 'README.md');
const logDisplayPath = displayPath(logPath);
const outputDirDisplayPath = displayPath(outputDir);

writeFileSync(logPath, `${outreachResponseLogColumns.join(',')}\n`, 'utf8');
writeFileSync(readmePath, [
  '# CEIP Outreach Response Log Starter',
  '',
  'This workspace is for anonymized outreach activity that may later create pilot-evidence actions. It is not buyer proof by itself, and a header-only log must keep confidence movement at zero.',
  '',
  '## Use',
  '',
  '1. Keep direct names, emails, phone numbers, account IDs, meter IDs, postal codes, service addresses, and raw sensitive notes outside this repo.',
  '2. Add rows only after a real completed outreach activity or reply exists.',
  '3. Use `target_label` handles such as `utility_planner_001` instead of direct identifiers.',
  '4. Keep `pilot_evidence_register_action=none` until the buyer asks for information, offers data, books a meeting, or records a commercial signal.',
  '5. Do not raise feature ratings or market confidence from this log alone.',
  '',
  '## Commands',
  '',
  '```bash',
  `pnpm run validate:outreach-response-log -- ${logDisplayPath}`,
  `pnpm run report:outreach-response-log -- ${logDisplayPath}`,
  `pnpm run plan:outreach-intake -- ${logDisplayPath}`,
  `pnpm run report:buyer-evidence-readiness -- --root ${outputDirDisplayPath}`,
  '```',
  '',
  'After actionable rows exist, use the action plan to create intake packets, prepare retained redacted artifacts, update the pilot evidence register, and only then run the hard 95% retained-artifact gate.',
  '',
].join('\n'), 'utf8');

console.log('Outreach response log starter created.');
console.log(`Output directory: ${outputDirDisplayPath}`);
console.log(`Response log: ${logDisplayPath}`);
console.log(`Run: pnpm run validate:outreach-response-log -- ${logDisplayPath}`);
