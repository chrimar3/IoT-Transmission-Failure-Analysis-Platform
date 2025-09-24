import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { subscriptionService } from '@/lib/stripe/subscription.service'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe/config'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { tier } = body

    // Validate tier
    if (tier !== 'professional') {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      )
    }

    // Check if user already has an active subscription
    const existingSubscription = await subscriptionService.getUserSubscription(session.user.id)
    if (existingSubscription?.status === 'active' && existingSubscription?.tier === 'PROFESSIONAL') {
      return NextResponse.json(
        { error: 'User already has an active professional subscription' },
        { status: 400 }
      )
    }

    // Get the origin for success/cancel URLs
    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // Create checkout session
    const checkoutSession = await subscriptionService.createCheckoutSession(
      session.user.id,
      session.user.email,
      SUBSCRIPTION_TIERS.PROFESSIONAL.stripePriceId,
      `${origin}/subscription/success`,
      `${origin}/subscription/canceled`
    )

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error('Checkout session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}