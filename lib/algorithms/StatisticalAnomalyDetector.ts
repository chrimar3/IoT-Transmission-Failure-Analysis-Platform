/**
 * Statistical Anomaly Detection Algorithm
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Advanced statistical analysis for detecting anomalies in Bangkok IoT sensor data
 * Optimized for real-time processing of 134 sensors with 100k+ data points each
 */

import type {
  DetectedPattern,
  PatternDataPoint,
  PatternSeverity,
  PatternType,
  StatisticalMetrics,
  AnomalyDetectionConfig,
  EquipmentThresholds
} from '@/types/patterns'

// Time series data point for analysis
export interface TimeSeriesPoint {
  timestamp: string
  value: number
  sensor_id: string
  equipment_type: string
}

// Analysis window configuration
export interface AnalysisWindow {
  start_time: string
  end_time: string
  granularity: 'minute' | 'hour' | 'day'
}

// Anomaly detection result
export interface AnomalyDetectionResult {
  success: boolean
  patterns: DetectedPattern[]
  anomalies: DetectedPattern[]  // Alias for backward compatibility
  statistics: StatisticalMetrics | null  // For test compatibility
  statistical_summary: StatisticalSummary
  performance_metrics: PerformanceMetrics
  error?: string
  processing_time_ms?: number
}

export interface StatisticalSummary {
  total_points_analyzed: number
  anomalies_detected: number
  confidence_distribution: Record<string, number>
  processing_time_ms: number
}

export interface PerformanceMetrics {
  algorithm_efficiency: number
  memory_usage_mb: number
  throughput_points_per_second: number
}

/**
 * Advanced Statistical Anomaly Detector
 * Implements multiple detection algorithms optimized for Bangkok dataset
 */
export class StatisticalAnomalyDetector {
  private config: AnomalyDetectionConfig
  private equipmentThresholds: Map<string, EquipmentThresholds>
  private historicalStats: Map<string, StatisticalMetrics>

  constructor(config: Partial<AnomalyDetectionConfig>) {
    this.config = {
      algorithm_type: 'statistical_zscore',
      sensitivity: 7, // 1-10 scale (7 = moderate sensitivity)
      threshold_multiplier: 2.5,
      minimum_data_points: 20,
      lookback_period: '24h',
      seasonal_adjustment: true,
      outlier_handling: 'cap',
      confidence_method: 'statistical',
      ...config
    } as AnomalyDetectionConfig

    this.equipmentThresholds = new Map()
    this.historicalStats = new Map()
    this.initializeBangkokEquipmentThresholds()
  }

  /**
   * Main anomaly detection entry point
   * Analyzes sensor data and returns detected patterns
   */
  async detectAnomalies(
    data: TimeSeriesPoint[],
    _window: AnalysisWindow
  ): Promise<AnomalyDetectionResult> {
    const startTime = performance.now()

    // Validate input data
    if (!data || data.length === 0) {
      return {
        success: false,
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
        },
        error: 'No data points provided'
      }
    }

    if (data.length < this.config.minimum_data_points) {
      return {
        success: false,
        patterns: [],
        anomalies: [],
        statistics: null,
        statistical_summary: {
          total_points_analyzed: data.length,
          anomalies_detected: 0,
          confidence_distribution: {},
          processing_time_ms: performance.now() - startTime
        },
        performance_metrics: {
          algorithm_efficiency: 0,
          memory_usage_mb: this.estimateMemoryUsage(data.length),
          throughput_points_per_second: 0
        },
        error: `Insufficient data points. Required: ${this.config.minimum_data_points}, provided: ${data.length}`
      }
    }

    try {
      // Group data by sensor for parallel analysis
      const sensorGroups = this.groupBySensor(data)
      const patterns: DetectedPattern[] = []
      let overallStatistics: StatisticalMetrics | null = null

      // Process each sensor group
      for (const [sensorId, sensorData] of Array.from(sensorGroups.entries())) {
        if (sensorData.length < this.config.minimum_data_points) {
          continue // Skip sensors with insufficient data
        }

        const sensorPatterns = await this.analyzeSensorData(sensorId, sensorData, _window)
        patterns.push(...sensorPatterns)

        // Calculate overall statistics from first sensor with sufficient data
        if (!overallStatistics && sensorData.length > 0) {
          const values = sensorData.map(d => d.value)
          overallStatistics = this.calculateStatisticalMetrics(values)
        }
      }

      // Calculate summary statistics
      const processingTime = performance.now() - startTime
      const statisticalSummary: StatisticalSummary = {
        total_points_analyzed: data.length,
        anomalies_detected: patterns.length,
        confidence_distribution: this.calculateConfidenceDistribution(patterns),
        processing_time_ms: processingTime
      }

      const performanceMetrics: PerformanceMetrics = {
        algorithm_efficiency: data.length / processingTime,
        memory_usage_mb: this.estimateMemoryUsage(data.length),
        throughput_points_per_second: (data.length / processingTime) * 1000
      }

      return {
        success: true,
        patterns,
        anomalies: patterns,  // Alias for backward compatibility
        statistics: overallStatistics,
        statistical_summary: statisticalSummary,
        performance_metrics: performanceMetrics,
        processing_time_ms: processingTime
      }

    } catch (error) {
      console.error('Anomaly detection failed:', error)
      return {
        success: false,
        patterns: [],
        anomalies: [],
        statistics: null,
        statistical_summary: {
          total_points_analyzed: data.length,
          anomalies_detected: 0,
          confidence_distribution: {},
          processing_time_ms: performance.now() - startTime
        },
        performance_metrics: {
          algorithm_efficiency: 0,
          memory_usage_mb: this.estimateMemoryUsage(data.length),
          throughput_points_per_second: 0
        },
        error: `Anomaly detection analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Analyze individual sensor data for anomalies
   */
  private async analyzeSensorData(
    sensorId: string,
    data: TimeSeriesPoint[],
    _window: AnalysisWindow
  ): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = []

    // Sort data by timestamp
    const sortedData = data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Calculate statistical metrics
    const values = sortedData.map(d => d.value)
    const statisticalMetrics = this.calculateStatisticalMetrics(values)

    // Apply selected detection algorithm
    const anomalyResults = await this.applyDetectionAlgorithm(sortedData, statisticalMetrics)

    // Convert results to patterns
    for (const anomaly of anomalyResults) {
      if (anomaly.confidence_score >= (this.config.threshold_multiplier * 20)) { // Minimum confidence threshold
        const pattern = await this.createPattern(sensorId, anomaly, statisticalMetrics, sortedData[0].equipment_type)
        patterns.push(pattern)
      }
    }

    return patterns
  }

  /**
   * Apply the configured detection algorithm
   */
  private async applyDetectionAlgorithm(
    data: TimeSeriesPoint[],
    stats: StatisticalMetrics
  ): Promise<AnomalyResult[]> {
    switch (this.config.algorithm_type) {
      case 'statistical_zscore':
        return this.zScoreDetection(data, stats)

      case 'modified_zscore':
        return this.modifiedZScoreDetection(data, stats)

      case 'interquartile_range':
        return this.iqrDetection(data, stats)

      case 'moving_average':
        return this.movingAverageDetection(data, stats)

      case 'seasonal_decomposition':
        return this.seasonalDecompositionDetection(data, stats)

      default:
        return this.zScoreDetection(data, stats) // Default fallback
    }
  }

  /**
   * Standard Z-Score based anomaly detection
   * Most reliable for Bangkok IoT data patterns
   */
  private zScoreDetection(data: TimeSeriesPoint[], stats: StatisticalMetrics): AnomalyResult[] {
    const results: AnomalyResult[] = []
    const threshold = this.config.threshold_multiplier

    for (let i = 0; i < data.length; i++) {
      const value = data[i].value
      const zScore = Math.abs((value - stats.mean) / stats.std_deviation)

      if (zScore > threshold) {
        const severity = this.calculateSeverity(zScore, threshold)
        const confidence = this.calculateConfidence(zScore, stats, 'zscore')

        results.push({
          index: i,
          timestamp: data[i].timestamp,
          value: value,
          expected_value: stats.mean,
          deviation: zScore * stats.std_deviation,
          z_score: zScore,
          severity,
          confidence_score: confidence,
          pattern_type: this.determinePatternType(zScore, stats)
        })
      }
    }

    return results
  }

  /**
   * Modified Z-Score detection (more robust to outliers)
   * Uses median absolute deviation instead of standard deviation
   */
  private modifiedZScoreDetection(data: TimeSeriesPoint[], stats: StatisticalMetrics): AnomalyResult[] {
    const values = data.map(d => d.value)
    const median = this.calculateMedian(values)
    const mad = this.calculateMAD(values, median)
    const results: AnomalyResult[] = []

    for (let i = 0; i < data.length; i++) {
      const value = data[i].value
      const modifiedZScore = mad > 0 ? 0.6745 * (value - median) / mad : 0

      if (Math.abs(modifiedZScore) > this.config.threshold_multiplier) {
        const severity = this.calculateSeverity(Math.abs(modifiedZScore), this.config.threshold_multiplier)
        const confidence = this.calculateConfidence(Math.abs(modifiedZScore), stats, 'modified_zscore')

        results.push({
          index: i,
          timestamp: data[i].timestamp,
          value: value,
          expected_value: median,
          deviation: Math.abs(value - median),
          z_score: modifiedZScore,
          severity,
          confidence_score: confidence,
          pattern_type: this.determinePatternType(Math.abs(modifiedZScore), stats)
        })
      }
    }

    return results
  }

  /**
   * Interquartile Range (IQR) based detection
   * Good for detecting outliers in non-normal distributions
   */
  private iqrDetection(data: TimeSeriesPoint[], stats: StatisticalMetrics): AnomalyResult[] {
    const values = data.map(d => d.value).sort((a, b) => a - b)
    const q1 = this.calculatePercentile(values, 25)
    const q3 = this.calculatePercentile(values, 75)
    const iqr = q3 - q1
    const lowerBound = q1 - (1.5 * iqr * this.config.sensitivity / 5)
    const upperBound = q3 + (1.5 * iqr * this.config.sensitivity / 5)

    const results: AnomalyResult[] = []

    for (let i = 0; i < data.length; i++) {
      const value = data[i].value

      if (value < lowerBound || value > upperBound) {
        const deviation = Math.min(Math.abs(value - lowerBound), Math.abs(value - upperBound))
        const normalizedDeviation = deviation / iqr
        const severity = this.calculateSeverity(normalizedDeviation, 1.5)
        const confidence = this.calculateConfidence(normalizedDeviation, stats, 'iqr')

        results.push({
          index: i,
          timestamp: data[i].timestamp,
          value: value,
          expected_value: (q1 + q3) / 2,
          deviation: deviation,
          z_score: normalizedDeviation,
          severity,
          confidence_score: confidence,
          pattern_type: this.determinePatternType(normalizedDeviation, stats)
        })
      }
    }

    return results
  }

  /**
   * Moving average based detection
   * Good for trend-based anomalies
   */
  private movingAverageDetection(data: TimeSeriesPoint[], stats: StatisticalMetrics): AnomalyResult[] {
    const windowSize = Math.min(20, Math.floor(data.length / 5))
    const results: AnomalyResult[] = []

    for (let i = windowSize; i < data.length; i++) {
      const windowData = data.slice(i - windowSize, i)
      const movingAvg = windowData.reduce((sum, d) => sum + d.value, 0) / windowSize
      const movingStd = Math.sqrt(
        windowData.reduce((sum, d) => sum + Math.pow(d.value - movingAvg, 2), 0) / windowSize
      )

      const currentValue = data[i].value
      const deviation = Math.abs(currentValue - movingAvg)

      if (movingStd > 0) {
        const zScore = deviation / movingStd

        if (zScore > this.config.threshold_multiplier) {
          const severity = this.calculateSeverity(zScore, this.config.threshold_multiplier)
          const confidence = this.calculateConfidence(zScore, stats, 'moving_average')

          results.push({
            index: i,
            timestamp: data[i].timestamp,
            value: currentValue,
            expected_value: movingAvg,
            deviation: deviation,
            z_score: zScore,
            severity,
            confidence_score: confidence,
            pattern_type: 'trend'
          })
        }
      }
    }

    return results
  }

  /**
   * Seasonal decomposition detection
   * Detects anomalies after removing seasonal components
   */
  private seasonalDecompositionDetection(data: TimeSeriesPoint[], stats: StatisticalMetrics): AnomalyResult[] {
    if (!this.config.seasonal_adjustment || data.length < 48) { // Need at least 48 points for daily seasonality
      return this.zScoreDetection(data, stats) // Fallback to z-score
    }

    // Simple seasonal decomposition (hourly pattern for Bangkok dataset)
    const hourlyPattern = this.extractHourlyPattern(data)
    const deseasonalized = this.applyDeseasonalization(data, hourlyPattern)

    // Apply z-score detection on deseasonalized data
    const deseasonalizedStats = this.calculateStatisticalMetrics(deseasonalized.map(d => d.value))
    return this.zScoreDetection(deseasonalized, deseasonalizedStats)
  }

  /**
   * Calculate comprehensive statistical metrics
   */
  private calculateStatisticalMetrics(values: number[]): StatisticalMetrics {
    const n = values.length
    const mean = values.reduce((sum, val) => sum + val, 0) / n
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1)
    const stdDev = Math.sqrt(variance)

    // Calculate z-scores for normality assessment
    const zScores = values.map(val => Math.abs((val - mean) / stdDev))
    const avgZScore = zScores.reduce((sum, z) => sum + z, 0) / n

    // Percentile rank for the mean (should be ~50 for normal distribution)
    const sortedValues = [...values].sort((a, b) => a - b)
    const meanIndex = sortedValues.findIndex(val => val >= mean)
    const percentileRank = (meanIndex / n) * 100

    // Calculate median and quartiles
    const median = this.calculateMedian(sortedValues)
    const q1 = this.calculatePercentile(sortedValues, 25)
    const q3 = this.calculatePercentile(sortedValues, 75)

    return {
      mean,
      std_deviation: stdDev,
      variance,
      median,
      q1,
      q3,
      z_score: avgZScore,
      percentile_rank: percentileRank,
      normality_test: this.assessNormality(values, mean, stdDev),
      seasonality_strength: this.config.seasonal_adjustment ? this.assessSeasonality(values) : undefined
    }
  }

  /**
   * Determine pattern severity based on deviation magnitude
   */
  private calculateSeverity(zScore: number, threshold: number): PatternSeverity {
    const ratio = zScore / threshold

    if (ratio >= 2.0) return 'critical'  // Very significant deviation
    if (ratio >= 1.5) return 'warning'   // Moderate deviation
    return 'info'                        // Minor deviation
  }

  /**
   * Calculate confidence score for detected anomaly
   */
  private calculateConfidence(
    zScore: number,
    stats: StatisticalMetrics,
    method: string
  ): number {
    let baseConfidence: number

    switch (this.config.confidence_method) {
      case 'statistical':
        // Based on statistical significance
        baseConfidence = Math.min(95, (zScore / this.config.threshold_multiplier) * 40 + 50)
        break

      case 'historical':
        // Based on historical accuracy (would need historical data)
        baseConfidence = Math.min(90, zScore * 25)
        break

      case 'ensemble':
        // Combination of multiple factors
        const statisticalConf = (zScore / this.config.threshold_multiplier) * 30
        const normalityAdj = (100 - stats.normality_test) * 0.3
        const dataQualityAdj = Math.min(20, stats.percentile_rank / 5)
        baseConfidence = Math.min(95, statisticalConf + normalityAdj + dataQualityAdj + 20)
        break

      default:
        baseConfidence = Math.min(85, zScore * 20)
    }

    // Apply method-specific adjustments
    if (method === 'modified_zscore') baseConfidence *= 1.1 // More robust method
    if (method === 'iqr') baseConfidence *= 0.9 // Less precise for normal data
    if (method === 'moving_average') baseConfidence *= 0.95 // Good for trends

    return Math.max(0, Math.min(100, Math.round(baseConfidence)))
  }

  /**
   * Determine the type of pattern detected
   */
  private determinePatternType(zScore: number, stats: StatisticalMetrics): PatternType {
    // Simple heuristics for pattern classification
    if (stats.seasonality_strength && stats.seasonality_strength > 0.7) {
      return 'seasonal'
    }

    if (zScore > this.config.threshold_multiplier * 1.5) {
      return 'anomaly'
    }

    if (stats.normality_test < 70) { // Non-normal distribution suggests trends
      return 'trend'
    }

    return 'threshold' // Default classification
  }

  /**
   * Create a DetectedPattern from anomaly results
   */
  private async createPattern(
    sensorId: string,
    anomaly: AnomalyResult,
    stats: StatisticalMetrics,
    equipmentType: string
  ): Promise<DetectedPattern> {
    const patternId = `pattern_${sensorId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const dataPoints: PatternDataPoint[] = [{
      timestamp: anomaly.timestamp,
      value: anomaly.value,
      expected_value: anomaly.expected_value,
      deviation: anomaly.deviation,
      is_anomaly: true,
      severity_score: anomaly.z_score
    }]

    return {
      id: patternId,
      timestamp: anomaly.timestamp,
      sensor_id: sensorId,
      equipment_type: equipmentType,
      floor_number: this.extractFloorNumber(sensorId),
      pattern_type: anomaly.pattern_type,
      severity: anomaly.severity,
      confidence_score: anomaly.confidence_score,
      description: this.generatePatternDescription(anomaly, equipmentType),
      data_points: dataPoints,
      recommendations: [], // Will be populated by RecommendationEngine
      acknowledged: false,
      created_at: new Date().toISOString(),
      metadata: {
        detection_algorithm: this.config.algorithm_type,
        analysis_window: this.config.lookback_period,
        threshold_used: this.config.threshold_multiplier,
        historical_occurrences: 0, // Would need historical analysis
        statistical_metrics: stats
      }
    }
  }

  /**
   * Helper methods for statistical calculations
   */
  private groupBySensor(data: TimeSeriesPoint[]): Map<string, TimeSeriesPoint[]> {
    const groups = new Map<string, TimeSeriesPoint[]>()

    for (const point of data) {
      if (!groups.has(point.sensor_id)) {
        groups.set(point.sensor_id, [])
      }
      groups.get(point.sensor_id)!.push(point)
    }

    return groups
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  }

  private calculateMAD(values: number[], median: number): number {
    const deviations = values.map(val => Math.abs(val - median))
    return this.calculateMedian(deviations)
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)

    if (lower === upper) return sortedValues[lower]

    const weight = index - lower
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
  }

  private assessNormality(values: number[], mean: number, stdDev: number): number {
    // Simple normality assessment based on empirical rule
    const within1Std = values.filter(v => Math.abs(v - mean) <= stdDev).length / values.length
    const within2Std = values.filter(v => Math.abs(v - mean) <= 2 * stdDev).length / values.length

    // Expected values for normal distribution: ~68% within 1 std, ~95% within 2 std
    const normalityScore = ((within1Std - 0.68) * 50 + (within2Std - 0.95) * 50) + 80
    return Math.max(0, Math.min(100, normalityScore))
  }

  private assessSeasonality(values: number[]): number {
    if (values.length < 48) return 0 // Need sufficient data for seasonal analysis

    // Simple autocorrelation at 24-hour lag for daily seasonality
    const lag = 24
    if (values.length <= lag) return 0

    const correlation = this.calculateAutocorrelation(values, lag)
    return Math.max(0, Math.min(1, correlation))
  }

  private calculateAutocorrelation(values: number[], lag: number): number {
    const n = values.length - lag
    const mean1 = values.slice(0, n).reduce((sum, val) => sum + val, 0) / n
    const mean2 = values.slice(lag).reduce((sum, val) => sum + val, 0) / n

    let numerator = 0
    let denom1 = 0
    let denom2 = 0

    for (let i = 0; i < n; i++) {
      const diff1 = values[i] - mean1
      const diff2 = values[i + lag] - mean2
      numerator += diff1 * diff2
      denom1 += diff1 * diff1
      denom2 += diff2 * diff2
    }

    const denominator = Math.sqrt(denom1 * denom2)
    return denominator > 0 ? numerator / denominator : 0
  }

  private extractHourlyPattern(data: TimeSeriesPoint[]): number[] {
    const hourlyAverages = new Array(24).fill(0)
    const hourlyCounts = new Array(24).fill(0)

    for (const point of data) {
      const hour = new Date(point.timestamp).getHours()
      hourlyAverages[hour] += point.value
      hourlyCounts[hour]++
    }

    return hourlyAverages.map((sum, i) => hourlyCounts[i] > 0 ? sum / hourlyCounts[i] : 0)
  }

  private applyDeseasonalization(data: TimeSeriesPoint[], hourlyPattern: number[]): TimeSeriesPoint[] {
    return data.map(point => {
      const hour = new Date(point.timestamp).getHours()
      const seasonalComponent = hourlyPattern[hour]
      const overallMean = hourlyPattern.reduce((sum, val) => sum + val, 0) / 24

      return {
        ...point,
        value: point.value - seasonalComponent + overallMean
      }
    })
  }

  private extractFloorNumber(sensorId: string): number {
    // Bangkok dataset mapping: extract floor number from sensor ID pattern
    const match = sensorId.match(/(\d+)/)
    if (match) {
      const sensorNum = parseInt(match[1])
      return (sensorNum % 7) + 1 // 7 floors in Bangkok dataset
    }
    return 1 // Default floor
  }

  private generatePatternDescription(anomaly: AnomalyResult, equipmentType: string): string {
    const severity = anomaly.severity.toUpperCase()
    const deviation = Math.round(anomaly.deviation * 100) / 100

    return `${severity} anomaly detected in ${equipmentType} equipment. ` +
           `Value ${anomaly.value} deviates by ${deviation} from expected ${anomaly.expected_value}. ` +
           `Statistical significance: ${Math.round(anomaly.z_score * 100) / 100} standard deviations.`
  }

  private calculateConfidenceDistribution(patterns: DetectedPattern[]): Record<string, number> {
    const ranges = { 'high': 0, 'medium': 0, 'low': 0 }

    for (const pattern of patterns) {
      if (pattern.confidence_score >= 80) ranges.high++
      else if (pattern.confidence_score >= 60) ranges.medium++
      else ranges.low++
    }

    return ranges
  }

  private estimateMemoryUsage(dataPoints: number): number {
    // Rough estimation: each data point ~100 bytes, plus algorithm overhead
    return (dataPoints * 100 + 50000) / (1024 * 1024) // Convert to MB
  }

  private initializeBangkokEquipmentThresholds(): void {
    // Initialize Bangkok-specific equipment thresholds
    // This would typically be loaded from configuration or database
    const hvacThresholds: EquipmentThresholds = {
      equipment_type: 'HVAC',
      normal_ranges: { min: 400, max: 1200, optimal_min: 600, optimal_max: 1000 },
      anomaly_sensitivity: 0.8,
      critical_thresholds: { absolute_min: 200, absolute_max: 1500, rate_of_change_limit: 200 },
      maintenance_schedules: []
    }

    // Add more equipment types as needed
    this.equipmentThresholds.set('HVAC', hvacThresholds)
  }
}

// Internal interfaces
interface AnomalyResult {
  index: number
  timestamp: string
  value: number
  expected_value: number
  deviation: number
  z_score: number
  severity: PatternSeverity
  confidence_score: number
  pattern_type: PatternType
}

// Export utility functions for testing and external use
export const StatisticalUtils = {
  calculateZScore: (value: number, mean: number, stdDev: number): number => {
    return stdDev > 0 ? (value - mean) / stdDev : 0
  },

  calculatePercentile: (values: number[], percentile: number): number => {
    const sorted = [...values].sort((a, b) => a - b)
    const index = (percentile / 100) * (sorted.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)

    if (lower === upper) return sorted[lower]

    const weight = index - lower
    return sorted[lower] * (1 - weight) + sorted[upper] * weight
  },

  isOutlier: (value: number, q1: number, q3: number, multiplier: number = 1.5): boolean => {
    const iqr = q3 - q1
    return value < (q1 - multiplier * iqr) || value > (q3 + multiplier * iqr)
  }
}