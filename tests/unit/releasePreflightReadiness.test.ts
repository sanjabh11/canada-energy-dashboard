import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const reportScriptPath = path.join(process.cwd(), 'scripts/report-release-preflight-readiness.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-release-preflight-readiness-report.mjs');
const timeout = 180_000;
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-release-preflight-'));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('release preflight readiness report', () => {
  it('renders a focused release preflight blocker report from the launch manifest', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'release-preflight.md');
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('# CEIP Release Preflight Readiness Report');
    expect(stdout).toContain('Release preflight status: `blocked`');
    expect(stdout).toContain('Release Toolchain Probe Ledger');
    expect(stdout).toContain('| Corepack pnpm resolver | corepack pnpm --version |');
    expect(stdout).toContain('Diagnostic Command');
    expect(stdout).toContain('pnpm --version');
    expect(stdout).toContain('Bare pnpm diagnostics are local-shell context only');
    expect(stdout).toContain('| Git LFS push-path proof | git lfs version |');
    expect(stdout).toContain('git config --get core.hookspath');
    expect(stdout).toContain('Git LFS hook-path diagnostics are current-shell context only');
    expect(stdout).toContain('Do not treat bare pnpm, local shims, skipped probes');
    expect(stdout).toContain('Release Preflight Clearance Matrix');
    expect(stdout).toContain('Do not mark release approval ready');
    expect(stdout).toContain('Release Preflight Remediation Queue');
    expect(stdout).toContain('corepack pnpm run check:release-readiness');
    expect(stdout).toContain('Release Operator Handoff Packet');
    expect(stdout).toContain('release_operator_handoff_packet');
    expect(stdout).toContain('release_preflight.remediation_queue.items');
    expect(stdout).toContain('toolchain_probe_first');
    expect(stdout).toContain('after_corepack_git_lfs_and_clean_source');
    expect(stdout).toContain('Can Execute From Packet');
    expect(stdout).toContain('planning evidence only');
    expect(stdout).toContain('Source Provenance Boundary');
    expect(stdout).toContain('Production Approval Request Boundary');
    expect(stdout).toContain('does not grant owner approval');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  });

  it('emits a focused JSON payload with release preflight gates and owner-stop boundaries', () => {
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);

    expect(payload.schema_version).toBe(1);
    expect(payload.launch_decision).toBe('blocked');
    expect(payload.release_preflight.items.map((item: { requirement: string }) => item.requirement)).toEqual([
      'Pinned package manager',
      'Corepack pnpm resolver',
      'Release-readiness execution',
      'Git LFS push-path proof',
      'Clean source provenance',
      'Explicit owner production approval',
    ]);
    expect(payload.release_preflight.toolchain_probe_ledger.items.map((item: { id: string }) => item.id)).toEqual([
      'corepack_pnpm_resolver',
      'git_lfs_push_path',
    ]);
    const corepackProbe = payload.release_preflight.toolchain_probe_ledger.items.find(
      (item: { id: string }) => item.id === 'corepack_pnpm_resolver',
    );
    const gitLfsProbe = payload.release_preflight.toolchain_probe_ledger.items.find(
      (item: { id: string }) => item.id === 'git_lfs_push_path',
    );
    expect(corepackProbe.diagnostic_command).toBe('pnpm --version');
    expect(corepackProbe.diagnostic_current).toBe('skipped');
    expect(corepackProbe.diagnostic_boundary).toMatch(/Bare pnpm diagnostics are local-shell context only|does not satisfy the Corepack pnpm resolver gate|deploy|production approval/i);
    expect(payload.release_preflight.bare_pnpm_diagnostic).toBe('skipped');
    expect(gitLfsProbe.diagnostic_command).toContain('git config --get core.hookspath');
    expect(gitLfsProbe.diagnostic_current).toBe('skipped');
    expect(gitLfsProbe.diagnostic_boundary).toMatch(/Git LFS hook-path diagnostics are current-shell context only|future commit or push hook PATH|production approval/i);
    expect(payload.release_preflight.git_lfs_hook_diagnostic).toBe('skipped');
    expect(payload.release_preflight.clearance_matrix.proof_type).toBe('release_preflight_clearance_matrix');
    expect(payload.release_preflight.operator_handoff_packet.proof_type).toBe('release_operator_handoff_packet');
    expect(payload.release_preflight.operator_handoff_packet.source).toBe('release_preflight.remediation_queue.items');
    expect(payload.release_preflight.operator_handoff_packet.status).toBe('blocked');
    expect(payload.release_preflight.operator_handoff_packet.item_count).toBe(payload.release_preflight.remediation_queue.items.length);
    expect(payload.release_preflight.operator_handoff_packet.blocked_count).toBe(
      payload.release_preflight.operator_handoff_packet.items.filter((item: { blocks_release_gate: boolean }) => item.blocks_release_gate).length,
    );
    expect(payload.release_preflight.operator_handoff_packet.items.map((item: { requirement: string }) => item.requirement)).toEqual(
      payload.release_preflight.remediation_queue.items.map((item: { requirement: string }) => item.requirement),
    );
    expect(payload.release_preflight.operator_handoff_packet.items.every((item: { can_execute_from_packet: boolean }) => item.can_execute_from_packet === false)).toBe(true);
    const operatorRowsByRequirement = new Map(
      payload.release_preflight.operator_handoff_packet.items.map((item: { requirement: string }) => [item.requirement, item] as const),
    );
    expect((operatorRowsByRequirement.get('Corepack pnpm resolver') as { execution_gate?: string } | undefined)?.execution_gate).toBe('toolchain_probe_first');
    expect((operatorRowsByRequirement.get('Git LFS push-path proof') as { execution_gate?: string } | undefined)?.execution_gate).toBe('toolchain_probe_first');
    expect((operatorRowsByRequirement.get('Release-readiness execution') as { execution_gate?: string } | undefined)?.execution_gate).toBe('after_corepack_git_lfs_and_clean_source');
    expect((operatorRowsByRequirement.get('Clean source provenance') as { execution_gate?: string } | undefined)?.execution_gate).toBe('owner_source_decision_first');
    expect((operatorRowsByRequirement.get('Explicit owner production approval') as { execution_gate?: string } | undefined)?.execution_gate).toBe('manual_stop_after_all_prerequisites');
    expect(payload.release_preflight.operator_handoff_packet.proof_boundary).toMatch(/does not install Corepack|install Git LFS|run release-readiness|clear source provenance|push|deploy|hosted\/live parity/i);
    expect(payload.release_preflight.operator_handoff_packet.stop_gate).toMatch(/Do not mark release preflight ready|request production approval|push|deploy|hosted\/live parity/i);
    expect(payload.source_provenance.resolution_queue.evidence).toContain('Source provenance resolution queue');
    expect(payload.source_provenance.resolution_queue.items[0].proof_type).toMatch(/source_rename_decision|staged_source_decision|unstaged_source_decision|untracked_source_decision/);
    expect(payload.source_provenance.resolution_queue.items[0].proof_command).toContain('report:source-provenance-readiness');
    expect(payload.source_provenance.resolution_queue.items[0].proof_command).toContain('check:source-provenance-report');
    expect(payload.release_preflight.items.find((item: { requirement: string }) => item.requirement === 'Clean source provenance')?.proof_command).toContain('report:source-provenance-readiness');
    expect(payload.release_preflight.clearance_matrix.rows.find((item: { requirement: string }) => item.requirement === 'Clean source provenance')?.proof_command).toContain('report:source-provenance-readiness');
    expect(payload.release_preflight.remediation_queue.items.find((item: { requirement: string }) => item.requirement === 'Clean source provenance')?.proof_command).toContain('report:source-provenance-readiness');
    expect(payload.production_approval_request_packet.proof_type).toBe('production_approval_request_packet');
    expect(payload.proof_boundary).toMatch(/does not install tools|run release-readiness|push|deploy/i);
    expect(payload.stop_gate).toMatch(/Do not treat this focused report|production approval|hosted\/live parity/i);
  });

  it('validates the focused report contract without requiring release preflight to pass', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('Release preflight readiness report check passed');
  });

  it('can fail as a machine release gate when blockers remain', () => {
    const result = spawnSync(process.execPath, [reportScriptPath, '--skip-probes', '--fail-on-blocker'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('# CEIP Release Preflight Readiness Report');
    expect(result.stderr).toContain('Release preflight remains blocked');
    expect(result.stderr).toContain('does not clear release approval');
  });
});
