-- Connector freshness truth hardening.
-- The cache supplies connector metadata; connector_lineage supplies run truth.
-- A failed/degraded run must not erase the last successful observation while
-- still being visible as the current run status.

CREATE OR REPLACE VIEW connector_freshness AS
SELECT
  c.connector_id,
  c.name,
  c.source_url,
  c.refresh_cadence_hrs,
  CASE
    WHEN COALESCE(latest.status, c.last_run_status) IN ('failed', 'degraded') THEN 'stale'
    WHEN COALESCE(successful.completed_at, c.last_run_at) IS NULL THEN 'unknown'
    WHEN EXTRACT(EPOCH FROM (now() - COALESCE(successful.completed_at, c.last_run_at))) / 3600.0 <= c.refresh_cadence_hrs * 1.5 THEN 'live'
    ELSE 'stale'
  END AS freshness_status,
  COALESCE(successful.completed_at, c.last_run_at) AS last_run_at,
  COALESCE(latest.status, c.last_run_status) AS last_run_status,
  COALESCE(latest.records_upserted, c.last_run_records) AS last_run_records,
  EXTRACT(EPOCH FROM (now() - COALESCE(successful.completed_at, c.last_run_at))) / 3600.0 AS age_hours,
  CASE
    WHEN COALESCE(latest.status, c.last_run_status) IN ('failed', 'degraded') THEN 'breached_sla'
    WHEN COALESCE(successful.completed_at, c.last_run_at) IS NULL THEN 'unknown'
    WHEN EXTRACT(EPOCH FROM (now() - COALESCE(successful.completed_at, c.last_run_at))) / 3600.0 <= c.refresh_cadence_hrs * 1.5 THEN 'within_sla'
    ELSE 'breached_sla'
  END AS sla_status,
  latest.error_message AS last_error,
  COALESCE(latest.payload_hash, successful.payload_hash) AS last_payload_hash
FROM connector_meta_cache c
LEFT JOIN LATERAL (
  SELECT status, records_upserted, error_message, payload_hash
  FROM connector_lineage
  WHERE connector_id = c.connector_id
  ORDER BY started_at DESC
  LIMIT 1
) latest ON true
LEFT JOIN LATERAL (
  SELECT completed_at, payload_hash
  FROM connector_lineage
  WHERE connector_id = c.connector_id
    AND status = 'success'
    AND completed_at IS NOT NULL
  ORDER BY completed_at DESC
  LIMIT 1
) successful ON true;

COMMENT ON VIEW connector_freshness IS
  'Connector freshness derived from lineage truth; failed/degraded runs remain visible and never become successful freshness evidence.';
