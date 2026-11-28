import { describe, expect, it } from 'vitest';
import { buildOwnerBoundHistoryRead } from '../../netlify/functions/utility-connector-history';
import type { OwnerConnectorAccount, OwnerSyncRun } from '../../netlify/functions/_shared/utilityConnectorOwner';

const now = new Date('2026-08-20T12:00:00.000Z');

function account(id: string, overrides: Partial<OwnerConnectorAccount> = {}): OwnerConnectorAccount {
  return {
    id,
    owner_user_id: 'internal-owner-1',
    connector_kind: 'ontario_green_button_cmd',
    source_kind: 'green_button_cmd',
    status: 'active',
    jurisdiction: 'Ontario',
    utility_name: 'London Hydro',
    display_name: 'London Hydro Green Button',
    account_holder_ref: `opaque-${id}`,
    last_synced_at: '2026-08-20T11:00:00.000Z',
    last_error: null,
    metadata: {},
    updated_at: '2026-08-20T11:00:00.000Z',
    ...overrides,
  };
}

function run(accountId: string, overrides: Partial<OwnerSyncRun> = {}): OwnerSyncRun {
  return {
    id: `run-${accountId}`,
    connector_account_id: accountId,
    run_type: 'sync',
    status: 'success',
    observed_at: '2026-08-20T11:00:00.000Z',
    row_count: 2,
    warning_count: 0,
    error_message: null,
    metadata: {},
    created_at: '2026-08-20T11:00:00.000Z',
    ...overrides,
  };
}

function row(accountId: string, demandMw = 12): Record<string, unknown> {
  return {
    connector_account_id: accountId,
    observed_at: '2026-08-20T11:00:00.000Z',
    source_kind: 'green_button_cmd',
    source_system: 'green_button_cmd',
    geography_level: 'system',
    geography_id: 'ON-SYSTEM',
    customer_class: 'mixed',
    demand_mw: demandMw,
    quality_flags: [],
  };
}

describe('owner-bound utility connector history read contract', () => {
  it('returns live history only for the owner-selected account set', () => {
    const result = buildOwnerBoundHistoryRead({
      accounts: [account('account-1')],
      runs: [run('account-1')],
      history: [row('account-1'), row('account-foreign')],
      now,
    });

    expect(result.read_status).toBe('available');
    expect(result.freshness_status).toBe('live');
    expect(result.history).toHaveLength(1);
    expect(result.accounts[0]).not.toHaveProperty('owner_user_id');
    expect(result.owner_bound).toBe(true);
  });

  it('does not expose stale persisted history as forecast-eligible data', () => {
    const result = buildOwnerBoundHistoryRead({
      accounts: [account('account-1')],
      runs: [run('account-1', {
        created_at: '2026-08-17T11:00:00.000Z',
        observed_at: '2026-08-17T11:00:00.000Z',
      })],
      history: [row('account-1')],
      now,
    });

    expect(result.read_status).toBe('stale');
    expect(result.freshness_status).toBe('stale');
    expect(result.history).toEqual([]);
  });

  it('fails closed when an eligible persisted batch contains malformed data', () => {
    const result = buildOwnerBoundHistoryRead({
      accounts: [account('account-1')],
      runs: [run('account-1')],
      history: [row('account-1', -1)],
      now,
    });

    expect(result.read_status).toBe('invalid');
    expect(result.history).toEqual([]);
    expect(result.warnings.join(' ')).toContain('demand_mw');
  });

  it('distinguishes an authenticated owner with no connected history', () => {
    const result = buildOwnerBoundHistoryRead({
      accounts: [],
      runs: [],
      history: [],
      now,
    });

    expect(result.owner_bound).toBe(true);
    expect(result.read_status).toBe('empty');
    expect(result.freshness_status).toBe('unknown');
  });
});
