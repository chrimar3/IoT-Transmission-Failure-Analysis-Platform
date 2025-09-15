# 🚀 Deployment Guide

## Overview

This guide covers deployment strategies for the CU-BEMS IoT Platform across different environments.

## Quick Deployment Options

### 1. Vercel (Recommended for MVP)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

### 2. Docker Deployment

```bash
# Build Docker image
docker build -t cu-bems-platform .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  cu-bems-platform
```

### 3. Self-Hosted (VPS/Cloud)

```bash
# Clone and setup
git clone [your-repo]
cd cu-bems-iot-platform
npm install
npm run build

# Start with PM2
npm install -g pm2
pm2 start npm --name "cu-bems" -- start
pm2 save
pm2 startup
```

## Production Environment Setup

### Prerequisites Checklist

- [ ] **Node.js** ≥18.0.0 installed
- [ ] **Supabase** project configured
- [ ] **SSL certificates** obtained
- [ ] **Domain name** configured
- [ ] **Environment variables** set
- [ ] **Database migrations** applied

### Environment Variables

Create a `.env.production` file with:

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com

# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secret-key

# Storage (Optional)
R2_ACCOUNT_ID=your_r2_account
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=cu-bems-production-data

# Monitoring (Optional)
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

### Database Setup

1. **Create Supabase Project**
```bash
# Install Supabase CLI
npm install -g supabase

# Login and init
supabase login
supabase init

# Link to your project
supabase link --project-ref your-project-ref
```

2. **Run Migrations**
```bash
# Apply database schema
npm run db:setup

# Verify connection
npm run db:status
```

### Security Configuration

#### 1. Supabase Row Level Security (RLS)
```sql
-- Enable RLS on sensor_readings table
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated access
CREATE POLICY "Enable read for authenticated users" ON sensor_readings
FOR SELECT TO authenticated USING (true);
```

#### 2. API Rate Limiting
```javascript
// middleware.js
import { NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h')
})

export async function middleware(request) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 })
  }

  return NextResponse.next()
}
```

## Performance Optimization

### 1. Build Optimization
```bash
# Enable production optimizations
NEXT_PUBLIC_ANALYZE=true npm run build

# Check bundle size
npm install -g @next/bundle-analyzer
npm run analyze
```

### 2. CDN Configuration
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-cdn-domain.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ]
  },
}
```

### 3. Database Indexing
```sql
-- Critical indexes for performance
CREATE INDEX idx_sensor_readings_sensor_id_timestamp
ON sensor_readings(sensor_id, timestamp);

CREATE INDEX idx_sensor_readings_floor_timestamp
ON sensor_readings(floor, timestamp);
```

## Monitoring & Alerting

### 1. Health Checks
```bash
# Add to your monitoring system
curl -f https://your-domain.com/api/health || exit 1
```

### 2. Log Aggregation
```javascript
// lib/logger.js
export const logger = {
  info: (message, meta) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      meta,
      timestamp: new Date().toISOString()
    }))
  },
  error: (message, error) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }))
  }
}
```

### 3. Performance Monitoring
```javascript
// pages/_app.js
import { reportWebVitals } from 'next/web-vitals'

export function reportWebVitals(metric) {
  if (process.env.NODE_ENV === 'production') {
    // Send to analytics service
    analytics.track('Web Vital', {
      name: metric.name,
      value: metric.value,
      id: metric.id,
    })
  }
}
```

## Backup & Recovery

### 1. Database Backups
```bash
# Daily automated backup
supabase db dump --db-url "$SUPABASE_DB_URL" > backup-$(date +%Y%m%d).sql

# Restore from backup
supabase db reset --db-url "$SUPABASE_DB_URL" --backup backup-20250913.sql
```

### 2. Code Backups
```bash
# Git backup strategy
git remote add backup git@backup-server:cu-bems-platform.git
git push backup main
```

## Scaling Strategy

### Horizontal Scaling
- **Load Balancer**: Nginx or cloud provider
- **Multiple Instances**: PM2 cluster mode or container orchestration
- **Database**: Supabase handles scaling automatically

### Vertical Scaling
- **Memory**: Minimum 1GB RAM for production
- **CPU**: 2+ cores recommended
- **Storage**: SSD for better I/O performance

## SSL/HTTPS Setup

### 1. Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Cloudflare (Recommended)
- Enable Cloudflare proxy
- Set SSL mode to "Full (Strict)"
- Enable "Always Use HTTPS"

## Troubleshooting

### Common Issues

1. **Build Failures**
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

2. **Database Connection**
```bash
# Test connection
npm run db:test

# Check Supabase status
curl https://your-project.supabase.co/rest/v1/
```

3. **Environment Variables**
```bash
# Verify variables are loaded
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### Performance Issues

1. **Slow API Responses**
- Check database query performance
- Verify indexes are in place
- Monitor memory usage

2. **High Memory Usage**
- Implement pagination for large datasets
- Use streaming for file operations
- Monitor for memory leaks

## Rollback Procedures

### 1. Code Rollback
```bash
# Rollback to previous commit
git reset --hard HEAD~1
npm run build
pm2 restart cu-bems
```

### 2. Database Rollback
```bash
# Restore from backup
supabase db reset --db-url "$SUPABASE_DB_URL" --backup backup-previous.sql
```

## Cost Optimization

### 1. Supabase
- Monitor database size and queries
- Use appropriate pricing tier
- Implement efficient queries

### 2. Hosting
- Use CDN for static assets
- Implement caching strategies
- Monitor bandwidth usage

### 3. Storage
- Compress datasets before upload
- Use appropriate storage classes
- Implement lifecycle policies

## Security Checklist

- [ ] HTTPS enabled everywhere
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] API rate limiting implemented
- [ ] Regular security updates applied
- [ ] Backup encryption enabled
- [ ] Access logs monitored
- [ ] Incident response plan ready

## Production Readiness Checklist

- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Database optimized
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] SSL certificates installed
- [ ] Domain configured
- [ ] Environment variables set
- [ ] Documentation updated

## Support & Maintenance

### 1. Update Schedule
- **Security patches**: Immediately
- **Minor updates**: Weekly
- **Major updates**: Monthly with testing

### 2. Monitoring Dashboard
- Application performance metrics
- Database performance
- Error rates and logs
- User analytics

### 3. On-call Procedures
- Define escalation paths
- Set up alert thresholds
- Create runbook for common issues