/**
 * Authentication Test Helpers
 * Utilities for mocking NextAuth sessions and Stripe webhooks in tests
 */

import { Session } from 'next-auth'
import * as crypto from 'crypto'

export interface MockSessionUser {
  id: string
  email: string
  name: string
  subscriptionTier: 'free' | 'professional'
  subscriptionStatus: 'active' | 'past_due' | 'canceled'
  subscriptionId?: string
}

export interface MockSession extends Session {
  user: MockSessionUser
  expires: string
  accessToken?: string
}

/**
 * Create a mock NextAuth session for testing
 */
export function mockSession(
  userState: 'free' | 'professional' | 'expired' = 'free'
): MockSession {
  const baseUser: MockSessionUser = {
    id: 'user_test_123',
    email: 'test@facility.com',
    name: 'Test Manager',
    subscriptionTier: userState === 'expired' ? 'professional' : userState,
    subscriptionStatus: userState === 'expired' ? 'past_due' : 'active'
  }

  if (userState === 'professional' || userState === 'expired') {
    baseUser.subscriptionId = 'sub_test_123'
  }

  return {
    user: baseUser,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    accessToken: 'mock_token_123'
  }
}

/**
 * Mock Stripe webhook event data
 */
export interface StripeWebhookEvent {
  id: string
  object: 'event'
  type: string
  data: {
    object: any
  }
  created: number
  livemode: boolean
}

/**
 * Generate a mock Stripe webhook signature
 */
export function generateStripeSignature(payload: string, secret: string = 'whsec_test_secret'): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${payload}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex')

  return `t=${timestamp},v1=${signature}`
}

/**
 * Mock Stripe webhook for testing subscription flows
 */
export async function mockStripeWebhook(
  eventType: string,
  eventData: any,
  options: {
    secret?: string
    endpoint?: string
  } = {}
): Promise<void> {
  const { secret = 'whsec_test_secret', endpoint = '/api/stripe/webhook' } = options

  const webhookEvent: StripeWebhookEvent = {
    id: `evt_${crypto.randomBytes(16).toString('hex')}`,
    object: 'event',
    type: eventType,
    data: {
      object: eventData
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false
  }

  const payload = JSON.stringify(webhookEvent)
  const signature = generateStripeSignature(payload, secret)

  // Mock the webhook request to the application
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: endpoint,
    body: null,
    bodyUsed: false,
    json: async () => ({ received: true }),
    text: async () => 'OK',
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    clone: jest.fn()
  } as Response)

  // Simulate processing the webhook
  await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signature
    },
    body: payload
  })
}

/**
 * Mock session with enhanced properties for testing
 */
export function createMockSessionWithSubscription(
  subscriptionTier: 'free' | 'professional',
  additionalProps: Partial<MockSessionUser> = {}
): MockSession {
  return {
    user: {
      id: 'user_test_123',
      email: 'test@facility.com',
      name: 'Test Manager',
      subscriptionTier,
      subscriptionStatus: 'active',
      subscriptionId: subscriptionTier === 'professional' ? 'sub_test_professional' : undefined,
      ...additionalProps
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    accessToken: 'mock_token_123'
  }
}

/**
 * Mock user authentication state changes for testing flows
 */
export class MockAuthStateManager {
  private currentSession: MockSession | null = null
  private listeners: Array<(session: MockSession | null) => void> = []

  setSession(session: MockSession | null): void {
    this.currentSession = session
    this.notifyListeners()
  }

  getSession(): MockSession | null {
    return this.currentSession
  }

  subscribe(listener: (session: MockSession | null) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index >= 0) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentSession))
  }

  // Simulate login flow
  async mockLogin(userType: 'free' | 'professional' = 'free'): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100)) // Simulate async login
    this.setSession(mockSession(userType))
  }

  // Simulate logout flow
  async mockLogout(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50)) // Simulate async logout
    this.setSession(null)
  }

  // Simulate subscription upgrade
  async mockUpgrade(): Promise<void> {
    if (this.currentSession?.user.subscriptionTier === 'free') {
      await new Promise(resolve => setTimeout(resolve, 200)) // Simulate subscription processing
      this.setSession({
        ...this.currentSession,
        user: {
          ...this.currentSession.user,
          subscriptionTier: 'professional',
          subscriptionId: 'sub_upgraded_123'
        }
      })
    }
  }

  // Simulate subscription downgrade/cancellation
  async mockDowngrade(): Promise<void> {
    if (this.currentSession?.user.subscriptionTier === 'professional') {
      await new Promise(resolve => setTimeout(resolve, 200)) // Simulate subscription processing
      this.setSession({
        ...this.currentSession,
        user: {
          ...this.currentSession.user,
          subscriptionTier: 'free',
          subscriptionStatus: 'canceled',
          subscriptionId: undefined
        }
      })
    }
  }
}

/**
 * Default mock auth state manager instance for tests
 */
export const mockAuthStateManager = new MockAuthStateManager()

/**
 * Helper to reset all auth mocks between tests
 */
export function resetAuthMocks(): void {
  mockAuthStateManager.setSession(null)
  jest.clearAllMocks()
}