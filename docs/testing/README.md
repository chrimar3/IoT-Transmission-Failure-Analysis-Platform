# 🧪 Testing Documentation

## Overview

This document outlines the comprehensive testing strategy for the CU-BEMS IoT Platform, covering unit tests, integration tests, and end-to-end testing procedures.

## Testing Philosophy

- **Test-Driven Development (TDD)**: Write tests before implementation
- **Comprehensive Coverage**: Maintain 85%+ code coverage
- **Fast Feedback**: Tests should run quickly during development
- **Reliable Results**: Tests must be deterministic and stable
- **Real-world Scenarios**: Test actual user workflows

## Test Structure

```
__tests__/
├── unit/                    # Unit tests for individual components
│   ├── components/         # React component tests
│   ├── utils/             # Utility function tests
│   └── lib/               # Library function tests
├── integration/           # Integration tests for API endpoints
│   ├── api/              # API route testing
│   └── database/         # Database integration tests
├── e2e/                  # End-to-end tests
│   ├── user-flows/       # Complete user journeys
│   └── performance/      # Performance testing
└── fixtures/             # Test data and mocks
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- Button.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="Dashboard"

# Run integration tests only
npm test -- --testPathPattern=integration
```

### Advanced Options

```bash
# Run tests with verbose output
npm test -- --verbose

# Run tests in parallel
npm test -- --maxWorkers=4

# Update snapshots
npm test -- --updateSnapshot

# Run tests with debugging
npm test -- --runInBand --no-cache
```

## Unit Testing

### Component Testing

```typescript
// components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button Component', () => {
  it('should render with correct label', () => {
    render(<Button label="Click me" onClick={() => {}} />);

    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should call onClick handler when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(<Button label="Click me" onClick={handleClick} />);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button label="Click me" onClick={() => {}} disabled />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should apply correct CSS classes based on variant', () => {
    render(<Button label="Primary" onClick={() => {}} variant="primary" />);

    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('should handle loading state correctly', () => {
    render(<Button label="Loading" onClick={() => {}} loading />);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### Utility Function Testing

```typescript
// utils/formatters.test.ts
import { formatCurrency, formatPercentage, calculateSavings } from '../formatters';

describe('Formatter Utils', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers correctly', () => {
      expect(formatCurrency(25000)).toBe('$25,000');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should handle zero and negative numbers', () => {
      expect(formatCurrency(0)).toBe('$0');
      expect(formatCurrency(-500)).toBe('-$500');
    });

    it('should handle large numbers', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000');
    });
  });

  describe('calculateSavings', () => {
    it('should calculate savings correctly', () => {
      const result = calculateSavings(100000, 85000);
      expect(result).toEqual({
        amount: 15000,
        percentage: 15,
        formatted: '$15,000'
      });
    });

    it('should handle edge cases', () => {
      expect(calculateSavings(0, 0)).toEqual({
        amount: 0,
        percentage: 0,
        formatted: '$0'
      });
    });
  });
});
```

### Hook Testing

```typescript
// hooks/useInsights.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useInsights } from '../useInsights';
import { server } from '../../__tests__/mocks/server';

// Mock API response
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useInsights Hook', () => {
  it('should fetch insights successfully', async () => {
    const { result } = renderHook(() => useInsights());

    expect(result.current.loading).toBe(true);
    expect(result.current.insights).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.insights).toBeDefined();
    expect(result.current.insights.key_insights).toHaveLength(7);
    expect(result.current.error).toBeNull();
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    server.use(
      rest.get('/api/insights', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }));
      })
    );

    const { result } = renderHook(() => useInsights());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.insights).toBeNull();
  });

  it('should support filtering options', async () => {
    const { result } = renderHook(() =>
      useInsights({ category: 'energy', severity: 'critical' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.insights?.key_insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'energy',
          severity: 'critical'
        })
      ])
    );
  });
});
```

## Integration Testing

### API Route Testing

```typescript
// __tests__/integration/api/insights.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '../../../app/api/insights/route';

describe('/api/insights', () => {
  it('should return insights data successfully', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/insights',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('summary');
    expect(data.data).toHaveProperty('key_insights');
    expect(data.data.key_insights).toHaveLength(7);
  });

  it('should handle query parameters correctly', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/insights?category=energy&severity=critical',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const data = JSON.parse(res._getData());
    expect(data.metadata.filters_applied).toEqual({
      category: 'energy',
      severity: 'critical',
      limit: null
    });
  });

  it('should handle invalid parameters gracefully', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/insights?limit=invalid',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);

    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('should handle unsupported HTTP methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/insights',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});
```

### Database Integration Testing

```typescript
// __tests__/integration/database/connection.test.ts
import { createClient } from '@supabase/supabase-js';

describe('Database Connection', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  it('should connect to database successfully', async () => {
    const { data, error } = await supabase
      .from('sensors')
      .select('count', { count: 'exact' })
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should handle database queries correctly', async () => {
    // Test basic query
    const { data, error } = await supabase
      .from('sensors')
      .select('*')
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should enforce Row Level Security', async () => {
    // Test with anonymous key (should be restricted)
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await anonSupabase
      .from('sensor_readings')
      .select('*')
      .limit(1);

    // Should either return empty data or specific error based on RLS policy
    expect(error).toBeDefined();
  });
});
```

## End-to-End Testing

### Page Testing with Playwright

```typescript
// __tests__/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should load dashboard with insights', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForSelector('[data-testid="loading-spinner"]', {
      state: 'detached'
    });

    // Check for key elements
    await expect(page.locator('h1')).toContainText('Analytics Dashboard');

    // Verify insights cards are loaded
    const insightCards = page.locator('[data-testid="insight-card"]');
    await expect(insightCards).toHaveCountGreaterThan(5);

    // Check for business impact summary
    await expect(page.locator('[data-testid="savings-total"]'))
      .toContainText('$273,500');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('/api/insights', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await page.reload();

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]'))
      .toBeVisible();

    // Should show retry button
    await expect(page.locator('[data-testid="retry-button"]'))
      .toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Check mobile layout
    const navigation = page.locator('[data-testid="mobile-navigation"]');
    await expect(navigation).toBeVisible();

    // Insights should stack vertically
    const insightCards = page.locator('[data-testid="insight-card"]');
    const firstCard = insightCards.first();
    const secondCard = insightCards.nth(1);

    const firstBox = await firstCard.boundingBox();
    const secondBox = await secondCard.boundingBox();

    expect(firstBox!.y).toBeLessThan(secondBox!.y);
  });

  test('should navigate between pages correctly', async ({ page }) => {
    // Click on "Home" link
    await page.click('[data-testid="nav-home"]');
    await expect(page).toHaveURL('/');

    // Go back to dashboard
    await page.click('[data-testid="nav-dashboard"]');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### Performance Testing

```typescript
// __tests__/e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('dashboard should load within performance budget', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard', {
      waitUntil: 'networkidle'
    });

    const loadTime = Date.now() - startTime;

    // Dashboard should load in under 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test('API endpoints should respond quickly', async ({ page }) => {
    const response = await page.request.get('/api/insights');

    expect(response.status()).toBe(200);

    // API should respond in under 100ms
    const timing = await response.allHeaders();
    // Note: This is a simplified example, actual timing measurement may vary
  });

  test('should handle large datasets without memory issues', async ({ page }) => {
    // Monitor memory usage
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    await page.goto('/dashboard');

    // Wait for all data to load
    await page.waitForLoadState('networkidle');

    // Get memory metrics
    const metrics = await client.send('Performance.getMetrics');
    const usedHeapSize = metrics.metrics.find(
      m => m.name === 'JSHeapUsedSize'
    )?.value;

    // Should use less than 50MB of heap
    expect(usedHeapSize).toBeLessThan(50 * 1024 * 1024);
  });
});
```

## Test Data Management

### Fixtures

```typescript
// __tests__/fixtures/insights.ts
export const mockInsightsResponse = {
  success: true,
  data: {
    summary: {
      total_sensors: 144,
      total_records: 124903795,
      data_quality_score: 100,
      generated_at: "2025-09-13T12:32:53.562Z"
    },
    key_insights: [
      {
        id: "floor2_consumption_anomaly",
        title: "Floor 2 Consumes 2.8x More Energy Than Average",
        value: "2.8x Higher",
        confidence: 97,
        category: "efficiency",
        severity: "critical",
        estimated_savings: "$25,000-35,000"
      },
      // ... more insights
    ]
  }
};

export const mockEmptyResponse = {
  success: true,
  data: {
    summary: {
      total_sensors: 0,
      total_records: 0,
      data_quality_score: 100
    },
    key_insights: []
  }
};

export const mockErrorResponse = {
  success: false,
  error: {
    code: "SERVER_ERROR",
    message: "Internal server error"
  }
};
```

### Mock Server

```typescript
// __tests__/mocks/server.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { mockInsightsResponse } from '../fixtures/insights';

export const handlers = [
  rest.get('/api/insights', (req, res, ctx) => {
    const category = req.url.searchParams.get('category');
    const severity = req.url.searchParams.get('severity');

    let filteredResponse = { ...mockInsightsResponse };

    if (category || severity) {
      filteredResponse.data.key_insights = mockInsightsResponse.data.key_insights.filter(insight => {
        const matchesCategory = !category || insight.category === category;
        const matchesSeverity = !severity || insight.severity === severity;
        return matchesCategory && matchesSeverity;
      });
    }

    return res(ctx.json(filteredResponse));
  }),

  rest.get('/api/health', (req, res, ctx) => {
    return res(ctx.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: { connected: true }
    }));
  }),
];

export const server = setupServer(...handlers);
```

## Test Configuration

### Jest Configuration

```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!jest.setup.js',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  testTimeout: 10000,
};

module.exports = createJestConfig(customJestConfig);
```

### Jest Setup

```javascript
// jest.setup.js
import '@testing-library/jest-dom';
import { server } from './__tests__/mocks/server';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Suppress console warnings in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});
```

## Coverage Requirements

### Minimum Coverage Thresholds

- **Lines**: 85%
- **Functions**: 85%
- **Branches**: 85%
- **Statements**: 85%

### Critical Areas (100% Coverage Required)

- Business logic functions
- API route handlers
- Error handling code
- Security-related functions
- Data validation functions

## Testing Best Practices

### 1. Arrange-Act-Assert Pattern

```typescript
it('should calculate total savings correctly', () => {
  // Arrange
  const insights = [
    { estimated_savings: '$25,000' },
    { estimated_savings: '$35,000' }
  ];

  // Act
  const total = calculateTotalSavings(insights);

  // Assert
  expect(total).toBe(60000);
});
```

### 2. Test Naming Convention

- Use descriptive test names that explain the behavior
- Start with "should" for behavior descriptions
- Include the expected outcome

### 3. Mock External Dependencies

```typescript
// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      insert: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
  },
}));
```

### 4. Test Error Conditions

Always test both success and failure scenarios:

```typescript
describe('fetchInsights', () => {
  it('should return insights on success', async () => {
    // Test successful case
  });

  it('should handle network errors', async () => {
    // Test network failure
  });

  it('should handle API errors', async () => {
    // Test API error response
  });

  it('should handle malformed data', async () => {
    // Test invalid response format
  });
});
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run typecheck

      - name: Run unit tests
        run: npm run test:coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Build application
        run: npm run build
```

## Debugging Tests

### Debug Mode

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Use VS Code debugger
# Add to launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Common Issues

1. **Async Tests**: Always await async operations
2. **Cleanup**: Use `afterEach` to clean up mocks and states
3. **Timing**: Use `waitFor` for async state changes
4. **Environment**: Ensure test environment matches production

This comprehensive testing strategy ensures code quality, reliability, and maintainability of the CU-BEMS IoT Platform.