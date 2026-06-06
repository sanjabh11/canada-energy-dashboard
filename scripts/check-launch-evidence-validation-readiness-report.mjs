#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
let skipProbes = false;

for (const arg of args) {
  if (arg === '--') continue;
  if (arg === '--skip-probes') {
    skipProbes = true;
    continue;
  }
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  failures.push(`Unexpected argument: ${arg}`);
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run check:launch-evidence-validation-report

Options:
  --skip-probes    Validate the focused validation report contract without running local Corepack, Git LFS, branch, or buyer probes.
`);
}

function runReport(extraArgs = []) {
  const commandArgs = ['scripts/report-launch-evidence-validation-readiness.mjs', ...extraArgs];
  if (skipProbes) commandArgs.push('--skip-probes');
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 30 * 1024 * 1024,
  });
  return {
    status: typeof result.status === 'number' ? result.status : 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error.message ?? result.error) : '',
  };
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertContains(text, pattern, message) {
  assert(text.includes(pattern), message);
}

if (failures.length === 0) {
  const markdown = runReport();
  if (markdown.status !== 0) {
    failures.push(`report-launch-evidence-validation-readiness exited ${markdown.status}.`);
    if (markdown.error.trim()) failures.push(markdown.error.trim());
    if (markdown.stderr.trim()) failures.push(markdown.stderr.trim());
    if (markdown.stdout.trim()) failures.push(markdown.stdout.trim().slice(0, 4000));
  }

  const jsonReport = runReport(['--json']);
  let payload = null;
  if (jsonReport.status !== 0) {
    failures.push(`report-launch-evidence-validation-readiness --json exited ${jsonReport.status}.`);
    if (jsonReport.error.trim()) failures.push(jsonReport.error.trim());
    if (jsonReport.stderr.trim()) failures.push(jsonReport.stderr.trim());
  } else {
    try {
      payload = JSON.parse(jsonReport.stdout);
    } catch (error) {
      failures.push(`Could not parse focused launch evidence validation JSON: ${error.message}`);
    }
  }

  if (markdown.status === 0) {
    const stdout = markdown.stdout;
    assertContains(stdout, '# CEIP Launch Evidence Validation Readiness Report', 'Report must include the focused launch evidence validation title.');
    assertContains(stdout, 'Validation readiness status:', 'Report must include validation readiness status.');
    assertContains(stdout, 'Validation check status:', 'Report must include validation check status.');
    assertContains(stdout, 'Launch action row status:', 'Report must include launch action row status.');
    assertContains(stdout, 'Production prerequisite status:', 'Report must include production prerequisite status.');
    assertContains(stdout, 'Request row blocks request:', 'Report must include request-row blocker status.');
    assertContains(stdout, '## Decision Boundary', 'Report must include a decision-boundary section.');
    assertContains(stdout, 'does not self-certify the manifest', 'Report must reject manifest self-certification.');
    assert(/does not .*request owner approval|contact buyers|authorize Supabase|deploy|hosted\/live parity|commercial launch readiness/i.test(stdout), 'Report must preserve no-approval, no-external-action, no-deploy, no-live-parity, and no-readiness boundaries.');
    assertContains(stdout, '## Validation Command Result', 'Report must include the validation command result.');
    assertContains(stdout, 'corepack pnpm run check:launch-evidence-manifest', 'Report must include the underlying launch evidence check command.');
    assertContains(stdout, 'launch_evidence_validation', 'Report must include the launch action validation row.');
    assertContains(stdout, '## Production Approval Validation Prerequisite', 'Report must include the production approval validation prerequisite.');
    assertContains(stdout, '## Production Approval Request Validation Row', 'Report must include the production approval request validation row.');
    assertContains(stdout, '## Public Release Status Handle', 'Report must include the public release status handle.');
    assertContains(stdout, 'launch_evidence_validation_gate', 'Report must expose the public validation gate id.');
    assertContains(stdout, '## Package Script Handles', 'Report must include package script handles.');
  }

  if (payload) {
    const readiness = payload.validation_readiness ?? {};
    const validation = readiness.validation_check ?? {};
    const actionRow = payload.launch_action_validation_row ?? {};
    const prerequisite = payload.production_approval_validation_prerequisite ?? {};
    const requestRow = payload.production_approval_request_validation_row ?? {};
    const publicGate = payload.public_status_validation_gate ?? {};
    assert(payload.schema_version === 1, 'Focused launch evidence validation JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused launch evidence validation JSON must preserve the blocked launch decision.');
    assert(['pass', 'blocked'].includes(readiness.status), 'validation_readiness.status must be pass or blocked.');
    assert(validation.proof_type === 'launch_evidence_manifest_validation', 'Focused JSON must include the launch evidence manifest validation result.');
    assert(validation.status === 'pass', 'Focused validation check must pass in the current repo contract.');
    assert(actionRow.phase === 'launch_evidence_validation', 'Focused JSON must include the launch action validation row.');
    assert(actionRow.proof_type === 'manifest_validation_and_approval_packet', 'Launch action validation row must keep the manifest validation proof type.');
    assert(actionRow.status === 'ready', 'Launch action validation row must not remain self-blocking after focused validation evidence is externalized.');
    assert(prerequisite.prerequisite === 'Launch evidence validation', 'Focused JSON must include the production approval validation prerequisite.');
    assert(prerequisite.status === 'ready', 'Production approval validation prerequisite must reflect external check readiness.');
    assert(
      /report:launch-evidence-validation-readiness/.test(prerequisite.proof_command ?? '')
        && /check:launch-evidence-validation-report/.test(prerequisite.proof_command ?? ''),
      'Production approval validation prerequisite must point to the focused validation report/check.',
    );
    assert(/underlying check:launch-evidence-manifest/i.test(prerequisite.needed ?? ''), 'Production approval validation prerequisite must retain the underlying manifest check requirement.');
    assert(requestRow.prerequisite === 'Launch evidence validation', 'Focused JSON must include the production approval request validation row.');
    assert(requestRow.blocks_request === false, 'Launch evidence validation request row must not remain a self-blocking request row after the external check passes.');
    assert(
      /report:launch-evidence-validation-readiness/.test(requestRow.proof_command ?? '')
        && /check:launch-evidence-validation-report/.test(requestRow.proof_command ?? ''),
      'Production approval validation request row must point to the focused validation report/check.',
    );
    assert(/underlying check:launch-evidence-manifest result/i.test(requestRow.evidence_to_attach ?? ''), 'Production approval validation request row must retain the underlying manifest check attachment.');
    assert(publicGate.id === 'launch_evidence_validation_gate', 'Focused JSON must include the public validation gate handle.');
    assert(payload.package_script_handles?.check_launch_evidence_validation_report === 'corepack pnpm run check:launch-evidence-validation-report', 'Focused report must expose the validation checker command handle.');
    assert(/does not self-certify|clear source provenance|run release-readiness|request owner approval|contact buyers|authorize Supabase|deploy|hosted\/live parity|commercial launch readiness/i.test(payload.proof_boundary ?? ''), 'Focused proof boundary must preserve no-self-certification, no-mutation, no-external-action, no-deploy, no-live-parity, and no-readiness semantics.');
    assert(/Do not treat this focused report|production approval|buyer acceptance|deployment approval|hosted\/live parity|source readiness|commercial-ready status/i.test(payload.stop_gate ?? ''), 'Focused stop gate must reject approval, buyer, deploy, live-parity, source, and readiness claims from this report itself.');
  }
}

if (failures.length > 0) {
  console.error('Launch evidence validation readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Launch evidence validation readiness report check passed: validation command result, launch action row, production approval rows, public handle, and no-readiness boundaries are consistent.');
