#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const packageJsonPath = path.join(repoRoot, 'package.json');

function fail(lines) {
  console.error(lines.join('\n'));
  process.exit(1);
}

let packageJson;
try {
  packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  fail([`Could not read package.json for Corepack toolchain check: ${error.message}`]);
}

const packageManager = String(packageJson.packageManager ?? '');
const packageManagerMatch = packageManager.match(/^pnpm@(\d+\.\d+\.\d+)$/);
if (!packageManagerMatch) {
  fail([
    `package.json packageManager must pin an exact pnpm version; found ${packageManager || 'none'}.`,
    'Release-readiness evidence must run through a pinned Corepack-resolved pnpm version.',
  ]);
}

const expectedPnpmVersion = packageManagerMatch[1];
const result = spawnSync('corepack', ['pnpm', '--version'], {
  cwd: repoRoot,
  encoding: 'utf8',
  env: { ...process.env, FORCE_COLOR: '0' },
});

if (result.error) {
  const message = String(result.error.message ?? result.error);
  const code = String(result.error.code ?? '');
  if (code === 'ENOENT' || /ENOENT/i.test(message)) {
    fail([
      'Corepack executable was not found on PATH.',
      `CEIP release-readiness uses Corepack to honor the pinned packageManager ${packageManager}.`,
      'Enable Corepack in this shell or run from a Corepack-enabled deploy environment; do not treat bare pnpm or a temporary local shim as release-readiness evidence.',
      `Raw error: ${message}`,
    ]);
  }

  fail([`Corepack toolchain check failed: ${message}`]);
}

if (result.status !== 0) {
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
  fail([
    `Corepack could not resolve ${packageManager}.`,
    output || 'No output captured.',
  ]);
}

const actualPnpmVersion = String(result.stdout ?? '').trim().split(/\r?\n/).at(-1)?.trim() ?? '';
if (actualPnpmVersion !== expectedPnpmVersion) {
  fail([
    `Corepack resolved pnpm ${actualPnpmVersion || 'unknown'}, but package.json pins ${packageManager}.`,
    'Run release-readiness from an environment where Corepack honors the pinned packageManager version.',
  ]);
}

console.log(`Corepack toolchain check passed: ${packageManager} is available.`);
