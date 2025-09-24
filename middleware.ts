import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { securityHeadersMiddleware } from './middleware/security-headers'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Apply security headers to all responses
    let response: NextResponse

    // Allow access to public routes
    if (pathname.startsWith('/auth') || pathname === '/' || pathname.startsWith('/api/auth')) {
      response = NextResponse.next()
    }
    // Require authentication for protected routes
    else if (!token) {
      const signInUrl = new URL('/auth/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', req.url)
      response = NextResponse.redirect(signInUrl)
    }
    else {
      // For MVP: Basic subscription tier checking (will be enhanced in Story 2.3)
      const subscriptionTier = token.subscriptionTier || 'free'

      // Professional-only routes with proper error messaging
      if (pathname.startsWith('/professional') && subscriptionTier !== 'professional') {
        const upgradeUrl = new URL('/dashboard', req.url)
        upgradeUrl.searchParams.set('upgrade', 'required')
        upgradeUrl.searchParams.set('feature', 'professional')
        response = NextResponse.redirect(upgradeUrl)
      }
      // API rate limiting based on subscription tier
      else if (pathname.startsWith('/api/data') || pathname.startsWith('/api/export')) {
        // Add subscription tier to request headers for API rate limiting
        const requestHeaders = new Headers(req.headers)
        requestHeaders.set('x-subscription-tier', subscriptionTier)

        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      }
      else {
        response = NextResponse.next()
      }
    }

    // Apply security headers to all responses
    return securityHeadersMiddleware(req) || response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // Always allow access to auth routes and home page
        if (
          pathname.startsWith('/auth') ||
          pathname === '/' ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/health')
        ) {
          return true
        }

        // Require token for all other routes
        return !!token
      },
    },
  }
)

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}