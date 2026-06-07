import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const reportScriptPath = path.join(process.cwd(), 'scripts/report-source-provenance-readiness.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-source-provenance-readiness-report.mjs');
const timeout = 180_000;
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-source-provenance-'));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('source provenance readiness report', () => {
  it('renders a focused source-provenance report from the launch manifest', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'source-provenance.md');
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('# CEIP Source Provenance Readiness Report');
    expect(stdout).toContain('Source provenance status:');
    expect(stdout).toContain('Decision Boundary');
    expect(stdout).toContain('does not commit, unstage, stash, revert, delete, rename, move, clear source provenance');
    expect(stdout).toContain('Raw Source Provenance');
    expect(stdout).toContain('Source provenance:');
    expect(stdout).toContain('Source Provenance Isolation Ledger');
    expect(stdout).toContain('source_provenance_isolation_ledger');
    expect(stdout).toContain('dirty-source release impact only');
    expect(stdout).toContain('Source Provenance Resolution Queue');
    expect(stdout).toContain('Source provenance resolution queue');
    expect(stdout).toContain('Source Owner Decision Packet');
    expect(stdout).toContain('source_owner_decision_packet');
    expect(stdout).toContain('Recommended Owner Options');
    expect(stdout).toContain('Do not mutate source paths');
    expect(stdout).toContain('Release Preflight Source Row');
    expect(stdout).toContain('Production Approval Source Prerequisite');
    expect(stdout).toContain('Production Approval Request Source Row');
    expect(stdout).toContain('| Clean source provenance |');
    expect(stdout).toContain('Public Release Status Handles');
    expect(stdout).toContain('source_provenance_resolution_queue');
    expect(stdout).toContain('source_owner_decision_packet');
    expect(stdout).toContain('Package Script Handles');
    expect(stdout).toContain('corepack pnpm run report:source-provenance-readiness');
    expect(stdout).toContain('corepack pnpm run check:source-provenance-report');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  });

  it('emits a focused JSON payload with source-provenance rows and owner-stop boundaries', () => {
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);

    expect(payload.schema_version).toBe(1);
    expect(payload.launch_decision).toBe('blocked');
    expect(payload.source_provenance.status).toBe(payload.source_provenance.is_dirty ? 'blocked' : 'pass');
    expect(payload.source_provenance.branch).toBeTruthy();
    expect(payload.source_provenance.commit).toBeTruthy();
    expect(Number.isInteger(payload.source_provenance.dirty_path_count)).toBe(true);
    expect(Array.isArray(payload.source_provenance.dirty_paths)).toBe(true);
    expect(payload.source_provenance.isolation_ledger.proof_type).toBe('source_provenance_isolation_ledger');
    expect(payload.source_provenance.isolation_ledger.dirty_path_count).toBe(payload.source_provenance.dirty_path_count);
    expect(payload.source_provenance.resolution_queue.dirty_path_count).toBe(payload.source_provenance.dirty_path_count);
    expect(payload.source_provenance.owner_decision_packet.proof_type).toBe('source_owner_decision_packet');
    expect(payload.source_provenance.owner_decision_packet.source).toBe('source_provenance.resolution_queue.items');
    expect(payload.source_provenance.owner_decision_packet.status).toBe(payload.source_provenance.is_dirty ? 'blocked' : 'ready');
    expect(payload.source_provenance.owner_decision_packet.item_count).toBe(payload.source_provenance.resolution_queue.item_count);
    expect(payload.source_provenance.owner_decision_packet.blocked_count).toBe(payload.source_provenance.resolution_queue.blocked_count);
    expect(payload.source_provenance.owner_decision_packet.owner_decision_count).toBe(payload.source_provenance.resolution_queue.blocked_count);
    expect(payload.source_provenance.owner_decision_packet.proof_boundary).toMatch(/decision support only|does not commit|request production approval|deploy/i);
    expect(payload.source_provenance.owner_decision_packet.stop_gate).toMatch(/Do not mutate source paths|explicit owner intent|clean source-provenance rerun/i);
    expect(payload.release_preflight_source_row.requirement).toBe('Clean source provenance');
    expect(payload.production_approval_source_prerequisite.prerequisite).toBe('Clean source provenance');
    expect(payload.production_approval_request_source_row.prerequisite).toBe('Clean source provenance');
    expect(payload.public_status_handles.source_provenance.id).toBe('source_provenance');
    expect(payload.public_status_handles.source_provenance_isolation_ledger.id).toBe('source_provenance_isolation_ledger');
    expect(payload.public_status_handles.source_provenance_resolution_queue.id).toBe('source_provenance_resolution_queue');
    expect(payload.public_status_handles.source_owner_decision_packet.id).toBe('source_owner_decision_packet');
    expect(payload.public_status_handles.source_owner_decision_packet.command).toContain('report:source-provenance-readiness');
    expect(payload.public_status_handles.source_owner_decision_packet.command).toContain('check:source-provenance-report');
    expect(payload.public_status_handles.source_owner_decision_packet.sourceManifestPath).toBe('source_provenance.owner_decision_packet');
    expect(payload.package_script_handles.report_source_provenance_readiness).toBe('corepack pnpm run report:source-provenance-readiness');
    expect(payload.package_script_handles.check_source_provenance_report).toBe('corepack pnpm run check:source-provenance-report');
    expect(payload.package_script_handles.report_production_approval_packet).toBe('corepack pnpm run report:production-approval-packet');
    if (payload.source_provenance.resolution_queue.items.length > 0) {
      expect(payload.source_provenance.resolution_queue.items[0].proof_command).toContain('report:source-provenance-readiness');
      expect(payload.source_provenance.resolution_queue.items[0].proof_command).toContain('check:source-provenance-report');
    }
    if (payload.source_provenance.owner_decision_packet.items.length > 0) {
      const firstOwnerDecision = payload.source_provenance.owner_decision_packet.items[0];
      const firstResolutionDecision = payload.source_provenance.resolution_queue.items[0];
      expect(firstOwnerDecision.file_path).toBe(firstResolutionDecision.file_path);
      expect(firstOwnerDecision.old_path).toBe(firstResolutionDecision.old_path);
      expect(firstOwnerDecision.proof_type).toBe(firstResolutionDecision.proof_type);
      expect(firstOwnerDecision.owner_decision_required).toBe(true);
      expect(firstOwnerDecision.recommended_owner_options.length).toBeGreaterThanOrEqual(2);
      if (firstOwnerDecision.old_path || firstOwnerDecision.staging_state === 'staged_only') {
        expect(firstOwnerDecision.recommended_owner_options.map((option: { option?: string }) => option.option)).toEqual(expect.arrayContaining([
          'commit_as_intentional_change',
        ]));
      }
      expect(firstOwnerDecision.proof_command).toContain('report:source-provenance-readiness');
      expect(firstOwnerDecision.proof_command).toContain('check:source-provenance-report');
      expect(firstOwnerDecision.proof_boundary).toMatch(/decision support only|does not mutate source|request production approval|deploy/i);
      expect(firstOwnerDecision.stop_gate).toMatch(/Do not treat this packet item as approval|clear source provenance/i);
    }
    if (payload.source_provenance.isolation_ledger.rows.length > 0) {
      expect(payload.source_provenance.isolation_ledger.rows[0].proof_command).toContain('git status --porcelain=v1');
      expect(payload.source_provenance.isolation_ledger.rows[0].proof_command).toContain('report:source-provenance-readiness');
      expect(payload.source_provenance.isolation_ledger.rows[0].proof_command).toContain('check:source-provenance-report');
    }
    expect(payload.release_preflight_source_row.proof_command).toContain('report:source-provenance-readiness');
    expect(payload.production_approval_source_prerequisite.proof_command).toContain('report:source-provenance-readiness');
    expect(payload.production_approval_request_source_row.proof_command).toContain('report:source-provenance-readiness');
    expect(payload.proof_boundary).toMatch(/does not commit|run release-readiness|push|deploy/i);
    expect(payload.stop_gate).toMatch(/Do not treat this focused report|production approval|hosted\/live parity/i);
    if (payload.source_provenance.dirty_paths.length > 0) {
      const firstDirtyPath = payload.source_provenance.dirty_paths[0];
      expect(firstDirtyPath.owner_decision_required).toBe(true);
      expect(firstDirtyPath.proof_boundary).toMatch(/Raw source-provenance classification|does not.*commit|clear provenance/i);
      expect(firstDirtyPath.stop_gate).toMatch(/explicit owner intent|classification evidence only/i);
    }
  });

  it('validates the focused report contract without requiring source provenance to pass', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('Source provenance readiness report check passed');
  });

  it('can fail as a machine source gate when dirty-path blockers remain', () => {
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

    expect(result.status).toBe(json.source_provenance.status === 'pass' ? 0 : 1);
    expect(result.stdout).toContain('# CEIP Source Provenance Readiness Report');
    if (json.source_provenance.status !== 'pass') {
      expect(result.stderr).toContain('Source provenance remains blocked');
      expect(result.stderr).toContain('does not clear source provenance or production approval');
    }
  });
});
