BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.utility_connector_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_kind text NOT NULL CHECK (connector_kind IN (
    'ontario_green_button_cmd',
    'utility_batch_csv',
    'alberta_settlement_batch',
    'telemetry_gateway_http'
  )),
  source_kind text NOT NULL CHECK (source_kind IN (
    'utility_system_batch',
    'utility_settlement_batch',
    'green_button_cmd',
    'telemetry_gateway'
  )),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending_auth',
    'active',
    'stale',
    'revoked',
    'failed'
  )),
  jurisdiction text NOT NULL CHECK (jurisdiction IN ('Ontario', 'Alberta')),
  utility_name text NOT NULL,
  display_name text NOT NULL,
  account_holder_ref text,
  last_synced_at timestamptz,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jurisdiction, connector_kind, display_name)
);

CREATE TABLE IF NOT EXISTS public.utility_connector_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_account_id uuid NOT NULL REFERENCES public.utility_connector_accounts(id) ON DELETE CASCADE,
  token_label text NOT NULL DEFAULT 'default',
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  registration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connector_account_id, token_label)
);

CREATE TABLE IF NOT EXISTS public.utility_connector_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_account_id uuid REFERENCES public.utility_connector_accounts(id) ON DELETE SET NULL,
  run_type text NOT NULL CHECK (run_type IN ('auth', 'sync', 'batch_import', 'telemetry_ingest')),
  status text NOT NULL CHECK (status IN ('success', 'failure')),
  observed_at timestamptz,
  row_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.utility_connector_payload_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_account_id uuid REFERENCES public.utility_connector_accounts(id) ON DELETE SET NULL,
  payload_kind text NOT NULL CHECK (payload_kind IN ('batch_csv', 'batch_json', 'green_button_xml', 'telemetry_json')),
  payload_sha256 text NOT NULL,
  raw_payload text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.utility_interval_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_account_id uuid REFERENCES public.utility_connector_accounts(id) ON DELETE SET NULL,
  jurisdiction text NOT NULL CHECK (jurisdiction IN ('Ontario', 'Alberta')),
  source_kind text NOT NULL CHECK (source_kind IN (
    'utility_system_batch',
    'utility_settlement_batch',
    'green_button_cmd'
  )),
  source_system text,
  observed_at timestamptz NOT NULL,
  geography_level text NOT NULL CHECK (geography_level IN ('system', 'substation', 'feeder')),
  geography_id text NOT NULL,
  customer_class text NOT NULL,
  demand_mw numeric NOT NULL,
  weather_zone text,
  temperature_c numeric,
  net_load_mw numeric,
  gross_load_mw numeric,
  gross_reconstituted_mw numeric,
  customer_count numeric,
  feeder_id text,
  substation_id text,
  quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.utility_telemetry_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_account_id uuid REFERENCES public.utility_connector_accounts(id) ON DELETE SET NULL,
  jurisdiction text NOT NULL CHECK (jurisdiction IN ('Ontario', 'Alberta')),
  source_kind text NOT NULL DEFAULT 'telemetry_gateway' CHECK (source_kind = 'telemetry_gateway'),
  observed_at timestamptz NOT NULL,
  geography_level text NOT NULL CHECK (geography_level IN ('system', 'substation', 'feeder')),
  geography_id text NOT NULL,
  feeder_id text,
  substation_id text,
  load_mw numeric,
  voltage_kv numeric,
  transformer_utilization_pct numeric,
  outage_state text CHECK (outage_state IN ('normal', 'watch', 'outage', 'restoration')),
  quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_utility_connector_accounts_jurisdiction ON public.utility_connector_accounts(jurisdiction, connector_kind);
CREATE INDEX IF NOT EXISTS idx_utility_connector_sync_runs_account_created ON public.utility_connector_sync_runs(connector_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_utility_interval_history_observed ON public.utility_interval_history(jurisdiction, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_utility_interval_history_geography ON public.utility_interval_history(geography_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_utility_telemetry_snapshots_observed ON public.utility_telemetry_snapshots(jurisdiction, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_utility_telemetry_snapshots_geography ON public.utility_telemetry_snapshots(geography_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_utility_connector_payload_audit_ingested ON public.utility_connector_payload_audit(ingested_at DESC);

ALTER TABLE public.utility_connector_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_connector_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_connector_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_connector_payload_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_interval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_telemetry_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'utility_connector_accounts' AND policyname = 'utility_connector_accounts_read_all'
  ) THEN
    CREATE POLICY utility_connector_accounts_read_all
      ON public.utility_connector_accounts
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'utility_connector_sync_runs' AND policyname = 'utility_connector_sync_runs_read_all'
  ) THEN
    CREATE POLICY utility_connector_sync_runs_read_all
      ON public.utility_connector_sync_runs
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'utility_connector_accounts',
    'utility_connector_tokens',
    'utility_connector_sync_runs',
    'utility_connector_payload_audit',
    'utility_interval_history',
    'utility_telemetry_snapshots'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = table_name
        AND policyname = table_name || '_service_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')',
        table_name || '_service_all',
        table_name
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
