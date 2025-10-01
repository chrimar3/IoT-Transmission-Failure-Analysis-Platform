/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/patterns/detect/route'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

// Mock the algorithms
jest.mock('@/lib/algorithms/StatisticalAnomalyDetector')
jest.mock('@/lib/algorithms/RecommendationEngine')

// Mock dynamic imports
const mockRecommendationEngineClass = jest.fn()
jest.doMock('@/lib/algorithms/RecommendationEngine', () => ({
  RecommendationEngine: mockRecommendationEngineClass
}))

// Note: UserSubscriptionService is not used in the patterns/detect route
// The route checks subscription tier directly from the session

import { getServerSession } from 'next-auth'
import { StatisticalAnomalyDetector } from '@/lib/algorithms/StatisticalAnomalyDetector'
import { RecommendationEngine } from '@/lib/algorithms/RecommendationEngine'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// Mock implementations
const mockDetectAnomalies = jest.fn()
const mockGenerateRecommendations = jest.fn()

jest.mocked(StatisticalAnomalyDetector).mockImplementation((config: Partial<any>) => ({
  detectAnomalies: mockDetectAnomalies
} as any))

jest.mocked(RecommendationEngine).mockImplementation(() => ({
  generateRecommendations: mockGenerateRecommendations
} as any))

describe('/api/patterns/detect', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user_123', email: 'test@cu-bems.com', subscriptionTier: 'professional' }
    } as unknown)

    mockDetectAnomalies.mockResolvedValue({
      success: true,
      patterns: [],
      anomalies: [], // Alias for backward compatibility
      statistics: null, // For test compatibility
      statistical_summary: {
        total_points_analyzed: 100,
        anomalies_detected: 0,
        confidence_distribution: { high: 0, medium: 0, low: 0 },
        processing_time_ms: 150
      },
      performance_metrics: {
        algorithm_efficiency: 0.95,
        memory_usage_mb: 50,
        throughput_points_per_second: 666.67
      }
    })

    mockGenerateRecommendations.mockResolvedValue([])
  })

  describe('authentication', () => {
    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '24h'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Authentication required')
    })

    it('should accept valid authenticated requests', async () => {
      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '24h'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('request validation', () => {
    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}) // Missing required fields
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request data')
      expect(data.validation_errors).toBeDefined()
      expect(data.validation_errors).toHaveLength(2) // sensor_ids and time_window are required
      expect(data.validation_errors.some((err: any) => err.field === 'sensor_ids')).toBe(true)
      expect(data.validation_errors.some((err: any) => err.field === 'time_window')).toBe(true)
    })

    it('should validate sensor_ids array', async () => {
      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: 'invalid', // Should be array
          time_window: '24h'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.validation_errors).toBeDefined()
    })

    it('should validate time_window enum', async () => {
      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: 'invalid_window'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate confidence_threshold range', async () => {
      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '24h',
          confidence_threshold: 150 // Invalid range
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should accept valid optional parameters', async () => {
      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001', 'SENSOR_002'],
          time_window: '7d',
          severity_filter: ['critical', 'warning'],
          confidence_threshold: 85,
          pattern_types: ['anomaly', 'trend'],
          include_recommendations: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('subscription limits', () => {
    it('should enforce free tier sensor limits', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user_123', email: 'test@cu-bems.com', subscriptionTier: 'free' }
      } as unknown)

      // The route checks user tier directly from session, not subscription service
      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: Array.from({ length: 10 }, (_, i) => `SENSOR_${i + 1}`),
          time_window: '24h'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Subscription limit exceeded')
      expect(data.upgrade_required).toBe(true)
    })

    it('should allow professional tier higher limits', async () => {
      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: Array.from({ length: 25 }, (_, i) => `SENSOR_${i + 1}`),
          time_window: '24h'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should enforce free tier time window restrictions', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user_123', email: 'test@cu-bems.com', subscriptionTier: 'free' }
      } as unknown)

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '30d'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Subscription limit exceeded')
      expect(data.upgrade_required).toBe(true)
    })
  })

  describe('pattern detection', () => {
    it('should successfully detect patterns', async () => {
      const mockPatterns = [
        {
          id: 'pattern_001',
          timestamp: '2025-01-15T10:30:00Z',
          sensor_id: 'SENSOR_001',
          equipment_type: 'HVAC',
          floor_number: 3,
          pattern_type: 'anomaly',
          severity: 'warning',
          confidence_score: 85,
          description: 'Temperature anomaly detected',
          data_points: [],
          recommendations: [],
          acknowledged: false,
          created_at: '2025-01-15T10:30:00Z',
          metadata: {}
        }
      ]

      mockDetectAnomalies.mockResolvedValue({
        success: true,
        patterns: mockPatterns,
        anomalies: mockPatterns,
        statistics: null,
        statistical_summary: {
          total_points_analyzed: 1000,
          anomalies_detected: 1,
          confidence_distribution: { high: 1, medium: 0, low: 0 },
          processing_time_ms: 250
        },
        performance_metrics: {
          algorithm_efficiency: 0.92,
          memory_usage_mb: 75,
          throughput_points_per_second: 4000
        }
      })

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '24h'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.patterns).toHaveLength(1)
      expect(data.data.patterns[0]).toMatchObject({
        id: 'pattern_001',
        sensor_id: 'SENSOR_001',
        pattern_type: 'anomaly',
        severity: 'warning'
      })
      expect(data.data.summary.total_patterns).toBe(1)
    })

    it('should include recommendations when requested', async () => {
      // Mock professional user session for recommendations
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'test@cu-bems.com',
          subscriptionTier: 'professional'
        }
      } as unknown)

      const mockRecommendations = [
        {
          id: 'rec_001',
          priority: 'medium',
          action_type: 'inspection',
          description: 'Inspect HVAC temperature sensors',
          estimated_cost: 500,
          estimated_savings: 2000,
          time_to_implement_hours: 4,
          required_expertise: 'technician',
          maintenance_category: 'preventive',
          success_probability: 85
        }
      ]

      mockDetectAnomalies.mockResolvedValue({
        success: true,
        patterns: [{
          id: 'pattern_001',
          sensor_id: 'SENSOR_001',
          pattern_type: 'anomaly',
          severity: 'warning',
          confidence_score: 0.85,
          start_timestamp: '2025-09-23T10:00:00Z',
          end_timestamp: '2025-09-23T10:30:00Z',
          description: 'Anomalous reading detected',
          recommendations: []
        }],
        anomalies: [{
          id: 'pattern_001',
          recommendations: []
        }],
        statistics: null,
        statistical_summary: {
          total_points_analyzed: 500,
          anomalies_detected: 1,
          confidence_distribution: { high: 0, medium: 1, low: 0 },
          processing_time_ms: 200
        },
        performance_metrics: {
          algorithm_efficiency: 0.88,
          memory_usage_mb: 60,
          throughput_points_per_second: 2500
        }
      } as unknown)

      mockGenerateRecommendations.mockResolvedValue([{
        id: 'pattern_001',
        recommendations: mockRecommendations
      }])


      // Set up the dynamic import mock
      mockRecommendationEngineClass.mockImplementation(() => ({
        generateRecommendations: mockGenerateRecommendations
      }))

      mockDetectAnomalies.mockImplementation((...args) => {
        return Promise.resolve({
          success: true,
          patterns: [{
            id: 'pattern_001',
            sensor_id: 'SENSOR_001',
            pattern_type: 'anomaly',
            severity: 'warning',
            confidence_score: 0.85,
            start_timestamp: '2025-09-23T10:00:00Z',
            end_timestamp: '2025-09-23T10:30:00Z',
            description: 'Anomalous reading detected',
            recommendations: []
          }],
          anomalies: [],
          statistics: null,
          statistical_summary: {
            total_points_analyzed: 500,
            anomalies_detected: 1,
            confidence_distribution: { high: 0, medium: 1, low: 0 },
            processing_time_ms: 200
          },
          performance_metrics: {
            algorithm_efficiency: 0.88,
            memory_usage_mb: 60,
            throughput_points_per_second: 2500
          }
        })
      })

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '24h',
          include_recommendations: true,
          confidence_threshold: 0.5,
          severity_filter: ['warning', 'critical']
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.patterns[0].recommendations).toHaveLength(1)
      expect(data.data.patterns[0].recommendations[0]).toMatchObject({
        id: 'rec_001',
        action_type: 'inspection'
      })
    })

    it('should handle detection algorithm failures', async () => {
      mockDetectAnomalies.mockResolvedValue({
        success: false,
        error: 'Algorithm processing error',
        patterns: [],
        anomalies: [],
        statistics: null,
        statistical_summary: {
          total_points_analyzed: 0,
          anomalies_detected: 0,
          confidence_distribution: {},
          processing_time_ms: 0
        },
        performance_metrics: {
          algorithm_efficiency: 0,
          memory_usage_mb: 0,
          throughput_points_per_second: 0
        }
      })

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '24h'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Pattern detection failed')
      expect(data.details).toBe('Algorithm processing error')
    })

    it('should handle recommendation generation failures gracefully', async () => {
      mockDetectAnomalies.mockResolvedValue({
        success: true,
        patterns: [{ id: 'pattern_001', recommendations: [] }],
        anomalies: [{ id: 'pattern_001', recommendations: [] }],
        statistics: null,
        statistical_summary: {
          total_points_analyzed: 300,
          anomalies_detected: 1,
          confidence_distribution: { high: 0, medium: 0, low: 1 },
          processing_time_ms: 180
        },
        performance_metrics: {
          algorithm_efficiency: 0.75,
          memory_usage_mb: 45,
          throughput_points_per_second: 1666
        }
      } as unknown)

      mockGenerateRecommendations.mockRejectedValue(new Error('Recommendation engine error'))

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '24h',
          include_recommendations: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      // Should still return patterns without recommendations
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.patterns).toBeDefined()
      expect(data.warnings).toContain('Failed to generate recommendations')
    })
  })

  describe('performance and monitoring', () => {
    it('should include performance metrics in response', async () => {
      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '24h'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.analysis_metadata).toBeDefined()
      expect(data.data.analysis_metadata.analysis_duration_ms).toBeGreaterThan(0)
      expect(data.data.analysis_metadata.sensors_analyzed).toBe(1)
      expect(data.data.analysis_metadata.performance_metrics).toBeDefined()
    })

    it('should log audit trail information', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '24h'
        })
      })

      await POST(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Pattern detection request:',
        expect.objectContaining({
          user_id: 'user_123',
          sensor_count: 1,
          time_window: '24h'
        })
      )

      consoleSpy.mockRestore()
    })

    it('should handle timeout scenarios', async () => {
      // Mock a long-running detection
      mockDetectAnomalies.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          patterns: [],
          anomalies: [],
          statistics: null,
          statistical_summary: {
            total_points_analyzed: 250,
            anomalies_detected: 0,
            confidence_distribution: {},
            processing_time_ms: 100
          },
          performance_metrics: {
            algorithm_efficiency: 0.9,
            memory_usage_mb: 40,
            throughput_points_per_second: 2500
          }
        }), 100))
      )

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '24h'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    }, 10000)
  })

  describe('error handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid JSON')
    })

    it('should provide helpful error messages', async () => {
      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: [],
          time_window: '24h'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request data')
      expect(data.validation_errors).toBeDefined()
      expect(data.validation_errors.some((err: any) =>
        err.field === 'sensor_ids' && err.message.includes('least 1')
      )).toBe(true)
      expect(data.suggestions).toBeDefined()
      expect(data.suggestions.length).toBeGreaterThan(0)
    })

    it('should include error IDs for tracking', async () => {
      mockDetectAnomalies.mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '24h'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error_id).toBeDefined()
      expect(data.error_id).toMatch(/^DET_\d+_[a-z0-9]+$/)
      expect(data.support_contact).toBe('support@cu-bems.com')
    })
  })

  describe('rate limiting and caching', () => {
    it('should handle rate limiting information', async () => {
      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '24h'
        })
      })

      const response = await POST(request)

      // Check if rate limiting headers would be present in real implementation
      expect(response.status).toBe(200)
    })

    it('should handle large sensor arrays efficiently', async () => {
      const largeSensorArray = Array.from({ length: 45 }, (_, i) => `SENSOR_${i + 1}`)

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_ids: largeSensorArray,
          time_window: '24h'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})