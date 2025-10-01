# Test Validation Checklist

## Current Status
- **Total Tests**: 964
- **Passing**: 672 (69.7%)
- **Failing**: 292 (30.3%)
- **Test Suites**: 49 failing out of 71

---

## Validation Commands (Run After Each Fix)

### Phase 1: Foundation Fixes

#### After Fix 1 (Test Utilities)
```bash
npm test -- __tests__/security/api-security-validation.test.ts
# Expected: 40 tests to pass
# Expected output: "Tests: 40 passed, 40 total"
```

#### After Fix 2 (Canvas Mocks)
```bash
npm test -- __tests__/integration/dashboard-workflows.test.tsx
npm test -- __tests__/components/interactive-data-visualizations.test.tsx
npm test -- __tests__/components/TimeSeriesChart.test.tsx
# Expected: 18 tests to pass
# Expected output: Workflow tests complete without "appendChild" errors
```

#### After Fix 3 (PDFKit Mock)
```bash
npm test -- __tests__/lib/reports/pdf-generator.test.ts
npm test -- __tests__/lib/reports/report-generator.test.ts
# Expected: 16 tests to pass
# Expected output: No "ReferenceError: height is not defined"
```

**Phase 1 Checkpoint**:
```bash
npm test -- --testPathPattern="security|dashboard-workflows|pdf-generator"
# Expected: 74 previously failing tests now passing
```

---

### Phase 2: Data & Integration Fixes

#### After Fix 4 (Supabase Mock Data)
```bash
npm test -- __tests__/integration/
npm test -- __tests__/dashboard/executive/page.test.tsx
npm test -- __tests__/components/patterns/PatternDetectionWidget.test.tsx
# Expected: 250+ tests to pass
# Expected output: "Executive Summary" found, no "data unavailable" errors
```

#### After Fix 5 (Type Mismatches)
```bash
npm test -- __tests__/api/patterns/detect.test.ts
npm test -- __tests__/security/alert-security.test.ts
npm test -- __tests__/validation/
# Expected: 38 tests to pass
# Expected output: No "Cannot read properties of undefined" errors
```

**Phase 2 Checkpoint**:
```bash
npm test -- --testPathPattern="integration|dashboard|patterns|validation"
# Expected: 288 previously failing tests now passing (cumulative: 362 fixed)
```

---

### Phase 3: Performance & Edge Cases

#### After Fix 6 (Timeouts)
```bash
npm test -- __tests__/api/export/chart.test.ts
npm test -- __tests__/performance/
# Expected: 34 tests to pass
# Expected output: No timeout errors, faster execution
```

#### After Fix 7 (File System)
```bash
npm test -- __tests__/export/
npm test -- __tests__/security/export-security.test.ts
# Expected: 12 tests to pass
# Expected output: No "ENOENT" file system errors
```

**Phase 3 Checkpoint**:
```bash
npm test -- --testPathPattern="export|performance"
# Expected: 46 previously failing tests now passing (cumulative: 408 fixed)
```

---

## Final Validation

### Full Test Suite
```bash
npm test
# Expected output:
# Test Suites: 71 passed, 71 total
# Tests: 964 passed, 964 total
# Time: < 180 seconds (improved from 250s)
```

### Coverage Report
```bash
npm test -- --coverage --coverageReporters=text
# Expected: Maintain or improve coverage
# Target: > 70% statement coverage
```

### Watch Mode (For Active Development)
```bash
npm test -- --watch --onlyFailures
# Automatically re-runs only failing tests as you fix them
```

---

## Success Metrics

| Phase | Tests Fixed | Cumulative Pass Rate | Time |
|-------|-------------|---------------------|------|
| Start | 0 | 69.7% | 0h |
| Phase 1 Complete | 74 | 77.4% | 7h |
| Phase 2 Complete | 362 | 97.5% | 14h |
| Phase 3 Complete | 408 | 100% | 21h |

---

## Regression Detection

After all fixes, run these to ensure no regression:

```bash
# Run passing tests to ensure they still pass
npm test -- --testPathPattern="anomaly|session|auth" --testNamePattern="should"

# Run critical path tests
npm test -- __tests__/integration/auth-subscription-dashboard-flow.test.tsx

# Run performance benchmarks
npm test -- __tests__/performance/ --maxWorkers=1
```

---

## Troubleshooting

### If tests still fail after fix:

1. **Clear Jest cache**:
   ```bash
   npx jest --clearCache
   npm test
   ```

2. **Check for stale mocks**:
   ```bash
   rm -rf node_modules/.cache
   npm test
   ```

3. **Run in verbose mode**:
   ```bash
   npm test -- --verbose --no-coverage
   ```

4. **Run single test**:
   ```bash
   npm test -- --testNamePattern="your specific test name"
   ```

---

## Quick Reference: Common Error → Fix Mapping

| Error Pattern | Fix Number | File to Check |
|---------------|-----------|---------------|
| `ReferenceError: options is not defined` | Fix 1 | test-helpers.ts |
| `ReferenceError: height is not defined` | Fix 3 | pdf-generator.test.ts |
| `appendChild is not of type 'Node'` | Fix 2 | jest.setup.js |
| `Unable to find element: Executive Summary` | Fix 4 | supabase.ts mock |
| `Cannot read properties of undefined (reading 'patterns')` | Fix 5 | Mock data structures |
| `Exceeded timeout of 30000 ms` | Fix 6 | Async operations |
| `ENOENT: no such file or directory` | Fix 7 | fs mock |

---

## Git Commit Strategy

After each successful phase:

```bash
# Phase 1
git add __tests__/utils/test-helpers.ts jest.setup.js __tests__/lib/reports/
git commit -m "fix: Phase 1 - Add test utilities and canvas/PDF mocks (74 tests fixed)"

# Phase 2
git add __mocks__/supabase.ts __tests__/
git commit -m "fix: Phase 2 - Enhance mock data and fix type mismatches (288 tests fixed)"

# Phase 3
git add __mocks__/fs.ts __tests__/
git commit -m "fix: Phase 3 - Fix timeouts and file system mocks (46 tests fixed)"

# Final
npm test && git commit -m "test: All 964 tests passing - 100% pass rate achieved"
```

---

## Report Generation

After completing all fixes:

```bash
# Generate final test report
npm test -- --json --outputFile=test-results.json

# Generate coverage report
npm test -- --coverage --coverageReporters=html
# Open: coverage/index.html

# Summary stats
npm test 2>&1 | grep -E "(Test Suites|Tests|Time)"
```

Expected final output:
```
Test Suites: 71 passed, 71 total
Tests:       964 passed, 964 total
Time:        ~180s (improved from 249.9s)
```
