-- =====================================================
-- Epic 1-3 Completion: Resilience Infrastructure Schema
-- =====================================================
-- Created: 2025-09-30
-- Purpose: Support webhook DLQ, subscription caching, and operations alerts
-- Dependencies: 001-core-schema.sql, 005-stripe-subscription-schema.sql
-- =====================================================

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. Webhook Dead Letter Queue (DLQ)
-- =====================================================
-- Purpose: Store failed webhook events for retry
-- Epic 2 Story 2.5: Stripe Failure Handling
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_dlq (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
  max_retries INTEGER DEFAULT 5 CHECK (max_retries >= 0),
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient DLQ operations
CREATE INDEX IF NOT EXISTS idx_webhook_dlq_status
  ON webhook_dlq(status);

CREATE INDEX IF NOT EXISTS idx_webhook_dlq_next_retry
  ON webhook_dlq(next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_webhook_dlq_stripe_event
  ON webhook_dlq(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_dlq_created
  ON webhook_dlq(created_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhook_dlq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_webhook_dlq_updated_at
  BEFORE UPDATE ON webhook_dlq
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_dlq_updated_at();

-- Comments for documentation
COMMENT ON TABLE webhook_dlq IS 'Dead letter queue for failed Stripe webhook events with retry logic';
COMMENT ON COLUMN webhook_dlq.stripe_event_id IS 'Unique Stripe event identifier';
COMMENT ON COLUMN webhook_dlq.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN webhook_dlq.next_retry_at IS 'Scheduled time for next retry attempt';
COMMENT ON COLUMN webhook_dlq.status IS 'Current status: pending (awaiting retry), processing (being retried), completed (successfully processed), failed (retry in progress), abandoned (max retries exceeded)';

-- =====================================================
-- 2. Subscription Cache
-- =====================================================
-- Purpose: Cache subscription data for graceful degradation during Stripe outages
-- Epic 2 Story 2.5: Stripe Failure Handling
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_cache (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('FREE', 'PROFESSIONAL', 'ENTERPRISE')),
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_end TIMESTAMPTZ NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for cache lookups
CREATE INDEX IF NOT EXISTS idx_subscription_cache_verified
  ON subscription_cache(last_verified);

CREATE INDEX IF NOT EXISTS idx_subscription_cache_stripe_sub
  ON subscription_cache(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_cache_tier
  ON subscription_cache(tier);

-- Comments for documentation
COMMENT ON TABLE subscription_cache IS 'Cached subscription data for graceful degradation during Stripe API outages';
COMMENT ON COLUMN subscription_cache.cached_at IS 'When this entry was last cached from Stripe';
COMMENT ON COLUMN subscription_cache.last_verified IS 'Last time this cache entry was verified against Stripe';

-- =====================================================
-- 3. Operations Alerts
-- =====================================================
-- Purpose: Store system alerts for operations team monitoring
-- Epic 2 Story 2.5: Stripe Failure Handling
-- =====================================================

CREATE TABLE IF NOT EXISTS operations_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for alert management
CREATE INDEX IF NOT EXISTS idx_operations_alerts_unacknowledged
  ON operations_alerts(acknowledged, created_at DESC)
  WHERE acknowledged = FALSE;

CREATE INDEX IF NOT EXISTS idx_operations_alerts_severity
  ON operations_alerts(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operations_alerts_type
  ON operations_alerts(alert_type);

CREATE INDEX IF NOT EXISTS idx_operations_alerts_created
  ON operations_alerts(created_at DESC);

-- Trigger to set acknowledged_at timestamp
CREATE OR REPLACE FUNCTION set_operations_alert_acknowledged_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.acknowledged = TRUE AND OLD.acknowledged = FALSE THEN
    NEW.acknowledged_at = NOW();
  END IF;
  IF NEW.resolved = TRUE AND OLD.resolved = FALSE THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_operations_alerts_timestamps
  BEFORE UPDATE ON operations_alerts
  FOR EACH ROW
  EXECUTE FUNCTION set_operations_alert_acknowledged_at();

-- Comments for documentation
COMMENT ON TABLE operations_alerts IS 'System alerts requiring operations team attention';
COMMENT ON COLUMN operations_alerts.alert_type IS 'Type of alert (e.g., webhook_permanent_failure, database_degraded)';
COMMENT ON COLUMN operations_alerts.severity IS 'Alert severity: low (info), medium (warning), high (urgent), critical (immediate action)';

-- =====================================================
-- 4. System Errors Log
-- =====================================================
-- Purpose: Audit trail for critical system errors
-- Epic 2 Story 2.5 & 2.6: Error tracking and monitoring
-- =====================================================

CREATE TABLE IF NOT EXISTS system_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  error_type TEXT NOT NULL,
  error_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_path TEXT,
  request_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for error analysis
CREATE INDEX IF NOT EXISTS idx_system_errors_type
  ON system_errors(error_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_errors_severity
  ON system_errors(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_errors_created
  ON system_errors(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_errors_user
  ON system_errors(user_id)
  WHERE user_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE system_errors IS 'Comprehensive error logging for debugging and monitoring';
COMMENT ON COLUMN system_errors.error_type IS 'Error classification (e.g., DLQ_INSERT_FAILURE, CIRCUIT_BREAKER_OPEN)';

-- =====================================================
-- 5. Helper Functions
-- =====================================================

-- Function to get DLQ statistics
CREATE OR REPLACE FUNCTION get_webhook_dlq_stats()
RETURNS TABLE (
  pending_count BIGINT,
  processing_count BIGINT,
  completed_count BIGINT,
  failed_count BIGINT,
  abandoned_count BIGINT,
  total_retries BIGINT,
  oldest_pending TIMESTAMPTZ,
  avg_retry_count NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE status = 'processing') AS processing_count,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
    COUNT(*) FILTER (WHERE status = 'abandoned') AS abandoned_count,
    COALESCE(SUM(retry_count), 0) AS total_retries,
    MIN(created_at) FILTER (WHERE status = 'pending') AS oldest_pending,
    ROUND(AVG(retry_count), 2) AS avg_retry_count
  FROM webhook_dlq;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old completed DLQ entries
CREATE OR REPLACE FUNCTION cleanup_webhook_dlq(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_dlq
  WHERE status = 'completed'
    AND updated_at < NOW() - (days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old subscription cache entries
CREATE OR REPLACE FUNCTION cleanup_subscription_cache(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM subscription_cache
  WHERE last_verified < NOW() - (days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get unacknowledged alerts
CREATE OR REPLACE FUNCTION get_unacknowledged_alerts()
RETURNS TABLE (
  alert_id UUID,
  alert_type TEXT,
  severity TEXT,
  details JSONB,
  age_minutes INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id AS alert_id,
    operations_alerts.alert_type,
    operations_alerts.severity,
    operations_alerts.details,
    EXTRACT(EPOCH FROM (NOW() - operations_alerts.created_at))::INTEGER / 60 AS age_minutes,
    operations_alerts.created_at
  FROM operations_alerts
  WHERE acknowledged = FALSE
    AND resolved = FALSE
  ORDER BY
    CASE operations_alerts.severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    operations_alerts.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE webhook_dlq ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_errors ENABLE ROW LEVEL SECURITY;

-- webhook_dlq: Only service role can access
CREATE POLICY webhook_dlq_service_role_policy ON webhook_dlq
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- subscription_cache: Users can read their own, service role can write
CREATE POLICY subscription_cache_user_read_policy ON subscription_cache
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY subscription_cache_service_role_policy ON subscription_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- operations_alerts: Only service role and admins
CREATE POLICY operations_alerts_service_role_policy ON operations_alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- system_errors: Only service role
CREATE POLICY system_errors_service_role_policy ON system_errors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 7. Scheduled Maintenance Jobs (for pg_cron or external cron)
-- =====================================================

-- Note: These are example queries for scheduled jobs
-- Implement using pg_cron, or external cron with psql

-- Daily cleanup of old DLQ entries (keep 30 days)
-- SELECT cleanup_webhook_dlq(30);

-- Daily cleanup of old subscription cache (keep 90 days)
-- SELECT cleanup_subscription_cache(90);

-- Hourly alert for abandoned webhooks
-- SELECT count(*) FROM webhook_dlq WHERE status = 'abandoned' AND created_at > NOW() - INTERVAL '1 hour';

-- =====================================================
-- 8. Grants for Application Access
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON webhook_dlq TO authenticated;
GRANT SELECT ON subscription_cache TO authenticated;
GRANT SELECT ON operations_alerts TO authenticated;
GRANT SELECT ON system_errors TO authenticated;

-- Grant full access to service role (already has it, but explicit)
GRANT ALL ON webhook_dlq TO service_role;
GRANT ALL ON subscription_cache TO service_role;
GRANT ALL ON operations_alerts TO service_role;
GRANT ALL ON system_errors TO service_role;

-- =====================================================
-- Migration Complete
-- =====================================================

-- Verify tables were created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('webhook_dlq', 'subscription_cache', 'operations_alerts', 'system_errors');

  IF table_count = 4 THEN
    RAISE NOTICE 'Migration 006 completed successfully. Created 4 tables for resilience infrastructure.';
  ELSE
    RAISE WARNING 'Migration 006 incomplete. Expected 4 tables, found %', table_count;
  END IF;
END $$;