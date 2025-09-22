/**
 * Professional API v1: Webhook Testing
 * POST /api/v1/webhooks/{id}/test - Test webhook delivery
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth/next'
import { WebhookManager } from '@/lib/api/webhook-delivery'
import type { ApiResponse, WebhookTestRequest } from '@/types/api'

// Validation schema
const TestWebhookSchema = z.object({
  event_type: z.enum(['data.updated', 'alert.triggered', 'export.completed', 'pattern.detected']),
  test_payload: z.record(z.any()).optional()
})

/**
 * POST /api/v1/webhooks/{id}/test - Test webhook delivery
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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
    const url = new URL(request.url)
    const webhookId = url.searchParams.get('id')

    if (!webhookId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_WEBHOOK_ID',
          message: 'Webhook ID is required'
        }
      }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const testRequest = TestWebhookSchema.parse(body)

    // Test webhook delivery
    const testResult = await WebhookManager.testWebhook(userId, webhookId, testRequest)

    const response: ApiResponse<{
      test_result: {
        success: boolean
        response?: any
        error?: string
        delivered_at: string
      }
    }> = {
      success: true,
      data: {
        test_result: {
          success: testResult.success,
          response: testResult.response,
          error: testResult.error,
          delivered_at: new Date().toISOString()
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
    console.error('Test webhook error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request data',
          details: error.errors
        }
      }, { status: 400 })
    }

    if (error instanceof Error) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TEST_WEBHOOK_FAILED',
          message: error.message
        }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to test webhook'
      }
    }, { status: 500 })
  }
}