import { DefaultSession, DefaultUser } from 'next-auth'
import { _JWT } from 'next-auth/jwt'

// Extend NextAuth types for our application
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      subscriptionTier: 'free' | 'professional'
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    id: string
    subscriptionTier?: 'free' | 'professional'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub: string
    provider?: string
    subscriptionTier?: 'free' | 'professional'
  }
}

// User profile types
export interface UserProfile {
  id: string
  email: string
  name: string | null
  image: string | null
  subscriptionTier: 'free' | 'professional'
  createdAt: string
  updatedAt: string
  emailVerified: boolean
  lastLogin: string | null
}

// Authentication error types
export interface AuthError {
  type: 'CredentialsSignin' | 'OAuthSignin' | 'OAuthCallback' | 'SessionRequired'
  message: string
}

// Registration data type
export interface RegistrationData {
  email: string
  password: string
  name: string
  acceptTerms: boolean
}