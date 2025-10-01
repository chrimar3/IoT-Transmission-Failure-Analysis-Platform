/**
 * Data Decimation Utilities for Time-Series Performance Optimization
 * Story 3.2: Interactive Time-Series Visualizations
 *
 * Implements various algorithms for reducing large datasets while preserving important features
 */

import { TimeSeriesDataPoint } from '../../../../types/analytics'
import { parseISO } from 'date-fns'

export interface DecimationOptions {
  maxPoints: number
  algorithm: 'lttb' | 'minmax' | 'simple' | 'adaptive'
  preserveAnomalies?: boolean
  preserveEdges?: boolean
}

export interface DecimationResult {
  data: TimeSeriesDataPoint[]
  originalLength: number
  decimatedLength: number
  compressionRatio: number
  algorithm: string
}

/**
 * Largest Triangle Three Buckets (LTTB) Algorithm
 * Best for maintaining the visual shape of the data
 */
export function lttbDecimation(
  data: TimeSeriesDataPoint[],
  maxPoints: number,
  preserveAnomalies = true
): TimeSeriesDataPoint[] {
  if (data.length <= maxPoints || maxPoints < 3) {
    return data
  }

  const bucketSize = (data.length - 2) / (maxPoints - 2)
  const decimated: TimeSeriesDataPoint[] = []

  // Always include first point
  decimated.push(data[0])

  let bucketStart = 1
  let a = 0 // Previous selected point

  for (let i = 1; i < maxPoints - 1; i++) {
    const bucketEnd = Math.min(Math.floor(bucketStart + bucketSize), data.length - 1)

    // Calculate average point for next bucket (for triangle calculation)
    let avgTimestamp = 0
    let avgValue = 0
    const nextBucketStart = Math.min(Math.floor(bucketEnd + bucketSize), data.length - 1)
    const nextBucketEnd = Math.min(nextBucketStart + Math.floor(bucketSize), data.length)

    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      if (j < data.length) {
        avgTimestamp += parseISO(data[j].timestamp).getTime()
        avgValue += data[j].value
      }
    }
    avgTimestamp /= (nextBucketEnd - nextBucketStart)
    avgValue /= (nextBucketEnd - nextBucketStart)

    // Find point in current bucket that forms largest triangle with previous point and average next point
    let maxArea = -1
    let selectedIndex = bucketStart

    for (let j = bucketStart; j < bucketEnd; j++) {
      if (j >= data.length) break

      const pointTime = parseISO(data[j].timestamp).getTime()
      const prevTime = parseISO(data[a].timestamp).getTime()

      // Calculate triangle area
      const area = Math.abs(
        (prevTime - avgTimestamp) * (data[j].value - data[a].value) -
        (prevTime - pointTime) * (avgValue - data[a].value)
      )

      // Prioritize anomalies (error/warning states)
      const isAnomaly = preserveAnomalies && data[j].status !== 'normal'
      const adjustedArea = isAnomaly ? area * 2 : area

      if (adjustedArea > maxArea) {
        maxArea = adjustedArea
        selectedIndex = j
      }
    }

    decimated.push(data[selectedIndex])
    a = selectedIndex
    bucketStart = bucketEnd
  }

  // Always include last point
  decimated.push(data[data.length - 1])

  return decimated
}

/**
 * Min-Max Decimation Algorithm
 * Good for preserving extreme values and overall range
 */
export function minMaxDecimation(
  data: TimeSeriesDataPoint[],
  maxPoints: number
): TimeSeriesDataPoint[] {
  if (data.length <= maxPoints) {
    return data
  }

  const bucketSize = Math.ceil(data.length / (maxPoints / 2)) // Each bucket contributes 2 points (min/max)
  const decimated: TimeSeriesDataPoint[] = []

  for (let i = 0; i < data.length; i += bucketSize) {
    const bucketEnd = Math.min(i + bucketSize, data.length)
    const bucket = data.slice(i, bucketEnd)

    if (bucket.length === 0) continue

    // Find min and max in bucket
    let minPoint = bucket[0]
    let maxPoint = bucket[0]

    bucket.forEach(point => {
      if (point.value < minPoint.value) minPoint = point
      if (point.value > maxPoint.value) maxPoint = point
    })

    // Add min first, then max (chronological order)
    const sortedMinMax = [minPoint, maxPoint].sort((a, b) =>
      parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime()
    )

    sortedMinMax.forEach(point => {
      // Avoid duplicates
      if (!decimated.some(p => p.timestamp === point.timestamp)) {
        decimated.push(point)
      }
    })
  }

  // Sort by timestamp and limit to maxPoints
  decimated.sort((a, b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime())
  return decimated.slice(0, maxPoints)
}

/**
 * Simple uniform sampling
 * Fast but may miss important features
 */
export function simpleDecimation(
  data: TimeSeriesDataPoint[],
  maxPoints: number
): TimeSeriesDataPoint[] {
  if (data.length <= maxPoints) {
    return data
  }

  const step = Math.ceil(data.length / maxPoints)
  const decimated: TimeSeriesDataPoint[] = []

  for (let i = 0; i < data.length; i += step) {
    decimated.push(data[i])
  }

  return decimated
}

/**
 * Adaptive decimation based on data characteristics
 * Adjusts algorithm based on data patterns
 */
export function adaptiveDecimation(
  data: TimeSeriesDataPoint[],
  maxPoints: number,
  _preserveAnomalies = true
): TimeSeriesDataPoint[] {
  if (data.length <= maxPoints) {
    return data
  }

  // Analyze data characteristics
  const variance = calculateVariance(data)
  const anomalyRatio = data.filter(p => p.status !== 'normal').length / data.length

  // Choose algorithm based on data characteristics
  if (anomalyRatio > 0.1) {
    // High anomaly ratio: preserve anomalies with LTTB
    return lttbDecimation(data, maxPoints, true)
  } else if (variance > 1000) {
    // High variance: use min-max to preserve extremes
    return minMaxDecimation(data, maxPoints)
  } else {
    // Low variance: simple decimation is sufficient
    return simpleDecimation(data, maxPoints)
  }
}

/**
 * Calculate variance of data values
 */
function calculateVariance(data: TimeSeriesDataPoint[]): number {
  if (data.length < 2) return 0

  const mean = data.reduce((sum, point) => sum + point.value, 0) / data.length
  const squaredDiffs = data.map(point => Math.pow(point.value - mean, 2))
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / (data.length - 1)
}

/**
 * Main decimation function that applies the chosen algorithm
 */
export function decimateTimeSeriesData(
  data: TimeSeriesDataPoint[],
  options: DecimationOptions
): DecimationResult {
  let decimatedData: TimeSeriesDataPoint[]

  switch (options.algorithm) {
    case 'lttb':
      decimatedData = lttbDecimation(data, options.maxPoints, options.preserveAnomalies)
      break
    case 'minmax':
      decimatedData = minMaxDecimation(data, options.maxPoints)
      break
    case 'simple':
      decimatedData = simpleDecimation(data, options.maxPoints)
      break
    case 'adaptive':
      decimatedData = adaptiveDecimation(data, options.maxPoints, options.preserveAnomalies)
      break
    default:
      decimatedData = lttbDecimation(data, options.maxPoints, options.preserveAnomalies)
  }

  // Ensure first and last points are preserved if requested
  if (options.preserveEdges && data.length > 2) {
    const hasFirst = decimatedData.some(p => p.timestamp === data[0].timestamp)
    const hasLast = decimatedData.some(p => p.timestamp === data[data.length - 1].timestamp)

    if (!hasFirst) {
      decimatedData = [data[0], ...decimatedData.slice(1)]
    }
    if (!hasLast) {
      decimatedData = [...decimatedData.slice(0, -1), data[data.length - 1]]
    }
  }

  return {
    data: decimatedData,
    originalLength: data.length,
    decimatedLength: decimatedData.length,
    compressionRatio: (1 - decimatedData.length / data.length) * 100,
    algorithm: options.algorithm
  }
}

/**
 * Benchmark different decimation algorithms
 */
export function benchmarkDecimation(
  data: TimeSeriesDataPoint[],
  maxPoints: number
): Record<string, { time: number; points: number; algorithm: string }> {
  const algorithms: DecimationOptions['algorithm'][] = ['lttb', 'minmax', 'simple', 'adaptive']
  const results: Record<string, { time: number; points: number; algorithm: string }> = {}

  algorithms.forEach(algorithm => {
    const start = performance.now()
    const result = decimateTimeSeriesData(data, { maxPoints, algorithm })
    const end = performance.now()

    results[algorithm] = {
      time: end - start,
      points: result.decimatedLength,
      algorithm
    }
  })

  return results
}

const decimationModule = {
  decimateTimeSeriesData,
  lttbDecimation,
  minMaxDecimation,
  simpleDecimation,
  adaptiveDecimation,
  benchmarkDecimation
}

export default decimationModule