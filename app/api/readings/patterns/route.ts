/**
 * API Endpoint: GET /api/readings/patterns
 * PROTECTED: Subscription-based access with revenue protection (Story 1.3)
 * Returns detected failure patterns and anomalies
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import {
  PatternDetectionResponse,
  FailurePattern,
  ApiResponse,
  PatternsQueryParams,
  validateDateString,
  validateNumericParam,
  validateFloatParam,
  isValidEquipmentType
} from '@/lib/types/api'
import { enforceDataAccessRestrictions, enforceTierBasedRateLimit, generateUpgradePrompt } from '@/src/lib/middleware/data-access.middleware'
import { subscriptionService } from '@/src/lib/stripe/subscription.service'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/src/lib/auth/config'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()

    // CRITICAL REVENUE PROTECTION: Validate subscription and apply rate limiting
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: {
          error: 'authentication_required',
          message: 'Please sign in to access pattern detection',
          timestamp: new Date().toISOString(),
          status: 401
        },
        upgrade_prompt: {
          title: 'Sign In Required',
          message: 'Advanced pattern detection requires authentication',
          upgradeUrl: '/auth/signin?callbackUrl=/api/readings/patterns'
        }
      } as ApiResponse<never>, { status: 401 })
    }

    const userId = session.user.id

    // Apply tier-based rate limiting
    const rateLimitCheck = await enforceTierBasedRateLimit(userId, 'patterns')
    if (!rateLimitCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: {
          error: 'rate_limit_exceeded',
          message: `Pattern analysis rate limit exceeded. Resets at ${rateLimitCheck.resetTime.toISOString()}`,
          timestamp: new Date().toISOString(),
          status: 429
        },
        remaining: rateLimitCheck.remaining,
        reset_time: rateLimitCheck.resetTime.toISOString(),
        upgrade_prompt: rateLimitCheck.upgradePrompt
      } as ApiResponse<never>, { status: 429 })
    }

    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const rawParams: PatternsQueryParams = {
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date'),
      min_confidence: searchParams.get('min_confidence'),
      equipment_type: searchParams.get('equipment_type'),
      floor_number: searchParams.get('floor_number')
    }

    // Validate and set defaults
    const startDate = rawParams.start_date 
      ? (validateDateString(rawParams.start_date)?.toISOString() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = rawParams.end_date 
      ? (validateDateString(rawParams.end_date)?.toISOString() || new Date().toISOString())
      : new Date().toISOString()
    const minConfidenceScore = Math.max(0, Math.min(1, validateFloatParam(rawParams.min_confidence, 0.7)))
    const equipmentType = rawParams.equipment_type && isValidEquipmentType(rawParams.equipment_type)
      ? rawParams.equipment_type
      : undefined
    const floorNumber = rawParams.floor_number 
      ? validateNumericParam(rawParams.floor_number)
      : undefined

    // Validate date range
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'invalid_parameters',
            message: 'Invalid date format. Use ISO 8601 format',
            timestamp: new Date().toISOString(),
            status: 400
          }
        } as ApiResponse<never>,
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Get failure patterns by analyzing equipment downtime and anomalies
    let failureQuery = supabaseServer
      .from('sensor_readings')
      .select('sensor_id, floor_number, equipment_type, reading_value, status, timestamp')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: true })

    if (equipmentType) {
      failureQuery = failureQuery.eq('equipment_type', equipmentType)
    }

    if (floorNumber !== undefined) {
      failureQuery = failureQuery.eq('floor_number', floorNumber)
    }

    // REVENUE PROTECTION: Apply subscription-based data access restrictions
    const dataRequest = {
      dateRange: {
        start: startDate,
        end: endDate
      },
      maxRecords: 10000, // Base limit for pattern analysis
      equipmentTypes: equipmentType ? [equipmentType] : undefined,
      floorNumbers: floorNumber !== undefined ? [floorNumber] : undefined
    }

    const filteredRequest = await enforceDataAccessRestrictions(userId, dataRequest)

    // Apply tier-based query limits
    const queryLimit = Math.min(filteredRequest.maxRecords || 10000, 10000)
    const { data: rawData, error } = await failureQuery.limit(queryLimit)

    if (error) {
      console.error('Error fetching pattern data:', error)
      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'database_error',
            message: 'Failed to fetch sensor data for pattern analysis',
            timestamp: new Date().toISOString(),
            status: 500
          }
        } as ApiResponse<never>,
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Simple pattern detection algorithm
    const patterns: FailurePattern[] = []
    const equipmentAnalysis = new Map<string, {
      sensor_id: string
      floor_number: number
      equipment_type: string
      failures: number
      total_readings: number
      avg_value: number
      downtime_periods: { start: string, end: string, duration: number }[]
    }>()

    // Group data by equipment for analysis
    rawData?.forEach(reading => {
      const key = `${reading.sensor_id}_${reading.equipment_type}`
      
      if (!equipmentAnalysis.has(key)) {
        equipmentAnalysis.set(key, {
          sensor_id: reading.sensor_id,
          floor_number: reading.floor_number,
          equipment_type: reading.equipment_type,
          failures: 0,
          total_readings: 0,
          avg_value: 0,
          downtime_periods: []
        })
      }

      const analysis = equipmentAnalysis.get(key)!
      analysis.total_readings++
      analysis.avg_value += reading.reading_value

      // Detect failures (status != normal or reading_value == 0 for power equipment)
      const isFailure = reading.status !== 'normal' || 
        (reading.equipment_type === 'HVAC' && reading.reading_value === 0) ||
        (reading.equipment_type === 'Lighting' && reading.reading_value === 0)

      if (isFailure) {
        analysis.failures++
      }
    })

    // Convert analysis to patterns
    for (const [key, analysis] of Array.from(equipmentAnalysis.entries())) {
      const failureFrequency = analysis.failures / analysis.total_readings

      // Only include if failure rate is significant and confidence is high
      if (failureFrequency >= 0.05 && analysis.total_readings >= 10) {
        
        // Calculate confidence score based on data quality and failure consistency
        const confidenceScore = Math.min(
          0.95,
          0.5 + (analysis.total_readings / 1000) * 0.3 + (failureFrequency * 0.2)
        )

        if (confidenceScore >= minConfidenceScore) {
          // Estimate cost impact based on equipment type and downtime
          const costPerHour = analysis.equipment_type === 'HVAC' ? 150 : 
                             analysis.equipment_type === 'Lighting' ? 50 : 100
          const avgDowntimeHours = failureFrequency * 2 // Rough estimate
          const estimatedCostImpact = costPerHour * avgDowntimeHours * 30 // Monthly cost

          patterns.push({
            pattern_id: `pattern_${Date.now()}_${key}`,
            equipment_type: analysis.equipment_type,
            floor_number: analysis.floor_number,
            sensor_id: analysis.sensor_id,
            failure_frequency: Math.round(failureFrequency * 100) / 100,
            average_downtime_minutes: Math.round(avgDowntimeHours * 60),
            estimated_cost_impact: Math.round(estimatedCostImpact),
            confidence_score: Math.round(confidenceScore * 100) / 100,
            detected_at: new Date().toISOString()
          })
        }
      }
    }

    // Sort patterns by estimated cost impact (highest first)
    patterns.sort((a, b) => b.estimated_cost_impact - a.estimated_cost_impact)

    const totalEstimatedImpact = patterns.reduce((sum, pattern) => 
      sum + pattern.estimated_cost_impact, 0)

    const response: PatternDetectionResponse = {
      patterns,
      analysis_period: {
        start: filteredRequest.dateRange?.start || startDate,
        end: filteredRequest.dateRange?.end || endDate
      },
      total_patterns_found: patterns.length,
      total_estimated_impact: Math.round(totalEstimatedImpact),
      // Revenue protection metadata
      tier_restrictions: filteredRequest.revenueProtection.tierRestricted ? {
        applied_restrictions: filteredRequest.appliedRestrictions,
        data_limit_applied: queryLimit < 10000,
        upgrade_available: filteredRequest.showUpgradePrompt
      } : undefined
    }

    const executionTime = Date.now() - startTime
    console.log(`🔍 Pattern analysis completed in ${executionTime}ms (${patterns.length} patterns found)`)

    // Track API usage for revenue analytics
    await subscriptionService.trackUserActivity(userId, 'api_patterns_access', {
      patterns_found: patterns.length,
      analysis_time_ms: executionTime,
      tier_restricted: filteredRequest.revenueProtection.tierRestricted
    })

    const apiResponse = {
      success: true,
      data: response,
      // Include upgrade prompt if user hit data restrictions
      upgrade_prompt: filteredRequest.showUpgradePrompt ? generateUpgradePrompt(filteredRequest.appliedRestrictions) : undefined
    } as ApiResponse<PatternDetectionResponse> & { upgrade_prompt?: any }

    return NextResponse.json(
      apiResponse,
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': filteredRequest.revenueProtection.tierRestricted ? 'no-cache' : 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Rate-Limit-Remaining': rateLimitCheck.remaining.toString(),
          'X-Subscription-Tier': (await subscriptionService.getUserSubscription(userId))?.tier || 'FREE',
          'X-Execution-Time': `${executionTime}ms`
        }
      }
    )

  } catch (error) {
    console.error('Unexpected error in patterns endpoint:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          error: 'internal_server_error',
          message: 'An unexpected error occurred during pattern analysis',
          timestamp: new Date().toISOString(),
          status: 500
        }
      } as ApiResponse<never>,
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}