# Technical Architecture

## Authentication Architecture
```typescript
// NextAuth.js Configuration
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({ /* email/password */ }),
    GoogleProvider({ /* OAuth config */ })
  ],
  callbacks: {
    session: async ({ session, token }) => {
      // Add subscription tier to session
      const subscription = await getSubscriptionTier(session.user.id)
      session.user.subscriptionTier = subscription.tier
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup'
  }
}
```

## Subscription Management
```typescript
// Stripe Webhook Handler
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const event = stripe.webhooks.constructEvent(body, signature, secret)

  switch (event.type) {
    case 'customer.subscription.created':
      await updateSubscriptionStatus(event.data.object)
      break
    case 'invoice.payment_failed':
      await handlePaymentFailure(event.data.object)
      break
  }
}
```

## Access Control Middleware
```typescript
// API Route Protection
export function withSubscriptionTier(tier: 'free' | 'professional') {
  return async (req: NextRequest, res: NextResponse) => {
    const session = await getServerSession(authOptions)
    if (!session || session.user.subscriptionTier !== tier) {
      return NextResponse.json({ error: 'Subscription required' }, { status: 403 })
    }
    return NextResponse.next()
  }
}
```

---
