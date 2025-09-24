/**
 * Chart Export API Endpoint
 * Story 3.2: Interactive Time-Series Visualizations
 *
 * POST /api/export/chart
 * Exports time-series charts to PNG/PDF with professional branding
 * Requires Professional subscription tier
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import type { ExportRequest } from '@/types/analytics'

// Export request validation schema
const ExportRequestSchema = z.object({
  chart_config: z.object({
    sensors: z.array(z.string()),
    start_date: z.string().datetime(),
    end_date: z.string().datetime(),
    interval: z.enum(['minute', 'hour', 'day', 'week']),
    chart_type: z.enum(['line', 'area', 'bar']),
    max_points: z.number().optional().default(1000),
    show_legend: z.boolean().optional().default(true)
  }),
  export_options: z.object({
    format: z.enum(['png', 'pdf']),
    title: z.string().max(100),
    include_timestamp: z.boolean().default(true),
    include_data_range: z.boolean().default(true),
    quality: z.enum(['low', 'medium', 'high']).default('high'),
    width: z.number().min(400).max(2000).default(800),
    height: z.number().min(300).max(1500).default(600)
  }),
  title: z.string().max(100)
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        message: 'Please sign in to export charts'
      }, { status: 401 })
    }

    // Check subscription tier (Professional required for export)
    const userTier = (session.user as { subscriptionTier?: string }).subscriptionTier || 'free'
    if (userTier !== 'professional' && userTier !== 'enterprise') {
      return NextResponse.json({
        success: false,
        error: 'Subscription upgrade required',
        message: 'Chart export requires Professional or Enterprise subscription'
      }, { status: 403 })
    }

    // Validate request body
    const body = await request.json()
    const exportRequest = ExportRequestSchema.parse(body)

    // Generate export based on format
    const exportResult = await generateChartExport(exportRequest)

    return NextResponse.json({
      success: true,
      data: {
        download_url: exportResult.url,
        filename: exportResult.filename,
        format: exportRequest.export_options.format,
        size_bytes: exportResult.size,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Chart export error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid export parameters',
        validation_errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      }, { status: 400 })
    }

    // Enhanced error handling for export failures
    let errorMessage = 'Failed to generate chart export'
    let statusCode = 500
    let suggestions: string[] = []

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('memory') || error.message.includes('heap')) {
        errorMessage = 'Chart export requires too much memory'
        statusCode = 413
        suggestions = [
          'Reduce the date range',
          'Select fewer sensors',
          'Use a smaller image size',
          'Try PNG format instead of PDF'
        ]
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Chart export timed out'
        statusCode = 408
        suggestions = [
          'Try a simpler chart configuration',
          'Reduce the number of data points',
          'Use a smaller image size'
        ]
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Too many export requests'
        statusCode = 429
        suggestions = [
          'Wait a moment before trying again',
          'Export requests are limited by subscription tier'
        ]
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Export failed',
      message: errorMessage,
      error_id: `EX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      suggestions,
      support_contact: 'support@cu-bems.com'
    }, { status: statusCode })
  }
}

/**
 * Generate chart export in specified format
 * This is a simplified implementation - in production, you'd use libraries like:
 * - Puppeteer for PDF generation
 * - Canvas API for PNG generation
 * - Chart.js headless rendering
 */
async function generateChartExport(exportRequest: ExportRequest) {
  const { export_options, chart_config } = exportRequest
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')

  // Generate filename with timestamp and configuration
  const sensorCount = chart_config.sensors.length
  const dateRange = `${new Date(chart_config.start_date).toLocaleDateString().replace(/\//g, '-')}_to_${new Date(chart_config.end_date).toLocaleDateString().replace(/\//g, '-')}`
  const filename = `bangkok-timeseries_${sensorCount}sensors_${dateRange}_${timestamp}.${export_options.format}`

  // For demo purposes, we'll create a mock export
  // In production, implement actual chart rendering
  const mockExportData = await createMockExport(exportRequest, filename)

  return {
    url: mockExportData.downloadUrl,
    filename: filename,
    size: mockExportData.size
  }
}

/**
 * Create mock export for demonstration
 * In production, replace with actual chart rendering
 */
async function createMockExport(exportRequest: ExportRequest, filename: string) {
  const { export_options, title, chart_config } = exportRequest

  // Simulate export generation time based on quality and format
  const processingTime = export_options.quality === 'high' ? 2000 :
                        export_options.quality === 'medium' ? 1000 : 500

  await new Promise(resolve => setTimeout(resolve, processingTime))

  // Create mock export metadata
  const mockExport = {
    downloadUrl: `/api/export/download/${encodeURIComponent(filename)}`,
    size: export_options.format === 'pdf' ?
      Math.floor(200000 + Math.random() * 300000) : // PDF: 200-500KB
      Math.floor(100000 + Math.random() * 200000),  // PNG: 100-300KB
    metadata: {
      title,
      sensors: chart_config.sensors,
      date_range: {
        start: chart_config.start_date,
        end: chart_config.end_date
      },
      format: export_options.format,
      dimensions: {
        width: export_options.width,
        height: export_options.height
      },
      quality: export_options.quality,
      generated_at: new Date().toISOString(),
      branding: {
        logo: 'CU-BEMS Analytics Platform',
        footer: 'Bangkok IoT Dataset Analysis',
        watermark: export_options.format === 'png' ? 'Draft' : undefined
      }
    }
  }

  // In production, save the export file to storage (S3, local filesystem, etc.)
  // and return the actual download URL

  return mockExport
}

/**
 * GET endpoint for downloading generated exports
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json({
        success: false,
        error: 'Filename required'
      }, { status: 400 })
    }

    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    // In production, retrieve the file from storage and stream it
    // For demo, return mock download info
    return NextResponse.json({
      success: true,
      message: 'Export ready for download',
      filename,
      note: 'This is a demo implementation. In production, this would stream the actual file.'
    })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({
      success: false,
      error: 'Download failed'
    }, { status: 500 })
  }
}