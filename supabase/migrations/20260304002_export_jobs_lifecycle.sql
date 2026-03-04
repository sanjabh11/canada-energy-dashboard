-- ============================================================================
-- Export Jobs Lifecycle (Tier-3 Hardening)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  principal_type TEXT NOT NULL CHECK (principal_type IN ('api_key', 'jwt_user')),
  principal_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_source TEXT NOT NULL DEFAULT 'ui',
  template TEXT NOT NULL,
  request_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued',
    'running',
    'success',
    'failed',
    'blocked_stale',
    'canceled'
  )),
  status_reason TEXT,
  force_export BOOLEAN NOT NULL DEFAULT FALSE,
  confidence_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  entitlement_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_format TEXT NOT NULL DEFAULT 'html_json',
  output_storage_path TEXT,
  output_signed_url TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  priority INT NOT NULL DEFAULT 10
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_status_priority_created
  ON public.export_jobs (status, priority DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at
  ON public.export_jobs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_export_jobs_principal
  ON public.export_jobs (principal_type, principal_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_export_jobs_idempotency
  ON public.export_jobs (principal_type, principal_id, idempotency_key);

CREATE TABLE IF NOT EXISTS public.export_job_events (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.export_jobs(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_job_events_job_id_created
  ON public.export_job_events (job_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.export_alert_runs (
  window_start TIMESTAMPTZ PRIMARY KEY,
  blocked_count INT NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel TEXT NOT NULL DEFAULT 'email'
);

ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_alert_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.export_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.export_job_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.export_alert_runs FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.export_jobs FROM PUBLIC;
REVOKE ALL ON public.export_job_events FROM PUBLIC;
REVOKE ALL ON public.export_alert_runs FROM PUBLIC;

REVOKE ALL ON public.export_jobs FROM anon, authenticated;
REVOKE ALL ON public.export_job_events FROM anon, authenticated;
REVOKE ALL ON public.export_alert_runs FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.export_jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.export_job_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.export_alert_runs TO service_role;

COMMENT ON TABLE public.export_jobs IS 'Async export job queue for official artifacts.';
COMMENT ON TABLE public.export_job_events IS 'Lifecycle events for export jobs.';
COMMENT ON TABLE public.export_alert_runs IS 'Alert dedupe state for blocked/failed export windows.';
