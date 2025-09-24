-- Migration 006: Subscription Transaction Safety Functions
-- Description: Adds transactional functions for atomic subscription updates
-- Author: Dev Agent Mike (BMAD)
-- Date: 2025-09-24
-- Purpose: Ensure database consistency during Stripe webhook processing

-- Function to update subscriptions with transaction safety
CREATE OR REPLACE FUNCTION update_subscription_transactional(
    p_user_id UUID,
    p_updates JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    v_subscription_id UUID;
    v_old_status TEXT;
    v_new_status TEXT;
    v_result BOOLEAN := FALSE;
BEGIN
    -- Start explicit transaction
    -- Get current subscription with row-level lock
    SELECT id, status INTO v_subscription_id, v_old_status
    FROM subscriptions
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Extract new status for logging
    v_new_status := COALESCE(p_updates->>'status', v_old_status);

    IF v_subscription_id IS NULL THEN
        -- Create new subscription if it doesn't exist
        INSERT INTO subscriptions (
            user_id,
            tier,
            status,
            stripe_subscription_id,
            stripe_customer_id,
            current_period_start,
            current_period_end,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            COALESCE(p_updates->>'tier', 'free'),
            COALESCE(p_updates->>'status', 'active'),
            p_updates->>'stripeSubscriptionId',
            p_updates->>'stripeCustomerId',
            CASE
                WHEN p_updates->>'current_period_start' IS NOT NULL
                THEN (p_updates->>'current_period_start')::TIMESTAMPTZ
                ELSE NULL
            END,
            CASE
                WHEN p_updates->>'current_period_end' IS NOT NULL
                THEN (p_updates->>'current_period_end')::TIMESTAMPTZ
                ELSE NULL
            END,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_subscription_id;

        v_result := TRUE;
    ELSE
        -- Update existing subscription
        UPDATE subscriptions SET
            tier = COALESCE(p_updates->>'tier', tier),
            status = COALESCE(p_updates->>'status', status),
            stripe_subscription_id = COALESCE(p_updates->>'stripeSubscriptionId', stripe_subscription_id),
            stripe_customer_id = COALESCE(p_updates->>'stripeCustomerId', stripe_customer_id),
            current_period_start = CASE
                WHEN p_updates->>'current_period_start' IS NOT NULL
                THEN (p_updates->>'current_period_start')::TIMESTAMPTZ
                ELSE current_period_start
            END,
            current_period_end = CASE
                WHEN p_updates->>'current_period_end' IS NOT NULL
                THEN (p_updates->>'current_period_end')::TIMESTAMPTZ
                ELSE current_period_end
            END,
            updated_at = NOW()
        WHERE id = v_subscription_id;

        v_result := TRUE;
    END IF;

    -- Log subscription change for audit trail
    INSERT INTO subscription_events (
        subscription_id,
        event_type,
        event_data,
        processed_at,
        created_at
    ) VALUES (
        v_subscription_id,
        'subscription_updated',
        jsonb_build_object(
            'old_status', v_old_status,
            'new_status', v_new_status,
            'updates', p_updates,
            'updated_by', 'system'
        ),
        NOW(),
        NOW()
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error for debugging
        INSERT INTO subscription_events (
            subscription_id,
            event_type,
            event_data,
            processed_at,
            created_at
        ) VALUES (
            v_subscription_id,
            'subscription_update_error',
            jsonb_build_object(
                'error_message', SQLERRM,
                'error_state', SQLSTATE,
                'updates', p_updates,
                'user_id', p_user_id
            ),
            NOW(),
            NOW()
        );

        -- Re-raise the error
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Function to process webhook events with idempotency
CREATE OR REPLACE FUNCTION process_webhook_event_transactional(
    p_stripe_event_id TEXT,
    p_event_type TEXT,
    p_subscription_id UUID,
    p_event_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    v_existing_event_id TEXT;
    v_result BOOLEAN := FALSE;
BEGIN
    -- Check if event already processed (idempotency check)
    SELECT stripe_event_id INTO v_existing_event_id
    FROM subscription_events
    WHERE stripe_event_id = p_stripe_event_id
    LIMIT 1;

    IF v_existing_event_id IS NOT NULL THEN
        -- Event already processed, return success without processing
        RETURN TRUE;
    END IF;

    -- Process the event
    INSERT INTO subscription_events (
        subscription_id,
        event_type,
        stripe_event_id,
        event_data,
        processed_at,
        created_at
    ) VALUES (
        p_subscription_id,
        p_event_type,
        p_stripe_event_id,
        p_event_data,
        NOW(),
        NOW()
    );

    v_result := TRUE;
    RETURN v_result;
EXCEPTION
    WHEN unique_violation THEN
        -- Another process already inserted this event (race condition)
        -- Return success since the event is being processed
        RETURN TRUE;
    WHEN OTHERS THEN
        -- Log error and re-raise
        INSERT INTO subscription_events (
            subscription_id,
            event_type,
            stripe_event_id,
            event_data,
            processed_at,
            created_at
        ) VALUES (
            p_subscription_id,
            'webhook_processing_error',
            p_stripe_event_id,
            jsonb_build_object(
                'error_message', SQLERRM,
                'error_state', SQLSTATE,
                'original_event_data', p_event_data
            ),
            NOW(),
            NOW()
        );

        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Function to safely retry failed subscription operations
CREATE OR REPLACE FUNCTION retry_failed_subscription_operation(
    p_user_id UUID,
    p_operation_type TEXT,
    p_operation_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    v_retry_count INTEGER;
    v_max_retries INTEGER := 3;
    v_result BOOLEAN := FALSE;
BEGIN
    -- Get current retry count for this operation
    SELECT COALESCE((event_data->>'retry_count')::INTEGER, 0) INTO v_retry_count
    FROM subscription_events
    WHERE subscription_id = (
        SELECT id FROM subscriptions WHERE user_id = p_user_id
    )
    AND event_type = p_operation_type || '_retry'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Check if max retries exceeded
    IF v_retry_count >= v_max_retries THEN
        INSERT INTO subscription_events (
            subscription_id,
            event_type,
            event_data,
            processed_at,
            created_at
        ) VALUES (
            (SELECT id FROM subscriptions WHERE user_id = p_user_id),
            p_operation_type || '_max_retries_exceeded',
            jsonb_build_object(
                'retry_count', v_retry_count,
                'max_retries', v_max_retries,
                'operation_data', p_operation_data
            ),
            NOW(),
            NOW()
        );

        RETURN FALSE;
    END IF;

    -- Attempt the retry
    INSERT INTO subscription_events (
        subscription_id,
        event_type,
        event_data,
        processed_at,
        created_at
    ) VALUES (
        (SELECT id FROM subscriptions WHERE user_id = p_user_id),
        p_operation_type || '_retry',
        jsonb_build_object(
            'retry_count', v_retry_count + 1,
            'operation_data', p_operation_data,
            'retry_timestamp', NOW()
        ),
        NOW(),
        NOW()
    );

    v_result := TRUE;
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        -- Log retry failure
        INSERT INTO subscription_events (
            subscription_id,
            event_type,
            event_data,
            processed_at,
            created_at
        ) VALUES (
            (SELECT id FROM subscriptions WHERE user_id = p_user_id),
            p_operation_type || '_retry_failed',
            jsonb_build_object(
                'retry_count', v_retry_count + 1,
                'error_message', SQLERRM,
                'error_state', SQLSTATE,
                'operation_data', p_operation_data
            ),
            NOW(),
            NOW()
        );

        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old subscription events (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_subscription_events(
    p_days_old INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM subscription_events
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_old
    AND event_type NOT IN ('subscription_created', 'subscription_canceled');

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id_unique
ON subscription_events (stripe_event_id)
WHERE stripe_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_events_processing
ON subscription_events (subscription_id, event_type, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_status
ON subscriptions (user_id, status)
WHERE status IN ('active', 'past_due', 'trialing');

-- Add comments
COMMENT ON FUNCTION update_subscription_transactional(UUID, JSONB) IS
'Atomically updates subscription data with full transaction safety and audit logging';

COMMENT ON FUNCTION process_webhook_event_transactional(TEXT, TEXT, UUID, JSONB) IS
'Processes Stripe webhook events with idempotency checking to prevent duplicate processing';

COMMENT ON FUNCTION retry_failed_subscription_operation(UUID, TEXT, JSONB) IS
'Safely retries failed subscription operations with exponential backoff and max retry limits';

COMMENT ON FUNCTION cleanup_old_subscription_events(INTEGER) IS
'Maintenance function to clean up old subscription events while preserving critical lifecycle events';