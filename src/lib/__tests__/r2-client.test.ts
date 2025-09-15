/**
 * R2 Storage Client Tests
 * Comprehensive testing for Cloudflare R2 integration
 * Tests file operations, data parsing, error handling, and caching
 */

import { R2StorageClient } from '../r2-client'

// Mock fetch globally
global.fetch = jest.fn()

describe('R2StorageClient', () => {
  let client: R2StorageClient
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
    client = new R2StorageClient()
    
    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/csv' }),
      text: jest.fn().mockResolvedValue('sensor_id,timestamp,reading_value,floor_number,equipment_type,unit,status\nSENSOR_001,2024-01-01T00:00:00Z,25.5,1,HVAC,°C,normal'),
      json: jest.fn(),
      blob: jest.fn(),
      arrayBuffer: jest.fn()
    } as any)
  })

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const client = new R2StorageClient()
      expect(client).toBeInstanceOf(R2StorageClient)
    })

    it('should initialize with custom bucket name', () => {
      const client = new R2StorageClient({ bucketName: 'custom-bucket' })
      expect(client).toBeInstanceOf(R2StorageClient)
    })

    it('should use environment variables when available', () => {
      process.env.NEXT_PUBLIC_R2_URL = 'https://custom.r2.dev'
      const client = new R2StorageClient()
      expect(client).toBeInstanceOf(R2StorageClient)
      delete process.env.NEXT_PUBLIC_R2_URL
    })
  })

  describe('fetchSensorData', () => {
    it('should fetch and parse sensor data successfully', async () => {
      const query = { startDate: '2024-01-01', endDate: '2024-01-02' }
      
      const result = await client.fetchSensorData(query)
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('cu-bems-iot-data.r2.dev'),
        expect.objectContaining({
          headers: {
            'Cache-Control': 'max-age=3600'
          }
        })
      )
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        sensor_id: 'SENSOR_001',
        timestamp: expect.any(String),
        reading_value: 25.5,
        floor_number: 1,
        equipment_type: 'HVAC',
        status: 'normal'
      })
    })

    it('should handle fetch failures gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any)

      const query = { startDate: '2024-01-01' }
      const result = await client.fetchSensorData(query)
      
      // Should return fallback data
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const query = { startDate: '2024-01-01' }
      const result = await client.fetchSensorData(query)
      
      // Should return fallback data
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle malformed CSV data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('invalid,csv,data\nwith,broken,lines')
      } as any)

      const query = { startDate: '2024-01-01' }
      const result = await client.fetchSensorData(query)
      
      // Should handle gracefully and return fallback
      expect(result).toBeDefined()
    })

    it('should parse empty CSV data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('')
      } as any)

      const query = { startDate: '2024-01-01' }
      const result = await client.fetchSensorData(query)
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle CSV with headers only', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('sensor_id,timestamp,value')
      } as any)

      const query = { startDate: '2024-01-01' }
      const result = await client.fetchSensorData(query)
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(0)
    })
  })

  describe('getMetrics', () => {
    beforeEach(() => {
      // Mock comprehensive sensor data response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(`sensor_id,timestamp,reading_value,floor_number,equipment_type,unit,status
SENSOR_001,2024-01-01T00:00:00Z,25.5,1,HVAC,°C,normal
SENSOR_002,2024-01-01T01:00:00Z,24.2,1,HVAC,°C,normal
SENSOR_003,2024-01-01T02:00:00Z,23.8,2,Lighting,°C,degraded
SENSOR_004,2024-01-01T03:00:00Z,26.1,2,HVAC,°C,normal`)
      } as any)
    })

    it('should calculate basic metrics', async () => {
      const result = await client.getMetrics()
      
      expect(result).toMatchObject({
        total_sensors: expect.any(Number),
        active_sensors: expect.any(Number),
        health_percentage: expect.any(Number),
        total_power_consumption: expect.any(Number),
        avg_power_consumption: expect.any(Number),
        last_updated: expect.any(String)
      })
    })

    it('should handle empty data gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('sensor_id,timestamp,reading_value,floor_number,equipment_type,unit,status')
      } as any)

      const result = await client.getMetrics()
      
      expect(result.total_sensors).toBe(0)
      expect(result.active_sensors).toBe(0)
      expect(result.health_percentage).toBe(100)
    })

    it('should calculate health percentage correctly', async () => {
      const result = await client.getMetrics()
      
      // 3 healthy + 1 degraded = 75% health
      expect(result.health_percentage).toBeCloseTo(75, 1)
    })

    it('should handle fetch errors in metrics calculation', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'))

      const result = await client.getMetrics()
      
      // Should return fallback metrics
      expect(result).toMatchObject({
        total_sensors: expect.any(Number),
        active_sensors: expect.any(Number),
        health_percentage: expect.any(Number)
      })
    })
  })

  describe('Query Building and File Paths', () => {
    it('should handle different query parameters', async () => {
      const query = { 
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        sensorId: 'SENSOR_001'
      }
      
      const result = await client.fetchSensorData(query)
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle minimal query parameters', async () => {
      const query = { limit: 10 }
      
      const result = await client.fetchSensorData(query)
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle empty query', async () => {
      const result = await client.fetchSensorData({})
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('Error Handling and Fallbacks', () => {
    it('should return fallback data when R2 is unavailable', async () => {
      mockFetch.mockRejectedValue(new Error('Service unavailable'))

      const result = await client.fetchSensorData({ startDate: '2024-01-01' })
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      // Fallback data should still provide some sample data
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle timeout scenarios', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )

      const result = await client.fetchSensorData({ startDate: '2024-01-01' })
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle HTTP error codes gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as any)

      const result = await client.fetchSensorData({ startDate: '2024-01-01' })
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('Data Processing', () => {
    it('should handle various CSV formats', async () => {
      const csvData = `sensor_id,timestamp,reading_value,floor_number,equipment_type,unit,status,extra_field
SENSOR_001,2024-01-01T00:00:00Z,25.5,1,HVAC,°C,normal,extra1
SENSOR_002,2024-01-01T01:00:00Z,24.2,2,Lighting,°C,normal,extra2`
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(csvData)
      } as any)

      const result = await client.fetchSensorData({ startDate: '2024-01-01' })
      
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('sensor_id', 'SENSOR_001')
      expect(result[1]).toHaveProperty('sensor_id', 'SENSOR_002')
    })

    it('should handle numeric value conversion', async () => {
      const csvData = `sensor_id,reading_value,floor_number
SENSOR_001,25.5,1
SENSOR_002,invalid,2
SENSOR_003,30.0,3`
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(csvData)
      } as any)

      const result = await client.fetchSensorData({ startDate: '2024-01-01' })
      
      expect(result).toHaveLength(3)
      expect(result[0]).toHaveProperty('sensor_id', 'SENSOR_001')
      expect(result[0]).toHaveProperty('reading_value')
    })
  })

  describe('Caching and Performance', () => {
    it('should include cache headers in requests', async () => {
      await client.fetchSensorData({ startDate: '2024-01-01' })
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Cache-Control': 'max-age=3600'
          }
        })
      )
    })

    it('should handle large datasets efficiently', async () => {
      // Simulate large CSV response
      const largeCsv = Array.from({ length: 1000 }, (_, i) => 
        `SENSOR_${String(i).padStart(3, '0')},2024-01-01T${String(i % 24).padStart(2, '0')}:00:00Z,${Math.random() * 50}`
      ).join('\n')
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(`sensor_id,timestamp,value\n${largeCsv}`)
      } as any)

      const startTime = Date.now()
      const result = await client.fetchSensorData({ startDate: '2024-01-01' })
      const endTime = Date.now()
      
      expect(result).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(1000) // Should process within 1 second
    })
  })
})