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
  corepack pnpm run check:supabase-advisor-report

Options:
  --skip-probes    Validate the focused report contract without running local Corepack, Git LFS, buyer, or branch probes.
`);
}

function runReport(extraArgs = []) {
  const commandArgs = ['scripts/report-supabase-advisor-readiness.mjs', ...extraArgs];
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
    failures.push(`report-supabase-advisor-readiness exited ${markdown.status}.`);
    if (markdown.error.trim()) failures.push(markdown.error.trim());
    if (markdown.stderr.trim()) failures.push(markdown.stderr.trim());
    if (markdown.stdout.trim()) failures.push(markdown.stdout.trim().slice(0, 4000));
  }

  const jsonReport = runReport(['--json']);
  let payload = null;
  if (jsonReport.status !== 0) {
    failures.push(`report-supabase-advisor-readiness --json exited ${jsonReport.status}.`);
    if (jsonReport.error.trim()) failures.push(jsonReport.error.trim());
    if (jsonReport.stderr.trim()) failures.push(jsonReport.stderr.trim());
  } else {
    try {
      payload = JSON.parse(jsonReport.stdout);
    } catch (error) {
      failures.push(`Could not parse focused Supabase advisor JSON: ${error.message}`);
    }
  }

  if (markdown.status === 0) {
    const stdout = markdown.stdout;
    assertContains(stdout, '# CEIP Supabase Advisor Readiness Report', 'Report must include the focused Supabase advisor title.');
    assertContains(stdout, 'Supabase advisor status:', 'Report must include Supabase advisor status.');
    assertContains(stdout, '## Decision Boundary', 'Report must include a decision-boundary section.');
    assertContains(stdout, 'does not authorize connectors, access the dashboard, rerun Security Advisor or Performance Advisor', 'Report must preserve external-account non-execution boundaries.');
    assertContains(stdout, '## Supabase Advisor Evidence', 'Report must include Supabase advisor evidence.');
    assertContains(stdout, 'permission_denied', 'Report must keep permission-denied connector evidence visible when present.');
    assertContains(stdout, 'Database Security Advisor and Performance Advisor', 'Report must distinguish Supabase Security and Performance Advisor evidence.');
    assertContains(stdout, '## Supabase Advisor Clearance Deficit Ledger', 'Report must include the clearance deficit ledger.');
    assertContains(stdout, '| CLI app lint freshness |', 'Report must include the CLI app lint row.');
    assertContains(stdout, '| Connector project authorization |', 'Report must include the connector authorization row.');
    assertContains(stdout, '| Security advisor evidence |', 'Report must include the Security Advisor evidence row.');
    assertContains(stdout, '| Performance advisor evidence |', 'Report must include the Performance Advisor evidence row.');
    assertContains(stdout, '| Public-safe findings record |', 'Report must include the public-safe findings row.');
    assertContains(stdout, '| Advisor clearance claim |', 'Report must include the advisor clearance claim row.');
    assertContains(stdout, '## Supabase Advisor Remediation Queue', 'Report must include the remediation queue.');
    assertContains(stdout, 'does not authorize connectors, access dashboard, rerun advisors, mutate database, record secrets, or claim clearance', 'Report must preserve remediation queue boundaries.');
    assertContains(stdout, '## Production Approval Supabase Prerequisite', 'Report must include the production approval Supabase prerequisite.');
    assertContains(stdout, '## Production Approval Request Supabase Row', 'Report must include the production approval request Supabase row.');
    assert(/does not[\s\S]{0,240}grant production approval/i.test(stdout), 'Report must preserve production approval boundary text.');
  }

  if (payload) {
    const advisor = payload.supabase_advisor ?? {};
    const deficits = advisor.clearance_deficits ?? {};
    const remediationQueue = deficits.remediation_queue ?? {};
    const requirements = (deficits.items ?? []).map((item) => item.requirement);

    assert(payload.schema_version === 1, 'Focused Supabase advisor JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused Supabase advisor JSON must preserve the blocked launch decision.');
    assert(typeof advisor.status === 'string' && advisor.status.length > 0, 'supabase_advisor.status must be set.');
    assert(typeof advisor.project_ref === 'string' && advisor.project_ref.length > 0, 'supabase_advisor.project_ref must be set.');
    assert(['verified', 'watch', 'needs_remediation', 'external_gate', 'unknown'].includes(advisor.cli_app_lint_status), 'supabase_advisor.cli_app_lint_status must be a known status.');
    assert(requirements.join(',') === 'CLI app lint freshness,Connector project authorization,Security advisor evidence,Performance advisor evidence,Public-safe findings record,Advisor clearance claim', 'clearance_deficits.items must preserve Supabase advisor requirement order.');
    assert(deficits.total_count === 6, 'clearance_deficits.total_count must cover the six Supabase advisor rows.');
    assert(Array.isArray(remediationQueue.items), 'remediation_queue.items must be a list.');
    assert(remediationQueue.items.some((item) => item.external_account_required === true), 'remediation queue must identify external-account rows.');
    assert(remediationQueue.items.some((item) => item.proof_type === 'retained_redacted_record'), 'remediation queue must include the public-safe retained-record row.');
    assert(payload.launch_action_supabase_row?.phase === 'supabase_advisor', 'Focused JSON must include the launch action Supabase row.');
    assert(payload.production_approval_advisor_prerequisite?.prerequisite === 'Supabase advisor clearance', 'Focused JSON must include the production approval Supabase prerequisite.');
    assert(payload.production_approval_request_advisor_row?.prerequisite === 'Supabase advisor clearance', 'Focused JSON must include the production approval request Supabase row.');
    assert(/does not authorize connectors|access the dashboard|rerun Security Advisor or Performance Advisor|mutate the database|record secrets/i.test(payload.proof_boundary ?? ''), 'Focused report proof boundary must preserve Supabase non-execution and no-secret semantics.');
    assert(/Do not treat this focused report|CLI app lint|permission-denied connector output|Supabase advisor clearance|production approval/i.test(payload.stop_gate ?? ''), 'Focused report stop gate must reject clearance claims from the report itself.');
    for (const [index, item] of (deficits.items ?? []).entries()) {
      assert(typeof item.requirement === 'string' && item.requirement.length > 0, `clearance_deficits.items[${index}].requirement must be set.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `clearance_deficits.items[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && item.stop_gate.length > 0, `clearance_deficits.items[${index}].stop_gate must be set.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Supabase advisor readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Supabase advisor readiness report check passed: focused advisor status, clearance deficits, remediation queue, production approval rows, and external-account proof boundaries are consistent.');
