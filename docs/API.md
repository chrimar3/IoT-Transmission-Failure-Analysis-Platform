# API Documentation

Complete API reference for the CU-BEMS IoT Transmission Failure Analysis Platform.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Rate Limiting](#rate-limiting)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Health & Status](#health--status)
  - [Insights](#insights)
  - [Sensor Data](#sensor-data)
  - [Export](#export)
  - [Subscriptions](#subscriptions)
  - [Authentication](#authentication-endpoints)
- [WebSocket API](#websocket-api)
- [Code Examples](#code-examples)

## Overview

The CU-BEMS API provides programmatic access to IoT sensor data, analytics insights, and export functionality. The API is RESTful, returns JSON responses, and uses standard HTTP response codes.

### API Version

Current version: **v1.0.0**

### Supported Formats

- **Request**: JSON, URL parameters
- **Response**: JSON
- **Exports**: CSV, Excel, PDF

## Authentication

### NextAuth.js Session-Based Authentication

Most endpoints require authentication via NextAuth.js session cookies.

**For Web Applications:**
```typescript
// Automatic with NextAuth
import { useSession } from 'next-auth/react';

const { data: session } = useSession();
// Session cookie automatically included in requests
```

### API Key Authentication (Professional Tier)

Professional and Enterprise users can use API keys for server-to-server communication.

**Request Header:**
```
Authorization: Bearer YOUR_API_KEY
```

**Example:**
```bash
curl -H "Authorization: Bearer sk_live_abc123..." \
     https://your-domain.com/api/insights
```

## Base URL

**Production:**
```
https://your-domain.com/api
```

**Development:**
```
http://localhost:3000/api
```

## Rate Limiting

Rate limits vary by subscription tier:

| Tier | Requests per Hour | Burst Limit |
|------|-------------------|-------------|
| **Free** | 100 | 10/min |
| **Professional** | 10,000 | 100/min |
| **Enterprise** | 100,000 | 1,000/min |

### Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9995
X-RateLimit-Reset: 1633024800
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retry_after": 3600,
  "message": "You have exceeded your rate limit. Please try again in 1 hour."
}
```

## Response Format

### Success Response

All successful API responses follow this structure:

```json
{
  "success": true,
  "data": { /* Response data */ },
  "metadata": {
    "timestamp": "2025-10-02T12:00:00Z",
    "version": "1.0.0",
    "request_id": "req_abc123"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { /* Additional error details */ },
  "metadata": {
    "timestamp": "2025-10-02T12:00:00Z",
    "request_id": "req_abc123"
  }
}
```

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| **200** | OK | Request succeeded |
| **201** | Created | Resource created successfully |
| **400** | Bad Request | Invalid request parameters |
| **401** | Unauthorized | Authentication required |
| **403** | Forbidden | Insufficient permissions |
| **404** | Not Found | Resource not found |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server error |
| **503** | Service Unavailable | Service temporarily unavailable |

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_PARAMETERS` | Request parameters are invalid |
| `AUTHENTICATION_REQUIRED` | User must be authenticated |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `RATE_LIMIT_EXCEEDED` | Rate limit reached |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `DATABASE_ERROR` | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | Third-party service error |

## Endpoints

### Health & Status

#### GET /api/health

Check API and database health status.

**Authentication:** None required

**Response:**
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "latency_ms": 12
  },
  "timestamp": "2025-10-02T12:00:00Z",
  "version": "1.0.0"
}
```

**Example:**
```bash
curl https://your-domain.com/api/health
```

---

### Insights

#### GET /api/insights

Retrieve business intelligence insights from sensor data analysis.

**Authentication:** Optional (public access to cached summary)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category: `energy`, `maintenance`, `efficiency` |
| `confidence` | number | No | Minimum confidence score (0-100) |
| `limit` | number | No | Number of insights to return (default: 10, max: 100) |

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_sensors": 144,
      "total_records": 124903795,
      "data_quality_score": 100,
      "analysis_period": {
        "start": "2018-01-01T00:00:00Z",
        "end": "2019-06-30T23:59:59Z"
      }
    },
    "key_insights": [
      {
        "id": "floor2_consumption_anomaly",
        "category": "energy",
        "title": "Floor 2 Consumes 2.8x More Energy Than Average",
        "description": "Floor 2 exhibits significantly higher energy consumption...",
        "confidence": 97,
        "priority": "critical",
        "impact": {
          "estimated_savings": "$25,000-35,000",
          "payback_period": "6 months",
          "complexity": "Medium"
        },
        "recommendation": "Conduct immediate energy audit of Floor 2...",
        "supporting_data": {
          "avg_floor_consumption": 1250,
          "floor2_consumption": 3500,
          "deviation": 180
        }
      }
    ],
    "business_impact_summary": {
      "total_identified_savings": "$273,500/year",
      "quick_wins": "$107,000/year",
      "equipment_at_risk": 37,
      "critical_alerts": 7
    }
  },
  "metadata": {
    "timestamp": "2025-10-02T12:00:00Z",
    "cache_status": "hit",
    "cache_age_seconds": 120
  }
}
```

**Example:**
```bash
# Get all insights
curl https://your-domain.com/api/insights

# Filter by category and confidence
curl "https://your-domain.com/api/insights?category=energy&confidence=90"
```

#### GET /api/insights/[id]

Retrieve detailed information for a specific insight.

**Authentication:** Required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Insight ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "floor2_consumption_anomaly",
    "category": "energy",
    "title": "Floor 2 Consumes 2.8x More Energy Than Average",
    "description": "Detailed analysis...",
    "confidence": 97,
    "priority": "critical",
    "created_at": "2025-10-01T00:00:00Z",
    "updated_at": "2025-10-02T00:00:00Z",
    "detailed_analysis": {
      "methodology": "Statistical analysis with p-value < 0.01",
      "data_points": 8640000,
      "time_period": "18 months",
      "statistical_confidence": "99.9%"
    },
    "action_plan": [
      {
        "step": 1,
        "action": "Conduct comprehensive energy audit",
        "timeline": "Week 1-2",
        "cost": "$2,000-3,000"
      }
    ]
  }
}
```

---

### Sensor Data

#### GET /api/sensor-data

Retrieve raw or aggregated sensor data.

**Authentication:** Required (Professional tier or higher)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `floor` | number | No | Filter by floor number (1-7) |
| `sensor_id` | string | No | Specific sensor ID |
| `start_date` | string | No | ISO 8601 start date |
| `end_date` | string | No | ISO 8601 end date |
| `aggregation` | string | No | Aggregation: `hourly`, `daily`, `weekly`, `monthly` |
| `limit` | number | No | Results per page (default: 1000, max: 10000) |
| `offset` | number | No | Pagination offset |

**Response:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "sensor_id": "sensor_001",
        "floor": 2,
        "timestamp": "2018-01-01T00:00:00Z",
        "temperature": 23.5,
        "humidity": 65.2,
        "co2_ppm": 450,
        "energy_kwh": 12.5
      }
    ],
    "pagination": {
      "total": 124903795,
      "limit": 1000,
      "offset": 0,
      "has_more": true
    }
  }
}
```

**Example:**
```bash
# Get Floor 2 data for January 2018
curl "https://your-domain.com/api/sensor-data?floor=2&start_date=2018-01-01&end_date=2018-01-31" \
     -H "Authorization: Bearer YOUR_API_KEY"
```

#### GET /api/sensor-data/statistics

Get statistical summaries of sensor data.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `floor` | number | No | Filter by floor |
| `metric` | string | Yes | Metric: `temperature`, `humidity`, `co2`, `energy` |
| `period` | string | No | Time period: `7d`, `30d`, `90d`, `all` (default: `30d`) |

**Response:**
```json
{
  "success": true,
  "data": {
    "metric": "energy",
    "floor": 2,
    "period": "30d",
    "statistics": {
      "mean": 3500,
      "median": 3450,
      "std_dev": 450,
      "min": 2800,
      "max": 4200,
      "p25": 3200,
      "p75": 3800,
      "p95": 4000
    },
    "trend": {
      "direction": "increasing",
      "rate": 2.3,
      "confidence": 95
    }
  }
}
```

---

### Export

#### POST /api/export

Create an export job for sensor data or analytics.

**Authentication:** Required

**Request Body:**
```json
{
  "export_type": "sensor_data",
  "format": "csv",
  "filters": {
    "floor": 2,
    "start_date": "2018-01-01",
    "end_date": "2018-12-31"
  },
  "options": {
    "include_statistics": true,
    "aggregation": "daily"
  }
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `export_type` | string | Yes | `sensor_data`, `insights`, `analytics` |
| `format` | string | Yes | `csv`, `excel`, `pdf` |
| `filters` | object | No | Data filters |
| `options` | object | No | Export options |

**Response:**
```json
{
  "success": true,
  "data": {
    "export_id": "exp_abc123",
    "status": "processing",
    "created_at": "2025-10-02T12:00:00Z",
    "estimated_completion": "2025-10-02T12:02:00Z"
  }
}
```

#### GET /api/export/[id]

Check status of an export job.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "export_id": "exp_abc123",
    "status": "completed",
    "created_at": "2025-10-02T12:00:00Z",
    "completed_at": "2025-10-02T12:01:45Z",
    "download_url": "https://r2.dev/exports/exp_abc123.csv",
    "expires_at": "2025-10-09T12:01:45Z",
    "file_size": 15728640,
    "record_count": 8640000
  }
}
```

**Status Values:**
- `pending`: Export queued
- `processing`: Export in progress
- `completed`: Export ready for download
- `failed`: Export failed
- `expired`: Download link expired

---

### Subscriptions

#### GET /api/subscriptions/current

Get current user's subscription details.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription_id": "sub_abc123",
    "tier": "professional",
    "status": "active",
    "current_period_start": "2025-10-01T00:00:00Z",
    "current_period_end": "2025-11-01T00:00:00Z",
    "cancel_at_period_end": false,
    "features": {
      "api_rate_limit": 10000,
      "export_limit": 100,
      "real_time_access": true,
      "advanced_analytics": true
    },
    "usage": {
      "api_calls_current_hour": 245,
      "exports_current_month": 12
    }
  }
}
```

#### POST /api/subscriptions/create-checkout

Create a Stripe checkout session for subscription.

**Authentication:** Required

**Request Body:**
```json
{
  "price_id": "price_professional_monthly",
  "success_url": "https://your-domain.com/dashboard",
  "cancel_url": "https://your-domain.com/pricing"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.stripe.com/...",
    "session_id": "cs_abc123"
  }
}
```

---

### Authentication Endpoints

#### GET /api/auth/session

Get current session information.

**Authentication:** None required

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "image": "https://...",
      "subscription_tier": "professional"
    },
    "expires": "2025-10-03T12:00:00Z"
  }
}
```

---

## WebSocket API

### Real-Time Pattern Detection (Professional Tier)

Connect to WebSocket for real-time pattern updates.

**Endpoint:**
```
wss://your-domain.com/api/websocket/patterns
```

**Authentication:**
Include session cookie or API key in connection headers.

**Connection:**
```javascript
const ws = new WebSocket('wss://your-domain.com/api/websocket/patterns');

ws.onopen = () => {
  console.log('Connected to pattern detection stream');

  // Subscribe to specific floors
  ws.send(JSON.stringify({
    action: 'subscribe',
    filters: { floors: [2, 3, 5] }
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Pattern detected:', data);
};
```

**Message Format:**
```json
{
  "type": "pattern_detected",
  "data": {
    "pattern_id": "pat_abc123",
    "type": "cascade_risk",
    "severity": "high",
    "affected_sensors": ["sensor_015", "sensor_016"],
    "confidence": 94,
    "timestamp": "2025-10-02T12:00:00Z",
    "details": {
      "description": "Multiple sensors showing correlated degradation",
      "recommendation": "Immediate inspection required"
    }
  }
}
```

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Fetch insights
async function getInsights() {
  const response = await fetch('/api/insights?category=energy&confidence=90');
  const data = await response.json();

  if (data.success) {
    console.log('Insights:', data.data.key_insights);
  }
}

// Create export with progress tracking
async function exportData() {
  // Create export
  const createResponse = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      export_type: 'sensor_data',
      format: 'csv',
      filters: { floor: 2 }
    })
  });

  const { data: exportJob } = await createResponse.json();

  // Poll for completion
  const checkStatus = async () => {
    const statusResponse = await fetch(`/api/export/${exportJob.export_id}`);
    const { data: status } = await statusResponse.json();

    if (status.status === 'completed') {
      window.location.href = status.download_url;
    } else if (status.status === 'processing') {
      setTimeout(checkStatus, 2000);
    }
  };

  checkStatus();
}
```

### Python

```python
import requests
import time

# API Configuration
API_BASE = "https://your-domain.com/api"
API_KEY = "your_api_key"
headers = {"Authorization": f"Bearer {API_KEY}"}

# Fetch insights
def get_insights(category=None, confidence=None):
    params = {}
    if category:
        params['category'] = category
    if confidence:
        params['confidence'] = confidence

    response = requests.get(f"{API_BASE}/insights", params=params, headers=headers)
    return response.json()

# Export data
def export_data(floor, start_date, end_date):
    payload = {
        "export_type": "sensor_data",
        "format": "csv",
        "filters": {
            "floor": floor,
            "start_date": start_date,
            "end_date": end_date
        }
    }

    response = requests.post(f"{API_BASE}/export", json=payload, headers=headers)
    export_job = response.json()['data']

    # Wait for completion
    while True:
        status_response = requests.get(
            f"{API_BASE}/export/{export_job['export_id']}",
            headers=headers
        )
        status = status_response.json()['data']

        if status['status'] == 'completed':
            return status['download_url']
        elif status['status'] == 'failed':
            raise Exception('Export failed')

        time.sleep(2)

# Usage
insights = get_insights(category='energy', confidence=90)
print(f"Found {len(insights['data']['key_insights'])} insights")

download_url = export_data(floor=2, start_date='2018-01-01', end_date='2018-12-31')
print(f"Download ready: {download_url}")
```

### cURL

```bash
# Get insights
curl "https://your-domain.com/api/insights?category=energy" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Create export
curl -X POST "https://your-domain.com/api/export" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "export_type": "sensor_data",
    "format": "csv",
    "filters": { "floor": 2 }
  }'

# Check export status
curl "https://your-domain.com/api/export/exp_abc123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## API Changelog

### Version 1.0.0 (2025-10-02)
- Initial API release
- Insights endpoints
- Sensor data access
- Export functionality
- WebSocket real-time patterns
- Subscription management

---

## Support

For API support:
- **Documentation**: [GitHub Repository](https://github.com/chrimar3/IoT-Transmission-Failure-Analysis-Platform)
- **Issues**: [Report Issues](https://github.com/chrimar3/IoT-Transmission-Failure-Analysis-Platform/issues)
- **Contact**: [GitHub Profile](https://github.com/chrimar3)

## Rate Limit Best Practices

1. **Cache responses** when possible
2. **Use WebSocket** for real-time data instead of polling
3. **Implement exponential backoff** for retries
4. **Monitor rate limit headers** and adjust request rate
5. **Upgrade tier** if consistently hitting limits
