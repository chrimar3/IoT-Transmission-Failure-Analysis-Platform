/**
 * CU-BEMS Analytics Dashboard
 * Technical MVP displaying Bangkok dataset insights
 */

'use client'

import { useState, useEffect } from 'react'

interface Insight {
  id: string
  title: string
  value: string
  confidence: number
  category: string
  severity: 'info' | 'warning' | 'critical'
  business_impact: string
  estimated_savings: string
  actionable_recommendation: string
  implementation_difficulty: string
}

interface DashboardData {
  summary: {
    total_sensors: number
    total_records: number
    analysis_period: string
    data_quality_score: number
  }
  key_insights: Insight[]
  business_impact_summary: {
    total_identified_savings: string
    immediate_actions_savings: string
    payback_period_range: string
    confidence_level: string
  }
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/insights')
      if (!response.ok) {
        throw new Error('Failed to fetch insights')
      }
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨'
      case 'warning': return '⚠️'
      default: return 'ℹ️'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50'
      case 'warning': return 'border-yellow-500 bg-yellow-50'
      default: return 'border-blue-500 bg-blue-50'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Bangkok dataset insights...</p>
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
            onClick={fetchDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">No data available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CU-BEMS Analytics Dashboard</h1>
              <p className="text-gray-600">Bangkok Building IoT Sensor Analysis</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Analysis Period: {data.summary.analysis_period}</p>
              <p className="text-sm text-green-600">Data Quality: {data.summary.data_quality_score}%</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Sensors</h3>
            <p className="text-3xl font-bold text-blue-600">{data.summary.total_sensors}</p>
            <p className="text-xs text-gray-500 mt-1">Across 7 floors</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Records</h3>
            <p className="text-3xl font-bold text-green-600">
              {(data.summary.total_records / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-gray-500 mt-1">Sensor readings analyzed</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Savings Identified</h3>
            <p className="text-3xl font-bold text-green-600">
              {data.business_impact_summary.total_identified_savings}
            </p>
            <p className="text-xs text-gray-500 mt-1">Annual potential</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Quick Wins</h3>
            <p className="text-3xl font-bold text-orange-600">
              {data.business_impact_summary.immediate_actions_savings}
            </p>
            <p className="text-xs text-gray-500 mt-1">Immediate actions</p>
          </div>
        </div>

        {/* Business Impact Summary */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Business Impact Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Savings Potential</p>
              <p className="text-lg font-semibold text-green-600">
                {data.business_impact_summary.total_identified_savings}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payback Period</p>
              <p className="text-lg font-semibold text-blue-600">
                {data.business_impact_summary.payback_period_range}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Confidence Level</p>
              <p className="text-lg font-semibold text-purple-600">
                {data.business_impact_summary.confidence_level}
              </p>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">🎯 Key Insights & Recommendations</h2>
          <div className="space-y-4">
            {data.key_insights.map((insight) => (
              <div key={insight.id} className={`p-6 rounded-lg border-l-4 ${getSeverityColor(insight.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-2">{getSeverityIcon(insight.severity)}</span>
                      <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                      <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                        {insight.confidence}% confidence
                      </span>
                    </div>

                    <p className="text-gray-700 mb-3">{insight.business_impact}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">💡 Recommendation:</span>
                        <p className="text-gray-700 mt-1">{insight.actionable_recommendation}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">📊 Potential Savings:</span>
                        <p className="text-green-600 font-semibold mt-1">{insight.estimated_savings}</p>
                        <p className="text-gray-500 text-xs">Implementation: {insight.implementation_difficulty}</p>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 text-right">
                    <div className="text-2xl font-bold text-gray-900">{insight.value}</div>
                    <div className="text-xs text-gray-500 capitalize">{insight.category}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🚀 Immediate Action Items</h2>
          <div className="space-y-3">
            {data.key_insights
              .filter(insight => insight.severity === 'critical' || insight.implementation_difficulty === 'Easy')
              .slice(0, 3)
              .map((insight, index) => (
                <div key={insight.id} className="flex items-center">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{insight.title}</p>
                    <p className="text-sm text-gray-600">{insight.actionable_recommendation}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{insight.estimated_savings}</p>
                    <p className="text-xs text-gray-500">{insight.implementation_difficulty}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Analysis based on {(data.summary.total_records / 1000000).toFixed(1)}M sensor records from Bangkok CU-BEMS dataset</p>
          <p className="mt-1">🤖 Generated with CU-BEMS IoT Analytics Platform</p>
        </div>
      </main>
    </div>
  )
}