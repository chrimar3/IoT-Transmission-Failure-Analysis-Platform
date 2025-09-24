import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required')
}

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})

// Stripe configuration constants
export const STRIPE_CONFIG = {
  // €29/month Professional tier
  PROFESSIONAL_PRICE_ID: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional_monthly',

  // Currency
  CURRENCY: 'eur' as const,

  // Webhook endpoint secret
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Checkout session configuration
  CHECKOUT_CONFIG: {
    mode: 'subscription' as const,
    payment_method_types: ['card'],
    billing_address_collection: 'required' as const,
    allow_promotion_codes: true,
    automatic_tax: {
      enabled: true,
    },
  },

  // Customer portal configuration
  CUSTOMER_PORTAL_CONFIG: {
    business_profile: {
      headline: 'Manage your CU-BEMS IoT Platform subscription',
    },
    features: {
      payment_method_update: {
        enabled: true,
      },
      invoice_history: {
        enabled: true,
      },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end' as const,
      },
      subscription_pause: {
        enabled: false,
      },
    },
  },
} as const

// Subscription tier definitions
export const SUBSCRIPTION_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free Tier',
    price: 0,
    currency: 'eur',
    features: {
      monthly_exports: 5,
      dashboard_access: true,
      basic_analytics: true,
      email_support: false,
      priority_support: false,
      advanced_analytics: false,
      custom_reports: false,
      api_access: false,
    },
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    price: 29,
    currency: 'eur',
    stripeProductId: process.env.STRIPE_PROFESSIONAL_PRODUCT_ID || 'prod_professional',
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional_monthly',
    features: {
      monthly_exports: -1, // Unlimited
      dashboard_access: true,
      basic_analytics: true,
      email_support: true,
      priority_support: true,
      advanced_analytics: true,
      custom_reports: true,
      api_access: true,
    },
  },
} as const

// Type definitions
export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS
export type SubscriptionStatus = 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'

export interface UserSubscription {
  id: string
  userId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  createdAt: Date
  updatedAt: Date
}

// Helper functions
export function getSubscriptionTierFromPriceId(priceId: string): SubscriptionTier {
  if (priceId === SUBSCRIPTION_TIERS.PROFESSIONAL.stripePriceId) {
    return 'PROFESSIONAL'
  }
  return 'FREE'
}

export function isFeatureAvailable(tier: SubscriptionTier, feature: keyof typeof SUBSCRIPTION_TIERS.FREE.features): boolean {
  return SUBSCRIPTION_TIERS[tier].features[feature] as boolean
}

export function getMonthlyExportLimit(tier: SubscriptionTier): number {
  const limit = SUBSCRIPTION_TIERS[tier].features.monthly_exports
  return limit === -1 ? Infinity : limit
}