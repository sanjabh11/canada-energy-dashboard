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

async function runPacket(extraArgs: string[], envOverrides: NodeJS.ProcessEnv = {}) {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'ceip-approval-packet-'));
  const fakeNodePath = path.join(tempDir, 'node');
  const fakePnpmPath = path.join(tempDir, 'pnpm');
  const fakeGitPath = path.join(tempDir, 'git');

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

  writeExecutable(
    fakeGitPath,
    [
      '#!/bin/sh',
      'case "$*" in',
      '  *branch\\ --show-current*)',
      '    echo "${CEIP_FAKE_GIT_BRANCH:-main}"',
      '    exit 0',
      '    ;;',
      '  *rev-parse\\ --short\\ HEAD*)',
      '    echo "abc1234"',
      '    exit 0',
      '    ;;',
      '  *status\\ --short*)',
      '    if [ "$CEIP_FAKE_GIT_DIRTY" = "1" ]; then',
      '      echo " M src/App.tsx"',
      '    fi',
      '    exit 0',
      '    ;;',
      'esac',
      `exec git "$@"`,
      '',
    ].join('\n'),
  );

  try {
    return await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(process.execPath, [scriptPath, '--base-url', 'https://example.test', ...extraArgs], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ...envOverrides,
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
    expect(result.stdout).toContain('- Source deploy provenance: pass.');
    expect(result.stdout).toContain('- Local source approval state: skipped.');
    expect(result.stdout).toContain('- Live metadata parity: pass.');
    expect(result.stdout).toContain('- Live static dist parity: pass.');
    expect(result.stdout).toContain('- Hosted proof-pack smoke: pass.');
    expect(result.stdout).toContain('Blocking gates: local release readiness is not passing.');
    expect(result.stdout).not.toContain('Local and live gates are green.');
  });

  it('treats skipped local readiness as a blocker for fail-on-blocker runs', async () => {
    const result = await runPacket(['--skip-release-readiness', '--include-hosted-smoke', '--fail-on-blocker']);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Blocking gates: local release readiness is not passing.');
  });

  it('blocks production approval when source provenance is not deploy-script-ready', async () => {
    const result = await runPacket(['--include-hosted-smoke', '--fail-on-blocker'], {
      CEIP_FAKE_GIT_BRANCH: 'codex/ceip-proof-pack-hardening',
      CEIP_FAKE_GIT_DIRTY: '1',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('- Source deploy provenance: fail.');
    expect(result.stdout).toContain('Blocker: deploy script requires branch main; current branch is codex/ceip-proof-pack-hardening.');
    expect(result.stdout).toContain('Blocker: deploy script requires a clean worktree; 1 dirty path(s) detected.');
    expect(result.stdout).toContain('Blocking gates: source deploy provenance is not deploy-script-ready.');
  });
});
