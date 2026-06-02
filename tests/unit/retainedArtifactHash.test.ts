import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildRetainedArtifactReference,
  computeRetainedArtifactHash,
  detectRetainedArtifactWarnings,
  normalizeRetainedArtifactFileName,
} from '../../src/lib/retainedArtifactHash';

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
});
