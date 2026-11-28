import { describe, expect, it, vi } from 'vitest';
import {
  fetchUtilityConnectorHistory,
  startUtilityConnectorAuthorization,
} from '../../src/lib/utilityConnectorHistoryClient';

const livePayload = {
  owner_bound: true,
  read_status: 'available',
  freshness_status: 'live',
  source_kind: 'green_button_cmd',
  source_label: 'London Hydro owner-bound Green Button CMD history',
  source_observed_at: '2026-08-20T11:00:00.000Z',
  fetched_at: '2026-08-20T11:05:00.000Z',
  accounts: [{
    id: 'account-1',
    connector_kind: 'ontario_green_button_cmd',
    source_kind: 'green_button_cmd',
    status: 'active',
    jurisdiction: 'Ontario',
    utility_name: 'London Hydro',
    display_name: 'London Hydro Green Button',
    account_holder_ref: 'opaque-1',
    last_synced_at: '2026-08-20T11:00:00.000Z',
    last_error: null as string | null,
    metadata: {},
    updated_at: '2026-08-20T11:05:00.000Z',
  }],
  history: [{
    connector_account_id: 'account-1',
    observed_at: '2026-08-20T11:00:00.000Z',
    source_kind: 'green_button_cmd',
    source_system: 'green_button_cmd',
    geography_level: 'system',
    geography_id: 'ON-SYSTEM',
    customer_class: 'mixed',
    demand_mw: 12,
    quality_flags: [] as string[],
  }],
  warnings: [] as string[],
};

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('utilityConnectorHistoryClient', () => {
  it('promotes only an owner-bound live server read to forecast input', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain('/api/utility-connector-history?jurisdiction=Ontario');
      expect(init?.credentials).toBe('include');
      return response(livePayload);
    });

    const result = await fetchUtilityConnectorHistory('Ontario', fetchImpl);

    expect(result.status).toBe('available');
    expect(result.rows).toHaveLength(1);
    expect(result.ownerBound).toBe(true);
    expect(result.sourceTrust).toMatchObject({
      owner_bound: true,
      freshness_status: 'live',
      fetched_at: '2026-08-20T11:05:00.000Z',
    });
  });

  it('withholds stale history even when the endpoint returns rows', async () => {
    const result = await fetchUtilityConnectorHistory('Ontario', async () => response({
      ...livePayload,
      read_status: 'stale',
      freshness_status: 'stale',
    }));

    expect(result.status).toBe('stale');
    expect(result.rows).toEqual([]);
    expect(result.sourceTrust).toBeNull();
  });

  it('keeps authentication failure separate from an authenticated empty read', async () => {
    const unauthorized = await fetchUtilityConnectorHistory('Ontario', async () => response({
      owner_bound: false,
      read_status: 'unauthorized',
    }, 401));
    const empty = await fetchUtilityConnectorHistory('Ontario', async () => response({
      owner_bound: true,
      read_status: 'empty',
      freshness_status: 'unknown',
      source_kind: 'green_button_cmd',
      accounts: [],
      history: [],
      warnings: [],
    }));

    expect(unauthorized.status).toBe('unauthorized');
    expect(unauthorized.ownerBound).toBe(false);
    expect(empty.status).toBe('empty');
    expect(empty.ownerBound).toBe(true);
  });

  it('starts authorization without exposing an owner identifier', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      expect(body).toEqual({ action: 'start', utility_name: 'Alectra Utilities' });
      return response({
        ok: true,
        owner_bound: true,
        authorize_url: 'https://utility.example/authorize?state=opaque-state',
        state: 'opaque-state',
        connector_id: 'opaque-state',
        expires_at: '2026-08-20T12:10:00.000Z',
      });
    });

    const result = await startUtilityConnectorAuthorization('Alectra Utilities', fetchImpl);

    expect(result.authorize_url).toContain('opaque-state');
    expect(result.state).toBe('opaque-state');
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
