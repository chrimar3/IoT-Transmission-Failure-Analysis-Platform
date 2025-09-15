# Story 1.3: Supabase Integration & Data Import

## Status
Draft

## Story
**As a** system administrator,
**I want** automated data import to Supabase with robust failure handling and monitoring,
**so that** processed Bangkok CU-BEMS dataset is reliably available for the application with production-grade data integrity and performance.

## Acceptance Criteria
1. Automated import using pg_copy for performance (handling 4-6M records from Bangkok dataset)
2. Incremental updates for new data without duplicating existing records
3. Data integrity validation after import with detailed error reporting
4. Rollback capability for failed imports with transaction safety
5. Environment-specific import (dev/staging/prod) with appropriate configurations
6. Production-readiness: Connection pool management, rate limiting, and monitoring
7. Error handling and retry logic for network failures and timeouts
8. Performance benchmarks met: <1s for simple queries, <10s for bulk imports

## Priority & Effort
**Priority**: P0 (Blocking) - Critical foundation for all data-dependent features  
**Effort**: 4 points  
**Epic**: Epic 1 - Core Data Foundation

## Tasks / Subtasks
- [ ] Task 1: Set up Supabase project and connection configuration (AC: 1, 6)
  - [ ] Create environment-specific Supabase projects (dev/staging/prod)
  - [ ] Configure connection pools with limits (100 concurrent connections max)
  - [ ] Set up service role authentication for data import operations
  - [ ] Create environment variable templates for database URLs and keys
- [ ] Task 2: Implement batch import with pg_copy optimization (AC: 1, 8)  
  - [ ] Create pg_copy implementation for sensor_readings table bulk insert
  - [ ] Add progress tracking for large file processing (215MB + 483MB files)
  - [ ] Implement chunked processing to stay within memory limits
  - [ ] Add performance benchmarks and timing instrumentation
- [ ] Task 3: Create incremental update mechanism (AC: 2, 3)
  - [ ] Design timestamp-based incremental processing strategy
  - [ ] Create data deduplication logic based on timestamp + sensor_id
  - [ ] Implement upsert operations for changed records
  - [ ] Add data integrity validation comparing source vs imported data
- [ ] Task 4: Add transaction safety and rollback capability (AC: 4, 6)
  - [ ] Wrap import operations in database transactions
  - [ ] Create rollback procedures for failed import attempts
  - [ ] Add import state tracking table for resume capability
  - [ ] Implement dead letter queue for failed records
- [ ] Task 5: Create import monitoring and production observability (AC: 6, 7)
  - [ ] Add Sentry error tracking integration for import failures
  - [ ] Create import metrics logging (records processed, errors, timing)
  - [ ] Set up automated alerts for import failures or performance degradation
  - [ ] Add retry logic with exponential backoff for network failures

## Dev Notes

### Previous Story Insights
From Story 1.2 (PostgreSQL Database Schema Creation), the database schema includes:
- `sensor_readings` table with proper indexing for time-series data
- Materialized views (`daily_aggregates`) for performance optimization  
- Support for Bangkok dataset structure (134 sensors, 7 floors)
- Multi-tenant data isolation capabilities

### Data Models & Schema Details
**Source**: [docs/architecture/7-database-schema-bangkok-dataset-optimized.md]

Primary table structure for import operations:
```sql
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
```

Materialized view to refresh after import:
```sql
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
```

### Bangkok Dataset Processing Pipeline
**Source**: [docs/architecture/1-bangkok-dataset-integration-pipeline.md]

Dataset specifications for import planning:
- **2018_energy_data.csv**: 215MB file requiring chunked processing
- **2019_energy_data.csv**: 483MB file requiring chunked processing  
- **Total records**: Estimated 4-6 million sensor readings
- **Processing approach**: CSV Validation → pg_copy → Materialized View Refresh

### Supabase Service Configuration
**Source**: [docs/architecture/2-ultra-lean-technology-stack.md]

Technology stack integration:
- **Database**: Supabase PostgreSQL (Free tier: 500MB storage limit)
- **Connection**: Direct PostgreSQL connection for pg_copy operations
- **Authentication**: Service role keys for server-side operations
- **Environment**: Development/staging/production project separation

### API Failure Handling Requirements  
**Source**: [docs/architecture/8-api-architecture.md#supabase-api-failure-strategies]

Critical failure handling for production:
- **Database Outages**: Read-only mode with cached data serving during import failures
- **Connection Limits**: Connection pooling with retry queues (100 concurrent max)
- **Query Timeouts**: Progressive query simplification for large imports
- **Rate Limit Hits**: Automatic request throttling with user notification

Service rate limits to monitor:
- **Supabase Free Tier**: 500MB storage, 2GB bandwidth, 100 concurrent connections
- **Rate Limit Monitoring**: Automated alerts at 80% of limits
- **Scaling Triggers**: Automatic tier upgrades when approaching limits

### File Locations & Project Structure
**Source**: [docs/architecture/source-tree.md]

Data processing script location:
- **Import Scripts**: `/scripts/process-dataset.js` for Bangkok dataset processing
- **Database Setup**: `/scripts/setup-database.js` for schema initialization  
- **Data Validation**: `/scripts/validate-data.js` for integrity checking
- **Environment Config**: `.env.local` for development, environment-specific for prod

API endpoint structure:
- **Import API**: `/src/app/api/admin/import/` for triggering import operations
- **Status API**: `/src/app/api/admin/import/status/` for progress monitoring
- **Validation API**: `/src/app/api/admin/validate/` for data integrity checks

### Production Readiness Requirements

#### API Failure Handling and Retry Logic Requirements
**Source**: [docs/architecture/8-api-architecture.md#api-failure-handling-service-resilience]
- **Database Connection Failures**: Implement connection pool management with retry queues
- **Network Timeouts**: 3 retry attempts with exponential backoff (1s, 2s, 4s delays)
- **Rate Limit Handling**: Automatic throttling with user notification when approaching Supabase limits
- **Service Outages**: Graceful degradation allowing read-only operations during import failures

#### Service Rate Limit Monitoring Requirements  
**Source**: [docs/architecture/8-api-architecture.md#service-rate-limits-monitoring]
- **Supabase Monitoring**: Track storage usage (500MB limit), bandwidth (2GB limit), concurrent connections (100 limit)
- **Automated Alerts**: Trigger alerts at 80% of any service limit to prevent import failures
- **Performance Benchmarks**: <1s for simple queries, <10s for bulk import operations
- **Scaling Triggers**: Automatic notifications for tier upgrades when approaching free tier limits

#### Error Logging and Alerting Specifications
**Source**: [docs/architecture/10-monitoring-observability.md]
- **Sentry Integration**: Track import failures with custom error grouping by operation type
- **Critical Alerts**: Import failures require <5 minute response time
- **Warning Alerts**: Performance degradation (>10s import time) requires <1 hour response
- **Error Rate Thresholds**: <0.1% failure rate for import operations
- **Alert Channels**: Email notifications for import failures, daily digest for performance metrics

#### Performance Benchmarks and Uptime Targets
**Source**: [docs/architecture/10-monitoring-observability.md#performance-measurement-framework]
- **Database Query Performance**: <100ms for simple queries, <1s for complex aggregations
- **Import Processing Time**: <10s per 10MB chunk, <60s for full file validation
- **Error Rate Requirements**: <0.1% for data import operations, <0.01% for critical validation checks
- **Memory Usage**: Stay within 512MB memory limit during import operations
- **Connection Pool**: Maintain <80% of 100 concurrent connection limit

### Testing Requirements
**Source**: [docs/architecture/5-testing-framework-setup-installation.md]

Testing standards for data import operations:
- **Unit Tests**: 85% minimum coverage for import functions
- **Integration Tests**: 100% coverage for API endpoints with test database
- **Data Pipeline Tests**: 100% validation coverage for CSV processing
- **Performance Tests**: Load testing for large dataset imports

Test database strategy:
- **Local Development**: Docker PostgreSQL with sample dataset (10% of full data)
- **CI Environment**: Supabase test project with sanitized data  
- **Staging**: Separate Supabase project with 10% Bangkok dataset
- **Test Coverage**: Simulate connection failures, timeouts, and data corruption scenarios

### Technical Constraints & Security
**Source**: [docs/architecture/coding-standards.md#security-standards]

Security requirements:
- **Input Validation**: Zod schema validation for all import parameters
- **Database Security**: Use service role keys, never expose in client code
- **Environment Variables**: All sensitive config in environment variables, never hardcoded
- **Error Handling**: Never expose database connection details in error responses

Type safety requirements:
- **Strict TypeScript**: No `any` types, comprehensive interface definitions
- **Database Types**: Generate and maintain Supabase database type definitions
- **Error Types**: Structured error interfaces for different failure scenarios

## Testing

### Testing Standards
**Source**: [docs/architecture/5-testing-framework-setup-installation.md]

**Test File Locations**: Co-located with source files
- Import functions: `/src/lib/__tests__/database.test.ts`
- API endpoints: `/src/app/api/admin/__tests__/import.test.ts`
- Data processing: `/scripts/__tests__/process-dataset.test.js`

**Testing Frameworks**: 
- **Unit Tests**: Jest + Testing Library for component and utility testing
- **Integration Tests**: Supertest for API endpoint testing with test database
- **Data Pipeline Tests**: Custom validation suites for CSV processing accuracy

**Coverage Requirements**:
- **Minimum Coverage**: 85% overall, 100% for data import business logic
- **API Endpoint Testing**: 100% happy path + comprehensive error case coverage
- **Data Pipeline Testing**: 100% validation coverage including malformed data scenarios

**Performance Testing Requirements**:
- **Load Testing**: Simulate large file imports (500MB+ files)
- **Connection Pool Testing**: Test behavior at connection limits (90+ concurrent connections)  
- **Memory Usage Testing**: Verify import operations stay within 512MB memory limits
- **Timeout Testing**: Verify proper handling of database timeouts and network failures

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-11 | 1.0 | Enhanced story with comprehensive Dev Notes, production readiness requirements, and architecture context | Claude |

## Dev Agent Record
*This section will be populated by the development agent during implementation*

### Agent Model Used
*To be filled by dev agent*

### Debug Log References  
*To be filled by dev agent*

### Completion Notes List
*To be filled by dev agent*

### File List
*To be filled by dev agent*

## QA Results
*This section will be populated by the QA agent after story completion*