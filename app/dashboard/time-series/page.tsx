/**
 * Time-Series Analytics Dashboard Page
 * Story 3.2: Interactive Time-Series Visualizations
 *
 * Integrated dashboard featuring:
 * - Interactive multi-sensor charts
 * - Date range selection
 * - Export functionality
 * - Performance optimization
 */

'use client'

import React, { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  _Activity,
  BarChart3,
  _Calendar,
  _Download,
  Filter,
  RefreshCw,
  _Settings,
  TrendingUp,
  AlertCircle,
  Database,
  Cpu,
  Clock
} from 'lucide-react'
import TimeSeriesChart from '../components/TimeSeriesChart'
import DateRangePicker from '../components/DateRangePicker'
import ChartExportButton from '../components/ChartExportButton'
import { ChartErrorWrapper } from '../components/ChartErrorBoundary'
import type { ChartConfiguration } from '@/types/analytics'

export default function TimeSeriesDashboard() {
  const { data: session } = useSession()
  const [chartConfig, setChartConfig] = useState<ChartConfiguration>({
    sensors: ['SENSOR_001', 'SENSOR_002', 'SENSOR_003'],
    start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
    interval: 'hour',
    max_points: 1000,
    show_legend: true,
    chart_type: 'line'
  })

  const [selectedSensors, setSelectedSensors] = useState<string[]>(chartConfig.sensors)
  const [showFilters, setShowFilters] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Available sensors for Bangkok dataset
  const availableSensors = [
    { id: 'SENSOR_001', name: 'HVAC System A', type: 'HVAC', floor: 1 },
    { id: 'SENSOR_002', name: 'Lighting Control B', type: 'Lighting', floor: 2 },
    { id: 'SENSOR_003', name: 'Power Grid C', type: 'Power', floor: 3 },
    { id: 'SENSOR_004', name: 'Water System D', type: 'Water', floor: 4 },
    { id: 'SENSOR_005', name: 'Security Panel E', type: 'Security', floor: 5 },
    { id: 'SENSOR_006', name: 'HVAC System F', type: 'HVAC', floor: 6 },
    { id: 'SENSOR_007', name: 'Lighting Control G', type: 'Lighting', floor: 7 },
    { id: 'SENSOR_008', name: 'Power Grid H', type: 'Power', floor: 1 }
  ]

  // Handle date range changes
  const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
    const newConfig = {
      ...chartConfig,
      start_date: startDate,
      end_date: endDate
    }
    setChartConfig(newConfig)
  }, [chartConfig])

  // Handle sensor selection changes
  const handleSensorToggle = useCallback((sensorId: string) => {
    const newSensors = selectedSensors.includes(sensorId)
      ? selectedSensors.filter(id => id !== sensorId)
      : [...selectedSensors, sensorId]

    setSelectedSensors(newSensors)
    setChartConfig(prev => ({ ...prev, sensors: newSensors }))
  }, [selectedSensors])

  // Handle chart configuration changes
  const handleConfigChange = useCallback((newConfig: ChartConfiguration) => {
    setChartConfig(newConfig)
  }, [])

  // Handle export completion
  const handleExportComplete = useCallback((downloadUrl: string, filename: string) => {
    console.log('Export completed:', { downloadUrl, filename })
    // In production, this could trigger actual download or show success notification
  }, [])

  // Calculate date range description
  const getDateRangeDescription = () => {
    const start = new Date(chartConfig.start_date)
    const end = new Date(chartConfig.end_date)
    const diffMs = end.getTime() - start.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    return diffDays === 0 ? 'Same day analysis' :
           diffDays === 1 ? '1 day of data' :
           `${diffDays} days of data`
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Time-Series Analytics</h1>
                  <p className="text-sm text-gray-600">Bangkok CU-BEMS IoT Dataset Analysis</p>
                </div>
              </div>

              {/* Dataset stats */}
              <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Database className="h-4 w-4" />
                  <span>134 Sensors</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Cpu className="h-4 w-4" />
                  <span>124.9M Records</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>2018-2019 Dataset</span>
                </div>
              </div>
            </div>

            {/* User info */}
            {session?.user && (
              <div className="flex items-center space-x-3">
                <div className="text-right text-sm">
                  <p className="font-medium text-gray-900">{session.user.name}</p>
                  <p className="text-gray-500">
                    {session.user.subscriptionTier || 'Free'} Plan
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Panel */}
        <div className="bg-white rounded-lg border mb-6 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Left side - Date and filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <DateRangePicker
                startDate={chartConfig.start_date}
                endDate={chartConfig.end_date}
                onDateChange={handleDateRangeChange}
                maxDaysRange={90}
              />

              <div className="text-sm text-gray-600">
                {getDateRangeDescription()} • {selectedSensors.length} sensor{selectedSensors.length !== 1 ? 's' : ''}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  showFilters
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>Sensors</span>
              </button>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-3">
              <ChartExportButton
                chartConfig={chartConfig}
                onExportComplete={handleExportComplete}
                disabled={selectedSensors.length === 0}
              />

              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  autoRefresh
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                <span>Auto-refresh</span>
              </button>

              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-700">Interval:</label>
                <select
                  value={chartConfig.interval}
                  onChange={(e) => setChartConfig(prev => ({
                    ...prev,
                    interval: e.target.value as 'minute' | 'hour' | 'day' | 'week'
                  }))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                >
                  <option value="minute">Minute</option>
                  <option value="hour">Hour</option>
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sensor Selection Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Select Sensors</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availableSensors.map((sensor) => (
                  <label
                    key={sensor.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSensors.includes(sensor.id)
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSensors.includes(sensor.id)}
                      onChange={() => handleSensorToggle(sensor.id)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{sensor.id}</div>
                      <div className="text-xs text-gray-600">{sensor.type} • Floor {sensor.floor}</div>
                    </div>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      selectedSensors.includes(sensor.id)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300'
                    }`}>
                      {selectedSensors.includes(sensor.id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chart Display */}
        {selectedSensors.length > 0 ? (
          <ChartErrorWrapper componentName="Time-Series Chart">
            <TimeSeriesChart
              sensorIds={selectedSensors}
              startDate={chartConfig.start_date}
              endDate={chartConfig.end_date}
              height={600}
              onConfigChange={handleConfigChange}
              showControls={true}
              autoRefresh={autoRefresh}
              refreshInterval={300000} // 5 minutes
            />
          </ChartErrorWrapper>
        ) : (
          <div className="bg-white rounded-lg border p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Sensors Selected</h3>
            <p className="text-gray-600 mb-4">
              Please select at least one sensor to view time-series data.
            </p>
            <button
              onClick={() => setShowFilters(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Select Sensors
            </button>
          </div>
        )}

        {/* Performance Stats */}
        <div className="mt-6 bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4" />
                <span>Real-time Analysis</span>
              </div>
              <div>Chart Type: {chartConfig.chart_type}</div>
              <div>Max Points: {chartConfig.max_points.toLocaleString()}</div>
            </div>
            <div className="flex items-center space-x-4">
              <div>Bangkok Dataset • 2018-2019</div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}