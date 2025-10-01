/**
 * Interactive Time-Series Chart Component
 * Story 3.2: Interactive Time-Series Visualizations
 *
 * Features:
 * - Multi-sensor data visualization
 * - Zoom and pan functionality
 * - Interactive hover tooltips
 * - Performance optimized for large datasets
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush
} from 'recharts'
import {
  RotateCcw,
  Download,
  RefreshCw,
  AlertCircle,
  Activity,
  Calendar
} from 'lucide-react'
import type {
  MultiSeriesData,
  ChartConfiguration,
  ChartInteractionState,
  PerformanceMetrics
} from '@/types/analytics'
import ChartErrorBoundary from './ChartErrorBoundary'

interface TimeSeriesChartProps {
  sensorIds?: string[]
  startDate?: string
  endDate?: string
  height?: number
  onExport?: () => void
  onConfigChange?: (config: ChartConfiguration) => void
  showControls?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

interface ChartDataPoint {
  timestamp: string
  [key: string]: string | number
}

function TimeSeriesChartCore({
  sensorIds = ['SENSOR_001', 'SENSOR_002', 'SENSOR_003'],
  startDate,
  endDate,
  height = 400,
  onExport,
  onConfigChange,
  showControls = true,
  autoRefresh = false,
  refreshInterval = 300000 // 5 minutes
}: TimeSeriesChartProps) {
  const [data, setData] = useState<MultiSeriesData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)

  // Chart interaction state
  const [interactionState, setInteractionState] = useState<ChartInteractionState>({
    hover_point: null,
    selected_sensors: sensorIds,
    zoom_state: {
      start_date: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end_date: endDate || new Date().toISOString(),
      is_zoomed: false
    },
    pan_offset: 0
  })

  // Chart configuration
  const [config, setConfig] = useState<ChartConfiguration>({
    sensors: sensorIds,
    start_date: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end_date: endDate || new Date().toISOString(),
    interval: 'hour',
    max_points: 1000,
    show_legend: true,
    chart_type: 'line'
  })

  // Fetch time-series data
  const fetchData = useCallback(async () => {
    const startTime = performance?.now() ?? Date.now()
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        sensor_ids: config.sensors.join(','),
        start_date: config.start_date,
        end_date: config.end_date,
        interval: config.interval,
        max_points: config.max_points.toString()
      })

      const response = await fetch(`/api/readings/timeseries?${params}`)
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data')
      }

      const loadTime = (performance?.now() ?? Date.now()) - startTime
      setData(result.data.series)

      // Update performance metrics
      setPerformanceMetrics({
        data_load_time: loadTime,
        render_time: 0, // Will be set in effect
        interaction_latency: 0,
        memory_usage: 0,
        points_rendered: result.data.metadata.total_points
      })

    } catch (err) {
      console.error('Error fetching time-series data:', err)

      // Enhanced error handling with user-friendly messages
      let userMessage = 'Unknown error occurred'

      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          userMessage = 'Network error: Unable to connect to the server. Please check your internet connection.'
        } else if (err.message.includes('timeout')) {
          userMessage = 'Request timeout: The server took too long to respond. Try reducing the date range.'
        } else if (err.message.includes('400')) {
          userMessage = 'Invalid request: Please check your sensor selection and date range.'
        } else if (err.message.includes('401')) {
          userMessage = 'Authentication error: Please sign in again.'
        } else if (err.message.includes('403')) {
          userMessage = 'Access denied: You don\'t have permission to access this data.'
        } else if (err.message.includes('429')) {
          userMessage = 'Too many requests: Please wait a moment before trying again.'
        } else if (err.message.includes('500')) {
          userMessage = 'Server error: Our team has been notified. Please try again later.'
        } else if (err.message.includes('503')) {
          userMessage = 'Service unavailable: The server is temporarily down. Please try again in a few minutes.'
        } else {
          userMessage = `Error: ${err.message}`
        }
      }

      setError(userMessage)
    } finally {
      setLoading(false)
    }
  }, [config])

  // Transform multi-series data for Recharts
  const transformedData = useMemo(() => {
    const startRenderTime = performance?.now() ?? Date.now()

    if (data.length === 0) return []

    // Create a map of all timestamps
    const timestampMap = new Map<string, ChartDataPoint>()

    data.forEach(series => {
      series.data.forEach(point => {
        if (!timestampMap.has(point.timestamp)) {
          timestampMap.set(point.timestamp, {
            timestamp: point.timestamp,
            formattedTime: new Date(point.timestamp).toLocaleString()
          })
        }

        const dataPoint = timestampMap.get(point.timestamp)!
        dataPoint[`${series.sensor_id}_value`] = point.value
        dataPoint[`${series.sensor_id}_status`] = point.status
      })
    })

    const result = Array.from(timestampMap.values()).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    const renderTime = (performance?.now() ?? Date.now()) - startRenderTime
    setPerformanceMetrics(prev => prev ? { ...prev, render_time: renderTime } : null)

    return result
  }, [data])

  // Update chartData when transformedData changes
  useEffect(() => {
    setChartData(transformedData)
  }, [transformedData])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchData])

  // Handle zoom
  const handleZoom = useCallback((newIndex: { startIndex?: number; endIndex?: number } | null) => {
    const { startIndex, endIndex } = newIndex || {}
    if (startIndex !== undefined && endIndex !== undefined && chartData.length > 0) {
      const newStartDate = chartData[startIndex]?.timestamp
      const newEndDate = chartData[endIndex]?.timestamp

      if (newStartDate && newEndDate) {
        const newConfig = {
          ...config,
          start_date: newStartDate,
          end_date: newEndDate
        }
        setConfig(newConfig)
        setInteractionState(prev => ({
          ...prev,
          zoom_state: {
            start_date: newStartDate,
            end_date: newEndDate,
            is_zoomed: true
          }
        }))
        onConfigChange?.(newConfig)
      }
    }
  }, [chartData, config, onConfigChange])

  // Reset zoom
  const handleResetZoom = useCallback(() => {
    const newConfig = {
      ...config,
      start_date: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end_date: endDate || new Date().toISOString()
    }
    setConfig(newConfig)
    setInteractionState(prev => ({
      ...prev,
      zoom_state: {
        ...prev.zoom_state,
        is_zoomed: false
      }
    }))
    onConfigChange?.(newConfig)
  }, [config, startDate, endDate, onConfigChange])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ color: string; dataKey: string; value: number; name?: string; }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null

    const timestamp = new Date(label as string).toLocaleString()

    return (
      <div className="bg-white p-4 border rounded-lg shadow-lg max-w-xs">
        <p className="font-medium text-gray-900 mb-2">{timestamp}</p>
        {payload.map((entry, _index: number) => {
          if (!entry.dataKey.endsWith('_value')) return null

          const sensorId = entry.dataKey.replace('_value', '')
          const series = data.find(s => s.sensor_id === sensorId)
          const status = payload.find(p => p.dataKey === `${sensorId}_status`)?.value

          return (
            <div key={_index} className="flex items-center space-x-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{sensorId}</span>
              <span className="text-sm font-medium text-gray-900">
                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value} {series?.unit}
              </span>
              {status && String(status) !== 'normal' && (
                <AlertCircle className={`h-3 w-3 ${
                  String(status) === 'error' ? 'text-red-500' : 'text-yellow-500'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Get status color for line styling
  const _getStatusStroke = (sensorId: string) => {
    const series = data.find(s => s.sensor_id === sensorId)
    return series?.color || '#3B82F6'
  }

  // Handle empty sensor state
  if (!sensorIds || sensorIds.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No Sensors Selected</p>
            <p className="text-sm text-gray-500">
              Please select sensors to display time-series data
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading time-series data...</p>
            <p className="text-sm text-gray-500 mt-1">
              Processing {config.sensors.length} sensors
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-6" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">Error loading chart data</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      {showControls && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Time-Series Analysis</h3>
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Bangkok CU-BEMS Dataset</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Performance indicator */}
              {performance && (
                <div className="text-xs text-gray-500">
                  {performanceMetrics?.points_rendered.toLocaleString()} points • {Math.round(performanceMetrics?.data_load_time || 0)}ms
                </div>
              )}

              {/* Zoom reset */}
              {interactionState.zoom_state.is_zoomed && (
                <button
                  onClick={handleResetZoom}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
                  title="Reset zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}

              {/* Export */}
              {onExport && (
                <button
                  onClick={onExport}
                  className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-600"
                  title="Export chart"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}

              {/* Refresh */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Sensor legend */}
          {config.show_legend && data.length > 0 && (
            <div className="flex flex-wrap gap-3 text-sm">
              {data.map((series, _index) => (
                <div key={series.sensor_id} className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: series.color }}
                  />
                  <span className="text-gray-700">{series.sensor_id}</span>
                  <span className="text-gray-500">({series.equipment_type})</span>
                  <span className="text-gray-400">Floor {series.floor_number}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={height - (showControls ? 120 : 40)}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />

            {/* Render lines for each sensor */}
            {data.map((series, _index) => (
              <Line
                key={series.sensor_id}
                type="monotone"
                dataKey={`${series.sensor_id}_value`}
                stroke={series.color}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                name={`${series.sensor_id} (${series.unit})`}
              />
            ))}

            {/* Brush for zoom functionality */}
            <Brush
              dataKey="timestamp"
              height={30}
              stroke="#3B82F6"
              onChange={handleZoom}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Status bar */}
      <div className="px-4 py-2 border-t bg-gray-50 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Data</span>
            </div>
            <span>
              {new Date(config.start_date).toLocaleDateString()} - {new Date(config.end_date).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Interval: {config.interval}</span>
            {interactionState.zoom_state.is_zoomed && (
              <span className="text-blue-600">Zoomed View</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Export the component wrapped with error boundary
export default function TimeSeriesChart(props: TimeSeriesChartProps) {
  return (
    <ChartErrorBoundary
      onError={(error, errorInfo) => {
        // Log detailed error information
        console.error('TimeSeriesChart Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          props: {
            sensorIds: props.sensorIds,
            startDate: props.startDate,
            endDate: props.endDate,
            height: props.height
          }
        })
      }}
    >
      <TimeSeriesChartCore {...props} />
    </ChartErrorBoundary>
  )
}