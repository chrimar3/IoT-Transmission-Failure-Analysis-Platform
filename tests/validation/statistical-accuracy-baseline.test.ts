/**
 * CRITICAL: Statistical Accuracy Baseline Validation
 *
 * This test suite establishes the >80% pattern detection accuracy baseline
 * required for business credibility claims in the Bangkok dataset analysis.
 */

import { describe, test, expect, beforeAll } from '@jest/globals'
import { PatternDetectionEngine } from '../../src/lib/algorithms/pattern-detection'
import { loadBangkokValidationDataset } from '../../src/lib/data/bangkok-validation'
import { calculateConfidenceInterval, validateStatisticalSignificance } from '../../src/lib/algorithms/statistical-validation'

interface KnownBangkokAnomaly {
  timestamp: string
  equipment_id: string
  anomaly_type: 'HVAC_failure' | 'power_spike' | 'sensor_malfunction' | 'efficiency_drop'
  severity: number
  verified_by_experts: boolean
  confidence_level: number
}

interface AccuracyMetrics {
  overall_accuracy: number
  precision: number
  recall: number
  f1_score: number
  confidence_interval: [number, number]
  statistical_significance: boolean
}

describe('Statistical Accuracy Baseline Validation', () => {
  let patternEngine: PatternDetectionEngine
  let knownAnomalies: KnownBangkokAnomaly[]
  let validationDataset: any[]

  beforeAll(async () => {
    // Load Bangkok University verified anomalies for accuracy validation
    knownAnomalies = await loadBangkokValidationDataset()
    patternEngine = new PatternDetectionEngine({
      confidence_threshold: 0.8,
      statistical_validation: true
    })

    // Ensure we have sufficient data for statistical validation
    expect(knownAnomalies.length).toBeGreaterThan(100) // Minimum for statistical power
  })

  test('BUSINESS CRITICAL: >80% pattern detection accuracy baseline', async () => {
    // Test against expert-verified Bangkok anomalies
    const detectionResults = await patternEngine.detectPatterns(knownAnomalies)
    const accuracy = calculateAccuracy(detectionResults, knownAnomalies)

    // CRITICAL BUSINESS REQUIREMENT
    expect(accuracy.overall_accuracy).toBeGreaterThan(0.80)
    expect(accuracy.confidence_interval[0]).toBeGreaterThan(0.75) // Lower bound must exceed 75%
    expect(accuracy.statistical_significance).toBe(true) // p-value < 0.05

    console.log(`✅ Pattern Detection Accuracy: ${(accuracy.overall_accuracy * 100).toFixed(1)}%`)
    console.log(`✅ 95% CI: [${(accuracy.confidence_interval[0] * 100).toFixed(1)}%, ${(accuracy.confidence_interval[1] * 100).toFixed(1)}%]`)
  })

  test('HVAC failure prediction accuracy (highest business impact)', async () => {
    const hvacAnomalies = knownAnomalies.filter(a => a.anomaly_type === 'HVAC_failure')
    const hvacResults = await patternEngine.detectPatterns(hvacAnomalies)
    const hvacAccuracy = calculateAccuracy(hvacResults, hvacAnomalies)

    // HVAC failures have highest cost impact - require higher accuracy
    expect(hvacAccuracy.overall_accuracy).toBeGreaterThan(0.85)
    expect(hvacAccuracy.precision).toBeGreaterThan(0.80) // Minimize false positives
    expect(hvacAccuracy.recall).toBeGreaterThan(0.75) // Catch most real failures
  })

  test('Power spike detection accuracy (safety critical)', async () => {
    const powerAnomalies = knownAnomalies.filter(a => a.anomaly_type === 'power_spike')
    const powerResults = await patternEngine.detectPatterns(powerAnomalies)
    const powerAccuracy = calculateAccuracy(powerResults, powerAnomalies)

    // Power spikes are safety-critical
    expect(powerAccuracy.recall).toBeGreaterThan(0.90) // Must catch 90%+ of real power spikes
  })

  test('Statistical significance of accuracy claims', async () => {
    const allResults = await patternEngine.detectPatterns(knownAnomalies)
    const accuracy = calculateAccuracy(allResults, knownAnomalies)

    // Validate statistical significance using Chi-square test
    const significance = await validateStatisticalSignificance(accuracy)

    expect(significance.p_value).toBeLessThan(0.05) // Statistically significant
    expect(significance.effect_size).toBeGreaterThan(0.3) // Practically significant
    expect(significance.sample_size_adequate).toBe(true) // Sufficient power
  })

  test('Cross-validation stability (robustness check)', async () => {
    // 5-fold cross-validation to ensure accuracy is stable
    const folds = splitIntoFolds(knownAnomalies, 5)
    const accuracies: number[] = []

    for (const fold of folds) {
      const trainData = folds.filter(f => f !== fold).flat()
      const testData = fold

      await patternEngine.train(trainData)
      const results = await patternEngine.detectPatterns(testData)
      const accuracy = calculateAccuracy(results, testData)

      accuracies.push(accuracy.overall_accuracy)
    }

    const meanAccuracy = accuracies.reduce((a, b) => a + b) / accuracies.length
    const stdAccuracy = Math.sqrt(accuracies.reduce((sq, acc) => sq + Math.pow(acc - meanAccuracy, 2), 0) / accuracies.length)

    // Accuracy should be stable across folds
    expect(meanAccuracy).toBeGreaterThan(0.80)
    expect(stdAccuracy).toBeLessThan(0.05) // Low variance between folds
  })
})

function calculateAccuracy(predictions: any[], groundTruth: KnownBangkokAnomaly[]): AccuracyMetrics {
  // Implementation details for accuracy calculation
  const truePositives = predictions.filter(p =>
    groundTruth.some(gt => isMatch(p, gt))
  ).length

  const falsePositives = predictions.filter(p =>
    !groundTruth.some(gt => isMatch(p, gt))
  ).length

  const falseNegatives = groundTruth.filter(gt =>
    !predictions.some(p => isMatch(p, gt))
  ).length

  const precision = truePositives / (truePositives + falsePositives)
  const recall = truePositives / (truePositives + falseNegatives)
  const f1Score = 2 * (precision * recall) / (precision + recall)
  const overallAccuracy = truePositives / groundTruth.length

  // Calculate 95% confidence interval using Wilson score interval
  const confidenceInterval = calculateConfidenceInterval(overallAccuracy, groundTruth.length, 0.95)

  return {
    overall_accuracy: overallAccuracy,
    precision,
    recall,
    f1_score: f1Score,
    confidence_interval: confidenceInterval,
    statistical_significance: confidenceInterval[0] > 0.5 // Significantly better than random
  }
}

function isMatch(prediction: any, groundTruth: KnownBangkokAnomaly): boolean {
  // Define matching criteria (time window, equipment, anomaly type)
  const timeMatch = Math.abs(new Date(prediction.timestamp).getTime() - new Date(groundTruth.timestamp).getTime()) < 3600000 // 1 hour window
  const equipmentMatch = prediction.equipment_id === groundTruth.equipment_id
  const typeMatch = prediction.anomaly_type === groundTruth.anomaly_type

  return timeMatch && equipmentMatch && typeMatch
}

function splitIntoFolds<T>(data: T[], k: number): T[][] {
  const folds: T[][] = []
  const foldSize = Math.floor(data.length / k)

  for (let i = 0; i < k; i++) {
    const start = i * foldSize
    const end = i === k - 1 ? data.length : start + foldSize
    folds.push(data.slice(start, end))
  }

  return folds
}