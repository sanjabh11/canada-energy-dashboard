BEGIN;

CREATE TABLE IF NOT EXISTS public.utility_connector_bridge_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('bridge_to_supabase', 'supabase_to_bridge')),
  signing_key_id text NOT NULL,
  nonce text NOT NULL,
  issuer text NOT NULL,
  request_id text,
  expires_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (direction, signing_key_id, nonce)
);

CREATE INDEX IF NOT EXISTS idx_utility_connector_bridge_nonces_expires_at
  ON public.utility_connector_bridge_nonces(expires_at);

ALTER TABLE public.utility_connector_bridge_nonces ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'utility_connector_bridge_nonces'
      AND policyname = 'utility_connector_bridge_nonces_service_all'
  ) THEN
    CREATE POLICY utility_connector_bridge_nonces_service_all
      ON public.utility_connector_bridge_nonces
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

COMMIT;
