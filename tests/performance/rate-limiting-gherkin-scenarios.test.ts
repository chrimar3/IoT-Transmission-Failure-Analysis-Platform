/**
 * Rate Limiting - Given-When-Then (Gherkin) Test Scenarios
 * Comprehensive behavior-driven testing for all edge cases
 * Written in natural language format for stakeholder clarity
 */

import { describe, test, expect, beforeEach } from '@jest/globals'
import {
  MockRateLimitService,
  RateLimitTestDataFactory,
  RateLimitTestAssertions,
  type MockRateLimitOptions
} from '../mocks/rate-limit-service.mock'

describe('Rate Limiting - Gherkin Scenarios', () => {
  let mockService: MockRateLimitService
  let userId: string

  beforeEach(() => {
    mockService = new MockRateLimitService()
    userId = RateLimitTestDataFactory.createUserId('gherkin')
    mockService.setMockTime(new Date('2025-09-29T10:00:00Z').getTime())
  })

  describe('Feature: Free Tier Rate Limiting', () => {
    describe('Scenario: New user making first request', () => {
      test('GIVEN a new free tier user with no previous requests, WHEN they make their first API request, THEN they should be allowed with 99 requests remaining', async () => {
        // GIVEN: A new free tier user with no previous requests
        const freeTierOptions: MockRateLimitOptions = { tier: 'free' }
        const endpoint = '/v1/data/timeseries'

        // WHEN: They make their first API request
        const result = await mockService.checkRateLimit(userId, endpoint, freeTierOptions)

        // THEN: They should be allowed with 99 requests remaining
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(99)
        expect(result.headers['X-RateLimit-Limit']).toBe('100')
        expect(result.headers['X-RateLimit-Remaining']).toBe('99')
        expect(result.retryAfter).toBeUndefined()
      })
    })

    describe('Scenario: User approaching rate limit', () => {
      test('GIVEN a free tier user has made 95 requests, WHEN they make 5 more requests, THEN all should be allowed within the regular limit', async () => {
        // GIVEN: A free tier user has made 95 requests
        const freeTierOptions: MockRateLimitOptions = { tier: 'free' }
        const endpoint = '/v1/data/timeseries'
        mockService.setState(userId, endpoint, 'free', {
          count: 95,
          resetTime: mockService.getCurrentTime() + 3600000,
          windowStartTime: mockService.getCurrentTime(),
          burstUsed: 0
        })

        // WHEN: They make 5 more requests
        const results = []
        for (let i = 0; i < 5; i++) {
          const result = await mockService.checkRateLimit(userId, endpoint, freeTierOptions)
          results.push(result)
        }

        // THEN: All should be allowed within the regular limit
        results.forEach((result, index) => {
          expect(result.allowed).toBe(true)
          if (index < 5) { // Within regular limit
            const expectedRemaining = 100 - (95 + index + 1) + 10 // Include burst in remaining
            expect(result.remaining).toBe(expectedRemaining)
          }
        })
      })
    })

    describe('Scenario: User hitting rate limit with burst available', () => {
      test('GIVEN a free tier user has made exactly 100 requests, WHEN they make 10 more requests, THEN all should be allowed using burst capacity', async () => {
        // GIVEN: A free tier user has made exactly 100 requests
        const freeTierOptions: MockRateLimitOptions = { tier: 'free' }
        const endpoint = '/v1/data/timeseries'
        mockService.setState(userId, endpoint, 'free', {
          count: 100,
          resetTime: mockService.getCurrentTime() + 3600000,
          windowStartTime: mockService.getCurrentTime(),
          burstUsed: 0
        })

        // WHEN: They make 10 more requests
        const results = []
        for (let i = 0; i < 10; i++) {
          const result = await mockService.checkRateLimit(userId, endpoint, freeTierOptions)
          results.push(result)
        }

        // THEN: All should be allowed using burst capacity
        results.forEach((result, index) => {
          expect(result.allowed).toBe(true)
          const expectedRemaining = 10 - (index + 1) - 1 // Burst remaining after this request
          expect(result.remaining).toBe(expectedRemaining)
        })
      })
    })

    describe('Scenario: User exceeding all limits', () => {
      test('GIVEN a free tier user has exhausted both regular limit and burst, WHEN they make another request, THEN they should be blocked with proper retry information', async () => {
        // GIVEN: A free tier user has exhausted both regular limit and burst
        const freeTierOptions: MockRateLimitOptions = { tier: 'free' }
        const endpoint = '/v1/data/timeseries'
        mockService.setState(userId, endpoint, 'free', {
          count: 100,
          resetTime: mockService.getCurrentTime() + 3600000,
          windowStartTime: mockService.getCurrentTime(),
          burstUsed: 10 // All burst used
        })

        // WHEN: They make another request
        const result = await mockService.checkRateLimit(userId, endpoint, freeTierOptions)

        // THEN: They should be blocked with proper retry information
        expect(result.allowed).toBe(false)
        expect(result.remaining).toBe(0)
        expect(result.retryAfter).toBeGreaterThan(0)
        expect(result.headers['Retry-After']).toBeDefined()
        expect(result.headers['X-RateLimit-Remaining']).toBe('0')
      })
    })

    describe('Scenario: Rate limit window reset', () => {
      test('GIVEN a free tier user exceeded limits 2 hours ago, WHEN they make a request now, THEN their limits should be reset and request allowed', async () => {
        // GIVEN: A free tier user exceeded limits 2 hours ago
        const freeTierOptions: MockRateLimitOptions = { tier: 'free' }
        const endpoint = '/v1/data/timeseries'
        const twoHoursAgo = mockService.getCurrentTime() - 7200000 // 2 hours ago

        mockService.setState(userId, endpoint, 'free', {
          count: 110,
          resetTime: twoHoursAgo + 3600000, // Would have reset 1 hour ago
          windowStartTime: twoHoursAgo,
          burstUsed: 10
        })

        // WHEN: They make a request now
        const result = await mockService.checkRateLimit(userId, endpoint, freeTierOptions)

        // THEN: Their limits should be reset and request allowed
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(99) // Fresh window: 100 + 10 burst - 1 request = 109, but shows regular remaining
        expect(result.headers['X-RateLimit-Remaining']).toBe('99')
      })
    })
  })

  describe('Feature: Professional Tier Rate Limiting', () => {
    describe('Scenario: Professional user with high volume needs', () => {
      test('GIVEN a professional tier user, WHEN they make 5000 requests rapidly, THEN all should be allowed within their generous limits', async () => {
        // GIVEN: A professional tier user
        const professionalOptions: MockRateLimitOptions = { tier: 'professional' }
        const endpoint = '/v1/data/timeseries'

        // WHEN: They make 5000 requests rapidly
        const requestCount = 100 // Using smaller number for test performance
        const results = []

        for (let i = 0; i < requestCount; i++) {
          const result = await mockService.checkRateLimit(userId, endpoint, professionalOptions)
          results.push(result)
        }

        // THEN: All should be allowed within their generous limits
        results.forEach(result => {
          expect(result.allowed).toBe(true)
          expect(result.headers['X-RateLimit-Limit']).toBe('10000')
        })

        // Last request should still have significant remaining capacity
        const lastResult = results[results.length - 1]
        expect(lastResult.remaining).toBeGreaterThan(10000 - requestCount - 1)
      })
    })

    describe('Scenario: Professional user at limit using burst', () => {
      test('GIVEN a professional user has made 10000 requests, WHEN they make 500 more requests, THEN all should be allowed using burst capacity', async () => {
        // GIVEN: A professional user has made 10000 requests
        const professionalOptions: MockRateLimitOptions = { tier: 'professional' }
        const endpoint = '/v1/data/timeseries'
        mockService.setState(userId, endpoint, 'professional', {
          count: 10000,
          resetTime: mockService.getCurrentTime() + 3600000,
          windowStartTime: mockService.getCurrentTime(),
          burstUsed: 0
        })

        // WHEN: They make 500 more requests
        const burstRequestCount = 50 // Using smaller number for test performance
        const results = []

        for (let i = 0; i < burstRequestCount; i++) {
          const result = await mockService.checkRateLimit(userId, endpoint, professionalOptions)
          results.push(result)
        }

        // THEN: All should be allowed using burst capacity
        results.forEach((result, index) => {
          expect(result.allowed).toBe(true)
          const expectedRemaining = 1000 - (index + 1) - 1
          expect(result.remaining).toBe(expectedRemaining)
        })
      })
    })

    describe('Scenario: Professional user exceeding all limits', () => {
      test('GIVEN a professional user has used 10000 regular + 1000 burst requests, WHEN they make another request, THEN they should be rate limited', async () => {
        // GIVEN: A professional user has used all limits
        const professionalOptions: MockRateLimitOptions = { tier: 'professional' }
        const endpoint = '/v1/data/timeseries'
        mockService.setState(userId, endpoint, 'professional', {
          count: 10000,
          resetTime: mockService.getCurrentTime() + 3600000,
          windowStartTime: mockService.getCurrentTime(),
          burstUsed: 1000
        })

        // WHEN: They make another request
        const result = await mockService.checkRateLimit(userId, endpoint, professionalOptions)

        // THEN: They should be rate limited
        expect(result.allowed).toBe(false)
        expect(result.remaining).toBe(0)
        expect(result.retryAfter).toBeGreaterThan(0)
        expect(result.headers['X-RateLimit-Limit']).toBe('10000')
      })
    })
  })

  describe('Feature: Enterprise Tier Rate Limiting', () => {
    describe('Scenario: Enterprise user with massive volume', () => {
      test('GIVEN an enterprise tier user, WHEN they make requests at scale, THEN they should have generous limits appropriate for enterprise usage', async () => {
        // GIVEN: An enterprise tier user
        const enterpriseOptions: MockRateLimitOptions = { tier: 'enterprise' }
        const endpoint = '/v1/data/timeseries'

        // WHEN: They make requests at scale
        const result = await mockService.checkRateLimit(userId, endpoint, enterpriseOptions)

        // THEN: They should have generous limits appropriate for enterprise usage
        expect(result.allowed).toBe(true)
        expect(result.headers['X-RateLimit-Limit']).toBe('50000')
        expect(result.remaining).toBe(54999) // 50000 + 5000 burst - 1
        expect(result.headers['X-RateLimit-Remaining']).toBe('54999')
      })
    })
  })

  describe('Feature: Cross-User Isolation', () => {
    describe('Scenario: Independent rate limiting per user', () => {
      test('GIVEN user A has exhausted their rate limit, WHEN user B makes a request, THEN user B should not be affected by user A\'s limit', async () => {
        // GIVEN: User A has exhausted their rate limit
        const userA = RateLimitTestDataFactory.createUserId('userA')
        const userB = RateLimitTestDataFactory.createUserId('userB')
        const endpoint = '/v1/data/timeseries'
        const freeOptions: MockRateLimitOptions = { tier: 'free' }

        mockService.setState(userA, endpoint, 'free', {
          count: 100,
          resetTime: mockService.getCurrentTime() + 3600000,
          windowStartTime: mockService.getCurrentTime(),
          burstUsed: 10
        })

        // WHEN: User B makes a request
        const resultA = await mockService.checkRateLimit(userA, endpoint, freeOptions)
        const resultB = await mockService.checkRateLimit(userB, endpoint, freeOptions)

        // THEN: User B should not be affected by user A's limit
        expect(resultA.allowed).toBe(false) // User A blocked
        expect(resultB.allowed).toBe(true)  // User B allowed
        expect(resultB.remaining).toBe(99)  // User B has fresh limits
      })
    })

    describe('Scenario: Independent rate limiting per endpoint', () => {
      test('GIVEN a user has exhausted limits on endpoint A, WHEN they make a request to endpoint B, THEN endpoint B should have independent limits', async () => {
        // GIVEN: A user has exhausted limits on endpoint A
        const endpointA = '/v1/data/timeseries'
        const endpointB = '/v1/data/analytics'
        const freeOptions: MockRateLimitOptions = { tier: 'free' }

        mockService.setState(userId, endpointA, 'free', {
          count: 100,
          resetTime: mockService.getCurrentTime() + 3600000,
          windowStartTime: mockService.getCurrentTime(),
          burstUsed: 10
        })

        // WHEN: They make a request to endpoint B
        const resultA = await mockService.checkRateLimit(userId, endpointA, freeOptions)
        const resultB = await mockService.checkRateLimit(userId, endpointB, freeOptions)

        // THEN: Endpoint B should have independent limits
        expect(resultA.allowed).toBe(false) // Endpoint A blocked
        expect(resultB.allowed).toBe(true)  // Endpoint B allowed
        expect(resultB.remaining).toBe(99)  // Endpoint B has fresh limits
      })
    })
  })

  describe('Feature: Error Handling and Edge Cases', () => {
    describe('Scenario: Storage system failure', () => {
      test('GIVEN the rate limiting storage system is unavailable, WHEN a user makes a request, THEN the system should handle the failure gracefully', async () => {
        // GIVEN: The rate limiting storage system is unavailable
        mockService.simulateStorageFailure(true)
        const freeOptions: MockRateLimitOptions = { tier: 'free' }

        // WHEN: A user makes a request
        const requestPromise = mockService.checkRateLimit(userId, '/v1/data/timeseries', freeOptions)

        // THEN: The system should handle the failure gracefully
        await expect(requestPromise).rejects.toThrow('Rate limit storage unavailable')
      })
    })

    describe('Scenario: Time synchronization edge case', () => {
      test('GIVEN a user\'s rate limit window is about to reset, WHEN they make a request exactly at reset time, THEN the system should handle the timing correctly', async () => {
        // GIVEN: A user's rate limit window is about to reset
        const endpoint = '/v1/data/timeseries'
        const freeOptions: MockRateLimitOptions = { tier: 'free' }
        const currentTime = mockService.getCurrentTime()

        mockService.setState(userId, endpoint, 'free', {
          count: 110,
          resetTime: currentTime + 1, // Resets in 1ms
          windowStartTime: currentTime - 3599999, // Window started almost 1 hour ago
          burstUsed: 10
        })

        // WHEN: They make a request exactly at reset time
        mockService.setMockTime(currentTime + 1) // Advance to reset time
        const result = await mockService.checkRateLimit(userId, endpoint, freeOptions)

        // THEN: The system should handle the timing correctly
        expect(result.allowed).toBe(true) // Should be allowed due to reset
        expect(result.remaining).toBe(99) // Fresh window
      })
    })

    describe('Scenario: Concurrent burst requests', () => {
      test('GIVEN a user is at their rate limit, WHEN they make 20 concurrent requests, THEN only the burst allowance should succeed', async () => {
        // GIVEN: A user is at their rate limit
        const endpoint = '/v1/data/timeseries'
        const freeOptions: MockRateLimitOptions = { tier: 'free' }
        mockService.setState(userId, endpoint, 'free', {
          count: 100,
          resetTime: mockService.getCurrentTime() + 3600000,
          windowStartTime: mockService.getCurrentTime(),
          burstUsed: 0
        })

        // WHEN: They make 20 concurrent requests
        const concurrentRequests = 20
        const promises = Array.from({ length: concurrentRequests }, () =>
          mockService.checkRateLimit(userId, endpoint, freeOptions)
        )
        const results = await Promise.all(promises)

        // THEN: Only the burst allowance should succeed
        const allowed = results.filter(r => r.allowed)
        const blocked = results.filter(r => !r.allowed)

        expect(allowed.length).toBeLessThanOrEqual(10) // At most 10 burst
        expect(blocked.length).toBeGreaterThanOrEqual(10) // At least 10 blocked
        expect(allowed.length + blocked.length).toBe(concurrentRequests)
      })
    })

    describe('Scenario: Custom rate limit configuration', () => {
      test('GIVEN a user has custom rate limits configured, WHEN they make requests, THEN the custom limits should be enforced', async () => {
        // GIVEN: A user has custom rate limits configured
        const customOptions: MockRateLimitOptions = {
          tier: 'free',
          customLimits: {
            requests: 25,  // Custom lower limit
            burst: 5       // Custom lower burst
          }
        }
        const endpoint = '/v1/data/timeseries'

        // WHEN: They make requests up to and beyond custom limits
        const results = []
        for (let i = 0; i < 35; i++) { // 25 + 5 burst + 5 over
          const result = await mockService.checkRateLimit(userId, endpoint, customOptions)
          results.push(result)
        }

        // THEN: The custom limits should be enforced
        const allowed = results.filter(r => r.allowed)
        const blocked = results.filter(r => !r.allowed)

        expect(allowed.length).toBe(30) // 25 + 5 burst
        expect(blocked.length).toBe(5)  // 5 over custom limits
        expect(results[0].headers['X-RateLimit-Limit']).toBe('25')
      })
    })
  })

  describe('Feature: Response Headers and Metadata', () => {
    describe('Scenario: Consistent header information', () => {
      test('GIVEN any rate limiting scenario, WHEN checking limits, THEN response headers should always be present and consistent', async () => {
        // GIVEN: Various rate limiting scenarios
        const scenarios = [
          { tier: 'free' as const, description: 'Free tier user' },
          { tier: 'professional' as const, description: 'Professional tier user' },
          { tier: 'enterprise' as const, description: 'Enterprise tier user' }
        ]

        for (const scenario of scenarios) {
          // WHEN: Checking limits
          const result = await mockService.checkRateLimit(userId, '/v1/data/timeseries', scenario)

          // THEN: Response headers should always be present and consistent
          expect(result.headers['X-RateLimit-Limit']).toBeDefined()
          expect(result.headers['X-RateLimit-Remaining']).toBeDefined()
          expect(result.headers['X-RateLimit-Reset']).toBeDefined()
          expect(result.headers['X-RateLimit-Window']).toBeDefined()

          // Validate header formats
          expect(result.headers['X-RateLimit-Limit']).toMatch(/^\d+$/)
          expect(result.headers['X-RateLimit-Remaining']).toMatch(/^\d+$/)
          expect(result.headers['X-RateLimit-Reset']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        }
      })
    })

    describe('Scenario: Rate limit exceeded headers', () => {
      test('GIVEN a user exceeds their rate limit, WHEN they make another request, THEN the response should include retry-after information', async () => {
        // GIVEN: A user exceeds their rate limit
        const freeOptions: MockRateLimitOptions = { tier: 'free' }
        const endpoint = '/v1/data/timeseries'
        mockService.setState(userId, endpoint, 'free', {
          count: 100,
          resetTime: mockService.getCurrentTime() + 3600000,
          windowStartTime: mockService.getCurrentTime(),
          burstUsed: 10
        })

        // WHEN: They make another request
        const result = await mockService.checkRateLimit(userId, endpoint, freeOptions)

        // THEN: The response should include retry-after information
        expect(result.allowed).toBe(false)
        expect(result.retryAfter).toBeGreaterThan(0)
        expect(result.headers['Retry-After']).toBeDefined()
        expect(result.headers['Retry-After']).toMatch(/^\d+$/)
        expect(parseInt(result.headers['Retry-After'])).toBeGreaterThan(0)
      })
    })
  })
})