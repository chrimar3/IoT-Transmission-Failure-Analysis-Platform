/**
 * Revenue Protection: Data Access Middleware
 * Story 1.3 Critical Fix: Bangkok Dataset Access Restrictions
 *
 * Prevents revenue leakage by enforcing tier-based data access limits
 */

import { getUserSubscription } from '../database/subscription-service'
import type { _UserSubscription } from '../../types/subscription'

export interface DataRequest {
  dateRange?: {
    start: string
    end: string
  }
  maxRecords?: number
  fields?: string[]
  sensorIds?: string[]
  floorNumbers?: number[]
  equipmentTypes?: string[]
}

export interface FilteredDataRequest extends DataRequest {
  showUpgradePrompt: boolean
  restrictedFields: string[]
  appliedRestrictions: string[]
  revenueProtection: {
    tierRestricted: boolean
    originalRecordLimit?: number
    restrictedDateRange?: { start: string; end: string }
  }
}

/**
 * Enforces Bangkok dataset access restrictions based on subscription tier
 * FREE TIER: 30-day data access, 1,000 record limit
 * PROFESSIONAL TIER: Full 18-month access, 50,000 record limit
 */
export async function enforceDataAccessRestrictions(
  userId: string,
  dataRequest: DataRequest
): Promise<FilteredDataRequest> {
  const subscription = await getUserSubscription(userId)

  if (subscription.tier === 'professional') {
    // Professional tier gets full access to Bangkok dataset competitive advantage
    return {
      ...dataRequest,
      maxRecords: Math.min(dataRequest.maxRecords || 50000, 50000),
      showUpgradePrompt: false,
      restrictedFields: [],
      appliedRestrictions: [],
      revenueProtection: {
        tierRestricted: false
      }
    }
  }

  // FREE TIER RESTRICTIONS - Protect €29/month Professional tier value
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const originalDateRange = dataRequest.dateRange
  const restrictedDateRange = {
    start: Math.max(
      new Date(dataRequest.dateRange?.start || thirtyDaysAgo).getTime(),
      thirtyDaysAgo.getTime()
    ),
    end: new Date(dataRequest.dateRange?.end || new Date()).getTime()
  }

  const originalRecordLimit = dataRequest.maxRecords
  const freetierRecordLimit = 1000

  return {
    ...dataRequest,
    dateRange: {
      start: new Date(restrictedDateRange.start).toISOString(),
      end: new Date(restrictedDateRange.end).toISOString()
    },
    maxRecords: Math.min(dataRequest.maxRecords || freetierRecordLimit, freetierRecordLimit),
    fields: excludePremiumFields(dataRequest.fields || []),
    showUpgradePrompt: true,
    restrictedFields: getPremiumFields(),
    appliedRestrictions: [
      'bangkok_data_30_day_limit',
      'record_limit_1000',
      'premium_fields_excluded'
    ],
    revenueProtection: {
      tierRestricted: true,
      originalRecordLimit,
      restrictedDateRange: originalDateRange
    }
  }
}

/**
 * Premium fields available only to Professional tier subscribers
 * These provide advanced statistical insights that justify €29/month
 */
function getPremiumFields(): string[] {
  return [
    'statistical_confidence_interval',
    'predictive_analytics',
    'anomaly_detection_advanced',
    'energy_efficiency_recommendations',
    'cost_optimization_insights',
    'regulatory_compliance_metrics',
    'benchmark_comparisons',
    'custom_alert_thresholds'
  ]
}

/**
 * Excludes premium analytical fields from Free tier data access
 */
function excludePremiumFields(requestedFields: string[]): string[] {
  const premiumFields = getPremiumFields()
  return requestedFields.filter(field => !premiumFields.includes(field))
}

/**
 * Generates user-friendly upgrade prompts based on specific restrictions hit
 */
export function generateUpgradePrompt(restrictions: string[]): {
  title: string
  message: string
  upgradeUrl: string
  ctaText: string
} {
  if (restrictions.includes('bangkok_data_30_day_limit')) {
    return {
      title: 'Access Complete Bangkok Dataset',
      message: 'Get full 18-month historical data (124.9M records) with Professional tier. Unlock statistically validated insights for better facility management decisions.',
      upgradeUrl: '/subscription/upgrade?source=data_limit',
      ctaText: 'Upgrade for €29/month'
    }
  }

  if (restrictions.includes('record_limit_1000')) {
    return {
      title: 'Unlock Enterprise-Grade Data Access',
      message: 'Professional tier provides 50,000 records per request for comprehensive building analytics. Perfect for large facility management operations.',
      upgradeUrl: '/subscription/upgrade?source=record_limit',
      ctaText: 'Get Professional Access'
    }
  }

  return {
    title: 'Unlock Premium Analytics',
    message: 'Professional tier includes advanced statistical features, predictive analytics, and regulatory-grade confidence intervals.',
    upgradeUrl: '/subscription/upgrade?source=premium_features',
    ctaText: 'Upgrade Now'
  }
}

/**
 * Rate limiting configuration by subscription tier
 * Prevents service abuse while encouraging Professional tier upgrades
 */
export const TIER_RATE_LIMITS = {
  free: {
    requests: 100,
    window: 'hour' as const,
    burst: 10,
    resetMessage: 'Upgrade to Professional for 100x higher limits'
  },
  professional: {
    requests: 10000,
    window: 'hour' as const,
    burst: 100,
    resetMessage: 'Professional tier rate limit'
  }
} as const

/**
 * Enforces subscription-aware rate limiting
 */
export async function enforceTierBasedRateLimit(
  userId: string,
  endpoint: string
): Promise<{
  allowed: boolean
  remaining: number
  resetTime: Date
  upgradePrompt?: {
    title: string
    message: string
    upgradeUrl: string
  }
}> {
  const subscription = await getUserSubscription(userId)
  const limits = TIER_RATE_LIMITS[subscription.tier]

  // Implementation would integrate with rate limiting service (Redis/etc)
  const rateLimitResult = await checkRateLimit(userId, endpoint, limits)

  if (!rateLimitResult.allowed && subscription.tier === 'free') {
    return {
      ...rateLimitResult,
      upgradePrompt: {
        title: 'Increase API Limits',
        message: 'Professional tier provides 10,000 requests/hour (100x increase) for production facility management workflows.',
        upgradeUrl: '/subscription/upgrade?source=rate_limit'
      }
    }
  }

  return rateLimitResult
}

// Mock implementation for rate limiting check
async function checkRateLimit(
  userId: string,
  endpoint: string,
  limits: typeof TIER_RATE_LIMITS.free
): Promise<{
  allowed: boolean
  remaining: number
  resetTime: Date
}> {
  // This would integrate with actual rate limiting service
  return {
    allowed: true,
    remaining: limits.requests - 1,
    resetTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
  }
}