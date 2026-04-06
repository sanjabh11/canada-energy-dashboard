-- Migration: Create contact_leads table for lead capture
-- Date: 2026-03-24
-- Triggered by: QA BUG-01 — Lead capture was a frontend simulation with no persistence

CREATE TABLE IF NOT EXISTS public.contact_leads (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  name         TEXT        NOT NULL CHECK (char_length(name) <= 255),
  email        TEXT        NOT NULL CHECK (char_length(email) <= 255),
  company      TEXT        CHECK (char_length(company) <= 2000),
  subject      TEXT        NOT NULL CHECK (char_length(subject) <= 500),
  message      TEXT        NOT NULL CHECK (char_length(message) <= 2000),
  inquiry_type TEXT        NOT NULL DEFAULT 'general' CHECK (char_length(inquiry_type) <= 50),
  source       TEXT        CHECK (char_length(source) <= 500),
  status       TEXT        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'spam'))
);

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS contact_leads_created_at_idx ON public.contact_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS contact_leads_status_idx ON public.contact_leads (status);
CREATE INDEX IF NOT EXISTS contact_leads_email_idx ON public.contact_leads (email);

-- RLS: Enable row-level security so anon/public cannot read leads
ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;

-- No public SELECT/UPDATE/DELETE policies — only service_role (Edge Function) can write
-- Admins use the Supabase dashboard or server-side queries with service_role key

COMMENT ON TABLE public.contact_leads IS 'Contact form submissions from the CEIP website. Written by lead-capture Edge Function using service_role. No public access.';
COMMENT ON COLUMN public.contact_leads.status IS 'Workflow status: new (unread), in_progress (being handled), resolved, spam';
