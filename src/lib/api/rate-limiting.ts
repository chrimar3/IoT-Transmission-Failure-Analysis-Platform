/**
 * API Rate Limiting System
 * Implements tiered rate limiting with burst allowances for Professional API access
 */

import { createClient } from '@supabase/supabase-js'
import type { RateLimitTier, RateLimit } from '@/types/api'
import { subscriptionService } from '@/lib/stripe/subscription.service'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: Date
  retryAfter?: number
}

interface RateLimitConfig {
  requestsPerHour: number
  burstAllowance: number
  windowSizeMs: number
}

export class RateLimiter {
  private static readonly CONFIG: Record<RateLimitTier, RateLimitConfig> = {
    free: {
      requestsPerHour: 100,
      burstAllowance: 20,
      windowSizeMs: 60 * 60 * 1000 // 1 hour
    },
    professional: {
      requestsPerHour: 10000,
      burstAllowance: 500,
      windowSizeMs: 60 * 60 * 1000 // 1 hour
    },
    enterprise: {
      requestsPerHour: 50000,
      burstAllowance: 2000,
      windowSizeMs: 60 * 60 * 1000 // 1 hour
    }
  }

  /**
   * Get user's subscription tier for rate limiting
   */
  static async getUserTierFromSubscription(userId: string): Promise<RateLimitTier> {
    try {
      const subscription = await subscriptionService.getUserSubscription(userId)

      if (!subscription || subscription.status !== 'active') {
        return 'free'
      }

      switch (subscription.tier) {
        case 'PROFESSIONAL':
          return 'professional'
        case 'ENTERPRISE':
          return 'enterprise'
        default:
          return 'free'
      }
    } catch (error) {
      console.error('Failed to get user tier from subscription:', error)
      return 'free' // Fail safe to most restrictive tier
    }
  }

  /**
   * Check and enforce rate limit for an API key with subscription-aware tiering
   */
  static async checkRateLimit(
    apiKeyId: string,
    userId: string,
    tier?: RateLimitTier,
    endpoint?: string
  ): Promise<RateLimitResult> {
    // Get actual tier from subscription if not provided
    const actualTier = tier || await this.getUserTierFromSubscription(userId)

    try {
      const config = this.CONFIG[actualTier]
      const now = new Date()
      const windowStart = new Date(Math.floor(now.getTime() / config.windowSizeMs) * config.windowSizeMs)
      const windowEnd = new Date(windowStart.getTime() + config.windowSizeMs)

      // Get or create rate limit record for current window
      let rateLimitRecord = await this.getRateLimitRecord(apiKeyId, windowStart)

      if (!rateLimitRecord) {
        // Create new rate limit record
        rateLimitRecord = await this.createRateLimitRecord(
          apiKeyId,
          userId,
          windowStart,
          windowEnd,
          config.requestsPerHour
        )
      }

      // Check if request is within limit
      const remaining = config.requestsPerHour - rateLimitRecord.request_count
      const allowed = rateLimitRecord.request_count < config.requestsPerHour

      if (allowed) {
        // Increment request count
        await this.incrementRequestCount(rateLimitRecord.id)

        // Record API usage for analytics
        await this.recordApiUsage(apiKeyId, userId, endpoint)
      }

      return {
        allowed,
        limit: config.requestsPerHour,
        remaining: Math.max(0, remaining - (allowed ? 1 : 0)),
        resetTime: windowEnd,
        retryAfter: allowed ? undefined : Math.ceil((windowEnd.getTime() - now.getTime()) / 1000)
      }

    } catch (error) {
      console.error('Rate limit check error:', error)
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        limit: this.CONFIG[actualTier].requestsPerHour,
        remaining: this.CONFIG[actualTier].requestsPerHour - 1,
        resetTime: new Date(Date.now() + this.CONFIG[actualTier].windowSizeMs)
      }
    }
  }

  /**
   * Check burst rate limit for rapid successive requests with subscription awareness
   */
  static async checkBurstLimit(
    apiKeyId: string,
    userId: string,
    tier?: RateLimitTier,
    timeWindowMs: number = 60000 // 1 minute default
  ): Promise<boolean> {
    // Get actual tier from subscription if not provided
    const actualTier = tier || await this.getUserTierFromSubscription(userId)
    try {
      const config = this.CONFIG[actualTier]
      const windowStart = new Date(Date.now() - timeWindowMs)

      const { count, error } = await supabase
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .eq('api_key_id', apiKeyId)
        .gte('timestamp', windowStart.toISOString())

      if (error) {
        console.error('Burst limit check error:', error)
        return true // Fail open
      }

      return (count || 0) < config.burstAllowance

    } catch (error) {
      console.error('Burst limit check error:', error)
      return true // Fail open
    }
  }

  /**
   * Get current rate limit status for an API key
   */
  static async getRateLimitStatus(
    apiKeyId: string,
    tier: RateLimitTier
  ): Promise<RateLimitResult> {
    try {
      const config = this.CONFIG[tier]
      const now = new Date()
      const windowStart = new Date(Math.floor(now.getTime() / config.windowSizeMs) * config.windowSizeMs)
      const windowEnd = new Date(windowStart.getTime() + config.windowSizeMs)

      const rateLimitRecord = await this.getRateLimitRecord(apiKeyId, windowStart)

      if (!rateLimitRecord) {
        return {
          allowed: true,
          limit: config.requestsPerHour,
          remaining: config.requestsPerHour,
          resetTime: windowEnd
        }
      }

      const remaining = config.requestsPerHour - rateLimitRecord.request_count

      return {
        allowed: remaining > 0,
        limit: config.requestsPerHour,
        remaining: Math.max(0, remaining),
        resetTime: windowEnd,
        retryAfter: remaining <= 0 ? Math.ceil((windowEnd.getTime() - now.getTime()) / 1000) : undefined
      }

    } catch (error) {
      console.error('Rate limit status error:', error)
      const config = this.CONFIG[tier]
      return {
        allowed: true,
        limit: config.requestsPerHour,
        remaining: config.requestsPerHour,
        resetTime: new Date(Date.now() + config.windowSizeMs)
      }
    }
  }

  /**
   * Reset rate limit for an API key (admin function)
   */
  static async resetRateLimit(apiKeyId: string): Promise<void> {
    try {
      const now = new Date()
      const windowStart = new Date(Math.floor(now.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000))

      await supabase
        .from('rate_limits')
        .update({ request_count: 0 })
        .eq('api_key_id', apiKeyId)
        .eq('window_start', windowStart.toISOString())

    } catch (error) {
      console.error('Rate limit reset error:', error)
      throw new Error('Failed to reset rate limit')
    }
  }

  /**
   * Get rate limit analytics for a user
   */
  static async getRateLimitAnalytics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRequests: number
    limitExceeded: number
    averageUsage: number
    peakUsage: number
    usageByHour: Array<{ hour: string; requests: number; limit: number }>
  }> {
    try {
      // Get all rate limit records for the period
      const { data: rateLimits, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('user_id', userId)
        .gte('window_start', startDate.toISOString())
        .lte('window_end', endDate.toISOString())
        .order('window_start')

      if (error) {
        throw new Error('Failed to fetch rate limit analytics')
      }

      const totalRequests = rateLimits.reduce((sum, record) => sum + record.request_count, 0)
      const limitExceeded = rateLimits.filter(record => record.request_count >= record.tier_limit).length
      const averageUsage = rateLimits.length > 0 ? totalRequests / rateLimits.length : 0
      const peakUsage = Math.max(...rateLimits.map(record => record.request_count), 0)

      const usageByHour = rateLimits.map(record => ({
        hour: record.window_start,
        requests: record.request_count,
        limit: record.tier_limit
      }))

      return {
        totalRequests,
        limitExceeded,
        averageUsage,
        peakUsage,
        usageByHour
      }

    } catch (error) {
      console.error('Rate limit analytics error:', error)
      throw error
    }
  }

  /**
   * Get rate limit record for a specific window
   */
  private static async getRateLimitRecord(
    apiKeyId: string,
    windowStart: Date
  ): Promise<RateLimit | null> {
    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('api_key_id', apiKeyId)
        .eq('window_start', windowStart.toISOString())
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Get rate limit record error:', error)
        return null
      }

      return data as RateLimit | null

    } catch (error) {
      console.error('Get rate limit record error:', error)
      return null
    }
  }

  /**
   * Create new rate limit record for a window
   */
  private static async createRateLimitRecord(
    apiKeyId: string,
    userId: string,
    windowStart: Date,
    windowEnd: Date,
    tierLimit: number
  ): Promise<RateLimit> {
    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .insert({
          api_key_id: apiKeyId,
          user_id: userId,
          window_start: windowStart.toISOString(),
          window_end: windowEnd.toISOString(),
          request_count: 0,
          tier_limit: tierLimit
        })
        .select()
        .single()

      if (error) {
        console.error('Create rate limit record error:', error)
        throw new Error('Failed to create rate limit record')
      }

      return data as RateLimit

    } catch (error) {
      console.error('Create rate limit record error:', error)
      throw error
    }
  }

  /**
   * Increment request count for a rate limit record
   */
  private static async incrementRequestCount(rateLimitId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('rate_limits')
        .update({
          request_count: supabase.sql`request_count + 1`
        })
        .eq('id', rateLimitId)

      if (error) {
        console.error('Increment request count error:', error)
      }

    } catch (error) {
      console.error('Increment request count error:', error)
    }
  }

  /**
   * Record API usage for analytics
   */
  private static async recordApiUsage(
    apiKeyId: string,
    userId: string,
    endpoint?: string
  ): Promise<void> {
    try {
      // This is a basic implementation - in a real system, you'd want to
      // batch these inserts or use a separate analytics service
      await supabase
        .from('api_usage')
        .insert({
          api_key_id: apiKeyId,
          user_id: userId,
          endpoint: endpoint || 'unknown',
          method: 'GET', // This would be passed from the request
          response_status: 200, // This would be set after the response
          response_time_ms: 0, // This would be calculated
          timestamp: new Date().toISOString()
        })

    } catch (error) {
      // Don't fail the request if analytics recording fails
      console.error('Record API usage error:', error)
    }
  }
}

/**
 * Middleware helper for rate limiting
 */
export class RateLimitMiddleware {
  /**
   * Create rate limit headers for HTTP responses
   */
  static createHeaders(rateLimitResult: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': rateLimitResult.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime.getTime() / 1000).toString()
    }

    if (rateLimitResult.retryAfter) {
      headers['Retry-After'] = rateLimitResult.retryAfter.toString()
    }

    return headers
  }

  /**
   * Create rate limit error response
   */
  static createErrorResponse(rateLimitResult: RateLimitResult) {
    return {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.',
        details: {
          limit: rateLimitResult.limit,
          reset_time: rateLimitResult.resetTime.toISOString(),
          retry_after_seconds: rateLimitResult.retryAfter
        },
        suggestions: [
          'Reduce request frequency',
          'Upgrade to Professional tier for higher limits',
          'Implement request caching to reduce API calls'
        ]
      },
      meta: {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        rate_limit: {
          remaining: rateLimitResult.remaining,
          reset_at: rateLimitResult.resetTime.toISOString(),
          limit: rateLimitResult.limit
        }
      }
    }
  }

  /**
   * Get user's subscription tier for rate limiting
   */
  static async getUserTierFromSubscription(userId: string): Promise<RateLimitTier> {
    return await RateLimiter.getUserTierFromSubscription(userId)
  }

  /**
   * Check if request should be allowed based on rate limiting with subscription awareness
   */
  static async enforceRateLimit(
    apiKeyId: string,
    userId: string,
    endpoint: string,
    tier?: RateLimitTier
  ): Promise<{ allowed: boolean; headers: Record<string, string>; errorResponse?: unknown; actualTier?: RateLimitTier }> {
    // Get actual tier from subscription if not provided
    const actualTier = tier || await this.getUserTierFromSubscription(userId)
    try {
      // Check main rate limit
      const rateLimitResult = await RateLimiter.checkRateLimit(apiKeyId, userId, actualTier, endpoint)

      // Check burst limit if main rate limit passed
      if (rateLimitResult.allowed) {
        const burstAllowed = await RateLimiter.checkBurstLimit(apiKeyId, userId, actualTier)
        if (!burstAllowed) {
          rateLimitResult.allowed = false
          rateLimitResult.retryAfter = 60 // 1 minute for burst limit
        }
      }

      const headers = this.createHeaders(rateLimitResult)
      headers['X-Subscription-Tier'] = actualTier.toUpperCase()

      if (!rateLimitResult.allowed) {
        return {
          allowed: false,
          headers,
          errorResponse: this.createErrorResponse(rateLimitResult),
          actualTier
        }
      }

      return { allowed: true, headers, actualTier }

    } catch (error) {
      console.error('Rate limit enforcement error:', error)
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        headers: {
          'X-RateLimit-Limit': '1000',
          'X-RateLimit-Remaining': '999',
          'X-RateLimit-Reset': Math.ceil((Date.now() + 3600000) / 1000).toString()
        }
      }
    }
  }
}