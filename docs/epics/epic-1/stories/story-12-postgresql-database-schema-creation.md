# Story 1.2: PostgreSQL Database Schema Creation
**Priority**: P0 (Blocking)  
**Effort**: 3 points  

**User Story**: As a developer, I need a properly structured database schema so that sensor data can be efficiently stored and queried.

**Acceptance Criteria**:
- Schema supports Bangkok dataset structure (134 sensors, 7 floors)
- Optimized indexes for time-series queries
- Materialized views for common aggregations
- Migration scripts for schema updates
- Supports multi-tenant data isolation

**Tasks**:
1. Design sensor_readings table with proper indexing
2. Create materialized views for daily/hourly aggregates
3. Add database migration system
4. Create seed data for development
5. Add database performance testing
