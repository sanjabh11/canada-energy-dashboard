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
  corepack pnpm run check:progress-digest-report

Options:
  --skip-probes    Validate the focused progress digest report without running local Corepack, Git LFS, branch, or buyer probes.
`);
}

function runReport(extraArgs = []) {
  const commandArgs = ['scripts/report-progress-digest-readiness.mjs', ...extraArgs];
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

function targetMatrixHasLane(matrix, lane, predicate = () => true) {
  return Array.isArray(matrix)
    && matrix.some((item) => (
      item
      && typeof item === 'object'
      && item.lane === lane
      && Number.isFinite(item.target_percent)
      && Number.isFinite(item.current_percent)
      && typeof item.status === 'string'
      && Array.isArray(item.evidence)
      && Number.isFinite(item.confidence)
      && predicate(item)
    ));
}

function hasStructuredUnblockOption(options, predicate = () => true) {
  return Array.isArray(options)
    && options.some((option) => (
      option
      && typeof option === 'object'
      && typeof option.action === 'string'
      && option.action.length > 0
      && typeof option.tradeoff === 'string'
      && option.tradeoff.length > 0
      && typeof option.expected_time_saved === 'string'
      && option.expected_time_saved.length > 0
      && typeof option.risk === 'string'
      && option.risk.length > 0
      && predicate(option)
    ));
}

if (failures.length === 0) {
  const markdown = runReport();
  if (markdown.status !== 0) {
    failures.push(`report-progress-digest-readiness exited ${markdown.status}.`);
    if (markdown.error.trim()) failures.push(markdown.error.trim());
    if (markdown.stderr.trim()) failures.push(markdown.stderr.trim());
    if (markdown.stdout.trim()) failures.push(markdown.stdout.trim().slice(0, 4000));
  }

  const jsonReport = runReport(['--json']);
  let payload = null;
  if (jsonReport.status !== 0) {
    failures.push(`report-progress-digest-readiness --json exited ${jsonReport.status}.`);
    if (jsonReport.error.trim()) failures.push(jsonReport.error.trim());
    if (jsonReport.stderr.trim()) failures.push(jsonReport.stderr.trim());
  } else {
    try {
      payload = JSON.parse(jsonReport.stdout);
    } catch (error) {
      failures.push(`Could not parse focused progress digest JSON: ${error.message}`);
    }
  }

  if (markdown.status === 0) {
    const stdout = markdown.stdout;
    assertContains(stdout, '# CEIP Progress Digest Readiness Report', 'Report must include the focused progress digest title.');
    assertContains(stdout, 'Progress digest status:', 'Report must include progress digest status.');
    assertContains(stdout, 'Activities remaining status:', 'Report must include activities remaining status.');
    assertContains(stdout, 'Bottleneck digest status:', 'Report must include bottleneck digest status.');
    assertContains(stdout, '## Decision Boundary', 'Report must include a decision-boundary section.');
    assertContains(stdout, 'does not complete pending work', 'Report must reject completion from progress digest evidence.');
    assert(/does not .*clear blockers|contact buyers|approve branches|authorize Supabase|deploy|hosted\/live parity|commercial launch readiness/i.test(stdout), 'Report must preserve no-clearance, no-external-action, no-deploy, no-live-parity, and no-readiness boundaries.');
    assertContains(stdout, '## Progress Summary', 'Report must include the progress summary.');
    assertContains(stdout, '## Progress Updates', 'Report must include progress update rows.');
    assertContains(stdout, 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-PUBLIC-HANDLE-DIGEST', 'Report must expose the latest Supabase advisor public-handle digest phase as current evidence.');
    assertContains(stdout, 'Safe Fix Lane', 'Report must include latest safe-fix lane target matrix evidence.');
    assertContains(stdout, 'code optimization review evidence', 'Report must include latest code-optimization target matrix evidence.');
    assertContains(stdout, 'objective completion audit', 'Report must include the objective completion audit phase.');
    assertContains(stdout, 'structured evidence manifest', 'Report must include target matrix evidence.');
    assertContains(stdout, 'retained buyer artifacts', 'Report must include the active buyer-evidence bottleneck.');
    assertContains(stdout, '## Activities Remaining', 'Report must include activities remaining rows.');
    assertContains(stdout, '## Current Phase Actions', 'Report must include current phase action rows.');
    assertContains(stdout, '## Next Phase Actions', 'Report must include next phase action rows.');
    assertContains(stdout, 'source_provenance', 'Report must include source provenance as a remaining current action.');
    assertContains(stdout, 'production_approval', 'Report must include production approval as a remaining current action.');
    assertContains(stdout, 'post_deploy_live_proof', 'Report must include post-deploy live proof as a remaining action.');
    assertContains(stdout, '## Bottleneck Summary', 'Report must include the bottleneck summary.');
    assertContains(stdout, '## Bottleneck Log', 'Report must include bottleneck rows.');
    assertContains(stdout, 'evidence gap', 'Report must include the current root cause.');
    assertContains(stdout, 'top unblock options', 'Report must include unblock-option evidence.');
    assertContains(stdout, 'Synthesis + Validation', 'Report must include the affected bottleneck lane.');
    assertContains(stdout, 'Expected time saved:', 'Report must include structured unblock expected-time-saved details.');
    assertContains(stdout, 'Tradeoff:', 'Report must include structured unblock tradeoff details.');
    assertContains(stdout, 'Risk:', 'Report must include structured unblock risk details.');
    assertContains(stdout, '## Public Release Status Handles', 'Report must include public status handles.');
    assertContains(stdout, 'progress_update_digest', 'Report must expose the public progress digest handle.');
    assertContains(stdout, 'bottleneck_log_digest', 'Report must expose the public bottleneck digest handle.');
    assertContains(stdout, '## Package Script Handles', 'Report must include package script handles.');
    assertContains(stdout, 'corepack pnpm run report:progress-digest-readiness', 'Report must include the focused progress report command.');
    assertContains(stdout, 'corepack pnpm run check:progress-digest-report', 'Report must include the focused progress checker command.');
  }

  if (payload) {
    assert(payload.schema_version === 1, 'Focused progress digest JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused progress digest JSON must preserve the blocked launch decision.');
    assert(payload.progress_digest?.proof_type === 'progress_update_digest', 'Focused JSON must include the progress update digest proof type.');
    assert(payload.progress_digest?.status === 'blocked', 'Focused progress digest must remain blocked while launch blockers remain open.');
    assert(payload.progress_digest?.update_count >= 2, 'Focused progress digest must include the latest safe-fix row and the objective-completion audit row.');
    assert(payload.progress_digest?.current_phase === 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-PUBLIC-HANDLE-DIGEST', 'Focused progress digest current phase must be the latest Supabase advisor public-handle digest ratchet.');
    assert(payload.progress_digest?.target_matrix_count >= 5, 'Focused progress digest must include the target matrix count.');
    assert(/retained buyer artifacts|guarded deploy\/live proof/i.test(payload.progress_digest?.current_bottleneck ?? ''), 'Focused progress digest must preserve the active evidence bottleneck.');
    assert(
      Array.isArray(payload.progress_updates)
        && payload.progress_updates.some((item) => item?.phase === 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-PUBLIC-HANDLE-DIGEST')
        && payload.progress_updates.some((item) => item?.phase === 'objective completion audit'),
      'Focused progress digest must include the latest Supabase advisor public-handle digest phase and objective-completion audit history.',
    );
    assert(
      targetMatrixHasLane(payload.progress_updates?.[0]?.target_matrix, 'Safe Fix Lane', (item) => (
        item.target_percent === 10
        && item.current_percent === 100
        && item.status === 'pass'
        && item.evidence.some((entry) => /implementation|code optimization review/i.test(entry))
      ))
        && targetMatrixHasLane(payload.progress_updates?.[0]?.target_matrix, 'Synthesis + Validation', (item) => (
          item.target_percent === 5
          && item.status === 'running'
          && item.evidence.some((entry) => /structured evidence manifest|commercial readiness report|progress digest/i.test(entry))
        )),
      'Focused progress digest current row must include structured safe-fix and synthesis target matrix entries.',
    );
    assert(
      targetMatrixHasLane(payload.progress_updates?.[1]?.target_matrix, 'Synthesis + Validation', (item) => (
        item.evidence.some((entry) => /structured evidence manifest|ECC ledger|blocked launch decision/i.test(entry))
      )),
      'Focused progress digest history row must preserve structured objective-completion synthesis evidence.',
    );
    assert(payload.activities_remaining?.proof_type === 'activities_remaining_digest', 'Focused JSON must include the activities remaining digest proof type.');
    assert(payload.activities_remaining?.status === 'blocked', 'Focused activities remaining digest must stay blocked while actions remain.');
    assert(payload.activities_remaining?.current_phase === 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-PUBLIC-HANDLE-DIGEST', 'Focused activities remaining digest must bind to the latest current phase.');
    assert(payload.activities_remaining?.current_phase_action_count >= 7, 'Focused activities remaining digest must count unresolved launch action queue rows.');
    assert(payload.activities_remaining?.next_phase_action_count >= 10, 'Focused activities remaining digest must count production approval and post-deploy action rows.');
    assert(payload.activities_remaining?.completion_blocker_count >= 4, 'Focused activities remaining digest must count objective-completion blockers.');
    assert(
      Array.isArray(payload.activities_remaining?.current_phase_actions)
        && payload.activities_remaining.current_phase_actions.some((item) => item.phase === 'source_provenance' && item.status === 'blocked')
        && payload.activities_remaining.current_phase_actions.some((item) => item.phase === 'production_approval' && item.status === 'manual_stop'),
      'Focused activities remaining digest must include source provenance and production approval current actions.',
    );
    assert(
      Array.isArray(payload.activities_remaining?.next_phase_actions)
        && payload.activities_remaining.next_phase_actions.some((item) => item.phase === 'Post-deploy live proof boundary' && item.status === 'blocked')
        && payload.activities_remaining.next_phase_actions.some((item) => item.phase === 'Hosted proof-pack route smoke' && item.status === 'blocked'),
      'Focused activities remaining digest must include production approval and hosted post-deploy next actions.',
    );
    assert(/without executing any proof commands/i.test(payload.activities_remaining?.evidence ?? ''), 'Focused activities remaining evidence must preserve report-only derivation.');
    assert(payload.bottleneck_digest?.proof_type === 'bottleneck_log_digest', 'Focused JSON must include the bottleneck log digest proof type.');
    assert(payload.bottleneck_digest?.status === 'blocked', 'Focused bottleneck digest must remain blocked while evidence gaps remain.');
    assert(payload.bottleneck_digest?.root_cause === 'evidence gap', 'Focused bottleneck digest must preserve the evidence-gap root cause.');
    assert(payload.bottleneck_digest?.affected_lane === 'Synthesis + Validation', 'Focused bottleneck digest must preserve the affected lane.');
    assert(Number.isInteger(payload.bottleneck_digest?.elapsed_minutes), 'Focused bottleneck digest must expose elapsed minutes.');
    assert(typeof payload.bottleneck_digest?.last_update === 'string' && payload.bottleneck_digest.last_update.length > 0, 'Focused bottleneck digest must expose last update.');
    assert(payload.bottleneck_digest?.top_unblock_option_count >= 3, 'Focused bottleneck digest must include at least three unblock options.');
    assert(
      Array.isArray(payload.bottleneck_log)
        && payload.bottleneck_log.some((item) => (
          item?.affected_lane === 'Synthesis + Validation'
          && hasStructuredUnblockOption(item.top_unblock_options, (option) => /buyer rows|retained redacted artifacts/i.test(option.action))
          && hasStructuredUnblockOption(item.top_unblock_options, (option) => /source provenance|release-readiness/i.test(option.action))
          && hasStructuredUnblockOption(item.top_unblock_options, (option) => /branch review|Supabase advisor/i.test(option.action))
        )),
      'Focused bottleneck log must include affected lane and structured buyer, source/release, branch/Supabase unblock options.',
    );
    assert(payload.public_status_handles?.progress_update_digest?.id === 'progress_update_digest', 'Focused JSON must include the public progress digest handle.');
    assert(payload.public_status_handles?.bottleneck_log_digest?.id === 'bottleneck_log_digest', 'Focused JSON must include the public bottleneck digest handle.');
    assert(/report:progress-digest-readiness/.test(payload.package_script_handles?.report_progress_digest_readiness ?? ''), 'Focused JSON must expose the progress report script handle.');
    assert(/check:progress-digest-report/.test(payload.package_script_handles?.check_progress_digest_report ?? ''), 'Focused JSON must expose the progress checker script handle.');
    assert(/does not complete pending work|clear blockers|contact buyers|approve branches|authorize Supabase|resolve evidence gaps|request owner approval|deploy|hosted\/live parity|commercial launch readiness/i.test(payload.proof_boundary ?? ''), 'Focused proof boundary must preserve progress and bottleneck no-clearance semantics.');
    assert(/Do not treat this focused progress digest report|production approval|buyer acceptance|release readiness|branch approval|Supabase advisor clearance|source readiness|deployment approval|hosted\/live parity|commercial-ready status/i.test(payload.stop_gate ?? ''), 'Focused stop gate must reject approval, buyer, release, branch, Supabase, source, deploy, live-parity, and readiness claims.');
  }
}

if (failures.length > 0) {
  console.error('Progress digest readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Progress digest readiness report check passed: progress updates, bottleneck log, public handles, package handles, and no-readiness boundaries are consistent.');
