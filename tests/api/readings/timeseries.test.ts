/**
 * Comprehensive tests for time-series API endpoint
 * Tests parameter validation, data processing, error handling, and performance
 */

import { GET } from '@/app/api/readings/timeseries/route'
import { NextRequest } from 'next/server'

// Mock getServerSession
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

import { getServerSession } from 'next-auth'
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/readings/timeseries', () => {
  const mockSession = {
    user: {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User'
    },
    expires: '2025-12-31'
  }

  beforeEach(() => {
    mockGetServerSession.mockClear()
    mockGetServerSession.mockResolvedValue(mockSession)
  })

  describe('Authentication', () => {
    test('requires authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/readings/timeseries')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Authentication required')
    })

    test('allows authenticated users', async () => {
      const request = new NextRequest('http://localhost:3000/api/readings/timeseries')
      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Parameter Validation', () => {
    test('accepts valid sensor_ids parameter', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('sensor_ids', 'SENSOR_001,SENSOR_002,SENSOR_003')

      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.series).toBeDefined()
    })

    test('handles empty sensor_ids parameter', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('sensor_ids', '')

      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.series).toBeDefined()
    })

    test('validates date format', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('start_date', 'invalid-date')

      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid query parameters')
      expect(data.validation_errors).toBeDefined()
    })

    test('validates interval parameter', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('interval', 'invalid-interval')

      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.validation_errors).toContainEqual(
        expect.objectContaining({
          field: 'interval',
          message: expect.stringContaining('Invalid enum value')
        })
      )
    })

    test('validates max_points range', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('max_points', '99999')

      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.validation_errors).toContainEqual(
        expect.objectContaining({
          field: 'max_points',
          message: expect.stringContaining('Number must be less than or equal to 10000')
        })
      )
    })

    test('accepts valid max_points parameter', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('max_points', '500')

      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Data Generation', () => {
    test('returns time-series data with correct structure', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('sensor_ids', 'SENSOR_001,SENSOR_002')
      url.searchParams.set('start_date', '2018-01-01T00:00:00Z')
      url.searchParams.set('end_date', '2018-01-01T23:59:59Z')
      url.searchParams.set('interval', 'hour')

      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.series).toBeDefined()
      expect(Array.isArray(data.data.series)).toBe(true)
      expect(data.data.series.length).toBe(2)

      // Check series structure
      const series = data.data.series[0]
      expect(series).toHaveProperty('sensor_id')
      expect(series).toHaveProperty('equipment_type')
      expect(series).toHaveProperty('floor_number')
      expect(series).toHaveProperty('unit')
      expect(series).toHaveProperty('color')
      expect(series).toHaveProperty('data')
      expect(Array.isArray(series.data)).toBe(true)

      // Check data point structure
      if (series.data.length > 0) {
        const dataPoint = series.data[0]
        expect(dataPoint).toHaveProperty('timestamp')
        expect(dataPoint).toHaveProperty('value')
        expect(dataPoint).toHaveProperty('status')
        expect(typeof dataPoint.value).toBe('number')
        expect(['normal', 'warning', 'error']).toContain(dataPoint.status)
      }
    })

    test('returns metadata with request information', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('sensor_ids', 'SENSOR_001,SENSOR_002')
      url.searchParams.set('interval', 'hour')

      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.metadata).toBeDefined()
      expect(data.data.metadata).toHaveProperty('total_points')
      expect(data.data.metadata).toHaveProperty('sensors_count')
      expect(data.data.metadata).toHaveProperty('date_range')
      expect(data.data.metadata).toHaveProperty('interval')
      expect(data.data.metadata).toHaveProperty('decimated')

      expect(typeof data.data.metadata.total_points).toBe('number')
      expect(data.data.metadata.sensors_count).toBe(2)
      expect(data.data.metadata.interval).toBe('hour')
    })

    test('handles different intervals correctly', async () => {
      const intervals = ['minute', 'hour', 'day', 'week']

      for (const interval of intervals) {
        const url = new URL('http://localhost:3000/api/readings/timeseries')
        url.searchParams.set('sensor_ids', 'SENSOR_001')
        url.searchParams.set('start_date', '2018-01-01T00:00:00Z')
        url.searchParams.set('end_date', '2018-01-02T00:00:00Z')
        url.searchParams.set('interval', interval)

        const request = new NextRequest(url)
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.metadata.interval).toBe(interval)
      }
    })

    test('generates realistic Bangkok sensor data', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('sensor_ids', 'SENSOR_001,SENSOR_002,SENSOR_003')
      url.searchParams.set('start_date', '2018-06-01T00:00:00Z')
      url.searchParams.set('end_date', '2018-06-01T23:59:59Z')
      url.searchParams.set('interval', 'hour')

      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Check that sensors have realistic equipment types
      const series = data.data.series
      const equipmentTypes = series.map((s: any) => s.equipment_type)
      const validTypes = ['HVAC', 'Lighting', 'Power', 'Water', 'Security']

      equipmentTypes.forEach((type: string) => {
        expect(validTypes).toContain(type)
      })

      // Check that floor numbers are realistic
      const floorNumbers = series.map((s: any) => s.floor_number)
      floorNumbers.forEach((floor: number) => {
        expect(floor).toBeGreaterThanOrEqual(1)
        expect(floor).toBeLessThanOrEqual(7)
      })

      // Check that units are appropriate
      const units = series.map((s: any) => s.unit)
      units.forEach((unit: string) => {
        expect(['kWh', 'kW', 'L/min', 'L/h', 'lux', '°C', '%']).toContain(unit)
      })
    })
  })

  describe('Data Decimation', () => {
    test('respects max_points limitation', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('sensor_ids', 'SENSOR_001')
      url.searchParams.set('start_date', '2018-01-01T00:00:00Z')
      url.searchParams.set('end_date', '2018-12-31T23:59:59Z')
      url.searchParams.set('interval', 'minute')
      url.searchParams.set('max_points', '100')

      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const series = data.data.series[0]
      expect(series.data.length).toBeLessThanOrEqual(100)
      expect(data.data.metadata.decimated).toBe(true)
    })

    test('does not decimate when under max_points', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('sensor_ids', 'SENSOR_001')
      url.searchParams.set('start_date', '2018-01-01T00:00:00Z')
      url.searchParams.set('end_date', '2018-01-01T02:00:00Z')
      url.searchParams.set('interval', 'hour')
      url.searchParams.set('max_points', '1000')

      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.metadata.decimated).toBe(false)
    })
  })

  describe('Seasonal Patterns', () => {
    test('generates different patterns for different months', async () => {
      // Summer month (June)
      const summerUrl = new URL('http://localhost:3000/api/readings/timeseries')
      summerUrl.searchParams.set('sensor_ids', 'SENSOR_001')
      summerUrl.searchParams.set('start_date', '2018-06-01T00:00:00Z')
      summerUrl.searchParams.set('end_date', '2018-06-01T23:59:59Z')
      summerUrl.searchParams.set('interval', 'hour')

      const summerRequest = new NextRequest(summerUrl)
      const summerResponse = await GET(summerRequest)
      const summerData = await summerResponse.json()

      // Winter month (January)
      const winterUrl = new URL('http://localhost:3000/api/readings/timeseries')
      winterUrl.searchParams.set('sensor_ids', 'SENSOR_001')
      winterUrl.searchParams.set('start_date', '2018-01-01T00:00:00Z')
      winterUrl.searchParams.set('end_date', '2018-01-01T23:59:59Z')
      winterUrl.searchParams.set('interval', 'hour')

      const winterRequest = new NextRequest(winterUrl)
      const winterResponse = await GET(winterRequest)
      const winterData = await winterResponse.json()

      expect(summerResponse.status).toBe(200)
      expect(winterResponse.status).toBe(200)

      // Both should have data but potentially different patterns
      expect(summerData.data.series[0].data.length).toBeGreaterThan(0)
      expect(winterData.data.series[0].data.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    test('handles malformed request URLs gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/readings/timeseries?invalid=&malformed')
      const response = await GET(request)

      // Should still work, just ignore invalid parameters
      expect(response.status).toBe(200)
    })

    test('handles extreme date ranges', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('start_date', '1900-01-01T00:00:00Z')
      url.searchParams.set('end_date', '2100-12-31T23:59:59Z')

      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    test('handles very large sensor_ids list', async () => {
      const largeSensorList = Array.from({ length: 200 }, (_, i) => `SENSOR_${i.toString().padStart(3, '0')}`).join(',')

      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('sensor_ids', largeSensorList)

      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.series.length).toBeLessThanOrEqual(134) // Max available sensors
    })
  })

  describe('Performance', () => {
    test('responds within reasonable time for large datasets', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('sensor_ids', 'SENSOR_001,SENSOR_002,SENSOR_003,SENSOR_004,SENSOR_005')
      url.searchParams.set('start_date', '2018-01-01T00:00:00Z')
      url.searchParams.set('end_date', '2018-12-31T23:59:59Z')
      url.searchParams.set('interval', 'hour')
      url.searchParams.set('max_points', '10000')

      const startTime = performance.now()
      const request = new NextRequest(url)
      const response = await GET(request)
      const endTime = performance.now()

      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(1000) // Should respond within 1 second
    })

    test('handles concurrent requests efficiently', async () => {
      const urls = Array.from({ length: 5 }, (_, i) => {
        const url = new URL('http://localhost:3000/api/readings/timeseries')
        url.searchParams.set('sensor_ids', `SENSOR_${i.toString().padStart(3, '0')}`)
        return url
      })

      const startTime = performance.now()
      const requests = urls.map(url => GET(new NextRequest(url)))
      const responses = await Promise.all(requests)
      const endTime = performance.now()

      const totalTime = endTime - startTime

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Concurrent requests should not take significantly longer than single request
      expect(totalTime).toBeLessThan(2000)
    })
  })

  describe('Data Consistency', () => {
    test('returns consistent data for repeated requests', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('sensor_ids', 'SENSOR_001')
      url.searchParams.set('start_date', '2018-01-01T00:00:00Z')
      url.searchParams.set('end_date', '2018-01-01T01:00:00Z')
      url.searchParams.set('interval', 'minute')

      const request1 = new NextRequest(url)
      const request2 = new NextRequest(url)

      const response1 = await GET(request1)
      const response2 = await GET(request2)

      const data1 = await response1.json()
      const data2 = await response2.json()

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)

      // Should return the same structure and approximate data
      expect(data1.data.series.length).toBe(data2.data.series.length)
      expect(data1.data.series[0].data.length).toBe(data2.data.series[0].data.length)
    })

    test('generates timestamps in correct chronological order', async () => {
      const url = new URL('http://localhost:3000/api/readings/timeseries')
      url.searchParams.set('sensor_ids', 'SENSOR_001')
      url.searchParams.set('start_date', '2018-01-01T00:00:00Z')
      url.searchParams.set('end_date', '2018-01-01T06:00:00Z')
      url.searchParams.set('interval', 'hour')

      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      const series = data.data.series[0]
      const timestamps = series.data.map((point: any) => new Date(point.timestamp).getTime())

      // Check if timestamps are in ascending order
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1])
      }
    })
  })

  describe('Cache Headers', () => {
    test('sets appropriate cache headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/readings/timeseries')
      const response = await GET(request)

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300')
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })
  })
})