/**
 * CU-BEMS Analytics Dashboard
 * Technical MVP displaying Bangkok dataset insights
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { _AlertCircle, RefreshCw, _TrendingUp, _TrendingDown, Activity, _BarChart3, PieChart as _PieChartIcon, Download } from 'lucide-react'
import ValidationChart from './components/ValidationChart'
import RealTimeMetrics from './components/RealTimeMetrics'
import ExportModal from './components/ExportModal'
import AlertsPanel from './components/AlertsPanel'
import NotificationCenter from './components/NotificationCenter'
import ExecutiveSummary from './components/ExecutiveSummary'
import InteractiveDataVisualizations from './components/InteractiveDataVisualizations'
import CriticalAlertsSystem from './components/CriticalAlertsSystem'

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

interface ValidationMetadata {
  validation_session_id: string
  calculation_methods: string[]
  data_sources: string[]
  statistical_confidence: number
  generated_at: string
}

interface DashboardData {
  summary: {
    total_sensors: number
    total_records: number
    analysis_period: string
    data_quality_score: number
    session_id: string
    validation_status: 'completed' | 'running' | 'failed'
  }
  key_insights: Insight[]
  business_impact_summary: {
    total_identified_savings: string
    immediate_actions_savings: string
    payback_period_range: string
    confidence_level: string
    validation_methodology: string
  }
}

interface ValidationResponse {
  success: boolean
  data: DashboardData
  metadata: ValidationMetadata
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [metadata, setMetadata] = useState<ValidationMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [dashboardView, setDashboardView] = useState<'executive' | 'detailed' | 'technical'>('executive')
  const [isMobile, setIsMobile] = useState(false)

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const url = forceRefresh ? '/api/validation?refresh=true' : '/api/validation'
      const response = await fetch(url)

      if (!response.ok) {
        // Fallback to original insights API if validation fails
        const fallbackResponse = await fetch('/api/insights')
        if (!fallbackResponse.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        const fallbackResult = await fallbackResponse.json()
        setData(fallbackResult.data)
        setMetadata(null)
        console.warn('Using fallback data - validation API unavailable')
        return
      }

      const result: ValidationResponse = await response.json()
      setData(result.data)
      setMetadata(result.metadata)
      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchDashboardData(true)
    }, 300000) // 5 minutes

    return () => clearInterval(interval)
  }, [autoRefresh, fetchDashboardData])

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh)
  }

  const handleExport = () => {
    setShowExportModal(true)
  }

  const _getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨'
      case 'warning': return '⚠️'
      default: return 'ℹ️'
    }
  }

  const _getSeverityColor = (severity: string) => {
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
            onClick={handleRefresh}
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
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div>
              <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                CU-BEMS Executive Dashboard
              </h1>
              <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
                Bangkok Building IoT Sensor Analysis
              </p>
            </div>

            {/* Dashboard View Selector */}
            <div className="flex items-center space-x-2">
              {['executive', 'detailed', 'technical'].map((view) => (
                <button
                  key={view}
                  onClick={() => setDashboardView(view as 'executive' | 'detailed' | 'technical')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium capitalize ${
                    dashboardView === view
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>

            <div className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:space-x-4 lg:space-y-0">
              {!isMobile && data && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Analysis Period: {data.summary.analysis_period}</p>
                  <p className="text-sm text-green-600">Data Quality: {data.summary.data_quality_score}%</p>
                  {metadata && (
                    <p className="text-xs text-purple-600">Session: {metadata.validation_session_id.slice(0, 8)}...</p>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 disabled:opacity-50"
                  title="Refresh data"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>

                {!isMobile && (
                  <button
                    onClick={toggleAutoRefresh}
                    className={`p-2 rounded-lg text-sm ${autoRefresh
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600'
                    }`}
                    title="Toggle auto-refresh"
                  >
                    <Activity className="h-4 w-4" />
                  </button>
                )}

                <button
                  onClick={handleExport}
                  className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-600"
                  title="Export data"
                >
                  <Download className="h-4 w-4" />
                </button>

                <NotificationCenter sessionId={data?.summary.session_id} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Mobile Status Info */}
        {isMobile && data && (
          <div className="bg-white rounded-lg border p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500">Data Quality</p>
                <p className="text-sm font-semibold text-green-600">{data.summary.data_quality_score}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Records</p>
                <p className="text-sm font-semibold text-blue-600">
                  {(data.summary.total_records / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard View Content */}
        {dashboardView === 'executive' && (
          <ExecutiveSummary
            sessionId={data?.summary.session_id}
            refreshInterval={60000}
            onPersonalizationChange={(preferences) => {
              console.log('Personalization updated:', preferences)
            }}
          />
        )}

        {dashboardView === 'detailed' && (
          <div className="space-y-8">
            {/* Status Banner */}
            {metadata && !isMobile && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Validated Analysis</p>
                      <p className="text-sm text-blue-700">
                        Using {metadata.calculation_methods.join(', ')} • {metadata.statistical_confidence}% confidence
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-blue-600">Last Updated</p>
                    <p className="text-xs text-blue-500">
                      {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Data Visualizations */}
            <InteractiveDataVisualizations
              sessionId={data?.summary.session_id}
              refreshInterval={30000}
              height={isMobile ? 300 : 400}
            />

            {/* Critical Alerts System */}
            <CriticalAlertsSystem
              sessionId={data?.summary.session_id}
              refreshInterval={15000}
              maxDisplayAlerts={isMobile ? 5 : 10}
              showSoundControls={!isMobile}
            />
          </div>
        )}

        {dashboardView === 'technical' && (
          <div className="space-y-8">
            {/* Executive Summary Cards */}
            <div className={`grid gap-6 mb-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Sensors</h3>
                <p className={`font-bold text-blue-600 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>{data.summary.total_sensors}</p>
                <p className="text-xs text-gray-500 mt-1">Across 7 floors</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Records</h3>
                <p className={`font-bold text-green-600 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                  {(data.summary.total_records / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-gray-500 mt-1">Sensor readings analyzed</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Savings Identified</h3>
                <p className={`font-bold text-green-600 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                  {data.business_impact_summary.total_identified_savings}
                </p>
                <p className="text-xs text-gray-500 mt-1">Annual potential</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Quick Wins</h3>
                <p className={`font-bold text-orange-600 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                  {data.business_impact_summary.immediate_actions_savings}
                </p>
                <p className="text-xs text-gray-500 mt-1">Immediate actions</p>
              </div>
            </div>

            {/* Technical Components */}
            <div className={`grid gap-6 mb-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-3'}`}>
              <div className={isMobile ? '' : 'xl:col-span-2'}>
                <RealTimeMetrics
                  sessionId={data.summary.session_id}
                  refreshInterval={30000}
                />
              </div>
              <div>
                <AlertsPanel
                  sessionId={data.summary.session_id}
                  refreshInterval={60000}
                />
              </div>
            </div>

            {/* Validation Charts */}
            <div className={`grid gap-6 mb-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
              <ValidationChart
                data={data.key_insights}
                type="confidence"
                title="Confidence Levels by Insight"
                height={isMobile ? 250 : 300}
              />

              <ValidationChart
                data={data.key_insights}
                type="savings"
                title="Potential Savings by Category"
                height={isMobile ? 250 : 300}
              />
            </div>
          </div>
        )}

        {/* End of Dashboard Views */}

      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        sessionId={data?.summary.session_id}
      />
    </div>
  )
}