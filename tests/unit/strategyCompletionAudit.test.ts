import { spawn } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/report-strategy-completion-audit.mjs');
vi.setConfig({ testTimeout: 20_000 });

function shellSingleQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function writeExecutable(filePath: string, content: string) {
  writeFileSync(filePath, content);
  chmodSync(filePath, 0o755);
}

async function runCompletionAudit(sourceAnchorStatus: 'pass' | 'fail') {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'ceip-completion-audit-'));
  const fakePnpmPath = path.join(tempDir, 'pnpm');
  const planPath = path.join(tempDir, 'ceip-95-strategy-feature-gap.md');

  writeFileSync(planPath, '# CEIP Plan\n\n95% Strategy-Direction Confidence\n');

  writeExecutable(
    fakePnpmPath,
    [
      '#!/bin/sh',
      'case "$*" in',
      '  *check:strategy-roadmap-doc*)',
      '    echo "Strategy roadmap document check passed."',
      '    exit 0',
      '    ;;',
      '  *check:commercial-source*)',
      '    echo "Commercial source-of-truth check passed."',
      '    exit 0',
      '    ;;',
      '  *check:strategy-source-anchors*)',
      '    if [ "$CEIP_FAKE_SOURCE_ANCHOR_STATUS" = "fail" ]; then',
      '      echo "Fetch-failed anchors: 1"',
      '      exit 1',
      '    fi',
      '    echo "Live-verified anchors: 9"',
      '    echo "Manual-verified anchors: 4"',
      '    exit 0',
      '    ;;',
      '  *check:ga-ici-public-actuals*)',
      '    echo "GA/ICI public historical actuals check passed for public/data/ga_ici_5cp_public_historical_actuals.csv."',
      '    exit 0',
      '    ;;',
      '  *check:production-deploy-script*)',
      '    echo "Production deploy script guard passed for scripts/deploy-production.sh."',
      '    exit 0',
      '    ;;',
      '  *check:pilot-evidence-95-fixture-gate*)',
      '    echo "Pilot evidence fixture 95% gate check passed."',
      '    exit 0',
      '    ;;',
      '  *check:pilot-evidence-template*)',
      '    echo "Pilot evidence register template check passed for 25 required columns."',
      '    exit 0',
      '    ;;',
      '  *check:live-public-metadata*)',
      '    echo "Public metadata check failed:"',
      '    echo "- stale metadata phrase found"',
      '    exit 1',
      '    ;;',
      '  *check:live-static-parity*)',
      '    echo "Live static parity check failed:"',
      '    echo "- /: remote static content does not match dist/index.html"',
      '    exit 1',
      '    ;;',
      'esac',
      `exec ${shellSingleQuote(process.execPath)} "$@"`,
      '',
    ].join('\n'),
  );

  try {
    return await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(process.execPath, [scriptPath, '--plan', planPath, '--include-checks', '--fail-on-local-checks'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          CEIP_FAKE_SOURCE_ANCHOR_STATUS: sourceAnchorStatus,
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

describe('strategy completion audit', () => {
  it('exits nonzero when a required local source gate fails', async () => {
    const result = await runCompletionAudit('fail');

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('The completion audit found failing local verification gates: Strategy source anchors.');
    expect(result.stdout).toContain('- Command: `pnpm run check:strategy-source-anchors`');
    expect(result.stdout).toContain('Fetch-failed anchors: 1');
  });

  it('keeps live metadata failure as an external gate when local checks pass', async () => {
    const result = await runCompletionAudit('pass');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('The desk-research strategy-direction deliverable is complete locally.');
    expect(result.stdout).toContain('- Command: `pnpm run check:ga-ici-public-actuals`');
    expect(result.stdout).toContain('GA/ICI public historical actuals check passed');
    expect(result.stdout).toContain('- Command: `pnpm run check:production-deploy-script`');
    expect(result.stdout).toContain('Production deploy script guard passed');
    expect(result.stdout).toContain('- Command: `pnpm run check:pilot-evidence-95-fixture-gate`');
    expect(result.stdout).toContain('Pilot evidence fixture 95% gate check passed.');
    expect(result.stdout).toContain('- Command: `pnpm run check:pilot-evidence-template`');
    expect(result.stdout).toContain('Pilot evidence register template check passed');
    expect(result.stdout).toContain('- Command: `pnpm run check:live-public-metadata`');
    expect(result.stdout).toContain('Public metadata check failed:');
    expect(result.stdout).toContain('- Command: `pnpm run check:live-static-parity`');
    expect(result.stdout).toContain('Live static parity check failed:');
  });
});
