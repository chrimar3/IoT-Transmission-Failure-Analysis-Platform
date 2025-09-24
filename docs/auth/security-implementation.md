# Authentication Security Implementation

This document outlines the security measures implemented in the CU-BEMS IoT platform authentication system.

## Security Features Implemented

### 1. Secure Cookie Configuration

**Implementation**: `src/lib/auth/config.ts`

- **HttpOnly Cookies**: Prevents XSS attacks by making cookies inaccessible to JavaScript
- **SameSite Protection**: Set to 'lax' to prevent CSRF attacks
- **Secure Cookies**: HTTPS-only in production environment
- **Custom Cookie Names**: Uses `__Secure-` prefix for enhanced security

```typescript
cookies: {
  sessionToken: {
    name: `__Secure-next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
}
```

### 2. Rate Limiting

**Implementation**: `src/lib/auth/rate-limiting.ts`

- **Per-IP Rate Limiting**: Maximum 5 failed attempts per 15 minutes
- **Automatic Blocking**: 15-minute block after exceeding limits
- **Global Protection**: 100 attempts per 5 minutes across all IPs
- **Success Reset**: Counter resets on successful authentication

**Endpoints Protected**:
- `/api/auth/callback/credentials` (email/password login)
- `/api/auth/signin` (all sign-in attempts)

### 3. JWT Security

**Features**:
- **30-day expiration**: Automatic session timeout
- **Signed tokens**: Using NEXTAUTH_SECRET for integrity
- **Minimal payload**: Only essential user data included
- **Automatic refresh**: Sessions extend on user activity

### 4. Password Security

**Supabase Integration**:
- **bcrypt hashing**: Automatic password hashing in Supabase Auth
- **Minimum length**: 6+ characters required
- **Breach detection**: Supabase checks against known breaches
- **Rate limiting**: Protected by IP-based limiting

### 5. OAuth Security

**Google OAuth Configuration**:
- **PKCE flow**: Proof Key for Code Exchange enabled
- **Scope limitation**: Only essential scopes requested
- **State validation**: CSRF protection in OAuth flow
- **Secure redirects**: Validated callback URLs only

## Database Security

### Row Level Security (RLS)

**NextAuth Schema**: `next_auth.*`
- Users can only access their own authentication records
- Service role has full access for NextAuth operations
- Anonymous users have no access

**Application Schema**: `public.*`
- Subscription data filtered by authenticated user
- Activity logs restricted to user's own data
- Sensor data access controlled by subscription tier

### Database Permissions

```sql
-- NextAuth tables (restrictive)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA next_auth TO service_role;

-- Application tables (user-scoped)
CREATE POLICY "Users can read own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);
```

## Middleware Protection

**Implementation**: `middleware.ts`

### Route Protection
- **Public routes**: `/ `, `/auth/*`, `/api/auth/*`, `/api/health`
- **Protected routes**: `/dashboard/*`, `/api/data/*`, `/api/export/*`
- **Redirect handling**: Automatic redirect to sign-in with callback URL

### Subscription Enforcement
- **Free tier**: Basic dashboard access
- **Professional tier**: Advanced features and higher limits
- **Upgrade prompts**: Automatic redirect for tier-restricted features

## API Security

### Authentication Requirements
```typescript
// Protected API routes
if (!token) {
  return NextResponse.redirect(new URL('/auth/signin', req.url))
}
```

### Rate Limiting API
- **Endpoint**: `/api/auth/rate-limit`
- **Purpose**: Check current rate limiting status
- **Access**: Public (for client-side feedback)

## Security Monitoring

### Implemented Logging
- **Sign-in events**: User email and timestamp
- **Sign-out events**: Session termination
- **Rate limit violations**: IP and attempt count
- **Failed authentication**: IP and error details

### Audit Trail
```typescript
events: {
  async signIn(message) {
    console.log('User signed in:', message.user.email)
  },
  async signOut(message) {
    console.log('User signed out')
  },
}
```

## Production Security Checklist

### Environment Configuration
- [ ] `NEXTAUTH_SECRET` set to secure random value
- [ ] `NEXTAUTH_URL` set to production domain with HTTPS
- [ ] All OAuth credentials properly configured
- [ ] Database connection strings secured

### Cookie Security
- [ ] `useSecureCookies: true` in production
- [ ] `secure: true` for all auth cookies
- [ ] Domain restrictions configured
- [ ] SameSite policies enforced

### Database Security
- [ ] RLS policies enabled on all tables
- [ ] Service role permissions minimized
- [ ] Regular security updates applied
- [ ] Backup encryption enabled

### Monitoring & Alerting
- [ ] Failed authentication alerts
- [ ] Rate limit violation monitoring
- [ ] Unusual activity detection
- [ ] Security log aggregation

## Known Limitations (MVP)

### Rate Limiting
- **In-memory store**: Will reset on server restart
- **Single instance**: Not suitable for load-balanced deployment
- **Solution**: Migrate to Redis or database-backed rate limiting

### Session Management
- **JWT stateless**: Cannot revoke sessions server-side
- **30-day duration**: Long expiration for convenience
- **Solution**: Implement session blacklisting for immediate revocation

### Password Policy
- **Basic validation**: Only length requirement
- **No complexity rules**: Relying on Supabase defaults
- **Solution**: Implement custom password strength validation

## Future Enhancements

1. **Two-Factor Authentication**: TOTP or SMS-based 2FA
2. **Device Management**: Track and manage user devices
3. **Advanced Rate Limiting**: Redis-backed with sliding windows
4. **Session Management**: Server-side session revocation
5. **Security Headers**: CSP, HSTS, and other security headers
6. **Breach Monitoring**: Integration with HaveIBeenPwned API

## Incident Response

### Rate Limit Bypass
```bash
# Clear rate limiting for specific IP
curl -X DELETE /api/auth/rate-limit?ip=1.2.3.4
```

### Suspicious Activity
1. Review authentication logs
2. Check rate limiting violations
3. Validate OAuth callback URLs
4. Monitor for credential stuffing attacks

### Emergency Procedures
1. Rotate NEXTAUTH_SECRET (invalidates all sessions)
2. Update OAuth client secrets
3. Enable maintenance mode
4. Contact Supabase support for database issues