import { DefaultSession, DefaultUser } from 'next-auth'
import { _JWT, DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      subscriptionTier: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE'
      subscriptionStatus: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    id: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    sub: string
    email: string
    name: string
    picture: string
    provider: string
  }
}