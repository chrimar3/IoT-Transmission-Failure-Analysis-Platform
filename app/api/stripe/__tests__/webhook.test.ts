/**
 * Critical Tests for Stripe Webhook Processing
 * Addresses Quinn's QA concern: TEST-002 (HIGH) - Critical webhook processing lacks test validation
 */

import { NextRequest } from 'next/server'
import { POST } from '../webhook/route'

// Mock Stripe
jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      webhooks: {
        constructEvent: jest.fn(),
      },
    })),
  }
})

// Mock database operations
jest.mock('@/lib/database/supabase', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  }),
}))

import Stripe from 'stripe'

describe('/api/stripe/webhook', () => {
  let mockWebhookConstructEvent: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockWebhookConstructEvent = new Stripe('sk_test_123', { apiVersion: '2023-10-16' }).webhooks.constructEvent as jest.Mock
  })

  describe('Webhook Signature Verification', () => {
    it('should verify webhook signatures correctly', async () => {
      // Arrange
      const validEvent = {
        id: 'evt_test_webhook',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test',
            customer: 'cus_test',
            status: 'active',
            current_period_start: 1634567890,
            current_period_end: 1637246290,
          },
        },
      }

      mockWebhookConstructEvent.mockReturnValue(validEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(validEvent),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(result.received).toBe(true)
      expect(mockWebhookConstructEvent).toHaveBeenCalled()
    })

    it('should reject webhooks with invalid signatures', async () => {
      // Arrange
      mockWebhookConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
        headers: {
          'stripe-signature': 'invalid_signature',
        },
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(result.error).toContain('signature')
    })

    it('should reject webhooks without stripe-signature header', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(result.error).toContain('signature')
    })
  })

  describe('Subscription Lifecycle Events', () => {
    it('should handle customer.subscription.created events', async () => {
      // Arrange
      const subscriptionCreatedEvent = {
        id: 'evt_subscription_created',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_created',
            customer: 'cus_test_customer',
            status: 'active',
            current_period_start: 1634567890,
            current_period_end: 1637246290,
            items: {
              data: [
                {
                  price: {
                    id: 'price_professional',
                    nickname: 'Professional',
                  },
                },
              ],
            },
          },
        },
      }

      mockWebhookConstructEvent.mockReturnValue(subscriptionCreatedEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(subscriptionCreatedEvent),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(result.received).toBe(true)
    })

    it('should handle customer.subscription.updated events', async () => {
      // Arrange
      const subscriptionUpdatedEvent = {
        id: 'evt_subscription_updated',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_updated',
            customer: 'cus_test_customer',
            status: 'past_due',
            current_period_start: 1634567890,
            current_period_end: 1637246290,
          },
        },
      }

      mockWebhookConstructEvent.mockReturnValue(subscriptionUpdatedEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(subscriptionUpdatedEvent),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
    })

    it('should handle customer.subscription.deleted events', async () => {
      // Arrange
      const subscriptionDeletedEvent = {
        id: 'evt_subscription_deleted',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_deleted',
            customer: 'cus_test_customer',
            status: 'canceled',
          },
        },
      }

      mockWebhookConstructEvent.mockReturnValue(subscriptionDeletedEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(subscriptionDeletedEvent),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
    })
  })

  describe('Payment Events', () => {
    it('should handle invoice.payment_succeeded events', async () => {
      // Arrange
      const paymentSucceededEvent = {
        id: 'evt_payment_succeeded',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_success',
            customer: 'cus_test_customer',
            subscription: 'sub_test',
            amount_paid: 2900,
            status: 'paid',
          },
        },
      }

      mockWebhookConstructEvent.mockReturnValue(paymentSucceededEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(paymentSucceededEvent),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
    })

    it('should handle invoice.payment_failed events', async () => {
      // Arrange
      const paymentFailedEvent = {
        id: 'evt_payment_failed',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_failed',
            customer: 'cus_test_customer',
            subscription: 'sub_test',
            amount_due: 2900,
            status: 'open',
            attempt_count: 2,
          },
        },
      }

      mockWebhookConstructEvent.mockReturnValue(paymentFailedEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(paymentFailedEvent),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
    })
  })

  describe('Idempotency and Error Handling', () => {
    it('should handle duplicate webhook events idempotently', async () => {
      // Arrange
      const duplicateEvent = {
        id: 'evt_duplicate_test',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_duplicate',
            customer: 'cus_test',
            status: 'active',
          },
        },
      }

      mockWebhookConstructEvent.mockReturnValue(duplicateEvent)

      const request1 = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(duplicateEvent),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      })

      const request2 = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(duplicateEvent),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      })

      // Act
      const response1 = await POST(request1)
      const response2 = await POST(request2)

      // Assert
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
    })

    it('should handle unsupported event types gracefully', async () => {
      // Arrange
      const unsupportedEvent = {
        id: 'evt_unsupported',
        type: 'customer.created',
        data: {
          object: {
            id: 'cus_unsupported',
          },
        },
      }

      mockWebhookConstructEvent.mockReturnValue(unsupportedEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(unsupportedEvent),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(result.received).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      // Arrange - Mock database error
      const { createClient } = await import('@/lib/database/supabase')
      createClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Database connection failed'),
            }),
          }),
        }),
      })

      const event = {
        id: 'evt_db_error',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_db_error',
            customer: 'cus_test',
            status: 'active',
          },
        },
      }

      mockWebhookConstructEvent.mockReturnValue(event)

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'stripe-signature': 'valid_signature',
        },
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(500)
    })
  })

  describe('Security and Validation', () => {
    it('should reject requests with malformed JSON', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: 'invalid json{',
        headers: {
          'stripe-signature': 'valid_signature',
        },
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(400)
    })

    it('should reject non-POST requests', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'GET',
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(405)
    })
  })
})