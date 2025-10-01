/**
 * Pattern Detection Cache Service
 * Story 3.3: Failure Pattern Detection Engine - Performance Optimization
 *
 * Implements Redis-like caching for expensive statistical calculations
 * Target: 60%+ cache hit rate for pattern detection requests
 */

import crypto from 'crypto'
import { DETECTION_CONFIG } from './detection-config'
import type { StatisticalMetrics } from '@/types/patterns'

// Cache entry structure
interface CacheEntry<T> {
  key: string
  value: T
  expiresAt: number
  createdAt: number
  hitCount: number
}

// Cache statistics
interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  totalEntries: number
  memoryUsageMB: number
  averageAge: number
}

/**
 * In-memory cache with LRU eviction and TTL
 * Production would use Redis, but this is sufficient for MVP
 */
export class CacheService {
  private cache: Map<string, CacheEntry<unknown>>
  private stats: { hits: number; misses: number }
  private maxEntries: number
  private defaultTTL: number

  constructor(maxEntries: number = 1000, defaultTTL: number = 300) {
    this.cache = new Map()
    this.stats = { hits: 0, misses: 0 }
    this.maxEntries = maxEntries
    this.defaultTTL = defaultTTL * 1000 // Convert to milliseconds
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)

    // Cache miss
    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // Cache hit
    this.stats.hits++
    entry.hitCount++
    return entry.value as T
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL
    const now = Date.now()

    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt: now + ttl,
      createdAt: now,
      hitCount: 0
    }

    // Evict old entries if cache is full
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU()
    }

    this.cache.set(key, entry)
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key)
  }

  /**
   * Check if key exists in cache (without incrementing hit count)
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0

    // Calculate average entry age
    const now = Date.now()
    let totalAge = 0
    let validEntries = 0

    for (const entry of this.cache.values()) {
      if (now < entry.expiresAt) {
        totalAge += now - entry.createdAt
        validEntries++
      }
    }

    const averageAge = validEntries > 0 ? totalAge / validEntries / 1000 : 0

    // Estimate memory usage (rough approximation)
    const memoryUsageMB = (this.cache.size * 5000) / (1024 * 1024) // ~5KB per entry

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalEntries: this.cache.size,
      memoryUsageMB: Math.round(memoryUsageMB * 100) / 100,
      averageAge: Math.round(averageAge)
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    // Find entry with oldest access time and lowest hit count
    let oldestKey: string | null = null
    let oldestTime = Infinity
    let lowestHits = Infinity

    for (const [key, entry] of this.cache.entries()) {
      // Prioritize entries with low hit count
      if (entry.hitCount < lowestHits) {
        lowestHits = entry.hitCount
        oldestKey = key
        oldestTime = entry.createdAt
      } else if (entry.hitCount === lowestHits && entry.createdAt < oldestTime) {
        oldestKey = key
        oldestTime = entry.createdAt
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Clean up expired entries (run periodically)
   */
  async cleanupExpired(): Promise<number> {
    const now = Date.now()
    let cleanedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleanedCount++
      }
    }

    return cleanedCount
  }
}

/**
 * Global cache instance
 */
const cacheService = new CacheService(
  1000, // Max 1000 entries
  DETECTION_CONFIG.performance.cacheTTLSeconds
)

/**
 * Pattern Detection Cache Helper
 * Specialized caching functions for pattern detection operations
 */
export class PatternDetectionCache {
  /**
   * Generate cache key for pattern detection request
   */
  static generatePatternKey(
    sensorIds: string[],
    timeWindow: string,
    algorithmConfig: unknown
  ): string {
    const data = {
      sensors: sensorIds.sort(),
      window: timeWindow,
      config: algorithmConfig
    }
    const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex')
    return `pattern:${hash}`
  }

  /**
   * Generate cache key for statistical calculations
   */
  static generateStatsKey(sensorId: string, timeWindow: string): string {
    return `stats:${sensorId}:${timeWindow}`
  }

  /**
   * Generate cache key for correlation matrix
   */
  static generateCorrelationKey(sensorIds: string[]): string {
    const sorted = sensorIds.sort().join(',')
    const hash = crypto.createHash('md5').update(sorted).digest('hex')
    return `correlation:${hash}`
  }

  /**
   * Cache statistical metrics for a sensor
   */
  static async cacheStatistics(
    sensorId: string,
    timeWindow: string,
    stats: StatisticalMetrics
  ): Promise<void> {
    if (!DETECTION_CONFIG.performance.cacheStatisticalResults) return

    const key = this.generateStatsKey(sensorId, timeWindow)
    await cacheService.set(key, stats, DETECTION_CONFIG.performance.cacheTTLSeconds)
  }

  /**
   * Get cached statistical metrics
   */
  static async getStatistics(
    sensorId: string,
    timeWindow: string
  ): Promise<StatisticalMetrics | null> {
    if (!DETECTION_CONFIG.performance.cacheStatisticalResults) return null

    const key = this.generateStatsKey(sensorId, timeWindow)
    return await cacheService.get<StatisticalMetrics>(key)
  }

  /**
   * Cache correlation matrix
   */
  static async cacheCorrelationMatrix(
    sensorIds: string[],
    matrix: unknown
  ): Promise<void> {
    if (!DETECTION_CONFIG.performance.cacheCorrelationMatrices) return

    const key = this.generateCorrelationKey(sensorIds)
    // Longer TTL for correlation matrices (10 minutes)
    await cacheService.set(key, matrix, DETECTION_CONFIG.performance.cacheTTLSeconds * 2)
  }

  /**
   * Get cached correlation matrix
   */
  static async getCorrelationMatrix(
    sensorIds: string[]
  ): Promise<unknown | null> {
    if (!DETECTION_CONFIG.performance.cacheCorrelationMatrices) return null

    const key = this.generateCorrelationKey(sensorIds)
    return await cacheService.get(key)
  }

  /**
   * Cache pattern detection results
   */
  static async cachePatternResults(
    sensorIds: string[],
    timeWindow: string,
    algorithmConfig: unknown,
    results: unknown
  ): Promise<void> {
    if (!DETECTION_CONFIG.performance.cacheEnabled) return

    const key = this.generatePatternKey(sensorIds, timeWindow, algorithmConfig)
    await cacheService.set(key, results, DETECTION_CONFIG.performance.cacheTTLSeconds)
  }

  /**
   * Get cached pattern detection results
   */
  static async getPatternResults(
    sensorIds: string[],
    timeWindow: string,
    algorithmConfig: unknown
  ): Promise<unknown | null> {
    if (!DETECTION_CONFIG.performance.cacheEnabled) return null

    const key = this.generatePatternKey(sensorIds, timeWindow, algorithmConfig)
    return await cacheService.get(key)
  }

  /**
   * Invalidate cache for specific sensor
   */
  static async invalidateSensor(sensorId: string): Promise<void> {
    // This would be more sophisticated in production
    // For now, just clear entries matching the sensor ID pattern
    const keys = Array.from((cacheService as { cache: Map<string, unknown> }).cache.keys())
    const sensorKeys = keys.filter(key => key.includes(sensorId))

    for (const key of sensorKeys) {
      await cacheService.delete(key)
    }
  }

  /**
   * Get cache performance statistics
   */
  static getStats(): CacheStats {
    return cacheService.getStats()
  }

  /**
   * Clear all cache
   */
  static async clearAll(): Promise<void> {
    await cacheService.clear()
  }

  /**
   * Run cache cleanup (remove expired entries)
   */
  static async cleanup(): Promise<number> {
    return await cacheService.cleanupExpired()
  }
}

// Export singleton cache service
export { cacheService }

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    PatternDetectionCache.cleanup().then(count => {
      if (count > 0) {
        console.log(`[Cache] Cleaned up ${count} expired entries`)
      }
    }).catch(error => {
      console.error('[Cache] Cleanup failed:', error)
    })
  }, 5 * 60 * 1000) // 5 minutes
}