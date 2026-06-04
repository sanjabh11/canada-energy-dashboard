#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
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
    };
  } catch {
    return { name: path.basename(repoRoot), description: '', homepage: '', packageManager: '' };
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
    },
    {
      requirement: 'Connector project authorization',
      current: advisor.connectorPermission,
      needed: `authorized connector or dashboard access to project ${advisor.projectRef}`,
      status: connectorAuthorized ? 'pass' : 'needs_remediation',
      next_action: 'Fix Supabase connector or project authorization before rerunning security/performance advisors.',
    },
    {
      requirement: 'Security advisor evidence',
      current: advisor.securityPerformanceAdvisorsStatus,
      needed: 'Supabase Database Security Advisor results reviewed for the current project and source posture',
      status: advisorVerified ? 'pass' : 'needs_remediation',
      next_action: 'Rerun Supabase security advisors after authorization is fixed and record public-safe findings or remediation blockers.',
    },
    {
      requirement: 'Performance advisor evidence',
      current: advisor.securityPerformanceAdvisorsStatus,
      needed: 'Supabase Database Performance Advisor results reviewed for the current project and source posture',
      status: advisorVerified ? 'pass' : 'needs_remediation',
      next_action: 'Rerun Supabase performance advisors after authorization is fixed and record public-safe findings or remediation blockers.',
    },
    {
      requirement: 'Public-safe findings record',
      current: publicSafeFindingsRecorded ? 'recorded' : 'not recorded',
      needed: 'redacted advisor summary with run date, project ref, unresolved findings, and no secrets',
      status: publicSafeFindingsRecorded ? 'pass' : 'needs_remediation',
      next_action: 'After advisors run, retain a public-safe summary that excludes credentials and direct account details.',
    },
    {
      requirement: 'Advisor clearance claim',
      current: 'no clearance claimed',
      needed: 'clearance claim only after CLI lint, security advisor, performance advisor, and public-safe evidence rows pass',
      status: cliVerified && connectorAuthorized && advisorVerified && publicSafeFindingsRecorded ? 'pass' : 'blocked',
      next_action: 'Keep launch security wording at repo/local proof until all Supabase advisor clearance rows pass.',
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
      return 'corepack pnpm run report:production-approval-packet -- --skip-release-readiness';
    case 'Explicit owner production approval':
      return 'corepack pnpm run check:production-deploy-request';
    default:
      return 'corepack pnpm run report:launch-evidence-manifest';
  }
}

function releaseRemediationStopGate(requirement) {
  switch (requirement) {
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
  const gitLfsResult = skipProbes ? null : run('git', ['lfs', 'version']);
  const gitLfsOutput = gitLfsResult ? compactCommandOutput(gitLfsResult) : 'probe skipped by --skip-probes';
  const gitLfsAvailable = gitLfsResult?.status === 0;

  const items = [
    {
      requirement: 'Pinned package manager',
      current: packageManager || 'missing',
      needed: 'exact packageManager pin in package.json such as pnpm@10.23.0',
      status: packageManagerPinned ? 'pass' : 'blocked',
      next_action: 'Keep package.json packageManager pinned to the exact pnpm version used by release-readiness.',
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
    },
    {
      requirement: 'Release-readiness execution',
      current: 'not run by launch manifest',
      needed: 'corepack pnpm run check:release-readiness passes after source provenance is clean',
      status: 'blocked',
      next_action: 'Run the full Corepack-pinned release-readiness chain before requesting production approval.',
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
    },
    {
      requirement: 'Clean source provenance',
      current: gitStatus.isDirty ? `${gitStatus.dirtyLines.length} dirty path(s)` : 'clean worktree',
      needed: 'branch main with clean worktree before deploy approval request',
      status: gitStatus.isDirty ? 'blocked' : 'pass',
      next_action: gitStatus.isDirty
        ? 'Resolve dirty tracked/untracked paths without touching unrelated user work, then rerun the production approval packet.'
        : 'Keep source provenance clean through release-readiness and approval packet generation.',
    },
    {
      requirement: 'Explicit owner production approval',
      current: 'not granted by this report',
      needed: 'explicit owner approval before any production deploy command',
      status: 'manual_stop',
      next_action: 'Ask for explicit production approval only after source provenance and release-readiness are clean.',
    },
  ];

  const deficits = {
    status: items.every((item) => item.status === 'pass') ? 'pass' : 'blocked',
    package_manager: packageManager || null,
    expected_pnpm_version: expectedVersion,
    corepack_probe: skipProbes ? 'skipped' : (corepackResult?.status === 0 ? 'pass' : 'fail'),
    git_lfs_probe: skipProbes ? 'skipped' : (gitLfsAvailable ? 'pass' : 'fail'),
    open_count: items.filter((item) => item.status !== 'pass').length,
    total_count: items.length,
    items,
  };

  return {
    ...deficits,
    remediation_queue: buildReleasePreflightRemediationQueue(deficits),
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

function buildLaunchActionQueue({
  buyerProbe,
  branchReviewQueue,
  supabaseAdvisor,
  releasePreflight,
  gitStatus,
}) {
  const dirtyPathSummary = gitStatus.isDirty
    ? `${gitStatus.dirtyLines.length} dirty path(s); first=${gitStatus.dirtyDetails[0]?.file_path ?? 'unknown'}`
    : 'clean worktree';
  const branchReviewFirst = branchReviewQueue.review_first_count ?? null;
  const branchTop = branchReviewQueue.items?.[0]?.review_ref ?? '<review-ref>';
  const supabaseOpen = supabaseAdvisor.clearanceDeficits?.open_count ?? 'unknown';
  const buyerOpenCount = buyerProbe.hardGateDeficits?.open_count;
  const buyerOpen = buyerOpenCount ?? 'unknown';
  const buyerDeficitsOpen = !Number.isInteger(buyerOpenCount) || buyerOpenCount > 0;
  const releaseOpen = releasePreflight.open_count ?? 'unknown';

  const items = [
    {
      rank: 1,
      phase: 'source_provenance',
      blocker: dirtyPathSummary,
      owner: 'operator',
      action: 'Resolve staged or unstaged source changes intentionally before any deploy approval request.',
      proof_command: 'corepack pnpm run report:production-approval-packet -- --skip-release-readiness',
      stop_gate: 'Do not commit, unstage, stash, revert, or delete unrelated user work without explicit owner intent.',
      status: gitStatus.isDirty ? 'blocked' : 'ready',
    },
    {
      rank: 2,
      phase: 'release_toolchain',
      blocker: `${releaseOpen} release-preflight deficit(s) remain`,
      owner: 'operator',
      action: 'Run the guarded release path only from a Corepack-enabled shell after source provenance is clean.',
      proof_command: 'corepack pnpm run check:release-readiness',
      stop_gate: 'Do not treat bare pnpm checks, skipped approval packets, or hook warnings as production approval evidence.',
      status: releasePreflight.status === 'pass' ? 'ready' : 'blocked',
    },
    {
      rank: 3,
      phase: 'branch_review',
      blocker: `${branchReviewFirst ?? 'unknown'} review-first branch family/families; top=${branchTop}`,
      owner: 'operator',
      action: 'Run focused read-only branch reviews and choose canonical heads before any merge, push, discard, migration, or deploy discussion.',
      proof_command: `corepack pnpm run report:unmerged-branch-readiness -- --branch ${branchTop} --max-files 8`,
      stop_gate: 'No checkout, merge, push, discard, migration, or production approval without explicit owner approval and release gates.',
      status: (branchReviewFirst ?? 1) > 0 ? 'blocked' : 'ready',
    },
    {
      rank: 4,
      phase: 'supabase_advisor',
      blocker: `${supabaseOpen} Supabase advisor clearance deficit(s) remain`,
      owner: 'account_admin',
      action: 'Repair Supabase connector or dashboard authorization, rerun security/performance advisors, and retain public-safe findings.',
      proof_command: 'Supabase MCP or dashboard security/performance advisor review for qnymbecjgeaoxsfphrti',
      stop_gate: 'Do not claim Supabase advisor clearance from CLI app lint, repo artifacts, or public status cards alone.',
      status: supabaseAdvisor.clearanceDeficits?.status === 'pass' ? 'ready' : 'blocked',
    },
    {
      rank: 5,
      phase: 'buyer_evidence',
      blocker: `${buyerOpen} buyer hard-gate deficit(s) remain`,
      owner: 'buyer_operator',
      action: 'Collect real anonymized accepted buyer rows and retained redacted artifacts for the minimum Phase F lanes.',
      proof_command: 'corepack pnpm run validate:pilot-evidence -- path/to/register.csv --require-95 --evidence-root path/to/redacted-artifacts',
      stop_gate: 'Do not count templates, generated workspaces, rehearsal rows, outreach headers, or constructed demos as buyer acceptance.',
      status: buyerDeficitsOpen ? 'blocked' : 'ready',
    },
    {
      rank: 6,
      phase: 'production_approval',
      blocker: 'explicit owner production approval is not granted by this report',
      owner: 'owner',
      action: 'Request production deployment approval only after source provenance, release-readiness, branch review, and security/advisor gates are clean.',
      proof_command: 'corepack pnpm run check:production-deploy-request',
      stop_gate: 'Do not run deploy-production.sh or netlify deploy without explicit production approval.',
      status: 'manual_stop',
    },
    {
      rank: 7,
      phase: 'post_deploy_live_proof',
      blocker: 'current source is not live-proven by this manifest',
      owner: 'operator',
      action: 'After an explicitly approved deploy, prove live metadata, static parity, and hosted proof-pack route smoke.',
      proof_command: 'corepack pnpm run check:post-deploy-live',
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

function parseGateLine(text, label) {
  const pattern = new RegExp(`^${label}:\\s*(.+)$`, 'm');
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function buyerEvidenceReviewEvidence(probe) {
  return [
    'Buyer evidence review:',
    `production_registers=${probe.productionRegisters ?? 'unknown'}`,
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

function buyerEvidenceRemediationProofCommand(requirement) {
  switch (requirement) {
    case 'Utility forecast lane':
      return 'corepack pnpm run prepare:forecast-trust-report-artifact -- <benchmark-pack.json> --output-file path/to/redacted-artifacts/utility-forecast.md';
    case 'TIER or credit lane':
      return 'corepack pnpm run prepare:pilot-evidence-artifact -- --route /credit-banking --evidence-root path/to/redacted-artifacts --artifact-file credit-banking.md';
    case 'Billing or security lane':
      return 'corepack pnpm run prepare:pilot-evidence-artifact -- --route /shadow-billing --evidence-root path/to/redacted-artifacts --artifact-file shadow-billing.md';
    case 'Distinct accepted proof packs':
      return 'corepack pnpm run report:pilot-evidence-95 -- path/to/filled-pilot-evidence-register.csv --evidence-root path/to/redacted-artifacts';
    case 'Accepted confidence_delta':
      return 'corepack pnpm run update:pilot-evidence-register-row -- --register-file path/to/register.csv --evidence-root path/to/redacted-artifacts --confidence-delta <0..0.4> --output-file path/to/filled-register.csv';
    case 'Retained SHA-256 references':
      return 'corepack pnpm run prepare:pilot-evidence-artifact -- --evidence-root path/to/redacted-artifacts --artifact-file redacted-artifact.md';
    case 'Buyer data coverage':
      return 'corepack pnpm run update:pilot-evidence-register-row -- --buyer-data-coverage-pct <70..100> --register-file path/to/register.csv --evidence-root path/to/redacted-artifacts --output-file path/to/filled-register.csv';
    case 'Artifact turnaround':
      return 'corepack pnpm run update:pilot-evidence-register-row -- --time-to-artifact-hours <0..120> --register-file path/to/register.csv --evidence-root path/to/redacted-artifacts --output-file path/to/filled-register.csv';
    case 'Strong commercial signal':
      return 'corepack pnpm run update:pilot-evidence-register-row -- --commercial-commitment-status <design_partner_signed|paid_pilot|purchase_order|letter_of_intent> --register-file path/to/register.csv --evidence-root path/to/redacted-artifacts --output-file path/to/filled-register.csv';
    case 'Retained-artifact 95% validation':
      return 'corepack pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root path/to/redacted-artifacts';
    default:
      return 'corepack pnpm run report:buyer-evidence-readiness -- --root path/to/anonymized-outreach-or-registers --evidence-root path/to/redacted-artifacts';
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
  return {
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

function sourceProvenanceResolutionEvidence(queue) {
  if (queue.status === 'pass') {
    return 'Source provenance resolution queue: status=pass dirty_paths=0 owner_decisions=0 approval_gate=owner approval and release gates still apply before deploy';
  }

  const topBlocked = queue.items
    .slice(0, 5)
    .map((item) => `${item.file_path}:${item.staging_state}:${item.source_status}:${item.status}`)
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
    proof_command: 'corepack pnpm run report:production-approval-packet -- --skip-release-readiness',
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

function branchReviewQueueForProbe(probe) {
  if (probe.status === 'skipped') {
    return {
      status: 'skipped',
      item_count: null,
      review_first_count: null,
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
      return {
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
  const topFamilies = items.slice(0, 4).map((item) => `${item.family}:${item.priority}`);

  return {
    status: probe.status,
    item_count: items.length,
    review_first_count: reviewFirstCount,
    evidence: [
      'Branch review queue:',
      `items=${items.length}`,
      `review_first=${reviewFirstCount}`,
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
        proof_command: item.review_command,
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

function probeFocusedBranchReviewPacket(queueItem, { evidenceLabel = 'Top branch review packet', maxFiles = '12' } = {}) {
  if (skipProbes) {
    const packet = {
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
      canonical_head_comparison: compareCanonicalHeads(null),
      command: `corepack pnpm run report:unmerged-branch-readiness -- --branch <review-ref> --max-files ${maxFiles}`,
      stop_gate: 'Read-only focused review first; no branch mutation or production action.',
    };
    return { ...packet, evidence: topBranchReviewPacketEvidence(packet, evidenceLabel) };
  }

  if (!queueItem?.review_ref) {
    const packet = {
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
      canonical_head_comparison: compareCanonicalHeads(topItem),
      command: 'corepack pnpm run report:unmerged-branch-readiness',
      stop_gate: 'No branch review item available.',
    };
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
  const packet = {
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
  };
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
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];

const targetCustomers = [
  {
    rank: 1,
    account_or_segment: 'Small and mid-size Ontario electricity distributors',
    pain: 'Need defensible demand planning, filing evidence, and privacy-safe pilot packaging.',
    trigger: 'Distribution rate filing, load-growth scenario update, or board planning review.',
    decision_maker: 'Planning Director, Regulatory Affairs Director, or VP Engineering',
    outreach_angle: 'One forecast planning pack with benchmark appendix and no unsupported live-utility claim.',
    proof_to_show: '/utility-demand-forecast, /forecast-benchmarking, /regulatory-filing, and /utility-security.',
    confidence: 4,
  },
  {
    rank: 2,
    account_or_segment: 'Ontario Class A industrial energy managers',
    pain: 'Need bounded 5CP exposure support without curtailment or guaranteed savings claims.',
    trigger: 'Peak season planning or GA budget review.',
    decision_maker: 'Energy Manager, Finance Controller, or Operations Director',
    outreach_angle: 'Source-dated 5CP decision-support pack with explicit no-settlement/no-curtailment boundary.',
    proof_to_show: '/ga-ici-5cp and /forecast-benchmarking.',
    confidence: 4,
  },
  {
    rank: 3,
    account_or_segment: 'Alberta industrial TIER compliance teams',
    pain: 'Need CFO-readable pathway comparison across fund, credits, offsets, and direct investment.',
    trigger: 'Annual compliance planning, budget review, or credit purchase discussion.',
    decision_maker: 'CFO, Sustainability Lead, Compliance Director, or Plant Operations Lead',
    outreach_angle: 'Source-dated compliance memo with no legal, tax, broker, or registry-certification claim.',
    proof_to_show: '/roi-calculator and /credit-banking.',
    confidence: 4,
  },
  {
    rank: 4,
    account_or_segment: 'Rural Electrification Associations and municipal utilities',
    pain: 'Need planning, filing, and asset evidence without large enterprise software procurement.',
    trigger: 'Capex review, reliability plan, or filing-prep cycle.',
    decision_maker: 'Utility GM, Asset Manager, Engineering Manager, or Finance Lead',
    outreach_angle: 'CSV-first asset and filing proof pack for one service territory or fleet subset.',
    proof_to_show: '/asset-health, /regulatory-filing, and /utility-demand-forecast.',
    confidence: 3,
  },
  {
    rank: 5,
    account_or_segment: 'Utility planning consultants',
    pain: 'Need repeatable artifacts for forecast, filing, benchmark, and security-review conversations.',
    trigger: 'New client planning study or rate filing support scope.',
    decision_maker: 'Partner, Principal Consultant, or Forecast Practice Lead',
    outreach_angle: 'White-label style proof-pack workflow that reduces manual appendix creation.',
    proof_to_show: '/solutions, /forecast-benchmarking, /regulatory-filing, and export helpers.',
    confidence: 4,
  },
  {
    rank: 6,
    account_or_segment: 'Utility privacy and security reviewers',
    pain: 'Need assurance that buyer files, secrets, and service-role access are bounded before pilot approval.',
    trigger: 'Security questionnaire, data-sharing review, or procurement intake.',
    decision_maker: 'CISO, Privacy Officer, Procurement Lead, or Integration Reviewer',
    outreach_angle: 'Repo-backed security procurement pack plus BYO-CSV retained-extract workflow.',
    proof_to_show: '/utility-security and /byo-csv-proof.',
    confidence: 3,
  },
  {
    rank: 7,
    account_or_segment: 'Municipal and public-sector energy managers',
    pain: 'Need field-map and invoice-delta evidence before investing in shadow billing or audit work.',
    trigger: 'Budget pressure, price review, or energy-audit cycle.',
    decision_maker: 'Facilities Director, Energy Manager, Finance Lead, or Procurement Lead',
    outreach_angle: 'One uploaded-bill comparison proof with energy-supply-only savings caveats.',
    proof_to_show: '/shadow-billing and /byo-csv-proof.',
    confidence: 3,
  },
  {
    rank: 8,
    account_or_segment: 'Alberta compliance advisors and EPCs',
    pain: 'Need source-dated planning packs to support industrial compliance conversations.',
    trigger: 'Compliance-year planning or client advisory engagement.',
    decision_maker: 'Compliance Advisor, EPC Project Lead, or Carbon Market Lead',
    outreach_angle: 'Faster client-facing TIER and credit-banking memo generation with clear boundaries.',
    proof_to_show: '/roi-calculator, /credit-banking, and source-anchor report.',
    confidence: 3,
  },
  {
    rank: 9,
    account_or_segment: 'Large-load and data-centre planning advisors',
    pain: 'Need planning narrative and load-assumption discipline before engineering-grade interconnection work.',
    trigger: 'Early load proposal, planning screen, or service-territory impact discussion.',
    decision_maker: 'Development Director, Planning Advisor, or Utility Interconnection Lead',
    outreach_angle: 'Keep this as a support overlay behind the forecast pack, not a standalone engineering approval claim.',
    proof_to_show: '/ai-datacentres and /utility-demand-forecast.',
    confidence: 2,
  },
  {
    rank: 10,
    account_or_segment: 'Indigenous/community energy project teams with funder reporting needs',
    pain: 'Need repeatable funder reporting artifacts with governance and owner-supplied review boundaries.',
    trigger: 'Quarterly reporting cycle or project funding milestone.',
    decision_maker: 'Energy Manager, Program Manager, or Economic Development Lead',
    outreach_angle: 'Constructed-proof reporting workflow only until a community-reviewed real portfolio exists.',
    proof_to_show: '/funder-reporting and /aicei-reporting support surfaces.',
    confidence: 2,
  },
];

const pkg = packageMetadata();
const gitStatus = gitStatusSummary();
const buyerProbe = probeBuyerEvidence();
const branchProbe = probeUnmergedBranches();
const branchReviewQueue = branchReviewQueueForProbe(branchProbe);
const canonicalHeadDecisions = buildCanonicalHeadDecisionLedger(branchReviewQueue);
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

const buyerGapEvidence = [
  buyerProbe.reviewEvidence,
  buyerProbe.hardGateDeficits?.evidence,
  `Production pilot evidence registers: ${buyerProbe.productionRegisters ?? 'unknown'}`,
  `Production outreach response logs: ${buyerProbe.outreachLogs ?? 'unknown'}`,
  `Confidence-moving register rows: ${buyerProbe.confidenceRows ?? 'unknown'}`,
  `Actionable outreach rows: ${buyerProbe.actionableRows ?? 'unknown'}`,
  `Batchable intake-packet outreach rows: ${buyerProbe.batchableIntakeRows ?? 'unknown'}`,
  `Phase F 95% gate: ${buyerProbe.phaseFGate}`,
].join('; ');

const branchReviewEvidence = [
  `Unmerged branch probe high/medium/low risk counts: ${branchProbe.highRisk ?? 'unknown'}/${branchProbe.mediumRisk ?? 'unknown'}/${branchProbe.lowRisk ?? 'unknown'}.`,
  branchProbe.familyEvidence,
  branchProbe.freshnessEvidence,
  branchReviewQueue.evidence,
  canonicalHeadDecisions.evidence,
  reviewFirstBranchPackets.evidence,
  topBranchReviewPacket.evidence,
  topBranchReviewPacket.canonical_head_comparison?.evidence,
].join(' ');

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
  scores: {
    security: 3,
    readiness: gitStatus.isDirty ? 3 : 4,
    sellability: 4,
    evidence: 1,
    overall: 2,
  },
  proof_buckets: {
    hosted_live: [],
    local: [
      'Local release readiness is verified separately with corepack pnpm run check:release-readiness; do not infer current deploy approval from this JSON alone.',
      dirtyEvidence,
      sourceProvenanceResolutionQueue.evidence,
      buyerProbe.evidence,
      buyerProbe.reviewEvidence,
      buyerProbe.hardGateDeficits.remediation_queue.evidence,
      branchProbe.evidence,
      branchProbe.familyEvidence,
      branchProbe.freshnessEvidence,
      branchReviewQueue.evidence,
      canonicalHeadDecisions.evidence,
      reviewFirstBranchPackets.evidence,
      topBranchReviewPacket.evidence,
      topBranchReviewPacket.canonical_head_comparison?.evidence,
      supabaseAdvisor.evidence,
      supabaseAdvisor.clearanceDeficits.evidence,
      supabaseAdvisor.clearanceDeficits.remediation_queue.evidence,
      releasePreflight.evidence,
      releasePreflight.remediation_queue.evidence,
      launchActionQueue.evidence,
    ],
    repo_artifact: [
      'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
      'docs/CEIP_CONVERSATION_OUTCOME_REVIEW_2026-06-03.md',
      'docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md',
      'src/lib/commercialPositioning.ts',
      'scripts/report-buyer-evidence-readiness.mjs',
      'scripts/report-production-approval-packet.mjs',
      'scripts/report-unmerged-branch-readiness.mjs',
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
    outreach_logs: buyerProbe.outreachLogs,
    confidence_moving_rows: buyerProbe.confidenceRows,
    actionable_outreach_rows: buyerProbe.actionableRows,
    batchable_intake_packet_rows: buyerProbe.batchableIntakeRows,
    evidence_root: buyerProbe.evidenceRoot,
    phase_f_gate: buyerProbe.phaseFGate,
    workspace_next_step: buyerProbe.workspaceNextStep,
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
    status: branchProbe.status,
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
    review_first_packets: reviewFirstBranchPackets,
    top_review_packet: topBranchReviewPacket,
    evidence: [
      branchProbe.familyEvidence,
      branchProbe.freshnessEvidence,
      branchReviewQueue.evidence,
      canonicalHeadDecisions.evidence,
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
    resolution_queue: sourceProvenanceResolutionQueue,
    evidence: dirtyEvidence,
    deploy_gate: gitStatus.isDirty
      ? 'blocked until dirty tracked/untracked paths are committed, stashed, removed, or otherwise intentionally resolved before deploy approval'
      : 'source worktree clean at manifest generation time; owner approval and release gates still apply before deploy',
  },
  release_preflight: releasePreflight,
  launch_action_queue: launchActionQueue,
  gaps: [
    {
      gap: 'No buyer-proven Phase F evidence register or retained redacted buyer artifacts are available in production evidence roots.',
      severity: 'P0',
      evidence: buyerGapEvidence,
      framework_mapping: ['Commercial Launch Evidence Schema: hard buyer evidence gate'],
      buyer_impact: 'Cannot claim buyer-proven 95% market confidence, accepted proof packs, or commercial-ready status.',
      fix: 'Collect real anonymized buyer rows, prepare retained redacted artifacts, update the pilot register, and run validate:pilot-evidence --require-95.',
      status: 'open',
    },
    {
      gap: 'Current source deploy approval is blocked when the worktree is dirty or owner approval is absent.',
      severity: gitStatus.isDirty ? 'P0' : 'P1',
      evidence: dirtyEvidence,
      framework_mapping: ['Release readiness: source deploy provenance', 'NIST SSDF: release integrity'],
      buyer_impact: 'A buyer-facing production release request cannot proceed until source provenance is clean and explicitly approved.',
      fix: 'Commit, stash, or intentionally resolve dirty tracked paths, run release readiness, then request explicit owner approval before deploy.',
      status: gitStatus.isDirty ? 'open' : 'mitigated',
    },
    {
      gap: 'High-risk, local/origin split, or stale/aging unmerged branches can affect Supabase, payment, deploy, or buyer-facing surfaces.',
      severity: 'P1',
      evidence: branchReviewEvidence,
      framework_mapping: ['NIST SSDF: change review', 'OWASP ASVS: secure deployment verification'],
      buyer_impact: 'Unreviewed branch changes can weaken launch gates, payment boundaries, database security, or claim discipline.',
      fix: 'Run report:unmerged-branch-readiness -- --branch <ref>, choose the canonical local or origin head for split branch families, complete branch-specific checks, treat stale or aging refs as drift-review queues, and merge only through normal release gates.',
      status: ((branchProbe.highRisk ?? 1) > 0 || (branchProbe.staleCount ?? 1) > 0 || (branchProbe.agingCount ?? 1) > 0) ? 'open' : 'mitigated',
    },
    {
      gap: 'Supabase security/performance advisor clearance remains unavailable while connector or dashboard advisor evidence is permission-gated.',
      severity: 'P1',
      evidence: [supabaseAdvisor.evidence, supabaseAdvisor.clearanceDeficits.evidence].join('; '),
      framework_mapping: ['Supabase RLS and service-role review', 'OWASP API security review'],
      buyer_impact: 'Utility security reviewers may ask for current database advisor evidence before sharing sensitive files.',
      fix: 'Reauthorize or repair Supabase advisor access, run security/performance advisor review, and record public-safe findings.',
      status: supabaseAdvisor.status === 'verified' ? 'mitigated' : 'open',
    },
    {
      gap: 'Release toolchain, Git LFS push-path proof, full release-readiness execution, and owner approval are not all current.',
      severity: 'P1',
      evidence: releasePreflight.evidence,
      framework_mapping: ['NIST SSDF: release integrity', 'Supply-chain and deployment provenance review'],
      buyer_impact: 'A buyer-facing remediation or production release request cannot be treated as approval-ready from local pnpm checks or stale push-path evidence.',
      fix: 'Resolve source provenance, run Corepack-pinned release-readiness, verify git-lfs availability before push evidence, and request explicit owner approval before any deploy.',
      status: releasePreflight.status === 'pass' ? 'mitigated' : 'open',
    },
  ],
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
  fix_report: {
    files_changed_by_manifest_command: [],
    safe_fix_boundary: 'This manifest command is read-only unless --output is used to write the JSON file.',
    current_required_checks: [
      'corepack pnpm run report:buyer-evidence-readiness',
      'corepack pnpm run report:production-approval-packet',
      'corepack pnpm run report:unmerged-branch-readiness',
      'corepack pnpm run report:unmerged-branch-readiness -- --focus-risk high',
      'corepack pnpm run check:release-readiness',
      'corepack pnpm run check:production-deploy-request',
      'corepack pnpm run check:post-deploy-live',
      'python3 /Users/sanjayb/.codex/skills/commercial-launch-readiness-orchestrator/scripts/validate_launch_evidence.py <manifest>',
    ],
    unresolved_blockers: [
      'Real buyer evidence and retained redacted artifacts are absent.',
      'Production deploy still requires clean source provenance and explicit owner approval.',
      'High-risk, local/origin split, or stale/aging unmerged branches remain review queues.',
      'Supabase advisor clearance remains blocked until connector or dashboard advisor evidence is authorized, rerun, and recorded.',
      'Release toolchain and push-path proof remain blocked until Corepack release-readiness, Git LFS, clean source provenance, and owner approval are current.',
    ],
  },
  adversarial_reviews: [
    {
      lane: 'buyer evidence',
      finding: 'Repo scaffolding and constructed proof packs are not buyer acceptance evidence.',
      decision: 'Keep launch_decision blocked until the hard pilot evidence gate passes.',
    },
    {
      lane: 'production approval',
      finding: 'A passing local release gate does not authorize deployment while source provenance is dirty or owner approval is missing.',
      decision: 'Keep deploy request blocked until provenance and approval gates clear.',
    },
    {
      lane: 'release toolchain',
      finding: 'Direct pnpm checks, a skipped production approval packet, or a commit with a Git LFS hook warning do not prove the guarded release path is ready.',
      decision: 'Keep release approval blocked until Corepack-pinned release-readiness, Git LFS push-path proof, clean source provenance, and owner approval are current.',
    },
    {
      lane: 'Supabase advisor clearance',
      finding: 'CLI database lint and repo security artifacts do not substitute for connector-backed or dashboard Supabase advisor clearance.',
      decision: 'Keep Supabase advisor clearance blocked until authorization, security advisor evidence, performance advisor evidence, and public-safe findings records pass.',
    },
    {
      lane: 'branch risk',
      finding: 'Unmerged branches are not launch evidence; local/origin split families and stale or aging refs add drift risk and can only become merge candidates after canonical-head selection, focused review, and release gates.',
      decision: 'Keep high-risk, local/origin split, and stale/aging branches in review queue.',
    },
  ],
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
        ],
    delta: 'Generated a schema-shaped launch evidence manifest with conservative blocked decision, explicit buyer-evidence remediation actions, release preflight deficits, release remediation actions, Supabase advisor remediation actions, an ordered launch blocker action queue, canonical-head branch decision deficits, and source-provenance resolution decisions.',
    reflection: 'The manifest improves handoff and portfolio comparability without changing buyer confidence, buyer contact state, deployment approval, branch state, canonical-head ownership, source ownership, release tool installation, Supabase authorization, database state, or live proof.',
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
