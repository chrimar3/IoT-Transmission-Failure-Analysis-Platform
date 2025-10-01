# System Architecture

This document provides a comprehensive overview of the CU-BEMS IoT Transmission Failure Analysis Platform architecture.

## Table of Contents

- [High-Level Overview](#high-level-overview)
- [Technology Stack](#technology-stack)
- [System Components](#system-components)
- [Data Flow](#data-flow)
- [Authentication & Authorization](#authentication--authorization)
- [Database Architecture](#database-architecture)
- [API Architecture](#api-architecture)
- [Pattern Detection Engine](#pattern-detection-engine)
- [Export System](#export-system)
- [Resilience & Error Handling](#resilience--error-handling)
- [Performance Optimizations](#performance-optimizations)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Next.js    │  │    React     │  │  Tailwind    │          │
│  │  App Router  │  │ Components   │  │     CSS      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  REST APIs   │  │  WebSocket   │  │  Middleware  │          │
│  │  /api/v1/*   │  │   Streams    │  │  Auth, Rate  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Pattern    │  │    Export    │  │  Subscription│          │
│  │  Detection   │  │   Manager    │  │   Service    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │  Cloudflare  │  │    Stripe    │          │
│  │  (Supabase)  │  │      R2      │  │     API      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.3 (Strict Mode)
- **UI Library**: React 18.2
- **Styling**: Tailwind CSS 3.4
- **Charts**: Chart.js 4.4
- **Forms**: React Hook Form
- **State Management**: React Context + Hooks

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL 14 (Supabase)
- **ORM**: Supabase Client
- **Payment**: Stripe API
- **Storage**: Cloudflare R2

### Infrastructure
- **Hosting**: Vercel
- **Database**: Supabase (PostgreSQL)
- **CDN**: Cloudflare
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (optional)

### Development
- **Package Manager**: npm
- **Testing**: Jest 29.7 + React Testing Library
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript

---

## System Components

### 1. Frontend Components

#### Dashboard Components
```
/app/dashboard/
├── page.tsx                 # Main dashboard
├── executive/page.tsx       # Executive summary
├── time-series/page.tsx     # Time-series analytics
├── patterns/page.tsx        # Pattern detection
└── components/
    ├── RealTimeMetrics.tsx
    ├── AlertsPanel.tsx
    ├── TimeSeriesChart.tsx
    └── ExportModal.tsx
```

#### UI Component Library
```
/src/components/
├── export/                  # Export functionality
├── statistical/             # Statistical components
└── features/analytics/      # Analytics components
```

### 2. API Routes

```
/app/api/
├── auth/                    # NextAuth endpoints
├── v1/                      # Professional API v1
│   ├── data/
│   ├── patterns/
│   └── webhooks/
├── patterns/
│   ├── detect/              # Pattern detection
│   └── stream/              # Real-time updates
├── export/
│   ├── create/              # Create export job
│   ├── status/[jobId]/      # Check export status
│   └── download/[jobId]/    # Download export
└── stripe/
    └── webhook/             # Stripe webhooks
```

### 3. Core Services

#### Pattern Detection Engine
```typescript
/lib/algorithms/
├── PatternClassifier.ts     # 5 pattern types
├── PatternCorrelationAnalyzer.ts
├── cache-service.ts         # LRU caching
└── detection-config.ts
```

#### Export Manager
```typescript
/src/lib/export/
├── export-manager.ts        # Job orchestration
├── excel-generator.ts       # Excel exports
├── pdf-generator.tsx        # PDF exports
├── storage-service.ts       # R2 integration
└── usage-tracking-service.ts
```

#### Subscription Service
```typescript
/lib/stripe/
├── subscription-cache.ts    # LRU cache
├── webhook-dlq.ts           # Dead letter queue
└── production-validation.ts
```

---

## Data Flow

### 1. User Authentication Flow

```
User Login Request
    │
    ▼
NextAuth.js
    │
    ├─► Email/Password ──► Supabase Auth
    │
    └─► Google OAuth ──► Google API ──► Supabase
                                            │
                                            ▼
                                    Create Session
                                            │
                                            ▼
                                    Check Subscription
                                    (Stripe Customer ID)
                                            │
                                            ▼
                                    Redirect to Dashboard
```

### 2. Pattern Detection Flow

```
Client Request
    │
    ▼
API Middleware
    │
    ├─► Authentication Check
    ├─► Rate Limiting Check (tier-based)
    └─► Subscription Validation
                │
                ▼
        Pattern Detection Engine
                │
                ├─► Fetch Sensor Data (PostgreSQL)
                ├─► Check Cache (LRU, 5min TTL)
                ├─► Calculate Statistics (Welford's algorithm)
                ├─► Detect Patterns (5 types)
                ├─► Classify Risk Scores
                └─► Correlate Patterns
                            │
                            ▼
                    Cache Results
                            │
                            ▼
                    Return JSON Response
                            │
                            ▼
                    WebSocket Stream (optional)
```

### 3. Export Flow

```
Export Request (Professional Tier Only)
    │
    ▼
Usage Tracking
    │
    ├─► Check Daily Quota
    ├─► Check Export Limits
    └─► Validate Subscription
                │
                ▼
        Export Job Creation
                │
                ├─► Generate Unique Job ID
                ├─► Store Job Status (pending)
                └─► Queue Processing
                            │
                            ▼
                    Background Processing
                            │
                            ├─► Fetch Data
                            ├─► Generate File (CSV/Excel/PDF)
                            ├─► Upload to R2 Storage
                            └─► Update Job Status (completed)
                                        │
                                        ▼
                                Notify User (WebSocket)
                                        │
                                        ▼
                                User Downloads File
```

---

## Authentication & Authorization

### NextAuth.js Configuration

```typescript
// /src/lib/auth/config.ts
export const authOptions = {
  providers: [
    CredentialsProvider,  // Email/Password
    GoogleProvider,       // OAuth
  ],
  callbacks: {
    async session({ session, token }) {
      // Attach subscription tier
      session.user.subscriptionTier = token.subscriptionTier;
      session.user.customerId = token.stripeCustomerId;
      return session;
    }
  }
}
```

### Authorization Hierarchy

```
Free Tier
├── Dashboard access (read-only)
├── Basic analytics
├── API: 100 requests/hour
└── No exports

Professional Tier
├── Full dashboard access
├── Advanced analytics
├── Pattern detection
├── API: 10,000 requests/hour
├── CSV/Excel/PDF exports
└── Real-time updates

Enterprise Tier
├── All Professional features
├── API: 100,000 requests/hour
├── Custom integrations
├── Priority support
└── SLA guarantees
```

---

## Database Architecture

### Schema Overview

```sql
-- Users & Authentication
users
├── id (uuid)
├── email
├── name
├── created_at
└── subscription_tier

-- Subscription Management
subscriptions
├── id (uuid)
├── user_id (fk)
├── stripe_customer_id
├── stripe_subscription_id
├── tier (free|professional|enterprise)
├── status (active|canceled|past_due)
└── current_period_end

-- IoT Sensor Data
sensor_readings
├── id (bigint)
├── sensor_id
├── floor_id
├── timestamp
├── temperature
├── humidity
├── co2_level
├── energy_consumption
└── status (online|offline|failure)

-- Pattern Detection Results
detected_patterns
├── id (uuid)
├── pattern_type
├── severity
├── confidence_score
├── start_time
├── end_time
├── affected_sensors[]
└── metadata (jsonb)

-- Export Jobs
export_jobs
├── id (uuid)
├── user_id (fk)
├── status (pending|processing|completed|failed)
├── format (csv|excel|pdf)
├── file_url
├── created_at
└── expires_at

-- API Keys
api_keys
├── id (uuid)
├── user_id (fk)
├── key_hash
├── name
├── last_used_at
└── expires_at
```

### Row Level Security (RLS)

```sql
-- Users can only see their own data
CREATE POLICY user_isolation ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- API keys are user-specific
CREATE POLICY api_key_isolation ON api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Export jobs are user-specific
CREATE POLICY export_isolation ON export_jobs
  FOR ALL USING (auth.uid() = user_id);
```

---

## API Architecture

### REST API Design

```
/api/v1/data/analytics
├── GET    - Fetch analytics data
├── Query Params:
│   ├── startDate (ISO 8601)
│   ├── endDate (ISO 8601)
│   ├── sensors[] (array)
│   └── limit (default: 100)
└── Response: { success, data, pagination }

/api/v1/data/patterns
├── GET    - List detected patterns
├── POST   - Trigger pattern detection
└── Response: { success, data, metadata }

/api/v1/webhooks
├── POST   - Register webhook
├── GET    - List webhooks
├── DELETE - Remove webhook
└── Response: { success, webhook }
```

### Rate Limiting

```typescript
// Tier-based rate limits
const RATE_LIMITS = {
  free: { requests: 100, window: '1h' },
  professional: { requests: 10000, window: '1h' },
  enterprise: { requests: 100000, window: '1h' }
};

// Implemented using sliding window algorithm
// Stored in Redis or PostgreSQL
```

---

## Pattern Detection Engine

### Algorithm Overview

```typescript
// 1. Data Collection
const sensorData = await fetchSensorReadings(timeRange);

// 2. Statistical Analysis (Welford's algorithm for O(n))
const stats = calculateStatistics(sensorData);
// → mean, variance, stdDev in single pass

// 3. Pattern Classification (5 types)
const patterns = classifyPatterns(sensorData, stats);
// → sustained_failure
// → cascade_risk
// → intermittent
// → gradual_degradation
// → threshold_breach

// 4. Risk Scoring
const riskScore = calculateRiskScore(pattern, stats);
// → severity * dataQuality * temporal * impact

// 5. Correlation Analysis
const correlations = findCorrelations(patterns);
// → Z-score anomaly detection
// → Pearson correlation coefficient
```

### Performance Optimizations

- **Parallel Processing**: Promise.all() for concurrent operations
- **LRU Caching**: 5-minute TTL for statistics and correlations
- **Welford's Algorithm**: Single-pass variance calculation
- **Result**: 99.8% improvement (4.3s → 6.33ms)

---

## Export System

### Export Manager Architecture

```typescript
class ExportManager {
  // 1. Create job
  async createExportJob(userId, format, options) {
    // Check quota
    // Create job record
    // Queue for processing
  }

  // 2. Process job
  async processExportJob(jobId) {
    // Fetch data
    // Generate file
    // Upload to R2
    // Update status
  }

  // 3. Monitor job
  async getJobStatus(jobId) {
    // Return current status
    // Include download URL if completed
  }
}
```

### Storage Strategy

- **Cloudflare R2**: Object storage for export files
- **Pre-signed URLs**: Secure, time-limited download links
- **Expiration**: Files deleted after 7 days
- **Encryption**: Files encrypted at rest

---

## Resilience & Error Handling

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  states: 'CLOSED' | 'OPEN' | 'HALF_OPEN'

  // CLOSED: Normal operation
  // OPEN: Failures exceeded, reject requests
  // HALF_OPEN: Test if service recovered

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new CircuitBreakerOpenError();
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

### Webhook Dead Letter Queue (DLQ)

```typescript
// Exponential backoff: 1s → 2s → 4s → 8s → 16s → 32s
class WebhookDLQ {
  async retryWebhook(eventId) {
    const event = await this.getEvent(eventId);
    const backoffMs = this.calculateBackoff(event.retry_count);

    await sleep(backoffMs);
    return this.processWebhook(event);
  }

  calculateBackoff(retryCount) {
    return Math.min(
      INITIAL_BACKOFF * Math.pow(2, retryCount),
      MAX_BACKOFF
    );
  }
}
```

---

## Performance Optimizations

### Frontend Optimizations

- **Code Splitting**: Dynamic imports for heavy components
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: webpack-bundle-analyzer
- **CSS Optimization**: Tailwind CSS purge

### Backend Optimizations

- **Database Connection Pooling**: max 20 connections
- **Query Optimization**: Indexed columns, efficient JOINs
- **Caching Strategy**: LRU cache with 5-min TTL
- **Response Compression**: gzip/brotli

### Metrics

- Dashboard load: <2 seconds
- API response time: <100ms (cached), <3s (uncached)
- Pattern detection: 6.33ms average
- Database queries: <50ms average

---

## Security Architecture

### API Security

```typescript
// 1. Authentication
const session = await getServerSession(authOptions);
if (!session) return unauthorized();

// 2. Rate Limiting
const allowed = await checkRateLimit(session.user.id);
if (!allowed) return tooManyRequests();

// 3. Input Validation
const validated = schema.parse(requestBody);

// 4. Authorization
if (!hasPermission(session.user, resource)) {
  return forbidden();
}
```

### Data Protection

- **Encryption at Rest**: PostgreSQL encryption
- **Encryption in Transit**: TLS 1.3
- **API Keys**: Hashed with bcrypt
- **Secrets Management**: Environment variables
- **SQL Injection**: Parameterized queries
- **XSS Protection**: React escaping + CSP headers

---

## Deployment Architecture

### Vercel Deployment

```
Production Environment
├── Region: us-east-1
├── Node.js: 18.x
├── Build Command: npm run build
└── Output: .next/

Environment Variables
├── DATABASE_URL
├── NEXT_PUBLIC_SUPABASE_URL
├── SUPABASE_SERVICE_ROLE_KEY
├── NEXTAUTH_SECRET
├── STRIPE_SECRET_KEY
├── R2_ACCOUNT_ID
└── R2_ACCESS_KEY_ID
```

### CI/CD Pipeline

```
GitHub Push
    │
    ▼
Run Tests
    │
    ├─► Linting (ESLint)
    ├─► Type Checking (TypeScript)
    ├─► Unit Tests (Jest)
    └─► Integration Tests
            │
            ▼
        Quality Gates
            │
            ├─► Code Coverage ≥85%
            ├─► No Linting Errors
            └─► All Tests Pass
                    │
                    ▼
                Deploy to Vercel
                    │
                    ├─► Preview (PRs)
                    └─► Production (main branch)
```

---

## Monitoring & Observability

### Metrics Tracked

- API response times
- Error rates
- Database query performance
- Pattern detection latency
- Export job success rate
- Webhook delivery success
- User session duration

### Logging Strategy

```typescript
// Structured logging
logger.info({
  level: 'info',
  message: 'Pattern detection completed',
  metadata: {
    duration: '6.33ms',
    patterns_found: 12,
    user_id: 'uuid',
    timestamp: new Date().toISOString()
  }
});
```

---

## Future Architecture Considerations

### Scalability

- **Microservices**: Split monolith into services
- **Message Queue**: Redis/RabbitMQ for async processing
- **Horizontal Scaling**: Multiple API instances
- **Database Sharding**: Partition by user/region

### Features

- **GraphQL API**: Alternative to REST
- **Real-time Collaboration**: Multi-user dashboards
- **ML Models**: TensorFlow.js for client-side inference
- **Mobile Apps**: React Native for iOS/Android

---

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Project README](README.md)
- [Contributing Guidelines](CONTRIBUTING.md)

---

**Last Updated**: 2025-10-01
**Version**: 1.0.0
**Maintainer**: [@chrimar3](https://github.com/chrimar3)
