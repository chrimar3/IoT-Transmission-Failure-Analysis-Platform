import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { subscriptionService } from '@/lib/stripe/subscription.service'

export interface SubscriptionRequirement {
  tier?: 'free' | 'professional'
  feature?: 'export' | 'advanced_analytics' | 'api_access' | 'custom_reports'
  allowFreeAccess?: boolean
}

/**
 * Middleware to check subscription access for protected routes
 */
export async function withSubscriptionCheck(
  request: NextRequest,
  requirement: SubscriptionRequirement
) {
  try {
    // Get the JWT token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = token.sub

    // If free access is allowed and no specific tier is required, allow access
    if (requirement.allowFreeAccess && !requirement.tier && !requirement.feature) {
      return null // Continue to the route
    }

    // Get user's subscription
    const subscription = await subscriptionService.getUserSubscription(userId)
    const userTier = subscription?.tier?.toLowerCase() || 'free'
    const isActive = subscription?.status === 'active'

    // If subscription is not active, only allow free tier access
    if (!isActive && userTier !== 'free') {
      return NextResponse.json(
        {
          error: 'Subscription required',
          message: 'Your subscription is not active. Please update your payment method or contact support.',
          code: 'SUBSCRIPTION_INACTIVE'
        },
        { status: 403 }
      )
    }

    // Check tier requirement
    if (requirement.tier && requirement.tier !== 'free') {
      if (userTier === 'free') {
        return NextResponse.json(
          {
            error: 'Professional subscription required',
            message: 'This feature requires a Professional subscription. Upgrade now to access unlimited exports, advanced analytics, and more.',
            code: 'TIER_UPGRADE_REQUIRED',
            upgradeUrl: '/subscription/pricing'
          },
          { status: 403 }
        )
      }
    }

    // Check specific feature requirement
    if (requirement.feature) {
      const canAccess = await subscriptionService.canUserPerformAction(userId, requirement.feature)

      if (!canAccess) {
        let message = 'This feature is not available with your current subscription.'
        let code = 'FEATURE_NOT_AVAILABLE'

        switch (requirement.feature) {
          case 'export':
            message = 'You have reached your monthly export limit. Upgrade to Professional for unlimited exports.'
            code = 'EXPORT_LIMIT_REACHED'
            break
          case 'advanced_analytics':
            message = 'Advanced analytics requires a Professional subscription.'
            code = 'ANALYTICS_UPGRADE_REQUIRED'
            break
          case 'api_access':
            message = 'API access requires a Professional subscription.'
            code = 'API_UPGRADE_REQUIRED'
            break
          case 'custom_reports':
            message = 'Custom reports require a Professional subscription.'
            code = 'REPORTS_UPGRADE_REQUIRED'
            break
        }

        return NextResponse.json(
          {
            error: 'Feature access denied',
            message,
            code,
            upgradeUrl: '/subscription/pricing'
          },
          { status: 403 }
        )
      }
    }

    // Access granted
    return null
  } catch (error) {
    console.error('Subscription middleware error:', error)
    return NextResponse.json(
      { error: 'Failed to verify subscription' },
      { status: 500 }
    )
  }
}

/**
 * Higher-order function to create subscription-protected API routes
 */
export function withSubscription(requirement: SubscriptionRequirement) {
  return function <T extends (...args: unknown[]) => unknown>(handler: T): T {
    return (async (request: NextRequest, ...args: unknown[]) => {
      const subscriptionCheck = await withSubscriptionCheck(request, requirement)

      if (subscriptionCheck) {
        return subscriptionCheck
      }

      return handler(request, ...args)
    }) as T
  }
}

/**
 * Utility function to check if user can access a feature on the client side
 */
export async function checkFeatureAccess(feature: string): Promise<{
  canAccess: boolean
  message?: string
  upgradeRequired?: boolean
}> {
  try {
    const response = await fetch('/api/subscription')

    if (!response.ok) {
      return { canAccess: false, message: 'Unable to verify subscription' }
    }

    const data = await response.json()
    const subscription = data.subscription
    const usage = data.usage

    if (!subscription || subscription.status !== 'active') {
      return {
        canAccess: false,
        message: 'Active subscription required',
        upgradeRequired: true
      }
    }

    const tier = subscription.tier?.toLowerCase() || 'free'

    switch (feature) {
      case 'export':
        if (tier === 'professional') {
          return { canAccess: true }
        }

        if (usage.exportsThisMonth >= usage.exportsLimit) {
          return {
            canAccess: false,
            message: 'Monthly export limit reached',
            upgradeRequired: true
          }
        }

        return { canAccess: true }

      case 'advanced_analytics':
      case 'api_access':
      case 'custom_reports':
        if (tier === 'professional') {
          return { canAccess: true }
        }

        return {
          canAccess: false,
          message: 'Professional subscription required',
          upgradeRequired: true
        }

      default:
        return { canAccess: true }
    }
  } catch (error) {
    console.error('Feature access check error:', error)
    return { canAccess: false, message: 'Unable to verify feature access' }
  }
}