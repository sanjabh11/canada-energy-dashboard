import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const prepScriptPath = path.join(process.cwd(), 'scripts/prepare-pilot-evidence-artifact.mjs');
const byoCsvPrepScriptPath = path.join(process.cwd(), 'scripts/byo-csv-proof-artifact.ts');
const forecastTrustPrepScriptPath = path.join(process.cwd(), 'scripts/forecast-trust-report-artifact.ts');
const gaIciPrepScriptPath = path.join(process.cwd(), 'scripts/ga-ici-5cp-artifact.ts');
const tsxBinPath = path.join(process.cwd(), 'node_modules/.bin/tsx');
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

function runTsxScript(scriptPath: string, args: string[]) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(tsxBinPath, [scriptPath, ...args], {
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
    '--commercial-commitment-evidence', 'paid pilot evidence retained in redacted commercial appendix',
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
    expect(artifactText).toContain('commercial_commitment_evidence: paid pilot evidence retained in redacted commercial appendix');

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

  it('rejects strong commercial commitment status without redacted evidence text', async () => {
    const evidenceRoot = makeTempRoot();
    const result = await runNodeScript(prepScriptPath, buildValidPrepArgs(evidenceRoot, 'missing-commercial-evidence.md').filter((arg, index, args) => (
      arg !== '--commercial-commitment-evidence' && args[index - 1] !== '--commercial-commitment-evidence'
    )));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--commercial-commitment-evidence is required when --commercial-commitment-status is paid_pilot');
    expect(() => readFileSync(path.join(evidenceRoot, 'missing-commercial-evidence.md'), 'utf8')).toThrow();
  });

  it('requires proof pack metadata to match the shared route registry before writing', async () => {
    const evidenceRoot = makeTempRoot();
    const result = await runNodeScript(prepScriptPath, [
      ...buildValidPrepArgs(evidenceRoot, 'mismatched-proof-pack.md').filter((arg, index, args) => (
        arg !== '--proof-pack-id' && args[index - 1] !== '--proof-pack-id'
      )),
      '--proof-pack-id',
      'tier_cfo_savings_pack',
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--proof-pack-id tier_cfo_savings_pack is not valid for --route /utility-demand-forecast');
    expect(result.stderr).toContain('utility_forecast_planning_pack');
    expect(() => readFileSync(path.join(evidenceRoot, 'mismatched-proof-pack.md'), 'utf8')).toThrow();
  });

  it('requires explicit proof pack metadata for retained artifact generation', async () => {
    const evidenceRoot = makeTempRoot();
    const result = await runNodeScript(prepScriptPath, buildValidPrepArgs(evidenceRoot, 'missing-proof-pack.md').filter((arg, index, args) => (
      arg !== '--proof-pack-id' && args[index - 1] !== '--proof-pack-id'
    )));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing required option: --proof-pack-id');
    expect(result.stderr).not.toContain('not valid for --route /utility-demand-forecast');
    expect(() => readFileSync(path.join(evidenceRoot, 'missing-proof-pack.md'), 'utf8')).toThrow();
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

  it('rejects artifact writes that would follow a symlink outside the evidence root', async () => {
    const evidenceRoot = makeTempRoot();
    const outsideRoot = makeTempRoot();
    const outsideArtifactPath = path.join(outsideRoot, 'outside-artifact.md');
    writeFileSync(outsideArtifactPath, 'original outside artifact', 'utf8');
    symlinkSync(outsideArtifactPath, path.join(evidenceRoot, 'escape.md'));

    const result = await runNodeScript(prepScriptPath, [
      ...buildValidPrepArgs(evidenceRoot, 'escape.md'),
      '--force',
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--artifact-file resolves outside --evidence-root; symlink escapes are not allowed');
    expect(readFileSync(outsideArtifactPath, 'utf8')).toBe('original outside artifact');
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
      '--commercial-commitment-evidence', 'design partner signed agreement evidence retained in redacted commercial appendix',
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

  it('prepares a BYO-CSV retained extract, hash reference, and validator-compatible row', async () => {
    const evidenceRoot = makeTempRoot();
    const csvPath = path.join(evidenceRoot, 'redacted-byo.csv');
    writeFileSync(csvPath, [
      'timestamp,feeder_id,demand_mw,temperature_c',
      '2026-01-01T00:00:00.000Z,FDR-1,12.5,-6',
      '2026-01-01T01:00:00.000Z,FDR-1,13.1,-7',
    ].join('\n'), 'utf8');

    const prepResult = await runTsxScript(byoCsvPrepScriptPath, [
      '--csv-file', csvPath,
      '--evidence-root', evidenceRoot,
      '--artifact-file', 'byo-csv-retained.md',
      '--record-date', '2026-05-30',
      '--buyer-data-coverage-pct', '88',
      '--time-to-artifact-hours', '12',
      '--reviewer-role', 'utility privacy reviewer',
      '--reviewer-acceptance', 'accepted',
      '--reviewer-feedback-status', 'complete',
      '--day-14-decision', 'proceed',
      '--commercial-commitment-status', 'letter_of_intent',
      '--commercial-commitment-evidence', 'letter of intent evidence retained in redacted commercial appendix',
    ]);

    expect(prepResult.status).toBe(0);
    expect(prepResult.stderr).toBe('');
    expect(prepResult.stdout).toContain('BYO-CSV proof artifact prepared.');
    expect(prepResult.stdout).toContain('evidence_file_reference: byo-csv-retained.md#sha256=');

    const artifactPath = path.join(evidenceRoot, 'byo-csv-retained.md');
    const artifactText = readFileSync(artifactPath, 'utf8');
    const sha256 = createHash('sha256').update(artifactText).digest('hex');
    expect(prepResult.stdout).toContain(`byo-csv-retained.md#sha256=${sha256}`);
    expect(artifactText).toContain('schema column_count: 4');
    expect(artifactText).toContain('spreadsheet formula findings: 0');
    expect(artifactText).toContain('quasi-identifier warnings: 2');
    expect(artifactText).toContain('retained raw values: no');
    expect(artifactText).toContain('commercial_commitment_evidence: letter of intent evidence retained in redacted commercial appendix');
    expect(artifactText).not.toContain('12.5');

    const registerPath = path.join(evidenceRoot, 'register.csv');
    writeFileSync(registerPath, [
      registerHeader,
      [
        '2026-05-30',
        'security',
        'utility privacy reviewer',
        'byo_csv_privacy_proof_pack',
        '/byo-csv-proof',
        'CEIP pilot owner',
        'redacted CSV schema extract',
        'buyer_supplied_anonymized',
        `byo-csv-retained.md#sha256=${sha256}`,
        'no personal data or meter identifiers found',
        'letter_of_intent',
        'BYO CSV retained evidence extract',
        '12',
        '88',
        '"Schema column_count 4; completeness row_count 2; direct-identifier screen 0 findings; spreadsheet formula screen 0 findings; retained raw values no; quasi-identifier linkage warnings 2; confidence gate ready yes"',
        'utility privacy reviewer',
        'complete',
        'accepted',
        'Buyer supplied redacted CSV workflow only and no raw values retained',
        '"Do not claim PII-free certification, no privacy risk, buyer acceptance, or production connector approval"',
        'proceed',
        '0.2',
        'Schedule privacy intake review',
        'Accepted bounded BYO CSV proof evidence',
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

  it('rejects BYO-CSV retained extract preparation when spreadsheet formula risk is present', async () => {
    const evidenceRoot = makeTempRoot();
    const csvPath = path.join(evidenceRoot, 'formula-risk-byo.csv');
    writeFileSync(csvPath, [
      'timestamp,feeder_id,review_note,demand_mw',
      '2026-01-01T00:00:00.000Z,FDR-1,=SUM(1+1),12.5',
    ].join('\n'), 'utf8');

    const prepResult = await runTsxScript(byoCsvPrepScriptPath, [
      '--csv-file', csvPath,
      '--evidence-root', evidenceRoot,
      '--artifact-file', 'byo-csv-retained.md',
      '--record-date', '2026-05-30',
      '--buyer-data-coverage-pct', '88',
      '--time-to-artifact-hours', '12',
      '--reviewer-role', 'utility privacy reviewer',
      '--reviewer-acceptance', 'accepted',
      '--reviewer-feedback-status', 'complete',
      '--day-14-decision', 'proceed',
      '--commercial-commitment-status', 'letter_of_intent',
      '--commercial-commitment-evidence', 'letter of intent evidence retained in redacted commercial appendix',
    ]);

    expect(prepResult.status).toBe(1);
    expect(prepResult.stderr).toContain('Spreadsheet formula risk was detected');
    expect(prepResult.stderr).toContain('review_note');
    expect(() => readFileSync(path.join(evidenceRoot, 'byo-csv-retained.md'), 'utf8')).toThrow();
  });

  it('prepares a forecast trust retained extract from benchmark pack JSON and stays validator-compatible', async () => {
    const evidenceRoot = makeTempRoot();
    const packPath = path.join(evidenceRoot, 'forecast-benchmark-pack.json');
    writeFileSync(packPath, JSON.stringify({
      version: 'utility-multi-dataset-benchmark-v2',
      generated_at: '2026-05-30T00:00:00.000Z',
      dataset_count: 1,
      buyer_specific_accuracy_claim: false,
      confidence_boundary: 'Buyer-specific accuracy remains blocked until accepted buyer data and reviewer evidence are attached.',
      methodology_references: [
        { label: 'Hyndman and Koehler forecast accuracy measures', url: 'https://robjhyndman.com/publications/another-look-at-measures-of-forecast-accuracy/', use: 'scale-free diagnostics' },
      ],
      datasets: [{
        dataset_id: 'buyer-redacted-load-history',
        label: 'Buyer redacted load history',
        jurisdiction: 'Ontario',
        source_scope: 'buyer_supplied_anonymized',
        source_kind: 'uploaded_historical',
        manifest_id: 'buyer-redacted-load-manifest',
        manifest_hash: 'abc123',
        sample_size: 96,
        metrics: {
          mae: 12.4,
          mape: 3.8,
          rmse: 18.6,
          persistence_mae: 21.3,
          seasonal_naive_mae: 19.9,
          skill_score_vs_persistence: 41.8,
          skill_score_vs_seasonal: 37.7,
          sample_size: 96,
        },
        rolling_origin_split_count: 4,
        conformal_interval_coverage_pct: 91.2,
        conformal_interval_width_mw: 44.8,
        scientific_diagnostics: {
          seasonal_mase: 0.74,
          best_naive_scaled_mae: 0.62,
          scale_free_skill_score_pct: 37.7,
          interval_nominal_coverage_pct: 90,
          interval_calibration_gap_pct: 1.2,
          interval_width_to_mae_ratio: 3.61,
          adjudication: 'beats_best_naive',
          notes: ['Buyer benchmark passes the strongest naive challenger on this retained split.'],
        },
        champion_challenger: {
          champion: 'transparent_trend_seasonal',
          challenger: 'seasonal_naive',
          decision_reason: 'Transparent trend-seasonal model is the current champion because its holdout MAE is no worse than the strongest naive challenger.',
        },
        benchmark_failure_notes: [],
        warnings: ['Buyer-specific outbound claims still require reviewer acceptance.'],
        buyer_specific_accuracy_claim: false,
      }],
      aggregate: {
        mean_model_mae: 12.4,
        mean_persistence_mae: 21.3,
        mean_seasonal_naive_mae: 19.9,
        mean_seasonal_mase: 0.74,
        mean_best_naive_scaled_mae: 0.62,
        datasets_beating_best_naive: 1,
        baseline_win_count: 0,
        datasets_with_three_splits: 1,
        minimum_interval_coverage_pct: 91.2,
        maximum_interval_calibration_gap_pct: 1.2,
      },
    }, null, 2), 'utf8');

    const prepResult = await runTsxScript(forecastTrustPrepScriptPath, [
      '--benchmark-pack-file', packPath,
      '--evidence-root', evidenceRoot,
      '--artifact-file', 'forecast-trust-retained.md',
      '--record-date', '2026-05-30',
      '--buyer-data-coverage-pct', '90',
      '--time-to-artifact-hours', '24',
      '--reviewer-role', 'utility planning reviewer',
      '--reviewer-acceptance', 'accepted',
      '--reviewer-feedback-status', 'complete',
      '--day-14-decision', 'proceed',
      '--commercial-commitment-status', 'paid_pilot',
      '--commercial-commitment-evidence', 'paid pilot evidence retained in redacted commercial appendix',
    ]);

    expect(prepResult.status).toBe(0);
    expect(prepResult.stderr).toBe('');
    expect(prepResult.stdout).toContain('Forecast trust report artifact prepared.');
    expect(prepResult.stdout).toContain('evidence_file_reference: forecast-trust-retained.md#sha256=');

    const artifactPath = path.join(evidenceRoot, 'forecast-trust-retained.md');
    const artifactText = readFileSync(artifactPath, 'utf8');
    const sha256 = createHash('sha256').update(artifactText).digest('hex');
    expect(prepResult.stdout).toContain(`forecast-trust-retained.md#sha256=${sha256}`);
    expect(artifactText).toContain('MAE 12.4 MW');
    expect(artifactText).toContain('MAPE 3.8%');
    expect(artifactText).toContain('RMSE 18.6 MW');
    expect(artifactText).toContain('persistence MAE 21.3 MW');
    expect(artifactText).toContain('seasonal-naive MAE 19.9 MW');
    expect(artifactText).toContain('rolling-origin split count 4');
    expect(artifactText).toContain('interval coverage 91.2%');
    expect(artifactText).toContain('champion/challenger decision');
    expect(artifactText).toContain('commercial_commitment_status: paid_pilot');
    expect(artifactText).toContain('commercial_commitment_evidence: paid pilot evidence retained in redacted commercial appendix');

    const registerPath = path.join(evidenceRoot, 'register.csv');
    writeFileSync(registerPath, [
      registerHeader,
      [
        '2026-05-30',
        'utility',
        'LDC consultant',
        'forecast_benchmark_provenance',
        '/forecast-benchmarking',
        'CEIP pilot owner',
        'anonymized hourly load',
        'buyer_supplied_anonymized',
        `forecast-trust-retained.md#sha256=${sha256}`,
        'redacted',
        'paid_pilot',
        'forecast trust retained evidence extract',
        '24',
        '90',
        '"MAE 12.4 MW; MAPE 3.8%; RMSE 18.6 MW; persistence MAE 21.3 MW; seasonal-naive MAE 19.9 MW; rolling-origin split count 4; interval coverage 91.2%; CEIP champion vs seasonal-naive challenger"',
        'utility planning reviewer',
        'complete',
        'accepted',
        'Buyer supplied redacted forecast benchmarking workflow only; no production onboarding or buyer-specific accuracy claim',
        '"Do not claim guaranteed accuracy, forecast superiority, production utility approval, live telemetry, or control-room readiness"',
        'proceed',
        '0.3',
        'Schedule paid utility pilot review',
        'Accepted forecast trust report evidence',
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

  it('prepares a GA/ICI retained extract, hash reference, and validator-compatible row', async () => {
    const evidenceRoot = makeTempRoot();
    const peakTrackerPath = path.join(evidenceRoot, 'ieso-peak-tracker.md');
    const historicalActualsPath = path.join(evidenceRoot, 'ieso-top-five-actuals.csv');
    const customerLoadPath = path.join(evidenceRoot, 'redacted-load.csv');
    writeFileSync(peakTrackerPath, [
      'Rank  | Date  | Hour Ending (EST)  | ICI Ontario Demand* (MW)  | Coincident Adjusted AQEW (MWh)  | Status* (Initial, Prelim, Final)',
      '--- | --- | --- | --- | --- | ---',
      '1 | 19 May 2026 | 17 | 20,820 | 20,553 | Initial',
      '2 | 26 May 2026 | 19 | 19,109 | | ',
      '3 | 18 May 2026 | 18 | 18,889 | 18,199 | Final',
      '4 | 25 May 2026 | 19 | 17,561 | | ',
      '5 | 05 May 2026 | 17 | 17,033 | 16,468 | Prelim',
    ].join('\n'), 'utf8');
    writeFileSync(historicalActualsPath, [
      'base_period_start,base_period_end,timestamp,ontario_demand_mw,status,source_url',
      '2025-05-01,2026-04-30,2025-07-01T18:00:00.000Z,50000,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2025.xml',
      '2025-05-01,2026-04-30,2025-07-02T18:00:00.000Z,49000,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2025.xml',
      '2025-05-01,2026-04-30,2025-07-03T18:00:00.000Z,48000,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2025.xml',
      '2025-05-01,2026-04-30,2025-07-04T18:00:00.000Z,47000,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2025.xml',
      '2025-05-01,2026-04-30,2025-07-05T18:00:00.000Z,46000,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2025.xml',
      '2026-05-01,2027-04-30,2026-05-19T17:00:00.000Z,20820,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2026.xml',
      '2026-05-01,2027-04-30,2026-05-26T19:00:00.000Z,19109,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2026.xml',
      '2026-05-01,2027-04-30,2026-05-18T18:00:00.000Z,18889,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2026.xml',
      '2026-05-01,2027-04-30,2026-05-25T19:00:00.000Z,17561,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2026.xml',
      '2026-05-01,2027-04-30,2026-05-05T17:00:00.000Z,17033,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2026.xml',
      '2027-05-01,2028-04-30,2027-07-01T18:00:00.000Z,51000,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2027.xml',
      '2027-05-01,2028-04-30,2027-07-02T18:00:00.000Z,50000,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2027.xml',
      '2027-05-01,2028-04-30,2027-07-03T18:00:00.000Z,49000,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2027.xml',
      '2027-05-01,2028-04-30,2027-07-04T18:00:00.000Z,48000,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2027.xml',
      '2027-05-01,2028-04-30,2027-07-05T18:00:00.000Z,47000,final,https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2027.xml',
    ].join('\n'), 'utf8');
    writeFileSync(customerLoadPath, [
      'timestamp,load_mw',
      '2026-05-19T17:00:00.000Z,8',
      '2026-05-26T19:00:00.000Z,7.8',
      '2026-05-18T18:00:00.000Z,7.6',
      '2026-05-25T19:00:00.000Z,7.4',
      '2026-05-05T17:00:00.000Z,7.2',
    ].join('\n'), 'utf8');

    const prepResult = await runTsxScript(gaIciPrepScriptPath, [
      '--peak-tracker-file', peakTrackerPath,
      '--historical-actuals-file', historicalActualsPath,
      '--customer-load-file', customerLoadPath,
      '--evidence-root', evidenceRoot,
      '--artifact-file', 'ga-ici-retained.md',
      '--base-period-start', '2026-05-01',
      '--base-period-end', '2027-04-30',
      '--record-date', '2026-05-30',
      '--buyer-data-coverage-pct', '84',
      '--time-to-artifact-hours', '18',
      '--reviewer-role', 'utility planning reviewer',
      '--reviewer-acceptance', 'accepted',
      '--reviewer-feedback-status', 'complete',
      '--day-14-decision', 'proceed',
      '--commercial-commitment-status', 'letter_of_intent',
      '--commercial-commitment-evidence', 'letter of intent evidence retained in redacted commercial appendix',
    ]);

    expect(prepResult.status).toBe(0);
    expect(prepResult.stderr).toBe('');
    expect(prepResult.stdout).toContain('GA/ICI 5CP proof artifact prepared.');
    expect(prepResult.stdout).toContain('evidence_file_reference: ga-ici-retained.md#sha256=');
    expect(prepResult.stdout).toContain('historical_backtest_watchlist_capture_rate: 1');

    const artifactPath = path.join(evidenceRoot, 'ga-ici-retained.md');
    const artifactText = readFileSync(artifactPath, 'utf8');
    const sha256 = createHash('sha256').update(artifactText).digest('hex');
    expect(prepResult.stdout).toContain(`ga-ici-retained.md#sha256=${sha256}`);
    expect(artifactText).toContain('top five 5CP coincident peak windows: 5');
    expect(artifactText).toContain('peak demand factor PDF estimate:');
    expect(artifactText).toContain('IESO peak tracker source: https://www.ieso.ca/peaktracker');
    expect(artifactText).toContain('decision-support settlement boundary:');
    expect(artifactText).toContain('Historical Backtest Summary');
    expect(artifactText).toContain('watchlist capture rate: 1');
    expect(artifactText).toContain('backtest claim boundary:');
    expect(artifactText).toContain('https://reports-public.ieso.ca/public/ICIPeakTracker/PUB_ICIPeakTracker_2026.xml');
    expect(artifactText).not.toContain('PUB_ICIPeakTracker_2025.xml');
    expect(artifactText).not.toContain('PUB_ICIPeakTracker_2027.xml');
    expect(artifactText).toContain('commercial_commitment_evidence: letter of intent evidence retained in redacted commercial appendix');
    expect(artifactText).not.toMatch(/guaranteed savings/i);

    const registerPath = path.join(evidenceRoot, 'register.csv');
    writeFileSync(registerPath, [
      registerHeader,
      [
        '2026-05-30',
        'utility',
        'Ontario Class A advisor',
        'ga_ici_5cp_decision_support_pack',
        '/ga-ici-5cp',
        'CEIP pilot owner',
        'redacted Ontario interval load',
        'buyer_supplied_anonymized',
        `ga-ici-retained.md#sha256=${sha256}`,
        'redacted',
        'letter_of_intent',
        '5CP decision-support retained extract',
        '18',
        '84',
        '"Top five 5CP coincident peak windows mapped; peak demand factor PDF estimate 0.000352; IESO peak tracker source attached; decision-support settlement boundary accepted"',
        'utility planning reviewer',
        'complete',
        'accepted',
        'Buyer supplied redacted planning support only and decision support workflow only',
        '"Do not claim guaranteed savings, final IESO settlement result, eligibility determination, or operational curtailment instruction"',
        'proceed',
        '0.2',
        'Schedule peak-window review',
        'Accepted bounded GA ICI decision-support evidence',
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

  it('rejects GA/ICI direct identifier columns before writing retained artifacts', async () => {
    const evidenceRoot = makeTempRoot();
    const systemPeaksPath = path.join(evidenceRoot, 'ieso-peaks.csv');
    const customerLoadPath = path.join(evidenceRoot, 'identified-load.csv');
    writeFileSync(systemPeaksPath, [
      'timestamp,ontario_demand_mw,status,source',
      '2026-07-01T18:00:00.000Z,22000,candidate,https://www.ieso.ca/peaktracker',
      '2026-07-02T18:00:00.000Z,21750,candidate,https://www.ieso.ca/peaktracker',
      '2026-07-03T18:00:00.000Z,21500,candidate,https://www.ieso.ca/peaktracker',
      '2026-07-04T18:00:00.000Z,21250,forecast,https://www.ieso.ca/peaktracker',
      '2026-07-05T18:00:00.000Z,21000,forecast,https://www.ieso.ca/peaktracker',
    ].join('\n'), 'utf8');
    writeFileSync(customerLoadPath, [
      'timestamp,load_mw,meter_id',
      '2026-07-01T18:00:00.000Z,8,MTR-001',
    ].join('\n'), 'utf8');

    const result = await runTsxScript(gaIciPrepScriptPath, [
      '--system-peaks-file', systemPeaksPath,
      '--customer-load-file', customerLoadPath,
      '--evidence-root', evidenceRoot,
      '--artifact-file', 'identified-ga-ici.md',
      '--base-period-start', '2026-05-01',
      '--base-period-end', '2027-04-30',
      '--record-date', '2026-05-30',
      '--buyer-data-coverage-pct', '84',
      '--time-to-artifact-hours', '18',
      '--reviewer-role', 'utility planning reviewer',
      '--reviewer-acceptance', 'accepted',
      '--reviewer-feedback-status', 'complete',
      '--day-14-decision', 'proceed',
      '--commercial-commitment-status', 'letter_of_intent',
      '--commercial-commitment-evidence', 'letter of intent evidence retained in redacted commercial appendix',
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('direct identifier column "meter_id"');
    expect(() => readFileSync(path.join(evidenceRoot, 'identified-ga-ici.md'), 'utf8')).toThrow();
  });
});
