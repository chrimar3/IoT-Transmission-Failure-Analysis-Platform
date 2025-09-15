/**
 * API Endpoint: GET /api/readings/summary
 * Returns dashboard metrics using hybrid R2 + Supabase storage
 */

import { NextResponse } from 'next/server'
import { r2Client } from '@/lib/r2-client'
import { DashboardMetrics, ApiResponse } from '@/lib/types/api'

export async function GET() {
  try {
    const startTime = Date.now()

    // Fetch metrics from R2 storage (with Supabase caching)
    const metrics = await r2Client.getMetrics()

    const executionTime = Date.now() - startTime
    console.log(`📊 Dashboard metrics generated in ${executionTime}ms`)

    return NextResponse.json(
      {
        success: true,
        data: metrics as DashboardMetrics
      } as ApiResponse<DashboardMetrics>,
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      }
    )

  } catch (error) {
    console.error('Unexpected error in summary endpoint:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          error: 'internal_server_error',
          message: 'An unexpected error occurred',
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