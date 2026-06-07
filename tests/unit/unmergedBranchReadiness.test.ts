import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/report-unmerged-branch-readiness.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-unmerged-branch-readiness-report.mjs');
const tempRoots: string[] = [];
const gitBackedTestTimeoutMs = 120_000;

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-unmerged-branches-'));
  tempRoots.push(root);
  return root;
}

function git(root: string, args: string[], extraEnv: Record<string, string> = {}) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'CEIP Test',
      GIT_AUTHOR_EMAIL: 'ceip-test@example.test',
      GIT_COMMITTER_NAME: 'CEIP Test',
      GIT_COMMITTER_EMAIL: 'ceip-test@example.test',
      ...extraEnv,
    },
  }).trim();
}

function write(root: string, relativePath: string, text: string) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, text, 'utf8');
}

function commitAll(root: string, message: string, extraEnv: Record<string, string> = {}) {
  git(root, ['add', '.']);
  git(root, ['commit', '-m', message], extraEnv);
}

function createRepo() {
  const root = makeTempRoot();
  git(root, ['init']);
  git(root, ['config', 'core.hooksPath', '/dev/null']);
  git(root, ['checkout', '-q', '-b', 'main']);
  git(root, ['config', 'user.name', 'CEIP Test']);
  git(root, ['config', 'user.email', 'ceip-test@example.test']);

  write(root, 'README.md', '# CEIP\n');
  commitAll(root, 'initial main');
  git(root, ['branch', 'already-merged']);

  git(root, ['checkout', '-q', '-b', 'docs-only']);
  write(root, 'docs/launch-note.md', 'Document branch only.\n');
  commitAll(root, 'docs branch');

  git(root, ['checkout', '-q', 'main']);
  git(root, ['checkout', '-q', '-b', 'export-risk']);
  write(root, 'DEPLOY_THIS_EXPORT_FUNCTION.ts', 'export const deployCopy = true;\n');
  write(root, 'stripe-webhook-FINAL.ts', 'export const finalCopy = true;\n');
  write(root, 'supabase/functions/_shared/exportEntitlement.ts', 'export const sharedEntitlement = true;\n');
  write(root, 'supabase/functions/stripe-webhook/index.ts', 'export const handler = () => null;\n');
  write(root, 'src/lib/exportJobsClient.ts', 'export const exportJob = true;\n');
  commitAll(root, 'export risk branch', {
    GIT_AUTHOR_DATE: '2025-01-02T00:00:00Z',
    GIT_COMMITTER_DATE: '2025-01-02T00:00:00Z',
  });
  git(root, ['update-ref', 'refs/remotes/origin/export-risk', 'HEAD']);
  write(root, 'src/lib/exportJobsLocalOnly.ts', 'export const localOnlyExportJob = true;\n');
  commitAll(root, 'local export risk followup', {
    GIT_AUTHOR_DATE: '2025-01-03T00:00:00Z',
    GIT_COMMITTER_DATE: '2025-01-03T00:00:00Z',
  });

  git(root, ['checkout', '-q', 'main']);
  git(root, ['checkout', '-q', '-b', 'remote-payment']);
  write(root, 'src/lib/whop.ts', 'export const entitlement = true;\n');
  commitAll(root, 'remote payment branch');
  git(root, ['update-ref', 'refs/remotes/origin/stripe-remote', 'HEAD']);
  git(root, ['checkout', '-q', 'main']);
  git(root, ['branch', '-D', 'remote-payment']);

  return root;
}

function runReport(root: string, args: string[] = []) {
  try {
    const stdout = execFileSync(process.execPath, [scriptPath, ...args], {
      cwd: root,
      encoding: 'utf8',
      env: process.env,
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const childError = error as { status?: number; stdout?: Buffer; stderr?: Buffer };
    return {
      status: childError.status ?? 1,
      stdout: childError.stdout?.toString('utf8') ?? '',
      stderr: childError.stderr?.toString('utf8') ?? '',
    };
  }
}

function runCheck(root: string, args: string[] = []) {
  try {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--repo-root', root, ...args], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const childError = error as { status?: number; stdout?: Buffer; stderr?: Buffer };
    return {
      status: childError.status ?? 1,
      stdout: childError.stdout?.toString('utf8') ?? '',
      stderr: childError.stderr?.toString('utf8') ?? '',
    };
  }
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('unmerged branch readiness report', () => {
  it('classifies local and remote branches not merged into main', () => {
    const root = createRepo();
    const result = runReport(root);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('CEIP Unmerged Branch Readiness Report');
    expect(result.stdout).toContain('This report is read-only');
    expect(result.stdout).toContain('- Unmerged local branches: 2');
    expect(result.stdout).toContain('- Unmerged origin branches: 2');
    expect(result.stdout).toContain('| export-risk | local | high |');
    expect(result.stdout).toContain('edge-function-copy');
    expect(result.stdout).toContain('production/deploy');
    expect(result.stdout).toContain('supabase/database');
    expect(result.stdout).toContain('payment/entitlement');
    expect(result.stdout).toContain('| docs-only | local | low |');
    expect(result.stdout).toContain('docs-only');
    expect(result.stdout).toContain('| origin/export-risk | remote | high |');
    expect(result.stdout).toContain('| origin/stripe-remote | remote | high |');
    expect(result.stdout).toContain('## Local/Origin Branch Families');
    expect(result.stdout).toContain('| export-risk | local:export-risk@');
    expect(result.stdout).toContain('remote:origin/export-risk@');
    expect(result.stdout).toContain('local ahead of origin by 1 commit(s)');
    expect(result.stdout).toContain('choose the canonical local or origin head before focused review');
    expect(result.stdout).toContain('| stripe-remote | remote:origin/stripe-remote@');
    expect(result.stdout).toContain('origin-only branch');
    expect(result.stdout).toContain('## Branch Freshness Review');
    expect(result.stdout).toContain('| Branch | Scope | Risk | Latest commit date | Age | Freshness | Stale-merge action |');
    expect(result.stdout).toContain('| export-risk | local | high | 2025-01-03T00:00:00Z |');
    expect(result.stdout).toContain('| origin/export-risk | remote | high | 2025-01-02T00:00:00Z |');
    expect(result.stdout).toContain('| stale | treat as stale review queue;');
    expect(result.stdout).toContain('require full release-readiness after any rebase or cherry-pick');
    expect(result.stdout).toContain('## Branch Review Queue');
    expect(result.stdout).toContain('| Rank | Family | Review ref | Priority | Reason | Review command | Stop/approval gate |');
    expect(result.stdout).toContain('## Package Script Handles');
    expect(result.stdout).toContain('| report_unmerged_branch_readiness | `corepack pnpm run report:unmerged-branch-readiness` |');
    expect(result.stdout).toContain('| report_unmerged_branch_readiness_high_risk | `corepack pnpm run report:unmerged-branch-readiness -- --focus-risk high` |');
    expect(result.stdout).toContain('| check_unmerged_branch_readiness_report | `corepack pnpm run check:unmerged-branch-readiness-report` |');
    expect(result.stdout).toContain('| report_branch_review_readiness | `corepack pnpm run report:branch-review-readiness` |');
    expect(result.stdout).toContain('| check_branch_review_report | `corepack pnpm run check:branch-review-report` |');
    expect(result.stdout).toContain('| 1 | export-risk | export-risk | review_first_high_stale |');
    expect(result.stdout).toContain('high-risk launch surface; local ahead of origin by 1 commit(s); stale commit freshness');
    expect(result.stdout).toContain('corepack pnpm run report:unmerged-branch-readiness -- --branch export-risk --max-files 8');
    expect(result.stdout).toContain('no checkout, merge, deploy, migration, push, discard, or production approval without explicit owner approval and release gates');
    expect(result.stdout).not.toContain('already-merged');
  }, gitBackedTestTimeoutMs);

  it('can scope the report to local branches and fail on high-risk review queues', () => {
    const root = createRepo();
    const localOnly = runReport(root, ['--local-only']);
    const failing = runReport(root, ['--fail-on-high-risk']);

    expect(localOnly.status).toBe(0);
    expect(localOnly.stdout).toContain('- Unmerged origin branches: 0');
    expect(localOnly.stdout).not.toContain('origin/stripe-remote');

    expect(failing.status).toBe(1);
    expect(failing.stdout).toContain('- High-risk branches: 3');
  }, gitBackedTestTimeoutMs);

  it('can focus a selected unmerged branch and print a category-specific review plan', () => {
    const root = createRepo();
    const result = runReport(root, ['--branch', 'export-risk', '--max-files', '10']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Focused branch: export-risk');
    expect(result.stdout).toContain('- Unmerged local branches: 1');
    expect(result.stdout).toContain('- Unmerged origin branches: 0');
    expect(result.stdout).toContain('| export-risk | local | high |');
    expect(result.stdout).not.toContain('| docs-only | local |');
    expect(result.stdout).not.toContain('origin/stripe-remote');
    expect(result.stdout).toContain('## Branch Review Queue');
    expect(result.stdout).toContain('| 1 | export-risk | export-risk | review_first_high_stale |');
    expect(result.stdout).toContain('## Focused Review Plan: export-risk');
    expect(result.stdout).toContain('Review command: `corepack pnpm run report:unmerged-branch-readiness -- --branch export-risk --max-files 10`');
    expect(result.stdout).toContain('## Package Script Handles');
    expect(result.stdout).toContain('corepack pnpm run check:unmerged-branch-readiness-report');
    expect(result.stdout).toContain('corepack pnpm run check:production-deploy-script');
    expect(result.stdout).toContain('corepack pnpm run report:supabase-app-lint');
    expect(result.stdout).toContain('No manual dashboard copy/paste');
    expect(result.stdout).toContain('## Changed Supabase Function Review Queue');
    expect(result.stdout).toContain('| _shared | supabase/functions/_shared/exportEntitlement.ts |');
    expect(result.stdout).toContain('manual import-impact review for functions that import changed _shared modules');
    expect(result.stdout).not.toContain('supabase functions serve _shared');
    expect(result.stdout).toContain('| stripe-webhook | supabase/functions/stripe-webhook/index.ts |');
    expect(result.stdout).toContain('git diff --name-status main...export-risk -- supabase/functions/stripe-webhook');
    expect(result.stdout).toContain('supabase functions serve stripe-webhook --env-file <local-non-production-env>');
    expect(result.stdout).toContain('payment/entitlement');
    expect(result.stdout).toContain('does not create buyer evidence or production approval');
  }, gitBackedTestTimeoutMs);

  it('can print focused review packets for every high-risk branch in one read-only run', () => {
    const root = createRepo();
    const result = runReport(root, ['--focus-risk', 'high', '--max-files', '10']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('## Focused Review Queue: high risk branches');
    expect(result.stdout).toContain('## Branch Freshness Review');
    expect(result.stdout).toContain('## Branch Review Queue');
    expect(result.stdout).toContain('review_first_high_stale');
    expect(result.stdout).toContain('### Focused Review Plan: export-risk');
    expect(result.stdout).toContain('### Focused Review Plan: origin/export-risk');
    expect(result.stdout).toContain('### Focused Review Plan: origin/stripe-remote');
    expect(result.stdout).not.toContain('### Focused Review Plan: docs-only');
    expect(result.stdout).toContain('Review command: `corepack pnpm run report:unmerged-branch-readiness -- --branch export-risk --max-files 10`');
    expect(result.stdout).toContain('Review command: `corepack pnpm run report:unmerged-branch-readiness -- --branch origin/export-risk --max-files 10`');
    expect(result.stdout).toContain('Review command: `corepack pnpm run report:unmerged-branch-readiness -- --branch origin/stripe-remote --max-files 10`');
    expect(result.stdout).toContain('Read-only review first; this report does not checkout, merge, deploy, or mutate branch state.');
    expect(result.stdout).toContain('does not create buyer evidence or production approval');
  }, gitBackedTestTimeoutMs);

  it('release-gates the report boundary, focused plan, and high-risk failure semantics', () => {
    const root = createRepo();
    const result = runCheck(root);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Unmerged branch readiness report check passed:');
    expect(result.stdout).toContain('local=2');
    expect(result.stdout).toContain('origin=2');
    expect(result.stdout).toContain('high=3');
    expect(result.stdout).toContain('low=1');
    expect(result.stdout).toContain('read-only boundary, branch-family pairing, branch freshness, branch review queue, focused review packets, and high-risk failure semantics are intact');
  }, gitBackedTestTimeoutMs);

  it('accepts the pnpm option separator for the release-gate check', () => {
    const root = createRepo();
    const result = runCheck(root, ['--', '--max-files', '10']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Unmerged branch readiness report check passed:');
    expect(result.stdout).toContain('local=2');
    expect(result.stdout).toContain('origin=2');
    expect(result.stdout).toContain('high=3');
  }, gitBackedTestTimeoutMs);

  it('rejects a selected branch that is not in the unmerged review scope', () => {
    const root = createRepo();
    const result = runReport(root, ['--branch', 'missing-review-branch']);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Selected branch/ref is not an unmerged branch in the selected scope: missing-review-branch');
  }, gitBackedTestTimeoutMs);

  it('rejects ambiguous or invalid focused review options', () => {
    const root = createRepo();
    const invalidRisk = runReport(root, ['--focus-risk', 'critical']);
    const ambiguous = runReport(root, ['--branch', 'export-risk', '--focus-risk', 'high']);

    expect(invalidRisk.status).toBe(1);
    expect(invalidRisk.stderr).toContain('--focus-risk must be one of: high, medium, low, all.');
    expect(ambiguous.status).toBe(1);
    expect(ambiguous.stderr).toContain('Use --branch or --focus-risk, not both.');
  }, gitBackedTestTimeoutMs);
});
