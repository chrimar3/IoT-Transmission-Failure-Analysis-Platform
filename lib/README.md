# 📚 Library (`/lib`)

Shared utilities, business logic, and configurations for the CU-BEMS IoT platform.

## 🗂️ Directory Structure

```
lib/
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
├── middleware/         # Next.js middleware
├── insight-engine.ts   # Business insights engine
├── r2-client.ts        # Cloudflare R2 client
├── supabase.ts         # Browser Supabase client
└── supabase-server.ts  # Server-side Supabase client
```

## 📁 Subdirectories

### `/types`
**Purpose**: TypeScript type definitions and interfaces
- `api.ts` - API request/response types
- `database.ts` - Database schema types
- `insights.ts` - Business insights types

### `/utils`
**Purpose**: Pure utility functions
- Data transformation helpers
- Validation functions
- Date/time utilities
- Math/calculation helpers

### `/hooks`
**Purpose**: Custom React hooks
- Data fetching hooks
- Local storage hooks
- Real-time subscription hooks
- Form management hooks

### `/middleware`
**Purpose**: Next.js middleware functions
- Authentication middleware
- Rate limiting
- Request/response interceptors

## 📋 Core Files

### `insight-engine.ts`
**Purpose**: Business logic for generating insights from IoT data
- Pattern detection algorithms
- Anomaly identification
- ROI calculations
- Confidence scoring

**Example Usage**:
```typescript
import { generateInsights } from '@/lib/insight-engine';

const insights = await generateInsights(sensorData);
```

### `r2-client.ts`
**Purpose**: Cloudflare R2 storage client
- Dataset file operations
- File upload/download
- Metadata management
- Error handling

**Example Usage**:
```typescript
import { r2Client } from '@/lib/r2-client';

const data = await r2Client.getObject('dataset/floor-1.csv');
```

### `supabase.ts` (Client-side)
**Purpose**: Browser Supabase client for client components
- Real-time subscriptions
- Client-side queries
- Authentication flows

**Example Usage**:
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('sensor_readings')
  .select('*');
```

### `supabase-server.ts` (Server-side)
**Purpose**: Server-side Supabase client with service role
- Admin operations
- Server-side queries
- Bulk operations
- Privileged access

**Example Usage**:
```typescript
import { supabaseServer } from '@/lib/supabase-server';

const { data } = await supabaseServer
  .from('sensor_readings')
  .select('*')
  .limit(1000);
```

## 🔧 Import Conventions

Use absolute imports with the `@/lib` alias:

```typescript
// ✅ Correct
import { generateInsights } from '@/lib/insight-engine';
import { r2Client } from '@/lib/r2-client';
import type { ApiResponse } from '@/lib/types/api';

// ❌ Avoid
import { generateInsights } from '../lib/insight-engine';
import { r2Client } from '../../lib/r2-client';
```

## 🧪 Testing

Each module should have corresponding tests in `/tests/unit/lib/`:

```
tests/unit/lib/
├── insight-engine.test.ts
├── r2-client.test.ts
├── supabase.test.ts
└── utils/
    ├── date-utils.test.ts
    └── validation.test.ts
```

## 📏 Code Standards

1. **Pure Functions**: Utilities should be pure functions when possible
2. **Error Handling**: All functions should handle errors gracefully
3. **Type Safety**: Use strict TypeScript types
4. **Documentation**: JSDoc comments for public APIs
5. **Testing**: Unit tests for all business logic

## 🔄 Adding New Modules

When adding new shared code:

1. **Determine Category**: Utils, hooks, business logic, or client
2. **Create Module**: Add to appropriate subdirectory
3. **Add Types**: Define interfaces in `/types`
4. **Write Tests**: Add unit tests
5. **Update Documentation**: Add to this README

## 🚀 Future Enhancements

1. **Caching Layer**: Add Redis/in-memory caching utilities
2. **Validation**: Zod schemas for runtime validation
3. **Monitoring**: Add observability hooks and utilities
4. **Performance**: Memoization and optimization utilities