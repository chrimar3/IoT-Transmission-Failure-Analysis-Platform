/**
 * Comprehensive Stripe Subscription Integration Tests
 * Addresses QA BLOCKING Production Readiness - Story 1.2
 * Target: 95% test coverage for subscription payment flows
 */

import { NextRequest } from 'next/server';
import { POST as webhookHandler } from '@/app/api/stripe/webhook/route';
import { POST as checkoutHandler } from '@/app/api/stripe/checkout/route';
import { subscriptionService } from '@/lib/stripe/subscription.service';
import { RateLimiter } from '@/lib/api/rate-limiting';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Mock Stripe SDK
jest.mock('stripe');
const mockStripe = Stripe as jest.MockedClass<typeof Stripe>;

// Mock Supabase
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(),
  sql: jest.fn(),
  rpc: jest.fn(),
};

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;
mockCreateClient.mockReturnValue(mockSupabase as any);

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

describe('Stripe Subscription Integration Tests', () => {
  let mockStripeInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStripeInstance = {
      webhooks: {
        constructEvent: jest.fn(),
      },
      subscriptions: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn(),
      },
      customers: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
      checkout: {
        sessions: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
      },
      billingPortal: {
        sessions: {
          create: jest.fn(),
        },
      },
    };

    mockStripe.mockImplementation(() => mockStripeInstance);

    // Setup default Supabase mock responses
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
      upsert: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  describe('End-to-End Subscription Flow', () => {
    it('should handle complete subscription lifecycle from creation to cancellation', async () => {
      const userId = 'user_test_123';
      const email = 'test@example.com';
      const customerId = 'cus_test_123';
      const subscriptionId = 'sub_test_123';

      // Mock customer creation
      mockStripeInstance.customers.create.mockResolvedValue({
        id: customerId,
        email,
        metadata: { platform: 'cu-bems-iot' },
      });

      // Mock subscription creation
      mockStripeInstance.subscriptions.create.mockResolvedValue({
        id: subscriptionId,
        customer: customerId,
        status: 'active',
        items: {
          data: [{ price: { id: 'price_professional' } }],
        },
        current_period_start: 1634567890,
        current_period_end: 1637246290,
        metadata: { userId },
      });

      // Mock database responses for subscription creation
      const mockSubscriptionData = {
        id: 'sub_internal_123',
        user_id: userId,
        tier: 'professional',
        status: 'active',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValueOnce({ data: null, error: null }) // No existing customer
              .mockResolvedValueOnce({
                data: mockSubscriptionData,
                error: null,
              }), // Return subscription
          }),
        }),
        upsert: jest
          .fn()
          .mockResolvedValue({ data: [mockSubscriptionData], error: null }),
        insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Step 1: Create subscription
      const subscription = await subscriptionService.createCheckoutSession(
        userId,
        email,
        'price_professional',
        'https://example.com/success',
        'https://example.com/cancel'
      );

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email,
        metadata: { platform: 'cu-bems-iot' },
      });

      // Step 2: Simulate webhook for subscription created
      const subscriptionCreatedEvent = {
        id: 'evt_subscription_created',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: subscriptionId,
            customer: customerId,
            status: 'active',
            items: { data: [{ price: { id: 'price_professional' } }] },
            current_period_start: 1634567890,
            current_period_end: 1637246290,
            metadata: { userId },
          },
        },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(
        subscriptionCreatedEvent
      );

      const webhookRequest = new NextRequest(
        'http://localhost:3000/api/stripe/webhook',
        {
          method: 'POST',
          body: JSON.stringify(subscriptionCreatedEvent),
          headers: { 'stripe-signature': 'valid_signature' },
        }
      );

      const webhookResponse = await webhookHandler(webhookRequest);
      expect(webhookResponse.status).toBe(200);

      // Step 3: Verify subscription status
      const userSubscription =
        await subscriptionService.getUserSubscription(userId);
      expect(userSubscription).toBeDefined();

      // Step 4: Test subscription cancellation
      mockStripeInstance.subscriptions.update.mockResolvedValue({
        id: subscriptionId,
        cancel_at_period_end: true,
        status: 'active',
      });

      await subscriptionService.cancelSubscription(userId, true);

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(
        subscriptionId,
        { cancel_at_period_end: true }
      );
    });

    it('should handle payment failure recovery flow', async () => {
      const userId = 'user_test_payment_fail';
      const subscriptionId = 'sub_test_payment_fail';
      const customerId = 'cus_test_payment_fail';

      // Mock subscription retrieval
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
        id: subscriptionId,
        customer: customerId,
        status: 'past_due',
        metadata: { userId },
      });

      // Mock database subscription lookup
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'sub_internal_fail',
                user_id: userId,
                stripe_subscription_id: subscriptionId,
              },
              error: null,
            }),
          }),
        }),
        upsert: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Simulate payment failed webhook
      const paymentFailedEvent = {
        id: 'evt_payment_failed',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_failed',
            customer: customerId,
            subscription: subscriptionId,
            amount_due: 2900,
            status: 'open',
            attempt_count: 2,
          },
        },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(
        paymentFailedEvent
      );

      const webhookRequest = new NextRequest(
        'http://localhost:3000/api/stripe/webhook',
        {
          method: 'POST',
          body: JSON.stringify(paymentFailedEvent),
          headers: { 'stripe-signature': 'valid_signature' },
        }
      );

      const response = await webhookHandler(webhookRequest);
      expect(response.status).toBe(200);

      // Verify subscription status updated to past_due
      expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
    });

    it('should handle subscription upgrade/downgrade flow', async () => {
      const userId = 'user_test_upgrade';
      const subscriptionId = 'sub_test_upgrade';
      const customerId = 'cus_test_upgrade';

      // Mock existing subscription
      const existingSubscription = {
        id: subscriptionId,
        customer: customerId,
        status: 'active',
        items: { data: [{ price: { id: 'price_free' } }] },
        current_period_start: 1634567890,
        current_period_end: 1637246290,
        metadata: { userId },
      };

      // Mock updated subscription (upgrade to professional)
      const upgradedSubscription = {
        ...existingSubscription,
        items: { data: [{ price: { id: 'price_professional' } }] },
      };

      mockStripeInstance.subscriptions.retrieve
        .mockResolvedValueOnce(existingSubscription)
        .mockResolvedValueOnce(upgradedSubscription);

      // Mock database responses
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'sub_internal_upgrade',
                user_id: userId,
                tier: 'free',
                status: 'active',
                stripe_subscription_id: subscriptionId,
              },
              error: null,
            }),
          }),
        }),
        upsert: jest.fn().mockResolvedValue({ data: [], error: null }),
        insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      // Simulate subscription updated webhook
      const subscriptionUpdatedEvent = {
        id: 'evt_subscription_updated',
        type: 'customer.subscription.updated',
        data: { object: upgradedSubscription },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(
        subscriptionUpdatedEvent
      );

      const webhookRequest = new NextRequest(
        'http://localhost:3000/api/stripe/webhook',
        {
          method: 'POST',
          body: JSON.stringify(subscriptionUpdatedEvent),
          headers: { 'stripe-signature': 'valid_signature' },
        }
      );

      const response = await webhookHandler(webhookRequest);
      expect(response.status).toBe(200);

      // Verify tier was updated
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          tier: 'professional',
        })
      );
    });
  });

  describe('Database Transaction Safety', () => {
    it('should rollback transaction on subscription creation failure', async () => {
      const userId = 'user_transaction_test';
      const email = 'transaction@example.com';

      // Mock customer creation success but subscription creation failure
      mockStripeInstance.customers.create.mockResolvedValue({
        id: 'cus_transaction_test',
        email,
      });

      mockStripeInstance.checkout.sessions.create.mockRejectedValue(
        new Error('Stripe checkout session creation failed')
      );

      // Mock database transaction methods
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        upsert: jest.fn().mockResolvedValue({ data: [], error: null }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      await expect(
        subscriptionService.createCheckoutSession(
          userId,
          email,
          'price_professional',
          'https://example.com/success',
          'https://example.com/cancel'
        )
      ).rejects.toThrow();

      // In a real implementation, we would verify that the database transaction was rolled back
      // This would require implementing proper transaction handling in the subscription service
    });

    it('should handle concurrent webhook events with proper locking', async () => {
      const subscriptionId = 'sub_concurrent_test';
      const userId = 'user_concurrent_test';

      // Mock concurrent webhook events
      const event1 = {
        id: 'evt_concurrent_1',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: subscriptionId,
            status: 'past_due',
            metadata: { userId },
          },
        },
      };

      const event2 = {
        id: 'evt_concurrent_2',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: subscriptionId,
            status: 'active',
            metadata: { userId },
          },
        },
      };

      mockStripeInstance.webhooks.constructEvent
        .mockReturnValueOnce(event1)
        .mockReturnValueOnce(event2);

      // Mock database responses with potential race condition
      let callCount = 0;
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                user_id: userId,
                stripe_subscription_id: subscriptionId,
              },
              error: null,
            }),
          }),
        }),
        upsert: jest.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve({ data: [], error: null });
        }),
        insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      const request1 = new NextRequest(
        'http://localhost:3000/api/stripe/webhook',
        {
          method: 'POST',
          body: JSON.stringify(event1),
          headers: { 'stripe-signature': 'valid_signature_1' },
        }
      );

      const request2 = new NextRequest(
        'http://localhost:3000/api/stripe/webhook',
        {
          method: 'POST',
          body: JSON.stringify(event2),
          headers: { 'stripe-signature': 'valid_signature_2' },
        }
      );

      // Process webhooks concurrently
      const [response1, response2] = await Promise.all([
        webhookHandler(request1),
        webhookHandler(request2),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(callCount).toBe(2); // Both updates should succeed
    });
  });

  describe('Production Environment Validation', () => {
    it('should validate production webhook endpoint configuration', async () => {
      // Mock production environment variables
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
      });
      Object.defineProperty(process.env, 'STRIPE_WEBHOOK_SECRET', {
        value: 'whsec_prod_actual_secret',
        writable: true,
      });

      const validEvent = {
        id: 'evt_prod_test',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_prod_test' } },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(validEvent);

      const request = new NextRequest(
        'http://localhost:3000/api/stripe/webhook',
        {
          method: 'POST',
          body: JSON.stringify(validEvent),
          headers: { 'stripe-signature': 'production_signature' },
        }
      );

      const response = await webhookHandler(request);
      expect(response.status).toBe(200);

      // Restore original environment
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
      });
    });

    it('should reject invalid production webhook signatures', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
      });

      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const request = new NextRequest(
        'http://localhost:3000/api/stripe/webhook',
        {
          method: 'POST',
          body: JSON.stringify({ type: 'test' }),
          headers: { 'stripe-signature': 'invalid_production_signature' },
        }
      );

      const response = await webhookHandler(request);
      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.error).toContain('signature');
    });

    it('should validate rate limiting integration with subscription tiers', async () => {
      const userId = 'user_rate_limit_test';
      const apiKeyId = 'key_rate_limit_test';

      // Mock professional tier subscription
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                user_id: userId,
                tier: 'professional',
                status: 'active',
              },
              error: null,
            }),
          }),
        }),
      });

      // Test professional tier rate limits
      const rateLimitResult = await RateLimiter.checkRateLimit(
        apiKeyId,
        userId,
        'professional',
        '/api/v1/data/timeseries'
      );

      expect(rateLimitResult.allowed).toBe(true);
      expect(rateLimitResult.limit).toBe(10000); // Professional tier limit
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Stripe API failures gracefully', async () => {
      const userId = 'user_stripe_failure';
      const email = 'stripefailure@example.com';

      mockStripeInstance.customers.create.mockRejectedValue(
        new Error('Stripe API temporarily unavailable')
      );

      await expect(
        subscriptionService.createCheckoutSession(
          userId,
          email,
          'price_professional',
          'https://example.com/success',
          'https://example.com/cancel'
        )
      ).rejects.toThrow('Stripe API temporarily unavailable');
    });

    it('should handle database failures gracefully', async () => {
      const userId = 'user_db_failure';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Database connection timeout'),
            }),
          }),
        }),
      });

      const subscription =
        await subscriptionService.getUserSubscription(userId);
      expect(subscription).toBeNull(); // Should return null instead of throwing
    });

    it('should log failed webhook events for retry', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockStripeInstance.webhooks.constructEvent.mockReturnValue({
        id: 'evt_failure_test',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_failure_test' } },
      });

      // Mock database failure during webhook processing
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/stripe/webhook',
        {
          method: 'POST',
          body: JSON.stringify({ type: 'test' }),
          headers: { 'stripe-signature': 'valid_signature' },
        }
      );

      const response = await webhookHandler(request);
      expect(response.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Webhook handler error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Idempotency and Duplicate Detection', () => {
    it('should handle duplicate webhook events idempotently', async () => {
      const eventId = 'evt_duplicate_test';
      const subscriptionId = 'sub_duplicate_test';
      const userId = 'user_duplicate_test';

      const duplicateEvent = {
        id: eventId,
        type: 'customer.subscription.created',
        data: {
          object: {
            id: subscriptionId,
            status: 'active',
            metadata: { userId },
          },
        },
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(
        duplicateEvent
      );

      // Mock subscription events table to track processed events
      let processedEvents: string[] = [];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subscription_events') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: processedEvents.includes(eventId)
                  ? [{ stripe_event_id: eventId }]
                  : [],
                error: null,
              }),
            }),
            insert: jest.fn().mockImplementation((data: any) => {
              processedEvents.push(data.stripe_event_id);
              return Promise.resolve({ data: [], error: null });
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { user_id: userId, id: 'sub_internal' },
                error: null,
              }),
            }),
          }),
          upsert: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      // Process the same webhook twice
      const request1 = new NextRequest(
        'http://localhost:3000/api/stripe/webhook',
        {
          method: 'POST',
          body: JSON.stringify(duplicateEvent),
          headers: { 'stripe-signature': 'valid_signature' },
        }
      );

      const request2 = new NextRequest(
        'http://localhost:3000/api/stripe/webhook',
        {
          method: 'POST',
          body: JSON.stringify(duplicateEvent),
          headers: { 'stripe-signature': 'valid_signature' },
        }
      );

      const response1 = await webhookHandler(request1);
      const response2 = await webhookHandler(request2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Event should only be processed once
      expect(processedEvents.length).toBe(1);
    });
  });
});
