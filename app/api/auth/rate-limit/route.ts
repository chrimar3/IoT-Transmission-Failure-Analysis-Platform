import { NextRequest, NextResponse } from 'next/server'
import {
  isRateLimited,
  getRemainingAttempts,
  getRateLimitStatus
} from '@/lib/auth/rate-limiting'

/**
 * GET /api/auth/rate-limit
 * Check rate limiting status for the current IP
 */
export async function GET(request: NextRequest) {
  try {
    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'

    // Check rate limiting status
    const isLimited = isRateLimited(ip)
    const remaining = getRemainingAttempts(ip)
    const status = getRateLimitStatus(ip)

    return NextResponse.json({
      success: true,
      data: {
        ip,
        isRateLimited: isLimited,
        remainingAttempts: remaining,
        status,
      },
    })
  } catch (error) {
    console.error('Rate limit check error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check rate limit',
      },
      { status: 500 }
    )
  }
}