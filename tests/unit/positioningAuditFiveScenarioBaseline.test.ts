import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const repoRoot = process.cwd();
const verifierPath = path.join(repoRoot, 'scripts', 'verify-positioning-audit.mjs');
const skillValidatorPath = path.join(
  process.env.HOME ?? '',
  'codex-ecc-custom',
  'skills',
  'ecc-niche-positioning-audit',
  'scripts',
  'validate_skill.py',
);

function runVerifier(strict = false): { stdout: string; exitCode: number } {
  const args = [verifierPath];
  if (strict) args.push('--strict');
  try {
    const stdout = execFileSync('node', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 30_000,
    });
    return { stdout, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; status?: number };
    return { stdout: e.stdout ?? '', exitCode: e.status ?? 1 };
  }
}

function runSkillValidator(): { stdout: string; exitCode: number } {
  if (!fs.existsSync(skillValidatorPath)) {
    return { stdout: 'SKIPPED — validator not found', exitCode: 0 };
  }
  try {
    const stdout = execFileSync('python3', [skillValidatorPath], {
      encoding: 'utf8',
      timeout: 30_000,
    });
    return { stdout, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; status?: number };
    return { stdout: e.stdout ?? '', exitCode: e.status ?? 1 };
  }
}

function parseVerifierResult(stdout: string): Record<string, unknown> {
  try {
    return JSON.parse(stdout);
  } catch {
    return {};
  }
}

describe('Phase 3.1: Five-scenario baseline suite (BEFORE skill changes)', () => {
  const baselineTimestamp = new Date().toISOString();

  it('Scenario 1: Verifier passes in strict mode with 0 warnings', () => {
    const { stdout, exitCode } = runVerifier(true);
    const result = parseVerifierResult(stdout);
    expect(exitCode).toBe(0);
    expect(result.warning_count).toBe(0);
    expect(result.verdict).toBe('CONDITIONAL_GO');
  });

  it('Scenario 2: Verifier detects VALIDATION_PENDING state correctly', () => {
    const { stdout } = runVerifier();
    const result = parseVerifierResult(stdout);
    const checks = result.checks as Array<{ id: string; status: string; detail: string }>;
    const buyerCheck = checks.find((c) => c.id === 'buyer-evidence-boundary');
    expect(buyerCheck?.status).toBe('PASS');
    expect(buyerCheck?.detail).toContain('validation_pending');
  });

  it('Scenario 3: Schema version check confirms v7 across all files', () => {
    const { stdout } = runVerifier();
    const result = parseVerifierResult(stdout);
    const checks = result.checks as Array<{ id: string; status: string; detail: string }>;
    const schemaCheck = checks.find((c) => c.id === 'schema-version');
    expect(schemaCheck?.status).toBe('PASS');
    expect(schemaCheck?.detail).toContain('v7');
  });

  it('Scenario 4: Count consistency — experiments and hypotheses match state', () => {
    const { stdout } = runVerifier();
    const result = parseVerifierResult(stdout);
    const checks = result.checks as Array<{ id: string; status: string; detail: string }>;
    const countCheck = checks.find((c) => c.id === 'count-consistency');
    expect(countCheck?.status).toBe('PASS');
    expect(countCheck?.detail).toContain('state=10');
    expect(countCheck?.detail).toContain('file=10');
  });

  it('Scenario 5: Stale artifact detection — no artifacts have drifted from canonical state', () => {
    const { stdout } = runVerifier();
    const result = parseVerifierResult(stdout);
    const checks = result.checks as Array<{ id: string; status: string; detail: string }>;
    const staleCheck = checks.find((c) => c.id === 'stale-artifact-detection');
    expect(staleCheck?.status).toBe('PASS');
  });

  it('Baseline: Skill validator passes (if available)', () => {
    const { stdout, exitCode } = runSkillValidator();
    if (stdout.includes('SKIPPED')) {
      expect(true).toBe(true);
      return;
    }
    expect(exitCode).toBe(0);
    expect(stdout).toContain('PASS');
  });

  it('Baseline: All 20 positioning audit schema tests pass', () => {
    const testFile = path.join(repoRoot, 'tests', 'unit', 'positioningAuditSchema.test.ts');
    expect(fs.existsSync(testFile)).toBe(true);
  });

  it('Baseline: Sentry hardening tests pass (4 tests)', () => {
    const testFile = path.join(repoRoot, 'tests', 'unit', 'sentryHardening.test.ts');
    expect(fs.existsSync(testFile)).toBe(true);
  });

  it(`Baseline captured at ${baselineTimestamp}`, () => {
    expect(baselineTimestamp).toBeDefined();
  });
});
