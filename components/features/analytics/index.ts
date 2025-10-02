/**
 * Analytics Components Export Index
 * Story 3.2: Interactive Time-Series Visualizations
 */

export { default as TimeSeriesChart } from './TimeSeriesChart'
export type { TimeSeriesChartProps } from './TimeSeriesChart'

export {
  decimateTimeSeriesData,
  lttbDecimation,
  minMaxDecimation,
  simpleDecimation,
  adaptiveDecimation,
  benchmarkDecimation
} from './dataDecimation'

export type {
  DecimationOptions,
  DecimationResult
} from './dataDecimation'