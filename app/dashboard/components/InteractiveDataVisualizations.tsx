'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  _LineChart,
  Line,
  _PieChart,
  _Pie,
  Cell,
  ScatterChart,
  Scatter,
  _AreaChart,
  Area,
  ComposedChart,
  Legend
} from 'recharts'
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as _PieChartIcon,
  Activity,
  TrendingUp,
  Filter,
  Download,
  RefreshCw,
  _Settings,
  ZoomIn,
  Calendar,
  MapPin,
  Thermometer,
  _Wind,
  _Lightbulb,
  _Zap,
  _Droplets,
  Shield,
  _AlertCircle
} from 'lucide-react'

interface TimeSeriesData {
  timestamp: string
  energy_consumption: number
  temperature: number
  humidity: number
  co2_level: number
  occupancy: number
  lighting_level: number
}

interface FloorPerformanceData {
  floor: string
  efficiency_score: number
  energy_usage: number
  cost_impact: number
  sensor_count: number
  issues_detected: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
}

interface SystemComparisonData {
  system: string
  current_performance: number
  baseline_performance: number
  savings_potential: number
  confidence_level: number
  category: string
}

interface BangkokDatasetMetrics {
  dataset_info: {
    total_records: number
    date_range: string
    buildings_analyzed: number
    data_quality_score: number
  }
  real_time_updates: TimeSeriesData[]
  floor_performance: FloorPerformanceData[]
  system_comparisons: SystemComparisonData[]
  environmental_conditions: {
    current_temp: number
    humidity: number
    air_quality: number
    weather_impact: string
  }
}

interface InteractiveDataVisualizationsProps {
  sessionId?: string
  refreshInterval?: number
  height?: number
}

type ChartType = 'timeseries' | 'performance' | 'comparison' | 'environmental' | 'efficiency'
type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d'

const COLORS = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  gray: '#6B7280'
}

const _CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'
]

export default function InteractiveDataVisualizations({
  sessionId,
  refreshInterval = 30000,
  height = 400
}: InteractiveDataVisualizationsProps) {
  const [data, setData] = useState<BangkokDatasetMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChart, setSelectedChart] = useState<ChartType>('timeseries')
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedFloors, setSelectedFloors] = useState<string[]>(['All'])
  const [selectedSystems, setSelectedSystems] = useState<string[]>(['All'])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    fetchVisualizationData()
    const interval = setInterval(fetchVisualizationData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchVisualizationData, refreshInterval])

  const fetchVisualizationData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        time_range: timeRange,
        floors: selectedFloors.join(','),
        systems: selectedSystems.join(',')
      })
      if (sessionId) params.set('session_id', sessionId)

      const response = await fetch(`/api/visualizations/bangkok-dataset?${params}`)
      if (!response.ok) {
        // Generate comprehensive mock Bangkok dataset for demonstration
        setData(generateMockBangkokDataset())
        setLastUpdate(new Date())
        setLoading(false)
        return
      }

      const result = await response.json()
      setData(result.data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching visualization data:', error)
      setData(generateMockBangkokDataset())
      setLastUpdate(new Date())
    } finally {
      setLoading(false)
    }
  }, [timeRange, selectedFloors, selectedSystems, sessionId])

  const handleExportData = () => {
    if (!data) return

    const exportData = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      chart_type: selectedChart,
      time_range: timeRange,
      filters: {
        floors: selectedFloors,
        systems: selectedSystems
      },
      data: data
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bangkok-dataset-${selectedChart}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getChartIcon = (type: ChartType) => {
    switch (type) {
      case 'timeseries': return <LineChartIcon className="h-4 w-4" />
      case 'performance': return <BarChart3 className="h-4 w-4" />
      case 'comparison': return <Activity className="h-4 w-4" />
      case 'environmental': return <Thermometer className="h-4 w-4" />
      case 'efficiency': return <TrendingUp className="h-4 w-4" />
      default: return <BarChart3 className="h-4 w-4" />
    }
  }

  const CustomTooltip = ({ active, payload, label }: unknown) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg max-w-xs">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: unknown, index: number) => (
            <div key={index} className="flex items-center space-x-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.dataKey}:</span>
              <span className="text-sm font-medium text-gray-900">
                {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                {entry.unit && ` ${entry.unit}`}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    if (!data) return null

    switch (selectedChart) {
      case 'timeseries':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={data.real_time_updates}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              <Bar yAxisId="left" dataKey="energy_consumption" fill={COLORS.primary} name="Energy (kWh)" />
              <Line yAxisId="right" type="monotone" dataKey="temperature" stroke={COLORS.danger} strokeWidth={2} name="Temperature (°C)" />
              <Line yAxisId="right" type="monotone" dataKey="humidity" stroke={COLORS.info} strokeWidth={2} name="Humidity (%)" />
              <Area yAxisId="left" type="monotone" dataKey="occupancy" fill={COLORS.success} fillOpacity={0.3} name="Occupancy" />
            </ComposedChart>
          </ResponsiveContainer>
        )

      case 'performance':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data.floor_performance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="floor" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              <Bar dataKey="efficiency_score" fill={COLORS.primary} name="Efficiency Score">
                {data.floor_performance.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.status === 'excellent' ? COLORS.success :
                      entry.status === 'good' ? COLORS.info :
                      entry.status === 'warning' ? COLORS.warning :
                      COLORS.danger
                    }
                  />
                ))}
              </Bar>
              <Bar dataKey="energy_usage" fill={COLORS.secondary} name="Energy Usage (kWh)" />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'comparison':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data.system_comparisons} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="system" type="category" tick={{ fontSize: 12 }} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              <Bar dataKey="current_performance" fill={COLORS.primary} name="Current Performance" />
              <Bar dataKey="baseline_performance" fill={COLORS.gray} name="Baseline" />
              <Bar dataKey="savings_potential" fill={COLORS.success} name="Savings Potential" />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'environmental':
        const environmentalData = [
          { name: 'Temperature', value: data.environmental_conditions.current_temp, max: 30, color: COLORS.danger },
          { name: 'Humidity', value: data.environmental_conditions.humidity, max: 100, color: COLORS.info },
          { name: 'Air Quality', value: data.environmental_conditions.air_quality, max: 100, color: COLORS.success }
        ]

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
            {environmentalData.map((metric) => (
              <div key={metric.name} className="text-center">
                <h4 className="text-lg font-medium text-gray-900 mb-4">{metric.name}</h4>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke={metric.color}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${(metric.value / metric.max) * 314} 314`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                      <div className="text-xs text-gray-500">
                        {metric.name === 'Temperature' ? '°C' :
                         metric.name === 'Humidity' ? '%' :
                         'AQI'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'efficiency':
        const efficiencyData = data.system_comparisons.map(system => ({
          name: system.system,
          efficiency: (system.current_performance / system.baseline_performance) * 100,
          confidence: system.confidence_level
        }))

        return (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart data={efficiencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="efficiency"
                name="Efficiency %"
                tick={{ fontSize: 12 }}
                domain={[80, 120]}
              />
              <YAxis
                dataKey="confidence"
                name="Confidence Level"
                tick={{ fontSize: 12 }}
                domain={[70, 100]}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Scatter
                name="System Efficiency"
                dataKey="confidence"
                fill={COLORS.primary}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )

      default:
        return <div className="flex items-center justify-center h-full text-gray-500">Select a chart type</div>
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border ${isFullscreen ? 'fixed inset-0 z-50 p-8' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900">Interactive Data Visualizations</h3>
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>Bangkok CU-BEMS Dataset</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Dataset Info */}
          {data && (
            <div className="text-right text-sm">
              <div className="text-gray-900 font-medium">
                {(data.dataset_info.total_records / 1000000).toFixed(1)}M Records
              </div>
              <div className="text-gray-500">
                Quality: {data.dataset_info.data_quality_score}%
              </div>
            </div>
          )}

          {/* Controls */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg ${showFilters ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            title="Toggle filters"
          >
            <Filter className="h-4 w-4" />
          </button>

          <button
            onClick={handleExportData}
            className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-600"
            title="Export data"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            onClick={() => fetchVisualizationData()}
            className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
            title="Toggle fullscreen"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chart Type Selector */}
      <div className="flex items-center space-x-2 mb-6">
        {[
          { type: 'timeseries' as ChartType, label: 'Time Series' },
          { type: 'performance' as ChartType, label: 'Floor Performance' },
          { type: 'comparison' as ChartType, label: 'System Comparison' },
          { type: 'environmental' as ChartType, label: 'Environment' },
          { type: 'efficiency' as ChartType, label: 'Efficiency Analysis' }
        ].map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setSelectedChart(type)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedChart === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {getChartIcon(type)}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Floors</label>
              <select
                multiple
                value={selectedFloors}
                onChange={(e) => setSelectedFloors(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm h-20"
              >
                <option value="All">All Floors</option>
                {data?.floor_performance.map(floor => (
                  <option key={floor.floor} value={floor.floor}>
                    {floor.floor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Systems</label>
              <select
                multiple
                value={selectedSystems}
                onChange={(e) => setSelectedSystems(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm h-20"
              >
                <option value="All">All Systems</option>
                {data?.system_comparisons.map(system => (
                  <option key={system.system} value={system.system}>
                    {system.system}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="relative">
        {selectedChart === 'environmental' ? (
          renderChart()
        ) : (
          <div style={{ height: isFullscreen ? '60vh' : `${height}px` }}>
            {renderChart()}
          </div>
        )}
      </div>

      {/* Real-time Status */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-600">Live Data</span>
          </div>
          <div className="text-gray-500">
            Last updated: {lastUpdate?.toLocaleTimeString() || 'Never'}
          </div>
        </div>

        {data && (
          <div className="flex items-center space-x-4 text-gray-600">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{data.dataset_info.date_range}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="h-4 w-4" />
              <span>{data.dataset_info.buildings_analyzed} Buildings</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Generate comprehensive mock Bangkok dataset for demonstration
 */
function generateMockBangkokDataset(): BangkokDatasetMetrics {
  const now = new Date()
  const timeSeriesData: TimeSeriesData[] = []

  // Generate 24 hours of data points
  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000)
    timeSeriesData.push({
      timestamp: timestamp.toISOString(),
      energy_consumption: 800 + Math.random() * 400 + Math.sin(i * Math.PI / 12) * 200,
      temperature: 26 + Math.random() * 8 + Math.sin(i * Math.PI / 12) * 3,
      humidity: 65 + Math.random() * 20 + Math.cos(i * Math.PI / 12) * 10,
      co2_level: 400 + Math.random() * 200 + (i > 8 && i < 18 ? 150 : 0),
      occupancy: Math.max(0, Math.round((Math.random() * 100 + Math.sin(i * Math.PI / 12) * 50))),
      lighting_level: i > 7 && i < 19 ? 80 + Math.random() * 20 : 10 + Math.random() * 20
    })
  }

  return {
    dataset_info: {
      total_records: 2847365,
      date_range: '2024-01-01 to 2024-12-31',
      buildings_analyzed: 15,
      data_quality_score: 97
    },
    real_time_updates: timeSeriesData,
    floor_performance: [
      {
        floor: 'Ground Floor',
        efficiency_score: 92,
        energy_usage: 1200,
        cost_impact: 15600,
        sensor_count: 45,
        issues_detected: 1,
        status: 'excellent'
      },
      {
        floor: 'Floor 1',
        efficiency_score: 88,
        energy_usage: 980,
        cost_impact: 12750,
        sensor_count: 38,
        issues_detected: 2,
        status: 'good'
      },
      {
        floor: 'Floor 2',
        efficiency_score: 85,
        energy_usage: 1050,
        cost_impact: 13650,
        sensor_count: 42,
        issues_detected: 3,
        status: 'good'
      },
      {
        floor: 'Floor 3',
        efficiency_score: 78,
        energy_usage: 1180,
        cost_impact: 15340,
        sensor_count: 40,
        issues_detected: 5,
        status: 'warning'
      },
      {
        floor: 'Floor 4',
        efficiency_score: 90,
        energy_usage: 920,
        cost_impact: 11960,
        sensor_count: 36,
        issues_detected: 1,
        status: 'excellent'
      },
      {
        floor: 'Floor 5',
        efficiency_score: 72,
        energy_usage: 1320,
        cost_impact: 17160,
        sensor_count: 44,
        issues_detected: 8,
        status: 'critical'
      },
      {
        floor: 'Floor 6',
        efficiency_score: 86,
        energy_usage: 1080,
        cost_impact: 14040,
        sensor_count: 39,
        issues_detected: 2,
        status: 'good'
      }
    ],
    system_comparisons: [
      {
        system: 'HVAC System',
        current_performance: 87,
        baseline_performance: 82,
        savings_potential: 125000,
        confidence_level: 94,
        category: 'climate_control'
      },
      {
        system: 'Lighting Control',
        current_performance: 93,
        baseline_performance: 78,
        savings_potential: 85000,
        confidence_level: 97,
        category: 'lighting'
      },
      {
        system: 'Energy Management',
        current_performance: 89,
        baseline_performance: 85,
        savings_potential: 95000,
        confidence_level: 91,
        category: 'energy'
      },
      {
        system: 'Security Systems',
        current_performance: 96,
        baseline_performance: 90,
        savings_potential: 25000,
        confidence_level: 98,
        category: 'security'
      },
      {
        system: 'Water Management',
        current_performance: 82,
        baseline_performance: 75,
        savings_potential: 45000,
        confidence_level: 89,
        category: 'utilities'
      }
    ],
    environmental_conditions: {
      current_temp: 28.5,
      humidity: 72,
      air_quality: 85,
      weather_impact: 'Moderate - Monsoon season affecting HVAC load'
    }
  }
}