import { spawn } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/report-production-approval-packet.mjs');
vi.setConfig({ testTimeout: 15_000 });

function shellSingleQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function writeExecutable(filePath: string, content: string) {
  writeFileSync(filePath, content);
  chmodSync(filePath, 0o755);
}

async function runPacket(extraArgs: string[]) {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'ceip-approval-packet-'));
  const fakeNodePath = path.join(tempDir, 'node');
  const fakePnpmPath = path.join(tempDir, 'pnpm');

  writeExecutable(
    fakeNodePath,
    [
      '#!/bin/sh',
      'case "$*" in',
      '  *scripts/check-public-metadata.mjs*)',
      '    echo "Public metadata check passed."',
      '    exit 0',
      '    ;;',
      '  *scripts/check-live-static-parity.mjs*)',
      '    echo "Live static parity check passed for https://example.test"',
      '    echo "- / matches dist/index.html"',
      '    exit 0',
      '    ;;',
      'esac',
      `exec ${shellSingleQuote(process.execPath)} "$@"`,
      '',
    ].join('\n'),
  );

  writeExecutable(
    fakePnpmPath,
    [
      '#!/bin/sh',
      'echo "Hosted proof-pack route smoke passed."',
      'exit 0',
      '',
    ].join('\n'),
  );

  try {
    return await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(process.execPath, [scriptPath, '--base-url', 'https://example.test', ...extraArgs], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PATH: `${tempDir}:${process.env.PATH ?? ''}`,
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
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

describe('production approval packet', () => {
  it('does not declare approval readiness when local release readiness is skipped', async () => {
    const result = await runPacket(['--skip-release-readiness', '--include-hosted-smoke']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('- Local source approval state: skipped.');
    expect(result.stdout).toContain('- Live metadata parity: pass.');
    expect(result.stdout).toContain('- Live static dist parity: pass.');
    expect(result.stdout).toContain('- Hosted proof-pack smoke: pass.');
    expect(result.stdout).toContain('Do not ask for production approval until local release readiness is passing.');
    expect(result.stdout).not.toContain('Local and live gates are green.');
  });

  it('treats skipped local readiness as a blocker for fail-on-blocker runs', async () => {
    const result = await runPacket(['--skip-release-readiness', '--include-hosted-smoke', '--fail-on-blocker']);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Do not ask for production approval until local release readiness is passing.');
  });
});
