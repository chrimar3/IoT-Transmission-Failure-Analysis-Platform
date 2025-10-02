# Testing Guide

Comprehensive testing documentation for the CU-BEMS IoT Transmission Failure Analysis Platform.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Coverage](#test-coverage)
- [Testing Stack](#testing-stack)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Organization](#test-organization)
- [Testing Best Practices](#testing-best-practices)
- [Continuous Integration](#continuous-integration)
- [Performance Testing](#performance-testing)
- [Manual Testing](#manual-testing)

## Testing Philosophy

Our testing strategy follows the testing pyramid:

```
        /\
       /E2E\          <- End-to-End (10%)
      /------\
     /Integr-\       <- Integration (30%)
    /ation----\
   /------------\
  /   Unit      \    <- Unit Tests (60%)
 /--------------\
```

### Testing Principles

1. **Test behavior, not implementation**
2. **Write tests before fixing bugs** (TDD for bug fixes)
3. **Keep tests simple and readable**
4. **Maintain high coverage** (target: 85%+)
5. **Fast feedback loops** (unit tests <5s, all tests <2min)

## Test Coverage

### Current Status

| Category | Coverage | Tests Passing |
|----------|----------|---------------|
| **Overall** | **70.4%** | **628/892** |
| Unit Tests | 75% | 450/600 |
| Integration Tests | 65% | 150/230 |
| E2E Tests | 50% | 28/62 |

### Coverage by Module

| Module | Coverage | Priority |
|--------|----------|----------|
| API Routes | 85% | Critical |
| Components | 72% | High |
| Utilities | 90% | High |
| Hooks | 68% | Medium |
| Pages | 55% | Medium |
| Types | 100% | Low |

### Coverage Goals

- **v1.1.0**: 80% overall coverage
- **v1.2.0**: 85% overall coverage
- **v2.0.0**: 90% overall coverage

## Testing Stack

### Core Testing Libraries

```json
{
  "jest": "^29.7.0",
  "jest-environment-jsdom": "^29.7.0",
  "@testing-library/react": "^14.1.2",
  "@testing-library/jest-dom": "^6.1.6",
  "@testing-library/user-event": "^14.5.1"
}
```

### Testing Tools

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing
- **Jest DOM**: Custom DOM matchers
- **User Event**: Realistic user interactions
- **MSW** (Mock Service Worker): API mocking

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- Button.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="Dashboard"

# Run tests in CI mode
npm run test:ci
```

### Coverage Report

```bash
# Generate and open coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

### Debug Mode

```bash
# Run tests with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run single test in debug mode
npm test -- --testNamePattern="specific test" --runInBand
```

## Writing Tests

### Unit Tests

#### React Components

```typescript
// components/Button/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('should render with correct label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button label="Click me" onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button label="Click me" onClick={() => {}} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should apply correct variant class', () => {
    const { container } = render(
      <Button label="Click me" onClick={() => {}} variant="primary" />
    );
    expect(container.querySelector('.btn-primary')).toBeInTheDocument();
  });
});
```

#### Utility Functions

```typescript
// lib/utils/calculations.test.ts
import { calculateSavings, formatCurrency } from './calculations';

describe('Calculations Utilities', () => {
  describe('calculateSavings', () => {
    it('should calculate annual savings correctly', () => {
      const result = calculateSavings({
        current: 10000,
        optimized: 7000
      });

      expect(result.annual_savings).toBe(3000);
      expect(result.percentage_improvement).toBe(30);
    });

    it('should handle zero values', () => {
      const result = calculateSavings({
        current: 0,
        optimized: 0
      });

      expect(result.annual_savings).toBe(0);
      expect(result.percentage_improvement).toBe(0);
    });

    it('should throw error for negative values', () => {
      expect(() => {
        calculateSavings({ current: -100, optimized: 50 });
      }).toThrow('Values must be non-negative');
    });
  });

  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should handle large numbers', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });
  });
});
```

#### Custom Hooks

```typescript
// hooks/useInsights.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useInsights } from './useInsights';

describe('useInsights Hook', () => {
  it('should fetch insights on mount', async () => {
    const { result } = renderHook(() => useInsights());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.insights).toHaveLength(7);
  });

  it('should handle errors gracefully', async () => {
    // Mock API error
    global.fetch = jest.fn(() => Promise.reject(new Error('API Error')));

    const { result } = renderHook(() => useInsights());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.insights).toEqual([]);
  });
});
```

### Integration Tests

#### API Routes

```typescript
// __tests__/api/insights.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/insights/route';

describe('/api/insights', () => {
  it('should return insights data', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('key_insights');
    expect(Array.isArray(data.data.key_insights)).toBe(true);
  });

  it('should filter by category', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { category: 'energy' },
    });

    await handler(req, res);

    const data = JSON.parse(res._getData());
    expect(data.data.key_insights.every(
      (insight: any) => insight.category === 'energy'
    )).toBe(true);
  });

  it('should validate confidence parameter', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { confidence: 'invalid' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });

  it('should require authentication for detailed insights', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { detailed: 'true' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });
});
```

#### Database Operations

```typescript
// __tests__/integration/database.test.ts
import { createClient } from '@supabase/supabase-js';
import { getSensorData, aggregateData } from '@/lib/database';

describe('Database Operations', () => {
  let supabase;

  beforeAll(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  afterAll(async () => {
    // Cleanup test data
  });

  it('should fetch sensor data with filters', async () => {
    const data = await getSensorData({
      floor: 2,
      start_date: '2018-01-01',
      end_date: '2018-01-31'
    });

    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.every(record => record.floor === 2)).toBe(true);
  });

  it('should aggregate data correctly', async () => {
    const aggregated = await aggregateData({
      metric: 'energy',
      aggregation: 'daily',
      floor: 2
    });

    expect(aggregated).toBeDefined();
    expect(aggregated[0]).toHaveProperty('date');
    expect(aggregated[0]).toHaveProperty('value');
  });
});
```

### End-to-End Tests

```typescript
// __tests__/e2e/dashboard.test.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard Flow', () => {
  test('should display insights dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for insights to load
    await page.waitForSelector('[data-testid="insights-container"]');

    // Verify insights are displayed
    const insights = await page.$$('[data-testid="insight-card"]');
    expect(insights.length).toBeGreaterThan(0);

    // Check for key metrics
    await expect(page.locator('text=$273,500')).toBeVisible();
  });

  test('should filter insights by category', async ({ page }) => {
    await page.goto('/dashboard');

    // Click energy filter
    await page.click('[data-testid="filter-energy"]');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify only energy insights shown
    const insights = await page.$$('[data-testid="insight-card"]');
    for (const insight of insights) {
      const category = await insight.getAttribute('data-category');
      expect(category).toBe('energy');
    }
  });

  test('should export data to CSV', async ({ page }) => {
    await page.goto('/dashboard');

    // Click export button
    await page.click('[data-testid="export-button"]');

    // Select CSV format
    await page.click('[data-testid="format-csv"]');

    // Start export
    await page.click('[data-testid="export-start"]');

    // Wait for completion
    await page.waitForSelector('[data-testid="export-complete"]');

    // Verify download link
    const downloadLink = await page.$('[data-testid="download-link"]');
    expect(downloadLink).toBeDefined();
  });
});
```

## Test Organization

### Directory Structure

```
__tests__/
├── unit/
│   ├── components/
│   │   ├── Button.test.tsx
│   │   ├── Dashboard.test.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useInsights.test.ts
│   │   └── ...
│   └── utils/
│       ├── calculations.test.ts
│       └── ...
├── integration/
│   ├── api/
│   │   ├── insights.test.ts
│   │   ├── export.test.ts
│   │   └── ...
│   └── database/
│       └── operations.test.ts
├── e2e/
│   ├── dashboard.test.ts
│   ├── authentication.test.ts
│   └── subscription.test.ts
└── setup/
    ├── jest.setup.js
    └── test-utils.tsx
```

### Test Utilities

```typescript
// __tests__/setup/test-utils.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';

// Custom render with providers
export function renderWithProviders(
  ui: React.ReactElement,
  {
    session = null,
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SessionProvider session={session}>
        {children}
      </SessionProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock data factories
export const mockInsight = {
  id: 'test_insight_1',
  category: 'energy',
  title: 'Test Insight',
  confidence: 95,
  priority: 'high',
};

export const mockSensorData = {
  sensor_id: 'sensor_001',
  floor: 2,
  timestamp: '2018-01-01T00:00:00Z',
  temperature: 23.5,
  humidity: 65.2,
};

// API mocking helpers
export function mockAPISuccess(data: any) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, data }),
    })
  ) as jest.Mock;
}

export function mockAPIError(error: string) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ success: false, error }),
    })
  ) as jest.Mock;
}
```

## Testing Best Practices

### 1. Arrange-Act-Assert Pattern

```typescript
it('should calculate savings correctly', () => {
  // Arrange
  const current = 10000;
  const optimized = 7000;

  // Act
  const result = calculateSavings({ current, optimized });

  // Assert
  expect(result.annual_savings).toBe(3000);
});
```

### 2. Test Naming

```typescript
// Good: Descriptive test names
it('should display error message when API request fails', () => {});
it('should disable submit button while form is validating', () => {});

// Bad: Vague test names
it('works correctly', () => {});
it('test 1', () => {});
```

### 3. Avoid Testing Implementation Details

```typescript
// Good: Test user-facing behavior
it('should show loading spinner while fetching data', async () => {
  render(<Dashboard />);
  expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });
});

// Bad: Test internal state
it('should set loading state to true', () => {
  const { result } = renderHook(() => useInsights());
  expect(result.current.loading).toBe(true); // Testing implementation
});
```

### 4. Use Data-TestId Sparingly

```typescript
// Prefer: Accessible queries
screen.getByRole('button', { name: 'Submit' });
screen.getByLabelText('Email address');
screen.getByText('Dashboard Analytics');

// Use data-testid only when necessary
screen.getByTestId('complex-visualization-chart');
```

### 5. Mock External Dependencies

```typescript
// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: mockData }))
      }))
    }))
  }
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
  }),
}));
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Run tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Quality Gates

All PRs must pass:
- [ ] All tests passing (628+ tests)
- [ ] Code coverage ≥70% (no decrease)
- [ ] ESLint checks passing
- [ ] TypeScript compilation successful
- [ ] No high-severity security vulnerabilities

## Performance Testing

### Load Testing

```typescript
// __tests__/performance/api.test.ts
import { performance } from 'perf_hooks';

describe('API Performance', () => {
  it('should respond within 100ms', async () => {
    const start = performance.now();

    await fetch('/api/insights');

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should handle 100 concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() =>
      fetch('/api/insights')
    );

    const start = performance.now();
    await Promise.all(requests);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(2000); // All complete in 2s
  });
});
```

### Bundle Size Testing

```bash
# Analyze bundle size
npm run build
npm run analyze

# Ensure bundle stays under limits
# - Initial load: <1MB
# - Per-page: <500KB
```

## Manual Testing

### Checklist for New Features

- [ ] Feature works as expected in Chrome
- [ ] Feature works in Firefox
- [ ] Feature works in Safari
- [ ] Mobile responsive on iPhone
- [ ] Mobile responsive on Android
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Error states handled gracefully
- [ ] Loading states display correctly
- [ ] Success messages appear

### Test Scenarios

#### Authentication Flow
1. Sign in with Google OAuth
2. Verify redirect to dashboard
3. Check session persistence
4. Test sign out
5. Verify protected routes redirect

#### Subscription Flow
1. Visit pricing page
2. Click "Subscribe to Professional"
3. Complete Stripe checkout
4. Verify webhook processing
5. Check feature access updated

#### Export Flow
1. Navigate to dashboard
2. Select data to export
3. Choose format (CSV/Excel/PDF)
4. Start export
5. Monitor progress
6. Download completed file
7. Verify file contents

### Performance Checklist

- [ ] Dashboard loads in <2 seconds
- [ ] API responses in <100ms
- [ ] No layout shifts during load
- [ ] Smooth scrolling on mobile
- [ ] Charts render without lag
- [ ] No memory leaks during navigation

## Debugging Failed Tests

### Common Issues

**1. Async timing issues**
```typescript
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

**2. DOM not updating**
```typescript
// Use act() for state updates
import { act } from '@testing-library/react';

act(() => {
  fireEvent.click(button);
});
```

**3. Mock not working**
```typescript
// Ensure mock is called before component render
jest.mock('./module');
// Then render component
```

### Debug Output

```typescript
// Print rendered HTML
import { screen } from '@testing-library/react';
screen.debug();

// Print specific element
screen.debug(screen.getByTestId('element'));

// Check what queries are available
screen.logTestingPlaygroundURL();
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Playwright E2E Testing](https://playwright.dev/)

---

For questions about testing, please open a GitHub issue or consult the team documentation.
