/**
 * API Health Check Endpoint
 * Returns system status and database connectivity
 */

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const startTime = Date.now()

    // Test database connectivity
    const supabase = supabaseServer
    const { data, error } = await supabase
      .from('sensor_readings')
      .select('count', { count: 'exact', head: true })
      .limit(1)

    const dbConnected = !error
    const recordCount = data ? 'Available' : 'No data'

    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbConnected,
        records: recordCount,
        error: error?.message
      },
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      response_time_ms: Date.now() - startTime
    }

    return NextResponse.json(response, { 
      status: dbConnected ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}