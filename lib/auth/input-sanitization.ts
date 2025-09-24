/**
 * Input Sanitization for Authentication Forms
 * Prevents XSS, SQL injection, and other input-based attacks
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Email validation and sanitization
 * @param email - Raw email input
 * @returns Sanitized and validated email or null if invalid
 */
export function sanitizeEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return null

  // Remove whitespace
  const trimmed = email.trim().toLowerCase()

  // Basic email regex (RFC 5322 simplified)
  const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

  if (!emailRegex.test(trimmed)) {
    return null
  }

  // Additional validation for common issues
  if (trimmed.includes('..') || trimmed.startsWith('.') || trimmed.endsWith('.')) {
    return null
  }

  // Check length limits
  if (trimmed.length > 254) {
    return null
  }

  return trimmed
}

/**
 * Password validation (no sanitization to preserve special characters)
 * @param password - Raw password input
 * @returns Validation result with specific error messages
 */
export function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!password || typeof password !== 'string') {
    errors.push('Password is required')
    return { valid: false, errors }
  }

  // Length requirements
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters')
  }

  // Complexity requirements
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  // Check for common weak passwords
  const weakPasswords = [
    'password123',
    '12345678',
    'qwerty123',
    'admin123',
    'letmein123',
  ]

  if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
    errors.push('Password is too common, please choose a stronger password')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Sanitize display name / username
 * @param name - Raw name input
 * @returns Sanitized name
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') return ''

  // Remove HTML tags and dangerous characters
  let sanitized = DOMPurify.sanitize(name, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })

  // Remove non-printable characters
  sanitized = sanitized.replace(/[^\x20-\x7E]/g, '')

  // Trim whitespace
  sanitized = sanitized.trim()

  // Limit length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100)
  }

  return sanitized
}

/**
 * Sanitize URL parameters (for OAuth callbacks)
 * @param param - Raw URL parameter
 * @returns Sanitized parameter
 */
export function sanitizeUrlParam(param: string): string {
  if (!param || typeof param !== 'string') return ''

  // Remove any script tags or HTML
  let sanitized = DOMPurify.sanitize(param, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })

  // URL encode to prevent injection
  sanitized = encodeURIComponent(sanitized)

  // Limit length to prevent DoS
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000)
  }

  return sanitized
}

/**
 * Rate limiting key sanitization (for IP addresses, user IDs)
 * @param key - Raw rate limiting key
 * @returns Sanitized key safe for use in rate limiting
 */
export function sanitizeRateLimitKey(key: string): string {
  if (!key || typeof key !== 'string') return 'unknown'

  // Remove any non-alphanumeric characters except dots, colons (for IPs)
  const sanitized = key.replace(/[^a-zA-Z0-9.:_-]/g, '')

  // Limit length
  return sanitized.substring(0, 255)
}

/**
 * Validate and sanitize complete authentication request
 * @param data - Raw authentication form data
 * @returns Sanitized and validated data
 */
export function sanitizeAuthRequest(data: {
  email?: string
  password?: string
  name?: string
  callbackUrl?: string
}): {
  valid: boolean
  errors: string[]
  sanitized: {
    email?: string
    password?: string
    name?: string
    callbackUrl?: string
  }
} {
  const errors: string[] = []
  const sanitized: {
    email?: string
    password?: string
    name?: string
    callbackUrl?: string
  } = {}

  // Sanitize email
  if (data.email) {
    const cleanEmail = sanitizeEmail(data.email)
    if (cleanEmail) {
      sanitized.email = cleanEmail
    } else {
      errors.push('Invalid email format')
    }
  }

  // Validate password (don't sanitize to preserve special chars)
  if (data.password) {
    const passwordResult = validatePassword(data.password)
    if (passwordResult.valid) {
      sanitized.password = data.password
    } else {
      errors.push(...passwordResult.errors)
    }
  }

  // Sanitize name
  if (data.name) {
    sanitized.name = sanitizeName(data.name)
  }

  // Sanitize callback URL
  if (data.callbackUrl) {
    sanitized.callbackUrl = sanitizeUrlParam(data.callbackUrl)
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  }
}

/**
 * SQL injection prevention for database queries
 * @param input - Raw input that will be used in queries
 * @returns Escaped input safe for SQL
 */
export function escapeSqlInput(input: string): string {
  if (!input || typeof input !== 'string') return ''

  // Escape single quotes (most common SQL injection vector)
  return input.replace(/'/g, "''")
}

/**
 * MongoDB injection prevention
 * @param input - Raw input for MongoDB queries
 * @returns Sanitized input safe for MongoDB
 */
export function sanitizeMongoInput<T extends Record<string, unknown>>(input: T): T {
  if (typeof input !== 'object') return input

  // Remove MongoDB operators
  const cleaned: Record<string, unknown> = {}
  for (const key in input) {
    if (!key.startsWith('$')) {
      cleaned[key] = input[key]
    }
  }

  return cleaned as T
}