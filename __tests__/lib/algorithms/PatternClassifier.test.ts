/**
 * Pattern Classifier Unit Tests
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Comprehensive tests for pattern classification system
 */

import { PatternClassifier, ClassificationUtils } from '@/lib/algorithms/PatternClassifier'
import type { DetectedPattern } from '@/types/patterns'

describe('PatternClassifier', () => {
  let classifier: PatternClassifier

  beforeEach(() => {
    classifier = new PatternClassifier()
  })

  describe('Pattern Classification', () => {
    it('should classify critical patterns correctly', async () => {
      const pattern: DetectedPattern = createMockPattern({
        severity: 'critical',
        confidence_score: 96,
        pattern_type: 'anomaly',
        data_points: Array(10).fill(null).map((_, i) => ({
          timestamp: new Date(Date.now() + i * 60000).toISOString(),
          value: 1500 + (i * 50),
          expected_value: 800,
          deviation: 700,
          is_anomaly: true,
          severity_score: 4.5
        }))
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result).toBeDefined()
      expect(result.pattern_id).toBe(pattern.id)
      expect(result.severity).toBe('critical')
      expect(result.classified_type).toBeDefined()
      expect(result.risk_score).toBeGreaterThan(70)
      expect(result.urgency_level).toMatch(/immediate|urgent/)
      expect(result.failure_probability).toBeGreaterThan(70)
    })

    it('should classify sustained failure patterns', async () => {
      const pattern = createMockPattern({
        pattern_type: 'anomaly',
        data_points: Array(50).fill(null).map((_, i) => ({
          timestamp: new Date(Date.now() + i * 60000).toISOString(),
          value: 1200,
          expected_value: 800,
          deviation: 400,
          is_anomaly: true,
          severity_score: 3.0
        }))
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.classified_type).toBe('sustained_failure')
      expect(result.urgency_level).not.toBe('monitor')
    })

    it('should classify intermittent failure patterns', async () => {
      const pattern = createMockPattern({
        pattern_type: 'anomaly',
        data_points: Array(20).fill(null).map((_, i) => ({
          timestamp: new Date(Date.now() + i * 60000).toISOString(),
          value: i % 4 === 0 ? 1200 : 800,
          expected_value: 800,
          deviation: i % 4 === 0 ? 400 : 0,
          is_anomaly: i % 4 === 0,
          severity_score: i % 4 === 0 ? 3.0 : 0
        }))
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.classified_type).toBe('intermittent_failure')
    })

    it('should classify gradual degradation patterns', async () => {
      const pattern = createMockPattern({
        pattern_type: 'trend',
        data_points: Array(30).fill(null).map((_, i) => ({
          timestamp: new Date(Date.now() + i * 60000).toISOString(),
          value: 800 + (i * 15), // Gradually increasing
          expected_value: 800,
          deviation: i * 15,
          is_anomaly: i > 10,
          severity_score: i > 10 ? (i * 0.1) : 0
        }))
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.classified_type).toBe('gradual_degradation')
    })

    it('should classify sudden spike patterns', async () => {
      const pattern = createMockPattern({
        pattern_type: 'anomaly',
        data_points: [
          {
            timestamp: new Date().toISOString(),
            value: 2000,
            expected_value: 800,
            deviation: 1200,
            is_anomaly: true,
            severity_score: 5.0
          }
        ]
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.classified_type).toBe('sudden_spike')
    })

    it('should classify threshold breach patterns', async () => {
      const pattern = createMockPattern({
        pattern_type: 'threshold',
        data_points: Array(5).fill(null).map((_, i) => ({
          timestamp: new Date(Date.now() + i * 60000).toISOString(),
          value: 1500,
          expected_value: 1200,
          deviation: 300,
          is_anomaly: true,
          severity_score: 2.5
        }))
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.classified_type).toBe('threshold_breach')
    })

    it('should classify cascade risk patterns', async () => {
      const pattern = createMockPattern({
        severity: 'critical',
        pattern_type: 'correlation',
        metadata: {
          detection_algorithm: 'statistical_zscore',
          analysis_window: '24h',
          threshold_used: 2.5,
          historical_occurrences: 3,
          statistical_metrics: {
            mean: 800,
            std_deviation: 150,
            variance: 22500,
            median: 790,
            q1: 700,
            q3: 900,
            z_score: 3.5,
            percentile_rank: 95,
            normality_test: 80,
            seasonality_strength: 0.3
          },
          correlation_factors: [
            {
              related_sensor_id: 'SENSOR_002',
              correlation_coefficient: 0.85,
              time_lag_minutes: 15,
              confidence: 90
            }
          ]
        }
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.classified_type).toBe('cascade_risk')
      expect(result.risk_score).toBeGreaterThan(80)
    })
  })

  describe('Risk Score Calculation', () => {
    it('should calculate high risk scores for critical patterns', async () => {
      const pattern = createMockPattern({
        severity: 'critical',
        confidence_score: 95,
        equipment_type: 'Power'
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.risk_score).toBeGreaterThan(70)
      expect(result.risk_score).toBeLessThanOrEqual(100)
    })

    it('should calculate medium risk scores for warning patterns', async () => {
      const pattern = createMockPattern({
        severity: 'warning',
        confidence_score: 75,
        equipment_type: 'HVAC'
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.risk_score).toBeGreaterThan(40)
      expect(result.risk_score).toBeLessThan(80)
    })

    it('should calculate low risk scores for info patterns', async () => {
      const pattern = createMockPattern({
        severity: 'info',
        confidence_score: 65,
        equipment_type: 'Lighting'
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.risk_score).toBeLessThan(60)
    })

    it('should adjust risk score based on equipment criticality', async () => {
      const powerPattern = createMockPattern({
        equipment_type: 'Power',
        severity: 'warning',
        confidence_score: 80
      })

      const lightingPattern = createMockPattern({
        equipment_type: 'Lighting',
        severity: 'warning',
        confidence_score: 80
      })

      const powerResult = await classifier.classifyPattern(powerPattern)
      const lightingResult = await classifier.classifyPattern(lightingPattern)

      expect(powerResult.risk_score).toBeGreaterThan(lightingResult.risk_score)
    })
  })

  describe('Urgency Level Determination', () => {
    it('should set immediate urgency for critical high-risk patterns', async () => {
      const pattern = createMockPattern({
        severity: 'critical',
        confidence_score: 95,
        equipment_type: 'Power'
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.urgency_level).toBe('immediate')
      expect(result.recommended_response_time.hours).toBeLessThanOrEqual(2)
    })

    it('should set urgent for high-risk patterns', async () => {
      const pattern = createMockPattern({
        severity: 'warning',
        confidence_score: 85,
        equipment_type: 'HVAC'
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.urgency_level).toMatch(/urgent|scheduled/)
      expect(result.recommended_response_time.hours).toBeLessThanOrEqual(48)
    })

    it('should set monitor for low-risk patterns', async () => {
      const pattern = createMockPattern({
        severity: 'info',
        confidence_score: 60,
        equipment_type: 'Lighting'
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.urgency_level).toBe('monitor')
    })
  })

  describe('Failure Probability Calculation', () => {
    it('should calculate high failure probability for critical patterns', async () => {
      const pattern = createMockPattern({
        severity: 'critical',
        confidence_score: 90,
        pattern_type: 'anomaly'
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.failure_probability).toBeGreaterThan(60)
      expect(result.failure_probability).toBeLessThanOrEqual(100)
    })

    it('should calculate moderate failure probability for warning patterns', async () => {
      const pattern = createMockPattern({
        severity: 'warning',
        confidence_score: 75
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.failure_probability).toBeGreaterThan(40)
      expect(result.failure_probability).toBeLessThan(80)
    })

    it('should adjust probability based on pattern type', async () => {
      const sustainedPattern = createMockPattern({
        pattern_type: 'anomaly',
        data_points: Array(50).fill(null).map((_, i) => ({
          timestamp: new Date(Date.now() + i * 60000).toISOString(),
          value: 1200,
          expected_value: 800,
          deviation: 400,
          is_anomaly: true,
          severity_score: 3.0
        }))
      })

      const spikePattern = createMockPattern({
        pattern_type: 'anomaly',
        data_points: [{
          timestamp: new Date().toISOString(),
          value: 1500,
          expected_value: 800,
          deviation: 700,
          is_anomaly: true,
          severity_score: 4.0
        }]
      })

      const sustainedResult = await classifier.classifyPattern(sustainedPattern)
      const spikeResult = await classifier.classifyPattern(spikePattern)

      // Sustained failure should have higher failure probability
      expect(sustainedResult.failure_probability).toBeGreaterThanOrEqual(spikeResult.failure_probability)
    })
  })

  describe('Classification Factors', () => {
    it('should include all required classification factors', async () => {
      const pattern = createMockPattern()
      const result = await classifier.classifyPattern(pattern)

      expect(result.classification_factors).toBeDefined()
      expect(result.classification_factors.length).toBeGreaterThan(3)

      const factorNames = result.classification_factors.map(f => f.factor_name)
      expect(factorNames).toContain('Statistical Confidence')
      expect(factorNames).toContain('Pattern Severity')
      expect(factorNames).toContain('Equipment Criticality')
    })

    it('should calculate proper factor contributions', async () => {
      const pattern = createMockPattern()
      const result = await classifier.classifyPattern(pattern)

      for (const factor of result.classification_factors) {
        expect(factor.weight).toBeGreaterThan(0)
        expect(factor.weight).toBeLessThanOrEqual(1)
        expect(factor.contribution_to_classification).toBeGreaterThanOrEqual(0)
        expect(factor.contribution_to_classification).toBeLessThanOrEqual(factor.weight)
      }
    })
  })

  describe('Multiple Pattern Classification', () => {
    it('should classify multiple patterns and rank by risk', async () => {
      const patterns = [
        createMockPattern({ severity: 'info', confidence_score: 65 }),
        createMockPattern({ severity: 'critical', confidence_score: 90 }),
        createMockPattern({ severity: 'warning', confidence_score: 75 })
      ]

      const results = await classifier.classifyPatterns(patterns)

      expect(results).toHaveLength(3)

      // Results should be sorted by risk score descending
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].risk_score).toBeGreaterThanOrEqual(results[i + 1].risk_score)
      }
    })
  })

  describe('Response Time Recommendations', () => {
    it('should recommend appropriate response times', async () => {
      const immediatePattern = createMockPattern({
        severity: 'critical',
        confidence_score: 95
      })

      const monitorPattern = createMockPattern({
        severity: 'info',
        confidence_score: 60
      })

      const immediateResult = await classifier.classifyPattern(immediatePattern)
      const monitorResult = await classifier.classifyPattern(monitorPattern)

      expect(immediateResult.recommended_response_time.hours).toBeLessThan(
        monitorResult.recommended_response_time.hours
      )
      expect(immediateResult.recommended_response_time.business_impact).toBe('critical')
    })
  })

  describe('Severity Refinement', () => {
    it('should escalate severity for high-risk patterns', async () => {
      const pattern = createMockPattern({
        severity: 'warning',
        confidence_score: 95,
        equipment_type: 'Power',
        pattern_type: 'anomaly'
      })

      const result = await classifier.classifyPattern(pattern)

      // High risk may escalate warning to critical
      expect(['warning', 'critical']).toContain(result.severity)
    })

    it('should maintain severity for appropriate risk levels', async () => {
      const pattern = createMockPattern({
        severity: 'info',
        confidence_score: 60
      })

      const result = await classifier.classifyPattern(pattern)

      expect(result.severity).toBe('info')
    })
  })
})

describe('ClassificationUtils', () => {
  describe('getSeverityDescription', () => {
    it('should return correct descriptions for all severity levels', () => {
      expect(ClassificationUtils.getSeverityDescription('critical')).toContain('Immediate action')
      expect(ClassificationUtils.getSeverityDescription('warning')).toContain('Schedule maintenance')
      expect(ClassificationUtils.getSeverityDescription('info')).toContain('Monitor')
    })
  })

  describe('getPatternTypeDescription', () => {
    it('should return descriptions for all pattern types', () => {
      expect(ClassificationUtils.getPatternTypeDescription('sustained_failure')).toContain('Continuous failure')
      expect(ClassificationUtils.getPatternTypeDescription('intermittent_failure')).toContain('Periodic')
      expect(ClassificationUtils.getPatternTypeDescription('gradual_degradation')).toContain('Slow performance')
      expect(ClassificationUtils.getPatternTypeDescription('sudden_spike')).toContain('Abrupt')
      expect(ClassificationUtils.getPatternTypeDescription('cyclic_pattern')).toContain('Repeating')
      expect(ClassificationUtils.getPatternTypeDescription('threshold_breach')).toContain('Operational limits')
      expect(ClassificationUtils.getPatternTypeDescription('cascade_risk')).toContain('cascade failure')
    })
  })

  describe('calculatePriorityScore', () => {
    it('should calculate higher scores for high-risk patterns', () => {
      const highRiskResult = {
        pattern_id: 'test1',
        original_type: 'anomaly' as const,
        classified_type: 'sustained_failure' as const,
        severity: 'critical' as const,
        confidence_score: 90,
        classification_factors: [],
        risk_score: 85,
        urgency_level: 'immediate' as const,
        failure_probability: 80,
        recommended_response_time: { hours: 2, description: 'Immediate', business_impact: 'critical' as const }
      }

      const lowRiskResult = {
        ...highRiskResult,
        severity: 'info' as const,
        risk_score: 40,
        failure_probability: 30
      }

      const highScore = ClassificationUtils.calculatePriorityScore(highRiskResult)
      const lowScore = ClassificationUtils.calculatePriorityScore(lowRiskResult)

      expect(highScore).toBeGreaterThan(lowScore)
    })
  })
})

// Helper function to create mock patterns
function createMockPattern(overrides: Partial<DetectedPattern> = {}): DetectedPattern {
  return {
    id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    sensor_id: 'SENSOR_001',
    equipment_type: 'HVAC',
    floor_number: 3,
    pattern_type: 'anomaly',
    severity: 'warning',
    confidence_score: 75,
    description: 'Test pattern description',
    data_points: [
      {
        timestamp: new Date().toISOString(),
        value: 1000,
        expected_value: 800,
        deviation: 200,
        is_anomaly: true,
        severity_score: 2.5
      }
    ],
    recommendations: [],
    acknowledged: false,
    created_at: new Date().toISOString(),
    metadata: {
      detection_algorithm: 'statistical_zscore',
      analysis_window: '24h',
      threshold_used: 2.5,
      historical_occurrences: 0,
      statistical_metrics: {
        mean: 800,
        std_deviation: 150,
        variance: 22500,
        median: 790,
        q1: 700,
        q3: 900,
        z_score: 2.5,
        percentile_rank: 85,
        normality_test: 75,
        seasonality_strength: 0.2
      }
    },
    ...overrides
  }
}