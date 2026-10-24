#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  OUTREACH_RESPONSE_LOG_COLUMNS,
  SUPPRESSION_REGISTRY_COLUMNS,
} from './lib/outreach-response-log-schema.mjs';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
const values = new Map();
let force = false;

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
const suppressionPath = path.join(outputDir, 'suppression-registry.csv');
const logDisplayPath = displayPath(logPath);
const outputDirDisplayPath = displayPath(outputDir);

writeFileSync(logPath, `${OUTREACH_RESPONSE_LOG_COLUMNS.join(',')}\n`, 'utf8');
// Never replace an existing suppression registry, even with --force. It is a
// safety record shared by every outreach log in this workspace.
if (!existsSync(suppressionPath)) {
  writeFileSync(suppressionPath, `${SUPPRESSION_REGISTRY_COLUMNS.join(',')}\n`, { flag: 'wx' });
}
writeFileSync(readmePath, [
  '# CEIP Outreach Response Log Starter',
  '',
  'This workspace is for anonymized outreach activity that may later create pilot-evidence actions. It is not buyer proof by itself, and a header-only log must keep confidence movement at zero.',
  '',
  '## Use',
  '',
  '1. Keep direct names, emails, phone numbers, account IDs, meter IDs, postal codes, service addresses, and raw sensitive notes outside this repo.',
  '2. Merge any suppressed-target rows into the canonical owner-managed registry `docs/growth/SUPPRESSION_REGISTRY_LIVE.csv` (or the file named by `--suppression-file` / `CEIP_SUPPRESSION_REGISTRY`). The per-workspace `suppression-registry.csv` scaffolded here is a staging aid only — the validator and appender fail closed without the canonical registry and never treat a campaign-local file as authoritative.',
  '3. Add rows only after a real completed activity or reply exists. This tooling does not send outreach or approve a campaign.',
  '4. Use `target_label` handles such as `utility_planner_001` instead of direct identifiers.',
  '5. Before recording a sent CEM, provide consent basis/source/date, verified sender-identification and unsubscribe controls, and documented CASL-owner approval.',
  '6. Keep `pilot_evidence_register_action=none` until a buyer asks for information, offers data, books a meeting, or records a commercial signal.',
  '7. Do not raise feature ratings or market confidence from this log alone.',
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
  'Before any outreach, obtain the designated CASL owner\'s approval for the message, channel, consent basis, sender identification, working unsubscribe mechanism, and shared suppression registry. After actionable replies exist, use the action plan to create intake packets, prepare retained redacted artifacts, update the pilot evidence register, and only then run the hard 95% retained-artifact gate.',
  '',
].join('\n'), 'utf8');

console.log('Outreach response log starter created.');
console.log(`Output directory: ${outputDirDisplayPath}`);
console.log(`Response log: ${logDisplayPath}`);
console.log(`Suppression registry: ${displayPath(suppressionPath)}`);
console.log(`Run: pnpm run validate:outreach-response-log -- ${logDisplayPath}`);
