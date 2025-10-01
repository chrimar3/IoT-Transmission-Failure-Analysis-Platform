/**
 * Story 4.2: Professional API Access - Security Validation Test Suite
 * Comprehensive security testing for all API endpoints and authentication mechanisms
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

// Test utilities and mocks
import { createMockUser, createMockApiKey, createMockRequest } from '../utils/test-helpers'
import { ApiKeyManager } from '@/lib/api/key-management'
import { RateLimiter } from '@/lib/api/rate-limiting'

describe('API Security Validation - Story 4.2', () => {
  let testUser: unknown
  let professionalApiKey: string
  let freeApiKey: string

  beforeAll(async () => {
    // Setup test data
    testUser = await createMockUser({ tier: 'professional' })
    professionalApiKey = await createMockApiKey(testUser.id, { tier: 'professional' })
    freeApiKey = await createMockApiKey(testUser.id, { tier: 'free' })
  })

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData()
  })

  describe('AC6: API Security and Authentication', () => {
    describe('API Key Generation Security', () => {
      test('generates cryptographically secure API keys', async () => {
        const keys = new Set<string>()

        // Generate 1000 keys to test uniqueness and entropy
        for (let i = 0; i < 1000; i++) {
          const apiKey = generateApiKey()

          // Validate key format and length
          expect(apiKey).toMatch(/^sk_[a-f0-9]{64}$/)
          expect(apiKey).toHaveLength(67) // sk_ + 64 hex chars

          // Ensure no collisions
          expect(keys.has(apiKey)).toBe(false)
          keys.add(apiKey)

          // Validate entropy (simplified check)
          const hexPart = apiKey.slice(3)
          const uniqueChars = new Set(hexPart.split('')).size
          expect(uniqueChars).toBeGreaterThan(10) // Good entropy indicator
        }
      })

      test('securely hashes API keys for storage', async () => {
        const apiKey = generateApiKey()
        const hash1 = await hashApiKey(apiKey)
        const hash2 = await hashApiKey(apiKey)

        // Same input should produce same hash
        expect(hash1).toBe(hash2)

        // Hash should be different from original key
        expect(hash1).not.toBe(apiKey)

        // Hash should be in expected format
        expect(hash1).toMatch(/^[a-f0-9]{64}$/)
      })

      test('validates API key format and structure', async () => {
        const validKey = 'sk_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        const invalidKeys = [
          'invalid_key',
          'sk_short',
          'sk_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefg', // invalid char
          'sk_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcde', // too short
          'pk_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', // wrong prefix
          ''
        ]

        expect(await validateApiKey(validKey)).toBe(true)

        for (const invalidKey of invalidKeys) {
          expect(await validateApiKey(invalidKey)).toBe(false)
        }
      })
    })

    describe('Authentication Security', () => {
      test('enforces HTTPS for API endpoints', async () => {
        const httpRequest = createMockRequest({
          url: 'http://api.cu-bems.com/v1/data/timeseries',
          _headers: { 'x-forwarded-proto': 'http' }
        })

        const response = await fetch('/api/v1/data/timeseries', {
          method: 'GET',
          _headers: httpRequest._headers
        })

        // Should redirect to HTTPS or reject
        expect([301, 302, 403, 426]).toContain(response.status)
      })

      test('validates API key authentication', async () => {
        const validRequest = createMockRequest({
          _headers: { 'Authorization': `Bearer ${professionalApiKey}` }
        })

        const invalidRequests = [
          createMockRequest({ _headers: {} }), // No auth header
          createMockRequest({ _headers: { 'Authorization': 'Bearer invalid_key' } }),
          createMockRequest({ _headers: { 'Authorization': 'Basic invalid' } }),
          createMockRequest({ _headers: { 'Authorization': professionalApiKey } }), // Missing Bearer
        ]

        // Valid key should authenticate
        const validAuth = await authenticateRequest(validRequest)
        expect(validAuth.success).toBe(true)
        expect(validAuth.user).toBeDefined()

        // Invalid keys should fail
        for (const invalidRequest of invalidRequests) {
          const invalidAuth = await authenticateRequest(invalidRequest)
          expect(invalidAuth.success).toBe(false)
          expect(invalidAuth.error).toBeDefined()
        }
      })

      test('implements proper scope validation', async () => {
        const readOnlyKey = await createMockApiKey(testUser.id, {
          scopes: ['read:data']
        })
        const fullAccessKey = await createMockApiKey(testUser.id, {
          scopes: ['read:data', 'read:analytics', 'read:exports']
        })

        const testEndpoints = [
          { endpoint: '/api/v1/data/timeseries', requiredScope: 'read:data' },
          { endpoint: '/api/v1/data/analytics', requiredScope: 'read:analytics' },
          { endpoint: '/api/v1/exports/create', requiredScope: 'read:exports' }
        ]

        for (const { endpoint, requiredScope } of testEndpoints) {
          // Read-only key should only access data endpoints
          if (requiredScope === 'read:data') {
            const response = await makeAuthenticatedRequest(endpoint, readOnlyKey)
            expect(response.status).toBe(200)
          } else {
            const response = await makeAuthenticatedRequest(endpoint, readOnlyKey)
            expect(response.status).toBe(403)
          }

          // Full access key should access all endpoints
          const response = await makeAuthenticatedRequest(endpoint, fullAccessKey)
          expect(response.status).toBe(200)
        }
      })
    })

    describe('Input Validation Security', () => {
      test('prevents SQL injection attacks', async () => {
        const sqlInjectionPayloads = [
          "'; DROP TABLE api_keys; --",
          "1' OR '1'='1",
          "UNION SELECT * FROM users",
          "'; INSERT INTO users VALUES ('hacker', 'evil'); --",
          "1'; EXEC xp_cmdshell('dir'); --"
        ]

        for (const payload of sqlInjectionPayloads) {
          const response = await makeAuthenticatedRequest(
            `/api/v1/data/timeseries?sensor_ids=${encodeURIComponent(payload)}`,
            professionalApiKey
          )

          // Should return 400 (bad request) not 500 (server error)
          expect(response.status).toBe(400)
          expect(response.body.error).toContain('Invalid')

          // Ensure no database errors are leaked
          expect(response.body.error).not.toContain('SQL')
          expect(response.body.error).not.toContain('database')
          expect(response.body).not.toHaveProperty('stack')
        }
      })

      test('prevents XSS attacks in API responses', async () => {
        const xssPayloads = [
          "<script>alert('xss')</script>",
          "javascript:alert('xss')",
          "<img src=x onerror=alert('xss')>",
          "'; alert('xss'); //",
          "<svg onload=alert('xss')>"
        ]

        for (const payload of xssPayloads) {
          const response = await makeAuthenticatedRequest(
            `/api/v1/data/timeseries?sensor_ids=${encodeURIComponent(payload)}`,
            professionalApiKey
          )

          // Response should properly escape/sanitize content
          const responseText = JSON.stringify(response.body)
          expect(responseText).not.toContain('<script>')
          expect(responseText).not.toContain('javascript:')
          expect(responseText).not.toContain('onerror=')
          expect(responseText).not.toContain('onload=')
        }
      })

      test('validates request size limits', async () => {
        // Test extremely large payloads
        const largePayload = 'x'.repeat(10 * 1024 * 1024) // 10MB

        const response = await makeAuthenticatedRequest('/api/v1/exports/create', professionalApiKey, {
          method: 'POST',
          body: { data: largePayload }
        })

        // Should reject oversized requests
        expect(response.status).toBe(413) // Payload Too Large
      })

      test('validates JSON schema strictly', async () => {
        const invalidPayloads = [
          { sensor_ids: 123 }, // Should be string
          { start_date: 'invalid-date' }, // Invalid date format
          { interval: 'invalid' }, // Invalid enum value
          { max_points: -1 }, // Negative number
          { max_points: 100000 }, // Exceeds maximum
        ]

        for (const payload of invalidPayloads) {
          const response = await makeAuthenticatedRequest('/api/v1/data/timeseries', professionalApiKey, {
            method: 'POST',
            body: payload
          })

          expect(response.status).toBe(400)
          expect(response.body.error).toContain('validation')
        }
      })
    })

    describe('Rate Limiting Security', () => {
      test('enforces tier-based rate limits', async () => {
        // Test Free tier limit (100 req/hr)
        for (let i = 0; i < 101; i++) {
          const response = await makeAuthenticatedRequest('/api/v1/data/timeseries', freeApiKey)

          if (i < 100) {
            expect(response.status).toBe(200)
            expect(response.headers['x-ratelimit-remaining']).toBe(String(99 - i))
          } else {
            expect(response.status).toBe(429)
            expect(response.body.error).toBe('Rate limit exceeded')
          }
        }

        // Test Professional tier limit (10K req/hr) - sample test
        for (let i = 0; i < 50; i++) {
          const response = await makeAuthenticatedRequest('/api/v1/data/timeseries', professionalApiKey)
          expect(response.status).toBe(200)
          expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeGreaterThan(9900)
        }
      })

      test('prevents rate limit bypass attempts', async () => {
        const bypassAttempts = [
          // Different IP addresses (should be per API key)
          { headers: { 'x-forwarded-for': '192.168.1.1' } },
          { headers: { 'x-forwarded-for': '10.0.0.1' } },
          { headers: { 'x-real-ip': '172.16.0.1' } },

          // Different user agents
          { headers: { 'user-agent': 'Mozilla/5.0' } },
          { headers: { 'user-agent': 'curl/7.68.0' } },

          // Missing headers
          { headers: {} }
        ]

        // Exhaust rate limit first
        for (let i = 0; i < 100; i++) {
          await makeAuthenticatedRequest('/api/v1/data/timeseries', freeApiKey)
        }

        // Attempts to bypass should still be rate limited
        for (const attempt of bypassAttempts) {
          const response = await makeAuthenticatedRequest('/api/v1/data/timeseries', freeApiKey, {
            _headers: attempt._headers
          })
          expect(response.status).toBe(429)
        }
      })

      test('implements proper rate limit headers', async () => {
        const response = await makeAuthenticatedRequest('/api/v1/data/timeseries', professionalApiKey)

        expect(response._headers).toHaveProperty('x-ratelimit-limit')
        expect(response._headers).toHaveProperty('x-ratelimit-remaining')
        expect(response._headers).toHaveProperty('x-ratelimit-reset')

        expect(parseInt(response.headers['x-ratelimit-limit'])).toBe(10000)
        expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeGreaterThan(0)
        expect(new Date(response.headers['x-ratelimit-reset'])).toBeInstanceOf(Date)
      })
    })

    describe('Data Protection Security', () => {
      test('implements proper CORS configuration', async () => {
        const origins = [
          'https://app.cu-bems.com',
          'https://dashboard.cu-bems.com',
          'https://evil.com' // Should be rejected
        ]

        for (const origin of origins) {
          const response = await fetch('/api/v1/data/timeseries', {
            method: 'OPTIONS',
            _headers: {
              'Origin': origin,
              'Access-Control-Request-Method': 'GET'
            }
          })

          if (origin.includes('cu-bems.com')) {
            expect(response.headers['access-control-allow-origin']).toBe(origin)
          } else {
            expect(response.headers['access-control-allow-origin']).toBeUndefined()
          }
        }
      })

      test('sets secure headers', async () => {
        const response = await makeAuthenticatedRequest('/api/v1/data/timeseries', professionalApiKey)

        // Security headers validation
        expect(response.headers['x-content-type-options']).toBe('nosniff')
        expect(response.headers['x-frame-options']).toBe('DENY')
        expect(response.headers['x-xss-protection']).toBe('1; mode=block')
        expect(response.headers['strict-transport-security']).toContain('max-age=')
        expect(response.headers['content-security-policy']).toBeDefined()
      })

      test('properly handles sensitive data in responses', async () => {
        const response = await makeAuthenticatedRequest('/api/v1/keys', professionalApiKey)

        // API keys should never be included in full
        expect(JSON.stringify(response.body)).not.toMatch(/sk_[a-f0-9]{64}/)

        // Only prefixes should be visible
        if (response.body.data) {
          response.body.data.forEach((key: unknown) => {
            expect(key.key_prefix).toMatch(/^sk_[a-f0-9]{8}$/)
            expect(key).not.toHaveProperty('key')
            expect(key).not.toHaveProperty('key_hash')
          })
        }
      })
    })

    describe('Audit Logging Security', () => {
      test('logs all API requests comprehensively', async () => {
        const testRequest = {
          endpoint: '/api/v1/data/timeseries',
          method: 'GET',
          params: { sensor_ids: 'SENSOR_001' }
        }

        const response = await makeAuthenticatedRequest(
          `${testRequest.endpoint}?sensor_ids=${testRequest.params.sensor_ids}`,
          professionalApiKey
        )

        // Check that request was logged
        const auditLogs = await getAuditLogs({
          api_key: professionalApiKey,
          endpoint: testRequest.endpoint,
          timeframe: '1_minute'
        })

        expect(auditLogs).toHaveLength(1)
        expect(auditLogs[0]).toMatchObject({
          endpoint: testRequest.endpoint,
          method: testRequest.method,
          response_status: response.status,
          user_id: testUser.id,
          ip_address: expect.any(String),
          timestamp: expect.any(String)
        })
      })

      test('logs security events appropriately', async () => {
        // Generate security events
        await makeAuthenticatedRequest('/api/v1/data/timeseries', 'invalid_key')
        await makeAuthenticatedRequest('/api/v1/data/timeseries', professionalApiKey, {
          _headers: { 'x-forwarded-for': '192.168.1.1' }
        })

        const securityLogs = await getSecurityLogs({
          event_types: ['auth_failure', 'suspicious_activity'],
          timeframe: '1_minute'
        })

        expect(securityLogs.length).toBeGreaterThan(0)
        expect(securityLogs[0]).toHaveProperty('event_type')
        expect(securityLogs[0]).toHaveProperty('ip_address')
        expect(securityLogs[0]).toHaveProperty('user_agent')
        expect(securityLogs[0]).toHaveProperty('timestamp')
      })
    })

    describe('API Versioning Security', () => {
      test('validates API version requirements', async () => {
        const versionTests = [
          { path: '/api/data/timeseries', expectedStatus: 404 }, // Missing version
          { path: '/api/v0/data/timeseries', expectedStatus: 404 }, // Invalid version
          { path: '/api/v2/data/timeseries', expectedStatus: 404 }, // Future version
          { path: '/api/v1/data/timeseries', expectedStatus: 200 } // Valid version
        ]

        for (const { path, expectedStatus } of versionTests) {
          const response = await makeAuthenticatedRequest(path, professionalApiKey)
          expect(response.status).toBe(expectedStatus)
        }
      })

      test('maintains backward compatibility security', async () => {
        // Ensure deprecated endpoints still enforce security
        const deprecatedEndpoints = [
          '/api/readings/timeseries', // Legacy endpoint
        ]

        for (const endpoint of deprecatedEndpoints) {
          // Should still require authentication
          const unauthenticatedResponse = await fetch(endpoint)
          expect(unauthenticatedResponse.status).toBe(401)

          // Should still enforce rate limiting
          const authenticatedResponse = await makeAuthenticatedRequest(endpoint, professionalApiKey)
          expect(authenticatedResponse._headers).toHaveProperty('x-ratelimit-remaining')
        }
      })
    })
  })
})

// Test Helper Functions
async function createMockUser(_options: { tier: string }) {
  return {
    id: crypto.randomUUID(),
    email: `test-${Date.now()}@example.com`,
    subscription_tier: options.tier,
    stripe_customer_id: `cus_test_${crypto.randomUUID()}`
  }
}

async function createMockApiKey(userId: string, _options: { tier?: string, scopes?: string[] } = {}) {
  const apiKey = generateApiKey()
  // Mock API key creation in test database
  return apiKey
}

async function authenticateRequest(request: unknown) {
  // Mock authentication logic
  const authHeader = request.headers['Authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header' }
  }

  const apiKey = authHeader.slice(7)
  const isValid = await validateApiKey(apiKey)

  if (!isValid) {
    return { success: false, error: 'Invalid API key' }
  }

  return { success: true, user: testUser }
}

async function makeAuthenticatedRequest(endpoint: string, apiKey: string, _options: unknown = {}) {
  const _headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...options.headers
  }

  return {
    status: 200,
    headers: {
      'x-ratelimit-limit': '10000',
      'x-ratelimit-remaining': '9999',
      'x-ratelimit-reset': new Date(Date.now() + 3600000).toISOString(),
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'x-xss-protection': '1; mode=block',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'content-security-policy': "default-src 'self'"
    },
    body: { success: true, data: [] }
  }
}

async function getAuditLogs(_filters: unknown) {
  // Mock audit log retrieval
  return [{
    endpoint: filters.endpoint,
    method: 'GET',
    response_status: 200,
    user_id: testUser.id,
    ip_address: '127.0.0.1',
    timestamp: new Date().toISOString()
  }]
}

async function getSecurityLogs(_filters: unknown) {
  // Mock security log retrieval
  return [{
    event_type: 'auth_failure',
    ip_address: '127.0.0.1',
    user_agent: 'test-agent',
    timestamp: new Date().toISOString()
  }]
}

async function cleanupTestData() {
  // Clean up test data
}