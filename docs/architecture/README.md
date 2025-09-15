# 🏗️ Architecture Documentation

## System Overview

The CU-BEMS IoT Transmission Failure Analysis Platform is built as a modern, scalable web application designed to process and analyze large-scale IoT sensor data from building management systems.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Layer     │    │   Data Layer    │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│   (Supabase)    │
│                 │    │                 │    │   (R2 Storage)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Technology Stack

### Frontend Layer
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.3.3
- **Styling**: Tailwind CSS 3.4.0
- **State Management**: React hooks + Context API
- **UI Components**: Custom components with Tailwind
- **Icons**: Lucide React
- **Charts**: Recharts (for future data visualization)

### API Layer
- **Runtime**: Node.js ≥18.0.0
- **Framework**: Next.js API routes
- **Language**: TypeScript
- **Validation**: Zod schemas
- **Authentication**: NextAuth.js (prepared)
- **File Processing**: CSV parser for data ingestion

### Data Layer
- **Primary Database**: Supabase (PostgreSQL)
- **Object Storage**: Cloudflare R2
- **Data Processing**: Node.js streams
- **Caching**: In-memory (Redis ready)

### DevOps & Tools
- **Version Control**: Git
- **Package Manager**: npm
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint + Next.js config
- **Type Checking**: TypeScript strict mode
- **Build Tool**: Next.js built-in bundling
- **Deployment**: Vercel-ready (Docker included)

## Detailed Architecture

### 1. Data Flow Architecture

```
Raw CSV Data (124.9M records)
        ↓
Data Validation & Processing
        ↓
Insight Extraction Engine
        ↓
Business Intelligence API
        ↓
React Dashboard Components
```

### 2. Component Architecture

```
app/
├── layout.tsx              # Root layout with global styles
├── page.tsx               # Landing page
├── dashboard/
│   └── page.tsx          # Analytics dashboard (client component)
├── api/
│   ├── health/           # System health endpoint
│   └── insights/         # Business intelligence API
└── globals.css           # Tailwind CSS configuration

components/
└── Navigation.tsx        # Site navigation component

src/
├── lib/
│   ├── insight-engine.ts # Business logic for insights
│   ├── supabase.ts      # Database client configuration
│   └── types/           # TypeScript type definitions
└── utils/
    └── helpers.ts       # Utility functions
```

### 3. Data Processing Pipeline

#### Stage 1: Data Ingestion
- **Input**: 14 CSV files (7.65GB total)
- **Process**: Streaming validation and parsing
- **Output**: Structured JSON with 100% data integrity
- **Storage**: Cloudflare R2 with GZIP compression (94% reduction)

#### Stage 2: Insight Extraction
- **Input**: Validated sensor data
- **Process**: Statistical analysis and pattern recognition
- **Algorithms**:
  - Anomaly detection for energy consumption
  - Trend analysis for equipment performance
  - Predictive maintenance scoring
- **Output**: 7 key business insights with confidence scores

#### Stage 3: API Serving
- **Endpoint**: `/api/insights`
- **Response Time**: <100ms average
- **Caching**: In-memory with TTL
- **Format**: JSON with metadata and filtering

### 4. Database Schema

#### Primary Tables
```sql
-- Sensor metadata
CREATE TABLE sensors (
  id SERIAL PRIMARY KEY,
  sensor_id VARCHAR(50) UNIQUE NOT NULL,
  floor INTEGER NOT NULL,
  equipment_type VARCHAR(100),
  location VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Raw sensor readings
CREATE TABLE sensor_readings (
  id SERIAL PRIMARY KEY,
  sensor_id VARCHAR(50) REFERENCES sensors(sensor_id),
  timestamp TIMESTAMP NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20),
  quality_score INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Business insights cache
CREATE TABLE insights_cache (
  id SERIAL PRIMARY KEY,
  insight_type VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,
  confidence_score INTEGER,
  generated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_sensor_readings_sensor_timestamp
ON sensor_readings(sensor_id, timestamp);

CREATE INDEX idx_sensor_readings_floor_timestamp
ON sensor_readings(floor, timestamp);
```

### 5. API Design Patterns

#### RESTful Endpoints
```
GET  /api/health          # System health check
GET  /api/insights        # Business intelligence data
GET  /api/sensors         # Sensor metadata (future)
GET  /api/readings        # Time-series data (future)
```

#### Response Format Standardization
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    total_count?: number;
    filtered_count?: number;
    generated_at: string;
  };
}
```

#### Error Handling Strategy
```typescript
// Centralized error handling
export class APIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
  }
}

// Global error handler
export function handleAPIError(error: unknown): Response {
  if (error instanceof APIError) {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    }), { status: error.statusCode });
  }

  // Log unexpected errors
  console.error('Unexpected API error:', error);
  return new Response('Internal server error', { status: 500 });
}
```

## Performance Characteristics

### Current Metrics
- **Dashboard Load Time**: <2 seconds
- **API Response Time**: <100ms (95th percentile)
- **Data Processing**: 124.9M records in ~30 minutes
- **Memory Usage**: <512MB during processing
- **Storage Efficiency**: 94% compression ratio with R2

### Scalability Targets
- **Concurrent Users**: 1,000+ simultaneous dashboard users
- **API Throughput**: 10,000+ requests/minute
- **Data Volume**: 1B+ sensor records
- **Geographic Distribution**: Multi-region deployment ready

## Security Architecture

### Data Protection
- **Encryption at Rest**: Supabase encryption + R2 server-side encryption
- **Encryption in Transit**: HTTPS/TLS 1.3 everywhere
- **Database Security**: Row Level Security (RLS) policies
- **API Security**: Rate limiting + input validation

### Authentication & Authorization
```typescript
// NextAuth.js configuration (prepared)
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        role: token.role,
      },
    }),
  },
};
```

### Data Privacy Compliance
- **GDPR Ready**: Data deletion and export capabilities
- **SOC 2 Compatible**: Audit logging and access controls
- **Data Retention**: Configurable retention policies
- **Anonymization**: PII data handling procedures

## Monitoring & Observability

### Application Monitoring
```typescript
// Performance monitoring
export const performanceLogger = {
  trackAPICall: (endpoint: string, duration: number) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({
        type: 'api_performance',
        endpoint,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      }));
    }
  }
};

// Error tracking
export const errorLogger = {
  logError: (error: Error, context: Record<string, any>) => {
    console.error(JSON.stringify({
      type: 'application_error',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    }));
  }
};
```

### Health Check Implementation
```typescript
// /api/health endpoint
export async function GET() {
  const startTime = Date.now();

  try {
    // Test database connection
    const { data, error } = await supabase
      .from('sensors')
      .select('count', { count: 'exact' })
      .limit(1);

    const responseTime = Date.now() - startTime;

    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: !error,
        records: data ? 'Connected' : 'No data'
      },
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      response_time_ms: responseTime
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 });
  }
}
```

## Development Workflow

### 1. Local Development Setup
```bash
# Environment setup
cp .env.example .env.local
npm install
npm run dev

# Database setup
npm run db:setup
npm run db:test
```

### 2. Testing Strategy
```bash
# Unit tests
npm test

# Integration tests
npm test -- --testPathPattern=integration

# Coverage reporting
npm run test:coverage
```

### 3. Code Quality Gates
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build verification
npm run build
```

## Deployment Architecture

### Production Environment
```
Internet → Cloudflare → Vercel → Supabase
                              → R2 Storage
```

### CI/CD Pipeline
```yaml
# GitHub Actions workflow
name: Deploy Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    steps:
      - name: Checkout code
      - name: Install dependencies
      - name: Run tests
      - name: Build application
      - name: Deploy to Vercel
```

## Future Architecture Considerations

### Microservices Evolution
- **Data Ingestion Service**: Dedicated data processing
- **Analytics Service**: Advanced ML/AI insights
- **Notification Service**: Real-time alerts
- **Reporting Service**: PDF/Excel generation

### Advanced Analytics
- **Machine Learning Pipeline**: TensorFlow.js integration
- **Real-time Processing**: WebSocket connections
- **Predictive Modeling**: Equipment failure prediction
- **Anomaly Detection**: Advanced pattern recognition

### Enterprise Features
- **Multi-tenancy**: Building portfolio management
- **Advanced RBAC**: Granular permission system
- **API Management**: Rate limiting, analytics
- **Enterprise SSO**: SAML/OIDC integration

## Troubleshooting Guide

### Common Issues
1. **Build Failures**: Clear `.next` cache
2. **Database Connection**: Check environment variables
3. **API Timeouts**: Verify Supabase status
4. **Memory Issues**: Monitor Node.js heap usage

### Performance Debugging
```bash
# Node.js profiling
node --inspect npm run dev

# Bundle analysis
npm run build -- --analyze

# Memory leak detection
node --heap-prof npm start
```

### Database Optimization
```sql
-- Query performance analysis
EXPLAIN ANALYZE SELECT * FROM sensor_readings
WHERE sensor_id = 'sensor_001'
AND timestamp >= '2024-01-01';

-- Index usage monitoring
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'sensor_readings';
```

This architecture is designed to be scalable, maintainable, and production-ready while supporting the current MVP requirements and future enterprise needs.