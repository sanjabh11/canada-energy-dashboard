import { describe, expect, it } from 'vitest';
import {
  fingerprintUtilityLoadRows,
  isBundledFixtureContent,
  MAX_UTILITY_CSV_BYTES,
  MAX_UTILITY_CSV_DATA_ROWS,
  ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST,
  parseIesoPublicDemandCsv,
  parseUtilityHistoricalLoadCsv,
  UTILITY_CSV_FORMAT_EVIDENCE_LABELS,
} from '../../src/lib/utilityCsvParser';
import {
  buildOntarioPublicUtilitySampleCsv,
  generateOntarioPublicUtilitySampleRows,
} from '../../src/lib/utilitySampleData';
import { utilityRowsToCsv } from '../../src/lib/utilityCsvSerializer';

const IESO_CSV = [
  'Date,Hour,Market Demand,Ontario Demand',
  ...Array.from(
    { length: 48 },
    (_, index) =>
      `2026-01-${String(Math.floor(index / 24) + 5).padStart(2, '0')},${(index % 24) + 1},${19000 + index},${18500 + index}`,
  ),
].join('\n');

describe('utilityCsvParser format evidence', () => {
  it('detects a byte-preserved bundled fixture re-import via deterministic fingerprint', () => {
    const parsed = parseUtilityHistoricalLoadCsv(buildOntarioPublicUtilitySampleCsv());
    expect(parsed.format_evidence).toBe('bundled_fixture_hash_match');
    expect(parsed.rows.length).toBeGreaterThan(0);
    expect(parsed.rows[0]?.source_system).toBe(
      ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.synthetic_source_id,
    );
  });

  it('still detects the fixture when the comment header lines are stripped', () => {
    const dataOnlyCsv = buildOntarioPublicUtilitySampleCsv()
      .split('\n')
      .filter((line) => !line.startsWith('#'))
      .join('\n');
    const parsed = parseUtilityHistoricalLoadCsv(dataOnlyCsv);
    expect(parsed.format_evidence).toBe('bundled_fixture_hash_match');
  });

  it('downgrades to unverified_upload when a fixture value is tampered', () => {
    const lines = buildOntarioPublicUtilitySampleCsv().split('\n');
    const dataIndex = lines.findIndex((line) => /^20\d\d-/.test(line));
    expect(dataIndex).toBeGreaterThan(-1);
    const columns = lines[dataIndex]!.split(',');
    columns[4] = '999999.999';
    lines[dataIndex] = columns.join(',');
    const parsed = parseUtilityHistoricalLoadCsv(lines.join('\n'));
    expect(parsed.format_evidence).toBe('unverified_upload');
    expect(parsed.rows.length).toBeGreaterThan(0);
  });

  it('does not trust a forged source_system label without matching fixture content', () => {
    const forged = [
      'timestamp,geography_level,geography_id,customer_class,demand_mw,source_system',
      `2025-01-06T00:00:00.000Z,system,FAKE-SYSTEM,mixed,123.45,${ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.synthetic_source_id}`,
    ].join('\n');
    const parsed = parseUtilityHistoricalLoadCsv(forged);
    expect(parsed.format_evidence).toBe('unverified_upload');
  });

  it('marks IESO-shaped uploads as ieso_format_detected with unverified origin', () => {
    const parsed = parseUtilityHistoricalLoadCsv(IESO_CSV);
    expect(parsed.format_evidence).toBe('ieso_format_detected');
    expect(parsed.rows).toHaveLength(48);
    expect(parsed.rows[0]?.geography_id).toBe('IESO-ONTARIO-SYSTEM');
  });

  it('marks IESO header-only uploads as ieso_format_detected even with no valid rows', () => {
    const parsed = parseUtilityHistoricalLoadCsv('Date,Hour,Market Demand,Ontario Demand');
    expect(parsed.format_evidence).toBe('ieso_format_detected');
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });

  it('marks generic template uploads as unverified_upload', () => {
    const parsed = parseUtilityHistoricalLoadCsv(
      'timestamp,demand_mw\n2025-01-01T00:00:00.000Z,120\n2025-01-01T01:00:00.000Z,121',
    );
    expect(parsed.format_evidence).toBe('unverified_upload');
    expect(parsed.rows).toHaveLength(2);
  });

  it('marks timezone-free date-time strings as ambiguous', () => {
    const parsed = parseUtilityHistoricalLoadCsv(
      'timestamp,demand_mw\n2025-01-01T00:00:00,120\n2025-01-01T01:00:00,121',
    );

    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows.every((row) => row.quality_flags?.includes('timezone_ambiguous'))).toBe(true);
  });

  it('rejects uploads above the byte cap without returning partial rows', () => {
    const parsed = parseUtilityHistoricalLoadCsv('x'.repeat(MAX_UTILITY_CSV_BYTES + 1));

    expect(parsed.rows).toEqual([]);
    expect(parsed.errors[0]).toContain('25 MiB upload limit');
  });

  it('rejects uploads above the data-row cap without silently truncating', () => {
    const data = Array.from({ length: MAX_UTILITY_CSV_DATA_ROWS + 1 }, (_, index) =>
      `2025-01-01T00:00:00.000Z,${index + 1}`,
    );
    const parsed = parseUtilityHistoricalLoadCsv(['timestamp,demand_mw', ...data].join('\n'));

    expect(parsed.rows).toEqual([]);
    expect(parsed.errors[0]).toContain('100,000 data-row limit');
  });

  it('marks structurally invalid uploads as unverified_upload', () => {
    const parsed = parseUtilityHistoricalLoadCsv('timestamp,wrong_column\n2025-01-01,abc');
    expect(parsed.format_evidence).toBe('unverified_upload');
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });

  it('keeps parseIesoPublicDemandCsv aligned with the same evidence tokens', () => {
    expect(parseIesoPublicDemandCsv(IESO_CSV).format_evidence).toBe('ieso_format_detected');
    const invalid = parseIesoPublicDemandCsv('timestamp,demand_mw\n2025-01-01,1');
    expect(invalid.format_evidence).toBe('unverified_upload');
    expect(invalid.rows).toHaveLength(0);
  });
});

describe('fingerprintUtilityLoadRows', () => {
  it('is deterministic and order-independent for identical row content', () => {
    const rows = generateOntarioPublicUtilitySampleRows();
    const reversed = [...rows].reverse();
    expect(fingerprintUtilityLoadRows(rows)).toBe(fingerprintUtilityLoadRows(reversed));
    expect(isBundledFixtureContent(rows)).toBe(true);
    const roundTripped = parseUtilityHistoricalLoadCsv(utilityRowsToCsv(rows));
    expect(fingerprintUtilityLoadRows(roundTripped.rows)).toBe(fingerprintUtilityLoadRows(rows));
  });

  it('rejects content that merely matches the fixture row count', () => {
    const rows = generateOntarioPublicUtilitySampleRows().map((row, index) =>
      index === 0 ? { ...row, demand_mw: row.demand_mw + 1 } : row,
    );
    expect(isBundledFixtureContent(rows)).toBe(false);
    expect(isBundledFixtureContent([])).toBe(false);
  });

  it('exposes stable labels for every evidence token', () => {
    expect(UTILITY_CSV_FORMAT_EVIDENCE_LABELS.bundled_fixture_hash_match).toContain('fixture');
    expect(UTILITY_CSV_FORMAT_EVIDENCE_LABELS.ieso_format_detected).toContain('unverified');
    expect(UTILITY_CSV_FORMAT_EVIDENCE_LABELS.unverified_upload).toContain('Unverified');
  });
});
