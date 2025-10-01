/**
 * Subscription-Aware Rate Limiting Integration Tests
 * Validates integration between Stripe subscriptions and API rate limiting
 */

import { RateLimiter, RateLimitMiddleware } from '@/lib/api/rate-limiting';
import { subscriptionService } from '@/lib/stripe/subscription.service';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
};

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;
mockCreateClient.mockReturnValue(mockSupabase as any);

// Mock subscription service
jest.mock('@/lib/stripe/subscription.service');
const mockSubscriptionService = subscriptionService as jest.Mocked<
  typeof subscriptionService
>;

describe('Subscription-Aware Rate Limiting Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tier Detection from Subscription', () => {
    it('should correctly identify professional tier from active subscription', async () => {
      // Mock active professional subscription
      mockSubscriptionService.getUserSubscription.mockResolvedValue({
        id: 'sub_123',
        userId: 'user_123',
        tier: 'PROFESSIONAL',
        status: 'active',
        stripeSubscriptionId: 'sub_stripe_123',
        stripeCustomerId: 'cus_stripe_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const tier = await RateLimiter.getUserTierFromSubscription('user_123');
      expect(tier).toBe('professional');
    });

    it('should default to free tier for inactive subscription', async () => {
      // Mock inactive subscription
      mockSubscriptionService.getUserSubscription.mockResolvedValue({
        id: 'sub_123',
        userId: 'user_123',
        tier: 'PROFESSIONAL',
        status: 'canceled',
        stripeSubscriptionId: 'sub_stripe_123',
        stripeCustomerId: 'cus_stripe_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const tier = await RateLimiter.getUserTierFromSubscription('user_123');
      expect(tier).toBe('free');
    });

    it('should default to free tier when subscription service fails', async () => {
      mockSubscriptionService.getUserSubscription.mockRejectedValue(
        new Error('Database error')
      );

      const tier = await RateLimiter.getUserTierFromSubscription('user_123');
      expect(tier).toBe('free');
    });
  });

  describe('Rate Limiting with Subscription Tiers', () => {
    it('should apply professional rate limits for professional subscribers', async () => {
      // Mock professional subscription
      mockSubscriptionService.getUserSubscription.mockResolvedValue({
        id: 'sub_pro',
        userId: 'user_pro',
        tier: 'PROFESSIONAL',
        status: 'active',
        stripeSubscriptionId: 'sub_stripe_pro',
        stripeCustomerId: 'cus_stripe_pro',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock rate limit record creation/retrieval
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
        insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await RateLimiter.checkRateLimit(
        'api_key_123',
        'user_pro',
        undefined, // Let it detect from subscription
        '/api/v1/data/timeseries'
      );

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10000); // Professional tier limit
    });

    it('should apply free tier limits for users without active subscription', async () => {
      // Mock no subscription
      mockSubscriptionService.getUserSubscription.mockResolvedValue(null);

      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
        insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await RateLimiter.checkRateLimit(
        'api_key_123',
        'user_free',
        undefined,
        '/api/v1/data/timeseries'
      );

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100); // Free tier limit
    });

    it('should enforce enterprise limits for enterprise subscribers', async () => {
      mockSubscriptionService.getUserSubscription.mockResolvedValue({
        id: 'sub_ent',
        userId: 'user_ent',
        tier: 'ENTERPRISE',
        status: 'active',
        stripeSubscriptionId: 'sub_stripe_ent',
        stripeCustomerId: 'cus_stripe_ent',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
        insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await RateLimiter.checkRateLimit(
        'api_key_123',
        'user_ent',
        undefined,
        '/api/v1/data/timeseries'
      );

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50000); // Enterprise tier limit
    });
  });

  describe('Burst Limiting with Subscription Tiers', () => {
    it('should apply tier-appropriate burst limits', async () => {
      // Mock professional subscription
      mockSubscriptionService.getUserSubscription.mockResolvedValue({
        id: 'sub_pro',
        userId: 'user_pro',
        tier: 'PROFESSIONAL',
        status: 'active',
        stripeSubscriptionId: 'sub_stripe_pro',
        stripeCustomerId: 'cus_stripe_pro',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock burst limit check - simulate high usage
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              count: 600, // Exceeds professional burst limit of 500
              error: null,
            }),
          }),
        }),
      });

      const burstAllowed = await RateLimiter.checkBurstLimit(
        'api_key_123',
        'user_pro',
        undefined
      );

      expect(burstAllowed).toBe(false);
    });
  });

  describe('Middleware Integration', () => {
    it('should integrate rate limiting with subscription detection', async () => {
      mockSubscriptionService.getUserSubscription.mockResolvedValue({
        id: 'sub_pro',
        userId: 'user_pro',
        tier: 'PROFESSIONAL',
        status: 'active',
        stripeSubscriptionId: 'sub_stripe_pro',
        stripeCustomerId: 'cus_stripe_pro',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            gte: jest.fn().mockResolvedValue({
              count: 50, // Within professional burst limit
              error: null,
            }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await RateLimitMiddleware.enforceRateLimit(
        'api_key_123',
        'user_pro',
        '/api/v1/data/timeseries'
      );

      expect(result.allowed).toBe(true);
      expect(result.actualTier).toBe('professional');
      expect(result.headers['X-Subscription-Tier']).toBe('PROFESSIONAL');
    });

    it('should include subscription tier in response headers', async () => {
      mockSubscriptionService.getUserSubscription.mockResolvedValue({
        id: 'sub_ent',
        userId: 'user_ent',
        tier: 'ENTERPRISE',
        status: 'active',
        stripeSubscriptionId: 'sub_stripe_ent',
        stripeCustomerId: 'cus_stripe_ent',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            gte: jest.fn().mockResolvedValue({
              count: 100, // Within enterprise burst limit
              error: null,
            }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await RateLimitMiddleware.enforceRateLimit(
        'api_key_123',
        'user_ent',
        '/api/v1/data/timeseries'
      );

      expect(result.headers['X-Subscription-Tier']).toBe('ENTERPRISE');
      expect(result.headers['X-RateLimit-Limit']).toBe('50000');
    });
  });

  describe('Subscription State Changes', () => {
    it('should handle subscription downgrades immediately', async () => {
      // First call - professional tier
      mockSubscriptionService.getUserSubscription
        .mockResolvedValueOnce({
          id: 'sub_pro',
          userId: 'user_downgrade',
          tier: 'PROFESSIONAL',
          status: 'active',
          stripeSubscriptionId: 'sub_stripe_pro',
          stripeCustomerId: 'cus_stripe_pro',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        // Second call - subscription canceled
        .mockResolvedValueOnce({
          id: 'sub_pro',
          userId: 'user_downgrade',
          tier: 'PROFESSIONAL',
          status: 'canceled',
          stripeSubscriptionId: 'sub_stripe_pro',
          stripeCustomerId: 'cus_stripe_pro',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      // First check - should get professional limits
      const result1 = await RateLimiter.checkRateLimit(
        'api_key_123',
        'user_downgrade'
      );
      expect(result1.limit).toBe(10000);

      // Second check - should get free limits due to canceled subscription
      const result2 = await RateLimiter.checkRateLimit(
        'api_key_123',
        'user_downgrade'
      );
      expect(result2.limit).toBe(100);
    });

    it('should handle subscription upgrades immediately', async () => {
      // First call - free tier (no subscription)
      mockSubscriptionService.getUserSubscription
        .mockResolvedValueOnce(null)
        // Second call - new professional subscription
        .mockResolvedValueOnce({
          id: 'sub_new_pro',
          userId: 'user_upgrade',
          tier: 'PROFESSIONAL',
          status: 'active',
          stripeSubscriptionId: 'sub_stripe_new_pro',
          stripeCustomerId: 'cus_stripe_new_pro',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      // First check - should get free limits
      const result1 = await RateLimiter.checkRateLimit(
        'api_key_123',
        'user_upgrade'
      );
      expect(result1.limit).toBe(100);

      // Second check - should get professional limits
      const result2 = await RateLimiter.checkRateLimit(
        'api_key_123',
        'user_upgrade'
      );
      expect(result2.limit).toBe(10000);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should fall back to free tier when subscription check fails', async () => {
      mockSubscriptionService.getUserSubscription.mockRejectedValue(
        new Error('Service unavailable')
      );

      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      const result = await RateLimiter.checkRateLimit(
        'api_key_123',
        'user_error_test'
      );

      expect(result.limit).toBe(100); // Free tier limits applied as fallback
      expect(result.allowed).toBe(true); // Should still allow request
    });

    it('should maintain rate limiting functionality when subscription service is down', async () => {
      mockSubscriptionService.getUserSubscription.mockRejectedValue(
        new Error('Database connection timeout')
      );

      // Mock rate limiting still working
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            gte: jest.fn().mockResolvedValue({
              count: 10,
              error: null,
            }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await RateLimitMiddleware.enforceRateLimit(
        'api_key_123',
        'user_service_down',
        '/api/v1/data/timeseries'
      );

      expect(result.allowed).toBe(true);
      expect(result.actualTier).toBe('free'); // Fallback tier
      expect(result.headers['X-Subscription-Tier']).toBe('FREE');
    });
  });
});
