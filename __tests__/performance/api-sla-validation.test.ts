/**
 * Performance SLA Validation Tests
 * Testing response times and throughput requirements
 * QA Requirement: <500ms API response time SLA compliance
 */

import { NextRequest } from 'next/server'

// Import API route handlers for performance testing
import { GET as SummaryGET } from '../../app/api/readings/summary/route'
import { GET as TimeseriesGET } from '../../app/api/readings/timeseries/route'
import { GET as PatternsGET } from '../../app/api/readings/patterns/route'

// Mock environment for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

describe('API Performance SLA Validation', () => {
  beforeAll(() => {
    // Setup test environment with fetch mock
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers([['content-type', 'application/json']]),
        redirected: false,
        statusText: 'OK',
        type: 'basic' as ResponseType,
        url: 'https://test.com',
        body: null,
        bodyUsed: false,
        clone: jest.fn(),
        arrayBuffer: jest.fn(),
        blob: jest.fn(),
        bytes: jest.fn(),
        formData: jest.fn(),
        text: jest.fn(),
        json: () => Promise.resolve({
          success: true,
          data: {
            totalSensors: 100,
            activeSensors: 85,
            healthPercentage: 85.0,
            totalPowerConsumption: 250.5,
            averagePowerConsumption: 2.5,
            lastUpdated: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        })
      })
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Response Time SLA (<500ms)', () => {
    it('should complete summary API within 500ms', async () => {
      const iterations = 10
      const responseTimes: number[] = []

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        const request = new NextRequest('http://localhost:3000/api/readings/summary')
        const response = await SummaryGET(request)
        await response.json() // Ensure full response processing
        const endTime = performance.now()

        const responseTime = endTime - startTime
        responseTimes.push(responseTime)

        // Individual request should be under 500ms
        expect(responseTime).toBeLessThan(500)
      }

      // Calculate statistics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      const maxResponseTime = Math.max(...responseTimes)
      const minResponseTime = Math.min(...responseTimes)

      console.log(`Summary API Performance:
        - Average: ${avgResponseTime.toFixed(2)}ms
        - Maximum: ${maxResponseTime.toFixed(2)}ms
        - Minimum: ${minResponseTime.toFixed(2)}ms
        - 95th Percentile: ${responseTimes.sort((a, b) => a - b)[Math.floor(0.95 * responseTimes.length)].toFixed(2)}ms`)

      // SLA Requirements
      expect(avgResponseTime).toBeLessThan(500)
      expect(maxResponseTime).toBeLessThan(1000) // Allow some tolerance for max
    })

    it('should complete timeseries API within 500ms for small datasets', async () => {
      const iterations = 10
      const responseTimes: number[] = []

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        const request = new NextRequest('http://localhost:3000/api/readings/timeseries?limit=100')
        const response = await TimeseriesGET(request)
        await response.json()
        const endTime = performance.now()

        const responseTime = endTime - startTime
        responseTimes.push(responseTime)

        expect(responseTime).toBeLessThan(500)
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      console.log(`Timeseries API (limit=100) Average Response Time: ${avgResponseTime.toFixed(2)}ms`)
      expect(avgResponseTime).toBeLessThan(500)
    })

    it('should complete patterns API within 2000ms (complex analysis)', async () => {
      const iterations = 5 // Fewer iterations for complex endpoint
      const responseTimes: number[] = []

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        const request = new NextRequest('http://localhost:3000/api/readings/patterns')
        const response = await PatternsGET(request)
        await response.json()
        const endTime = performance.now()

        const responseTime = endTime - startTime
        responseTimes.push(responseTime)

        // Patterns API has more complex analysis, allow 2s SLA
        expect(responseTime).toBeLessThan(2000)
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      console.log(`Patterns API Average Response Time: ${avgResponseTime.toFixed(2)}ms`)
      expect(avgResponseTime).toBeLessThan(2000)
    })
  })

  describe('Throughput and Concurrency', () => {
    it('should handle 10 concurrent summary requests within SLA', async () => {
      const concurrentRequests = 10
      const startTime = performance.now()

      const promises = Array.from({ length: concurrentRequests }, async () => {
        const requestStart = performance.now()
        const request = new NextRequest('http://localhost:3000/api/readings/summary')
        const response = await SummaryGET(request)
        await response.json()
        const requestEnd = performance.now()
        return requestEnd - requestStart
      })

      const responseTimes = await Promise.all(promises)
      const totalTime = performance.now() - startTime

      // All individual requests should meet SLA
      responseTimes.forEach(responseTime => {
        expect(responseTime).toBeLessThan(500)
      })

      // Throughput calculation (requests per second)
      const throughput = concurrentRequests / (totalTime / 1000)
      console.log(`Concurrent Summary API Performance:
        - Total Time: ${totalTime.toFixed(2)}ms
        - Throughput: ${throughput.toFixed(2)} req/s
        - Average Response: ${(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2)}ms`)

      expect(throughput).toBeGreaterThan(10) // At least 10 req/s
    })

    it('should handle sustained load over time', async () => {
      const duration = 5000 // 5 seconds
      const requestInterval = 100 // Request every 100ms
      const requests: Promise<number>[] = []
      const startTime = performance.now()

      const intervalId = setInterval(() => {
        if (performance.now() - startTime >= duration) {
          clearInterval(intervalId)
          return
        }

        const requestPromise = (async () => {
          const reqStart = performance.now()
          const request = new NextRequest('http://localhost:3000/api/readings/summary')
          const response = await SummaryGET(request)
          await response.json()
          const reqEnd = performance.now()
          return reqEnd - reqStart
        })()

        requests.push(requestPromise)
      }, requestInterval)

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, duration + 1000))
      clearInterval(intervalId)

      const responseTimes = await Promise.all(requests)
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      const successfulRequests = responseTimes.filter(rt => rt < 500).length

      console.log(`Sustained Load Test:
        - Total Requests: ${requests.length}
        - Successful (< 500ms): ${successfulRequests}
        - Success Rate: ${((successfulRequests / requests.length) * 100).toFixed(1)}%
        - Average Response: ${avgResponseTime.toFixed(2)}ms`)

      // At least 95% of requests should meet SLA
      expect(successfulRequests / requests.length).toBeGreaterThan(0.95)
    }, 10000)

    it('should maintain performance under different load patterns', async () => {
      // Test burst load pattern
      const burstSize = 20
      const burstCount = 3
      const burstInterval = 1000

      for (let burst = 0; burst < burstCount; burst++) {
        const burstStart = performance.now()
        
        const burstPromises = Array.from({ length: burstSize }, async () => {
          const reqStart = performance.now()
          const request = new NextRequest('http://localhost:3000/api/readings/timeseries?limit=50')
          const response = await TimeseriesGET(request)
          await response.json()
          const reqEnd = performance.now()
          return reqEnd - reqStart
        })

        const burstTimes = await Promise.all(burstPromises)
        const burstDuration = performance.now() - burstStart
        const avgBurstTime = burstTimes.reduce((a, b) => a + b, 0) / burstTimes.length

        console.log(`Burst ${burst + 1}:
          - Duration: ${burstDuration.toFixed(2)}ms
          - Avg Response: ${avgBurstTime.toFixed(2)}ms
          - Requests/sec: ${(burstSize / (burstDuration / 1000)).toFixed(2)}`)

        // Each burst should maintain reasonable performance
        expect(avgBurstTime).toBeLessThan(1000) // Allow degradation under burst load

        // Wait between bursts
        if (burst < burstCount - 1) {
          await new Promise(resolve => setTimeout(resolve, burstInterval))
        }
      }
    }, 15000)
  })

  describe('Resource Usage and Memory', () => {
    it('should not cause memory leaks during repeated requests', async () => {
      const iterations = 100
      const memoryReadings: number[] = []

      // Get initial memory usage
      if (global.gc) {
        global.gc()
      }
      const initialMemory = process.memoryUsage().heapUsed

      for (let i = 0; i < iterations; i++) {
        const request = new NextRequest('http://localhost:3000/api/readings/summary')
        const response = await SummaryGET(request)
        await response.json()

        // Sample memory usage every 10 iterations
        if (i % 10 === 0) {
          const currentMemory = process.memoryUsage().heapUsed
          memoryReadings.push(currentMemory)
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      const finalMemory = process.memoryUsage().heapUsed

      const memoryGrowth = finalMemory - initialMemory
      const memoryGrowthMB = memoryGrowth / (1024 * 1024)

      console.log(`Memory Usage Test:
        - Initial: ${(initialMemory / (1024 * 1024)).toFixed(2)}MB
        - Final: ${(finalMemory / (1024 * 1024)).toFixed(2)}MB
        - Growth: ${memoryGrowthMB.toFixed(2)}MB`)

      // Memory growth should be reasonable (< 50MB for 100 requests)
      expect(memoryGrowthMB).toBeLessThan(50)
    }, 30000)

    it('should handle large response payloads efficiently', async () => {
      const startTime = performance.now()
      const request = new NextRequest('http://localhost:3000/api/readings/timeseries?limit=1000')
      const response = await TimeseriesGET(request)
      const result = await response.json()
      const endTime = performance.now()

      const responseTime = endTime - startTime
      const payloadSize = JSON.stringify(result).length

      console.log(`Large Payload Test:
        - Response Time: ${responseTime.toFixed(2)}ms
        - Payload Size: ${(payloadSize / 1024).toFixed(2)}KB
        - Throughput: ${(payloadSize / 1024 / (responseTime / 1000)).toFixed(2)}KB/s`)

      // Should handle large payloads within reasonable time
      expect(responseTime).toBeLessThan(2000)
      expect(payloadSize).toBeGreaterThan(1000) // Ensure we're actually testing large payloads
    })
  })

  describe('Performance Regression Detection', () => {
    it('should establish baseline performance metrics', async () => {
      const testCases = [
        { name: 'summary', handler: SummaryGET, url: 'http://localhost:3000/api/readings/summary', expectedMs: 500 },
        { name: 'timeseries-small', handler: TimeseriesGET, url: 'http://localhost:3000/api/readings/timeseries?limit=10', expectedMs: 500 },
        { name: 'timeseries-medium', handler: TimeseriesGET, url: 'http://localhost:3000/api/readings/timeseries?limit=100', expectedMs: 500 },
        { name: 'patterns', handler: PatternsGET, url: 'http://localhost:3000/api/readings/patterns', expectedMs: 2000 }
      ]

      const baselines: Record<string, number> = {}

      for (const testCase of testCases) {
        const iterations = 5
        const responseTimes: number[] = []

        for (let i = 0; i < iterations; i++) {
          const startTime = performance.now()
          const request = new NextRequest(testCase.url)
          const response = await testCase.handler(request)
          await response.json()
          const endTime = performance.now()

          responseTimes.push(endTime - startTime)
        }

        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        baselines[testCase.name] = avgResponseTime

        console.log(`${testCase.name} baseline: ${avgResponseTime.toFixed(2)}ms (SLA: ${testCase.expectedMs}ms)`)
        expect(avgResponseTime).toBeLessThan(testCase.expectedMs)
      }

      // Store baselines for future regression testing
      console.log('Performance Baselines:', JSON.stringify(baselines, null, 2))
    })

    it('should detect performance degradation', async () => {
      // Simulate a performance test that would detect regression
      const iterations = 10
      const responseTimes: number[] = []
      const expectedBaselineMs = 300 // Expected baseline for summary API

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        const request = new NextRequest('http://localhost:3000/api/readings/summary')
        const response = await SummaryGET(request)
        await response.json()
        const endTime = performance.now()

        responseTimes.push(endTime - startTime)
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      const regressionThreshold = expectedBaselineMs * 1.5 // 50% degradation threshold

      console.log(`Regression Detection:
        - Current Average: ${avgResponseTime.toFixed(2)}ms
        - Expected Baseline: ${expectedBaselineMs}ms
        - Regression Threshold: ${regressionThreshold.toFixed(2)}ms`)

      // Warn if performance has degraded significantly
      if (avgResponseTime > regressionThreshold) {
        console.warn(`⚠️  Performance regression detected! Current: ${avgResponseTime.toFixed(2)}ms, Expected: <${regressionThreshold.toFixed(2)}ms`)
      }

      // Should not exceed regression threshold
      expect(avgResponseTime).toBeLessThan(regressionThreshold)
    })
  })

  describe('Network and Latency Simulation', () => {
    it('should handle network delays gracefully', async () => {
      // Simulate network delay by adding artificial delay to mock
      const originalFetch = global.fetch
      const networkDelay = 100 // 100ms network delay

      global.fetch = jest.fn(() =>
        new Promise<Response>(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            headers: new Headers([['content-type', 'application/json']]),
            redirected: false,
            statusText: 'OK',
            type: 'basic' as ResponseType,
            url: 'https://test.com',
            body: null,
            bodyUsed: false,
            clone: jest.fn(),
            arrayBuffer: jest.fn(),
            blob: jest.fn(),
            bytes: jest.fn(),
            formData: jest.fn(),
            text: jest.fn(),
            json: () => Promise.resolve({
              success: true,
              data: { totalSensors: 10, activeSensors: 8 },
              timestamp: new Date().toISOString()
            })
          }), networkDelay)
        )
      )

      const startTime = performance.now()
      const request = new NextRequest('http://localhost:3000/api/readings/summary')
      const response = await SummaryGET(request)
      await response.json()
      const endTime = performance.now()

      const totalResponseTime = endTime - startTime
      console.log(`Network Delay Test: ${totalResponseTime.toFixed(2)}ms (includes ${networkDelay}ms simulated delay)`)

      // Should handle network delay and still provide reasonable total response time
      expect(totalResponseTime).toBeGreaterThan(networkDelay)
      expect(totalResponseTime).toBeLessThan(networkDelay + 500) // Processing should add < 500ms

      global.fetch = originalFetch
    })
  })
})