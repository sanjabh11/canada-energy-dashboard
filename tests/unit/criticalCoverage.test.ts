import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/check-critical-coverage.mjs');

function lcovRecord(file: string, lh: number, lf: number) {
  return [`SF:${file}`, `LF:${lf}`, `LH:${lh}`, 'end_of_record'].join('\n');
}

/** Fixture covering every gated path at ~90% line coverage. */
function passingLcov() {
  return [
    lcovRecord('src/lib/whop.ts', 170, 188),
    lcovRecord('netlify/functions/leads.ts', 45, 50),
    lcovRecord('src/lib/tierCalculations.ts', 58, 59),
    lcovRecord('src/lib/tierPricing.ts', 40, 43),
    lcovRecord('src/lib/creditBankingSupport.ts', 75, 82),
    lcovRecord('netlify/functions/auth-session.ts', 63, 71),
    lcovRecord('supabase/functions/whop-verify-access/index.ts', 88, 96),
    lcovRecord('supabase/functions/whop-webhook/index.ts', 0, 104),
    lcovRecord('supabase/functions/stripe-create-checkout-session/index.ts', 0, 80),
    '',
  ].join('\n');
}

function runChecker(lcovPath: string, extraArgs: string[] = []) {
  try {
    const stdout = execFileSync(process.execPath, [scriptPath, '--lcov-path', lcovPath, ...extraArgs], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? -1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

describe('check-critical-coverage gate', () => {
  let tempDir: string;
  let lcovPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'ceip-critical-coverage-'));
    lcovPath = path.join(tempDir, 'lcov.info');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('exits 0 when every critical path is above its floor', () => {
    writeFileSync(lcovPath, passingLcov());
    const result = runChecker(lcovPath);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('passed');
    expect(result.stdout).toContain('src/lib/tierCalculations.ts');
  });

  it('exits 1 and names the file when a path falls below its floor', () => {
    // tierCalculations floor is 95 — give it ~8% (5/59).
    const lcov = passingLcov().replace(
      lcovRecord('src/lib/tierCalculations.ts', 58, 59),
      lcovRecord('src/lib/tierCalculations.ts', 5, 59),
    );
    writeFileSync(lcovPath, lcov);
    const result = runChecker(lcovPath);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('FAILED');
    expect(result.stderr).toContain('src/lib/tierCalculations.ts');
  });

  it('exits 1 when a required critical path has no SF record', () => {
    // Drop whop.ts entirely from the report.
    const lcov = passingLcov().replace(`${lcovRecord('src/lib/whop.ts', 170, 188)}\n`, '');
    writeFileSync(lcovPath, lcov);
    const result = runChecker(lcovPath);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('src/lib/whop.ts');
    expect(result.stderr).toContain('missing');
  });

  it('exits 1 with a clear message when the lcov artifact does not exist', () => {
    const result = runChecker(path.join(tempDir, 'does-not-exist.info'));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('coverage artifact missing');
    expect(result.stderr).toContain('full serial coverage suite');
  });

  it('fails closed when a gated critical path is absent from lcov', () => {
    // leads.ts is inside coverage.include — a missing record means the file was
    // deleted or instrumentation regressed, and the gate must NOT silently pass.
    const lcov = passingLcov().replace(`${lcovRecord('netlify/functions/leads.ts', 45, 50)}\n`, '');
    writeFileSync(lcovPath, lcov);
    const result = runChecker(lcovPath);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('netlify/functions/leads.ts');
  });

  it('honours a --floor override applied to every gated path', () => {
    writeFileSync(lcovPath, passingLcov());
    const result = runChecker(lcovPath, ['--floor', '95']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('FAILED');
  });
});
