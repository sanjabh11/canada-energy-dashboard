import { describe, expect, it } from 'vitest';
import {
  buildProductValueProof,
  buildProductValueSampleCsv,
  PRODUCT_VALUE_SAMPLE_LABEL,
  productValueProofJson,
} from '../../src/lib/productValueProof';

describe('product-value proof workflow', () => {
  it('builds a browser-local sample proof without retaining raw CSV values', () => {
    const proof = buildProductValueProof({
      csvText: buildProductValueSampleCsv(),
      sourceLabel: PRODUCT_VALUE_SAMPLE_LABEL,
      generatedAt: '2026-11-27T00:00:00.000Z',
    });

    expect(proof.parsed.errors).toEqual([]);
    expect(proof.forecastPackage).not.toBeNull();
    expect(proof.descriptor?.title).toContain('Ontario');
    expect(proof.report.retained_raw_values).toBe(false);
    expect(proof.checks.find((check) => check.id === 'privacy')?.status).toBe('pass');
    expect(productValueProofJson(proof)).not.toContain('FDR-');
    expect(productValueProofJson(proof)).toContain('reviewer_acceptance_checklist');
  });

  it('blocks the forecast package for an invalid CSV while preserving screening output', () => {
    const proof = buildProductValueProof({
      csvText: 'email,formula\nowner@example.com,=SUM(A1:A2)\n',
      sourceLabel: 'Uploaded CSV (browser-only)',
      generatedAt: '2026-11-27T00:00:00.000Z',
    });

    expect(proof.forecastPackage).toBeNull();
    expect(proof.checks.find((check) => check.id === 'schema')?.status).toBe('blocked');
    expect(proof.report.direct_identifier_findings.length).toBeGreaterThan(0);
    expect(proof.report.spreadsheet_formula_findings.length).toBeGreaterThan(0);
    expect(productValueProofJson(proof)).not.toContain('owner@example.com');
  });
});
