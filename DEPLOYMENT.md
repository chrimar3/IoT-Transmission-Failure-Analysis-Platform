# CU-BEMS IoT Platform - Production Deployment Guide

## 🚀 Production Deployment Checklist

### Pre-Deployment Setup

#### 1. Environment Configuration
- [ ] Copy `.env.production` to your deployment platform
- [ ] Replace ALL placeholder values with actual production credentials
- [ ] Run `npm run env:validate-production` to verify configuration
- [ ] Ensure no development URLs or test values remain

#### 2. Database Setup
- [ ] Set up production Supabase project (separate from development)
- [ ] Configure production database connection strings
- [ ] Run database migrations: `npm run db:migrate`
- [ ] Set up database backups and monitoring
- [ ] Configure Row Level Security (RLS) policies

#### 3. Authentication & Security
- [ ] Configure production Google OAuth credentials
- [ ] Set up production NextAuth configuration
- [ ] Generate secure secrets (NEXTAUTH_SECRET, JWT_SECRET, ENCRYPTION_KEY)
- [ ] Configure CORS policies for production domain
- [ ] Set up SSL certificates

#### 4. Payment Processing
- [ ] Configure production Stripe account
- [ ] Set up production webhook endpoints
- [ ] Test payment flows in Stripe test mode first
- [ ] Configure production product and pricing IDs

#### 5. File Storage & CDN
- [ ] Set up production Cloudflare R2 bucket
- [ ] Configure CDN for static assets
- [ ] Set up proper CORS policies for file uploads

### Deployment Steps

#### 1. Build Verification
```bash
# Install dependencies
npm ci

# Run type checking
npm run typecheck

# Run tests
npm run test:ci

# Build for production
npm run build

# Validate environment
npm run env:validate-production
```

#### 2. Database Migration
```bash
# Test database connection
npm run db:test

# Check database status
npm run db:status

# Run migrations
npm run db:migrate
```

#### 3. Platform-Specific Deployment

##### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXTAUTH_SECRET
# ... (repeat for all production variables)
```

##### Docker Deployment
```bash
# Build production image
docker build -t cu-bems-iot-platform .

# Run with environment file
docker run -d --env-file .env.production -p 3000:3000 cu-bems-iot-platform
```

##### Traditional Server Deployment
```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start npm --name "cu-bems-iot" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

### Post-Deployment Verification

#### 1. Health Checks
- [ ] Verify application loads at production URL
- [ ] Test authentication flow
- [ ] Verify database connectivity
- [ ] Test API endpoints
- [ ] Check file upload/download functionality

#### 2. Security Verification
- [ ] Verify HTTPS is working correctly
- [ ] Test authentication and authorization
- [ ] Verify no sensitive data is exposed in client
- [ ] Check CORS configuration
- [ ] Verify rate limiting is active

#### 3. Performance & Monitoring
- [ ] Set up error monitoring (Sentry)
- [ ] Configure performance monitoring
- [ ] Set up uptime monitoring
- [ ] Configure alerting for critical issues
- [ ] Test under load

#### 4. Business Logic Testing
- [ ] Test sensor data ingestion
- [ ] Verify analytics calculations
- [ ] Test report generation
- [ ] Verify subscription management
- [ ] Test alert system

### Production Environment Variables

#### Required Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_64_char_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Application
NODE_ENV=production
API_BASE_URL=https://api.your-domain.com
```

#### Optional but Recommended
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://user:pass@host:6379

# Monitoring
SENTRY_DSN=https://your-sentry-dsn

# File Storage
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
```

### Troubleshooting

#### Common Issues
1. **Environment variables not loading**
   - Verify `.env.production` is in correct location
   - Check platform-specific environment variable configuration
   - Ensure no extra spaces or quotes in variable values

2. **Database connection failures**
   - Verify connection string format
   - Check firewall/network policies
   - Ensure SSL is configured correctly

3. **Authentication not working**
   - Verify OAuth redirect URLs are correct
   - Check NEXTAUTH_URL matches deployment domain
   - Ensure NEXTAUTH_SECRET is set and consistent

4. **Payment processing issues**
   - Verify Stripe webhook endpoints are configured
   - Check webhook secret matches Stripe dashboard
   - Ensure production keys are being used

### Security Best Practices

1. **Environment Variables**
   - Never commit production secrets to version control
   - Use secure secret management in deployment platform
   - Rotate secrets regularly

2. **Database Security**
   - Enable Row Level Security (RLS)
   - Use connection pooling
   - Regular security updates

3. **API Security**
   - Rate limiting enabled
   - Input validation on all endpoints
   - Proper error handling (no sensitive data exposure)

4. **Monitoring**
   - Error tracking with Sentry
   - Performance monitoring
   - Security scanning

### Rollback Procedure

If issues occur after deployment:

1. **Immediate Rollback**
   ```bash
   # Vercel
   vercel rollback

   # Docker
   docker run previous_image_tag

   # PM2
   pm2 stop cu-bems-iot
   # Deploy previous version
   pm2 start cu-bems-iot
   ```

2. **Database Rollback**
   - Restore from latest backup
   - Run rollback migrations if available

3. **Verification**
   - Test all critical functionality
   - Monitor error rates
   - Verify user experience

### Support & Maintenance

- **Documentation**: Keep deployment notes updated
- **Monitoring**: Set up alerts for critical metrics
- **Backups**: Automated daily database backups
- **Updates**: Regular security updates and dependency updates
- **Performance**: Regular performance audits

---

## 📞 Emergency Contacts

- **Technical Lead**: [Your contact information]
- **DevOps**: [DevOps contact information]
- **Database Admin**: [DBA contact information]

---

*Last updated: September 2024*