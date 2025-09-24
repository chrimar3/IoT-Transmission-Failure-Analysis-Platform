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

  // Simulate authentication check
  if (!apiKey || !apiKey.startsWith('sk_')) {
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

  // Check for test scenarios
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
        retry_after: 3600
      }
    }
  }

  // Generate realistic mock data based on endpoint
  const responseData = generateMockApiData(endpoint, params, method)

  return {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'x-ratelimit-limit': '10000',
      'x-ratelimit-remaining': '9999',
      'x-ratelimit-reset': new Date(Date.now() + 3600000).toISOString(),
      'x-response-time': `${randomInt(50, 500)}ms`,
      'cache-control': 'public, max-age=300',
      'etag': `"${Math.random().toString(36).substring(2, 10)}"`
    },
    body: {
      success: true,
      data: responseData,
      meta: {
        request_id: `req_${Math.random().toString(36).substring(2, 14)}`,
        timestamp: new Date().toISOString(),
        processing_time_ms: randomInt(50, 500),
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
function generateMockApiData(endpoint: string, params: Record<string, any>, method: string): unknown {
  if (endpoint.includes('/timeseries')) {
    return {
      series: [
        {
          sensor_id: params.sensor_ids?.split(',')[0] || 'SENSOR_001',
          equipment_type: getRandomArrayElement(['HVAC', 'Lighting', 'Power', 'Water', 'Security']),
          floor_number: Math.floor(Math.random() * 7) + 1,
          unit: 'kWh',
          color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
          data: Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(Date.now() + i * 3600000).toISOString(),
            value: Math.round((Math.random() * 900 + 100) * 10) / 10,
            sensor_id: params.sensor_ids?.split(',')[0] || 'SENSOR_001',
            status: getRandomArrayElement(['normal', 'warning', 'error'])
          }))
        }
      ],
      metadata: {
        total_points: 24,
        decimated: false,
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
          start: params.start_date || '2024-09-01T00:00:00Z',
          end: params.end_date || '2024-09-23T23:59:59Z'
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
      }
    }
  }

  if (endpoint.includes('/analytics')) {
    return {
      analysis_type: params.analysis_type || 'efficiency_metrics',
      confidence_level: params.confidence_level || 0.95,
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
        }
      }
    }
  }

  if (endpoint.includes('/floors/')) {
    const floorId = endpoint.split('/floors/')[1]
    return {
      floor_number: parseInt(floorId),
      equipment: Array.from({ length: 8 }, (_, i) => ({
        sensor_id: `SENSOR_${floorId.padStart(2, '0')}${String(i + 1).padStart(2, '0')}`,
        equipment_type: getRandomArrayElement(['HVAC', 'Lighting', 'Power', 'Water', 'Security']),
        current_status: getRandomArrayElement(['normal', 'warning', 'error']),
        last_reading: {
          timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          value: randomFloat(100, 1000),
          unit: 'kWh'
        }
      })),
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
      ]
    }
  }

  if (endpoint.includes('/exports/create') && method === 'POST') {
    return {
      job_id: `export_${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`,
      status: 'queued',
      estimated_completion: new Date(Date.now() + 300000).toISOString(), // 5 minutes
      format: params.format || 'json',
      download_url: null
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