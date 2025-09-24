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

// Mock user subscription service
jest.mock('@/lib/services/UserSubscriptionService', () => ({
  UserSubscriptionService: {
    checkSubscription: jest.fn()
  }
}))

import { getServerSession } from 'next-auth'
import { StatisticalAnomalyDetector } from '@/lib/algorithms/StatisticalAnomalyDetector'
import { RecommendationEngine } from '@/lib/algorithms/RecommendationEngine'
import { UserSubscriptionService } from '@/lib/services/UserSubscriptionService'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockCheckSubscription = UserSubscriptionService.checkSubscription as jest.MockedFunction<typeof UserSubscriptionService.checkSubscription>

// Mock implementations
const mockDetectAnomalies = jest.fn()
const mockGenerateRecommendations = jest.fn()

jest.mocked(StatisticalAnomalyDetector).mockImplementation(() => ({
  detectAnomalies: mockDetectAnomalies
} as unknown))

jest.mocked(RecommendationEngine).mockImplementation(() => ({
  generateRecommendations: mockGenerateRecommendations
} as unknown))

describe('/api/patterns/detect', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user_123', email: 'test@cu-bems.com' }
    } as unknown)

    mockCheckSubscription.mockResolvedValue({
      isAdvanced: true,
      tier: 'professional',
      limits: { sensors: 50, patterns: 1000 }
    })

    mockDetectAnomalies.mockResolvedValue({
      success: true,
      patterns: [],
      summary: {
        total_patterns: 0,
        by_severity: { critical: 0, warning: 0, info: 0 },
        by_type: { anomaly: 0, trend: 0, correlation: 0, seasonal: 0, threshold: 0, frequency: 0 },
        high_confidence_count: 0,
        average_confidence: 0,
        recommendations_count: 0,
        critical_actions_required: 0
      },
      analysis_metadata: {
        analysis_duration_ms: 150,
        sensors_analyzed: 1,
        data_points_processed: 100,
        algorithms_used: ['statistical_zscore'],
        confidence_calibration: {
          historical_accuracy: 85,
          sample_size: 1000,
          calibration_date: '2025-01-01T00:00:00Z',
          reliability_score: 90
        },
        performance_metrics: {
          cpu_usage_ms: 100,
          memory_peak_mb: 50,
          cache_hit_rate: 0.8,
          algorithm_efficiency: 0.95
        }
      }
    })

    mockGenerateRecommendations.mockResolvedValue([])
  })

  describe('authentication', () => {
    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
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
        body: JSON.stringify({}) // Missing required fields
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request data')
      expect(data.validation_errors).toBeDefined()
    })

    it('should validate sensor_ids array', async () => {
      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
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
      mockCheckSubscription.mockResolvedValue({
        isAdvanced: false,
        tier: 'free',
        limits: { sensors: 5, patterns: 100 }
      })

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
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

    it('should handle subscription check errors', async () => {
      mockCheckSubscription.mockRejectedValue(new Error('Subscription service error'))

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '24h'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      // Should default to free tier limits when subscription check fails
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
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
        summary: {
          total_patterns: 1,
          by_severity: { critical: 0, warning: 1, info: 0 },
          by_type: { anomaly: 1, trend: 0, correlation: 0, seasonal: 0, threshold: 0, frequency: 0 },
          high_confidence_count: 1,
          average_confidence: 85,
          recommendations_count: 0,
          critical_actions_required: 0
        },
        analysis_metadata: {
          analysis_duration_ms: 250,
          sensors_analyzed: 1,
          data_points_processed: 1000,
          algorithms_used: ['statistical_zscore'],
          confidence_calibration: {
            historical_accuracy: 85,
            sample_size: 1000,
            calibration_date: '2025-01-01T00:00:00Z',
            reliability_score: 90
          },
          performance_metrics: {
            cpu_usage_ms: 200,
            memory_peak_mb: 75,
            cache_hit_rate: 0.85,
            algorithm_efficiency: 0.92
          }
        }
      })

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
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
          recommendations: []
        }],
        summary: {},
        analysis_metadata: {}
      } as unknown)

      mockGenerateRecommendations.mockResolvedValue([{
        id: 'pattern_001',
        recommendations: mockRecommendations
      }])

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
        body: JSON.stringify({
          sensor_ids: ['SENSOR_001'],
          time_window: '24h',
          include_recommendations: true
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
        summary: null,
        analysis_metadata: null
      })

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
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
        summary: {},
        analysis_metadata: {}
      } as unknown)

      mockGenerateRecommendations.mockRejectedValue(new Error('Recommendation engine error'))

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
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
          summary: {},
          analysis_metadata: {}
        }), 100))
      )

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
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
        body: JSON.stringify({
          sensor_ids: [],
          time_window: '24h'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.suggestions).toBeDefined()
      expect(data.suggestions.length).toBeGreaterThan(0)
    })

    it('should include error IDs for tracking', async () => {
      mockDetectAnomalies.mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost/api/patterns/detect', {
        method: 'POST',
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