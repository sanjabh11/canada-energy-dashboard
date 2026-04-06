-- API keys for ESG Finance and Industrial Decarbonization external access

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  api_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by uuid,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;

REVOKE ALL ON api_keys FROM PUBLIC;
REVOKE ALL ON api_keys FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO service_role;
