import { describe, expect, it } from 'vitest';
import {
  buildByoCsvProofReport,
  buildByoCsvRetainedEvidenceExtract,
  byoCsvProofReportToMarkdown,
} from '../../src/lib/byoCsvProofGenerator';

describe('byoCsvProofGenerator', () => {
  it('profiles a BYO CSV without retaining raw values', () => {
    const csv = [
      'timestamp,feeder_id,demand_mw,temperature_c',
      '2026-01-01T00:00:00.000Z,FDR-1,12.5,-6',
      '2026-01-01T01:00:00.000Z,FDR-1,13.1,-7',
    ].join('\n');

    const report = buildByoCsvProofReport({
      csvText: csv,
      sourceLabel: 'buyer-redacted-load.csv',
      route: '/utility-demand-forecast',
      generatedAt: '2026-05-31T00:00:00.000Z',
    });
    const markdown = byoCsvProofReportToMarkdown(report);

    expect(report.version).toBe('byo-csv-proof-generator-v1');
    expect(report.row_count).toBe(2);
    expect(report.column_count).toBe(4);
    expect(report.retained_raw_values).toBe(false);
    expect(report.direct_identifier_findings).toEqual([]);
    expect(report.confidence_gate_ready).toBe(true);
    expect(report.column_profiles.find((profile) => profile.column === 'demand_mw')?.inferred_type).toBe('numeric');
    expect(markdown).toContain('Retained raw values: no');
    expect(markdown).toContain('BYO-CSV proof records schema');
  });

  it('flags direct identifiers and blocks confidence-gate readiness', () => {
    const csv = [
      'timestamp,account_id,email,demand_mw',
      '2026-01-01T00:00:00.000Z,account id: ABCD-1234,ops@example.com,12.5',
    ].join('\n');

    const report = buildByoCsvProofReport({
      csvText: csv,
      sourceLabel: 'raw-customer-load.csv',
      route: '/utility-demand-forecast',
    });

    expect(report.confidence_gate_ready).toBe(false);
    expect(report.direct_identifier_findings.map((finding) => finding.column)).toEqual(['account_id', 'email']);
    expect(report.do_not_claim).toContain('PII-free certification');
  });

  it('builds a hashable retained extract without raw CSV values', () => {
    const csv = [
      'timestamp,feeder_id,demand_mw,temperature_c',
      '2026-01-01T00:00:00.000Z,FDR-1,12.5,-6',
      '2026-01-01T01:00:00.000Z,FDR-1,13.1,-7',
    ].join('\n');
    const report = buildByoCsvProofReport({
      csvText: csv,
      sourceLabel: 'buyer_supplied_anonymized',
      route: '/byo-csv-proof',
      generatedAt: '2026-05-31T00:00:00.000Z',
    });

    const extract = buildByoCsvRetainedEvidenceExtract(report, {
      recordDate: '2026-05-31',
      buyerDataCoveragePct: 88,
      timeToArtifactHours: 12,
      reviewerRole: 'utility privacy reviewer',
      reviewerAcceptance: 'accepted',
      reviewerFeedbackStatus: 'complete',
      day14Decision: 'proceed',
      commercialCommitmentStatus: 'letter_of_intent',
    });

    expect(extract).toContain('proof_pack_id: byo_csv_privacy_proof_pack');
    expect(extract).toContain('schema column_count: 4');
    expect(extract).toContain('completeness row_count: 2');
    expect(extract).toContain('direct identifier findings: 0');
    expect(extract).toContain('retained raw values: no');
    expect(extract).toContain('confidence gate ready: yes');
    expect(extract).not.toContain('12.5');
    expect(extract).not.toContain('FDR-1');
  });
});
