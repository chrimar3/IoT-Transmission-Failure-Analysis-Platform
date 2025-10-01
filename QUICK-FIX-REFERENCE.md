# Quick Fix Reference - Story 3.4 Critical Issues

## 🔴 Issue #1: Runtime Crash - `startTime` undefined

**File**: `/lib/r2-client.ts:384`

**Fix**:
```diff
  private trackResponseTime(_startTime: number): void {
-   const responseTime = Date.now() - startTime
+   const responseTime = Date.now() - _startTime
    this.performanceMetrics.totalResponseTime += responseTime
  }
```

---

## 🔴 Issue #2: Real R2 Storage Integration

**File**: `/src/lib/export/storage-service.ts`

**Status**: ✅ Already working - Enhanced with retry logic

**New Features Added**:
```typescript
// 1. Retry logic with exponential backoff
private readonly MAX_RETRY_ATTEMPTS = 3
private readonly RETRY_DELAY_MS = 1000

for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
  // Try upload with exponential backoff: 1s, 2s, 4s
}

// 2. SHA-256 checksum validation
private calculateChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

// 3. Automatic cleanup on failure
private async cleanupFailedUpload(fileKey: string): Promise<void> {
  await this.deleteExportFile(fileKey)
}
```

---

## 🔴 Issue #3: Job ID Access Control

**Files**:
- `/app/api/export/download/[jobId]/route.ts` ✅ Already secure
- `/app/api/export/status/[jobId]/route.ts` - Enhanced

**Fix Applied** (status endpoint):
```diff
+ import { validateAPIKey } from '@/src/lib/api/authentication'

  // Professional tier authentication check
  const session = await getServerSession(authOptions)
  let userId: string
+ let userTier: string

  if (session?.user) {
    userId = session.user.id
+   userTier = session.user.subscriptionTier || 'FREE'
-   if (!session.user.subscriptionTier || session.user.subscriptionTier === 'free')
+   if (userTier === 'FREE')
  } else {
-   // API key authentication not implemented yet
-   return NextResponse.json({ error: 'Session required' }, { status: 401 })
+   // API key authentication
+   const authHeader = request.headers.get('authorization')
+   if (!authHeader || !authHeader.startsWith('Bearer '))
+     return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
+
+   const apiKey = authHeader.substring(7)
+   const apiValidation = await validateAPIKey(apiKey)
+
+   if (!apiValidation.valid)
+     return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
+
+   if (apiValidation.tier === 'FREE')
+     return NextResponse.json({ error: 'Professional API key required' }, { status: 403 })
+
+   userId = apiValidation.userId
+   userTier = apiValidation.tier
  }
```

**Security Validation** (already in download endpoint):
```typescript
// Verify job belongs to authenticated user
if (job.userId !== userId) {
  return NextResponse.json(
    { success: false, error: 'Access denied - job belongs to different user' },
    { status: 403 }
  )
}
```

---

## 🔴 Issue #4: Export Limit Enforcement

**File**: `/app/api/export/create/route.ts`

**Status**: ✅ Already working - Verified implementation

**How Limits Are Enforced**:
```typescript
// 1. Check usage via database function
const usageCheck = await exportUsageTrackingService.canUserExport(userId, userTier)

// 2. Reject if limit exceeded
if (!usageCheck.canExport) {
  return NextResponse.json(
    {
      success: false,
      error: usageCheck.message || 'Export limit exceeded',
      usage: {
        current: usageCheck.currentCount,    // e.g. 100
        limit: usageCheck.limit,             // e.g. 100
        percentageUsed: usageCheck.percentageUsed,  // e.g. 100%
        resetsAt: usageCheck.resetsAt        // e.g. 2025-11-01
      }
    },
    { status: 429 }  // HTTP 429 Too Many Requests
  )
}
```

**Tier Limits**:
- FREE: 5 exports/month (blocked from Professional endpoints)
- PROFESSIONAL: 100 exports/month
- ENTERPRISE: Unlimited

---

## 🔴 Issue #5: TypeScript Error - Variable Naming

**File**: `/lib/r2-client.ts:494-513`

**Fix**:
```diff
  data.forEach(record => {
    const date = new Date(record.timestamp)
-   let _groupKey: string
+   let groupKey: string

    switch (query.aggregationLevel) {
      case 'hourly':
        groupKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`
        break
      // ... other cases
    }

-   if (!groups.has(_groupKey)) {
-     groups.set(_groupKey, [])
+   if (!groups.has(groupKey)) {
+     groups.set(groupKey, [])
    }
-   groups.get(_groupKey)!.push(record)
+   groups.get(groupKey)!.push(record)
  })
```

---

## 📊 New Test Files

### Security Tests
**File**: `__tests__/security/export-security.test.ts` (NEW)

**Coverage**:
- 4 Access Control tests (cross-user access prevention)
- 4 Limit Enforcement tests (tier limits, reset dates)
- 4 Authentication tests (API keys, tokens)
- 1 Rate Limiting test
- 3 Input Validation tests
- 1 Error Disclosure test

**Total**: 17 security tests

### Enhanced Integration Tests
**File**: `__tests__/integration/story-3.4-export-integration.test.ts` (UPDATED)

**New Tests**:
- Checksum validation
- Retry logic with exponential backoff
- Max retry attempts handling
- Partial upload cleanup
- Duplicate file handling

**Total**: 6 new integration tests

---

## 🛠️ Configuration Changes

**File**: `jest.config.js`

**Changes**:
```diff
  transformIgnorePatterns: [
-   'node_modules/(?!(@faker-js/faker|@faker-js))'
+   'node_modules/(?!(@faker-js/faker|@faker-js|uuid|exceljs))'
  ],

+ // New security test project
+ {
+   displayName: 'security',
+   testMatch: ['<rootDir>/__tests__/security/**/*.test.{js,jsx,ts,tsx}'],
+   testEnvironment: 'node',
+   transformIgnorePatterns: [
+     'node_modules/(?!(@faker-js/faker|@faker-js|uuid|exceljs))'
+   ],
+ }

  // Updated components test match pattern
  {
    displayName: 'components',
-   testMatch: ['<rootDir>/__tests__/**/!(api|integration)/*.test.{js,jsx,ts,tsx}'],
+   testMatch: ['<rootDir>/__tests__/**/!(api|integration|security)/*.test.{js,jsx,ts,tsx}'],
  }
```

---

## ✅ Quick Verification Commands

```bash
# 1. Check TypeScript compilation
npx tsc --noEmit lib/r2-client.ts src/lib/export/storage-service.ts

# 2. Run security tests
npm test -- __tests__/security/export-security.test.ts

# 3. Run integration tests
npm test -- __tests__/integration/story-3.4-export-integration.test.ts

# 4. Run all tests
npm test

# 5. Check for lint errors
npm run lint
```

---

## 📝 Testing the Fixes

### Test 1: Runtime Crash Fixed
```bash
# This should NOT crash anymore
curl http://localhost:3000/api/readings/timeseries?limit=100
```

### Test 2: Export with Retry
```bash
# Create export (should retry on transient failures)
curl -X POST http://localhost:3000/api/export/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "pdf",
    "template": "executive",
    "dateRange": {"start": "2018-01-01", "end": "2018-06-30"}
  }'
```

### Test 3: Cross-User Access Denied
```bash
# Try to access another user's export (should return 403)
curl http://localhost:3000/api/export/download/ANOTHER_USERS_JOB_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Test 4: Export Limit Enforced
```bash
# After 100 exports, should return 429
curl -X POST http://localhost:3000/api/export/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"format":"csv","template":"raw_data","dateRange":{"start":"2018-01-01","end":"2018-06-30"}}'

# Response when limit exceeded:
# {
#   "success": false,
#   "error": "Export limit exceeded",
#   "usage": {
#     "current": 100,
#     "limit": 100,
#     "percentageUsed": 100,
#     "resetsAt": "2025-11-01T00:00:00.000Z"
#   }
# }
```

---

## 🚀 Deployment Steps

1. **Verify Environment Variables**:
   ```bash
   # Required for Supabase Storage
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Create Exports Bucket** (if not exists):
   ```sql
   -- Run in Supabase SQL Editor
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('exports', 'exports', false);
   ```

3. **Deploy Code**:
   ```bash
   git add .
   git commit -m "Fix Story 3.4 critical issues - All 5 blockers resolved"
   git push origin main
   ```

4. **Monitor After Deployment**:
   - Watch for 403 errors (cross-user access attempts)
   - Monitor 429 errors (limit enforcement working)
   - Check retry attempt frequency
   - Verify export success rates

---

## 📞 Support

If issues arise after deployment:

1. **Check Logs**: Look for retry attempts, checksum mismatches
2. **Verify Storage**: Ensure Supabase Storage bucket exists and has proper permissions
3. **Test Access Control**: Verify cross-user access returns 403
4. **Check Limits**: Confirm database usage tracking function works

**Rollback if needed**: Revert storage-service.ts changes, keep security fixes

---

**Quick Reference Version**: 1.0
**Last Updated**: 2025-09-30
**Status**: All Critical Issues Resolved ✅