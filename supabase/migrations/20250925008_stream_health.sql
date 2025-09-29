-- Stream health monitoring artifacts

BEGIN;

CREATE TABLE IF NOT EXISTS public.stream_health (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_key text NOT NULL,
  status text NOT NULL,
  last_success timestamptz,
  last_error timestamptz,
  error_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stream_health_stream_key
  ON public.stream_health (stream_key);

CREATE TABLE IF NOT EXISTS public.edge_invocation_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  function_name text NOT NULL,
  status text NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_edge_invocation_log_function_status
  ON public.edge_invocation_log (function_name, status, started_at DESC);

COMMIT;
