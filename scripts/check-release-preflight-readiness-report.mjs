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
  corepack pnpm run check:release-preflight-report

Options:
  --skip-probes    Validate the focused report contract without running local Corepack or Git LFS probes.
`);
}

function runReport(extraArgs = []) {
  const commandArgs = ['scripts/report-release-preflight-readiness.mjs', ...extraArgs];
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
    failures.push(`report-release-preflight-readiness exited ${markdown.status}.`);
    if (markdown.error.trim()) failures.push(markdown.error.trim());
    if (markdown.stderr.trim()) failures.push(markdown.stderr.trim());
    if (markdown.stdout.trim()) failures.push(markdown.stdout.trim().slice(0, 4000));
  }

  const jsonReport = runReport(['--json']);
  let payload = null;
  if (jsonReport.status !== 0) {
    failures.push(`report-release-preflight-readiness --json exited ${jsonReport.status}.`);
    if (jsonReport.error.trim()) failures.push(jsonReport.error.trim());
    if (jsonReport.stderr.trim()) failures.push(jsonReport.stderr.trim());
  } else {
    try {
      payload = JSON.parse(jsonReport.stdout);
    } catch (error) {
      failures.push(`Could not parse focused release preflight JSON: ${error.message}`);
    }
  }

  if (markdown.status === 0) {
    const stdout = markdown.stdout;
    assertContains(stdout, '# CEIP Release Preflight Readiness Report', 'Report must include the focused release preflight title.');
    assertContains(stdout, 'Release preflight status:', 'Report must include release preflight status.');
    assertContains(stdout, '## Decision Boundary', 'Report must include a decision-boundary section.');
    assertContains(stdout, 'does not install tools, run release-readiness, clear source provenance, push, deploy', 'Report must preserve release non-execution boundaries.');
    assertContains(stdout, '## Release Toolchain Probe Ledger', 'Report must include the release toolchain probe ledger.');
    assertContains(stdout, '| Corepack pnpm resolver | corepack pnpm --version |', 'Report must include the Corepack probe row.');
    assertContains(stdout, '| Git LFS push-path proof | git lfs version |', 'Report must include the Git LFS probe row.');
    assertContains(stdout, 'Do not treat bare pnpm, local shims, skipped probes', 'Report must reject bare pnpm and skipped probes as release evidence.');
    assertContains(stdout, '## Release Preflight Deficits', 'Report must include release preflight deficits.');
    assertContains(stdout, '| Release-readiness execution |', 'Report must include the release-readiness execution row.');
    assertContains(stdout, '| Clean source provenance |', 'Report must include the clean source provenance row.');
    assertContains(stdout, '| Explicit owner production approval |', 'Report must include the explicit owner approval row.');
    assertContains(stdout, '## Release Preflight Clearance Matrix', 'Report must include the release clearance matrix.');
    assertContains(stdout, 'Do not mark release approval ready', 'Report must include the release approval stop gate.');
    assertContains(stdout, 'Blocks Release Gate', 'Report must expose release-gate blocking rows.');
    assertContains(stdout, '## Release Preflight Remediation Queue', 'Report must include the remediation queue.');
    assertContains(stdout, 'corepack pnpm run check:release-readiness', 'Report must include the guarded release-readiness command.');
    assertContains(stdout, 'corepack pnpm run check:production-deploy-request', 'Report must include the production deploy request command.');
    assertContains(stdout, '## Source Provenance Boundary', 'Report must include source provenance boundary evidence.');
    assertContains(stdout, 'Source provenance', 'Report must include source provenance evidence text.');
    assertContains(stdout, '## Production Approval Request Boundary', 'Report must include production approval request boundary evidence.');
    assertContains(stdout, 'Production approval request packet', 'Report must include production approval request packet evidence.');
    assertContains(stdout, 'does not grant owner approval', 'Report must preserve production approval boundary text.');
  }

  if (payload) {
    const releasePreflight = payload.release_preflight ?? {};
    const toolchainLedger = releasePreflight.toolchain_probe_ledger ?? {};
    const clearanceMatrix = releasePreflight.clearance_matrix ?? {};
    const remediationQueue = releasePreflight.remediation_queue ?? {};
    const requirements = (releasePreflight.items ?? []).map((item) => item.requirement);
    const releaseItemsByRequirement = new Map((releasePreflight.items ?? []).map((item) => [item.requirement, item]));
    const clearanceRowsByRequirement = new Map((clearanceMatrix.rows ?? []).map((item) => [item.requirement, item]));
    const remediationRowsByRequirement = new Map((remediationQueue.items ?? []).map((item) => [item.requirement, item]));

    assert(payload.schema_version === 1, 'Focused release preflight JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused release preflight JSON must preserve the blocked launch decision.');
    assert(typeof releasePreflight.status === 'string' && releasePreflight.status.length > 0, 'release_preflight.status must be set.');
    assert(requirements.join(',') === 'Pinned package manager,Corepack pnpm resolver,Release-readiness execution,Git LFS push-path proof,Clean source provenance,Explicit owner production approval', 'release_preflight.items must preserve release preflight requirement order.');
    assert(toolchainLedger.items?.length === 2, 'toolchain_probe_ledger must include exactly Corepack and Git LFS probes.');
    assert(toolchainLedger.items?.[0]?.id === 'corepack_pnpm_resolver', 'First toolchain probe must be corepack_pnpm_resolver.');
    assert(toolchainLedger.items?.[1]?.id === 'git_lfs_push_path', 'Second toolchain probe must be git_lfs_push_path.');
    assert(clearanceMatrix.proof_type === 'release_preflight_clearance_matrix', 'clearance matrix proof_type must be release_preflight_clearance_matrix.');
    assert(clearanceMatrix.row_count === releasePreflight.items?.length, 'clearance matrix row_count must match release preflight item count.');
    assert(clearanceMatrix.blocked_count >= 1, 'clearance matrix must keep blocked release rows visible until release preflight passes.');
    assert(/does not install tools|run release-readiness|clear source provenance|push|deploy/i.test(clearanceMatrix.proof_boundary ?? ''), 'clearance matrix proof boundary must preserve non-execution semantics.');
    assert(/Do not mark release approval ready|Corepack-pinned release-readiness|Git LFS push-path proof|owner approval/i.test(clearanceMatrix.stop_gate ?? ''), 'clearance matrix stop gate must require current release evidence.');
    assert(Array.isArray(remediationQueue.items), 'remediation_queue.items must be an array.');
    assert(/does not install tools|clear source provenance|run release-readiness|push|deploy/i.test(remediationQueue.evidence ?? ''), 'remediation queue evidence must preserve non-execution semantics.');
    assert(payload.source_provenance?.resolution_queue, 'Focused report JSON must include source provenance resolution queue.');
    assert(/report:source-provenance-readiness/.test(releaseItemsByRequirement.get('Clean source provenance')?.proof_command ?? '') && /check:source-provenance-report/.test(releaseItemsByRequirement.get('Clean source provenance')?.proof_command ?? ''), 'Clean source provenance release preflight row must point to the focused source provenance report/check.');
    assert(/report:source-provenance-readiness/.test(clearanceRowsByRequirement.get('Clean source provenance')?.proof_command ?? '') && /check:source-provenance-report/.test(clearanceRowsByRequirement.get('Clean source provenance')?.proof_command ?? ''), 'Clean source provenance clearance row must point to the focused source provenance report/check.');
    assert(/report:source-provenance-readiness/.test(remediationRowsByRequirement.get('Clean source provenance')?.proof_command ?? '') && /check:source-provenance-report/.test(remediationRowsByRequirement.get('Clean source provenance')?.proof_command ?? ''), 'Clean source provenance remediation row must point to the focused source provenance report/check.');
    assert(payload.production_approval_request_packet?.proof_type === 'production_approval_request_packet', 'Focused report JSON must include production approval request packet.');
    assert(/does not install tools|run release-readiness|clear source provenance|push|deploy/i.test(payload.proof_boundary ?? ''), 'Focused report proof boundary must not imply release execution.');
    assert(/Do not treat this focused report|release-readiness|production approval|hosted\/live parity/i.test(payload.stop_gate ?? ''), 'Focused report stop gate must reject readiness claims from the report itself.');
  }
}

if (failures.length > 0) {
  console.error('Release preflight readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Release preflight readiness report check passed: focused release preflight status, toolchain probe ledger, release deficits, clearance matrix, remediation queue, source provenance, production approval packet, and proof boundaries are consistent.');
