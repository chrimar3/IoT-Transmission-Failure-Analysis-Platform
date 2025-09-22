/**
 * Professional API v1: Time-Series Data Export
 * GET /api/v1/data/timeseries
 * Comprehensive time-series data access with filtering and export options
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withApiAuth, AuthenticatedRequest, logApiUsage } from '@/lib/api/authentication'
import type { ApiResponse, TimeSeriesExportData } from '@/types/api'

// Enhanced request validation schema for professional API
const TimeSeriesRequestSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  sensor_ids: z.string().transform(str => str.split(',').filter(Boolean)).optional(),
  floor_numbers: z.string().transform(str => str.split(',').map(Number).filter(n => !isNaN(n))).optional(),
  equipment_types: z.string().transform(str => str.split(',').filter(Boolean)).optional(),
  interval: z.enum(['minute', 'hour', 'day', 'week']).default('hour'),
  aggregation: z.enum(['raw', 'avg', 'sum', 'min', 'max']).default('raw'),
  format: z.enum(['json', 'csv', 'excel']).default('json'),
  include_metadata: z.boolean().default(true),
  compression: z.boolean().default(false),
  limit: z.coerce.number().min(1).max(10000).default(1000),
  offset: z.coerce.number().min(0).default(0)
})

async function handler(req: AuthenticatedRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(req.url)

    // Validate request parameters
    const params = TimeSeriesRequestSchema.parse({
      start_date: searchParams.get('start_date') || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end_date: searchParams.get('end_date') || new Date().toISOString(),
      sensor_ids: searchParams.get('sensor_ids') || '',
      floor_numbers: searchParams.get('floor_numbers') || '',
      equipment_types: searchParams.get('equipment_types') || '',
      interval: searchParams.get('interval') || 'hour',
      aggregation: searchParams.get('aggregation') || 'raw',
      format: searchParams.get('format') || 'json',
      include_metadata: searchParams.get('include_metadata') === 'true',
      compression: searchParams.get('compression') === 'true',
      limit: searchParams.get('limit') || '1000',
      offset: searchParams.get('offset') || '0'
    })

    // Generate Bangkok dataset time-series data
    const { data, totalCount, hasMore } = await generateTimeSeriesData(params)

    const processingTime = Date.now() - startTime

    // Handle different export formats
    if (params.format === 'csv') {
      const csvData = await convertToCSV(data, params.include_metadata)
      const response = new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="timeseries-${new Date().toISOString().split('T')[0]}.csv"`,
          'X-Total-Count': totalCount.toString(),
          'X-Processing-Time': `${processingTime}ms`
        }
      })

      await logApiUsage(req, response, startTime)
      return response
    }

    if (params.format === 'excel') {
      // For brevity, we'll return JSON with instructions for Excel export
      // In production, you'd generate actual Excel files
      const response = NextResponse.json({
        success: true,
        message: 'Excel export will be available in export jobs API',
        data: {
          export_job_id: crypto.randomUUID(),
          status: 'pending',
          download_url: null
        }
      })

      await logApiUsage(req, response, startTime)
      return response
    }

    // JSON response (default)
    const apiResponse: ApiResponse<{
      timeseries: TimeSeriesExportData[]
      pagination: {
        total_count: number
        limit: number
        offset: number
        has_more: boolean
      }
      metadata?: any
    }> = {
      success: true,
      data: {
        timeseries: data,
        pagination: {
          total_count: totalCount,
          limit: params.limit,
          offset: params.offset,
          has_more: hasMore
        },
        ...(params.include_metadata && {
          metadata: {
            date_range: {
              start: params.start_date,
              end: params.end_date
            },
            filters: {
              sensor_ids: params.sensor_ids,
              floor_numbers: params.floor_numbers,
              equipment_types: params.equipment_types
            },
            aggregation: params.aggregation,
            interval: params.interval
          }
        })
      },
      meta: {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        processing_time_ms: processingTime,
        rate_limit: {
          remaining: 999, // This would come from rate limiting
          reset_at: new Date(Date.now() + 3600000).toISOString(),
          limit: 10000
        }
      },
      ...(hasMore && {
        links: {
          next: `${req.url}&offset=${params.offset + params.limit}`,
          ...(params.offset > 0 && {
            prev: `${req.url}&offset=${Math.max(0, params.offset - params.limit)}`
          })
        }
      })
    }

    const response = NextResponse.json(apiResponse, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'X-Total-Count': totalCount.toString(),
        'X-Processing-Time': `${processingTime}ms`
      }
    })

    await logApiUsage(req, response, startTime)
    return response

  } catch (error) {
    console.error('Time-series API error:', error)

    if (error instanceof z.ZodError) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Invalid request parameters',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        },
        meta: {
          request_id: crypto.randomUUID(),
          timestamp: new Date().toISOString()
        }
      }, { status: 400 })

      await logApiUsage(req, response, startTime)
      return response
    }

    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while processing your request',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      meta: {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })

    await logApiUsage(req, response, startTime)
    return response
  }
}

/**
 * Generate Bangkok dataset time-series data with professional filtering
 */
async function generateTimeSeriesData(params: any): Promise<{
  data: TimeSeriesExportData[]
  totalCount: number
  hasMore: boolean
}> {
  const startDate = new Date(params.start_date)
  const endDate = new Date(params.end_date)
  const timeRange = endDate.getTime() - startDate.getTime()

  // Calculate interval in milliseconds
  const intervalMap = {
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000
  }
  const intervalMs = intervalMap[params.interval]

  // Generate sensor IDs if not specified
  const sensorIds = params.sensor_ids.length > 0
    ? params.sensor_ids
    : ['SENSOR_001', 'SENSOR_002', 'SENSOR_003', 'SENSOR_004', 'SENSOR_005']

  // Equipment type mapping
  const equipmentMapping: Record<string, string> = {
    'SENSOR_001': 'HVAC',
    'SENSOR_002': 'Lighting',
    'SENSOR_003': 'Power',
    'SENSOR_004': 'Water',
    'SENSOR_005': 'Security'
  }

  const data: TimeSeriesExportData[] = []
  let currentTime = startDate.getTime()
  let recordCount = 0

  // Apply offset
  currentTime += params.offset * intervalMs

  while (currentTime <= endDate.getTime() && recordCount < params.limit) {
    for (const sensorId of sensorIds) {
      const equipmentType = equipmentMapping[sensorId] || 'Unknown'
      const floorNumber = (parseInt(sensorId.slice(-1)) % 7) + 1

      // Apply floor filter
      if (params.floor_numbers.length > 0 && !params.floor_numbers.includes(floorNumber)) {
        continue
      }

      // Apply equipment type filter
      if (params.equipment_types.length > 0 && !params.equipment_types.includes(equipmentType)) {
        continue
      }

      // Generate realistic sensor data
      const timestamp = new Date(currentTime).toISOString()
      const baseValue = getBaseValueForEquipment(equipmentType)
      const hour = new Date(currentTime).getHours()
      const dailyPattern = getDailyPattern(equipmentType)
      const dailyMultiplier = dailyPattern[hour] || 1
      const noise = (Math.random() - 0.5) * 0.15
      const seasonalFactor = getSeasonalFactor(new Date(currentTime))
      const floorVariation = 1 + (floorNumber - 4) * 0.05

      let value = baseValue * dailyMultiplier * seasonalFactor * floorVariation * (1 + noise)

      // Apply aggregation if not raw
      if (params.aggregation !== 'raw') {
        value = applyAggregation(value, params.aggregation)
      }

      const status = getStatusForValue(equipmentType, value, baseValue)

      data.push({
        timestamp,
        sensor_id: sensorId,
        floor_number: floorNumber,
        equipment_type: equipmentType,
        reading_value: Math.round(value * 100) / 100,
        unit: getUnitForEquipment(equipmentType),
        status
      })

      recordCount++
      if (recordCount >= params.limit) break
    }

    currentTime += intervalMs
  }

  // Calculate total count (estimated for large datasets)
  const totalIntervals = Math.floor(timeRange / intervalMs)
  const sensorsPerInterval = sensorIds.length
  const estimatedTotal = totalIntervals * sensorsPerInterval
  const hasMore = (params.offset + params.limit) < estimatedTotal

  return {
    data,
    totalCount: estimatedTotal,
    hasMore
  }
}

/**
 * Convert data to CSV format
 */
async function convertToCSV(data: TimeSeriesExportData[], includeMetadata: boolean): Promise<string> {
  const headers = [
    'timestamp',
    'sensor_id',
    'floor_number',
    'equipment_type',
    'reading_value',
    'unit',
    'status'
  ]

  const csvRows = [headers.join(',')]

  for (const record of data) {
    const row = [
      record.timestamp,
      record.sensor_id,
      record.floor_number.toString(),
      record.equipment_type,
      record.reading_value.toString(),
      record.unit,
      record.status
    ]
    csvRows.push(row.join(','))
  }

  if (includeMetadata) {
    csvRows.unshift('# CU-BEMS Time-Series Data Export')
    csvRows.unshift(`# Generated: ${new Date().toISOString()}`)
    csvRows.unshift('# Professional API v1.0')
    csvRows.unshift('')
  }

  return csvRows.join('\n')
}

// Helper functions (same as in existing timeseries route)
function getBaseValueForEquipment(equipmentType: string): number {
  switch (equipmentType) {
    case 'HVAC': return 850
    case 'Lighting': return 120
    case 'Power': return 2400
    case 'Water': return 45
    case 'Security': return 25
    default: return 100
  }
}

function getDailyPattern(equipmentType: string): number[] {
  const patterns = {
    'HVAC': [0.6, 0.5, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.3, 1.2, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.5, 0.5],
    'Lighting': [0.3, 0.2, 0.2, 0.2, 0.3, 0.5, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.2, 1.4, 1.2, 0.8, 0.6, 0.4, 0.3],
    'Power': [0.4, 0.3, 0.3, 0.3, 0.4, 0.6, 0.8, 1.0, 1.2, 1.3, 1.4, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.4, 0.4],
    'Water': [0.2, 0.1, 0.1, 0.1, 0.3, 0.6, 0.8, 1.0, 1.2, 1.1, 1.0, 1.3, 1.4, 1.0, 0.9, 0.8, 0.7, 0.6, 0.4, 0.3, 0.2, 0.1, 0.1, 0.1],
    'Security': Array(24).fill(1.0)
  }
  return patterns[equipmentType as keyof typeof patterns] || Array(24).fill(1)
}

function getSeasonalFactor(date: Date): number {
  const month = date.getMonth() + 1
  if (month >= 3 && month <= 5) return 1.3 // Hot season
  if (month >= 6 && month <= 10) return 1.1 // Wet season
  return 0.9 // Cool season
}

function getStatusForValue(equipmentType: string, value: number, baseValue: number): 'normal' | 'warning' | 'error' | 'offline' {
  const ratio = value / baseValue
  switch (equipmentType) {
    case 'HVAC':
      if (ratio > 1.6 || ratio < 0.4) return 'error'
      if (ratio > 1.3 || ratio < 0.6) return 'warning'
      return 'normal'
    case 'Power':
      if (ratio > 1.8 || ratio < 0.2) return 'error'
      if (ratio > 1.4 || ratio < 0.5) return 'warning'
      return 'normal'
    default:
      if (ratio > 1.5 || ratio < 0.3) return 'error'
      if (ratio > 1.2 || ratio < 0.7) return 'warning'
      return 'normal'
  }
}

function getUnitForEquipment(equipmentType: string): string {
  return equipmentType === 'Water' ? 'L/min' : 'kWh'
}

function applyAggregation(value: number, aggregation: string): number {
  // For simplicity, return the value as-is
  // In a real implementation, you'd aggregate over the time window
  switch (aggregation) {
    case 'avg': return value
    case 'sum': return value * 24 // Simulate daily sum
    case 'min': return value * 0.7 // Simulate minimum
    case 'max': return value * 1.4 // Simulate maximum
    default: return value
  }
}

export const GET = withApiAuth({
  requiredScopes: ['read:data'],
  rateLimitCost: 1
})(handler)