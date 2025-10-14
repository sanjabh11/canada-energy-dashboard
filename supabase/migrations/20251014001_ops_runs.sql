-- Ops runs heartbeat table for ingestion/forecast jobs
BEGIN;

-- Enable extension for UUIDs if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.ops_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_type text NOT NULL, -- 'ingestion' | 'forecast' | 'purge' | 'other'
  status text NOT NULL,   -- 'success' | 'failure'
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_runs_type_completed ON public.ops_runs (run_type, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_runs_created_at ON public.ops_runs (created_at DESC);

COMMIT;
