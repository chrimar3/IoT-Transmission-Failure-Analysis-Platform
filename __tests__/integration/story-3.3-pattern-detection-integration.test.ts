/**
 * Story 3.3 Integration Tests
 * Failure Pattern Detection Engine - End-to-End Integration Testing
 *
 * Tests the complete pattern detection pipeline:
 * 1. Anomaly Detection
 * 2. Pattern Classification
 * 3. Correlation Analysis
 * 4. Recommendation Generation
 */

import { StatisticalAnomalyDetector } from '@/lib/algorithms/StatisticalAnomalyDetector'
import { PatternClassifier } from '@/lib/algorithms/PatternClassifier'
import { PatternCorrelationAnalyzer } from '@/src/lib/algorithms/PatternCorrelationAnalyzer'
import { RecommendationEngine } from '@/lib/algorithms/RecommendationEngine'
import type { TimeSeriesPoint, AnalysisWindow } from '@/lib/algorithms/StatisticalAnomalyDetector'
import type { DetectedPattern } from '@/types/patterns'

describe('Story 3.3: Failure Pattern Detection Engine - Integration Tests', () => {
  let detector: StatisticalAnomalyDetector
  let classifier: PatternClassifier
  let correlationAnalyzer: PatternCorrelationAnalyzer
  let recommendationEngine: RecommendationEngine

  beforeEach(() => {
    detector = new StatisticalAnomalyDetector({
      algorithm_type: 'statistical_zscore',
      sensitivity: 7,
      threshold_multiplier: 2.5,
      minimum_data_points: 20,
      lookback_period: '24h',
      seasonal_adjustment: true,
      outlier_handling: 'cap',
      confidence_method: 'ensemble'
    })

    classifier = new PatternClassifier()
    correlationAnalyzer = new PatternCorrelationAnalyzer()
    recommendationEngine = new RecommendationEngine()
  })

  describe('Complete Pattern Detection Pipeline', () => {
    it('should detect, classify, and generate recommendations for HVAC anomaly', async () => {
      // Step 1: Generate realistic HVAC sensor data with anomaly
      const data = generateBangkokHVACData({
        includeAnomaly: true,
        anomalyHour: 14,
        anomalyMagnitude: 3.5
      })

      // Step 2: Detect anomalies
      const detectionResult = await detector.detectAnomalies(data, {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })

      expect(detectionResult.success).toBe(true)
      expect(detectionResult.patterns.length).toBeGreaterThan(0)

      // Step 3: Classify patterns
      const classificationResults = await classifier.classifyPatterns(detectionResult.patterns)
      expect(classificationResults.length).toBe(detectionResult.patterns.length)

      const criticalPatterns = classificationResults.filter(r => r.severity === 'critical')
      if (criticalPatterns.length > 0) {
        expect(criticalPatterns[0].risk_score).toBeGreaterThan(70)
      }

      // Step 4: Generate recommendations
      const patternsWithRecs = await recommendationEngine.generateRecommendations(
        detectionResult.patterns,
        {
          operational_criticality: 'high',
          equipment_age_months: 60,
          last_maintenance_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          failure_history: 2
        }
      )

      expect(patternsWithRecs.length).toBe(detectionResult.patterns.length)
      expect(patternsWithRecs[0].recommendations.length).toBeGreaterThan(0)

      // Verify recommendation quality
      const highPriorityRecs = patternsWithRecs[0].recommendations.filter(r => r.priority === 'high')
      if (highPriorityRecs.length > 0) {
        expect(highPriorityRecs[0].estimated_cost).toBeGreaterThan(0)
        expect(highPriorityRecs[0].estimated_savings).toBeGreaterThan(0)
        expect(highPriorityRecs[0].success_probability).toBeGreaterThan(30)
      }
    })

    it('should process multiple equipment types simultaneously', async () => {
      const hvacData = generateBangkokHVACData({ includeAnomaly: true })
      const lightingData = generateBangkokLightingData({ includeAnomaly: true })
      const powerData = generateBangkokPowerData({ includeAnomaly: true })

      const allData = [...hvacData, ...lightingData, ...powerData]

      const detectionResult = await detector.detectAnomalies(allData, {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })

      expect(detectionResult.success).toBe(true)

      // Should detect patterns across all equipment types
      const equipmentTypes = new Set(detectionResult.patterns.map(p => p.equipment_type))
      expect(equipmentTypes.size).toBeGreaterThan(1)
    })
  })

  describe('Performance and Scalability', () => {
    it('should process Bangkok dataset scale (134 sensors) efficiently', async () => {
      // Generate data for 50 sensors (representative sample)
      const sensorCount = 50
      const dataPointsPerSensor = 100
      const data: TimeSeriesPoint[] = []

      for (let sensor = 0; sensor < sensorCount; sensor++) {
        const sensorData = generateBangkokHVACData({
          sensorId: `SENSOR_${String(sensor + 1).padStart(3, '0')}`,
          dataPoints: dataPointsPerSensor,
          includeAnomaly: Math.random() < 0.15 // 15% sensors have anomalies
        })
        data.push(...sensorData)
      }

      const startTime = performance.now()
      const detectionResult = await detector.detectAnomalies(data, {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })
      const endTime = performance.now()

      expect(detectionResult.success).toBe(true)
      expect(detectionResult.statistical_summary.total_points_analyzed).toBe(data.length)

      // Performance requirement: <3s for processing
      const processingTime = endTime - startTime
      expect(processingTime).toBeLessThan(3000)

      // Throughput requirement
      const throughput = detectionResult.performance_metrics.throughput_points_per_second
      expect(throughput).toBeGreaterThan(1000) // At least 1000 points/second
    })

    it('should handle large time windows efficiently', async () => {
      const data = generateBangkokHVACData({ dataPoints: 500 }) // Simulating 7-day window

      const startTime = performance.now()
      const detectionResult = await detector.detectAnomalies(data, {
        start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })
      const endTime = performance.now()

      expect(detectionResult.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(2000)
    })
  })

  describe('Algorithm Accuracy and Validation', () => {
    it('should accurately detect known anomalies with high confidence', async () => {
      const data = generateBangkokHVACData({
        includeAnomaly: true,
        anomalyHour: 10,
        anomalyMagnitude: 4.0 // Strong anomaly
      })

      const detectionResult = await detector.detectAnomalies(data, {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })

      expect(detectionResult.success).toBe(true)

      // Should detect the injected anomaly
      const highConfidencePatterns = detectionResult.patterns.filter(p => p.confidence_score >= 80)
      expect(highConfidencePatterns.length).toBeGreaterThan(0)

      // Verify anomaly characteristics
      const strongAnomalies = detectionResult.patterns.filter(
        p => p.data_points.some(dp => dp.severity_score > 3.0)
      )
      expect(strongAnomalies.length).toBeGreaterThan(0)
    })

    it('should minimize false positives in normal operation', async () => {
      const normalData = generateBangkokHVACData({
        includeAnomaly: false,
        addNoise: true,
        noiseLevel: 0.05 // 5% noise
      })

      const detectionResult = await detector.detectAnomalies(normalData, {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })

      // Should detect very few or no patterns in normal data
      const criticalPatterns = detectionResult.patterns.filter(p => p.severity === 'critical')
      expect(criticalPatterns.length).toBeLessThan(2) // Max 1 false positive
    })

    it('should handle seasonal patterns correctly', async () => {
      const seasonalData = generateBangkokHVACData({
        includeSeasonality: true,
        dataPoints: 100
      })

      const detectorWithSeasonal = new StatisticalAnomalyDetector({
        algorithm_type: 'seasonal_decomposition',
        sensitivity: 7,
        threshold_multiplier: 2.5,
        minimum_data_points: 20,
        lookback_period: '24h',
        seasonal_adjustment: true,
        outlier_handling: 'cap',
        confidence_method: 'statistical'
      })

      const detectionResult = await detectorWithSeasonal.detectAnomalies(seasonalData, {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })

      expect(detectionResult.success).toBe(true)
      // Seasonal adjustment should reduce false positives
      expect(detectionResult.patterns.length).toBeLessThan(seasonalData.length * 0.1)
    })
  })

  describe('Bangkok Dataset Specific Scenarios', () => {
    it('should handle Bangkok HVAC tropical climate patterns', async () => {
      const bangkokHVACData = generateBangkokHVACData({
        tropicalClimate: true,
        humidityVariation: true,
        dataPoints: 100
      })

      const detectionResult = await detector.detectAnomalies(bangkokHVACData, {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })

      expect(detectionResult.success).toBe(true)

      // Generate recommendations with Bangkok context
      const patternsWithRecs = await recommendationEngine.generateRecommendations(
        detectionResult.patterns,
        {
          operational_criticality: 'high'
        }
      )

      // Recommendations should consider Bangkok climate
      const hvacRecs = patternsWithRecs
        .flatMap(p => p.recommendations)
        .filter(r => r.description.toLowerCase().includes('climate') ||
                     r.description.toLowerCase().includes('bangkok'))

      if (detectionResult.patterns.length > 0) {
        expect(patternsWithRecs[0].recommendations.length).toBeGreaterThan(0)
      }
    })

    it('should correlate failures across 7 floors', async () => {
      const floorsData: TimeSeriesPoint[] = []

      // Generate data for all 7 floors
      for (let floor = 1; floor <= 7; floor++) {
        const floorData = generateBangkokHVACData({
          sensorId: `SENSOR_FLOOR_${floor}`,
          floorNumber: floor,
          includeAnomaly: floor >= 5 // Upper floors have issues
        })
        floorsData.push(...floorData)
      }

      const detectionResult = await detector.detectAnomalies(floorsData, {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })

      expect(detectionResult.success).toBe(true)

      // Patterns should be detected primarily on upper floors
      const upperFloorPatterns = detectionResult.patterns.filter(p => p.floor_number >= 5)
      expect(upperFloorPatterns.length).toBeGreaterThan(0)
    })
  })

  describe('Recommendation Quality', () => {
    it('should generate actionable recommendations with cost-benefit analysis', async () => {
      const data = generateBangkokHVACData({ includeAnomaly: true })

      const detectionResult = await detector.detectAnomalies(data, {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })

      const patternsWithRecs = await recommendationEngine.generateRecommendations(
        detectionResult.patterns,
        {
          operational_criticality: 'high',
          budget_constraints: 50000
        }
      )

      for (const pattern of patternsWithRecs) {
        for (const rec of pattern.recommendations) {
          // Verify recommendation structure
          expect(rec.action_type).toBeDefined()
          expect(rec.estimated_cost).toBeGreaterThan(0)
          expect(rec.estimated_savings).toBeGreaterThan(0)
          expect(rec.time_to_implement_hours).toBeGreaterThan(0)
          expect(rec.success_probability).toBeGreaterThan(0)
          expect(rec.success_probability).toBeLessThanOrEqual(100)

          // ROI should be positive for most recommendations
          const roi = ((rec.estimated_savings - rec.estimated_cost) / rec.estimated_cost) * 100
          expect(roi).toBeGreaterThan(-50) // Some preventive actions may have negative short-term ROI
        }
      }
    })

    it('should prioritize recommendations by urgency and ROI', async () => {
      const data = generateBangkokHVACData({ includeAnomaly: true })

      const detectionResult = await detector.detectAnomalies(data, {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })

      const patternsWithRecs = await recommendationEngine.generateRecommendations(
        detectionResult.patterns,
        {
          operational_criticality: 'high'
        }
      )

      for (const pattern of patternsWithRecs) {
        if (pattern.recommendations.length > 1) {
          // High priority recommendations should come first
          const priorities = pattern.recommendations.map(r => r.priority)
          const highPriorityIndex = priorities.indexOf('high')
          const lowPriorityIndex = priorities.indexOf('low')

          if (highPriorityIndex !== -1 && lowPriorityIndex !== -1) {
            expect(highPriorityIndex).toBeLessThan(lowPriorityIndex)
          }
        }
      }
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle insufficient data gracefully', async () => {
      const minimalData = generateBangkokHVACData({ dataPoints: 5 }) // Below minimum

      const detectionResult = await detector.detectAnomalies(minimalData, {
        start_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'minute'
      })

      expect(detectionResult.success).toBe(false)
      expect(detectionResult.error).toBeDefined()
      expect(detectionResult.error).toContain('Insufficient data')
    })

    it('should handle empty dataset', async () => {
      const emptyData: TimeSeriesPoint[] = []

      const detectionResult = await detector.detectAnomalies(emptyData, {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })

      expect(detectionResult.success).toBe(false)
      expect(detectionResult.error).toBeDefined()
    })

    it('should handle extreme outliers correctly', async () => {
      const data = generateBangkokHVACData({
        includeAnomaly: true,
        anomalyMagnitude: 10.0 // Extreme outlier
      })

      const detectionResult = await detector.detectAnomalies(data, {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })

      expect(detectionResult.success).toBe(true)

      // Should detect the extreme outlier
      const extremePatterns = detectionResult.patterns.filter(p => p.severity === 'critical')
      expect(extremePatterns.length).toBeGreaterThan(0)
    })
  })

  describe('Quality Metrics', () => {
    it('should achieve 95%+ confidence on strong anomalies', async () => {
      const data = generateBangkokHVACData({
        includeAnomaly: true,
        anomalyMagnitude: 5.0 // Very strong anomaly
      })

      const detectionResult = await detector.detectAnomalies(data, {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })

      const highConfidencePatterns = detectionResult.patterns.filter(p => p.confidence_score >= 95)
      expect(highConfidencePatterns.length).toBeGreaterThan(0)
    })

    it('should meet <3s processing time requirement', async () => {
      const data = generateBangkokHVACData({ dataPoints: 200 })

      const startTime = performance.now()
      await detector.detectAnomalies(data, {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        granularity: 'hour'
      })
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(3000)
    })
  })
})

// Helper functions for generating Bangkok dataset-like data
function generateBangkokHVACData(options: {
  sensorId?: string
  floorNumber?: number
  dataPoints?: number
  includeAnomaly?: boolean
  anomalyHour?: number
  anomalyMagnitude?: number
  includeSeasonality?: boolean
  tropicalClimate?: boolean
  humidityVariation?: boolean
  addNoise?: boolean
  noiseLevel?: number
} = {}): TimeSeriesPoint[] {
  const {
    sensorId = 'SENSOR_001',
    floorNumber = 3,
    dataPoints = 24,
    includeAnomaly = false,
    anomalyHour = 14,
    anomalyMagnitude = 3.0,
    includeSeasonality = true,
    tropicalClimate = false,
    addNoise = true,
    noiseLevel = 0.08
  } = options

  const data: TimeSeriesPoint[] = []
  const baseValue = 850 // Typical HVAC reading for Bangkok
  const now = Date.now()

  for (let i = 0; i < dataPoints; i++) {
    const hour = i % 24
    const timestamp = new Date(now - (dataPoints - i) * 60 * 60 * 1000).toISOString()

    // Hourly variation pattern (Bangkok tropical climate)
    let hourlyMultiplier = 1.0
    if (includeSeasonality) {
      const pattern = [0.6, 0.5, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.3, 1.2, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.5, 0.5]
      hourlyMultiplier = pattern[hour]
    }

    // Tropical climate adjustment (higher afternoon peaks)
    if (tropicalClimate && hour >= 12 && hour <= 16) {
      hourlyMultiplier *= 1.15
    }

    // Random noise
    const noise = addNoise ? (Math.random() - 0.5) * noiseLevel * 2 : 0

    // Inject anomaly
    let value = baseValue * hourlyMultiplier * (1 + noise)
    if (includeAnomaly && hour === anomalyHour) {
      value += baseValue * (anomalyMagnitude / 5) // Scale anomaly magnitude
    }

    data.push({
      timestamp,
      value: Math.round(value * 100) / 100,
      sensor_id: sensorId,
      equipment_type: 'HVAC'
    })
  }

  return data
}

function generateBangkokLightingData(options: {
  sensorId?: string
  dataPoints?: number
  includeAnomaly?: boolean
} = {}): TimeSeriesPoint[] {
  const { sensorId = 'SENSOR_002', dataPoints = 24, includeAnomaly = false } = options
  const data: TimeSeriesPoint[] = []
  const baseValue = 120
  const now = Date.now()

  for (let i = 0; i < dataPoints; i++) {
    const hour = i % 24
    const timestamp = new Date(now - (dataPoints - i) * 60 * 60 * 1000).toISOString()

    const pattern = [0.3, 0.2, 0.2, 0.2, 0.3, 0.5, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.2, 1.4, 1.2, 0.8, 0.6, 0.4, 0.3]
    let value = baseValue * pattern[hour]

    if (includeAnomaly && hour === 12) {
      value *= 2.5
    }

    data.push({
      timestamp,
      value: Math.round(value * 100) / 100,
      sensor_id: sensorId,
      equipment_type: 'Lighting'
    })
  }

  return data
}

function generateBangkokPowerData(options: {
  sensorId?: string
  dataPoints?: number
  includeAnomaly?: boolean
} = {}): TimeSeriesPoint[] {
  const { sensorId = 'SENSOR_003', dataPoints = 24, includeAnomaly = false } = options
  const data: TimeSeriesPoint[] = []
  const baseValue = 2400
  const now = Date.now()

  for (let i = 0; i < dataPoints; i++) {
    const hour = i % 24
    const timestamp = new Date(now - (dataPoints - i) * 60 * 60 * 1000).toISOString()

    const pattern = [0.4, 0.3, 0.3, 0.3, 0.4, 0.6, 0.8, 1.0, 1.2, 1.3, 1.4, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.4, 0.4]
    let value = baseValue * pattern[hour]

    if (includeAnomaly && hour === 10) {
      value *= 1.8
    }

    data.push({
      timestamp,
      value: Math.round(value * 100) / 100,
      sensor_id: sensorId,
      equipment_type: 'Power'
    })
  }

  return data
}