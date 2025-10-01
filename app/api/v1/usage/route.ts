/**
 * Professional API v1: API Usage Analytics
 * GET /api/v1/usage - Get API usage statistics and analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'
import type { ApiResponse, ApiUsageStats } from '@/types/api'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Request validation schema
const UsageRequestSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  api_key_id: z.string().uuid().optional(),
  group_by: z.enum(['day', 'week', 'month']).default('day'),
  include_errors: z.boolean().default(true),
  include_performance: z.boolean().default(true)
})

/**
 * GET /api/v1/usage - Get API usage analytics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get authenticated user session
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)

    // Validate request parameters
    const params = UsageRequestSchema.parse({
      start_date: searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: searchParams.get('end_date') || new Date().toISOString(),
      api_key_id: searchParams.get('api_key_id'),
      group_by: searchParams.get('group_by') || 'day',
      include_errors: searchParams.get('include_errors') !== 'false',
      include_performance: searchParams.get('include_performance') !== 'false'
    })

    // Get usage analytics
    const analytics = await getUsageAnalytics(userId, params)

    const response: ApiResponse<{
      usage_stats: ApiUsageStats
      rate_limit_status: {
        current_usage: number
        limit: number
        reset_time: string
      }
      billing_info?: {
        current_period_requests: number
        overage_charges?: number
      }
    }> = {
      success: true,
      data: {
        usage_stats: analytics,
        rate_limit_status: {
          current_usage: analytics.total_requests,
          limit: 10000, // Professional tier limit
          reset_time: new Date(Date.now() + 3600000).toISOString()
        }
      },
      meta: {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        processing_time_ms: 0,
        rate_limit: {
          remaining: 999,
          reset_at: new Date(Date.now() + 3600000).toISOString(),
          limit: 1000
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Usage analytics error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Invalid request parameters',
          details: error.errors
        }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve usage analytics'
      }
    }, { status: 500 })
  }
}

/**
 * Get comprehensive usage analytics for a user
 */
interface UsageAnalyticsParams {
  period?: '7d' | '30d' | '90d' | '1y';
  endpoint?: string;
  detailed?: boolean;
  start_date?: string;
  end_date?: string;
  api_key_id?: string;
  group_by?: string;
  include_errors?: boolean;
}

async function getUsageAnalytics(userId: string, params: UsageAnalyticsParams): Promise<ApiUsageStats> {
  try {
    // Base query for user's API usage
    let baseQuery = supabase
      .from('api_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', params.start_date)
      .lte('timestamp', params.end_date)

    // Filter by specific API key if provided
    if (params.api_key_id) {
      baseQuery = baseQuery.eq('api_key_id', params.api_key_id)
    }

    const { data: usageData, error } = await baseQuery.order('timestamp', { ascending: true })

    if (error) {
      console.error('Failed to fetch usage data:', error)
      throw new Error('Failed to fetch usage analytics')
    }

    if (!usageData || usageData.length === 0) {
      return {
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        average_response_time: 0,
        requests_by_endpoint: {},
        requests_by_day: [],
        top_errors: []
      }
    }

    // Calculate basic statistics
    const totalRequests = usageData.length
    const successfulRequests = usageData.filter(req => req.response_status >= 200 && req.response_status < 400).length
    const failedRequests = totalRequests - successfulRequests

    // Calculate average response time
    const validResponseTimes = usageData
      .filter(req => req.response_time_ms && req.response_time_ms > 0)
      .map(req => req.response_time_ms)

    const averageResponseTime = validResponseTimes.length > 0
      ? Math.round(validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length)
      : 0

    // Group requests by endpoint
    const requestsByEndpoint: Record<string, number> = {}
    usageData.forEach(req => {
      const endpoint = req.endpoint || 'unknown'
      requestsByEndpoint[endpoint] = (requestsByEndpoint[endpoint] || 0) + 1
    })

    // Group requests by day/week/month
    const requestsByDay = groupRequestsByPeriod(usageData, (params.group_by as 'day' | 'week' | 'month') || 'day')

    // Get top errors if requested
    const topErrors = params.include_errors ? getTopErrors(usageData) : []

    return {
      total_requests: totalRequests,
      successful_requests: successfulRequests,
      failed_requests: failedRequests,
      average_response_time: averageResponseTime,
      requests_by_endpoint: requestsByEndpoint,
      requests_by_day: requestsByDay,
      top_errors: topErrors
    }

  } catch (error) {
    console.error('Usage analytics calculation error:', error)
    throw error
  }
}

/**
 * Group requests by time period
 */
function groupRequestsByPeriod(
  usageData: unknown[],
  groupBy: 'day' | 'week' | 'month'
): Array<{ date: string; count: number }> {
  const groups: Record<string, number> = {}

  usageData.forEach(req => {
    const typedReq = req as { timestamp: string }
    const date = new Date(typedReq.timestamp)
    let groupKey: string

    switch (groupBy) {
      case 'day':
        groupKey = date.toISOString().substring(0, 10) // YYYY-MM-DD
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
        groupKey = weekStart.toISOString().substring(0, 10)
        break
      case 'month':
        groupKey = date.toISOString().substring(0, 7) // YYYY-MM
        break
      default:
        groupKey = date.toISOString().substring(0, 10)
    }

    groups[groupKey] = (groups[groupKey] || 0) + 1
  })

  // Convert to array and sort by date
  return Object.entries(groups)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Get top errors from usage data
 */
function getTopErrors(usageData: unknown[]): Array<{ error: string; count: number }> {
  const errorCounts: Record<string, number> = {}

  // Count errors by status code and message
  usageData
    .filter(req => {
      const typedReq = req as { response_status?: number; error_message?: string }
      return (typedReq.response_status && typedReq.response_status >= 400) || typedReq.error_message
    })
    .forEach(req => {
      const typedReq = req as { response_status?: number; error_message?: string }
      let errorKey: string

      if (typedReq.error_message) {
        errorKey = typedReq.error_message
      } else if (typedReq.response_status && typedReq.response_status >= 400) {
        errorKey = `HTTP ${typedReq.response_status}: ${getHttpStatusMessage(typedReq.response_status)}`
      } else {
        return
      }

      errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1
    })

  // Convert to array, sort by count, and return top 10
  return Object.entries(errorCounts)
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

/**
 * Get HTTP status message for common codes
 */
function getHttpStatusMessage(statusCode: number): string {
  const statusMessages: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  }

  return statusMessages[statusCode] || 'Unknown Error'
}