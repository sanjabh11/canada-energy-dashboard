import { describe, expect, it } from 'vitest';
import {
  DEPLOYMENT_APPROVAL_CHECKLIST,
  RELEASE_HEALTH_EVIDENCE,
  RELEASE_POSTURE,
  SUPABASE_ADVISOR_STATUS_CARD,
} from '../../src/lib/releasePosture';
import { PUBLIC_RELEASE_STATUS_MANIFEST } from '../../src/lib/publicReleaseStatusManifest';

const SHARED_PUBLIC_RELEASE_EVIDENCE_CONTRACTS = [
  {
    publicId: 'deployed_artifact_live_parity',
    releaseHealthLabel: 'Latest approved production parity',
    boundaryPatterns: [/future source commits/i],
  },
  {
    publicId: 'current_source_live_parity',
    releaseHealthLabel: 'Current source live parity',
    boundaryPatterns: [/launch evidence validation/i, /owner approval/i, /post-deploy live parity/i],
  },
  {
    publicId: 'launch_evidence_validation_gate',
    releaseHealthLabel: 'Launch evidence validation gate',
    boundaryPatterns: [/does not prove production approval/i, /buyer acceptance/i, /current hosted\/live parity/i],
  },
  {
    publicId: 'objective_completion_audit',
    releaseHealthLabel: 'Objective completion audit',
    boundaryPatterns: [
      /required launch deliverables/i,
      /blocked P0\/P1 gates/i,
      /manual-stop rows/i,
      /does not prove production approval/i,
      /commercial launch readiness/i,
      /Supabase clearance/i,
      /permission to contact buyers/i,
    ],
  },
  {
    publicId: 'adversarial_review_ledger',
    releaseHealthLabel: 'Adversarial review ledger',
    boundaryPatterns: [
      /buyer evidence, production approval, release toolchain/i,
      /Supabase advisor clearance/i,
      /branch-risk challenge lanes/i,
      /does not prove production approval/i,
      /commercial launch readiness/i,
    ],
  },
  {
    publicId: 'fix_report_blocker_map',
    releaseHealthLabel: 'Fix report blocker map',
    boundaryPatterns: [
      /files changed, tests run, required checks/i,
      /unresolved blockers, and approval gates/i,
      /does not modify files/i,
      /run missing checks/i,
      /commercial launch readiness/i,
    ],
  },
  {
    publicId: 'progress_update_digest',
    releaseHealthLabel: 'Progress update digest',
    boundaryPatterns: [
      /accomplished work, target matrix, pending work/i,
      /current bottleneck, and phase progress/i,
      /does not complete pending work/i,
      /contact buyers/i,
      /does not prove production approval/i,
    ],
  },
  {
    publicId: 'bottleneck_log_digest',
    releaseHealthLabel: 'Bottleneck log digest',
    boundaryPatterns: [
      /blocked task or subtask, elapsed time, last update/i,
      /root cause, and top unblock options/i,
      /does not resolve evidence gaps/i,
      /authorize Supabase advisors/i,
      /does not prove production approval/i,
    ],
  },
  {
    publicId: 'source_provenance_isolation_ledger',
    releaseHealthLabel: 'Source provenance isolation ledger',
    boundaryPatterns: [
      /tracked, untracked, ignored, staged-only, unstaged-only, mixed/i,
      /does not commit, unstage, stash, revert/i,
      /clear source provenance/i,
      /does not prove current local cleanliness/i,
    ],
  },
  {
    publicId: 'source_provenance_resolution_queue',
    releaseHealthLabel: 'Source provenance resolution queue',
    boundaryPatterns: [
      /staged-only, unstaged-only, mixed/i,
      /does not commit, unstage, stash, revert/i,
      /does not prove current local cleanliness/i,
    ],
  },
  {
    publicId: 'source_owner_decision_packet',
    releaseHealthLabel: 'Source owner decision packet',
    boundaryPatterns: [
      /source owner decision packet/i,
      /source_provenance\.resolution_queue\.items/i,
      /recommended owner options/i,
      /commit_as_intentional_change/i,
      /unstage_for_later_review/i,
      /stash_or_revert_with_owner_approval/i,
      /does not commit, unstage, stash, revert/i,
      /choose owner intent/i,
      /does not prove current local cleanliness/i,
      /production approval/i,
    ],
  },
  {
    publicId: 'release_preflight_remediation_queue',
    releaseHealthLabel: 'Release preflight remediation queue',
    boundaryPatterns: [
      /Corepack pnpm resolver/i,
      /Git LFS push-path proof/i,
      /does not install tools/i,
      /does not prove production approval/i,
    ],
  },
  {
    publicId: 'release_operator_handoff_packet',
    releaseHealthLabel: 'Release operator handoff packet',
    boundaryPatterns: [
      /release remediation rows/i,
      /operator or owner execution gates/i,
      /toolchain_probe_first/i,
      /after_corepack_git_lfs_and_clean_source/i,
      /owner_source_decision_first/i,
      /manual_stop_after_all_prerequisites/i,
      /can_execute_from_packet=false/i,
      /does not install Corepack/i,
      /request production approval/i,
      /hosted\/live parity/i,
    ],
  },
  {
    publicId: 'release_preflight_clearance_matrix',
    releaseHealthLabel: 'Release preflight clearance matrix',
    boundaryPatterns: [
      /package-manager pin, Corepack pnpm resolver, release-readiness execution/i,
      /Git LFS push-path proof/i,
      /does not install tools/i,
      /grant owner approval/i,
    ],
  },
  {
    publicId: 'release_toolchain_probe_ledger',
    releaseHealthLabel: 'Release toolchain probe ledger',
    boundaryPatterns: [
      /Corepack pnpm resolver and Git LFS availability/i,
      /does not install tools, run release-readiness, push, deploy/i,
      /does not substitute for release-readiness or production approval/i,
    ],
  },
  {
    publicId: 'release_toolchain_approval_deficit_ledger',
    releaseHealthLabel: 'Release toolchain and approval deficit ledger',
    boundaryPatterns: [
      /package-manager pin, Corepack pnpm resolver, release-readiness execution/i,
      /Git LFS push-path proof/i,
      /does not install tools/i,
      /does not prove production approval/i,
      /create launch readiness/i,
    ],
  },
  {
    publicId: 'launch_blocker_action_queue',
    releaseHealthLabel: 'Launch blocker action queue',
    boundaryPatterns: [
      /source provenance, launch evidence validation, release toolchain, branch review/i,
      /does not deploy, merge, contact buyers/i,
      /prove launch evidence validation/i,
      /create launch readiness/i,
    ],
  },
  {
    publicId: 'launch_action_operator_handoff_packet',
    releaseHealthLabel: 'Launch action operator handoff packet',
    boundaryPatterns: [
      /source provenance, launch evidence validation, release toolchain, branch review/i,
      /Supabase advisor, buyer evidence, production approval, and post-deploy live proof/i,
      /resolve_source_provenance_first/i,
      /attach_launch_validation_evidence/i,
      /release_toolchain_after_clean_source/i,
      /read_only_branch_review_before_approval/i,
      /supabase_advisor_after_authorization/i,
      /buyer_evidence_before_approval/i,
      /owner_approval_after_all_prelaunch_gates/i,
      /post_deploy_proof_after_approved_deploy/i,
      /blocks_launch_clearance/i,
      /can_execute_from_packet=false/i,
      /does not execute queue rows/i,
      /contact buyers/i,
      /access Supabase/i,
      /request owner approval/i,
      /hosted\/live parity/i,
      /raise launch status/i,
    ],
  },
  {
    publicId: 'production_approval_prerequisite_queue',
    releaseHealthLabel: 'Production approval prerequisite queue',
    boundaryPatterns: [
      /clean source provenance, launch evidence validation, Corepack release-readiness/i,
      /does not prove production approval/i,
      /prove launch evidence validation/i,
      /post-deploy live parity/i,
    ],
  },
  {
    publicId: 'production_approval_request_packet',
    releaseHealthLabel: 'Production approval request packet',
    boundaryPatterns: [
      /pre-request, owner-decision, and post-deploy-boundary/i,
      /does not prove production approval/i,
      /access Supabase/i,
      /hosted\/live parity/i,
    ],
  },
  {
    publicId: 'production_approval_operator_handoff_packet',
    releaseHealthLabel: 'Production approval operator handoff packet',
    boundaryPatterns: [
      /production approval request packet rows/i,
      /clean_source_provenance_first/i,
      /attach_manifest_validation_evidence/i,
      /release_readiness_after_clean_source/i,
      /branch_review_before_owner_request/i,
      /supabase_advisor_after_authorization/i,
      /buyer_evidence_validation_before_approval/i,
      /owner_approval_after_pre_request_gates/i,
      /post_deploy_proof_after_approved_deploy/i,
      /pre_request/i,
      /owner_decision/i,
      /post_deploy_boundary/i,
      /blocks_approval_request/i,
      /owner_decision_required/i,
      /can_execute_from_packet=false/i,
      /does not request owner approval/i,
      /grant approval/i,
      /run deploys/i,
      /access Supabase/i,
      /clear source provenance/i,
      /hosted\/live parity/i,
      /deploy authorization/i,
    ],
  },
  {
    publicId: 'post_deploy_live_proof_gate_queue',
    releaseHealthLabel: 'Post-deploy live proof gate queue',
    boundaryPatterns: [
      /live public metadata, live static dist parity, hosted proof-pack route smoke/i,
      /does not prove current hosted\/live parity/i,
      /mutate Netlify/i,
    ],
  },
  {
    publicId: 'post_deploy_live_proof_operator_handoff_packet',
    releaseHealthLabel: 'Post-deploy live proof operator handoff packet',
    boundaryPatterns: [
      /post-deploy live proof gate queue rows/i,
      /operator execution gates/i,
      /production_approval_clearance_first/i,
      /approved_deploy_after_owner_phrase/i,
      /live_metadata_after_approved_deploy/i,
      /static_parity_after_metadata_and_build/i,
      /hosted_smoke_after_deploy/i,
      /parity_claim_after_all_live_gates_pass/i,
      /approval_required/i,
      /deploy_required/i,
      /live_account_required/i,
      /browser_smoke_required/i,
      /blocks_live_proof_gate/i,
      /can_execute_from_packet=false/i,
      /does not grant owner approval/i,
      /run browser smoke/i,
      /current hosted\/live parity/i,
    ],
  },
  {
    publicId: 'local_proof_pack_browser_smoke',
    releaseHealthLabel: 'Local proof-pack browser smoke',
    boundaryPatterns: [
      /local proof-pack browser smoke/i,
      /local preview/i,
      /does not.*satisfy Corepack-pinned release-readiness/i,
      /hosted proof-pack smoke/i,
      /post-deploy live parity/i,
      /production approval/i,
    ],
  },
  {
    publicId: 'unmerged_branch_review_queue',
    releaseHealthLabel: 'Unmerged branch review queue',
    boundaryPatterns: [
      /review-first packet/i,
      /does not create launch evidence/i,
      /merges, checkouts, migrations, or deploys/i,
    ],
  },
  {
    publicId: 'branch_family_freshness_rollup',
    releaseHealthLabel: 'Branch family freshness rollup',
    boundaryPatterns: [
      /local-only, origin-only, matching, local-ahead/i,
      /stale, aging, fresh, high-risk/i,
      /review-first branch-family counts/i,
      /does not checkout, merge, push, discard/i,
      /clear branch review/i,
      /prove production approval/i,
    ],
  },
  {
    publicId: 'top_branch_review_packet',
    releaseHealthLabel: 'Top branch review packet',
    boundaryPatterns: [
      /highest-priority focused read-only branch packet/i,
      /changed Supabase function rows/i,
      /canonical-head comparison/i,
      /does not checkout, merge, push, discard/i,
      /select a canonical head/i,
      /prove production approval/i,
    ],
  },
  {
    publicId: 'branch_clearance_matrix',
    releaseHealthLabel: 'Branch clearance matrix',
    boundaryPatterns: [
      /read-only branch review rows/i,
      /review-first families/i,
      /canonical-head decisions/i,
      /does not checkout, merge, push, discard/i,
      /prove production approval/i,
    ],
  },
  {
    publicId: 'branch_operator_handoff_packet',
    releaseHealthLabel: 'Branch operator handoff packet',
    boundaryPatterns: [
      /operator or owner execution gates/i,
      /read-only focused review first/i,
      /owner canonical-head decision first/i,
      /can_execute_from_packet=false/i,
      /does not checkout, merge, push, discard, delete/i,
      /mutate Supabase/i,
      /request production approval/i,
      /prove hosted\/live parity/i,
    ],
  },
  {
    publicId: 'canonical_head_decision_queue',
    releaseHealthLabel: 'Canonical head decision queue',
    boundaryPatterns: [
      /does not checkout, merge, push, discard/i,
      /select a branch head/i,
      /does not create launch evidence/i,
      /prove production approval/i,
    ],
  },
  {
    publicId: 'canonical_head_resolution_queue',
    releaseHealthLabel: 'Canonical head resolution queue',
    boundaryPatterns: [
      /owner-decision actions/i,
      /split, local-only, origin-only/i,
      /does not checkout, merge, push, discard, delete/i,
      /select canonical heads/i,
      /prove production approval/i,
    ],
  },
  {
    publicId: 'review_first_branch_packet_queue',
    releaseHealthLabel: 'Review-first branch packet queue',
    boundaryPatterns: [
      /focused read-only branch packets/i,
      /changed Supabase function rows/i,
      /does not checkout, merge, push, discard/i,
      /mutate Supabase/i,
    ],
  },
  {
    publicId: 'buyer_evidence_hard_gate_deficit_ledger',
    releaseHealthLabel: 'Buyer evidence hard-gate deficit ledger',
    boundaryPatterns: [
      /accepted buyer evidence, reviewer evidence, commercial signal/i,
      /retained artifacts, and 95% validation/i,
      /does not contact buyers/i,
      /does not create buyer proof/i,
      /prove commercial readiness/i,
    ],
  },
  {
    publicId: 'buyer_evidence_remediation_queue',
    releaseHealthLabel: 'Buyer evidence remediation queue',
    boundaryPatterns: [
      /accepted buyer evidence, reviewer evidence, commercial signal/i,
      /does not contact buyers/i,
      /does not create accepted evidence/i,
    ],
  },
  {
    publicId: 'buyer_evidence_acquisition_matrix',
    releaseHealthLabel: 'Buyer evidence acquisition matrix',
    boundaryPatterns: [
      /outreach intake, production pilot register, utility forecast/i,
      /accepted confidence, reviewer, retained artifact/i,
      /does not contact buyers/i,
      /does not create buyer proof/i,
    ],
  },
  {
    publicId: 'buyer_evidence_minimum_packet_handoff',
    releaseHealthLabel: 'Buyer evidence minimum packet handoff',
    boundaryPatterns: [
      /minimum buyer evidence packet handoff/i,
      /buyer_evidence\.acquisition_matrix\.rows/i,
      /outreach intake, production pilot register, utility forecast/i,
      /TIER or credit, billing or security/i,
      /retained-artifact 95% validation/i,
      /Blocks 95 Gate/i,
      /validate:pilot-evidence --require-95/i,
      /does not contact buyers/i,
      /does not create buyer proof/i,
      /does not prove commercial readiness/i,
      /create launch readiness/i,
    ],
  },
  {
    publicId: 'supabase_advisor_access',
    releaseHealthLabel: 'Supabase MCP advisors',
    boundaryPatterns: [/advisor evidence/i, /authorization/i],
  },
  {
    publicId: 'supabase_advisor_clearance_deficit_ledger',
    releaseHealthLabel: 'Supabase advisor clearance deficit ledger',
    boundaryPatterns: [
      /CLI lint freshness, connector authorization/i,
      /Security Advisor evidence, Performance Advisor evidence/i,
      /public-safe findings/i,
      /does not authorize connectors, access the dashboard/i,
      /record secrets/i,
      /does not grant production approval/i,
    ],
  },
  {
    publicId: 'supabase_advisor_operator_handoff_packet',
    releaseHealthLabel: 'Supabase advisor operator handoff packet',
    boundaryPatterns: [
      /advisor remediation rows/i,
      /operator, account-admin, security-owner, and owner execution gates/i,
      /repo_lint_freshness_first/i,
      /authorized_connector_or_dashboard_access_first/i,
      /security_advisor_after_authorization/i,
      /performance_advisor_after_authorization/i,
      /public_safe_record_after_advisor_review/i,
      /clearance_claim_after_all_rows_pass/i,
      /external-account flags/i,
      /secret-safe flags/i,
      /can_execute_from_packet=false/i,
      /does not authorize connectors/i,
      /record secrets/i,
      /hosted\/live parity/i,
    ],
  },
  {
    publicId: 'supabase_advisor_remediation_queue',
    releaseHealthLabel: 'Supabase advisor remediation queue',
    boundaryPatterns: [
      /CLI lint freshness, connector authorization/i,
      /does not authorize connectors, access the dashboard/i,
      /record secrets/i,
      /does not create or claim advisor clearance/i,
    ],
  },
] as const;

describe('status page release posture', () => {
  it('separates last approved artifact parity from current source live parity', () => {
    const deployPosture = RELEASE_POSTURE.find((item) => item.title === 'Last approved production artifact parity');
    const currentSourceParity = RELEASE_POSTURE.find((item) => item.title === 'Current source live parity');

    expect(deployPosture).toBeTruthy();
    expect(deployPosture?.status).toBe('verified');
    expect(deployPosture?.rating).toBe('5.0/5');
    expect(deployPosture?.evidence).toMatch(/last approved production artifact/i);
    expect(deployPosture?.evidence).toMatch(/hosted proof-pack smoke/i);
    expect(deployPosture?.nextAction).toMatch(/check:post-deploy-live/);
    expect(deployPosture?.nextAction).toMatch(/future source commit/i);
    expect(currentSourceParity?.status).toBe('external_gate');
    expect(currentSourceParity?.rating).toBe('2.0/5');
    expect(currentSourceParity?.evidence).toMatch(/not live-proven/i);
    expect(currentSourceParity?.evidence).toMatch(/launch evidence validation/i);
    expect(currentSourceParity?.evidence).toMatch(/explicit owner approval/i);
  });

  it('reports Supabase lint status without treating extension-owned findings as app-owned blockers', () => {
    const supabasePosture = RELEASE_POSTURE.find((item) => item.title.includes('database lint'));

    expect(supabasePosture).toBeTruthy();
    expect(supabasePosture?.status).toBe('watch');
    expect(supabasePosture?.evidence).toMatch(/last recorded/i);
    expect(supabasePosture?.evidence).toMatch(/zero app-owned lint findings/i);
    expect(supabasePosture?.evidence).toMatch(/fresh run must complete/i);
    expect(supabasePosture?.nextAction).toMatch(/check:supabase-app-lint/);
  });

  it('keeps Supabase connector advisor permission separate from CLI lint evidence', () => {
    const advisorPosture = RELEASE_POSTURE.find((item) => item.title.includes('advisor connector'));

    expect(advisorPosture).toBeTruthy();
    expect(advisorPosture?.status).toBe('needs_remediation');
    expect(advisorPosture?.evidence).toMatch(/permission denied/i);
    expect(advisorPosture?.evidence).toMatch(/qnymbecjgeaoxsfphrti/);
    expect(advisorPosture?.evidence).toMatch(/CLI lint works/i);
    expect(advisorPosture?.nextAction).toMatch(/Fix Supabase connector/i);
  });

  it('keeps current source CI as a watch gate rather than production proof', () => {
    const sourcePosture = RELEASE_POSTURE.find((item) => item.title.includes('GitHub release'));
    const sourceEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Current source CI gate');
    const branchReviewPosture = RELEASE_POSTURE.find((item) => item.title === 'Unmerged branch review queue');

    expect(sourcePosture).toBeTruthy();
    expect(sourcePosture?.status).toBe('watch');
    expect(sourcePosture?.evidence).toMatch(/local source can be ahead of origin or dirty/i);
    expect(sourcePosture?.evidence).toMatch(/staged-only, unstaged-only, mixed/i);
    expect(sourcePosture?.evidence).toMatch(/does not prove production deploy parity/i);
    expect(sourcePosture?.nextAction).toMatch(/report:production-approval-packet/);
    expect(sourceEvidence?.status).toBe('watch');
    expect(sourceEvidence?.evidenceBoundary).toMatch(/staged-only, or unstaged source blockers must be checked separately/i);
    expect(branchReviewPosture?.status).toBe('external_gate');
    expect(branchReviewPosture?.evidence).toMatch(/4 high-risk, 3 medium-risk, and 1 low-risk/i);
    expect(branchReviewPosture?.evidence).toMatch(/three review-first branch packets/i);
    expect(branchReviewPosture?.evidence).toMatch(/do not create launch evidence/i);
    expect(branchReviewPosture?.nextAction).toMatch(/review-first packets/i);
  });

  it('exposes public-safe release health evidence without turning source CI into production deploy proof', () => {
    const deployEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Last verified production artifact');
    const latestApprovedParityEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Latest approved production parity');
    const currentSourceParityEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Current source live parity');
    const launchEvidenceValidationEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Launch evidence validation gate');
    const objectiveCompletionAuditEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Objective completion audit');
    const adversarialReviewLedgerEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Adversarial review ledger');
    const fixReportBlockerMapEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Fix report blocker map');
    const progressUpdateDigestEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Progress update digest');
    const bottleneckLogDigestEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Bottleneck log digest');
    const sourceEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Current source CI gate');
    const sourceIsolationLedgerEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Source provenance isolation ledger');
    const sourceResolutionQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Source provenance resolution queue');
    const sourceOwnerDecisionPacketEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Source owner decision packet');
    const releaseToolchainApprovalDeficitLedgerEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Release toolchain and approval deficit ledger');
    const releasePreflightQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Release preflight remediation queue');
    const releaseOperatorHandoffPacketEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Release operator handoff packet');
    const releasePreflightClearanceMatrixEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Release preflight clearance matrix');
    const releaseToolchainProbeEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Release toolchain probe ledger');
    const branchReviewEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Unmerged branch review queue');
    const branchFamilyFreshnessRollupEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Branch family freshness rollup');
    const topBranchReviewPacketEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Top branch review packet');
    const branchClearanceMatrixEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Branch clearance matrix');
    const branchOperatorHandoffPacketEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Branch operator handoff packet');
    const canonicalHeadQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Canonical head decision queue');
    const canonicalHeadResolutionQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Canonical head resolution queue');
    const reviewFirstPacketQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Review-first branch packet queue');
    const launchQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Launch blocker action queue');
    const launchActionOperatorHandoffPacketEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Launch action operator handoff packet');
    const productionApprovalQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Production approval prerequisite queue');
    const productionApprovalRequestPacketEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Production approval request packet');
    const productionApprovalOperatorHandoffPacketEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Production approval operator handoff packet');
    const postDeployQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Post-deploy live proof gate queue');
    const postDeployOperatorHandoffPacketEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Post-deploy live proof operator handoff packet');
    const localProofPackSmokeEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Local proof-pack browser smoke');
    const buyerHardGateDeficitLedgerEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Buyer evidence hard-gate deficit ledger');
    const buyerAcquisitionMatrixEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Buyer evidence acquisition matrix');
    const buyerMinimumPacketHandoffEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Buyer evidence minimum packet handoff');
    const buyerRemediationQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Buyer evidence remediation queue');
    const supabaseClearanceDeficitLedgerEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Supabase advisor clearance deficit ledger');
    const supabaseOperatorHandoffPacketEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Supabase advisor operator handoff packet');
    const supabaseRemediationQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Supabase advisor remediation queue');
    const buyerEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Buyer evidence scan');
    const supabaseAdvisorEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Supabase MCP advisors');

    expect(RELEASE_HEALTH_EVIDENCE).toHaveLength(44);
    expect(deployEvidence?.status).toBe('verified');
    expect(deployEvidence?.publicReference?.url).toContain('/deploys');
    expect(deployEvidence?.evidenceBoundary).toMatch(/passed hosted metadata, exact static dist parity, and hosted proof-pack smoke/i);
    expect(latestApprovedParityEvidence?.status).toBe('verified');
    expect(latestApprovedParityEvidence?.command).toContain('check:post-deploy-live');
    expect(latestApprovedParityEvidence?.evidenceBoundary).toMatch(/does not prove future source commits/i);
    expect(currentSourceParityEvidence?.status).toBe('external_gate');
    expect(currentSourceParityEvidence?.command).toContain('report:production-approval-packet');
    expect(currentSourceParityEvidence?.evidenceBoundary).toMatch(/launch evidence validation passes/i);
    expect(currentSourceParityEvidence?.evidenceBoundary).toMatch(/owner approval is explicit/i);
    expect(launchEvidenceValidationEvidence?.status).toBe('external_gate');
    expect(launchEvidenceValidationEvidence?.command).toContain('report:launch-evidence-validation-readiness');
    expect(launchEvidenceValidationEvidence?.command).toContain('check:launch-evidence-validation-report');
    expect(launchEvidenceValidationEvidence?.evidenceBoundary).toMatch(/manifest structure and proof-boundary consistency/i);
    expect(launchEvidenceValidationEvidence?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(launchEvidenceValidationEvidence?.evidenceBoundary).toMatch(/buyer acceptance/i);
    expect(launchEvidenceValidationEvidence?.evidenceBoundary).toMatch(/current hosted\/live parity/i);
    expect(launchEvidenceValidationEvidence?.sourceManifestPath).toBe('launch_action_queue.items[phase=launch_evidence_validation]');
    expect(launchEvidenceValidationEvidence?.sourceProofTypes).toEqual([
      'manifest_validation_and_approval_packet',
      'manifest_validation',
      'schema_validation',
    ]);
    expect(objectiveCompletionAuditEvidence?.status).toBe('external_gate');
    expect(objectiveCompletionAuditEvidence?.command).toContain('report:objective-completion-audit-readiness');
    expect(objectiveCompletionAuditEvidence?.command).toContain('check:objective-completion-audit-report');
    expect(objectiveCompletionAuditEvidence?.evidenceBoundary).toMatch(/required launch deliverables/i);
    expect(objectiveCompletionAuditEvidence?.evidenceBoundary).toMatch(/blocked P0\/P1 gates/i);
    expect(objectiveCompletionAuditEvidence?.evidenceBoundary).toMatch(/manual-stop rows/i);
    expect(objectiveCompletionAuditEvidence?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(objectiveCompletionAuditEvidence?.evidenceBoundary).toMatch(/commercial launch readiness/i);
    expect(objectiveCompletionAuditEvidence?.evidenceBoundary).toMatch(/Supabase clearance/i);
    expect(objectiveCompletionAuditEvidence?.evidenceBoundary).toMatch(/permission to contact buyers/i);
    expect(objectiveCompletionAuditEvidence?.sourceManifestPath).toBe('completion_audit');
    expect(objectiveCompletionAuditEvidence?.sourceProofType).toBe('completion_audit_current_state');
    expect(adversarialReviewLedgerEvidence?.status).toBe('external_gate');
    expect(adversarialReviewLedgerEvidence?.command).toContain('report:adversarial-review-readiness');
    expect(adversarialReviewLedgerEvidence?.command).toContain('check:adversarial-review-report');
    expect(adversarialReviewLedgerEvidence?.evidenceBoundary).toMatch(/buyer evidence, production approval, release toolchain/i);
    expect(adversarialReviewLedgerEvidence?.evidenceBoundary).toMatch(/Supabase advisor clearance/i);
    expect(adversarialReviewLedgerEvidence?.evidenceBoundary).toMatch(/branch-risk challenge lanes/i);
    expect(adversarialReviewLedgerEvidence?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(adversarialReviewLedgerEvidence?.sourceManifestPath).toBe('adversarial_reviews');
    expect(adversarialReviewLedgerEvidence?.sourceProofTypes).toEqual([
      'buyer_evidence_adversarial_review',
      'production_approval_adversarial_review',
      'release_toolchain_adversarial_review',
      'external_advisor_adversarial_review',
      'branch_risk_adversarial_review',
    ]);
    expect(fixReportBlockerMapEvidence?.status).toBe('external_gate');
    expect(fixReportBlockerMapEvidence?.command).toContain('report:commercial-launch-readiness');
    expect(fixReportBlockerMapEvidence?.command).toContain('check:commercial-launch-readiness-report');
    expect(fixReportBlockerMapEvidence?.command).toContain('report:launch-evidence-manifest');
    expect(fixReportBlockerMapEvidence?.command).toContain('check:launch-evidence-manifest');
    expect(fixReportBlockerMapEvidence?.evidenceBoundary).toMatch(/files changed, tests run, required checks/i);
    expect(fixReportBlockerMapEvidence?.evidenceBoundary).toMatch(/unresolved blockers, and approval gates/i);
    expect(fixReportBlockerMapEvidence?.evidenceBoundary).toMatch(/does not modify files/i);
    expect(fixReportBlockerMapEvidence?.evidenceBoundary).toMatch(/run missing checks/i);
    expect(fixReportBlockerMapEvidence?.evidenceBoundary).toMatch(/commercial launch readiness/i);
    expect(fixReportBlockerMapEvidence?.sourceManifestPath).toBe('fix_report');
    expect(fixReportBlockerMapEvidence?.sourceProofType).toBe('fix_report_blocker_map');
    expect(adversarialReviewLedgerEvidence?.evidenceBoundary).toMatch(/commercial launch readiness/i);
    expect(progressUpdateDigestEvidence?.status).toBe('external_gate');
    expect(progressUpdateDigestEvidence?.command).toContain('report:progress-digest-readiness');
    expect(progressUpdateDigestEvidence?.command).toContain('check:progress-digest-report');
    expect(progressUpdateDigestEvidence?.evidenceBoundary).toMatch(/accomplished work, target matrix, pending work/i);
    expect(progressUpdateDigestEvidence?.evidenceBoundary).toMatch(/current bottleneck, and phase progress/i);
    expect(progressUpdateDigestEvidence?.evidenceBoundary).toMatch(/does not complete pending work/i);
    expect(progressUpdateDigestEvidence?.evidenceBoundary).toMatch(/contact buyers/i);
    expect(progressUpdateDigestEvidence?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(progressUpdateDigestEvidence?.sourceManifestPath).toBe('progress_updates');
    expect(bottleneckLogDigestEvidence?.status).toBe('external_gate');
    expect(bottleneckLogDigestEvidence?.command).toContain('report:progress-digest-readiness');
    expect(bottleneckLogDigestEvidence?.command).toContain('check:progress-digest-report');
    expect(bottleneckLogDigestEvidence?.evidenceBoundary).toMatch(/blocked task or subtask, elapsed time, last update/i);
    expect(bottleneckLogDigestEvidence?.evidenceBoundary).toMatch(/root cause, and top unblock options/i);
    expect(bottleneckLogDigestEvidence?.evidenceBoundary).toMatch(/does not resolve evidence gaps/i);
    expect(bottleneckLogDigestEvidence?.evidenceBoundary).toMatch(/authorize Supabase advisors/i);
    expect(bottleneckLogDigestEvidence?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(bottleneckLogDigestEvidence?.sourceManifestPath).toBe('bottleneck_log');
    expect(sourceEvidence?.status).toBe('watch');
    expect(sourceEvidence?.command).toContain('gh run list');
    expect(sourceEvidence?.publicReference).toBeUndefined();
    expect(sourceEvidence?.evidenceBoundary).toMatch(/does not prove that production has been redeployed/i);
    expect(sourceEvidence?.evidenceBoundary).toMatch(/staged-only, or unstaged source blockers/i);
    expect(sourceIsolationLedgerEvidence?.status).toBe('external_gate');
    expect(sourceIsolationLedgerEvidence?.command).toContain('report:source-provenance-readiness');
    expect(sourceIsolationLedgerEvidence?.command).toContain('check:source-provenance-report');
    expect(sourceIsolationLedgerEvidence?.evidenceBoundary).toMatch(/tracked, untracked, ignored, staged-only/i);
    expect(sourceIsolationLedgerEvidence?.evidenceBoundary).toMatch(/does not commit, unstage, stash, revert/i);
    expect(sourceIsolationLedgerEvidence?.evidenceBoundary).toMatch(/does not prove current local cleanliness/i);
    expect(sourceIsolationLedgerEvidence?.sourceManifestPath).toBe('source_provenance.isolation_ledger');
    expect(sourceIsolationLedgerEvidence?.sourceProofTypes).toEqual([
      'source_provenance_isolation_ledger',
      'source_rename_decision',
    ]);
    expect(sourceResolutionQueueEvidence?.status).toBe('external_gate');
    expect(sourceResolutionQueueEvidence?.command).toContain('report:source-provenance-readiness');
    expect(sourceResolutionQueueEvidence?.command).toContain('check:source-provenance-report');
    expect(sourceResolutionQueueEvidence?.evidenceBoundary).toMatch(/staged-only, unstaged-only, mixed/i);
    expect(sourceResolutionQueueEvidence?.evidenceBoundary).toMatch(/does not commit, unstage, stash, revert/i);
    expect(sourceResolutionQueueEvidence?.evidenceBoundary).toMatch(/prove current local cleanliness/i);
    expect(sourceResolutionQueueEvidence?.sourceManifestPath).toBe('source_provenance.resolution_queue');
    expect(sourceResolutionQueueEvidence?.sourceProofTypes).toEqual([
      'source_rename_decision',
    ]);
    expect(sourceOwnerDecisionPacketEvidence?.status).toBe('external_gate');
    expect(sourceOwnerDecisionPacketEvidence?.command).toContain('report:source-provenance-readiness');
    expect(sourceOwnerDecisionPacketEvidence?.command).toContain('check:source-provenance-report');
    expect(sourceOwnerDecisionPacketEvidence?.evidenceBoundary).toMatch(/source owner decision packet/i);
    expect(sourceOwnerDecisionPacketEvidence?.evidenceBoundary).toMatch(/source_provenance\.resolution_queue\.items/i);
    expect(sourceOwnerDecisionPacketEvidence?.evidenceBoundary).toMatch(/recommended owner options/i);
    expect(sourceOwnerDecisionPacketEvidence?.evidenceBoundary).toMatch(/commit_as_intentional_change/i);
    expect(sourceOwnerDecisionPacketEvidence?.evidenceBoundary).toMatch(/unstage_for_later_review/i);
    expect(sourceOwnerDecisionPacketEvidence?.evidenceBoundary).toMatch(/stash_or_revert_with_owner_approval/i);
    expect(sourceOwnerDecisionPacketEvidence?.evidenceBoundary).toMatch(/does not commit, unstage, stash, revert/i);
    expect(sourceOwnerDecisionPacketEvidence?.evidenceBoundary).toMatch(/choose owner intent/i);
    expect(sourceOwnerDecisionPacketEvidence?.evidenceBoundary).toMatch(/does not prove current local cleanliness/i);
    expect(sourceOwnerDecisionPacketEvidence?.evidenceBoundary).toMatch(/production approval/i);
    expect(sourceOwnerDecisionPacketEvidence?.sourceManifestPath).toBe('source_provenance.owner_decision_packet');
    expect(sourceOwnerDecisionPacketEvidence?.sourceProofTypes).toEqual([
      'source_owner_decision_packet',
      'source_rename_decision',
    ]);
    expect(releaseToolchainApprovalDeficitLedgerEvidence?.status).toBe('external_gate');
    expect(releaseToolchainApprovalDeficitLedgerEvidence?.command).toContain('report:release-preflight');
    expect(releaseToolchainApprovalDeficitLedgerEvidence?.command).toContain('check:release-preflight-report');
    expect(releaseToolchainApprovalDeficitLedgerEvidence?.evidenceBoundary).toMatch(/package-manager pin, Corepack pnpm resolver, release-readiness execution/i);
    expect(releaseToolchainApprovalDeficitLedgerEvidence?.evidenceBoundary).toMatch(/Git LFS push-path proof/i);
    expect(releaseToolchainApprovalDeficitLedgerEvidence?.evidenceBoundary).toMatch(/does not install tools/i);
    expect(releaseToolchainApprovalDeficitLedgerEvidence?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(releasePreflightQueueEvidence?.status).toBe('external_gate');
    expect(releasePreflightQueueEvidence?.command).toContain('report:release-preflight');
    expect(releasePreflightQueueEvidence?.command).toContain('check:release-preflight-report');
    expect(releasePreflightQueueEvidence?.evidenceBoundary).toMatch(/Corepack pnpm resolver, release-readiness execution/i);
    expect(releasePreflightQueueEvidence?.evidenceBoundary).toMatch(/Git LFS push-path proof/i);
    expect(releasePreflightQueueEvidence?.evidenceBoundary).toMatch(/does not install tools, clear source provenance, run release-readiness/i);
    expect(releaseOperatorHandoffPacketEvidence?.status).toBe('external_gate');
    expect(releaseOperatorHandoffPacketEvidence?.command).toContain('report:release-preflight');
    expect(releaseOperatorHandoffPacketEvidence?.command).toContain('check:release-preflight-report');
    expect(releaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/release remediation rows/i);
    expect(releaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/operator or owner execution gates/i);
    expect(releaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/toolchain_probe_first/i);
    expect(releaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/after_corepack_git_lfs_and_clean_source/i);
    expect(releaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/owner_source_decision_first/i);
    expect(releaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/manual_stop_after_all_prerequisites/i);
    expect(releaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/can_execute_from_packet=false/i);
    expect(releaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/does not install Corepack/i);
    expect(releaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/request production approval/i);
    expect(releaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/hosted\/live parity/i);
    expect(releasePreflightClearanceMatrixEvidence?.status).toBe('external_gate');
    expect(releasePreflightClearanceMatrixEvidence?.command).toContain('report:release-preflight');
    expect(releasePreflightClearanceMatrixEvidence?.command).toContain('check:release-preflight-report');
    expect(releasePreflightClearanceMatrixEvidence?.evidenceBoundary).toMatch(/package-manager pin, Corepack pnpm resolver, release-readiness execution/i);
    expect(releasePreflightClearanceMatrixEvidence?.evidenceBoundary).toMatch(/Git LFS push-path proof/i);
    expect(releasePreflightClearanceMatrixEvidence?.evidenceBoundary).toMatch(/does not install tools/i);
    expect(releasePreflightClearanceMatrixEvidence?.evidenceBoundary).toMatch(/does not prove production approval or current hosted\/live parity/i);
    expect(releasePreflightClearanceMatrixEvidence?.evidenceBoundary).toMatch(/grant owner approval/i);
    expect(releaseToolchainProbeEvidence?.status).toBe('external_gate');
    expect(releaseToolchainProbeEvidence?.command).toContain('report:release-preflight');
    expect(releaseToolchainProbeEvidence?.command).toContain('check:release-preflight-report');
    expect(releaseToolchainProbeEvidence?.evidenceBoundary).toMatch(/Corepack pnpm resolver and Git LFS availability/i);
    expect(releaseToolchainProbeEvidence?.evidenceBoundary).toMatch(/does not install tools, run release-readiness, push, deploy/i);
    expect(releaseToolchainProbeEvidence?.evidenceBoundary).toMatch(/does not substitute for release-readiness or production approval/i);
    expect(branchReviewEvidence?.status).toBe('external_gate');
    expect(branchReviewEvidence?.command).toContain('report:branch-review-readiness');
    expect(branchReviewEvidence?.command).toContain('check:branch-review-report');
    expect(branchReviewEvidence?.evidenceBoundary).toMatch(/does not create launch evidence/i);
    expect(branchReviewEvidence?.evidenceBoundary).toMatch(/review-first packet evidence/i);
    expect(branchReviewEvidence?.evidenceBoundary).toMatch(/merges, checkouts, migrations, or deploys/i);
    expect(branchFamilyFreshnessRollupEvidence?.status).toBe('external_gate');
    expect(branchFamilyFreshnessRollupEvidence?.command).toContain('report:branch-review-readiness');
    expect(branchFamilyFreshnessRollupEvidence?.command).toContain('check:branch-review-report');
    expect(branchFamilyFreshnessRollupEvidence?.evidenceBoundary).toMatch(/local-only, origin-only, matching, local-ahead/i);
    expect(branchFamilyFreshnessRollupEvidence?.evidenceBoundary).toMatch(/stale, aging, fresh, high-risk/i);
    expect(branchFamilyFreshnessRollupEvidence?.evidenceBoundary).toMatch(/review-first branch-family counts/i);
    expect(branchFamilyFreshnessRollupEvidence?.evidenceBoundary).toMatch(/does not checkout, merge, push, discard/i);
    expect(branchFamilyFreshnessRollupEvidence?.evidenceBoundary).toMatch(/prove production approval/i);
    expect(topBranchReviewPacketEvidence?.status).toBe('external_gate');
    expect(topBranchReviewPacketEvidence?.command).toContain('report:branch-review-readiness');
    expect(topBranchReviewPacketEvidence?.command).toContain('check:branch-review-report');
    expect(topBranchReviewPacketEvidence?.evidenceBoundary).toMatch(/highest-priority focused read-only branch packet/i);
    expect(topBranchReviewPacketEvidence?.evidenceBoundary).toMatch(/changed Supabase function rows/i);
    expect(topBranchReviewPacketEvidence?.evidenceBoundary).toMatch(/canonical-head comparison/i);
    expect(topBranchReviewPacketEvidence?.evidenceBoundary).toMatch(/does not checkout, merge, push, discard/i);
    expect(topBranchReviewPacketEvidence?.evidenceBoundary).toMatch(/prove production approval/i);
    expect(branchClearanceMatrixEvidence?.status).toBe('external_gate');
    expect(branchClearanceMatrixEvidence?.command).toContain('report:branch-review-readiness');
    expect(branchClearanceMatrixEvidence?.command).toContain('check:branch-review-report');
    expect(branchClearanceMatrixEvidence?.evidenceBoundary).toMatch(/read-only branch review rows/i);
    expect(branchClearanceMatrixEvidence?.evidenceBoundary).toMatch(/canonical-head decisions/i);
    expect(branchClearanceMatrixEvidence?.evidenceBoundary).toMatch(/prove production approval/i);
    expect(branchOperatorHandoffPacketEvidence?.status).toBe('external_gate');
    expect(branchOperatorHandoffPacketEvidence?.command).toContain('report:branch-review-readiness');
    expect(branchOperatorHandoffPacketEvidence?.command).toContain('check:branch-review-report');
    expect(branchOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/operator or owner execution gates/i);
    expect(branchOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/read-only focused review first/i);
    expect(branchOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/owner canonical-head decision first/i);
    expect(branchOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/can_execute_from_packet=false/i);
    expect(branchOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/does not checkout, merge, push, discard, delete/i);
    expect(branchOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/mutate Supabase/i);
    expect(branchOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/request production approval/i);
    expect(branchOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/prove hosted\/live parity/i);
    expect(canonicalHeadQueueEvidence?.status).toBe('external_gate');
    expect(canonicalHeadQueueEvidence?.command).toContain('report:branch-review-readiness');
    expect(canonicalHeadQueueEvidence?.command).toContain('check:branch-review-report');
    expect(canonicalHeadQueueEvidence?.evidenceBoundary).toMatch(/split, local-only, origin-only, stale, aging, and unknown/i);
    expect(canonicalHeadQueueEvidence?.evidenceBoundary).toMatch(/does not checkout, merge, push, discard/i);
    expect(canonicalHeadQueueEvidence?.evidenceBoundary).toMatch(/select a branch head/i);
    expect(canonicalHeadResolutionQueueEvidence?.status).toBe('external_gate');
    expect(canonicalHeadResolutionQueueEvidence?.command).toContain('report:branch-review-readiness');
    expect(canonicalHeadResolutionQueueEvidence?.command).toContain('check:branch-review-report');
    expect(canonicalHeadResolutionQueueEvidence?.evidenceBoundary).toMatch(/owner-decision actions/i);
    expect(canonicalHeadResolutionQueueEvidence?.evidenceBoundary).toMatch(/does not checkout, merge, push, discard, delete/i);
    expect(canonicalHeadResolutionQueueEvidence?.evidenceBoundary).toMatch(/prove production approval/i);
    expect(reviewFirstPacketQueueEvidence?.status).toBe('external_gate');
    expect(reviewFirstPacketQueueEvidence?.command).toContain('report:branch-review-readiness');
    expect(reviewFirstPacketQueueEvidence?.command).toContain('check:branch-review-report');
    expect(reviewFirstPacketQueueEvidence?.evidenceBoundary).toMatch(/focused read-only branch packets/i);
    expect(reviewFirstPacketQueueEvidence?.evidenceBoundary).toMatch(/changed Supabase function rows/i);
    expect(reviewFirstPacketQueueEvidence?.evidenceBoundary).toMatch(/does not checkout, merge, push, discard/i);
    expect(reviewFirstPacketQueueEvidence?.evidenceBoundary).toMatch(/mutate Supabase/i);
    expect(launchQueueEvidence?.status).toBe('external_gate');
    expect(launchQueueEvidence?.command).toContain('report:launch-action-readiness');
    expect(launchQueueEvidence?.command).toContain('check:launch-action-report');
    expect(launchQueueEvidence?.evidenceBoundary).toMatch(/sequences source provenance, launch evidence validation, release toolchain, branch review/i);
    expect(launchQueueEvidence?.evidenceBoundary).toMatch(/does not deploy, merge, contact buyers/i);
    expect(launchQueueEvidence?.evidenceBoundary).toMatch(/prove launch evidence validation/i);
    expect(launchQueueEvidence?.evidenceBoundary).toMatch(/create launch readiness/i);
    expect(launchActionOperatorHandoffPacketEvidence?.status).toBe('external_gate');
    expect(launchActionOperatorHandoffPacketEvidence?.command).toContain('report:launch-action-readiness');
    expect(launchActionOperatorHandoffPacketEvidence?.command).toContain('check:launch-action-report');
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/source provenance, launch evidence validation, release toolchain, branch review/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/Supabase advisor, buyer evidence, production approval, and post-deploy live proof/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/resolve_source_provenance_first/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/attach_launch_validation_evidence/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/release_toolchain_after_clean_source/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/read_only_branch_review_before_approval/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/supabase_advisor_after_authorization/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/buyer_evidence_before_approval/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/owner_approval_after_all_prelaunch_gates/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/post_deploy_proof_after_approved_deploy/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/blocks_launch_clearance/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/can_execute_from_packet=false/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/does not execute queue rows/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/contact buyers/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/access Supabase/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/request owner approval/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/hosted\/live parity/i);
    expect(launchActionOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/raise launch status/i);
    expect(productionApprovalQueueEvidence?.status).toBe('external_gate');
    expect(productionApprovalQueueEvidence?.command).toContain('report:production-approval-readiness');
    expect(productionApprovalQueueEvidence?.command).toContain('check:production-approval-report');
    expect(productionApprovalQueueEvidence?.evidenceBoundary).toMatch(/clean source provenance, launch evidence validation, Corepack release-readiness/i);
    expect(productionApprovalQueueEvidence?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(productionApprovalQueueEvidence?.evidenceBoundary).toMatch(/prove launch evidence validation/i);
    expect(productionApprovalQueueEvidence?.evidenceBoundary).toMatch(/claim post-deploy live parity/i);
    expect(productionApprovalRequestPacketEvidence?.status).toBe('external_gate');
    expect(productionApprovalRequestPacketEvidence?.command).toContain('report:production-approval-readiness');
    expect(productionApprovalRequestPacketEvidence?.command).toContain('check:production-approval-report');
    expect(productionApprovalRequestPacketEvidence?.command).toContain('check:production-deploy-request');
    expect(productionApprovalRequestPacketEvidence?.evidenceBoundary).toMatch(/pre-request, owner-decision, and post-deploy-boundary/i);
    expect(productionApprovalRequestPacketEvidence?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(productionApprovalRequestPacketEvidence?.evidenceBoundary).toMatch(/access Supabase/i);
    expect(productionApprovalRequestPacketEvidence?.evidenceBoundary).toMatch(/hosted\/live parity/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.status).toBe('external_gate');
    expect(productionApprovalOperatorHandoffPacketEvidence?.command).toContain('report:production-approval-readiness');
    expect(productionApprovalOperatorHandoffPacketEvidence?.command).toContain('check:production-approval-report');
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/production approval request packet rows/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/clean_source_provenance_first/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/attach_manifest_validation_evidence/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/release_readiness_after_clean_source/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/branch_review_before_owner_request/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/supabase_advisor_after_authorization/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/buyer_evidence_validation_before_approval/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/owner_approval_after_pre_request_gates/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/post_deploy_proof_after_approved_deploy/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/pre_request/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/owner_decision/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/post_deploy_boundary/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/blocks_approval_request/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/owner_decision_required/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/can_execute_from_packet=false/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/does not request owner approval/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/grant approval/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/run deploys/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/access Supabase/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/clear source provenance/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/hosted\/live parity/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/commercial launch readiness status/i);
    expect(productionApprovalOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/deploy authorization/i);
    expect(postDeployQueueEvidence?.status).toBe('external_gate');
    expect(postDeployQueueEvidence?.command).toContain('report:post-deploy-live-proof-readiness');
    expect(postDeployQueueEvidence?.command).toContain('check:post-deploy-live-proof-report');
    expect(postDeployQueueEvidence?.evidenceBoundary).toMatch(/live public metadata, live static dist parity, hosted proof-pack route smoke/i);
    expect(postDeployQueueEvidence?.evidenceBoundary).toMatch(/does not prove current hosted\/live parity/i);
    expect(postDeployQueueEvidence?.evidenceBoundary).toMatch(/mutate Netlify/i);
    expect(postDeployOperatorHandoffPacketEvidence?.status).toBe('external_gate');
    expect(postDeployOperatorHandoffPacketEvidence?.command).toContain('report:post-deploy-live-proof-readiness');
    expect(postDeployOperatorHandoffPacketEvidence?.command).toContain('check:post-deploy-live-proof-report');
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/post-deploy live proof gate queue rows/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/operator execution gates/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/production_approval_clearance_first/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/approved_deploy_after_owner_phrase/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/live_metadata_after_approved_deploy/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/static_parity_after_metadata_and_build/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/hosted_smoke_after_deploy/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/parity_claim_after_all_live_gates_pass/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/approval_required/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/deploy_required/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/live_account_required/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/browser_smoke_required/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/blocks_live_proof_gate/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/can_execute_from_packet=false/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/does not grant owner approval/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/run deploys/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/run browser smoke/i);
    expect(postDeployOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/current hosted\/live parity/i);
    expect(localProofPackSmokeEvidence?.status).toBe('external_gate');
    expect(localProofPackSmokeEvidence?.command).toContain('test:browser:local:proof-packs');
    expect(localProofPackSmokeEvidence?.evidenceBoundary).toMatch(/local proof-pack browser smoke/i);
    expect(localProofPackSmokeEvidence?.evidenceBoundary).toMatch(/local preview/i);
    expect(localProofPackSmokeEvidence?.evidenceBoundary).toMatch(/does not.*satisfy Corepack-pinned release-readiness/i);
    expect(localProofPackSmokeEvidence?.evidenceBoundary).toMatch(/hosted proof-pack smoke/i);
    expect(localProofPackSmokeEvidence?.evidenceBoundary).toMatch(/post-deploy live parity/i);
    expect(localProofPackSmokeEvidence?.evidenceBoundary).toMatch(/production approval/i);
    expect(buyerHardGateDeficitLedgerEvidence?.status).toBe('external_gate');
    expect(buyerHardGateDeficitLedgerEvidence?.command).toContain('report:buyer-evidence-gate-readiness');
    expect(buyerHardGateDeficitLedgerEvidence?.command).toContain('check:buyer-evidence-gate-report');
    expect(buyerHardGateDeficitLedgerEvidence?.evidenceBoundary).toMatch(/accepted buyer evidence, reviewer evidence, commercial signal/i);
    expect(buyerHardGateDeficitLedgerEvidence?.evidenceBoundary).toMatch(/retained artifacts, and 95% validation/i);
    expect(buyerHardGateDeficitLedgerEvidence?.evidenceBoundary).toMatch(/does not contact buyers/i);
    expect(buyerHardGateDeficitLedgerEvidence?.evidenceBoundary).toMatch(/does not create buyer proof/i);
    expect(buyerHardGateDeficitLedgerEvidence?.sourceManifestPath).toBe('buyer_evidence.hard_gate_deficits');
    expect(buyerHardGateDeficitLedgerEvidence?.sourceProofTypes).toEqual([
      'buyer_evidence_hard_gate',
    ]);
    expect(buyerAcquisitionMatrixEvidence?.status).toBe('external_gate');
    expect(buyerAcquisitionMatrixEvidence?.command).toContain('report:buyer-evidence-gate-readiness');
    expect(buyerAcquisitionMatrixEvidence?.command).toContain('check:buyer-evidence-gate-report');
    expect(buyerAcquisitionMatrixEvidence?.evidenceBoundary).toMatch(/outreach intake, production pilot register, utility forecast/i);
    expect(buyerAcquisitionMatrixEvidence?.evidenceBoundary).toMatch(/does not contact buyers/i);
    expect(buyerAcquisitionMatrixEvidence?.evidenceBoundary).toMatch(/does not create buyer proof/i);
    expect(buyerAcquisitionMatrixEvidence?.sourceManifestPath).toBe('buyer_evidence.acquisition_matrix');
    expect(buyerAcquisitionMatrixEvidence?.sourceProofTypes).toEqual([
      'buyer_evidence_acquisition_matrix',
      'outreach_intake_acquisition',
      'production_register_acquisition',
      'forecast_trust_artifact_preparation',
      'retained_artifact_preparation',
      'buyer_acceptance_report',
      'retained_artifact_and_register_update',
      'register_update',
      'commercial_commitment_artifact',
      'retained_artifact_validation',
    ]);
    expect(buyerMinimumPacketHandoffEvidence?.status).toBe('external_gate');
    expect(buyerMinimumPacketHandoffEvidence?.command).toContain('report:buyer-evidence-gate-readiness');
    expect(buyerMinimumPacketHandoffEvidence?.command).toContain('check:buyer-evidence-gate-report');
    expect(buyerMinimumPacketHandoffEvidence?.evidenceBoundary).toMatch(/minimum buyer evidence packet handoff/i);
    expect(buyerMinimumPacketHandoffEvidence?.evidenceBoundary).toMatch(/buyer_evidence\.acquisition_matrix\.rows/i);
    expect(buyerMinimumPacketHandoffEvidence?.evidenceBoundary).toMatch(/outreach intake, production pilot register, utility forecast/i);
    expect(buyerMinimumPacketHandoffEvidence?.evidenceBoundary).toMatch(/TIER or credit, billing or security/i);
    expect(buyerMinimumPacketHandoffEvidence?.evidenceBoundary).toMatch(/retained-artifact 95% validation/i);
    expect(buyerMinimumPacketHandoffEvidence?.evidenceBoundary).toMatch(/Blocks 95 Gate/i);
    expect(buyerMinimumPacketHandoffEvidence?.evidenceBoundary).toMatch(/validate:pilot-evidence --require-95/i);
    expect(buyerMinimumPacketHandoffEvidence?.evidenceBoundary).toMatch(/does not contact buyers/i);
    expect(buyerMinimumPacketHandoffEvidence?.evidenceBoundary).toMatch(/send outreach/i);
    expect(buyerMinimumPacketHandoffEvidence?.evidenceBoundary).toMatch(/create accepted evidence/i);
    expect(buyerMinimumPacketHandoffEvidence?.evidenceBoundary).toMatch(/attach retained artifacts/i);
    expect(buyerMinimumPacketHandoffEvidence?.evidenceBoundary).toMatch(/does not create buyer proof/i);
    expect(buyerMinimumPacketHandoffEvidence?.evidenceBoundary).toMatch(/does not prove commercial readiness/i);
    expect(buyerMinimumPacketHandoffEvidence?.evidenceBoundary).toMatch(/create launch readiness/i);
    expect(buyerMinimumPacketHandoffEvidence?.sourceManifestPath).toBe('buyer_evidence.minimum_evidence_packet');
    expect(buyerMinimumPacketHandoffEvidence?.sourceProofTypes).toEqual([
      'buyer_evidence_minimum_packet_handoff',
      'outreach_intake_acquisition',
      'production_register_acquisition',
      'forecast_trust_artifact_preparation',
      'retained_artifact_preparation',
      'buyer_acceptance_report',
      'retained_artifact_and_register_update',
      'register_update',
      'commercial_commitment_artifact',
      'retained_artifact_validation',
    ]);
    expect(buyerRemediationQueueEvidence?.status).toBe('external_gate');
    expect(buyerRemediationQueueEvidence?.command).toContain('report:buyer-evidence-gate-readiness');
    expect(buyerRemediationQueueEvidence?.command).toContain('check:buyer-evidence-gate-report');
    expect(buyerRemediationQueueEvidence?.evidenceBoundary).toMatch(/accepted buyer evidence, reviewer evidence, commercial signal/i);
    expect(buyerRemediationQueueEvidence?.evidenceBoundary).toMatch(/does not contact buyers/i);
    expect(buyerRemediationQueueEvidence?.evidenceBoundary).toMatch(/does not create accepted evidence, move confidence/i);
    expect(buyerRemediationQueueEvidence?.sourceManifestPath).toBe('buyer_evidence.hard_gate_deficits.remediation_queue');
    expect(buyerRemediationQueueEvidence?.sourceProofTypes).toEqual([
      'buyer_evidence_hard_gate',
    ]);
    expect(supabaseClearanceDeficitLedgerEvidence?.status).toBe('needs_remediation');
    expect(supabaseClearanceDeficitLedgerEvidence?.command).toContain('report:supabase-advisor-readiness');
    expect(supabaseClearanceDeficitLedgerEvidence?.command).toContain('check:supabase-advisor-report');
    expect(supabaseClearanceDeficitLedgerEvidence?.evidenceBoundary).toMatch(/CLI lint freshness, connector authorization/i);
    expect(supabaseClearanceDeficitLedgerEvidence?.evidenceBoundary).toMatch(/Security Advisor evidence, Performance Advisor evidence/i);
    expect(supabaseClearanceDeficitLedgerEvidence?.evidenceBoundary).toMatch(/public-safe findings/i);
    expect(supabaseClearanceDeficitLedgerEvidence?.evidenceBoundary).toMatch(/does not authorize connectors, access the dashboard/i);
    expect(supabaseClearanceDeficitLedgerEvidence?.evidenceBoundary).toMatch(/does not grant production approval/i);
    expect(supabaseOperatorHandoffPacketEvidence?.status).toBe('needs_remediation');
    expect(supabaseOperatorHandoffPacketEvidence?.command).toContain('report:supabase-advisor-readiness');
    expect(supabaseOperatorHandoffPacketEvidence?.command).toContain('check:supabase-advisor-report');
    expect(supabaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/advisor remediation rows/i);
    expect(supabaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/operator, account-admin, security-owner, and owner execution gates/i);
    expect(supabaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/repo_lint_freshness_first/i);
    expect(supabaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/authorized_connector_or_dashboard_access_first/i);
    expect(supabaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/security_advisor_after_authorization/i);
    expect(supabaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/performance_advisor_after_authorization/i);
    expect(supabaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/public_safe_record_after_advisor_review/i);
    expect(supabaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/clearance_claim_after_all_rows_pass/i);
    expect(supabaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/external-account flags/i);
    expect(supabaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/secret-safe flags/i);
    expect(supabaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/can_execute_from_packet=false/i);
    expect(supabaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/does not authorize connectors/i);
    expect(supabaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/record secrets/i);
    expect(supabaseOperatorHandoffPacketEvidence?.evidenceBoundary).toMatch(/hosted\/live parity/i);
    expect(supabaseRemediationQueueEvidence?.status).toBe('needs_remediation');
    expect(supabaseRemediationQueueEvidence?.command).toContain('report:supabase-advisor-readiness');
    expect(supabaseRemediationQueueEvidence?.command).toContain('check:supabase-advisor-report');
    expect(supabaseRemediationQueueEvidence?.evidenceBoundary).toMatch(/CLI lint freshness, connector authorization/i);
    expect(supabaseRemediationQueueEvidence?.evidenceBoundary).toMatch(/does not authorize connectors, access the dashboard/i);
    expect(supabaseRemediationQueueEvidence?.evidenceBoundary).toMatch(/record secrets/i);
    expect(supabaseRemediationQueueEvidence?.evidenceBoundary).toMatch(/does not create or claim advisor clearance/i);
    expect(buyerEvidence?.status).toBe('external_gate');
    expect(buyerEvidence?.evidenceBoundary).toMatch(/no production buyer-evidence register/i);
    expect(supabaseAdvisorEvidence?.status).toBe('needs_remediation');
    expect(supabaseAdvisorEvidence?.evidenceBoundary).toMatch(/permission denied/i);
    expect(RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Supabase CLI app lint')?.evidenceBoundary).toMatch(/credential\/connectivity-gated/i);
  });

  it('defines a public-safe Supabase advisor status card that separates CLI lint from advisor clearance', () => {
    const cliLint = SUPABASE_ADVISOR_STATUS_CARD.checks.find((check) => check.id === 'cli_app_lint');
    const advisors = SUPABASE_ADVISOR_STATUS_CARD.checks.find((check) => check.id === 'security_performance_advisors');

    expect(SUPABASE_ADVISOR_STATUS_CARD.status).toBe('needs_remediation');
    expect(SUPABASE_ADVISOR_STATUS_CARD.projectRef).toBe('qnymbecjgeaoxsfphrti');
    expect(SUPABASE_ADVISOR_STATUS_CARD.decisionBoundary).toMatch(/separates Supabase CLI database lint/i);
    expect(SUPABASE_ADVISOR_STATUS_CARD.decisionBoundary).toMatch(/does not claim advisor clearance/i);
    expect(SUPABASE_ADVISOR_STATUS_CARD.docsReference.url).toContain('database-advisors');
    expect(SUPABASE_ADVISOR_STATUS_CARD.checks).toHaveLength(2);
    expect(cliLint?.status).toBe('watch');
    expect(cliLint?.evidenceBoundary).toMatch(/does not substitute/i);
    expect(advisors?.status).toBe('needs_remediation');
    expect(advisors?.evidenceBoundary).toMatch(/authorization is fixed/i);
    expect(advisors?.nextAction).toMatch(/rerun security and performance advisors/i);
  });

  it('surfaces the deployment approval checklist without treating deployment as buyer proof', () => {
    const commands = DEPLOYMENT_APPROVAL_CHECKLIST.map((item) => item.command).join('\n');
    const boundaries = DEPLOYMENT_APPROVAL_CHECKLIST.map((item) => item.evidenceBoundary).join('\n');

    expect(DEPLOYMENT_APPROVAL_CHECKLIST).toHaveLength(4);
    expect(commands).toContain('check:production-deploy-request');
    expect(commands).toContain('DEPLOY CEIP PRODUCTION');
    expect(commands).toContain('check:post-deploy-live');
    expect(commands).toContain('report:buyer-evidence-gate-readiness');
    expect(commands).toContain('check:buyer-evidence-gate-report');
    expect(boundaries).toMatch(/not production approval|manual production stop/i);
    expect(boundaries).toMatch(/launch evidence validation/i);
    expect(boundaries).toMatch(/Deployment never raises market confidence/i);
    expect(boundaries).toMatch(/validate:pilot-evidence --require-95/i);
  });

  it('defines a public-safe release status manifest for the status page', () => {
    const itemIds = PUBLIC_RELEASE_STATUS_MANIFEST.items.map((item) => item.id);
    const currentSourceParityGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'current_source_live_parity');
    const sourceGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'current_source_release_gate');
    const provenanceGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'source_provenance');
    const launchEvidenceValidationGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'launch_evidence_validation_gate');
    const objectiveCompletionAuditGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'objective_completion_audit');
    const adversarialReviewLedgerGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'adversarial_review_ledger');
    const fixReportBlockerMapGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'fix_report_blocker_map');
    const progressUpdateDigestGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'progress_update_digest');
    const bottleneckLogDigestGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'bottleneck_log_digest');
    const sourceIsolationLedgerGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'source_provenance_isolation_ledger');
    const sourceResolutionQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'source_provenance_resolution_queue');
    const sourceOwnerDecisionPacketGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'source_owner_decision_packet');
    const releaseToolchainApprovalDeficitLedgerGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'release_toolchain_approval_deficit_ledger');
    const releasePreflightQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'release_preflight_remediation_queue');
    const releaseOperatorHandoffPacketGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'release_operator_handoff_packet');
    const releasePreflightClearanceMatrixGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'release_preflight_clearance_matrix');
    const releaseToolchainProbeGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'release_toolchain_probe_ledger');
    const launchQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'launch_blocker_action_queue');
    const launchActionOperatorHandoffPacketGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'launch_action_operator_handoff_packet');
    const productionApprovalQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'production_approval_prerequisite_queue');
    const productionApprovalRequestPacketGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'production_approval_request_packet');
    const productionApprovalOperatorHandoffPacketGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'production_approval_operator_handoff_packet');
    const postDeployQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'post_deploy_live_proof_gate_queue');
    const postDeployOperatorHandoffPacketGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'post_deploy_live_proof_operator_handoff_packet');
    const localProofPackSmokeGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'local_proof_pack_browser_smoke');
    const branchReviewGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'unmerged_branch_review_queue');
    const branchFamilyFreshnessRollupGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'branch_family_freshness_rollup');
    const topBranchReviewPacketGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'top_branch_review_packet');
    const branchClearanceMatrixGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'branch_clearance_matrix');
    const branchOperatorHandoffPacketGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'branch_operator_handoff_packet');
    const canonicalHeadQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'canonical_head_decision_queue');
    const canonicalHeadResolutionQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'canonical_head_resolution_queue');
    const reviewFirstPacketQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'review_first_branch_packet_queue');
    const buyerGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'buyer_evidence_gate');
    const buyerHardGateDeficitLedgerGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'buyer_evidence_hard_gate_deficit_ledger');
    const buyerAcquisitionMatrixGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'buyer_evidence_acquisition_matrix');
    const buyerMinimumPacketHandoffGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'buyer_evidence_minimum_packet_handoff');
    const buyerRemediationQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'buyer_evidence_remediation_queue');
    const advisorGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'supabase_advisor_access');
    const supabaseClearanceDeficitLedgerGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'supabase_advisor_clearance_deficit_ledger');
    const supabaseOperatorHandoffPacketGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'supabase_advisor_operator_handoff_packet');
    const supabaseRemediationQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'supabase_advisor_remediation_queue');

    expect(PUBLIC_RELEASE_STATUS_MANIFEST.schemaVersion).toBe('ceip.public-release-status.v1');
    expect(PUBLIC_RELEASE_STATUS_MANIFEST.publicPath).toBe('/status/release-health.json');
    expect(PUBLIC_RELEASE_STATUS_MANIFEST.decision).toBe('blocked');
    expect(PUBLIC_RELEASE_STATUS_MANIFEST.decisionBoundary).toMatch(/does not create buyer evidence/i);
    expect(PUBLIC_RELEASE_STATUS_MANIFEST.refreshCommands).toEqual([
      'git status --porcelain=v1 --branch',
      'pnpm run check:release-readiness',
      'pnpm run check:launch-evidence-manifest',
      'pnpm run check:production-deploy-request',
      'pnpm run check:post-deploy-live',
      'pnpm run report:commercial-launch-readiness',
      'pnpm run report:buyer-evidence-readiness',
      'pnpm run report:buyer-evidence-gate-readiness',
    ]);
    expect(itemIds).toEqual([
      'deployed_artifact_live_parity',
      'current_source_live_parity',
      'current_source_release_gate',
      'source_provenance',
      'source_provenance_isolation_ledger',
      'launch_evidence_validation_gate',
      'objective_completion_audit',
      'adversarial_review_ledger',
      'fix_report_blocker_map',
      'progress_update_digest',
      'bottleneck_log_digest',
      'source_provenance_resolution_queue',
      'source_owner_decision_packet',
      'release_toolchain_approval_deficit_ledger',
      'release_preflight_remediation_queue',
      'release_operator_handoff_packet',
      'release_preflight_clearance_matrix',
      'release_toolchain_probe_ledger',
      'launch_blocker_action_queue',
      'launch_action_operator_handoff_packet',
      'production_approval_prerequisite_queue',
      'production_approval_request_packet',
      'production_approval_operator_handoff_packet',
      'post_deploy_live_proof_gate_queue',
      'post_deploy_live_proof_operator_handoff_packet',
      'local_proof_pack_browser_smoke',
      'unmerged_branch_review_queue',
      'branch_family_freshness_rollup',
      'top_branch_review_packet',
      'branch_clearance_matrix',
      'branch_operator_handoff_packet',
      'canonical_head_decision_queue',
      'canonical_head_resolution_queue',
      'review_first_branch_packet_queue',
      'buyer_evidence_gate',
      'buyer_evidence_hard_gate_deficit_ledger',
      'buyer_evidence_acquisition_matrix',
      'buyer_evidence_minimum_packet_handoff',
      'buyer_evidence_remediation_queue',
      'supabase_advisor_access',
      'supabase_advisor_clearance_deficit_ledger',
      'supabase_advisor_operator_handoff_packet',
      'supabase_advisor_remediation_queue',
    ]);
    expect(currentSourceParityGate?.status).toBe('external_gate');
    expect(currentSourceParityGate?.command).toContain('report:production-approval-packet');
    expect(currentSourceParityGate?.evidenceBoundary).toMatch(/does not prove production parity/i);
    expect(currentSourceParityGate?.evidenceBoundary).toMatch(/launch evidence validation/i);
    expect(currentSourceParityGate?.nextAction).toMatch(/post-deploy live checks/i);
    expect(sourceGate?.status).toBe('watch');
    expect(sourceGate?.evidenceBoundary).toMatch(/does not prove production deploy parity/i);
    expect(provenanceGate?.command).toContain('report:source-provenance-readiness');
    expect(provenanceGate?.command).toContain('check:source-provenance-report');
    expect(provenanceGate?.evidenceBoundary).toMatch(/staged-only, unstaged-only, mixed/i);
    expect(provenanceGate?.evidenceBoundary).toMatch(/does not prove current local cleanliness/i);
    expect(provenanceGate?.sourceManifestPath).toBe('source_provenance');
    expect(provenanceGate?.sourceProofTypes).toEqual([
      'source_rename_decision',
    ]);
    expect(sourceIsolationLedgerGate?.status).toBe('external_gate');
    expect(sourceIsolationLedgerGate?.command).toContain('report:source-provenance-readiness');
    expect(sourceIsolationLedgerGate?.command).toContain('check:source-provenance-report');
    expect(sourceIsolationLedgerGate?.evidenceBoundary).toMatch(/tracked, untracked, ignored, staged-only/i);
    expect(sourceIsolationLedgerGate?.evidenceBoundary).toMatch(/does not commit, unstage, stash, revert/i);
    expect(sourceIsolationLedgerGate?.nextAction).toMatch(/explicit owner intent/i);
    expect(sourceIsolationLedgerGate?.sourceManifestPath).toBe('source_provenance.isolation_ledger');
    expect(sourceIsolationLedgerGate?.sourceProofTypes).toEqual([
      'source_provenance_isolation_ledger',
      'source_rename_decision',
    ]);
    expect(sourceResolutionQueueGate?.status).toBe('external_gate');
    expect(sourceResolutionQueueGate?.command).toContain('report:source-provenance-readiness');
    expect(sourceResolutionQueueGate?.command).toContain('check:source-provenance-report');
    expect(sourceResolutionQueueGate?.evidenceBoundary).toMatch(/staged-only, unstaged-only, mixed/i);
    expect(sourceResolutionQueueGate?.evidenceBoundary).toMatch(/does not commit, unstage, stash, revert/i);
    expect(sourceResolutionQueueGate?.evidenceBoundary).toMatch(/does not prove current local cleanliness/i);
    expect(sourceResolutionQueueGate?.sourceManifestPath).toBe('source_provenance.resolution_queue');
    expect(sourceResolutionQueueGate?.sourceProofTypes).toEqual([
      'source_rename_decision',
    ]);
    expect(sourceOwnerDecisionPacketGate?.status).toBe('external_gate');
    expect(sourceOwnerDecisionPacketGate?.proofBucket).toBe('local/source');
    expect(sourceOwnerDecisionPacketGate?.command).toContain('report:source-provenance-readiness');
    expect(sourceOwnerDecisionPacketGate?.command).toContain('check:source-provenance-report');
    expect(sourceOwnerDecisionPacketGate?.evidenceBoundary).toMatch(/source owner decision packet/i);
    expect(sourceOwnerDecisionPacketGate?.evidenceBoundary).toMatch(/source_provenance\.resolution_queue\.items/i);
    expect(sourceOwnerDecisionPacketGate?.evidenceBoundary).toMatch(/recommended owner options/i);
    expect(sourceOwnerDecisionPacketGate?.evidenceBoundary).toMatch(/commit_as_intentional_change/i);
    expect(sourceOwnerDecisionPacketGate?.evidenceBoundary).toMatch(/unstage_for_later_review/i);
    expect(sourceOwnerDecisionPacketGate?.evidenceBoundary).toMatch(/stash_or_revert_with_owner_approval/i);
    expect(sourceOwnerDecisionPacketGate?.evidenceBoundary).toMatch(/does not commit, unstage, stash, revert/i);
    expect(sourceOwnerDecisionPacketGate?.evidenceBoundary).toMatch(/choose owner intent/i);
    expect(sourceOwnerDecisionPacketGate?.evidenceBoundary).toMatch(/does not prove current local cleanliness/i);
    expect(sourceOwnerDecisionPacketGate?.evidenceBoundary).toMatch(/production approval/i);
    expect(sourceOwnerDecisionPacketGate?.sourceManifestPath).toBe('source_provenance.owner_decision_packet');
    expect(sourceOwnerDecisionPacketGate?.sourceProofTypes).toEqual([
      'source_owner_decision_packet',
      'source_rename_decision',
    ]);
    expect(sourceOwnerDecisionPacketGate?.nextAction).toMatch(/decision support only/i);
    expect(sourceOwnerDecisionPacketGate?.nextAction).toMatch(/explicit owner intent/i);
    expect(launchEvidenceValidationGate?.status).toBe('external_gate');
    expect(launchEvidenceValidationGate?.proofBucket).toBe('repo artifact');
    expect(launchEvidenceValidationGate?.command).toContain('report:launch-evidence-validation-readiness');
    expect(launchEvidenceValidationGate?.command).toContain('check:launch-evidence-validation-report');
    expect(launchEvidenceValidationGate?.evidenceBoundary).toMatch(/manifest structure and proof-boundary consistency/i);
    expect(launchEvidenceValidationGate?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(launchEvidenceValidationGate?.nextAction).toMatch(/before any deploy request/i);
    expect(launchEvidenceValidationGate?.sourceManifestPath).toBe('launch_action_queue.items[phase=launch_evidence_validation]');
    expect(launchEvidenceValidationGate?.sourceProofTypes).toEqual([
      'manifest_validation_and_approval_packet',
      'manifest_validation',
      'schema_validation',
    ]);
    expect(objectiveCompletionAuditGate?.status).toBe('external_gate');
    expect(objectiveCompletionAuditGate?.proofBucket).toBe('repo artifact');
    expect(objectiveCompletionAuditGate?.command).toContain('report:objective-completion-audit-readiness');
    expect(objectiveCompletionAuditGate?.command).toContain('check:objective-completion-audit-report');
    expect(objectiveCompletionAuditGate?.evidenceBoundary).toMatch(/required launch deliverables/i);
    expect(objectiveCompletionAuditGate?.evidenceBoundary).toMatch(/blocked P0\/P1 gates/i);
    expect(objectiveCompletionAuditGate?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(objectiveCompletionAuditGate?.evidenceBoundary).toMatch(/commercial launch readiness/i);
    expect(objectiveCompletionAuditGate?.evidenceBoundary).toMatch(/source readiness/i);
    expect(objectiveCompletionAuditGate?.nextAction).toMatch(/goal-completion blockers visible/i);
    expect(objectiveCompletionAuditGate?.nextAction).toMatch(/post-deploy live proof gates/i);
    expect(objectiveCompletionAuditGate?.sourceManifestPath).toBe('completion_audit');
    expect(objectiveCompletionAuditGate?.sourceProofType).toBe('completion_audit_current_state');
    expect(adversarialReviewLedgerGate?.status).toBe('external_gate');
    expect(adversarialReviewLedgerGate?.proofBucket).toBe('repo artifact');
    expect(adversarialReviewLedgerGate?.command).toContain('report:adversarial-review-readiness');
    expect(adversarialReviewLedgerGate?.command).toContain('check:adversarial-review-report');
    expect(adversarialReviewLedgerGate?.evidenceBoundary).toMatch(/buyer evidence, production approval, release toolchain/i);
    expect(adversarialReviewLedgerGate?.evidenceBoundary).toMatch(/Supabase advisor clearance/i);
    expect(adversarialReviewLedgerGate?.evidenceBoundary).toMatch(/branch-risk challenge lanes/i);
    expect(adversarialReviewLedgerGate?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(adversarialReviewLedgerGate?.evidenceBoundary).toMatch(/commercial launch readiness/i);
    expect(adversarialReviewLedgerGate?.nextAction).toMatch(/claim-refutation lanes visible/i);
    expect(adversarialReviewLedgerGate?.nextAction).toMatch(/post-deploy proof gate/i);
    expect(adversarialReviewLedgerGate?.sourceManifestPath).toBe('adversarial_reviews');
    expect(adversarialReviewLedgerGate?.sourceProofTypes).toEqual([
      'buyer_evidence_adversarial_review',
      'production_approval_adversarial_review',
      'release_toolchain_adversarial_review',
      'external_advisor_adversarial_review',
      'branch_risk_adversarial_review',
    ]);
    expect(fixReportBlockerMapGate?.status).toBe('external_gate');
    expect(fixReportBlockerMapGate?.proofBucket).toBe('repo artifact');
    expect(fixReportBlockerMapGate?.command).toContain('report:commercial-launch-readiness');
    expect(fixReportBlockerMapGate?.command).toContain('check:commercial-launch-readiness-report');
    expect(fixReportBlockerMapGate?.command).toContain('report:launch-evidence-manifest');
    expect(fixReportBlockerMapGate?.command).toContain('check:launch-evidence-manifest');
    expect(fixReportBlockerMapGate?.evidenceBoundary).toMatch(/files changed, tests run, required checks/i);
    expect(fixReportBlockerMapGate?.evidenceBoundary).toMatch(/unresolved blockers, and approval gates/i);
    expect(fixReportBlockerMapGate?.evidenceBoundary).toMatch(/does not modify files/i);
    expect(fixReportBlockerMapGate?.evidenceBoundary).toMatch(/run missing checks/i);
    expect(fixReportBlockerMapGate?.evidenceBoundary).toMatch(/Supabase advisor clearance/i);
    expect(fixReportBlockerMapGate?.evidenceBoundary).toMatch(/commercial launch readiness/i);
    expect(fixReportBlockerMapGate?.nextAction).toMatch(/prioritize remaining blockers/i);
    expect(fixReportBlockerMapGate?.nextAction).toMatch(/owner-side gate/i);
    expect(fixReportBlockerMapGate?.sourceManifestPath).toBe('fix_report');
    expect(fixReportBlockerMapGate?.sourceProofType).toBe('fix_report_blocker_map');
    expect(progressUpdateDigestGate?.status).toBe('external_gate');
    expect(progressUpdateDigestGate?.proofBucket).toBe('repo artifact');
    expect(progressUpdateDigestGate?.command).toContain('report:progress-digest-readiness');
    expect(progressUpdateDigestGate?.command).toContain('check:progress-digest-report');
    expect(progressUpdateDigestGate?.evidenceBoundary).toMatch(/accomplished work, target matrix, pending work/i);
    expect(progressUpdateDigestGate?.evidenceBoundary).toMatch(/current bottleneck, and phase progress/i);
    expect(progressUpdateDigestGate?.evidenceBoundary).toMatch(/does not complete pending work/i);
    expect(progressUpdateDigestGate?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(progressUpdateDigestGate?.nextAction).toMatch(/phase progress visible/i);
    expect(progressUpdateDigestGate?.nextAction).toMatch(/post-deploy proof gates/i);
    expect(progressUpdateDigestGate?.sourceManifestPath).toBe('progress_updates');
    expect(bottleneckLogDigestGate?.status).toBe('external_gate');
    expect(bottleneckLogDigestGate?.proofBucket).toBe('repo artifact');
    expect(bottleneckLogDigestGate?.command).toContain('report:progress-digest-readiness');
    expect(bottleneckLogDigestGate?.command).toContain('check:progress-digest-report');
    expect(bottleneckLogDigestGate?.evidenceBoundary).toMatch(/blocked task or subtask, elapsed time, last update/i);
    expect(bottleneckLogDigestGate?.evidenceBoundary).toMatch(/root cause, and top unblock options/i);
    expect(bottleneckLogDigestGate?.evidenceBoundary).toMatch(/does not resolve evidence gaps/i);
    expect(bottleneckLogDigestGate?.evidenceBoundary).toMatch(/authorize Supabase advisors/i);
    expect(bottleneckLogDigestGate?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(bottleneckLogDigestGate?.nextAction).toMatch(/next safe unblock path/i);
    expect(bottleneckLogDigestGate?.nextAction).toMatch(/specific required proof commands/i);
    expect(bottleneckLogDigestGate?.sourceManifestPath).toBe('bottleneck_log');
    expect(sourceResolutionQueueGate?.status).toBe('external_gate');
    expect(sourceResolutionQueueGate?.command).toContain('report:source-provenance-readiness');
    expect(sourceResolutionQueueGate?.command).toContain('check:source-provenance-report');
    expect(sourceResolutionQueueGate?.evidenceBoundary).toMatch(/renamed source decisions/i);
    expect(sourceResolutionQueueGate?.evidenceBoundary).toMatch(/does not commit, unstage, stash, revert/i);
    expect(sourceResolutionQueueGate?.nextAction).toMatch(/explicit owner intent/i);
    expect(releaseToolchainApprovalDeficitLedgerGate?.status).toBe('external_gate');
    expect(releaseToolchainApprovalDeficitLedgerGate?.command).toContain('report:release-preflight');
    expect(releaseToolchainApprovalDeficitLedgerGate?.command).toContain('check:release-preflight-report');
    expect(releaseToolchainApprovalDeficitLedgerGate?.evidenceBoundary).toMatch(/package-manager pin, Corepack pnpm resolver, release-readiness execution/i);
    expect(releaseToolchainApprovalDeficitLedgerGate?.evidenceBoundary).toMatch(/Git LFS push-path proof/i);
    expect(releaseToolchainApprovalDeficitLedgerGate?.evidenceBoundary).toMatch(/does not install tools/i);
    expect(releaseToolchainApprovalDeficitLedgerGate?.evidenceBoundary).toMatch(/hosted\/live parity/i);
    expect(releaseToolchainApprovalDeficitLedgerGate?.nextAction).toMatch(/release-blocking deficits visible/i);
    expect(releasePreflightQueueGate?.status).toBe('external_gate');
    expect(releasePreflightQueueGate?.command).toContain('report:release-preflight');
    expect(releasePreflightQueueGate?.command).toContain('check:release-preflight-report');
    expect(releasePreflightQueueGate?.evidenceBoundary).toMatch(/Corepack pnpm resolver/i);
    expect(releasePreflightQueueGate?.evidenceBoundary).toMatch(/does not install tools/i);
    expect(releasePreflightQueueGate?.nextAction).toMatch(/guarded release-readiness path/i);
    expect(releaseOperatorHandoffPacketGate?.status).toBe('external_gate');
    expect(releaseOperatorHandoffPacketGate?.command).toContain('report:release-preflight');
    expect(releaseOperatorHandoffPacketGate?.command).toContain('check:release-preflight-report');
    expect(releaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/release remediation rows/i);
    expect(releaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/operator or owner execution gates/i);
    expect(releaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/toolchain_probe_first/i);
    expect(releaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/after_corepack_git_lfs_and_clean_source/i);
    expect(releaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/owner_source_decision_first/i);
    expect(releaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/manual_stop_after_all_prerequisites/i);
    expect(releaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/can_execute_from_packet=false/i);
    expect(releaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/does not install Corepack/i);
    expect(releaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/request production approval/i);
    expect(releaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/create launch readiness/i);
    expect(releaseOperatorHandoffPacketGate?.nextAction).toMatch(/release-operator handoff/i);
    expect(releaseOperatorHandoffPacketGate?.nextAction).toMatch(/each proof command separately/i);
    expect(releasePreflightClearanceMatrixGate?.status).toBe('external_gate');
    expect(releasePreflightClearanceMatrixGate?.command).toContain('report:release-preflight');
    expect(releasePreflightClearanceMatrixGate?.command).toContain('check:release-preflight-report');
    expect(releasePreflightClearanceMatrixGate?.evidenceBoundary).toMatch(/package-manager pin, Corepack pnpm resolver, release-readiness execution/i);
    expect(releasePreflightClearanceMatrixGate?.evidenceBoundary).toMatch(/Git LFS push-path proof/i);
    expect(releasePreflightClearanceMatrixGate?.evidenceBoundary).toMatch(/does not install tools/i);
    expect(releasePreflightClearanceMatrixGate?.evidenceBoundary).toMatch(/grant owner approval/i);
    expect(releasePreflightClearanceMatrixGate?.nextAction).toMatch(/release-blocking rows visible/i);
    expect(releaseToolchainProbeGate?.status).toBe('external_gate');
    expect(releaseToolchainProbeGate?.command).toContain('report:release-preflight');
    expect(releaseToolchainProbeGate?.command).toContain('check:release-preflight-report');
    expect(releaseToolchainProbeGate?.evidenceBoundary).toMatch(/Corepack pnpm resolver and Git LFS availability/i);
    expect(releaseToolchainProbeGate?.evidenceBoundary).toMatch(/does not install tools, run release-readiness, push, deploy/i);
    expect(releaseToolchainProbeGate?.evidenceBoundary).toMatch(/does not substitute for release-readiness or production approval/i);
    expect(releaseToolchainProbeGate?.nextAction).toMatch(/without --skip-probes/i);
    expect(launchQueueGate?.status).toBe('external_gate');
    expect(launchQueueGate?.command).toContain('report:launch-action-readiness');
    expect(launchQueueGate?.command).toContain('check:launch-action-report');
    expect(launchQueueGate?.evidenceBoundary).toMatch(/sequences source provenance, launch evidence validation, release toolchain, branch review/i);
    expect(launchQueueGate?.evidenceBoundary).toMatch(/does not deploy, merge, contact buyers/i);
    expect(launchQueueGate?.evidenceBoundary).toMatch(/prove launch evidence validation/i);
    expect(launchQueueGate?.nextAction).toMatch(/Work the queue in order/i);
    expect(launchActionOperatorHandoffPacketGate?.status).toBe('external_gate');
    expect(launchActionOperatorHandoffPacketGate?.command).toContain('report:launch-action-readiness');
    expect(launchActionOperatorHandoffPacketGate?.command).toContain('check:launch-action-report');
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/source provenance, launch evidence validation, release toolchain, branch review/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/Supabase advisor, buyer evidence, production approval, and post-deploy live proof/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/resolve_source_provenance_first/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/attach_launch_validation_evidence/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/release_toolchain_after_clean_source/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/read_only_branch_review_before_approval/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/supabase_advisor_after_authorization/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/buyer_evidence_before_approval/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/owner_approval_after_all_prelaunch_gates/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/post_deploy_proof_after_approved_deploy/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/blocks_launch_clearance/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/can_execute_from_packet=false/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/does not execute queue rows/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/commit, unstage, stash, revert/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/clear source provenance/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/run release-readiness/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/checkout branches/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/contact buyers/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/access Supabase/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/request owner approval/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/run browser smoke/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/hosted\/live parity/i);
    expect(launchActionOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/raise launch status/i);
    expect(launchActionOperatorHandoffPacketGate?.nextAction).toMatch(/launch-operator handoff/i);
    expect(launchActionOperatorHandoffPacketGate?.nextAction).toMatch(/run each proof command separately/i);
    expect(productionApprovalQueueGate?.status).toBe('external_gate');
    expect(productionApprovalQueueGate?.command).toContain('report:production-approval-readiness');
    expect(productionApprovalQueueGate?.command).toContain('check:production-approval-report');
    expect(productionApprovalQueueGate?.evidenceBoundary).toMatch(/launch evidence validation, Corepack release-readiness/i);
    expect(productionApprovalQueueGate?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(productionApprovalQueueGate?.evidenceBoundary).toMatch(/prove launch evidence validation/i);
    expect(productionApprovalQueueGate?.nextAction).toMatch(/keep launch evidence validation passing/i);
    expect(productionApprovalRequestPacketGate?.status).toBe('external_gate');
    expect(productionApprovalRequestPacketGate?.command).toContain('report:production-approval-readiness');
    expect(productionApprovalRequestPacketGate?.command).toContain('check:production-approval-report');
    expect(productionApprovalRequestPacketGate?.command).toContain('check:production-deploy-request');
    expect(productionApprovalRequestPacketGate?.evidenceBoundary).toMatch(/pre-request, owner-decision, and post-deploy-boundary/i);
    expect(productionApprovalRequestPacketGate?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(productionApprovalRequestPacketGate?.nextAction).toMatch(/pre-request row is blocked/i);
    expect(productionApprovalOperatorHandoffPacketGate?.status).toBe('external_gate');
    expect(productionApprovalOperatorHandoffPacketGate?.command).toContain('report:production-approval-readiness');
    expect(productionApprovalOperatorHandoffPacketGate?.command).toContain('check:production-approval-report');
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/production approval request packet rows/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/clean_source_provenance_first/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/attach_manifest_validation_evidence/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/release_readiness_after_clean_source/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/branch_review_before_owner_request/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/supabase_advisor_after_authorization/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/buyer_evidence_validation_before_approval/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/owner_approval_after_pre_request_gates/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/post_deploy_proof_after_approved_deploy/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/pre_request/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/owner_decision/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/post_deploy_boundary/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/blocks_approval_request/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/owner_decision_required/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/can_execute_from_packet=false/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/does not request owner approval/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/grant approval/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/run deploys/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/push, merge, mutate branches/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/contact buyers/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/access Supabase/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/clear source provenance/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/run release-readiness/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/hosted\/live parity/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/commercial launch readiness status/i);
    expect(productionApprovalOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/deploy authorization/i);
    expect(productionApprovalOperatorHandoffPacketGate?.nextAction).toMatch(/approval-operator handoff/i);
    expect(productionApprovalOperatorHandoffPacketGate?.nextAction).toMatch(/proof command separately/i);
    expect(postDeployQueueGate?.status).toBe('external_gate');
    expect(postDeployQueueGate?.proofBucket).toBe('hosted/live');
    expect(postDeployQueueGate?.command).toContain('report:post-deploy-live-proof-readiness');
    expect(postDeployQueueGate?.command).toContain('check:post-deploy-live-proof-report');
    expect(postDeployQueueGate?.evidenceBoundary).toMatch(/hosted proof-pack route smoke/i);
    expect(postDeployQueueGate?.evidenceBoundary).toMatch(/does not prove current hosted\/live parity/i);
    expect(postDeployQueueGate?.nextAction).toMatch(/check:post-deploy-live passes/i);
    expect(postDeployOperatorHandoffPacketGate?.status).toBe('external_gate');
    expect(postDeployOperatorHandoffPacketGate?.proofBucket).toBe('hosted/live');
    expect(postDeployOperatorHandoffPacketGate?.command).toContain('report:post-deploy-live-proof-readiness');
    expect(postDeployOperatorHandoffPacketGate?.command).toContain('check:post-deploy-live-proof-report');
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/post-deploy live proof gate queue rows/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/operator execution gates/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/production_approval_clearance_first/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/approved_deploy_after_owner_phrase/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/live_metadata_after_approved_deploy/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/static_parity_after_metadata_and_build/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/hosted_smoke_after_deploy/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/parity_claim_after_all_live_gates_pass/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/approval_required/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/deploy_required/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/live_account_required/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/browser_smoke_required/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/blocks_live_proof_gate/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/can_execute_from_packet=false/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/does not grant owner approval/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/run deploys/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/run deploy-production\.sh/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/netlify deploy/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/run browser smoke/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/current hosted\/live parity/i);
    expect(postDeployOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/prove production approval/i);
    expect(postDeployOperatorHandoffPacketGate?.nextAction).toMatch(/post-deploy operator handoff/i);
    expect(postDeployOperatorHandoffPacketGate?.nextAction).toMatch(/run each live proof command separately/i);
    expect(postDeployOperatorHandoffPacketGate?.nextAction).toMatch(/check:post-deploy-live/i);
    expect(localProofPackSmokeGate?.status).toBe('external_gate');
    expect(localProofPackSmokeGate?.proofBucket).toBe('local/browser');
    expect(localProofPackSmokeGate?.command).toContain('test:browser:local:proof-packs');
    expect(localProofPackSmokeGate?.evidenceBoundary).toMatch(/local proof-pack browser smoke/i);
    expect(localProofPackSmokeGate?.evidenceBoundary).toMatch(/local preview/i);
    expect(localProofPackSmokeGate?.evidenceBoundary).toMatch(/does not.*satisfy Corepack-pinned release-readiness/i);
    expect(localProofPackSmokeGate?.evidenceBoundary).toMatch(/hosted proof-pack smoke/i);
    expect(localProofPackSmokeGate?.evidenceBoundary).toMatch(/post-deploy live parity/i);
    expect(localProofPackSmokeGate?.nextAction).toMatch(/check:post-deploy-live/i);
    expect(branchReviewGate?.status).toBe('external_gate');
    expect(branchReviewGate?.command).toContain('report:branch-review-readiness');
    expect(branchReviewGate?.command).toContain('check:branch-review-report');
    expect(branchReviewGate?.evidenceBoundary).toMatch(/does not create launch evidence/i);
    expect(branchReviewGate?.evidenceBoundary).toMatch(/review-first packet summaries/i);
    expect(branchFamilyFreshnessRollupGate?.status).toBe('external_gate');
    expect(branchFamilyFreshnessRollupGate?.command).toContain('report:branch-review-readiness');
    expect(branchFamilyFreshnessRollupGate?.command).toContain('check:branch-review-report');
    expect(branchFamilyFreshnessRollupGate?.evidenceBoundary).toMatch(/local-only, origin-only, matching, local-ahead/i);
    expect(branchFamilyFreshnessRollupGate?.evidenceBoundary).toMatch(/stale, aging, fresh, high-risk/i);
    expect(branchFamilyFreshnessRollupGate?.evidenceBoundary).toMatch(/review-first branch-family counts/i);
    expect(branchFamilyFreshnessRollupGate?.evidenceBoundary).toMatch(/does not checkout, merge, push, discard/i);
    expect(branchFamilyFreshnessRollupGate?.evidenceBoundary).toMatch(/prove current source readiness/i);
    expect(branchFamilyFreshnessRollupGate?.nextAction).toMatch(/stale or aging high-risk branch families/i);
    expect(branchFamilyFreshnessRollupGate?.nextAction).toMatch(/explicit canonical-head owner decisions/i);
    expect(topBranchReviewPacketGate?.status).toBe('external_gate');
    expect(topBranchReviewPacketGate?.command).toContain('report:branch-review-readiness');
    expect(topBranchReviewPacketGate?.command).toContain('check:branch-review-report');
    expect(topBranchReviewPacketGate?.evidenceBoundary).toMatch(/highest-priority focused read-only branch packet/i);
    expect(topBranchReviewPacketGate?.evidenceBoundary).toMatch(/changed Supabase function rows/i);
    expect(topBranchReviewPacketGate?.evidenceBoundary).toMatch(/canonical-head comparison/i);
    expect(topBranchReviewPacketGate?.sourceManifestPath).toBe('branch_review.top_review_packet');
    expect(topBranchReviewPacketGate?.sourceProofTypes).toEqual([
      'skipped_read_only_branch_packet_probe',
      'empty_read_only_branch_packet_probe',
      'high_risk_read_only_branch_packet',
      'review_first_read_only_branch_packet',
      'focused_read_only_branch_packet',
    ]);
    expect(topBranchReviewPacketGate?.evidenceBoundary).toMatch(/does not checkout, merge, push, discard/i);
    expect(topBranchReviewPacketGate?.evidenceBoundary).toMatch(/clear branch review/i);
    expect(topBranchReviewPacketGate?.nextAction).toMatch(/current top review ref/i);
    expect(topBranchReviewPacketGate?.nextAction).toMatch(/explicit owner approval and release gates/i);
    expect(branchClearanceMatrixGate?.status).toBe('external_gate');
    expect(branchClearanceMatrixGate?.command).toContain('report:branch-review-readiness');
    expect(branchClearanceMatrixGate?.command).toContain('check:branch-review-report');
    expect(branchClearanceMatrixGate?.evidenceBoundary).toMatch(/read-only branch review rows/i);
    expect(branchClearanceMatrixGate?.evidenceBoundary).toMatch(/canonical-head decisions/i);
    expect(branchClearanceMatrixGate?.sourceManifestPath).toBe('branch_review.clearance_matrix');
    expect(branchClearanceMatrixGate?.sourceProofType).toBe('read_only_branch_clearance_matrix');
    expect(branchClearanceMatrixGate?.evidenceBoundary).toMatch(/does not checkout, merge, push, discard/i);
    expect(branchClearanceMatrixGate?.nextAction).toMatch(/release gates before any merge/i);
    expect(branchOperatorHandoffPacketGate?.status).toBe('external_gate');
    expect(branchOperatorHandoffPacketGate?.command).toContain('report:branch-review-readiness');
    expect(branchOperatorHandoffPacketGate?.command).toContain('check:branch-review-report');
    expect(branchOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/operator or owner execution gates/i);
    expect(branchOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/read-only focused review first/i);
    expect(branchOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/owner canonical-head decision first/i);
    expect(branchOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/can_execute_from_packet=false/i);
    expect(branchOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/does not checkout, merge, push, discard, delete/i);
    expect(branchOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/mutate Supabase/i);
    expect(branchOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/request production approval/i);
    expect(branchOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/clear branch review/i);
    expect(branchOperatorHandoffPacketGate?.nextAction).toMatch(/per-family operator handoff/i);
    expect(branchOperatorHandoffPacketGate?.nextAction).toMatch(/explicit owner canonical-head decisions/i);
    expect(canonicalHeadQueueGate?.status).toBe('external_gate');
    expect(canonicalHeadQueueGate?.command).toContain('report:branch-review-readiness');
    expect(canonicalHeadQueueGate?.command).toContain('check:branch-review-report');
    expect(canonicalHeadQueueGate?.evidenceBoundary).toMatch(/branch-family decisions/i);
    expect(canonicalHeadQueueGate?.evidenceBoundary).toMatch(/does not checkout, merge, push, discard/i);
    expect(canonicalHeadQueueGate?.evidenceBoundary).toMatch(/prove production approval/i);
    expect(canonicalHeadQueueGate?.nextAction).toMatch(/choose canonical heads explicitly/i);
    expect(canonicalHeadResolutionQueueGate?.status).toBe('external_gate');
    expect(canonicalHeadResolutionQueueGate?.command).toContain('report:branch-review-readiness');
    expect(canonicalHeadResolutionQueueGate?.command).toContain('check:branch-review-report');
    expect(canonicalHeadResolutionQueueGate?.evidenceBoundary).toMatch(/owner-decision actions/i);
    expect(canonicalHeadResolutionQueueGate?.evidenceBoundary).toMatch(/does not checkout, merge, push, discard, delete/i);
    expect(canonicalHeadResolutionQueueGate?.evidenceBoundary).toMatch(/prove production approval/i);
    expect(canonicalHeadResolutionQueueGate?.nextAction).toMatch(/record explicit owner decisions/i);
    expect(reviewFirstPacketQueueGate?.status).toBe('external_gate');
    expect(reviewFirstPacketQueueGate?.command).toContain('report:branch-review-readiness');
    expect(reviewFirstPacketQueueGate?.command).toContain('check:branch-review-report');
    expect(reviewFirstPacketQueueGate?.evidenceBoundary).toMatch(/focused read-only branch packets/i);
    expect(reviewFirstPacketQueueGate?.evidenceBoundary).toMatch(/mutate Supabase/i);
    expect(reviewFirstPacketQueueGate?.nextAction).toMatch(/explicit owner approval and release gates/i);
    expect(buyerGate?.status).toBe('external_gate');
    expect(buyerGate?.command).toContain('report:buyer-evidence-gate-readiness');
    expect(buyerGate?.command).toContain('check:buyer-evidence-gate-report');
    expect(buyerGate?.evidenceBoundary).toMatch(/buyer evidence 95% public gate/i);
    expect(buyerGate?.evidenceBoundary).toMatch(/does not contact buyers/i);
    expect(buyerGate?.evidenceBoundary).toMatch(/replace validate:pilot-evidence --require-95/i);
    expect(buyerGate?.nextAction).toMatch(/validate:pilot-evidence --require-95/i);
    expect(buyerGate?.sourceManifestPath).toBe('buyer_evidence');
    expect(buyerGate?.sourceProofTypes).toEqual([
      'buyer_evidence_hard_gate',
      'buyer_evidence_acquisition_matrix',
      'buyer_evidence_minimum_packet_handoff',
    ]);
    expect(buyerHardGateDeficitLedgerGate?.status).toBe('external_gate');
    expect(buyerHardGateDeficitLedgerGate?.command).toContain('report:buyer-evidence-gate-readiness');
    expect(buyerHardGateDeficitLedgerGate?.command).toContain('check:buyer-evidence-gate-report');
    expect(buyerHardGateDeficitLedgerGate?.evidenceBoundary).toMatch(/accepted buyer evidence, reviewer evidence, commercial signal/i);
    expect(buyerHardGateDeficitLedgerGate?.evidenceBoundary).toMatch(/retained artifacts, and 95% validation/i);
    expect(buyerHardGateDeficitLedgerGate?.evidenceBoundary).toMatch(/does not contact buyers/i);
    expect(buyerHardGateDeficitLedgerGate?.evidenceBoundary).toMatch(/prove commercial readiness/i);
    expect(buyerHardGateDeficitLedgerGate?.nextAction).toMatch(/validate:pilot-evidence --require-95/i);
    expect(buyerHardGateDeficitLedgerGate?.sourceManifestPath).toBe('buyer_evidence.hard_gate_deficits');
    expect(buyerHardGateDeficitLedgerGate?.sourceProofTypes).toEqual([
      'buyer_evidence_hard_gate',
    ]);
    expect(buyerAcquisitionMatrixGate?.status).toBe('external_gate');
    expect(buyerAcquisitionMatrixGate?.command).toContain('report:buyer-evidence-gate-readiness');
    expect(buyerAcquisitionMatrixGate?.command).toContain('check:buyer-evidence-gate-report');
    expect(buyerAcquisitionMatrixGate?.evidenceBoundary).toMatch(/outreach intake, production pilot register, utility forecast/i);
    expect(buyerAcquisitionMatrixGate?.evidenceBoundary).toMatch(/does not contact buyers/i);
    expect(buyerAcquisitionMatrixGate?.nextAction).toMatch(/missing buyer-supplied rows/i);
    expect(buyerAcquisitionMatrixGate?.sourceManifestPath).toBe('buyer_evidence.acquisition_matrix');
    expect(buyerAcquisitionMatrixGate?.sourceProofTypes).toEqual([
      'buyer_evidence_acquisition_matrix',
      'outreach_intake_acquisition',
      'production_register_acquisition',
      'forecast_trust_artifact_preparation',
      'retained_artifact_preparation',
      'buyer_acceptance_report',
      'retained_artifact_and_register_update',
      'register_update',
      'commercial_commitment_artifact',
      'retained_artifact_validation',
    ]);
    expect(buyerMinimumPacketHandoffGate?.status).toBe('external_gate');
    expect(buyerMinimumPacketHandoffGate?.proofBucket).toBe('buyer evidence');
    expect(buyerMinimumPacketHandoffGate?.command).toContain('report:buyer-evidence-gate-readiness');
    expect(buyerMinimumPacketHandoffGate?.command).toContain('check:buyer-evidence-gate-report');
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/minimum buyer evidence packet handoff/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/buyer_evidence\.acquisition_matrix\.rows/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/outreach intake, production pilot register, utility forecast/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/TIER or credit, billing or security/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/retained-artifact 95% validation/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/Blocks 95 Gate/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/validate:pilot-evidence --require-95/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/does not contact buyers/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/send outreach/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/create accepted evidence/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/attach retained artifacts/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/validate 95/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/does not create buyer proof/i);
    expect(buyerMinimumPacketHandoffGate?.sourceManifestPath).toBe('buyer_evidence.minimum_evidence_packet');
    expect(buyerMinimumPacketHandoffGate?.sourceProofTypes).toEqual([
      'buyer_evidence_minimum_packet_handoff',
      'outreach_intake_acquisition',
      'production_register_acquisition',
      'forecast_trust_artifact_preparation',
      'retained_artifact_preparation',
      'buyer_acceptance_report',
      'retained_artifact_and_register_update',
      'register_update',
      'commercial_commitment_artifact',
      'retained_artifact_validation',
    ]);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/grant production approval/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/hosted\/live parity/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/does not prove commercial readiness/i);
    expect(buyerMinimumPacketHandoffGate?.evidenceBoundary).toMatch(/create launch readiness/i);
    expect(buyerMinimumPacketHandoffGate?.nextAction).toMatch(/minimum accepted buyer-evidence packet/i);
    expect(buyerMinimumPacketHandoffGate?.nextAction).toMatch(/validate:pilot-evidence --require-95/i);
    expect(buyerMinimumPacketHandoffGate?.nextAction).toMatch(/before changing buyer confidence/i);
    expect(buyerRemediationQueueGate?.status).toBe('external_gate');
    expect(buyerRemediationQueueGate?.command).toContain('report:buyer-evidence-gate-readiness');
    expect(buyerRemediationQueueGate?.command).toContain('check:buyer-evidence-gate-report');
    expect(buyerRemediationQueueGate?.evidenceBoundary).toMatch(/retained artifacts, and 95% validation/i);
    expect(buyerRemediationQueueGate?.evidenceBoundary).toMatch(/does not contact buyers/i);
    expect(buyerRemediationQueueGate?.nextAction).toMatch(/validate:pilot-evidence --require-95/i);
    expect(buyerRemediationQueueGate?.sourceManifestPath).toBe('buyer_evidence.hard_gate_deficits.remediation_queue');
    expect(buyerRemediationQueueGate?.sourceProofTypes).toEqual([
      'buyer_evidence_hard_gate',
    ]);
    expect(advisorGate?.status).toBe('needs_remediation');
    expect(advisorGate?.evidenceBoundary).toMatch(/does not substitute for connector-backed advisors/i);
    expect(supabaseClearanceDeficitLedgerGate?.status).toBe('needs_remediation');
    expect(supabaseClearanceDeficitLedgerGate?.command).toContain('report:supabase-advisor-readiness');
    expect(supabaseClearanceDeficitLedgerGate?.command).toContain('check:supabase-advisor-report');
    expect(supabaseClearanceDeficitLedgerGate?.evidenceBoundary).toMatch(/CLI lint freshness, connector authorization/i);
    expect(supabaseClearanceDeficitLedgerGate?.evidenceBoundary).toMatch(/Security Advisor evidence, Performance Advisor evidence/i);
    expect(supabaseClearanceDeficitLedgerGate?.evidenceBoundary).toMatch(/does not authorize connectors/i);
    expect(supabaseClearanceDeficitLedgerGate?.evidenceBoundary).toMatch(/does not grant production approval/i);
    expect(supabaseClearanceDeficitLedgerGate?.nextAction).toMatch(/without secrets/i);
    expect(supabaseOperatorHandoffPacketGate?.status).toBe('needs_remediation');
    expect(supabaseOperatorHandoffPacketGate?.command).toContain('report:supabase-advisor-readiness');
    expect(supabaseOperatorHandoffPacketGate?.command).toContain('check:supabase-advisor-report');
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/advisor remediation rows/i);
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/operator, account-admin, security-owner, and owner execution gates/i);
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/repo_lint_freshness_first/i);
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/authorized_connector_or_dashboard_access_first/i);
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/security_advisor_after_authorization/i);
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/performance_advisor_after_authorization/i);
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/public_safe_record_after_advisor_review/i);
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/clearance_claim_after_all_rows_pass/i);
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/external-account flags/i);
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/public-safe record flags/i);
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/secret-safe flags/i);
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/can_execute_from_packet=false/i);
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/does not authorize connectors/i);
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/record secrets/i);
    expect(supabaseOperatorHandoffPacketGate?.evidenceBoundary).toMatch(/create or claim advisor clearance/i);
    expect(supabaseOperatorHandoffPacketGate?.nextAction).toMatch(/Supabase advisor handoff/i);
    expect(supabaseOperatorHandoffPacketGate?.nextAction).toMatch(/public-safe findings without secrets/i);
    expect(supabaseRemediationQueueGate?.status).toBe('needs_remediation');
    expect(supabaseRemediationQueueGate?.command).toContain('report:supabase-advisor-readiness');
    expect(supabaseRemediationQueueGate?.command).toContain('check:supabase-advisor-report');
    expect(supabaseRemediationQueueGate?.evidenceBoundary).toMatch(/Security Advisor evidence, Performance Advisor evidence/i);
    expect(supabaseRemediationQueueGate?.evidenceBoundary).toMatch(/does not authorize connectors/i);
    expect(supabaseRemediationQueueGate?.nextAction).toMatch(/without secrets/i);
  });

  it('keeps shared public release-status gates aligned with release health evidence handles', () => {
    for (const contract of SHARED_PUBLIC_RELEASE_EVIDENCE_CONTRACTS) {
      const publicGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === contract.publicId);
      const releaseHealthEvidence = RELEASE_HEALTH_EVIDENCE.find(
        (item) => item.label === contract.releaseHealthLabel,
      );

      expect(publicGate, `${contract.publicId} public release-status gate must exist`).toBeTruthy();
      expect(releaseHealthEvidence, `${contract.releaseHealthLabel} release health evidence must exist`).toBeTruthy();
      expect(publicGate?.status, `${contract.publicId} status must match release health evidence`).toBe(
        releaseHealthEvidence?.status,
      );
      expect(publicGate?.command, `${contract.publicId} proof command must match release health evidence`).toBe(
        releaseHealthEvidence?.command,
      );

      for (const boundaryPattern of contract.boundaryPatterns) {
        expect(publicGate?.evidenceBoundary, `${contract.publicId} public boundary drifted`).toMatch(boundaryPattern);
        expect(
          releaseHealthEvidence?.evidenceBoundary,
          `${contract.releaseHealthLabel} evidence boundary drifted`,
        ).toMatch(boundaryPattern);
      }
    }
  });
});
