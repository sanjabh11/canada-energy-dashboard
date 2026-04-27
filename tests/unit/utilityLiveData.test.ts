import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildConnectionHealthCards,
  buildInputSourceSurface,
  buildStarterUtilityBatchSnapshot,
  isConnectorCardLiveConnected,
  normalizeUtilityBatchSnapshot,
  parseGreenButtonXml,
  parseUtilitySettlementCsv,
  parseUtilityTelemetryPayload,
} from '../../src/lib/utilityLiveData';

const fixture = (name: string) => readFileSync(join(process.cwd(), 'tests/fixtures', name), 'utf8');
const liveSanitizedFixturePath = join(process.cwd(), 'tests/fixtures', 'utilityapi-live-commercial-sanitized.xml');
const hasLiveSanitizedFixture = existsSync(liveSanitizedFixturePath);

describe('utilityLiveData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-26T12:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds a starter utility-system batch snapshot', () => {
    const snapshot = buildStarterUtilityBatchSnapshot('Ontario');

    expect(snapshot.source_system).toBe('ami_mdm');
    expect(snapshot.records.length).toBeGreaterThan(100);
    expect(snapshot.records[0]?.geography_id).toContain('ON-FEEDER');
  });

  it('normalizes a utility batch snapshot into forecast rows', () => {
    const snapshot = buildStarterUtilityBatchSnapshot('Alberta');
    const rows = normalizeUtilityBatchSnapshot(snapshot);

    expect(rows.length).toBe(snapshot.records.length);
    expect(rows[0]?.source_system).toBe('ami_mdm');
    expect(rows[0]?.geography_level).toBe('feeder');
    expect(rows[0]?.quality_flags).toEqual([]);
  });

  it('builds a live-surface contract for uploaded or batch sources', () => {
    const surface = buildInputSourceSurface({
      source: 'AMI batch import',
      observedAt: '2026-04-25T12:00:00.000Z',
      sourceKind: 'utility_system_batch',
      isFallback: false,
      qualityFlags: ['duplicate_interval'],
      notes: 'Normalized from batch upload.',
    });

    expect(surface.source_kind).toBe('utility_system_batch');
    expect(surface.is_fallback).toBe(false);
    expect(surface.quality_flags).toContain('duplicate_interval');
  });

  it('maps Alberta settlement VEE markers into utility quality flags', () => {
    const csv = [
      'timestamp,geography_level,geography_id,customer_class,demand_mw,vee_status,settlement_status',
      '2026-01-01T00:00:00.000Z,feeder,AB-FEEDER-1,mixed,12.3,estimated,gap filled',
      '2026-01-01T01:00:00.000Z,feeder,AB-FEEDER-1,mixed,12.7,edited,validated',
    ].join('\n');

    const parsed = parseUtilitySettlementCsv(csv, 'Alberta');

    expect(parsed.errors).toEqual([]);
    expect(parsed.vee_summary.estimated_count).toBe(1);
    expect(parsed.vee_summary.edited_count).toBe(1);
    expect(parsed.vee_summary.gap_filled_count).toBe(1);
    expect(parsed.rows[0]?.quality_flags).toContain('vee_estimated');
    expect(parsed.rows[0]?.quality_flags).toContain('meter_gap_filled');
    expect(parsed.rows[1]?.quality_flags).toContain('vee_edited');
  });

  it('parses Ontario Green Button interval XML into normalized utility rows', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom" xmlns:espi="http://naesb.org/espi">
        <entry>
          <content>
            <espi:ReadingType>
              <espi:uom>72</espi:uom>
              <espi:powerOfTenMultiplier>0</espi:powerOfTenMultiplier>
            </espi:ReadingType>
          </content>
        </entry>
        <entry>
          <content>
            <espi:UsagePoint>
              <espi:mRID>ON-GREEN-BUTTON-1</espi:mRID>
            </espi:UsagePoint>
          </content>
        </entry>
        <entry>
          <content>
            <espi:IntervalReading>
              <espi:timePeriod>
                <espi:duration>3600</espi:duration>
                <espi:start>1767225600</espi:start>
              </espi:timePeriod>
              <espi:value>12500000</espi:value>
            </espi:IntervalReading>
          </content>
        </entry>
      </feed>`;

    const parsed = parseGreenButtonXml(xml, { jurisdiction: 'Ontario' });

    expect(parsed.warnings).toEqual([]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.source_system).toBe('green_button_cmd');
    expect(parsed.rows[0]?.geography_id).toBe('ON-GREEN-BUTTON-1');
    expect(parsed.rows[0]?.quality_flags).toContain('missing_temperature');
  });

  it('parses multi-meter batch feeds without collapsing every interval onto the first usage point', () => {
    const parsed = parseGreenButtonXml(fixture('green-button-batch-multi-meter.xml'), { jurisdiction: 'Ontario' });

    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows.some((row) => row.geography_id === 'ON-UP-1')).toBe(true);
    expect(parsed.rows.some((row) => row.geography_id === 'ON-UP-2')).toBe(true);
    expect(parsed.rows.some((row) => row.quality_flags?.includes('vee_estimated'))).toBe(true);
    expect(parsed.rows.some((row) => row.quality_flags?.includes('meter_gap_filled'))).toBe(true);
    expect(parsed.warnings.some((warning) => warning.includes('LocalTimeParameters'))).toBe(true);
  });

  it('returns warnings instead of throwing when the Green Button feed contains no interval rows', () => {
    const parsed = parseGreenButtonXml(fixture('green-button-empty.xml'), { jurisdiction: 'Ontario' });

    expect(parsed.rows).toEqual([]);
    expect(parsed.warnings).toContain('No interval readings were found in the Green Button XML payload.');
    expect(parsed.usage_point_id).toBe('ON-GREEN-BUTTON-EMPTY');
  });

  (hasLiveSanitizedFixture ? it : it.skip)('parses the sanitized live UtilityAPI commercial batch fixture when it has been captured', () => {
    const parsed = parseGreenButtonXml(readFileSync(liveSanitizedFixturePath, 'utf8'), { jurisdiction: 'Ontario' });

    expect(parsed.rows.length).toBeGreaterThan(0);
    expect(parsed.warnings.every((warning) => !warning.includes('No interval readings were found'))).toBe(true);
  });

  it('validates telemetry gateway payloads for northbound ingestion', () => {
    const parsed = parseUtilityTelemetryPayload({
      observed_at: '2026-04-26T12:00:00.000Z',
      jurisdiction: 'Ontario',
      geography_level: 'feeder',
      geography_id: 'ON-FEEDER-7',
      load_mw: 15.4,
      transformer_utilization_pct: 82.1,
      quality_flags: ['phase_unbalanced'],
      source: 'Integrator HTTPS gateway',
    });

    expect(parsed.errors).toEqual([]);
    expect(parsed.snapshot?.geography_id).toBe('ON-FEEDER-7');
    expect(parsed.snapshot?.quality_flags).toContain('phase_unbalanced');
  });

  it('builds connector-aware health cards for the utility route', () => {
    const cards = buildConnectionHealthCards({
      jurisdiction: 'Ontario',
      activeSourceKind: 'green_button_cmd',
      activeSourceLabel: 'Ontario Green Button CMD starter feed',
      activeObservedAt: '2026-04-25T12:00:00.000Z',
      activePersisted: false,
    });

    expect(cards.some((card) => card.id === 'ontario_green_button_cmd' && card.status === 'stale')).toBe(true);
    expect(cards.some((card) => card.id === 'customer_upload')).toBe(true);
    expect(cards.some((card) => card.id === 'telemetry_gateway_http')).toBe(true);
  });

  it('downgrades revoked or expired connector accounts and only marks fresh active connectors as live', () => {
    const cards = buildConnectionHealthCards({
      jurisdiction: 'Ontario',
      activeSourceKind: 'uploaded_historical',
      activeSourceLabel: 'Uploaded historical CSV',
      activeObservedAt: '2026-04-26T12:00:00.000Z',
      activePersisted: false,
      connectorAccounts: [
        {
          id: 'gb-1',
          connector_kind: 'ontario_green_button_cmd',
          source_kind: 'green_button_cmd',
          status: 'active',
          jurisdiction: 'Ontario',
          utility_name: 'London Hydro',
          display_name: 'London Hydro CMD',
          last_synced_at: '2026-04-26T12:00:00.000Z',
          metadata: {
            token_expires_at: '2026-04-26T11:00:00.000Z',
          },
        },
        {
          id: 'tel-1',
          connector_kind: 'telemetry_gateway_http',
          source_kind: 'telemetry_gateway',
          status: 'active',
          jurisdiction: 'Ontario',
          utility_name: 'Telemetry gateway',
          display_name: 'Gateway HTTP',
          last_synced_at: '2026-04-26T12:00:00.000Z',
          metadata: {},
        },
        {
          id: 'batch-1',
          connector_kind: 'utility_batch_csv',
          source_kind: 'utility_system_batch',
          status: 'active',
          jurisdiction: 'Ontario',
          utility_name: 'Batch import',
          display_name: 'AMI batch',
          last_synced_at: '2026-04-26T12:00:00.000Z',
          metadata: {
            revoked_at: '2026-04-26T12:05:00.000Z',
          },
        },
      ],
    });

    const greenButton = cards.find((card) => card.id === 'ontario_green_button_cmd');
    const telemetry = cards.find((card) => card.id === 'telemetry_gateway_http');
    const batch = cards.find((card) => card.id === 'utility_batch_csv');

    expect(greenButton?.status).toBe('stale');
    expect(greenButton?.notes).toContain('expired');
    expect(batch?.status).toBe('revoked');
    expect(batch?.notes).toContain('Revocation detected');
    expect(isConnectorCardLiveConnected(telemetry!)).toBe(true);
    expect(isConnectorCardLiveConnected(greenButton!)).toBe(false);
  });

  it('marks disconnect-requested Green Button connectors as failed until revocation is confirmed', () => {
    const cards = buildConnectionHealthCards({
      jurisdiction: 'Ontario',
      activeSourceKind: 'uploaded_historical',
      activeSourceLabel: 'Uploaded historical CSV',
      activeObservedAt: '2026-04-26T12:00:00.000Z',
      activePersisted: false,
      connectorAccounts: [
        {
          id: 'gb-2',
          connector_kind: 'ontario_green_button_cmd',
          source_kind: 'green_button_cmd',
          status: 'active',
          jurisdiction: 'Ontario',
          utility_name: 'London Hydro',
          display_name: 'London Hydro CMD',
          last_synced_at: '2026-04-26T12:00:00.000Z',
          metadata: {
            revocation_mode: 'portal_redirect',
            manage_connections_url: 'https://example.com/manage',
            requested_data_categories: ['Usage Information'],
            oauth_espi_scope: 'FB=4_5_15_16',
            revocation_requested_at: '2026-04-26T12:05:00.000Z',
            awaiting_revocation_confirmation: true,
          },
        },
      ],
    });

    const greenButton = cards.find((card) => card.id === 'ontario_green_button_cmd');
    expect(greenButton?.status).toBe('failed');
    expect(greenButton?.can_disconnect).toBe(true);
    expect(greenButton?.awaiting_revocation_confirmation).toBe(true);
    expect(greenButton?.manage_connections_url).toBe('https://example.com/manage');
    expect(greenButton?.notes).toContain('Disconnect requested');
  });
});
