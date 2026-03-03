-- ============================================================================
-- GTM PIPELINE ENTITIES
-- ============================================================================
-- Purpose: Hybrid GTM execution model (Whop wedge + direct closes)
-- Adds structured entities for leads, outreach, discovery, pilots, offers, attribution
-- Created: 2026-03-03

-- --------------------------------------------------------------------------
-- Shared updated_at trigger function for GTM tables
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_gtm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- Accounts
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN (
    'whop_founder',
    'consultancy',
    'municipal',
    'industrial',
    'indigenous',
    'other'
  )),
  source_tier SMALLINT NOT NULL DEFAULT 1 CHECK (source_tier IN (1, 2, 3)),
  region TEXT DEFAULT 'CA',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_name_domain
  ON public.accounts (LOWER(name), COALESCE(LOWER(domain), ''));
CREATE INDEX IF NOT EXISTS idx_accounts_account_type ON public.accounts (account_type);

-- --------------------------------------------------------------------------
-- Leads
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  role_title TEXT,
  linkedin_url TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new',
    'contacted',
    'replied',
    'qualified',
    'disqualified',
    'won',
    'lost'
  )),
  owner TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email ON public.leads (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON public.leads (account_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);

-- --------------------------------------------------------------------------
-- Lead Intake Submissions (browser-safe insert target)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_intake_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  team_size TEXT,
  industry TEXT,
  message TEXT,
  source_route TEXT NOT NULL DEFAULT '/enterprise',
  channel TEXT NOT NULL DEFAULT 'direct',
  segment TEXT NOT NULL DEFAULT 'consultancy',
  campaign_id TEXT NOT NULL DEFAULT 'enterprise_2026q1',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'qualified', 'disqualified', 'contacted')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_intake_created_at ON public.lead_intake_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_intake_status ON public.lead_intake_submissions (status);
CREATE INDEX IF NOT EXISTS idx_lead_intake_segment_campaign ON public.lead_intake_submissions (segment, campaign_id);

-- --------------------------------------------------------------------------
-- Offers
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('whop', 'direct', 'partner')),
  segment TEXT NOT NULL,
  price_amount NUMERIC(12, 2),
  price_currency TEXT NOT NULL DEFAULT 'USD',
  billing_interval TEXT NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month', 'year', 'one_time')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_channel_segment ON public.offers (channel, segment);

-- --------------------------------------------------------------------------
-- Outreach Events
-- Standard attribution contract fields:
-- channel, segment, message_variant, cta, campaign_id
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outreach_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'sent',
    'opened',
    'replied',
    'call_booked',
    'call_completed',
    'follow_up',
    'note'
  )),
  sequence_step INTEGER,
  channel TEXT NOT NULL,
  segment TEXT NOT NULL,
  message_variant TEXT NOT NULL,
  cta TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_events_lead_id ON public.outreach_events (lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_events_campaign ON public.outreach_events (campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_events_contract ON public.outreach_events (channel, segment, message_variant, cta);

-- --------------------------------------------------------------------------
-- Discovery Notes
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discovery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  call_date DATE NOT NULL,
  acquisition_pain BOOLEAN NOT NULL DEFAULT FALSE,
  retention_churn_pain BOOLEAN NOT NULL DEFAULT FALSE,
  credibility_compliance_pain BOOLEAN NOT NULL DEFAULT FALSE,
  reporting_export_pain BOOLEAN NOT NULL DEFAULT FALSE,
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_notes_call_date ON public.discovery_notes (call_date DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_notes_account_id ON public.discovery_notes (account_id);

-- --------------------------------------------------------------------------
-- Pilot Outcomes
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pilot_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  pilot_code TEXT NOT NULL,
  segment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned',
    'running',
    'completed',
    'cancelled'
  )),
  start_date DATE,
  end_date DATE,
  success_metric TEXT,
  target_value NUMERIC(14, 2),
  actual_value NUMERIC(14, 2),
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pilot_outcomes_account_code
  ON public.pilot_outcomes (account_id, pilot_code);
CREATE INDEX IF NOT EXISTS idx_pilot_outcomes_segment_status ON public.pilot_outcomes (segment, status);

-- --------------------------------------------------------------------------
-- Attribution Events
-- Standard attribution contract fields:
-- channel, segment, message_variant, cta, campaign_id
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attribution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  session_id TEXT,
  page_path TEXT,
  referrer TEXT,
  channel TEXT NOT NULL,
  segment TEXT NOT NULL,
  message_variant TEXT NOT NULL,
  cta TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attribution_events_created_at ON public.attribution_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attribution_events_campaign ON public.attribution_events (campaign_id);
CREATE INDEX IF NOT EXISTS idx_attribution_events_contract ON public.attribution_events (channel, segment, message_variant, cta);

-- --------------------------------------------------------------------------
-- Triggers: updated_at maintenance
-- --------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_accounts_updated_at ON public.accounts;
CREATE TRIGGER trigger_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gtm_updated_at();

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON public.leads;
CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gtm_updated_at();

DROP TRIGGER IF EXISTS trigger_lead_intake_submissions_updated_at ON public.lead_intake_submissions;
CREATE TRIGGER trigger_lead_intake_submissions_updated_at
  BEFORE UPDATE ON public.lead_intake_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gtm_updated_at();

DROP TRIGGER IF EXISTS trigger_offers_updated_at ON public.offers;
CREATE TRIGGER trigger_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gtm_updated_at();

DROP TRIGGER IF EXISTS trigger_discovery_notes_updated_at ON public.discovery_notes;
CREATE TRIGGER trigger_discovery_notes_updated_at
  BEFORE UPDATE ON public.discovery_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gtm_updated_at();

DROP TRIGGER IF EXISTS trigger_pilot_outcomes_updated_at ON public.pilot_outcomes;
CREATE TRIGGER trigger_pilot_outcomes_updated_at
  BEFORE UPDATE ON public.pilot_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gtm_updated_at();

-- --------------------------------------------------------------------------
-- RLS: service-role managed GTM operations
-- --------------------------------------------------------------------------
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_intake_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribution_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role manage accounts" ON public.accounts;
CREATE POLICY "service role manage accounts"
  ON public.accounts FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service role manage leads" ON public.leads;
CREATE POLICY "service role manage leads"
  ON public.leads FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service role manage lead_intake_submissions" ON public.lead_intake_submissions;
CREATE POLICY "service role manage lead_intake_submissions"
  ON public.lead_intake_submissions FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service role manage offers" ON public.offers;
CREATE POLICY "service role manage offers"
  ON public.offers FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service role manage outreach_events" ON public.outreach_events;
CREATE POLICY "service role manage outreach_events"
  ON public.outreach_events FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service role manage discovery_notes" ON public.discovery_notes;
CREATE POLICY "service role manage discovery_notes"
  ON public.discovery_notes FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service role manage pilot_outcomes" ON public.pilot_outcomes;
CREATE POLICY "service role manage pilot_outcomes"
  ON public.pilot_outcomes FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service role manage attribution_events" ON public.attribution_events;
CREATE POLICY "service role manage attribution_events"
  ON public.attribution_events FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "anon and authenticated can insert attribution_events" ON public.attribution_events;
CREATE POLICY "anon and authenticated can insert attribution_events"
  ON public.attribution_events FOR INSERT
  WITH CHECK (auth.role() IN ('anon', 'authenticated', 'service_role'));

DROP POLICY IF EXISTS "anon and authenticated can insert lead_intake_submissions" ON public.lead_intake_submissions;
CREATE POLICY "anon and authenticated can insert lead_intake_submissions"
  ON public.lead_intake_submissions FOR INSERT
  WITH CHECK (auth.role() IN ('anon', 'authenticated', 'service_role'));

-- --------------------------------------------------------------------------
-- Weekly GTM summary view (for stop-rule operations)
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.gtm_weekly_funnel_summary AS
WITH event_counts AS (
  SELECT
    date_trunc('week', ae.created_at)::date AS week_start,
    ae.channel,
    ae.segment,
    ae.campaign_id,
    COUNT(*) FILTER (WHERE ae.event_name = 'gtm_route_intent_view') AS route_views,
    COUNT(*) FILTER (WHERE ae.event_name = 'gtm_route_intent_cta') AS cta_clicks,
    COUNT(*) FILTER (WHERE ae.event_name = 'gtm_route_intent_cta' AND ae.cta = 'submit_contact_form') AS submit_cta_clicks
  FROM public.attribution_events ae
  GROUP BY 1, 2, 3, 4
),
lead_counts AS (
  SELECT
    date_trunc('week', lis.created_at)::date AS week_start,
    lis.channel,
    lis.segment,
    lis.campaign_id,
    COUNT(*) AS lead_submissions
  FROM public.lead_intake_submissions lis
  GROUP BY 1, 2, 3, 4
)
SELECT
  COALESCE(ec.week_start, lc.week_start) AS week_start,
  COALESCE(ec.channel, lc.channel) AS channel,
  COALESCE(ec.segment, lc.segment) AS segment,
  COALESCE(ec.campaign_id, lc.campaign_id) AS campaign_id,
  COALESCE(ec.route_views, 0) AS route_views,
  COALESCE(ec.cta_clicks, 0) AS cta_clicks,
  COALESCE(ec.submit_cta_clicks, 0) AS submit_cta_clicks,
  COALESCE(lc.lead_submissions, 0) AS lead_submissions
FROM event_counts ec
FULL OUTER JOIN lead_counts lc
  ON ec.week_start = lc.week_start
 AND ec.channel = lc.channel
 AND ec.segment = lc.segment
 AND ec.campaign_id = lc.campaign_id;

GRANT SELECT ON public.gtm_weekly_funnel_summary TO authenticated;
GRANT SELECT ON public.gtm_weekly_funnel_summary TO anon;

-- --------------------------------------------------------------------------
-- Seed minimal offers aligned to hybrid motion
-- --------------------------------------------------------------------------
INSERT INTO public.offers (offer_code, name, description, channel, segment, price_amount, billing_interval)
VALUES
  ('whop_wedge_watchdog', 'Rate Watchdog + Energy Benchmark Mini-Suite', 'Whop-native wedge offer for creator/prosumer audiences', 'whop', 'whop_business_ai', 29, 'month'),
  ('consultancy_data_pack', 'Canadian Energy Data Pack + Forecast Benchmark Export', 'Direct consultancy offer with recurring analyst brief', 'direct', 'consultancy', 149, 'month'),
  ('municipal_compliance_pack', 'Municipal Compliance Narrative Pack', 'Regulatory and reporting support package', 'direct', 'municipal', 5900, 'month')
ON CONFLICT (offer_code) DO NOTHING;

COMMENT ON TABLE public.accounts IS 'Target accounts for CEIP hybrid GTM motion';
COMMENT ON TABLE public.leads IS 'Contacts associated with target accounts';
COMMENT ON TABLE public.outreach_events IS 'Outbound and response events with attribution contract fields';
COMMENT ON TABLE public.discovery_notes IS 'Structured discovery notes with pain taxonomy';
COMMENT ON TABLE public.pilot_outcomes IS '14-day pilot tracking and conversion outcomes';
COMMENT ON TABLE public.offers IS 'Offer catalog for Whop/direct routes';
COMMENT ON TABLE public.attribution_events IS 'Route and campaign attribution events with standardized contract';
COMMENT ON TABLE public.lead_intake_submissions IS 'Inbound contact requests captured from acquisition routes';
