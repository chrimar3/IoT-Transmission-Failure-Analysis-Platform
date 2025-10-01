/**
 * API Authentication Middleware
 * Handles API key validation, rate limiting, and subscription tier checking
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { apiKeyManager, RateLimitInfo } from './api-key-manager'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email?: string
    subscription_tier: string
  }
  apiKey?: {
    user_id: string
    scopes: string[]
    rate_limit: RateLimitInfo
  }
}

export interface ApiAuthResult {
  success: boolean
  user?: {
    id: string
    email?: string
    subscription_tier: string
  }
  apiKey?: {
    user_id: string
    scopes: string[]
    rate_limit: RateLimitInfo
  }
  error?: {
    code: string
    message: string
    status: number
  }
}

/**
 * Authenticate API request using session or API key
 */
export async function authenticateApiRequest(request: NextRequest): Promise<ApiAuthResult> {
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    // API Key authentication
    const apiKey = authHeader.slice(7)
    return await authenticateWithApiKey(apiKey)
  } else {
    // Session authentication (for web app)
    return await authenticateWithSession(request)
  }
}

/**
 * Authenticate using API key
 */
async function authenticateWithApiKey(apiKey: string): Promise<ApiAuthResult> {
  try {
    const validation = await apiKeyManager.validateApiKey(apiKey)

    if (!validation) {
      return {
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or expired API key',
          status: 401
        }
      }
    }

    return {
      success: true,
      apiKey: validation
    }
  } catch (error) {
    console.error('API key validation error:', error)
    return {
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication service error',
        status: 500
      }
    }
  }
}

/**
 * Authenticate using NextAuth session
 */
async function authenticateWithSession(_request: NextRequest): Promise<ApiAuthResult> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return {
        success: false,
        error: {
          code: 'NO_SESSION',
          message: 'No valid session found',
          status: 401
        }
      }
    }

    // Get user's subscription tier
    // In a real implementation, you'd fetch this from the database
    const subscriptionTier = 'professional' // Default for now

    return {
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        subscription_tier: subscriptionTier
      }
    }
  } catch (error) {
    console.error('Session authentication error:', error)
    return {
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication service error',
        status: 500
      }
    }
  }
}

/**
 * Check if user has Professional subscription
 */
export function requiresProfessionalTier(authResult: ApiAuthResult): boolean {
  if (authResult.user) {
    return authResult.user.subscription_tier === 'professional' ||
           authResult.user.subscription_tier === 'enterprise'
  }

  if (authResult.apiKey) {
    return authResult.apiKey.rate_limit.tier === 'professional' ||
           authResult.apiKey.rate_limit.tier === 'enterprise'
  }

  return false
}

/**
 * Check rate limit for request
 */
export async function checkRateLimit(
  authResult: ApiAuthResult,
  _endpoint: string
): Promise<{
  allowed: boolean
  headers: Record<string, string>
}> {
  if (!authResult.apiKey) {
    // Session-based requests aren't rate limited the same way
    return { allowed: true, headers: {} }
  }

  const rateLimitCheck = await apiKeyManager.checkRateLimit(
    authResult.apiKey.user_id, // Using user_id as a proxy for key_id
    authResult.apiKey.rate_limit
  )

  const headers = {
    'X-RateLimit-Limit': authResult.apiKey.rate_limit.hourly_limit.toString(),
    'X-RateLimit-Remaining': Math.max(0,
      authResult.apiKey.rate_limit.hourly_limit - rateLimitCheck.current_usage
    ).toString(),
    'X-RateLimit-Reset': rateLimitCheck.reset_time
  }

  return {
    allowed: rateLimitCheck.allowed,
    headers
  }
}

/**
 * Middleware wrapper for API routes
 */
export function withApiAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  options: {
    requireProfessional?: boolean
    requiredScopes?: string[]
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Authenticate request
      const authResult = await authenticateApiRequest(request)

      if (!authResult.success) {
        return NextResponse.json(
          {
            error: authResult.error?.code,
            message: authResult.error?.message
          },
          { status: authResult.error?.status || 401 }
        )
      }

      // Check Professional tier requirement
      if (options.requireProfessional && !requiresProfessionalTier(authResult)) {
        return NextResponse.json(
          {
            error: 'SUBSCRIPTION_REQUIRED',
            message: 'Professional subscription required for API access',
            upgrade_url: '/pricing'
          },
          { status: 402 } // Payment Required
        )
      }

      // Check scopes if using API key
      if (authResult.apiKey && options.requiredScopes) {
        const hasRequiredScopes = options.requiredScopes.every(scope =>
          authResult.apiKey!.scopes.includes(scope)
        )

        if (!hasRequiredScopes) {
          return NextResponse.json(
            {
              error: 'INSUFFICIENT_SCOPE',
              message: `Required scopes: ${options.requiredScopes.join(', ')}`,
              provided_scopes: authResult.apiKey.scopes
            },
            { status: 403 }
          )
        }
      }

      // Check rate limit
      const rateLimitCheck = await checkRateLimit(authResult, request.nextUrl.pathname)

      if (!rateLimitCheck.allowed) {
        return NextResponse.json(
          {
            error: 'RATE_LIMITED',
            message: 'Rate limit exceeded',
            reset_time: rateLimitCheck.headers['X-RateLimit-Reset']
          },
          {
            status: 429,
            headers: rateLimitCheck.headers
          }
        )
      }

      // Track usage if API key is used
      if (authResult.apiKey) {
        await apiKeyManager.trackUsage(
          authResult.apiKey.user_id, // Using user_id as proxy for key_id
          request.nextUrl.pathname
        )
      }

      // Add auth info to request
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = authResult.user
      authenticatedRequest.apiKey = authResult.apiKey

      // Call the handler
      const response = await handler(authenticatedRequest)

      // Add rate limit headers to response
      Object.entries(rateLimitCheck.headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      return response

    } catch (error) {
      console.error('API middleware error:', error)
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          message: 'Internal server error'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Create standardized API error response
 */
export function createApiError(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    {
      error: code,
      message,
      details,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

/**
 * Create standardized API success response
 */
export function createApiSuccess<T>(
  data: T,
  status: number = 200,
  pagination?: {
    page: number
    limit: number
    total: number
    has_more: boolean
  }
): NextResponse {
  const response: {
    success: boolean
    data: T
    timestamp: string
    pagination?: {
      page: number
      limit: number
      total: number
      has_more: boolean
    }
  } = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  }

  if (pagination) {
    response.pagination = pagination
  }

  return NextResponse.json(response, { status })
}