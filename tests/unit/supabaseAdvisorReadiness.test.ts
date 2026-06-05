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
    expect(stdout).toContain('Production Approval Supabase Prerequisite');
    expect(stdout).toContain('Production Approval Request Supabase Row');
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
    expect(payload.supabase_advisor.clearance_deficits.remediation_queue.items.some(
      (item: { external_account_required: boolean }) => item.external_account_required === true,
    )).toBe(true);
    expect(payload.supabase_advisor.clearance_deficits.remediation_queue.items.some(
      (item: { proof_type: string }) => item.proof_type === 'retained_redacted_record',
    )).toBe(true);
    expect(payload.launch_action_supabase_row.phase).toBe('supabase_advisor');
    expect(payload.production_approval_advisor_prerequisite.prerequisite).toBe('Supabase advisor clearance');
    expect(payload.production_approval_request_advisor_row.prerequisite).toBe('Supabase advisor clearance');
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
      && json.supabase_advisor.clearance_deficits.status === 'pass';
    expect(result.status).toBe(ready ? 0 : 1);
    expect(result.stdout).toContain('# CEIP Supabase Advisor Readiness Report');
    if (!ready) {
      expect(result.stderr).toContain('Supabase advisor clearance remains');
      expect(result.stderr).toContain('does not authorize connectors');
    }
  });
});
