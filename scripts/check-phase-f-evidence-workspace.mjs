#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const tempRoot = mkdtempSync(path.join(tmpdir(), 'ceip-phase-f-workspace-check-'));
const workspaceDir = path.join(tempRoot, 'workspace');
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
  const filePath = path.join(workspaceDir, relativePath);
  try {
    if (!statSync(filePath).isFile()) failures.push(`Expected file was not created: ${relativePath}`);
  } catch {
    failures.push(`Expected file was not created: ${relativePath}`);
  }
}

function assertContains(label, text, expected) {
  if (!text.includes(expected)) failures.push(`${label} is missing expected text: ${expected}`);
}

try {
  const createResult = runScript('create-phase-f-evidence-workspace.mjs', [
    '--output-dir',
    workspaceDir,
    '--record-date',
    recordDate,
  ]);

  if (createResult.status !== 0) {
    failures.push(`Workspace generator exited ${createResult.status}.`);
    if (createResult.stderr.trim()) failures.push(createResult.stderr.trim());
    if (createResult.stdout.trim()) failures.push(createResult.stdout.trim());
  }

  assertFile('README.md');
  assertFile('phase-f-evidence-workspace-manifest.json');
  assertFile('outreach/outreach-response-log.csv');
  assertFile('phase-f-minimum-intake/phase-f-minimum-register-starter.csv');
  assertFile('phase-f-minimum-intake/utility-demand-forecast/pilot-evidence-register-starter.csv');
  assertFile('phase-f-minimum-intake/roi-calculator/pilot-evidence-register-starter.csv');
  assertFile('phase-f-minimum-intake/utility-security/pilot-evidence-register-starter.csv');

  const manifestPath = path.join(workspaceDir, 'phase-f-evidence-workspace-manifest.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.confidence_movement !== 'none') failures.push('Manifest must keep confidence_movement as none.');
    if (manifest.buyer_proof_created !== false) failures.push('Manifest must keep buyer_proof_created as false.');
    if (manifest.record_date !== recordDate) failures.push(`Manifest record_date must be ${recordDate}.`);
    if (!Array.isArray(manifest.selected_routes) || manifest.selected_routes.length !== 3) {
      failures.push('Manifest must include the three selected Phase F routes.');
    }
  } else {
    failures.push('Workspace manifest was not available for content checks.');
  }

  const readmePath = path.join(workspaceDir, 'README.md');
  if (existsSync(readmePath)) {
    const readme = readFileSync(readmePath, 'utf8');
    assertContains('Workspace README', readme, 'This workspace is collection scaffolding only.');
    assertContains('Workspace README', readme, 'Confidence movement: none');
    assertContains('Workspace README', readme, 'Buyer proof created: no');
    assertContains('Workspace README', readme, 'pnpm run validate:pilot-evidence');
  }

  const reportResult = runScript('report-buyer-evidence-readiness.mjs', [
    '--root',
    workspaceDir,
    '--evidence-root',
    path.join(workspaceDir, 'phase-f-minimum-intake'),
  ]);
  if (reportResult.status !== 0) {
    failures.push(`Buyer evidence readiness report exited ${reportResult.status}.`);
    if (reportResult.stderr.trim()) failures.push(reportResult.stderr.trim());
    if (reportResult.stdout.trim()) failures.push(reportResult.stdout.trim());
  }
  for (const expected of [
    'Production pilot evidence registers:',
    'Production outreach response logs: 1',
    'Confidence-moving register rows: 0',
    'Phase F 95% gate: not ready',
  ]) {
    assertContains('Buyer evidence readiness report', reportResult.stdout, expected);
  }

  const registerPath = path.join(workspaceDir, 'phase-f-minimum-intake/phase-f-minimum-register-starter.csv');
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
    path.join(workspaceDir, 'phase-f-minimum-intake'),
  ]);
  const hardGateOutput = `${hardGate.stderr}\n${hardGate.stdout}`;
  if (hardGate.status === 0) {
    failures.push('Generated workspace unexpectedly passed the hard 95% retained-evidence gate.');
  }
  for (const expected of [
    '95% confidence gate requires accepted buyer-supplied utility demand forecast evidence',
    '95% confidence gate requires accepted buyer-supplied TIER CFO or credit-banking evidence',
    '95% confidence gate requires accepted buyer-supplied shadow-billing or utility-security evidence',
    '95% confidence gate requires total accepted buyer-supplied confidence_delta of at least 0.9',
  ]) {
    assertContains('Hard gate output', hardGateOutput, expected);
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error('Phase F evidence workspace check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Phase F evidence workspace check passed: outreach log, starter bundle, manifest, readiness report, and hard-gate blockers remain consistent.');
