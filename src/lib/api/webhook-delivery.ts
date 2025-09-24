/**
 * Webhook Delivery System
 * Handles webhook endpoint management and event delivery with retry logic
 */

import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'
import type {
  WebhookEndpoint,
  _WebhookDelivery,
  CreateWebhookRequest,
  WebhookEvent,
  WebhookTestRequest
} from '@/types/api'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: Record<string, unknown>
  source: string
}

export class WebhookManager {
  private static readonly MAX_RETRY_ATTEMPTS = 3
  private static readonly RETRY_DELAYS = [30, 300, 1800] // 30s, 5m, 30m in seconds

  /**
   * Create a new webhook endpoint
   */
  static async createWebhook(
    _userId: string,
    request: CreateWebhookRequest
  ): Promise<WebhookEndpoint> {
    try {
      // Validate user has Professional subscription
      const hasAccess = await this.validateWebhookAccess(_userId)
      if (!hasAccess) {
        throw new Error('Webhook creation requires Professional subscription')
      }

      // Check webhook limit
      const webhookCount = await this.getUserWebhookCount(_userId)
      const maxWebhooks = await this.getMaxWebhooksForUser(_userId)

      if (webhookCount >= maxWebhooks) {
        throw new Error(`Maximum webhook endpoints limit reached (${maxWebhooks})`)
      }

      // Validate webhook URL
      await this.validateWebhookUrl(request.url)

      // Generate webhook secret
      const secret = this.generateWebhookSecret()

      // Insert webhook endpoint
      const { data: webhook, error } = await supabase
        .from('webhook_endpoints')
        .insert({
          user_id: _userId,
          url: request.url,
          events: request.events,
          secret,
          is_active: true,
          delivery_stats: {
            total_deliveries: 0,
            successful_deliveries: 0,
            failed_deliveries: 0
          }
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create webhook:', error)
        throw new Error('Failed to create webhook endpoint')
      }

      // Log webhook creation
      await this.logWebhookEvent(_userId, 'webhook_created', {
        webhook_id: webhook.id,
        url: request.url,
        events: request.events
      })

      return webhook as WebhookEndpoint

    } catch (error) {
      console.error('Webhook creation error:', error)
      throw error
    }
  }

  /**
   * Get user's webhook endpoints
   */
  static async getUserWebhooks(_userId: string): Promise<WebhookEndpoint[]> {
    try {
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('user_id', _userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch webhooks:', error)
        throw new Error('Failed to fetch webhook endpoints')
      }

      return data as WebhookEndpoint[]

    } catch (error) {
      console.error('Get user webhooks error:', error)
      throw error
    }
  }

  /**
   * Update webhook endpoint
   */
  static async updateWebhook(
    _userId: string,
    webhookId: string,
    updates: Partial<Pick<WebhookEndpoint, 'url' | 'events' | 'is_active'>>
  ): Promise<WebhookEndpoint> {
    try {
      // Validate user owns the webhook
      const existingWebhook = await this.getWebhookById(webhookId)
      if (!existingWebhook || existingWebhook.user_id !== _userId) {
        throw new Error('Webhook endpoint not found or access denied')
      }

      // Validate URL if being updated
      if (updates.url) {
        await this.validateWebhookUrl(updates.url)
      }

      const { data, error } = await supabase
        .from('webhook_endpoints')
        .update(updates)
        .eq('id', webhookId)
        .eq('user_id', _userId)
        .select()
        .single()

      if (error) {
        console.error('Failed to update webhook:', error)
        throw new Error('Failed to update webhook endpoint')
      }

      // Log update event
      await this.logWebhookEvent(_userId, 'webhook_updated', {
        webhook_id: webhookId,
        updates
      })

      return data as WebhookEndpoint

    } catch (error) {
      console.error('Webhook update error:', error)
      throw error
    }
  }

  /**
   * Delete webhook endpoint
   */
  static async deleteWebhook(_userId: string, webhookId: string): Promise<void> {
    try {
      // Validate user owns the webhook
      const existingWebhook = await this.getWebhookById(webhookId)
      if (!existingWebhook || existingWebhook.user_id !== _userId) {
        throw new Error('Webhook endpoint not found or access denied')
      }

      const { error } = await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', webhookId)
        .eq('user_id', _userId)

      if (error) {
        console.error('Failed to delete webhook:', error)
        throw new Error('Failed to delete webhook endpoint')
      }

      // Log deletion event
      await this.logWebhookEvent(_userId, 'webhook_deleted', {
        webhook_id: webhookId,
        url: existingWebhook.url
      })

    } catch (error) {
      console.error('Webhook deletion error:', error)
      throw error
    }
  }

  /**
   * Test webhook delivery
   */
  static async testWebhook(
    _userId: string,
    webhookId: string,
    testRequest: WebhookTestRequest
  ): Promise<{ success: boolean; response?: unknown; error?: string }> {
    try {
      // Get webhook endpoint
      const webhook = await this.getWebhookById(webhookId)
      if (!webhook || webhook.user_id !== _userId) {
        throw new Error('Webhook endpoint not found or access denied')
      }

      // Generate test payload
      const testPayload: WebhookPayload = {
        event: testRequest.event_type,
        timestamp: new Date().toISOString(),
        data: testRequest.test_payload || {
          test: true,
          message: 'This is a test webhook delivery',
          timestamp: new Date().toISOString()
        },
        source: 'webhook_test'
      }

      // Deliver webhook
      const deliveryResult = await this.deliverWebhook(webhook, testPayload)

      return {
        success: deliveryResult.success,
        response: deliveryResult.response,
        error: deliveryResult.error
      }

    } catch (error) {
      console.error('Webhook test error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Deliver webhook to endpoint
   */
  static async deliverWebhook(
    webhook: WebhookEndpoint,
    payload: WebhookPayload
  ): Promise<{ success: boolean; response?: unknown; error?: string }> {
    try {
      // Generate signature
      const signature = this.generateSignature(payload, webhook.secret)

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'CU-BEMS-Webhooks/1.0',
        'X-CU-BEMS-Event': payload.event,
        'X-CU-BEMS-Delivery': crypto.randomUUID(),
        'X-CU-BEMS-Signature': signature,
        'X-CU-BEMS-Timestamp': payload.timestamp
      }

      // Make HTTP request
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      const responseText = await response.text()
      const success = response.ok

      // Record delivery attempt
      await this.recordDeliveryAttempt(webhook.id, payload, response.status, responseText, success)

      return {
        success,
        response: {
          status: response.status,
          body: responseText,
          headers: Object.fromEntries(response.headers.entries())
        }
      }

    } catch (error) {
      console.error('Webhook delivery error:', error)

      // Record failed delivery attempt
      await this.recordDeliveryAttempt(webhook.id, payload, 0, error instanceof Error ? error.message : 'Unknown error', false)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Trigger webhook for event
   */
  static async triggerWebhookEvent(
    event: WebhookEvent,
    eventData: Record<string, unknown>,
    _userId?: string
  ): Promise<void> {
    try {
      // Get all active webhooks for this event
      let query = supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('is_active', true)
        .contains('events', [event])

      if (_userId) {
        query = query.eq('user_id', _userId)
      }

      const { data: webhooks, error } = await query

      if (error) {
        console.error('Failed to fetch webhooks for event:', error)
        return
      }

      if (!webhooks || webhooks.length === 0) {
        return // No webhooks to trigger
      }

      // Prepare payload
      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data: eventData,
        source: 'cu_bems_platform'
      }

      // Deliver to all matching webhooks
      const deliveryPromises = webhooks.map(webhook =>
        this.deliverWebhookWithRetry(webhook as WebhookEndpoint, payload)
      )

      await Promise.allSettled(deliveryPromises)

    } catch (error) {
      console.error('Webhook event trigger error:', error)
    }
  }

  /**
   * Deliver webhook with retry logic
   */
  private static async deliverWebhookWithRetry(
    webhook: WebhookEndpoint,
    payload: WebhookPayload,
    attempt: number = 1
  ): Promise<void> {
    try {
      const result = await this.deliverWebhook(webhook, payload)

      if (!result.success && attempt < this.MAX_RETRY_ATTEMPTS) {
        // Schedule retry
        const retryDelay = this.RETRY_DELAYS[attempt - 1] * 1000 // Convert to milliseconds
        const nextRetryAt = new Date(Date.now() + retryDelay)

        // In a production system, you'd use a job queue like Bull or similar
        // For now, we'll use setTimeout for simple retries
        setTimeout(() => {
          this.deliverWebhookWithRetry(webhook, payload, attempt + 1)
        }, retryDelay)

        // Update delivery record with retry schedule
        await this.updateDeliveryRetry(webhook.id, payload, nextRetryAt, attempt + 1)
      }

    } catch (error) {
      console.error('Webhook delivery with retry error:', error)
    }
  }

  /**
   * Generate webhook secret
   */
  private static generateWebhookSecret(): string {
    return crypto.randomUUID().replace(/-/g, '') // 32-character hex string
  }

  /**
   * Generate webhook signature
   */
  private static generateSignature(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload)
    const signature = createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex')

    return `sha256=${signature}`
  }

  /**
   * Validate webhook URL
   */
  private static async validateWebhookUrl(url: string): Promise<void> {
    try {
      const parsedUrl = new URL(url)

      // Only allow HTTPS in production
      if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
        throw new Error('Webhook URLs must use HTTPS in production')
      }

      // Prevent localhost and private IPs in production
      if (process.env.NODE_ENV === 'production') {
        const hostname = parsedUrl.hostname
        if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
          throw new Error('Private IP addresses and localhost are not allowed in production')
        }
      }

    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Invalid webhook URL format')
      }
      throw error
    }
  }

  /**
   * Validate user has webhook access (Professional tier)
   */
  private static async validateWebhookAccess(_userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('tier, status')
        .eq('user_id', _userId)
        .eq('status', 'active')
        .single()

      if (error || !data) {
        return false
      }

      return data.tier === 'professional'

    } catch (error) {
      console.error('Webhook access validation error:', error)
      return false
    }
  }

  /**
   * Get user's current webhook count
   */
  private static async getUserWebhookCount(_userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('webhook_endpoints')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', _userId)
      .eq('is_active', true)

    if (error) {
      console.error('Failed to count webhooks:', error)
      return 0
    }

    return count || 0
  }

  /**
   * Get maximum webhooks allowed for user
   */
  private static async getMaxWebhooksForUser(_userId: string): Promise<number> {
    // For Professional tier users
    return 10
  }

  /**
   * Get webhook by ID
   */
  private static async getWebhookById(webhookId: string): Promise<WebhookEndpoint | null> {
    try {
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('id', webhookId)
        .single()

      if (error || !data) {
        return null
      }

      return data as WebhookEndpoint

    } catch (error) {
      console.error('Get webhook by ID error:', error)
      return null
    }
  }

  /**
   * Record webhook delivery attempt
   */
  private static async recordDeliveryAttempt(
    webhookId: string,
    payload: WebhookPayload,
    responseStatus: number,
    responseBody: string,
    success: boolean
  ): Promise<void> {
    try {
      await supabase
        .from('webhook_deliveries')
        .insert({
          webhook_endpoint_id: webhookId,
          event_type: payload.event,
          payload: payload.data,
          response_status: responseStatus,
          response_body: responseBody.substring(0, 1000), // Limit response body size
          delivery_attempts: 1,
          delivered_at: success ? new Date().toISOString() : null,
          failed_at: success ? null : new Date().toISOString()
        })

    } catch (error) {
      console.error('Failed to record delivery attempt:', error)
    }
  }

  /**
   * Update delivery record with retry information
   */
  private static async updateDeliveryRetry(
    webhookId: string,
    payload: WebhookPayload,
    nextRetryAt: Date,
    attemptNumber: number
  ): Promise<void> {
    try {
      // Find the most recent delivery record for this webhook and event
      const { data, error } = await supabase
        .from('webhook_deliveries')
        .select('id')
        .eq('webhook_endpoint_id', webhookId)
        .eq('event_type', payload.event)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        return
      }

      await supabase
        .from('webhook_deliveries')
        .update({
          delivery_attempts: attemptNumber,
          next_retry_at: nextRetryAt.toISOString()
        })
        .eq('id', data.id)

    } catch (error) {
      console.error('Failed to update delivery retry:', error)
    }
  }

  /**
   * Log webhook management events
   */
  private static async logWebhookEvent(
    _userId: string,
    eventType: string,
    eventData: Record<string, unknown>
  ): Promise<void> {
    try {
      await supabase
        .from('user_activity')
        .insert({
          user_id: _userId,
          action_type: eventType,
          resource_accessed: 'webhook_management',
          timestamp: new Date().toISOString()
        })

      console.log(`Webhook event logged: ${eventType}`, { _userId, eventData })

    } catch (error) {
      console.error('Failed to log webhook event:', error)
    }
  }
}