-- Migration 005: Enhanced Stripe Subscription Schema
-- Description: Adds Stripe integration fields to subscriptions table
-- Author: CU-BEMS Development Team
-- Date: 2025-09-22

-- Add additional columns to subscriptions table for Stripe integration
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

-- Update status check constraint to include new Stripe statuses
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_status_check,
ADD CONSTRAINT subscriptions_status_check
CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid'));

-- Create index for Stripe customer ID lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions (stripe_customer_id);

-- Create index for subscription period queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_period ON subscriptions (current_period_start, current_period_end);

-- Create a function to update subscription timestamps
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trigger_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_updated_at();

-- Add comments for new columns
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN subscriptions.current_period_start IS 'Current billing period start date';
COMMENT ON COLUMN subscriptions.current_period_end IS 'Current billing period end date';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at period end';
COMMENT ON COLUMN subscriptions.canceled_at IS 'Timestamp when subscription was canceled';

-- Create subscription_events table for audit trail
CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    stripe_event_id VARCHAR(100) UNIQUE,
    event_data JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for subscription events
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON subscription_events (subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type_created ON subscription_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_id ON subscription_events (stripe_event_id);

-- Add comments for subscription events table
COMMENT ON TABLE subscription_events IS 'Audit trail for subscription changes and Stripe webhook events';
COMMENT ON COLUMN subscription_events.event_type IS 'Type of subscription event (created, updated, canceled, etc.)';
COMMENT ON COLUMN subscription_events.stripe_event_id IS 'Stripe webhook event ID for deduplication';
COMMENT ON COLUMN subscription_events.event_data IS 'JSON data from Stripe webhook or application event';

-- Update table statistics
ANALYZE subscriptions;
ANALYZE subscription_events;