/**
 * Real-time Pattern Stream API
 * Story 3.3: Failure Pattern Detection Engine
 *
 * GET /api/patterns/stream
 * Server-Sent Events endpoint for real-time pattern updates and alerts
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import type { DetectedPattern, PatternAlert } from '@/types/patterns'

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerSession()
  if (!session?.user) {
    return new Response('Authentication required', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sensors = searchParams.getAll('sensor')
  const threshold = parseInt(searchParams.get('threshold') || '80')

  // Setup Server-Sent Events
  const responseStream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        `data: ${JSON.stringify({
          type: 'connection',
          message: 'Connected to pattern stream',
          timestamp: new Date().toISOString(),
          sensors: sensors,
          threshold: threshold
        })}\n\n`
      )

      // Setup heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            `data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })}\n\n`
          )
        } catch (_error) {
          console.log('Heartbeat failed, client likely disconnected')
          clearInterval(heartbeatInterval)
          clearInterval(patternInterval)
        }
      }, 30000) // Every 30 seconds

      // Setup pattern detection simulation
      const patternInterval = setInterval(() => {
        try {
          // Simulate pattern detection (in production, this would be triggered by actual detection events)
          if (Math.random() < 0.1) { // 10% chance of pattern every interval
            const mockPattern = generateMockPattern(sensors, threshold)

            controller.enqueue(
              `data: ${JSON.stringify({
                type: 'pattern',
                pattern: mockPattern,
                timestamp: new Date().toISOString()
              })}\n\n`
            )

            // If critical pattern, also send alert
            if (mockPattern.severity === 'critical') {
              const alert = generatePatternAlert(mockPattern)
              controller.enqueue(
                `data: ${JSON.stringify({
                  type: 'alert',
                  alert: alert,
                  timestamp: new Date().toISOString()
                })}\n\n`
              )
            }
          }
        } catch (_error) {
          console.log('Pattern stream failed, client likely disconnected')
          clearInterval(heartbeatInterval)
          clearInterval(patternInterval)
        }
      }, 10000) // Every 10 seconds

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        clearInterval(patternInterval)
        try {
          controller.close()
        } catch (error) {
          console.log('Error closing stream:', error)
        }
      })
    }
  })

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

/**
 * Generate mock pattern for demonstration
 */
function generateMockPattern(sensors: string[], threshold: number): DetectedPattern {
  const selectedSensor = sensors.length > 0 ? sensors[Math.floor(Math.random() * sensors.length)] : 'SENSOR_001'
  const equipmentTypes = ['HVAC', 'Lighting', 'Power', 'Water', 'Security']
  const patternTypes = ['anomaly', 'trend', 'threshold', 'correlation'] as const
  const severities = ['critical', 'warning', 'info'] as const

  // Higher chance of critical patterns if threshold is high
  const severityWeights = threshold > 85 ? [0.3, 0.4, 0.3] : [0.1, 0.3, 0.6]
  const severityIndex = weightedRandom(severityWeights)
  const severity = severities[severityIndex]

  const confidence = Math.floor(Math.random() * 40) + 60 // 60-100%

  return {
    id: `stream_pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    sensor_id: selectedSensor,
    equipment_type: equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)],
    floor_number: Math.floor(Math.random() * 7) + 1,
    pattern_type: patternTypes[Math.floor(Math.random() * patternTypes.length)],
    severity: severity,
    confidence_score: confidence,
    description: generatePatternDescription(severity, equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)]),
    data_points: [],
    recommendations: [],
    acknowledged: false,
    created_at: new Date().toISOString(),
    metadata: {
      detection_algorithm: 'real_time_stream',
      analysis_window: '5m',
      threshold_used: 2.5,
      historical_occurrences: Math.floor(Math.random() * 5),
      statistical_metrics: {
        mean: 850 + Math.random() * 300,
        std_deviation: 50 + Math.random() * 100,
        variance: 2500 + Math.random() * 5000,
        median: 840 + Math.random() * 320,
        q1: 780 + Math.random() * 100,
        q3: 920 + Math.random() * 100,
        z_score: 2.1 + Math.random() * 2,
        percentile_rank: 70 + Math.random() * 25,
        normality_test: 60 + Math.random() * 30
      }
    }
  }
}

/**
 * Generate pattern alert for critical patterns
 */
function generatePatternAlert(pattern: DetectedPattern): PatternAlert {
  return {
    id: `alert_${pattern.id}`,
    pattern_id: pattern.id,
    alert_type: 'immediate',
    urgency: pattern.severity === 'critical' ? 'critical' : 'high',
    message: `Critical ${pattern.pattern_type} pattern detected in ${pattern.equipment_type} on floor ${pattern.floor_number}`,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
    channels: ['dashboard', 'email'],
    acknowledged: false
  }
}

/**
 * Generate human-readable pattern description
 */
function generatePatternDescription(severity: string, equipmentType: string): string {
  const severityDescriptions = {
    critical: [
      `Critical ${equipmentType.toLowerCase()} system malfunction detected`,
      `Severe anomaly in ${equipmentType.toLowerCase()} performance requiring immediate attention`,
      `${equipmentType} system showing signs of imminent failure`
    ],
    warning: [
      `${equipmentType} system showing irregular behavior`,
      `Potential issue detected in ${equipmentType.toLowerCase()} operations`,
      `${equipmentType} performance declining beyond normal parameters`
    ],
    info: [
      `Minor variance observed in ${equipmentType.toLowerCase()} readings`,
      `${equipmentType} system within acceptable but elevated thresholds`,
      `Informational pattern detected in ${equipmentType.toLowerCase()} data`
    ]
  }

  const descriptions = severityDescriptions[severity as keyof typeof severityDescriptions]
  return descriptions[Math.floor(Math.random() * descriptions.length)]
}

/**
 * Weighted random selection utility
 */
function weightedRandom(weights: number[]): number {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let random = Math.random() * totalWeight

  for (let i = 0; i < weights.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return i
    }
  }

  return weights.length - 1 // Fallback
}