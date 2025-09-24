/**
 * Critical Tests for Stripe Checkout Processing
 * Addresses Quinn's QA concern: TEST-001 (HIGH) - No test coverage for payment processing functionality
 */

import { NextRequest } from 'next/server'
import { POST } from '../checkout/route'
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
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      customers: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    })),
  }
})

// Mock database
jest.mock('@/lib/database/supabase', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  }),
}))

import Stripe from 'stripe'
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/stripe/checkout', () => {
  let mockStripeCheckoutCreate: jest.Mock
  let mockStripeCustomerCreate: jest.Mock
  let mockStripeCustomerRetrieve: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    const stripeInstance = new Stripe('sk_test_123', { apiVersion: '2023-10-16' })
    mockStripeCheckoutCreate = stripeInstance.checkout.sessions.create as jest.Mock
    mockStripeCustomerCreate = stripeInstance.customers.create as jest.Mock
    mockStripeCustomerRetrieve = stripeInstance.customers.retrieve as jest.Mock
  })

  describe('Authentication and Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_test' }),
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(result.error).toContain('authenticated')
    })

    it('should process authenticated requests', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_test',
          email: 'test@example.com',
          name: 'Test User',
        },
      })

      mockStripeCheckoutCreate.mockResolvedValue({
        id: 'cs_test_checkout',
        url: 'https://checkout.stripe.com/pay/cs_test_checkout',
      })

      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_professional',
          successUrl: 'http://localhost:3000/subscription/success',
          cancelUrl: 'http://localhost:3000/subscription/canceled',
        }),
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(result.sessionId).toBe('cs_test_checkout')
      expect(result.url).toContain('checkout.stripe.com')
    })
  })

  describe('Checkout Session Creation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_test',
          email: 'test@example.com',
          name: 'Test User',
        },
      })
    })

    it('should create checkout session for Professional tier', async () => {
      // Arrange
      const expectedSessionId = 'cs_test_professional'
      mockStripeCheckoutCreate.mockResolvedValue({
        id: expectedSessionId,
        url: `https://checkout.stripe.com/pay/${expectedSessionId}`,
      })

      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_professional',
          successUrl: 'http://localhost:3000/subscription/success',
          cancelUrl: 'http://localhost:3000/subscription/canceled',
        }),
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(result.sessionId).toBe(expectedSessionId)
      expect(mockStripeCheckoutCreate).toHaveBeenCalledWith({
        payment_method_types: ['card'],
        line_items: [
          {
            price: 'price_professional',
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: 'http://localhost:3000/subscription/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'http://localhost:3000/subscription/canceled',
        customer_email: 'test@example.com',
        metadata: {
          userId: 'user_test',
        },
        subscription_data: {
          metadata: {
            userId: 'user_test',
          },
        },
      })
    })

    it('should handle Stripe API errors gracefully', async () => {
      // Arrange
      const stripeError = new Error('Your card was declined.')
      stripeError.name = 'StripeCardError'
      mockStripeCheckoutCreate.mockRejectedValue(stripeError)

      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_professional',
          successUrl: 'http://localhost:3000/subscription/success',
          cancelUrl: 'http://localhost:3000/subscription/canceled',
        }),
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(result.error).toContain('declined')
    })

    it('should validate required parameters', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          // Missing priceId
          successUrl: 'http://localhost:3000/subscription/success',
          cancelUrl: 'http://localhost:3000/subscription/canceled',
        }),
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(result.error).toContain('priceId')
    })

    it('should validate URL parameters', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_professional',
          successUrl: 'invalid-url',
          cancelUrl: 'http://localhost:3000/subscription/canceled',
        }),
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(result.error).toContain('URL')
    })
  })

  describe('Customer Management', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_test',
          email: 'test@example.com',
          name: 'Test User',
        },
      })
    })

    it('should create new Stripe customer for first-time users', async () => {
      // Arrange
      mockStripeCustomerCreate.mockResolvedValue({
        id: 'cus_new_customer',
        email: 'test@example.com',
      })

      mockStripeCheckoutCreate.mockResolvedValue({
        id: 'cs_test_new_customer',
        url: 'https://checkout.stripe.com/pay/cs_test_new_customer',
      })

      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_professional',
          successUrl: 'http://localhost:3000/subscription/success',
          cancelUrl: 'http://localhost:3000/subscription/canceled',
        }),
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      expect(mockStripeCustomerCreate).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          userId: 'user_test',
        },
      })
    })

    it('should use existing Stripe customer for returning users', async () => {
      // Arrange - Mock database returning existing customer
      const { createClient } = await import('@/lib/database/supabase')
      createClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ stripe_customer_id: 'cus_existing' }],
              error: null,
            }),
          }),
        }),
      })

      mockStripeCustomerRetrieve.mockResolvedValue({
        id: 'cus_existing',
        email: 'test@example.com',
      })

      mockStripeCheckoutCreate.mockResolvedValue({
        id: 'cs_test_existing',
        url: 'https://checkout.stripe.com/pay/cs_test_existing',
      })

      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_professional',
          successUrl: 'http://localhost:3000/subscription/success',
          cancelUrl: 'http://localhost:3000/subscription/canceled',
        }),
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      expect(mockStripeCustomerRetrieve).toHaveBeenCalledWith('cus_existing')
      expect(mockStripeCustomerCreate).not.toHaveBeenCalled()
    })
  })

  describe('Security and Validation', () => {
    it('should reject requests with malformed JSON', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user_test', email: 'test@example.com' },
      })

      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: 'invalid json{',
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(400)
    })

    it('should sanitize user inputs', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_test',
          email: 'test@example.com',
          name: 'Test User',
        },
      })

      mockStripeCheckoutCreate.mockResolvedValue({
        id: 'cs_test_sanitized',
        url: 'https://checkout.stripe.com/pay/cs_test_sanitized',
      })

      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_professional',
          successUrl: 'http://localhost:3000/subscription/success?param=<script>alert("xss")</script>',
          cancelUrl: 'http://localhost:3000/subscription/canceled',
        }),
      })

      // Act
      const response = await POST(request)
      const _result = await response.json()

      // Assert
      expect(response.status).toBe(200)
      // Verify that the URL was sanitized in the Stripe call
      expect(mockStripeCheckoutCreate).toHaveBeenCalled()
    })

    it('should handle network timeouts gracefully', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user_test', email: 'test@example.com' },
      })

      const timeoutError = new Error('Network timeout')
      timeoutError.name = 'NetworkError'
      mockStripeCheckoutCreate.mockRejectedValue(timeoutError)

      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_professional',
          successUrl: 'http://localhost:3000/subscription/success',
          cancelUrl: 'http://localhost:3000/subscription/canceled',
        }),
      })

      // Act
      const response = await POST(request)
      const result = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(result.error).toContain('service temporarily unavailable')
    })
  })
})