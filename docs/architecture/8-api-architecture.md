# 8. API Architecture

## RESTful Endpoints (Simplified)
```typescript
// Core data access
GET /api/readings/summary - Dashboard overview
GET /api/readings/timeseries - Time-series data
GET /api/readings/patterns - Failure patterns
GET /api/export/{format} - Data export (Professional+)

// Subscription management
GET /api/subscription/status - Current tier info
POST /api/subscription/upgrade - Stripe checkout
POST /api/subscription/cancel - Cancel subscription
```

## Rate Limiting by Tier
- **Free**: 100 requests/hour
- **Professional**: 10,000 requests/hour
- **Future tiers**: Higher limits as needed

## API Failure Handling & Service Resilience (Epic 2-3 Critical Addition)

### Stripe API Failure Strategies
- **Payment Processing**: Retry logic with exponential backoff (3 attempts)
- **Webhook Failures**: Dead letter queue with manual reconciliation dashboard
- **Service Outages**: Graceful degradation - allow limited access during outages
- **Network Issues**: Local caching of subscription status (24-hour TTL)

### Supabase API Failure Strategies  
- **Database Outages**: Read-only mode with cached data serving
- **Connection Limits**: Connection pooling with retry queues
- **Query Timeouts**: Progressive query simplification (full -> simplified -> cached)
- **Rate Limit Hits**: Automatic request throttling with user notification

### Service Rate Limits & Monitoring
- **Supabase Free Tier**: 500MB storage, 2GB bandwidth, 100 concurrent connections
- **Stripe API**: 100 requests/second, with burst allowance to 1000
- **Email Service (Resend)**: 3K emails/month free tier, 100 emails/day limit
- **Rate Limit Monitoring**: Automated alerts at 80% of limits
- **Scaling Triggers**: Automatic tier upgrades when approaching limits (with user notification)

### Email Service Configuration & Use Cases
- **Transactional Emails**: Account verification, password resets, subscription confirmations
- **Notification Emails**: Alert notifications for Professional tier users
- **Marketing Emails**: Product updates, feature announcements (with opt-in)
- **Support Communications**: Customer support ticket responses
- **Subscription Management**: Payment confirmations, renewal reminders, cancellation confirmations
