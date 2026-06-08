import { spawn } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/check-corepack-toolchain.mjs');

function writeExecutable(filePath: string, content: string) {
  writeFileSync(filePath, content);
  chmodSync(filePath, 0o755);
}

async function runToolchainCheck(pathValue: string, envOverrides: Record<string, string> = {}) {
  return await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        PATH: pathValue,
        ...envOverrides,
      },
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
    child.on('close', (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

describe('Corepack toolchain check', () => {
  it('reports missing Corepack as a release-readiness toolchain blocker', async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'ceip-corepack-missing-'));
    const fakePnpmPath = path.join(tempDir, 'pnpm');

    writeExecutable(
      fakePnpmPath,
      [
        '#!/bin/sh',
        'echo "10.23.0"',
        '',
      ].join('\n'),
    );

    try {
      const result = await runToolchainCheck(tempDir, {
        CEIP_NODE_VERSION_FOR_COREPACK_DIAGNOSTIC: 'v25.6.1',
      });

      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('Corepack executable was not found on PATH.');
      expect(result.stderr).toContain('CEIP release-readiness uses Corepack to honor the pinned packageManager pnpm@10.23.0.');
      expect(result.stderr).toContain('do not treat bare pnpm or a temporary local shim as release-readiness evidence.');
      expect(result.stderr).toContain('Environment diagnostic:');
      expect(result.stderr).toContain('- Expected package manager: pnpm@10.23.0.');
      expect(result.stderr).toContain('- Current PATH corepack: missing.');
      expect(result.stderr).toContain(`- Current PATH pnpm: ${fakePnpmPath}; bare pnpm 10.23.0 matches packageManager pin; bare pnpm does not satisfy Corepack.`);
      expect(result.stderr).toContain('- Current PATH git-lfs: missing;');
      expect(result.stderr).toContain('- Current Node.js: v25.6.1; Node.js 25+ no longer distributes bundled Corepack');
      expect(result.stderr).toContain('use an approved standalone Corepack install or a Corepack-enabled Node 22/24 release shell');
      expect(result.stderr).toContain('local pnpm and git-lfs diagnostics are shell context only');
      expect(result.stderr).toContain('Raw error: spawnSync corepack ENOENT');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('passes when Corepack resolves the packageManager pnpm version', async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'ceip-corepack-present-'));
    const fakeCorepackPath = path.join(tempDir, 'corepack');

    writeExecutable(
      fakeCorepackPath,
      [
        '#!/bin/sh',
        'if [ "$1" = "pnpm" ] && [ "$2" = "--version" ]; then',
        '  echo "10.23.0"',
        '  exit 0',
        'fi',
        'echo "Unexpected corepack command: $*"',
        'exit 2',
        '',
      ].join('\n'),
    );

    try {
      const result = await runToolchainCheck(tempDir);

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain('Corepack toolchain check passed: pnpm@10.23.0 is available.');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('suggests installed Corepack candidates without accepting bare pnpm as release evidence', async () => {
    const pathDir = mkdtempSync(path.join(tmpdir(), 'ceip-corepack-path-'));
    const candidateDir = mkdtempSync(path.join(tmpdir(), 'ceip-corepack-candidate-'));
    const fakePnpmPath = path.join(pathDir, 'pnpm');
    const fakeCorepackPath = path.join(candidateDir, 'corepack');

    writeExecutable(
      fakePnpmPath,
      [
        '#!/bin/sh',
        'echo "10.23.0"',
        '',
      ].join('\n'),
    );
    writeExecutable(
      fakeCorepackPath,
      [
        '#!/bin/sh',
        'if [ "$1" = "pnpm" ] && [ "$2" = "--version" ]; then',
        '  echo "10.23.0"',
        '  exit 0',
        'fi',
        'echo "Unexpected corepack command: $*"',
        'exit 2',
        '',
      ].join('\n'),
    );

    try {
      const result = await runToolchainCheck(pathDir, {
        CEIP_COREPACK_CANDIDATE_DIRS: candidateDir,
      });

      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('Corepack executable was not found on PATH.');
      expect(result.stderr).toContain('- Installed Corepack candidates outside current PATH:');
      expect(result.stderr).toContain(`${fakeCorepackPath}; resolves pinned pnpm 10.23.0.`);
      expect(result.stderr).toContain('PATH-only retry example: PATH="');
      expect(result.stderr).toContain(':$PATH" corepack pnpm --version');
      expect(result.stderr).toContain('PATH-only check example: PATH="');
      expect(result.stderr).toContain(':$PATH" corepack pnpm run check:corepack-toolchain');
      expect(result.stderr).toContain('a PATH-only retry can help prove the current release shell');
      expect(result.stderr).toContain('does not install Corepack, run release-readiness, clear source provenance');
      expect(result.stderr).toContain('bare pnpm 10.23.0 matches packageManager pin; bare pnpm does not satisfy Corepack');
    } finally {
      rmSync(pathDir, { recursive: true, force: true });
      rmSync(candidateDir, { recursive: true, force: true });
    }
  });
});
