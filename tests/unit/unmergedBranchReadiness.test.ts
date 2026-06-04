import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/report-unmerged-branch-readiness.mjs');
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-unmerged-branches-'));
  tempRoots.push(root);
  return root;
}

function git(root: string, args: string[]) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'CEIP Test',
      GIT_AUTHOR_EMAIL: 'ceip-test@example.test',
      GIT_COMMITTER_NAME: 'CEIP Test',
      GIT_COMMITTER_EMAIL: 'ceip-test@example.test',
    },
  }).trim();
}

function write(root: string, relativePath: string, text: string) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, text, 'utf8');
}

function commitAll(root: string, message: string) {
  git(root, ['add', '.']);
  git(root, ['commit', '-m', message]);
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
  write(root, 'supabase/functions/stripe-webhook/index.ts', 'export const handler = () => null;\n');
  write(root, 'src/lib/exportJobsClient.ts', 'export const exportJob = true;\n');
  commitAll(root, 'export risk branch');

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
    expect(result.stdout).toContain('- Unmerged origin branches: 1');
    expect(result.stdout).toContain('| export-risk | local | high |');
    expect(result.stdout).toContain('supabase/database');
    expect(result.stdout).toContain('payment/entitlement');
    expect(result.stdout).toContain('| docs-only | local | low |');
    expect(result.stdout).toContain('docs-only');
    expect(result.stdout).toContain('| origin/stripe-remote | remote | high |');
    expect(result.stdout).not.toContain('already-merged');
  });

  it('can scope the report to local branches and fail on high-risk review queues', () => {
    const root = createRepo();
    const localOnly = runReport(root, ['--local-only']);
    const failing = runReport(root, ['--fail-on-high-risk']);

    expect(localOnly.status).toBe(0);
    expect(localOnly.stdout).toContain('- Unmerged origin branches: 0');
    expect(localOnly.stdout).not.toContain('origin/stripe-remote');

    expect(failing.status).toBe(1);
    expect(failing.stdout).toContain('- High-risk branches: 2');
  });

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
    expect(result.stdout).toContain('## Focused Review Plan: export-risk');
    expect(result.stdout).toContain('corepack pnpm run check:production-deploy-script');
    expect(result.stdout).toContain('corepack pnpm run report:supabase-app-lint');
    expect(result.stdout).toContain('payment/entitlement');
    expect(result.stdout).toContain('does not create buyer evidence or production approval');
  });

  it('rejects a selected branch that is not in the unmerged review scope', () => {
    const root = createRepo();
    const result = runReport(root, ['--branch', 'missing-review-branch']);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Selected branch/ref is not an unmerged branch in the selected scope: missing-review-branch');
  });
});
