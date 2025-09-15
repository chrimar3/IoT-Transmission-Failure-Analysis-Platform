# Database Schema Fixes

## Issue Fixed: PostgreSQL ROUND Function Error

**Error**: `function round(double precision, integer) does not exist`

**Root Cause**: PostgreSQL requires explicit type casting for ROUND function with double precision values.

## Fixed Files

### `database/002-materialized-views.sql`

**Changes Made**:
1. Line 49: `ROUND(AVG(reading_value), 2)` → `ROUND(AVG(reading_value)::numeric, 2)`
2. Line 68: `ROUND(AVG(reading_value), 2)` → `ROUND(AVG(reading_value)::numeric, 2)`  
3. Line 69: `ROUND(STDDEV(reading_value), 2)` → `ROUND(STDDEV(reading_value)::numeric, 2)`
4. Lines 53-56: Added `::numeric` cast to percentage calculation
5. Lines 71-74: Added `::numeric` cast to reliability percentage calculation

**Technical Details**:
- PostgreSQL `AVG()` and `STDDEV()` return `double precision` type
- `ROUND()` function requires `numeric` type for precision parameter
- Solution: Cast `double precision` to `numeric` using `::numeric`

## Deployment Instructions

Now you can run the corrected SQL files in Supabase SQL Editor:

1. **Core Schema**: `database/001-core-schema.sql` (no changes needed)
2. **Materialized Views**: `database/002-materialized-views.sql` ✅ **FIXED**
3. **RLS Policies**: `database/003-rls-policies.sql` (no changes needed)

## Verification

After running all three files:
```bash
npm run db:setup
```

This will verify the schema deployment and create sample data.

---
**Status**: Fixed and ready for deployment
**Impact**: Resolves blocking issue for materialized views creation