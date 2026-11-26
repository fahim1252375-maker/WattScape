-- Supports the latest site telemetry endpoint across all metric keys:
-- WHERE organization_id = ? AND site_id = ? ORDER BY observed_at DESC LIMIT ?.
-- Keep the V5 metric-leading index for metric-filtered history and ingestion
-- idempotency indexes unchanged.
CREATE INDEX ix_telemetry_site_latest
    ON telemetry_points (organization_id, site_id, observed_at DESC);
