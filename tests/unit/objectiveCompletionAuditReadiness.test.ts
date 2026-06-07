import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const reportScriptPath = path.join(process.cwd(), 'scripts/report-objective-completion-audit-readiness.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-objective-completion-audit-readiness-report.mjs');
const timeout = 180_000;
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-objective-completion-audit-'));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('objective completion audit readiness report', () => {
  it('renders a focused objective completion audit report from the manifest', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'objective-completion-audit.md');
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('# CEIP Objective Completion Audit Readiness Report');
    expect(stdout).toContain('Objective completion audit readiness status:');
    expect(stdout).toContain('Completion audit proof type:');
    expect(stdout).toContain('Goal-completion blocker rows:');
    expect(stdout).toContain('## Decision Boundary');
    expect(stdout).toContain('does not mark the launch goal complete');
    expect(stdout).toMatch(/clear P0\/P1 blockers[\s\S]*collect buyer evidence[\s\S]*authorize Supabase[\s\S]*deploy/i);
    expect(stdout).toContain('## Completion Audit Summary');
    expect(stdout).toContain('completion_audit_current_state');
    expect(stdout).toContain('Objective completion audit:');
    expect(stdout).toContain('## Deliverable Evidence Rows');
    expect(stdout).toContain('Launch score table');
    expect(stdout).toContain('Structured evidence manifest');
    expect(stdout).toContain('## Goal-Blocking Rows');
    expect(stdout).toContain('Buyer evidence hard gate');
    expect(stdout).toContain('Source provenance release gate');
    expect(stdout).toContain('Branch canonical review gate');
    expect(stdout).toContain('Supabase advisor clearance gate');
    expect(stdout).toContain('Release toolchain approval gate');
    expect(stdout).toContain('Production approval and live proof gate');
    expect(stdout).toContain('## Public Release Status Handle');
    expect(stdout).toContain('objective_completion_audit');
    expect(stdout).toContain('Source Manifest Path');
    expect(stdout).toContain('| objective_completion_audit | external_gate | completion_audit | completion_audit_current_state |');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  });

  it('emits a focused JSON payload with deliverable rows, blocker rows, and no-completion boundaries', () => {
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);

    expect(payload.schema_version).toBe(1);
    expect(payload.launch_decision).toBe('blocked');
    expect(payload.objective_completion_audit.status).toBe('blocked');
    expect(payload.objective_completion_audit.proof_type).toBe('completion_audit_current_state');
    expect(payload.objective_completion_audit.total_count).toBeGreaterThanOrEqual(15);
    expect(payload.objective_completion_audit.completed_count).toBeGreaterThanOrEqual(8);
    expect(payload.objective_completion_audit.blocked_count).toBeGreaterThanOrEqual(4);
    expect(payload.objective_completion_audit.manual_stop_count).toBeGreaterThanOrEqual(1);
    expect(payload.objective_completion_audit.goal_completion_blocked_count).toBe(
      payload.objective_completion_audit.blocked_count + payload.objective_completion_audit.manual_stop_count,
    );

    expect(payload.deliverable_items.map((item: { requirement: string }) => item.requirement)).toEqual(
      expect.arrayContaining([
        'Launch score table',
        'Gap analysis',
        'Launch blocker action queue',
        'Market pain research table',
        'Target customer table',
        'Outreach plan',
        'Fix report',
        'Structured evidence manifest',
        'ECC phase ledger',
      ]),
    );
    expect(payload.blocker_items.map((item: { requirement: string }) => item.requirement)).toEqual(
      expect.arrayContaining([
        'Buyer evidence hard gate',
        'Source provenance release gate',
        'Branch canonical review gate',
        'Supabase advisor clearance gate',
        'Release toolchain approval gate',
        'Production approval and live proof gate',
      ]),
    );
    expect(payload.blocker_items.every((item: { blocks_goal_completion?: boolean }) => item.blocks_goal_completion === true)).toBe(true);
    expect(payload.blocker_items.find((item: { requirement: string }) => item.requirement === 'Buyer evidence hard gate')?.next_proof_command).toContain('report:buyer-evidence-gate-readiness');
    expect(payload.blocker_items.find((item: { requirement: string }) => item.requirement === 'Production approval and live proof gate')?.next_proof_command).toContain('report:post-deploy-live-proof-readiness');
    expect(payload.public_status_handle.id).toBe('objective_completion_audit');
    expect(payload.public_status_handle.sourceManifestPath).toBe('completion_audit');
    expect(payload.public_status_handle.sourceProofType).toBe('completion_audit_current_state');
    expect(payload.package_script_handles.report_objective_completion_audit_readiness).toBe('corepack pnpm run report:objective-completion-audit-readiness');
    expect(payload.package_script_handles.check_objective_completion_audit_report).toBe('corepack pnpm run check:objective-completion-audit-report');
    expect(payload.proof_boundary).toMatch(/does not mark the launch goal complete|clear P0\/P1 blockers|collect buyer evidence|contact buyers|authorize Supabase|approve branches|resolve source provenance|request owner approval|deploy|hosted\/live parity|commercial launch readiness/i);
    expect(payload.stop_gate).toMatch(/Do not treat this focused objective completion audit report|production approval|buyer acceptance|release readiness|source readiness|branch approval|Supabase advisor clearance|deployment approval|hosted\/live parity|commercial-ready status|launch-goal completion/i);
  });

  it('validates the focused report contract', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('Objective completion audit readiness report check passed');
  });

  it('can fail as a machine gate while goal-completion blockers remain open', () => {
    const result = spawnSync(process.execPath, [reportScriptPath, '--skip-probes', '--fail-on-blocker'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('# CEIP Objective Completion Audit Readiness Report');
    expect(result.stdout).toContain('Objective completion audit readiness status: `blocked`');
    expect(result.stdout).toContain('Do not treat this focused objective completion audit report');
  });
});
