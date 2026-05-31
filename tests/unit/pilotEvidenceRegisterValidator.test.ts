import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/validate-pilot-evidence-register.mjs');
vi.setConfig({ testTimeout: 15_000 });
const tempRoots: string[] = [];

const fixture95Env = {
  CEIP_ALLOW_FIXTURE_95_FOR_TESTS: '1',
  CEIP_PILOT_EVIDENCE_TODAY_FOR_TESTS: '2026-05-30',
};

async function runValidator(
  fixtureName: string,
  extraArgs: string[] = [],
  envOverrides: NodeJS.ProcessEnv = {},
) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [
      scriptPath,
      path.join('tests/fixtures/pilot-evidence', fixtureName),
      ...extraArgs,
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...envOverrides,
      },
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

async function runValidatorAtPath(
  registerPath: string,
  extraArgs: string[] = [],
  envOverrides: NodeJS.ProcessEnv = {},
) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [
      scriptPath,
      registerPath,
      ...extraArgs,
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...envOverrides,
      },
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

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-pilot-validator-'));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('pilot evidence register validator', () => {
  it('accepts buyer-supplied evidence with accepted reviewer feedback', async () => {
    const result = await runValidator('valid-buyer-evidence-register.csv');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Pilot evidence register validation passed');
    expect(result.stderr).toBe('');
  });

  it('accepts Consultant/API evidence against the API docs route', async () => {
    const result = await runValidator('valid-api-evidence-register.csv');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Pilot evidence register validation passed');
    expect(result.stderr).toBe('');
  });

  it('accepts bounded GA/ICI and BYO-CSV evidence rows against their routes', async () => {
    const result = await runValidator('valid-ga-ici-byo-evidence-register.csv');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Pilot evidence register validation passed');
    expect(result.stderr).toBe('');
  });

  it('accepts a filled register that satisfies the 95% market-confidence gate', async () => {
    const result = await runValidator(
      'valid-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'],
      fixture95Env,
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Pilot evidence register validation passed');
    expect(result.stderr).toBe('');
  });

  it('prints a 95% evidence readiness report when the gate passes', async () => {
    const result = await runValidator(
      'valid-95-evidence-register.csv',
      ['--require-95', '--report-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'],
      fixture95Env,
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('95% Evidence Readiness Report');
    expect(result.stdout).toContain('PASS Utility forecast proof pack');
    expect(result.stdout).toContain('PASS TIER CFO or credit-banking proof pack');
    expect(result.stdout).toContain('Total accepted confidence_delta: 0.9');
    expect(result.stdout).toContain('Pilot evidence register validation passed');
    expect(result.stderr).toBe('');
  });

  it('prints a 95% evidence readiness report when the gate fails on missing buyer evidence dimensions', async () => {
    const result = await runValidator('valid-buyer-evidence-register.csv', ['--require-95', '--report-95']);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('95% Evidence Readiness Report');
    expect(result.stdout).toContain('FAIL TIER CFO or credit-banking proof pack');
    expect(result.stdout).toContain('Next action: Add accepted buyer-supplied /roi-calculator or /credit-banking evidence.');
    expect(output).toContain('95% confidence gate requires accepted buyer-supplied TIER CFO or credit-banking evidence');
  });

  it('rejects 95% confidence when local evidence hash verification is not supplied', async () => {
    const result = await runValidator(
      'valid-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95'],
      fixture95Env,
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires --evidence-root');
  });

  it('rejects the fixture 95% override unless the test-only environment gate is explicit', async () => {
    const result = await runValidator('valid-95-evidence-register.csv', ['--require-95', '--allow-fixture-95'], {
      CEIP_ALLOW_FIXTURE_95_FOR_TESTS: '',
    });
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('--allow-fixture-95 is test-only and requires CEIP_ALLOW_FIXTURE_95_FOR_TESTS=1');
  });

  it('rejects fixture registers as 95% market-confidence proof unless test override is explicit', async () => {
    const result = await runValidator('valid-95-evidence-register.csv', ['--require-95']);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate cannot be satisfied by fixture, template, or sample registers');
    expect(output).toContain('--allow-fixture-95');
  });

  it('rejects the test-only date override outside the fixture 95% gate', async () => {
    const result = await runValidator('valid-buyer-evidence-register.csv', [], {
      CEIP_PILOT_EVIDENCE_TODAY_FOR_TESTS: '2026-05-30',
    });
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('CEIP_PILOT_EVIDENCE_TODAY_FOR_TESTS is test-only');
  });

  it('rejects 95% confidence when accepted evidence is too narrow', async () => {
    const result = await runValidator('valid-buyer-evidence-register.csv', ['--require-95']);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires accepted buyer-supplied TIER CFO or credit-banking evidence');
    expect(output).toContain('95% confidence gate requires at least three distinct accepted buyer-supplied proof_pack_id values');
  });

  it('rejects 95% confidence when accepted rows reuse the same evidence hash', async () => {
    const result = await runValidator(
      'invalid-duplicate-hash-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95'],
      fixture95Env,
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires each accepted confidence-moving row to reference a distinct SHA-256 evidence artifact');
  });

  it('rejects 95% confidence without a commercial commitment signal', async () => {
    const result = await runValidator(
      'invalid-no-commercial-commitment-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'],
      fixture95Env,
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires at least one accepted buyer-supplied row with commercial_commitment_status');
  });

  it('rejects 95% confidence when the retained artifact does not support a strong commercial commitment', async () => {
    const result = await runValidator(
      'invalid-unsupported-commercial-commitment-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'],
      fixture95Env,
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires retained local evidence artifacts to support each strong commercial_commitment_status');
    expect(output).toContain('unsupported rows: 2');
  });

  it('rejects 95% confidence when accepted artifacts do not prove fast pilot turnaround', async () => {
    const result = await runValidator(
      'invalid-slow-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'],
      fixture95Env,
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires every accepted confidence-moving row to record time_to_artifact_hours <= 120');
    expect(output).toContain('95% confidence gate requires at least one accepted buyer proof pack delivered in 48 hours or less');
  });

  it('rejects 95% confidence when accepted buyer evidence is older than 12 months', async () => {
    const result = await runValidator(
      'invalid-stale-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'],
      fixture95Env,
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires accepted confidence-moving buyer evidence to be no older than 365 days');
    expect(output).toContain('stale rows: 2, 3, 4');
  });

  it('rejects 95% confidence when retained artifacts do not support the record date', async () => {
    const result = await runValidator(
      'invalid-unsupported-record-date-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'],
      fixture95Env,
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires retained local evidence artifacts to support record_date');
    expect(output).toContain('unsupported rows: 2');
  });

  it('rejects 95% confidence when retained artifacts do not support the privacy screen result', async () => {
    const result = await runValidator(
      'invalid-unsupported-pii-screen-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'],
      fixture95Env,
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires retained local evidence artifacts to support pii_screen_result');
    expect(output).toContain('unsupported rows: 2');
  });

  it('rejects 95% confidence when retained artifacts do not support buyer data coverage', async () => {
    const result = await runValidator(
      'invalid-unsupported-coverage-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'],
      fixture95Env,
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires retained local evidence artifacts to support buyer_data_coverage_pct');
    expect(output).toContain('unsupported rows: 2');
  });

  it('rejects 95% confidence when retained artifacts do not support time to artifact', async () => {
    const result = await runValidator(
      'invalid-unsupported-time-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'],
      fixture95Env,
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires retained local evidence artifacts to support time_to_artifact_hours');
    expect(output).toContain('unsupported rows: 2');
  });

  it('rejects 95% confidence when retained artifacts do not support reviewer acceptance', async () => {
    const result = await runValidator(
      'invalid-unsupported-reviewer-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'],
      fixture95Env,
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires retained local evidence artifacts to support reviewer_acceptance');
    expect(output).toContain('unsupported rows: 2');
  });

  it('rejects 95% confidence when retained artifacts do not support reviewer feedback status', async () => {
    const result = await runValidator(
      'invalid-unsupported-feedback-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'],
      fixture95Env,
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires retained local evidence artifacts to support reviewer_feedback_status');
    expect(output).toContain('unsupported rows: 2');
  });

  it('rejects 95% confidence when retained artifacts do not support the day-14 proceed decision', async () => {
    const result = await runValidator(
      'invalid-unsupported-day14-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'],
      fixture95Env,
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires retained local evidence artifacts to support day_14_decision=proceed');
    expect(output).toContain('unsupported rows: 2');
  });

  it('rejects public sample evidence that tries to increase market confidence', async () => {
    const result = await runValidator('invalid-public-confidence-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('confidence_delta above 0 requires buyer_supplied_anonymized or buyer_supplied_confidential source_label');
    expect(output).toContain('public_system_sample cannot increase market confidence');
  });

  it('rejects high confidence movement before reviewer acceptance', async () => {
    const result = await runValidator('invalid-reviewer-confidence-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('confidence_delta above 0.2 requires reviewer_acceptance to be accepted, approved, or signed');
  });

  it('rejects negated reviewer status phrases that contain accepted or complete words', async () => {
    const result = await runValidator('invalid-negated-reviewer-status-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('reviewer_acceptance to be accepted, approved, or signed');
    expect(output).toContain('reviewer_feedback_status to be complete, accepted, approved, or signed');
  });

  it('rejects future-dated evidence rows', async () => {
    const result = await runValidator('invalid-future-date-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('record_date cannot be in the future');
  });

  it('rejects confidence movement without a reviewer role', async () => {
    const result = await runValidator('invalid-missing-reviewer-role-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('reviewer_role is required for confidence-moving evidence');
  });

  it('rejects confidence movement when the reviewer role is internal or self-reviewed', async () => {
    const result = await runValidator('invalid-internal-reviewer-role-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('reviewer_role must identify an independent buyer or reviewer function');
    expect(output).toContain('cannot repeat evidence_owner');
  });

  it('rejects direct identifier columns even when the header uses display casing', async () => {
    const result = await runValidator('invalid-direct-identifier-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('Forbidden direct-identifier column present: Customer Name');
    expect(output).toContain('Forbidden direct-identifier column present: Phone Number');
  });

  it('rejects direct identifier values inside retained register rows', async () => {
    const result = await runValidator('invalid-register-direct-identifier-values.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('notes appears to contain an email address');
    expect(output).toContain('keep the pilot evidence register redacted');
  });

  it('rejects negated PII screen phrases that contain screened words', async () => {
    const result = await runValidator('invalid-negated-pii-screen-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('pii_screen_result must exactly be no personal data');
  });

  it('rejects confidence-moving buyer evidence with not applicable privacy screening', async () => {
    const result = await runValidator('invalid-buyer-pii-not-applicable-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('buyer-supplied confidence-moving evidence must have pii_screen_result');
  });

  it('rejects positive overclaims inside pilot evidence rows', async () => {
    const result = await runValidator('invalid-positive-overclaim-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('notes contains a positive cross-repo avalanche prediction claim');
    expect(output).toContain('notes contains a positive world-class or best-of-class claim');
    expect(output).toContain('notes contains a positive certification or sovereignty claim');
    expect(output).toContain('notes contains a positive TIER price, trading, or savings claim');
  });

  it('rejects ambiguous source labels even when they do not move confidence', async () => {
    const result = await runValidator('invalid-unknown-source-label-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('source_label must be one of');
  });

  it('rejects arbitrary proof pack IDs even when the route is valid', async () => {
    const result = await runValidator('invalid-proof-pack-id-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('proof_pack_id arbitrary-proof-pack is not valid for route /utility-demand-forecast');
    expect(output).toContain('utility_forecast_planning_pack');
  });

  it('rejects confidence-moving forecast rows without full benchmark diagnostics', async () => {
    const result = await runValidator('invalid-weak-forecast-diagnostic-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('confidence-moving forecast evidence must include MAE, MAPE, RMSE, persistence, seasonal-naive, rolling-origin, interval coverage, and champion/challenger diagnostics');
  });

  it('rejects confidence-moving forecast rows without numeric benchmark evidence', async () => {
    const result = await runValidator('invalid-nonnumeric-forecast-diagnostic-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('confidence-moving forecast evidence must include numeric forecast evidence');
    expect(output).toContain('numeric MAE value');
    expect(output).toContain('numeric interval coverage percentage');
  });

  it('rejects confidence-moving TIER rows without route-specific diagnostic evidence', async () => {
    const result = await runValidator('invalid-weak-tier-diagnostic-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('confidence-moving evidence for /roi-calculator must include pricing source, direct-investment sensitivity, and compliance diagnostic evidence');
  });

  it('rejects confidence-moving BYO-CSV rows without route-specific diagnostic evidence', async () => {
    const result = await runValidator('invalid-weak-byo-csv-diagnostic-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('confidence-moving evidence for /byo-csv-proof must include schema, completeness, direct-identifier screen, spreadsheet formula screen, retained raw values, quasi-identifier linkage warning, and confidence-gate readiness evidence');
  });

  it('rejects confidence movement from pilot readiness gate rows', async () => {
    const result = await runValidator('invalid-pilot-readiness-confidence-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('/pilot-readiness is an evidence gate only and cannot increase market confidence directly');
  });

  it('rejects confidence-moving rows without immutable evidence hashes', async () => {
    const result = await runValidator('invalid-unhashed-evidence-reference-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('confidence-moving evidence_file_reference must include sha256=<64 hex chars> or sha256:<64 hex chars>');
  });

  it('rejects confidence-moving rows with weak claim boundaries', async () => {
    const result = await runValidator('invalid-weak-claim-boundary-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('confidence-moving claim_boundary must state');
    expect(output).toContain('confidence-moving do_not_claim for /utility-demand-forecast must include');
  });

  it('accepts confidence-moving local evidence when the referenced artifact hash matches', async () => {
    const result = await runValidator('valid-local-hash-evidence-register.csv', [
      '--evidence-root',
      'tests/fixtures/pilot-evidence/artifacts',
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Pilot evidence register validation passed');
    expect(result.stderr).toBe('');
  });

  it('rejects evidence references that resolve outside the evidence root through a symlink', async () => {
    const evidenceRoot = makeTempRoot();
    const outsideRoot = makeTempRoot();
    const outsideArtifactPath = path.join(outsideRoot, 'outside-redacted-load.csv');
    const linkedArtifactPath = path.join(evidenceRoot, 'linked-redacted-load.csv');
    const artifactText = readFileSync(
      path.join(process.cwd(), 'tests/fixtures/pilot-evidence/artifacts/local-redacted-load.csv'),
      'utf8',
    );
    writeFileSync(outsideArtifactPath, artifactText, 'utf8');
    symlinkSync(outsideArtifactPath, linkedArtifactPath);
    const sha256 = createHash('sha256').update(artifactText).digest('hex');
    const registerPath = path.join(evidenceRoot, 'register.csv');
    writeFileSync(registerPath, [
      'record_date,buyer_lane,buyer_segment,proof_pack_id,route,evidence_owner,input_data_type,source_label,evidence_file_reference,pii_screen_result,commercial_commitment_status,artifact_generated,time_to_artifact_hours,buyer_data_coverage_pct,benchmark_lift_or_diagnostic,reviewer_role,reviewer_feedback_status,reviewer_acceptance,claim_boundary,do_not_claim,day_14_decision,confidence_delta,follow_up_action,notes',
      [
        '2026-05-30',
        'utility',
        'LDC consultant',
        'utility_forecast_planning_pack',
        '/utility-demand-forecast',
        'CEIP pilot owner',
        'anonymized hourly load',
        'buyer_supplied_anonymized',
        `linked-redacted-load.csv#sha256=${sha256}`,
        'redacted',
        'none',
        'forecast planning pack',
        '2.5',
        '82',
        'MAE 12.4 MW MAPE 3.8% RMSE 18.6 MW persistence MAE 21.3 MW seasonal-naive MAE 19.9 MW rolling-origin split count 4 interval coverage 91.2% CEIP champion vs seasonal-naive challenger',
        'planning reviewer',
        'complete',
        'accepted',
        'Buyer supplied data only and no production onboarding claim',
        'Do not claim utility approval or live telemetry',
        'proceed',
        '0.3',
        'Schedule paid pilot review',
        'Accepted anonymized buyer evidence with symlink hash reference',
      ].join(','),
      '',
    ].join('\n'), 'utf8');

    const result = await runValidatorAtPath(registerPath, ['--evidence-root', evidenceRoot]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('evidence_file_reference resolves outside --evidence-root; symlink escapes are not allowed');
  });

  it('rejects confidence-moving local evidence when the referenced artifact hash does not match', async () => {
    const result = await runValidator('invalid-local-hash-evidence-register.csv', [
      '--evidence-root',
      'tests/fixtures/pilot-evidence/artifacts',
    ]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('evidence_file_reference sha256 does not match local artifact local-redacted-load.csv');
  });

  it('rejects confidence-moving local evidence artifacts that contain direct identifiers', async () => {
    const result = await runValidator('invalid-local-pii-evidence-register.csv', [
      '--evidence-root',
      'tests/fixtures/pilot-evidence/artifacts',
    ]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('local evidence artifact local-pii-load.csv appears to contain an email address');
  });

  it('rejects retained local evidence artifacts that omit route-specific diagnostics', async () => {
    const result = await runValidator('invalid-artifact-diagnostic-evidence-register.csv', [
      '--evidence-root',
      'tests/fixtures/pilot-evidence/artifacts',
    ]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('local evidence artifact thin-redacted-utility.csv must contain retained route-specific diagnostic evidence');
    expect(output).toContain('local forecast evidence artifact thin-redacted-utility.csv must contain MAE, MAPE, RMSE');
  });

  it('rejects retained forecast artifacts that contain only nonnumeric metric labels', async () => {
    const result = await runValidator('invalid-nonnumeric-artifact-forecast-evidence-register.csv', [
      '--evidence-root',
      'tests/fixtures/pilot-evidence/artifacts',
    ]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('local forecast evidence artifact nonnumeric-redacted-utility.csv must contain numeric forecast evidence');
    expect(output).toContain('numeric persistence baseline value');
    expect(output).toContain('numeric rolling split count');
  });

  it('rejects retained local evidence artifacts that contain positive overclaims', async () => {
    const result = await runValidator('invalid-artifact-overclaim-evidence-register.csv', [
      '--evidence-root',
      'tests/fixtures/pilot-evidence/artifacts',
    ]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('local evidence artifact overclaim-redacted-utility.csv contains a positive production utility or telemetry claim');
  });

  it('rejects opaque retained artifacts that cannot be scanned as redacted text evidence', async () => {
    const result = await runValidator('invalid-opaque-artifact-evidence-register.csv', [
      '--evidence-root',
      'tests/fixtures/pilot-evidence/artifacts',
    ]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('local evidence artifact opaque-retained-invoice.pdf has unsupported retained-artifact extension ".pdf"');
    expect(output).toContain('hash a redacted .txt or .md evidence extract under --evidence-root');
  });
});
