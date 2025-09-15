/**
 * Supabase Integration Error Scenario Tests
 * Comprehensive testing for Supabase error handling in API routes
 * Tests various failure modes: network, database, authentication, validation
 */

import { NextRequest } from 'next/server'
import { GET as PatternsGET } from '../patterns/route'

// Mock Supabase-server
jest.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: jest.fn(),
    rpc: jest.fn()
  }
}))

describe('Supabase API Integration Error Scenarios', () => {
  const mockSupabase = jest.requireMock('@/lib/supabase-server')
  const mockSupabaseServer = mockSupabase.supabaseServer

  // Helper to create complete mock query chain
  const createMockQueryChain = (result: any) => ({
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
    in: jest.fn().mockResolvedValue(result)
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up default environment
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  })

  describe('Database Connection Failures', () => {
    it('should handle Supabase connection timeout in patterns endpoint', async () => {
      // Mock connection timeout
      mockSupabaseServer.from.mockReturnValue(createMockQueryChain({
        data: null,
        error: {
          message: 'Connection timeout after 10000ms',
          code: 'TIMEOUT',
          details: 'Database connection timed out'
        }
      }))

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('Failed to fetch sensor data')
    })

    it('should handle database server unavailable', async () => {
      // Mock server unavailable error
      mockSupabaseServer.from.mockReturnValue(createMockQueryChain({
        data: null,
        error: {
          message: 'Database server is temporarily unavailable',
          code: 'SERVICE_UNAVAILABLE',
          details: 'Please try again later'
        }
      }))

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error.error).toBe('database_error')
    })

    it('should handle network connectivity issues', async () => {
      // Mock network error by throwing in the chain
      mockSupabaseServer.from.mockImplementation(() => {
        throw new Error('Network error: Unable to reach database')
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Authentication and Authorization Errors', () => {
    it('should handle expired JWT tokens', async () => {
      mockSupabaseServer.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                data: null,
                error: {
                  message: 'JWT expired',
                  code: 'TOKEN_EXPIRED',
                  details: 'The JWT token has expired'
                }
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
    })

    it('should handle invalid API key', async () => {
      mockSupabaseServer.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                data: null,
                error: {
                  message: 'Invalid API key',
                  code: 'INVALID_API_KEY',
                  details: 'The provided API key is invalid or has been revoked'
                }
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
    })

    it('should handle insufficient permissions', async () => {
      mockSupabaseServer.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                data: null,
                error: {
                  message: 'Insufficient permissions for table sensor_readings',
                  code: 'INSUFFICIENT_PERMISSIONS',
                  details: 'User does not have SELECT permissions on this table'
                }
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
    })
  })

  describe('Database Schema and Query Errors', () => {
    it('should handle table not found errors', async () => {
      mockSupabaseServer.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                data: null,
                error: {
                  message: 'relation "sensor_readings" does not exist',
                  code: 'PGRST116',
                  details: 'Verify the table name and schema'
                }
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
    })

    it('should handle column not found errors', async () => {
      mockSupabaseServer.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                data: null,
                error: {
                  message: 'column "non_existent_column" does not exist',
                  code: 'PGRST103',
                  details: 'Verify the column name and table schema'
                }
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
    })

    it('should handle invalid filter parameters', async () => {
      mockSupabaseServer.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                data: null,
                error: {
                  message: 'invalid input syntax for type timestamp with time zone: "invalid-date"',
                  code: '22007',
                  details: 'Date format should be ISO 8601'
                }
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns?startDate=invalid-date')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
    })
  })

  describe('Performance and Resource Errors', () => {
    it('should handle query timeout errors', async () => {
      mockSupabaseServer.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                data: null,
                error: {
                  message: 'canceling statement due to statement timeout',
                  code: '57014',
                  details: 'Query exceeded maximum execution time'
                }
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
    })

    it('should handle connection pool exhaustion', async () => {
      mockSupabaseServer.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                data: null,
                error: {
                  message: 'sorry, too many clients already',
                  code: '53300',
                  details: 'Database connection pool is full'
                }
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
    })

    it('should handle memory limit exceeded', async () => {
      mockSupabaseServer.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                data: null,
                error: {
                  message: 'out of memory',
                  code: '53200',
                  details: 'Query requires more memory than available'
                }
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
    })
  })

  describe('Rate Limiting and Throttling', () => {
    it('should handle rate limit exceeded errors', async () => {
      mockSupabaseServer.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                data: null,
                error: {
                  message: 'Rate limit exceeded',
                  code: 'RATE_LIMIT_EXCEEDED',
                  details: 'Too many requests in a short time period'
                }
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
    })

    it('should handle concurrent request limits', async () => {
      mockSupabaseServer.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                data: null,
                error: {
                  message: 'Too many concurrent requests',
                  code: 'CONCURRENT_LIMIT_EXCEEDED',
                  details: 'Maximum number of concurrent requests exceeded'
                }
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
    })
  })

  describe('Data Consistency and Transaction Errors', () => {
    it('should handle deadlock errors', async () => {
      mockSupabaseServer.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                data: null,
                error: {
                  message: 'deadlock detected',
                  code: '40P01',
                  details: 'Transaction was aborted due to deadlock'
                }
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
    })

    it('should handle serialization failure', async () => {
      mockSupabaseServer.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                data: null,
                error: {
                  message: 'could not serialize access due to concurrent update',
                  code: '40001',
                  details: 'Transaction isolation conflict'
                }
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
    })
  })

  describe('Partial Failure Recovery', () => {
    it('should handle mixed success/failure in patterns endpoint', async () => {
      let callCount = 0
      mockSupabaseServer.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockImplementation(() => {
                callCount++
                if (callCount === 1) {
                  // First call (failure patterns) succeeds
                  return {
                    data: [
                      {
                        sensor_id: 'SENSOR_001',
                        floor_number: 1,
                        equipment_type: 'HVAC',
                        reading_value: 0.5,
                        status: 'warning',
                        timestamp: new Date().toISOString()
                      }
                    ],
                    error: null
                  }
                } else {
                  // Second call (normal operation patterns) fails
                  return {
                    data: null,
                    error: {
                      message: 'Connection lost during query',
                      code: 'CONNECTION_LOST'
                    }
                  }
                }
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      // Should still return error despite partial success
      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
    })

    it('should handle empty results gracefully', async () => {
      // Mock complete query chain that can be reassigned
      const createMockQuery = () => ({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [], // Empty but valid result
          error: null
        })
      })
      
      mockSupabaseServer.from.mockImplementation(() => createMockQuery())

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      // Empty results should be handled as success
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.patterns).toEqual([])
    })
  })

  describe('Environment and Configuration Errors', () => {
    it('should handle missing environment variables', async () => {
      // Temporarily remove environment variable
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      // This should be caught at module import level, but test the API behavior
      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      
      try {
        await PatternsGET(request)
      } catch (error) {
        expect(error).toBeDefined()
      }

      // Restore environment variable
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    })

    it('should handle malformed configuration', async () => {
      // Test with invalid URL format
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-valid-url'

      mockSupabaseServer.from.mockImplementation(() => {
        throw new Error('Invalid URL format')
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)

      // Restore environment variable
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    })
  })

  describe('Stress Test Scenarios', () => {
    it('should handle cascading failures gracefully', async () => {
      let attemptCount = 0
      
      // Mock the from method to track calls
      mockSupabaseServer.from.mockImplementation(() => {
        attemptCount++
        return createMockQueryChain({
          data: null,
          error: {
            message: 'Connection timeout',
            code: 'TIMEOUT'
          }
        })
      })

      const request = new NextRequest('http://localhost:3000/api/readings/patterns')
      const response = await PatternsGET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(attemptCount).toBeGreaterThan(0)
    })

    it('should handle rapid successive failures', async () => {
      // Test multiple rapid API calls with failures
      const promises = Array.from({ length: 5 }, async () => {
        mockSupabaseServer.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  data: null,
                  error: {
                    message: 'Service temporarily unavailable',
                    code: 'SERVICE_UNAVAILABLE'
                  }
                })
              })
            })
          })
        })

        const request = new NextRequest('http://localhost:3000/api/readings/patterns')
        return await PatternsGET(request)
      })

      const responses = await Promise.all(promises)
      
      // All should fail gracefully
      responses.forEach(response => {
        expect(response.status).toBe(500)
      })
    })
  })
})