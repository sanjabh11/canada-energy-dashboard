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
const LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS = 60000;
const tempRoots: string[] = [];

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
    const gapsByProofType = new Map(
      manifest.gaps.map((gap: {
        proof_type?: string;
        proof_boundary?: string;
        stop_gate?: string;
      }) => [gap.proof_type, gap]),
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
    const adversarialReviewsByLane = new Map(
      manifest.adversarial_reviews.map((review: {
        lane: string;
        proof_type?: string;
        proof_boundary?: string;
        stop_gate?: string;
      }) => [review.lane, review]),
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
    const supabaseDeficitsByRequirement = new Map(
      manifest.supabase_advisor.clearance_deficits.items.map((item: {
        requirement: string;
        proof_type?: string;
        external_account_required?: boolean;
        proof_boundary?: string;
        stop_gate?: string;
      }) => [item.requirement, item]),
    );
    const supabaseActionsByRequirement = new Map(
      manifest.supabase_advisor.clearance_deficits.remediation_queue.items.map((item: {
        requirement: string;
        proof_type?: string;
        external_account_required?: boolean;
        proof_boundary?: string;
      }) => [item.requirement, item]),
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
    const releaseDeficitsByRequirement = new Map(
      manifest.release_preflight.items.map((item: {
        requirement: string;
        proof_type?: string;
        proof_boundary?: string;
        stop_gate?: string;
      }) => [item.requirement, item]),
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
    expect(manifest.release_preflight.remediation_queue.status).toMatch(/blocked|pass/);
    expect(manifest.release_preflight.remediation_queue.evidence).toContain('Release preflight remediation queue');
    const releaseActionsByRequirement = new Map(
      manifest.release_preflight.remediation_queue.items.map((item: {
        requirement: string;
        proof_type?: string;
        proof_boundary?: string;
      }) => [item.requirement, item]),
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
    const launchActionsByPhase = new Map(
      manifest.launch_action_queue.items.map((item: {
        phase: string;
        proof_type?: string;
        proof_boundary?: string;
      }) => [item.phase, item]),
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
    expect(launchEvidenceValidationPrerequisite.current).toMatch(/not run by this manifest/i);
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
    const productionPrerequisitesByName = new Map(
      manifest.production_approval.prerequisite_queue.items.map((item: {
        prerequisite: string;
        proof_type?: string;
        proof_boundary?: string;
      }) => [item.prerequisite, item]),
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
    const postDeployProofTypesByGate = new Map(
      manifest.post_deploy_live_proof.gate_queue.items.map((item: {
        gate: string;
        proof_type?: string;
        proof_boundary?: string;
      }) => [item.gate, item]),
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
      expect(manifest.source_provenance.evidence).toContain('staging_state=');
    }
    expect(manifest.source_provenance.deploy_gate).toContain('deploy');
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
    expect(manifest.branch_review.review_queue.evidence).toContain('Branch review queue skipped');
    expect(manifest.branch_review.review_queue.items).toEqual([]);
    expect(manifest.branch_review.canonical_head_decisions.status).toBe('skipped');
    expect(manifest.branch_review.canonical_head_decisions.open_count).toBeNull();
    expect(manifest.branch_review.canonical_head_decisions.items).toEqual([]);
    expect(manifest.branch_review.canonical_head_decisions.evidence).toContain('Canonical head decision ledger skipped');
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
    const firstReviewFirstPacket = manifest.branch_review.review_first_packets.packets[0];
    const firstChangedFunctionRow = firstReviewFirstPacket?.changed_supabase_function_rows?.[0]
      ?? manifest.branch_review.top_review_packet.changed_supabase_function_rows?.[0];

    expect(manifest.branch_review.probe_status).toBe('pass');
    expect(manifest.branch_review.evidence).toContain('Branch review clearance');
    expect(manifest.branch_review.evidence).toContain('probe_status=pass');
    expect(manifest.branch_review.evidence_boundary).toMatch(/read-only branch probe execution does not clear/i);
    expect(manifest.branch_review.top_review_packet.read_only).toBe(true);
    expect(manifest.branch_review.top_review_packet.proof_type).toBeTruthy();
    expect(manifest.branch_review.top_review_packet.proof_boundary).toMatch(/read-only branch evidence|does not checkout|merge|push/i);
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

  it('classifies buyer evidence remediation proof rows with explicit boundaries', () => {
    const stdout = runManifest();
    const manifest = JSON.parse(stdout);
    const buyerDeficitsByRequirement = new Map(
      manifest.buyer_evidence.hard_gate_deficits.items.map((item: {
        requirement: string;
        proof_type?: string;
        buyer_accepted_evidence_required?: boolean;
        retained_artifact_required?: boolean;
        proof_boundary?: string;
        stop_gate?: string;
      }) => [item.requirement, item]),
    );
    const buyerActionsByRequirement = new Map(
      manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items.map((item: {
        requirement: string;
        proof_type?: string;
        buyer_accepted_evidence_required?: boolean;
        retained_artifact_required?: boolean;
        proof_boundary?: string;
        proof_command: string;
      }) => [item.requirement, item]),
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
    expect(stdout).toContain('## Buyer Evidence Hard Gate Deficits');
    expect(stdout).toContain('## Buyer Evidence Remediation Queue');
    expect(stdout).toContain('## Supabase Advisor Clearance Deficits');
    expect(stdout).toContain('## Supabase Advisor Remediation Queue');
    expect(stdout).toContain('## Release Toolchain And Approval Deficits');
    expect(stdout).toContain('## Release Preflight Remediation Queue');
    expect(stdout).toContain('## Production Approval Prerequisite Queue');
    expect(stdout).toContain('## Post-Deploy Live Proof Gate Queue');
    expect(stdout).toContain('## Proof Buckets');
    expect(stdout).toContain('## Top 10 Pain Points');
    expect(stdout).toContain('## Top 10 Target Customers Or Segments');
    expect(stdout).toContain('## Outreach Plan');
    expect(stdout).toContain('## Fix Report');
    expect(stdout).toContain('## Adversarial Review');
    expect(stdout).toContain('## Evidence Validation');
    expect(stdout).toContain('## ECC Ledger');
    expect(stdout).toContain('Source provenance:');
    expect(stdout).toContain('Launch blocker action queue');
    expect(stdout).toContain('Source provenance resolution queue');
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
    expect(stdout).toContain('| Explicit owner production approval |');
    expect(stdout).toContain('Release preflight remediation queue');
    expect(stdout).toContain('does not install tools');
    expect(stdout).toContain('corepack pnpm run check:release-readiness');
    expect(stdout).toContain('corepack pnpm run check:production-deploy-request');
    expect(stdout).toContain('Production approval prerequisite queue');
    expect(stdout).toContain('| Launch evidence validation |');
    expect(stdout).toContain('not run by this manifest; production approval packet must record pass');
    expect(stdout).toContain('corepack pnpm run check:launch-evidence-manifest');
    expect(stdout).toContain('does not grant owner approval');
    expect(stdout).toContain('Corepack/Git LFS probe ledger');
    expect(stdout).toContain('corepack pnpm run report:launch-evidence-manifest && corepack pnpm run check:release-readiness');
    expect(stdout).toContain('| Explicit owner production approval |');
    expect(stdout).toContain('not granted by this manifest or report');
    expect(stdout).toContain('| Post-deploy live proof boundary |');
    expect(stdout).toContain('not eligible before explicit approved deploy');
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
    expect(stdout).toContain('This ledger is read-only');
    expect(stdout).toContain('corepack pnpm run report:unmerged-branch-readiness');
    expect(stdout).toContain('Review-first branch packets skipped');
    expect(stdout).toContain('Top branch review packet skipped');
    expect(stdout).toContain('Canonical head comparison skipped');
    expect(stdout).toContain('approval_gate=no checkout/merge/deploy/migration/push');
    expect(stdout).toContain('High-risk, local/origin split, or stale/aging unmerged branches');
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
