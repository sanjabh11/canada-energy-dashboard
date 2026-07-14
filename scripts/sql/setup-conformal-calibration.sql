-- Conformal Calibration State Table
-- Stores ACI state and calibration observations for the live conformal prediction pipeline

CREATE TABLE IF NOT EXISTS public.conformal_calibration_state (
  id BIGSERIAL PRIMARY KEY,
  -- ACI state
  alpha DOUBLE PRECISION NOT NULL DEFAULT 0.10,
  target_alpha DOUBLE PRECISION NOT NULL DEFAULT 0.10,
  gamma DOUBLE PRECISION NOT NULL DEFAULT 0.01,
  empirical_coverage DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  -- Calibration metadata
  calibration_size INTEGER NOT NULL DEFAULT 0,
  last_observation_timestamp TIMESTAMPTZ,
  last_reset_date TEXT,
  -- Source identification
  source TEXT NOT NULL DEFAULT 'aeso',
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Calibration observations (forecast vs actual pairs)
CREATE TABLE IF NOT EXISTS public.conformal_observations (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'aeso',
  timestamp TIMESTAMPTZ NOT NULL,
  forecast_mw DOUBLE PRECISION NOT NULL,
  actual_mw DOUBLE PRECISION NOT NULL,
  lower_q DOUBLE PRECISION,
  upper_q DOUBLE PRECISION,
  nonconformity_score DOUBLE PRECISION,
  covered BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_conformal_obs_source_ts
  ON public.conformal_observations (source, timestamp DESC);

-- RLS policies (service role only for cron writes)
ALTER TABLE public.conformal_calibration_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conformal_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage calibration state"
  ON public.conformal_calibration_state
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated can read calibration state"
  ON public.conformal_calibration_state
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage observations"
  ON public.conformal_observations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated can read observations"
  ON public.conformal_observations
  FOR SELECT
  USING (auth.role() = 'authenticated');
