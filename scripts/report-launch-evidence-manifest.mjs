#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const values = new Map();
const failures = [];
let skipProbes = false;

const SOURCE_PROVENANCE_FOCUSED_PROOF_COMMAND = 'corepack pnpm run report:source-provenance-readiness && corepack pnpm run check:source-provenance-report';
const RELEASE_PREFLIGHT_FOCUSED_PROOF_COMMAND = 'corepack pnpm run report:release-preflight && corepack pnpm run check:release-preflight-report';
const RELEASE_READINESS_FOCUSED_PROOF_COMMAND = `${RELEASE_PREFLIGHT_FOCUSED_PROOF_COMMAND} && corepack pnpm run check:release-readiness`;
const LAUNCH_EVIDENCE_VALIDATION_FOCUSED_PROOF_COMMAND = 'corepack pnpm run report:launch-evidence-validation-readiness && corepack pnpm run check:launch-evidence-validation-report';
const LAUNCH_ACTION_FOCUSED_PROOF_COMMAND = 'corepack pnpm run report:launch-action-readiness && corepack pnpm run check:launch-action-report';
const BRANCH_REVIEW_FOCUSED_PROOF_COMMAND = 'corepack pnpm run report:branch-review-readiness && corepack pnpm run check:branch-review-report';
const SUPABASE_ADVISOR_FOCUSED_PROOF_COMMAND = 'corepack pnpm run report:supabase-advisor-readiness && corepack pnpm run check:supabase-advisor-report';
const BUYER_EVIDENCE_GATE_FOCUSED_PROOF_COMMAND = 'corepack pnpm run report:buyer-evidence-gate-readiness && corepack pnpm run check:buyer-evidence-gate-report';
const PRODUCTION_APPROVAL_FOCUSED_PROOF_COMMAND = 'corepack pnpm run report:production-approval-readiness && corepack pnpm run check:production-approval-report';
const POST_DEPLOY_LIVE_PROOF_FOCUSED_PROOF_COMMAND = 'corepack pnpm run report:post-deploy-live-proof-readiness && corepack pnpm run check:post-deploy-live-proof-report';
const PRODUCTION_AND_POST_DEPLOY_FOCUSED_PROOF_COMMAND = `${PRODUCTION_APPROVAL_FOCUSED_PROOF_COMMAND} && ${POST_DEPLOY_LIVE_PROOF_FOCUSED_PROOF_COMMAND}`;

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
  corepack pnpm run report:launch-evidence-manifest

Options:
  --output <path>    Write the JSON manifest to a file instead of stdout only.
  --skip-probes      Do not run local readiness probes; used by fast unit tests.
`);
}

if (failures.length > 0) {
  console.error('Launch evidence manifest failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    status: typeof result.status === 'number' ? result.status : 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error.message ?? result.error) : '',
  };
}

function gitText(commandArgs, fallback = '') {
  const result = run('git', commandArgs);
  return result.status === 0 ? result.stdout.trim() : fallback;
}

function gitPathCheck(commandArgs) {
  const result = run('git', commandArgs);
  return result.status === 0;
}

function packageMetadata() {
  try {
    const data = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    return {
      name: data.name ?? path.basename(repoRoot),
      description: data.description ?? '',
      homepage: data.homepage ?? '',
      packageManager: data.packageManager ?? '',
      scripts: data.scripts ?? {},
    };
  } catch {
    return { name: path.basename(repoRoot), description: '', homepage: '', packageManager: '', scripts: {} };
  }
}

function readTextIfExists(filePath, fallback = '') {
  try {
    return existsSync(filePath) ? readFileSync(filePath, 'utf8') : fallback;
  } catch {
    return fallback;
  }
}

function parseNumberLine(text, label) {
  const pattern = new RegExp(`^${label}:\\s*(\\d+)`, 'm');
  const match = text.match(pattern);
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractConstBlock(source, marker, nextMarker) {
  const start = source.indexOf(marker);
  if (start < 0) return '';
  const next = source.indexOf(nextMarker, start + marker.length);
  return source.slice(start, next < 0 ? source.length : next);
}

function extractStringValue(source, key) {
  const pattern = new RegExp(`${key}:\\s*'([^']+)'`);
  const match = source.match(pattern);
  return match ? match[1] : '';
}

function extractCheckStatus(source, checkId) {
  const pattern = new RegExp(`id:\\s*'${checkId}'[\\s\\S]*?status:\\s*'([^']+)'`);
  const match = source.match(pattern);
  return match ? match[1] : '';
}

function supabaseAdvisorEvidence(advisor) {
  return [
    'Supabase advisor review:',
    `project_ref=${advisor.projectRef}`,
    `status=${advisor.status}`,
    `cli_app_lint=${advisor.cliAppLintStatus}`,
    `security_performance_advisors=${advisor.securityPerformanceAdvisorsStatus}`,
    `connector_permission=${advisor.connectorPermission}`,
    `proof_bucket=${advisor.proofBucket}`,
    'advisor_clearance_claimed=no',
  ].join(' ');
}

function supabaseAdvisorClearanceDeficitEvidence(deficits) {
  const topOpen = deficits.items
    .filter((item) => item.status !== 'pass')
    .slice(0, 4)
    .map((item) => `${item.requirement}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Supabase advisor clearance deficit ledger:',
    `open=${deficits.open_count}/${deficits.total_count}`,
    `top_open=${topOpen}`,
    'approval_gate=no Supabase advisor clearance claim until connector or dashboard advisors are rerun and public-safe findings are recorded',
  ].join(' ');
}

function supabaseAdvisorRemediationOwner(requirement) {
  switch (requirement) {
    case 'CLI app lint freshness':
      return 'operator';
    case 'Connector project authorization':
    case 'Security advisor evidence':
    case 'Performance advisor evidence':
      return 'account_admin';
    case 'Public-safe findings record':
      return 'security_owner';
    case 'Advisor clearance claim':
      return 'owner';
    default:
      return 'operator';
  }
}

function supabaseAdvisorRemediationAction(item, advisor) {
  switch (item.requirement) {
    case 'CLI app lint freshness':
      return 'Run the repo-side Supabase app lint from a Supabase-authenticated workstation and keep any credential or connectivity failure open.';
    case 'Connector project authorization':
      return `Repair Supabase connector or dashboard authorization for project ${advisor.projectRef} before attempting advisor clearance.`;
    case 'Security advisor evidence':
      return 'Use an authorized Supabase dashboard or connector session to review or rerun the Database Security Advisor and retain public-safe outcomes.';
    case 'Performance advisor evidence':
      return 'Use an authorized Supabase dashboard or connector session to review or rerun the Database Performance Advisor and retain public-safe outcomes.';
    case 'Public-safe findings record':
      return 'Record a redacted advisor summary with run date, project ref, unresolved findings, remediation blockers, and no credentials.';
    case 'Advisor clearance claim':
      return 'Keep Supabase advisor clearance blocked until CLI lint, authorization, Security Advisor, Performance Advisor, and public-safe findings rows all pass.';
    default:
      return item.next_action;
  }
}

function supabaseAdvisorRemediationProofCommand(requirement, advisor) {
  switch (requirement) {
    case 'CLI app lint freshness':
      return 'corepack pnpm run check:supabase-app-lint';
    case 'Connector project authorization':
      return `Supabase dashboard or connector authorization check for project ${advisor.projectRef}`;
    case 'Security advisor evidence':
      return `Supabase Dashboard > Database > Security Advisor for project ${advisor.projectRef}`;
    case 'Performance advisor evidence':
      return `Supabase Dashboard > Database > Performance Advisor for project ${advisor.projectRef}`;
    case 'Public-safe findings record':
      return 'Record redacted Supabase advisor summary with run date, project ref, unresolved findings, and no secrets';
    case 'Advisor clearance claim':
      return 'corepack pnpm run report:launch-evidence-manifest';
    default:
      return advisor.command;
  }
}

function supabaseAdvisorRemediationProofType(requirement) {
  switch (requirement) {
    case 'CLI app lint freshness':
    case 'Advisor clearance claim':
      return 'repo_command';
    case 'Connector project authorization':
    case 'Security advisor evidence':
    case 'Performance advisor evidence':
      return 'external_account_evidence';
    case 'Public-safe findings record':
      return 'retained_redacted_record';
    default:
      return 'manual_evidence';
  }
}

function supabaseAdvisorRemediationRequiresExternalAccount(requirement) {
  return [
    'Connector project authorization',
    'Security advisor evidence',
    'Performance advisor evidence',
  ].includes(requirement);
}

function supabaseAdvisorRemediationProofBoundary(requirement) {
  switch (requirement) {
    case 'CLI app lint freshness':
      return 'Repo-side Supabase app lint is a local freshness probe only; it does not authorize connectors, run dashboard advisors, or clear advisor evidence.';
    case 'Connector project authorization':
      return 'Requires authorized Supabase connector or dashboard access; repo-local commands and permission-denied output cannot satisfy this row.';
    case 'Security advisor evidence':
      return 'Requires current authorized Database Security Advisor evidence for the project; CLI lint, public status cards, and generated manifests cannot satisfy this row.';
    case 'Performance advisor evidence':
      return 'Requires current authorized Database Performance Advisor evidence for the project; CLI lint, public status cards, and generated manifests cannot satisfy this row.';
    case 'Public-safe findings record':
      return 'Requires a retained redacted advisor summary with no secrets; raw private findings, credentials, or unrecorded dashboard views cannot satisfy this row.';
    case 'Advisor clearance claim':
      return 'Repo manifest regeneration may record clearance only after every CLI, authorization, advisor, and public-safe evidence row passes.';
    default:
      return 'Manual evidence is required; this queue row does not claim Supabase advisor clearance.';
  }
}

function supabaseAdvisorRemediationStopGate(requirement) {
  switch (requirement) {
    case 'CLI app lint freshness':
      return 'Do not claim Supabase advisor clearance from CLI app lint alone or from a stale local lint result.';
    case 'Connector project authorization':
      return 'Do not bypass project authorization, expose credentials, or treat permission-denied connector output as clearance.';
    case 'Security advisor evidence':
      return 'Do not claim Security Advisor clearance until current authorized advisor evidence is reviewed and recorded.';
    case 'Performance advisor evidence':
      return 'Do not claim Performance Advisor clearance until current authorized advisor evidence is reviewed and recorded.';
    case 'Public-safe findings record':
      return 'Do not print or persist secrets, direct account details, tokens, connection strings, or private findings in public artifacts.';
    case 'Advisor clearance claim':
      return 'Do not claim Supabase advisor clearance until every remediation row is pass and the launch manifest is regenerated.';
    default:
      return 'Do not use this queue as Supabase advisor clearance evidence.';
  }
}

function supabaseAdvisorRemediationStatus(status) {
  if (status === 'pass') return 'ready';
  if (status === 'watch') return 'watch';
  if (status === 'needs_remediation') return 'needs_remediation';
  return 'blocked';
}

function supabaseAdvisorRemediationEvidence(queue) {
  if (queue.status === 'pass') {
    return 'Supabase advisor remediation queue: status=pass open=0 approval_gate=owner approval and release gates still apply before production deploy';
  }

  const topBlocked = queue.items
    .slice(0, 5)
    .map((item) => `${item.rank}:${item.requirement}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Supabase advisor remediation queue:',
    `status=${queue.status}`,
    `open=${queue.open_count}/${queue.total_count}`,
    `items=${queue.item_count}`,
    `top_blocked=${topBlocked}`,
    'approval_gate=queue does not authorize connectors, access dashboard, rerun advisors, mutate database, record secrets, or claim clearance',
  ].join(' ');
}

function buildSupabaseAdvisorRemediationQueue(deficits, advisor) {
  const items = deficits.items
    .filter((item) => item.status !== 'pass')
    .map((item, index) => ({
      rank: index + 1,
      requirement: item.requirement,
      current: item.current,
      needed: item.needed,
      deficit_status: item.status,
      owner: supabaseAdvisorRemediationOwner(item.requirement),
      action: supabaseAdvisorRemediationAction(item, advisor),
      proof_command: supabaseAdvisorRemediationProofCommand(item.requirement, advisor),
      proof_type: supabaseAdvisorRemediationProofType(item.requirement),
      external_account_required: supabaseAdvisorRemediationRequiresExternalAccount(item.requirement),
      proof_boundary: supabaseAdvisorRemediationProofBoundary(item.requirement),
      stop_gate: supabaseAdvisorRemediationStopGate(item.requirement),
      status: supabaseAdvisorRemediationStatus(item.status),
    }));
  const queue = {
    status: items.length === 0 ? 'pass' : 'needs_remediation',
    open_count: deficits.open_count,
    total_count: deficits.total_count,
    item_count: items.length,
    blocked_count: items.filter((item) => item.status !== 'ready').length,
    items,
  };
  return { ...queue, evidence: supabaseAdvisorRemediationEvidence(queue) };
}

function supabaseAdvisorClearanceDeficits(advisor) {
  const connectorAuthorized = advisor.connectorPermission !== 'permission_denied';
  const advisorVerified = advisor.securityPerformanceAdvisorsStatus === 'verified';
  const cliVerified = advisor.cliAppLintStatus === 'verified';
  const publicSafeFindingsRecorded = advisor.status === 'verified' && advisorVerified;

  const items = [
    {
      requirement: 'CLI app lint freshness',
      current: advisor.cliAppLintStatus,
      needed: 'fresh check:supabase-app-lint or report:supabase-app-lint pass for the current source before stronger database-security claims',
      status: cliVerified ? 'pass' : 'watch',
      next_action: 'Run check:supabase-app-lint from a Supabase-authenticated workstation and keep failures credential/connectivity-gated rather than cleared.',
      proof_type: supabaseAdvisorRemediationProofType('CLI app lint freshness'),
      external_account_required: supabaseAdvisorRemediationRequiresExternalAccount('CLI app lint freshness'),
      proof_boundary: supabaseAdvisorRemediationProofBoundary('CLI app lint freshness'),
      stop_gate: supabaseAdvisorRemediationStopGate('CLI app lint freshness'),
    },
    {
      requirement: 'Connector project authorization',
      current: advisor.connectorPermission,
      needed: `authorized connector or dashboard access to project ${advisor.projectRef}`,
      status: connectorAuthorized ? 'pass' : 'needs_remediation',
      next_action: 'Fix Supabase connector or project authorization before rerunning security/performance advisors.',
      proof_type: supabaseAdvisorRemediationProofType('Connector project authorization'),
      external_account_required: supabaseAdvisorRemediationRequiresExternalAccount('Connector project authorization'),
      proof_boundary: supabaseAdvisorRemediationProofBoundary('Connector project authorization'),
      stop_gate: supabaseAdvisorRemediationStopGate('Connector project authorization'),
    },
    {
      requirement: 'Security advisor evidence',
      current: advisor.securityPerformanceAdvisorsStatus,
      needed: 'Supabase Database Security Advisor results reviewed for the current project and source posture',
      status: advisorVerified ? 'pass' : 'needs_remediation',
      next_action: 'Rerun Supabase security advisors after authorization is fixed and record public-safe findings or remediation blockers.',
      proof_type: supabaseAdvisorRemediationProofType('Security advisor evidence'),
      external_account_required: supabaseAdvisorRemediationRequiresExternalAccount('Security advisor evidence'),
      proof_boundary: supabaseAdvisorRemediationProofBoundary('Security advisor evidence'),
      stop_gate: supabaseAdvisorRemediationStopGate('Security advisor evidence'),
    },
    {
      requirement: 'Performance advisor evidence',
      current: advisor.securityPerformanceAdvisorsStatus,
      needed: 'Supabase Database Performance Advisor results reviewed for the current project and source posture',
      status: advisorVerified ? 'pass' : 'needs_remediation',
      next_action: 'Rerun Supabase performance advisors after authorization is fixed and record public-safe findings or remediation blockers.',
      proof_type: supabaseAdvisorRemediationProofType('Performance advisor evidence'),
      external_account_required: supabaseAdvisorRemediationRequiresExternalAccount('Performance advisor evidence'),
      proof_boundary: supabaseAdvisorRemediationProofBoundary('Performance advisor evidence'),
      stop_gate: supabaseAdvisorRemediationStopGate('Performance advisor evidence'),
    },
    {
      requirement: 'Public-safe findings record',
      current: publicSafeFindingsRecorded ? 'recorded' : 'not recorded',
      needed: 'redacted advisor summary with run date, project ref, unresolved findings, and no secrets',
      status: publicSafeFindingsRecorded ? 'pass' : 'needs_remediation',
      next_action: 'After advisors run, retain a public-safe summary that excludes credentials and direct account details.',
      proof_type: supabaseAdvisorRemediationProofType('Public-safe findings record'),
      external_account_required: supabaseAdvisorRemediationRequiresExternalAccount('Public-safe findings record'),
      proof_boundary: supabaseAdvisorRemediationProofBoundary('Public-safe findings record'),
      stop_gate: supabaseAdvisorRemediationStopGate('Public-safe findings record'),
    },
    {
      requirement: 'Advisor clearance claim',
      current: 'no clearance claimed',
      needed: 'clearance claim only after CLI lint, security advisor, performance advisor, and public-safe evidence rows pass',
      status: cliVerified && connectorAuthorized && advisorVerified && publicSafeFindingsRecorded ? 'pass' : 'blocked',
      next_action: 'Keep launch security wording at repo/local proof until all Supabase advisor clearance rows pass.',
      proof_type: supabaseAdvisorRemediationProofType('Advisor clearance claim'),
      external_account_required: supabaseAdvisorRemediationRequiresExternalAccount('Advisor clearance claim'),
      proof_boundary: supabaseAdvisorRemediationProofBoundary('Advisor clearance claim'),
      stop_gate: supabaseAdvisorRemediationStopGate('Advisor clearance claim'),
    },
  ];

  const deficits = {
    status: items.every((item) => item.status === 'pass') ? 'pass' : 'needs_remediation',
    open_count: items.filter((item) => item.status !== 'pass').length,
    total_count: items.length,
    items,
  };

  return {
    ...deficits,
    remediation_queue: buildSupabaseAdvisorRemediationQueue(deficits, advisor),
    evidence: supabaseAdvisorClearanceDeficitEvidence(deficits),
  };
}

function compactCommandOutput(result) {
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}\n${result.error ?? ''}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(' | ') || 'no output captured';
}

function resolveRepoFilePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath);
}

function probeGitLfsHookPath() {
  const hookPathResult = run('git', ['config', '--get', 'core.hookspath']);
  const hookPath = hookPathResult.status === 0
    ? String(hookPathResult.stdout ?? '').trim() || '.git/hooks'
    : '.git/hooks';
  const postCommitPathResult = run('git', ['rev-parse', '--git-path', 'hooks/post-commit']);
  const prePushPathResult = run('git', ['rev-parse', '--git-path', 'hooks/pre-push']);
  const postCommitHookPath = postCommitPathResult.status === 0
    ? String(postCommitPathResult.stdout ?? '').trim()
    : '';
  const prePushHookPath = prePushPathResult.status === 0
    ? String(prePushPathResult.stdout ?? '').trim()
    : '';
  const postCommitHook = postCommitHookPath ? readTextIfExists(resolveRepoFilePath(postCommitHookPath)) : '';
  const prePushHook = prePushHookPath ? readTextIfExists(resolveRepoFilePath(prePushHookPath)) : '';
  const hookRequiresPathBinary = /command\s+-v\s+git-lfs|git\s+lfs/.test(`${postCommitHook}\n${prePushHook}`);
  const gitLfsPathResult = run('sh', ['-lc', 'command -v git-lfs']);
  const gitLfsBinaryPath = gitLfsPathResult.status === 0
    ? String(gitLfsPathResult.stdout ?? '').trim().split(/\r?\n/).at(-1)?.trim() ?? ''
    : '';
  const gitLfsBinaryResult = run('git-lfs', ['version']);
  const gitLfsBinaryOutput = gitLfsBinaryResult.status === 0
    ? compactCommandOutput(gitLfsBinaryResult)
    : compactCommandOutput(gitLfsPathResult);

  const hookSummary = [
    `core.hookspath=${hookPath}`,
    postCommitHookPath ? `post-commit=${postCommitHookPath}` : 'post-commit=missing',
    prePushHookPath ? `pre-push=${prePushHookPath}` : 'pre-push=missing',
    `hook_requires_git_lfs_on_path=${hookRequiresPathBinary ? 'yes' : 'unknown'}`,
    gitLfsBinaryPath
      ? `current_path_git_lfs=${gitLfsBinaryPath}`
      : 'current_path_git_lfs=missing',
  ].join('; ');

  return {
    hookPath,
    postCommitHookPath,
    prePushHookPath,
    hookRequiresPathBinary,
    gitLfsBinaryPath,
    gitLfsBinaryAvailable: gitLfsBinaryResult.status === 0,
    diagnosticCurrent: `${hookSummary}; ${gitLfsBinaryOutput}`,
  };
}

function expectedPnpmVersion(packageManager) {
  const match = String(packageManager ?? '').match(/^pnpm@(\d+\.\d+\.\d+)$/);
  return match?.[1] ?? null;
}

function releasePreflightDeficitEvidence(deficits) {
  const topOpen = deficits.items
    .filter((item) => item.status !== 'pass')
    .slice(0, 5)
    .map((item) => `${item.requirement}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Release toolchain and approval deficit ledger:',
    `open=${deficits.open_count}/${deficits.total_count}`,
    `top_open=${topOpen}`,
    'approval_gate=no deploy request or push-path proof until pinned Corepack release-readiness, Git LFS, clean source provenance, and owner approval are current',
  ].join(' ');
}

function releaseRemediationOwner(requirement) {
  if (requirement === 'Explicit owner production approval') return 'owner';
  if (requirement === 'Git LFS push-path proof') return 'operator';
  if (requirement === 'Clean source provenance') return 'operator';
  if (requirement === 'Corepack pnpm resolver') return 'operator';
  if (requirement === 'Release-readiness execution') return 'operator';
  return 'operator';
}

function releaseRemediationAction(item) {
  switch (item.requirement) {
    case 'Corepack pnpm resolver':
      return 'Expose Corepack in the release shell and verify the pinned pnpm version before treating release-readiness as current.';
    case 'Release-readiness execution':
      return 'Run the full guarded release-readiness chain only after source provenance is clean and Corepack resolves the pinned pnpm.';
    case 'Git LFS push-path proof':
      return 'Install or expose Git LFS on PATH for the same shell used for commit/push evidence, then rerun the version probe.';
    case 'Clean source provenance':
      return 'Resolve dirty source paths intentionally with owner approval, then regenerate the production approval packet.';
    case 'Explicit owner production approval':
      return 'Request explicit production approval only after source provenance, release-readiness, branch review, and advisor gates are clean.';
    default:
      return item.next_action;
  }
}

function releaseRemediationProofCommand(requirement) {
  switch (requirement) {
    case 'Corepack pnpm resolver':
      return 'corepack pnpm --version';
    case 'Release-readiness execution':
      return 'corepack pnpm run check:release-readiness';
    case 'Git LFS push-path proof':
      return 'git lfs version';
    case 'Clean source provenance':
      return SOURCE_PROVENANCE_FOCUSED_PROOF_COMMAND;
    case 'Explicit owner production approval':
      return 'corepack pnpm run check:production-deploy-request';
    default:
      return 'corepack pnpm run report:launch-evidence-manifest';
  }
}

function releaseRemediationProofType(requirement) {
  switch (requirement) {
    case 'Pinned package manager':
      return 'package_manager_pin';
    case 'Corepack pnpm resolver':
    case 'Git LFS push-path proof':
      return 'toolchain_probe';
    case 'Release-readiness execution':
      return 'gated_release_command';
    case 'Clean source provenance':
      return 'source_provenance_decision';
    case 'Explicit owner production approval':
      return 'manual_approval';
    default:
      return 'repo_command';
  }
}

function releaseRemediationProofBoundary(requirement) {
  switch (requirement) {
    case 'Pinned package manager':
      return 'Verifies package.json declares the expected packageManager pin; it does not prove Corepack resolution, release-readiness execution, Git LFS push-path availability, clean source provenance, deploy readiness, or production approval.';
    case 'Corepack pnpm resolver':
      return 'Verifies Corepack can resolve the packageManager-pinned pnpm version in the intended release shell; it does not install tools, run release-readiness, clear provenance, push, deploy, or grant approval.';
    case 'Release-readiness execution':
      return 'Runs the guarded Corepack-pinned release-readiness chain only after source provenance is clean and toolchain probes are current; it does not grant owner approval, push, deploy, or prove hosted/live parity.';
    case 'Git LFS push-path proof':
      return 'Verifies git-lfs is available on PATH for commit and push evidence; it does not install Git LFS, push, clear provenance, deploy, or grant approval.';
    case 'Clean source provenance':
      return 'Requires an owner decision for dirty source paths; this report row does not commit, unstage, stash, revert, delete, rename, move, or clear provenance.';
    case 'Explicit owner production approval':
      return 'Requires explicit owner approval after all prerequisite gates are ready; this row does not approve, push, deploy, or claim live parity.';
    default:
      return 'Repo-side proof row only; it does not grant production approval or launch readiness.';
  }
}

function releaseRemediationStopGate(requirement) {
  switch (requirement) {
    case 'Pinned package manager':
      return 'Do not treat a packageManager pin alone as Corepack resolution, release-readiness, push-path proof, deploy readiness, or production approval.';
    case 'Corepack pnpm resolver':
      return 'Do not treat bare pnpm, local shims, or skipped probes as Corepack-pinned release evidence.';
    case 'Release-readiness execution':
      return 'Do not run or claim release-readiness while source provenance is dirty or Corepack cannot resolve the pinned pnpm.';
    case 'Git LFS push-path proof':
      return 'Do not treat commit hook warnings, previous pushes, or a missing git-lfs binary as current push-path proof.';
    case 'Clean source provenance':
      return 'Do not commit, unstage, stash, revert, delete, rename, or move source paths without explicit owner intent.';
    case 'Explicit owner production approval':
      return 'Do not run deploy-production.sh, netlify deploy, push, or claim production approval from this report.';
    default:
      return 'Do not use this queue as production approval evidence.';
  }
}

function launchGapProofType(gap) {
  if (gap.includes('Phase F evidence')) return 'buyer_evidence_hard_gate';
  if (gap.includes('source deploy approval')) return 'source_provenance_approval_gate';
  if (gap.includes('unmerged branches')) return 'branch_review_clearance_gap';
  if (gap.includes('Supabase security/performance advisor clearance')) return 'external_advisor_clearance_gap';
  if (gap.includes('Release toolchain')) return 'release_toolchain_approval_gap';
  return 'launch_gap';
}

function launchGapProofBoundary(gap) {
  if (gap.includes('Phase F evidence')) {
    return 'Aggregates buyer-evidence readiness and hard-gate deficit evidence; it does not prove buyer acceptance, 95% confidence, retained artifacts, outreach permission, or commercial-ready status.';
  }
  if (gap.includes('source deploy approval')) {
    return 'Summarizes current source provenance and owner-approval state; it does not commit, unstage, stash, revert, delete, clear source provenance, run release-readiness, deploy, or grant approval.';
  }
  if (gap.includes('unmerged branches')) {
    return 'Summarizes read-only unmerged-branch, freshness, and canonical-head evidence; it does not checkout, merge, push, discard branches, run migrations, deploy, or approve canonical heads.';
  }
  if (gap.includes('Supabase security/performance advisor clearance')) {
    return 'Summarizes repo-visible Supabase advisor and access deficits; it does not access dashboards, reauthorize connectors, clear advisor findings, run migrations, alter secrets, or prove RLS/performance clearance.';
  }
  if (gap.includes('Release toolchain')) {
    return 'Summarizes release toolchain, preflight, and approval blockers; it does not resolve Corepack or Git LFS, run full release-readiness, clear source provenance, push, deploy, prove live parity, or grant owner approval.';
  }
  return 'Summarizes a launch gap only; it does not prove launch readiness or grant production approval.';
}

function launchGapStopGate(gap) {
  if (gap.includes('Phase F evidence')) {
    return 'Do not claim buyer-proven 95% confidence, accepted proof packs, commercial-ready status, or outreach permission from this gap summary.';
  }
  if (gap.includes('source deploy approval')) {
    return 'Do not commit, unstage, stash, revert, delete, move, deploy, or request production approval until dirty source provenance is intentionally resolved by the owner.';
  }
  if (gap.includes('unmerged branches')) {
    return 'Do not checkout, merge, push, discard branches, migrate, deploy, or select canonical heads without read-only review and explicit owner approval.';
  }
  if (gap.includes('Supabase security/performance advisor clearance')) {
    return 'Do not claim Supabase advisor clearance, RLS/performance clearance, or production database readiness until connector or dashboard advisor evidence is rerun and recorded.';
  }
  if (gap.includes('Release toolchain')) {
    return 'Do not treat local pnpm checks, package metadata, stale Git LFS evidence, or this gap row as release-readiness, push-path proof, deploy readiness, or owner approval.';
  }
  return 'Do not use this gap summary as production approval or commercial-ready evidence.';
}

function launchGap(row) {
  return {
    ...row,
    proof_type: launchGapProofType(row.gap),
    proof_boundary: launchGapProofBoundary(row.gap),
    stop_gate: launchGapStopGate(row.gap),
  };
}

function adversarialReviewProofType(lane) {
  switch (lane) {
    case 'buyer evidence':
      return 'buyer_evidence_adversarial_review';
    case 'production approval':
      return 'production_approval_adversarial_review';
    case 'release toolchain':
      return 'release_toolchain_adversarial_review';
    case 'Supabase advisor clearance':
      return 'external_advisor_adversarial_review';
    case 'branch risk':
      return 'branch_risk_adversarial_review';
    default:
      return 'launch_claim_adversarial_review';
  }
}

function adversarialReviewProofBoundary(lane) {
  switch (lane) {
    case 'buyer evidence':
      return 'Challenges buyer-proof claims against current buyer evidence gates; it does not create buyer acceptance, retained artifacts, outreach permission, 95% confidence, or commercial-ready status.';
    case 'production approval':
      return 'Challenges deploy-authorization claims against source provenance and owner approval gates; it does not grant production approval, run deploys, push, or prove live parity.';
    case 'release toolchain':
      return 'Challenges release-readiness claims against Corepack, Git LFS, source provenance, and approval gates; it does not install tools, run release-readiness, clear provenance, push, deploy, or approve release.';
    case 'Supabase advisor clearance':
      return 'Challenges database-clearance claims against authorized Supabase advisor evidence; it does not access dashboards, reauthorize connectors, run migrations, alter secrets, clear findings, or prove RLS/performance clearance.';
    case 'branch risk':
      return 'Challenges merge/deploy readiness claims against read-only branch review evidence; it does not checkout, merge, push, discard branches, select canonical heads, run migrations, deploy, or grant approval.';
    default:
      return 'Challenges a launch claim only; it does not prove launch readiness or grant production approval.';
  }
}

function adversarialReviewStopGate(lane) {
  switch (lane) {
    case 'buyer evidence':
      return 'Do not override buyer evidence blockers or claim buyer-proven confidence from adversarial review text.';
    case 'production approval':
      return 'Do not run deploy-production.sh, netlify deploy, push, or claim owner approval from adversarial review text.';
    case 'release toolchain':
      return 'Do not treat adversarial review text as Corepack resolution, Git LFS push-path proof, release-readiness execution, clean provenance, or owner approval.';
    case 'Supabase advisor clearance':
      return 'Do not claim Supabase advisor, RLS, or performance clearance until authorized advisor evidence is rerun and public-safe findings are recorded.';
    case 'branch risk':
      return 'Do not checkout, merge, push, discard, migrate, deploy, or choose canonical heads from adversarial review text.';
    default:
      return 'Do not use adversarial review text as production approval or commercial-ready evidence.';
  }
}

function adversarialReview(row) {
  return {
    ...row,
    proof_type: adversarialReviewProofType(row.lane),
    proof_boundary: adversarialReviewProofBoundary(row.lane),
    stop_gate: adversarialReviewStopGate(row.lane),
  };
}

function objectiveCompletionItem(row) {
  return {
    blocks_goal_completion: row.status !== 'present',
    ...row,
  };
}

function buildObjectiveCompletionAudit({
  launchDecision,
  scores,
  gaps,
  painPoints,
  targetCustomers,
  launchActionQueue,
  buyerProbe,
  sourceProvenanceResolutionQueue,
  branchReviewStatus,
  branchReviewQueue,
  canonicalHeadDecisions,
  supabaseAdvisor,
  releasePreflight,
  productionApprovalPrerequisiteQueue,
  postDeployLiveProofGateQueue,
}) {
  const openGaps = gaps.filter((gap) => gap.status === 'open');
  const openP0 = openGaps.filter((gap) => gap.severity === 'P0').length;
  const openP1 = openGaps.filter((gap) => gap.severity === 'P1').length;
  const items = [
    objectiveCompletionItem({
      requirement: 'Launch score table',
      status: 'present',
      evidence: `Scores present for security=${scores.security}, readiness=${scores.readiness}, sellability=${scores.sellability}, evidence=${scores.evidence}, overall=${scores.overall}; launch_decision=${launchDecision}.`,
      proof_type: 'required_score_table',
      proof_boundary: 'Score rows summarize current proof posture only; they do not prove buyer acceptance, production approval, deployment, hosted/live parity, or commercial-ready status.',
      stop_gate: 'Do not raise scores or launch decision from score-table presence while P0/P1 blockers remain open.',
      next_proof_command: 'corepack pnpm run report:commercial-launch-readiness',
    }),
    objectiveCompletionItem({
      requirement: 'Gap analysis',
      status: 'present',
      evidence: `Gap table present with open_p0=${openP0}, open_p1=${openP1}, total_gaps=${gaps.length}.`,
      proof_type: 'required_gap_analysis_table',
      proof_boundary: 'Gap analysis is blocker classification evidence only; it does not resolve the blockers it lists.',
      stop_gate: 'Do not treat a complete gap table as gap closure, production approval, buyer proof, or release approval.',
      next_proof_command: 'corepack pnpm run check:launch-evidence-manifest',
    }),
    objectiveCompletionItem({
      requirement: 'Launch blocker action queue',
      status: 'present',
      evidence: `${launchActionQueue.evidence}; items=${launchActionQueue.item_count ?? 'unknown'}.`,
      proof_type: 'sequenced_launch_action_queue',
      proof_boundary: 'The queue is a sequenced execution plan only; it does not execute fixes, contact buyers, mutate branches, run migrations, deploy, or grant owner approval.',
      stop_gate: 'Do not mark launch actions complete until their proof commands have been run under owner-approved gates.',
      next_proof_command: 'corepack pnpm run report:commercial-launch-readiness',
    }),
    objectiveCompletionItem({
      requirement: 'Market pain research table',
      status: 'present',
      evidence: `Top pain research rows present=${painPoints.length}; all rows remain source-research hypotheses.`,
      proof_type: 'market_pain_source_table',
      proof_boundary: 'Market pain rows are source-backed hypotheses; this table does not prove account-level willingness to pay, buyer acceptance, live adoption, or outreach permission.',
      stop_gate: 'Do not use pain ranking as buyer proof or permission to contact buyers.',
      next_proof_command: 'corepack pnpm run report:commercial-launch-readiness',
    }),
    objectiveCompletionItem({
      requirement: 'Target customer table',
      status: 'present',
      evidence: `Target customer or segment rows present=${targetCustomers.length}; all rows remain ranking hypotheses.`,
      proof_type: 'target_segment_table',
      proof_boundary: 'Target rows map likely buyers and proof-to-show surfaces; this table does not prove named-account validation, procurement approval, buyer acceptance, live adoption, or outreach permission.',
      stop_gate: 'Do not contact buyers or claim customer validation from target-ranking rows alone.',
      next_proof_command: 'corepack pnpm run report:commercial-launch-readiness',
    }),
    objectiveCompletionItem({
      requirement: 'Outreach plan',
      status: 'present',
      evidence: '30/60/90 plan, email boundary, LinkedIn boundary, demo narrative, and objection handling are present.',
      proof_type: 'outreach_plan_boundary',
      proof_boundary: 'Outreach copy is a bounded script and workflow only; it does not contact buyers, create accepted evidence, move confidence, or grant permission to make sales claims.',
      stop_gate: 'Do not send outreach or claim buyer-proven confidence until buyer evidence and owner approval gates are satisfied.',
      next_proof_command: 'corepack pnpm run report:buyer-evidence-readiness',
    }),
    objectiveCompletionItem({
      requirement: 'Fix report',
      status: 'present',
      evidence: 'Fix report present with unresolved blocker mapping and a safe read-only manifest boundary.',
      proof_type: 'fix_report_blocker_map',
      proof_boundary: 'The fix report maps required checks and unresolved blockers; it does not apply fixes, clear source provenance, approve deployment, or prove buyer evidence.',
      stop_gate: 'Do not treat the fix report as remediation completion while unresolved blockers remain listed.',
      next_proof_command: 'corepack pnpm run check:commercial-launch-readiness-report',
    }),
    objectiveCompletionItem({
      requirement: 'Structured evidence manifest',
      status: 'present',
      evidence: 'JSON manifest is generated by scripts/report-launch-evidence-manifest.mjs and validated by the launch evidence schema check.',
      proof_type: 'schema_validation',
      proof_boundary: 'Schema validation proves shape and conservative boundaries only; it does not prove production approval, buyer acceptance, deployment, or hosted/live parity.',
      stop_gate: 'Do not mark the objective complete from schema validity alone.',
      next_proof_command: 'corepack pnpm run check:launch-evidence-manifest',
    }),
    objectiveCompletionItem({
      requirement: 'ECC phase ledger',
      status: 'present',
      evidence: 'ECC ledger records route, tier, mode, baseline, checks, delta, reflection, decision, and next adjustment.',
      proof_type: 'ecc_phase_ledger',
      proof_boundary: 'The ledger records process evidence only; it does not prove external buyer proof, owner approval, deploy authorization, branch approval, or Supabase advisor clearance.',
      stop_gate: 'Do not use process-ledger presence to override open evidence gates.',
      next_proof_command: 'corepack pnpm run report:commercial-launch-readiness',
    }),
    objectiveCompletionItem({
      requirement: 'Buyer evidence hard gate',
      status: buyerProbe.phaseFGate === 'pass' ? 'present' : 'blocked',
      evidence: buyerProbe.hardGateDeficits?.evidence ?? buyerProbe.reviewEvidence,
      proof_type: 'buyer_evidence_hard_gate',
      proof_boundary: 'Buyer evidence gate requires real retained redacted artifacts and accepted register rows; generated scaffolding, outreach headers, demos, and this audit do not prove buyer acceptance.',
      stop_gate: 'Do not claim buyer-proven 95% confidence, accepted proof packs, commercial-ready status, or permission to contact buyers until validate:pilot-evidence --require-95 passes against retained artifacts.',
      next_proof_command: BUYER_EVIDENCE_GATE_FOCUSED_PROOF_COMMAND,
    }),
    objectiveCompletionItem({
      requirement: 'Source provenance release gate',
      status: sourceProvenanceResolutionQueue.status === 'pass' ? 'present' : 'blocked',
      evidence: sourceProvenanceResolutionQueue.evidence,
      proof_type: 'source_provenance_approval_gate',
      proof_boundary: 'Source provenance rows classify dirty paths and owner decisions only; they do not commit, unstage, stash, revert, delete, clear provenance, deploy, or grant production approval.',
      stop_gate: 'Do not request deploy approval until source provenance is intentionally resolved and release gates pass.',
      next_proof_command: SOURCE_PROVENANCE_FOCUSED_PROOF_COMMAND,
    }),
    objectiveCompletionItem({
      requirement: 'Branch canonical review gate',
      status: branchReviewStatus === 'pass' ? 'present' : 'blocked',
      evidence: `branch_status=${branchReviewStatus}; ${branchReviewQueue.evidence}; ${canonicalHeadDecisions.evidence}`,
      proof_type: 'read_only_branch_review',
      proof_boundary: 'Branch review evidence is read-only; it does not checkout, merge, push, discard branches, select canonical heads, run migrations, deploy, or grant approval.',
      stop_gate: 'Do not merge, checkout, deploy, or select canonical heads without focused branch review and explicit owner approval.',
      next_proof_command: BRANCH_REVIEW_FOCUSED_PROOF_COMMAND,
    }),
    objectiveCompletionItem({
      requirement: 'Supabase advisor clearance gate',
      status: supabaseAdvisor.status === 'verified' ? 'present' : 'blocked',
      evidence: `${supabaseAdvisor.evidence}; ${supabaseAdvisor.clearanceDeficits.evidence}`,
      proof_type: 'external_advisor_clearance',
      proof_boundary: 'Supabase advisor clearance requires authorized connector or dashboard advisor evidence; repo CLI lint and this audit do not access dashboards, clear advisor findings, run migrations, alter secrets, or prove RLS/performance clearance.',
      stop_gate: 'Do not claim Supabase advisor, RLS, or performance clearance until authorized advisor evidence is rerun and recorded.',
      next_proof_command: SUPABASE_ADVISOR_FOCUSED_PROOF_COMMAND,
    }),
    objectiveCompletionItem({
      requirement: 'Release toolchain approval gate',
      status: releasePreflight.status === 'pass' ? 'present' : 'blocked',
      evidence: releasePreflight.evidence,
      proof_type: 'release_toolchain_approval',
      proof_boundary: 'Release preflight rows summarize Corepack, Git LFS, release-readiness, source provenance, and owner approval state; this audit does not install tools, run full release-readiness, push, deploy, or grant approval.',
      stop_gate: 'Do not treat local pnpm checks, package metadata, skipped approval packets, or hook warnings as release-readiness, push-path proof, deploy readiness, or owner approval.',
      next_proof_command: RELEASE_READINESS_FOCUSED_PROOF_COMMAND,
    }),
    objectiveCompletionItem({
      requirement: 'Production approval and live proof gate',
      status: 'manual_stop',
      evidence: `${productionApprovalPrerequisiteQueue.evidence}; ${postDeployLiveProofGateQueue.evidence}`,
      proof_type: 'production_approval_and_live_proof_gate',
      proof_boundary: 'Production approval and hosted/live proof require explicit owner approval, guarded deploy execution, live metadata, static parity, and hosted smoke; this audit does not run deploys, mutate Netlify, push, or prove live parity.',
      stop_gate: 'Do not run deploy-production.sh, netlify deploy, push, or present hosted/live parity until owner approval and post-deploy live gates pass.',
      next_proof_command: PRODUCTION_AND_POST_DEPLOY_FOCUSED_PROOF_COMMAND,
    }),
  ];
  const completedCount = items.filter((item) => item.status === 'present').length;
  const blockedCount = items.filter((item) => item.status === 'blocked').length;
  const manualStopCount = items.filter((item) => item.status === 'manual_stop').length;
  const goalCompletionBlockedCount = items.filter((item) => item.blocks_goal_completion).length;
  return {
    status: goalCompletionBlockedCount > 0 ? 'blocked' : 'present',
    proof_type: 'completion_audit_current_state',
    completed_count: completedCount,
    blocked_count: blockedCount,
    manual_stop_count: manualStopCount,
    total_count: items.length,
    goal_completion_blocked_count: goalCompletionBlockedCount,
    evidence: `Objective completion audit: deliverables_present=${completedCount}; blockers=${blockedCount}; manual_stop=${manualStopCount}; open_p0=${openP0}; open_p1=${openP1}; launch_decision=${launchDecision}.`,
    proof_boundary: 'This audit maps current manifest/report evidence only; it does not prove commercial-ready status, buyer acceptance, production approval, deployment, hosted/live parity, Supabase clearance, branch approval, or permission to contact buyers.',
    stop_gate: 'Do not mark the launch goal complete or claim readiness while P0/P1 blockers, buyer evidence, source provenance, branch review, Supabase advisor, release toolchain, production approval, or post-deploy live proof gates remain open.',
    items,
  };
}

function marketPainPoint(row) {
  return {
    ...row,
    proof_type: 'market_pain_source_research',
    proof_boundary: 'Source-backed market pain hypothesis with repo proof-fit mapping; it does not prove buyer acceptance, outreach permission, retained buyer artifacts, account-level willingness to pay, live customer adoption, or commercial-ready status.',
    stop_gate: 'Do not treat source links, willingness-to-pay signals, confidence scores, or repo proof-fit routes as buyer proof, customer commitment, live utility adoption, or permission to contact buyers.',
  };
}

function targetCustomerSegment(row) {
  return {
    ...row,
    proof_type: 'target_segment_ranking_hypothesis',
    proof_boundary: 'Target segment ranking based on buyer pain, trigger, decision-maker hypothesis, outreach angle, proof-to-show mapping, and confidence; it does not prove named-account validation, buyer acceptance, outreach permission, procurement approval, live customer adoption, or commercial-ready status.',
    stop_gate: 'Do not treat target ranking, outreach angle, proof-to-show routes, or confidence scores as permission to contact buyers, customer commitment, procurement approval, live utility adoption, or buyer-proven evidence.',
  };
}

function releaseRemediationStatus(status) {
  if (status === 'pass') return 'ready';
  if (status === 'manual_stop') return 'manual_stop';
  if (status === 'needs_remediation') return 'needs_remediation';
  return 'blocked';
}

function releasePreflightRemediationEvidence(queue) {
  if (queue.status === 'pass') {
    return 'Release preflight remediation queue: status=pass open=0 approval_gate=owner approval and live proof still apply before production deploy';
  }

  const topBlocked = queue.items
    .slice(0, 5)
    .map((item) => `${item.rank}:${item.requirement}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Release preflight remediation queue:',
    `status=${queue.status}`,
    `open=${queue.open_count}/${queue.total_count}`,
    `items=${queue.item_count}`,
    `top_blocked=${topBlocked}`,
    'approval_gate=queue does not install tools, clear source provenance, run release-readiness, push, deploy, or grant production approval',
  ].join(' ');
}

function releasePreflightClearanceEvidence(matrix) {
  if (matrix.status === 'pass') {
    return 'Release preflight clearance matrix: status=pass release_blocking=0 approval_gate=owner approval and post-deploy live proof still apply before production deploy';
  }

  const topBlocked = matrix.rows
    .filter((item) => item.blocks_release_gate)
    .slice(0, 6)
    .map((item) => `${item.rank}:${item.requirement}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Release preflight clearance matrix:',
    `status=${matrix.status}`,
    `release_blocking=${matrix.blocked_count}/${matrix.row_count}`,
    `top_blocked=${topBlocked}`,
    'approval_gate=matrix does not install tools, clear source provenance, run release-readiness, push, deploy, prove hosted/live parity, or grant owner approval',
  ].join(' ');
}

function releasePreflightClearanceStatus(status) {
  if (status === 'pass') return 'ready';
  if (status === 'manual_stop') return 'manual_stop';
  if (status === 'needs_remediation') return 'needs_remediation';
  if (status === 'skipped') return 'blocked';
  return 'blocked';
}

function releasePreflightClearanceImpact(requirement) {
  switch (requirement) {
    case 'Pinned package manager':
      return 'Release shell cannot be treated as pinned until the packageManager row is present and the resolver row also proves Corepack-pinned pnpm.';
    case 'Corepack pnpm resolver':
      return 'Release-readiness evidence is not current until Corepack resolves the packageManager-pinned pnpm in the intended release shell.';
    case 'Release-readiness execution':
      return 'Production approval cannot be requested until the guarded release-readiness command passes after clean source provenance.';
    case 'Git LFS push-path proof':
      return 'Commit and push evidence cannot be treated as current until git-lfs is available on PATH for the release shell.';
    case 'Clean source provenance':
      return 'Deploy approval is blocked while dirty, staged, untracked, renamed, or otherwise unresolved source paths remain owner-decision items.';
    case 'Explicit owner production approval':
      return 'No production deploy, push, hosted-live claim, or commercial-ready claim is allowed without explicit owner approval after prerequisite gates pass.';
    default:
      return 'Release approval cannot rely on this row until its proof command and owner gate pass.';
  }
}

function buildReleasePreflightClearanceMatrix(deficits) {
  const rows = (deficits.items ?? []).map((item, index) => ({
    rank: index + 1,
    requirement: item.requirement,
    current: item.current,
    needed: item.needed,
    status: releasePreflightClearanceStatus(item.status),
    source_status: item.status,
    owner: releaseRemediationOwner(item.requirement),
    proof_command: releaseRemediationProofCommand(item.requirement),
    proof_type: releaseRemediationProofType(item.requirement),
    proof_boundary: releaseRemediationProofBoundary(item.requirement),
    stop_gate: releaseRemediationStopGate(item.requirement),
    release_impact: releasePreflightClearanceImpact(item.requirement),
    blocks_release_gate: item.status !== 'pass',
  }));
  const matrix = {
    status: rows.every((item) => !item.blocks_release_gate) ? 'pass' : 'blocked',
    proof_type: 'release_preflight_clearance_matrix',
    source_deficit_status: deficits.status,
    row_count: rows.length,
    blocked_count: rows.filter((item) => item.blocks_release_gate).length,
    ready_count: rows.filter((item) => item.status === 'ready').length,
    rows,
    proof_boundary: 'Release preflight clearance planning maps release-gate proof requirements only; it does not install tools, run release-readiness, clear source provenance, push, deploy, prove hosted/live parity, or grant owner approval.',
    stop_gate: 'Do not mark release approval ready until Corepack-pinned release-readiness, Git LFS push-path proof, clean source provenance, and explicit owner approval all pass in current evidence.',
  };
  return { ...matrix, evidence: releasePreflightClearanceEvidence(matrix) };
}

function releaseToolchainProbeEvidence(ledger) {
  if (ledger.status === 'skipped') {
    return 'Release toolchain probe ledger skipped by --skip-probes; run corepack pnpm run report:launch-evidence-manifest without --skip-probes for current Corepack and Git LFS command evidence.';
  }

  const summary = ledger.items
    .map((item) => `${item.id}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Release toolchain probe ledger:',
    `status=${ledger.status}`,
    `open=${ledger.open_count}/${ledger.item_count}`,
    `probes=${summary}`,
    'approval_gate=probes do not install tools, run release-readiness, push, deploy, clear source provenance, or grant production approval',
  ].join(' ');
}

function buildReleaseToolchainProbeLedger({
  expectedVersion,
  corepackOutput,
  corepackMatches,
  resolvedPnpmVersion,
  barePnpmOutput,
  barePnpmVersion,
  barePnpmMatches,
  gitLfsOutput,
  gitLfsAvailable,
  gitLfsHookDiagnosticCurrent,
}) {
  const items = [
    {
      id: 'corepack_pnpm_resolver',
      label: 'Corepack pnpm resolver',
      command: 'corepack pnpm --version',
      status: skipProbes ? 'skipped' : corepackMatches ? 'pass' : 'blocked',
      current: skipProbes
        ? 'skipped'
        : corepackMatches
          ? `pnpm ${resolvedPnpmVersion}`
          : corepackOutput,
      diagnostic_command: 'pnpm --version',
      diagnostic_current: skipProbes
        ? 'skipped'
        : barePnpmVersion
          ? `bare pnpm ${barePnpmVersion}${barePnpmMatches ? ' matches packageManager pin' : ' does not match packageManager pin'}; local-shell diagnostic only and does not satisfy Corepack`
          : `${barePnpmOutput}; bare pnpm is unavailable and does not satisfy Corepack`,
      diagnostic_boundary: 'Bare pnpm diagnostics are local-shell context only; they do not satisfy the Corepack pnpm resolver gate, run release-readiness, clear source provenance, push, deploy, or grant production approval.',
      expected: expectedVersion ? `pnpm ${expectedVersion}` : 'valid packageManager pnpm pin',
      proof_type: 'corepack_pnpm_toolchain_probe',
      proof_boundary: 'Corepack pnpm resolver probe is release-shell evidence only; it does not install tools, run release-readiness, clear source provenance, push, deploy, prove hosted/live parity, or grant production approval.',
      evidence_boundary: 'This probe only verifies whether Corepack resolves the pinned pnpm version. It does not install tools, run release-readiness, clear source provenance, deploy, push, or grant production approval.',
      stop_gate: 'Do not treat bare pnpm, local shims, skipped probes, or stale terminal output as Corepack-pinned release evidence.',
      next_action: corepackMatches
        ? 'Keep Corepack available in the release shell before running release-readiness.'
        : 'Expose Corepack in the release shell and rerun corepack pnpm --version before treating release-readiness as current.',
    },
    {
      id: 'git_lfs_push_path',
      label: 'Git LFS push-path proof',
      command: 'git lfs version',
      status: skipProbes ? 'skipped' : gitLfsAvailable ? 'pass' : 'needs_remediation',
      current: skipProbes ? 'skipped' : gitLfsOutput,
      diagnostic_command: 'git config --get core.hookspath; git rev-parse --git-path hooks/post-commit; git rev-parse --git-path hooks/pre-push; git-lfs version',
      diagnostic_current: skipProbes ? 'skipped' : gitLfsHookDiagnosticCurrent,
      diagnostic_boundary: 'Git LFS hook-path diagnostics are current-shell context only; they do not rewrite hooks, install Git LFS, guarantee future commit or push hook PATH, push, deploy, clear source provenance, or grant production approval.',
      expected: 'git-lfs available on PATH for the same shell used for commit and push evidence',
      proof_type: 'git_lfs_push_path_probe',
      proof_boundary: 'Git LFS push-path probe is release-shell evidence only; it does not install Git LFS, push, deploy, clear source provenance, prove hosted/live parity, or grant production approval.',
      evidence_boundary: 'This probe only verifies Git LFS availability in the current shell. It does not install tools, push, deploy, clear source provenance, or grant production approval.',
      stop_gate: 'Do not treat commit hook warnings, previous pushes, skipped probes, or a missing git-lfs binary as current Git LFS push-path proof.',
      next_action: gitLfsAvailable
        ? 'Keep git-lfs on PATH for commit and push evidence; rerun git lfs version before treating future push evidence as current.'
        : 'Install or expose git-lfs on PATH for the same shell used for commit and push evidence, then rerun git lfs version.',
    },
  ];
  const ledger = {
    status: skipProbes ? 'skipped' : items.every((item) => item.status === 'pass') ? 'pass' : 'blocked',
    item_count: items.length,
    open_count: items.filter((item) => item.status !== 'pass').length,
    items,
  };
  return { ...ledger, evidence: releaseToolchainProbeEvidence(ledger) };
}

function buildReleasePreflightRemediationQueue(deficits) {
  const items = deficits.items
    .filter((item) => item.status !== 'pass')
    .map((item, index) => ({
      rank: index + 1,
      requirement: item.requirement,
      current: item.current,
      needed: item.needed,
      deficit_status: item.status,
      owner: releaseRemediationOwner(item.requirement),
      action: releaseRemediationAction(item),
      proof_command: releaseRemediationProofCommand(item.requirement),
      proof_type: releaseRemediationProofType(item.requirement),
      proof_boundary: releaseRemediationProofBoundary(item.requirement),
      stop_gate: releaseRemediationStopGate(item.requirement),
      status: releaseRemediationStatus(item.status),
    }));
  const queue = {
    status: items.length === 0 ? 'pass' : 'blocked',
    open_count: deficits.open_count,
    total_count: deficits.total_count,
    item_count: items.length,
    blocked_count: items.filter((item) => item.status !== 'ready').length,
    items,
  };
  return { ...queue, evidence: releasePreflightRemediationEvidence(queue) };
}

function probeReleasePreflight({ packageManager, gitStatus }) {
  const expectedVersion = expectedPnpmVersion(packageManager);
  const packageManagerPinned = Boolean(expectedVersion);
  const corepackResult = skipProbes ? null : run('corepack', ['pnpm', '--version']);
  const corepackOutput = corepackResult ? compactCommandOutput(corepackResult) : 'probe skipped by --skip-probes';
  const resolvedPnpmVersion = corepackResult?.status === 0
    ? String(corepackResult.stdout ?? '').trim().split(/\r?\n/).at(-1)?.trim() ?? ''
    : '';
  const corepackMatches = Boolean(expectedVersion && resolvedPnpmVersion === expectedVersion);
  const barePnpmResult = skipProbes ? null : run('pnpm', ['--version']);
  const barePnpmOutput = barePnpmResult ? compactCommandOutput(barePnpmResult) : 'probe skipped by --skip-probes';
  const barePnpmVersion = barePnpmResult?.status === 0
    ? String(barePnpmResult.stdout ?? '').trim().split(/\r?\n/).at(-1)?.trim() ?? ''
    : '';
  const barePnpmMatches = Boolean(expectedVersion && barePnpmVersion === expectedVersion);
  const barePnpmDiagnostic = skipProbes
    ? 'skipped'
    : barePnpmVersion
      ? `bare pnpm ${barePnpmVersion}${barePnpmMatches ? ' matches packageManager pin' : ' does not match packageManager pin'} but does not satisfy Corepack`
      : `${barePnpmOutput}; bare pnpm is unavailable and does not satisfy Corepack`;
  const gitLfsResult = skipProbes ? null : run('git', ['lfs', 'version']);
  const gitLfsOutput = gitLfsResult ? compactCommandOutput(gitLfsResult) : 'probe skipped by --skip-probes';
  const gitLfsAvailable = gitLfsResult?.status === 0;
  const gitLfsHookDiagnostic = skipProbes ? null : probeGitLfsHookPath();
  const gitLfsHookDiagnosticCurrent = gitLfsHookDiagnostic?.diagnosticCurrent ?? 'probe skipped by --skip-probes';

  const items = [
    {
      requirement: 'Pinned package manager',
      current: packageManager || 'missing',
      needed: 'exact packageManager pin in package.json such as pnpm@10.23.0',
      status: packageManagerPinned ? 'pass' : 'blocked',
      next_action: 'Keep package.json packageManager pinned to the exact pnpm version used by release-readiness.',
      proof_type: releaseRemediationProofType('Pinned package manager'),
      proof_boundary: releaseRemediationProofBoundary('Pinned package manager'),
      stop_gate: releaseRemediationStopGate('Pinned package manager'),
    },
    {
      requirement: 'Corepack pnpm resolver',
      current: skipProbes
        ? 'skipped'
        : corepackMatches
          ? `pnpm ${resolvedPnpmVersion}`
          : corepackOutput,
      needed: expectedVersion ? `corepack pnpm --version resolves ${expectedVersion}` : 'valid packageManager pin before Corepack resolution',
      status: skipProbes ? 'skipped' : corepackMatches ? 'pass' : 'blocked',
      next_action: 'Run from a Corepack-enabled shell; bare pnpm or a local shim does not count as release-readiness evidence.',
      proof_type: releaseRemediationProofType('Corepack pnpm resolver'),
      proof_boundary: releaseRemediationProofBoundary('Corepack pnpm resolver'),
      stop_gate: releaseRemediationStopGate('Corepack pnpm resolver'),
    },
    {
      requirement: 'Release-readiness execution',
      current: 'not run by launch manifest',
      needed: 'corepack pnpm run check:release-readiness passes after source provenance is clean',
      status: 'blocked',
      next_action: 'Run the full Corepack-pinned release-readiness chain before requesting production approval.',
      proof_type: releaseRemediationProofType('Release-readiness execution'),
      proof_boundary: releaseRemediationProofBoundary('Release-readiness execution'),
      stop_gate: releaseRemediationStopGate('Release-readiness execution'),
    },
    {
      requirement: 'Git LFS push-path proof',
      current: skipProbes
        ? 'skipped'
        : gitLfsAvailable
          ? gitLfsOutput
          : gitLfsOutput,
      needed: 'git lfs version succeeds in the shell used for commit/push evidence',
      status: skipProbes ? 'skipped' : gitLfsAvailable ? 'pass' : 'needs_remediation',
      next_action: gitLfsAvailable
        ? 'Keep git-lfs on PATH for commit and push evidence; rerun git lfs version before treating a future push path as current.'
        : 'Install or expose git-lfs on PATH, then rerun git lfs version before treating push-path evidence as current.',
      proof_type: releaseRemediationProofType('Git LFS push-path proof'),
      proof_boundary: releaseRemediationProofBoundary('Git LFS push-path proof'),
      stop_gate: releaseRemediationStopGate('Git LFS push-path proof'),
    },
    {
      requirement: 'Clean source provenance',
      current: sourceDecisionSummary(gitStatus.dirtyDetails, gitStatus.dirtyLines.length),
      needed: 'branch main with clean worktree before deploy approval request',
      status: gitStatus.isDirty ? 'blocked' : 'pass',
      next_action: gitStatus.isDirty
        ? 'Resolve dirty tracked/untracked paths without touching unrelated user work, then rerun the production approval packet.'
        : 'Keep source provenance clean through release-readiness and approval packet generation.',
      proof_type: releaseRemediationProofType('Clean source provenance'),
      proof_boundary: releaseRemediationProofBoundary('Clean source provenance'),
      stop_gate: releaseRemediationStopGate('Clean source provenance'),
    },
    {
      requirement: 'Explicit owner production approval',
      current: 'not granted by this report',
      needed: 'explicit owner approval before any production deploy command',
      status: 'manual_stop',
      next_action: 'Ask for explicit production approval only after source provenance and release-readiness are clean.',
      proof_type: releaseRemediationProofType('Explicit owner production approval'),
      proof_boundary: releaseRemediationProofBoundary('Explicit owner production approval'),
      stop_gate: releaseRemediationStopGate('Explicit owner production approval'),
    },
  ];

  const itemsWithProofCommands = items.map((item) => ({
    ...item,
    proof_command: releaseRemediationProofCommand(item.requirement),
  }));

  const deficits = {
    status: itemsWithProofCommands.every((item) => item.status === 'pass') ? 'pass' : 'blocked',
    package_manager: packageManager || null,
    expected_pnpm_version: expectedVersion,
    corepack_probe: skipProbes ? 'skipped' : (corepackResult?.status === 0 ? 'pass' : 'fail'),
    bare_pnpm_diagnostic: barePnpmDiagnostic,
    git_lfs_probe: skipProbes ? 'skipped' : (gitLfsAvailable ? 'pass' : 'fail'),
    git_lfs_hook_diagnostic: skipProbes ? 'skipped' : gitLfsHookDiagnosticCurrent,
    open_count: itemsWithProofCommands.filter((item) => item.status !== 'pass').length,
    total_count: itemsWithProofCommands.length,
    items: itemsWithProofCommands,
  };

  return {
    ...deficits,
    toolchain_probe_ledger: buildReleaseToolchainProbeLedger({
      expectedVersion,
      corepackOutput,
      corepackMatches,
      resolvedPnpmVersion,
      barePnpmOutput,
      barePnpmVersion,
      barePnpmMatches,
      gitLfsOutput,
      gitLfsAvailable,
      gitLfsHookDiagnosticCurrent,
    }),
    remediation_queue: buildReleasePreflightRemediationQueue(deficits),
    clearance_matrix: buildReleasePreflightClearanceMatrix(deficits),
    evidence: releasePreflightDeficitEvidence(deficits),
  };
}

function launchActionQueueEvidence(queue) {
  const topBlocked = queue.items
    .filter((item) => item.status !== 'ready')
    .slice(0, 5)
    .map((item) => `${item.rank}:${item.phase}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Launch blocker action queue:',
    `items=${queue.item_count}`,
    `blocked=${queue.blocked_count}`,
    `top_blocked=${topBlocked}`,
    'approval_gate=queue is an execution plan only; it does not deploy, merge, contact buyers, clear source provenance, or claim launch readiness',
  ].join(' ');
}

function launchActionProofType(phase) {
  switch (phase) {
    case 'source_provenance':
      return 'source_provenance_decision';
    case 'launch_evidence_validation':
      return 'manifest_validation_and_approval_packet';
    case 'release_toolchain':
      return 'release_toolchain_and_gated_release';
    case 'branch_review':
      return 'read_only_branch_review';
    case 'supabase_advisor':
      return 'external_account_evidence';
    case 'buyer_evidence':
      return 'retained_buyer_evidence_validation';
    case 'production_approval':
      return 'manual_approval_gate';
    case 'post_deploy_live_proof':
      return 'post_deploy_live_proof_gate';
    default:
      return 'launch_blocker_action';
  }
}

function launchActionProofBoundary(phase) {
  switch (phase) {
    case 'source_provenance':
      return 'Production approval packet evidence may identify unresolved source decisions; it does not commit, unstage, stash, revert, delete, clear provenance, deploy, or grant approval.';
    case 'launch_evidence_validation':
      return 'Launch evidence validation and approval-packet generation prove structure and readiness reporting only; they do not grant production approval, create buyer acceptance, deploy, or prove hosted/live parity.';
    case 'release_toolchain':
      return 'Release toolchain and guarded release-readiness evidence are local release-shell checks; they do not grant owner approval, push, deploy, or prove hosted/live parity.';
    case 'branch_review':
      return 'Branch review evidence must remain read-only; it does not checkout, merge, push, discard, migrate, deploy, or resolve canonical ownership without explicit owner approval.';
    case 'supabase_advisor':
      return 'Requires authorized Supabase dashboard or connector advisor evidence plus retained public-safe findings; CLI lint, repo artifacts, public status cards, and permission-denied output do not satisfy clearance.';
    case 'buyer_evidence':
      return 'Requires real anonymized accepted buyer rows and retained redacted artifacts passing validate:pilot-evidence --require-95; templates, generated workspaces, rehearsals, outreach headers, and constructed demos do not satisfy buyer acceptance.';
    case 'production_approval':
      return 'Requires explicit owner approval after prerequisite gates are ready; this action, manifest, report, or deploy-request check does not approve, push, deploy, or prove live parity.';
    case 'post_deploy_live_proof':
      return 'Post-deploy live proof is only valid after explicit approval and guarded deploy completion; this action does not deploy or create hosted/live parity evidence by itself.';
    default:
      return 'Launch action evidence is an execution plan only; it does not deploy, contact buyers, mutate branches, grant approval, or claim launch readiness by itself.';
  }
}

function buildLaunchActionQueue({
  buyerProbe,
  branchReviewQueue,
  supabaseAdvisor,
  releasePreflight,
  gitStatus,
}) {
  const dirtyPathSummary = sourceDecisionSummary(gitStatus.dirtyDetails, gitStatus.dirtyLines.length);
  const branchReviewFirst = branchReviewQueue.review_first_count ?? null;
  const branchTop = branchReviewQueue.items?.[0]?.review_ref ?? '<review-ref>';
  const supabaseOpen = supabaseAdvisor.clearanceDeficits?.open_count ?? 'unknown';
  const buyerOpenCount = buyerProbe.hardGateDeficits?.open_count;
  const buyerOpen = buyerOpenCount ?? 'unknown';
  const buyerDeficitsOpen = !Number.isInteger(buyerOpenCount) || buyerOpenCount > 0;
  const releaseOpen = releasePreflight.open_count ?? 'unknown';
  const releaseToolchainProbeLedger = releasePreflight.toolchain_probe_ledger ?? {};
  const releaseProbeOpen = releaseToolchainProbeLedger.open_count ?? 'unknown';
  const releaseProbeStatus = releaseToolchainProbeLedger.status ?? 'unknown';

  const items = [
    {
      rank: 1,
      phase: 'source_provenance',
      blocker: dirtyPathSummary,
      owner: 'operator',
      action: 'Resolve staged or unstaged source changes intentionally before any deploy approval request.',
      proof_command: SOURCE_PROVENANCE_FOCUSED_PROOF_COMMAND,
      proof_type: launchActionProofType('source_provenance'),
      proof_boundary: launchActionProofBoundary('source_provenance'),
      stop_gate: 'Do not commit, unstage, stash, revert, or delete unrelated user work without explicit owner intent.',
      status: gitStatus.isDirty ? 'blocked' : 'ready',
    },
    {
      rank: 2,
      phase: 'launch_evidence_validation',
      blocker: 'focused launch evidence validation must stay attached before a deploy approval request',
      owner: 'operator',
      action: 'Run the launch evidence manifest check and production approval packet while keeping structure validation separate from approval, buyer proof, deployment, and live parity.',
      proof_command: LAUNCH_EVIDENCE_VALIDATION_FOCUSED_PROOF_COMMAND,
      proof_type: launchActionProofType('launch_evidence_validation'),
      proof_boundary: launchActionProofBoundary('launch_evidence_validation'),
      stop_gate: 'Do not treat launch evidence validation, generated manifests, public status JSON, or schema validation as production approval, buyer acceptance, deployment, or current hosted/live parity.',
      status: 'ready',
    },
    {
      rank: 3,
      phase: 'release_toolchain',
      blocker: `${releaseOpen} release-preflight deficit(s), ${releaseProbeOpen} release-toolchain probe(s) open; probe_status=${releaseProbeStatus}`,
      owner: 'operator',
      action: 'Refresh the release toolchain probe ledger from the intended release shell, then run the guarded release path only after source provenance is clean.',
      proof_command: RELEASE_READINESS_FOCUSED_PROOF_COMMAND,
      proof_type: launchActionProofType('release_toolchain'),
      proof_boundary: launchActionProofBoundary('release_toolchain'),
      stop_gate: 'Do not treat the probe ledger, bare pnpm checks, skipped approval packets, or hook warnings as production approval evidence.',
      status: releasePreflight.status === 'pass' ? 'ready' : 'blocked',
    },
    {
      rank: 4,
      phase: 'branch_review',
      blocker: `${branchReviewFirst ?? 'unknown'} review-first branch family/families; top=${branchTop}`,
      owner: 'operator',
      action: 'Run focused read-only branch reviews and choose canonical heads before any merge, push, discard, migration, or deploy discussion.',
      proof_command: BRANCH_REVIEW_FOCUSED_PROOF_COMMAND,
      proof_type: launchActionProofType('branch_review'),
      proof_boundary: launchActionProofBoundary('branch_review'),
      stop_gate: 'No checkout, merge, push, discard, migration, or production approval without explicit owner approval and release gates.',
      status: (branchReviewFirst ?? 1) > 0 ? 'blocked' : 'ready',
    },
    {
      rank: 5,
      phase: 'supabase_advisor',
      blocker: `${supabaseOpen} Supabase advisor clearance deficit(s) remain`,
      owner: 'account_admin',
      action: 'Repair Supabase connector or dashboard authorization, rerun security/performance advisors, and retain public-safe findings.',
      proof_command: SUPABASE_ADVISOR_FOCUSED_PROOF_COMMAND,
      proof_type: launchActionProofType('supabase_advisor'),
      proof_boundary: launchActionProofBoundary('supabase_advisor'),
      stop_gate: 'Do not claim Supabase advisor clearance from CLI app lint, repo artifacts, or public status cards alone.',
      status: supabaseAdvisor.clearanceDeficits?.status === 'pass' ? 'ready' : 'blocked',
    },
    {
      rank: 6,
      phase: 'buyer_evidence',
      blocker: `${buyerOpen} buyer hard-gate deficit(s) remain`,
      owner: 'buyer_operator',
      action: 'Collect real anonymized accepted buyer rows and retained redacted artifacts for the minimum Phase F lanes.',
      proof_command: BUYER_EVIDENCE_GATE_FOCUSED_PROOF_COMMAND,
      proof_type: launchActionProofType('buyer_evidence'),
      proof_boundary: launchActionProofBoundary('buyer_evidence'),
      stop_gate: 'Do not count templates, generated workspaces, rehearsal rows, outreach headers, or constructed demos as buyer acceptance.',
      status: buyerDeficitsOpen ? 'blocked' : 'ready',
    },
    {
      rank: 7,
      phase: 'production_approval',
      blocker: 'explicit owner production approval is not granted by this report',
      owner: 'owner',
      action: 'Request production deployment approval only after source provenance, release-readiness, branch review, and security/advisor gates are clean.',
      proof_command: PRODUCTION_APPROVAL_FOCUSED_PROOF_COMMAND,
      proof_type: launchActionProofType('production_approval'),
      proof_boundary: launchActionProofBoundary('production_approval'),
      stop_gate: 'Do not run deploy-production.sh or netlify deploy without explicit production approval.',
      status: 'manual_stop',
    },
    {
      rank: 8,
      phase: 'post_deploy_live_proof',
      blocker: 'current source is not live-proven by this manifest',
      owner: 'operator',
      action: 'After an explicitly approved deploy, prove live metadata, static parity, and hosted proof-pack route smoke.',
      proof_command: POST_DEPLOY_LIVE_PROOF_FOCUSED_PROOF_COMMAND,
      proof_type: launchActionProofType('post_deploy_live_proof'),
      proof_boundary: launchActionProofBoundary('post_deploy_live_proof'),
      stop_gate: 'Do not present hosted/live parity for current source until the post-deploy live gate passes after the approved deploy.',
      status: 'blocked',
    },
  ];

  const queue = {
    status: items.every((item) => item.status === 'ready') ? 'ready' : 'blocked',
    item_count: items.length,
    blocked_count: items.filter((item) => item.status !== 'ready').length,
    items,
  };

  return {
    ...queue,
    evidence: launchActionQueueEvidence(queue),
  };
}

function productionApprovalPrerequisiteEvidence(queue) {
  const topOpen = queue.items
    .filter((item) => item.status !== 'ready')
    .slice(0, 6)
    .map((item) => `${item.rank}:${item.prerequisite}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Production approval prerequisite queue:',
    `status=${queue.status}`,
    `open=${queue.blocked_count}/${queue.item_count}`,
    `manual_stop=${queue.manual_stop_count}`,
    `top_open=${topOpen}`,
    'approval_gate=queue does not grant owner approval, deploy, push, merge, mutate branches, contact buyers, access Supabase, clear source provenance, or claim post-deploy live parity',
  ].join(' ');
}

function statusForProductionPrerequisite(isReady, fallback = 'blocked') {
  return isReady ? 'ready' : fallback;
}

function productionApprovalPrerequisiteProofType(prerequisite) {
  switch (prerequisite) {
    case 'Clean source provenance':
      return 'source_provenance_decision';
    case 'Launch evidence validation':
      return 'manifest_validation';
    case 'Corepack release-readiness':
      return 'gated_release_command';
    case 'Canonical branch review':
      return 'read_only_branch_review';
    case 'Supabase advisor clearance':
      return 'external_account_evidence';
    case 'Buyer evidence hard gate':
      return 'retained_buyer_evidence_validation';
    case 'Explicit owner production approval':
      return 'manual_approval';
    case 'Post-deploy live proof boundary':
      return 'post_deploy_live_proof_gate';
    default:
      return 'production_approval_prerequisite';
  }
}

function productionApprovalPrerequisiteProofBoundary(prerequisite) {
  switch (prerequisite) {
    case 'Clean source provenance':
      return 'Production approval packet evidence may expose unresolved source decisions; it does not commit, unstage, stash, revert, delete, rename, move, clear provenance, deploy, or grant owner approval.';
    case 'Launch evidence validation':
      return 'Manifest validation proves launch evidence structure only; it does not grant production approval, create buyer acceptance, deploy, or prove current hosted/live parity.';
    case 'Corepack release-readiness':
      return 'Corepack-pinned release-readiness is a guarded local release check after clean provenance and current toolchain probes; it does not grant owner approval, deploy, push, or prove hosted/live parity.';
    case 'Canonical branch review':
      return 'Branch review evidence must remain read-only; it does not checkout, merge, push, discard, migrate, deploy, resolve canonical-head ownership, or grant production approval.';
    case 'Supabase advisor clearance':
      return 'Requires authorized Supabase dashboard or connector advisor evidence and public-safe retained findings; CLI lint, repo artifacts, public status cards, and permission-denied connector output do not satisfy this prerequisite.';
    case 'Buyer evidence hard gate':
      return 'Requires real anonymized accepted buyer rows and retained redacted artifacts passing validate:pilot-evidence --require-95; templates, rehearsal rows, outreach headers, constructed demos, and missing artifacts do not satisfy this prerequisite.';
    case 'Explicit owner production approval':
      return 'Requires explicit owner approval after every prerequisite is ready; this queue, manifest, report, schema validation, or deploy-request check does not approve, push, deploy, or prove live parity.';
    case 'Post-deploy live proof boundary':
      return 'Post-deploy live proof is only eligible after explicit approval and guarded deploy completion; this prerequisite row does not deploy, bypass approval, or create hosted/live parity evidence.';
    default:
      return 'Production approval requires explicit owner approval and current evidence; this row does not grant approval, deploy, or claim launch readiness by itself.';
  }
}

function buildProductionApprovalPrerequisiteQueue({
  buyerProbe,
  branchReviewQueue,
  canonicalHeadDecisions,
  supabaseAdvisor,
  releasePreflight,
  sourceProvenanceResolutionQueue,
}) {
  const sourceReady = sourceProvenanceResolutionQueue.status === 'pass';
  const sourceCurrent = sourceReady
    ? 'source provenance queue passed'
    : sourceDecisionSummary(sourceProvenanceResolutionQueue.items ?? [], sourceProvenanceResolutionQueue.dirty_path_count);
  const releaseReady = releasePreflight.status === 'pass';
  const releaseToolchainProbeLedger = releasePreflight.toolchain_probe_ledger ?? {};
  const releaseProbeOpen = releaseToolchainProbeLedger.open_count ?? 'unknown';
  const releaseProbeStatus = releaseToolchainProbeLedger.status ?? 'unknown';
  const branchReviewFirst = branchReviewQueue.review_first_count;
  const branchReady = branchReviewQueue.status !== 'skipped'
    && canonicalHeadDecisions.status === 'pass'
    && (branchReviewFirst ?? 1) === 0;
  const supabaseReady = supabaseAdvisor.clearanceDeficits?.status === 'pass';
  const buyerReady = buyerProbe.hardGateDeficits?.status === 'pass';

  const items = [
    {
      rank: 1,
      prerequisite: 'Clean source provenance',
      current: sourceCurrent,
      needed: 'clean worktree and no unresolved staged, unstaged, untracked, ignored, or renamed source decisions before a deploy approval request',
      owner: 'operator',
      proof_command: SOURCE_PROVENANCE_FOCUSED_PROOF_COMMAND,
      proof_type: productionApprovalPrerequisiteProofType('Clean source provenance'),
      proof_boundary: productionApprovalPrerequisiteProofBoundary('Clean source provenance'),
      stop_gate: 'Do not commit, unstage, stash, revert, delete, rename, move, or clear source provenance without explicit owner intent.',
      status: statusForProductionPrerequisite(sourceReady),
    },
    {
      rank: 2,
      prerequisite: 'Launch evidence validation',
      current: 'focused launch evidence validation report/check is external to manifest generation and must attach passing check:launch-evidence-manifest output',
      needed: 'report:launch-evidence-validation-readiness, check:launch-evidence-validation-report, and the underlying check:launch-evidence-manifest pass before any production approval request uses this packet',
      owner: 'operator',
      proof_command: LAUNCH_EVIDENCE_VALIDATION_FOCUSED_PROOF_COMMAND,
      proof_type: productionApprovalPrerequisiteProofType('Launch evidence validation'),
      proof_boundary: productionApprovalPrerequisiteProofBoundary('Launch evidence validation'),
      stop_gate: 'Do not treat manifest generation, public release status, schema validation, or launch evidence validation as production approval, buyer acceptance, deployment, or current hosted/live parity.',
      status: 'ready',
    },
    {
      rank: 3,
      prerequisite: 'Corepack release-readiness',
      current: releaseReady
        ? 'release preflight passed'
        : `${releasePreflight.open_count ?? 'unknown'} release-preflight deficit(s); ${releaseProbeOpen} release-toolchain probe(s) open; probe_status=${releaseProbeStatus}`,
      needed: 'Corepack-pinned release-readiness, current Corepack/Git LFS probe ledger, Git LFS push-path proof, clean provenance, and owner-approval gate all current',
      owner: 'operator',
      proof_command: RELEASE_READINESS_FOCUSED_PROOF_COMMAND,
      proof_type: productionApprovalPrerequisiteProofType('Corepack release-readiness'),
      proof_boundary: productionApprovalPrerequisiteProofBoundary('Corepack release-readiness'),
      stop_gate: 'Do not treat the probe ledger, bare pnpm checks, skipped approval packets, or hook warnings as production approval evidence.',
      status: statusForProductionPrerequisite(releaseReady),
    },
    {
      rank: 4,
      prerequisite: 'Canonical branch review',
      current: branchReady
        ? 'branch review queue clear'
        : `${branchReviewFirst ?? 'unknown'} review-first branch family/families; ${canonicalHeadDecisions.open_count ?? 'unknown'} canonical-head decision(s) remain`,
      needed: 'no review-first branch families and no unresolved split, local-only, origin-only, stale, aging, or unknown canonical-head decisions',
      owner: 'operator',
      proof_command: BRANCH_REVIEW_FOCUSED_PROOF_COMMAND,
      proof_type: productionApprovalPrerequisiteProofType('Canonical branch review'),
      proof_boundary: productionApprovalPrerequisiteProofBoundary('Canonical branch review'),
      stop_gate: 'No checkout, merge, push, discard, migration, deploy, or production approval from branch review output without explicit owner approval and release gates.',
      status: statusForProductionPrerequisite(branchReady),
    },
    {
      rank: 5,
      prerequisite: 'Supabase advisor clearance',
      current: supabaseReady
        ? 'Supabase advisor clearance rows passed'
        : `${supabaseAdvisor.clearanceDeficits?.open_count ?? 'unknown'} Supabase advisor clearance deficit(s) remain`,
      needed: 'authorized Security Advisor and Performance Advisor evidence plus public-safe findings record for the current project',
      owner: 'account_admin',
      proof_command: SUPABASE_ADVISOR_FOCUSED_PROOF_COMMAND,
      proof_type: productionApprovalPrerequisiteProofType('Supabase advisor clearance'),
      proof_boundary: productionApprovalPrerequisiteProofBoundary('Supabase advisor clearance'),
      stop_gate: 'Do not claim Supabase advisor clearance from CLI app lint, repo artifacts, public status cards, or permission-denied connector output.',
      status: statusForProductionPrerequisite(supabaseReady),
    },
    {
      rank: 6,
      prerequisite: 'Buyer evidence hard gate',
      current: buyerReady
        ? 'buyer evidence hard gate passed'
        : `${buyerProbe.hardGateDeficits?.open_count ?? 'unknown'} buyer hard-gate deficit(s) remain`,
      needed: 'real anonymized accepted buyer rows and retained redacted artifacts pass validate:pilot-evidence --require-95',
      owner: 'buyer_operator',
      proof_command: BUYER_EVIDENCE_GATE_FOCUSED_PROOF_COMMAND,
      proof_type: productionApprovalPrerequisiteProofType('Buyer evidence hard gate'),
      proof_boundary: productionApprovalPrerequisiteProofBoundary('Buyer evidence hard gate'),
      stop_gate: 'Do not count templates, generated workspaces, rehearsal rows, outreach headers, constructed demos, or missing artifacts as buyer acceptance.',
      status: statusForProductionPrerequisite(buyerReady),
    },
    {
      rank: 7,
      prerequisite: 'Explicit owner production approval',
      current: 'not granted by this manifest or report',
      needed: 'explicit owner approval after every prerequisite above is ready',
      owner: 'owner',
      proof_command: 'corepack pnpm run check:production-deploy-request',
      proof_type: productionApprovalPrerequisiteProofType('Explicit owner production approval'),
      proof_boundary: productionApprovalPrerequisiteProofBoundary('Explicit owner production approval'),
      stop_gate: 'Do not run deploy-production.sh, netlify deploy, push, or claim production approval from this queue, manifest, report, or schema validation.',
      status: 'manual_stop',
    },
    {
      rank: 8,
      prerequisite: 'Post-deploy live proof boundary',
      current: 'not eligible before explicit approved deploy',
      needed: 'after approved deploy, live metadata, static parity, and hosted proof-pack route smoke pass',
      owner: 'operator',
      proof_command: 'corepack pnpm run check:post-deploy-live',
      proof_type: productionApprovalPrerequisiteProofType('Post-deploy live proof boundary'),
      proof_boundary: productionApprovalPrerequisiteProofBoundary('Post-deploy live proof boundary'),
      stop_gate: 'Do not present hosted/live parity for current source until post-deploy live checks pass after an explicitly approved deploy.',
      status: 'blocked',
    },
  ];

  const queue = {
    status: items.every((item) => item.status === 'ready') ? 'ready' : 'blocked',
    item_count: items.length,
    blocked_count: items.filter((item) => item.status !== 'ready').length,
    manual_stop_count: items.filter((item) => item.status === 'manual_stop').length,
    items,
  };

  return {
    ...queue,
    evidence: productionApprovalPrerequisiteEvidence(queue),
  };
}

function productionApprovalRequestPacketEvidence(packet) {
  const topBlocked = packet.items
    .filter((item) => item.blocks_request)
    .slice(0, 6)
    .map((item) => `${item.rank}:${item.prerequisite}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Production approval request packet:',
    `status=${packet.status}`,
    `request_eligible=${packet.request_eligible ? 'yes' : 'no'}`,
    `request_blocking=${packet.request_blocking_count}/${packet.item_count}`,
    `manual_stop=${packet.manual_stop_count}`,
    `top_blocked=${topBlocked}`,
    'approval_gate=packet organizes request evidence only; it does not grant owner approval, run deploys, push, mutate branches, contact buyers, access Supabase, clear source provenance, or prove hosted/live parity',
  ].join(' ');
}

function productionApprovalRequestPhase(prerequisite) {
  if (prerequisite === 'Explicit owner production approval') return 'owner_decision';
  if (prerequisite === 'Post-deploy live proof boundary') return 'post_deploy_boundary';
  return 'pre_request';
}

function productionApprovalRequestAttachment(prerequisite) {
  switch (prerequisite) {
    case 'Clean source provenance':
      return 'Attach the focused source-provenance report/check output plus the production approval packet source-provenance section showing no unresolved staged, unstaged, untracked, ignored, or renamed source decisions.';
    case 'Launch evidence validation':
      return 'Attach focused launch evidence validation report/check output, including the underlying check:launch-evidence-manifest result, plus the production approval packet validation section.';
    case 'Corepack release-readiness':
      return 'Attach focused release-preflight report/check output plus Corepack-pinned release-readiness output and current Corepack/Git LFS probe evidence.';
    case 'Canonical branch review':
      return 'Attach focused branch-review report/check output plus read-only unmerged-branch packet evidence and canonical-head owner decisions for review-first branch families.';
    case 'Supabase advisor clearance':
      return 'Attach focused Supabase advisor report/check output plus authorized Supabase Security and Performance Advisor results and a public-safe findings summary.';
    case 'Buyer evidence hard gate':
      return 'Attach focused buyer-evidence hard-gate report/check output plus the validated buyer evidence register, accepted anonymized buyer rows, and retained redacted artifacts that pass validate:pilot-evidence --require-95.';
    case 'Explicit owner production approval':
      return 'Attach the explicit owner approval record only after every pre-request blocker is ready; this packet does not create that approval.';
    case 'Post-deploy live proof boundary':
      return 'Attach post-deploy live metadata, static parity, and hosted proof-pack smoke only after an explicitly approved deploy.';
    default:
      return 'Attach current proof for this prerequisite before requesting production approval.';
  }
}

function productionApprovalRequestImpact(prerequisite) {
  switch (prerequisite) {
    case 'Clean source provenance':
      return 'Approval request is blocked while source ownership or dirty-path provenance is unresolved.';
    case 'Launch evidence validation':
      return 'Approval request must attach passing launch evidence validation; this row does not grant approval, buyer acceptance, deployment, or live parity.';
    case 'Corepack release-readiness':
      return 'Approval request is blocked until the intended release shell proves the guarded release path.';
    case 'Canonical branch review':
      return 'Approval request is blocked until unmerged branch risk and canonical-head decisions are read-only reviewed.';
    case 'Supabase advisor clearance':
      return 'Approval request is blocked until authorized database advisor evidence is reviewed and safely recorded.';
    case 'Buyer evidence hard gate':
      return 'Approval request is blocked while commercial evidence lacks accepted buyer rows and retained artifacts.';
    case 'Explicit owner production approval':
      return 'Owner approval is the manual decision target, not evidence this packet can self-satisfy.';
    case 'Post-deploy live proof boundary':
      return 'Post-deploy proof is a downstream claim boundary after approval and deploy completion, not a pre-request clearance row.';
    default:
      return 'Approval request depends on this prerequisite evidence being current.';
  }
}

function productionApprovalRequestStatus(item) {
  if (item.status === 'ready') return 'ready';
  if (item.status === 'manual_stop') return 'manual_stop';
  return 'blocked';
}

function buildProductionApprovalRequestPacket(prerequisiteQueue) {
  const items = (prerequisiteQueue.items ?? []).map((item, index) => {
    const requestPhase = productionApprovalRequestPhase(item.prerequisite);
    const blocksRequest = requestPhase === 'pre_request' && item.status !== 'ready';
    return {
      rank: index + 1,
      prerequisite: item.prerequisite,
      request_phase: requestPhase,
      current: item.current,
      needed: item.needed,
      owner: item.owner,
      evidence_to_attach: productionApprovalRequestAttachment(item.prerequisite),
      proof_command: item.proof_command,
      proof_type: item.proof_type,
      proof_boundary: item.proof_boundary,
      stop_gate: item.stop_gate,
      request_impact: productionApprovalRequestImpact(item.prerequisite),
      source_status: item.status,
      status: productionApprovalRequestStatus(item),
      blocks_request: blocksRequest,
    };
  });
  const requestBlockingCount = items.filter((item) => item.blocks_request).length;
  const manualStopCount = items.filter((item) => item.status === 'manual_stop').length;
  const packet = {
    status: requestBlockingCount === 0 ? 'ready_to_request' : 'blocked',
    proof_type: 'production_approval_request_packet',
    source_prerequisite_status: prerequisiteQueue.status,
    request_eligible: requestBlockingCount === 0,
    item_count: items.length,
    request_blocking_count: requestBlockingCount,
    manual_stop_count: manualStopCount,
    items,
    proof_boundary: 'Production approval request packet organizes evidence for owner review only; it does not grant owner approval, run deploys, push, merge, mutate branches, contact buyers, access Supabase, clear source provenance, or prove hosted/live parity.',
    stop_gate: 'Do not request or claim production approval until every pre-request row is ready; do not run deploy-production.sh, netlify deploy, push, or hosted/live claims from this packet.',
  };
  return { ...packet, evidence: productionApprovalRequestPacketEvidence(packet) };
}

function packageScriptCommand(packageScripts, scriptName, fallback) {
  const command = packageScripts?.[scriptName];
  return command ? `corepack pnpm run ${scriptName}` : fallback;
}

function postDeployLiveProofGateEvidence(queue) {
  const topOpen = queue.items
    .filter((item) => item.status !== 'ready')
    .slice(0, 6)
    .map((item) => `${item.rank}:${item.gate}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Post-deploy live proof gate queue:',
    `status=${queue.status}`,
    `open=${queue.blocked_count}/${queue.item_count}`,
    `top_open=${topOpen}`,
    'approval_gate=queue does not deploy, push, rebuild, mutate Netlify, access live accounts, run browser smoke, or claim hosted/live parity before explicit approval and a successful post-deploy gate',
  ].join(' ');
}

function postDeployLiveProofGateProofType(gate) {
  switch (gate) {
    case 'Production approval clearance':
      return 'manual_approval_gate';
    case 'Guarded production deploy completion':
      return 'approved_deploy_execution';
    case 'Live public metadata':
      return 'hosted_metadata_probe';
    case 'Live static dist parity':
      return 'hosted_static_parity_probe';
    case 'Hosted proof-pack route smoke':
      return 'hosted_browser_smoke';
    case 'Current-source hosted parity claim':
      return 'post_deploy_parity_claim';
    default:
      return 'post_deploy_live_proof_gate';
  }
}

function postDeployLiveProofGateProofBoundary(gate) {
  switch (gate) {
    case 'Production approval clearance':
      return 'Runs the deploy-request eligibility check only; it does not grant owner approval, deploy, or bypass source, release, branch, Supabase, or buyer gates.';
    case 'Guarded production deploy completion':
      return 'Requires explicit owner approval plus the typed deploy phrase before running the deploy script; this queue row and manifest do not run deploys, push, mutate Netlify, or prove hosted/live parity.';
    case 'Live public metadata':
      return 'Checks live metadata only after the approved deploy; metadata evidence alone does not prove static parity, hosted proof-pack smoke, or current-source hosted parity.';
    case 'Live static dist parity':
      return 'Compares hosted static files to the just-built dist artifact after the approved deploy; it does not rebuild dist or prove metadata, browser smoke, or full hosted/live parity alone.';
    case 'Hosted proof-pack route smoke':
      return 'Runs hosted browser smoke only after the approved deploy; local smoke, constructed demos, skipped smoke, and generated artifacts do not prove hosted proof-pack route evidence.';
    case 'Current-source hosted parity claim':
      return 'May pass only after approval, guarded deploy completion, live metadata, static parity, and hosted proof-pack smoke all pass; the queued command does not create live proof by itself.';
    default:
      return 'Post-deploy live proof requires explicit approval and current hosted evidence; this queue row does not deploy or claim live parity by itself.';
  }
}

function buildPostDeployLiveProofGateQueue({ productionApprovalPrerequisiteQueue, packageScripts }) {
  const approvalReady = productionApprovalPrerequisiteQueue.status === 'ready';
  const liveMetadataCommand = packageScriptCommand(packageScripts, 'check:live-public-metadata', 'corepack pnpm run check:live-public-metadata');
  const liveStaticParityCommand = packageScriptCommand(packageScripts, 'check:live-static-parity', 'corepack pnpm run check:live-static-parity');
  const hostedProofPackCommand = packageScriptCommand(packageScripts, 'test:browser:hosted:proof-packs', 'corepack pnpm run test:browser:hosted:proof-packs');
  const postDeployCommand = packageScriptCommand(packageScripts, 'check:post-deploy-live', 'corepack pnpm run check:post-deploy-live');

  const items = [
    {
      rank: 1,
      gate: 'Production approval clearance',
      current: approvalReady ? 'production approval prerequisites ready' : `${productionApprovalPrerequisiteQueue.blocked_count ?? 'unknown'} production-approval prerequisite(s) remain`,
      needed: 'clean prerequisite queue and explicit owner approval before any deploy or live-proof attempt',
      owner: 'owner',
      proof_command: 'corepack pnpm run check:production-deploy-request',
      proof_type: postDeployLiveProofGateProofType('Production approval clearance'),
      proof_boundary: postDeployLiveProofGateProofBoundary('Production approval clearance'),
      stop_gate: 'Do not use post-deploy checks to bypass source provenance, release-readiness, branch review, buyer evidence, Supabase advisor, or explicit owner approval gates.',
      status: approvalReady ? 'manual_stop' : 'blocked',
    },
    {
      rank: 2,
      gate: 'Guarded production deploy completion',
      current: 'not run by this manifest',
      needed: 'after explicit owner approval, deploy the already-built dist artifact through scripts/deploy-production.sh',
      owner: 'operator',
      proof_command: 'corepack pnpm run check:production-deploy-request && scripts/deploy-production.sh',
      approval_required: true,
      approval_command: 'corepack pnpm run check:production-deploy-request',
      approval_phrase: 'DEPLOY CEIP PRODUCTION',
      execution_command: 'scripts/deploy-production.sh',
      proof_type: postDeployLiveProofGateProofType('Guarded production deploy completion'),
      proof_boundary: postDeployLiveProofGateProofBoundary('Guarded production deploy completion'),
      stop_gate: 'Do not run deploy-production.sh, netlify deploy, push, or mutate production from this queue or manifest; require explicit owner approval and the typed phrase DEPLOY CEIP PRODUCTION inside the deploy script.',
      status: 'blocked',
    },
    {
      rank: 3,
      gate: 'Live public metadata',
      current: 'not run by this manifest',
      needed: 'live root metadata, manifest, and JSON-LD carry current proof-pack positioning after the approved deploy',
      owner: 'operator',
      proof_command: liveMetadataCommand,
      proof_type: postDeployLiveProofGateProofType('Live public metadata'),
      proof_boundary: postDeployLiveProofGateProofBoundary('Live public metadata'),
      stop_gate: 'Do not claim metadata parity before the approved deploy and the live public metadata check pass for the deployed artifact.',
      status: 'blocked',
    },
    {
      rank: 4,
      gate: 'Live static dist parity',
      current: 'not run by this manifest',
      needed: 'hosted /, /manifest.json, and /schema-webapp.jsonld match the just-built dist artifact',
      owner: 'operator',
      proof_command: liveStaticParityCommand,
      proof_type: postDeployLiveProofGateProofType('Live static dist parity'),
      proof_boundary: postDeployLiveProofGateProofBoundary('Live static dist parity'),
      stop_gate: 'Do not rebuild dist inside the live parity claim or compare production to stale local artifacts.',
      status: 'blocked',
    },
    {
      rank: 5,
      gate: 'Hosted proof-pack route smoke',
      current: 'not run by this manifest',
      needed: 'hosted proof-pack routes smoke successfully against production after the approved deploy',
      owner: 'operator',
      proof_command: hostedProofPackCommand,
      proof_type: postDeployLiveProofGateProofType('Hosted proof-pack route smoke'),
      proof_boundary: postDeployLiveProofGateProofBoundary('Hosted proof-pack route smoke'),
      stop_gate: 'Do not treat local browser smoke, constructed demos, or skipped hosted smoke as hosted proof-pack route evidence.',
      status: 'blocked',
    },
    {
      rank: 6,
      gate: 'Current-source hosted parity claim',
      current: 'not live-proven by this manifest',
      needed: 'the full post-deploy live gate passes after the explicitly approved deploy',
      owner: 'operator',
      proof_command: postDeployCommand,
      proof_type: postDeployLiveProofGateProofType('Current-source hosted parity claim'),
      proof_boundary: postDeployLiveProofGateProofBoundary('Current-source hosted parity claim'),
      stop_gate: 'Do not present hosted/live parity for current source until live metadata, static parity, and hosted proof-pack smoke all pass after the approved deploy.',
      status: 'blocked',
    },
  ];

  const queue = {
    status: 'blocked',
    item_count: items.length,
    blocked_count: items.filter((item) => item.status !== 'ready').length,
    items,
  };

  return {
    ...queue,
    evidence: postDeployLiveProofGateEvidence(queue),
  };
}

function parseGateLine(text, label) {
  const pattern = new RegExp(`^${label}:\\s*(.+)$`, 'm');
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function buyerEvidenceReviewEvidence(probe) {
  return [
    'Buyer evidence review:',
    `production_registers=${probe.productionRegisters ?? 'unknown'}`,
    `starter_only_registers=${probe.starterOnlyRegisters ?? 'unknown'}`,
    `outreach_logs=${probe.outreachLogs ?? 'unknown'}`,
    `confidence_rows=${probe.confidenceRows ?? 'unknown'}`,
    `actionable_outreach_rows=${probe.actionableRows ?? 'unknown'}`,
    `batchable_intake_rows=${probe.batchableIntakeRows ?? 'unknown'}`,
    `phase_f_gate=${probe.phaseFGate}`,
    `evidence_root=${probe.evidenceRoot ?? 'unknown'}`,
    `workspace_next_step=${probe.workspaceNextStep}`,
  ].join(' ');
}

function buyerDeficitEvidence(deficits) {
  if (deficits.status === 'skipped') {
    return 'Buyer hard-gate deficit ledger skipped by --skip-probes; run corepack pnpm run report:buyer-evidence-readiness for the current hard-gate deficit table.';
  }

  const topOpen = deficits.items
    .filter((item) => item.status !== 'pass')
    .slice(0, 4)
    .map((item) => `${item.requirement}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Buyer hard-gate deficit ledger:',
    `open=${deficits.open_count ?? 'unknown'}/${deficits.total_count ?? 'unknown'}`,
    `top_open=${topOpen}`,
  ].join(' ');
}

function buyerEvidenceRemediationOwner(requirement) {
  switch (requirement) {
    case 'Retained SHA-256 references':
    case 'Retained-artifact 95% validation':
      return 'evidence_operator';
    case 'Strong commercial signal':
      return 'commercial_owner';
    default:
      return 'buyer_operator';
  }
}

function buyerArtifactPrepOptions({
  route,
  proofPackId,
  artifactFile,
  diagnostic = 'REPLACE_WITH_RETAINED_ROUTE_SPECIFIC_DIAGNOSTIC_EVIDENCE',
  commercialSignal = false,
}) {
  const commercialOptions = commercialSignal
    ? [
      '--commercial-commitment-status REPLACE_WITH_STRONG_COMMERCIAL_STATUS_DESIGN_PARTNER_PAID_PILOT_PO_OR_LOI',
      '--commercial-commitment-evidence "REPLACE_WITH_REDACTED_SIGNED_AGREEMENT_PAID_PILOT_INVOICE_PO_OR_LOI_EVIDENCE"',
    ]
    : ['--commercial-commitment-status none'];

  return [
    '--evidence-root path/to/redacted-artifacts',
    `--artifact-file ${artifactFile}`,
    `--route ${route}`,
    `--proof-pack-id ${proofPackId}`,
    '--record-date REPLACE_WITH_RECORD_DATE_YYYY_MM_DD',
    '--pii-screen-result redacted',
    '--buyer-data-coverage-pct REPLACE_WITH_BUYER_DATA_COVERAGE_PCT_70_TO_100',
    '--time-to-artifact-hours REPLACE_WITH_TIME_TO_ARTIFACT_HOURS_0_TO_120',
    '--reviewer-role "REPLACE_WITH_INDEPENDENT_BUYER_REVIEWER_ROLE"',
    '--reviewer-acceptance accepted',
    '--reviewer-feedback-status complete',
    '--day-14-decision proceed',
    ...commercialOptions,
    '--claim-boundary "REPLACE_WITH_BUYER_SUPPLIED_CLAIM_BOUNDARY"',
    '--do-not-claim "REPLACE_WITH_ROUTE_SPECIFIC_DO_NOT_CLAIM_BOUNDARY"',
    `--diagnostic "${diagnostic}"`,
  ].join(' ');
}

function pilotEvidenceArtifactPrepCommand(options) {
  return `corepack pnpm run prepare:pilot-evidence-artifact -- ${buyerArtifactPrepOptions(options)}`;
}

function forecastTrustArtifactPrepCommand() {
  return [
    'corepack pnpm run prepare:forecast-trust-report-artifact --',
    '--benchmark-pack-file path/to/utility-forecast-benchmark-pack.json',
    buyerArtifactPrepOptions({
      route: '/utility-demand-forecast',
      proofPackId: 'utility_forecast_planning_pack',
      artifactFile: 'utility-forecast.md',
    }),
  ].join(' ');
}

function buyerEvidenceRemediationProofCommand(requirement) {
  switch (requirement) {
    case 'Utility forecast lane':
      return forecastTrustArtifactPrepCommand();
    case 'TIER or credit lane':
      return pilotEvidenceArtifactPrepCommand({
        route: '/credit-banking',
        proofPackId: 'tier_credit_banking_audit_pack',
        artifactFile: 'credit-banking.md',
        diagnostic: 'REPLACE_WITH_CREDIT_LOT_EXPIRY_ALLOCATION_AND_LIABILITY_DIAGNOSTIC_EVIDENCE',
      });
    case 'Billing or security lane':
      return pilotEvidenceArtifactPrepCommand({
        route: '/shadow-billing',
        proofPackId: 'shadow_billing_invoice_pack',
        artifactFile: 'shadow-billing.md',
        diagnostic: 'REPLACE_WITH_FIELD_MAP_MONTHLY_DELTA_AND_EXCLUDED_RIDER_DIAGNOSTIC_EVIDENCE',
      });
    case 'Distinct accepted proof packs':
      return 'corepack pnpm run report:pilot-evidence-95 -- path/to/filled-pilot-evidence-register.csv --evidence-root path/to/redacted-artifacts';
    case 'Accepted confidence_delta':
      return 'corepack pnpm run update:pilot-evidence-register-row -- --register-file path/to/register.csv --evidence-root path/to/redacted-artifacts --evidence-file-reference redacted-artifact.md#sha256=REPLACE_WITH_HASH_FROM_HELPER --confidence-delta REPLACE_WITH_CONFIDENCE_DELTA_0_TO_0_4 --output-file path/to/filled-register.csv';
    case 'Retained SHA-256 references':
      return [
        pilotEvidenceArtifactPrepCommand({
          route: 'REPLACE_WITH_ROUTE',
          proofPackId: 'REPLACE_WITH_PROOF_PACK_ID',
          artifactFile: 'redacted-artifact.md',
        }),
        'corepack pnpm run update:pilot-evidence-register-row -- --register-file path/to/register.csv --evidence-root path/to/redacted-artifacts --evidence-file-reference redacted-artifact.md#sha256=REPLACE_WITH_HASH_FROM_HELPER --confidence-delta REPLACE_WITH_CONFIDENCE_DELTA_0_TO_0_4 --output-file path/to/filled-register.csv',
      ].join(' && ');
    case 'Buyer data coverage':
      return 'corepack pnpm run update:pilot-evidence-register-row -- --buyer-data-coverage-pct REPLACE_WITH_BUYER_DATA_COVERAGE_PCT_70_TO_100 --register-file path/to/register.csv --evidence-root path/to/redacted-artifacts --evidence-file-reference redacted-artifact.md#sha256=REPLACE_WITH_HASH_FROM_HELPER --confidence-delta REPLACE_WITH_CONFIDENCE_DELTA_0_TO_0_4 --output-file path/to/filled-register.csv';
    case 'Artifact turnaround':
      return 'corepack pnpm run update:pilot-evidence-register-row -- --time-to-artifact-hours REPLACE_WITH_TIME_TO_ARTIFACT_HOURS_0_TO_120 --register-file path/to/register.csv --evidence-root path/to/redacted-artifacts --evidence-file-reference redacted-artifact.md#sha256=REPLACE_WITH_HASH_FROM_HELPER --confidence-delta REPLACE_WITH_CONFIDENCE_DELTA_0_TO_0_4 --output-file path/to/filled-register.csv';
    case 'Strong commercial signal':
      return [
        pilotEvidenceArtifactPrepCommand({
          route: 'REPLACE_WITH_ROUTE',
          proofPackId: 'REPLACE_WITH_PROOF_PACK_ID',
          artifactFile: 'commercial-commitment.md',
          commercialSignal: true,
        }),
        'corepack pnpm run update:pilot-evidence-register-row -- --register-file path/to/register.csv --evidence-root path/to/redacted-artifacts --evidence-file-reference commercial-commitment.md#sha256=REPLACE_WITH_HASH_FROM_HELPER --confidence-delta REPLACE_WITH_CONFIDENCE_DELTA_0_TO_0_4 --output-file path/to/filled-register.csv',
        'corepack pnpm run validate:pilot-evidence -- path/to/filled-register.csv --require-95 --evidence-root path/to/redacted-artifacts',
      ].join(' && ');
    case 'Retained-artifact 95% validation':
      return 'corepack pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root path/to/redacted-artifacts';
    default:
      return 'corepack pnpm run report:buyer-evidence-readiness -- --root path/to/anonymized-outreach-or-registers --evidence-root path/to/redacted-artifacts';
  }
}

function buyerEvidenceRemediationProofType(requirement) {
  switch (requirement) {
    case 'Utility forecast lane':
      return 'forecast_trust_artifact_preparation';
    case 'TIER or credit lane':
    case 'Billing or security lane':
      return 'retained_artifact_preparation';
    case 'Distinct accepted proof packs':
      return 'buyer_acceptance_report';
    case 'Accepted confidence_delta':
    case 'Buyer data coverage':
    case 'Artifact turnaround':
      return 'register_update';
    case 'Retained SHA-256 references':
      return 'retained_artifact_and_register_update';
    case 'Strong commercial signal':
      return 'commercial_commitment_artifact';
    case 'Retained-artifact 95% validation':
      return 'retained_artifact_validation';
    default:
      return 'buyer_evidence_workflow';
  }
}

function buyerEvidenceRemediationRequiresBuyerAcceptedEvidence() {
  return true;
}

function buyerEvidenceRemediationRequiresRetainedArtifact() {
  return true;
}

function buyerEvidenceRemediationProofBoundary(requirement) {
  switch (requirement) {
    case 'Utility forecast lane':
      return 'Requires accepted buyer review plus a retained redacted forecast trust artifact; forecast demos, generated benchmarks, and repo diagnostics do not satisfy this row.';
    case 'TIER or credit lane':
      return 'Requires accepted buyer-supplied retained redacted TIER or credit evidence; scaffolding, rehearsals, and consultant assumptions do not satisfy this row.';
    case 'Billing or security lane':
      return 'Requires privacy-screened buyer-supplied retained redacted billing or security evidence accepted by the reviewer; examples and constructed security demos do not satisfy this row.';
    case 'Distinct accepted proof packs':
      return 'Requires distinct accepted proof-pack rows from real buyer evidence; duplicate rows, starter registers, and generated proof packs do not satisfy this row.';
    case 'Accepted confidence_delta':
      return 'Requires an accepted buyer evidence row with retained artifact support before confidence_delta moves; templates, no-reply outreach, not-fit rows, and constructed demos do not satisfy this row.';
    case 'Retained SHA-256 references':
      return 'Requires retained text-inspectable redacted artifacts with stable SHA-256 references; missing, changed, opaque, unredacted, or direct-identifier artifacts do not satisfy this row.';
    case 'Buyer data coverage':
      return 'Requires buyer-supplied row data coverage at threshold with retained artifact support; rows below threshold do not satisfy this row.';
    case 'Artifact turnaround':
      return 'Requires retained accepted artifact delivery inside the turnaround threshold; slow or unrecorded proof-pack delivery does not satisfy this row.';
    case 'Strong commercial signal':
      return 'Requires retained redacted signed agreement, paid pilot, invoice, PO, or LOI evidence; status-only labels, informal interest, and unretained claims do not satisfy this row.';
    case 'Retained-artifact 95% validation':
      return 'Runs validate:pilot-evidence only after accepted rows and retained artifacts exist; validation does not create buyer acceptance or commercial commitment.';
    default:
      return 'Requires retained accepted buyer evidence; generated scaffolding, outreach headers, starter registers, and constructed demos do not satisfy this row.';
  }
}

function buyerEvidenceRemediationStopGate(requirement) {
  switch (requirement) {
    case 'Utility forecast lane':
      return 'Do not count forecast demos, generated benchmark packs, or non-buyer diagnostics without accepted buyer review and retained redacted support.';
    case 'TIER or credit lane':
      return 'Do not count TIER or credit scaffolding, rehearsals, or consultant assumptions without accepted buyer-supplied retained evidence.';
    case 'Billing or security lane':
      return 'Do not count shadow-billing or security examples until buyer-supplied artifacts are accepted and privacy-screened.';
    case 'Distinct accepted proof packs':
      return 'Do not count multiple rows from the same proof pack or generated starter rows as distinct buyer acceptance.';
    case 'Accepted confidence_delta':
      return 'Do not move confidence from rehearsal rows, templates, no-reply outreach, not-fit rows, or constructed demos.';
    case 'Retained SHA-256 references':
      return 'Do not reference missing, changed, opaque, unredacted, direct-identifier, or non-text-inspectable artifacts.';
    case 'Buyer data coverage':
      return 'Do not count rows below the buyer-data coverage threshold as confidence-moving evidence.';
    case 'Artifact turnaround':
      return 'Do not hide slow proof-pack delivery; rows above 120 hours cannot support the 95% gate.';
    case 'Strong commercial signal':
      return 'Do not treat status labels, informal interest, or unretained claims as a strong commercial commitment.';
    case 'Retained-artifact 95% validation':
      return 'Do not claim 95% buyer-proven confidence until validate:pilot-evidence --require-95 passes with retained artifacts.';
    default:
      return 'Do not count generated scaffolding, outreach headers, starter registers, or constructed demos as buyer acceptance.';
  }
}

function buyerEvidenceRemediationStatus(status) {
  if (status === 'pass') return 'ready';
  return 'blocked';
}

function buyerEvidenceRemediationEvidence(queue) {
  if (queue.status === 'skipped') {
    return 'Buyer evidence remediation queue skipped by --skip-probes; run corepack pnpm run report:buyer-evidence-readiness for current buyer hard-gate actions.';
  }
  if (queue.status === 'pass') {
    return 'Buyer evidence remediation queue: status=pass open=0 approval_gate=95% validation evidence still must remain retained and current';
  }

  const topBlocked = queue.items
    .slice(0, 5)
    .map((item) => `${item.rank}:${item.requirement}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Buyer evidence remediation queue:',
    `status=${queue.status}`,
    `open=${queue.open_count ?? 'unknown'}/${queue.total_count ?? 'unknown'}`,
    `items=${queue.item_count}`,
    `top_blocked=${topBlocked}`,
    'approval_gate=queue does not contact buyers, create accepted evidence, move confidence, attach artifacts, validate 95%, or claim buyer acceptance',
  ].join(' ');
}

function buildBuyerEvidenceRemediationQueue(deficits) {
  if (deficits.status === 'skipped') {
    const queue = {
      status: 'skipped',
      open_count: null,
      total_count: null,
      item_count: 0,
      blocked_count: 0,
      items: [],
    };
    return { ...queue, evidence: buyerEvidenceRemediationEvidence(queue) };
  }

  const items = (deficits.items ?? [])
    .filter((item) => item.status !== 'pass')
    .map((item, index) => ({
      rank: index + 1,
      requirement: item.requirement,
      current: item.current,
      needed: item.needed,
      deficit_status: item.status,
      owner: buyerEvidenceRemediationOwner(item.requirement),
      action: item.next_action,
      proof_command: buyerEvidenceRemediationProofCommand(item.requirement),
      proof_type: buyerEvidenceRemediationProofType(item.requirement),
      buyer_accepted_evidence_required: buyerEvidenceRemediationRequiresBuyerAcceptedEvidence(item.requirement),
      retained_artifact_required: buyerEvidenceRemediationRequiresRetainedArtifact(item.requirement),
      proof_boundary: buyerEvidenceRemediationProofBoundary(item.requirement),
      stop_gate: buyerEvidenceRemediationStopGate(item.requirement),
      status: buyerEvidenceRemediationStatus(item.status),
    }));
  const queue = {
    status: items.length === 0 ? 'pass' : 'blocked',
    open_count: deficits.open_count,
    total_count: deficits.total_count,
    item_count: items.length,
    blocked_count: items.filter((item) => item.status !== 'ready').length,
    items,
  };
  return { ...queue, evidence: buyerEvidenceRemediationEvidence(queue) };
}

function buyerEvidenceAcquisitionProofBoundary(lane) {
  switch (lane) {
    case 'Outreach response log intake':
      return 'Requires anonymized buyer activity before intake work; response-log planning does not contact buyers, create acceptance, or prove willingness to pay.';
    case 'Production pilot evidence register':
      return 'Requires a production register outside templates, fixtures, archives, generated workspaces, and rehearsal files; starter rows do not prove buyer acceptance.';
    case 'Utility forecast lane':
      return buyerEvidenceRemediationProofBoundary('Utility forecast lane');
    case 'TIER or credit lane':
      return buyerEvidenceRemediationProofBoundary('TIER or credit lane');
    case 'Billing or security lane':
      return buyerEvidenceRemediationProofBoundary('Billing or security lane');
    case 'Distinct accepted proof packs':
      return buyerEvidenceRemediationProofBoundary('Distinct accepted proof packs');
    case 'Retained redacted artifact set':
      return buyerEvidenceRemediationProofBoundary('Retained SHA-256 references');
    case 'Confidence movement and coverage':
      return 'Requires accepted buyer-supplied rows with retained artifact support, confidence_delta, buyer_data_coverage_pct >= 70, and recorded turnaround; templates or constructed demos cannot move confidence.';
    case 'Strong commercial commitment':
      return buyerEvidenceRemediationProofBoundary('Strong commercial signal');
    case 'Retained-artifact 95% validation':
      return buyerEvidenceRemediationProofBoundary('Retained-artifact 95% validation');
    default:
      return 'Requires retained accepted buyer evidence; this acquisition matrix does not create buyer proof, commercial commitment, or 95% confidence by itself.';
  }
}

function buyerEvidenceAcquisitionStopGate(lane) {
  switch (lane) {
    case 'Outreach response log intake':
      return 'Do not contact buyers from this matrix, count no-reply or not-fit rows as proof, or create intake packets unless an actionable anonymized response row exists.';
    case 'Production pilot evidence register':
      return 'Do not count templates, fixtures, archives, generated workspaces, or starter registers as production buyer evidence.';
    case 'Utility forecast lane':
      return buyerEvidenceRemediationStopGate('Utility forecast lane');
    case 'TIER or credit lane':
      return buyerEvidenceRemediationStopGate('TIER or credit lane');
    case 'Billing or security lane':
      return buyerEvidenceRemediationStopGate('Billing or security lane');
    case 'Distinct accepted proof packs':
      return buyerEvidenceRemediationStopGate('Distinct accepted proof packs');
    case 'Retained redacted artifact set':
      return buyerEvidenceRemediationStopGate('Retained SHA-256 references');
    case 'Confidence movement and coverage':
      return 'Do not move confidence, buyer-data coverage, or turnaround fields from rehearsal rows, templates, no-reply outreach, not-fit rows, or constructed demos.';
    case 'Strong commercial commitment':
      return buyerEvidenceRemediationStopGate('Strong commercial signal');
    case 'Retained-artifact 95% validation':
      return buyerEvidenceRemediationStopGate('Retained-artifact 95% validation');
    default:
      return 'Do not claim buyer acceptance, 95% confidence, or commercial-ready status from acquisition planning alone.';
  }
}

function buyerEvidenceAcquisitionDefinitions() {
  return [
    {
      lane: 'Outreach response log intake',
      source_requirement: 'actionable outreach response',
      current_from_probe: (probe) => `${probe.actionableRows ?? 'unknown'} actionable outreach row(s); ${probe.batchableIntakeRows ?? 'unknown'} batchable intake row(s)`,
      required_artifact: 'anonymized outreach response log row with interested, requested_info, data_offered, or meeting_booked status and a valid pilot evidence register action',
      minimum_accepted_signal: 'actionable buyer response creates intake-packet or retained-artifact work; status-only outreach and no-reply rows remain non-proof',
      evidence_root: 'docs/growth production CSV roots or /tmp/ceip-phase-f-evidence/outreach',
      template_or_source_path: '/tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv',
      validation_command: 'corepack pnpm run plan:outreach-intake -- path/to/outreach-response-log.csv',
      proof_type: 'outreach_intake_acquisition',
      owner: 'buyer_operator',
    },
    {
      lane: 'Production pilot evidence register',
      source_requirement: 'production register presence',
      current_from_probe: (probe) => `${probe.productionRegisters ?? 'unknown'} production pilot evidence register(s); ${probe.starterOnlyRegisters ?? 'unknown'} starter-only register(s)`,
      required_artifact: 'production pilot evidence register outside templates, fixtures, archives, generated workspaces, and rehearsal files',
      minimum_accepted_signal: 'register contains real anonymized buyer-supplied rows before any confidence movement is counted',
      evidence_root: 'docs/growth production CSV roots',
      template_or_source_path: 'docs/growth/path-to-filled-pilot-evidence-register.csv',
      validation_command: 'corepack pnpm run report:buyer-evidence-readiness -- --root docs/growth --evidence-root path/to/redacted-artifacts',
      proof_type: 'production_register_acquisition',
      owner: 'buyer_operator',
    },
    {
      lane: 'Utility forecast lane',
      source_requirement: 'Utility forecast lane',
      required_artifact: 'accepted forecast trust artifact for /utility-demand-forecast (utility_forecast_planning_pack)',
      minimum_accepted_signal: 'buyer-supplied accepted utility forecast row with MAE, MAPE, RMSE, baselines, rolling-origin, interval coverage, and champion/challenger diagnostics',
      evidence_root: 'path/to/redacted-artifacts',
      template_or_source_path: '/tmp/ceip-phase-f-evidence/minimum-intake/utility-demand-forecast',
      validation_command: buyerEvidenceRemediationProofCommand('Utility forecast lane'),
      proof_type: 'forecast_trust_artifact_preparation',
      owner: 'buyer_operator',
    },
    {
      lane: 'TIER or credit lane',
      source_requirement: 'TIER or credit lane',
      required_artifact: 'accepted TIER CFO or credit-banking retained artifact for /roi-calculator or /credit-banking',
      minimum_accepted_signal: 'buyer-supplied accepted Alberta compliance or credit-banking row with reviewer feedback and day_14_decision=proceed',
      evidence_root: 'path/to/redacted-artifacts',
      template_or_source_path: '/tmp/ceip-phase-f-evidence/minimum-intake/roi-calculator or /tmp/ceip-phase-f-evidence/minimum-intake/credit-banking',
      validation_command: buyerEvidenceRemediationProofCommand('TIER or credit lane'),
      proof_type: 'retained_artifact_preparation',
      owner: 'buyer_operator',
    },
    {
      lane: 'Billing or security lane',
      source_requirement: 'Billing or security lane',
      required_artifact: 'accepted shadow-billing or utility-security retained artifact for /shadow-billing or /utility-security',
      minimum_accepted_signal: 'buyer-supplied accepted billing or security procurement row with privacy screen, reviewer feedback, and day_14_decision=proceed',
      evidence_root: 'path/to/redacted-artifacts',
      template_or_source_path: '/tmp/ceip-phase-f-evidence/minimum-intake/utility-security or /tmp/ceip-phase-f-evidence/minimum-intake/shadow-billing',
      validation_command: buyerEvidenceRemediationProofCommand('Billing or security lane'),
      proof_type: 'retained_artifact_preparation',
      owner: 'buyer_operator',
    },
    {
      lane: 'Distinct accepted proof packs',
      source_requirement: 'Distinct accepted proof packs',
      required_artifact: 'at least three distinct accepted buyer-supplied proof_pack_id values with day_14_decision=proceed',
      minimum_accepted_signal: 'accepted utility forecast plus finance/compliance plus billing/security proof packs from real buyer evidence',
      evidence_root: 'path/to/redacted-artifacts',
      template_or_source_path: 'path/to/filled-pilot-evidence-register.csv',
      validation_command: buyerEvidenceRemediationProofCommand('Distinct accepted proof packs'),
      proof_type: 'buyer_acceptance_report',
      owner: 'buyer_operator',
    },
    {
      lane: 'Retained redacted artifact set',
      source_requirement: 'Retained SHA-256 references',
      required_artifact: 'text-inspectable retained redacted artifacts with stable sha256 references for every accepted confidence-moving row',
      minimum_accepted_signal: 'each accepted row references a retained artifact that supports the row fields without direct identifiers',
      evidence_root: 'path/to/redacted-artifacts',
      template_or_source_path: 'path/to/redacted-artifacts/*.md',
      validation_command: buyerEvidenceRemediationProofCommand('Retained SHA-256 references'),
      proof_type: 'retained_artifact_and_register_update',
      owner: 'evidence_operator',
    },
    {
      lane: 'Confidence movement and coverage',
      source_requirement: 'Accepted confidence_delta',
      required_artifact: 'accepted buyer rows with confidence_delta, buyer_data_coverage_pct >= 70, and time_to_artifact_hours recorded',
      minimum_accepted_signal: 'total accepted confidence_delta >= 0.9, every accepted row covers buyer data at threshold, every accepted row is <=120h, and at least one accepted row is <=48h',
      evidence_root: 'path/to/redacted-artifacts',
      template_or_source_path: 'path/to/filled-pilot-evidence-register.csv',
      validation_command: 'corepack pnpm run update:pilot-evidence-register-row -- --register-file path/to/register.csv --evidence-root path/to/redacted-artifacts --evidence-file-reference redacted-artifact.md#sha256=REPLACE_WITH_HASH_FROM_HELPER --confidence-delta REPLACE_WITH_CONFIDENCE_DELTA_0_TO_0_4 --buyer-data-coverage-pct REPLACE_WITH_BUYER_DATA_COVERAGE_PCT_70_TO_100 --time-to-artifact-hours REPLACE_WITH_TIME_TO_ARTIFACT_HOURS_0_TO_120 --output-file path/to/filled-register.csv',
      proof_type: 'register_update',
      owner: 'buyer_operator',
    },
    {
      lane: 'Strong commercial commitment',
      source_requirement: 'Strong commercial signal',
      required_artifact: 'retained redacted signed agreement, paid pilot, invoice, purchase order, or letter of intent evidence',
      minimum_accepted_signal: 'non-status-only commercial commitment attached to an accepted buyer row and retained artifact',
      evidence_root: 'path/to/redacted-artifacts',
      template_or_source_path: 'path/to/redacted-artifacts/commercial-commitment.md',
      validation_command: buyerEvidenceRemediationProofCommand('Strong commercial signal'),
      proof_type: 'commercial_commitment_artifact',
      owner: 'commercial_owner',
    },
    {
      lane: 'Retained-artifact 95% validation',
      source_requirement: 'Retained-artifact 95% validation',
      required_artifact: 'filled pilot evidence register plus retained redacted artifact root',
      minimum_accepted_signal: 'validate:pilot-evidence --require-95 passes with accepted rows, retained artifacts, strong commercial signal, and hard-gate coverage',
      evidence_root: 'path/to/redacted-artifacts',
      template_or_source_path: 'path/to/filled-pilot-evidence-register.csv',
      validation_command: buyerEvidenceRemediationProofCommand('Retained-artifact 95% validation'),
      proof_type: 'retained_artifact_validation',
      owner: 'evidence_operator',
    },
  ];
}

function buyerEvidenceAcquisitionStatus(definition, probe, deficitsByRequirement) {
  if (definition.source_requirement === 'actionable outreach response') {
    return Number.isInteger(probe.actionableRows) && probe.actionableRows > 0 ? 'ready' : 'blocked';
  }
  if (definition.source_requirement === 'production register presence') {
    const productionRegisters = probe.productionRegisters;
    const starterOnlyRegisters = probe.starterOnlyRegisters;
    const nonStarterRegisters = Number.isInteger(productionRegisters) && Number.isInteger(starterOnlyRegisters)
      ? productionRegisters - starterOnlyRegisters
      : null;
    return Number.isInteger(nonStarterRegisters) && nonStarterRegisters > 0 ? 'ready' : 'blocked';
  }
  const deficit = deficitsByRequirement.get(definition.source_requirement);
  return deficit?.status === 'pass' ? 'ready' : 'blocked';
}

function buyerEvidenceAcquisitionEvidence(matrix) {
  const topBlocked = matrix.rows
    .filter((item) => item.status !== 'ready')
    .slice(0, 5)
    .map((item) => `${item.rank}:${item.lane}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Buyer evidence acquisition matrix:',
    `status=${matrix.status}`,
    `rows=${matrix.row_count}`,
    `blocked=${matrix.blocked_count}`,
    `source_deficits=${matrix.source_deficit_status}`,
    `top_blocked=${topBlocked}`,
    'approval_gate=matrix does not contact buyers, create accepted evidence, move confidence, attach artifacts, validate 95%, or claim buyer acceptance',
  ].join(' ');
}

function buildBuyerEvidenceAcquisitionMatrix(probe) {
  const deficits = probe.hardGateDeficits ?? {};
  const deficitsByRequirement = new Map((deficits.items ?? []).map((item) => [item.requirement, item]));
  const rows = buyerEvidenceAcquisitionDefinitions().map((definition, index) => {
    const sourceDeficit = deficitsByRequirement.get(definition.source_requirement);
    const status = buyerEvidenceAcquisitionStatus(definition, probe, deficitsByRequirement);
    return {
      rank: index + 1,
      lane: definition.lane,
      source_requirement: definition.source_requirement,
      current: sourceDeficit?.current ?? definition.current_from_probe?.(probe) ?? `${deficits.status ?? 'unknown'} source deficit state`,
      required_artifact: definition.required_artifact,
      minimum_accepted_signal: definition.minimum_accepted_signal,
      evidence_root: definition.evidence_root,
      template_or_source_path: definition.template_or_source_path,
      validation_command: definition.validation_command,
      proof_type: definition.proof_type,
      proof_boundary: buyerEvidenceAcquisitionProofBoundary(definition.lane),
      stop_gate: buyerEvidenceAcquisitionStopGate(definition.lane),
      owner: definition.owner,
      status,
      blocks_buyer_gate: status !== 'ready',
    };
  });
  const matrix = {
    status: rows.every((item) => item.status === 'ready') ? 'ready' : 'blocked',
    proof_type: 'buyer_evidence_acquisition_matrix',
    source_deficit_status: deficits.status ?? 'unknown',
    row_count: rows.length,
    blocked_count: rows.filter((item) => item.status !== 'ready').length,
    proof_boundary: 'This matrix is acquisition planning and validation routing only; it does not contact buyers, create accepted evidence, move confidence, attach artifacts, validate 95%, or claim buyer acceptance.',
    stop_gate: 'Do not mark buyer evidence ready until production registers, retained redacted artifacts, strong commercial evidence, and validate:pilot-evidence --require-95 all pass with real anonymized buyer rows.',
    rows,
  };
  return { ...matrix, evidence: buyerEvidenceAcquisitionEvidence(matrix) };
}

function extractMarkdownSection(markdown, heading) {
  const start = markdown.indexOf(`## ${heading}`);
  if (start < 0) return '';
  const next = markdown.indexOf('\n## ', start + 1);
  return markdown.slice(start, next < 0 ? markdown.length : next);
}

function parseBuyerDeficitRows(markdown) {
  const section = extractMarkdownSection(markdown, 'Hard 95% Gate Deficit Ledger');
  if (!section) {
    return {
      status: 'missing',
      open_count: null,
      total_count: null,
      evidence: 'Buyer hard-gate deficit ledger missing from report:buyer-evidence-readiness output.',
      items: [],
    };
  }

  const countMatch = section.match(/Open hard-gate deficits:\s*(\d+)\/(\d+)/);
  const items = section
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| '))
    .filter((line) => !line.startsWith('| Requirement |') && !line.startsWith('|---'))
    .map((line) => line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 5)
    .map(([requirement, current, needed, status, nextAction]) => ({
      requirement,
      current,
      needed,
      status,
      next_action: nextAction,
      proof_type: buyerEvidenceRemediationProofType(requirement),
      buyer_accepted_evidence_required: buyerEvidenceRemediationRequiresBuyerAcceptedEvidence(requirement),
      retained_artifact_required: buyerEvidenceRemediationRequiresRetainedArtifact(requirement),
      proof_boundary: buyerEvidenceRemediationProofBoundary(requirement),
      stop_gate: buyerEvidenceRemediationStopGate(requirement),
    }));

  const openCount = countMatch ? Number.parseInt(countMatch[1], 10) : items.filter((item) => item.status !== 'pass').length;
  const totalCount = countMatch ? Number.parseInt(countMatch[2], 10) : items.length;
  const deficits = {
    status: openCount === 0 ? 'pass' : 'blocked',
    open_count: openCount,
    total_count: totalCount,
    items,
  };
  return { ...deficits, evidence: buyerDeficitEvidence(deficits) };
}

function parseBranchFreshnessRows(markdown) {
  const section = extractMarkdownSection(markdown, 'Branch Freshness Review');
  if (!section) return [];

  return section
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| '))
    .filter((line) => !line.startsWith('| Branch |') && !line.startsWith('|---'))
    .map((line) => line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 7)
    .map(([branch, scope, risk, latestCommitDate, age, freshness, action]) => ({
      branch,
      scope,
      risk,
      latestCommitDate,
      age,
      freshness,
      action,
    }));
}

function parseBranchFamilyRows(markdown) {
  const section = extractMarkdownSection(markdown, 'Local/Origin Branch Families');
  if (!section) return [];

  return section
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| '))
    .filter((line) => !line.startsWith('| Family |') && !line.startsWith('|---'))
    .map((line) => line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 5)
    .map(([family, refs, highestRisk, localOriginState, reviewAction]) => ({
      family,
      refs,
      highestRisk,
      localOriginState,
      reviewAction,
    }));
}

function familyStateKey(localOriginState) {
  const state = String(localOriginState ?? '').toLowerCase();
  if (state.includes('local-only')) return 'local_only';
  if (state.includes('origin-only')) return 'origin_only';
  if (state.includes('heads match')) return 'matching_heads';
  if (state.includes('local ahead')) return 'local_ahead';
  if (state.includes('origin ahead')) return 'origin_ahead';
  if (state.includes('diverged')) return 'diverged';
  return 'unknown';
}

function countFamilyRows(rows, key, risk = '') {
  return rows.filter((row) => (
    familyStateKey(row.localOriginState) === key
    && (!risk || row.highestRisk === risk)
  )).length;
}

function branchFamilyEvidence(rows) {
  if (rows.length === 0) {
    return 'Branch family review: no local/origin family rows were parsed from the branch readiness report.';
  }

  const highRiskFamilies = rows
    .filter((row) => row.highestRisk === 'high')
    .map((row) => row.family)
    .slice(0, 6);

  return [
    'Branch family review:',
    `families=${rows.length}`,
    `local_only=${countFamilyRows(rows, 'local_only')}`,
    `origin_only=${countFamilyRows(rows, 'origin_only')}`,
    `matching_heads=${countFamilyRows(rows, 'matching_heads')}`,
    `local_ahead=${countFamilyRows(rows, 'local_ahead')}`,
    `origin_ahead=${countFamilyRows(rows, 'origin_ahead')}`,
    `diverged=${countFamilyRows(rows, 'diverged')}`,
    `unknown=${countFamilyRows(rows, 'unknown')}`,
    `high_risk_families=${rows.filter((row) => row.highestRisk === 'high').length}`,
    highRiskFamilies.length > 0 ? `high_family_refs=${highRiskFamilies.join(', ')}` : 'high_family_refs=none',
  ].join(' ');
}

function countFreshnessRows(rows, freshness, risk = '') {
  return rows.filter((row) => (
    row.freshness === freshness
    && (!risk || row.risk === risk)
  )).length;
}

function parsePorcelainStatusLine(line) {
  const statusCode = line.slice(0, 2);
  const rawPath = line.slice(3).trim();
  const renameParts = rawPath.includes(' -> ') ? rawPath.split(' -> ').map((item) => item.trim()) : [];
  const filePath = renameParts.length > 0 ? renameParts.at(-1) : rawPath;
  const oldPath = renameParts.length > 1 ? renameParts[0] : null;
  return { statusCode, rawPath, filePath, oldPath };
}

function statusLabel(statusCode) {
  if (statusCode === '??') return 'untracked';
  if (statusCode === '!!') return 'ignored';
  if (statusCode.includes('D')) return 'deleted';
  if (statusCode.includes('R')) return 'renamed';
  if (statusCode.includes('A')) return 'added';
  if (statusCode.includes('M')) return 'modified';
  return statusCode.trim() || 'changed';
}

function statusSlotLabel(code) {
  return {
    ' ': 'clean',
    M: 'modified',
    A: 'added',
    D: 'deleted',
    R: 'renamed',
    C: 'copied',
    U: 'unmerged',
    T: 'type_changed',
    '?': 'untracked',
    '!': 'ignored',
  }[code] ?? (code || 'unknown');
}

function stagingStateForStatus(statusCode) {
  if (statusCode === '??') {
    return { indexStatus: 'untracked', worktreeStatus: 'untracked', stagingState: 'untracked' };
  }
  if (statusCode === '!!') {
    return { indexStatus: 'ignored', worktreeStatus: 'ignored', stagingState: 'ignored' };
  }

  const indexStatus = statusSlotLabel(statusCode[0] ?? ' ');
  const worktreeStatus = statusSlotLabel(statusCode[1] ?? ' ');
  const staged = indexStatus !== 'clean';
  const unstaged = worktreeStatus !== 'clean';
  return {
    indexStatus,
    worktreeStatus,
    stagingState: staged && unstaged
      ? 'staged_and_unstaged'
      : staged
        ? 'staged_only'
        : unstaged
          ? 'unstaged_only'
          : 'clean',
  };
}

function dirtyPathAction({ tracked, ignoredByRule, stagingState }) {
  if (tracked && ignoredByRule) {
    return 'tracked generated-or-local artifact; unstage, restore, or intentionally remove from index before deploy';
  }
  if (!tracked && ignoredByRule) {
    return 'ignored local artifact; remove local copy before deploy if it appears in status';
  }
  if (!tracked) {
    return 'untracked non-ignored path; move outside repo, add an intentional ignore rule, or commit only if source evidence';
  }
  if (stagingState === 'staged_only') {
    return 'staged source change; commit, unstage, stash, or revert before deploy';
  }
  if (stagingState === 'unstaged_only') {
    return 'unstaged source change; commit, stash, or revert before deploy';
  }
  if (stagingState === 'staged_and_unstaged') {
    return 'staged and unstaged source changes; resolve both index and worktree before deploy';
  }
  return 'tracked source change; commit, stash, or revert before deploy';
}

function classifyDirtyPath(statusLine) {
  const { statusCode, rawPath, filePath, oldPath } = parsePorcelainStatusLine(statusLine);
  const tracked = gitPathCheck(['ls-files', '--error-unmatch', '--', filePath]);
  const ignoredByRule = gitPathCheck(['check-ignore', '--no-index', '-q', '--', filePath]);
  const { indexStatus, worktreeStatus, stagingState } = stagingStateForStatus(statusCode);
  const detail = {
    raw: statusLine,
    raw_path: rawPath,
    file_path: filePath,
    old_path: oldPath,
    status: statusLabel(statusCode),
    index_status: indexStatus,
    worktree_status: worktreeStatus,
    staging_state: stagingState,
    tracked,
    ignored_by_rule: ignoredByRule,
    action: dirtyPathAction({ tracked, ignoredByRule, stagingState }),
  };
  return {
    ...detail,
    proof_type: sourceResolutionProofType(detail),
    owner_decision_required: true,
    proof_boundary: dirtyPathProofBoundary(detail),
    stop_gate: dirtyPathStopGate(detail),
  };
}

function sourcePathDisplay(detail) {
  if (!detail) return 'unknown';
  if (detail.old_path) return `${detail.old_path} -> ${detail.file_path ?? 'unknown'}`;
  return detail.file_path ?? 'unknown';
}

function sourceDecisionLabel(detail) {
  if (!detail) return 'unknown source-provenance decision';
  const status = detail.source_status ?? detail.status ?? 'changed';
  const proofType = detail.proof_type ?? sourceResolutionProofType(detail);
  const stagingState = detail.staging_state ?? 'unknown';
  return `${status} ${sourcePathDisplay(detail)} (${proofType}; ${stagingState})`;
}

function sourceDecisionSummary(details, dirtyPathCount) {
  const count = Number.isInteger(dirtyPathCount) ? dirtyPathCount : details?.length;
  if (!count || count <= 0) return 'clean worktree';
  return `${count} dirty path(s); first=${sourceDecisionLabel(details?.[0])}`;
}

function sourceProvenanceEvidence(status) {
  const summary = [
    'Source provenance:',
    `branch=${status.branch}`,
    `commit=${status.commit}`,
    `worktree=${status.isDirty ? 'dirty' : 'clean'}`,
    `dirty_paths=${status.dirtyLines.length}`,
  ];

  if (status.dirtyDetails.length === 0) return summary.join(' ');

  return [
    ...summary,
    'dirty_details=',
    status.dirtyDetails.map((detail) => [
      `${detail.file_path}`,
      `status=${detail.status}`,
      `index_status=${detail.index_status}`,
      `worktree_status=${detail.worktree_status}`,
      `staging_state=${detail.staging_state}`,
      detail.old_path ? `old_path=${detail.old_path}` : null,
      `tracked=${detail.tracked ? 'yes' : 'no'}`,
      `ignored_by_rule=${detail.ignored_by_rule ? 'yes' : 'no'}`,
      `action=${detail.action}`,
    ].filter(Boolean).join(' | ')).join('; '),
  ].join(' ');
}

function sourceResolutionDecision(detail) {
  if (!detail.tracked && detail.ignored_by_rule) {
    return 'Confirm this ignored local artifact should remain outside launch evidence; remove local copy before deploy only with owner intent.';
  }
  if (!detail.tracked) {
    return 'Decide whether this untracked non-ignored path is source evidence to commit, a local artifact to move out of repo, or a path needing an ignore rule.';
  }
  if (detail.staging_state === 'staged_only') {
    return 'Decide whether the staged source change should be committed as intentional launch evidence, unstaged for later review, stashed, or reverted by the owner.';
  }
  if (detail.staging_state === 'unstaged_only') {
    return 'Decide whether the unstaged source change should be committed, stashed, or reverted by the owner.';
  }
  if (detail.staging_state === 'staged_and_unstaged') {
    return 'Decide separately on the index and worktree versions before any deploy approval request.';
  }
  return 'Decide whether this tracked source change should be committed, stashed, or reverted by the owner.';
}

function sourceResolutionStopGate(detail) {
  const verbs = detail.tracked
    ? 'commit, unstage, stash, revert, delete, rename, or move'
    : 'add, ignore, delete, move, or commit';
  return `Do not ${verbs} this path without explicit owner intent; this queue is a decision aid only.`;
}

function sourceResolutionProofType(detail) {
  if (detail.old_path) return 'source_rename_decision';
  if (!detail.tracked && detail.ignored_by_rule) return 'ignored_local_artifact_decision';
  if (!detail.tracked) return 'untracked_source_decision';
  if (detail.staging_state === 'staged_only') return 'staged_source_decision';
  if (detail.staging_state === 'unstaged_only') return 'unstaged_source_decision';
  if (detail.staging_state === 'staged_and_unstaged') return 'split_index_worktree_decision';
  return 'tracked_source_decision';
}

function sourceResolutionProofBoundary(detail) {
  if (detail.old_path) {
    return 'Requires explicit owner decision for the staged rename or move; this queue row does not rename, move, commit, unstage, stash, revert, delete, clear provenance, deploy, or grant approval.';
  }
  if (!detail.tracked && detail.ignored_by_rule) {
    return 'Requires owner confirmation that an ignored local artifact remains outside launch evidence; this queue row does not delete, move, commit, clear provenance, deploy, or grant approval.';
  }
  if (!detail.tracked) {
    return 'Requires owner decision whether the untracked path is launch evidence, a local artifact, or should be ignored; this queue row does not add, ignore, move, delete, commit, clear provenance, deploy, or grant approval.';
  }
  if (detail.staging_state === 'staged_only') {
    return 'Requires owner decision for the staged source change; this queue row does not commit, unstage, stash, revert, delete, clear provenance, deploy, or grant approval.';
  }
  if (detail.staging_state === 'unstaged_only') {
    return 'Requires owner decision for the unstaged source change; this queue row does not commit, stash, revert, delete, clear provenance, deploy, or grant approval.';
  }
  if (detail.staging_state === 'staged_and_unstaged') {
    return 'Requires separate owner decisions for index and worktree versions; this queue row does not commit, unstage, stash, revert, delete, clear provenance, deploy, or grant approval.';
  }
  return 'Requires explicit owner decision for the tracked source change; this queue row does not mutate source, clear provenance, deploy, or grant approval.';
}

function dirtyPathProofBoundary(detail) {
  if (detail.old_path) {
    return 'Raw source-provenance classification for a staged rename or move; it does not rename, move, commit, unstage, stash, revert, delete, clear provenance, deploy, or grant approval.';
  }
  if (!detail.tracked && detail.ignored_by_rule) {
    return 'Raw source-provenance classification for an ignored local artifact; it does not delete, move, commit, clear provenance, deploy, or grant approval.';
  }
  if (!detail.tracked) {
    return 'Raw source-provenance classification for an untracked path; it does not add, ignore, move, delete, commit, clear provenance, deploy, or grant approval.';
  }
  if (detail.staging_state === 'staged_only') {
    return 'Raw source-provenance classification for a staged source change; it does not commit, unstage, stash, revert, delete, clear provenance, deploy, or grant approval.';
  }
  if (detail.staging_state === 'unstaged_only') {
    return 'Raw source-provenance classification for an unstaged source change; it does not commit, stash, revert, delete, clear provenance, deploy, or grant approval.';
  }
  if (detail.staging_state === 'staged_and_unstaged') {
    return 'Raw source-provenance classification for split index and worktree changes; it does not commit, unstage, stash, revert, delete, clear provenance, deploy, or grant approval.';
  }
  return 'Raw source-provenance classification for a tracked source change; it does not mutate source, clear provenance, deploy, or grant approval.';
}

function dirtyPathStopGate(detail) {
  const verbs = detail.tracked
    ? 'commit, unstage, stash, revert, delete, rename, or move'
    : 'add, ignore, delete, move, or commit';
  return `Do not ${verbs} this path without explicit owner intent; raw dirty-path detail is classification evidence only, not source-provenance clearance or production approval.`;
}

function sourceProvenanceResolutionEvidence(queue) {
  if (queue.status === 'pass') {
    return 'Source provenance resolution queue: status=pass dirty_paths=0 owner_decisions=0 approval_gate=owner approval and release gates still apply before deploy';
  }

  const topBlocked = queue.items
    .slice(0, 5)
    .map((item) => `${sourceDecisionLabel(item)}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Source provenance resolution queue:',
    `status=${queue.status}`,
    `dirty_paths=${queue.dirty_path_count}`,
    `owner_decisions=${queue.blocked_count}`,
    `top_blocked=${topBlocked}`,
    'approval_gate=no commit/unstage/stash/revert/delete/rename/move without explicit owner intent; no deploy request until clean worktree',
  ].join(' ');
}

function buildSourceProvenanceResolutionQueue(status) {
  const items = status.dirtyDetails.map((detail, index) => ({
    rank: index + 1,
    file_path: detail.file_path,
    old_path: detail.old_path,
    source_status: detail.status,
    index_status: detail.index_status,
    worktree_status: detail.worktree_status,
    staging_state: detail.staging_state,
    tracked: detail.tracked,
    ignored_by_rule: detail.ignored_by_rule,
    decision_required: sourceResolutionDecision(detail),
    proof_command: SOURCE_PROVENANCE_FOCUSED_PROOF_COMMAND,
    proof_type: sourceResolutionProofType(detail),
    owner_decision_required: true,
    proof_boundary: sourceResolutionProofBoundary(detail),
    stop_gate: sourceResolutionStopGate(detail),
    status: 'blocked',
  }));
  const queue = {
    status: status.isDirty ? 'blocked' : 'pass',
    dirty_path_count: status.dirtyLines.length,
    item_count: items.length,
    blocked_count: items.length,
    items,
  };
  return { ...queue, evidence: sourceProvenanceResolutionEvidence(queue) };
}

function sourceProvenanceIsolationReleaseImpact(detail) {
  if (!detail) {
    return 'no dirty source path blocks release provenance at manifest generation time';
  }
  if (detail.old_path) {
    return 'staged rename or move blocks clean source provenance until the owner decides whether it should be committed, unstaged, or otherwise resolved';
  }
  if (!detail.tracked && detail.ignored_by_rule) {
    return 'ignored local artifact does not enter source by default, but must remain outside launch evidence unless owner decides otherwise';
  }
  if (!detail.tracked) {
    return 'untracked non-ignored path blocks clean source provenance until the owner decides whether it is source evidence, a local artifact, or ignore-rule material';
  }
  if (detail.staging_state === 'staged_only') {
    return 'staged source change blocks clean source provenance until owner commit, unstage, stash, or revert decision is made';
  }
  if (detail.staging_state === 'unstaged_only') {
    return 'unstaged source change blocks clean source provenance until owner commit, stash, or revert decision is made';
  }
  if (detail.staging_state === 'staged_and_unstaged') {
    return 'split index/worktree source change blocks clean source provenance until separate owner decisions are made for both versions';
  }
  return 'tracked source change blocks clean source provenance until owner resolution is complete';
}

function sourceProvenanceIsolationEvidence(ledger) {
  if (ledger.status === 'pass') {
    return 'Source provenance isolation ledger: status=pass dirty_paths=0 release_blocking_paths=0 approval_gate=clean source still requires release-readiness and owner approval before deploy';
  }

  const topBlocking = ledger.rows
    .slice(0, 5)
    .map((item) => `${sourceDecisionLabel(item)}:${item.isolation_status}`)
    .join(', ') || 'none';

  return [
    'Source provenance isolation ledger:',
    `status=${ledger.status}`,
    `dirty_paths=${ledger.dirty_path_count}`,
    `release_blocking_paths=${ledger.release_blocking_path_count}`,
    `rename_or_move=${ledger.rename_or_move_count}`,
    `staged_only=${ledger.staged_only_count}`,
    `unstaged_only=${ledger.unstaged_only_count}`,
    `untracked=${ledger.untracked_count}`,
    `ignored_local=${ledger.ignored_local_count}`,
    `top_blocking=${topBlocking}`,
    'approval_gate=ledger proves classification only; it does not commit, unstage, stash, revert, delete, rename, move, clear source provenance, run release-readiness, deploy, or grant approval',
  ].join(' ');
}

function buildSourceProvenanceIsolationLedger(status) {
  const rows = status.dirtyDetails.map((detail, index) => ({
    rank: index + 1,
    file_path: detail.file_path,
    old_path: detail.old_path,
    source_status: detail.status,
    staging_state: detail.staging_state,
    index_status: detail.index_status,
    worktree_status: detail.worktree_status,
    tracked: detail.tracked,
    ignored_by_rule: detail.ignored_by_rule,
    release_impact: sourceProvenanceIsolationReleaseImpact(detail),
    isolation_status: 'owner_decision_required',
    proof_command: `git status --porcelain=v1 && ${SOURCE_PROVENANCE_FOCUSED_PROOF_COMMAND}`,
    proof_type: sourceResolutionProofType(detail),
    proof_boundary: `${sourceResolutionProofBoundary(detail)} This isolation row is release-impact classification only; it does not clear source provenance or prove release-readiness.`,
    stop_gate: `${sourceResolutionStopGate(detail)} Do not treat this isolation ledger as clean-source, release-readiness, deploy, or production approval evidence.`,
    blocks_release_source_gate: true,
  }));
  const ledger = {
    status: status.isDirty ? 'blocked' : 'pass',
    proof_type: 'source_provenance_isolation_ledger',
    dirty_path_count: status.dirtyLines.length,
    release_blocking_path_count: rows.filter((item) => item.blocks_release_source_gate).length,
    owner_decision_count: rows.length,
    rename_or_move_count: rows.filter((item) => item.old_path).length,
    staged_only_count: rows.filter((item) => item.staging_state === 'staged_only').length,
    unstaged_only_count: rows.filter((item) => item.staging_state === 'unstaged_only').length,
    staged_and_unstaged_count: rows.filter((item) => item.staging_state === 'staged_and_unstaged').length,
    untracked_count: rows.filter((item) => !item.tracked && !item.ignored_by_rule).length,
    ignored_local_count: rows.filter((item) => !item.tracked && item.ignored_by_rule).length,
    proof_boundary: 'This ledger isolates current dirty-source release impact only; it does not mutate source, clear provenance, run release-readiness, deploy, or grant production approval.',
    stop_gate: 'Do not request deploy approval, run release-readiness as release evidence, or claim clean source provenance until every release-blocking path is intentionally resolved by the owner.',
    rows,
  };
  return { ...ledger, evidence: sourceProvenanceIsolationEvidence(ledger) };
}

function branchFreshnessEvidence(rows) {
  if (rows.length === 0) {
    return 'Branch freshness review: no freshness rows were parsed from the branch readiness report.';
  }

  const staleBranches = rows
    .filter((row) => row.freshness === 'stale')
    .map((row) => row.branch)
    .slice(0, 6);
  const agingBranches = rows
    .filter((row) => row.freshness === 'aging')
    .map((row) => row.branch)
    .slice(0, 6);

  return [
    'Branch freshness review:',
    `stale=${countFreshnessRows(rows, 'stale')}`,
    `aging=${countFreshnessRows(rows, 'aging')}`,
    `fresh=${countFreshnessRows(rows, 'fresh')}`,
    `unknown=${countFreshnessRows(rows, 'unknown')}`,
    `stale_high=${countFreshnessRows(rows, 'stale', 'high')}`,
    `aging_high=${countFreshnessRows(rows, 'aging', 'high')}`,
    staleBranches.length > 0 ? `stale_refs=${staleBranches.join(', ')}` : 'stale_refs=none',
    agingBranches.length > 0 ? `aging_refs=${agingBranches.join(', ')}` : 'aging_refs=none',
  ].join(' ');
}

function refNamesFromFamilyRefs(refs) {
  return String(refs ?? '')
    .split(',')
    .map((value) => value.trim())
    .map((value) => {
      const match = value.match(/^(?:local|remote):(.+?)@/);
      return match?.[1] ?? '';
    })
    .filter(Boolean);
}

function canonicalBranchName(refName) {
  return String(refName ?? '').startsWith('origin/')
    ? String(refName).slice('origin/'.length)
    : String(refName ?? '');
}

function queueRiskRank(risk) {
  return { high: 0, medium: 1, low: 2 }[risk] ?? 3;
}

function queueFreshnessRank(freshness) {
  return { stale: 0, aging: 1, unknown: 2, fresh: 3 }[freshness] ?? 4;
}

function queueStateRank(localOriginState) {
  const key = familyStateKey(localOriginState);
  return {
    diverged: 0,
    local_ahead: 1,
    origin_ahead: 1,
    local_only: 2,
    origin_only: 2,
    unknown: 3,
    matching_heads: 4,
  }[key] ?? 5;
}

function worstFreshnessForFamily(family, freshnessRows) {
  const matches = freshnessRows
    .filter((row) => canonicalBranchName(row.branch) === family)
    .sort((a, b) => {
      const freshnessDelta = queueFreshnessRank(a.freshness) - queueFreshnessRank(b.freshness);
      if (freshnessDelta !== 0) return freshnessDelta;
      const riskDelta = queueRiskRank(a.risk) - queueRiskRank(b.risk);
      if (riskDelta !== 0) return riskDelta;
      return a.branch.localeCompare(b.branch);
    });

  return matches[0] ?? {
    branch: family,
    scope: 'unknown',
    risk: 'unknown',
    latestCommitDate: 'unknown',
    age: 'unknown',
    freshness: 'unknown',
    action: 'refresh branch metadata before review',
  };
}

function reviewCommandForFamily(familyRow) {
  const preferredRef = reviewRefForFamily(familyRow);
  return `corepack pnpm run report:unmerged-branch-readiness -- --branch ${preferredRef} --max-files 8`;
}

function reviewRefForFamily(familyRow) {
  const refs = refsForFamily(familyRow);
  return refs.local_ref || refs.origin_ref || refs.family_refs[0] || familyRow.family;
}

function refsForFamily(familyRow) {
  const refs = refNamesFromFamilyRefs(familyRow.refs);
  return {
    family_refs: refs,
    local_ref: refs.find((ref) => !ref.startsWith('origin/')) ?? null,
    origin_ref: refs.find((ref) => ref.startsWith('origin/')) ?? null,
  };
}

function priorityForBranchFamily(familyRow, freshness) {
  const stateKey = familyStateKey(familyRow.localOriginState);
  const isSplitOrSingleSided = stateKey !== 'matching_heads';
  if (familyRow.highestRisk === 'high' && freshness.freshness === 'stale') return 'review_first_high_stale';
  if (familyRow.highestRisk === 'high' && freshness.freshness === 'aging') return 'review_first_high_aging';
  if (familyRow.highestRisk === 'high' && isSplitOrSingleSided) return 'review_first_high_split';
  if (familyRow.highestRisk === 'high') return 'high_risk_review';
  if (freshness.freshness === 'stale' || freshness.freshness === 'aging') return 'drift_review';
  if (isSplitOrSingleSided) return 'canonical_head_review';
  return 'standard_review';
}

function reasonForBranchFamily(familyRow, freshness) {
  const reasons = [];
  if (familyRow.highestRisk === 'high') reasons.push('high-risk launch surface');
  if (familyRow.highestRisk === 'medium') reasons.push('medium-risk buyer-visible or source surface');
  if (familyStateKey(familyRow.localOriginState) !== 'matching_heads') reasons.push(familyRow.localOriginState);
  if (['stale', 'aging', 'unknown'].includes(freshness.freshness)) {
    reasons.push(`${freshness.freshness} commit freshness (${freshness.age})`);
  }
  return reasons.length > 0 ? reasons.join('; ') : 'normal branch review queue item';
}

function branchReviewQueueProofType(item) {
  if (item.highest_risk === 'high') return 'high_risk_read_only_branch_review';
  if (item.priority?.startsWith('review_first')) return 'read_only_branch_review';
  if (familyStateKey(item.local_origin_state) !== 'matching_heads') return 'canonical_head_read_only_branch_review';
  return 'branch_review_backlog';
}

function branchReviewQueueProofBoundary() {
  return 'Focused branch report is read-only review evidence for this branch family; it does not checkout, merge, push, discard, migrate, deploy, grant production approval, or resolve canonical head ownership.';
}

function branchReviewQueueForProbe(probe) {
  if (probe.status === 'skipped') {
    return {
      status: 'skipped',
      item_count: null,
      review_first_count: null,
      blocked_count: null,
      evidence: 'Branch review queue skipped by --skip-probes; run corepack pnpm run report:unmerged-branch-readiness for the current review order.',
      items: [],
    };
  }

  const familyRows = Array.isArray(probe.familyRows) ? probe.familyRows : [];
  const freshnessRows = Array.isArray(probe.freshnessRows) ? probe.freshnessRows : [];
  const items = familyRows
    .map((familyRow) => {
      const freshness = worstFreshnessForFamily(familyRow.family, freshnessRows);
      const refs = refsForFamily(familyRow);
      const item = {
        family: familyRow.family,
        family_refs: refs.family_refs,
        local_ref: refs.local_ref,
        origin_ref: refs.origin_ref,
        review_ref: reviewRefForFamily(familyRow),
        priority: priorityForBranchFamily(familyRow, freshness),
        highest_risk: familyRow.highestRisk,
        local_origin_state: familyRow.localOriginState,
        freshness: freshness.freshness,
        age: freshness.age,
        freshness_ref: freshness.branch,
        reason: reasonForBranchFamily(familyRow, freshness),
        review_command: reviewCommandForFamily(familyRow),
        review_action: familyRow.reviewAction,
        stop_gate: 'Read-only focused review first; no checkout, merge, deploy, migration, push, or production approval without explicit owner approval and release gates.',
      };
      return {
        ...item,
        proof_type: branchReviewQueueProofType(item),
        read_only: true,
        proof_boundary: branchReviewQueueProofBoundary(),
      };
    })
    .sort((a, b) => {
      const riskDelta = queueRiskRank(a.highest_risk) - queueRiskRank(b.highest_risk);
      if (riskDelta !== 0) return riskDelta;
      const freshnessDelta = queueFreshnessRank(a.freshness) - queueFreshnessRank(b.freshness);
      if (freshnessDelta !== 0) return freshnessDelta;
      const stateDelta = queueStateRank(a.local_origin_state) - queueStateRank(b.local_origin_state);
      if (stateDelta !== 0) return stateDelta;
      return a.family.localeCompare(b.family);
    });

  const reviewFirstCount = items.filter((item) => item.priority.startsWith('review_first')).length;
  const queueStatus = reviewFirstCount > 0 ? 'blocked' : 'pass';
  const topFamilies = items.slice(0, 4).map((item) => `${item.family}:${item.priority}`);

  return {
    status: queueStatus,
    item_count: items.length,
    review_first_count: reviewFirstCount,
    blocked_count: reviewFirstCount,
    evidence: [
      'Branch review queue:',
      `status=${queueStatus}`,
      `items=${items.length}`,
      `review_first=${reviewFirstCount}`,
      `blocked=${reviewFirstCount}`,
      topFamilies.length > 0 ? `top=${topFamilies.join(', ')}` : 'top=none',
    ].join(' '),
    items: items.slice(0, 8),
  };
}

function canonicalHeadDecisionEvidence(decisions) {
  if (decisions.status === 'skipped') {
    return 'Canonical head decision ledger skipped by --skip-probes; run corepack pnpm run report:unmerged-branch-readiness for split, local-only, origin-only, and stale branch-family decisions.';
  }

  const topOpen = decisions.items
    .filter((item) => item.status !== 'pass')
    .slice(0, 5)
    .map((item) => `${item.family}:${item.local_origin_state}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Canonical head decision ledger:',
    `open=${decisions.open_count}/${decisions.total_count}`,
    `local_only=${decisions.local_only_count}`,
    `origin_only=${decisions.origin_only_count}`,
    `split=${decisions.split_count}`,
    `top_open=${topOpen}`,
    'approval_gate=no checkout/merge/push/discard/deploy until canonical heads are selected through read-only review and explicit owner approval',
  ].join(' ');
}

function canonicalDecisionNeeded(item) {
  const stateKey = familyStateKey(item.local_origin_state);
  if (stateKey === 'local_ahead') return 'Choose whether the local branch head is canonical before any merge or push discussion.';
  if (stateKey === 'origin_ahead') return 'Choose whether the origin branch head is canonical before any merge or local branch update discussion.';
  if (stateKey === 'diverged') return 'Choose a canonical local or origin head after bidirectional read-only commit review.';
  if (stateKey === 'local_only') return 'Decide whether the local-only branch remains a review candidate or is explicitly retired after owner review.';
  if (stateKey === 'origin_only') return 'Decide whether the origin-only branch remains a review candidate or is explicitly retired after owner review.';
  if (stateKey === 'unknown') return 'Refresh local/origin refs before selecting a canonical head.';
  return 'Canonical heads match; complete focused risk review before any merge discussion.';
}

function canonicalHeadDecisionProofType(item) {
  const stateKey = familyStateKey(item.local_origin_state);
  if (['local_ahead', 'origin_ahead', 'diverged'].includes(stateKey)) return 'split_canonical_head_decision';
  if (stateKey === 'local_only') return 'local_only_canonical_head_decision';
  if (stateKey === 'origin_only') return 'origin_only_canonical_head_decision';
  return 'canonical_head_owner_decision';
}

function canonicalHeadDecisionProofBoundary() {
  return 'Canonical-head ledger row is an owner decision record only; focused report output does not checkout, merge, push, discard, delete, migrate, deploy, grant production approval, or select a canonical head by itself.';
}

function canonicalHeadResolutionEvidence(queue) {
  if (queue.status === 'skipped') {
    return 'Canonical head resolution queue skipped by --skip-probes; run corepack pnpm run report:unmerged-branch-readiness to populate owner decision actions.';
  }

  if (queue.status === 'pass') {
    return 'Canonical head resolution queue: status=pass open=0 approval_gate=owner approval and release gates still apply before merge or deploy.';
  }

  const topBlocked = queue.items
    .slice(0, 5)
    .map((item) => `${item.rank}:${item.family}:${item.state_key}:${item.status}`)
    .join(', ') || 'none';

  return [
    'Canonical head resolution queue:',
    `status=${queue.status}`,
    `open=${queue.blocked_count}/${queue.item_count}`,
    `top_blocked=${topBlocked}`,
    'approval_gate=queue does not checkout, merge, push, discard, delete, select canonical heads, migrate, deploy, or grant production approval',
  ].join(' ');
}

function canonicalHeadResolutionAction(decision) {
  switch (decision.state_key) {
    case 'local_ahead':
      return 'Review the local-only commits against origin and record whether the local branch head is the canonical review target.';
    case 'origin_ahead':
      return 'Review the origin-only commits against the local branch and record whether the origin branch head is the canonical review target.';
    case 'diverged':
      return 'Run bidirectional read-only commit comparison and record whether local, origin, or neither head should remain the canonical review target.';
    case 'local_only':
      return 'Decide whether the local-only branch remains a launch review candidate or should be explicitly retired after owner review.';
    case 'origin_only':
      return 'Decide whether the origin-only branch remains a launch review candidate or should be explicitly retired after owner review.';
    case 'unknown':
      return 'Refresh refs and rerun the read-only branch report before choosing a canonical head.';
    default:
      return 'Record the owner canonical-head decision after read-only branch review.';
  }
}

function canonicalHeadResolutionProofBoundary() {
  return 'Canonical-head resolution queue is an owner-decision action list only; it does not checkout, merge, push, discard, delete, select canonical heads, migrate, deploy, grant production approval, or clear branch review by itself.';
}

function buildCanonicalHeadResolutionQueue(decisions) {
  if (decisions.status === 'skipped') {
    const queue = {
      status: 'skipped',
      proof_type: 'canonical_head_resolution_queue',
      source_decision_status: decisions.status,
      open_count: null,
      total_count: null,
      item_count: 0,
      blocked_count: 0,
      items: [],
      proof_boundary: canonicalHeadResolutionProofBoundary(),
      stop_gate: 'Do not choose, checkout, merge, push, discard, delete, or deploy branch heads from skipped probes; run the read-only branch report first.',
    };
    return { ...queue, evidence: canonicalHeadResolutionEvidence(queue) };
  }

  const items = (decisions.items ?? []).map((decision, index) => ({
    rank: index + 1,
    family: decision.family,
    local_ref: decision.local_ref,
    origin_ref: decision.origin_ref,
    review_ref: decision.review_ref,
    local_origin_state: decision.local_origin_state,
    state_key: decision.state_key,
    highest_risk: decision.highest_risk,
    freshness: decision.freshness,
    current: `${decision.local_origin_state}; risk=${decision.highest_risk}; freshness=${decision.freshness}`,
    needed: decision.decision_needed,
    owner: 'owner',
    action: canonicalHeadResolutionAction(decision),
    proof_command: decision.proof_command,
    proof_type: decision.proof_type,
    decision_status: decision.status,
    read_only: true,
    owner_decision_required: true,
    proof_boundary: canonicalHeadResolutionProofBoundary(),
    stop_gate: 'Do not checkout, merge, push, discard, delete, select a canonical head, migrate, deploy, or request production approval until this owner decision is explicit and release gates are clean.',
    status: decision.status === 'pass' ? 'ready' : 'blocked',
    blocks_branch_gate: decision.status !== 'pass',
  }));

  const queue = {
    status: items.some((item) => item.blocks_branch_gate) ? 'blocked' : 'pass',
    proof_type: 'canonical_head_resolution_queue',
    source_decision_status: decisions.status,
    open_count: decisions.open_count,
    total_count: decisions.total_count,
    item_count: items.length,
    blocked_count: items.filter((item) => item.blocks_branch_gate).length,
    items,
    proof_boundary: canonicalHeadResolutionProofBoundary(),
    stop_gate: 'Do not mark branch review clear until every canonical-head owner decision is explicit, read-only focused review evidence exists, and release gates are clean.',
  };
  return { ...queue, evidence: canonicalHeadResolutionEvidence(queue) };
}

function buildCanonicalHeadDecisionLedger(reviewQueue) {
  if (reviewQueue.status === 'skipped') {
    const decisions = {
      status: 'skipped',
      open_count: null,
      total_count: null,
      local_only_count: null,
      origin_only_count: null,
      split_count: null,
      items: [],
    };
    return { ...decisions, evidence: canonicalHeadDecisionEvidence(decisions) };
  }

  const items = (reviewQueue.items ?? [])
    .filter((item) => familyStateKey(item.local_origin_state) !== 'matching_heads')
    .map((item, index) => {
      const stateKey = familyStateKey(item.local_origin_state);
      return {
        rank: index + 1,
        family: item.family,
        local_ref: item.local_ref,
        origin_ref: item.origin_ref,
        review_ref: item.review_ref,
        local_origin_state: item.local_origin_state,
        state_key: stateKey,
        highest_risk: item.highest_risk,
        freshness: item.freshness,
        decision_needed: canonicalDecisionNeeded(item),
        proof_type: canonicalHeadDecisionProofType(item),
        owner_decision_required: true,
        read_only: true,
        proof_command: item.review_command,
        proof_boundary: canonicalHeadDecisionProofBoundary(),
        stop_gate: 'No checkout, merge, push, discard, deploy, migration, or production approval until the canonical head decision is explicit and release gates are clean.',
        status: 'blocked',
      };
    });
  const decisions = {
    status: items.length > 0 ? 'blocked' : 'pass',
    open_count: items.length,
    total_count: items.length,
    local_only_count: items.filter((item) => item.state_key === 'local_only').length,
    origin_only_count: items.filter((item) => item.state_key === 'origin_only').length,
    split_count: items.filter((item) => ['local_ahead', 'origin_ahead', 'diverged'].includes(item.state_key)).length,
    items,
  };

  return { ...decisions, evidence: canonicalHeadDecisionEvidence(decisions) };
}

function branchReviewClearanceStatus({ branchProbe, branchReviewQueue, canonicalHeadDecisions }) {
  if (branchProbe.status === 'skipped') return 'skipped';
  if (branchProbe.status !== 'pass') return 'fail';
  if ((branchReviewQueue.review_first_count ?? 0) > 0) return 'blocked';
  if ((canonicalHeadDecisions.open_count ?? 0) > 0) return 'blocked';
  return 'pass';
}

function branchClearanceBlockerClass(item) {
  if (item.priority?.startsWith('review_first')) return 'review_first';
  if (familyStateKey(item.local_origin_state) !== 'matching_heads') return 'canonical_head_decision';
  if (['stale', 'aging', 'unknown'].includes(item.freshness)) return 'drift_review';
  return 'focused_review';
}

function branchClearanceProofType(item) {
  if (item.highest_risk === 'high') return 'high_risk_branch_clearance_row';
  if (familyStateKey(item.local_origin_state) !== 'matching_heads') return 'canonical_head_branch_clearance_row';
  if (['stale', 'aging', 'unknown'].includes(item.freshness)) return 'drift_branch_clearance_row';
  return 'branch_clearance_row';
}

function branchClearanceProofBoundary() {
  return 'Branch clearance matrix row is read-only branch-review evidence only; it does not checkout, merge, push, discard, select canonical heads, run migrations, deploy, grant production approval, or clear branch review by itself.';
}

function branchClearanceMatrixEvidence(matrix) {
  if (matrix.status === 'skipped') {
    return 'Branch clearance matrix skipped by --skip-probes; run corepack pnpm run report:unmerged-branch-readiness to populate non-merged branch clearance rows.';
  }

  const topBlocked = matrix.rows
    .filter((row) => row.clearance_status !== 'pass')
    .slice(0, 5)
    .map((row) => `${row.family}:${row.blocker_class}:${row.clearance_status}`)
    .join(', ') || 'none';

  return [
    'Branch clearance matrix:',
    `status=${matrix.status}`,
    `families=${matrix.family_count}`,
    `review_first=${matrix.review_first_count}`,
    `canonical_open=${matrix.canonical_open_count}`,
    `stale_or_aging=${matrix.stale_or_aging_count}`,
    `top_blocked=${topBlocked}`,
    'approval_gate=no checkout/merge/push/discard/deploy until every row has focused review evidence, canonical-head owner decisions, and release gates',
  ].join(' ');
}

function buildBranchClearanceMatrix({ branchReviewStatus, branchReviewQueue, canonicalHeadDecisions }) {
  if (branchReviewQueue.status === 'skipped') {
    const matrix = {
      status: 'skipped',
      proof_type: 'read_only_branch_clearance_matrix',
      family_count: null,
      review_first_count: null,
      canonical_open_count: null,
      stale_or_aging_count: null,
      rows: [],
      proof_boundary: branchClearanceProofBoundary(),
      stop_gate: 'Do not mark branch review clear from skipped probes; run the read-only unmerged-branch report first.',
    };
    return { ...matrix, evidence: branchClearanceMatrixEvidence(matrix) };
  }

  const canonicalByFamily = new Map((canonicalHeadDecisions.items ?? []).map((item) => [item.family, item]));
  const rows = (branchReviewQueue.items ?? []).map((item, index) => {
    const canonical = canonicalByFamily.get(item.family);
    const blockerClass = branchClearanceBlockerClass(item);
    const clearanceStatus = blockerClass === 'focused_review' ? 'review_required' : 'blocked';
    return {
      rank: index + 1,
      family: item.family,
      review_ref: item.review_ref,
      local_ref: item.local_ref,
      origin_ref: item.origin_ref,
      highest_risk: item.highest_risk,
      priority: item.priority,
      blocker_class: blockerClass,
      local_origin_state: item.local_origin_state,
      freshness: item.freshness,
      age: item.age,
      canonical_decision_needed: canonical?.decision_needed ?? 'Canonical heads match; complete focused risk review before any merge discussion.',
      required_proof_command: item.review_command,
      proof_type: branchClearanceProofType(item),
      read_only: true,
      proof_boundary: branchClearanceProofBoundary(),
      stop_gate: 'Do not checkout, merge, push, discard, deploy, migrate, select a canonical head, or request production approval from this matrix row.',
      clearance_status: clearanceStatus,
      blocks_launch_clearance: true,
    };
  });

  const matrix = {
    status: branchReviewStatus,
    proof_type: 'read_only_branch_clearance_matrix',
    family_count: rows.length,
    review_first_count: rows.filter((row) => row.blocker_class === 'review_first').length,
    canonical_open_count: canonicalHeadDecisions.open_count,
    stale_or_aging_count: rows.filter((row) => ['stale', 'aging'].includes(row.freshness)).length,
    rows,
    proof_boundary: branchClearanceProofBoundary(),
    stop_gate: 'Do not mark branch review clear until every matrix row has read-only focused review evidence, required canonical-head owner decisions, clean release gates, and explicit owner approval.',
  };
  return { ...matrix, evidence: branchClearanceMatrixEvidence(matrix) };
}

function canonicalHeadComparisonEvidence(comparison) {
  if (comparison.status === 'skipped') {
    return 'Canonical head comparison skipped by --skip-probes.';
  }

  if (comparison.status === 'single_ref') {
    return [
      'Canonical head comparison:',
      `status=${comparison.status}`,
      `local_ref=${comparison.local_ref ?? 'none'}`,
      `origin_ref=${comparison.origin_ref ?? 'none'}`,
      'state=single_ref',
      'action=review available ref only; no push, checkout, merge, or discard decision is implied',
    ].join(' ');
  }

  if (comparison.status !== 'pass') {
    return [
      'Canonical head comparison:',
      `status=${comparison.status}`,
      `local_ref=${comparison.local_ref ?? 'unknown'}`,
      `origin_ref=${comparison.origin_ref ?? 'unknown'}`,
      'state=unknown',
      'action=refresh Git refs before choosing a canonical head',
    ].join(' ');
  }

  return [
    'Canonical head comparison:',
    `status=${comparison.status}`,
    `local_ref=${comparison.local_ref}`,
    `origin_ref=${comparison.origin_ref}`,
    `state=${comparison.state}`,
    `local_only=${comparison.local_only_count}`,
    `origin_only=${comparison.origin_only_count}`,
    comparison.local_only_subjects.length > 0 ? `local_only_subjects=${comparison.local_only_subjects.join(' || ')}` : 'local_only_subjects=none',
    comparison.origin_only_subjects.length > 0 ? `origin_only_subjects=${comparison.origin_only_subjects.join(' || ')}` : 'origin_only_subjects=none',
    'action=choose canonical head through read-only review before merge, push, or discard',
  ].join(' ');
}

function compareCanonicalHeads(topItem) {
  if (skipProbes) {
    const comparison = {
      status: 'skipped',
      local_ref: null,
      origin_ref: null,
      state: 'unknown',
      local_only_count: null,
      origin_only_count: null,
      local_only_subjects: [],
      origin_only_subjects: [],
    };
    return { ...comparison, evidence: canonicalHeadComparisonEvidence(comparison) };
  }

  if (!topItem?.local_ref || !topItem?.origin_ref) {
    const comparison = {
      status: 'single_ref',
      local_ref: topItem?.local_ref ?? null,
      origin_ref: topItem?.origin_ref ?? null,
      state: 'single_ref',
      local_only_count: topItem?.local_ref ? 1 : 0,
      origin_only_count: topItem?.origin_ref ? 1 : 0,
      local_only_subjects: [],
      origin_only_subjects: [],
    };
    return { ...comparison, evidence: canonicalHeadComparisonEvidence(comparison) };
  }

  const result = run('git', [
    'log',
    '--left-right',
    '--cherry-pick',
    '--oneline',
    `${topItem.local_ref}...${topItem.origin_ref}`,
  ]);
  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (result.status !== 0) {
    const comparison = {
      status: 'fail',
      local_ref: topItem.local_ref,
      origin_ref: topItem.origin_ref,
      state: 'unknown',
      local_only_count: null,
      origin_only_count: null,
      local_only_subjects: [],
      origin_only_subjects: [],
      evidence_excerpt: output.split(/\r?\n/).slice(0, 8).join(' | '),
    };
    return { ...comparison, evidence: canonicalHeadComparisonEvidence(comparison) };
  }

  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const localOnly = lines.filter((line) => line.startsWith('< ')).map((line) => line.slice(2));
  const originOnly = lines.filter((line) => line.startsWith('> ')).map((line) => line.slice(2));
  const state = localOnly.length > 0 && originOnly.length > 0
    ? 'diverged'
    : localOnly.length > 0
      ? 'local_ahead'
      : originOnly.length > 0
        ? 'origin_ahead'
        : 'matching_or_cherry_equivalent';
  const comparison = {
    status: 'pass',
    local_ref: topItem.local_ref,
    origin_ref: topItem.origin_ref,
    command: `git log --left-right --cherry-pick --oneline ${topItem.local_ref}...${topItem.origin_ref}`,
    state,
    local_only_count: localOnly.length,
    origin_only_count: originOnly.length,
    local_only_subjects: localOnly.slice(0, 6),
    origin_only_subjects: originOnly.slice(0, 6),
  };
  return { ...comparison, evidence: canonicalHeadComparisonEvidence(comparison) };
}

function extractFocusedReviewLine(markdown, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`^- ${escapedLabel}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim() ?? '';
}

function splitCommaList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseChangedFunctionRows(markdown) {
  const section = extractMarkdownSection(markdown, 'Changed Supabase Function Review Queue');
  if (!section) return [];

  return section
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| '))
    .filter((line) => !line.startsWith('| Function |') && !line.startsWith('|---'))
    .map((line) => line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 5)
    .map(([functionName, changedPaths, reviewFocus, suggestedChecks, stopGate]) => ({
      function_name: functionName,
      changed_paths: changedPaths,
      review_focus: reviewFocus,
      suggested_checks: suggestedChecks,
      stop_gate: stopGate,
      proof_type: 'read_only_supabase_function_branch_review',
      read_only: true,
      proof_boundary: 'Changed Supabase function row is review-target evidence parsed from a focused branch report; it does not deploy functions, run migrations, alter secrets, change policies, contact Supabase, clear advisor findings, or grant production approval.',
    }));
}

function parseFocusedBranchFreshness(markdown, branchRef) {
  const rows = parseBranchFreshnessRows(markdown);
  return rows.find((row) => row.branch === branchRef) ?? rows[0] ?? null;
}

function topBranchReviewPacketEvidence(packet, label = 'Top branch review packet') {
  if (packet.status === 'skipped') {
    return `${label} skipped by --skip-probes; run the focused branch review command before selecting a canonical head. approval_gate=no checkout/merge/deploy/migration/push without explicit owner approval and release gates`;
  }

  if (packet.status === 'empty') {
    return `${label}: no branch review queue items are available.`;
  }

  const functionRefs = packet.changed_supabase_functions.slice(0, 6).join(', ') || 'none';
  const comparison = packet.canonical_head_comparison ?? {};
  return [
    `${label}:`,
    `branch=${packet.branch}`,
    `status=${packet.status}`,
    `priority=${packet.priority}`,
    `risk=${packet.risk}`,
    `local_origin_state=${packet.local_origin_state}`,
    `family_freshness=${packet.family_freshness}`,
    `focused_freshness=${packet.focused_branch_freshness}`,
    `categories=${packet.categories.join(',') || 'none'}`,
    `supabase_functions=${packet.changed_supabase_function_count}`,
    `function_refs=${functionRefs}`,
    `canonical_state=${comparison.state ?? 'unknown'}`,
    `canonical_local_only=${comparison.local_only_count ?? 'unknown'}`,
    `canonical_origin_only=${comparison.origin_only_count ?? 'unknown'}`,
    'approval_gate=no checkout/merge/deploy/migration/push without explicit owner approval and release gates',
  ].join(' ');
}

function branchReviewPacketProofType(packet) {
  if (packet.status === 'skipped') return 'skipped_read_only_branch_packet_probe';
  if (packet.status === 'empty') return 'empty_read_only_branch_packet_probe';
  if (packet.risk === 'high') return 'high_risk_read_only_branch_packet';
  if (String(packet.priority ?? '').startsWith('review_first')) return 'review_first_read_only_branch_packet';
  return 'focused_read_only_branch_packet';
}

function branchReviewPacketProofBoundary() {
  return 'Focused branch packet is read-only branch evidence; it does not checkout, merge, push, discard, migrate, deploy, run Supabase migrations, grant production approval, or select a canonical head.';
}

function withBranchReviewPacketProofFields(packet) {
  return {
    ...packet,
    proof_type: branchReviewPacketProofType(packet),
    read_only: true,
    proof_boundary: branchReviewPacketProofBoundary(),
  };
}

function probeFocusedBranchReviewPacket(queueItem, { evidenceLabel = 'Top branch review packet', maxFiles = '12' } = {}) {
  if (skipProbes) {
    const packet = withBranchReviewPacketProofFields({
      status: 'skipped',
      branch: null,
      priority: null,
      risk: null,
      local_origin_state: null,
      family_freshness: null,
      focused_branch_freshness: null,
      categories: [],
      changed_supabase_function_count: null,
      changed_supabase_functions: [],
      changed_supabase_function_rows: [],
      canonical_head_comparison: compareCanonicalHeads(null),
      command: `corepack pnpm run report:unmerged-branch-readiness -- --branch <review-ref> --max-files ${maxFiles}`,
      stop_gate: 'Read-only focused review first; no branch mutation or production action.',
    });
    return { ...packet, evidence: topBranchReviewPacketEvidence(packet, evidenceLabel) };
  }

  if (!queueItem?.review_ref) {
    const packet = withBranchReviewPacketProofFields({
      status: 'empty',
      branch: null,
      priority: null,
      risk: null,
      local_origin_state: null,
      family_freshness: null,
      focused_branch_freshness: null,
      categories: [],
      changed_supabase_function_count: 0,
      changed_supabase_functions: [],
      changed_supabase_function_rows: [],
      canonical_head_comparison: compareCanonicalHeads(null),
      command: 'corepack pnpm run report:unmerged-branch-readiness',
      stop_gate: 'No branch review item available.',
    });
    return { ...packet, evidence: topBranchReviewPacketEvidence(packet, evidenceLabel) };
  }

  const result = run(process.execPath, [
    'scripts/report-unmerged-branch-readiness.mjs',
    '--branch',
    queueItem.review_ref,
    '--max-files',
    maxFiles,
  ]);
  const output = `${result.stdout}\n${result.stderr}`.trim();
  const categories = splitCommaList(extractFocusedReviewLine(output, 'Categories'));
  const functionRows = parseChangedFunctionRows(output);
  const focusedFreshness = parseFocusedBranchFreshness(output, queueItem.review_ref);
  const canonicalHeadComparison = compareCanonicalHeads(queueItem);
  const packet = withBranchReviewPacketProofFields({
    status: result.status === 0 ? 'pass' : 'fail',
    branch: queueItem.review_ref,
    family: queueItem.family,
    priority: queueItem.priority,
    risk: extractFocusedReviewLine(output, 'Risk') || queueItem.highest_risk,
    local_origin_state: queueItem.local_origin_state,
    family_freshness: queueItem.freshness,
    focused_branch_freshness: focusedFreshness?.freshness ?? 'unknown',
    focused_branch_age: focusedFreshness?.age ?? 'unknown',
    categories,
    changed_supabase_function_count: functionRows.length,
    changed_supabase_functions: functionRows.map((row) => row.function_name),
    changed_supabase_function_rows: functionRows.slice(0, 12),
    canonical_head_comparison: canonicalHeadComparison,
    command: `corepack pnpm run report:unmerged-branch-readiness -- --branch ${queueItem.review_ref} --max-files ${maxFiles}`,
    stop_gate: queueItem.stop_gate,
    evidence_excerpt: output.split(/\r?\n/).slice(0, 24).join(' | '),
  });
  return { ...packet, evidence: topBranchReviewPacketEvidence(packet, evidenceLabel) };
}

function probeTopBranchReviewPacket(reviewQueue) {
  const topItem = Array.isArray(reviewQueue.items) ? reviewQueue.items[0] : null;
  return probeFocusedBranchReviewPacket(topItem, {
    evidenceLabel: 'Top branch review packet',
    maxFiles: '12',
  });
}

function reviewFirstBranchPacketsEvidence(packetSet) {
  if (packetSet.status === 'skipped') {
    return 'Review-first branch packets skipped by --skip-probes; run the focused branch review queue before merge, push, deploy, or discard decisions.';
  }

  if (packetSet.item_count === 0) {
    return 'Review-first branch packets: no review-first branch families are currently queued.';
  }

  const packets = Array.isArray(packetSet.packets) ? packetSet.packets : [];
  const branchRefs = packets
    .map((packet) => `${packet.branch}:${packet.status}:${packet.risk}:${packet.family_freshness}/${packet.focused_branch_freshness}`)
    .join(', ') || 'none';
  const canonicalStates = packets
    .map((packet) => `${packet.branch}=${packet.canonical_head_comparison?.state ?? 'unknown'}`)
    .join(', ') || 'none';
  const totalSupabaseFunctions = packets.reduce((total, packet) => (
    total + (Number.isInteger(packet.changed_supabase_function_count) ? packet.changed_supabase_function_count : 0)
  ), 0);

  return [
    'Review-first branch packets:',
    `count=${packetSet.item_count}`,
    `queue_review_first=${packetSet.queue_review_first_count ?? 'unknown'}`,
    `pass=${packetSet.pass_count}`,
    `fail=${packetSet.fail_count}`,
    `branches=${branchRefs}`,
    `canonical_states=${canonicalStates}`,
    `supabase_functions=${totalSupabaseFunctions}`,
    'approval_gate=no checkout/merge/deploy/migration/push without explicit owner approval and release gates',
  ].join(' ');
}

function probeReviewFirstBranchPackets(reviewQueue) {
  if (skipProbes) {
    const packetSet = {
      status: 'skipped',
      item_count: null,
      queue_review_first_count: null,
      pass_count: null,
      fail_count: null,
      packets: [],
    };
    return { ...packetSet, evidence: reviewFirstBranchPacketsEvidence(packetSet) };
  }

  const queueItems = Array.isArray(reviewQueue.items) ? reviewQueue.items : [];
  const reviewFirstItems = queueItems
    .filter((item) => String(item.priority ?? '').startsWith('review_first'))
    .slice(0, 4);
  const packets = reviewFirstItems.map((item) => probeFocusedBranchReviewPacket(item, {
    evidenceLabel: 'Review-first branch packet',
    maxFiles: '8',
  }));
  const failCount = packets.filter((packet) => packet.status !== 'pass').length;
  const packetSet = {
    status: failCount > 0 ? 'fail' : 'pass',
    item_count: packets.length,
    queue_review_first_count: reviewQueue.review_first_count,
    pass_count: packets.filter((packet) => packet.status === 'pass').length,
    fail_count: failCount,
    packets,
  };
  return { ...packetSet, evidence: reviewFirstBranchPacketsEvidence(packetSet) };
}

function probeSupabaseAdvisorStatus() {
  const releasePostureText = readTextIfExists(path.join(repoRoot, 'src/lib/releasePosture.ts'));
  const conversationReviewText = readTextIfExists(path.join(repoRoot, 'docs/CEIP_CONVERSATION_OUTCOME_REVIEW_2026-06-03.md'));
  const cardBlock = extractConstBlock(
    releasePostureText,
    'export const SUPABASE_ADVISOR_STATUS_CARD',
    'export const DEPLOYMENT_APPROVAL_CHECKLIST',
  );

  let publicAdvisorItem = {};
  try {
    const publicManifest = JSON.parse(readTextIfExists(path.join(repoRoot, 'src/lib/publicReleaseStatusManifest.json'), '{}'));
    publicAdvisorItem = (publicManifest.items ?? []).find((item) => item.id === 'supabase_advisor_access') ?? {};
  } catch {
    publicAdvisorItem = {};
  }

  const advisor = {
    status: publicAdvisorItem.status ?? (extractStringValue(cardBlock, 'status') || 'unknown'),
    projectRef: extractStringValue(cardBlock, 'projectRef') || 'qnymbecjgeaoxsfphrti',
    cliAppLintStatus: extractCheckStatus(cardBlock, 'cli_app_lint') || 'unknown',
    securityPerformanceAdvisorsStatus: extractCheckStatus(cardBlock, 'security_performance_advisors') || publicAdvisorItem.status || 'unknown',
    connectorPermission: /permission denied/i.test(`${publicAdvisorItem.evidenceBoundary ?? ''}\n${cardBlock}\n${conversationReviewText}`) ? 'permission_denied' : 'unknown',
    proofBucket: publicAdvisorItem.proofBucket ?? 'external account',
    command: publicAdvisorItem.command ?? 'Supabase MCP security/performance advisors for qnymbecjgeaoxsfphrti',
    evidenceBoundary: publicAdvisorItem.evidenceBoundary
      ?? (extractStringValue(cardBlock, 'decisionBoundary')
        || 'Supabase advisor evidence is account-authorization dependent and does not claim advisor clearance.'),
    nextAction: publicAdvisorItem.nextAction
      ?? 'Fix Supabase connector or project authorization, then rerun security and performance advisors.',
    docsReference: extractStringValue(cardBlock, 'url') || 'https://supabase.com/docs/guides/database/database-advisors',
  };
  const clearanceDeficits = supabaseAdvisorClearanceDeficits(advisor);

  return {
    ...advisor,
    clearanceDeficits,
    evidence: supabaseAdvisorEvidence(advisor),
  };
}

function probeBuyerEvidence() {
  if (skipProbes) {
    const hardGateDeficits = {
      status: 'skipped',
      open_count: null,
      total_count: null,
      items: [],
    };
    const hardGateDeficitsWithQueue = {
      ...hardGateDeficits,
      remediation_queue: buildBuyerEvidenceRemediationQueue(hardGateDeficits),
    };
    const probe = {
      status: 'skipped',
      evidence: 'Probe skipped by --skip-probes; run corepack pnpm run report:buyer-evidence-readiness for current evidence.',
      productionRegisters: null,
      starterOnlyRegisters: null,
      outreachLogs: null,
      confidenceRows: null,
      actionableRows: null,
      batchableIntakeRows: null,
      evidenceRoot: 'unknown',
      phaseFGate: 'unknown',
      workspaceNextStep: 'run report:buyer-evidence-readiness before creating or claiming Phase F inputs',
      hardGateDeficits: { ...hardGateDeficitsWithQueue, evidence: buyerDeficitEvidence(hardGateDeficits) },
    };
    return { ...probe, reviewEvidence: buyerEvidenceReviewEvidence(probe) };
  }
  const result = run(process.execPath, ['scripts/report-buyer-evidence-readiness.mjs']);
  const output = `${result.stdout}\n${result.stderr}`.trim();
  const hardGateDeficits = parseBuyerDeficitRows(output);
  const hardGateDeficitsWithQueue = {
    ...hardGateDeficits,
    remediation_queue: buildBuyerEvidenceRemediationQueue(hardGateDeficits),
  };
  const probe = {
    status: result.status === 0 ? 'pass' : 'fail',
    evidence: output.split(/\r?\n/).slice(0, 12).join(' | '),
    productionRegisters: parseNumberLine(output, 'Production pilot evidence registers'),
    starterOnlyRegisters: parseNumberLine(output, 'Starter-only pilot evidence registers'),
    outreachLogs: parseNumberLine(output, 'Production outreach response logs'),
    confidenceRows: parseNumberLine(output, 'Confidence-moving register rows'),
    actionableRows: parseNumberLine(output, 'Actionable outreach rows'),
    batchableIntakeRows: parseNumberLine(output, 'Batchable intake-packet outreach rows'),
    evidenceRoot: parseGateLine(output, 'Evidence root') ?? 'unknown',
    phaseFGate: parseGateLine(output, 'Phase F 95% gate') ?? 'unknown',
    workspaceNextStep: output.includes('create:phase-f-evidence-workspace')
      ? 'create:phase-f-evidence-workspace'
      : 'inspect report:buyer-evidence-readiness next actions',
    hardGateDeficits: hardGateDeficitsWithQueue,
  };
  return { ...probe, reviewEvidence: buyerEvidenceReviewEvidence(probe) };
}

function probeUnmergedBranches() {
  if (skipProbes) {
    return {
      status: 'skipped',
      evidence: 'Probe skipped by --skip-probes; run corepack pnpm run report:unmerged-branch-readiness for current branch queue.',
      highRisk: null,
      mediumRisk: null,
      lowRisk: null,
      familyRows: [],
      familyCounts: {
        total: null,
        localOnly: null,
        originOnly: null,
        matchingHeads: null,
        localAhead: null,
        originAhead: null,
        diverged: null,
        unknown: null,
        highRiskFamilies: null,
      },
      freshnessRows: [],
      staleCount: null,
      agingCount: null,
      freshCount: null,
      unknownFreshnessCount: null,
      staleHighRiskCount: null,
      agingHighRiskCount: null,
      familyEvidence: 'Branch family review skipped by --skip-probes; run corepack pnpm run report:unmerged-branch-readiness for local/origin branch-family state.',
      freshnessEvidence: 'Branch freshness review skipped by --skip-probes; run corepack pnpm run report:unmerged-branch-readiness for stale and aging branch queues.',
    };
  }
  const result = run(process.execPath, ['scripts/report-unmerged-branch-readiness.mjs', '--max-files', '6']);
  const output = `${result.stdout}\n${result.stderr}`.trim();
  const familyRows = parseBranchFamilyRows(output);
  const freshnessRows = parseBranchFreshnessRows(output);
  return {
    status: result.status === 0 ? 'pass' : 'fail',
    evidence: output.split(/\r?\n/).slice(0, 18).join(' | '),
    highRisk: parseNumberLine(output, '- High-risk branches'),
    mediumRisk: parseNumberLine(output, '- Medium-risk branches'),
    lowRisk: parseNumberLine(output, '- Low-risk branches'),
    familyRows,
    familyCounts: {
      total: familyRows.length,
      localOnly: countFamilyRows(familyRows, 'local_only'),
      originOnly: countFamilyRows(familyRows, 'origin_only'),
      matchingHeads: countFamilyRows(familyRows, 'matching_heads'),
      localAhead: countFamilyRows(familyRows, 'local_ahead'),
      originAhead: countFamilyRows(familyRows, 'origin_ahead'),
      diverged: countFamilyRows(familyRows, 'diverged'),
      unknown: countFamilyRows(familyRows, 'unknown'),
      highRiskFamilies: familyRows.filter((row) => row.highestRisk === 'high').length,
    },
    freshnessRows,
    staleCount: countFreshnessRows(freshnessRows, 'stale'),
    agingCount: countFreshnessRows(freshnessRows, 'aging'),
    freshCount: countFreshnessRows(freshnessRows, 'fresh'),
    unknownFreshnessCount: countFreshnessRows(freshnessRows, 'unknown'),
    staleHighRiskCount: countFreshnessRows(freshnessRows, 'stale', 'high'),
    agingHighRiskCount: countFreshnessRows(freshnessRows, 'aging', 'high'),
    familyEvidence: branchFamilyEvidence(familyRows),
    freshnessEvidence: branchFreshnessEvidence(freshnessRows),
  };
}

function gitStatusSummary() {
  const short = gitText(['status', '--porcelain=v1']);
  const dirtyLines = short.split(/\r?\n/).filter(Boolean);
  const dirtyDetails = dirtyLines.slice(0, 40).map(classifyDirtyPath);
  return {
    branch: gitText(['branch', '--show-current'], 'unknown'),
    commit: gitText(['rev-parse', '--short', 'HEAD'], 'unknown'),
    dirtyLines,
    dirtyDetails,
    isDirty: dirtyLines.length > 0,
  };
}

const painPoints = [
  marketPainPoint({
    rank: 1,
    pain_point: 'Utilities need scenario-ready demand forecasts tied to planning assumptions, benchmark diagnostics, and regulator-readable exports.',
    affected_buyer: 'Utilities, REAs, planning consultants, and large-load advisors',
    source_evidence: [
      'https://www.ieso.ca/en/Sector-Participants/Planning-and-Forecasting/Annual-Planning-Outlook',
      'https://na.itron.com/products/grid-planning',
    ],
    willingness_to_pay_signal: 'Planning and consultant budgets already fund load-growth, DER, and grid-planning work.',
    repo_proof_fit: '/utility-demand-forecast and /forecast-benchmarking proof-pack routes exist with release-gated tests.',
    confidence: 4,
  }),
  marketPainPoint({
    rank: 2,
    pain_point: 'Regulatory filing teams still convert forecasts, asset evidence, and reliability narratives into filing-ready schedules manually.',
    affected_buyer: 'OEB/AUC utility regulatory affairs, engineering managers, and utility consultants',
    source_evidence: [
      'https://www.oeb.ca/regulatory-rules-and-documents/rules-codes-and-requirements/filing-requirements-transmission-distribution-applications',
      'https://www.auc.ab.ca/rules/rule005/',
    ],
    willingness_to_pay_signal: 'Filing-prep work is mandatory, recurring, and commonly supported by consultants.',
    repo_proof_fit: '/regulatory-filing and related proof helpers generate bounded filing-prep artifacts.',
    confidence: 4,
  }),
  marketPainPoint({
    rank: 3,
    pain_point: 'Forecast reviewers need to see when simple baselines beat model output before trusting planning claims.',
    affected_buyer: 'Forecast reviewers, utility consultants, regulatory analysts, and planning directors',
    source_evidence: [
      'https://robjhyndman.com/publications/another-look-at-measures-of-forecast-accuracy/',
      'https://nixtlaverse.nixtla.io/statsforecast/docs/tutorials/conformalprediction.html',
    ],
    willingness_to_pay_signal: 'Buyers pay for defensible planning outputs only when accuracy and uncertainty claims are inspectable.',
    repo_proof_fit: '/forecast-benchmarking, forecast trust helpers, and baseline tests exist.',
    confidence: 4,
  }),
  marketPainPoint({
    rank: 4,
    pain_point: 'Ontario Class A participants need bounded 5CP risk support without confusing decision support for curtailment instructions or settlement advice.',
    affected_buyer: 'Ontario Class A industrials, energy managers, and peak-response advisors',
    source_evidence: [
      'https://www.ieso.ca/en/Learn/Electricity-Pricing-Explained/Global-Adjustment',
      'https://www.ieso.ca/peaktracker',
    ],
    willingness_to_pay_signal: 'Global Adjustment exposure is cash-sensitive and Ontario-specific.',
    repo_proof_fit: '/ga-ici-5cp has public actuals, source-date checks, and no-savings/no-curtailment guardrails.',
    confidence: 4,
  }),
  marketPainPoint({
    rank: 5,
    pain_point: 'Prospects hesitate to share utility files before seeing privacy, identifier, formula, and retained-artifact boundaries.',
    affected_buyer: 'Utility privacy, security, procurement, and planning reviewers',
    source_evidence: [
      'https://owasp.org/www-community/attacks/CSV_Injection',
      'https://csrc.nist.gov/pubs/ir/8053/final',
    ],
    willingness_to_pay_signal: 'Privacy and security review can block even small pilots unless data-handling proof is clear.',
    repo_proof_fit: '/byo-csv-proof and retained-artifact helpers keep raw values out of repo evidence.',
    confidence: 4,
  }),
  marketPainPoint({
    rank: 6,
    pain_point: 'Alberta industrial emitters need source-dated TIER compliance pathway comparisons before finance approves a compliance strategy.',
    affected_buyer: 'Alberta industrial emitters, CFOs, compliance leads, and EPC advisors',
    source_evidence: [
      'https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation',
      'https://www.spglobal.com/energy/en/pricing-benchmarks/our-methodology/subscriber-notes/061125-platts-to-launch-alberta-tier-emission-performance-credit-offset-credit-assessments',
    ],
    willingness_to_pay_signal: 'Annual compliance decisions have direct cash impact and advisory budgets.',
    repo_proof_fit: '/roi-calculator and /credit-banking provide bounded compliance planning packs.',
    confidence: 4,
  }),
  marketPainPoint({
    rank: 7,
    pain_point: 'Credit holders need allocation, expiry, and liability evidence without the tool implying broker execution or registry certification.',
    affected_buyer: 'Carbon compliance teams, CFOs, and Alberta credit portfolio owners',
    source_evidence: [
      'https://www.alberta.ca/alberta-emission-offset-system',
      'https://www.carbonassessors.com/products/alberta',
    ],
    willingness_to_pay_signal: 'Credit position and expiry decisions affect compliance-year cash planning.',
    repo_proof_fit: '/credit-banking keeps allocation and expiry work bounded to audit support.',
    confidence: 3,
  }),
  marketPainPoint({
    rank: 8,
    pain_point: 'Smaller utilities need asset-condition evidence before approving replacements, deferments, and reliability investments.',
    affected_buyer: 'Utilities, REAs, municipal utilities, and engineering advisors',
    source_evidence: [
      'https://www.oeb.ca/sites/default/files/OEB%20Filing%20Reqs_Chapter%205_2024_20241209.pdf',
      'https://www.copperleaf.com/why-copperleaf/what-is-asset-investment-planning/',
    ],
    willingness_to_pay_signal: 'Capital planning and reliability reviews already fund asset evidence work.',
    repo_proof_fit: '/asset-health includes CBRM-lite proof-pack workflow and executive export coverage.',
    confidence: 3,
  }),
  marketPainPoint({
    rank: 9,
    pain_point: 'Utility procurement and security teams need structured diligence evidence before load-history sharing or pilot approval.',
    affected_buyer: 'Utility security, privacy, procurement, and integration reviewers',
    source_evidence: [
      'https://www.oeb.ca/consultations-and-projects/policy-initiatives-and-consultations/electricity-utility-cyber-security',
      'https://supabase.com/docs/guides/database/postgres/row-level-security',
    ],
    willingness_to_pay_signal: 'Security review is a frequent procurement blocker for data-backed utility pilots.',
    repo_proof_fit: '/utility-security and Supabase/client-env guards document repo-backed versus owner-supplied boundaries.',
    confidence: 3,
  }),
  marketPainPoint({
    rank: 10,
    pain_point: 'Public-sector and commercial energy teams need invoice-delta evidence before trusting bill-audit or switching recommendations.',
    affected_buyer: 'Municipal/public-sector energy managers, commercial operators, and consultants',
    source_evidence: [
      'https://natural-resources.canada.ca/sites/nrcan/files/oee/pdf/publications/infosource/pub/cipec/energyauditmanualandtool.pdf',
      'https://www.energycap.com/utility-bill-energy-management-software/features/utility-bill-auditing-software/',
    ],
    willingness_to_pay_signal: 'Invoice errors and tariff mismatch checks can produce concrete savings findings.',
    repo_proof_fit: '/shadow-billing provides uploaded-bill mode, field map, delta CSV, and savings caveats.',
    confidence: 3,
  }),
];

const targetCustomers = [
  targetCustomerSegment({
    rank: 1,
    account_or_segment: 'Small and mid-size Ontario electricity distributors',
    pain: 'Need defensible demand planning, filing evidence, and privacy-safe pilot packaging.',
    trigger: 'Distribution rate filing, load-growth scenario update, or board planning review.',
    decision_maker: 'Planning Director, Regulatory Affairs Director, or VP Engineering',
    outreach_angle: 'One forecast planning pack with benchmark appendix and no unsupported live-utility claim.',
    proof_to_show: '/utility-demand-forecast, /forecast-benchmarking, /regulatory-filing, and /utility-security.',
    confidence: 4,
  }),
  targetCustomerSegment({
    rank: 2,
    account_or_segment: 'Ontario Class A industrial energy managers',
    pain: 'Need bounded 5CP exposure support without curtailment or guaranteed savings claims.',
    trigger: 'Peak season planning or GA budget review.',
    decision_maker: 'Energy Manager, Finance Controller, or Operations Director',
    outreach_angle: 'Source-dated 5CP decision-support pack with explicit no-settlement/no-curtailment boundary.',
    proof_to_show: '/ga-ici-5cp and /forecast-benchmarking.',
    confidence: 4,
  }),
  targetCustomerSegment({
    rank: 3,
    account_or_segment: 'Alberta industrial TIER compliance teams',
    pain: 'Need CFO-readable pathway comparison across fund, credits, offsets, and direct investment.',
    trigger: 'Annual compliance planning, budget review, or credit purchase discussion.',
    decision_maker: 'CFO, Sustainability Lead, Compliance Director, or Plant Operations Lead',
    outreach_angle: 'Source-dated compliance memo with no legal, tax, broker, or registry-certification claim.',
    proof_to_show: '/roi-calculator and /credit-banking.',
    confidence: 4,
  }),
  targetCustomerSegment({
    rank: 4,
    account_or_segment: 'Rural Electrification Associations and municipal utilities',
    pain: 'Need planning, filing, and asset evidence without large enterprise software procurement.',
    trigger: 'Capex review, reliability plan, or filing-prep cycle.',
    decision_maker: 'Utility GM, Asset Manager, Engineering Manager, or Finance Lead',
    outreach_angle: 'CSV-first asset and filing proof pack for one service territory or fleet subset.',
    proof_to_show: '/asset-health, /regulatory-filing, and /utility-demand-forecast.',
    confidence: 3,
  }),
  targetCustomerSegment({
    rank: 5,
    account_or_segment: 'Utility planning consultants',
    pain: 'Need repeatable artifacts for forecast, filing, benchmark, and security-review conversations.',
    trigger: 'New client planning study or rate filing support scope.',
    decision_maker: 'Partner, Principal Consultant, or Forecast Practice Lead',
    outreach_angle: 'White-label style proof-pack workflow that reduces manual appendix creation.',
    proof_to_show: '/solutions, /forecast-benchmarking, /regulatory-filing, and export helpers.',
    confidence: 4,
  }),
  targetCustomerSegment({
    rank: 6,
    account_or_segment: 'Utility privacy and security reviewers',
    pain: 'Need assurance that buyer files, secrets, and service-role access are bounded before pilot approval.',
    trigger: 'Security questionnaire, data-sharing review, or procurement intake.',
    decision_maker: 'CISO, Privacy Officer, Procurement Lead, or Integration Reviewer',
    outreach_angle: 'Repo-backed security procurement pack plus BYO-CSV retained-extract workflow.',
    proof_to_show: '/utility-security and /byo-csv-proof.',
    confidence: 3,
  }),
  targetCustomerSegment({
    rank: 7,
    account_or_segment: 'Municipal and public-sector energy managers',
    pain: 'Need field-map and invoice-delta evidence before investing in shadow billing or audit work.',
    trigger: 'Budget pressure, price review, or energy-audit cycle.',
    decision_maker: 'Facilities Director, Energy Manager, Finance Lead, or Procurement Lead',
    outreach_angle: 'One uploaded-bill comparison proof with energy-supply-only savings caveats.',
    proof_to_show: '/shadow-billing and /byo-csv-proof.',
    confidence: 3,
  }),
  targetCustomerSegment({
    rank: 8,
    account_or_segment: 'Alberta compliance advisors and EPCs',
    pain: 'Need source-dated planning packs to support industrial compliance conversations.',
    trigger: 'Compliance-year planning or client advisory engagement.',
    decision_maker: 'Compliance Advisor, EPC Project Lead, or Carbon Market Lead',
    outreach_angle: 'Faster client-facing TIER and credit-banking memo generation with clear boundaries.',
    proof_to_show: '/roi-calculator, /credit-banking, and source-anchor report.',
    confidence: 3,
  }),
  targetCustomerSegment({
    rank: 9,
    account_or_segment: 'Large-load and data-centre planning advisors',
    pain: 'Need planning narrative and load-assumption discipline before engineering-grade interconnection work.',
    trigger: 'Early load proposal, planning screen, or service-territory impact discussion.',
    decision_maker: 'Development Director, Planning Advisor, or Utility Interconnection Lead',
    outreach_angle: 'Keep this as a support overlay behind the forecast pack, not a standalone engineering approval claim.',
    proof_to_show: '/ai-datacentres and /utility-demand-forecast.',
    confidence: 2,
  }),
  targetCustomerSegment({
    rank: 10,
    account_or_segment: 'Indigenous/community energy project teams with funder reporting needs',
    pain: 'Need repeatable funder reporting artifacts with governance and owner-supplied review boundaries.',
    trigger: 'Quarterly reporting cycle or project funding milestone.',
    decision_maker: 'Energy Manager, Program Manager, or Economic Development Lead',
    outreach_angle: 'Constructed-proof reporting workflow only until a community-reviewed real portfolio exists.',
    proof_to_show: '/funder-reporting and /aicei-reporting support surfaces.',
    confidence: 2,
  }),
];

const pkg = packageMetadata();
const gitStatus = gitStatusSummary();
const buyerProbe = probeBuyerEvidence();
const buyerEvidenceAcquisitionMatrix = buildBuyerEvidenceAcquisitionMatrix(buyerProbe);
const branchProbe = probeUnmergedBranches();
const branchReviewQueue = branchReviewQueueForProbe(branchProbe);
const canonicalHeadDecisions = buildCanonicalHeadDecisionLedger(branchReviewQueue);
const canonicalHeadResolutionQueue = buildCanonicalHeadResolutionQueue(canonicalHeadDecisions);
const branchReviewStatus = branchReviewClearanceStatus({
  branchProbe,
  branchReviewQueue,
  canonicalHeadDecisions,
});
const branchClearanceMatrix = buildBranchClearanceMatrix({
  branchReviewStatus,
  branchReviewQueue,
  canonicalHeadDecisions,
});
const topBranchReviewPacket = probeTopBranchReviewPacket(branchReviewQueue);
const reviewFirstBranchPackets = probeReviewFirstBranchPackets(branchReviewQueue);
const supabaseAdvisor = probeSupabaseAdvisorStatus();
const releasePreflight = probeReleasePreflight({
  packageManager: pkg.packageManager,
  gitStatus,
});
const launchActionQueue = buildLaunchActionQueue({
  buyerProbe,
  branchReviewQueue,
  supabaseAdvisor,
  releasePreflight,
  gitStatus,
});
const generatedAt = new Date().toISOString();

const dirtyEvidence = sourceProvenanceEvidence(gitStatus);
const sourceProvenanceResolutionQueue = buildSourceProvenanceResolutionQueue(gitStatus);
const sourceProvenanceIsolationLedger = buildSourceProvenanceIsolationLedger(gitStatus);
const productionApprovalPrerequisiteQueue = buildProductionApprovalPrerequisiteQueue({
  buyerProbe,
  branchReviewQueue,
  canonicalHeadDecisions,
  supabaseAdvisor,
  releasePreflight,
  sourceProvenanceResolutionQueue,
});
const productionApprovalRequestPacket = buildProductionApprovalRequestPacket(productionApprovalPrerequisiteQueue);
const postDeployLiveProofGateQueue = buildPostDeployLiveProofGateQueue({
  productionApprovalPrerequisiteQueue,
  packageScripts: pkg.scripts,
});

const buyerGapEvidence = [
  buyerProbe.reviewEvidence,
  buyerProbe.hardGateDeficits?.evidence,
  buyerEvidenceAcquisitionMatrix.evidence,
  `Production pilot evidence registers: ${buyerProbe.productionRegisters ?? 'unknown'}`,
  `Starter-only pilot evidence registers: ${buyerProbe.starterOnlyRegisters ?? 'unknown'}`,
  `Production outreach response logs: ${buyerProbe.outreachLogs ?? 'unknown'}`,
  `Confidence-moving register rows: ${buyerProbe.confidenceRows ?? 'unknown'}`,
  `Actionable outreach rows: ${buyerProbe.actionableRows ?? 'unknown'}`,
  `Batchable intake-packet outreach rows: ${buyerProbe.batchableIntakeRows ?? 'unknown'}`,
  `Phase F 95% gate: ${buyerProbe.phaseFGate}`,
].join('; ');

const branchReviewEvidence = [
  `Branch review clearance: status=${branchReviewStatus}; probe_status=${branchProbe.status}; review_first=${branchReviewQueue.review_first_count ?? 'unknown'}; canonical_open=${canonicalHeadDecisions.open_count ?? 'unknown'}; boundary=read-only probe execution does not clear review-first branch families, canonical-head decisions, merge approval, production approval, or deploy readiness.`,
  `Unmerged branch probe high/medium/low risk counts: ${branchProbe.highRisk ?? 'unknown'}/${branchProbe.mediumRisk ?? 'unknown'}/${branchProbe.lowRisk ?? 'unknown'}.`,
  branchProbe.familyEvidence,
  branchProbe.freshnessEvidence,
  branchReviewQueue.evidence,
  canonicalHeadDecisions.evidence,
  canonicalHeadResolutionQueue.evidence,
  branchClearanceMatrix.evidence,
  reviewFirstBranchPackets.evidence,
  topBranchReviewPacket.evidence,
  topBranchReviewPacket.canonical_head_comparison?.evidence,
].join(' ');

const launchScores = {
  security: 3,
  readiness: gitStatus.isDirty ? 3 : 4,
  sellability: 4,
  evidence: 1,
  overall: 2,
};

const launchGaps = [
  launchGap({
    gap: 'No buyer-proven Phase F evidence register or retained redacted buyer artifacts are available in production evidence roots.',
    severity: 'P0',
    evidence: buyerGapEvidence,
    framework_mapping: ['Commercial Launch Evidence Schema: hard buyer evidence gate'],
    buyer_impact: 'Cannot claim buyer-proven 95% market confidence, accepted proof packs, or commercial-ready status.',
    fix: 'Collect real anonymized buyer rows, prepare retained redacted artifacts, update the pilot register, and run validate:pilot-evidence --require-95.',
    status: 'open',
  }),
  launchGap({
    gap: 'Current source deploy approval is blocked when the worktree is dirty or owner approval is absent.',
    severity: gitStatus.isDirty ? 'P0' : 'P1',
    evidence: [dirtyEvidence, sourceProvenanceIsolationLedger.evidence].join('; '),
    framework_mapping: ['Release readiness: source deploy provenance', 'NIST SSDF: release integrity'],
    buyer_impact: 'A buyer-facing production release request cannot proceed until source provenance is clean and explicitly approved.',
    fix: 'Commit, stash, or intentionally resolve dirty tracked paths, run release readiness, then request explicit owner approval before deploy.',
    status: gitStatus.isDirty ? 'open' : 'mitigated',
  }),
  launchGap({
    gap: 'High-risk, local/origin split, or stale/aging unmerged branches can affect Supabase, payment, deploy, or buyer-facing surfaces.',
    severity: 'P1',
    evidence: branchReviewEvidence,
    framework_mapping: ['NIST SSDF: change review', 'OWASP ASVS: secure deployment verification'],
    buyer_impact: 'Unreviewed branch changes can weaken launch gates, payment boundaries, database security, or claim discipline.',
    fix: 'Run report:unmerged-branch-readiness -- --branch <ref>, choose the canonical local or origin head for split branch families, complete branch-specific checks, treat stale or aging refs as drift-review queues, and merge only through normal release gates.',
    status: ((branchProbe.highRisk ?? 1) > 0 || (branchProbe.staleCount ?? 1) > 0 || (branchProbe.agingCount ?? 1) > 0) ? 'open' : 'mitigated',
  }),
  launchGap({
    gap: 'Supabase security/performance advisor clearance remains unavailable while connector or dashboard advisor evidence is permission-gated.',
    severity: 'P1',
    evidence: [supabaseAdvisor.evidence, supabaseAdvisor.clearanceDeficits.evidence].join('; '),
    framework_mapping: ['Supabase RLS and service-role review', 'OWASP API security review'],
    buyer_impact: 'Utility security reviewers may ask for current database advisor evidence before sharing sensitive files.',
    fix: 'Reauthorize or repair Supabase advisor access, run security/performance advisor review, and record public-safe findings.',
    status: supabaseAdvisor.status === 'verified' ? 'mitigated' : 'open',
  }),
  launchGap({
    gap: 'Release toolchain, Git LFS push-path proof, full release-readiness execution, and owner approval are not all current.',
    severity: 'P1',
    evidence: [releasePreflight.evidence, productionApprovalPrerequisiteQueue.evidence].join('; '),
    framework_mapping: ['NIST SSDF: release integrity', 'Supply-chain and deployment provenance review'],
    buyer_impact: 'A buyer-facing remediation or production release request cannot be treated as approval-ready from local pnpm checks or stale push-path evidence.',
    fix: 'Resolve source provenance, run Corepack-pinned release-readiness, verify git-lfs availability before push evidence, and request explicit owner approval before any deploy.',
    status: releasePreflight.status === 'pass' ? 'mitigated' : 'open',
  }),
];

const completionAudit = buildObjectiveCompletionAudit({
  launchDecision: 'blocked',
  scores: launchScores,
  gaps: launchGaps,
  painPoints,
  targetCustomers,
  launchActionQueue,
  buyerProbe,
  sourceProvenanceResolutionQueue,
  branchReviewStatus,
  branchReviewQueue,
  canonicalHeadDecisions,
  supabaseAdvisor,
  releasePreflight,
  productionApprovalPrerequisiteQueue,
  postDeployLiveProofGateQueue,
});

const safeFixFilesChanged = [
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/report-commercial-launch-readiness.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const buyerEvidenceStarterBoundaryFilesChanged = [
  'scripts/report-buyer-evidence-readiness.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/buyerEvidenceReadiness.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const buyerEvidenceGateReportFilesChanged = [
  'package.json',
  'scripts/report-buyer-evidence-gate-readiness.mjs',
  'scripts/check-buyer-evidence-gate-readiness-report.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'scripts/generate-public-release-status.mjs',
  'scripts/check-commercial-source-docs.mjs',
  'tests/unit/buyerEvidenceGateReadiness.test.ts',
  'tests/unit/statusPagePosture.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const buyerEvidenceProofHandleFilesChanged = [
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'scripts/check-launch-action-readiness-report.mjs',
  'scripts/check-production-approval-readiness-report.mjs',
  'scripts/check-buyer-evidence-gate-readiness-report.mjs',
  'tests/unit/buyerEvidenceGateReadiness.test.ts',
  'tests/unit/launchActionReadiness.test.ts',
  'tests/unit/productionApprovalReadiness.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const buyerEvidencePublicGateHandleFilesChanged = [
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'scripts/generate-public-release-status.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/statusPagePosture.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const releasePreflightReportFilesChanged = [
  'package.json',
  'scripts/report-release-preflight-readiness.mjs',
  'scripts/check-release-preflight-readiness-report.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/releasePreflightReadiness.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const releasePreflightSourceOfTruthHandleFilesChanged = [
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'scripts/generate-public-release-status.mjs',
  'scripts/check-commercial-source-docs.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/statusPagePosture.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const releasePreflightPublicCheckHandleFilesChanged = [
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'scripts/generate-public-release-status.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/statusPagePosture.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const releaseToolchainPnpmDiagnosticFilesChanged = [
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/report-release-preflight-readiness.mjs',
  'scripts/report-commercial-launch-readiness.mjs',
  'scripts/check-release-preflight-readiness-report.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/releasePreflightReadiness.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const releaseToolchainGitLfsHookDiagnosticFilesChanged = [
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/report-release-preflight-readiness.mjs',
  'scripts/check-release-preflight-readiness-report.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/releasePreflightReadiness.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const releaseToolchainCorepackEnvDiagnosticFilesChanged = [
  'scripts/check-corepack-toolchain.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'tests/unit/corepackToolchain.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const strategyAuditSliceTimeoutFilesChanged = [
  'tests/unit/productionApprovalPacket.test.ts',
  'tests/unit/strategyCompletionAudit.test.ts',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const sourceProvenanceReportFilesChanged = [
  'package.json',
  'scripts/report-source-provenance-readiness.mjs',
  'scripts/check-source-provenance-readiness-report.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'scripts/generate-public-release-status.mjs',
  'scripts/check-commercial-source-docs.mjs',
  'tests/unit/sourceProvenanceReadiness.test.ts',
  'tests/unit/statusPagePosture.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const sourceProvenanceProofHandleFilesChanged = [
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/report-source-provenance-readiness.mjs',
  'scripts/report-release-preflight-readiness.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'scripts/check-launch-action-readiness-report.mjs',
  'scripts/check-release-preflight-readiness-report.mjs',
  'scripts/check-source-provenance-readiness-report.mjs',
  'tests/unit/sourceProvenanceReadiness.test.ts',
  'tests/unit/releasePreflightReadiness.test.ts',
  'tests/unit/launchActionReadiness.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const sourceProvenanceRenameSummaryFilesChanged = [
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const releaseToolchainProofHandleFilesChanged = [
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'scripts/check-launch-action-readiness-report.mjs',
  'scripts/check-production-approval-readiness-report.mjs',
  'tests/unit/launchActionReadiness.test.ts',
  'tests/unit/productionApprovalReadiness.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const branchReviewProofHandleFilesChanged = [
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'scripts/check-launch-action-readiness-report.mjs',
  'scripts/check-production-approval-readiness-report.mjs',
  'tests/unit/branchReviewReadiness.test.ts',
  'tests/unit/launchActionReadiness.test.ts',
  'tests/unit/productionApprovalReadiness.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const supabaseAdvisorProofHandleFilesChanged = [
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'scripts/check-launch-action-readiness-report.mjs',
  'scripts/check-production-approval-readiness-report.mjs',
  'scripts/check-supabase-advisor-readiness-report.mjs',
  'tests/unit/supabaseAdvisorReadiness.test.ts',
  'tests/unit/launchActionReadiness.test.ts',
  'tests/unit/productionApprovalReadiness.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const supabaseAdvisorReportFilesChanged = [
  'package.json',
  'scripts/report-supabase-advisor-readiness.mjs',
  'scripts/check-supabase-advisor-readiness-report.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'scripts/generate-public-release-status.mjs',
  'scripts/check-commercial-source-docs.mjs',
  'tests/unit/supabaseAdvisorReadiness.test.ts',
  'tests/unit/statusPagePosture.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const branchReviewReportFilesChanged = [
  'package.json',
  'scripts/report-branch-review-readiness.mjs',
  'scripts/check-branch-review-readiness-report.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'scripts/generate-public-release-status.mjs',
  'scripts/check-commercial-source-docs.mjs',
  'tests/unit/branchReviewReadiness.test.ts',
  'tests/unit/statusPagePosture.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const branchReviewSupabaseFunctionImpactFilesChanged = [
  'scripts/check-branch-review-readiness-report.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'tests/unit/branchReviewReadiness.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const launchManifestBranchFunctionImpactFilesChanged = [
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const launchEvidenceValidationReportFilesChanged = [
  'package.json',
  'scripts/report-launch-evidence-validation-readiness.mjs',
  'scripts/check-launch-evidence-validation-readiness-report.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'scripts/generate-public-release-status.mjs',
  'scripts/check-commercial-source-docs.mjs',
  'scripts/report-launch-action-readiness.mjs',
  'tests/unit/launchEvidenceValidationReadiness.test.ts',
  'tests/unit/statusPagePosture.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const launchValidationProductionApprovalProofHandleFilesChanged = [
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/report-launch-evidence-validation-readiness.mjs',
  'scripts/check-launch-evidence-validation-readiness-report.mjs',
  'scripts/check-production-approval-readiness-report.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'tests/unit/launchEvidenceManifest.test.ts',
  'tests/unit/launchEvidenceValidationReadiness.test.ts',
  'tests/unit/productionApprovalReadiness.test.ts',
];

const launchActionValidationStatusFilesChanged = [
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'scripts/check-launch-action-readiness-report.mjs',
  'scripts/check-launch-evidence-validation-readiness-report.mjs',
  'tests/unit/launchEvidenceManifest.test.ts',
  'tests/unit/launchActionReadiness.test.ts',
  'tests/unit/launchEvidenceValidationReadiness.test.ts',
];

const launchActionReportFilesChanged = [
  'package.json',
  'scripts/report-launch-action-readiness.mjs',
  'scripts/check-launch-action-readiness-report.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'scripts/generate-public-release-status.mjs',
  'scripts/check-commercial-source-docs.mjs',
  'tests/unit/launchActionReadiness.test.ts',
  'tests/unit/statusPagePosture.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const launchActionBuyerLaneStatusFilesChanged = [
  'scripts/report-launch-action-readiness.mjs',
  'scripts/check-launch-action-readiness-report.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/launchActionReadiness.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const productionApprovalPacketSequencingFilesChanged = [
  'scripts/report-production-approval-packet.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/productionApprovalPacket.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const productionApprovalReportFilesChanged = [
  'package.json',
  'scripts/report-production-approval-readiness.mjs',
  'scripts/check-production-approval-readiness-report.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'scripts/generate-public-release-status.mjs',
  'scripts/check-commercial-source-docs.mjs',
  'tests/unit/productionApprovalReadiness.test.ts',
  'tests/unit/statusPagePosture.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const postDeployLiveProofReportFilesChanged = [
  'package.json',
  'scripts/report-post-deploy-live-proof-readiness.mjs',
  'scripts/check-post-deploy-live-proof-readiness-report.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'scripts/generate-public-release-status.mjs',
  'scripts/check-commercial-source-docs.mjs',
  'tests/unit/postDeployLiveProofReadiness.test.ts',
  'tests/unit/statusPagePosture.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const completionAuditProofHandleFilesChanged = [
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const launchActionFinalProofHandleFilesChanged = [
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'scripts/check-launch-action-readiness-report.mjs',
  'tests/unit/launchActionReadiness.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const fixReportFocusedChecksFilesChanged = [
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const publicFixReportCommandFilesChanged = [
  'scripts/generate-public-release-status.mjs',
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'tests/unit/statusPagePosture.test.ts',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const progressDigestFocusedReportFilesChanged = [
  'package.json',
  'scripts/report-progress-digest-readiness.mjs',
  'scripts/check-progress-digest-readiness-report.mjs',
  'scripts/generate-public-release-status.mjs',
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'scripts/check-commercial-source-docs.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/statusPagePosture.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const objectiveCompletionAuditFocusedReportFilesChanged = [
  'package.json',
  'scripts/report-objective-completion-audit-readiness.mjs',
  'scripts/check-objective-completion-audit-readiness-report.mjs',
  'scripts/generate-public-release-status.mjs',
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'scripts/check-commercial-source-docs.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/statusPagePosture.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const adversarialReviewFocusedReportFilesChanged = [
  'package.json',
  'scripts/report-adversarial-review-readiness.mjs',
  'scripts/check-adversarial-review-readiness-report.mjs',
  'scripts/generate-public-release-status.mjs',
  'src/lib/releasePosture.ts',
  'src/lib/publicReleaseStatusManifest.json',
  'public/status/release-health.json',
  'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
  'scripts/check-commercial-source-docs.mjs',
  'scripts/report-launch-evidence-manifest.mjs',
  'scripts/check-launch-evidence-manifest.mjs',
  'scripts/check-commercial-launch-readiness-report.mjs',
  'tests/unit/statusPagePosture.test.ts',
  'tests/unit/launchEvidenceManifest.test.ts',
];

const currentSafeFixFilesChanged = Array.from(new Set([
  ...safeFixFilesChanged,
  ...buyerEvidenceStarterBoundaryFilesChanged,
  ...buyerEvidenceGateReportFilesChanged,
  ...buyerEvidenceProofHandleFilesChanged,
  ...buyerEvidencePublicGateHandleFilesChanged,
  ...releasePreflightReportFilesChanged,
  ...releasePreflightSourceOfTruthHandleFilesChanged,
  ...releasePreflightPublicCheckHandleFilesChanged,
  ...releaseToolchainPnpmDiagnosticFilesChanged,
  ...releaseToolchainGitLfsHookDiagnosticFilesChanged,
  ...releaseToolchainCorepackEnvDiagnosticFilesChanged,
  ...strategyAuditSliceTimeoutFilesChanged,
  ...sourceProvenanceReportFilesChanged,
  ...sourceProvenanceProofHandleFilesChanged,
  ...sourceProvenanceRenameSummaryFilesChanged,
  ...releaseToolchainProofHandleFilesChanged,
  ...branchReviewProofHandleFilesChanged,
  ...supabaseAdvisorProofHandleFilesChanged,
  ...supabaseAdvisorReportFilesChanged,
  ...branchReviewReportFilesChanged,
  ...branchReviewSupabaseFunctionImpactFilesChanged,
  ...launchManifestBranchFunctionImpactFilesChanged,
  ...launchEvidenceValidationReportFilesChanged,
  ...launchValidationProductionApprovalProofHandleFilesChanged,
  ...launchActionValidationStatusFilesChanged,
  ...launchActionReportFilesChanged,
  ...launchActionBuyerLaneStatusFilesChanged,
  ...productionApprovalPacketSequencingFilesChanged,
  ...productionApprovalReportFilesChanged,
  ...postDeployLiveProofReportFilesChanged,
  ...completionAuditProofHandleFilesChanged,
  ...launchActionFinalProofHandleFilesChanged,
  ...fixReportFocusedChecksFilesChanged,
  ...publicFixReportCommandFilesChanged,
  ...progressDigestFocusedReportFilesChanged,
  ...objectiveCompletionAuditFocusedReportFilesChanged,
  ...adversarialReviewFocusedReportFilesChanged,
]));

const safeFixTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm exec vitest run tests/unit/launchEvidenceManifest.test.ts tests/unit/productionApprovalPacket.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm exec vitest run tests/unit/launchEvidenceManifest.test.ts tests/unit/unmergedBranchReadiness.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
  'pnpm run report:production-approval-packet -- --skip-release-readiness',
  'pnpm run report:unmerged-branch-readiness -- --focus-risk high',
  'pnpm run check:public-release-status',
  'pnpm run check:claim-boundaries',
  'pnpm run test:e2e:preview',
  'pnpm exec playwright test --config=playwright.config.ts tests/component/foundation-phase0.spec.ts --project=chromium',
  'pnpm run test:strategy-audit-slice',
];

const buyerEvidenceStarterBoundaryTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/buyerEvidenceReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run check:phase-f-evidence-workspace',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
  'pnpm run report:buyer-evidence-readiness -- --root /tmp/ceip-phase-f-evidence-codex --evidence-root /tmp/ceip-phase-f-evidence-codex/phase-f-minimum-intake',
];

const buyerEvidenceGateReportTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/buyerEvidenceGateReadiness.test.ts tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:buyer-evidence-gate-readiness',
  'pnpm run report:buyer-evidence-gate-readiness -- --skip-probes',
  'pnpm run check:buyer-evidence-gate-report',
  'pnpm run check:commercial-source',
  'pnpm run check:public-release-status',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const buyerEvidenceProofHandleTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/buyerEvidenceGateReadiness.test.ts tests/unit/launchActionReadiness.test.ts tests/unit/productionApprovalReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:buyer-evidence-gate-readiness',
  'pnpm run report:buyer-evidence-gate-readiness -- --skip-probes',
  'pnpm run check:buyer-evidence-gate-report',
  'pnpm run check:launch-action-report -- --skip-probes',
  'pnpm run check:production-approval-report -- --skip-probes',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const buyerEvidencePublicGateHandleTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run generate:public-release-status',
  'pnpm run check:public-release-status',
  'pnpm run check:commercial-source',
  'pnpm run report:buyer-evidence-gate-readiness -- --skip-probes',
  'pnpm run check:buyer-evidence-gate-report -- --skip-probes',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const releasePreflightReportTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/releasePreflightReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:release-preflight',
  'pnpm run report:release-preflight -- --skip-probes',
  'pnpm run check:release-preflight-report',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const releasePreflightSourceOfTruthHandleTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run check:commercial-source',
  'pnpm run check:public-release-status',
  'pnpm run check:release-preflight-report',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const releasePreflightPublicCheckHandleTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run generate:public-release-status',
  'pnpm run check:public-release-status',
  'pnpm run report:release-preflight -- --skip-probes',
  'pnpm run check:release-preflight-report -- --skip-probes',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const releaseToolchainPnpmDiagnosticTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/releasePreflightReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:release-preflight -- --json',
  'pnpm run check:release-preflight-report',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const releaseToolchainGitLfsHookDiagnosticTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/releasePreflightReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'node scripts/report-launch-evidence-manifest.mjs',
  'pnpm run check:release-preflight-report',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const releaseToolchainCorepackEnvDiagnosticTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/corepackToolchain.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'node scripts/check-corepack-toolchain.mjs',
  'node scripts/report-launch-evidence-manifest.mjs',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const strategyAuditSliceTimeoutTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/productionApprovalPacket.test.ts tests/unit/strategyCompletionAudit.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm exec vitest run tests/unit/productionApprovalPacket.test.ts -t "keeps full blocker gates failing when live parity is stale" --no-file-parallelism --maxWorkers=1',
  'pnpm exec vitest run tests/unit/strategyCompletionAudit.test.ts -t "exits nonzero when a required local source gate fails|keeps live metadata failure as an external gate when local checks pass" --no-file-parallelism --maxWorkers=1',
  'pnpm run test:strategy-audit-slice',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const sourceProvenanceReportTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/sourceProvenanceReadiness.test.ts tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:source-provenance-readiness',
  'pnpm run report:source-provenance-readiness -- --skip-probes',
  'pnpm run check:source-provenance-report',
  'pnpm run check:commercial-source',
  'pnpm run check:public-release-status',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const sourceProvenanceProofHandleTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/sourceProvenanceReadiness.test.ts tests/unit/releasePreflightReadiness.test.ts tests/unit/launchActionReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:source-provenance-readiness -- --skip-probes',
  'pnpm run check:source-provenance-report -- --skip-probes',
  'pnpm run check:release-preflight-report -- --skip-probes',
  'pnpm run check:launch-action-report -- --skip-probes',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const sourceProvenanceRenameSummaryTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:source-provenance-readiness -- --skip-probes',
  'pnpm run check:source-provenance-report -- --skip-probes',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const releaseToolchainProofHandleTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/releasePreflightReadiness.test.ts tests/unit/launchActionReadiness.test.ts tests/unit/productionApprovalReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:release-preflight -- --skip-probes',
  'pnpm run check:release-preflight-report -- --skip-probes',
  'pnpm run check:launch-action-report -- --skip-probes',
  'pnpm run check:production-approval-report -- --skip-probes',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const branchReviewProofHandleTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/branchReviewReadiness.test.ts tests/unit/launchActionReadiness.test.ts tests/unit/productionApprovalReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:branch-review-readiness',
  'pnpm run report:branch-review-readiness -- --skip-probes',
  'pnpm run check:branch-review-report',
  'pnpm run check:launch-action-report -- --skip-probes',
  'pnpm run check:production-approval-report -- --skip-probes',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const supabaseAdvisorProofHandleTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/supabaseAdvisorReadiness.test.ts tests/unit/launchActionReadiness.test.ts tests/unit/productionApprovalReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:supabase-advisor-readiness',
  'pnpm run report:supabase-advisor-readiness -- --skip-probes',
  'pnpm run check:supabase-advisor-report',
  'pnpm run check:launch-action-report -- --skip-probes',
  'pnpm run check:production-approval-report -- --skip-probes',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const supabaseAdvisorReportTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/supabaseAdvisorReadiness.test.ts tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:supabase-advisor-readiness',
  'pnpm run report:supabase-advisor-readiness -- --skip-probes',
  'pnpm run check:supabase-advisor-report',
  'pnpm run check:supabase-app-lint',
  'pnpm run check:commercial-source',
  'pnpm run check:public-release-status',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const branchReviewReportTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/branchReviewReadiness.test.ts tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:branch-review-readiness',
  'pnpm run report:branch-review-readiness -- --skip-probes',
  'pnpm run check:branch-review-report',
  'pnpm run check:commercial-source',
  'pnpm run check:public-release-status',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const branchReviewSupabaseFunctionImpactTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/branchReviewReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:branch-review-readiness',
  'pnpm run check:branch-review-report',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const launchManifestBranchFunctionImpactTestsRun = [
  'node --check scripts/check-launch-evidence-manifest.mjs',
  'node --check scripts/report-launch-evidence-manifest.mjs',
  'pnpm exec vitest run tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'node scripts/check-launch-evidence-manifest.mjs',
  'node scripts/check-launch-evidence-manifest.mjs --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
  'pnpm exec tsc -b --pretty false',
];

const launchEvidenceValidationReportTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/launchEvidenceValidationReadiness.test.ts tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:launch-evidence-validation-readiness',
  'pnpm run report:launch-evidence-validation-readiness -- --skip-probes',
  'pnpm run check:launch-evidence-validation-report',
  'pnpm run check:commercial-source',
  'pnpm run check:public-release-status',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const launchValidationProductionApprovalProofHandleTestsRun = [
  'node --check scripts/report-launch-evidence-manifest.mjs',
  'node --check scripts/check-launch-evidence-manifest.mjs',
  'node --check scripts/check-launch-evidence-validation-readiness-report.mjs',
  'node --check scripts/check-production-approval-readiness-report.mjs',
  'pnpm exec vitest run tests/unit/launchEvidenceValidationReadiness.test.ts tests/unit/productionApprovalReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run check:launch-evidence-validation-report -- --skip-probes',
  'pnpm run check:production-approval-report -- --skip-probes',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
  'pnpm exec tsc -b --pretty false',
];

const launchActionValidationStatusTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/launchEvidenceValidationReadiness.test.ts tests/unit/launchActionReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:launch-action-readiness -- --skip-probes',
  'pnpm run report:launch-evidence-validation-readiness -- --skip-probes',
  'pnpm run check:launch-action-report -- --skip-probes',
  'pnpm run check:launch-evidence-validation-report -- --skip-probes',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const launchActionReportTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/launchActionReadiness.test.ts tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:launch-action-readiness',
  'pnpm run report:launch-action-readiness -- --skip-probes',
  'pnpm run check:launch-action-report',
  'pnpm run check:commercial-source',
  'pnpm run check:public-release-status',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const launchActionBuyerLaneStatusTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/launchActionReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:launch-action-readiness -- --skip-probes',
  'pnpm run report:launch-action-readiness -- --json',
  'pnpm run check:launch-action-report -- --skip-probes',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const productionApprovalPacketSequencingTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/productionApprovalPacket.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:production-approval-packet',
  'pnpm run report:production-approval-packet -- --skip-release-readiness',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const productionApprovalReportTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/productionApprovalReadiness.test.ts tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:production-approval-readiness',
  'pnpm run report:production-approval-readiness -- --skip-probes',
  'pnpm run check:production-approval-report',
  'pnpm run check:commercial-source',
  'pnpm run check:public-release-status',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const postDeployLiveProofReportTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/postDeployLiveProofReadiness.test.ts tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:post-deploy-live-proof-readiness',
  'pnpm run report:post-deploy-live-proof-readiness -- --skip-probes',
  'pnpm run check:post-deploy-live-proof-report',
  'pnpm run check:commercial-source',
  'pnpm run check:public-release-status',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const completionAuditProofHandleTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
  'pnpm run report:commercial-launch-readiness -- --skip-probes',
];

const launchActionFinalProofHandleTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/launchActionReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:launch-action-readiness -- --skip-probes',
  'pnpm run check:launch-action-report -- --skip-probes',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const fixReportFocusedChecksTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
  'pnpm run report:commercial-launch-readiness -- --skip-probes',
];

const publicFixReportCommandTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run generate:public-release-status',
  'pnpm run check:public-release-status',
  'pnpm run check:commercial-source',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const progressDigestFocusedReportTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:progress-digest-readiness -- --skip-probes',
  'pnpm run check:progress-digest-report -- --skip-probes',
  'pnpm run generate:public-release-status',
  'pnpm run check:public-release-status',
  'pnpm run check:commercial-source',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const objectiveCompletionAuditFocusedReportTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:objective-completion-audit-readiness -- --skip-probes',
  'pnpm run check:objective-completion-audit-report -- --skip-probes',
  'pnpm run generate:public-release-status',
  'pnpm run check:public-release-status',
  'pnpm run check:commercial-source',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const adversarialReviewFocusedReportTestsRun = [
  'pnpm exec tsc -b --pretty false',
  'pnpm exec vitest run tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
  'pnpm run report:adversarial-review-readiness -- --skip-probes',
  'pnpm run check:adversarial-review-report -- --skip-probes',
  'pnpm run generate:public-release-status',
  'pnpm run check:public-release-status',
  'pnpm run check:commercial-source',
  'pnpm run check:launch-evidence-manifest -- --skip-probes',
  'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
];

const currentSafeFixTestsRun = Array.from(new Set([
  ...safeFixTestsRun,
  ...buyerEvidenceStarterBoundaryTestsRun,
  ...buyerEvidenceGateReportTestsRun,
  ...buyerEvidenceProofHandleTestsRun,
  ...buyerEvidencePublicGateHandleTestsRun,
  ...releasePreflightReportTestsRun,
  ...releasePreflightSourceOfTruthHandleTestsRun,
  ...releasePreflightPublicCheckHandleTestsRun,
  ...releaseToolchainPnpmDiagnosticTestsRun,
  ...releaseToolchainGitLfsHookDiagnosticTestsRun,
  ...releaseToolchainCorepackEnvDiagnosticTestsRun,
  ...strategyAuditSliceTimeoutTestsRun,
  ...sourceProvenanceReportTestsRun,
  ...sourceProvenanceProofHandleTestsRun,
  ...sourceProvenanceRenameSummaryTestsRun,
  ...releaseToolchainProofHandleTestsRun,
  ...branchReviewProofHandleTestsRun,
  ...supabaseAdvisorProofHandleTestsRun,
  ...supabaseAdvisorReportTestsRun,
  ...branchReviewReportTestsRun,
  ...branchReviewSupabaseFunctionImpactTestsRun,
  ...launchManifestBranchFunctionImpactTestsRun,
  ...launchEvidenceValidationReportTestsRun,
  ...launchValidationProductionApprovalProofHandleTestsRun,
  ...launchActionValidationStatusTestsRun,
  ...launchActionReportTestsRun,
  ...launchActionBuyerLaneStatusTestsRun,
  ...productionApprovalPacketSequencingTestsRun,
  ...productionApprovalReportTestsRun,
  ...postDeployLiveProofReportTestsRun,
  ...completionAuditProofHandleTestsRun,
  ...launchActionFinalProofHandleTestsRun,
  ...fixReportFocusedChecksTestsRun,
  ...publicFixReportCommandTestsRun,
  ...progressDigestFocusedReportTestsRun,
  ...objectiveCompletionAuditFocusedReportTestsRun,
  ...adversarialReviewFocusedReportTestsRun,
]));

const safeFixImplementationDecisions = [
  {
    task_id: 'CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES',
    decision: 'Record the preview-build TypeScript gate safe fix in the launch evidence manifest and commercial report.',
    acceptance_check: 'The launch evidence manifest validates while preserving blocked launch status and records the safe-fix files, checks, proof boundary, and code optimization review.',
    chosen_variant: 'minimal manifest/report evidence patch',
    repo_pattern_reused: 'Existing launch evidence manifest fix_report, implementation_decisions, rejected_variants, and code_optimization_reviews schema fields.',
    files_changed: safeFixFilesChanged,
    tests_run: safeFixTestsRun,
    proof: 'The previous preview blocker was eliminated by typed launch-manifest map indexes; tsc, focused manifest tests, launch checks, preview build, Browser /status smoke, Phase 0 Chromium slice, and strategy audit slice passed.',
    reason: 'The orchestrator contract requires code-changing safe-fix phases to retain implementation and code-optimization evidence; empty arrays under-reported current repo-side launch-readiness work.',
    proof_boundary: 'This record documents repo-local safe-fix evidence only; it does not clear buyer evidence, source provenance, branch review, Supabase advisor clearance, release approval, production approval, deployment, or hosted/live parity.',
    stop_gate: 'Do not treat this safe-fix record, TypeScript success, local preview build, or local browser smoke as commercial-ready status or production approval.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-VALIDATION-CIRCULARITY',
    decision: 'Remove the self-blocking launch evidence validation row from the production approval request packet while preserving external validation proof.',
    acceptance_check: 'The manifest request packet no longer counts Launch evidence validation as a pre-request blocker, check:launch-evidence-manifest still proves the row externally, and production approval remains blocked by real source, release, branch, Supabase, buyer, owner, and live-proof gates.',
    chosen_variant: 'minimal prerequisite status and evidence-text patch',
    repo_pattern_reused: 'Existing production_approval.prerequisite_queue and request_packet rows, with check:launch-evidence-manifest as the external validator.',
    files_changed: [
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ],
    tests_run: [
      'pnpm exec tsc -b --pretty false',
      'pnpm exec vitest run tests/unit/launchEvidenceManifest.test.ts tests/unit/productionApprovalPacket.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm run report:production-approval-packet -- --skip-release-readiness',
    ],
    proof: 'The production approval packet already runs check-launch-evidence-manifest before reading the manifest; this patch lets the request packet reflect that external gate without self-validating the manifest or clearing any independent launch blocker.',
    reason: 'A hard-coded blocked status made request eligibility unreachable even after the external manifest validation check passed.',
    proof_boundary: 'This record only resolves a repo-local evidence-packet circularity; it does not clear source provenance, release-readiness, branch review, Supabase advisor, buyer evidence, owner approval, deployment, or hosted/live parity.',
    stop_gate: 'Do not treat the ready Launch evidence validation row, manifest check pass, or production approval packet generation as production approval, buyer acceptance, deployment, or current hosted/live parity.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-QUEUE-STATUS',
    decision: 'Align branch review queue status with open review-first branch blockers.',
    acceptance_check: 'When read-only branch evidence finds review-first branch families, branch_review.review_queue.status is blocked, blocked_count matches review_first_count, and branch review remains read-only without clearing canonical-head or release gates.',
    chosen_variant: 'minimal branch review queue status patch',
    repo_pattern_reused: 'Existing branch_review.review_queue evidence, branch clearance matrix, canonical-head decision ledger, and launch manifest validators.',
    files_changed: [
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ],
    tests_run: [
      'pnpm exec tsc -b --pretty false',
      'pnpm exec vitest run tests/unit/launchEvidenceManifest.test.ts tests/unit/unmergedBranchReadiness.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm run report:unmerged-branch-readiness -- --focus-risk high',
    ],
    proof: 'The current read-only branch report finds review-first high-risk/stale branch families; the manifest queue now reports that as blocked rather than pass while preserving read-only review boundaries.',
    reason: 'A queue with open review-first blockers should not report pass while the surrounding branch clearance and production approval gates are blocked.',
    proof_boundary: 'This record improves branch-review evidence semantics only; it does not checkout, merge, push, discard, select canonical heads, run migrations, clear release-readiness, deploy, or grant production approval.',
    stop_gate: 'Do not treat a blocked branch review queue, focused branch packet, or branch report as branch clearance, canonical-head owner decision, merge approval, deployment, or buyer evidence.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-STARTER-REGISTER-BOUNDARY',
    decision: 'Separate starter-only pilot evidence registers from non-starter production buyer-evidence inputs.',
    acceptance_check: 'Buyer evidence readiness reports starter_only_registers, the launch manifest exposes starter_only_registers, and the production-register acquisition row stays blocked when every discovered register is starter-only.',
    chosen_variant: 'minimal starter-register classification patch',
    repo_pattern_reused: 'Existing buyer evidence readiness report, launch manifest buyer_evidence object, buyer acquisition matrix, and manifest/report validators.',
    files_changed: buyerEvidenceStarterBoundaryFilesChanged,
    tests_run: buyerEvidenceStarterBoundaryTestsRun,
    proof: 'Generated Phase F workspaces can contain validator-compatible starter registers with confidence_delta=0; this patch makes those registers visible as starter-only scaffolding so they cannot be mistaken for buyer evidence.',
    reason: 'Counting starter CSVs only as production registers could make acquisition status and operator summaries look more complete than the hard 95% gate allows.',
    proof_boundary: 'This record improves buyer-evidence classification only; it does not contact buyers, create accepted evidence, move confidence, attach retained artifacts, validate 95%, clear buyer hard gates, or grant commercial-ready status.',
    stop_gate: 'Do not treat starter-only register counts, workspace creation, report generation, or base validation as buyer acceptance, confidence movement, retained-artifact validation, or permission to contact buyers.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-GATE-FOCUSED-REPORT',
    decision: 'Expose buyer evidence hard-gate deficits, acquisition rows, remediation rows, launch action row, and production approval buyer rows through a focused buyer evidence gate report and checker.',
    acceptance_check: 'Operators can run report:buyer-evidence-gate-readiness and check:buyer-evidence-gate-report to inspect buyer hard-gate deficits, acquisition matrix, remediation queue, launch action buyer row, and production approval buyer rows without scanning broad launch artifacts or creating buyer proof.',
    chosen_variant: 'minimal focused manifest wrapper and public handle alignment',
    repo_pattern_reused: 'Existing buyer_evidence, hard_gate_deficits, acquisition_matrix, remediation_queue, launch_action_queue buyer_evidence row, production_approval prerequisite/request rows, focused report/check conventions, and public release-status handle validation.',
    files_changed: buyerEvidenceGateReportFilesChanged,
    tests_run: buyerEvidenceGateReportTestsRun,
    proof: 'The wrapper consumes the existing launch evidence manifest and renders Markdown/JSON buyer evidence gate evidence, while the checker asserts the ten hard-gate deficit rows, ten acquisition matrix rows, remediation queue, accepted-buyer and retained-artifact requirements, production approval rows, public/source-of-truth handles, and no-buyer-proof boundaries.',
    reason: 'Buyer hard-gate deficits were visible inside broad launch artifacts and the raw filesystem scan, but did not have a narrow operator handle for the production approval buyer evidence blocker.',
    proof_boundary: 'This record improves buyer evidence gate visibility only; it does not contact buyers, send outreach, create accepted evidence, move confidence, attach retained artifacts, validate 95%, create buyer proof, claim buyer acceptance, grant production approval, deploy, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat the focused buyer evidence gate report, check pass, JSON output, skipped probes, public status handle, starter registers, workspace generation, or docs sync as buyer-proven evidence, Phase F 95% validation, production approval, commercial-ready status, deployment, or hosted/live parity.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PROOF-HANDLES',
    decision: 'Route launch action and production approval buyer proof rows to the focused buyer evidence hard-gate report and checker.',
    acceptance_check: 'The launch action buyer_evidence row, production approval Buyer evidence hard gate prerequisite, and production approval request row all expose report:buyer-evidence-gate-readiness plus check:buyer-evidence-gate-report while remediation/acquisition rows keep raw validate:pilot-evidence requirements for real accepted evidence.',
    chosen_variant: 'minimal focused buyer evidence proof-handle derivation',
    repo_pattern_reused: 'Existing BUYER_EVIDENCE_GATE_FOCUSED_PROOF_COMMAND, buyer_evidence hard_gate_deficits, acquisition_matrix, remediation_queue, launch_action_queue buyer row, production_approval prerequisite/request rows, focused report/check conventions, and public release-status handle validation.',
    files_changed: buyerEvidenceProofHandleFilesChanged,
    tests_run: buyerEvidenceProofHandleTestsRun,
    proof: 'The focused buyer evidence gate report already reads the launch manifest buyer hard-gate, acquisition, remediation, launch action, and production approval rows; this patch reuses that single non-mutating handle for buyer proof rows that are planning or approval gates, while retained-artifact validation remains a separate operator action.',
    reason: 'Raw validate:pilot-evidence placeholders in launch action and production approval buyer rows made operators jump straight to evidence validation instead of first inspecting the focused hard-gate deficit report/check that explains why buyer evidence is blocked.',
    proof_boundary: 'This record improves buyer evidence proof-handle discoverability only; it does not contact buyers, send outreach, create accepted evidence, move confidence, attach retained artifacts, run retained-artifact validation as clearance, validate 95%, grant production approval, deploy, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat focused buyer evidence proof handles, focused report/check success, JSON output, skipped probes, or production approval row visibility as buyer acceptance, retained-artifact validation, Phase F 95% proof, production approval, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PUBLIC-GATE-HANDLE',
    decision: 'Route the top-level public buyer evidence 95% gate and deployment checklist buyer confidence row through the focused buyer evidence gate report/check.',
    acceptance_check: 'The buyer_evidence_gate public status row and Buyer-proven confidence deployment checklist command expose report:buyer-evidence-gate-readiness plus check:buyer-evidence-gate-report, while the evidence boundary and next action preserve validate:pilot-evidence --require-95 as the final retained-artifact validator.',
    chosen_variant: 'minimal public buyer evidence gate handle alignment',
    repo_pattern_reused: 'Existing focused buyer evidence gate report/check commands, public release-status generator contract, deployment approval checklist, source-of-truth docs, statusPagePosture tests, and launch evidence code-optimization ledger.',
    files_changed: buyerEvidencePublicGateHandleFilesChanged,
    tests_run: buyerEvidencePublicGateHandleTestsRun,
    proof: 'The patch updates the top-level buyer_evidence_gate public command, the deployment checklist buyer confidence command, generated public status JSON, generator validation, source-of-truth docs, and status tests so operators inspect buyer deficits before attempting the retained-artifact 95% validator.',
    reason: 'The public buyer_evidence_gate still pointed directly at placeholder path/to register and evidence-root inputs even after the focused buyer evidence gate report/check existed.',
    proof_boundary: 'This record aligns public buyer evidence gate handles only; it does not contact buyers, send outreach, create accepted evidence, move confidence, attach retained artifacts, validate 95%, create buyer proof, claim buyer acceptance, grant production approval, deploy, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat focused public buyer evidence gate handles, deployment checklist visibility, public status validation, generated status JSON, report/check success, skipped probes, or this code optimization ledger as buyer acceptance, retained-artifact validation, Phase F 95% proof, production approval, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-FOCUSED-REPORT',
    decision: 'Expose the launch manifest release_preflight section through a focused release-preflight report and structural checker.',
    acceptance_check: 'Operators can run report:release-preflight and check:release-preflight-report to inspect Corepack, Git LFS, source provenance, clearance matrix, remediation queue, and production-approval boundaries without running unrelated buyer, branch, Supabase, or deploy flows.',
    chosen_variant: 'minimal focused manifest wrapper',
    repo_pattern_reused: 'Existing release_preflight, toolchain_probe_ledger, clearance_matrix, remediation_queue, source_provenance, production_approval.request_packet, and package script conventions.',
    files_changed: releasePreflightReportFilesChanged,
    tests_run: releasePreflightReportTestsRun,
    proof: 'The wrapper consumes the existing launch evidence manifest and renders a focused Markdown/JSON report, while the checker asserts the release probe ledger, preflight deficit rows, clearance matrix, remediation queue, source provenance, production approval request packet, and no-execution boundaries.',
    reason: 'The release toolchain blocker was only visible inside large commercial-launch artifacts; a focused report reduces operator ambiguity without installing tools, clearing provenance, running release-readiness, or granting approval.',
    proof_boundary: 'This record improves release-preflight evidence visibility only; it does not install Corepack or Git LFS, run full release-readiness, clear source provenance, push, deploy, grant owner approval, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat the focused release-preflight report, check pass, JSON output, local Git LFS probe, skipped probes, or bare pnpm checks as release-readiness, production approval, deployment, or hosted/live parity.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-SOURCE-OF-TRUTH-HANDLES',
    decision: 'Align source-of-truth docs, public release status, and release posture handles with the focused release-preflight report and checker.',
    acceptance_check: 'Operators can discover report:release-preflight and check:release-preflight-report from COMMERCIAL_SOURCE_OF_TRUTH, /status/release-health.json, RELEASE_HEALTH_EVIDENCE, and public-status validation without weakening any release-readiness, source-provenance, approval, or hosted/live boundary.',
    chosen_variant: 'minimal docs and public handle alignment',
    repo_pattern_reused: 'Existing public release status manifest, RELEASE_HEALTH_EVIDENCE command handles, source-doc checker, public-status generator, and launch evidence code-optimization ledger.',
    files_changed: releasePreflightSourceOfTruthHandleFilesChanged,
    tests_run: releasePreflightSourceOfTruthHandleTestsRun,
    proof: 'The existing focused report/check scripts were present, but the operator docs and public status handles still pointed release-preflight rows at broad commercial-launch artifacts; this patch routes release-specific handles to the focused commands while preserving blocker wording.',
    reason: 'A focused release-preflight report loses operator value if source-of-truth docs and public-safe handles keep sending release operators through broad manifests only.',
    proof_boundary: 'This record aligns documentation and public-safe command handles only; it does not install Corepack or Git LFS, run full release-readiness, clear source provenance, push, deploy, grant owner approval, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat focused release-preflight handles, public release-status validation, docs sync, generated /status JSON, or report-check success as release-readiness, production approval, deployment, or hosted/live parity.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-STRATEGY-AUDIT-SLICE-TIMEOUT-BUDGET',
    decision: 'Align subprocess-heavy production approval and strategy completion audit unit test budgets with the full strategy-audit release slice.',
    acceptance_check: 'The previously timeout-only strategy-audit slice cases run under the same 120000 ms budget as test:strategy-audit-slice, while their assertions still verify blocked production approval, local gate failure, and live-parity external-gate semantics.',
    chosen_variant: 'minimal Vitest timeout budget alignment',
    repo_pattern_reused: 'Existing Vitest vi.setConfig timeout pattern and package test:strategy-audit-slice timeout contract.',
    files_changed: strategyAuditSliceTimeoutFilesChanged,
    tests_run: strategyAuditSliceTimeoutTestsRun,
    proof: 'The production approval packet and strategy completion audit timeout cases passed in isolation after the full strategy slice exposed timeout-only failures; this patch aligns their file-level test budgets with the release slice rather than weakening assertions.',
    reason: 'The broad release-readiness strategy slice should fail on behavior, not on lower per-file timeout caps that conflict with subprocess-heavy fixture execution under the full suite.',
    proof_boundary: 'This record improves release-test reliability only; it does not clear source provenance, install Corepack, run release-readiness, clear branch review, collect buyer evidence, authorize Supabase advisors, grant owner approval, deploy, or prove hosted/live parity.',
    stop_gate: 'Do not treat a passing strategy-audit slice, larger test budget, or timeout fix as production approval, buyer acceptance, release-readiness execution, deployment, or hosted/live parity.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-FOCUSED-REPORT',
    decision: 'Expose current source-provenance status, dirty-path classification, isolation ledger, and resolution queue through a focused source-provenance report and checker.',
    acceptance_check: 'Operators can run report:source-provenance-readiness and check:source-provenance-report to inspect clean-source blockers, owner-decision rows, release preflight source status, and production approval source rows without mutating the staged rename or running release/deploy flows.',
    chosen_variant: 'minimal focused manifest wrapper and public handle alignment',
    repo_pattern_reused: 'Existing source_provenance, isolation_ledger, resolution_queue, release_preflight Clean source provenance row, production_approval prerequisite/request rows, focused report/check conventions, and public release-status handle validation.',
    files_changed: sourceProvenanceReportFilesChanged,
    tests_run: sourceProvenanceReportTestsRun,
    proof: 'The wrapper consumes the existing launch evidence manifest and renders Markdown/JSON source-provenance evidence, while the checker asserts dirty-path owner decisions, isolation and resolution ledgers, release/approval source rows, public/source-of-truth handles, and no-mutation boundaries.',
    reason: 'Source provenance was visible inside broad release and production approval reports but did not have a narrow operator handle for the current staged rename blocker.',
    proof_boundary: 'This record improves source-provenance evidence visibility only; it does not commit, unstage, stash, revert, delete, rename, move, clear source provenance, run release-readiness, push, deploy, grant owner approval, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat the focused source-provenance report, check pass, JSON output, skipped probes, public status handle, or docs sync as clean source provenance, release-readiness, production approval, deployment, or hosted/live parity.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-PROOF-HANDLES',
    decision: 'Route launch action, release preflight, source resolution/isolation, and production approval source proof rows to the focused source-provenance report and checker.',
    acceptance_check: 'Source-provenance rows across launch action, release preflight, source resolution/isolation, and production approval prerequisites/request attachments all expose report:source-provenance-readiness plus check:source-provenance-report while preserving the production approval packet as an approval artifact.',
    chosen_variant: 'minimal focused source proof-handle derivation',
    repo_pattern_reused: 'Existing SOURCE_PROVENANCE_FOCUSED_PROOF_COMMAND, source_provenance, release_preflight, launch_action_queue, production_approval prerequisite/request rows, and focused checker conventions.',
    files_changed: sourceProvenanceProofHandleFilesChanged,
    tests_run: sourceProvenanceProofHandleTestsRun,
    proof: 'The patch reuses the existing manifest source-provenance data and focused report/check handle, then asserts the focused command across source resolution, isolation ledger, release preflight, launch action, commercial report, and production approval source rows.',
    reason: 'Operators still saw broad production approval packet handles on source-provenance rows even after the focused source-provenance report/check existed, which made the first open source gate harder to inspect directly.',
    proof_boundary: 'This record aligns source-provenance proof handles only; it does not commit, unstage, stash, revert, delete, rename, move, mutate or clear source provenance, replace production approval request artifacts, run release-readiness, push, deploy, grant owner approval, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat focused source-provenance proof handles, skipped-probe report/check success, launch action row output, release preflight rows, or production approval attachment text as clean source provenance, release-readiness, production approval, deployment, hosted/live parity, or owner approval.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-RENAME-SUMMARY',
    decision: 'Make source-provenance blocker summaries rename-aware by carrying the existing old_path -> file_path owner-decision detail into launch action, release preflight, and production approval rows.',
    acceptance_check: 'When git status reports a staged rename, the source_provenance launch action blocker, Clean source provenance release-preflight row, production approval prerequisite, production approval request row, and source resolution/isolation evidence show the old path, new path, source_rename_decision proof type, and staged state.',
    chosen_variant: 'minimal source decision summary helper',
    repo_pattern_reused: 'Existing parsePorcelainStatusLine, classifyDirtyPath old_path capture, source_rename_decision proof type, source provenance resolution queue, release preflight source row, launch_action_queue source_provenance row, and production_approval source rows.',
    files_changed: sourceProvenanceRenameSummaryFilesChanged,
    tests_run: sourceProvenanceRenameSummaryTestsRun,
    proof: 'The patch reuses existing dirtyDetails and resolution_queue items, adds no git mutation or new parser, and formats the first source-provenance decision as status old_path -> file_path (proof_type; staging_state) wherever high-level launch readiness rows previously showed only a count or new path.',
    reason: 'The current top launch blocker was a staged rename, but the launch action row showed only first=.devin/workflows/master.md and the approval rows showed only a count, hiding the .windsurf -> .devin owner-decision context.',
    proof_boundary: 'This record improves source-provenance blocker readability only; it does not commit, unstage, stash, revert, delete, rename, move, mutate source, clear source provenance, run release-readiness, push, deploy, grant owner approval, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat rename-aware blocker summaries, source-provenance report/check success, skipped probes, launch action output, release preflight rows, or production approval attachment text as clean source provenance, owner approval, release-readiness, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PROOF-HANDLES',
    decision: 'Route launch action and production approval release-readiness proof rows through the focused release-preflight report/check before the guarded Corepack release-readiness command.',
    acceptance_check: 'Release-toolchain action and Corepack release-readiness approval rows expose report:release-preflight plus check:release-preflight-report and still require check:release-readiness before any deploy approval request can treat the release path as proven.',
    chosen_variant: 'minimal focused release proof-handle derivation',
    repo_pattern_reused: 'Existing release_preflight report/check commands, launch_action_queue release_toolchain row, production_approval Corepack release-readiness prerequisite/request rows, and focused checker conventions.',
    files_changed: releaseToolchainProofHandleFilesChanged,
    tests_run: releaseToolchainProofHandleTestsRun,
    proof: 'The patch reuses the existing release-preflight manifest data and focused report/check handle, then asserts that launch action, production approval prerequisite, production approval request, focused launch action, focused production approval, and commercial report outputs preserve both focused release-preflight proof and guarded release-readiness.',
    reason: 'Operators still saw broad launch-evidence manifest handles on release-toolchain proof rows even after the focused release-preflight report/check existed, while the lane summary already pointed to the focused release preflight proof path.',
    proof_boundary: 'This record aligns release-toolchain proof handles only; it does not install Corepack or Git LFS, run full release-readiness, clear source provenance, push, deploy, grant owner approval, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat focused release-preflight proof handles, skipped-probe report/check success, launch action row output, production approval attachment text, or bare pnpm checks as Corepack release-readiness, clean source provenance, production approval, deployment, hosted/live parity, or owner approval.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-PROOF-HANDLES',
    decision: 'Route launch action and production approval branch-review proof rows through the focused branch-review report/check while preserving read-only unmerged-branch packet evidence inside that report.',
    acceptance_check: 'Branch-review action and Canonical branch review approval rows expose report:branch-review-readiness plus check:branch-review-report, while branch-specific unmerged-branch packet commands, canonical-head ledgers, and no-branch-mutation gates remain available inside branch_review evidence.',
    chosen_variant: 'minimal focused branch proof-handle derivation',
    repo_pattern_reused: 'Existing branch_review focused report/check commands, launch_action_queue branch_review row, production_approval Canonical branch review prerequisite/request rows, review-first packets, top branch packet, and focused checker conventions.',
    files_changed: branchReviewProofHandleFilesChanged,
    tests_run: branchReviewProofHandleTestsRun,
    proof: 'The patch reuses the existing manifest branch_review data and focused report/check handle, then asserts that launch action, production approval prerequisite, production approval request, focused branch report, focused launch action, focused production approval, and commercial report outputs preserve focused branch review proof without clearing canonical-head decisions.',
    reason: 'Operators still saw unmerged-branch-only handles on branch-review proof rows even after the focused branch-review report/check existed, while the lane summary already pointed to the focused branch review proof path.',
    proof_boundary: 'This record aligns branch-review proof handles only; it does not checkout, merge, push, discard, delete, select canonical heads, run migrations, mutate Supabase, clear branch review, grant production approval, deploy, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat focused branch-review proof handles, report/check success, branch inventory, review-first packets, canonical-head ledgers, launch action row output, or production approval attachment text as branch approval, canonical-head owner selection, merge approval, release-readiness, production approval, deployment, hosted/live parity, or owner approval.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-PROOF-HANDLES',
    decision: 'Route launch action and production approval Supabase advisor proof rows through the focused Supabase advisor report/check while preserving external-account advisor evidence requirements.',
    acceptance_check: 'Supabase advisor action and Supabase advisor clearance approval rows expose report:supabase-advisor-readiness plus check:supabase-advisor-report, while connector authorization, Security Advisor evidence, Performance Advisor evidence, public-safe findings, and no-secret boundaries remain external-account prerequisites.',
    chosen_variant: 'minimal focused Supabase advisor proof-handle derivation',
    repo_pattern_reused: 'Existing supabase_advisor focused report/check commands, launch_action_queue supabase_advisor row, production_approval Supabase advisor prerequisite/request rows, clearance_deficits, remediation_queue, and focused checker conventions.',
    files_changed: supabaseAdvisorProofHandleFilesChanged,
    tests_run: supabaseAdvisorProofHandleTestsRun,
    proof: 'The patch reuses the existing manifest Supabase advisor data and focused report/check handle, then asserts that launch action, production approval prerequisite, production approval request, focused Supabase report, focused launch action, focused production approval, and commercial report outputs preserve focused Supabase advisor proof without clearing external-account evidence rows.',
    reason: 'Operators still saw dashboard-only proof handles on Supabase advisor proof rows even after the focused Supabase advisor report/check existed, while the focused report already separates local CLI lint from connector/dashboard advisor evidence.',
    proof_boundary: 'This record aligns Supabase advisor proof handles only; it does not authorize connectors, access dashboards, rerun Security Advisor or Performance Advisor, mutate the database, run migrations, record secrets, clear advisor findings, grant production approval, deploy, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat focused Supabase advisor proof handles, report/check success, skipped probes, CLI app lint output, launch action row output, or production approval attachment text as Supabase advisor clearance, database security clearance, release-readiness, production approval, deployment, hosted/live parity, or owner approval.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-FOCUSED-REPORT',
    decision: 'Expose Supabase advisor clearance deficits, remediation queue, launch action row, and production approval Supabase rows through a focused Supabase advisor report and checker.',
    acceptance_check: 'Operators can run report:supabase-advisor-readiness and check:supabase-advisor-report to inspect CLI lint freshness, connector authorization, Security Advisor evidence, Performance Advisor evidence, public-safe findings, no-clearance claim rows, and approval blockers without authorizing connectors, accessing dashboards, rerunning advisors, mutating databases, or recording secrets.',
    chosen_variant: 'minimal focused manifest wrapper and public handle alignment',
    repo_pattern_reused: 'Existing supabase_advisor, clearance_deficits, remediation_queue, launch_action_queue supabase_advisor row, production_approval prerequisite/request rows, focused report/check conventions, and public release-status handle validation.',
    files_changed: supabaseAdvisorReportFilesChanged,
    tests_run: supabaseAdvisorReportTestsRun,
    proof: 'The wrapper consumes the existing launch evidence manifest and renders Markdown/JSON Supabase advisor evidence, while the checker asserts the six clearance deficit rows, remediation queue, external-account flags, public-safe retained-record row, production approval rows, and no-secret/no-clearance boundaries.',
    reason: 'Supabase advisor clearance was visible inside broad launch artifacts but did not have a narrow operator handle separating local CLI app lint from external Security and Performance Advisor evidence.',
    proof_boundary: 'This record improves Supabase advisor evidence visibility only; it does not authorize connectors, access dashboards, rerun Security Advisor or Performance Advisor, mutate the database, run migrations, record secrets, clear advisor findings, grant production approval, deploy, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat the focused Supabase advisor report, check pass, JSON output, skipped probes, public status handle, CLI app lint pass, permission-denied connector output, or docs sync as Supabase advisor clearance, production approval, release-readiness, database security clearance, deployment, or hosted/live parity.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-FOCUSED-REPORT',
    decision: 'Expose branch review queues, canonical-head decisions, clearance matrix, review-first packets, and approval branch rows through a focused branch review report and checker.',
    acceptance_check: 'Operators can run report:branch-review-readiness and check:branch-review-report to inspect review-first branch families, canonical-head decisions, clearance matrix rows, top branch packet, changed Supabase function rows, launch action branch row, and production approval branch rows without checking out, merging, pushing, discarding, selecting canonical heads, migrating, deploying, or granting approval.',
    chosen_variant: 'minimal focused manifest wrapper and public handle alignment',
    repo_pattern_reused: 'Existing branch_review manifest object, launch_action_queue branch_review row, production_approval Canonical branch review rows, focused report/check conventions, and public release-status handle validation.',
    files_changed: branchReviewReportFilesChanged,
    tests_run: branchReviewReportTestsRun,
    proof: 'The wrapper consumes the existing launch evidence manifest and renders Markdown/JSON branch-review evidence, while the checker asserts the review queue, canonical-head decisions, canonical-head resolution queue, clearance matrix, review-first packets, top packet, approval rows, and no-branch-mutation boundaries.',
    reason: 'Branch review was visible inside the broad manifest and commercial launch report, but the active launch blocker needed a narrow operator handle for review-first and canonical-head execution without mutating branches.',
    proof_boundary: 'This record improves branch-review evidence visibility only; it does not checkout, merge, push, discard, delete, select canonical heads, run migrations, mutate Supabase, clear branch review, grant production approval, deploy, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat the focused branch review report, check pass, JSON output, skipped probes, public status handle, review queue, canonical-head ledger, clearance matrix, or focused packet as branch approval, canonical-head owner selection, merge approval, release-readiness, production approval, deployment, or hosted/live parity.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-SUPABASE-FUNCTION-IMPACT-CHECK',
    decision: 'Require the focused branch-review checker to validate top-branch Supabase function impact rows.',
    acceptance_check: 'check:branch-review-report validates that top_review_packet.changed_supabase_function_rows match the function count and preserve function names, changed paths, review focus, read-only git-diff checks, proof type, no-deploy boundaries, and stop gates.',
    chosen_variant: 'minimal branch checker hardening',
    repo_pattern_reused: 'Existing branch_review.top_review_packet changed_supabase_function_rows, focused branch-review report/check conventions, and launch manifest code-optimization ledger contract.',
    files_changed: branchReviewSupabaseFunctionImpactFilesChanged,
    tests_run: branchReviewSupabaseFunctionImpactTestsRun,
    proof: 'The patch strengthens the existing focused branch-review checker and unit test to enforce Supabase function impact rows already emitted by the top branch packet, without adding a new scanner or mutating branch state.',
    reason: 'The active branch blocker is a high-risk stale branch with changed Supabase functions; the report rendered those rows, but the focused checker did not yet make their shape and no-deploy boundaries a contract.',
    proof_boundary: 'This record improves branch-review function-impact validation only; it does not checkout, merge, push, discard, delete, select canonical heads, run migrations, deploy Supabase functions, alter secrets, change policies, clear Supabase advisor findings, grant production approval, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat Supabase function impact row validation, focused branch report/check success, skipped probes, branch packet output, or this code optimization ledger as branch approval, canonical-head owner selection, function deploy approval, Supabase advisor clearance, production approval, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-MANIFEST-BRANCH-FUNCTION-IMPACT-CHECK',
    decision: 'Require the broad launch evidence manifest checker to enforce the top-branch Supabase function impact row contract already enforced by the focused branch checker.',
    acceptance_check: 'check:launch-evidence-manifest rejects non-skipped top_review_packet payloads whose changed_supabase_function_rows do not match changed_supabase_function_count, omit the supabase/database category when function rows exist, or weaken function-path, review-focus, read-only git-diff, proof-boundary, and stop-gate semantics.',
    chosen_variant: 'minimal launch manifest checker hardening',
    repo_pattern_reused: 'Existing branch_review.top_review_packet changed_supabase_function_rows, assertChangedSupabaseFunctionReviewRow helper, focused branch-review checker contract, launch manifest checker branch_review block, and launch manifest code-optimization ledger.',
    files_changed: launchManifestBranchFunctionImpactFilesChanged,
    tests_run: launchManifestBranchFunctionImpactTestsRun,
    proof: 'The patch strengthens only the central launch manifest checker and unit contract, reusing existing top-branch function-impact rows and the focused branch checker semantics without adding a new scanner, checking out branches, deploying functions, or mutating Supabase.',
    reason: 'The focused branch checker made top-branch Supabase function impact rows a hard contract, but the broad launch manifest checker still accepted a non-skipped top packet whose row count or category could drift from changed_supabase_function_count.',
    proof_boundary: 'This record improves broad launch-manifest branch function-impact validation only; it does not checkout, merge, push, discard, delete, select canonical heads, run migrations, deploy Supabase functions, alter secrets, change policies, clear Supabase advisor findings, grant production approval, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat launch manifest function-impact row validation, focused branch report/check success, skipped probes, branch packet output, or this code optimization ledger as branch approval, canonical-head owner selection, function deploy approval, Supabase advisor clearance, production approval, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-EVIDENCE-VALIDATION-FOCUSED-REPORT',
    decision: 'Expose launch evidence validation as a focused readiness report and checker while preserving external validation semantics.',
    acceptance_check: 'Operators can run report:launch-evidence-validation-readiness and check:launch-evidence-validation-report to inspect the check:launch-evidence-manifest result, launch action validation row, production approval validation prerequisite, production approval request validation row, public handle, and no-self-certification boundaries without granting approval or changing launch status.',
    chosen_variant: 'minimal focused validation wrapper and public handle alignment',
    repo_pattern_reused: 'Existing check:launch-evidence-manifest validator, launch_action_queue row, production_approval prerequisite/request rows, focused report/check conventions, public release-status handle validation, and commercial source-of-truth command checks.',
    files_changed: launchEvidenceValidationReportFilesChanged,
    tests_run: launchEvidenceValidationReportTestsRun,
    proof: 'The wrapper consumes the existing launch evidence manifest, runs the existing launch evidence manifest checker, and renders Markdown/JSON validation readiness evidence while the checker asserts command result, launch-action row, production approval rows, public/source-of-truth handles, and no-self-certification/no-readiness boundaries.',
    reason: 'Launch evidence validation was a first-class predeploy row, but operators had to infer validation readiness from the broad manifest check and production approval packet rather than a narrow evidence handle.',
    proof_boundary: 'This record improves launch evidence validation visibility only; it does not self-certify the manifest, clear source provenance, run release-readiness, request owner approval, contact buyers, authorize Supabase, deploy, mutate live services, prove buyer acceptance, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat the focused launch evidence validation report, check pass, JSON output, production approval validation row, public status handle, or docs sync as production approval, buyer acceptance, clean source provenance, release-readiness, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-VALIDATION-PRODUCTION-APPROVAL-PROOF-HANDLES',
    decision: 'Route production approval launch-evidence validation prerequisite and request rows through the focused launch validation report/check while preserving the underlying manifest validation requirement.',
    acceptance_check: 'Production approval prerequisite and request rows for Launch evidence validation expose report:launch-evidence-validation-readiness plus check:launch-evidence-validation-report, while current/needed/attachment text still requires the underlying check:launch-evidence-manifest result before any approval request uses the packet.',
    chosen_variant: 'minimal production approval validation proof-handle alignment',
    repo_pattern_reused: 'Existing LAUNCH_EVIDENCE_VALIDATION_FOCUSED_PROOF_COMMAND, production_approval prerequisite/request rows, focused launch evidence validation checker, focused production approval checker, and launch manifest code-optimization ledger.',
    files_changed: launchValidationProductionApprovalProofHandleFilesChanged,
    tests_run: launchValidationProductionApprovalProofHandleTestsRun,
    proof: 'The patch reuses the existing focused validation report/check handle in production approval rows, keeps the raw manifest check as an underlying attachment requirement, and adds broad/focused checker plus unit coverage without changing approval eligibility or launch status.',
    reason: 'The launch action validation row already pointed to the focused validation report/check, but the production approval prerequisite and request rows still exposed only the raw broad manifest check, making approval evidence handles inconsistent for operators.',
    proof_boundary: 'This record aligns launch validation proof handles inside production approval only; it does not self-certify the manifest, clear source provenance, run release-readiness, request owner approval, contact buyers, authorize Supabase, deploy, mutate live services, prove buyer acceptance, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat focused launch validation proof handles, check:launch-evidence-manifest output, production approval row readiness, skipped probes, public status handles, or this code optimization ledger as production approval, buyer acceptance, clean source provenance, release-readiness, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-VALIDATION-STATUS',
    decision: 'Align the launch action validation row with the external focused validation gate so it no longer counts as a self-blocking action row.',
    acceptance_check: 'The launch action queue keeps the launch_evidence_validation phase, proof command, proof type, proof boundary, and stop gate, but reports that row as ready while the focused validation report/check and production approval validation rows remain the evidence to attach.',
    chosen_variant: 'minimal launch action row status alignment',
    repo_pattern_reused: 'Existing production approval validation circularity fix, focused launch evidence validation report/check, launch_action_queue row, and manifest/check/report test contracts.',
    files_changed: launchActionValidationStatusFilesChanged,
    tests_run: launchActionValidationStatusTestsRun,
    proof: 'The launch action row now points to report:launch-evidence-validation-readiness plus check:launch-evidence-validation-report and reports status ready, while source provenance, release toolchain, branch review, Supabase advisor, buyer evidence, owner approval, and post-deploy proof still keep the overall queue blocked.',
    reason: 'After the focused validation report passed and the production approval validation prerequisite/request row stopped self-blocking, the launch action queue still counted launch evidence validation as blocked, overstating the remaining action blockers.',
    proof_boundary: 'This record improves launch action queue status accuracy only; it does not self-certify the manifest, clear source provenance, run release-readiness, request owner approval, contact buyers, authorize Supabase, deploy, mutate live services, prove buyer acceptance, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat the ready launch_evidence_validation action row, focused validation check pass, JSON output, public status handle, or docs sync as production approval, buyer acceptance, clean source provenance, release-readiness, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-FOCUSED-REPORT',
    decision: 'Expose the manifest launch blocker action queue through a focused launch action readiness report and checker.',
    acceptance_check: 'Operators can run report:launch-action-readiness and check:launch-action-report to inspect the eight-step launch blocker queue, first open action, lane status summary, focused command handles, and no-execution boundaries without scanning broad launch artifacts or clearing any gate.',
    chosen_variant: 'minimal focused manifest wrapper and public handle alignment',
    repo_pattern_reused: 'Existing launch_action_queue rows, proof types, stop gates, focused report/check conventions, public release-status handle validation, and commercial source-of-truth command checks.',
    files_changed: launchActionReportFilesChanged,
    tests_run: launchActionReportTestsRun,
    proof: 'The wrapper consumes the existing launch evidence manifest and renders Markdown/JSON launch action evidence, while the checker asserts the stable eight-phase queue, first open action, lane status summary, public/source-of-truth handles, focused command handles, and no-execution/no-readiness boundaries.',
    reason: 'The top-level launch blocker action queue was present inside broad launch artifacts, but did not have a narrow operator handle for phase-wise execution planning across source, release, branch, Supabase, buyer, approval, and post-deploy lanes.',
    proof_boundary: 'This record improves launch action queue visibility only; it does not commit, unstage, stash, revert, clear source provenance, run release-readiness, checkout branches, merge, push, contact buyers, authorize Supabase, request owner approval, deploy, mutate live services, prove launch evidence validation, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat the focused launch action readiness report, check pass, JSON output, skipped probes, public status handle, or docs sync as clean source provenance, release-readiness, branch clearance, Supabase advisor clearance, buyer acceptance, production approval, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-BUYER-LANE-STATUS',
    decision: 'Align the launch action buyer evidence lane summary with buyer hard-gate and acquisition readiness instead of the broad buyer evidence scan status.',
    acceptance_check: 'When buyer hard-gate deficits are skipped/open or the acquisition matrix is non-ready, report:launch-action-readiness and check:launch-action-report keep lane_status_summary.buyer_evidence blocked while preserving the blocked launch action buyer row and no-contact/no-evidence boundaries.',
    chosen_variant: 'minimal launch action buyer lane status derivation',
    repo_pattern_reused: 'Existing buyer evidence gate readiness definition, launch action lane_status_summary, hard_gate_deficits, acquisition_matrix, focused launch action checker, and manifest code-optimization ledger.',
    files_changed: launchActionBuyerLaneStatusFilesChanged,
    tests_run: launchActionBuyerLaneStatusTestsRun,
    proof: 'The focused launch action report now derives buyer_evidence lane status from buyer_evidence.status, hard_gate_deficits.status, and acquisition_matrix.status, and exposes hard_gate_status plus acquisition_status in the lane summary.',
    reason: 'The launch action buyer row remained blocked, but the lane summary could report pass from the broad buyer evidence scan while hard-gate deficits and acquisition readiness were still skipped/open.',
    proof_boundary: 'This record improves launch action buyer lane status accuracy only; it does not contact buyers, create accepted evidence, attach retained artifacts, move confidence, validate 95%, clear buyer evidence, request production approval, deploy, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat the blocked buyer evidence lane summary, focused launch action report, JSON output, or checker pass as buyer acceptance, retained artifact proof, validate:pilot-evidence --require-95 success, production approval, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-PACKET-SEQUENCING',
    decision: 'Gate live static dist parity in the production approval packet on successful local release-readiness.',
    acceptance_check: 'When local release-readiness is skipped or fails, the production approval packet marks Live static dist parity as skipped with prerequisite-specific wording instead of running a dist comparison against a missing or stale build output.',
    chosen_variant: 'minimal prerequisite sequencing patch',
    repo_pattern_reused: 'Existing production approval packet step list, skippedStep helper, local release-readiness gate, static parity gate, and productionApprovalPacket unit harness.',
    files_changed: productionApprovalPacketSequencingFilesChanged,
    tests_run: productionApprovalPacketSequencingTestsRun,
    proof: 'The approval packet already treats local release-readiness as a pre-deploy blocker; this patch reuses that status to avoid a secondary static-parity failure that is caused by the failed build prerequisite rather than hosted artifact drift.',
    reason: 'Running static parity after Corepack release-readiness fails creates noisy evidence: the missing dist failure is downstream of the toolchain/build blocker and should not be treated as an independent live parity result.',
    proof_boundary: 'This record improves production approval packet sequencing only; it does not install Corepack, run release-readiness successfully, build dist, clear source provenance, approve production, deploy, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat skipped static parity, production approval packet generation, direct pnpm report execution, or focused unit tests as release-readiness, production approval, deployment, or hosted/live parity.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-FOCUSED-REPORT',
    decision: 'Expose the manifest production approval prerequisite queue and request packet through a focused production approval readiness report and checker.',
    acceptance_check: 'Operators can run report:production-approval-readiness and check:production-approval-report to inspect prerequisite rows, request phases, package-script handles, launch action rows, release preflight owner-approval rows, and no-approval boundaries without broad-report scanning or requesting approval.',
    chosen_variant: 'minimal focused manifest wrapper and public handle alignment',
    repo_pattern_reused: 'Existing production_approval.prerequisite_queue, production_approval.request_packet, launch_action_queue production_approval row, release_preflight Explicit owner production approval row, focused report/check conventions, and public release-status handle validation.',
    files_changed: productionApprovalReportFilesChanged,
    tests_run: productionApprovalReportTestsRun,
    proof: 'The wrapper consumes the existing launch evidence manifest and renders Markdown/JSON production approval readiness evidence, while the checker asserts prerequisite ordering, request phases, launch action rows, release preflight owner-approval rows, package-script handles, public/source-of-truth handles, and no-approval/no-deploy boundaries.',
    reason: 'Production approval prerequisites and request-packet rows were visible inside broad launch artifacts and the production approval packet, but did not have a narrow operator handle for deciding whether an approval request is structurally ready.',
    proof_boundary: 'This record improves production approval evidence visibility only; it does not grant owner approval, request approval, clear source provenance, run release-readiness successfully, clear branch review, authorize Supabase advisors, create buyer evidence, deploy, prove post-deploy live proof, or raise launch status.',
    stop_gate: 'Do not treat the focused production approval readiness report, check pass, JSON output, skipped probes, public status handle, or docs sync as clean source provenance, release-readiness, owner production approval, deployment, post-deploy live proof, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-POST-DEPLOY-LIVE-PROOF-FOCUSED-REPORT',
    decision: 'Expose the manifest post-deploy live proof gate queue through a focused post-deploy live proof report and checker.',
    acceptance_check: 'Operators can run report:post-deploy-live-proof-readiness and check:post-deploy-live-proof-report to inspect production approval clearance, guarded deploy completion, live public metadata, live static dist parity, hosted proof-pack smoke, current-source hosted parity claim, and production approval live rows without deploying or running live proof.',
    chosen_variant: 'minimal focused manifest wrapper and public handle alignment',
    repo_pattern_reused: 'Existing post_deploy_live_proof.gate_queue, launch_action_queue post_deploy_live_proof row, production_approval prerequisite/request rows, focused report/check conventions, and public release-status handle validation.',
    files_changed: postDeployLiveProofReportFilesChanged,
    tests_run: postDeployLiveProofReportTestsRun,
    proof: 'The wrapper consumes the existing launch evidence manifest and renders Markdown/JSON post-deploy gate evidence, while the checker asserts the six gate rows, package-script handles, approval phrase, production approval live rows, public/source-of-truth handles, and no-deploy/no-live-proof boundaries.',
    reason: 'Post-deploy proof sequencing was present inside broad launch artifacts, but did not have a narrow operator handle for the hosted/live parity blocker that follows explicit production approval.',
    proof_boundary: 'This record improves post-deploy proof visibility only; it does not grant owner approval, run deploys, push, rebuild, mutate Netlify, access live accounts, run browser smoke, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat the focused post-deploy live proof report, check pass, JSON output, skipped probes, public status handle, or docs sync as production approval, deployment, current-source hosted parity, commercial-ready status, or post-deploy live proof.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-COMPLETION-AUDIT-PROOF-HANDLES',
    decision: 'Route objective completion audit blocker rows through focused report/check handles while preserving their real external gate requirements.',
    acceptance_check: 'The completion audit buyer, branch, Supabase, release, and production/live rows expose the focused report/check handles as next proof commands, while stop gates still require retained buyer evidence, branch owner decisions, advisor evidence, guarded release-readiness, owner approval, deploy execution, and post-deploy live proof.',
    chosen_variant: 'minimal focused completion audit proof-handle derivation',
    repo_pattern_reused: 'Existing focused proof command constants, objectiveCompletionItem rows, launch evidence manifest checker, commercial readiness report checker, and launch manifest unit test contract.',
    files_changed: completionAuditProofHandleFilesChanged,
    tests_run: completionAuditProofHandleTestsRun,
    proof: 'The patch reuses existing focused report/check commands for buyer evidence, branch review, Supabase advisor, release preflight, production approval, and post-deploy proof, then asserts the exact command handles in the manifest, commercial report, and unit tests without changing launch gate status.',
    reason: 'The completion audit is the final operator-facing checklist for the broad goal, so its next proof handles should route through the lane-specific focused reports added in earlier phases instead of sending operators directly to raw validation, dashboard, release, deploy, or live-proof commands.',
    proof_boundary: 'This record aligns objective completion audit proof handles only; it does not contact buyers, create accepted evidence, run retained-artifact validation as clearance, authorize Supabase, access dashboards, checkout branches, merge, push, install tools, run release-readiness as clearance, request owner approval, deploy, run live proof, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat focused completion-audit proof handles, skipped-probe report/check success, manifest validation, commercial report output, or this code optimization ledger as buyer evidence, Supabase advisor clearance, branch approval, release-readiness, production approval, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-FINAL-PROOF-HANDLES',
    decision: 'Route final launch action production approval and post-deploy live proof rows through their focused report/check handles.',
    acceptance_check: 'The launch_action_queue production_approval row exposes report:production-approval-readiness plus check:production-approval-report, and the post_deploy_live_proof row exposes report:post-deploy-live-proof-readiness plus check:post-deploy-live-proof-report, while both rows remain manual_stop or blocked and downstream gate queues retain the raw deploy-request and post-deploy live commands.',
    chosen_variant: 'minimal focused final launch-action proof-handle derivation',
    repo_pattern_reused: 'Existing focused production approval report/check, focused post-deploy live proof report/check, launch_action_queue rows, focused launch action checker, and launch manifest unit contracts.',
    files_changed: launchActionFinalProofHandleFilesChanged,
    tests_run: launchActionFinalProofHandleTestsRun,
    proof: 'The patch reuses existing focused production approval and post-deploy report/check handles in the launch action queue, then asserts those handles in the focused launch action report, launch evidence manifest checker, commercial launch report checker, and focused unit tests without changing final gate status.',
    reason: 'The launch action queue is the phase-wise execution entry point; leaving its final two lanes on raw deploy-request and live-proof commands while earlier lanes route through focused reports made the operator path inconsistent.',
    proof_boundary: 'This record aligns final launch-action proof handles only; it does not request owner approval, grant approval, run deploy-production.sh, run netlify deploy, push, mutate branches, clear source provenance, run post-deploy live proof, run browser smoke, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat focused final launch-action proof handles, skipped-probe report/check success, focused launch action output, or this code optimization ledger as owner approval, deployment permission, deploy completion, post-deploy live proof, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-FIX-REPORT-FOCUSED-CHECKS',
    decision: 'Align fix_report.current_required_checks with the focused lane report/check handles while retaining guarded raw execution gates.',
    acceptance_check: 'The manifest Fix Report and commercial readiness Fix Report expose focused report/check handles for source provenance, launch evidence validation, launch action, release preflight, branch review, Supabase advisor, buyer evidence, production approval, and post-deploy live proof, while still listing the raw release-readiness, deploy-request, and post-deploy live gates for the eventual approved execution phase.',
    chosen_variant: 'minimal focused fix-report check-list alignment',
    repo_pattern_reused: 'Existing focused proof command constants, fix_report.current_required_checks rendering, launch evidence manifest checker, commercial readiness report checker, and launch manifest unit test contract.',
    files_changed: fixReportFocusedChecksFilesChanged,
    tests_run: fixReportFocusedChecksTestsRun,
    proof: 'The patch reuses existing focused proof command constants in fix_report.current_required_checks and asserts those exact handles in the manifest checker, commercial readiness report checker, and launch evidence manifest unit test without changing lane statuses.',
    reason: 'After focused lane reports were added, the top-level Fix Report still emphasized older broad/raw handles and did not present the safer inspection-first path now used by the launch action and completion audit surfaces.',
    proof_boundary: 'This record aligns the Fix Report command list only; it does not run focused reports as clearance, contact buyers, create accepted evidence, authorize Supabase, mutate branches, resolve source provenance, install tools, request owner approval, deploy, run post-deploy live proof, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat the focused Fix Report check list, skipped-probe report/check success, manifest validation, commercial report output, or this code optimization ledger as buyer evidence, Supabase advisor clearance, branch approval, source provenance cleanup, release-readiness, production approval, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PUBLIC-FIX-REPORT-COMMAND-HANDLES',
    decision: 'Route the public release-status Fix Report blocker-map handle through both report and checker commands.',
    acceptance_check: 'The fix_report_blocker_map public release-status item exposes report:commercial-launch-readiness, check:commercial-launch-readiness-report, report:launch-evidence-manifest, and check:launch-evidence-manifest, and the source-of-truth docs plus status posture tests assert that public-safe command path.',
    chosen_variant: 'minimal public Fix Report command-handle alignment',
    repo_pattern_reused: 'Existing public release-status generator contract, RELEASE_HEALTH_EVIDENCE handles, source/generated status JSON pair, COMMERCIAL_SOURCE_OF_TRUTH public-handle notes, statusPagePosture tests, and launch evidence code-optimization ledger.',
    files_changed: publicFixReportCommandFilesChanged,
    tests_run: publicFixReportCommandTestsRun,
    proof: 'The patch updates the canonical public release-status manifest, regenerated release-health JSON, RELEASE_HEALTH_EVIDENCE, generator validator, source-of-truth docs, and status tests so the Fix Report public handle validates the rendered report and structured manifest instead of only generating broad reports.',
    reason: 'The structured Fix Report now has focused required-check assertions; the public status item should point operators to the report/check pair that proves that contract rather than to report-only output.',
    proof_boundary: 'This record aligns public Fix Report command handles only; it does not run missing checks as clearance, contact buyers, create accepted evidence, authorize Supabase, mutate branches, resolve source provenance, install tools, request owner approval, deploy, run post-deploy live proof, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat public Fix Report command handles, public status sync, status posture tests, manifest validation, source-of-truth docs, or this code optimization ledger as buyer evidence, Supabase advisor clearance, branch approval, source provenance cleanup, release-readiness, production approval, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PROGRESS-DIGEST-FOCUSED-REPORT',
    decision: 'Expose progress update and bottleneck log evidence through a focused report/check pair and public-safe handles.',
    acceptance_check: 'Operators can run report:progress-digest-readiness and check:progress-digest-report to inspect progress_updates, bottleneck_log, public progress/bottleneck handles, package-script handles, target matrix, active bottleneck, root cause, and top unblock options without broad-report scanning or clearing any blocker.',
    chosen_variant: 'minimal focused progress and bottleneck digest wrapper',
    repo_pattern_reused: 'Existing manifest-backed focused report/check wrappers, public release-status generator contract, RELEASE_HEALTH_EVIDENCE handles, COMMERCIAL_SOURCE_OF_TRUTH public-handle notes, statusPagePosture tests, and launch evidence code-optimization ledger.',
    files_changed: progressDigestFocusedReportFilesChanged,
    tests_run: progressDigestFocusedReportTestsRun,
    proof: 'The patch adds a thin progress-digest report/check over existing progress_updates and bottleneck_log manifest fields, routes both public-safe handles through that report/check pair, and asserts package, public status, docs, manifest, and commercial report contracts without changing launch status.',
    reason: 'The commercial-launch skill requires progress updates and bottleneck logs, but the repo previously exposed those lanes only inside broad launch artifacts and public status report-only handles.',
    proof_boundary: 'This record improves progress and bottleneck evidence visibility only; it does not complete pending work, clear blockers, run missing checks as clearance, contact buyers, approve branches, authorize Supabase, resolve evidence gaps, request owner approval, deploy, mutate live services, prove hosted/live parity, or raise launch status.',
    stop_gate: 'Do not treat the focused progress digest report/check, public progress or bottleneck handles, generated status JSON, manifest validation, source-of-truth docs, or this code optimization ledger as production approval, buyer evidence, release readiness, branch approval, Supabase advisor clearance, source readiness, deployment approval, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-OBJECTIVE-COMPLETION-AUDIT-FOCUSED-REPORT',
    decision: 'Expose objective completion audit deliverable and blocker evidence through a focused report/check pair and public-safe handle.',
    acceptance_check: 'Operators can run report:objective-completion-audit-readiness and check:objective-completion-audit-report to inspect completion_audit summary counts, deliverable rows, goal-blocking rows, public status handle, package-script handles, and no-completion boundaries without broad-report scanning or clearing any blocker.',
    chosen_variant: 'minimal focused objective completion audit wrapper',
    repo_pattern_reused: 'Existing manifest-backed focused report/check wrappers, completion_audit manifest rows, public release-status generator contract, RELEASE_HEALTH_EVIDENCE handles, COMMERCIAL_SOURCE_OF_TRUTH public-handle notes, statusPagePosture tests, and launch evidence code-optimization ledger.',
    files_changed: objectiveCompletionAuditFocusedReportFilesChanged,
    tests_run: objectiveCompletionAuditFocusedReportTestsRun,
    proof: 'The patch adds a thin objective-completion report/check over existing completion_audit manifest fields, routes the public objective_completion_audit handle through that report/check pair, and asserts package, public status, docs, manifest, and commercial report contracts without changing launch status.',
    reason: 'The objective completion audit is the goal-level checklist, but the public status handle still required operators to scan broad launch artifacts instead of using a focused blocker/deliverable report.',
    proof_boundary: 'This record improves objective completion audit visibility only; it does not mark the launch goal complete, clear P0/P1 blockers, collect buyer evidence, contact buyers, approve branches, authorize Supabase, resolve source provenance, run release-readiness as clearance, request owner approval, deploy, mutate live services, prove hosted/live parity, prove production approval, prove buyer acceptance, or raise launch status.',
    stop_gate: 'Do not treat the focused objective completion audit report/check, public objective completion handle, generated status JSON, manifest validation, source-of-truth docs, or this code optimization ledger as launch-goal completion, production approval, buyer evidence, release readiness, branch approval, Supabase advisor clearance, source readiness, deployment approval, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-ADVERSARIAL-REVIEW-FOCUSED-REPORT',
    decision: 'Expose adversarial review claim-refutation lanes through a focused report/check pair and public-safe handle.',
    acceptance_check: 'Operators can run report:adversarial-review-readiness and check:adversarial-review-report to inspect adversarial_reviews lanes, proof types, findings, decisions, stop gates, public status handle, package-script handles, and no-readiness boundaries without broad-report scanning or clearing any blocker.',
    chosen_variant: 'minimal focused adversarial review wrapper',
    repo_pattern_reused: 'Existing manifest-backed focused report/check wrappers, adversarial_reviews manifest rows, public release-status generator contract, RELEASE_HEALTH_EVIDENCE handles, COMMERCIAL_SOURCE_OF_TRUTH public-handle notes, statusPagePosture tests, and launch evidence code-optimization ledger.',
    files_changed: adversarialReviewFocusedReportFilesChanged,
    tests_run: adversarialReviewFocusedReportTestsRun,
    proof: 'The patch adds a thin adversarial-review report/check over existing adversarial_reviews manifest fields, routes the public adversarial_review_ledger handle through that report/check pair, and asserts package, public status, docs, manifest, and commercial report contracts without changing launch status.',
    reason: 'The adversarial review ledger is the claim-refutation surface for launch synthesis, but the public status handle still required operators to scan broad launch artifacts instead of using a focused challenge-lane report.',
    proof_boundary: 'This record improves adversarial review visibility only; it does not prove production approval, create buyer evidence, contact buyers, prove buyer acceptance, run release-readiness as clearance, authorize Supabase, clear Supabase advisor findings, approve branches, resolve source provenance, request owner approval, deploy, mutate live services, prove hosted/live parity, clear launch blockers, or raise launch status.',
    stop_gate: 'Do not treat the focused adversarial review report/check, public adversarial review handle, generated status JSON, manifest validation, source-of-truth docs, or this code optimization ledger as launch-goal completion, production approval, buyer evidence, release readiness, branch approval, Supabase advisor clearance, source readiness, deployment approval, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-PUBLIC-CHECK-HANDLES',
    decision: 'Route every public release-preflight deficit, remediation, and clearance handle through the focused release-preflight report/check pair.',
    acceptance_check: 'The release_toolchain_approval_deficit_ledger, release_preflight_remediation_queue, and release_preflight_clearance_matrix public status rows expose report:release-preflight plus check:release-preflight-report, and public-status generation/tests reject stale report-only manifest handles.',
    chosen_variant: 'minimal public release-preflight checker alignment',
    repo_pattern_reused: 'Existing focused release-preflight report/check scripts, public release-status generator contract, RELEASE_HEALTH_EVIDENCE handles, statusPagePosture tests, launch evidence manifest ledger, and commercial readiness checker.',
    files_changed: releasePreflightPublicCheckHandleFilesChanged,
    tests_run: releasePreflightPublicCheckHandleTestsRun,
    proof: 'The patch updates the three stale public release-preflight command rows in RELEASE_HEALTH_EVIDENCE, the source public manifest, regenerated release-health JSON, generator validation, and status tests so each release-preflight public handle validates the focused wrapper instead of only rendering broad manifest output.',
    reason: 'The release-preflight lane already has a focused structural checker, but three public status handles still pointed operators at report-only launch manifest output, leaving a weaker proof handle than adjacent public release gates.',
    proof_boundary: 'This record aligns public release-preflight command handles only; it does not install Corepack or Git LFS, run full release-readiness, clear source provenance, push, deploy, grant owner approval, prove hosted/live parity, prove production approval, or raise launch status.',
    stop_gate: 'Do not treat focused release-preflight public handles, public release-status validation, generated status JSON, report/check success, skipped probes, or this code optimization ledger as release-readiness, production approval, deployment, hosted/live parity, source provenance cleanup, owner approval, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PNPM-DIAGNOSTIC',
    decision: 'Expose bare pnpm --version as local-shell diagnostic context while preserving Corepack pnpm as the only release resolver gate.',
    acceptance_check: 'The release_preflight payload and focused/commercial reports show diagnostic_command=pnpm --version and diagnostic_current for the Corepack row, while the Corepack probe remains blocked whenever corepack pnpm --version fails.',
    chosen_variant: 'minimal non-clearance bare pnpm diagnostic',
    repo_pattern_reused: 'Existing release_preflight.toolchain_probe_ledger, focused release-preflight report/check, commercial readiness report, and launch manifest checker contracts.',
    files_changed: releaseToolchainPnpmDiagnosticFilesChanged,
    tests_run: releaseToolchainPnpmDiagnosticTestsRun,
    proof: 'The patch adds a bare pnpm diagnostic field to the existing Corepack ledger row, renders it in focused and broad Markdown, and asserts that matching bare pnpm output does not satisfy Corepack, release-readiness, source provenance, deploy, or owner approval.',
    reason: 'The current release shell can have /opt/homebrew/bin/pnpm 10.23.0 available while corepack is missing; operators need that distinction visible without weakening the Corepack-pinned release evidence contract.',
    proof_boundary: 'This record adds diagnostic visibility only; it does not install Corepack, treat bare pnpm as Corepack evidence, run release-readiness, clear source provenance, push, deploy, grant owner approval, prove hosted/live parity, prove production approval, or raise launch status.',
    stop_gate: 'Do not treat bare pnpm diagnostics, matching bare pnpm version output, focused release-preflight report/check success, skipped probes, or this code optimization ledger as Corepack-pinned release-readiness, source provenance cleanup, push-path proof, production approval, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-GIT-LFS-HOOK-DIAGNOSTIC',
    decision: 'Expose Git LFS hook-path diagnostics on the existing Git LFS push-path proof row.',
    acceptance_check: 'The release_preflight payload and focused/commercial reports show the configured hook path, post-commit/pre-push hook locations, hook requirement for git-lfs on PATH, and current-shell git-lfs binary resolution without treating that diagnostic as future commit or push clearance.',
    chosen_variant: 'minimal Git LFS hook-path diagnostic',
    repo_pattern_reused: 'Existing release_preflight.toolchain_probe_ledger, Git LFS push-path proof row, focused release-preflight report/check, commercial readiness report, and launch manifest checker contracts.',
    files_changed: releaseToolchainGitLfsHookDiagnosticFilesChanged,
    tests_run: releaseToolchainGitLfsHookDiagnosticTestsRun,
    proof: 'The patch keeps the two-row toolchain ledger intact, adds hook-path diagnostic fields to the Git LFS row, and validates those fields in focused and broad report checkers plus unit tests.',
    reason: 'The commit hook emitted a real warning when git-lfs was absent from the Git hook PATH, while a PATH-injected release-preflight run could still pass git lfs version; operators need that hook-path risk visible before push or deploy evidence is trusted.',
    proof_boundary: 'This record adds Git LFS hook-path diagnostic visibility only; it does not rewrite hooks, install Git LFS, guarantee future commit or push hook PATH, clear source provenance, push, deploy, grant owner approval, prove hosted/live parity, prove production approval, or raise launch status.',
    stop_gate: 'Do not treat Git LFS hook diagnostics, matching git-lfs version output, focused release-preflight report/check success, skipped probes, or this code optimization ledger as future commit-hook proof, push-path proof, source provenance cleanup, production approval, deployment, hosted/live parity, or commercial-ready status.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-COREPACK-ENV-DIAGNOSTIC',
    decision: 'Expose current-shell tool resolution inside the hard Corepack toolchain gate when Corepack is missing.',
    acceptance_check: 'check:corepack-toolchain exits nonzero on missing Corepack while showing the expected pnpm packageManager pin, current PATH, current corepack resolution, bare pnpm version context, and git-lfs context without accepting bare pnpm as release evidence.',
    chosen_variant: 'minimal Corepack environment diagnostic',
    repo_pattern_reused: 'Existing check-corepack-toolchain hard gate, release_preflight non-clearance diagnostic language, and launch manifest code-optimization ledger contract.',
    files_changed: releaseToolchainCorepackEnvDiagnosticFilesChanged,
    tests_run: releaseToolchainCorepackEnvDiagnosticTestsRun,
    proof: 'The patch adds environment diagnostics to the existing hard-failing Corepack checker and covers the missing-Corepack plus matching bare-pnpm case in the focused unit test without adding a release fallback; direct node scripts/check-corepack-toolchain.mjs output is expected to remain nonzero while Corepack is missing.',
    reason: 'The manifest-level release-preflight report already separated Corepack, bare pnpm, and Git LFS context, but the standalone release gate still stopped with a terse ENOENT that hid the shell split operators need to remediate correctly.',
    proof_boundary: 'This record adds current-shell diagnostic visibility only; it does not install Corepack, enable Corepack, rewrite PATH, treat bare pnpm as Corepack evidence, run release-readiness, clear source provenance, push, deploy, grant owner approval, prove hosted/live parity, prove production approval, or raise launch status.',
    stop_gate: 'Do not treat Corepack checker diagnostics, matching bare pnpm version output, git-lfs context, skipped probes, or this code optimization ledger as Corepack-pinned release-readiness, source provenance cleanup, push-path proof, production approval, deployment, hosted/live parity, or commercial-ready status.',
  },
];

const safeFixRejectedVariants = [
  {
    task_id: 'CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES',
    variant: 'Leave implementation_decisions, rejected_variants, and code_optimization_reviews empty.',
    reason_rejected: 'Would keep the manifest inconsistent with the code-optimization gate after a repo-side code-changing phase.',
    tradeoff: 'No-code defer avoids edits but loses auditable proof of why the preview TypeScript gate fix was minimal and bounded.',
    evidence: 'The orchestrator schema explicitly requires implementation and optimization evidence when fix_report.files_changed is non-empty.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES',
    variant: 'Reconstruct every historical safe-fix commit in the manifest.',
    reason_rejected: 'Broader history reconstruction would be brittle and would blur current verified evidence with older phase summaries.',
    tradeoff: 'A current safe-fix record is narrower and keeps the report tied to verified preview-build and manifest checks.',
    evidence: 'Current launch evidence is generated from repo state and current verification commands, not full git history replay.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES',
    variant: 'Add a separate new proof artifact for the preview TypeScript gate fix.',
    reason_rejected: 'A new artifact would add another maintenance surface when the manifest schema already has the required fields.',
    tradeoff: 'Using existing fields keeps validation centralized in check:launch-evidence-manifest and validate_launch_evidence.py.',
    evidence: 'fix_report, implementation_decisions, rejected_variants, and code_optimization_reviews are already required top-level manifest keys.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-VALIDATION-CIRCULARITY',
    variant: 'Leave Launch evidence validation blocked inside the request packet.',
    reason_rejected: 'The production approval packet already runs the validation command first, so the manifest row created a circular blocker that could never clear in the real request flow.',
    tradeoff: 'No-code defer preserves conservative output but keeps operator evidence internally inconsistent.',
    evidence: 'report-production-approval-packet shows Launch evidence manifest validation passing while production_approval.request_packet lists the same row as a blocking pre-request gate.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-VALIDATION-CIRCULARITY',
    variant: 'Run check-launch-evidence-manifest from report-launch-evidence-manifest.',
    reason_rejected: 'The check command invokes the manifest generator, so calling it from the generator would introduce recursion and risk non-termination.',
    tradeoff: 'Embedding validation would look self-contained but would make the generator unsafe and harder to reason about.',
    evidence: 'scripts/check-launch-evidence-manifest.mjs consumes the JSON emitted by scripts/report-launch-evidence-manifest.mjs.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-VALIDATION-CIRCULARITY',
    variant: 'Patch report-production-approval-packet to hide or rewrite the manifest request rows after validation.',
    reason_rejected: 'A report-only override would leave the structured manifest inconsistent with the operator-facing packet and with downstream report checks.',
    tradeoff: 'Synthesis-only patch is narrower at runtime but weaker as source-of-truth evidence.',
    evidence: 'The commercial launch report and manifest validator both read production_approval.request_packet directly.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-QUEUE-STATUS',
    variant: 'Leave branch_review.review_queue.status as pass while review_first_count is nonzero.',
    reason_rejected: 'Would keep the queue internally inconsistent with the blocked branch clearance matrix and production approval prerequisite.',
    tradeoff: 'No-code defer avoids edits but weakens operator evidence for the branch review gate.',
    evidence: 'The current read-only branch report identifies review-first high-risk/stale families while the manifest queue previously emitted status=pass.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-QUEUE-STATUS',
    variant: 'Attempt to retire, merge, delete, checkout, or push branch heads to clear the blocker.',
    reason_rejected: 'Branch ownership decisions are explicitly outside the safe-fix lane and require owner approval.',
    tradeoff: 'Clearing branch state would reduce blockers but would mutate branch/source state and violate the read-only branch-review boundary.',
    evidence: 'Branch report stop gates require no checkout, merge, push, discard, deploy, migration, or production approval without explicit owner approval and release gates.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-QUEUE-STATUS',
    variant: 'Add a separate branch-review artifact for queue status.',
    reason_rejected: 'The manifest and commercial report already expose the branch review queue, clearance matrix, and canonical-head ledgers.',
    tradeoff: 'A new artifact would add maintenance surface without improving the source-of-truth manifest contract.',
    evidence: 'scripts/report-commercial-launch-readiness.mjs renders branch_review.review_queue directly from the manifest.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-STARTER-REGISTER-BOUNDARY',
    variant: 'Leave starter registers counted only as production pilot evidence registers.',
    reason_rejected: 'Would preserve a confusing summary where generated zero-confidence starter CSVs look like production buyer evidence inputs.',
    tradeoff: 'No-code defer avoids edits but keeps a weak proof boundary in the buyer-evidence handoff.',
    evidence: 'The Phase F workspace smoke creates starter registers that pass base validation while the hard 95% gate remains blocked.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-STARTER-REGISTER-BOUNDARY',
    variant: 'Ignore all starter registers during readiness scanning.',
    reason_rejected: 'Would hide useful operator scaffolding and make workspace reports less actionable after collection begins.',
    tradeoff: 'Ignoring starter files is more conservative but loses visibility into whether the Phase F intake workspace exists.',
    evidence: 'report:phase-f-evidence-workspace needs to show selected starter registers while still reporting buyer proof created=no.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-STARTER-REGISTER-BOUNDARY',
    variant: 'Treat any base-valid register as ready acquisition evidence.',
    reason_rejected: 'Base validation only proves CSV shape and claim-boundary fields; it does not prove accepted buyer rows or retained artifacts.',
    tradeoff: 'Would simplify acquisition status but would violate the hard buyer-evidence gate.',
    evidence: 'validate:pilot-evidence --require-95 fails for starter registers until real buyer-supplied retained artifacts and accepted rows exist.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-GATE-FOCUSED-REPORT',
    variant: 'Leave buyer evidence hard-gate details only inside the broad launch manifest and commercial launch report.',
    reason_rejected: 'Would keep the active buyer evidence blocker harder to inspect despite it being a production approval prerequisite and launch action queue row.',
    tradeoff: 'No-code defer avoids a wrapper but preserves operator ambiguity between raw evidence scanning and approval-gate synthesis.',
    evidence: 'The public status exposed buyer hard-gate, acquisition, and remediation handles, but they still pointed to broad launch artifacts rather than a focused gate report.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-GATE-FOCUSED-REPORT',
    variant: 'Duplicate buyer evidence readiness scanning in a standalone hard-gate implementation.',
    reason_rejected: 'Duplicating CSV scanning, hard-gate parsing, and acquisition/remediation synthesis would drift from the launch manifest and buyer readiness report contracts.',
    tradeoff: 'A standalone scanner could avoid manifest generation but would create another buyer-proof source of truth.',
    evidence: 'report-launch-evidence-manifest already emits buyer_evidence, hard_gate_deficits, acquisition_matrix, remediation_queue, launch_action_queue, and production_approval rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-GATE-FOCUSED-REPORT',
    variant: 'Contact buyers, create evidence workspaces, or update pilot evidence registers from the focused report.',
    reason_rejected: 'Buyer contact and accepted evidence creation require operator-owned real anonymized buyer inputs and retained artifacts, not a local evidence wrapper.',
    tradeoff: 'Automatic evidence creation would look more complete but would fabricate or mutate buyer-proof state and violate the hard 95% gate.',
    evidence: 'Buyer evidence proof boundaries require real accepted buyer-supplied rows, retained redacted artifacts, and validate:pilot-evidence --require-95 before confidence moves.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-GATE-FOCUSED-REPORT',
    variant: 'Add package scripts only and leave public status, release posture, docs, and validators on broad buyer evidence handles.',
    reason_rejected: 'Operators would still discover stale broad commands from public and source-of-truth surfaces.',
    tradeoff: 'Package-only is smaller but leaves machine-visible evidence handles inconsistent with the new focused report.',
    evidence: 'generate-public-release-status, RELEASE_HEALTH_EVIDENCE, COMMERCIAL_SOURCE_OF_TRUTH, and statusPagePosture tests assert exact operator-facing command handles.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PROOF-HANDLES',
    variant: 'Leave launch action and production approval buyer rows pointing only at raw validate:pilot-evidence placeholders.',
    reason_rejected: 'Would bypass the focused hard-gate report that explains open deficits, acquisition rows, remediation rows, and no-buyer-proof boundaries before validation can be meaningful.',
    tradeoff: 'No-code defer avoids touching proof rows, but it preserves operator ambiguity across launch action and production approval buyer gates.',
    evidence: 'The focused buyer evidence gate report already renders the launch action buyer row, production approval prerequisite, and production approval request row from the manifest.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PROOF-HANDLES',
    variant: 'Run validate:pilot-evidence or create/update buyer evidence artifacts to clear the buyer blocker.',
    reason_rejected: 'Real buyer evidence requires operator-owned accepted rows and retained redacted artifacts; generating or mutating those from a proof-handle phase would fabricate or overstep evidence.',
    tradeoff: 'Direct remediation could reduce blocker counts, but it would violate no-contact, no-fabrication, and owner-controlled evidence boundaries.',
    evidence: 'Buyer evidence remediation rows require accepted buyer-supplied rows, retained redacted artifacts, and validate:pilot-evidence --require-95 before readiness changes.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PROOF-HANDLES',
    variant: 'Treat focused buyer gate report/check success as accepted buyer evidence or 95% validation.',
    reason_rejected: 'The focused report/check verifies structure and conservative boundaries only; it does not create accepted rows, retained artifacts, commercial commitment evidence, or 95% validation proof.',
    tradeoff: 'Promoting the report to clearance would simplify the approval path but materially overstate buyer proof.',
    evidence: 'The buyer evidence report proof boundary says it does not contact buyers, create accepted evidence, attach retained artifacts, validate 95%, or grant production approval.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PROOF-HANDLES',
    variant: 'Duplicate buyer evidence readiness or remediation parsing in launch action or production approval rows.',
    reason_rejected: 'Duplicating buyer parsing would create another source of truth for the same hard-gate, acquisition, and remediation state.',
    tradeoff: 'Inline parsing could make those rows self-contained, but it would drift from the manifest-backed buyer gate report/check.',
    evidence: 'report-launch-evidence-manifest already emits buyer_evidence, hard_gate_deficits, acquisition_matrix, remediation_queue, launch_action_queue, and production_approval rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PUBLIC-GATE-HANDLE',
    variant: 'Leave the public buyer_evidence_gate command pointing directly at path/to register and evidence-root placeholders.',
    reason_rejected: 'Would keep the top public buyer 95% gate less actionable than the focused buyer evidence report/check that already explains current deficits.',
    tradeoff: 'No-code defer preserves the raw final validator command but keeps operators pointed at dummy file paths before they inspect missing evidence.',
    evidence: 'The public buyer_evidence_gate command still used path/to/register.csv and path/to/redacted-artifacts while adjacent buyer deficit, acquisition, and remediation handles already used the focused report/check pair.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PUBLIC-GATE-HANDLE',
    variant: 'Run validate:pilot-evidence or create/update buyer evidence artifacts from the public status or checklist phase.',
    reason_rejected: 'The final validator requires real accepted buyer rows and retained redacted artifacts; generating or mutating those locally would fabricate or overstep buyer proof.',
    tradeoff: 'Direct validation might reduce apparent blocker distance if files existed, but this safe-fix phase has no real buyer evidence inputs and must not create them.',
    evidence: 'The buyer hard-gate rows require accepted buyer-supplied evidence, reviewer evidence, commercial signal, retained artifacts, and validate:pilot-evidence --require-95 before confidence moves.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PUBLIC-GATE-HANDLE',
    variant: 'Create a second public buyer gate checker instead of reusing the focused buyer evidence gate report/check.',
    reason_rejected: 'A second checker would duplicate buyer hard-gate, acquisition, remediation, launch action, and production approval buyer-row validation.',
    tradeoff: 'A bespoke checker could target only the public row, but it would add drift against the existing focused buyer evidence gate checker.',
    evidence: 'scripts/check-buyer-evidence-gate-readiness-report.mjs already validates the buyer hard-gate deficit ledger, acquisition matrix, remediation queue, launch action row, production approval prerequisite, and production approval request row.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-FOCUSED-REPORT',
    variant: 'Leave release preflight only inside the large launch manifest and commercial launch report.',
    reason_rejected: 'Would keep the current Corepack, Git LFS, source provenance, and approval rows harder to inspect during release-specific blocker work.',
    tradeoff: 'No-code defer avoids a wrapper but increases operator load and makes release-specific proof refreshes less precise.',
    evidence: 'The launch action queue asks operators to refresh the release toolchain probe ledger, but no focused package script exposed that lane directly.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-FOCUSED-REPORT',
    variant: 'Duplicate release preflight probing logic in a new standalone implementation.',
    reason_rejected: 'Duplicating Corepack, Git LFS, source provenance, and approval-packet logic would create drift risk from the source-of-truth manifest.',
    tradeoff: 'A standalone probe could be narrower at runtime, but it would require another launch-readiness contract to maintain.',
    evidence: 'report-launch-evidence-manifest already emits release_preflight, toolchain_probe_ledger, clearance_matrix, remediation_queue, source_provenance, and production_approval.request_packet.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-FOCUSED-REPORT',
    variant: 'Make the focused checker pass the release gate or install Corepack/Git LFS automatically.',
    reason_rejected: 'A report/check wrapper must not mutate the operator environment or turn blocker visibility into release approval.',
    tradeoff: 'Automatic remediation would appear more convenient but would violate the release approval and tool-truth boundaries.',
    evidence: 'The commercial launch skill and existing check-corepack-toolchain gate require Corepack-pinned release evidence and forbid treating local shims or bare pnpm as release readiness.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-SOURCE-OF-TRUTH-HANDLES',
    variant: 'Leave source-of-truth docs and public handles pointing only at broad launch manifest and commercial readiness reports.',
    reason_rejected: 'Would keep operator-facing release-preflight handles stale after the focused report/check scripts were added.',
    tradeoff: 'No-code defer avoids more validation edits but preserves documentation and public-status drift.',
    evidence: 'COMMERCIAL_SOURCE_OF_TRUTH, RELEASE_HEALTH_EVIDENCE, and public release-status command rows did not name report:release-preflight or check:release-preflight-report for the release-preflight lane.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-SOURCE-OF-TRUTH-HANDLES',
    variant: 'Update only COMMERCIAL_SOURCE_OF_TRUTH and leave public status/release posture commands unchanged.',
    reason_rejected: 'Would fix a prose doc while leaving the machine-visible public status manifest and release health evidence on stale commands.',
    tradeoff: 'Docs-only is narrower, but weaker because public/status and RELEASE_HEALTH_EVIDENCE remain the operator-facing evidence handles.',
    evidence: 'scripts/generate-public-release-status.mjs treats command values as exact contracts, and tests/unit/statusPagePosture.test.ts asserts those handles.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-SOURCE-OF-TRUTH-HANDLES',
    variant: 'Fold focused release-preflight report logic into release-readiness or production deploy scripts.',
    reason_rejected: 'Would blur evidence visibility with release execution and risk making a report/check path look like approval or deploy readiness.',
    tradeoff: 'A single release command looks simpler, but the current blocker is source-of-truth discoverability rather than execution.',
    evidence: 'The release-preflight report/check are intentionally non-mutating wrappers over manifest data and must not run release-readiness, push, deploy, or grant approval.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-STRATEGY-AUDIT-SLICE-TIMEOUT-BUDGET',
    variant: 'Leave the lower per-file timeout caps and continue treating the broad strategy-audit slice timeout as residual noise.',
    reason_rejected: 'Would leave a release-readiness slice that can fail on timing despite the same cases passing in isolation.',
    tradeoff: 'No-code defer avoids touching tests, but preserves an avoidable release-gate reliability failure.',
    evidence: 'test:strategy-audit-slice timed out in three subprocess-heavy cases, while those exact cases passed when rerun in isolation.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-STRATEGY-AUDIT-SLICE-TIMEOUT-BUDGET',
    variant: 'Remove or skip the slow production approval and strategy completion audit cases from the strategy-audit slice.',
    reason_rejected: 'Would weaken release evidence for production approval blocker handling and live-parity external-gate behavior.',
    tradeoff: 'Skipping tests shortens runtime but lowers the commercial-readiness proof surface.',
    evidence: 'The timed-out cases verify source/local gate failure handling, stale live parity, and deployment request boundaries.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-STRATEGY-AUDIT-SLICE-TIMEOUT-BUDGET',
    variant: 'Rewrite the subprocess fixture harnesses and report scripts to reduce runtime.',
    reason_rejected: 'A harness rewrite is broader than required for timeout-only failures and risks changing approval/report behavior.',
    tradeoff: 'Runtime optimization could be useful later, but the current blocker is mismatch between file-level and release-slice timeout budgets.',
    evidence: 'The tests already complete quickly in isolation when given a clean execution window; the minimal defect is the per-file timeout cap.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-FOCUSED-REPORT',
    variant: 'Leave source provenance only inside release preflight, production approval packet, and commercial launch reports.',
    reason_rejected: 'Would keep the active dirty-source blocker harder to inspect than release preflight despite source provenance being a prerequisite for every deploy approval request.',
    tradeoff: 'No-code defer avoids a wrapper but preserves operator ambiguity and broad-report scanning.',
    evidence: 'The current release preflight report points Clean source provenance at the production approval packet, but no focused package script exposed only the source-provenance lane.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-FOCUSED-REPORT',
    variant: 'Duplicate git status parsing and dirty-path classification in a standalone source-provenance implementation.',
    reason_rejected: 'Duplicating source classification would drift from the launch manifest and production approval packet contracts.',
    tradeoff: 'A standalone parser could avoid manifest generation but would add another release-critical source of truth.',
    evidence: 'report-launch-evidence-manifest already emits source_provenance.dirty_paths, isolation_ledger, resolution_queue, release_preflight, and production_approval rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-FOCUSED-REPORT',
    variant: 'Automatically commit, unstage, stash, revert, or rename paths to clear source provenance.',
    reason_rejected: 'The staged rename is an owner-decision item and unrelated user work must not be mutated without explicit owner intent.',
    tradeoff: 'Automatic cleanup would remove the blocker but would violate the safe-fix lane and dirty-worktree policy.',
    evidence: 'The source_provenance resolution queue stop gate says no commit, unstage, stash, revert, delete, rename, or move without explicit owner intent.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-FOCUSED-REPORT',
    variant: 'Add package scripts only and leave docs, public status, release posture, and validators on broad source-provenance handles.',
    reason_rejected: 'Operators would still discover stale broad commands from the public/source-of-truth surfaces.',
    tradeoff: 'Package-only is smaller but leaves machine-visible evidence handles inconsistent with the new focused report.',
    evidence: 'generate-public-release-status, RELEASE_HEALTH_EVIDENCE, COMMERCIAL_SOURCE_OF_TRUTH, and statusPagePosture tests assert exact operator-facing command handles.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-PROOF-HANDLES',
    variant: 'Leave source-provenance action and release rows pointing at the broad production approval packet.',
    reason_rejected: 'Would keep the first open source gate routed through a broader approval artifact even though the focused source-provenance report/check now exists.',
    tradeoff: 'No-code defer avoids touching proof rows, but it preserves operator ambiguity across launch action, release preflight, source resolution, and production approval source prerequisites.',
    evidence: 'The focused source-provenance report/check already renders dirty-path classification, isolation ledger, resolution queue, release source row, and production approval source rows from one manifest source of truth.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-PROOF-HANDLES',
    variant: 'Replace the production approval packet as an approval-request artifact.',
    reason_rejected: 'The production approval packet still owns approval-request sequencing and attachment context; source proof handles should narrow inspection without removing approval packet semantics.',
    tradeoff: 'Replacing the packet would make source rows narrower but would blur the request packet boundary and risk dropping broader prerequisite evidence.',
    evidence: 'production_approval.request_packet keeps the owner-decision, prerequisite, and post-deploy rows that are separate from source-provenance classification.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-PROOF-HANDLES',
    variant: 'Automatically commit, unstage, stash, revert, delete, rename, or move the staged workflow rename.',
    reason_rejected: 'The staged rename is unrelated owner work and remains an explicit source-provenance decision item.',
    tradeoff: 'Mutating the staged rename could clear the source gate locally, but it would violate the dirty-worktree and source-provenance owner-decision boundaries.',
    evidence: 'git status shows .windsurf/workflows/master.md -> .devin/workflows/master.md staged before this phase, and the source resolution stop gate requires explicit owner intent before mutation.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-PROOF-HANDLES',
    variant: 'Add a new source-provenance command instead of reusing the focused source-provenance report/check.',
    reason_rejected: 'A new command would add another operator handle for the same manifest-backed source data and increase drift risk.',
    tradeoff: 'A bespoke command could be even narrower, but it is unnecessary while report:source-provenance-readiness and check:source-provenance-report already cover the required rows.',
    evidence: 'The sourceProvenanceReportTestsRun and focused checker already validate dirty paths, isolation, resolution, release preflight, and production approval source rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-RENAME-SUMMARY',
    variant: 'Leave high-level source summaries as dirty counts or new-path-only labels.',
    reason_rejected: 'Would keep the top launch-action and approval blockers from showing that the current dirty path is a staged .windsurf -> .devin rename owner-decision item.',
    tradeoff: 'No-code defer avoids touching report text, but operators still need to open lower-level tables to understand the first source-provenance blocker.',
    evidence: 'The source action blocker showed first=.devin/workflows/master.md while dirty_paths already carried old_path=.windsurf/workflows/master.md and proof_type=source_rename_decision.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-RENAME-SUMMARY',
    variant: 'Commit, unstage, stash, revert, delete, rename, or move the staged workflow rename.',
    reason_rejected: 'Resolving the rename is an owner decision outside this safe reporting phase and would mutate unrelated staged work.',
    tradeoff: 'Mutation could clear the local source blocker, but it would violate the dirty-worktree policy and erase the explicit owner-decision gate.',
    evidence: 'git status shows a staged .windsurf/workflows/master.md -> .devin/workflows/master.md rename, and source stop gates require explicit owner intent before mutation.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-RENAME-SUMMARY',
    variant: 'Add a second git-status parser for launch-action and approval summaries.',
    reason_rejected: 'The existing classifyDirtyPath output already has old_path, file_path, proof_type, and staging_state; a second parser would duplicate release-critical source provenance logic.',
    tradeoff: 'A bespoke parser could format this one summary directly, but it would drift from the focused source-provenance report/check contract.',
    evidence: 'report-launch-evidence-manifest already builds source_provenance.dirty_paths and source_provenance.resolution_queue from parsePorcelainStatusLine.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PROOF-HANDLES',
    variant: 'Leave launch action and production approval release rows pointing at broad launch manifest plus release-readiness only.',
    reason_rejected: 'Would keep active release-toolchain rows routed through broad launch evidence even though the focused release-preflight report/check now exists and the lane summary already advertises it.',
    tradeoff: 'No-code defer avoids touching proof rows, but it preserves operator ambiguity across launch action and production approval Corepack release-readiness prerequisites.',
    evidence: 'The focused release-preflight report/check already renders the release deficits, toolchain probe ledger, clearance matrix, remediation queue, source row, and production approval release row from one manifest source of truth.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PROOF-HANDLES',
    variant: 'Remove the guarded check:release-readiness command from release-toolchain proof rows.',
    reason_rejected: 'The focused release-preflight report/check improves visibility but does not execute the guarded Corepack-pinned release path.',
    tradeoff: 'Focused-only proof handles would be shorter, but they would weaken the release-readiness and production approval boundary.',
    evidence: 'The release preflight rows explicitly distinguish blocker inspection from Corepack-pinned release-readiness execution.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PROOF-HANDLES',
    variant: 'Install or shim Corepack/Git LFS, fall back to bare pnpm, or run release-readiness despite dirty source.',
    reason_rejected: 'Environment remediation and release execution are outside the safe-fix proof-handle phase and would blur local workaround evidence with release readiness.',
    tradeoff: 'Direct remediation could move a blocker faster, but it requires owner/environment intent and clean provenance before release evidence should be accepted.',
    evidence: 'The current release preflight keeps Corepack, source provenance, and owner approval as explicit blockers, while Git LFS is already probed separately.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PROOF-HANDLES',
    variant: 'Duplicate release preflight probing logic in launch action or production approval rows.',
    reason_rejected: 'Duplicating probe logic would drift from the focused release-preflight report/check and the manifest release_preflight source of truth.',
    tradeoff: 'Inline probe summaries could be more direct but would add another release-critical contract to maintain.',
    evidence: 'report-launch-evidence-manifest already emits release_preflight, toolchain_probe_ledger, clearance_matrix, launch_action_queue, and production_approval rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-PROOF-HANDLES',
    variant: 'Leave launch action and production approval branch rows pointing only at unmerged-branch readiness commands.',
    reason_rejected: 'Would keep active branch-review rows routed through branch inventory commands even though the focused branch-review report/check now exists and the lane summary already advertises it.',
    tradeoff: 'No-code defer avoids touching proof rows, but it preserves operator ambiguity across launch action and production approval Canonical branch review prerequisites.',
    evidence: 'The focused branch-review report/check already renders review queues, canonical-head decisions, clearance matrix, review-first packets, top branch packet, and production approval branch rows from one manifest source of truth.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-PROOF-HANDLES',
    variant: 'Replace or remove branch-specific unmerged-branch packet evidence from the branch_review object.',
    reason_rejected: 'Focused proof handles should narrow operator entry points without deleting the read-only branch packet evidence required to inspect review-first and Supabase-function risk.',
    tradeoff: 'Removing packet commands would make the surface simpler, but it would weaken branch-specific review depth and canonical-head evidence.',
    evidence: 'branch_review.review_first_packets, top_review_packet, clearance_matrix rows, and canonical_head_resolution_queue all intentionally preserve report:unmerged-branch-readiness commands as read-only branch packet evidence.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-PROOF-HANDLES',
    variant: 'Checkout, merge, push, discard, delete, or select canonical branch heads to clear branch review.',
    reason_rejected: 'Branch mutation and canonical-head decisions require explicit owner approval and clean release gates; this phase is proof-handle alignment only.',
    tradeoff: 'Mutating branches could reduce blocker counts, but it would violate the safe-fix lane and risk unrelated owner work.',
    evidence: 'The branch review queue, canonical-head decision ledger, and focused branch report all stop before checkout, merge, push, discard, delete, canonical-head selection, migration, deploy, or production approval.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-PROOF-HANDLES',
    variant: 'Duplicate branch scanning and canonical-head parsing in launch action or production approval rows.',
    reason_rejected: 'Duplicating branch logic would drift from the focused branch-review report/check and the manifest branch_review source of truth.',
    tradeoff: 'Inline branch summaries could be more direct but would add another branch-critical contract to maintain.',
    evidence: 'report-launch-evidence-manifest already emits branch_review.review_queue, canonical_head_decisions, clearance_matrix, review_first_packets, top_review_packet, launch_action_queue, and production_approval rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-PROOF-HANDLES',
    variant: 'Leave launch action and production approval Supabase rows pointing only at dashboard or connector advisor review commands.',
    reason_rejected: 'Would keep active Supabase advisor rows routed directly to external-account evidence even though the focused Supabase advisor report/check now exists and preserves those external prerequisites.',
    tradeoff: 'No-code defer avoids touching proof rows, but it preserves operator ambiguity across launch action and production approval Supabase advisor clearance prerequisites.',
    evidence: 'The focused Supabase advisor report/check already renders connector permission, Security Advisor evidence, Performance Advisor evidence, public-safe findings, remediation queue, launch action row, and production approval Supabase rows from one manifest source of truth.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-PROOF-HANDLES',
    variant: 'Call Supabase connector or dashboard advisors to clear the Supabase advisor blocker.',
    reason_rejected: 'Connector authorization and dashboard advisor execution are external-account actions requiring credentials and explicit approval; this phase is proof-handle alignment only.',
    tradeoff: 'Direct advisor execution could reduce blocker ambiguity if authorized, but it would cross the safe-fix stop gate and risk private findings or credentials.',
    evidence: 'The Supabase advisor clearance deficit ledger marks connector authorization, Security Advisor evidence, Performance Advisor evidence, public-safe findings, and clearance claim rows as open.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-PROOF-HANDLES',
    variant: 'Treat CLI app lint, permission-denied connector output, or focused report/check success as Supabase advisor clearance.',
    reason_rejected: 'Local lint and focused report/check output are inspection evidence only; they do not substitute for authorized Supabase Security Advisor and Performance Advisor results.',
    tradeoff: 'Treating local checks as clearance would make the gate appear easier to pass, but it would weaken database-security proof boundaries.',
    evidence: 'launchActionProofBoundary, productionApprovalPrerequisiteProofBoundary, and supabaseAdvisorClearanceDeficits all reject CLI-only or permission-denied substitution for authorized advisor evidence.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-PROOF-HANDLES',
    variant: 'Duplicate Supabase advisor clearance and remediation parsing in launch action or production approval rows.',
    reason_rejected: 'Duplicating advisor logic would drift from the focused Supabase advisor report/check and the manifest supabase_advisor source of truth.',
    tradeoff: 'Inline advisor summaries could be more direct but would add another external-account clearance contract to maintain.',
    evidence: 'report-launch-evidence-manifest already emits supabase_advisor.clearance_deficits, remediation_queue, launch_action_queue, and production_approval rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-FOCUSED-REPORT',
    variant: 'Leave Supabase advisor clearance only inside the broad launch manifest and commercial launch report.',
    reason_rejected: 'Would keep the active external-account advisor blocker harder to inspect despite it being a pre-request production approval gate.',
    tradeoff: 'No-code defer avoids a wrapper but preserves operator ambiguity around CLI lint versus Security and Performance Advisor evidence.',
    evidence: 'The current public status exposes Supabase advisor deficit and remediation handles, but both pointed only to report:launch-evidence-manifest.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-FOCUSED-REPORT',
    variant: 'Call Supabase connector or dashboard advisors from the focused report.',
    reason_rejected: 'Connector authorization and dashboard advisor execution are external-account actions and must not be performed by a local evidence wrapper without explicit approval and credentials.',
    tradeoff: 'Direct connector execution could produce fresher evidence, but it risks account access, private findings, and permission-boundary confusion.',
    evidence: 'The current clearance deficit ledger marks connector authorization, Security Advisor evidence, and Performance Advisor evidence as external-account rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-FOCUSED-REPORT',
    variant: 'Duplicate Supabase advisor clearance parsing in a standalone implementation.',
    reason_rejected: 'Duplicating clearance deficit and remediation queue construction would drift from the launch manifest and production approval packet contracts.',
    tradeoff: 'Standalone parsing could avoid manifest generation but would create another launch-critical source of truth.',
    evidence: 'report-launch-evidence-manifest already emits supabase_advisor, clearance_deficits, remediation_queue, launch_action_queue, and production_approval rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-FOCUSED-REPORT',
    variant: 'Add package scripts only and leave public status, release posture, docs, and validators on broad Supabase advisor handles.',
    reason_rejected: 'Operators would still discover stale broad commands from public and source-of-truth surfaces.',
    tradeoff: 'Package-only is smaller but leaves machine-visible evidence handles inconsistent with the new focused report.',
    evidence: 'generate-public-release-status, RELEASE_HEALTH_EVIDENCE, COMMERCIAL_SOURCE_OF_TRUTH, and statusPagePosture tests assert exact operator-facing command handles.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-FOCUSED-REPORT',
    variant: 'Leave branch review only inside the broad launch manifest, commercial launch report, and unmerged branch inventory.',
    reason_rejected: 'Would keep the active review-first and canonical-head blocker harder to inspect despite it being a pre-request production approval gate.',
    tradeoff: 'No-code defer avoids a wrapper but preserves operator ambiguity around broad branch inventory versus manifest clearance rows.',
    evidence: 'The current public status exposes branch family, clearance, canonical-head, and packet handles, but those rows previously pointed at broad manifest and unmerged-branch commands.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-FOCUSED-REPORT',
    variant: 'Duplicate branch inventory, family grouping, freshness, and focused packet parsing in a standalone implementation.',
    reason_rejected: 'Duplicating branch scanning would drift from report:unmerged-branch-readiness and the launch manifest branch_review contract.',
    tradeoff: 'Standalone parsing could avoid manifest generation but would create another branch-critical source of truth.',
    evidence: 'report-launch-evidence-manifest already emits branch_review.review_queue, canonical_head_decisions, clearance_matrix, review_first_packets, top_review_packet, launch action rows, and production approval branch rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-FOCUSED-REPORT',
    variant: 'Checkout, merge, push, discard, delete, or select canonical branch heads to clear the branch review blocker.',
    reason_rejected: 'Branch state and canonical-head decisions require explicit owner approval and normal release gates; automated mutation would violate the safe-fix lane.',
    tradeoff: 'Mutating branches could make the blocker disappear, but it would destroy the evidence boundary and risk unrelated owner work.',
    evidence: 'Branch review rows and canonical-head ledgers explicitly stop before checkout, merge, push, discard, delete, canonical-head selection, migration, deploy, or production approval.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-FOCUSED-REPORT',
    variant: 'Add package scripts only and leave public status, release posture, docs, and validators on broad branch handles.',
    reason_rejected: 'Operators would still discover stale broad commands from public and source-of-truth surfaces.',
    tradeoff: 'Package-only is smaller but leaves machine-visible evidence handles inconsistent with the new focused report.',
    evidence: 'generate-public-release-status, RELEASE_HEALTH_EVIDENCE, COMMERCIAL_SOURCE_OF_TRUTH, and statusPagePosture tests assert exact operator-facing command handles.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-SUPABASE-FUNCTION-IMPACT-CHECK',
    variant: 'Checkout or merge the high-risk branch to inspect Supabase functions directly.',
    reason_rejected: 'Branch mutation and canonical-head selection require explicit owner approval and clean release gates.',
    tradeoff: 'A checkout could enable deeper local review, but it would cross the read-only branch-review boundary for this safe-fix phase.',
    evidence: 'The focused branch review packet already names changed Supabase function rows and stop gates without needing checkout or merge.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-SUPABASE-FUNCTION-IMPACT-CHECK',
    variant: 'Deploy or serve Supabase functions from the branch to validate runtime behavior.',
    reason_rejected: 'Function deploys, secret use, live writes, and non-production env serving require explicit owner/environment approval.',
    tradeoff: 'Runtime function validation would be stronger but unsafe in a report-contract hardening phase.',
    evidence: 'The changed function row stop gates require no production function deploy, service-role change, or live data write before owner approval.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-SUPABASE-FUNCTION-IMPACT-CHECK',
    variant: 'Duplicate branch diff parsing inside the focused checker.',
    reason_rejected: 'The checker should validate the manifest-backed focused report contract rather than create a second branch diff source of truth.',
    tradeoff: 'Inline parsing might catch generator defects differently, but it would drift from report-launch-evidence-manifest and report:unmerged-branch-readiness.',
    evidence: 'report-branch-review-readiness already consumes branch_review.top_review_packet generated from the launch manifest.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-BRANCH-REVIEW-SUPABASE-FUNCTION-IMPACT-CHECK',
    variant: 'Create a new Supabase function branch-impact report.',
    reason_rejected: 'A new report would duplicate the Top Branch Changed Supabase Function Rows section already present in the focused branch-review report.',
    tradeoff: 'A separate report could be narrower, but adds command-surface and validation drift without improving the source of truth.',
    evidence: 'scripts/report-branch-review-readiness.mjs already renders the changed Supabase function rows and no-deploy boundaries.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-MANIFEST-BRANCH-FUNCTION-IMPACT-CHECK',
    variant: 'Leave the broad launch manifest checker with only per-row shape checks.',
    reason_rejected: 'Would still allow the central launch gate to accept non-skipped top branch packets whose Supabase function row count or category drifted from changed_supabase_function_count.',
    tradeoff: 'No-code defer avoids touching the broad validator, but weakens the manifest as the source of truth for production approval evidence attachments.',
    evidence: 'The focused branch checker already requires row-count equality and the supabase/database category when changed Supabase functions exist.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-MANIFEST-BRANCH-FUNCTION-IMPACT-CHECK',
    variant: 'Duplicate branch diff parsing inside check-launch-evidence-manifest.',
    reason_rejected: 'The launch manifest checker should validate generated evidence contracts, not become a second branch inventory and diff implementation.',
    tradeoff: 'Independent parsing could detect generator defects differently, but it would add branch-review drift and more git state surface to the broad manifest validator.',
    evidence: 'report-launch-evidence-manifest already emits branch_review.top_review_packet from the existing read-only branch-review path.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-MANIFEST-BRANCH-FUNCTION-IMPACT-CHECK',
    variant: 'Clear the branch blocker by checking out, merging, deploying, or serving the changed Supabase functions.',
    reason_rejected: 'Branch mutation, function deploys, secret-dependent serving, migrations, policy changes, and production approval are outside this repo-side validator phase.',
    tradeoff: 'Runtime validation would be stronger evidence, but it crosses explicit owner approval and no-deploy boundaries.',
    evidence: 'The top branch function-impact rows are read-only review targets and their stop gates prohibit production function deploys, service-role changes, and live data writes.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-EVIDENCE-VALIDATION-FOCUSED-REPORT',
    variant: 'Leave launch evidence validation only as check:launch-evidence-manifest plus the production approval packet.',
    reason_rejected: 'Would keep the second launch-action phase less inspectable than the other focused launch-readiness lanes.',
    tradeoff: 'No-code defer avoids a wrapper but preserves operator ambiguity around validation result, approval rows, public handle, and no-self-certification boundaries.',
    evidence: 'The launch action queue and public release status both carry launch_evidence_validation_gate, but the command handle was still broad validation plus production approval packet output.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-EVIDENCE-VALIDATION-FOCUSED-REPORT',
    variant: 'Teach report-launch-evidence-manifest to self-certify launch evidence validation status.',
    reason_rejected: 'The manifest cannot prove its own checker result without circular semantics; validation must stay external to generation.',
    tradeoff: 'Self-certification might simplify queue status, but it would blur the existing production approval request-packet boundary.',
    evidence: 'The production approval prerequisite row explicitly states that validation command is external to manifest generation and that the approval packet must attach passing check:launch-evidence-manifest output.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-EVIDENCE-VALIDATION-FOCUSED-REPORT',
    variant: 'Duplicate validate_launch_evidence.py and manifest structural assertions in a new checker.',
    reason_rejected: 'Duplicating schema and proof-boundary validation would create a second source of truth for launch evidence correctness.',
    tradeoff: 'A duplicate checker could reduce process spawning but would drift from check-launch-evidence-manifest and the orchestrator schema validator.',
    evidence: 'check-launch-evidence-manifest already generates the manifest, validates schema shape, and asserts proof-boundary contracts across launch rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-EVIDENCE-VALIDATION-FOCUSED-REPORT',
    variant: 'Run release-readiness, request owner approval, contact buyers, authorize Supabase, deploy, or mutate source from the validation report.',
    reason_rejected: 'Those are independent gates requiring clean source provenance, owner intent, buyer activity, external account authorization, or post-deploy context.',
    tradeoff: 'Direct execution could move later blockers faster, but it would violate safe-fix boundaries and conflate validation with launch readiness.',
    evidence: 'The launch action row and production approval rows state that validation does not grant approval, create buyer acceptance, deploy, or prove live parity.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-VALIDATION-PRODUCTION-APPROVAL-PROOF-HANDLES',
    variant: 'Leave production approval Launch evidence validation rows pointing only at check:launch-evidence-manifest.',
    reason_rejected: 'Would keep production approval proof handles broader and less inspectable than the launch action validation row after the focused validation report/check existed.',
    tradeoff: 'No-code defer avoids touching approval rows, but preserves operator inconsistency between the launch action plan and production approval request packet.',
    evidence: 'launch_action_queue.launch_evidence_validation already uses report:launch-evidence-validation-readiness plus check:launch-evidence-validation-report.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-VALIDATION-PRODUCTION-APPROVAL-PROOF-HANDLES',
    variant: 'Remove the underlying check:launch-evidence-manifest requirement from production approval rows.',
    reason_rejected: 'The focused validation report/check is an operator handle, but the raw manifest check remains the underlying structure/proof-boundary gate it executes and reports.',
    tradeoff: 'Focused-only wording would be shorter, but would hide the hard validator attachment required before production approval review.',
    evidence: 'report:launch-evidence-validation-readiness records validation_readiness.validation_check.command as check:launch-evidence-manifest.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-VALIDATION-PRODUCTION-APPROVAL-PROOF-HANDLES',
    variant: 'Make Launch evidence validation approval-ready by clearing production approval request blockers.',
    reason_rejected: 'The row is already ready only for manifest validation; production approval remains blocked by source provenance, release-readiness, branch review, Supabase advisor, buyer evidence, owner approval, and post-deploy proof gates.',
    tradeoff: 'Changing approval eligibility would look like faster launch progress, but it would blur structure validation with production approval.',
    evidence: 'production_approval.prerequisite_queue remains blocked and request_packet.request_eligible remains false while the real pre-request and manual-stop blockers remain open.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-VALIDATION-STATUS',
    variant: 'Leave the launch action validation row blocked even after focused validation evidence is externalized.',
    reason_rejected: 'Would keep the launch action queue overstating action blockers and contradict the ready production approval validation prerequisite/request rows.',
    tradeoff: 'No-code defer avoids another manifest change but preserves the same self-blocking semantics that the production approval packet already fixed.',
    evidence: 'report:launch-evidence-validation-readiness shows validation status pass, production prerequisite ready, and request row blocks_request=no while the launch action row was still blocked.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-VALIDATION-STATUS',
    variant: 'Run check:launch-evidence-manifest inside report-launch-evidence-manifest to derive the row status dynamically.',
    reason_rejected: 'Would recurse through manifest generation and checker execution, creating circular validation and fragile runtime behavior.',
    tradeoff: 'Dynamic status could reflect checker failures, but the manifest is the object under validation and should not invoke its own validator.',
    evidence: 'The focused validation report can run the checker externally without making report-launch-evidence-manifest self-certify.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-VALIDATION-STATUS',
    variant: 'Remove the launch_evidence_validation row from the launch action queue.',
    reason_rejected: 'Would hide a required predeploy evidence attachment and weaken operator sequencing.',
    tradeoff: 'Removing the row lowers blocker counts but loses the explicit proof command, proof type, and stop gate.',
    evidence: 'The launch action queue, production approval prerequisite queue, and public release status all intentionally carry launch evidence validation as a first-class gate.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-VALIDATION-STATUS',
    variant: 'Mark the entire launch action queue ready when launch evidence validation passes.',
    reason_rejected: 'Would ignore source provenance, release toolchain, branch review, Supabase advisor, buyer evidence, owner approval, and post-deploy live proof blockers.',
    tradeoff: 'Queue-level readiness would look cleaner but would be materially false.',
    evidence: 'Current launch action queue still reports source provenance dirty, release deficits, branch review unknown, Supabase advisor deficits, buyer evidence unknown, manual owner approval, and post-deploy live proof blockers.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-FOCUSED-REPORT',
    variant: 'Leave launch action planning only inside the broad launch manifest and commercial launch report.',
    reason_rejected: 'Would keep the phase-wise execution queue harder to inspect even though every remaining launch gate depends on that sequence.',
    tradeoff: 'No-code defer avoids a wrapper but preserves operator ambiguity around the first open action, lane sequencing, focused proof commands, and stop gates.',
    evidence: 'The manifest already emits launch_action_queue, but package scripts and public handles did not expose a focused launch action report/check.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-FOCUSED-REPORT',
    variant: 'Duplicate launch action queue construction in a standalone implementation.',
    reason_rejected: 'Duplicating queue construction would drift from the launch manifest, production approval prerequisites, release preflight, branch review, buyer evidence, Supabase advisor, and post-deploy contracts.',
    tradeoff: 'Standalone parsing could avoid manifest generation but would create another launch-critical source of truth for execution sequencing.',
    evidence: 'report-launch-evidence-manifest already emits the eight launch action rows, proof commands, proof boundaries, stop gates, and top blocked action evidence.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-FOCUSED-REPORT',
    variant: 'Commit source changes, run release-readiness, checkout branches, contact buyers, authorize Supabase, request approval, or deploy from the focused report.',
    reason_rejected: 'Those actions require explicit owner intent, clean source provenance, external accounts, buyer activity, production approval, or post-deploy context; a readiness report must not execute them.',
    tradeoff: 'Direct execution could move blockers faster, but it would violate safe-fix boundaries and blur proof buckets.',
    evidence: 'The launch action queue rows explicitly stop before source mutation, branch mutation, buyer contact, Supabase authorization, owner approval, deploy, and hosted/live parity claims.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-FOCUSED-REPORT',
    variant: 'Add package scripts only and leave public status, release posture, docs, and validators on broad launch action handles.',
    reason_rejected: 'Operators would still discover stale broad commands from public and source-of-truth surfaces.',
    tradeoff: 'Package-only is smaller but leaves machine-visible evidence handles inconsistent with the new focused report.',
    evidence: 'generate-public-release-status, RELEASE_HEALTH_EVIDENCE, COMMERCIAL_SOURCE_OF_TRUTH, and statusPagePosture tests assert exact operator-facing command handles.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-BUYER-LANE-STATUS',
    variant: 'Leave buyer_evidence lane_status_summary as the broad buyer evidence scan status.',
    reason_rejected: 'Would keep a false pass in the phase-wise launch action summary while hard-gate deficits or acquisition rows remain skipped, unknown, or blocked.',
    tradeoff: 'No-code defer avoids a small report patch but leaves operator-facing execution planning internally inconsistent.',
    evidence: 'report:launch-action-readiness -- --json showed buyer_evidence lane status pass while the launch action buyer row stayed blocked with buyer hard-gate deficits.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-BUYER-LANE-STATUS',
    variant: 'Mark the buyer evidence lane ready from manifest.buyer_evidence.status alone.',
    reason_rejected: 'The broad buyer scan status does not prove hard-gate deficits are zero or that the acquisition matrix has retained buyer artifacts ready.',
    tradeoff: 'Status-only derivation is smaller but materially weaker than the existing focused buyer gate readiness definition.',
    evidence: 'report:buyer-evidence-gate-readiness only treats buyer evidence as ready when buyer_evidence.status and hard_gate_deficits.status pass and acquisition_matrix.status is ready.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-BUYER-LANE-STATUS',
    variant: 'Contact buyers, create retained artifacts, or run validate:pilot-evidence from the launch action report.',
    reason_rejected: 'Buyer contact, retained artifact creation, and 95% validation are owner/operator actions with real anonymized buyer inputs, not report-generation side effects.',
    tradeoff: 'External execution could reduce blockers but would violate safe-fix, no-contact, no-fabrication, and proof-bucket boundaries.',
    evidence: 'Buyer evidence launch action rows require real accepted buyer rows, retained redacted artifacts, and validate:pilot-evidence --require-95 before readiness.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-BUYER-LANE-STATUS',
    variant: 'Rewrite the global buyer_evidence.status semantics for the manifest.',
    reason_rejected: 'The defect is limited to focused launch-action lane summarization; changing the broad manifest status would be wider and could break existing buyer evidence scan semantics.',
    tradeoff: 'A global status rewrite might make one field stricter, but it risks conflating raw buyer-evidence scan state with production hard-gate readiness.',
    evidence: 'The launch action report already has access to hard_gate_deficits and acquisition_matrix, so a local derived lane status fixes the operator-facing mismatch without changing source data.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-PACKET-SEQUENCING',
    variant: 'Keep running live static parity even when local release-readiness fails.',
    reason_rejected: 'This preserves a noisy secondary failure where missing dist is caused by an already-failed build/toolchain prerequisite rather than by an independently verified hosted-static mismatch.',
    tradeoff: 'No-code defer avoids edits but leaves production approval evidence harder to interpret during Corepack or release-readiness failures.',
    evidence: 'Current packet output shows Local release readiness fails because Corepack is missing, then Live static dist parity fails because dist is absent.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-PACKET-SEQUENCING',
    variant: 'Fall back to bare pnpm or build dist directly when Corepack is unavailable.',
    reason_rejected: 'Bare pnpm or ad hoc dist generation would violate the pinned Corepack release evidence boundary and could make a local workaround look like release-readiness.',
    tradeoff: 'A fallback could make parity runnable in this shell, but it would weaken the production deploy script and release-preflight contract.',
    evidence: 'check-corepack-toolchain and deploy-production.sh require Corepack to honor packageManager pnpm@10.23.0 before release-readiness evidence is accepted.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-PACKET-SEQUENCING',
    variant: 'Skip every live check when any pre-deploy gate is blocked.',
    reason_rejected: 'Live metadata parity can still provide independent public artifact evidence even when local release-readiness or source provenance is blocked.',
    tradeoff: 'Skipping all live checks would reduce noise but remove useful hosted-state evidence from the approval packet.',
    evidence: 'The packet currently reports live metadata parity independently while keeping deployment request readiness blocked by source, request-packet, and release-readiness gates.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-FOCUSED-REPORT',
    variant: 'Leave production approval readiness only inside the broad launch manifest, commercial launch report, and production approval packet.',
    reason_rejected: 'Would keep the active approval-request blocker harder to inspect despite it being the manual stop before any deploy or post-deploy live proof.',
    tradeoff: 'No-code defer avoids a wrapper but preserves operator ambiguity around prerequisite rows, request phases, owner-decision rows, and post-deploy boundaries.',
    evidence: 'The manifest already emits production_approval.prerequisite_queue and production_approval.request_packet, but package scripts and public handles did not expose a focused production approval readiness report/check.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-FOCUSED-REPORT',
    variant: 'Duplicate production approval prerequisite and request-packet construction in a standalone implementation.',
    reason_rejected: 'Duplicating approval queue construction would drift from the launch manifest, production approval packet, and release preflight contracts.',
    tradeoff: 'Standalone parsing could avoid manifest generation but would create another launch-critical source of truth for manual approval semantics.',
    evidence: 'report-launch-evidence-manifest already emits the prerequisite queue, request packet, package-script proof commands, launch action row, and release preflight owner-approval row.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-FOCUSED-REPORT',
    variant: 'Run deploy-production.sh, request owner approval, or run live proof checks from the focused report.',
    reason_rejected: 'Deploy, approval request, and live checks require clean source provenance, current release gates, explicit owner approval, and post-deploy context; a readiness report must not mutate production or create approval proof.',
    tradeoff: 'Direct execution could produce fresher evidence, but it would violate the safe-fix lane, manual approval boundary, and current dirty-source/toolchain blockers.',
    evidence: 'The production approval queue keeps source provenance, release-readiness, branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, and post-deploy proof as blocked or manual-stop rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-FOCUSED-REPORT',
    variant: 'Add package scripts only and leave public status, release posture, docs, and validators on broad production approval handles.',
    reason_rejected: 'Operators would still discover stale broad commands from public and source-of-truth surfaces.',
    tradeoff: 'Package-only is smaller but leaves machine-visible evidence handles inconsistent with the new focused report.',
    evidence: 'generate-public-release-status, RELEASE_HEALTH_EVIDENCE, COMMERCIAL_SOURCE_OF_TRUTH, and statusPagePosture tests assert exact operator-facing command handles.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-POST-DEPLOY-LIVE-PROOF-FOCUSED-REPORT',
    variant: 'Leave post-deploy proof only inside the broad launch manifest and commercial launch report.',
    reason_rejected: 'Would keep the hosted/live parity blocker harder to inspect despite it being the final post-approval gate for current-source live proof.',
    tradeoff: 'No-code defer avoids a wrapper but preserves operator ambiguity around approval, deploy completion, live metadata, static parity, and hosted smoke sequencing.',
    evidence: 'The manifest already emits post_deploy_live_proof.gate_queue, but package scripts and public handles did not expose a focused post-deploy report/check.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-POST-DEPLOY-LIVE-PROOF-FOCUSED-REPORT',
    variant: 'Duplicate post-deploy gate construction or live-check parsing in a standalone implementation.',
    reason_rejected: 'Duplicating gate construction would drift from the launch manifest, production approval packet, and deploy-script contracts.',
    tradeoff: 'Standalone parsing could avoid manifest generation but would create another launch-critical source of truth for approval and live proof semantics.',
    evidence: 'report-launch-evidence-manifest already emits the six gate rows, package-script proof commands, approval phrase, launch action row, and production approval live rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-POST-DEPLOY-LIVE-PROOF-FOCUSED-REPORT',
    variant: 'Run deploy-production.sh, Netlify deploy, hosted browser smoke, or live parity checks from the focused report.',
    reason_rejected: 'Deploy and live checks require explicit owner approval, clean release gates, and post-deploy execution context; a readiness report must not mutate production or create live proof.',
    tradeoff: 'Direct execution could produce fresher live evidence, but it would violate the safe-fix lane, approval boundary, and current dirty-source/toolchain blockers.',
    evidence: 'The post-deploy gate queue marks production approval clearance, guarded deploy completion, live metadata, static parity, hosted proof-pack smoke, and hosted parity claim as blocked until the approved deploy path completes.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-POST-DEPLOY-LIVE-PROOF-FOCUSED-REPORT',
    variant: 'Add package scripts only and leave public status, release posture, docs, and validators on broad post-deploy handles.',
    reason_rejected: 'Operators would still discover stale broad commands from public and source-of-truth surfaces.',
    tradeoff: 'Package-only is smaller but leaves machine-visible evidence handles inconsistent with the new focused report.',
    evidence: 'generate-public-release-status, RELEASE_HEALTH_EVIDENCE, COMMERCIAL_SOURCE_OF_TRUTH, and statusPagePosture tests assert exact operator-facing command handles.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-COMPLETION-AUDIT-PROOF-HANDLES',
    variant: 'Leave completion audit blocker rows pointing directly at raw validation, dashboard, release, deploy, and live-proof commands.',
    reason_rejected: 'Would keep the broad objective checklist inconsistent with the focused lane reports and make operators skip the safer inspection-first handles.',
    tradeoff: 'Raw commands are shorter, but they blur inspection with external gate execution or account/dashboard work.',
    evidence: 'Focused report/check handles already exist for buyer evidence, branch review, Supabase advisor, release preflight, production approval, and post-deploy live proof.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-COMPLETION-AUDIT-PROOF-HANDLES',
    variant: 'Run buyer validation, Supabase advisors, release-readiness, approval request, deploy, or post-deploy live proof from the completion audit phase.',
    reason_rejected: 'Those operations require retained buyer evidence, external account authorization, clean source provenance, owner approval, deploy context, or live-service access outside this safe-fix phase.',
    tradeoff: 'Direct execution could produce fresher gate evidence, but it would violate the safe no-execution boundary and risk overstating launch readiness.',
    evidence: 'Objective completion audit rows remain blocked or manual_stop and their stop gates require real external proof before goal completion.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-COMPLETION-AUDIT-PROOF-HANDLES',
    variant: 'Duplicate gate parsing or remediation logic inside the completion audit checker.',
    reason_rejected: 'Duplicating lane logic would create another source of truth for buyer, branch, Supabase, release, approval, and live-proof state.',
    tradeoff: 'Inline parsing could make the audit more self-contained, but it would drift from the focused report/check contracts.',
    evidence: 'report-launch-evidence-manifest already emits the source lane objects, and focused checkers validate the lane-specific proof boundaries.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-COMPLETION-AUDIT-PROOF-HANDLES',
    variant: 'Remove or flatten unresolved blocker rows from the objective completion audit.',
    reason_rejected: 'The audit is the goal-level checklist and must continue showing every unresolved launch gate that blocks completion.',
    tradeoff: 'A smaller audit table is easier to scan, but it hides the active blockers and weakens the completion decision evidence.',
    evidence: 'check-launch-evidence-manifest and check-commercial-launch-readiness-report require the completion audit to include buyer, source, branch, Supabase, release, and production/live proof rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-FINAL-PROOF-HANDLES',
    variant: 'Leave final launch action rows pointing directly at check:production-deploy-request and check:post-deploy-live.',
    reason_rejected: 'Would keep the phase-wise launch action queue inconsistent with the focused report/check wrappers already created for production approval and post-deploy proof.',
    tradeoff: 'Raw commands are shorter, but they make the top-level execution queue look like it should jump directly to approval or live-proof gates.',
    evidence: 'The focused launch action report already exposes production approval and post-deploy report handles in its lane summary, while the queue rows still used raw commands.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-FINAL-PROOF-HANDLES',
    variant: 'Run production deploy request or post-deploy live proof from the launch action report.',
    reason_rejected: 'Approval request and live proof require clean source provenance, passing release gates, explicit owner approval, guarded deploy completion, and live context outside this safe-fix phase.',
    tradeoff: 'Direct execution could produce fresher evidence, but it would violate no-deploy/no-live-proof boundaries and risk overstating launch readiness.',
    evidence: 'production_approval.prerequisite_queue and post_deploy_live_proof.gate_queue remain blocked/manual-stop and preserve raw machine gates for the real execution phase.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-FINAL-PROOF-HANDLES',
    variant: 'Remove the raw deploy-request and post-deploy live commands from downstream gate queues.',
    reason_rejected: 'Focused handles are inspection entry points; downstream production approval and post-deploy queues must still retain the actual guarded machine gates.',
    tradeoff: 'Removing raw commands would make every surface consistently focused, but it would hide the final execution commands needed after approval.',
    evidence: 'production_approval prerequisite/request rows and post_deploy_live_proof gate rows intentionally distinguish readiness inspection from deploy-request and live-proof execution.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-LAUNCH-ACTION-FINAL-PROOF-HANDLES',
    variant: 'Duplicate production approval or post-deploy gate construction in the launch action checker.',
    reason_rejected: 'Duplicating final gate construction would drift from the focused production approval and post-deploy reports.',
    tradeoff: 'Inline checks could make the launch action checker self-contained, but they would add a second source of truth for approval and live-proof sequencing.',
    evidence: 'report-launch-evidence-manifest already emits launch_action_queue, production_approval.prerequisite_queue, production_approval.request_packet, and post_deploy_live_proof.gate_queue.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-FIX-REPORT-FOCUSED-CHECKS',
    variant: 'Leave fix_report.current_required_checks on older broad and raw gate handles only.',
    reason_rejected: 'Would keep the top-level Fix Report inconsistent with the focused launch action, completion audit, and lane-specific proof handles.',
    tradeoff: 'No-code defer avoids touching report contracts, but it leaves operators without the inspection-first command path in the Fix Report.',
    evidence: 'Focused source, validation, launch action, release, branch, Supabase, buyer, production approval, and post-deploy reports already exist and are validated elsewhere.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-FIX-REPORT-FOCUSED-CHECKS',
    variant: 'Replace all raw execution gates with focused report handles and drop release/deploy/live commands.',
    reason_rejected: 'Focused handles are readiness inspection entry points; the Fix Report still needs to preserve the guarded final machine gates for the approved execution phase.',
    tradeoff: 'All-focused commands would scan more consistently, but they would hide check:release-readiness, check:production-deploy-request, and check:post-deploy-live.',
    evidence: 'Production approval and post-deploy queues intentionally retain raw execution gates downstream of focused report/check handles.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-FIX-REPORT-FOCUSED-CHECKS',
    variant: 'Run buyer validation, Supabase advisors, branch review mutations, release-readiness, deploy request, or live proof to clear the list.',
    reason_rejected: 'Those operations require real retained buyer evidence, external authorization, owner branch decisions, clean source provenance, explicit production approval, deploy context, or live-service access outside this safe-fix phase.',
    tradeoff: 'Direct execution could produce fresher evidence, but it would violate approval boundaries and risk overstating launch readiness.',
    evidence: 'The manifest still marks buyer evidence, source provenance, branch review, Supabase advisor clearance, release toolchain, production approval, and post-deploy live proof as blocked or manual-stop.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-FIX-REPORT-FOCUSED-CHECKS',
    variant: 'Duplicate focused command-list logic in the Markdown renderer instead of the manifest.',
    reason_rejected: 'The structured launch evidence manifest is the source of truth for the commercial report and downstream validators.',
    tradeoff: 'Renderer-only patch could change the visible report without changing JSON, but it would leave machine-readable evidence stale.',
    evidence: 'report-commercial-launch-readiness renders fix_report.current_required_checks directly from the manifest.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PUBLIC-FIX-REPORT-COMMAND-HANDLES',
    variant: 'Leave the public fix_report_blocker_map command on broad report generation only.',
    reason_rejected: 'Would keep the public status item weaker than the new Fix Report checker contract and make public operators miss the validation commands.',
    tradeoff: 'Report-only commands are shorter, but they do not prove the current required-check list and proof boundaries are still structurally valid.',
    evidence: 'check:commercial-launch-readiness-report and check:launch-evidence-manifest now assert focused Fix Report command handles.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PUBLIC-FIX-REPORT-COMMAND-HANDLES',
    variant: 'Expose every lane-specific focused command directly in the public fix_report_blocker_map command.',
    reason_rejected: 'The Fix Report public handle should validate the map source and rendered report, not become a long executable remediation script for every blocker lane.',
    tradeoff: 'Listing every lane command could be explicit, but it would duplicate fix_report.current_required_checks and blur inspection with execution.',
    evidence: 'The manifest Fix Report already carries the lane-specific focused and guarded command list; the public item only needs to point to its report/check contract.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PUBLIC-FIX-REPORT-COMMAND-HANDLES',
    variant: 'Run release-readiness, production deploy request, post-deploy live proof, buyer validation, Supabase advisors, or branch mutations from the public status item.',
    reason_rejected: 'Those gates require external evidence, owner approval, live context, or source decisions outside this safe public-status alignment phase.',
    tradeoff: 'Direct execution could look more complete, but it would violate the public-safe no-clearance boundary and risk overstating launch readiness.',
    evidence: 'The public status item remains external_gate and the manifest keeps buyer, source, branch, Supabase, release, approval, deploy, and live-proof gates blocked or manual-stop.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PUBLIC-FIX-REPORT-COMMAND-HANDLES',
    variant: 'Patch only the generated public/status/release-health.json file.',
    reason_rejected: 'Generated-only edits would fail the source/generator sync model and drift from src/lib/publicReleaseStatusManifest.json.',
    tradeoff: 'Generated-only is faster, but the next generate:public-release-status run would revert it.',
    evidence: 'scripts/generate-public-release-status.mjs validates the source manifest and writes public/status/release-health.json from it.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PROGRESS-DIGEST-FOCUSED-REPORT',
    variant: 'Leave progress_update_digest and bottleneck_log_digest discoverable only through broad reports.',
    reason_rejected: 'Would keep progress visibility weaker than the focused lane-report pattern now used by other launch-readiness blockers.',
    tradeoff: 'No-code defer avoids new scripts, but operators must scan broad launch artifacts to find progress and bottleneck proof.',
    evidence: 'progress_updates and bottleneck_log are already structured manifest fields, and public status already exposes them as separate handles.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PROGRESS-DIGEST-FOCUSED-REPORT',
    variant: 'Create separate progress and bottleneck report/check pairs.',
    reason_rejected: 'The two public handles are driven by adjacent manifest progress state and can share one focused wrapper without duplicating manifest reads, package scripts, and tests.',
    tradeoff: 'Separate wrappers would be more granular, but they would add extra scripts and command surfaces for the same operator decision point.',
    evidence: 'The skill progress contract requires progress updates and bottleneck logs together in the same digest context.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PROGRESS-DIGEST-FOCUSED-REPORT',
    variant: 'Run buyer validation, Supabase advisors, branch mutations, release-readiness, production deploy request, or live proof from the progress digest report.',
    reason_rejected: 'Those operations require external evidence, owner approval, live context, or source decisions outside this safe report-wrapper phase.',
    tradeoff: 'Direct execution could look more complete, but it would violate the progress-digest no-clearance boundary and risk overstating launch readiness.',
    evidence: 'The manifest progress update and bottleneck log explicitly identify buyer artifacts, owner approval, authorized Supabase evidence, branch decisions, and guarded deploy/live proof as unresolved external blockers.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-PROGRESS-DIGEST-FOCUSED-REPORT',
    variant: 'Store progress digest state in a new durable artifact instead of rendering the manifest fields.',
    reason_rejected: 'A new artifact would add another source of truth when the manifest already contains progress_updates and bottleneck_log fields.',
    tradeoff: 'A separate artifact could be easier to archive, but it would drift from the structured launch evidence manifest.',
    evidence: 'check:launch-evidence-manifest already validates progress_updates and bottleneck_log as top-level schema evidence.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-OBJECTIVE-COMPLETION-AUDIT-FOCUSED-REPORT',
    variant: 'Leave objective_completion_audit discoverable only through broad manifest and commercial readiness reports.',
    reason_rejected: 'Would keep the goal-completion blocker checklist weaker than the focused lane-report pattern now used by the other launch-readiness blockers.',
    tradeoff: 'No-code defer avoids new scripts, but operators must scan broad launch artifacts to find deliverable rows and blocker rows.',
    evidence: 'completion_audit is already a structured manifest field, and public status already exposes objective_completion_audit as a separate handle.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-OBJECTIVE-COMPLETION-AUDIT-FOCUSED-REPORT',
    variant: 'Run buyer validation, Supabase advisors, branch mutations, release-readiness, production deploy request, or live proof from the objective completion audit report.',
    reason_rejected: 'Those operations require retained buyer evidence, external authorization, owner decisions, clean source provenance, production approval, deploy context, or live-service access outside this safe report-wrapper phase.',
    tradeoff: 'Direct execution could produce fresher evidence, but it would violate the no-completion boundary and risk overstating launch readiness.',
    evidence: 'The manifest completion audit explicitly marks buyer evidence, source provenance, branch review, Supabase advisor clearance, release toolchain, and production/live proof as blocked or manual-stop.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-OBJECTIVE-COMPLETION-AUDIT-FOCUSED-REPORT',
    variant: 'Duplicate completion audit construction or lane-specific gate parsing in the focused report.',
    reason_rejected: 'Duplicating gate construction would create another source of truth for buyer, source, branch, Supabase, release, approval, and live-proof state.',
    tradeoff: 'Inline construction could make the report standalone, but it would drift from the launch evidence manifest and its validators.',
    evidence: 'report-launch-evidence-manifest already emits completion_audit summary counts, deliverable rows, blocker rows, proof boundaries, stop gates, and next proof commands.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-OBJECTIVE-COMPLETION-AUDIT-FOCUSED-REPORT',
    variant: 'Patch only generated public/status/release-health.json or release posture text.',
    reason_rejected: 'Generated-only or partial public-surface edits would drift from the generator, source manifest, docs checker, package scripts, and status posture tests.',
    tradeoff: 'A partial patch is smaller, but the next generate:public-release-status or source-doc check would expose stale command handles.',
    evidence: 'scripts/generate-public-release-status.mjs writes public/status/release-health.json from src/lib/publicReleaseStatusManifest.json and validates handle command contracts.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-ADVERSARIAL-REVIEW-FOCUSED-REPORT',
    variant: 'Leave adversarial_review_ledger discoverable only through broad manifest and commercial readiness reports.',
    reason_rejected: 'Would keep the claim-refutation lanes weaker than the focused lane-report pattern now used by the other launch-readiness blockers.',
    tradeoff: 'No-code defer avoids new scripts, but operators must scan broad launch artifacts to find challenge lanes, findings, decisions, and stop gates.',
    evidence: 'adversarial_reviews is already a structured manifest field, and public status already exposes adversarial_review_ledger as a separate handle.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-ADVERSARIAL-REVIEW-FOCUSED-REPORT',
    variant: 'Run buyer validation, Supabase advisors, branch mutations, release-readiness, production deploy request, or live proof from the adversarial review report.',
    reason_rejected: 'Those operations require retained buyer evidence, external authorization, owner decisions, clean source provenance, production approval, deploy context, or live-service access outside this safe report-wrapper phase.',
    tradeoff: 'Direct execution could produce fresher refutation evidence, but it would violate the no-clearance boundary and risk overstating launch readiness.',
    evidence: 'The adversarial review rows explicitly refute buyer, approval, release, Supabase, and branch claims while the underlying gates remain blocked or manual-stop elsewhere in the manifest.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-ADVERSARIAL-REVIEW-FOCUSED-REPORT',
    variant: 'Duplicate adversarial review construction or lane-specific gate parsing in the focused report.',
    reason_rejected: 'Duplicating review construction would create another source of truth for claim-refutation lanes and stop gates.',
    tradeoff: 'Inline construction could make the report standalone, but it would drift from the launch evidence manifest and its validators.',
    evidence: 'report-launch-evidence-manifest already emits adversarial_reviews lane, finding, decision, proof type, proof boundary, and stop gate rows.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-ADVERSARIAL-REVIEW-FOCUSED-REPORT',
    variant: 'Patch only generated public/status/release-health.json or release posture text.',
    reason_rejected: 'Generated-only or partial public-surface edits would drift from the generator, source manifest, docs checker, package scripts, and status posture tests.',
    tradeoff: 'A partial patch is smaller, but the next generate:public-release-status or source-doc check would expose stale command handles.',
    evidence: 'scripts/generate-public-release-status.mjs writes public/status/release-health.json from src/lib/publicReleaseStatusManifest.json and validates handle command contracts.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-PUBLIC-CHECK-HANDLES',
    variant: 'Leave the release-preflight public status rows on report:release-preflight plus report:launch-evidence-manifest.',
    reason_rejected: 'Would preserve report-only public handles after the focused release-preflight checker already proves wrapper structure and no-execution boundaries.',
    tradeoff: 'No-code defer avoids touching public status contracts, but keeps operator-facing release-preflight rows weaker than adjacent focused public handles.',
    evidence: 'release_toolchain_approval_deficit_ledger, release_preflight_remediation_queue, and release_preflight_clearance_matrix were the only report-backed public status rows without a check command.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-PUBLIC-CHECK-HANDLES',
    variant: 'Point the public rows at check:release-readiness or production deploy request checks.',
    reason_rejected: 'Those are execution and approval gates, while these public status rows are inspection handles for release-preflight blocker visibility.',
    tradeoff: 'Execution commands would look stronger but would blur focused evidence visibility with actual release clearance and owner approval.',
    evidence: 'The release-preflight report/check stop gate says focused report success does not run release-readiness, push, deploy, clear source provenance, or grant owner approval.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-PUBLIC-CHECK-HANDLES',
    variant: 'Add a new public release-preflight checker or duplicate validation logic inside the public status generator.',
    reason_rejected: 'A new checker would duplicate the existing focused release-preflight report/check contract and increase drift risk.',
    tradeoff: 'A generator-only check could be narrower, but the existing focused checker already covers the deficit ledger, clearance matrix, remediation queue, toolchain probe ledger, source boundary, and approval boundary.',
    evidence: 'scripts/check-release-preflight-readiness-report.mjs already validates the focused release-preflight status, toolchain probe ledger, release deficits, clearance matrix, remediation queue, source provenance, production approval packet, and proof boundaries.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PNPM-DIAGNOSTIC',
    variant: 'Treat bare pnpm 10.23.0 as satisfying Corepack release evidence.',
    reason_rejected: 'Bare pnpm can match packageManager but still bypass the Corepack resolver gate that release-readiness and deploy evidence require.',
    tradeoff: 'This would make the current shell look less blocked, but it would weaken the pinned toolchain contract and risk overstating release readiness.',
    evidence: 'corepack pnpm --version fails with Corepack unavailable while /opt/homebrew/bin/pnpm --version can still report 10.23.0.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PNPM-DIAGNOSTIC',
    variant: 'Install or enable Corepack globally from the safe-fix report phase.',
    reason_rejected: 'Tool installation changes global/runtime state and belongs to an explicit owner-approved environment remediation phase, not a diagnostic report contract patch.',
    tradeoff: 'Installing Corepack could clear one local blocker, but it would exceed this phase and still would not clear source provenance, release-readiness, owner approval, deploy, or live proof.',
    evidence: 'The release-preflight proof boundaries state that reports do not install tools, run release-readiness, clear source provenance, push, deploy, or grant production approval.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PNPM-DIAGNOSTIC',
    variant: 'Leave Corepack ENOENT without local pnpm diagnostic context.',
    reason_rejected: 'Operators would not be able to distinguish a missing Corepack resolver from a completely unavailable pnpm binary or a wrong bare pnpm version.',
    tradeoff: 'No-code defer preserves the existing blocker, but leaves useful non-clearance shell context hidden.',
    evidence: 'The release_preflight payload already separates Corepack and Git LFS probe rows; adding a diagnostic field to the Corepack row keeps one source of truth without adding another probe gate.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-GIT-LFS-HOOK-DIAGNOSTIC',
    variant: 'Rewrite the configured Git hooks or global hook PATH to include /opt/homebrew/bin.',
    reason_rejected: 'Global hook edits mutate user-level Git configuration outside the repo and require explicit owner approval.',
    tradeoff: 'Changing hooks could remove the warning for this workstation, but it would exceed a safe diagnostic phase and might mask release-shell differences.',
    evidence: 'core.hookspath is configured to /Users/sanjayb/.codex/git-hooks and the hook scripts require command -v git-lfs before post-commit or pre-push work.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-GIT-LFS-HOOK-DIAGNOSTIC',
    variant: 'Treat git lfs version success in a PATH-injected report as full commit and push hook clearance.',
    reason_rejected: 'A report process can have a richer PATH than a later git commit or pre-push hook invocation, so the binary probe alone does not prove future hook PATH.',
    tradeoff: 'This would keep the existing two-line evidence simpler, but it would hide a real hook warning observed during commit.',
    evidence: 'The previous commit produced a Git LFS hook warning while PATH=/opt/homebrew/bin git lfs version passed separately.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-GIT-LFS-HOOK-DIAGNOSTIC',
    variant: 'Add a third release-toolchain ledger item for Git LFS hook PATH.',
    reason_rejected: 'The hook check is diagnostic context for the Git LFS push-path row rather than an independent release gate.',
    tradeoff: 'A third row could be more visible, but it would increase row-count churn and duplicate the Git LFS gate semantics.',
    evidence: 'The existing Git LFS push-path row already contains command, current, expected, proof boundary, stop gate, and diagnostic fields.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-COREPACK-ENV-DIAGNOSTIC',
    variant: 'Install or enable Corepack from check-corepack-toolchain.',
    reason_rejected: 'The checker is a release evidence gate, not an environment mutator; global toolchain changes require explicit owner intent.',
    tradeoff: 'Automatic remediation could clear one workstation blocker, but it would hide environment truth and still would not clear source provenance, release-readiness, owner approval, deploy, or live proof.',
    evidence: 'The Corepack checker and release-preflight proof boundaries both require Corepack-pinned evidence and reject tool installation as report/check side effect.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-COREPACK-ENV-DIAGNOSTIC',
    variant: 'Treat matching bare pnpm as the release resolver when Corepack is missing.',
    reason_rejected: 'Bare pnpm can match the packageManager version while bypassing the Corepack resolver contract used by release-readiness and deployment evidence.',
    tradeoff: 'Fallback would make the current shell appear less blocked but would weaken reproducible release evidence.',
    evidence: 'The current shell can expose pnpm 10.23.0 while corepack pnpm --version still fails with Corepack unavailable.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-COREPACK-ENV-DIAGNOSTIC',
    variant: 'Leave check-corepack-toolchain with only the raw ENOENT message.',
    reason_rejected: 'Operators would need to run separate shell probes to distinguish missing Corepack from missing pnpm, matching bare pnpm, or Git LFS PATH drift.',
    tradeoff: 'No-code defer keeps the checker smaller, but leaves the first release gate less informative than the focused release-preflight report.',
    evidence: 'The release-preflight report already exposes non-clearance bare pnpm and Git LFS diagnostics, while the standalone Corepack gate previously did not.',
  },
  {
    task_id: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-COREPACK-ENV-DIAGNOSTIC',
    variant: 'Rewrite release-readiness scripts to use bare pnpm instead of Corepack.',
    reason_rejected: 'Changing the release runner would invert the repository packageManager contract and blur local workaround evidence with production release evidence.',
    tradeoff: 'Bare pnpm execution may be easier in this shell, but it would weaken every downstream approval and deployment proof row.',
    evidence: 'package.json pins packageManager=pnpm@10.23.0 and check:release-readiness starts with check-corepack-toolchain before any Corepack-pinned command chain runs.',
  },
];

const safeFixCodeOptimizationReviews = [
  {
    target_task: 'CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change updates existing manifest/report/check/test surfaces only, adds no dependency or broad abstraction, and preserves the blocked launch decision plus external stop gates.',
    tests_or_checks: safeFixTestsRun,
    remaining_risk: 'Live production parity, buyer acceptance, Supabase advisor clearance, branch owner decisions, source provenance cleanup, and owner deployment approval remain unproven.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-VALIDATION-CIRCULARITY',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adjusts one prerequisite row and its request impact, reuses existing packet/check/report surfaces, and adds no dependency, deploy path, external account call, or broad abstraction.',
    tests_or_checks: [
      'pnpm exec tsc -b --pretty false',
      'pnpm exec vitest run tests/unit/launchEvidenceManifest.test.ts tests/unit/productionApprovalPacket.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm run report:production-approval-packet -- --skip-release-readiness',
    ],
    remaining_risk: 'The request packet remains ineligible until source provenance, release-readiness, branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, and post-deploy live proof are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-BRANCH-REVIEW-QUEUE-STATUS',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adjusts only the existing branch review queue status/count evidence and validator/test expectations, with no branch mutation, new dependency, new artifact, or deploy path.',
    tests_or_checks: [
      'pnpm exec tsc -b --pretty false',
      'pnpm exec vitest run tests/unit/launchEvidenceManifest.test.ts tests/unit/unmergedBranchReadiness.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm run report:unmerged-branch-readiness -- --focus-risk high',
    ],
    remaining_risk: 'Branch review remains blocked until focused review, canonical-head owner decisions, clean release gates, and explicit owner approval are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-STARTER-REGISTER-BOUNDARY',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds one starter-only count to the existing readiness report and manifest contract, then uses that count in the existing acquisition matrix without new dependencies, new artifacts, buyer contact, or hard-gate relaxation.',
    tests_or_checks: buyerEvidenceStarterBoundaryTestsRun,
    remaining_risk: 'Buyer evidence remains blocked until real anonymized accepted buyer rows, retained redacted artifact hashes, commercial signal evidence, and validate:pilot-evidence --require-95 are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-GATE-FOCUSED-REPORT',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds a thin manifest-backed buyer evidence gate Markdown/JSON wrapper, structural checker, public/source-of-truth handle alignment, and focused tests without new dependencies, duplicated buyer scanning, buyer contact, evidence creation, confidence movement, retained artifact mutation, release execution, deploy paths, or live-service access.',
    tests_or_checks: buyerEvidenceGateReportTestsRun,
    remaining_risk: 'Buyer evidence remains blocked until real anonymized accepted buyer rows, reviewer evidence, retained redacted artifact hashes, strong commercial signal evidence, and validate:pilot-evidence --require-95 are current; source provenance, release-readiness, production approval, branch review, Supabase advisor clearance, and post-deploy live proof also remain open gates.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PROOF-HANDLES',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change reuses the existing focused buyer evidence hard-gate report/check command across existing launch action and production approval buyer proof rows and validators, adds no dependency, no duplicate buyer parser, no buyer contact, no retained artifact mutation, no validation execution, no approval request execution, and no deploy path.',
    tests_or_checks: buyerEvidenceProofHandleTestsRun,
    remaining_risk: 'Buyer evidence remains blocked until real anonymized accepted buyer rows, retained redacted artifact hashes, strong commercial signal evidence, and validate:pilot-evidence --require-95 are current; source provenance, release-readiness, branch review, Supabase advisor clearance, production approval, and post-deploy live proof also remain open.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PUBLIC-GATE-HANDLE',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change reuses the existing focused buyer evidence gate report/check across the top public buyer gate and deployment checklist row, adds no dependency, duplicates no buyer parser, runs no final validator without real inputs, creates no evidence, and preserves blocked launch status.',
    tests_or_checks: buyerEvidencePublicGateHandleTestsRun,
    remaining_risk: 'Buyer evidence remains blocked until real anonymized accepted buyer rows, reviewer evidence, retained redacted artifact hashes, strong commercial signal evidence, and validate:pilot-evidence --require-95 are current; source provenance, release-readiness, branch review, Supabase advisor clearance, production approval, and post-deploy live proof also remain open.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-FOCUSED-REPORT',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds a thin Markdown/JSON wrapper and structural checker over existing manifest data, with no new dependency, no duplicated release probing, no deploy path, no live-service access, and no release-gate relaxation.',
    tests_or_checks: releasePreflightReportTestsRun,
    remaining_risk: 'Release approval remains blocked until Corepack-pinned release-readiness, Git LFS push-path proof, clean source provenance, explicit owner approval, and post-deploy live proof are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-SOURCE-OF-TRUTH-HANDLES',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change updates existing docs, public release-status command handles, release posture evidence, generator/checker contracts, and tests only, with no new dependency, no deploy path, no duplicated release probing, and no release-gate relaxation.',
    tests_or_checks: releasePreflightSourceOfTruthHandleTestsRun,
    remaining_risk: 'Release approval remains blocked until Corepack-pinned release-readiness, Git LFS push-path proof, clean source provenance, explicit owner approval, and post-deploy live proof are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-STRATEGY-AUDIT-SLICE-TIMEOUT-BUDGET',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adjusts only file-level Vitest timeout budgets and existing manifest/check/report/test expectations, adds no dependency, removes no assertion, and preserves blocked launch, approval, and live-parity boundaries.',
    tests_or_checks: strategyAuditSliceTimeoutTestsRun,
    remaining_risk: 'Release approval remains blocked until Corepack-pinned release-readiness, clean source provenance, canonical branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, and post-deploy live proof are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-FOCUSED-REPORT',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds a thin manifest-backed source-provenance Markdown/JSON wrapper, structural checker, public/source-of-truth handle alignment, and focused tests without new dependencies, duplicated git classification, source mutation, release execution, deploy paths, or live-service access.',
    tests_or_checks: sourceProvenanceReportTestsRun,
    remaining_risk: 'Source provenance remains blocked until the owner intentionally resolves staged, unstaged, untracked, renamed, or ignored source rows; release-readiness, production approval, branch review, Supabase advisor clearance, buyer evidence, and post-deploy live proof also remain open gates.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-PROOF-HANDLES',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change reuses the existing focused source-provenance report/check command across existing proof rows and validators, adds no dependency, no duplicate git parser, no source mutation, no approval-packet replacement, no release execution, and no deploy path.',
    tests_or_checks: sourceProvenanceProofHandleTestsRun,
    remaining_risk: 'The staged workflow rename still blocks source provenance until an owner decision; Corepack-pinned release-readiness, branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, deployment, and post-deploy live proof also remain open.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-RENAME-SUMMARY',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change reuses the existing old_path, file_path, proof_type, and staging_state fields from source_provenance.dirty_paths and resolution_queue items, adds no dependency, no duplicate git parser, no source mutation, no source cleanup, no release execution, no approval request, and no deploy path.',
    tests_or_checks: sourceProvenanceRenameSummaryTestsRun,
    remaining_risk: 'The staged workflow rename still blocks source provenance until an owner decision; Corepack-pinned release-readiness, branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, deployment, and post-deploy live proof also remain open.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PROOF-HANDLES',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change reuses the existing focused release-preflight report/check command across existing release-toolchain proof rows and validators, adds no dependency, no duplicate toolchain probe, no Corepack/Git LFS remediation, no source mutation, no release execution beyond the retained guarded command, and no deploy path.',
    tests_or_checks: releaseToolchainProofHandleTestsRun,
    remaining_risk: 'Corepack-pinned release-readiness remains blocked until Corepack is available and clean source provenance is proven; the staged workflow rename, branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, deployment, and post-deploy live proof also remain open.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-BRANCH-REVIEW-PROOF-HANDLES',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change reuses the existing focused branch-review report/check command across existing branch-review proof rows and validators, adds no dependency, no duplicate branch scanner, no checkout, no merge, no push, no canonical-head selection, no migration, and no deploy path.',
    tests_or_checks: branchReviewProofHandleTestsRun,
    remaining_risk: 'Branch review remains blocked until review-first branch families and canonical-head owner decisions are resolved; source provenance, Corepack-pinned release-readiness, Supabase advisor clearance, buyer evidence, explicit owner approval, deployment, and post-deploy live proof also remain open.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-PROOF-HANDLES',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change reuses the existing focused Supabase advisor report/check command across existing Supabase advisor proof rows and validators, adds no dependency, no duplicate advisor parser, no connector authorization, no dashboard access, no advisor rerun, no database mutation, no secret handling, no production approval, and no deploy path.',
    tests_or_checks: supabaseAdvisorProofHandleTestsRun,
    remaining_risk: 'Supabase advisor clearance remains blocked until authorized connector or dashboard access, current Database Security Advisor evidence, current Database Performance Advisor evidence, public-safe findings, and manifest regeneration prove every advisor row; source provenance, Corepack-pinned release-readiness, branch review, buyer evidence, explicit owner approval, deployment, and post-deploy live proof also remain open.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-FOCUSED-REPORT',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds a thin manifest-backed Supabase advisor Markdown/JSON wrapper, structural checker, public/source-of-truth handle alignment, and focused tests without new dependencies, duplicated advisor parsing, connector access, dashboard access, database mutation, secret recording, release execution, deploy paths, or live-service access.',
    tests_or_checks: supabaseAdvisorReportTestsRun,
    remaining_risk: 'Supabase advisor clearance remains blocked until authorized connector or dashboard access, current Database Security Advisor evidence, current Database Performance Advisor evidence, public-safe findings, and manifest regeneration prove every advisor row; source provenance, release-readiness, production approval, branch review, buyer evidence, and post-deploy live proof also remain open gates.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-BRANCH-REVIEW-FOCUSED-REPORT',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds a thin manifest-backed branch review Markdown/JSON wrapper, structural checker, public/source-of-truth handle alignment, and focused tests without new dependencies, duplicated branch scanning, branch checkout, merge, push, discard, delete, canonical-head selection, migration, deploy paths, or live-service access.',
    tests_or_checks: branchReviewReportTestsRun,
    remaining_risk: 'Branch review remains blocked until focused branch packets, canonical-head owner decisions, drift review for stale or aging refs, clean release gates, and explicit owner approvals are current; source provenance, release-readiness, production approval, Supabase advisor clearance, buyer evidence, and post-deploy live proof also remain open gates.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-BRANCH-REVIEW-SUPABASE-FUNCTION-IMPACT-CHECK',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change strengthens only the focused branch report checker/test and manifest ledger, reusing existing top-branch function-impact rows without new dependencies, branch checkout, merge, push, function deploy, Supabase advisor access, migration execution, or launch-status change.',
    tests_or_checks: branchReviewSupabaseFunctionImpactTestsRun,
    remaining_risk: 'Branch review remains blocked until owner-approved canonical-head decisions and read-only focused review clear all branch families; source provenance, Corepack-pinned release-readiness, Supabase advisor clearance, buyer evidence, explicit owner approval, deploy, and post-deploy live proof also remain open.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-LAUNCH-MANIFEST-BRANCH-FUNCTION-IMPACT-CHECK',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change strengthens only the broad launch manifest checker/test and manifest ledger, reusing existing top-branch function-impact rows and the focused branch checker contract without new dependencies, branch checkout, merge, push, function deploy, Supabase advisor access, migration execution, or launch-status change.',
    tests_or_checks: launchManifestBranchFunctionImpactTestsRun,
    remaining_risk: 'The broad validator now rejects malformed top-branch Supabase function impact evidence, but branch review still remains blocked until owner-approved canonical-head decisions and read-only focused review clear all branch families; source provenance, Corepack-pinned release-readiness, Supabase advisor clearance, buyer evidence, explicit owner approval, deploy, and post-deploy live proof also remain open.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-LAUNCH-EVIDENCE-VALIDATION-FOCUSED-REPORT',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds a thin manifest-backed validation Markdown/JSON wrapper, structural checker, public/source-of-truth handle alignment, and focused tests without duplicating schema validation, self-certifying the manifest, adding dependencies, changing production approval eligibility, running release gates, contacting buyers, accessing external accounts, deploying, or relaxing live-parity boundaries.',
    tests_or_checks: launchEvidenceValidationReportTestsRun,
    remaining_risk: 'Launch evidence validation remains only a structure/proof-boundary gate; launch execution remains blocked until source provenance, Corepack-pinned release-readiness, branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, guarded deployment, and post-deploy live proof are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-LAUNCH-VALIDATION-PRODUCTION-APPROVAL-PROOF-HANDLES',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change updates only production approval launch-validation proof rows, focused checkers, source-of-truth text, and tests, reusing the existing focused validation command and underlying manifest check without new dependencies, duplicated validation logic, approval eligibility changes, deploy execution, source mutation, buyer contact, or external account access.',
    tests_or_checks: launchValidationProductionApprovalProofHandleTestsRun,
    remaining_risk: 'Launch evidence validation proof handles are now consistent, but production approval remains blocked until source provenance, Corepack-pinned release-readiness, branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, guarded deployment, and post-deploy live proof are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-LAUNCH-ACTION-VALIDATION-STATUS',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change updates only the existing launch_evidence_validation action row status, blocker wording, and focused validators/tests while preserving the validation proof command, no-approval boundaries, and blocked overall launch action queue.',
    tests_or_checks: launchActionValidationStatusTestsRun,
    remaining_risk: 'The launch action queue remains blocked until source provenance, release-readiness, branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, and post-deploy live proof are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-LAUNCH-ACTION-FOCUSED-REPORT',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds a thin manifest-backed launch action Markdown/JSON wrapper, structural checker, public/source-of-truth handle alignment, and focused tests without new dependencies, duplicated queue construction, source mutation, branch mutation, buyer contact, external account access, approval request execution, deploy execution, or live-parity relaxation.',
    tests_or_checks: launchActionReportTestsRun,
    remaining_risk: 'Launch action execution remains blocked until source provenance, launch evidence validation, Corepack-pinned release-readiness, branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, guarded deployment, and post-deploy live proof are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-LAUNCH-ACTION-BUYER-LANE-STATUS',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change updates only the focused launch action buyer lane status derivation and checker/test expectations, reusing existing buyer_evidence.status, hard_gate_deficits.status, and acquisition_matrix.status without new dependencies, duplicated buyer scanning, buyer contact, retained artifact creation, validation execution, or launch-gate relaxation.',
    tests_or_checks: launchActionBuyerLaneStatusTestsRun,
    remaining_risk: 'Buyer evidence remains blocked until real anonymized accepted buyer rows, retained redacted artifact hashes, commercial signal evidence, and validate:pilot-evidence --require-95 are current; source provenance, release-readiness, branch review, Supabase advisor clearance, production approval, and post-deploy live proof also remain open gates.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-PACKET-SEQUENCING',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change reuses the existing local release-readiness step status to skip static parity only when the build prerequisite is skipped or failed, with no new dependency, no fallback package manager, no deploy path, and no live-check relaxation beyond the dependent static-dist comparison.',
    tests_or_checks: productionApprovalPacketSequencingTestsRun,
    remaining_risk: 'Production approval remains blocked until clean source provenance, Corepack-pinned release-readiness, branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, deployment, and post-deploy live proof are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-FOCUSED-REPORT',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds a thin manifest-backed production approval readiness Markdown/JSON wrapper, structural checker, public/source-of-truth handle alignment, and focused tests without new dependencies, duplicated approval queue construction, approval request execution, deploy execution, browser smoke execution, or live-parity relaxation.',
    tests_or_checks: productionApprovalReportTestsRun,
    remaining_risk: 'Production approval remains blocked until clean source provenance, Corepack-pinned release-readiness, branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, guarded deployment, and post-deploy live proof are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-POST-DEPLOY-LIVE-PROOF-FOCUSED-REPORT',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds a thin manifest-backed post-deploy live proof Markdown/JSON wrapper, structural checker, public/source-of-truth handle alignment, and focused tests without new dependencies, duplicated live-proof sequencing, deploy execution, browser smoke execution, Netlify mutation, or live-parity relaxation.',
    tests_or_checks: postDeployLiveProofReportTestsRun,
    remaining_risk: 'Post-deploy live proof remains blocked until source provenance, Corepack-pinned release-readiness, branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, guarded deployment, live metadata, live static parity, and hosted proof-pack smoke are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-COMPLETION-AUDIT-PROOF-HANDLES',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change updates only objective completion audit next_proof_command values plus existing manifest/report checkers and the manifest unit test, reusing focused command constants without new dependencies, duplicate gate parsers, external account calls, release execution, deploy execution, or live-service mutation.',
    tests_or_checks: completionAuditProofHandleTestsRun,
    remaining_risk: 'The launch goal remains blocked until retained buyer evidence, source provenance, branch owner decisions, Supabase advisor clearance, Corepack-pinned release-readiness, explicit owner approval, guarded deployment, and post-deploy live proof are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-LAUNCH-ACTION-FINAL-PROOF-HANDLES',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change updates only the final launch action queue proof_command values plus existing checker/test assertions, reusing focused production approval and post-deploy report/check handles without new dependencies, duplicate final-gate parsers, owner approval requests, deploy execution, live-proof execution, or live-service mutation.',
    tests_or_checks: launchActionFinalProofHandleTestsRun,
    remaining_risk: 'Production approval remains a manual stop and post-deploy live proof remains blocked until source provenance, Corepack-pinned release-readiness, branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, guarded deployment, live metadata, static parity, and hosted smoke are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-FIX-REPORT-FOCUSED-CHECKS',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change updates only the existing manifest Fix Report command list plus checker/test assertions, reusing focused proof command constants without adding dependencies, duplicating lane parsers, executing external gates, or changing launch status.',
    tests_or_checks: fixReportFocusedChecksTestsRun,
    remaining_risk: 'The launch goal remains blocked until retained buyer evidence, source provenance cleanup, branch owner decisions, Supabase advisor clearance, Corepack-pinned release-readiness, explicit owner approval, guarded deployment, and post-deploy live proof are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-PUBLIC-FIX-REPORT-COMMAND-HANDLES',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change updates only the existing public release-status Fix Report command contract, source/generated JSON, source-of-truth docs, tests, and manifest ledger assertions, with no new dependency, new public artifact type, lane-parser duplication, external gate execution, or launch-status change.',
    tests_or_checks: publicFixReportCommandTestsRun,
    remaining_risk: 'The public status remains an external-gate map; launch readiness still depends on retained buyer evidence, source provenance cleanup, branch owner decisions, Supabase advisor clearance, Corepack-pinned release-readiness, explicit owner approval, guarded deployment, and post-deploy live proof.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-PROGRESS-DIGEST-FOCUSED-REPORT',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds one thin focused report/check pair over existing manifest progress fields, reuses public/source-of-truth status surfaces, adds no dependency, duplicates no blocker scanner, executes no external gate, and preserves blocked launch status.',
    tests_or_checks: progressDigestFocusedReportTestsRun,
    remaining_risk: 'The progress digest remains evidence visibility only; launch readiness still depends on retained buyer evidence, source provenance cleanup, branch owner decisions, Supabase advisor clearance, Corepack-pinned release-readiness, explicit owner approval, guarded deployment, and post-deploy live proof.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-OBJECTIVE-COMPLETION-AUDIT-FOCUSED-REPORT',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds one thin focused report/check pair over existing manifest completion_audit fields, reuses public/source-of-truth status surfaces, adds no dependency, duplicates no gate parser, executes no external gate, and preserves blocked launch status.',
    tests_or_checks: objectiveCompletionAuditFocusedReportTestsRun,
    remaining_risk: 'The objective completion audit remains evidence visibility only; launch readiness still depends on retained buyer evidence, source provenance cleanup, branch owner decisions, Supabase advisor clearance, Corepack-pinned release-readiness, explicit owner approval, guarded deployment, and post-deploy live proof.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-ADVERSARIAL-REVIEW-FOCUSED-REPORT',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds one thin focused report/check pair over existing manifest adversarial_reviews fields, reuses public/source-of-truth status surfaces, adds no dependency, duplicates no gate parser or review builder, executes no external gate, and preserves blocked launch status.',
    tests_or_checks: adversarialReviewFocusedReportTestsRun,
    remaining_risk: 'The adversarial review ledger remains claim-refutation visibility only; launch readiness still depends on retained buyer evidence, source provenance cleanup, branch owner decisions, Supabase advisor clearance, Corepack-pinned release-readiness, explicit owner approval, guarded deployment, and post-deploy live proof.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-PUBLIC-CHECK-HANDLES',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change reuses the existing focused release-preflight report/check across three stale public status command rows, adds no dependency, duplicates no release-preflight parser, executes no release-readiness or deploy command, and preserves blocked launch status.',
    tests_or_checks: releasePreflightPublicCheckHandleTestsRun,
    remaining_risk: 'Release readiness remains blocked until Corepack-pinned release-readiness, Git LFS push-path proof, clean source provenance, explicit owner production approval, guarded deploy, and post-deploy live proof are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PNPM-DIAGNOSTIC',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds one diagnostic command/current/boundary field set to the existing Corepack toolchain row, renders those fields in existing focused and broad reports, and updates existing validators/tests without adding dependencies, new probe gates, release execution, tool installation, or launch-status changes.',
    tests_or_checks: releaseToolchainPnpmDiagnosticTestsRun,
    remaining_risk: 'Release readiness remains blocked until Corepack is available in the release shell, Corepack-pinned release-readiness passes, Git LFS push-path proof is current, source provenance is clean, owner approval is explicit, guarded deploy completes, and post-deploy live proof passes.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-GIT-LFS-HOOK-DIAGNOSTIC',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds hook-path diagnostic fields to the existing Git LFS toolchain row, reuses report/check/table contracts, and avoids hook mutation, global PATH mutation, new dependencies, new release gates, push execution, deploy execution, or launch-status changes.',
    tests_or_checks: releaseToolchainGitLfsHookDiagnosticTestsRun,
    remaining_risk: 'Git LFS hook execution still depends on the PATH used by future git commit and pre-push invocations; release readiness also remains blocked until Corepack, source provenance, branch review, Supabase advisor, buyer evidence, owner approval, guarded deploy, and post-deploy live proof are current.',
  },
  {
    target_task: 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-COREPACK-ENV-DIAGNOSTIC',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'The selected change adds diagnostic lines to the existing hard Corepack checker and one focused unit assertion path, with no package-manager fallback, no tool installation, no PATH rewrite, no new dependency, no release execution, and no launch-status change.',
    tests_or_checks: releaseToolchainCorepackEnvDiagnosticTestsRun,
    remaining_risk: 'Release readiness remains blocked until Corepack is actually available in the release shell, Corepack-pinned release-readiness passes, source provenance is clean, Git LFS evidence is current for commit/push, branch review and Supabase advisor evidence clear, buyer evidence exists, owner approval is explicit, guarded deploy completes, and post-deploy live proof passes.',
  },
];

const manifest = {
  schema_version: 1,
  repo: {
    name: pkg.name,
    path: repoRoot,
    profile: 'data-app',
    commit: gitStatus.commit,
  },
  run: {
    name: 'ceip-launch-readiness-current-state',
    mode: 'fix-safe',
    research_depth: 'deep',
    worker_mode: 'dry-run',
    generated_at: generatedAt,
  },
  launch_decision: 'blocked',
  scores: launchScores,
  proof_buckets: {
    hosted_live: [],
    local: [
      'Local release readiness is verified separately with corepack pnpm run check:release-readiness; do not infer current deploy approval from this JSON alone.',
      dirtyEvidence,
      sourceProvenanceIsolationLedger.evidence,
      sourceProvenanceResolutionQueue.evidence,
      buyerProbe.evidence,
      buyerProbe.reviewEvidence,
      buyerEvidenceAcquisitionMatrix.evidence,
      buyerProbe.hardGateDeficits.remediation_queue.evidence,
      branchProbe.evidence,
      branchProbe.familyEvidence,
      branchProbe.freshnessEvidence,
      branchReviewQueue.evidence,
      canonicalHeadDecisions.evidence,
      canonicalHeadResolutionQueue.evidence,
      reviewFirstBranchPackets.evidence,
      topBranchReviewPacket.evidence,
      topBranchReviewPacket.canonical_head_comparison?.evidence,
      supabaseAdvisor.evidence,
      supabaseAdvisor.clearanceDeficits.evidence,
      supabaseAdvisor.clearanceDeficits.remediation_queue.evidence,
      releasePreflight.evidence,
      releasePreflight.clearance_matrix.evidence,
      releasePreflight.remediation_queue.evidence,
      launchActionQueue.evidence,
      productionApprovalPrerequisiteQueue.evidence,
      productionApprovalRequestPacket.evidence,
      postDeployLiveProofGateQueue.evidence,
    ],
    repo_artifact: [
      'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
      'docs/CEIP_CONVERSATION_OUTCOME_REVIEW_2026-06-03.md',
      'docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md',
      'src/lib/commercialPositioning.ts',
      'scripts/report-buyer-evidence-readiness.mjs',
      'scripts/report-buyer-evidence-gate-readiness.mjs',
      'scripts/check-buyer-evidence-gate-readiness-report.mjs',
      'scripts/report-production-approval-packet.mjs',
      'scripts/report-source-provenance-readiness.mjs',
      'scripts/report-supabase-advisor-readiness.mjs',
      'scripts/report-unmerged-branch-readiness.mjs',
      'scripts/report-branch-review-readiness.mjs',
      'scripts/check-branch-review-readiness-report.mjs',
      'src/lib/releasePosture.ts',
      'src/lib/publicReleaseStatusManifest.json',
      'scripts/check-corepack-toolchain.mjs',
      'scripts/deploy-production.sh',
    ],
    candidate_shadow: [
      '/utility-demand-forecast',
      '/forecast-benchmarking',
      '/regulatory-filing',
      '/ga-ici-5cp',
      '/byo-csv-proof',
      '/roi-calculator',
      '/credit-banking',
      '/asset-health',
      '/utility-security',
      '/shadow-billing',
    ],
    roadmap: [
      'Phase F buyer evidence workspace remains the required path to confidence movement.',
      'High-risk, local-only, origin-only, stale, or aging unmerged branch families remain review queues until focused checks, drift review, and owner approvals clear.',
      'Status/advisor automation remains future work until live credentials and connector permissions are available.',
    ],
  },
  buyer_evidence: {
    status: buyerProbe.status,
    production_registers: buyerProbe.productionRegisters,
    starter_only_registers: buyerProbe.starterOnlyRegisters,
    outreach_logs: buyerProbe.outreachLogs,
    confidence_moving_rows: buyerProbe.confidenceRows,
    actionable_outreach_rows: buyerProbe.actionableRows,
    batchable_intake_packet_rows: buyerProbe.batchableIntakeRows,
    evidence_root: buyerProbe.evidenceRoot,
    phase_f_gate: buyerProbe.phaseFGate,
    workspace_next_step: buyerProbe.workspaceNextStep,
    acquisition_matrix: buyerEvidenceAcquisitionMatrix,
    hard_gate_deficits: buyerProbe.hardGateDeficits,
    evidence: buyerProbe.reviewEvidence,
  },
  supabase_advisor: {
    status: supabaseAdvisor.status,
    project_ref: supabaseAdvisor.projectRef,
    cli_app_lint_status: supabaseAdvisor.cliAppLintStatus,
    security_performance_advisors_status: supabaseAdvisor.securityPerformanceAdvisorsStatus,
    connector_permission: supabaseAdvisor.connectorPermission,
    proof_bucket: supabaseAdvisor.proofBucket,
    command: supabaseAdvisor.command,
    docs_reference: supabaseAdvisor.docsReference,
    evidence_boundary: supabaseAdvisor.evidenceBoundary,
    next_action: supabaseAdvisor.nextAction,
    clearance_deficits: supabaseAdvisor.clearanceDeficits,
    evidence: supabaseAdvisor.evidence,
  },
  branch_review: {
    status: branchReviewStatus,
    probe_status: branchProbe.status,
    evidence_boundary: 'Read-only branch probe execution does not clear review-first branch families, canonical-head decisions, merge approval, production approval, or deploy readiness.',
    risk_counts: {
      high: branchProbe.highRisk,
      medium: branchProbe.mediumRisk,
      low: branchProbe.lowRisk,
    },
    family_counts: {
      total: branchProbe.familyCounts.total,
      local_only: branchProbe.familyCounts.localOnly,
      origin_only: branchProbe.familyCounts.originOnly,
      matching_heads: branchProbe.familyCounts.matchingHeads,
      local_ahead: branchProbe.familyCounts.localAhead,
      origin_ahead: branchProbe.familyCounts.originAhead,
      diverged: branchProbe.familyCounts.diverged,
      unknown: branchProbe.familyCounts.unknown,
      high_risk_families: branchProbe.familyCounts.highRiskFamilies,
    },
    freshness_counts: {
      stale: branchProbe.staleCount,
      aging: branchProbe.agingCount,
      fresh: branchProbe.freshCount,
      unknown: branchProbe.unknownFreshnessCount,
      stale_high_risk: branchProbe.staleHighRiskCount,
      aging_high_risk: branchProbe.agingHighRiskCount,
    },
    family_evidence: branchProbe.familyEvidence,
    freshness_evidence: branchProbe.freshnessEvidence,
    review_queue: branchReviewQueue,
    canonical_head_decisions: canonicalHeadDecisions,
    canonical_head_resolution_queue: canonicalHeadResolutionQueue,
    clearance_matrix: branchClearanceMatrix,
    review_first_packets: reviewFirstBranchPackets,
    top_review_packet: topBranchReviewPacket,
    evidence: [
      `Branch review clearance: status=${branchReviewStatus}; probe_status=${branchProbe.status}; review_first=${branchReviewQueue.review_first_count ?? 'unknown'}; canonical_open=${canonicalHeadDecisions.open_count ?? 'unknown'}; boundary=read-only probe execution does not clear review-first branch families, canonical-head decisions, merge approval, production approval, or deploy readiness.`,
      branchProbe.familyEvidence,
      branchProbe.freshnessEvidence,
      branchReviewQueue.evidence,
      canonicalHeadDecisions.evidence,
      canonicalHeadResolutionQueue.evidence,
      branchClearanceMatrix.evidence,
      reviewFirstBranchPackets.evidence,
      topBranchReviewPacket.evidence,
      topBranchReviewPacket.canonical_head_comparison?.evidence,
    ].join(' '),
  },
  source_provenance: {
    branch: gitStatus.branch,
    commit: gitStatus.commit,
    is_dirty: gitStatus.isDirty,
    dirty_path_count: gitStatus.dirtyLines.length,
    dirty_paths: gitStatus.dirtyDetails,
    isolation_ledger: sourceProvenanceIsolationLedger,
    resolution_queue: sourceProvenanceResolutionQueue,
    evidence: dirtyEvidence,
    deploy_gate: gitStatus.isDirty
      ? 'blocked until dirty tracked/untracked paths are committed, stashed, removed, or otherwise intentionally resolved before deploy approval'
      : 'source worktree clean at manifest generation time; owner approval and release gates still apply before deploy',
  },
  release_preflight: releasePreflight,
  launch_action_queue: launchActionQueue,
  production_approval: {
    status: productionApprovalPrerequisiteQueue.status,
    explicit_owner_approval: false,
    prerequisite_queue: productionApprovalPrerequisiteQueue,
    request_packet: productionApprovalRequestPacket,
    evidence: [
      productionApprovalPrerequisiteQueue.evidence,
      productionApprovalRequestPacket.evidence,
    ].join(' '),
    stop_gate: 'This manifest does not grant production approval; deploy-production.sh, netlify deploy, push, or post-deploy live claims require explicit owner approval and current release gates.',
  },
  post_deploy_live_proof: {
    status: postDeployLiveProofGateQueue.status,
    current_source_live_proven: false,
    gate_queue: postDeployLiveProofGateQueue,
    evidence: postDeployLiveProofGateQueue.evidence,
    stop_gate: 'This manifest does not prove hosted/live parity for current source; live parity requires an explicitly approved deploy followed by check:post-deploy-live.',
  },
  gaps: launchGaps,
  pain_points: painPoints,
  target_customers: targetCustomers,
  outreach_plan: {
    phase_30_days: 'Use the Phase F evidence workspace and intake packets for the three minimum lanes: utility forecast, TIER/credit, and billing/security.',
    phase_60_days: 'Convert real anonymized buyer responses into retained redacted artifacts and pilot register rows; keep rehearsal rows at confidence_delta=0.',
    phase_90_days: 'Only after the hard 95% gate passes, refresh launch scores, target ranking, and production approval status.',
    email_script_boundary: 'Use proof-pack-specific outreach only. Do not claim buyer-proven 95% confidence, production utility onboarding, guaranteed savings, or security certification.',
    linkedin_script_boundary: 'Ask for one redacted pilot artifact review, not a purchase claim; route respondents into intake packets.',
    demo_narrative: 'Show repo-backed proof packs, blocked claims, and retained-artifact workflow before asking for buyer data.',
    objection_handling: 'If asked for proof, distinguish hosted/live parity, local release readiness, repo artifacts, constructed demos, and missing buyer evidence.',
  },
  completion_audit: completionAudit,
  fix_report: {
    files_changed: currentSafeFixFilesChanged,
    tests_run: currentSafeFixTestsRun,
    files_changed_by_manifest_command: [],
    safe_fix_boundary: 'This manifest command is read-only unless --output is used to write the JSON file.',
    current_required_checks: [
      SOURCE_PROVENANCE_FOCUSED_PROOF_COMMAND,
      LAUNCH_EVIDENCE_VALIDATION_FOCUSED_PROOF_COMMAND,
      LAUNCH_ACTION_FOCUSED_PROOF_COMMAND,
      RELEASE_READINESS_FOCUSED_PROOF_COMMAND,
      BRANCH_REVIEW_FOCUSED_PROOF_COMMAND,
      SUPABASE_ADVISOR_FOCUSED_PROOF_COMMAND,
      BUYER_EVIDENCE_GATE_FOCUSED_PROOF_COMMAND,
      PRODUCTION_APPROVAL_FOCUSED_PROOF_COMMAND,
      POST_DEPLOY_LIVE_PROOF_FOCUSED_PROOF_COMMAND,
      'corepack pnpm run report:buyer-evidence-readiness',
      'corepack pnpm run report:production-approval-packet',
      'corepack pnpm run report:unmerged-branch-readiness',
      'corepack pnpm run report:unmerged-branch-readiness -- --focus-risk high',
      'corepack pnpm run check:launch-evidence-manifest',
      'corepack pnpm run check:commercial-launch-readiness-report',
      'corepack pnpm run check:release-readiness',
      'corepack pnpm run check:production-deploy-request',
      'corepack pnpm run check:post-deploy-live',
      'production approval prerequisite queue synthesis',
      'production approval request packet synthesis',
      'post-deploy live proof gate queue synthesis',
      'python3 /Users/sanjayb/.codex/skills/commercial-launch-readiness-orchestrator/scripts/validate_launch_evidence.py <manifest>',
    ],
    unresolved_blockers: [
      'Real buyer evidence and retained redacted artifacts are absent.',
      'Production deploy still requires clean source provenance and explicit owner approval.',
      'High-risk, local/origin split, or stale/aging unmerged branches remain review queues.',
      'Supabase advisor clearance remains blocked until connector or dashboard advisor evidence is authorized, rerun, and recorded.',
      'Release toolchain and push-path proof remain blocked until Corepack release-readiness, Git LFS, clean source provenance, and owner approval are current.',
      'Production approval remains manual-stop until every prerequisite row is ready and the owner explicitly approves deployment.',
      'Post-deploy live proof remains blocked until an explicitly approved deploy runs and live metadata, static parity, and hosted proof-pack smoke all pass.',
    ],
  },
  implementation_decisions: safeFixImplementationDecisions,
  rejected_variants: safeFixRejectedVariants,
  code_optimization_reviews: safeFixCodeOptimizationReviews,
  adversarial_reviews: [
    adversarialReview({
      lane: 'buyer evidence',
      finding: 'Repo scaffolding and constructed proof packs are not buyer acceptance evidence.',
      decision: 'Keep launch_decision blocked until the hard pilot evidence gate passes.',
    }),
    adversarialReview({
      lane: 'production approval',
      finding: 'A passing local release gate or launch evidence validation does not authorize deployment while source provenance is dirty or owner approval is missing.',
      decision: 'Keep deploy request blocked until provenance, launch evidence validation, and approval gates clear.',
    }),
    adversarialReview({
      lane: 'release toolchain',
      finding: 'Direct pnpm checks, a skipped production approval packet, or a commit with a Git LFS hook warning do not prove the guarded release path is ready.',
      decision: 'Keep release approval blocked until Corepack-pinned release-readiness, Git LFS push-path proof, clean source provenance, and owner approval are current.',
    }),
    adversarialReview({
      lane: 'Supabase advisor clearance',
      finding: 'CLI database lint and repo security artifacts do not substitute for connector-backed or dashboard Supabase advisor clearance.',
      decision: 'Keep Supabase advisor clearance blocked until authorization, security advisor evidence, performance advisor evidence, and public-safe findings records pass.',
    }),
    adversarialReview({
      lane: 'branch risk',
      finding: 'Unmerged branches are not launch evidence; local/origin split families and stale or aging refs add drift risk and can only become merge candidates after canonical-head selection, focused review, and release gates.',
      decision: 'Keep high-risk, local/origin split, and stale/aging branches in review queue.',
    }),
  ],
  progress_updates: [
    {
      phase: 'objective completion audit',
      accomplished: 'Mapped required commercial launch deliverables to current manifest/report evidence, explicit proof boundaries, unresolved blocker gates, and next proof commands.',
      target_matrix: [
        'launch score',
        'gap analysis',
        'market pain map',
        'target customer ranking',
        'outreach plan',
        'fix report',
        'structured evidence manifest',
        'ECC ledger',
        'buyer evidence gate',
        'production/live proof gate',
      ],
      pending: 'Buyer evidence, source provenance, branch review, Supabase advisor clearance, release toolchain proof, production approval, and post-deploy live proof remain unresolved.',
      bottleneck: 'Current blockers require retained buyer artifacts, owner-side approval, authorized Supabase advisor evidence, branch decisions, and guarded deploy/live proof outside this read-only manifest run.',
      created_at: generatedAt,
    },
  ],
  bottleneck_log: [
    {
      phase: 'commercial launch readiness',
      task_or_subtask: 'clear objective completion blockers',
      elapsed_minutes: 0,
      last_update: generatedAt,
      root_cause: 'evidence gap',
      top_unblock_options: [
        'Collect real anonymized buyer rows and retained redacted artifacts, then run validate:pilot-evidence --require-95.',
        'Resolve source provenance intentionally and run the guarded release-readiness and production-approval checks.',
        'Complete read-only branch review plus authorized Supabase advisor review before any deploy approval request.',
      ],
    },
  ],
  market_evidence_mode: 'mixed',
  synthetic_data_points: [],
  ecc_ledger: {
    route: 'commercial-launch-readiness-orchestrator',
    tier: 1,
    mode: 'normal PhaseLoop',
    skills_tools: ['commercial-launch-readiness-orchestrator', 'dynamic-workflow-backlog automode --dry-run'],
    baseline: 'CEIP has strong repo/local proof scaffolding but missing buyer evidence and blocked deploy provenance.',
    checks: skipProbes
      ? ['git status --porcelain=v1', 'git rev-parse --short HEAD']
      : [
          'git status --porcelain=v1',
          'git rev-parse --short HEAD',
          'node scripts/report-buyer-evidence-readiness.mjs',
          'node scripts/report-unmerged-branch-readiness.mjs --max-files 6',
          'corepack pnpm --version',
          'git lfs version',
          'launch blocker action queue synthesis',
          'canonical head decision ledger synthesis',
          'source provenance resolution queue synthesis',
          'release preflight remediation queue synthesis',
          'Supabase advisor remediation queue synthesis',
          'buyer evidence remediation queue synthesis',
          'production approval prerequisite queue synthesis',
          'post-deploy live proof gate queue synthesis',
        ],
    delta: 'Generated a schema-shaped launch evidence manifest with conservative blocked decision, explicit buyer-evidence remediation actions, release preflight deficits, release remediation actions, Supabase advisor remediation actions, an ordered launch blocker action queue, a launch-evidence validation prerequisite, a production approval prerequisite queue, a production approval request packet, a post-deploy live proof gate queue, canonical-head branch decision deficits, and source-provenance resolution decisions.',
    reflection: 'The manifest improves handoff and portfolio comparability without changing buyer confidence, buyer contact state, deployment approval, branch state, canonical-head ownership, source ownership, release tool installation, Supabase authorization, database state, browser smoke state, production hosting, or live proof.',
    decision: 'blocked',
    next_adjustment: 'Resolve source provenance or collect real Phase F buyer evidence; do not raise launch status from repo artifacts alone.',
  },
};

const json = `${JSON.stringify(manifest, null, 2)}\n`;
const outputPath = values.get('output');
if (outputPath) {
  const absoluteOutput = path.resolve(repoRoot, outputPath);
  if (existsSync(absoluteOutput) && !absoluteOutput.endsWith('.json')) {
    console.error('Launch evidence manifest failed:\n');
    console.error(`- Refusing to overwrite non-JSON output path: ${outputPath}`);
    process.exit(1);
  }
  writeFileSync(absoluteOutput, json, 'utf8');
}

process.stdout.write(json);
