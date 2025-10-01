'use client'

/**
 * Real-time Pattern Updates Hook
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Custom hook for managing real-time pattern alerts and notifications
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { DetectedPattern, PatternAlert } from '@/types/patterns'

interface UseRealTimePatternsOptions {
  enabled: boolean
  sensors: string[]
  alertThreshold?: number // Confidence threshold for triggering alerts
  onNewPattern?: (pattern: DetectedPattern) => void
  onNewCriticalPattern?: (pattern: DetectedPattern) => void
  onNewAlert?: (alert: PatternAlert) => void
}

interface UseRealTimePatternsReturn {
  newPatterns: DetectedPattern[]
  criticalAlerts: PatternAlert[]
  isConnected: boolean
  lastHeartbeat: Date | null
  clearAlert: (alertId: string) => void
  clearAllAlerts: () => void
}

export function useRealTimePatterns(options: UseRealTimePatternsOptions): UseRealTimePatternsReturn {
  const {
    enabled,
    sensors,
    alertThreshold = 80,
    onNewPattern,
    onNewCriticalPattern,
    onNewAlert
  } = options

  // State
  const [newPatterns, setNewPatterns] = useState<DetectedPattern[]>([])
  const [criticalAlerts, setCriticalAlerts] = useState<PatternAlert[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null)

  // Refs for managing connections
  const eventSourceRef = useRef<EventSource | null>(null)
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  // Clear alert
  const clearAlert = useCallback((alertId: string) => {
    setCriticalAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }, [])

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setCriticalAlerts([])
    setNewPatterns([])
  }, [])

  // Process incoming pattern data
  const processNewPattern = useCallback((pattern: DetectedPattern) => {
    setNewPatterns(prev => {
      // Keep only the most recent 10 patterns
      const updated = [pattern, ...prev].slice(0, 10)
      return updated
    })

    // Trigger callbacks
    onNewPattern?.(pattern)

    // Check if this is a critical pattern
    if (pattern.severity === 'critical' && pattern.confidence_score >= alertThreshold) {
      const alert: PatternAlert = {
        id: `alert_${pattern.id}_${Date.now()}`,
        pattern_id: pattern.id,
        alert_type: 'immediate',
        urgency: 'critical',
        message: `Critical pattern detected: ${pattern.description}`,
        created_at: new Date().toISOString(),
        channels: ['dashboard', 'email'],
        acknowledged: false
      }

      setCriticalAlerts(prev => [alert, ...prev])
      onNewCriticalPattern?.(pattern)
      onNewAlert?.(alert)
    }
  }, [alertThreshold, onNewPattern, onNewCriticalPattern, onNewAlert])

  // Heartbeat timeout handler
  const handleHeartbeatTimeout = useCallback(() => {
    console.warn('Real-time pattern stream heartbeat timeout')
    setIsConnected(false)
    setLastHeartbeat(null)
  }, [])

  // Setup heartbeat monitoring
  const setupHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
    }
    heartbeatTimeoutRef.current = setTimeout(handleHeartbeatTimeout, 60000) // 1 minute timeout
  }, [handleHeartbeatTimeout])

  // Connect to real-time pattern stream
  const connect = useCallback(() => {
    if (!enabled || sensors.length === 0) {
      return
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    console.log('Connecting to real-time pattern stream...')

    try {
      // Create EventSource for server-sent events
      const sensorParams = sensors.map(id => `sensor=${id}`).join('&')
      const url = `/api/patterns/stream?${sensorParams}&threshold=${alertThreshold}`

      eventSourceRef.current = new EventSource(url)

      eventSourceRef.current.onopen = () => {
        console.log('Real-time pattern stream connected')
        setIsConnected(true)
        reconnectAttempts.current = 0
        setupHeartbeat()
      }

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'pattern':
              processNewPattern(data.pattern)
              break

            case 'heartbeat':
              setLastHeartbeat(new Date())
              setupHeartbeat()
              break

            case 'alert':
              const alert: PatternAlert = data.alert
              setCriticalAlerts(prev => [alert, ...prev])
              onNewAlert?.(alert)
              break

            default:
              console.log('Unknown real-time event:', data)
          }
        } catch (error) {
          console.error('Failed to parse real-time event:', error)
        }
      }

      eventSourceRef.current.onerror = (error) => {
        console.error('Real-time pattern stream error:', error)
        setIsConnected(false)

        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000 // Exponential backoff
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, delay)
        } else {
          console.error('Max reconnection attempts reached. Real-time updates disabled.')
        }
      }

    } catch (error) {
      console.error('Failed to create real-time pattern connection:', error)
      setIsConnected(false)
    }
  }, [enabled, sensors, alertThreshold, processNewPattern, onNewAlert, setupHeartbeat])

  // Disconnect from real-time stream
  const disconnect = useCallback(() => {
    console.log('Disconnecting from real-time pattern stream...')

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    setIsConnected(false)
    setLastHeartbeat(null)
    reconnectAttempts.current = 0
  }, [])

  // Effect for managing connection lifecycle
  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, sensors, alertThreshold]) // Reconnect when sensors change

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    newPatterns,
    criticalAlerts,
    isConnected,
    lastHeartbeat,
    clearAlert,
    clearAllAlerts
  }
}

// Mock real-time pattern generator for development
export function useMockRealTimePatterns(options: UseRealTimePatternsOptions): UseRealTimePatternsReturn {
  const { enabled, sensors, onNewPattern, onNewCriticalPattern } = options

  const [newPatterns, setNewPatterns] = useState<DetectedPattern[]>([])
  const [criticalAlerts, setCriticalAlerts] = useState<PatternAlert[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null)

  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Mock pattern generator
  const generateMockPattern = useCallback(() => {
    if (sensors.length === 0) return

    const mockPattern: DetectedPattern = {
      id: `mock_pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sensor_id: sensors[Math.floor(Math.random() * sensors.length)],
      equipment_type: ['HVAC', 'Lighting', 'Power', 'Water'][Math.floor(Math.random() * 4)],
      floor_number: Math.floor(Math.random() * 7) + 1,
      pattern_type: ['anomaly', 'trend', 'threshold'][Math.floor(Math.random() * 3)] as any,
      severity: Math.random() < 0.1 ? 'critical' : Math.random() < 0.3 ? 'warning' : 'info' as any,
      confidence_score: Math.floor(Math.random() * 40) + 60, // 60-100%
      description: 'Mock pattern for development testing',
      data_points: [],
      recommendations: [],
      acknowledged: false,
      created_at: new Date().toISOString(),
      metadata: {
        detection_algorithm: 'mock_generator',
        analysis_window: '1h',
        threshold_used: 2.5,
        historical_occurrences: Math.floor(Math.random() * 10),
        statistical_metrics: {
          mean: 850,
          std_deviation: 120,
          variance: 14400,
          median: 845,
          q1: 780,
          q3: 920,
          z_score: 2.8,
          percentile_rank: 85,
          normality_test: 78
        }
      }
    }

    setNewPatterns(prev => [mockPattern, ...prev].slice(0, 10))
    onNewPattern?.(mockPattern)

    if (mockPattern.severity === 'critical') {
      onNewCriticalPattern?.(mockPattern)
    }
  }, [sensors, onNewPattern, onNewCriticalPattern])

  // Clear functions
  const clearAlert = useCallback((alertId: string) => {
    setCriticalAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }, [])

  const clearAllAlerts = useCallback(() => {
    setCriticalAlerts([])
    setNewPatterns([])
  }, [])

  // Setup mock interval
  useEffect(() => {
    if (enabled) {
      setIsConnected(true)
      setLastHeartbeat(new Date())

      // Generate a pattern every 30 seconds
      mockIntervalRef.current = setInterval(() => {
        generateMockPattern()
        setLastHeartbeat(new Date())
      }, 30000)
    } else {
      setIsConnected(false)
      setLastHeartbeat(null)

      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current)
      }
    }

    return () => {
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current)
      }
    }
  }, [enabled, generateMockPattern])

  return {
    newPatterns,
    criticalAlerts,
    isConnected,
    lastHeartbeat,
    clearAlert,
    clearAllAlerts
  }
}