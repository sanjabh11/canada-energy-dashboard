import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parsePilotEvidenceCsv,
  previewPilotEvidenceRegister,
} from '../../src/lib/pilotEvidenceRegisterPreview';

const repoRoot = process.cwd();

describe('pilotEvidenceRegisterPreview', () => {
  it('previews the valid 95% fixture as passing every browser-visible hard gate', () => {
    const fixture = readFileSync(path.join(repoRoot, 'tests/fixtures/pilot-evidence/valid-95-evidence-register.csv'), 'utf8');
    const preview = previewPilotEvidenceRegister(fixture);

    expect(preview.rowCount).toBe(3);
    expect(preview.missingRequiredColumns).toEqual([]);
    expect(preview.forbiddenColumnsFound).toEqual([]);
    expect(preview.acceptedConfidenceRowCount).toBe(3);
    expect(preview.distinctAcceptedProofPackCount).toBe(3);
    expect(preview.totalAcceptedConfidenceDelta).toBeCloseTo(0.9);
    expect(preview.gates.map((gate) => [gate.id, gate.status])).toEqual([
      ['required-schema', 'pass'],
      ['utility-forecast-evidence', 'pass'],
      ['tier-or-credit-evidence', 'pass'],
      ['billing-or-security-evidence', 'pass'],
      ['three-proof-packs', 'pass'],
      ['coverage-and-delta', 'pass'],
      ['fast-artifact-loop', 'pass'],
      ['retained-artifact-hashes', 'pass'],
      ['commercial-signal', 'pass'],
    ]);
    expect(preview.cliCommand).toContain('--require-95');
  });

  it('parses quoted CSV fields with commas and escaped quotes', () => {
    const parsed = parsePilotEvidenceCsv('record_date,notes\n2026-06-02,"Quoted, ""accepted"" note"\n');

    expect(parsed.headers).toEqual(['record_date', 'notes']);
    expect(parsed.rows).toEqual([
      { record_date: '2026-06-02', notes: 'Quoted, "accepted" note' },
    ]);
  });

  it('fails closed for missing required columns and sensitive headers', () => {
    const preview = previewPilotEvidenceRegister([
      'record_date,proof_pack_id,route,account_number',
      '2026-06-02,utility_forecast_planning_pack,/utility-demand-forecast,1234',
    ].join('\n'));

    expect(preview.missingRequiredColumns).toContain('buyer_lane');
    expect(preview.forbiddenColumnsFound).toContain('account_number');
    expect(preview.acceptedConfidenceRowCount).toBe(0);
    expect(preview.gates.find((gate) => gate.id === 'required-schema')?.status).toBe('blocked');
    expect(preview.gates.filter((gate) => gate.status === 'blocked').length).toBeGreaterThan(1);
  });

  it('flags route/proof-pack mismatches without treating the preview as final validation', () => {
    const fixture = readFileSync(path.join(repoRoot, 'tests/fixtures/pilot-evidence/valid-95-evidence-register.csv'), 'utf8')
      .replace('tier_cfo_savings_pack,/roi-calculator', 'shadow_billing_invoice_pack,/roi-calculator');
    const preview = previewPilotEvidenceRegister(fixture);

    expect(preview.warnings.join(' ')).toMatch(/route\/proof_pack_id mismatches/);
  });
});
