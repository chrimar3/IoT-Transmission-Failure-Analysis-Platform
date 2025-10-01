/**
 * Subscription Management API
 * Handles Stripe subscription operations and tier management
 */

import Stripe from 'stripe'

export interface SubscriptionDetails {
  id: string
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
  tier: 'free' | 'professional'
  customerId: string
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  priceId: string
}

export interface CreateSubscriptionParams {
  customerId: string
  priceId: string
  paymentMethodId?: string
  trial?: boolean
}

export interface UpdateSubscriptionParams {
  subscriptionId: string
  priceId?: string
  cancelAtPeriodEnd?: boolean
  metadata?: Record<string, string>
}

/**
 * Create a new subscription for a customer
 */
export async function createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionDetails> {
  // This would normally use Stripe API, but for testing we mock it
  if (process.env.NODE_ENV === 'test') {
    return mockCreateSubscription(params)
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20'
  })

  try {
    const subscription = await stripe.subscriptions.create({
      customer: params.customerId,
      items: [{
        price: params.priceId
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent'],
      ...(params.paymentMethodId && {
        default_payment_method: params.paymentMethodId
      }),
      ...(params.trial && {
        trial_period_days: 14
      })
    })

    return {
      id: subscription.id,
      status: subscription.status as SubscriptionDetails['status'],
      tier: determineTierFromPriceId(params.priceId),
      customerId: params.customerId,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      priceId: params.priceId
    }
  } catch (error) {
    console.error('Failed to create subscription:', error)
    throw new Error('Failed to create subscription')
  }
}

/**
 * Update an existing subscription
 */
export async function updateSubscriptionStatus(params: UpdateSubscriptionParams): Promise<SubscriptionDetails> {
  // This would normally use Stripe API, but for testing we mock it
  if (process.env.NODE_ENV === 'test') {
    return mockUpdateSubscription(params)
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20'
  })

  try {
    const updateData: Stripe.SubscriptionUpdateParams = {}

    if (params.priceId) {
      // Update the subscription to new price
      const subscription = await stripe.subscriptions.retrieve(params.subscriptionId)
      updateData.items = [{
        id: subscription.items.data[0].id,
        price: params.priceId
      }]
    }

    if (params.cancelAtPeriodEnd !== undefined) {
      updateData.cancel_at_period_end = params.cancelAtPeriodEnd
    }

    if (params.metadata) {
      updateData.metadata = params.metadata
    }

    const updatedSubscription = await stripe.subscriptions.update(
      params.subscriptionId,
      updateData
    )

    return {
      id: updatedSubscription.id,
      status: updatedSubscription.status as SubscriptionDetails['status'],
      tier: params.priceId ? determineTierFromPriceId(params.priceId) : 'free',
      customerId: updatedSubscription.customer as string,
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
      priceId: params.priceId || ''
    }
  } catch (error) {
    console.error('Failed to update subscription:', error)
    throw new Error('Failed to update subscription')
  }
}

/**
 * Cancel a subscription immediately
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    return mockCancelSubscription(subscriptionId)
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20'
  })

  try {
    await stripe.subscriptions.cancel(subscriptionId)
  } catch (error) {
    console.error('Failed to cancel subscription:', error)
    throw new Error('Failed to cancel subscription')
  }
}

/**
 * Get subscription details by ID
 */
export async function getSubscription(subscriptionId: string): Promise<SubscriptionDetails | null> {
  if (process.env.NODE_ENV === 'test') {
    return mockGetSubscription(subscriptionId)
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20'
  })

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    return {
      id: subscription.id,
      status: subscription.status as SubscriptionDetails['status'],
      tier: determineTierFromSubscription(subscription),
      customerId: subscription.customer as string,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      priceId: subscription.items.data[0]?.price.id || ''
    }
  } catch (error) {
    console.error('Failed to get subscription:', error)
    return null
  }
}

/**
 * Get all subscriptions for a customer
 */
export async function getCustomerSubscriptions(customerId: string): Promise<SubscriptionDetails[]> {
  if (process.env.NODE_ENV === 'test') {
    return mockGetCustomerSubscriptions(customerId)
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20'
  })

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100
    })

    return subscriptions.data.map(subscription => ({
      id: subscription.id,
      status: subscription.status as SubscriptionDetails['status'],
      tier: determineTierFromSubscription(subscription),
      customerId: subscription.customer as string,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      priceId: subscription.items.data[0]?.price.id || ''
    }))
  } catch (error) {
    console.error('Failed to get customer subscriptions:', error)
    return []
  }
}

/**
 * Determine subscription tier from price ID
 */
function determineTierFromPriceId(priceId: string): 'free' | 'professional' {
  // Professional tier price IDs
  const professionalPriceIds = [
    'price_professional_29eur',
    'price_professional_monthly',
    'price_professional_annual'
  ]

  return professionalPriceIds.includes(priceId) ? 'professional' : 'free'
}

/**
 * Determine subscription tier from Stripe subscription object
 */
function determineTierFromSubscription(subscription: Stripe.Subscription): 'free' | 'professional' {
  const priceId = subscription.items.data[0]?.price.id
  return priceId ? determineTierFromPriceId(priceId) : 'free'
}

// Mock functions for testing
function mockCreateSubscription(params: CreateSubscriptionParams): SubscriptionDetails {
  return {
    id: `sub_mock_${Date.now()}`,
    status: 'active',
    tier: determineTierFromPriceId(params.priceId),
    customerId: params.customerId,
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    cancelAtPeriodEnd: false,
    priceId: params.priceId
  }
}

function mockUpdateSubscription(params: UpdateSubscriptionParams): SubscriptionDetails {
  return {
    id: params.subscriptionId,
    status: 'active',
    tier: params.priceId ? determineTierFromPriceId(params.priceId) : 'professional',
    customerId: 'cus_mock_customer',
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: params.cancelAtPeriodEnd || false,
    priceId: params.priceId || 'price_professional_29eur'
  }
}

function mockCancelSubscription(_subscriptionId: string): void {
  // Mock cancellation - no-op for tests
}

function mockGetSubscription(subscriptionId: string): SubscriptionDetails | null {
  if (subscriptionId === 'sub_not_found') {
    return null
  }

  return {
    id: subscriptionId,
    status: 'active',
    tier: 'professional',
    customerId: 'cus_mock_customer',
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    priceId: 'price_professional_29eur'
  }
}

function mockGetCustomerSubscriptions(_customerId: string): SubscriptionDetails[] {
  return [
    {
      id: 'sub_mock_123',
      status: 'active',
      tier: 'professional',
      customerId: 'cus_mock_customer',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      priceId: 'price_professional_29eur'
    }
  ]
}