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
  corepack pnpm run check:production-approval-report

Options:
  --skip-probes    Validate the focused report contract without running local Corepack or Git LFS probes.
`);
}

function runReport(extraArgs = []) {
  const commandArgs = ['scripts/report-production-approval-readiness.mjs', ...extraArgs];
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
    failures.push(`report-production-approval-readiness exited ${markdown.status}.`);
    if (markdown.error.trim()) failures.push(markdown.error.trim());
    if (markdown.stderr.trim()) failures.push(markdown.stderr.trim());
    if (markdown.stdout.trim()) failures.push(markdown.stdout.trim().slice(0, 4000));
  }

  const jsonReport = runReport(['--json']);
  let payload = null;
  if (jsonReport.status !== 0) {
    failures.push(`report-production-approval-readiness --json exited ${jsonReport.status}.`);
    if (jsonReport.error.trim()) failures.push(jsonReport.error.trim());
    if (jsonReport.stderr.trim()) failures.push(jsonReport.stderr.trim());
  } else {
    try {
      payload = JSON.parse(jsonReport.stdout);
    } catch (error) {
      failures.push(`Could not parse focused production approval JSON: ${error.message}`);
    }
  }

  if (markdown.status === 0) {
    const stdout = markdown.stdout;
    assertContains(stdout, '# CEIP Production Approval Readiness Report', 'Report must include the focused production approval title.');
    assertContains(stdout, 'Production approval status:', 'Report must include production approval status.');
    assertContains(stdout, 'Explicit owner approval:', 'Report must include explicit owner approval status.');
    assertContains(stdout, 'Request packet status:', 'Report must include request packet status.');
    assertContains(stdout, 'Request eligible:', 'Report must include request eligibility.');
    assertContains(stdout, '## Decision Boundary', 'Report must include a decision-boundary section.');
    assertContains(stdout, 'does not grant owner approval, request owner approval, run deploys', 'Report must preserve no-approval and no-deploy boundaries.');
    assertContains(stdout, '## Production Approval Prerequisite Queue', 'Report must include the prerequisite queue.');
    assertContains(stdout, '| Clean source provenance |', 'Report must include the clean source provenance prerequisite.');
    assertContains(stdout, '| Launch evidence validation |', 'Report must include the launch evidence validation prerequisite.');
    assertContains(stdout, '| Corepack release-readiness |', 'Report must include the Corepack release-readiness prerequisite.');
    assertContains(stdout, '| Canonical branch review |', 'Report must include the canonical branch review prerequisite.');
    assertContains(stdout, '| Supabase advisor clearance |', 'Report must include the Supabase advisor prerequisite.');
    assertContains(stdout, '| Buyer evidence hard gate |', 'Report must include the buyer evidence prerequisite.');
    assertContains(stdout, '| Explicit owner production approval |', 'Report must include the explicit owner approval prerequisite.');
    assertContains(stdout, '| Post-deploy live proof boundary |', 'Report must include the post-deploy live proof prerequisite.');
    assertContains(stdout, '## Production Approval Request Packet', 'Report must include the request packet.');
    assertContains(stdout, 'pre_request', 'Report must include pre-request request phases.');
    assertContains(stdout, 'owner_decision', 'Report must include the owner decision phase.');
    assertContains(stdout, 'post_deploy_boundary', 'Report must include the post-deploy boundary phase.');
    assertContains(stdout, '## Launch Action Production Approval Row', 'Report must include the launch action production approval row.');
    assertContains(stdout, '## Release Preflight Owner Approval Row', 'Report must include the release preflight owner approval row.');
    assertContains(stdout, 'corepack pnpm run check:production-deploy-request', 'Report must include the production deploy request command.');
    assertContains(stdout, 'corepack pnpm run report:production-approval-packet', 'Report must include the production approval packet command.');
  }

  if (payload) {
    const productionApproval = payload.production_approval ?? {};
    const prerequisiteQueue = productionApproval.prerequisite_queue ?? {};
    const requestPacket = productionApproval.request_packet ?? {};
    const prerequisiteItems = prerequisiteQueue.items ?? [];
    const requestItems = requestPacket.items ?? [];
    const prerequisites = prerequisiteItems.map((item) => item.prerequisite);
    const prerequisiteRowsByName = new Map(prerequisiteItems.map((item) => [item.prerequisite, item]));
    const requestRowsByPrerequisite = new Map(requestItems.map((item) => [item.prerequisite, item]));

    assert(payload.schema_version === 1, 'Focused production approval JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused production approval JSON must preserve the blocked launch decision.');
    assert(productionApproval.explicit_owner_approval === false, 'Focused report must not imply explicit owner approval is granted.');
    assert(productionApproval.status === 'blocked', 'Production approval status must remain blocked before prerequisites clear.');
    assert(prerequisiteQueue.status === 'blocked', 'Production approval prerequisite queue must remain blocked before current evidence clears.');
    assert(prerequisiteQueue.item_count === 8, 'Production approval prerequisite queue must include eight rows.');
    assert(prerequisites.join(',') === 'Clean source provenance,Launch evidence validation,Corepack release-readiness,Canonical branch review,Supabase advisor clearance,Buyer evidence hard gate,Explicit owner production approval,Post-deploy live proof boundary', 'Production approval prerequisite order must remain stable.');
    assert(requestPacket.proof_type === 'production_approval_request_packet', 'Request packet must preserve its proof type.');
    assert(requestPacket.status === 'blocked', 'Request packet must remain blocked while pre-request rows are blocked.');
    assert(requestPacket.request_eligible === false, 'Request packet must remain ineligible while pre-request blockers remain.');
    assert(requestPacket.item_count === prerequisiteQueue.item_count, 'Request packet item count must match prerequisite rows.');
    assert(requestItems.length === prerequisiteItems.length, 'Request packet items must mirror prerequisite rows.');
    assert(requestRowsByPrerequisite.get('Clean source provenance')?.request_phase === 'pre_request', 'Clean source provenance must be a pre-request row.');
    assert(requestRowsByPrerequisite.get('Launch evidence validation')?.request_phase === 'pre_request', 'Launch evidence validation must be a pre-request row.');
    assert(requestRowsByPrerequisite.get('Corepack release-readiness')?.request_phase === 'pre_request', 'Corepack release-readiness must be a pre-request row.');
    assert(
      /report:release-preflight/.test(prerequisiteRowsByName.get('Corepack release-readiness')?.proof_command ?? '')
        && /check:release-preflight-report/.test(prerequisiteRowsByName.get('Corepack release-readiness')?.proof_command ?? '')
        && /check:release-readiness/.test(prerequisiteRowsByName.get('Corepack release-readiness')?.proof_command ?? ''),
      'Corepack release-readiness prerequisite must point to focused release-preflight proof before guarded release-readiness.',
    );
    assert(
      /report:release-preflight/.test(requestRowsByPrerequisite.get('Corepack release-readiness')?.proof_command ?? '')
        && /check:release-preflight-report/.test(requestRowsByPrerequisite.get('Corepack release-readiness')?.proof_command ?? '')
        && /check:release-readiness/.test(requestRowsByPrerequisite.get('Corepack release-readiness')?.proof_command ?? ''),
      'Corepack release-readiness request row must point to focused release-preflight proof before guarded release-readiness.',
    );
    assert(requestRowsByPrerequisite.get('Canonical branch review')?.request_phase === 'pre_request', 'Canonical branch review must be a pre-request row.');
    assert(
      /report:branch-review-readiness/.test(prerequisiteRowsByName.get('Canonical branch review')?.proof_command ?? '')
        && /check:branch-review-report/.test(prerequisiteRowsByName.get('Canonical branch review')?.proof_command ?? ''),
      'Canonical branch review prerequisite must point to the focused branch review report/check.',
    );
    assert(
      /report:branch-review-readiness/.test(requestRowsByPrerequisite.get('Canonical branch review')?.proof_command ?? '')
        && /check:branch-review-report/.test(requestRowsByPrerequisite.get('Canonical branch review')?.proof_command ?? ''),
      'Canonical branch review request row must point to the focused branch review report/check.',
    );
    assert(requestRowsByPrerequisite.get('Supabase advisor clearance')?.request_phase === 'pre_request', 'Supabase advisor clearance must be a pre-request row.');
    assert(requestRowsByPrerequisite.get('Buyer evidence hard gate')?.request_phase === 'pre_request', 'Buyer evidence hard gate must be a pre-request row.');
    assert(requestRowsByPrerequisite.get('Explicit owner production approval')?.request_phase === 'owner_decision', 'Explicit owner approval must be an owner-decision row.');
    assert(requestRowsByPrerequisite.get('Post-deploy live proof boundary')?.request_phase === 'post_deploy_boundary', 'Post-deploy live proof must be a post-deploy boundary row.');
    assert(requestRowsByPrerequisite.get('Explicit owner production approval')?.blocks_request === false, 'Owner decision row must not count as a pre-request blocker.');
    assert(requestRowsByPrerequisite.get('Post-deploy live proof boundary')?.blocks_request === false, 'Post-deploy boundary row must not count as a pre-request blocker.');
    assert(requestPacket.request_blocking_count >= 1, 'Request packet must keep pre-request blockers visible.');
    assert(payload.launch_action_production_approval_row?.phase === 'production_approval', 'Focused report JSON must include the launch action production approval row.');
    assert(payload.release_preflight_owner_approval_row?.requirement === 'Explicit owner production approval', 'Focused report JSON must include the release preflight owner approval row.');
    assert(payload.package_script_handles?.check_production_deploy_request === 'corepack pnpm run check:production-deploy-request', 'Focused report must expose the production deploy request command handle.');
    assert(/does not grant owner approval|request owner approval|run deploys|clear source provenance|prove hosted\/live parity/i.test(payload.proof_boundary ?? ''), 'Focused report proof boundary must not imply approval, deploy, source clearance, or live parity.');
    assert(/Do not treat this focused report|production approval|deploy authorization|commercial-ready status/i.test(payload.stop_gate ?? ''), 'Focused report stop gate must reject approval and readiness claims from the report itself.');
  }
}

if (failures.length > 0) {
  console.error('Production approval readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Production approval readiness report check passed: focused prerequisite queue, request packet, approval rows, command handles, and no-approval boundaries are consistent.');
