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
  const retryCount = parseInt(headers().get('x-retry-count') || '0')
  const maxRetries = 3

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
    // Check if event already processed (idempotency)
    const alreadyProcessed = await checkEventProcessed(event.id)
    if (alreadyProcessed) {
      console.log(`Event ${event.id} already processed, skipping`)
      return NextResponse.json({ received: true, skipped: true })
    }

    await handleStripeEventWithRetry(event, retryCount, maxRetries)
    return NextResponse.json({
      received: true,
      retry_count: retryCount,
      event_id: event.id
    })
  } catch (error) {
    console.error('Webhook handler error:', error)

    // If we've exceeded max retries, mark as failed and don't retry
    if (retryCount >= maxRetries) {
      await logFailedWebhookEvent(event, error as Error, retryCount)
      return NextResponse.json(
        {
          error: 'Webhook handler failed after max retries',
          event_id: event.id,
          retry_count: retryCount,
          max_retries: maxRetries
        },
        { status: 500 }
      )
    }

    // For retriable errors, return 500 to trigger Stripe retry
    if (isRetriableError(error as Error)) {
      await scheduleWebhookRetry(event, retryCount + 1)
      return NextResponse.json(
        {
          error: 'Webhook handler failed, will retry',
          event_id: event.id,
          retry_count: retryCount,
          next_retry: retryCount + 1
        },
        { status: 500 }
      )
    }

    // Non-retriable errors should not be retried
    await logFailedWebhookEvent(event, error as Error, retryCount)
    return NextResponse.json(
      {
        error: 'Webhook handler failed - non-retriable error',
        event_id: event.id
      },
      { status: 400 }
    )
  }
}

// Webhook retry mechanism helper functions
async function checkEventProcessed(eventId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('subscription_events')
      .select('id')
      .eq('stripe_event_id', eventId)
      .limit(1)

    if (error) {
      console.error('Error checking event processed status:', error)
      return false // Assume not processed if we can't check
    }

    return data && data.length > 0
  } catch (error) {
    console.error('Error checking event processed status:', error)
    return false
  }
}

async function handleStripeEventWithRetry(
  event: Stripe.Event,
  retryCount: number,
  maxRetries: number
): Promise<void> {
  try {
    await handleStripeEvent(event)

    // Mark event as successfully processed
    await markEventProcessed(event, retryCount)
  } catch (error) {
    console.error(`Webhook processing failed (attempt ${retryCount + 1}/${maxRetries + 1}):`, error)

    // Log the retry attempt
    await logWebhookRetryAttempt(event, error as Error, retryCount)

    throw error // Re-throw to trigger retry logic
  }
}

async function markEventProcessed(event: Stripe.Event, retryCount: number): Promise<void> {
  try {
    // Find subscription ID if available
    let subscriptionId: string | undefined

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId
        if (userId) {
          const { data } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', userId)
            .single()
          subscriptionId = data?.id
        }
        break
    }

    await supabase.rpc('process_webhook_event_transactional', {
      p_stripe_event_id: event.id,
      p_event_type: `${event.type}_processed`,
      p_subscription_id: subscriptionId || null,
      p_event_data: {
        event_type: event.type,
        processed_at: new Date().toISOString(),
        retry_count: retryCount,
        success: true
      }
    })
  } catch (error) {
    console.error('Failed to mark event as processed:', error)
    // Don't throw here - the main processing succeeded
  }
}

async function isRetriableError(error: Error): Promise<boolean> {
  const retriableErrors = [
    'Database connection timeout',
    'Connection timeout',
    'Network error',
    'Service temporarily unavailable',
    'Rate limit exceeded',
    'Internal server error'
  ]

  const errorMessage = error.message.toLowerCase()
  return retriableErrors.some(pattern => errorMessage.includes(pattern.toLowerCase()))
}

async function scheduleWebhookRetry(event: Stripe.Event, nextRetryCount: number): Promise<void> {
  try {
    await supabase
      .from('webhook_retry_queue')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        event_data: event,
        retry_count: nextRetryCount,
        next_retry_at: new Date(Date.now() + Math.pow(2, nextRetryCount) * 1000), // Exponential backoff
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to schedule webhook retry:', error)
  }
}

async function logFailedWebhookEvent(event: Stripe.Event, error: Error, retryCount: number): Promise<void> {
  try {
    await supabase
      .from('subscription_events')
      .insert({
        stripe_event_id: event.id,
        event_type: `${event.type}_failed`,
        event_data: {
          event_type: event.type,
          error_message: error.message,
          error_stack: error.stack,
          retry_count: retryCount,
          failed_at: new Date().toISOString(),
          original_event: event
        },
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
  } catch (insertError) {
    console.error('Failed to log failed webhook event:', insertError)
  }
}

async function logWebhookRetryAttempt(event: Stripe.Event, error: Error, retryCount: number): Promise<void> {
  try {
    await supabase
      .from('subscription_events')
      .insert({
        stripe_event_id: event.id,
        event_type: `${event.type}_retry_attempt`,
        event_data: {
          event_type: event.type,
          error_message: error.message,
          retry_count: retryCount,
          retry_at: new Date().toISOString()
        },
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
  } catch (insertError) {
    console.error('Failed to log webhook retry attempt:', insertError)
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