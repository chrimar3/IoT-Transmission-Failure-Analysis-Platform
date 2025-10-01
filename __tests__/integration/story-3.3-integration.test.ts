/**
 * @jest-environment node
 *
 * Story 3.3 Integration Test
 * Tests the complete Failure Pattern Detection Engine system
 */

import { StatisticalAnomalyDetector } from '@/lib/algorithms/StatisticalAnomalyDetector';
import { RecommendationEngine } from '@/src/lib/algorithms/RecommendationEngine';
import { PatternCorrelationAnalyzer } from '@/src/lib/algorithms/PatternCorrelationAnalyzer';
import { NotificationService } from '@/src/lib/services/NotificationService';
import type { DetectedPattern, TimeSeriesData } from '@/types/patterns';

describe('Story 3.3: Failure Pattern Detection Engine - Integration Tests', () => {
  let anomalyDetector: StatisticalAnomalyDetector;
  let recommendationEngine: RecommendationEngine;
  let correlationAnalyzer: PatternCorrelationAnalyzer;
  let notificationService: NotificationService;

  beforeEach(() => {
    // Initialize all components
    anomalyDetector = new StatisticalAnomalyDetector({
      algorithm: 'statistical_zscore',
      sensitivity_threshold: 2.5,
      confidence_threshold: 0.7,
    });

    recommendationEngine = new RecommendationEngine();
    correlationAnalyzer = new PatternCorrelationAnalyzer();

    notificationService = new NotificationService({
      email: { enabled: true, from_address: 'test@cu-bems.com' },
      sms: { enabled: true, service_provider: 'twilio' },
      push: { enabled: false },
      webhook: { enabled: false, endpoints: [] },
      slack: { enabled: false, channels: [] },
    });
  });

  describe('End-to-End Pattern Detection Flow', () => {
    it('should complete the full pattern detection workflow', async () => {
      // Step 1: Generate test time-series data
      const timeSeriesData: TimeSeriesData = generateTestTimeSeriesData();

      // Step 2: Detect anomalies
      const dataPoints = timeSeriesData.data_points.map((dp) => ({
        sensor_id: timeSeriesData.sensor_id,
        timestamp: dp.timestamp,
        value: dp.value,
        quality: dp.metadata.quality,
      }));

      const detectionResult = await anomalyDetector.detectAnomalies(
        dataPoints,
        {
          start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date().toISOString(),
          granularity: '1h',
        }
      );

      expect(detectionResult.success).toBe(true);
      expect(detectionResult.patterns).toBeDefined();
      expect(detectionResult.summary).toBeDefined();
      expect(detectionResult.analysis_metadata).toBeDefined();

      // Step 3: Generate recommendations
      const patternsWithRecommendations =
        await recommendationEngine.generateRecommendations(
          detectionResult.patterns,
          {
            building_profile: {
              building_type: 'office',
              total_floors: 7,
              total_sensors: 134,
              operational_hours: { start: '08:00', end: '18:00' },
              maintenance_budget: 50000,
            },
            current_conditions: {
              outdoor_temperature: 28,
              humidity: 75,
              season: 'summer',
              occupancy_level: 'high',
            },
            maintenance_history: [],
            equipment_age: 5,
            criticality_level: 'high',
            operational_criticality: 'high',
          }
        );

      expect(patternsWithRecommendations).toHaveLength(
        detectionResult.patterns.length
      );
      expect(
        patternsWithRecommendations.every((p) => p.recommendations.length > 0)
      ).toBe(true);

      // Step 4: Analyze correlations
      const correlationResult = await correlationAnalyzer.analyzeCorrelations(
        patternsWithRecommendations
      );

      expect(correlationResult.success).toBe(true);
      expect(correlationResult.correlation_matrix).toBeDefined();
      expect(correlationResult.temporal_correlations).toBeDefined();

      // Step 5: Send notifications for critical patterns
      const criticalPatterns = patternsWithRecommendations.filter(
        (p) => p.severity === 'critical'
      );

      for (const pattern of criticalPatterns) {
        await notificationService.sendPatternNotification(pattern);
      }

      // Verify the complete workflow
      expect(detectionResult.patterns.length).toBeGreaterThan(0);
      expect(correlationResult.processing_time_ms).toBeGreaterThan(0);

      console.log('✅ Complete workflow test passed:', {
        patterns_detected: detectionResult.patterns.length,
        critical_patterns: criticalPatterns.length,
        total_recommendations: patternsWithRecommendations.reduce(
          (sum, p) => sum + p.recommendations.length,
          0
        ),
        correlation_analysis_time: correlationResult.processing_time_ms,
      });
    });

    it('should handle high-volume pattern detection', async () => {
      // Generate large dataset
      const largeTimeSeriesData: TimeSeriesData = generateLargeTestDataset();

      const startTime = performance.now();

      // Process large dataset
      const result = await anomalyDetector.detectAnomalies(
        largeTimeSeriesData,
        {
          start_time: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          end_time: new Date().toISOString(),
          granularity: '15m',
        }
      );

      const processingTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.analysis_metadata.data_points_processed).toBeGreaterThan(
        1000
      );

      console.log('📊 High-volume test results:', {
        data_points: result.analysis_metadata.data_points_processed,
        processing_time_ms: processingTime,
        patterns_found: result.patterns.length,
        memory_usage_mb:
          result.analysis_metadata.performance_metrics.memory_peak_mb,
      });
    });

    it('should maintain accuracy across different equipment types', async () => {
      const equipmentTypes = ['HVAC', 'Lighting', 'Power', 'Water', 'Security'];
      const accuracyResults: Record<string, number> = {};

      for (const equipmentType of equipmentTypes) {
        const testData = generateEquipmentSpecificData(equipmentType);

        const result = await anomalyDetector.detectAnomalies(testData, {
          start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date().toISOString(),
          granularity: '1h',
        });

        // Calculate accuracy based on expected patterns vs detected patterns
        const expectedPatterns = 3; // We inject 3 anomalies per equipment type
        const detectedPatterns = result.patterns.filter(
          (p) => p.confidence_score >= 70
        ).length;
        const accuracy = Math.min(detectedPatterns / expectedPatterns, 1);

        accuracyResults[equipmentType] = accuracy;
        expect(accuracy).toBeGreaterThan(0.6); // At least 60% accuracy
      }

      console.log('🎯 Accuracy by equipment type:', accuracyResults);

      // Overall accuracy should be good
      const overallAccuracy =
        Object.values(accuracyResults).reduce((sum, acc) => sum + acc, 0) /
        equipmentTypes.length;
      expect(overallAccuracy).toBeGreaterThan(0.7); // 70% overall accuracy
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should gracefully handle malformed data', async () => {
      const malformedData: TimeSeriesData = {
        sensor_id: 'BAD_SENSOR',
        data_points: [
          { timestamp: 'invalid-date', value: NaN, metadata: {} },
          {
            timestamp: '2025-01-15T10:00:00Z',
            value: undefined as any,
            metadata: {},
          },
        ],
        equipment_type: 'Unknown',
        floor_number: -1,
      };

      const result = await anomalyDetector.detectAnomalies(malformedData, {
        start_time: '2025-01-15T09:00:00Z',
        end_time: '2025-01-15T11:00:00Z',
        granularity: '1h',
      });

      // Should handle errors gracefully without throwing
      expect(result.success).toBeDefined();
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle system overload scenarios', async () => {
      // Simulate multiple concurrent pattern detection requests
      const promises = Array.from({ length: 10 }, () => {
        const testData = generateTestTimeSeriesData();
        return anomalyDetector.detectAnomalies(testData, {
          start_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          end_time: new Date().toISOString(),
          granularity: '5m',
        });
      });

      const results = await Promise.allSettled(promises);
      const successfulResults = results.filter(
        (r) => r.status === 'fulfilled'
      ) as PromiseFulfilledResult<any>[];

      // At least 80% should succeed under load
      expect(successfulResults.length / results.length).toBeGreaterThan(0.8);
    });
  });
});

// Helper functions for generating test data

function generateTestTimeSeriesData(): TimeSeriesData {
  const dataPoints = [];
  const now = Date.now();

  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(now - i * 15 * 60 * 1000).toISOString(); // 15-minute intervals
    let value = 850 + Math.sin(i / 10) * 50 + Math.random() * 20; // Base pattern with noise

    // Inject anomalies at specific points
    if (i === 20 || i === 45 || i === 80) {
      value += 200; // Anomaly spike
    }

    dataPoints.push({
      timestamp,
      value,
      metadata: { quality: 'good', source: 'sensor' },
    });
  }

  return {
    sensor_id: 'TEST_SENSOR_001',
    data_points: dataPoints.reverse(), // Chronological order
    equipment_type: 'HVAC',
    floor_number: 3,
  };
}

function generateLargeTestDataset(): TimeSeriesData {
  const dataPoints = [];
  const now = Date.now();

  // Generate 2000 data points (about 3 weeks of 15-minute intervals)
  for (let i = 0; i < 2000; i++) {
    const timestamp = new Date(now - i * 15 * 60 * 1000).toISOString();
    const value = 800 + Math.sin(i / 20) * 100 + Math.random() * 50;

    dataPoints.push({
      timestamp,
      value,
      metadata: { quality: 'good', source: 'sensor' },
    });
  }

  return {
    sensor_id: 'LOAD_TEST_SENSOR',
    data_points: dataPoints.reverse(),
    equipment_type: 'Power',
    floor_number: 5,
  };
}

function generateEquipmentSpecificData(equipmentType: string): TimeSeriesData {
  const dataPoints = [];
  const now = Date.now();

  // Equipment-specific patterns
  const patterns = {
    HVAC: { base: 900, amplitude: 80, frequency: 12 },
    Lighting: { base: 200, amplitude: 30, frequency: 24 },
    Power: { base: 1500, amplitude: 200, frequency: 8 },
    Water: { base: 500, amplitude: 50, frequency: 6 },
    Security: { base: 100, amplitude: 20, frequency: 48 },
  };

  const pattern =
    patterns[equipmentType as keyof typeof patterns] || patterns.HVAC;

  for (let i = 0; i < 144; i++) {
    // 24 hours of 10-minute intervals
    const timestamp = new Date(now - i * 10 * 60 * 1000).toISOString();
    let value =
      pattern.base +
      Math.sin(i / pattern.frequency) * pattern.amplitude +
      Math.random() * 20;

    // Inject 3 anomalies per equipment type
    if (i === 30 || i === 72 || i === 120) {
      value *= 1.5; // 50% increase for anomaly
    }

    dataPoints.push({
      timestamp,
      value,
      metadata: { quality: 'good', source: 'sensor', equipment: equipmentType },
    });
  }

  return {
    sensor_id: `${equipmentType}_SENSOR_001`,
    data_points: dataPoints.reverse(),
    equipment_type: equipmentType,
    floor_number: Math.floor(Math.random() * 7) + 1,
  };
}
