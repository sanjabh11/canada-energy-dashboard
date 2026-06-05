#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const validatorPath = '/Users/sanjayb/.codex/skills/commercial-launch-readiness-orchestrator/scripts/validate_launch_evidence.py';
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
  failures.push(`Unknown option: ${arg}`);
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run check:launch-evidence-manifest

Options:
  --skip-probes      Skip local readiness probes for fast unit-level checks.
`);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 30 * 1024 * 1024,
    ...options,
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

function hasOpenGap(manifest, severity, needle) {
  return Array.isArray(manifest.gaps)
    && manifest.gaps.some((gap) => (
      gap
      && gap.severity === severity
      && typeof gap.gap === 'string'
      && gap.gap.includes(needle)
      && gap.status === 'open'
    ));
}

function hasIntegerOrNull(value) {
  return value === null || Number.isInteger(value);
}

function isBoolean(value) {
  return value === true || value === false;
}

function assertChangedSupabaseFunctionReviewRow(row, pathLabel) {
  assert(typeof row.function_name === 'string' && row.function_name.length > 0, `${pathLabel}.function_name must be set.`);
  assert(typeof row.changed_paths === 'string' && row.changed_paths.length > 0, `${pathLabel}.changed_paths must be set.`);
  assert(typeof row.review_focus === 'string' && row.review_focus.length > 0, `${pathLabel}.review_focus must be set.`);
  assert(typeof row.suggested_checks === 'string' && row.suggested_checks.length > 0, `${pathLabel}.suggested_checks must be set.`);
  assert(typeof row.stop_gate === 'string' && /no deploy|no .*migration|no .*secret|no .*production/i.test(row.stop_gate), `${pathLabel}.stop_gate must preserve the non-deploying Supabase function review boundary.`);
  assert(row.proof_type === 'read_only_supabase_function_branch_review', `${pathLabel}.proof_type must classify parsed Supabase function rows as read-only branch-review targets.`);
  assert(row.read_only === true, `${pathLabel}.read_only must be true.`);
  assert(
    typeof row.proof_boundary === 'string' && /review-target evidence|does not deploy functions|run migrations|alter secrets|clear advisor findings|production approval/i.test(row.proof_boundary),
    `${pathLabel}.proof_boundary must say the row is review-target evidence only and does not deploy or clear advisor findings.`,
  );
}

const tempRoot = mkdtempSync(path.join(tmpdir(), 'ceip-launch-evidence-check-'));
const manifestPath = path.join(tempRoot, 'launch-evidence.json');

try {
  if (failures.length === 0) {
    const reportArgs = ['scripts/report-launch-evidence-manifest.mjs', '--output', manifestPath];
    if (skipProbes) reportArgs.push('--skip-probes');

    const report = run(process.execPath, reportArgs);
    if (report.status !== 0) {
      failures.push(`Launch evidence manifest report exited ${report.status}.`);
      if (report.error.trim()) failures.push(report.error.trim());
      if (report.stderr.trim()) failures.push(report.stderr.trim());
      if (report.stdout.trim()) failures.push(report.stdout.trim());
    } else if (report.stdout.trim()) {
      try {
        JSON.parse(report.stdout);
      } catch {
        failures.push('Launch evidence manifest stdout is not valid JSON.');
      }
    }
  }

  let manifest = null;
  if (failures.length === 0) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      failures.push(`Unable to parse generated manifest: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (manifest) {
    assert(manifest.schema_version === 1, 'Manifest schema_version must be 1.');
    assert(manifest.repo?.path === repoRoot, 'Manifest repo.path must match the current repository root.');
    assert(manifest.launch_decision === 'blocked', 'Manifest launch_decision must remain blocked until buyer and deploy gates clear.');
    assert(manifest.scores?.overall === 2, 'Manifest overall score must stay at the conservative blocked value of 2.');
    assert(manifest.scores?.evidence === 1, 'Manifest evidence score must stay at 1 while buyer evidence is absent.');
    assert(Array.isArray(manifest.pain_points) && manifest.pain_points.length === 10, 'Manifest must include exactly ten pain points.');
    for (const [index, painPoint] of (manifest.pain_points ?? []).entries()) {
      assert(Number.isInteger(painPoint.rank), `pain_points[${index}].rank must be an integer.`);
      assert(typeof painPoint.pain_point === 'string' && painPoint.pain_point.length > 0, `pain_points[${index}].pain_point must be set.`);
      assert(typeof painPoint.affected_buyer === 'string' && painPoint.affected_buyer.length > 0, `pain_points[${index}].affected_buyer must be set.`);
      assert(Array.isArray(painPoint.source_evidence) && painPoint.source_evidence.length > 0, `pain_points[${index}].source_evidence must include source URLs.`);
      assert(painPoint.source_evidence.every((source) => typeof source === 'string' && source.startsWith('https://')), `pain_points[${index}].source_evidence must use HTTPS URLs.`);
      assert(typeof painPoint.willingness_to_pay_signal === 'string' && painPoint.willingness_to_pay_signal.length > 0, `pain_points[${index}].willingness_to_pay_signal must be set.`);
      assert(typeof painPoint.repo_proof_fit === 'string' && painPoint.repo_proof_fit.length > 0, `pain_points[${index}].repo_proof_fit must be set.`);
      assert(Number.isInteger(painPoint.confidence) && painPoint.confidence >= 1 && painPoint.confidence <= 5, `pain_points[${index}].confidence must be 1-5.`);
      assert(painPoint.proof_type === 'market_pain_source_research', `pain_points[${index}].proof_type must classify source-backed market pain research.`);
      assert(
        typeof painPoint.proof_boundary === 'string'
          && /source-backed market pain hypothesis|does not prove buyer acceptance|retained buyer artifacts|account-level willingness to pay|live customer adoption|commercial-ready status/i.test(painPoint.proof_boundary),
        `pain_points[${index}].proof_boundary must prevent market-source overclaims.`,
      );
      assert(
        typeof painPoint.stop_gate === 'string'
          && /Do not treat source links|willingness-to-pay signals|confidence scores|repo proof-fit routes as buyer proof|customer commitment|live utility adoption|permission to contact buyers/i.test(painPoint.stop_gate),
        `pain_points[${index}].stop_gate must block buyer-proof and outreach overclaims.`,
      );
    }
    assert(Array.isArray(manifest.target_customers) && manifest.target_customers.length === 10, 'Manifest must include exactly ten target customers or segments.');
    for (const [index, target] of (manifest.target_customers ?? []).entries()) {
      assert(Number.isInteger(target.rank), `target_customers[${index}].rank must be an integer.`);
      assert(typeof target.account_or_segment === 'string' && target.account_or_segment.length > 0, `target_customers[${index}].account_or_segment must be set.`);
      assert(typeof target.pain === 'string' && target.pain.length > 0, `target_customers[${index}].pain must be set.`);
      assert(typeof target.trigger === 'string' && target.trigger.length > 0, `target_customers[${index}].trigger must be set.`);
      assert(typeof target.decision_maker === 'string' && target.decision_maker.length > 0, `target_customers[${index}].decision_maker must be set.`);
      assert(typeof target.outreach_angle === 'string' && target.outreach_angle.length > 0, `target_customers[${index}].outreach_angle must be set.`);
      assert(typeof target.proof_to_show === 'string' && target.proof_to_show.length > 0, `target_customers[${index}].proof_to_show must be set.`);
      assert(Number.isInteger(target.confidence) && target.confidence >= 1 && target.confidence <= 5, `target_customers[${index}].confidence must be 1-5.`);
      assert(target.proof_type === 'target_segment_ranking_hypothesis', `target_customers[${index}].proof_type must classify target segment ranking hypotheses.`);
      assert(
        typeof target.proof_boundary === 'string'
          && /Target segment ranking|does not prove named-account validation|buyer acceptance|outreach permission|procurement approval|live customer adoption|commercial-ready status/i.test(target.proof_boundary),
        `target_customers[${index}].proof_boundary must prevent target-ranking overclaims.`,
      );
      assert(
        typeof target.stop_gate === 'string'
          && /Do not treat target ranking|outreach angle|proof-to-show routes|confidence scores as permission to contact buyers|customer commitment|procurement approval|live utility adoption|buyer-proven evidence/i.test(target.stop_gate),
        `target_customers[${index}].stop_gate must block outreach, adoption, and buyer-proof overclaims.`,
      );
    }
    assert(
      ['hosted_live', 'local', 'repo_artifact', 'candidate_shadow', 'roadmap'].every((bucket) => Object.hasOwn(manifest.proof_buckets ?? {}, bucket)),
      'Manifest must keep the five proof buckets: hosted_live, local, repo_artifact, candidate_shadow, and roadmap.',
    );
    assert(Array.isArray(manifest.gaps), 'Manifest gaps must be a list.');
    assert(hasOpenGap(manifest, 'P0', 'Phase F evidence'), 'Manifest must keep the open P0 Phase F buyer-evidence gap.');
    const gapProofExpectations = [
      {
        needle: 'Phase F evidence',
        proofType: 'buyer_evidence_hard_gate',
        boundary: /does not prove buyer acceptance|95% confidence|retained artifacts|commercial-ready status/i,
        stopGate: /Do not claim buyer-proven 95% confidence|accepted proof packs|commercial-ready status|outreach permission/i,
      },
      {
        needle: 'source deploy approval',
        proofType: 'source_provenance_approval_gate',
        boundary: /does not commit|unstage|stash|clear source provenance|run release-readiness|deploy|grant approval/i,
        stopGate: /Do not commit|unstage|stash|revert|delete|move|deploy|production approval/i,
      },
      {
        needle: 'unmerged branches',
        proofType: 'branch_review_clearance_gap',
        boundary: /read-only unmerged-branch|does not checkout|merge|push|discard branches|run migrations|deploy|approve canonical heads/i,
        stopGate: /Do not checkout|merge|push|discard branches|migrate|deploy|canonical heads/i,
      },
      {
        needle: 'Supabase security/performance advisor clearance',
        proofType: 'external_advisor_clearance_gap',
        boundary: /repo-visible Supabase advisor|does not access dashboards|reauthorize connectors|clear advisor findings|run migrations|alter secrets|prove RLS\/performance clearance/i,
        stopGate: /Do not claim Supabase advisor clearance|RLS\/performance clearance|production database readiness|advisor evidence/i,
      },
      {
        needle: 'Release toolchain',
        proofType: 'release_toolchain_approval_gap',
        boundary: /does not resolve Corepack|Git LFS|run full release-readiness|clear source provenance|push|deploy|prove live parity|grant owner approval/i,
        stopGate: /Do not treat local pnpm checks|package metadata|stale Git LFS evidence|release-readiness|push-path proof|deploy readiness|owner approval/i,
      },
    ];
    for (const expectation of gapProofExpectations) {
      const gap = manifest.gaps.find((item) => typeof item?.gap === 'string' && item.gap.includes(expectation.needle));
      assert(gap, `Manifest gaps must include ${expectation.needle}.`);
      if (gap) {
        assert(gap.proof_type === expectation.proofType, `Manifest gap "${expectation.needle}" must classify proof_type as ${expectation.proofType}.`);
        assert(typeof gap.proof_boundary === 'string' && expectation.boundary.test(gap.proof_boundary), `Manifest gap "${expectation.needle}" must preserve its proof boundary.`);
        assert(typeof gap.stop_gate === 'string' && expectation.stopGate.test(gap.stop_gate), `Manifest gap "${expectation.needle}" must preserve its stop gate.`);
      }
    }
    assert(typeof manifest.buyer_evidence?.evidence === 'string', 'Manifest must include buyer_evidence.evidence.');
    assert(manifest.buyer_evidence.evidence.includes('Buyer evidence review'), 'Manifest buyer_evidence evidence must summarize Phase F buyer evidence readiness.');
    assert(manifest.buyer_evidence.evidence.includes('starter_only_registers='), 'Manifest buyer_evidence evidence must include starter-only register count.');
    assert(typeof manifest.buyer_evidence?.phase_f_gate === 'string' && manifest.buyer_evidence.phase_f_gate.length > 0, 'Manifest buyer_evidence.phase_f_gate must be set.');
    assert(typeof manifest.buyer_evidence?.workspace_next_step === 'string' && manifest.buyer_evidence.workspace_next_step.length > 0, 'Manifest buyer_evidence.workspace_next_step must be set.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.production_registers), 'Manifest buyer_evidence.production_registers must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.starter_only_registers), 'Manifest buyer_evidence.starter_only_registers must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.outreach_logs), 'Manifest buyer_evidence.outreach_logs must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.confidence_moving_rows), 'Manifest buyer_evidence.confidence_moving_rows must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.actionable_outreach_rows), 'Manifest buyer_evidence.actionable_outreach_rows must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.batchable_intake_packet_rows), 'Manifest buyer_evidence.batchable_intake_packet_rows must be an integer or null.');
    assert(typeof manifest.buyer_evidence?.hard_gate_deficits?.evidence === 'string', 'Manifest buyer_evidence.hard_gate_deficits.evidence must be set.');
    assert(manifest.buyer_evidence.hard_gate_deficits.evidence.includes('Buyer hard-gate deficit ledger'), 'Manifest buyer hard-gate deficits evidence must include a ledger marker.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.hard_gate_deficits?.open_count), 'Manifest buyer_evidence.hard_gate_deficits.open_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.hard_gate_deficits?.total_count), 'Manifest buyer_evidence.hard_gate_deficits.total_count must be an integer or null.');
    assert(Array.isArray(manifest.buyer_evidence?.hard_gate_deficits?.items), 'Manifest buyer_evidence.hard_gate_deficits.items must be a list.');
    const buyerProofTypesByRequirement = {
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
    for (const [index, item] of (manifest.buyer_evidence.hard_gate_deficits.items ?? []).entries()) {
      assert(typeof item.requirement === 'string' && item.requirement.length > 0, `buyer_evidence.hard_gate_deficits.items[${index}].requirement must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `buyer_evidence.hard_gate_deficits.items[${index}].current must be set.`);
      assert(typeof item.needed === 'string' && item.needed.length > 0, `buyer_evidence.hard_gate_deficits.items[${index}].needed must be set.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `buyer_evidence.hard_gate_deficits.items[${index}].status must be set.`);
      assert(typeof item.next_action === 'string' && item.next_action.length > 0, `buyer_evidence.hard_gate_deficits.items[${index}].next_action must be set.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `buyer_evidence.hard_gate_deficits.items[${index}].proof_type must be set.`);
      assert(typeof item.buyer_accepted_evidence_required === 'boolean', `buyer_evidence.hard_gate_deficits.items[${index}].buyer_accepted_evidence_required must be boolean.`);
      assert(typeof item.retained_artifact_required === 'boolean', `buyer_evidence.hard_gate_deficits.items[${index}].retained_artifact_required must be boolean.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `buyer_evidence.hard_gate_deficits.items[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && item.stop_gate.length > 0, `buyer_evidence.hard_gate_deficits.items[${index}].stop_gate must be set.`);
      if (buyerProofTypesByRequirement[item.requirement]) {
        assert(
          item.proof_type === buyerProofTypesByRequirement[item.requirement],
          `buyer_evidence.hard_gate_deficits.items[${index}] must classify ${item.requirement} as ${buyerProofTypesByRequirement[item.requirement]}.`,
        );
        assert(item.buyer_accepted_evidence_required === true, `buyer_evidence.hard_gate_deficits.items[${index}] must require accepted buyer evidence.`);
        assert(item.retained_artifact_required === true, `buyer_evidence.hard_gate_deficits.items[${index}] must require retained redacted artifacts.`);
        assert(/Requires|Runs validate:pilot-evidence/i.test(item.proof_boundary), `buyer_evidence.hard_gate_deficits.items[${index}].proof_boundary must describe the buyer proof required.`);
        assert(/Do not/i.test(item.stop_gate), `buyer_evidence.hard_gate_deficits.items[${index}].stop_gate must preserve an explicit no-claim boundary.`);
      }
      if (item.requirement === 'Strong commercial signal') {
        assert(/signed agreement|paid pilot|invoice|PO|LOI|status-only labels|informal interest/i.test(item.proof_boundary), 'Strong commercial signal deficit proof_boundary must require retained commercial commitment evidence and reject status-only labels.');
        assert(/status labels|informal interest|unretained claims/i.test(item.stop_gate), 'Strong commercial signal deficit stop_gate must reject status labels, informal interest, and unretained claims.');
      }
      if (item.requirement === 'Retained-artifact 95% validation') {
        assert(/validation does not create buyer acceptance|validate:pilot-evidence/i.test(item.proof_boundary), 'Retained-artifact validation deficit proof_boundary must not imply validation creates buyer acceptance.');
        assert(/validate:pilot-evidence --require-95/i.test(item.stop_gate), 'Retained-artifact validation deficit stop_gate must require validate:pilot-evidence --require-95.');
      }
    }
    assert(typeof manifest.buyer_evidence?.acquisition_matrix?.evidence === 'string', 'Manifest buyer_evidence.acquisition_matrix.evidence must be set.');
    assert(manifest.buyer_evidence.acquisition_matrix.evidence.includes('Buyer evidence acquisition matrix'), 'Manifest buyer evidence acquisition matrix evidence must include a matrix marker.');
    assert(manifest.buyer_evidence.acquisition_matrix.proof_type === 'buyer_evidence_acquisition_matrix', 'Manifest buyer evidence acquisition matrix must classify proof_type as buyer_evidence_acquisition_matrix.');
    assert(typeof manifest.buyer_evidence.acquisition_matrix.source_deficit_status === 'string', 'Manifest buyer_evidence.acquisition_matrix.source_deficit_status must be set.');
    assert(hasIntegerOrNull(manifest.buyer_evidence.acquisition_matrix?.row_count), 'Manifest buyer_evidence.acquisition_matrix.row_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence.acquisition_matrix?.blocked_count), 'Manifest buyer_evidence.acquisition_matrix.blocked_count must be an integer or null.');
    assert(Array.isArray(manifest.buyer_evidence.acquisition_matrix?.rows), 'Manifest buyer_evidence.acquisition_matrix.rows must be a list.');
    assert(
      manifest.buyer_evidence.acquisition_matrix.row_count === manifest.buyer_evidence.acquisition_matrix.rows.length,
      'Buyer evidence acquisition matrix row_count must match rows length.',
    );
    assert((manifest.buyer_evidence.acquisition_matrix.rows ?? []).length >= 10, 'Buyer evidence acquisition matrix must include outreach, register, lane, artifact, confidence, commitment, and validation rows.');
    assert(typeof manifest.buyer_evidence.acquisition_matrix.proof_boundary === 'string' && /does not contact buyers|create accepted evidence|move confidence|validate 95%|claim buyer acceptance/i.test(manifest.buyer_evidence.acquisition_matrix.proof_boundary), 'Buyer evidence acquisition matrix proof_boundary must preserve acquisition-only semantics.');
    assert(typeof manifest.buyer_evidence.acquisition_matrix.stop_gate === 'string' && /Do not mark buyer evidence ready|validate:pilot-evidence --require-95|real anonymized buyer rows/i.test(manifest.buyer_evidence.acquisition_matrix.stop_gate), 'Buyer evidence acquisition matrix stop_gate must require real retained buyer evidence before readiness.');
    const buyerAcquisitionProofTypesByLane = {
      'Outreach response log intake': 'outreach_intake_acquisition',
      'Production pilot evidence register': 'production_register_acquisition',
      'Utility forecast lane': 'forecast_trust_artifact_preparation',
      'TIER or credit lane': 'retained_artifact_preparation',
      'Billing or security lane': 'retained_artifact_preparation',
      'Distinct accepted proof packs': 'buyer_acceptance_report',
      'Retained redacted artifact set': 'retained_artifact_and_register_update',
      'Confidence movement and coverage': 'register_update',
      'Strong commercial commitment': 'commercial_commitment_artifact',
      'Retained-artifact 95% validation': 'retained_artifact_validation',
    };
    for (const [index, item] of (manifest.buyer_evidence.acquisition_matrix.rows ?? []).entries()) {
      assert(Number.isInteger(item.rank), `buyer_evidence.acquisition_matrix.rows[${index}].rank must be an integer.`);
      assert(typeof item.lane === 'string' && item.lane.length > 0, `buyer_evidence.acquisition_matrix.rows[${index}].lane must be set.`);
      assert(typeof item.source_requirement === 'string' && item.source_requirement.length > 0, `buyer_evidence.acquisition_matrix.rows[${index}].source_requirement must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `buyer_evidence.acquisition_matrix.rows[${index}].current must be set.`);
      assert(typeof item.required_artifact === 'string' && item.required_artifact.length > 0, `buyer_evidence.acquisition_matrix.rows[${index}].required_artifact must be set.`);
      assert(typeof item.minimum_accepted_signal === 'string' && item.minimum_accepted_signal.length > 0, `buyer_evidence.acquisition_matrix.rows[${index}].minimum_accepted_signal must be set.`);
      assert(typeof item.evidence_root === 'string' && item.evidence_root.length > 0, `buyer_evidence.acquisition_matrix.rows[${index}].evidence_root must be set.`);
      assert(typeof item.template_or_source_path === 'string' && item.template_or_source_path.length > 0, `buyer_evidence.acquisition_matrix.rows[${index}].template_or_source_path must be set.`);
      assert(typeof item.validation_command === 'string' && item.validation_command.length > 0, `buyer_evidence.acquisition_matrix.rows[${index}].validation_command must be set.`);
      assert(!/[<>]/.test(item.validation_command), `buyer_evidence.acquisition_matrix.rows[${index}].validation_command must use shell-safe placeholders, not angle-bracket redirection placeholders.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `buyer_evidence.acquisition_matrix.rows[${index}].proof_type must be set.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `buyer_evidence.acquisition_matrix.rows[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && /Do not/i.test(item.stop_gate), `buyer_evidence.acquisition_matrix.rows[${index}].stop_gate must preserve an explicit stop gate.`);
      assert(typeof item.owner === 'string' && item.owner.length > 0, `buyer_evidence.acquisition_matrix.rows[${index}].owner must be set.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `buyer_evidence.acquisition_matrix.rows[${index}].status must be set.`);
      assert(typeof item.blocks_buyer_gate === 'boolean', `buyer_evidence.acquisition_matrix.rows[${index}].blocks_buyer_gate must be boolean.`);
      if (buyerAcquisitionProofTypesByLane[item.lane]) {
        assert(
          item.proof_type === buyerAcquisitionProofTypesByLane[item.lane],
          `buyer_evidence.acquisition_matrix.rows[${index}] must classify ${item.lane} as ${buyerAcquisitionProofTypesByLane[item.lane]}.`,
        );
      }
      if (item.lane === 'Outreach response log intake') {
        assert(item.validation_command.includes('plan:outreach-intake'), 'Outreach acquisition row must point to the outreach intake action-plan command.');
        assert(/does not contact buyers|create acceptance/i.test(item.proof_boundary), 'Outreach acquisition proof_boundary must not imply outreach execution or buyer acceptance.');
      }
      if (item.lane === 'Production pilot evidence register') {
        assert(item.validation_command.includes('report:buyer-evidence-readiness'), 'Production register acquisition row must point to buyer evidence readiness validation.');
        assert(/outside templates|starter rows/i.test(item.proof_boundary), 'Production register acquisition proof_boundary must reject templates and starter rows.');
      }
      if (item.lane === 'Retained-artifact 95% validation') {
        assert(item.validation_command.includes('validate:pilot-evidence'), 'Retained-artifact validation acquisition row must point to validate:pilot-evidence.');
        assert(/validation does not create buyer acceptance/i.test(item.proof_boundary), 'Retained-artifact validation acquisition row must not imply validation creates buyer acceptance.');
      }
    }
    for (const lane of Object.keys(buyerAcquisitionProofTypesByLane)) {
      assert(
        manifest.buyer_evidence.acquisition_matrix.rows.some((item) => item.lane === lane),
        `Buyer evidence acquisition matrix must include lane: ${lane}.`,
      );
    }
    assert(typeof manifest.buyer_evidence?.hard_gate_deficits?.remediation_queue?.evidence === 'string', 'Manifest buyer_evidence.hard_gate_deficits.remediation_queue.evidence must be set.');
    assert(manifest.buyer_evidence.hard_gate_deficits.remediation_queue.evidence.includes('Buyer evidence remediation queue'), 'Manifest buyer evidence remediation queue evidence must include a queue marker.');
    assert(hasIntegerOrNull(manifest.buyer_evidence.hard_gate_deficits.remediation_queue?.open_count), 'Manifest buyer_evidence.hard_gate_deficits.remediation_queue.open_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence.hard_gate_deficits.remediation_queue?.total_count), 'Manifest buyer_evidence.hard_gate_deficits.remediation_queue.total_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence.hard_gate_deficits.remediation_queue?.item_count), 'Manifest buyer_evidence.hard_gate_deficits.remediation_queue.item_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence.hard_gate_deficits.remediation_queue?.blocked_count), 'Manifest buyer_evidence.hard_gate_deficits.remediation_queue.blocked_count must be an integer or null.');
    assert(
      manifest.buyer_evidence.hard_gate_deficits.remediation_queue.open_count === manifest.buyer_evidence.hard_gate_deficits.open_count,
      'Buyer evidence remediation queue open_count must match hard_gate_deficits.open_count.',
    );
    assert(
      manifest.buyer_evidence.hard_gate_deficits.remediation_queue.total_count === manifest.buyer_evidence.hard_gate_deficits.total_count,
      'Buyer evidence remediation queue total_count must match hard_gate_deficits.total_count.',
    );
    assert(Array.isArray(manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items), 'Manifest buyer_evidence.hard_gate_deficits.remediation_queue.items must be a list.');
    assert(
      manifest.buyer_evidence.hard_gate_deficits.remediation_queue.item_count === manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items.length,
      'Buyer evidence remediation queue item_count must match items length.',
    );
    for (const [index, item] of (manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items ?? []).entries()) {
      assert(Number.isInteger(item.rank), `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].rank must be an integer.`);
      assert(typeof item.requirement === 'string' && item.requirement.length > 0, `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].requirement must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].current must be set.`);
      assert(typeof item.needed === 'string' && item.needed.length > 0, `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].needed must be set.`);
      assert(typeof item.deficit_status === 'string' && item.deficit_status.length > 0, `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].deficit_status must be set.`);
      assert(typeof item.owner === 'string' && item.owner.length > 0, `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].owner must be set.`);
      assert(typeof item.action === 'string' && item.action.length > 0, `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].action must be set.`);
      assert(typeof item.proof_command === 'string' && item.proof_command.length > 0, `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].proof_command must be set.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].proof_type must be set.`);
      assert(typeof item.buyer_accepted_evidence_required === 'boolean', `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].buyer_accepted_evidence_required must be boolean.`);
      assert(typeof item.retained_artifact_required === 'boolean', `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].retained_artifact_required must be boolean.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && item.stop_gate.length > 0, `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].stop_gate must be set.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].status must be set.`);
      assert(item.status !== 'ready', `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].status must remain non-ready until the hard-gate row passes.`);
      assert(!/[<>]/.test(item.proof_command), `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].proof_command must use shell-safe placeholders, not angle-bracket redirection placeholders.`);
      if (buyerProofTypesByRequirement[item.requirement]) {
        assert(
          item.proof_type === buyerProofTypesByRequirement[item.requirement],
          `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}] must classify ${item.requirement} as ${buyerProofTypesByRequirement[item.requirement]}.`,
        );
        assert(item.buyer_accepted_evidence_required === true, `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}] must require accepted buyer evidence.`);
        assert(item.retained_artifact_required === true, `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}] must require retained redacted artifacts.`);
      }
      if (item.requirement === 'Utility forecast lane') {
        assert(item.proof_command.includes('prepare:forecast-trust-report-artifact'), 'Utility forecast buyer remediation must prepare a forecast trust retained artifact.');
        assert(/accepted buyer review|retained redacted forecast trust artifact/i.test(item.proof_boundary), 'Utility forecast buyer remediation proof_boundary must require accepted retained buyer evidence.');
      }
      if (['TIER or credit lane', 'Billing or security lane'].includes(item.requirement)) {
        assert(item.proof_command.includes('prepare:pilot-evidence-artifact'), `${item.requirement} buyer remediation must prepare retained pilot evidence artifacts.`);
        assert(/buyer-supplied retained redacted/i.test(item.proof_boundary), `${item.requirement} buyer remediation proof_boundary must require buyer-supplied retained evidence.`);
      }
      if (['Accepted confidence_delta', 'Buyer data coverage', 'Artifact turnaround'].includes(item.requirement)) {
        assert(item.proof_command.includes('update:pilot-evidence-register-row'), `${item.requirement} buyer remediation must update a retained evidence register row.`);
        assert(/retained artifact|retained accepted artifact/i.test(item.proof_boundary), `${item.requirement} buyer remediation proof_boundary must require retained artifact support.`);
      }
      if (item.requirement === 'Distinct accepted proof packs') {
        assert(item.proof_command.includes('report:pilot-evidence-95'), 'Distinct accepted proof-pack remediation must report the accepted proof-pack count.');
        assert(/distinct accepted proof-pack rows|duplicate rows/i.test(item.proof_boundary), 'Distinct accepted proof-pack proof_boundary must reject duplicates and generated packs.');
      }
      if (item.requirement === 'Retained SHA-256 references') {
        assert(item.proof_command.includes('prepare:pilot-evidence-artifact'), 'Retained SHA-256 remediation must prepare retained artifacts before register update.');
        assert(/stable SHA-256 references|missing, changed, opaque/i.test(item.proof_boundary), 'Retained SHA-256 proof_boundary must reject missing, changed, or opaque artifacts.');
      }
      if (item.proof_command.includes('prepare:pilot-evidence-artifact')) {
        for (const option of [
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
        ]) {
          assert(item.proof_command.includes(option), `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].proof_command must include ${option} when preparing retained pilot evidence artifacts.`);
        }
      }
      if (item.proof_command.includes('prepare:forecast-trust-report-artifact')) {
        for (const option of [
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
        ]) {
          assert(item.proof_command.includes(option), `buyer_evidence.hard_gate_deficits.remediation_queue.items[${index}].proof_command must include ${option} when preparing forecast trust retained evidence.`);
        }
      }
    }
    const buyerQueueRequirements = (manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items ?? []).map((item) => item.requirement);
    const nonPassBuyerRequirements = (manifest.buyer_evidence.hard_gate_deficits.items ?? [])
      .filter((item) => item.status !== 'pass')
      .map((item) => item.requirement);
    assert(
      JSON.stringify(buyerQueueRequirements) === JSON.stringify(nonPassBuyerRequirements),
      'Buyer evidence remediation queue must include exactly the current non-pass buyer hard-gate requirements.',
    );
    if (buyerQueueRequirements.includes('Retained-artifact 95% validation')) {
      const validationItem = manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items.find((item) => item.requirement === 'Retained-artifact 95% validation');
      assert(
        manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items.some((item) => item.proof_command.includes('validate:pilot-evidence')),
        'Buyer evidence remediation queue must include validate:pilot-evidence while retained-artifact 95% validation is unresolved.',
      );
      assert(
        /validation does not create buyer acceptance/i.test(validationItem?.proof_boundary ?? ''),
        'Retained-artifact validation proof_boundary must not imply validation creates buyer acceptance.',
      );
    }
    if (buyerQueueRequirements.includes('Strong commercial signal')) {
      const strongSignalItem = manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items.find((item) => item.requirement === 'Strong commercial signal');
      assert(
        strongSignalItem?.proof_command.includes('prepare:pilot-evidence-artifact')
          && strongSignalItem.proof_command.includes('--commercial-commitment-evidence')
          && strongSignalItem.proof_command.includes('update:pilot-evidence-register-row')
          && strongSignalItem.proof_command.includes('validate:pilot-evidence'),
        'Buyer evidence remediation queue must require retained non-status-only commercial commitment evidence before strong commercial signal remediation can close.',
      );
      assert(
        /status-only labels|informal interest|unretained claims/i.test(strongSignalItem?.proof_boundary ?? ''),
        'Strong commercial signal proof_boundary must reject status-only labels, informal interest, and unretained claims.',
      );
    }
    if (buyerQueueRequirements.length > 0) {
      assert(
        manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items.some((item) => /Do not/.test(item.stop_gate)),
        'Buyer evidence remediation queue must preserve explicit no-scaffolding stop gates.',
      );
    }
    if (!skipProbes) {
      assert(Number.isInteger(manifest.buyer_evidence?.production_registers), 'Non-skipped manifest must include numeric buyer-evidence production register count.');
      assert(Number.isInteger(manifest.buyer_evidence?.outreach_logs), 'Non-skipped manifest must include numeric buyer-evidence outreach log count.');
      assert(Number.isInteger(manifest.buyer_evidence?.confidence_moving_rows), 'Non-skipped manifest must include numeric buyer-evidence confidence row count.');
      assert(Number.isInteger(manifest.buyer_evidence?.hard_gate_deficits?.open_count), 'Non-skipped manifest must include numeric buyer hard-gate deficit open count.');
      assert(Number.isInteger(manifest.buyer_evidence?.hard_gate_deficits?.total_count), 'Non-skipped manifest must include numeric buyer hard-gate deficit total count.');
      assert(manifest.buyer_evidence.hard_gate_deficits.items.length >= 10, 'Non-skipped manifest must include the buyer hard-gate deficit item table.');
      assert(manifest.buyer_evidence.hard_gate_deficits.items.some((item) => item.requirement === 'Utility forecast lane'), 'Buyer hard-gate deficits must include the utility forecast lane.');
      assert(manifest.buyer_evidence.hard_gate_deficits.items.some((item) => item.requirement === 'Retained-artifact 95% validation'), 'Buyer hard-gate deficits must include retained-artifact validation.');
    }
    assert(typeof manifest.source_provenance?.evidence === 'string', 'Manifest must include source_provenance.evidence.');
    assert(manifest.source_provenance.evidence.includes('Source provenance:'), 'Manifest source provenance evidence must include a summary marker.');
    assert(typeof manifest.source_provenance?.branch === 'string' && manifest.source_provenance.branch.length > 0, 'Manifest source_provenance.branch must be set.');
    assert(typeof manifest.source_provenance?.commit === 'string' && manifest.source_provenance.commit.length > 0, 'Manifest source_provenance.commit must be set.');
    assert(isBoolean(manifest.source_provenance?.is_dirty), 'Manifest source_provenance.is_dirty must be boolean.');
    assert(Number.isInteger(manifest.source_provenance?.dirty_path_count), 'Manifest source_provenance.dirty_path_count must be an integer.');
    assert(Array.isArray(manifest.source_provenance?.dirty_paths), 'Manifest source_provenance.dirty_paths must be a list.');
    assert(
      manifest.source_provenance.dirty_paths.length === manifest.source_provenance.dirty_path_count
        || manifest.source_provenance.dirty_paths.length === Math.min(manifest.source_provenance.dirty_path_count, 40),
      'Manifest source_provenance dirty_paths must match the dirty path count or the 40-path cap.',
    );
    for (const [index, dirtyPath] of (manifest.source_provenance.dirty_paths ?? []).entries()) {
      assert(typeof dirtyPath.file_path === 'string' && dirtyPath.file_path.length > 0, `source_provenance.dirty_paths[${index}].file_path must be set.`);
      assert(typeof dirtyPath.status === 'string' && dirtyPath.status.length > 0, `source_provenance.dirty_paths[${index}].status must be set.`);
      assert(typeof dirtyPath.index_status === 'string' && dirtyPath.index_status.length > 0, `source_provenance.dirty_paths[${index}].index_status must be set.`);
      assert(typeof dirtyPath.worktree_status === 'string' && dirtyPath.worktree_status.length > 0, `source_provenance.dirty_paths[${index}].worktree_status must be set.`);
      assert(typeof dirtyPath.staging_state === 'string' && dirtyPath.staging_state.length > 0, `source_provenance.dirty_paths[${index}].staging_state must be set.`);
      assert(isBoolean(dirtyPath.tracked), `source_provenance.dirty_paths[${index}].tracked must be boolean.`);
      assert(isBoolean(dirtyPath.ignored_by_rule), `source_provenance.dirty_paths[${index}].ignored_by_rule must be boolean.`);
      assert(typeof dirtyPath.action === 'string' && dirtyPath.action.length > 0, `source_provenance.dirty_paths[${index}].action must be set.`);
      assert(typeof dirtyPath.proof_type === 'string' && dirtyPath.proof_type.length > 0, `source_provenance.dirty_paths[${index}].proof_type must be set.`);
      assert(dirtyPath.owner_decision_required === true, `source_provenance.dirty_paths[${index}].owner_decision_required must be true.`);
      assert(
        typeof dirtyPath.proof_boundary === 'string'
          && /Raw source-provenance classification|does not.*commit|clear provenance|deploy|grant approval/i.test(dirtyPath.proof_boundary),
        `source_provenance.dirty_paths[${index}].proof_boundary must preserve the raw no-mutation boundary.`,
      );
      assert(
        typeof dirtyPath.stop_gate === 'string'
          && /without explicit owner intent|classification evidence only|not source-provenance clearance|production approval/i.test(dirtyPath.stop_gate),
        `source_provenance.dirty_paths[${index}].stop_gate must preserve the owner-intent and no-approval boundary.`,
      );
      if (dirtyPath.old_path) {
        assert(dirtyPath.proof_type === 'source_rename_decision', `source_provenance.dirty_paths[${index}] must classify rename/move rows as source_rename_decision.`);
        assert(/staged rename or move|does not rename|does not.*commit|clear provenance|grant approval/i.test(dirtyPath.proof_boundary), `source_provenance.dirty_paths[${index}] proof_boundary must preserve rename/move raw classification semantics.`);
      } else if (!dirtyPath.tracked && dirtyPath.ignored_by_rule) {
        assert(dirtyPath.proof_type === 'ignored_local_artifact_decision', `source_provenance.dirty_paths[${index}] must classify ignored local artifacts.`);
      } else if (!dirtyPath.tracked) {
        assert(dirtyPath.proof_type === 'untracked_source_decision', `source_provenance.dirty_paths[${index}] must classify untracked non-ignored paths.`);
      } else if (dirtyPath.staging_state === 'staged_only') {
        assert(dirtyPath.proof_type === 'staged_source_decision', `source_provenance.dirty_paths[${index}] must classify staged source changes.`);
      } else if (dirtyPath.staging_state === 'unstaged_only') {
        assert(dirtyPath.proof_type === 'unstaged_source_decision', `source_provenance.dirty_paths[${index}] must classify unstaged source changes.`);
      } else if (dirtyPath.staging_state === 'staged_and_unstaged') {
        assert(dirtyPath.proof_type === 'split_index_worktree_decision', `source_provenance.dirty_paths[${index}] must classify split index/worktree changes.`);
      }
    }
    if (manifest.source_provenance.dirty_paths.length > 0) {
      assert(manifest.source_provenance.evidence.includes('staging_state='), 'Manifest source provenance evidence must include staging_state classification for dirty paths.');
      assert(manifest.source_provenance.evidence.includes('index_status='), 'Manifest source provenance evidence must include index_status classification for dirty paths.');
      assert(manifest.source_provenance.evidence.includes('worktree_status='), 'Manifest source provenance evidence must include worktree_status classification for dirty paths.');
    }
    assert(typeof manifest.source_provenance?.isolation_ledger?.evidence === 'string', 'Manifest source_provenance.isolation_ledger.evidence must be set.');
    assert(manifest.source_provenance.isolation_ledger.evidence.includes('Source provenance isolation ledger'), 'Manifest source provenance isolation ledger evidence must include a ledger marker.');
    assert(manifest.source_provenance.isolation_ledger.proof_type === 'source_provenance_isolation_ledger', 'Manifest source provenance isolation ledger must classify proof_type as source_provenance_isolation_ledger.');
    assert(typeof manifest.source_provenance.isolation_ledger.status === 'string' && manifest.source_provenance.isolation_ledger.status.length > 0, 'Manifest source_provenance.isolation_ledger.status must be set.');
    assert(Number.isInteger(manifest.source_provenance.isolation_ledger.dirty_path_count), 'Manifest source_provenance.isolation_ledger.dirty_path_count must be an integer.');
    assert(Number.isInteger(manifest.source_provenance.isolation_ledger.release_blocking_path_count), 'Manifest source_provenance.isolation_ledger.release_blocking_path_count must be an integer.');
    assert(Number.isInteger(manifest.source_provenance.isolation_ledger.owner_decision_count), 'Manifest source_provenance.isolation_ledger.owner_decision_count must be an integer.');
    assert(Number.isInteger(manifest.source_provenance.isolation_ledger.rename_or_move_count), 'Manifest source_provenance.isolation_ledger.rename_or_move_count must be an integer.');
    assert(Number.isInteger(manifest.source_provenance.isolation_ledger.staged_only_count), 'Manifest source_provenance.isolation_ledger.staged_only_count must be an integer.');
    assert(Number.isInteger(manifest.source_provenance.isolation_ledger.unstaged_only_count), 'Manifest source_provenance.isolation_ledger.unstaged_only_count must be an integer.');
    assert(Number.isInteger(manifest.source_provenance.isolation_ledger.staged_and_unstaged_count), 'Manifest source_provenance.isolation_ledger.staged_and_unstaged_count must be an integer.');
    assert(Number.isInteger(manifest.source_provenance.isolation_ledger.untracked_count), 'Manifest source_provenance.isolation_ledger.untracked_count must be an integer.');
    assert(Number.isInteger(manifest.source_provenance.isolation_ledger.ignored_local_count), 'Manifest source_provenance.isolation_ledger.ignored_local_count must be an integer.');
    assert(Array.isArray(manifest.source_provenance.isolation_ledger.rows), 'Manifest source_provenance.isolation_ledger.rows must be a list.');
    assert(
      manifest.source_provenance.isolation_ledger.dirty_path_count === manifest.source_provenance.dirty_path_count,
      'Source provenance isolation ledger dirty_path_count must match source_provenance.dirty_path_count.',
    );
    assert(
      manifest.source_provenance.isolation_ledger.rows.length === manifest.source_provenance.dirty_paths.length,
      'Source provenance isolation ledger rows must match the emitted dirty_paths list.',
    );
    assert(typeof manifest.source_provenance.isolation_ledger.proof_boundary === 'string' && /dirty-source release impact only|does not mutate source|clear provenance|run release-readiness|deploy|grant production approval/i.test(manifest.source_provenance.isolation_ledger.proof_boundary), 'Source provenance isolation ledger proof_boundary must preserve classification-only semantics.');
    assert(typeof manifest.source_provenance.isolation_ledger.stop_gate === 'string' && /Do not request deploy approval|release-readiness|clean source provenance/i.test(manifest.source_provenance.isolation_ledger.stop_gate), 'Source provenance isolation ledger stop_gate must block deploy approval until clean provenance.');
    for (const [index, item] of (manifest.source_provenance.isolation_ledger.rows ?? []).entries()) {
      assert(Number.isInteger(item.rank), `source_provenance.isolation_ledger.rows[${index}].rank must be an integer.`);
      assert(typeof item.file_path === 'string' && item.file_path.length > 0, `source_provenance.isolation_ledger.rows[${index}].file_path must be set.`);
      assert(item.old_path === null || typeof item.old_path === 'string', `source_provenance.isolation_ledger.rows[${index}].old_path must be string or null.`);
      assert(typeof item.source_status === 'string' && item.source_status.length > 0, `source_provenance.isolation_ledger.rows[${index}].source_status must be set.`);
      assert(typeof item.staging_state === 'string' && item.staging_state.length > 0, `source_provenance.isolation_ledger.rows[${index}].staging_state must be set.`);
      assert(typeof item.index_status === 'string' && item.index_status.length > 0, `source_provenance.isolation_ledger.rows[${index}].index_status must be set.`);
      assert(typeof item.worktree_status === 'string' && item.worktree_status.length > 0, `source_provenance.isolation_ledger.rows[${index}].worktree_status must be set.`);
      assert(isBoolean(item.tracked), `source_provenance.isolation_ledger.rows[${index}].tracked must be boolean.`);
      assert(isBoolean(item.ignored_by_rule), `source_provenance.isolation_ledger.rows[${index}].ignored_by_rule must be boolean.`);
      assert(typeof item.release_impact === 'string' && /blocks clean source provenance|does not enter source by default|blocks release provenance/i.test(item.release_impact), `source_provenance.isolation_ledger.rows[${index}].release_impact must describe release impact.`);
      assert(item.isolation_status === 'owner_decision_required', `source_provenance.isolation_ledger.rows[${index}].isolation_status must require owner decision.`);
      assert(typeof item.proof_command === 'string' && item.proof_command.includes('git status --porcelain=v1') && item.proof_command.includes('report:production-approval-packet'), `source_provenance.isolation_ledger.rows[${index}].proof_command must include git status and production approval packet.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `source_provenance.isolation_ledger.rows[${index}].proof_type must be set.`);
      assert(typeof item.proof_boundary === 'string' && /release-impact classification only|does not clear source provenance|release-readiness/i.test(item.proof_boundary), `source_provenance.isolation_ledger.rows[${index}].proof_boundary must preserve isolation-only semantics.`);
      assert(typeof item.stop_gate === 'string' && /Do not.*without explicit owner intent|clean-source|release-readiness|production approval/i.test(item.stop_gate), `source_provenance.isolation_ledger.rows[${index}].stop_gate must preserve owner-intent and no-approval boundaries.`);
      assert(item.blocks_release_source_gate === true, `source_provenance.isolation_ledger.rows[${index}].blocks_release_source_gate must be true for dirty paths.`);
      if (item.old_path) {
        assert(item.proof_type === 'source_rename_decision', `source_provenance.isolation_ledger.rows[${index}] must classify rename/move rows as source_rename_decision.`);
        assert(/staged rename or move|owner decides/i.test(item.release_impact), `source_provenance.isolation_ledger.rows[${index}].release_impact must identify staged rename/move owner decision.`);
      }
    }
    assert(typeof manifest.source_provenance?.resolution_queue?.evidence === 'string', 'Manifest source_provenance.resolution_queue.evidence must be set.');
    assert(manifest.source_provenance.resolution_queue.evidence.includes('Source provenance resolution queue'), 'Manifest source provenance resolution queue evidence must include a queue marker.');
    assert(Number.isInteger(manifest.source_provenance.resolution_queue.dirty_path_count), 'Manifest source_provenance.resolution_queue.dirty_path_count must be an integer.');
    assert(Number.isInteger(manifest.source_provenance.resolution_queue.item_count), 'Manifest source_provenance.resolution_queue.item_count must be an integer.');
    assert(Number.isInteger(manifest.source_provenance.resolution_queue.blocked_count), 'Manifest source_provenance.resolution_queue.blocked_count must be an integer.');
    assert(Array.isArray(manifest.source_provenance.resolution_queue.items), 'Manifest source_provenance.resolution_queue.items must be a list.');
    assert(
      manifest.source_provenance.resolution_queue.item_count === manifest.source_provenance.resolution_queue.items.length,
      'Source provenance resolution queue item_count must match items length.',
    );
    assert(
      manifest.source_provenance.resolution_queue.dirty_path_count === manifest.source_provenance.dirty_path_count,
      'Source provenance resolution queue dirty_path_count must match source_provenance.dirty_path_count.',
    );
    for (const [index, item] of (manifest.source_provenance.resolution_queue.items ?? []).entries()) {
      assert(Number.isInteger(item.rank), `source_provenance.resolution_queue.items[${index}].rank must be an integer.`);
      assert(typeof item.file_path === 'string' && item.file_path.length > 0, `source_provenance.resolution_queue.items[${index}].file_path must be set.`);
      assert(item.old_path === null || typeof item.old_path === 'string', `source_provenance.resolution_queue.items[${index}].old_path must be string or null.`);
      assert(typeof item.source_status === 'string' && item.source_status.length > 0, `source_provenance.resolution_queue.items[${index}].source_status must be set.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `source_provenance.resolution_queue.items[${index}].status must be set.`);
      assert(typeof item.index_status === 'string' && item.index_status.length > 0, `source_provenance.resolution_queue.items[${index}].index_status must be set.`);
      assert(typeof item.worktree_status === 'string' && item.worktree_status.length > 0, `source_provenance.resolution_queue.items[${index}].worktree_status must be set.`);
      assert(typeof item.staging_state === 'string' && item.staging_state.length > 0, `source_provenance.resolution_queue.items[${index}].staging_state must be set.`);
      assert(isBoolean(item.tracked), `source_provenance.resolution_queue.items[${index}].tracked must be boolean.`);
      assert(isBoolean(item.ignored_by_rule), `source_provenance.resolution_queue.items[${index}].ignored_by_rule must be boolean.`);
      assert(typeof item.decision_required === 'string' && /decide|confirm/i.test(item.decision_required), `source_provenance.resolution_queue.items[${index}].decision_required must describe the owner decision.`);
      assert(typeof item.proof_command === 'string' && item.proof_command.includes('report:production-approval-packet'), `source_provenance.resolution_queue.items[${index}].proof_command must point to the production approval packet.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `source_provenance.resolution_queue.items[${index}].proof_type must be set.`);
      assert(item.owner_decision_required === true, `source_provenance.resolution_queue.items[${index}].owner_decision_required must be true.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `source_provenance.resolution_queue.items[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && /without explicit owner intent/i.test(item.stop_gate), `source_provenance.resolution_queue.items[${index}].stop_gate must preserve owner-intent boundary.`);
      assert(item.status !== 'pass', `source_provenance.resolution_queue.items[${index}].status must remain blocked until owner resolution clears the path.`);
      if (item.old_path) {
        assert(item.proof_type === 'source_rename_decision', `source_provenance.resolution_queue.items[${index}] must classify rename/move rows as source_rename_decision.`);
        assert(/staged rename or move|does not rename|does not.*commit|clear provenance|grant approval/i.test(item.proof_boundary), `source_provenance.resolution_queue.items[${index}] proof_boundary must preserve rename/move owner-decision semantics.`);
      } else if (!item.tracked && item.ignored_by_rule) {
        assert(item.proof_type === 'ignored_local_artifact_decision', `source_provenance.resolution_queue.items[${index}] must classify ignored local artifacts.`);
        assert(/ignored local artifact|does not delete|grant approval/i.test(item.proof_boundary), `source_provenance.resolution_queue.items[${index}] proof_boundary must preserve ignored-artifact owner-decision semantics.`);
      } else if (!item.tracked) {
        assert(item.proof_type === 'untracked_source_decision', `source_provenance.resolution_queue.items[${index}] must classify untracked non-ignored paths.`);
        assert(/untracked path|does not add|clear provenance|grant approval/i.test(item.proof_boundary), `source_provenance.resolution_queue.items[${index}] proof_boundary must preserve untracked-path owner-decision semantics.`);
      } else if (item.staging_state === 'staged_only') {
        assert(item.proof_type === 'staged_source_decision', `source_provenance.resolution_queue.items[${index}] must classify staged source changes.`);
        assert(/staged source change|does not commit|clear provenance|grant approval/i.test(item.proof_boundary), `source_provenance.resolution_queue.items[${index}] proof_boundary must preserve staged owner-decision semantics.`);
      } else if (item.staging_state === 'unstaged_only') {
        assert(item.proof_type === 'unstaged_source_decision', `source_provenance.resolution_queue.items[${index}] must classify unstaged source changes.`);
        assert(/unstaged source change|does not commit|clear provenance|grant approval/i.test(item.proof_boundary), `source_provenance.resolution_queue.items[${index}] proof_boundary must preserve unstaged owner-decision semantics.`);
      } else if (item.staging_state === 'staged_and_unstaged') {
        assert(item.proof_type === 'split_index_worktree_decision', `source_provenance.resolution_queue.items[${index}] must classify split index/worktree changes.`);
        assert(/separate owner decisions|index and worktree|grant approval/i.test(item.proof_boundary), `source_provenance.resolution_queue.items[${index}] proof_boundary must preserve split index/worktree semantics.`);
      }
    }
    assert(hasOpenGap(manifest, 'P1', 'Release toolchain'), 'Manifest must keep the open P1 release toolchain and approval proof gap.');
    assert(typeof manifest.release_preflight?.evidence === 'string', 'Manifest must include release_preflight.evidence.');
    assert(manifest.release_preflight.evidence.includes('Release toolchain and approval deficit ledger'), 'Manifest release preflight evidence must include a ledger marker.');
    assert(typeof manifest.release_preflight?.package_manager === 'string' && manifest.release_preflight.package_manager.length > 0, 'Manifest release_preflight.package_manager must be set.');
    assert(typeof manifest.release_preflight?.expected_pnpm_version === 'string' && manifest.release_preflight.expected_pnpm_version.length > 0, 'Manifest release_preflight.expected_pnpm_version must be set.');
    assert(typeof manifest.release_preflight?.corepack_probe === 'string' && manifest.release_preflight.corepack_probe.length > 0, 'Manifest release_preflight.corepack_probe must be set.');
    assert(typeof manifest.release_preflight?.git_lfs_probe === 'string' && manifest.release_preflight.git_lfs_probe.length > 0, 'Manifest release_preflight.git_lfs_probe must be set.');
    assert(typeof manifest.release_preflight?.toolchain_probe_ledger?.evidence === 'string', 'Manifest release_preflight.toolchain_probe_ledger.evidence must be set.');
    assert(manifest.release_preflight.toolchain_probe_ledger.evidence.includes('Release toolchain probe ledger'), 'Manifest release toolchain probe ledger evidence must include a ledger marker.');
    assert(hasIntegerOrNull(manifest.release_preflight.toolchain_probe_ledger?.open_count), 'Manifest release_preflight.toolchain_probe_ledger.open_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.release_preflight.toolchain_probe_ledger?.item_count), 'Manifest release_preflight.toolchain_probe_ledger.item_count must be an integer or null.');
    assert(Array.isArray(manifest.release_preflight.toolchain_probe_ledger?.items), 'Manifest release_preflight.toolchain_probe_ledger.items must be a list.');
    assert(
      manifest.release_preflight.toolchain_probe_ledger.item_count === manifest.release_preflight.toolchain_probe_ledger.items.length,
      'Release toolchain probe ledger item_count must match items length.',
    );
    assert(
      manifest.release_preflight.toolchain_probe_ledger.items.map((item) => item.id).join(',') === 'corepack_pnpm_resolver,git_lfs_push_path',
      'Release toolchain probe ledger must include Corepack and Git LFS probe rows in order.',
    );
    const toolchainProbeProofTypesById = {
      corepack_pnpm_resolver: 'corepack_pnpm_toolchain_probe',
      git_lfs_push_path: 'git_lfs_push_path_probe',
    };
    for (const [index, item] of (manifest.release_preflight.toolchain_probe_ledger.items ?? []).entries()) {
      assert(typeof item.id === 'string' && item.id.length > 0, `release_preflight.toolchain_probe_ledger.items[${index}].id must be set.`);
      assert(typeof item.label === 'string' && item.label.length > 0, `release_preflight.toolchain_probe_ledger.items[${index}].label must be set.`);
      assert(typeof item.command === 'string' && item.command.length > 0, `release_preflight.toolchain_probe_ledger.items[${index}].command must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `release_preflight.toolchain_probe_ledger.items[${index}].current must be set.`);
      assert(typeof item.expected === 'string' && item.expected.length > 0, `release_preflight.toolchain_probe_ledger.items[${index}].expected must be set.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `release_preflight.toolchain_probe_ledger.items[${index}].status must be set.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `release_preflight.toolchain_probe_ledger.items[${index}].proof_type must be set.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `release_preflight.toolchain_probe_ledger.items[${index}].proof_boundary must be set.`);
      assert(typeof item.evidence_boundary === 'string' && /does not/i.test(item.evidence_boundary), `release_preflight.toolchain_probe_ledger.items[${index}].evidence_boundary must preserve a proof limitation.`);
      assert(typeof item.stop_gate === 'string' && /do not/i.test(item.stop_gate), `release_preflight.toolchain_probe_ledger.items[${index}].stop_gate must preserve an explicit stop gate.`);
      assert(typeof item.next_action === 'string' && item.next_action.length > 0, `release_preflight.toolchain_probe_ledger.items[${index}].next_action must be set.`);
      if (toolchainProbeProofTypesById[item.id]) {
        assert(
          item.proof_type === toolchainProbeProofTypesById[item.id],
          `release_preflight.toolchain_probe_ledger.items[${index}] must classify ${item.id} as ${toolchainProbeProofTypesById[item.id]}.`,
        );
      }
      if (item.id === 'corepack_pnpm_resolver') {
        assert(item.command === 'corepack pnpm --version', 'Corepack probe command must remain corepack pnpm --version.');
        assert(/Corepack pnpm resolver probe|release-shell evidence only|does not install tools|run release-readiness|push|deploy|production approval/i.test(item.proof_boundary), 'Corepack probe proof_boundary must not imply tool install, release-readiness, push, deploy, or approval.');
        assert(/bare pnpm|local shims|skipped probes|Corepack-pinned release evidence/i.test(item.stop_gate), 'Corepack probe stop_gate must reject bare pnpm, local shims, and skipped probes as release evidence.');
      }
      if (item.id === 'git_lfs_push_path') {
        assert(item.command === 'git lfs version', 'Git LFS probe command must remain git lfs version.');
        assert(/Git LFS push-path probe|release-shell evidence only|does not install Git LFS|push|deploy|production approval/i.test(item.proof_boundary), 'Git LFS probe proof_boundary must not imply install, push, deploy, or approval.');
        assert(/commit hook warnings|previous pushes|skipped probes|missing git-lfs binary|push-path proof/i.test(item.stop_gate), 'Git LFS probe stop_gate must reject hook warnings, old pushes, skipped probes, and missing binaries as push-path proof.');
      }
    }
    assert(hasIntegerOrNull(manifest.release_preflight?.open_count), 'Manifest release_preflight.open_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.release_preflight?.total_count), 'Manifest release_preflight.total_count must be an integer or null.');
    assert(Array.isArray(manifest.release_preflight?.items), 'Manifest release_preflight.items must be a list.');
    const releaseProofTypesByRequirement = {
      'Pinned package manager': 'package_manager_pin',
      'Corepack pnpm resolver': 'toolchain_probe',
      'Release-readiness execution': 'gated_release_command',
      'Git LFS push-path proof': 'toolchain_probe',
      'Clean source provenance': 'source_provenance_decision',
      'Explicit owner production approval': 'manual_approval',
    };
    for (const [index, item] of (manifest.release_preflight.items ?? []).entries()) {
      assert(typeof item.requirement === 'string' && item.requirement.length > 0, `release_preflight.items[${index}].requirement must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `release_preflight.items[${index}].current must be set.`);
      assert(typeof item.needed === 'string' && item.needed.length > 0, `release_preflight.items[${index}].needed must be set.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `release_preflight.items[${index}].status must be set.`);
      assert(typeof item.next_action === 'string' && item.next_action.length > 0, `release_preflight.items[${index}].next_action must be set.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `release_preflight.items[${index}].proof_type must be set.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `release_preflight.items[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && item.stop_gate.length > 0, `release_preflight.items[${index}].stop_gate must be set.`);
      if (releaseProofTypesByRequirement[item.requirement]) {
        assert(
          item.proof_type === releaseProofTypesByRequirement[item.requirement],
          `release_preflight.items[${index}] must classify ${item.requirement} as ${releaseProofTypesByRequirement[item.requirement]}.`,
        );
      }
      if (item.requirement === 'Pinned package manager') {
        assert(/package\.json declares|does not prove Corepack resolution|release-readiness execution|Git LFS push-path availability|production approval/i.test(item.proof_boundary), 'Pinned package manager proof_boundary must not imply toolchain, release-readiness, push-path, or approval proof.');
        assert(/pin alone|Corepack resolution|release-readiness|push-path proof|deploy readiness|production approval/i.test(item.stop_gate), 'Pinned package manager stop_gate must reject pin-only release evidence.');
      }
      if (['Corepack pnpm resolver', 'Git LFS push-path proof'].includes(item.requirement)) {
        assert(/does not install|does not.*push|does not.*deploy|grant approval/i.test(item.proof_boundary), `release_preflight.items[${index}] proof_boundary must preserve the toolchain-probe limitation.`);
        assert(/Do not/i.test(item.stop_gate), `release_preflight.items[${index}] stop_gate must preserve an explicit no-claim boundary.`);
      }
      if (item.requirement === 'Release-readiness execution') {
        assert(/does not grant owner approval|push|deploy|hosted\/live parity/i.test(item.proof_boundary), 'Release-readiness deficit proof_boundary must not imply approval, deploy, or hosted/live parity.');
        assert(/source provenance is dirty|Corepack cannot resolve/i.test(item.stop_gate), 'Release-readiness deficit stop_gate must block dirty provenance or unresolved Corepack.');
      }
      if (item.requirement === 'Clean source provenance') {
        assert(/owner decision|does not commit|unstage|stash|revert|delete|rename|move|clear provenance/i.test(item.proof_boundary), 'Clean source provenance deficit proof_boundary must preserve owner-decision semantics.');
        assert(/Do not commit|unstage|stash|revert|delete|rename|move/i.test(item.stop_gate), 'Clean source provenance deficit stop_gate must prohibit source mutation without owner intent.');
      }
      if (item.requirement === 'Explicit owner production approval') {
        assert(/does not approve|push|deploy|live parity/i.test(item.proof_boundary), 'Explicit owner approval deficit proof_boundary must not imply approval, deploy, or live parity.');
        assert(/Do not run deploy-production|netlify deploy|push|claim production approval/i.test(item.stop_gate), 'Explicit owner approval deficit stop_gate must prohibit deploy, push, or approval claims.');
      }
    }
    assert(
      manifest.release_preflight.items.some((item) => item.requirement === 'Corepack pnpm resolver'),
      'Release preflight deficits must include Corepack pnpm resolver.',
    );
    assert(
      manifest.release_preflight.items.some((item) => item.requirement === 'Release-readiness execution'),
      'Release preflight deficits must include release-readiness execution.',
    );
    assert(
      manifest.release_preflight.items.some((item) => item.requirement === 'Git LFS push-path proof'),
      'Release preflight deficits must include Git LFS push-path proof.',
    );
    assert(
      manifest.release_preflight.items.some((item) => item.requirement === 'Explicit owner production approval'),
      'Release preflight deficits must include explicit owner approval.',
    );
    assert(typeof manifest.release_preflight?.clearance_matrix?.evidence === 'string', 'Manifest release_preflight.clearance_matrix.evidence must be set.');
    assert(manifest.release_preflight.clearance_matrix.evidence.includes('Release preflight clearance matrix'), 'Manifest release preflight clearance matrix evidence must include a matrix marker.');
    assert(manifest.release_preflight.clearance_matrix.proof_type === 'release_preflight_clearance_matrix', 'Manifest release preflight clearance matrix must classify proof_type as release_preflight_clearance_matrix.');
    assert(typeof manifest.release_preflight.clearance_matrix.source_deficit_status === 'string', 'Manifest release_preflight.clearance_matrix.source_deficit_status must be set.');
    assert(hasIntegerOrNull(manifest.release_preflight.clearance_matrix?.row_count), 'Manifest release_preflight.clearance_matrix.row_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.release_preflight.clearance_matrix?.blocked_count), 'Manifest release_preflight.clearance_matrix.blocked_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.release_preflight.clearance_matrix?.ready_count), 'Manifest release_preflight.clearance_matrix.ready_count must be an integer or null.');
    assert(Array.isArray(manifest.release_preflight.clearance_matrix?.rows), 'Manifest release_preflight.clearance_matrix.rows must be a list.');
    assert(
      manifest.release_preflight.clearance_matrix.row_count === manifest.release_preflight.clearance_matrix.rows.length,
      'Release preflight clearance matrix row_count must match rows length.',
    );
    assert(
      manifest.release_preflight.clearance_matrix.blocked_count === manifest.release_preflight.clearance_matrix.rows.filter((item) => item.blocks_release_gate).length,
      'Release preflight clearance matrix blocked_count must match release-blocking rows.',
    );
    assert(typeof manifest.release_preflight.clearance_matrix.proof_boundary === 'string' && /does not install tools|run release-readiness|clear source provenance|push|deploy|hosted\/live parity|grant owner approval/i.test(manifest.release_preflight.clearance_matrix.proof_boundary), 'Release preflight clearance matrix proof_boundary must preserve non-execution semantics.');
    assert(typeof manifest.release_preflight.clearance_matrix.stop_gate === 'string' && /Do not mark release approval ready|Corepack-pinned release-readiness|Git LFS push-path proof|owner approval/i.test(manifest.release_preflight.clearance_matrix.stop_gate), 'Release preflight clearance matrix stop_gate must require current release evidence before approval.');
    for (const [index, item] of (manifest.release_preflight.clearance_matrix.rows ?? []).entries()) {
      assert(Number.isInteger(item.rank), `release_preflight.clearance_matrix.rows[${index}].rank must be an integer.`);
      assert(typeof item.requirement === 'string' && item.requirement.length > 0, `release_preflight.clearance_matrix.rows[${index}].requirement must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `release_preflight.clearance_matrix.rows[${index}].current must be set.`);
      assert(typeof item.needed === 'string' && item.needed.length > 0, `release_preflight.clearance_matrix.rows[${index}].needed must be set.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `release_preflight.clearance_matrix.rows[${index}].status must be set.`);
      assert(typeof item.source_status === 'string' && item.source_status.length > 0, `release_preflight.clearance_matrix.rows[${index}].source_status must be set.`);
      assert(typeof item.owner === 'string' && item.owner.length > 0, `release_preflight.clearance_matrix.rows[${index}].owner must be set.`);
      assert(typeof item.proof_command === 'string' && item.proof_command.length > 0, `release_preflight.clearance_matrix.rows[${index}].proof_command must be set.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `release_preflight.clearance_matrix.rows[${index}].proof_type must be set.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `release_preflight.clearance_matrix.rows[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && /Do not/i.test(item.stop_gate), `release_preflight.clearance_matrix.rows[${index}].stop_gate must preserve an explicit stop gate.`);
      assert(typeof item.release_impact === 'string' && item.release_impact.length > 0, `release_preflight.clearance_matrix.rows[${index}].release_impact must be set.`);
      assert(typeof item.blocks_release_gate === 'boolean', `release_preflight.clearance_matrix.rows[${index}].blocks_release_gate must be boolean.`);
      if (releaseProofTypesByRequirement[item.requirement]) {
        assert(
          item.proof_type === releaseProofTypesByRequirement[item.requirement],
          `release_preflight.clearance_matrix.rows[${index}] must classify ${item.requirement} as ${releaseProofTypesByRequirement[item.requirement]}.`,
        );
      }
      if (['Corepack pnpm resolver', 'Git LFS push-path proof'].includes(item.requirement)) {
        assert(/does not install|does not.*push|does not.*deploy|grant approval/i.test(item.proof_boundary), `release_preflight.clearance_matrix.rows[${index}] proof_boundary must preserve toolchain-probe limitations.`);
      }
      if (item.requirement === 'Clean source provenance') {
        assert(/does not commit|clear provenance|rename|move/i.test(item.proof_boundary), 'Clean source provenance clearance row must preserve source owner-decision semantics.');
        assert(item.blocks_release_gate === (item.source_status !== 'pass'), 'Clean source provenance clearance row must block exactly while source_status is non-pass.');
      }
      if (item.requirement === 'Explicit owner production approval') {
        assert(/does not approve|push|deploy|live parity/i.test(item.proof_boundary), 'Explicit owner approval clearance row must not imply approval, deploy, or live parity.');
        assert(item.status === 'manual_stop', 'Explicit owner approval clearance row must remain manual_stop until owner approval exists.');
      }
    }
    assert(
      JSON.stringify((manifest.release_preflight.clearance_matrix.rows ?? []).map((item) => item.requirement)) === JSON.stringify((manifest.release_preflight.items ?? []).map((item) => item.requirement)),
      'Release preflight clearance matrix must include exactly the release preflight requirements in order.',
    );
    assert(
      (manifest.release_preflight.clearance_matrix.rows ?? []).some((item) => item.proof_command === 'corepack pnpm run check:release-readiness'),
      'Release preflight clearance matrix must include the release-readiness proof command.',
    );
    assert(
      (manifest.release_preflight.clearance_matrix.rows ?? []).some((item) => item.proof_command === 'corepack pnpm run check:production-deploy-request'),
      'Release preflight clearance matrix must include the production approval proof command.',
    );
    assert(
      (manifest.release_preflight.clearance_matrix.rows ?? []).some((item) => item.blocks_release_gate === true),
      'Release preflight clearance matrix must keep release-gate blockers visible while release preflight is blocked.',
    );
    assert(typeof manifest.release_preflight?.remediation_queue?.evidence === 'string', 'Manifest release_preflight.remediation_queue.evidence must be set.');
    assert(manifest.release_preflight.remediation_queue.evidence.includes('Release preflight remediation queue'), 'Manifest release preflight remediation queue evidence must include a queue marker.');
    assert(hasIntegerOrNull(manifest.release_preflight.remediation_queue?.open_count), 'Manifest release_preflight.remediation_queue.open_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.release_preflight.remediation_queue?.total_count), 'Manifest release_preflight.remediation_queue.total_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.release_preflight.remediation_queue?.item_count), 'Manifest release_preflight.remediation_queue.item_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.release_preflight.remediation_queue?.blocked_count), 'Manifest release_preflight.remediation_queue.blocked_count must be an integer or null.');
    assert(
      manifest.release_preflight.remediation_queue.open_count === manifest.release_preflight.open_count,
      'Release preflight remediation queue open_count must match release_preflight.open_count.',
    );
    assert(
      manifest.release_preflight.remediation_queue.total_count === manifest.release_preflight.total_count,
      'Release preflight remediation queue total_count must match release_preflight.total_count.',
    );
    assert(Array.isArray(manifest.release_preflight.remediation_queue.items), 'Manifest release_preflight.remediation_queue.items must be a list.');
    assert(
      manifest.release_preflight.remediation_queue.item_count === manifest.release_preflight.remediation_queue.items.length,
      'Release preflight remediation queue item_count must match items length.',
    );
    for (const [index, item] of (manifest.release_preflight.remediation_queue.items ?? []).entries()) {
      assert(Number.isInteger(item.rank), `release_preflight.remediation_queue.items[${index}].rank must be an integer.`);
      assert(typeof item.requirement === 'string' && item.requirement.length > 0, `release_preflight.remediation_queue.items[${index}].requirement must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `release_preflight.remediation_queue.items[${index}].current must be set.`);
      assert(typeof item.needed === 'string' && item.needed.length > 0, `release_preflight.remediation_queue.items[${index}].needed must be set.`);
      assert(typeof item.deficit_status === 'string' && item.deficit_status.length > 0, `release_preflight.remediation_queue.items[${index}].deficit_status must be set.`);
      assert(typeof item.owner === 'string' && item.owner.length > 0, `release_preflight.remediation_queue.items[${index}].owner must be set.`);
      assert(typeof item.action === 'string' && item.action.length > 0, `release_preflight.remediation_queue.items[${index}].action must be set.`);
      assert(typeof item.proof_command === 'string' && item.proof_command.length > 0, `release_preflight.remediation_queue.items[${index}].proof_command must be set.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `release_preflight.remediation_queue.items[${index}].proof_type must be set.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `release_preflight.remediation_queue.items[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && item.stop_gate.length > 0, `release_preflight.remediation_queue.items[${index}].stop_gate must be set.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `release_preflight.remediation_queue.items[${index}].status must be set.`);
      assert(item.status !== 'ready', `release_preflight.remediation_queue.items[${index}].status must remain non-ready until the deficit row passes.`);
      if (['Corepack pnpm resolver', 'Git LFS push-path proof'].includes(item.requirement)) {
        assert(item.proof_type === 'toolchain_probe', `release_preflight.remediation_queue.items[${index}] must mark Corepack/Git LFS rows as toolchain_probe.`);
        assert(/does not install|does not.*push|does not.*deploy|grant approval/i.test(item.proof_boundary), `release_preflight.remediation_queue.items[${index}] proof_boundary must preserve the toolchain-probe limitation.`);
      }
      if (item.requirement === 'Release-readiness execution') {
        assert(item.proof_type === 'gated_release_command', 'Release-readiness remediation row must be a gated_release_command.');
        assert(/does not grant owner approval|does not.*deploy|hosted\/live parity/i.test(item.proof_boundary), 'Release-readiness proof_boundary must not imply approval, deploy, or hosted/live parity.');
      }
      if (item.requirement === 'Clean source provenance') {
        assert(item.proof_type === 'source_provenance_decision', 'Clean source provenance remediation row must be a source_provenance_decision.');
        assert(/does not commit|clear provenance/i.test(item.proof_boundary), 'Clean source provenance proof_boundary must preserve owner-decision semantics.');
      }
      if (item.requirement === 'Explicit owner production approval') {
        assert(item.proof_type === 'manual_approval', 'Explicit owner production approval remediation row must be manual_approval.');
        assert(/does not approve|does not.*deploy|live parity/i.test(item.proof_boundary), 'Explicit owner approval proof_boundary must not imply approval, deploy, or live parity.');
      }
    }
    const releaseQueueRequirements = (manifest.release_preflight.remediation_queue.items ?? []).map((item) => item.requirement);
    const nonPassReleaseRequirements = (manifest.release_preflight.items ?? [])
      .filter((item) => item.status !== 'pass')
      .map((item) => item.requirement);
    assert(
      JSON.stringify(releaseQueueRequirements) === JSON.stringify(nonPassReleaseRequirements),
      'Release preflight remediation queue must include exactly the current non-pass release preflight requirements.',
    );
    if (releaseQueueRequirements.includes('Corepack pnpm resolver')) {
      assert(
        manifest.release_preflight.remediation_queue.items.some((item) => item.proof_command === 'corepack pnpm --version'),
        'Release preflight remediation queue must include the Corepack proof command when Corepack is unresolved.',
      );
    }
    if (releaseQueueRequirements.includes('Git LFS push-path proof')) {
      assert(
        manifest.release_preflight.remediation_queue.items.some((item) => item.proof_command === 'git lfs version'),
        'Release preflight remediation queue must include the Git LFS proof command when Git LFS proof is unresolved.',
      );
    }
    assert(
      manifest.release_preflight.remediation_queue.items.some((item) => item.stop_gate.includes('Do not')),
      'Release preflight remediation queue must preserve explicit stop gates.',
    );
    assert(typeof manifest.launch_action_queue?.evidence === 'string', 'Manifest launch_action_queue.evidence must be set.');
    assert(manifest.launch_action_queue.evidence.includes('Launch blocker action queue'), 'Manifest launch action queue evidence must include a queue marker.');
    assert(hasIntegerOrNull(manifest.launch_action_queue?.item_count), 'Manifest launch_action_queue.item_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.launch_action_queue?.blocked_count), 'Manifest launch_action_queue.blocked_count must be an integer or null.');
    assert(Array.isArray(manifest.launch_action_queue?.items), 'Manifest launch_action_queue.items must be a list.');
    assert((manifest.launch_action_queue.items ?? []).length >= 8, 'Manifest launch action queue must include the launch blocker execution phases, including launch evidence validation.');
    const launchProofTypesByPhase = {
      source_provenance: 'source_provenance_decision',
      launch_evidence_validation: 'manifest_validation_and_approval_packet',
      release_toolchain: 'release_toolchain_and_gated_release',
      branch_review: 'read_only_branch_review',
      supabase_advisor: 'external_account_evidence',
      buyer_evidence: 'retained_buyer_evidence_validation',
      production_approval: 'manual_approval_gate',
      post_deploy_live_proof: 'post_deploy_live_proof_gate',
    };
    for (const [index, item] of (manifest.launch_action_queue.items ?? []).entries()) {
      assert(Number.isInteger(item.rank), `launch_action_queue.items[${index}].rank must be an integer.`);
      assert(typeof item.phase === 'string' && item.phase.length > 0, `launch_action_queue.items[${index}].phase must be set.`);
      assert(typeof item.blocker === 'string' && item.blocker.length > 0, `launch_action_queue.items[${index}].blocker must be set.`);
      assert(typeof item.owner === 'string' && item.owner.length > 0, `launch_action_queue.items[${index}].owner must be set.`);
      assert(typeof item.action === 'string' && item.action.length > 0, `launch_action_queue.items[${index}].action must be set.`);
      assert(typeof item.proof_command === 'string' && item.proof_command.length > 0, `launch_action_queue.items[${index}].proof_command must be set.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `launch_action_queue.items[${index}].proof_type must be set.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `launch_action_queue.items[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && /do not|no /i.test(item.stop_gate), `launch_action_queue.items[${index}].stop_gate must preserve an explicit stop gate.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `launch_action_queue.items[${index}].status must be set.`);
      if (launchProofTypesByPhase[item.phase]) {
        assert(
          item.proof_type === launchProofTypesByPhase[item.phase],
          `launch_action_queue.items[${index}] must classify ${item.phase} as ${launchProofTypesByPhase[item.phase]}.`,
        );
      }
      if (item.phase === 'source_provenance') {
        assert(/does not commit|clear provenance|deploy|grant approval/i.test(item.proof_boundary), 'Source provenance launch action proof_boundary must preserve owner-decision semantics.');
      }
      if (item.phase === 'launch_evidence_validation') {
        assert(/structure and readiness reporting only|does not grant production approval|create buyer acceptance|hosted\/live parity/i.test(item.proof_boundary), 'Launch evidence validation action proof_boundary must not imply approval, buyer acceptance, or live parity.');
      }
      if (item.phase === 'release_toolchain') {
        assert(/local release-shell checks|does not grant owner approval|push|deploy|hosted\/live parity/i.test(item.proof_boundary), 'Release toolchain action proof_boundary must not imply approval, push, deploy, or live parity.');
      }
      if (item.phase === 'branch_review') {
        assert(/read-only|does not checkout|merge|push|discard|migrate|deploy/i.test(item.proof_boundary), 'Branch review launch action proof_boundary must preserve read-only no-mutation semantics.');
      }
      if (item.phase === 'supabase_advisor') {
        assert(/authorized Supabase dashboard or connector|permission-denied output do not satisfy/i.test(item.proof_boundary), 'Supabase advisor launch action proof_boundary must require authorized external advisor evidence.');
      }
      if (item.phase === 'buyer_evidence') {
        assert(/real anonymized accepted buyer rows|retained redacted artifacts|validate:pilot-evidence --require-95/i.test(item.proof_boundary), 'Buyer evidence launch action proof_boundary must require retained accepted buyer evidence.');
      }
      if (item.phase === 'production_approval') {
        assert(/does not approve|push|deploy|prove live parity/i.test(item.proof_boundary), 'Production approval launch action proof_boundary must not imply approval, deploy, or live parity.');
      }
      if (item.phase === 'post_deploy_live_proof') {
        assert(/after explicit approval and guarded deploy completion|does not deploy|create hosted\/live parity evidence/i.test(item.proof_boundary), 'Post-deploy live proof launch action proof_boundary must require approved deploy completion before live proof.');
      }
    }
    for (const phase of ['source_provenance', 'launch_evidence_validation', 'release_toolchain', 'branch_review', 'supabase_advisor', 'buyer_evidence', 'production_approval', 'post_deploy_live_proof']) {
      assert(
        manifest.launch_action_queue.items.some((item) => item.phase === phase),
        `Manifest launch action queue must include phase: ${phase}.`,
      );
    }
    const launchEvidenceActionItem = manifest.launch_action_queue.items.find((item) => item.phase === 'launch_evidence_validation');
    assert(launchEvidenceActionItem, 'Launch action queue must include launch_evidence_validation.');
    assert(launchEvidenceActionItem.proof_command.includes('check:launch-evidence-manifest') && launchEvidenceActionItem.proof_command.includes('report:production-approval-packet'), 'Launch evidence validation action must run the manifest check before the production approval packet.');
    assert(/do not.*production approval.*buyer acceptance.*current hosted\/live parity/i.test(launchEvidenceActionItem.stop_gate), 'Launch evidence validation action must preserve the no-approval, no-buyer-proof, and no-live-parity boundary.');
    const buyerActionItem = manifest.launch_action_queue.items.find((item) => item.phase === 'buyer_evidence');
    if (Number.isInteger(manifest.buyer_evidence?.hard_gate_deficits?.open_count) && manifest.buyer_evidence.hard_gate_deficits.open_count > 0) {
      assert(manifest.buyer_evidence.hard_gate_deficits.status !== 'pass', 'Buyer hard-gate deficits status must not pass while open deficits remain.');
      assert(buyerActionItem?.status !== 'ready', 'Buyer evidence launch action must not be ready while hard-gate deficits remain.');
    }
    const releaseActionItem = manifest.launch_action_queue.items.find((item) => item.phase === 'release_toolchain');
    assert(releaseActionItem, 'Launch action queue must include a release_toolchain phase.');
    assert(/release-toolchain probe/i.test(releaseActionItem.blocker), 'Release toolchain launch action must summarize toolchain probe ledger state.');
    assert(releaseActionItem.proof_command.includes('report:launch-evidence-manifest') && releaseActionItem.proof_command.includes('check:release-readiness'), 'Release toolchain launch action must refresh the launch evidence manifest before release-readiness.');
    assert(/probe ledger/i.test(releaseActionItem.stop_gate), 'Release toolchain launch action must say the probe ledger is not approval evidence.');
    assert(
      manifest.launch_action_queue.items.some((item) => item.proof_command.includes('check:post-deploy-live')),
      'Manifest launch action queue must include post-deploy live proof command.',
    );
    assert(
      manifest.launch_action_queue.items.some((item) => /no checkout|no .*merge|no .*push|no .*deploy/i.test(item.stop_gate)),
      'Manifest launch action queue must preserve branch/deploy no-mutation stop gates.',
    );
    assert(typeof manifest.production_approval?.evidence === 'string', 'Manifest production_approval.evidence must be set.');
    assert(manifest.production_approval.evidence.includes('Production approval prerequisite queue'), 'Manifest production approval evidence must include a queue marker.');
    assert(manifest.production_approval.explicit_owner_approval === false, 'Manifest must not imply explicit owner production approval is granted.');
    assert(typeof manifest.production_approval?.stop_gate === 'string' && /does not grant production approval|require explicit owner approval/i.test(manifest.production_approval.stop_gate), 'Manifest production approval stop gate must preserve the owner-approval boundary.');
    assert(typeof manifest.production_approval?.prerequisite_queue?.evidence === 'string', 'Manifest production_approval.prerequisite_queue.evidence must be set.');
    assert(manifest.production_approval.prerequisite_queue.evidence.includes('Production approval prerequisite queue'), 'Manifest production approval prerequisite queue evidence must include a queue marker.');
    assert(hasIntegerOrNull(manifest.production_approval.prerequisite_queue?.item_count), 'Manifest production approval prerequisite item_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.production_approval.prerequisite_queue?.blocked_count), 'Manifest production approval prerequisite blocked_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.production_approval.prerequisite_queue?.manual_stop_count), 'Manifest production approval prerequisite manual_stop_count must be an integer or null.');
    assert(Array.isArray(manifest.production_approval.prerequisite_queue?.items), 'Manifest production approval prerequisite items must be a list.');
    assert((manifest.production_approval.prerequisite_queue.items ?? []).length >= 8, 'Manifest production approval prerequisite queue must include launch evidence validation plus all prerequisite, manual-stop, and post-deploy rows.');
    assert(
      manifest.production_approval.prerequisite_queue.item_count === manifest.production_approval.prerequisite_queue.items.length,
      'Production approval prerequisite item_count must match items length.',
    );
    const productionProofTypesByPrerequisite = {
      'Clean source provenance': 'source_provenance_decision',
      'Launch evidence validation': 'manifest_validation',
      'Corepack release-readiness': 'gated_release_command',
      'Canonical branch review': 'read_only_branch_review',
      'Supabase advisor clearance': 'external_account_evidence',
      'Buyer evidence hard gate': 'retained_buyer_evidence_validation',
      'Explicit owner production approval': 'manual_approval',
      'Post-deploy live proof boundary': 'post_deploy_live_proof_gate',
    };
    for (const [index, item] of (manifest.production_approval.prerequisite_queue.items ?? []).entries()) {
      assert(Number.isInteger(item.rank), `production_approval.prerequisite_queue.items[${index}].rank must be an integer.`);
      assert(typeof item.prerequisite === 'string' && item.prerequisite.length > 0, `production_approval.prerequisite_queue.items[${index}].prerequisite must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `production_approval.prerequisite_queue.items[${index}].current must be set.`);
      assert(typeof item.needed === 'string' && item.needed.length > 0, `production_approval.prerequisite_queue.items[${index}].needed must be set.`);
      assert(typeof item.owner === 'string' && item.owner.length > 0, `production_approval.prerequisite_queue.items[${index}].owner must be set.`);
      assert(typeof item.proof_command === 'string' && item.proof_command.length > 0, `production_approval.prerequisite_queue.items[${index}].proof_command must be set.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `production_approval.prerequisite_queue.items[${index}].proof_type must be set.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `production_approval.prerequisite_queue.items[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && /do not|no /i.test(item.stop_gate), `production_approval.prerequisite_queue.items[${index}].stop_gate must preserve an explicit stop gate.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `production_approval.prerequisite_queue.items[${index}].status must be set.`);
      if (productionProofTypesByPrerequisite[item.prerequisite]) {
        assert(
          item.proof_type === productionProofTypesByPrerequisite[item.prerequisite],
          `production_approval.prerequisite_queue.items[${index}] must classify ${item.prerequisite} as ${productionProofTypesByPrerequisite[item.prerequisite]}.`,
        );
      }
      if (item.prerequisite === 'Clean source provenance') {
        assert(/does not commit|clear provenance|grant owner approval/i.test(item.proof_boundary), 'Clean source provenance proof_boundary must preserve owner-decision semantics.');
      }
      if (item.prerequisite === 'Launch evidence validation') {
        assert(/structure only|does not grant production approval|create buyer acceptance|hosted\/live parity/i.test(item.proof_boundary), 'Launch evidence validation proof_boundary must not imply approval, buyer acceptance, or live parity.');
      }
      if (item.prerequisite === 'Corepack release-readiness') {
        assert(/does not grant owner approval|deploy|push|hosted\/live parity/i.test(item.proof_boundary), 'Corepack release-readiness proof_boundary must not imply approval, deploy, push, or live parity.');
      }
      if (item.prerequisite === 'Canonical branch review') {
        assert(/read-only|does not checkout|merge|push|discard|migrate|deploy/i.test(item.proof_boundary), 'Canonical branch review proof_boundary must preserve read-only no-mutation semantics.');
      }
      if (item.prerequisite === 'Supabase advisor clearance') {
        assert(/authorized Supabase dashboard or connector|permission-denied connector output do not satisfy/i.test(item.proof_boundary), 'Supabase advisor clearance proof_boundary must require authorized external advisor evidence.');
      }
      if (item.prerequisite === 'Buyer evidence hard gate') {
        assert(/real anonymized accepted buyer rows|retained redacted artifacts|validate:pilot-evidence --require-95/i.test(item.proof_boundary), 'Buyer evidence hard gate proof_boundary must require retained accepted buyer evidence.');
      }
      if (item.prerequisite === 'Explicit owner production approval') {
        assert(/does not approve|push|deploy|prove live parity/i.test(item.proof_boundary), 'Explicit owner production approval proof_boundary must not imply approval, deploy, or live parity.');
      }
      if (item.prerequisite === 'Post-deploy live proof boundary') {
        assert(/after explicit approval and guarded deploy completion|does not deploy|create hosted\/live parity evidence/i.test(item.proof_boundary), 'Post-deploy live proof boundary must require approved deploy completion before live proof.');
      }
    }
    const productionPrerequisites = manifest.production_approval.prerequisite_queue.items.map((item) => item.prerequisite);
    for (const prerequisite of [
      'Clean source provenance',
      'Launch evidence validation',
      'Corepack release-readiness',
      'Canonical branch review',
      'Supabase advisor clearance',
      'Buyer evidence hard gate',
      'Explicit owner production approval',
      'Post-deploy live proof boundary',
    ]) {
      assert(
        productionPrerequisites.includes(prerequisite),
        `Manifest production approval prerequisite queue must include: ${prerequisite}.`,
      );
    }
    const ownerApprovalItem = manifest.production_approval.prerequisite_queue.items.find((item) => item.prerequisite === 'Explicit owner production approval');
    const liveProofItem = manifest.production_approval.prerequisite_queue.items.find((item) => item.prerequisite === 'Post-deploy live proof boundary');
    const launchEvidencePrerequisiteItem = manifest.production_approval.prerequisite_queue.items.find((item) => item.prerequisite === 'Launch evidence validation');
    const releasePrerequisiteItem = manifest.production_approval.prerequisite_queue.items.find((item) => item.prerequisite === 'Corepack release-readiness');
    assert(launchEvidencePrerequisiteItem, 'Production approval prerequisite queue must include launch evidence validation.');
    assert(launchEvidencePrerequisiteItem.proof_command === 'corepack pnpm run check:launch-evidence-manifest', 'Launch evidence validation prerequisite must include the manifest validation proof command.');
    assert(launchEvidencePrerequisiteItem.status === 'ready', 'Launch evidence validation prerequisite must not be a circular self-blocker inside the request packet.');
    assert(/external to manifest generation|attach passing check:launch-evidence-manifest output/i.test(launchEvidencePrerequisiteItem.current), 'Launch evidence validation prerequisite must say external check output is required.');
    assert(/do not.*production approval.*buyer acceptance.*current hosted\/live parity/i.test(launchEvidencePrerequisiteItem.stop_gate), 'Launch evidence validation prerequisite must preserve the no-approval, no-buyer-proof, and no-live-parity boundary.');
    assert(releasePrerequisiteItem, 'Production approval prerequisite queue must include Corepack release-readiness.');
    assert(/release-toolchain probe/i.test(releasePrerequisiteItem.current), 'Corepack release-readiness prerequisite must summarize toolchain probe ledger state.');
    assert(/Corepack\/Git LFS probe ledger/i.test(releasePrerequisiteItem.needed), 'Corepack release-readiness prerequisite must require the current Corepack/Git LFS probe ledger.');
    assert(releasePrerequisiteItem.proof_command.includes('report:launch-evidence-manifest') && releasePrerequisiteItem.proof_command.includes('check:release-readiness'), 'Corepack release-readiness prerequisite must refresh launch evidence before release-readiness.');
    assert(/probe ledger/i.test(releasePrerequisiteItem.stop_gate), 'Corepack release-readiness prerequisite must say the probe ledger is not approval evidence.');
    assert(ownerApprovalItem?.status === 'manual_stop', 'Production approval prerequisite queue must keep explicit owner approval at manual_stop.');
    assert(ownerApprovalItem?.current === 'not granted by this manifest or report', 'Production approval prerequisite queue must not imply owner approval is granted.');
    assert(ownerApprovalItem?.proof_command === 'corepack pnpm run check:production-deploy-request', 'Production approval prerequisite queue must include the deploy-request proof command.');
    assert(liveProofItem?.status === 'blocked', 'Production approval prerequisite queue must keep post-deploy live proof blocked before approved deploy.');
    assert(liveProofItem?.proof_command === 'corepack pnpm run check:post-deploy-live', 'Production approval prerequisite queue must include the post-deploy live proof command.');
    assert(
      manifest.production_approval.prerequisite_queue.items.some((item) => /does not grant owner approval|claim production approval|claim post-deploy live parity/i.test(item.stop_gate)),
      'Production approval prerequisite queue must preserve explicit non-approval and live-parity stop gates.',
    );
    const productionApprovalRequestPacket = manifest.production_approval.request_packet;
    assert(typeof productionApprovalRequestPacket?.evidence === 'string', 'Manifest production_approval.request_packet.evidence must be set.');
    assert(productionApprovalRequestPacket.evidence.includes('Production approval request packet'), 'Manifest production approval request packet evidence must include a packet marker.');
    assert(productionApprovalRequestPacket.proof_type === 'production_approval_request_packet', 'Manifest production approval request packet must classify proof_type as production_approval_request_packet.');
    assert(typeof productionApprovalRequestPacket.source_prerequisite_status === 'string' && productionApprovalRequestPacket.source_prerequisite_status.length > 0, 'Manifest production approval request packet source_prerequisite_status must be set.');
    assert(
      productionApprovalRequestPacket.source_prerequisite_status === manifest.production_approval.prerequisite_queue.status,
      'Production approval request packet source_prerequisite_status must match prerequisite_queue.status.',
    );
    assert(typeof productionApprovalRequestPacket.request_eligible === 'boolean', 'Manifest production approval request packet request_eligible must be boolean.');
    assert(hasIntegerOrNull(productionApprovalRequestPacket.item_count), 'Manifest production approval request packet item_count must be an integer or null.');
    assert(hasIntegerOrNull(productionApprovalRequestPacket.request_blocking_count), 'Manifest production approval request packet request_blocking_count must be an integer or null.');
    assert(hasIntegerOrNull(productionApprovalRequestPacket.manual_stop_count), 'Manifest production approval request packet manual_stop_count must be an integer or null.');
    assert(Array.isArray(productionApprovalRequestPacket.items), 'Manifest production approval request packet items must be a list.');
    assert(
      productionApprovalRequestPacket.item_count === productionApprovalRequestPacket.items.length,
      'Production approval request packet item_count must match items length.',
    );
    assert(
      productionApprovalRequestPacket.request_blocking_count === productionApprovalRequestPacket.items.filter((item) => item.blocks_request).length,
      'Production approval request packet request_blocking_count must match request-blocking rows.',
    );
    assert(
      productionApprovalRequestPacket.request_eligible === (productionApprovalRequestPacket.request_blocking_count === 0),
      'Production approval request packet request_eligible must reflect whether pre-request blockers remain.',
    );
    assert(typeof productionApprovalRequestPacket.proof_boundary === 'string' && /organizes evidence for owner review only|does not grant owner approval|run deploys|push|mutate branches|contact buyers|access Supabase|clear source provenance|hosted\/live parity/i.test(productionApprovalRequestPacket.proof_boundary), 'Production approval request packet proof_boundary must preserve request-only, no-approval, no-mutation, and no-live-proof semantics.');
    assert(typeof productionApprovalRequestPacket.stop_gate === 'string' && /Do not request or claim production approval|pre-request row|deploy-production|netlify deploy|hosted\/live claims/i.test(productionApprovalRequestPacket.stop_gate), 'Production approval request packet stop_gate must block approval requests and deploy/live claims until prerequisites are ready.');
    for (const [index, item] of (productionApprovalRequestPacket.items ?? []).entries()) {
      assert(Number.isInteger(item.rank), `production_approval.request_packet.items[${index}].rank must be an integer.`);
      assert(typeof item.prerequisite === 'string' && item.prerequisite.length > 0, `production_approval.request_packet.items[${index}].prerequisite must be set.`);
      assert(['pre_request', 'owner_decision', 'post_deploy_boundary'].includes(item.request_phase), `production_approval.request_packet.items[${index}].request_phase must be a known phase.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `production_approval.request_packet.items[${index}].current must be set.`);
      assert(typeof item.needed === 'string' && item.needed.length > 0, `production_approval.request_packet.items[${index}].needed must be set.`);
      assert(typeof item.owner === 'string' && item.owner.length > 0, `production_approval.request_packet.items[${index}].owner must be set.`);
      assert(typeof item.evidence_to_attach === 'string' && item.evidence_to_attach.length > 0, `production_approval.request_packet.items[${index}].evidence_to_attach must be set.`);
      assert(typeof item.proof_command === 'string' && item.proof_command.length > 0, `production_approval.request_packet.items[${index}].proof_command must be set.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `production_approval.request_packet.items[${index}].proof_type must be set.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `production_approval.request_packet.items[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && item.stop_gate.length > 0, `production_approval.request_packet.items[${index}].stop_gate must be set.`);
      assert(typeof item.request_impact === 'string' && item.request_impact.length > 0, `production_approval.request_packet.items[${index}].request_impact must be set.`);
      assert(typeof item.source_status === 'string' && item.source_status.length > 0, `production_approval.request_packet.items[${index}].source_status must be set.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `production_approval.request_packet.items[${index}].status must be set.`);
      assert(typeof item.blocks_request === 'boolean', `production_approval.request_packet.items[${index}].blocks_request must be boolean.`);
      if (productionProofTypesByPrerequisite[item.prerequisite]) {
        assert(
          item.proof_type === productionProofTypesByPrerequisite[item.prerequisite],
          `production_approval.request_packet.items[${index}] must classify ${item.prerequisite} as ${productionProofTypesByPrerequisite[item.prerequisite]}.`,
        );
      }
      if (item.request_phase === 'pre_request') {
        assert(item.blocks_request === (item.source_status !== 'ready'), `production_approval.request_packet.items[${index}] must block exactly while its pre-request source status is non-ready.`);
      }
      if (item.prerequisite === 'Launch evidence validation') {
        assert(item.source_status === 'ready', 'Launch evidence validation request row must inherit ready status from the externally validated prerequisite.');
        assert(item.blocks_request === false, 'Launch evidence validation request row must not circularly block the packet after external validation is attached.');
        assert(/does not grant approval|buyer acceptance|deployment|live parity/i.test(item.request_impact), 'Launch evidence validation request impact must preserve the no-approval and no-live-parity boundary.');
      }
      if (item.prerequisite === 'Explicit owner production approval') {
        assert(item.request_phase === 'owner_decision', 'Explicit owner production approval request row must be owner_decision.');
        assert(item.blocks_request === false, 'Explicit owner production approval request row must not be counted as a pre-request blocker.');
        assert(item.status === 'manual_stop', 'Explicit owner production approval request row must remain manual_stop.');
        assert(/does not create that approval/i.test(item.evidence_to_attach), 'Explicit owner production approval request row must not claim the packet creates approval.');
      }
      if (item.prerequisite === 'Post-deploy live proof boundary') {
        assert(item.request_phase === 'post_deploy_boundary', 'Post-deploy live proof request row must be post_deploy_boundary.');
        assert(item.blocks_request === false, 'Post-deploy live proof request row must not be counted as a pre-request blocker.');
        assert(/downstream|post-deploy/i.test(item.request_impact), 'Post-deploy live proof request row must be framed as downstream of approval and deploy completion.');
      }
    }
    assert(
      JSON.stringify((productionApprovalRequestPacket.items ?? []).map((item) => item.prerequisite)) === JSON.stringify((manifest.production_approval.prerequisite_queue.items ?? []).map((item) => item.prerequisite)),
      'Production approval request packet must include exactly the prerequisite queue rows in order.',
    );
    assert(typeof manifest.post_deploy_live_proof?.evidence === 'string', 'Manifest post_deploy_live_proof.evidence must be set.');
    assert(manifest.post_deploy_live_proof.evidence.includes('Post-deploy live proof gate queue'), 'Manifest post-deploy live proof evidence must include a queue marker.');
    assert(manifest.post_deploy_live_proof.current_source_live_proven === false, 'Manifest must not imply current source is live-proven.');
    assert(typeof manifest.post_deploy_live_proof?.stop_gate === 'string' && /does not prove hosted\/live parity|requires an explicitly approved deploy/i.test(manifest.post_deploy_live_proof.stop_gate), 'Manifest post-deploy live proof stop gate must preserve the hosted/live parity boundary.');
    assert(typeof manifest.post_deploy_live_proof?.gate_queue?.evidence === 'string', 'Manifest post_deploy_live_proof.gate_queue.evidence must be set.');
    assert(manifest.post_deploy_live_proof.gate_queue.evidence.includes('Post-deploy live proof gate queue'), 'Manifest post-deploy live proof gate queue evidence must include a queue marker.');
    assert(hasIntegerOrNull(manifest.post_deploy_live_proof.gate_queue?.item_count), 'Manifest post-deploy live proof gate item_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.post_deploy_live_proof.gate_queue?.blocked_count), 'Manifest post-deploy live proof gate blocked_count must be an integer or null.');
    assert(Array.isArray(manifest.post_deploy_live_proof.gate_queue?.items), 'Manifest post-deploy live proof gate items must be a list.');
    assert((manifest.post_deploy_live_proof.gate_queue.items ?? []).length >= 6, 'Manifest post-deploy live proof gate queue must include approval, deploy, metadata, static parity, hosted smoke, and parity-claim rows.');
    assert(
      manifest.post_deploy_live_proof.gate_queue.item_count === manifest.post_deploy_live_proof.gate_queue.items.length,
      'Post-deploy live proof gate item_count must match items length.',
    );
    const postDeployProofTypesByGate = {
      'Production approval clearance': 'manual_approval_gate',
      'Guarded production deploy completion': 'approved_deploy_execution',
      'Live public metadata': 'hosted_metadata_probe',
      'Live static dist parity': 'hosted_static_parity_probe',
      'Hosted proof-pack route smoke': 'hosted_browser_smoke',
      'Current-source hosted parity claim': 'post_deploy_parity_claim',
    };
    for (const [index, item] of (manifest.post_deploy_live_proof.gate_queue.items ?? []).entries()) {
      assert(Number.isInteger(item.rank), `post_deploy_live_proof.gate_queue.items[${index}].rank must be an integer.`);
      assert(typeof item.gate === 'string' && item.gate.length > 0, `post_deploy_live_proof.gate_queue.items[${index}].gate must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `post_deploy_live_proof.gate_queue.items[${index}].current must be set.`);
      assert(typeof item.needed === 'string' && item.needed.length > 0, `post_deploy_live_proof.gate_queue.items[${index}].needed must be set.`);
      assert(typeof item.owner === 'string' && item.owner.length > 0, `post_deploy_live_proof.gate_queue.items[${index}].owner must be set.`);
      assert(typeof item.proof_command === 'string' && item.proof_command.length > 0, `post_deploy_live_proof.gate_queue.items[${index}].proof_command must be set.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `post_deploy_live_proof.gate_queue.items[${index}].proof_type must be set.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `post_deploy_live_proof.gate_queue.items[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && /do not|no /i.test(item.stop_gate), `post_deploy_live_proof.gate_queue.items[${index}].stop_gate must preserve an explicit stop gate.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `post_deploy_live_proof.gate_queue.items[${index}].status must be set.`);
      assert(item.status !== 'ready', `post_deploy_live_proof.gate_queue.items[${index}].status must remain non-ready until the approved post-deploy gate passes.`);
      if (postDeployProofTypesByGate[item.gate]) {
        assert(
          item.proof_type === postDeployProofTypesByGate[item.gate],
          `post_deploy_live_proof.gate_queue.items[${index}] must classify ${item.gate} as ${postDeployProofTypesByGate[item.gate]}.`,
        );
      }
      if (item.gate === 'Production approval clearance') {
        assert(/does not grant owner approval|does not.*deploy|bypass source/i.test(item.proof_boundary), 'Production approval clearance proof_boundary must not imply approval, deploy, or gate bypass.');
      }
      if (item.gate === 'Guarded production deploy completion') {
        assert(/explicit owner approval|typed deploy phrase|do not run deploys|prove hosted\/live parity/i.test(item.proof_boundary), 'Guarded deploy completion proof_boundary must preserve approval, execution, and live-parity boundaries.');
      }
      if (item.gate === 'Live public metadata') {
        assert(/metadata evidence alone does not prove static parity|hosted proof-pack smoke|current-source hosted parity/i.test(item.proof_boundary), 'Live public metadata proof_boundary must not imply full hosted parity.');
      }
      if (item.gate === 'Live static dist parity') {
        assert(/does not rebuild dist|full hosted\/live parity alone/i.test(item.proof_boundary), 'Live static parity proof_boundary must reject rebuild and full-parity claims.');
      }
      if (item.gate === 'Hosted proof-pack route smoke') {
        assert(/local smoke|constructed demos|skipped smoke|do not prove hosted proof-pack route evidence/i.test(item.proof_boundary), 'Hosted proof-pack smoke proof_boundary must reject local, skipped, or constructed proof.');
      }
      if (item.gate === 'Current-source hosted parity claim') {
        assert(/approval, guarded deploy completion, live metadata, static parity, and hosted proof-pack smoke all pass|does not create live proof/i.test(item.proof_boundary), 'Current-source hosted parity proof_boundary must require every post-deploy proof gate.');
      }
    }
    const liveProofGates = manifest.post_deploy_live_proof.gate_queue.items.map((item) => item.gate);
    for (const gate of [
      'Production approval clearance',
      'Guarded production deploy completion',
      'Live public metadata',
      'Live static dist parity',
      'Hosted proof-pack route smoke',
      'Current-source hosted parity claim',
    ]) {
      assert(
        liveProofGates.includes(gate),
        `Manifest post-deploy live proof gate queue must include: ${gate}.`,
      );
    }
    assert(
      manifest.post_deploy_live_proof.gate_queue.items.some((item) => item.proof_command === 'corepack pnpm run check:live-public-metadata'),
      'Post-deploy live proof gate queue must include the live public metadata proof command.',
    );
    assert(
      manifest.post_deploy_live_proof.gate_queue.items.some((item) => item.proof_command === 'corepack pnpm run check:live-static-parity'),
      'Post-deploy live proof gate queue must include the live static parity proof command.',
    );
    assert(
      manifest.post_deploy_live_proof.gate_queue.items.some((item) => item.proof_command === 'corepack pnpm run test:browser:hosted:proof-packs'),
      'Post-deploy live proof gate queue must include the hosted proof-pack smoke proof command.',
    );
    assert(
      manifest.post_deploy_live_proof.gate_queue.items.some((item) => /does not deploy|Do not run deploy-production|Do not present hosted\/live parity/i.test(item.stop_gate)),
      'Post-deploy live proof gate queue must preserve explicit no-deploy and no-live-parity stop gates.',
    );
    const deployCompletionItem = manifest.post_deploy_live_proof.gate_queue.items.find((item) => item.gate === 'Guarded production deploy completion');
    assert(deployCompletionItem, 'Post-deploy live proof gate queue must include the guarded deploy completion item.');
    assert(deployCompletionItem.proof_command !== 'scripts/deploy-production.sh', 'Guarded deploy completion proof command must not be the bare production deploy script.');
    assert(
      deployCompletionItem.proof_command.includes('check:production-deploy-request')
        && deployCompletionItem.proof_command.includes('scripts/deploy-production.sh'),
      'Guarded deploy completion proof command must sequence the approval-request check before the deploy script.',
    );
    assert(deployCompletionItem.approval_required === true, 'Guarded deploy completion must carry approval_required=true.');
    assert(deployCompletionItem.approval_command === 'corepack pnpm run check:production-deploy-request', 'Guarded deploy completion must name the production deploy request check.');
    assert(deployCompletionItem.execution_command === 'scripts/deploy-production.sh', 'Guarded deploy completion must keep the deploy script as an explicit execution command.');
    assert(deployCompletionItem.approval_phrase === 'DEPLOY CEIP PRODUCTION', 'Guarded deploy completion must preserve the exact typed approval phrase.');
    assert(
      deployCompletionItem.stop_gate.includes('DEPLOY CEIP PRODUCTION'),
      'Guarded deploy completion stop gate must mention the exact typed approval phrase.',
    );
    assert(hasOpenGap(manifest, 'P1', 'stale/aging unmerged branches'), 'Manifest must keep the open P1 branch freshness review gap.');
    assert(hasOpenGap(manifest, 'P1', 'Supabase security/performance advisor clearance'), 'Manifest must keep the open P1 Supabase advisor clearance gap.');
    assert(typeof manifest.supabase_advisor?.evidence === 'string', 'Manifest must include supabase_advisor.evidence.');
    assert(manifest.supabase_advisor.evidence.includes('Supabase advisor review'), 'Manifest supabase_advisor evidence must summarize advisor access.');
    assert(typeof manifest.supabase_advisor?.project_ref === 'string' && manifest.supabase_advisor.project_ref.length > 0, 'Manifest supabase_advisor.project_ref must be set.');
    assert(typeof manifest.supabase_advisor?.cli_app_lint_status === 'string' && manifest.supabase_advisor.cli_app_lint_status.length > 0, 'Manifest supabase_advisor.cli_app_lint_status must be set.');
    assert(typeof manifest.supabase_advisor?.security_performance_advisors_status === 'string' && manifest.supabase_advisor.security_performance_advisors_status.length > 0, 'Manifest supabase_advisor.security_performance_advisors_status must be set.');
    assert(typeof manifest.supabase_advisor?.connector_permission === 'string' && manifest.supabase_advisor.connector_permission.length > 0, 'Manifest supabase_advisor.connector_permission must be set.');
    assert(typeof manifest.supabase_advisor?.evidence_boundary === 'string' && /does not substitute|advisor evidence|authorization/i.test(manifest.supabase_advisor.evidence_boundary), 'Manifest supabase_advisor.evidence_boundary must preserve the proof limitation.');
    assert(typeof manifest.supabase_advisor?.clearance_deficits?.evidence === 'string', 'Manifest supabase_advisor.clearance_deficits.evidence must be set.');
    assert(manifest.supabase_advisor.clearance_deficits.evidence.includes('Supabase advisor clearance deficit ledger'), 'Manifest Supabase advisor clearance deficits evidence must include a ledger marker.');
    assert(hasIntegerOrNull(manifest.supabase_advisor?.clearance_deficits?.open_count), 'Manifest supabase_advisor.clearance_deficits.open_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.supabase_advisor?.clearance_deficits?.total_count), 'Manifest supabase_advisor.clearance_deficits.total_count must be an integer or null.');
    assert(Array.isArray(manifest.supabase_advisor?.clearance_deficits?.items), 'Manifest supabase_advisor.clearance_deficits.items must be a list.');
    const supabaseAdvisorProofTypesByRequirement = {
      'CLI app lint freshness': 'repo_command',
      'Connector project authorization': 'external_account_evidence',
      'Security advisor evidence': 'external_account_evidence',
      'Performance advisor evidence': 'external_account_evidence',
      'Public-safe findings record': 'retained_redacted_record',
      'Advisor clearance claim': 'repo_command',
    };
    for (const [index, item] of (manifest.supabase_advisor.clearance_deficits.items ?? []).entries()) {
      assert(typeof item.requirement === 'string' && item.requirement.length > 0, `supabase_advisor.clearance_deficits.items[${index}].requirement must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `supabase_advisor.clearance_deficits.items[${index}].current must be set.`);
      assert(typeof item.needed === 'string' && item.needed.length > 0, `supabase_advisor.clearance_deficits.items[${index}].needed must be set.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `supabase_advisor.clearance_deficits.items[${index}].status must be set.`);
      assert(typeof item.next_action === 'string' && item.next_action.length > 0, `supabase_advisor.clearance_deficits.items[${index}].next_action must be set.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `supabase_advisor.clearance_deficits.items[${index}].proof_type must be set.`);
      assert(typeof item.external_account_required === 'boolean', `supabase_advisor.clearance_deficits.items[${index}].external_account_required must be boolean.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `supabase_advisor.clearance_deficits.items[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && item.stop_gate.length > 0, `supabase_advisor.clearance_deficits.items[${index}].stop_gate must be set.`);
      if (supabaseAdvisorProofTypesByRequirement[item.requirement]) {
        assert(
          item.proof_type === supabaseAdvisorProofTypesByRequirement[item.requirement],
          `supabase_advisor.clearance_deficits.items[${index}] must classify ${item.requirement} as ${supabaseAdvisorProofTypesByRequirement[item.requirement]}.`,
        );
      }
      if (['Connector project authorization', 'Security advisor evidence', 'Performance advisor evidence'].includes(item.requirement)) {
        assert(item.external_account_required === true, `supabase_advisor.clearance_deficits.items[${index}] must require external account access for dashboard/connector advisor work.`);
        assert(/authorized|dashboard|connector|Advisor/i.test(item.proof_boundary), `supabase_advisor.clearance_deficits.items[${index}] proof_boundary must preserve the authorized external-evidence boundary.`);
        assert(/Do not|permission-denied|advisor evidence/i.test(item.stop_gate), `supabase_advisor.clearance_deficits.items[${index}].stop_gate must reject unauthorized or stale advisor evidence.`);
      }
      if (['CLI app lint freshness', 'Advisor clearance claim'].includes(item.requirement)) {
        assert(item.external_account_required === false, `supabase_advisor.clearance_deficits.items[${index}] must not require external account access for repo-local proof rows.`);
        assert(/does not authorize|does not claim|only after every/i.test(item.proof_boundary), `supabase_advisor.clearance_deficits.items[${index}].proof_boundary must not imply advisor clearance.`);
      }
      if (item.requirement === 'Public-safe findings record') {
        assert(item.external_account_required === false, 'Supabase advisor public-safe findings deficit must not be marked as direct external-account execution.');
        assert(/retained redacted advisor summary|no secrets|credentials/i.test(item.proof_boundary), 'Supabase advisor public-safe findings deficit must require retained redacted no-secret evidence.');
        assert(/Do not print or persist secrets|tokens|private findings/i.test(item.stop_gate), 'Supabase advisor public-safe findings deficit stop gate must prohibit secrets and private findings in public artifacts.');
      }
    }
    assert(
      manifest.supabase_advisor.clearance_deficits.items.some((item) => item.requirement === 'Security advisor evidence'),
      'Supabase advisor clearance deficits must include security advisor evidence.',
    );
    assert(
      manifest.supabase_advisor.clearance_deficits.items.some((item) => item.requirement === 'Performance advisor evidence'),
      'Supabase advisor clearance deficits must include performance advisor evidence.',
    );
    assert(
      manifest.supabase_advisor.clearance_deficits.items.some((item) => item.requirement === 'Advisor clearance claim'),
      'Supabase advisor clearance deficits must include the no-clearance-claim row.',
    );
    assert(typeof manifest.supabase_advisor?.clearance_deficits?.remediation_queue?.evidence === 'string', 'Manifest supabase_advisor.clearance_deficits.remediation_queue.evidence must be set.');
    assert(manifest.supabase_advisor.clearance_deficits.remediation_queue.evidence.includes('Supabase advisor remediation queue'), 'Manifest Supabase advisor remediation queue evidence must include a queue marker.');
    assert(hasIntegerOrNull(manifest.supabase_advisor.clearance_deficits.remediation_queue?.open_count), 'Manifest supabase_advisor.clearance_deficits.remediation_queue.open_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.supabase_advisor.clearance_deficits.remediation_queue?.total_count), 'Manifest supabase_advisor.clearance_deficits.remediation_queue.total_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.supabase_advisor.clearance_deficits.remediation_queue?.item_count), 'Manifest supabase_advisor.clearance_deficits.remediation_queue.item_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.supabase_advisor.clearance_deficits.remediation_queue?.blocked_count), 'Manifest supabase_advisor.clearance_deficits.remediation_queue.blocked_count must be an integer or null.');
    assert(
      manifest.supabase_advisor.clearance_deficits.remediation_queue.open_count === manifest.supabase_advisor.clearance_deficits.open_count,
      'Supabase advisor remediation queue open_count must match clearance_deficits.open_count.',
    );
    assert(
      manifest.supabase_advisor.clearance_deficits.remediation_queue.total_count === manifest.supabase_advisor.clearance_deficits.total_count,
      'Supabase advisor remediation queue total_count must match clearance_deficits.total_count.',
    );
    assert(Array.isArray(manifest.supabase_advisor.clearance_deficits.remediation_queue.items), 'Manifest supabase_advisor.clearance_deficits.remediation_queue.items must be a list.');
    assert(
      manifest.supabase_advisor.clearance_deficits.remediation_queue.item_count === manifest.supabase_advisor.clearance_deficits.remediation_queue.items.length,
      'Supabase advisor remediation queue item_count must match items length.',
    );
    for (const [index, item] of (manifest.supabase_advisor.clearance_deficits.remediation_queue.items ?? []).entries()) {
      assert(Number.isInteger(item.rank), `supabase_advisor.clearance_deficits.remediation_queue.items[${index}].rank must be an integer.`);
      assert(typeof item.requirement === 'string' && item.requirement.length > 0, `supabase_advisor.clearance_deficits.remediation_queue.items[${index}].requirement must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `supabase_advisor.clearance_deficits.remediation_queue.items[${index}].current must be set.`);
      assert(typeof item.needed === 'string' && item.needed.length > 0, `supabase_advisor.clearance_deficits.remediation_queue.items[${index}].needed must be set.`);
      assert(typeof item.deficit_status === 'string' && item.deficit_status.length > 0, `supabase_advisor.clearance_deficits.remediation_queue.items[${index}].deficit_status must be set.`);
      assert(typeof item.owner === 'string' && item.owner.length > 0, `supabase_advisor.clearance_deficits.remediation_queue.items[${index}].owner must be set.`);
      assert(typeof item.action === 'string' && item.action.length > 0, `supabase_advisor.clearance_deficits.remediation_queue.items[${index}].action must be set.`);
      assert(typeof item.proof_command === 'string' && item.proof_command.length > 0, `supabase_advisor.clearance_deficits.remediation_queue.items[${index}].proof_command must be set.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `supabase_advisor.clearance_deficits.remediation_queue.items[${index}].proof_type must be set.`);
      assert(typeof item.external_account_required === 'boolean', `supabase_advisor.clearance_deficits.remediation_queue.items[${index}].external_account_required must be boolean.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `supabase_advisor.clearance_deficits.remediation_queue.items[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && item.stop_gate.length > 0, `supabase_advisor.clearance_deficits.remediation_queue.items[${index}].stop_gate must be set.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `supabase_advisor.clearance_deficits.remediation_queue.items[${index}].status must be set.`);
      assert(item.status !== 'ready', `supabase_advisor.clearance_deficits.remediation_queue.items[${index}].status must remain non-ready until the deficit row passes.`);
      if (['Connector project authorization', 'Security advisor evidence', 'Performance advisor evidence'].includes(item.requirement)) {
        assert(item.proof_type === 'external_account_evidence', `supabase_advisor.clearance_deficits.remediation_queue.items[${index}] must mark dashboard/connector advisor work as external_account_evidence.`);
        assert(item.external_account_required === true, `supabase_advisor.clearance_deficits.remediation_queue.items[${index}] must require external account access for dashboard/connector advisor work.`);
        assert(/authorized|dashboard|connector|Advisor/i.test(item.proof_boundary), `supabase_advisor.clearance_deficits.remediation_queue.items[${index}] proof_boundary must preserve the authorized external-evidence boundary.`);
      }
      if (['CLI app lint freshness', 'Advisor clearance claim'].includes(item.requirement)) {
        assert(item.proof_type === 'repo_command', `supabase_advisor.clearance_deficits.remediation_queue.items[${index}] must mark repo-local proof rows as repo_command.`);
        assert(item.external_account_required === false, `supabase_advisor.clearance_deficits.remediation_queue.items[${index}] must not require external account access for repo-local proof rows.`);
      }
      if (item.requirement === 'Public-safe findings record') {
        assert(item.proof_type === 'retained_redacted_record', 'Supabase advisor public-safe findings row must be a retained redacted record.');
        assert(item.external_account_required === false, 'Supabase advisor public-safe findings row must not be marked as direct external-account execution.');
      }
    }
    const supabaseQueueRequirements = (manifest.supabase_advisor.clearance_deficits.remediation_queue.items ?? []).map((item) => item.requirement);
    const nonPassSupabaseRequirements = (manifest.supabase_advisor.clearance_deficits.items ?? [])
      .filter((item) => item.status !== 'pass')
      .map((item) => item.requirement);
    assert(
      JSON.stringify(supabaseQueueRequirements) === JSON.stringify(nonPassSupabaseRequirements),
      'Supabase advisor remediation queue must include exactly the current non-pass Supabase advisor requirements.',
    );
    if (supabaseQueueRequirements.includes('Security advisor evidence')) {
      assert(
        manifest.supabase_advisor.clearance_deficits.remediation_queue.items.some((item) => /Security Advisor/.test(item.proof_command)),
        'Supabase advisor remediation queue must include the Security Advisor proof command while security advisor evidence is unresolved.',
      );
    }
    if (supabaseQueueRequirements.includes('Performance advisor evidence')) {
      assert(
        manifest.supabase_advisor.clearance_deficits.remediation_queue.items.some((item) => /Performance Advisor/.test(item.proof_command)),
        'Supabase advisor remediation queue must include the Performance Advisor proof command while performance advisor evidence is unresolved.',
      );
    }
    assert(
      manifest.supabase_advisor.clearance_deficits.remediation_queue.items.some((item) => /Do not/.test(item.stop_gate)),
      'Supabase advisor remediation queue must preserve explicit stop gates.',
    );
    assert(typeof manifest.branch_review?.evidence === 'string', 'Manifest must include branch_review.evidence.');
    assert(typeof manifest.branch_review?.status === 'string', 'Manifest branch_review.status must be set.');
    assert(typeof manifest.branch_review?.probe_status === 'string', 'Manifest branch_review.probe_status must be set.');
    assert(typeof manifest.branch_review?.evidence_boundary === 'string', 'Manifest branch_review.evidence_boundary must be set.');
    assert(
      manifest.branch_review.evidence.includes('Branch review clearance')
        && manifest.branch_review.evidence.includes('probe_status='),
      'Manifest branch_review evidence must separate clearance status from read-only probe execution status.',
    );
    assert(
      /does not clear review-first branch families/i.test(manifest.branch_review.evidence_boundary),
      'Manifest branch_review.evidence_boundary must say the read-only probe does not clear branch-review decisions.',
    );
    assert(manifest.branch_review.evidence.includes('Branch family review'), 'Manifest branch_review evidence must summarize local/origin branch families.');
    assert(manifest.branch_review.evidence.includes('Branch freshness review'), 'Manifest branch_review evidence must summarize freshness.');
    assert(manifest.branch_review.evidence.includes('Branch review queue'), 'Manifest branch_review evidence must summarize the actionable review queue.');
    assert(manifest.branch_review.evidence.includes('Review-first branch packets'), 'Manifest branch_review evidence must summarize review-first focused branch packets.');
    assert(manifest.branch_review.evidence.includes('Top branch review packet'), 'Manifest branch_review evidence must summarize the top focused branch packet.');
    assert(hasIntegerOrNull(manifest.branch_review?.risk_counts?.high), 'Manifest branch_review risk_counts.high must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.family_counts?.local_only), 'Manifest branch_review family_counts.local_only must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.family_counts?.origin_only), 'Manifest branch_review family_counts.origin_only must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.family_counts?.local_ahead), 'Manifest branch_review family_counts.local_ahead must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.family_counts?.diverged), 'Manifest branch_review family_counts.diverged must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.freshness_counts?.stale), 'Manifest branch_review freshness_counts.stale must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.freshness_counts?.aging), 'Manifest branch_review freshness_counts.aging must be an integer or null.');
    assert(typeof manifest.branch_review?.review_queue?.evidence === 'string', 'Manifest branch_review.review_queue.evidence must be set.');
    assert(manifest.branch_review.review_queue.evidence.includes('Branch review queue'), 'Manifest branch_review.review_queue evidence must include a queue marker.');
    assert(['skipped', 'pass', 'blocked'].includes(manifest.branch_review.review_queue.status), 'Manifest branch_review.review_queue.status must be skipped, pass, or blocked.');
    assert(Array.isArray(manifest.branch_review?.review_queue?.items), 'Manifest branch_review.review_queue.items must be a list.');
    assert(hasIntegerOrNull(manifest.branch_review?.review_queue?.item_count), 'Manifest branch_review.review_queue.item_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.review_queue?.review_first_count), 'Manifest branch_review.review_queue.review_first_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.review_queue?.blocked_count), 'Manifest branch_review.review_queue.blocked_count must be an integer or null.');
    if (manifest.branch_review.review_queue.status !== 'skipped') {
      assert(
        manifest.branch_review.review_queue.blocked_count === manifest.branch_review.review_queue.review_first_count,
        'Branch review queue blocked_count must match review_first_count.',
      );
      assert(
        manifest.branch_review.review_queue.status === ((manifest.branch_review.review_queue.review_first_count ?? 0) > 0 ? 'blocked' : 'pass'),
        'Branch review queue status must block exactly while review-first branch families remain.',
      );
    }
    for (const [index, item] of (manifest.branch_review.review_queue.items ?? []).entries()) {
      assert(typeof item.family === 'string' && item.family.length > 0, `branch_review.review_queue.items[${index}].family must be set.`);
      assert(Array.isArray(item.family_refs), `branch_review.review_queue.items[${index}].family_refs must be a list.`);
      assert(item.local_ref === null || typeof item.local_ref === 'string', `branch_review.review_queue.items[${index}].local_ref must be string or null.`);
      assert(item.origin_ref === null || typeof item.origin_ref === 'string', `branch_review.review_queue.items[${index}].origin_ref must be string or null.`);
      assert(typeof item.review_ref === 'string' && item.review_ref.length > 0, `branch_review.review_queue.items[${index}].review_ref must be set.`);
      assert(typeof item.priority === 'string' && item.priority.length > 0, `branch_review.review_queue.items[${index}].priority must be set.`);
      assert(typeof item.highest_risk === 'string' && item.highest_risk.length > 0, `branch_review.review_queue.items[${index}].highest_risk must be set.`);
      assert(typeof item.local_origin_state === 'string' && item.local_origin_state.length > 0, `branch_review.review_queue.items[${index}].local_origin_state must be set.`);
      assert(typeof item.freshness === 'string' && item.freshness.length > 0, `branch_review.review_queue.items[${index}].freshness must be set.`);
      assert(typeof item.review_command === 'string' && item.review_command.includes('report:unmerged-branch-readiness'), `branch_review.review_queue.items[${index}].review_command must point to the focused branch report.`);
      assert(typeof item.stop_gate === 'string' && /no checkout|no .*merge|owner approval/i.test(item.stop_gate), `branch_review.review_queue.items[${index}].stop_gate must preserve the non-mutating approval boundary.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `branch_review.review_queue.items[${index}].proof_type must be set.`);
      assert(item.read_only === true, `branch_review.review_queue.items[${index}].read_only must be true.`);
      assert(
        typeof item.proof_boundary === 'string' && /read-only|does not checkout|merge|push|discard|migrate|deploy|production approval/i.test(item.proof_boundary),
        `branch_review.review_queue.items[${index}].proof_boundary must preserve the read-only non-mutating proof boundary.`,
      );
      if (item.highest_risk === 'high') {
        assert(
          item.proof_type === 'high_risk_read_only_branch_review',
          `branch_review.review_queue.items[${index}].proof_type must classify high-risk branch review rows.`,
        );
      }
    }
    assert(typeof manifest.branch_review?.canonical_head_decisions?.evidence === 'string', 'Manifest branch_review.canonical_head_decisions.evidence must be set.');
    assert(manifest.branch_review.canonical_head_decisions.evidence.includes('Canonical head decision ledger'), 'Manifest branch_review.canonical_head_decisions evidence must include a ledger marker.');
    assert(hasIntegerOrNull(manifest.branch_review?.canonical_head_decisions?.open_count), 'Manifest branch_review.canonical_head_decisions.open_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.canonical_head_decisions?.total_count), 'Manifest branch_review.canonical_head_decisions.total_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.canonical_head_decisions?.local_only_count), 'Manifest branch_review.canonical_head_decisions.local_only_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.canonical_head_decisions?.origin_only_count), 'Manifest branch_review.canonical_head_decisions.origin_only_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.canonical_head_decisions?.split_count), 'Manifest branch_review.canonical_head_decisions.split_count must be an integer or null.');
    assert(Array.isArray(manifest.branch_review?.canonical_head_decisions?.items), 'Manifest branch_review.canonical_head_decisions.items must be a list.');
    for (const [index, item] of (manifest.branch_review.canonical_head_decisions.items ?? []).entries()) {
      assert(Number.isInteger(item.rank), `branch_review.canonical_head_decisions.items[${index}].rank must be an integer.`);
      assert(typeof item.family === 'string' && item.family.length > 0, `branch_review.canonical_head_decisions.items[${index}].family must be set.`);
      assert(item.local_ref === null || typeof item.local_ref === 'string', `branch_review.canonical_head_decisions.items[${index}].local_ref must be string or null.`);
      assert(item.origin_ref === null || typeof item.origin_ref === 'string', `branch_review.canonical_head_decisions.items[${index}].origin_ref must be string or null.`);
      assert(typeof item.local_origin_state === 'string' && item.local_origin_state.length > 0, `branch_review.canonical_head_decisions.items[${index}].local_origin_state must be set.`);
      assert(typeof item.state_key === 'string' && item.state_key.length > 0, `branch_review.canonical_head_decisions.items[${index}].state_key must be set.`);
      assert(typeof item.decision_needed === 'string' && /choose|decide|refresh/i.test(item.decision_needed), `branch_review.canonical_head_decisions.items[${index}].decision_needed must describe the decision.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `branch_review.canonical_head_decisions.items[${index}].proof_type must be set.`);
      assert(item.owner_decision_required === true, `branch_review.canonical_head_decisions.items[${index}].owner_decision_required must be true.`);
      assert(item.read_only === true, `branch_review.canonical_head_decisions.items[${index}].read_only must be true.`);
      assert(typeof item.proof_command === 'string' && item.proof_command.includes('report:unmerged-branch-readiness'), `branch_review.canonical_head_decisions.items[${index}].proof_command must point to the focused branch report.`);
      assert(
        typeof item.proof_boundary === 'string' && /owner decision record only|does not checkout|merge|push|discard|delete|migrate|deploy|grant production approval|select a canonical head/i.test(item.proof_boundary),
        `branch_review.canonical_head_decisions.items[${index}].proof_boundary must preserve the owner-decision-only non-mutating proof boundary.`,
      );
      assert(typeof item.stop_gate === 'string' && /no checkout|no .*merge|no .*push|owner approval/i.test(item.stop_gate), `branch_review.canonical_head_decisions.items[${index}].stop_gate must preserve the non-mutating approval boundary.`);
      if (['local_ahead', 'origin_ahead', 'diverged'].includes(item.state_key)) {
        assert(
          item.proof_type === 'split_canonical_head_decision',
          `branch_review.canonical_head_decisions.items[${index}].proof_type must classify split canonical-head decisions.`,
        );
      }
      if (item.state_key === 'local_only') {
        assert(
          item.proof_type === 'local_only_canonical_head_decision',
          `branch_review.canonical_head_decisions.items[${index}].proof_type must classify local-only canonical-head decisions.`,
        );
      }
      if (item.state_key === 'origin_only') {
        assert(
          item.proof_type === 'origin_only_canonical_head_decision',
          `branch_review.canonical_head_decisions.items[${index}].proof_type must classify origin-only canonical-head decisions.`,
        );
      }
      assert(item.status !== 'pass', `branch_review.canonical_head_decisions.items[${index}].status must remain blocked until owner review clears the decision.`);
    }
    assert(typeof manifest.branch_review?.canonical_head_resolution_queue?.evidence === 'string', 'Manifest branch_review.canonical_head_resolution_queue.evidence must be set.');
    assert(manifest.branch_review.canonical_head_resolution_queue.evidence.includes('Canonical head resolution queue'), 'Manifest branch_review.canonical_head_resolution_queue evidence must include a queue marker.');
    assert(manifest.branch_review.canonical_head_resolution_queue.proof_type === 'canonical_head_resolution_queue', 'Manifest branch_review.canonical_head_resolution_queue proof_type must classify the canonical resolution queue.');
    assert(typeof manifest.branch_review.canonical_head_resolution_queue.source_decision_status === 'string', 'Manifest branch_review.canonical_head_resolution_queue.source_decision_status must be set.');
    assert(hasIntegerOrNull(manifest.branch_review.canonical_head_resolution_queue?.open_count), 'Manifest branch_review.canonical_head_resolution_queue.open_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review.canonical_head_resolution_queue?.total_count), 'Manifest branch_review.canonical_head_resolution_queue.total_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review.canonical_head_resolution_queue?.item_count), 'Manifest branch_review.canonical_head_resolution_queue.item_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review.canonical_head_resolution_queue?.blocked_count), 'Manifest branch_review.canonical_head_resolution_queue.blocked_count must be an integer or null.');
    assert(Array.isArray(manifest.branch_review.canonical_head_resolution_queue?.items), 'Manifest branch_review.canonical_head_resolution_queue.items must be a list.');
    assert(
      manifest.branch_review.canonical_head_resolution_queue.item_count === manifest.branch_review.canonical_head_resolution_queue.items.length,
      'Canonical-head resolution queue item_count must match items length.',
    );
    assert(
      manifest.branch_review.canonical_head_resolution_queue.blocked_count === manifest.branch_review.canonical_head_resolution_queue.items.filter((item) => item.blocks_branch_gate).length,
      'Canonical-head resolution queue blocked_count must match branch-blocking items.',
    );
    assert(
      typeof manifest.branch_review.canonical_head_resolution_queue.proof_boundary === 'string'
        && /owner-decision action list only|does not checkout|merge|push|discard|delete|select canonical heads|migrate|deploy|grant production approval|clear branch review/i.test(manifest.branch_review.canonical_head_resolution_queue.proof_boundary),
      'Manifest branch canonical-head resolution queue proof boundary must preserve owner-decision-only non-mutating semantics.',
    );
    assert(
      typeof manifest.branch_review.canonical_head_resolution_queue.stop_gate === 'string'
        && /Do not.*branch review clear|owner decision|read-only focused review|release gates|skipped probes/i.test(manifest.branch_review.canonical_head_resolution_queue.stop_gate),
      'Manifest branch canonical-head resolution queue stop_gate must preserve no-clearance semantics.',
    );
    for (const [index, item] of (manifest.branch_review.canonical_head_resolution_queue.items ?? []).entries()) {
      assert(Number.isInteger(item.rank), `branch_review.canonical_head_resolution_queue.items[${index}].rank must be an integer.`);
      assert(typeof item.family === 'string' && item.family.length > 0, `branch_review.canonical_head_resolution_queue.items[${index}].family must be set.`);
      assert(item.local_ref === null || typeof item.local_ref === 'string', `branch_review.canonical_head_resolution_queue.items[${index}].local_ref must be string or null.`);
      assert(item.origin_ref === null || typeof item.origin_ref === 'string', `branch_review.canonical_head_resolution_queue.items[${index}].origin_ref must be string or null.`);
      assert(typeof item.review_ref === 'string' && item.review_ref.length > 0, `branch_review.canonical_head_resolution_queue.items[${index}].review_ref must be set.`);
      assert(typeof item.local_origin_state === 'string' && item.local_origin_state.length > 0, `branch_review.canonical_head_resolution_queue.items[${index}].local_origin_state must be set.`);
      assert(typeof item.state_key === 'string' && item.state_key.length > 0, `branch_review.canonical_head_resolution_queue.items[${index}].state_key must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `branch_review.canonical_head_resolution_queue.items[${index}].current must be set.`);
      assert(typeof item.needed === 'string' && /choose|decide|refresh/i.test(item.needed), `branch_review.canonical_head_resolution_queue.items[${index}].needed must describe the owner decision.`);
      assert(typeof item.owner === 'string' && item.owner.length > 0, `branch_review.canonical_head_resolution_queue.items[${index}].owner must be set.`);
      assert(typeof item.action === 'string' && item.action.length > 0, `branch_review.canonical_head_resolution_queue.items[${index}].action must be set.`);
      assert(typeof item.proof_command === 'string' && item.proof_command.includes('report:unmerged-branch-readiness'), `branch_review.canonical_head_resolution_queue.items[${index}].proof_command must point to the focused branch report.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `branch_review.canonical_head_resolution_queue.items[${index}].proof_type must be set.`);
      assert(typeof item.decision_status === 'string' && item.decision_status.length > 0, `branch_review.canonical_head_resolution_queue.items[${index}].decision_status must be set.`);
      assert(item.read_only === true, `branch_review.canonical_head_resolution_queue.items[${index}].read_only must be true.`);
      assert(item.owner_decision_required === true, `branch_review.canonical_head_resolution_queue.items[${index}].owner_decision_required must be true.`);
      assert(
        typeof item.proof_boundary === 'string' && /owner-decision action list only|does not checkout|merge|push|discard|delete|select canonical heads|migrate|deploy|grant production approval|clear branch review/i.test(item.proof_boundary),
        `branch_review.canonical_head_resolution_queue.items[${index}].proof_boundary must preserve owner-decision-only non-mutating semantics.`,
      );
      assert(typeof item.stop_gate === 'string' && /Do not checkout|select a canonical head|production approval|owner decision/i.test(item.stop_gate), `branch_review.canonical_head_resolution_queue.items[${index}].stop_gate must preserve canonical-head stop gates.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `branch_review.canonical_head_resolution_queue.items[${index}].status must be set.`);
      assert(typeof item.blocks_branch_gate === 'boolean', `branch_review.canonical_head_resolution_queue.items[${index}].blocks_branch_gate must be boolean.`);
      assert(item.status !== 'ready', `branch_review.canonical_head_resolution_queue.items[${index}].status must stay non-ready until owner decision passes.`);
    }
    assert(
      JSON.stringify((manifest.branch_review.canonical_head_resolution_queue.items ?? []).map((item) => item.family)) === JSON.stringify((manifest.branch_review.canonical_head_decisions.items ?? []).map((item) => item.family)),
      'Canonical-head resolution queue must include exactly the canonical decision families in order.',
    );
    assert(typeof manifest.branch_review?.clearance_matrix === 'object' && manifest.branch_review.clearance_matrix !== null, 'Manifest branch_review.clearance_matrix must be an object.');
    assert(typeof manifest.branch_review.clearance_matrix.evidence === 'string' && manifest.branch_review.clearance_matrix.evidence.includes('Branch clearance matrix'), 'Manifest branch clearance matrix evidence must include a matrix marker.');
    assert(manifest.branch_review.clearance_matrix.proof_type === 'read_only_branch_clearance_matrix', 'Manifest branch clearance matrix must classify proof as read-only branch clearance evidence.');
    assert(
      typeof manifest.branch_review.clearance_matrix.proof_boundary === 'string'
        && /read-only branch-review evidence only|does not checkout|merge|push|discard|select canonical heads|deploy|clear branch review/i.test(manifest.branch_review.clearance_matrix.proof_boundary),
      'Manifest branch clearance matrix proof boundary must preserve no-mutation and no-clearance semantics.',
    );
    assert(
      typeof manifest.branch_review.clearance_matrix.stop_gate === 'string'
        && /Do not mark branch review clear|read-only focused review|owner approval|skipped probes/i.test(manifest.branch_review.clearance_matrix.stop_gate),
      'Manifest branch clearance matrix stop gate must block branch clearance claims.',
    );
    assert(Array.isArray(manifest.branch_review.clearance_matrix.rows), 'Manifest branch clearance matrix rows must be a list.');
    assert(hasIntegerOrNull(manifest.branch_review.clearance_matrix.family_count), 'Manifest branch clearance matrix family_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review.clearance_matrix.review_first_count), 'Manifest branch clearance matrix review_first_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review.clearance_matrix.canonical_open_count), 'Manifest branch clearance matrix canonical_open_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review.clearance_matrix.stale_or_aging_count), 'Manifest branch clearance matrix stale_or_aging_count must be an integer or null.');
    for (const [index, row] of (manifest.branch_review.clearance_matrix.rows ?? []).entries()) {
      assert(Number.isInteger(row.rank), `branch_review.clearance_matrix.rows[${index}].rank must be an integer.`);
      assert(typeof row.family === 'string' && row.family.length > 0, `branch_review.clearance_matrix.rows[${index}].family must be set.`);
      assert(typeof row.review_ref === 'string' && row.review_ref.length > 0, `branch_review.clearance_matrix.rows[${index}].review_ref must be set.`);
      assert(row.local_ref === null || typeof row.local_ref === 'string', `branch_review.clearance_matrix.rows[${index}].local_ref must be string or null.`);
      assert(row.origin_ref === null || typeof row.origin_ref === 'string', `branch_review.clearance_matrix.rows[${index}].origin_ref must be string or null.`);
      assert(typeof row.highest_risk === 'string' && row.highest_risk.length > 0, `branch_review.clearance_matrix.rows[${index}].highest_risk must be set.`);
      assert(typeof row.priority === 'string' && row.priority.length > 0, `branch_review.clearance_matrix.rows[${index}].priority must be set.`);
      assert(['review_first', 'canonical_head_decision', 'drift_review', 'focused_review'].includes(row.blocker_class), `branch_review.clearance_matrix.rows[${index}].blocker_class must classify the branch blocker.`);
      assert(typeof row.local_origin_state === 'string' && row.local_origin_state.length > 0, `branch_review.clearance_matrix.rows[${index}].local_origin_state must be set.`);
      assert(typeof row.freshness === 'string' && row.freshness.length > 0, `branch_review.clearance_matrix.rows[${index}].freshness must be set.`);
      assert(typeof row.canonical_decision_needed === 'string' && row.canonical_decision_needed.length > 0, `branch_review.clearance_matrix.rows[${index}].canonical_decision_needed must be set.`);
      assert(typeof row.required_proof_command === 'string' && row.required_proof_command.includes('report:unmerged-branch-readiness'), `branch_review.clearance_matrix.rows[${index}].required_proof_command must point to the focused branch report.`);
      assert(typeof row.proof_type === 'string' && row.proof_type.length > 0, `branch_review.clearance_matrix.rows[${index}].proof_type must be set.`);
      assert(row.read_only === true, `branch_review.clearance_matrix.rows[${index}].read_only must be true.`);
      assert(row.blocks_launch_clearance === true, `branch_review.clearance_matrix.rows[${index}].blocks_launch_clearance must be true until review clears.`);
      assert(
        typeof row.proof_boundary === 'string' && /read-only branch-review evidence only|does not checkout|merge|push|discard|select canonical heads|deploy|clear branch review/i.test(row.proof_boundary),
        `branch_review.clearance_matrix.rows[${index}].proof_boundary must preserve no-mutation and no-clearance semantics.`,
      );
      assert(typeof row.stop_gate === 'string' && /Do not checkout|merge|push|discard|deploy|production approval/i.test(row.stop_gate), `branch_review.clearance_matrix.rows[${index}].stop_gate must preserve no-mutation branch boundaries.`);
      assert(['blocked', 'review_required'].includes(row.clearance_status), `branch_review.clearance_matrix.rows[${index}].clearance_status must stay blocked or review_required.`);
      if (row.highest_risk === 'high') {
        assert(row.proof_type === 'high_risk_branch_clearance_row', `branch_review.clearance_matrix.rows[${index}].proof_type must classify high-risk clearance rows.`);
      }
    }
    assert(typeof manifest.branch_review?.review_first_packets?.evidence === 'string', 'Manifest branch_review.review_first_packets.evidence must be set.');
    assert(manifest.branch_review.review_first_packets.evidence.includes('Review-first branch packets'), 'Manifest branch_review.review_first_packets evidence must include a packet-set marker.');
    assert(hasIntegerOrNull(manifest.branch_review?.review_first_packets?.item_count), 'Manifest branch_review.review_first_packets.item_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.review_first_packets?.queue_review_first_count), 'Manifest branch_review.review_first_packets.queue_review_first_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.review_first_packets?.pass_count), 'Manifest branch_review.review_first_packets.pass_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.review_first_packets?.fail_count), 'Manifest branch_review.review_first_packets.fail_count must be an integer or null.');
    assert(Array.isArray(manifest.branch_review?.review_first_packets?.packets), 'Manifest branch_review.review_first_packets.packets must be a list.');
    for (const [index, packet] of (manifest.branch_review.review_first_packets.packets ?? []).entries()) {
      assert(typeof packet.evidence === 'string' && packet.evidence.includes('Review-first branch packet'), `branch_review.review_first_packets.packets[${index}].evidence must include a packet marker.`);
      assert(typeof packet.branch === 'string' && packet.branch.length > 0, `branch_review.review_first_packets.packets[${index}].branch must be set.`);
      assert(typeof packet.family === 'string' && packet.family.length > 0, `branch_review.review_first_packets.packets[${index}].family must be set.`);
      assert(typeof packet.priority === 'string' && packet.priority.startsWith('review_first'), `branch_review.review_first_packets.packets[${index}].priority must be review_first.`);
      assert(typeof packet.risk === 'string' && packet.risk.length > 0, `branch_review.review_first_packets.packets[${index}].risk must be set.`);
      assert(typeof packet.local_origin_state === 'string' && packet.local_origin_state.length > 0, `branch_review.review_first_packets.packets[${index}].local_origin_state must be set.`);
      assert(typeof packet.family_freshness === 'string' && packet.family_freshness.length > 0, `branch_review.review_first_packets.packets[${index}].family_freshness must be set.`);
      assert(typeof packet.focused_branch_freshness === 'string' && packet.focused_branch_freshness.length > 0, `branch_review.review_first_packets.packets[${index}].focused_branch_freshness must be set.`);
      assert(Array.isArray(packet.categories), `branch_review.review_first_packets.packets[${index}].categories must be a list.`);
      assert(Array.isArray(packet.changed_supabase_functions), `branch_review.review_first_packets.packets[${index}].changed_supabase_functions must be a list.`);
      assert(hasIntegerOrNull(packet.changed_supabase_function_count), `branch_review.review_first_packets.packets[${index}].changed_supabase_function_count must be an integer or null.`);
      assert(typeof packet.command === 'string' && packet.command.includes('report:unmerged-branch-readiness'), `branch_review.review_first_packets.packets[${index}].command must point to the focused branch report.`);
      assert(typeof packet.stop_gate === 'string' && /no checkout|no .*merge|owner approval/i.test(packet.stop_gate), `branch_review.review_first_packets.packets[${index}].stop_gate must preserve the non-mutating approval boundary.`);
      assert(typeof packet.proof_type === 'string' && packet.proof_type.length > 0, `branch_review.review_first_packets.packets[${index}].proof_type must be set.`);
      assert(packet.read_only === true, `branch_review.review_first_packets.packets[${index}].read_only must be true.`);
      assert(
        typeof packet.proof_boundary === 'string' && /read-only branch evidence|does not checkout|merge|push|discard|migrate|deploy|production approval|canonical head/i.test(packet.proof_boundary),
        `branch_review.review_first_packets.packets[${index}].proof_boundary must preserve the read-only packet evidence boundary.`,
      );
      if (packet.risk === 'high') {
        assert(
          packet.proof_type === 'high_risk_read_only_branch_packet',
          `branch_review.review_first_packets.packets[${index}].proof_type must classify high-risk focused packets.`,
        );
      }
      assert(Array.isArray(packet.changed_supabase_function_rows), `branch_review.review_first_packets.packets[${index}].changed_supabase_function_rows must be a list.`);
      for (const [rowIndex, row] of (packet.changed_supabase_function_rows ?? []).entries()) {
        assertChangedSupabaseFunctionReviewRow(row, `branch_review.review_first_packets.packets[${index}].changed_supabase_function_rows[${rowIndex}]`);
      }
      assert(typeof packet.canonical_head_comparison?.evidence === 'string' && packet.canonical_head_comparison.evidence.includes('Canonical head comparison'), `branch_review.review_first_packets.packets[${index}].canonical_head_comparison evidence must be set.`);
    }
    assert(typeof manifest.branch_review?.top_review_packet?.evidence === 'string', 'Manifest branch_review.top_review_packet.evidence must be set.');
    assert(manifest.branch_review.top_review_packet.evidence.includes('Top branch review packet'), 'Manifest branch_review.top_review_packet evidence must include a packet marker.');
    assert(Array.isArray(manifest.branch_review?.top_review_packet?.categories), 'Manifest branch_review.top_review_packet.categories must be a list.');
    assert(Array.isArray(manifest.branch_review?.top_review_packet?.changed_supabase_functions), 'Manifest branch_review.top_review_packet.changed_supabase_functions must be a list.');
    assert(hasIntegerOrNull(manifest.branch_review?.top_review_packet?.changed_supabase_function_count), 'Manifest branch_review.top_review_packet.changed_supabase_function_count must be an integer or null.');
    assert(typeof manifest.branch_review?.top_review_packet?.proof_type === 'string' && manifest.branch_review.top_review_packet.proof_type.length > 0, 'Manifest branch_review.top_review_packet.proof_type must be set.');
    assert(manifest.branch_review?.top_review_packet?.read_only === true, 'Manifest branch_review.top_review_packet.read_only must be true.');
    assert(
      typeof manifest.branch_review?.top_review_packet?.proof_boundary === 'string'
        && /read-only branch evidence|does not checkout|merge|push|discard|migrate|deploy|production approval|canonical head/i.test(manifest.branch_review.top_review_packet.proof_boundary),
      'Manifest branch_review.top_review_packet.proof_boundary must preserve the read-only focused packet boundary.',
    );
    assert(typeof manifest.branch_review?.top_review_packet?.canonical_head_comparison?.evidence === 'string', 'Manifest branch_review.top_review_packet.canonical_head_comparison.evidence must be set.');
    assert(manifest.branch_review.top_review_packet.canonical_head_comparison.evidence.includes('Canonical head comparison'), 'Manifest canonical head comparison evidence must include a comparison marker.');
    assert(typeof manifest.branch_review?.top_review_packet?.canonical_head_comparison?.status === 'string', 'Manifest canonical head comparison status must be set.');
    assert(typeof manifest.branch_review?.top_review_packet?.canonical_head_comparison?.state === 'string', 'Manifest canonical head comparison state must be set.');
    assert(hasIntegerOrNull(manifest.branch_review?.top_review_packet?.canonical_head_comparison?.local_only_count), 'Manifest canonical head comparison local_only_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.top_review_packet?.canonical_head_comparison?.origin_only_count), 'Manifest canonical head comparison origin_only_count must be an integer or null.');
    assert(Array.isArray(manifest.branch_review?.top_review_packet?.canonical_head_comparison?.local_only_subjects), 'Manifest canonical head comparison local_only_subjects must be a list.');
    assert(Array.isArray(manifest.branch_review?.top_review_packet?.canonical_head_comparison?.origin_only_subjects), 'Manifest canonical head comparison origin_only_subjects must be a list.');
    assert(typeof manifest.branch_review?.top_review_packet?.command === 'string' && manifest.branch_review.top_review_packet.command.includes('report:unmerged-branch-readiness'), 'Manifest branch_review.top_review_packet.command must point to the focused branch report.');
    assert(typeof manifest.branch_review?.top_review_packet?.stop_gate === 'string' && /no branch mutation|no checkout|no .*merge|owner approval/i.test(manifest.branch_review.top_review_packet.stop_gate), 'Manifest branch_review.top_review_packet.stop_gate must preserve the non-mutating approval boundary.');
    for (const [rowIndex, row] of (manifest.branch_review?.top_review_packet?.changed_supabase_function_rows ?? []).entries()) {
      assertChangedSupabaseFunctionReviewRow(row, `branch_review.top_review_packet.changed_supabase_function_rows[${rowIndex}]`);
    }
    if (!skipProbes) {
      assert(Number.isInteger(manifest.branch_review?.family_counts?.local_only), 'Non-skipped manifest must include numeric local-only family count.');
      assert(Number.isInteger(manifest.branch_review?.family_counts?.origin_only), 'Non-skipped manifest must include numeric origin-only family count.');
      assert(Number.isInteger(manifest.branch_review?.freshness_counts?.stale), 'Non-skipped manifest must include numeric stale branch count.');
      assert(Number.isInteger(manifest.branch_review?.freshness_counts?.aging), 'Non-skipped manifest must include numeric aging branch count.');
      assert(Number.isInteger(manifest.branch_review?.review_queue?.item_count), 'Non-skipped manifest must include numeric branch review queue item count.');
      assert(manifest.branch_review.review_queue.items.length > 0 || manifest.branch_review.review_queue.item_count === 0, 'Non-skipped manifest branch review queue must include items when queue count is positive.');
      assert(manifest.branch_review.clearance_matrix.status === manifest.branch_review.status, 'Non-skipped branch clearance matrix status must match branch review clearance status.');
      assert(manifest.branch_review.clearance_matrix.family_count === manifest.branch_review.review_queue.item_count, 'Branch clearance matrix family_count must match review queue item_count.');
      assert(manifest.branch_review.clearance_matrix.rows.length === manifest.branch_review.review_queue.item_count, 'Branch clearance matrix row count must match review queue item_count.');
      assert(Number.isInteger(manifest.branch_review?.canonical_head_decisions?.open_count), 'Non-skipped manifest must include numeric canonical-head decision open count.');
      assert(manifest.branch_review.canonical_head_decisions.items.length === manifest.branch_review.canonical_head_decisions.open_count, 'Canonical-head decision item count must match open_count.');
      assert(manifest.branch_review.canonical_head_decisions.evidence.includes('approval_gate=no checkout/merge/push/discard/deploy'), 'Canonical-head decision ledger must preserve the no-mutation approval gate.');
      assert(manifest.branch_review.canonical_head_resolution_queue.source_decision_status === manifest.branch_review.canonical_head_decisions.status, 'Canonical-head resolution queue source status must match canonical-head decision status.');
      assert(manifest.branch_review.canonical_head_resolution_queue.item_count === manifest.branch_review.canonical_head_decisions.items.length, 'Canonical-head resolution queue item_count must match canonical-head decision items.');
      assert(manifest.branch_review.canonical_head_resolution_queue.blocked_count === manifest.branch_review.canonical_head_decisions.open_count, 'Canonical-head resolution queue blocked_count must match open canonical-head decisions.');
      if (manifest.branch_review.canonical_head_resolution_queue.status === 'blocked') {
        assert(manifest.branch_review.canonical_head_resolution_queue.evidence.includes('approval_gate=queue does not checkout'), 'Canonical-head resolution queue must preserve the no-mutation approval gate while blocked.');
      } else {
        assert(manifest.branch_review.canonical_head_resolution_queue.evidence.includes('status=pass'), 'Canonical-head resolution queue pass evidence must report pass status.');
      }
      const reviewFirstOpen = (manifest.branch_review.review_queue.review_first_count ?? 0) > 0;
      const canonicalHeadOpen = (manifest.branch_review.canonical_head_decisions.open_count ?? 0) > 0;
      assert(
        ['pass', 'fail', 'blocked'].includes(manifest.branch_review.probe_status),
        'Non-skipped manifest branch_review.probe_status must report read-only probe execution only.',
      );
      if (reviewFirstOpen || canonicalHeadOpen) {
        assert(
          manifest.branch_review.status === 'blocked',
          'Manifest branch_review.status must stay blocked while review-first branch families or canonical-head decisions remain open.',
        );
      }
      if (manifest.branch_review.status === 'pass') {
        assert(!reviewFirstOpen, 'Manifest branch_review.status cannot pass while review-first branch families remain.');
        assert(!canonicalHeadOpen, 'Manifest branch_review.status cannot pass while canonical-head decisions remain.');
      }
      assert(Number.isInteger(manifest.branch_review?.review_first_packets?.item_count), 'Non-skipped manifest must include numeric review-first packet count.');
      assert(manifest.branch_review.review_first_packets.item_count === manifest.branch_review.review_first_packets.packets.length, 'Review-first packet count must match packet list length.');
      assert(
        manifest.branch_review.review_first_packets.item_count === Math.min(manifest.branch_review.review_queue.review_first_count ?? 0, 4),
        'Review-first packet count must match the bounded review-first queue length.',
      );
      assert(manifest.branch_review.review_first_packets.status === 'pass' || manifest.branch_review.review_first_packets.item_count === 0, 'Review-first packet bundle must pass when packet items exist.');
      assert(manifest.branch_review?.top_review_packet?.status === 'pass' || manifest.branch_review?.review_queue?.item_count === 0, 'Non-skipped manifest top branch review packet must pass when queue items exist.');
      assert(typeof manifest.branch_review?.top_review_packet?.branch === 'string' || manifest.branch_review?.review_queue?.item_count === 0, 'Non-skipped manifest top branch review packet must identify the focused branch when queue items exist.');
      assert(Array.isArray(manifest.branch_review?.top_review_packet?.changed_supabase_function_rows), 'Non-skipped manifest top branch review packet must include changed Supabase function review rows.');
      assert(
        manifest.branch_review.top_review_packet.changed_supabase_functions.length === manifest.branch_review.top_review_packet.changed_supabase_function_count,
        'Top branch review packet function names must match changed_supabase_function_count.',
      );
      if (manifest.branch_review.top_review_packet.canonical_head_comparison.status === 'pass') {
        assert(
          typeof manifest.branch_review.top_review_packet.canonical_head_comparison.command === 'string'
            && manifest.branch_review.top_review_packet.canonical_head_comparison.command.includes('git log --left-right --cherry-pick --oneline'),
          'Passing canonical head comparison must record the read-only git log command.',
        );
      }
    }
    assert(
      typeof manifest.outreach_plan?.email_script_boundary === 'string'
        && manifest.outreach_plan.email_script_boundary.includes('Do not claim buyer-proven 95% confidence'),
      'Manifest outreach plan must preserve the buyer-proof boundary.',
    );
    assert(typeof manifest.completion_audit === 'object' && manifest.completion_audit !== null, 'Manifest completion_audit must be an object.');
    assert(manifest.completion_audit.status === 'blocked', 'Manifest completion_audit.status must remain blocked while launch gates remain open.');
    assert(manifest.completion_audit.proof_type === 'completion_audit_current_state', 'Manifest completion_audit must classify proof as current-state completion evidence.');
    assert(Number.isInteger(manifest.completion_audit.completed_count), 'Manifest completion_audit.completed_count must be an integer.');
    assert(Number.isInteger(manifest.completion_audit.blocked_count), 'Manifest completion_audit.blocked_count must be an integer.');
    assert(Number.isInteger(manifest.completion_audit.manual_stop_count), 'Manifest completion_audit.manual_stop_count must be an integer.');
    assert(Number.isInteger(manifest.completion_audit.total_count), 'Manifest completion_audit.total_count must be an integer.');
    assert(Number.isInteger(manifest.completion_audit.goal_completion_blocked_count), 'Manifest completion_audit.goal_completion_blocked_count must be an integer.');
    assert(manifest.completion_audit.total_count >= 15, 'Manifest completion_audit must include every required deliverable and launch gate.');
    assert(manifest.completion_audit.completed_count >= 8, 'Manifest completion_audit must count present orchestrator deliverables.');
    assert(manifest.completion_audit.blocked_count >= 4, 'Manifest completion_audit must count unresolved blocker rows.');
    assert(manifest.completion_audit.manual_stop_count >= 1, 'Manifest completion_audit must count production/live proof manual-stop rows.');
    assert(
      manifest.completion_audit.goal_completion_blocked_count === manifest.completion_audit.blocked_count + manifest.completion_audit.manual_stop_count,
      'Manifest completion_audit goal-completion blockers must equal blocked plus manual-stop rows.',
    );
    assert(
      typeof manifest.completion_audit.evidence === 'string' && /Objective completion audit:.*launch_decision=blocked/i.test(manifest.completion_audit.evidence),
      'Manifest completion_audit.evidence must summarize counts and the blocked launch decision.',
    );
    assert(
      typeof manifest.completion_audit.proof_boundary === 'string'
        && /maps current manifest\/report evidence only|does not prove commercial-ready status|buyer acceptance|production approval|hosted\/live parity/i.test(manifest.completion_audit.proof_boundary),
      'Manifest completion_audit.proof_boundary must prevent treating the audit as readiness proof.',
    );
    assert(
      typeof manifest.completion_audit.stop_gate === 'string'
        && /Do not mark the launch goal complete|P0\/P1 blockers|production approval|post-deploy live proof/i.test(manifest.completion_audit.stop_gate),
      'Manifest completion_audit.stop_gate must preserve the no-completion rule.',
    );
    assert(Array.isArray(manifest.completion_audit.items), 'Manifest completion_audit.items must be a list.');
    const completionItemsByRequirement = new Map(manifest.completion_audit.items.map((item) => [item.requirement, item]));
    for (const requirement of [
      'Launch score table',
      'Gap analysis',
      'Launch blocker action queue',
      'Market pain research table',
      'Target customer table',
      'Outreach plan',
      'Fix report',
      'Structured evidence manifest',
      'ECC phase ledger',
      'Buyer evidence hard gate',
      'Source provenance release gate',
      'Branch canonical review gate',
      'Supabase advisor clearance gate',
      'Release toolchain approval gate',
      'Production approval and live proof gate',
    ]) {
      assert(completionItemsByRequirement.has(requirement), `Manifest completion_audit must include requirement: ${requirement}.`);
    }
    const completionProofTypesByRequirement = {
      'Launch score table': 'required_score_table',
      'Gap analysis': 'required_gap_analysis_table',
      'Launch blocker action queue': 'sequenced_launch_action_queue',
      'Market pain research table': 'market_pain_source_table',
      'Target customer table': 'target_segment_table',
      'Outreach plan': 'outreach_plan_boundary',
      'Fix report': 'fix_report_blocker_map',
      'Structured evidence manifest': 'schema_validation',
      'ECC phase ledger': 'ecc_phase_ledger',
      'Buyer evidence hard gate': 'buyer_evidence_hard_gate',
      'Source provenance release gate': 'source_provenance_approval_gate',
      'Branch canonical review gate': 'read_only_branch_review',
      'Supabase advisor clearance gate': 'external_advisor_clearance',
      'Release toolchain approval gate': 'release_toolchain_approval',
      'Production approval and live proof gate': 'production_approval_and_live_proof_gate',
    };
    for (const [index, item] of manifest.completion_audit.items.entries()) {
      assert(typeof item.requirement === 'string' && item.requirement.length > 0, `completion_audit.items[${index}].requirement must be set.`);
      assert(['present', 'blocked', 'manual_stop'].includes(item.status), `completion_audit.items[${index}].status must be present, blocked, or manual_stop.`);
      assert(typeof item.evidence === 'string' && item.evidence.length > 0, `completion_audit.items[${index}].evidence must be set.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `completion_audit.items[${index}].proof_type must be set.`);
      assert(typeof item.proof_boundary === 'string' && /does not|only|read-only|requires/i.test(item.proof_boundary), `completion_audit.items[${index}].proof_boundary must preserve a proof boundary.`);
      assert(typeof item.stop_gate === 'string' && /Do not/i.test(item.stop_gate), `completion_audit.items[${index}].stop_gate must preserve an explicit stop gate.`);
      assert(typeof item.next_proof_command === 'string' && item.next_proof_command.length > 0, `completion_audit.items[${index}].next_proof_command must be set.`);
      assert(isBoolean(item.blocks_goal_completion), `completion_audit.items[${index}].blocks_goal_completion must be boolean.`);
      assert(item.blocks_goal_completion === (item.status !== 'present'), `completion_audit.items[${index}].blocks_goal_completion must match item status.`);
      if (completionProofTypesByRequirement[item.requirement]) {
        assert(item.proof_type === completionProofTypesByRequirement[item.requirement], `completion_audit.items[${index}] must classify ${item.requirement} as ${completionProofTypesByRequirement[item.requirement]}.`);
      }
    }
    assert(completionItemsByRequirement.get('Buyer evidence hard gate')?.status === 'blocked', 'Completion audit must keep buyer evidence hard gate blocked.');
    assert(completionItemsByRequirement.get('Buyer evidence hard gate')?.blocks_goal_completion === true, 'Completion audit buyer evidence row must block goal completion.');
    assert(/validate:pilot-evidence --require-95|retained artifacts/i.test(completionItemsByRequirement.get('Buyer evidence hard gate')?.stop_gate ?? ''), 'Completion audit buyer evidence row must require retained 95% buyer evidence.');
    assert(completionItemsByRequirement.get('Production approval and live proof gate')?.status === 'manual_stop', 'Completion audit must keep production/live proof as manual_stop.');
    assert(completionItemsByRequirement.get('Production approval and live proof gate')?.blocks_goal_completion === true, 'Completion audit production/live proof row must block goal completion.');
    assert(/does not run deploys|prove live parity|mutate Netlify/i.test(completionItemsByRequirement.get('Production approval and live proof gate')?.proof_boundary ?? ''), 'Completion audit production/live proof boundary must not imply deploy or live parity.');
    assert(completionItemsByRequirement.get('Supabase advisor clearance gate')?.status === 'blocked', 'Completion audit must keep Supabase advisor clearance blocked.');
    assert(completionItemsByRequirement.get('Branch canonical review gate')?.status === 'blocked', 'Completion audit must keep branch canonical review blocked.');
    assert(Array.isArray(manifest.progress_updates), 'Manifest progress_updates must be a list for the current launch-evidence schema.');
    assert(manifest.progress_updates.length >= 1, 'Manifest progress_updates must record the objective-completion audit phase.');
    assert(manifest.progress_updates.some((item) => (
      item
      && item.phase === 'objective completion audit'
      && Array.isArray(item.target_matrix)
      && item.target_matrix.includes('structured evidence manifest')
      && typeof item.bottleneck === 'string'
      && item.bottleneck.includes('retained buyer artifacts')
    )), 'Manifest progress_updates must describe the objective-completion audit and remaining evidence gates.');
    assert(Array.isArray(manifest.bottleneck_log), 'Manifest bottleneck_log must be a list for the current launch-evidence schema.');
    assert(manifest.bottleneck_log.some((item) => (
      item
      && item.root_cause === 'evidence gap'
      && Array.isArray(item.top_unblock_options)
      && item.top_unblock_options.length >= 3
    )), 'Manifest bottleneck_log must record the launch evidence gap and at least three unblock options.');
    assert(manifest.market_evidence_mode === 'mixed', 'Manifest market_evidence_mode must remain mixed while public source research and unvalidated buyer hypotheses are combined.');
    assert(Array.isArray(manifest.synthetic_data_points), 'Manifest synthetic_data_points must be a list for the current launch-evidence schema.');
    assert(manifest.synthetic_data_points.length === 0, 'Manifest must not invent synthetic market evidence data points for this audit.');
    assert(typeof manifest.fix_report === 'object' && manifest.fix_report !== null, 'Manifest fix_report must be an object.');
    assert(Array.isArray(manifest.fix_report.files_changed), 'Manifest fix_report.files_changed must be a list.');
    assert(Array.isArray(manifest.fix_report.tests_run), 'Manifest fix_report.tests_run must be a list.');
    assert(
      manifest.fix_report.files_changed.includes('tests/unit/launchEvidenceManifest.test.ts'),
      'Manifest fix_report.files_changed must record the launch manifest TypeScript gate test file.',
    );
    assert(
      manifest.fix_report.tests_run.some((check) => /tsc -b --pretty false/.test(check)),
      'Manifest fix_report.tests_run must record the TypeScript build gate.',
    );
    assert(
      manifest.fix_report.tests_run.some((check) => /test:e2e:preview/.test(check)),
      'Manifest fix_report.tests_run must record the production preview build gate.',
    );
    assert(Array.isArray(manifest.implementation_decisions), 'Manifest implementation_decisions must be a list.');
    assert(Array.isArray(manifest.rejected_variants), 'Manifest rejected_variants must be a list.');
    assert(Array.isArray(manifest.code_optimization_reviews), 'Manifest code_optimization_reviews must be a list.');
    assert(manifest.implementation_decisions.length >= 1, 'Manifest must record at least one implementation decision when fix_report.files_changed is non-empty.');
    assert(manifest.rejected_variants.length >= 1, 'Manifest must record rejected variants for the safe-fix code optimization gate.');
    assert(manifest.code_optimization_reviews.length >= 1, 'Manifest must record at least one code optimization review when fix_report.files_changed is non-empty.');
    const safeFixDecision = manifest.implementation_decisions.find((item) => item.task_id === 'CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES');
    assert(safeFixDecision, 'Manifest must record the preview manifest TypeScript safe-fix implementation decision.');
    assert(
      /preview-build TypeScript gate|launch evidence manifest/i.test(safeFixDecision?.decision ?? ''),
      'Safe-fix implementation decision must name the preview TypeScript/launch evidence manifest gate.',
    );
    assert(
      Array.isArray(safeFixDecision?.files_changed)
        && safeFixDecision.files_changed.includes('scripts/report-launch-evidence-manifest.mjs')
        && safeFixDecision.files_changed.includes('tests/unit/launchEvidenceManifest.test.ts'),
      'Safe-fix implementation decision must record the changed manifest script and launch manifest test file.',
    );
    assert(
      Array.isArray(safeFixDecision?.tests_run)
        && safeFixDecision.tests_run.some((check) => /test:strategy-audit-slice/.test(check)),
      'Safe-fix implementation decision must record the broad strategy audit slice.',
    );
    assert(
      /does not clear buyer evidence|production approval|hosted\/live parity/i.test(safeFixDecision?.proof_boundary ?? ''),
      'Safe-fix implementation decision must preserve external launch gate boundaries.',
    );
    const safeFixReview = manifest.code_optimization_reviews.find((item) => item.target_task === 'CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES');
    assert(safeFixReview, 'Manifest must record the preview manifest TypeScript safe-fix code optimization review.');
    assert(safeFixReview?.policy === 'strict', 'Safe-fix code optimization review must use strict policy.');
    assert(safeFixReview?.verdict === 'pass', 'Safe-fix code optimization review must pass.');
    assert(
      Number.isInteger(safeFixReview?.minimality_score) && safeFixReview.minimality_score >= 4,
      'Safe-fix code optimization review must preserve a high minimality score.',
    );
    assert(
      Array.isArray(safeFixReview?.tests_or_checks)
        && safeFixReview.tests_or_checks.some((check) => /test:e2e:preview/.test(check)),
      'Safe-fix code optimization review must record the preview build proof.',
    );
    const approvalCircularityDecision = manifest.implementation_decisions.find((item) => item.task_id === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-VALIDATION-CIRCULARITY');
    assert(approvalCircularityDecision, 'Manifest must record the production approval validation circularity implementation decision.');
    assert(
      /self-blocking launch evidence validation|external validation proof/i.test(approvalCircularityDecision?.decision ?? ''),
      'Production approval circularity decision must name the launch evidence validation blocker and external proof.',
    );
    assert(
      /does not clear source provenance|release-readiness|branch review|Supabase advisor|buyer evidence|owner approval|deployment|hosted\/live parity/i.test(approvalCircularityDecision?.proof_boundary ?? ''),
      'Production approval circularity decision must preserve external launch gate boundaries.',
    );
    const approvalCircularityReview = manifest.code_optimization_reviews.find((item) => item.target_task === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-VALIDATION-CIRCULARITY');
    assert(approvalCircularityReview, 'Manifest must record the production approval validation circularity code optimization review.');
    assert(approvalCircularityReview?.policy === 'strict', 'Production approval circularity code optimization review must use strict policy.');
    assert(approvalCircularityReview?.verdict === 'pass', 'Production approval circularity code optimization review must pass.');
    assert(
      Array.isArray(approvalCircularityReview?.tests_or_checks)
        && approvalCircularityReview.tests_or_checks.some((check) => /report:production-approval-packet/.test(check)),
      'Production approval circularity code optimization review must record the production approval packet proof.',
    );
    const branchQueueDecision = manifest.implementation_decisions.find((item) => item.task_id === 'CEIP-SAFE-FIX-BRANCH-REVIEW-QUEUE-STATUS');
    assert(branchQueueDecision, 'Manifest must record the branch review queue status implementation decision.');
    assert(
      /branch review queue status|review-first branch blockers/i.test(branchQueueDecision?.decision ?? ''),
      'Branch review queue decision must name the queue status and review-first blockers.',
    );
    assert(
      /does not checkout|merge|push|select canonical heads|deploy|grant production approval/i.test(branchQueueDecision?.proof_boundary ?? ''),
      'Branch review queue decision must preserve read-only branch-review boundaries.',
    );
    const branchQueueReview = manifest.code_optimization_reviews.find((item) => item.target_task === 'CEIP-SAFE-FIX-BRANCH-REVIEW-QUEUE-STATUS');
    assert(branchQueueReview, 'Manifest must record the branch review queue status code optimization review.');
    assert(branchQueueReview?.policy === 'strict', 'Branch review queue status code optimization review must use strict policy.');
    assert(branchQueueReview?.verdict === 'pass', 'Branch review queue status code optimization review must pass.');
    assert(
      Array.isArray(branchQueueReview?.tests_or_checks)
        && branchQueueReview.tests_or_checks.some((check) => /report:unmerged-branch-readiness/.test(check)),
      'Branch review queue status code optimization review must record the unmerged branch report proof.',
    );
    const buyerStarterDecision = manifest.implementation_decisions.find((item) => item.task_id === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-STARTER-REGISTER-BOUNDARY');
    assert(buyerStarterDecision, 'Manifest must record the buyer evidence starter-register boundary implementation decision.');
    assert(
      /starter-only pilot evidence registers|production buyer-evidence inputs/i.test(buyerStarterDecision?.decision ?? ''),
      'Buyer evidence starter-register decision must name starter-only registers and buyer-evidence inputs.',
    );
    assert(
      /does not contact buyers|create accepted evidence|move confidence|validate 95%|commercial-ready status/i.test(buyerStarterDecision?.proof_boundary ?? ''),
      'Buyer evidence starter-register decision must preserve buyer hard-gate boundaries.',
    );
    const buyerStarterReview = manifest.code_optimization_reviews.find((item) => item.target_task === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-STARTER-REGISTER-BOUNDARY');
    assert(buyerStarterReview, 'Manifest must record the buyer evidence starter-register code optimization review.');
    assert(buyerStarterReview?.policy === 'strict', 'Buyer evidence starter-register code optimization review must use strict policy.');
    assert(buyerStarterReview?.verdict === 'pass', 'Buyer evidence starter-register code optimization review must pass.');
    assert(
      Array.isArray(buyerStarterReview?.tests_or_checks)
        && buyerStarterReview.tests_or_checks.some((check) => /check:phase-f-evidence-workspace/.test(check)),
      'Buyer evidence starter-register code optimization review must record the Phase F workspace proof.',
    );
    const releasePreflightDecision = manifest.implementation_decisions.find((item) => item.task_id === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-FOCUSED-REPORT');
    assert(releasePreflightDecision, 'Manifest must record the release preflight focused report implementation decision.');
    assert(
      /release_preflight section|focused release-preflight report/i.test(releasePreflightDecision?.decision ?? ''),
      'Release preflight focused report decision must name the release_preflight wrapper.',
    );
    assert(
      Array.isArray(releasePreflightDecision?.files_changed)
        && releasePreflightDecision.files_changed.includes('scripts/report-release-preflight-readiness.mjs')
        && releasePreflightDecision.files_changed.includes('scripts/check-release-preflight-readiness-report.mjs')
        && releasePreflightDecision.files_changed.includes('tests/unit/releasePreflightReadiness.test.ts'),
      'Release preflight focused report decision must record the report, checker, and test file.',
    );
    assert(
      /does not install Corepack|Git LFS|run full release-readiness|clear source provenance|push|deploy|hosted\/live parity/i.test(releasePreflightDecision?.proof_boundary ?? ''),
      'Release preflight focused report decision must preserve release non-execution boundaries.',
    );
    const releasePreflightReview = manifest.code_optimization_reviews.find((item) => item.target_task === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-FOCUSED-REPORT');
    assert(releasePreflightReview, 'Manifest must record the release preflight focused report code optimization review.');
    assert(releasePreflightReview?.policy === 'strict', 'Release preflight focused report code optimization review must use strict policy.');
    assert(releasePreflightReview?.verdict === 'pass', 'Release preflight focused report code optimization review must pass.');
    assert(
      Array.isArray(releasePreflightReview?.tests_or_checks)
        && releasePreflightReview.tests_or_checks.some((check) => /report:release-preflight/.test(check))
        && releasePreflightReview.tests_or_checks.some((check) => /check:release-preflight-report/.test(check)),
      'Release preflight focused report code optimization review must record focused release preflight report and check proof.',
    );
    const releasePreflightSourceOfTruthDecision = manifest.implementation_decisions.find((item) => item.task_id === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-SOURCE-OF-TRUTH-HANDLES');
    assert(releasePreflightSourceOfTruthDecision, 'Manifest must record the release preflight source-of-truth handle implementation decision.');
    assert(
      /source-of-truth docs|public release status|release posture handles/i.test(releasePreflightSourceOfTruthDecision?.decision ?? ''),
      'Release preflight source-of-truth decision must name docs, public release status, and release posture handles.',
    );
    assert(
      Array.isArray(releasePreflightSourceOfTruthDecision?.files_changed)
        && releasePreflightSourceOfTruthDecision.files_changed.includes('docs/COMMERCIAL_SOURCE_OF_TRUTH.md')
        && releasePreflightSourceOfTruthDecision.files_changed.includes('src/lib/publicReleaseStatusManifest.json')
        && releasePreflightSourceOfTruthDecision.files_changed.includes('src/lib/releasePosture.ts')
        && releasePreflightSourceOfTruthDecision.files_changed.includes('tests/unit/statusPagePosture.test.ts'),
      'Release preflight source-of-truth decision must record docs, public status, release posture, and status-page test files.',
    );
    assert(
      /does not install Corepack|Git LFS|run full release-readiness|clear source provenance|push|deploy|hosted\/live parity/i.test(releasePreflightSourceOfTruthDecision?.proof_boundary ?? ''),
      'Release preflight source-of-truth decision must preserve release non-execution boundaries.',
    );
    const releasePreflightSourceOfTruthReview = manifest.code_optimization_reviews.find((item) => item.target_task === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-SOURCE-OF-TRUTH-HANDLES');
    assert(releasePreflightSourceOfTruthReview, 'Manifest must record the release preflight source-of-truth handle code optimization review.');
    assert(releasePreflightSourceOfTruthReview?.policy === 'strict', 'Release preflight source-of-truth code optimization review must use strict policy.');
    assert(releasePreflightSourceOfTruthReview?.verdict === 'pass', 'Release preflight source-of-truth code optimization review must pass.');
    assert(
      Array.isArray(releasePreflightSourceOfTruthReview?.tests_or_checks)
        && releasePreflightSourceOfTruthReview.tests_or_checks.some((check) => /check:commercial-source/.test(check))
        && releasePreflightSourceOfTruthReview.tests_or_checks.some((check) => /check:public-release-status/.test(check))
        && releasePreflightSourceOfTruthReview.tests_or_checks.some((check) => /check:release-preflight-report/.test(check)),
      'Release preflight source-of-truth code optimization review must record source-doc, public-status, and focused release-preflight proof.',
    );
    const strategyAuditTimeoutDecision = manifest.implementation_decisions.find((item) => item.task_id === 'CEIP-SAFE-FIX-STRATEGY-AUDIT-SLICE-TIMEOUT-BUDGET');
    assert(strategyAuditTimeoutDecision, 'Manifest must record the strategy audit slice timeout budget implementation decision.');
    assert(
      /production approval|strategy completion audit|strategy-audit release slice/i.test(strategyAuditTimeoutDecision?.decision ?? ''),
      'Strategy audit timeout decision must name production approval, strategy completion audit, and the release slice.',
    );
    assert(
      Array.isArray(strategyAuditTimeoutDecision?.files_changed)
        && strategyAuditTimeoutDecision.files_changed.includes('tests/unit/productionApprovalPacket.test.ts')
        && strategyAuditTimeoutDecision.files_changed.includes('tests/unit/strategyCompletionAudit.test.ts')
        && strategyAuditTimeoutDecision.files_changed.includes('tests/unit/launchEvidenceManifest.test.ts'),
      'Strategy audit timeout decision must record the production approval, strategy completion, and launch manifest test files.',
    );
    assert(
      /does not clear source provenance|install Corepack|buyer evidence|Supabase advisors|owner approval|deploy|hosted\/live parity/i.test(strategyAuditTimeoutDecision?.proof_boundary ?? ''),
      'Strategy audit timeout decision must preserve external launch gate boundaries.',
    );
    const strategyAuditTimeoutReview = manifest.code_optimization_reviews.find((item) => item.target_task === 'CEIP-SAFE-FIX-STRATEGY-AUDIT-SLICE-TIMEOUT-BUDGET');
    assert(strategyAuditTimeoutReview, 'Manifest must record the strategy audit slice timeout budget code optimization review.');
    assert(strategyAuditTimeoutReview?.policy === 'strict', 'Strategy audit timeout code optimization review must use strict policy.');
    assert(strategyAuditTimeoutReview?.verdict === 'pass', 'Strategy audit timeout code optimization review must pass.');
    assert(
      Array.isArray(strategyAuditTimeoutReview?.tests_or_checks)
        && strategyAuditTimeoutReview.tests_or_checks.some((check) => /productionApprovalPacket\.test\.ts/.test(check))
        && strategyAuditTimeoutReview.tests_or_checks.some((check) => /strategyCompletionAudit\.test\.ts/.test(check))
        && strategyAuditTimeoutReview.tests_or_checks.some((check) => /test:strategy-audit-slice/.test(check)),
      'Strategy audit timeout code optimization review must record focused production approval, strategy completion, and broad strategy slice proof.',
    );
    assert(Array.isArray(manifest.adversarial_reviews), 'Manifest adversarial_reviews must be a list.');
    assert(manifest.adversarial_reviews.length >= 5, 'Manifest adversarial_reviews must include the core launch review lanes.');
    const adversarialProofTypesByLane = {
      'buyer evidence': 'buyer_evidence_adversarial_review',
      'production approval': 'production_approval_adversarial_review',
      'release toolchain': 'release_toolchain_adversarial_review',
      'Supabase advisor clearance': 'external_advisor_adversarial_review',
      'branch risk': 'branch_risk_adversarial_review',
    };
    for (const [index, review] of manifest.adversarial_reviews.entries()) {
      assert(typeof review.lane === 'string' && review.lane.length > 0, `adversarial_reviews[${index}].lane must be set.`);
      assert(typeof review.finding === 'string' && review.finding.length > 0, `adversarial_reviews[${index}].finding must be set.`);
      assert(typeof review.decision === 'string' && review.decision.length > 0, `adversarial_reviews[${index}].decision must be set.`);
      assert(typeof review.proof_type === 'string' && review.proof_type.length > 0, `adversarial_reviews[${index}].proof_type must be set.`);
      assert(typeof review.proof_boundary === 'string' && review.proof_boundary.length > 0, `adversarial_reviews[${index}].proof_boundary must be set.`);
      assert(typeof review.stop_gate === 'string' && /do not/i.test(review.stop_gate), `adversarial_reviews[${index}].stop_gate must preserve an explicit no-claim gate.`);
      if (adversarialProofTypesByLane[review.lane]) {
        assert(
          review.proof_type === adversarialProofTypesByLane[review.lane],
          `adversarial_reviews[${index}] must classify ${review.lane} as ${adversarialProofTypesByLane[review.lane]}.`,
        );
      }
      if (review.lane === 'buyer evidence') {
        assert(/does not create buyer acceptance|retained artifacts|95% confidence|commercial-ready status/i.test(review.proof_boundary), 'Buyer evidence adversarial review must not imply buyer proof.');
      }
      if (review.lane === 'production approval') {
        assert(/does not grant production approval|run deploys|push|prove live parity/i.test(review.proof_boundary), 'Production approval adversarial review must not imply deploy authorization.');
      }
      if (review.lane === 'release toolchain') {
        assert(/does not install tools|run release-readiness|clear provenance|push|deploy|approve release/i.test(review.proof_boundary), 'Release toolchain adversarial review must not imply release readiness.');
      }
      if (review.lane === 'Supabase advisor clearance') {
        assert(/does not access dashboards|reauthorize connectors|run migrations|alter secrets|clear findings|prove RLS\/performance clearance/i.test(review.proof_boundary), 'Supabase advisor adversarial review must not imply external clearance.');
      }
      if (review.lane === 'branch risk') {
        assert(/does not checkout|merge|push|discard branches|select canonical heads|run migrations|deploy|grant approval/i.test(review.proof_boundary), 'Branch risk adversarial review must preserve read-only branch boundaries.');
      }
    }
    assert(manifest.ecc_ledger?.decision === 'blocked', 'Manifest ECC ledger decision must remain blocked.');

    const validation = run('python3', [validatorPath, manifestPath, '--require-repo-exists']);
    if (validation.status !== 0) {
      failures.push(`Launch evidence schema validation exited ${validation.status}.`);
      if (validation.error.trim()) failures.push(validation.error.trim());
      if (validation.stderr.trim()) failures.push(validation.stderr.trim());
      if (validation.stdout.trim()) failures.push(validation.stdout.trim());
    } else if (!validation.stdout.includes('VALID')) {
      failures.push('Launch evidence schema validation did not report VALID.');
      if (validation.stdout.trim()) failures.push(validation.stdout.trim());
    }
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error('Launch evidence manifest check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Launch evidence manifest check passed: blocked decision, proof buckets, buyer evidence, buyer hard-gate deficits, buyer evidence acquisition matrix, buyer evidence remediation queue, Supabase advisor evidence, Supabase advisor clearance deficits, Supabase advisor remediation queue, release preflight deficits, release toolchain probe ledger, release preflight clearance matrix, release preflight remediation queue, launch action queue, launch evidence validation prerequisite, production approval prerequisite queue, production approval request packet, post-deploy live proof gate queue, source provenance isolation ledger, source provenance resolution queue, canonical-head decision deficits, canonical-head resolution queue, source provenance, branch families, branch freshness, branch review queue, review-first branch packets, top branch packet, canonical head comparison, code optimization evidence, pain map, target map, buyer boundary, and schema validation are consistent.');
