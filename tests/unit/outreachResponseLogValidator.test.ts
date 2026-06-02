import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/validate-outreach-response-log.mjs');
const generatorScriptPath = path.join(process.cwd(), 'scripts/create-outreach-response-log.mjs');
const appenderScriptPath = path.join(process.cwd(), 'scripts/append-outreach-response-log-row.mjs');
const templatePath = path.join(process.cwd(), 'docs/growth/templates/OUTREACH_RESPONSE_LOG_TEMPLATE.csv');
const tempRoots: string[] = [];

const header = 'activity_date,channel,target_label,buyer_lane,proof_pack_id,route,rating,variant_id,caveat_used,artifact_promised,reply_status,response_summary,pain_signal,requested_input,reviewer_role,commercial_commitment_status,next_action,pilot_evidence_register_action,notes';

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-outreach-response-log-'));
  tempRoots.push(root);
  return root;
}

function runScript(targetScriptPath: string, args: string[]) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [targetScriptPath, ...args], {
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

function runValidator(args: string[]) {
  return runScript(scriptPath, args);
}

function writeLog(rows: string[]) {
  const root = makeTempRoot();
  const filePath = path.join(root, 'outreach-response-log.csv');
  writeFileSync(filePath, [header, ...rows, ''].join('\n'), 'utf8');
  return filePath;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('outreach response log validator', () => {
  it('appends a validated anonymized response row and derives route identity before writing', async () => {
    const root = makeTempRoot();
    const outputDir = path.join(root, 'outreach-workspace');
    const generator = await runScript(generatorScriptPath, ['--output-dir', outputDir]);
    expect(generator.status).toBe(0);

    const logPath = path.join(outputDir, 'outreach-response-log.csv');
    const result = await runScript(appenderScriptPath, [
      '--log-file',
      logPath,
      '--activity-date',
      '2026-06-01',
      '--channel',
      'linkedin',
      '--target-label',
      'ontario_peak_advisor_001',
      '--route',
      '/ga-ici-5cp',
      '--rating',
      '4.2',
      '--variant-id',
      'ga_ici_5cp',
      '--reply-status',
      'data_offered',
      '--response-summary',
      'Buyer offered a redacted interval-load sample for peak-window review.',
      '--pain-signal',
      'Ontario peak-risk planning question',
      '--requested-input',
      'redacted interval load for candidate peak windows',
      '--reviewer-role',
      'energy manager reviewer',
      '--next-action',
      'create intake packet and request redacted retained extract',
      '--pilot-evidence-register-action',
      'create_intake_packet',
      '--notes',
      'No direct identifiers retained in the repo log.',
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Outreach response log row appended.');
    expect(result.stdout).toContain('Proof pack: ga_ici_5cp_decision_support_pack');
    expect(result.stdout).toContain('Buyer lane: utility');
    expect(result.stdout).toContain('Confidence movement: none');

    const csv = readFileSync(logPath, 'utf8');
    expect(csv).toContain('ga_ici_5cp_decision_support_pack');
    expect(csv).toContain('/ga-ici-5cp');
    expect(csv).toContain('GA/ICI 5CP decision-support pack');
    expect(csv).toContain('Do not claim guaranteed savings, final IESO settlement, eligibility decision, or curtailment instruction.');

    const report = await runValidator([logPath, '--report']);
    expect(report.status).toBe(0);
    expect(report.stdout).toContain('Rows: 1');
    expect(report.stdout).toContain('Rows requiring evidence action: 1');
  });

  it('does not mutate the response log when an appended row fails validation', async () => {
    const root = makeTempRoot();
    const outputDir = path.join(root, 'outreach-workspace');
    const generator = await runScript(generatorScriptPath, ['--output-dir', outputDir]);
    expect(generator.status).toBe(0);

    const logPath = path.join(outputDir, 'outreach-response-log.csv');
    const before = readFileSync(logPath, 'utf8');
    const result = await runScript(appenderScriptPath, [
      '--log-file',
      logPath,
      '--activity-date',
      '2026-06-01',
      '--channel',
      'email',
      '--target-label',
      'jane@example.com',
      '--route',
      '/utility-demand-forecast',
      '--rating',
      '4.5',
      '--variant-id',
      'utility_forecast',
      '--reply-status',
      'interested',
      '--response-summary',
      'Buyer asked for a bounded forecast sample.',
      '--pain-signal',
      'Load growth planning',
      '--requested-input',
      'anonymized load history',
      '--reviewer-role',
      'utility planning reviewer',
      '--next-action',
      'create intake packet',
      '--pilot-evidence-register-action',
      'create_intake_packet',
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('append failed validation; original log was not modified');
    expect(result.stderr).toContain('appears to contain email address');
    expect(readFileSync(logPath, 'utf8')).toBe(before);
  });

  it('rejects unsupported routes before attempting to append', async () => {
    const filePath = writeLog([]);
    const before = readFileSync(filePath, 'utf8');
    const result = await runScript(appenderScriptPath, [
      '--log-file',
      filePath,
      '--activity-date',
      '2026-06-01',
      '--channel',
      'manual',
      '--target-label',
      'unknown_route_001',
      '--route',
      '/not-a-proof-pack',
      '--rating',
      '4.0',
      '--variant-id',
      'unknown',
      '--reply-status',
      'interested',
      '--response-summary',
      'Buyer asked for a bounded sample.',
      '--pain-signal',
      'Planning question',
      '--requested-input',
      'redacted sample',
      '--reviewer-role',
      'reviewer',
      '--next-action',
      'create intake packet',
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Usage:');
    expect(result.stderr).toContain('Unsupported --route /not-a-proof-pack');
    expect(readFileSync(filePath, 'utf8')).toBe(before);
  });

  it('creates a header-only anonymized response log workspace that validates with zero rows', async () => {
    const root = makeTempRoot();
    const outputDir = path.join(root, 'outreach-workspace');
    const result = await runScript(generatorScriptPath, ['--output-dir', outputDir]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Outreach response log starter created.');

    const logPath = path.join(outputDir, 'outreach-response-log.csv');
    const readmePath = path.join(outputDir, 'README.md');
    expect(existsSync(logPath)).toBe(true);
    expect(existsSync(readmePath)).toBe(true);
    expect(readFileSync(logPath, 'utf8')).toBe(`${header}\n`);
    expect(readFileSync(readmePath, 'utf8')).toContain('header-only log must keep confidence movement at zero');

    const report = await runValidator([logPath, '--report']);
    expect(report.status).toBe(0);
    expect(report.stderr).toBe('');
    expect(report.stdout).toContain('Rows: 0');
    expect(report.stdout).toContain('Rows requiring evidence action: 0');
    expect(report.stdout).toContain('Confidence movement: none');

    const actionPlan = await runValidator([logPath, '--action-plan']);
    expect(actionPlan.status).toBe(0);
    expect(actionPlan.stderr).toBe('');
    expect(actionPlan.stdout).toContain('Rows requiring evidence action: 0');
    expect(actionPlan.stdout).toContain('Confidence movement: none');
  });

  it('accepts the checked-in anonymized template with the template flag', async () => {
    const result = await runValidator([templatePath, '--allow-template', '--report']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('CEIP Outreach Response Log Report');
    expect(result.stdout).toContain('Rows: 0');
    expect(result.stdout).toContain('Outreach response log validation passed for 0 row(s)');
  });

  it('accepts an anonymized interested reply that points to the next evidence action', async () => {
    const filePath = writeLog([
      [
        '2026-06-01',
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
    ]);

    const result = await runValidator([filePath, '--report']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Rows requiring evidence action: 1');
    expect(result.stdout).toContain('ga_ici_5cp_decision_support_pack: 1');
    expect(result.stdout).toContain('data_offered: 1');
  });

  it('prints an intake action plan without moving confidence', async () => {
    const filePath = writeLog([
      [
        '2026-06-01',
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
    ]);

    const result = await runValidator([filePath, '--action-plan']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('CEIP Outreach Intake Action Plan');
    expect(result.stdout).toContain('Confidence movement: none');
    expect(result.stdout).toContain('pnpm run create:pilot-evidence-intake-packet -- --route /ga-ici-5cp');
    expect(result.stdout).toContain('starter rows keep confidence_delta=0');
  });

  it('prints a complete retained-artifact preparation command template', async () => {
    const filePath = writeLog([
      [
        '2026-06-01',
        'email',
        'forecast_reviewer_002',
        'utility',
        'forecast_benchmark_provenance',
        '/forecast-benchmarking',
        '4.6',
        'forecast_trust',
        '"No guaranteed accuracy, AI superiority, or production utility onboarding is claimed."',
        'forecast trust report',
        'meeting_booked',
        'Buyer booked a review of a redacted forecast benchmark pack.',
        'Forecast benchmark review',
        'buyer forecast baseline',
        'forecast reviewer',
        'letter_of_intent',
        'prepare retained artifact',
        'prepare_retained_artifact',
        'No direct identifiers retained in the repo log.',
      ].join(','),
    ]);

    const result = await runValidator([filePath, '--action-plan']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('pnpm run prepare:forecast-trust-report-artifact');
    expect(result.stdout).toContain('--benchmark-pack-file');
    expect(result.stdout).toContain('redacted utility forecast benchmark-pack JSON');
    expect(result.stdout).toContain('Fallback generic text-extract helper: pnpm run prepare:pilot-evidence-artifact');
    expect(result.stdout).toContain('--route /forecast-benchmarking');
    expect(result.stdout).toContain('--proof-pack-id forecast_benchmark_provenance');
    for (const requiredFlag of [
      '--pii-screen-result',
      '--buyer-data-coverage-pct',
      '--time-to-artifact-hours',
      '--reviewer-acceptance',
      '--reviewer-feedback-status',
      '--day-14-decision',
      '--commercial-commitment-evidence',
      '--claim-boundary',
      '--do-not-claim',
      '--diagnostic',
    ]) {
      expect(result.stdout).toContain(requiredFlag);
    }
    expect(result.stdout).toContain('<replace with retained letter_of_intent evidence text>');
    expect(result.stdout).toContain('Prefer the specialized helper above');
    expect(result.stdout).toContain('Replace every <...> placeholder');
    expect(result.stdout).toContain('update:pilot-evidence-register-row');
    expect(result.stdout).toContain('do not hand-edit confidence-moving CSV rows');
  });

  it('prints a validated register updater command for update_register rows', async () => {
    const filePath = writeLog([
      [
        '2026-06-01',
        'email',
        'utility_reviewer_003',
        'utility',
        'utility_forecast_planning_pack',
        '/utility-demand-forecast',
        '4.5',
        'utility_forecast',
        '"Buyer-supplied planning support only; no production utility onboarding is claimed."',
        'forecast planning pack',
        'data_offered',
        'Buyer supplied a redacted retained artifact reference for register update.',
        'Load growth planning',
        'redacted load history',
        'utility planning reviewer',
        'paid_pilot',
        'update pilot evidence register with retained artifact',
        'update_register',
        'No direct identifiers retained in the repo log.',
      ].join(','),
    ]);

    const result = await runValidator([filePath, '--action-plan']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('pnpm run update:pilot-evidence-register-row');
    expect(result.stdout).toContain('--register-file path/to/filled-pilot-evidence-register.csv');
    expect(result.stdout).toContain('--evidence-file-reference');
    expect(result.stdout).toContain('<replace with retained-artifact.md#sha256=...>');
    expect(result.stdout).toContain('--confidence-delta');
    expect(result.stdout).toContain('canonical register validator before writing output');
    expect(result.stdout).toContain('path/to/updated-pilot-evidence-register.csv');
  });

  it('prints route-specific retained-artifact helpers for GA/ICI and BYO-CSV rows', async () => {
    const filePath = writeLog([
      [
        '2026-06-01',
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
        'prepare retained artifact',
        'prepare_retained_artifact',
        'No direct identifiers retained in the repo log.',
      ].join(','),
      [
        '2026-06-01',
        'email',
        'privacy_reviewer_001',
        'security',
        'byo_csv_privacy_proof_pack',
        '/byo-csv-proof',
        '4.1',
        'byo_csv_privacy',
        '"No PII-free certification, no privacy risk, buyer acceptance, or production connector approval is claimed."',
        'BYO-CSV privacy proof',
        'data_offered',
        'Buyer offered a redacted CSV sample for local privacy-screen review.',
        'Privacy review before data sharing',
        'redacted CSV sample',
        'privacy reviewer',
        'none',
        'prepare retained artifact',
        'prepare_retained_artifact',
        'No direct identifiers retained in the repo log.',
      ].join(','),
    ]);

    const result = await runValidator([filePath, '--action-plan']);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('pnpm run prepare:ga-ici-5cp-artifact');
    expect(result.stdout).toContain('--historical-actuals-file public/data/ga_ici_5cp_public_historical_actuals.csv');
    expect(result.stdout).toContain('--customer-load-file');
    expect(result.stdout).toContain('redacted Ontario interval load CSV');
    expect(result.stdout).toContain('pnpm run prepare:byo-csv-proof-artifact');
    expect(result.stdout).toContain('--csv-file');
    expect(result.stdout).toContain('redacted local CSV path');
    expect(result.stdout).toContain('Fallback generic text-extract helper: pnpm run prepare:pilot-evidence-artifact');
  });

  it('rejects route/proof-pack mismatches', async () => {
    const filePath = writeLog([
      [
        '2026-06-01',
        'email',
        'tier_reviewer_001',
        'industrial',
        'utility_forecast_planning_pack',
        '/roi-calculator',
        '4.0',
        'tier_cfo',
        '"No guaranteed savings or live market price is claimed."',
        'TIER planning memo',
        'interested',
        'Buyer asked for a bounded TIER scenario.',
        'Compliance cost planning',
        'facility assumptions',
        'industrial compliance reviewer',
        'none',
        'create intake packet',
        'create_intake_packet',
        'Mismatch fixture.',
      ].join(','),
    ]);

    const result = await runValidator([filePath]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('proof_pack_id utility_forecast_planning_pack is not valid for route /roi-calculator');
  });

  it('rejects future-dated outreach rows', async () => {
    const filePath = writeLog([
      [
        '2999-01-01',
        'email',
        'utility_planner_001',
        'utility',
        'utility_forecast_planning_pack',
        '/utility-demand-forecast',
        '4.5',
        'utility_forecast',
        '"No production utility onboarding is claimed."',
        'forecast planning pack',
        'interested',
        'Buyer asked for a bounded forecast sample.',
        'Load growth planning',
        'anonymized load history',
        'utility planning reviewer',
        'none',
        'create intake packet',
        'create_intake_packet',
        'Future row should fail.',
      ].join(','),
    ]);

    const result = await runValidator([filePath]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('activity_date must not be in the future');
  });

  it('rejects direct identifiers and unsafe positive claims in repo-retained response logs', async () => {
    const filePath = writeLog([
      [
        '2026-06-01',
        'linkedin',
        'planner_001',
        'utility',
        'utility_forecast_planning_pack',
        '/utility-demand-forecast',
        '4.5',
        'ufp_consultant',
        '"No production utility onboarding is claimed."',
        'production utility bridge',
        'meeting_booked',
        'Reply from jane@example.com asked for customer LDC history.',
        'Load growth planning',
        'anonymized load history',
        'utility planning reviewer',
        'none',
        'update register',
        'update_register',
        'Unsafe fixture.',
      ].join(','),
    ]);

    const result = await runValidator([filePath]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('appears to contain email address');
    expect(output).toContain('contains a positive production utility or telemetry claim');
  });

  it('rejects commercial commitment replies that do not identify evidence-register follow-up', async () => {
    const filePath = writeLog([
      [
        '2026-06-01',
        'referral',
        'security_procurement_001',
        'security',
        'utility_security_procurement_pack',
        '/utility-security',
        '4.0',
        'security_procurement',
        '"No SOC certification or production approval is claimed."',
        'security procurement evidence matrix',
        'meeting_booked',
        'Buyer asked for procurement review.',
        'Security review before data sharing',
        'redacted security questionnaire',
        'procurement reviewer',
        'letter_of_intent',
        'follow up manually',
        'none',
        'Commercial signal must not be status-only.',
      ].join(','),
    ]);

    const result = await runValidator([filePath]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('commercial commitment replies must set pilot_evidence_register_action');
  });

  it('rejects non-actionable replies that try to create buyer-evidence actions', async () => {
    const filePath = writeLog([
      [
        '2026-06-01',
        'email',
        'utility_planner_002',
        'utility',
        'utility_forecast_planning_pack',
        '/utility-demand-forecast',
        '4.5',
        'utility_forecast',
        '"No production utility onboarding is claimed."',
        'forecast planning pack',
        'sent_no_reply',
        'No reply yet.',
        'Load growth planning',
        'anonymized load history',
        'utility planning reviewer',
        'none',
        'create intake packet',
        'create_intake_packet',
        'No reply cannot create intake action.',
      ].join(','),
    ]);

    const result = await runValidator([filePath]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('sent_no_reply replies cannot set pilot_evidence_register_action');
  });

  it('rejects 95% gate actions without data-offered or commercial-commitment evidence', async () => {
    const filePath = writeLog([
      [
        '2026-06-01',
        'email',
        'forecast_reviewer_001',
        'utility',
        'forecast_benchmark_provenance',
        '/forecast-benchmarking',
        '4.6',
        'forecast_trust',
        '"No guaranteed accuracy or AI superiority is claimed."',
        'forecast trust report',
        'requested_info',
        'Buyer asked for more detail.',
        'Forecast benchmark review',
        'buyer forecast baseline',
        'forecast reviewer',
        'none',
        'run 95 gate',
        'run_95_gate',
        'Too early for 95 gate.',
      ].join(','),
    ]);

    const result = await runValidator([filePath]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('run_95_gate requires reply_status to be data_offered or meeting_booked');
    expect(output).toContain('run_95_gate requires a commercial_commitment_status beyond none');
  });
});

describe('outreach response log template file', () => {
  it('does not include direct identifier columns', () => {
    const headerLine = readFileSync(templatePath, 'utf8').split(/\r?\n/)[0];

    expect(headerLine).toContain('target_label');
    expect(headerLine).not.toContain('email');
    expect(headerLine).not.toContain('phone');
    expect(headerLine).not.toContain('full_name');
  });
});
