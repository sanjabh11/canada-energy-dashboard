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
  'pnpm run report:buyer-evidence-gate-readiness',
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
    command: 'pnpm run report:source-provenance-readiness && pnpm run check:source-provenance-report',
  },
  {
    id: 'source_provenance_isolation_ledger',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:source-provenance-readiness && pnpm run check:source-provenance-report',
  },
  {
    id: 'launch_evidence_validation_gate',
    status: 'external_gate',
    proofBucket: 'repo artifact',
    command: 'pnpm run report:launch-evidence-validation-readiness && pnpm run check:launch-evidence-validation-report',
  },
  {
    id: 'objective_completion_audit',
    status: 'external_gate',
    proofBucket: 'repo artifact',
    command: 'pnpm run report:objective-completion-audit-readiness && pnpm run check:objective-completion-audit-report',
  },
  {
    id: 'adversarial_review_ledger',
    status: 'external_gate',
    proofBucket: 'repo artifact',
    command: 'pnpm run report:adversarial-review-readiness && pnpm run check:adversarial-review-report',
  },
  {
    id: 'fix_report_blocker_map',
    status: 'external_gate',
    proofBucket: 'repo artifact',
    command: 'pnpm run report:commercial-launch-readiness && pnpm run check:commercial-launch-readiness-report && pnpm run report:launch-evidence-manifest && pnpm run check:launch-evidence-manifest',
  },
  {
    id: 'progress_update_digest',
    status: 'external_gate',
    proofBucket: 'repo artifact',
    command: 'pnpm run report:progress-digest-readiness && pnpm run check:progress-digest-report',
  },
  {
    id: 'bottleneck_log_digest',
    status: 'external_gate',
    proofBucket: 'repo artifact',
    command: 'pnpm run report:progress-digest-readiness && pnpm run check:progress-digest-report',
  },
  {
    id: 'source_provenance_resolution_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:source-provenance-readiness && pnpm run check:source-provenance-report',
  },
  {
    id: 'source_owner_decision_packet',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:source-provenance-readiness && pnpm run check:source-provenance-report',
  },
  {
    id: 'release_toolchain_approval_deficit_ledger',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:release-preflight && pnpm run check:release-preflight-report',
  },
  {
    id: 'release_preflight_remediation_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:release-preflight && pnpm run check:release-preflight-report',
  },
  {
    id: 'release_operator_handoff_packet',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:release-preflight && pnpm run check:release-preflight-report',
  },
  {
    id: 'release_preflight_clearance_matrix',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:release-preflight && pnpm run check:release-preflight-report',
  },
  {
    id: 'release_toolchain_probe_ledger',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:release-preflight && pnpm run check:release-preflight-report',
  },
  {
    id: 'launch_blocker_action_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:launch-action-readiness && pnpm run check:launch-action-report',
  },
  {
    id: 'launch_action_operator_handoff_packet',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:launch-action-readiness && pnpm run check:launch-action-report',
  },
  {
    id: 'production_approval_prerequisite_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:production-approval-readiness && pnpm run check:production-approval-report',
  },
  {
    id: 'production_approval_request_packet',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:production-approval-readiness && pnpm run check:production-approval-report && pnpm run check:production-deploy-request',
  },
  {
    id: 'production_approval_operator_handoff_packet',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:production-approval-readiness && pnpm run check:production-approval-report',
  },
  {
    id: 'post_deploy_live_proof_gate_queue',
    status: 'external_gate',
    proofBucket: 'hosted/live',
    command: 'pnpm run report:post-deploy-live-proof-readiness && pnpm run check:post-deploy-live-proof-report',
  },
  {
    id: 'post_deploy_live_proof_operator_handoff_packet',
    status: 'external_gate',
    proofBucket: 'hosted/live',
    command: 'pnpm run report:post-deploy-live-proof-readiness && pnpm run check:post-deploy-live-proof-report',
  },
  {
    id: 'local_proof_pack_browser_smoke',
    status: 'external_gate',
    proofBucket: 'local/browser',
    command: 'pnpm run test:browser:local:proof-packs',
  },
  {
    id: 'unmerged_branch_review_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
  },
  {
    id: 'branch_family_freshness_rollup',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
  },
  {
    id: 'top_branch_review_packet',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
  },
  {
    id: 'branch_clearance_matrix',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
  },
  {
    id: 'branch_operator_handoff_packet',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
  },
  {
    id: 'canonical_head_decision_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
  },
  {
    id: 'canonical_head_resolution_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
  },
  {
    id: 'review_first_branch_packet_queue',
    status: 'external_gate',
    proofBucket: 'local/source',
    command: 'pnpm run report:branch-review-readiness && pnpm run check:branch-review-report',
  },
  {
    id: 'buyer_evidence_gate',
    status: 'external_gate',
    proofBucket: 'buyer evidence',
    command: 'pnpm run report:buyer-evidence-gate-readiness && pnpm run check:buyer-evidence-gate-report',
  },
  {
    id: 'buyer_evidence_hard_gate_deficit_ledger',
    status: 'external_gate',
    proofBucket: 'buyer evidence',
    command: 'pnpm run report:buyer-evidence-gate-readiness && pnpm run check:buyer-evidence-gate-report',
  },
  {
    id: 'buyer_evidence_acquisition_matrix',
    status: 'external_gate',
    proofBucket: 'buyer evidence',
    command: 'pnpm run report:buyer-evidence-gate-readiness && pnpm run check:buyer-evidence-gate-report',
  },
  {
    id: 'buyer_evidence_minimum_packet_handoff',
    status: 'external_gate',
    proofBucket: 'buyer evidence',
    command: 'pnpm run report:buyer-evidence-gate-readiness && pnpm run check:buyer-evidence-gate-report',
  },
  {
    id: 'buyer_evidence_remediation_queue',
    status: 'external_gate',
    proofBucket: 'buyer evidence',
    command: 'pnpm run report:buyer-evidence-gate-readiness && pnpm run check:buyer-evidence-gate-report',
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
    command: 'pnpm run report:supabase-advisor-readiness && pnpm run check:supabase-advisor-report',
  },
  {
    id: 'supabase_advisor_operator_handoff_packet',
    status: 'needs_remediation',
    proofBucket: 'external account',
    command: 'pnpm run report:supabase-advisor-readiness && pnpm run check:supabase-advisor-report',
  },
  {
    id: 'supabase_advisor_remediation_queue',
    status: 'needs_remediation',
    proofBucket: 'external account',
    command: 'pnpm run report:supabase-advisor-readiness && pnpm run check:supabase-advisor-report',
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
  function expectSourceLineage(id, { sourceManifestPath, sourceProofType, sourceProofTypes = [] }) {
    const item = itemById.get(id) ?? {};
    if (sourceManifestPath && item.sourceManifestPath !== sourceManifestPath) {
      failures.push(`${id} must map back to ${sourceManifestPath}.`);
    }
    if (sourceProofType && item.sourceProofType !== sourceProofType) {
      failures.push(`${id} sourceProofType must be ${sourceProofType}.`);
    }
    const actualProofTypes = item.sourceProofTypes ?? [];
    for (const proofType of sourceProofTypes) {
      if (!actualProofTypes.includes(proofType)) {
        failures.push(`${id} sourceProofTypes must include ${proofType}.`);
      }
    }
  }

  const sourceProvenance = itemById.get('source_provenance') ?? {};
  if (!/staged-only|unstaged-only|mixed/i.test(`${sourceProvenance.evidenceBoundary ?? ''}\n${sourceProvenance.nextAction ?? ''}`)) {
    failures.push('source_provenance must describe staged-only, unstaged-only, or mixed source blockers.');
  }
  expectSourceLineage('source_provenance', {
    sourceManifestPath: 'source_provenance',
    sourceProofTypes: [
      'source_rename_decision',
    ],
  });
  const sourceIsolationLedger = itemById.get('source_provenance_isolation_ledger') ?? {};
  if (!/tracked|untracked|ignored|staged-only|unstaged-only|mixed|rename|release-blocking/i.test(`${sourceIsolationLedger.evidenceBoundary ?? ''}\n${sourceIsolationLedger.nextAction ?? ''}`)) {
    failures.push('source_provenance_isolation_ledger must describe dirty source path isolation dimensions.');
  }
  if (!/does not.*commit|does not.*unstage|does not.*stash|does not.*revert|does not.*delete|does not.*rename|does not.*move|does not.*clear source provenance|does not.*run release-readiness|does not.*deploy|does not.*grant approval|does not.*prove current local cleanliness|does not.*production approval/i.test(sourceIsolationLedger.evidenceBoundary ?? '')) {
    failures.push('source_provenance_isolation_ledger must preserve the no-mutation, no-release-execution, non-cleanliness, and no-approval boundary.');
  }
  expectSourceLineage('source_provenance_isolation_ledger', {
    sourceManifestPath: 'source_provenance.isolation_ledger',
    sourceProofTypes: [
      'source_provenance_isolation_ledger',
      'source_rename_decision',
    ],
  });
  const launchEvidenceValidationGate = itemById.get('launch_evidence_validation_gate') ?? {};
  if (!/manifest structure|proof-boundary consistency|check:launch-evidence-manifest/i.test(`${launchEvidenceValidationGate.evidenceBoundary ?? ''}\n${launchEvidenceValidationGate.nextAction ?? ''}`)) {
    failures.push('launch_evidence_validation_gate must describe the launch evidence manifest structure and proof-boundary check.');
  }
  if (!/does not prove production approval|does not.*buyer acceptance|does not.*deployment|current hosted\/live parity/i.test(launchEvidenceValidationGate.evidenceBoundary ?? '')) {
    failures.push('launch_evidence_validation_gate must preserve the no-approval, no-buyer-proof, no-deploy, and no-live-parity boundary.');
  }
  expectSourceLineage('launch_evidence_validation_gate', {
    sourceManifestPath: 'launch_action_queue.items[phase=launch_evidence_validation]',
    sourceProofTypes: [
      'manifest_validation_and_approval_packet',
      'manifest_validation',
      'schema_validation',
    ],
  });
  const objectiveCompletionAudit = itemById.get('objective_completion_audit') ?? {};
  if (!/required launch deliverables|present report tables|blocked P0\/P1 gates|manual-stop rows|next proof commands|goal-completion blockers/i.test(`${objectiveCompletionAudit.evidenceBoundary ?? ''}\n${objectiveCompletionAudit.nextAction ?? ''}`)) {
    failures.push('objective_completion_audit must describe required launch deliverables, blocked gates, manual stops, next proof commands, and goal-completion blockers.');
  }
  if (!/report:objective-completion-audit-readiness/.test(objectiveCompletionAudit.command ?? '') || !/check:objective-completion-audit-report/.test(objectiveCompletionAudit.command ?? '')) {
    failures.push('objective_completion_audit must route through the focused objective completion audit report/check handles.');
  }
  if (!/does not prove production approval|does not.*buyer acceptance|does not.*commercial launch readiness|does not.*deployment|does not.*hosted\/live parity|does not.*Supabase clearance|does not.*branch approval|does not.*source readiness|does not.*permission to contact buyers/i.test(objectiveCompletionAudit.evidenceBoundary ?? '')) {
    failures.push('objective_completion_audit must preserve the no-readiness, no-buyer-proof, no-approval, no-live-proof, no-Supabase-clearance, no-branch-approval, no-source-readiness, and no-outreach-permission boundary.');
  }
  expectSourceLineage('objective_completion_audit', {
    sourceManifestPath: 'completion_audit',
    sourceProofType: 'completion_audit_current_state',
  });
  const adversarialReviewLedger = itemById.get('adversarial_review_ledger') ?? {};
  if (!/buyer evidence|production approval|release toolchain|Supabase advisor clearance|branch-risk|challenge lanes|claim-refutation/i.test(`${adversarialReviewLedger.evidenceBoundary ?? ''}\n${adversarialReviewLedger.nextAction ?? ''}`)) {
    failures.push('adversarial_review_ledger must describe the buyer, approval, release, Supabase, and branch challenge lanes.');
  }
  if (!/report:adversarial-review-readiness/.test(adversarialReviewLedger.command ?? '') || !/check:adversarial-review-report/.test(adversarialReviewLedger.command ?? '')) {
    failures.push('adversarial_review_ledger must route through the focused adversarial review report/check handles.');
  }
  if (!/does not prove production approval|does not.*buyer acceptance|does not.*release readiness|does not.*Supabase clearance|does not.*branch approval|does not.*deployment|does not.*hosted\/live parity|does not.*commercial launch readiness/i.test(adversarialReviewLedger.evidenceBoundary ?? '')) {
    failures.push('adversarial_review_ledger must preserve the no-approval, no-buyer-proof, no-release-readiness, no-Supabase-clearance, no-branch-approval, no-deploy, no-live-proof, and no-launch-readiness boundary.');
  }
  expectSourceLineage('adversarial_review_ledger', {
    sourceManifestPath: 'adversarial_reviews',
    sourceProofTypes: [
      'buyer_evidence_adversarial_review',
      'production_approval_adversarial_review',
      'release_toolchain_adversarial_review',
      'external_advisor_adversarial_review',
      'branch_risk_adversarial_review',
    ],
  });
  const fixReportBlockerMap = itemById.get('fix_report_blocker_map') ?? {};
  if (!/files changed|tests run|required checks|unresolved blockers|approval gates|owner-side gate/i.test(`${fixReportBlockerMap.evidenceBoundary ?? ''}\n${fixReportBlockerMap.nextAction ?? ''}`)) {
    failures.push('fix_report_blocker_map must describe files changed, tests run, required checks, unresolved blockers, approval gates, and owner-side gate sequencing.');
  }
  if (!/report:commercial-launch-readiness/.test(fixReportBlockerMap.command ?? '') || !/check:commercial-launch-readiness-report/.test(fixReportBlockerMap.command ?? '') || !/report:launch-evidence-manifest/.test(fixReportBlockerMap.command ?? '') || !/check:launch-evidence-manifest/.test(fixReportBlockerMap.command ?? '')) {
    failures.push('fix_report_blocker_map must route through the commercial readiness report/check and launch evidence manifest report/check handles.');
  }
  if (!/does not.*modify files|does not.*run missing checks|does not.*clear buyer evidence|does not.*source provenance|does not.*branch review|does not.*Supabase advisor clearance|does not.*release toolchain|does not.*production approval|does not.*deployment|does not.*hosted\/live parity|does not.*commercial launch readiness/i.test(fixReportBlockerMap.evidenceBoundary ?? '')) {
    failures.push('fix_report_blocker_map must preserve the no-mutation, no-check-execution, no-clearance, no-approval, no-deploy, no-live-proof, and no-launch-readiness boundary.');
  }
  expectSourceLineage('fix_report_blocker_map', {
    sourceManifestPath: 'fix_report',
    sourceProofType: 'fix_report_blocker_map',
  });
  const progressUpdateDigest = itemById.get('progress_update_digest') ?? {};
  if (!/accomplished work|target matrix|pending work|current bottleneck|phase progress|progress visible/i.test(`${progressUpdateDigest.evidenceBoundary ?? ''}\n${progressUpdateDigest.nextAction ?? ''}`)) {
    failures.push('progress_update_digest must describe accomplished work, target matrix, pending work, current bottleneck, and phase progress.');
  }
  if (!/report:progress-digest-readiness/.test(progressUpdateDigest.command ?? '') || !/check:progress-digest-report/.test(progressUpdateDigest.command ?? '')) {
    failures.push('progress_update_digest must route through the focused progress digest report/check handles.');
  }
  if (!/does not.*complete pending work|does not.*clear blockers|does not.*run checks|does not.*contact buyers|does not.*approve branches|does not.*deploy|does not.*hosted\/live parity|does not.*commercial launch readiness|does not prove production approval/i.test(progressUpdateDigest.evidenceBoundary ?? '')) {
    failures.push('progress_update_digest must preserve the no-completion, no-check-execution, no-buyer-contact, no-branch-approval, no-deploy, no-live-proof, no-launch-readiness, and no-approval boundary.');
  }
  expectSourceLineage('progress_update_digest', {
    sourceManifestPath: 'progress_updates',
  });
  const bottleneckLogDigest = itemById.get('bottleneck_log_digest') ?? {};
  if (!/blocked task or subtask|elapsed time|last update|root cause|top unblock options|evidence gaps/i.test(`${bottleneckLogDigest.evidenceBoundary ?? ''}\n${bottleneckLogDigest.nextAction ?? ''}`)) {
    failures.push('bottleneck_log_digest must describe the blocked task/subtask, elapsed time, last update, root cause, top unblock options, and evidence-gap context.');
  }
  if (!/report:progress-digest-readiness/.test(bottleneckLogDigest.command ?? '') || !/check:progress-digest-report/.test(bottleneckLogDigest.command ?? '')) {
    failures.push('bottleneck_log_digest must route through the focused progress digest report/check handles.');
  }
  if (!/does not.*resolve evidence gaps|does not.*collect buyer artifacts|does not.*authorize Supabase advisors|does not.*choose branch heads|does not.*approve deploys|does not.*mutate live services|does not.*hosted\/live parity|does not.*commercial launch readiness|does not prove production approval/i.test(bottleneckLogDigest.evidenceBoundary ?? '')) {
    failures.push('bottleneck_log_digest must preserve the no-resolution, no-buyer-proof, no-Supabase-authorization, no-branch-selection, no-deploy-approval, no-live-mutation, no-live-proof, no-launch-readiness, and no-approval boundary.');
  }
  expectSourceLineage('bottleneck_log_digest', {
    sourceManifestPath: 'bottleneck_log',
  });
  const sourceResolutionQueue = itemById.get('source_provenance_resolution_queue') ?? {};
  if (!/staged-only|unstaged-only|mixed|renamed/i.test(`${sourceResolutionQueue.evidenceBoundary ?? ''}\n${sourceResolutionQueue.nextAction ?? ''}`)) {
    failures.push('source_provenance_resolution_queue must describe staged, unstaged, mixed, or renamed source decisions.');
  }
  if (!/does not.*commit|does not.*unstage|does not.*clear source provenance|does not.*prove current local cleanliness/i.test(sourceResolutionQueue.evidenceBoundary ?? '')) {
    failures.push('source_provenance_resolution_queue must preserve the non-mutation and non-cleanliness boundary.');
  }
  expectSourceLineage('source_provenance_resolution_queue', {
    sourceManifestPath: 'source_provenance.resolution_queue',
    sourceProofTypes: [
      'source_rename_decision',
    ],
  });
  const sourceOwnerDecisionPacket = itemById.get('source_owner_decision_packet') ?? {};
  if (!/source owner decision packet|source_provenance\.resolution_queue\.items|recommended owner options|commit_as_intentional_change|unstage_for_later_review|stash_or_revert_with_owner_approval|owner-decision/i.test(`${sourceOwnerDecisionPacket.evidenceBoundary ?? ''}\n${sourceOwnerDecisionPacket.nextAction ?? ''}`)) {
    failures.push('source_owner_decision_packet must describe owner-decision rows, recommended owner options, and source resolution queue provenance.');
  }
  if (!/report:source-provenance-readiness/.test(sourceOwnerDecisionPacket.command ?? '') || !/check:source-provenance-report/.test(sourceOwnerDecisionPacket.command ?? '')) {
    failures.push('source_owner_decision_packet must route through the focused source provenance report/check handles.');
  }
  if (!/does not.*commit|does not.*unstage|does not.*stash|does not.*revert|does not.*delete|does not.*rename|does not.*move|does not.*choose owner intent|does not.*clear source provenance|does not.*run release-readiness|does not.*push|does not.*deploy|does not.*request production approval|does not.*grant approval|does not.*hosted\/live parity|does not.*prove current local cleanliness|does not.*production approval/i.test(sourceOwnerDecisionPacket.evidenceBoundary ?? '')) {
    failures.push('source_owner_decision_packet must preserve the no-mutation, no-owner-intent, no-release-execution, no-approval, no-live-proof, and non-cleanliness boundary.');
  }
  expectSourceLineage('source_owner_decision_packet', {
    sourceManifestPath: 'source_provenance.owner_decision_packet',
    sourceProofTypes: [
      'source_owner_decision_packet',
      'source_rename_decision',
    ],
  });
  const releaseToolchainApprovalDeficitLedger = itemById.get('release_toolchain_approval_deficit_ledger') ?? {};
  if (!/package-manager pin|Corepack pnpm resolver|release-readiness execution|Git LFS push-path proof|clean source provenance|explicit owner production approval|deficit/i.test(`${releaseToolchainApprovalDeficitLedger.evidenceBoundary ?? ''}\n${releaseToolchainApprovalDeficitLedger.nextAction ?? ''}`)) {
    failures.push('release_toolchain_approval_deficit_ledger must describe release toolchain and approval deficits.');
  }
  if (!/report:release-preflight/.test(releaseToolchainApprovalDeficitLedger.command ?? '') || !/check:release-preflight-report/.test(releaseToolchainApprovalDeficitLedger.command ?? '')) {
    failures.push('release_toolchain_approval_deficit_ledger must route through the focused release preflight report/check handles.');
  }
  if (!/does not.*install tools|does not.*clear source provenance|does not.*run release-readiness|does not.*push|does not.*deploy|does not.*hosted\/live parity|does not.*grant owner approval|does not.*create launch readiness|does not prove production approval/i.test(releaseToolchainApprovalDeficitLedger.evidenceBoundary ?? '')) {
    failures.push('release_toolchain_approval_deficit_ledger must preserve the non-execution, no-live-proof, no-approval, and no-launch-readiness boundary.');
  }
  expectSourceLineage('release_toolchain_approval_deficit_ledger', {
    sourceManifestPath: 'release_preflight.items',
    sourceProofTypes: [
      'package_manager_pin',
      'toolchain_probe',
      'gated_release_command',
      'source_provenance_decision',
      'manual_approval',
    ],
  });
  const releasePreflightQueue = itemById.get('release_preflight_remediation_queue') ?? {};
  if (!/Corepack pnpm resolver|release-readiness execution|Git LFS push-path proof|explicit owner production approval/i.test(`${releasePreflightQueue.evidenceBoundary ?? ''}\n${releasePreflightQueue.nextAction ?? ''}`)) {
    failures.push('release_preflight_remediation_queue must describe the release-preflight remediation sequence.');
  }
  if (!/report:release-preflight/.test(releasePreflightQueue.command ?? '') || !/check:release-preflight-report/.test(releasePreflightQueue.command ?? '')) {
    failures.push('release_preflight_remediation_queue must route through the focused release preflight report/check handles.');
  }
  if (!/does not.*install tools|does not.*run release-readiness|does not.*push|does not.*deploy|does not.*prove production approval/i.test(releasePreflightQueue.evidenceBoundary ?? '')) {
    failures.push('release_preflight_remediation_queue must preserve the non-execution and non-approval boundary.');
  }
  expectSourceLineage('release_preflight_remediation_queue', {
    sourceManifestPath: 'release_preflight.remediation_queue',
    sourceProofTypes: [
      'toolchain_probe',
      'gated_release_command',
      'source_provenance_decision',
      'manual_approval',
    ],
  });
  const releaseOperatorHandoffPacket = itemById.get('release_operator_handoff_packet') ?? {};
  if (!/release remediation rows|operator|owner|execution gates|toolchain_probe_first|after_corepack_git_lfs_and_clean_source|owner_source_decision_first|manual_stop_after_all_prerequisites|blocks_release_gate|can_execute_from_packet=false/i.test(`${releaseOperatorHandoffPacket.evidenceBoundary ?? ''}\n${releaseOperatorHandoffPacket.nextAction ?? ''}`)) {
    failures.push('release_operator_handoff_packet must describe release remediation rows, execution gates, blocking rows, and non-executable packet semantics.');
  }
  if (!/report:release-preflight/.test(releaseOperatorHandoffPacket.command ?? '') || !/check:release-preflight-report/.test(releaseOperatorHandoffPacket.command ?? '')) {
    failures.push('release_operator_handoff_packet must route through the focused release preflight report/check handles.');
  }
  if (!/does not.*install Corepack|does not.*enable Corepack|does not.*install Git LFS|does not.*run release-readiness|does not.*clear source provenance|does not.*push|does not.*deploy|does not.*request production approval|does not.*grant owner approval|does not.*hosted\/live parity|does not.*prove production approval|does not.*create launch readiness/i.test(releaseOperatorHandoffPacket.evidenceBoundary ?? '')) {
    failures.push('release_operator_handoff_packet must preserve the no-install, no-release-execution, no-source-clearance, no-push, no-deploy, no-approval-request, no-owner-approval, no-live-proof, no-approval, and no-launch-readiness boundary.');
  }
  expectSourceLineage('release_operator_handoff_packet', {
    sourceManifestPath: 'release_preflight.operator_handoff_packet',
    sourceProofTypes: [
      'release_operator_handoff_packet',
      'toolchain_probe',
      'gated_release_command',
      'source_provenance_decision',
      'manual_approval',
    ],
  });
  const releasePreflightClearanceMatrix = itemById.get('release_preflight_clearance_matrix') ?? {};
  if (!/package-manager pin|Corepack pnpm resolver|release-readiness execution|Git LFS push-path proof|clean source provenance|explicit owner production approval/i.test(`${releasePreflightClearanceMatrix.evidenceBoundary ?? ''}\n${releasePreflightClearanceMatrix.nextAction ?? ''}`)) {
    failures.push('release_preflight_clearance_matrix must describe every release preflight clearance row.');
  }
  if (!/report:release-preflight/.test(releasePreflightClearanceMatrix.command ?? '') || !/check:release-preflight-report/.test(releasePreflightClearanceMatrix.command ?? '')) {
    failures.push('release_preflight_clearance_matrix must route through the focused release preflight report/check handles.');
  }
  if (!/does not.*install tools|does not.*clear source provenance|does not.*run release-readiness|does not.*push|does not.*deploy|does not.*hosted\/live parity|does not.*grant owner approval/i.test(releasePreflightClearanceMatrix.evidenceBoundary ?? '')) {
    failures.push('release_preflight_clearance_matrix must preserve the non-execution, no-live-proof, and no-approval boundary.');
  }
  expectSourceLineage('release_preflight_clearance_matrix', {
    sourceManifestPath: 'release_preflight.clearance_matrix',
    sourceProofTypes: [
      'release_preflight_clearance_matrix',
      'package_manager_pin',
      'toolchain_probe',
      'gated_release_command',
      'source_provenance_decision',
      'manual_approval',
    ],
  });
  const releaseToolchainProbeLedger = itemById.get('release_toolchain_probe_ledger') ?? {};
  if (!/Corepack pnpm resolver|Git LFS availability|git lfs/i.test(`${releaseToolchainProbeLedger.evidenceBoundary ?? ''}\n${releaseToolchainProbeLedger.nextAction ?? ''}`)) {
    failures.push('release_toolchain_probe_ledger must describe the Corepack and Git LFS toolchain probes.');
  }
  if (!/does not.*install tools|does not.*run release-readiness|does not.*push|does not.*deploy|does not.*clear source provenance|does not.*grant production approval|does not substitute/i.test(releaseToolchainProbeLedger.evidenceBoundary ?? '')) {
    failures.push('release_toolchain_probe_ledger must preserve the non-execution, non-substitution, and non-approval boundary.');
  }
  expectSourceLineage('release_toolchain_probe_ledger', {
    sourceManifestPath: 'release_preflight.toolchain_probe_ledger',
    sourceProofTypes: [
      'corepack_pnpm_toolchain_probe',
      'git_lfs_push_path_probe',
    ],
  });
  const branchQueue = itemById.get('unmerged_branch_review_queue') ?? {};
  if (!/review-first packet/i.test(`${branchQueue.evidenceBoundary ?? ''}\n${branchQueue.nextAction ?? ''}`)) {
    failures.push('unmerged_branch_review_queue must describe review-first branch packets.');
  }
  const branchFamilyFreshnessRollup = itemById.get('branch_family_freshness_rollup') ?? {};
  if (!/local-only|origin-only|matching|local-ahead|origin-ahead|diverged|stale|aging|fresh|high-risk|review-first|branch-family counts/i.test(`${branchFamilyFreshnessRollup.evidenceBoundary ?? ''}\n${branchFamilyFreshnessRollup.nextAction ?? ''}`)) {
    failures.push('branch_family_freshness_rollup must describe branch family state, freshness, high-risk, and review-first counts.');
  }
  if (!/does not.*checkout|does not.*merge|does not.*push|does not.*discard|does not.*select canonical heads|does not.*migrate|does not.*deploy|does not.*clear branch review|does not.*create launch evidence|does not.*prove current source readiness|does not.*prove production approval/i.test(branchFamilyFreshnessRollup.evidenceBoundary ?? '')) {
    failures.push('branch_family_freshness_rollup must preserve the no-mutation, no-clearance, no-launch-evidence, no-source-readiness, and no-approval boundary.');
  }
  const topBranchReviewPacket = itemById.get('top_branch_review_packet') ?? {};
  if (!/highest-priority|focused read-only branch packet|local\/origin state|branch freshness|changed categories|changed Supabase function rows|canonical-head comparison/i.test(`${topBranchReviewPacket.evidenceBoundary ?? ''}\n${topBranchReviewPacket.nextAction ?? ''}`)) {
    failures.push('top_branch_review_packet must describe the focused top branch packet dimensions.');
  }
  if (topBranchReviewPacket.sourceManifestPath !== 'branch_review.top_review_packet') {
    failures.push('top_branch_review_packet must map back to branch_review.top_review_packet.');
  }
  const topBranchProofTypes = topBranchReviewPacket.sourceProofTypes ?? [];
  for (const proofType of [
    'skipped_read_only_branch_packet_probe',
    'empty_read_only_branch_packet_probe',
    'high_risk_read_only_branch_packet',
    'review_first_read_only_branch_packet',
    'focused_read_only_branch_packet',
  ]) {
    if (!topBranchProofTypes.includes(proofType)) {
      failures.push(`top_branch_review_packet sourceProofTypes must include ${proofType}.`);
    }
  }
  if (!/does not.*checkout|does not.*merge|does not.*push|does not.*discard|does not.*migrate|does not.*deploy|does not.*mutate Supabase|does not.*select a canonical head|does not.*clear branch review|does not.*create launch evidence|does not.*prove production approval/i.test(topBranchReviewPacket.evidenceBoundary ?? '')) {
    failures.push('top_branch_review_packet must preserve the no-mutation, no-clearance, no-launch-evidence, and no-approval boundary.');
  }
  const branchClearanceMatrix = itemById.get('branch_clearance_matrix') ?? {};
  if (!/read-only branch review rows|review-first families|canonical-head decisions|stale or aging|release-gate/i.test(`${branchClearanceMatrix.evidenceBoundary ?? ''}\n${branchClearanceMatrix.nextAction ?? ''}`)) {
    failures.push('branch_clearance_matrix must describe branch review rows, review-first families, canonical-head decisions, freshness drift, and release-gate dependencies.');
  }
  if (branchClearanceMatrix.sourceManifestPath !== 'branch_review.clearance_matrix') {
    failures.push('branch_clearance_matrix must map back to branch_review.clearance_matrix.');
  }
  if (branchClearanceMatrix.sourceProofType !== 'read_only_branch_clearance_matrix') {
    failures.push('branch_clearance_matrix sourceProofType must be read_only_branch_clearance_matrix.');
  }
  if (!/does not.*checkout|does not.*merge|does not.*push|does not.*discard|does not.*select canonical heads|does not.*run migrations|does not.*deploy|does not.*grant production approval|does not.*clear branch review|does not.*prove production approval/i.test(branchClearanceMatrix.evidenceBoundary ?? '')) {
    failures.push('branch_clearance_matrix must preserve the no-mutation, no-clearance, and no-approval boundary.');
  }
  const branchOperatorHandoffPacket = itemById.get('branch_operator_handoff_packet') ?? {};
  if (!/operator|owner|execution gates|read-only focused review first|owner canonical-head decision first|blocking branch-gate rows|can_execute_from_packet=false/i.test(`${branchOperatorHandoffPacket.evidenceBoundary ?? ''}\n${branchOperatorHandoffPacket.nextAction ?? ''}`)) {
    failures.push('branch_operator_handoff_packet must describe operator and owner execution gates, blocking branch rows, and non-executable packet semantics.');
  }
  if (!/report:branch-review-readiness/.test(branchOperatorHandoffPacket.command ?? '') || !/check:branch-review-report/.test(branchOperatorHandoffPacket.command ?? '')) {
    failures.push('branch_operator_handoff_packet must route through the focused branch review report/check handles.');
  }
  if (!/does not.*checkout|does not.*merge|does not.*push|does not.*discard|does not.*delete|does not.*select canonical heads|does not.*run migrations|does not.*mutate Supabase|does not.*deploy|does not.*request production approval|does not.*grant owner approval|does not.*hosted\/live parity|does not.*clear branch review|does not.*create launch evidence|does not.*prove production approval/i.test(branchOperatorHandoffPacket.evidenceBoundary ?? '')) {
    failures.push('branch_operator_handoff_packet must preserve the no-mutation, no-execution, no-owner-approval, no-live-proof, no-clearance, no-launch-evidence, and no-approval boundary.');
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
  const launchActionOperatorHandoffPacket = itemById.get('launch_action_operator_handoff_packet') ?? {};
  if (!/source provenance|launch evidence validation|release toolchain|branch review|Supabase advisor|buyer evidence|production approval|post-deploy live proof|execution gates|resolve_source_provenance_first|attach_launch_validation_evidence|release_toolchain_after_clean_source|read_only_branch_review_before_approval|supabase_advisor_after_authorization|buyer_evidence_before_approval|owner_approval_after_all_prelaunch_gates|post_deploy_proof_after_approved_deploy|blocks_launch_clearance|can_execute_from_packet=false/i.test(`${launchActionOperatorHandoffPacket.evidenceBoundary ?? ''}\n${launchActionOperatorHandoffPacket.nextAction ?? ''}`)) {
    failures.push('launch_action_operator_handoff_packet must describe launch action rows, execution gates, launch-blocking rows, and non-executable packet semantics.');
  }
  if (!/report:launch-action-readiness/.test(launchActionOperatorHandoffPacket.command ?? '') || !/check:launch-action-report/.test(launchActionOperatorHandoffPacket.command ?? '')) {
    failures.push('launch_action_operator_handoff_packet must route through the focused launch action report/check handles.');
  }
  if (!/does not.*execute queue rows|does not.*commit|does not.*unstage|does not.*stash|does not.*revert|does not.*clear source provenance|does not.*run release-readiness|does not.*checkout branches|does not.*merge|does not.*push|does not.*contact buyers|does not.*access Supabase|does not.*request owner approval|does not.*deploy|does not.*mutate live services|does not.*run browser smoke|does not.*hosted\/live parity|does not.*raise launch status/i.test(launchActionOperatorHandoffPacket.evidenceBoundary ?? '')) {
    failures.push('launch_action_operator_handoff_packet must preserve the no-queue-execution, no-source-mutation, no-release-readiness, no-branch-mutation, no-external-action, no-approval-request, no-deploy, no-live-proof, and no-launch-status boundary.');
  }
  const productionApprovalQueue = itemById.get('production_approval_prerequisite_queue') ?? {};
  if (!/clean source provenance|launch evidence validation|Corepack release-readiness|explicit owner approval|post-deploy live proof/i.test(`${productionApprovalQueue.evidenceBoundary ?? ''}\n${productionApprovalQueue.nextAction ?? ''}`)) {
    failures.push('production_approval_prerequisite_queue must describe the approval prerequisite sequence.');
  }
  if (!/does not prove production approval|does not.*deploy|does not.*push|does not.*contact buyers|does not.*prove launch evidence validation/i.test(productionApprovalQueue.evidenceBoundary ?? '')) {
    failures.push('production_approval_prerequisite_queue must preserve the non-approval, non-execution, and non-validation boundary.');
  }
  expectSourceLineage('production_approval_prerequisite_queue', {
    sourceManifestPath: 'production_approval.prerequisite_queue',
    sourceProofTypes: [
      'source_provenance_decision',
      'manifest_validation',
      'gated_release_command',
      'read_only_branch_review',
      'external_account_evidence',
      'retained_buyer_evidence_validation',
      'manual_approval',
      'post_deploy_live_proof_gate',
    ],
  });
  const productionApprovalRequestPacket = itemById.get('production_approval_request_packet') ?? {};
  if (!/pre-request|owner-decision|post-deploy-boundary|request packet/i.test(`${productionApprovalRequestPacket.evidenceBoundary ?? ''}\n${productionApprovalRequestPacket.nextAction ?? ''}`)) {
    failures.push('production_approval_request_packet must describe the approval request packet phases.');
  }
  if (!/does not prove production approval|does not.*deploy|does not.*push|does not.*contact buyers|does not.*access Supabase|does not.*clear source provenance|does not.*prove hosted\/live parity/i.test(productionApprovalRequestPacket.evidenceBoundary ?? '')) {
    failures.push('production_approval_request_packet must preserve the no-approval, no-deploy, no-buyer-contact, no-Supabase-access, and no-live-parity boundary.');
  }
  expectSourceLineage('production_approval_request_packet', {
    sourceManifestPath: 'production_approval.request_packet',
    sourceProofTypes: [
      'production_approval_request_packet',
      'source_provenance_decision',
      'manifest_validation',
      'gated_release_command',
      'read_only_branch_review',
      'external_account_evidence',
      'retained_buyer_evidence_validation',
      'manual_approval',
      'post_deploy_live_proof_gate',
    ],
  });
  const productionApprovalOperatorHandoffPacket = itemById.get('production_approval_operator_handoff_packet') ?? {};
  if (!/production approval request packet rows|execution gates|clean_source_provenance_first|attach_manifest_validation_evidence|release_readiness_after_clean_source|branch_review_before_owner_request|supabase_advisor_after_authorization|buyer_evidence_validation_before_approval|owner_approval_after_pre_request_gates|post_deploy_proof_after_approved_deploy|pre_request|owner_decision|post_deploy_boundary|blocks_approval_request|owner_decision_required|can_execute_from_packet=false/i.test(`${productionApprovalOperatorHandoffPacket.evidenceBoundary ?? ''}\n${productionApprovalOperatorHandoffPacket.nextAction ?? ''}`)) {
    failures.push('production_approval_operator_handoff_packet must describe approval request rows, execution gates, request phases, owner-decision flags, post-deploy flags, blocking rows, and non-executable packet semantics.');
  }
  if (!/report:production-approval-readiness/.test(productionApprovalOperatorHandoffPacket.command ?? '') || !/check:production-approval-report/.test(productionApprovalOperatorHandoffPacket.command ?? '')) {
    failures.push('production_approval_operator_handoff_packet must route through the focused production approval report/check handles.');
  }
  if (!/does not.*request owner approval|does not.*grant approval|does not.*run deploys|does not.*push|does not.*merge|does not.*mutate branches|does not.*contact buyers|does not.*access Supabase|does not.*clear source provenance|does not.*run release-readiness|does not.*hosted\/live parity|does not.*commercial launch readiness status|does not prove production approval|does not.*deploy authorization/i.test(productionApprovalOperatorHandoffPacket.evidenceBoundary ?? '')) {
    failures.push('production_approval_operator_handoff_packet must preserve the no-approval-request, no-approval, no-deploy, no-push, no-merge, no-branch-mutation, no-buyer-contact, no-Supabase-access, no-source-clearance, no-release-readiness, no-live-proof, no-commercial-launch-readiness, and no-deploy-authorization boundary.');
  }
  expectSourceLineage('production_approval_operator_handoff_packet', {
    sourceManifestPath: 'production_approval.operator_handoff_packet',
    sourceProofTypes: [
      'production_approval_operator_handoff_packet',
      'source_provenance_decision',
      'manifest_validation',
      'gated_release_command',
      'read_only_branch_review',
      'external_account_evidence',
      'retained_buyer_evidence_validation',
      'manual_approval',
      'post_deploy_live_proof_gate',
    ],
  });
  const postDeployQueue = itemById.get('post_deploy_live_proof_gate_queue') ?? {};
  if (!/live public metadata|live static dist parity|hosted proof-pack route smoke|check:post-deploy-live/i.test(`${postDeployQueue.evidenceBoundary ?? ''}\n${postDeployQueue.nextAction ?? ''}`)) {
    failures.push('post_deploy_live_proof_gate_queue must describe the post-deploy live proof gates.');
  }
  if (!/does not prove current hosted\/live parity|does not.*deploy|does not.*rebuild|does not.*run browser smoke/i.test(postDeployQueue.evidenceBoundary ?? '')) {
    failures.push('post_deploy_live_proof_gate_queue must preserve the no-live-parity and no-live-mutation boundary.');
  }
  const postDeployOperatorHandoffPacket = itemById.get('post_deploy_live_proof_operator_handoff_packet') ?? {};
  if (!/post-deploy live proof gate queue rows|operator execution gates|production_approval_clearance_first|approved_deploy_after_owner_phrase|live_metadata_after_approved_deploy|static_parity_after_metadata_and_build|hosted_smoke_after_deploy|parity_claim_after_all_live_gates_pass|approval_required|deploy_required|live_account_required|browser_smoke_required|blocks_live_proof_gate|can_execute_from_packet=false/i.test(`${postDeployOperatorHandoffPacket.evidenceBoundary ?? ''}\n${postDeployOperatorHandoffPacket.nextAction ?? ''}`)) {
    failures.push('post_deploy_live_proof_operator_handoff_packet must describe post-deploy rows, execution gates, approval/deploy/live/browser flags, blocking rows, and non-executable packet semantics.');
  }
  if (!/report:post-deploy-live-proof-readiness/.test(postDeployOperatorHandoffPacket.command ?? '') || !/check:post-deploy-live-proof-report/.test(postDeployOperatorHandoffPacket.command ?? '')) {
    failures.push('post_deploy_live_proof_operator_handoff_packet must route through the focused post-deploy live proof report/check handles.');
  }
  if (!/does not.*grant owner approval|does not.*run deploys|does not.*deploy-production\.sh|does not.*netlify deploy|does not.*push|does not.*rebuild|does not.*mutate Netlify|does not.*access live accounts|does not.*run browser smoke|does not.*prove current hosted\/live parity|does not prove production approval|does not.*create launch readiness/i.test(postDeployOperatorHandoffPacket.evidenceBoundary ?? '')) {
    failures.push('post_deploy_live_proof_operator_handoff_packet must preserve the no-approval, no-deploy, no-live-account, no-browser-smoke, no-live-proof, no-approval, and no-launch-readiness boundary.');
  }
  const localProofPackBrowserSmoke = itemById.get('local_proof_pack_browser_smoke') ?? {};
  if (!/local proof-pack browser smoke|Chromium|local preview|\/tmp\/ceip-local-proof-packs/i.test(`${localProofPackBrowserSmoke.evidenceBoundary ?? ''}\n${localProofPackBrowserSmoke.nextAction ?? ''}`)) {
    failures.push('local_proof_pack_browser_smoke must describe local Chromium proof-pack smoke and /tmp Playwright report evidence.');
  }
  if (!/test:browser:local:proof-packs/.test(localProofPackBrowserSmoke.command ?? '')) {
    failures.push('local_proof_pack_browser_smoke must route through the local proof-pack browser smoke script.');
  }
  if (!/does not.*Corepack-pinned release-readiness|does not.*deploy|does not.*mutate Netlify|does not.*hosted proof-pack smoke|does not.*post-deploy live parity|does not.*buyer evidence|does not.*production approval|does not.*launch readiness/i.test(localProofPackBrowserSmoke.evidenceBoundary ?? '')) {
    failures.push('local_proof_pack_browser_smoke must preserve the no-release-readiness, no-deploy, no-hosted-smoke, no-live-proof, no-buyer-proof, no-approval, and no-launch-readiness boundary.');
  }
  const buyerEvidenceGate = itemById.get('buyer_evidence_gate') ?? {};
  const buyerEvidenceGateText = `${buyerEvidenceGate.evidenceBoundary ?? ''}\n${buyerEvidenceGate.nextAction ?? ''}`;
  for (const pattern of [
    /buyer evidence 95%/i,
    /accepted buyer rows/i,
    /reviewer evidence/i,
    /commercial signal/i,
    /retained artifact hashes/i,
    /95% validation/i,
    /validate:pilot-evidence --require-95/i,
  ]) {
    if (!pattern.test(buyerEvidenceGateText)) {
      failures.push('buyer_evidence_gate must describe accepted buyer rows, reviewer evidence, commercial signal, retained artifacts, and the 95% validation requirement.');
      break;
    }
  }
  if (!/report:buyer-evidence-gate-readiness/.test(buyerEvidenceGate.command ?? '') || !/check:buyer-evidence-gate-report/.test(buyerEvidenceGate.command ?? '')) {
    failures.push('buyer_evidence_gate must route through the focused buyer evidence gate report/check handles before raw validation.');
  }
  for (const pattern of [
    /does not contact buyers/i,
    /does not create accepted evidence/i,
    /does not move confidence/i,
    /does not attach artifacts/i,
    /does not validate 95/i,
    /does not claim buyer acceptance/i,
    /does not prove commercial readiness/i,
    /does not replace validate:pilot-evidence --require-95/i,
  ]) {
    if (!pattern.test(buyerEvidenceGate.evidenceBoundary ?? '')) {
      failures.push('buyer_evidence_gate must preserve the no-contact, no-buyer-proof, no-validation, no-readiness, and no-validator-replacement boundary.');
      break;
    }
  }
  expectSourceLineage('buyer_evidence_gate', {
    sourceManifestPath: 'buyer_evidence',
    sourceProofTypes: [
      'buyer_evidence_hard_gate',
      'buyer_evidence_acquisition_matrix',
      'buyer_evidence_minimum_packet_handoff',
    ],
  });
  const buyerHardGateDeficitLedger = itemById.get('buyer_evidence_hard_gate_deficit_ledger') ?? {};
  if (!/accepted buyer evidence|reviewer evidence|commercial signal|retained artifacts|95% validation|hard-gate/i.test(`${buyerHardGateDeficitLedger.evidenceBoundary ?? ''}\n${buyerHardGateDeficitLedger.nextAction ?? ''}`)) {
    failures.push('buyer_evidence_hard_gate_deficit_ledger must describe buyer hard-gate deficits.');
  }
  if (!/does not.*contact buyers|does not.*create accepted evidence|does not.*move confidence|does not.*attach artifacts|does not.*validate 95|does not.*claim buyer acceptance|does not.*create buyer proof|does not.*prove commercial readiness/i.test(buyerHardGateDeficitLedger.evidenceBoundary ?? '')) {
    failures.push('buyer_evidence_hard_gate_deficit_ledger must preserve the no-contact, no-buyer-proof, and no-commercial-readiness boundary.');
  }
  expectSourceLineage('buyer_evidence_hard_gate_deficit_ledger', {
    sourceManifestPath: 'buyer_evidence.hard_gate_deficits',
    sourceProofTypes: [
      'buyer_evidence_hard_gate',
    ],
  });
  const buyerAcquisitionMatrix = itemById.get('buyer_evidence_acquisition_matrix') ?? {};
  if (!/outreach intake|production pilot register|utility forecast|TIER or credit|billing or security|distinct proof-pack|accepted confidence|reviewer|retained artifact|95% validation/i.test(`${buyerAcquisitionMatrix.evidenceBoundary ?? ''}\n${buyerAcquisitionMatrix.nextAction ?? ''}`)) {
    failures.push('buyer_evidence_acquisition_matrix must describe the buyer-evidence acquisition rows.');
  }
  if (!/does not.*contact buyers|does not.*create accepted evidence|does not.*move confidence|does not.*attach artifacts|does not.*validate 95|does not.*claim buyer acceptance|does not.*create buyer proof|does not.*prove commercial readiness/i.test(buyerAcquisitionMatrix.evidenceBoundary ?? '')) {
    failures.push('buyer_evidence_acquisition_matrix must preserve the no-contact, no-buyer-proof, and no-commercial-readiness boundary.');
  }
  expectSourceLineage('buyer_evidence_acquisition_matrix', {
    sourceManifestPath: 'buyer_evidence.acquisition_matrix',
    sourceProofTypes: [
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
    ],
  });
  const buyerMinimumPacketHandoff = itemById.get('buyer_evidence_minimum_packet_handoff') ?? {};
  if (!/minimum buyer evidence packet|buyer_evidence\.acquisition_matrix\.rows|outreach intake|production pilot register|utility forecast|TIER or credit|billing or security|retained-artifact 95% validation|Blocks 95 Gate|validation commands|validate:pilot-evidence --require-95/i.test(`${buyerMinimumPacketHandoff.evidenceBoundary ?? ''}\n${buyerMinimumPacketHandoff.nextAction ?? ''}`)) {
    failures.push('buyer_evidence_minimum_packet_handoff must describe the minimum buyer evidence packet rows, validation commands, and 95% gate blockers.');
  }
  if (!/report:buyer-evidence-gate-readiness/.test(buyerMinimumPacketHandoff.command ?? '') || !/check:buyer-evidence-gate-report/.test(buyerMinimumPacketHandoff.command ?? '')) {
    failures.push('buyer_evidence_minimum_packet_handoff must route through the focused buyer evidence gate report/check handles.');
  }
  if (!/does not.*contact buyers|does not.*send outreach|does not.*create accepted evidence|does not.*move confidence|does not.*attach retained artifacts|does not.*validate 95|does not.*create buyer proof|does not.*claim buyer acceptance|does not.*grant production approval|does not.*deploy|does not.*hosted\/live parity|does not.*prove commercial readiness|does not.*create launch readiness/i.test(buyerMinimumPacketHandoff.evidenceBoundary ?? '')) {
    failures.push('buyer_evidence_minimum_packet_handoff must preserve the no-contact, no-buyer-proof, no-validation, no-approval, no-deploy, no-live-proof, and no-readiness boundary.');
  }
  expectSourceLineage('buyer_evidence_minimum_packet_handoff', {
    sourceManifestPath: 'buyer_evidence.minimum_evidence_packet',
    sourceProofTypes: [
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
    ],
  });
  const buyerRemediationQueue = itemById.get('buyer_evidence_remediation_queue') ?? {};
  if (!/accepted buyer evidence|reviewer evidence|commercial signal|retained artifacts|95% validation/i.test(`${buyerRemediationQueue.evidenceBoundary ?? ''}\n${buyerRemediationQueue.nextAction ?? ''}`)) {
    failures.push('buyer_evidence_remediation_queue must describe the buyer-evidence hard-gate remediation sequence.');
  }
  if (!/does not.*contact buyers|does not.*create accepted evidence|does not.*move confidence|does not.*validate 95|does not.*claim buyer acceptance/i.test(buyerRemediationQueue.evidenceBoundary ?? '')) {
    failures.push('buyer_evidence_remediation_queue must preserve the no-contact and no-buyer-proof boundary.');
  }
  expectSourceLineage('buyer_evidence_remediation_queue', {
    sourceManifestPath: 'buyer_evidence.hard_gate_deficits.remediation_queue',
    sourceProofTypes: [
      'buyer_evidence_hard_gate',
    ],
  });
  expectSourceLineage('supabase_advisor_access', {
    sourceManifestPath: 'supabase_advisor',
    sourceProofTypes: [
      'repo_command',
      'external_account_evidence',
    ],
  });
  const supabaseClearanceDeficitLedger = itemById.get('supabase_advisor_clearance_deficit_ledger') ?? {};
  if (!/CLI lint freshness|connector authorization|Security Advisor evidence|Performance Advisor evidence|public-safe findings|no-clearance claim/i.test(`${supabaseClearanceDeficitLedger.evidenceBoundary ?? ''}\n${supabaseClearanceDeficitLedger.nextAction ?? ''}`)) {
    failures.push('supabase_advisor_clearance_deficit_ledger must describe Supabase advisor clearance deficits.');
  }
  if (!/does not.*authorize connectors|does not.*access the dashboard|does not.*rerun advisors|does not.*mutate the database|does not.*record secrets|does not.*clear advisor findings|does not.*claim advisor clearance|does not.*grant production approval|does not.*create launch readiness/i.test(supabaseClearanceDeficitLedger.evidenceBoundary ?? '')) {
    failures.push('supabase_advisor_clearance_deficit_ledger must preserve the no-access, no-secret, no-clearance, and no-approval boundary.');
  }
  expectSourceLineage('supabase_advisor_clearance_deficit_ledger', {
    sourceManifestPath: 'supabase_advisor.clearance_deficits',
    sourceProofTypes: [
      'repo_command',
      'external_account_evidence',
      'retained_redacted_record',
    ],
  });
  const supabaseOperatorHandoffPacket = itemById.get('supabase_advisor_operator_handoff_packet') ?? {};
  if (!/advisor remediation rows|operator|account-admin|security-owner|owner execution gates|repo_lint_freshness_first|authorized_connector_or_dashboard_access_first|security_advisor_after_authorization|performance_advisor_after_authorization|public_safe_record_after_advisor_review|clearance_claim_after_all_rows_pass|external-account flags|public-safe record flags|secret-safe flags|blocks_advisor_gate|can_execute_from_packet=false/i.test(`${supabaseOperatorHandoffPacket.evidenceBoundary ?? ''}\n${supabaseOperatorHandoffPacket.nextAction ?? ''}`)) {
    failures.push('supabase_advisor_operator_handoff_packet must describe advisor remediation rows, execution gates, external-account flags, public-safe flags, secret-safe flags, blocking rows, and non-executable packet semantics.');
  }
  if (!/report:supabase-advisor-readiness/.test(supabaseOperatorHandoffPacket.command ?? '') || !/check:supabase-advisor-report/.test(supabaseOperatorHandoffPacket.command ?? '')) {
    failures.push('supabase_advisor_operator_handoff_packet must route through the focused Supabase advisor report/check handles.');
  }
  if (!/does not.*authorize connectors|does not.*access dashboards|does not.*rerun Security Advisor|does not.*Performance Advisor|does not.*mutate the database|does not.*run migrations|does not.*record secrets|does not.*clear advisor findings|does not.*request production approval|does not.*deploy|does not.*hosted\/live parity|does not.*create or claim advisor clearance/i.test(supabaseOperatorHandoffPacket.evidenceBoundary ?? '')) {
    failures.push('supabase_advisor_operator_handoff_packet must preserve the no-authorization, no-dashboard-access, no-advisor-rerun, no-db-mutation, no-secret, no-clearance, no-approval-request, no-deploy, and no-live-proof boundary.');
  }
  expectSourceLineage('supabase_advisor_operator_handoff_packet', {
    sourceManifestPath: 'supabase_advisor.operator_handoff_packet',
    sourceProofTypes: [
      'supabase_advisor_operator_handoff_packet',
      'repo_command',
      'external_account_evidence',
      'retained_redacted_record',
    ],
  });
  const supabaseRemediationQueue = itemById.get('supabase_advisor_remediation_queue') ?? {};
  if (!/CLI lint freshness|connector authorization|Security Advisor evidence|Performance Advisor evidence|public-safe findings|no-clearance-claim/i.test(`${supabaseRemediationQueue.evidenceBoundary ?? ''}\n${supabaseRemediationQueue.nextAction ?? ''}`)) {
    failures.push('supabase_advisor_remediation_queue must describe the Supabase advisor remediation sequence.');
  }
  if (!/does not.*authorize connectors|does not.*access the dashboard|does not.*rerun advisors|does not.*mutate the database|does not.*record secrets|does not.*claim advisor clearance/i.test(supabaseRemediationQueue.evidenceBoundary ?? '')) {
    failures.push('supabase_advisor_remediation_queue must preserve the no-access, no-secret, and no-clearance boundary.');
  }
  expectSourceLineage('supabase_advisor_remediation_queue', {
    sourceManifestPath: 'supabase_advisor.clearance_deficits.remediation_queue',
    sourceProofTypes: [
      'repo_command',
      'external_account_evidence',
      'retained_redacted_record',
    ],
  });

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
