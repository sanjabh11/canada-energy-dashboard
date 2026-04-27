BEGIN;

ALTER TABLE public.utility_connector_sync_runs
  DROP CONSTRAINT IF EXISTS utility_connector_sync_runs_run_type_check;

ALTER TABLE public.utility_connector_sync_runs
  ADD CONSTRAINT utility_connector_sync_runs_run_type_check
  CHECK (run_type IN ('auth', 'sync', 'revoke', 'batch_import', 'telemetry_ingest'));

COMMIT;
