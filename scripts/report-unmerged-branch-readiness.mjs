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
    if (!['base', 'max-files'].includes(key)) {
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
const maxFiles = Number.parseInt(values.get('max-files') ?? '8', 10);
if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 50) {
  failures.push('--max-files must be an integer from 1 to 50.');
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run report:unmerged-branch-readiness

Options:
  --base <ref>           Base branch/ref to compare against. Defaults to main.
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

function classifyFiles(files) {
  const categories = new Set();

  for (const filePath of files) {
    if (isDocsPath(filePath)) categories.add('docs/claims');
    if (/^(?:src\/|public\/)/.test(filePath)) categories.add('source-app');
    if (/^(?:src\/components\/|src\/pages\/|src\/styles\/|src\/index\.css$)/.test(filePath)) categories.add('ui-surface');
    if (/^(?:tests\/|playwright\.config\.|vitest\.config\.|scripts\/check-|scripts\/report-)/.test(filePath)) categories.add('tests/tooling');
    if (/^(?:scripts\/deploy-production\.sh|netlify\.toml|package\.json|pnpm-lock\.yaml|\.github\/workflows\/|scripts\/report-production-approval-packet|scripts\/check-production-deploy-script)/.test(filePath)) {
      categories.add('production/deploy');
    }
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
  if (categories.some((category) => ['payment/entitlement', 'production/deploy', 'supabase/database'].includes(category))) {
    return 'high';
  }
  if (categories.some((category) => ['source-app', 'buyer-proof/commercial', 'ml/training'].includes(category))) {
    return 'medium';
  }
  return 'low';
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

function markdownList(items) {
  return items.length > 0 ? items.join(', ') : 'none';
}

function compactFiles(files) {
  const visible = files.slice(0, maxFiles);
  const suffix = files.length > visible.length ? `, ... +${files.length - visible.length} more` : '';
  return `${visible.join(', ')}${suffix}` || 'none';
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

const branches = [];
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
  const riskRank = { high: 0, medium: 1, low: 2 };
  const riskDelta = riskRank[a.risk] - riskRank[b.risk];
  if (riskDelta !== 0) return riskDelta;
  return a.name.localeCompare(b.name);
});

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

console.log('');
console.log('## Next Review Order');
console.log('');
for (const branch of branches.slice(0, 8)) {
  console.log(`- ${branch.risk.toUpperCase()}: ${branch.name} -> ${branch.action}`);
}
if (branches.length === 0) console.log('- None.');

if (failOnHighRisk && counts.high > 0) process.exit(1);
