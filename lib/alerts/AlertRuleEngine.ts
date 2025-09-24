/**
 * Alert Rule Engine
 * Story 4.1: Custom Alert Configuration
 *
 * Core engine for evaluating alert rules and triggering notifications
 */

import type {
  AlertConfiguration,
  AlertRule,
  AlertCondition,
  AlertInstance,
  MetricSnapshot,
  AlertContext,
  ComparisonOperator,
  AggregationFunction,
  AlertPriority,
  NotificationLog,
  AlertValidation
} from '../../types/alerts'

export interface SensorReading {
  sensor_id: string
  timestamp: string
  value: number
  unit: string
  quality: 'good' | 'warning' | 'error'
}

export interface EvaluationContext {
  current_time: string
  sensor_readings: SensorReading[]
  historical_data: SensorReading[]
  system_status: unknown
  weather_data?: unknown
  occupancy_data?: unknown
}

export interface RuleEvaluationResult {
  rule_id: string
  triggered: boolean
  severity: AlertPriority
  conditions_met: ConditionResult[]
  metric_snapshots: MetricSnapshot[]
  confidence: number
  context: AlertContext
  suggested_actions: string[]
}

export interface ConditionResult {
  condition_id: string
  met: boolean
  actual_value: number
  threshold_value: number
  deviation: number
  evaluation_method: string
}

export class AlertRuleEngine {
  private anomalyDetector: AnomalyDetectionService
  private notificationService: NotificationService
  private metricCalculator: MetricCalculationService

  constructor() {
    this.anomalyDetector = new AnomalyDetectionService()
    this.notificationService = new NotificationService()
    this.metricCalculator = new MetricCalculationService()
  }

  /**
   * Evaluate all active alert configurations against current data
   */
  async evaluateAlerts(
    configurations: AlertConfiguration[],
    _context: EvaluationContext
  ): Promise<AlertInstance[]> {
    const triggeredAlerts: AlertInstance[] = []

    for (const _config of configurations) {
      if (config.status !== 'active') continue

      try {
        const results = await this.evaluateConfiguration(_config, _context)

        for (const result of results) {
          if (result.triggered) {
            const alertInstance = await this.createAlertInstance(_config, result, _context)
            triggeredAlerts.push(alertInstance)
          }
        }
      } catch (error) {
        console.error(`Error evaluating configuration ${config.id}:`, error)
      }
    }

    return triggeredAlerts
  }

  /**
   * Evaluate a single alert configuration
   */
  private async evaluateConfiguration(
    _config: AlertConfiguration,
    _context: EvaluationContext
  ): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = []

    for (const rule of config.rules) {
      if (!rule.enabled) continue

      try {
        const result = await this.evaluateRule(rule, _context)
        results.push(result)
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error)
      }
    }

    return results
  }

  /**
   * Evaluate a single alert rule
   */
  private async evaluateRule(
    rule: AlertRule,
    _context: EvaluationContext
  ): Promise<RuleEvaluationResult> {
    const conditionResults: ConditionResult[] = []
    const metricSnapshots: MetricSnapshot[] = []

    // Evaluate each condition
    for (const condition of rule.conditions) {
      try {
        const conditionResult = await this.evaluateCondition(condition, _context)
        conditionResults.push(conditionResult)

        // Create metric snapshot
        const snapshot: MetricSnapshot = {
          metric: condition.metric,
          value: conditionResult.actual_value,
          threshold: conditionResult.threshold_value,
          timestamp: context.current_time,
          evaluation_window: `${condition.time_aggregation._period} minutes`,
          contributing_factors: this.getContributingFactors(condition, _context)
        }
        metricSnapshots.push(snapshot)
      } catch (error) {
        console.error(`Error evaluating condition ${condition.id}:`, error)
        conditionResults.push({
          condition_id: condition.id,
          met: false,
          actual_value: 0,
          threshold_value: 0,
          deviation: 0,
          evaluation_method: 'error'
        })
      }
    }

    // Apply logical operator to determine if rule is triggered
    const triggered = this.applyLogicalOperator(
      rule.logical_operator,
      conditionResults.map(r => r.met)
    )

    // Calculate confidence based on how many conditions are met and their deviations
    const confidence = this.calculateConfidence(conditionResults)

    // Build context for this alert
    const alertContext = await this.buildAlertContext(rule, _context, metricSnapshots)

    // Generate suggested actions
    const suggestedActions = await this.generateSuggestedActions(rule, conditionResults, alertContext)

    return {
      rule_id: rule.id,
      triggered,
      severity: rule.priority,
      conditions_met: conditionResults,
      metric_snapshots: metricSnapshots,
      confidence,
      context: alertContext,
      suggested_actions: suggestedActions
    }
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: AlertCondition,
    _context: EvaluationContext
  ): Promise<ConditionResult> {
    // Get relevant sensor data based on metric configuration
    const relevantData = this.filterRelevantData(condition, _context)

    // Apply time aggregation
    const aggregatedValue = this.applyAggregation(
      relevantData,
      condition.time_aggregation
    )

    // Handle different comparison operators
    const met = await this.evaluateComparison(
      condition.operator,
      aggregatedValue,
      condition.threshold,
      condition,
      _context
    )

    const deviation = this.calculateDeviation(
      aggregatedValue,
      condition.threshold.value,
      condition.operator
    )

    return {
      condition_id: condition.id,
      met,
      actual_value: aggregatedValue,
      threshold_value: condition.threshold.value,
      deviation,
      evaluation_method: condition.operator
    }
  }

  /**
   * Filter sensor data relevant to the condition
   */
  private filterRelevantData(
    condition: AlertCondition,
    _context: EvaluationContext
  ): SensorReading[] {
    const metric = condition.metric

    // Filter by metric type and any specified sensors
    let filteredData = context.sensor_readings.filter(reading => {
      // Match metric type to sensor data
      const matchesMetric = this.doesReadingMatchMetric(reading, metric)

      // Apply any additional filters
      const matchesFilters = condition.filters.every(filter =>
        this.applyFilter(reading, filter)
      )

      return matchesMetric && matchesFilters
    })

    // Apply time window filtering
    const windowStart = new Date(context.current_time)
    windowStart.setMinutes(windowStart.getMinutes() - condition.time_aggregation.period)

    filteredData = filteredData.filter(reading =>
      new Date(reading.timestamp) >= windowStart
    )

    return filteredData
  }

  /**
   * Check if a sensor reading matches the metric criteria
   */
  private doesReadingMatchMetric(reading: SensorReading, metric: { type: string; equipment_type?: string; floor_number?: number }): boolean {
    // This would map sensor types to metric types
    const metricMapping: { [key: string]: string[] } = {
      'energy_consumption': ['energy', 'power', 'kwh'],
      'temperature': ['temperature', 'temp'],
      'humidity': ['humidity', 'rh'],
      'pressure': ['pressure', 'pa'],
      'air_quality': ['co2', 'pm25', 'voc']
    }

    const validSensorTypes = metricMapping[metric.type] || []

    // Check if sensor ID contains relevant keywords or is specifically selected
    if (metric.sensor_id && reading.sensor_id === metric.sensor_id) {
      return true
    }

    // Check sensor type matching
    return validSensorTypes.some(type =>
      reading.sensor_id.toLowerCase().includes(type) ||
      reading.unit.toLowerCase().includes(type)
    )
  }

  /**
   * Apply filter conditions to sensor reading
   */
  private applyFilter(reading: SensorReading, filter: { field: string; operator: string; value: unknown }): boolean {
    // Simplified filter implementation
    const fieldValue = (reading as Record<string, unknown>)[filter.field]

    switch (filter.operator) {
      case 'equals':
        return fieldValue === filter.value
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase())
      case 'greater_than':
        return Number(fieldValue) > Number(filter.value)
      case 'less_than':
        return Number(fieldValue) < Number(filter.value)
      default:
        return true
    }
  }

  /**
   * Apply time aggregation function to sensor data
   */
  private applyAggregation(
    data: SensorReading[],
    aggregation: { function: string; minimum_data_points: number }
  ): number {
    if (data.length === 0) return 0
    if (data.length < aggregation.minimum_data_points) return 0

    const values = data.map(reading => reading.value).filter(v => !isNaN(v))

    switch (aggregation.function as AggregationFunction) {
      case 'average':
        return values.reduce((sum, val) => sum + val, 0) / values.length

      case 'sum':
        return values.reduce((sum, val) => sum + val, 0)

      case 'minimum':
        return Math.min(...values)

      case 'maximum':
        return Math.max(...values)

      case 'count':
        return values.length

      case 'median':
        const sorted = values.sort((a, b) => a - b)
        const middle = Math.floor(sorted.length / 2)
        return sorted.length % 2 === 0
          ? (sorted[middle - 1] + sorted[middle]) / 2
          : sorted[middle]

      case 'percentile':
        // Assume 95th percentile if not specified
        const percentile = 0.95
        const sorted95 = values.sort((a, b) => a - b)
        const index = Math.floor(percentile * sorted95.length)
        return sorted95[Math.min(index, sorted95.length - 1)]

      case 'standard_deviation':
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
        return Math.sqrt(variance)

      case 'rate_of_change':
        if (values.length < 2) return 0
        const firstValue = values[0]
        const lastValue = values[values.length - 1]
        const timeSpan = (new Date(data[data.length - 1].timestamp).getTime() -
                         new Date(data[0].timestamp).getTime()) / (1000 * 60) // minutes
        return timeSpan > 0 ? (lastValue - firstValue) / timeSpan : 0

      default:
        return values.reduce((sum, val) => sum + val, 0) / values.length
    }
  }

  /**
   * Evaluate comparison operators
   */
  private async evaluateComparison(
    operator: ComparisonOperator,
    actualValue: number,
    threshold: unknown,
    condition: AlertCondition,
    _context: EvaluationContext
  ): Promise<boolean> {
    switch (operator) {
      case 'greater_than':
        return actualValue > threshold.value

      case 'less_than':
        return actualValue < threshold.value

      case 'equals':
        return Math.abs(actualValue - threshold.value) < 0.001

      case 'not_equals':
        return Math.abs(actualValue - threshold.value) >= 0.001

      case 'greater_than_or_equal':
        return actualValue >= threshold.value

      case 'less_than_or_equal':
        return actualValue <= threshold.value

      case 'between':
        return actualValue >= threshold.value &&
               actualValue <= (threshold.secondary_value || threshold.value)

      case 'outside_range':
        return actualValue < threshold.value ||
               actualValue > (threshold.secondary_value || threshold.value)

      case 'percentage_change':
        const baselineValue = await this.getBaselineValue(condition, _context, threshold.baseline_period)
        if (baselineValue === 0) return false
        const percentChange = Math.abs((actualValue - baselineValue) / baselineValue) * 100
        return percentChange > threshold.value

      case 'rate_of_change':
        // Rate of change is calculated in aggregation, compare against threshold
        return Math.abs(actualValue) > threshold.value

      case 'anomaly_detected':
        return await this.anomalyDetector.detectAnomaly(
          actualValue,
          condition,
          _context,
          threshold.confidence_level || 0.95
        )

      default:
        return false
    }
  }

  /**
   * Get baseline value for percentage/rate comparisons
   */
  private async getBaselineValue(
    condition: AlertCondition,
    _context: EvaluationContext,
    baselinePeriod?: string
  ): Promise<number> {
    // Get historical data for baseline calculation
    // This would query historical data from the database
    const _period = baselinePeriod || '7d'
    const historicalData = await this.getHistoricalData(condition, _context, _period)

    return this.applyAggregation(historicalData, condition.time_aggregation)
  }

  /**
   * Get historical data for baseline calculations
   */
  private async getHistoricalData(
    condition: AlertCondition,
    _context: EvaluationContext,
    _period: string
  ): Promise<SensorReading[]> {
    // Mock implementation - would query actual database
    return context.historical_data.filter(reading =>
      this.doesReadingMatchMetric(reading, condition.metric)
    )
  }

  /**
   * Calculate deviation from threshold
   */
  private calculateDeviation(
    actualValue: number,
    thresholdValue: number,
    operator: ComparisonOperator
  ): number {
    switch (operator) {
      case 'greater_than':
      case 'greater_than_or_equal':
        return Math.max(0, actualValue - thresholdValue)

      case 'less_than':
      case 'less_than_or_equal':
        return Math.max(0, thresholdValue - actualValue)

      case 'equals':
        return Math.abs(actualValue - thresholdValue)

      case 'percentage_change':
        return Math.abs(actualValue) // Percentage change value

      default:
        return Math.abs(actualValue - thresholdValue)
    }
  }

  /**
   * Apply logical operator to condition results
   */
  private applyLogicalOperator(operator: string, results: boolean[]): boolean {
    switch (operator) {
      case 'AND':
        return results.every(result => result)
      case 'OR':
        return results.some(result => result)
      default:
        return results.every(result => result)
    }
  }

  /**
   * Calculate confidence score for alert
   */
  private calculateConfidence(conditionResults: ConditionResult[]): number {
    if (conditionResults.length === 0) return 0

    const metConditions = conditionResults.filter(r => r.met)
    const baseConfidence = metConditions.length / conditionResults.length

    // Adjust confidence based on deviation magnitude
    const avgDeviation = metConditions.reduce((sum, r) => {
      const normalizedDeviation = Math.min(r.deviation / Math.abs(r.threshold_value || 1), 2)
      return sum + normalizedDeviation
    }, 0) / Math.max(metConditions.length, 1)

    const deviationBonus = Math.min(avgDeviation * 0.2, 0.3)

    return Math.min(baseConfidence + deviationBonus, 1.0)
  }

  /**
   * Build alert context with relevant system information
   */
  private async buildAlertContext(
    rule: AlertRule,
    _context: EvaluationContext,
    snapshots: MetricSnapshot[]
  ): Promise<AlertContext> {
    return {
      sensor_data: snapshots.map(snapshot => ({
        sensor_id: snapshot.metric.sensor_id || 'unknown',
        sensor_name: snapshot.metric.display_name,
        current_value: snapshot.value,
        historical_average: 0, // Would calculate from historical data
        trend: 'stable',
        last_calibration: new Date().toISOString(),
        health_status: 'healthy'
      })),
      system_status: [],
      recent_changes: [],
      related_alerts: [],
      weather_conditions: context.weather_data,
      occupancy_status: context.occupancy_data
    }
  }

  /**
   * Get contributing factors for metric evaluation
   */
  private getContributingFactors(_condition: AlertCondition, _context: EvaluationContext): string[] {
    const factors: string[] = []

    // Add time-based factors
    const hour = new Date(context.current_time).getHours()
    if (hour >= 9 && hour <= 17) {
      factors.push('Business hours')
    } else if (hour >= 18 || hour <= 6) {
      factors.push('After hours')
    }

    // Add day of week
    const dayOfWeek = new Date(context.current_time).getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      factors.push('Weekend')
    } else {
      factors.push('Weekday')
    }

    // Add weather factors if available
    if (context.weather_data) {
      if (context.weather_data.temperature > 30) {
        factors.push('High temperature')
      } else if (context.weather_data.temperature < 5) {
        factors.push('Low temperature')
      }
    }

    return factors
  }

  /**
   * Generate suggested actions based on alert conditions
   */
  private async generateSuggestedActions(
    rule: AlertRule,
    conditionResults: ConditionResult[],
    _context: AlertContext
  ): Promise<string[]> {
    const actions: string[] = []

    // Analyze the type of conditions that triggered
    const triggeredConditions = conditionResults.filter(r => r.met)

    for (const condition of triggeredConditions) {
      // Add specific actions based on condition type and deviation
      if (condition.evaluation_method === 'greater_than') {
        actions.push(`Investigate why ${condition.condition_id} exceeded threshold by ${condition.deviation.toFixed(2)}`)
      }

      if (condition.deviation > condition.threshold_value * 0.5) {
        actions.push('Consider immediate investigation due to significant deviation')
      }
    }

    // Add general actions
    actions.push('Check system logs for related errors')
    actions.push('Verify sensor calibration and connectivity')

    if (context.recent_changes.length > 0) {
      actions.push('Review recent system changes that may have caused this alert')
    }

    return actions.slice(0, 5) // Limit to top 5 actions
  }

  /**
   * Create alert instance from evaluation result
   */
  private async createAlertInstance(
    _config: AlertConfiguration,
    result: RuleEvaluationResult,
    _context: EvaluationContext
  ): Promise<AlertInstance> {
    const rule = config.rules.find(r => r.id === result.rule_id)!

    // Check for existing unresolved alerts to avoid duplicates
    const existingAlert = await this.checkForDuplicateAlert(config.id, result.rule_id)

    if (existingAlert && rule.suppress_duplicates) {
      // Update existing alert instead of creating new one
      return existingAlert
    }

    const alertInstance: AlertInstance = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      configuration_id: config.id,
      rule_id: result.rule_id,
      status: 'triggered',
      severity: result.severity,
      title: `${rule.name} - ${config.name}`,
      description: this.generateAlertDescription(rule, result),
      metric_values: result.metric_snapshots,
      triggered_at: context.current_time,
      escalation_level: 0,
      false_positive: false,
      suppressed: false,
      notification_log: [],
      context: result.context
    }

    // Trigger notifications
    await this.sendNotifications(_config, alertInstance)

    return alertInstance
  }

  /**
   * Check for duplicate alerts to avoid spam
   */
  private async checkForDuplicateAlert(
    _configId: string,
    _ruleId: string
  ): Promise<AlertInstance | null> {
    // This would query the database for recent unresolved alerts
    // For now, return null (no duplicates)
    return null
  }

  /**
   * Generate human-readable alert description
   */
  private generateAlertDescription(rule: AlertRule, result: RuleEvaluationResult): string {
    const triggeredConditions = result.conditions_met.filter(c => c.met)

    if (triggeredConditions.length === 1) {
      const condition = triggeredConditions[0]
      return `${rule.description || rule.name}: Value ${condition.actual_value.toFixed(2)} ${condition.evaluation_method.replace('_', ' ')} threshold ${condition.threshold_value.toFixed(2)}`
    } else {
      return `${rule.description || rule.name}: Multiple conditions triggered (${triggeredConditions.length}/${result.conditions_met.length})`
    }
  }

  /**
   * Send notifications for triggered alert
   */
  private async sendNotifications(
    _config: AlertConfiguration,
    _alert: AlertInstance
  ): Promise<void> {
    try {
      const notifications = await this.notificationService.sendAlertNotifications(
        config.notification_settings,
        _alert
      )

      // Update alert with notification log
      alert.notification_log = notifications
    } catch (error) {
      console.error('Failed to send notifications:', error)
    }
  }

  /**
   * Validate alert configuration before saving
   */
  async validateConfiguration(_config: Partial<AlertConfiguration>): Promise<AlertValidation> {
    const errors: unknown[] = []
    const warnings: unknown[] = []
    const suggestions: unknown[] = []

    // Validate basic fields
    if (!config.name) {
      errors.push({
        field: 'name',
        error_code: 'REQUIRED',
        message: 'Configuration name is required',
        severity: 'error'
      })
    }

    if (!config.rules || config.rules.length === 0) {
      errors.push({
        field: 'rules',
        error_code: 'REQUIRED',
        message: 'At least one rule is required',
        severity: 'error'
      })
    }

    // Validate rules
    if (config.rules) {
      for (const [index, rule] of config.rules.entries()) {
        if (rule.conditions.length === 0) {
          errors.push({
            field: `rules[${index}].conditions`,
            error_code: 'REQUIRED',
            message: `Rule "${rule.name}" must have at least one condition`,
            severity: 'error'
          })
        }

        // Check for overly sensitive thresholds
        for (const condition of rule.conditions) {
          if (condition.threshold.value === 0 && condition.operator !== 'equals') {
            warnings.push({
              field: `rules[${index}].conditions`,
              warning_code: 'SENSITIVE_THRESHOLD',
              message: `Zero threshold may cause excessive alerts`,
              recommendation: 'Consider setting a more appropriate threshold value'
            })
          }
        }
      }
    }

    // Estimate alert volume
    const estimatedVolume = this.estimateAlertVolume(_config)
    if (estimatedVolume > 100) {
      warnings.push({
        field: 'rules',
        warning_code: 'HIGH_VOLUME',
        message: `Estimated ${estimatedVolume} alerts per day may be excessive`,
        recommendation: 'Consider adjusting thresholds or adding cooldown periods'
      })
    }

    // Check subscription compatibility
    const subscriptionCompatibility = this.checkSubscriptionCompatibility(_config)

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      estimated_alert_volume: estimatedVolume,
      estimated_cost_impact: estimatedVolume * 0.10, // $0.10 per alert
      subscription_compatibility: subscriptionCompatibility
    }
  }

  /**
   * Estimate daily alert volume for configuration
   */
  private estimateAlertVolume(_config: Partial<AlertConfiguration>): number {
    if (!config.rules) return 0

    let totalVolume = 0

    for (const rule of config.rules) {
      if (!rule.enabled) continue

      // Base estimate based on evaluation window
      const evaluationsPerDay = (24 * 60) / rule.evaluation_window

      // Assume 5% trigger rate for average conditions
      const triggerRate = 0.05

      // Apply cooldown reduction
      const cooldownReduction = rule.cooldown_period / (24 * 60)

      const ruleVolume = evaluationsPerDay * triggerRate * (1 - cooldownReduction)
      totalVolume += Math.max(ruleVolume, 1) // Minimum 1 alert per day per rule
    }

    return Math.round(totalVolume)
  }

  /**
   * Check subscription tier compatibility
   */
  private checkSubscriptionCompatibility(_config: Partial<AlertConfiguration>): unknown {
    // Mock implementation - would check against actual subscription limits
    const professionalFeatures = [
      'Advanced metrics',
      'Multiple notification channels',
      'Escalation policies',
      'Anomaly detection'
    ]

    return {
      tier_required: 'professional',
      features_available: professionalFeatures,
      features_blocked: [],
      upgrade_benefits: [
        'Unlimited alert rules',
        'Advanced anomaly detection',
        'API access for integrations',
        'Priority support'
      ],
      estimated_monthly_cost: 29.99
    }
  }
}

// Supporting services
class AnomalyDetectionService {
  async detectAnomaly(
    value: number,
    condition: AlertCondition,
    _context: EvaluationContext,
    confidenceLevel: number
  ): Promise<boolean> {
    // Simplified anomaly detection
    // In real implementation, this would use machine learning models

    if (!condition.anomaly_detection) return false

    // Get historical data for comparison
    const historicalData = context.historical_data.filter(reading =>
      reading.sensor_id === condition.metric.sensor_id
    )

    if (historicalData.length < 10) return false

    const values = historicalData.map(r => r.value)
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    )

    // Simple statistical outlier detection
    const zScore = Math.abs((value - mean) / stdDev)
    const threshold = confidenceLevel === 0.95 ? 2.0 : confidenceLevel === 0.99 ? 2.6 : 1.6

    return zScore > threshold
  }
}

class NotificationService {
  async sendAlertNotifications(
    settings: unknown,
    _alert: AlertInstance
  ): Promise<NotificationLog[]> {
    const notifications: NotificationLog[] = []

    // Mock notification sending
    for (const channel of settings.channels || []) {
      if (!channel.enabled) continue

      const notification: NotificationLog = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        channel: channel.type,
        recipient: 'admin@example.com', // Would get from channel config
        sent_at: new Date().toISOString(),
        status: 'sent',
        retry_count: 0
      }

      notifications.push(notification)
    }

    return notifications
  }
}

class MetricCalculationService {
  async calculateMetric(metric: unknown, _context: EvaluationContext): Promise<number> {
    // Calculate custom metrics based on formulas
    if (metric.calculation) {
      // Parse and evaluate formula
      return this.evaluateFormula(metric.calculation._formula, metric.calculation._variables, _context)
    }

    return 0
  }

  private evaluateFormula(_formula: string, _variables: unknown, _context: EvaluationContext): number {
    // Simplified formula evaluation
    // In real implementation, would use a proper expression parser
    return 0
  }
}