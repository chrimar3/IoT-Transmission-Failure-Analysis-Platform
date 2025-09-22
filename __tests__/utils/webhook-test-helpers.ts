/**
 * Webhook Testing Utilities
 * Helper functions and mock servers for webhook testing
 */

import express from 'express'
import { Server } from 'http'
import crypto from 'crypto'

export class MockWebhookServer {
  private app: express.Application
  private server?: Server
  private receivedWebhooks: any[] = []
  private deliveryAttempts: any[] = []
  private responseDelay: number = 0
  private failurePattern: number[] = []
  private currentFailureIndex: number = 0
  public url: string = ''

  constructor() {
    this.app = express()
    this.app.use(express.json())
    this.setupRoutes()
  }

  private setupRoutes() {
    // Generic webhook endpoint
    this.app.post('*', (req, res) => {
      const timestamp = Date.now()

      // Record delivery attempt
      this.deliveryAttempts.push({
        timestamp,
        path: req.path,
        headers: req.headers,
        body: req.body
      })

      // Apply response delay if configured
      const delay = this.responseDelay

      setTimeout(() => {
        // Check if we should fail this request
        const shouldFail = this.shouldFailRequest()

        if (shouldFail) {
          const statusCode = this.failurePattern[this.currentFailureIndex] || 500
          this.currentFailureIndex = (this.currentFailureIndex + 1) % this.failurePattern.length
          res.status(statusCode).json({ error: 'Simulated failure' })
          return
        }

        // Record successful webhook receipt
        this.receivedWebhooks.push({
          ...req.body,
          _metadata: {
            receivedAt: new Date().toISOString(),
            headers: req.headers,
            path: req.path
          }
        })

        res.status(200).json({ received: true })
      }, delay)
    })

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok' })
    })
  }

  private shouldFailRequest(): boolean {
    if (this.failurePattern.length === 0) return false

    const statusCode = this.failurePattern[this.currentFailureIndex]
    const shouldFail = statusCode >= 400

    if (shouldFail) {
      this.currentFailureIndex = (this.currentFailureIndex + 1) % this.failurePattern.length
    }

    return shouldFail
  }

  async start(port: number = 3001): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, (err?: Error) => {
        if (err) {
          reject(err)
        } else {
          this.url = `http://localhost:${port}`
          console.log(`Mock webhook server started on port ${port}`)
          resolve()
        }
      })
    })
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Mock webhook server stopped')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  getReceivedWebhooks(): any[] {
    return this.receivedWebhooks
  }

  getDeliveryAttempts(): any[] {
    return this.deliveryAttempts
  }

  getLastWebhookHeaders(): any {
    const lastAttempt = this.deliveryAttempts[this.deliveryAttempts.length - 1]
    return lastAttempt ? lastAttempt.headers : {}
  }

  clearReceivedWebhooks(): void {
    this.receivedWebhooks = []
    this.deliveryAttempts = []
  }

  setResponseDelay(delayMs: number): void {
    this.responseDelay = delayMs
  }

  setFailurePattern(statusCodes: number[]): void {
    this.failurePattern = statusCodes
    this.currentFailureIndex = 0
  }

  async waitForWebhook(timeoutMs: number = 5000): Promise<any> {
    const startTime = Date.now()
    const initialCount = this.receivedWebhooks.length

    return new Promise((resolve, reject) => {
      const checkForWebhook = () => {
        if (this.receivedWebhooks.length > initialCount) {
          resolve(this.receivedWebhooks[this.receivedWebhooks.length - 1])
        } else if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Timeout waiting for webhook'))
        } else {
          setTimeout(checkForWebhook, 100)
        }
      }
      checkForWebhook()
    })
  }
}

export function validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    // Remove 'sha256=' prefix if present
    const cleanSignature = signature.replace('sha256=', '')

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // Compare signatures using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    return false
  }
}

export function generateWebhookSignature(payload: string, secret: string): string {
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `sha256=${signature}`
}

export async function createTestWebhookEndpoint(baseUrl: string, path: string = '/webhook'): Promise<any> {
  return {
    url: `${baseUrl}${path}`,
    events: ['data.updated', 'alert.triggered'],
    secret: crypto.randomBytes(32).toString('hex'),
    created_at: new Date().toISOString()
  }
}

export class WebhookEventSimulator {
  private static eventId = 0

  static createDataUpdateEvent(data: any): any {
    return {
      event_type: 'data.updated',
      event_id: `evt_${++this.eventId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      data: {
        sensor_id: data.sensor_id,
        readings_count: data.new_readings?.length || 1,
        latest_reading: data.new_readings?.[0] || {
          timestamp: new Date().toISOString(),
          value: Math.random() * 1000,
          status: 'normal'
        },
        summary: {
          affected_sensors: [data.sensor_id],
          data_points_added: data.new_readings?.length || 1
        }
      }
    }
  }

  static createAlertEvent(data: any): any {
    return {
      event_type: 'alert.triggered',
      event_id: `evt_${++this.eventId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      data: {
        alert: {
          id: `alert_${Date.now()}`,
          sensor_id: data.sensor_id,
          equipment_type: data.equipment_type || 'HVAC',
          severity: data.severity || 'medium',
          threshold_breached: {
            type: data.threshold_type || 'warning',
            current_value: data.current_value || 1100,
            threshold_value: data.threshold_value || 1000,
            percentage_over: ((data.current_value || 1100) / (data.threshold_value || 1000) - 1) * 100
          },
          recommendation: 'Check equipment operation and consider maintenance'
        }
      }
    }
  }

  static createExportCompletedEvent(data: any): any {
    return {
      event_type: 'export.completed',
      event_id: `evt_${++this.eventId}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      data: {
        export_job: {
          id: data.job_id,
          status: data.status || 'completed',
          format: data.format || 'csv',
          download_url: data.download_url,
          file_info: {
            size_bytes: data.file_size_bytes || 1024576,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          }
        }
      }
    }
  }

  static createTestEvent(): any {
    return {
      event_type: 'webhook.test',
      event_id: `evt_test_${Date.now()}`,
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery',
        webhook_id: `webhook_${crypto.randomUUID()}`,
        timestamp: new Date().toISOString()
      }
    }
  }
}

export class WebhookRetrySimulator {
  private attempts: any[] = []

  addAttempt(statusCode: number, responseTimeMs: number): void {
    this.attempts.push({
      attempt: this.attempts.length + 1,
      timestamp: Date.now(),
      statusCode,
      responseTimeMs,
      success: statusCode >= 200 && statusCode < 300
    })
  }

  getAttempts(): any[] {
    return this.attempts
  }

  getSuccessfulAttempt(): any | null {
    return this.attempts.find(a => a.success) || null
  }

  calculateNextRetryDelay(attempt: number, backoffType: 'linear' | 'exponential' = 'exponential'): number {
    if (backoffType === 'exponential') {
      return Math.min(Math.pow(2, attempt - 1) * 1000, 60000) // Max 60 seconds
    } else {
      return Math.min(attempt * 1000, 60000) // Linear backoff
    }
  }

  shouldRetry(maxAttempts: number = 3): boolean {
    if (this.attempts.length >= maxAttempts) return false
    return !this.getSuccessfulAttempt()
  }
}

export class WebhookSecurityTester {
  static testReplayAttack(payload: string, signature: string, secret: string, timestampHeader: string): boolean {
    const timestamp = parseInt(timestampHeader)
    const now = Math.floor(Date.now() / 1000)
    const age = now - timestamp

    // Reject requests older than 5 minutes (300 seconds)
    if (age > 300) {
      return false
    }

    return validateWebhookSignature(payload, signature, secret)
  }

  static testSignatureTampering(payload: string, signature: string, secret: string): boolean {
    // Modify payload slightly
    const tamperedPayload = payload + ' '

    // Original signature should not validate against tampered payload
    return !validateWebhookSignature(tamperedPayload, signature, secret)
  }

  static testMaliciousPayloads(): any[] {
    return [
      {
        name: 'XSS attempt in event data',
        payload: {
          event_type: 'data.updated',
          data: {
            sensor_id: '<script>alert("xss")</script>',
            value: 'normal'
          }
        }
      },
      {
        name: 'SQL injection attempt',
        payload: {
          event_type: 'data.updated',
          data: {
            sensor_id: "'; DROP TABLE webhooks; --",
            value: 100
          }
        }
      },
      {
        name: 'Oversized payload',
        payload: {
          event_type: 'data.updated',
          data: {
            sensor_id: 'SENSOR_001',
            malicious_data: 'x'.repeat(10 * 1024 * 1024) // 10MB
          }
        }
      },
      {
        name: 'Null bytes injection',
        payload: {
          event_type: 'data.updated',
          data: {
            sensor_id: 'SENSOR_001\x00malicious',
            value: 100
          }
        }
      }
    ]
  }
}

export interface WebhookTestResult {
  success: boolean
  responseTime: number
  statusCode: number
  error?: string
  attempts: number
}

export async function performWebhookDeliveryTest(
  webhookUrl: string,
  payload: any,
  secret: string,
  options: {
    timeout?: number
    maxRetries?: number
    backoffType?: 'linear' | 'exponential'
  } = {}
): Promise<WebhookTestResult> {
  const {
    timeout = 30000,
    maxRetries = 3,
    backoffType = 'exponential'
  } = options

  const retrySimulator = new WebhookRetrySimulator()

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now()

      // Generate signature
      const payloadString = JSON.stringify(payload)
      const signature = generateWebhookSignature(payloadString, secret)
      const timestamp = Math.floor(Date.now() / 1000)

      // Make request (this would be actual HTTP request in real implementation)
      const response = await simulateWebhookRequest(webhookUrl, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp.toString()
        },
        body: payloadString,
        timeout
      })

      const responseTime = Date.now() - startTime
      retrySimulator.addAttempt(response.status, responseTime)

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          responseTime,
          statusCode: response.status,
          attempts: attempt
        }
      }

      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delay = retrySimulator.calculateNextRetryDelay(attempt, backoffType)
        await new Promise(resolve => setTimeout(resolve, delay))
      }

    } catch (error) {
      const responseTime = Date.now() - Date.now() // This would be calculated properly
      retrySimulator.addAttempt(0, responseTime) // 0 status for network errors

      if (attempt === maxRetries) {
        return {
          success: false,
          responseTime,
          statusCode: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          attempts: attempt
        }
      }
    }
  }

  return {
    success: false,
    responseTime: 0,
    statusCode: 0,
    error: 'Max retries exceeded',
    attempts: maxRetries
  }
}

async function simulateWebhookRequest(url: string, options: any): Promise<{ status: number }> {
  // Mock HTTP request - in real implementation, this would use fetch or similar
  // Simulate success for most requests
  if (Math.random() > 0.1) {
    return { status: 200 }
  } else {
    return { status: 500 }
  }
}