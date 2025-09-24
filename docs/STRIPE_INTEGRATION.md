# Stripe Subscription Integration

This document outlines the complete Stripe subscription system implementation for the CU-BEMS IoT Platform.

## Overview

The platform implements a two-tier subscription model:
- **Free Tier**: 5 exports/month, basic analytics, community support
- **Professional Tier**: €29/month, unlimited exports, advanced analytics, priority support, API access

## Features Implemented

### ✅ Core Subscription Management
- Stripe SDK integration with TypeScript support
- Secure checkout flow using Stripe Checkout
- Customer portal for subscription management
- Webhook processing for real-time subscription updates
- Feature access control based on subscription tiers

### ✅ Payment Processing
- Secure payment handling via Stripe
- Multiple payment method support (cards)
- Automatic tax calculation
- Invoice management
- Payment failure handling and recovery

### ✅ User Experience
- Responsive pricing page with feature comparison
- Subscription management dashboard
- Usage tracking and limits enforcement
- Upgrade prompts and CTAs
- Success/cancellation pages

### ✅ Developer Experience
- React hooks for subscription management
- Feature gate components
- TypeScript type safety
- Comprehensive error handling
- Activity tracking and analytics

## File Structure

```
src/lib/stripe/
├── config.ts                      # Stripe configuration and constants
├── subscription.service.ts        # Main subscription service
└── middleware/
    └── subscription.middleware.ts # API route protection

app/api/stripe/
├── checkout/route.ts              # Checkout session creation
├── portal/route.ts                # Customer portal access
└── webhook/route.ts               # Stripe webhook handler

app/api/subscription/
├── route.ts                       # Subscription CRUD operations
└── retry-payment/route.ts         # Payment failure recovery

app/subscription/
├── pricing/page.tsx               # Pricing and plans page
├── success/page.tsx               # Post-checkout success
├── canceled/page.tsx              # Checkout cancellation
└── manage/page.tsx                # Subscription management

src/components/subscription/
├── FeatureGate.tsx                # Feature access control
├── UsageIndicator.tsx             # Usage tracking display
└── PaymentFailureAlert.tsx        # Payment failure notifications

src/hooks/
└── useSubscription.ts             # Subscription management hook

src/types/
└── next-auth.d.ts                 # Extended NextAuth types
```

## Environment Variables

Add these variables to your `.env.local`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PROFESSIONAL_PRODUCT_ID=prod_...
STRIPE_PROFESSIONAL_PRICE_ID=price_...
```

## Database Schema

The subscription system uses these database tables:

### subscriptions
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- tier: VARCHAR(20) ('free' | 'professional')
- status: VARCHAR(20) (Stripe subscription status)
- stripe_subscription_id: VARCHAR(100)
- stripe_customer_id: VARCHAR(100)
- current_period_start: TIMESTAMPTZ
- current_period_end: TIMESTAMPTZ
- cancel_at_period_end: BOOLEAN
- canceled_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### subscription_events
```sql
- id: UUID (Primary Key)
- subscription_id: UUID (Foreign Key)
- event_type: VARCHAR(50)
- stripe_event_id: VARCHAR(100)
- event_data: JSONB
- processed_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

### user_activity
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key)
- action_type: VARCHAR(50)
- resource_accessed: VARCHAR(100)
- timestamp: TIMESTAMPTZ
- ip_address: INET
- user_agent: TEXT
```

## API Endpoints

### Subscription Management
- `GET /api/subscription` - Get user's subscription details
- `POST /api/subscription` - Cancel/reactivate subscription

### Stripe Integration
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Open customer portal
- `POST /api/stripe/webhook` - Handle Stripe webhooks

### Payment Recovery
- `POST /api/subscription/retry-payment` - Retry failed payments

## Usage Examples

### Feature Gating
```tsx
import { FeatureGate } from '@/components/subscription/FeatureGate'

function AdvancedAnalytics() {
  return (
    <FeatureGate
      feature="advanced_analytics"
      fallback={<BasicAnalytics />}
    >
      <ProfessionalAnalytics />
    </FeatureGate>
  )
}
```

### Usage Tracking
```tsx
import { UsageIndicator } from '@/components/subscription/UsageIndicator'

function Dashboard() {
  return (
    <div>
      <UsageIndicator type="exports" />
      {/* Other dashboard content */}
    </div>
  )
}
```

### Subscription Hook
```tsx
import { useSubscription } from '@/hooks/useSubscription'

function ExportButton() {
  const { checkFeatureAccess, upgradeToProfessional } = useSubscription()

  const handleExport = async () => {
    const access = await checkFeatureAccess('export')

    if (!access.canAccess) {
      if (access.upgradeRequired) {
        upgradeToProfessional()
      } else {
        alert(access.message)
      }
      return
    }

    // Proceed with export
    performExport()
  }

  return <button onClick={handleExport}>Export Data</button>
}
```

### API Route Protection
```tsx
import { withSubscription } from '@/lib/middleware/subscription.middleware'

export const POST = withSubscription({ feature: 'export' })(
  async function handler(request: NextRequest) {
    // Protected route logic
    return NextResponse.json({ success: true })
  }
)
```

## Webhook Events Handled

The system processes these Stripe webhook events:

- `checkout.session.completed` - New subscription activation
- `customer.subscription.created` - Subscription created
- `customer.subscription.updated` - Subscription changes
- `customer.subscription.deleted` - Subscription cancellation
- `invoice.payment_succeeded` - Successful payment
- `invoice.payment_failed` - Failed payment
- `customer.subscription.trial_will_end` - Trial ending notification

## Feature Access Control

Features are gated based on subscription tiers:

| Feature | Free | Professional |
|---------|------|-------------|
| Dashboard Access | ✅ | ✅ |
| Basic Analytics | ✅ | ✅ |
| Monthly Exports | 5 | Unlimited |
| Advanced Analytics | ❌ | ✅ |
| API Access | ❌ | ✅ |
| Custom Reports | ❌ | ✅ |
| Priority Support | ❌ | ✅ |

## Error Handling

The system handles various error scenarios:

### Payment Failures
- Automatic retry attempts
- User notification system
- Graceful degradation to free tier
- Payment method update prompts

### Webhook Failures
- Event deduplication
- Retry logic
- Comprehensive logging
- Error recovery procedures

### API Errors
- Subscription status validation
- Feature access verification
- User-friendly error messages
- Upgrade prompts when appropriate

## Testing

To test the subscription system:

1. Use Stripe test mode keys
2. Test checkout flow with test card numbers
3. Simulate webhook events using Stripe CLI
4. Verify feature access at different subscription states
5. Test payment failure and recovery scenarios

## Security Considerations

- All Stripe API calls use secret keys server-side
- Webhook signatures are verified
- User sessions are validated for all operations
- Subscription status is checked on each request
- Sensitive data is encrypted and logged appropriately

## Monitoring and Analytics

The system tracks:
- Subscription creation and cancellation rates
- Feature usage patterns
- Payment failure rates
- User activity and engagement
- Revenue metrics and trends

## Deployment Checklist

Before deploying to production:

- [ ] Update Stripe keys to live mode
- [ ] Configure webhook endpoints in Stripe dashboard
- [ ] Set up monitoring and alerting
- [ ] Test all subscription flows
- [ ] Verify database migrations
- [ ] Configure backup and recovery procedures
- [ ] Set up customer support processes

## Support and Maintenance

For ongoing maintenance:
- Monitor webhook delivery success rates
- Track subscription metrics and trends
- Handle customer subscription issues
- Update Stripe API versions as needed
- Maintain compliance with payment regulations