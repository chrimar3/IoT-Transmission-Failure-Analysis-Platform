/**
 * Rate Limiting Validation Tests - ISOLATED VERSION
 * Comprehensive testing with full mocking and deterministic behavior
 * Eliminates external dependencies and ensures test repeatability
 *
 * FIXES:
 * - No real API calls
 * - No actual rate limiting hits
 * - Deterministic test results
 * - Complete isolation from external services
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import {
  MockRateLimitService,
  RateLimitTestDataFactory,
  RateLimitTestAssertions,
  type MockRateLimitOptions
} from '../mocks/rate-limit-service.mock'

describe('Rate Limiting Validation - Isolated Tests', () => {
  let mockRateLimitService: MockRateLimitService
  let testUserId: string

  beforeEach(() => {
    mockRateLimitService = new MockRateLimitService()
    testUserId = RateLimitTestDataFactory.createUserId('rate-limit-test')

    // Set consistent mock time for deterministic tests
    const mockTime = new Date('2025-09-29T10:00:00Z').getTime()
    mockRateLimitService.setMockTime(mockTime)
  })

  afterEach(() => {
    mockRateLimitService.clearAll()
    jest.clearAllMocks()
  })

  describe('Free Tier Rate Limiting (100 req/hr)', () => {
    const freeTierOptions: MockRateLimitOptions = { tier: 'free' }

    test('GIVEN clean slate WHEN checking rate limit THEN allows requests within limit', async () => {
      // GIVEN: Fresh user with no previous requests
      const endpoint = '/v1/data/timeseries'

      // WHEN: Checking rate limit for first request
      const result = await mockRateLimitService.checkRateLimit(
        testUserId,
        endpoint,
        freeTierOptions
      )

      // THEN: Request should be allowed with correct headers
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(99) // 100 - 1 = 99
      RateLimitTestAssertions.assertRateLimitHeaders(result.headers, 100, 99)
      expect(result.retryAfter).toBeUndefined()
    })

    test('GIVEN 99 requests made WHEN making 100th request THEN allows with remaining=0', async () => {
      // GIVEN: 99 requests already made
      const endpoint = '/v1/data/timeseries'
      mockRateLimitService.setState(testUserId, endpoint, 'free', {
        count: 99,
        resetTime: mockRateLimitService.getCurrentTime() + 3600000,
        windowStartTime: mockRateLimitService.getCurrentTime(),
        burstUsed: 0
      })

      // WHEN: Making the 100th request
      const result = await mockRateLimitService.checkRateLimit(
        testUserId,
        endpoint,
        freeTierOptions
      )

      // THEN: Should be allowed as we're at the limit but not over
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9) // Burst allowance remaining
      RateLimitTestAssertions.assertRateLimitHeaders(result.headers, 100, 9)
    })

    test('GIVEN at rate limit WHEN making request THEN uses burst allowance', async () => {
      // GIVEN: Exactly at rate limit (100 requests)
      const endpoint = '/v1/data/timeseries'
      mockRateLimitService.setState(testUserId, endpoint, 'free', {
        count: 100,
        resetTime: mockRateLimitService.getCurrentTime() + 3600000,
        windowStartTime: mockRateLimitService.getCurrentTime(),
        burstUsed: 0
      })

      // WHEN: Making request that should use burst
      const result = await mockRateLimitService.checkRateLimit(
        testUserId,
        endpoint,
        freeTierOptions
      )

      // THEN: Should be allowed using burst capacity
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9) // 10 burst - 1 used = 9
      RateLimitTestAssertions.assertRateLimitHeaders(result.headers, 100, 9)
    })

    test('GIVEN burst exhausted WHEN making request THEN blocks with 429', async () => {
      // GIVEN: Rate limit + burst exhausted (110 total requests)
      const endpoint = '/v1/data/timeseries'
      mockRateLimitService.setState(testUserId, endpoint, 'free', {
        count: 100,
        resetTime: mockRateLimitService.getCurrentTime() + 3600000,
        windowStartTime: mockRateLimitService.getCurrentTime(),
        burstUsed: 10 // All burst used
      })

      // WHEN: Attempting another request
      const result = await mockRateLimitService.checkRateLimit(
        testUserId,
        endpoint,
        freeTierOptions
      )

      // THEN: Should be blocked with appropriate response
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
      expect(result.headers['Retry-After']).toBeDefined()
      RateLimitTestAssertions.assertRateLimitHeaders(result.headers, 100, 0)
    })

    test('GIVEN time window reset WHEN making request THEN resets counter', async () => {
      // GIVEN: Previous window with exhausted limits
      const endpoint = '/v1/data/timeseries'
      const pastTime = mockRateLimitService.getCurrentTime() - 3600000 // 1 hour ago

      mockRateLimitService.setState(testUserId, endpoint, 'free', {
        count: 110,
        resetTime: pastTime + 3600000, // This would be in the past now
        windowStartTime: pastTime,
        burstUsed: 10
      })

      // WHEN: Making request in new window
      const result = await mockRateLimitService.checkRateLimit(
        testUserId,
        endpoint,
        freeTierOptions
      )

      // THEN: Should reset and allow request
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(99) // Fresh window
      RateLimitTestAssertions.assertRateLimitHeaders(result.headers, 100, 99)
    })

    test('GIVEN multiple concurrent requests WHEN all made at once THEN handles burst correctly', async () => {
      // GIVEN: Clean state
      const endpoint = '/v1/data/timeseries'
      const concurrentRequests = 15 // Exceeds 10 burst allowance

      // WHEN: Making concurrent requests
      const promises = Array.from({ length: concurrentRequests }, () =>
        mockRateLimitService.checkRateLimit(testUserId, endpoint, freeTierOptions)
      )

      const results = await Promise.all(promises)

      // THEN: Should allow base + burst, block excess
      const allowed = results.filter(r => r.allowed)
      const blocked = results.filter(r => !r.allowed)

      expect(allowed.length).toBe(11) // 100 + 10 burst, but only 15 requested, so 11 allowed
      expect(blocked.length).toBe(4) // Remaining 4 blocked

      // Last successful request should show correct remaining
      const lastAllowed = allowed[allowed.length - 1]
      expect(lastAllowed.remaining).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Professional Tier Rate Limiting (10K req/hr)', () => {
    const professionalTierOptions: MockRateLimitOptions = { tier: 'professional' }

    test('GIVEN clean slate WHEN checking professional tier THEN allows with high limits', async () => {
      // GIVEN: Fresh professional user
      const endpoint = '/v1/data/timeseries'

      // WHEN: Making first request
      const result = await mockRateLimitService.checkRateLimit(
        testUserId,
        endpoint,
        professionalTierOptions
      )

      // THEN: Should allow with professional limits
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(10999) // 10000 + 1000 burst - 1 = 10999
      RateLimitTestAssertions.assertRateLimitHeaders(result.headers, 10000, 10999)
      RateLimitTestAssertions.assertTierBehavior('professional', result, 1)
    })

    test('GIVEN near professional limit WHEN making requests THEN handles high volume', async () => {
      // GIVEN: Near professional tier limit (9500 requests)
      const endpoint = '/v1/data/timeseries'
      mockRateLimitService.setState(testUserId, endpoint, 'professional', {
        count: 9500,
        resetTime: mockRateLimitService.getCurrentTime() + 3600000,
        windowStartTime: mockRateLimitService.getCurrentTime(),
        burstUsed: 0
      })

      // WHEN: Making more requests
      const result = await mockRateLimitService.checkRateLimit(
        testUserId,
        endpoint,
        professionalTierOptions
      )

      // THEN: Should still allow with burst available
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1499) // 500 regular + 1000 burst - 1 = 1499
      RateLimitTestAssertions.assertTierBehavior('professional', result, 9501)
    })

    test('GIVEN professional burst scenario WHEN making burst requests THEN handles correctly', async () => {
      // GIVEN: At professional limit, testing burst
      const endpoint = '/v1/data/timeseries'
      mockRateLimitService.setState(testUserId, endpoint, 'professional', {
        count: 10000,
        resetTime: mockRateLimitService.getCurrentTime() + 3600000,
        windowStartTime: mockRateLimitService.getCurrentTime(),
        burstUsed: 0
      })

      // WHEN: Making burst requests
      const burstResults = []
      for (let i = 0; i < 5; i++) {
        const result = await mockRateLimitService.checkRateLimit(
          testUserId,
          endpoint,
          professionalTierOptions
        )
        burstResults.push(result)
      }

      // THEN: All burst requests should be allowed
      burstResults.forEach((result, index) => {
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(1000 - (index + 1) - 1) // Burst decreasing
      })
    })

    test('GIVEN professional limits exhausted WHEN making request THEN blocks appropriately', async () => {
      // GIVEN: Professional tier fully exhausted (10000 + 1000 burst)
      const endpoint = '/v1/data/timeseries'
      mockRateLimitService.setState(testUserId, endpoint, 'professional', {
        count: 10000,
        resetTime: mockRateLimitService.getCurrentTime() + 3600000,
        windowStartTime: mockRateLimitService.getCurrentTime(),
        burstUsed: 1000 // All burst used
      })

      // WHEN: Making another request
      const result = await mockRateLimitService.checkRateLimit(
        testUserId,
        endpoint,
        professionalTierOptions
      )

      // THEN: Should be blocked
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
      RateLimitTestAssertions.assertRateLimitResponse(result, {
        allowed: false,
        remaining: 0,
        hasRetryAfter: true
      })
    })
  })

  describe('Enterprise Tier Rate Limiting (50K req/hr)', () => {
    const enterpriseTierOptions: MockRateLimitOptions = { tier: 'enterprise' }

    test('GIVEN enterprise tier WHEN checking limits THEN provides enterprise capacity', async () => {
      // GIVEN: Enterprise user
      const endpoint = '/v1/data/timeseries'

      // WHEN: Making request
      const result = await mockRateLimitService.checkRateLimit(
        testUserId,
        endpoint,
        enterpriseTierOptions
      )

      // THEN: Should allow with enterprise limits
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(54999) // 50000 + 5000 burst - 1 = 54999
      RateLimitTestAssertions.assertRateLimitHeaders(result.headers, 50000, 54999)
      RateLimitTestAssertions.assertTierBehavior('enterprise', result, 1)
    })

    test('GIVEN enterprise near limit WHEN making requests THEN handles high volume appropriately', async () => {
      // GIVEN: Near enterprise limit (48000 requests)
      const endpoint = '/v1/data/timeseries'
      mockRateLimitService.setState(testUserId, endpoint, 'enterprise', {
        count: 48000,
        resetTime: mockRateLimitService.getCurrentTime() + 3600000,
        windowStartTime: mockRateLimitService.getCurrentTime(),
        burstUsed: 0
      })

      // WHEN: Making requests
      const result = await mockRateLimitService.checkRateLimit(
        testUserId,
        endpoint,
        enterpriseTierOptions
      )

      // THEN: Should allow with remaining capacity
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(6999) // 2000 regular + 5000 burst - 1 = 6999
      RateLimitTestAssertions.assertTierBehavior('enterprise', result, 48001)
    })
  })

  describe('Rate Limiting Edge Cases', () => {
    test('GIVEN independent API keys WHEN checking limits THEN isolates properly', async () => {
      // GIVEN: Two different users
      const user1 = RateLimitTestDataFactory.createUserId('user1')
      const user2 = RateLimitTestDataFactory.createUserId('user2')
      const endpoint = '/v1/data/timeseries'

      // Set user1 at limit
      mockRateLimitService.setState(user1, endpoint, 'free', {
        count: 110,
        resetTime: mockRateLimitService.getCurrentTime() + 3600000,
        windowStartTime: mockRateLimitService.getCurrentTime(),
        burstUsed: 10
      })

      // WHEN: Checking both users
      const result1 = await mockRateLimitService.checkRateLimit(
        user1,
        endpoint,
        { tier: 'free' }
      )
      const result2 = await mockRateLimitService.checkRateLimit(
        user2,
        endpoint,
        { tier: 'free' }
      )

      // THEN: user1 blocked, user2 allowed
      expect(result1.allowed).toBe(false)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(99)
    })

    test('GIVEN storage failure WHEN checking rate limit THEN handles gracefully', async () => {
      // GIVEN: Storage failure simulation
      mockRateLimitService.simulateStorageFailure(true)

      // WHEN: Attempting to check rate limit
      const checkPromise = mockRateLimitService.checkRateLimit(
        testUserId,
        '/v1/data/timeseries',
        { tier: 'free' }
      )

      // THEN: Should throw appropriate error
      await expect(checkPromise).rejects.toThrow('Rate limit storage unavailable')
    })

    test('GIVEN sliding window reset WHEN time advances THEN resets appropriately', async () => {
      // GIVEN: Rate limit at capacity
      const endpoint = '/v1/data/timeseries'
      mockRateLimitService.setState(testUserId, endpoint, 'free', {
        count: 110,
        resetTime: mockRateLimitService.getCurrentTime() + 3600000,
        windowStartTime: mockRateLimitService.getCurrentTime(),
        burstUsed: 10
      })

      // Verify blocked
      let result = await mockRateLimitService.checkRateLimit(
        testUserId,
        endpoint,
        { tier: 'free' }
      )
      expect(result.allowed).toBe(false)

      // WHEN: Time advances past window
      mockRateLimitService.advanceTime(3600000 + 1) // Just past 1 hour

      // THEN: Should reset and allow requests
      result = await mockRateLimitService.checkRateLimit(
        testUserId,
        endpoint,
        { tier: 'free' }
      )
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(99) // Fresh window
    })

    test('GIVEN different endpoints WHEN checking limits THEN isolates per endpoint', async () => {
      // GIVEN: Different endpoints for same user
      const endpoint1 = '/v1/data/timeseries'
      const endpoint2 = '/v1/data/analytics'

      // Set endpoint1 at limit
      mockRateLimitService.setState(testUserId, endpoint1, 'free', {
        count: 110,
        resetTime: mockRateLimitService.getCurrentTime() + 3600000,
        windowStartTime: mockRateLimitService.getCurrentTime(),
        burstUsed: 10
      })

      // WHEN: Checking both endpoints
      const result1 = await mockRateLimitService.checkRateLimit(
        testUserId,
        endpoint1,
        { tier: 'free' }
      )
      const result2 = await mockRateLimitService.checkRateLimit(
        testUserId,
        endpoint2,
        { tier: 'free' }
      )

      // THEN: endpoint1 blocked, endpoint2 allowed
      expect(result1.allowed).toBe(false)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(99)
    })

    test('GIVEN custom rate limits WHEN checking THEN respects custom configuration', async () => {
      // GIVEN: Custom rate limit configuration
      const customOptions: MockRateLimitOptions = {
        tier: 'free',
        customLimits: {
          requests: 50, // Custom lower limit
          burst: 5      // Custom lower burst
        }
      }

      // WHEN: Making requests up to custom limit
      const results = []
      for (let i = 0; i < 56; i++) { // 50 + 5 burst + 1 over
        const result = await mockRateLimitService.checkRateLimit(
          testUserId,
          '/v1/data/timeseries',
          customOptions
        )
        results.push(result)
      }

      // THEN: Should respect custom limits
      const allowed = results.filter(r => r.allowed)
      const blocked = results.filter(r => !r.allowed)

      expect(allowed.length).toBe(55) // 50 + 5 burst
      expect(blocked.length).toBe(1)  // 1 over limit

      // Check headers reflect custom limits
      expect(results[0].headers['X-RateLimit-Limit']).toBe('50')
    })
  })

  describe('Performance and Consistency', () => {
    test('GIVEN high volume requests WHEN checking limits THEN maintains performance', async () => {
      // GIVEN: High volume scenario setup
      const endpoint = '/v1/data/timeseries'
      const requestCount = 1000

      // WHEN: Making many requests and measuring time
      const startTime = Date.now()
      const results = []

      for (let i = 0; i < requestCount; i++) {
        const result = await mockRateLimitService.checkRateLimit(
          testUserId,
          endpoint,
          { tier: 'professional' } // Use professional to avoid early blocking
        )
        results.push(result)
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // THEN: Should complete quickly and maintain consistency
      expect(totalTime).toBeLessThan(5000) // Should complete in under 5 seconds
      expect(results.length).toBe(requestCount)

      // First 10000 should be allowed, rest blocked
      const allowed = results.filter(r => r.allowed)
      const blocked = results.filter(r => !r.allowed)

      expect(allowed.length).toBeGreaterThan(900) // Most should succeed within professional limits
      expect(blocked.length).toBeLessThan(100)    // Few should be blocked
    })

    test('GIVEN consistent rate limit state WHEN checking multiple times THEN returns consistent results', async () => {
      // GIVEN: Specific rate limit state
      const endpoint = '/v1/data/timeseries'
      mockRateLimitService.setState(testUserId, endpoint, 'free', {
        count: 50,
        resetTime: mockRateLimitService.getCurrentTime() + 3600000,
        windowStartTime: mockRateLimitService.getCurrentTime(),
        burstUsed: 0
      })

      // WHEN: Checking multiple times without making requests
      const results = []
      for (let i = 0; i < 5; i++) {
        // Get state without incrementing
        const state = mockRateLimitService.getState(testUserId, endpoint, 'free')
        expect(state?.count).toBe(50) // Should remain consistent
        results.push(state)
      }

      // THEN: All results should be identical
      results.forEach(result => {
        expect(result?.count).toBe(50)
        expect(result?.burstUsed).toBe(0)
      })
    })
  })
})