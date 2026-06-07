#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
let skipProbes = false;
let jsonOutput = false;

for (const arg of args) {
  if (arg === '--') continue;
  if (arg === '--skip-probes') {
    skipProbes = true;
    continue;
  }
  if (arg === '--json') {
    jsonOutput = true;
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
  corepack pnpm run check:focused-launch-readiness-reports

Options:
  --skip-probes    Validate focused report contracts without running local Corepack, Git LFS, branch, or buyer probes.
  --json           Emit the aggregate focused-readiness check result as JSON.
`);
}

const focusedChecks = [
  {
    id: 'launch_action',
    label: 'Launch action queue',
    command: 'corepack pnpm run check:launch-action-report',
    script: 'scripts/check-launch-action-readiness-report.mjs',
  },
  {
    id: 'launch_evidence_validation',
    label: 'Launch evidence validation',
    command: 'corepack pnpm run check:launch-evidence-validation-report',
    script: 'scripts/check-launch-evidence-validation-readiness-report.mjs',
  },
  {
    id: 'source_provenance',
    label: 'Source provenance',
    command: 'corepack pnpm run check:source-provenance-report',
    script: 'scripts/check-source-provenance-readiness-report.mjs',
  },
  {
    id: 'release_preflight',
    label: 'Release preflight',
    command: 'corepack pnpm run check:release-preflight-report',
    script: 'scripts/check-release-preflight-readiness-report.mjs',
  },
  {
    id: 'branch_review',
    label: 'Branch review',
    command: 'corepack pnpm run check:branch-review-report',
    script: 'scripts/check-branch-review-readiness-report.mjs',
  },
  {
    id: 'supabase_advisor',
    label: 'Supabase advisor',
    command: 'corepack pnpm run check:supabase-advisor-report',
    script: 'scripts/check-supabase-advisor-readiness-report.mjs',
  },
  {
    id: 'buyer_evidence',
    label: 'Buyer evidence hard gate',
    command: 'corepack pnpm run check:buyer-evidence-gate-report',
    script: 'scripts/check-buyer-evidence-gate-readiness-report.mjs',
  },
  {
    id: 'production_approval',
    label: 'Production approval',
    command: 'corepack pnpm run check:production-approval-report',
    script: 'scripts/check-production-approval-readiness-report.mjs',
  },
  {
    id: 'post_deploy_live_proof',
    label: 'Post-deploy live proof',
    command: 'corepack pnpm run check:post-deploy-live-proof-report',
    script: 'scripts/check-post-deploy-live-proof-readiness-report.mjs',
  },
  {
    id: 'progress_digest',
    label: 'Progress digest',
    command: 'corepack pnpm run check:progress-digest-report',
    script: 'scripts/check-progress-digest-readiness-report.mjs',
  },
  {
    id: 'objective_completion_audit',
    label: 'Objective completion audit',
    command: 'corepack pnpm run check:objective-completion-audit-report',
    script: 'scripts/check-objective-completion-audit-readiness-report.mjs',
  },
  {
    id: 'adversarial_review',
    label: 'Adversarial review',
    command: 'corepack pnpm run check:adversarial-review-report',
    script: 'scripts/check-adversarial-review-readiness-report.mjs',
  },
];

const proofBoundary = 'Aggregate focused-readiness report contract check only; it does not clear source provenance, run release-readiness, choose canonical branch heads, authorize Supabase, contact buyers, request or grant owner approval, push, deploy, mutate live services, prove hosted/live parity, or create launch readiness.';
const stopGate = 'Do not treat this suite, passing focused report checks, skipped probes, generated manifests, or public status handles as commercial-ready status, buyer acceptance, source readiness, branch approval, Supabase advisor clearance, production approval, deploy authorization, or current hosted/live proof.';
const packageScriptHandles = {
  check_focused_launch_readiness_reports: 'corepack pnpm run check:focused-launch-readiness-reports',
  check_focused_launch_readiness_reports_skip_probes: 'corepack pnpm run check:focused-launch-readiness-reports -- --skip-probes',
  check_focused_launch_readiness_reports_json: 'corepack pnpm run check:focused-launch-readiness-reports -- --skip-probes --json',
  report_launch_evidence_manifest: 'corepack pnpm run report:launch-evidence-manifest',
  check_launch_evidence_manifest: 'corepack pnpm run check:launch-evidence-manifest',
  report_progress_digest_readiness: 'corepack pnpm run report:progress-digest-readiness',
  check_progress_digest_report: 'corepack pnpm run check:progress-digest-report',
  check_commercial_launch_readiness_report: 'corepack pnpm run check:commercial-launch-readiness-report',
};

function compactOutput(value, maxLength = 1200) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function runFocusedCheck(item) {
  const commandArgs = [item.script];
  if (skipProbes) commandArgs.push('--skip-probes');
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 30 * 1024 * 1024,
    timeout: 240_000,
  });
  const durationMs = Date.now() - startedAt;
  const exitCode = typeof result.status === 'number' ? result.status : 1;
  return {
    id: item.id,
    label: item.label,
    command: `${item.command}${skipProbes ? ' -- --skip-probes' : ''}`,
    script: item.script,
    status: exitCode === 0 ? 'pass' : 'fail',
    exit_code: exitCode,
    duration_ms: durationMs,
    stdout_summary: compactOutput(result.stdout),
    stderr_summary: compactOutput(result.stderr),
    error: result.error ? String(result.error.message ?? result.error) : '',
  };
}

let results = [];
if (failures.length === 0) {
  results = focusedChecks.map(runFocusedCheck);
}

const failedResults = results.filter((item) => item.status !== 'pass');
const payload = {
  schema_version: 1,
  status: failures.length === 0 && failedResults.length === 0 ? 'pass' : 'fail',
  skip_probes: skipProbes,
  check_count: focusedChecks.length,
  pass_count: results.filter((item) => item.status === 'pass').length,
  fail_count: failedResults.length + failures.length,
  checks: results,
  package_script_handles: packageScriptHandles,
  proof_boundary: proofBoundary,
  stop_gate: stopGate,
};

if (jsonOutput) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  if (failures.length > 0) {
    console.error('Focused launch readiness report suite check failed:\n');
    for (const failure of failures) console.error(`- ${failure}`);
    console.error('');
    printUsage();
  } else {
    console.log('# CEIP Focused Launch Readiness Report Suite');
    console.log(`Status: ${payload.status}`);
    console.log(`Focused report checks: ${payload.pass_count}/${payload.check_count} passed`);
    console.log(`Skip probes: ${skipProbes ? 'yes' : 'no'}`);
    console.log('');
    console.log('## Decision Boundary');
    console.log('');
    console.log(proofBoundary);
    console.log('');
    console.log(stopGate);
    console.log('');
    console.log('## Focused Checks');
    for (const item of results) {
      console.log(`- ${item.id}: ${item.status} (${item.command})`);
      if (item.status !== 'pass') {
        if (item.stderr_summary) console.log(`  stderr: ${item.stderr_summary}`);
        if (item.stdout_summary) console.log(`  stdout: ${item.stdout_summary}`);
        if (item.error) console.log(`  error: ${item.error}`);
      }
    }
    console.log('');
    console.log('## Package Script Handles');
    for (const [name, command] of Object.entries(packageScriptHandles)) {
      console.log(`- ${name}: ${command}`);
    }
  }
}

if (payload.status !== 'pass') {
  process.exit(1);
}
