import { describe, expect, it } from 'vitest';
import {
  buildConnectorMetaCacheRow,
  classifyConnectorRun,
} from '../../src/lib/connectors/index';

describe('connector run conformance', () => {
  it('fails closed when the source returns no records', () => {
    expect(classifyConnectorRun({
      fetched: 0,
      valid: 0,
      invalid: 0,
      warnings: [],
      upserted: 0,
      skipped: 0,
      failed: 0,
    })).toEqual({
      status: 'failed',
      errorMessage: 'No records returned by the source; existing data must remain stale.',
    });
  });

  it('fails closed when every fetched record is invalid', () => {
    expect(classifyConnectorRun({
      fetched: 2,
      valid: 0,
      invalid: 2,
      warnings: ['Invalid record: observed_at is required'],
      upserted: 0,
      skipped: 0,
      failed: 0,
    })).toEqual({
      status: 'failed',
      errorMessage: 'No valid records remained after validation.',
    });
  });

  it('marks partial validation or persistence problems as degraded', () => {
    const result = classifyConnectorRun({
      fetched: 3,
      valid: 2,
      invalid: 1,
      warnings: ['Invalid record: unit is required'],
      upserted: 1,
      skipped: 0,
      failed: 1,
    });

    expect(result.status).toBe('degraded');
    expect(result.errorMessage).toContain('Invalid record: unit is required');
  });

  it('returns success only for a non-empty, valid, warning-free run', () => {
    expect(classifyConnectorRun({
      fetched: 2,
      valid: 2,
      invalid: 0,
      warnings: [],
      upserted: 2,
      skipped: 0,
      failed: 0,
    })).toEqual({ status: 'success', errorMessage: null });
  });

  it('marks failed cache rows stale without claiming a successful timestamp', () => {
    const row = buildConnectorMetaCacheRow({
      id: 'ieso-generator',
      name: 'IESO Generator',
      sourceUrl: 'https://www.ieso.ca',
      publisher: 'IESO',
      license: 'IESO Public Data',
      refreshCadenceHours: 1,
      jurisdictions: ['CA-ON'],
      metricFamilies: ['demand'],
      requiresAuth: false,
    }, {
      connector_id: 'ieso-generator',
      run_id: 'run-1',
      started_at: '2026-07-01T12:00:00Z',
      completed_at: '2026-07-01T12:01:00Z',
      status: 'failed',
      records_fetched: 0,
      records_upserted: 0,
      records_skipped: 0,
      records_failed: 0,
      source_url: 'https://www.ieso.ca',
      source_updated_at: null,
      error_message: 'No records returned by the source.',
      payload_hash: null,
    });

    expect(row.last_run_at).toBeNull();
    expect(row.last_run_status).toBe('failed');
    expect(row.freshness_status).toBe('stale');
  });
});
