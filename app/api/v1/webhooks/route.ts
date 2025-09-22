/**
 * Professional API v1: Webhook Management
 * GET /api/v1/webhooks - List user's webhooks
 * POST /api/v1/webhooks - Create new webhook
 * PUT /api/v1/webhooks/{id} - Update webhook
 * DELETE /api/v1/webhooks/{id} - Delete webhook
 * POST /api/v1/webhooks/{id}/test - Test webhook delivery
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth/next'
import { WebhookManager } from '@/lib/api/webhook-delivery'
import type { ApiResponse, WebhookEndpoint, CreateWebhookRequest, WebhookTestRequest } from '@/types/api'

// Validation schemas
const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(['data.updated', 'alert.triggered', 'export.completed', 'pattern.detected']))
})

const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(['data.updated', 'alert.triggered', 'export.completed', 'pattern.detected'])).optional(),
  is_active: z.boolean().optional()
})

const TestWebhookSchema = z.object({
  event_type: z.enum(['data.updated', 'alert.triggered', 'export.completed', 'pattern.detected']),
  test_payload: z.record(z.any()).optional()
})

/**
 * GET /api/v1/webhooks - List user's webhooks
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

    // Fetch user's webhooks
    const webhooks = await WebhookManager.getUserWebhooks(userId)

    const response: ApiResponse<{ webhooks: WebhookEndpoint[] }> = {
      success: true,
      data: {
        webhooks
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
    console.error('Get webhooks error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve webhooks'
      }
    }, { status: 500 })
  }
}

/**
 * POST /api/v1/webhooks - Create new webhook
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

    // Parse and validate request body
    const body = await request.json()
    const createRequest = CreateWebhookSchema.parse(body)

    // Create webhook
    const webhook = await WebhookManager.createWebhook(userId, createRequest)

    const response: ApiResponse<{ webhook: WebhookEndpoint }> = {
      success: true,
      data: {
        webhook
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

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Create webhook error:', error)

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
          code: 'CREATE_WEBHOOK_FAILED',
          message: error.message
        }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create webhook'
      }
    }, { status: 500 })
  }
}

/**
 * PUT /api/v1/webhooks/{id} - Update webhook
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
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
    const updateRequest = UpdateWebhookSchema.parse(body)

    // Update webhook
    const webhook = await WebhookManager.updateWebhook(userId, webhookId, updateRequest)

    const response: ApiResponse<{ webhook: WebhookEndpoint }> = {
      success: true,
      data: {
        webhook
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
    console.error('Update webhook error:', error)

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
          code: 'UPDATE_WEBHOOK_FAILED',
          message: error.message
        }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update webhook'
      }
    }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/webhooks/{id} - Delete webhook
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
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

    // Delete webhook
    await WebhookManager.deleteWebhook(userId, webhookId)

    const response: ApiResponse<{ deleted: boolean }> = {
      success: true,
      data: {
        deleted: true
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
    console.error('Delete webhook error:', error)

    if (error instanceof Error) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'DELETE_WEBHOOK_FAILED',
          message: error.message
        }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete webhook'
      }
    }, { status: 500 })
  }
}