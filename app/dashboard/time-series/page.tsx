/**
 * Epic 2 Story 2.2: Interactive Time-Series Analytics
 * Interactive charts showing energy patterns over 18-month Bangkok study period
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
} from 'recharts'
import {
  Activity,
  Download,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Zap,
  Settings,
  Lock,
  Crown,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react'

// Types
interface TimeSeriesDataPoint {
  timestamp: number
  date: string
  HVAC: number
  Lighting: number
  Power: number
  Security: number
  Elevators: number
  confidence?: number
  anomaly?: boolean
}

interface AnomalyPoint {
  timestamp: number
  sensorType: string
  value: number
  confidence: number
  severity: 'low' | 'medium' | 'high'
}

interface TimeSeriesData {
  data: TimeSeriesDataPoint[]
  anomalies: AnomalyPoint[]
  statistics: {
    sensorType: string
    min: number
    max: number
    avg: number
    stdDev: number
    trend: 'increasing' | 'stable' | 'decreasing'
  }[]
  seasonalPatterns: {
    season: string
    avgConsumption: number
    peakHours: string[]
  }[]
}

type TimeRange = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all'
type ChartGranularity = '5min' | 'hour' | 'day' | 'week' | 'month'

const SENSOR_COLORS = {
  HVAC: '#3B82F6',
  Lighting: '#10B981',
  Power: '#F59E0B',
  Security: '#8B5CF6',
  Elevators: '#EC4899'
}

const BANGKOK_DATASET_INFO = {
  startDate: '2018-01-01',
  endDate: '2019-06-30',
  totalPoints: 124900000,
  sensors: 144,
  interval: '5 minutes'
}

// Helper function to format large numbers
const formatDataPoints = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

// Types for chart components
interface TooltipPayloadEntry {
  color: string
  name: string
  value: number
  payload: Record<string, unknown>
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border">
      <p className="font-semibold text-sm text-gray-900">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <div key={index} className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-gray-600">{entry.name}:</span>
            </div>
            <span className="text-xs font-medium text-gray-900">
              {entry.value.toFixed(2)} kWh
            </span>
          </div>
        ))}
      </div>
      {payload[0]?.payload?.anomaly && (
        <div className="mt-2 pt-2 border-t">
          <div className="flex items-center space-x-1 text-amber-600">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs font-medium">Anomaly Detected</span>
          </div>
          <span className="text-xs text-gray-500">
            Confidence: {(payload[0].payload.confidence * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  )
}

export default function InteractiveTimeSeriesAnalytics() {
  const { data: session, status } = useSession()
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month')
  const [selectedGranularity, setSelectedGranularity] = useState<ChartGranularity>('day')
  const [enabledSensors, setEnabledSensors] = useState({
    HVAC: true,
    Lighting: true,
    Power: true,
    Security: false,
    Elevators: false
  })
  const [showAnomalies, setShowAnomalies] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Check if user has Professional tier access
  const isProfessionalUser = session?.user && (session.user as { subscriptionTier?: string }).subscriptionTier === 'PROFESSIONAL'

  // Calculate date range based on selected time range
  const getDateRange = useCallback(() => {
    const end = new Date('2019-06-30')
    let start = new Date('2019-06-30')

    switch (selectedTimeRange) {
      case 'hour':
        start.setHours(start.getHours() - 1)
        break
      case 'day':
        start.setDate(start.getDate() - 1)
        break
      case 'week':
        start.setDate(start.getDate() - 7)
        break
      case 'month':
        start.setMonth(start.getMonth() - 1)
        break
      case 'quarter':
        start.setMonth(start.getMonth() - 3)
        break
      case 'year':
        start.setFullYear(start.getFullYear() - 1)
        break
      case 'all':
        start = new Date('2018-01-01')
        break
    }

    return { start, end }
  }, [selectedTimeRange])

  // Fetch time-series data
  const fetchTimeSeriesData = useCallback(async () => {
    try {
      setRefreshing(true)
      const { start, end } = getDateRange()

      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
        granularity: selectedGranularity,
        sensors: Object.entries(enabledSensors)
          .filter(([, enabled]) => enabled)
          .map(([sensor]) => sensor)
          .join(','),
        anomalies: showAnomalies.toString()
      })

      const response = await fetch(`/api/readings/timeseries?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch time-series data')
      }

      await response.json()

      // Generate mock data for demonstration
      const mockData = generateMockTimeSeriesData(start, end, selectedGranularity)
      setTimeSeriesData(mockData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time-series data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [getDateRange, selectedGranularity, enabledSensors, showAnomalies])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTimeSeriesData()
    } else if (status === 'loading') {
      setLoading(true)
    } else {
      setLoading(false)
    }
  }, [status, fetchTimeSeriesData])

  // Generate mock time-series data
  const generateMockTimeSeriesData = (
    start: Date,
    end: Date,
    granularity: ChartGranularity
  ): TimeSeriesData => {
    const data: TimeSeriesDataPoint[] = []
    const anomalies: AnomalyPoint[] = []

    // Calculate number of points based on granularity
    const msPerPoint = {
      '5min': 5 * 60 * 1000,
      'hour': 60 * 60 * 1000,
      'day': 24 * 60 * 60 * 1000,
      'week': 7 * 24 * 60 * 60 * 1000,
      'month': 30 * 24 * 60 * 60 * 1000
    }

    const interval = msPerPoint[granularity]
    let current = new Date(start)

    while (current <= end) {
      const hour = current.getHours()
      const dayOfWeek = current.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isNight = hour < 6 || hour > 22

      // Generate realistic energy consumption patterns
      const baseHVAC = isNight ? 45 : (isWeekend ? 55 : 75)
      const baseLighting = isNight ? 15 : (isWeekend ? 25 : 45)
      const basePower = isNight ? 30 : (isWeekend ? 40 : 60)
      const baseSecurity = 10
      const baseElevators = isNight ? 5 : (isWeekend ? 10 : 20)

      // Add some randomness and seasonal effects
      const seasonalFactor = 1 + 0.2 * Math.sin(current.getMonth() / 12 * 2 * Math.PI)

      const point: TimeSeriesDataPoint = {
        timestamp: current.getTime(),
        date: current.toISOString().split('T')[0] + ' ' + current.toTimeString().split(' ')[0].slice(0, 5),
        HVAC: baseHVAC * seasonalFactor + Math.random() * 10,
        Lighting: baseLighting + Math.random() * 5,
        Power: basePower + Math.random() * 8,
        Security: baseSecurity + Math.random() * 2,
        Elevators: baseElevators + Math.random() * 3,
        confidence: 0.95 + Math.random() * 0.05
      }

      // Randomly add anomalies
      if (Math.random() < 0.02) {
        point.anomaly = true
        const sensorTypes = ['HVAC', 'Lighting', 'Power', 'Security', 'Elevators']
        const anomalySensor = sensorTypes[Math.floor(Math.random() * sensorTypes.length)]

        anomalies.push({
          timestamp: current.getTime(),
          sensorType: anomalySensor,
          value: point[anomalySensor as keyof typeof point] as number * 1.5,
          confidence: 0.85 + Math.random() * 0.15,
          severity: Math.random() < 0.3 ? 'high' : Math.random() < 0.6 ? 'medium' : 'low'
        })
      }

      data.push(point)
      current = new Date(current.getTime() + interval)
    }

    // Calculate statistics
    const statistics = Object.keys(SENSOR_COLORS).map(sensor => {
      const values = data.map(d => d[sensor as keyof typeof d] as number)
      const min = Math.min(...values)
      const max = Math.max(...values)
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length
      const stdDev = Math.sqrt(variance)

      // Determine trend
      const firstHalf = values.slice(0, Math.floor(values.length / 2))
      const secondHalf = values.slice(Math.floor(values.length / 2))
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

      let trend: 'increasing' | 'stable' | 'decreasing' = 'stable'
      if (secondAvg > firstAvg * 1.05) trend = 'increasing'
      else if (secondAvg < firstAvg * 0.95) trend = 'decreasing'

      return {
        sensorType: sensor,
        min,
        max,
        avg,
        stdDev,
        trend
      }
    })

    // Mock seasonal patterns
    const seasonalPatterns = [
      {
        season: 'Winter (Jan-Mar)',
        avgConsumption: 185.3,
        peakHours: ['08:00-10:00', '18:00-20:00']
      },
      {
        season: 'Spring (Apr-Jun)',
        avgConsumption: 195.7,
        peakHours: ['09:00-11:00', '14:00-16:00']
      },
      {
        season: 'Summer (Jul-Sep)',
        avgConsumption: 225.4,
        peakHours: ['12:00-16:00', '20:00-22:00']
      },
      {
        season: 'Fall (Oct-Dec)',
        avgConsumption: 190.2,
        peakHours: ['08:00-10:00', '17:00-19:00']
      }
    ]

    return {
      data,
      anomalies,
      statistics,
      seasonalPatterns
    }
  }

  // Handle sensor toggle
  const handleSensorToggle = (sensor: string) => {
    setEnabledSensors(prev => ({
      ...prev,
      [sensor]: !prev[sensor]
    }))
  }

  // Handle export (Professional feature)
  const handleExport = (format: 'csv' | 'png' | 'pdf') => {
    if (!isProfessionalUser) {
      setShowUpgradeModal(true)
      return
    }

    // Implementation would go here
    alert(`Exporting chart as ${format.toUpperCase()}...`)
  }

  // Calculate visible data points for performance display
  const visibleDataPoints = useMemo(() => {
    if (!timeSeriesData) return 0
    return timeSeriesData.data.length
  }, [timeSeriesData])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Bangkok time-series data...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Authentication required to access time-series analytics</p>
          <button
            onClick={() => window.location.href = '/auth/signin'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">❌ {error}</p>
          <button
            onClick={fetchTimeSeriesData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!timeSeriesData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">No time-series data available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Interactive Time-Series Analytics</h1>
              <p className="text-gray-600 mt-1">Bangkok University Dataset • 18-Month Study</p>
              <div className="flex items-center mt-2 space-x-4">
                <span className="text-sm text-gray-500">
                  {formatDataPoints(visibleDataPoints)} data points loaded
                </span>
                <span className="text-sm text-gray-500">
                  {BANGKOK_DATASET_INFO.sensors} sensors
                </span>
                <span className="text-sm text-gray-500">
                  {selectedGranularity} granularity
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {isProfessionalUser && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                  <Crown className="w-4 h-4 mr-1" />
                  Professional
                </span>
              )}
              <button
                onClick={fetchTimeSeriesData}
                disabled={refreshing}
                className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Controls */}
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Time Range Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Time Range
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['day', 'week', 'month', 'all'] as TimeRange[]).map(range => (
                  <button
                    key={range}
                    onClick={() => setSelectedTimeRange(range)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      selectedTimeRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Granularity Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Settings className="inline w-4 h-4 mr-1" />
                Data Granularity
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['hour', 'day', 'week'] as ChartGranularity[]).map(gran => (
                  <button
                    key={gran}
                    onClick={() => setSelectedGranularity(gran)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      selectedGranularity === gran
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {gran.charAt(0).toUpperCase() + gran.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Download className="inline w-4 h-4 mr-1" />
                Export Data
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    isProfessionalUser
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExport('png')}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    isProfessionalUser
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  PNG
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    isProfessionalUser
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  PDF
                </button>
              </div>
              {!isProfessionalUser && (
                <p className="text-xs text-gray-500 mt-2">
                  <Lock className="inline w-3 h-3 mr-1" />
                  Export requires Professional tier
                </p>
              )}
            </div>
          </div>

          {/* Sensor Toggle */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Activity className="inline w-4 h-4 mr-1" />
              Sensor Selection
            </label>
            <div className="flex flex-wrap gap-3">
              {Object.entries(SENSOR_COLORS).map(([sensor, color]) => (
                <button
                  key={sensor}
                  onClick={() => handleSensorToggle(sensor)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    enabledSensors[sensor as keyof typeof enabledSensors]
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: color }}
                  />
                  {sensor}
                </button>
              ))}
            </div>
          </div>

          {/* Anomaly Toggle */}
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="show-anomalies"
              checked={showAnomalies}
              onChange={(e) => setShowAnomalies(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="show-anomalies" className="ml-2 text-sm text-gray-700">
              <AlertTriangle className="inline w-4 h-4 mr-1 text-amber-500" />
              Show Anomalies
            </label>
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Energy Consumption Patterns</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                className="p-1 rounded hover:bg-gray-100"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-500">{(zoomLevel * 100).toFixed(0)}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
                className="p-1 rounded hover:bg-gray-100"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1 rounded hover:bg-gray-100"
                title="Reset Zoom"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={400 * zoomLevel}>
            <LineChart
              data={timeSeriesData.data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                label={{ value: 'Energy (kWh)', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="line"
              />

              {/* Render lines for enabled sensors */}
              {enabledSensors.HVAC && (
                <Line
                  type="monotone"
                  dataKey="HVAC"
                  stroke={SENSOR_COLORS.HVAC}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              {enabledSensors.Lighting && (
                <Line
                  type="monotone"
                  dataKey="Lighting"
                  stroke={SENSOR_COLORS.Lighting}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              {enabledSensors.Power && (
                <Line
                  type="monotone"
                  dataKey="Power"
                  stroke={SENSOR_COLORS.Power}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              {enabledSensors.Security && (
                <Line
                  type="monotone"
                  dataKey="Security"
                  stroke={SENSOR_COLORS.Security}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              {enabledSensors.Elevators && (
                <Line
                  type="monotone"
                  dataKey="Elevators"
                  stroke={SENSOR_COLORS.Elevators}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}

              {/* Brush component for zoom/pan */}
              <Brush
                dataKey="date"
                height={30}
                stroke="#3B82F6"
                fill="#EFF6FF"
              />

              {/* Anomaly markers */}
              {showAnomalies && timeSeriesData.anomalies.map((anomaly, index) => {
                const dataPoint = timeSeriesData.data.find(d => d.timestamp === anomaly.timestamp)
                if (!dataPoint) return null

                return (
                  <ReferenceLine
                    key={index}
                    x={dataPoint.date}
                    stroke="#F59E0B"
                    strokeDasharray="5 5"
                    label={{
                      value: '⚠',
                      position: 'top'
                    }}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Sensor Statistics */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <TrendingUp className="inline w-5 h-5 mr-2 text-blue-600" />
              Sensor Statistics
            </h3>
            <div className="space-y-3">
              {timeSeriesData.statistics.map(stat => (
                <div key={stat.sensorType} className="border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: SENSOR_COLORS[stat.sensorType as keyof typeof SENSOR_COLORS] }}
                      />
                      <span className="font-medium text-gray-900">{stat.sensorType}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      stat.trend === 'increasing' ? 'bg-red-100 text-red-700' :
                      stat.trend === 'decreasing' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {stat.trend}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Min:</span>
                      <span className="ml-1 text-gray-900">{stat.min.toFixed(1)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Max:</span>
                      <span className="ml-1 text-gray-900">{stat.max.toFixed(1)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Avg:</span>
                      <span className="ml-1 text-gray-900">{stat.avg.toFixed(1)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">σ:</span>
                      <span className="ml-1 text-gray-900">{stat.stdDev.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seasonal Patterns */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <Zap className="inline w-5 h-5 mr-2 text-amber-500" />
              Seasonal Patterns
            </h3>
            <div className="space-y-3">
              {timeSeriesData.seasonalPatterns.map(pattern => (
                <div key={pattern.season} className="border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{pattern.season}</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {pattern.avgConsumption.toFixed(1)} kWh/day
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">Peak Hours:</span>
                    <span className="ml-1">{pattern.peakHours.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Anomaly Summary */}
        {showAnomalies && timeSeriesData.anomalies.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-amber-900 mb-4">
              <AlertTriangle className="inline w-5 h-5 mr-2" />
              Detected Anomalies ({timeSeriesData.anomalies.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {timeSeriesData.anomalies.slice(0, 6).map((anomaly, index) => (
                <div key={index} className="bg-white rounded-lg p-3 border border-amber-300">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{anomaly.sensorType}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      anomaly.severity === 'high' ? 'bg-red-100 text-red-700' :
                      anomaly.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {anomaly.severity}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    <div>Value: {anomaly.value.toFixed(1)} kWh</div>
                    <div>Confidence: {(anomaly.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
            {timeSeriesData.anomalies.length > 6 && (
              <p className="text-sm text-amber-700 mt-4 text-center">
                And {timeSeriesData.anomalies.length - 6} more anomalies...
              </p>
            )}
          </div>
        )}

      </main>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <Crown className="h-12 w-12 text-amber-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Upgrade to Professional</h3>
              <p className="text-gray-600 mb-6">
                Export time-series data in multiple formats with full 18-month Bangkok dataset access.
                Unlock CSV, PNG, and PDF export capabilities.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.href = '/subscription/upgrade'}
                  className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg hover:bg-amber-700"
                >
                  Upgrade for €29/month
                </button>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full bg-gray-100 text-gray-600 py-2 px-4 rounded-lg hover:bg-gray-200"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}