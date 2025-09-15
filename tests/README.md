# 🧪 Testing (`/tests`)

Comprehensive test suite for the CU-BEMS IoT Transmission Failure Analysis Platform.

## 🗂️ Directory Structure

```
tests/
├── unit/              # Unit tests (individual functions/components)
├── integration/       # Integration tests (API endpoints, workflows)
└── e2e/              # End-to-end tests (full user journeys)
```

## 📁 Test Categories

### Unit Tests (`/unit`)
**Purpose**: Test individual functions, components, and modules in isolation

**Structure**:
```
unit/
├── lib/                    # Library function tests
│   ├── insight-engine.test.ts
│   ├── r2-client.test.ts
│   └── supabase.test.ts
├── components/             # React component tests
│   ├── Navigation.test.tsx
│   └── ui/
│       ├── Button.test.tsx
│       └── Card.test.tsx
└── utils/                  # Utility function tests
    ├── date-utils.test.ts
    └── validation.test.ts
```

**Example**:
```typescript
// lib/insight-engine.test.ts
import { generateInsights } from '@/lib/insight-engine';

describe('Insight Engine', () => {
  it('should generate energy consumption insights', () => {
    const mockData = [/* sensor data */];
    const insights = generateInsights(mockData);

    expect(insights).toHaveProperty('energyTrends');
    expect(insights.confidence).toBeGreaterThan(0.8);
  });
});
```

### Integration Tests (`/integration`)
**Purpose**: Test API endpoints, database interactions, and service integrations

**Current Files**:
- `api-endpoints.test.ts` - Tests all API routes
- `cross-epic-compatibility.test.ts` - Cross-feature testing

**Example**:
```typescript
// api-endpoints.test.ts
import { GET as HealthGET } from '@/app/api/health/route';

describe('Health API', () => {
  it('should return healthy status', async () => {
    const request = new NextRequest('http://localhost/api/health');
    const response = await HealthGET(request);
    const data = await response.json();

    expect(data.status).toBe('healthy');
    expect(response.status).toBe(200);
  });
});
```

### E2E Tests (`/e2e`)
**Purpose**: Test complete user workflows and business processes

**Structure**:
```
e2e/
├── dashboard/              # Dashboard user flows
├── api-workflows/          # API integration workflows
└── data-processing/        # Data pipeline workflows
```

**Example**:
```typescript
// e2e/dashboard/insights-workflow.test.ts
import { test, expect } from '@playwright/test';

test('user can view energy insights dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="energy-insights"]')).toBeVisible();
  await expect(page.locator('[data-testid="savings-summary"]')).toContainText('$273,500');
});
```

## 🔧 Testing Configuration

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.{ts,tsx}',
    '<rootDir>/app/**/__tests__/**/*.test.{ts,tsx}',
  ],
};
```

### Test Scripts
```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## 📊 Coverage Requirements

**Minimum Coverage Targets**:
- **Overall**: 85%+
- **Business Logic** (`/lib`): 95%+
- **API Endpoints**: 90%+
- **Critical Components**: 90%+

**Coverage Reports**: Generated in `/coverage` directory

## 🧪 Testing Patterns

### Mocking External Services
```typescript
// Mock Supabase
jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

// Mock R2 Client
jest.mock('@/lib/r2-client', () => ({
  r2Client: {
    getObject: jest.fn().mockResolvedValue(mockData),
  },
}));
```

### Testing React Components
```typescript
import { render, screen } from '@testing-library/react';
import { Navigation } from '@/components/Navigation';

test('renders navigation links', () => {
  render(<Navigation />);
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
  expect(screen.getByText('Insights')).toBeInTheDocument();
});
```

### Testing API Routes
```typescript
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/insights/route';

test('insights API returns data', async () => {
  const request = new NextRequest('http://localhost/api/insights');
  const response = await GET(request);
  const data = await response.json();

  expect(data.success).toBe(true);
  expect(data.data.key_insights).toBeDefined();
});
```

## 🔄 Test Data Management

### Mock Data Location
```
tests/
├── __mocks__/             # Mock implementations
├── fixtures/              # Test data fixtures
│   ├── sensor-data.json   # Sample sensor readings
│   ├── insights.json      # Sample insights
│   └── api-responses.json # API response examples
```

### Data Factories
```typescript
// tests/factories/sensor-data.ts
export const createSensorReading = (overrides = {}) => ({
  id: Math.random().toString(),
  sensor_id: 'FLOOR_1_AC_01',
  timestamp: new Date().toISOString(),
  value: 25.4,
  unit: 'celsius',
  ...overrides,
});
```

## 🚀 Running Tests

### Local Development
```bash
# Install dependencies
npm install

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- insight-engine.test.ts

# Run tests with debugging
npm test -- --verbose
```

### CI/CD Pipeline
Tests are automatically run in GitHub Actions:
1. **Unit Tests**: Run on every push
2. **Integration Tests**: Run on PR creation
3. **E2E Tests**: Run on main branch updates
4. **Coverage**: Reported to Codecov

## 📋 Writing New Tests

### Checklist for New Tests
1. **Choose Category**: Unit, integration, or e2e
2. **Create Test File**: Follow naming convention `*.test.ts`
3. **Mock Dependencies**: Use appropriate mocking strategy
4. **Test Edge Cases**: Include error scenarios
5. **Update Coverage**: Ensure coverage targets are met

### Test Naming Convention
```typescript
describe('FeatureName', () => {
  describe('specific functionality', () => {
    it('should do something when condition is met', () => {
      // Test implementation
    });

    it('should handle error when invalid input provided', () => {
      // Error case testing
    });
  });
});
```

## 🔍 Debugging Tests

### Common Issues
1. **Import Path Errors**: Check module name mapping in jest.config.js
2. **Mock Issues**: Ensure mocks are properly configured
3. **Async/Await**: Use proper async handling in tests
4. **Environment Variables**: Set test environment variables

### Debug Commands
```bash
# Run single test with debugging
npm test -- --testNamePattern="specific test name"

# Run tests with coverage details
npm run test:coverage -- --verbose

# Debug specific test file
node --inspect-brk node_modules/.bin/jest insight-engine.test.ts
```

This testing structure ensures comprehensive coverage and maintainable test code for the IoT platform.