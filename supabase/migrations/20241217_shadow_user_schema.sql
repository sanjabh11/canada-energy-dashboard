-- Shadow User Schema Migration
-- WHOP PORTABILITY PATTERN (whop_criterias.md Section 6.1)
--
-- "Create a Users table with a generic, internally generated UUID (user_uuid).
--  Create an IdentityProviders table that links your user_uuid to the whop_user_id."
--
-- This schema ensures we OWN user identity data and can swap auth providers.

-- ============================================================================
-- USERS TABLE (Internal Identity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================================================
-- IDENTITY PROVIDERS TABLE (Shadow User Pattern)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.identity_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('whop', 'google', 'email', 'guest')),
    provider_id TEXT NOT NULL,
    provider_email TEXT,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Ensure one provider account can only link to one user
    UNIQUE(provider, provider_id)
);

-- Index for provider lookups
CREATE INDEX IF NOT EXISTS idx_identity_providers_provider ON public.identity_providers(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_identity_providers_user ON public.identity_providers(user_id);

-- ============================================================================
-- ENTITLEMENTS TABLE (Local Cache)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'basic', 'pro', 'team')),
    status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'expired')),
    provider TEXT NOT NULL CHECK (provider IN ('whop', 'stripe', 'lemon_squeezy', 'manual')),
    provider_id TEXT NOT NULL,
    product_id TEXT,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Legacy columns for backwards compatibility
    whop_user_id TEXT
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_entitlements_user ON public.entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_whop ON public.entitlements(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_provider ON public.entitlements(provider, provider_id);

-- ============================================================================
-- WEBHOOK EVENTS TABLE (Idempotency)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    provider TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    payload JSONB,
    error_message TEXT
);

-- Index for event lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_event ON public.webhook_events(event_id);

-- ============================================================================
-- PAYMENTS TABLE (Transaction History)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    provider TEXT NOT NULL CHECK (provider IN ('whop', 'stripe', 'lemon_squeezy')),
    provider_payment_id TEXT NOT NULL,
    product_id TEXT,
    amount_cents INTEGER,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Legacy columns
    whop_payment_id TEXT,
    whop_user_id TEXT
);

-- Index for payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments(provider, provider_payment_id);

-- ============================================================================
-- CAPTURED EMAILS TABLE (Dual Capture Pattern)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.captured_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    plan_id TEXT,
    source TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_captured_emails_email ON public.captured_emails(email);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access on users"
    ON public.users FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on identity_providers"
    ON public.identity_providers FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on entitlements"
    ON public.entitlements FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on payments"
    ON public.payments FOR ALL
    USING (auth.role() = 'service_role');

-- Users can read their own data
CREATE POLICY "Users can view own data"
    ON public.users FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can view own identity providers"
    ON public.identity_providers FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view own entitlements"
    ON public.entitlements FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view own payments"
    ON public.payments FOR SELECT
    USING (user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entitlements_updated_at
    BEFORE UPDATE ON public.entitlements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.users IS 'Internal user identity (Shadow User pattern)';
COMMENT ON TABLE public.identity_providers IS 'Links external auth providers to internal users';
COMMENT ON TABLE public.entitlements IS 'Cached subscription/access state from billing providers';
COMMENT ON TABLE public.webhook_events IS 'Idempotency log for processed webhooks';
COMMENT ON TABLE public.payments IS 'Transaction history for all providers';
COMMENT ON TABLE public.captured_emails IS 'Pre-checkout email capture for owned marketing list';
