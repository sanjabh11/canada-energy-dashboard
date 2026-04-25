-- Shared source spine for Canada energy dashboard
-- Adds the canonical source tables and audit columns needed by Wave A/A0.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.ml_intelligence_events
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS event_timestamp timestamptz;

ALTER TABLE IF EXISTS public.ops_runs
  ADD COLUMN IF NOT EXISTS job_name text,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE IF EXISTS public.job_execution_log
  ADD COLUMN IF NOT EXISTS job_name text,
  ADD COLUMN IF NOT EXISTS job_type text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE TABLE IF NOT EXISTS public.tier_market_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL,
  observed_at timestamptz NOT NULL,
  market_credit_price_cad_per_tonne numeric NOT NULL CHECK (market_credit_price_cad_per_tonne >= 0),
  fund_price_cad_per_tonne numeric NOT NULL DEFAULT 95 CHECK (fund_price_cad_per_tonne >= 0),
  claim_label text NOT NULL DEFAULT 'estimated' CHECK (claim_label IN ('estimated', 'advisory', 'validated')),
  quality_status text NOT NULL DEFAULT 'fresh',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_name, observed_at)
);

CREATE TABLE IF NOT EXISTS public.retailer_rate_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL,
  observed_at timestamptz NOT NULL,
  retailer_key text NOT NULL,
  retailer_name text NOT NULL,
  province text NOT NULL DEFAULT 'AB',
  fixed_rate_cad_per_kwh numeric NOT NULL CHECK (fixed_rate_cad_per_kwh >= 0),
  term_months integer NOT NULL CHECK (term_months > 0),
  cancellation_fee_cad numeric NOT NULL DEFAULT 0 CHECK (cancellation_fee_cad >= 0),
  green_option boolean NOT NULL DEFAULT false,
  promo_text text,
  active boolean NOT NULL DEFAULT true,
  claim_label text NOT NULL DEFAULT 'estimated' CHECK (claim_label IN ('estimated', 'advisory', 'validated')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_name, observed_at, retailer_key)
);

CREATE TABLE IF NOT EXISTS public.market_spike_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL,
  observed_at timestamptz NOT NULL,
  province text NOT NULL DEFAULT 'AB',
  pool_price_cad_per_mwh numeric NOT NULL CHECK (pool_price_cad_per_mwh >= 0),
  demand_mw numeric NOT NULL CHECK (demand_mw >= 0),
  reserve_margin_percent numeric NOT NULL CHECK (reserve_margin_percent >= 0),
  wind_generation_mw numeric NOT NULL CHECK (wind_generation_mw >= 0),
  temperature_c numeric NOT NULL,
  spike_label boolean,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_name, observed_at)
);

CREATE TABLE IF NOT EXISTS public.gas_basis_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL,
  observed_at timestamptz NOT NULL,
  province text NOT NULL DEFAULT 'AB',
  aeco_cad_per_gj numeric NOT NULL CHECK (aeco_cad_per_gj >= 0),
  henry_hub_cad_per_gj numeric NOT NULL CHECK (henry_hub_cad_per_gj >= 0),
  pipeline_curtailment_pct numeric NOT NULL CHECK (pipeline_curtailment_pct >= 0),
  storage_deficit_pct numeric NOT NULL CHECK (storage_deficit_pct >= 0),
  temperature_c numeric NOT NULL,
  basis_lag1 numeric NOT NULL,
  basis_lag7 numeric NOT NULL,
  spread_cad_per_gj numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_name, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_tier_market_rates_observed_at ON public.tier_market_rates(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_retailer_rate_offers_active ON public.retailer_rate_offers(source_name, active, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_spike_series_observed_at ON public.market_spike_series(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_spike_series_province ON public.market_spike_series(province, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_gas_basis_series_observed_at ON public.gas_basis_series(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_gas_basis_series_province ON public.gas_basis_series(province, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_execution_log_job_name ON public.job_execution_log(job_name, executed_at DESC);

DROP POLICY IF EXISTS job_execution_log_insert_all ON public.job_execution_log;
CREATE POLICY job_execution_log_insert_all
  ON public.job_execution_log
  FOR INSERT
  TO anon, authenticated, service_role
  WITH CHECK (true);

ALTER TABLE public.tier_market_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_rate_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_spike_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gas_basis_series ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tier_market_rates' AND policyname = 'tier_market_rates_read_all'
  ) THEN
    CREATE POLICY tier_market_rates_read_all ON public.tier_market_rates FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'retailer_rate_offers' AND policyname = 'retailer_rate_offers_read_all'
  ) THEN
    CREATE POLICY retailer_rate_offers_read_all ON public.retailer_rate_offers FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'market_spike_series' AND policyname = 'market_spike_series_read_all'
  ) THEN
    CREATE POLICY market_spike_series_read_all ON public.market_spike_series FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gas_basis_series' AND policyname = 'gas_basis_series_read_all'
  ) THEN
    CREATE POLICY gas_basis_series_read_all ON public.gas_basis_series FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tier_market_rates' AND policyname = 'tier_market_rates_service_all'
  ) THEN
    CREATE POLICY tier_market_rates_service_all ON public.tier_market_rates FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'retailer_rate_offers' AND policyname = 'retailer_rate_offers_service_all'
  ) THEN
    CREATE POLICY retailer_rate_offers_service_all ON public.retailer_rate_offers FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'market_spike_series' AND policyname = 'market_spike_series_service_all'
  ) THEN
    CREATE POLICY market_spike_series_service_all ON public.market_spike_series FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gas_basis_series' AND policyname = 'gas_basis_series_service_all'
  ) THEN
    CREATE POLICY gas_basis_series_service_all ON public.gas_basis_series FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

INSERT INTO public.ml_model_registry (model_key, model_version, domain, model_type, methodology, data_sources, warnings)
VALUES
  (
    'tier-deterministic-v1',
    'tier-deterministic-v1',
    'tier',
    'deterministic_simulator',
    'Deterministic Alberta TIER pathway comparison with source-backed market credit lookup.',
    '[{"name":"Alberta TIER Regulation"}]'::jsonb,
    '["Verify current pricing before binding decisions."]'::jsonb
  ),
  (
    'rate-watchdog-v1',
    'rate-watchdog-v1',
    'rate_watchdog',
    'deterministic_calculator',
    'RoLR-to-retailer estimated savings calculator with source-backed retailer snapshots.',
    '[{"name":"UCA RoLR and retailer rate sources"}]'::jsonb,
    '["Savings are estimates, not guarantees."]'::jsonb
  ),
  (
    'bagged-threshold-price-spike-v1',
    'bagged-threshold-price-spike-v1',
    'price_spike',
    'threshold_ensemble',
    'Bagged deterministic threshold ensemble for Alberta pool-price spike screening.',
    '[{"name":"AESO price/load/weather feeds"}]'::jsonb,
    '["Backtest before claiming uplift over persistence."]'::jsonb
  ),
  (
    'aeco-henry-basis-v1',
    'aeco-henry-basis-v1',
    'gas_basis',
    'linear_forecast',
    'Linear basis spread forecast with AECO / Henry Hub source-backed history.',
    '[{"name":"NGX AECO"},{"name":"EIA Henry Hub"}]'::jsonb,
    '["Treat synthetic fallbacks as advisory only."]'::jsonb
  )
ON CONFLICT (model_key) DO UPDATE SET
  model_version = EXCLUDED.model_version,
  methodology = EXCLUDED.methodology,
  data_sources = EXCLUDED.data_sources,
  warnings = EXCLUDED.warnings,
  updated_at = now();

COMMIT;
