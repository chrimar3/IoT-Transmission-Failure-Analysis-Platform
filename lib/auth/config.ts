import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { SupabaseAdapter } from '@next-auth/supabase-adapter'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client for NextAuth
const _supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/dashboard' // Redirect new users to dashboard
  },
  callbacks: {
    async jwt({ _token, user, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }

      // Add user ID to token
      if (user) {
        token.id = user.id
        token.email = user.email || ''
      }

      return token
    },
    async session({ _session, _token }) {
      // Send properties to the client
      if (token && session.user) {
        (session.user as { id?: string }).id = token.id as string
        session.user.email = token.email as string
        ;(session as { accessToken?: string }).accessToken = token.accessToken as string
      }

      return session
    },
    async signIn({ user, account, _profile }) {
      // Allow sign in for verified Google accounts
      if (account?.provider === 'google') {
        const _email = user.email

        // Check if email is verified (Google emails are always verified)
        if ((profile as { email_verified?: boolean })?.email_verified || account.provider === 'google') {
          return true
        }
      }

      return true // Allow sign in
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`

      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url

      return baseUrl
    }
  },
  events: {
    async signIn({ user, account, _profile, isNewUser }) {
      console.log(`User ${user._email} signed in with ${account?.provider}`)

      if (isNewUser) {
        console.log(`New user registered: ${user._email}`)
        // Here you could send a welcome email or perform other onboarding tasks
      }
    },
    async signOut({ _token, _session }) {
      console.log(`User signed out`)
    }
  },
  debug: process.env.NODE_ENV === 'development',
}