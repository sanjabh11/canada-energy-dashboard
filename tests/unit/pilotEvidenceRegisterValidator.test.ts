import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/validate-pilot-evidence-register.mjs');

function runValidator(fixtureName: string, extraArgs: string[] = []) {
  return spawnSync(process.execPath, [
    scriptPath,
    path.join('tests/fixtures/pilot-evidence', fixtureName),
    ...extraArgs,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
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
    const result = runValidator('valid-95-evidence-register.csv', ['--require-95']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Pilot evidence register validation passed');
    expect(result.stderr).toBe('');
  });

  it('rejects 95% confidence when accepted evidence is too narrow', () => {
    const result = runValidator('valid-buyer-evidence-register.csv', ['--require-95']);
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('95% confidence gate requires accepted buyer-supplied TIER CFO or credit-banking evidence');
    expect(output).toContain('95% confidence gate requires at least three distinct accepted buyer-supplied proof_pack_id values');
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
    expect(output).toContain('confidence_delta above 0.2 requires accepted/approved/signed reviewer_acceptance');
  });

  it('rejects direct identifier columns even when the header uses display casing', () => {
    const result = runValidator('invalid-direct-identifier-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('Forbidden direct-identifier column present: Customer Name');
    expect(output).toContain('Forbidden direct-identifier column present: Phone Number');
  });

  it('rejects ambiguous source labels even when they do not move confidence', () => {
    const result = runValidator('invalid-unknown-source-label-register.csv');
    const output = `${result.stderr}\n${result.stdout}`;

    expect(result.status).toBe(1);
    expect(output).toContain('source_label must be one of');
  });
});
