/**
 * Statistical Validation Framework
 *
 * Implements confidence intervals, p-value calculations, and statistical
 * significance testing for Bangkok dataset analysis.
 */

export interface StatisticalSignificance {
  p_value: number
  effect_size: number
  sample_size_adequate: boolean
  confidence_level: number
}

/**
 * Calculate Wilson Score Confidence Interval
 * More accurate than normal approximation for small samples
 */
export function calculateConfidenceInterval(
  proportion: number,
  sampleSize: number,
  confidenceLevel: number = 0.95
): [number, number] {
  const z = getZScore(confidenceLevel)
  const p = proportion
  const n = sampleSize

  // Wilson Score Interval
  const denominator = 1 + (z * z) / n
  const centre = (p + (z * z) / (2 * n)) / denominator
  const margin = (z / denominator) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))

  return [
    Math.max(0, centre - margin),
    Math.min(1, centre + margin)
  ]
}

/**
 * Validate statistical significance of accuracy claims
 */
export async function validateStatisticalSignificance(
  accuracyMetrics: {
    overall_accuracy: number
    precision: number
    recall: number
  }
): Promise<StatisticalSignificance> {
  const { overall_accuracy } = accuracyMetrics

  // Chi-square test for accuracy significantly better than random (50%)
  const observedCorrect = overall_accuracy * 100 // assuming 100 test cases
  const expectedCorrect = 50 // random baseline
  const chiSquare = Math.pow(observedCorrect - expectedCorrect, 2) / expectedCorrect

  // p-value calculation (simplified)
  const pValue = 1 - normalCdf(Math.sqrt(chiSquare))

  // Cohen's d effect size calculation
  const effectSize = (overall_accuracy - 0.5) / Math.sqrt(0.25) // assuming binomial variance

  // Sample size adequacy (power analysis)
  const sampleSizeAdequate = calculateRequiredSampleSize(overall_accuracy, 0.8, 0.05) <= 100

  return {
    p_value: pValue,
    effect_size: effectSize,
    sample_size_adequate: sampleSizeAdequate,
    confidence_level: 0.95
  }
}

/**
 * Calculate required sample size for given effect size and power
 */
function calculateRequiredSampleSize(
  expectedAccuracy: number,
  power: number = 0.8,
  alpha: number = 0.05
): number {
  const z_alpha = getZScore(1 - alpha / 2)
  const z_beta = getZScore(power)

  const p1 = expectedAccuracy
  const p0 = 0.5 // null hypothesis (random)

  const numerator = Math.pow(z_alpha * Math.sqrt(2 * 0.25) + z_beta * Math.sqrt(p1 * (1 - p1) + p0 * (1 - p0)), 2)
  const denominator = Math.pow(p1 - p0, 2)

  return Math.ceil(numerator / denominator)
}

/**
 * Get Z-score for given confidence level
 */
function getZScore(confidenceLevel: number): number {
  const zScores: { [key: number]: number } = {
    0.90: 1.645,
    0.95: 1.96,
    0.975: 2.24,
    0.99: 2.576,
    0.995: 2.807
  }

  return zScores[confidenceLevel] || 1.96
}

/**
 * Normal cumulative distribution function approximation
 */
function normalCdf(x: number): number {
  // Abramowitz and Stegun approximation
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)

  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return 0.5 * (1.0 + sign * y)
}

/**
 * Multiple testing correction using Bonferroni method
 */
export function bonferroniCorrection(pValues: number[], _alpha: number = 0.05): number[] {
  return pValues.map(p => p * pValues.length)
}

/**
 * False Discovery Rate control using Benjamini-Hochberg procedure
 */
export function benjaminiHochbergCorrection(pValues: number[], alpha: number = 0.05): boolean[] {
  const n = pValues.length
  const sortedIndices = pValues
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p - b.p)

  const rejected = new Array(n).fill(false)

  for (let k = n - 1; k >= 0; k--) {
    const threshold = (alpha * (k + 1)) / n
    if (sortedIndices[k].p <= threshold) {
      for (let j = 0; j <= k; j++) {
        rejected[sortedIndices[j].i] = true
      }
      break
    }
  }

  return rejected
}