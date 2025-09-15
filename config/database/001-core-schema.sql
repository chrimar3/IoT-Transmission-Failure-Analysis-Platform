-- Migration 001: Core Database Schema for CU-BEMS IoT Platform
-- Description: Creates time-series optimized schema for Bangkok dataset
-- Author: CU-BEMS Development Team
-- Date: 2025-09-12

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core sensor data table optimized for time-series
CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    sensor_id VARCHAR(50) NOT NULL,
    floor_number INTEGER NOT NULL CHECK (floor_number BETWEEN 1 AND 7),
    equipment_type VARCHAR(100),
    reading_value DECIMAL(10,4),
    unit VARCHAR(20),
    status VARCHAR(20) DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'error', 'offline')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-tenant subscription management
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'professional')),
    stripe_subscription_id VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User activity tracking for rate limiting and analytics
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    resource_accessed VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Performance-optimized indexes
-- Time-series primary access pattern: timestamp + sensor_id
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp_brin ON sensor_readings USING BRIN (timestamp);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_timestamp ON sensor_readings (sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_floor_timestamp ON sensor_readings (floor_number, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_equipment_timestamp ON sensor_readings (equipment_type, timestamp DESC);

-- Multi-tenant access indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_timestamp ON user_activity (user_id, timestamp DESC);

-- Composite index for dashboard queries (sensor + time range)
CREATE INDEX IF NOT EXISTS idx_sensor_readings_composite ON sensor_readings (sensor_id, floor_number, timestamp DESC);

-- COMMENT ON TABLES for documentation
COMMENT ON TABLE sensor_readings IS 'Time-series data from Bangkok CU-BEMS IoT sensors - optimized for 4-6M records';
COMMENT ON TABLE subscriptions IS 'Multi-tenant subscription management with tier-based access control';
COMMENT ON TABLE user_activity IS 'User activity tracking for rate limiting and analytics';

-- COMMENT ON COLUMNS for important fields
COMMENT ON COLUMN sensor_readings.timestamp IS 'Sensor reading timestamp with timezone support';
COMMENT ON COLUMN sensor_readings.sensor_id IS 'Unique sensor identifier from Bangkok dataset';
COMMENT ON COLUMN sensor_readings.reading_value IS 'Numeric sensor value (energy consumption, temperature, etc.)';
COMMENT ON COLUMN subscriptions.tier IS 'Subscription tier: free (5 exports/month) or professional (unlimited)';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID for payment tracking';

-- Table statistics for query optimizer
ANALYZE sensor_readings;
ANALYZE subscriptions;
ANALYZE user_activity;