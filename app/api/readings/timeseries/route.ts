/**
 * API Endpoint: GET /api/readings/timeseries
 * Returns time-series sensor data from R2 storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { r2Client } from '@/lib/r2-client'
import { 
  TimeSeriesResponse, 
  ApiResponse, 
  TimeSeriesQueryParams,
  validateDateString,
  validateNumericParam,
  isValidEquipmentType
} from '@/lib/types/api'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Parse and validate query parameters
    const rawParams: TimeSeriesQueryParams = {
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date'),
      sensor_id: searchParams.get('sensor_id'),
      floor_number: searchParams.get('floor_number'),
      equipment_type: searchParams.get('equipment_type'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset')
    }

    // Validate date parameters
    const startDate = validateDateString(rawParams.start_date)
    const endDate = validateDateString(rawParams.end_date)
    
    // Validate equipment type if provided
    const equipmentType = rawParams.equipment_type && isValidEquipmentType(rawParams.equipment_type)
      ? rawParams.equipment_type
      : undefined
    
    // Validate numeric parameters
    const floorNumber = rawParams.floor_number 
      ? validateNumericParam(rawParams.floor_number)
      : undefined
    const limit = Math.min(Math.max(validateNumericParam(rawParams.limit, 100)!, 1), 1000)
    const offset = Math.max(validateNumericParam(rawParams.offset, 0)!, 0)
    
    // Build validated query object
    const query = {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      sensorId: rawParams.sensor_id || undefined,
      floorNumber: floorNumber !== 0 ? floorNumber : undefined,
      equipmentType,
      limit,
      offset
    }

    // Fetch data from R2 storage
    const data = await r2Client.fetchSensorData(query)

    // Calculate pagination
    const page = Math.floor(query.offset / query.limit) + 1
    const totalPages = Math.ceil(1000 / query.limit) // Estimate for MVP

    const response: TimeSeriesResponse = {
      data,
      total_count: data.length,
      date_range: {
        start: query.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: query.endDate || new Date().toISOString()
      },
      pagination: {
        page,
        limit: query.limit,
        total_pages: totalPages
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: response
      } as ApiResponse<TimeSeriesResponse>,
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=300'
        }
      }
    )

  } catch (error) {
    console.error('Error in timeseries endpoint:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          error: 'internal_server_error',
          message: 'Failed to fetch time series data',
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