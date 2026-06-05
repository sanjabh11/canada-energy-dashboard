#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const sourcePath = path.join(repoRoot, 'src/lib/publicReleaseStatusManifest.json');
const publicPath = path.join(repoRoot, 'public/status/release-health.json');
const validStatuses = new Set(['verified', 'watch', 'external_gate', 'needs_remediation']);
const requiredRefreshCommands = [
  'git status --porcelain=v1 --branch',
  'pnpm run check:release-readiness',
  'pnpm run check:launch-evidence-manifest',
  'pnpm run check:production-deploy-request',
  'pnpm run check:post-deploy-live',
  'pnpm run report:commercial-launch-readiness',
  'pnpm run report:buyer-evidence-readiness',
];
const requiredItemContracts = [
  {
    id: 'deployed_artifact_live_parity',
    status: 'verified',
    proofBucket: 'hosted/live',
    command: 'pnpm run check:post-deploy-live',
  },
  {
    id: 'current_source_live_parity',
    status: 'external_gate',
    proofBucket: 'hosted/live',
    command: 'pnpm run report:production-approval-packet && pnpm run check:post-deploy-live',
  },
  {
    id: 'current_source_release_gate',
    status: 'watch',
    proofBucket: 'local/source',
    command: 'pnpm run check:release-readiness && gh run list --repo sanjabh11/canada-energy-dashboard --limit 5',
  },
  {
    id: 'source_provenance',
    status: 'watch',
    proofBucket: 'local/source',
    command: 'pnpm run report:production-approval-packet -- --skip-release-readiness',
  },
  {
    id: 'source_provenance_isolation_ledger',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:production-approval-packet -- --skip-release-readiness && pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'launch_evidence_validation_gate',
    status: 'external_gate',
    proofBucket: 'repo artifact',
    command: 'pnpm run check:launch-evidence-manifest && pnpm run report:production-approval-packet',
  },
  {
    id: 'source_provenance_resolution_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:production-approval-packet -- --skip-release-readiness && pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'release_preflight_remediation_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:commercial-launch-readiness && pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'release_preflight_clearance_matrix',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:commercial-launch-readiness && pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'release_toolchain_probe_ledger',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'launch_blocker_action_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:commercial-launch-readiness && pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'production_approval_prerequisite_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:commercial-launch-readiness && pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'production_approval_request_packet',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:commercial-launch-readiness && pnpm run report:launch-evidence-manifest && pnpm run check:production-deploy-request',
  },
  {
    id: 'post_deploy_live_proof_gate_queue',
    status: 'external_gate',
    proofBucket: 'hosted/live',
    command: 'pnpm run report:commercial-launch-readiness && pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'unmerged_branch_review_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:unmerged-branch-readiness && pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'branch_clearance_matrix',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:unmerged-branch-readiness && pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'canonical_head_decision_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:unmerged-branch-readiness && pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'canonical_head_resolution_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:unmerged-branch-readiness && pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'review_first_branch_packet_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:unmerged-branch-readiness -- --focus-risk high && pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'buyer_evidence_gate',
    status: 'external_gate',
    proofBucket: 'buyer evidence',
    command: 'pnpm run validate:pilot-evidence -- path/to/register.csv --require-95 --evidence-root path/to/redacted-artifacts',
  },
  {
    id: 'buyer_evidence_acquisition_matrix',
    status: 'external_gate',
    proofBucket: 'buyer evidence',
    command: 'pnpm run report:buyer-evidence-readiness && pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'buyer_evidence_remediation_queue',
    status: 'external_gate',
    proofBucket: 'buyer evidence',
    command: 'pnpm run report:buyer-evidence-readiness && pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'supabase_advisor_access',
    status: 'needs_remediation',
    proofBucket: 'external account',
    command: 'Supabase MCP security/performance advisors for qnymbecjgeaoxsfphrti',
  },
  {
    id: 'supabase_advisor_clearance_deficit_ledger',
    status: 'needs_remediation',
    proofBucket: 'external account',
    command: 'pnpm run report:launch-evidence-manifest',
  },
  {
    id: 'supabase_advisor_remediation_queue',
    status: 'needs_remediation',
    proofBucket: 'external account',
    command: 'pnpm run report:launch-evidence-manifest',
  },
];
const requiredItemIds = requiredItemContracts.map((item) => item.id);
const forbiddenPatterns = [
  { name: 'direct email', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { name: 'JWT-like token', pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/ },
  { name: 'production approval overclaim', pattern: /\bproduction approval achieved\b/i },
  { name: 'commercial-ready overclaim', pattern: /\bcommercial-ready\b/i },
  { name: 'buyer confidence overclaim', pattern: /\bbuyer-proven 95% market confidence achieved\b/i },
];

function normalizeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function validateManifest(manifest) {
  const failures = [];
  if (manifest.schemaVersion !== 'ceip.public-release-status.v1') {
    failures.push('schemaVersion must be ceip.public-release-status.v1.');
  }
  if (manifest.generatedBy !== 'scripts/generate-public-release-status.mjs') {
    failures.push('generatedBy must point to scripts/generate-public-release-status.mjs.');
  }
  if (manifest.publicPath !== '/status/release-health.json') {
    failures.push('publicPath must be /status/release-health.json.');
  }
  if (manifest.decision !== 'blocked') {
    failures.push('decision must remain blocked until buyer evidence and approval gates prove otherwise.');
  }
  if (!/does not create buyer evidence/i.test(manifest.decisionBoundary ?? '')) {
    failures.push('decisionBoundary must explicitly say the manifest does not create buyer evidence.');
  }
  if (JSON.stringify(manifest.refreshCommands ?? null) !== JSON.stringify(requiredRefreshCommands)) {
    failures.push(
      `refreshCommands must exactly preserve the public release refresh sequence: ${requiredRefreshCommands.join(' -> ')}.`,
    );
  }
  if (!Array.isArray(manifest.items)) {
    failures.push('items must be an array of public release-status records.');
  } else {
    const actualItemIds = manifest.items.map((item) => item?.id ?? '(missing)');
    if (JSON.stringify(actualItemIds) !== JSON.stringify(requiredItemIds)) {
      failures.push(
        `items must exactly preserve the public release-status gate sequence: ${requiredItemIds.join(' -> ')}.`,
      );
    }
  }

  const ids = new Set();
  for (const item of manifest.items ?? []) {
    if (!item.id || ids.has(item.id)) failures.push(`item id is missing or duplicated: ${item.id ?? '(missing)'}.`);
    ids.add(item.id);
    if (!validStatuses.has(item.status)) failures.push(`${item.id}: unsupported status ${item.status}.`);
    for (const key of ['label', 'proofBucket', 'command', 'evidenceBoundary', 'nextAction']) {
      if (!String(item[key] ?? '').trim()) failures.push(`${item.id}: ${key} is required.`);
    }
    if (!/does not prove production|does not create|No buyer-proven|does not substitute|does not prove current/i.test(item.evidenceBoundary ?? '')) {
      failures.push(`${item.id}: evidenceBoundary must include an explicit proof limitation.`);
    }
  }

  for (const id of requiredItemIds) {
    if (!ids.has(id)) failures.push(`missing required item: ${id}.`);
  }

  const itemById = new Map((manifest.items ?? []).map((item) => [item.id, item]));
  for (const expected of requiredItemContracts) {
    const item = itemById.get(expected.id);
    if (!item) continue;
    for (const key of ['status', 'proofBucket', 'command']) {
      if (item[key] !== expected[key]) {
        failures.push(`${expected.id}: ${key} must remain ${expected[key]}.`);
      }
    }
  }

  const sourceProvenance = itemById.get('source_provenance') ?? {};
  if (!/staged-only|unstaged-only|mixed/i.test(`${sourceProvenance.evidenceBoundary ?? ''}\n${sourceProvenance.nextAction ?? ''}`)) {
    failures.push('source_provenance must describe staged-only, unstaged-only, or mixed source blockers.');
  }
  const sourceIsolationLedger = itemById.get('source_provenance_isolation_ledger') ?? {};
  if (!/tracked|untracked|ignored|staged-only|unstaged-only|mixed|rename|release-blocking/i.test(`${sourceIsolationLedger.evidenceBoundary ?? ''}\n${sourceIsolationLedger.nextAction ?? ''}`)) {
    failures.push('source_provenance_isolation_ledger must describe dirty source path isolation dimensions.');
  }
  if (!/does not.*commit|does not.*unstage|does not.*stash|does not.*revert|does not.*delete|does not.*rename|does not.*move|does not.*clear source provenance|does not.*run release-readiness|does not.*deploy|does not.*grant approval|does not.*prove current local cleanliness|does not.*production approval/i.test(sourceIsolationLedger.evidenceBoundary ?? '')) {
    failures.push('source_provenance_isolation_ledger must preserve the no-mutation, no-release-execution, non-cleanliness, and no-approval boundary.');
  }
  const launchEvidenceValidationGate = itemById.get('launch_evidence_validation_gate') ?? {};
  if (!/manifest structure|proof-boundary consistency|check:launch-evidence-manifest/i.test(`${launchEvidenceValidationGate.evidenceBoundary ?? ''}\n${launchEvidenceValidationGate.nextAction ?? ''}`)) {
    failures.push('launch_evidence_validation_gate must describe the launch evidence manifest structure and proof-boundary check.');
  }
  if (!/does not prove production approval|does not.*buyer acceptance|does not.*deployment|current hosted\/live parity/i.test(launchEvidenceValidationGate.evidenceBoundary ?? '')) {
    failures.push('launch_evidence_validation_gate must preserve the no-approval, no-buyer-proof, no-deploy, and no-live-parity boundary.');
  }
  const sourceResolutionQueue = itemById.get('source_provenance_resolution_queue') ?? {};
  if (!/staged-only|unstaged-only|mixed|renamed/i.test(`${sourceResolutionQueue.evidenceBoundary ?? ''}\n${sourceResolutionQueue.nextAction ?? ''}`)) {
    failures.push('source_provenance_resolution_queue must describe staged, unstaged, mixed, or renamed source decisions.');
  }
  if (!/does not.*commit|does not.*unstage|does not.*clear source provenance|does not.*prove current local cleanliness/i.test(sourceResolutionQueue.evidenceBoundary ?? '')) {
    failures.push('source_provenance_resolution_queue must preserve the non-mutation and non-cleanliness boundary.');
  }
  const releasePreflightQueue = itemById.get('release_preflight_remediation_queue') ?? {};
  if (!/Corepack pnpm resolver|release-readiness execution|Git LFS push-path proof|explicit owner production approval/i.test(`${releasePreflightQueue.evidenceBoundary ?? ''}\n${releasePreflightQueue.nextAction ?? ''}`)) {
    failures.push('release_preflight_remediation_queue must describe the release-preflight remediation sequence.');
  }
  if (!/does not.*install tools|does not.*run release-readiness|does not.*push|does not.*deploy|does not.*prove production approval/i.test(releasePreflightQueue.evidenceBoundary ?? '')) {
    failures.push('release_preflight_remediation_queue must preserve the non-execution and non-approval boundary.');
  }
  const releasePreflightClearanceMatrix = itemById.get('release_preflight_clearance_matrix') ?? {};
  if (!/package-manager pin|Corepack pnpm resolver|release-readiness execution|Git LFS push-path proof|clean source provenance|explicit owner production approval/i.test(`${releasePreflightClearanceMatrix.evidenceBoundary ?? ''}\n${releasePreflightClearanceMatrix.nextAction ?? ''}`)) {
    failures.push('release_preflight_clearance_matrix must describe every release preflight clearance row.');
  }
  if (!/does not.*install tools|does not.*clear source provenance|does not.*run release-readiness|does not.*push|does not.*deploy|does not.*hosted\/live parity|does not.*grant owner approval/i.test(releasePreflightClearanceMatrix.evidenceBoundary ?? '')) {
    failures.push('release_preflight_clearance_matrix must preserve the non-execution, no-live-proof, and no-approval boundary.');
  }
  const releaseToolchainProbeLedger = itemById.get('release_toolchain_probe_ledger') ?? {};
  if (!/Corepack pnpm resolver|Git LFS availability|git lfs/i.test(`${releaseToolchainProbeLedger.evidenceBoundary ?? ''}\n${releaseToolchainProbeLedger.nextAction ?? ''}`)) {
    failures.push('release_toolchain_probe_ledger must describe the Corepack and Git LFS toolchain probes.');
  }
  if (!/does not.*install tools|does not.*run release-readiness|does not.*push|does not.*deploy|does not.*clear source provenance|does not.*grant production approval|does not substitute/i.test(releaseToolchainProbeLedger.evidenceBoundary ?? '')) {
    failures.push('release_toolchain_probe_ledger must preserve the non-execution, non-substitution, and non-approval boundary.');
  }
  const branchQueue = itemById.get('unmerged_branch_review_queue') ?? {};
  if (!/review-first packet/i.test(`${branchQueue.evidenceBoundary ?? ''}\n${branchQueue.nextAction ?? ''}`)) {
    failures.push('unmerged_branch_review_queue must describe review-first branch packets.');
  }
  const branchClearanceMatrix = itemById.get('branch_clearance_matrix') ?? {};
  if (!/read-only branch review rows|review-first families|canonical-head decisions|stale or aging|release-gate/i.test(`${branchClearanceMatrix.evidenceBoundary ?? ''}\n${branchClearanceMatrix.nextAction ?? ''}`)) {
    failures.push('branch_clearance_matrix must describe branch review rows, review-first families, canonical-head decisions, freshness drift, and release-gate dependencies.');
  }
  if (!/does not.*checkout|does not.*merge|does not.*push|does not.*discard|does not.*select canonical heads|does not.*run migrations|does not.*deploy|does not.*grant production approval|does not.*clear branch review|does not.*prove production approval/i.test(branchClearanceMatrix.evidenceBoundary ?? '')) {
    failures.push('branch_clearance_matrix must preserve the no-mutation, no-clearance, and no-approval boundary.');
  }
  const canonicalHeadQueue = itemById.get('canonical_head_decision_queue') ?? {};
  if (!/split|local-only|origin-only|stale|aging|unknown/i.test(`${canonicalHeadQueue.evidenceBoundary ?? ''}\n${canonicalHeadQueue.nextAction ?? ''}`)) {
    failures.push('canonical_head_decision_queue must describe canonical-head branch-family decisions.');
  }
  if (!/does not.*checkout|does not.*merge|does not.*push|does not.*discard|does not.*select a branch head|does not.*prove production approval/i.test(canonicalHeadQueue.evidenceBoundary ?? '')) {
    failures.push('canonical_head_decision_queue must preserve the no-mutation and no-approval boundary.');
  }
  const canonicalHeadResolutionQueue = itemById.get('canonical_head_resolution_queue') ?? {};
  if (!/owner-decision actions|split|local-only|origin-only|stale|aging|unknown|branch-family/i.test(`${canonicalHeadResolutionQueue.evidenceBoundary ?? ''}\n${canonicalHeadResolutionQueue.nextAction ?? ''}`)) {
    failures.push('canonical_head_resolution_queue must describe canonical-head owner-decision actions.');
  }
  if (!/does not.*checkout|does not.*merge|does not.*push|does not.*discard|does not.*delete|does not.*select canonical heads|does not.*migrate|does not.*deploy|does not.*grant production approval|does not.*clear branch review|does not.*prove production approval/i.test(canonicalHeadResolutionQueue.evidenceBoundary ?? '')) {
    failures.push('canonical_head_resolution_queue must preserve the no-mutation, no-clearance, and no-approval boundary.');
  }
  const reviewFirstPacketQueue = itemById.get('review_first_branch_packet_queue') ?? {};
  if (!/focused read-only branch packets|canonical-head state|changed Supabase function rows|drift risk/i.test(`${reviewFirstPacketQueue.evidenceBoundary ?? ''}\n${reviewFirstPacketQueue.nextAction ?? ''}`)) {
    failures.push('review_first_branch_packet_queue must describe review-first focused branch packets.');
  }
  if (!/does not.*checkout|does not.*merge|does not.*push|does not.*discard|does not.*deploy|does not.*mutate Supabase|does not.*create production approval/i.test(reviewFirstPacketQueue.evidenceBoundary ?? '')) {
    failures.push('review_first_branch_packet_queue must preserve the no-mutation and no-approval boundary.');
  }
  const launchQueue = itemById.get('launch_blocker_action_queue') ?? {};
  if (!/sequenced|source provenance|launch evidence validation|post-deploy/i.test(`${launchQueue.evidenceBoundary ?? ''}\n${launchQueue.nextAction ?? ''}`)) {
    failures.push('launch_blocker_action_queue must describe the sequenced launch blocker plan.');
  }
  if (!/does not deploy|does not.*merge|does not.*contact buyers|does not.*prove launch evidence validation|does not.*launch/i.test(launchQueue.evidenceBoundary ?? '')) {
    failures.push('launch_blocker_action_queue must preserve the non-execution, non-validation, and launch boundary.');
  }
  const productionApprovalQueue = itemById.get('production_approval_prerequisite_queue') ?? {};
  if (!/clean source provenance|launch evidence validation|Corepack release-readiness|explicit owner approval|post-deploy live proof/i.test(`${productionApprovalQueue.evidenceBoundary ?? ''}\n${productionApprovalQueue.nextAction ?? ''}`)) {
    failures.push('production_approval_prerequisite_queue must describe the approval prerequisite sequence.');
  }
  if (!/does not prove production approval|does not.*deploy|does not.*push|does not.*contact buyers|does not.*prove launch evidence validation/i.test(productionApprovalQueue.evidenceBoundary ?? '')) {
    failures.push('production_approval_prerequisite_queue must preserve the non-approval, non-execution, and non-validation boundary.');
  }
  const productionApprovalRequestPacket = itemById.get('production_approval_request_packet') ?? {};
  if (!/pre-request|owner-decision|post-deploy-boundary|request packet/i.test(`${productionApprovalRequestPacket.evidenceBoundary ?? ''}\n${productionApprovalRequestPacket.nextAction ?? ''}`)) {
    failures.push('production_approval_request_packet must describe the approval request packet phases.');
  }
  if (!/does not prove production approval|does not.*deploy|does not.*push|does not.*contact buyers|does not.*access Supabase|does not.*clear source provenance|does not.*prove hosted\/live parity/i.test(productionApprovalRequestPacket.evidenceBoundary ?? '')) {
    failures.push('production_approval_request_packet must preserve the no-approval, no-deploy, no-buyer-contact, no-Supabase-access, and no-live-parity boundary.');
  }
  const postDeployQueue = itemById.get('post_deploy_live_proof_gate_queue') ?? {};
  if (!/live public metadata|live static dist parity|hosted proof-pack route smoke|check:post-deploy-live/i.test(`${postDeployQueue.evidenceBoundary ?? ''}\n${postDeployQueue.nextAction ?? ''}`)) {
    failures.push('post_deploy_live_proof_gate_queue must describe the post-deploy live proof gates.');
  }
  if (!/does not prove current hosted\/live parity|does not.*deploy|does not.*rebuild|does not.*run browser smoke/i.test(postDeployQueue.evidenceBoundary ?? '')) {
    failures.push('post_deploy_live_proof_gate_queue must preserve the no-live-parity and no-live-mutation boundary.');
  }
  const buyerAcquisitionMatrix = itemById.get('buyer_evidence_acquisition_matrix') ?? {};
  if (!/outreach intake|production pilot register|utility forecast|TIER or credit|billing or security|distinct proof-pack|accepted confidence|reviewer|retained artifact|95% validation/i.test(`${buyerAcquisitionMatrix.evidenceBoundary ?? ''}\n${buyerAcquisitionMatrix.nextAction ?? ''}`)) {
    failures.push('buyer_evidence_acquisition_matrix must describe the buyer-evidence acquisition rows.');
  }
  if (!/does not.*contact buyers|does not.*create accepted evidence|does not.*move confidence|does not.*attach artifacts|does not.*validate 95|does not.*claim buyer acceptance|does not.*create buyer proof|does not.*prove commercial readiness/i.test(buyerAcquisitionMatrix.evidenceBoundary ?? '')) {
    failures.push('buyer_evidence_acquisition_matrix must preserve the no-contact, no-buyer-proof, and no-commercial-readiness boundary.');
  }
  const buyerRemediationQueue = itemById.get('buyer_evidence_remediation_queue') ?? {};
  if (!/accepted buyer evidence|reviewer evidence|commercial signal|retained artifacts|95% validation/i.test(`${buyerRemediationQueue.evidenceBoundary ?? ''}\n${buyerRemediationQueue.nextAction ?? ''}`)) {
    failures.push('buyer_evidence_remediation_queue must describe the buyer-evidence hard-gate remediation sequence.');
  }
  if (!/does not.*contact buyers|does not.*create accepted evidence|does not.*move confidence|does not.*validate 95|does not.*claim buyer acceptance/i.test(buyerRemediationQueue.evidenceBoundary ?? '')) {
    failures.push('buyer_evidence_remediation_queue must preserve the no-contact and no-buyer-proof boundary.');
  }
  const supabaseClearanceDeficitLedger = itemById.get('supabase_advisor_clearance_deficit_ledger') ?? {};
  if (!/CLI lint freshness|connector authorization|Security Advisor evidence|Performance Advisor evidence|public-safe findings|no-clearance claim/i.test(`${supabaseClearanceDeficitLedger.evidenceBoundary ?? ''}\n${supabaseClearanceDeficitLedger.nextAction ?? ''}`)) {
    failures.push('supabase_advisor_clearance_deficit_ledger must describe Supabase advisor clearance deficits.');
  }
  if (!/does not.*authorize connectors|does not.*access the dashboard|does not.*rerun advisors|does not.*mutate the database|does not.*record secrets|does not.*clear advisor findings|does not.*claim advisor clearance|does not.*grant production approval|does not.*create launch readiness/i.test(supabaseClearanceDeficitLedger.evidenceBoundary ?? '')) {
    failures.push('supabase_advisor_clearance_deficit_ledger must preserve the no-access, no-secret, no-clearance, and no-approval boundary.');
  }
  const supabaseRemediationQueue = itemById.get('supabase_advisor_remediation_queue') ?? {};
  if (!/CLI lint freshness|connector authorization|Security Advisor evidence|Performance Advisor evidence|public-safe findings|no-clearance-claim/i.test(`${supabaseRemediationQueue.evidenceBoundary ?? ''}\n${supabaseRemediationQueue.nextAction ?? ''}`)) {
    failures.push('supabase_advisor_remediation_queue must describe the Supabase advisor remediation sequence.');
  }
  if (!/does not.*authorize connectors|does not.*access the dashboard|does not.*rerun advisors|does not.*mutate the database|does not.*record secrets|does not.*claim advisor clearance/i.test(supabaseRemediationQueue.evidenceBoundary ?? '')) {
    failures.push('supabase_advisor_remediation_queue must preserve the no-access, no-secret, and no-clearance boundary.');
  }

  const serialized = JSON.stringify(manifest);
  for (const rule of forbiddenPatterns) {
    if (rule.pattern.test(serialized)) failures.push(`forbidden ${rule.name} found in manifest.`);
  }

  return failures;
}

if (!existsSync(sourcePath)) {
  fail(`Source manifest not found: ${path.relative(repoRoot, sourcePath)}`);
}

const manifest = JSON.parse(readFileSync(sourcePath, 'utf8'));
const failures = validateManifest(manifest);
if (failures.length > 0) {
  console.error('Public release status manifest validation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const output = normalizeJson(manifest);
if (args.includes('--check')) {
  if (!existsSync(publicPath)) fail(`Generated public manifest missing: ${path.relative(repoRoot, publicPath)}`);
  const current = readFileSync(publicPath, 'utf8');
  if (current !== output) {
    fail(`Generated public manifest is out of sync. Run: pnpm run generate:public-release-status`);
  }
  console.log('Public release status manifest check passed.');
  process.exit(0);
}

mkdirSync(path.dirname(publicPath), { recursive: true });
writeFileSync(publicPath, output);
console.log(`Public release status manifest written to ${path.relative(repoRoot, publicPath)}`);
