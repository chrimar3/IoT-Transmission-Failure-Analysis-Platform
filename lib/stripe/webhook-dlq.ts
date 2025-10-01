/**
 * Webhook Dead Letter Queue (DLQ) Service
 * Handles failed webhook events with retry logic and monitoring
 * Epic 2 Story 2.5: Stripe Failure Handling Enhancement
 */

import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface WebhookDLQEntry {
  id: string;
  stripe_event_id: string;
  event_type: string;
  event_data: Stripe.Event;
  retry_count: number;
  max_retries: number;
  last_error: string;
  next_retry_at: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'abandoned';
}

export interface RetryResult {
  success: boolean;
  eventId: string;
  retriesRemaining: number;
  error?: string;
  nextRetryAt?: Date;
}

/**
 * Add failed webhook to DLQ with exponential backoff
 */
export async function addToWebhookDLQ(
  event: Stripe.Event,
  error: Error,
  retryCount: number = 0,
  maxRetries: number = 5
): Promise<void> {
  try {
    const nextRetryDelay = calculateExponentialBackoff(retryCount);
    const nextRetryAt = new Date(Date.now() + nextRetryDelay);

    await supabase.from('webhook_dlq').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      event_data: event,
      retry_count: retryCount,
      max_retries: maxRetries,
      last_error: error.message,
      next_retry_at: nextRetryAt.toISOString(),
      status: retryCount >= maxRetries ? 'abandoned' : 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    console.log(`Added webhook ${event.id} to DLQ. Retry ${retryCount}/${maxRetries}. Next retry: ${nextRetryAt.toISOString()}`);
  } catch (dlqError) {
    console.error('Failed to add webhook to DLQ:', dlqError);
    // Log to monitoring service (Sentry, CloudWatch, etc.)
    await logCriticalError('DLQ_INSERT_FAILURE', {
      eventId: event.id,
      originalError: error.message,
      dlqError: dlqError instanceof Error ? dlqError.message : 'Unknown error'
    });
  }
}

/**
 * Get pending webhooks ready for retry
 */
export async function getPendingRetries(): Promise<WebhookDLQEntry[]> {
  try {
    const { data, error } = await supabase
      .from('webhook_dlq')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .lt('retry_count', supabase.raw('max_retries'))
      .order('created_at', { ascending: true })
      .limit(10); // Process 10 at a time to avoid overwhelming the system

    if (error) {
      console.error('Error fetching pending retries:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPendingRetries:', error);
    return [];
  }
}

/**
 * Retry a failed webhook event
 */
export async function retryWebhookEvent(
  dlqEntry: WebhookDLQEntry,
  handleWebhookFn: (event: Stripe.Event) => Promise<void>
): Promise<RetryResult> {
  const eventId = dlqEntry.stripe_event_id;

  try {
    // Mark as processing
    await updateDLQStatus(dlqEntry.id, 'processing');

    // Attempt to process the webhook
    await handleWebhookFn(dlqEntry.event_data);

    // Mark as completed and remove from DLQ
    await updateDLQStatus(dlqEntry.id, 'completed');
    await removeFromDLQ(dlqEntry.id);

    console.log(`Successfully retried webhook ${eventId} after ${dlqEntry.retry_count + 1} attempts`);

    return {
      success: true,
      eventId,
      retriesRemaining: dlqEntry.max_retries - (dlqEntry.retry_count + 1)
    };
  } catch (error) {
    const newRetryCount = dlqEntry.retry_count + 1;
    const retriesRemaining = dlqEntry.max_retries - newRetryCount;

    console.error(`Webhook ${eventId} retry failed (attempt ${newRetryCount}):`, error);

    if (retriesRemaining > 0) {
      // Schedule next retry with exponential backoff
      const nextRetryDelay = calculateExponentialBackoff(newRetryCount);
      const nextRetryAt = new Date(Date.now() + nextRetryDelay);

      await supabase
        .from('webhook_dlq')
        .update({
          retry_count: newRetryCount,
          last_error: error instanceof Error ? error.message : 'Unknown error',
          next_retry_at: nextRetryAt.toISOString(),
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', dlqEntry.id);

      return {
        success: false,
        eventId,
        retriesRemaining,
        error: error instanceof Error ? error.message : 'Unknown error',
        nextRetryAt
      };
    } else {
      // Max retries exceeded - mark as abandoned
      await updateDLQStatus(dlqEntry.id, 'abandoned');

      // Alert operations team
      await alertOperationsTeam({
        eventId,
        eventType: dlqEntry.event_type,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalAttempts: newRetryCount
      });

      return {
        success: false,
        eventId,
        retriesRemaining: 0,
        error: 'Max retries exceeded'
      };
    }
  }
}

/**
 * Process all pending webhook retries
 */
export async function processPendingWebhookRetries(
  handleWebhookFn: (event: Stripe.Event) => Promise<void>
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const pendingRetries = await getPendingRetries();
  let succeeded = 0;
  let failed = 0;

  for (const entry of pendingRetries) {
    const result = await retryWebhookEvent(entry, handleWebhookFn);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }

    // Add small delay between retries to avoid overwhelming the system
    await sleep(500);
  }

  return {
    processed: pendingRetries.length,
    succeeded,
    failed
  };
}

/**
 * Get webhook DLQ statistics
 */
export async function getWebhookDLQStats(): Promise<{
  pending: number;
  processing: number;
  abandoned: number;
  totalRetries: number;
  oldestEntry?: Date;
}> {
  try {
    const { data, error } = await supabase
      .from('webhook_dlq')
      .select('status, created_at, retry_count');

    if (error) {
      console.error('Error fetching DLQ stats:', error);
      return { pending: 0, processing: 0, abandoned: 0, totalRetries: 0 };
    }

    const stats = {
      pending: 0,
      processing: 0,
      abandoned: 0,
      totalRetries: 0,
      oldestEntry: undefined as Date | undefined
    };

    for (const entry of data || []) {
      switch (entry.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'processing':
          stats.processing++;
          break;
        case 'abandoned':
          stats.abandoned++;
          break;
      }
      stats.totalRetries += entry.retry_count;

      const createdAt = new Date(entry.created_at);
      if (!stats.oldestEntry || createdAt < stats.oldestEntry) {
        stats.oldestEntry = createdAt;
      }
    }

    return stats;
  } catch (error) {
    console.error('Error calculating DLQ stats:', error);
    return { pending: 0, processing: 0, abandoned: 0, totalRetries: 0 };
  }
}

/**
 * Clean up old completed entries from DLQ
 */
export async function cleanupCompletedWebhooks(olderThanDays: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('webhook_dlq')
      .delete()
      .eq('status', 'completed')
      .lt('updated_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error('Error cleaning up DLQ:', error);
      return 0;
    }

    const deletedCount = data?.length || 0;
    console.log(`Cleaned up ${deletedCount} old webhook DLQ entries`);
    return deletedCount;
  } catch (error) {
    console.error('Error in cleanupCompletedWebhooks:', error);
    return 0;
  }
}

// Helper functions

function calculateExponentialBackoff(retryCount: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s (max 5 minutes)
  const baseDelay = 1000; // 1 second
  const maxDelay = 5 * 60 * 1000; // 5 minutes
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);

  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.floor(delay + jitter);
}

async function updateDLQStatus(id: string, status: WebhookDLQEntry['status']): Promise<void> {
  await supabase
    .from('webhook_dlq')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
}

async function removeFromDLQ(id: string): Promise<void> {
  await supabase
    .from('webhook_dlq')
    .delete()
    .eq('id', id);
}

async function logCriticalError(errorType: string, details: Record<string, unknown>): Promise<void> {
  console.error(`CRITICAL ERROR [${errorType}]:`, details);

  // In production, integrate with monitoring service (Sentry, CloudWatch, etc.)
  if (process.env.SENTRY_DSN) {
    // TODO: Sentry.captureException(new Error(errorType), { extra: details });
  }

  // Log to database for audit trail
  try {
    await supabase.from('system_errors').insert({
      error_type: errorType,
      error_details: details,
      severity: 'critical',
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log critical error to database:', error);
  }
}

async function alertOperationsTeam(details: {
  eventId: string;
  eventType: string;
  error: string;
  totalAttempts: number;
}): Promise<void> {
  console.error('OPERATIONS ALERT: Webhook permanently failed', details);

  // In production, integrate with alerting service (PagerDuty, Slack, email, etc.)
  // For now, log to database
  try {
    await supabase.from('operations_alerts').insert({
      alert_type: 'webhook_permanent_failure',
      details,
      severity: 'high',
      created_at: new Date().toISOString(),
      acknowledged: false
    });
  } catch (error) {
    console.error('Failed to create operations alert:', error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const webhookDLQService = {
  addToWebhookDLQ,
  getPendingRetries,
  retryWebhookEvent,
  processPendingWebhookRetries,
  getWebhookDLQStats,
  cleanupCompletedWebhooks
};