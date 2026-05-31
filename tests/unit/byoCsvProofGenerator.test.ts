import { describe, expect, it } from 'vitest';
import {
  buildByoCsvProofReport,
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
});
