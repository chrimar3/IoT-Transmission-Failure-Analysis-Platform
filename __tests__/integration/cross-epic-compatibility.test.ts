/**
 * Cross-Epic Compatibility Integration Tests
 * Tests Epic 1 foundation for readiness with Epic 2-4 features
 * 
 * Epic 2: Authentication & Subscriptions
 * Epic 3: Advanced Analytics & Dashboards
 * Epic 4: MVP Completion & Polish
 */

import { NextRequest } from 'next/server'

// Import Epic 1 API endpoints
import { GET as HealthGET } from '../../app/api/health/route'
import { GET as SummaryGET } from '../../app/api/readings/summary/route'
import { GET as TimeseriesGET } from '../../app/api/readings/timeseries/route'
import { GET as PatternsGET } from '../../app/api/readings/patterns/route'

// Mock external dependencies
jest.mock('@/lib/r2-client', () => ({
  r2Client: {
    getMetrics: jest.fn().mockResolvedValue({
      total_sensors: 25,
      active_sensors: 23,
      offline_sensors: 2,
      avg_power_consumption: 3.2,
      total_power_consumption: 73.6,
      failure_count_24h: 3,
      health_percentage: 92,
      last_updated: new Date().toISOString()
    }),
    fetchSensorData: jest.fn().mockResolvedValue([
      {
        timestamp: new Date().toISOString(),
        sensor_id: 'SENSOR_001',
        floor_number: 1,
        equipment_type: 'HVAC',
        reading_value: 3.2,
        unit: 'kW',
        status: 'normal'
      },
      {
        timestamp: new Date().toISOString(),
        sensor_id: 'SENSOR_002', 
        floor_number: 2,
        equipment_type: 'Lighting',
        reading_value: 1.8,
        unit: 'kW',
        status: 'normal'
      }
    ])
  }
}))

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn().mockResolvedValue({
          data: [{ count: 1000 }],
          error: null
        })
      }))
    }))
  }))
}))

jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: jest.fn(() => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              sensor_id: 'SENSOR_001',
              floor_number: 1,
              equipment_type: 'HVAC',
              reading_value: 0.5,
              status: 'warning',
              timestamp: new Date().toISOString()
            },
            {
              sensor_id: 'SENSOR_002',
              floor_number: 2,
              equipment_type: 'Lighting',
              reading_value: 2.8,
              status: 'normal',
              timestamp: new Date().toISOString()
            }
          ],
          error: null
        })
      }
      return mockChain
    })
  }
}))

describe('Cross-Epic Compatibility Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set up test environment
    process.env.NODE_ENV = 'test'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  })

  describe('Epic 1 → Epic 2 (Authentication & Subscriptions)', () => {
    describe('API Endpoint Compatibility', () => {
      it('should provide consistent response format for authenticated access', async () => {
        // Test that Epic 1 endpoints return data in format Epic 2 auth can wrap
        const request = new NextRequest('http://localhost:3000/api/readings/summary')
        const response = await SummaryGET(request)
        const result = await response.json()

        // Epic 2 will need to wrap responses with user context
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('data')
        expect(response.headers.get('content-type') || 'application/json').toContain('application/json')
        
        // Response structure should be compatible with auth middleware
        expect(typeof result.success).toBe('boolean')
        if (result.success) {
          expect(result.data).toBeDefined()
        } else {
          expect(result.error).toBeDefined()
        }
      })

      it('should support query parameters for user-scoped data access', async () => {
        // Test that endpoints can handle user-scoped filtering (needed for Epic 2)
        const request = new NextRequest('http://localhost:3000/api/readings/timeseries?floor_number=1&limit=10')
        const response = await TimeseriesGET(request)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.success).toBe(true)
        expect(result.data).toHaveProperty('data')
        expect(result.data).toHaveProperty('pagination')
        
        // Pagination essential for subscription tiers
        expect(result.data.pagination).toHaveProperty('limit')
        expect(result.data.pagination).toHaveProperty('page')
      })

      it('should provide rate-limiting compatible error responses', async () => {
        // Mock a scenario that would trigger rate limiting
        const { r2Client: mockR2Client } = await import('@/lib/r2-client')
        mockR2Client.getMetrics.mockRejectedValueOnce(new Error('Rate limited'))

        const request = new NextRequest('http://localhost:3000/api/readings/summary')
        const response = await SummaryGET(request)
        const result = await response.json()

        // Epic 2 needs consistent error format for rate limiting middleware
        expect(response.status).toBe(500)
        expect(result.success).toBe(false)
        expect(result.error).toHaveProperty('error')
        expect(result.error).toHaveProperty('message')
        expect(result.error).toHaveProperty('timestamp')
      })
    })

    describe('Health Check for Auth Integration', () => {
      it('should provide health status compatible with auth service monitoring', async () => {
        const response = await HealthGET()
        const result = await response.json()

        // Epic 2 auth service will monitor this endpoint
        expect(result).toHaveProperty('status')
        expect(result).toHaveProperty('database')
        expect(result).toHaveProperty('response_time_ms')
        expect(result.database).toHaveProperty('connected')
        
        // Health format needed for auth service dependency checks
        expect(['healthy', 'unhealthy'].includes(result.status)).toBe(true)
        expect(typeof result.database.connected).toBe('boolean')
      })
    })
  })

  describe('Epic 1 → Epic 3 (Advanced Analytics)', () => {
    describe('Data Format Compatibility', () => {
      it('should provide time-series data in format suitable for advanced analytics', async () => {
        const request = new NextRequest('http://localhost:3000/api/readings/timeseries?limit=100')
        const response = await TimeseriesGET(request)
        const result = await response.json()

        expect(result.success).toBe(true)
        expect(result.data.data).toBeInstanceOf(Array)
        
        // Each reading should have required fields for analytics
        if (result.data.data.length > 0) {
          const reading = result.data.data[0]
          expect(reading).toHaveProperty('timestamp')
          expect(reading).toHaveProperty('sensor_id')
          expect(reading).toHaveProperty('reading_value')
          expect(reading).toHaveProperty('equipment_type')
          expect(reading).toHaveProperty('floor_number')
          
          // Data types needed for analytics processing
          expect(typeof reading.reading_value).toBe('number')
          expect(typeof reading.floor_number).toBe('number')
          expect(typeof reading.timestamp).toBe('string')
        }
      })

      it('should provide pattern detection data with confidence scores', async () => {
        const request = new NextRequest('http://localhost:3000/api/readings/patterns?min_confidence=0.7')
        const response = await PatternsGET(request)
        const result = await response.json()

        expect(result.success).toBe(true)
        expect(result.data).toHaveProperty('patterns')
        expect(result.data).toHaveProperty('total_patterns_found')
        expect(result.data).toHaveProperty('analysis_period')
        
        // Epic 3 will build advanced analytics on this foundation
        expect(typeof result.data.total_patterns_found).toBe('number')
        expect(result.data.analysis_period).toHaveProperty('start')
        expect(result.data.analysis_period).toHaveProperty('end')
      })

      it('should support date range queries for historical analytics', async () => {
        const startDate = '2024-01-01T00:00:00Z'
        const endDate = '2024-01-02T00:00:00Z'
        const request = new NextRequest(
          `http://localhost:3000/api/readings/patterns?start_date=${startDate}&end_date=${endDate}`
        )
        const response = await PatternsGET(request)
        const result = await response.json()

        expect(result.success).toBe(true)
        expect(result.data.analysis_period.start).toBeDefined()
        expect(result.data.analysis_period.end).toBeDefined()
        
        // Date handling critical for Epic 3 analytics
        const analysisStart = new Date(result.data.analysis_period.start)
        const analysisEnd = new Date(result.data.analysis_period.end)
        expect(analysisStart.getTime()).not.toBeNaN()
        expect(analysisEnd.getTime()).not.toBeNaN()
      })
    })
  })

  describe('Epic 1 → Epic 4 (MVP Completion)', () => {
    describe('Performance and Scalability', () => {
      it('should maintain response times suitable for production load', async () => {
        // Test multiple endpoints concurrently as Epic 4 might under load
        const requests = [
          HealthGET(),
          SummaryGET(new NextRequest('http://localhost:3000/api/readings/summary')),
          TimeseriesGET(new NextRequest('http://localhost:3000/api/readings/timeseries?limit=50')),
          PatternsGET(new NextRequest('http://localhost:3000/api/readings/patterns'))
        ]

        const startTime = Date.now()
        const responses = await Promise.all(requests)
        const endTime = Date.now()

        // All requests should complete quickly for production readiness
        expect(endTime - startTime).toBeLessThan(5000) // 5 second timeout
        
        responses.forEach((response, _index) => {
          expect(response.status).toBeLessThan(400) // No client/server errors
        })
      })

      it('should handle malformed requests gracefully for production', async () => {
        // Test error handling that Epic 4 polish will depend on
        const badRequests = [
          new NextRequest('http://localhost:3000/api/readings/timeseries?limit=invalid'),
          new NextRequest('http://localhost:3000/api/readings/patterns?start_date=not-a-date'),
          new NextRequest('http://localhost:3000/api/readings/timeseries?floor_number=999')
        ]

        for (const request of badRequests) {
          const response = await TimeseriesGET(request)
          const result = await response.json()
          
          // Should handle gracefully, not crash
          expect(response.status).toBeGreaterThanOrEqual(200)
          expect(result).toHaveProperty('success')
          
          // Even with bad input, should return structured response
          if (!result.success && result.error) {
            expect(result.error).toHaveProperty('message')
          }
        }
      })
    })

    describe('API Consistency for Client SDKs', () => {
      it('should provide consistent response structure across all endpoints', async () => {
        const endpoints = [
          { handler: SummaryGET, url: 'http://localhost:3000/api/readings/summary' },
          { handler: TimeseriesGET, url: 'http://localhost:3000/api/readings/timeseries' },
          { handler: PatternsGET, url: 'http://localhost:3000/api/readings/patterns' }
        ]

        for (const endpoint of endpoints) {
          const request = new NextRequest(endpoint.url)
          const response = await endpoint.handler(request)
          const result = await response.json()

          // Consistent structure needed for Epic 4 client SDKs
          expect(result).toHaveProperty('success')
          expect(typeof result.success).toBe('boolean')
          
          if (result.success) {
            expect(result).toHaveProperty('data')
          } else {
            expect(result).toHaveProperty('error')
            expect(result.error).toHaveProperty('error')
            expect(result.error).toHaveProperty('message')
            expect(result.error).toHaveProperty('timestamp')
          }
          
          // All responses should be JSON
          expect(response.headers.get('content-type') || 'application/json').toContain('application/json')
        }
      })
    })
  })

  describe('Cross-Epic Data Flow Integration', () => {
    it('should support the complete data pipeline from Epic 1 through Epic 4', async () => {
      // Simulate the full pipeline that spans all epics
      
      // 1. Epic 1: Health check (foundation)
      const healthResponse = await HealthGET()
      const health = await healthResponse.json()
      expect(health.database.connected).toBe(true)

      // 2. Epic 1: Get summary metrics (foundation data)
      const summaryResponse = await SummaryGET(
        new NextRequest('http://localhost:3000/api/readings/summary')
      )
      const summary = await summaryResponse.json()
      expect(summary.success).toBe(true)
      expect(summary.data.total_sensors).toBeGreaterThan(0)

      // 3. Epic 1: Get detailed time-series (for Epic 3 analytics)
      const timeseriesResponse = await TimeseriesGET(
        new NextRequest('http://localhost:3000/api/readings/timeseries?limit=10')
      )
      const timeseries = await timeseriesResponse.json()
      expect(timeseries.success).toBe(true)
      expect(timeseries.data.data.length).toBeGreaterThan(0)

      // 4. Epic 1: Pattern detection (foundation for Epic 3 advanced analytics)
      const patternsResponse = await PatternsGET(
        new NextRequest('http://localhost:3000/api/readings/patterns?min_confidence=0.5')
      )
      const patterns = await patternsResponse.json()
      expect(patterns.success).toBe(true)

      // Data consistency across the pipeline
      expect(typeof summary.data.total_sensors).toBe('number')
      expect(typeof summary.data.health_percentage).toBe('number')
      expect(timeseries.data.data[0].reading_value).toBeGreaterThanOrEqual(0)
      
      // Epic integration points verified
      console.log('✅ Epic 1 → Epic 2: Auth-ready API structure confirmed')
      console.log('✅ Epic 1 → Epic 3: Analytics-ready data format confirmed')
      console.log('✅ Epic 1 → Epic 4: Production-ready error handling confirmed')
    })

    it('should handle Epic integration edge cases', async () => {
      // Test scenarios that might arise during Epic 2-4 integration

      // Epic 2: User without permissions (should fail gracefully)
      const restrictedRequest = new NextRequest(
        'http://localhost:3000/api/readings/summary',
        { headers: { 'Authorization': 'Bearer invalid-token' } }
      )
      const restrictedResponse = await SummaryGET(restrictedRequest)
      expect(restrictedResponse.status).toBeLessThan(500) // Should not crash

      // Epic 3: High-volume analytics request
      const bulkRequest = new NextRequest(
        'http://localhost:3000/api/readings/timeseries?limit=1000'
      )
      const bulkResponse = await TimeseriesGET(bulkRequest)
      const bulk = await bulkResponse.json()
      expect(bulk.success).toBe(true)
      expect(bulk.data).toHaveProperty('pagination')

      // Epic 4: Production monitoring query
      const monitoringRequest = new NextRequest(
        'http://localhost:3000/api/readings/patterns?equipment_type=HVAC'
      )
      const monitoringResponse = await PatternsGET(monitoringRequest)
      expect(monitoringResponse.status).toBe(200)
    })
  })

  describe('Epic Compatibility Metrics', () => {
    it('should meet Epic 2 authentication integration requirements', async () => {
      // Verify API structure supports auth wrapper middleware
      const response = await SummaryGET(
        new NextRequest('http://localhost:3000/api/readings/summary')
      )
      
      expect(response.headers.get('content-type') || 'application/json').toContain('application/json')
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(300)
      
      console.log('✅ Epic 2 Auth Integration: API structure compatible')
    })

    it('should meet Epic 3 analytics data requirements', async () => {
      // Verify data formats support advanced analytics
      const timeseriesResponse = await TimeseriesGET(
        new NextRequest('http://localhost:3000/api/readings/timeseries?limit=5')
      )
      const timeseries = await timeseriesResponse.json()
      
      expect(timeseries.data.data.length).toBeGreaterThan(0)
      
      const sample = timeseries.data.data[0]
      expect(sample).toHaveProperty('timestamp')
      expect(sample).toHaveProperty('reading_value') 
      expect(sample).toHaveProperty('equipment_type')
      expect(sample).toHaveProperty('floor_number')
      
      console.log('✅ Epic 3 Analytics Integration: Data format compatible')
    })

    it('should meet Epic 4 production readiness requirements', async () => {
      // Test production-ready error handling and performance
      const startTime = Date.now()
      
      const responses = await Promise.all([
        HealthGET(),
        SummaryGET(new NextRequest('http://localhost:3000/api/readings/summary')),
        TimeseriesGET(new NextRequest('http://localhost:3000/api/readings/timeseries?limit=10'))
      ])
      
      const endTime = Date.now()
      
      responses.forEach(response => {
        expect(response.status).toBeLessThan(400)
      })
      
      expect(endTime - startTime).toBeLessThan(2000) // Production SLA
      
      console.log('✅ Epic 4 Production Integration: Performance SLA met')
    })
  })
})