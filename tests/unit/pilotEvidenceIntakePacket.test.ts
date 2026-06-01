import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const generatorScriptPath = path.join(process.cwd(), 'scripts/create-pilot-evidence-intake-packet.mjs');
const validatorScriptPath = path.join(process.cwd(), 'scripts/validate-pilot-evidence-register.mjs');
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-pilot-intake-'));
  tempRoots.push(root);
  return root;
}

function runNodeScript(scriptPath: string, args: string[]) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
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

describe('pilot evidence intake packet generator', () => {
  it('creates a route-specific starter packet that passes base register validation without moving confidence', async () => {
    const outputDir = makeTempRoot();
    const result = await runNodeScript(generatorScriptPath, [
      '--route', '/ga-ici-5cp',
      '--output-dir', outputDir,
      '--record-date', '2026-06-01',
      '--buyer-segment', 'Ontario Class A advisor',
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Pilot evidence intake packet created.');
    expect(result.stdout).toContain('ga_ici_5cp_decision_support_pack');
    expect(result.stdout).toContain('validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95');

    const registerPath = path.join(outputDir, 'pilot-evidence-register-starter.csv');
    const readmePath = path.join(outputDir, 'README.md');
    const artifactReadmePath = path.join(outputDir, 'redacted-artifacts/README.md');
    const registerText = readFileSync(registerPath, 'utf8');
    const readmeText = readFileSync(readmePath, 'utf8');
    const artifactReadmeText = readFileSync(artifactReadmePath, 'utf8');

    expect(registerText).toContain('/ga-ici-5cp');
    expect(registerText).toContain('ga_ici_5cp_decision_support_pack');
    expect(registerText).toContain('buyer_supplied_anonymized');
    expect(registerText).toContain(',pending,0,');
    expect(registerText).toContain('not market-confidence evidence');
    expect(readmeText).toContain('does not create buyer proof');
    expect(readmeText).toContain('confidence_delta=0');
    expect(readmeText).toContain('pnpm run prepare:pilot-evidence-artifact');
    expect(readmeText).toContain('--proof-pack-id ga_ici_5cp_decision_support_pack');
    expect(readmeText).toContain('Run the starter validation immediately');
    expect(readmeText).toContain('--buyer-data-coverage-pct "<replace with buyer data coverage percentage>"');
    expect(readmeText).toContain('--commercial-commitment-evidence "<replace with retained commercial-commitment evidence text when status is stronger than none>"');
    expect(readmeText).toContain('pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root');
    expect(readmeText).not.toContain('--buyer-data-coverage-pct 0 --time-to-artifact-hours 0');
    expect(artifactReadmeText).toContain('Do not store raw buyer files');

    const validationResult = await runNodeScript(validatorScriptPath, [registerPath]);
    expect(validationResult.status).toBe(0);
    expect(validationResult.stdout).toContain('Pilot evidence register validation passed');
    expect(validationResult.stderr).toBe('');
  });

  it('fails the 95% market-confidence gate for the starter packet', async () => {
    const outputDir = makeTempRoot();
    const createResult = await runNodeScript(generatorScriptPath, [
      '--route', '/utility-demand-forecast',
      '--output-dir', outputDir,
      '--record-date', '2026-06-01',
    ]);
    expect(createResult.status).toBe(0);

    const registerPath = path.join(outputDir, 'pilot-evidence-register-starter.csv');
    const result = await runNodeScript(validatorScriptPath, [
      registerPath,
      '--require-95',
      '--evidence-root',
      path.join(outputDir, 'redacted-artifacts'),
    ]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires accepted buyer-supplied utility demand forecast evidence');
    expect(output).toContain('95% confidence gate requires total accepted buyer-supplied confidence_delta of at least 0.9');
  });

  it('rejects unknown routes and lists supported routes', async () => {
    const outputDir = makeTempRoot();
    const badResult = await runNodeScript(generatorScriptPath, [
      '--route', '/unknown',
      '--output-dir', outputDir,
    ]);

    expect(badResult.status).toBe(1);
    expect(badResult.stderr).toContain('Unsupported route: /unknown');

    const listResult = await runNodeScript(generatorScriptPath, ['--list-routes']);

    expect(listResult.status).toBe(0);
    expect(listResult.stdout).toContain('/utility-demand-forecast');
    expect(listResult.stdout).toContain('/byo-csv-proof');
  });
});
