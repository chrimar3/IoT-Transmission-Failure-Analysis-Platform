# Story 4.2: Professional API Access - Comprehensive QA Test Plan

## Test Plan Overview

**Story**: 4.2 Professional API Access
**Status**: Pre-Implementation QA Preparation
**QA Agent**: BMAD QA Agent
**Test Coverage Target**: 95% API endpoints, 100% auth & rate limiting
**Performance Target**: <500ms response time
**Created**: 2025-09-23

## Current Implementation Status Analysis

### ✅ Existing Infrastructure
- Basic rate limiting system (`src/lib/auth/rate-limiting.ts`)
- Authentication system with NextAuth
- Time-series API endpoint (`/api/readings/timeseries`)
- Export functionality (`/app/api/export/`)
- Stripe subscription integration

### ❌ Missing Professional API Features
- API key management system
- Professional tier rate limiting (10K req/hour)
- v1 API versioning structure
- Webhook infrastructure
- API documentation portal
- Comprehensive data export formats
- API usage analytics
- OAuth 2.0 implementation

## Test Plans by Acceptance Criteria

### AC1: API Key Management System

#### Test Scenarios
| Test ID | Scenario | Priority | Type |
|---------|----------|----------|------|
| AC1-001 | Create API key for Professional user | P1 | Functional |
| AC1-002 | Generate secure random API keys | P1 | Security |
| AC1-003 | API key naming and scoping | P2 | Functional |
| AC1-004 | API key rotation functionality | P1 | Security |
| AC1-005 | API key expiration handling | P1 | Functional |
| AC1-006 | API key deletion and revocation | P1 | Security |
| AC1-007 | API usage tracking per key | P1 | Analytics |
| AC1-008 | Rate limit configuration per key | P1 | Performance |

#### Detailed Test Cases

**AC1-001: Create API Key for Professional User**
```
Preconditions:
- User has Professional tier subscription
- User is authenticated
- API key management dashboard is accessible

Test Steps:
1. Navigate to API key management dashboard
2. Click "Create New API Key" button
3. Enter API key name (e.g., "Production Integration")
4. Select scopes: ['read:data', 'read:analytics', 'read:exports']
5. Set expiration date (optional)
6. Click "Generate Key"

Expected Results:
- API key generated successfully
- Key displayed once with copy functionality
- Key hash stored securely (never plaintext)
- Key prefix (first 8 chars) visible for identification
- Usage stats initialized to zero
- Key appears in user's API key list

Security Validations:
- API key is cryptographically secure (256-bit entropy minimum)
- Key is never stored in plaintext
- Key display is one-time only
- HTTPS required for key operations
```

**AC1-002: Generate Secure Random API Keys**
```
Test Data:
- Generate 1000 API keys
- Analyze entropy and randomness
- Check for collisions

Validation Criteria:
- Minimum 256-bit entropy
- No predictable patterns
- Zero collision rate
- Compliant with OWASP guidelines

Automated Security Test:
```javascript
describe('API Key Security', () => {
  test('generates cryptographically secure keys', async () => {
    const keys = new Set()
    for (let i = 0; i < 1000; i++) {
      const key = await generateApiKey()
      expect(key).toHaveLength(64) // 256-bit hex
      expect(keys.has(key)).toBe(false) // No collisions
      keys.add(key)
    }
  })
})
```

### AC2: Comprehensive Data Export APIs

#### Test Scenarios
| Test ID | Scenario | Priority | Type |
|---------|----------|----------|------|
| AC2-001 | Time-series data export with filtering | P1 | Functional |
| AC2-002 | Floor-specific data filtering | P1 | Functional |
| AC2-003 | Equipment-specific data filtering | P1 | Functional |
| AC2-004 | Statistical analysis export | P1 | Analytics |
| AC2-005 | Batch data export for large datasets | P1 | Performance |
| AC2-006 | Real-time API access validation | P2 | Functional |

#### API Endpoint Testing Matrix

**Data Export API Endpoints (v1)**
```
GET /api/v1/data/timeseries
GET /api/v1/data/summary
GET /api/v1/data/analytics
GET /api/v1/data/floors/{id}
GET /api/v1/data/equipment/{type}
GET /api/v1/data/patterns
POST /api/v1/exports/create
GET /api/v1/exports/{id}/status
GET /api/v1/exports/{id}/download
```

**AC2-001: Time-series Data Export Test**
```
Test Payload:
GET /api/v1/data/timeseries?
  start_date=2024-01-01T00:00:00Z&
  end_date=2024-01-31T23:59:59Z&
  sensor_ids=SENSOR_001,SENSOR_002&
  interval=hour&
  format=json

Expected Response Format:
{
  "data": {
    "series": [
      {
        "sensor_id": "SENSOR_001",
        "equipment_type": "HVAC",
        "floor_number": 1,
        "unit": "kWh",
        "data": [
          {
            "timestamp": "2024-01-01T00:00:00Z",
            "value": 850.5,
            "status": "normal"
          }
        ]
      }
    ],
    "metadata": {
      "total_points": 1488,
      "query_time_ms": 245,
      "cache_hit": false
    }
  },
  "meta": {
    "request_id": "req_123",
    "timestamp": "2024-01-01T12:00:00Z",
    "processing_time_ms": 245,
    "rate_limit": {
      "remaining": 9999,
      "reset_at": "2024-01-01T13:00:00Z",
      "limit": 10000
    }
  }
}

Performance Validation:
- Response time < 500ms for cached data
- Response time < 2s for complex queries
- Proper pagination for large datasets
- Cache headers present
```

### AC3: API Rate Limiting and Tiering

#### Rate Limiting Test Matrix
| Tier | Limit | Burst | Window | Test Scenarios |
|------|-------|-------|--------|----------------|
| Free | 100 req/hr | 110 req | 1 hour | Rate limit enforcement |
| Professional | 10K req/hr | 11K req | 1 hour | High-volume testing |
| Enterprise | Custom | Custom | Custom | Future scalability |

#### Test Scenarios
| Test ID | Scenario | Priority | Type |
|---------|----------|----------|------|
| AC3-001 | Free tier rate limiting (100 req/hr) | P1 | Performance |
| AC3-002 | Professional tier rate limiting (10K req/hr) | P1 | Performance |
| AC3-003 | Burst allowance testing | P1 | Performance |
| AC3-004 | Rate limit headers validation | P1 | Functional |
| AC3-005 | Rate limit exception handling | P2 | Functional |
| AC3-006 | Cross-user rate limit isolation | P1 | Security |

**AC3-001: Free Tier Rate Limiting Test**
```
Test Automation:
```javascript
describe('Free Tier Rate Limiting', () => {
  test('enforces 100 requests per hour limit', async () => {
    const freeUser = await createFreeUser()
    const apiKey = await generateApiKey(freeUser, 'free')

    // Make 100 requests within burst allowance
    for (let i = 0; i < 100; i++) {
      const response = await makeApiRequest(apiKey)
      expect(response.status).toBe(200)
      expect(response.headers['x-ratelimit-remaining']).toBe(String(99 - i))
    }

    // 101st request should be rate limited
    const response = await makeApiRequest(apiKey)
    expect(response.status).toBe(429)
    expect(response.body.error).toBe('Rate limit exceeded')

    // Verify headers
    expect(response.headers['x-ratelimit-limit']).toBe('100')
    expect(response.headers['x-ratelimit-reset']).toMatch(/\d+/)
    expect(response.headers['retry-after']).toBe('3600')
  })
})
```

**AC3-002: Professional Tier Rate Limiting Test**
```
Load Testing Scenario:
- Professional user with 10K req/hr limit
- Simulate realistic API usage patterns
- Test burst capacity (11K requests in short period)
- Validate rate limit recovery

Performance Requirements:
- Rate limiting logic adds <5ms to response time
- Rate limit counters are accurate under high load
- No false positives or negatives in rate limiting
```

### AC4: API Documentation and Developer Portal

#### Documentation Testing Checklist
| Component | Validation Criteria | Test Status |
|-----------|-------------------|-------------|
| OpenAPI Spec | Valid JSON/YAML, complete schemas | Pending |
| Interactive Examples | Working code samples | Pending |
| Authentication Guide | Clear OAuth 2.0 flow documentation | Pending |
| Rate Limits Documentation | Accurate tier descriptions | Pending |
| SDK Examples | Python, JavaScript, cURL samples | Pending |
| Error Handling Guide | Complete error code reference | Pending |

#### Test Scenarios
| Test ID | Scenario | Priority | Type |
|---------|----------|----------|------|
| AC4-001 | OpenAPI specification validation | P1 | Documentation |
| AC4-002 | Interactive API testing interface | P1 | Functional |
| AC4-003 | Multi-language code examples | P2 | Documentation |
| AC4-004 | Developer onboarding tutorials | P2 | UX |
| AC4-005 | API testing tool functionality | P1 | Functional |
| AC4-006 | SDK generation and distribution | P2 | Integration |

### AC5: Data Format and Export Options

#### Export Format Testing Matrix
| Format | Use Case | Size Limit | Compression | Test Priority |
|--------|----------|------------|-------------|---------------|
| JSON | API integration | 100MB | gzip | P1 |
| CSV | Excel import | 500MB | zip | P1 |
| Excel | Business reports | 100MB | native | P1 |
| XML | Legacy systems | 50MB | gzip | P2 |

#### Test Scenarios
| Test ID | Scenario | Priority | Type |
|---------|----------|----------|------|
| AC5-001 | JSON export with metadata | P1 | Functional |
| AC5-002 | CSV export for large datasets | P1 | Performance |
| AC5-003 | Excel export with formatting | P1 | Functional |
| AC5-004 | Data compression validation | P1 | Performance |
| AC5-005 | Pagination for large queries | P1 | Performance |
| AC5-006 | Data integrity verification | P1 | Security |

**AC5-001: JSON Export Test**
```
Test Case: Multi-format Export Validation
```javascript
describe('Data Export Formats', () => {
  test('supports all required export formats', async () => {
    const exportRequest = {
      sensor_ids: ['SENSOR_001', 'SENSOR_002'],
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-02T00:00:00Z',
      include_metadata: true
    }

    // Test JSON export
    const jsonResponse = await createExport(exportRequest, 'json')
    expect(jsonResponse.format).toBe('json')
    expect(jsonResponse.compression).toBe('gzip')

    // Test CSV export
    const csvResponse = await createExport(exportRequest, 'csv')
    expect(csvResponse.format).toBe('csv')
    expect(csvResponse.headers).toContain('timestamp,sensor_id,value')

    // Test Excel export
    const excelResponse = await createExport(exportRequest, 'excel')
    expect(excelResponse.format).toBe('xlsx')
    expect(excelResponse.worksheets).toContain('TimeSeries', 'Metadata')
  })
})
```

### AC6: API Security and Authentication

#### Security Testing Framework
| Category | Tests | Tools | Priority |
|----------|-------|--------|----------|
| Authentication | OAuth 2.0, API keys | Custom, OWASP ZAP | P1 |
| Authorization | Scope validation, tier access | Custom | P1 |
| Input Validation | SQL injection, XSS | Burp Suite | P1 |
| Rate Limiting | DDoS protection | Artillery, k6 | P1 |
| Audit Logging | Complete request tracking | Custom | P1 |
| Data Protection | Encryption in transit/rest | Custom | P1 |

#### Test Scenarios
| Test ID | Scenario | Priority | Type |
|---------|----------|----------|------|
| AC6-001 | OAuth 2.0 authentication flow | P1 | Security |
| AC6-002 | API key authentication validation | P1 | Security |
| AC6-003 | Request signing for sensitive ops | P1 | Security |
| AC6-004 | IP whitelisting functionality | P2 | Security |
| AC6-005 | Comprehensive audit logging | P1 | Security |
| AC6-006 | API security vulnerability scan | P1 | Security |

**AC6-001: OAuth 2.0 Authentication Test**
```
Security Test Protocol:
1. Authorization Code Flow Testing
   - Valid authorization request
   - Invalid client_id handling
   - State parameter validation
   - Code exchange for tokens

2. Token Validation Testing
   - Valid access token acceptance
   - Expired token rejection
   - Invalid token format handling
   - Token scope validation

3. Refresh Token Testing
   - Token refresh flow
   - Refresh token rotation
   - Refresh token expiration

4. Security Headers Validation
   - HTTPS enforcement
   - CORS configuration
   - Security headers present
```

### AC7: Integration Webhooks and Notifications

#### Webhook Testing Matrix
| Event Type | Payload | Retry Logic | Test Scenarios |
|------------|---------|-------------|----------------|
| data.updated | Dataset changes | 3 retries, exponential backoff | Delivery, failure handling |
| alert.triggered | Threshold breaches | 5 retries, 30s intervals | Real-time delivery |
| export.completed | Export job finished | 3 retries, 60s intervals | Job notifications |

#### Test Scenarios
| Test ID | Scenario | Priority | Type |
|---------|----------|----------|------|
| AC7-001 | Webhook endpoint registration | P1 | Functional |
| AC7-002 | Event-driven notifications | P1 | Functional |
| AC7-003 | Webhook signature verification | P1 | Security |
| AC7-004 | Retry logic and failure handling | P1 | Reliability |
| AC7-005 | Webhook delivery monitoring | P2 | Analytics |
| AC7-006 | Custom payload configuration | P2 | Functional |

**AC7-001: Webhook Registration and Delivery Test**
```
Test Implementation:
```javascript
describe('Webhook System', () => {
  test('registers webhook and delivers events', async () => {
    // Register webhook endpoint
    const webhook = await registerWebhook({
      url: 'https://example.com/webhook',
      events: ['data.updated', 'alert.triggered'],
      secret: 'webhook_secret_123'
    })

    expect(webhook.id).toBeDefined()
    expect(webhook.is_active).toBe(true)

    // Trigger data update event
    await triggerDataUpdate()

    // Verify webhook delivery
    const deliveries = await getWebhookDeliveries(webhook.id)
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0].status).toBe('delivered')
    expect(deliveries[0].response_status).toBe(200)

    // Verify signature
    const payload = deliveries[0].payload
    const signature = deliveries[0].signature
    const expectedSignature = generateWebhookSignature(payload, 'webhook_secret_123')
    expect(signature).toBe(expectedSignature)
  })
})
```

### AC8: API Analytics and Monitoring

#### Analytics Dashboard Testing
| Metric Category | KPIs | Test Validation |
|------------------|-----|-----------------|
| Usage Analytics | Requests/day, top endpoints | Data accuracy |
| Performance | Response times, error rates | Real-time updates |
| User Behavior | Popular features, API adoption | Trend analysis |
| Billing Data | Usage-based metrics | Accuracy validation |

#### Test Scenarios
| Test ID | Scenario | Priority | Type |
|---------|----------|----------|------|
| AC8-001 | API usage analytics dashboard | P1 | Analytics |
| AC8-002 | Performance monitoring display | P1 | Monitoring |
| AC8-003 | Error tracking and debugging | P1 | Operations |
| AC8-004 | Usage pattern analysis | P2 | Analytics |
| AC8-005 | API health status page | P1 | Monitoring |
| AC8-006 | Billing integration preparation | P2 | Business |

## Performance Testing Plan

### Load Testing Scenarios
| Scenario | Virtual Users | Duration | Target RPS | Success Criteria |
|----------|---------------|----------|------------|------------------|
| Normal Load | 100 | 10 min | 50 | <500ms p95, <1% errors |
| Peak Load | 500 | 5 min | 200 | <1s p95, <5% errors |
| Stress Test | 1000 | 2 min | 400 | System stability |
| Spike Test | 100→1000 | 30s | Variable | Graceful degradation |

### Performance Test Implementation
```javascript
// k6 Load Testing Script
import http from 'k6/http'
import { check } from 'k6'

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
}

export default function() {
  const apiKey = 'api_key_professional_test'
  const response = http.get('https://api.cu-bems.com/v1/data/timeseries', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has rate limit headers': (r) => r.headers['x-ratelimit-remaining'] !== undefined,
  })
}
```

## Security Testing Plan

### Security Test Categories
| Category | Tests | Tools | Acceptance Criteria |
|----------|-------|-------|-------------------|
| Authentication | OAuth flows, API key validation | Custom, Postman | 100% pass rate |
| Authorization | Role-based access, scope validation | Custom | No unauthorized access |
| Input Validation | SQL injection, XSS, schema validation | OWASP ZAP, Burp | Zero vulnerabilities |
| Rate Limiting | DDoS protection, fair usage | k6, Artillery | Limits enforced |
| Data Protection | Encryption, secure headers | SSL Labs, Custom | A+ security rating |
| Audit Logging | Complete request tracking | Custom | 100% log coverage |

### Automated Security Tests
```javascript
describe('API Security Validation', () => {
  test('prevents SQL injection attacks', async () => {
    const maliciousPayloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "UNION SELECT * FROM api_keys"
    ]

    for (const payload of maliciousPayloads) {
      const response = await makeApiRequest({
        sensor_ids: payload
      })

      expect(response.status).toBe(400) // Bad request
      expect(response.body.error).toContain('Invalid')
      // Ensure no database errors leaked
      expect(response.body.error).not.toContain('SQL')
    }
  })

  test('enforces HTTPS in production', async () => {
    const httpResponse = await fetch('http://api.cu-bems.com/v1/data/timeseries')
    expect(httpResponse.status).toBe(301) // Redirect to HTTPS
    expect(httpResponse.headers.location).toStartWith('https://')
  })
})
```

## Integration Testing Plan

### Cross-System Integration Tests
| Integration Point | Test Scenarios | Validation Criteria |
|-------------------|----------------|-------------------|
| Supabase Database | Data retrieval, error handling | Consistent data, proper error codes |
| Stripe Subscriptions | Tier validation, usage tracking | Accurate billing data |
| NextAuth Authentication | User sessions, API access | Secure authentication flow |
| Vercel Edge Functions | Rate limiting, caching | Performance optimization |
| External Webhooks | Delivery, retry logic | Reliable event delivery |

### End-to-End Workflow Tests
```javascript
describe('Professional API E2E Workflows', () => {
  test('complete professional user API journey', async () => {
    // 1. User subscribes to Professional tier
    const user = await createProfessionalUser()

    // 2. User creates API key
    const apiKey = await createApiKey(user, {
      name: 'Production Integration',
      scopes: ['read:data', 'read:analytics']
    })

    // 3. User makes API requests
    const timeseriesData = await getTimeseriesData(apiKey)
    expect(timeseriesData.success).toBe(true)

    // 4. User creates export job
    const exportJob = await createExportJob(apiKey, {
      format: 'csv',
      date_range: '30_days'
    })

    // 5. User downloads completed export
    const exportFile = await downloadExport(exportJob.id)
    expect(exportFile.size).toBeGreaterThan(0)

    // 6. Verify usage tracking
    const usage = await getApiUsage(apiKey)
    expect(usage.total_requests).toBeGreaterThan(0)
  })
})
```

## Test Environment Setup

### Required Test Infrastructure
```yaml
# Test Environment Configuration
environments:
  unit_tests:
    database: in_memory_sqlite
    auth: mock_provider
    rate_limiting: in_memory_store

  integration_tests:
    database: test_supabase_instance
    auth: test_auth_provider
    rate_limiting: redis_test_instance

  performance_tests:
    database: production_replica
    auth: production_auth
    rate_limiting: production_redis
    load_balancer: test_lb

  security_tests:
    database: isolated_test_db
    auth: security_test_provider
    vulnerability_scanner: owasp_zap
    penetration_testing: burp_suite
```

### Test Data Management
```javascript
// Test Data Factory
class ApiTestDataFactory {
  static createProfessionalUser() {
    return {
      id: uuid(),
      email: 'test@professional.com',
      subscription_tier: 'professional',
      stripe_customer_id: 'cus_test_professional'
    }
  }

  static createApiKey(userId, options = {}) {
    return {
      id: uuid(),
      user_id: userId,
      name: options.name || 'Test API Key',
      key_hash: hashApiKey(generateApiKey()),
      scopes: options.scopes || ['read:data'],
      rate_limit_tier: 'professional',
      created_at: new Date().toISOString(),
      is_active: true
    }
  }

  static createBangkokDataset() {
    // Generate realistic Bangkok IoT sensor data
    // 18-month dataset with proper patterns
  }
}
```

## QA Execution Timeline

### Phase 1: Pre-Implementation Validation (Current)
- [ ] Test plan review and approval
- [ ] Test environment setup
- [ ] Test data preparation
- [ ] Automated test framework setup

### Phase 2: Implementation Testing (Post-Development)
- [ ] Unit test execution (95% coverage target)
- [ ] Integration test execution
- [ ] API endpoint functional testing
- [ ] Security vulnerability assessment

### Phase 3: Performance & Load Testing
- [ ] Performance baseline establishment
- [ ] Load testing execution
- [ ] Stress testing and limits validation
- [ ] Rate limiting validation

### Phase 4: End-to-End Validation
- [ ] Complete user journey testing
- [ ] Cross-system integration validation
- [ ] Documentation accuracy verification
- [ ] Professional tier feature validation

### Phase 5: Production Readiness
- [ ] Security audit completion
- [ ] Performance benchmarks achieved
- [ ] Monitoring and alerting setup
- [ ] QA sign-off and go-live approval

## Success Criteria & KPIs

### Functional Requirements
- ✅ All 8 acceptance criteria validated
- ✅ 95% automated test coverage achieved
- ✅ Zero critical security vulnerabilities
- ✅ Professional tier feature parity confirmed

### Performance Requirements
- ✅ <500ms response time for cached data (p95)
- ✅ <2s response time for complex queries (p95)
- ✅ 10K requests/hour rate limiting accurate
- ✅ Export jobs complete within 5 minutes

### Security Requirements
- ✅ HTTPS enforcement in production
- ✅ API key security validation
- ✅ OAuth 2.0 implementation validated
- ✅ Comprehensive audit logging active

### Business Requirements
- ✅ Professional tier value proposition validated
- ✅ API documentation developer-friendly
- ✅ Integration use cases supported
- ✅ Usage analytics and billing preparation

## Risk Assessment & Mitigation

### High-Risk Areas
1. **API Key Security**: Risk of key exposure or weak generation
   - Mitigation: Comprehensive security testing, key rotation

2. **Rate Limiting Accuracy**: Risk of over/under limiting users
   - Mitigation: Load testing, monitoring, graceful degradation

3. **Data Export Performance**: Risk of timeouts on large datasets
   - Mitigation: Asynchronous job processing, progress tracking

4. **Webhook Reliability**: Risk of failed event delivery
   - Mitigation: Retry logic, delivery monitoring, dead letter queues

### Medium-Risk Areas
1. **API Documentation Accuracy**: Risk of outdated or incorrect docs
   - Mitigation: Automated doc generation, validation tests

2. **Cross-Tier Access Control**: Risk of unauthorized feature access
   - Mitigation: Comprehensive authorization testing

## QA Sign-off Criteria

### Required Validations Before Go-Live
- [ ] All acceptance criteria tests passing (100%)
- [ ] Security audit completed with zero critical issues
- [ ] Performance benchmarks achieved
- [ ] Professional tier billing integration validated
- [ ] API documentation accuracy confirmed
- [ ] Webhook delivery reliability demonstrated
- [ ] Rate limiting enforcement validated
- [ ] Data export integrity verified

### Post-Launch Monitoring
- API usage analytics accuracy
- Performance metrics tracking
- Error rate monitoring
- User adoption tracking
- Professional tier conversion tracking

---

**QA Agent**: BMAD QA Agent
**Document Version**: 1.0
**Last Updated**: 2025-09-23
**Next Review**: Upon development completion