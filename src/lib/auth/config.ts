import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { SupabaseAdapter } from '@next-auth/supabase-adapter'
import { createClient } from '@supabase/supabase-js'
import { subscriptionService } from '@/lib/stripe/subscription.service'
import { validateOAuthRedirect } from './oauth-security'
import { secureCookieConfig, secureSessionConfig, secureJwtConfig } from './session-security'
import { sanitizeAuthRequest } from './input-sanitization'

// Initialize Supabase client for NextAuth
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'next_auth',
    },
  }
)

export const authOptions: NextAuthOptions = {
  // Use Supabase adapter for user storage
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),

  // Configure session strategy with enhanced security
  session: secureSessionConfig,

  // Configure authentication providers
  providers: [
    // Google OAuth provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

      // Email/Password credentials provider with input sanitization
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'your-email@example.com',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Sanitize and validate input
        const sanitizationResult = sanitizeAuthRequest({
          email: credentials.email,
          password: credentials.password,
        })

        if (!sanitizationResult.valid) {
          console.error('Authentication validation failed:', sanitizationResult.errors)
          return null
        }

        try {
          // Use sanitized credentials for authentication
          const { data, error } = await supabase.auth.signInWithPassword({
            email: sanitizationResult.sanitized.email!,
            password: sanitizationResult.sanitized.password!,
          })

          if (error || !data.user) {
            console.error('Authentication error:', error)
            return null
          }

          return {
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.full_name || data.user.email!,
            image: data.user.user_metadata?.avatar_url,
          }
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      },
    }),
  ],

  // Configure callback URLs and pages
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  // Callback functions for JWT and session handling
  callbacks: {
    async jwt({ token, user, account }) {
      // Store user ID and subscription info in JWT token
      if (user) {
        token.sub = user.id

        // For MVP: Add basic user metadata
        token.email = user.email
        token.name = user.name || null
        token.picture = user.image || null
      }

      // Add account provider info
      if (account) {
        token.provider = account.provider
      }

      return token
    },

    async session({ session, token }) {
      // Add user ID and metadata to session
      if (token.sub) {
        session.user.id = token.sub
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string

        // Get user's current subscription
        try {
          const subscription = await subscriptionService.getUserSubscription(token.sub)
          session.user.subscriptionTier = subscription?.tier || 'FREE'
          session.user.subscriptionStatus = subscription?.status || 'active'
        } catch (error) {
          console.warn('Failed to fetch subscription for session:', error)
          session.user.subscriptionTier = 'FREE'
          session.user.subscriptionStatus = 'active'
        }
      }

      return session
    },

    async redirect({ url, baseUrl }) {
      // Validate OAuth redirect URLs against whitelist
      const isValidRedirect = validateOAuthRedirect(url, baseUrl)

      if (!isValidRedirect) {
        console.warn('Invalid redirect URL blocked:', url)
        return `${baseUrl}/dashboard`
      }

      // Safe redirect handling
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    },
  },

  // Security configuration
  secret: process.env.NEXTAUTH_SECRET,

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Enhanced security settings with secure cookies
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: secureCookieConfig,

  // Enhanced JWT configuration
  jwt: secureJwtConfig,

  // Event handlers for security logging
  events: {
    async signIn(message) {
      console.log('User signed in:', message.user.email)
    },
    async signOut() {
      console.log('User signed out')
    },
  },
}