-- Migration 002: Materialized Views for Performance Optimization
-- Description: Creates aggregated views for dashboard performance
-- Author: CU-BEMS Development Team
-- Date: 2025-09-12

-- Daily aggregates materialized view for executive dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_aggregates AS
SELECT 
    DATE(timestamp) as date,
    sensor_id,
    floor_number,
    equipment_type,
    AVG(reading_value) as avg_value,
    MAX(reading_value) as max_value,
    MIN(reading_value) as min_value,
    STDDEV(reading_value) as std_dev,
    COUNT(*) as reading_count,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
    COUNT(CASE WHEN status = 'warning' THEN 1 END) as warning_count
FROM sensor_readings
WHERE status IN ('normal', 'warning', 'error')
GROUP BY DATE(timestamp), sensor_id, floor_number, equipment_type
ORDER BY date DESC, sensor_id;

-- Hourly aggregates for real-time dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_aggregates AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    sensor_id,
    floor_number,
    equipment_type,
    AVG(reading_value) as avg_value,
    MAX(reading_value) as max_value,
    MIN(reading_value) as min_value,
    COUNT(*) as reading_count,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
FROM sensor_readings
WHERE timestamp >= NOW() - INTERVAL '7 days'
    AND status IN ('normal', 'warning', 'error')
GROUP BY DATE_TRUNC('hour', timestamp), sensor_id, floor_number, equipment_type
ORDER BY hour DESC, sensor_id;

-- System health summary for monitoring
CREATE MATERIALIZED VIEW IF NOT EXISTS system_health_summary AS
SELECT 
    DATE(timestamp) as date,
    COUNT(DISTINCT sensor_id) as active_sensors,
    COUNT(*) as total_readings,
    ROUND(AVG(reading_value)::numeric, 2) as avg_reading,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
    COUNT(CASE WHEN status = 'warning' THEN 1 END) as warning_count,
    COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline_count,
    ROUND(
        ((COUNT(CASE WHEN status = 'normal' THEN 1 END)::FLOAT / COUNT(*)) * 100)::numeric, 
        2
    ) as health_percentage
FROM sensor_readings
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Equipment type performance summary
CREATE MATERIALIZED VIEW IF NOT EXISTS equipment_performance AS
SELECT 
    equipment_type,
    floor_number,
    COUNT(DISTINCT sensor_id) as sensor_count,
    ROUND(AVG(reading_value)::numeric, 2) as avg_value,
    ROUND(STDDEV(reading_value)::numeric, 2) as value_deviation,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
    ROUND(
        ((COUNT(CASE WHEN status = 'normal' THEN 1 END)::FLOAT / COUNT(*)) * 100)::numeric, 
        2
    ) as reliability_percentage
FROM sensor_readings
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY equipment_type, floor_number
ORDER BY reliability_percentage DESC;

-- Indexes for materialized views
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_aggregates_date_sensor ON daily_aggregates (date, sensor_id);
CREATE INDEX IF NOT EXISTS idx_daily_aggregates_date ON daily_aggregates (date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_aggregates_floor ON daily_aggregates (floor_number, date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hourly_aggregates_hour_sensor ON hourly_aggregates (hour, sensor_id);
CREATE INDEX IF NOT EXISTS idx_hourly_aggregates_hour ON hourly_aggregates (hour DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_health_date ON system_health_summary (date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_performance ON equipment_performance (equipment_type, floor_number);

-- Functions for materialized view refresh
CREATE OR REPLACE FUNCTION refresh_daily_aggregates()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_aggregates;
    RAISE NOTICE 'Daily aggregates refreshed at %', NOW();
END;
$$;

CREATE OR REPLACE FUNCTION refresh_hourly_aggregates()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_aggregates;
    RAISE NOTICE 'Hourly aggregates refreshed at %', NOW();
END;
$$;

CREATE OR REPLACE FUNCTION refresh_all_aggregates()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM refresh_daily_aggregates();
    PERFORM refresh_hourly_aggregates();
    REFRESH MATERIALIZED VIEW CONCURRENTLY system_health_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY equipment_performance;
    RAISE NOTICE 'All materialized views refreshed at %', NOW();
END;
$$;

-- Comments for documentation
COMMENT ON MATERIALIZED VIEW daily_aggregates IS 'Daily sensor aggregates for executive dashboard - refresh nightly';
COMMENT ON MATERIALIZED VIEW hourly_aggregates IS 'Hourly aggregates for real-time dashboard - refresh every hour';
COMMENT ON MATERIALIZED VIEW system_health_summary IS 'System health metrics for monitoring dashboard';
COMMENT ON MATERIALIZED VIEW equipment_performance IS 'Equipment performance summary by type and floor';

COMMENT ON FUNCTION refresh_daily_aggregates() IS 'Refresh daily aggregates materialized view';
COMMENT ON FUNCTION refresh_hourly_aggregates() IS 'Refresh hourly aggregates materialized view';
COMMENT ON FUNCTION refresh_all_aggregates() IS 'Refresh all materialized views - use for scheduled maintenance';