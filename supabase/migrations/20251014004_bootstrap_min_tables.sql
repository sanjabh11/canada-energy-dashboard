BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- batteries_state
CREATE TABLE IF NOT EXISTS public.batteries_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province text UNIQUE NOT NULL,
  soc_percent double precision NOT NULL DEFAULT 50,
  soc_mwh double precision NOT NULL DEFAULT 0,
  capacity_mwh double precision NOT NULL DEFAULT 100,
  power_rating_mw double precision NOT NULL DEFAULT 50,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.batteries_state ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'batteries_state'
      AND policyname = 'allow read batteries_state'
  ) THEN
    CREATE POLICY "allow read batteries_state" ON public.batteries_state
      FOR SELECT USING (true);
  END IF;
END $$;

-- storage_dispatch_logs (superset schema to accept different writers)
CREATE TABLE IF NOT EXISTS public.storage_dispatch_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province text,
  battery_id uuid,
  action text,
  power_mw double precision,
  duration_hours double precision,
  magnitude_mw double precision,
  soc_before_percent double precision,
  soc_after_percent double precision,
  soc_before_pct double precision,
  soc_after_pct double precision,
  soc_before_mwh double precision,
  soc_after_mwh double precision,
  reason text,
  expected_revenue_cad double precision,
  actual_revenue_cad double precision,
  renewable_absorption boolean,
  curtailment_mitigation boolean,
  curtailment_risk_detected boolean,
  grid_service text,
  grid_price_cad_per_mwh double precision,
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  decision_timestamp timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.storage_dispatch_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'storage_dispatch_logs'
      AND policyname = 'allow read storage_dispatch_logs'
  ) THEN
    CREATE POLICY "allow read storage_dispatch_logs" ON public.storage_dispatch_logs
      FOR SELECT USING (true);
  END IF;
END $$;

-- provincial_generation
CREATE TABLE IF NOT EXISTS public.provincial_generation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date,
  province_code text,
  source text,
  generation_gwh double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pg_date_prov ON public.provincial_generation (date, province_code);
ALTER TABLE public.provincial_generation ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'provincial_generation'
      AND policyname = 'allow read provincial_generation'
  ) THEN
    CREATE POLICY "allow read provincial_generation" ON public.provincial_generation FOR SELECT USING (true);
  END IF;
END $$;

-- ontario_hourly_demand
CREATE TABLE IF NOT EXISTS public.ontario_hourly_demand (
  hour timestamptz PRIMARY KEY,
  market_demand_mw double precision,
  ontario_demand_mw double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ontario_hourly_demand ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ontario_hourly_demand'
      AND policyname = 'allow read ontario_hourly_demand'
  ) THEN
    CREATE POLICY "allow read ontario_hourly_demand" ON public.ontario_hourly_demand FOR SELECT USING (true);
  END IF;
END $$;

-- ontario_prices
CREATE TABLE IF NOT EXISTS public.ontario_prices (
  datetime timestamptz PRIMARY KEY,
  hoep double precision,
  global_adjustment double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ontario_prices ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ontario_prices'
      AND policyname = 'allow read ontario_prices'
  ) THEN
    CREATE POLICY "allow read ontario_prices" ON public.ontario_prices FOR SELECT USING (true);
  END IF;
END $$;

-- forecast_performance_metrics (minimal fields)
CREATE TABLE IF NOT EXISTS public.forecast_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mae double precision,
  timestamp timestamptz,
  calculated_at timestamptz,
  solar_mae_percent double precision,
  wind_mae_percent double precision,
  confidence_score double precision
);
ALTER TABLE public.forecast_performance_metrics ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'forecast_performance_metrics'
      AND policyname = 'allow read forecast_performance_metrics'
  ) THEN
    CREATE POLICY "allow read forecast_performance_metrics" ON public.forecast_performance_metrics FOR SELECT USING (true);
  END IF;
END $$;

-- renewable_forecasts (fallback)
CREATE TABLE IF NOT EXISTS public.renewable_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  predicted_output_mw double precision,
  generated_at timestamptz
);
ALTER TABLE public.renewable_forecasts ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'renewable_forecasts'
      AND policyname = 'allow read renewable_forecasts'
  ) THEN
    CREATE POLICY "allow read renewable_forecasts" ON public.renewable_forecasts FOR SELECT USING (true);
  END IF;
END $$;

-- data_purge_log
CREATE TABLE IF NOT EXISTS public.data_purge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purged_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.data_purge_log ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'data_purge_log'
      AND policyname = 'allow read data_purge_log'
  ) THEN
    CREATE POLICY "allow read data_purge_log" ON public.data_purge_log FOR SELECT USING (true);
  END IF;
END $$;

-- error_logs
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'error_logs'
      AND policyname = 'allow read error_logs'
  ) THEN
    CREATE POLICY "allow read error_logs" ON public.error_logs FOR SELECT USING (true);
  END IF;
END $$;

-- job_execution_log
CREATE TABLE IF NOT EXISTS public.job_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at timestamptz NOT NULL DEFAULT now(),
  status text
);
ALTER TABLE public.job_execution_log ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'job_execution_log'
      AND policyname = 'allow read job_execution_log'
  ) THEN
    CREATE POLICY "allow read job_execution_log" ON public.job_execution_log FOR SELECT USING (true);
  END IF;
END $$;

-- consent_logs
CREATE TABLE IF NOT EXISTS public.consent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  consent_type text,
  consent_value boolean,
  consent_logged_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'consent_logs'
      AND policyname = 'allow read consent_logs'
  ) THEN
    CREATE POLICY "allow read consent_logs" ON public.consent_logs FOR SELECT USING (true);
  END IF;
END $$;

-- minimal seeds to avoid nulls (no-op if data exists)
INSERT INTO public.provincial_generation (date, province_code, source, generation_gwh)
VALUES (current_date, 'ON', 'nuclear', 200.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.ontario_hourly_demand (hour, market_demand_mw, ontario_demand_mw)
VALUES (now(), 15000, 14800)
ON CONFLICT DO NOTHING;

INSERT INTO public.ontario_prices (datetime, hoep, global_adjustment)
VALUES (now(), 45.0, 12.0)
ON CONFLICT DO NOTHING;

COMMIT;
