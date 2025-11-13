-- AESO schema alignment: create/alter tables used by stream-aeso-grid-data
-- Safe idempotent migration
BEGIN;

-- 1) Ensure grid_status exists with required columns
CREATE TABLE IF NOT EXISTS public.grid_status (
  region TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  demand_mw NUMERIC,
  supply_mw NUMERIC,
  reserve_margin NUMERIC,
  frequency_hz NUMERIC,
  voltage_kv NUMERIC,
  congestion_index NUMERIC,
  data_source TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grid_status' AND column_name = 'timestamp'
  ) THEN
    EXECUTE 'ALTER TABLE public.grid_status ADD COLUMN timestamp TIMESTAMPTZ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grid_status' AND column_name = 'reserve_margin'
  ) THEN
    EXECUTE 'ALTER TABLE public.grid_status ADD COLUMN reserve_margin NUMERIC';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grid_status' AND column_name = 'frequency_hz'
  ) THEN
    EXECUTE 'ALTER TABLE public.grid_status ADD COLUMN frequency_hz NUMERIC';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'grid_status' AND column_name = 'data_source'
  ) THEN
    EXECUTE 'ALTER TABLE public.grid_status ADD COLUMN data_source TEXT';
  END IF;
END $$;

-- Ensure uniqueness for time series either by (region,timestamp) when available or fallback to (region,captured_at)
CREATE UNIQUE INDEX IF NOT EXISTS ux_grid_status_region_timestamp ON public.grid_status(region, timestamp);
CREATE UNIQUE INDEX IF NOT EXISTS ux_grid_status_region_captured ON public.grid_status(region, captured_at);

GRANT SELECT ON public.grid_status TO anon, authenticated;

-- 2) Ensure provincial_generation has columns referenced by function
ALTER TABLE IF EXISTS public.provincial_generation
  ADD COLUMN IF NOT EXISTS data_source TEXT,
  ADD COLUMN IF NOT EXISTS version TEXT;

GRANT SELECT ON public.provincial_generation TO anon, authenticated;

-- 3) Create alberta_grid_prices if missing
CREATE TABLE IF NOT EXISTS public.alberta_grid_prices (
  timestamp TIMESTAMPTZ PRIMARY KEY,
  pool_price_cad_per_mwh NUMERIC,
  forecast_price_cad_per_mwh NUMERIC,
  data_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT ON public.alberta_grid_prices TO anon, authenticated;

-- 4) Create logging/health tables used by the function
CREATE TABLE IF NOT EXISTS public.edge_invocation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stream_health (
  stream_key TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_success TIMESTAMPTZ,
  last_error TIMESTAMPTZ,
  error_count INTEGER,
  metadata JSONB
);

COMMIT;
