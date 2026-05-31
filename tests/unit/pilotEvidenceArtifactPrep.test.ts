import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const prepScriptPath = path.join(process.cwd(), 'scripts/prepare-pilot-evidence-artifact.mjs');
const validatorScriptPath = path.join(process.cwd(), 'scripts/validate-pilot-evidence-register.mjs');
const registerHeader = 'record_date,buyer_lane,buyer_segment,proof_pack_id,route,evidence_owner,input_data_type,source_label,evidence_file_reference,pii_screen_result,commercial_commitment_status,artifact_generated,time_to_artifact_hours,buyer_data_coverage_pct,benchmark_lift_or_diagnostic,reviewer_role,reviewer_feedback_status,reviewer_acceptance,claim_boundary,do_not_claim,day_14_decision,confidence_delta,follow_up_action,notes';
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-pilot-evidence-'));
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

function buildValidPrepArgs(evidenceRoot: string, artifactFile = 'redacted-utility.md') {
  return [
    '--evidence-root', evidenceRoot,
    '--artifact-file', artifactFile,
    '--route', '/utility-demand-forecast',
    '--proof-pack-id', 'utility_forecast_planning_pack',
    '--record-date', '2026-05-30',
    '--pii-screen-result', 'redacted',
    '--buyer-data-coverage-pct', '90',
    '--time-to-artifact-hours', '36',
    '--reviewer-role', 'utility planning reviewer',
    '--reviewer-acceptance', 'accepted',
    '--reviewer-feedback-status', 'complete',
    '--day-14-decision', 'proceed',
    '--commercial-commitment-status', 'paid_pilot',
    '--claim-boundary', 'Buyer supplied redacted planning support only and no production onboarding claim.',
    '--do-not-claim', 'Do not claim utility approval or live telemetry.',
    '--diagnostic', 'MAE 12.4 MW; MAPE 3.8%; RMSE 18.6 MW; persistence MAE 21.3 MW; seasonal-naive MAE 19.9 MW; rolling-origin split count 4; interval coverage 91.2%; CEIP champion vs seasonal-naive challenger.',
  ];
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('pilot evidence artifact preparation CLI', () => {
  it('writes a redacted extract, prints a SHA-256 register reference, and stays validator-compatible', async () => {
    const evidenceRoot = makeTempRoot();
    const prepResult = await runNodeScript(prepScriptPath, buildValidPrepArgs(evidenceRoot));

    expect(prepResult.status).toBe(0);
    expect(prepResult.stderr).toBe('');
    expect(prepResult.stdout).toContain('Pilot evidence artifact prepared.');
    expect(prepResult.stdout).toContain(`Evidence root: ${evidenceRoot}`);
    expect(prepResult.stdout).toContain('evidence_file_reference: redacted-utility.md#sha256=');

    const artifactPath = path.join(evidenceRoot, 'redacted-utility.md');
    const artifactText = readFileSync(artifactPath, 'utf8');
    const sha256 = createHash('sha256').update(artifactText).digest('hex');
    expect(prepResult.stdout).toContain(`redacted-utility.md#sha256=${sha256}`);
    expect(artifactText).toContain('record_date: 2026-05-30');
    expect(artifactText).toContain('pii_screen_result: redacted');
    expect(artifactText).toContain('buyer_data_coverage_pct: 90');
    expect(artifactText).toContain('reviewer_acceptance: accepted');

    const registerPath = path.join(evidenceRoot, 'register.csv');
    writeFileSync(registerPath, [
      registerHeader,
      [
        '2026-05-30',
        'utility',
        'LDC consultant',
        'utility_forecast_planning_pack',
        '/utility-demand-forecast',
        'CEIP pilot owner',
        'anonymized hourly load',
        'buyer_supplied_anonymized',
        `redacted-utility.md#sha256=${sha256}`,
        'redacted',
        'paid_pilot',
        'forecast planning pack',
        '36',
        '90',
        '"MAE 12.4 MW; MAPE 3.8%; RMSE 18.6 MW; persistence MAE 21.3 MW; seasonal-naive MAE 19.9 MW; rolling-origin split count 4; interval coverage 91.2%; CEIP champion vs seasonal-naive challenger"',
        'utility planning reviewer',
        'complete',
        'accepted',
        'Buyer supplied data only and no production onboarding claim',
        'Do not claim utility approval or live telemetry',
        'proceed',
        '0.3',
        'Schedule paid utility pilot review',
        'Accepted anonymized buyer forecast evidence',
      ].join(','),
      '',
    ].join('\n'), 'utf8');

    const validationResult = await runNodeScript(validatorScriptPath, [
      registerPath,
      '--evidence-root',
      evidenceRoot,
    ]);

    expect(validationResult.status).toBe(0);
    expect(validationResult.stdout).toContain('Pilot evidence register validation passed');
    expect(validationResult.stderr).toBe('');
  });

  it('rejects direct identifiers before writing the retained artifact', async () => {
    const evidenceRoot = makeTempRoot();
    const result = await runNodeScript(prepScriptPath, [
      ...buildValidPrepArgs(evidenceRoot, 'identifier-leak.md'),
      '--diagnostic',
      'Reviewer asked follow-up by email jane@example.com.',
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('appears to contain email address');
    expect(() => readFileSync(path.join(evidenceRoot, 'identifier-leak.md'), 'utf8')).toThrow();
  });

  it('rejects route diagnostics that would be too thin for retained evidence validation', async () => {
    const evidenceRoot = makeTempRoot();
    const result = await runNodeScript(prepScriptPath, [
      '--evidence-root', evidenceRoot,
      '--artifact-file', 'thin.md',
      '--route', '/roi-calculator',
      '--record-date', '2026-05-30',
      '--pii-screen-result', 'redacted',
      '--buyer-data-coverage-pct', '82',
      '--time-to-artifact-hours', '42',
      '--reviewer-role', 'industrial compliance reviewer',
      '--reviewer-acceptance', 'accepted',
      '--reviewer-feedback-status', 'complete',
      '--day-14-decision', 'proceed',
      '--commercial-commitment-status', 'design_partner_signed',
      '--claim-boundary', 'Planning support only and no legal tax or trading advice.',
      '--do-not-claim', 'Do not claim guaranteed savings or live market price.',
      '--diagnostic', 'Buyer liked the memo.',
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('must include pricing source, direct-investment sensitivity, and compliance diagnostic evidence');
  });

  it('rejects forecast diagnostics that name metrics without numeric evidence', async () => {
    const evidenceRoot = makeTempRoot();
    const result = await runNodeScript(prepScriptPath, [
      ...buildValidPrepArgs(evidenceRoot, 'nonnumeric.md').filter((arg, index, args) => (
        arg !== '--diagnostic' && args[index - 1] !== '--diagnostic'
      )),
      '--diagnostic',
      'MAE, MAPE, RMSE recorded; persistence and seasonal-naive compared; rolling-origin split record, interval coverage, and champion/challenger note attached.',
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('must include numeric forecast evidence');
    expect(result.stderr).toContain('numeric MAE value');
    expect(() => readFileSync(path.join(evidenceRoot, 'nonnumeric.md'), 'utf8')).toThrow();
  });
});
