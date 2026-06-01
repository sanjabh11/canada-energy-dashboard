import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/check-github-repo-metadata.mjs');
const tempRoots: string[] = [];

const validMetadata = {
  description:
    'Canadian energy intelligence dashboard for utility demand forecasting, regulatory proof packs, ESG/NPRI data workflows, and buyer-ready energy analytics.',
  homepage: 'https://canada-energy.netlify.app',
  license: { spdx_id: 'MIT' },
  private: false,
  visibility: 'public',
  topics: ['analytics', 'canada', 'energy', 'esg', 'forecasting', 'react', 'supabase', 'typescript'],
};

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-github-metadata-'));
  tempRoots.push(root);
  return root;
}

function writeMetadataFixture(metadata: unknown) {
  const root = makeTempRoot();
  const filePath = path.join(root, 'metadata.json');
  writeFileSync(filePath, JSON.stringify(metadata, null, 2), 'utf8');
  return filePath;
}

function runMetadataCheck(metadata: unknown) {
  const fixturePath = writeMetadataFixture(metadata);
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, '--metadata-file', fixturePath], {
      cwd: process.cwd(),
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

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('GitHub repository metadata guard', () => {
  it('passes for the approved public repository metadata', async () => {
    const result = await runMetadataCheck(validMetadata);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('GitHub repository metadata check passed');
  });

  it('fails when public About-panel metadata regresses', async () => {
    const result = await runMetadataCheck({
      description: null,
      homepage: '',
      license: null,
      private: false,
      visibility: 'public',
      topics: ['energy'],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('GitHub repository metadata check failed:');
    expect(result.stderr).toContain('description must match');
    expect(result.stderr).toContain('homepage must be https://canada-energy.netlify.app');
    expect(result.stderr).toContain('license must resolve to MIT');
    expect(result.stderr).toContain('topics missing: analytics, canada');
  });

  it('fails when the repository visibility is not public', async () => {
    const result = await runMetadataCheck({
      ...validMetadata,
      private: true,
      visibility: 'private',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('GitHub repository must remain public.');
  });
});
