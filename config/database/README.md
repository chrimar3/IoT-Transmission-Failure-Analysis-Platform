# Database Schema - CU-BEMS IoT Platform

This directory contains the complete database schema for the Bangkok dataset analysis platform. The schema is optimized for time-series data with 4-6 million sensor readings and supports multi-tenant access with row-level security.

## 📁 Schema Files

### Core Migrations
- **001-core-schema.sql** - Primary tables with time-series optimization
- **002-materialized-views.sql** - Performance aggregation views  
- **003-rls-policies.sql** - Multi-tenant security and access control

### Setup Scripts
- **setup-database.js** - Automated database initialization script
- **README.md** - This documentation file

## 🏗️ Schema Architecture

### Primary Tables

#### `sensor_readings` 
Main time-series table for Bangkok IoT sensor data
- **Optimization**: BRIN indexes for timestamp queries
- **Capacity**: Designed for 4-6M records
- **Performance**: <500ms response time requirement
- **Partitioning**: Time-based for scalability

```sql
CREATE TABLE sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    sensor_id VARCHAR(50) NOT NULL,
    floor_number INTEGER CHECK (floor_number BETWEEN 1 AND 7),
    equipment_type VARCHAR(100),
    reading_value DECIMAL(10,4),
    unit VARCHAR(20),
    status VARCHAR(20) DEFAULT 'normal'
);
```

#### `subscriptions`
Multi-tenant subscription management with tier-based access
- **Tiers**: Free (7-day data access) vs Professional (full access)
- **Integration**: Stripe subscription tracking
- **Security**: Row-level security for user isolation

#### `user_activity`
Activity tracking for rate limiting and analytics
- **Rate Limiting**: Tier-based API call limits
- **Analytics**: User behavior tracking
- **Security**: Individual user access logging

### Materialized Views

#### `daily_aggregates`
Pre-computed daily sensor statistics for executive dashboard
- **Refresh**: Scheduled nightly updates
- **Performance**: Sub-100ms dashboard load times
- **Metrics**: AVG, MAX, MIN, COUNT, error rates

#### `hourly_aggregates` 
Real-time dashboard data (last 7 days)
- **Refresh**: Hourly updates
- **Usage**: Live system monitoring
- **Scope**: Rolling 7-day window

#### `system_health_summary`
Overall system health metrics for monitoring
- **Metrics**: Active sensors, error rates, system health %
- **Period**: Last 30 days
- **Usage**: Operations dashboard

## 🔒 Security Model

### Row Level Security (RLS)
- **Tenant Isolation**: Users can only access their subscription data
- **Tier-Based Access**: Free users limited to 7-day data access
- **Service Role**: Full access for admin operations

### Key Security Functions
- `get_user_subscription_tier()` - Returns user's subscription level
- `check_rate_limit()` - Enforces tier-based API limits  
- `log_user_activity()` - Tracks user actions for security

### Rate Limiting
| Tier | API Calls/Hour | Data Access | Exports/Month |
|------|---------------|-------------|---------------|
| Free | 100 | 7 days | 5 |
| Professional | 1,000 | Full dataset | Unlimited |

## ⚡ Performance Optimizations

### Indexing Strategy
```sql
-- Time-series primary access pattern
CREATE INDEX idx_sensor_readings_timestamp_brin 
    ON sensor_readings USING BRIN (timestamp);

-- Multi-dimensional queries
CREATE INDEX idx_sensor_readings_sensor_timestamp 
    ON sensor_readings (sensor_id, timestamp DESC);

-- Equipment analysis
CREATE INDEX idx_sensor_readings_equipment_timestamp 
    ON sensor_readings (equipment_type, timestamp DESC);
```

### Query Performance Targets
- **API Endpoints**: <500ms response time
- **Dashboard Load**: <100ms for materialized views
- **Bulk Import**: <10 minutes for full dataset
- **Materialized View Refresh**: <5 minutes for daily aggregates

## 🚀 Setup Instructions

### Prerequisites
- Supabase project with PostgreSQL 15+
- Service role key for schema modifications
- Node.js 18+ for setup scripts

### Environment Variables
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Database Setup
```bash
# Production setup
node scripts/setup-database.js --environment=production

# Development with test data
node scripts/setup-database.js --environment=development --seed-data
```

### Materialized View Refresh
```sql
-- Manual refresh (development)
SELECT refresh_all_aggregates();

-- Scheduled refresh (production)
-- Set up via Supabase Dashboard or pg_cron extension
```

## 📊 Bangkok Dataset Specifications

### Dataset Characteristics
- **Sensors**: 134 unique IoT devices
- **Floors**: 7-floor building coverage  
- **Time Period**: 18 months (2018-2019)
- **Data Points**: ~4.6M sensor readings
- **File Size**: 700MB original dataset

### Equipment Types
- **HVAC Systems**: Energy consumption monitoring
- **Lighting**: Power usage tracking
- **Electrical**: General electrical load monitoring

### Data Quality
- **Completeness**: >95% data coverage
- **Accuracy**: Validated against building energy audits
- **Frequency**: 5-15 minute reading intervals

## 🔧 Maintenance

### Daily Operations
- Monitor materialized view refresh logs
- Check query performance metrics
- Review error rates and system health

### Weekly Tasks  
- Analyze storage growth trends
- Review user activity patterns
- Update performance benchmarks

### Monthly Tasks
- Database vacuum and analyze
- Index usage analysis
- Capacity planning review

## 📈 Monitoring & Alerting

### Key Metrics
- Query response times (target: <500ms)
- Active sensor count vs expected 134
- Error rate percentage (target: <5%)
- Storage growth rate

### Alert Thresholds
- **Critical**: API response time >1s
- **Warning**: Error rate >5%
- **Info**: Storage >80% of tier limit

## 🔍 Troubleshooting

### Common Issues

#### Slow Query Performance
1. Check index usage with `EXPLAIN ANALYZE`
2. Verify materialized view freshness
3. Consider query optimization or additional indexes

#### High Error Rates
1. Review sensor_readings status distribution
2. Check equipment_type reliability metrics
3. Investigate timestamp data quality

#### Storage Limits
1. Review data retention policies
2. Consider time-based partitioning
3. Optimize historical data archival

### Performance Debugging
```sql
-- Identify slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check materialized view sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables 
WHERE tablename LIKE '%aggregates';
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Time-Series Best Practices](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Database Performance Monitoring](https://supabase.com/docs/guides/database/performance)

## 📝 Migration History

| Version | Date | Description | Files |
|---------|------|-------------|-------|
| 001 | 2025-09-12 | Core schema with time-series optimization | 001-core-schema.sql |
| 002 | 2025-09-12 | Materialized views for performance | 002-materialized-views.sql |
| 003 | 2025-09-12 | RLS policies for multi-tenant security | 003-rls-policies.sql |