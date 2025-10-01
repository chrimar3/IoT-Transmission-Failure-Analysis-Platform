'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, CheckCircle, Clock, Bell, Info, AlertCircle, Zap } from 'lucide-react'

interface Alert {
  id: string
  type: 'performance' | 'efficiency' | 'maintenance' | 'financial' | 'quality'
  severity: 'info' | 'warning' | 'critical' | 'emergency'
  title: string
  message: string
  source: string
  metric_value?: number
  threshold_value?: number
  confidence_level: number
  recommended_action: string
  estimated_impact: string
  created_at: string
  acknowledged: boolean
  resolved: boolean
  session_id?: string
}

interface AlertStatistics {
  total: number
  by_severity: {
    emergency: number
    critical: number
    warning: number
    info: number
  }
  unresolved: number
  critical_count: number
}

interface AlertsPanelProps {
  sessionId?: string
  refreshInterval?: number
}

export default function AlertsPanel({ sessionId: _sessionId, refreshInterval = 60000 }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [statistics, setStatistics] = useState<AlertStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [showResolved, setShowResolved] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: '20'
      })

      if (selectedSeverity !== 'all') {
        params.set('severity', selectedSeverity)
      }

      if (showResolved) {
        params.set('resolved', 'true')
      }

      const response = await fetch(`/api/alerts?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }

      const data = await response.json()
      setAlerts(data.data.alerts)
      setStatistics(data.data.statistics)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching alerts:', error)
      // Show mock alerts for demo
      setAlerts(generateMockAlerts())
      setStatistics(generateMockStatistics())
      setLastUpdate(new Date())
    } finally {
      setLoading(false)
    }
  }, [selectedSeverity, showResolved])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchAlerts, refreshInterval])

  const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'acknowledge',
          alert_ids: [alertId],
          user_id: 'current_user'
        })
      })

      if (response.ok) {
        setAlerts(prevAlerts =>
          prevAlerts.map(alert =>
            alert.id === alertId ? { ...alert, acknowledged: true } : alert
          )
        )
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  const handleResolve = async (alertId: string) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'resolve',
          alert_ids: [alertId],
          user_id: 'current_user'
        })
      })

      if (response.ok) {
        setAlerts(prevAlerts =>
          prevAlerts.map(alert =>
            alert.id === alertId ? { ...alert, resolved: true, acknowledged: true } : alert
          )
        )
      }
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'emergency': return <Zap className="h-4 w-4 text-red-600" />
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'info': return <Info className="h-4 w-4 text-blue-500" />
      default: return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string, resolved: boolean = false) => {
    if (resolved) return 'border-gray-200 bg-gray-50'

    switch (severity) {
      case 'emergency': return 'border-red-500 bg-red-50'
      case 'critical': return 'border-red-400 bg-red-50'
      case 'warning': return 'border-yellow-400 bg-yellow-50'
      case 'info': return 'border-blue-400 bg-blue-50'
      default: return 'border-gray-300 bg-white'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'performance': return 'bg-red-100 text-red-700'
      case 'efficiency': return 'bg-green-100 text-green-700'
      case 'maintenance': return 'bg-orange-100 text-orange-700'
      case 'financial': return 'bg-blue-100 text-blue-700'
      case 'quality': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">System Alerts</h3>
          <Bell className="h-5 w-5 text-gray-400 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-3 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-900">System Alerts</h3>
          <Bell className="h-5 w-5 text-blue-500" />
          {statistics && statistics.critical_count > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
              {statistics.critical_count}
            </span>
          )}
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500">
            Last updated: {lastUpdate?.toLocaleTimeString() || 'Never'}
          </p>
          <div className="flex items-center space-x-1 mt-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-blue-600">Live</span>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{statistics.by_severity.emergency + statistics.by_severity.critical}</div>
            <div className="text-xs text-gray-600">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">{statistics.by_severity.warning}</div>
            <div className="text-xs text-gray-600">Warning</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{statistics.by_severity.info}</div>
            <div className="text-xs text-gray-600">Info</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-600">{statistics.unresolved}</div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-4">
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="all">All Severities</option>
          <option value="emergency">Emergency</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>

        <label className="flex items-center space-x-1 text-sm">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded"
          />
          <span>Show resolved</span>
        </label>
      </div>

      {/* Alerts List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No alerts to display</p>
            <p className="text-sm">System is operating normally</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 ${getSeverityColor(alert.severity, alert.resolved)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getSeverityIcon(alert.severity)}
                    <span className="font-medium text-gray-900">{alert.title}</span>
                    <span className={`text-xs px-2 py-1 rounded ${getTypeColor(alert.type)}`}>
                      {alert.type}
                    </span>
                    {alert.acknowledged && !alert.resolved && (
                      <Clock className="h-3 w-3 text-gray-500" />
                    )}
                    {alert.resolved && (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                  </div>

                  <p className="text-sm text-gray-700 mb-2">{alert.message}</p>

                  <div className="text-xs text-gray-600 space-y-1">
                    <p><span className="font-medium">Action:</span> {alert.recommended_action}</p>
                    <p><span className="font-medium">Impact:</span> {alert.estimated_impact}</p>
                    {alert.metric_value !== undefined && (
                      <p>
                        <span className="font-medium">Value:</span> {alert.metric_value}
                        {alert.threshold_value && ` (threshold: ${alert.threshold_value})`}
                      </p>
                    )}
                    <p><span className="font-medium">Confidence:</span> {alert.confidence_level}%</p>
                  </div>
                </div>

                {!alert.resolved && (
                  <div className="flex flex-col space-y-1 ml-4">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Source: {alert.source} • {new Date(alert.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * Mock data generators for demonstration
 */
function generateMockAlerts(): Alert[] {
  const now = new Date().toISOString()

  return [
    {
      id: 'mock_alert_1',
      type: 'performance',
      severity: 'warning',
      title: 'Efficiency Drop Detected',
      message: 'HVAC system efficiency has decreased by 8% in the last 24 hours',
      source: 'performance_monitor',
      metric_value: 82,
      threshold_value: 90,
      confidence_level: 94,
      recommended_action: 'Inspect HVAC filters and check for maintenance issues',
      estimated_impact: 'Potential $500-800 monthly cost increase',
      created_at: now,
      acknowledged: false,
      resolved: false
    },
    {
      id: 'mock_alert_2',
      type: 'financial',
      severity: 'info',
      title: 'High Savings Opportunity',
      message: 'Lighting optimization could yield significant savings',
      source: 'savings_calculator',
      metric_value: 125000,
      confidence_level: 89,
      recommended_action: 'Schedule LED upgrade project for Q2',
      estimated_impact: '$125,000 annual savings potential',
      created_at: now,
      acknowledged: true,
      resolved: false
    },
    {
      id: 'mock_alert_3',
      type: 'quality',
      severity: 'critical',
      title: 'Data Quality Issue',
      message: 'Multiple sensors on Floor 5 reporting inconsistent readings',
      source: 'data_quality_monitor',
      metric_value: 68,
      threshold_value: 95,
      confidence_level: 97,
      recommended_action: 'Immediate sensor calibration and network check required',
      estimated_impact: 'Reduced analysis reliability and decision accuracy',
      created_at: now,
      acknowledged: false,
      resolved: false
    }
  ]
}

function generateMockStatistics(): AlertStatistics {
  return {
    total: 12,
    by_severity: {
      emergency: 0,
      critical: 2,
      warning: 5,
      info: 5
    },
    unresolved: 8,
    critical_count: 2
  }
}