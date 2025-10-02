# Troubleshooting Guide

Common issues and solutions for the CU-BEMS IoT Transmission Failure Analysis Platform.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Build Errors](#build-errors)
- [Runtime Errors](#runtime-errors)
- [Database Issues](#database-issues)
- [Authentication Problems](#authentication-problems)
- [API Errors](#api-errors)
- [Performance Issues](#performance-issues)
- [Deployment Problems](#deployment-problems)
- [Third-Party Service Issues](#third-party-service-issues)
- [Getting Help](#getting-help)

## Installation Issues

### npm install fails

**Problem:** Package installation fails with dependency conflicts

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still failing, try legacy peer deps
npm install --legacy-peer-deps
```

### Node version mismatch

**Problem:** `Error: The engine "node" is incompatible with this module`

**Solution:**
```bash
# Check current Node version
node --version

# Install Node 18+ using nvm
nvm install 18
nvm use 18

# Verify version
node --version  # Should be ≥18.0.0
```

### Python dependencies fail

**Problem:** Python analytics scripts fail to install

**Solution:**
```bash
# Ensure Python 3.11+ is installed
python3 --version

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# If specific package fails
pip install --upgrade pip
pip install <package-name> --no-cache-dir
```

## Build Errors

### TypeScript compilation errors

**Problem:** `npm run build` fails with TypeScript errors

**Solution:**
```bash
# Check TypeScript version
npx tsc --version

# Run type check to see all errors
npm run typecheck

# Common fixes:
# 1. Update types
npm install --save-dev @types/node@latest @types/react@latest

# 2. Clear TypeScript cache
rm -rf .next tsconfig.tsbuildinfo

# 3. Rebuild
npm run build
```

### Module not found errors

**Problem:** `Error: Cannot find module '@/components/...'`

**Solution:**
```typescript
// Check tsconfig.json paths are correct
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  }
}
```

```bash
# Restart TypeScript server in VS Code
# Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
# > TypeScript: Restart TS Server
```

### Build timeout on Vercel

**Problem:** Vercel build times out after 5 minutes

**Solution:**
```bash
# Optimize build in next.config.js
module.exports = {
  // Reduce bundle size
  swcMinify: true,

  // Optimize fonts
  optimizeFonts: true,

  // Disable source maps in production
  productionBrowserSourceMaps: false,
}
```

Upgrade to Vercel Pro for longer build times if needed.

## Runtime Errors

### Hydration mismatch

**Problem:** `Error: Hydration failed because the initial UI does not match what was rendered on the server`

**Solution:**
```typescript
// 1. Check for browser-only APIs
// Bad:
const value = localStorage.getItem('key');

// Good:
const [value, setValue] = useState(null);
useEffect(() => {
  setValue(localStorage.getItem('key'));
}, []);

// 2. Use suppressHydrationWarning for dynamic content
<div suppressHydrationWarning>
  {new Date().toLocaleString()}
</div>

// 3. Use dynamic imports for client-only components
import dynamic from 'next/dynamic';

const ClientOnlyComponent = dynamic(
  () => import('./ClientComponent'),
  { ssr: false }
);
```

### Environment variables not loading

**Problem:** `process.env.NEXT_PUBLIC_SUPABASE_URL is undefined`

**Solution:**
```bash
# 1. Check file naming
# Must be .env.local (not .env)

# 2. Check variable prefix
# Client-side variables MUST start with NEXT_PUBLIC_

# 3. Restart dev server after adding variables
npm run dev

# 4. For production, check Vercel environment variables
# Vercel Dashboard > Project > Settings > Environment Variables
```

### "use client" directive issues

**Problem:** `Error: useState can only be used in Client Components`

**Solution:**
```typescript
// Add "use client" directive at top of file
'use client';

import { useState } from 'react';

export function MyComponent() {
  const [state, setState] = useState(0);
  // ...
}
```

## Database Issues

### Cannot connect to Supabase

**Problem:** `Error: Connection refused` or timeout

**Solution:**
```bash
# 1. Test connection
npm run db:test

# 2. Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Verify Supabase project is running
# Go to https://app.supabase.com
# Check project status

# 4. Check network/firewall
# Ensure port 5432 is not blocked
# Try from different network if behind corporate firewall
```

### Migration fails

**Problem:** Database migration errors

**Solution:**
```bash
# 1. Check migration order
# Migrations must run in sequence:
# 001-core-schema.sql
# 002-materialized-views.sql
# 003-rls-policies.sql
# 004-nextauth-schema.sql
# 005-stripe-subscription-schema.sql

# 2. Manual migration via Supabase SQL Editor
# Copy contents of each migration file
# Run in Supabase Dashboard > SQL Editor

# 3. Check for existing tables
# May need to drop and recreate:
DROP TABLE IF EXISTS sensor_data CASCADE;
-- Then run migration

# 4. Verify permissions
# Ensure service role key is used for migrations
```

### RLS policies blocking queries

**Problem:** `Error: new row violates row-level security policy`

**Solution:**
```sql
-- 1. Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 2. Verify policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public';

-- 3. Temporarily disable RLS for testing
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- Re-enable after testing
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Use service role key for admin operations
-- Service role key bypasses RLS
```

### Query timeout

**Problem:** Queries taking too long or timing out

**Solution:**
```sql
-- 1. Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_sensor_data_timestamp
ON sensor_data(timestamp);

CREATE INDEX CONCURRENTLY idx_sensor_data_floor
ON sensor_data(floor);

-- 2. Use connection pooling
-- Enable in Supabase Dashboard > Database > Connection Pooling

-- 3. Optimize query with EXPLAIN
EXPLAIN ANALYZE
SELECT * FROM sensor_data
WHERE floor = 2 AND timestamp > '2018-01-01';

-- 4. Use materialized views for expensive queries
REFRESH MATERIALIZED VIEW sensor_stats_daily;
```

## Authentication Problems

### Google OAuth not working

**Problem:** OAuth redirect fails or shows error

**Solution:**
```bash
# 1. Check redirect URI configuration
# Google Cloud Console > Credentials
# Authorized redirect URIs must include:
# - http://localhost:3000/api/auth/callback/google (dev)
# - https://your-domain.com/api/auth/callback/google (prod)

# 2. Verify environment variables
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_URL=http://localhost:3000  # Must match current URL

# 3. Check OAuth consent screen
# Google Cloud Console > OAuth consent screen
# Verify app is published (not in testing mode)

# 4. Clear browser cookies and try again
```

### Session not persisting

**Problem:** User logged out after page refresh

**Solution:**
```typescript
// 1. Check SessionProvider wraps app
// app/layout.tsx
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}

// 2. Verify NEXTAUTH_SECRET is set
// Generate new secret:
openssl rand -base64 32

// 3. Check session cookie settings
// pages/api/auth/[...nextauth].ts
export default NextAuth({
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
});
```

### Protected routes not redirecting

**Problem:** Users can access protected pages without authentication

**Solution:**
```typescript
// Use middleware to protect routes
// middleware.ts
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

## API Errors

### 500 Internal Server Error

**Problem:** API routes returning 500 errors

**Solution:**
```typescript
// 1. Add proper error handling
export async function GET(request: Request) {
  try {
    const data = await fetchData();
    return Response.json({ success: true, data });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      {
        success: false,
        error: error.message,
        // Don't expose stack trace in production
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
        }),
      },
      { status: 500 }
    );
  }
}

// 2. Check server logs
// Vercel: Dashboard > Project > Logs
// Local: Check terminal output
```

### CORS errors

**Problem:** `Access to fetch at ... from origin ... has been blocked by CORS policy`

**Solution:**
```typescript
// Add CORS headers to API routes
export async function GET(request: Request) {
  const response = Response.json({ data: 'example' });

  // Set CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

// Or use next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
        ],
      },
    ];
  },
};
```

### Rate limit errors

**Problem:** `429 Too Many Requests`

**Solution:**
```typescript
// 1. Implement exponential backoff
async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, i) * 1000;

      console.log(`Rate limited. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}

// 2. Upgrade subscription tier for higher limits
// Free: 100/hour → Professional: 10,000/hour

// 3. Implement request queuing
```

## Performance Issues

### Slow page load

**Problem:** Pages taking >5 seconds to load

**Solution:**
```typescript
// 1. Use dynamic imports for large components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false,
});

// 2. Optimize images
import Image from 'next/image';

<Image
  src="/image.jpg"
  width={800}
  height={600}
  alt="Description"
  priority={isAboveFold}
  quality={75}
/>

// 3. Enable Next.js caching
export const revalidate = 60; // ISR: revalidate every 60 seconds

// 4. Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});

// 5. Check bundle size
npm run build
# Look for large chunks (>500KB)
```

### Slow API responses

**Problem:** API calls taking >1 second

**Solution:**
```typescript
// 1. Add database indexes (see Database Issues)

// 2. Implement caching
import { unstable_cache } from 'next/cache';

const getCachedInsights = unstable_cache(
  async () => {
    return await fetchInsights();
  },
  ['insights'],
  { revalidate: 300 } // Cache for 5 minutes
);

// 3. Use pagination
const { data, pagination } = await fetchData({
  limit: 100,
  offset: 0,
});

// 4. Optimize database queries
// Use SELECT with specific columns instead of SELECT *
SELECT id, title, confidence FROM insights
WHERE category = 'energy'
LIMIT 10;
```

### Memory leaks

**Problem:** Application memory usage increases over time

**Solution:**
```typescript
// 1. Clean up effects
useEffect(() => {
  const subscription = dataStream.subscribe();

  return () => {
    subscription.unsubscribe(); // Cleanup
  };
}, []);

// 2. Clear intervals/timeouts
useEffect(() => {
  const timer = setInterval(() => {
    // Do something
  }, 1000);

  return () => {
    clearInterval(timer); // Cleanup
  };
}, []);

// 3. Close WebSocket connections
useEffect(() => {
  const ws = new WebSocket('wss://...');

  return () => {
    ws.close(); // Cleanup
  };
}, []);
```

## Deployment Problems

### Vercel deployment fails

**Problem:** Build succeeds locally but fails on Vercel

**Solution:**
```bash
# 1. Check build logs in Vercel dashboard
# Common issues:
# - Missing environment variables
# - Different Node version
# - Memory limits exceeded

# 2. Match local Node version to Vercel
# package.json
{
  "engines": {
    "node": "18.x"
  }
}

# 3. Increase memory limit
# vercel.json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next",
      "config": {
        "maxLambdaSize": "50mb"
      }
    }
  ]
}

# 4. Test production build locally
npm run build
npm run start
```

### Environment variables not working in production

**Problem:** App works locally but environment variables undefined in production

**Solution:**
```bash
# 1. Add variables to Vercel
# Dashboard > Project > Settings > Environment Variables

# 2. Select correct environments
# ✅ Production
# ✅ Preview
# ✅ Development

# 3. Redeploy after adding variables
# Vercel > Deployments > ... > Redeploy

# 4. Check variable names
# Must start with NEXT_PUBLIC_ for client-side access
NEXT_PUBLIC_API_URL=https://api.example.com  # ✅ Correct
API_URL=https://api.example.com              # ❌ Not accessible client-side
```

### Database connection fails in production

**Problem:** Cannot connect to Supabase from production

**Solution:**
```bash
# 1. Check connection pooling is enabled
# Supabase Dashboard > Database > Connection Pooling

# 2. Use pooler connection string for serverless
# Format: postgres://[user]:[pass]@[host]:6543/postgres?pgbouncer=true

# 3. Verify IP restrictions
# Supabase Dashboard > Database > IP Restrictions
# Allow Vercel IPs or disable restrictions

# 4. Test connection
curl https://your-domain.com/api/health
```

## Third-Party Service Issues

### Stripe webhooks not working

**Problem:** Subscription updates not processed

**Solution:**
```bash
# 1. Verify webhook endpoint URL
# Stripe Dashboard > Developers > Webhooks
# URL: https://your-domain.com/api/webhooks/stripe

# 2. Check webhook signing secret
STRIPE_WEBHOOK_SECRET=whsec_...

# 3. Test webhook locally with Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 4. Verify webhook events are selected
# Required events:
# - customer.subscription.created
# - customer.subscription.updated
# - customer.subscription.deleted
# - invoice.payment_succeeded
# - invoice.payment_failed

# 5. Check endpoint logs
# Stripe Dashboard > Developers > Webhooks > [endpoint] > Logs
```

### Cloudflare R2 upload fails

**Problem:** File upload to R2 returns 403 Forbidden

**Solution:**
```bash
# 1. Verify R2 credentials
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key

# 2. Check bucket permissions
# Cloudflare Dashboard > R2 > [bucket] > Settings
# Ensure bucket allows uploads

# 3. Verify CORS configuration
# Bucket > Settings > CORS
# Add allowed origins

# 4. Test upload with curl
curl -X PUT "https://[account].r2.cloudflarestorage.com/[bucket]/test.txt" \
  -H "Authorization: AWS4-HMAC-SHA256 ..." \
  --data "test"
```

## Getting Help

### Diagnostic Information

When requesting help, include:

```bash
# System information
node --version
npm --version
git --version

# Project information
cat package.json | grep version
npm list --depth=0

# Error logs
npm run dev 2>&1 | tee debug.log
npm run build 2>&1 | tee build.log

# Environment check
npm run env:check
```

### Support Channels

1. **Documentation**
   - Check `/docs` directory
   - Read README.md
   - Review API documentation

2. **GitHub Issues**
   - Search existing issues
   - Create new issue with template
   - Include diagnostic information

3. **Community**
   - GitHub Discussions
   - Stack Overflow (tag: cu-bems)

4. **Contact**
   - GitHub: [@chrimar3](https://github.com/chrimar3)
   - Issues: [Report Issue](https://github.com/chrimar3/IoT-Transmission-Failure-Analysis-Platform/issues)

### Debug Checklist

Before asking for help:

- [ ] Checked this troubleshooting guide
- [ ] Searched existing GitHub issues
- [ ] Tested with latest version
- [ ] Cleared cache and reinstalled dependencies
- [ ] Checked environment variables
- [ ] Reviewed error logs
- [ ] Tried in different browser/environment
- [ ] Created minimal reproduction example

---

## Additional Resources

- [Next.js Debugging](https://nextjs.org/docs/advanced-features/debugging)
- [Supabase Troubleshooting](https://supabase.com/docs/guides/platform/troubleshooting)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Vercel Troubleshooting](https://vercel.com/docs/troubleshooting)

For urgent production issues, please open a high-priority GitHub issue.
