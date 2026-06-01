#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const tempRoot = mkdtempSync(path.join(tmpdir(), 'ceip-phase-f-bundle-check-'));
const bundleDir = path.join(tempRoot, 'bundle');
const recordDate = '2026-06-01';
const failures = [];

function runScript(scriptName, args) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', scriptName), ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function assertFile(relativePath) {
  const filePath = path.join(bundleDir, relativePath);
  try {
    if (!statSync(filePath).isFile()) failures.push(`Expected file was not created: ${relativePath}`);
  } catch {
    failures.push(`Expected file was not created: ${relativePath}`);
  }
}

try {
  const createResult = runScript('create-phase-f-minimum-intake-bundle.mjs', [
    '--output-dir',
    bundleDir,
    '--record-date',
    recordDate,
  ]);

  if (createResult.status !== 0) {
    failures.push(`Bundle generator exited ${createResult.status}.`);
    if (createResult.stderr.trim()) failures.push(createResult.stderr.trim());
    if (createResult.stdout.trim()) failures.push(createResult.stdout.trim());
  }

  assertFile('phase-f-minimum-register-starter.csv');
  assertFile('README.md');
  assertFile('utility-demand-forecast/pilot-evidence-register-starter.csv');
  assertFile('roi-calculator/pilot-evidence-register-starter.csv');
  assertFile('utility-security/pilot-evidence-register-starter.csv');

  const registerPath = path.join(bundleDir, 'phase-f-minimum-register-starter.csv');
  if (existsSync(registerPath)) {
    const registerText = readFileSync(registerPath, 'utf8');
    for (const expected of [
      '/utility-demand-forecast',
      '/roi-calculator',
      '/utility-security',
      'confidence_delta',
      'Phase F bundle starter row only; not buyer proof',
    ]) {
      if (!registerText.includes(expected)) failures.push(`Starter register is missing expected text: ${expected}`);
    }
  } else {
    failures.push('Starter register was not available for content checks.');
  }

  const baseValidation = runScript('validate-pilot-evidence-register.mjs', [registerPath]);
  if (baseValidation.status !== 0) {
    failures.push(`Starter register should pass base validation; exited ${baseValidation.status}.`);
    if (baseValidation.stderr.trim()) failures.push(baseValidation.stderr.trim());
    if (baseValidation.stdout.trim()) failures.push(baseValidation.stdout.trim());
  }

  const hardGate = runScript('validate-pilot-evidence-register.mjs', [
    registerPath,
    '--require-95',
    '--evidence-root',
    bundleDir,
  ]);
  const hardGateOutput = `${hardGate.stderr}\n${hardGate.stdout}`;
  if (hardGate.status === 0) {
    failures.push('Starter bundle unexpectedly passed the hard 95% retained-evidence gate.');
  }
  for (const expected of [
    '95% confidence gate requires accepted buyer-supplied utility demand forecast evidence',
    '95% confidence gate requires accepted buyer-supplied TIER CFO or credit-banking evidence',
    '95% confidence gate requires accepted buyer-supplied shadow-billing or utility-security evidence',
    '95% confidence gate requires total accepted buyer-supplied confidence_delta of at least 0.9',
  ]) {
    if (!hardGateOutput.includes(expected)) failures.push(`Hard gate output is missing expected blocker: ${expected}`);
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error('Phase F minimum intake bundle check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Phase F minimum intake bundle check passed: starter bundle validates, stays non-confidence-moving, and fails the hard 95% gate as expected.');
