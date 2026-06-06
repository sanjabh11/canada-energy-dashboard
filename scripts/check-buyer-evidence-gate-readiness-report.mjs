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
  corepack pnpm run check:buyer-evidence-gate-report

Options:
  --skip-probes    Validate the focused report contract without running local Corepack, Git LFS, buyer, branch, or Supabase probes.
`);
}

function runReport(extraArgs = []) {
  const commandArgs = ['scripts/report-buyer-evidence-gate-readiness.mjs', ...extraArgs];
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
    failures.push(`report-buyer-evidence-gate-readiness exited ${markdown.status}.`);
    if (markdown.error.trim()) failures.push(markdown.error.trim());
    if (markdown.stderr.trim()) failures.push(markdown.stderr.trim());
    if (markdown.stdout.trim()) failures.push(markdown.stdout.trim().slice(0, 4000));
  }

  const jsonReport = runReport(['--json']);
  let payload = null;
  if (jsonReport.status !== 0) {
    failures.push(`report-buyer-evidence-gate-readiness --json exited ${jsonReport.status}.`);
    if (jsonReport.error.trim()) failures.push(jsonReport.error.trim());
    if (jsonReport.stderr.trim()) failures.push(jsonReport.stderr.trim());
  } else {
    try {
      payload = JSON.parse(jsonReport.stdout);
    } catch (error) {
      failures.push(`Could not parse focused buyer evidence gate JSON: ${error.message}`);
    }
  }

  if (markdown.status === 0) {
    const stdout = markdown.stdout;
    assertContains(stdout, '# CEIP Buyer Evidence Hard-Gate Readiness Report', 'Report must include the focused buyer evidence title.');
    assertContains(stdout, 'Buyer evidence status:', 'Report must include buyer evidence status.');
    assertContains(stdout, 'Phase F 95% gate:', 'Report must include Phase F gate status.');
    assertContains(stdout, '## Decision Boundary', 'Report must include a decision-boundary section.');
    assertContains(stdout, 'does not contact buyers, send outreach, create accepted evidence, move confidence', 'Report must preserve no-buyer-contact and no-evidence-creation boundaries.');
    assertContains(stdout, '## Buyer Evidence Review', 'Report must include buyer evidence review evidence.');
    assertContains(stdout, '## Buyer Hard-Gate Deficit Ledger', 'Report must include the buyer hard-gate deficit ledger.');
    assertContains(stdout, '| Utility forecast lane |', 'Report must include the utility forecast hard-gate row.');
    assertContains(stdout, '| TIER or credit lane |', 'Report must include the TIER or credit hard-gate row.');
    assertContains(stdout, '| Billing or security lane |', 'Report must include the billing or security hard-gate row.');
    assertContains(stdout, '| Retained-artifact 95% validation |', 'Report must include the retained-artifact validation hard-gate row.');
    assertContains(stdout, '## Buyer Evidence Acquisition Matrix', 'Report must include the buyer acquisition matrix.');
    assertContains(stdout, '| Outreach response log intake |', 'Report must include the outreach intake acquisition row.');
    assertContains(stdout, '| Production pilot evidence register |', 'Report must include the production register acquisition row.');
    assertContains(stdout, '## Buyer Evidence Remediation Queue', 'Report must include the buyer remediation queue.');
    assertContains(stdout, 'Buyer Accepted Evidence Required', 'Report must expose accepted-buyer-evidence requirements.');
    assertContains(stdout, 'Retained Artifact Required', 'Report must expose retained-artifact requirements.');
    assertContains(stdout, '## Launch Action Buyer Row', 'Report must include the launch action buyer row.');
    assertContains(stdout, '## Production Approval Buyer Prerequisite', 'Report must include the production approval buyer prerequisite.');
    assertContains(stdout, '## Production Approval Request Buyer Row', 'Report must include the production approval request buyer row.');
    assert(/does not[\s\S]{0,220}grant production approval/i.test(stdout), 'Report must preserve production approval boundary text.');
  }

  if (payload) {
    const buyer = payload.buyer_evidence ?? {};
    const deficits = buyer.hard_gate_deficits ?? {};
    const acquisitionMatrix = buyer.acquisition_matrix ?? {};
    const remediationQueue = deficits.remediation_queue ?? {};
    const requirements = (deficits.items ?? []).map((item) => item.requirement);
    const hardGateSkipped = deficits.status === 'skipped';

    assert(payload.schema_version === 1, 'Focused buyer evidence gate JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused buyer evidence gate JSON must preserve the blocked launch decision.');
    assert(typeof buyer.status === 'string' && buyer.status.length > 0, 'buyer_evidence.status must be set.');
    assert(typeof buyer.phase_f_gate === 'string' && buyer.phase_f_gate.length > 0, 'buyer_evidence.phase_f_gate must be set.');
    if (hardGateSkipped) {
      assert(remediationQueue.status === 'skipped', 'Skipped buyer hard-gate deficits must keep remediation queue skipped.');
    } else {
      assert(requirements.join(',') === 'Utility forecast lane,TIER or credit lane,Billing or security lane,Distinct accepted proof packs,Accepted confidence_delta,Retained SHA-256 references,Buyer data coverage,Artifact turnaround,Strong commercial signal,Retained-artifact 95% validation', 'hard_gate_deficits.items must preserve buyer hard-gate requirement order.');
      assert(deficits.total_count === 10, 'hard_gate_deficits.total_count must cover the ten buyer hard-gate rows.');
    }
    assert(Array.isArray(acquisitionMatrix.rows), 'acquisition_matrix.rows must be a list.');
    assert(acquisitionMatrix.row_count === 10, 'acquisition_matrix.row_count must cover the ten buyer acquisition rows.');
    assert(acquisitionMatrix.rows.some((item) => item.lane === 'Outreach response log intake'), 'acquisition matrix must include outreach response log intake.');
    assert(acquisitionMatrix.rows.some((item) => item.lane === 'Production pilot evidence register'), 'acquisition matrix must include production pilot evidence register.');
    assert(Array.isArray(remediationQueue.items), 'remediation_queue.items must be a list.');
    if (!hardGateSkipped) {
      assert(remediationQueue.items.some((item) => item.buyer_accepted_evidence_required === true), 'remediation queue must identify accepted-buyer-evidence requirements.');
      assert(remediationQueue.items.some((item) => item.retained_artifact_required === true), 'remediation queue must identify retained-artifact requirements.');
    }
    assert(payload.launch_action_buyer_row?.phase === 'buyer_evidence', 'Focused JSON must include the launch action buyer row.');
    assert(payload.production_approval_buyer_prerequisite?.prerequisite === 'Buyer evidence hard gate', 'Focused JSON must include the production approval buyer prerequisite.');
    assert(payload.production_approval_request_buyer_row?.prerequisite === 'Buyer evidence hard gate', 'Focused JSON must include the production approval request buyer row.');
    assert(
      /report:buyer-evidence-gate-readiness/.test(payload.launch_action_buyer_row?.proof_command ?? '')
        && /check:buyer-evidence-gate-report/.test(payload.launch_action_buyer_row?.proof_command ?? ''),
      'Launch action buyer row must point to the focused buyer evidence gate report/check.',
    );
    assert(
      /report:buyer-evidence-gate-readiness/.test(payload.production_approval_buyer_prerequisite?.proof_command ?? '')
        && /check:buyer-evidence-gate-report/.test(payload.production_approval_buyer_prerequisite?.proof_command ?? ''),
      'Production approval buyer prerequisite must point to the focused buyer evidence gate report/check.',
    );
    assert(
      /report:buyer-evidence-gate-readiness/.test(payload.production_approval_request_buyer_row?.proof_command ?? '')
        && /check:buyer-evidence-gate-report/.test(payload.production_approval_request_buyer_row?.proof_command ?? ''),
      'Production approval buyer request row must point to the focused buyer evidence gate report/check.',
    );
    assert(/does not contact buyers|create accepted evidence|move confidence|attach retained artifacts|validate 95|grant production approval/i.test(payload.proof_boundary ?? ''), 'Focused report proof boundary must preserve buyer non-execution and no-approval semantics.');
    assert(/Do not treat this focused report|buyer-proven evidence|Phase F 95% validation|commercial-ready status|hosted\/live parity/i.test(payload.stop_gate ?? ''), 'Focused report stop gate must reject buyer-proof and readiness claims from this report itself.');
    for (const [index, item] of (deficits.items ?? []).entries()) {
      assert(typeof item.requirement === 'string' && item.requirement.length > 0, `hard_gate_deficits.items[${index}].requirement must be set.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `hard_gate_deficits.items[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && item.stop_gate.length > 0, `hard_gate_deficits.items[${index}].stop_gate must be set.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Buyer evidence gate readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Buyer evidence gate readiness report check passed: focused buyer status, hard-gate deficits, acquisition matrix, remediation queue, production approval rows, and no-buyer-proof boundaries are consistent.');
