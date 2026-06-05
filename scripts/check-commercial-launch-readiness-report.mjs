#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
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
  corepack pnpm run check:commercial-launch-readiness-report

Options:
  --skip-probes      Skip local readiness probes for fast unit-level checks.
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

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function extractSection(markdown, heading) {
  const start = markdown.indexOf(`## ${heading}`);
  if (start < 0) return '';
  const next = markdown.indexOf('\n## ', start + 1);
  return markdown.slice(start, next < 0 ? markdown.length : next);
}

function countDataRows(section) {
  return section
    .split(/\r?\n/)
    .filter((line) => (
      line.startsWith('| ')
      && !line.includes('---')
      && !line.startsWith('| Rank |')
      && !line.startsWith('| Dimension |')
      && !line.startsWith('| Gap |')
      && !line.startsWith('| Bucket |')
      && !line.startsWith('| Window |')
      && !line.startsWith('| Objection |')
      && !line.startsWith('| Item |')
      && !line.startsWith('| Requirement |')
      && !line.startsWith('| Lane |')
      && !line.startsWith('| Check |')
      && !line.startsWith('| Field |')
    ))
    .length;
}

const tempRoot = mkdtempSync(path.join(tmpdir(), 'ceip-commercial-launch-report-check-'));
const reportPath = path.join(tempRoot, 'commercial-launch-readiness.md');

try {
  if (failures.length === 0) {
    const reportArgs = ['scripts/report-commercial-launch-readiness.mjs', '--output', reportPath];
    if (skipProbes) reportArgs.push('--skip-probes');

    const report = run(process.execPath, reportArgs);
    if (report.status !== 0) {
      failures.push(`Commercial launch readiness report exited ${report.status}.`);
      if (report.error.trim()) failures.push(report.error.trim());
      if (report.stderr.trim()) failures.push(report.stderr.trim());
      if (report.stdout.trim()) failures.push(report.stdout.trim());
    } else {
      const fileText = readFileSync(reportPath, 'utf8');
      assert(report.stdout === fileText, 'Report stdout must match the --output Markdown file.');
      assertReport(fileText, { skipProbes });
    }
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

function assertReport(markdown, options = {}) {
  const requiredSections = [
    'Launch Decision',
    'Gap Analysis',
    'Launch Blocker Action Queue',
    'Source Provenance Resolution Queue',
    'Source Provenance Isolation Ledger',
    'Branch Canonical Head Decision Deficits',
    'Branch Canonical Head Resolution Queue',
    'Branch Clearance Matrix',
    'Buyer Evidence Hard Gate Deficits',
    'Buyer Evidence Acquisition Matrix',
    'Buyer Evidence Remediation Queue',
    'Supabase Advisor Clearance Deficits',
    'Supabase Advisor Remediation Queue',
    'Release Toolchain And Approval Deficits',
    'Release Toolchain Probe Ledger',
    'Release Preflight Clearance Matrix',
    'Release Preflight Remediation Queue',
    'Production Approval Prerequisite Queue',
    'Production Approval Request Packet',
    'Post-Deploy Live Proof Gate Queue',
    'Proof Buckets',
    'Top 10 Pain Points',
    'Top 10 Target Customers Or Segments',
    'Outreach Plan',
    'Fix Report',
    'Code Optimization Report',
    'Objective Completion Audit',
    'Adversarial Review',
    'Evidence Validation',
    'ECC Ledger',
  ];

  assert(markdown.startsWith('# CEIP Commercial Launch Readiness Report'), 'Report must start with the CEIP launch readiness heading.');
  for (const section of requiredSections) {
    assert(markdown.includes(`## ${section}`), `Report is missing required section: ${section}.`);
  }
  assert(markdown.includes('Decision: `blocked`'), 'Report must keep the current launch decision blocked.');
  assert(!markdown.includes('Decision: `commercial-ready`'), 'Report must not claim commercial-ready status.');
  assert(markdown.includes('| Evidence | 1 |'), 'Report must keep the evidence score at 1 while buyer proof is absent.');
  assert(markdown.includes('Do not claim buyer-proven 95% confidence'), 'Report must preserve the buyer-proof outreach boundary.');
  assert(markdown.includes('Local verification only; not deploy approval or buyer proof.'), 'Report must preserve the local-proof boundary.');
  assert(markdown.includes('Scaffolding, fixtures, and constructed demos do not count as buyer acceptance.'), 'Report must preserve the no-scaffolding-as-buyer-proof boundary.');
  assert(markdown.includes('Buyer evidence review'), 'Report must include structured buyer-evidence readiness from the manifest.');
  assert(markdown.includes('starter_only_registers='), 'Report must surface starter-only register counts from the manifest.');
  assert(markdown.includes('## Launch Blocker Action Queue'), 'Report must include the launch blocker action queue table.');
  assert(markdown.includes('Launch blocker action queue'), 'Report must include structured launch action queue evidence from the manifest.');
  assert(markdown.includes('This is a sequenced execution plan only'), 'Report must preserve the action-queue non-execution boundary.');
  assert(markdown.includes('| source_provenance |'), 'Report must include the source provenance action phase.');
  assert(markdown.includes('| launch_evidence_validation |'), 'Report must include the launch evidence validation action phase.');
  assert(markdown.includes('launch evidence validation must pass before a deploy approval request'), 'Report must include the launch evidence validation action blocker.');
  assert(markdown.includes('| release_toolchain |'), 'Report must include the release toolchain action phase.');
  assert(markdown.includes('release-toolchain probe(s) open'), 'Report must include release toolchain probe ledger state in the launch action queue.');
  assert(markdown.includes('Refresh the release toolchain probe ledger'), 'Report must include the release toolchain probe refresh action.');
  assert(markdown.includes('| branch_review |'), 'Report must include the branch review action phase.');
  assert(markdown.includes('| supabase_advisor |'), 'Report must include the Supabase advisor action phase.');
  assert(markdown.includes('| buyer_evidence |'), 'Report must include the buyer evidence action phase.');
  assert(markdown.includes('| production_approval |'), 'Report must include the production approval action phase.');
  assert(markdown.includes('| post_deploy_live_proof |'), 'Report must include the post-deploy live proof action phase.');
  assert(
    /\| 6 \| buyer_evidence \| (?:[1-9]\d*|unknown) buyer hard-gate deficit\(s\) remain \| buyer_operator \|[^|\n]+\| corepack pnpm run validate:pilot-evidence -- path\/to\/register\.csv --require-95 --evidence-root path\/to\/redacted-artifacts \|[^|\n]+\| blocked \|/.test(markdown),
    'Report must keep buyer evidence action blocked while hard-gate deficits remain.',
  );
  assert(markdown.includes('corepack pnpm run check:post-deploy-live'), 'Report must include the post-deploy live proof command.');
  assert(markdown.includes('## Source Provenance Resolution Queue'), 'Report must include the source provenance resolution queue table.');
  assert(markdown.includes('Source provenance resolution queue'), 'Report must include structured source-provenance resolution evidence from the manifest.');
  assert(markdown.includes('This queue is a decision aid only'), 'Report must preserve the source-provenance non-execution boundary.');
  assert(markdown.includes('without explicit owner intent'), 'Report must preserve the source-provenance owner-intent stop gate.');
  assert(markdown.includes('corepack pnpm run report:production-approval-packet -- --skip-release-readiness'), 'Report must include the source-provenance proof command.');
  assert(markdown.includes('## Source Provenance Isolation Ledger'), 'Report must include the source provenance isolation ledger table.');
  assert(markdown.includes('source_provenance_isolation_ledger'), 'Report must classify the source provenance isolation ledger proof type.');
  assert(markdown.includes('Source provenance isolation ledger'), 'Report must include structured source provenance isolation evidence from the manifest.');
  assert(markdown.includes('dirty-source release impact only'), 'Report must preserve the source isolation proof boundary.');
  assert(markdown.includes('Do not request deploy approval'), 'Report must preserve the source isolation stop gate.');
  assert(markdown.includes('git status --porcelain=v1'), 'Report must include the source isolation proof command.');
  assert(markdown.includes('## Branch Canonical Head Decision Deficits'), 'Report must include the branch canonical-head decision deficit table.');
  assert(markdown.includes('Canonical head decision ledger'), 'Report must include structured canonical-head decision evidence from the manifest.');
  assert(markdown.includes('This ledger is read-only'), 'Report must preserve the canonical-head decision non-execution boundary.');
  assert(
    /No checkout, merge, push, discard, deploy|does not checkout, merge, push, discard, deploy/i.test(markdown),
    'Report must preserve the canonical-head no-mutation stop gate.',
  );
  assert(markdown.includes('corepack pnpm run report:unmerged-branch-readiness'), 'Report must include focused branch review proof commands.');
  assert(markdown.includes('## Branch Canonical Head Resolution Queue'), 'Report must include the branch canonical-head resolution queue table.');
  assert(markdown.includes('Canonical head resolution queue'), 'Report must include structured canonical-head resolution evidence from the manifest.');
  assert(markdown.includes('canonical_head_resolution_queue'), 'Report must classify canonical-head resolution as an owner-decision queue.');
  assert(markdown.includes('owner-decision planning only'), 'Report must preserve canonical-head resolution planning-only semantics.');
  assert(markdown.includes('does not checkout, merge, push, discard, delete, select canonical heads'), 'Report must preserve the canonical-head resolution no-mutation boundary.');
  assert(markdown.includes('Do not mark branch review clear'), 'Report must preserve the canonical-head resolution no-clearance stop gate.');
  assert(markdown.includes('## Branch Clearance Matrix'), 'Report must include the branch clearance matrix table.');
  assert(markdown.includes('read_only_branch_clearance_matrix'), 'Report must classify the branch clearance matrix as read-only branch evidence.');
  assert(markdown.includes('Branch clearance matrix'), 'Report must include structured branch clearance matrix evidence from the manifest.');
  assert(markdown.includes('does not checkout, merge, push, discard, select canonical heads'), 'Report must preserve the branch clearance matrix no-mutation proof boundary.');
  assert(markdown.includes('Do not mark branch review clear'), 'Report must preserve the branch clearance matrix no-clearance stop gate.');
  assert(markdown.includes('probe_skipped') || markdown.includes('review_first') || markdown.includes('drift_review'), 'Report must include branch clearance blocker classes.');
  assert(markdown.includes('Batchable intake-packet outreach rows'), 'Report must include buyer-evidence actionability counts from the manifest.');
  assert(markdown.includes('## Buyer Evidence Hard Gate Deficits'), 'Report must include the buyer hard-gate deficit table.');
  assert(markdown.includes('Generated scaffolding, outreach headers, and starter registers do not count as buyer proof.'), 'Report must preserve the no-scaffolding buyer-deficit boundary.');
  assert(markdown.includes('## Buyer Evidence Acquisition Matrix'), 'Report must include the buyer evidence acquisition matrix table.');
  assert(markdown.includes('Buyer evidence acquisition matrix'), 'Report must include structured buyer evidence acquisition evidence from the manifest.');
  assert(markdown.includes('buyer_evidence_acquisition_matrix'), 'Report must classify the buyer evidence acquisition matrix proof type.');
  assert(markdown.includes('does not contact buyers, create accepted evidence, move confidence'), 'Report must preserve the buyer acquisition no-contact and no-fabrication boundary.');
  assert(markdown.includes('Do not mark buyer evidence ready'), 'Report must preserve the buyer acquisition stop gate.');
  assert(markdown.includes('| Outreach response log intake |'), 'Report must include the outreach response acquisition row.');
  assert(markdown.includes('| Production pilot evidence register |'), 'Report must include the production register acquisition row.');
  assert(markdown.includes('| Retained-artifact 95% validation |'), 'Report must include the retained-artifact validation acquisition row.');
  assert(markdown.includes('## Buyer Evidence Remediation Queue'), 'Report must include the buyer evidence remediation queue table.');
  assert(markdown.includes('Buyer evidence remediation queue'), 'Report must include structured buyer evidence remediation from the manifest.');
  assert(markdown.includes('does not contact buyers'), 'Report must preserve the buyer remediation no-contact boundary.');
  assert(markdown.includes('create accepted evidence, move confidence'), 'Report must preserve the buyer remediation no-evidence boundary.');
  if (options.skipProbes) {
    assert(markdown.includes('Buyer hard-gate deficit ledger skipped'), 'Skipped report must preserve the skipped buyer-deficit evidence boundary.');
    assert(markdown.includes('Buyer evidence remediation queue skipped'), 'Skipped report must preserve the skipped buyer remediation queue boundary.');
  } else {
    assert(markdown.includes('| Utility forecast lane |'), 'Report must include the utility forecast buyer-deficit row.');
    assert(markdown.includes('| Retained-artifact 95% validation |'), 'Report must include the retained-artifact validation buyer-deficit row.');
    assert(markdown.includes('corepack pnpm run validate:pilot-evidence'), 'Report must include the retained-artifact 95% validation proof command.');
    assert(markdown.includes('Do not claim 95% buyer-proven confidence'), 'Report must preserve the buyer 95% stop gate.');
  }
  assert(markdown.includes('Supabase advisor review'), 'Report must include structured Supabase advisor evidence from the manifest.');
  assert(markdown.includes('Supabase security/performance advisor clearance remains unavailable'), 'Report must preserve the Supabase advisor clearance launch blocker.');
  assert(markdown.includes('## Supabase Advisor Clearance Deficits'), 'Report must include the Supabase advisor clearance deficit table.');
  assert(markdown.includes('Supabase advisor clearance deficit ledger'), 'Report must include structured Supabase advisor clearance deficit evidence from the manifest.');
  assert(markdown.includes('CLI app lint, repo security artifacts, and public status cards do not substitute'), 'Report must preserve the Supabase advisor substitution boundary.');
  assert(markdown.includes('| Security advisor evidence |'), 'Report must include the security advisor evidence deficit row.');
  assert(markdown.includes('| Performance advisor evidence |'), 'Report must include the performance advisor evidence deficit row.');
  assert(markdown.includes('| Advisor clearance claim |'), 'Report must include the no-clearance-claim deficit row.');
  assert(markdown.includes('## Supabase Advisor Remediation Queue'), 'Report must include the Supabase advisor remediation queue table.');
  assert(markdown.includes('Supabase advisor remediation queue'), 'Report must include structured Supabase advisor remediation evidence from the manifest.');
  assert(markdown.includes('does not authorize connectors'), 'Report must preserve the Supabase remediation no-authorization boundary.');
  assert(markdown.includes('mutate the database'), 'Report must preserve the Supabase remediation no-database-mutation boundary.');
  assert(markdown.includes('Supabase Dashboard > Database > Security Advisor'), 'Report must include the Security Advisor proof command.');
  assert(markdown.includes('Supabase Dashboard > Database > Performance Advisor'), 'Report must include the Performance Advisor proof command.');
  assert(markdown.includes('## Release Toolchain And Approval Deficits'), 'Report must include the release toolchain and approval deficit table.');
  assert(markdown.includes('Release toolchain and approval deficit ledger'), 'Report must include structured release-preflight evidence from the manifest.');
  assert(markdown.includes('Direct pnpm checks, skipped approval packets, and local commit hooks do not substitute'), 'Report must preserve the release-preflight substitution boundary.');
  assert(markdown.includes('## Release Toolchain Probe Ledger'), 'Report must include the release toolchain probe ledger table.');
  assert(markdown.includes('Release Toolchain Probe Ledger'), 'Report must include structured release toolchain probe evidence from the manifest.');
  assert(markdown.includes('| Corepack pnpm resolver | corepack pnpm --version |'), 'Report must include the Corepack toolchain probe command.');
  assert(markdown.includes('| Git LFS push-path proof | git lfs version |'), 'Report must include the Git LFS push-path probe command.');
  assert(markdown.includes('does not install tools, run release-readiness'), 'Report must preserve the release toolchain probe non-execution boundary.');
  assert(markdown.includes('Corepack/Git LFS probe ledger'), 'Report must include release toolchain probe state in production approval prerequisites.');
  assert(markdown.includes('## Release Preflight Clearance Matrix'), 'Report must include the release preflight clearance matrix table.');
  assert(markdown.includes('Release preflight clearance matrix'), 'Report must include structured release preflight clearance evidence from the manifest.');
  assert(markdown.includes('release_preflight_clearance_matrix'), 'Report must classify the release preflight clearance matrix proof type.');
  assert(markdown.includes('Open release clearance rows'), 'Report must include release clearance row counts.');
  assert(markdown.includes('does not install tools, run release-readiness, clear source provenance, push, deploy'), 'Report must preserve the release clearance non-execution boundary.');
  assert(markdown.includes('Do not mark release approval ready'), 'Report must preserve the release clearance stop gate.');
  assert(markdown.includes('| Corepack pnpm resolver |'), 'Report must include the Corepack resolver deficit row.');
  assert(markdown.includes('| Release-readiness execution |'), 'Report must include the release-readiness execution deficit row.');
  assert(markdown.includes('| Git LFS push-path proof |'), 'Report must include the Git LFS push-path deficit row.');
  assert(markdown.includes('| Explicit owner production approval |'), 'Report must include the explicit owner approval deficit row.');
  assert(markdown.includes('## Release Preflight Remediation Queue'), 'Report must include the release preflight remediation queue table.');
  assert(markdown.includes('Release preflight remediation queue'), 'Report must include structured release remediation evidence from the manifest.');
  assert(markdown.includes('This queue is a decision aid only'), 'Report must preserve the release remediation non-execution boundary.');
  assert(markdown.includes('does not install tools'), 'Report must preserve the release remediation no-tool-install boundary.');
  assert(markdown.includes('corepack pnpm run check:release-readiness'), 'Report must include the release-readiness remediation proof command.');
  assert(markdown.includes('corepack pnpm run check:production-deploy-request'), 'Report must include the production approval request proof command.');
  assert(markdown.includes('## Production Approval Prerequisite Queue'), 'Report must include the production approval prerequisite queue table.');
  assert(markdown.includes('Production approval prerequisite queue'), 'Report must include structured production approval prerequisite evidence from the manifest.');
  assert(markdown.includes('does not grant owner approval'), 'Report must preserve the production approval non-approval boundary.');
  assert(markdown.includes('does not grant owner approval, deploy, push, merge, mutate branches'), 'Report must preserve the production approval no-mutation boundary.');
  assert(markdown.includes('| Launch evidence validation |'), 'Report must include the launch evidence validation prerequisite row.');
  assert(markdown.includes('validation command is external to manifest generation; production approval packet must attach passing check:launch-evidence-manifest output'), 'Report must not imply launch evidence validation is self-certified by the manifest.');
  assert(markdown.includes('corepack pnpm run check:launch-evidence-manifest'), 'Report must include the launch evidence validation proof command.');
  assert(markdown.includes('| Explicit owner production approval |'), 'Report must include the explicit owner approval prerequisite row.');
  assert(markdown.includes('| Post-deploy live proof boundary |'), 'Report must include the post-deploy live proof boundary row.');
  assert(markdown.includes('## Production Approval Request Packet'), 'Report must include the production approval request packet table.');
  assert(markdown.includes('Production approval request packet'), 'Report must include structured production approval request packet evidence from the manifest.');
  assert(markdown.includes('production_approval_request_packet'), 'Report must classify the production approval request packet proof type.');
  assert(markdown.includes('Request eligible: `no`'), 'Report must keep production approval request ineligible while pre-request blockers remain.');
  assert(markdown.includes('organizes request evidence only'), 'Report must preserve request-packet evidence-only semantics.');
  assert(markdown.includes('does not grant owner approval, run deploys, push, merge, mutate branches'), 'Report must preserve request-packet no-approval and no-mutation boundaries.');
  assert(markdown.includes('Do not request or claim production approval'), 'Report must preserve the request-packet stop gate.');
  assert(markdown.includes('not granted by this manifest or report'), 'Report must not imply owner approval is granted.');
  assert(markdown.includes('not eligible before explicit approved deploy'), 'Report must not imply post-deploy live proof is eligible before approval.');
  assert(markdown.includes('## Objective Completion Audit'), 'Report must include the objective completion audit table.');
  assert(markdown.includes('completion_audit_current_state'), 'Report must classify the completion audit as current-state evidence.');
  assert(markdown.includes('Objective completion audit:'), 'Report must include objective completion audit evidence counts.');
  assert(markdown.includes('This audit maps current manifest/report evidence only'), 'Report must preserve the completion-audit proof boundary.');
  assert(markdown.includes('Do not mark the launch goal complete or claim readiness'), 'Report must preserve the completion-audit no-completion stop gate.');
  assert(markdown.includes('| Buyer evidence hard gate | blocked | yes |'), 'Completion audit must keep buyer evidence blocked.');
  assert(markdown.includes('| Production approval and live proof gate | manual_stop | yes |'), 'Completion audit must keep production/live proof as a manual stop.');
  assert(markdown.includes('| Supabase advisor clearance gate | blocked | yes |'), 'Completion audit must keep Supabase advisor clearance blocked.');
  assert(markdown.includes('| Branch canonical review gate | blocked | yes |'), 'Completion audit must keep branch canonical review blocked.');
  assert(/\| Source provenance release gate \| (?:blocked|present) \| (?:yes|no) \|/.test(markdown), 'Completion audit must include the source provenance release gate.');
  assert(/\| Release toolchain approval gate \| (?:blocked|present) \| (?:yes|no) \|/.test(markdown), 'Completion audit must include the release toolchain approval gate.');
  assert(markdown.includes('Schema validation proves shape and conservative boundaries only'), 'Completion audit must not imply schema validation proves readiness.');
  assert(markdown.includes('does not run deploys, mutate Netlify, push, or prove live parity'), 'Completion audit must preserve the production/live proof boundary.');
  assert(markdown.includes('## Post-Deploy Live Proof Gate Queue'), 'Report must include the post-deploy live proof gate queue table.');
  assert(markdown.includes('Post-deploy live proof gate queue'), 'Report must include structured post-deploy live proof gate evidence from the manifest.');
  assert(markdown.includes('does not deploy, push, rebuild, mutate Netlify'), 'Report must preserve the post-deploy no-live-mutation boundary.');
  assert(markdown.includes('| Live public metadata |'), 'Report must include the live public metadata gate row.');
  assert(markdown.includes('| Live static dist parity |'), 'Report must include the live static dist parity gate row.');
  assert(markdown.includes('| Hosted proof-pack route smoke |'), 'Report must include the hosted proof-pack smoke gate row.');
  assert(markdown.includes('| Current-source hosted parity claim |'), 'Report must include the hosted parity claim boundary row.');
  assert(markdown.includes('corepack pnpm run check:live-public-metadata'), 'Report must include the live public metadata proof command.');
  assert(markdown.includes('corepack pnpm run check:live-static-parity'), 'Report must include the live static parity proof command.');
  assert(markdown.includes('corepack pnpm run test:browser:hosted:proof-packs'), 'Report must include the hosted proof-pack smoke proof command.');
  assert(markdown.includes('Source provenance:'), 'Report must include source provenance evidence from the manifest.');
  assert(markdown.includes('staging_state='), 'Report must include staged/unstaged source provenance classification from the manifest.');
  assert(markdown.includes('Branch family review'), 'Report must include branch-family evidence from the manifest.');
  assert(markdown.includes('High-risk, local/origin split, or stale/aging unmerged branches'), 'Report must preserve the branch-family and freshness launch blocker.');
  assert(markdown.includes('Branch freshness review'), 'Report must include branch freshness evidence from the manifest.');
  assert(markdown.includes('Branch review queue'), 'Report must include the actionable branch review queue evidence from the manifest.');
  assert(markdown.includes('Review-first branch packets'), 'Report must include review-first focused branch packet evidence from the manifest.');
  assert(markdown.includes('Top branch review packet'), 'Report must include the focused top branch review packet evidence from the manifest.');
  assert(markdown.includes('Canonical head comparison'), 'Report must include the local-vs-origin canonical head comparison evidence from the manifest.');
  assert(markdown.includes('approval_gate=no checkout/merge/deploy/migration/push'), 'Report must preserve the top branch packet no-mutation approval gate.');
  if (!options.skipProbes) {
    assert(markdown.includes('Branch review queue: status='), 'Report must surface branch review queue status evidence from the manifest.');
    assert(markdown.includes('blocked='), 'Report must surface branch review queue blocked-count evidence from the manifest.');
    assert(markdown.includes('local_only='), 'Report must surface canonical-head local-only commit counts when branch probes run.');
    assert(markdown.includes('review_first'), 'Report must surface review-first branch queue priority when branch probes run.');
    assert(markdown.includes('canonical_states='), 'Report must surface review-first canonical head states when branch probes run.');
  }
  assert(markdown.includes('| validate_launch_evidence.py | pass | VALID |'), 'Report must include a passing launch evidence schema validation row.');
  assert(markdown.includes('Open P0='), 'Report must include P0/P1 blocker evidence.');
  assert(markdown.includes('commercial-ready'), 'Report must mention commercial-ready only as a blocked/do-not-claim boundary.');

  for (const bucket of ['Hosted/live', 'Local', 'Repo artifact', 'Candidate/shadow', 'Roadmap']) {
    assert(markdown.includes(`| ${bucket} |`), `Report is missing proof bucket: ${bucket}.`);
  }

  const painSection = extractSection(markdown, 'Top 10 Pain Points');
  const targetSection = extractSection(markdown, 'Top 10 Target Customers Or Segments');
  const launchSection = extractSection(markdown, 'Launch Decision');
  const gapSection = extractSection(markdown, 'Gap Analysis');
  const actionQueueSection = extractSection(markdown, 'Launch Blocker Action Queue');
  const sourceResolutionSection = extractSection(markdown, 'Source Provenance Resolution Queue');
  const sourceIsolationSection = extractSection(markdown, 'Source Provenance Isolation Ledger');
  const branchCanonicalDecisionSection = extractSection(markdown, 'Branch Canonical Head Decision Deficits');
  const branchCanonicalResolutionSection = extractSection(markdown, 'Branch Canonical Head Resolution Queue');
  const branchClearanceSection = extractSection(markdown, 'Branch Clearance Matrix');
  const buyerDeficitSection = extractSection(markdown, 'Buyer Evidence Hard Gate Deficits');
  const buyerAcquisitionSection = extractSection(markdown, 'Buyer Evidence Acquisition Matrix');
  const buyerRemediationSection = extractSection(markdown, 'Buyer Evidence Remediation Queue');
  const supabaseDeficitSection = extractSection(markdown, 'Supabase Advisor Clearance Deficits');
  const supabaseRemediationSection = extractSection(markdown, 'Supabase Advisor Remediation Queue');
  const releasePreflightSection = extractSection(markdown, 'Release Toolchain And Approval Deficits');
  const releaseToolchainProbeSection = extractSection(markdown, 'Release Toolchain Probe Ledger');
  const releaseClearanceSection = extractSection(markdown, 'Release Preflight Clearance Matrix');
  const releaseRemediationSection = extractSection(markdown, 'Release Preflight Remediation Queue');
  const productionApprovalSection = extractSection(markdown, 'Production Approval Prerequisite Queue');
  const productionApprovalRequestSection = extractSection(markdown, 'Production Approval Request Packet');
  const postDeployLiveProofSection = extractSection(markdown, 'Post-Deploy Live Proof Gate Queue');
  const completionAuditSection = extractSection(markdown, 'Objective Completion Audit');
  const adversarialSection = extractSection(markdown, 'Adversarial Review');
  const evidenceSection = extractSection(markdown, 'Evidence Validation');
  const eccSection = extractSection(markdown, 'ECC Ledger');

  assert(countDataRows(launchSection) === 5, 'Launch score table must include five dimensions.');
  assert(countDataRows(gapSection) >= 4, 'Gap analysis table must include current P0/P1 launch blockers.');
  assert(gapSection.includes('Proof Type') && gapSection.includes('Proof Boundary') && gapSection.includes('Stop Gate'), 'Gap analysis table must expose proof type, proof boundary, and stop gate columns.');
  for (const proofType of [
    'buyer_evidence_hard_gate',
    'source_provenance_approval_gate',
    'branch_review_clearance_gap',
    'external_advisor_clearance_gap',
    'release_toolchain_approval_gap',
  ]) {
    assert(gapSection.includes(proofType), `Gap analysis table must include proof type ${proofType}.`);
  }
  assert(/does not prove buyer acceptance|Do not claim buyer-proven 95% confidence/i.test(gapSection), 'Gap analysis table must preserve buyer-evidence proof boundaries.');
  assert(/does not checkout|Do not checkout/i.test(gapSection), 'Gap analysis table must preserve branch-review stop gates.');
  assert(/does not resolve Corepack|Do not treat local pnpm checks/i.test(gapSection), 'Gap analysis table must preserve release-toolchain stop gates.');
  assert(countDataRows(actionQueueSection) >= 6, 'Launch blocker action queue must include the launch execution phases.');
  assert(countDataRows(sourceResolutionSection) >= 1, 'Source provenance resolution queue must include at least the clean/dirty boundary row.');
  assert(countDataRows(sourceIsolationSection) >= 1, 'Source provenance isolation ledger must include at least the clean/dirty boundary row.');
  assert(sourceIsolationSection.includes('Proof Type') && sourceIsolationSection.includes('Stop Gate') && sourceIsolationSection.includes('Blocks Release Source Gate'), 'Source provenance isolation ledger must expose proof type, stop gate, and release-source blocking columns.');
  assert(/source_provenance_isolation_ledger|source_rename_decision|staged_source_decision|untracked_source_decision/i.test(sourceIsolationSection), 'Source provenance isolation ledger must include isolation or dirty-path proof types.');
  assert(/does not mutate source|clear source provenance|release-readiness|production approval/i.test(sourceIsolationSection), 'Source provenance isolation ledger must preserve no-mutation and no-approval boundaries.');
  assert(countDataRows(branchCanonicalDecisionSection) >= 1, 'Branch canonical-head decision table must include at least the skipped/empty boundary row.');
  assert(countDataRows(branchCanonicalResolutionSection) >= 1, 'Branch canonical-head resolution queue must include at least the skipped/empty boundary row.');
  assert(branchCanonicalResolutionSection.includes('Proof Type') && branchCanonicalResolutionSection.includes('Proof Boundary') && branchCanonicalResolutionSection.includes('Stop Gate') && branchCanonicalResolutionSection.includes('Blocks Branch Gate'), 'Branch canonical-head resolution queue must expose proof type, proof boundary, stop gate, and branch blocking columns.');
  assert(/canonical_head_resolution_queue|canonical_head_decision|local_only_canonical_head_decision|origin_only_canonical_head_decision|split_canonical_head_decision/i.test(branchCanonicalResolutionSection), 'Branch canonical-head resolution queue must include canonical decision proof types.');
  assert(/does not checkout|merge|push|discard|delete|select canonical heads|deploy|production approval/i.test(branchCanonicalResolutionSection), 'Branch canonical-head resolution queue must preserve no-mutation and no-approval boundaries.');
  assert(countDataRows(branchClearanceSection) >= 1, 'Branch clearance matrix must include at least the skipped boundary row or current branch-family rows.');
  assert(branchClearanceSection.includes('Proof Type') && branchClearanceSection.includes('Stop Gate') && branchClearanceSection.includes('Clearance Status'), 'Branch clearance matrix table must expose proof type, stop gate, and clearance status columns.');
  assert(/read_only_branch_clearance_matrix|high_risk_branch_clearance_row|canonical_head_branch_clearance_row|drift_branch_clearance_row/i.test(branchClearanceSection), 'Branch clearance matrix must include read-only branch clearance proof types.');
  assert(/corepack pnpm run report:unmerged-branch-readiness|Run branch probes/i.test(branchClearanceSection), 'Branch clearance matrix must include focused branch proof commands.');
  assert(countDataRows(buyerDeficitSection) >= 1, 'Buyer evidence hard-gate deficit table must include at least one row.');
  assert(countDataRows(buyerAcquisitionSection) >= 10, 'Buyer evidence acquisition matrix must include outreach, register, lane, artifact, confidence, commitment, and validation rows.');
  assert(buyerAcquisitionSection.includes('Proof Type') && buyerAcquisitionSection.includes('Proof Boundary') && buyerAcquisitionSection.includes('Stop Gate'), 'Buyer evidence acquisition matrix must expose proof type, proof boundary, and stop gate columns.');
  assert(/outreach_intake_acquisition|production_register_acquisition|retained_artifact_validation/i.test(buyerAcquisitionSection), 'Buyer evidence acquisition matrix must include acquisition and validation proof types.');
  assert(/does not contact buyers|create accepted evidence|move confidence|validate 95%|claim buyer acceptance/i.test(buyerAcquisitionSection), 'Buyer evidence acquisition matrix must preserve acquisition-only proof boundaries.');
  assert(countDataRows(buyerRemediationSection) >= 1, 'Buyer evidence remediation queue must include at least one row or skipped boundary.');
  assert(countDataRows(supabaseDeficitSection) >= 3, 'Supabase advisor clearance deficit table must include the key advisor clearance rows.');
  assert(countDataRows(supabaseRemediationSection) >= 3, 'Supabase advisor remediation queue must include the key advisor remediation rows.');
  assert(countDataRows(releasePreflightSection) >= 4, 'Release preflight deficit table must include the key toolchain and approval rows.');
  assert(countDataRows(releaseToolchainProbeSection) >= 2, 'Release toolchain probe ledger must include Corepack and Git LFS probe rows.');
  assert(countDataRows(releaseClearanceSection) >= 6, 'Release preflight clearance matrix must include every release preflight row.');
  assert(releaseClearanceSection.includes('Proof Type') && releaseClearanceSection.includes('Proof Boundary') && releaseClearanceSection.includes('Stop Gate') && releaseClearanceSection.includes('Blocks Release Gate'), 'Release preflight clearance matrix must expose proof type, proof boundary, stop gate, and release blocking columns.');
  assert(/release_preflight_clearance_matrix|gated_release_command|source_provenance_decision|manual_approval/i.test(releaseClearanceSection), 'Release preflight clearance matrix must include release gate proof types.');
  assert(/corepack pnpm run check:release-readiness|corepack pnpm run check:production-deploy-request/i.test(releaseClearanceSection), 'Release preflight clearance matrix must include release-readiness and owner-approval proof commands.');
  assert(/does not install tools|clear source provenance|push|deploy|hosted\/live parity|grant owner approval/i.test(releaseClearanceSection), 'Release preflight clearance matrix must preserve no-execution and no-approval boundaries.');
  assert(countDataRows(releaseRemediationSection) >= 2, 'Release preflight remediation queue must include current release remediation actions.');
  assert(countDataRows(productionApprovalSection) >= 8, 'Production approval prerequisite queue must include launch evidence validation plus the prerequisite, manual-stop, and post-deploy rows.');
  assert(countDataRows(productionApprovalRequestSection) >= 8, 'Production approval request packet must include all prerequisite rows with request phases.');
  assert(productionApprovalRequestSection.includes('Evidence To Attach') && productionApprovalRequestSection.includes('Blocks Request') && productionApprovalRequestSection.includes('Request Impact'), 'Production approval request packet must expose request evidence, blocking, and impact columns.');
  assert(/pre_request|owner_decision|post_deploy_boundary/i.test(productionApprovalRequestSection), 'Production approval request packet must separate pre-request, owner-decision, and post-deploy phases.');
  assert(/does not grant owner approval|run deploys|mutate branches|hosted\/live parity/i.test(productionApprovalRequestSection), 'Production approval request packet must preserve no-approval and no-live-proof boundaries.');
  assert(countDataRows(postDeployLiveProofSection) >= 6, 'Post-deploy live proof gate queue must include approval, deploy, metadata, static parity, hosted smoke, and parity-claim rows.');
  const codeOptimizationSection = extractSection(markdown, 'Code Optimization Report');
  assert(countDataRows(codeOptimizationSection) >= 3, 'Code optimization report must include implementation, rejected variant, and optimization review rows.');
  assert(codeOptimizationSection.includes('CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES'), 'Code optimization report must include the preview manifest TypeScript safe-fix task id.');
  assert(codeOptimizationSection.includes('CEIP-SAFE-FIX-PRODUCTION-APPROVAL-VALIDATION-CIRCULARITY'), 'Code optimization report must include the production approval validation circularity safe-fix task id.');
  assert(codeOptimizationSection.includes('CEIP-SAFE-FIX-BRANCH-REVIEW-QUEUE-STATUS'), 'Code optimization report must include the branch review queue status safe-fix task id.');
  assert(codeOptimizationSection.includes('CEIP-SAFE-FIX-BUYER-EVIDENCE-STARTER-REGISTER-BOUNDARY'), 'Code optimization report must include the buyer evidence starter-register boundary safe-fix task id.');
  assert(codeOptimizationSection.includes('CEIP-SAFE-FIX-RELEASE-PREFLIGHT-FOCUSED-REPORT'), 'Code optimization report must include the release preflight focused report safe-fix task id.');
  assert(codeOptimizationSection.includes('minimal manifest/report evidence patch'), 'Code optimization report must record the selected minimal manifest/report evidence patch.');
  assert(codeOptimizationSection.includes('minimal prerequisite status and evidence-text patch'), 'Code optimization report must record the selected minimal production approval circularity patch.');
  assert(codeOptimizationSection.includes('minimal branch review queue status patch'), 'Code optimization report must record the selected minimal branch review queue status patch.');
  assert(codeOptimizationSection.includes('minimal starter-register classification patch'), 'Code optimization report must record the selected minimal starter-register classification patch.');
  assert(codeOptimizationSection.includes('minimal focused manifest wrapper'), 'Code optimization report must record the selected minimal release preflight wrapper patch.');
  assert(codeOptimizationSection.includes('tests/unit/buyerEvidenceReadiness.test.ts'), 'Code optimization report must record the buyer evidence readiness test file change.');
  assert(codeOptimizationSection.includes('tests/unit/releasePreflightReadiness.test.ts'), 'Code optimization report must record the release preflight readiness test file change.');
  assert(codeOptimizationSection.includes('tests/unit/launchEvidenceManifest.test.ts'), 'Code optimization report must record the launch manifest test file change.');
  assert(codeOptimizationSection.includes('pnpm exec tsc -b --pretty false'), 'Code optimization report must record the TypeScript build gate.');
  assert(codeOptimizationSection.includes('pnpm run test:e2e:preview'), 'Code optimization report must record the production preview build gate.');
  assert(codeOptimizationSection.includes('test:strategy-audit-slice'), 'Code optimization report must record the broad strategy audit slice.');
  assert(codeOptimizationSection.includes('strict') && codeOptimizationSection.includes('pass'), 'Code optimization report must include a strict passing optimization review.');
  assert(/does not clear buyer evidence|production approval|hosted\/live parity/i.test(codeOptimizationSection), 'Code optimization report must preserve external launch gate boundaries.');
  assert(/does not clear source provenance|owner approval|hosted\/live parity/i.test(codeOptimizationSection), 'Code optimization report must preserve approval circularity external gate boundaries.');
  assert(/does not checkout|merge|push|select canonical heads|deploy|grant production approval/i.test(codeOptimizationSection), 'Code optimization report must preserve branch review read-only boundaries.');
  assert(/does not contact buyers|create accepted evidence|move confidence|validate 95%|commercial-ready status/i.test(codeOptimizationSection), 'Code optimization report must preserve buyer evidence hard-gate boundaries.');
  assert(countDataRows(completionAuditSection) >= 15, 'Objective completion audit must include every required deliverable and unresolved launch gate.');
  assert(completionAuditSection.includes('Proof Type') && completionAuditSection.includes('Proof Boundary') && completionAuditSection.includes('Stop Gate'), 'Objective completion audit table must expose proof type, proof boundary, and stop gate columns.');
  for (const proofType of [
    'required_score_table',
    'required_gap_analysis_table',
    'sequenced_launch_action_queue',
    'market_pain_source_table',
    'target_segment_table',
    'outreach_plan_boundary',
    'fix_report_blocker_map',
    'schema_validation',
    'ecc_phase_ledger',
    'buyer_evidence_hard_gate',
    'source_provenance_approval_gate',
    'read_only_branch_review',
    'external_advisor_clearance',
    'release_toolchain_approval',
    'production_approval_and_live_proof_gate',
  ]) {
    assert(completionAuditSection.includes(proofType), `Objective completion audit table must include proof type ${proofType}.`);
  }
  assert(/does not prove commercial-ready status|Do not mark the launch goal complete/i.test(completionAuditSection), 'Objective completion audit section must preserve no-readiness and no-completion boundaries.');
  assert(countDataRows(adversarialSection) >= 5, 'Adversarial review table must include the core launch review lanes.');
  assert(adversarialSection.includes('Proof Type') && adversarialSection.includes('Proof Boundary') && adversarialSection.includes('Stop Gate'), 'Adversarial review table must expose proof type, proof boundary, and stop gate columns.');
  for (const proofType of [
    'buyer_evidence_adversarial_review',
    'production_approval_adversarial_review',
    'release_toolchain_adversarial_review',
    'external_advisor_adversarial_review',
    'branch_risk_adversarial_review',
  ]) {
    assert(adversarialSection.includes(proofType), `Adversarial review table must include proof type ${proofType}.`);
  }
  assert(/does not create buyer acceptance|does not grant production approval|does not checkout/i.test(adversarialSection), 'Adversarial review table must preserve no-proof and no-mutation boundaries.');
  assert(countDataRows(painSection) === 10, 'Pain point table must include exactly ten rows.');
  assert(painSection.includes('Proof Type') && painSection.includes('Proof Boundary') && painSection.includes('Stop Gate'), 'Pain point table must expose proof type, proof boundary, and stop gate columns.');
  assert((painSection.match(/market_pain_source_research/g) ?? []).length === 10, 'Pain point table must classify all ten rows as market_pain_source_research.');
  assert(/does not prove buyer acceptance|account-level willingness to pay|Do not treat source links|permission to contact buyers/i.test(painSection), 'Pain point table must preserve source-research and no-buyer-proof boundaries.');
  assert(countDataRows(targetSection) === 10, 'Target customer table must include exactly ten rows.');
  assert(targetSection.includes('Proof Type') && targetSection.includes('Proof Boundary') && targetSection.includes('Stop Gate'), 'Target customer table must expose proof type, proof boundary, and stop gate columns.');
  assert((targetSection.match(/target_segment_ranking_hypothesis/g) ?? []).length === 10, 'Target customer table must classify all ten rows as target_segment_ranking_hypothesis.');
  assert(/does not prove named-account validation|outreach permission|Do not treat target ranking|permission to contact buyers/i.test(targetSection), 'Target customer table must preserve segment-ranking and no-outreach-permission boundaries.');
  assert(countDataRows(evidenceSection) >= 5, 'Evidence validation table must include all validation gates.');
  assert(countDataRows(eccSection) >= 9, 'ECC ledger must include the route, mode, checks, decision, and next adjustment fields.');
  assert((painSection.match(/https?:\/\//g) ?? []).length >= 10, 'Pain point table must include current source URLs.');
}

if (failures.length > 0) {
  console.error('Commercial launch readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Commercial launch readiness report check passed: required tables, blocked decision, source URLs, proof buckets, buyer evidence, launch action queue, source provenance isolation ledger, source provenance resolution queue, canonical-head decision deficits, canonical-head resolution queue, buyer hard-gate deficits, buyer evidence acquisition matrix, buyer evidence remediation queue, Supabase advisor evidence, Supabase advisor clearance deficits, Supabase advisor remediation queue, release preflight deficits, release toolchain probe ledger, release preflight clearance matrix, release preflight remediation queue, production approval prerequisite queue, production approval request packet, launch evidence validation prerequisite, post-deploy live proof gate queue, source provenance with staged/unstaged classification, branch families, branch freshness, branch review queue, review-first branch packets, top branch packet, canonical head comparison, code optimization report, and validation boundaries are present.');
