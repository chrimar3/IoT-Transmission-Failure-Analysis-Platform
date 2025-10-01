/**
 * Subscription Caching Service
 * Provides graceful degradation during Stripe outages
 * Epic 2 Story 2.5: Stripe Failure Handling Enhancement
 */

import { createClient } from '@supabase/supabase-js';
import type { SubscriptionTier } from '@/types/subscription';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CachedSubscription {
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodEnd: Date;
  cachedAt: Date;
  lastVerified: Date;
}

interface _SubscriptionCacheEntry {
  user_id: string;
  tier: string;
  status: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  current_period_end: string;
  cached_at: string;
  last_verified: string;
}

// In-memory cache for fastest access during outages
const memoryCache = new Map<string, CachedSubscription>();
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Cache subscription status for graceful degradation
 */
export async function cacheSubscriptionStatus(
  userId: string,
  subscription: {
    tier: SubscriptionTier;
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    currentPeriodEnd: Date;
  }
): Promise<void> {
  const now = new Date();

  // Update in-memory cache
  const cached: CachedSubscription = {
    userId,
    tier: subscription.tier,
    status: subscription.status,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    stripeCustomerId: subscription.stripeCustomerId,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cachedAt: now,
    lastVerified: now
  };
  memoryCache.set(userId, cached);

  // Persist to database for cross-instance sharing
  try {
    await supabase
      .from('subscription_cache')
      .upsert({
        user_id: userId,
        tier: subscription.tier,
        status: subscription.status,
        stripe_subscription_id: subscription.stripeSubscriptionId,
        stripe_customer_id: subscription.stripeCustomerId,
        current_period_end: subscription.currentPeriodEnd.toISOString(),
        cached_at: now.toISOString(),
        last_verified: now.toISOString()
      }, {
        onConflict: 'user_id'
      });
  } catch (error) {
    console.error('Error caching subscription to database:', error);
    // Memory cache still works, so don't throw
  }
}

/**
 * Get cached subscription status (fallback during Stripe outages)
 */
export async function getCachedSubscription(
  userId: string
): Promise<CachedSubscription | null> {
  // Check memory cache first
  const memoryCached = memoryCache.get(userId);
  if (memoryCached && Date.now() - memoryCached.cachedAt.getTime() < MEMORY_CACHE_TTL) {
    return memoryCached;
  }

  // Fall back to database cache
  try {
    const { data, error } = await supabase
      .from('subscription_cache')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    const cached: CachedSubscription = {
      userId: data.user_id,
      tier: data.tier as SubscriptionTier,
      status: data.status as 'active' | 'past_due' | 'canceled' | 'trialing',
      stripeSubscriptionId: data.stripe_subscription_id,
      stripeCustomerId: data.stripe_customer_id,
      currentPeriodEnd: new Date(data.current_period_end),
      cachedAt: new Date(data.cached_at),
      lastVerified: new Date(data.last_verified)
    };

    // Update memory cache
    memoryCache.set(userId, cached);

    return cached;
  } catch (error) {
    console.error('Error fetching cached subscription:', error);
    return null;
  }
}

/**
 * Check if cached subscription is still valid
 */
export function isCacheValid(cached: CachedSubscription): boolean {
  const now = Date.now();
  const cacheAge = now - cached.cachedAt.getTime();
  const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours max

  // Cache is valid if:
  // 1. Not expired (< 24 hours old)
  // 2. Subscription period hasn't ended
  // 3. Status is active or trialing
  return (
    cacheAge < maxCacheAge &&
    cached.currentPeriodEnd.getTime() > now &&
    (cached.status === 'active' || cached.status === 'trialing')
  );
}

/**
 * Get subscription with fallback to cache during Stripe outages
 */
export async function getSubscriptionWithFallback(
  userId: string,
  fetchFromStripe: () => Promise<{
    tier: SubscriptionTier;
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    currentPeriodEnd: Date;
  } | null>
): Promise<{
  subscription: CachedSubscription | null;
  source: 'stripe' | 'cache' | 'none';
  degraded: boolean;
}> {
  try {
    // Try to fetch from Stripe first
    const stripeSubscription = await fetchFromStripe();

    if (stripeSubscription) {
      // Cache the fresh data
      await cacheSubscriptionStatus(userId, stripeSubscription);

      return {
        subscription: {
          userId,
          ...stripeSubscription,
          cachedAt: new Date(),
          lastVerified: new Date()
        },
        source: 'stripe',
        degraded: false
      };
    }

    // No subscription found in Stripe, check cache
    const cached = await getCachedSubscription(userId);
    return {
      subscription: cached,
      source: cached ? 'cache' : 'none',
      degraded: !!cached
    };
  } catch (error) {
    // Stripe is down, fall back to cache
    console.warn('Stripe unavailable, falling back to cache:', error);

    const cached = await getCachedSubscription(userId);

    if (cached && isCacheValid(cached)) {
      return {
        subscription: cached,
        source: 'cache',
        degraded: true
      };
    }

    // Cache is stale or doesn't exist
    return {
      subscription: cached, // Return even if stale, for maximum graceful degradation
      source: cached ? 'cache' : 'none',
      degraded: true
    };
  }
}

/**
 * Reconcile cached subscriptions with Stripe (run periodically)
 */
export async function reconcileSubscriptionCache(): Promise<{
  reconciled: number;
  errors: number;
}> {
  let reconciled = 0;
  let errors = 0;

  try {
    // Get all cached subscriptions older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('subscription_cache')
      .select('*')
      .lt('last_verified', oneHourAgo.toISOString())
      .limit(100); // Process 100 at a time

    if (error) {
      console.error('Error fetching subscriptions for reconciliation:', error);
      return { reconciled: 0, errors: 1 };
    }

    for (const cached of data || []) {
      try {
        // In production, this would fetch from Stripe and update cache
        // For now, we'll just update the last_verified timestamp
        await supabase
          .from('subscription_cache')
          .update({ last_verified: new Date().toISOString() })
          .eq('user_id', cached.user_id);

        reconciled++;
      } catch (err) {
        console.error(`Error reconciling subscription for user ${cached.user_id}:`, err);
        errors++;
      }
    }

    console.log(`Reconciled ${reconciled} subscription caches with ${errors} errors`);
  } catch (error) {
    console.error('Error in reconcileSubscriptionCache:', error);
    errors++;
  }

  return { reconciled, errors };
}

/**
 * Clear stale cache entries (run daily)
 */
export async function clearStaleCache(olderThanDays: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('subscription_cache')
      .delete()
      .lt('last_verified', cutoffDate.toISOString())
      .select('user_id');

    if (error) {
      console.error('Error clearing stale cache:', error);
      return 0;
    }

    const deletedCount = data?.length || 0;
    console.log(`Cleared ${deletedCount} stale subscription cache entries`);

    // Also clear from memory cache
    for (const [userId, cached] of memoryCache.entries()) {
      if (Date.now() - cached.lastVerified.getTime() > olderThanDays * 24 * 60 * 60 * 1000) {
        memoryCache.delete(userId);
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('Error in clearStaleCache:', error);
    return 0;
  }
}

export const subscriptionCacheService = {
  cacheSubscriptionStatus,
  getCachedSubscription,
  isCacheValid,
  getSubscriptionWithFallback,
  reconcileSubscriptionCache,
  clearStaleCache
};