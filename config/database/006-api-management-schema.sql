-- Migration 006: API Management Schema for Professional Tier
-- Description: Creates API key management, usage tracking, and webhook infrastructure
-- Author: BMAD Development Agent
-- Date: 2025-09-23

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- API key management table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(16) NOT NULL,
    scopes JSONB NOT NULL DEFAULT '["read:data"]',
    rate_limit_tier VARCHAR(20) DEFAULT 'free' CHECK (rate_limit_tier IN ('free', 'professional', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    usage_stats JSONB DEFAULT '{"total_requests": 0, "requests_this_month": 0}',
    CONSTRAINT unique_user_key_name UNIQUE (user_id, name)
);

-- API usage tracking table for detailed analytics
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_status INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    ip_address INET NOT NULL,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT,
    request_params JSONB
);

-- Webhook endpoints management
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    events JSONB NOT NULL DEFAULT '["data.updated"]',
    secret VARCHAR(64) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_delivery_at TIMESTAMPTZ,
    delivery_stats JSONB DEFAULT '{"total_deliveries": 0, "successful_deliveries": 0, "failed_deliveries": 0}',
    CONSTRAINT unique_user_webhook_url UNIQUE (user_id, url)
);

-- Webhook delivery attempts tracking
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    delivery_attempts INTEGER DEFAULT 1,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting tracking table
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    request_count INTEGER DEFAULT 0,
    tier_limit INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_rate_limit_window UNIQUE (api_key_id, window_start)
);

-- API export jobs for large dataset processing
CREATE TABLE IF NOT EXISTS api_export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL,
    parameters JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_url TEXT,
    file_size_bytes BIGINT,
    progress_percentage INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- Performance-optimized indexes for API operations
-- API key lookup and validation
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (key_prefix);

-- API usage analytics and rate limiting
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage USING BRIN (timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key_timestamp ON api_usage (api_key_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_timestamp ON api_usage (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint_timestamp ON api_usage (endpoint, timestamp DESC);

-- Webhook delivery tracking
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user_active ON webhook_endpoints (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint_timestamp ON webhook_deliveries (webhook_endpoint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries (next_retry_at) WHERE next_retry_at IS NOT NULL;

-- Rate limiting queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window ON rate_limits (api_key_id, window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_window ON rate_limits (user_id, window_start, window_end);

-- Export job tracking
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_status ON api_export_jobs (user_id, status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_key_created ON api_export_jobs (api_key_id, created_at DESC);

-- Functions for API key management

-- Generate secure API key with prefix
CREATE OR REPLACE FUNCTION generate_api_key(key_prefix TEXT DEFAULT 'cb_')
RETURNS TEXT AS $$
DECLARE
    random_part TEXT;
    full_key TEXT;
BEGIN
    -- Generate 32-character random string
    random_part := encode(gen_random_bytes(24), 'base64');
    -- Remove problematic characters and ensure length
    random_part := regexp_replace(random_part, '[/+=]', '', 'g');
    random_part := left(random_part, 32);

    -- Combine prefix with random part
    full_key := key_prefix || random_part;

    RETURN full_key;
END;
$$ LANGUAGE plpgsql;

-- Hash API key for secure storage
CREATE OR REPLACE FUNCTION hash_api_key(api_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(api_key, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Update API key usage statistics
CREATE OR REPLACE FUNCTION update_api_key_usage(key_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE api_keys
    SET
        last_used_at = NOW(),
        usage_stats = jsonb_set(
            jsonb_set(
                usage_stats,
                '{total_requests}',
                ((usage_stats->>'total_requests')::int + 1)::text::jsonb
            ),
            '{requests_this_month}',
            ((usage_stats->>'requests_this_month')::int + 1)::text::jsonb
        )
    WHERE id = key_id;
END;
$$ LANGUAGE plpgsql;

-- Check rate limit for API key
CREATE OR REPLACE FUNCTION check_rate_limit(
    key_id UUID,
    u_id UUID,
    tier_limit INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    current_window_start TIMESTAMPTZ;
    current_window_end TIMESTAMPTZ;
    current_count INTEGER;
BEGIN
    -- Calculate current hour window
    current_window_start := date_trunc('hour', NOW());
    current_window_end := current_window_start + INTERVAL '1 hour';

    -- Get or create rate limit record for current window
    INSERT INTO rate_limits (api_key_id, user_id, window_start, window_end, tier_limit)
    VALUES (key_id, u_id, current_window_start, current_window_end, tier_limit)
    ON CONFLICT (api_key_id, window_start) DO NOTHING;

    -- Get current request count
    SELECT request_count INTO current_count
    FROM rate_limits
    WHERE api_key_id = key_id AND window_start = current_window_start;

    -- Check if under limit
    IF current_count < tier_limit THEN
        -- Increment counter
        UPDATE rate_limits
        SET request_count = request_count + 1
        WHERE api_key_id = key_id AND window_start = current_window_start;

        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update webhook delivery stats
CREATE OR REPLACE FUNCTION update_webhook_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.response_status IS NOT NULL AND NEW.response_status < 400 THEN
        -- Successful delivery
        UPDATE webhook_endpoints
        SET
            last_delivery_at = NEW.delivered_at,
            delivery_stats = jsonb_set(
                jsonb_set(
                    delivery_stats,
                    '{total_deliveries}',
                    ((delivery_stats->>'total_deliveries')::int + 1)::text::jsonb
                ),
                '{successful_deliveries}',
                ((delivery_stats->>'successful_deliveries')::int + 1)::text::jsonb
            )
        WHERE id = NEW.webhook_endpoint_id;
    ELSE
        -- Failed delivery
        UPDATE webhook_endpoints
        SET
            delivery_stats = jsonb_set(
                jsonb_set(
                    delivery_stats,
                    '{total_deliveries}',
                    ((delivery_stats->>'total_deliveries')::int + 1)::text::jsonb
                ),
                '{failed_deliveries}',
                ((delivery_stats->>'failed_deliveries')::int + 1)::text::jsonb
            )
        WHERE id = NEW.webhook_endpoint_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for webhook delivery stats
DROP TRIGGER IF EXISTS trigger_webhook_delivery_stats ON webhook_deliveries;
CREATE TRIGGER trigger_webhook_delivery_stats
    AFTER INSERT OR UPDATE ON webhook_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_stats();

-- Row Level Security (RLS) policies for multi-tenant access

-- Enable RLS on all API tables
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_export_jobs ENABLE ROW LEVEL SECURITY;

-- API keys: Users can only access their own keys
CREATE POLICY api_keys_user_isolation ON api_keys
    FOR ALL USING (auth.uid() = user_id);

-- API usage: Users can only see their own usage
CREATE POLICY api_usage_user_isolation ON api_usage
    FOR ALL USING (auth.uid() = user_id);

-- Webhooks: Users can only manage their own webhooks
CREATE POLICY webhook_endpoints_user_isolation ON webhook_endpoints
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY webhook_deliveries_user_isolation ON webhook_deliveries
    FOR ALL USING (
        auth.uid() = (
            SELECT user_id FROM webhook_endpoints
            WHERE id = webhook_endpoint_id
        )
    );

-- Rate limits: Users can only see their own limits
CREATE POLICY rate_limits_user_isolation ON rate_limits
    FOR ALL USING (auth.uid() = user_id);

-- Export jobs: Users can only see their own jobs
CREATE POLICY export_jobs_user_isolation ON api_export_jobs
    FOR ALL USING (auth.uid() = user_id);

-- Add table comments for documentation
COMMENT ON TABLE api_keys IS 'API key management for Professional tier users with scoped permissions';
COMMENT ON TABLE api_usage IS 'Detailed API usage tracking for analytics and rate limiting';
COMMENT ON TABLE webhook_endpoints IS 'User-configured webhook endpoints for event notifications';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery attempts with retry logic';
COMMENT ON TABLE rate_limits IS 'Sliding window rate limiting per API key and user';
COMMENT ON TABLE api_export_jobs IS 'Long-running export jobs for large dataset processing';

-- Add column comments
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key for secure storage';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8-16 characters of API key for identification';
COMMENT ON COLUMN api_keys.scopes IS 'JSON array of API permissions: read:data, read:analytics, read:exports';
COMMENT ON COLUMN api_keys.rate_limit_tier IS 'Rate limiting tier: free (100/hour), professional (10K/hour)';

COMMENT ON COLUMN api_usage.response_time_ms IS 'API response time in milliseconds for performance monitoring';
COMMENT ON COLUMN api_usage.request_params IS 'Sanitized request parameters for debugging and analytics';

COMMENT ON COLUMN webhook_endpoints.events IS 'JSON array of subscribed events: data.updated, alert.triggered, export.completed';
COMMENT ON COLUMN webhook_endpoints.secret IS 'HMAC secret for webhook signature verification';

COMMENT ON COLUMN rate_limits.window_start IS 'Start of rate limiting window (hourly sliding window)';
COMMENT ON COLUMN rate_limits.tier_limit IS 'Maximum requests allowed in this window based on subscription tier';

-- Refresh table statistics for query optimizer
ANALYZE api_keys;
ANALYZE api_usage;
ANALYZE webhook_endpoints;
ANALYZE webhook_deliveries;
ANALYZE rate_limits;
ANALYZE api_export_jobs;