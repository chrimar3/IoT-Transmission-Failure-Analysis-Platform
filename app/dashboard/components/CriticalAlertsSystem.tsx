'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Zap,
  AlertCircle,
  Info,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  DollarSign,
  Settings,
  Filter as _Filter,
  Search,
  ArrowUp,
  ArrowDown,
  Pause,
  Play,
  Volume2,
  VolumeX,
  MapPin,
  Users as _Users,
  Calendar as _Calendar,
  RefreshCw
} from 'lucide-react'

interface CriticalAlert {
  id: string
  type: 'performance' | 'efficiency' | 'maintenance' | 'financial' | 'safety' | 'security'
  severity: 'info' | 'warning' | 'critical' | 'emergency'
  priority: 1 | 2 | 3 | 4 | 5
  title: string
  message: string
  description: string
  location: string
  affected_systems: string[]
  metric_value?: number
  threshold_value?: number
  confidence_level: number
  business_impact: string
  recommended_actions: string[]
  estimated_cost: number
  time_to_resolution: string
  created_at: string
  acknowledged_at?: string
  resolved_at?: string
  acknowledged_by?: string
  resolved_by?: string
  tags: string[]
  attachments?: string[]
  escalation_level: number
  auto_resolve: boolean
}

interface AlertStatistics {
  total_active: number
  by_severity: {
    emergency: number
    critical: number
    warning: number
    info: number
  }
  by_type: {
    [key: string]: number
  }
  average_resolution_time: number
  acknowledgment_rate: number
  escalated_count: number
}

interface AlertPreferences {
  sound_enabled: boolean
  desktop_notifications: boolean
  email_notifications: boolean
  sms_notifications: boolean
  auto_acknowledge_timeout: number
  severity_filter: string[]
  type_filter: string[]
  location_filter: string[]
}

interface CriticalAlertsSystemProps {
  sessionId?: string
  refreshInterval?: number
  maxDisplayAlerts?: number
  showSoundControls?: boolean
  onAlertAction?: (action: string, alertId: string) => void
}

export default function CriticalAlertsSystem({
  sessionId,
  refreshInterval = 15000, // 15 seconds for critical alerts
  maxDisplayAlerts = 10,
  showSoundControls = true,
  onAlertAction
}: CriticalAlertsSystemProps) {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([])
  const [statistics, setStatistics] = useState<AlertStatistics | null>(null)
  const [preferences, setPreferences] = useState<AlertPreferences>({
    sound_enabled: true,
    desktop_notifications: true,
    email_notifications: false,
    sms_notifications: false,
    auto_acknowledge_timeout: 300, // 5 minutes
    severity_filter: ['emergency', 'critical', 'warning', 'info'],
    type_filter: [],
    location_filter: []
  })
  const [loading, setLoading] = useState(true)
  const [paused, setPaused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'created_at' | 'severity' | 'priority'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedAlert, setSelectedAlert] = useState<CriticalAlert | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [newAlertsCount, setNewAlertsCount] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousAlertsRef = useRef<CriticalAlert[]>([])


  useEffect(() => {
    // Initialize audio for alert sounds
    audioRef.current = new Audio('/sounds/alert.mp3') // Assuming alert sound file exists
    audioRef.current.volume = 0.5
  }, [])


  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: maxDisplayAlerts.toString(),
        severity: preferences.severity_filter.join(','),
        include_resolved: 'false'
      })
      if (sessionId) params.set('session_id', sessionId)
      if (preferences.type_filter.length > 0) {
        params.set('type', preferences.type_filter.join(','))
      }

      const response = await fetch(`/api/alerts/critical?${params}`)
      if (!response.ok) {
        // Generate mock critical alerts for demonstration
        const mockData = generateMockCriticalAlerts()
        setAlerts(mockData.alerts)
        setStatistics(mockData.statistics)
        setLastUpdate(new Date())
        setLoading(false)
        return
      }

      const result = await response.json()
      setAlerts(result.data.alerts)
      setStatistics(result.data.statistics)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching critical alerts:', error)
      const mockData = generateMockCriticalAlerts()
      setAlerts(mockData.alerts)
      setStatistics(mockData.statistics)
      setLastUpdate(new Date())
    } finally {
      setLoading(false)
    }
  }, [maxDisplayAlerts, preferences.severity_filter, preferences.type_filter, sessionId])

  useEffect(() => {
    if (!paused) {
      fetchAlerts()
      const interval = setInterval(fetchAlerts, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchAlerts, refreshInterval, paused])

  const playAlertSound = useCallback(() => {
    if (audioRef.current && preferences.sound_enabled) {
      audioRef.current.play().catch(e => console.log('Could not play alert sound:', e))
    }
  }, [preferences.sound_enabled])

  useEffect(() => {
    // Check for new critical alerts and play sound if enabled
    if (preferences.sound_enabled && previousAlertsRef.current.length > 0) {
      const newCriticalAlerts = alerts.filter(alert =>
        (alert.severity === 'emergency' || alert.severity === 'critical') &&
        !previousAlertsRef.current.some(prev => prev.id === alert.id)
      )

      if (newCriticalAlerts.length > 0) {
        setNewAlertsCount(prev => prev + newCriticalAlerts.length)
        playAlertSound()

        // Show desktop notification if enabled
        if (preferences.desktop_notifications && 'Notification' in window) {
          newCriticalAlerts.forEach(alert => {
            new Notification(`Critical Alert: ${alert.title}`, {
              body: alert.message,
              icon: '/favicon.ico'
            })
          })
        }
      }
    }
    previousAlertsRef.current = alerts
  }, [alerts, preferences.sound_enabled, preferences.desktop_notifications, playAlertSound])

  const handleAlertAction = async (action: 'acknowledge' | 'resolve' | 'escalate', alert: CriticalAlert) => {
    try {
      const response = await fetch('/api/alerts/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          alert_id: alert.id,
          user_id: 'current_user',
          timestamp: new Date().toISOString()
        })
      })

      if (response.ok) {
        setAlerts(prev => prev.map(a =>
          a.id === alert.id
            ? {
                ...a,
                ...(action === 'acknowledge' && { acknowledged_at: new Date().toISOString(), acknowledged_by: 'current_user' }),
                ...(action === 'resolve' && { resolved_at: new Date().toISOString(), resolved_by: 'current_user' }),
                ...(action === 'escalate' && { escalation_level: a.escalation_level + 1 })
              }
            : a
        ))

        if (onAlertAction) {
          onAlertAction(action, alert.id)
        }
      }
    } catch (error) {
      console.error(`Error ${action}ing alert:`, error)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'emergency': return <Zap className="h-4 w-4 text-red-600 animate-pulse" />
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'info': return <Info className="h-4 w-4 text-blue-500" />
      default: return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return 'border-red-600 bg-red-50 shadow-lg'
      case 'critical': return 'border-red-500 bg-red-50'
      case 'warning': return 'border-yellow-500 bg-yellow-50'
      case 'info': return 'border-blue-500 bg-blue-50'
      default: return 'border-gray-300 bg-white'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'efficiency': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'maintenance': return <Settings className="h-4 w-4 text-orange-500" />
      case 'financial': return <DollarSign className="h-4 w-4 text-blue-500" />
      case 'safety': return <Shield className="h-4 w-4 text-red-600" />
      case 'security': return <Shield className="h-4 w-4 text-purple-600" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const filteredAndSortedAlerts = alerts
    .filter(alert =>
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.location.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'severity':
          const severityOrder = { emergency: 4, critical: 3, warning: 2, info: 1 }
          comparison = severityOrder[b.severity] - severityOrder[a.severity]
          break
        case 'priority':
          comparison = b.priority - a.priority
          break
        case 'created_at':
        default:
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }

      return sortOrder === 'desc' ? comparison : -comparison
    })

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Critical Alerts System</h3>
          <Bell className="h-5 w-5 text-gray-400 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bell className="h-6 w-6 text-red-500" />
              {newAlertsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {newAlertsCount}
                </span>
              )}
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Critical Alerts System</h3>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>Bangkok CU-BEMS</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Sound Controls */}
            {showSoundControls && (
              <button
                onClick={() => setPreferences(prev => ({ ...prev, sound_enabled: !prev.sound_enabled }))}
                className={`p-2 rounded-lg ${preferences.sound_enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}
                title="Toggle alert sounds"
              >
                {preferences.sound_enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            )}

            {/* Pause/Resume */}
            <button
              onClick={() => setPaused(!paused)}
              className={`p-2 rounded-lg ${paused ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}
              title={paused ? 'Resume monitoring' : 'Pause monitoring'}
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
              title="Alert settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Refresh */}
            <button
              onClick={fetchAlerts}
              className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600"
              title="Refresh alerts"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-red-600">
                {statistics.by_severity.emergency + statistics.by_severity.critical}
              </div>
              <div className="text-sm text-red-700">Critical & Emergency</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-yellow-600">{statistics.by_severity.warning}</div>
              <div className="text-sm text-yellow-700">Warning</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-blue-600">{statistics.total_active}</div>
              <div className="text-sm text-blue-700">Total Active</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-purple-600">{statistics.escalated_count}</div>
              <div className="text-sm text-purple-700">Escalated</div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg w-full text-sm"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'created_at' | 'severity' | 'priority')}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="created_at">Time</option>
              <option value="severity">Severity</option>
              <option value="priority">Priority</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="p-2 border rounded-lg hover:bg-gray-50"
            >
              {sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </div>

          {/* Clear New Alerts Counter */}
          {newAlertsCount > 0 && (
            <button
              onClick={() => setNewAlertsCount(0)}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Clear {newAlertsCount} New
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-6 border-b bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-4">Alert Preferences</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notification Settings</label>
              <div className="space-y-2">
                {[
                  { key: 'sound_enabled', label: 'Sound Alerts' },
                  { key: 'desktop_notifications', label: 'Desktop Notifications' },
                  { key: 'email_notifications', label: 'Email Notifications' },
                  { key: 'sms_notifications', label: 'SMS Notifications' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences[key as keyof AlertPreferences] as boolean}
                      onChange={(e) => setPreferences(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-600">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity Filter</label>
              <div className="space-y-2">
                {['emergency', 'critical', 'warning', 'info'].map(severity => (
                  <label key={severity} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.severity_filter.includes(severity)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPreferences(prev => ({
                            ...prev,
                            severity_filter: [...prev.severity_filter, severity]
                          }))
                        } else {
                          setPreferences(prev => ({
                            ...prev,
                            severity_filter: prev.severity_filter.filter(s => s !== severity)
                          }))
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-600 capitalize">{severity}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredAndSortedAlerts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No critical alerts at this time</p>
            <p className="text-sm">All systems operating normally</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredAndSortedAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer border-l-4 ${getSeverityColor(alert.severity)}`}
                onClick={() => setSelectedAlert(selectedAlert?.id === alert.id ? null : alert)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getSeverityIcon(alert.severity)}
                      {getTypeIcon(alert.type)}
                      <span className="font-medium text-gray-900">{alert.title}</span>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        Priority {alert.priority}
                      </span>
                      {alert.escalation_level > 0 && (
                        <span className="text-xs bg-red-200 text-red-700 px-2 py-1 rounded">
                          Escalated L{alert.escalation_level}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mb-2">{alert.message}</p>

                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{alert.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(alert.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Shield className="h-3 w-3" />
                        <span>{alert.confidence_level}% confidence</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1 ml-4">
                    {!alert.acknowledged_at && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAlertAction('acknowledge', alert)
                        }}
                        className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1 rounded"
                      >
                        Acknowledge
                      </button>
                    )}
                    {!alert.resolved_at && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAlertAction('resolve', alert)
                        }}
                        className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded"
                      >
                        Resolve
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAlertAction('escalate', alert)
                      }}
                      className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded"
                    >
                      Escalate
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedAlert?.id === alert.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-1">Description</h5>
                      <p className="text-sm text-gray-700">{alert.description}</p>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 mb-1">Business Impact</h5>
                      <p className="text-sm text-gray-700">{alert.business_impact}</p>
                      <p className="text-sm text-red-600 font-medium mt-1">
                        Estimated Cost: ${alert.estimated_cost.toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 mb-1">Recommended Actions</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {alert.recommended_actions.map((action, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <span>Affected Systems: {alert.affected_systems.join(', ')}</span>
                      <span>Est. Resolution: {alert.time_to_resolution}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${paused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`}></div>
              <span>{paused ? 'Paused' : 'Live Monitoring'}</span>
            </div>
            <span>Last updated: {lastUpdate?.toLocaleTimeString() || 'Never'}</span>
          </div>
          <div className="flex items-center space-x-4">
            {statistics && (
              <>
                <span>Avg Resolution: {statistics.average_resolution_time}min</span>
                <span>Ack Rate: {statistics.acknowledgment_rate}%</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Generate mock critical alerts for demonstration
 */
function generateMockCriticalAlerts() {
  const now = new Date()

  const alerts: CriticalAlert[] = [
    {
      id: 'alert_001',
      type: 'performance',
      severity: 'critical',
      priority: 4,
      title: 'HVAC System Performance Critical',
      message: 'HVAC efficiency dropped below 75% threshold on Floor 5',
      description: 'The HVAC system on Floor 5 is operating at 68% efficiency, significantly below the critical threshold of 75%. This indicates potential equipment failure or maintenance issues.',
      location: 'Floor 5 - Zone A',
      affected_systems: ['HVAC', 'Temperature Control', 'Air Quality'],
      metric_value: 68,
      threshold_value: 75,
      confidence_level: 96,
      business_impact: 'Increased energy costs and potential occupant discomfort. Risk of equipment damage.',
      recommended_actions: [
        'Inspect HVAC filters immediately',
        'Check refrigerant levels',
        'Verify thermostat calibration',
        'Schedule emergency maintenance'
      ],
      estimated_cost: 15000,
      time_to_resolution: '2-4 hours',
      created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      tags: ['hvac', 'efficiency', 'floor5'],
      escalation_level: 1,
      auto_resolve: false
    },
    {
      id: 'alert_002',
      type: 'safety',
      severity: 'emergency',
      priority: 5,
      title: 'Fire Safety System Malfunction',
      message: 'Fire suppression system offline in critical areas',
      description: 'The fire suppression system has gone offline in the server room and electrical panels area. This creates an immediate safety risk.',
      location: 'Ground Floor - Server Room',
      affected_systems: ['Fire Suppression', 'Safety Systems', 'Emergency Response'],
      confidence_level: 99,
      business_impact: 'Critical safety risk. Potential fire damage could exceed $500K. Regulatory compliance violations.',
      recommended_actions: [
        'Evacuate affected areas immediately',
        'Contact fire department for inspection',
        'Deploy manual fire suppression equipment',
        'Activate emergency protocols'
      ],
      estimated_cost: 500000,
      time_to_resolution: 'Immediate - 1 hour',
      created_at: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      tags: ['fire', 'safety', 'emergency'],
      escalation_level: 2,
      auto_resolve: false
    },
    {
      id: 'alert_003',
      type: 'efficiency',
      severity: 'warning',
      priority: 2,
      title: 'Energy Consumption Spike Detected',
      message: 'Unusual energy consumption pattern detected',
      description: 'Energy consumption has increased by 35% compared to baseline without corresponding occupancy increase.',
      location: 'Floor 3 - East Wing',
      affected_systems: ['Lighting', 'HVAC', 'Power Management'],
      metric_value: 135,
      threshold_value: 110,
      confidence_level: 87,
      business_impact: 'Estimated $8,000 monthly cost increase if pattern continues.',
      recommended_actions: [
        'Audit lighting systems for malfunctions',
        'Check HVAC scheduling',
        'Review power management settings',
        'Investigate equipment anomalies'
      ],
      estimated_cost: 8000,
      time_to_resolution: '4-8 hours',
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      tags: ['energy', 'efficiency', 'cost'],
      escalation_level: 0,
      auto_resolve: true
    }
  ]

  const statistics: AlertStatistics = {
    total_active: 12,
    by_severity: {
      emergency: 1,
      critical: 2,
      warning: 5,
      info: 4
    },
    by_type: {
      performance: 3,
      safety: 1,
      efficiency: 4,
      maintenance: 2,
      financial: 1,
      security: 1
    },
    average_resolution_time: 145,
    acknowledgment_rate: 87,
    escalated_count: 3
  }

  return { alerts, statistics }
}