import { stripe, SUBSCRIPTION_TIERS, getSubscriptionTierFromPriceId, type UserSubscription, type SubscriptionTier } from './config'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class SubscriptionService {
  /**
   * Create a new Stripe customer
   */
  async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        platform: 'cu-bems-iot',
      },
    })

    return customer
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    // Get or create Stripe customer
    const customer = await this.getOrCreateCustomer(email, userId)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      automatic_tax: {
        enabled: true,
      },
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        tier: getSubscriptionTierFromPriceId(priceId),
      },
      subscription_data: {
        metadata: {
          userId,
          tier: getSubscriptionTierFromPriceId(priceId),
        },
      },
    })

    return session
  }

  /**
   * Get or create a Stripe customer for a user
   */
  async getOrCreateCustomer(email: string, userId: string): Promise<Stripe.Customer> {
    // First check if customer already exists in our database
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (subscription?.stripe_customer_id) {
      try {
        const customer = await stripe.customers.retrieve(subscription.stripe_customer_id)
        if (customer && !customer.deleted) {
          return customer as Stripe.Customer
        }
      } catch (error) {
        console.warn('Stripe customer not found, creating new one:', error)
      }
    }

    // Create new customer
    const customer = await this.createCustomer(email)

    // Update or create subscription record
    await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_customer_id: customer.id,
        tier: 'free',
        status: 'active',
        updated_at: new Date().toISOString(),
      })

    return customer
  }

  /**
   * Create customer portal session
   */
  async createCustomerPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    // Get customer ID from subscription
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (error || !subscription?.stripe_customer_id) {
      throw new Error('No subscription found for user')
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    })

    return session
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      userId: data.user_id,
      tier: data.tier.toUpperCase() as SubscriptionTier,
      status: data.status,
      stripeSubscriptionId: data.stripe_subscription_id,
      stripeCustomerId: data.stripe_customer_id,
      currentPeriodStart: data.current_period_start ? new Date(data.current_period_start) : undefined,
      currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }

  /**
   * Update subscription in database with transaction safety
   */
  async updateSubscription(
    userId: string,
    updates: Partial<{
      tier: string
      status: string
      stripeSubscriptionId: string
      stripeCustomerId: string
      currentPeriodStart: Date
      currentPeriodEnd: Date
    }>
  ): Promise<void> {
    // Use database transaction for atomic updates
    const { data, error } = await supabase.rpc('update_subscription_transactional', {
      p_user_id: userId,
      p_updates: {
        ...updates,
        updated_at: new Date().toISOString(),
        current_period_start: updates.currentPeriodStart?.toISOString(),
        current_period_end: updates.currentPeriodEnd?.toISOString()
      }
    })

    if (error) {
      console.error('Transaction failed for subscription update:', error)
      throw new Error(`Failed to update subscription: ${error.message}`)
    }

    // Fallback to regular upsert if RPC not available
    if (!data) {
      const updateData: Record<string, string | number | Date> = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // Convert dates to ISO strings
      if (updates.currentPeriodStart) {
        updateData.current_period_start = updates.currentPeriodStart.toISOString()
      }
      if (updates.currentPeriodEnd) {
        updateData.current_period_end = updates.currentPeriodEnd.toISOString()
      }

      const { error: fallbackError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          ...updateData,
        })

      if (fallbackError) {
        throw new Error(`Failed to update subscription: ${fallbackError.message}`)
      }
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, atPeriodEnd: boolean = true): Promise<void> {
    const subscription = await this.getUserSubscription(userId)

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found')
    }

    const _stripeSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: atPeriodEnd,
      }
    )

    // Update local subscription status
    await this.updateSubscription(userId, {
      status: atPeriodEnd ? 'active' : 'canceled',
    })
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(userId: string): Promise<void> {
    const subscription = await this.getUserSubscription(userId)

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No subscription found')
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    })

    await this.updateSubscription(userId, {
      status: 'active',
    })
  }

  /**
   * Get subscription usage statistics
   */
  async getSubscriptionUsage(userId: string): Promise<{
    exportsThisMonth: number
    exportsLimit: number
    tier: SubscriptionTier
  }> {
    const subscription = await this.getUserSubscription(userId)
    const tier = subscription?.tier || 'FREE'

    // Get current month's export count
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: exportsThisMonth } = await supabase
      .from('user_activity')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action_type', 'export')
      .gte('timestamp', startOfMonth.toISOString())

    const exportsLimit = SUBSCRIPTION_TIERS[tier].features.monthly_exports === -1
      ? Infinity
      : SUBSCRIPTION_TIERS[tier].features.monthly_exports

    return {
      exportsThisMonth: exportsThisMonth || 0,
      exportsLimit,
      tier,
    }
  }

  /**
   * Track user activity for analytics and rate limiting
   */
  async trackUserActivity(
    userId: string,
    actionType: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_activity')
        .insert({
          user_id: userId,
          action_type: actionType,
          resource_accessed: metadata?.filename || metadata?.data_type || null,
          timestamp: new Date().toISOString(),
          // Store additional metadata as JSON if needed
          ...(metadata && Object.keys(metadata).length > 0 && {
            // For now, we'll store simple metadata in resource_accessed
            // In future, we could add a metadata JSONB column
          })
        })

      if (error) {
        console.error('Failed to track user activity:', error)
      }
    } catch (error) {
      console.error('Error tracking user activity:', error)
    }
  }

  /**
   * Check if user can perform an action based on their subscription
   */
  async canUserPerformAction(
    userId: string,
    action: 'export' | 'advanced_analytics' | 'api_access' | 'custom_reports'
  ): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId)
    const tier = subscription?.tier || 'FREE'

    if (subscription?.status !== 'active') {
      return tier === 'FREE' // Only allow free tier features for inactive subscriptions
    }

    switch (action) {
      case 'export':
        const usage = await this.getSubscriptionUsage(userId)
        return usage.exportsThisMonth < usage.exportsLimit

      case 'advanced_analytics':
        return SUBSCRIPTION_TIERS[tier].features.advanced_analytics

      case 'api_access':
        return SUBSCRIPTION_TIERS[tier].features.api_access

      case 'custom_reports':
        return SUBSCRIPTION_TIERS[tier].features.custom_reports

      default:
        return false
    }
  }

  /**
   * Check if user has access to a specific feature
   */
  async hasFeatureAccess(
    userId: string,
    feature: keyof typeof SUBSCRIPTION_TIERS.FREE.features
  ): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId)
    const tier = subscription?.tier || 'FREE'

    if (subscription?.status !== 'active' && tier !== 'FREE') {
      return false // Only allow free tier features for inactive paid subscriptions
    }

    return SUBSCRIPTION_TIERS[tier].features[feature] as boolean
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService()