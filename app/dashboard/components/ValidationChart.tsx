'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

interface ChartData {
  name: string
  value: number
  confidence?: number
  savings?: number
  category?: string
}

interface RawDataItem {
  title?: string
  confidence?: number
  confidence_level?: number
  category?: string
  scenario_name?: string
  annual_savings?: number
  estimated_savings?: string
  equipment_type?: string
  floor_number?: string | number
  performance_score?: number
  efficiency_score?: number
  metric_value?: number
  created_at?: string
  data_quality_score?: number
  quality_score?: number
}

interface ValidationChartProps {
  data: unknown[]
  type: 'confidence' | 'savings' | 'performance' | 'trends'
  title: string
  height?: number
}

const COLORS = {
  high: '#10B981', // green-500
  medium: '#F59E0B', // amber-500
  low: '#EF4444', // red-500
  primary: '#3B82F6', // blue-500
  secondary: '#8B5CF6', // violet-500
}

export default function ValidationChart({ data, type, title, height = 300 }: ValidationChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([])

  const processDataForChart = useCallback((rawData: unknown[], chartType: string): ChartData[] => {
    switch (chartType) {
      case 'confidence':
        return rawData.map((item, index) => {
          const typedItem = item as RawDataItem
          return {
            name: typedItem.title?.slice(0, 20) + '...' || `Insight ${index + 1}`,
            value: typedItem.confidence || typedItem.confidence_level || 95,
            confidence: typedItem.confidence || typedItem.confidence_level || 95,
            category: typedItem.category || 'general'
          }
        })

      case 'savings':
        return rawData.map((item, index) => {
          const typedItem = item as RawDataItem
          return {
            name: typedItem.scenario_name || typedItem.title?.slice(0, 20) + '...' || `Scenario ${index + 1}`,
            value: typedItem.annual_savings || extractSavingsValue(typedItem.estimated_savings) || 0,
            savings: typedItem.annual_savings || extractSavingsValue(typedItem.estimated_savings) || 0,
            confidence: typedItem.confidence_level || typedItem.confidence || 90
          }
        })

      case 'performance':
        return rawData.map((item, index) => {
          const typedItem = item as RawDataItem
          return {
            name: String(typedItem.equipment_type || typedItem.floor_number || `Item ${index + 1}`),
            value: typedItem.performance_score || typedItem.efficiency_score || typedItem.metric_value || 0,
            confidence: typedItem.confidence_level || typedItem.confidence || 85,
            category: typedItem.category || categorizePerformance(typedItem)
          }
        })

      case 'trends':
        return rawData.map((item, index) => {
          const typedItem = item as RawDataItem
          return {
            name: new Date(typedItem.created_at || Date.now()).toLocaleDateString() || `Day ${index + 1}`,
            value: typedItem.data_quality_score || typedItem.quality_score || 95,
            confidence: typedItem.confidence_level || 90
          }
        })

      default:
        return []
    }
  }, [])

  useEffect(() => {
    const processedData = processDataForChart(data, type)
    setChartData(processedData)
  }, [data, type, processDataForChart])

  const extractSavingsValue = (savingsString: string | undefined): number => {
    if (!savingsString) return 0
    const match = savingsString.match(/\$([0-9,]+)/)
    return match ? parseInt(match[1].replace(/,/g, '')) : 0
  }

  const categorizePerformance = (item: RawDataItem): string => {
    const value = item.performance_score || item.efficiency_score || item.metric_value || 0
    if (value >= 90) return 'high'
    if (value >= 70) return 'medium'
    return 'low'
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 95) return COLORS.high
    if (confidence >= 85) return COLORS.medium
    return COLORS.low
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: ChartData }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-blue-600">
            Value: {payload[0].value.toLocaleString()}
            {type === 'savings' && ' dollars'}
            {type === 'confidence' && '%'}
            {type === 'performance' && '%'}
          </p>
          {data.confidence && (
            <p className="text-green-600">
              Confidence: {data.confidence}%
            </p>
          )}
          {data.savings && (
            <p className="text-purple-600">
              Savings: ${data.savings.toLocaleString()}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    switch (type) {
      case 'confidence':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getConfidenceColor(entry.confidence || 95)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )

      case 'savings':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="value"
                fill={COLORS.primary}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'performance':
        const performanceData = chartData.map(item => ({
          ...item,
          fill: item.value >= 90 ? COLORS.high : item.value >= 70 ? COLORS.medium : COLORS.low
        }))

        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={performanceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'trends':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[80, 100]}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={COLORS.primary}
                strokeWidth={3}
                dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      default:
        return <div className="flex items-center justify-center h-full text-gray-500">Chart type not supported</div>
    }
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          No data available for chart
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          {type === 'confidence' && (
            <div className="flex items-center space-x-1 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.high }}></div>
                <span>High (95%+)</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.medium }}></div>
                <span>Medium (85%+)</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.low }}></div>
                <span>Low (&lt;85%)</span>
              </div>
            </div>
          )}
          <span className="text-xs text-gray-500">{chartData.length} items</span>
        </div>
      </div>
      {renderChart()}
    </div>
  )
}