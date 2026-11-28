-- Dedup backstop for lead intake: one lead per normalized email.
-- Applied host-side on qktgjpbifknqjpvrgkrj 2026-10-24; ported here so a
-- fresh replay reproduces it. Cannot use CONCURRENTLY inside the migration
-- runner's transaction.
create unique index if not exists contact_leads_lower_email_uniq
  on public.contact_leads (lower(email));
