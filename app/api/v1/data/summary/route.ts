/**
 * Professional API v1: Data Summary Endpoint
 * Story 4.2: Professional API Access System
 *
 * Provides statistical summaries and aggregations for time-series data
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const SummaryRequestSchema = z.object({
  equipment_type: z.string().optional(),
  floor_number: z.coerce.number().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  aggregation_level: z.enum(['hour', 'day', 'week']).default('hour')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const params = SummaryRequestSchema.parse({
      equipment_type: searchParams.get('equipment_type') || 'HVAC',
      floor_number: searchParams.get('floor_number'),
      start_date: searchParams.get('start_date') || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end_date: searchParams.get('end_date') || new Date().toISOString(),
      aggregation_level: searchParams.get('aggregation_level') || 'hour'
    })

    // Generate comprehensive summary data
    const summaryData = generateSummaryData(params)

    return NextResponse.json({
      success: true,
      data: summaryData
    })

  } catch (error) {
    console.error('Summary API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'validation_error',
        message: 'Invalid query parameters',
        validation_errors: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'internal_server_error',
      message: 'An unexpected error occurred'
    }, { status: 500 })
  }
}

function generateSummaryData(params: z.infer<typeof SummaryRequestSchema>) {
  const { equipment_type, floor_number, start_date, end_date } = params

  // Generate realistic statistical data
  const baseValues = getBaseValuesForEquipment(equipment_type || 'HVAC')

  return {
    summary: {
      equipment_type: equipment_type || 'HVAC',
      total_sensors: floor_number ? 5 : 35, // 5 per floor, 7 floors total
      data_period: {
        start: start_date,
        end: end_date
      },
      aggregated_metrics: {
        total_consumption: baseValues.total,
        average_consumption: baseValues.average,
        peak_consumption: baseValues.peak,
        efficiency_score: baseValues.efficiency
      }
    },
    statistics: {
      mean: baseValues.average,
      median: baseValues.average * 0.95,
      std_deviation: baseValues.average * 0.15,
      percentiles: {
        p25: baseValues.average * 0.8,
        p50: baseValues.average * 0.95,
        p75: baseValues.average * 1.1,
        p95: baseValues.average * 1.3,
        p99: baseValues.average * 1.5
      }
    },
    breakdown_by_floor: generateFloorBreakdown(equipment_type || 'HVAC', floor_number),
    time_based_aggregations: generateTimeAggregations(equipment_type || 'HVAC')
  }
}

function getBaseValuesForEquipment(equipmentType: string) {
  const baseValues = {
    'HVAC': { average: 850, total: 25500, peak: 1200, efficiency: 0.78 },
    'Lighting': { average: 120, total: 3600, peak: 180, efficiency: 0.85 },
    'Power': { average: 2400, total: 72000, peak: 3200, efficiency: 0.72 },
    'Water': { average: 45, total: 1350, peak: 65, efficiency: 0.82 },
    'Security': { average: 25, total: 750, peak: 35, efficiency: 0.90 }
  }

  return baseValues[equipmentType as keyof typeof baseValues] || baseValues.HVAC
}

function generateFloorBreakdown(equipmentType: string, specificFloor?: number) {
  const baseValue = getBaseValuesForEquipment(equipmentType).average

  if (specificFloor) {
    return [{
      floor_number: specificFloor,
      sensor_count: 5,
      total_consumption: baseValue * 5,
      average_consumption: baseValue,
      efficiency_score: 0.75 + (Math.random() * 0.2)
    }]
  }

  return Array.from({ length: 7 }, (_, i) => {
    const floorNumber = i + 1
    const floorVariation = 1 + (floorNumber - 4) * 0.05 // ±15% based on floor

    return {
      floor_number: floorNumber,
      sensor_count: 5,
      total_consumption: baseValue * 5 * floorVariation,
      average_consumption: baseValue * floorVariation,
      efficiency_score: 0.75 + (Math.random() * 0.2)
    }
  })
}

function generateTimeAggregations(equipmentType: string) {
  const baseValue = getBaseValuesForEquipment(equipmentType).average

  return {
    hourly_averages: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      average_consumption: baseValue * (0.7 + Math.sin(hour * Math.PI / 12) * 0.3),
      sensor_count: 35
    })),
    daily_totals: Array.from({ length: 7 }, (_, day) => ({
      day: day + 1,
      total_consumption: baseValue * 24 * 35 * (0.9 + Math.random() * 0.2),
      peak_hour: 10 + Math.floor(Math.random() * 8)
    })),
    weekly_patterns: Array.from({ length: 4 }, (_, week) => ({
      week: week + 1,
      average_consumption: baseValue * (0.95 + Math.random() * 0.1),
      efficiency_trend: Math.random() > 0.5 ? 'improving' : 'stable'
    }))
  }
}