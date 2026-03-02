-- ============================================================================
-- LEAD LIFECYCLE SCHEMA
-- ============================================================================
-- Tracks lead intent, lifecycle state, and nurture orchestration
-- Part of: PBI-OpenClaw-Monetization-Orchestration-T1
-- Created: 2026-02-28

-- ============================================================================
-- LEAD INTENT TABLE
-- ============================================================================
-- Captures user intent signals from funnel interactions
CREATE TABLE IF NOT EXISTS public.lead_intent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    email TEXT,
    intent_type TEXT NOT NULL CHECK (intent_type IN (
        'pricing_view',
        'pricing_cta_click',
        'email_captured',
        'checkout_initiated',
        'checkout_abandoned',
        'checkout_complete',
        'municipal_inquiry',
        'indigenous_inquiry',
        'industrial_inquiry',
        'upgrade_prompt_shown',
        'upgrade_prompt_clicked'
    )),
    intent_data JSONB DEFAULT '{}'::jsonb,
    tier TEXT,
    persona TEXT,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_lead_intent_user_id ON public.lead_intent(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_intent_email ON public.lead_intent(email);
CREATE INDEX IF NOT EXISTS idx_lead_intent_type ON public.lead_intent(intent_type);
CREATE INDEX IF NOT EXISTS idx_lead_intent_created_at ON public.lead_intent(created_at DESC);

-- ============================================================================
-- LEAD LIFECYCLE TABLE
-- ============================================================================
-- Tracks lead lifecycle state transitions
CREATE TABLE IF NOT EXISTS public.lead_lifecycle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    current_state TEXT NOT NULL CHECK (current_state IN (
        'anonymous',
        'visitor',
        'engaged',
        'captured',
        'checkout_initiated',
        'checkout_abandoned',
        'converted',
        'churned'
    )),
    previous_state TEXT,
    tier_interest TEXT,
    persona TEXT,
    last_intent_at TIMESTAMPTZ,
    state_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookups (primary key for lead tracking)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_lifecycle_email ON public.lead_lifecycle(email);
CREATE INDEX IF NOT EXISTS idx_lead_lifecycle_user_id ON public.lead_lifecycle(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_lifecycle_state ON public.lead_lifecycle(current_state);
CREATE INDEX IF NOT EXISTS idx_lead_lifecycle_updated_at ON public.lead_lifecycle(updated_at DESC);

-- ============================================================================
-- LEAD NURTURE LOG TABLE
-- ============================================================================
-- Tracks nurture actions and cadence
CREATE TABLE IF NOT EXISTS public.lead_nurture_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.lead_lifecycle(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'email_sent',
        'email_opened',
        'email_clicked',
        'reminder_sent',
        'abandoned_cart_email',
        'upgrade_prompt',
        'manual_outreach'
    )),
    action_data JSONB DEFAULT '{}'::jsonb,
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lead lookups
CREATE INDEX IF NOT EXISTS idx_lead_nurture_lead_id ON public.lead_nurture_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_nurture_email ON public.lead_nurture_log(email);
CREATE INDEX IF NOT EXISTS idx_lead_nurture_created_at ON public.lead_nurture_log(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Lead intent: users can view their own intent records
ALTER TABLE public.lead_intent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lead intent"
    ON public.lead_intent FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all lead intent"
    ON public.lead_intent FOR ALL
    USING (auth.role() = 'service_role');

-- Lead lifecycle: users can view their own lifecycle state
ALTER TABLE public.lead_lifecycle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lifecycle state"
    ON public.lead_lifecycle FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all lifecycle states"
    ON public.lead_lifecycle FOR ALL
    USING (auth.role() = 'service_role');

-- Lead nurture log: service role only
ALTER TABLE public.lead_nurture_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all nurture logs"
    ON public.lead_nurture_log FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp on lead_lifecycle
CREATE OR REPLACE FUNCTION update_lead_lifecycle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lead_lifecycle_updated_at
    BEFORE UPDATE ON public.lead_lifecycle
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_lifecycle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.lead_intent IS 'Captures user intent signals from funnel interactions';
COMMENT ON TABLE public.lead_lifecycle IS 'Tracks lead lifecycle state transitions with deterministic rules';
COMMENT ON TABLE public.lead_nurture_log IS 'Tracks nurture actions and cadence for lead engagement';
