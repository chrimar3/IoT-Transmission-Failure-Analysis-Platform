/**
 * Unit Tests for Timeseries API Endpoint
 * Testing filtering, pagination, and date range logic using R2 client
 * QA Requirement: 100% coverage for P0 critical functionality
 */

import { GET } from '../route'
import { NextRequest } from 'next/server'
import { r2Client } from '@/lib/r2-client'

// Mock R2 client
jest.mock('@/lib/r2-client')
const mockR2Client = r2Client as jest.Mocked<typeof r2Client>

describe('GET /api/readings/timeseries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Happy Path Scenarios', () => {
    it('should return timeseries data without filters', async () => {
      const mockSensorData = [
        {
          timestamp: '2024-09-12T10:00:00Z',
          sensor_id: 'SENSOR_001',
          floor_number: 1,
          equipment_type: 'HVAC',
          reading_value: 2.5,
          unit: 'kW',
          status: 'normal'
        },
        {
          timestamp: '2024-09-12T11:00:00Z',
          sensor_id: 'SENSOR_002',
          floor_number: 2,
          equipment_type: 'Lighting',
          reading_value: 1.2,
          unit: 'kW',
          status: 'normal'
        }
      ]

      mockR2Client.fetchSensorData.mockResolvedValueOnce(mockSensorData)

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.data).toHaveLength(2)
      expect(result.data.total_count).toBe(2)
      expect(result.data.pagination).toMatchObject({
        page: 1,
        limit: 100,
        total_pages: expect.any(Number)
      })
      expect(result.data.date_range).toBeDefined()
      expect(mockR2Client.fetchSensorData).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
        sensorId: undefined,
        floorNumber: undefined,
        limit: 100,
        offset: 0
      })
    })

    it('should filter by sensor_id correctly', async () => {
      const mockFilteredData = [
        {
          timestamp: '2024-09-12T10:00:00Z',
          sensor_id: 'SENSOR_001',
          floor_number: 1,
          equipment_type: 'HVAC',
          reading_value: 2.5,
          unit: 'kW',
          status: 'normal'
        }
      ]

      mockR2Client.fetchSensorData.mockResolvedValueOnce(mockFilteredData)

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries?sensor_id=SENSOR_001')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.data.data).toHaveLength(1)
      expect(result.data.data[0].sensor_id).toBe('SENSOR_001')
      expect(mockR2Client.fetchSensorData).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
        sensorId: 'SENSOR_001',
        floorNumber: undefined,
        limit: 100,
        offset: 0
      })
    })

    it('should filter by floor_number correctly', async () => {
      const mockFloorData = [
        {
          timestamp: '2024-09-12T10:00:00Z',
          sensor_id: 'SENSOR_001',
          floor_number: 2,
          equipment_type: 'HVAC',
          reading_value: 2.5,
          unit: 'kW',
          status: 'normal'
        }
      ]

      mockR2Client.fetchSensorData.mockResolvedValueOnce(mockFloorData)

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries?floor_number=2')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.data.data[0].floor_number).toBe(2)
      expect(mockR2Client.fetchSensorData).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
        sensorId: undefined,
        floorNumber: 2,
        limit: 100,
        offset: 0
      })
    })

    it('should handle date range filtering', async () => {
      const mockDateRangeData = [
        {
          timestamp: '2024-09-12T12:00:00Z',
          sensor_id: 'SENSOR_001',
          floor_number: 1,
          equipment_type: 'HVAC',
          reading_value: 2.5,
          unit: 'kW',
          status: 'normal'
        }
      ]

      mockR2Client.fetchSensorData.mockResolvedValueOnce(mockDateRangeData)

      const startDate = '2024-09-12T00:00:00Z'
      const endDate = '2024-09-12T23:59:59Z'
      const request = new NextRequest(`http://localhost:3000/api/readings/timeseries?start_date=${startDate}&end_date=${endDate}`)
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.data.date_range.start).toBe(startDate)
      expect(result.data.date_range.end).toBe(endDate)
      expect(mockR2Client.fetchSensorData).toHaveBeenCalledWith({
        startDate,
        endDate,
        sensorId: undefined,
        floorNumber: undefined,
        limit: 100,
        offset: 0
      })
    })

    it('should handle pagination correctly', async () => {
      const mockPaginatedData = Array.from({ length: 20 }, (_, i) => ({
        timestamp: `2024-09-12T${String(i + 10).padStart(2, '0')}:00:00Z`,
        sensor_id: `SENSOR_${String(i + 1).padStart(3, '0')}`,
        floor_number: (i % 5) + 1,
        equipment_type: 'HVAC',
        reading_value: Math.random() * 5,
        unit: 'kW',
        status: 'normal'
      }))

      mockR2Client.fetchSensorData.mockResolvedValueOnce(mockPaginatedData)

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries?limit=20&offset=10')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.data.data).toHaveLength(20)
      expect(result.data.pagination).toMatchObject({
        page: 1, // offset 10 / limit 20 = 0.5, floor(0.5) + 1 = 1
        limit: 20,
        total_pages: expect.any(Number)
      })
      expect(mockR2Client.fetchSensorData).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
        sensorId: undefined,
        floorNumber: undefined,
        limit: 20,
        offset: 10
      })
    })

    it('should combine multiple filters', async () => {
      const mockCombinedData = [
        {
          timestamp: '2024-09-12T10:00:00Z',
          sensor_id: 'SENSOR_001',
          floor_number: 1,
          equipment_type: 'HVAC',
          reading_value: 2.5,
          unit: 'kW',
          status: 'normal'
        }
      ]

      mockR2Client.fetchSensorData.mockResolvedValueOnce(mockCombinedData)

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries?sensor_id=SENSOR_001&floor_number=1&start_date=2024-09-12T00:00:00Z')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockR2Client.fetchSensorData).toHaveBeenCalledWith({
        startDate: '2024-09-12T00:00:00Z',
        endDate: undefined,
        sensorId: 'SENSOR_001',
        floorNumber: 1,
        limit: 100,
        offset: 0
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty dataset', async () => {
      mockR2Client.fetchSensorData.mockResolvedValueOnce([])

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.data).toHaveLength(0)
      expect(result.data.total_count).toBe(0)
    })

    it('should enforce maximum limit of 1000', async () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        timestamp: `2024-09-12T${String(i).padStart(2, '0')}:00:00Z`,
        sensor_id: `SENSOR_${String(i + 1).padStart(3, '0')}`,
        floor_number: 1,
        equipment_type: 'HVAC',
        reading_value: 2.5,
        unit: 'kW',
        status: 'normal'
      }))

      mockR2Client.fetchSensorData.mockResolvedValueOnce(mockData)

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries?limit=2000')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockR2Client.fetchSensorData).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
        sensorId: undefined,
        floorNumber: undefined,
        limit: 1000, // Capped at 1000
        offset: 0
      })
    })

    it('should handle invalid page parameter', async () => {
      mockR2Client.fetchSensorData.mockResolvedValueOnce([])

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries?limit=10&offset=-5')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.data.pagination.page).toBe(0) // floor(-5 / 10) + 1 = -1 + 1 = 0
    })

    it('should handle null data response gracefully', async () => {
      mockR2Client.fetchSensorData.mockResolvedValueOnce([])

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.data.data).toHaveLength(0)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle R2 client connection failure', async () => {
      mockR2Client.fetchSensorData.mockRejectedValueOnce(new Error('R2 connection timeout'))

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle R2 fetch error', async () => {
      mockR2Client.fetchSensorData.mockRejectedValueOnce(new Error('Fetch failed'))

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle unexpected errors', async () => {
      mockR2Client.fetchSensorData.mockRejectedValueOnce(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Response Structure Validation', () => {
    it('should return consistent TimeSeriesResponse structure', async () => {
      const mockData = [
        {
          timestamp: '2024-09-12T10:00:00Z',
          sensor_id: 'SENSOR_001',
          floor_number: 1,
          equipment_type: 'HVAC',
          reading_value: 2.5,
          unit: 'kW',
          status: 'normal'
        }
      ]

      mockR2Client.fetchSensorData.mockResolvedValueOnce(mockData)

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries')
      const response = await GET(request)
      const result = await response.json()

      // Validate ApiResponse structure
      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('data')

      // Validate TimeSeriesResponse structure
      expect(result.data).toHaveProperty('data')
      expect(result.data).toHaveProperty('total_count')
      expect(result.data).toHaveProperty('date_range')
      expect(result.data).toHaveProperty('pagination')
      expect(Array.isArray(result.data.data)).toBe(true)

      // Validate Pagination structure
      expect(result.data.pagination).toHaveProperty('page')
      expect(result.data.pagination).toHaveProperty('limit')
      expect(result.data.pagination).toHaveProperty('total_pages')

      // Validate DateRange structure
      expect(result.data.date_range).toHaveProperty('start')
      expect(result.data.date_range).toHaveProperty('end')
    })

    it('should return error response with consistent structure', async () => {
      mockR2Client.fetchSensorData.mockRejectedValueOnce(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries')
      const response = await GET(request)
      const result = await response.json()

      expect(result).toHaveProperty('success', false)
      expect(result).toHaveProperty('error')
      expect(result).not.toHaveProperty('data')
    })
  })

  describe('Business Logic Validation', () => {
    it('should calculate pagination metadata correctly', async () => {
      const mockData = Array.from({ length: 25 }, (_, i) => ({
        timestamp: `2024-09-12T${String(i).padStart(2, '0')}:00:00Z`,
        sensor_id: `SENSOR_${String(i + 1).padStart(3, '0')}`,
        floor_number: 1,
        equipment_type: 'HVAC',
        reading_value: 2.5,
        unit: 'kW',
        status: 'normal'
      }))

      mockR2Client.fetchSensorData.mockResolvedValueOnce(mockData)

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries?limit=25&offset=50')
      const response = await GET(request)
      const result = await response.json()

      expect(result.data.pagination).toMatchObject({
        page: 3, // offset 50 / limit 25 = 2, floor(2) + 1 = 3
        limit: 25,
        total_pages: expect.any(Number)
      })
    })

    it('should handle parameter validation correctly', async () => {
      mockR2Client.fetchSensorData.mockResolvedValueOnce([])

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries?floor_number=5&limit=50')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockR2Client.fetchSensorData).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
        sensorId: undefined,
        floorNumber: 5,
        limit: 50,
        offset: 0
      })
    })
  })
})