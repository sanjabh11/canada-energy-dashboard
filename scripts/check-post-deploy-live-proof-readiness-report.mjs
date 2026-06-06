#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
let skipProbes = false;

for (const arg of args) {
  if (arg === '--') continue;
  if (arg === '--skip-probes') {
    skipProbes = true;
    continue;
  }
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  failures.push(`Unexpected argument: ${arg}`);
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run check:post-deploy-live-proof-report

Options:
  --skip-probes    Validate the focused report contract without running local Corepack or Git LFS probes.
`);
}

function runReport(extraArgs = []) {
  const commandArgs = ['scripts/report-post-deploy-live-proof-readiness.mjs', ...extraArgs];
  if (skipProbes) commandArgs.push('--skip-probes');
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 30 * 1024 * 1024,
  });
  return {
    status: typeof result.status === 'number' ? result.status : 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error.message ?? result.error) : '',
  };
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertContains(text, pattern, message) {
  assert(text.includes(pattern), message);
}

if (failures.length === 0) {
  const markdown = runReport();
  if (markdown.status !== 0) {
    failures.push(`report-post-deploy-live-proof-readiness exited ${markdown.status}.`);
    if (markdown.error.trim()) failures.push(markdown.error.trim());
    if (markdown.stderr.trim()) failures.push(markdown.stderr.trim());
    if (markdown.stdout.trim()) failures.push(markdown.stdout.trim().slice(0, 4000));
  }

  const jsonReport = runReport(['--json']);
  let payload = null;
  if (jsonReport.status !== 0) {
    failures.push(`report-post-deploy-live-proof-readiness --json exited ${jsonReport.status}.`);
    if (jsonReport.error.trim()) failures.push(jsonReport.error.trim());
    if (jsonReport.stderr.trim()) failures.push(jsonReport.stderr.trim());
  } else {
    try {
      payload = JSON.parse(jsonReport.stdout);
    } catch (error) {
      failures.push(`Could not parse focused post-deploy live proof JSON: ${error.message}`);
    }
  }

  if (markdown.status === 0) {
    const stdout = markdown.stdout;
    assertContains(stdout, '# CEIP Post-Deploy Live Proof Readiness Report', 'Report must include the focused post-deploy title.');
    assertContains(stdout, 'Post-deploy live proof status:', 'Report must include post-deploy live proof status.');
    assertContains(stdout, 'Current source live-proven:', 'Report must include current-source live proof status.');
    assertContains(stdout, '## Decision Boundary', 'Report must include a decision-boundary section.');
    assertContains(stdout, 'does not grant owner approval, deploy, push, rebuild, mutate Netlify', 'Report must preserve no-approval and no-live-mutation boundaries.');
    assertContains(stdout, '## Post-Deploy Live Proof Gate Queue', 'Report must include the post-deploy live proof gate queue.');
    assertContains(stdout, '| Production approval clearance |', 'Report must include the production approval clearance row.');
    assertContains(stdout, '| Guarded production deploy completion |', 'Report must include the guarded deploy completion row.');
    assertContains(stdout, '| Live public metadata |', 'Report must include the live public metadata row.');
    assertContains(stdout, '| Live static dist parity |', 'Report must include the live static parity row.');
    assertContains(stdout, '| Hosted proof-pack route smoke |', 'Report must include the hosted proof-pack smoke row.');
    assertContains(stdout, '| Current-source hosted parity claim |', 'Report must include the current-source hosted parity claim row.');
    assertContains(stdout, 'corepack pnpm run check:post-deploy-live', 'Report must include the full post-deploy proof command.');
    assertContains(stdout, 'corepack pnpm run check:live-public-metadata', 'Report must include the live metadata proof command.');
    assertContains(stdout, 'corepack pnpm run check:live-static-parity', 'Report must include the live static parity proof command.');
    assertContains(stdout, 'corepack pnpm run test:browser:hosted:proof-packs', 'Report must include the hosted proof-pack smoke command.');
    assertContains(stdout, 'DEPLOY CEIP PRODUCTION', 'Report must preserve the explicit deploy phrase boundary.');
    assertContains(stdout, '## Launch Action Post-Deploy Row', 'Report must include the launch action post-deploy row.');
    assertContains(stdout, '## Production Approval Live Prerequisite', 'Report must include the production approval live prerequisite.');
    assertContains(stdout, '## Production Approval Request Live Row', 'Report must include the production approval request live row.');
    assertContains(stdout, 'post_deploy_boundary', 'Report must classify the request row as post_deploy_boundary.');
  }

  if (payload) {
    const postDeploy = payload.post_deploy_live_proof ?? {};
    const gateQueue = postDeploy.gate_queue ?? {};
    const items = gateQueue.items ?? [];
    const gates = items.map((item) => item.gate);
    const gatesByName = new Map(items.map((item) => [item.gate, item]));

    assert(payload.schema_version === 1, 'Focused post-deploy live proof JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused post-deploy live proof JSON must preserve the blocked launch decision.');
    assert(postDeploy.current_source_live_proven === false, 'Focused report must not imply current source is live-proven.');
    assert(typeof postDeploy.status === 'string' && postDeploy.status.length > 0, 'post_deploy_live_proof.status must be set.');
    assert(gateQueue.status === 'blocked', 'Post-deploy live proof gate queue must remain blocked before approved deploy evidence.');
    assert(gateQueue.item_count === 6, 'Post-deploy live proof gate queue must include six rows.');
    assert(gateQueue.blocked_count === 6, 'Post-deploy live proof gate queue must keep all six rows blocked before approved deploy evidence.');
    assert(gateQueue.item_count === items.length, 'Post-deploy live proof gate item_count must match items length.');
    assert(gates.join(',') === 'Production approval clearance,Guarded production deploy completion,Live public metadata,Live static dist parity,Hosted proof-pack route smoke,Current-source hosted parity claim', 'Post-deploy live proof gate order must be stable.');
    assert(gatesByName.get('Production approval clearance')?.proof_type === 'manual_approval_gate', 'Production approval clearance must remain a manual approval gate.');
    assert(gatesByName.get('Guarded production deploy completion')?.proof_type === 'approved_deploy_execution', 'Guarded deploy completion must remain approved deploy execution.');
    assert(gatesByName.get('Live public metadata')?.proof_type === 'hosted_metadata_probe', 'Live public metadata must remain a hosted metadata probe.');
    assert(gatesByName.get('Live static dist parity')?.proof_type === 'hosted_static_parity_probe', 'Live static parity must remain a hosted static parity probe.');
    assert(gatesByName.get('Hosted proof-pack route smoke')?.proof_type === 'hosted_browser_smoke', 'Hosted proof-pack route smoke must remain hosted browser smoke.');
    assert(gatesByName.get('Current-source hosted parity claim')?.proof_type === 'post_deploy_parity_claim', 'Current-source hosted parity claim must remain a parity claim row.');
    assert(gatesByName.get('Live public metadata')?.proof_command === 'corepack pnpm run check:live-public-metadata', 'Live metadata proof command must use the package-script handle.');
    assert(gatesByName.get('Live static dist parity')?.proof_command === 'corepack pnpm run check:live-static-parity', 'Live static parity proof command must use the package-script handle.');
    assert(gatesByName.get('Hosted proof-pack route smoke')?.proof_command === 'corepack pnpm run test:browser:hosted:proof-packs', 'Hosted proof-pack smoke proof command must use the package-script handle.');
    assert(gatesByName.get('Current-source hosted parity claim')?.proof_command === 'corepack pnpm run check:post-deploy-live', 'Current-source hosted parity proof command must use check:post-deploy-live.');
    assert(gatesByName.get('Guarded production deploy completion')?.approval_required === true, 'Guarded deploy completion must require approval.');
    assert(gatesByName.get('Guarded production deploy completion')?.approval_phrase === 'DEPLOY CEIP PRODUCTION', 'Guarded deploy completion must preserve the typed approval phrase.');
    assert(items.every((item) => item.status !== 'ready'), 'Post-deploy gate rows must remain non-ready until live proof is current.');
    assert(/does not grant owner approval|deploy|mutate Netlify|run browser smoke|prove hosted\/live parity/i.test(payload.proof_boundary ?? ''), 'Focused report proof boundary must not imply approval, deploy, browser smoke, or live parity.');
    assert(/Do not treat this focused report|production approval|hosted parity|post-deploy live proof/i.test(payload.stop_gate ?? ''), 'Focused report stop gate must reject live-proof claims from the report itself.');
    assert(payload.launch_action_post_deploy_row?.phase === 'post_deploy_live_proof', 'Focused report JSON must include the launch action post-deploy row.');
    assert(payload.production_approval_live_prerequisite?.prerequisite === 'Post-deploy live proof boundary', 'Focused report JSON must include the production approval post-deploy prerequisite.');
    assert(payload.production_approval_request_live_row?.request_phase === 'post_deploy_boundary', 'Focused report JSON must preserve the post-deploy request phase.');
    assert(payload.production_approval_request_live_row?.blocks_request === false, 'Post-deploy request row must not count as a pre-request blocker.');
  }
}

if (failures.length > 0) {
  console.error('Post-deploy live proof readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Post-deploy live proof readiness report check passed: focused post-deploy gate queue, production approval rows, package-script handles, and no-live-parity boundaries are consistent.');
