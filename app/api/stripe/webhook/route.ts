import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, STRIPE_CONFIG, getSubscriptionTierFromPriceId } from '@/lib/stripe/config'
import { subscriptionService } from '@/lib/stripe/subscription.service'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')

  let event: Stripe.Event

  try {
    if (!signature || !STRIPE_CONFIG.WEBHOOK_SECRET) {
      throw new Error('Missing stripe signature or webhook secret')
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.WEBHOOK_SECRET
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    await handleStripeEvent(event)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleStripeEvent(event: Stripe.Event) {
  console.log(`Processing Stripe event: ${event.type}`)

  // Log event for debugging (in production, consider more sophisticated logging)
  await logSubscriptionEvent(event)

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
      break

    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
      break

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
      break

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
      break

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
      break

    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(event.data.object as Stripe.Subscription)
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  if (!userId) {
    console.error('No userId found in checkout session metadata')
    return
  }

  if (session.mode === 'subscription' && session.subscription) {
    // Retrieve the subscription to get full details
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    await updateSubscriptionFromStripe(userId, subscription)
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) {
    console.error('No userId found in subscription metadata')
    return
  }

  await updateSubscriptionFromStripe(userId, subscription)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) {
    // Try to find user by customer ID
    const { data } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (!data?.user_id) {
      console.error('No userId found for subscription:', subscription.id)
      return
    }

    await updateSubscriptionFromStripe(data.user_id, subscription)
  } else {
    await updateSubscriptionFromStripe(userId, subscription)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) {
    // Try to find user by customer ID
    const { data } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (!data?.user_id) {
      console.error('No userId found for subscription:', subscription.id)
      return
    }

    await updateSubscriptionFromStripe(data.user_id, subscription)
  } else {
    await updateSubscriptionFromStripe(userId, subscription)
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const userId = subscription.metadata?.userId

    if (userId) {
      // Update subscription status to active
      await subscriptionService.updateSubscription(userId, {
        status: 'active',
      })
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const userId = subscription.metadata?.userId

    if (userId) {
      // Update subscription status to past_due
      await subscriptionService.updateSubscription(userId, {
        status: 'past_due',
      })

      // Here you could send a notification email to the user
      console.log(`Payment failed for user ${userId}, subscription ${subscription.id}`)
    }
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (userId) {
    // Here you could send a notification email about trial ending
    console.log(`Trial ending soon for user ${userId}, subscription ${subscription.id}`)
  }
}

async function updateSubscriptionFromStripe(userId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id
  const tier = priceId ? getSubscriptionTierFromPriceId(priceId) : 'FREE'

  await subscriptionService.updateSubscription(userId, {
    tier: tier.toLowerCase(),
    status: subscription.status,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer as string,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  })
}

async function logSubscriptionEvent(event: Stripe.Event) {
  try {
    // Extract subscription ID if available
    let subscriptionId: string | undefined

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        subscriptionId = (event.data.object as Stripe.Subscription).id
        break
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        const invoice = event.data.object as Stripe.Invoice
        subscriptionId = invoice.subscription as string
        break
    }

    // Find our internal subscription ID if we have a Stripe subscription ID
    let internalSubscriptionId: string | undefined
    if (subscriptionId) {
      const { data } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('stripe_subscription_id', subscriptionId)
        .single()

      internalSubscriptionId = data?.id
    }

    // Log the event
    if (internalSubscriptionId) {
      await supabase
        .from('subscription_events')
        .insert({
          subscription_id: internalSubscriptionId,
          event_type: event.type,
          stripe_event_id: event.id,
          event_data: event.data.object,
        })
    }
  } catch (error) {
    console.error('Failed to log subscription event:', error)
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}