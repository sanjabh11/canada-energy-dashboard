#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const values = new Map();
const failures = [];
let skipProbes = false;
let jsonOutput = false;
let failOnBlocker = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--skip-probes') {
    skipProbes = true;
    continue;
  }
  if (arg === '--json') {
    jsonOutput = true;
    continue;
  }
  if (arg === '--fail-on-blocker') {
    failOnBlocker = true;
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
  corepack pnpm run report:branch-review-readiness

Options:
  --skip-probes        Reuse the launch manifest without running local Corepack, Git LFS, buyer, branch, or Supabase probes.
  --json               Emit the focused branch-review payload as JSON.
  --fail-on-blocker    Exit nonzero when canonical branch review is not ready.
  --output <path>      Write the report to a file as well as stdout.
`);
}

if (failures.length > 0) {
  console.error('Branch review readiness report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

function runManifest() {
  const commandArgs = ['scripts/report-launch-evidence-manifest.mjs'];
  if (skipProbes) commandArgs.push('--skip-probes');

  const result = spawnSync(process.execPath, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 60 * 1024 * 1024,
  });

  if (result.error) {
    return {
      ok: false,
      error: String(result.error.message ?? result.error),
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  }
  if (result.status !== 0) {
    return {
      ok: false,
      error: `Launch evidence manifest exited ${result.status ?? 1}.`,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  }
  try {
    return { ok: true, manifest: JSON.parse(result.stdout ?? '{}') };
  } catch (error) {
    return {
      ok: false,
      error: `Could not parse launch evidence manifest JSON: ${error.message}`,
      stdout: String(result.stdout ?? '').slice(0, 4000),
      stderr: result.stderr ?? '',
    };
  }
}

function readPublicStatusHandle(id) {
  try {
    const publicManifestPath = path.join(repoRoot, 'src/lib/publicReleaseStatusManifest.json');
    const publicManifest = JSON.parse(readFileSync(publicManifestPath, 'utf8'));
    return (publicManifest.items ?? []).find((item) => item?.id === id) ?? null;
  } catch {
    return null;
  }
}

function cell(value) {
  const text = String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
  return text || '-';
}

function renderTable(headers, rows) {
  return [
    `| ${headers.map(cell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  ].join('\n');
}

function findByName(items, key, value) {
  return (items ?? []).find((item) => item?.[key] === value) ?? null;
}

function branchMergeRecommendation(row, packetByFamily = new Map()) {
  const state = row.local_origin_state ?? '';
  const highRisk = row.highest_risk === 'high';
  const staleOrAging = ['stale', 'aging'].includes(row.freshness);
  const reviewFirst = row.blocker_class === 'review_first';
  const canonicalDecision = row.blocker_class === 'canonical_head_decision';
  const packet = packetByFamily.get(row.family) ?? packetByFamily.get(row.review_ref) ?? {};
  const categories = new Set(packet.categories ?? []);
  const changedSupabaseFunctionCount = Number.isInteger(packet.changed_supabase_function_count)
    ? packet.changed_supabase_function_count
    : 0;
  const canonicalState = packet.canonical_head_comparison?.state ?? 'unknown';

  const metadata = (basis) => ({
    basis,
    categories: [...categories],
    canonical_state: canonicalState,
    changed_supabase_function_count: changedSupabaseFunctionCount,
  });

  if (highRisk && categories.has('edge-function-copy')) {
    return {
      stance: 'do_not_wholesale_merge_retire_detached_function_copy',
      next_decision: 'Treat this as a retirement candidate unless the configured Supabase entrypoint diff still has current value; never merge detached DEPLOY_ or -FINAL function copies.',
      owner: 'owner',
      ...metadata('edge-function-copy'),
    };
  }

  if (highRisk && (categories.has('payment/entitlement') || changedSupabaseFunctionCount >= 8)) {
    return {
      stance: 'do_not_wholesale_merge_extract_security_slice_only',
      next_decision: 'Keep the branch review-only; extract only a narrow entitlement, payment, or Supabase helper slice after security review, current tests, and owner approval.',
      owner: canonicalDecision || /local-only|origin-only|ahead/i.test(state) ? 'owner' : 'operator',
      ...metadata(categories.has('payment/entitlement') ? 'payment-entitlement' : 'large-supabase-function-surface'),
    };
  }

  if (highRisk && categories.has('ml/training')) {
    return {
      stance: 'do_not_wholesale_merge_research_backlog_extract_only',
      next_decision: 'Treat broad ML/training changes as backlog research; extract only current-source-compatible tests or model artifacts after retained metrics and release gates prove value.',
      owner: canonicalDecision || /local-only|origin-only|ahead/i.test(state) ? 'owner' : 'operator',
      ...metadata('ml-training-drift'),
    };
  }

  if (highRisk || reviewFirst) {
    return {
      stance: 'do_not_wholesale_merge',
      next_decision: 'Run the focused read-only branch packet, choose any canonical head first, then cherry-pick only narrow, tested changes that still matter.',
      owner: canonicalDecision || /local-only|origin-only|ahead/i.test(state) ? 'owner' : 'operator',
      ...metadata(highRisk ? 'high-risk' : 'review-first'),
    };
  }
  if (/local-only/i.test(state)) {
    return {
      stance: 'review_or_retire_local_only',
      next_decision: 'Decide whether this local-only branch remains a candidate; retire it if the focused packet finds no current launch value.',
      owner: 'owner',
      ...metadata('local-only'),
    };
  }
  if (/origin-only/i.test(state)) {
    return {
      stance: 'review_or_retire_origin_only',
      next_decision: 'Review the origin-only branch without checkout first; create a local branch only if the owner keeps it as a candidate.',
      owner: 'owner',
      ...metadata('origin-only'),
    };
  }
  if (staleOrAging || canonicalDecision) {
    return {
      stance: 'drift_review_before_merge',
      next_decision: 'Refresh read-only drift review against current main before any merge discussion.',
      owner: canonicalDecision ? 'owner' : 'operator',
      ...metadata(staleOrAging ? 'stale-or-aging' : 'canonical-decision'),
    };
  }
  return {
    stance: 'normal_review_gate',
    next_decision: 'Use normal focused review, tests, and release gates before any merge.',
    owner: 'operator',
    ...metadata('normal-review'),
  };
}

function buildBranchMergeRecommendationPacket(branchReview) {
  const clearanceRows = branchReview.clearance_matrix?.rows ?? [];
  const packetByFamily = new Map();
  for (const packet of branchReview.review_first_packets?.packets ?? []) {
    if (packet.family) packetByFamily.set(packet.family, packet);
    if (packet.branch) packetByFamily.set(packet.branch, packet);
  }
  const items = clearanceRows.map((row, index) => {
    const recommendation = branchMergeRecommendation(row, packetByFamily);
    return {
      rank: index + 1,
      family: row.family,
      review_ref: row.review_ref,
      local_origin_state: row.local_origin_state,
      highest_risk: row.highest_risk,
      freshness: row.freshness,
      blocker_class: row.blocker_class,
      recommendation: recommendation.stance,
      recommendation_basis: recommendation.basis,
      categories: recommendation.categories,
      canonical_state: recommendation.canonical_state,
      changed_supabase_function_count: recommendation.changed_supabase_function_count,
      next_decision: recommendation.next_decision,
      owner: recommendation.owner,
      proof_command: row.required_proof_command,
      proof_type: 'read_only_branch_merge_recommendation',
      can_merge_now: false,
      can_execute_from_packet: false,
      status: row.clearance_status === 'pass' ? 'ready' : 'blocked',
      proof_boundary: 'Read-only branch merge recommendation only; it does not checkout, merge, push, discard, select canonical heads, cherry-pick, run migrations, mutate Supabase, deploy, or grant production approval.',
      stop_gate: 'Do not merge, cherry-pick, push, discard, checkout, select canonical heads, run migrations, deploy, or request production approval from this recommendation packet without explicit owner approval and release gates.',
    };
  });
  const blockedItems = items.filter((item) => item.status !== 'ready');
  const doNotWholesaleCount = items.filter((item) => item.recommendation.startsWith('do_not_wholesale_merge')).length;
  const retireOrKeepCount = items.filter((item) => /review_or_retire/.test(item.recommendation)).length;
  const extractOnlyCount = items.filter((item) => /extract/.test(item.recommendation)).length;
  return {
    status: blockedItems.length > 0 ? 'blocked' : 'ready',
    proof_type: 'branch_merge_recommendation_packet',
    source: 'branch_review.clearance_matrix.rows',
    item_count: items.length,
    blocked_count: blockedItems.length,
    do_not_wholesale_merge_count: doNotWholesaleCount,
    retire_or_keep_decision_count: retireOrKeepCount,
    extract_only_decision_count: extractOnlyCount,
    proof_boundary: 'The branch merge recommendation packet translates read-only branch review evidence into best-course recommendations only; it does not checkout, merge, push, discard, select canonical heads, cherry-pick, run migrations, mutate Supabase, deploy, request production approval, or grant owner approval.',
    stop_gate: 'Do not treat this packet as merge approval, canonical-head selection, branch retirement approval, cherry-pick approval, release readiness, production approval, deploy authorization, or hosted/live proof.',
    items,
    evidence: `Branch merge recommendation packet: status=${blockedItems.length > 0 ? 'blocked' : 'ready'} items=${items.length} blocked=${blockedItems.length} do_not_wholesale_merge=${doNotWholesaleCount} extract_only=${extractOnlyCount} retire_or_keep=${retireOrKeepCount} approval_gate=read-only recommendations only; no checkout/merge/cherry-pick/push/discard/canonical-head selection without owner approval and release gates`,
  };
}

function focusedPayload(manifest) {
  const branchReview = manifest.branch_review ?? {};
  const enrichedBranchReview = {
    ...branchReview,
    branch_merge_recommendation_packet: buildBranchMergeRecommendationPacket(branchReview),
  };
  const launchActionRow = findByName(
    manifest.launch_action_queue?.items,
    'phase',
    'branch_review',
  );
  const productionPrerequisiteRow = findByName(
    manifest.production_approval?.prerequisite_queue?.items,
    'prerequisite',
    'Canonical branch review',
  );
  const productionRequestRow = findByName(
    manifest.production_approval?.request_packet?.items,
    'prerequisite',
    'Canonical branch review',
  );

  return {
    schema_version: 1,
    generated_at: manifest.run?.generated_at ?? null,
    launch_decision: manifest.launch_decision ?? null,
    repo: manifest.repo ?? {},
    branch_review: enrichedBranchReview,
    launch_action_branch_row: launchActionRow,
    production_approval_branch_prerequisite: productionPrerequisiteRow,
    production_approval_request_branch_row: productionRequestRow,
    public_status_handles: {
      unmerged_branch_review_queue: readPublicStatusHandle('unmerged_branch_review_queue'),
      branch_family_freshness_rollup: readPublicStatusHandle('branch_family_freshness_rollup'),
      top_branch_review_packet: readPublicStatusHandle('top_branch_review_packet'),
      branch_clearance_matrix: readPublicStatusHandle('branch_clearance_matrix'),
      branch_operator_handoff_packet: readPublicStatusHandle('branch_operator_handoff_packet'),
      canonical_head_decision_queue: readPublicStatusHandle('canonical_head_decision_queue'),
      canonical_head_resolution_queue: readPublicStatusHandle('canonical_head_resolution_queue'),
      review_first_branch_packet_queue: readPublicStatusHandle('review_first_branch_packet_queue'),
    },
    package_script_handles: {
      report_branch_review_readiness: 'corepack pnpm run report:branch-review-readiness',
      check_branch_review_report: 'corepack pnpm run check:branch-review-report',
      report_unmerged_branch_readiness: 'corepack pnpm run report:unmerged-branch-readiness',
      report_unmerged_branch_readiness_high_risk: 'corepack pnpm run report:unmerged-branch-readiness -- --focus-risk high',
      report_launch_evidence_manifest: 'corepack pnpm run report:launch-evidence-manifest',
      check_launch_evidence_manifest: 'corepack pnpm run check:launch-evidence-manifest',
    },
    proof_boundary: 'Focused branch-review evidence only; this report does not checkout, merge, push, discard, delete, select canonical heads, run migrations, mutate Supabase, deploy, create launch evidence, create buyer proof, grant production approval, or prove hosted/live parity.',
    stop_gate: 'Do not treat this focused report, branch inventory, review queue, canonical-head ledger, clearance matrix, focused packet, skipped probes, public status handle, or check pass as branch approval, canonical-head owner selection, merge approval, release readiness, production approval, commercial-ready status, or hosted/live parity.',
  };
}

function renderMarkdown(payload) {
  const branch = payload.branch_review ?? {};
  const risk = branch.risk_counts ?? {};
  const families = branch.family_counts ?? {};
  const freshness = branch.freshness_counts ?? {};
  const reviewQueue = branch.review_queue ?? {};
  const canonical = branch.canonical_head_decisions ?? {};
  const resolutionQueue = branch.canonical_head_resolution_queue ?? {};
  const clearanceMatrix = branch.clearance_matrix ?? {};
  const operatorHandoffPacket = branch.operator_handoff_packet ?? {};
  const mergeRecommendationPacket = branch.branch_merge_recommendation_packet ?? {};
  const packetSet = branch.review_first_packets ?? {};
  const topPacket = branch.top_review_packet ?? {};
  const comparison = topPacket.canonical_head_comparison ?? {};
  const launchRow = payload.launch_action_branch_row ?? {};
  const productionPrerequisite = payload.production_approval_branch_prerequisite ?? {};
  const productionRequest = payload.production_approval_request_branch_row ?? {};
  const publicRows = Object.entries(payload.public_status_handles ?? {}).map(([id, item]) => [
    id,
    item?.status,
    item?.command,
    item?.sourceManifestPath,
    Array.isArray(item?.sourceProofTypes)
      ? item.sourceProofTypes.join(', ')
      : item?.sourceProofType ?? '',
    item?.evidenceBoundary,
    item?.nextAction,
  ]);
  const scriptRows = Object.entries(payload.package_script_handles ?? {}).map(([name, command]) => [
    name,
    command,
  ]);

  const summaryRows = [
    ['Branch review status', branch.status],
    ['Probe status', branch.probe_status],
    ['High / medium / low risk refs', `${risk.high ?? 'unknown'} / ${risk.medium ?? 'unknown'} / ${risk.low ?? 'unknown'}`],
    ['Branch families', families.total],
    ['High-risk families', families.high_risk_families],
    ['Local-only / origin-only / local-ahead', `${families.local_only ?? 'unknown'} / ${families.origin_only ?? 'unknown'} / ${families.local_ahead ?? 'unknown'}`],
    ['Stale / aging / fresh refs', `${freshness.stale ?? 'unknown'} / ${freshness.aging ?? 'unknown'} / ${freshness.fresh ?? 'unknown'}`],
    ['Review-first queue', `${reviewQueue.review_first_count ?? 'unknown'} review-first; status=${reviewQueue.status ?? 'unknown'}`],
    ['Canonical-head decisions', `${canonical.open_count ?? 'unknown'}/${canonical.total_count ?? 'unknown'} open; status=${canonical.status ?? 'unknown'}`],
    ['Clearance matrix', `${clearanceMatrix.status ?? 'unknown'}; rows=${clearanceMatrix.family_count ?? 'unknown'}`],
    ['Operator handoff packet', `${operatorHandoffPacket.status ?? 'unknown'}; blocked=${operatorHandoffPacket.blocked_count ?? 'unknown'}/${operatorHandoffPacket.item_count ?? 'unknown'}`],
    ['Merge recommendation packet', `${mergeRecommendationPacket.status ?? 'unknown'}; do-not-wholesale=${mergeRecommendationPacket.do_not_wholesale_merge_count ?? 'unknown'}`],
    ['Top review ref', topPacket.branch ?? '<review-ref>'],
  ];

  const queueRows = (reviewQueue.items ?? []).map((item, index) => [
    index + 1,
    item.family,
    item.review_ref,
    item.priority,
    item.highest_risk,
    item.local_origin_state,
    item.freshness,
    item.reason,
    item.review_command,
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const canonicalRows = (canonical.items ?? []).map((item) => [
    item.rank,
    item.family,
    item.review_ref,
    item.local_origin_state,
    item.state_key,
    item.highest_risk,
    item.freshness,
    item.decision_needed,
    item.proof_command,
    item.status,
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const resolutionRows = (resolutionQueue.items ?? []).map((item) => [
    item.rank,
    item.family,
    item.current,
    item.needed,
    item.owner,
    item.action,
    item.proof_command,
    item.decision_status ?? item.status,
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const clearanceRows = (clearanceMatrix.rows ?? []).map((item) => [
    item.rank,
    item.family,
    item.review_ref,
    item.highest_risk,
    item.priority,
    item.blocker_class,
    item.local_origin_state,
    item.freshness,
    item.canonical_decision_needed,
    item.required_proof_command,
    item.clearance_status,
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const operatorHandoffRows = (operatorHandoffPacket.items ?? []).map((item) => [
    item.rank,
    item.family,
    item.review_ref,
    item.owner,
    item.status,
    item.execution_gate,
    item.blocker_class,
    item.highest_risk,
    item.local_origin_state,
    item.freshness,
    item.action,
    item.proof_command,
    item.proof_type,
    item.read_only ? 'yes' : 'no',
    item.blocks_branch_gate ? 'yes' : 'no',
    item.can_execute_from_packet ? 'yes' : 'no',
    item.proof_boundary,
    item.stop_gate,
  ]);

  const mergeRecommendationRows = (mergeRecommendationPacket.items ?? []).map((item) => [
    item.rank,
    item.family,
    item.review_ref,
    item.local_origin_state,
    item.highest_risk,
    item.freshness,
    item.blocker_class,
    item.recommendation,
    item.recommendation_basis,
    (item.categories ?? []).join(', '),
    item.canonical_state,
    item.changed_supabase_function_count,
    item.next_decision,
    item.owner,
    item.proof_command,
    item.can_merge_now ? 'yes' : 'no',
    item.can_execute_from_packet ? 'yes' : 'no',
    item.status,
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const packetRows = (packetSet.packets ?? []).map((item, index) => [
    index + 1,
    item.branch,
    item.family,
    item.status,
    item.priority,
    item.risk,
    item.local_origin_state,
    item.family_freshness,
    item.focused_branch_freshness,
    (item.categories ?? []).join(', '),
    item.changed_supabase_function_count,
    item.command,
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const functionRows = (topPacket.changed_supabase_function_rows ?? []).map((item) => [
    item.function_name,
    item.changed_paths,
    item.review_focus,
    item.suggested_checks,
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const comparisonRows = comparison.status ? [[
    comparison.status,
    comparison.local_ref,
    comparison.origin_ref,
    comparison.state,
    comparison.command,
    comparison.local_only_count,
    comparison.origin_only_count,
    (comparison.local_only_subjects ?? []).join('; '),
    (comparison.origin_only_subjects ?? []).join('; '),
    comparison.evidence,
  ]] : [];

  const launchRows = launchRow.phase ? [[
    launchRow.rank,
    launchRow.phase,
    launchRow.blocker,
    launchRow.owner,
    launchRow.action,
    launchRow.proof_command,
    launchRow.status,
    launchRow.proof_type,
    launchRow.proof_boundary,
    launchRow.stop_gate,
  ]] : [];

  const productionRows = productionPrerequisite.prerequisite ? [[
    productionPrerequisite.prerequisite,
    productionPrerequisite.current,
    productionPrerequisite.needed,
    productionPrerequisite.status,
    productionPrerequisite.owner,
    productionPrerequisite.proof_command,
    productionPrerequisite.proof_type,
    productionPrerequisite.proof_boundary,
    productionPrerequisite.stop_gate,
  ]] : [];

  const requestRows = productionRequest.prerequisite ? [[
    productionRequest.prerequisite,
    productionRequest.request_phase,
    productionRequest.source_status,
    productionRequest.status,
    productionRequest.blocks_request ? 'yes' : 'no',
    productionRequest.evidence_to_attach,
    productionRequest.request_impact,
  ]] : [];

  return `${[
    '# CEIP Branch Review Readiness Report',
    `Generated: ${payload.generated_at ?? 'unknown'}`,
    `Repo: ${payload.repo?.name ?? 'unknown'} @ ${payload.repo?.commit ?? 'unknown'}`,
    `Launch decision: \`${payload.launch_decision ?? 'unknown'}\``,
    `Branch review status: \`${branch.status ?? 'unknown'}\``,
    `Probe status: \`${branch.probe_status ?? 'unknown'}\``,
    `Review-first branch families: \`${reviewQueue.review_first_count ?? 'unknown'}\``,
    `Canonical-head decisions open: \`${canonical.open_count ?? 'unknown'}\``,
    `Top review ref: \`${topPacket.branch ?? '<review-ref>'}\``,
    '',
    '## Decision Boundary',
    '',
    payload.proof_boundary,
    '',
    payload.stop_gate,
    '',
    '## Summary',
    '',
    renderTable(['Metric', 'Value'], summaryRows),
    '',
    '## Branch Review Evidence',
    '',
    branch.evidence ?? 'Branch review evidence missing.',
    '',
    '## Branch Family And Freshness Rollup',
    '',
    branch.family_evidence ?? 'Branch family review evidence missing.',
    '',
    branch.freshness_evidence ?? 'Branch freshness review evidence missing.',
    '',
    '## Branch Review Queue',
    '',
    reviewQueue.evidence ?? 'Branch review queue evidence missing.',
    '',
    renderTable(['Rank', 'Family', 'Review Ref', 'Priority', 'Highest Risk', 'Local/Origin State', 'Freshness', 'Reason', 'Review Command', 'Proof Type', 'Proof Boundary', 'Stop Gate'], queueRows),
    '',
    '## Canonical Head Decisions',
    '',
    canonical.evidence ?? 'Canonical head decision ledger missing.',
    '',
    renderTable(['Rank', 'Family', 'Review Ref', 'Local/Origin State', 'State Key', 'Highest Risk', 'Freshness', 'Decision Needed', 'Proof Command', 'Status', 'Proof Type', 'Proof Boundary', 'Stop Gate'], canonicalRows),
    '',
    '## Canonical Head Resolution Queue',
    '',
    resolutionQueue.evidence ?? 'Canonical head resolution queue missing.',
    '',
    renderTable(['Rank', 'Family', 'Current', 'Needed', 'Owner', 'Action', 'Proof Command', 'Decision Status', 'Proof Type', 'Proof Boundary', 'Stop Gate'], resolutionRows),
    '',
    '## Branch Clearance Matrix',
    '',
    clearanceMatrix.evidence ?? 'Branch clearance matrix missing.',
    '',
    renderTable(['Rank', 'Family', 'Review Ref', 'Highest Risk', 'Priority', 'Blocker Class', 'Local/Origin State', 'Freshness', 'Canonical Decision Needed', 'Required Proof Command', 'Clearance Status', 'Proof Type', 'Proof Boundary', 'Stop Gate'], clearanceRows),
    '',
    '## Branch Operator Handoff Packet',
    '',
    operatorHandoffPacket.evidence ?? 'Branch operator handoff packet missing.',
    '',
    `Proof type: ${operatorHandoffPacket.proof_type ?? 'unknown'}`,
    `Source: ${operatorHandoffPacket.source ?? 'unknown'}`,
    `Boundary: ${operatorHandoffPacket.proof_boundary ?? 'unknown'}`,
    `Stop gate: ${operatorHandoffPacket.stop_gate ?? 'unknown'}`,
    '',
    renderTable(['Rank', 'Family', 'Review Ref', 'Owner', 'Status', 'Execution Gate', 'Blocker Class', 'Highest Risk', 'Local/Origin State', 'Freshness', 'Action', 'Proof Command', 'Proof Type', 'Read Only', 'Blocks Branch Gate', 'Can Execute From Packet', 'Proof Boundary', 'Stop Gate'], operatorHandoffRows),
    '',
    '## Branch Merge Recommendation Packet',
    '',
    mergeRecommendationPacket.evidence ?? 'Branch merge recommendation packet missing.',
    '',
    `Proof type: ${mergeRecommendationPacket.proof_type ?? 'unknown'}`,
    `Source: ${mergeRecommendationPacket.source ?? 'unknown'}`,
    `Boundary: ${mergeRecommendationPacket.proof_boundary ?? 'unknown'}`,
    `Stop gate: ${mergeRecommendationPacket.stop_gate ?? 'unknown'}`,
    '',
    renderTable(['Rank', 'Family', 'Review Ref', 'Local/Origin State', 'Highest Risk', 'Freshness', 'Blocker Class', 'Recommendation', 'Basis', 'Categories', 'Canonical State', 'Changed Supabase Functions', 'Next Decision', 'Owner', 'Proof Command', 'Can Merge Now', 'Can Execute From Packet', 'Status', 'Proof Type', 'Proof Boundary', 'Stop Gate'], mergeRecommendationRows),
    '',
    '## Review-First Branch Packets',
    '',
    packetSet.evidence ?? 'Review-first branch packets missing.',
    '',
    renderTable(['Rank', 'Branch', 'Family', 'Status', 'Priority', 'Risk', 'Local/Origin State', 'Family Freshness', 'Focused Freshness', 'Categories', 'Changed Supabase Functions', 'Command', 'Proof Type', 'Proof Boundary', 'Stop Gate'], packetRows),
    '',
    '## Top Branch Review Packet',
    '',
    topPacket.evidence ?? 'Top branch review packet missing.',
    '',
    renderTable(['Branch', 'Status', 'Priority', 'Risk', 'Local/Origin State', 'Family Freshness', 'Focused Freshness', 'Categories', 'Changed Supabase Function Count', 'Command', 'Proof Type', 'Proof Boundary', 'Stop Gate'], [[
      topPacket.branch,
      topPacket.status,
      topPacket.priority,
      topPacket.risk,
      topPacket.local_origin_state,
      topPacket.family_freshness,
      topPacket.focused_branch_freshness,
      (topPacket.categories ?? []).join(', '),
      topPacket.changed_supabase_function_count,
      topPacket.command,
      topPacket.proof_type,
      topPacket.proof_boundary,
      topPacket.stop_gate,
    ]]),
    '',
    '## Top Branch Changed Supabase Function Rows',
    '',
    renderTable(['Function', 'Changed Paths', 'Review Focus', 'Suggested Checks', 'Proof Type', 'Proof Boundary', 'Stop Gate'], functionRows),
    '',
    '## Canonical Head Comparison',
    '',
    renderTable(['Status', 'Local Ref', 'Origin Ref', 'State', 'Command', 'Local Only Count', 'Origin Only Count', 'Local Only Subjects', 'Origin Only Subjects', 'Evidence'], comparisonRows),
    '',
    '## Launch Action Branch Row',
    '',
    renderTable(['Rank', 'Phase', 'Blocker', 'Owner', 'Action', 'Proof Command', 'Status', 'Proof Type', 'Proof Boundary', 'Stop Gate'], launchRows),
    '',
    '## Production Approval Branch Prerequisite',
    '',
    renderTable(['Prerequisite', 'Current', 'Needed', 'Status', 'Owner', 'Proof Command', 'Proof Type', 'Proof Boundary', 'Stop Gate'], productionRows),
    '',
    '## Production Approval Request Branch Row',
    '',
    renderTable(['Prerequisite', 'Request Phase', 'Source Status', 'Status', 'Blocks Request', 'Evidence To Attach', 'Request Impact'], requestRows),
    '',
    '## Public Release Status Handles',
    '',
    renderTable(['Handle', 'Status', 'Command', 'Source Manifest Path', 'Source Proof Types', 'Evidence Boundary', 'Next Action'], publicRows),
    '',
    '## Package Script Handles',
    '',
    renderTable(['Handle', 'Command'], scriptRows),
  ].join('\n')}\n`;
}

const manifestResult = runManifest();
if (!manifestResult.ok) {
  console.error('Branch review readiness report failed:\n');
  console.error(`- ${manifestResult.error}`);
  if (manifestResult.stderr.trim()) console.error(manifestResult.stderr.trim());
  if (manifestResult.stdout.trim()) console.error(manifestResult.stdout.trim());
  process.exit(1);
}

const payload = focusedPayload(manifestResult.manifest);
const output = jsonOutput ? `${JSON.stringify(payload, null, 2)}\n` : renderMarkdown(payload);
const outputPath = values.get('output');

if (outputPath) {
  const absoluteOutput = path.resolve(repoRoot, outputPath);
  const expectedSuffix = jsonOutput ? '.json' : '.md';
  if (existsSync(absoluteOutput) && !absoluteOutput.endsWith(expectedSuffix)) {
    console.error('Branch review readiness report failed:\n');
    console.error(`- Refusing to overwrite non-${expectedSuffix.slice(1).toUpperCase()} output path: ${outputPath}`);
    process.exit(1);
  }
  writeFileSync(absoluteOutput, output, 'utf8');
}

process.stdout.write(output);

const branch = payload.branch_review ?? {};
const branchReady = branch.status === 'pass'
  && branch.review_queue?.status === 'pass'
  && branch.canonical_head_decisions?.status === 'pass'
  && branch.canonical_head_resolution_queue?.status === 'pass'
  && branch.clearance_matrix?.status === 'pass'
  && branch.operator_handoff_packet?.status === 'ready';

if (failOnBlocker && !branchReady) {
  console.error(`Branch review remains ${branch.status ?? 'unknown'}; this report does not checkout, merge, push, discard, select canonical heads, run migrations, deploy, or grant production approval.`);
  process.exit(1);
}
