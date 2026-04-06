-- Consent flags for Indigenous TEK entries and consultations

BEGIN;

-- TEK entries: add consent_type for access control (open vs private/sensitive)
ALTER TABLE public.indigenous_tek_entries
  ADD COLUMN IF NOT EXISTS consent_type text NOT NULL DEFAULT 'public';

-- Consultations: add consent_type to distinguish public vs private meeting records
ALTER TABLE public.indigenous_consultations
  ADD COLUMN IF NOT EXISTS consent_type text NOT NULL DEFAULT 'public';

COMMIT;
