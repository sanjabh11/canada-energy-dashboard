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
    expect(stdout).toContain('Branch Operator Handoff Packet');
    expect(stdout).toContain('branch_operator_handoff_packet');
    expect(stdout).toContain('Can Execute From Packet');
    expect(stdout).toContain('Branch Merge Recommendation Packet');
    expect(stdout).toContain('branch_merge_recommendation_packet');
    expect(stdout).toContain('do_not_wholesale_merge');
    expect(stdout).toContain('Can Merge Now');
    expect(stdout).toContain('Review-First Branch Packets');
    expect(stdout).toContain('Top Branch Review Packet');
    expect(stdout).toContain('Top Branch Changed Supabase Function Rows');
    expect(stdout).toContain('Canonical Head Comparison');
    expect(stdout).toContain('Launch Action Branch Row');
    expect(stdout).toContain('Production Approval Branch Prerequisite');
    expect(stdout).toContain('Production Approval Request Branch Row');
    expect(stdout).toContain('Public Release Status Handles');
    expect(stdout).toContain('unmerged_branch_review_queue');
    expect(stdout).toContain('branch_family_freshness_rollup');
    expect(stdout).toContain('top_branch_review_packet');
    expect(stdout).toContain('branch_clearance_matrix');
    expect(stdout).toContain('branch_operator_handoff_packet');
    expect(stdout).toContain('canonical_head_decision_queue');
    expect(stdout).toContain('canonical_head_resolution_queue');
    expect(stdout).toContain('review_first_branch_packet_queue');
    expect(stdout).toContain('Package Script Handles');
    expect(stdout).toContain('corepack pnpm run report:branch-review-readiness');
    expect(stdout).toContain('corepack pnpm run check:branch-review-report');
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
    expect(payload.branch_review.operator_handoff_packet.proof_type).toBe('branch_operator_handoff_packet');
    expect(payload.branch_review.operator_handoff_packet.source).toBe('branch_review.clearance_matrix.rows');
    expect(Array.isArray(payload.branch_review.operator_handoff_packet.items)).toBe(true);
    expect(payload.branch_review.operator_handoff_packet.proof_boundary).toMatch(/read-only planning evidence only|does not checkout|merge|push|discard|delete|select canonical heads|run migrations|mutate Supabase|deploy|hosted\/live parity/i);
    expect(payload.branch_review.operator_handoff_packet.stop_gate).toMatch(/Do not mark branch review clear|select canonical heads|merge|push|discard|delete|deploy|request production approval/i);
    expect(payload.branch_review.branch_merge_recommendation_packet.proof_type).toBe('branch_merge_recommendation_packet');
    expect(payload.branch_review.branch_merge_recommendation_packet.source).toBe('branch_review.clearance_matrix.rows');
    expect(Array.isArray(payload.branch_review.branch_merge_recommendation_packet.items)).toBe(true);
    expect(payload.branch_review.branch_merge_recommendation_packet.proof_boundary).toMatch(/best-course recommendations only|does not checkout|merge|push|discard|select canonical heads|cherry-pick|run migrations|mutate Supabase|deploy|production approval/i);
    expect(payload.branch_review.branch_merge_recommendation_packet.stop_gate).toMatch(/merge approval|canonical-head selection|branch retirement approval|cherry-pick approval|production approval|hosted\/live proof/i);
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
    expect(payload.public_status_handles.unmerged_branch_review_queue.id).toBe('unmerged_branch_review_queue');
    expect(payload.public_status_handles.branch_family_freshness_rollup.id).toBe('branch_family_freshness_rollup');
    expect(payload.public_status_handles.top_branch_review_packet.id).toBe('top_branch_review_packet');
    expect(payload.public_status_handles.branch_clearance_matrix.id).toBe('branch_clearance_matrix');
    expect(payload.public_status_handles.branch_operator_handoff_packet.id).toBe('branch_operator_handoff_packet');
    expect(payload.public_status_handles.canonical_head_decision_queue.id).toBe('canonical_head_decision_queue');
    expect(payload.public_status_handles.canonical_head_resolution_queue.id).toBe('canonical_head_resolution_queue');
    expect(payload.public_status_handles.review_first_branch_packet_queue.id).toBe('review_first_branch_packet_queue');
    expect(payload.public_status_handles.branch_operator_handoff_packet.command).toContain('report:branch-review-readiness');
    expect(payload.public_status_handles.branch_operator_handoff_packet.command).toContain('check:branch-review-report');
    expect(payload.public_status_handles.branch_operator_handoff_packet.sourceManifestPath).toBe('branch_review.operator_handoff_packet');
    expect(payload.public_status_handles.unmerged_branch_review_queue.sourceProofTypes).toContain('read_only_branch_review');
    expect(payload.public_status_handles.branch_clearance_matrix.sourceProofType).toBe('read_only_branch_clearance_matrix');
    expect(payload.package_script_handles.report_branch_review_readiness).toBe('corepack pnpm run report:branch-review-readiness');
    expect(payload.package_script_handles.check_branch_review_report).toBe('corepack pnpm run check:branch-review-report');
    expect(payload.package_script_handles.report_unmerged_branch_readiness).toBe('corepack pnpm run report:unmerged-branch-readiness');
    expect(payload.package_script_handles.report_unmerged_branch_readiness_high_risk).toBe('corepack pnpm run report:unmerged-branch-readiness -- --focus-risk high');
    expect(payload.proof_boundary).toMatch(/does not checkout|merge|push|discard|select canonical heads|run migrations|mutate Supabase|deploy|grant production approval/i);
    expect(payload.stop_gate).toMatch(/branch approval|canonical-head owner selection|merge approval|production approval|hosted\/live parity/i);

    if (payload.branch_review.status !== 'skipped') {
      expect(payload.branch_review.review_queue.item_count).toBe(payload.branch_review.review_queue.items.length);
      expect(payload.branch_review.clearance_matrix.family_count).toBe(payload.branch_review.clearance_matrix.rows.length);
      expect(payload.branch_review.review_queue.blocked_count).toBe(payload.branch_review.review_queue.review_first_count);
      expect(payload.branch_review.operator_handoff_packet.status).toMatch(/blocked|ready/);
      expect(payload.branch_review.operator_handoff_packet.item_count).toBe(payload.branch_review.clearance_matrix.rows.length);
      expect(payload.branch_review.operator_handoff_packet.blocked_count).toBe(
        payload.branch_review.operator_handoff_packet.items.filter((item: { blocks_branch_gate?: boolean }) => item.blocks_branch_gate).length,
      );
      expect(payload.branch_review.operator_handoff_packet.items.map((item: { family?: string }) => item.family)).toEqual(
        payload.branch_review.clearance_matrix.rows.map((item: { family?: string }) => item.family),
      );
      expect(payload.branch_review.branch_merge_recommendation_packet.item_count).toBe(payload.branch_review.clearance_matrix.rows.length);
      expect(payload.branch_review.branch_merge_recommendation_packet.blocked_count).toBe(
        payload.branch_review.branch_merge_recommendation_packet.items.filter((item: { status?: string }) => item.status !== 'ready').length,
      );
      expect(payload.branch_review.branch_merge_recommendation_packet.do_not_wholesale_merge_count).toBe(
        payload.branch_review.branch_merge_recommendation_packet.items.filter((item: { recommendation?: string }) => item.recommendation === 'do_not_wholesale_merge').length,
      );
      expect(payload.branch_review.branch_merge_recommendation_packet.items.map((item: { family?: string }) => item.family)).toEqual(
        payload.branch_review.clearance_matrix.rows.map((item: { family?: string }) => item.family),
      );
      for (const [index, item] of payload.branch_review.operator_handoff_packet.items.entries()) {
        const clearanceRow = payload.branch_review.clearance_matrix.rows[index];
        expect(item.family).toBe(clearanceRow.family);
        expect(item.review_ref).toBe(clearanceRow.review_ref);
        expect(item.read_only).toBe(true);
        expect(item.can_execute_from_packet).toBe(false);
        expect(item.blocks_branch_gate).toBe(clearanceRow.blocks_launch_clearance === true || clearanceRow.clearance_status !== 'pass');
        expect(item.proof_command).toContain('report:unmerged-branch-readiness');
        expect(item.proof_boundary).toMatch(/read-only planning evidence only|does not checkout|merge|push|discard|delete|select canonical heads|run migrations|mutate Supabase|deploy|hosted\/live parity/i);
        expect(item.stop_gate).toMatch(/Do not execute|mutate branch state|select canonical heads|request production approval|mark this row ready/i);
        if (item.blocker_class === 'review_first') {
          expect(item.execution_gate).toBe('read_only_focused_review_first');
        }
        if (item.blocker_class === 'canonical_head_decision') {
          expect(item.owner).toBe('owner');
          expect(item.execution_gate).toBe('owner_canonical_head_decision_first');
        }
      }
      for (const item of payload.branch_review.branch_merge_recommendation_packet.items) {
        expect(item.proof_command).toContain('report:unmerged-branch-readiness');
        expect(item.can_merge_now).toBe(false);
        expect(item.can_execute_from_packet).toBe(false);
        expect(item.proof_type).toBe('read_only_branch_merge_recommendation');
        expect(item.proof_boundary).toMatch(/Read-only branch merge recommendation only|does not checkout|merge|push|discard|select canonical heads|cherry-pick|run migrations|mutate Supabase|deploy|production approval/i);
        expect(item.stop_gate).toMatch(/Do not merge|cherry-pick|push|discard|checkout|select canonical heads|deploy|request production approval/i);
        if (item.highest_risk === 'high' || item.blocker_class === 'review_first') {
          expect(item.recommendation).toBe('do_not_wholesale_merge');
        }
      }
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
      && json.branch_review.clearance_matrix.status === 'pass'
      && json.branch_review.operator_handoff_packet.status === 'ready';
    expect(result.status).toBe(ready ? 0 : 1);
    expect(result.stdout).toContain('# CEIP Branch Review Readiness Report');
    if (!ready) {
      expect(result.stderr).toContain('Branch review remains');
      expect(result.stderr).toContain('does not checkout');
    }
  });
});
