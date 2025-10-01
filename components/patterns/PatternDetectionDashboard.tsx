'use client'

/**
 * Pattern Detection Dashboard
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Main dashboard component that integrates all pattern detection features:
 * - Real-time anomaly monitoring
 * - Pattern visualizations
 * - Actionable recommendations
 * - Historical correlation analysis
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Settings,
  Bell,
  Filter,
  Eye,
  Clock
} from 'lucide-react'

// Import pattern detection components
import PatternSummaryCards from './PatternSummaryCards'
import PatternDetectionWidget from './PatternDetectionWidget'
import PatternVisualization from './PatternVisualization'
import RecommendationsPanel from './RecommendationsPanel'
import PatternHistoryTable from './PatternHistoryTable'
import PatternConfigModal from './PatternConfigModal'

// Import custom hooks for pattern detection
import { usePatternDetection } from '@/hooks/usePatternDetection'
import { useRealTimePatterns } from '@/hooks/useRealTimePatterns'

// Import types
import type {
  DetectedPattern,
  TimeWindow,
  PatternSeverity,
  PatternType
} from '@/types/patterns'

interface PatternDetectionDashboardProps {
  initialSensors?: string[]
  autoRefresh?: boolean
  refreshInterval?: number // milliseconds
}

export default function PatternDetectionDashboard({
  initialSensors = ['SENSOR_001', 'SENSOR_002', 'SENSOR_003'],
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: PatternDetectionDashboardProps) {
  // State management
  const [selectedSensors, setSelectedSensors] = useState<string[]>(initialSensors)
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h')
  const [severityFilter, setSeverityFilter] = useState<PatternSeverity[]>([])
  const [patternTypeFilter, setPatternTypeFilter] = useState<PatternType[]>([])
  const [confidenceThreshold, setConfidenceThreshold] = useState(70)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [alertsEnabled, setAlertsEnabled] = useState(true)

  // Pattern detection hook
  const {
    patterns,
    summary,
    isLoading,
    error,
    detectPatterns,
    acknowledgePattern,
    lastUpdated
  } = usePatternDetection({
    sensors: selectedSensors,
    timeWindow,
    severityFilter,
    patternTypeFilter,
    confidenceThreshold,
    autoRefresh,
    refreshInterval
  })

  // Real-time pattern updates
  const {
    newPatterns: _newPatterns,
    criticalAlerts: _criticalAlerts,
    clearAlert: _clearAlert
  } = useRealTimePatterns({
    enabled: alertsEnabled,
    sensors: selectedSensors,
    onNewCriticalPattern: (pattern) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Critical Pattern Detected', {
          body: `${pattern.equipment_type} on Floor ${pattern.floor_number}: ${pattern.description}`,
          icon: '/icon-warning.png'
        })
      }
    }
  })

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    detectPatterns()
  }, [detectPatterns])

  // Handle pattern acknowledgment
  const handlePatternAcknowledgment = useCallback(async (
    patternId: string,
    notes?: string
  ) => {
    try {
      await acknowledgePattern(patternId, notes)
    } catch (error) {
      console.error('Failed to acknowledge pattern:', error)
    }
  }, [acknowledgePattern])

  // Handle configuration changes
  const handleConfigChange = useCallback((config: {
    sensors: string[]
    timeWindow: TimeWindow
    severityFilter: PatternSeverity[]
    patternTypeFilter: PatternType[]
    confidenceThreshold: number
  }) => {
    setSelectedSensors(config.sensors)
    setTimeWindow(config.timeWindow)
    setSeverityFilter(config.severityFilter)
    setPatternTypeFilter(config.patternTypeFilter)
    setConfidenceThreshold(config.confidenceThreshold)
    setShowConfigModal(false)
  }, [])

  // Filter patterns based on current filters
  const filteredPatterns = patterns.filter(pattern => {
    const severityMatch = severityFilter.length === 0 || severityFilter.includes(pattern.severity)
    const typeMatch = patternTypeFilter.length === 0 || patternTypeFilter.includes(pattern.pattern_type)
    return severityMatch && typeMatch
  })

  // Count critical patterns requiring immediate attention
  const criticalPatternsCount = patterns.filter(p =>
    p.severity === 'critical' && !p.acknowledged
  ).length

  // Calculate pattern trends
  const patternTrends = {
    increasing: patterns.filter(p => p.pattern_type === 'trend' && p.metadata?.trend_direction === 'degrading').length,
    decreasing: patterns.filter(p => p.pattern_type === 'trend' && p.metadata?.trend_direction === 'improving').length,
    stable: patterns.filter(p => p.pattern_type === 'trend' && p.metadata?.trend_direction === 'stable').length
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Pattern Detection Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Advanced anomaly detection and predictive maintenance insights
            </p>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Header Controls */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAlertsEnabled(!alertsEnabled)}
              className={`flex items-center gap-2 ${alertsEnabled ? 'bg-blue-50 border-blue-200' : ''}`}
            >
              <Bell className="h-4 w-4" />
              {alertsEnabled ? 'Alerts On' : 'Alerts Off'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configure
            </Button>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {criticalPatternsCount > 0 && (
          <Alert className="mt-4 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>{criticalPatternsCount} critical pattern{criticalPatternsCount > 1 ? 's' : ''}</strong>
              {' '}require immediate attention. Review the recommendations below.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="mt-4 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Pattern Detection Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Summary Cards */}
      <div className="mb-8">
        <PatternSummaryCards
          summary={summary}
          trends={patternTrends}
          isLoading={isLoading}
        />
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="recommendations">Actions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Pattern Detection Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Real-time Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PatternDetectionWidget
                  sensors={selectedSensors}
                  timeWindow={timeWindow}
                  onPatternDetected={(patterns) => {
                    console.log('New patterns detected:', patterns)
                  }}
                />
              </CardContent>
            </Card>

            {/* Pattern Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Pattern Visualization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PatternVisualization
                  patterns={filteredPatterns}
                  timeRange={timeWindow}
                  showConfidenceBands={true}
                  interactive={true}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          {/* Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Pattern Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Severity Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Severity Level
                  </label>
                  <div className="flex gap-2">
                    {(['critical', 'warning', 'info'] as PatternSeverity[]).map(severity => (
                      <Badge
                        key={severity}
                        variant={severityFilter.includes(severity) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          setSeverityFilter(prev =>
                            prev.includes(severity)
                              ? prev.filter(s => s !== severity)
                              : [...prev, severity]
                          )
                        }}
                      >
                        {severity}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Pattern Type Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Pattern Type
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {(['anomaly', 'trend', 'correlation', 'seasonal'] as PatternType[]).map(type => (
                      <Badge
                        key={type}
                        variant={patternTypeFilter.includes(type) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          setPatternTypeFilter(prev =>
                            prev.includes(type)
                              ? prev.filter(t => t !== type)
                              : [...prev, type]
                          )
                        }}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Confidence Threshold */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Min Confidence: {confidenceThreshold}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patterns Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Detected Patterns ({filteredPatterns.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <PatternVisualization
                patterns={filteredPatterns}
                timeRange={timeWindow}
                showConfidenceBands={true}
                interactive={true}
                onPatternClick={(pattern) => {
                  console.log('Pattern clicked:', pattern)
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <RecommendationsPanel
            patterns={filteredPatterns}
            onAcknowledge={handlePatternAcknowledgment}
            showCostAnalysis={true}
            groupByPriority={true}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pattern History</CardTitle>
            </CardHeader>
            <CardContent>
              <PatternHistoryTable
                sensors={selectedSensors}
                timeRange={timeWindow}
                onPatternSelect={(pattern) => {
                  console.log('Historical pattern selected:', pattern)
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configuration Modal */}
      {showConfigModal && (
        <PatternConfigModal
          currentConfig={{
            sensors: selectedSensors,
            timeWindow,
            severityFilter,
            patternTypeFilter,
            confidenceThreshold
          }}
          availableSensors={[
            'SENSOR_001', 'SENSOR_002', 'SENSOR_003', 'SENSOR_004',
            'SENSOR_005', 'SENSOR_006', 'SENSOR_007', 'SENSOR_008'
          ]}
          onSave={handleConfigChange}
          onClose={() => setShowConfigModal(false)}
        />
      )}
    </div>
  )
}

// Export utility functions for testing
export const PatternDetectionDashboardUtils = {
  filterPatterns: (
    patterns: DetectedPattern[],
    severityFilter: PatternSeverity[],
    typeFilter: PatternType[]
  ) => {
    return patterns.filter(pattern => {
      const severityMatch = severityFilter.length === 0 || severityFilter.includes(pattern.severity)
      const typeMatch = typeFilter.length === 0 || typeFilter.includes(pattern.pattern_type)
      return severityMatch && typeMatch
    })
  },

  calculateTrends: (patterns: DetectedPattern[]) => {
    return {
      increasing: patterns.filter(p =>
        p.pattern_type === 'trend' && p.metadata?.trend_direction === 'degrading'
      ).length,
      decreasing: patterns.filter(p =>
        p.pattern_type === 'trend' && p.metadata?.trend_direction === 'improving'
      ).length,
      stable: patterns.filter(p =>
        p.pattern_type === 'trend' && p.metadata?.trend_direction === 'stable'
      ).length
    }
  },

  getCriticalPatternsCount: (patterns: DetectedPattern[]) => {
    return patterns.filter(p => p.severity === 'critical' && !p.acknowledged).length
  }
}