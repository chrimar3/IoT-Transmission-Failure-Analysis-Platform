# Supabase Mock Data Structures

## Overview

This directory contains comprehensive Supabase mock data structures designed to fix 250+ component and integration tests in the CU-BEMS IoT Transmission Failure Analysis Platform.

## Files

### Core Mock Files

- **`supabase.ts`** - Main Supabase mock with comprehensive data structures and smart query chain
- **`@supabase/supabase-js.ts`** - Mock for the @supabase/supabase-js package
- **`lib/supabase-server.ts`** - Mock for the lib/supabase-server module

### Validation Files

- **`validate-structure.js`** - Simple validation script (no Jest required)
- **`test-validation.ts`** - Comprehensive validation script (Jest environment)

## Mock Data Structures

### 1. mockExecutiveSummary

Complete executive dashboard summary with all required metrics:

```typescript
{
  total_sensors: 150,
  active_sensors: 145,
  offline_sensors: 5,
  total_readings: 1500000,
  critical_alerts: 2,
  warning_alerts: 5,
  info_alerts: 12,
  avg_temperature: 23.5,
  system_health: 97,
  data_quality_score: 97,
  uptime_percentage: 99.2,
  // ... and more
}
```

### 2. mockFloorPerformance

Array of floor performance data with complete nested structures:

```typescript
[
  {
    floor_number: 1,
    floor_name: 'Ground Floor',
    sensor_count: 30,
    active_sensors: 29,
    health_score: 97,
    efficiency_score: 92,
    // ... and more
  },
  // ... more floors
]
```

### 3. mockPatterns

Pattern detection results with statistics:

```typescript
{
  patterns: [
    {
      id: 'pattern_001',
      pattern_type: 'spike',
      sensor_id: 'SENSOR_001',
      confidence: 0.95,
      severity: 'high',
      metadata: {
        statistical_metrics: { ... }
      }
    }
  ],
  statistics: {
    total_patterns: 15,
    high_confidence: 12
  }
}
```

### 4. mockAlerts

Alert data with complete nested structures:

```typescript
{
  alerts: [
    {
      id: 'alert-001',
      type: 'performance',
      severity: 'critical',
      title: 'HVAC System Performance Critical',
      affected_systems: ['HVAC', 'Temperature Control'],
      // ... and more
    }
  ],
  statistics: {
    total_active: 5,
    by_severity: { ... }
  }
}
```

### 5. mockSensorData

Time series sensor data array:

```typescript
[
  {
    timestamp: '2025-10-01T...',
    sensor_id: 'SENSOR_001',
    floor_number: 1,
    equipment_type: 'HVAC',
    reading_value: 23.5,
    unit: '°C',
    status: 'normal'
  }
]
```

### 6. mockVisualizationData

Complete visualization data with all nested objects:

```typescript
{
  dataset_info: { ... },
  real_time_updates: [ ... ],
  floor_performance: [ ... ],
  system_comparisons: [ ... ],
  environmental_conditions: { ... }
}
```

### 7. mockBuildingHealth

Building health metrics array:

```typescript
[
  {
    id: 'hvac_efficiency',
    name: 'HVAC Efficiency',
    value: 87.5,
    status: 'good',
    trend: 'up'
  }
]
```

### 8. mockPerformanceMetrics

Performance metrics with targets:

```typescript
[
  {
    id: 'energy',
    name: 'Energy',
    current: 87.5,
    target: 90,
    confidence: 96
  }
]
```

### 9. mockValidationSession

Validation session data:

```typescript
{
  session_id: 'session-123',
  validation_status: 'completed',
  total_sensors: 342,
  total_records: 124900000,
  metadata: { ... }
}
```

## Smart Query Chain

The mock implements a smart query chain that supports:

### Unlimited Method Chaining

```typescript
client
  .from('table_name')
  .select('*')
  .eq('id', 1)
  .gte('value', 10)
  .lte('value', 100)
  .order('created_at')
  .limit(10)
  .then(resolve => { ... });
```

### Supported Methods

- **`.select(fields?)`** - Select fields (supports field-based data routing)
- **`.eq(column, value)`** - Equality filter
- **`.gte(column, value)`** - Greater than or equal filter
- **`.lte(column, value)`** - Less than or equal filter
- **`.gt(column, value)`** - Greater than filter
- **`.lt(column, value)`** - Less than filter
- **`.in(column, values)`** - IN filter
- **`.order(column, options?)`** - Order by column
- **`.limit(count)`** - Limit results
- **`.single()`** - Return single object instead of array
- **`.then(resolve)`** - Promise-like behavior

### Context-Aware Data Returns

The mock automatically returns different data based on:

#### Table Name

```typescript
client.from('validation_sessions') // Returns mockValidationSession
client.from('sensor_readings')     // Returns mockSensorData
client.from('alerts')              // Returns mockAlerts.alerts
client.from('patterns')            // Returns mockPatterns.patterns
client.from('floor_performance')   // Returns mockFloorPerformance
```

#### Field Names in select()

```typescript
client.from('table').select('floor_number, floor_name')  // Returns mockFloorPerformance
client.from('table').select('patterns, detected_at')     // Returns mockPatterns
client.from('table').select('severity, alerts')          // Returns mockAlerts
client.from('table').select('sensor_id, reading_value')  // Returns mockSensorData
```

### Single vs Array Returns

```typescript
// Returns array
client.from('sensors').select('*').then(...)

// Returns single object
client.from('sensors').select('*').single().then(...)
```

## Usage in Tests

### Basic Usage

```typescript
import { createClient } from '@supabase/supabase-js';

// createClient is automatically mocked
const supabase = createClient('url', 'key');

// All queries return appropriate mock data
const { data, error } = await supabase
  .from('sensor_readings')
  .select('*')
  .eq('sensor_id', 'SENSOR_001');
```

### Using Specific Mock Data

```typescript
import {
  mockExecutiveSummary,
  mockFloorPerformance,
  mockPatterns
} from '@/__mocks__/supabase';

// Use mock data directly in tests
expect(result).toEqual(mockExecutiveSummary);
```

### Server-Side Usage

```typescript
import { supabaseServer } from '@/lib/supabase-server';

// Automatically uses mock in tests
const { data, error } = await supabaseServer
  .from('validation_sessions')
  .select('*');
```

## Validation

### Run Structure Validation

```bash
# Simple validation (no Jest required)
node __mocks__/validate-structure.js

# Comprehensive validation (requires Jest)
npx tsx __mocks__/test-validation.ts
```

### Expected Output

```
✅ Supabase Mock Data Structure Validation
==========================================

✓ total_sensors: 150
✓ active_sensors: 145
✓ offline_sensors: 5
✓ critical_alerts: 2
✓ system_health: 97
✓ data_quality_score: 97

==========================================
✅ All required fields present!
```

## Test Coverage

These mocks are designed to fix:

- **250+ component tests** - Dashboard components, widgets, visualizations
- **Integration tests** - API endpoints, data flow, user workflows
- **Unit tests** - Services, utilities, helpers

## Data Completeness

All mock data structures include:

- ✅ All required fields for dashboard components
- ✅ Complete nested objects (no undefined properties)
- ✅ Realistic data values matching production patterns
- ✅ Proper TypeScript types and interfaces
- ✅ Timestamps in ISO format
- ✅ Status enums matching application constants

## Extending the Mocks

### Adding New Mock Data

1. Add the new mock data structure to `supabase.ts`:

```typescript
export const mockNewFeature = {
  // ... your data structure
};
```

2. Update the `SmartQueryChain.resolveData()` method to handle the new data:

```typescript
if (table === 'new_feature_table') {
  data = mockNewFeature;
}
```

3. Export the new mock from `@supabase/supabase-js.ts`:

```typescript
export { mockNewFeature } from '../supabase';
```

### Adding New Query Methods

Add methods to the `SmartQueryChain` class:

```typescript
class SmartQueryChain {
  // ... existing methods

  myNewMethod(param: any) {
    this.context.filters.push({ method: 'myNewMethod', args: [param] });
    return this;
  }
}
```

## Troubleshooting

### Mock Not Being Used

If tests are not using the mock:

1. Ensure `__mocks__` directory is at project root
2. Check Jest configuration includes `automock: false`
3. Manually mock in test file:

```typescript
jest.mock('@supabase/supabase-js');
```

### Undefined Properties

If tests fail with undefined properties:

1. Check the mock data structure includes all required fields
2. Verify the query is routing to the correct mock data
3. Add missing fields to the appropriate mock structure

### Type Errors

If TypeScript errors occur:

1. Ensure `@types/jest` is installed
2. Add explicit type annotations if needed
3. Check that mock data matches expected types

## Best Practices

1. **Keep mock data realistic** - Use values that match production patterns
2. **Maintain completeness** - Always include all required fields
3. **Update together** - When adding new features, update mocks simultaneously
4. **Document changes** - Update this README when adding new mock structures
5. **Validate regularly** - Run validation scripts after changes

## Contributing

When adding new mock data:

1. Follow existing structure patterns
2. Add validation for new fields
3. Update this README
4. Test with actual component tests
5. Ensure TypeScript types are correct

## Support

For issues or questions about the mocks:

1. Check this README first
2. Run validation scripts
3. Review test failure messages
4. Check QUICK_FIX_GUIDE.md for common issues

---

**Last Updated:** 2025-10-01
**Version:** 1.0.0
**Status:** Production Ready ✅
