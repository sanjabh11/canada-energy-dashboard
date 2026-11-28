-- Green Button and utility connector data is service-role-only until an
-- authenticated owner binding and owner-scoped RLS contract exists.

BEGIN;

ALTER TABLE public.utility_connector_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_connector_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_connector_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_connector_payload_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_interval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_telemetry_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_connector_bridge_nonces ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.utility_connector_accounts,
  public.utility_connector_tokens,
  public.utility_connector_sync_runs,
  public.utility_connector_payload_audit,
  public.utility_interval_history,
  public.utility_telemetry_snapshots,
  public.utility_connector_bridge_nonces
FROM anon, authenticated;

DROP POLICY IF EXISTS utility_connector_accounts_read_all ON public.utility_connector_accounts;
DROP POLICY IF EXISTS utility_connector_sync_runs_read_all ON public.utility_connector_sync_runs;

COMMENT ON TABLE public.utility_connector_accounts IS
  'Service-role-only quarantine until connector ownership is bound to an authenticated application user.';

COMMENT ON TABLE public.utility_interval_history IS
  'Service-role-only customer interval history; client reads require owner-scoped RLS and JWT proof.';

COMMIT;
