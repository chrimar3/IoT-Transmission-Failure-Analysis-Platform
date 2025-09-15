-- Migration 003: Row Level Security (RLS) Policies
-- Description: Multi-tenant data isolation and access control
-- Author: CU-BEMS Development Team
-- Date: 2025-09-12

-- Enable Row Level Security on sensitive tables
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's subscription tier
CREATE OR REPLACE FUNCTION get_user_subscription_tier(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_tier TEXT;
BEGIN
    SELECT tier INTO user_tier
    FROM subscriptions
    WHERE user_id = user_uuid
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW());
    
    -- Default to free tier if no subscription found
    RETURN COALESCE(user_tier, 'free');
END;
$$;

-- Helper function to check if user has valid subscription
CREATE OR REPLACE FUNCTION has_valid_subscription(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    has_subscription BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM subscriptions
        WHERE user_id = user_uuid
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO has_subscription;
    
    RETURN has_subscription;
END;
$$;

-- RLS Policy: sensor_readings - Allow read access based on subscription
CREATE POLICY sensor_readings_select_policy ON sensor_readings
FOR SELECT
TO authenticated
USING (
    -- Professional tier: full access
    get_user_subscription_tier(auth.uid()) = 'professional'
    OR
    -- Free tier: limited access (last 7 days only)
    (
        get_user_subscription_tier(auth.uid()) = 'free'
        AND timestamp >= NOW() - INTERVAL '7 days'
    )
);

-- RLS Policy: sensor_readings - No direct insert/update/delete for users
-- Only service role can modify sensor data
CREATE POLICY sensor_readings_service_only ON sensor_readings
FOR ALL
TO service_role
USING (true);

-- RLS Policy: subscriptions - Users can only see their own subscription
CREATE POLICY subscriptions_own_data ON subscriptions
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- RLS Policy: user_activity - Users can only see their own activity
CREATE POLICY user_activity_own_data ON user_activity
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- RLS Policy: Allow service role full access to all tables
CREATE POLICY service_role_full_access_sensor_readings ON sensor_readings
FOR ALL
TO service_role
USING (true);

CREATE POLICY service_role_full_access_subscriptions ON subscriptions
FOR ALL
TO service_role
USING (true);

CREATE POLICY service_role_full_access_user_activity ON user_activity
FOR ALL
TO service_role
USING (true);

-- Security functions for application logic
CREATE OR REPLACE FUNCTION check_rate_limit(
    user_uuid UUID,
    action_type TEXT,
    time_window INTERVAL DEFAULT '1 hour'::INTERVAL,
    max_actions INTEGER DEFAULT 100
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    action_count INTEGER;
    user_tier TEXT;
    tier_multiplier INTEGER;
BEGIN
    -- Get user's subscription tier
    user_tier := get_user_subscription_tier(user_uuid);
    
    -- Set rate limit multiplier based on tier
    tier_multiplier := CASE 
        WHEN user_tier = 'professional' THEN 10
        ELSE 1
    END;
    
    -- Count recent actions
    SELECT COUNT(*) INTO action_count
    FROM user_activity
    WHERE user_id = user_uuid
    AND action_type = check_rate_limit.action_type
    AND timestamp >= NOW() - time_window;
    
    -- Check if under limit
    RETURN action_count < (max_actions * tier_multiplier);
END;
$$;

-- Function to log user activity (for rate limiting and analytics)
CREATE OR REPLACE FUNCTION log_user_activity(
    user_uuid UUID,
    action_type TEXT,
    resource_accessed TEXT DEFAULT NULL,
    ip_address INET DEFAULT NULL,
    user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_activity (
        user_id,
        action_type,
        resource_accessed,
        ip_address,
        user_agent
    ) VALUES (
        user_uuid,
        action_type,
        resource_accessed,
        ip_address,
        user_agent
    );
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the main operation
        RAISE WARNING 'Failed to log user activity: %', SQLERRM;
        RETURN false;
END;
$$;

-- Function to get user's data access summary
CREATE OR REPLACE FUNCTION get_user_access_summary(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    user_tier TEXT;
    has_active_sub BOOLEAN;
BEGIN
    user_tier := get_user_subscription_tier(user_uuid);
    has_active_sub := has_valid_subscription(user_uuid);
    
    SELECT json_build_object(
        'user_id', user_uuid,
        'subscription_tier', user_tier,
        'has_active_subscription', has_active_sub,
        'data_access', CASE 
            WHEN user_tier = 'professional' THEN 'full'
            ELSE 'limited_7_days'
        END,
        'rate_limits', json_build_object(
            'api_calls_per_hour', CASE 
                WHEN user_tier = 'professional' THEN 1000
                ELSE 100
            END,
            'exports_per_month', CASE 
                WHEN user_tier = 'professional' THEN 'unlimited'
                ELSE '5'
            END
        ),
        'checked_at', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Comments for documentation
COMMENT ON FUNCTION get_user_subscription_tier(UUID) IS 'Returns user subscription tier (free/professional)';
COMMENT ON FUNCTION has_valid_subscription(UUID) IS 'Checks if user has active, non-expired subscription';
COMMENT ON FUNCTION check_rate_limit(UUID, TEXT, INTERVAL, INTEGER) IS 'Rate limiting based on subscription tier';
COMMENT ON FUNCTION log_user_activity(UUID, TEXT, TEXT, INET, TEXT) IS 'Logs user activity for analytics and rate limiting';
COMMENT ON FUNCTION get_user_access_summary(UUID) IS 'Returns comprehensive user access summary JSON';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;