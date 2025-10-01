# Domain Setup and Production Deployment Guide

**Epic 1 Story 1.5: Production Domain Setup**

This guide provides comprehensive instructions for configuring a custom domain for the CU-BEMS IoT Transmission Failure Analysis Platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Domain Registration](#domain-registration)
3. [DNS Configuration](#dns-configuration)
4. [SSL Certificate Setup](#ssl-certificate-setup)
5. [Vercel Custom Domain Configuration](#vercel-custom-domain-configuration)
6. [Subdomain Strategy](#subdomain-strategy)
7. [Health Check Verification](#health-check-verification)
8. [Monitoring and Alerts](#monitoring-and-alerts)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting the domain setup process, ensure you have:

- [ ] A registered domain name (recommended: `.com`, `.io`, or `.tech`)
- [ ] Access to domain registrar DNS management
- [ ] Vercel account with deployment access
- [ ] Admin access to the CU-BEMS platform
- [ ] SSL certificate provider (or use Vercel's automatic SSL)

---

## Domain Registration

### Recommended Registrars

1. **Cloudflare Registrar** (recommended for performance)
   - Built-in CDN and DDoS protection
   - Free SSL certificates
   - Competitive pricing

2. **Namecheap**
   - Easy-to-use interface
   - Good customer support
   - Free WHOIS privacy

3. **Google Domains**
   - Simple management
   - Integrated with Google services
   - Reliable DNS

### Domain Selection Guidelines

**Primary Domain Options:**
- `cu-bems-analytics.com` (professional, descriptive)
- `cu-bems.io` (modern, tech-focused)
- `bems-analytics.tech` (industry-specific)

**Considerations:**
- Short and memorable
- Includes key terms (BEMS, analytics)
- Avoid hyphens and numbers
- Check trademark conflicts

---

## DNS Configuration

### Required DNS Records

#### A Records (for root domain)

```
Type: A
Name: @
Value: 76.76.19.19
TTL: 3600
```

#### CNAME Records (for subdomains)

```
# Main application
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600

# API subdomain
Type: CNAME
Name: api
Value: cname.vercel-dns.com
TTL: 3600

# Documentation
Type: CNAME
Name: docs
Value: cname.vercel-dns.com
TTL: 3600
```

#### TXT Records (for verification)

```
# Domain verification
Type: TXT
Name: @
Value: vercel-verification=<verification-token>
TTL: 3600

# SPF record (if sending emails)
Type: TXT
Name: @
Value: v=spf1 include:_spf.google.com ~all
TTL: 3600
```

### DNS Configuration Steps

1. **Login to DNS Provider**
   ```bash
   # Example: Cloudflare
   # Navigate to: DNS > Records
   ```

2. **Add A Record for Root Domain**
   - Point `@` (root) to Vercel's IP: `76.76.19.19`
   - Set TTL to 3600 seconds (1 hour)

3. **Add CNAME for www**
   - Point `www` to `cname.vercel-dns.com`
   - Enable proxy if using Cloudflare

4. **Add Subdomains**
   - `api.cu-bems-analytics.com` → API endpoints
   - `docs.cu-bems-analytics.com` → Documentation
   - `app.cu-bems-analytics.com` → Dashboard (optional)

5. **Verify DNS Propagation**
   ```bash
   # Check DNS propagation
   dig cu-bems-analytics.com
   dig www.cu-bems-analytics.com
   dig api.cu-bems-analytics.com

   # Or use online tools
   # https://dnschecker.org/
   ```

---

## SSL Certificate Setup

### Option 1: Vercel Automatic SSL (Recommended)

Vercel automatically provisions SSL certificates via Let's Encrypt when you add a custom domain.

**Steps:**
1. Add domain in Vercel dashboard
2. Wait for DNS propagation (up to 48 hours)
3. Certificate is automatically issued and renewed

**Benefits:**
- Free
- Automatic renewal
- No manual configuration
- Wildcard support

### Option 2: Custom SSL Certificate

If you need custom SSL (e.g., Extended Validation):

1. **Generate CSR (Certificate Signing Request)**
   ```bash
   openssl req -new -newkey rsa:2048 -nodes \
     -keyout cu-bems-analytics.key \
     -out cu-bems-analytics.csr
   ```

2. **Purchase Certificate**
   - Submit CSR to certificate authority
   - Validate domain ownership
   - Download certificate files

3. **Install in Vercel**
   - Navigate to: Project Settings > Domains > Advanced
   - Upload certificate and private key
   - Configure intermediate certificates

### SSL Configuration Checklist

- [ ] Certificate covers all subdomains (wildcard or multiple SANs)
- [ ] Certificate chain includes intermediate certificates
- [ ] Private key is securely stored
- [ ] Certificate expiry monitoring enabled
- [ ] HTTPS redirect configured
- [ ] HSTS header enabled

---

## Vercel Custom Domain Configuration

### Adding Domain to Vercel

1. **Navigate to Project Settings**
   ```
   Vercel Dashboard → Your Project → Settings → Domains
   ```

2. **Add Custom Domain**
   ```
   Click "Add" → Enter domain name → Click "Add"
   ```

3. **Configure DNS**
   - Vercel will show required DNS records
   - Add these records to your DNS provider
   - Wait for verification (usually < 5 minutes)

4. **Enable Production Deployment**
   ```
   Set primary domain: cu-bems-analytics.com
   Redirect www to root (or vice versa)
   ```

### Environment Variables for Custom Domain

Update `.env.production`:

```bash
# Domain Configuration
NEXT_PUBLIC_APP_URL=https://cu-bems-analytics.com
NEXTAUTH_URL=https://cu-bems-analytics.com
NEXT_PUBLIC_API_URL=https://api.cu-bems-analytics.com

# Stripe Configuration (update webhook URL)
STRIPE_WEBHOOK_URL=https://cu-bems-analytics.com/api/stripe/webhook

# CORS Configuration
ALLOWED_ORIGINS=https://cu-bems-analytics.com,https://www.cu-bems-analytics.com,https://api.cu-bems-analytics.com
```

### Update Stripe Webhook URL

```bash
# Via Stripe Dashboard
# 1. Go to: Developers > Webhooks
# 2. Click on your webhook endpoint
# 3. Update URL to: https://cu-bems-analytics.com/api/stripe/webhook
# 4. Save changes

# Via Stripe CLI
stripe webhooks update <webhook_id> \
  --url https://cu-bems-analytics.com/api/stripe/webhook
```

---

## Subdomain Strategy

### Recommended Subdomain Structure

```
Root Domain:
├── cu-bems-analytics.com (main application)
├── www.cu-bems-analytics.com (redirect to root)
├── api.cu-bems-analytics.com (API endpoints)
├── docs.cu-bems-analytics.com (documentation)
├── status.cu-bems-analytics.com (status page - optional)
└── admin.cu-bems-analytics.com (admin panel - optional)
```

### API Subdomain Configuration

**Benefits of Separate API Subdomain:**
- Cleaner URLs for API consumers
- Easier rate limiting and caching
- Better analytics separation
- CORS management

**Implementation:**

1. **Create API Subdomain in Vercel**
   ```
   Add domain: api.cu-bems-analytics.com
   Point to: Same Vercel project
   ```

2. **Update API Routes**
   ```typescript
   // Next.js middleware for API subdomain
   // middleware.ts
   export function middleware(request: NextRequest) {
     const hostname = request.headers.get('host');

     if (hostname?.startsWith('api.')) {
       // Only serve /api/* routes on API subdomain
       if (!request.nextUrl.pathname.startsWith('/api/')) {
         return NextResponse.redirect(
           new URL('/api/docs', request.url)
         );
       }
     }

     return NextResponse.next();
   }
   ```

3. **Update Documentation**
   - All API examples should use `api.cu-bems-analytics.com`
   - Update Swagger configuration with new base URL

---

## Health Check Verification

### Automated Health Checks

After domain setup, verify system health:

```bash
# Basic health check
curl https://cu-bems-analytics.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-09-30T12:00:00.000Z",
  "environment": "production",
  "services": {
    "database": { "status": "operational" },
    "authentication": { "status": "operational" },
    "storage": { "status": "operational" }
  },
  "domain": {
    "name": "cu-bems-analytics.com",
    "ssl": true,
    "certificate": {
      "valid": true,
      "expires": "2025-12-30T00:00:00.000Z"
    }
  }
}
```

### Health Check Endpoints

| Endpoint | Purpose | Response Time Target |
|----------|---------|---------------------|
| `/api/health` | Overall system health | < 200ms |
| `/api/health/database` | Database connectivity | < 500ms |
| `/api/health/stripe` | Stripe integration | < 1000ms |
| `/api/health/auth` | Authentication system | < 200ms |

### Monitoring Setup

```bash
# Create uptime monitoring (recommended services)
# 1. UptimeRobot (free tier available)
# 2. Pingdom
# 3. StatusCake
# 4. Better Stack

# Configure checks:
# - URL: https://cu-bems-analytics.com/api/health
# - Interval: 5 minutes
# - Alert on: Status !== 200 OR response.status !== "healthy"
```

---

## Monitoring and Alerts

### Required Monitoring

1. **Uptime Monitoring**
   - Check every 5 minutes
   - Alert on downtime > 2 minutes
   - Track response times

2. **SSL Certificate Monitoring**
   - Alert 30 days before expiry
   - Verify certificate chain
   - Check for revocation

3. **DNS Monitoring**
   - Verify DNS resolution
   - Alert on DNS propagation issues
   - Monitor DNS query times

4. **Performance Monitoring**
   - Page load times
   - API response times
   - Database query performance

### Alert Configuration

```yaml
# Example: Better Stack Alert Configuration
alerts:
  - name: "Production Down"
    condition: status_code != 200
    channels: [email, slack]
    severity: critical

  - name: "Slow Response"
    condition: response_time > 2000
    channels: [email]
    severity: warning

  - name: "SSL Expiring Soon"
    condition: ssl_expires_in < 30_days
    channels: [email, slack]
    severity: high
```

---

## Troubleshooting

### Common Issues

#### 1. DNS Not Propagating

**Symptoms:**
- Domain not resolving
- SSL certificate not provisioning

**Solutions:**
```bash
# Check DNS propagation
dig cu-bems-analytics.com +short

# Force DNS refresh (MacOS)
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Force DNS refresh (Windows)
ipconfig /flushdns

# Wait up to 48 hours for global propagation
```

#### 2. SSL Certificate Issues

**Symptoms:**
- "Not Secure" warning in browser
- Certificate mismatch errors

**Solutions:**
1. Verify domain ownership in Vercel
2. Check DNS CNAME points to Vercel
3. Wait for automatic certificate provisioning (up to 24 hours)
4. Check certificate includes all subdomains

#### 3. Redirect Loops

**Symptoms:**
- ERR_TOO_MANY_REDIRECTS
- Page keeps redirecting

**Solutions:**
```bash
# Check for conflicting redirects
# 1. Vercel domain settings
# 2. Next.js middleware
# 3. CDN/proxy settings (if using Cloudflare)

# Disable Cloudflare proxy temporarily
# Cloudflare DNS → Click cloud icon → "DNS Only"
```

#### 4. CORS Errors

**Symptoms:**
- API calls fail from frontend
- "No 'Access-Control-Allow-Origin' header" error

**Solutions:**
```typescript
// Update Next.js API routes
// app/api/[route]/route.ts
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://cu-bems-analytics.com',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

#### 5. Webhook Delivery Failures

**Symptoms:**
- Stripe webhooks not received
- Subscription updates not processing

**Solutions:**
1. Update webhook URL in Stripe Dashboard
2. Verify webhook signing secret
3. Check webhook endpoint health: `/api/stripe/webhook`
4. Review webhook DLQ: `/api/stripe/webhook/retry`

### Domain Verification Commands

```bash
# Complete domain verification checklist
echo "=== DNS Verification ==="
dig cu-bems-analytics.com +short
dig www.cu-bems-analytics.com +short
dig api.cu-bems-analytics.com +short

echo "=== SSL Verification ==="
curl -I https://cu-bems-analytics.com | grep -i "ssl\|tls"
openssl s_client -connect cu-bems-analytics.com:443 -servername cu-bems-analytics.com < /dev/null

echo "=== Health Check ==="
curl https://cu-bems-analytics.com/api/health | jq .

echo "=== API Accessibility ==="
curl https://api.cu-bems-analytics.com/api/docs | jq .

echo "=== Performance Test ==="
curl -w "@curl-format.txt" -o /dev/null -s https://cu-bems-analytics.com
```

### Support Resources

- **Vercel Documentation**: https://vercel.com/docs/concepts/projects/domains
- **Cloudflare DNS Guide**: https://developers.cloudflare.com/dns/
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **CU-BEMS Support**: support@cu-bems-analytics.com

---

## Post-Deployment Checklist

- [ ] All DNS records configured and propagated
- [ ] SSL certificate active and valid
- [ ] Health check endpoints responding
- [ ] Stripe webhooks updated and tested
- [ ] NextAuth URL updated
- [ ] API documentation accessible
- [ ] Uptime monitoring configured
- [ ] SSL expiry alerts configured
- [ ] Performance monitoring enabled
- [ ] Error tracking (Sentry) configured
- [ ] CDN cache configured (if applicable)
- [ ] Rate limiting tested
- [ ] CORS configuration verified
- [ ] Subdomain redirects working
- [ ] Email delivery tested (if applicable)
- [ ] Backup and disaster recovery plan documented

---

## Next Steps

After completing domain setup:

1. **Update Marketing Materials**
   - Update website with new domain
   - Update email signatures
   - Update business cards

2. **Configure Analytics**
   - Add domain to Google Analytics
   - Update Google Search Console
   - Configure conversion tracking

3. **SEO Optimization**
   - Submit sitemap to search engines
   - Configure robots.txt
   - Set up structured data

4. **Security Hardening**
   - Enable WAF rules
   - Configure rate limiting
   - Set up DDoS protection
   - Enable security headers (CSP, HSTS, etc.)

---

**Document Version**: 1.0
**Last Updated**: 2025-09-30
**Maintained By**: DevOps Team
**Review Cycle**: Quarterly