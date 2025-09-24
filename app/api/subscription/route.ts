import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { subscriptionService } from '@/lib/stripe/subscription.service'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's subscription details
    const subscription = await subscriptionService.getUserSubscription(session.user.id)
    const usage = await subscriptionService.getSubscriptionUsage(session.user.id)

    return NextResponse.json({
      subscription,
      usage,
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'cancel':
        const { atPeriodEnd = true } = body
        await subscriptionService.cancelSubscription(session.user.id, atPeriodEnd)
        return NextResponse.json({ success: true })

      case 'reactivate':
        await subscriptionService.reactivateSubscription(session.user.id)
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Subscription action error:', error)
    return NextResponse.json(
      { error: 'Failed to perform subscription action' },
      { status: 500 }
    )
  }
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}