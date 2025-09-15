/**
 * Unit Tests for Summary API Endpoint
 * Testing business logic for dashboard metrics calculation
 * QA Requirement: 100% coverage for P0 critical functionality
 */

import { GET } from '../route'
import { NextRequest } from 'next/server'
import { r2Client } from '@/lib/r2-client'

// Mock R2 client
jest.mock('@/lib/r2-client')
const mockR2Client = r2Client as jest.Mocked<typeof r2Client>

describe('GET /api/readings/summary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Happy Path Scenarios', () => {
    it('should return dashboard metrics with healthy sensors', async () => {
      const mockMetrics = {
        total_sensors: 3,
        active_sensors: 3,
        offline_sensors: 0,
        total_power_consumption: 7.5,
        avg_power_consumption: 2.5,
        failure_count_24h: 0,
        health_percentage: 100,
        last_updated: '2025-01-12T10:00:00Z'
      }

      mockR2Client.getMetrics.mockResolvedValueOnce(mockMetrics)

      const request = new NextRequest('http://localhost:3000/api/readings/summary')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        total_sensors: 3,
        active_sensors: 3,
        health_percentage: 100,
        total_power_consumption: 7.5,
        avg_power_consumption: 2.5
      })
      expect(result.data.last_updated).toBeDefined()
      expect(mockR2Client.getMetrics).toHaveBeenCalledWith('24h')
    })

    it('should calculate correct metrics with mixed sensor statuses', async () => {
      const mockMixedMetrics = {
        total_sensors: 4,
        active_sensors: 2,
        offline_sensors: 2,
        total_power_consumption: 7.5,
        avg_power_consumption: 1.875,
        failure_count_24h: 2,
        health_percentage: 50,
        last_updated: '2025-01-12T10:00:00Z'
      }

      mockR2Client.getMetrics.mockResolvedValueOnce(mockMixedMetrics)

      const request = new NextRequest('http://localhost:3000/api/readings/summary')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        total_sensors: 4,
        active_sensors: 2,
        health_percentage: 50,
        total_power_consumption: 7.5,
        avg_power_consumption: 1.875
      })
    })

    it('should handle empty dataset gracefully', async () => {
      const mockEmptyMetrics = {
        total_sensors: 0,
        active_sensors: 0,
        offline_sensors: 0,
        total_power_consumption: 0,
        avg_power_consumption: 0,
        failure_count_24h: 0,
        health_percentage: 0,
        last_updated: '2025-01-12T10:00:00Z'
      }

      mockR2Client.getMetrics.mockResolvedValueOnce(mockEmptyMetrics)

      const request = new NextRequest('http://localhost:3000/api/readings/summary')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        total_sensors: 0,
        active_sensors: 0,
        health_percentage: 0,
        total_power_consumption: 0,
        avg_power_consumption: 0
      })
    })
  })

  describe('Error Scenarios', () => {
    it('should handle R2 client error', async () => {
      mockR2Client.getMetrics.mockRejectedValueOnce(new Error('R2 connection failed'))

      const request = new NextRequest('http://localhost:3000/api/readings/summary')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle R2 fetch timeout', async () => {
      mockR2Client.getMetrics.mockRejectedValueOnce(new Error('Fetch timeout'))

      const request = new NextRequest('http://localhost:3000/api/readings/summary')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle unexpected R2 errors', async () => {
      mockR2Client.getMetrics.mockRejectedValueOnce(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost:3000/api/readings/summary')
      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Response Structure Validation', () => {
    it('should return consistent ApiResponse structure', async () => {
      const mockMetrics = {
        total_sensors: 1,
        active_sensors: 1,
        offline_sensors: 0,
        total_power_consumption: 2.5,
        avg_power_consumption: 2.5,
        failure_count_24h: 0,
        health_percentage: 100,
        last_updated: '2025-01-12T10:00:00Z'
      }

      mockR2Client.getMetrics.mockResolvedValueOnce(mockMetrics)

      const request = new NextRequest('http://localhost:3000/api/readings/summary')
      const response = await GET(request)
      const result = await response.json()

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('data')
      expect(typeof result.success).toBe('boolean')

      expect(result.data).toHaveProperty('total_sensors')
      expect(result.data).toHaveProperty('active_sensors')
      expect(result.data).toHaveProperty('health_percentage')
      expect(result.data).toHaveProperty('total_power_consumption')
      expect(result.data).toHaveProperty('avg_power_consumption')
      expect(result.data).toHaveProperty('last_updated')
    })
  })
})