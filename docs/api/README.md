# 📡 API Documentation

## Overview

The CU-BEMS IoT Platform provides RESTful APIs for accessing building sensor data and business intelligence insights.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently, the APIs are open for MVP demonstration. Production deployment will include:
- JWT token authentication
- Role-based access control
- Rate limiting per API key

## Core Endpoints

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-13T17:22:23.302Z",
  "database": {
    "connected": true,
    "records": "No data"
  },
  "version": "1.0.0",
  "environment": "development",
  "response_time_ms": 2
}
```

### Business Insights
```http
GET /api/insights
```

**Query Parameters:**
- `category` (optional): Filter by insight category (`energy`, `maintenance`, `efficiency`, `cost`, `reliability`)
- `severity` (optional): Filter by severity level (`info`, `warning`, `critical`)
- `limit` (optional): Limit number of results (default: all)

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_sensors": 144,
      "total_records": 124903795,
      "analysis_period": "2018-2019 (18 months)",
      "data_quality_score": 100,
      "generated_at": "2025-09-13T12:32:53.562Z"
    },
    "key_insights": [
      {
        "id": "floor2_consumption_anomaly",
        "title": "Floor 2 Consumes 2.8x More Energy Than Average",
        "value": "2.8x Higher",
        "confidence": 97,
        "category": "efficiency",
        "severity": "critical",
        "description": "Floor 2 shows extreme energy consumption compared to other floors",
        "actionable_recommendation": "Immediate audit of Floor 2 AC systems and equipment configuration",
        "business_impact": "Potential savings of $25,000-35,000 annually with optimization",
        "estimated_savings": "$25,000-35,000",
        "implementation_difficulty": "Easy"
      }
    ],
    "business_impact_summary": {
      "total_identified_savings": "$273,500/year",
      "immediate_actions_savings": "$107,000/year",
      "payback_period_range": "6-18 months",
      "implementation_complexity": "Mixed (Easy to Complex)",
      "confidence_level": "89-99%",
      "data_quality_backing": "100%"
    }
  },
  "metadata": {
    "total_insights": 7,
    "filtered_count": 7,
    "filters_applied": {
      "category": null,
      "severity": null,
      "limit": null
    },
    "generated_at": "2025-09-13T17:19:59.112Z"
  }
}
```

## Future Endpoints (Roadmap)

### Real-time Sensor Data
```http
GET /api/sensors/{sensorId}/readings
GET /api/floors/{floorId}/sensors
```

### Energy Analytics
```http
GET /api/analytics/energy/consumption
GET /api/analytics/energy/trends
GET /api/analytics/energy/predictions
```

### Maintenance Tracking
```http
GET /api/maintenance/alerts
POST /api/maintenance/schedule
GET /api/maintenance/history
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  },
  "timestamp": "2025-09-13T17:22:23.302Z"
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

## Rate Limits

Production API will include:
- **Free Tier**: 1,000 requests/hour
- **Pro Tier**: 10,000 requests/hour
- **Enterprise**: Unlimited

## Data Formats

### Timestamps
All timestamps are in ISO 8601 format with UTC timezone:
```
2025-09-13T17:22:23.302Z
```

### Currency Values
All monetary values are in USD with comma separators:
```
"$25,000-35,000"
```

### Confidence Scores
Confidence scores are integers between 0-100:
```
97  // 97% confidence
```

## SDK Examples

### JavaScript/Node.js
```javascript
const response = await fetch('/api/insights?category=energy&severity=critical');
const data = await response.json();
console.log(data.data.key_insights);
```

### Python
```python
import requests

response = requests.get('http://localhost:3000/api/insights')
data = response.json()
print(f"Total savings: {data['data']['business_impact_summary']['total_identified_savings']}")
```

### cURL
```bash
curl -X GET "http://localhost:3000/api/insights?category=energy" \
  -H "Content-Type: application/json"
```

## Performance

- **Average Response Time**: <100ms
- **95th Percentile**: <200ms
- **Uptime SLA**: 99.9%
- **Rate Limit**: 1000 requests/hour (development)

## Support

For API support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section in the main README
- Review the error codes and common solutions below

## Common Issues

### 1. CORS Errors
For browser requests, ensure the frontend is running on the same domain or configure CORS headers.

### 2. Large Response Payloads
Use pagination parameters for endpoints that return large datasets.

### 3. Timeout Issues
Default timeout is 30 seconds. For large data processing requests, implement polling or webhooks.