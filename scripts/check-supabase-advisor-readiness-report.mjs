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
    assertContains(stdout, '## Supabase Advisor Operator Handoff Packet', 'Report must include the Supabase advisor operator handoff packet.');
    assertContains(stdout, 'supabase_advisor_operator_handoff_packet', 'Report must include the Supabase advisor operator handoff proof type.');
    assertContains(stdout, 'supabase_advisor.clearance_deficits.remediation_queue.items', 'Report must expose the Supabase advisor handoff packet source.');
    assertContains(stdout, 'Execution Gate', 'Report must render Supabase advisor handoff execution gates.');
    assertContains(stdout, 'Can Execute From Packet', 'Report must render Supabase advisor handoff non-execution boundaries.');
    assertContains(stdout, 'planning evidence only', 'Report must preserve the Supabase advisor planning-only boundary.');
    assertContains(stdout, 'Secret Safe', 'Report must render Supabase advisor no-secret handling.');
    assertContains(stdout, '## Production Approval Supabase Prerequisite', 'Report must include the production approval Supabase prerequisite.');
    assertContains(stdout, '## Production Approval Request Supabase Row', 'Report must include the production approval request Supabase row.');
    assert(/does not[\s\S]{0,240}grant production approval/i.test(stdout), 'Report must preserve production approval boundary text.');
  }

  if (payload) {
    const advisor = payload.supabase_advisor ?? {};
    const deficits = advisor.clearance_deficits ?? {};
    const remediationQueue = deficits.remediation_queue ?? {};
    const operatorHandoffPacket = advisor.operator_handoff_packet ?? deficits.operator_handoff_packet ?? {};
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
    assert(operatorHandoffPacket.proof_type === 'supabase_advisor_operator_handoff_packet', 'Focused JSON must include the Supabase advisor operator handoff packet.');
    assert(operatorHandoffPacket.source === 'supabase_advisor.clearance_deficits.remediation_queue.items', 'Supabase advisor operator handoff packet must link to the remediation queue.');
    assert(['ready', 'blocked'].includes(operatorHandoffPacket.status), 'Supabase advisor operator handoff packet status must be ready or blocked.');
    assert(Array.isArray(operatorHandoffPacket.items), 'Supabase advisor operator handoff packet items must be a list.');
    assert(typeof operatorHandoffPacket.evidence === 'string' && /Supabase advisor operator handoff packet/i.test(operatorHandoffPacket.evidence), 'Supabase advisor operator handoff packet evidence must be set.');
    assert(typeof operatorHandoffPacket.proof_boundary === 'string' && /planning evidence only|does not authorize connectors|access dashboards|rerun Security Advisor or Performance Advisor|mutate database|run migrations|record secrets|clear advisor findings|request production approval|deploy|hosted\/live parity/i.test(operatorHandoffPacket.proof_boundary), 'Supabase advisor operator handoff packet proof_boundary must preserve planning-only external-account boundaries.');
    assert(typeof operatorHandoffPacket.stop_gate === 'string' && /Do not claim Supabase advisor clearance|request production approval|run migrations|alter secrets|deploy|hosted\/live parity/i.test(operatorHandoffPacket.stop_gate), 'Supabase advisor operator handoff packet stop_gate must reject clearance, secret, approval, deploy, and live-parity claims.');
    assert(operatorHandoffPacket.item_count === remediationQueue.items.length, 'Supabase advisor operator handoff packet item_count must match remediation queue items.');
    assert(operatorHandoffPacket.blocked_count === (operatorHandoffPacket.items ?? []).filter((item) => item.blocks_advisor_gate).length, 'Supabase advisor operator handoff packet blocked_count must match blocked handoff rows.');
    assert(operatorHandoffPacket.external_account_count === (operatorHandoffPacket.items ?? []).filter((item) => item.external_account_required).length, 'Supabase advisor operator handoff packet external_account_count must match external-account rows.');
    assert(operatorHandoffPacket.repo_command_count === (operatorHandoffPacket.items ?? []).filter((item) => item.proof_type === 'repo_command').length, 'Supabase advisor operator handoff packet repo_command_count must match repo-command rows.');
    assert(operatorHandoffPacket.retained_record_count === (operatorHandoffPacket.items ?? []).filter((item) => item.proof_type === 'retained_redacted_record').length, 'Supabase advisor operator handoff packet retained_record_count must match retained-record rows.');
    assert(
      JSON.stringify((operatorHandoffPacket.items ?? []).map((item) => item.requirement)) === JSON.stringify((remediationQueue.items ?? []).map((item) => item.requirement)),
      'Supabase advisor operator handoff packet rows must preserve remediation queue row order.',
    );
    assert(payload.launch_action_supabase_row?.phase === 'supabase_advisor', 'Focused JSON must include the launch action Supabase row.');
    assert(payload.production_approval_advisor_prerequisite?.prerequisite === 'Supabase advisor clearance', 'Focused JSON must include the production approval Supabase prerequisite.');
    assert(payload.production_approval_request_advisor_row?.prerequisite === 'Supabase advisor clearance', 'Focused JSON must include the production approval request Supabase row.');
    assert(
      /report:supabase-advisor-readiness/.test(payload.launch_action_supabase_row?.proof_command ?? '')
        && /check:supabase-advisor-report/.test(payload.launch_action_supabase_row?.proof_command ?? ''),
      'Focused JSON launch action Supabase row must point to the focused Supabase advisor report/check.',
    );
    assert(
      /report:supabase-advisor-readiness/.test(payload.production_approval_advisor_prerequisite?.proof_command ?? '')
        && /check:supabase-advisor-report/.test(payload.production_approval_advisor_prerequisite?.proof_command ?? ''),
      'Focused JSON production approval Supabase prerequisite must point to the focused Supabase advisor report/check.',
    );
    assert(
      /report:supabase-advisor-readiness/.test(payload.production_approval_request_advisor_row?.proof_command ?? '')
        && /check:supabase-advisor-report/.test(payload.production_approval_request_advisor_row?.proof_command ?? ''),
      'Focused JSON production approval Supabase request row must point to the focused Supabase advisor report/check.',
    );
    assert(/does not authorize connectors|access the dashboard|rerun Security Advisor or Performance Advisor|mutate the database|record secrets/i.test(payload.proof_boundary ?? ''), 'Focused report proof boundary must preserve Supabase non-execution and no-secret semantics.');
    assert(/Do not treat this focused report|CLI app lint|permission-denied connector output|Supabase advisor clearance|production approval/i.test(payload.stop_gate ?? ''), 'Focused report stop gate must reject clearance claims from the report itself.');
    for (const [index, item] of (deficits.items ?? []).entries()) {
      assert(typeof item.requirement === 'string' && item.requirement.length > 0, `clearance_deficits.items[${index}].requirement must be set.`);
      assert(typeof item.proof_boundary === 'string' && item.proof_boundary.length > 0, `clearance_deficits.items[${index}].proof_boundary must be set.`);
      assert(typeof item.stop_gate === 'string' && item.stop_gate.length > 0, `clearance_deficits.items[${index}].stop_gate must be set.`);
    }

    const operatorRowsByRequirement = new Map((operatorHandoffPacket.items ?? []).map((item) => [item.requirement, item]));
    for (const [index, item] of (operatorHandoffPacket.items ?? []).entries()) {
      const remediationRow = (remediationQueue.items ?? [])[index] ?? {};
      assert(Number.isInteger(item.rank), `operator_handoff_packet.items[${index}].rank must be an integer.`);
      assert(item.requirement === remediationRow.requirement, `operator_handoff_packet.items[${index}].requirement must match the remediation queue row.`);
      assert(item.owner === remediationRow.owner, `operator_handoff_packet.items[${index}].owner must match the remediation queue row.`);
      assert(['ready', 'blocked'].includes(item.status), `operator_handoff_packet.items[${index}].status must be ready or blocked.`);
      assert(typeof item.execution_gate === 'string' && item.execution_gate.length > 0, `operator_handoff_packet.items[${index}].execution_gate must be set.`);
      assert(item.proof_command === remediationRow.proof_command, `operator_handoff_packet.items[${index}].proof_command must match the remediation queue row.`);
      assert(item.proof_type === remediationRow.proof_type, `operator_handoff_packet.items[${index}].proof_type must match the remediation queue row.`);
      assert(item.external_account_required === remediationRow.external_account_required, `operator_handoff_packet.items[${index}].external_account_required must match the remediation queue row.`);
      assert(typeof item.public_safe_record_required === 'boolean', `operator_handoff_packet.items[${index}].public_safe_record_required must be boolean.`);
      assert(typeof item.secret_safe === 'boolean', `operator_handoff_packet.items[${index}].secret_safe must be boolean.`);
      assert(typeof item.blocks_advisor_gate === 'boolean', `operator_handoff_packet.items[${index}].blocks_advisor_gate must be boolean.`);
      assert(typeof item.can_execute_from_packet === 'boolean', `operator_handoff_packet.items[${index}].can_execute_from_packet must be boolean.`);
      assert(item.can_execute_from_packet === false, `operator_handoff_packet.items[${index}] must not be executable from the packet.`);
      assert(item.blocks_advisor_gate === (remediationRow.status !== 'ready'), `operator_handoff_packet.items[${index}] must derive blocks_advisor_gate from remediation row status.`);
      assert(typeof item.proof_boundary === 'string' && /planning evidence only|does not authorize connectors|access dashboards|rerun advisors|mutate database|run migrations|record secrets|clear advisor findings|request production approval|deploy|hosted\/live parity/i.test(item.proof_boundary), `operator_handoff_packet.items[${index}].proof_boundary must preserve planning-only Supabase boundaries.`);
      assert(typeof item.stop_gate === 'string' && /Do not execute external-account work|persist secrets|claim clearance|mark this row ready/i.test(item.stop_gate), `operator_handoff_packet.items[${index}].stop_gate must reject execution, secrets, and clearance claims.`);
      if (item.external_account_required) {
        assert(/authorized|dashboard|connector|Advisor/i.test(item.proof_boundary), `operator_handoff_packet.items[${index}] external-account rows must preserve authorization boundaries.`);
      }
      if (item.proof_type === 'retained_redacted_record') {
        assert(item.public_safe_record_required === true, `operator_handoff_packet.items[${index}] retained-record row must require a public-safe record.`);
        assert(item.secret_safe === true, `operator_handoff_packet.items[${index}] retained-record row must be marked secret safe.`);
      }
    }
    assert(operatorRowsByRequirement.get('CLI app lint freshness')?.execution_gate === 'repo_lint_freshness_first', 'Supabase operator CLI lint row must use repo_lint_freshness_first.');
    assert(operatorRowsByRequirement.get('Connector project authorization')?.execution_gate === 'authorized_connector_or_dashboard_access_first', 'Supabase operator authorization row must use authorized_connector_or_dashboard_access_first.');
    assert(operatorRowsByRequirement.get('Security advisor evidence')?.execution_gate === 'security_advisor_after_authorization', 'Supabase operator Security Advisor row must wait for authorization.');
    assert(operatorRowsByRequirement.get('Performance advisor evidence')?.execution_gate === 'performance_advisor_after_authorization', 'Supabase operator Performance Advisor row must wait for authorization.');
    assert(operatorRowsByRequirement.get('Public-safe findings record')?.execution_gate === 'public_safe_record_after_advisor_review', 'Supabase operator public-safe findings row must wait for advisor review.');
    assert(operatorRowsByRequirement.get('Advisor clearance claim')?.execution_gate === 'clearance_claim_after_all_rows_pass', 'Supabase operator clearance claim row must wait for all rows.');
  }
}

if (failures.length > 0) {
  console.error('Supabase advisor readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Supabase advisor readiness report check passed: focused advisor status, clearance deficits, remediation queue, operator handoff packet, production approval rows, and external-account proof boundaries are consistent.');
