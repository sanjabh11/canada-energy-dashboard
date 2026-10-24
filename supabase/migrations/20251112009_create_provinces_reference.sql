-- Create the provinces(code, name) reference table before first use.
--
-- 20251113007+ (carbon emissions, cross-border trade, transmission,
-- CCUS) declare REFERENCES provinces(code) and JOIN provinces, but the
-- table is only created later in 20251114001_fix_missing_tables.sql.
-- On a fresh replay the earlier migrations fail on the missing parent.
--
-- Ported from target-only migration `20261023_create_provinces_reference`
-- (deviation ledger entry). 20251114001 remains valid: both its
-- CREATE TABLE IF NOT EXISTS and INSERT ... ON CONFLICT are idempotent.
BEGIN;

CREATE TABLE IF NOT EXISTS public.provinces (
  code CHAR(2) PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO public.provinces (code, name) VALUES
  ('AB', 'Alberta'),
  ('BC', 'British Columbia'),
  ('MB', 'Manitoba'),
  ('NB', 'New Brunswick'),
  ('NL', 'Newfoundland and Labrador'),
  ('NS', 'Nova Scotia'),
  ('ON', 'Ontario'),
  ('PE', 'Prince Edward Island'),
  ('QC', 'Quebec'),
  ('SK', 'Saskatchewan'),
  ('NT', 'Northwest Territories'),
  ('NU', 'Nunavut'),
  ('YT', 'Yukon')
ON CONFLICT (code) DO NOTHING;

-- Read-only reference data: RLS enabled, SELECT open, no client writes.
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.provinces;
CREATE POLICY "Allow public read access" ON public.provinces
  FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.provinces FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.provinces FROM authenticated;

COMMIT;
