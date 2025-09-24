import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { subscriptionService } from '@/lib/stripe/subscription.service'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has a subscription
    const subscription = await subscriptionService.getUserSubscription(session.user.id)
    if (!subscription || !subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    // Get the origin for return URL
    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // Create customer portal session
    const portalSession = await subscriptionService.createCustomerPortalSession(
      session.user.id,
      `${origin}/subscription/manage`
    )

    return NextResponse.json({
      url: portalSession.url,
    })
  } catch (error) {
    console.error('Customer portal session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
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