import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/report-supabase-app-lint.mjs');
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-supabase-app-lint-'));
  tempRoots.push(root);
  return root;
}

function writeJsonFixture(root: string, rows: unknown[]) {
  const filePath = path.join(root, 'lint.json');
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf8');
  return filePath;
}

function runReport(inputPath: string, failOnApp = false) {
  const args = [scriptPath, '--input', inputPath];
  if (failOnApp) args.push('--fail-on-app');

  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
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

describe('Supabase app lint report', () => {
  it('passes fail-on-app mode when only extension-owned findings remain', async () => {
    const root = makeTempRoot();
    const inputPath = writeJsonFixture(root, [
      {
        function: 'public.st_findextent',
        issues: [{ level: 'error', message: 'extension-owned dynamic SQL warning' }],
      },
      {
        function: 'public.populate_geometry_columns',
        issues: [{ level: 'warning', message: 'extension-owned unused variable' }],
      },
    ]);

    const result = await runReport(inputPath, true);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('App-owned rows: 0');
    expect(result.stdout).toContain('Supabase app lint check passed');
  });

  it('fails fail-on-app mode when CEIP-owned findings remain', async () => {
    const root = makeTempRoot();
    const inputPath = writeJsonFixture(root, [
      {
        function: 'public.calculate_resilience_score',
        issues: [{ level: 'warning extra', message: 'unused parameter "assessment_date"' }],
      },
    ]);

    const result = await runReport(inputPath, true);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('App-owned rows: 1');
    expect(result.stdout).toContain('public.calculate_resilience_score');
    expect(result.stderr).toContain('Supabase app lint check failed');
  });
});
