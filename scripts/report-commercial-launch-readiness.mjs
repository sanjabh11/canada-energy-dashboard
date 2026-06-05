#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const validatorPath = '/Users/sanjayb/.codex/skills/commercial-launch-readiness-orchestrator/scripts/validate_launch_evidence.py';
const args = process.argv.slice(2);
const values = new Map();
const failures = [];
let skipProbes = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--skip-probes') {
    skipProbes = true;
    continue;
  }
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[index + 1] ?? '';
    index += 1;
    if (!['output'].includes(key)) {
      failures.push(`Unknown option: ${arg}`);
    } else if (!value || value.startsWith('--')) {
      failures.push(`${arg} requires a value.`);
    } else if (values.has(key)) {
      failures.push(`Duplicate option: ${arg}`);
    } else {
      values.set(key, value);
    }
    continue;
  }
  failures.push(`Unexpected positional argument: ${arg}`);
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run report:commercial-launch-readiness

Options:
  --output <path>    Write the Markdown report to a file instead of stdout only.
  --skip-probes      Skip local readiness probes for fast unit tests.
`);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 30 * 1024 * 1024,
  });
  return {
    status: typeof result.status === 'number' ? result.status : 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error.message ?? result.error) : '',
  };
}

function text(value) {
  if (Array.isArray(value)) return value.map(text).join('<br>');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value ?? '')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll('\n', '<br>')
    .replaceAll('|', '\\|')
    .trim();
}

function mdList(items) {
  if (!Array.isArray(items) || items.length === 0) return 'None.';
  return items.map((item) => `- ${text(item)}`).join('\n');
}

function row(cells) {
  return `| ${cells.map(text).join(' | ')} |`;
}

function sourceList(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return '';
  return sources.map((source) => `<${source}>`).join('<br>');
}

function proofBucketLabel(key) {
  return {
    hosted_live: 'Hosted/live',
    local: 'Local',
    repo_artifact: 'Repo artifact',
    candidate_shadow: 'Candidate/shadow',
    roadmap: 'Roadmap',
  }[key] ?? key;
}

function scoreEvidence(dimension) {
  return {
    security: 'Client env, claim-boundary, source-anchor, and security/procurement proof surfaces are release-gated locally.',
    readiness: 'Release readiness is locally gateable, but production approval depends on clean source provenance and owner approval.',
    sellability: 'Top proof-pack routes and target segments are defined, with strong buyer pain fit.',
    evidence: 'Buyer-proven evidence is absent; no production register or retained redacted artifacts are present.',
    overall: 'Commercial launch status is blocked by P0 buyer-evidence and deploy-provenance gates.',
  }[dimension] ?? '';
}

function scoreCaveat(dimension, manifest) {
  return {
    security: 'Supabase advisor evidence and owner-side permission checks remain separate approval gates.',
    readiness: manifest.launch_decision === 'blocked'
      ? 'A passing local gate is not deploy approval.'
      : 'Recheck after every deploy candidate.',
    sellability: 'Buyer proof can change route ranking and scores.',
    evidence: 'Scaffolding, fixtures, and constructed demos do not count as buyer acceptance.',
    overall: 'Do not report commercial-ready while unresolved P0 gaps remain.',
  }[dimension] ?? '';
}

function renderReport(manifest, validationText) {
  const scores = manifest.scores ?? {};
  const gaps = Array.isArray(manifest.gaps) ? manifest.gaps : [];
  const openP0 = gaps.filter((gap) => gap?.severity === 'P0' && gap?.status === 'open').length;
  const openP1 = gaps.filter((gap) => gap?.severity === 'P1' && gap?.status === 'open').length;
  const buyerDeficits = manifest.buyer_evidence?.hard_gate_deficits ?? {};
  const buyerDeficitItems = Array.isArray(buyerDeficits.items) ? buyerDeficits.items : [];
  const buyerRemediationQueue = buyerDeficits.remediation_queue ?? {};
  const buyerRemediationItems = Array.isArray(buyerRemediationQueue.items) ? buyerRemediationQueue.items : [];
  const supabaseDeficits = manifest.supabase_advisor?.clearance_deficits ?? {};
  const supabaseDeficitItems = Array.isArray(supabaseDeficits.items) ? supabaseDeficits.items : [];
  const supabaseRemediationQueue = supabaseDeficits.remediation_queue ?? {};
  const supabaseRemediationItems = Array.isArray(supabaseRemediationQueue.items) ? supabaseRemediationQueue.items : [];
  const releasePreflight = manifest.release_preflight ?? {};
  const releasePreflightItems = Array.isArray(releasePreflight.items) ? releasePreflight.items : [];
  const releaseToolchainProbeLedger = releasePreflight.toolchain_probe_ledger ?? {};
  const releaseToolchainProbeItems = Array.isArray(releaseToolchainProbeLedger.items) ? releaseToolchainProbeLedger.items : [];
  const releaseRemediationQueue = releasePreflight.remediation_queue ?? {};
  const releaseRemediationItems = Array.isArray(releaseRemediationQueue.items) ? releaseRemediationQueue.items : [];
  const productionApproval = manifest.production_approval ?? {};
  const productionApprovalQueue = productionApproval.prerequisite_queue ?? {};
  const productionApprovalItems = Array.isArray(productionApprovalQueue.items) ? productionApprovalQueue.items : [];
  const postDeployLiveProof = manifest.post_deploy_live_proof ?? {};
  const postDeployLiveProofQueue = postDeployLiveProof.gate_queue ?? {};
  const postDeployLiveProofItems = Array.isArray(postDeployLiveProofQueue.items) ? postDeployLiveProofQueue.items : [];
  const launchActionQueue = manifest.launch_action_queue ?? {};
  const launchActionItems = Array.isArray(launchActionQueue.items) ? launchActionQueue.items : [];
  const sourceResolutionQueue = manifest.source_provenance?.resolution_queue ?? {};
  const sourceResolutionItems = Array.isArray(sourceResolutionQueue.items) ? sourceResolutionQueue.items : [];
  const branchCanonicalDecisions = manifest.branch_review?.canonical_head_decisions ?? {};
  const branchCanonicalDecisionItems = Array.isArray(branchCanonicalDecisions.items) ? branchCanonicalDecisions.items : [];
  const painPoints = Array.isArray(manifest.pain_points) ? manifest.pain_points : [];
  const targetCustomers = Array.isArray(manifest.target_customers) ? manifest.target_customers : [];
  const proofBuckets = manifest.proof_buckets ?? {};
  const outreach = manifest.outreach_plan ?? {};
  const fixReport = manifest.fix_report ?? {};
  const reviews = Array.isArray(manifest.adversarial_reviews) ? manifest.adversarial_reviews : [];
  const ecc = manifest.ecc_ledger ?? {};
  const hasTenPainSources = painPoints.length >= 10 && painPoints.every((item) => (
    Array.isArray(item.source_evidence)
    && item.source_evidence.some((source) => /^https?:\/\//.test(source))
  ));
  const hasProofBuckets = ['hosted_live', 'local', 'repo_artifact', 'candidate_shadow', 'roadmap']
    .every((bucket) => Object.hasOwn(proofBuckets, bucket));

  return `# CEIP Commercial Launch Readiness Report

Generated: ${text(manifest.run?.generated_at)}
Repo: ${text(manifest.repo?.name)} (${text(manifest.repo?.path)})
Commit: ${text(manifest.repo?.commit)}
Mode: ${text(manifest.run?.mode)}

## Launch Decision

Decision: \`${text(manifest.launch_decision)}\`

| Dimension | Score / 5 | Evidence | Caveat |
|---|---:|---|---|
${['security', 'readiness', 'sellability', 'evidence', 'overall'].map((dimension) => row([
    dimension[0].toUpperCase() + dimension.slice(1),
    scores[dimension],
    scoreEvidence(dimension),
    scoreCaveat(dimension, manifest),
  ])).join('\n')}

## Gap Analysis

| Gap | Severity | Proof Type | Proof Boundary | Stop Gate | Evidence | Framework Mapping | Buyer Impact | Fix | Status |
|---|---|---|---|---|---|---|---|---|---|
${gaps.map((gap) => row([
    gap.gap,
    gap.severity,
    gap.proof_type,
    gap.proof_boundary,
    gap.stop_gate,
    gap.evidence,
    gap.framework_mapping,
    gap.buyer_impact,
    gap.fix,
    gap.status,
  ])).join('\n')}

## Launch Blocker Action Queue

Open action items: ${text(launchActionQueue.blocked_count ?? 'unknown')}/${text(launchActionQueue.item_count ?? 'unknown')}. This is a sequenced execution plan only; it does not deploy, merge, contact buyers, mutate branches, clear source provenance, or claim launch readiness.

| Rank | Phase | Blocker | Owner | Action | Proof Command | Stop Gate | Status |
|---:|---|---|---|---|---|---|---|
${launchActionItems.length > 0
    ? launchActionItems.map((item) => row([
      item.rank,
      item.phase,
      item.blocker,
      item.owner,
      item.action,
      item.proof_command,
      item.stop_gate,
      item.status,
    ])).join('\n')
    : row(['n/a', 'queue_missing', 'not available', 'operator', 'Regenerate the launch evidence manifest.', 'corepack pnpm run report:launch-evidence-manifest', launchActionQueue.evidence ?? 'No launch action queue was captured.', launchActionQueue.status ?? 'unknown'])}

## Source Provenance Resolution Queue

Open source-provenance decisions: ${text(sourceResolutionQueue.blocked_count ?? 'unknown')}/${text(sourceResolutionQueue.item_count ?? 'unknown')}. This queue is a decision aid only; it does not commit, unstage, stash, revert, delete, rename, move, or clear source provenance.

| Rank | File Path | Old Path | Source Status | Index Status | Worktree Status | Staging State | Tracked | Ignored By Rule | Decision Required | Proof Command | Stop Gate | Resolution Status |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
${sourceResolutionItems.length > 0
    ? sourceResolutionItems.map((item) => row([
      item.rank,
      item.file_path,
      item.old_path ?? 'n/a',
      item.source_status ?? 'unknown',
      item.index_status,
      item.worktree_status,
      item.staging_state,
      item.tracked ? 'yes' : 'no',
      item.ignored_by_rule ? 'yes' : 'no',
      item.decision_required,
      item.proof_command,
      item.stop_gate,
      item.status,
    ])).join('\n')
    : row(['n/a', 'none', 'n/a', sourceResolutionQueue.status ?? 'unknown', 'n/a', 'n/a', 'clean', 'n/a', 'n/a', 'No dirty source paths were captured.', 'corepack pnpm run report:production-approval-packet -- --skip-release-readiness', sourceResolutionQueue.evidence ?? 'No source provenance resolution queue was captured.', sourceResolutionQueue.status ?? 'unknown'])}

## Branch Canonical Head Decision Deficits

Open canonical-head decisions: ${text(branchCanonicalDecisions.open_count ?? 'unknown')}/${text(branchCanonicalDecisions.total_count ?? 'unknown')}. This ledger is read-only; it does not checkout, merge, push, discard, deploy, or select a branch head for the owner.

| Rank | Family | Local Ref | Origin Ref | State | Risk | Freshness | Decision Needed | Proof Command | Stop Gate | Status |
|---:|---|---|---|---|---|---|---|---|---|---|
${branchCanonicalDecisionItems.length > 0
    ? branchCanonicalDecisionItems.map((item) => row([
      item.rank,
      item.family,
      item.local_ref ?? 'n/a',
      item.origin_ref ?? 'n/a',
      item.local_origin_state,
      item.highest_risk,
      item.freshness,
      item.decision_needed,
      item.proof_command,
      item.stop_gate,
      item.status,
    ])).join('\n')
    : row(['n/a', 'none', 'n/a', 'n/a', branchCanonicalDecisions.status ?? 'unknown', 'n/a', 'n/a', 'No canonical-head decision rows were captured.', 'corepack pnpm run report:unmerged-branch-readiness', branchCanonicalDecisions.evidence ?? 'No canonical head decision ledger was captured.', branchCanonicalDecisions.status ?? 'unknown'])}

## Buyer Evidence Hard Gate Deficits

Open hard-gate deficits: ${text(buyerDeficits.open_count ?? 'unknown')}/${text(buyerDeficits.total_count ?? 'unknown')}. Generated scaffolding, outreach headers, and starter registers do not count as buyer proof.

| Requirement | Current | Needed | Status | Next Action |
|---|---|---|---|---|
${buyerDeficitItems.length > 0
    ? buyerDeficitItems.map((item) => row([
      item.requirement,
      item.current,
      item.needed,
      item.status,
      item.next_action,
    ])).join('\n')
    : row(['Deficit ledger', 'not available', 'Run report:buyer-evidence-readiness', buyerDeficits.status ?? 'unknown', buyerDeficits.evidence ?? 'No deficit ledger was captured.'])}

## Buyer Evidence Remediation Queue

Open buyer-evidence actions: ${text(buyerRemediationQueue.blocked_count ?? 'unknown')}/${text(buyerRemediationQueue.item_count ?? 'unknown')}. This queue is a decision aid only; it does not contact buyers, create accepted evidence, move confidence, attach artifacts, validate 95%, or claim buyer acceptance.

| Rank | Requirement | Current | Needed | Deficit Status | Owner | Action | Proof Command | Stop Gate | Resolution Status |
|---:|---|---|---|---|---|---|---|---|---|
${buyerRemediationItems.length > 0
    ? buyerRemediationItems.map((item) => row([
      item.rank,
      item.requirement,
      item.current,
      item.needed,
      item.deficit_status,
      item.owner,
      item.action,
      item.proof_command,
      item.stop_gate,
      item.status,
    ])).join('\n')
    : row(['n/a', 'none', 'no buyer hard-gate actions available', 'Run report:buyer-evidence-readiness before claiming Phase F inputs', buyerRemediationQueue.status ?? 'unknown', 'buyer_operator', 'Regenerate buyer evidence readiness with current evidence roots.', 'corepack pnpm run report:buyer-evidence-readiness', buyerRemediationQueue.evidence ?? 'No buyer evidence remediation queue was captured.', buyerRemediationQueue.status ?? 'unknown'])}

## Supabase Advisor Clearance Deficits

Open Supabase advisor clearance deficits: ${text(supabaseDeficits.open_count ?? 'unknown')}/${text(supabaseDeficits.total_count ?? 'unknown')}. CLI app lint, repo security artifacts, and public status cards do not substitute for current Supabase Security and Performance Advisor clearance.

| Requirement | Current | Needed | Status | Next Action |
|---|---|---|---|---|
${supabaseDeficitItems.length > 0
    ? supabaseDeficitItems.map((item) => row([
      item.requirement,
      item.current,
      item.needed,
      item.status,
      item.next_action,
    ])).join('\n')
    : row(['Deficit ledger', 'not available', 'Fix Supabase advisor access and rerun advisors', supabaseDeficits.status ?? 'unknown', supabaseDeficits.evidence ?? 'No Supabase advisor clearance deficit ledger was captured.'])}

## Supabase Advisor Remediation Queue

Open Supabase advisor actions: ${text(supabaseRemediationQueue.blocked_count ?? 'unknown')}/${text(supabaseRemediationQueue.item_count ?? 'unknown')}. This queue is a decision aid only; it does not authorize connectors, access the dashboard, rerun advisors, mutate the database, record secrets, or claim advisor clearance.

| Rank | Requirement | Current | Needed | Deficit Status | Owner | Action | Proof Command | Stop Gate | Resolution Status |
|---:|---|---|---|---|---|---|---|---|---|
${supabaseRemediationItems.length > 0
    ? supabaseRemediationItems.map((item) => row([
      item.rank,
      item.requirement,
      item.current,
      item.needed,
      item.deficit_status,
      item.owner,
      item.action,
      item.proof_command,
      item.stop_gate,
      item.status,
    ])).join('\n')
    : row(['n/a', 'none', 'all Supabase advisor rows passed', 'owner approval and release gates still apply before deploy', supabaseRemediationQueue.status ?? 'unknown', 'account_admin', 'Keep advisor evidence current before requesting production approval.', manifest.supabase_advisor?.command ?? 'Supabase advisor review', supabaseRemediationQueue.evidence ?? 'No Supabase advisor remediation queue was captured.', supabaseRemediationQueue.status ?? 'unknown'])}

## Release Toolchain And Approval Deficits

Open release preflight deficits: ${text(releasePreflight.open_count ?? 'unknown')}/${text(releasePreflight.total_count ?? 'unknown')}. Direct pnpm checks, skipped approval packets, and local commit hooks do not substitute for Corepack-pinned release-readiness, Git LFS push-path proof, clean source provenance, and explicit owner approval.

| Requirement | Current | Needed | Status | Next Action |
|---|---|---|---|---|
${releasePreflightItems.length > 0
    ? releasePreflightItems.map((item) => row([
      item.requirement,
      item.current,
      item.needed,
      item.status,
      item.next_action,
    ])).join('\n')
    : row(['Release preflight ledger', 'not available', 'Run report:launch-evidence-manifest', releasePreflight.status ?? 'unknown', releasePreflight.evidence ?? 'No release preflight deficit ledger was captured.'])}

## Release Toolchain Probe Ledger

Open release-toolchain probes: ${text(releaseToolchainProbeLedger.open_count ?? 'unknown')}/${text(releaseToolchainProbeLedger.item_count ?? 'unknown')}. This ledger is proof collection only; it does not install tools, run release-readiness, push, deploy, clear source provenance, or grant production approval.

| Probe | Command | Current | Expected | Status | Evidence Boundary | Next Action |
|---|---|---|---|---|---|---|
${releaseToolchainProbeItems.length > 0
    ? releaseToolchainProbeItems.map((item) => row([
      item.label,
      item.command,
      item.current,
      item.expected,
      item.status,
      item.evidence_boundary,
      item.next_action,
    ])).join('\n')
    : row(['Release toolchain probe ledger', 'corepack pnpm --version; git lfs version', 'not available', 'Run report:launch-evidence-manifest without --skip-probes', releaseToolchainProbeLedger.status ?? 'unknown', releaseToolchainProbeLedger.evidence ?? 'No release toolchain probe ledger was captured.', 'Refresh toolchain probes before release-readiness evidence is claimed.'])}

## Release Preflight Remediation Queue

Open release-preflight actions: ${text(releaseRemediationQueue.blocked_count ?? 'unknown')}/${text(releaseRemediationQueue.item_count ?? 'unknown')}. This queue is a decision aid only; it does not install tools, clear source provenance, run release-readiness, push, deploy, or grant production approval.

| Rank | Requirement | Current | Needed | Deficit Status | Owner | Action | Proof Command | Stop Gate | Resolution Status |
|---:|---|---|---|---|---|---|---|---|---|
${releaseRemediationItems.length > 0
    ? releaseRemediationItems.map((item) => row([
      item.rank,
      item.requirement,
      item.current,
      item.needed,
      item.deficit_status,
      item.owner,
      item.action,
      item.proof_command,
      item.stop_gate,
      item.status,
    ])).join('\n')
    : row(['n/a', 'none', 'all release preflight rows passed', 'owner approval and live proof still apply before deploy', releaseRemediationQueue.status ?? 'unknown', 'operator', 'Keep release evidence current before requesting approval.', 'corepack pnpm run report:launch-evidence-manifest', releaseRemediationQueue.evidence ?? 'No release preflight remediation queue was captured.', releaseRemediationQueue.status ?? 'unknown'])}

## Production Approval Prerequisite Queue

Open production-approval prerequisites: ${text(productionApprovalQueue.blocked_count ?? 'unknown')}/${text(productionApprovalQueue.item_count ?? 'unknown')}. This queue is a decision aid only; it does not grant owner approval, deploy, push, merge, mutate branches, contact buyers, access Supabase, clear source provenance, or claim post-deploy live parity.

| Rank | Prerequisite | Current | Needed | Owner | Proof Command | Stop Gate | Status |
|---:|---|---|---|---|---|---|---|
${productionApprovalItems.length > 0
    ? productionApprovalItems.map((item) => row([
      item.rank,
      item.prerequisite,
      item.current,
      item.needed,
      item.owner,
      item.proof_command,
      item.stop_gate,
      item.status,
    ])).join('\n')
    : row(['n/a', 'none', 'production approval queue missing', 'Regenerate the launch evidence manifest before requesting approval', 'operator', 'corepack pnpm run report:launch-evidence-manifest', productionApprovalQueue.evidence ?? productionApproval.stop_gate ?? 'No production approval prerequisite queue was captured.', productionApprovalQueue.status ?? 'unknown'])}

## Post-Deploy Live Proof Gate Queue

Open post-deploy live-proof gates: ${text(postDeployLiveProofQueue.blocked_count ?? 'unknown')}/${text(postDeployLiveProofQueue.item_count ?? 'unknown')}. This queue is a decision aid only; it does not deploy, push, rebuild, mutate Netlify, access live accounts, run browser smoke, or claim hosted/live parity before explicit approval and a successful post-deploy gate.

| Rank | Gate | Current | Needed | Owner | Proof Command | Stop Gate | Status |
|---:|---|---|---|---|---|---|---|
${postDeployLiveProofItems.length > 0
    ? postDeployLiveProofItems.map((item) => row([
      item.rank,
      item.gate,
      item.current,
      item.needed,
      item.owner,
      item.proof_command,
      item.stop_gate,
      item.status,
    ])).join('\n')
    : row(['n/a', 'none', 'post-deploy live proof queue missing', 'Regenerate the launch evidence manifest before making live parity claims', 'operator', 'corepack pnpm run check:post-deploy-live', postDeployLiveProofQueue.evidence ?? postDeployLiveProof.stop_gate ?? 'No post-deploy live proof gate queue was captured.', postDeployLiveProofQueue.status ?? 'unknown'])}

## Proof Buckets

| Bucket | Evidence | Claim Allowed |
|---|---|---|
${Object.entries(proofBuckets).map(([bucket, evidence]) => row([
    proofBucketLabel(bucket),
    evidence,
    bucket === 'hosted_live'
      ? 'Hosted facts only after current live checks pass.'
      : bucket === 'local'
        ? 'Local verification only; not deploy approval or buyer proof.'
        : bucket === 'repo_artifact'
          ? 'Repo artifact proof only.'
          : bucket === 'candidate_shadow'
            ? 'Constructed or candidate demonstration only.'
            : 'Future work until implemented and verified.',
  ])).join('\n')}

## Top 10 Pain Points

| Rank | Pain Point | Affected Buyer | Source Evidence | Willingness-To-Pay Signal | Repo Proof Fit | Confidence |
|---:|---|---|---|---|---|---:|
${painPoints.map((item) => row([
    item.rank,
    item.pain_point,
    item.affected_buyer,
    sourceList(item.source_evidence),
    item.willingness_to_pay_signal,
    item.repo_proof_fit,
    item.confidence,
  ])).join('\n')}

## Top 10 Target Customers Or Segments

| Rank | Account/Segment | Pain | Trigger | Decision Maker | Outreach Angle | Proof To Show | Confidence |
|---:|---|---|---|---|---|---|---:|
${targetCustomers.map((item) => row([
    item.rank,
    item.account_or_segment,
    item.pain,
    item.trigger,
    item.decision_maker,
    item.outreach_angle,
    item.proof_to_show,
    item.confidence,
  ])).join('\n')}

## Outreach Plan

### 30/60/90 Plan

| Window | Action | Proof Needed | Success Metric |
|---|---|---|---|
${row(['0-30 days', outreach.phase_30_days, 'Real anonymized buyer activity only.', 'Workspace exists and readiness report still blocks confidence movement.'])}
${row(['31-60 days', outreach.phase_60_days, 'Retained redacted artifacts and reviewer acceptance.', 'Candidate register validates without direct identifiers.'])}
${row(['61-90 days', outreach.phase_90_days, 'Hard 95% gate output and commercial signal evidence.', 'validate:pilot-evidence --require-95 passes or blockers stay explicit.'])}

### Email Script

Subject: Redacted proof-pack review for [buyer lane]

Body:

${text(outreach.email_script_boundary)}

### LinkedIn Script

Message:

${text(outreach.linkedin_script_boundary)}

### Demo Narrative

Opening: CEIP is a proof-pack-first Canadian energy intelligence product with strict claim boundaries.

Proof: ${text(outreach.demo_narrative)}

Ask: Request a redacted buyer-file review that can flow into the Phase F evidence workspace.

### Objection Handling

| Objection | Response | Proof |
|---|---|---|
${row(['Where is buyer proof?', 'Buyer proof is still blocked until the hard 95% gate passes.', 'report:buyer-evidence-readiness and validate:pilot-evidence --require-95.'])}
${row(['Can this be deployed now?', 'Production deployment still requires clean source provenance, release readiness, and explicit owner approval.', 'report:production-approval-packet.'])}
${row(['Are these live utility customers?', 'No. Candidate routes and constructed proof packs are not live customer adoption.', 'Proof buckets in this report and COMMERCIAL_SOURCE_OF_TRUTH.md.'])}
${row(['Is security approved?', 'Repo-backed security artifacts exist, but owner-side Supabase advisor/security evidence remains a gate.', 'utility-security proof pack plus Supabase advisor gap.'])}

## Fix Report

| Item | Files Changed | Tests Run | Status | Approval Gate |
|---|---|---|---|---|
${row(['Manifest command boundary', fixReport.files_changed_by_manifest_command, fixReport.current_required_checks, 'read-only unless --output is used', fixReport.safe_fix_boundary])}
${(fixReport.unresolved_blockers ?? []).map((blocker, index) => row([
    `Unresolved blocker ${index + 1}`,
    'n/a',
    'See launch evidence manifest and production approval packet.',
    blocker,
    'Requires buyer evidence, clean provenance, branch review, or owner approval.',
  ])).join('\n')}

## Adversarial Review

| Lane | Proof Type | Proof Boundary | Stop Gate | Claim Challenged | Result | Remaining Risk |
|---|---|---|---|---|---|---|
${reviews.map((review) => row([
    review.lane,
    review.proof_type,
    review.proof_boundary,
    review.stop_gate,
    review.finding,
    review.decision,
    review.decision === 'blocked' ? 'Decision remains blocked.' : 'Recheck if evidence changes.',
  ])).join('\n')}

## Evidence Validation

| Check | Result | Evidence |
|---|---|---|
${row(['validate_launch_evidence.py', validationText.includes('VALID') ? 'pass' : 'fail', validationText])}
${row(['Launch decision gate', manifest.launch_decision === 'blocked' && openP0 > 0 ? 'pass' : 'review', `${openP0} open P0 gap(s), ${openP1} open P1 gap(s), decision=${manifest.launch_decision}.`])}
${row(['P0/P1 blocker gate', openP0 > 0 || openP1 > 0 ? 'blocked' : 'clear', `Open P0=${openP0}; open P1=${openP1}.`])}
${row(['Source evidence gate', hasTenPainSources ? 'pass' : 'fail', `${painPoints.length} pain points; ${targetCustomers.length} target customers or segments.`])}
${row(['Proof bucket gate', hasProofBuckets ? 'pass' : 'fail', Object.keys(proofBuckets).join(', ')])}

## ECC Ledger

| Field | Value |
|---|---|
${Object.entries({
    Route: ecc.route,
    Tier: ecc.tier,
    Mode: ecc.mode,
    'Skills/Tools': ecc.skills_tools,
    Baseline: ecc.baseline,
    Checks: ecc.checks,
    Delta: ecc.delta,
    Reflection: ecc.reflection,
    Decision: ecc.decision,
    'Next Adjustment': ecc.next_adjustment,
  }).map(([key, value]) => row([key, value])).join('\n')}
`;
}

if (failures.length > 0) {
  console.error('Commercial launch readiness report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

const tempRoot = mkdtempSync(path.join(tmpdir(), 'ceip-commercial-launch-report-'));
const manifestPath = path.join(tempRoot, 'launch-evidence.json');

try {
  const manifestArgs = ['scripts/report-launch-evidence-manifest.mjs', '--output', manifestPath];
  if (skipProbes) manifestArgs.push('--skip-probes');
  const manifestResult = run(process.execPath, manifestArgs);
  if (manifestResult.status !== 0) {
    failures.push(`Launch evidence manifest exited ${manifestResult.status}.`);
    if (manifestResult.error.trim()) failures.push(manifestResult.error.trim());
    if (manifestResult.stderr.trim()) failures.push(manifestResult.stderr.trim());
    if (manifestResult.stdout.trim()) failures.push(manifestResult.stdout.trim());
  }

  let manifest = null;
  if (failures.length === 0) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      failures.push(`Unable to read generated manifest: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  let validationText = '';
  if (failures.length === 0) {
    const validation = run('python3', [validatorPath, manifestPath, '--require-repo-exists']);
    validationText = `${validation.stdout}\n${validation.stderr}`.trim();
    if (validation.status !== 0) {
      failures.push(`Launch evidence schema validation exited ${validation.status}.`);
      if (validation.error.trim()) failures.push(validation.error.trim());
      if (validationText) failures.push(validationText);
    }
  }

  if (failures.length === 0 && manifest) {
    const markdown = renderReport(manifest, validationText);
    const outputPath = values.get('output');
    if (outputPath) {
      const absoluteOutput = path.resolve(repoRoot, outputPath);
      if (existsSync(absoluteOutput) && !/\.(md|markdown|txt)$/i.test(absoluteOutput)) {
        failures.push(`Refusing to overwrite non-Markdown output path: ${outputPath}`);
      } else {
        writeFileSync(absoluteOutput, markdown, 'utf8');
      }
    }
    if (failures.length === 0) process.stdout.write(markdown);
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error('Commercial launch readiness report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
