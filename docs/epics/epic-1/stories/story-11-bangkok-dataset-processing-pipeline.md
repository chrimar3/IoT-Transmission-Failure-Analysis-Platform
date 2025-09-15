# Story 1.1: Bangkok Dataset Processing Pipeline

## Status
**Draft**

## Story
**As a** system administrator,
**I want** an automated pipeline to process the Bangkok CU-BEMS CSV files with streaming capabilities for large datasets,
**so that** the data is available for analytics queries with proper validation and error handling

## Acceptance Criteria
1. CSV validation script identifies data quality issues and structural problems
2. Automated processing handles both 2018 (215MB) and 2019 (483MB) files using streaming to prevent memory overflow
3. Data cleaning removes invalid/duplicate entries according to sensor data format specifications
4. Processing logs provide detailed error reporting with file location references
5. Pipeline can be run locally and integrates with CI/CD (GitHub Actions data-validation job)
6. Processing supports PostgreSQL import via pg_copy for performance
7. Creates materialized views for query performance optimization
8. Supports incremental processing for data updates
9. Handles large file processing without Node.js memory limits (streaming approach)
10. Provides progress tracking with percentage completion for large files

## Priority & Effort
**Priority**: P0 (Blocking) - Critical foundation for all analytics functionality
**Effort**: 5 points
**Epic**: Epic 1 - Core Data Foundation

## Tasks / Subtasks
- [ ] **Task 1: Create CSV validation framework** (AC: 1, 3)
  - [ ] Implement schema validation for Bangkok dataset structure [Source: architecture/1-bangkok-dataset-integration-pipeline.md]
  - [ ] Add sensor_id format validation (VARCHAR(50))
  - [ ] Add timestamp validation (TIMESTAMPTZ format)
  - [ ] Add reading_value validation (DECIMAL(10,4) range checking)
  - [ ] Create unit tests for validation functions (Jest framework)
  
- [ ] **Task 2: Implement streaming data processing** (AC: 2, 9)
  - [ ] Create Node.js streaming CSV parser to handle 700MB+ files
  - [ ] Implement memory-efficient processing using Transform streams
  - [ ] Add batch processing (1000 records per batch)
  - [ ] Create progress tracking with percentage completion
  - [ ] Add unit tests for streaming functions
  
- [ ] **Task 3: Data cleaning and normalization** (AC: 3)
  - [ ] Remove duplicate entries based on timestamp + sensor_id
  - [ ] Clean invalid reading_values (null, out-of-range)
  - [ ] Normalize equipment_type values to standardized list
  - [ ] Add data quality metrics tracking
  - [ ] Create unit tests for cleaning functions
  
- [ ] **Task 4: PostgreSQL integration** (AC: 6, 7)
  - [ ] Implement pg_copy integration for bulk inserts
  - [ ] Create materialized view generation scripts
  - [ ] Add database connection pooling
  - [ ] Create database schema validation
  - [ ] Add integration tests with test database
  
- [ ] **Task 5: Error logging and reporting** (AC: 4)
  - [ ] Implement structured logging with file locations
  - [ ] Create error categorization (validation, processing, database)
  - [ ] Add error summary reports
  - [ ] Create log rotation for production
  - [ ] Add unit tests for logging functions
  
- [ ] **Task 6: CI/CD integration** (AC: 5)
  - [ ] Create npm scripts for dataset validation
  - [ ] Integrate with GitHub Actions data-validation job
  - [ ] Add test data for CI pipeline
  - [ ] Create deployment scripts
  - [ ] Add end-to-end tests for full pipeline

## Dev Notes

### Previous Story Insights
No previous story insights available - this is the first story in Epic 1.

### Data Models
**Primary Data Structure** [Source: architecture/7-database-schema-bangkok-dataset-optimized.md]
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

**Performance Optimization** [Source: architecture/7-database-schema-bangkok-dataset-optimized.md]
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

### Dataset Specifications
**Bangkok Dataset Structure** [Source: architecture/1-bangkok-dataset-integration-pipeline.md]
```
CU-BEMS Dataset/ (Local)
├── 2018_energy_data.csv (215MB) 
├── 2019_energy_data.csv (483MB)
└── metadata/
    ├── sensor_mappings.csv
    ├── floor_layouts.csv
    └── equipment_specifications.csv
```

**Processing Pipeline Requirements** [Source: architecture/1-bangkok-dataset-integration-pipeline.md]
1. CSV Validation & Cleaning (Node.js scripts)
2. PostgreSQL Import via pg_copy
3. Materialized Views for Performance
4. Incremental Processing for Updates

### Technology Stack
**Data Processing Tools** [Source: architecture/2-ultra-lean-technology-stack.md]
- **ETL**: Node.js scripts (serverless functions)
- **Database**: Supabase PostgreSQL (Free tier: 500MB)
- **Storage**: Supabase Storage for processed datasets

### File Locations
**Script Location** [Source: architecture/source-tree.md]
```
├── scripts/                     # Data processing and deployment scripts
│   ├── process-dataset.js       # Bangkok dataset processing
│   ├── setup-database.js       # Database schema setup
│   ├── validate-data.js        # Data integrity validation
│   └── deploy.sh               # Deployment script
```

**NPM Scripts** [Source: architecture/11-development-workflow.md]
```bash
# Dataset preparation
npm run dataset:validate
npm run dataset:process
npm run db:migrate

# Automated processing
npm run process:2018-data
npm run process:2019-data
npm run create:materialized-views
npm run validate:data-integrity
```

### Technical Constraints
**Memory Limitations**: Large files (700MB total) exceed standard Node.js memory limits - MUST use streaming processing

**Database Limits** [Source: architecture/2-ultra-lean-technology-stack.md]
- Supabase Free tier: 500MB storage limit
- Need efficient processing to stay within limits

**Performance Requirements**: Processing must complete within reasonable time for development workflow

### Production Readiness Requirements
**Failure Handling**:
- Retry logic for database connection failures
- Graceful handling of malformed CSV data
- Transaction rollback on processing errors
- Detailed error reporting with file location context

**Monitoring**:
- Processing progress tracking
- Data quality metrics collection
- Performance timing measurements
- Error rate monitoring

**Documentation**:
- Processing pipeline operational runbook
- Data validation criteria documentation
- Error troubleshooting guide
- Performance tuning guidelines

### Testing
**Test File Locations** [Source: architecture/source-tree.md]
```
__tests__/                   # Test files
├── components/             # Component tests
├── hooks/                  # Hook tests  
├── api/                    # API endpoint tests
├── lib/                    # Utility function tests
└── __mocks__/              # Mock data and utilities
```

**Testing Requirements** [Source: architecture/5-testing-framework-setup-installation.md]
- **Unit Tests**: Jest + Testing Library (85% minimum coverage)
- **Integration Tests**: API endpoint testing with test database
- **Data Pipeline Tests**: CSV processing validation (100% validation coverage)
- **Performance Tests**: Large file processing benchmarks

**Test Database Strategy** [Source: architecture/5-testing-framework-setup-installation.md]
- **Local**: Docker PostgreSQL with sample dataset
- **CI**: Supabase test project with sanitized data
- **Staging**: Separate Supabase project with 10% dataset

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-09-11 | 2.0 | Complete story enhancement with architecture integration and streaming processing requirements | Claude Code |
| Initial | 1.0 | Basic story structure | System |

## Dev Agent Record

### Agent Model Used
*To be populated by development agent*

### Debug Log References
*To be populated by development agent*

### Completion Notes List
*To be populated by development agent*

### File List
*To be populated by development agent*

## QA Results
*Results from QA Agent QA review of the completed story implementation*
