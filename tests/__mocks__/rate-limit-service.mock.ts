/**
 * Rate Limiting Service Mock - Test Isolation Strategy
 * Provides deterministic, controllable rate limiting behavior for testing
 * Eliminates external dependencies and ensures test repeatability
 */

export interface RateLimitConfig {
  requests: number
  window: string
  burst: number
  resetMessage: string
}

export interface RateLimitState {
  count: number
  resetTime: number
  windowStartTime: number
  burstUsed: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  retryAfter?: number
  headers: Record<string, string>
}

export interface MockRateLimitOptions {
  tier: 'free' | 'professional' | 'enterprise'
  customLimits?: Partial<RateLimitConfig>
  mockTime?: number
  simulateFailure?: boolean
  enableBurst?: boolean
}

/**
 * Mock Rate Limiting Service with deterministic behavior
 * Provides full isolation from Redis/external storage
 */
export class MockRateLimitService {
  private storage = new Map<string, RateLimitState>()
  private mockTime: number | null = null
  private simulateFailure = false

  // Tier configurations matching production
  private readonly TIER_CONFIGS: Record<string, RateLimitConfig> = {
    free: {
      requests: 100,
      window: 'hour',
      burst: 10,
      resetMessage: 'Upgrade to Professional for 100x higher limits'
    },
    professional: {
      requests: 10000,
      window: 'hour',
      burst: 1000,
      resetMessage: 'Professional tier rate limit'
    },
    enterprise: {
      requests: 50000,
      window: 'hour',
      burst: 5000,
      resetMessage: 'Enterprise tier rate limit'
    }
  }

  /**
   * Set mock time for deterministic testing
   */
  setMockTime(timestamp: number): void {
    this.mockTime = timestamp
  }

  /**
   * Get current time (mock or real)
   */
  private getCurrentTime(): number {
    return this.mockTime !== null ? this.mockTime : Date.now()
  }

  /**
   * Simulate storage failure for error testing
   */
  simulateStorageFailure(enabled: boolean = true): void {
    this.simulateFailure = enabled
  }

  /**
   * Clear all rate limiting data
   */
  clearAll(): void {
    this.storage.clear()
    this.mockTime = null
    this.simulateFailure = false
  }

  /**
   * Check rate limit for a user/endpoint combination
   */
  async checkRateLimit(
    userId: string,
    endpoint: string,
    options: MockRateLimitOptions
  ): Promise<RateLimitResult> {
    // Simulate storage failure
    if (this.simulateFailure) {
      throw new Error('Rate limit storage unavailable')
    }

    const config = {
      ...this.TIER_CONFIGS[options.tier],
      ...(options.customLimits || {})
    }

    const key = `${userId}:${endpoint}:${options.tier}`
    const now = this.getCurrentTime()
    const windowMs = this.getWindowMs(config.window)

    let state = this.storage.get(key)

    // Initialize or reset window if needed
    if (!state || (now - state.windowStartTime) >= windowMs) {
      state = {
        count: 0,
        resetTime: now + windowMs,
        windowStartTime: now,
        burstUsed: 0
      }
      this.storage.set(key, state)
    }

    // Check if request is allowed
    const allowed = this.isRequestAllowed(state, config, options.enableBurst ?? true)

    if (allowed) {
      state.count++
      if (state.count > config.requests) {
        state.burstUsed++
      }
    }

    const remaining = Math.max(0, config.requests - state.count + (options.enableBurst ? config.burst - state.burstUsed : 0))
    const resetTime = new Date(state.resetTime)

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((state.resetTime - now) / 1000),
      headers: {
        'X-RateLimit-Limit': config.requests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toISOString(),
        'X-RateLimit-Window': config.window,
        ...(allowed ? {} : { 'Retry-After': Math.ceil((state.resetTime - now) / 1000).toString() })
      }
    }
  }

  /**
   * Check if request should be allowed based on current state
   */
  private isRequestAllowed(
    state: RateLimitState,
    config: RateLimitConfig,
    enableBurst: boolean
  ): boolean {
    // Within regular limit
    if (state.count < config.requests) {
      return true
    }

    // Check burst allowance
    if (enableBurst && state.burstUsed < config.burst) {
      return true
    }

    return false
  }

  /**
   * Convert window string to milliseconds
   */
  private getWindowMs(window: string): number {
    switch (window) {
      case 'minute': return 60 * 1000
      case 'hour': return 60 * 60 * 1000
      case 'day': return 24 * 60 * 60 * 1000
      default: return 60 * 60 * 1000 // Default to hour
    }
  }

  /**
   * Get current state for debugging/testing
   */
  getState(userId: string, endpoint: string, tier: string): RateLimitState | null {
    const key = `${userId}:${endpoint}:${tier}`
    return this.storage.get(key) || null
  }

  /**
   * Manually set state for testing specific scenarios
   */
  setState(
    userId: string,
    endpoint: string,
    tier: string,
    state: Partial<RateLimitState>
  ): void {
    const key = `${userId}:${endpoint}:${tier}`
    const existingState = this.storage.get(key) || {
      count: 0,
      resetTime: this.getCurrentTime() + 3600000,
      windowStartTime: this.getCurrentTime(),
      burstUsed: 0
    }

    this.storage.set(key, { ...existingState, ...state })
  }

  /**
   * Advance time by specified milliseconds for testing time-based logic
   */
  advanceTime(milliseconds: number): void {
    if (this.mockTime !== null) {
      this.mockTime += milliseconds
    } else {
      this.mockTime = Date.now() + milliseconds
    }
  }

  /**
   * Create a pre-configured instance for specific test scenarios
   */
  static createForScenario(scenario: 'clean' | 'near_limit' | 'at_limit' | 'over_limit'): MockRateLimitService {
    const service = new MockRateLimitService()
    const now = Date.now()
    service.setMockTime(now)

    switch (scenario) {
      case 'near_limit':
        service.setState('test-user', '/v1/data/timeseries', 'free', {
          count: 95, // Near 100 limit
          resetTime: now + 3600000,
          windowStartTime: now,
          burstUsed: 0
        })
        break
      case 'at_limit':
        service.setState('test-user', '/v1/data/timeseries', 'free', {
          count: 100, // At limit
          resetTime: now + 3600000,
          windowStartTime: now,
          burstUsed: 0
        })
        break
      case 'over_limit':
        service.setState('test-user', '/v1/data/timeseries', 'free', {
          count: 100, // At limit
          resetTime: now + 3600000,
          windowStartTime: now,
          burstUsed: 10 // Burst exhausted
        })
        break
    }

    return service
  }
}

/**
 * Factory for creating test data with various rate limiting scenarios
 */
export class RateLimitTestDataFactory {
  /**
   * Generate API key for specific tier
   */
  static createApiKey(tier: 'free' | 'professional' | 'enterprise'): string {
    return `sk_test_${tier}_${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Create user ID for testing
   */
  static createUserId(prefix = 'test-user'): string {
    return `${prefix}-${Math.random().toString(36).substring(2, 10)}`
  }

  /**
   * Generate test scenarios for different rate limiting states
   */
  static createScenarios() {
    return {
      // Free tier scenarios
      free: {
        clean: {
          tier: 'free' as const,
          expectedLimit: 100,
          expectedBurst: 10,
          description: 'Clean slate - no previous requests'
        },
        nearLimit: {
          tier: 'free' as const,
          preRequestCount: 95,
          expectedLimit: 100,
          expectedBurst: 10,
          description: 'Near rate limit - 95 requests made'
        },
        atLimit: {
          tier: 'free' as const,
          preRequestCount: 100,
          expectedLimit: 100,
          expectedBurst: 10,
          shouldBlock: false, // Burst still available
          description: 'At rate limit - burst available'
        },
        overLimit: {
          tier: 'free' as const,
          preRequestCount: 110, // Used all burst
          expectedLimit: 100,
          expectedBurst: 10,
          shouldBlock: true,
          description: 'Over limit - burst exhausted'
        }
      },
      // Professional tier scenarios
      professional: {
        clean: {
          tier: 'professional' as const,
          expectedLimit: 10000,
          expectedBurst: 1000,
          description: 'Professional - clean slate'
        },
        nearLimit: {
          tier: 'professional' as const,
          preRequestCount: 9500,
          expectedLimit: 10000,
          expectedBurst: 1000,
          description: 'Professional - near rate limit'
        },
        atLimit: {
          tier: 'professional' as const,
          preRequestCount: 10000,
          expectedLimit: 10000,
          expectedBurst: 1000,
          shouldBlock: false, // Burst available
          description: 'Professional - at rate limit'
        },
        overLimit: {
          tier: 'professional' as const,
          preRequestCount: 11000, // Used all burst
          expectedLimit: 10000,
          expectedBurst: 1000,
          shouldBlock: true,
          description: 'Professional - over limit'
        }
      },
      // Enterprise tier scenarios
      enterprise: {
        clean: {
          tier: 'enterprise' as const,
          expectedLimit: 50000,
          expectedBurst: 5000,
          description: 'Enterprise - clean slate'
        },
        nearLimit: {
          tier: 'enterprise' as const,
          preRequestCount: 48000,
          expectedLimit: 50000,
          expectedBurst: 5000,
          description: 'Enterprise - near rate limit'
        }
      }
    }
  }

  /**
   * Create test data for concurrent request scenarios
   */
  static createConcurrentScenarios() {
    return {
      freeTierBurst: {
        tier: 'free' as const,
        concurrentRequests: 15, // Exceeds burst
        expectedSuccessful: 10, // Only burst should succeed
        expectedBlocked: 5
      },
      professionalTierBurst: {
        tier: 'professional' as const,
        concurrentRequests: 1500, // Within burst
        expectedSuccessful: 1500,
        expectedBlocked: 0
      },
      mixedTierRequests: [
        { tier: 'free' as const, requests: 5 },
        { tier: 'professional' as const, requests: 50 },
        { tier: 'enterprise' as const, requests: 100 }
      ]
    }
  }

  /**
   * Create edge case scenarios
   */
  static createEdgeCaseScenarios() {
    return {
      windowReset: {
        description: 'Rate limit window reset',
        setupTime: Date.now(),
        advanceTime: 3600000, // 1 hour
        expectReset: true
      },
      rapidConsecutive: {
        description: 'Rapid consecutive requests',
        requestInterval: 10, // 10ms between requests
        requestCount: 20
      },
      storageFailure: {
        description: 'Rate limit storage failure',
        simulateFailure: true,
        expectError: true
      },
      invalidConfiguration: {
        description: 'Invalid rate limit configuration',
        customLimits: {
          requests: -1, // Invalid
          window: 'invalid' as any,
          burst: -5
        }
      }
    }
  }
}

/**
 * Utility functions for test assertions
 */
export class RateLimitTestAssertions {
  /**
   * Assert rate limit headers are correct
   */
  static assertRateLimitHeaders(
    headers: Record<string, string>,
    expectedLimit: number,
    expectedRemaining?: number
  ): void {
    expect(headers['X-RateLimit-Limit']).toBe(expectedLimit.toString())
    if (expectedRemaining !== undefined) {
      expect(headers['X-RateLimit-Remaining']).toBe(expectedRemaining.toString())
    }
    expect(headers['X-RateLimit-Reset']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(headers['X-RateLimit-Window']).toBeDefined()
  }

  /**
   * Assert rate limit response structure
   */
  static assertRateLimitResponse(
    result: RateLimitResult,
    expected: {
      allowed: boolean
      remaining?: number
      hasRetryAfter?: boolean
    }
  ): void {
    expect(result.allowed).toBe(expected.allowed)
    if (expected.remaining !== undefined) {
      expect(result.remaining).toBe(expected.remaining)
    }
    if (expected.hasRetryAfter) {
      expect(result.retryAfter).toBeGreaterThan(0)
    } else {
      expect(result.retryAfter).toBeUndefined()
    }
    expect(result.resetTime).toBeInstanceOf(Date)
  }

  /**
   * Assert tier-specific behavior
   */
  static assertTierBehavior(
    tier: string,
    result: RateLimitResult,
    requestCount: number
  ): void {
    const configs = {
      free: { limit: 100, burst: 10 },
      professional: { limit: 10000, burst: 1000 },
      enterprise: { limit: 50000, burst: 5000 }
    }

    const config = configs[tier as keyof typeof configs]
    expect(result.headers['X-RateLimit-Limit']).toBe(config.limit.toString())

    // Within normal limits
    if (requestCount <= config.limit) {
      expect(result.allowed).toBe(true)
      expect(result.retryAfter).toBeUndefined()
    }
    // Within burst allowance
    else if (requestCount <= config.limit + config.burst) {
      expect(result.allowed).toBe(true)
    }
    // Over all limits
    else {
      expect(result.allowed).toBe(false)
      expect(result.retryAfter).toBeGreaterThan(0)
    }
  }
}