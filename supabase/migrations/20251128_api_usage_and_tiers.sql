-- Extend api_keys with tier and daily_limit, add api_usage tracking table

-- Add tier and daily_limit columns to api_keys
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS daily_limit INT DEFAULT 100;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS organization TEXT;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS use_case TEXT;

-- API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INT DEFAULT 1,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_key_date ON api_usage(api_key_id, date);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage FORCE ROW LEVEL SECURITY;

REVOKE ALL ON api_usage FROM PUBLIC;
REVOKE ALL ON api_usage FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON api_usage TO service_role;

-- Helper function to check rate limit
CREATE OR REPLACE FUNCTION check_api_rate_limit(p_api_key TEXT)
RETURNS TABLE(allowed BOOLEAN, remaining INT, daily_limit INT, tier TEXT) AS $$
DECLARE
  v_key_id UUID;
  v_tier TEXT;
  v_daily_limit INT;
  v_today_count INT;
BEGIN
  -- Get key info
  SELECT id, api_keys.tier, api_keys.daily_limit
  INTO v_key_id, v_tier, v_daily_limit
  FROM api_keys
  WHERE api_key = p_api_key AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_key_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'invalid'::TEXT;
    RETURN;
  END IF;

  -- Get today's usage
  SELECT COALESCE(SUM(request_count), 0)
  INTO v_today_count
  FROM api_usage
  WHERE api_key_id = v_key_id AND date = CURRENT_DATE;

  -- Return result
  RETURN QUERY SELECT
    (v_today_count < v_daily_limit) AS allowed,
    GREATEST(0, v_daily_limit - v_today_count) AS remaining,
    v_daily_limit,
    v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to record API usage
CREATE OR REPLACE FUNCTION record_api_usage(p_api_key TEXT, p_endpoint TEXT)
RETURNS VOID AS $$
DECLARE
  v_key_id UUID;
BEGIN
  SELECT id INTO v_key_id FROM api_keys WHERE api_key = p_api_key;
  IF v_key_id IS NULL THEN RETURN; END IF;

  INSERT INTO api_usage (api_key_id, endpoint, date, request_count)
  VALUES (v_key_id, p_endpoint, CURRENT_DATE, 1)
  ON CONFLICT (api_key_id, endpoint, date)
  DO UPDATE SET request_count = api_usage.request_count + 1;

  -- Update last_used_at and usage_count on api_keys
  UPDATE api_keys
  SET last_used_at = NOW(), usage_count = usage_count + 1
  WHERE id = v_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add unique constraint for upsert
ALTER TABLE api_usage DROP CONSTRAINT IF EXISTS api_usage_key_endpoint_date_unique;
ALTER TABLE api_usage ADD CONSTRAINT api_usage_key_endpoint_date_unique UNIQUE (api_key_id, endpoint, date);
