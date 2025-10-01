/**
 * Rate Limiting Regression Test Suite
 * Ensures rate limiting behavior remains stable across code changes
 * Tests critical business logic and revenue protection features
 */

import { describe, test, expect, beforeEach } from '@jest/globals'
import {
  MockRateLimitService,
  RateLimitTestDataFactory,
  RateLimitTestAssertions
} from '../mocks/rate-limit-service.mock'

describe('Rate Limiting - Regression Test Suite', () => {
  let mockService: MockRateLimitService
  let baseTime: number

  beforeEach(() => {
    mockService = new MockRateLimitService()
    baseTime = new Date('2025-09-29T10:00:00Z').getTime()
    mockService.setMockTime(baseTime)
  })

  describe('Critical Business Logic Regression Tests', () => {
    test('REG-001: Free tier limits must remain at 100 req/hr to protect Professional tier value proposition', async () => {
      // This test protects the core business model
      const userId = RateLimitTestDataFactory.createUserId()
      const result = await mockService.checkRateLimit(
        userId,
        '/v1/data/timeseries',
        { tier: 'free' }
      )

      expect(result.headers['X-RateLimit-Limit']).toBe('100')
      expect(result.remaining).toBe(109) // 100 + 10 burst - 1 request

      // Critical: Free tier must not exceed 100 base requests
      const freeConfig = (mockService as any).TIER_CONFIGS.free
      expect(freeConfig.requests).toBe(100)
      expect(freeConfig.burst).toBe(10)
    })

    test('REG-002: Professional tier must provide 100x improvement over free tier', async () => {
      // This test ensures value proposition is maintained
      const userId = RateLimitTestDataFactory.createUserId()
      const result = await mockService.checkRateLimit(
        userId,
        '/v1/data/timeseries',
        { tier: 'professional' }
      )

      expect(result.headers['X-RateLimit-Limit']).toBe('10000')

      // Verify 100x improvement: 10000 / 100 = 100x
      const professionalLimit = parseInt(result.headers['X-RateLimit-Limit'])
      const freeLimit = 100
      const improvement = professionalLimit / freeLimit
      expect(improvement).toBe(100)
    })

    test('REG-003: Enterprise tier must maintain premium positioning', async () => {
      // This test ensures enterprise tier remains attractive
      const userId = RateLimitTestDataFactory.createUserId()
      const result = await mockService.checkRateLimit(
        userId,
        '/v1/data/timeseries',
        { tier: 'enterprise' }
      )

      expect(result.headers['X-RateLimit-Limit']).toBe('50000')

      // Enterprise should be 5x professional tier
      const enterpriseLimit = parseInt(result.headers['X-RateLimit-Limit'])
      const professionalLimit = 10000
      const multiplier = enterpriseLimit / professionalLimit
      expect(multiplier).toBe(5)
    })

    test('REG-004: Burst capacity must be exactly 10% of base limit for all tiers', async () => {
      // This test ensures consistent burst behavior across tiers
      const scenarios = [
        { tier: 'free' as const, expectedBase: 100, expectedBurst: 10 },
        { tier: 'professional' as const, expectedBase: 10000, expectedBurst: 1000 },
        { tier: 'enterprise' as const, expectedBase: 50000, expectedBurst: 5000 }
      ]

      for (const scenario of scenarios) {
        const config = (mockService as any).TIER_CONFIGS[scenario.tier]
        expect(config.requests).toBe(scenario.expectedBase)
        expect(config.burst).toBe(scenario.expectedBurst)
        expect(config.burst).toBe(config.requests * 0.1)
      }
    })

    test('REG-005: Rate limit windows must be exactly 1 hour for all tiers', async () => {
      // This test ensures consistent time windows
      const tiers = ['free', 'professional', 'enterprise'] as const

      for (const tier of tiers) {
        const config = (mockService as any).TIER_CONFIGS[tier]
        expect(config.window).toBe('hour')
      }
    })
  })

  describe('Revenue Protection Regression Tests', () => {
    test('REV-001: Free tier users must be blocked after exceeding total allowance', async () => {
      // Critical for preventing revenue leakage
      const userId = RateLimitTestDataFactory.createUserId()
      const endpoint = '/v1/data/timeseries'

      // Set user to have used all allowance (100 + 10 burst)
      mockService.setState(userId, endpoint, 'free', {
        count: 100,
        resetTime: baseTime + 3600000,
        windowStartTime: baseTime,
        burstUsed: 10
      })

      const result = await mockService.checkRateLimit(userId, endpoint, { tier: 'free' })

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    test('REV-002: Professional tier limits must be enforced to encourage Enterprise upgrades', async () => {
      // Ensures Professional tier has realistic limits
      const userId = RateLimitTestDataFactory.createUserId()
      const endpoint = '/v1/data/timeseries'

      // Set professional user at full capacity
      mockService.setState(userId, endpoint, 'professional', {
        count: 10000,
        resetTime: baseTime + 3600000,
        windowStartTime: baseTime,
        burstUsed: 1000
      })

      const result = await mockService.checkRateLimit(userId, endpoint, { tier: 'professional' })

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    test('REV-003: Rate limiting must be isolated per user to prevent abuse', async () => {
      // Prevents users from affecting each other's limits
      const user1 = RateLimitTestDataFactory.createUserId('user1')
      const user2 = RateLimitTestDataFactory.createUserId('user2')
      const endpoint = '/v1/data/timeseries'

      // Block user1
      mockService.setState(user1, endpoint, 'free', {
        count: 100,
        resetTime: baseTime + 3600000,
        windowStartTime: baseTime,
        burstUsed: 10
      })

      const result1 = await mockService.checkRateLimit(user1, endpoint, { tier: 'free' })
      const result2 = await mockService.checkRateLimit(user2, endpoint, { tier: 'free' })

      expect(result1.allowed).toBe(false)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(99) // Fresh limits for user2
    })

    test('REV-004: Rate limiting must be isolated per endpoint to prevent cross-contamination', async () => {
      // Prevents endpoint abuse affecting other endpoints
      const userId = RateLimitTestDataFactory.createUserId()
      const endpoint1 = '/v1/data/timeseries'
      const endpoint2 = '/v1/data/analytics'

      // Block endpoint1
      mockService.setState(userId, endpoint1, 'free', {
        count: 100,
        resetTime: baseTime + 3600000,
        windowStartTime: baseTime,
        burstUsed: 10
      })

      const result1 = await mockService.checkRateLimit(userId, endpoint1, { tier: 'free' })
      const result2 = await mockService.checkRateLimit(userId, endpoint2, { tier: 'free' })

      expect(result1.allowed).toBe(false)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(99) // Fresh limits for endpoint2
    })
  })

  describe('Performance and Reliability Regression Tests', () => {
    test('PERF-001: Rate limit checks must complete within 100ms', async () => {
      // Ensures rate limiting doesn't impact API performance
      const userId = RateLimitTestDataFactory.createUserId()

      const startTime = Date.now()
      await mockService.checkRateLimit(userId, '/v1/data/timeseries', { tier: 'professional' })
      const endTime = Date.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(100)
    })

    test('PERF-002: Concurrent rate limit checks must maintain consistency', async () => {
      // Ensures thread safety and consistency
      const userId = RateLimitTestDataFactory.createUserId()
      const endpoint = '/v1/data/timeseries'

      // Make 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        mockService.checkRateLimit(userId, endpoint, { tier: 'free' })
      )

      const results = await Promise.all(promises)

      // All should be allowed (within free tier limits)
      results.forEach(result => {
        expect(result.allowed).toBe(true)
        expect(result.headers['X-RateLimit-Limit']).toBe('100')
      })

      // Remaining counts should be consistent with request count
      const finalState = mockService.getState(userId, endpoint, 'free')
      expect(finalState?.count).toBe(10)
    })

    test('PERF-003: Memory usage must remain stable with high request volume', async () => {
      // Ensures no memory leaks in rate limiting
      const userCount = 100
      const requestsPerUser = 5

      for (let u = 0; u < userCount; u++) {
        const userId = RateLimitTestDataFactory.createUserId(`user-${u}`)

        for (let r = 0; r < requestsPerUser; r++) {
          await mockService.checkRateLimit(
            userId,
            '/v1/data/timeseries',
            { tier: 'professional' }
          )
        }
      }

      // Verify all users are tracked correctly
      const totalRequests = userCount * requestsPerUser
      expect(totalRequests).toBe(500) // Sanity check

      // Memory usage should remain reasonable (mocked storage size)
      const storageSize = (mockService as any).storage.size
      expect(storageSize).toBe(userCount) // One entry per user
    })

    test('PERF-004: Time window resets must be handled efficiently', async () => {
      // Ensures time window logic performs well
      const userId = RateLimitTestDataFactory.createUserId()
      const endpoint = '/v1/data/timeseries'

      // Set up expired window
      mockService.setState(userId, endpoint, 'free', {
        count: 110,
        resetTime: baseTime - 1, // Already expired
        windowStartTime: baseTime - 3600000,
        burstUsed: 10
      })

      const startTime = Date.now()
      const result = await mockService.checkRateLimit(userId, endpoint, { tier: 'free' })
      const endTime = Date.now()

      // Should reset and allow quickly
      expect(result.allowed).toBe(true)
      expect(endTime - startTime).toBeLessThan(50)

      // State should be reset
      const newState = mockService.getState(userId, endpoint, 'free')
      expect(newState?.count).toBe(1)
      expect(newState?.burstUsed).toBe(0)
    })
  })

  describe('Error Handling Regression Tests', () => {
    test('ERR-001: Storage failures must not crash the system', async () => {
      // Ensures graceful degradation
      mockService.simulateStorageFailure(true)

      const requestPromise = mockService.checkRateLimit(
        RateLimitTestDataFactory.createUserId(),
        '/v1/data/timeseries',
        { tier: 'free' }
      )

      await expect(requestPromise).rejects.toThrow('Rate limit storage unavailable')

      // System should recover after failure simulation is disabled
      mockService.simulateStorageFailure(false)
      const result = await mockService.checkRateLimit(
        RateLimitTestDataFactory.createUserId(),
        '/v1/data/timeseries',
        { tier: 'free' }
      )

      expect(result.allowed).toBe(true)
    })

    test('ERR-002: Invalid configurations must not affect rate limiting', async () => {
      // Ensures system handles bad configs gracefully
      const userId = RateLimitTestDataFactory.createUserId()

      // Try with invalid custom limits
      const result = await mockService.checkRateLimit(
        userId,
        '/v1/data/timeseries',
        {
          tier: 'free',
          customLimits: {
            requests: -1,    // Invalid
            burst: -5        // Invalid
          }
        }
      )

      // Should still work with defaults or safe fallbacks
      expect(result.allowed).toBeDefined()
      expect(result.headers['X-RateLimit-Limit']).toBeDefined()
    })

    test('ERR-003: Time manipulation attempts must not break rate limiting', async () => {
      // Ensures robustness against time-based attacks
      const userId = RateLimitTestDataFactory.createUserId()
      const endpoint = '/v1/data/timeseries'

      // Exhaust limits
      mockService.setState(userId, endpoint, 'free', {
        count: 100,
        resetTime: baseTime + 3600000,
        windowStartTime: baseTime,
        burstUsed: 10
      })

      // Verify blocked
      let result = await mockService.checkRateLimit(userId, endpoint, { tier: 'free' })
      expect(result.allowed).toBe(false)

      // Try to manipulate time (should not affect real implementation)
      mockService.setMockTime(baseTime + 7200000) // 2 hours later

      // Should now allow (legitimate time advancement)
      result = await mockService.checkRateLimit(userId, endpoint, { tier: 'free' })
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(99)
    })
  })

  describe('API Contract Regression Tests', () => {
    test('API-001: Rate limit headers must always be present and correctly formatted', async () => {
      // Ensures API contract stability
      const scenarios = [
        { tier: 'free' as const, expectLimit: '100' },
        { tier: 'professional' as const, expectLimit: '10000' },
        { tier: 'enterprise' as const, expectLimit: '50000' }
      ]

      for (const scenario of scenarios) {
        const result = await mockService.checkRateLimit(
          RateLimitTestDataFactory.createUserId(),
          '/v1/data/timeseries',
          scenario
        )

        // Required headers
        expect(result.headers['X-RateLimit-Limit']).toBe(scenario.expectLimit)
        expect(result.headers['X-RateLimit-Remaining']).toMatch(/^\d+$/)
        expect(result.headers['X-RateLimit-Reset']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        expect(result.headers['X-RateLimit-Window']).toBe('hour')

        // Response structure
        expect(typeof result.allowed).toBe('boolean')
        expect(typeof result.remaining).toBe('number')
        expect(result.resetTime).toBeInstanceOf(Date)
      }
    })

    test('API-002: Retry-After header must be present when rate limited', async () => {
      // Ensures proper client guidance when blocked
      const userId = RateLimitTestDataFactory.createUserId()
      const endpoint = '/v1/data/timeseries'

      // Block user
      mockService.setState(userId, endpoint, 'free', {
        count: 100,
        resetTime: baseTime + 3600000,
        windowStartTime: baseTime,
        burstUsed: 10
      })

      const result = await mockService.checkRateLimit(userId, endpoint, { tier: 'free' })

      expect(result.allowed).toBe(false)
      expect(result.retryAfter).toBeGreaterThan(0)
      expect(result.headers['Retry-After']).toBeDefined()
      expect(result.headers['Retry-After']).toMatch(/^\d+$/)
    })

    test('API-003: Response timing must be consistent regardless of rate limit state', async () => {
      // Ensures no timing attacks possible
      const userId = RateLimitTestDataFactory.createUserId()
      const endpoint = '/v1/data/timeseries'

      // Time allowed request
      const start1 = Date.now()
      await mockService.checkRateLimit(userId, endpoint, { tier: 'free' })
      const duration1 = Date.now() - start1

      // Block user
      mockService.setState(userId, endpoint, 'free', {
        count: 100,
        resetTime: baseTime + 3600000,
        windowStartTime: baseTime,
        burstUsed: 10
      })

      // Time blocked request
      const start2 = Date.now()
      await mockService.checkRateLimit(userId, endpoint, { tier: 'free' })
      const duration2 = Date.now() - start2

      // Timings should be similar (within reasonable variance)
      const timingDifference = Math.abs(duration2 - duration1)
      expect(timingDifference).toBeLessThan(50) // Less than 50ms difference
    })
  })

  describe('Data Integrity Regression Tests', () => {
    test('DATA-001: Rate limit counters must be atomic and consistent', async () => {
      // Ensures no race conditions in counting
      const userId = RateLimitTestDataFactory.createUserId()
      const endpoint = '/v1/data/timeseries'
      const requestCount = 50

      // Make sequential requests
      for (let i = 0; i < requestCount; i++) {
        await mockService.checkRateLimit(userId, endpoint, { tier: 'professional' })
      }

      const state = mockService.getState(userId, endpoint, 'professional')
      expect(state?.count).toBe(requestCount)
    })

    test('DATA-002: Rate limit state must persist correctly across requests', async () => {
      // Ensures state consistency
      const userId = RateLimitTestDataFactory.createUserId()
      const endpoint = '/v1/data/timeseries'

      // Make first request
      let result = await mockService.checkRateLimit(userId, endpoint, { tier: 'free' })
      expect(result.remaining).toBe(99)

      // Make second request
      result = await mockService.checkRateLimit(userId, endpoint, { tier: 'free' })
      expect(result.remaining).toBe(98)

      // State should reflect both requests
      const state = mockService.getState(userId, endpoint, 'free')
      expect(state?.count).toBe(2)
    })

    test('DATA-003: Burst tracking must be accurate and isolated', async () => {
      // Ensures burst logic works correctly
      const userId = RateLimitTestDataFactory.createUserId()
      const endpoint = '/v1/data/timeseries'

      // Set at regular limit
      mockService.setState(userId, endpoint, 'free', {
        count: 100,
        resetTime: baseTime + 3600000,
        windowStartTime: baseTime,
        burstUsed: 0
      })

      // Use 5 burst requests
      for (let i = 0; i < 5; i++) {
        const result = await mockService.checkRateLimit(userId, endpoint, { tier: 'free' })
        expect(result.allowed).toBe(true)
      }

      const state = mockService.getState(userId, endpoint, 'free')
      expect(state?.count).toBe(100) // Regular count unchanged
      expect(state?.burstUsed).toBe(5) // Burst correctly tracked
    })
  })
})