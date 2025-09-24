/**
 * Critical Tests for Payment Failure Recovery
 * Addresses Quinn's QA concern: TEST-003 (MEDIUM) - Payment failure scenario tests
 */

import { NextRequest } from 'next/server'
import { POST } from '../retry-payment/route'
import { getServerSession } from 'next-auth'

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock Stripe
jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      subscriptions: {
        retrieve: jest.fn(),
        update: jest.fn(),
      },
      invoices: {
        retrieve: jest.fn(),
        pay: jest.fn(),
        list: jest.fn(),
      },
      paymentMethods: {
        list: jest.fn(),
      },
    })),
  }
})

// Mock database
jest.mock('@/lib/database/supabase', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            {
              stripe_subscription_id: 'sub_test',
              stripe_customer_id: 'cus_test',
              status: 'past_due',
            },
          ],
          error: null,
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}))

import Stripe from 'stripe'
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/subscription/retry-payment', () => {
  let mockStripeSubscriptionRetrieve: jest.Mock
  let mockStripeInvoicePay: jest.Mock
  let mockStripeInvoiceList: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    const stripeInstance = new Stripe('sk_test_123', { apiVersion: '2023-10-16' })
    mockStripeSubscriptionRetrieve = stripeInstance.subscriptions.retrieve as jest.Mock
    mockStripeInvoicePay = stripeInstance.invoices.pay as jest.Mock
    mockStripeInvoiceList = stripeInstance.invoices.list as jest.Mock
  })

  describe('Authentication and Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/subscription/retry-payment', {
        method: 'POST',
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(result.error).toContain('authenticated')
    })

    it('should only allow users to retry their own payments', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user_unauthorized', email: 'unauthorized@example.com' },
      })

      // Mock database returning no subscription for this user
      const { createClient } = await import('@/lib/database/supabase')
      createClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/retry-payment', {
        method: 'POST',
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(result.error).toContain('subscription')
    })
  })

  describe('Payment Retry Logic', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user_test', email: 'test@example.com' },
      })
    })

    it('should successfully retry failed payment', async () => {
      // Arrange
      mockStripeSubscriptionRetrieve.mockResolvedValue({
        id: 'sub_test',
        status: 'past_due',
        latest_invoice: 'in_failed_payment',
      })

      mockStripeInvoiceList.mockResolvedValue({
        data: [
          {
            id: 'in_failed_payment',
            status: 'open',
            amount_due: 2900,
            payment_intent: {
              id: 'pi_failed',
              status: 'requires_payment_method',
            },
          },
        ],
      })

      mockStripeInvoicePay.mockResolvedValue({
        id: 'in_failed_payment',
        status: 'paid',
        payment_intent: {
          id: 'pi_success',
          status: 'succeeded',
        },
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/retry-payment', {
        method: 'POST',
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.subscription.status).toBe('active')
      expect(mockStripeInvoicePay).toHaveBeenCalledWith('in_failed_payment')
    })

    it('should handle payment retry failures gracefully', async () => {
      // Arrange
      mockStripeSubscriptionRetrieve.mockResolvedValue({
        id: 'sub_test',
        status: 'past_due',
        latest_invoice: 'in_failed_payment',
      })

      mockStripeInvoiceList.mockResolvedValue({
        data: [
          {
            id: 'in_failed_payment',
            status: 'open',
            amount_due: 2900,
          },
        ],
      })

      const cardDeclinedError = new Error('Your card was declined.')
      cardDeclinedError.name = 'StripeCardError'
      mockStripeInvoicePay.mockRejectedValue(cardDeclinedError)

      const request = new NextRequest('http://localhost:3000/api/subscription/retry-payment', {
        method: 'POST',
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(result.error).toContain('declined')
      expect(result.retryable).toBe(true)
    })

    it('should handle subscriptions with no failed invoices', async () => {
      // Arrange
      mockStripeSubscriptionRetrieve.mockResolvedValue({
        id: 'sub_test',
        status: 'active',
        latest_invoice: 'in_paid',
      })

      mockStripeInvoiceList.mockResolvedValue({
        data: [
          {
            id: 'in_paid',
            status: 'paid',
            amount_due: 0,
          },
        ],
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/retry-payment', {
        method: 'POST',
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(result.error).toContain('no failed invoices')
    })

    it('should handle multiple retry attempts', async () => {
      // Arrange
      mockStripeSubscriptionRetrieve.mockResolvedValue({
        id: 'sub_test',
        status: 'past_due',
        latest_invoice: 'in_multiple_retries',
      })

      mockStripeInvoiceList.mockResolvedValue({
        data: [
          {
            id: 'in_multiple_retries',
            status: 'open',
            amount_due: 2900,
            attempt_count: 3, // Third attempt
            next_payment_attempt: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
          },
        ],
      })

      const tooManyAttemptsError = new Error('Too many payment attempts.')
      tooManyAttemptsError.name = 'StripeRateLimitError'
      mockStripeInvoicePay.mockRejectedValue(tooManyAttemptsError)

      const request = new NextRequest('http://localhost:3000/api/subscription/retry-payment', {
        method: 'POST',
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(429)
      expect(result.error).toContain('too many attempts')
      expect(result.nextRetryAt).toBeDefined()
    })
  })

  describe('Database Synchronization', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user_test', email: 'test@example.com' },
      })
    })

    it('should update database when payment retry succeeds', async () => {
      // Arrange
      const { createClient } = await import('@/lib/database/supabase')
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      createClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'subscription_db_id',
                  stripe_subscription_id: 'sub_test',
                  status: 'past_due',
                },
              ],
              error: null,
            }),
          }),
          update: mockUpdate,
          insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })

      mockStripeSubscriptionRetrieve.mockResolvedValue({
        id: 'sub_test',
        status: 'active', // Payment succeeded, status changed
        latest_invoice: 'in_paid',
      })

      mockStripeInvoiceList.mockResolvedValue({
        data: [
          {
            id: 'in_paid',
            status: 'paid',
            amount_due: 0,
          },
        ],
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/retry-payment', {
        method: 'POST',
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'active',
        updated_at: expect.any(String),
      })
    })

    it('should handle database update failures', async () => {
      // Arrange
      const { createClient } = await import('@/lib/database/supabase')
      createClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ stripe_subscription_id: 'sub_test', status: 'past_due' }],
              error: null,
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Database update failed'),
            }),
          }),
        }),
      })

      mockStripeSubscriptionRetrieve.mockResolvedValue({
        id: 'sub_test',
        status: 'active',
      })

      const request = new NextRequest('http://localhost:3000/api/subscription/retry-payment', {
        method: 'POST',
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(result.error).toContain('sync')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user_test', email: 'test@example.com' },
      })
    })

    it('should handle Stripe API unavailability', async () => {
      // Arrange
      const apiError = new Error('Service unavailable')
      apiError.name = 'StripeAPIError'
      mockStripeSubscriptionRetrieve.mockRejectedValue(apiError)

      const request = new NextRequest('http://localhost:3000/api/subscription/retry-payment', {
        method: 'POST',
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(503)
      expect(result.error).toContain('temporarily unavailable')
      expect(result.retryable).toBe(true)
    })

    it('should handle corrupted subscription data', async () => {
      // Arrange
      mockStripeSubscriptionRetrieve.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/subscription/retry-payment', {
        method: 'POST',
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(result.error).toContain('not found')
    })
  })
})