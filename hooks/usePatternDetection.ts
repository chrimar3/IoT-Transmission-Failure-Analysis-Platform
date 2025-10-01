'use client'

/**
 * Pattern Detection Hook
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Custom hook for managing pattern detection state, API calls, and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  DetectedPattern,
  PatternSummary,
  PatternDetectionRequest,
  PatternDetectionResponse,
  TimeWindow,
  PatternSeverity,
  PatternType,
  AnalysisMetadata
} from '@/types/patterns'

interface UsePatternDetectionOptions {
  sensors: string[]
  timeWindow: TimeWindow
  severityFilter?: PatternSeverity[]
  patternTypeFilter?: PatternType[]
  confidenceThreshold?: number
  autoRefresh?: boolean
  refreshInterval?: number
  includeRecommendations?: boolean
}

interface UsePatternDetectionReturn {
  // Data
  patterns: DetectedPattern[]
  summary: PatternSummary | null
  analysisMetadata: AnalysisMetadata | null

  // State
  isLoading: boolean
  error: string | null
  lastUpdated: string | null

  // Actions
  detectPatterns: () => Promise<void>
  acknowledgePattern: (patternId: string, notes?: string) => Promise<void>
  clearError: () => void

  // Configuration
  updateConfig: (options: Partial<UsePatternDetectionOptions>) => void
}

export function usePatternDetection(options: UsePatternDetectionOptions): UsePatternDetectionReturn {
  const {
    sensors,
    timeWindow,
    severityFilter = [],
    patternTypeFilter = [],
    confidenceThreshold = 70,
    autoRefresh = true,
    refreshInterval = 30000,
    includeRecommendations = true
  } = options

  // State
  const [patterns, setPatterns] = useState<DetectedPattern[]>([])
  const [summary, setSummary] = useState<PatternSummary | null>(null)
  const [analysisMetadata, setAnalysisMetadata] = useState<AnalysisMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  // Refs for managing intervals and preventing memory leaks
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null)
  const abortController = useRef<AbortController | null>(null)

  // Pattern detection API call
  const detectPatterns = useCallback(async () => {
    if (sensors.length === 0) {
      setError('No sensors selected')
      return
    }

    setIsLoading(true)
    setError(null)

    // Cancel previous request if still pending
    if (abortController.current) {
      abortController.current.abort()
    }
    abortController.current = new AbortController()

    try {
      const request: PatternDetectionRequest = {
        sensor_ids: sensors,
        time_window: timeWindow,
        severity_filter: severityFilter.length > 0 ? severityFilter : undefined,
        pattern_types: patternTypeFilter.length > 0 ? patternTypeFilter : undefined,
        confidence_threshold: confidenceThreshold,
        include_recommendations: includeRecommendations
      }

      const response = await fetch('/api/patterns/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: abortController.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data: PatternDetectionResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Pattern detection failed')
      }

      // Update state with new data
      setPatterns(data.data.patterns)
      setSummary(data.data.summary)
      setAnalysisMetadata(data.data.analysis_metadata)
      setLastUpdated(new Date().toISOString())

      // Log successful detection for debugging
      console.log('Pattern detection completed:', {
        patterns: data.data.patterns.length,
        criticalCount: data.data.patterns.filter(p => p.severity === 'critical').length,
        processingTime: data.data.analysis_metadata.analysis_duration_ms
      })

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Pattern detection request cancelled')
          return
        }
        setError(error.message)
      } else {
        setError('An unexpected error occurred during pattern detection')
      }
      console.error('Pattern detection failed:', error)
    } finally {
      setIsLoading(false)
      abortController.current = null
    }
  }, [
    sensors,
    timeWindow,
    severityFilter,
    patternTypeFilter,
    confidenceThreshold,
    includeRecommendations
  ])

  // Pattern acknowledgment
  const acknowledgePattern = useCallback(async (patternId: string, notes?: string) => {
    try {
      const response = await fetch('/api/patterns/acknowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pattern_id: patternId,
          notes
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to acknowledge pattern')
      }

      // Update pattern acknowledgment in state
      setPatterns(prevPatterns =>
        prevPatterns.map(pattern =>
          pattern.id === patternId
            ? {
                ...pattern,
                acknowledged: true,
                acknowledged_at: new Date().toISOString()
              }
            : pattern
        )
      )

      console.log('Pattern acknowledged:', patternId)
    } catch (error) {
      console.error('Failed to acknowledge pattern:', error)
      if (error instanceof Error) {
        setError(error.message)
      }
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Update configuration
  const updateConfig = useCallback((newOptions: Partial<UsePatternDetectionOptions>) => {
    // This will trigger useEffect to re-run detection with new config
    console.log('Pattern detection config updated:', newOptions)
  }, [])

  // Auto-refresh setup
  useEffect(() => {
    // Clear existing interval
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current)
    }

    // Set up auto-refresh if enabled
    if (autoRefresh && refreshInterval > 0) {
      autoRefreshInterval.current = setInterval(() => {
        detectPatterns()
      }, refreshInterval)
    }

    // Cleanup function
    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current)
      }
    }
  }, [autoRefresh, refreshInterval, detectPatterns])

  // Initial pattern detection on mount or config change
  useEffect(() => {
    detectPatterns()
  }, [
    sensors,
    timeWindow,
    severityFilter,
    patternTypeFilter,
    confidenceThreshold
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending requests
      if (abortController.current) {
        abortController.current.abort()
      }

      // Clear intervals
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current)
      }
    }
  }, [])

  return {
    // Data
    patterns,
    summary,
    analysisMetadata,

    // State
    isLoading,
    error,
    lastUpdated,

    // Actions
    detectPatterns,
    acknowledgePattern,
    clearError,

    // Configuration
    updateConfig
  }
}

// Utility hook for pattern statistics
export function usePatternStatistics(patterns: DetectedPattern[]) {
  return {
    totalCount: patterns.length,
    criticalCount: patterns.filter(p => p.severity === 'critical').length,
    warningCount: patterns.filter(p => p.severity === 'warning').length,
    infoCount: patterns.filter(p => p.severity === 'info').length,
    acknowledgedCount: patterns.filter(p => p.acknowledged).length,
    unacknowledgedCount: patterns.filter(p => !p.acknowledged).length,
    averageConfidence: patterns.length > 0
      ? Math.round(patterns.reduce((sum, p) => sum + p.confidence_score, 0) / patterns.length)
      : 0,
    patternTypes: [...new Set(patterns.map(p => p.pattern_type))],
    equipmentTypes: [...new Set(patterns.map(p => p.equipment_type))],
    floorNumbers: [...new Set(patterns.map(p => p.floor_number))].sort()
  }
}

// Hook for filtering patterns
export function usePatternFilters() {
  const [severityFilter, setSeverityFilter] = useState<PatternSeverity[]>([])
  const [typeFilter, setTypeFilter] = useState<PatternType[]>([])
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0)
  const [equipmentFilter, setEquipmentFilter] = useState<string[]>([])
  const [floorFilter, setFloorFilter] = useState<number[]>([])

  const applyFilters = useCallback((patterns: DetectedPattern[]) => {
    return patterns.filter(pattern => {
      const severityMatch = severityFilter.length === 0 || severityFilter.includes(pattern.severity)
      const typeMatch = typeFilter.length === 0 || typeFilter.includes(pattern.pattern_type)
      const confidenceMatch = pattern.confidence_score >= confidenceFilter
      const equipmentMatch = equipmentFilter.length === 0 || equipmentFilter.includes(pattern.equipment_type)
      const floorMatch = floorFilter.length === 0 || floorFilter.includes(pattern.floor_number)

      return severityMatch && typeMatch && confidenceMatch && equipmentMatch && floorMatch
    })
  }, [severityFilter, typeFilter, confidenceFilter, equipmentFilter, floorFilter])

  const clearFilters = useCallback(() => {
    setSeverityFilter([])
    setTypeFilter([])
    setConfidenceFilter(0)
    setEquipmentFilter([])
    setFloorFilter([])
  }, [])

  return {
    filters: {
      severity: severityFilter,
      type: typeFilter,
      confidence: confidenceFilter,
      equipment: equipmentFilter,
      floor: floorFilter
    },
    setFilters: {
      setSeverityFilter,
      setTypeFilter,
      setConfidenceFilter,
      setEquipmentFilter,
      setFloorFilter
    },
    applyFilters,
    clearFilters
  }
}