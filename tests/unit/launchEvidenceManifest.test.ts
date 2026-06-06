import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/report-launch-evidence-manifest.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-launch-evidence-manifest.mjs');
const checkMarkdownReportScriptPath = path.join(process.cwd(), 'scripts/check-commercial-launch-readiness-report.mjs');
const markdownReportScriptPath = path.join(process.cwd(), 'scripts/report-commercial-launch-readiness.mjs');
const validatorPath = '/Users/sanjayb/.codex/skills/commercial-launch-readiness-orchestrator/scripts/validate_launch_evidence.py';
const LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS = 180_000;
const tempRoots: string[] = [];

function mapBy<Value, Key>(items: readonly Value[], keyFor: (value: Value) => Key): Map<Key, Value> {
  const result = new Map<Key, Value>();
  for (const item of items) {
    result.set(keyFor(item), item);
  }
  return result;
}

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-launch-evidence-'));
  tempRoots.push(root);
  return root;
}

function runManifest(args: string[] = []) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env,
    timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
  });
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('launch evidence manifest report', () => {
  it('emits a conservative blocked launch-evidence manifest that passes the orchestrator schema validator', () => {
    const stdout = runManifest(['--skip-probes']);
    const manifest = JSON.parse(stdout);

    expect(manifest.schema_version).toBe(1);
    expect(manifest.repo.name).toBe('canada-energy-dashboard');
    expect(manifest.repo.path).toBe(process.cwd());
    expect(manifest.launch_decision).toBe('blocked');
    expect(manifest.scores.evidence).toBe(1);
    expect(Object.keys(manifest.proof_buckets).sort()).toEqual([
      'candidate_shadow',
      'hosted_live',
      'local',
      'repo_artifact',
      'roadmap',
    ]);
    expect(manifest.gaps.some((gap: { severity: string; gap: string }) => gap.severity === 'P0' && gap.gap.includes('Phase F evidence'))).toBe(true);
    expect(manifest.gaps.some((gap: { severity: string; gap: string }) => gap.severity === 'P1' && gap.gap.includes('stale/aging unmerged branches'))).toBe(true);
    const gapsByProofType = mapBy(
      manifest.gaps,
      (gap: {
        proof_type?: string;
        proof_boundary?: string;
        stop_gate?: string;
      }) => gap.proof_type,
    );
    expect(Array.from(gapsByProofType.keys()).sort()).toEqual([
      'branch_review_clearance_gap',
      'buyer_evidence_hard_gate',
      'external_advisor_clearance_gap',
      'release_toolchain_approval_gap',
      'source_provenance_approval_gate',
    ]);
    expect(gapsByProofType.get('buyer_evidence_hard_gate')?.proof_boundary).toMatch(/does not prove buyer acceptance|95% confidence|commercial-ready status/i);
    expect(gapsByProofType.get('buyer_evidence_hard_gate')?.stop_gate).toMatch(/Do not claim buyer-proven 95% confidence|accepted proof packs/i);
    expect(gapsByProofType.get('source_provenance_approval_gate')?.proof_boundary).toMatch(/does not commit|clear source provenance|run release-readiness|deploy/i);
    expect(gapsByProofType.get('source_provenance_approval_gate')?.stop_gate).toMatch(/Do not commit|production approval/i);
    expect(gapsByProofType.get('branch_review_clearance_gap')?.proof_boundary).toMatch(/read-only unmerged-branch|does not checkout|merge|push/i);
    expect(gapsByProofType.get('branch_review_clearance_gap')?.stop_gate).toMatch(/Do not checkout|canonical heads/i);
    expect(gapsByProofType.get('external_advisor_clearance_gap')?.proof_boundary).toMatch(/repo-visible Supabase advisor|does not access dashboards|clear advisor findings/i);
    expect(gapsByProofType.get('external_advisor_clearance_gap')?.stop_gate).toMatch(/Do not claim Supabase advisor clearance|RLS\/performance clearance/i);
    expect(gapsByProofType.get('release_toolchain_approval_gap')?.proof_boundary).toMatch(/does not resolve Corepack|Git LFS|run full release-readiness|grant owner approval/i);
    expect(gapsByProofType.get('release_toolchain_approval_gap')?.stop_gate).toMatch(/Do not treat local pnpm checks|release-readiness|owner approval/i);
    expect(manifest.completion_audit.status).toBe('blocked');
    expect(manifest.completion_audit.proof_type).toBe('completion_audit_current_state');
    expect(manifest.completion_audit.total_count).toBeGreaterThanOrEqual(15);
    expect(manifest.completion_audit.completed_count).toBeGreaterThanOrEqual(8);
    expect(manifest.completion_audit.blocked_count).toBeGreaterThanOrEqual(4);
    expect(manifest.completion_audit.manual_stop_count).toBeGreaterThanOrEqual(1);
    expect(manifest.completion_audit.goal_completion_blocked_count).toBe(
      manifest.completion_audit.blocked_count + manifest.completion_audit.manual_stop_count,
    );
    expect(manifest.completion_audit.proof_boundary).toMatch(/maps current manifest\/report evidence only|does not prove commercial-ready status|buyer acceptance|production approval|hosted\/live parity/i);
    expect(manifest.completion_audit.stop_gate).toMatch(/Do not mark the launch goal complete|P0\/P1 blockers|post-deploy live proof/i);
    const completionItemsByRequirement = mapBy(
      manifest.completion_audit.items,
      (item: {
        requirement: string;
        status: string;
        proof_type?: string;
        proof_boundary?: string;
        stop_gate?: string;
        blocks_goal_completion?: boolean;
      }) => item.requirement,
    );
    expect(completionItemsByRequirement.get('Launch score table')?.proof_type).toBe('required_score_table');
    expect(completionItemsByRequirement.get('Gap analysis')?.proof_type).toBe('required_gap_analysis_table');
    expect(completionItemsByRequirement.get('Launch blocker action queue')?.proof_type).toBe('sequenced_launch_action_queue');
    expect(completionItemsByRequirement.get('Market pain research table')?.proof_type).toBe('market_pain_source_table');
    expect(completionItemsByRequirement.get('Target customer table')?.proof_type).toBe('target_segment_table');
    expect(completionItemsByRequirement.get('Structured evidence manifest')?.proof_type).toBe('schema_validation');
    expect(completionItemsByRequirement.get('Buyer evidence hard gate')?.status).toBe('blocked');
    expect(completionItemsByRequirement.get('Buyer evidence hard gate')?.blocks_goal_completion).toBe(true);
    expect(completionItemsByRequirement.get('Buyer evidence hard gate')?.stop_gate).toMatch(/validate:pilot-evidence --require-95|retained artifacts/i);
    expect(completionItemsByRequirement.get('Source provenance release gate')?.proof_type).toBe('source_provenance_approval_gate');
    expect(completionItemsByRequirement.get('Branch canonical review gate')?.proof_type).toBe('read_only_branch_review');
    expect(completionItemsByRequirement.get('Supabase advisor clearance gate')?.status).toBe('blocked');
    expect(completionItemsByRequirement.get('Release toolchain approval gate')?.proof_type).toBe('release_toolchain_approval');
    expect(completionItemsByRequirement.get('Production approval and live proof gate')?.status).toBe('manual_stop');
    expect(completionItemsByRequirement.get('Production approval and live proof gate')?.proof_boundary).toMatch(/does not run deploys|prove live parity|mutate Netlify/i);
    expect(manifest.branch_review.clearance_matrix.status).toBe('skipped');
    expect(manifest.branch_review.clearance_matrix.proof_type).toBe('read_only_branch_clearance_matrix');
    expect(manifest.branch_review.clearance_matrix.evidence).toContain('Branch clearance matrix skipped');
    expect(manifest.branch_review.clearance_matrix.proof_boundary).toMatch(/read-only branch-review evidence only|does not checkout|merge|push/i);
    expect(manifest.branch_review.clearance_matrix.rows).toEqual([]);
    expect(manifest.progress_updates).toHaveLength(1);
    expect(manifest.progress_updates[0].phase).toBe('objective completion audit');
    expect(manifest.progress_updates[0].target_matrix).toContain('structured evidence manifest');
    expect(manifest.progress_updates[0].bottleneck).toMatch(/retained buyer artifacts|guarded deploy\/live proof/i);
    expect(manifest.bottleneck_log[0].root_cause).toBe('evidence gap');
    expect(manifest.bottleneck_log[0].top_unblock_options).toHaveLength(3);
    expect(manifest.market_evidence_mode).toBe('mixed');
    expect(manifest.synthetic_data_points).toEqual([]);
    const adversarialReviewsByLane = mapBy(
      manifest.adversarial_reviews,
      (review: {
        lane: string;
        proof_type?: string;
        proof_boundary?: string;
        stop_gate?: string;
      }) => review.lane,
    );
    expect(adversarialReviewsByLane.get('buyer evidence')?.proof_type).toBe('buyer_evidence_adversarial_review');
    expect(adversarialReviewsByLane.get('buyer evidence')?.proof_boundary).toMatch(/does not create buyer acceptance|95% confidence|commercial-ready status/i);
    expect(adversarialReviewsByLane.get('buyer evidence')?.stop_gate).toMatch(/Do not override buyer evidence blockers/i);
    expect(adversarialReviewsByLane.get('production approval')?.proof_type).toBe('production_approval_adversarial_review');
    expect(adversarialReviewsByLane.get('production approval')?.proof_boundary).toMatch(/does not grant production approval|run deploys|prove live parity/i);
    expect(adversarialReviewsByLane.get('release toolchain')?.proof_type).toBe('release_toolchain_adversarial_review');
    expect(adversarialReviewsByLane.get('release toolchain')?.proof_boundary).toMatch(/does not install tools|run release-readiness|clear provenance|approve release/i);
    expect(adversarialReviewsByLane.get('Supabase advisor clearance')?.proof_type).toBe('external_advisor_adversarial_review');
    expect(adversarialReviewsByLane.get('Supabase advisor clearance')?.proof_boundary).toMatch(/does not access dashboards|run migrations|alter secrets|prove RLS\/performance clearance/i);
    expect(adversarialReviewsByLane.get('branch risk')?.proof_type).toBe('branch_risk_adversarial_review');
    expect(adversarialReviewsByLane.get('branch risk')?.proof_boundary).toMatch(/does not checkout|merge|push|select canonical heads|deploy/i);
    expect(manifest.buyer_evidence.status).toBe('skipped');
    expect(manifest.buyer_evidence.production_registers).toBeNull();
    expect(manifest.buyer_evidence.starter_only_registers).toBeNull();
    expect(manifest.buyer_evidence.outreach_logs).toBeNull();
    expect(manifest.buyer_evidence.confidence_moving_rows).toBeNull();
    expect(manifest.buyer_evidence.actionable_outreach_rows).toBeNull();
    expect(manifest.buyer_evidence.batchable_intake_packet_rows).toBeNull();
    expect(manifest.buyer_evidence.phase_f_gate).toBe('unknown');
    expect(manifest.buyer_evidence.evidence).toContain('Buyer evidence review');
    expect(manifest.buyer_evidence.workspace_next_step).toContain('report:buyer-evidence-readiness');
    expect(manifest.buyer_evidence.hard_gate_deficits.status).toBe('skipped');
    expect(manifest.buyer_evidence.hard_gate_deficits.open_count).toBeNull();
    expect(manifest.buyer_evidence.hard_gate_deficits.total_count).toBeNull();
    expect(manifest.buyer_evidence.hard_gate_deficits.items).toEqual([]);
    expect(manifest.buyer_evidence.hard_gate_deficits.evidence).toContain('Buyer hard-gate deficit ledger skipped');
    expect(manifest.buyer_evidence.hard_gate_deficits.remediation_queue.status).toBe('skipped');
    expect(manifest.buyer_evidence.hard_gate_deficits.remediation_queue.evidence).toContain('Buyer evidence remediation queue skipped');
    expect(manifest.buyer_evidence.hard_gate_deficits.remediation_queue.open_count).toBeNull();
    expect(manifest.buyer_evidence.hard_gate_deficits.remediation_queue.total_count).toBeNull();
    expect(manifest.buyer_evidence.hard_gate_deficits.remediation_queue.item_count).toBe(0);
    expect(manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items).toEqual([]);
    expect(manifest.buyer_evidence.acquisition_matrix.status).toBe('blocked');
    expect(manifest.buyer_evidence.acquisition_matrix.proof_type).toBe('buyer_evidence_acquisition_matrix');
    expect(manifest.buyer_evidence.acquisition_matrix.evidence).toContain('Buyer evidence acquisition matrix');
    expect(manifest.buyer_evidence.acquisition_matrix.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|move confidence|claim buyer acceptance/i);
    expect(manifest.buyer_evidence.acquisition_matrix.stop_gate).toMatch(/Do not mark buyer evidence ready|validate:pilot-evidence --require-95/i);
    expect(manifest.buyer_evidence.acquisition_matrix.row_count).toBeGreaterThanOrEqual(10);
    expect(manifest.buyer_evidence.acquisition_matrix.blocked_count).toBe(manifest.buyer_evidence.acquisition_matrix.row_count);
    const acquisitionRowsByLane = mapBy(
      manifest.buyer_evidence.acquisition_matrix.rows,
      (item: {
        lane: string;
        proof_type?: string;
        validation_command?: string;
        blocks_buyer_gate?: boolean;
      }) => item.lane,
    );
    expect(acquisitionRowsByLane.get('Outreach response log intake')?.proof_type).toBe('outreach_intake_acquisition');
    expect(acquisitionRowsByLane.get('Outreach response log intake')?.validation_command).toContain('plan:outreach-intake');
    expect(acquisitionRowsByLane.get('Production pilot evidence register')?.proof_type).toBe('production_register_acquisition');
    expect(acquisitionRowsByLane.get('Utility forecast lane')?.validation_command).toContain('prepare:forecast-trust-report-artifact');
    expect(acquisitionRowsByLane.get('Retained-artifact 95% validation')?.validation_command).toContain('validate:pilot-evidence');
    expect(acquisitionRowsByLane.get('Retained-artifact 95% validation')?.blocks_buyer_gate).toBe(true);
    expect(manifest.supabase_advisor.status).toBe('needs_remediation');
    expect(manifest.supabase_advisor.project_ref).toBe('qnymbecjgeaoxsfphrti');
    expect(manifest.supabase_advisor.cli_app_lint_status).toBe('watch');
    expect(manifest.supabase_advisor.security_performance_advisors_status).toBe('needs_remediation');
    expect(manifest.supabase_advisor.connector_permission).toBe('permission_denied');
    expect(manifest.supabase_advisor.evidence).toContain('Supabase advisor review');
    expect(manifest.supabase_advisor.evidence_boundary).toMatch(/does not substitute|permission denied/i);
    expect(manifest.supabase_advisor.clearance_deficits.status).toBe('needs_remediation');
    expect(manifest.supabase_advisor.clearance_deficits.open_count).toBeGreaterThanOrEqual(3);
    expect(manifest.supabase_advisor.clearance_deficits.total_count).toBe(6);
    expect(manifest.supabase_advisor.clearance_deficits.evidence).toContain('Supabase advisor clearance deficit ledger');
    expect(manifest.supabase_advisor.clearance_deficits.items.map((item: { requirement: string }) => item.requirement)).toEqual([
      'CLI app lint freshness',
      'Connector project authorization',
      'Security advisor evidence',
      'Performance advisor evidence',
      'Public-safe findings record',
      'Advisor clearance claim',
    ]);
    expect(manifest.supabase_advisor.clearance_deficits.remediation_queue.status).toMatch(/needs_remediation|pass/);
    expect(manifest.supabase_advisor.clearance_deficits.remediation_queue.evidence).toContain('Supabase advisor remediation queue');
    expect(manifest.supabase_advisor.clearance_deficits.remediation_queue.open_count).toBe(manifest.supabase_advisor.clearance_deficits.open_count);
    expect(manifest.supabase_advisor.clearance_deficits.remediation_queue.total_count).toBe(manifest.supabase_advisor.clearance_deficits.total_count);
    expect(manifest.supabase_advisor.clearance_deficits.remediation_queue.item_count).toBe(manifest.supabase_advisor.clearance_deficits.remediation_queue.items.length);
    expect(manifest.supabase_advisor.clearance_deficits.remediation_queue.items.map((item: { requirement: string }) => item.requirement)).toEqual(
      manifest.supabase_advisor.clearance_deficits.items
        .filter((item: { status: string }) => item.status !== 'pass')
        .map((item: { requirement: string }) => item.requirement),
    );
    if (manifest.supabase_advisor.clearance_deficits.remediation_queue.items.length > 0) {
      const firstSupabaseAction = manifest.supabase_advisor.clearance_deficits.remediation_queue.items[0];
      expect(firstSupabaseAction.owner).toBeTruthy();
      expect(firstSupabaseAction.action).toBeTruthy();
      expect(firstSupabaseAction.proof_command).toBeTruthy();
      expect(firstSupabaseAction.stop_gate).toMatch(/Do not/i);
      expect(firstSupabaseAction.status).not.toBe('ready');
    }
    const supabaseDeficitsByRequirement = mapBy(
      manifest.supabase_advisor.clearance_deficits.items,
      (item: {
        requirement: string;
        proof_type?: string;
        external_account_required?: boolean;
        proof_boundary?: string;
        stop_gate?: string;
      }) => item.requirement,
    );
    const supabaseActionsByRequirement = mapBy(
      manifest.supabase_advisor.clearance_deficits.remediation_queue.items,
      (item: {
        requirement: string;
        proof_type?: string;
        external_account_required?: boolean;
        proof_boundary?: string;
      }) => item.requirement,
    );
    expect(supabaseDeficitsByRequirement.get('CLI app lint freshness')?.proof_type).toBe('repo_command');
    expect(supabaseDeficitsByRequirement.get('CLI app lint freshness')?.external_account_required).toBe(false);
    expect(supabaseActionsByRequirement.get('CLI app lint freshness')?.proof_type).toBe('repo_command');
    expect(supabaseActionsByRequirement.get('CLI app lint freshness')?.external_account_required).toBe(false);
    for (const requirement of ['Connector project authorization', 'Security advisor evidence', 'Performance advisor evidence']) {
      const deficit = supabaseDeficitsByRequirement.get(requirement);
      const item = supabaseActionsByRequirement.get(requirement);
      expect(deficit?.proof_type).toBe('external_account_evidence');
      expect(deficit?.external_account_required).toBe(true);
      expect(deficit?.proof_boundary).toMatch(/authorized|dashboard|connector|Advisor/i);
      expect(deficit?.stop_gate).toMatch(/Do not|permission-denied|advisor evidence/i);
      expect(item?.proof_type).toBe('external_account_evidence');
      expect(item?.external_account_required).toBe(true);
      expect(item?.proof_boundary).toMatch(/authorized|dashboard|connector|Advisor/i);
    }
    expect(supabaseDeficitsByRequirement.get('Public-safe findings record')?.proof_type).toBe('retained_redacted_record');
    expect(supabaseDeficitsByRequirement.get('Public-safe findings record')?.external_account_required).toBe(false);
    expect(supabaseDeficitsByRequirement.get('Public-safe findings record')?.proof_boundary).toMatch(/retained redacted advisor summary|no secrets/i);
    expect(supabaseActionsByRequirement.get('Public-safe findings record')?.proof_type).toBe('retained_redacted_record');
    expect(supabaseActionsByRequirement.get('Public-safe findings record')?.external_account_required).toBe(false);
    expect(supabaseDeficitsByRequirement.get('Advisor clearance claim')?.proof_type).toBe('repo_command');
    expect(supabaseDeficitsByRequirement.get('Advisor clearance claim')?.external_account_required).toBe(false);
    expect(supabaseDeficitsByRequirement.get('Advisor clearance claim')?.proof_boundary).toMatch(/only after every|public-safe evidence row passes/i);
    expect(supabaseActionsByRequirement.get('Advisor clearance claim')?.proof_type).toBe('repo_command');
    expect(supabaseActionsByRequirement.get('Advisor clearance claim')?.external_account_required).toBe(false);
    expect(manifest.release_preflight.status).toBe('blocked');
    expect(manifest.release_preflight.package_manager).toBe('pnpm@10.23.0');
    expect(manifest.release_preflight.expected_pnpm_version).toBe('10.23.0');
    expect(manifest.release_preflight.corepack_probe).toBe('skipped');
    expect(manifest.release_preflight.git_lfs_probe).toBe('skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.status).toBe('skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.evidence).toContain('Release toolchain probe ledger skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.items.map((item: { id: string }) => item.id)).toEqual([
      'corepack_pnpm_resolver',
      'git_lfs_push_path',
    ]);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].command).toBe('corepack pnpm --version');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].current).toBe('skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].proof_type).toBe('corepack_pnpm_toolchain_probe');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].proof_boundary).toMatch(/release-shell evidence only|does not install tools|run release-readiness|push|deploy/i);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].evidence_boundary).toMatch(/does not install tools/i);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].stop_gate).toMatch(/bare pnpm|local shims|skipped probes/i);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].command).toBe('git lfs version');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].current).toBe('skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].proof_type).toBe('git_lfs_push_path_probe');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].proof_boundary).toMatch(/release-shell evidence only|does not install Git LFS|push|deploy/i);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].evidence_boundary).toMatch(/does not install tools/i);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].stop_gate).toMatch(/commit hook warnings|previous pushes|skipped probes|missing git-lfs binary/i);
    expect(manifest.release_preflight.evidence).toContain('Release toolchain and approval deficit ledger');
    expect(manifest.release_preflight.items.map((item: { requirement: string }) => item.requirement)).toEqual([
      'Pinned package manager',
      'Corepack pnpm resolver',
      'Release-readiness execution',
      'Git LFS push-path proof',
      'Clean source provenance',
      'Explicit owner production approval',
    ]);
    const releaseDeficitsByRequirement = mapBy(
      manifest.release_preflight.items,
      (item: {
        requirement: string;
        proof_type?: string;
        proof_boundary?: string;
        stop_gate?: string;
      }) => item.requirement,
    );
    expect(releaseDeficitsByRequirement.get('Pinned package manager')?.proof_type).toBe('package_manager_pin');
    expect(releaseDeficitsByRequirement.get('Pinned package manager')?.proof_boundary).toMatch(/does not prove Corepack resolution|release-readiness execution|Git LFS push-path availability/i);
    expect(releaseDeficitsByRequirement.get('Pinned package manager')?.stop_gate).toMatch(/pin alone|Corepack resolution|deploy readiness/i);
    expect(releaseDeficitsByRequirement.get('Corepack pnpm resolver')?.proof_type).toBe('toolchain_probe');
    expect(releaseDeficitsByRequirement.get('Corepack pnpm resolver')?.proof_boundary).toMatch(/does not install tools/i);
    expect(releaseDeficitsByRequirement.get('Git LFS push-path proof')?.proof_type).toBe('toolchain_probe');
    expect(releaseDeficitsByRequirement.get('Git LFS push-path proof')?.proof_boundary).toMatch(/does not install Git LFS/i);
    expect(releaseDeficitsByRequirement.get('Release-readiness execution')?.proof_type).toBe('gated_release_command');
    expect(releaseDeficitsByRequirement.get('Release-readiness execution')?.proof_boundary).toMatch(/does not grant owner approval|hosted\/live parity/i);
    expect(releaseDeficitsByRequirement.get('Clean source provenance')?.proof_type).toBe('source_provenance_decision');
    expect(releaseDeficitsByRequirement.get('Clean source provenance')?.proof_boundary).toMatch(/does not commit|clear provenance/i);
    expect(releaseDeficitsByRequirement.get('Explicit owner production approval')?.proof_type).toBe('manual_approval');
    expect(releaseDeficitsByRequirement.get('Explicit owner production approval')?.proof_boundary).toMatch(/does not approve|deploy|live parity/i);
    expect(manifest.release_preflight.clearance_matrix.status).toBe('blocked');
    expect(manifest.release_preflight.clearance_matrix.proof_type).toBe('release_preflight_clearance_matrix');
    expect(manifest.release_preflight.clearance_matrix.evidence).toContain('Release preflight clearance matrix');
    expect(manifest.release_preflight.clearance_matrix.proof_boundary).toMatch(/does not install tools|run release-readiness|clear source provenance|push|deploy|hosted\/live parity|grant owner approval/i);
    expect(manifest.release_preflight.clearance_matrix.stop_gate).toMatch(/Do not mark release approval ready|Corepack-pinned release-readiness|Git LFS push-path proof|owner approval/i);
    expect(manifest.release_preflight.clearance_matrix.row_count).toBe(manifest.release_preflight.items.length);
    expect(manifest.release_preflight.clearance_matrix.blocked_count).toBeGreaterThanOrEqual(1);
    expect(manifest.release_preflight.clearance_matrix.rows.map((item: { requirement: string }) => item.requirement)).toEqual(
      manifest.release_preflight.items.map((item: { requirement: string }) => item.requirement),
    );
    const releaseClearanceRowsByRequirement = mapBy(
      manifest.release_preflight.clearance_matrix.rows,
      (item: {
        requirement: string;
        proof_type?: string;
        proof_boundary?: string;
        proof_command?: string;
        release_impact?: string;
        blocks_release_gate?: boolean;
        status?: string;
      }) => item.requirement,
    );
    expect(releaseClearanceRowsByRequirement.get('Corepack pnpm resolver')?.proof_type).toBe('toolchain_probe');
    expect(releaseClearanceRowsByRequirement.get('Corepack pnpm resolver')?.proof_command).toBe('corepack pnpm --version');
    expect(releaseClearanceRowsByRequirement.get('Release-readiness execution')?.proof_type).toBe('gated_release_command');
    expect(releaseClearanceRowsByRequirement.get('Release-readiness execution')?.proof_command).toBe('corepack pnpm run check:release-readiness');
    expect(releaseClearanceRowsByRequirement.get('Clean source provenance')?.proof_type).toBe('source_provenance_decision');
    expect(releaseClearanceRowsByRequirement.get('Clean source provenance')?.proof_boundary).toMatch(/does not commit|clear provenance/i);
    expect(releaseClearanceRowsByRequirement.get('Clean source provenance')?.blocks_release_gate).toBe(true);
    expect(releaseClearanceRowsByRequirement.get('Explicit owner production approval')?.proof_type).toBe('manual_approval');
    expect(releaseClearanceRowsByRequirement.get('Explicit owner production approval')?.proof_command).toBe('corepack pnpm run check:production-deploy-request');
    expect(releaseClearanceRowsByRequirement.get('Explicit owner production approval')?.status).toBe('manual_stop');
    expect(releaseClearanceRowsByRequirement.get('Explicit owner production approval')?.release_impact).toMatch(/production deploy|hosted-live claim|owner approval/i);
    expect(manifest.release_preflight.remediation_queue.status).toMatch(/blocked|pass/);
    expect(manifest.release_preflight.remediation_queue.evidence).toContain('Release preflight remediation queue');
    const releaseActionsByRequirement = mapBy(
      manifest.release_preflight.remediation_queue.items,
      (item: {
        requirement: string;
        proof_type?: string;
        proof_boundary?: string;
      }) => item.requirement,
    );
    expect(releaseActionsByRequirement.get('Corepack pnpm resolver')?.proof_type).toBe('toolchain_probe');
    expect(releaseActionsByRequirement.get('Corepack pnpm resolver')?.proof_boundary).toMatch(/does not install tools/i);
    expect(releaseActionsByRequirement.get('Git LFS push-path proof')?.proof_type).toBe('toolchain_probe');
    expect(releaseActionsByRequirement.get('Git LFS push-path proof')?.proof_boundary).toMatch(/does not install Git LFS/i);
    expect(releaseActionsByRequirement.get('Release-readiness execution')?.proof_type).toBe('gated_release_command');
    expect(releaseActionsByRequirement.get('Release-readiness execution')?.proof_boundary).toMatch(/does not grant owner approval/i);
    expect(releaseActionsByRequirement.get('Clean source provenance')?.proof_type).toBe('source_provenance_decision');
    expect(releaseActionsByRequirement.get('Clean source provenance')?.proof_boundary).toMatch(/does not commit/i);
    expect(releaseActionsByRequirement.get('Explicit owner production approval')?.proof_type).toBe('manual_approval');
    expect(releaseActionsByRequirement.get('Explicit owner production approval')?.proof_boundary).toMatch(/does not approve/i);
    expect(manifest.release_preflight.remediation_queue.open_count).toBe(manifest.release_preflight.open_count);
    expect(manifest.release_preflight.remediation_queue.total_count).toBe(manifest.release_preflight.total_count);
    expect(manifest.release_preflight.remediation_queue.item_count).toBe(manifest.release_preflight.remediation_queue.items.length);
    expect(manifest.release_preflight.remediation_queue.items.map((item: { requirement: string }) => item.requirement)).toEqual(
      manifest.release_preflight.items
        .filter((item: { status: string }) => item.status !== 'pass')
        .map((item: { requirement: string }) => item.requirement),
    );
    if (manifest.release_preflight.remediation_queue.items.length > 0) {
      const firstReleaseAction = manifest.release_preflight.remediation_queue.items[0];
      expect(firstReleaseAction.owner).toBeTruthy();
      expect(firstReleaseAction.action).toBeTruthy();
      expect(firstReleaseAction.proof_command).toBeTruthy();
      expect(firstReleaseAction.stop_gate).toMatch(/Do not/i);
      expect(firstReleaseAction.status).not.toBe('ready');
    }
    expect(manifest.launch_action_queue.status).toBe('blocked');
    expect(manifest.launch_action_queue.evidence).toContain('Launch blocker action queue');
    expect(manifest.launch_action_queue.items.map((item: { phase: string }) => item.phase)).toEqual([
      'source_provenance',
      'launch_evidence_validation',
      'release_toolchain',
      'branch_review',
      'supabase_advisor',
      'buyer_evidence',
      'production_approval',
      'post_deploy_live_proof',
    ]);
    const launchActionsByPhase = mapBy(
      manifest.launch_action_queue.items,
      (item: {
        phase: string;
        proof_type?: string;
        proof_boundary?: string;
      }) => item.phase,
    );
    expect(launchActionsByPhase.get('source_provenance')?.proof_type).toBe('source_provenance_decision');
    expect(launchActionsByPhase.get('source_provenance')?.proof_boundary).toMatch(/does not commit|clear provenance/i);
    expect(launchActionsByPhase.get('launch_evidence_validation')?.proof_type).toBe('manifest_validation_and_approval_packet');
    expect(launchActionsByPhase.get('launch_evidence_validation')?.proof_boundary).toMatch(/structure and readiness reporting only|does not grant production approval/i);
    expect(launchActionsByPhase.get('release_toolchain')?.proof_type).toBe('release_toolchain_and_gated_release');
    expect(launchActionsByPhase.get('release_toolchain')?.proof_boundary).toMatch(/local release-shell checks|hosted\/live parity/i);
    expect(launchActionsByPhase.get('branch_review')?.proof_type).toBe('read_only_branch_review');
    expect(launchActionsByPhase.get('branch_review')?.proof_boundary).toMatch(/read-only|does not checkout/i);
    expect(launchActionsByPhase.get('supabase_advisor')?.proof_type).toBe('external_account_evidence');
    expect(launchActionsByPhase.get('supabase_advisor')?.proof_boundary).toMatch(/authorized Supabase dashboard or connector/i);
    expect(launchActionsByPhase.get('buyer_evidence')?.proof_type).toBe('retained_buyer_evidence_validation');
    expect(launchActionsByPhase.get('buyer_evidence')?.proof_boundary).toMatch(/real anonymized accepted buyer rows|retained redacted artifacts/i);
    expect(launchActionsByPhase.get('production_approval')?.proof_type).toBe('manual_approval_gate');
    expect(launchActionsByPhase.get('production_approval')?.proof_boundary).toMatch(/does not approve|deploy/i);
    expect(launchActionsByPhase.get('post_deploy_live_proof')?.proof_type).toBe('post_deploy_live_proof_gate');
    expect(launchActionsByPhase.get('post_deploy_live_proof')?.proof_boundary).toMatch(/guarded deploy completion|does not deploy/i);
    expect(manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'branch_review').stop_gate).toMatch(/No checkout, merge, push/i);
    const launchEvidenceValidationAction = manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'launch_evidence_validation');
    expect(launchEvidenceValidationAction.proof_command).toBe('corepack pnpm run check:launch-evidence-manifest && corepack pnpm run report:production-approval-packet');
    expect(launchEvidenceValidationAction.stop_gate).toMatch(/production approval, buyer acceptance, deployment, or current hosted\/live parity/i);
    const releaseToolchainAction = manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'release_toolchain');
    expect(releaseToolchainAction.blocker).toMatch(/release-toolchain probe/i);
    expect(releaseToolchainAction.action).toMatch(/Refresh the release toolchain probe ledger/i);
    expect(releaseToolchainAction.proof_command).toBe('corepack pnpm run report:launch-evidence-manifest && corepack pnpm run check:release-readiness');
    expect(releaseToolchainAction.stop_gate).toMatch(/probe ledger/i);
    expect(manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'buyer_evidence').stop_gate).toMatch(/Do not count templates/i);
    expect(manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'buyer_evidence').status).toBe('blocked');
    expect(manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'post_deploy_live_proof').proof_command).toBe('corepack pnpm run check:post-deploy-live');
    expect(manifest.production_approval.status).toBe('blocked');
    expect(manifest.production_approval.explicit_owner_approval).toBe(false);
    expect(manifest.production_approval.evidence).toContain('Production approval prerequisite queue');
    expect(manifest.production_approval.stop_gate).toMatch(/does not grant production approval/i);
    expect(manifest.production_approval.prerequisite_queue.status).toBe('blocked');
    expect(manifest.production_approval.prerequisite_queue.evidence).toContain('Production approval prerequisite queue');
    expect(manifest.production_approval.prerequisite_queue.item_count).toBe(8);
    expect(manifest.production_approval.prerequisite_queue.items.map((item: { prerequisite: string }) => item.prerequisite)).toEqual([
      'Clean source provenance',
      'Launch evidence validation',
      'Corepack release-readiness',
      'Canonical branch review',
      'Supabase advisor clearance',
      'Buyer evidence hard gate',
      'Explicit owner production approval',
      'Post-deploy live proof boundary',
    ]);
    expect(manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Explicit owner production approval').status).toBe('manual_stop');
    const launchEvidenceValidationPrerequisite = manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Launch evidence validation');
    expect(launchEvidenceValidationPrerequisite.current).toMatch(/external to manifest generation|attach passing check:launch-evidence-manifest output/i);
    expect(launchEvidenceValidationPrerequisite.status).toBe('ready');
    expect(launchEvidenceValidationPrerequisite.proof_command).toBe('corepack pnpm run check:launch-evidence-manifest');
    expect(launchEvidenceValidationPrerequisite.stop_gate).toMatch(/production approval, buyer acceptance, deployment, or current hosted\/live parity/i);
    const releaseReadinessPrerequisite = manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Corepack release-readiness');
    expect(releaseReadinessPrerequisite.current).toMatch(/release-toolchain probe/i);
    expect(releaseReadinessPrerequisite.needed).toMatch(/Corepack\/Git LFS probe ledger/i);
    expect(releaseReadinessPrerequisite.proof_command).toBe('corepack pnpm run report:launch-evidence-manifest && corepack pnpm run check:release-readiness');
    expect(releaseReadinessPrerequisite.stop_gate).toMatch(/probe ledger/i);
    expect(manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Explicit owner production approval').current).toBe('not granted by this manifest or report');
    expect(manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Post-deploy live proof boundary').status).toBe('blocked');
    expect(manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Post-deploy live proof boundary').proof_command).toBe('corepack pnpm run check:post-deploy-live');
    const productionPrerequisitesByName = mapBy(
      manifest.production_approval.prerequisite_queue.items,
      (item: {
        prerequisite: string;
        proof_type?: string;
        proof_boundary?: string;
      }) => item.prerequisite,
    );
    expect(productionPrerequisitesByName.get('Clean source provenance')?.proof_type).toBe('source_provenance_decision');
    expect(productionPrerequisitesByName.get('Clean source provenance')?.proof_boundary).toMatch(/does not commit|clear provenance/i);
    expect(productionPrerequisitesByName.get('Launch evidence validation')?.proof_type).toBe('manifest_validation');
    expect(productionPrerequisitesByName.get('Launch evidence validation')?.proof_boundary).toMatch(/structure only|does not grant production approval/i);
    expect(productionPrerequisitesByName.get('Corepack release-readiness')?.proof_type).toBe('gated_release_command');
    expect(productionPrerequisitesByName.get('Corepack release-readiness')?.proof_boundary).toMatch(/does not grant owner approval|hosted\/live parity/i);
    expect(productionPrerequisitesByName.get('Canonical branch review')?.proof_type).toBe('read_only_branch_review');
    expect(productionPrerequisitesByName.get('Canonical branch review')?.proof_boundary).toMatch(/read-only|does not checkout/i);
    expect(productionPrerequisitesByName.get('Supabase advisor clearance')?.proof_type).toBe('external_account_evidence');
    expect(productionPrerequisitesByName.get('Supabase advisor clearance')?.proof_boundary).toMatch(/authorized Supabase dashboard or connector/i);
    expect(productionPrerequisitesByName.get('Buyer evidence hard gate')?.proof_type).toBe('retained_buyer_evidence_validation');
    expect(productionPrerequisitesByName.get('Buyer evidence hard gate')?.proof_boundary).toMatch(/real anonymized accepted buyer rows|retained redacted artifacts/i);
    expect(productionPrerequisitesByName.get('Explicit owner production approval')?.proof_type).toBe('manual_approval');
    expect(productionPrerequisitesByName.get('Explicit owner production approval')?.proof_boundary).toMatch(/does not approve|deploy/i);
    expect(productionPrerequisitesByName.get('Post-deploy live proof boundary')?.proof_type).toBe('post_deploy_live_proof_gate');
    expect(productionPrerequisitesByName.get('Post-deploy live proof boundary')?.proof_boundary).toMatch(/guarded deploy completion|does not deploy/i);
    const productionRequestPacket = manifest.production_approval.request_packet;
    expect(productionRequestPacket.status).toBe('blocked');
    expect(productionRequestPacket.proof_type).toBe('production_approval_request_packet');
    expect(productionRequestPacket.evidence).toContain('Production approval request packet');
    expect(productionRequestPacket.request_eligible).toBe(false);
    expect(productionRequestPacket.item_count).toBe(manifest.production_approval.prerequisite_queue.items.length);
    expect(productionRequestPacket.request_blocking_count).toBeGreaterThanOrEqual(1);
    expect(productionRequestPacket.proof_boundary).toMatch(/organizes evidence for owner review only|does not grant owner approval|run deploys|hosted\/live parity/i);
    expect(productionRequestPacket.stop_gate).toMatch(/Do not request or claim production approval|deploy-production|netlify deploy/i);
    const productionRequestRowsByName = mapBy(
      productionRequestPacket.items,
      (item: {
        prerequisite: string;
        request_phase?: string;
        evidence_to_attach?: string;
        blocks_request?: boolean;
        status?: string;
        source_status?: string;
      }) => item.prerequisite,
    );
    expect(productionRequestPacket.items.map((item: { prerequisite: string }) => item.prerequisite)).toEqual(
      manifest.production_approval.prerequisite_queue.items.map((item: { prerequisite: string }) => item.prerequisite),
    );
    expect(productionRequestRowsByName.get('Launch evidence validation')?.request_phase).toBe('pre_request');
    expect(productionRequestRowsByName.get('Launch evidence validation')?.source_status).toBe('ready');
    expect(productionRequestRowsByName.get('Launch evidence validation')?.blocks_request).toBe(false);
    expect(productionRequestRowsByName.get('Explicit owner production approval')?.request_phase).toBe('owner_decision');
    expect(productionRequestRowsByName.get('Explicit owner production approval')?.blocks_request).toBe(false);
    expect(productionRequestRowsByName.get('Explicit owner production approval')?.status).toBe('manual_stop');
    expect(productionRequestRowsByName.get('Post-deploy live proof boundary')?.request_phase).toBe('post_deploy_boundary');
    expect(productionRequestRowsByName.get('Post-deploy live proof boundary')?.blocks_request).toBe(false);
    expect(productionRequestRowsByName.get('Clean source provenance')?.evidence_to_attach).toMatch(/source-provenance/i);
    expect(productionRequestRowsByName.get('Buyer evidence hard gate')?.evidence_to_attach).toMatch(/validate:pilot-evidence/i);
    expect(manifest.post_deploy_live_proof.status).toBe('blocked');
    expect(manifest.post_deploy_live_proof.current_source_live_proven).toBe(false);
    expect(manifest.post_deploy_live_proof.evidence).toContain('Post-deploy live proof gate queue');
    expect(manifest.post_deploy_live_proof.stop_gate).toMatch(/does not prove hosted\/live parity/i);
    expect(manifest.post_deploy_live_proof.gate_queue.status).toBe('blocked');
    expect(manifest.post_deploy_live_proof.gate_queue.evidence).toContain('Post-deploy live proof gate queue');
    expect(manifest.post_deploy_live_proof.gate_queue.item_count).toBe(6);
    expect(manifest.post_deploy_live_proof.gate_queue.items.map((item: { gate: string }) => item.gate)).toEqual([
      'Production approval clearance',
      'Guarded production deploy completion',
      'Live public metadata',
      'Live static dist parity',
      'Hosted proof-pack route smoke',
      'Current-source hosted parity claim',
    ]);
    expect(manifest.post_deploy_live_proof.gate_queue.items.find((item: { gate: string }) => item.gate === 'Live public metadata').proof_command).toBe('corepack pnpm run check:live-public-metadata');
    expect(manifest.post_deploy_live_proof.gate_queue.items.find((item: { gate: string }) => item.gate === 'Live static dist parity').proof_command).toBe('corepack pnpm run check:live-static-parity');
    expect(manifest.post_deploy_live_proof.gate_queue.items.find((item: { gate: string }) => item.gate === 'Hosted proof-pack route smoke').proof_command).toBe('corepack pnpm run test:browser:hosted:proof-packs');
    const deployCompletionGate = manifest.post_deploy_live_proof.gate_queue.items.find((item: { gate: string }) => item.gate === 'Guarded production deploy completion');
    expect(deployCompletionGate.proof_command).toBe('corepack pnpm run check:production-deploy-request && scripts/deploy-production.sh');
    expect(deployCompletionGate.proof_command).not.toBe('scripts/deploy-production.sh');
    expect(deployCompletionGate.approval_required).toBe(true);
    expect(deployCompletionGate.approval_command).toBe('corepack pnpm run check:production-deploy-request');
    expect(deployCompletionGate.execution_command).toBe('scripts/deploy-production.sh');
    expect(deployCompletionGate.approval_phrase).toBe('DEPLOY CEIP PRODUCTION');
    expect(deployCompletionGate.stop_gate).toContain('DEPLOY CEIP PRODUCTION');
    expect(manifest.post_deploy_live_proof.gate_queue.items.find((item: { gate: string }) => item.gate === 'Current-source hosted parity claim').status).toBe('blocked');
    const postDeployProofTypesByGate = mapBy(
      manifest.post_deploy_live_proof.gate_queue.items,
      (item: {
        gate: string;
        proof_type?: string;
        proof_boundary?: string;
      }) => item.gate,
    );
    expect(postDeployProofTypesByGate.get('Production approval clearance')?.proof_type).toBe('manual_approval_gate');
    expect(postDeployProofTypesByGate.get('Production approval clearance')?.proof_boundary).toMatch(/does not grant owner approval|does not.*deploy/i);
    expect(postDeployProofTypesByGate.get('Guarded production deploy completion')?.proof_type).toBe('approved_deploy_execution');
    expect(postDeployProofTypesByGate.get('Guarded production deploy completion')?.proof_boundary).toMatch(/explicit owner approval|typed deploy phrase/i);
    expect(postDeployProofTypesByGate.get('Live public metadata')?.proof_type).toBe('hosted_metadata_probe');
    expect(postDeployProofTypesByGate.get('Live public metadata')?.proof_boundary).toMatch(/metadata evidence alone does not prove static parity/i);
    expect(postDeployProofTypesByGate.get('Live static dist parity')?.proof_type).toBe('hosted_static_parity_probe');
    expect(postDeployProofTypesByGate.get('Live static dist parity')?.proof_boundary).toMatch(/does not rebuild dist/i);
    expect(postDeployProofTypesByGate.get('Hosted proof-pack route smoke')?.proof_type).toBe('hosted_browser_smoke');
    expect(postDeployProofTypesByGate.get('Hosted proof-pack route smoke')?.proof_boundary).toMatch(/local smoke|constructed demos|skipped smoke/i);
    expect(postDeployProofTypesByGate.get('Current-source hosted parity claim')?.proof_type).toBe('post_deploy_parity_claim');
    expect(postDeployProofTypesByGate.get('Current-source hosted parity claim')?.proof_boundary).toMatch(/does not create live proof/i);
    expect(manifest.source_provenance.branch).toBeTruthy();
    expect(manifest.source_provenance.commit).toBeTruthy();
    expect(Number.isInteger(manifest.source_provenance.dirty_path_count)).toBe(true);
    expect(manifest.source_provenance.evidence).toContain('Source provenance:');
    if (manifest.source_provenance.dirty_paths.length > 0) {
      expect(manifest.source_provenance.dirty_paths[0].index_status).toBeTruthy();
      expect(manifest.source_provenance.dirty_paths[0].worktree_status).toBeTruthy();
      expect(manifest.source_provenance.dirty_paths[0].staging_state).toBeTruthy();
      expect(manifest.source_provenance.dirty_paths[0].proof_type).toBeTruthy();
      expect(manifest.source_provenance.dirty_paths[0].owner_decision_required).toBe(true);
      expect(manifest.source_provenance.dirty_paths[0].proof_boundary).toMatch(/Raw source-provenance classification|does not.*commit|clear provenance|deploy|grant approval/i);
      expect(manifest.source_provenance.dirty_paths[0].stop_gate).toMatch(/explicit owner intent|classification evidence only|production approval/i);
      if (manifest.source_provenance.dirty_paths[0].old_path) {
        expect(manifest.source_provenance.dirty_paths[0].proof_type).toBe('source_rename_decision');
      }
      expect(manifest.source_provenance.evidence).toContain('staging_state=');
    }
    expect(manifest.source_provenance.deploy_gate).toContain('deploy');
    expect(manifest.source_provenance.isolation_ledger.status).toMatch(/blocked|pass/);
    expect(manifest.source_provenance.isolation_ledger.proof_type).toBe('source_provenance_isolation_ledger');
    expect(manifest.source_provenance.isolation_ledger.evidence).toContain('Source provenance isolation ledger');
    expect(manifest.source_provenance.isolation_ledger.proof_boundary).toMatch(/dirty-source release impact only|does not mutate source|clear provenance|deploy|grant production approval/i);
    expect(manifest.source_provenance.isolation_ledger.stop_gate).toMatch(/Do not request deploy approval|clean source provenance/i);
    expect(manifest.source_provenance.isolation_ledger.dirty_path_count).toBe(manifest.source_provenance.dirty_path_count);
    expect(manifest.source_provenance.isolation_ledger.rows.length).toBe(manifest.source_provenance.dirty_paths.length);
    if (manifest.source_provenance.isolation_ledger.rows.length > 0) {
      const firstIsolationRow = manifest.source_provenance.isolation_ledger.rows[0];
      expect(firstIsolationRow.release_impact).toMatch(/blocks clean source provenance|does not enter source by default|blocks release provenance/i);
      expect(firstIsolationRow.isolation_status).toBe('owner_decision_required');
      expect(firstIsolationRow.proof_command).toContain('git status --porcelain=v1');
      expect(firstIsolationRow.proof_command).toContain('report:production-approval-packet');
      expect(firstIsolationRow.proof_boundary).toMatch(/release-impact classification only|does not clear source provenance/i);
      expect(firstIsolationRow.stop_gate).toMatch(/explicit owner intent|release-readiness|production approval/i);
      expect(firstIsolationRow.blocks_release_source_gate).toBe(true);
      if (firstIsolationRow.old_path) {
        expect(firstIsolationRow.proof_type).toBe('source_rename_decision');
        expect(firstIsolationRow.release_impact).toMatch(/staged rename or move|owner decides/i);
      }
    }
    expect(manifest.source_provenance.resolution_queue.status).toMatch(/blocked|pass/);
    expect(manifest.source_provenance.resolution_queue.evidence).toContain('Source provenance resolution queue');
    expect(manifest.source_provenance.resolution_queue.dirty_path_count).toBe(manifest.source_provenance.dirty_path_count);
    expect(manifest.source_provenance.resolution_queue.item_count).toBe(manifest.source_provenance.resolution_queue.items.length);
    if (manifest.source_provenance.resolution_queue.items.length > 0) {
      const firstSourceDecision = manifest.source_provenance.resolution_queue.items[0];
      expect(firstSourceDecision.source_status).toBeTruthy();
      expect(firstSourceDecision.decision_required).toMatch(/Decide|Confirm/i);
      expect(firstSourceDecision.proof_command).toContain('report:production-approval-packet');
      expect(firstSourceDecision.proof_type).toBeTruthy();
      expect(firstSourceDecision.owner_decision_required).toBe(true);
      expect(firstSourceDecision.proof_boundary).toMatch(/does not.*(commit|rename|add|delete|mutate)|grant approval|clear provenance/i);
      expect(firstSourceDecision.stop_gate).toContain('explicit owner intent');
      expect(firstSourceDecision.status).toBe('blocked');
      if (firstSourceDecision.old_path) {
        expect(firstSourceDecision.proof_type).toBe('source_rename_decision');
        expect(firstSourceDecision.proof_boundary).toMatch(/staged rename or move|does not rename/i);
      }
    }
    expect(manifest.branch_review.status).toBe('skipped');
    expect(manifest.branch_review.probe_status).toBe('skipped');
    expect(manifest.branch_review.evidence_boundary).toMatch(/does not clear review-first branch families/i);
    expect(manifest.branch_review.risk_counts.high).toBeNull();
    expect(manifest.branch_review.family_counts.local_only).toBeNull();
    expect(manifest.branch_review.family_evidence).toContain('Branch family review skipped');
    expect(manifest.branch_review.freshness_counts.stale).toBeNull();
    expect(manifest.branch_review.freshness_evidence).toContain('Branch freshness review skipped');
    expect(manifest.branch_review.review_queue.status).toBe('skipped');
    expect(manifest.branch_review.review_queue.item_count).toBeNull();
    expect(manifest.branch_review.review_queue.review_first_count).toBeNull();
    expect(manifest.branch_review.review_queue.blocked_count).toBeNull();
    expect(manifest.branch_review.review_queue.evidence).toContain('Branch review queue skipped');
    expect(manifest.branch_review.review_queue.items).toEqual([]);
    expect(manifest.branch_review.canonical_head_decisions.status).toBe('skipped');
    expect(manifest.branch_review.canonical_head_decisions.open_count).toBeNull();
    expect(manifest.branch_review.canonical_head_decisions.items).toEqual([]);
    expect(manifest.branch_review.canonical_head_decisions.evidence).toContain('Canonical head decision ledger skipped');
    expect(manifest.branch_review.canonical_head_resolution_queue.status).toBe('skipped');
    expect(manifest.branch_review.canonical_head_resolution_queue.proof_type).toBe('canonical_head_resolution_queue');
    expect(manifest.branch_review.canonical_head_resolution_queue.evidence).toContain('Canonical head resolution queue skipped');
    expect(manifest.branch_review.canonical_head_resolution_queue.proof_boundary).toMatch(/owner-decision action list only|does not checkout|select canonical heads/i);
    expect(manifest.branch_review.canonical_head_resolution_queue.items).toEqual([]);
    expect(manifest.branch_review.review_first_packets.status).toBe('skipped');
    expect(manifest.branch_review.review_first_packets.item_count).toBeNull();
    expect(manifest.branch_review.review_first_packets.queue_review_first_count).toBeNull();
    expect(manifest.branch_review.review_first_packets.pass_count).toBeNull();
    expect(manifest.branch_review.review_first_packets.fail_count).toBeNull();
    expect(manifest.branch_review.review_first_packets.packets).toEqual([]);
    expect(manifest.branch_review.review_first_packets.evidence).toContain('Review-first branch packets skipped');
    expect(manifest.branch_review.top_review_packet.status).toBe('skipped');
    expect(manifest.branch_review.top_review_packet.branch).toBeNull();
    expect(manifest.branch_review.top_review_packet.changed_supabase_function_count).toBeNull();
    expect(manifest.branch_review.top_review_packet.changed_supabase_functions).toEqual([]);
    expect(manifest.branch_review.top_review_packet.canonical_head_comparison.status).toBe('skipped');
    expect(manifest.branch_review.top_review_packet.canonical_head_comparison.local_ref).toBeNull();
    expect(manifest.branch_review.top_review_packet.canonical_head_comparison.origin_ref).toBeNull();
    expect(manifest.branch_review.top_review_packet.canonical_head_comparison.local_only_count).toBeNull();
    expect(manifest.branch_review.top_review_packet.canonical_head_comparison.origin_only_count).toBeNull();
    expect(manifest.branch_review.top_review_packet.canonical_head_comparison.evidence).toContain('Canonical head comparison skipped');
    expect(manifest.branch_review.top_review_packet.evidence).toContain('Top branch review packet skipped');
    expect(manifest.branch_review.top_review_packet.evidence).toContain('approval_gate=no checkout/merge/deploy/migration/push');
    expect(manifest.branch_review.evidence).toContain('Branch family review skipped');
    expect(manifest.branch_review.evidence).toContain('Branch freshness review skipped');
    expect(manifest.branch_review.evidence).toContain('Branch review queue skipped');
    expect(manifest.branch_review.evidence).toContain('Review-first branch packets skipped');
    expect(manifest.branch_review.evidence).toContain('Top branch review packet skipped');
    expect(manifest.branch_review.evidence).toContain('Canonical head comparison skipped');
    expect(manifest.pain_points).toHaveLength(10);
    expect(manifest.pain_points[0].source_evidence.every((source: string) => source.startsWith('https://'))).toBe(true);
    expect(manifest.pain_points.every((item: {
      source_evidence: string[];
      proof_type?: string;
      proof_boundary?: string;
      stop_gate?: string;
    }) => item.source_evidence.every((source) => source.startsWith('https://')))).toBe(true);
    expect(manifest.pain_points.every((item: { proof_type?: string }) => item.proof_type === 'market_pain_source_research')).toBe(true);
    expect(manifest.pain_points[0].proof_boundary).toMatch(/source-backed market pain hypothesis|does not prove buyer acceptance|commercial-ready status/i);
    expect(manifest.pain_points[0].stop_gate).toMatch(/Do not treat source links|buyer proof|permission to contact buyers/i);
    expect(manifest.target_customers).toHaveLength(10);
    expect(manifest.target_customers.every((item: { proof_type?: string }) => item.proof_type === 'target_segment_ranking_hypothesis')).toBe(true);
    expect(manifest.target_customers[0].proof_boundary).toMatch(/Target segment ranking|does not prove named-account validation|outreach permission|commercial-ready status/i);
    expect(manifest.target_customers[0].stop_gate).toMatch(/Do not treat target ranking|permission to contact buyers|buyer-proven evidence/i);
    expect(manifest.outreach_plan.email_script_boundary).toContain('Do not claim buyer-proven 95% confidence');
    expect(manifest.fix_report.files_changed).toContain('tests/unit/launchEvidenceManifest.test.ts');
    expect(manifest.fix_report.tests_run).toEqual(expect.arrayContaining([
      'pnpm exec tsc -b --pretty false',
      'pnpm run test:e2e:preview',
      'pnpm run test:strategy-audit-slice',
    ]));
    expect(manifest.implementation_decisions).toHaveLength(13);
    expect(manifest.rejected_variants.length).toBeGreaterThanOrEqual(3);
    expect(manifest.code_optimization_reviews).toHaveLength(13);
    const safeFixDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES',
    );
    expect(safeFixDecision).toBeTruthy();
    expect(safeFixDecision.task_id).toBe('CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES');
    expect(safeFixDecision.chosen_variant).toBe('minimal manifest/report evidence patch');
    expect(safeFixDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-commercial-launch-readiness.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(safeFixDecision.tests_run).toEqual(expect.arrayContaining([
      'pnpm exec tsc -b --pretty false',
      'pnpm run test:e2e:preview',
      'pnpm run test:strategy-audit-slice',
    ]));
    expect(safeFixDecision.proof_boundary).toMatch(/does not clear buyer evidence|production approval|hosted\/live parity/i);
    const safeFixReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES',
    );
    expect(safeFixReview).toBeTruthy();
    expect(safeFixReview.target_task).toBe('CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES');
    expect(safeFixReview.policy).toBe('strict');
    expect(safeFixReview.verdict).toBe('pass');
    expect(safeFixReview.minimality_score).toBeGreaterThanOrEqual(4);
    expect(safeFixReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run test:e2e:preview',
      'pnpm run test:strategy-audit-slice',
    ]));
    expect(manifest.rejected_variants.map((item: { variant: string }) => item.variant)).toEqual(expect.arrayContaining([
      'Leave implementation_decisions, rejected_variants, and code_optimization_reviews empty.',
      'Reconstruct every historical safe-fix commit in the manifest.',
      'Add a separate new proof artifact for the preview TypeScript gate fix.',
      'Leave Launch evidence validation blocked inside the request packet.',
      'Run check-launch-evidence-manifest from report-launch-evidence-manifest.',
      'Patch report-production-approval-packet to hide or rewrite the manifest request rows after validation.',
      'Leave branch_review.review_queue.status as pass while review_first_count is nonzero.',
      'Attempt to retire, merge, delete, checkout, or push branch heads to clear the blocker.',
      'Add a separate branch-review artifact for queue status.',
      'Leave starter registers counted only as production pilot evidence registers.',
      'Ignore all starter registers during readiness scanning.',
      'Treat any base-valid register as ready acquisition evidence.',
      'Leave buyer evidence hard-gate details only inside the broad launch manifest and commercial launch report.',
      'Duplicate buyer evidence readiness scanning in a standalone hard-gate implementation.',
      'Contact buyers, create evidence workspaces, or update pilot evidence registers from the focused report.',
      'Add package scripts only and leave public status, release posture, docs, and validators on broad buyer evidence handles.',
      'Leave release preflight only inside the large launch manifest and commercial launch report.',
      'Duplicate release preflight probing logic in a new standalone implementation.',
      'Make the focused checker pass the release gate or install Corepack/Git LFS automatically.',
      'Leave source-of-truth docs and public handles pointing only at broad launch manifest and commercial readiness reports.',
      'Update only COMMERCIAL_SOURCE_OF_TRUTH and leave public status/release posture commands unchanged.',
      'Fold focused release-preflight report logic into release-readiness or production deploy scripts.',
      'Leave the lower per-file timeout caps and continue treating the broad strategy-audit slice timeout as residual noise.',
      'Remove or skip the slow production approval and strategy completion audit cases from the strategy-audit slice.',
      'Rewrite the subprocess fixture harnesses and report scripts to reduce runtime.',
      'Leave source provenance only inside release preflight, production approval packet, and commercial launch reports.',
      'Duplicate git status parsing and dirty-path classification in a standalone source-provenance implementation.',
      'Automatically commit, unstage, stash, revert, or rename paths to clear source provenance.',
      'Add package scripts only and leave docs, public status, release posture, and validators on broad source-provenance handles.',
      'Leave Supabase advisor clearance only inside the broad launch manifest and commercial launch report.',
      'Call Supabase connector or dashboard advisors from the focused report.',
      'Duplicate Supabase advisor clearance parsing in a standalone implementation.',
      'Add package scripts only and leave public status, release posture, docs, and validators on broad Supabase advisor handles.',
      'Leave branch review only inside the broad launch manifest, commercial launch report, and unmerged branch inventory.',
      'Duplicate branch inventory, family grouping, freshness, and focused packet parsing in a standalone implementation.',
      'Checkout, merge, push, discard, delete, or select canonical branch heads to clear the branch review blocker.',
      'Add package scripts only and leave public status, release posture, docs, and validators on broad branch handles.',
      'Keep running live static parity even when local release-readiness fails.',
      'Fall back to bare pnpm or build dist directly when Corepack is unavailable.',
      'Skip every live check when any pre-deploy gate is blocked.',
    ]));
    const approvalCircularityDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-VALIDATION-CIRCULARITY',
    );
    expect(approvalCircularityDecision).toBeTruthy();
    expect(approvalCircularityDecision.chosen_variant).toBe('minimal prerequisite status and evidence-text patch');
    expect(approvalCircularityDecision.proof_boundary).toMatch(/does not clear source provenance|owner approval|hosted\/live parity/i);
    const approvalCircularityReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-VALIDATION-CIRCULARITY',
    );
    expect(approvalCircularityReview).toBeTruthy();
    expect(approvalCircularityReview.policy).toBe('strict');
    expect(approvalCircularityReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:production-approval-packet -- --skip-release-readiness',
    ]));
    const branchQueueDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BRANCH-REVIEW-QUEUE-STATUS',
    );
    expect(branchQueueDecision).toBeTruthy();
    expect(branchQueueDecision.chosen_variant).toBe('minimal branch review queue status patch');
    expect(branchQueueDecision.proof_boundary).toMatch(/does not checkout|merge|push|select canonical heads|deploy/i);
    const branchQueueReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BRANCH-REVIEW-QUEUE-STATUS',
    );
    expect(branchQueueReview).toBeTruthy();
    expect(branchQueueReview.policy).toBe('strict');
    expect(branchQueueReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:unmerged-branch-readiness -- --focus-risk high',
    ]));
    const starterBoundaryDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-STARTER-REGISTER-BOUNDARY',
    );
    expect(starterBoundaryDecision).toBeTruthy();
    expect(starterBoundaryDecision.chosen_variant).toBe('minimal starter-register classification patch');
    expect(starterBoundaryDecision.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|move confidence|validate 95%/i);
    const starterBoundaryReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-STARTER-REGISTER-BOUNDARY',
    );
    expect(starterBoundaryReview).toBeTruthy();
    expect(starterBoundaryReview.policy).toBe('strict');
    expect(starterBoundaryReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run check:phase-f-evidence-workspace',
    ]));
    const buyerEvidenceGateReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-GATE-FOCUSED-REPORT',
    );
    expect(buyerEvidenceGateReportDecision).toBeTruthy();
    expect(buyerEvidenceGateReportDecision.chosen_variant).toBe('minimal focused manifest wrapper and public handle alignment');
    expect(buyerEvidenceGateReportDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-buyer-evidence-gate-readiness.mjs',
      'scripts/check-buyer-evidence-gate-readiness-report.mjs',
      'tests/unit/buyerEvidenceGateReadiness.test.ts',
      'src/lib/publicReleaseStatusManifest.json',
    ]));
    expect(buyerEvidenceGateReportDecision.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|move confidence|validate 95|grant production approval|hosted\/live parity/i);
    const buyerEvidenceGateReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-GATE-FOCUSED-REPORT',
    );
    expect(buyerEvidenceGateReportReview).toBeTruthy();
    expect(buyerEvidenceGateReportReview.policy).toBe('strict');
    expect(buyerEvidenceGateReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:buyer-evidence-gate-readiness',
      'pnpm run check:buyer-evidence-gate-report',
    ]));
    const releasePreflightDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-FOCUSED-REPORT',
    );
    expect(releasePreflightDecision).toBeTruthy();
    expect(releasePreflightDecision.chosen_variant).toBe('minimal focused manifest wrapper');
    expect(releasePreflightDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-release-preflight-readiness.mjs',
      'scripts/check-release-preflight-readiness-report.mjs',
      'tests/unit/releasePreflightReadiness.test.ts',
      'package.json',
    ]));
    expect(releasePreflightDecision.proof_boundary).toMatch(/does not install Corepack|run full release-readiness|clear source provenance|deploy|hosted\/live parity/i);
    const releasePreflightReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-FOCUSED-REPORT',
    );
    expect(releasePreflightReview).toBeTruthy();
    expect(releasePreflightReview.policy).toBe('strict');
    expect(releasePreflightReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:release-preflight',
      'pnpm run check:release-preflight-report',
    ]));
    const releasePreflightSourceOfTruthDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-SOURCE-OF-TRUTH-HANDLES',
    );
    expect(releasePreflightSourceOfTruthDecision).toBeTruthy();
    expect(releasePreflightSourceOfTruthDecision.chosen_variant).toBe('minimal docs and public handle alignment');
    expect(releasePreflightSourceOfTruthDecision.files_changed).toEqual(expect.arrayContaining([
      'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
      'src/lib/publicReleaseStatusManifest.json',
      'src/lib/releasePosture.ts',
      'scripts/generate-public-release-status.mjs',
      'scripts/check-commercial-source-docs.mjs',
      'tests/unit/statusPagePosture.test.ts',
    ]));
    expect(releasePreflightSourceOfTruthDecision.proof_boundary).toMatch(/does not install Corepack|run full release-readiness|clear source provenance|deploy|hosted\/live parity/i);
    const releasePreflightSourceOfTruthReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-SOURCE-OF-TRUTH-HANDLES',
    );
    expect(releasePreflightSourceOfTruthReview).toBeTruthy();
    expect(releasePreflightSourceOfTruthReview.policy).toBe('strict');
    expect(releasePreflightSourceOfTruthReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run check:commercial-source',
      'pnpm run check:public-release-status',
      'pnpm run check:release-preflight-report',
    ]));
    const strategyAuditTimeoutDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-STRATEGY-AUDIT-SLICE-TIMEOUT-BUDGET',
    );
    expect(strategyAuditTimeoutDecision).toBeTruthy();
    expect(strategyAuditTimeoutDecision.chosen_variant).toBe('minimal Vitest timeout budget alignment');
    expect(strategyAuditTimeoutDecision.files_changed).toEqual(expect.arrayContaining([
      'tests/unit/productionApprovalPacket.test.ts',
      'tests/unit/strategyCompletionAudit.test.ts',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(strategyAuditTimeoutDecision.proof_boundary).toMatch(/does not clear source provenance|install Corepack|owner approval|deploy|hosted\/live parity/i);
    const strategyAuditTimeoutReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-STRATEGY-AUDIT-SLICE-TIMEOUT-BUDGET',
    );
    expect(strategyAuditTimeoutReview).toBeTruthy();
    expect(strategyAuditTimeoutReview.policy).toBe('strict');
    expect(strategyAuditTimeoutReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run test:strategy-audit-slice',
      'pnpm exec vitest run tests/unit/productionApprovalPacket.test.ts -t "keeps full blocker gates failing when live parity is stale" --no-file-parallelism --maxWorkers=1',
      'pnpm exec vitest run tests/unit/strategyCompletionAudit.test.ts -t "exits nonzero when a required local source gate fails|keeps live metadata failure as an external gate when local checks pass" --no-file-parallelism --maxWorkers=1',
    ]));
    const sourceProvenanceReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-FOCUSED-REPORT',
    );
    expect(sourceProvenanceReportDecision).toBeTruthy();
    expect(sourceProvenanceReportDecision.chosen_variant).toBe('minimal focused manifest wrapper and public handle alignment');
    expect(sourceProvenanceReportDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-source-provenance-readiness.mjs',
      'scripts/check-source-provenance-readiness-report.mjs',
      'tests/unit/sourceProvenanceReadiness.test.ts',
      'src/lib/publicReleaseStatusManifest.json',
    ]));
    expect(sourceProvenanceReportDecision.proof_boundary).toMatch(/does not commit|clear source provenance|run release-readiness|deploy|hosted\/live parity/i);
    const sourceProvenanceReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-FOCUSED-REPORT',
    );
    expect(sourceProvenanceReportReview).toBeTruthy();
    expect(sourceProvenanceReportReview.policy).toBe('strict');
    expect(sourceProvenanceReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:source-provenance-readiness',
      'pnpm run check:source-provenance-report',
    ]));
    const supabaseAdvisorReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-FOCUSED-REPORT',
    );
    expect(supabaseAdvisorReportDecision).toBeTruthy();
    expect(supabaseAdvisorReportDecision.chosen_variant).toBe('minimal focused manifest wrapper and public handle alignment');
    expect(supabaseAdvisorReportDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-supabase-advisor-readiness.mjs',
      'scripts/check-supabase-advisor-readiness-report.mjs',
      'tests/unit/supabaseAdvisorReadiness.test.ts',
      'src/lib/publicReleaseStatusManifest.json',
    ]));
    expect(supabaseAdvisorReportDecision.proof_boundary).toMatch(/does not authorize connectors|rerun Security Advisor|record secrets|grant production approval|hosted\/live parity/i);
    const supabaseAdvisorReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-FOCUSED-REPORT',
    );
    expect(supabaseAdvisorReportReview).toBeTruthy();
    expect(supabaseAdvisorReportReview.policy).toBe('strict');
    expect(supabaseAdvisorReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:supabase-advisor-readiness',
      'pnpm run check:supabase-advisor-report',
    ]));
    const branchReviewReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BRANCH-REVIEW-FOCUSED-REPORT',
    );
    expect(branchReviewReportDecision).toBeTruthy();
    expect(branchReviewReportDecision.chosen_variant).toBe('minimal focused manifest wrapper and public handle alignment');
    expect(branchReviewReportDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-branch-review-readiness.mjs',
      'scripts/check-branch-review-readiness-report.mjs',
      'tests/unit/branchReviewReadiness.test.ts',
      'src/lib/publicReleaseStatusManifest.json',
    ]));
    expect(branchReviewReportDecision.proof_boundary).toMatch(/does not checkout|merge|push|discard|select canonical heads|run migrations|mutate Supabase|grant production approval|hosted\/live parity/i);
    const branchReviewReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BRANCH-REVIEW-FOCUSED-REPORT',
    );
    expect(branchReviewReportReview).toBeTruthy();
    expect(branchReviewReportReview.policy).toBe('strict');
    expect(branchReviewReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:branch-review-readiness',
      'pnpm run check:branch-review-report',
    ]));
    const productionPacketSequencingDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-PACKET-SEQUENCING',
    );
    expect(productionPacketSequencingDecision).toBeTruthy();
    expect(productionPacketSequencingDecision.chosen_variant).toBe('minimal prerequisite sequencing patch');
    expect(productionPacketSequencingDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-production-approval-packet.mjs',
      'scripts/report-launch-evidence-manifest.mjs',
      'tests/unit/productionApprovalPacket.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(productionPacketSequencingDecision.proof_boundary).toMatch(/does not install Corepack|run release-readiness successfully|build dist|approve production|deploy|hosted\/live parity/i);
    const productionPacketSequencingReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-PACKET-SEQUENCING',
    );
    expect(productionPacketSequencingReview).toBeTruthy();
    expect(productionPacketSequencingReview.policy).toBe('strict');
    expect(productionPacketSequencingReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm exec vitest run tests/unit/productionApprovalPacket.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:production-approval-packet',
      'pnpm run report:production-approval-packet -- --skip-release-readiness',
    ]));
    const postDeployLiveProofReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-POST-DEPLOY-LIVE-PROOF-FOCUSED-REPORT',
    );
    expect(postDeployLiveProofReportDecision).toBeTruthy();
    expect(postDeployLiveProofReportDecision.chosen_variant).toBe('minimal focused manifest wrapper and public handle alignment');
    expect(postDeployLiveProofReportDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-post-deploy-live-proof-readiness.mjs',
      'scripts/check-post-deploy-live-proof-readiness-report.mjs',
      'tests/unit/postDeployLiveProofReadiness.test.ts',
    ]));
    expect(postDeployLiveProofReportDecision.proof_boundary).toMatch(/does not grant owner approval|run deploys|mutate Netlify|run browser smoke|prove hosted\/live parity/i);
    const postDeployLiveProofReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-POST-DEPLOY-LIVE-PROOF-FOCUSED-REPORT',
    );
    expect(postDeployLiveProofReportReview).toBeTruthy();
    expect(postDeployLiveProofReportReview.policy).toBe('strict');
    expect(postDeployLiveProofReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:post-deploy-live-proof-readiness',
      'pnpm run check:post-deploy-live-proof-report',
    ]));
    expect(manifest.ecc_ledger.decision).toBe('blocked');

    const tempRoot = makeTempRoot();
    const manifestPath = path.join(tempRoot, 'launch-evidence.json');
    writeFileSync(manifestPath, stdout, 'utf8');

    const validation = execFileSync('python3', [validatorPath, manifestPath, '--require-repo-exists'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
    });
    expect(validation).toContain('VALID');
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('separates branch review clearance from read-only probe execution', () => {
    const stdout = runManifest();
    const manifest = JSON.parse(stdout);
    const reviewFirstOpen = (manifest.branch_review.review_queue.review_first_count ?? 0) > 0;
    const canonicalHeadOpen = (manifest.branch_review.canonical_head_decisions.open_count ?? 0) > 0;
    const branchAction = manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'branch_review');
    const branchPrerequisite = manifest.production_approval.prerequisite_queue.items.find(
      (item: { prerequisite: string }) => item.prerequisite === 'Canonical branch review',
    );
    const firstReviewItem = manifest.branch_review.review_queue.items[0];
    const firstCanonicalHeadDecision = manifest.branch_review.canonical_head_decisions.items[0];
    const branchCanonicalResolutionQueue = manifest.branch_review.canonical_head_resolution_queue;
    const firstCanonicalHeadResolution = branchCanonicalResolutionQueue.items[0];
    const branchClearanceMatrix = manifest.branch_review.clearance_matrix;
    const firstClearanceRow = branchClearanceMatrix.rows[0];
    const firstReviewFirstPacket = manifest.branch_review.review_first_packets.packets[0];
    const firstChangedFunctionRow = firstReviewFirstPacket?.changed_supabase_function_rows?.[0]
      ?? manifest.branch_review.top_review_packet.changed_supabase_function_rows?.[0];

    expect(manifest.branch_review.probe_status).toBe('pass');
    expect(manifest.branch_review.evidence).toContain('Branch review clearance');
    expect(manifest.branch_review.evidence).toContain('probe_status=pass');
    expect(manifest.branch_review.evidence_boundary).toMatch(/read-only branch probe execution does not clear/i);
    expect(manifest.branch_review.review_queue.status).toBe(reviewFirstOpen ? 'blocked' : 'pass');
    expect(manifest.branch_review.review_queue.blocked_count).toBe(manifest.branch_review.review_queue.review_first_count);
    expect(manifest.branch_review.review_queue.evidence).toContain(`status=${manifest.branch_review.review_queue.status}`);
    expect(manifest.branch_review.review_queue.evidence).toContain(`blocked=${manifest.branch_review.review_queue.blocked_count}`);
    expect(manifest.branch_review.top_review_packet.read_only).toBe(true);
    expect(manifest.branch_review.top_review_packet.proof_type).toBeTruthy();
    expect(manifest.branch_review.top_review_packet.proof_boundary).toMatch(/read-only branch evidence|does not checkout|merge|push/i);
    expect(branchClearanceMatrix.status).toBe(manifest.branch_review.status);
    expect(branchClearanceMatrix.proof_type).toBe('read_only_branch_clearance_matrix');
    expect(branchClearanceMatrix.family_count).toBe(manifest.branch_review.review_queue.item_count);
    expect(branchClearanceMatrix.rows).toHaveLength(manifest.branch_review.review_queue.item_count);
    expect(branchClearanceMatrix.evidence).toContain('Branch clearance matrix');
    expect(branchClearanceMatrix.proof_boundary).toMatch(/read-only branch-review evidence only|does not checkout|merge|push/i);
    expect(firstClearanceRow).toBeTruthy();
    if (firstClearanceRow) {
      expect(firstClearanceRow.read_only).toBe(true);
      expect(firstClearanceRow.blocks_launch_clearance).toBe(true);
      expect(firstClearanceRow.required_proof_command).toContain('report:unmerged-branch-readiness');
      expect(firstClearanceRow.proof_type).toBeTruthy();
      expect(firstClearanceRow.proof_boundary).toMatch(/read-only branch-review evidence only|does not checkout|merge|push/i);
      expect(firstClearanceRow.stop_gate).toMatch(/Do not checkout, merge, push/i);
      expect(['blocked', 'review_required']).toContain(firstClearanceRow.clearance_status);
      if (firstClearanceRow.highest_risk === 'high') {
        expect(firstClearanceRow.proof_type).toBe('high_risk_branch_clearance_row');
      }
    }
    expect(firstReviewItem).toBeTruthy();
    if (firstReviewItem) {
      expect(firstReviewItem.read_only).toBe(true);
      expect(firstReviewItem.proof_type).toBeTruthy();
      expect(firstReviewItem.proof_boundary).toMatch(/read-only|does not checkout|merge|push/i);
      if (firstReviewItem.highest_risk === 'high') {
        expect(firstReviewItem.proof_type).toBe('high_risk_read_only_branch_review');
      }
    }

    if (firstCanonicalHeadDecision) {
      expect(firstCanonicalHeadDecision.read_only).toBe(true);
      expect(firstCanonicalHeadDecision.owner_decision_required).toBe(true);
      expect(firstCanonicalHeadDecision.proof_type).toBeTruthy();
      expect(firstCanonicalHeadDecision.proof_boundary).toMatch(/owner decision record only|does not checkout|merge|push/i);
      if (['local_ahead', 'origin_ahead', 'diverged'].includes(firstCanonicalHeadDecision.state_key)) {
        expect(firstCanonicalHeadDecision.proof_type).toBe('split_canonical_head_decision');
      }
      if (firstCanonicalHeadDecision.state_key === 'local_only') {
        expect(firstCanonicalHeadDecision.proof_type).toBe('local_only_canonical_head_decision');
      }
      if (firstCanonicalHeadDecision.state_key === 'origin_only') {
        expect(firstCanonicalHeadDecision.proof_type).toBe('origin_only_canonical_head_decision');
      }
    }

    expect(branchCanonicalResolutionQueue.source_decision_status).toBe(manifest.branch_review.canonical_head_decisions.status);
    expect(branchCanonicalResolutionQueue.item_count).toBe(manifest.branch_review.canonical_head_decisions.items.length);
    expect(branchCanonicalResolutionQueue.blocked_count).toBe(manifest.branch_review.canonical_head_decisions.open_count);
    expect(branchCanonicalResolutionQueue.proof_type).toBe('canonical_head_resolution_queue');
    expect(branchCanonicalResolutionQueue.evidence).toContain('Canonical head resolution queue');
    expect(branchCanonicalResolutionQueue.proof_boundary).toMatch(/owner-decision action list only|does not checkout|select canonical heads/i);
    if (firstCanonicalHeadResolution) {
      expect(firstCanonicalHeadResolution.read_only).toBe(true);
      expect(firstCanonicalHeadResolution.owner_decision_required).toBe(true);
      expect(firstCanonicalHeadResolution.owner).toBe('owner');
      expect(firstCanonicalHeadResolution.proof_command).toContain('report:unmerged-branch-readiness');
      expect(firstCanonicalHeadResolution.proof_boundary).toMatch(/owner-decision action list only|does not checkout|select canonical heads/i);
      expect(firstCanonicalHeadResolution.stop_gate).toMatch(/Do not checkout|select a canonical head|production approval/i);
      expect(firstCanonicalHeadResolution.blocks_branch_gate).toBe(true);
      expect(firstCanonicalHeadResolution.status).toBe('blocked');
      expect(firstCanonicalHeadResolution.family).toBe(firstCanonicalHeadDecision?.family);
    }

    if (firstReviewFirstPacket) {
      expect(firstReviewFirstPacket.read_only).toBe(true);
      expect(firstReviewFirstPacket.proof_type).toBeTruthy();
      expect(firstReviewFirstPacket.proof_boundary).toMatch(/read-only branch evidence|does not checkout|merge|push/i);
      if (firstReviewFirstPacket.risk === 'high') {
        expect(firstReviewFirstPacket.proof_type).toBe('high_risk_read_only_branch_packet');
      }
    }

    if (firstChangedFunctionRow) {
      expect(firstChangedFunctionRow.read_only).toBe(true);
      expect(firstChangedFunctionRow.proof_type).toBe('read_only_supabase_function_branch_review');
      expect(firstChangedFunctionRow.proof_boundary).toMatch(/review-target evidence|does not deploy functions|run migrations|alter secrets/i);
    }

    if (reviewFirstOpen || canonicalHeadOpen) {
      expect(manifest.branch_review.status).toBe('blocked');
      expect(branchAction.status).toBe('blocked');
      expect(branchPrerequisite.status).toBe('blocked');
    } else {
      expect(manifest.branch_review.status).toBe('pass');
    }
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('keeps buyer commercial-signal remediation tied to retained non-status-only evidence', () => {
    const stdout = runManifest();
    const manifest = JSON.parse(stdout);
    const buyerQueue = manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items;
    const strongSignalItem = buyerQueue.find((item: { requirement: string }) => item.requirement === 'Strong commercial signal');

    expect(strongSignalItem).toBeTruthy();
    expect(strongSignalItem.proof_command).toContain('prepare:pilot-evidence-artifact');
    expect(strongSignalItem.proof_command).toContain('--commercial-commitment-evidence');
    expect(strongSignalItem.proof_command).toContain('update:pilot-evidence-register-row');
    expect(strongSignalItem.proof_command).toContain('validate:pilot-evidence');
    expect(strongSignalItem.stop_gate).toMatch(/status labels/i);
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('keeps buyer evidence acquisition rows blocked and acquisition-only', () => {
    const stdout = runManifest();
    const manifest = JSON.parse(stdout);
    const matrix = manifest.buyer_evidence.acquisition_matrix;
    const rowsByLane = mapBy(
      matrix.rows,
      (item: {
        lane: string;
        status: string;
        current?: string;
        proof_boundary?: string;
        stop_gate?: string;
        validation_command?: string;
        proof_type?: string;
      }) => item.lane,
    );

    expect(matrix.status).toBe('blocked');
    expect(matrix.proof_type).toBe('buyer_evidence_acquisition_matrix');
    expect(matrix.evidence).toContain('Buyer evidence acquisition matrix');
    expect(matrix.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|move confidence|validate 95%|claim buyer acceptance/i);
    expect(matrix.stop_gate).toMatch(/Do not mark buyer evidence ready|real anonymized buyer rows/i);
    expect(matrix.row_count).toBeGreaterThanOrEqual(10);
    expect(matrix.blocked_count).toBeGreaterThan(0);
    expect(rowsByLane.get('Outreach response log intake')?.status).toBe('blocked');
    expect(rowsByLane.get('Outreach response log intake')?.current).toMatch(/0 actionable outreach row/);
    expect(rowsByLane.get('Outreach response log intake')?.proof_boundary).toMatch(/does not contact buyers|create acceptance/i);
    expect(rowsByLane.get('Production pilot evidence register')?.status).toBe('blocked');
    expect(rowsByLane.get('Production pilot evidence register')?.current).toMatch(/starter-only register/);
    expect(rowsByLane.get('Production pilot evidence register')?.proof_boundary).toMatch(/outside templates|starter rows/i);
    expect(rowsByLane.get('Utility forecast lane')?.proof_type).toBe('forecast_trust_artifact_preparation');
    expect(rowsByLane.get('Utility forecast lane')?.validation_command).toContain('prepare:forecast-trust-report-artifact');
    expect(rowsByLane.get('TIER or credit lane')?.validation_command).toContain('prepare:pilot-evidence-artifact');
    expect(rowsByLane.get('Billing or security lane')?.validation_command).toContain('prepare:pilot-evidence-artifact');
    expect(rowsByLane.get('Confidence movement and coverage')?.stop_gate).toMatch(/Do not move confidence/i);
    expect(rowsByLane.get('Strong commercial commitment')?.proof_boundary).toMatch(/signed agreement|paid pilot|invoice|PO|LOI|status-only labels/i);
    expect(rowsByLane.get('Retained-artifact 95% validation')?.validation_command).toContain('validate:pilot-evidence');
    expect(rowsByLane.get('Retained-artifact 95% validation')?.proof_boundary).toMatch(/validation does not create buyer acceptance/i);
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('classifies buyer evidence remediation proof rows with explicit boundaries', () => {
    const stdout = runManifest();
    const manifest = JSON.parse(stdout);
    const buyerDeficitsByRequirement = mapBy(
      manifest.buyer_evidence.hard_gate_deficits.items,
      (item: {
        requirement: string;
        proof_type?: string;
        buyer_accepted_evidence_required?: boolean;
        retained_artifact_required?: boolean;
        proof_boundary?: string;
        stop_gate?: string;
      }) => item.requirement,
    );
    const buyerActionsByRequirement = mapBy(
      manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items,
      (item: {
        requirement: string;
        proof_type?: string;
        buyer_accepted_evidence_required?: boolean;
        retained_artifact_required?: boolean;
        proof_boundary?: string;
        proof_command: string;
      }) => item.requirement,
    );
    const expectedProofTypes: Record<string, string> = {
      'Utility forecast lane': 'forecast_trust_artifact_preparation',
      'TIER or credit lane': 'retained_artifact_preparation',
      'Billing or security lane': 'retained_artifact_preparation',
      'Distinct accepted proof packs': 'buyer_acceptance_report',
      'Accepted confidence_delta': 'register_update',
      'Retained SHA-256 references': 'retained_artifact_and_register_update',
      'Buyer data coverage': 'register_update',
      'Artifact turnaround': 'register_update',
      'Strong commercial signal': 'commercial_commitment_artifact',
      'Retained-artifact 95% validation': 'retained_artifact_validation',
    };

    for (const [requirement, proofType] of Object.entries(expectedProofTypes)) {
      const deficit = buyerDeficitsByRequirement.get(requirement);
      const item = buyerActionsByRequirement.get(requirement);
      expect(deficit).toBeTruthy();
      expect(deficit?.proof_type).toBe(proofType);
      expect(deficit?.buyer_accepted_evidence_required).toBe(true);
      expect(deficit?.retained_artifact_required).toBe(true);
      expect(deficit?.proof_boundary).toBeTruthy();
      expect(deficit?.stop_gate).toMatch(/Do not/i);
      expect(item).toBeTruthy();
      expect(item?.proof_type).toBe(proofType);
      expect(item?.buyer_accepted_evidence_required).toBe(true);
      expect(item?.retained_artifact_required).toBe(true);
      expect(item?.proof_boundary).toBeTruthy();
    }
    expect(buyerActionsByRequirement.get('Utility forecast lane')?.proof_command).toContain('prepare:forecast-trust-report-artifact');
    expect(buyerActionsByRequirement.get('TIER or credit lane')?.proof_command).toContain('prepare:pilot-evidence-artifact');
    expect(buyerActionsByRequirement.get('Billing or security lane')?.proof_command).toContain('prepare:pilot-evidence-artifact');
    expect(buyerDeficitsByRequirement.get('Strong commercial signal')?.proof_boundary).toMatch(/signed agreement|paid pilot|invoice|PO|LOI|status-only labels/i);
    expect(buyerDeficitsByRequirement.get('Strong commercial signal')?.stop_gate).toMatch(/status labels|informal interest|unretained claims/i);
    expect(buyerDeficitsByRequirement.get('Retained-artifact 95% validation')?.proof_boundary).toMatch(/validation does not create buyer acceptance/i);
    expect(buyerDeficitsByRequirement.get('Retained-artifact 95% validation')?.stop_gate).toMatch(/validate:pilot-evidence --require-95/i);
    expect(buyerActionsByRequirement.get('Strong commercial signal')?.proof_boundary).toMatch(/status-only labels|informal interest|unretained claims/i);
    expect(buyerActionsByRequirement.get('Retained-artifact 95% validation')?.proof_boundary).toMatch(/validation does not create buyer acceptance/i);
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('keeps buyer artifact-preparation remediation commands complete and shell-safe', () => {
    const stdout = runManifest();
    const manifest = JSON.parse(stdout);
    const buyerQueue = manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items;
    const pilotArtifactOptions = [
      '--evidence-root',
      '--artifact-file',
      '--route',
      '--proof-pack-id',
      '--record-date',
      '--pii-screen-result',
      '--buyer-data-coverage-pct',
      '--time-to-artifact-hours',
      '--reviewer-role',
      '--reviewer-acceptance',
      '--reviewer-feedback-status',
      '--day-14-decision',
      '--commercial-commitment-status',
      '--claim-boundary',
      '--do-not-claim',
      '--diagnostic',
    ];
    const forecastArtifactOptions = [
      '--benchmark-pack-file',
      '--evidence-root',
      '--artifact-file',
      '--proof-pack-id',
      '--record-date',
      '--buyer-data-coverage-pct',
      '--time-to-artifact-hours',
      '--reviewer-role',
      '--reviewer-acceptance',
      '--reviewer-feedback-status',
      '--day-14-decision',
      '--commercial-commitment-status',
    ];

    for (const item of buyerQueue) {
      expect(item.proof_command).not.toMatch(/[<>]/);
      if (item.proof_command.includes('prepare:pilot-evidence-artifact')) {
        for (const option of pilotArtifactOptions) expect(item.proof_command).toContain(option);
      }
      if (item.proof_command.includes('prepare:forecast-trust-report-artifact')) {
        for (const option of forecastArtifactOptions) expect(item.proof_command).toContain(option);
      }
    }
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('keeps the release check wired to the blocked manifest contract', () => {
    const result = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(result).toContain('Launch evidence manifest check passed');
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('accepts the pnpm option separator for the launch evidence manifest check', () => {
    const result = execFileSync(process.execPath, [checkScriptPath, '--', '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(result).toContain('Launch evidence manifest check passed');
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('renders the orchestrator final-report tables from the validated manifest', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'commercial-launch-readiness.md');
    const stdout = execFileSync(process.execPath, [markdownReportScriptPath, '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(stdout).toContain('# CEIP Commercial Launch Readiness Report');
    expect(stdout).toContain('Decision: `blocked`');
    expect(stdout).toContain('## Launch Decision');
    expect(stdout).toContain('## Gap Analysis');
    expect(stdout).toContain('## Launch Blocker Action Queue');
    expect(stdout).toContain('## Source Provenance Resolution Queue');
    expect(stdout).toContain('## Branch Canonical Head Decision Deficits');
    expect(stdout).toContain('## Branch Canonical Head Resolution Queue');
    expect(stdout).toContain('## Branch Clearance Matrix');
    expect(stdout).toContain('## Buyer Evidence Hard Gate Deficits');
    expect(stdout).toContain('## Buyer Evidence Acquisition Matrix');
    expect(stdout).toContain('## Buyer Evidence Remediation Queue');
    expect(stdout).toContain('## Supabase Advisor Clearance Deficits');
    expect(stdout).toContain('## Supabase Advisor Remediation Queue');
    expect(stdout).toContain('## Release Toolchain And Approval Deficits');
    expect(stdout).toContain('## Release Preflight Remediation Queue');
    expect(stdout).toContain('## Production Approval Prerequisite Queue');
    expect(stdout).toContain('## Production Approval Request Packet');
    expect(stdout).toContain('## Post-Deploy Live Proof Gate Queue');
    expect(stdout).toContain('## Proof Buckets');
    expect(stdout).toContain('## Top 10 Pain Points');
    expect(stdout).toContain('## Top 10 Target Customers Or Segments');
    expect(stdout).toContain('## Outreach Plan');
    expect(stdout).toContain('## Fix Report');
    expect(stdout).toContain('## Objective Completion Audit');
    expect(stdout).toContain('## Adversarial Review');
    expect(stdout).toContain('## Evidence Validation');
    expect(stdout).toContain('## ECC Ledger');
    expect(stdout).toContain('Source provenance:');
    expect(stdout).toContain('Launch blocker action queue');
    expect(stdout).toContain('Source provenance resolution queue');
    expect(stdout).toContain('Source provenance isolation ledger');
    expect(stdout).toContain('source_provenance_isolation_ledger');
    expect(stdout).toContain('dirty-source release impact only');
    expect(stdout).toContain('git status --porcelain=v1');
    expect(stdout).toContain('Do not request deploy approval');
    expect(stdout).toContain('This queue is a decision aid only');
    expect(stdout).toContain('corepack pnpm run report:production-approval-packet -- --skip-release-readiness');
    expect(stdout).toContain('explicit owner intent');
    expect(stdout).toContain('| source_provenance |');
    expect(stdout).toContain('| launch_evidence_validation |');
    expect(stdout).toContain('| release_toolchain |');
    expect(stdout).toContain('| branch_review |');
    expect(stdout).toContain('| supabase_advisor |');
    expect(stdout).toContain('| buyer_evidence |');
    expect(stdout).toContain('| production_approval |');
    expect(stdout).toContain('| post_deploy_live_proof |');
    expect(stdout).toContain('release-toolchain probe(s) open');
    expect(stdout).toContain('launch evidence validation must pass before a deploy approval request');
    expect(stdout).toContain('Refresh the release toolchain probe ledger');
    expect(stdout).toMatch(/\| 6 \| buyer_evidence \| (?:[1-9]\d*|unknown) buyer hard-gate deficit\(s\) remain \| buyer_operator \|[^|\n]+\| corepack pnpm run validate:pilot-evidence -- path\/to\/register\.csv --require-95 --evidence-root path\/to\/redacted-artifacts \|[^|\n]+\| blocked \|/);
    expect(stdout).toContain('corepack pnpm run check:post-deploy-live');
    expect(stdout).toContain('Do not claim buyer-proven 95% confidence');
    expect(stdout).toContain('Buyer evidence review');
    expect(stdout).toContain('Batchable intake-packet outreach rows');
    expect(stdout).toContain('Buyer hard-gate deficit ledger skipped');
    expect(stdout).toContain('Generated scaffolding, outreach headers, and starter registers do not count as buyer proof.');
    expect(stdout).toContain('Buyer evidence acquisition matrix');
    expect(stdout).toContain('buyer_evidence_acquisition_matrix');
    expect(stdout).toContain('| Outreach response log intake |');
    expect(stdout).toContain('| Production pilot evidence register |');
    expect(stdout).toContain('does not contact buyers, create accepted evidence, move confidence');
    expect(stdout).toContain('Do not mark buyer evidence ready');
    expect(stdout).toContain('Buyer evidence remediation queue skipped');
    expect(stdout).toContain('does not contact buyers');
    expect(stdout).toContain('create accepted evidence, move confidence');
    expect(stdout).toContain('Supabase advisor review');
    expect(stdout).toContain('Supabase security/performance advisor clearance remains unavailable');
    expect(stdout).toContain('Supabase advisor clearance deficit ledger');
    expect(stdout).toContain('| Security advisor evidence |');
    expect(stdout).toContain('| Performance advisor evidence |');
    expect(stdout).toContain('| Advisor clearance claim |');
    expect(stdout).toContain('Supabase advisor remediation queue');
    expect(stdout).toContain('does not authorize connectors');
    expect(stdout).toContain('mutate the database');
    expect(stdout).toContain('Supabase Dashboard > Database > Security Advisor');
    expect(stdout).toContain('Supabase Dashboard > Database > Performance Advisor');
    expect(stdout).toContain('Release toolchain and approval deficit ledger');
    expect(stdout).toContain('| Corepack pnpm resolver |');
    expect(stdout).toContain('| Release-readiness execution |');
    expect(stdout).toContain('| Git LFS push-path proof |');
    expect(stdout).toContain('Release Toolchain Probe Ledger');
    expect(stdout).toContain('| Corepack pnpm resolver | corepack pnpm --version |');
    expect(stdout).toContain('| Git LFS push-path proof | git lfs version |');
    expect(stdout).toContain('does not install tools');
    expect(stdout).toContain('Release Preflight Clearance Matrix');
    expect(stdout).toContain('Release preflight clearance matrix');
    expect(stdout).toContain('release_preflight_clearance_matrix');
    expect(stdout).toContain('Open release clearance rows');
    expect(stdout).toContain('Do not mark release approval ready');
    expect(stdout).toContain('Blocks Release Gate');
    expect(stdout).toContain('| Explicit owner production approval |');
    expect(stdout).toContain('Release preflight remediation queue');
    expect(stdout).toContain('does not install tools');
    expect(stdout).toContain('corepack pnpm run check:release-readiness');
    expect(stdout).toContain('corepack pnpm run check:production-deploy-request');
    expect(stdout).toContain('Production approval prerequisite queue');
    expect(stdout).toContain('| Launch evidence validation |');
    expect(stdout).toContain('validation command is external to manifest generation; production approval packet must attach passing check:launch-evidence-manifest output');
    expect(stdout).toContain('corepack pnpm run check:launch-evidence-manifest');
    expect(stdout).toContain('does not grant owner approval');
    expect(stdout).toContain('Corepack/Git LFS probe ledger');
    expect(stdout).toContain('corepack pnpm run report:launch-evidence-manifest && corepack pnpm run check:release-readiness');
    expect(stdout).toContain('| Explicit owner production approval |');
    expect(stdout).toContain('not granted by this manifest or report');
    expect(stdout).toContain('| Post-deploy live proof boundary |');
    expect(stdout).toContain('not eligible before explicit approved deploy');
    expect(stdout).toContain('Production approval request packet');
    expect(stdout).toContain('production_approval_request_packet');
    expect(stdout).toContain('Request eligible: `no`');
    expect(stdout).toContain('Evidence To Attach');
    expect(stdout).toContain('Blocks Request');
    expect(stdout).toContain('organizes request evidence only');
    expect(stdout).toContain('Do not request or claim production approval');
    expect(stdout).toContain('Post-deploy live proof gate queue');
    expect(stdout).toContain('does not deploy, push, rebuild, mutate Netlify');
    expect(stdout).toContain('| Live public metadata |');
    expect(stdout).toContain('| Live static dist parity |');
    expect(stdout).toContain('| Hosted proof-pack route smoke |');
    expect(stdout).toContain('| Current-source hosted parity claim |');
    expect(stdout).toContain('corepack pnpm run check:live-public-metadata');
    expect(stdout).toContain('corepack pnpm run check:live-static-parity');
    expect(stdout).toContain('corepack pnpm run test:browser:hosted:proof-packs');
    expect(stdout).toContain('Branch family review skipped');
    expect(stdout).toContain('Branch freshness review skipped');
    expect(stdout).toContain('Branch review queue skipped');
    expect(stdout).toContain('Canonical head decision ledger skipped');
    expect(stdout).toContain('Canonical head resolution queue skipped');
    expect(stdout).toContain('canonical_head_resolution_queue');
    expect(stdout).toContain('This ledger is read-only');
    expect(stdout).toContain('corepack pnpm run report:unmerged-branch-readiness');
    expect(stdout).toContain('Branch clearance matrix skipped');
    expect(stdout).toContain('read_only_branch_clearance_matrix');
    expect(stdout).toContain('Review-first branch packets skipped');
    expect(stdout).toContain('Top branch review packet skipped');
    expect(stdout).toContain('Canonical head comparison skipped');
    expect(stdout).toContain('approval_gate=no checkout/merge/deploy/migration/push');
    expect(stdout).toContain('High-risk, local/origin split, or stale/aging unmerged branches');
    expect(stdout).toContain('completion_audit_current_state');
    expect(stdout).toContain('| Buyer evidence hard gate | blocked | yes |');
    expect(stdout).toContain('| Production approval and live proof gate | manual_stop | yes |');
    expect(stdout).toContain('This audit maps current manifest/report evidence only');
    expect(stdout).toContain('Do not mark the launch goal complete or claim readiness');
    expect(stdout).toContain('validate_launch_evidence.py');
    expect(stdout).toContain('VALID');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('accepts the pnpm option separator documented for the Markdown launch readiness report', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'commercial-launch-readiness.md');
    const stdout = execFileSync(process.execPath, [markdownReportScriptPath, '--', '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(stdout).toContain('# CEIP Commercial Launch Readiness Report');
    expect(stdout).toContain('Decision: `blocked`');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('keeps the Markdown launch readiness report wired to the blocked proof-boundary contract', () => {
    const result = execFileSync(process.execPath, [checkMarkdownReportScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(result).toContain('Commercial launch readiness report check passed');
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('accepts the pnpm option separator for the Markdown launch readiness report check', () => {
    const result = execFileSync(process.execPath, [checkMarkdownReportScriptPath, '--', '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(result).toContain('Commercial launch readiness report check passed');
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);
});
