# Quick Fix Guide - Test Failures
**Status**: 292 tests failing across 49 test suites
**Target**: 100% pass rate in 3 days (21 hours)

---

## TODAY'S PRIORITY (P0 - Critical)

### Fix 1: Create Missing Test Utilities (2 hours)
**Impact**: Fixes 40 tests immediately

**File**: `__tests__/utils/test-helpers.ts`

Add these missing functions:
```typescript
import crypto from 'crypto'

export function generateApiKey(): string {
  return `sk_${crypto.randomBytes(32).toString('hex')}`
}

export async function hashApiKey(apiKey: string): Promise<string> {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  return /^sk_[a-f0-9]{64}$/.test(apiKey)
}

export async function cleanupTestData(): Promise<void> {
  // Mock cleanup - no-op in tests
  return Promise.resolve()
}

export function createMockRequest(options: any): any {
  return {
    url: options.url,
    method: options.method || 'GET',
    headers: new Map(Object.entries(options._headers || {})),
    _headers: options._headers
  }
}
```

**Run**: `npm test -- __tests__/security/api-security-validation.test.ts`

---

### Fix 2: Add Canvas Mocks (3 hours)
**Impact**: Fixes 18 tests (chart rendering)

**File**: `jest.setup.js`

Add after ResizeObserver mock (line 210):
```javascript
// Mock canvas for chart rendering
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8ClampedArray() })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Uint8ClampedArray() })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 100 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '10px sans-serif'
  }))

  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')

  HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
    callback(new Blob(['mock'], { type: 'image/png' }))
  })
}
```

**Run**: `npm test -- __tests__/integration/dashboard-workflows.test.tsx`

---

### Fix 3: Fix PDFKit Mock (2 hours)
**Impact**: Fixes 16 PDF generation tests

**File**: `__tests__/lib/reports/pdf-generator.test.ts`

Replace lines 6-8 with:
```javascript
// Mock PDFKit with complete implementation
const mockPDFDocument = {
  pipe: jest.fn().mockReturnThis(),
  fontSize: jest.fn().mockReturnThis(),
  font: jest.fn().mockReturnThis(),
  fillColor: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  image: jest.fn().mockReturnThis(),
  rect: jest.fn().mockReturnThis(),
  fill: jest.fn().mockReturnThis(),
  addPage: jest.fn().mockReturnThis(),
  save: jest.fn().mockReturnThis(),
  restore: jest.fn().mockReturnThis(),
  moveTo: jest.fn().mockReturnThis(),
  lineTo: jest.fn().mockReturnThis(),
  stroke: jest.fn().mockReturnThis(),
  end: jest.fn(),
  on: jest.fn(function(event, callback) {
    if (event === 'finish') {
      setTimeout(callback, 10)
    }
    return this
  }),
  page: {
    width: 595.28,
    height: 841.89,
    margins: { top: 72, bottom: 72, left: 72, right: 72 }
  },
  x: 72,
  y: 72
}

jest.mock('pdfkit', () => {
  return jest.fn(() => mockPDFDocument)
})
```

**Run**: `npm test -- __tests__/lib/reports/pdf-generator.test.ts`

---

## TOMORROW'S PRIORITY (P1 - High)

### Fix 4: Enhance Supabase Mock Data (4 hours)
**Impact**: Fixes 250+ component/integration tests

**File**: `__mocks__/supabase.ts`

Add comprehensive mock data around line 50:
```typescript
const mockExecutiveSummary = {
  total_sensors: 150,
  active_sensors: 145,
  offline_sensors: 5,
  total_readings: 1500000,
  critical_alerts: 2,
  warning_alerts: 5,
  info_alerts: 12,
  avg_temperature: 23.5,
  min_temperature: 18.2,
  max_temperature: 28.7,
  avg_humidity: 45.2,
  system_health: 97,
  data_quality_score: 97,
  uptime_percentage: 99.2,
  last_updated: new Date().toISOString()
}

const mockFloorPerformance = [
  { floor_number: 1, floor_name: 'Ground Floor', sensor_count: 30, active_sensors: 29, avg_temperature: 23.1, avg_humidity: 44.5, health_score: 97, alert_count: 1 },
  { floor_number: 2, floor_name: 'First Floor', sensor_count: 28, active_sensors: 28, avg_temperature: 23.8, avg_humidity: 45.8, health_score: 100, alert_count: 0 },
  { floor_number: 3, floor_name: 'Second Floor', sensor_count: 25, active_sensors: 24, avg_temperature: 22.9, avg_humidity: 43.2, health_score: 96, alert_count: 2 }
]

const mockPatterns = {
  patterns: [
    {
      pattern_type: 'spike',
      sensor_id: 'SENSOR_001',
      detected_at: new Date().toISOString(),
      confidence: 0.95,
      severity: 'high',
      description: 'Temperature spike detected'
    }
  ],
  statistics: {
    total_patterns: 15,
    high_confidence: 12,
    medium_confidence: 3
  },
  confidence: 0.95
}

// Update the mock chain to return these
mockFrom.mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({
    data: mockExecutiveSummary,
    error: null
  })
})

mockSelect.mockImplementation((fields) => {
  const chain = {
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: mockExecutiveSummary,
      error: null
    }),
    then: jest.fn((resolve) => {
      // Determine what data to return based on context
      if (fields && fields.includes('floor')) {
        return resolve({ data: mockFloorPerformance, error: null })
      } else if (fields && fields.includes('patterns')) {
        return resolve({ data: mockPatterns, error: null })
      }
      return resolve({ data: [mockExecutiveSummary], error: null })
    })
  }
  return chain
})
```

**Run**: `npm test -- __tests__/integration/dashboard-workflows.test.tsx`

---

### Fix 5: Fix Mock Data Type Mismatches (3 hours)
**Impact**: Fixes 38 tests

Check each failing test for undefined properties:
1. Pattern detection: Ensure `patterns` array exists
2. Alerts: Ensure `alerts` property exists
3. Statistics: Ensure nested objects are complete

**Pattern**:
```typescript
// Before
const mockData = {
  // patterns: undefined  ❌
}

// After
const mockData = {
  patterns: [],  ✅
  statistics: { total: 0 },  ✅
  metadata: { timestamp: Date.now() }  ✅
}
```

**Files to update**:
- `__mocks__/supabase.ts`
- Individual test files with inline mocks

---

## DAY 3 PRIORITY (P2 - Medium)

### Fix 6: Fix Test Timeouts (5 hours)
**Impact**: Fixes 34 tests, speeds up test suite

**Strategy**:
1. Reduce default waitFor timeout
2. Mock async operations to resolve immediately
3. Use fake timers where appropriate

**Example fixes**:
```typescript
// In tests with timeouts:
jest.setTimeout(10000)  // Reduce from 30000

// Mock long operations
jest.mock('@/lib/export/chart-exporter', () => ({
  exportChart: jest.fn().mockResolvedValue({
    url: 'https://example.com/chart.png',
    expires_at: Date.now() + 3600000
  })
}))

// Use fake timers for rate limiting tests
beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})
```

---

### Fix 7: Mock File System (2 hours)
**Impact**: Fixes 12 export tests

**File**: Create `__mocks__/fs.ts`

```typescript
const fs = jest.createMockFromModule('fs') as any

fs.promises = {
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('mock csv data')),
  unlink: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined)
}

module.exports = fs
```

**Configure in jest.config.js**:
```javascript
moduleNameMapper: {
  '^fs$': '<rootDir>/__mocks__/fs.ts'
}
```

---

## Progress Tracking

Run after each fix:
```bash
# Test specific file
npm test -- <test-file-path>

# Test category
npm test -- __tests__/security/
npm test -- __tests__/integration/

# Full test suite (final validation)
npm test

# Check coverage
npm test -- --coverage
```

---

## Success Criteria

- ✅ Day 1: 74 tests fixed (77% pass rate)
- ✅ Day 2: 288 tests fixed (97% pass rate)
- ✅ Day 3: All tests passing (100% pass rate)

**Total**: 292 failures → 0 failures in 21 hours

---

## Quick Commands

```bash
# Run failing tests only
npm test -- --onlyFailures

# Run with verbose output
npm test -- --verbose

# Run specific test suite
npm test -- __tests__/security/api-security-validation.test.ts

# Watch mode (useful during fixes)
npm test -- --watch

# Update snapshots if needed
npm test -- -u
```

---

## Need Help?

See full analysis: `TEST_FAILURE_ANALYSIS_REPORT.md`

Common issues:
1. "ReferenceError: X is not defined" → Add to test-helpers.ts
2. "Unable to find element" → Check Supabase mock data
3. "Timeout exceeded" → Add proper async mocks
4. "appendChild error" → Check canvas mock setup
