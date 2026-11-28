-- Bind new Green Button connector state to the application's verified shadow user.
-- Existing unowned rows remain quarantined and are intentionally not backfilled.

BEGIN;

ALTER TABLE public.utility_connector_accounts
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS public.idx_utility_connector_accounts_jurisdiction;
CREATE INDEX IF NOT EXISTS idx_utility_connector_accounts_jurisdiction
  ON public.utility_connector_accounts(jurisdiction, connector_kind, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_utility_connector_accounts_owner
  ON public.utility_connector_accounts(owner_user_id, jurisdiction, connector_kind, updated_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.utility_connector_accounts'::regclass
      AND conname = 'utility_connector_accounts_jurisdiction_connector_kind_display_name_key'
  ) THEN
    ALTER TABLE public.utility_connector_accounts
      DROP CONSTRAINT utility_connector_accounts_jurisdiction_connector_kind_display_name_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.utility_connector_accounts'::regclass
      AND conname = 'utility_connector_accounts_owner_jurisdiction_kind_display_key'
  ) THEN
    ALTER TABLE public.utility_connector_accounts
      ADD CONSTRAINT utility_connector_accounts_owner_jurisdiction_kind_display_key
      UNIQUE (owner_user_id, jurisdiction, connector_kind, display_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.utility_connector_accounts'::regclass
      AND conname = 'utility_connector_accounts_green_button_owner_required'
  ) THEN
    ALTER TABLE public.utility_connector_accounts
      ADD CONSTRAINT utility_connector_accounts_green_button_owner_required
      CHECK (connector_kind <> 'ontario_green_button_cmd' OR owner_user_id IS NOT NULL)
      NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_utility_connector_accounts_legacy_identity
  ON public.utility_connector_accounts(jurisdiction, connector_kind, display_name)
  WHERE owner_user_id IS NULL;

CREATE TABLE IF NOT EXISTS public.utility_connector_auth_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text UNIQUE NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  connector_id text NOT NULL,
  utility_name text NOT NULL,
  display_name text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_utility_connector_auth_requests_expiry
  ON public.utility_connector_auth_requests(expires_at, used_at);
CREATE INDEX IF NOT EXISTS idx_utility_connector_auth_requests_owner
  ON public.utility_connector_auth_requests(owner_user_id, created_at DESC);

ALTER TABLE public.utility_connector_auth_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.utility_connector_auth_requests FROM anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'utility_connector_auth_requests'
      AND policyname = 'utility_connector_auth_requests_service_all'
  ) THEN
    CREATE POLICY utility_connector_auth_requests_service_all
      ON public.utility_connector_auth_requests
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

COMMENT ON COLUMN public.utility_connector_accounts.owner_user_id IS
  'Internal public.users shadow identity resolved from a verified provider session; never client-supplied.';

COMMENT ON TABLE public.utility_connector_auth_requests IS
  'Short-lived, single-use Green Button OAuth states bound to a verified shadow user. Service-role only.';

COMMENT ON CONSTRAINT utility_connector_accounts_green_button_owner_required
  ON public.utility_connector_accounts IS
  'New Green Button accounts must be owner-bound; legacy unowned rows remain quarantined until explicitly migrated.';

COMMIT;
