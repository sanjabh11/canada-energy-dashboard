/**
 * Negative-fixture proofs for repo gate scripts (auditor gap).
 *
 * A gate that cannot fail is not a gate. Each case below feeds a small
 * synthetic fixture to a check script and asserts a NONZERO exit — spawn
 * convention matches tests/unit/clientEnvSafety.test.ts (spawn
 * `process.execPath` against the real script file; the fixture lives in a
 * temp dir, never in the repo working tree).
 *
 * Coverage notes:
 * - scripts/check-claim-boundaries.mjs uses `process.cwd()` as the scan
 *   root, so a spawned run against a fixture directory exercises the real
 *   rule table without touching repo state.
 * - scripts/check-secret-scan.mjs has NO fixture/path argument: repoRoot is
 *   derived from the script's own location and it hard-scans every
 *   git-tracked + untracked file plus full history. There is no way to give
 *   it a synthetic input without writing credential-shaped literals into
 *   the real worktree — so the spawned negative case is SKIPPED on purpose.
 *   The executable proof below pins the skip rationale (no argv parsing).
 * - scripts/verify-positioning-audit.mjs has no fixture flag either, but its
 *   audit root is `process.cwd() + '/.positioning-audit'`, so a fixture dir
 *   with a malformed audit file exercises the real failure path.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const REPO_ROOT = process.cwd();
const tempRoots: string[] = [];

function makeTempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-gate-fixture-'));
  tempRoots.push(root);
  return root;
}

function writeFixture(root: string, relativePath: string, content: string) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

function runScript(scriptRelPath: string, cwd: string, args: string[] = []) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(REPO_ROOT, scriptRelPath), ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('check-claim-boundaries.mjs — negative fixtures', () => {
  it('exits nonzero on a fixture file containing a forbidden claim pattern', async () => {
    const root = makeTempRoot();
    // Single forbidden claim ('world-class', RULES[5]) with NO boundary
    // vocabulary anywhere in the ±10/+5-line context window.
    writeFixture(root, 'src/marketing.md', 'Our platform delivers world-class forecasting coverage.\n');

    const result = await runScript('scripts/check-claim-boundaries.mjs', root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Claim-boundary check failed');
    expect(result.stderr).toContain('World-class or best-of-class overclaim');
    expect(result.stderr).toContain('src/marketing.md');
  });

  it('control: exits zero when the same claim word is inside boundary context', async () => {
    const root = makeTempRoot();
    // Same forbidden token, but bounded by 'does not ... claim' vocabulary —
    // proves the nonzero exit above is context-aware, not a grep that always
    // fails.
    writeFixture(
      root,
      'src/marketing.md',
      'The roadmap does not position this surface as world-class; it is a sandbox.\n',
    );

    const result = await runScript('scripts/check-claim-boundaries.mjs', root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Claim-boundary check passed');
  });
});

describe('check-secret-scan.mjs — skip rationale (no fixture interface)', () => {
  it('has no path/fixture argument and hard-scans the real worktree + history', () => {
    // This is the documented reason there is no spawned negative fixture
    // for this gate: it cannot be aimed at synthetic input without planting
    // credential-shaped literals inside the real repo.
    const source = readFileSync(path.join(REPO_ROOT, 'scripts/check-secret-scan.mjs'), 'utf8');

    expect(source).not.toMatch(/process\.argv/);
    expect(source).not.toMatch(/--(?:root|fixture|path|dir)/);
    // It enumerates real repo state itself:
    expect(source).toContain("ls-files");
    expect(source).toContain('log');
  });
});

describe('verify-positioning-audit.mjs — negative fixtures', () => {
  it('exits nonzero when the audit state file is malformed', async () => {
    const root = makeTempRoot();
    writeFixture(root, '.positioning-audit/state.json', '{"audit_id": ');

    const result = await runScript('scripts/verify-positioning-audit.mjs', root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Positioning audit verification failed');
  });

  it('exits nonzero when the audit directory is absent entirely', async () => {
    const root = makeTempRoot();

    const result = await runScript('scripts/verify-positioning-audit.mjs', root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Positioning audit verification failed');
  });

  it('control: exits zero against the real repo audit state', async () => {
    // Read-only verification of the current worktree — the script only
    // writes when --refresh-inventory is passed, which we do not pass.
    const result = await runScript('scripts/verify-positioning-audit.mjs', REPO_ROOT);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"checks"');
  });
});
