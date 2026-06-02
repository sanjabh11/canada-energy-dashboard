import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/check-client-env-safety.mjs');
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-client-env-safety-'));
  tempRoots.push(root);
  return root;
}

function writeFixture(root: string, relativePath: string, content: string) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

function runClientEnvSafety(root: string) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, '--root', root], {
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

describe('client env safety guard', () => {
  it('passes for approved public Vite client keys', async () => {
    const root = makeTempRoot();
    writeFixture(
      root,
      '.env',
      [
        'VITE_SUPABASE_URL=https://example.supabase.co',
        'VITE_SUPABASE_ANON_KEY=public-anon-key',
        'VITE_SUPABASE_EDGE_BASE=https://example.functions.supabase.co',
        'VITE_PADDLE_CLIENT_TOKEN=public-client-token',
        'SUPABASE_SERVICE_ROLE_KEY=backend-only-secret',
      ].join('\n'),
    );
    writeFixture(
      root,
      'netlify.toml',
      [
        '[build.environment]',
        'VITE_SUPABASE_URL = "https://example.supabase.co"',
        'VITE_STRIPE_PUBLISHABLE_KEY = "pk_test_public"',
      ].join('\n'),
    );
    writeFixture(
      root,
      'package.json',
      JSON.stringify({ scripts: { build: 'VITE_ENABLE_EDGE_FETCH=true vite build' } }, null, 2),
    );

    const result = await runClientEnvSafety(root);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Client env safety check passed');
  });

  it('fails when a Supabase service-role key is exposed through a Vite key', async () => {
    const root = makeTempRoot();
    writeFixture(root, '.env', 'VITE_SUPABASE_SERVICE_ROLE_KEY=do-not-print-this-value\n');

    const result = await runClientEnvSafety(root);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Client env safety check failed:');
    expect(result.stderr).toContain('VITE_SUPABASE_SERVICE_ROLE_KEY');
    expect(result.stderr).toContain('service-role key');
    expect(result.stderr).not.toContain('do-not-print-this-value');
  });

  it('fails when package scripts introduce client-facing secret names', async () => {
    const root = makeTempRoot();
    writeFixture(
      root,
      'package.json',
      JSON.stringify(
        {
          scripts: {
            build: 'VITE_STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET vite build',
            deploy: 'VITE_DATABASE_URL=$DATABASE_URL vite build',
          },
        },
        null,
        2,
      ),
    );

    const result = await runClientEnvSafety(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('VITE_STRIPE_WEBHOOK_SECRET');
    expect(result.stderr).toContain('VITE_DATABASE_URL');
    expect(result.stderr).not.toContain('$STRIPE_WEBHOOK_SECRET');
    expect(result.stderr).not.toContain('$DATABASE_URL');
  });
});
