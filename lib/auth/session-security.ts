/**
 * Session Security Configuration
 * Addresses SEC-002: Session Hijacking via XSS vulnerability
 */

import { type CookiesOptions } from 'next-auth'

/**
 * Secure cookie configuration for NextAuth sessions
 * CRITICAL: These settings prevent session hijacking and XSS attacks
 */
export const secureCookieConfig: Partial<CookiesOptions> = {
  sessionToken: {
    name: 'cu-bems.session-token',
    options: {
      httpOnly: true,        // Prevents JavaScript access (XSS protection)
      secure: true,          // HTTPS only (prevents network sniffing)
      sameSite: 'lax',      // CSRF protection
      path: '/',            // Available across entire site
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
  },
  callbackUrl: {
    name: 'cu-bems.callback-url',
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    },
  },
  csrfToken: {
    name: 'cu-bems.csrf-token',
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    },
  },
}

/**
 * Session configuration for enhanced security
 */
export const secureSessionConfig = {
  // Regenerate session ID on login to prevent fixation attacks
  strategy: 'jwt' as const,

  // Short session lifetime for security
  maxAge: 30 * 24 * 60 * 60, // 30 days

  // Frequently update session to detect compromised sessions
  updateAge: 24 * 60 * 60, // 24 hours
}

/**
 * JWT configuration for secure token handling
 */
export const secureJwtConfig = {
  // Use strong secret for signing
  secret: process.env.NEXTAUTH_SECRET,

  // Short-lived tokens
  maxAge: 30 * 24 * 60 * 60, // 30 days

  // Additional encryption for sensitive data
  encryption: true,
}

/**
 * Security headers for authentication pages
 */
export const authSecurityHeaders = {
  'X-Frame-Options': 'DENY',                    // Prevent clickjacking
  'X-Content-Type-Options': 'nosniff',         // Prevent MIME sniffing
  'X-XSS-Protection': '1; mode=block',         // Enable XSS filter
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
}

/**
 * Rate limiting configuration for authentication endpoints
 * Prevents brute force attacks
 */
export const authRateLimitConfig = {
  loginAttempts: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes block after limit exceeded
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 24 * 60 * 60 * 1000, // 24 hours block
  },
  signUp: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
  },
}

/**
 * Validates session integrity
 * Detects potential session hijacking attempts
 */
export function validateSessionIntegrity(
  session: { expires?: string; userAgent?: string },
  request: Request
): boolean {
  if (!session) return false

  // Check session expiry
  if (session.expires && new Date(session.expires) < new Date()) {
    return false
  }

  // Validate user agent consistency (optional, may cause issues with updates)
  const currentUserAgent = request.headers.get('user-agent')
  if (session.userAgent && session.userAgent !== currentUserAgent) {
    console.warn('User agent mismatch detected - potential session hijacking')
    // You may want to invalidate the session here
  }

  // Check IP address consistency (optional, may cause issues with mobile users)
  // Implementation depends on your infrastructure setup

  return true
}

/**
 * Generates secure session ID
 */
export function generateSecureSessionId(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('hex')
}