import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const reportScriptPath = path.join(process.cwd(), 'scripts/report-buyer-evidence-gate-readiness.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-buyer-evidence-gate-readiness-report.mjs');
const timeout = 180_000;
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-buyer-evidence-gate-'));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('buyer evidence gate readiness report', () => {
  it('renders a focused buyer-evidence hard-gate report from the launch manifest', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'buyer-evidence-gate.md');
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('# CEIP Buyer Evidence Hard-Gate Readiness Report');
    expect(stdout).toContain('Buyer evidence status:');
    expect(stdout).toContain('Phase F 95% gate:');
    expect(stdout).toContain('Decision Boundary');
    expect(stdout).toContain('does not contact buyers, send outreach, create accepted evidence, move confidence');
    expect(stdout).toContain('Buyer Hard-Gate Deficit Ledger');
    expect(stdout).toContain('| Utility forecast lane |');
    expect(stdout).toContain('| TIER or credit lane |');
    expect(stdout).toContain('| Billing or security lane |');
    expect(stdout).toContain('| Retained-artifact 95% validation |');
    expect(stdout).toContain('Buyer Evidence Acquisition Matrix');
    expect(stdout).toContain('| Outreach response log intake |');
    expect(stdout).toContain('| Production pilot evidence register |');
    expect(stdout).toContain('Minimum evidence packet:');
    expect(stdout).toContain('Minimum Buyer Evidence Packet Handoff');
    expect(stdout).toContain('Blocks 95 Gate');
    expect(stdout).toContain('Buyer Evidence Remediation Queue');
    expect(stdout).toContain('Buyer Accepted Evidence Required');
    expect(stdout).toContain('Retained Artifact Required');
    expect(stdout).toContain('Launch Action Buyer Row');
    expect(stdout).toContain('Production Approval Buyer Prerequisite');
    expect(stdout).toContain('Production Approval Request Buyer Row');
    expect(stdout).toContain('Public Release Status Handles');
    expect(stdout).toContain('buyer_evidence_gate');
    expect(stdout).toContain('buyer_evidence_hard_gate_deficit_ledger');
    expect(stdout).toContain('buyer_evidence_acquisition_matrix');
    expect(stdout).toContain('buyer_evidence_minimum_packet_handoff');
    expect(stdout).toContain('buyer_evidence_remediation_queue');
    expect(stdout).toContain('Package Script Handles');
    expect(stdout).toContain('corepack pnpm run report:buyer-evidence-gate-readiness');
    expect(stdout).toContain('corepack pnpm run check:buyer-evidence-gate-report');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  });

  it('emits a focused JSON payload with buyer deficits and no-proof boundaries', () => {
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);

    expect(payload.schema_version).toBe(1);
    expect(payload.launch_decision).toBe('blocked');
    expect(payload.buyer_evidence.status).toBeTruthy();
    expect(payload.buyer_evidence.phase_f_gate).toBeTruthy();
    expect(payload.buyer_evidence.hard_gate_deficits.items.map((item: { requirement: string }) => item.requirement)).toEqual([
      'Utility forecast lane',
      'TIER or credit lane',
      'Billing or security lane',
      'Distinct accepted proof packs',
      'Accepted confidence_delta',
      'Retained SHA-256 references',
      'Buyer data coverage',
      'Artifact turnaround',
      'Strong commercial signal',
      'Retained-artifact 95% validation',
    ]);
    expect(payload.buyer_evidence.hard_gate_deficits.total_count).toBe(10);
    expect(payload.buyer_evidence.acquisition_matrix.row_count).toBe(10);
    expect(payload.buyer_evidence.acquisition_matrix.rows.some(
      (item: { lane: string }) => item.lane === 'Outreach response log intake',
    )).toBe(true);
    expect(payload.buyer_evidence.acquisition_matrix.rows.some(
      (item: { lane: string }) => item.lane === 'Production pilot evidence register',
    )).toBe(true);
    expect(payload.minimum_evidence_packet.proof_type).toBe('buyer_evidence_minimum_packet_handoff');
    expect(payload.minimum_evidence_packet.source).toBe('buyer_evidence.acquisition_matrix.rows');
    expect(payload.minimum_evidence_packet.item_count).toBe(payload.buyer_evidence.acquisition_matrix.row_count);
    expect(payload.minimum_evidence_packet.blocked_count).toBe(payload.buyer_evidence.acquisition_matrix.blocked_count);
    expect(payload.minimum_evidence_packet.items.some(
      (item: { lane: string; validation_command: string }) => item.lane === 'Outreach response log intake' && item.validation_command.includes('plan:outreach-intake'),
    )).toBe(true);
    expect(payload.minimum_evidence_packet.items.some(
      (item: { lane: string; validation_command: string; blocks_95_gate: boolean }) => item.lane === 'Retained-artifact 95% validation'
        && item.validation_command.includes('validate:pilot-evidence')
        && item.blocks_95_gate === true,
    )).toBe(true);
    expect(payload.minimum_evidence_packet.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|validate 95|grant production approval/i);
    expect(payload.minimum_evidence_packet.stop_gate).toMatch(/Do not mark buyer evidence ready|validate:pilot-evidence --require-95/i);
    expect(payload.buyer_evidence.hard_gate_deficits.remediation_queue.items.some(
      (item: { buyer_accepted_evidence_required: boolean }) => item.buyer_accepted_evidence_required === true,
    )).toBe(true);
    expect(payload.buyer_evidence.hard_gate_deficits.remediation_queue.items.some(
      (item: { retained_artifact_required: boolean }) => item.retained_artifact_required === true,
    )).toBe(true);
    expect(payload.launch_action_buyer_row.phase).toBe('buyer_evidence');
    expect(payload.launch_action_buyer_row.proof_command).toContain('report:buyer-evidence-gate-readiness');
    expect(payload.launch_action_buyer_row.proof_command).toContain('check:buyer-evidence-gate-report');
    expect(payload.production_approval_buyer_prerequisite.prerequisite).toBe('Buyer evidence hard gate');
    expect(payload.production_approval_buyer_prerequisite.proof_command).toContain('report:buyer-evidence-gate-readiness');
    expect(payload.production_approval_buyer_prerequisite.proof_command).toContain('check:buyer-evidence-gate-report');
    expect(payload.production_approval_request_buyer_row.prerequisite).toBe('Buyer evidence hard gate');
    expect(payload.production_approval_request_buyer_row.proof_command).toContain('report:buyer-evidence-gate-readiness');
    expect(payload.production_approval_request_buyer_row.proof_command).toContain('check:buyer-evidence-gate-report');
    expect(payload.public_status_handles.buyer_evidence_gate.id).toBe('buyer_evidence_gate');
    expect(payload.public_status_handles.buyer_evidence_hard_gate_deficit_ledger.id).toBe('buyer_evidence_hard_gate_deficit_ledger');
    expect(payload.public_status_handles.buyer_evidence_acquisition_matrix.id).toBe('buyer_evidence_acquisition_matrix');
    expect(payload.public_status_handles.buyer_evidence_minimum_packet_handoff.id).toBe('buyer_evidence_minimum_packet_handoff');
    expect(payload.public_status_handles.buyer_evidence_remediation_queue.id).toBe('buyer_evidence_remediation_queue');
    expect(payload.public_status_handles.buyer_evidence_gate.command).toContain('report:buyer-evidence-gate-readiness');
    expect(payload.public_status_handles.buyer_evidence_gate.command).toContain('check:buyer-evidence-gate-report');
    expect(payload.public_status_handles.buyer_evidence_minimum_packet_handoff.sourceManifestPath).toBe('buyer_evidence.minimum_evidence_packet');
    expect(payload.public_status_handles.buyer_evidence_acquisition_matrix.sourceProofTypes).toContain('buyer_evidence_acquisition_matrix');
    expect(payload.public_status_handles.buyer_evidence_minimum_packet_handoff.sourceProofTypes).toContain('buyer_evidence_minimum_packet_handoff');
	    expect(payload.package_script_handles.report_buyer_evidence_gate_readiness).toBe('corepack pnpm run report:buyer-evidence-gate-readiness');
	    expect(payload.package_script_handles.check_buyer_evidence_gate_report).toBe('corepack pnpm run check:buyer-evidence-gate-report');
	    expect(payload.package_script_handles.check_buyer_evidence_readiness_report).toBe('corepack pnpm run check:buyer-evidence-readiness-report');
	    expect(payload.package_script_handles.report_pilot_evidence_95).toBe('corepack pnpm run report:pilot-evidence-95');
    expect(payload.package_script_handles.validate_pilot_evidence_require_95).toBe('corepack pnpm run validate:pilot-evidence -- --require-95');
    expect(payload.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|validate 95|grant production approval/i);
    expect(payload.stop_gate).toMatch(/Do not treat this focused report|buyer-proven evidence|commercial-ready status|hosted\/live parity/i);
  });

  it('validates the focused report contract without requiring buyer evidence to pass', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('Buyer evidence gate readiness report check passed');
  });

  it('can fail as a machine buyer gate when hard-gate blockers remain', () => {
    const json = JSON.parse(execFileSync(process.execPath, [reportScriptPath, '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    }));

    const result = spawnSync(process.execPath, [reportScriptPath, '--fail-on-blocker'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    const ready = json.buyer_evidence.status === 'pass'
      && json.buyer_evidence.hard_gate_deficits.status === 'pass'
      && json.buyer_evidence.acquisition_matrix.status === 'ready';
    expect(result.status).toBe(ready ? 0 : 1);
    expect(result.stdout).toContain('# CEIP Buyer Evidence Hard-Gate Readiness Report');
    if (!ready) {
      expect(result.stderr).toContain('Buyer evidence hard gate remains');
      expect(result.stderr).toContain('does not contact buyers');
    }
  });
});
