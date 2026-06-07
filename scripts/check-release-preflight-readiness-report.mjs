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
    assertContains(stdout, 'Diagnostic Command', 'Report must expose diagnostic command columns for non-clearance tool context.');
    assertContains(stdout, 'pnpm --version', 'Report must include the bare pnpm diagnostic command.');
    assertContains(stdout, 'Bare pnpm diagnostics are local-shell context only', 'Report must preserve the bare pnpm non-clearance boundary.');
    assertContains(stdout, '| Git LFS push-path proof | git lfs version |', 'Report must include the Git LFS probe row.');
    assertContains(stdout, 'git config --get core.hookspath', 'Report must include the Git LFS hook-path diagnostic command.');
    assertContains(stdout, 'Git LFS hook-path diagnostics are current-shell context only', 'Report must preserve the Git LFS hook diagnostic proof boundary.');
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
    assertContains(stdout, '## Release Operator Handoff Packet', 'Report must include the release operator handoff packet.');
    assertContains(stdout, 'release_operator_handoff_packet', 'Report must classify the release operator handoff packet proof type.');
    assertContains(stdout, 'release_preflight.remediation_queue.items', 'Report must expose the remediation queue as the operator handoff source.');
    if ((payload?.release_preflight?.operator_handoff_packet?.items ?? []).some((item) => item.execution_gate === 'toolchain_probe_first')) {
      assertContains(stdout, 'toolchain_probe_first', 'Report must include the toolchain-first execution gate when toolchain rows are blocked.');
    }
    assertContains(stdout, 'after_corepack_git_lfs_and_clean_source', 'Report must include the guarded release-readiness execution gate.');
    assertContains(stdout, 'manual_stop_after_all_prerequisites', 'Report must include the manual approval execution gate.');
    assertContains(stdout, 'Can Execute From Packet', 'Report must expose the packet non-execution column.');
    assertContains(stdout, 'planning evidence only', 'Report must preserve the operator handoff planning-only boundary.');
    assertContains(stdout, '## Source Provenance Boundary', 'Report must include source provenance boundary evidence.');
    assertContains(stdout, 'Source provenance', 'Report must include source provenance evidence text.');
    assertContains(stdout, '## Production Approval Request Boundary', 'Report must include production approval request boundary evidence.');
    assertContains(stdout, 'Production approval request packet', 'Report must include production approval request packet evidence.');
    assertContains(stdout, 'does not grant owner approval', 'Report must preserve production approval boundary text.');
    assertContains(stdout, '## Public Release Status Handles', 'Report must include public release-preflight handles.');
    assertContains(stdout, 'release_toolchain_approval_deficit_ledger', 'Report must include the release deficit ledger public handle.');
    assertContains(stdout, 'release_preflight_remediation_queue', 'Report must include the release remediation queue public handle.');
    assertContains(stdout, 'release_operator_handoff_packet', 'Report must include the release operator handoff public handle.');
    assertContains(stdout, 'release_preflight_clearance_matrix', 'Report must include the release clearance matrix public handle.');
    assertContains(stdout, 'release_toolchain_probe_ledger', 'Report must include the release toolchain probe public handle.');
    assertContains(stdout, '## Package Script Handles', 'Report must include package script handles.');
    assertContains(stdout, 'corepack pnpm run report:release-preflight', 'Report must include the focused release-preflight package report handle.');
    assertContains(stdout, 'corepack pnpm run check:release-preflight-report', 'Report must include the focused release-preflight package check handle.');
    assertContains(stdout, 'corepack pnpm run check:release-readiness', 'Report must include the guarded release-readiness package handle.');
  }

  if (payload) {
    const releasePreflight = payload.release_preflight ?? {};
    const toolchainLedger = releasePreflight.toolchain_probe_ledger ?? {};
    const clearanceMatrix = releasePreflight.clearance_matrix ?? {};
    const remediationQueue = releasePreflight.remediation_queue ?? {};
    const operatorHandoffPacket = releasePreflight.operator_handoff_packet ?? {};
    const requirements = (releasePreflight.items ?? []).map((item) => item.requirement);
    const releaseItemsByRequirement = new Map((releasePreflight.items ?? []).map((item) => [item.requirement, item]));
    const toolchainItemsById = new Map((toolchainLedger.items ?? []).map((item) => [item.id, item]));
    const clearanceRowsByRequirement = new Map((clearanceMatrix.rows ?? []).map((item) => [item.requirement, item]));
    const remediationRowsByRequirement = new Map((remediationQueue.items ?? []).map((item) => [item.requirement, item]));
    const operatorRowsByRequirement = new Map((operatorHandoffPacket.items ?? []).map((item) => [item.requirement, item]));
    const corepackProbe = toolchainItemsById.get('corepack_pnpm_resolver');
    const gitLfsProbe = toolchainItemsById.get('git_lfs_push_path');

    assert(payload.schema_version === 1, 'Focused release preflight JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused release preflight JSON must preserve the blocked launch decision.');
    assert(typeof releasePreflight.status === 'string' && releasePreflight.status.length > 0, 'release_preflight.status must be set.');
    assert(requirements.join(',') === 'Pinned package manager,Corepack pnpm resolver,Release-readiness execution,Git LFS push-path proof,Clean source provenance,Explicit owner production approval', 'release_preflight.items must preserve release preflight requirement order.');
    assert(toolchainLedger.items?.length === 2, 'toolchain_probe_ledger must include exactly Corepack and Git LFS probes.');
    assert(toolchainLedger.items?.[0]?.id === 'corepack_pnpm_resolver', 'First toolchain probe must be corepack_pnpm_resolver.');
    assert(toolchainLedger.items?.[1]?.id === 'git_lfs_push_path', 'Second toolchain probe must be git_lfs_push_path.');
    assert(corepackProbe?.diagnostic_command === 'pnpm --version', 'Corepack probe must expose the bare pnpm diagnostic command.');
    assert(typeof corepackProbe?.diagnostic_current === 'string' && corepackProbe.diagnostic_current.length > 0, 'Corepack probe must expose diagnostic_current.');
    assert(/Bare pnpm diagnostics are local-shell context only|does not satisfy the Corepack pnpm resolver gate|run release-readiness|deploy|production approval/i.test(corepackProbe?.diagnostic_boundary ?? ''), 'Corepack probe diagnostic boundary must reject bare pnpm as Corepack release evidence.');
    assert(releasePreflight.bare_pnpm_diagnostic === 'skipped' || /does not satisfy Corepack/i.test(releasePreflight.bare_pnpm_diagnostic ?? ''), 'bare_pnpm_diagnostic must be skipped or explicitly say it does not satisfy Corepack.');
    if (releasePreflight.corepack_probe === 'fail') {
      assert(corepackProbe?.status === 'blocked', 'Corepack probe must stay blocked when corepack pnpm --version fails, regardless of bare pnpm diagnostics.');
    }
    assert(/git config --get core\.hookspath/.test(gitLfsProbe?.diagnostic_command ?? ''), 'Git LFS probe must expose the hook-path diagnostic command.');
    assert(typeof gitLfsProbe?.diagnostic_current === 'string' && gitLfsProbe.diagnostic_current.length > 0, 'Git LFS probe must expose diagnostic_current.');
    assert(/Git LFS hook-path diagnostics are current-shell context only|do not rewrite hooks|future commit or push hook PATH|production approval/i.test(gitLfsProbe?.diagnostic_boundary ?? ''), 'Git LFS probe diagnostic boundary must reject hook-path diagnostics as future push approval.');
    assert(releasePreflight.git_lfs_hook_diagnostic === 'skipped' || /core\.hookspath|current_path_git_lfs|hook_requires_git_lfs_on_path/i.test(releasePreflight.git_lfs_hook_diagnostic ?? ''), 'git_lfs_hook_diagnostic must be skipped or include hook/path context.');
    assert(clearanceMatrix.proof_type === 'release_preflight_clearance_matrix', 'clearance matrix proof_type must be release_preflight_clearance_matrix.');
    assert(clearanceMatrix.row_count === releasePreflight.items?.length, 'clearance matrix row_count must match release preflight item count.');
    assert(clearanceMatrix.blocked_count >= 1, 'clearance matrix must keep blocked release rows visible until release preflight passes.');
    assert(/does not install tools|run release-readiness|clear source provenance|push|deploy/i.test(clearanceMatrix.proof_boundary ?? ''), 'clearance matrix proof boundary must preserve non-execution semantics.');
    assert(/Do not mark release approval ready|Corepack-pinned release-readiness|Git LFS push-path proof|owner approval/i.test(clearanceMatrix.stop_gate ?? ''), 'clearance matrix stop gate must require current release evidence.');
    assert(Array.isArray(remediationQueue.items), 'remediation_queue.items must be an array.');
    assert(/does not install tools|clear source provenance|run release-readiness|push|deploy/i.test(remediationQueue.evidence ?? ''), 'remediation queue evidence must preserve non-execution semantics.');
    assert(operatorHandoffPacket.proof_type === 'release_operator_handoff_packet', 'operator_handoff_packet proof_type must be release_operator_handoff_packet.');
    assert(operatorHandoffPacket.source === 'release_preflight.remediation_queue.items', 'operator_handoff_packet source must point to the release remediation queue items.');
    assert(operatorHandoffPacket.status === (remediationQueue.status === 'pass' ? 'ready' : 'blocked'), 'operator_handoff_packet status must derive from remediation queue status.');
    assert(Array.isArray(operatorHandoffPacket.items), 'operator_handoff_packet.items must be an array.');
    assert(operatorHandoffPacket.item_count === remediationQueue.items?.length, 'operator_handoff_packet item_count must match remediation queue item count.');
    assert(operatorHandoffPacket.blocked_count === (operatorHandoffPacket.items ?? []).filter((item) => item.blocks_release_gate).length, 'operator_handoff_packet blocked_count must match release-blocking rows.');
    assert(operatorHandoffPacket.toolchain_probe_count === (operatorHandoffPacket.items ?? []).filter((item) => item.proof_type === 'toolchain_probe').length, 'operator_handoff_packet toolchain_probe_count must match toolchain rows.');
    assert(operatorHandoffPacket.gated_release_count === (operatorHandoffPacket.items ?? []).filter((item) => item.proof_type === 'gated_release_command').length, 'operator_handoff_packet gated_release_count must match gated release rows.');
    assert(operatorHandoffPacket.source_decision_count === (operatorHandoffPacket.items ?? []).filter((item) => item.proof_type === 'source_provenance_decision').length, 'operator_handoff_packet source_decision_count must match source decision rows.');
    assert(operatorHandoffPacket.manual_stop_count === (operatorHandoffPacket.items ?? []).filter((item) => item.proof_type === 'manual_approval' || item.status === 'manual_stop').length, 'operator_handoff_packet manual_stop_count must match manual stop rows.');
    assert(JSON.stringify((operatorHandoffPacket.items ?? []).map((item) => item.requirement)) === JSON.stringify((remediationQueue.items ?? []).map((item) => item.requirement)), 'operator_handoff_packet must preserve remediation queue requirement order.');
    assert((operatorHandoffPacket.items ?? []).every((item) => item.can_execute_from_packet === false), 'operator_handoff_packet rows must not be executable from the packet.');
    assert((operatorHandoffPacket.items ?? []).every((item) => item.blocks_release_gate === (item.status !== 'ready')), 'operator_handoff_packet rows must derive blocks_release_gate from row status.');
    assert(/does not install Corepack|install Git LFS|run release-readiness|clear source provenance|push|deploy|request production approval|hosted\/live parity/i.test(operatorHandoffPacket.proof_boundary ?? ''), 'operator_handoff_packet proof_boundary must preserve non-execution semantics.');
    assert(/Do not mark release preflight ready|request production approval|push|deploy|hosted\/live parity/i.test(operatorHandoffPacket.stop_gate ?? ''), 'operator_handoff_packet stop_gate must reject release claims from the handoff.');
    if (operatorRowsByRequirement.has('Corepack pnpm resolver')) {
      assert(operatorRowsByRequirement.get('Corepack pnpm resolver')?.execution_gate === 'toolchain_probe_first', 'Corepack handoff row must require toolchain_probe_first.');
    }
    if (operatorRowsByRequirement.has('Git LFS push-path proof')) {
      assert(operatorRowsByRequirement.get('Git LFS push-path proof')?.execution_gate === 'toolchain_probe_first', 'Git LFS handoff row must require toolchain_probe_first.');
    }
    assert(operatorRowsByRequirement.get('Release-readiness execution')?.execution_gate === 'after_corepack_git_lfs_and_clean_source', 'Release-readiness handoff row must wait for Corepack, Git LFS, and clean source.');
    if (operatorRowsByRequirement.has('Clean source provenance')) {
      assert(operatorRowsByRequirement.get('Clean source provenance')?.execution_gate === 'owner_source_decision_first', 'Clean source provenance handoff row must require owner source decision first.');
    }
    assert(operatorRowsByRequirement.get('Explicit owner production approval')?.execution_gate === 'manual_stop_after_all_prerequisites', 'Owner approval handoff row must remain manual stop after prerequisites.');
    if (operatorRowsByRequirement.has('Corepack pnpm resolver')) {
      assert(/planning evidence only|does not install tools|request production approval|hosted\/live parity/i.test(operatorRowsByRequirement.get('Corepack pnpm resolver')?.proof_boundary ?? ''), 'Corepack operator handoff row must preserve planning-only boundaries.');
    }
    assert(/Do not execute or mark this row ready from the handoff packet itself/i.test(operatorRowsByRequirement.get('Release-readiness execution')?.stop_gate ?? ''), 'Release-readiness operator handoff row must reject execution from the packet.');
    assert(payload.source_provenance?.resolution_queue, 'Focused report JSON must include source provenance resolution queue.');
    assert(/report:source-provenance-readiness/.test(releaseItemsByRequirement.get('Clean source provenance')?.proof_command ?? '') && /check:source-provenance-report/.test(releaseItemsByRequirement.get('Clean source provenance')?.proof_command ?? ''), 'Clean source provenance release preflight row must point to the focused source provenance report/check.');
    assert(/report:source-provenance-readiness/.test(clearanceRowsByRequirement.get('Clean source provenance')?.proof_command ?? '') && /check:source-provenance-report/.test(clearanceRowsByRequirement.get('Clean source provenance')?.proof_command ?? ''), 'Clean source provenance clearance row must point to the focused source provenance report/check.');
    assert(/report:source-provenance-readiness/.test(remediationRowsByRequirement.get('Clean source provenance')?.proof_command ?? '') && /check:source-provenance-report/.test(remediationRowsByRequirement.get('Clean source provenance')?.proof_command ?? ''), 'Clean source provenance remediation row must point to the focused source provenance report/check.');
    assert(payload.production_approval_request_packet?.proof_type === 'production_approval_request_packet', 'Focused report JSON must include production approval request packet.');
    assert(payload.public_status_handles?.release_toolchain_approval_deficit_ledger?.id === 'release_toolchain_approval_deficit_ledger', 'Focused JSON must include the release deficit ledger public handle.');
    assert(payload.public_status_handles?.release_preflight_remediation_queue?.id === 'release_preflight_remediation_queue', 'Focused JSON must include the release remediation queue public handle.');
    assert(payload.public_status_handles?.release_operator_handoff_packet?.id === 'release_operator_handoff_packet', 'Focused JSON must include the release operator handoff public handle.');
    assert(payload.public_status_handles?.release_preflight_clearance_matrix?.id === 'release_preflight_clearance_matrix', 'Focused JSON must include the release clearance matrix public handle.');
    assert(payload.public_status_handles?.release_toolchain_probe_ledger?.id === 'release_toolchain_probe_ledger', 'Focused JSON must include the release toolchain probe public handle.');
    assert(/report:release-preflight/.test(payload.public_status_handles?.release_operator_handoff_packet?.command ?? '') && /check:release-preflight-report/.test(payload.public_status_handles?.release_operator_handoff_packet?.command ?? ''), 'Release operator handoff public handle must point at the focused release report/check.');
    assert(/release_preflight\.operator_handoff_packet/.test(payload.public_status_handles?.release_operator_handoff_packet?.sourceManifestPath ?? ''), 'Release operator handoff public handle must point at release_preflight.operator_handoff_packet.');
    assert(Array.isArray(payload.public_status_handles?.release_toolchain_probe_ledger?.sourceProofTypes) && payload.public_status_handles.release_toolchain_probe_ledger.sourceProofTypes.includes('corepack_pnpm_toolchain_probe'), 'Release toolchain probe public handle must expose Corepack probe lineage.');
    assert(payload.package_script_handles?.report_release_preflight === 'corepack pnpm run report:release-preflight', 'Focused JSON must include the release preflight report package handle.');
    assert(payload.package_script_handles?.check_release_preflight_report === 'corepack pnpm run check:release-preflight-report', 'Focused JSON must include the release preflight checker package handle.');
    assert(payload.package_script_handles?.check_release_readiness === 'corepack pnpm run check:release-readiness', 'Focused JSON must include the guarded release-readiness package handle.');
    assert(payload.package_script_handles?.check_corepack_toolchain === 'corepack pnpm run check:corepack-toolchain', 'Focused JSON must include the Corepack toolchain package handle.');
    assert(/does not install tools|run release-readiness|clear source provenance|push|deploy/i.test(payload.proof_boundary ?? ''), 'Focused report proof boundary must not imply release execution.');
    assert(/Do not treat this focused report|release-readiness|production approval|hosted\/live parity/i.test(payload.stop_gate ?? ''), 'Focused report stop gate must reject readiness claims from the report itself.');
  }
}

if (failures.length > 0) {
  console.error('Release preflight readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Release preflight readiness report check passed: focused release preflight status, toolchain probe ledger, release deficits, clearance matrix, remediation queue, operator handoff packet, source provenance, production approval packet, and proof boundaries are consistent.');
