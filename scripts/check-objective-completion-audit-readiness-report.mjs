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
  corepack pnpm run check:objective-completion-audit-report

Options:
  --skip-probes    Validate the focused objective completion audit report without running local Corepack, Git LFS, branch, or buyer probes.
`);
}

function runReport(extraArgs = []) {
  const commandArgs = ['scripts/report-objective-completion-audit-readiness.mjs', ...extraArgs];
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
    failures.push(`report-objective-completion-audit-readiness exited ${markdown.status}.`);
    if (markdown.error.trim()) failures.push(markdown.error.trim());
    if (markdown.stderr.trim()) failures.push(markdown.stderr.trim());
    if (markdown.stdout.trim()) failures.push(markdown.stdout.trim().slice(0, 4000));
  }

  const jsonReport = runReport(['--json']);
  let payload = null;
  if (jsonReport.status !== 0) {
    failures.push(`report-objective-completion-audit-readiness --json exited ${jsonReport.status}.`);
    if (jsonReport.error.trim()) failures.push(jsonReport.error.trim());
    if (jsonReport.stderr.trim()) failures.push(jsonReport.stderr.trim());
  } else {
    try {
      payload = JSON.parse(jsonReport.stdout);
    } catch (error) {
      failures.push(`Could not parse focused objective completion audit JSON: ${error.message}`);
    }
  }

  if (markdown.status === 0) {
    const stdout = markdown.stdout;
    assertContains(stdout, '# CEIP Objective Completion Audit Readiness Report', 'Report must include the focused objective completion audit title.');
    assertContains(stdout, 'Objective completion audit readiness status:', 'Report must include objective completion audit status.');
    assertContains(stdout, 'Completion audit proof type:', 'Report must include the completion audit proof type.');
    assertContains(stdout, 'Goal-completion blocker rows:', 'Report must include goal-completion blocker counts.');
    assertContains(stdout, '## Decision Boundary', 'Report must include a decision-boundary section.');
    assertContains(stdout, 'does not mark the launch goal complete', 'Report must reject completion from focused audit evidence.');
    assert(/does not .*clear P0\/P1 operational blockers|collect buyer evidence|contact buyers|authorize Supabase|approve branches|resolve source provenance|request owner approval|deploy|hosted\/live parity|production approval|buyer acceptance|commercial launch readiness/i.test(stdout), 'Report must preserve no-clearance, no-external-action, no-approval, no-deploy, no-live-parity, and no-readiness boundaries.');
    assertContains(stdout, '## Completion Audit Summary', 'Report must include the completion audit summary.');
    assertContains(stdout, 'completion_audit_current_state', 'Report must classify the audit as current-state completion evidence.');
    assertContains(stdout, 'Objective completion audit:', 'Report must include manifest completion audit evidence counts.');
    assertContains(stdout, '## Deliverable Evidence Rows', 'Report must include deliverable evidence rows.');
    assertContains(stdout, 'Launch score table', 'Report must include the launch score deliverable row.');
    assertContains(stdout, 'Structured evidence manifest', 'Report must include the structured evidence manifest deliverable row.');
    assertContains(stdout, '## External Gate Rows', 'Report must include external gate rows.');
    assertContains(stdout, '| 1 | Buyer evidence hard gate | external_gate | no | buyer_evidence_hard_gate |', 'Report must keep buyer evidence in non-blocking external gate rows.');
    assertContains(stdout, '## Goal-Blocking Rows', 'Report must include goal-blocking rows.');
    assertContains(stdout, 'Source provenance release gate', 'Report must include source provenance blockers.');
    assertContains(stdout, 'Branch canonical review gate', 'Report must include branch review blockers.');
    assertContains(stdout, 'Supabase advisor clearance gate', 'Report must include Supabase advisor blockers.');
    assertContains(stdout, 'Release toolchain approval gate', 'Report must include release toolchain blockers.');
    assertContains(stdout, 'Production approval and live proof gate', 'Report must include production/live proof blockers.');
    assertContains(stdout, 'corepack pnpm run report:buyer-evidence-gate-readiness && corepack pnpm run check:buyer-evidence-gate-report', 'Report must keep buyer evidence next proof on the focused buyer gate handle.');
    assertContains(stdout, 'corepack pnpm run report:production-approval-readiness && corepack pnpm run check:production-approval-report && corepack pnpm run report:post-deploy-live-proof-readiness && corepack pnpm run check:post-deploy-live-proof-report', 'Report must keep production/live next proof on focused approval and live-proof handles.');
    assertContains(stdout, '## Public Release Status Handle', 'Report must include the public status handle.');
    assertContains(stdout, 'objective_completion_audit', 'Report must expose the public objective completion audit handle.');
    assertContains(stdout, 'Source Manifest Path', 'Report must label public objective completion source manifest lineage.');
    assertContains(stdout, '| objective_completion_audit | external_gate | completion_audit | completion_audit_current_state |', 'Report must expose the objective completion public handle source manifest path and proof type.');
    assertContains(stdout, '## Package Script Handles', 'Report must include package script handles.');
    assertContains(stdout, 'corepack pnpm run report:objective-completion-audit-readiness', 'Report must include the focused objective completion report command.');
    assertContains(stdout, 'corepack pnpm run check:objective-completion-audit-report', 'Report must include the focused objective completion checker command.');
  }

  if (payload) {
    const audit = payload.objective_completion_audit ?? {};
    assert(payload.schema_version === 1, 'Focused objective completion audit JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused objective completion audit JSON must preserve the blocked launch decision.');
    assert(audit.status === 'blocked', 'Focused objective completion audit status must remain blocked while launch blockers remain open.');
    assert(audit.proof_type === 'completion_audit_current_state', 'Focused JSON must include the completion audit current-state proof type.');
    const completionItems = [
      ...(Array.isArray(payload.deliverable_items) ? payload.deliverable_items : []),
      ...(Array.isArray(payload.external_gate_items) ? payload.external_gate_items : []),
      ...(Array.isArray(payload.blocker_items) ? payload.blocker_items : []),
    ];
    const completionStatusCounts = completionItems.reduce((counts, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    }, {});
    assert(audit.total_count === completionItems.length, 'Focused objective completion audit total_count must match audit row count.');
    assert(audit.total_count >= 15, 'Focused objective completion audit must include every required deliverable and launch gate.');
    assert(audit.completed_count === (completionStatusCounts.present ?? 0), 'Focused objective completion audit completed_count must match present rows.');
    assert(audit.completed_count >= 8, 'Focused objective completion audit must count present deliverables.');
    assert(audit.blocked_count === (completionStatusCounts.blocked ?? 0), 'Focused objective completion audit blocked_count must match blocked rows.');
    assert(audit.blocked_count >= 3, 'Focused objective completion audit must count unresolved blocker rows.');
    assert(audit.external_gate_count === (completionStatusCounts.external_gate ?? 0), 'Focused objective completion audit external_gate_count must match external gate rows.');
    assert(audit.external_gate_count >= 1, 'Focused objective completion audit must count external gate rows.');
    assert(audit.manual_stop_count === (completionStatusCounts.manual_stop ?? 0), 'Focused objective completion audit manual_stop_count must match manual-stop rows.');
    assert(audit.manual_stop_count >= 1, 'Focused objective completion audit must count production/live proof manual-stop rows.');
    assert(audit.goal_completion_blocked_count === audit.blocked_count + audit.manual_stop_count, 'Focused objective completion audit goal blockers must equal blocked plus manual-stop rows.');
    assert(Array.isArray(payload.deliverable_items) && payload.deliverable_items.length >= 8, 'Focused JSON must include deliverable rows.');
    assert(Array.isArray(payload.external_gate_items) && payload.external_gate_items.length >= 1, 'Focused JSON must include external gate rows.');
    assert(payload.external_gate_items.some((item) => item.requirement === 'Buyer evidence hard gate' && item.status === 'external_gate' && item.blocks_goal_completion === false), 'Focused JSON must include buyer evidence as a non-blocking external gate.');
    assert(Array.isArray(payload.blocker_items) && payload.blocker_items.length >= 4, 'Focused JSON must include goal-blocking rows.');
    const blockerNames = new Set(payload.blocker_items.map((item) => item.requirement));
    for (const requirement of [
      'Branch canonical review gate',
      'Supabase advisor clearance gate',
      'Release toolchain approval gate',
      'Production approval and live proof gate',
    ]) {
      assert(blockerNames.has(requirement), `Focused JSON must include blocker row: ${requirement}.`);
    }
    assert(payload.public_status_handle?.id === 'objective_completion_audit', 'Focused JSON must include the public objective completion audit handle.');
    assert(payload.public_status_handle?.sourceManifestPath === 'completion_audit', 'Focused JSON public objective completion audit handle must expose sourceManifestPath=completion_audit.');
    assert(payload.public_status_handle?.sourceProofType === 'completion_audit_current_state', 'Focused JSON public objective completion audit handle must expose sourceProofType=completion_audit_current_state.');
    assert(/report:objective-completion-audit-readiness/.test(payload.package_script_handles?.report_objective_completion_audit_readiness ?? ''), 'Focused JSON must expose the objective completion audit report script handle.');
    assert(/check:objective-completion-audit-report/.test(payload.package_script_handles?.check_objective_completion_audit_report ?? ''), 'Focused JSON must expose the objective completion audit checker script handle.');
    assert(/does not mark the launch goal complete|clear P0\/P1 operational blockers|collect buyer evidence|contact buyers|authorize Supabase|approve branches|resolve source provenance|request owner approval|deploy|hosted\/live parity|production approval|buyer acceptance|commercial launch readiness/i.test(payload.proof_boundary ?? ''), 'Focused proof boundary must preserve no-completion, no-clearance, no-external-action, no-deploy, no-live-parity, and no-readiness semantics.');
    assert(/Do not treat this focused objective completion audit report|external-gate row|production approval|buyer acceptance|release readiness|source readiness|branch approval|Supabase advisor clearance|deployment approval|hosted\/live parity|commercial-ready status|launch-goal completion/i.test(payload.stop_gate ?? ''), 'Focused stop gate must reject approval, buyer, release, source, branch, Supabase, deploy, live-parity, ready, and completion claims.');
  }
}

if (failures.length > 0) {
  console.error('Objective completion audit readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Objective completion audit readiness report check passed: deliverables, blockers, public handle, package handles, and no-completion boundaries are consistent.');
