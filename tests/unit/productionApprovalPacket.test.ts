import { spawn } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/report-production-approval-packet.mjs');
vi.setConfig({ testTimeout: 120_000 });

function shellSingleQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function writeExecutable(filePath: string, content: string) {
  writeFileSync(filePath, content);
  chmodSync(filePath, 0o755);
}

function markdownSection(markdown: string, heading: string) {
  const marker = `### ${heading}`;
  const start = markdown.indexOf(marker);
  if (start === -1) return '';
  const rest = markdown.slice(start);
  const next = rest.indexOf('\n### ', marker.length);
  return next === -1 ? rest : rest.slice(0, next);
}

async function runPacket(extraArgs: string[], envOverrides: NodeJS.ProcessEnv = {}) {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'ceip-approval-packet-'));
  const fakeNodePath = path.join(tempDir, 'node');
  const fakeCorepackPath = path.join(tempDir, 'corepack');
  const fakeGitPath = path.join(tempDir, 'git');
  const corepackMissing = envOverrides.CEIP_FAKE_COREPACK_MISSING === '1';

  writeExecutable(
    fakeNodePath,
    [
      '#!/bin/sh',
      'case "$*" in',
      '  *scripts/check-public-metadata.mjs*)',
      '    if [ "$CEIP_FAKE_LIVE_METADATA_FAIL" = "1" ]; then',
      '      echo "Public metadata check failed:"',
      '      echo "- stale metadata phrase found"',
      '      exit 1',
      '    fi',
      '    echo "Public metadata check passed."',
      '    exit 0',
      '    ;;',
      '  *scripts/check-live-static-parity.mjs*)',
      '    if [ "$CEIP_FAKE_LIVE_STATIC_FAIL" = "1" ]; then',
      '      echo "Live static parity check failed:"',
      '      echo "- /: remote static content does not match dist/index.html"',
      '      exit 1',
      '    fi',
      '    echo "Live static parity check passed for https://example.test"',
      '    echo "- / matches dist/index.html"',
      '    exit 0',
      '    ;;',
      '  *scripts/check-launch-evidence-manifest.mjs*)',
      '    if [ "$CEIP_FAKE_LAUNCH_EVIDENCE_FAIL" = "1" ]; then',
      '      echo "Launch evidence manifest check failed:"',
      '      echo "- release toolchain probe ledger missing from approval queue"',
      '      exit 1',
      '    fi',
      '    echo "Launch evidence manifest check passed: blocked decision, release toolchain probe ledger, production approval prerequisite queue, buyer boundary, and schema validation are consistent."',
      '    exit 0',
      '    ;;',
      '  *scripts/report-launch-evidence-manifest.mjs*)',
      '    if [ "$CEIP_FAKE_APPROVAL_REQUEST_PACKET_MISSING" = "1" ]; then',
      '      echo \'{"production_approval":{}}\'',
      '      exit 0',
      '    fi',
      '    if [ "$CEIP_FAKE_APPROVAL_REQUEST_BLOCKED" = "1" ]; then',
      '      echo \'{"production_approval":{"request_packet":{"status":"blocked","proof_type":"production_approval_request_packet","source_prerequisite_status":"blocked","request_eligible":false,"item_count":3,"request_blocking_count":2,"manual_stop_count":1,"proof_boundary":"Production approval request packet organizes evidence for owner review only; it does not grant owner approval, run deploys, push, merge, mutate branches, contact buyers, access Supabase, clear source provenance, or prove hosted/live parity.","stop_gate":"Do not request or claim production approval until every pre-request row is ready; do not run deploy-production.sh, netlify deploy, push, or hosted/live claims from this packet.","items":[{"rank":1,"prerequisite":"Buyer evidence hard gate","request_phase":"pre_request","source_status":"blocked","status":"blocked","blocks_request":true,"proof_command":"corepack pnpm run validate:pilot-evidence -- path/to/register.csv --require-95 --evidence-root path/to/redacted-artifacts"},{"rank":2,"prerequisite":"Supabase advisor clearance","request_phase":"pre_request","source_status":"blocked","status":"blocked","blocks_request":true,"proof_command":"Supabase Dashboard > Database > Security Advisor"},{"rank":3,"prerequisite":"Explicit owner production approval","request_phase":"owner_decision","source_status":"manual_stop","status":"manual_stop","blocks_request":false,"proof_command":"corepack pnpm run check:production-deploy-request"}]}}}\'',
      '      exit 0',
      '    fi',
      '    echo \'{"production_approval":{"request_packet":{"status":"ready_to_request","proof_type":"production_approval_request_packet","source_prerequisite_status":"ready","request_eligible":true,"item_count":1,"request_blocking_count":0,"manual_stop_count":1,"proof_boundary":"Production approval request packet organizes evidence for owner review only; it does not grant owner approval, run deploys, push, merge, mutate branches, contact buyers, access Supabase, clear source provenance, or prove hosted/live parity.","stop_gate":"Do not request or claim production approval until every pre-request row is ready; do not run deploy-production.sh, netlify deploy, push, or hosted/live claims from this packet.","items":[{"rank":1,"prerequisite":"Explicit owner production approval","request_phase":"owner_decision","source_status":"manual_stop","status":"manual_stop","blocks_request":false,"proof_command":"corepack pnpm run check:production-deploy-request"}]}}}\'',
      '    exit 0',
      '    ;;',
      '  *scripts/generate-public-release-status.mjs*)',
      '    if [ "$CEIP_FAKE_PUBLIC_RELEASE_STATUS_FAIL" = "1" ]; then',
      '      echo "Public release status manifest validation failed:"',
      '      echo "- Generated public manifest is out of sync. Run: pnpm run generate:public-release-status"',
      '      exit 1',
      '    fi',
      '    echo "Public release status manifest check passed."',
      '    exit 0',
      '    ;;',
      'esac',
      `exec ${shellSingleQuote(process.execPath)} "$@"`,
      '',
    ].join('\n'),
  );

  if (!corepackMissing) {
    writeExecutable(
      fakeCorepackPath,
      [
        '#!/bin/sh',
        'case "$*" in',
        '  pnpm\\ run\\ check:release-readiness*)',
        '    echo "Commercial source-of-truth check passed for 9 active docs and 28 historical docs."',
        '    echo "Strategy roadmap document check passed for docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md."',
        '    echo "### Live public metadata"',
        '    echo "- Status: fail"',
        '    echo "Public metadata check failed:"',
        '    echo "- https://example.test/: nested live metadata failure from completion-audit evidence"',
        '    echo "### Live static dist parity"',
        '    echo "- Status: fail"',
        '    echo "Live static parity check failed:"',
        '    echo "- /: remote static content does not match dist/index.html"',
        '    echo "Pilot evidence fixture 95% gate check passed."',
        '    echo "Public metadata check passed for local source metadata."',
        '    echo "Public metadata check passed for built dist metadata."',
        '    echo "All proof-pack route bundle budgets passed."',
        '    exit 0',
        '    ;;',
        'esac',
        'case "$*" in',
        '  pnpm\\ exec\\ playwright*) ;;',
        '  *) echo "Unexpected corepack command: $*"; exit 2 ;;',
        'esac',
        'if [ "$CEIP_ASSERT_PLAYWRIGHT_TMP_OUTPUTS" = "1" ]; then',
        '  case "$PLAYWRIGHT_HTML_OUTPUT_DIR" in',
        '    /tmp/ceip-*) ;;',
        '    *) echo "Playwright HTML output must be under /tmp/ceip-*"; exit 2 ;;',
        '  esac',
        '  case "$PLAYWRIGHT_JSON_OUTPUT_FILE" in',
        '    /tmp/ceip-*.json) ;;',
        '    *) echo "Playwright JSON output must be under /tmp/ceip-*.json"; exit 2 ;;',
        '  esac',
        'fi',
        'echo "Hosted proof-pack route smoke passed."',
        'exit 0',
        '',
      ].join('\n'),
    );
  }

  writeExecutable(
    fakeGitPath,
    [
      '#!/bin/sh',
      'case "$*" in',
      '  *branch\\ --show-current*)',
      '    echo "${CEIP_FAKE_GIT_BRANCH:-main}"',
      '    exit 0',
      '    ;;',
      '  *rev-parse\\ --short\\ HEAD*)',
      '    echo "abc1234"',
      '    exit 0',
      '    ;;',
      '  *status\\ --short*)',
      '    if [ "$CEIP_FAKE_GIT_DIRTY" = "1" ]; then',
      '      echo " M src/App.tsx"',
      '    elif [ "$CEIP_FAKE_GIT_STAGED_RENAME" = "1" ]; then',
      '      echo "R  .windsurf/workflows/master.md -> .devin/workflows/master.md"',
      '    fi',
      '    exit 0',
      '    ;;',
      '  *ls-files*src/App.tsx*)',
      '    echo "src/App.tsx"',
      '    exit 0',
      '    ;;',
      '  *ls-files*.devin/workflows/master.md*)',
      '    echo ".devin/workflows/master.md"',
      '    exit 0',
      '    ;;',
      '  *check-ignore*src/App.tsx*)',
      '    exit 1',
      '    ;;',
      '  *check-ignore*.devin/workflows/master.md*)',
      '    exit 1',
      '    ;;',
      'esac',
      `exec git "$@"`,
      '',
    ].join('\n'),
  );

  try {
    return await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(process.execPath, [scriptPath, '--base-url', 'https://example.test', ...extraArgs], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ...envOverrides,
          PATH: corepackMissing ? tempDir : `${tempDir}:${process.env.PATH ?? ''}`,
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

describe('production approval packet', () => {
  it('does not declare approval readiness when local release readiness is skipped', async () => {
    const result = await runPacket(['--skip-release-readiness', '--include-hosted-smoke']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('- Source deploy provenance: pass.');
    expect(result.stdout).toContain('- Launch evidence manifest validation: pass.');
    expect(result.stdout).toContain('- Production approval request packet: pass.');
    expect(result.stdout).toContain('- Public release status manifest validation: pass.');
    expect(result.stdout).toContain('- Local source approval state: skipped.');
    expect(result.stdout).toContain('- Live metadata parity: pass.');
    expect(result.stdout).toContain('- Live static dist parity: skipped.');
    expect(result.stdout).toContain('- Hosted proof-pack smoke: pass.');
    expect(result.stdout).toContain('- Deployment request readiness: blocked.');
    expect(result.stdout).toContain('- Live parity achieved: no.');
    expect(result.stdout).toContain('- Commercial launch boundary: launch evidence manifest validation checks structure and proof boundaries only; it does not prove commercial-ready status, production approval, or buyer acceptance.');
    expect(result.stdout).toContain('- Public status boundary: public release-status validation checks `/status/release-health.json` sync only; it does not prove production approval, deployment, buyer acceptance, or current hosted/live parity.');
    expect(result.stdout).toContain('Blocking pre-deploy gates: local release readiness is not passing.');
    expect(result.stdout).toContain('Skipped because local release readiness was skipped; exact static parity requires a freshly built dist');
    expect(result.stdout).toContain(
      'route /(utility-demand-forecast|forecast-benchmarking|regulatory-filing|pilot-readiness|ga-ici-5cp|byo-csv-proof)',
    );
    expect(result.stdout).not.toContain('Local and live gates are green.');
  });

  it('treats skipped local readiness as a blocker for fail-on-blocker runs', async () => {
    const result = await runPacket(['--skip-release-readiness', '--include-hosted-smoke', '--fail-on-blocker']);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Blocking pre-deploy gates: local release readiness is not passing.');
  });

  it('treats skipped local readiness as a blocker for pre-deploy request gates', async () => {
    const result = await runPacket([
      '--skip-release-readiness',
      '--include-hosted-smoke',
      '--fail-on-predeploy-blocker',
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('- Deployment request readiness: blocked.');
    expect(result.stdout).toContain('Blocking pre-deploy gates: local release readiness is not passing.');
  });

  it('reports missing Corepack as a toolchain blocker without approving bare pnpm evidence', async () => {
    const result = await runPacket(['--fail-on-predeploy-blocker'], {
      CEIP_FAKE_COREPACK_MISSING: '1',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('- Source deploy provenance: pass.');
    expect(result.stdout).toContain('- Launch evidence manifest validation: pass.');
    expect(result.stdout).toContain('- Production approval request packet: pass.');
    expect(result.stdout).toContain('- Public release status manifest validation: pass.');
    expect(result.stdout).toContain('- Local source approval state: fail.');
    expect(result.stdout).toContain('- Deployment request readiness: blocked.');
    expect(result.stdout).toContain('Blocking pre-deploy gates: local release readiness is not passing.');
    expect(result.stdout).toContain('Corepack executable was not found on PATH.');
    expect(result.stdout).toContain('Production deploy preflight uses Corepack to honor the pinned packageManager pnpm version.');
    expect(result.stdout).toContain('do not treat bare pnpm or a temporary local shim as production approval evidence.');
    expect(result.stdout).toContain('- Command: `corepack pnpm run check:release-readiness`');
    expect(result.stdout).toContain('- Live static dist parity: skipped.');
    expect(result.stdout).toContain('Skipped because local release readiness did not pass; exact static parity requires a freshly built dist');
    expect(result.stdout).not.toContain('Live static parity check failed:');
  });

  it('blocks production approval when source provenance is not deploy-script-ready', async () => {
    const result = await runPacket(['--include-hosted-smoke', '--fail-on-blocker'], {
      CEIP_FAKE_GIT_BRANCH: 'codex/ceip-proof-pack-hardening',
      CEIP_FAKE_GIT_DIRTY: '1',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('- Source deploy provenance: fail.');
    expect(result.stdout).toContain('- Launch evidence manifest validation: pass.');
    expect(result.stdout).toContain('- Production approval request packet: pass.');
    expect(result.stdout).toContain('- Public release status manifest validation: pass.');
    expect(result.stdout).toContain('- Deployment request readiness: blocked.');
    expect(result.stdout).toContain('- Live parity achieved: no.');
    expect(result.stdout).toContain('Blocker: deploy script requires branch main; current branch is codex/ceip-proof-pack-hardening.');
    expect(result.stdout).toContain('Blocker: deploy script requires a clean worktree; 1 dirty path(s) detected.');
    expect(result.stdout).toContain('Dirty detail: src/App.tsx | status=modified | index_status=clean | worktree_status=modified | staging_state=unstaged_only | tracked=yes | ignored_by_rule=no | action=unstaged source change; commit, stash, or revert before deploy');
    expect(result.stdout).toContain('Blocking pre-deploy gates: source deploy provenance is not deploy-script-ready.');
  });

  it('classifies staged-only renames as index blockers without implying they were resolved', async () => {
    const result = await runPacket(['--skip-release-readiness'], {
      CEIP_FAKE_GIT_STAGED_RENAME: '1',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('- Source deploy provenance: fail.');
    expect(result.stdout).toContain('- Launch evidence manifest validation: pass.');
    expect(result.stdout).toContain('- Production approval request packet: pass.');
    expect(result.stdout).toContain('- Public release status manifest validation: pass.');
    expect(result.stdout).toContain('Dirty: R  .windsurf/workflows/master.md -> .devin/workflows/master.md');
    expect(result.stdout).toContain('Dirty detail: .devin/workflows/master.md | status=renamed | index_status=renamed | worktree_status=clean | staging_state=staged_only | old_path=.windsurf/workflows/master.md | tracked=yes | ignored_by_rule=no | action=staged source change; commit, unstage, stash, or revert before deploy');
    expect(result.stdout).toContain('Blocking pre-deploy gates: source deploy provenance is not deploy-script-ready; local release readiness is not passing.');
  });

  it('separates deploy request readiness from stale live parity', async () => {
    const result = await runPacket(['--include-hosted-smoke'], {
      CEIP_FAKE_LIVE_METADATA_FAIL: '1',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('- Source deploy provenance: pass.');
    expect(result.stdout).toContain('- Launch evidence manifest validation: pass.');
    expect(result.stdout).toContain('- Production approval request packet: pass.');
    expect(result.stdout).toContain('- Public release status manifest validation: pass.');
    expect(result.stdout).toContain('- Local source approval state: preflight-clean.');
    expect(result.stdout).toContain('- Live metadata parity: fail.');
    expect(result.stdout).toContain('- Deployment request readiness: ready for explicit owner approval.');
    expect(result.stdout).toContain('- Live parity achieved: no.');
    expect(result.stdout).toContain('Local source is ready to request explicit production remediation approval, but live parity is not achieved.');
    expect(result.stdout).toContain('deploy current source only after explicit owner approval');
    expect(result.stdout).not.toContain('Do not request production deploy approval.');
  });

  it('keeps nested live failures out of passing local readiness evidence', async () => {
    const result = await runPacket(['--include-hosted-smoke'], {
      CEIP_FAKE_LIVE_METADATA_FAIL: '1',
      CEIP_FAKE_LIVE_STATIC_FAIL: '1',
    });

    const localReadinessSection = markdownSection(result.stdout, 'Local release readiness');
    const liveMetadataSection = markdownSection(result.stdout, 'Live metadata parity');
    const liveStaticSection = markdownSection(result.stdout, 'Live static dist parity');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('- Launch evidence manifest validation: pass.');
    expect(result.stdout).toContain('- Production approval request packet: pass.');
    expect(result.stdout).toContain('- Public release status manifest validation: pass.');
    expect(localReadinessSection).toContain('Local release readiness passed; live parity is reported by the dedicated live metadata');
    expect(localReadinessSection).toContain('Public metadata check passed for local source metadata.');
    expect(localReadinessSection).not.toContain('Public metadata check failed:');
    expect(localReadinessSection).not.toContain('Live static parity check failed:');
    expect(localReadinessSection).not.toContain('nested live metadata failure');
    expect(liveMetadataSection).toContain('Public metadata check failed:');
    expect(liveStaticSection).toContain('Live static parity check failed:');
  });

  it('runs hosted proof-pack smoke without writing Playwright reports into the repo', async () => {
    const result = await runPacket(['--skip-release-readiness', '--include-hosted-smoke'], {
      CEIP_ASSERT_PLAYWRIGHT_TMP_OUTPUTS: '1',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('- Hosted proof-pack smoke: pass.');
    expect(result.stderr).toBe('');
  });

  it('allows pre-deploy request gates to pass when only live parity is stale', async () => {
    const result = await runPacket(['--include-hosted-smoke', '--fail-on-predeploy-blocker'], {
      CEIP_FAKE_LIVE_METADATA_FAIL: '1',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('- Deployment request readiness: ready for explicit owner approval.');
    expect(result.stdout).toContain('- Live parity achieved: no.');
  });

  it('blocks deploy request readiness when the production approval request packet is ineligible', async () => {
    const result = await runPacket(['--include-hosted-smoke', '--fail-on-predeploy-blocker'], {
      CEIP_FAKE_APPROVAL_REQUEST_BLOCKED: '1',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('- Source deploy provenance: pass.');
    expect(result.stdout).toContain('- Launch evidence manifest validation: pass.');
    expect(result.stdout).toContain('- Production approval request packet: fail.');
    expect(result.stdout).toContain('- Public release status manifest validation: pass.');
    expect(result.stdout).toContain('- Local source approval state: preflight-clean.');
    expect(result.stdout).toContain('- Deployment request readiness: blocked.');
    expect(result.stdout).toContain('Request eligible: no');
    expect(result.stdout).toContain('Open pre-request blockers: 2/3');
    expect(result.stdout).toContain('Blocking row: 1:Buyer evidence hard gate phase=pre_request source_status=blocked packet_status=blocked');
    expect(result.stdout).toContain('Blocking row: 2:Supabase advisor clearance phase=pre_request source_status=blocked packet_status=blocked');
    expect(result.stdout).toContain('Blocking pre-deploy gates: production approval request packet is not eligible.');
    expect(result.stdout).toContain('Blocker: production approval request packet is not eligible; every pre-request row must be ready before owner approval is requested.');
  });

  it('keeps all-green live gates framed as observed parity rather than deploy approval', async () => {
    const result = await runPacket(['--include-hosted-smoke', '--fail-on-blocker']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('- Deployment request readiness: ready for explicit owner approval.');
    expect(result.stdout).toContain('- Live parity achieved: yes.');
    expect(result.stdout).toContain('Treat this as observed live parity for the currently checked artifact');
    expect(result.stdout).toContain('it is not production approval');
    expect(result.stdout).toContain('not proof of a new deployment unless this packet was run after an explicitly approved deploy');
    expect(result.stdout).toContain('Production approval: still requires an explicit owner approval before any deploy command.');
  });

  it('blocks deploy request readiness when launch evidence manifest validation fails', async () => {
    const result = await runPacket(['--include-hosted-smoke', '--fail-on-predeploy-blocker'], {
      CEIP_FAKE_LAUNCH_EVIDENCE_FAIL: '1',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('- Source deploy provenance: pass.');
    expect(result.stdout).toContain('- Launch evidence manifest validation: fail.');
    expect(result.stdout).toContain('- Production approval request packet: pass.');
    expect(result.stdout).toContain('- Public release status manifest validation: pass.');
    expect(result.stdout).toContain('- Local source approval state: preflight-clean.');
    expect(result.stdout).toContain('- Deployment request readiness: blocked.');
    expect(result.stdout).toContain('Blocking pre-deploy gates: launch evidence manifest validation is not passing.');
    expect(result.stdout).toContain('Launch evidence manifest check failed:');
    expect(result.stdout).toContain('release toolchain probe ledger missing from approval queue');
  });

  it('blocks deploy request readiness when public release status manifest validation fails', async () => {
    const result = await runPacket(['--include-hosted-smoke', '--fail-on-predeploy-blocker'], {
      CEIP_FAKE_PUBLIC_RELEASE_STATUS_FAIL: '1',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('- Source deploy provenance: pass.');
    expect(result.stdout).toContain('- Launch evidence manifest validation: pass.');
    expect(result.stdout).toContain('- Production approval request packet: pass.');
    expect(result.stdout).toContain('- Public release status manifest validation: fail.');
    expect(result.stdout).toContain('- Local source approval state: preflight-clean.');
    expect(result.stdout).toContain('- Deployment request readiness: blocked.');
    expect(result.stdout).toContain('Blocking pre-deploy gates: public release status manifest validation is not passing.');
    expect(result.stdout).toContain('Public release status manifest validation failed:');
    expect(result.stdout).toContain('Generated public manifest is out of sync.');
  });

  it('keeps full blocker gates failing when live parity is stale', async () => {
    const result = await runPacket(['--include-hosted-smoke', '--fail-on-blocker'], {
      CEIP_FAKE_LIVE_METADATA_FAIL: '1',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('- Deployment request readiness: ready for explicit owner approval.');
    expect(result.stdout).toContain('- Live parity achieved: no.');
  });
});
