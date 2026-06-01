#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
const roots = [];
let evidenceRoot = null;
let failWhenEmpty = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--root') {
    const value = args[index + 1] ?? '';
    index += 1;
    if (!value || value.startsWith('--')) failures.push('--root requires a directory path.');
    else roots.push(path.resolve(repoRoot, value));
    continue;
  }
  if (arg.startsWith('--root=')) {
    const value = arg.slice('--root='.length);
    if (!value) failures.push('--root requires a directory path.');
    else roots.push(path.resolve(repoRoot, value));
    continue;
  }
  if (arg === '--evidence-root') {
    const value = args[index + 1] ?? '';
    index += 1;
    if (!value || value.startsWith('--')) failures.push('--evidence-root requires a directory path.');
    else evidenceRoot = path.resolve(repoRoot, value);
    continue;
  }
  if (arg.startsWith('--evidence-root=')) {
    const value = arg.slice('--evidence-root='.length);
    if (!value) failures.push('--evidence-root requires a directory path.');
    else evidenceRoot = path.resolve(repoRoot, value);
    continue;
  }
  if (arg === '--fail-when-empty') {
    failWhenEmpty = true;
    continue;
  }
  failures.push(`Unknown option: ${arg}`);
}

if (roots.length === 0) {
  roots.push(path.join(repoRoot, 'docs/growth'));
}

const pilotRegisterColumns = [
  'record_date',
  'buyer_lane',
  'proof_pack_id',
  'route',
  'evidence_file_reference',
  'commercial_commitment_status',
  'reviewer_acceptance',
  'confidence_delta',
];

const outreachLogColumns = [
  'activity_date',
  'channel',
  'target_label',
  'buyer_lane',
  'proof_pack_id',
  'route',
  'reply_status',
  'pilot_evidence_register_action',
];

const ignoredPathSegments = new Set([
  '.git',
  'node_modules',
  'dist',
  'playwright-report',
  'test-results',
  'coverage',
  'templates',
  'fixtures',
]);

const ignoredPathPatterns = [
  /(?:^|\/)tests?\//,
  /(?:^|\/)__snapshots__(?:\/|$)/,
  /(?:^|\/)archive(?:\/|$)/,
  /(?:^|\/)docs\/archive(?:\/|$)/,
];

function displayPath(filePath) {
  const relative = path.relative(repoRoot, filePath).split(path.sep).join('/');
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) return relative;
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

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const header = rows[0].map(normalizeColumn);
  return rows.slice(1).map((row) => {
    const entry = {};
    for (let index = 0; index < header.length; index += 1) {
      entry[header[index]] = row[index] ?? '';
    }
    return entry;
  });
}

function hasColumns(columns, requiredColumns) {
  return requiredColumns.every((column) => columns.has(column));
}

function shouldIgnore(filePath) {
  const normalized = displayPath(filePath);
  if (ignoredPathPatterns.some((pattern) => pattern.test(normalized))) return true;
  return normalized.split('/').some((segment) => ignoredPathSegments.has(segment));
}

function validateDirectoryInput(label, dirPath) {
  if (!existsSync(dirPath)) {
    failures.push(`${label} directory not found: ${displayPath(dirPath)}`);
    return;
  }
  if (!statSync(dirPath).isDirectory()) {
    failures.push(`${label} must be a directory: ${displayPath(dirPath)}`);
  }
}

function scanCsvFiles(root) {
  const files = [];
  let ignored = 0;

  function walk(currentPath) {
    if (!existsSync(currentPath)) return;
    const stats = statSync(currentPath);
    if (stats.isDirectory()) {
      if (shouldIgnore(currentPath)) {
        ignored += 1;
        return;
      }
      for (const entry of readdirSync(currentPath)) walk(path.join(currentPath, entry));
      return;
    }
    if (!stats.isFile() || !currentPath.toLowerCase().endsWith('.csv')) return;
    if (shouldIgnore(currentPath)) {
      ignored += 1;
      return;
    }
    files.push(currentPath);
  }

  walk(root);
  return { files, ignored };
}

function runNodeScript(scriptPath, scriptArgs) {
  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function firstOutputLines(output, limit = 8) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function indentedOutputLines(output, limit = 28) {
  return firstOutputLines(output, limit).map((line) => `    ${line}`);
}

function summarizePilotRegister(filePath, rows) {
  const rowObjects = rowsToObjects(rows);
  const confidenceRows = rowObjects.filter((row) => Number(row.confidence_delta) > 0);
  const acceptedRows = rowObjects.filter((row) => /^(accepted|approved|signed)$/i.test(String(row.reviewer_acceptance ?? '').trim()));
  const hashedRows = rowObjects.filter((row) => /\bsha256[:=][a-f0-9]{64}\b/i.test(row.evidence_file_reference ?? ''));
  const strongCommercialRows = rowObjects.filter((row) => /^(design_partner_signed|paid_pilot|purchase_order|letter_of_intent)$/i.test(String(row.commercial_commitment_status ?? '').trim()));
  const validation = runNodeScript(path.join(repoRoot, 'scripts/validate-pilot-evidence-register.mjs'), [filePath]);
  const gateArgs = [filePath, '--require-95', '--report-95'];
  if (evidenceRoot) gateArgs.push('--evidence-root', evidenceRoot);
  const gate95 = evidenceRoot ? runNodeScript(path.join(repoRoot, 'scripts/validate-pilot-evidence-register.mjs'), gateArgs) : null;

  return {
    path: filePath,
    rows: rowObjects.length,
    confidenceRows: confidenceRows.length,
    acceptedRows: acceptedRows.length,
    hashedRows: hashedRows.length,
    strongCommercialRows: strongCommercialRows.length,
    validation,
    gate95,
  };
}

function summarizeOutreachLog(filePath, rows) {
  const rowObjects = rowsToObjects(rows);
  const actionableRows = rowObjects.filter((row) => String(row.pilot_evidence_register_action ?? '').trim() !== 'none');
  const validation = runNodeScript(path.join(repoRoot, 'scripts/validate-outreach-response-log.mjs'), [filePath, '--report']);
  const actionPlan = runNodeScript(path.join(repoRoot, 'scripts/validate-outreach-response-log.mjs'), [filePath, '--action-plan']);

  return {
    path: filePath,
    rows: rowObjects.length,
    actionableRows: actionableRows.length,
    validation,
    actionPlan,
  };
}

if (failures.length > 0) {
  console.error('Buyer evidence readiness report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

for (const root of roots) validateDirectoryInput('Root', root);
if (evidenceRoot) validateDirectoryInput('Evidence root', evidenceRoot);

if (failures.length > 0) {
  console.error('Buyer evidence readiness report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const pilotRegisters = [];
const outreachLogs = [];
let csvFilesSeen = 0;
let ignoredCsvFiles = 0;

for (const root of roots) {
  const { files, ignored } = scanCsvFiles(root);
  ignoredCsvFiles += ignored;
  for (const filePath of files) {
    csvFilesSeen += 1;
    const text = readFileSync(filePath, 'utf8');
    const rows = parseCsv(text);
    if (rows.length === 0) continue;
    const columns = new Set(rows[0].map(normalizeColumn));
    if (hasColumns(columns, pilotRegisterColumns)) {
      pilotRegisters.push(summarizePilotRegister(filePath, rows));
    } else if (hasColumns(columns, outreachLogColumns)) {
      outreachLogs.push(summarizeOutreachLog(filePath, rows));
    }
  }
}

const totalActionableOutreachRows = outreachLogs.reduce((sum, log) => sum + log.actionableRows, 0);
const totalConfidenceRows = pilotRegisters.reduce((sum, register) => sum + register.confidenceRows, 0);
const passing95Gates = pilotRegisters.filter((register) => register.gate95?.status === 0).length;
const allValid = [...pilotRegisters, ...outreachLogs].every((item) => item.validation.status === 0);
const hasProductionEvidenceInputs = pilotRegisters.length > 0 || outreachLogs.length > 0;

console.log('# CEIP Buyer Evidence Readiness Report');
console.log(`Generated: ${new Date().toISOString()}`);
console.log(`Roots: ${roots.map(displayPath).join(', ')}`);
console.log(`CSV files scanned: ${csvFilesSeen}`);
console.log(`Ignored template/fixture/generated paths: ${ignoredCsvFiles}`);
console.log(`Production pilot evidence registers: ${pilotRegisters.length}`);
console.log(`Production outreach response logs: ${outreachLogs.length}`);
console.log(`Confidence-moving register rows: ${totalConfidenceRows}`);
console.log(`Actionable outreach rows: ${totalActionableOutreachRows}`);
console.log(`Evidence root: ${evidenceRoot ? displayPath(evidenceRoot) : 'not provided'}`);

if (passing95Gates > 0) {
  console.log(`Phase F 95% gate: ready (${passing95Gates} register(s) passed with retained evidence).`);
} else if (pilotRegisters.length === 0) {
  console.log('Phase F 95% gate: not ready (no production pilot evidence register found outside templates/fixtures).');
} else if (!evidenceRoot) {
  console.log('Phase F 95% gate: not run (provide --evidence-root with retained redacted artifacts).');
} else {
  console.log('Phase F 95% gate: not ready (no production register passed --require-95).');
}

if (pilotRegisters.length > 0) {
  console.log('\n## Pilot Evidence Registers');
  for (const register of pilotRegisters) {
    console.log(`- ${displayPath(register.path)}`);
    console.log(`  Rows: ${register.rows}; confidence-moving: ${register.confidenceRows}; accepted: ${register.acceptedRows}; hashed: ${register.hashedRows}; strong commercial: ${register.strongCommercialRows}.`);
    console.log(`  Base validation: ${register.validation.status === 0 ? 'pass' : 'fail'}.`);
    if (register.validation.status !== 0) {
      for (const line of firstOutputLines(`${register.validation.stderr}\n${register.validation.stdout}`)) console.log(`    ${line}`);
    }
    if (register.gate95) {
      console.log(`  95% retained-evidence gate: ${register.gate95.status === 0 ? 'pass' : 'fail'}.`);
      if (register.gate95.status !== 0) {
        for (const line of firstOutputLines(`${register.gate95.stderr}\n${register.gate95.stdout}`)) console.log(`    ${line}`);
      }
    }
  }
}

if (outreachLogs.length > 0) {
  console.log('\n## Outreach Response Logs');
  for (const log of outreachLogs) {
    console.log(`- ${displayPath(log.path)}`);
    console.log(`  Rows: ${log.rows}; actionable evidence rows: ${log.actionableRows}.`);
    console.log(`  Validation: ${log.validation.status === 0 ? 'pass' : 'fail'}.`);
    console.log(`  Action plan: ${log.actionPlan.status === 0 ? 'available' : 'blocked'}.`);
    if (log.actionableRows > 0 && log.actionPlan.status === 0) {
      console.log('  Action plan excerpt:');
      for (const line of indentedOutputLines(log.actionPlan.stdout)) console.log(line);
    }
    if (log.validation.status !== 0 || log.actionPlan.status !== 0) {
      for (const line of firstOutputLines(`${log.validation.stderr}\n${log.validation.stdout}\n${log.actionPlan.stderr}\n${log.actionPlan.stdout}`)) console.log(`    ${line}`);
    }
  }
}

console.log('\n## Next Actions');
if (!hasProductionEvidenceInputs) {
  console.log('- Fill a non-template anonymized outreach response log when real buyer activity exists, then run `pnpm run plan:outreach-intake -- path/to/outreach-response-log.csv`.');
  console.log('- Generate route-specific intake scaffolding with `pnpm run create:pilot-evidence-intake-packet -- --route /utility-demand-forecast --output-dir /tmp/ceip-pilot-intake`.');
  console.log('- Store retained redacted buyer artifacts outside templates/fixtures and rerun this report with `--root` and `--evidence-root`.');
} else if (totalActionableOutreachRows > 0 && pilotRegisters.length === 0) {
  console.log('- Use the outreach action plan excerpt above to create intake packets or retained artifacts.');
} else if (pilotRegisters.length > 0 && !evidenceRoot) {
  console.log('- Re-run with `--evidence-root path/to/redacted-artifacts` to test the retained-artifact 95% gate.');
} else if (passing95Gates === 0) {
  console.log('- Fix the failing retained-evidence gate output before raising market-confidence claims.');
} else {
  console.log('- A retained-evidence register passed the hard gate; review claim boundaries before changing confidence language.');
}

if (!allValid) process.exit(1);
if (failWhenEmpty && !hasProductionEvidenceInputs) process.exit(1);
