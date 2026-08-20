import { describe, expect, it } from 'vitest';
import {
  buildLastSuccessfulRunMap,
  fetchConnectorFreshness,
} from '../../src/lib/connectorFreshness';

describe('connector freshness read contract', () => {
  it('maps only successful, non-demo rows to last successful timestamps', () => {
    expect(
      buildLastSuccessfulRunMap([
        {
          connector_id: 'aeso-api',
          last_run_at: '2026-07-01T12:00:00Z',
          last_run_status: 'success',
          freshness_status: 'live',
        },
        {
          connector_id: 'ieso-generator',
          last_run_at: '2026-07-01T12:00:00Z',
          last_run_status: 'failed',
          freshness_status: 'stale',
        },
        {
          connector_id: 'statcan-wds',
          last_run_at: '2026-07-01T12:00:00Z',
          last_run_status: 'success',
          freshness_status: 'demo',
        },
      ]),
    ).toEqual({
      'aeso-api': '2026-07-01T12:00:00.000Z',
      'ieso-generator': null,
      'statcan-wds': null,
    });
  });

  it('returns an unavailable result when the persisted read fails', async () => {
    const result = await fetchConnectorFreshness({
      from: () => ({
        select: async () => ({ data: null, error: { message: 'permission denied' } }),
      }),
    });

    expect(result).toEqual({
      available: false,
      lastRunMap: {},
      error: 'permission denied',
    });
  });

  it('returns persisted rows without substituting demo timestamps', async () => {
    const result = await fetchConnectorFreshness({
      from: () => ({
        select: async () => ({
          data: [
            {
              connector_id: 'aeso-api',
              last_run_at: '2026-07-01T12:00:00Z',
              last_run_status: 'success',
              freshness_status: 'live',
            },
          ],
          error: null,
        }),
      }),
    });

    expect(result).toEqual({
      available: true,
      lastRunMap: { 'aeso-api': '2026-07-01T12:00:00.000Z' },
      error: null,
    });
  });
});
