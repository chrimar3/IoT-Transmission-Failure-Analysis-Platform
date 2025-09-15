# Story 1.5: Domain Setup & DNS Configuration

## Status
Draft

## Story
**As a** product owner,
**I want** the production domain configured with proper DNS settings and SSL certificates,
**so that** users can access the CU-BEMS IoT platform at a professional URL with secure HTTPS connections and proper subdomain routing for different application components.

## Acceptance Criteria
1. Domain registered and DNS configured with proper A/CNAME records pointing to Vercel
2. SSL certificates active and auto-renewing with 99.9% uptime
3. Subdomain strategy implemented with proper routing for api, app, and docs subdomains
4. Vercel deployment configured for custom domain with production environment variables
5. Domain redirects working properly (www to non-www, HTTP to HTTPS)
6. DNS propagation validated globally with monitoring and health checks
7. Environment-specific domain configuration (dev/staging/prod) with proper isolation

## Priority & Effort
**Priority**: P1 (Launch Blocking) - Required for production deployment and professional user experience
**Effort**: 2 points
**Epic**: Epic 1 - Core Data Foundation

## Tasks / Subtasks
- [ ] **Task 1: Domain Registration and Initial DNS Setup** (AC: 1, 6)
  - [ ] Register cu-bems-analytics.com domain (or similar professional domain name)
  - [ ] Configure domain registrar DNS settings to point to Vercel nameservers
  - [ ] Set up A records for root domain pointing to Vercel's IP addresses
  - [ ] Configure CNAME records for www subdomain
  - [ ] Validate DNS propagation using dig/nslookup tools globally
  - [ ] Set up DNS monitoring to alert on propagation issues

- [ ] **Task 2: Vercel Custom Domain Configuration** (AC: 4, 7)
  - [ ] Add custom domain to Vercel project configuration via dashboard or CLI
  - [ ] Configure production environment variables for custom domain (NEXTAUTH_URL)
  - [ ] Set up domain-specific environment configuration in next.config.js
  - [ ] Validate Vercel domain verification and SSL certificate provisioning
  - [ ] Test deployment with custom domain in production environment
  - [ ] Configure staging environment with staging subdomain (staging.cu-bems-analytics.com)

- [ ] **Task 3: SSL Certificate Setup and Auto-Renewal** (AC: 2)
  - [ ] Enable automatic SSL certificate provisioning via Vercel/Let's Encrypt integration
  - [ ] Configure SSL settings for HTTPS-only access with HSTS headers
  - [ ] Set up SSL certificate monitoring and expiration alerts
  - [ ] Test SSL certificate chain validation and browser compatibility
  - [ ] Configure SSL security headers (HSTS, CSP, X-Frame-Options) in next.config.js
  - [ ] Validate SSL Labs A+ rating for security configuration

- [ ] **Task 4: Subdomain Strategy Implementation** (AC: 3)
  - [ ] Configure api.cu-bems-analytics.com for API endpoints with proper CORS settings
  - [ ] Set up app.cu-bems-analytics.com for main application with authentication
  - [ ] Configure docs.cu-bems-analytics.com for API documentation (future)
  - [ ] Create subdomain-specific routing in Next.js middleware.ts
  - [ ] Test subdomain isolation and proper request routing
  - [ ] Validate subdomain SSL certificates and security settings

- [ ] **Task 5: Domain Redirects and URL Optimization** (AC: 5)
  - [ ] Configure www to non-www redirects via Vercel configuration
  - [ ] Set up HTTP to HTTPS redirects with 301 permanent redirects
  - [ ] Configure trailing slash handling for consistent URLs
  - [ ] Set up canonical URL configuration for SEO optimization
  - [ ] Test redirect chains and validate no infinite loops
  - [ ] Implement proper redirect status codes and caching headers

- [ ] **Task 6: Production Domain Validation and Monitoring** (AC: 6, 7)
  - [ ] Create comprehensive domain health check script
  - [ ] Set up uptime monitoring for all subdomains (UptimeRobot or similar)
  - [ ] Configure DNS monitoring and propagation alerts
  - [ ] Validate domain performance from multiple geographic locations
  - [ ] Set up SSL certificate expiration monitoring and alerts
  - [ ] Create domain troubleshooting runbook and rollback procedures

## Dev Notes

### Previous Story Dependencies
Building on the infrastructure established by:
- **Story 1.2**: Database schema provides the data layer requiring secure access
- **Story 1.3**: Supabase integration establishes the backend services needing domain access
- **Story 1.4**: Core API endpoints require proper domain configuration for production access

This story provides the final infrastructure piece enabling public access to the complete platform built in Stories 1.0-1.4.

### Domain Architecture Requirements
[Source: docs/architecture/12-deployment-strategy.md#domain-setup-requirements]

**Production Domain Structure**:
- **Primary**: cu-bems-analytics.com (main application)
- **API**: api.cu-bems-analytics.com (REST API endpoints)  
- **App**: app.cu-bems-analytics.com (authenticated dashboard)
- **Docs**: docs.cu-bems-analytics.com (future documentation)

**Environment Separation**:
- **Development**: localhost:3000 (local development)
- **Staging**: preview-*.vercel.app (pull request previews)
- **Production**: cu-bems-analytics.com (custom domain)

### Vercel Integration Specifications
[Source: docs/architecture/2-ultra-lean-technology-stack.md]

**Hosting Platform**: Vercel (serverless deployment)
- **DNS**: Vercel DNS with automatic SSL certificates
- **CDN**: Vercel Edge Network for global performance
- **SSL**: Automatic Let's Encrypt certificate provisioning and renewal

**Configuration Requirements**:
```javascript
// next.config.js domain configuration
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
        has: [{ type: 'host', value: 'api.cu-bems-analytics.com' }]
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ];
  }
};
```

### Security Implementation Requirements
[Source: docs/architecture/9-security-implementation.md]

**SSL/TLS Configuration**:
- **Protocol**: TLS 1.3 minimum with secure cipher suites
- **HSTS**: HTTP Strict Transport Security with includeSubDomains
- **Certificate**: Let's Encrypt with automatic renewal
- **Monitoring**: SSL certificate expiration alerts (30-day warning)

**Security Headers Configuration**:
```typescript
// middleware.ts security headers
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'"
  );
  
  return response;
}
```

### DNS Configuration Technical Details
[Source: docs/architecture/tech-stack.md]

**Required DNS Records**:
```
# Primary domain
cu-bems-analytics.com    A      76.76.19.61 (Vercel)
cu-bems-analytics.com    A      76.76.19.62 (Vercel)

# Subdomain configuration
api                      CNAME  cu-bems-analytics.com
app                      CNAME  cu-bems-analytics.com
docs                     CNAME  cu-bems-analytics.com
www                      CNAME  cu-bems-analytics.com

# Email and other services
@                        MX     10 mail.cu-bems-analytics.com
```

### File Locations and Environment Configuration
[Source: docs/architecture/source-tree.md]

**Configuration Files**:
- `/next.config.js` - Domain routing and security headers
- `/src/middleware.ts` - Subdomain routing and security middleware
- `/.env.production` - Production environment variables
- `/vercel.json` - Vercel deployment configuration

**Environment Variables**:
```bash
# Production domain configuration
NEXTAUTH_URL=https://cu-bems-analytics.com
NEXT_PUBLIC_APP_URL=https://cu-bems-analytics.com
NEXT_PUBLIC_API_URL=https://api.cu-bems-analytics.com

# SSL and security
NODE_TLS_REJECT_UNAUTHORIZED=1
FORCE_HTTPS=true
```

### Integration with Authentication System
[Source: docs/architecture/9-security-implementation.md]

**NextAuth.js Configuration**:
```typescript
// lib/auth.ts domain-specific configuration
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    redirect({ url, baseUrl }) {
      // Ensure redirects stay within our domain
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' 
          ? '.cu-bems-analytics.com' 
          : undefined
      }
    }
  }
};
```

### Monitoring and Alerting Configuration
[Source: docs/architecture/10-monitoring-observability.md]

**Domain Health Monitoring**:
- **Uptime**: UptimeRobot or similar service monitoring all subdomains
- **SSL**: Certificate expiration monitoring with 30-day alerts
- **DNS**: Propagation monitoring and failure alerts
- **Performance**: Domain response time monitoring from multiple locations

**Health Check Endpoints**:
```typescript
// src/app/api/health/route.ts
export async function GET() {
  const checks = {
    domain: process.env.NEXT_PUBLIC_APP_URL,
    ssl: await checkSSLCertificate(),
    dns: await checkDNSResolution(),
    database: await checkDatabaseConnection()
  };
  
  return NextResponse.json(checks);
}
```

### Production Readiness Requirements

**Performance Benchmarks**:
- **DNS Resolution**: <50ms average response time globally
- **SSL Handshake**: <200ms for initial connection establishment
- **Domain Response**: <100ms for health check endpoints
- **Global Availability**: 99.9% uptime across all geographic regions

**Failure Handling and Rollback Procedures**:
- **DNS Failures**: Automatic fallback to Vercel default domain
- **SSL Issues**: Automated certificate renewal with fallback procedures
- **Domain Propagation**: Monitoring and manual intervention procedures
- **Rollback Plan**: Documented steps to revert to staging environment

**Security Requirements**:
- **SSL Certificate**: A+ rating on SSL Labs test
- **Security Headers**: Proper HSTS, CSP, and frame options configuration
- **Domain Validation**: DV certificates with proper chain validation
- **Subdomain Isolation**: Proper cookie scope and CORS configuration

**Monitoring and Observability**:
- **Uptime Monitoring**: 1-minute interval checks for all subdomains
- **SSL Monitoring**: Certificate expiration alerts 30 days before expiry
- **DNS Monitoring**: Propagation delays and resolution failures
- **Performance Monitoring**: Response time tracking from multiple regions

**Documentation Requirements**:
- **Domain Setup Guide**: Step-by-step configuration documentation
- **Troubleshooting Guide**: Common issues and resolution procedures
- **Rollback Procedures**: Emergency domain reversion steps
- **Monitoring Setup**: Alert configuration and escalation procedures

### Testing Standards

**Domain Validation Testing**:
- **DNS Resolution**: Validate A/CNAME records resolve correctly globally
- **SSL Certificate**: Verify certificate chain and browser compatibility
- **Subdomain Routing**: Test proper request routing for all subdomains
- **Redirect Functionality**: Validate HTTP to HTTPS and www redirects
- **Security Headers**: Verify all security headers are properly set

**Testing Requirements**:
```bash
# DNS validation tests
dig cu-bems-analytics.com A
nslookup api.cu-bems-analytics.com

# SSL certificate tests
openssl s_client -connect cu-bems-analytics.com:443 -servername cu-bems-analytics.com

# HTTP security header tests
curl -I https://cu-bems-analytics.com

# Subdomain routing tests
curl https://api.cu-bems-analytics.com/api/health
```

**Test Coverage Requirements**:
- **Domain Resolution**: 100% validation of all DNS records
- **SSL Configuration**: Complete certificate chain validation
- **Security Headers**: Full security header coverage testing
- **Redirect Logic**: All redirect scenarios tested and validated

**Infrastructure Testing Strategy**:
- **Local Testing**: localhost domain configuration testing
- **Staging Testing**: Subdomain routing and SSL validation
- **Production Testing**: Full domain validation and performance testing
- **Monitoring Testing**: Alert system validation and escalation testing

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-01-11 | 1.0 | Initial story creation with basic requirements | Epic Definition |
| 2025-01-11 | 2.0 | Complete enhancement with comprehensive technical context, Dev Notes, testing procedures, and production readiness requirements following create-next-story workflow | Scrum Master |

## Dev Agent Record

*This section will be populated by the development agent during implementation*

### Agent Model Used
*To be filled by dev agent*

### Debug Log References
*To be filled by dev agent*

### Completion Notes List
*To be filled by dev agent*

### File List
*To be filled by dev agent*

## QA Results
*Results from QA Agent review of the completed story implementation will be recorded here*