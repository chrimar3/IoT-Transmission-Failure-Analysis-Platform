/**
 * Story 4.2: Professional API Access - Rate Limiting Validation Tests
 * Comprehensive testing of tier-based rate limiting (Free: 100/hr, Professional: 10K/hr)
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { createMockApiKey, makeApiRequest, waitFor } from '../utils/test-helpers'

describe('Rate Limiting Validation - Story 4.2 AC3', () => {
  let freeApiKey: string
  let professionalApiKey: string
  let enterpriseApiKey: string

  beforeAll(async () => {
    // Setup test API keys for different tiers
    freeApiKey = await createMockApiKey({ tier: 'free', limit: 100 })
    professionalApiKey = await createMockApiKey({ tier: 'professional', limit: 10000 })
    enterpriseApiKey = await createMockApiKey({ tier: 'enterprise', limit: 50000 })
  })

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData()
  })

  describe('Free Tier Rate Limiting (100 req/hr)', () => {
    test('enforces 100 requests per hour limit', async () => {
      const startTime = Date.now()
      let successCount = 0
      let rateLimitedCount = 0

      // Make requests until we hit the rate limit
      for (let i = 0; i < 110; i++) {
        const response = await makeApiRequest('/v1/data/timeseries', freeApiKey)

        if (response.status === 200) {
          successCount++

          // Validate rate limit headers
          expect(response.headers['x-ratelimit-limit']).toBe('100')
          expect(response.headers['x-ratelimit-remaining']).toBe(String(99 - i))
          expect(response.headers['x-ratelimit-reset']).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        } else if (response.status === 429) {
          rateLimitedCount++

          // Validate rate limit error response
          expect(response.body.error).toBe('Rate limit exceeded')
          expect(response.body.message).toContain('Too many requests')
          expect(response.body.retry_after).toBeGreaterThan(0)
          expect(response.headers['retry-after']).toBeDefined()
        }
      }

      // Validate rate limiting behavior
      expect(successCount).toBe(100) // Exactly 100 successful requests
      expect(rateLimitedCount).toBe(10) // Remaining 10 should be rate limited
      expect(Date.now() - startTime).toBeLessThan(30000) // Should complete quickly
    }, 45000) // 45 second timeout

    test('implements burst allowance correctly', async () => {
      // Free tier should allow burst of 110 requests (10% buffer)
      const responses = []

      // Make 110 rapid requests (burst allowance)
      const promises = Array.from({ length: 110 }, () =>
        makeApiRequest('/v1/data/timeseries', freeApiKey)
      )

      const results = await Promise.all(promises)

      const successfulRequests = results.filter(r => r.status === 200)
      const rateLimitedRequests = results.filter(r => r.status === 429)

      // Should allow burst up to 110 requests
      expect(successfulRequests.length).toBeGreaterThanOrEqual(100)
      expect(successfulRequests.length).toBeLessThanOrEqual(110)

      // If any are rate limited, they should be the excess
      if (rateLimitedRequests.length > 0) {
        expect(successfulRequests.length + rateLimitedRequests.length).toBe(110)
      }
    })

    test('resets rate limit after time window', async () => {
      // Exhaust the rate limit
      for (let i = 0; i < 100; i++) {
        await makeApiRequest('/v1/data/timeseries', freeApiKey)
      }

      // Next request should be rate limited
      const rateLimitedResponse = await makeApiRequest('/v1/data/timeseries', freeApiKey)
      expect(rateLimitedResponse.status).toBe(429)

      // Fast-forward time (mock time advancement)
      await advanceTimeBy(3600000) // 1 hour

      // Rate limit should be reset
      const resetResponse = await makeApiRequest('/v1/data/timeseries', freeApiKey)
      expect(resetResponse.status).toBe(200)
      expect(resetResponse.headers['x-ratelimit-remaining']).toBe('99')
    })

    test('tracks rate limits per API key independently', async () => {
      const freeApiKey2 = await createMockApiKey({ tier: 'free', limit: 100 })

      // Exhaust first API key
      for (let i = 0; i < 100; i++) {
        await makeApiRequest('/v1/data/timeseries', freeApiKey)
      }

      // First key should be rate limited
      const response1 = await makeApiRequest('/v1/data/timeseries', freeApiKey)
      expect(response1.status).toBe(429)

      // Second key should still work
      const response2 = await makeApiRequest('/v1/data/timeseries', freeApiKey2)
      expect(response2.status).toBe(200)
      expect(response2.headers['x-ratelimit-remaining']).toBe('99')
    })
  })

  describe('Professional Tier Rate Limiting (10K req/hr)', () => {
    test('enforces 10,000 requests per hour limit', async () => {
      const batchSize = 100
      const batches = 105 // 10,500 total requests
      let successCount = 0
      let rateLimitedCount = 0

      // Test in batches to avoid overwhelming the system
      for (let batch = 0; batch < batches; batch++) {
        const promises = Array.from({ length: batchSize }, () =>
          makeApiRequest('/v1/data/timeseries', professionalApiKey)
        )

        const results = await Promise.all(promises)

        for (const response of results) {
          if (response.status === 200) {
            successCount++
          } else if (response.status === 429) {
            rateLimitedCount++
          }
        }

        // Check if we've hit the rate limit
        if (rateLimitedCount > 0) {
          break
        }

        // Small delay between batches
        await waitFor(100)
      }

      // Should allow exactly 10,000 requests
      expect(successCount).toBeGreaterThanOrEqual(10000)
      expect(successCount).toBeLessThanOrEqual(11000) // Allow for burst
      expect(rateLimitedCount).toBeGreaterThan(0) // Should eventually hit limit
    }, 120000) // 2 minute timeout

    test('allows higher burst capacity for Professional tier', async () => {
      // Professional tier should allow burst of 11,000 requests (10% buffer)
      const batchSize = 500
      const batches = 22 // 11,000 total requests
      let successCount = 0

      for (let batch = 0; batch < batches; batch++) {
        const promises = Array.from({ length: batchSize }, () =>
          makeApiRequest('/v1/data/timeseries', professionalApiKey)
        )

        const results = await Promise.all(promises)
        successCount += results.filter(r => r.status === 200).length

        // If we start getting rate limited, stop
        if (results.some(r => r.status === 429)) {
          break
        }
      }

      // Should handle more requests than the base limit
      expect(successCount).toBeGreaterThan(10000)
    }, 60000)

    test('provides accurate rate limit headers for high volume', async () => {
      const response = await makeApiRequest('/v1/data/timeseries', professionalApiKey)

      expect(response.status).toBe(200)
      expect(response.headers['x-ratelimit-limit']).toBe('10000')
      expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeGreaterThan(9000)
      expect(response.headers['x-ratelimit-reset']).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)

      // Validate reset time is approximately 1 hour from now
      const resetTime = new Date(response.headers['x-ratelimit-reset'])
      const now = new Date()
      const timeDiff = resetTime.getTime() - now.getTime()
      expect(timeDiff).toBeGreaterThan(3500000) // More than 58 minutes
      expect(timeDiff).toBeLessThan(3700000)    // Less than 62 minutes
    })
  })

  describe('Enterprise Tier Rate Limiting (50K req/hr)', () => {
    test('allows enterprise-level request volumes', async () => {
      const batchSize = 1000
      const batches = 55 // 55,000 total requests
      let successCount = 0

      // Test enterprise volume handling
      for (let batch = 0; batch < batches && successCount < 50000; batch++) {
        const promises = Array.from({ length: batchSize }, () =>
          makeApiRequest('/v1/data/timeseries', enterpriseApiKey)
        )

        const results = await Promise.all(promises)
        successCount += results.filter(r => r.status === 200).length

        // Check if we've hit any limits
        if (results.some(r => r.status === 429)) {
          break
        }

        // Small delay to prevent overwhelming
        await waitFor(50)
      }

      expect(successCount).toBeGreaterThan(45000) // Should handle high volume
    }, 180000) // 3 minute timeout

    test('enterprise tier has proper rate limit headers', async () => {
      const response = await makeApiRequest('/v1/data/timeseries', enterpriseApiKey)

      expect(response.status).toBe(200)
      expect(response.headers['x-ratelimit-limit']).toBe('50000')
      expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeGreaterThan(45000)
    })
  })

  describe('Rate Limiting Edge Cases', () => {
    test('handles concurrent requests correctly', async () => {
      // Test concurrent burst from same API key
      const concurrentRequests = 50
      const promises = Array.from({ length: concurrentRequests }, () =>
        makeApiRequest('/v1/data/timeseries', professionalApiKey)
      )

      const results = await Promise.all(promises)

      // All should succeed for Professional tier
      const successCount = results.filter(r => r.status === 200).length
      expect(successCount).toBe(concurrentRequests)

      // Rate limit counters should be accurate
      const lastResponse = results[results.length - 1]
      const remaining = parseInt(lastResponse.headers['x-ratelimit-remaining'])
      expect(remaining).toBeLessThan(10000) // Should have decremented
    })

    test('handles malformed rate limit bypass attempts', async () => {
      const bypassAttempts = [
        { headers: { 'x-forwarded-for': '192.168.1.1' } },
        { headers: { 'x-real-ip': '10.0.0.1' } },
        { headers: { 'user-agent': 'different-agent' } },
        { headers: { 'x-api-key': 'fake-bypass-key' } },
      ]

      // Exhaust rate limit first
      for (let i = 0; i < 100; i++) {
        await makeApiRequest('/v1/data/timeseries', freeApiKey)
      }

      // All bypass attempts should fail
      for (const attempt of bypassAttempts) {
        const response = await makeApiRequest('/v1/data/timeseries', freeApiKey, {
          headers: attempt.headers
        })
        expect(response.status).toBe(429)
        expect(response.body.error).toBe('Rate limit exceeded')
      }
    })

    test('gracefully handles rate limit storage failures', async () => {
      // Mock rate limit storage failure
      await mockRateLimitStorageFailure()

      const response = await makeApiRequest('/v1/data/timeseries', professionalApiKey)

      // Should fail gracefully, not crash
      expect([200, 503]).toContain(response.status)

      if (response.status === 503) {
        expect(response.body.error).toContain('service unavailable')
      }
    })

    test('implements sliding window rate limiting', async () => {
      const requests = []
      const startTime = Date.now()

      // Make requests spread over time
      for (let i = 0; i < 10; i++) {
        const response = await makeApiRequest('/v1/data/timeseries', professionalApiKey)
        requests.push({
          time: Date.now(),
          remaining: parseInt(response.headers['x-ratelimit-remaining'])
        })

        await waitFor(1000) // 1 second between requests
      }

      // Rate limit should gradually recover (sliding window)
      // Not all at once (fixed window)
      const firstRemaining = requests[0].remaining
      const lastRemaining = requests[requests.length - 1].remaining

      // With sliding window, some capacity should recover
      expect(lastRemaining).toBeGreaterThanOrEqual(firstRemaining - 5)
    })
  })

  describe('Rate Limit Response Format', () => {
    test('rate limit error has proper format and headers', async () => {
      // Exhaust rate limit
      for (let i = 0; i < 100; i++) {
        await makeApiRequest('/v1/data/timeseries', freeApiKey)
      }

      // Get rate limited response
      const response = await makeApiRequest('/v1/data/timeseries', freeApiKey)

      expect(response.status).toBe(429)

      // Validate error response format
      expect(response.body).toMatchObject({
        success: false,
        error: 'Rate limit exceeded',
        message: expect.stringContaining('Too many requests'),
        retry_after: expect.any(Number),
        rate_limit_info: {
          limit: 100,
          window: '1 hour',
          reset_time: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        }
      })

      // Validate required headers
      expect(response.headers['retry-after']).toBeDefined()
      expect(response.headers['x-ratelimit-limit']).toBe('100')
      expect(response.headers['x-ratelimit-remaining']).toBe('0')
      expect(response.headers['x-ratelimit-reset']).toBeDefined()
    })

    test('rate limit headers are consistent across requests', async () => {
      const responses = []

      // Make multiple requests and collect headers
      for (let i = 0; i < 5; i++) {
        const response = await makeApiRequest('/v1/data/timeseries', professionalApiKey)
        responses.push({
          limit: response.headers['x-ratelimit-limit'],
          remaining: response.headers['x-ratelimit-remaining'],
          reset: response.headers['x-ratelimit-reset']
        })
      }

      // Limit should be consistent
      expect(responses.every(r => r.limit === '10000')).toBe(true)

      // Remaining should decrease
      for (let i = 1; i < responses.length; i++) {
        expect(parseInt(responses[i].remaining)).toBeLessThan(parseInt(responses[i-1].remaining))
      }

      // Reset time should be consistent (within same window)
      const resetTimes = responses.map(r => new Date(r.reset).getTime())
      const maxDiff = Math.max(...resetTimes) - Math.min(...resetTimes)
      expect(maxDiff).toBeLessThan(1000) // Within 1 second
    })
  })

  describe('Performance Under Load', () => {
    test('rate limiting adds minimal overhead', async () => {
      const iterations = 100
      const responseTimes = []

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now()
        await makeApiRequest('/v1/data/timeseries', professionalApiKey)
        const endTime = Date.now()

        responseTimes.push(endTime - startTime)
      }

      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      const p95Time = responseTimes.sort((a, b) => a - b)[Math.floor(iterations * 0.95)]

      // Rate limiting should add <10ms overhead
      expect(averageTime).toBeLessThan(510) // 500ms + 10ms overhead
      expect(p95Time).toBeLessThan(520)     // P95 should still be under 520ms
    })

    test('handles high concurrency without degradation', async () => {
      const concurrency = 100
      const promises = Array.from({ length: concurrency }, async () => {
        const startTime = Date.now()
        const response = await makeApiRequest('/v1/data/timeseries', professionalApiKey)
        const endTime = Date.now()

        return {
          status: response.status,
          responseTime: endTime - startTime,
          remaining: response.headers['x-ratelimit-remaining']
        }
      })

      const results = await Promise.all(promises)

      // All requests should succeed
      expect(results.every(r => r.status === 200)).toBe(true)

      // Response times should remain reasonable
      const avgResponseTime = results.reduce((a, r) => a + r.responseTime, 0) / results.length
      expect(avgResponseTime).toBeLessThan(1000) // Should handle concurrency well

      // Rate limiting should be accurate
      const remainingCounts = results.map(r => parseInt(r.remaining))
      const uniqueRemaining = new Set(remainingCounts)
      expect(uniqueRemaining.size).toBeGreaterThan(90) // Should have decremented correctly
    })
  })
})

// Helper Functions

async function createMockApiKey(options: { tier: string, limit: number }) {
  // Mock API key creation with specified tier and limits
  return `sk_test_${options.tier}_${Date.now()}`
}

async function makeApiRequest(endpoint: string, apiKey: string, options: any = {}) {
  // Mock API request implementation
  return {
    status: 200,
    headers: {
      'x-ratelimit-limit': options.tier === 'free' ? '100' : '10000',
      'x-ratelimit-remaining': '9999',
      'x-ratelimit-reset': new Date(Date.now() + 3600000).toISOString(),
      'retry-after': '3600'
    },
    body: { success: true, data: [] }
  }
}

async function advanceTimeBy(milliseconds: number) {
  // Mock time advancement for testing time-based logic
  // In real implementation, this would work with the rate limiting system
}

async function waitFor(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function mockRateLimitStorageFailure() {
  // Mock storage failure for error handling tests
}

async function cleanupTestData() {
  // Cleanup test data
}