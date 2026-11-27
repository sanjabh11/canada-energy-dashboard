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
    expect(proof.descriptor?.title).toContain('region-neutral');
    expect(proof.parsed.source_unit).toBe('demand_mw');
    expect(proof.benchmarkAppendix).toContain('Input unit provenance');
    expect(proof.benchmarkAppendix).toContain('no Ontario or Alberta measurements');
    expect(proof.forecastCsv).toContain('# Jurisdiction: Region-neutral synthetic demo');
    expect(proof.forecastCsv).toContain('Filing export: not generated');
    expect(proof.report.retained_raw_values).toBe(false);
    expect(proof.checks.find((check) => check.id === 'privacy')?.status).toBe('pass');
    expect(productValueProofJson(proof)).not.toContain('FDR-');
    expect(productValueProofJson(proof)).toContain('reviewer_acceptance_checklist');
    const sidecar = productValueProofJson(proof);
    expect(sidecar).toContain('source_unit');
    expect(sidecar).toContain('Region-neutral synthetic demo');
    expect(sidecar).toContain('no Ontario or Alberta measurements');
  });

  it('carries interval conversion provenance into JSON and the rendered descriptor', () => {
    const proof = buildProductValueProof({
      csvText: [
        'timestamp,usage_kwh',
        '2025-01-01T00:00:00.000Z,15',
        '2025-01-01T00:15:00.000Z,15',
        '2025-01-01T00:30:00.000Z,15',
      ].join('\n'),
      sourceLabel: 'Uploaded CSV (browser-only)',
      generatedAt: '2026-11-27T00:00:00.000Z',
    });

    expect(proof.forecastPackage).not.toBeNull();
    expect(proof.parsed.source_unit).toBe('kwh');
    expect(proof.parsed.inferred_interval_minutes).toBe(15);
    expect(proof.parsed.conversion_method).toBe('kwh_to_average_kw_to_mw');
    expect(productValueProofJson(proof)).toContain('kwh_to_average_kw_to_mw');
    expect(proof.descriptor?.sections.some((section) => section.heading === 'Input unit provenance')).toBe(true);
    expect(proof.benchmarkAppendix).toContain('Inferred interval (minutes): 15');
  });

  it('surfaces ambiguous local-clock timezone warnings without blocking the proof', () => {
    const proof = buildProductValueProof({
      csvText: [
        'timestamp,kwh',
        '2026-07-15 14:00,15',
        '2026-07-15 14:15,15',
      ].join('\n'),
      sourceLabel: 'Uploaded CSV (browser-only)',
      generatedAt: '2026-11-27T00:00:00.000Z',
    });

    expect(proof.forecastPackage).not.toBeNull();
    expect(proof.checks.find((check) => check.id === 'schema')?.status).toBe('review');
    expect(proof.checks.find((check) => check.id === 'schema')?.detail).toContain(
      'timezone_ambiguous',
    );
    expect(proof.benchmarkAppendix).toContain('Warning:');
    expect(productValueProofJson(proof)).toContain('timezone_ambiguous');
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
