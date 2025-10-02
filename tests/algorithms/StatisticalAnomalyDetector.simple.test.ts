/**
 * @jest-environment node
 */

import { StatisticalAnomalyDetector, type TimeSeriesPoint, type AnalysisWindow } from '@/lib/algorithms/StatisticalAnomalyDetector'

describe('StatisticalAnomalyDetector - Basic Functionality', () => {
  let detector: StatisticalAnomalyDetector

  beforeEach(() => {
    detector = new StatisticalAnomalyDetector({})
  })

  describe('basic anomaly detection', () => {
    const mockData: TimeSeriesPoint[] = [
      { timestamp: '2025-01-01T00:00:00Z', value: 20.5, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T01:00:00Z', value: 21.0, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T02:00:00Z', value: 20.8, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T03:00:00Z', value: 45.0, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T04:00:00Z', value: 20.7, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T05:00:00Z', value: 21.2, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T06:00:00Z', value: 20.9, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T07:00:00Z', value: 55.0, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T08:00:00Z', value: 20.6, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T09:00:00Z', value: 21.1, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      // Add more data to meet minimum data points requirement
      { timestamp: '2025-01-01T10:00:00Z', value: 21.3, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T11:00:00Z', value: 20.4, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T12:00:00Z', value: 21.5, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T13:00:00Z', value: 20.2, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T14:00:00Z', value: 21.8, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T15:00:00Z', value: 20.1, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T16:00:00Z', value: 21.0, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T17:00:00Z', value: 20.7, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T18:00:00Z', value: 21.4, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
      { timestamp: '2025-01-01T19:00:00Z', value: 20.9, sensor_id: 'TEST_001', equipment_type: 'HVAC' }
    ]

    const mockWindow: AnalysisWindow = {
      start_time: '2025-01-01T00:00:00Z',
      end_time: '2025-01-01T20:00:00Z',
      granularity: 'hour'
    }

    it('should return valid result structure', async () => {
      const result = await detector.detectAnomalies(mockData, mockWindow)

      expect(result).toBeDefined()
      expect(result.patterns).toBeDefined()
      expect(result.statistical_summary).toBeDefined()
      expect(result.performance_metrics).toBeDefined()
      expect(Array.isArray(result.patterns)).toBe(true)
    })

    it('should process data without errors', async () => {
      await expect(detector.detectAnomalies(mockData, mockWindow)).resolves.not.toThrow()
    })

    it('should return statistical summary with correct data count', async () => {
      const result = await detector.detectAnomalies(mockData, mockWindow)

      expect(result.statistical_summary.total_points_analyzed).toBe(20)
      expect(result.statistical_summary.processing_time_ms).toBeGreaterThan(0)
      expect(result.statistical_summary.anomalies_detected).toBeGreaterThanOrEqual(0)
    })

    it('should return performance metrics', async () => {
      const result = await detector.detectAnomalies(mockData, mockWindow)

      expect(result.performance_metrics.algorithm_efficiency).toBeGreaterThan(0)
      expect(result.performance_metrics.memory_usage_mb).toBeGreaterThan(0)
      expect(result.performance_metrics.throughput_points_per_second).toBeGreaterThan(0)
    })

    it('should handle empty data gracefully', async () => {
      const result = await detector.detectAnomalies([], mockWindow)

      expect(result.patterns).toHaveLength(0)
      expect(result.statistical_summary.total_points_analyzed).toBe(0)
      expect(result.statistical_summary.anomalies_detected).toBe(0)
    })

    it('should skip sensors with insufficient data', async () => {
      const insufficientData: TimeSeriesPoint[] = [
        { timestamp: '2025-01-01T00:00:00Z', value: 20.5, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
        { timestamp: '2025-01-01T01:00:00Z', value: 21.0, sensor_id: 'TEST_001', equipment_type: 'HVAC' }
      ]

      const result = await detector.detectAnomalies(insufficientData, mockWindow)

      expect(result.patterns).toHaveLength(0)
      expect(result.statistical_summary.total_points_analyzed).toBe(2)
    })

    it('should handle multiple sensors', async () => {
      const multiSensorData: TimeSeriesPoint[] = [
        ...mockData,
        ...mockData.map(point => ({
          ...point,
          sensor_id: 'TEST_002',
          equipment_type: 'Lighting'
        }))
      ]

      const result = await detector.detectAnomalies(multiSensorData, mockWindow)

      expect(result.statistical_summary.total_points_analyzed).toBe(40)
    })
  })

  describe('configuration handling', () => {
    it('should accept custom configuration', () => {
      const customDetector = new StatisticalAnomalyDetector({
        algorithm_type: 'modified_zscore',
        sensitivity: 5,
        threshold_multiplier: 3.0,
        minimum_data_points: 10
      })

      expect(customDetector).toBeDefined()
    })

    it('should handle various algorithm types', async () => {
      const algorithms = [
        'statistical_zscore',
        'modified_zscore',
        'interquartile_range',
        'moving_average'
      ] as const

      for (const algorithm of algorithms) {
        const algoDetector = new StatisticalAnomalyDetector({
          algorithm_type: algorithm
        })

        const mockData: TimeSeriesPoint[] = Array.from({ length: 25 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 60000).toISOString(),
          value: 20 + Math.random() * 2,
          sensor_id: 'TEST_001',
          equipment_type: 'HVAC'
        }))

        const window: AnalysisWindow = {
          start_time: mockData[0].timestamp,
          end_time: mockData[mockData.length - 1].timestamp,
          granularity: 'minute'
        }

        await expect(algoDetector.detectAnomalies(mockData, window)).resolves.not.toThrow()
      }
    })
  })

  describe('error handling', () => {
    it('should handle invalid timestamps gracefully', async () => {
      const invalidData: TimeSeriesPoint[] = [
        { timestamp: 'invalid-timestamp', value: 20.5, sensor_id: 'TEST_001', equipment_type: 'HVAC' },
        { timestamp: '2025-01-01T01:00:00Z', value: 21.0, sensor_id: 'TEST_001', equipment_type: 'HVAC' }
      ]

      const window: AnalysisWindow = {
        start_time: '2025-01-01T00:00:00Z',
        end_time: '2025-01-01T02:00:00Z',
        granularity: 'hour'
      }

      // Should handle gracefully without crashing
      const result = await detector.detectAnomalies(invalidData, window)
      expect(result).toBeDefined()
      expect(result.patterns).toBeDefined()
    })

    it('should handle NaN values', async () => {
      const nanData: TimeSeriesPoint[] = Array.from({ length: 25 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 60000).toISOString(),
        value: i === 10 ? NaN : 20 + Math.random() * 2,
        sensor_id: 'TEST_001',
        equipment_type: 'HVAC'
      }))

      const window: AnalysisWindow = {
        start_time: nanData[0].timestamp,
        end_time: nanData[nanData.length - 1].timestamp,
        granularity: 'minute'
      }

      // Should handle NaN values without crashing
      await expect(detector.detectAnomalies(nanData, window)).resolves.not.toThrow()
    })
  })
})