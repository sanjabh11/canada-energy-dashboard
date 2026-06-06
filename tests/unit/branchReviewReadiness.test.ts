import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const reportScriptPath = path.join(process.cwd(), 'scripts/report-branch-review-readiness.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-branch-review-readiness-report.mjs');
const timeout = 240_000;
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-branch-review-'));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('branch review readiness report', () => {
  it('renders a focused branch-review report from the launch manifest', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'branch-review.md');
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('# CEIP Branch Review Readiness Report');
    expect(stdout).toContain('Branch review status:');
    expect(stdout).toContain('Review-first branch families:');
    expect(stdout).toContain('Canonical-head decisions open:');
    expect(stdout).toContain('Decision Boundary');
    expect(stdout).toContain('does not checkout, merge, push, discard, delete, select canonical heads');
    expect(stdout).toContain('run migrations, mutate Supabase, deploy');
    expect(stdout).toContain('Branch Review Queue');
    expect(stdout).toContain('Canonical Head Decisions');
    expect(stdout).toContain('Canonical Head Resolution Queue');
    expect(stdout).toContain('Branch Clearance Matrix');
    expect(stdout).toContain('Review-First Branch Packets');
    expect(stdout).toContain('Top Branch Review Packet');
    expect(stdout).toContain('Top Branch Changed Supabase Function Rows');
    expect(stdout).toContain('Canonical Head Comparison');
    expect(stdout).toContain('Launch Action Branch Row');
    expect(stdout).toContain('Production Approval Branch Prerequisite');
    expect(stdout).toContain('Production Approval Request Branch Row');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  });

  it('emits a focused JSON payload with branch queues and no-mutation boundaries', () => {
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);

    expect(payload.schema_version).toBe(1);
    expect(payload.launch_decision).toBe('blocked');
    expect(payload.branch_review.status).toMatch(/blocked|pass|skipped/);
    expect(payload.branch_review.probe_status).toBeTruthy();
    expect(payload.branch_review.evidence_boundary).toMatch(/does not clear review-first branch families/i);
    expect(Array.isArray(payload.branch_review.review_queue.items)).toBe(true);
    expect(Array.isArray(payload.branch_review.canonical_head_decisions.items)).toBe(true);
    expect(payload.branch_review.canonical_head_resolution_queue.proof_type).toBe('canonical_head_resolution_queue');
    expect(Array.isArray(payload.branch_review.canonical_head_resolution_queue.items)).toBe(true);
    expect(payload.branch_review.clearance_matrix.proof_type).toBe('read_only_branch_clearance_matrix');
    expect(Array.isArray(payload.branch_review.clearance_matrix.rows)).toBe(true);
    expect(Array.isArray(payload.branch_review.review_first_packets.packets)).toBe(true);
    expect(payload.launch_action_branch_row.phase).toBe('branch_review');
    expect(payload.launch_action_branch_row.proof_command).toContain('report:branch-review-readiness');
    expect(payload.launch_action_branch_row.proof_command).toContain('check:branch-review-report');
    expect(payload.production_approval_branch_prerequisite.prerequisite).toBe('Canonical branch review');
    expect(payload.production_approval_branch_prerequisite.proof_command).toContain('report:branch-review-readiness');
    expect(payload.production_approval_branch_prerequisite.proof_command).toContain('check:branch-review-report');
    expect(payload.production_approval_request_branch_row.prerequisite).toBe('Canonical branch review');
    expect(payload.production_approval_request_branch_row.proof_command).toContain('report:branch-review-readiness');
    expect(payload.production_approval_request_branch_row.proof_command).toContain('check:branch-review-report');
    expect(payload.proof_boundary).toMatch(/does not checkout|merge|push|discard|select canonical heads|run migrations|mutate Supabase|deploy|grant production approval/i);
    expect(payload.stop_gate).toMatch(/branch approval|canonical-head owner selection|merge approval|production approval|hosted\/live parity/i);

    if (payload.branch_review.status !== 'skipped') {
      expect(payload.branch_review.review_queue.item_count).toBe(payload.branch_review.review_queue.items.length);
      expect(payload.branch_review.clearance_matrix.family_count).toBe(payload.branch_review.clearance_matrix.rows.length);
      expect(payload.branch_review.review_queue.blocked_count).toBe(payload.branch_review.review_queue.review_first_count);
      expect(payload.branch_review.top_review_packet.read_only).toBe(true);
      expect(payload.branch_review.top_review_packet.proof_boundary).toMatch(/read-only branch evidence|does not checkout|merge|push/i);
      expect(payload.branch_review.top_review_packet.changed_supabase_function_rows).toHaveLength(
        payload.branch_review.top_review_packet.changed_supabase_function_count,
      );
      if (payload.branch_review.top_review_packet.changed_supabase_function_count > 0) {
        expect(payload.branch_review.top_review_packet.categories).toContain('supabase/database');
      }
      for (const row of payload.branch_review.top_review_packet.changed_supabase_function_rows) {
        expect(row.function_name).toBeTruthy();
        expect(row.changed_paths).toMatch(/supabase\/functions\//);
        expect(row.review_focus).toMatch(/secret|auth|entitlement|database writes|observability|import-impact/i);
        expect(row.suggested_checks).toContain('git diff');
        expect(row.proof_type).toBe('read_only_supabase_function_branch_review');
        expect(row.proof_boundary).toMatch(/does not deploy functions|run migrations|alter secrets|change policies|grant production approval/i);
        expect(row.stop_gate).toMatch(/No production function deploy|service-role|live data write/i);
      }
    }
  });

  it('validates the focused report contract without clearing branch blockers', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('Branch review readiness report check passed');
    expect(stdout).toContain('top branch Supabase function impact rows');
  });

  it('can fail as a machine branch gate when branch-review blockers remain', () => {
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

    const ready = json.branch_review.status === 'pass'
      && json.branch_review.review_queue.status === 'pass'
      && json.branch_review.canonical_head_decisions.status === 'pass'
      && json.branch_review.canonical_head_resolution_queue.status === 'pass'
      && json.branch_review.clearance_matrix.status === 'pass';
    expect(result.status).toBe(ready ? 0 : 1);
    expect(result.stdout).toContain('# CEIP Branch Review Readiness Report');
    if (!ready) {
      expect(result.stderr).toContain('Branch review remains');
      expect(result.stderr).toContain('does not checkout');
    }
  });
});
