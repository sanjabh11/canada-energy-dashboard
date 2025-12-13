-- Rate Alert Subscriptions Table
-- Stores email subscriptions for Alberta RRO rate alerts

CREATE TABLE IF NOT EXISTS rate_alert_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    threshold_cents NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    alert_type TEXT NOT NULL DEFAULT 'immediate' CHECK (alert_type IN ('immediate', 'daily_digest')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_alerted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_alert_subscriptions_active 
    ON rate_alert_subscriptions(is_active) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rate_alert_subscriptions_threshold 
    ON rate_alert_subscriptions(threshold_cents);

-- Enable RLS
ALTER TABLE rate_alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous inserts (for subscription form)
CREATE POLICY "Allow anonymous subscription" 
    ON rate_alert_subscriptions 
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Policy: Allow service role full access
CREATE POLICY "Service role full access" 
    ON rate_alert_subscriptions 
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Users can view and update their own subscription
CREATE POLICY "Users can manage own subscription" 
    ON rate_alert_subscriptions 
    FOR ALL 
    TO authenticated
    USING (email = auth.jwt() ->> 'email')
    WITH CHECK (email = auth.jwt() ->> 'email');

-- Comment on table
COMMENT ON TABLE rate_alert_subscriptions IS 'Stores email subscriptions for Alberta RRO rate alerts from Rate Watchdog';
COMMENT ON COLUMN rate_alert_subscriptions.threshold_cents IS 'Alert threshold in cents per kWh';
COMMENT ON COLUMN rate_alert_subscriptions.alert_type IS 'immediate = send when threshold exceeded, daily_digest = daily summary';
