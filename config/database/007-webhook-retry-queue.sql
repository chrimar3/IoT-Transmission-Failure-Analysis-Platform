-- Migration 007: Webhook Retry Queue System
-- Description: Creates infrastructure for webhook retry mechanism
-- Author: Dev Agent Mike (BMAD)
-- Date: 2025-09-24
-- Purpose: Handle failed webhook processing with exponential backoff

-- Create webhook retry queue table
CREATE TABLE IF NOT EXISTS webhook_retry_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ NOT NULL,
    last_attempt_at TIMESTAMPTZ,
    last_error_message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT webhook_retry_queue_status_check
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired'))
);

-- Create indices for webhook retry queue
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_next_retry
ON webhook_retry_queue (next_retry_at, status)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_stripe_event
ON webhook_retry_queue (stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_status_created
ON webhook_retry_queue (status, created_at DESC);

-- Create webhook processing statistics table
CREATE TABLE IF NOT EXISTS webhook_processing_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    event_type VARCHAR(50) NOT NULL,
    total_events INTEGER NOT NULL DEFAULT 0,
    successful_events INTEGER NOT NULL DEFAULT 0,
    failed_events INTEGER NOT NULL DEFAULT 0,
    retried_events INTEGER NOT NULL DEFAULT 0,
    avg_processing_time_ms DECIMAL(10,2),
    max_retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(date, event_type)
);

-- Create index for webhook stats
CREATE INDEX IF NOT EXISTS idx_webhook_stats_date_type
ON webhook_processing_stats (date DESC, event_type);

-- Function to process webhook retry queue
CREATE OR REPLACE FUNCTION process_webhook_retry_queue()
RETURNS INTEGER AS $$
DECLARE
    retry_record RECORD;
    processed_count INTEGER := 0;
    max_batch_size INTEGER := 50;
BEGIN
    -- Process pending retries that are ready
    FOR retry_record IN
        SELECT *
        FROM webhook_retry_queue
        WHERE status = 'pending'
        AND next_retry_at <= NOW()
        AND retry_count < max_retries
        ORDER BY next_retry_at
        LIMIT max_batch_size
    LOOP
        -- Mark as processing
        UPDATE webhook_retry_queue
        SET status = 'processing',
            last_attempt_at = NOW(),
            updated_at = NOW()
        WHERE id = retry_record.id;

        -- Here you would make an HTTP call to retry the webhook
        -- For now, we'll simulate the retry logic

        -- Increment retry count and schedule next retry if needed
        UPDATE webhook_retry_queue
        SET retry_count = retry_count + 1,
            next_retry_at = NOW() + INTERVAL '1 second' * POWER(2, retry_count + 1),
            status = CASE
                WHEN retry_count + 1 >= max_retries THEN 'failed'
                ELSE 'pending'
            END,
            updated_at = NOW()
        WHERE id = retry_record.id;

        processed_count := processed_count + 1;
    END LOOP;

    -- Mark expired retries
    UPDATE webhook_retry_queue
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '7 days';

    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update webhook processing statistics
CREATE OR REPLACE FUNCTION update_webhook_processing_stats(
    p_event_type VARCHAR(50),
    p_success BOOLEAN,
    p_retry_count INTEGER DEFAULT 0,
    p_processing_time_ms INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO webhook_processing_stats (
        date,
        event_type,
        total_events,
        successful_events,
        failed_events,
        retried_events,
        avg_processing_time_ms,
        max_retry_count
    ) VALUES (
        CURRENT_DATE,
        p_event_type,
        1,
        CASE WHEN p_success THEN 1 ELSE 0 END,
        CASE WHEN p_success THEN 0 ELSE 1 END,
        CASE WHEN p_retry_count > 0 THEN 1 ELSE 0 END,
        COALESCE(p_processing_time_ms, 0),
        p_retry_count
    )
    ON CONFLICT (date, event_type) DO UPDATE SET
        total_events = webhook_processing_stats.total_events + 1,
        successful_events = webhook_processing_stats.successful_events +
            CASE WHEN p_success THEN 1 ELSE 0 END,
        failed_events = webhook_processing_stats.failed_events +
            CASE WHEN p_success THEN 0 ELSE 1 END,
        retried_events = webhook_processing_stats.retried_events +
            CASE WHEN p_retry_count > 0 THEN 1 ELSE 0 END,
        avg_processing_time_ms = CASE
            WHEN p_processing_time_ms IS NOT NULL THEN
                (webhook_processing_stats.avg_processing_time_ms * webhook_processing_stats.total_events + p_processing_time_ms)
                / (webhook_processing_stats.total_events + 1)
            ELSE webhook_processing_stats.avg_processing_time_ms
        END,
        max_retry_count = GREATEST(webhook_processing_stats.max_retry_count, p_retry_count),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old webhook retry records
CREATE OR REPLACE FUNCTION cleanup_webhook_retry_queue(
    p_days_old INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM webhook_retry_queue
    WHERE (status IN ('completed', 'failed', 'expired'))
    AND updated_at < NOW() - INTERVAL '1 day' * p_days_old;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get webhook retry queue health metrics
CREATE OR REPLACE FUNCTION get_webhook_retry_queue_health()
RETURNS TABLE (
    pending_retries INTEGER,
    failed_retries INTEGER,
    oldest_pending_age_minutes INTEGER,
    avg_retry_count DECIMAL(5,2),
    success_rate_24h DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM webhook_retry_queue WHERE status = 'pending'),
        (SELECT COUNT(*)::INTEGER FROM webhook_retry_queue WHERE status = 'failed'),
        (SELECT COALESCE(EXTRACT(EPOCH FROM (NOW() - MIN(created_at)))::INTEGER / 60, 0)
         FROM webhook_retry_queue WHERE status = 'pending'),
        (SELECT COALESCE(AVG(retry_count), 0)::DECIMAL(5,2) FROM webhook_retry_queue),
        (SELECT
            CASE
                WHEN SUM(total_events) > 0 THEN
                    (SUM(successful_events)::DECIMAL / SUM(total_events) * 100)::DECIMAL(5,2)
                ELSE 0
            END
         FROM webhook_processing_stats
         WHERE date >= CURRENT_DATE - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhook_retry_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_webhook_retry_queue_updated_at ON webhook_retry_queue;
CREATE TRIGGER trigger_webhook_retry_queue_updated_at
    BEFORE UPDATE ON webhook_retry_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_retry_queue_updated_at();

DROP TRIGGER IF EXISTS trigger_webhook_stats_updated_at ON webhook_processing_stats;
CREATE TRIGGER trigger_webhook_stats_updated_at
    BEFORE UPDATE ON webhook_processing_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_retry_queue_updated_at();

-- Add table comments
COMMENT ON TABLE webhook_retry_queue IS 'Queue for retrying failed webhook events with exponential backoff';
COMMENT ON TABLE webhook_processing_stats IS 'Daily aggregated statistics for webhook processing performance';

COMMENT ON COLUMN webhook_retry_queue.stripe_event_id IS 'Unique Stripe event identifier for deduplication';
COMMENT ON COLUMN webhook_retry_queue.next_retry_at IS 'Timestamp for next retry attempt with exponential backoff';
COMMENT ON COLUMN webhook_retry_queue.status IS 'Current processing status of the webhook event';

COMMENT ON FUNCTION process_webhook_retry_queue() IS 'Processes pending webhook retries in batches';
COMMENT ON FUNCTION update_webhook_processing_stats(VARCHAR, BOOLEAN, INTEGER, INTEGER) IS 'Updates daily webhook processing statistics';
COMMENT ON FUNCTION cleanup_webhook_retry_queue(INTEGER) IS 'Removes old completed/failed webhook retry records';
COMMENT ON FUNCTION get_webhook_retry_queue_health() IS 'Returns health metrics for webhook retry system monitoring';

-- Update table statistics
ANALYZE webhook_retry_queue;
ANALYZE webhook_processing_stats;