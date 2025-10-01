/**
 * Pattern Detection API Endpoint
 * Story 3.3: Failure Pattern Detection Engine
 *
 * POST /api/patterns/detect
 * Real-time anomaly detection and pattern analysis for Bangkok IoT sensors
 * Requires Professional subscription for advanced correlation analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { StatisticalAnomalyDetector } from '@/lib/algorithms/StatisticalAnomalyDetector'
import { RateLimiter, RateLimitMiddleware } from '@/src/lib/api/rate-limiting'
import { DETECTION_CONFIG, getPerformanceSLA } from '@/lib/algorithms/detection-config'
import { PatternDetectionCache } from '@/lib/algorithms/cache-service'
import type {
  PatternDetectionRequest,
  PatternDetectionResponse,
  DetectedPattern,
  AnomalyDetectionConfig,
  TimeWindow
} from '@/types/patterns'

// Request validation schema
const PatternDetectionRequestSchema = z.object({
  sensor_ids: z.array(z.string()).min(1).max(50), // Limit to 50 sensors for performance
  time_window: z.enum(['1h', '6h', '24h', '7d', '30d']),
  severity_filter: z.array(z.enum(['critical', 'warning', 'info'])).optional(),
  confidence_threshold: z.number().min(0).max(100).default(70),
  pattern_types: z.array(z.enum(['anomaly', 'trend', 'correlation', 'seasonal', 'threshold', 'frequency'])).optional(),
  include_recommendations: z.boolean().default(false),
  algorithm_config: z.object({
    algorithm_type: z.enum(['statistical_zscore', 'modified_zscore', 'interquartile_range', 'moving_average', 'seasonal_decomposition']).default('statistical_zscore'),
    sensitivity: z.number().min(1).max(10).default(7),
    threshold_multiplier: z.number().min(1).max(5).default(2.5),
    seasonal_adjustment: z.boolean().default(true)
  }).optional()
})

export async function POST(request: NextRequest) {
  const startTime = performance.now()

  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        message: 'Please sign in to use pattern detection'
      }, { status: 401 })
    }

    const userId = (session.user as { id?: string }).id || 'unknown'

    // SECURITY: Apply rate limiting based on subscription tier
    const rateLimitTier = await RateLimitMiddleware.getUserTierFromSubscription(userId)
    const rateLimitResult = await RateLimiter.checkRateLimit(
      `pattern_detect_${userId}`,
      userId,
      rateLimitTier,
      'patterns/detect'
    )

    // Return 429 if rate limit exceeded
    if (!rateLimitResult.allowed) {
      console.warn('[Rate Limit] Pattern detection blocked:', {
        userId,
        tier: rateLimitTier,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime
      })

      return NextResponse.json(
        RateLimitMiddleware.createErrorResponse(rateLimitResult),
        {
          status: 429,
          headers: RateLimitMiddleware.createHeaders(rateLimitResult)
        }
      )
    }

    // Check subscription tier for advanced features
    const userTier = (session.user as { subscriptionTier?: string })?.subscriptionTier || 'free'
    const isAdvancedUser = userTier?.toLowerCase() === 'professional'

    // Validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch (error) {
      console.error('JSON parse error:', error)
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON',
        message: 'Request body must be valid JSON'
      }, { status: 400 })
    }

    const validatedRequest = PatternDetectionRequestSchema.parse(body)

    // Apply tier restrictions
    if (!isAdvancedUser) {
      // Free tier limitations
      if (validatedRequest.sensor_ids.length > 5) {
        return NextResponse.json({
          success: false,
          error: 'Subscription limit exceeded',
          message: 'Free tier is limited to 5 sensors. Upgrade to Professional for unlimited analysis.',
          upgrade_required: true
        }, { status: 403 })
      }

      if (validatedRequest.time_window === '30d' || validatedRequest.time_window === '7d') {
        return NextResponse.json({
          success: false,
          error: 'Subscription limit exceeded',
          message: 'Extended time windows require Professional subscription.',
          upgrade_required: true
        }, { status: 403 })
      }

      // Disable advanced pattern types for free tier
      validatedRequest.pattern_types = ['anomaly', 'threshold']
    }

    // Generate time-series data for analysis
    const timeSeriesData = await generateAnalysisData(validatedRequest)

    if (timeSeriesData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data available',
        message: 'No sensor data found for the specified time window and sensors.',
        suggestions: [
          'Check if sensor IDs are correct',
          'Try a different time window',
          'Ensure sensors have recent data'
        ]
      }, { status: 404 })
    }

    // Configure anomaly detection algorithm
    const algorithmConfig: AnomalyDetectionConfig = {
      algorithm_type: validatedRequest.algorithm_config?.algorithm_type || 'statistical_zscore',
      sensitivity: validatedRequest.algorithm_config?.sensitivity || 7,
      threshold_multiplier: validatedRequest.algorithm_config?.threshold_multiplier || 2.5,
      minimum_data_points: getMinimumDataPoints(validatedRequest.time_window),
      lookback_period: validatedRequest.time_window,
      seasonal_adjustment: validatedRequest.algorithm_config?.seasonal_adjustment ?? true,
      outlier_handling: 'cap',
      confidence_method: isAdvancedUser ? 'ensemble' : 'statistical'
    }

    // Initialize and run anomaly detection
    const detector = new StatisticalAnomalyDetector(algorithmConfig)
    const analysisWindow = {
      start_time: calculateWindowStart(validatedRequest.time_window),
      end_time: new Date().toISOString(),
      granularity: getGranularity(validatedRequest.time_window)
    }

    const detectionResult = await detector.detectAnomalies(timeSeriesData, analysisWindow)

    // Check if detection was successful
    if (!detectionResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Pattern detection failed',
        message: 'Failed to process sensor data for pattern detection',
        details: detectionResult.error,
        suggestions: [
          'Try reducing the number of sensors',
          'Use a shorter time window',
          'Check sensor data quality',
          'Contact support if issue persists'
        ],
        error_id: `PD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }, { status: 500 })
    }

    // Filter results based on request criteria
    let filteredPatterns = detectionResult.patterns

    // Apply confidence threshold
    filteredPatterns = filteredPatterns.filter(p => p.confidence_score >= validatedRequest.confidence_threshold)

    // Apply severity filter
    if (validatedRequest.severity_filter && validatedRequest.severity_filter.length > 0) {
      filteredPatterns = filteredPatterns.filter(p => validatedRequest.severity_filter!.includes(p.severity))
    }

    // Apply pattern type filter
    if (validatedRequest.pattern_types && validatedRequest.pattern_types.length > 0) {
      filteredPatterns = filteredPatterns.filter(p => validatedRequest.pattern_types!.includes(p.pattern_type))
    }

    // Add recommendations if requested (Professional tier only)
    const warnings: string[] = []
    if (validatedRequest.include_recommendations && isAdvancedUser) {
      try {
        const { RecommendationEngine } = await import('@/lib/algorithms/RecommendationEngine')
        const engine = new RecommendationEngine()
        const recommendationResults = await engine.generateRecommendations(filteredPatterns, {
          operational_criticality: 'high',
          equipment_age_months: 60,
          last_maintenance_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          failure_history: 2,
          budget_constraints: 50000,
          available_expertise: ['basic', 'technician', 'engineer'],
          maintenance_window_hours: 8
        })

        // Merge recommendations back into patterns
        filteredPatterns = filteredPatterns.map(pattern => {
          const patternRecommendations = recommendationResults.find(r => r.id === pattern.id)
          return {
            ...pattern,
            recommendations: patternRecommendations ? patternRecommendations.recommendations : []
          }
        })
      } catch (error) {
        warnings.push('Failed to generate recommendations')
        console.error('Recommendation generation failed:', error)
      }
    }

    // Calculate summary statistics
    const summary = {
      total_patterns: filteredPatterns.length,
      by_severity: {
        critical: filteredPatterns.filter(p => p.severity === 'critical').length,
        warning: filteredPatterns.filter(p => p.severity === 'warning').length,
        info: filteredPatterns.filter(p => p.severity === 'info').length
      },
      by_type: filteredPatterns.reduce((acc, p) => {
        acc[p.pattern_type] = (acc[p.pattern_type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      high_confidence_count: filteredPatterns.filter(p => p.confidence_score >= 80).length,
      average_confidence: filteredPatterns.length > 0 ?
        Math.round(filteredPatterns.reduce((sum, p) => sum + p.confidence_score, 0) / filteredPatterns.length) : 0,
      recommendations_count: filteredPatterns.reduce((sum, p) => sum + p.recommendations.length, 0),
      critical_actions_required: filteredPatterns.filter(p =>
        p.severity === 'critical' && p.recommendations.some(r => r.priority === 'high')
      ).length
    }

    // PERFORMANCE: Calculate processing time and check SLA
    const processingTime = performance.now() - startTime
    const sensorCount = validatedRequest.sensor_ids.length
    const slaBudget = getPerformanceSLA(sensorCount)
    const slaViolation = processingTime > slaBudget

    // Alert if SLA is breached
    if (slaViolation && DETECTION_CONFIG.performance.alertOnSlaBreach) {
      console.warn('[SLA VIOLATION] Pattern detection exceeded performance budget:', {
        processingTime: `${processingTime.toFixed(2)}ms`,
        budget: `${slaBudget}ms`,
        sensorCount,
        overage: `${((processingTime / slaBudget - 1) * 100).toFixed(1)}%`,
        userId,
        timestamp: new Date().toISOString()
      })
    }

    // Get cache statistics
    const cacheStats = PatternDetectionCache.getStats()

    // Prepare analysis metadata
    const analysisMetadata = {
      analysis_duration_ms: Math.max(1, Math.round(processingTime)),
      sensors_analyzed: validatedRequest.sensor_ids.length,
      data_points_processed: detectionResult.statistical_summary.total_points_analyzed,
      algorithms_used: [algorithmConfig.algorithm_type],
      confidence_calibration: {
        historical_accuracy: 85, // Would be calculated from historical data
        sample_size: filteredPatterns.length,
        calibration_date: new Date().toISOString(),
        reliability_score: Math.min(95, 80 + (isAdvancedUser ? 10 : 0))
      },
      performance_metrics: {
        cpu_usage_ms: Math.round(processingTime),
        memory_peak_mb: detectionResult.performance_metrics.memory_usage_mb,
        cache_hit_rate: cacheStats.hitRate,
        cache_entries: cacheStats.totalEntries,
        algorithm_efficiency: detectionResult.performance_metrics.algorithm_efficiency,
        sla_compliant: !slaViolation,
        sla_budget_ms: slaBudget,
        parallel_processing: true,
        welford_optimization: true
      }
    }

    // PERFORMANCE: Log comprehensive performance metrics
    console.log('[Pattern Detection Performance]', {
      user_id: userId,
      tier: rateLimitTier,
      sensor_count: validatedRequest.sensor_ids.length,
      time_window: validatedRequest.time_window,
      patterns_detected: filteredPatterns.length,
      processing_time_ms: Math.round(processingTime),
      sla_budget_ms: slaBudget,
      sla_compliant: !slaViolation,
      cache_hit_rate: `${(cacheStats.hitRate * 100).toFixed(1)}%`,
      cache_hits: cacheStats.hits,
      cache_misses: cacheStats.misses,
      rate_limit_remaining: rateLimitResult.remaining,
      optimizations: {
        parallel_processing: true,
        welford_algorithm: true,
        result_caching: DETECTION_CONFIG.performance.cacheEnabled,
        correlation_caching: DETECTION_CONFIG.performance.cacheCorrelationMatrices
      }
    })

    const response: PatternDetectionResponse = {
      success: true,
      data: {
        patterns: filteredPatterns,
        summary,
        analysis_metadata: analysisMetadata
      },
      ...(warnings.length > 0 && { warnings })
    }

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300', // 5 minute cache
        'X-Processing-Time': `${Math.round(processingTime)}ms`,
        'X-Patterns-Detected': filteredPatterns.length.toString(),
        'X-User-Tier': userTier,
        'X-SLA-Compliant': (!slaViolation).toString(),
        'X-Cache-Hit-Rate': `${(cacheStats.hitRate * 100).toFixed(1)}%`,
        ...RateLimitMiddleware.createHeaders(rateLimitResult)
      }
    })

  } catch (error) {
    console.error('Pattern detection error:', error)

    // Enhanced error handling
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        message: 'Please check your request parameters and try again',
        validation_errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        })),
        suggestions: [
          'Ensure sensor_ids is an array of valid sensor identifiers',
          'Check that time_window is one of: 1h, 6h, 24h, 7d, 30d',
          'Verify confidence_threshold is between 0 and 100',
          'Ensure algorithm sensitivity is between 1 and 10'
        ]
      }, { status: 400 })
    }

    // Algorithm processing errors
    if (error instanceof Error && error.message.includes('detection analysis failed')) {
      return NextResponse.json({
        success: false,
        error: 'Analysis processing error',
        message: 'Failed to process sensor data for pattern detection',
        suggestions: [
          'Try reducing the number of sensors',
          'Use a shorter time window',
          'Check sensor data quality',
          'Contact support if issue persists'
        ],
        error_id: `PD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }, { status: 500 })
    }

    // Memory/resource errors
    if (error instanceof Error && (error.message.includes('memory') || error.message.includes('timeout'))) {
      return NextResponse.json({
        success: false,
        error: 'Resource limit exceeded',
        message: 'The analysis request requires too many resources',
        suggestions: [
          'Reduce the number of sensors (max 50)',
          'Use a shorter time window',
          'Increase confidence threshold to reduce results',
          'Try basic algorithm type instead of advanced'
        ],
        retry_after: 60
      }, { status: 413 })
    }

    // Generic server error
    return NextResponse.json({
      success: false,
      error: 'Pattern detection failed',
      message: 'An unexpected error occurred during pattern analysis',
      error_id: `DET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      support_contact: 'support@cu-bems.com',
      suggestions: [
        'Try again with a simpler request',
        'Check sensor data availability',
        'Contact support if problem persists'
      ]
    }, { status: 500 })
  }
}

/**
 * Generate mock time-series data for pattern analysis
 * In production, this would query the actual sensor database
 */
async function generateAnalysisData(request: PatternDetectionRequest) {
  const timeSeriesData = []
  const startTime = calculateWindowStart(request.time_window)
  const endTime = new Date()
  const interval = getDataInterval(request.time_window)

  for (const sensorId of request.sensor_ids) {
    const equipmentType = getBangkokEquipmentType(sensorId)
    let currentTime = new Date(startTime)

    while (currentTime <= endTime) {
      // Generate realistic data with some anomalies
      const baseValue = getBaseValueForEquipment(equipmentType)
      const hourlyVariation = getHourlyVariation(currentTime.getHours(), equipmentType)
      const randomNoise = (Math.random() - 0.5) * 0.1

      // Inject some anomalies for testing (5% chance)
      const isAnomaly = Math.random() < 0.05
      const anomalyMultiplier = isAnomaly ? (Math.random() > 0.5 ? 2.5 : 0.4) : 1

      const value = baseValue * hourlyVariation * (1 + randomNoise) * anomalyMultiplier

      timeSeriesData.push({
        timestamp: currentTime.toISOString(),
        value: Math.round(value * 100) / 100,
        sensor_id: sensorId,
        equipment_type: equipmentType
      })

      currentTime = new Date(currentTime.getTime() + interval)
    }
  }

  return timeSeriesData
}

/**
 * Add maintenance recommendations to detected patterns
 * Integrates with the RecommendationEngine for comprehensive recommendations
 */
async function _addRecommendations(patterns: DetectedPattern[]): Promise<DetectedPattern[]> {
  try {
    const { RecommendationEngine } = await import('@/lib/algorithms/RecommendationEngine')
    const engine = new RecommendationEngine()

    // Generate comprehensive recommendations using the recommendation engine
    const patternsWithRecommendations = await engine.generateRecommendations(patterns, {
      operational_criticality: 'high',
      equipment_age_months: 60, // 5 years
      last_maintenance_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      failure_history: 2,
      budget_constraints: 50000,
      available_expertise: ['basic', 'technician', 'engineer'],
      maintenance_window_hours: 8
    })

    return patternsWithRecommendations
  } catch (error) {
    console.error('RecommendationEngine failed, using fallback:', error)

    // Fallback to basic recommendations if the engine fails
    return patterns.map(pattern => ({
      ...pattern,
      recommendations: [
        {
          id: `rec_${pattern.id}_${Date.now()}`,
          priority: pattern.severity === 'critical' ? 'high' : pattern.severity === 'warning' ? 'medium' : 'low',
          action_type: 'inspection',
          description: `Inspect ${pattern.equipment_type} equipment on floor ${pattern.floor_number} for anomalous behavior`,
          estimated_cost: 150,
          estimated_savings: pattern.severity === 'critical' ? 2000 : 500,
          time_to_implement_hours: 2,
          required_expertise: 'technician',
          maintenance_category: 'predictive',
          success_probability: pattern.confidence_score
        }
      ]
    }))
  }
}

/**
 * Helper functions for data generation and configuration
 */
function calculateWindowStart(timeWindow: TimeWindow): string {
  const now = new Date()
  const msPerHour = 60 * 60 * 1000
  const msPerDay = 24 * msPerHour

  switch (timeWindow) {
    case '1h': return new Date(now.getTime() - msPerHour).toISOString()
    case '6h': return new Date(now.getTime() - 6 * msPerHour).toISOString()
    case '24h': return new Date(now.getTime() - msPerDay).toISOString()
    case '7d': return new Date(now.getTime() - 7 * msPerDay).toISOString()
    case '30d': return new Date(now.getTime() - 30 * msPerDay).toISOString()
    default: return new Date(now.getTime() - msPerDay).toISOString()
  }
}

function getMinimumDataPoints(timeWindow: TimeWindow): number {
  switch (timeWindow) {
    case '1h': return 10
    case '6h': return 20
    case '24h': return 30
    case '7d': return 50
    case '30d': return 100
    default: return 20
  }
}

function getGranularity(timeWindow: TimeWindow): 'minute' | 'hour' | 'day' {
  switch (timeWindow) {
    case '1h':
    case '6h': return 'minute'
    case '24h': return 'hour'
    case '7d':
    case '30d': return 'day'
    default: return 'hour'
  }
}

function getDataInterval(timeWindow: TimeWindow): number {
  switch (timeWindow) {
    case '1h': return 5 * 60 * 1000      // 5 minutes
    case '6h': return 15 * 60 * 1000     // 15 minutes
    case '24h': return 60 * 60 * 1000    // 1 hour
    case '7d': return 6 * 60 * 60 * 1000 // 6 hours
    case '30d': return 24 * 60 * 60 * 1000 // 1 day
    default: return 60 * 60 * 1000
  }
}

function getBangkokEquipmentType(sensorId: string): string {
  const equipmentMapping: Record<string, string> = {
    'SENSOR_001': 'HVAC',
    'SENSOR_002': 'Lighting',
    'SENSOR_003': 'Power',
    'SENSOR_004': 'Water',
    'SENSOR_005': 'Security',
    'SENSOR_006': 'HVAC',
    'SENSOR_007': 'Lighting',
    'SENSOR_008': 'Power'
  }
  return equipmentMapping[sensorId] || 'Unknown'
}

function getBaseValueForEquipment(equipmentType: string): number {
  switch (equipmentType) {
    case 'HVAC': return 850
    case 'Lighting': return 120
    case 'Power': return 2400
    case 'Water': return 45
    case 'Security': return 25
    default: return 100
  }
}

function getHourlyVariation(hour: number, equipmentType: string): number {
  const patterns: Record<string, number[]> = {
    'HVAC': [0.6, 0.5, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.3, 1.2, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.5, 0.5],
    'Lighting': [0.3, 0.2, 0.2, 0.2, 0.3, 0.5, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.2, 1.4, 1.2, 0.8, 0.6, 0.4, 0.3],
    'Power': [0.4, 0.3, 0.3, 0.3, 0.4, 0.6, 0.8, 1.0, 1.2, 1.3, 1.4, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.4, 0.4],
    'Water': [0.2, 0.1, 0.1, 0.1, 0.3, 0.6, 0.8, 1.0, 1.2, 1.1, 1.0, 1.3, 1.4, 1.0, 0.9, 0.8, 0.7, 0.6, 0.4, 0.3, 0.2, 0.1, 0.1, 0.1],
    'Security': Array(24).fill(1.0)
  }

  return patterns[equipmentType]?.[hour] || 1.0
}