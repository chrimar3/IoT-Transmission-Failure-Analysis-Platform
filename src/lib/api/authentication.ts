/**
 * API Authentication and Authorization Middleware
 * Handles API key validation, scope checking, and request authorization
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiKeyManager, ApiKeyValidator } from './key-management'
import { RateLimitMiddleware } from './rate-limiting'
import type { ApiKey, ApiKeyScope, RateLimitTier } from '@/types/api'

export interface AuthenticatedRequest extends NextRequest {
  apiKey?: ApiKey
  userId?: string
  rateLimitTier?: RateLimitTier
}

export interface AuthenticationResult {
  success: boolean
  apiKey?: ApiKey
  userId?: string
  rateLimitTier?: RateLimitTier
  error?: {
    code: string
    message: string
    status: number
    headers?: Record<string, string>
  }
}

export interface AuthorizationOptions {
  requiredScopes?: ApiKeyScope[]
  requireAnyScope?: boolean // If true, requires ANY of the scopes; if false, requires ALL
  allowPublicAccess?: boolean // If true, allows unauthenticated access with reduced functionality
  rateLimitCost?: number // Custom rate limit cost for this endpoint
}

export interface ErrorDetails {
  documentation?: string
  header_examples?: string[]
  suggestions?: string[]
  retry_after?: number
}

/**
 * Simplified API key validation function for compatibility with tests
 */
export async function validateAPIKey(apiKey: string): Promise<{
  valid: boolean
  tier: string
  userId: string
}> {
  try {
    // Use the existing ApiKeyManager to validate the key
    const keyData = await ApiKeyManager.validateApiKey(apiKey)

    if (!keyData) {
      return {
        valid: false,
        tier: 'FREE',
        userId: ''
      }
    }

    return {
      valid: true,
      tier: keyData.rate_limit_tier?.toUpperCase() || 'FREE',
      userId: keyData.user_id
    }
  } catch (error) {
    console.error('API key validation error:', error)
    return {
      valid: false,
      tier: 'FREE',
      userId: ''
    }
  }
}

/**
 * Main API Authentication Class
 */
export class ApiAuthentication {
  /**
   * Authenticate API request and validate key
   */
  static async authenticate(request: NextRequest): Promise<AuthenticationResult> {
    try {
      // Extract API key from request
      const apiKeyString = ApiKeyValidator.extractApiKey(request.headers)

      if (!apiKeyString) {
        return {
          success: false,
          error: {
            code: 'MISSING_API_KEY',
            message: 'API key is required. Include it in Authorization header (Bearer token) or X-API-Key header.',
            status: 401,
            headers: {
              'WWW-Authenticate': 'Bearer realm="API", charset="UTF-8"'
            }
          }
        }
      }

      // Validate API key format
      if (!this.isValidKeyFormat(apiKeyString)) {
        return {
          success: false,
          error: {
            code: 'INVALID_API_KEY_FORMAT',
            message: 'API key format is invalid. Expected format: cb_[32-character-string]',
            status: 401
          }
        }
      }

      // Validate API key in database
      const apiKey = await ApiKeyManager.validateApiKey(apiKeyString)

      if (!apiKey) {
        return {
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'API key is invalid, expired, or inactive.',
            status: 401
          }
        }
      }

      // Determine rate limit tier
      const rateLimitTier = apiKey.rate_limit_tier as RateLimitTier

      return {
        success: true,
        apiKey,
        userId: apiKey.user_id,
        rateLimitTier
      }

    } catch (error) {
      console.error('API authentication error:', error)
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'An error occurred during authentication.',
          status: 500
        }
      }
    }
  }

  /**
   * Authorize API request based on scopes and rate limits
   */
  static async authorize(
    request: NextRequest,
    options: AuthorizationOptions = {}
  ): Promise<{
    success: boolean
    apiKey?: ApiKey
    userId?: string
    rateLimitHeaders?: Record<string, string>
    error?: unknown
  }> {
    try {
      // Handle public access
      if (options.allowPublicAccess) {
        const apiKeyString = ApiKeyValidator.extractApiKey(request.headers)
        if (!apiKeyString) {
          // Allow public access with default rate limits
          return { success: true }
        }
      }

      // Authenticate request
      const authResult = await this.authenticate(request)

      if (!authResult.success) {
        return {
          success: false,
          error: this.createErrorResponse(authResult.error!)
        }
      }

      const { apiKey, userId, rateLimitTier } = authResult

      // Check scopes if required
      if (options.requiredScopes && options.requiredScopes.length > 0) {
        const hasRequiredScopes = options.requireAnyScope
          ? ApiKeyValidator.hasAnyScope(apiKey!, options.requiredScopes)
          : options.requiredScopes.every(scope => ApiKeyValidator.hasScope(apiKey!, scope))

        if (!hasRequiredScopes) {
          return {
            success: false,
            error: this.createErrorResponse({
              code: 'INSUFFICIENT_SCOPE',
              message: `API key lacks required scope(s): ${options.requiredScopes.join(', ')}`,
              status: 403
            })
          }
        }
      }

      // Check rate limits
      const endpoint = new URL(request.url).pathname
      const rateLimitResult = await RateLimitMiddleware.enforceRateLimit(
        apiKey!.id,
        userId!,
        rateLimitTier!,
        endpoint
      )

      if (!rateLimitResult.allowed) {
        return {
          success: false,
          rateLimitHeaders: rateLimitResult.headers,
          error: rateLimitResult.errorResponse
        }
      }

      return {
        success: true,
        apiKey,
        userId,
        rateLimitHeaders: rateLimitResult.headers
      }

    } catch (error) {
      console.error('API authorization error:', error)
      return {
        success: false,
        error: this.createErrorResponse({
          code: 'AUTHORIZATION_ERROR',
          message: 'An error occurred during authorization.',
          status: 500
        })
      }
    }
  }

  /**
   * Create standardized API error response
   */
  private static createErrorResponse(error: {
    code: string
    message: string
    status: number
    headers?: Record<string, string>
  }) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: this.getErrorDetails(error.code),
        suggestions: this.getErrorSuggestions(error.code)
      },
      meta: {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      },
      status: error.status,
      headers: error.headers || {}
    }
  }

  /**
   * Get additional error details based on error code
   */
  private static getErrorDetails(errorCode: string): ErrorDetails | undefined {
    const details: Record<string, ErrorDetails> = {
      MISSING_API_KEY: {
        documentation: 'https://docs.cu-bems.com/api/authentication',
        header_examples: [
          'Authorization: Bearer cb_your_api_key_here',
          'X-API-Key: cb_your_api_key_here'
        ]
      },
      INVALID_API_KEY_FORMAT: {
        expected_format: 'cb_[32-character-alphanumeric-string]',
        example: 'cb_abc123def456ghi789jkl012mno345pqr'
      },
      INVALID_API_KEY: {
        possible_causes: [
          'API key does not exist',
          'API key has been deactivated',
          'API key has expired'
        ],
        resolution: 'Generate a new API key in your dashboard'
      },
      INSUFFICIENT_SCOPE: {
        documentation: 'https://docs.cu-bems.com/api/scopes',
        available_scopes: ['read:data', 'read:analytics', 'read:exports', 'write:webhooks']
      },
      RATE_LIMIT_EXCEEDED: {
        upgrade_info: {
          current_tier: 'free',
          upgrade_to: 'professional',
          benefits: '100x higher rate limits, advanced analytics, webhook support'
        }
      }
    }

    return details[errorCode] || {}
  }

  /**
   * Get error resolution suggestions
   */
  private static getErrorSuggestions(errorCode: string): string[] {
    const suggestions: Record<string, string[]> = {
      MISSING_API_KEY: [
        'Include your API key in the Authorization header as a Bearer token',
        'Alternatively, use the X-API-Key header',
        'Ensure your API key is not empty or null'
      ],
      INVALID_API_KEY_FORMAT: [
        'Check that your API key starts with "cb_"',
        'Verify the key is exactly the format provided when created',
        'Ensure no extra characters or whitespace are included'
      ],
      INVALID_API_KEY: [
        'Generate a new API key in your dashboard',
        'Check if your API key has expired',
        'Verify your API key is still active'
      ],
      INSUFFICIENT_SCOPE: [
        'Update your API key scopes in the dashboard',
        'Create a new API key with the required scopes',
        'Contact support if you need additional permissions'
      ],
      RATE_LIMIT_EXCEEDED: [
        'Reduce your request frequency',
        'Implement caching to minimize API calls',
        'Upgrade to Professional tier for higher limits'
      ]
    }

    return suggestions[errorCode] || [
      'Check the API documentation for proper usage',
      'Contact support if the issue persists'
    ]
  }

  /**
   * Validate API key format
   */
  private static isValidKeyFormat(apiKey: string): boolean {
    // API keys should start with 'cb_' and be followed by 32 alphanumeric characters
    const pattern = /^cb_[A-Za-z0-9]{32}$/
    return pattern.test(apiKey)
  }
}

/**
 * Middleware wrapper for Next.js API routes
 */
export function withApiAuth(options: AuthorizationOptions = {}) {
  return function (handler: (req: AuthenticatedRequest, res: NextResponse) => Promise<NextResponse>) {
    return async function (req: NextRequest): Promise<NextResponse> {
      try {
        // Perform authorization
        const authResult = await ApiAuthentication.authorize(req, options)

        if (!authResult.success) {
          const errorStatus =
            authResult.error && typeof authResult.error === 'object' && 'status' in authResult.error
              ? (authResult.error.status as number)
              : 401

          const response = NextResponse.json(authResult.error, {
            status: errorStatus,
            headers: {
              ...authResult.error.headers,
              ...authResult.rateLimitHeaders,
              'Content-Type': 'application/json'
            }
          })

          return response
        }

        // Augment request with authentication data
        const authenticatedReq = req as AuthenticatedRequest
        authenticatedReq.apiKey = authResult.apiKey
        authenticatedReq.userId = authResult.userId
        authenticatedReq.rateLimitTier = authResult.apiKey?.rate_limit_tier as RateLimitTier

        // Call the original handler
        const response = await handler(authenticatedReq, NextResponse.next())

        // Add rate limit headers to response
        if (authResult.rateLimitHeaders) {
          Object.entries(authResult.rateLimitHeaders).forEach(([key, value]) => {
            response.headers.set(key, value)
          })
        }

        return response

      } catch (error) {
        console.error('API authentication middleware error:', error)

        return NextResponse.json({
          success: false,
          error: {
            code: 'MIDDLEWARE_ERROR',
            message: 'An error occurred in the authentication middleware.',
            details: process.env.NODE_ENV === 'development' ? error : undefined
          },
          meta: {
            request_id: crypto.randomUUID(),
            timestamp: new Date().toISOString()
          }
        }, {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  }
}

/**
 * Higher-order function for route protection
 */
export function requireScopes(scopes: ApiKeyScope[], requireAll: boolean = true) {
  return withApiAuth({
    requiredScopes: scopes,
    requireAnyScope: !requireAll
  })
}

/**
 * Utility function to log API usage for analytics
 */
export async function logApiUsage(
  req: AuthenticatedRequest,
  response: NextResponse,
  startTime: number
): Promise<void> {
  try {
    if (!req.apiKey || !req.userId) return

    const endTime = Date.now()
    const responseTime = endTime - startTime
    const url = new URL(req.url)

    // Create usage record
    const usageData = {
      api_key_id: req.apiKey.id,
      user_id: req.userId,
      endpoint: url.pathname,
      method: req.method,
      response_status: response.status,
      response_time_ms: responseTime,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || '',
      timestamp: new Date().toISOString(),
      request_params: Object.fromEntries(url.searchParams.entries())
    }

    // In a production system, you'd want to batch these or use a queue
    // For now, we'll use a simple async insert that doesn't block the response
    setImmediate(async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        await supabase.from('api_usage').insert(usageData)
      } catch (error) {
        console.error('Failed to log API usage:', error)
      }
    })

  } catch (error) {
    console.error('API usage logging error:', error)
  }
}