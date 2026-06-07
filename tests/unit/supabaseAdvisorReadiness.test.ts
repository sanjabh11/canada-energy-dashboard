import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const reportScriptPath = path.join(process.cwd(), 'scripts/report-supabase-advisor-readiness.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-supabase-advisor-readiness-report.mjs');
const timeout = 180_000;
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-supabase-advisor-'));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('Supabase advisor readiness report', () => {
  it('renders a focused Supabase advisor blocker report from the launch manifest', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'supabase-advisor.md');
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('# CEIP Supabase Advisor Readiness Report');
    expect(stdout).toContain('Supabase advisor status:');
    expect(stdout).toContain('Decision Boundary');
    expect(stdout).toContain('does not authorize connectors, access the dashboard, rerun Security Advisor or Performance Advisor');
    expect(stdout).toContain('Supabase Advisor Clearance Deficit Ledger');
    expect(stdout).toContain('| CLI app lint freshness |');
    expect(stdout).toContain('| Connector project authorization |');
    expect(stdout).toContain('| Security advisor evidence |');
    expect(stdout).toContain('| Performance advisor evidence |');
    expect(stdout).toContain('| Public-safe findings record |');
    expect(stdout).toContain('| Advisor clearance claim |');
    expect(stdout).toContain('Supabase Advisor Remediation Queue');
    expect(stdout).toContain('Supabase Advisor Operator Handoff Packet');
    expect(stdout).toContain('supabase_advisor_operator_handoff_packet');
    expect(stdout).toContain('Execution Gate');
    expect(stdout).toContain('Can Execute From Packet');
    expect(stdout).toContain('Secret Safe');
    expect(stdout).toContain('Production Approval Supabase Prerequisite');
    expect(stdout).toContain('Production Approval Request Supabase Row');
    expect(stdout).toContain('Public Release Status Handles');
    expect(stdout).toContain('supabase_advisor_access');
    expect(stdout).toContain('supabase_advisor_clearance_deficit_ledger');
    expect(stdout).toContain('supabase_advisor_operator_handoff_packet');
    expect(stdout).toContain('supabase_advisor_remediation_queue');
    expect(stdout).toContain('Package Script Handles');
    expect(stdout).toContain('corepack pnpm run report:supabase-advisor-readiness');
    expect(stdout).toContain('corepack pnpm run check:supabase-advisor-report');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  });

  it('emits a focused JSON payload with advisor deficits and external-account boundaries', () => {
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);

    expect(payload.schema_version).toBe(1);
    expect(payload.launch_decision).toBe('blocked');
    expect(payload.supabase_advisor.project_ref).toBeTruthy();
    expect(payload.supabase_advisor.clearance_deficits.items.map((item: { requirement: string }) => item.requirement)).toEqual([
      'CLI app lint freshness',
      'Connector project authorization',
      'Security advisor evidence',
      'Performance advisor evidence',
      'Public-safe findings record',
      'Advisor clearance claim',
    ]);
    expect(payload.supabase_advisor.clearance_deficits.total_count).toBe(6);
    const remediationQueue = payload.supabase_advisor.clearance_deficits.remediation_queue;
    expect(remediationQueue.items.some(
      (item: { external_account_required: boolean }) => item.external_account_required === true,
    )).toBe(true);
    expect(remediationQueue.items.some(
      (item: { proof_type: string }) => item.proof_type === 'retained_redacted_record',
    )).toBe(true);
    const operatorHandoffPacket = payload.supabase_advisor.operator_handoff_packet;
    expect(operatorHandoffPacket.proof_type).toBe('supabase_advisor_operator_handoff_packet');
    expect(operatorHandoffPacket.source).toBe('supabase_advisor.clearance_deficits.remediation_queue.items');
    expect(operatorHandoffPacket.item_count).toBe(remediationQueue.items.length);
    expect(operatorHandoffPacket.blocked_count).toBe(
      operatorHandoffPacket.items.filter((item: { blocks_advisor_gate: boolean }) => item.blocks_advisor_gate).length,
    );
    expect(operatorHandoffPacket.external_account_count).toBe(
      operatorHandoffPacket.items.filter((item: { external_account_required: boolean }) => item.external_account_required).length,
    );
    expect(operatorHandoffPacket.repo_command_count).toBe(
      operatorHandoffPacket.items.filter((item: { proof_type: string }) => item.proof_type === 'repo_command').length,
    );
    expect(operatorHandoffPacket.retained_record_count).toBe(
      operatorHandoffPacket.items.filter((item: { proof_type: string }) => item.proof_type === 'retained_redacted_record').length,
    );
    expect(operatorHandoffPacket.items.map((item: { requirement: string }) => item.requirement)).toEqual(
      remediationQueue.items.map((item: { requirement: string }) => item.requirement),
    );
    expect(operatorHandoffPacket.items.every((item: { can_execute_from_packet: boolean }) => item.can_execute_from_packet === false)).toBe(true);
    const operatorRowsByRequirement = new Map<string, {
      execution_gate: string;
      proof_command: string;
      proof_type: string;
      proof_boundary: string;
      stop_gate: string;
      public_safe_record_required: boolean;
      secret_safe: boolean;
    }>(operatorHandoffPacket.items.map((item: {
      requirement: string;
      execution_gate: string;
      proof_command: string;
      proof_type: string;
      proof_boundary: string;
      stop_gate: string;
      public_safe_record_required: boolean;
      secret_safe: boolean;
    }) => [item.requirement, item]));
    expect(operatorRowsByRequirement.get('CLI app lint freshness')?.execution_gate).toBe('repo_lint_freshness_first');
    expect(operatorRowsByRequirement.get('Connector project authorization')?.execution_gate).toBe('authorized_connector_or_dashboard_access_first');
    expect(operatorRowsByRequirement.get('Security advisor evidence')?.execution_gate).toBe('security_advisor_after_authorization');
    expect(operatorRowsByRequirement.get('Performance advisor evidence')?.execution_gate).toBe('performance_advisor_after_authorization');
    expect(operatorRowsByRequirement.get('Public-safe findings record')?.execution_gate).toBe('public_safe_record_after_advisor_review');
    expect(operatorRowsByRequirement.get('Advisor clearance claim')?.execution_gate).toBe('clearance_claim_after_all_rows_pass');
    for (const row of operatorHandoffPacket.items) {
      const sourceRow = remediationQueue.items.find((item: { requirement: string }) => item.requirement === row.requirement);
      expect(row.proof_command).toBe(sourceRow.proof_command);
      expect(row.proof_boundary).toMatch(/planning evidence only|does not authorize connectors|access dashboard|rerun advisors|mutate database|record secrets|request approval|deploy|hosted\/live parity/i);
      expect(row.stop_gate).toMatch(/Do not|claim clearance|mark this row ready|advisor evidence|permission-denied|secrets/i);
    }
    expect(operatorRowsByRequirement.get('Public-safe findings record')?.public_safe_record_required).toBe(true);
    expect(operatorRowsByRequirement.get('Public-safe findings record')?.secret_safe).toBe(true);
    expect(payload.launch_action_supabase_row.phase).toBe('supabase_advisor');
    expect(payload.production_approval_advisor_prerequisite.prerequisite).toBe('Supabase advisor clearance');
    expect(payload.production_approval_request_advisor_row.prerequisite).toBe('Supabase advisor clearance');
    expect(payload.public_status_handles.supabase_advisor_access.id).toBe('supabase_advisor_access');
    expect(payload.public_status_handles.supabase_advisor_clearance_deficit_ledger.id).toBe('supabase_advisor_clearance_deficit_ledger');
    expect(payload.public_status_handles.supabase_advisor_operator_handoff_packet.id).toBe('supabase_advisor_operator_handoff_packet');
    expect(payload.public_status_handles.supabase_advisor_remediation_queue.id).toBe('supabase_advisor_remediation_queue');
    expect(payload.public_status_handles.supabase_advisor_operator_handoff_packet.command).toContain('report:supabase-advisor-readiness');
    expect(payload.public_status_handles.supabase_advisor_operator_handoff_packet.command).toContain('check:supabase-advisor-report');
    expect(payload.public_status_handles.supabase_advisor_operator_handoff_packet.sourceManifestPath).toBe('supabase_advisor.operator_handoff_packet');
    expect(payload.public_status_handles.supabase_advisor_access.sourceProofTypes).toContain('external_account_evidence');
    expect(payload.public_status_handles.supabase_advisor_remediation_queue.sourceProofTypes).toContain('retained_redacted_record');
    expect(payload.package_script_handles.report_supabase_advisor_readiness).toBe('corepack pnpm run report:supabase-advisor-readiness');
    expect(payload.package_script_handles.check_supabase_advisor_report).toBe('corepack pnpm run check:supabase-advisor-report');
    expect(payload.package_script_handles.check_supabase_app_lint).toBe('corepack pnpm run check:supabase-app-lint');
    expect(payload.launch_action_supabase_row.proof_command).toContain('report:supabase-advisor-readiness');
    expect(payload.launch_action_supabase_row.proof_command).toContain('check:supabase-advisor-report');
    expect(payload.production_approval_advisor_prerequisite.proof_command).toContain('report:supabase-advisor-readiness');
    expect(payload.production_approval_advisor_prerequisite.proof_command).toContain('check:supabase-advisor-report');
    expect(payload.production_approval_request_advisor_row.proof_command).toContain('report:supabase-advisor-readiness');
    expect(payload.production_approval_request_advisor_row.proof_command).toContain('check:supabase-advisor-report');
    expect(payload.proof_boundary).toMatch(/does not authorize connectors|rerun Security Advisor or Performance Advisor|record secrets/i);
    expect(payload.stop_gate).toMatch(/Do not treat this focused report|Supabase advisor clearance|production approval/i);
  });

  it('validates the focused report contract without requiring advisor clearance to pass', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('Supabase advisor readiness report check passed');
    expect(stdout).toContain('operator handoff packet');
  });

  it('can fail as a machine advisor gate when clearance blockers remain', () => {
    const json = JSON.parse(execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    }));

    const result = spawnSync(process.execPath, [reportScriptPath, '--skip-probes', '--fail-on-blocker'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    const ready = json.supabase_advisor.status === 'verified'
      && json.supabase_advisor.clearance_deficits.status === 'pass'
      && json.supabase_advisor.operator_handoff_packet.status === 'ready';
    expect(result.status).toBe(ready ? 0 : 1);
    expect(result.stdout).toContain('# CEIP Supabase Advisor Readiness Report');
    if (!ready) {
      expect(result.stderr).toContain('Supabase advisor clearance remains');
      expect(result.stderr).toContain('does not authorize connectors');
    }
  });
});
