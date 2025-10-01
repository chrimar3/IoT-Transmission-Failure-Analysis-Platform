/**
 * Supabase Resilience Service
 * Provides connection pooling, retry logic, circuit breaker, and graceful degradation
 * Epic 2 Story 2.6: Supabase Resilience Enhancement
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Circuit breaker states
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, block requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

interface CircuitBreaker {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastStateChange: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  rateLimitHits: number;
  circuitBreakerTrips: number;
  cacheHits: number;
}

class SupabaseResilienceService {
  private client: SupabaseClient;
  private circuitBreaker: CircuitBreaker;
  private metrics: PerformanceMetrics;
  private retryConfig: RetryConfig;
  private cache: Map<string, { data: unknown; timestamp: number }>;

  // Circuit breaker configuration
  private readonly FAILURE_THRESHOLD = 5;
  private readonly SUCCESS_THRESHOLD = 2;
  private readonly TIMEOUT_MS = 30000; // 30 seconds
  private readonly HALF_OPEN_RETRY_DELAY = 60000; // 1 minute

  // Cache configuration
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;

  constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables not configured');
    }

    this.client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'x-client-info': 'cu-bems-resilient-client/1.0.0'
          }
        }
      }
    );

    this.circuitBreaker = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      lastStateChange: Date.now()
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rateLimitHits: 0,
      circuitBreakerTrips: 0,
      cacheHits: 0
    };

    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryableErrors: [
        'connection timeout',
        'network error',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'rate limit exceeded',
        'service unavailable',
        '503',
        '502',
        '504'
      ]
    };

    this.cache = new Map();

    // Start monitoring
    this.startHealthMonitoring();
  }

  /**
   * Execute query with full resilience features
   */
  async executeQuery<T>(
    queryFn: (client: SupabaseClient) => Promise<T>,
    options: {
      cacheable?: boolean;
      cacheKey?: string;
      readonly?: boolean;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Check circuit breaker
      if (this.circuitBreaker.state === CircuitState.OPEN) {
        if (Date.now() - this.circuitBreaker.lastFailureTime > this.HALF_OPEN_RETRY_DELAY) {
          this.circuitBreaker.state = CircuitState.HALF_OPEN;
          this.circuitBreaker.successCount = 0;
          console.log('Circuit breaker entering HALF_OPEN state');
        } else {
          this.metrics.circuitBreakerTrips++;
          throw new Error('Circuit breaker is OPEN - service unavailable');
        }
      }

      // Check cache if cacheable
      if (options.cacheable && options.cacheKey) {
        const cached = this.getFromCache(options.cacheKey);
        if (cached) {
          this.metrics.cacheHits++;
          this.recordSuccess(startTime);
          return cached as T;
        }
      }

      // Execute with retry logic
      const result = await this.executeWithRetry(
        queryFn,
        options.timeout || this.TIMEOUT_MS
      );

      // Update cache if cacheable
      if (options.cacheable && options.cacheKey && result) {
        this.setInCache(options.cacheKey, result);
      }

      // Record success
      this.recordSuccess(startTime);

      return result;
    } catch (error) {
      this.recordFailure(startTime);
      throw error;
    }
  }

  /**
   * Execute with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(
    queryFn: (client: SupabaseClient) => Promise<T>,
    timeout: number
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(queryFn, timeout);
        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetriableError(error as Error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt),
          this.retryConfig.maxDelay
        );
        const jitter = Math.random() * 0.3 * delay; // ±30% jitter

        console.log(`Query failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}), retrying in ${Math.floor(delay + jitter)}ms...`);
        await this.sleep(delay + jitter);
      }
    }

    throw lastError || new Error('Query failed after max retries');
  }

  /**
   * Execute with timeout protection
   */
  private async executeWithTimeout<T>(
    queryFn: (client: SupabaseClient) => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      queryFn(this.client),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      )
    ]);
  }

  /**
   * Check if error is retryable
   */
  private isRetriableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return this.retryConfig.retryableErrors.some(pattern =>
      errorMessage.includes(pattern.toLowerCase())
    );
  }

  /**
   * Record successful query
   */
  private recordSuccess(startTime: number): void {
    this.metrics.successfulRequests++;
    const responseTime = Date.now() - startTime;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) /
      this.metrics.successfulRequests;

    // Update circuit breaker
    if (this.circuitBreaker.state === CircuitState.HALF_OPEN) {
      this.circuitBreaker.successCount++;
      if (this.circuitBreaker.successCount >= this.SUCCESS_THRESHOLD) {
        this.circuitBreaker.state = CircuitState.CLOSED;
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.lastStateChange = Date.now();
        console.log('Circuit breaker closed - service recovered');
      }
    } else if (this.circuitBreaker.state === CircuitState.CLOSED) {
      this.circuitBreaker.failureCount = Math.max(0, this.circuitBreaker.failureCount - 1);
    }
  }

  /**
   * Record failed query
   */
  private recordFailure(_startTime: number): void {
    this.metrics.failedRequests++;

    // Update circuit breaker
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.state === CircuitState.HALF_OPEN) {
      this.circuitBreaker.state = CircuitState.OPEN;
      this.circuitBreaker.lastStateChange = Date.now();
      console.error('Circuit breaker opened from HALF_OPEN - service still unavailable');
    } else if (
      this.circuitBreaker.state === CircuitState.CLOSED &&
      this.circuitBreaker.failureCount >= this.FAILURE_THRESHOLD
    ) {
      this.circuitBreaker.state = CircuitState.OPEN;
      this.circuitBreaker.lastStateChange = Date.now();
      console.error('Circuit breaker opened - too many failures');
    }
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): unknown | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setInCache(key: string, data: unknown): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics & { circuitBreakerState: CircuitState } {
    return {
      ...this.metrics,
      circuitBreakerState: this.circuitBreaker.state
    };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    isHealthy: boolean;
    timeInState: number;
  } {
    return {
      state: this.circuitBreaker.state,
      failureCount: this.circuitBreaker.failureCount,
      successCount: this.circuitBreaker.successCount,
      isHealthy: this.circuitBreaker.state === CircuitState.CLOSED,
      timeInState: Date.now() - this.circuitBreaker.lastStateChange
    };
  }

  /**
   * Health monitoring
   */
  private startHealthMonitoring(): void {
    // Monitor every 60 seconds
    setInterval(() => {
      const metrics = this.getMetrics();
      const successRate = metrics.totalRequests > 0
        ? (metrics.successfulRequests / metrics.totalRequests) * 100
        : 100;

      // Alert if success rate drops below 90%
      if (successRate < 90 && metrics.totalRequests > 10) {
        console.warn(`⚠️ Database health warning: ${successRate.toFixed(1)}% success rate`);
        console.warn('Circuit breaker state:', this.circuitBreaker.state);
      }

      // Alert if at 80% rate limit capacity
      // Note: Actual rate limit checking would need Supabase metrics API
      if (this.metrics.rateLimitHits > 0) {
        console.warn(`⚠️ Rate limit hits detected: ${this.metrics.rateLimitHits}`);
      }
    }, 60000);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Cache cleared');
  }

  /**
   * Reset circuit breaker (admin operation)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      lastStateChange: Date.now()
    };
    console.log('Circuit breaker manually reset');
  }

  /**
   * Get direct client (use with caution)
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let resilienceService: SupabaseResilienceService | null = null;

export function getResilienceService(): SupabaseResilienceService {
  if (!resilienceService) {
    resilienceService = new SupabaseResilienceService();
  }
  return resilienceService;
}

export { SupabaseResilienceService, CircuitState };
export type { PerformanceMetrics };