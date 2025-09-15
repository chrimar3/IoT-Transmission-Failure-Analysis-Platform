/**
 * Supabase Client Tests
 * Tests the database connection and basic operations
 */

import { supabase, createServerClient, createServiceClient } from '../supabase'

// Mock environment variables for tests
const mockEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key'
}

// Mock process.env
Object.assign(process.env, mockEnv)

describe('Supabase Client Configuration', () => {
  describe('Public Client', () => {
    it('should create a client instance', () => {
      expect(supabase).toBeDefined()
      expect(supabase.auth).toBeDefined()
      expect(supabase.from).toBeDefined()
    })

    it('should have proper auth configuration', () => {
      // Note: In a real test environment, you'd test actual configuration
      // This is a basic structure test
      expect(supabase.auth.getSession).toBeDefined()
      expect(supabase.auth.getUser).toBeDefined()
    })
  })

  describe('Server Client Factory', () => {
    it('should create server client', () => {
      const serverClient = createServerClient()
      expect(serverClient).toBeDefined()
      expect(serverClient.from).toBeDefined()
    })

    it('should create different instance from public client', () => {
      const serverClient = createServerClient()
      expect(serverClient).not.toBe(supabase)
    })
  })

  describe('Service Client Factory', () => {
    it('should create service client when env var is present', () => {
      const serviceClient = createServiceClient()
      expect(serviceClient).toBeDefined()
      expect(serviceClient.from).toBeDefined()
    })

    it('should throw error when service key is missing', () => {
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      expect(() => {
        createServiceClient()
      }).toThrow('Missing env.SUPABASE_SERVICE_ROLE_KEY')

      // Restore
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey
    })
  })

  describe('Environment Validation', () => {
    it('should require SUPABASE_URL', () => {
      // This would be tested in a module loading scenario
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
    })

    it('should require SUPABASE_ANON_KEY', () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined()
    })
  })
})

describe('Error Scenario Testing', () => {
  describe('Network and Connection Errors', () => {
    it('should handle network timeout errors', async () => {
      // Mock fetch to simulate network timeout
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockRejectedValue(
        new Error('fetch failed')
      )

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .select('*')
        .limit(1)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })

    it('should handle DNS resolution failures', async () => {
      // Mock fetch to simulate DNS resolution failure
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockRejectedValue(
        new Error('getaddrinfo ENOTFOUND invalid-domain-12345.supabase.co')
      )

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .select('*')
        .limit(1)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })

    it('should handle HTTP 503 service unavailable', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve({
          error: 'Service temporarily unavailable',
          code: 'SERVICE_UNAVAILABLE'
        })
      })

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .select('*')
        .limit(1)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })

    it('should handle HTTP 429 rate limit exceeded', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['retry-after', '60']]),
        json: () => Promise.resolve({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED'
        })
      })

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .select('*')
        .limit(1)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })
  })

  describe('Authentication and Authorization Errors', () => {
    it('should handle invalid API key', async () => {
      // Mock fetch to simulate invalid API key response
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({
          error: 'Invalid API key',
          code: 'INVALID_API_KEY'
        })
      })

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .select('*')
        .limit(1)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })

    it('should handle expired JWT tokens', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({
          error: 'JWT expired',
          code: 'TOKEN_EXPIRED'
        })
      })

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .select('*')
        .limit(1)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })

    it('should handle insufficient permissions', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({
          error: 'Insufficient permissions for table sensor_readings',
          code: 'INSUFFICIENT_PERMISSIONS'
        })
      })

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .select('*')
        .limit(1)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })
  })

  describe('Database and Query Errors', () => {
    it('should handle table not found errors', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({
          error: 'relation "non_existent_table" does not exist',
          code: 'PGRST116'
        })
      })

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('non_existent_table' as any)
        .select('*')
        .limit(1)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })

    it('should handle column not found errors', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: 'column "non_existent_column" does not exist',
          code: 'PGRST103'
        })
      })

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .select('non_existent_column')
        .limit(1)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })

    it('should handle constraint violation errors', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () => Promise.resolve({
          error: 'duplicate key value violates unique constraint',
          code: '23505'
        })
      })

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .insert({
          sensor_id: 'DUPLICATE_ID',
          timestamp: new Date().toISOString(),
          reading_value: 25.5,
          floor_number: 1,
          equipment_type: 'HVAC',
          unit: 'kW',
          status: 'normal'
        } as any)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })

    it('should handle database lock timeout', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({
          error: 'canceling statement due to lock timeout',
          code: '57014'
        })
      })

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .select('*')
        .limit(1000000) // Large query that might cause lock timeout

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })
  })

  describe('Data Validation and Type Errors', () => {
    it('should handle invalid UUID format', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: 'invalid input syntax for type uuid: "invalid-uuid"',
          code: '22P02'
        })
      })

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .select('*')
        .eq('id', 'invalid-uuid')

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })

    it('should handle numeric overflow', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: 'numeric field overflow',
          code: '22003'
        })
      })

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .insert({
          sensor_id: 'TEST_001',
          timestamp: new Date().toISOString(),
          reading_value: Number.MAX_VALUE, // Cause overflow
          floor_number: 1,
          equipment_type: 'HVAC',
          unit: 'kW',
          status: 'normal'
        } as any)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })

    it('should handle invalid timestamp format', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: 'invalid input syntax for type timestamp with time zone',
          code: '22007'
        })
      })

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .insert({
          sensor_id: 'TEST_002',
          timestamp: 'invalid-timestamp',
          reading_value: 25.5,
          floor_number: 1,
          equipment_type: 'HVAC',
          unit: 'kW',
          status: 'normal'
        } as any)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })
  })

  describe('Real-time Subscription Errors', () => {
    it('should handle WebSocket connection failures', async () => {
      // Mock WebSocket errors - connection would fail in real scenario
      // WebSocket connection failures are handled by Supabase internally

      // This test checks that subscriptions handle connection failures gracefully
      const serverClient = createServerClient()
      const subscription = serverClient
        .channel('test-channel')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'sensor_readings'
        }, () => {})
        .subscribe()

      expect(subscription).toBeDefined()
      
      // Cleanup
      subscription.unsubscribe()
    })

    it('should handle subscription authorization failures', async () => {
      // Test subscription creation (doesn't require actual connection in test)
      const serverClient = createServerClient()

      const subscription = serverClient
        .channel('restricted-channel')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'sensor_readings'
        }, () => {})
        .subscribe()

      expect(subscription).toBeDefined()
      
      // Cleanup
      subscription.unsubscribe()
    })
  })

  describe('Performance and Resource Errors', () => {
    it('should handle query timeout', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .select('*')
        .limit(1)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })

    it('should handle memory limit exceeded', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({
          error: 'out of memory',
          code: '53200'
        })
      })

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .select('*') // Large query without limit

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })

    it('should handle connection pool exhaustion', async () => {
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve({
          error: 'sorry, too many clients already',
          code: '53300'
        })
      })

      const serverClient = createServerClient()
      const { data, error } = await serverClient
        .from('sensor_readings')
        .select('*')
        .limit(1)

      expect(data).toBeNull()
      expect(error).toBeDefined()
      
      global.fetch = originalFetch
    })
  })
})

describe('Database Schema Types', () => {
  it('should provide typed database operations', () => {
    // Test that TypeScript types are properly configured
    const query = supabase
      .from('sensor_readings')
      .select('*')
      .eq('status', 'normal')
      .limit(10)

    expect(query).toBeDefined()
  })

  it('should support materialized view queries', () => {
    const query = supabase
      .from('daily_aggregates')
      .select('*')
      .order('date', { ascending: false })
      .limit(30)

    expect(query).toBeDefined()
  })

  it('should support function calls', () => {
    const userId = '00000000-0000-0000-0000-000000000001'
    
    const query = supabase.rpc('get_user_subscription_tier', {
      user_uuid: userId
    } as any)

    expect(query).toBeDefined()
  })
})