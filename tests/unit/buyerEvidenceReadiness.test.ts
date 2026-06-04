import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const readinessScriptPath = path.join(process.cwd(), 'scripts/report-buyer-evidence-readiness.mjs');
const intakePacketScriptPath = path.join(process.cwd(), 'scripts/create-pilot-evidence-intake-packet.mjs');
const tempRoots: string[] = [];

const outreachHeader = 'activity_date,channel,target_label,buyer_lane,proof_pack_id,route,rating,variant_id,caveat_used,artifact_promised,reply_status,response_summary,pain_signal,requested_input,reviewer_role,commercial_commitment_status,next_action,pilot_evidence_register_action,notes';

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-buyer-evidence-readiness-'));
  tempRoots.push(root);
  return root;
}

function runNodeScript(scriptPath: string, args: string[]) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
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
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('buyer evidence readiness report', () => {
  it('fails when an explicit evidence scan root does not exist', async () => {
    const root = makeTempRoot();
    const missingRoot = path.join(root, 'missing-registers');
    const result = await runNodeScript(readinessScriptPath, ['--root', missingRoot]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Buyer evidence readiness report failed:');
    expect(result.stderr).toContain('Root directory not found:');
    expect(result.stderr).toContain('missing-registers');
  });

  it('fails when an explicit evidence artifact root does not exist', async () => {
    const root = makeTempRoot();
    const missingEvidenceRoot = path.join(root, 'missing-artifacts');
    const result = await runNodeScript(readinessScriptPath, [
      '--root',
      root,
      '--evidence-root',
      missingEvidenceRoot,
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Buyer evidence readiness report failed:');
    expect(result.stderr).toContain('Evidence root directory not found:');
    expect(result.stderr).toContain('missing-artifacts');
  });

  it('reports no Phase F readiness when no production evidence inputs exist', async () => {
    const root = makeTempRoot();
    const result = await runNodeScript(readinessScriptPath, ['--root', root]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('CEIP Buyer Evidence Readiness Report');
    expect(result.stdout).toContain('Production pilot evidence registers: 0');
    expect(result.stdout).toContain('Production outreach response logs: 0');
    expect(result.stdout).toContain('Phase F 95% gate: not ready');
    expect(result.stdout).toContain('Batchable intake-packet outreach rows: 0');
    expect(result.stdout).toContain('Minimum Phase F 95% Evidence Map');
    expect(result.stdout).toContain('/utility-demand-forecast (utility_forecast_planning_pack)');
    expect(result.stdout).toContain('/roi-calculator (tier_cfo_savings_pack) or /credit-banking (tier_credit_banking_audit_pack)');
    expect(result.stdout).toContain('/shadow-billing (shadow_billing_invoice_pack) or /utility-security (utility_security_procurement_pack)');
    expect(result.stdout).toContain('At least three distinct accepted buyer-supplied proof_pack_id values');
    expect(result.stdout).toContain('Hard 95% Gate Deficit Ledger');
    expect(result.stdout).toContain('Open hard-gate deficits: 10/10');
    expect(result.stdout).toContain('Generated scaffolding, outreach headers, and starter registers do not close any deficit.');
    expect(result.stdout).toContain('| Utility forecast lane | 0 accepted diagnostic row(s) | >=1 buyer-supplied accepted utility forecast row with full diagnostics | blocked |');
    expect(result.stdout).toContain('| Distinct accepted proof packs | 0/3 | >=3 distinct proof_pack_id values with day_14_decision=proceed | blocked |');
    expect(result.stdout).toContain('| Retained-artifact 95% validation | not run | validate:pilot-evidence --require-95 passes with --evidence-root | blocked |');
    expect(result.stdout).toContain('corepack pnpm run create:phase-f-minimum-intake-bundle -- --output-dir /tmp/ceip-phase-f-minimum-intake');
    expect(result.stdout).toContain('All-in-one Phase F collection workspace for operators');
    expect(result.stdout).toContain('corepack pnpm run create:phase-f-evidence-workspace -- --output-dir /tmp/ceip-phase-f-evidence');
    expect(result.stdout).toContain('corepack pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence');
    expect(result.stdout).toContain('corepack pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence --register-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv');
    expect(result.stdout).toContain('Default bundle routes: /utility-demand-forecast (utility_forecast_planning_pack), /roi-calculator (tier_cfo_savings_pack), /utility-security (utility_security_procurement_pack).');
    expect(result.stdout).not.toContain('corepack pnpm run create:pilot-evidence-intake-packet -- --route /utility-security --output-dir /tmp/ceip-phase-f-utility-security');
    expect(result.stdout).toContain('Start the all-in-one Phase F evidence workspace');
    expect(result.stdout).toContain('After `update:pilot-evidence-register-row` writes an updated candidate register inside the workspace');
    expect(result.stdout).toContain('Append only real, anonymized buyer activity rows');
    expect(result.stdout).toContain('append:outreach-response-log-row');
  });

  it('discovers actionable outreach rows and keeps confidence movement at zero', async () => {
    const root = makeTempRoot();
    const logPath = path.join(root, 'outreach-response-log.csv');
    writeFileSync(logPath, [
      outreachHeader,
      [
        '2026-01-15',
        'linkedin',
        'ontario_peak_advisor_001',
        'utility',
        'ga_ici_5cp_decision_support_pack',
        '/ga-ici-5cp',
        '4.2',
        'ga_ici_5cp',
        '"No guaranteed savings, final IESO settlement, eligibility decision, or curtailment instruction is claimed."',
        'GA/ICI 5CP decision-support note',
        'data_offered',
        'Buyer offered a redacted interval-load sample for peak-window review.',
        'Ontario peak-risk planning question',
        'redacted interval load for candidate peak windows',
        'energy manager reviewer',
        'none',
        'create intake packet and request redacted retained extract',
        'create_intake_packet',
        'No direct identifiers retained in the repo log.',
      ].join(','),
      '',
    ].join('\n'), 'utf8');

    const result = await runNodeScript(readinessScriptPath, ['--root', root]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Production outreach response logs: 1');
    expect(result.stdout).toContain('Actionable outreach rows: 1');
    expect(result.stdout).toContain('Batchable intake-packet outreach rows: 1');
    expect(result.stdout).toContain('batchable intake-packet rows: 1');
    expect(result.stdout).toContain(`Batch packet command: corepack pnpm run create:outreach-intake-packets -- --log-file ${logPath} --output-dir /tmp/ceip-outreach-intake-packets`);
    expect(result.stdout).toContain('Action plan: available');
    expect(result.stdout).toContain('Action plan excerpt:');
    expect(result.stdout).toContain('CEIP Outreach Intake Action Plan');
    expect(result.stdout).toContain('corepack pnpm run create:pilot-evidence-intake-packet');
    expect(result.stdout).toContain('Use the outreach action plan excerpt above');
    expect(result.stdout).toContain('Use the batch packet command above for `create_intake_packet` rows');
    expect(result.stdout).toContain('Minimum Phase F 95% Evidence Map');
    expect(result.stdout).toContain('Phase F 95% gate: not ready');
    expect(result.stdout).toContain('Hard 95% Gate Deficit Ledger');
    expect(result.stdout).toContain('Open hard-gate deficits: 10/10');
  });

  it('keeps a header-only production outreach log in collection mode, not evidence-ready mode', async () => {
    const root = makeTempRoot();
    const logPath = path.join(root, 'outreach-response-log.csv');
    writeFileSync(logPath, `${outreachHeader}\n`, 'utf8');

    const result = await runNodeScript(readinessScriptPath, ['--root', root]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Production outreach response logs: 1');
    expect(result.stdout).toContain('Actionable outreach rows: 0');
    expect(result.stdout).toContain('Batchable intake-packet outreach rows: 0');
    expect(result.stdout).toContain('Record real buyer replies in the existing anonymized outreach response log');
    expect(result.stdout).toContain('Keep Phase F blocked until an actionable row creates intake or retained-artifact work');
    expect(result.stdout).not.toContain('A retained-evidence register passed the hard gate');
  });

  it('runs the retained-artifact 95% gate when an evidence root is supplied', async () => {
    const root = makeTempRoot();
    const packetDir = path.join(root, 'pilot-intake');
    const createResult = await runNodeScript(intakePacketScriptPath, [
      '--route',
      '/utility-demand-forecast',
      '--output-dir',
      packetDir,
      '--record-date',
      '2026-01-15',
    ]);
    expect(createResult.status).toBe(0);

    const result = await runNodeScript(readinessScriptPath, [
      '--root',
      packetDir,
      '--evidence-root',
      path.join(packetDir, 'redacted-artifacts'),
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Production pilot evidence registers: 1');
    expect(result.stdout).toContain('Base validation: pass');
    expect(result.stdout).toContain('95% retained-evidence gate: fail');
    expect(result.stdout).toContain('Hard 95% Gate Deficit Ledger');
    expect(result.stdout).toContain('| Utility forecast lane | 0 accepted diagnostic row(s) | >=1 buyer-supplied accepted utility forecast row with full diagnostics | blocked |');
    expect(result.stdout).toContain('| Retained-artifact 95% validation | 0 passing register(s) | validate:pilot-evidence --require-95 passes with --evidence-root | blocked |');
    expect(result.stdout).toContain('95% confidence gate requires accepted buyer-supplied utility demand forecast evidence');
  });

  it('ignores template and fixture paths while scanning', async () => {
    const root = makeTempRoot();
    const templatesDir = path.join(root, 'templates');
    mkdirSync(templatesDir, { recursive: true });
    writeFileSync(path.join(templatesDir, 'OUTREACH_RESPONSE_LOG_TEMPLATE.csv'), [
      outreachHeader,
      'YYYY-MM-DD,linkedin,utility_consultant_001,utility,utility_forecast_planning_pack,/utility-demand-forecast,4.5,ufp_consultant,"No production utility onboarding is claimed.",forecast planning memo,sent_no_reply,pending,pending,anonymized load history,utility planning reviewer,none,wait for reply,none,placeholder',
      '',
    ].join('\n'), 'utf8');

    const result = await runNodeScript(readinessScriptPath, ['--root', root]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('CSV files scanned: 0');
    expect(result.stdout).toContain('Production outreach response logs: 0');
  });

  it('does not ask operators to run the retained-artifact gate before starter rows become confidence-moving', async () => {
    const root = makeTempRoot();
    const packetDir = path.join(root, 'pilot-intake');
    const createResult = await runNodeScript(intakePacketScriptPath, [
      '--route',
      '/utility-demand-forecast',
      '--output-dir',
      packetDir,
      '--record-date',
      '2026-01-15',
    ]);
    expect(createResult.status).toBe(0);

    const result = await runNodeScript(readinessScriptPath, ['--root', packetDir]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Production pilot evidence registers: 1');
    expect(result.stdout).toContain('Confidence-moving register rows: 0');
    expect(result.stdout).toContain('Hard 95% Gate Deficit Ledger');
    expect(result.stdout).toContain('Open hard-gate deficits: 10/10');
    expect(result.stdout).toContain('Replace starter rows with real buyer-supplied, accepted, confidence-moving evidence');
    expect(result.stdout).toContain('Keep `confidence_delta=0` until buyer evidence includes reviewer acceptance');
    expect(result.stdout).not.toContain('Re-run with `--evidence-root path/to/redacted-artifacts` to test the retained-artifact 95% gate.');
  });
});
