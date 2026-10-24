import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260820002_utility_connector_read_lockdown.sql',
  'utf8',
);

describe('utility connector read lockdown', () => {
  it('revokes client privileges from all customer connector tables', () => {
    expect(migration).toContain('FROM anon, authenticated;');
    for (const table of [
      'public.utility_connector_accounts',
      'public.utility_connector_tokens',
      'public.utility_connector_sync_runs',
      'public.utility_connector_payload_audit',
      'public.utility_interval_history',
      'public.utility_telemetry_snapshots',
      'public.utility_connector_bridge_nonces',
    ]) {
      expect(migration).toContain(table);
    }
  });

  it('removes the legacy public account and sync-run policies', () => {
    expect(migration).toContain(
      'DROP POLICY IF EXISTS utility_connector_accounts_read_all ON public.utility_connector_accounts;',
    );
    expect(migration).toContain(
      'DROP POLICY IF EXISTS utility_connector_sync_runs_read_all ON public.utility_connector_sync_runs;',
    );
    expect(migration).toContain('Service-role-only customer interval history');
  });
});
