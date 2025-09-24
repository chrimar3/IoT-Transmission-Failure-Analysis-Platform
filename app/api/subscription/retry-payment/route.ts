import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { subscriptionService } from '@/lib/stripe/subscription.service'
import { stripe } from '@/lib/stripe/config'

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's subscription
    const subscription = await subscriptionService.getUserSubscription(session.user.id)

    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    // Get the latest invoice for this subscription
    const invoices = await stripe.invoices.list({
      subscription: subscription.stripeSubscriptionId,
      limit: 1,
      status: 'open',
    })

    if (invoices.data.length === 0) {
      return NextResponse.json(
        { error: 'No pending invoices found' },
        { status: 404 }
      )
    }

    const invoice = invoices.data[0]

    // Attempt to retry payment
    const retriedInvoice = await stripe.invoices.pay(invoice.id)

    if (retriedInvoice.status === 'paid') {
      // Update subscription status to active
      await subscriptionService.updateSubscription(session.user.id, {
        status: 'active',
      })

      return NextResponse.json({
        success: true,
        message: 'Payment successful',
        invoice: {
          id: retriedInvoice.id,
          status: retriedInvoice.status,
          amount: retriedInvoice.amount_paid,
        },
      })
    } else {
      return NextResponse.json(
        {
          error: 'Payment failed',
          message: 'Unable to process payment. Please check your payment method.',
          invoice: {
            id: retriedInvoice.id,
            status: retriedInvoice.status,
          },
        },
        { status: 400 }
      )
    }
  } catch (error: unknown) {
    console.error('Payment retry error:', error)

    // Handle specific Stripe errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message?: string; code?: string }
      if (stripeError.type === 'StripeCardError') {
        return NextResponse.json(
          {
            error: 'Card error',
            message: stripeError.message || 'Your card was declined. Please try a different payment method.',
            code: stripeError.code,
          },
          { status: 400 }
        )
      }

      if (error.type === 'StripeInvalidRequestError') {
        return NextResponse.json(
          {
            error: 'Invalid request',
            message: 'Unable to process payment retry. Please contact support.',
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Payment retry failed',
        message: 'An unexpected error occurred. Please try again or contact support.',
      },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}