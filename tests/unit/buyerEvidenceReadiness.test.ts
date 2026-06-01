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
    expect(result.stdout).toContain('Minimum Phase F 95% Evidence Map');
    expect(result.stdout).toContain('/utility-demand-forecast (utility_forecast_planning_pack)');
    expect(result.stdout).toContain('/roi-calculator (tier_cfo_savings_pack) or /credit-banking (tier_credit_banking_audit_pack)');
    expect(result.stdout).toContain('/shadow-billing (shadow_billing_invoice_pack) or /utility-security (utility_security_procurement_pack)');
    expect(result.stdout).toContain('At least three distinct accepted buyer-supplied proof_pack_id values');
    expect(result.stdout).toContain('pnpm run create:phase-f-minimum-intake-bundle -- --output-dir /tmp/ceip-phase-f-minimum-intake');
    expect(result.stdout).toContain('Default bundle routes: /utility-demand-forecast (utility_forecast_planning_pack), /roi-calculator (tier_cfo_savings_pack), /utility-security (utility_security_procurement_pack).');
    expect(result.stdout).not.toContain('pnpm run create:pilot-evidence-intake-packet -- --route /utility-security --output-dir /tmp/ceip-phase-f-utility-security');
    expect(result.stdout).toContain('Fill a non-template anonymized outreach response log');
    expect(result.stdout).toContain('Generate the minimum Phase F starter bundle');
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
    expect(result.stdout).toContain('Action plan: available');
    expect(result.stdout).toContain('Action plan excerpt:');
    expect(result.stdout).toContain('CEIP Outreach Intake Action Plan');
    expect(result.stdout).toContain('pnpm run create:pilot-evidence-intake-packet');
    expect(result.stdout).toContain('Use the outreach action plan excerpt above');
    expect(result.stdout).toContain('Minimum Phase F 95% Evidence Map');
    expect(result.stdout).toContain('Phase F 95% gate: not ready');
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
    expect(result.stdout).toContain('Replace starter rows with real buyer-supplied, accepted, confidence-moving evidence');
    expect(result.stdout).toContain('Keep `confidence_delta=0` until buyer evidence includes reviewer acceptance');
    expect(result.stdout).not.toContain('Re-run with `--evidence-root path/to/redacted-artifacts` to test the retained-artifact 95% gate.');
  });
});
