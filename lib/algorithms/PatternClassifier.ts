/**
 * Pattern Classification System
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Advanced classification of detected patterns into actionable categories
 * Severity levels: Critical (>95% confidence), Warning (80-95%), Info (<80%)
 * Pattern types: Sustained failure, Intermittent, Gradual degradation, Sudden spike
 */

import type {
  DetectedPattern,
  PatternType,
  PatternSeverity,
  PatternDataPoint
} from '@/types/patterns'

// Classification result with confidence breakdown
export interface ClassificationResult {
  pattern_id: string
  original_type: PatternType
  classified_type: ClassifiedPatternType
  severity: PatternSeverity
  confidence_score: number
  classification_factors: ClassificationFactor[]
  risk_score: number // 0-100
  urgency_level: UrgencyLevel
  failure_probability: number // 0-100%
  recommended_response_time: ResponseTime
}

// Detailed pattern types for maintenance planning
export type ClassifiedPatternType =
  | 'sustained_failure' // Continuous failure over extended period
  | 'intermittent_failure' // Periodic failures with recovery
  | 'gradual_degradation' // Slow performance decline
  | 'sudden_spike' // Abrupt anomaly
  | 'cyclic_pattern' // Repeating pattern anomaly
  | 'threshold_breach' // Operational limit exceeded
  | 'cascade_risk' // Pattern that could trigger cascade failure

export type UrgencyLevel = 'immediate' | 'urgent' | 'scheduled' | 'monitor'

export interface ResponseTime {
  hours: number
  description: string
  business_impact: 'critical' | 'high' | 'medium' | 'low'
}

// Factors influencing classification decision
export interface ClassificationFactor {
  factor_name: string
  weight: number // 0-1
  value: number
  contribution_to_classification: number
  description: string
}

// Classification configuration
export interface ClassificationConfig {
  severity_thresholds: {
    critical_confidence: number // >95%
    warning_confidence: number // 80-95%
    info_confidence: number // <80%
  }
  duration_thresholds: {
    sustained_hours: number
    intermittent_count: number
    degradation_rate: number
  }
  risk_weights: {
    confidence: number
    severity: number
    equipment_criticality: number
    historical_accuracy: number
  }
}

/**
 * Advanced Pattern Classifier
 * Classifies detected patterns based on characteristics, context, and risk
 */
export class PatternClassifier {
  private config: ClassificationConfig

  constructor(config?: Partial<ClassificationConfig>) {
    this.config = {
      severity_thresholds: {
        critical_confidence: 95,
        warning_confidence: 80,
        info_confidence: 0
      },
      duration_thresholds: {
        sustained_hours: 4,
        intermittent_count: 3,
        degradation_rate: 0.1 // 10% degradation per hour
      },
      risk_weights: {
        confidence: 0.35,
        severity: 0.30,
        equipment_criticality: 0.20,
        historical_accuracy: 0.15
      },
      ...config
    }
  }

  /**
   * Classify a single pattern with comprehensive analysis
   */
  async classifyPattern(pattern: DetectedPattern): Promise<ClassificationResult> {
    // Analyze pattern characteristics
    const classifiedType = this.determineClassifiedType(pattern)
    const classificationFactors = this.analyzeClassificationFactors(pattern, classifiedType)
    const riskScore = this.calculateRiskScore(pattern, classificationFactors)
    const urgencyLevel = this.determineUrgencyLevel(pattern, riskScore)
    const failureProbability = this.calculateFailureProbability(pattern, riskScore)
    const responseTime = this.calculateResponseTime(urgencyLevel, pattern.severity)

    // Refine severity based on comprehensive analysis
    const refinedSeverity = this.refineSeverity(pattern, riskScore, failureProbability)

    return {
      pattern_id: pattern.id,
      original_type: pattern.pattern_type,
      classified_type: classifiedType,
      severity: refinedSeverity,
      confidence_score: pattern.confidence_score,
      classification_factors: classificationFactors,
      risk_score: riskScore,
      urgency_level: urgencyLevel,
      failure_probability: failureProbability,
      recommended_response_time: responseTime
    }
  }

  /**
   * Classify multiple patterns with priority ranking
   */
  async classifyPatterns(patterns: DetectedPattern[]): Promise<ClassificationResult[]> {
    const classifications = await Promise.all(
      patterns.map(pattern => this.classifyPattern(pattern))
    )

    // Sort by risk score (highest first)
    return classifications.sort((a, b) => b.risk_score - a.risk_score)
  }

  /**
   * Determine the detailed pattern type based on characteristics
   */
  private determineClassifiedType(pattern: DetectedPattern): ClassifiedPatternType {
    const dataPoints = pattern.data_points
    const duration = this.calculatePatternDuration(dataPoints)
    const frequency = this.analyzeFrequency(dataPoints)
    const trend = this.analyzeTrend(dataPoints)

    // Cascade risk: pattern indicating potential cascade failure (check first due to high priority)
    if (pattern.severity === 'critical' && pattern.metadata.correlation_factors && pattern.metadata.correlation_factors.length > 0) {
      return 'cascade_risk'
    }

    // Threshold breach: operational limits exceeded
    if (pattern.pattern_type === 'threshold') {
      return 'threshold_breach'
    }

    // Sustained failure: continuous anomaly over extended period OR high count of anomalies with high consistency
    if ((duration >= this.config.duration_thresholds.sustained_hours && frequency.consistency > 0.8) ||
        (dataPoints.length >= 30 && frequency.consistency > 0.9)) {
      return 'sustained_failure'
    }

    // Intermittent failure: periodic failures with recovery
    if (frequency.anomaly_count >= this.config.duration_thresholds.intermittent_count && frequency.consistency < 0.6 && frequency.consistency > 0.15) {
      return 'intermittent_failure'
    }

    // Gradual degradation: steady decline in performance
    if (Math.abs(trend.rate) >= this.config.duration_thresholds.degradation_rate && (trend.direction === 'declining' || trend.direction === 'improving')) {
      return 'gradual_degradation'
    }

    // Cyclic pattern: repeating pattern
    if (pattern.pattern_type === 'seasonal' || frequency.periodicity > 0.6) {
      return 'cyclic_pattern'
    }

    // Sudden spike: abrupt anomaly
    if (frequency.anomaly_count <= 2 && trend.volatility > 0.7) {
      return 'sudden_spike'
    }

    // Default: sudden spike for unclassified patterns
    return 'sudden_spike'
  }

  /**
   * Analyze factors that contribute to classification
   */
  private analyzeClassificationFactors(
    pattern: DetectedPattern,
    classifiedType: ClassifiedPatternType
  ): ClassificationFactor[] {
    const factors: ClassificationFactor[] = []

    // Confidence factor
    const confidenceFactor: ClassificationFactor = {
      factor_name: 'Statistical Confidence',
      weight: this.config.risk_weights.confidence,
      value: pattern.confidence_score,
      contribution_to_classification: (pattern.confidence_score / 100) * this.config.risk_weights.confidence,
      description: `Statistical analysis confidence: ${pattern.confidence_score}%`
    }
    factors.push(confidenceFactor)

    // Severity factor
    const severityValue = { critical: 100, warning: 65, info: 30 }[pattern.severity]
    const severityFactor: ClassificationFactor = {
      factor_name: 'Pattern Severity',
      weight: this.config.risk_weights.severity,
      value: severityValue,
      contribution_to_classification: (severityValue / 100) * this.config.risk_weights.severity,
      description: `Severity level: ${pattern.severity.toUpperCase()}`
    }
    factors.push(severityFactor)

    // Equipment criticality factor
    const equipmentCriticality = this.getEquipmentCriticality(pattern.equipment_type)
    const criticalityFactor: ClassificationFactor = {
      factor_name: 'Equipment Criticality',
      weight: this.config.risk_weights.equipment_criticality,
      value: equipmentCriticality,
      contribution_to_classification: (equipmentCriticality / 100) * this.config.risk_weights.equipment_criticality,
      description: `${pattern.equipment_type} criticality score`
    }
    factors.push(criticalityFactor)

    // Historical accuracy factor
    const historicalAccuracy = pattern.metadata.statistical_metrics.normality_test || 85
    const accuracyFactor: ClassificationFactor = {
      factor_name: 'Historical Accuracy',
      weight: this.config.risk_weights.historical_accuracy,
      value: historicalAccuracy,
      contribution_to_classification: (historicalAccuracy / 100) * this.config.risk_weights.historical_accuracy,
      description: `Algorithm historical accuracy: ${Math.round(historicalAccuracy)}%`
    }
    factors.push(accuracyFactor)

    // Pattern type specific factor
    const patternTypeFactor = this.getPatternTypeRiskFactor(classifiedType)
    factors.push(patternTypeFactor)

    return factors
  }

  /**
   * Calculate comprehensive risk score (0-100)
   */
  private calculateRiskScore(
    pattern: DetectedPattern,
    factors: ClassificationFactor[]
  ): number {
    // Base risk from classification factors
    const baseRisk = factors.reduce((sum, factor) => sum + (factor.contribution_to_classification * 100), 0)

    // Adjust for data quality - with a higher minimum for critical patterns
    const dataPoints = pattern.data_points.length
    const minMultiplier = pattern.severity === 'critical' ? 0.7 : 0.6
    const dataQualityMultiplier = Math.max(minMultiplier, Math.min(1.0, dataPoints / 15)) // Higher minimum, faster ramp-up

    // Adjust for correlation risk
    const correlationRisk = pattern.metadata.correlation_factors?.length || 0
    const correlationMultiplier = 1 + (correlationRisk * 0.2) // +20% per correlated sensor

    // Calculate final risk score
    let riskScore = baseRisk * dataQualityMultiplier * correlationMultiplier

    // Ensure risk score is within bounds
    riskScore = Math.max(0, Math.min(100, riskScore))

    return Math.round(riskScore)
  }

  /**
   * Determine urgency level based on risk and severity
   */
  private determineUrgencyLevel(pattern: DetectedPattern, riskScore: number): UrgencyLevel {
    // Critical patterns with high confidence and risk require immediate action
    // Lower threshold for highly critical equipment
    const isHighCriticalityEquipment = ['Power', 'Fire', 'Security'].includes(pattern.equipment_type)
    const immediateThreshold = isHighCriticalityEquipment ? 70 : 75

    if (pattern.severity === 'critical' && (riskScore >= immediateThreshold || pattern.confidence_score >= 95)) {
      return 'immediate'
    }

    // High risk or critical severity requires urgent action
    if (riskScore >= 70 || pattern.severity === 'critical') {
      return 'urgent'
    }

    // Medium risk requires scheduled action
    if (riskScore >= 50 || pattern.severity === 'warning') {
      return 'scheduled'
    }

    // Low risk requires monitoring
    return 'monitor'
  }

  /**
   * Calculate failure probability based on pattern characteristics
   */
  private calculateFailureProbability(pattern: DetectedPattern, riskScore: number): number {
    // Base probability from confidence score
    let probability = pattern.confidence_score * 0.55 // 55% weight to confidence

    // Add risk score contribution
    probability += riskScore * 0.35 // 35% weight to risk

    // Add severity contribution
    const severityContribution = { critical: 25, warning: 15, info: 5 }[pattern.severity]
    probability += severityContribution * 0.1 // 10% weight to severity

    // Adjust for pattern type
    const patternTypeMultiplier = {
      sustained_failure: 1.2,
      intermittent_failure: 0.9,
      gradual_degradation: 1.0,
      sudden_spike: 0.85,
      cyclic_pattern: 0.7,
      threshold_breach: 1.1,
      cascade_risk: 1.3
    }

    const classifiedType = this.determineClassifiedType(pattern)
    probability *= patternTypeMultiplier[classifiedType]

    // Ensure probability is within bounds
    return Math.max(0, Math.min(100, Math.round(probability)))
  }

  /**
   * Calculate recommended response time
   */
  private calculateResponseTime(urgency: UrgencyLevel, severity: PatternSeverity): ResponseTime {
    const responseTimeMatrix: Record<UrgencyLevel, ResponseTime> = {
      immediate: {
        hours: 2,
        description: 'Immediate action required within 2 hours',
        business_impact: 'critical'
      },
      urgent: {
        hours: 8,
        description: 'Urgent action required within 8 hours',
        business_impact: 'high'
      },
      scheduled: {
        hours: 48,
        description: 'Schedule maintenance within 48 hours',
        business_impact: 'medium'
      },
      monitor: {
        hours: 168, // 7 days
        description: 'Continue monitoring, no immediate action required',
        business_impact: 'low'
      }
    }

    let responseTime = responseTimeMatrix[urgency]

    // Adjust for critical severity
    if (severity === 'critical' && urgency !== 'immediate') {
      responseTime = {
        ...responseTime,
        hours: Math.min(responseTime.hours, 4),
        business_impact: 'critical' as const
      }
    }

    return responseTime
  }

  /**
   * Refine severity based on comprehensive analysis
   */
  private refineSeverity(
    pattern: DetectedPattern,
    riskScore: number,
    failureProbability: number
  ): PatternSeverity {
    // High risk or failure probability should escalate severity
    if (riskScore >= 85 || failureProbability >= 90) {
      return 'critical'
    }

    if (riskScore >= 65 || failureProbability >= 75) {
      return pattern.severity === 'info' ? 'warning' : pattern.severity
    }

    // Keep original severity if no escalation warranted
    return pattern.severity
  }

  /**
   * Helper: Calculate pattern duration in hours
   */
  private calculatePatternDuration(dataPoints: PatternDataPoint[]): number {
    if (dataPoints.length < 2) return 0

    const firstTimestamp = new Date(dataPoints[0].timestamp).getTime()
    const lastTimestamp = new Date(dataPoints[dataPoints.length - 1].timestamp).getTime()
    const durationMs = lastTimestamp - firstTimestamp

    return durationMs / (60 * 60 * 1000) // Convert to hours
  }

  /**
   * Helper: Analyze frequency characteristics
   */
  private analyzeFrequency(dataPoints: PatternDataPoint[]): {
    anomaly_count: number
    consistency: number
    periodicity: number
  } {
    const anomalyCount = dataPoints.filter(dp => dp.is_anomaly).length
    const consistency = dataPoints.length > 0 ? anomalyCount / dataPoints.length : 0

    // Simple periodicity detection (would be more sophisticated in production)
    const periodicity = this.detectPeriodicity(dataPoints)

    return {
      anomaly_count: anomalyCount,
      consistency,
      periodicity
    }
  }

  /**
   * Helper: Analyze trend characteristics
   */
  private analyzeTrend(dataPoints: PatternDataPoint[]): {
    direction: 'improving' | 'declining' | 'stable'
    rate: number
    volatility: number
  } {
    if (dataPoints.length < 3) {
      return { direction: 'stable', rate: 0, volatility: 0 }
    }

    // Calculate linear regression
    const values = dataPoints.map(dp => dp.value)
    const n = values.length
    const xValues = Array.from({ length: n }, (_, i) => i)

    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n
    const yMean = values.reduce((sum, y) => sum + y, 0) / n

    let numerator = 0
    let denominator = 0

    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (values[i] - yMean)
      denominator += Math.pow(xValues[i] - xMean, 2)
    }

    const slope = denominator !== 0 ? numerator / denominator : 0

    // Calculate volatility (standard deviation)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0) / n
    const stdDev = Math.sqrt(variance)
    const volatility = yMean !== 0 ? stdDev / yMean : 0

    return {
      direction: slope < -0.01 ? 'declining' : slope > 0.01 ? 'improving' : 'stable',
      rate: Math.abs(slope),
      volatility: Math.min(1, volatility)
    }
  }

  /**
   * Helper: Detect periodicity in data points
   */
  private detectPeriodicity(dataPoints: PatternDataPoint[]): number {
    if (dataPoints.length < 6) return 0

    // Simple autocorrelation at different lags
    const values = dataPoints.map(dp => dp.value)
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length

    let maxCorrelation = 0
    const maxLag = Math.min(values.length / 2, 24) // Check up to 24 periods

    for (let lag = 2; lag <= maxLag; lag++) {
      let numerator = 0
      let denominator = 0

      for (let i = 0; i < values.length - lag; i++) {
        numerator += (values[i] - mean) * (values[i + lag] - mean)
        denominator += Math.pow(values[i] - mean, 2)
      }

      const correlation = denominator > 0 ? numerator / denominator : 0
      maxCorrelation = Math.max(maxCorrelation, Math.abs(correlation))
    }

    return Math.min(1, maxCorrelation)
  }

  /**
   * Helper: Get equipment criticality score
   */
  private getEquipmentCriticality(equipmentType: string): number {
    const criticalityScores: Record<string, number> = {
      'HVAC': 85,
      'Power': 95,
      'Lighting': 60,
      'Water': 75,
      'Security': 90,
      'Elevator': 80,
      'Fire': 100
    }

    return criticalityScores[equipmentType] || 70
  }

  /**
   * Helper: Get pattern type risk factor
   */
  private getPatternTypeRiskFactor(classifiedType: ClassifiedPatternType): ClassificationFactor {
    const riskValues: Record<ClassifiedPatternType, { value: number; description: string }> = {
      sustained_failure: { value: 90, description: 'Sustained failure indicates persistent problem' },
      intermittent_failure: { value: 70, description: 'Intermittent failure may be environmental' },
      gradual_degradation: { value: 75, description: 'Gradual degradation allows proactive maintenance' },
      sudden_spike: { value: 60, description: 'Sudden spike may be transient anomaly' },
      cyclic_pattern: { value: 50, description: 'Cyclic pattern may be normal operational variation' },
      threshold_breach: { value: 80, description: 'Threshold breach indicates operational limits exceeded' },
      cascade_risk: { value: 95, description: 'Cascade risk could trigger multiple failures' }
    }

    const riskInfo = riskValues[classifiedType]

    return {
      factor_name: 'Pattern Type Risk',
      weight: 0.2,
      value: riskInfo.value,
      contribution_to_classification: (riskInfo.value / 100) * 0.2,
      description: riskInfo.description
    }
  }
}

// Export utility functions for testing and external use
export const ClassificationUtils = {
  /**
   * Get human-readable severity description
   */
  getSeverityDescription: (severity: PatternSeverity): string => {
    const descriptions: Record<PatternSeverity, string> = {
      critical: 'Critical - Immediate action required to prevent failure',
      warning: 'Warning - Schedule maintenance to prevent degradation',
      info: 'Info - Monitor for trend development'
    }
    return descriptions[severity]
  },

  /**
   * Get human-readable pattern type description
   */
  getPatternTypeDescription: (patternType: ClassifiedPatternType): string => {
    const descriptions: Record<ClassifiedPatternType, string> = {
      sustained_failure: 'Continuous failure over extended period',
      intermittent_failure: 'Periodic failures with recovery periods',
      gradual_degradation: 'Slow performance decline over time',
      sudden_spike: 'Abrupt anomaly requiring investigation',
      cyclic_pattern: 'Repeating pattern that may indicate scheduling issue',
      threshold_breach: 'Operational limits exceeded',
      cascade_risk: 'Pattern indicating potential cascade failure'
    }
    return descriptions[patternType]
  },

  /**
   * Calculate priority score for sorting
   */
  calculatePriorityScore: (classification: ClassificationResult): number => {
    const severityWeight = { critical: 100, warning: 60, info: 30 }[classification.severity]
    return (
      classification.risk_score * 0.4 +
      severityWeight * 0.3 +
      classification.failure_probability * 0.3
    )
  }
}