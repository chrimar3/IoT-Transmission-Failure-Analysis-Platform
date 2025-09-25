/**
 * API Endpoint: GET /api/readings/summary
 * PROTECTED: Subscription-based access with revenue protection (Story 1.3)
 * Returns dashboard metrics using hybrid R2 + Supabase storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { r2Client } from '@/lib/r2-client'
import { DashboardMetrics, ApiResponse } from '@/lib/types/api'
import { enforceTierBasedRateLimit } from '@/src/lib/middleware/data-access.middleware'
import { subscriptionService } from '@/src/lib/stripe/subscription.service'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/src/lib/auth/config'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()

    // CRITICAL REVENUE PROTECTION: Validate subscription and apply rate limiting
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: {
          error: 'authentication_required',
          message: 'Please sign in to access dashboard metrics',
          timestamp: new Date().toISOString(),
          status: 401
        },
        upgrade_prompt: {
          title: 'Sign In Required',
          message: 'Dashboard metrics require authentication',
          upgradeUrl: '/auth/signin?callbackUrl=/api/readings/summary'
        }
      } as ApiResponse<never>, { status: 401 })
    }

    const userId = session.user.id

    // Apply tier-based rate limiting
    const rateLimitCheck = await enforceTierBasedRateLimit(userId, 'summary')
    if (!rateLimitCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: {
          error: 'rate_limit_exceeded',
          message: `Dashboard metrics rate limit exceeded. Resets at ${rateLimitCheck.resetTime.toISOString()}`,
          timestamp: new Date().toISOString(),
          status: 429
        },
        remaining: rateLimitCheck.remaining,
        reset_time: rateLimitCheck.resetTime.toISOString(),
        upgrade_prompt: rateLimitCheck.upgradePrompt
      } as ApiResponse<never>, { status: 429 })
    }

    // Get user's subscription tier for data filtering
    const subscription = await subscriptionService.getUserSubscription(userId)
    const userTier = subscription?.tier || 'FREE'

    // Fetch metrics from R2 storage (with subscription-aware filtering)
    const metrics = await r2Client.getMetrics()

    // Apply tier-based data restrictions to metrics
    const filteredMetrics = applyTierRestrictionsToMetrics(metrics, userTier)

    const executionTime = Date.now() - startTime
    console.log(`📊 Dashboard metrics generated in ${executionTime}ms for tier: ${userTier}`)

    // Track API usage for revenue analytics
    await subscriptionService.trackUserActivity(userId, 'api_summary_access', {
      tier: userTier,
      execution_time_ms: executionTime,
      restricted_view: userTier === 'FREE'
    })

    return NextResponse.json(
      {
        success: true,
        data: filteredMetrics as DashboardMetrics,
        // Include upgrade prompt for free tier users
        upgrade_prompt: userTier === 'FREE' ? {
          title: 'Unlock Complete Analytics',
          message: 'Professional tier provides full 18-month historical metrics and advanced insights',
          upgradeUrl: '/subscription/upgrade?source=dashboard_metrics',
          ctaText: 'Upgrade for €29/month'
        } : undefined
      } as ApiResponse<DashboardMetrics> & { upgrade_prompt?: any },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': userTier === 'FREE' ? 'no-cache' : 'public, s-maxage=60, stale-while-revalidate=300',
          'X-Rate-Limit-Remaining': rateLimitCheck.remaining.toString(),
          'X-Subscription-Tier': userTier,
          'X-Execution-Time': `${executionTime}ms`
        }
      }
    )

  } catch (error) {
    console.error('Unexpected error in summary endpoint:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          error: 'internal_server_error',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
          status: 500
        }
      } as ApiResponse<never>,
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

/**
 * Apply tier-based restrictions to dashboard metrics
 * FREE TIER: Limited to 30-day metrics, basic insights only
 * PROFESSIONAL TIER: Full 18-month metrics with advanced insights
 */
function applyTierRestrictionsToMetrics(metrics: DashboardMetrics, tier: string): DashboardMetrics {
  if (tier === 'FREE') {
    // Restrict free tier to last 30 days and basic metrics
    return {
      ...metrics,
      // Limit historical data to 30 days
      historical_data: metrics.historical_data?.slice(-30) || [],
      // Remove advanced analytical insights
      energy_efficiency_score: undefined,
      predictive_maintenance_alerts: [],
      cost_optimization_opportunities: [],
      // Add restriction notice
      tier_notice: {
        current_tier: 'FREE',
        restrictions_applied: ['30_day_history_limit', 'basic_metrics_only'],
        upgrade_available: 'Professional tier provides 18-month history and advanced insights'
      }
    }
  }

  // Professional tier gets full access
  return metrics
}