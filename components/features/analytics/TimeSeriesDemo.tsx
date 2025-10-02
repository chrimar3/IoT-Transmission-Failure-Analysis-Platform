/**
 * TimeSeriesChart Demo Component
 * Story 3.2: Interactive Time-Series Visualizations
 *
 * Demo component to test and showcase the TimeSeriesChart functionality
 */

import React, { useState, useEffect } from 'react'
import { TimeSeriesChart } from './TimeSeriesChart'
import {
  MultiSeriesData,
  ChartConfiguration,
  ChartInteractionState,
  PerformanceMetrics
} from '../../../../types/analytics'
import { addHours, addMinutes, format } from 'date-fns'

export interface TimeSeriesDemoProps {
  className?: string
}

// Generate sample data for testing
const generateSampleData = (sensors: number, hoursBack: number, pointsPerHour: number): MultiSeriesData[] => {
  const now = new Date()
  const equipmentTypes = ['HVAC', 'Lighting', 'Power', 'Water']
  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6']

  return Array.from({ length: sensors }, (_, sensorIndex) => {
    const data = Array.from({ length: hoursBack * pointsPerHour }, (_, pointIndex) => {
      const timestamp = addMinutes(now, -(hoursBack * 60) + (pointIndex * (60 / pointsPerHour)))

      // Generate realistic sensor readings with some anomalies
      const baseValue = 20 + Math.sin(pointIndex * 0.1) * 5 + Math.random() * 3
      const isAnomaly = Math.random() < 0.05 // 5% chance of anomaly
      const value = isAnomaly ? baseValue + (Math.random() > 0.5 ? 15 : -10) : baseValue

      let status: 'normal' | 'warning' | 'error' = 'normal'
      if (value > 30) status = 'error'
      else if (value > 25 || value < 10) status = 'warning'

      return {
        timestamp: timestamp.toISOString(),
        value: Math.round(value * 100) / 100,
        sensor_id: `sensor_${sensorIndex + 1}`,
        status
      }
    })

    return {
      sensor_id: `sensor_${sensorIndex + 1}`,
      equipment_type: equipmentTypes[sensorIndex % equipmentTypes.length],
      floor_number: Math.floor(sensorIndex / 2) + 1,
      unit: 'kWh',
      color: colors[sensorIndex % colors.length],
      data
    }
  })
}

export const TimeSeriesDemo: React.FC<TimeSeriesDemoProps> = ({ className = '' }) => {
  const [data, setData] = useState<MultiSeriesData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<ChartConfiguration>({
    sensors: ['sensor_1', 'sensor_2', 'sensor_3'],
    start_date: addHours(new Date(), -24).toISOString(),
    end_date: new Date().toISOString(),
    interval: 'hour',
    max_points: 1000,
    show_legend: true,
    chart_type: 'line'
  })
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)
  const [interactionState, setInteractionState] = useState<ChartInteractionState | null>(null)

  // Simulate data loading
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000))

        const sampleData = generateSampleData(3, 24, 4) // 3 sensors, 24 hours, 4 points per hour
        setData(sampleData)
      } catch (_err) {
        setError('Failed to load sample data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleConfigChange = (newConfig: Partial<ChartConfiguration>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
  }

  const handleInteraction = (state: ChartInteractionState) => {
    setInteractionState(state)
  }

  const handlePerformanceMetrics = (metrics: PerformanceMetrics) => {
    setPerformanceMetrics(metrics)
  }

  const refreshData = () => {
    setData(generateSampleData(3, 24, 4))
  }

  const simulateError = () => {
    setError('Simulated error for testing error state')
    setData([])
  }

  const clearError = () => {
    setError(null)
    refreshData()
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Chart Controls</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chart Type
            </label>
            <select
              value={config.chart_type}
              onChange={(e) => handleConfigChange({ chart_type: e.target.value as 'line' | 'area' | 'bar' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Points
            </label>
            <select
              value={config.max_points}
              onChange={(e) => handleConfigChange({ max_points: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={100}>100 points</option>
              <option value={500}>500 points</option>
              <option value={1000}>1,000 points</option>
              <option value={5000}>5,000 points</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.show_legend}
                onChange={(e) => handleConfigChange({ show_legend: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Show Legend</span>
            </label>
          </div>
        </div>

        <div className="flex space-x-4 mt-4">
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh Data
          </button>
          <button
            onClick={simulateError}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Simulate Error
          </button>
          {error && (
            <button
              onClick={clearError}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Clear Error
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Time-Series Visualization</h3>
        <TimeSeriesChart
          data={data}
          config={config}
          loading={loading}
          error={error}
          onInteraction={handleInteraction}
          onPerformanceMetrics={handlePerformanceMetrics}
          height={500}
          className="w-full"
        />
      </div>

      {/* Interaction State */}
      {interactionState?.hover_point && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h4 className="text-md font-semibold text-blue-800 mb-2">Current Hover Point</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>
              <span className="font-medium text-blue-700">Time:</span>
              <div className="text-blue-600">
                {format(new Date(interactionState.hover_point.timestamp), 'MMM dd, HH:mm:ss')}
              </div>
            </div>
            <div>
              <span className="font-medium text-blue-700">Value:</span>
              <div className="text-blue-600">{interactionState.hover_point.value}</div>
            </div>
            <div>
              <span className="font-medium text-blue-700">Sensor:</span>
              <div className="text-blue-600">{interactionState.hover_point.sensor_id}</div>
            </div>
            <div>
              <span className="font-medium text-blue-700">Status:</span>
              <div className={`font-medium ${
                interactionState.hover_point.status === 'error' ? 'text-red-600' :
                interactionState.hover_point.status === 'warning' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {interactionState.hover_point.status.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {performanceMetrics && (
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <h4 className="text-md font-semibold text-green-800 mb-2">Performance Metrics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>
              <span className="font-medium text-green-700">Render Time:</span>
              <div className="text-green-600">{performanceMetrics.render_time.toFixed(2)}ms</div>
            </div>
            <div>
              <span className="font-medium text-green-700">Points Rendered:</span>
              <div className="text-green-600">{performanceMetrics.points_rendered.toLocaleString()}</div>
            </div>
            <div>
              <span className="font-medium text-green-700">Memory Usage:</span>
              <div className="text-green-600">
                {(performanceMetrics.memory_usage / 1024 / 1024).toFixed(1)}MB
              </div>
            </div>
            <div>
              <span className="font-medium text-green-700">Interaction Latency:</span>
              <div className="text-green-600">{performanceMetrics.interaction_latency.toFixed(2)}ms</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimeSeriesDemo