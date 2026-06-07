import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const checkScriptPath = path.join(process.cwd(), 'scripts/check-focused-launch-readiness-reports.mjs');
const timeout = 300_000;

describe('focused launch readiness report suite', () => {
  it('runs the focused report contract checks without claiming launch readiness', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('# CEIP Focused Launch Readiness Report Suite');
    expect(stdout).toContain('Status: pass');
    expect(stdout).toContain('Focused report checks: 12/12 passed');
    expect(stdout).toContain('Skip probes: yes');
    expect(stdout).toContain('## Decision Boundary');
    expect(stdout).toMatch(/does not clear source provenance|run release-readiness|choose canonical branch heads|authorize Supabase|contact buyers|request or grant owner approval|push|deploy|hosted\/live parity|create launch readiness/i);
    expect(stdout).toContain('launch_action: pass');
    expect(stdout).toContain('launch_evidence_validation: pass');
    expect(stdout).toContain('source_provenance: pass');
    expect(stdout).toContain('release_preflight: pass');
    expect(stdout).toContain('branch_review: pass');
    expect(stdout).toContain('supabase_advisor: pass');
    expect(stdout).toContain('buyer_evidence: pass');
    expect(stdout).toContain('production_approval: pass');
    expect(stdout).toContain('post_deploy_live_proof: pass');
    expect(stdout).toContain('progress_digest: pass');
    expect(stdout).toContain('objective_completion_audit: pass');
    expect(stdout).toContain('adversarial_review: pass');
  });

  it('emits structured JSON for operator handoff and automation logs', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);

    expect(payload.schema_version).toBe(1);
    expect(payload.status).toBe('pass');
    expect(payload.skip_probes).toBe(true);
    expect(payload.check_count).toBe(12);
    expect(payload.pass_count).toBe(12);
    expect(payload.fail_count).toBe(0);
    expect(payload.checks.map((item: { id: string }) => item.id)).toEqual([
      'launch_action',
      'launch_evidence_validation',
      'source_provenance',
      'release_preflight',
      'branch_review',
      'supabase_advisor',
      'buyer_evidence',
      'production_approval',
      'post_deploy_live_proof',
      'progress_digest',
      'objective_completion_audit',
      'adversarial_review',
    ]);
    expect(payload.checks.every((item: { status: string; command: string }) => (
      item.status === 'pass' && item.command.includes('--skip-probes')
    ))).toBe(true);
    expect(payload.proof_boundary).toMatch(/does not clear source provenance|run release-readiness|authorize Supabase|contact buyers|deploy|hosted\/live parity|launch readiness/i);
    expect(payload.stop_gate).toMatch(/Do not treat this suite|commercial-ready status|buyer acceptance|production approval|deploy authorization|current hosted\/live proof/i);
  });
});
