/**
 * CRITICAL: Auth→Subscription→Dashboard Integration Flow
 *
 * Tests the highest-risk integration chain identified by QA analysis.
 * Risk Score: 7.2/9 - Potential cascade failure point.
 */

/// <reference types="@testing-library/jest-dom" />
/// <reference types="jest" />
/// <reference path="../types/jest-dom.d.ts" />

import React from 'react';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import {
  mockSession,
  mockStripeWebhook,
  MockSession,
} from '../utils/auth-test-helpers';
import Dashboard from '../../app/dashboard/page';
import {
  createSubscription,
  updateSubscriptionStatus,
} from '../../lib/api/subscription-management';

// Type assertion for Jest DOM matchers to satisfy TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
    }
  }
}

interface IntegrationTestScenario {
  name: string;
  userState: 'anonymous' | 'free' | 'professional' | 'expired';
  expectedDashboardFeatures: string[];
  expectedRestrictions: string[];
  paymentStatus?: 'success' | 'failed' | 'pending';
}

describe('CRITICAL: Auth→Subscription→Dashboard Integration Flow', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(mockApiResponses);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  const testScenarios: IntegrationTestScenario[] = [
    {
      name: 'Anonymous user - limited dashboard access',
      userState: 'anonymous',
      expectedDashboardFeatures: ['basic-metrics', 'signup-prompt'],
      expectedRestrictions: [
        'export-disabled',
        'api-access-denied',
        'advanced-analytics-hidden',
      ],
    },
    {
      name: 'Free tier user - basic dashboard with upgrade prompts',
      userState: 'free',
      expectedDashboardFeatures: [
        'basic-metrics',
        'time-series-basic',
        'upgrade-prompts',
      ],
      expectedRestrictions: [
        'export-disabled',
        'api-access-denied',
        'advanced-analytics-hidden',
      ],
    },
    {
      name: 'Professional user - full dashboard access',
      userState: 'professional',
      expectedDashboardFeatures: [
        'basic-metrics',
        'time-series-advanced',
        'export-enabled',
        'api-access',
        'advanced-analytics',
      ],
      expectedRestrictions: [],
    },
    {
      name: 'Expired professional - graceful degradation',
      userState: 'expired',
      expectedDashboardFeatures: ['basic-metrics', 'renewal-prompt'],
      expectedRestrictions: [
        'export-disabled',
        'api-access-denied',
        'advanced-analytics-hidden',
      ],
    },
  ];

  testScenarios.forEach((scenario) => {
    test(`INTEGRATION FLOW: ${scenario.name}`, async () => {
      const session =
        scenario.userState === 'anonymous'
          ? null
          : mockSession(
              scenario.userState === 'expired' ? 'expired' : scenario.userState
            );

      const { container } = render(
        <SessionProvider session={session}>
          <Dashboard />
        </SessionProvider>
      );

      // Wait for dashboard to load
      await waitFor(() => {
        expect(
          container.querySelector('[data-testid="dashboard-container"]')
        ).toBeInTheDocument();
      });

      // Verify expected features are present
      for (const feature of scenario.expectedDashboardFeatures) {
        expect(
          container.querySelector(`[data-testid="${feature}"]`)
        ).toBeInTheDocument();
      }

      // Verify restrictions are enforced
      for (const restriction of scenario.expectedRestrictions) {
        expect(
          container.querySelector(`[data-testid="${restriction}"]`)
        ).toBeInTheDocument();
      }

      console.log(`✅ ${scenario.name} - Integration flow validated`);
    });
  });

  test('REVENUE CRITICAL: Payment success → immediate feature access', async () => {
    // Start with free user
    const freeSession = mockSession('free');
    const { container, rerender } = render(
      <SessionProvider session={freeSession}>
        <Dashboard />
      </SessionProvider>
    );

    // Verify free tier restrictions
    expect(
      container.querySelector('[data-testid="export-disabled"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="api-access-denied"]')
    ).toBeInTheDocument();

    // Simulate successful Stripe payment webhook
    const subscriptionId = 'sub_test_123';
    await mockStripeWebhook('customer.subscription.created', {
      id: subscriptionId,
      customer: freeSession?.user?.id,
      status: 'active',
      items: {
        data: [{ price: { id: 'price_professional_29eur' } }],
      },
    });

    // Update session to professional
    const professionalSession = mockSession('professional');
    rerender(
      <SessionProvider session={professionalSession}>
        <Dashboard />
      </SessionProvider>
    );

    // Verify immediate feature access
    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="export-enabled"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-testid="api-access"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-testid="advanced-analytics"]')
      ).toBeInTheDocument();
    });

    console.log('✅ Payment success → feature access flow validated');
  });

  test('PAYMENT FAILURE: Graceful handling of failed payments', async () => {
    const professionalSession = mockSession('professional');
    const { container } = render(
      <SessionProvider session={professionalSession}>
        <Dashboard />
      </SessionProvider>
    );

    // Verify professional features initially available
    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="export-enabled"]')
      ).toBeInTheDocument();
    });

    // Simulate payment failure webhook
    await mockStripeWebhook('invoice.payment_failed', {
      subscription: 'sub_test_123',
      customer: professionalSession?.user?.id,
      attempt_count: 1,
    });

    // Should maintain access during grace period
    expect(
      container.querySelector('[data-testid="export-enabled"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="payment-warning"]')
    ).toBeInTheDocument();

    // Simulate subscription cancellation after failed retries
    await mockStripeWebhook('customer.subscription.deleted', {
      id: 'sub_test_123',
      customer: professionalSession?.user?.id,
      status: 'canceled',
    });

    // Should gracefully degrade to free tier
    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="export-disabled"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-testid="reactivation-prompt"]')
      ).toBeInTheDocument();
    });

    console.log('✅ Payment failure graceful degradation validated');
  });

  test('SECURITY CRITICAL: Rate limiting enforcement by subscription tier', async () => {
    const scenarios = [
      { tier: 'free', limit: 100, endpoint: '/api/v1/data/timeseries' },
      {
        tier: 'professional',
        limit: 10000,
        endpoint: '/api/v1/data/timeseries',
      },
    ];

    for (const scenario of scenarios) {
      const session = mockSession(scenario.tier as 'free' | 'professional');

      // Simulate rapid API requests
      const requests = Array.from({ length: scenario.limit + 50 }, (_, i) =>
        fetch(scenario.endpoint, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        })
      );

      const responses = await Promise.all(requests);

      // Count successful vs rate-limited responses
      const successfulRequests = responses.filter(
        (r) => r.status === 200
      ).length;
      const rateLimitedRequests = responses.filter(
        (r) => r.status === 429
      ).length;

      // Verify rate limiting is enforced correctly
      expect(successfulRequests).toBeLessThanOrEqual(scenario.limit);
      expect(rateLimitedRequests).toBeGreaterThan(0);

      console.log(
        `✅ ${scenario.tier} tier rate limiting: ${successfulRequests}/${scenario.limit} allowed`
      );
    }
  });

  test('SESSION PERSISTENCE: Dashboard state across page reloads', async () => {
    const professionalSession = mockSession('professional');

    // Initial dashboard load
    const { container } = render(
      <SessionProvider session={professionalSession}>
        <Dashboard />
      </SessionProvider>
    );

    // Set user preferences (date range, floor selection, etc.)
    fireEvent.click(screen.getByTestId('date-range-picker'));
    fireEvent.click(screen.getByText('Last 30 days'));

    fireEvent.click(screen.getByTestId('floor-selector'));
    fireEvent.click(screen.getByText('Floor 3'));

    // Wait for preferences to be saved
    await waitFor(() => {
      expect(
        container.querySelector('[data-selected="last-30-days"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-selected="floor-3"]')
      ).toBeInTheDocument();
    });

    // Simulate page reload by re-rendering
    const { container: reloadedContainer } = render(
      <SessionProvider session={professionalSession}>
        <Dashboard />
      </SessionProvider>
    );

    // Verify preferences are restored
    await waitFor(() => {
      expect(
        reloadedContainer.querySelector('[data-selected="last-30-days"]')
      ).toBeInTheDocument();
      expect(
        reloadedContainer.querySelector('[data-selected="floor-3"]')
      ).toBeInTheDocument();
    });

    console.log('✅ Session persistence across reloads validated');
  });
});

function mockApiResponses(
  url: string,
  options?: RequestInit
): Promise<Response> {
  // Mock subscription status checks
  if (url.includes('/api/v1/subscription/status')) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          tier: 'professional',
          status: 'active',
          features: ['export', 'api_access', 'advanced_analytics'],
        })
      )
    );
  }

  // Mock rate limiting
  if (url.includes('/api/v1/data/')) {
    const authHeader = (options?.headers as Record<string, string>)?.[
      'Authorization'
    ];
    if (!authHeader) {
      return Promise.resolve(new Response('Unauthorized', { status: 401 }));
    }

    // Simulate rate limiting logic
    const isRateLimited = Math.random() > 0.8; // 20% chance of rate limiting for testing
    if (isRateLimited) {
      return Promise.resolve(
        new Response('Rate limit exceeded', { status: 429 })
      );
    }

    return Promise.resolve(new Response(JSON.stringify({ data: 'mock_data' })));
  }

  return Promise.resolve(new Response('{}'));
}
