import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/report-launch-evidence-manifest.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-launch-evidence-manifest.mjs');
const checkMarkdownReportScriptPath = path.join(process.cwd(), 'scripts/check-commercial-launch-readiness-report.mjs');
const markdownReportScriptPath = path.join(process.cwd(), 'scripts/report-commercial-launch-readiness.mjs');
const validatorPath = '/Users/sanjayb/.codex/skills/commercial-launch-readiness-orchestrator/scripts/validate_launch_evidence.py';
const LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS = 60000;
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-launch-evidence-'));
  tempRoots.push(root);
  return root;
}

function runManifest(args: string[] = []) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env,
    timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
  });
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('launch evidence manifest report', () => {
  it('emits a conservative blocked launch-evidence manifest that passes the orchestrator schema validator', () => {
    const stdout = runManifest(['--skip-probes']);
    const manifest = JSON.parse(stdout);

    expect(manifest.schema_version).toBe(1);
    expect(manifest.repo.name).toBe('canada-energy-dashboard');
    expect(manifest.repo.path).toBe(process.cwd());
    expect(manifest.launch_decision).toBe('blocked');
    expect(manifest.scores.evidence).toBe(1);
    expect(Object.keys(manifest.proof_buckets).sort()).toEqual([
      'candidate_shadow',
      'hosted_live',
      'local',
      'repo_artifact',
      'roadmap',
    ]);
    expect(manifest.gaps.some((gap: { severity: string; gap: string }) => gap.severity === 'P0' && gap.gap.includes('Phase F evidence'))).toBe(true);
    expect(manifest.gaps.some((gap: { severity: string; gap: string }) => gap.severity === 'P1' && gap.gap.includes('stale/aging unmerged branches'))).toBe(true);
    expect(manifest.buyer_evidence.status).toBe('skipped');
    expect(manifest.buyer_evidence.production_registers).toBeNull();
    expect(manifest.buyer_evidence.outreach_logs).toBeNull();
    expect(manifest.buyer_evidence.confidence_moving_rows).toBeNull();
    expect(manifest.buyer_evidence.actionable_outreach_rows).toBeNull();
    expect(manifest.buyer_evidence.batchable_intake_packet_rows).toBeNull();
    expect(manifest.buyer_evidence.phase_f_gate).toBe('unknown');
    expect(manifest.buyer_evidence.evidence).toContain('Buyer evidence review');
    expect(manifest.buyer_evidence.workspace_next_step).toContain('report:buyer-evidence-readiness');
    expect(manifest.source_provenance.branch).toBeTruthy();
    expect(manifest.source_provenance.commit).toBeTruthy();
    expect(Number.isInteger(manifest.source_provenance.dirty_path_count)).toBe(true);
    expect(manifest.source_provenance.evidence).toContain('Source provenance:');
    expect(manifest.source_provenance.deploy_gate).toContain('deploy');
    expect(manifest.branch_review.status).toBe('skipped');
    expect(manifest.branch_review.risk_counts.high).toBeNull();
    expect(manifest.branch_review.family_counts.local_only).toBeNull();
    expect(manifest.branch_review.family_evidence).toContain('Branch family review skipped');
    expect(manifest.branch_review.freshness_counts.stale).toBeNull();
    expect(manifest.branch_review.freshness_evidence).toContain('Branch freshness review skipped');
    expect(manifest.branch_review.evidence).toContain('Branch family review skipped');
    expect(manifest.branch_review.evidence).toContain('Branch freshness review skipped');
    expect(manifest.pain_points).toHaveLength(10);
    expect(manifest.pain_points[0].source_evidence.every((source: string) => source.startsWith('https://'))).toBe(true);
    expect(manifest.target_customers).toHaveLength(10);
    expect(manifest.outreach_plan.email_script_boundary).toContain('Do not claim buyer-proven 95% confidence');
    expect(manifest.ecc_ledger.decision).toBe('blocked');

    const tempRoot = makeTempRoot();
    const manifestPath = path.join(tempRoot, 'launch-evidence.json');
    writeFileSync(manifestPath, stdout, 'utf8');

    const validation = execFileSync('python3', [validatorPath, manifestPath, '--require-repo-exists'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
    });
    expect(validation).toContain('VALID');
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('keeps the release check wired to the blocked manifest contract', () => {
    const result = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(result).toContain('Launch evidence manifest check passed');
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('renders the orchestrator final-report tables from the validated manifest', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'commercial-launch-readiness.md');
    const stdout = execFileSync(process.execPath, [markdownReportScriptPath, '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(stdout).toContain('# CEIP Commercial Launch Readiness Report');
    expect(stdout).toContain('Decision: `blocked`');
    expect(stdout).toContain('## Launch Decision');
    expect(stdout).toContain('## Gap Analysis');
    expect(stdout).toContain('## Proof Buckets');
    expect(stdout).toContain('## Top 10 Pain Points');
    expect(stdout).toContain('## Top 10 Target Customers Or Segments');
    expect(stdout).toContain('## Outreach Plan');
    expect(stdout).toContain('## Fix Report');
    expect(stdout).toContain('## Adversarial Review');
    expect(stdout).toContain('## Evidence Validation');
    expect(stdout).toContain('## ECC Ledger');
    expect(stdout).toContain('Source provenance:');
    expect(stdout).toContain('Do not claim buyer-proven 95% confidence');
    expect(stdout).toContain('Buyer evidence review');
    expect(stdout).toContain('Batchable intake-packet outreach rows');
    expect(stdout).toContain('Branch family review skipped');
    expect(stdout).toContain('Branch freshness review skipped');
    expect(stdout).toContain('High-risk, local/origin split, or stale/aging unmerged branches');
    expect(stdout).toContain('validate_launch_evidence.py');
    expect(stdout).toContain('VALID');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('keeps the Markdown launch readiness report wired to the blocked proof-boundary contract', () => {
    const result = execFileSync(process.execPath, [checkMarkdownReportScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(result).toContain('Commercial launch readiness report check passed');
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);
});
