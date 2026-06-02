#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isInsideDirectory, validateExistingEvidencePathInsideRoot } from './lib/evidence-path-safety.mjs';
import { proofPackIdsByRoute } from './lib/proof-pack-routes.mjs';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const values = new Map();
const failures = [];
let force = false;
let inPlace = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--force') {
    force = true;
    continue;
  }
  if (arg === '--in-place') {
    inPlace = true;
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
  pnpm run update:pilot-evidence-register-row -- \\
    --register-file path/to/pilot-evidence-register.csv \\
    --evidence-root path/to/redacted-artifacts \\
    --evidence-file-reference retained-artifact.md#sha256=<64-hex> \\
    --confidence-delta 0.3 \\
    --output-file path/to/filled-pilot-evidence-register.csv

Options:
  --register-file <csv>              Required. Starter or filled pilot evidence register.
  --evidence-root <dir>              Required. Directory containing retained redacted artifacts.
  --evidence-file-reference <ref>    Required. Relative retained artifact reference with sha256.
  --confidence-delta <0..0.4>        Required. Explicit confidence movement; use 0 for staging.
  --output-file <csv>                Required unless --in-place is used.
  --artifact-root <dir>              Optional. Route-local artifact root inside --evidence-root.
  --row-index <n>                    Optional. 1-based data row to update when multiple rows match.
  --follow-up-action <text>          Optional. Defaults to rerunning retained evidence gates.
  --notes <text>                     Optional. Defaults to artifact-updated boundary note.
  --in-place                         Overwrite --register-file after validation.
  --force                            Allow replacing an existing --output-file.
`);
}

for (const option of ['register-file', 'evidence-root', 'evidence-file-reference', 'confidence-delta']) {
  if (!values.has(option)) failures.push(`Missing required option: --${option}`);
}
if (!inPlace && !values.has('output-file')) failures.push('Missing required option: --output-file unless --in-place is used.');
if (inPlace && values.has('output-file')) failures.push('Use either --in-place or --output-file, not both.');

const registerPath = values.has('register-file') ? path.resolve(repoRoot, values.get('register-file')) : null;
const evidenceRoot = values.has('evidence-root') ? path.resolve(repoRoot, values.get('evidence-root')) : null;
const artifactRoot = values.has('artifact-root') ? path.resolve(repoRoot, values.get('artifact-root')) : evidenceRoot;
const outputPath = inPlace
  ? registerPath
  : (values.has('output-file') ? path.resolve(repoRoot, values.get('output-file')) : null);

function displayPath(filePath) {
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join('/');
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) return relativePath;
  return filePath.split(path.sep).join('/');
}

function normalizeColumn(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
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

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function rowsToCsv(rows) {
  return `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`;
}

function parseEvidenceReference(reference) {
  const match = String(reference ?? '').match(/^(.+)#sha256[:=]([a-f0-9]{64})$/i);
  if (!match) return null;
  return {
    artifactFile: match[1],
    sha256: match[2].toLowerCase(),
  };
}

function parseArtifactMetadata(text) {
  const metadata = {};
  const diagnostics = [];
  let inDiagnostics = false;

  for (const line of text.split(/\r?\n/)) {
    if (/^##\s+Diagnostic Summary\s*$/i.test(line.trim())) {
      inDiagnostics = true;
      continue;
    }
    if (inDiagnostics && /^##\s+/.test(line.trim())) {
      inDiagnostics = false;
    }
    if (inDiagnostics) {
      const bullet = line.match(/^\s*-\s+(.+?)\s*$/);
      if (bullet) diagnostics.push(bullet[1]);
      continue;
    }

    const pair = line.match(/^([A-Za-z0-9_ -]+):\s*(.*?)\s*$/);
    if (pair) metadata[normalizeColumn(pair[1])] = pair[2];
  }

  metadata.benchmark_lift_or_diagnostic = diagnostics.join('; ');
  return metadata;
}

function parseOptionalPositiveInteger(name) {
  if (!values.has(name)) return null;
  const value = Number(values.get(name));
  if (!Number.isInteger(value) || value < 1) {
    failures.push(`--${name} must be a positive integer.`);
    return null;
  }
  return value;
}

const rowIndex = parseOptionalPositiveInteger('row-index');
const confidenceDelta = Number(values.get('confidence-delta') ?? NaN);
if (!Number.isFinite(confidenceDelta) || confidenceDelta < 0 || confidenceDelta > 0.4) {
  failures.push('--confidence-delta must be numeric and between 0 and 0.4.');
}

if (registerPath && !existsSync(registerPath)) failures.push(`Register file not found: ${displayPath(registerPath)}`);
if (registerPath && existsSync(registerPath) && !statSync(registerPath).isFile()) failures.push(`Register path must be a file: ${displayPath(registerPath)}`);
if (evidenceRoot && !existsSync(evidenceRoot)) failures.push(`Evidence root not found: ${displayPath(evidenceRoot)}`);
if (evidenceRoot && existsSync(evidenceRoot) && !statSync(evidenceRoot).isDirectory()) failures.push(`Evidence root must be a directory: ${displayPath(evidenceRoot)}`);
if (artifactRoot && !existsSync(artifactRoot)) failures.push(`Artifact root not found: ${displayPath(artifactRoot)}`);
if (artifactRoot && existsSync(artifactRoot) && !statSync(artifactRoot).isDirectory()) failures.push(`Artifact root must be a directory: ${displayPath(artifactRoot)}`);
if (evidenceRoot && artifactRoot && existsSync(evidenceRoot) && existsSync(artifactRoot)) {
  if (!isInsideDirectory(artifactRoot, evidenceRoot)) {
    failures.push('--artifact-root must stay inside --evidence-root.');
  } else {
    const realEvidenceRoot = realpathSync(evidenceRoot);
    const realArtifactRoot = realpathSync(artifactRoot);
    if (!isInsideDirectory(realArtifactRoot, realEvidenceRoot)) {
      failures.push('--artifact-root resolves outside --evidence-root; symlink escapes are not allowed.');
    }
  }
}
if (outputPath && existsSync(outputPath) && outputPath !== registerPath && !force) {
  failures.push(`Output file already exists: ${displayPath(outputPath)} (rerun with --force to replace).`);
}
if (registerPath && /(?:^|\/)(?:templates|fixtures)(?:\/|$)/.test(displayPath(registerPath))) {
  failures.push('Refusing to update template or fixture register paths.');
}

const evidenceReference = values.get('evidence-file-reference') ?? '';
const parsedReference = parseEvidenceReference(evidenceReference);
if (!parsedReference) {
  failures.push('--evidence-file-reference must look like retained-artifact.md#sha256=<64-hex> or retained-artifact.md#sha256:<64-hex>.');
}
if (parsedReference?.artifactFile.startsWith('/') || path.isAbsolute(parsedReference?.artifactFile ?? '')) {
  failures.push('--evidence-file-reference must use a relative artifact path inside --evidence-root.');
}

let artifactPath = null;
let artifactText = '';
let artifactMetadata = {};
let registerEvidenceReference = evidenceReference;
if (artifactRoot && evidenceRoot && parsedReference) {
  artifactPath = path.resolve(artifactRoot, parsedReference.artifactFile);
  if (!existsSync(artifactPath)) {
    failures.push(`Retained artifact not found: ${displayPath(artifactPath)}`);
  } else if (!statSync(artifactPath).isFile()) {
    failures.push(`Retained artifact path must be a file: ${displayPath(artifactPath)}`);
  } else {
    const artifactRootSafetyFailure = validateExistingEvidencePathInsideRoot({ evidenceRoot: artifactRoot, evidencePath: artifactPath });
    if (artifactRootSafetyFailure) failures.push(artifactRootSafetyFailure.replace('evidence_file_reference', '--evidence-file-reference'));
    const safetyFailure = validateExistingEvidencePathInsideRoot({ evidenceRoot, evidencePath: artifactPath });
    if (safetyFailure) failures.push(safetyFailure);
    artifactText = readFileSync(artifactPath, 'utf8');
    const actualHash = createHash('sha256').update(artifactText).digest('hex');
    if (actualHash !== parsedReference.sha256) {
      failures.push(`Retained artifact SHA-256 mismatch for ${displayPath(artifactPath)}.`);
    }
    artifactMetadata = parseArtifactMetadata(artifactText);
    const registerArtifactReference = path.relative(evidenceRoot, artifactPath).split(path.sep).join('/');
    registerEvidenceReference = `${registerArtifactReference}#sha256=${parsedReference.sha256}`;
  }
}

const requiredArtifactFields = [
  'record_date',
  'route',
  'proof_pack_id',
  'source_label',
  'pii_screen_result',
  'buyer_data_coverage_pct',
  'time_to_artifact_hours',
  'reviewer_role',
  'reviewer_acceptance',
  'reviewer_feedback_status',
  'day_14_decision',
  'commercial_commitment_status',
  'claim_boundary',
  'do_not_claim',
  'benchmark_lift_or_diagnostic',
];
for (const field of requiredArtifactFields) {
  if (!String(artifactMetadata[field] ?? '').trim()) failures.push(`Retained artifact is missing required metadata: ${field}`);
}

const route = artifactMetadata.route;
const proofPackId = artifactMetadata.proof_pack_id;
if (route && proofPackId) {
  const validProofPacks = proofPackIdsByRoute.get(route);
  if (!validProofPacks?.has(proofPackId)) {
    failures.push(`Retained artifact proof_pack_id ${proofPackId} is not valid for route ${route}.`);
  }
}

let rows = [];
let header = [];
let normalizedHeader = [];
if (registerPath && existsSync(registerPath)) {
  rows = parseCsv(readFileSync(registerPath, 'utf8'));
  if (rows.length < 2) failures.push('Register must contain a header and at least one data row.');
  header = rows[0] ?? [];
  normalizedHeader = header.map(normalizeColumn);
}

const requiredRegisterColumns = [
  'record_date',
  'proof_pack_id',
  'route',
  'source_label',
  'evidence_file_reference',
  'pii_screen_result',
  'commercial_commitment_status',
  'time_to_artifact_hours',
  'buyer_data_coverage_pct',
  'benchmark_lift_or_diagnostic',
  'reviewer_role',
  'reviewer_feedback_status',
  'reviewer_acceptance',
  'claim_boundary',
  'do_not_claim',
  'day_14_decision',
  'confidence_delta',
  'follow_up_action',
  'notes',
];
for (const column of requiredRegisterColumns) {
  if (!normalizedHeader.includes(column)) failures.push(`Register is missing required column: ${column}`);
}

if (failures.length > 0) {
  console.error('Pilot evidence register update failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

const columnIndex = new Map(normalizedHeader.map((column, index) => [column, index]));
function getCell(row, column) {
  return row[columnIndex.get(column)] ?? '';
}
function setCell(row, column, value) {
  row[columnIndex.get(column)] = String(value ?? '');
}

let targetDataIndex = null;
if (rowIndex !== null) {
  if (rowIndex > rows.length - 1) {
    console.error('Pilot evidence register update failed:\n');
    console.error(`- --row-index ${rowIndex} is outside the register data row range.`);
    process.exit(1);
  }
  const candidate = rows[rowIndex];
  if (getCell(candidate, 'route') !== route || getCell(candidate, 'proof_pack_id') !== proofPackId) {
    console.error('Pilot evidence register update failed:\n');
    console.error(`- --row-index ${rowIndex} does not match retained artifact route/proof_pack_id (${route}, ${proofPackId}).`);
    process.exit(1);
  }
  targetDataIndex = rowIndex;
} else {
  const matches = rows
    .slice(1)
    .map((row, index) => ({ row, dataIndex: index + 1 }))
    .filter(({ row }) => getCell(row, 'route') === route && getCell(row, 'proof_pack_id') === proofPackId);
  if (matches.length !== 1) {
    console.error('Pilot evidence register update failed:\n');
    console.error(`- Expected exactly one register row for route=${route} and proof_pack_id=${proofPackId}; found ${matches.length}. Use --row-index to disambiguate.`);
    process.exit(1);
  }
  targetDataIndex = matches[0].dataIndex;
}

const updatedRows = rows.map((row) => [...row]);
const targetRow = updatedRows[targetDataIndex];
for (const [column, artifactField] of [
  ['record_date', 'record_date'],
  ['source_label', 'source_label'],
  ['evidence_file_reference', null],
  ['pii_screen_result', 'pii_screen_result'],
  ['commercial_commitment_status', 'commercial_commitment_status'],
  ['time_to_artifact_hours', 'time_to_artifact_hours'],
  ['buyer_data_coverage_pct', 'buyer_data_coverage_pct'],
  ['benchmark_lift_or_diagnostic', 'benchmark_lift_or_diagnostic'],
  ['reviewer_role', 'reviewer_role'],
  ['reviewer_feedback_status', 'reviewer_feedback_status'],
  ['reviewer_acceptance', 'reviewer_acceptance'],
  ['claim_boundary', 'claim_boundary'],
  ['do_not_claim', 'do_not_claim'],
  ['day_14_decision', 'day_14_decision'],
]) {
  setCell(targetRow, column, artifactField ? artifactMetadata[artifactField] : registerEvidenceReference);
}
setCell(targetRow, 'confidence_delta', String(confidenceDelta));
setCell(
  targetRow,
  'follow_up_action',
  values.get('follow-up-action') ?? 'Run retained-evidence report and hard 95% gate after all minimum lanes are updated.',
);
setCell(
  targetRow,
  'notes',
  values.get('notes') ?? 'Updated from retained redacted artifact; sensitive originals remain outside this repository.',
);

const nextCsv = rowsToCsv(updatedRows);
const tempRoot = mkdtempSync(path.join(tmpdir(), 'ceip-register-update-'));
const tempRegisterPath = path.join(tempRoot, 'candidate-register.csv');
writeFileSync(tempRegisterPath, nextCsv, 'utf8');
const validation = spawnSync(process.execPath, [
  path.join(repoRoot, 'scripts/validate-pilot-evidence-register.mjs'),
  tempRegisterPath,
  '--evidence-root',
  evidenceRoot,
], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});

if (validation.status !== 0) {
  const output = `${validation.stderr ?? ''}\n${validation.stdout ?? ''}`.trim();
  rmSync(tempRoot, { recursive: true, force: true });
  console.error('Pilot evidence register update failed:\n');
  console.error('- Updated register candidate did not pass canonical validation.');
  if (output) console.error(output);
  process.exit(validation.status ?? 1);
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, nextCsv, 'utf8');
rmSync(tempRoot, { recursive: true, force: true });

console.log('Pilot evidence register row updated.');
console.log(`Register: ${displayPath(registerPath)}`);
console.log(`Output: ${displayPath(outputPath)}`);
console.log(`Updated row index: ${targetDataIndex}`);
console.log(`route: ${route}`);
console.log(`proof_pack_id: ${proofPackId}`);
console.log(`confidence_delta: ${confidenceDelta}`);
console.log(`evidence_file_reference: ${registerEvidenceReference}`);
console.log('');
console.log('Next validation commands:');
console.log(`pnpm run report:pilot-evidence-95 -- ${displayPath(outputPath)} --evidence-root ${displayPath(evidenceRoot)}`);
console.log(`pnpm run validate:pilot-evidence -- ${displayPath(outputPath)} --require-95 --evidence-root ${displayPath(evidenceRoot)}`);
