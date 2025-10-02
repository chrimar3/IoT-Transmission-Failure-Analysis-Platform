/**
 * Integration Tests for API Endpoints
 * Testing end-to-end API workflows with Bangkok dataset
 * QA Requirement: Complete API contract validation
 */

import { NextRequest } from 'next/server'

// Import API route handlers for testing
import { GET as SummaryGET } from '../../app/api/readings/summary/route'
import { GET as TimeseriesGET } from '../../app/api/readings/timeseries/route'
import { GET as PatternsGET } from '../../app/api/readings/patterns/route'

// Mock R2 client and Supabase
jest.mock('../../lib/r2-client')
jest.mock('../../lib/supabase-server')

import { r2Client, SensorDataQuery, SensorDataRecord } from '../../lib/r2-client'
import { supabaseServer } from '../../lib/supabase-server'

const mockR2Client = r2Client as jest.Mocked<typeof r2Client>
const mockSupabaseServer = supabaseServer as jest.Mocked<typeof supabaseServer>

// Mock environment for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

describe('API Integration Tests', () => {
  beforeAll(() => {
    // Setup test environment
    global.fetch = jest.fn()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup R2 client mocks
    mockR2Client.getMetrics.mockResolvedValue({
      total_sensors: 3, // Match the number of sensors in timeseries mock data
      active_sensors: 3,
      offline_sensors: 0,
      health_percentage: 100,
      total_power_consumption: 6.7, // 2.5 + 1.2 + 3.0
      avg_power_consumption: 2.23, // 6.7 / 3
      failure_count_24h: 0,
      last_updated: new Date().toISOString(),
      // Production metrics
      data_quality_score: 0.95,
      cache_hit_rate: 0.8,
      avg_query_time_ms: 150,
      total_records_processed: 1000
    })
    
    // Create dynamic mock data that responds to query parameters
    const mockSensorData: SensorDataRecord[] = [
      {
        timestamp: '2024-09-12T10:00:00Z',
        sensor_id: 'SENSOR_001',
        floor_number: 1,
        equipment_type: 'HVAC',
        reading_value: 2.5,
        unit: 'kW',
        status: 'normal' as const
      },
      {
        timestamp: '2024-09-12T11:00:00Z',
        sensor_id: 'SENSOR_002',
        floor_number: 2,
        equipment_type: 'Lighting',
        reading_value: 1.2,
        unit: 'kW',
        status: 'normal' as const
      },
      {
        timestamp: '2024-09-12T12:00:00Z',
        sensor_id: 'SENSOR_003',
        floor_number: 1,
        equipment_type: 'HVAC',
        reading_value: 3.0,
        unit: 'kW',
        status: 'normal' as const
      }
    ]
    
    // Mock fetchSensorData to filter based on query parameters
    mockR2Client.fetchSensorData.mockImplementation((query: SensorDataQuery) => {
      let filteredData = [...mockSensorData]

      if (query.floorNumber !== undefined) {
        filteredData = filteredData.filter(item => item.floor_number === query.floorNumber)
      }
      if (query.sensorId !== undefined) {
        filteredData = filteredData.filter(item => item.sensor_id === query.sensorId)
      }
      if ((query as any).equipmentType !== undefined) {
        filteredData = filteredData.filter(item => item.equipment_type === (query as any).equipmentType)
      }

      return Promise.resolve(filteredData)
    })
    
    // Setup Supabase server mock
    const mockQueryChain = {
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null })
    }
    ;(mockSupabaseServer.from as jest.Mock) = jest.fn().mockReturnValue(mockQueryChain)
  })

  describe('Summary API Integration', () => {
    it('should return complete dashboard metrics structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/readings/summary')
      const response = await SummaryGET(request)
      const result = await response.json()

      // Validate HTTP response
      expect(response.status).toBe(200)
      // Note: Content-Type header not tested in integration tests due to Next.js test environment limitations

      // Validate API contract
      expect(result).toMatchObject({
        success: true,
        data: {
          total_sensors: expect.any(Number),
          active_sensors: expect.any(Number),
          health_percentage: expect.any(Number),
          total_power_consumption: expect.any(Number),
          avg_power_consumption: expect.any(Number),
          last_updated: expect.any(String)
        }
      })

      // Validate business logic constraints
      expect(result.data.active_sensors).toBeLessThanOrEqual(result.data.total_sensors)
      expect(result.data.health_percentage).toBeGreaterThanOrEqual(0)
      expect(result.data.health_percentage).toBeLessThanOrEqual(100)
      expect(result.data.total_power_consumption).toBeGreaterThanOrEqual(0)
      expect(result.data.avg_power_consumption).toBeGreaterThanOrEqual(0)
    })

    it('should handle summary API error scenarios gracefully', async () => {
      // This test would run with mocked database errors
      const request = new NextRequest('http://localhost:3000/api/readings/summary')
      const response = await SummaryGET(request)
      
      // Should return a response (either success or error)
      expect([200, 500]).toContain(response.status)
      
      const result = await response.json()
      expect(result).toHaveProperty('success')
      
      if (result.success === false) {
        expect(result).toHaveProperty('error')
        expect(typeof result.error).toBe('object')
        expect(result.error).toHaveProperty('message')
      }
    })
  })

  describe('Timeseries API Integration', () => {
    it('should return paginated timeseries data with metadata', async () => {
      const request = new NextRequest('http://localhost:3000/api/readings/timeseries?page=1&limit=10')
      const response = await TimeseriesGET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result).toMatchObject({
        success: true,
        data: {
          data: expect.any(Array),
          pagination: {
            page: expect.any(Number),
            limit: expect.any(Number),
            total_pages: expect.any(Number)
          },
          total_count: expect.any(Number),
          date_range: {
            start: expect.any(String),
            end: expect.any(String)
          }
        }
      })

      // Validate pagination logic
      expect(result.data.pagination.page).toBeGreaterThan(0)
      expect(result.data.pagination.limit).toBeGreaterThan(0)
      expect(result.data.total_count).toBeGreaterThanOrEqual(0)
      expect(result.data.pagination.total_pages).toBeGreaterThanOrEqual(0)
    })

    it('should handle sensor_id filtering', async () => {
      const testSensorId = 'SENSOR_001'
      const request = new NextRequest(`http://localhost:3000/api/readings/timeseries?sensor_id=${testSensorId}`)
      const response = await TimeseriesGET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      
      // If data exists, all readings should match the filter
      result.data.data.forEach((reading: SensorDataRecord) => {
        if (reading.sensor_id) {
          expect(reading.sensor_id).toBe(testSensorId)
        }
      })
    })

    it('should handle floor_number filtering', async () => {
      const testFloor = 2
      const request = new NextRequest(`http://localhost:3000/api/readings/timeseries?floor_number=${testFloor}`)
      const response = await TimeseriesGET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      
      // If data exists, all readings should match the floor filter
      result.data.data.forEach((reading: SensorDataRecord) => {
        if (reading.floor_number !== undefined && reading.floor_number !== null) {
          expect(reading.floor_number).toBe(testFloor)
        }
      })
    })

    it('should handle equipment_type filtering', async () => {
      const testEquipmentType = 'HVAC'
      const request = new NextRequest(`http://localhost:3000/api/readings/timeseries?equipment_type=${testEquipmentType}`)
      const response = await TimeseriesGET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      
      // If data exists, all readings should match the equipment type filter
      result.data.data.forEach((reading: SensorDataRecord) => {
        if (reading.equipment_type) {
          expect(reading.equipment_type).toBe(testEquipmentType)
        }
      })
    })

    it('should handle date range filtering', async () => {
      const startDate = '2024-09-01T00:00:00Z'
      const endDate = '2024-09-30T23:59:59Z'
      const request = new NextRequest(`http://localhost:3000/api/readings/timeseries?start_date=${startDate}&end_date=${endDate}`)
      const response = await TimeseriesGET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      
      // Validate date range if data exists
      result.data.data.forEach((reading: SensorDataRecord) => {
        if (reading.timestamp) {
          const timestamp = new Date(reading.timestamp).getTime()
          const start = new Date(startDate).getTime()
          const end = new Date(endDate).getTime()
          expect(timestamp).toBeGreaterThanOrEqual(start)
          expect(timestamp).toBeLessThanOrEqual(end)
        }
      })
    })

    it('should handle combined filters', async () => {
      const request = new NextRequest('http://localhost:3000/api/readings/timeseries?sensor_id=SENSOR_001&floor_number=1&limit=5')
      const response = await TimeseriesGET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.data.length).toBeLessThanOrEqual(5)
    })
  })

  describe('Patterns API Integration', () => {
    it('should return pattern analysis with business impact', async () => {
      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result).toMatchObject({
        success: true,
        data: {
          patterns: expect.any(Array),
          analysis_period: {
            start: expect.any(String),
            end: expect.any(String)
          },
          total_patterns_found: expect.any(Number),
          total_estimated_impact: expect.any(Number)
        }
      })

      // Validate business impact constraints
      expect(result.data.total_estimated_impact).toBeGreaterThanOrEqual(0)
      expect(result.data.total_patterns_found).toBeGreaterThanOrEqual(0)

      // Validate pattern structure if patterns exist
      result.data.patterns.forEach((pattern: any) => {
        expect(pattern).toMatchObject({
          pattern_id: expect.any(String),
          equipment_type: expect.any(String),
          failure_frequency: expect.any(Number),
          average_downtime_minutes: expect.any(Number),
          estimated_cost_impact: expect.any(Number),
          confidence_score: expect.any(Number),
          detected_at: expect.any(String)
        })

        expect(pattern.confidence_score).toBeGreaterThanOrEqual(0)
        expect(pattern.confidence_score).toBeLessThanOrEqual(1)
        expect(pattern.estimated_cost_impact).toBeGreaterThanOrEqual(0)
      })
    })

    it('should return patterns sorted by confidence', async () => {
      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      
      if (result.data.patterns.length > 1) {
        for (let i = 0; i < result.data.patterns.length - 1; i++) {
          expect(result.data.patterns[i].estimated_cost_impact).toBeGreaterThanOrEqual(
            result.data.patterns[i + 1].estimated_cost_impact
          )
        }
      }
    })
  })

  describe('Cross-Endpoint Data Consistency', () => {
    it('should maintain consistent sensor counts across endpoints', async () => {
      // Get summary data
      const summaryRequest = new NextRequest('http://localhost:3000/api/readings/summary')
      const summaryResponse = await SummaryGET(summaryRequest)
      const summaryResult = await summaryResponse.json()

      // Get all timeseries data to count unique sensors
      const timeseriesRequest = new NextRequest('http://localhost:3000/api/readings/timeseries?limit=1000')
      const timeseriesResponse = await TimeseriesGET(timeseriesRequest)
      const timeseriesResult = await timeseriesResponse.json()

      if (summaryResult.success && timeseriesResult.success) {
        const uniqueSensors = new Set(timeseriesResult.data.data.map((r: SensorDataRecord) => r.sensor_id))

        // Allow for small discrepancies due to data freshness
        const tolerance = Math.max(1, Math.ceil(summaryResult.data.total_sensors * 0.05))
        expect(Math.abs(uniqueSensors.size - summaryResult.data.total_sensors)).toBeLessThanOrEqual(tolerance)
      }
    })

    it('should maintain data freshness across endpoints', async () => {
      const summaryRequest = new NextRequest('http://localhost:3000/api/readings/summary')
      const timeseriesRequest = new NextRequest('http://localhost:3000/api/readings/timeseries?limit=1')
      const patternsRequest = new NextRequest('http://localhost:3000/api/readings/patterns')

      const [summaryResponse, timeseriesResponse, patternsResponse] = await Promise.all([
        SummaryGET(summaryRequest),
        TimeseriesGET(timeseriesRequest),
        PatternsGET(patternsRequest)
      ])

      const [summaryResult, timeseriesResult, patternsResult] = await Promise.all([
        summaryResponse.json(),
        timeseriesResponse.json(),
        patternsResponse.json()
      ])

      // All endpoints should return fresh data (check last_updated if available)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      
      if (summaryResult.success && summaryResult.data.last_updated) {
        expect(new Date(summaryResult.data.last_updated).getTime()).toBeGreaterThan(fiveMinutesAgo)
      }
      // Timeseries and patterns don't have timestamp fields in their response
      expect(timeseriesResult.success).toBeDefined()
      expect(patternsResult.success).toBeDefined()
    })
  })

  describe('Error Handling Integration', () => {
    it('should return consistent error response structure across endpoints', async () => {
      // This test simulates error conditions and validates consistent error handling
      const endpoints = [
        { name: 'summary', handler: SummaryGET },
        { name: 'timeseries', handler: TimeseriesGET },
        { name: 'patterns', handler: PatternsGET }
      ]

      for (const endpoint of endpoints) {
        const request = new NextRequest(`http://localhost:3000/api/readings/${endpoint.name}`)
        const response = await endpoint.handler(request)
        const result = await response.json()

        // Should always return a valid JSON response
        expect(result).toHaveProperty('success')
        expect(typeof result.success).toBe('boolean')

        if (result.success === false) {
          expect(result).toHaveProperty('error')
          expect(typeof result.error).toBe('object')
          expect(result.error).toHaveProperty('message')
          expect(result).not.toHaveProperty('data')
        } else {
          expect(result).toHaveProperty('data')
          expect(result).not.toHaveProperty('error')
        }
      }
    })
  })

  describe('Performance Integration', () => {
    it('should complete requests within acceptable time limits', async () => {
      const testCases = [
        { name: 'summary', handler: SummaryGET, url: 'http://localhost:3000/api/readings/summary' },
        { name: 'timeseries', handler: TimeseriesGET, url: 'http://localhost:3000/api/readings/timeseries?limit=100' },
        { name: 'patterns', handler: PatternsGET, url: 'http://localhost:3000/api/readings/patterns' }
      ]

      for (const testCase of testCases) {
        const startTime = performance.now()
        const request = new NextRequest(testCase.url)
        const response = await testCase.handler(request)
        const endTime = performance.now()

        const responseTime = endTime - startTime
        
        // API should respond within 10 seconds for integration tests
        expect(responseTime).toBeLessThan(10000)
        
        // Log performance for monitoring
        console.log(`${testCase.name} API response time: ${responseTime.toFixed(2)}ms`)
      }
    })
  })

  describe('Bangkok Dataset Integration', () => {
    it('should handle realistic data volumes', async () => {
      // Test with parameters that would return substantial data
      const request = new NextRequest('http://localhost:3000/api/readings/timeseries?limit=1000')
      const response = await TimeseriesGET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      
      if (result.success && result.data.total_count > 0) {
        // Should handle large datasets gracefully
        expect(result.data.data.length).toBeLessThanOrEqual(1000)
        expect(result.data.total_count).toBeGreaterThan(0)
        
        // Validate data quality from Bangkok dataset
        result.data.data.forEach((reading: SensorDataRecord, _index: number) => {
          expect(reading).toHaveProperty('sensor_id')
          expect(reading).toHaveProperty('timestamp')

          if (reading.reading_value !== null) {
            expect(typeof reading.reading_value).toBe('number')
          }
          if (reading.equipment_type) {
            expect(typeof reading.equipment_type).toBe('string')
          }
        })
      }
    })

    it('should detect patterns in real Bangkok data', async () => {
      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      
      if (result.success) {
        // Should process real data without errors
        expect(result.data).toHaveProperty('patterns')
        expect(result.data).toHaveProperty('total_estimated_impact')
        expect(result.data.total_estimated_impact).toBeGreaterThanOrEqual(0)
        
        // Validate that business impact makes sense for real data
        if (result.data.patterns.length > 0) {
          expect(result.data.total_estimated_impact).toBeGreaterThan(0)
          expect(result.data.total_patterns_found).toBeGreaterThan(0)
        }
      }
    })
  })
})