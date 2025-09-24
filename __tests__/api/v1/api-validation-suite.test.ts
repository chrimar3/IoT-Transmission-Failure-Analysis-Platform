/**
 * Story 4.2: Professional API Access - API Validation Test Suite
 * Comprehensive validation testing for all v1 API endpoints
 */

import { describe, test, expect, beforeAll, afterAll, _beforeEach } from '@jest/globals'
import {
  ApiKeyTestFactory,
  UserTestFactory,
  BangkokDataFactory,
  _WebhookTestFactory,
  _ApiUsageTestFactory
} from '../../utils/api-test-factory'
import { mockApiRequest, createTestEnvironment, cleanupTestEnvironment } from '../../utils/test-helpers'

describe('Professional API v1 Validation Suite - Story 4.2', () => {
  let testEnvironment: unknown
  let _professionalUser: unknown
  let professionalApiKey: string
  let _freeUser: unknown
  let freeApiKey: string
  let _bangkokDataset: unknown

  beforeAll(async () => {
    // Set up comprehensive test environment
    testEnvironment = await createTestEnvironment()

    // Create test users and API keys
    _professionalUser = UserTestFactory.createUser({ subscription_tier: 'professional' })
    professionalApiKey = ApiKeyTestFactory.generateApiKey()

    _freeUser = UserTestFactory.createUser({ subscription_tier: 'free' })
    freeApiKey = ApiKeyTestFactory.generateApiKey()

    // Generate Bangkok dataset for testing
    _bangkokDataset = BangkokDataFactory.generateFullBangkokDataset()
  })

  afterAll(async () => {
    await cleanupTestEnvironment(testEnvironment)
  })

  describe('AC2: Comprehensive Data Export APIs', () => {
    describe('Time-Series Data API (/v1/data/timeseries)', () => {
      test('returns valid time-series data with proper structure', async () => {
        const response = await mockApiRequest('/v1/data/timeseries', professionalApiKey, {
          method: 'GET',
          params: {
            sensor_ids: 'SENSOR_001,SENSOR_002,SENSOR_003',
            start_date: '2024-09-01T00:00:00Z',
            end_date: '2024-09-23T23:59:59Z',
            interval: 'hour',
            max_points: 1000
          }
        })

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          success: true,
          data: {
            series: expect.arrayContaining([
              expect.objectContaining({
                sensor_id: expect.stringMatching(/^SENSOR_\d+$/),
                equipment_type: expect.stringMatching(/^(HVAC|Lighting|Power|Water|Security)$/),
                floor_number: expect.any(Number),
                unit: expect.any(String),
                color: expect.stringMatching(/^#[0-9A-F]{6}$/i),
                data: expect.arrayContaining([
                  expect.objectContaining({
                    timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
                    value: expect.any(Number),
                    sensor_id: expect.any(String),
                    status: expect.stringMatching(/^(normal|warning|error)$/)
                  })
                ])
              })
            ]),
            metadata: expect.objectContaining({
              total_points: expect.any(Number),
              decimated: expect.any(Boolean),
              query_time_ms: expect.any(Number),
              cache_hit: expect.any(Boolean)
            })
          },
          meta: expect.objectContaining({
            request_id: expect.any(String),
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
            processing_time_ms: expect.any(Number),
            rate_limit: expect.objectContaining({
              remaining: expect.any(Number),
              reset_at: expect.any(String),
              limit: expect.any(Number)
            })
          })
        })

        // Validate response performance
        expect(response.body.meta.processing_time_ms).toBeLessThan(500)
        expect(response.body.data.metadata.query_time_ms).toBeLessThan(500)
      })

      test('supports flexible date range filtering', async () => {
        const testCases = [
          {
            name: 'single day',
            start: '2024-09-23T00:00:00Z',
            end: '2024-09-23T23:59:59Z'
          },
          {
            name: 'one week',
            start: '2024-09-17T00:00:00Z',
            end: '2024-09-23T23:59:59Z'
          },
          {
            name: 'one month',
            start: '2024-08-23T00:00:00Z',
            end: '2024-09-23T23:59:59Z'
          }
        ]

        for (const testCase of testCases) {
          const response = await mockApiRequest('/v1/data/timeseries', professionalApiKey, {
            params: {
              sensor_ids: 'SENSOR_001',
              start_date: testCase.start,
              end_date: testCase.end,
              interval: 'hour'
            }
          })

          expect(response.status).toBe(200)
          expect(response.body.success).toBe(true)

          // Validate date range compliance
          const series = response.body.data.series[0]
          if (series && series.data.length > 0) {
            const firstTimestamp = new Date(series.data[0].timestamp)
            const lastTimestamp = new Date(series.data[series.data.length - 1].timestamp)
            const startDate = new Date(testCase.start)
            const endDate = new Date(testCase.end)

            expect(firstTimestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
            expect(lastTimestamp.getTime()).toBeLessThanOrEqual(endDate.getTime())
          }
        }
      })

      test('handles floor-specific and equipment-specific filtering', async () => {
        // Test floor-specific filtering
        const floorResponse = await mockApiRequest('/v1/data/timeseries', professionalApiKey, {
          params: {
            sensor_ids: 'SENSOR_001,SENSOR_002,SENSOR_003',
            floor_numbers: '1,2',
            start_date: '2024-09-23T00:00:00Z',
            end_date: '2024-09-23T23:59:59Z'
          }
        })

        expect(floorResponse.status).toBe(200)
        expect(floorResponse.body.data.series.every((s: unknown) => [1, 2].includes(s.floor_number))).toBe(true)

        // Test equipment-specific filtering
        const equipmentResponse = await mockApiRequest('/v1/data/timeseries', professionalApiKey, {
          params: {
            sensor_ids: 'SENSOR_001,SENSOR_002,SENSOR_003',
            equipment_types: 'HVAC,Power',
            start_date: '2024-09-23T00:00:00Z',
            end_date: '2024-09-23T23:59:59Z'
          }
        })

        expect(equipmentResponse.status).toBe(200)
        expect(equipmentResponse.body.data.series.every((s: unknown) => ['HVAC', 'Power'].includes(s.equipment_type))).toBe(true)
      })

      test('implements proper data decimation for large datasets', async () => {
        const response = await mockApiRequest('/v1/data/timeseries', professionalApiKey, {
          params: {
            sensor_ids: 'SENSOR_001,SENSOR_002,SENSOR_003,SENSOR_004,SENSOR_005',
            start_date: '2024-01-01T00:00:00Z',
            end_date: '2024-09-23T23:59:59Z',
            interval: 'minute',
            max_points: 500
          }
        })

        expect(response.status).toBe(200)
        expect(response.body.data.metadata.total_points).toBeLessThanOrEqual(500)
        expect(response.body.data.metadata.decimated).toBe(true)
      })

      test('validates query parameter constraints', async () => {
        const invalidCases = [
          {
            name: 'invalid sensor ID format',
            params: { sensor_ids: 'INVALID_SENSOR_123@!' }
          },
          {
            name: 'invalid date format',
            params: {
              sensor_ids: 'SENSOR_001',
              start_date: '2024-13-45T25:70:80Z'
            }
          },
          {
            name: 'end date before start date',
            params: {
              sensor_ids: 'SENSOR_001',
              start_date: '2024-09-23T00:00:00Z',
              end_date: '2024-09-22T00:00:00Z'
            }
          },
          {
            name: 'max_points exceeds limit',
            params: {
              sensor_ids: 'SENSOR_001',
              max_points: 50000
            }
          },
          {
            name: 'invalid interval',
            params: {
              sensor_ids: 'SENSOR_001',
              interval: 'invalid_interval'
            }
          }
        ]

        for (const testCase of invalidCases) {
          const response = await mockApiRequest('/v1/data/timeseries', professionalApiKey, {
            params: testCase.params
          })

          expect(response.status).toBe(400)
          expect(response.body.success).toBe(false)
          expect(response.body.error).toContain('validation')
        }
      })
    })

    describe('Data Summary API (/v1/data/summary)', () => {
      test('returns statistical summaries and aggregations', async () => {
        const response = await mockApiRequest('/v1/data/summary', professionalApiKey, {
          params: {
            start_date: '2024-09-01T00:00:00Z',
            end_date: '2024-09-23T23:59:59Z',
            equipment_type: 'HVAC',
            include_statistics: 'true'
          }
        })

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          success: true,
          data: {
            summary: expect.objectContaining({
              equipment_type: 'HVAC',
              total_sensors: expect.any(Number),
              data_period: expect.objectContaining({
                start: expect.any(String),
                end: expect.any(String)
              }),
              aggregated_metrics: expect.objectContaining({
                total_consumption: expect.any(Number),
                average_consumption: expect.any(Number),
                peak_consumption: expect.any(Number),
                efficiency_score: expect.any(Number)
              })
            }),
            statistics: expect.objectContaining({
              mean: expect.any(Number),
              median: expect.any(Number),
              std_deviation: expect.any(Number),
              percentiles: expect.objectContaining({
                p25: expect.any(Number),
                p50: expect.any(Number),
                p75: expect.any(Number),
                p95: expect.any(Number),
                p99: expect.any(Number)
              })
            }),
            breakdown_by_floor: expect.any(Array),
            time_based_aggregations: expect.objectContaining({
              hourly_averages: expect.any(Array),
              daily_totals: expect.any(Array),
              weekly_patterns: expect.any(Array)
            })
          }
        })
      })

      test('handles all equipment types correctly', async () => {
        const equipmentTypes = ['HVAC', 'Lighting', 'Power', 'Water', 'Security']

        for (const equipmentType of equipmentTypes) {
          const response = await mockApiRequest('/v1/data/summary', professionalApiKey, {
            params: {
              equipment_type: equipmentType,
              start_date: '2024-09-23T00:00:00Z',
              end_date: '2024-09-23T23:59:59Z'
            }
          })

          expect(response.status).toBe(200)
          expect(response.body.data.summary.equipment_type).toBe(equipmentType)
        }
      })
    })

    describe('Analytics API (/v1/data/analytics)', () => {
      test('returns pre-computed analytical insights', async () => {
        const response = await mockApiRequest('/v1/data/analytics', professionalApiKey, {
          params: {
            analysis_type: 'efficiency_metrics',
            confidence_level: '0.95',
            include_patterns: 'true'
          }
        })

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          success: true,
          data: {
            analysis_type: 'efficiency_metrics',
            confidence_level: 0.95,
            insights: expect.objectContaining({
              efficiency_scores: expect.any(Array),
              trend_analysis: expect.objectContaining({
                overall_trend: expect.stringMatching(/^(increasing|decreasing|stable)$/),
                trend_confidence: expect.any(Number),
                seasonal_patterns: expect.any(Array)
              }),
              anomalies: expect.arrayContaining([
                expect.objectContaining({
                  sensor_id: expect.any(String),
                  timestamp: expect.any(String),
                  severity: expect.stringMatching(/^(low|medium|high|critical)$/),
                  description: expect.any(String)
                })
              ])
            }),
            confidence_intervals: expect.objectContaining({
              mean_efficiency: expect.objectContaining({
                lower: expect.any(Number),
                upper: expect.any(Number),
                confidence: 0.95
              }),
              predictions: expect.any(Array)
            })
          }
        })
      })

      test('supports different analysis types', async () => {
        const analysisTypes = [
          'anomaly_detection',
          'trend_analysis',
          'correlation_analysis',
          'efficiency_metrics'
        ]

        for (const analysisType of analysisTypes) {
          const response = await mockApiRequest('/v1/data/analytics', professionalApiKey, {
            params: { analysis_type: analysisType }
          })

          expect(response.status).toBe(200)
          expect(response.body.data.analysis_type).toBe(analysisType)
        }
      })
    })

    describe('Floor-Specific Data API (/v1/data/floors/{id})', () => {
      test('returns comprehensive floor data and analytics', async () => {
        const floorId = 1
        const response = await mockApiRequest(`/v1/data/floors/${floorId}`, professionalApiKey)

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          success: true,
          data: {
            floor_number: floorId,
            equipment: expect.arrayContaining([
              expect.objectContaining({
                sensor_id: expect.any(String),
                equipment_type: expect.any(String),
                current_status: expect.stringMatching(/^(normal|warning|error)$/),
                last_reading: expect.objectContaining({
                  timestamp: expect.any(String),
                  value: expect.any(Number),
                  unit: expect.any(String)
                })
              })
            ]),
            summary_metrics: expect.objectContaining({
              total_consumption: expect.any(Number),
              efficiency_score: expect.any(Number),
              active_sensors: expect.any(Number),
              alert_count: expect.any(Number)
            }),
            layout_info: expect.objectContaining({
              total_area: expect.any(Number),
              zones: expect.any(Array),
              sensor_positions: expect.any(Array)
            })
          }
        })
      })

      test('handles invalid floor numbers gracefully', async () => {
        const invalidFloors = [0, 99, -1, 'invalid']

        for (const floorId of invalidFloors) {
          const response = await mockApiRequest(`/v1/data/floors/${floorId}`, professionalApiKey)

          expect(response.status).toBe(404)
          expect(response.body.success).toBe(false)
          expect(response.body.error).toContain('Floor not found')
        }
      })
    })

    describe('Equipment-Specific API (/v1/data/equipment/{type})', () => {
      test('returns equipment-specific performance data', async () => {
        const equipmentType = 'HVAC'
        const response = await mockApiRequest(`/v1/data/equipment/${equipmentType}`, professionalApiKey)

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          success: true,
          data: {
            equipment_type: equipmentType,
            sensors: expect.arrayContaining([
              expect.objectContaining({
                sensor_id: expect.any(String),
                floor_number: expect.any(Number),
                performance_metrics: expect.objectContaining({
                  efficiency: expect.any(Number),
                  uptime_percentage: expect.any(Number),
                  average_consumption: expect.any(Number)
                }),
                maintenance_info: expect.objectContaining({
                  last_maintenance: expect.any(String),
                  next_scheduled: expect.any(String),
                  maintenance_score: expect.any(Number)
                })
              })
            ]),
            aggregate_performance: expect.objectContaining({
              total_units: expect.any(Number),
              average_efficiency: expect.any(Number),
              total_consumption: expect.any(Number),
              performance_trend: expect.stringMatching(/^(improving|stable|declining)$/)
            })
          }
        })
      })
    })

    describe('Patterns API (/v1/data/patterns)', () => {
      test('returns pattern analysis and anomaly detection', async () => {
        const response = await mockApiRequest('/v1/data/patterns', professionalApiKey, {
          params: {
            pattern_type: 'seasonal',
            sensitivity: '0.8'
          }
        })

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          success: true,
          data: {
            pattern_type: 'seasonal',
            sensitivity: 0.8,
            detected_patterns: expect.arrayContaining([
              expect.objectContaining({
                pattern_id: expect.any(String),
                type: expect.stringMatching(/^(seasonal|anomaly|efficiency|correlation)$/),
                confidence: expect.any(Number),
                description: expect.any(String),
                affected_sensors: expect.any(Array),
                time_range: expect.objectContaining({
                  start: expect.any(String),
                  end: expect.any(String)
                })
              })
            ]),
            anomalies: expect.any(Array),
            recommendations: expect.arrayContaining([
              expect.objectContaining({
                type: expect.any(String),
                priority: expect.stringMatching(/^(low|medium|high|critical)$/),
                description: expect.any(String),
                estimated_impact: expect.any(String)
              })
            ])
          }
        })
      })
    })
  })

  describe('AC5: Data Format and Export Options', () => {
    describe('Export Creation API (/v1/exports/create)', () => {
      test('creates export jobs for different formats', async () => {
        const formats = ['json', 'csv', 'excel', 'xml']

        for (const format of formats) {
          const response = await mockApiRequest('/v1/exports/create', professionalApiKey, {
            method: 'POST',
            body: {
              format,
              data_type: 'timeseries',
              sensors: ['SENSOR_001', 'SENSOR_002'],
              date_range: {
                start: '2024-09-01T00:00:00Z',
                end: '2024-09-23T23:59:59Z'
              },
              compression: true,
              include_metadata: true
            }
          })

          expect(response.status).toBe(202) // Accepted for async processing
          expect(response.body).toMatchObject({
            success: true,
            job_id: expect.stringMatching(/^export_[a-f0-9\-]{36}$/),
            status: 'queued',
            estimated_completion: expect.any(String),
            format,
            download_url: null // Will be available when complete
          })
        }
      })

      test('supports comprehensive export options', async () => {
        const response = await mockApiRequest('/v1/exports/create', professionalApiKey, {
          method: 'POST',
          body: {
            format: 'csv',
            data_type: 'timeseries',
            sensors: ['SENSOR_001', 'SENSOR_002', 'SENSOR_003'],
            date_range: {
              start: '2024-09-01T00:00:00Z',
              end: '2024-09-23T23:59:59Z'
            },
            options: {
              compression: 'gzip',
              include_metadata: true,
              field_selection: ['timestamp', 'value', 'sensor_id', 'status'],
              custom_headers: true,
              timezone: 'Asia/Bangkok'
            },
            filters: {
              equipment_types: ['HVAC', 'Power'],
              floor_numbers: [1, 2, 3],
              status_filter: ['normal', 'warning']
            }
          }
        })

        expect(response.status).toBe(202)
        expect(response.body.job_id).toBeDefined()
      })
    })

    describe('Export Status API (/v1/exports/{id}/status)', () => {
      test('provides export job status and progress', async () => {
        // First create an export job
        const createResponse = await mockApiRequest('/v1/exports/create', professionalApiKey, {
          method: 'POST',
          body: {
            format: 'json',
            data_type: 'timeseries',
            sensors: ['SENSOR_001']
          }
        })

        const jobId = createResponse.body.job_id

        // Check status
        const statusResponse = await mockApiRequest(`/v1/exports/${jobId}/status`, professionalApiKey)

        expect(statusResponse.status).toBe(200)
        expect(statusResponse.body).toMatchObject({
          success: true,
          job_id: jobId,
          status: expect.stringMatching(/^(queued|processing|completed|failed)$/),
          progress_percentage: expect.any(Number),
          created_at: expect.any(String),
          estimated_completion: expect.any(String),
          file_info: expect.objectContaining({
            format: 'json',
            estimated_size_bytes: expect.any(Number),
            compression: expect.any(String)
          })
        })
      })
    })

    describe('Export Download API (/v1/exports/{id}/download)', () => {
      test('provides secure download links for completed exports', async () => {
        // Mock completed export job
        const jobId = 'export_completed_12345'

        const response = await mockApiRequest(`/v1/exports/${jobId}/download`, professionalApiKey)

        if (response.status === 200) {
          expect(response.body).toMatchObject({
            success: true,
            download_url: expect.stringMatching(/^https:\/\//),
            expires_at: expect.any(String),
            file_info: expect.objectContaining({
              filename: expect.any(String),
              size_bytes: expect.any(Number),
              format: expect.any(String),
              checksum: expect.any(String)
            })
          })
        } else if (response.status === 202) {
          expect(response.body.message).toContain('still processing')
        }
      })
    })
  })

  describe('AC8: API Analytics and Monitoring', () => {
    describe('Usage Analytics API (/v1/usage)', () => {
      test('returns comprehensive API usage analytics', async () => {
        const response = await mockApiRequest('/v1/usage', professionalApiKey, {
          params: {
            timeframe: '7_days',
            group_by: 'endpoint'
          }
        })

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          success: true,
          data: {
            timeframe: '7_days',
            summary: expect.objectContaining({
              total_requests: expect.any(Number),
              successful_requests: expect.any(Number),
              error_requests: expect.any(Number),
              average_response_time: expect.any(Number),
              p95_response_time: expect.any(Number)
            }),
            usage_by_endpoint: expect.arrayContaining([
              expect.objectContaining({
                endpoint: expect.any(String),
                requests: expect.any(Number),
                avg_response_time: expect.any(Number),
                error_rate: expect.any(Number)
              })
            ]),
            usage_over_time: expect.any(Array),
            error_breakdown: expect.objectContaining({
              '400': expect.any(Number),
              '401': expect.any(Number),
              '403': expect.any(Number),
              '429': expect.any(Number),
              '500': expect.any(Number)
            }),
            recommendations: expect.any(Array)
          }
        })
      })

      test('supports different timeframes and groupings', async () => {
        const testCases = [
          { timeframe: '24_hours', group_by: 'hour' },
          { timeframe: '7_days', group_by: 'day' },
          { timeframe: '30_days', group_by: 'week' },
          { timeframe: '3_months', group_by: 'month' }
        ]

        for (const testCase of testCases) {
          const response = await mockApiRequest('/v1/usage', professionalApiKey, {
            params: testCase
          })

          expect(response.status).toBe(200)
          expect(response.body.data.timeframe).toBe(testCase.timeframe)
        }
      })
    })
  })

  describe('API Error Handling and Edge Cases', () => {
    test('handles authentication errors properly', async () => {
      const invalidKeys = [
        '',
        'invalid_key',
        'sk_invalid_format',
        'expired_key_12345'
      ]

      for (const invalidKey of invalidKeys) {
        const response = await mockApiRequest('/v1/data/timeseries', invalidKey)

        expect(response.status).toBe(401)
        expect(response.body).toMatchObject({
          success: false,
          error: 'Authentication failed',
          message: expect.any(String),
          error_code: 'INVALID_API_KEY'
        })
      }
    })

    test('enforces tier-based access control', async () => {
      const restrictedEndpoints = [
        '/v1/data/analytics',
        '/v1/exports/create',
        '/v1/usage'
      ]

      for (const endpoint of restrictedEndpoints) {
        const response = await mockApiRequest(endpoint, freeApiKey)

        expect(response.status).toBe(403)
        expect(response.body).toMatchObject({
          success: false,
          error: 'Access denied',
          message: expect.stringContaining('Professional'),
          upgrade_url: expect.stringMatching(/^https:\/\//)
        })
      }
    })

    test('handles rate limiting gracefully', async () => {
      // Mock rate limit exceeded scenario
      const response = await mockApiRequest('/v1/data/timeseries', professionalApiKey, {
        headers: { 'X-Test-Scenario': 'rate-limit-exceeded' }
      })

      if (response.status === 429) {
        expect(response.body).toMatchObject({
          success: false,
          error: 'Rate limit exceeded',
          message: expect.any(String),
          retry_after: expect.any(Number),
          rate_limit_info: expect.objectContaining({
            limit: expect.any(Number),
            window: expect.any(String),
            reset_time: expect.any(String)
          })
        })

        expect(response.headers['retry-after']).toBeDefined()
        expect(response.headers['x-ratelimit-limit']).toBeDefined()
        expect(response.headers['x-ratelimit-remaining']).toBe('0')
      }
    })

    test('validates request size limits', async () => {
      const oversizedPayload = {
        sensors: Array.from({ length: 1000 }, (_, i) => `SENSOR_${i.toString().padStart(3, '0')}`),
        date_range: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z'
        },
        metadata: 'x'.repeat(10 * 1024 * 1024) // 10MB of metadata
      }

      const response = await mockApiRequest('/v1/exports/create', professionalApiKey, {
        method: 'POST',
        body: oversizedPayload
      })

      expect(response.status).toBe(413) // Payload Too Large
      expect(response.body.error).toContain('request too large')
    })

    test('provides helpful error messages for malformed requests', async () => {
      const malformedRequests = [
        {
          endpoint: '/v1/data/timeseries',
          params: { sensor_ids: null }
        },
        {
          endpoint: '/v1/exports/create',
          method: 'POST',
          body: { format: 'invalid_format' }
        }
      ]

      for (const request of malformedRequests) {
        const response = await mockApiRequest(
          request.endpoint,
          professionalApiKey,
          request
        )

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          success: false,
          error: expect.any(String),
          validation_errors: expect.any(Array),
          suggestions: expect.any(Array)
        })
      }
    })
  })

  describe('API Performance Validation', () => {
    test('meets response time requirements', async () => {
      const performanceTests = [
        { endpoint: '/v1/data/timeseries', maxTime: 500 },
        { endpoint: '/v1/data/summary', maxTime: 300 },
        { endpoint: '/v1/data/analytics', maxTime: 800 },
        { endpoint: '/v1/usage', maxTime: 300 }
      ]

      for (const test of performanceTests) {
        const startTime = Date.now()
        const response = await mockApiRequest(test.endpoint, professionalApiKey)
        const responseTime = Date.now() - startTime

        expect(response.status).toBe(200)
        expect(responseTime).toBeLessThan(test.maxTime)
        expect(response.body.meta.processing_time_ms).toBeLessThan(test.maxTime)
      }
    })

    test('includes proper caching headers', async () => {
      const response = await mockApiRequest('/v1/data/timeseries', professionalApiKey)

      expect(response.headers['cache-control']).toBeDefined()
      expect(response.headers['etag']).toBeDefined()
      expect(response.headers['x-response-time']).toMatch(/^\d+ms$/)
    })
  })
})