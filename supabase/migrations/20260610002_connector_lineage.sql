-- =============================================================================
-- B05 – Connector Lineage Schema
-- Migration: 20260610002_connector_lineage.sql
-- =============================================================================
-- Tracks every run of every official data connector for audit,
-- provenance, and data-spine health monitoring.
-- =============================================================================

-- ── connector_lineage table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connector_lineage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          TEXT NOT NULL UNIQUE,           -- connector_id__ISO-timestamp
  connector_id    TEXT NOT NULL,                  -- maps to ConnectorMeta.id
  started_at      TIMESTAMPTZ NOT NULL,
  completed_at    TIMESTAMPTZ,
  status          TEXT NOT NULL CHECK (status IN ('idle','running','success','failed','degraded')),
  records_fetched INT NOT NULL DEFAULT 0,
  records_upserted INT NOT NULL DEFAULT 0,
  records_skipped  INT NOT NULL DEFAULT 0,
  records_failed   INT NOT NULL DEFAULT 0,
  source_url       TEXT NOT NULL,
  source_updated_at TIMESTAMPTZ,
  error_message    TEXT,
  payload_hash     TEXT,                          -- SHA-256 of raw payload for audit reproducibility
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connector_lineage_connector_id ON connector_lineage (connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_lineage_started_at   ON connector_lineage (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_connector_lineage_status       ON connector_lineage (status);

COMMENT ON TABLE connector_lineage IS
  'B05: Audit trail for every official data connector run. '
  'One row per runConnector() invocation. '
  'Never deleted — grow-only for provenance integrity.';

-- ── connector_meta_cache table ────────────────────────────────────────────────
-- Caches the last-known-good metadata for each connector so the
-- data-spine dashboard can surface freshness without calling Edge Functions.
CREATE TABLE IF NOT EXISTS connector_meta_cache (
  connector_id        TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  source_url          TEXT NOT NULL,
  publisher           TEXT NOT NULL,
  license             TEXT NOT NULL,
  refresh_cadence_hrs INT NOT NULL,
  jurisdictions       TEXT[] NOT NULL DEFAULT '{}',
  metric_families     TEXT[] NOT NULL DEFAULT '{}',
  requires_auth       BOOLEAN NOT NULL DEFAULT FALSE,
  caveat_notes        TEXT,
  last_run_at         TIMESTAMPTZ,
  last_run_status     TEXT,
  last_run_records    INT,
  freshness_status    TEXT CHECK (freshness_status IN ('live','stale','demo','unknown')),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE connector_meta_cache IS
  'B05: Denormalized connector metadata cache. '
  'Updated by the runConnector() orchestrator after each successful run.';

-- ── Row-Level Security ─────────────────────────────────────────────────────────
ALTER TABLE connector_lineage    ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_meta_cache ENABLE ROW LEVEL SECURITY;

-- Public read access for dashboard components
CREATE POLICY "connector_lineage_public_read"
  ON connector_lineage FOR SELECT USING (true);

CREATE POLICY "connector_meta_cache_public_read"
  ON connector_meta_cache FOR SELECT USING (true);

-- Service role (Edge Functions) can insert/update
CREATE POLICY "connector_lineage_service_write"
  ON connector_lineage FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "connector_lineage_service_update"
  ON connector_lineage FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "connector_meta_cache_service_write"
  ON connector_meta_cache FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "connector_meta_cache_service_update"
  ON connector_meta_cache FOR UPDATE
  USING (auth.role() = 'service_role');

-- ── Freshness view ─────────────────────────────────────────────────────────────
-- Used by the data-spine health dashboard to surface per-connector SLA status.
CREATE OR REPLACE VIEW connector_freshness AS
SELECT
  c.connector_id,
  c.name,
  c.source_url,
  c.refresh_cadence_hrs,
  c.freshness_status,
  c.last_run_at,
  c.last_run_status,
  c.last_run_records,
  EXTRACT(EPOCH FROM (now() - c.last_run_at)) / 3600.0 AS age_hours,
  CASE
    WHEN c.last_run_at IS NULL THEN 'unknown'
    WHEN EXTRACT(EPOCH FROM (now() - c.last_run_at)) / 3600.0 <= c.refresh_cadence_hrs * 1.5 THEN 'within_sla'
    ELSE 'breached_sla'
  END AS sla_status,
  l.error_message AS last_error,
  l.payload_hash AS last_payload_hash
FROM connector_meta_cache c
LEFT JOIN LATERAL (
  SELECT error_message, payload_hash
  FROM connector_lineage
  WHERE connector_id = c.connector_id
  ORDER BY started_at DESC
  LIMIT 1
) l ON true;

COMMENT ON VIEW connector_freshness IS
  'B05: Per-connector SLA and freshness status for the data-spine health dashboard.';
