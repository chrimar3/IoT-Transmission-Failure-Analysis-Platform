-- Export Usage Tracking Schema
-- Tracks export usage by user and enforces subscription tier limits

-- Export Usage Tracking: Monthly export counts per user
CREATE TABLE IF NOT EXISTS export_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    export_count INTEGER DEFAULT 0 NOT NULL,
    tier VARCHAR(50) NOT NULL,
    total_file_size BIGINT DEFAULT 0, -- Total bytes
    email_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month_year)
);

-- Export Jobs: Track all export jobs
CREATE TABLE IF NOT EXISTS export_jobs (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    job_type VARCHAR(20) DEFAULT 'manual' CHECK (job_type IN ('manual', 'scheduled')),
    export_format VARCHAR(10) NOT NULL CHECK (export_format IN ('csv', 'excel', 'pdf')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    file_path VARCHAR(1000),
    file_key VARCHAR(1000), -- Storage key for regenerating signed URLs
    file_size BIGINT,
    file_url TEXT,
    parameters JSONB NOT NULL,
    progress_percent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    delivery_method VARCHAR(20) DEFAULT 'download' CHECK (delivery_method IN ('download', 'email'))
);

-- Export History: Audit trail of export downloads
CREATE TABLE IF NOT EXISTS export_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    export_job_id VARCHAR(255) NOT NULL REFERENCES export_jobs(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'downloaded', 'shared', 'deleted'
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription Tier Limits: Define limits for each tier
CREATE TABLE IF NOT EXISTS export_tier_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier VARCHAR(50) UNIQUE NOT NULL,
    exports_per_month INTEGER NOT NULL, -- -1 for unlimited
    max_file_size_mb INTEGER NOT NULL,
    max_recipients_per_email INTEGER NOT NULL,
    scheduled_reports_limit INTEGER NOT NULL,
    share_links_per_month INTEGER NOT NULL,
    formats_allowed JSONB NOT NULL, -- Array of allowed formats
    features_enabled JSONB NOT NULL, -- Array of enabled features
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tier limits
INSERT INTO export_tier_limits (tier, exports_per_month, max_file_size_mb, max_recipients_per_email, scheduled_reports_limit, share_links_per_month, formats_allowed, features_enabled)
VALUES
    ('FREE', 5, 5, 1, 0, 0, '["csv"]'::jsonb, '["basic_export"]'::jsonb),
    ('PROFESSIONAL', 100, 50, 10, 10, 50, '["csv", "excel", "pdf"]'::jsonb, '["basic_export", "excel_export", "pdf_export", "email_delivery", "scheduled_reports", "custom_templates", "secure_sharing"]'::jsonb),
    ('ENTERPRISE', -1, 200, 50, -1, -1, '["csv", "excel", "pdf"]'::jsonb, '["basic_export", "excel_export", "pdf_export", "email_delivery", "scheduled_reports", "custom_templates", "branding", "secure_sharing", "usage_analytics"]'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
    exports_per_month = EXCLUDED.exports_per_month,
    max_file_size_mb = EXCLUDED.max_file_size_mb,
    max_recipients_per_email = EXCLUDED.max_recipients_per_email,
    scheduled_reports_limit = EXCLUDED.scheduled_reports_limit,
    share_links_per_month = EXCLUDED.share_links_per_month,
    formats_allowed = EXCLUDED.formats_allowed,
    features_enabled = EXCLUDED.features_enabled,
    updated_at = NOW();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_export_usage_user_month ON export_usage(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_export_usage_tier ON export_usage(tier);
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at ON export_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_export_audit_log_user_id ON export_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_export_audit_log_job_id ON export_audit_log(export_job_id);
CREATE INDEX IF NOT EXISTS idx_export_audit_log_created_at ON export_audit_log(created_at);

-- Function to update usage tracking
CREATE OR REPLACE FUNCTION update_export_usage()
RETURNS TRIGGER AS $$
DECLARE
    current_month VARCHAR(7);
    user_tier VARCHAR(50);
BEGIN
    -- Get current month in YYYY-MM format
    current_month := TO_CHAR(NEW.created_at, 'YYYY-MM');

    -- Get user tier from job parameters or default to PROFESSIONAL
    user_tier := COALESCE(NEW.parameters->>'tier', 'PROFESSIONAL');

    -- Insert or update usage record
    INSERT INTO export_usage (user_id, month_year, export_count, tier, total_file_size)
    VALUES (NEW.user_id, current_month, 1, user_tier, COALESCE(NEW.file_size, 0))
    ON CONFLICT (user_id, month_year)
    DO UPDATE SET
        export_count = export_usage.export_count + 1,
        total_file_size = export_usage.total_file_size + COALESCE(NEW.file_size, 0),
        tier = user_tier,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update usage when export completes
CREATE TRIGGER update_usage_on_export_complete
AFTER INSERT OR UPDATE OF status ON export_jobs
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION update_export_usage();

-- Function to check if user can export
CREATE OR REPLACE FUNCTION can_user_export(
    p_user_id VARCHAR(255),
    p_tier VARCHAR(50)
) RETURNS TABLE(
    can_export BOOLEAN,
    current_count INTEGER,
    limit_count INTEGER,
    percentage_used DECIMAL(5,2),
    resets_at TIMESTAMPTZ
) AS $$
DECLARE
    current_month VARCHAR(7);
    usage_record RECORD;
    tier_limit INTEGER;
BEGIN
    -- Get current month
    current_month := TO_CHAR(NOW(), 'YYYY-MM');

    -- Get tier limit
    SELECT exports_per_month INTO tier_limit
    FROM export_tier_limits
    WHERE tier = p_tier;

    -- If tier not found, deny export
    IF tier_limit IS NULL THEN
        RETURN QUERY SELECT false, 0, 0, 0.0::DECIMAL, (NOW() + INTERVAL '1 month')::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- If unlimited (-1), allow export
    IF tier_limit = -1 THEN
        RETURN QUERY SELECT true, 0, -1, 0.0::DECIMAL, (NOW() + INTERVAL '1 month')::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- Get current usage
    SELECT * INTO usage_record
    FROM export_usage
    WHERE user_id = p_user_id AND month_year = current_month;

    -- If no usage record, user can export
    IF usage_record IS NULL THEN
        RETURN QUERY SELECT true, 0, tier_limit, 0.0::DECIMAL, (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- Check if under limit
    RETURN QUERY SELECT
        usage_record.export_count < tier_limit,
        usage_record.export_count,
        tier_limit,
        ROUND((usage_record.export_count::DECIMAL / tier_limit * 100), 2),
        (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql;

-- Function to get usage statistics
CREATE OR REPLACE FUNCTION get_user_export_stats(p_user_id VARCHAR(255))
RETURNS TABLE(
    month_year VARCHAR(7),
    export_count INTEGER,
    total_file_size_mb DECIMAL(10,2),
    tier VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        eu.month_year,
        eu.export_count,
        ROUND((eu.total_file_size / 1024.0 / 1024.0)::DECIMAL, 2) as total_file_size_mb,
        eu.tier
    FROM export_usage eu
    WHERE eu.user_id = p_user_id
    ORDER BY eu.month_year DESC
    LIMIT 12; -- Last 12 months
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE export_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_tier_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own export usage" ON export_usage
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can view their own export jobs" ON export_jobs
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create their own export jobs" ON export_jobs
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own export jobs" ON export_jobs
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can view their own audit log" ON export_audit_log
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Anyone can view tier limits" ON export_tier_limits
    FOR SELECT USING (true);

-- Comments
COMMENT ON TABLE export_usage IS 'Tracks monthly export usage per user for enforcing tier limits';
COMMENT ON TABLE export_jobs IS 'Stores all export job records with metadata and status';
COMMENT ON TABLE export_audit_log IS 'Audit trail of all export-related actions';
COMMENT ON TABLE export_tier_limits IS 'Defines export limits and features for each subscription tier';
COMMENT ON FUNCTION can_user_export IS 'Checks if user has remaining export quota for current month';
COMMENT ON FUNCTION get_user_export_stats IS 'Returns last 12 months of export statistics for a user';