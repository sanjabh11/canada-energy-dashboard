import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/validate-pilot-evidence-register.mjs');

function runValidator(
  fixtureName: string,
  extraArgs: string[] = [],
  envOverrides: NodeJS.ProcessEnv = {},
) {
  return spawnSync(process.execPath, [
    scriptPath,
    path.join('tests/fixtures/pilot-evidence', fixtureName),
    ...extraArgs,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      ...envOverrides,
    },
  });
}

describe('pilot evidence register validator', () => {
  it('accepts buyer-supplied evidence with accepted reviewer feedback', () => {
    const result = runValidator('valid-buyer-evidence-register.csv');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Pilot evidence register validation passed');
    expect(result.stderr).toBe('');
  });

  it('accepts Consultant/API evidence against the API docs route', () => {
    const result = runValidator('valid-api-evidence-register.csv');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Pilot evidence register validation passed');
    expect(result.stderr).toBe('');
  });

  it('accepts a filled register that satisfies the 95% strategy confidence gate', () => {
    const result = runValidator(
      'valid-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95', '--evidence-root', 'tests/fixtures/pilot-evidence/artifacts'],
      { CEIP_ALLOW_FIXTURE_95_FOR_TESTS: '1' },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Pilot evidence register validation passed');
    expect(result.stderr).toBe('');
  });

  it('rejects 95% confidence when local evidence hash verification is not supplied', () => {
    const result = runValidator(
      'valid-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95'],
      { CEIP_ALLOW_FIXTURE_95_FOR_TESTS: '1' },
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires --evidence-root');
  });

  it('rejects the fixture 95% override unless the test-only environment gate is explicit', () => {
    const result = runValidator('valid-95-evidence-register.csv', ['--require-95', '--allow-fixture-95'], {
      CEIP_ALLOW_FIXTURE_95_FOR_TESTS: '',
    });
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('--allow-fixture-95 is test-only and requires CEIP_ALLOW_FIXTURE_95_FOR_TESTS=1');
  });

  it('rejects fixture registers as 95% market-confidence proof unless test override is explicit', () => {
    const result = runValidator('valid-95-evidence-register.csv', ['--require-95']);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate cannot be satisfied by fixture, template, or sample registers');
    expect(output).toContain('--allow-fixture-95');
  });

  it('rejects 95% confidence when accepted evidence is too narrow', () => {
    const result = runValidator('valid-buyer-evidence-register.csv', ['--require-95']);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires accepted buyer-supplied TIER CFO or credit-banking evidence');
    expect(output).toContain('95% confidence gate requires at least three distinct accepted buyer-supplied proof_pack_id values');
  });

  it('rejects 95% confidence when accepted rows reuse the same evidence hash', () => {
    const result = runValidator(
      'invalid-duplicate-hash-95-evidence-register.csv',
      ['--require-95', '--allow-fixture-95'],
      { CEIP_ALLOW_FIXTURE_95_FOR_TESTS: '1' },
    );
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires each accepted confidence-moving row to reference a distinct SHA-256 evidence artifact');
  });

  it('rejects public sample evidence that tries to increase market confidence', () => {
    const result = runValidator('invalid-public-confidence-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('confidence_delta above 0 requires buyer_supplied_anonymized or buyer_supplied_confidential source_label');
    expect(output).toContain('public_system_sample cannot increase market confidence');
  });

  it('rejects high confidence movement before reviewer acceptance', () => {
    const result = runValidator('invalid-reviewer-confidence-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('confidence_delta above 0.2 requires reviewer_acceptance to be accepted, approved, or signed');
  });

  it('rejects negated reviewer status phrases that contain accepted or complete words', () => {
    const result = runValidator('invalid-negated-reviewer-status-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('reviewer_acceptance to be accepted, approved, or signed');
    expect(output).toContain('reviewer_feedback_status to be complete, accepted, approved, or signed');
  });

  it('rejects future-dated evidence rows', () => {
    const result = runValidator('invalid-future-date-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('record_date cannot be in the future');
  });

  it('rejects confidence movement without a reviewer role', () => {
    const result = runValidator('invalid-missing-reviewer-role-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('reviewer_role is required for confidence-moving evidence');
  });

  it('rejects direct identifier columns even when the header uses display casing', () => {
    const result = runValidator('invalid-direct-identifier-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('Forbidden direct-identifier column present: Customer Name');
    expect(output).toContain('Forbidden direct-identifier column present: Phone Number');
  });

  it('rejects negated PII screen phrases that contain screened words', () => {
    const result = runValidator('invalid-negated-pii-screen-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('pii_screen_result must exactly be no personal data');
  });

  it('rejects ambiguous source labels even when they do not move confidence', () => {
    const result = runValidator('invalid-unknown-source-label-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('source_label must be one of');
  });

  it('rejects arbitrary proof pack IDs even when the route is valid', () => {
    const result = runValidator('invalid-proof-pack-id-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('proof_pack_id arbitrary-proof-pack is not valid for route /utility-demand-forecast');
    expect(output).toContain('utility_forecast_planning_pack');
  });

  it('rejects confidence-moving forecast rows without full benchmark diagnostics', () => {
    const result = runValidator('invalid-weak-forecast-diagnostic-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('confidence-moving forecast evidence must include MAE, MAPE, RMSE, persistence, and seasonal-naive diagnostics');
  });

  it('rejects confidence-moving TIER rows without route-specific diagnostic evidence', () => {
    const result = runValidator('invalid-weak-tier-diagnostic-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('confidence-moving evidence for /roi-calculator must include pricing source, direct-investment sensitivity, and compliance diagnostic evidence');
  });

  it('rejects confidence movement from pilot readiness gate rows', () => {
    const result = runValidator('invalid-pilot-readiness-confidence-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('/pilot-readiness is an evidence gate only and cannot increase market confidence directly');
  });

  it('rejects confidence-moving rows without immutable evidence hashes', () => {
    const result = runValidator('invalid-unhashed-evidence-reference-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('confidence-moving evidence_file_reference must include sha256=<64 hex chars> or sha256:<64 hex chars>');
  });

  it('rejects confidence-moving rows with weak claim boundaries', () => {
    const result = runValidator('invalid-weak-claim-boundary-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('confidence-moving claim_boundary must state');
    expect(output).toContain('confidence-moving do_not_claim for /utility-demand-forecast must include');
  });

  it('accepts confidence-moving local evidence when the referenced artifact hash matches', () => {
    const result = runValidator('valid-local-hash-evidence-register.csv', [
      '--evidence-root',
      'tests/fixtures/pilot-evidence/artifacts',
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Pilot evidence register validation passed');
    expect(result.stderr).toBe('');
  });

  it('rejects confidence-moving local evidence when the referenced artifact hash does not match', () => {
    const result = runValidator('invalid-local-hash-evidence-register.csv', [
      '--evidence-root',
      'tests/fixtures/pilot-evidence/artifacts',
    ]);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('evidence_file_reference sha256 does not match local artifact local-redacted-load.csv');
  });
});
