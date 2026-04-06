-- Indigenous project-level consent table for OCAP-aligned governance

BEGIN;

CREATE TABLE IF NOT EXISTS public.indigenous_project_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.indigenous_projects_v2(id) ON DELETE CASCADE,
  territory_id uuid REFERENCES public.indigenous_territories(id) ON DELETE CASCADE,
  consent_type text NOT NULL DEFAULT 'public', -- 'public', 'aggregated', 'private'
  granted_by text,
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  notes text
);

-- One consent record per project (latest wins if application logic upserts)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.indigenous_project_consent
      ADD CONSTRAINT indigenous_project_consent_project_unique UNIQUE (project_id);
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END$$;

ALTER TABLE public.indigenous_project_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indigenous_project_consent FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.indigenous_project_consent FROM PUBLIC;
REVOKE ALL ON public.indigenous_project_consent FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.indigenous_project_consent TO service_role;

COMMIT;
