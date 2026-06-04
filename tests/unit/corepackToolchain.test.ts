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

async function runToolchainCheck(pathValue: string) {
  return await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        PATH: pathValue,
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

    try {
      const result = await runToolchainCheck(tempDir);

      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('Corepack executable was not found on PATH.');
      expect(result.stderr).toContain('CEIP release-readiness uses Corepack to honor the pinned packageManager pnpm@10.23.0.');
      expect(result.stderr).toContain('do not treat bare pnpm or a temporary local shim as release-readiness evidence.');
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
});
