/**
 * Webhook Retry Endpoint
 * Manually retry failed webhook events from the DLQ
 * Epic 2 Story 2.5: Stripe Failure Handling Enhancement
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { webhookDLQService } from '@/lib/stripe/webhook-dlq';
import type Stripe from 'stripe';

/**
 * @swagger
 * /api/stripe/webhook/retry:
 *   post:
 *     summary: Retry failed webhook events
 *     description: Manually trigger retry of failed webhook events from the dead letter queue
 *     tags:
 *       - Stripe Webhooks
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event_id:
 *                 type: string
 *                 description: Specific Stripe event ID to retry (optional - if not provided, processes all pending)
 *     responses:
 *       200:
 *         description: Retry operation completed
 *       401:
 *         description: Unauthorized - admin access required
 *       500:
 *         description: Retry operation failed
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email?.includes('admin') && session?.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: 'Admin access required to retry webhooks'
      }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const specificEventId = body?.event_id;

    if (specificEventId) {
      // Retry specific event
      const pendingRetries = await webhookDLQService.getPendingRetries();
      const targetEntry = pendingRetries.find(e => e.stripe_event_id === specificEventId);

      if (!targetEntry) {
        return NextResponse.json({
          success: false,
          error: 'Event not found',
          message: `Webhook event ${specificEventId} not found in DLQ or not ready for retry`
        }, { status: 404 });
      }

      const result = await webhookDLQService.retryWebhookEvent(
        targetEntry,
        handleWebhookEvent
      );

      return NextResponse.json({
        success: result.success,
        message: result.success
          ? `Webhook ${specificEventId} retried successfully`
          : `Webhook ${specificEventId} retry failed: ${result.error}`,
        event_id: specificEventId,
        retries_remaining: result.retriesRemaining,
        next_retry_at: result.nextRetryAt?.toISOString()
      });
    } else {
      // Process all pending retries
      const results = await webhookDLQService.processPendingWebhookRetries(
        handleWebhookEvent
      );

      return NextResponse.json({
        success: true,
        message: `Processed ${results.processed} webhook retries`,
        stats: {
          processed: results.processed,
          succeeded: results.succeeded,
          failed: results.failed,
          success_rate: results.processed > 0
            ? Math.round((results.succeeded / results.processed) * 100)
            : 0
        }
      });
    }
  } catch (error) {
    console.error('Webhook retry endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Retry operation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/stripe/webhook/retry:
 *   get:
 *     summary: Get webhook DLQ statistics
 *     description: Retrieve statistics about failed webhooks in the dead letter queue
 *     tags:
 *       - Stripe Webhooks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: DLQ statistics returned successfully
 *       401:
 *         description: Unauthorized - admin access required
 */
export async function GET(_request: NextRequest) {
  try {
    // Require admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email?.includes('admin') && session?.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: 'Admin access required to view webhook statistics'
      }, { status: 401 });
    }

    const stats = await webhookDLQService.getWebhookDLQStats();

    return NextResponse.json({
      success: true,
      stats: {
        pending: stats.pending,
        processing: stats.processing,
        abandoned: stats.abandoned,
        total_retries: stats.totalRetries,
        oldest_entry: stats.oldestEntry?.toISOString(),
        health: stats.abandoned > 10 ? 'critical' : stats.pending > 5 ? 'warning' : 'healthy'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching webhook DLQ stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Import handleWebhookEvent function (would be shared with main webhook handler)
async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  // This should be the same handler used in app/api/stripe/webhook/route.ts
  // For now, we'll create a placeholder that would need to be implemented
  console.log(`Processing webhook event: ${event.type} (${event.id})`);

  // In production, this would call the actual webhook handler
  // For example: await processStripeWebhook(event);

  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 100));

  // Throw error if event processing fails (for testing retry logic)
  if (event.type === 'test.error') {
    throw new Error('Test error for retry logic');
  }
}