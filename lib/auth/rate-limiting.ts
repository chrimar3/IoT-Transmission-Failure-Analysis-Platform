/**
 * Rate Limiting for Authentication
 * MVP implementation using in-memory store
 */

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
}

// In-memory store for MVP (in production, use Redis or database)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  // Authentication attempts per IP
  maxAttemptsPerIP: 5,
  blockDurationMinutes: 15,
  windowMinutes: 15,

  // Global authentication attempts (DDoS protection)
  globalMaxAttempts: 100,
  globalWindowMinutes: 5,
}

/**
 * Check if an IP address is rate limited for authentication
 */
export function isRateLimited(ip: string): boolean {
  const key = `auth:${ip}`
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry) {
    return false
  }

  // Reset if window expired
  if (now > entry.resetTime) {
    rateLimitStore.delete(key)
    return false
  }

  // Check if blocked
  if (entry.blocked && entry.count >= RATE_LIMIT_CONFIG.maxAttemptsPerIP) {
    return true
  }

  return false
}

/**
 * Record an authentication attempt
 */
export function recordAuthAttempt(ip: string, success: boolean): void {
  const key = `auth:${ip}`
  const now = Date.now()
  const windowMs = RATE_LIMIT_CONFIG.windowMinutes * 60 * 1000
  const blockMs = RATE_LIMIT_CONFIG.blockDurationMinutes * 60 * 1000

  let entry = rateLimitStore.get(key)

  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
      blocked: false,
    }
  }

  // Reset if window expired
  if (now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
      blocked: false,
    }
  }

  // Only increment for failed attempts
  if (!success) {
    entry.count += 1

    // Block if threshold exceeded
    if (entry.count >= RATE_LIMIT_CONFIG.maxAttemptsPerIP) {
      entry.blocked = true
      entry.resetTime = now + blockMs
    }
  } else {
    // Reset on successful authentication
    entry.count = 0
    entry.blocked = false
  }

  rateLimitStore.set(key, entry)
}

/**
 * Get remaining attempts for an IP
 */
export function getRemainingAttempts(ip: string): number {
  const key = `auth:${ip}`
  const entry = rateLimitStore.get(key)

  if (!entry || Date.now() > entry.resetTime) {
    return RATE_LIMIT_CONFIG.maxAttemptsPerIP
  }

  return Math.max(0, RATE_LIMIT_CONFIG.maxAttemptsPerIP - entry.count)
}

/**
 * Check global rate limiting (basic DDoS protection)
 */
export function isGloballyRateLimited(): boolean {
  const key = 'global:auth'
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry) {
    return false
  }

  // Reset if window expired
  if (now > entry.resetTime) {
    rateLimitStore.delete(key)
    return false
  }

  return entry.count >= RATE_LIMIT_CONFIG.globalMaxAttempts
}

/**
 * Record global authentication attempt
 */
export function recordGlobalAuthAttempt(): void {
  const key = 'global:auth'
  const now = Date.now()
  const windowMs = RATE_LIMIT_CONFIG.globalWindowMinutes * 60 * 1000

  let entry = rateLimitStore.get(key)

  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
      blocked: false,
    }
  }

  // Reset if window expired
  if (now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
      blocked: false,
    }
  }

  entry.count += 1
  rateLimitStore.set(key, entry)
}

/**
 * Get rate limiting status for debugging
 */
export function getRateLimitStatus(ip: string) {
  const key = `auth:${ip}`
  const entry = rateLimitStore.get(key)
  const globalEntry = rateLimitStore.get('global:auth')

  return {
    ip: {
      attempts: entry?.count || 0,
      blocked: entry?.blocked || false,
      resetTime: entry?.resetTime || 0,
      remaining: getRemainingAttempts(ip),
    },
    global: {
      attempts: globalEntry?.count || 0,
      blocked: isGloballyRateLimited(),
      resetTime: globalEntry?.resetTime || 0,
    },
  }
}

/**
 * Clear rate limiting for an IP (admin function)
 */
export function clearRateLimit(ip: string): void {
  const key = `auth:${ip}`
  rateLimitStore.delete(key)
}

/**
 * Cleanup expired entries (run periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000)
}