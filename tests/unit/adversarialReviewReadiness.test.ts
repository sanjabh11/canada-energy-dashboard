import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const reportScriptPath = path.join(process.cwd(), 'scripts/report-adversarial-review-readiness.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-adversarial-review-readiness-report.mjs');
const timeout = 180_000;
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-adversarial-review-'));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('adversarial review readiness report', () => {
  it('renders focused claim-refutation lanes from the launch manifest', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'adversarial-review.md');
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('# CEIP Adversarial Review Readiness Report');
    expect(stdout).toContain('Adversarial review readiness status:');
    expect(stdout).toContain('Adversarial review proof type:');
    expect(stdout).toContain('Claim-refutation lane count:');
    expect(stdout).toContain('## Decision Boundary');
    expect(stdout).toContain('Focused adversarial review evidence only');
    expect(stdout).toMatch(/does not prove production approval[\s\S]*create buyer evidence[\s\S]*authorize Supabase[\s\S]*deploy/i);
    expect(stdout).toContain('## Adversarial Review Summary');
    expect(stdout).toContain('adversarial_review_ledger');
    expect(stdout).toContain('## Claim-Refutation Lanes');
    for (const lane of [
      'buyer evidence',
      'production approval',
      'release toolchain',
      'Supabase advisor clearance',
      'branch risk',
    ]) {
      expect(stdout).toContain(lane);
    }
    expect(stdout).toContain('buyer_evidence_adversarial_review');
    expect(stdout).toContain('production_approval_adversarial_review');
    expect(stdout).toContain('release_toolchain_adversarial_review');
    expect(stdout).toContain('external_advisor_adversarial_review');
    expect(stdout).toContain('branch_risk_adversarial_review');
    expect(stdout).toContain('## Public Release Status Handle');
    expect(stdout).toContain('adversarial_review_ledger');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  });

  it('emits focused JSON with every core adversarial lane and no-readiness boundaries', () => {
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);

    expect(payload.schema_version).toBe(1);
    expect(payload.launch_decision).toBe('blocked');
    expect(payload.adversarial_review_ledger.status).toBe('blocked');
    expect(payload.adversarial_review_ledger.proof_type).toBe('adversarial_review_ledger');
    expect(payload.adversarial_review_ledger.review_count).toBeGreaterThanOrEqual(5);
    expect(payload.adversarial_review_ledger.missing_core_lane_count).toBe(0);
    expect(payload.adversarial_review_ledger.missing_core_lanes).toEqual([]);

    expect(payload.adversarial_reviews.map((item: { lane: string }) => item.lane)).toEqual(expect.arrayContaining([
      'buyer evidence',
      'production approval',
      'release toolchain',
      'Supabase advisor clearance',
      'branch risk',
    ]));
    expect(payload.adversarial_reviews.map((item: { proof_type: string }) => item.proof_type)).toEqual(expect.arrayContaining([
      'buyer_evidence_adversarial_review',
      'production_approval_adversarial_review',
      'release_toolchain_adversarial_review',
      'external_advisor_adversarial_review',
      'branch_risk_adversarial_review',
    ]));
    expect(payload.adversarial_reviews.every((item: { finding?: string; decision?: string; proof_boundary?: string; stop_gate?: string }) => (
      typeof item.finding === 'string'
      && item.finding.length > 0
      && typeof item.decision === 'string'
      && item.decision.length > 0
      && /does not|Challenges/i.test(item.proof_boundary ?? '')
      && /Do not/i.test(item.stop_gate ?? '')
    ))).toBe(true);
    expect(payload.public_status_handle.id).toBe('adversarial_review_ledger');
    expect(payload.package_script_handles.report_adversarial_review_readiness).toBe('corepack pnpm run report:adversarial-review-readiness');
    expect(payload.package_script_handles.check_adversarial_review_report).toBe('corepack pnpm run check:adversarial-review-report');
    expect(payload.proof_boundary).toMatch(/does not prove production approval|create buyer evidence|contact buyers|prove buyer acceptance|run release-readiness as clearance|authorize Supabase|clear Supabase advisor findings|approve branches|resolve source provenance|request owner approval|deploy|hosted\/live parity|clear launch blockers|commercial launch readiness/i);
    expect(payload.stop_gate).toMatch(/Do not treat this focused adversarial review report|production approval|buyer acceptance|release readiness|source readiness|branch approval|Supabase advisor clearance|deployment approval|hosted\/live parity|commercial-ready status|launch-goal completion/i);
  });

  it('validates the focused adversarial review report contract', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('Adversarial review readiness report check passed');
  });

  it('can fail as a machine gate while launch blockers remain open', () => {
    const result = spawnSync(process.execPath, [reportScriptPath, '--skip-probes', '--fail-on-blocker'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('# CEIP Adversarial Review Readiness Report');
    expect(result.stdout).toContain('Adversarial review readiness status: `blocked`');
    expect(result.stdout).toContain('Do not treat this focused adversarial review report');
  });
});
