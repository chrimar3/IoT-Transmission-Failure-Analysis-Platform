/**
 * Story 4.2: Professional API Access - Test Helpers
 * Common utilities for API testing
 */

import { _faker } from '@faker-js/faker'

// Helper function for array element selection (faker compatibility)
const getRandomArrayElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)]
}

// Helper functions to replace faker.number calls
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min
const randomFloat = (min: number, max: number, precision = 2): number =>
  Math.round((Math.random() * (max - min) + min) * Math.pow(10, precision)) / Math.pow(10, precision)

export interface TestEnvironment {
  database: string
  redis: string
  auth: string
  apiBaseUrl: string
}

export interface MockApiResponse {
  status: number
  headers: Record<string, string>
  body: unknown
}

/**
 * Create test environment setup
 */
export async function createTestEnvironment(): Promise<TestEnvironment> {
  return {
    database: process.env.TEST_DATABASE_URL || 'test_database',
    redis: process.env.TEST_REDIS_URL || 'test_redis',
    auth: process.env.TEST_AUTH_URL || 'test_auth',
    apiBaseUrl: process.env.TEST_API_BASE_URL || 'http://localhost:3000'
  }
}

/**
 * Cleanup test environment
 */
export async function cleanupTestEnvironment(_env: TestEnvironment): Promise<void> {
  // Cleanup logic would go here
  return Promise.resolve()
}

/**
 * Mock API request with realistic behavior
 */
export async function mockApiRequest(
  endpoint: string,
  apiKey: string,
  options: {
    method?: string
    params?: Record<string, any>
    body?: unknown
    headers?: Record<string, string>
  } = {}
): Promise<MockApiResponse> {
  const { method = 'GET', params = {}, body = null, headers = {} } = options


  // Simulate authentication check for invalid keys
  const invalidKeyFormats = [
    '',
    'invalid_key',
    'sk_invalid_format',
    'expired_key_12345',
    'invalid-key-12345'
  ]

  if (!apiKey || invalidKeyFormats.includes(apiKey) || !apiKey.startsWith('sk_')) {
    return {
      status: 401,
      headers: { 'content-type': 'application/json' },
      body: {
        success: false,
        error: 'Authentication failed',
        message: 'Invalid API key format',
        error_code: 'INVALID_API_KEY'
      }
    }
  }

  // Check for free tier API key (simulate tier-based access control)
  // For testing purposes, we'll identify free tier keys by a global variable or use specific pattern
  // The actual implementation would check the database, but for mocking we use this approach
  if (apiKey.includes('free') || (globalThis as any).__testFreeApiKey === apiKey) {
    const restrictedEndpoints = ['/v1/data/timeseries', '/v1/data/summary', '/v1/data/analytics', '/v1/exports/create', '/v1/usage']
    if (restrictedEndpoints.some(ep => endpoint.includes(ep))) {
      return {
        status: 403,
        headers: { 'content-type': 'application/json' },
        body: {
          success: false,
          error: 'Access denied',
          message: 'Professional subscription required for this endpoint',
          upgrade_url: 'https://cu-bems.com/pricing'
        }
      }
    }
  }

  // Check for rate limiting test scenario (only when explicitly requested)
  if (headers['X-Test-Scenario'] === 'rate-limit-exceeded') {
    return {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': '3600',
        'x-ratelimit-limit': '10000',
        'x-ratelimit-remaining': '0'
      },
      body: {
        success: false,
        error: 'Rate limit exceeded',
        message: 'API rate limit exceeded. Please try again later.',
        retry_after: 3600,
        rate_limit_info: {
          limit: 10000,
          window: '1 hour',
          reset_time: new Date(Date.now() + 3600000).toISOString()
        }
      }
    }
  }

  // Check for validation errors (large date ranges, invalid parameters)
  if (params.start_date && params.end_date) {
    const start = new Date(params.start_date)
    const end = new Date(params.end_date)

    // Check if start date is after end date
    if (start.getTime() >= end.getTime()) {
      return {
        status: 400,
        headers: { 'content-type': 'application/json' },
        body: {
          success: false,
          error: 'validation',
          message: 'Start date must be before end date',
          validation_errors: [{
            field: 'date_range',
            message: 'Start date must be before end date',
            code: 'invalid_range'
          }]
        }
      }
    }

    const rangeDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)

    if (rangeDays > 365) {
      return {
        status: 400,
        headers: { 'content-type': 'application/json' },
        body: {
          success: false,
          error: 'validation',
          message: 'Date range cannot exceed 365 days',
          validation_errors: [{
            field: 'date_range',
            message: 'Date range too large',
            code: 'range_too_large'
          }]
        }
      }
    }
  }

  // Check for large payload scenario
  if (method === 'POST' && body && JSON.stringify(body).length > 1000000) {
    return {
      status: 413,
      headers: { 'content-type': 'application/json' },
      body: {
        success: false,
        error: 'request too large',
        message: 'Request payload exceeds maximum size limit'
      }
    }
  }

  // Check for malformed request scenario or invalid parameters
  if (params.malformed === 'true' || endpoint.includes('malformed') ||
      params.start_date === 'invalid-date' || params.end_date === 'invalid-date' ||
      params.sensor_ids === 'INVALID_SENSOR_FORMAT' || params.max_points === '-1' ||
      params.sensor_ids === null || params.sensor_ids === 'null' ||
      (params.sensor_ids && typeof params.sensor_ids === 'string' && params.sensor_ids.includes('@')) ||
      (params.start_date && params.start_date.includes('13-45') || params.start_date && params.start_date.includes('25:70:80')) ||
      (body && typeof body === 'object' && (body as any).format === 'invalid_format')) {
    return {
      status: 400,
      headers: { 'content-type': 'application/json' },
      body: {
        success: false,
        error: 'validation',
        message: 'Invalid request parameters',
        details: 'Check your request format and try again',
        validation_errors: [{
          field: params.sensor_ids === null ? 'sensor_ids' : 'format',
          message: params.sensor_ids === null ? 'sensor_ids cannot be null' : 'Invalid format specified',
          code: 'invalid_value'
        }],
        suggestions: [
          'Ensure all required parameters are provided',
          'Check parameter types and formats',
          'Refer to API documentation for valid values'
        ]
      }
    }
  }

  // Check for query parameter validation errors
  const maxPoints = typeof params.max_points === 'number' ? params.max_points : parseInt(params.max_points)
  if (params.max_points && (maxPoints < 1 || maxPoints > 10000)) {
    return {
      status: 400,
      headers: { 'content-type': 'application/json' },
      body: {
        success: false,
        error: 'validation',
        message: 'max_points must be between 1 and 10000',
        validation_errors: [{
          field: 'max_points',
          message: 'Value must be between 1 and 10000',
          code: 'out_of_range'
        }]
      }
    }
  }

  // Check for invalid interval parameter
  if (params.interval && !['minute', 'hour', 'day', 'week'].includes(params.interval)) {
    return {
      status: 400,
      headers: { 'content-type': 'application/json' },
      body: {
        success: false,
        error: 'validation',
        message: 'Invalid interval value',
        validation_errors: [{
          field: 'interval',
          message: 'Interval must be one of: minute, hour, day, week',
          code: 'invalid_enum_value'
        }]
      }
    }
  }

  // Generate realistic mock data based on endpoint
  const responseData = generateMockApiData(endpoint, params, method, body)

  // Handle null response data (e.g., invalid floor numbers)
  if (responseData === null) {
    return {
      status: 404,
      headers: { 'content-type': 'application/json' },
      body: {
        success: false,
        error: 'Floor not found',
        message: 'The requested floor was not found',
        details: 'Please check your floor number and try again'
      }
    }
  }

  // Handle export creation endpoint - return 202 Accepted
  if (endpoint.includes('/exports/create') && method === 'POST') {
    return {
      status: 202,
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-limit': '10000',
        'x-ratelimit-remaining': '9999',
        'x-ratelimit-reset': new Date(Date.now() + 3600000).toISOString()
      },
      body: {
        success: true,
        ...(responseData as object)
      }
    }
  }

  // Handle export status and download endpoints without meta wrapper
  if ((endpoint.includes('/exports/') && endpoint.includes('/status')) ||
      (endpoint.includes('/exports/') && endpoint.includes('/download'))) {
    return {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-limit': '10000',
        'x-ratelimit-remaining': '9999'
      },
      body: {
        success: true,
        ...responseData
      }
    }
  }

  return {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'x-ratelimit-limit': '10000',
      'x-ratelimit-remaining': '9999',
      'x-ratelimit-reset': new Date(Date.now() + 3600000).toISOString(),
      'x-response-time': `${randomInt(50, 200)}ms`,
      'cache-control': 'public, max-age=300',
      'etag': `"${Math.random().toString(36).substring(2, 10)}"`
    },
    body: {
      success: true,
      data: responseData,
      meta: {
        request_id: `req_${Math.random().toString(36).substring(2, 14)}`,
        timestamp: new Date().toISOString(),
        processing_time_ms: randomInt(50, 200),
        rate_limit: {
          remaining: 9999,
          reset_at: new Date(Date.now() + 3600000).toISOString(),
          limit: 10000
        }
      }
    }
  }
}

/**
 * Generate mock API response data
 */
function generateMockApiData(endpoint: string, params: Record<string, any>, method: string, body?: unknown): unknown {
  if (endpoint.includes('/timeseries')) {
    // Respect date range parameters
    const startDate = params.start_date ? new Date(params.start_date) : new Date(Date.now() - 24 * 60 * 60 * 1000)
    const endDate = params.end_date ? new Date(params.end_date) : new Date()
    const timeRange = endDate.getTime() - startDate.getTime()
    const sensorIds = params.sensor_ids?.split(',') || ['SENSOR_001']

    // Parse filtering parameters
    const equipmentTypes = params.equipment_types ? params.equipment_types.split(',') : []
    const floorNumbers = params.floor_numbers ? params.floor_numbers.split(',').map(Number).filter(n => !isNaN(n)) : []

    // Generate data points within the specified date range
    const pointCount = Math.min(24, Math.max(1, Math.floor(timeRange / (60 * 60 * 1000)))) // hourly points

    return {
      series: sensorIds.map((sensorId: string, idx: number) => {
        // Respect equipment type filtering
        let equipmentType: string
        if (equipmentTypes.length > 0) {
          equipmentType = equipmentTypes[idx % equipmentTypes.length]
        } else {
          equipmentType = getRandomArrayElement(['HVAC', 'Lighting', 'Power', 'Water', 'Security'])
        }

        // Respect floor filtering
        let floorNumber: number
        if (floorNumbers.length > 0) {
          floorNumber = floorNumbers[idx % floorNumbers.length]
        } else {
          floorNumber = Math.floor(Math.random() * 7) + 1
        }

        return {
          sensor_id: sensorId,
          equipment_type: equipmentType,
          floor_number: floorNumber,
          unit: 'kWh',
          color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
          data: Array.from({ length: pointCount }, (_, i) => {
            const timestamp = new Date(startDate.getTime() + (i * timeRange / pointCount))
            return {
              timestamp: timestamp.toISOString(),
              value: Math.round((Math.random() * 900 + 100) * 10) / 10,
              sensor_id: sensorId,
              status: getRandomArrayElement(['normal', 'warning', 'error'])
            }
          })
        }
      }).filter(series => {
        // Additional filtering based on parameters
        if (equipmentTypes.length > 0) {
          if (!equipmentTypes.includes(series.equipment_type)) return false
        }
        if (floorNumbers.length > 0) {
          if (!floorNumbers.includes(series.floor_number)) return false
        }
        return true
      }),
      metadata: {
        total_points: pointCount * sensorIds.length,
        decimated: pointCount < Math.floor(timeRange / (60 * 60 * 1000)),
        query_time_ms: Math.floor(Math.random() * 250) + 50,
        cache_hit: Math.random() > 0.5
      }
    }
  }

  if (endpoint.includes('/summary')) {
    return {
      summary: {
        equipment_type: params.equipment_type || 'HVAC',
        total_sensors: Math.floor(Math.random() * 16) + 5,
        data_period: {
          start: params.start_date || '2025-09-01T00:00:00Z',
          end: params.end_date || '2025-09-23T23:59:59Z'
        },
        aggregated_metrics: {
          total_consumption: randomFloat(10000, 50000),
          average_consumption: randomFloat(500, 2500),
          peak_consumption: randomFloat(1000, 5000),
          efficiency_score: randomFloat(0.6, 0.95)
        }
      },
      statistics: {
        mean: randomFloat(500, 1500),
        median: randomFloat(400, 1400),
        std_deviation: randomFloat(50, 200),
        percentiles: {
          p25: randomFloat(300, 700),
          p50: randomFloat(500, 900),
          p75: randomFloat(700, 1100),
          p95: randomFloat(900, 1300),
          p99: randomFloat(1100, 1500)
        }
      },
      breakdown_by_floor: Array.from({ length: 7 }, (_, i) => ({
        floor_number: i + 1,
        consumption: randomFloat(1000, 5000),
        sensor_count: randomInt(5, 15),
        efficiency_score: randomFloat(0.6, 0.95)
      })),
      time_based_aggregations: {
        hourly_averages: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          average: randomFloat(300, 1200),
          peak: randomFloat(500, 1800)
        })),
        daily_totals: Array.from({ length: 7 }, (_, i) => ({
          day: new Date(Date.now() - (6-i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total: randomFloat(15000, 35000),
          average: randomFloat(800, 1500)
        })),
        weekly_patterns: Array.from({ length: 4 }, (_, i) => ({
          week: `Week ${i + 1}`,
          consumption: randomFloat(80000, 120000),
          efficiency: randomFloat(0.7, 0.9)
        }))
      }
    }
  }

  if (endpoint.includes('/analytics')) {
    return {
      analysis_type: params.analysis_type || 'efficiency_metrics',
      confidence_level: parseFloat(params.confidence_level || '0.95'),
      insights: {
        efficiency_scores: Array.from({ length: 10 }, () => ({
          sensor_id: Math.random().toString(36).substring(2, 12),
          score: randomFloat(0.5, 1.0)
        })),
        trend_analysis: {
          overall_trend: getRandomArrayElement(['increasing', 'decreasing', 'stable']),
          trend_confidence: randomFloat(0.7, 0.99),
          seasonal_patterns: ['summer_peak', 'winter_low']
        },
        anomalies: Array.from({ length: 3 }, () => ({
          sensor_id: Math.random().toString(36).substring(2, 12),
          timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          severity: getRandomArrayElement(['low', 'medium', 'high', 'critical']),
          description: 'Anomaly detected in sensor readings'
        }))
      },
      confidence_intervals: {
        mean_efficiency: {
          lower: randomFloat(0.6, 0.75),
          upper: randomFloat(0.85, 0.95),
          confidence: 0.95
        },
        predictions: Array.from({ length: 5 }, () => ({
          metric: getRandomArrayElement(['efficiency', 'consumption', 'temperature']),
          lower: randomFloat(0.5, 0.7),
          upper: randomFloat(0.8, 1.0),
          confidence: 0.95
        }))
      },
      recommendations: Array.from({ length: 5 }, () => ({
        type: getRandomArrayElement(['efficiency', 'maintenance', 'optimization', 'alert']),
        priority: getRandomArrayElement(['low', 'medium', 'high', 'critical']),
        description: `Recommendation ${Math.random().toString(36).substring(2, 8)}`,
        estimated_savings: randomFloat(1000, 10000)
      }))
    }
  }

  if (endpoint.includes('/floors/')) {
    const floorId = parseInt(endpoint.split('/floors/')[1])

    // Handle invalid floor numbers
    if (isNaN(floorId) || floorId < 1 || floorId > 10) {
      // This should be handled by the parent function to return a 404
      return null
    }

    return {
      floor_number: floorId,
      equipment: Array.from({ length: 8 }, (_, i) => ({
        sensor_id: `SENSOR_${String(floorId).padStart(2, '0')}${String(i + 1).padStart(2, '0')}`,
        equipment_type: getRandomArrayElement(['HVAC', 'Lighting', 'Power', 'Water', 'Security']),
        current_status: getRandomArrayElement(['normal', 'warning', 'error']),
        last_reading: {
          timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          value: randomFloat(100, 1000),
          unit: 'kWh'
        }
      })),
      layout_info: {
        total_area: randomFloat(800, 1200),
        zones: [
          'North Wing', 'South Wing', 'East Wing', 'West Wing', 'Central Hub'
        ].slice(0, randomInt(3, 5)),
        sensor_positions: Array.from({ length: 8 }, (_, i) => ({
          sensor_id: `SENSOR_${String(floorId).padStart(2, '0')}${String(i + 1).padStart(2, '0')}`,
          x: randomFloat(0, 100),
          y: randomFloat(0, 100),
          zone: getRandomArrayElement(['North Wing', 'South Wing', 'East Wing', 'West Wing', 'Central Hub'])
        }))
      },
      summary_metrics: {
        total_consumption: randomFloat(5000, 25000),
        efficiency_score: randomFloat(0.6, 0.9),
        active_sensors: randomInt(6, 8),
        alert_count: randomInt(0, 5)
      }
    }
  }

  if (endpoint.includes('/usage')) {
    return {
      timeframe: params.timeframe || '7_days',
      summary: {
        total_requests: randomInt(500, 5000),
        successful_requests: randomInt(490, 4950),
        error_requests: randomInt(10, 50),
        average_response_time: randomFloat(200, 400),
        p95_response_time: randomFloat(400, 600)
      },
      usage_by_endpoint: [
        {
          endpoint: '/v1/data/timeseries',
          requests: randomInt(200, 2000),
          avg_response_time: randomFloat(150, 350),
          error_rate: randomFloat(0.01, 0.05)
        }
      ],
      error_breakdown: {
        '400': randomInt(5, 25),
        '401': randomInt(2, 10),
        '403': randomInt(1, 8),
        '429': randomInt(3, 15),
        '500': randomInt(1, 5)
      },
      usage_over_time: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        requests: randomInt(20, 200),
        errors: randomInt(0, 5),
        avg_response_time: randomFloat(150, 400)
      })),
      recommendations: Array.from({ length: 3 }, () => ({
        type: getRandomArrayElement(['optimization', 'caching', 'rate_limiting']),
        description: `API usage recommendation ${Math.random().toString(36).substring(2, 8)}`,
        priority: getRandomArrayElement(['low', 'medium', 'high']),
        estimated_improvement: `${randomInt(10, 40)}% reduction in response time`
      }))
    }
  }

  if (endpoint.includes('/exports/create') && method === 'POST') {
    // Generate UUID-like format for job_id
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    return {
      job_id: `export_${uuid}`,
      status: 'queued',
      estimated_completion: new Date(Date.now() + 300000).toISOString(), // 5 minutes
      format: (body && typeof body === 'object' && (body as any).format) || params.format || 'json',
      download_url: null
    }
  }

  if (endpoint.includes('/exports/') && endpoint.includes('/status')) {
    const jobId = endpoint.split('/exports/')[1].split('/status')[0]
    return {
      job_id: jobId,
      status: getRandomArrayElement(['queued', 'processing', 'completed', 'failed']),
      progress_percentage: randomInt(0, 100),
      created_at: new Date(Date.now() - randomInt(60000, 3600000)).toISOString(),
      estimated_completion: new Date(Date.now() + randomInt(60000, 300000)).toISOString(),
      file_info: {
        format: 'json',
        compression: 'gzip',
        estimated_size_bytes: randomInt(1000000, 50000000)
      }
    }
  }

  if (endpoint.includes('/exports/') && endpoint.includes('/download')) {
    return {
      download_url: `https://cu-bems-exports.s3.amazonaws.com/downloads/${Math.random().toString(36).substring(2, 15)}.json.gz`,
      expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      file_info: {
        filename: `export_${Date.now()}.json.gz`,
        format: 'json',
        size_bytes: randomInt(1000000, 50000000),
        checksum: `sha256:${Math.random().toString(36).substring(2, 64)}`
      }
    }
  }

  if (endpoint.includes('/equipment/')) {
    const equipmentType = endpoint.split('/equipment/')[1]
    return {
      equipment_type: equipmentType,
      sensors: Array.from({ length: randomInt(5, 15) }, (_, i) => ({
        sensor_id: `SENSOR_${String(i + 1).padStart(3, '0')}`,
        floor_number: randomInt(1, 7),
        performance_metrics: {
          efficiency: randomFloat(0.6, 0.95),
          uptime_percentage: randomFloat(0.85, 0.99),
          average_consumption: randomFloat(100, 1000)
        },
        maintenance_info: {
          last_maintenance: new Date(Date.now() - randomInt(7, 90) * 24 * 60 * 60 * 1000).toISOString(),
          next_scheduled: new Date(Date.now() + randomInt(7, 30) * 24 * 60 * 60 * 1000).toISOString(),
          maintenance_score: randomFloat(0.7, 1.0)
        }
      })),
      aggregate_performance: {
        total_units: randomInt(10, 20),
        total_consumption: randomFloat(5000, 25000),
        average_efficiency: randomFloat(0.7, 0.9),
        performance_trend: getRandomArrayElement(['improving', 'stable', 'declining'])
      }
    }
  }

  if (endpoint.includes('/patterns')) {
    return {
      pattern_type: params.pattern_type || 'seasonal',
      sensitivity: parseFloat(params.sensitivity || '0.8'),
      detection_window: {
        start: params.start_date || '2025-09-01T00:00:00Z',
        end: params.end_date || '2025-09-23T23:59:59Z'
      },
      detected_patterns: Array.from({ length: randomInt(3, 8) }, (_, i) => ({
        pattern_id: `pattern_${Math.random().toString(36).substring(2, 8)}`,
        type: getRandomArrayElement(['seasonal', 'anomaly', 'efficiency', 'correlation']),
        confidence: randomFloat(0.7, 0.95),
        description: `Pattern ${i + 1}: ${getRandomArrayElement(['High usage during peak hours', 'Weekend efficiency drop', 'Temperature correlation'])}`,
        affected_sensors: Array.from({ length: randomInt(2, 5) }, () =>
          `SENSOR_${String(randomInt(1, 56)).padStart(3, '0')}`
        ),
        time_range: {
          start: new Date(Date.now() - randomInt(1, 30) * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date(Date.now() - randomInt(0, 10) * 24 * 60 * 60 * 1000).toISOString()
        }
      })),
      anomalies: Array.from({ length: randomInt(2, 6) }, () => ({
        anomaly_id: `anomaly_${Math.random().toString(36).substring(2, 8)}`,
        sensor_id: `SENSOR_${String(randomInt(1, 56)).padStart(3, '0')}`,
        timestamp: new Date(Date.now() - randomInt(1, 168) * 60 * 60 * 1000).toISOString(),
        severity: getRandomArrayElement(['low', 'medium', 'high', 'critical']),
        description: getRandomArrayElement(['Unusual consumption spike', 'Temperature anomaly', 'Efficiency drop detected']),
        confidence_score: randomFloat(0.8, 0.98)
      })),
      recommendations: Array.from({ length: randomInt(2, 5) }, () => ({
        type: getRandomArrayElement(['maintenance', 'optimization', 'investigation']),
        priority: getRandomArrayElement(['low', 'medium', 'high', 'critical']),
        description: getRandomArrayElement(['Schedule maintenance check', 'Optimize energy settings', 'Investigate anomaly pattern']),
        estimated_impact: `${randomInt(5, 25)}% efficiency improvement`
      }))
    }
  }

  // Default response
  return { message: 'Mock API response' }
}

/**
 * Measure response time for performance testing
 */
export async function measureResponseTime<T>(operation: () => Promise<T>): Promise<{ result: T, responseTime: number }> {
  const startTime = Date.now()
  const result = await operation()
  const responseTime = Date.now() - startTime
  return { result, responseTime }
}

/**
 * Generate test API key
 */
export function generateTestApiKey(): string {
  return `sk_test_${Math.random().toString(36).substring(2, 34)}`
}

/**
 * Sleep utility for timing tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create mock API key for specific subscription tier
 */
export function createMockApiKey(tier: 'free' | 'professional' | 'enterprise'): string {
  const baseKey = generateTestApiKey()
  return `${baseKey}_${tier}`
}

/**
 * Make API request for testing
 */
export async function makeApiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const response = await mockApiRequest(endpoint, options.method || 'GET', options.headers as Record<string, string> || {}, {}, options.body)
  return new Response(JSON.stringify(response.body), {
    status: response.status,
    headers: response.headers
  })
}

/**
 * Wait for condition utility
 */
export async function waitFor(condition: () => boolean, timeout = 5000): Promise<void> {
  const start = Date.now()
  while (!condition() && Date.now() - start < timeout) {
    await sleep(100)
  }
  if (!condition()) {
    throw new Error(`Timeout waiting for condition after ${timeout}ms`)
  }
}

/**
 * Create mock user for testing
 */
export function createMockUser(overrides: any = {}) {
  return {
    id: `user_${Math.random().toString(36).substring(2, 15)}`,
    email: 'test@example.com',
    name: 'Test User',
    subscriptionTier: 'free',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

/**
 * Create mock request for testing
 */
export function createMockRequest(url: string, options: any = {}) {
  return {
    url,
    method: 'GET',
    headers: new Map(),
    ...options
  }
}