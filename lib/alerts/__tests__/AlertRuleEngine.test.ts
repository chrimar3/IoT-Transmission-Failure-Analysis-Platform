/**
 * Comprehensive Unit Tests for AlertRuleEngine
 * Story 4.1: Custom Alert Configuration - QA Remediation
 *
 * Testing all evaluation logic, conditions, aggregations, and alert triggering
 */

import { AlertRuleEngine } from '../AlertRuleEngine'
import type {
  AlertConfiguration,
  AlertRule,
  AlertCondition,
  AlertInstance,
  EvaluationContext,
  SensorReading,
  ComparisonOperator,
  AggregationFunction,
  AlertPriority,
  MetricType
} from '../../../types/alerts'

// Test-specific interfaces
interface TestThresholdValue {
  value: number
  secondary_value?: number
  baseline_period?: string
}

interface TestConditionResult {
  condition_id: string
  met: boolean
  actual_value: number
  threshold_value: number
  deviation: number
  evaluation_method: string
}

interface TestAlertContext {
  sensor_data: unknown[]
  system_status: unknown[]
  recent_changes: { timestamp: string; description: string }[]
  related_alerts: unknown[]
}

interface MockAggregationConfig {
  function: AggregationFunction
  period: number
  minimum_data_points: number
}

// Extended AlertRuleEngine interface for testing private methods
interface TestableAlertRuleEngine {
  validateConfiguration(config: Partial<AlertConfiguration>): Promise<AlertValidation>
  evaluateAlerts(configs: AlertConfiguration[], context: EvaluationContext): Promise<AlertInstance[]>
  applyAggregation(data: SensorReading[], config: MockAggregationConfig): number
  evaluateComparison(operator: ComparisonOperator, actualValue: number, threshold: TestThresholdValue, condition: AlertCondition, context: EvaluationContext): Promise<boolean>
  filterRelevantData(condition: AlertCondition, context: EvaluationContext): SensorReading[]
  calculateConfidence(conditionResults: TestConditionResult[]): number
  buildAlertContext(rule: AlertRule, context: EvaluationContext, snapshots: MetricSnapshot[]): Promise<AlertContext>
  getContributingFactors(condition: AlertCondition, context: EvaluationContext): string[]
  generateSuggestedActions(rule: AlertRule, conditionResults: TestConditionResult[], context: TestAlertContext): Promise<string[]>
  estimateAlertVolume(config: Partial<AlertConfiguration>): number
  getBaselineValue(condition: AlertCondition, context: EvaluationContext): Promise<number>
  checkForDuplicateAlert(alert: AlertInstance): Promise<AlertInstance>
}

describe('AlertRuleEngine', () => {
  let alertEngine: AlertRuleEngine
  let mockEvaluationContext: EvaluationContext

  beforeEach(() => {
    alertEngine = new AlertRuleEngine()

    // Mock evaluation context with Bangkok dataset simulation
    mockEvaluationContext = {
      current_time: '2025-09-23T10:30:00Z',
      sensor_readings: [
        {
          sensor_id: 'HVAC_001_ENERGY',
          timestamp: '2025-09-23T10:30:00Z',
          value: 1200.5,
          unit: 'kWh',
          quality: 'good'
        },
        {
          sensor_id: 'HVAC_001_TEMP',
          timestamp: '2025-09-23T10:30:00Z',
          value: 24.5,
          unit: '°C',
          quality: 'good'
        },
        {
          sensor_id: 'HVAC_002_ENERGY',
          timestamp: '2025-09-23T10:30:00Z',
          value: 850.2,
          unit: 'kWh',
          quality: 'good'
        },
        {
          sensor_id: 'AIR_QUALITY_001',
          timestamp: '2025-09-23T10:30:00Z',
          value: 450,
          unit: 'ppm',
          quality: 'good'
        }
      ],
      historical_data: [
        {
          sensor_id: 'HVAC_001_ENERGY',
          timestamp: '2025-09-23T09:30:00Z',
          value: 1100.0,
          unit: 'kWh',
          quality: 'good'
        },
        {
          sensor_id: 'HVAC_001_ENERGY',
          timestamp: '2025-09-23T08:30:00Z',
          value: 1050.0,
          unit: 'kWh',
          quality: 'good'
        }
      ],
      system_status: {},
      weather_data: {
        temperature: 32,
        humidity: 75,
        wind_speed: 5
      },
      occupancy_data: {
        current_occupancy: 150,
        typical_occupancy: 120
      }
    }
  })

  describe('Alert Configuration Validation', () => {
    it('should validate valid alert configuration', async () => {
      const validConfig = createValidAlertConfig()

      const validation = await alertEngine.validateConfiguration(validConfig)

      expect(validation.is_valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.estimated_alert_volume).toBeGreaterThan(0)
    })

    it('should reject configuration without name', async () => {
      const invalidConfig = createValidAlertConfig()
      delete invalidConfig.name

      const validation = await alertEngine.validateConfiguration(invalidConfig)

      expect(validation.is_valid).toBe(false)
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          error_code: 'REQUIRED'
        })
      )
    })

    it('should reject configuration without rules', async () => {
      const invalidConfig = createValidAlertConfig()
      invalidConfig.rules = []

      const validation = await alertEngine.validateConfiguration(invalidConfig)

      expect(validation.is_valid).toBe(false)
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'rules',
          error_code: 'REQUIRED'
        })
      )
    })

    it('should warn about zero thresholds', async () => {
      const configWithZeroThreshold = createValidAlertConfig()
      configWithZeroThreshold.rules![0].conditions[0].threshold.value = 0

      const validation = await alertEngine.validateConfiguration(configWithZeroThreshold)

      expect(validation.warnings).toContainEqual(
        expect.objectContaining({
          warning_code: 'SENSITIVE_THRESHOLD'
        })
      )
    })

    it('should warn about high volume alerts', async () => {
      const highVolumeConfig = createValidAlertConfig()
      // Set very short evaluation window to trigger high volume warning
      highVolumeConfig.rules![0].evaluation_window = 1
      highVolumeConfig.rules![0].cooldown_period = 0

      const validation = await alertEngine.validateConfiguration(highVolumeConfig)

      // The implementation estimates volume, should be high with 1-minute evaluation window
      expect(validation.estimated_alert_volume).toBeGreaterThan(50)
    })
  })

  describe('Rule Evaluation Logic', () => {
    it('should evaluate basic greater than condition correctly', async () => {
      const configurations = [createEnergyConsumptionAlertConfig()]

      const results = await alertEngine.evaluateAlerts(configurations, mockEvaluationContext)

      expect(results).toHaveLength(1)
      expect(results[0].severity).toBe('high')
      expect(results[0].status).toBe('triggered')
      expect(results[0].metric_values[0].value).toBeGreaterThan(1000) // Should exceed threshold
    })

    it('should not trigger when threshold not exceeded', async () => {
      const config = createEnergyConsumptionAlertConfig()
      // Set threshold much higher than current value
      config.rules[0].conditions[0].threshold.value = 5000

      const results = await alertEngine.evaluateAlerts([config], mockEvaluationContext)

      expect(results).toHaveLength(0)
    })

    it('should evaluate multiple conditions with AND operator', async () => {
      const config = createMultiConditionAlertConfig('AND')

      // Mock context where both conditions are met
      const contextBothMet = {
        ...mockEvaluationContext,
        sensor_readings: [
          ...mockEvaluationContext.sensor_readings,
          {
            sensor_id: 'TEMP_001',
            timestamp: '2025-09-23T10:30:00Z',
            value: 28.0, // Above threshold of 26
            unit: '°C',
            quality: 'good'
          }
        ]
      }

      const results = await alertEngine.evaluateAlerts([config], contextBothMet)

      expect(results).toHaveLength(1)
      expect(results[0].metric_values).toHaveLength(2)
    })

    it('should evaluate multiple conditions with OR operator', async () => {
      const config = createMultiConditionAlertConfig('OR')

      // Mock context where only one condition is met
      const contextOneMet = {
        ...mockEvaluationContext,
        sensor_readings: [
          ...mockEvaluationContext.sensor_readings,
          {
            sensor_id: 'TEMP_001',
            timestamp: '2025-09-23T10:30:00Z',
            value: 22.0, // Below threshold of 26
            unit: '°C',
            quality: 'good'
          }
        ]
      }

      const results = await alertEngine.evaluateAlerts([config], contextOneMet)

      expect(results).toHaveLength(1) // Should trigger because energy condition is met
    })

    it('should respect cooldown period for duplicate alerts', async () => {
      const config = createEnergyConsumptionAlertConfig()
      config.rules[0].suppress_duplicates = true

      // First evaluation should trigger
      const firstResults = await alertEngine.evaluateAlerts([config], mockEvaluationContext)
      expect(firstResults).toHaveLength(1)

      // Mock duplicate check to return existing alert
      jest.spyOn(alertEngine as TestableAlertRuleEngine, 'checkForDuplicateAlert')
        .mockResolvedValue(firstResults[0])

      // Second evaluation should not create new alert
      const secondResults = await alertEngine.evaluateAlerts([config], mockEvaluationContext)
      expect(secondResults).toHaveLength(1)
      expect(secondResults[0].id).toBe(firstResults[0].id)
    })
  })

  describe('Aggregation Functions', () => {
    it('should calculate average correctly', () => {
      const sensorData: SensorReading[] = [
        { sensor_id: 'test', timestamp: '2025-09-23T10:00:00Z', value: 100, unit: 'kWh', quality: 'good' },
        { sensor_id: 'test', timestamp: '2025-09-23T10:05:00Z', value: 150, unit: 'kWh', quality: 'good' },
        { sensor_id: 'test', timestamp: '2025-09-23T10:10:00Z', value: 200, unit: 'kWh', quality: 'good' }
      ]

      const result = (alertEngine as TestableAlertRuleEngine).applyAggregation(sensorData, {
        function: 'average',
        period: 15,
        minimum_data_points: 3
      })

      expect(result).toBe(150) // (100 + 150 + 200) / 3
    })

    it('should calculate sum correctly', () => {
      const sensorData: SensorReading[] = [
        { sensor_id: 'test', timestamp: '2025-09-23T10:00:00Z', value: 100, unit: 'kWh', quality: 'good' },
        { sensor_id: 'test', timestamp: '2025-09-23T10:05:00Z', value: 150, unit: 'kWh', quality: 'good' }
      ]

      const result = (alertEngine as TestableAlertRuleEngine).applyAggregation(sensorData, {
        function: 'sum',
        period: 15,
        minimum_data_points: 2
      })

      expect(result).toBe(250)
    })

    it('should calculate median correctly', () => {
      const sensorData: SensorReading[] = [
        { sensor_id: 'test', timestamp: '2025-09-23T10:00:00Z', value: 100, unit: 'kWh', quality: 'good' },
        { sensor_id: 'test', timestamp: '2025-09-23T10:05:00Z', value: 150, unit: 'kWh', quality: 'good' },
        { sensor_id: 'test', timestamp: '2025-09-23T10:10:00Z', value: 200, unit: 'kWh', quality: 'good' },
        { sensor_id: 'test', timestamp: '2025-09-23T10:15:00Z', value: 250, unit: 'kWh', quality: 'good' },
        { sensor_id: 'test', timestamp: '2025-09-23T10:20:00Z', value: 300, unit: 'kWh', quality: 'good' }
      ]

      const result = (alertEngine as TestableAlertRuleEngine).applyAggregation(sensorData, {
        function: 'median',
        period: 25,
        minimum_data_points: 5
      })

      expect(result).toBe(200) // Middle value of [100, 150, 200, 250, 300]
    })

    it('should calculate standard deviation correctly', () => {
      const sensorData: SensorReading[] = [
        { sensor_id: 'test', timestamp: '2025-09-23T10:00:00Z', value: 100, unit: 'kWh', quality: 'good' },
        { sensor_id: 'test', timestamp: '2025-09-23T10:05:00Z', value: 150, unit: 'kWh', quality: 'good' },
        { sensor_id: 'test', timestamp: '2025-09-23T10:10:00Z', value: 200, unit: 'kWh', quality: 'good' }
      ]

      const result = (alertEngine as TestableAlertRuleEngine).applyAggregation(sensorData, {
        function: 'standard_deviation',
        period: 15,
        minimum_data_points: 3
      })

      // Expected: sqrt(((100-150)² + (150-150)² + (200-150)²) / 3) ≈ 40.82
      expect(result).toBeCloseTo(40.82, 1)
    })

    it('should return zero when insufficient data points', () => {
      const sensorData: SensorReading[] = [
        { sensor_id: 'test', timestamp: '2025-09-23T10:00:00Z', value: 100, unit: 'kWh', quality: 'good' }
      ]

      const result = (alertEngine as TestableAlertRuleEngine).applyAggregation(sensorData, {
        function: 'average',
        period: 15,
        minimum_data_points: 3
      })

      expect(result).toBe(0)
    })
  })

  describe('Comparison Operators', () => {
    const testCases: Array<{
      operator: ComparisonOperator
      actualValue: number
      threshold: TestThresholdValue
      expected: boolean
      description: string
    }> = [
      {
        operator: 'greater_than',
        actualValue: 150,
        threshold: { value: 100 },
        expected: true,
        description: '150 > 100'
      },
      {
        operator: 'less_than',
        actualValue: 50,
        threshold: { value: 100 },
        expected: true,
        description: '50 < 100'
      },
      {
        operator: 'equals',
        actualValue: 100.0001,
        threshold: { value: 100 },
        expected: true,
        description: 'values within 0.001 tolerance'
      },
      {
        operator: 'between',
        actualValue: 75,
        threshold: { value: 50, secondary_value: 100 },
        expected: true,
        description: '75 between 50 and 100'
      },
      {
        operator: 'outside_range',
        actualValue: 150,
        threshold: { value: 50, secondary_value: 100 },
        expected: true,
        description: '150 outside range 50-100'
      }
    ]

    testCases.forEach(({ operator, actualValue, threshold, expected, description }) => {
      it(`should evaluate ${operator} correctly: ${description}`, async () => {
        const result = await (alertEngine as TestableAlertRuleEngine).evaluateComparison(
          operator,
          actualValue,
          threshold,
          createMockCondition(),
          mockEvaluationContext
        )

        expect(result).toBe(expected)
      })
    })

    it('should evaluate percentage change correctly', async () => {
      // Mock baseline value calculation
      jest.spyOn(alertEngine as TestableAlertRuleEngine, 'getBaselineValue')
        .mockResolvedValue(1000)

      const result = await (alertEngine as TestableAlertRuleEngine).evaluateComparison(
        'percentage_change',
        1200, // 20% increase from baseline of 1000
        { value: 15, baseline_period: '7d' }, // Threshold of 15%
        createMockCondition(),
        mockEvaluationContext
      )

      expect(result).toBe(true) // 20% > 15% threshold
    })

    it('should handle zero baseline in percentage change', async () => {
      jest.spyOn(alertEngine as TestableAlertRuleEngine, 'getBaselineValue')
        .mockResolvedValue(0)

      const result = await (alertEngine as TestableAlertRuleEngine).evaluateComparison(
        'percentage_change',
        1200,
        { value: 15 },
        createMockCondition(),
        mockEvaluationContext
      )

      expect(result).toBe(false) // Should not trigger when baseline is zero
    })
  })

  describe('Metric Filtering and Matching', () => {
    it('should filter sensors by metric type correctly', () => {
      const energyCondition = createMockCondition('energy_consumption')

      const filteredData = (alertEngine as TestableAlertRuleEngine).filterRelevantData(
        energyCondition,
        mockEvaluationContext
      )

      expect(filteredData).toHaveLength(2) // HVAC_001_ENERGY and HVAC_002_ENERGY
      expect(filteredData.every(reading =>
        reading.sensor_id.includes('ENERGY')
      )).toBe(true)
    })

    it('should filter by specific sensor ID when provided', () => {
      const condition = createMockCondition('energy_consumption')
      condition.metric.sensor_id = 'HVAC_001_ENERGY'

      const filteredData = (alertEngine as TestableAlertRuleEngine).filterRelevantData(
        condition,
        mockEvaluationContext
      )

      expect(filteredData.length).toBeGreaterThanOrEqual(1)
      // Should include the specific sensor
      expect(filteredData.some(reading => reading.sensor_id === 'HVAC_001_ENERGY')).toBe(true)
    })

    it('should apply time window filtering', () => {
      const condition = createMockCondition('energy_consumption')
      condition.time_aggregation.period = 30 // 30 minutes

      // Add older reading outside time window
      const contextWithOldData = {
        ...mockEvaluationContext,
        sensor_readings: [
          ...mockEvaluationContext.sensor_readings,
          {
            sensor_id: 'HVAC_001_ENERGY',
            timestamp: '2025-09-23T09:00:00Z', // 90 minutes ago
            value: 500,
            unit: 'kWh',
            quality: 'good'
          }
        ]
      }

      const filteredData = (alertEngine as TestableAlertRuleEngine).filterRelevantData(
        condition,
        contextWithOldData
      )

      // Should not include the 90-minute-old reading
      expect(filteredData.every(reading =>
        new Date(reading.timestamp) >= new Date('2025-09-23T10:00:00Z')
      )).toBe(true)
    })

    it('should apply custom filters correctly', () => {
      const condition = createMockCondition('energy_consumption')
      condition.filters = [
        {
          field: 'quality',
          operator: 'equals',
          value: 'good'
        }
      ]

      const contextWithBadQuality = {
        ...mockEvaluationContext,
        sensor_readings: [
          ...mockEvaluationContext.sensor_readings,
          {
            sensor_id: 'HVAC_003_ENERGY',
            timestamp: '2025-09-23T10:30:00Z',
            value: 800,
            unit: 'kWh',
            quality: 'error'
          }
        ]
      }

      const filteredData = (alertEngine as TestableAlertRuleEngine).filterRelevantData(
        condition,
        contextWithBadQuality
      )

      expect(filteredData.every(reading => reading.quality === 'good')).toBe(true)
    })
  })

  describe('Confidence Calculation', () => {
    it('should calculate confidence based on conditions met', () => {
      const conditionResults = [
        {
          condition_id: 'condition_1',
          met: true,
          actual_value: 150,
          threshold_value: 100,
          deviation: 50,
          evaluation_method: 'greater_than'
        },
        {
          condition_id: 'condition_2',
          met: true,
          actual_value: 200,
          threshold_value: 100,
          deviation: 100,
          evaluation_method: 'greater_than'
        }
      ]

      const confidence = (alertEngine as TestableAlertRuleEngine).calculateConfidence(conditionResults)

      expect(confidence).toBeGreaterThan(0.8) // High confidence with both conditions met
      expect(confidence).toBeLessThanOrEqual(1.0) // Capped at 1.0
    })

    it('should return zero confidence when no conditions', () => {
      const confidence = (alertEngine as TestableAlertRuleEngine).calculateConfidence([])

      expect(confidence).toBe(0)
    })

    it('should handle partial condition fulfillment', () => {
      const conditionResults = [
        {
          condition_id: 'condition_1',
          met: true,
          actual_value: 150,
          threshold_value: 100,
          deviation: 50,
          evaluation_method: 'greater_than'
        },
        {
          condition_id: 'condition_2',
          met: false,
          actual_value: 50,
          threshold_value: 100,
          deviation: 0,
          evaluation_method: 'greater_than'
        }
      ]

      const confidence = (alertEngine as TestableAlertRuleEngine).calculateConfidence(conditionResults)

      expect(confidence).toBeCloseTo(0.6, 1) // Base 50% plus deviation bonus
    })
  })

  describe('Alert Context Building', () => {
    it('should build comprehensive alert context', async () => {
      const rule = createValidAlertConfig().rules![0]
      const snapshots = [
        {
          metric: { type: 'energy_consumption', display_name: 'Energy', units: 'kWh' },
          value: 1200,
          threshold: 1000,
          timestamp: '2025-09-23T10:30:00Z',
          evaluation_window: '5 minutes',
          contributing_factors: ['Business hours']
        }
      ]

      const context = await (alertEngine as TestableAlertRuleEngine).buildAlertContext(
        rule,
        mockEvaluationContext,
        snapshots
      )

      expect(context.sensor_data).toHaveLength(1)
      expect(context.sensor_data[0].current_value).toBe(1200)
      expect(context.weather_conditions).toBeDefined()
      expect(context.occupancy_status).toBeDefined()
    })
  })

  describe('Contributing Factors Analysis', () => {
    it('should identify business hours factor', () => {
      const contextBusinessHours = {
        ...mockEvaluationContext,
        current_time: '2025-09-23T14:00:00Z' // 2 PM
      }

      const factors = (alertEngine as TestableAlertRuleEngine).getContributingFactors(
        createMockCondition(),
        contextBusinessHours
      )

      expect(factors).toContain('Business hours')
    })

    it('should identify after hours factor', () => {
      const contextAfterHours = {
        ...mockEvaluationContext,
        current_time: '2025-09-23T22:00:00Z' // 10 PM
      }

      const factors = (alertEngine as TestableAlertRuleEngine).getContributingFactors(
        createMockCondition(),
        contextAfterHours
      )

      expect(factors).toContain('After hours')
    })

    it('should identify weekend factor', () => {
      const contextWeekend = {
        ...mockEvaluationContext,
        current_time: '2025-09-21T14:00:00Z' // Sunday
      }

      const factors = (alertEngine as TestableAlertRuleEngine).getContributingFactors(
        createMockCondition(),
        contextWeekend
      )

      expect(factors).toContain('Weekend')
    })

    it('should identify weather factors', () => {
      const contextHotWeather = {
        ...mockEvaluationContext,
        weather_data: {
          temperature: 35, // High temperature
          humidity: 75,
          wind_speed: 5
        }
      }

      const factors = (alertEngine as TestableAlertRuleEngine).getContributingFactors(
        createMockCondition(),
        contextHotWeather
      )

      expect(factors).toContain('High temperature')
    })
  })

  describe('Suggested Actions Generation', () => {
    it('should generate relevant actions for threshold exceeded', async () => {
      const rule = createValidAlertConfig().rules![0]
      const conditionResults = [
        {
          condition_id: 'condition_1',
          met: true,
          actual_value: 1500,
          threshold_value: 1000,
          deviation: 500,
          evaluation_method: 'greater_than'
        }
      ]

      const actions = await (alertEngine as TestableAlertRuleEngine).generateSuggestedActions(
        rule,
        conditionResults,
        { sensor_data: [], system_status: [], recent_changes: [], related_alerts: [] }
      )

      expect(actions.length).toBeGreaterThan(0)
      expect(actions.some(action => action.includes('condition_1'))).toBe(true)
      expect(actions.some(action => action.includes('Check system logs'))).toBe(true)
    })

    it('should suggest reviewing recent changes when available', async () => {
      const rule = createValidAlertConfig().rules![0]
      const conditionResults = [
        {
          condition_id: 'condition_1',
          met: true,
          actual_value: 1200,
          threshold_value: 1000,
          deviation: 200,
          evaluation_method: 'greater_than'
        }
      ]
      const contextWithChanges = {
        sensor_data: [],
        system_status: [],
        recent_changes: [{ timestamp: '2025-09-23T10:00:00Z', description: 'HVAC update' }],
        related_alerts: []
      }

      const actions = await (alertEngine as TestableAlertRuleEngine).generateSuggestedActions(
        rule,
        conditionResults,
        contextWithChanges
      )

      expect(actions).toContain('Review recent system changes that may have caused this alert')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid sensor data gracefully', async () => {
      const contextWithInvalidData = {
        ...mockEvaluationContext,
        sensor_readings: [
          {
            sensor_id: 'INVALID_SENSOR',
            timestamp: 'invalid-timestamp',
            value: NaN,
            unit: '',
            quality: 'error'
          }
        ]
      }

      const config = createEnergyConsumptionAlertConfig()

      // Should not throw an error
      const results = await alertEngine.evaluateAlerts([config], contextWithInvalidData)

      expect(results).toHaveLength(0) // No valid data, no alerts
    })

    it('should continue processing other rules when one fails', async () => {
      const configs = [
        createEnergyConsumptionAlertConfig(),
        createInvalidAlertConfig() // This will cause an error
      ]

      // Mock console.error to verify error logging
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const results = await alertEngine.evaluateAlerts(configs, mockEvaluationContext)

      expect(results).toHaveLength(1) // Should still process the valid config
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Performance and Volume Handling', () => {
    it('should handle large numbers of sensor readings efficiently', async () => {
      // Create context with 1000 sensor readings
      const largeSensorData = Array.from({ length: 1000 }, (_, i) => ({
        sensor_id: `SENSOR_${i.toString().padStart(3, '0')}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        value: Math.random() * 1000,
        unit: 'kWh',
        quality: 'good' as const
      }))

      const largeContext = {
        ...mockEvaluationContext,
        sensor_readings: largeSensorData
      }

      const config = createEnergyConsumptionAlertConfig()

      const startTime = Date.now()
      const results = await alertEngine.evaluateAlerts([config], largeContext)
      const duration = Date.now() - startTime

      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000)
      expect(results).toBeDefined()
    })

    it('should estimate alert volume accurately', () => {
      const config = createValidAlertConfig()
      config.rules![0].evaluation_window = 5 // 5 minutes
      config.rules![0].cooldown_period = 10 // 10 minutes

      const volume = (alertEngine as TestableAlertRuleEngine).estimateAlertVolume(config)

      expect(volume).toBeGreaterThan(0)
      expect(volume).toBeLessThan(1000) // Reasonable upper bound
    })
  })
})

// Helper functions for creating test data

function createValidAlertConfig(): Partial<AlertConfiguration> {
  return {
    name: 'Test Alert Configuration',
    description: 'Test description',
    user_id: 'test-user',
    organization_id: 'test-org',
    rules: [
      {
        id: 'rule_1',
        name: 'Test Rule',
        description: 'Test rule description',
        enabled: true,
        priority: 'medium' as AlertPriority,
        conditions: [
          {
            id: 'condition_1',
            metric: {
              type: 'energy_consumption' as MetricType,
              display_name: 'Energy Consumption',
              units: 'kWh'
            },
            operator: 'greater_than' as ComparisonOperator,
            threshold: { value: 100 },
            time_aggregation: {
              function: 'average' as AggregationFunction,
              period: 5,
              minimum_data_points: 3
            },
            filters: []
          }
        ],
        logical_operator: 'AND',
        evaluation_window: 5,
        cooldown_period: 15,
        suppress_duplicates: true,
        tags: []
      }
    ]
  }
}

function createEnergyConsumptionAlertConfig(): AlertConfiguration {
  return {
    id: 'config_energy_test',
    name: 'High Energy Consumption Alert',
    description: 'Alert when energy consumption exceeds 1000 kWh',
    user_id: 'test-user',
    organization_id: 'test-org',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'test-user',
    rules: [
      {
        id: 'rule_energy',
        name: 'Energy Threshold Rule',
        description: 'Trigger when consumption exceeds 1000 kWh',
        enabled: true,
        priority: 'high',
        conditions: [
          {
            id: 'condition_energy',
            metric: {
              type: 'energy_consumption',
              display_name: 'Energy Consumption',
              units: 'kWh'
            },
            operator: 'greater_than',
            threshold: { value: 1000 },
            time_aggregation: {
              function: 'sum',
              period: 5,
              minimum_data_points: 1
            },
            filters: []
          }
        ],
        logical_operator: 'AND',
        evaluation_window: 5,
        cooldown_period: 15,
        suppress_duplicates: true,
        tags: ['energy']
      }
    ],
    notification_settings: {
      channels: [],
      recipients: [],
      frequency_limits: {
        max_alerts_per_hour: 10,
        max_alerts_per_day: 50,
        cooldown_between_similar: 15,
        escalation_threshold: 3
      },
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '06:00',
        timezone: 'UTC',
        exceptions: [],
        weekend_override: false
      },
      escalation_delays: [15, 30, 60]
    },
    metadata: {
      category: 'energy_efficiency',
      severity_auto_adjust: false,
      business_impact: {
        level: 'medium',
        operational_severity: 'efficiency_loss',
        compliance_risk: false,
        safety_risk: false
      },
      affected_systems: ['hvac'],
      affected_locations: ['Building A'],
      documentation_links: [],
      tags: ['energy'],
      custom_fields: {}
    }
  }
}

function createMultiConditionAlertConfig(operator: 'AND' | 'OR'): AlertConfiguration {
  const config = createEnergyConsumptionAlertConfig()

  // Add second condition for temperature
  config.rules[0].conditions.push({
    id: 'condition_temp',
    metric: {
      type: 'temperature',
      display_name: 'Temperature',
      units: '°C'
    },
    operator: 'greater_than',
    threshold: { value: 26 },
    time_aggregation: {
      function: 'average',
      period: 5,
      minimum_data_points: 1
    },
    filters: []
  })

  config.rules[0].logical_operator = operator

  return config
}

function createMockCondition(metricType: MetricType = 'energy_consumption'): AlertCondition {
  return {
    id: 'mock_condition',
    metric: {
      type: metricType,
      display_name: 'Mock Metric',
      units: 'kWh'
    },
    operator: 'greater_than',
    threshold: { value: 100 },
    time_aggregation: {
      function: 'average',
      period: 5,
      minimum_data_points: 1
    },
    filters: []
  }
}

function createInvalidAlertConfig(): AlertConfiguration {
  const config = createEnergyConsumptionAlertConfig()
  // Create invalid condition that will cause an error
  config.rules[0].conditions[0].threshold = null as unknown as TestThresholdValue
  return config
}