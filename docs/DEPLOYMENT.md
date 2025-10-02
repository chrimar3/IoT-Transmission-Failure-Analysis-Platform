# Deployment Guide

Complete deployment guide for the CU-BEMS IoT Transmission Failure Analysis Platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Vercel Deployment (Recommended)](#vercel-deployment-recommended)
- [Docker Deployment](#docker-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Third-Party Services](#third-party-services)
- [Production Checklist](#production-checklist)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **PostgreSQL**: v15.0 or higher (via Supabase)
- **Git**: Latest version

### Required Services

1. **Supabase Account** - Database and authentication
2. **Stripe Account** - Payment processing
3. **Cloudflare R2** - Object storage
4. **Google Cloud Console** - OAuth authentication
5. **Vercel Account** - Hosting (recommended)

## Vercel Deployment (Recommended)

### Why Vercel?

- Automatic CI/CD from GitHub
- Built-in SSL certificates
- Global CDN distribution
- Serverless function support
- Zero-config Next.js optimization

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Link Project

```bash
cd /path/to/cu-bems-iot-platform
vercel link
```

Follow the prompts:
- Set up and deploy: Yes
- Which scope: Select your account
- Link to existing project: No
- Project name: cu-bems-iot-platform
- Directory: ./

### Step 4: Configure Environment Variables

Add environment variables via Vercel Dashboard or CLI:

```bash
# Via CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXTAUTH_URL
vercel env add NEXTAUTH_SECRET
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add STRIPE_SECRET_KEY
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_PROFESSIONAL_PRODUCT_ID
vercel env add STRIPE_PROFESSIONAL_PRICE_ID
vercel env add R2_BUCKET_NAME
vercel env add R2_ACCESS_KEY_ID
vercel env add R2_SECRET_ACCESS_KEY
vercel env add NEXT_PUBLIC_R2_URL
```

Or via Vercel Dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add each variable with its value
4. Select environments: Production, Preview, Development

### Step 5: Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### Step 6: Configure Custom Domain (Optional)

1. Go to Vercel Dashboard > Project > Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate provisioning (automatic)

## Docker Deployment

### Build Docker Image

```bash
# Build the image
docker build -t cu-bems-platform:latest .

# Tag for registry
docker tag cu-bems-platform:latest your-registry/cu-bems-platform:1.0.0
```

### Run with Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    image: cu-bems-platform:latest
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Run:

```bash
docker-compose up -d
```

### Kubernetes Deployment

Create `kubernetes/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cu-bems-platform
  labels:
    app: cu-bems-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cu-bems-platform
  template:
    metadata:
      labels:
        app: cu-bems-platform
    spec:
      containers:
      - name: app
        image: your-registry/cu-bems-platform:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: cu-bems-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: cu-bems-service
spec:
  selector:
    app: cu-bems-platform
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

Deploy:

```bash
kubectl apply -f kubernetes/deployment.yaml
```

## Environment Configuration

### Production Environment Variables

Create `.env.production`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_secure_secret_min_32_chars

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PROFESSIONAL_PRODUCT_ID=prod_your_product_id
STRIPE_PROFESSIONAL_PRICE_ID=price_your_price_id

# Cloudflare R2
R2_BUCKET_NAME=cu-bems-iot-data
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
NEXT_PUBLIC_R2_URL=https://cu-bems-iot-data.r2.dev

# Optional: Analytics & Monitoring
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
SENTRY_DSN=https://your-sentry-dsn
```

### Generating Secure Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate strong password
openssl rand -base64 24
```

## Database Setup

### Supabase Configuration

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Note your project URL and keys

2. **Run Database Migrations**

```bash
# Test connection
npm run db:test

# Run migrations
npm run db:migrate

# Or manually via Supabase SQL Editor
# Run each migration file in order:
# - config/database/001-core-schema.sql
# - config/database/002-materialized-views.sql
# - config/database/003-rls-policies.sql
# - config/database/004-nextauth-schema.sql
# - config/database/005-stripe-subscription-schema.sql
```

3. **Configure Database Backup**
   - Supabase provides automatic daily backups
   - For additional backups, configure via Dashboard > Settings > Backups

4. **Enable Connection Pooling**
   - Go to Database Settings
   - Enable Connection Pooler
   - Use pooler connection string for high-traffic applications

## Third-Party Services

### 1. Supabase Setup

**Database:**
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

**Authentication:**
- Enable email/password provider
- Configure Google OAuth in Authentication > Providers
- Set redirect URLs: `https://your-domain.com/api/auth/callback/google`

**Row Level Security:**
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
```

### 2. Stripe Configuration

1. **Create Products:**
   - Go to Stripe Dashboard > Products
   - Create "Professional" tier at $49/month
   - Note Product ID and Price ID

2. **Configure Webhooks:**
   - Go to Developers > Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy webhook signing secret

3. **Test Mode vs Live Mode:**
   - Use test keys for staging
   - Use live keys for production
   - Never commit keys to Git

### 3. Google OAuth Setup

1. **Create OAuth Credentials:**
   - Go to Google Cloud Console
   - Create OAuth 2.0 Client ID
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (dev)
     - `https://your-domain.com/api/auth/callback/google` (prod)

2. **Configure OAuth Consent Screen:**
   - Add app name and logo
   - Add authorized domains
   - Define scopes: email, profile

### 4. Cloudflare R2 Setup

1. **Create R2 Bucket:**
   - Go to Cloudflare Dashboard > R2
   - Create bucket: `cu-bems-iot-data`
   - Enable public access for exported files

2. **Generate Access Keys:**
   - Create API token with R2 permissions
   - Save Access Key ID and Secret Access Key

3. **Configure CORS:**
```json
[
  {
    "AllowedOrigins": ["https://your-domain.com"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Production Checklist

### Pre-Deployment

- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] ESLint checks passing (`npm run lint`)
- [ ] Production build successful (`npm run build`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Third-party services configured

### Security

- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Environment secrets stored securely
- [ ] Database RLS policies enabled
- [ ] API rate limiting configured
- [ ] CORS policies configured
- [ ] CSP headers configured
- [ ] Dependencies audited (`npm audit`)

### Performance

- [ ] Bundle size optimized (<1MB initial load)
- [ ] Images optimized (WebP format)
- [ ] Database indexes created
- [ ] CDN configured (automatic with Vercel)
- [ ] Caching headers set
- [ ] Lazy loading implemented

### Monitoring

- [ ] Health check endpoint working
- [ ] Error tracking configured (Sentry recommended)
- [ ] Analytics configured (Google Analytics recommended)
- [ ] Uptime monitoring configured
- [ ] Database performance monitoring enabled
- [ ] Log aggregation configured

## Monitoring & Maintenance

### Health Checks

```bash
# Check application health
curl https://your-domain.com/api/health

# Expected response:
{
  "status": "healthy",
  "database": { "connected": true },
  "timestamp": "2025-10-02T12:00:00Z"
}
```

### Logging

Application logs are available in:
- **Vercel**: Dashboard > Project > Logs
- **Docker**: `docker logs cu-bems-platform`
- **Kubernetes**: `kubectl logs -f deployment/cu-bems-platform`

### Performance Monitoring

Key metrics to monitor:
- **API Response Time**: Target <100ms
- **Dashboard Load Time**: Target <2s
- **Database Query Time**: Target <50ms
- **Error Rate**: Target <0.1%
- **Uptime**: Target 99.9%

### Backup Strategy

1. **Database Backups:**
   - Supabase: Automatic daily backups
   - Manual: `pg_dump` via Supabase dashboard

2. **Code Backups:**
   - Git repository (primary)
   - GitHub (remote backup)

3. **User Data:**
   - R2 exports backed up to secondary storage
   - Retention policy: 90 days

## Troubleshooting

### Common Issues

**1. Build Failures**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

**2. Database Connection Issues**
```bash
# Test connection
npm run db:test

# Check connection string format
# Correct: postgresql://user:pass@host:5432/db?sslmode=require
```

**3. Environment Variable Issues**
```bash
# Verify all required variables are set
npm run env:check

# For production
npm run env:validate-production
```

**4. Stripe Webhook Failures**
- Verify webhook endpoint is accessible
- Check webhook signing secret matches
- Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**5. OAuth Issues**
- Verify redirect URIs match exactly
- Check OAuth credentials are for correct environment
- Ensure callback URLs are whitelisted

### Performance Optimization

If experiencing slow performance:

1. **Enable Database Connection Pooling**
2. **Optimize Database Queries:**
   ```sql
   -- Add indexes for frequently queried columns
   CREATE INDEX idx_sensor_data_timestamp ON sensor_data(timestamp);
   CREATE INDEX idx_export_jobs_user_id ON export_jobs(user_id);
   ```

3. **Enable Next.js Caching:**
   ```typescript
   // In API routes
   export const revalidate = 60; // Revalidate every 60 seconds
   ```

4. **Optimize Bundle Size:**
   ```bash
   npm run build
   # Analyze bundle with @next/bundle-analyzer
   ```

### Getting Help

- **Documentation**: Check `/docs` directory
- **Issues**: GitHub Issues tracker
- **Support**: Contact via GitHub
- **Community**: GitHub Discussions

## Rollback Procedure

If deployment fails:

### Vercel
```bash
# List recent deployments
vercel list

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### Docker
```bash
# Rollback to previous image
docker tag cu-bems-platform:1.0.0 cu-bems-platform:rollback
docker-compose down
docker-compose up -d
```

### Kubernetes
```bash
# Rollback to previous deployment
kubectl rollout undo deployment/cu-bems-platform

# Check rollback status
kubectl rollout status deployment/cu-bems-platform
```

## Post-Deployment Verification

Run these checks after deployment:

```bash
# 1. Health check
curl https://your-domain.com/api/health

# 2. API endpoints
curl https://your-domain.com/api/insights

# 3. Authentication flow
# - Visit /auth/signin
# - Complete Google OAuth
# - Verify redirect to dashboard

# 4. Subscription flow
# - Visit /pricing
# - Start checkout
# - Verify webhook processing

# 5. Performance check
# - Dashboard load time <2s
# - API response time <100ms
```

## Continuous Deployment

### GitHub Actions Workflow

The project includes automated CI/CD:

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
```

Features:
- Automatic tests on push
- Type checking
- Linting
- Build verification
- Automatic deployment to Vercel

### Manual Deployment

For manual deployments:

```bash
# 1. Update version
npm version patch # or minor, major

# 2. Build and test
npm run build
npm test

# 3. Deploy
vercel --prod

# 4. Tag release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

---

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe API Documentation](https://stripe.com/docs/api)

For questions or issues, please open a GitHub issue or contact the maintainers.
