import NextAuth from 'next-auth'
import { _JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      subscriptionTier: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE'
      subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid'
      subscriptionId?: string
    } & {
      name?: string | null
      email?: string | null
      image?: string | null
    }
    expires: string
    accessToken?: string
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    subscriptionTier?: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    email?: string
    accessToken?: string
    refreshToken?: string
  }
}