import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildRetainedArtifactReference,
  computeRetainedArtifactHash,
  detectRetainedArtifactWarnings,
  normalizeRetainedArtifactFileName,
} from '../../src/lib/retainedArtifactHash';
import { previewRetainedArtifactSupport } from '../../src/lib/retainedArtifactSupportPreview';

function nodeSha256Digest(bytes: Uint8Array): Promise<ArrayBuffer> {
  const digest = createHash('sha256').update(bytes).digest();
  return Promise.resolve(digest.buffer.slice(digest.byteOffset, digest.byteOffset + digest.byteLength) as ArrayBuffer);
}

describe('retainedArtifactHash', () => {
  it('computes a SHA-256 reference from the exact retained text bytes', async () => {
    const text = 'record_date: 2026-06-02\nsource_label: buyer_supplied_anonymized';
    const result = await computeRetainedArtifactHash({
      fileName: 'folder/redacted utility forecast retained.md',
      text,
      digest: nodeSha256Digest,
    });

    const expectedHash = createHash('sha256').update(new TextEncoder().encode(text)).digest('hex');

    expect(result.fileName).toBe('redacted_utility_forecast_retained.md');
    expect(result.sha256).toBe(expectedHash);
    expect(result.reference).toBe(`redacted_utility_forecast_retained.md#sha256=${expectedHash}`);
    expect(result.byteLength).toBe(new TextEncoder().encode(text).byteLength);
    expect(result.lineCount).toBe(2);
    expect(result.warnings).toEqual([]);
  });

  it('normalizes unsafe file names and supplies a text extension', () => {
    expect(normalizeRetainedArtifactFileName('../unsafe retained artifact')).toBe('unsafe_retained_artifact.md');
    expect(normalizeRetainedArtifactFileName('')).toBe('retained-artifact.md');
  });

  it('rejects empty retained artifact text and malformed references', async () => {
    await expect(computeRetainedArtifactHash({
      fileName: 'retained.md',
      text: '  \n  ',
      digest: nodeSha256Digest,
    })).rejects.toThrow(/redacted retained artifact/i);

    expect(() => buildRetainedArtifactReference('retained.md', 'abc')).toThrow(/64 lowercase hexadecimal/i);
  });

  it('warns on non-text artifacts, identifier wording, and spreadsheet formula-like retained text', () => {
    const warnings = detectRetainedArtifactWarnings(
      'raw-export.xlsx',
      'field,value\naccount_number,redacted\nformula,=HYPERLINK("https://example.test")',
    );

    expect(warnings.join(' ')).toMatch(/text-inspectable/);
    expect(warnings.join(' ')).toMatch(/identifier/);
    expect(warnings.join(' ')).toMatch(/spreadsheet formula/);
  });

  it('preflights a retained utility forecast artifact against 95% support fields and route diagnostics', () => {
    const reference = buildRetainedArtifactReference('redacted-paid-pilot.md', 'a'.repeat(64));
    const preview = previewRetainedArtifactSupport({
      fileName: 'redacted-paid-pilot.md',
      route: '/utility-demand-forecast',
      proofPackId: 'utility_forecast_planning_pack',
      artifactReference: reference,
      text: [
        'record_date: 2026-06-02',
        'route: /utility-demand-forecast',
        'proof_pack_id: utility_forecast_planning_pack',
        'source_label: buyer_supplied_anonymized',
        'pii_screen_result: redacted',
        'buyer_data_coverage_pct: 90',
        'time_to_artifact_hours: 36',
        'reviewer_role: utility planning reviewer',
        'reviewer_acceptance: accepted',
        'reviewer_feedback_status: complete',
        'day_14_decision: proceed',
        'commercial_commitment_status: paid_pilot',
        'commercial_commitment_evidence: paid pilot invoice paid retained redacted evidence',
        'claim_boundary: Buyer-supplied redacted planning support only.',
        'do_not_claim: Do not claim utility approval or live telemetry.',
        '## Diagnostic Summary',
        '- MAE 12.4 MW; MAPE 3.8%; RMSE 18.6 MW; persistence MAE 21.3 MW; seasonal-naive MAE 19.9 MW; rolling-origin split count 4; interval coverage 91.2%; CEIP champion vs seasonal-naive challenger.',
      ].join('\n'),
    });

    expect(preview.status).toBe('pass');
    expect(preview.supportChecks.every((check) => check.status === 'pass')).toBe(true);
    expect(preview.diagnosticChecks.every((check) => check.status === 'pass')).toBe(true);
    expect(preview.evidenceReference).toBe(`utility-demand-forecast/${reference}`);
    expect(preview.updateCommand).toContain(`--evidence-file-reference utility-demand-forecast/${reference}`);
    expect(preview.updateCommand).toContain('--confidence-delta "<explicit 0..0.4, or 0 for staging>"');
  });

  it('blocks thin retained artifacts before they are copied into a register update command', () => {
    const preview = previewRetainedArtifactSupport({
      fileName: 'thin-tier.md',
      route: '/roi-calculator',
      proofPackId: 'tier_cfo_savings_pack',
      text: [
        'record_date: 2026-06-02',
        'route: /roi-calculator',
        'proof_pack_id: wrong_pack',
        'source_label: buyer_supplied_anonymized',
        'commercial_commitment_status: none',
        'diagnostic: pricing only',
      ].join('\n'),
    });

    expect(preview.status).toBe('blocked');
    expect(preview.supportChecks.find((check) => check.id === 'proof-pack')?.status).toBe('blocked');
    expect(preview.supportChecks.find((check) => check.id === 'commercial-commitment')?.status).toBe('warning');
    expect(preview.supportChecks.find((check) => check.id === 'sha-reference')?.status).toBe('warning');
    expect(preview.diagnosticChecks.find((check) => check.id === 'diagnostic-direct-investment')?.status).toBe('blocked');
    expect(preview.diagnosticChecks.find((check) => check.id === 'diagnostic-compliance')?.status).toBe('blocked');
  });
});
