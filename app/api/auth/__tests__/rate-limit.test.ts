/**
 * Tests for Authentication Rate Limiting API
 * MVP-focused testing for core functionality
 */

import { NextRequest } from 'next/server'
import { GET } from '../rate-limit/route'

// Mock the rate limiting module
jest.mock('@/lib/auth/rate-limiting', () => ({
  isRateLimited: jest.fn(),
  getRemainingAttempts: jest.fn(),
  getRateLimitStatus: jest.fn(),
}))

import {
  isRateLimited,
  getRemainingAttempts,
  getRateLimitStatus,
} from '@/lib/auth/rate-limiting'

const mockIsRateLimited = isRateLimited as jest.MockedFunction<typeof isRateLimited>
const mockGetRemainingAttempts = getRemainingAttempts as jest.MockedFunction<typeof getRemainingAttempts>
const mockGetRateLimitStatus = getRateLimitStatus as jest.MockedFunction<typeof getRateLimitStatus>

describe('/api/auth/rate-limit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return rate limit status for IP', async () => {
      // Arrange
      const testIP = '127.0.0.1'
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/rate-limit', {
        headers: {
          'x-forwarded-for': testIP,
        },
      })

      mockIsRateLimited.mockReturnValue(false)
      mockGetRemainingAttempts.mockReturnValue(5)
      mockGetRateLimitStatus.mockReturnValue({
        ip: {
          attempts: 0,
          blocked: false,
          resetTime: 0,
          remaining: 5,
        },
        global: {
          attempts: 0,
          blocked: false,
          resetTime: 0,
        },
      })

      // Act
      const response = await GET(mockRequest)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.ip).toBe(testIP)
      expect(data.data.isRateLimited).toBe(false)
      expect(data.data.remainingAttempts).toBe(5)
      expect(mockIsRateLimited).toHaveBeenCalledWith(testIP)
      expect(mockGetRemainingAttempts).toHaveBeenCalledWith(testIP)
      expect(mockGetRateLimitStatus).toHaveBeenCalledWith(testIP)
    })

    it('should handle rate limited IP', async () => {
      // Arrange
      const testIP = '192.168.1.100'
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/rate-limit', {
        headers: {
          'x-forwarded-for': testIP,
        },
      })

      mockIsRateLimited.mockReturnValue(true)
      mockGetRemainingAttempts.mockReturnValue(0)
      mockGetRateLimitStatus.mockReturnValue({
        ip: {
          attempts: 5,
          blocked: true,
          resetTime: Date.now() + 900000, // 15 minutes
          remaining: 0,
        },
        global: {
          attempts: 0,
          blocked: false,
          resetTime: 0,
        },
      })

      // Act
      const response = await GET(mockRequest)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.isRateLimited).toBe(true)
      expect(data.data.remainingAttempts).toBe(0)
    })

    it('should handle missing IP gracefully', async () => {
      // Arrange
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/rate-limit')

      mockIsRateLimited.mockReturnValue(false)
      mockGetRemainingAttempts.mockReturnValue(5)
      mockGetRateLimitStatus.mockReturnValue({
        ip: {
          attempts: 0,
          blocked: false,
          resetTime: 0,
          remaining: 5,
        },
        global: {
          attempts: 0,
          blocked: false,
          resetTime: 0,
        },
      })

      // Act
      const response = await GET(mockRequest)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.ip).toBe('unknown')
      expect(mockIsRateLimited).toHaveBeenCalledWith('unknown')
    })

    it('should handle errors gracefully', async () => {
      // Arrange
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/rate-limit')
      mockIsRateLimited.mockImplementation(() => {
        throw new Error('Rate limiting service unavailable')
      })

      // Act
      const response = await GET(mockRequest)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to check rate limit')
    })
  })
})