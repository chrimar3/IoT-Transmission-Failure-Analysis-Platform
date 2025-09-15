# 7. Database Schema (Bangkok Dataset Optimized)

```sql
-- Core sensor data from CU-BEMS dataset
CREATE TABLE sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    sensor_id VARCHAR(50) NOT NULL,
    floor_number INTEGER NOT NULL,
    equipment_type VARCHAR(100),
    reading_value DECIMAL(10,4),
    unit VARCHAR(20),
    status VARCHAR(20) DEFAULT 'normal'
);

-- Materialized view for performance
CREATE MATERIALIZED VIEW daily_aggregates AS
SELECT 
    DATE(timestamp) as date,
    sensor_id,
    floor_number,
    equipment_type,
    AVG(reading_value) as avg_value,
    MAX(reading_value) as max_value,
    MIN(reading_value) as min_value,
    COUNT(*) as reading_count
FROM sensor_readings
GROUP BY DATE(timestamp), sensor_id, floor_number, equipment_type;

-- Subscription management (simplified)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    tier VARCHAR(20) NOT NULL DEFAULT 'free',
    stripe_subscription_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
```
