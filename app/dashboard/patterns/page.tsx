/**
 * Pattern Detection Dashboard
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Real-time anomaly detection and maintenance recommendations
 * for Bangkok IoT dataset with 134 sensors
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Activity, Settings, RefreshCw, Download } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PatternDetectionWidget } from '@/components/patterns/PatternDetectionWidget'
import { PatternSummaryCards } from '@/components/patterns/PatternSummaryCards'
import { RecommendationsPanel } from '@/components/patterns/RecommendationsPanel'
import { PatternHistoryTable } from '@/components/patterns/PatternHistoryTable'
import { PatternVisualization } from '@/components/patterns/PatternVisualization'
import { PatternConfigModal } from '@/components/patterns/PatternConfigModal'
import type {
  DetectedPattern,
  PatternDetectionRequest,
  PatternSummary,
  TimeWindow,
  PatternSeverity,
  PatternType
} from '@/types/patterns'

interface PatternDashboardState {
  patterns: DetectedPattern[]
  summary: PatternSummary | null
  loading: boolean
  error: string | null
  lastUpdated: string | null
  autoRefresh: boolean
  refreshInterval: number
}

export default function PatternDetectionDashboard() {
  const [state, setState] = useState<PatternDashboardState>({
    patterns: [],
    summary: null,
    loading: false,
    error: null,
    lastUpdated: null,
    autoRefresh: true,
    refreshInterval: 300000 // 5 minutes
  })

  const [filters, setFilters] = useState({
    timeWindow: '24h' as TimeWindow,
    severityFilter: [] as PatternSeverity[],
    patternTypes: [] as PatternType[],
    confidenceThreshold: 70,
    selectedSensors: [] as string[]
  })

  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [selectedPattern, setSelectedPattern] = useState<DetectedPattern | null>(null)

  // Detect patterns with current filters
  const detectPatterns = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const request: PatternDetectionRequest = {
        sensor_ids: filters.selectedSensors.length > 0 ? filters.selectedSensors : ['all'],
        time_window: filters.timeWindow,
        severity_filter: filters.severityFilter.length > 0 ? filters.severityFilter : undefined,
        confidence_threshold: filters.confidenceThreshold,
        pattern_types: filters.patternTypes.length > 0 ? filters.patternTypes : undefined,
        include_recommendations: true
      }

      const response = await fetch('/api/patterns/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to detect patterns')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Pattern detection failed')
      }

      setState(prev => ({
        ...prev,
        patterns: result.data.patterns,
        summary: result.data.summary,
        loading: false,
        lastUpdated: new Date().toISOString(),
        error: null
      }))

    } catch (error) {
      console.error('Pattern detection error:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }))
    }
  }, [filters])

  // Auto-refresh functionality
  useEffect(() => {
    if (state.autoRefresh && state.refreshInterval > 0) {
      const interval = setInterval(detectPatterns, state.refreshInterval)
      return () => clearInterval(interval)
    }
  }, [state.autoRefresh, state.refreshInterval, detectPatterns])

  // Initial load
  useEffect(() => {
    detectPatterns()
  }, [detectPatterns]) // Include detectPatterns in dependencies

  // Handle pattern acknowledgment
  const handlePatternAcknowledgment = async (patternId: string, notes?: string, actionPlanned?: string) => {
    try {
      const response = await fetch('/api/patterns/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern_id: patternId,
          notes,
          action_planned: actionPlanned
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to acknowledge pattern')
      }

      // Refresh patterns after acknowledgment
      await detectPatterns()

    } catch (error) {
      console.error('Pattern acknowledgment error:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to acknowledge pattern'
      }))
    }
  }

  // Export patterns data
  const exportPatterns = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      summary: state.summary,
      patterns: state.patterns,
      filters: filters
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pattern-analysis-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const _getSeverityColor = (severity: PatternSeverity) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'warning': return 'default'
      case 'info': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pattern Detection</h1>
          <p className="text-muted-foreground">
            AI-powered anomaly detection and predictive maintenance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportPatterns}
            disabled={state.patterns.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigModalOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>

          <Button
            onClick={detectPatterns}
            disabled={state.loading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
            {state.loading ? 'Analyzing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">
                {state.patterns.length} patterns detected
              </span>
            </div>

            {state.lastUpdated && (
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date(state.lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={filters.timeWindow} onValueChange={(value: TimeWindow) =>
              setFilters(prev => ({ ...prev, timeWindow: value }))
            }>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="6h">6 Hours</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Badge variant={state.autoRefresh ? 'default' : 'secondary'}>
              Auto-refresh {state.autoRefresh ? 'ON' : 'OFF'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {state.error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 p-4">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{state.error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, error: null }))}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {state.summary && (
        <PatternSummaryCards summary={state.summary} />
      )}

      {/* Main Content */}
      <Tabs defaultValue="live" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live">Live Detection</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="visualization">Visualization</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <PatternDetectionWidget
            patterns={state.patterns}
            onPatternSelect={setSelectedPattern}
            onAcknowledge={handlePatternAcknowledgment}
            loading={state.loading}
          />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <RecommendationsPanel
            patterns={state.patterns}
            onImplementRecommendation={(patternId, recommendationId) => {
              console.log('Implementing recommendation:', { patternId, recommendationId })
            }}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <PatternHistoryTable
            timeWindow={filters.timeWindow}
            severityFilter={filters.severityFilter}
          />
        </TabsContent>

        <TabsContent value="visualization" className="space-y-4">
          <PatternVisualization
            patterns={state.patterns}
            selectedPattern={selectedPattern}
            onPatternSelect={setSelectedPattern}
          />
        </TabsContent>
      </Tabs>

      {/* Configuration Modal */}
      <PatternConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        filters={filters}
        onFiltersChange={(newFilters) => setFilters(newFilters)}
        autoRefresh={state.autoRefresh}
        refreshInterval={state.refreshInterval}
        onAutoRefreshChange={(enabled) =>
          setState(prev => ({ ...prev, autoRefresh: enabled }))
        }
        onRefreshIntervalChange={(interval) =>
          setState(prev => ({ ...prev, refreshInterval: interval }))
        }
      />
    </div>
  )
}