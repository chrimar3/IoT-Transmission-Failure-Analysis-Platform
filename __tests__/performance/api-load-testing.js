/**
 * Story 4.2: Professional API Access - Performance Load Testing
 * k6 Load Testing Scripts for API Performance Validation
 * Target: <500ms p95 response time, 10K req/hr rate limiting
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('error_rate')
const responseTime = new Trend('response_time')
const rateLimitErrors = new Rate('rate_limit_errors')

// Test configuration
export let options = {
  scenarios: {
    // Scenario 1: Normal Professional Load
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '10m', target: 50 },  // Stay at 50 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { scenario: 'normal_load' },
    },

    // Scenario 2: Peak Professional Load
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 200 },  // Ramp up to 200 users
        { duration: '5m', target: 200 },  // Stay at 200 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      startTime: '15m',
      tags: { scenario: 'peak_load' },
    },

    // Scenario 3: Stress Test
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 500 },  // Rapid ramp up
        { duration: '3m', target: 500 },  // Sustained stress
        { duration: '1m', target: 0 },    // Rapid ramp down
      ],
      startTime: '25m',
      tags: { scenario: 'stress_test' },
    },

    // Scenario 4: Rate Limit Testing
    rate_limit_test: {
      executor: 'constant-arrival-rate',
      rate: 200, // 200 requests per second (720K per hour - exceeds 10K limit)
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 100,
      maxVUs: 200,
      startTime: '30m',
      tags: { scenario: 'rate_limit_test' },
    },

    // Scenario 5: Spike Test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 1000 }, // Sudden spike
        { duration: '30s', target: 1000 }, // Maintain spike
        { duration: '10s', target: 1 },    // Drop to normal
      ],
      startTime: '35m',
      tags: { scenario: 'spike_test' },
    }
  },

  thresholds: {
    // Performance thresholds
    'http_req_duration': [
      'p(95)<500',  // 95% of requests under 500ms (Story requirement)
      'p(99)<1000', // 99% of requests under 1s
    ],
    'http_req_duration{scenario:normal_load}': ['p(95)<300'], // Stricter for normal load
    'http_req_duration{scenario:peak_load}': ['p(95)<500'],
    'http_req_duration{scenario:stress_test}': ['p(95)<1000'],

    // Error rate thresholds
    'http_req_failed': ['rate<0.01'], // Less than 1% errors overall
    'error_rate': ['rate<0.01'],
    'rate_limit_errors{scenario:rate_limit_test}': ['rate>0.9'], // Rate limiting should kick in

    // Rate limiting thresholds
    'http_reqs{scenario:rate_limit_test}': ['rate<180'], // Should be throttled

    // Success rate thresholds
    'checks': ['rate>0.99'], // 99% of checks should pass
  },
}

// Test data configuration
const API_BASE_URL = __ENV.API_BASE_URL || 'https://api.cu-bems.com'
const PROFESSIONAL_API_KEY = __ENV.PROFESSIONAL_API_KEY || 'sk_test_professional_key'
const FREE_API_KEY = __ENV.FREE_API_KEY || 'sk_test_free_key'

// Bangkok dataset sensor configurations
const SENSOR_CONFIGS = [
  { id: 'SENSOR_001', type: 'HVAC', floor: 1 },
  { id: 'SENSOR_002', type: 'Lighting', floor: 2 },
  { id: 'SENSOR_003', type: 'Power', floor: 3 },
  { id: 'SENSOR_004', type: 'Water', floor: 4 },
  { id: 'SENSOR_005', type: 'Security', floor: 5 },
  { id: 'SENSOR_006', type: 'HVAC', floor: 6 },
  { id: 'SENSOR_007', type: 'Lighting', floor: 7 },
  { id: 'SENSOR_008', type: 'Power', floor: 1 },
]

// Date ranges for testing
const DATE_RANGES = [
  {
    name: 'recent',
    start: '2024-09-01T00:00:00Z',
    end: '2024-09-23T23:59:59Z',
  },
  {
    name: 'monthly',
    start: '2024-08-01T00:00:00Z',
    end: '2024-08-31T23:59:59Z',
  },
  {
    name: 'quarterly',
    start: '2024-06-01T00:00:00Z',
    end: '2024-08-31T23:59:59Z',
  },
]

export default function() {
  const scenario = __ENV.SCENARIO || 'normal_load'
  const apiKey = scenario === 'rate_limit_test' ? FREE_API_KEY : PROFESSIONAL_API_KEY

  // Test different API endpoints with realistic usage patterns
  const testEndpoints = [
    () => testTimeSeriesAPI(apiKey),
    () => testDataSummaryAPI(apiKey),
    () => testAnalyticsAPI(apiKey),
    () => testFloorSpecificAPI(apiKey),
    () => testEquipmentAPI(apiKey),
    () => testPatternsAPI(apiKey),
    () => testExportCreation(apiKey),
    () => testUsageAnalytics(apiKey),
  ]

  // Select random endpoint for each virtual user iteration
  const randomTest = testEndpoints[Math.floor(Math.random() * testEndpoints.length)]
  randomTest()

  // Realistic pause between requests (0.5-2 seconds)
  sleep(Math.random() * 1.5 + 0.5)
}

/**
 * Test time-series data API endpoint
 */
function testTimeSeriesAPI(apiKey) {
  const sensors = getRandomSensors(3) // Random 3 sensors
  const dateRange = getRandomDateRange()
  const interval = getRandomInterval()

  const url = `${API_BASE_URL}/v1/data/timeseries`
  const params = {
    sensor_ids: sensors.map(s => s.id).join(','),
    start_date: dateRange.start,
    end_date: dateRange.end,
    interval: interval,
    max_points: Math.floor(Math.random() * 5000) + 1000, // 1K-6K points
    aggregation: getRandomAggregation(),
  }

  const response = http.get(url, {
    headers: getAuthHeaders(apiKey),
    params: params,
    tags: { endpoint: 'timeseries' },
  })

  const passed = check(response, {
    'timeseries status is 200': (r) => r.status === 200,
    'timeseries response time < 500ms': (r) => r.timings.duration < 500,
    'timeseries has rate limit headers': (r) => r.headers['x-ratelimit-remaining'] !== undefined,
    'timeseries response structure valid': (r) => {
      try {
        const data = JSON.parse(r.body)
        return data.success && data.data && data.data.series && data.meta
      } catch (e) {
        return false
      }
    },
    'timeseries metadata present': (r) => {
      try {
        const data = JSON.parse(r.body)
        return data.data.metadata &&
               typeof data.data.metadata.total_points === 'number' &&
               typeof data.data.metadata.query_time_ms === 'number'
      } catch (e) {
        return false
      }
    },
  })

  errorRate.add(!passed)
  responseTime.add(response.timings.duration)

  if (response.status === 429) {
    rateLimitErrors.add(1)
  } else {
    rateLimitErrors.add(0)
  }

  return response
}

/**
 * Test data summary API endpoint
 */
function testDataSummaryAPI(apiKey) {
  const dateRange = getRandomDateRange()
  const equipmentType = getRandomEquipmentType()

  const url = `${API_BASE_URL}/v1/data/summary`
  const params = {
    start_date: dateRange.start,
    end_date: dateRange.end,
    equipment_type: equipmentType,
    include_statistics: true,
  }

  const response = http.get(url, {
    headers: getAuthHeaders(apiKey),
    params: params,
    tags: { endpoint: 'summary' },
  })

  check(response, {
    'summary status is 200': (r) => r.status === 200,
    'summary response time < 300ms': (r) => r.timings.duration < 300,
    'summary has statistical data': (r) => {
      try {
        const data = JSON.parse(r.body)
        return data.data && data.data.statistics
      } catch (e) {
        return false
      }
    },
  })

  return response
}

/**
 * Test analytics API endpoint
 */
function testAnalyticsAPI(apiKey) {
  const url = `${API_BASE_URL}/v1/data/analytics`
  const params = {
    analysis_type: getRandomAnalysisType(),
    confidence_level: 0.95,
    include_patterns: true,
  }

  const response = http.get(url, {
    headers: getAuthHeaders(apiKey),
    params: params,
    tags: { endpoint: 'analytics' },
  })

  check(response, {
    'analytics status is 200': (r) => r.status === 200,
    'analytics response time < 800ms': (r) => r.timings.duration < 800, // More complex analysis
    'analytics has confidence intervals': (r) => {
      try {
        const data = JSON.parse(r.body)
        return data.data && data.data.confidence_intervals
      } catch (e) {
        return false
      }
    },
  })

  return response
}

/**
 * Test floor-specific data API
 */
function testFloorSpecificAPI(apiKey) {
  const floor = Math.floor(Math.random() * 7) + 1 // Floors 1-7
  const url = `${API_BASE_URL}/v1/data/floors/${floor}`

  const response = http.get(url, {
    headers: getAuthHeaders(apiKey),
    tags: { endpoint: 'floors' },
  })

  check(response, {
    'floor data status is 200': (r) => r.status === 200,
    'floor data response time < 400ms': (r) => r.timings.duration < 400,
    'floor data has equipment info': (r) => {
      try {
        const data = JSON.parse(r.body)
        return data.data && data.data.equipment
      } catch (e) {
        return false
      }
    },
  })

  return response
}

/**
 * Test equipment-specific API
 */
function testEquipmentAPI(apiKey) {
  const equipmentType = getRandomEquipmentType()
  const url = `${API_BASE_URL}/v1/data/equipment/${equipmentType}`

  const response = http.get(url, {
    headers: getAuthHeaders(apiKey),
    tags: { endpoint: 'equipment' },
  })

  check(response, {
    'equipment data status is 200': (r) => r.status === 200,
    'equipment data response time < 400ms': (r) => r.timings.duration < 400,
  })

  return response
}

/**
 * Test patterns detection API
 */
function testPatternsAPI(apiKey) {
  const url = `${API_BASE_URL}/v1/data/patterns`
  const params = {
    pattern_type: getRandomPatternType(),
    sensitivity: Math.random() * 0.5 + 0.5, // 0.5-1.0
  }

  const response = http.get(url, {
    headers: getAuthHeaders(apiKey),
    params: params,
    tags: { endpoint: 'patterns' },
  })

  check(response, {
    'patterns status is 200': (r) => r.status === 200,
    'patterns response time < 1000ms': (r) => r.timings.duration < 1000, // Pattern analysis is complex
  })

  return response
}

/**
 * Test export creation (async operation)
 */
function testExportCreation(apiKey) {
  const url = `${API_BASE_URL}/v1/exports/create`
  const payload = {
    format: getRandomExportFormat(),
    data_type: 'timeseries',
    date_range: getRandomDateRange(),
    sensors: getRandomSensors(5).map(s => s.id),
    compression: true,
  }

  const response = http.post(url, JSON.stringify(payload), {
    headers: {
      ...getAuthHeaders(apiKey),
      'Content-Type': 'application/json',
    },
    tags: { endpoint: 'export_create' },
  })

  check(response, {
    'export creation status is 202': (r) => r.status === 202, // Accepted for async processing
    'export creation response time < 2000ms': (r) => r.timings.duration < 2000,
    'export job ID provided': (r) => {
      try {
        const data = JSON.parse(r.body)
        return data.job_id && typeof data.job_id === 'string'
      } catch (e) {
        return false
      }
    },
  })

  return response
}

/**
 * Test usage analytics API
 */
function testUsageAnalytics(apiKey) {
  const url = `${API_BASE_URL}/v1/usage`
  const params = {
    timeframe: getRandomTimeframe(),
    group_by: 'endpoint',
  }

  const response = http.get(url, {
    headers: getAuthHeaders(apiKey),
    params: params,
    tags: { endpoint: 'usage' },
  })

  check(response, {
    'usage analytics status is 200': (r) => r.status === 200,
    'usage analytics response time < 300ms': (r) => r.timings.duration < 300,
    'usage analytics has metrics': (r) => {
      try {
        const data = JSON.parse(r.body)
        return data.data && data.data.metrics
      } catch (e) {
        return false
      }
    },
  })

  return response
}

// Helper Functions

function getAuthHeaders(apiKey) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'User-Agent': 'k6-load-test/1.0',
    'Accept': 'application/json',
  }
}

function getRandomSensors(count) {
  const shuffled = SENSOR_CONFIGS.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

function getRandomDateRange() {
  return DATE_RANGES[Math.floor(Math.random() * DATE_RANGES.length)]
}

function getRandomInterval() {
  const intervals = ['minute', 'hour', 'day', 'week']
  return intervals[Math.floor(Math.random() * intervals.length)]
}

function getRandomAggregation() {
  const aggregations = ['avg', 'sum', 'min', 'max']
  return aggregations[Math.floor(Math.random() * aggregations.length)]
}

function getRandomEquipmentType() {
  const types = ['HVAC', 'Lighting', 'Power', 'Water', 'Security']
  return types[Math.floor(Math.random() * types.length)]
}

function getRandomAnalysisType() {
  const types = ['anomaly_detection', 'trend_analysis', 'correlation_analysis', 'efficiency_metrics']
  return types[Math.floor(Math.random() * types.length)]
}

function getRandomPatternType() {
  const types = ['seasonal', 'anomaly', 'efficiency', 'correlation']
  return types[Math.floor(Math.random() * types.length)]
}

function getRandomExportFormat() {
  const formats = ['json', 'csv', 'excel', 'xml']
  return formats[Math.floor(Math.random() * formats.length)]
}

function getRandomTimeframe() {
  const timeframes = ['1_hour', '24_hours', '7_days', '30_days']
  return timeframes[Math.floor(Math.random() * timeframes.length)]
}

// Setup and teardown functions
export function setup() {
  console.log('Starting Professional API Load Testing...')
  console.log(`API Base URL: ${API_BASE_URL}`)
  console.log(`Test Duration: ~40 minutes`)

  // Validate API is accessible
  const healthCheck = http.get(`${API_BASE_URL}/health`)
  if (healthCheck.status !== 200) {
    throw new Error(`API health check failed: ${healthCheck.status}`)
  }

  return {
    startTime: new Date().toISOString(),
    apiBaseUrl: API_BASE_URL,
  }
}

export function teardown(data) {
  console.log('Load testing completed.')
  console.log(`Started at: ${data.startTime}`)
  console.log(`Completed at: ${new Date().toISOString()}`)
}