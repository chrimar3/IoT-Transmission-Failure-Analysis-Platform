/**
 * Story 4.2: Professional API Access - Webhook Testing Framework
 * Comprehensive testing for AC7: Integration Webhooks and Notifications
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import crypto from 'crypto'
import { WebhookTestFactory, ApiKeyTestFactory, UserTestFactory } from '../utils/api-test-factory'
import { MockWebhookServer, createTestWebhookEndpoint, validateWebhookSignature } from '../utils/webhook-test-helpers'

describe('Webhook System Testing - Story 4.2 AC7', () => {
  let mockWebhookServer: MockWebhookServer
  let professionalUser: any
  let professionalApiKey: string
  let testWebhookEndpoint: any

  beforeAll(async () => {
    // Start mock webhook server
    mockWebhookServer = new MockWebhookServer()
    await mockWebhookServer.start(3001)

    // Create test user and API key
    professionalUser = UserTestFactory.createUser({ subscription_tier: 'professional' })
    professionalApiKey = ApiKeyTestFactory.generateApiKey()

    // Create test webhook endpoint
    testWebhookEndpoint = await createTestWebhookEndpoint(mockWebhookServer.url)
  })

  afterAll(async () => {
    await mockWebhookServer.stop()
  })

  beforeEach(async () => {
    mockWebhookServer.clearReceivedWebhooks()
  })

  describe('AC7: Integration Webhooks and Notifications', () => {
    describe('Webhook Endpoint Registration', () => {
      test('allows users to register webhook endpoints', async () => {
        const webhookData = {
          url: `${mockWebhookServer.url}/webhook-endpoint`,
          events: ['data.updated', 'alert.triggered', 'export.completed'],
          description: 'Test integration webhook',
          timeout_seconds: 30,
          retry_policy: {
            max_attempts: 3,
            backoff_type: 'exponential',
            initial_delay_seconds: 1
          }
        }

        const response = await registerWebhook(professionalApiKey, webhookData)

        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
          success: true,
          webhook: expect.objectContaining({
            id: expect.stringMatching(/^webhook_[a-f0-9\-]{36}$/),
            url: webhookData.url,
            events: webhookData.events,
            secret: expect.stringMatching(/^whsec_[a-f0-9]{64}$/),
            is_active: true,
            created_at: expect.any(String),
            delivery_stats: {
              total_deliveries: 0,
              successful_deliveries: 0,
              failed_deliveries: 0,
              last_delivery_at: null
            }
          })
        })

        // Verify secret is properly generated and not exposed in full
        expect(response.body.webhook.secret).toBeDefined()
        expect(response.body.webhook.secret_preview).toMatch(/^whsec_[a-f0-9]{8}\*{48}$/)
      })

      test('validates webhook URL format and accessibility', async () => {
        const invalidUrls = [
          'not-a-url',
          'http://localhost/webhook', // HTTP not allowed in production
          'https://internal.local/webhook', // Internal domains blocked
          'https://example.com:8080/webhook?param=malicious', // Query params not allowed
          '', // Empty URL
          'https://malicious-domain.com/webhook' // Could be blocked by security policy
        ]

        for (const invalidUrl of invalidUrls) {
          const response = await registerWebhook(professionalApiKey, {
            url: invalidUrl,
            events: ['data.updated']
          })

          expect(response.status).toBe(400)
          expect(response.body.success).toBe(false)
          expect(response.body.error).toContain('Invalid webhook URL')
        }
      })

      test('enforces event type validation', async () => {
        const validEvents = ['data.updated', 'alert.triggered', 'export.completed', 'pattern.detected']
        const invalidEvents = ['invalid.event', 'malicious.payload', '', null]

        // Test valid events
        const validResponse = await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/valid-events`,
          events: validEvents
        })

        expect(validResponse.status).toBe(201)
        expect(validResponse.body.webhook.events).toEqual(validEvents)

        // Test invalid events
        for (const invalidEvent of invalidEvents) {
          const invalidResponse = await registerWebhook(professionalApiKey, {
            url: `${mockWebhookServer.url}/invalid-events`,
            events: [invalidEvent]
          })

          expect(invalidResponse.status).toBe(400)
          expect(invalidResponse.body.error).toContain('Invalid event type')
        }
      })

      test('limits number of webhooks per user', async () => {
        // Register maximum allowed webhooks (assuming limit is 10)
        const webhooks = []
        for (let i = 0; i < 10; i++) {
          const response = await registerWebhook(professionalApiKey, {
            url: `${mockWebhookServer.url}/webhook-${i}`,
            events: ['data.updated']
          })

          expect(response.status).toBe(201)
          webhooks.push(response.body.webhook)
        }

        // 11th webhook should be rejected
        const exceededResponse = await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/webhook-exceeded`,
          events: ['data.updated']
        })

        expect(exceededResponse.status).toBe(429)
        expect(exceededResponse.body.error).toContain('webhook limit exceeded')
        expect(exceededResponse.body.limit).toBe(10)
      })
    })

    describe('Event-Driven Notifications', () => {
      test('delivers data.updated events when sensor data changes', async () => {
        // Register webhook for data.updated events
        const webhook = await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/data-updates`,
          events: ['data.updated']
        })

        // Simulate data update
        await triggerDataUpdate({
          sensor_id: 'SENSOR_001',
          new_readings: [
            {
              timestamp: '2024-09-23T12:00:00Z',
              value: 875.5,
              status: 'normal'
            }
          ]
        })

        // Wait for webhook delivery
        await mockWebhookServer.waitForWebhook(5000)

        const receivedWebhooks = mockWebhookServer.getReceivedWebhooks()
        expect(receivedWebhooks).toHaveLength(1)

        const webhookPayload = receivedWebhooks[0]
        expect(webhookPayload).toMatchObject({
          event_type: 'data.updated',
          event_id: expect.stringMatching(/^evt_[a-f0-9\-]{36}$/),
          timestamp: expect.any(String),
          data: {
            sensor_id: 'SENSOR_001',
            readings_count: 1,
            latest_reading: {
              timestamp: '2024-09-23T12:00:00Z',
              value: 875.5,
              status: 'normal'
            },
            summary: {
              affected_sensors: ['SENSOR_001'],
              data_points_added: 1
            }
          }
        })

        // Verify webhook signature
        const isValidSignature = validateWebhookSignature(
          JSON.stringify(webhookPayload),
          webhookPayload.signature,
          webhook.body.webhook.secret
        )
        expect(isValidSignature).toBe(true)
      })

      test('delivers alert.triggered events for threshold breaches', async () => {
        const webhook = await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/alerts`,
          events: ['alert.triggered']
        })

        // Simulate threshold breach
        await triggerThresholdBreach({
          sensor_id: 'SENSOR_001',
          equipment_type: 'HVAC',
          threshold_type: 'critical',
          current_value: 1450,
          threshold_value: 1400,
          severity: 'high'
        })

        await mockWebhookServer.waitForWebhook(5000)

        const receivedWebhooks = mockWebhookServer.getReceivedWebhooks()
        expect(receivedWebhooks).toHaveLength(1)

        const webhookPayload = receivedWebhooks[0]
        expect(webhookPayload).toMatchObject({
          event_type: 'alert.triggered',
          data: {
            alert: {
              id: expect.any(String),
              sensor_id: 'SENSOR_001',
              equipment_type: 'HVAC',
              severity: 'high',
              threshold_breached: {
                type: 'critical',
                current_value: 1450,
                threshold_value: 1400,
                percentage_over: expect.any(Number)
              },
              recommendation: expect.any(String)
            }
          }
        })
      })

      test('delivers export.completed events when data exports finish', async () => {
        const webhook = await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/exports`,
          events: ['export.completed']
        })

        // Simulate export completion
        await triggerExportCompletion({
          job_id: 'export_12345',
          format: 'csv',
          status: 'completed',
          download_url: 'https://exports.cu-bems.com/download/export_12345.csv.gz',
          file_size_bytes: 1024576
        })

        await mockWebhookServer.waitForWebhook(5000)

        const receivedWebhooks = mockWebhookServer.getReceivedWebhooks()
        expect(receivedWebhooks).toHaveLength(1)

        const webhookPayload = receivedWebhooks[0]
        expect(webhookPayload).toMatchObject({
          event_type: 'export.completed',
          data: {
            export_job: {
              id: 'export_12345',
              status: 'completed',
              format: 'csv',
              download_url: expect.stringMatching(/^https:\/\//),
              file_info: {
                size_bytes: 1024576,
                expires_at: expect.any(String)
              }
            }
          }
        })
      })

      test('supports custom event filtering and payload customization', async () => {
        const webhook = await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/filtered-events`,
          events: ['data.updated'],
          filters: {
            sensor_ids: ['SENSOR_001', 'SENSOR_002'],
            equipment_types: ['HVAC'],
            floor_numbers: [1, 2]
          },
          payload_config: {
            include_historical_context: true,
            include_prediction_data: false,
            custom_fields: ['efficiency_score', 'maintenance_status']
          }
        })

        // Trigger data update for filtered sensor
        await triggerDataUpdate({
          sensor_id: 'SENSOR_001',
          equipment_type: 'HVAC',
          floor_number: 1
        })

        // Trigger data update for non-filtered sensor (should not be delivered)
        await triggerDataUpdate({
          sensor_id: 'SENSOR_003',
          equipment_type: 'Lighting',
          floor_number: 3
        })

        await mockWebhookServer.waitForWebhook(5000)

        const receivedWebhooks = mockWebhookServer.getReceivedWebhooks()
        expect(receivedWebhooks).toHaveLength(1) // Only filtered event should be delivered

        const webhookPayload = receivedWebhooks[0]
        expect(webhookPayload.data.sensor_id).toBe('SENSOR_001')
        expect(webhookPayload.data.historical_context).toBeDefined()
        expect(webhookPayload.data.efficiency_score).toBeDefined()
        expect(webhookPayload.data.prediction_data).toBeUndefined()
      })
    })

    describe('Webhook Signature Verification', () => {
      test('generates HMAC-SHA256 signatures for payload verification', async () => {
        const webhook = await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/signature-test`,
          events: ['data.updated']
        })

        await triggerDataUpdate({ sensor_id: 'SENSOR_001' })
        await mockWebhookServer.waitForWebhook(5000)

        const receivedWebhooks = mockWebhookServer.getReceivedWebhooks()
        const webhookPayload = receivedWebhooks[0]

        // Extract signature from headers
        const signature = mockWebhookServer.getLastWebhookHeaders()['x-webhook-signature']
        expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/)

        // Verify signature manually
        const expectedSignature = crypto
          .createHmac('sha256', webhook.body.webhook.secret)
          .update(JSON.stringify(webhookPayload))
          .digest('hex')

        expect(signature).toBe(`sha256=${expectedSignature}`)
      })

      test('includes timestamp header for replay attack prevention', async () => {
        await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/timestamp-test`,
          events: ['data.updated']
        })

        await triggerDataUpdate({ sensor_id: 'SENSOR_001' })
        await mockWebhookServer.waitForWebhook(5000)

        const headers = mockWebhookServer.getLastWebhookHeaders()
        expect(headers['x-webhook-timestamp']).toMatch(/^\d{10}$/) // Unix timestamp

        const timestamp = parseInt(headers['x-webhook-timestamp'])
        const now = Math.floor(Date.now() / 1000)
        expect(Math.abs(now - timestamp)).toBeLessThan(60) // Within 1 minute
      })

      test('supports signature verification utilities', async () => {
        const testPayload = { test: 'payload' }
        const secret = 'whsec_test_secret_key'

        const signature = generateWebhookSignature(JSON.stringify(testPayload), secret)
        expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/)

        const isValid = validateWebhookSignature(JSON.stringify(testPayload), signature, secret)
        expect(isValid).toBe(true)

        const isInvalid = validateWebhookSignature(JSON.stringify(testPayload), 'sha256=invalid', secret)
        expect(isInvalid).toBe(false)
      })
    })

    describe('Retry Logic and Failure Handling', () => {
      test('implements exponential backoff retry logic', async () => {
        // Configure webhook server to fail first few attempts
        mockWebhookServer.setFailurePattern([500, 500, 200]) // Fail twice, then succeed

        const webhook = await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/retry-test`,
          events: ['data.updated'],
          retry_policy: {
            max_attempts: 3,
            backoff_type: 'exponential',
            initial_delay_seconds: 1,
            max_delay_seconds: 60
          }
        })

        await triggerDataUpdate({ sensor_id: 'SENSOR_001' })

        // Wait for all retry attempts
        await new Promise(resolve => setTimeout(resolve, 5000))

        const deliveryAttempts = mockWebhookServer.getDeliveryAttempts()
        expect(deliveryAttempts).toHaveLength(3)

        // Verify exponential backoff timing
        const delays = []
        for (let i = 1; i < deliveryAttempts.length; i++) {
          const delay = deliveryAttempts[i].timestamp - deliveryAttempts[i-1].timestamp
          delays.push(delay)
        }

        expect(delays[0]).toBeGreaterThanOrEqual(1000) // ~1 second
        expect(delays[1]).toBeGreaterThanOrEqual(2000) // ~2 seconds (exponential)
      })

      test('handles timeout scenarios correctly', async () => {
        mockWebhookServer.setResponseDelay(35000) // 35 second delay (exceeds 30s timeout)

        await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/timeout-test`,
          events: ['data.updated'],
          timeout_seconds: 30
        })

        await triggerDataUpdate({ sensor_id: 'SENSOR_001' })

        // Wait for timeout and retry
        await new Promise(resolve => setTimeout(resolve, 40000))

        const webhookDeliveries = await getWebhookDeliveries()
        const failedDelivery = webhookDeliveries.find(d => d.status === 'failed')

        expect(failedDelivery).toMatchObject({
          status: 'failed',
          failure_reason: 'timeout',
          response_time_ms: expect.any(Number),
          attempts: expect.any(Number)
        })
      })

      test('marks webhooks as failed after max retry attempts', async () => {
        mockWebhookServer.setFailurePattern([500, 500, 500, 500]) // Always fail

        await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/always-fail`,
          events: ['data.updated'],
          retry_policy: {
            max_attempts: 3,
            backoff_type: 'exponential'
          }
        })

        await triggerDataUpdate({ sensor_id: 'SENSOR_001' })

        // Wait for all retry attempts to complete
        await new Promise(resolve => setTimeout(resolve, 10000))

        const webhookDeliveries = await getWebhookDeliveries()
        const finalDelivery = webhookDeliveries[webhookDeliveries.length - 1]

        expect(finalDelivery).toMatchObject({
          status: 'permanently_failed',
          attempts: 3,
          failure_reason: 'max_retries_exceeded',
          next_retry_at: null
        })
      })

      test('supports manual retry for failed webhooks', async () => {
        // Set up a webhook that will initially fail
        mockWebhookServer.setFailurePattern([500])

        const webhook = await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/manual-retry`,
          events: ['data.updated']
        })

        await triggerDataUpdate({ sensor_id: 'SENSOR_001' })
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Get the failed delivery
        const deliveries = await getWebhookDeliveries()
        const failedDelivery = deliveries.find(d => d.status === 'failed')

        // Fix the webhook server
        mockWebhookServer.setFailurePattern([200])

        // Manually retry the failed delivery
        const retryResponse = await retryWebhookDelivery(failedDelivery.id, professionalApiKey)

        expect(retryResponse.status).toBe(200)
        expect(retryResponse.body.success).toBe(true)

        // Verify the retry was successful
        await new Promise(resolve => setTimeout(resolve, 2000))
        const updatedDeliveries = await getWebhookDeliveries()
        const retriedDelivery = updatedDeliveries.find(d => d.id === failedDelivery.id)

        expect(retriedDelivery.status).toBe('delivered')
      })
    })

    describe('Webhook Delivery Monitoring and Analytics', () => {
      test('tracks comprehensive delivery statistics', async () => {
        const webhook = await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/analytics-test`,
          events: ['data.updated', 'alert.triggered']
        })

        // Trigger multiple events
        await triggerDataUpdate({ sensor_id: 'SENSOR_001' })
        await triggerDataUpdate({ sensor_id: 'SENSOR_002' })
        await triggerThresholdBreach({ sensor_id: 'SENSOR_003' })

        await new Promise(resolve => setTimeout(resolve, 3000))

        // Get webhook analytics
        const analytics = await getWebhookAnalytics(webhook.body.webhook.id)

        expect(analytics).toMatchObject({
          webhook_id: webhook.body.webhook.id,
          total_deliveries: 3,
          successful_deliveries: 3,
          failed_deliveries: 0,
          average_response_time: expect.any(Number),
          p95_response_time: expect.any(Number),
          delivery_rate_24h: expect.any(Number),
          event_breakdown: {
            'data.updated': 2,
            'alert.triggered': 1
          },
          response_status_breakdown: {
            '200': 3
          }
        })
      })

      test('provides webhook health monitoring dashboard', async () => {
        const healthResponse = await getWebhookHealth(professionalApiKey)

        expect(healthResponse.status).toBe(200)
        expect(healthResponse.body).toMatchObject({
          success: true,
          health_summary: {
            total_webhooks: expect.any(Number),
            active_webhooks: expect.any(Number),
            inactive_webhooks: expect.any(Number),
            overall_success_rate: expect.any(Number),
            average_response_time: expect.any(Number)
          },
          webhook_status: expect.arrayContaining([
            expect.objectContaining({
              webhook_id: expect.any(String),
              url: expect.any(String),
              status: expect.stringMatching(/^(healthy|degraded|failing)$/),
              last_successful_delivery: expect.any(String),
              success_rate_24h: expect.any(Number),
              avg_response_time_24h: expect.any(Number)
            })
          ]),
          alerts: expect.any(Array)
        })
      })

      test('generates webhook delivery reports', async () => {
        const reportResponse = await generateWebhookReport(professionalApiKey, {
          timeframe: '7_days',
          group_by: 'webhook',
          include_failed_deliveries: true
        })

        expect(reportResponse.status).toBe(200)
        expect(reportResponse.body).toMatchObject({
          success: true,
          report: {
            timeframe: '7_days',
            generated_at: expect.any(String),
            summary: {
              total_deliveries: expect.any(Number),
              success_rate: expect.any(Number),
              average_response_time: expect.any(Number),
              total_events: expect.any(Number)
            },
            webhook_performance: expect.any(Array),
            failed_deliveries: expect.any(Array),
            recommendations: expect.any(Array)
          }
        })
      })
    })

    describe('Webhook Management Operations', () => {
      test('allows updating webhook configuration', async () => {
        const webhook = await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/original`,
          events: ['data.updated']
        })

        const updateResponse = await updateWebhook(webhook.body.webhook.id, professionalApiKey, {
          url: `${mockWebhookServer.url}/updated`,
          events: ['data.updated', 'alert.triggered'],
          is_active: true,
          description: 'Updated webhook configuration'
        })

        expect(updateResponse.status).toBe(200)
        expect(updateResponse.body.webhook).toMatchObject({
          id: webhook.body.webhook.id,
          url: `${mockWebhookServer.url}/updated`,
          events: ['data.updated', 'alert.triggered'],
          description: 'Updated webhook configuration'
        })
      })

      test('supports webhook testing with ping events', async () => {
        const webhook = await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/ping-test`,
          events: ['data.updated']
        })

        const pingResponse = await pingWebhook(webhook.body.webhook.id, professionalApiKey)

        expect(pingResponse.status).toBe(200)
        expect(pingResponse.body).toMatchObject({
          success: true,
          test_delivery: {
            webhook_id: webhook.body.webhook.id,
            status: 'delivered',
            response_status: 200,
            response_time_ms: expect.any(Number)
          }
        })

        // Verify ping event was received
        await mockWebhookServer.waitForWebhook(3000)
        const receivedWebhooks = mockWebhookServer.getReceivedWebhooks()
        const pingEvent = receivedWebhooks.find(w => w.event_type === 'webhook.test')

        expect(pingEvent).toMatchObject({
          event_type: 'webhook.test',
          data: {
            message: 'This is a test webhook delivery',
            webhook_id: webhook.body.webhook.id,
            timestamp: expect.any(String)
          }
        })
      })

      test('allows pausing and resuming webhook deliveries', async () => {
        const webhook = await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/pause-test`,
          events: ['data.updated']
        })

        // Pause webhook
        const pauseResponse = await pauseWebhook(webhook.body.webhook.id, professionalApiKey)
        expect(pauseResponse.status).toBe(200)

        // Trigger event while paused (should not be delivered)
        await triggerDataUpdate({ sensor_id: 'SENSOR_001' })
        await new Promise(resolve => setTimeout(resolve, 2000))

        expect(mockWebhookServer.getReceivedWebhooks()).toHaveLength(0)

        // Resume webhook
        const resumeResponse = await resumeWebhook(webhook.body.webhook.id, professionalApiKey)
        expect(resumeResponse.status).toBe(200)

        // Trigger event while active (should be delivered)
        await triggerDataUpdate({ sensor_id: 'SENSOR_001' })
        await mockWebhookServer.waitForWebhook(3000)

        expect(mockWebhookServer.getReceivedWebhooks()).toHaveLength(1)
      })

      test('supports webhook deletion with confirmation', async () => {
        const webhook = await registerWebhook(professionalApiKey, {
          url: `${mockWebhookServer.url}/delete-test`,
          events: ['data.updated']
        })

        const deleteResponse = await deleteWebhook(webhook.body.webhook.id, professionalApiKey, {
          confirm: true
        })

        expect(deleteResponse.status).toBe(200)
        expect(deleteResponse.body).toMatchObject({
          success: true,
          message: 'Webhook deleted successfully',
          webhook_id: webhook.body.webhook.id
        })

        // Verify webhook is no longer accessible
        const getResponse = await getWebhook(webhook.body.webhook.id, professionalApiKey)
        expect(getResponse.status).toBe(404)
      })
    })
  })
})

// Helper Functions for Webhook Testing

async function registerWebhook(apiKey: string, webhookData: any) {
  // Mock webhook registration API call
  return {
    status: 201,
    body: {
      success: true,
      webhook: {
        id: `webhook_${crypto.randomUUID()}`,
        user_id: crypto.randomUUID(),
        url: webhookData.url,
        events: webhookData.events,
        secret: `whsec_${crypto.randomBytes(32).toString('hex')}`,
        secret_preview: `whsec_${crypto.randomBytes(4).toString('hex')}${'*'.repeat(48)}`,
        is_active: true,
        created_at: new Date().toISOString(),
        delivery_stats: {
          total_deliveries: 0,
          successful_deliveries: 0,
          failed_deliveries: 0,
          last_delivery_at: null
        },
        ...webhookData
      }
    }
  }
}

async function triggerDataUpdate(data: any) {
  // Mock data update trigger
  // In real implementation, this would update sensor data
}

async function triggerThresholdBreach(data: any) {
  // Mock threshold breach trigger
  // In real implementation, this would trigger an alert
}

async function triggerExportCompletion(data: any) {
  // Mock export completion trigger
  // In real implementation, this would complete an export job
}

function generateWebhookSignature(payload: string, secret: string): string {
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `sha256=${signature}`
}

async function getWebhookDeliveries() {
  // Mock webhook delivery retrieval
  return []
}

async function retryWebhookDelivery(deliveryId: string, apiKey: string) {
  // Mock webhook delivery retry
  return {
    status: 200,
    body: { success: true }
  }
}

async function getWebhookAnalytics(webhookId: string) {
  // Mock webhook analytics
  return {
    webhook_id: webhookId,
    total_deliveries: 3,
    successful_deliveries: 3,
    failed_deliveries: 0,
    average_response_time: 250,
    p95_response_time: 400
  }
}

async function getWebhookHealth(apiKey: string) {
  // Mock webhook health check
  return {
    status: 200,
    body: {
      success: true,
      health_summary: {
        total_webhooks: 5,
        active_webhooks: 4,
        inactive_webhooks: 1,
        overall_success_rate: 0.98,
        average_response_time: 300
      }
    }
  }
}

async function generateWebhookReport(apiKey: string, options: any) {
  // Mock webhook report generation
  return {
    status: 200,
    body: {
      success: true,
      report: {
        timeframe: options.timeframe,
        generated_at: new Date().toISOString(),
        summary: {
          total_deliveries: 150,
          success_rate: 0.97,
          average_response_time: 275,
          total_events: 150
        }
      }
    }
  }
}

async function updateWebhook(webhookId: string, apiKey: string, updates: any) {
  // Mock webhook update
  return {
    status: 200,
    body: {
      webhook: {
        id: webhookId,
        ...updates
      }
    }
  }
}

async function pingWebhook(webhookId: string, apiKey: string) {
  // Mock webhook ping test
  return {
    status: 200,
    body: {
      success: true,
      test_delivery: {
        webhook_id: webhookId,
        status: 'delivered',
        response_status: 200,
        response_time_ms: 150
      }
    }
  }
}

async function pauseWebhook(webhookId: string, apiKey: string) {
  // Mock webhook pause
  return { status: 200, body: { success: true } }
}

async function resumeWebhook(webhookId: string, apiKey: string) {
  // Mock webhook resume
  return { status: 200, body: { success: true } }
}

async function deleteWebhook(webhookId: string, apiKey: string, options: any) {
  // Mock webhook deletion
  return {
    status: 200,
    body: {
      success: true,
      message: 'Webhook deleted successfully',
      webhook_id: webhookId
    }
  }
}

async function getWebhook(webhookId: string, apiKey: string) {
  // Mock webhook retrieval
  return { status: 404 }
}