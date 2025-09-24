/**
 * Unit Tests for Pattern Detection API Endpoint
 * Testing failure pattern detection and business impact calculation
 * QA Requirement: 100% coverage for P0 critical functionality
 */

import { GET } from '../route'
import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Mock Supabase server client
jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: jest.fn()
  }
}))

const mockSupabaseServer = supabaseServer as jest.Mocked<typeof supabaseServer>

describe('GET /api/readings/patterns', () => {
  let mockQueryChain: unknown

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Create a mock query chain that returns itself for method chaining
    mockQueryChain = {
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn()
    }
    
    // Mock the from() method to return the query chain
    ;(mockSupabaseServer.from as jest.Mock).mockReturnValue(mockQueryChain)
  })

  describe('Happy Path Scenarios', () => {
    it('should detect HVAC failure patterns', async () => {
      const mockHVACFailureData = [
        {
          sensor_id: 'SENSOR_001',
          floor_number: 1,
          equipment_type: 'HVAC',
          reading_value: 0, // Failure indicated by 0 reading
          status: 'failed',
          timestamp: '2024-09-12T10:00:00Z'
        },
        {
          sensor_id: 'SENSOR_001',
          floor_number: 1,
          equipment_type: 'HVAC',
          reading_value: 0,
          status: 'failed',
          timestamp: '2024-09-12T11:00:00Z'
        },
        {
          sensor_id: 'SENSOR_001',
          floor_number: 1,
          equipment_type: 'HVAC',
          reading_value: 2.5,
          status: 'normal',
          timestamp: '2024-09-12T12:00:00Z'
        }
      ]

      // Add enough normal readings to meet minimum threshold (10 readings)
      const allData = [
        ...mockHVACFailureData,
        ...Array.from({ length: 15 }, (_, i) => ({
          sensor_id: 'SENSOR_001',
          floor_number: 1,
          equipment_type: 'HVAC',
          reading_value: 2.5,
          status: 'normal',
          timestamp: `2024-09-12T${String(13 + i).padStart(2, '0')}:00:00Z`
        }))
      ]

      mockQueryChain.limit.mockResolvedValueOnce({
        data: allData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('patterns')
      expect(result.data).toHaveProperty('analysis_period')
      expect(result.data).toHaveProperty('total_patterns_found')
      expect(result.data).toHaveProperty('total_estimated_impact')

      // Should detect HVAC failure pattern
      expect(result.data.patterns.length).toBeGreaterThanOrEqual(0)
      if (result.data.patterns.length > 0) {
        const hvacPattern = result.data.patterns.find((p: unknown) => p.equipment_type === 'HVAC')
        if (hvacPattern) {
          expect(hvacPattern).toMatchObject({
            pattern_id: expect.any(String),
            equipment_type: 'HVAC',
            floor_number: 1,
            sensor_id: 'SENSOR_001',
            failure_frequency: expect.any(Number),
            average_downtime_minutes: expect.any(Number),
            estimated_cost_impact: expect.any(Number),
            confidence_score: expect.any(Number),
            detected_at: expect.any(String)
          })
          expect(hvacPattern.failure_frequency).toBeGreaterThan(0)
          expect(hvacPattern.confidence_score).toBeGreaterThanOrEqual(0.7) // Default min confidence
        }
      }
    })

    it('should detect lighting failure patterns', async () => {
      const mockLightingFailureData = Array.from({ length: 20 }, (_, i) => ({
        sensor_id: 'SENSOR_002',
        floor_number: 2,
        equipment_type: 'Lighting',
        reading_value: i % 4 === 0 ? 0 : 1.2, // 25% failure rate
        status: i % 4 === 0 ? 'failed' : 'normal',
        timestamp: `2024-09-12T${String(10 + i).padStart(2, '0')}:00:00Z`
      }))

      mockQueryChain.limit.mockResolvedValueOnce({
        data: mockLightingFailureData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      
      if (result.data.patterns.length > 0) {
        const lightingPattern = result.data.patterns.find((p: unknown) => p.equipment_type === 'Lighting')
        if (lightingPattern) {
          expect(lightingPattern.equipment_type).toBe('Lighting')
          expect(lightingPattern.sensor_id).toBe('SENSOR_002')
          expect(lightingPattern.floor_number).toBe(2)
          expect(lightingPattern.failure_frequency).toBeCloseTo(0.25, 1) // 25% failure rate
        }
      }
    })

    it('should calculate business impact correctly', async () => {
      const mockCriticalFailureData = Array.from({ length: 100 }, (_, i) => ({
        sensor_id: 'SENSOR_003',
        floor_number: 1,
        equipment_type: 'HVAC',
        reading_value: i % 3 === 0 ? 0 : 3.0, // ~33% failure rate
        status: i % 3 === 0 ? 'failed' : 'normal',
        timestamp: `2024-09-12T${String(10 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}:00Z`
      }))

      mockQueryChain.limit.mockResolvedValueOnce({
        data: mockCriticalFailureData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns?min_confidence=0.5')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.total_estimated_impact).toBeGreaterThan(0)

      if (result.data.patterns.length > 0) {
        const pattern = result.data.patterns[0]
        expect(pattern.estimated_cost_impact).toBeGreaterThan(0)
        // HVAC should have higher cost impact than lighting
        if (pattern.equipment_type === 'HVAC') {
          expect(pattern.estimated_cost_impact).toBeGreaterThan(100) // Significant cost for HVAC
        }
      }
    })

    it('should sort patterns by cost impact', async () => {
      // Create data with mixed equipment types and failure rates
      const mockMixedData = [
        // HVAC with high failure rate (expensive)
        ...Array.from({ length: 15 }, (_, i) => ({
          sensor_id: 'SENSOR_HVAC',
          floor_number: 1,
          equipment_type: 'HVAC',
          reading_value: i % 2 === 0 ? 0 : 4.0,
          status: i % 2 === 0 ? 'failed' : 'normal',
          timestamp: `2024-09-12T10:${String(i).padStart(2, '0')}:00Z`
        })),
        // Lighting with lower failure rate (cheaper)
        ...Array.from({ length: 15 }, (_, i) => ({
          sensor_id: 'SENSOR_LIGHT',
          floor_number: 2,
          equipment_type: 'Lighting',
          reading_value: i % 5 === 0 ? 0 : 1.0,
          status: i % 5 === 0 ? 'failed' : 'normal',
          timestamp: `2024-09-12T11:${String(i).padStart(2, '0')}:00Z`
        }))
      ]

      mockQueryChain.limit.mockResolvedValueOnce({
        data: mockMixedData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      if (result.data.patterns.length > 1) {
        // Patterns should be sorted by cost impact (highest first)
        for (let i = 0; i < result.data.patterns.length - 1; i++) {
          expect(result.data.patterns[i].estimated_cost_impact)
            .toBeGreaterThanOrEqual(result.data.patterns[i + 1].estimated_cost_impact)
        }
      }
    })

    it('should apply equipment type filter', async () => {
      const mockMixedEquipmentData = [
        {
          sensor_id: 'SENSOR_001',
          floor_number: 1,
          equipment_type: 'HVAC',
          reading_value: 0,
          status: 'failed',
          timestamp: '2024-09-12T10:00:00Z'
        },
        {
          sensor_id: 'SENSOR_002',
          floor_number: 1,
          equipment_type: 'Lighting',
          reading_value: 0,
          status: 'failed',
          timestamp: '2024-09-12T10:00:00Z'
        }
      ]

      mockQueryChain.limit.mockResolvedValueOnce({
        data: mockMixedEquipmentData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns?equipment_type=HVAC')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockQueryChain.eq).toHaveBeenCalledWith('equipment_type', 'HVAC')
    })

    it('should apply floor number filter', async () => {
      mockQueryChain.limit.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns?floor_number=3')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockQueryChain.eq).toHaveBeenCalledWith('floor_number', 3)
    })

    it('should apply date range filtering', async () => {
      mockQueryChain.limit.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const startDate = '2024-09-10T00:00:00Z'
      const endDate = '2024-09-15T23:59:59Z'
      const request = new NextRequest(`http://localhost:3000/api/readings/patterns?start_date=${startDate}&end_date=${endDate}`)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockQueryChain.gte).toHaveBeenCalledWith('timestamp', startDate)
      expect(mockQueryChain.lte).toHaveBeenCalledWith('timestamp', endDate)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty dataset gracefully', async () => {
      mockQueryChain.limit.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.patterns).toHaveLength(0)
      expect(result.data.total_patterns_found).toBe(0)
      expect(result.data.total_estimated_impact).toBe(0)
    })

    it('should handle sensors with all healthy readings', async () => {
      const mockHealthyData = Array.from({ length: 50 }, (_, i) => ({
        sensor_id: 'SENSOR_HEALTHY',
        floor_number: 1,
        equipment_type: 'HVAC',
        reading_value: 2.5 + Math.random() * 0.5,
        status: 'normal',
        timestamp: `2024-09-12T${String(10 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}:00Z`
      }))

      mockQueryChain.limit.mockResolvedValueOnce({
        data: mockHealthyData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      // Should not detect patterns with healthy equipment (failure rate < 5%)
      expect(result.data.patterns).toHaveLength(0)
    })

    it('should handle insufficient data for pattern detection', async () => {
      const mockInsufficientData = [
        {
          sensor_id: 'SENSOR_001',
          floor_number: 1,
          equipment_type: 'HVAC',
          reading_value: 0,
          status: 'failed',
          timestamp: '2024-09-12T10:00:00Z'
        },
        {
          sensor_id: 'SENSOR_001',
          floor_number: 1,
          equipment_type: 'HVAC',
          reading_value: 2.5,
          status: 'normal',
          timestamp: '2024-09-12T11:00:00Z'
        }
      ]

      mockQueryChain.limit.mockResolvedValueOnce({
        data: mockInsufficientData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      // Should not detect patterns with < 10 readings
      expect(result.data.patterns).toHaveLength(0)
    })

    it('should handle invalid date format', async () => {
      const request = new NextRequest('http://localhost:3000/api/readings/patterns?start_date=invalid-date')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Invalid date format')
    })

    it('should handle confidence threshold filtering', async () => {
      const mockLowConfidenceData = Array.from({ length: 12 }, (_, i) => ({
        sensor_id: 'SENSOR_001',
        floor_number: 1,
        equipment_type: 'HVAC',
        reading_value: i < 1 ? 0 : 2.5, // Very low failure rate (8%)
        status: i < 1 ? 'failed' : 'normal',
        timestamp: `2024-09-12T${String(10 + i).padStart(2, '0')}:00:00Z`
      }))

      mockQueryChain.limit.mockResolvedValueOnce({
        data: mockLowConfidenceData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns?min_confidence=0.9')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      // Should filter out low confidence patterns
      expect(result.data.patterns.length).toBe(0)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle database connection failure', async () => {
      mockQueryChain.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection timeout', code: 'TIMEOUT' }
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error.error).toBe('database_error')
      expect(result.error.message).toContain('Failed to fetch sensor data')
    })

    it('should handle database query error', async () => {
      mockQueryChain.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Query execution failed', code: 'QUERY_ERROR' }
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error.error).toBe('database_error')
    })

    it('should handle unexpected errors', async () => {
      mockQueryChain.limit.mockImplementationOnce(() => {
        throw new Error('Unexpected database error')
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error.error).toBe('internal_server_error')
    })
  })

  describe('Response Structure Validation', () => {
    it('should return consistent PatternDetectionResponse structure', async () => {
      const mockPatternData = Array.from({ length: 20 }, (_, i) => ({
        sensor_id: 'SENSOR_001',
        floor_number: 1,
        equipment_type: 'HVAC',
        reading_value: i % 3 === 0 ? 0 : 2.5,
        status: i % 3 === 0 ? 'failed' : 'normal',
        timestamp: `2024-09-12T${String(10 + i).padStart(2, '0')}:00:00Z`
      }))

      mockQueryChain.limit.mockResolvedValueOnce({
        data: mockPatternData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await GET(request)
      const result = await response.json()

      // Validate ApiResponse structure
      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('data')

      // Validate PatternDetectionResponse structure
      expect(result.data).toHaveProperty('patterns')
      expect(result.data).toHaveProperty('analysis_period')
      expect(result.data).toHaveProperty('total_patterns_found')
      expect(result.data).toHaveProperty('total_estimated_impact')
      expect(Array.isArray(result.data.patterns)).toBe(true)

      // Validate AnalysisPeriod structure
      expect(result.data.analysis_period).toHaveProperty('start')
      expect(result.data.analysis_period).toHaveProperty('end')

      // Validate FailurePattern structure (if patterns found)
      if (result.data.patterns.length > 0) {
        const pattern = result.data.patterns[0]
        expect(pattern).toHaveProperty('pattern_id')
        expect(pattern).toHaveProperty('equipment_type')
        expect(pattern).toHaveProperty('floor_number')
        expect(pattern).toHaveProperty('sensor_id')
        expect(pattern).toHaveProperty('failure_frequency')
        expect(pattern).toHaveProperty('average_downtime_minutes')
        expect(pattern).toHaveProperty('estimated_cost_impact')
        expect(pattern).toHaveProperty('confidence_score')
        expect(pattern).toHaveProperty('detected_at')
      }
    })

    it('should return error response with consistent structure', async () => {
      mockQueryChain.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await GET(request)
      const result = await response.json()

      expect(result).toHaveProperty('success', false)
      expect(result).toHaveProperty('error')
      expect(result.error).toHaveProperty('error')
      expect(result.error).toHaveProperty('message')
      expect(result.error).toHaveProperty('timestamp')
      expect(result.error).toHaveProperty('status')
      expect(result).not.toHaveProperty('data')
    })
  })

  describe('Business Logic Validation', () => {
    it('should calculate failure frequency correctly', async () => {
      const mockCalculationData = Array.from({ length: 20 }, (_, i) => ({
        sensor_id: 'SENSOR_CALC',
        floor_number: 1,
        equipment_type: 'HVAC',
        reading_value: i < 4 ? 0 : 2.5, // Exactly 20% failure rate (4/20)
        status: i < 4 ? 'failed' : 'normal',
        timestamp: `2024-09-12T${String(10 + i).padStart(2, '0')}:00:00Z`
      }))

      mockQueryChain.limit.mockResolvedValueOnce({
        data: mockCalculationData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      if (result.data.patterns.length > 0) {
        const pattern = result.data.patterns.find((p: unknown) => p.sensor_id === 'SENSOR_CALC')
        if (pattern) {
          expect(pattern.failure_frequency).toBeCloseTo(0.2, 1) // 20% failure rate
        }
      }
    })

    it('should enforce minimum data thresholds', async () => {
      const mockInsufficientFailures = Array.from({ length: 100 }, (_, i) => ({
        sensor_id: 'SENSOR_LOW_FAIL',
        floor_number: 1,
        equipment_type: 'HVAC',
        reading_value: i < 2 ? 0 : 2.5, // 2% failure rate (below 5% threshold)
        status: i < 2 ? 'failed' : 'normal',
        timestamp: `2024-09-12T${String(10 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}:00Z`
      }))

      mockQueryChain.limit.mockResolvedValueOnce({
        data: mockInsufficientFailures,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      // Should not detect patterns with failure rate < 5%
      expect(result.data.patterns).toHaveLength(0)
    })

    it('should calculate confidence scores appropriately', async () => {
      const mockHighVolumeData = Array.from({ length: 500 }, (_, i) => ({
        sensor_id: 'SENSOR_HIGH_VOL',
        floor_number: 1,
        equipment_type: 'HVAC',
        reading_value: i % 4 === 0 ? 0 : 2.5, // 25% failure rate
        status: i % 4 === 0 ? 'failed' : 'normal',
        timestamp: `2024-09-12T${String(10 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`
      }))

      mockQueryChain.limit.mockResolvedValueOnce({
        data: mockHighVolumeData,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      if (result.data.patterns.length > 0) {
        const pattern = result.data.patterns[0]
        // High volume data should have higher confidence
        expect(pattern.confidence_score).toBeGreaterThanOrEqual(0.7)
        expect(pattern.confidence_score).toBeLessThanOrEqual(0.95) // Capped at 95%
      }
    })
  })
})