/**
 * OAuth Security Configuration
 * Addresses SEC-001: OAuth Redirect URI Hijacking vulnerability
 */

/**
 * Whitelist of allowed redirect URIs for OAuth flows
 * CRITICAL: Only add trusted, verified URLs to prevent redirect attacks
 */
export const OAUTH_REDIRECT_WHITELIST = [
  // Production URLs
  'https://cu-bems-analytics.com/api/auth/callback/google',
  'https://cu-bems-analytics.com/dashboard',

  // Development URLs (remove in production)
  process.env.NODE_ENV === 'development' && 'http://localhost:3000/api/auth/callback/google',
  process.env.NODE_ENV === 'development' && 'http://localhost:3000/dashboard',
].filter(Boolean) as string[]

/**
 * Validates redirect URI against whitelist
 * @param uri - The redirect URI to validate
 * @returns true if URI is whitelisted, false otherwise
 */
export function isValidRedirectUri(uri: string): boolean {
  if (!uri) return false

  try {
    const url = new URL(uri)

    // Check against whitelist
    return OAUTH_REDIRECT_WHITELIST.some(allowed => {
      const allowedUrl = new URL(allowed)
      return (
        url.protocol === allowedUrl.protocol &&
        url.hostname === allowedUrl.hostname &&
        url.pathname === allowedUrl.pathname
      )
    })
  } catch {
    // Invalid URL format
    return false
  }
}

/**
 * Sanitizes and validates OAuth callback URL
 * @param callbackUrl - The callback URL from OAuth provider
 * @returns Validated callback URL or default dashboard URL
 */
export function sanitizeCallbackUrl(callbackUrl?: string | null): string {
  const defaultUrl = '/dashboard'

  if (!callbackUrl) return defaultUrl

  // Prevent open redirect attacks
  if (isValidRedirectUri(callbackUrl)) {
    return callbackUrl
  }

  // Check if it's a relative path (safer)
  if (callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) {
    // Additional validation for relative paths
    const safePath = callbackUrl.split('?')[0] // Remove query params
    const allowedPaths = ['/dashboard', '/settings', '/profile']

    if (allowedPaths.some(path => safePath.startsWith(path))) {
      return safePath
    }
  }

  console.warn(`Blocked unauthorized redirect attempt to: ${callbackUrl}`)
  return defaultUrl
}

/**
 * Generates secure state parameter for OAuth flow
 * Prevents CSRF attacks during OAuth authentication
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64url')
}

/**
 * Validates OAuth redirect for NextAuth callback
 * @param url - Redirect URL to validate
 * @param baseUrl - Base URL of the application
 * @returns true if redirect is safe, false otherwise
 */
export function validateOAuthRedirect(url: string, baseUrl: string): boolean {
  if (!url) return false

  // Allow relative URLs starting with /
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true
  }

  // For absolute URLs, check if they match our base URL or are whitelisted
  try {
    const redirectUrl = new URL(url)
    const base = new URL(baseUrl)

    // Same origin
    if (redirectUrl.origin === base.origin) {
      return true
    }

    // Check whitelist
    return isValidRedirectUri(url)
  } catch {
    return false
  }
}

/**
 * Validates OAuth state parameter
 * @param state - State parameter from OAuth callback
 * @param storedState - State parameter stored in session
 * @returns true if states match, false otherwise
 */
export function validateOAuthState(state: string, storedState: string): boolean {
  if (!state || !storedState) return false

  // Constant-time comparison to prevent timing attacks
  if (state.length !== storedState.length) return false

  let result = 0
  for (let i = 0; i < state.length; i++) {
    result |= state.charCodeAt(i) ^ storedState.charCodeAt(i)
  }

  return result === 0
}