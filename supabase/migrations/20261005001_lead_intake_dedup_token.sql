-- APPLY ORDER: this migration MUST land before the netlify/functions/leads.ts
-- version that inserts `dedup_token` as a column — otherwise the insert 400s
-- on the unknown column. Migration first, then function deploy.
--
-- Lead intake deduplication token (audit G6 follow-up).
-- netlify/functions/leads.ts computes a keyed HMAC-SHA-256 dedup token from
-- (normalized email + segment + campaign + source_route + UTC day) and stores
-- it in metadata.dedup_token. This column + partial unique index makes
-- same-day resubmission idempotent at the database layer instead of relying
-- on the application-level check-then-insert race window.
-- The HMAC key remains server-side. Existing rows keep NULL (excluded from
-- the index by the partial predicate).

ALTER TABLE public.lead_intake_submissions
  ADD COLUMN IF NOT EXISTS dedup_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_intake_dedup_token
  ON public.lead_intake_submissions (dedup_token)
  WHERE dedup_token IS NOT NULL;

COMMENT ON COLUMN public.lead_intake_submissions.dedup_token IS
  'Keyed HMAC-SHA-256 of normalized email+segment+campaign+source_route+UTC-day; idempotent same-day dedup (audit G6)';
