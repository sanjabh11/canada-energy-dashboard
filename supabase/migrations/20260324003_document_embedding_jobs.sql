BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.document_embedding_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL DEFAULT 'ingest',
  status text NOT NULL,
  source_type text,
  source_id text,
  requested_by text,
  chunks_total integer NOT NULL DEFAULT 0,
  chunks_embedded integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_embedding_jobs_status_check CHECK (status IN ('queued', 'running', 'success', 'failed')),
  CONSTRAINT document_embedding_jobs_job_type_check CHECK (length(trim(job_type)) > 0)
);

CREATE INDEX IF NOT EXISTS document_embedding_jobs_created_at_idx
  ON public.document_embedding_jobs (created_at DESC);

CREATE INDEX IF NOT EXISTS document_embedding_jobs_status_idx
  ON public.document_embedding_jobs (status, created_at DESC);

ALTER TABLE public.document_embedding_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage document embedding jobs" ON public.document_embedding_jobs;
CREATE POLICY "Service role can manage document embedding jobs"
  ON public.document_embedding_jobs FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.document_embedding_jobs IS 'Operational job log for document chunking and embedding ingestion';

COMMIT;
