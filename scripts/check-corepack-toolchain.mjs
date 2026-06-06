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

function compactOutput(result) {
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim().replace(/\s+/g, ' ');
  if (output) return output;
  if (result.error) return String(result.error.message ?? result.error);
  if (typeof result.status === 'number' && result.status !== 0) return `exit ${result.status}`;
  return 'no output captured';
}

function commandPath(command) {
  const result = spawnSync('/bin/sh', ['-c', `command -v ${command} || true`], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  const output = String(result.stdout ?? '').trim().split(/\r?\n/).filter(Boolean)[0];
  return output || 'missing';
}

function commandVersion(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  return {
    status: typeof result.status === 'number' ? result.status : result.error ? 1 : 0,
    output: compactOutput(result),
  };
}

function currentPathToolchainDiagnostic() {
  const barePnpm = commandVersion('pnpm', ['--version']);
  const barePnpmVersion = barePnpm.status === 0
    ? barePnpm.output.split(/\r?\n/).at(-1)?.trim() ?? barePnpm.output
    : '';
  const barePnpmCurrent = barePnpmVersion
    ? `bare pnpm ${barePnpmVersion}${barePnpmVersion === expectedPnpmVersion ? ' matches packageManager pin' : ' does not match packageManager pin'}; bare pnpm does not satisfy Corepack`
    : `${barePnpm.output}; bare pnpm is unavailable and does not satisfy Corepack`;
  const gitLfs = commandVersion('git-lfs', ['version']);
  const gitLfsCurrent = gitLfs.status === 0
    ? gitLfs.output
    : `${gitLfs.output}; git-lfs diagnostic is unavailable in this shell`;

  return [
    'Environment diagnostic:',
    `- Expected package manager: ${packageManager}.`,
    `- Current PATH: ${process.env.PATH || '(empty)'}.`,
    `- Current PATH corepack: ${commandPath('corepack')}.`,
    `- Current PATH pnpm: ${commandPath('pnpm')}; ${barePnpmCurrent}.`,
    `- Current PATH git-lfs: ${commandPath('git-lfs')}; ${gitLfsCurrent}.`,
    '- Boundary: local pnpm and git-lfs diagnostics are shell context only; they do not satisfy the Corepack resolver gate, run release-readiness, clear source provenance, push, deploy, or grant production approval.',
  ];
}

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
      ...currentPathToolchainDiagnostic(),
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
