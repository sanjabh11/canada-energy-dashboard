#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
const values = new Map();

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[index + 1] ?? '';
    index += 1;
    if (!['workspace-dir', 'register-file'].includes(key)) {
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
  pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence

Options:
  --workspace-dir <dir>  Required. Phase F evidence workspace created by create:phase-f-evidence-workspace.
  --register-file <csv>  Optional. Candidate register inside the workspace to validate and hard-gate.
`);
}

function displayPath(filePath) {
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join('/');
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) return relativePath;
  return filePath.split(path.sep).join('/');
}

function runScript(scriptName, scriptArgs) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', scriptName), ...scriptArgs], {
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

function outputLines(output, limit = 12) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function summaryValue(output, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = output.match(new RegExp(`^${escapedLabel}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim() ?? 'not reported';
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) return value;
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function printCommand(parts) {
  console.log(parts.map(shellQuote).join(' '));
}

if (!values.has('workspace-dir')) failures.push('Missing required option: --workspace-dir');

if (failures.length > 0) {
  console.error('Phase F evidence workspace report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

const workspaceDir = path.resolve(repoRoot, values.get('workspace-dir'));
if (!existsSync(workspaceDir)) {
  failures.push(`Workspace directory not found: ${displayPath(workspaceDir)}`);
} else if (!statSync(workspaceDir).isDirectory()) {
  failures.push(`Workspace path must be a directory: ${displayPath(workspaceDir)}`);
}

const manifestPath = path.join(workspaceDir, 'phase-f-evidence-workspace-manifest.json');
const outreachLogPath = path.join(workspaceDir, 'outreach', 'outreach-response-log.csv');
const evidenceRoot = path.join(workspaceDir, 'phase-f-minimum-intake');
const starterRegisterPath = path.join(evidenceRoot, 'phase-f-minimum-register-starter.csv');
const candidateRegisterPath = values.has('register-file')
  ? path.resolve(repoRoot, values.get('register-file'))
  : starterRegisterPath;

let manifest = null;
if (!existsSync(manifestPath)) {
  failures.push(`Workspace manifest not found: ${displayPath(manifestPath)}`);
} else {
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    failures.push(`Workspace manifest is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const [label, filePath] of [
  ['Outreach log', outreachLogPath],
  ['Starter register', starterRegisterPath],
  ['Selected register', candidateRegisterPath],
]) {
  if (!existsSync(filePath)) {
    failures.push(`${label} not found: ${displayPath(filePath)}`);
  } else if (!statSync(filePath).isFile()) {
    failures.push(`${label} must be a file: ${displayPath(filePath)}`);
  }
}

if (existsSync(workspaceDir) && existsSync(candidateRegisterPath)) {
  const relativeRegisterPath = path.relative(workspaceDir, candidateRegisterPath);
  if (relativeRegisterPath.startsWith('..') || path.isAbsolute(relativeRegisterPath)) {
    failures.push(`Selected register must be inside the workspace: ${displayPath(candidateRegisterPath)}`);
  }
}

if (!existsSync(evidenceRoot)) {
  failures.push(`Evidence root not found: ${displayPath(evidenceRoot)}`);
} else if (!statSync(evidenceRoot).isDirectory()) {
  failures.push(`Evidence root must be a directory: ${displayPath(evidenceRoot)}`);
}

if (manifest) {
  if (manifest.confidence_movement !== 'none') failures.push('Manifest confidence_movement must be none for generated workspaces.');
  if (manifest.buyer_proof_created !== false) failures.push('Manifest buyer_proof_created must be false for generated workspaces.');
  if (!Array.isArray(manifest.selected_routes) || manifest.selected_routes.length < 3) {
    failures.push('Manifest must include the selected Phase F route summaries.');
  }
}

if (failures.length > 0) {
  console.error('Phase F evidence workspace report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const outreachValidation = runScript('validate-outreach-response-log.mjs', [outreachLogPath, '--report']);
const outreachActionPlan = runScript('validate-outreach-response-log.mjs', [outreachLogPath, '--action-plan']);
const selectedRegisterValidation = runScript('validate-pilot-evidence-register.mjs', [candidateRegisterPath]);
const readinessReport = runScript('report-buyer-evidence-readiness.mjs', [
  '--root',
  workspaceDir,
  '--evidence-root',
  evidenceRoot,
]);
const hardGate = runScript('validate-pilot-evidence-register.mjs', [
  candidateRegisterPath,
  '--require-95',
  '--evidence-root',
  evidenceRoot,
]);

for (const [label, result] of [
  ['Outreach log validation', outreachValidation],
  ['Outreach action plan', outreachActionPlan],
  ['Selected register validation', selectedRegisterValidation],
  ['Buyer evidence readiness report', readinessReport],
]) {
  if (result.status !== 0) {
    failures.push(`${label} failed with exit ${result.status}.`);
    for (const line of outputLines(`${result.stderr}\n${result.stdout}`)) failures.push(`  ${line}`);
  }
}

if (failures.length > 0) {
  console.error('Phase F evidence workspace report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const selectedRoutes = Array.isArray(manifest.selected_routes) ? manifest.selected_routes : [];
const hardGateOutput = `${hardGate.stderr}\n${hardGate.stdout}`;
const hardGateReady = hardGate.status === 0;
const hardGateBlockers = hardGateReady
  ? []
  : outputLines(hardGateOutput, 20).filter((line) => line.startsWith('- 95% confidence gate'));

console.log('# CEIP Phase F Evidence Workspace Report');
console.log(`Generated: ${new Date().toISOString()}`);
console.log(`Workspace: ${displayPath(workspaceDir)}`);
console.log(`Manifest: ${displayPath(manifestPath)}`);
console.log(`Selected register: ${displayPath(candidateRegisterPath)}`);
console.log(`Record date: ${manifest.record_date ?? 'not recorded'}`);
console.log(`Confidence movement: ${manifest.confidence_movement}`);
console.log(`Buyer proof created: ${manifest.buyer_proof_created ? 'yes' : 'no'}`);

console.log('\n## Selected Routes');
for (const route of selectedRoutes) {
  console.log(`- ${route.route} (${route.proof_pack_id})`);
}

console.log('\n## Validation');
console.log(`- Outreach log: ${outreachValidation.status === 0 ? 'pass' : 'fail'} (${displayPath(outreachLogPath)})`);
console.log(`- Outreach action plan: ${outreachActionPlan.status === 0 ? 'available' : 'blocked'}`);
console.log(`- Starter register scaffold: ${existsSync(starterRegisterPath) ? 'present' : 'missing'} (${displayPath(starterRegisterPath)})`);
console.log(`- Selected register validation: ${selectedRegisterValidation.status === 0 ? 'pass' : 'fail'} (${displayPath(candidateRegisterPath)})`);
console.log(`- Buyer evidence readiness report: ${readinessReport.status === 0 ? 'pass' : 'fail'}`);
console.log(`- Hard 95% retained-evidence gate: ${hardGateReady ? 'pass' : 'blocked'}`);

console.log('\n## Readiness Summary');
for (const label of [
  'Production pilot evidence registers',
  'Production outreach response logs',
  'Confidence-moving register rows',
  'Actionable outreach rows',
  'Batchable intake-packet outreach rows',
  'Phase F 95% gate',
]) {
  console.log(`- ${label}: ${summaryValue(readinessReport.stdout, label)}`);
}

if (!hardGateReady) {
  console.log('\n## Current 95% Gate Blockers');
  for (const blocker of hardGateBlockers) console.log(blocker);
}

console.log('\n## Next Operator Commands');
console.log('Append a real, anonymized buyer activity row only after completed outreach exists:');
printCommand([
  'pnpm',
  'run',
  'append:outreach-response-log-row',
  '--',
  '--log-file',
  outreachLogPath,
  '--activity-date',
  manifest.record_date ?? new Date().toISOString().slice(0, 10),
  '--channel',
  '<linkedin|email|referral|conference|manual|partner>',
  '--target-label',
  '<anonymized-target-label>',
  '--route',
  selectedRoutes[0]?.route ?? '/utility-demand-forecast',
  '--rating',
  '<current-proof-pack-rating>',
  '--variant-id',
  '<message-variant>',
  '--reply-status',
  '<interested|requested_info|data_offered|meeting_booked>',
  '--response-summary',
  '<anonymized buyer response summary>',
  '--pain-signal',
  '<buyer pain signal>',
  '--requested-input',
  '<redacted input requested or offered>',
  '--reviewer-role',
  '<buyer reviewer role only>',
  '--next-action',
  '<bounded next action>',
  '--pilot-evidence-register-action',
  '<create_intake_packet|prepare_retained_artifact|update_register|run_95_gate>',
]);

console.log('\nThen plan and generate intake scaffolding for actionable rows:');
printCommand(['pnpm', 'run', 'plan:outreach-intake', '--', outreachLogPath]);
printCommand([
  'pnpm',
  'run',
  'create:outreach-intake-packets',
  '--',
  '--log-file',
  outreachLogPath,
  '--output-dir',
  path.join(workspaceDir, 'outreach-intake-packets'),
]);

console.log('\nAfter real retained artifacts exist, update the top-level Phase F starter register through the matching route updater:');
console.log('Choose the command whose --artifact-root matches the retained artifact route/proof-pack row.');
const updatedRegisterPath = path.join(workspaceDir, 'phase-f-minimum-register-updated.csv');
for (const route of selectedRoutes) {
  const artifactRoot = route.artifact_root
    ? path.resolve(repoRoot, route.artifact_root)
    : path.join(evidenceRoot, String(route.route ?? '').replace(/^\//, ''), 'redacted-artifacts');
  console.log(`\n${route.route} (${route.proof_pack_id})`);
  printCommand([
    'pnpm',
    'run',
    'update:pilot-evidence-register-row',
    '--',
    '--register-file',
    starterRegisterPath,
    '--evidence-root',
    evidenceRoot,
    '--artifact-root',
    artifactRoot,
    '--evidence-file-reference',
    '<retained-artifact.md#sha256=...>',
    '--confidence-delta',
    '<explicit 0..0.4, or 0 for staging>',
    '--output-file',
    updatedRegisterPath,
  ]);
}

console.log('\nThen rerun this workspace report against the updated candidate register:');
printCommand([
  'pnpm',
  'run',
  'report:phase-f-evidence-workspace',
  '--',
  '--workspace-dir',
  workspaceDir,
  '--register-file',
  updatedRegisterPath,
]);

console.log('\nRun the hard gate only after accepted buyer rows and retained hashes exist:');
printCommand(['pnpm', 'run', 'validate:pilot-evidence', '--', candidateRegisterPath, '--require-95', '--evidence-root', evidenceRoot]);

console.log('\nBoundary: this report does not create buyer proof or raise market confidence.');
