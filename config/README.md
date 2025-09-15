# ⚙️ Configuration (`/config`)

Configuration files and database schemas for the CU-BEMS IoT platform.

## 🗂️ Directory Structure

```
config/
├── database/           # Database schemas and migrations
│   ├── 001-core-schema.sql
│   ├── 002-materialized-views.sql
│   └── 003-rls-policies.sql
└── environment/        # Environment configurations
    ├── development.env.example
    ├── production.env.example
    └── test.env.example
```

## 📁 Database Configuration (`/database`)

### Schema Files
Database schemas are organized by migration order and purpose:

#### `001-core-schema.sql`
**Purpose**: Core database tables and relationships
- User management tables
- Sensor data tables
- Reading storage tables
- Indexes and constraints

**Example**:
```sql
-- Sensor readings table
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    value DECIMAL(10, 4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    floor_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp);
CREATE INDEX idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);
```

#### `002-materialized-views.sql`
**Purpose**: Materialized views for performance optimization
- Hourly aggregations
- Daily summaries
- Monthly reports
- Insight calculations

**Example**:
```sql
-- Daily energy consumption summary
CREATE MATERIALIZED VIEW daily_energy_summary AS
SELECT
    DATE(timestamp) as date,
    floor_number,
    COUNT(*) as reading_count,
    AVG(value) as avg_consumption,
    MAX(value) as peak_consumption,
    MIN(value) as min_consumption
FROM sensor_readings
WHERE unit = 'kwh'
GROUP BY DATE(timestamp), floor_number;

-- Refresh schedule
CREATE INDEX ON daily_energy_summary (date, floor_number);
```

#### `003-rls-policies.sql`
**Purpose**: Row Level Security (RLS) policies for Supabase
- User access control
- Data isolation
- Security policies

**Example**:
```sql
-- Enable RLS on sensor_readings
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read their data
CREATE POLICY "Users can read sensor data" ON sensor_readings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for service role to manage all data
CREATE POLICY "Service role full access" ON sensor_readings
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
```

### Migration Management

#### Running Migrations
```bash
# Connect to database
psql -h your-db-host -U postgres -d your-database

# Run migrations in order
\i config/database/001-core-schema.sql
\i config/database/002-materialized-views.sql
\i config/database/003-rls-policies.sql
```

#### Version Tracking
```sql
-- Migration tracking table
CREATE TABLE schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT
);

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES ('001', 'Core schema with sensor readings and users');
```

## 🌍 Environment Configuration (`/environment`)

### Environment Files

#### `development.env.example`
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/iot_platform_dev

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudflare R2
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=cu-bems-datasets
CLOUDFLARE_R2_REGION=auto

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=debug
```

#### `production.env.example`
```env
# Database
DATABASE_URL=postgresql://user:pass@prod-db:5432/iot_platform

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key

# Cloudflare R2
CLOUDFLARE_R2_ACCESS_KEY_ID=your-prod-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-prod-secret-key
CLOUDFLARE_R2_BUCKET_NAME=cu-bems-datasets-prod
CLOUDFLARE_R2_REGION=auto

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
LOG_LEVEL=info

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-encryption-key
```

### Environment Management

#### Local Development Setup
```bash
# Copy example environment file
cp config/environment/development.env.example .env.local

# Edit with your actual values
nano .env.local

# Verify environment loading
npm run env:check
```

#### Deployment
```bash
# Production environment
cp config/environment/production.env.example .env.production

# Set production values
# Deploy with environment variables
```

## 🔧 Configuration Loading

### Next.js Configuration
```typescript
// lib/config.ts
export const config = {
  database: {
    url: process.env.DATABASE_URL!,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  r2: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    region: process.env.CLOUDFLARE_R2_REGION || 'auto',
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL!,
    env: process.env.NODE_ENV!,
    logLevel: process.env.LOG_LEVEL || 'info',
  },
};

// Validate required environment variables
function validateConfig() {
  const required = [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

validateConfig();
```

## 🗄️ Database Management

### Backup Strategy
```bash
# Create backup
pg_dump -h localhost -U postgres iot_platform > backup.sql

# Restore backup
psql -h localhost -U postgres iot_platform < backup.sql
```

### Performance Monitoring
```sql
-- Check table sizes
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE tablename = 'sensor_readings';

-- Monitor query performance
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

## 🔒 Security Considerations

### Secrets Management
1. **Never commit** real credentials to version control
2. **Use** environment variables for all secrets
3. **Rotate** keys regularly
4. **Use** different credentials for each environment

### Database Security
1. **Enable RLS** on all tables
2. **Use** least-privilege access
3. **Monitor** database connections
4. **Regular** security updates

## 📋 Configuration Checklist

### New Environment Setup
- [ ] Copy appropriate .env.example file
- [ ] Set all required environment variables
- [ ] Run database migrations
- [ ] Verify database connectivity
- [ ] Test API endpoints
- [ ] Validate external service connections

### Security Audit
- [ ] No hardcoded secrets
- [ ] RLS policies enabled
- [ ] Environment-specific credentials
- [ ] Regular key rotation schedule
- [ ] Monitoring and alerting configured

This configuration structure ensures secure, scalable, and maintainable deployment of the IoT platform across all environments.