/**
 * Security Headers Middleware
 * Implements Content Security Policy (CSP) and other security headers
 * Prevents XSS, clickjacking, and other common web vulnerabilities
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Content Security Policy configuration
 * CRITICAL: Prevents XSS attacks by controlling resource loading
 */
const getCSPHeader = (nonce: string): string => {
  const cspDirectives = [
    // Default policy: only allow resources from same origin
    "default-src 'self'",

    // Scripts: Allow self, inline scripts with nonce, and required CDNs
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://apis.google.com https://www.googletagmanager.com`,

    // Styles: Allow self, inline styles (needed for many UI libraries)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

    // Images: Allow self, data URLs, and required external sources
    "img-src 'self' data: https: blob:",

    // Fonts: Allow self and Google Fonts
    "font-src 'self' https://fonts.gstatic.com",

    // Connect: API calls and analytics
    "connect-src 'self' https://api.stripe.com https://analytics.google.com",

    // Frame ancestors: Prevent clickjacking
    "frame-ancestors 'none'",

    // Base URI: Prevent base tag injection
    "base-uri 'self'",

    // Form action: Only allow forms to submit to same origin
    "form-action 'self'",

    // Upgrade insecure requests
    "upgrade-insecure-requests",
  ]

  return cspDirectives.join('; ')
}

/**
 * Generate CSP nonce for inline scripts
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64')
}

/**
 * Security headers to apply to all responses
 */
export function applySecurityHeaders(
  response: NextResponse,
  nonce: string
): NextResponse {
  // Content Security Policy
  response.headers.set('Content-Security-Policy', getCSPHeader(nonce))

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Enable browser XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions Policy (formerly Feature Policy)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // HSTS - Enforce HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }

  return response
}

/**
 * Middleware function to apply security headers to all responses
 */
export function securityHeadersMiddleware(request: NextRequest) {
  const nonce = generateCSPNonce()
  const response = NextResponse.next()

  // Store nonce in response for use in inline scripts
  response.headers.set('X-CSP-Nonce', nonce)

  // Apply all security headers
  return applySecurityHeaders(response, nonce)
}

/**
 * Special security headers for authentication pages
 * More restrictive CSP for sensitive operations
 */
export function authPageSecurityHeaders(response: NextResponse): NextResponse {
  const nonce = generateCSPNonce()

  // More restrictive CSP for auth pages
  const authCSP = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://apis.google.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://lh3.googleusercontent.com", // Google profile images
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', authCSP)
  response.headers.set('X-CSP-Nonce', nonce)

  // Apply other security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin')

  return response
}