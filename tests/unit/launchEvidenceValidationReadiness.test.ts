import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const reportScriptPath = path.join(process.cwd(), 'scripts/report-launch-evidence-validation-readiness.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-launch-evidence-validation-readiness-report.mjs');
const timeout = 180_000;
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-launch-evidence-validation-'));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('launch evidence validation readiness report', () => {
  it('renders a focused launch evidence validation report from the manifest and validator', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'launch-evidence-validation.md');
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('# CEIP Launch Evidence Validation Readiness Report');
    expect(stdout).toContain('Validation readiness status:');
    expect(stdout).toContain('Validation check status:');
    expect(stdout).toContain('Launch action row status:');
    expect(stdout).toContain('Production prerequisite status:');
    expect(stdout).toContain('Request row blocks request:');
    expect(stdout).toContain('Decision Boundary');
    expect(stdout).toContain('does not self-certify the manifest');
    expect(stdout).toMatch(/request owner approval[\s\S]*contact buyers[\s\S]*authorize Supabase[\s\S]*deploy/i);
    expect(stdout).toContain('Validation Command Result');
    expect(stdout).toContain('corepack pnpm run check:launch-evidence-manifest');
    expect(stdout).toContain('launch_evidence_validation');
    expect(stdout).toContain('Production Approval Validation Prerequisite');
    expect(stdout).toContain('Production Approval Request Validation Row');
    expect(stdout).toContain('Public Release Status Handle');
    expect(stdout).toContain('launch_evidence_validation_gate');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  });

  it('emits a focused JSON payload with validation, launch action, approval, and public-handle rows', () => {
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);

    expect(payload.schema_version).toBe(1);
    expect(payload.launch_decision).toBe('blocked');
    expect(payload.validation_readiness.status).toMatch(/pass|blocked/);
    expect(payload.validation_readiness.validation_check.proof_type).toBe('launch_evidence_manifest_validation');
    expect(payload.validation_readiness.validation_check.status).toBe('pass');
    expect(payload.launch_action_validation_row.phase).toBe('launch_evidence_validation');
    expect(payload.launch_action_validation_row.proof_type).toBe('manifest_validation_and_approval_packet');
    expect(payload.launch_action_validation_row.status).toBe('ready');
    expect(payload.production_approval_validation_prerequisite.prerequisite).toBe('Launch evidence validation');
    expect(payload.production_approval_validation_prerequisite.status).toBe('ready');
    expect(payload.production_approval_request_validation_row.prerequisite).toBe('Launch evidence validation');
    expect(payload.production_approval_request_validation_row.blocks_request).toBe(false);
    expect(payload.public_status_validation_gate.id).toBe('launch_evidence_validation_gate');
    expect(payload.package_script_handles.check_launch_evidence_validation_report).toBe('corepack pnpm run check:launch-evidence-validation-report');
    expect(payload.proof_boundary).toMatch(/does not self-certify|clear source provenance|request owner approval|contact buyers|deploy|hosted\/live parity|commercial launch readiness/i);
    expect(payload.stop_gate).toMatch(/Do not treat this focused report|production approval|buyer acceptance|deployment approval|commercial-ready status/i);
  });

  it('validates the focused report contract', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('Launch evidence validation readiness report check passed');
  });

  it('can act as a machine gate for launch evidence validation only', () => {
    const json = JSON.parse(execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    }));

    const result = spawnSync(process.execPath, [reportScriptPath, '--skip-probes', '--fail-on-blocker'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(result.status).toBe(json.validation_readiness.status === 'pass' ? 0 : 1);
    expect(result.stdout).toContain('# CEIP Launch Evidence Validation Readiness Report');
    if (json.validation_readiness.status !== 'pass') {
      expect(result.stderr).toContain('Launch evidence validation readiness remains');
      expect(result.stderr).toContain('does not approve, deploy, prove buyer acceptance, or create launch readiness');
    }
  });
});
