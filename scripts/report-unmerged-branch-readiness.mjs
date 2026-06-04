#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const repoRoot = process.cwd();
const values = new Map();
const failures = [];
let localOnly = false;
let failOnHighRisk = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--local-only') {
    localOnly = true;
    continue;
  }
  if (arg === '--fail-on-high-risk') {
    failOnHighRisk = true;
    continue;
  }
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[index + 1] ?? '';
    index += 1;
    if (!['base', 'branch', 'focus-risk', 'max-files'].includes(key)) {
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

const baseRef = values.get('base') ?? 'main';
const selectedBranchName = values.get('branch') ?? '';
const focusRisk = values.get('focus-risk') ?? '';
const maxFiles = Number.parseInt(values.get('max-files') ?? '8', 10);
const freshnessNowMs = Date.now();
if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 50) {
  failures.push('--max-files must be an integer from 1 to 50.');
}
if (focusRisk && !['high', 'medium', 'low', 'all'].includes(focusRisk)) {
  failures.push('--focus-risk must be one of: high, medium, low, all.');
}
if (selectedBranchName && focusRisk) {
  failures.push('Use --branch or --focus-risk, not both.');
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run report:unmerged-branch-readiness

Options:
  --base <ref>           Base branch/ref to compare against. Defaults to main.
  --branch <ref>         Focus output on one unmerged branch/ref and print review checks.
  --focus-risk <risk>    Print focused review packets for branches with risk high, medium, low, or all.
  --max-files <count>    Max changed paths shown per branch. Defaults to 8.
  --local-only           Inspect local branches only.
  --fail-on-high-risk    Exit nonzero when any unmerged branch touches high-risk surfaces.
`);
}

function runGit(commandArgs) {
  const result = spawnSync('git', commandArgs, {
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

function gitText(commandArgs) {
  const result = runGit(commandArgs);
  if (result.status !== 0) {
    const output = `${result.stderr}\n${result.stdout}\n${result.error}`.trim();
    throw new Error(output || `git ${commandArgs.join(' ')} failed`);
  }
  return result.stdout.trim();
}

function gitStatus(commandArgs) {
  return runGit(commandArgs).status;
}

function splitLines(value) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function shellSafeRef(refName) {
  return /^[A-Za-z0-9_./@:-]+$/.test(refName);
}

function listRefs(namespace) {
  const output = gitText([
    'for-each-ref',
    '--format=%(refname:short)\t%(objectname:short)\t%(committerdate:iso8601-strict)\t%(subject)',
    namespace,
  ]);
  return splitLines(output).map((line) => {
    const [name, sha, date, ...subjectParts] = line.split('\t');
    return {
      name,
      sha,
      date,
      subject: subjectParts.join('\t'),
      scope: name.startsWith('origin/') ? 'remote' : 'local',
    };
  });
}

function countRevisions(range) {
  const output = gitText(['rev-list', '--count', range]);
  return Number.parseInt(output || '0', 10) || 0;
}

function changedFiles(refName) {
  return splitLines(gitText(['diff', '--name-only', `${baseRef}...${refName}`]));
}

function shortStat(refName) {
  const output = gitText(['diff', '--shortstat', `${baseRef}...${refName}`]);
  return output || 'no file changes reported';
}

function isDocsPath(filePath) {
  return /^(?:docs\/|README\.md$|.*\.md$|.*\.txt$)/i.test(filePath);
}

function isDetachedFunctionCopy(filePath) {
  return /^(?:DEPLOY_.*|.*-FINAL)\.(?:ts|js)$/i.test(filePath);
}

function classifyFiles(files) {
  const categories = new Set();

  for (const filePath of files) {
    if (isDocsPath(filePath)) categories.add('docs/claims');
    if (/^(?:src\/|public\/)/.test(filePath)) categories.add('source-app');
    if (/^(?:src\/components\/|src\/pages\/|src\/styles\/|src\/index\.css$)/.test(filePath)) categories.add('ui-surface');
    if (/^(?:tests\/|playwright\.config\.|vitest\.config\.|scripts\/check-|scripts\/report-)/.test(filePath)) categories.add('tests/tooling');
    if (/^(?:scripts\/deploy-production\.sh|netlify\.toml|package\.json|pnpm-lock\.yaml|\.github\/workflows\/|scripts\/report-production-approval-packet|scripts\/check-production-deploy-script)/.test(filePath) || /deploy|go[-_]?live/i.test(filePath)) {
      categories.add('production/deploy');
    }
    if (isDetachedFunctionCopy(filePath)) categories.add('edge-function-copy');
    if (/^(?:supabase\/|src\/lib\/supabase|scripts\/sql\/)/.test(filePath) || /migration|rls|database/i.test(filePath)) {
      categories.add('supabase/database');
    }
    if (/stripe|paddle|whop|entitlement|checkout|webhook|billing|monetization|api-keys?/i.test(filePath)) {
      categories.add('payment/entitlement');
    }
    if (/pilot|evidence|outreach|proof-pack|proofPack|commercial|readiness/i.test(filePath)) {
      categories.add('buyer-proof/commercial');
    }
    if (/^(?:training\/|models?\/)/.test(filePath) || /conformance|forecast|gnn|pinn|ml/i.test(filePath)) {
      categories.add('ml/training');
    }
  }

  if (files.length > 0 && files.every(isDocsPath)) categories.add('docs-only');
  if (categories.size === 0) categories.add('unclassified');
  return [...categories].sort();
}

function riskForCategories(categories) {
  if (categories.some((category) => ['edge-function-copy', 'payment/entitlement', 'production/deploy', 'supabase/database'].includes(category))) {
    return 'high';
  }
  if (categories.some((category) => ['source-app', 'buyer-proof/commercial', 'ml/training'].includes(category))) {
    return 'medium';
  }
  return 'low';
}

function riskRank(risk) {
  return { high: 0, medium: 1, low: 2 }[risk] ?? 3;
}

function freshnessRank(freshness) {
  return { unknown: 0, stale: 1, aging: 2, fresh: 3 }[freshness] ?? 4;
}

function ageDays(dateValue) {
  const parsed = Date.parse(dateValue);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor((freshnessNowMs - parsed) / (24 * 60 * 60 * 1000)));
}

function freshnessForBranch(branch) {
  const days = ageDays(branch.date);
  if (days === null) {
    return {
      ageLabel: 'unknown',
      status: 'unknown',
      action: 'refresh Git metadata before review; do not merge a branch whose commit freshness cannot be established',
    };
  }

  if (days > 90) {
    return {
      ageLabel: `${days}d`,
      status: 'stale',
      action: 'treat as stale review queue; rerun focused report, inspect drift against current main, and require full release-readiness after any rebase or cherry-pick',
    };
  }

  if (days > 30) {
    return {
      ageLabel: `${days}d`,
      status: 'aging',
      action: 'refresh focused review before merge discussion; rerun changed-path checks against current main',
    };
  }

  return {
    ageLabel: `${days}d`,
    status: 'fresh',
    action: 'still requires focused branch checks and normal release gates before merge',
  };
}

function actionForBranch({ risk, categories }) {
  if (risk === 'high') {
    return 'manual review before merge; require focused security/release gates and explicit owner approval for deploy-sensitive changes';
  }
  if (categories.includes('buyer-proof/commercial')) {
    return 'review claim boundaries and buyer-evidence gates before copying into launch surfaces';
  }
  if (categories.includes('docs-only')) {
    return 'reconcile against current source of truth before reusing claims';
  }
  return 'review for relevance, then merge only through normal tests and release-readiness gates';
}

function commandText(value) {
  return /^(?:corepack |deno |git |node |pnpm |supabase )/.test(value) ? `\`${value}\`` : value;
}

function tableText(items) {
  return items.map(commandText).join('; ');
}

const categoryReviewPlans = {
  'edge-function-copy': {
    reviewFocus: 'Detached function copies can drift from configured Supabase entrypoints or invite manual dashboard copy/paste deploys.',
    checks: [
      'compare detached copy files against the configured supabase/functions/<name>/index.ts entrypoint',
      'review git diff --name-status output for detached DEPLOY_ or -FINAL files',
      'corepack pnpm run check:production-deploy-script',
    ],
    gate: 'No manual dashboard copy/paste deploys from detached function copies; only deploy configured Supabase function entrypoints after explicit owner approval.',
  },
  'production/deploy': {
    reviewFocus: 'Deploy scripts, CI, metadata, and release gates can change production behavior.',
    checks: [
      'corepack pnpm run check:production-deploy-script',
      'corepack pnpm run report:production-approval-packet -- --skip-release-readiness',
      'corepack pnpm run check:release-readiness',
    ],
    gate: 'No production deploy, Netlify change, or approval request until source provenance is clean and owner approval is explicit.',
  },
  'supabase/database': {
    reviewFocus: 'Database functions, migrations, RLS, and privileged keys can change data access or live ingestion.',
    checks: [
      'corepack pnpm run report:supabase-app-lint',
      'corepack pnpm run check:supabase-app-lint',
      'manual RLS, Edge Function, and migration review against changed files',
    ],
    gate: 'No production migration, function deploy, secret use, or live data mutation without explicit owner approval.',
  },
  'payment/entitlement': {
    reviewFocus: 'Billing, checkout, webhook, and entitlement paths can change customer access or money movement.',
    checks: [
      'targeted unit tests for entitlement, webhook, and API-key paths',
      'manual replay review using fixtures or test-mode payloads only',
      'corepack pnpm run check:release-readiness',
    ],
    gate: 'No live payment, entitlement, checkout, or webhook change without explicit owner approval and test-mode evidence.',
  },
  'source-app': {
    reviewFocus: 'Application behavior and route code need focused regression proof before merge.',
    checks: [
      'corepack pnpm run test:strategy-audit-slice',
      'corepack pnpm run test:wedge-prototype-routes',
      'corepack pnpm run build:prod',
    ],
    gate: 'Do not treat app changes as buyer proof; they remain local/source proof until buyer evidence is retained.',
  },
  'ui-surface': {
    reviewFocus: 'Buyer-visible UI changes need browser smoke coverage for affected routes and proof packs.',
    checks: [
      'corepack pnpm run test:wedge-prototype-routes',
      'corepack pnpm run test:browser:phase6',
      'Browser smoke for affected local routes after a built preview',
    ],
    gate: 'No hosted UI claim until post-deploy live smoke passes after an explicitly approved deploy.',
  },
  'tests/tooling': {
    reviewFocus: 'Tooling changes can weaken gates or alter release evidence.',
    checks: [
      'node --check scripts/<changed>.mjs',
      'corepack pnpm run test:strategy-audit-slice',
      'corepack pnpm run check:release-readiness',
    ],
    gate: 'Reject changes that lower launch gates without an explicit source-of-truth update and review.',
  },
  'buyer-proof/commercial': {
    reviewFocus: 'Commercial copy, evidence helpers, and proof-pack changes must preserve buyer-confidence boundaries.',
    checks: [
      'corepack pnpm run report:buyer-evidence-readiness',
      'corepack pnpm run check:pilot-evidence-95-fixture-gate',
      'corepack pnpm run check:claim-boundaries',
    ],
    gate: 'Do not raise 95% market-confidence claims without accepted buyer registers and retained redacted artifact hashes.',
  },
  'docs/claims': {
    reviewFocus: 'Docs can accidentally turn roadmap, candidate, or local proof into launch claims.',
    checks: [
      'corepack pnpm run check:claim-boundaries',
      'corepack pnpm run check:commercial-source',
      'corepack pnpm run check:strategy-source-anchors',
    ],
    gate: 'Do not copy claims into launch surfaces unless they match the current source of truth.',
  },
  'docs-only': {
    reviewFocus: 'Docs-only branches still need source-of-truth reconciliation before reuse.',
    checks: [
      'corepack pnpm run check:commercial-source',
      'corepack pnpm run check:strategy-source-anchors',
      'manual comparison against docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
    ],
    gate: 'Docs-only changes are artifact proof only; they are not launch evidence.',
  },
  'ml/training': {
    reviewFocus: 'Forecast, model, and training changes need retained metrics before prediction credibility changes.',
    checks: [
      'corepack pnpm run test:strategy-audit-slice',
      'targeted forecast benchmark or retained-extract command for changed surfaces',
      'manual review of baseline, interval, and validation claims',
    ],
    gate: 'No production model, forecast-accuracy, or buyer-specific prediction claim without retained metrics.',
  },
  unclassified: {
    reviewFocus: 'Unclassified files need manual ownership and blast-radius review.',
    checks: [
      'review git diff --name-status output for the selected branch',
      'targeted tests chosen from the changed paths',
      'corepack pnpm run check:release-readiness',
    ],
    gate: 'Escalate if ownership, runtime impact, or launch proof boundary is unclear.',
  },
};

function focusedReviewPlans(branch) {
  const plans = [
    {
      category: 'branch diff',
      reviewFocus: 'Confirm exact scope and touched surfaces before any merge decision.',
      checks: [`git diff --name-status ${baseRef}...${branch.name}`, `git diff --stat ${baseRef}...${branch.name}`],
      gate: 'Read-only review first; this report does not checkout, merge, deploy, or mutate branch state.',
    },
    {
      category: 'merge/release gate',
      reviewFocus: 'Prove current main plus any selected changes would preserve commercial readiness gates.',
      checks: ['corepack pnpm run check:production-deploy-script', 'corepack pnpm run check:release-readiness'],
      gate: 'Production deploy remains blocked until the worktree is clean, release readiness passes, and owner approval is explicit.',
    },
  ];

  const seenCategories = new Set();
  for (const category of branch.categories) {
    const plan = categoryReviewPlans[category] ?? categoryReviewPlans.unclassified;
    if (seenCategories.has(category)) continue;
    seenCategories.add(category);
    plans.push({
      category,
      reviewFocus: plan.reviewFocus,
      checks: plan.checks,
      gate: plan.gate,
    });
  }

  return plans;
}

function changedSupabaseFunctionNames(files) {
  const names = new Set();
  for (const filePath of files) {
    const match = filePath.match(/^supabase\/functions\/([^/]+)\//);
    if (match?.[1]) names.add(match[1]);
  }
  return [...names].sort();
}

function changedPathsForFunction(files, functionName) {
  return files.filter((filePath) => filePath.startsWith(`supabase/functions/${functionName}/`));
}

function focusedFunctionReviewRows(branch) {
  return changedSupabaseFunctionNames(branch.files).map((functionName) => ({
    functionName,
    changedPaths: changedPathsForFunction(branch.files, functionName),
    ...(functionName === '_shared'
      ? {
          reviewFocus: 'Review shared Edge Function modules for secret handling, auth helpers, entitlement boundaries, database writes, and every importing function before merge.',
          checks: [
            `git diff --name-status ${baseRef}...${branch.name} -- supabase/functions/_shared`,
            `git diff ${baseRef}...${branch.name} -- supabase/functions/_shared`,
            'manual import-impact review for functions that import changed _shared modules',
          ],
          gate: 'No production function deploy, shared helper rollout, service-role use change, or live data write until every affected function is reviewed and owner approval is explicit.',
        }
      : {
          reviewFocus: 'Verify configured entrypoint, JWT/auth posture, secret handling, upstream idempotency, database writes, and log/metric observability before merge.',
          checks: [
            `git diff --name-status ${baseRef}...${branch.name} -- supabase/functions/${functionName}`,
            `git diff ${baseRef}...${branch.name} -- supabase/functions/${functionName}/index.ts`,
            `supabase functions serve ${functionName} --env-file <local-non-production-env>`,
          ],
          gate: 'No production function deploy, cron rewire, service-role use change, or live data write until local review passes and owner approval is explicit.',
        }),
  }));
}

function markdownList(items) {
  return items.length > 0 ? items.join(', ') : 'none';
}

function compactFiles(files) {
  const visible = files.slice(0, maxFiles);
  const suffix = files.length > visible.length ? `, ... +${files.length - visible.length} more` : '';
  return `${visible.join(', ')}${suffix}` || 'none';
}

function focusedReviewCommand(branch) {
  return `corepack pnpm run report:unmerged-branch-readiness -- --branch ${branch.name} --max-files ${maxFiles}`;
}

function printFocusedReviewPlan(branch, heading = '##') {
  console.log('');
  console.log(`${heading} Focused Review Plan: ${branch.name}`);
  console.log('');
  console.log(`- Risk: ${branch.risk}`);
  console.log(`- Categories: ${markdownList(branch.categories)}`);
  console.log(`- Review command: \`${focusedReviewCommand(branch)}\``);
  console.log(`- Merge stance: ${branch.action}`);
  console.log('- Confidence boundary: this plan can make the branch reviewable, but it does not create buyer evidence or production approval.');
  console.log('');
  console.log('| Area | Review focus | Suggested checks | Stop/approval gate |');
  console.log('|---|---|---|---|');
  for (const plan of focusedReviewPlans(branch)) {
    console.log(`| ${plan.category} | ${plan.reviewFocus} | ${tableText(plan.checks)} | ${plan.gate} |`);
  }

  const functionRows = focusedFunctionReviewRows(branch);
  if (functionRows.length > 0) {
    console.log('');
    console.log(`${heading} Changed Supabase Function Review Queue`);
    console.log('');
    console.log('| Function | Changed paths | Review focus | Suggested checks | Stop/approval gate |');
    console.log('|---|---|---|---|---|');
    for (const row of functionRows) {
      console.log(`| ${row.functionName} | ${compactFiles(row.changedPaths)} | ${row.reviewFocus} | ${tableText(row.checks)} | ${row.gate} |`);
    }
  }
}

function branchesForFocusedRisk(branchList) {
  if (!focusRisk) return [];
  if (focusRisk === 'all') return branchList;
  return branchList.filter((branch) => branch.risk === focusRisk);
}

function canonicalBranchName(refName) {
  return refName.startsWith('origin/') ? refName.slice('origin/'.length) : refName;
}

function branchFamilyRefs(branchesInFamily) {
  return branchesInFamily.map((branch) => `${branch.scope}:${branch.name}@${branch.sha}`).join(', ');
}

function familyState(branchesInFamily) {
  const local = branchesInFamily.find((branch) => branch.scope === 'local') ?? null;
  const remote = branchesInFamily.find((branch) => branch.scope === 'remote') ?? null;

  if (local && remote) {
    if (local.sha === remote.sha) return 'local and origin heads match';
    const localOnly = countRevisions(`${remote.name}..${local.name}`);
    const remoteOnly = countRevisions(`${local.name}..${remote.name}`);
    if (localOnly > 0 && remoteOnly > 0) return `diverged (${localOnly} local-only/${remoteOnly} origin-only commits)`;
    if (localOnly > 0) return `local ahead of origin by ${localOnly} commit(s)`;
    if (remoteOnly > 0) return `origin ahead of local by ${remoteOnly} commit(s)`;
    return 'local and origin differ; inspect refs before review';
  }

  if (local) return 'local-only branch';
  return 'origin-only branch';
}

function familyAction(branchesInFamily, state) {
  const local = branchesInFamily.find((branch) => branch.scope === 'local') ?? null;
  const remote = branchesInFamily.find((branch) => branch.scope === 'remote') ?? null;

  if (local && remote) {
    if (state === 'local and origin heads match') {
      return `review once with ${commandText(focusedReviewCommand(local))} or ${commandText(focusedReviewCommand(remote))}; do not count the pair as two independent launch signals`;
    }
    return `choose the canonical local or origin head before focused review; inspect \`git log --left-right --cherry-pick --oneline ${local.name}...${remote.name}\` without merging or pushing`;
  }

  if (local) return `review local-only ref with ${commandText(focusedReviewCommand(local))} before deciding whether to push, merge, or discard`;
  return `review origin-only ref with ${commandText(focusedReviewCommand(remote))} without creating a local checkout unless review needs it`;
}

function branchFamilyRows(branchList) {
  const families = new Map();
  for (const branch of branchList) {
    const canonicalName = canonicalBranchName(branch.name);
    const family = families.get(canonicalName) ?? [];
    family.push(branch);
    families.set(canonicalName, family);
  }

  return [...families.entries()]
    .map(([canonicalName, branchesInFamily]) => {
      branchesInFamily.sort((a, b) => {
        if (a.scope !== b.scope) return a.scope === 'local' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      const highestRisk = branchesInFamily.map((branch) => branch.risk).sort((a, b) => riskRank(a) - riskRank(b))[0] ?? 'low';
      const state = familyState(branchesInFamily);
      return {
        canonicalName,
        refs: branchFamilyRefs(branchesInFamily),
        highestRisk,
        state,
        action: familyAction(branchesInFamily, state),
      };
    })
    .sort((a, b) => {
      const riskDelta = riskRank(a.highestRisk) - riskRank(b.highestRisk);
      if (riskDelta !== 0) return riskDelta;
      return a.canonicalName.localeCompare(b.canonicalName);
    });
}

function freshnessRows(branchList) {
  return branchList
    .map((branch) => ({
      branch,
      freshness: freshnessForBranch(branch),
    }))
    .sort((a, b) => {
      const freshnessDelta = freshnessRank(a.freshness.status) - freshnessRank(b.freshness.status);
      if (freshnessDelta !== 0) return freshnessDelta;
      const riskDelta = riskRank(a.branch.risk) - riskRank(b.branch.risk);
      if (riskDelta !== 0) return riskDelta;
      return a.branch.name.localeCompare(b.branch.name);
    });
}

if (selectedBranchName && !shellSafeRef(selectedBranchName)) {
  failures.push('--branch must be a safe Git ref containing only letters, numbers, "_", ".", "/", "@", ":", or "-".');
}

if (failures.length > 0) {
  console.error('Unmerged branch readiness report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

try {
  gitText(['rev-parse', '--verify', baseRef]);
} catch (error) {
  console.error('Unmerged branch readiness report failed:\n');
  console.error(`- Base ref not found: ${baseRef}`);
  console.error(`- ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const rawRefs = [
  ...listRefs('refs/heads'),
  ...(localOnly ? [] : listRefs('refs/remotes/origin')),
].filter((ref) => {
  if (!ref.name || ref.name === baseRef || ref.name === `origin/${baseRef}` || ref.name === 'origin/HEAD') return false;
  return shellSafeRef(ref.name);
});

const seen = new Set();
const refs = rawRefs.filter((ref) => {
  const key = `${ref.scope}:${ref.name}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

let branches = [];
for (const ref of refs) {
  if (gitStatus(['merge-base', '--is-ancestor', ref.name, baseRef]) === 0) continue;
  const files = changedFiles(ref.name);
  const categories = classifyFiles(files);
  const risk = riskForCategories(categories);
  branches.push({
    ...ref,
    ahead: countRevisions(`${baseRef}..${ref.name}`),
    behind: countRevisions(`${ref.name}..${baseRef}`),
    files,
    stats: shortStat(ref.name),
    categories,
    risk,
    action: actionForBranch({ risk, categories }),
  });
}

branches.sort((a, b) => {
  const riskDelta = riskRank(a.risk) - riskRank(b.risk);
  if (riskDelta !== 0) return riskDelta;
  return a.name.localeCompare(b.name);
});

const allBranches = [...branches];
let selectedBranch = null;
if (selectedBranchName) {
  selectedBranch = branches.find((branch) => branch.name === selectedBranchName) ?? null;
  if (!selectedBranch) {
    console.error('Unmerged branch readiness report failed:\n');
    console.error(`- Selected branch/ref is not an unmerged branch in the selected scope: ${selectedBranchName}`);
    console.error('- Use the default report to list available unmerged local and origin refs, or remove --local-only if selecting an origin/* ref.');
    process.exit(1);
  }
  branches = [selectedBranch];
}

const counts = {
  local: branches.filter((branch) => branch.scope === 'local').length,
  remote: branches.filter((branch) => branch.scope === 'remote').length,
  high: branches.filter((branch) => branch.risk === 'high').length,
  medium: branches.filter((branch) => branch.risk === 'medium').length,
  low: branches.filter((branch) => branch.risk === 'low').length,
};

console.log('# CEIP Unmerged Branch Readiness Report');
console.log(`Generated: ${new Date().toISOString()}`);
console.log(`Base ref: ${baseRef}`);
console.log(`Scope: ${localOnly ? 'local branches only' : 'local branches plus origin remote branches'}`);
if (selectedBranchName) console.log(`Focused branch: ${selectedBranchName}`);
console.log('');
console.log('## Decision Boundary');
console.log('');
console.log('- This report is read-only: it does not merge, checkout, deploy, run migrations, contact buyers, or mutate branch state.');
console.log('- High-risk unmerged branches are review queues, not launch evidence and not production approval.');
console.log('- Buyer-proven market confidence still requires the filled buyer register and retained redacted artifacts to pass the Phase F gate.');
console.log('');
console.log('## Summary');
console.log('');
console.log(`- Unmerged local branches: ${counts.local}`);
console.log(`- Unmerged origin branches: ${counts.remote}`);
console.log(`- High-risk branches: ${counts.high}`);
console.log(`- Medium-risk branches: ${counts.medium}`);
console.log(`- Low-risk branches: ${counts.low}`);

if (branches.length === 0) {
  console.log('');
  console.log('No unmerged branches were found for the selected scope.');
} else {
  console.log('');
  console.log('## Branch Inventory');
  console.log('');
  console.log('| Branch | Scope | Risk | Ahead/Behind | Categories | Diff summary | Changed paths | Latest commit | Action |');
  console.log('|---|---|---|---:|---|---|---|---|---|');
  for (const branch of branches) {
    console.log(
      `| ${branch.name} | ${branch.scope} | ${branch.risk} | ${branch.ahead}/${branch.behind} | ${markdownList(branch.categories)} | ${branch.stats} | ${compactFiles(branch.files)} | ${branch.sha} ${branch.subject} | ${branch.action} |`,
    );
  }
}

const familySourceBranches = selectedBranch ? allBranches.filter((branch) => canonicalBranchName(branch.name) === canonicalBranchName(selectedBranch.name)) : branches;
const familyRows = branchFamilyRows(familySourceBranches);
const branchFreshnessRows = freshnessRows(branches);

console.log('');
console.log('## Next Review Order');
console.log('');
for (const branch of branches.slice(0, 8)) {
  console.log(`- ${branch.risk.toUpperCase()}: ${branch.name} -> ${branch.action}`);
}
if (branches.length === 0) console.log('- None.');

console.log('');
console.log('## Local/Origin Branch Families');
console.log('');
if (familyRows.length === 0) {
  console.log('- None.');
} else {
  console.log('| Family | Refs | Highest risk | Local/origin state | Review action |');
  console.log('|---|---|---|---|---|');
  for (const family of familyRows) {
    console.log(`| ${family.canonicalName} | ${family.refs} | ${family.highestRisk} | ${family.state} | ${family.action} |`);
  }
}

console.log('');
console.log('## Branch Freshness Review');
console.log('');
if (branchFreshnessRows.length === 0) {
  console.log('- None.');
} else {
  console.log('| Branch | Scope | Risk | Latest commit date | Age | Freshness | Stale-merge action |');
  console.log('|---|---|---|---|---:|---|---|');
  for (const row of branchFreshnessRows) {
    console.log(
      `| ${row.branch.name} | ${row.branch.scope} | ${row.branch.risk} | ${row.branch.date || 'unknown'} | ${row.freshness.ageLabel} | ${row.freshness.status} | ${row.freshness.action} |`,
    );
  }
}

if (selectedBranch) {
  printFocusedReviewPlan(selectedBranch);
} else if (focusRisk) {
  console.log('');
  console.log(`## Focused Review Queue: ${focusRisk === 'all' ? 'all branches' : `${focusRisk} risk branches`}`);
  const focusedBranches = branchesForFocusedRisk(branches);
  if (focusedBranches.length === 0) {
    console.log('');
    const riskLabel = focusRisk === 'all' ? 'unmerged branches' : `${focusRisk} risk unmerged branches`;
    console.log(`- No ${riskLabel} were found for the selected scope.`);
  } else {
    for (const branch of focusedBranches) printFocusedReviewPlan(branch, '###');
  }
}

if (failOnHighRisk && counts.high > 0) process.exit(1);
