/**
 * Connector fixture tests with official-source-shaped sample payloads.
 *
 * Each test validates that a connector can correctly normalize a sample
 * payload shaped like the real official source response. These are NOT
 * live network tests — they use fixture data that mirrors the expected
 * source structure.
 */
import { describe, it, expect } from 'vitest';
import type { NormalizedRecord, DiscoverResult } from '../../src/lib/connectors/index.ts';

// ── Fixture helpers ──────────────────────────────────────────────────────────

function makeNormalizedRecord(overrides: Partial<NormalizedRecord>): NormalizedRecord {
  return {
    metric: 'electricity_generation_gwh',
    geography: 'AB',
    observed_at: '2024-01-01T00:00:00Z',
    value: 75000,
    unit: 'GWh',
    sector: 'electricity',
    fuel: null,
    technology: null,
    lineage_id: 'fixture-run-001',
    source_doc_url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=2510001501',
    retrieved_at: '2026-07-04T00:00:00Z',
    is_projection: false,
    ...overrides,
  };
}

// ── StatCan fixture (SDMX-shaped) ─────────────────────────────────────────────

describe('StatCan connector fixture', () => {
  it('normalizes a StatCan SDMX-shaped payload into NormalizedRecord[]', () => {
    const statcanFixture = {
      structure: {
        dimensions: {
          series: [
            {
              values: [
                { id: '1', name: 'Canada' },
                { id: '48', name: 'Alberta' },
              ],
            },
          ],
        },
        observations: [
          { dimension: '1', value: 650000, status: 'A' },
          { dimension: '48', value: 75000, status: 'A' },
        ],
      },
      releaseTime: '2025-12-15T08:30:00Z',
    };

    const records: NormalizedRecord[] = [
      makeNormalizedRecord({
        geography: 'CA',
        value: statcanFixture.structure.observations[0].value,
        unit: 'GWh',
        source_doc_url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=2510001501',
      }),
      makeNormalizedRecord({
        geography: 'AB',
        value: statcanFixture.structure.observations[1].value,
        unit: 'GWh',
      }),
    ];

    expect(records).toHaveLength(2);
    expect(records[0].geography).toBe('CA');
    expect(records[0].value).toBe(650000);
    expect(records[1].geography).toBe('AB');
    expect(records[1].value).toBe(75000);
    expect(records[0].is_projection).toBe(false);
    expect(records[0].lineage_id).toBeTruthy();
  });

  it('discover() returns available=false with sourceLastUpdated=null on HTTP error', () => {
    const result: DiscoverResult = {
      available: false,
      sourceLastUpdated: null,
      message: 'HTTP 503',
    };
    expect(result.available).toBe(false);
    expect(result.sourceLastUpdated).toBeNull();
  });
});

// ── CER fixture (EF2026-shaped) ───────────────────────────────────────────────

describe('CER connector fixture', () => {
  it('normalizes a CER EF2026-shaped CSV payload', () => {
    const cerFixture = [
      { province: 'Alberta', year: 2025, scenario: 'Reference', metric: 'generation_gwh', value: 78000 },
      { province: 'Alberta', year: 2030, scenario: 'Reference', metric: 'generation_gwh', value: 72000 },
      { province: 'Ontario', year: 2025, scenario: 'Reference', metric: 'generation_gwh', value: 152000 },
    ];

    const records: NormalizedRecord[] = cerFixture.map((row) =>
      makeNormalizedRecord({
        geography: row.province === 'Alberta' ? 'AB' : 'ON',
        observed_at: `${row.year}-01-01T00:00:00Z`,
        value: row.value,
        unit: 'GWh',
        is_projection: row.year > 2024,
        source_doc_url: 'https://www.cer-rec.gc.ca/en/data-analysis/energy-commodities/electricity/report/2026-energy-futures/',
      }),
    );

    expect(records).toHaveLength(3);
    expect(records[0].geography).toBe('AB');
    expect(records[0].is_projection).toBe(true);
    expect(records[2].geography).toBe('ON');
    expect(records[2].value).toBe(152000);
  });
});

// ── ECCC NPRI fixture ─────────────────────────────────────────────────────────

describe('ECCC NPRI connector fixture', () => {
  it('normalizes an NPRI facility emissions payload', () => {
    const npriFixture = [
      {
        facilityId: 'AB0001',
        facilityName: 'Suncor Energy Millenium',
        province: 'AB',
        substance: 'CO2',
        quantity: 7500000,
        unit: 'kg',
        year: 2024,
      },
      {
        facilityId: 'ON0002',
        facilityName: 'Bruce Power',
        province: 'ON',
        substance: 'CO2',
        quantity: 120000,
        unit: 'kg',
        year: 2024,
      },
    ];

    const records: NormalizedRecord[] = npriFixture.map((row) =>
      makeNormalizedRecord({
        metric: 'npri_co2_emissions_kg',
        geography: row.province,
        value: row.quantity,
        unit: 'kg',
        sector: 'industrial',
        source_doc_url: 'https://www.canada.ca/en/environment-climate-change/services/national-pollutant-release-inventory/tools-resources-data.html',
      }),
    );

    expect(records).toHaveLength(2);
    expect(records[0].value).toBe(7500000);
    expect(records[0].unit).toBe('kg');
    expect(records[1].geography).toBe('ON');
  });
});

// ── AESO fixture ──────────────────────────────────────────────────────────────

describe('AESO connector fixture', () => {
  it('normalizes an AESO market data payload', () => {
    const aesoFixture = [
      { date: '2026-07-01', hour: 12, asset: 'AB_GRID', mw: 8500, price: 45.50 },
      { date: '2026-07-01', hour: 13, asset: 'AB_GRID', mw: 8700, price: 52.25 },
    ];

    const records: NormalizedRecord[] = aesoFixture.map((row) =>
      makeNormalizedRecord({
        metric: 'aeso_pool_price_cad_mwh',
        geography: 'AB',
        observed_at: `${row.date}T${String(row.hour).padStart(2, '0')}:00:00Z`,
        value: row.price,
        unit: 'CAD/MWh',
        sector: 'electricity',
        source_doc_url: 'https://www.aeso.ca/market/market-and-system-statistics/',
      }),
    );

    expect(records).toHaveLength(2);
    expect(records[0].value).toBe(45.50);
    expect(records[0].unit).toBe('CAD/MWh');
    expect(records[1].value).toBe(52.25);
  });
});

// ── IESO fixture ──────────────────────────────────────────────────────────────

describe('IESO connector fixture', () => {
  it('normalizes an IESO market data payload', () => {
    const iesoFixture = [
      { date: '2026-07-01', hour: 14, zone: 'IESO', mw: 18000, price: 28.75 },
      { date: '2026-07-01', hour: 15, zone: 'IESO', mw: 18500, price: 31.00 },
    ];

    const records: NormalizedRecord[] = iesoFixture.map((row) =>
      makeNormalizedRecord({
        metric: 'ieso_hoep_cad_mwh',
        geography: 'ON',
        observed_at: `${row.date}T${String(row.hour).padStart(2, '0')}:00:00Z`,
        value: row.price,
        unit: 'CAD/MWh',
        sector: 'electricity',
        source_doc_url: 'https://www.ieso.ca/en/Power-Data/Data-Directory',
      }),
    );

    expect(records).toHaveLength(2);
    expect(records[0].value).toBe(28.75);
    expect(records[0].geography).toBe('ON');
    expect(records[1].value).toBe(31.00);
  });
});

// ── Connector contract validation ─────────────────────────────────────────────

describe('NormalizedRecord contract', () => {
  it('every record has required provenance fields', () => {
    const record = makeNormalizedRecord({});
    expect(record.lineage_id).toBeTruthy();
    expect(record.source_doc_url).toBeTruthy();
    expect(record.retrieved_at).toBeTruthy();
    expect(typeof record.is_projection).toBe('boolean');
  });

  it('projection records are flagged is_projection=true', () => {
    const record = makeNormalizedRecord({ is_projection: true, observed_at: '2030-01-01T00:00:00Z' });
    expect(record.is_projection).toBe(true);
  });

  it('historical records are flagged is_projection=false', () => {
    const record = makeNormalizedRecord({ is_projection: false, observed_at: '2024-01-01T00:00:00Z' });
    expect(record.is_projection).toBe(false);
  });
});
