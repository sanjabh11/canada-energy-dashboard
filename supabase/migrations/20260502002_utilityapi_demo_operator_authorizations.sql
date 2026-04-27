CREATE TABLE IF NOT EXISTS public.utilityapi_demo_operator_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_user_id uuid NOT NULL,
  operator_email text NOT NULL,
  scenario text NOT NULL,
  utility text NOT NULL DEFAULT 'DEMO',
  referral text,
  authorization_uid text,
  meter_uids text[] NOT NULL DEFAULT '{}',
  last_stage text,
  last_status text,
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_polled_at timestamptz,
  last_synced_at timestamptz,
  revoked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_utilityapi_demo_operator_authorizations_auth_uid
  ON public.utilityapi_demo_operator_authorizations(authorization_uid)
  WHERE authorization_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_utilityapi_demo_operator_authorizations_operator_lookup
  ON public.utilityapi_demo_operator_authorizations(operator_user_id, scenario, utility, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_utilityapi_demo_operator_authorizations_started_at
  ON public.utilityapi_demo_operator_authorizations(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_utilityapi_demo_operator_authorizations_referral
  ON public.utilityapi_demo_operator_authorizations(referral)
  WHERE referral IS NOT NULL;

ALTER TABLE public.utilityapi_demo_operator_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilityapi_demo_operator_authorizations FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.utilityapi_demo_operator_authorizations FROM PUBLIC;
REVOKE ALL ON public.utilityapi_demo_operator_authorizations FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utilityapi_demo_operator_authorizations TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'utilityapi_demo_operator_authorizations'
      AND policyname = 'utilityapi_demo_operator_authorizations_service_role_only'
  ) THEN
    CREATE POLICY utilityapi_demo_operator_authorizations_service_role_only
      ON public.utilityapi_demo_operator_authorizations
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
