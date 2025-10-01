/**
 * Epic 2 Story 2.3: Export Functionality for Professional Tier
 * API endpoint for creating export jobs with ExportManager integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { ExportManager } from '@/src/lib/export/export-manager'
import { validateAPIKey } from '@/src/lib/api/authentication'
import { checkRateLimit } from '@/src/lib/api/rate-limiting'

export async function POST(request: NextRequest) {
  try {
    // Professional tier authentication check
    const session = await getServerSession(authOptions)
    let userId: string
    let userTier: string

    if (session?.user) {
      // Web session authentication
      userId = session.user.id
      userTier = session.user.subscriptionTier || 'FREE'

      if (userTier === 'FREE') {
        return NextResponse.json(
          { success: false, error: 'Professional subscription required for exports' },
          { status: 403 }
        )
      }
    } else {
      // API key authentication
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const apiKey = authHeader.substring(7)
      const apiValidation = await validateAPIKey(apiKey)

      if (!apiValidation.valid) {
        return NextResponse.json(
          { success: false, error: 'Invalid API key' },
          { status: 401 }
        )
      }

      if (apiValidation.tier === 'FREE') {
        return NextResponse.json(
          { success: false, error: 'Professional API key required for exports' },
          { status: 403 }
        )
      }

      userId = apiValidation.userId
      userTier = apiValidation.tier
    }

    // Check export usage limits
    const { exportUsageTrackingService } = await import('@/src/lib/export/usage-tracking-service')
    const usageCheck = await exportUsageTrackingService.canUserExport(userId, userTier)

    if (!usageCheck.canExport) {
      return NextResponse.json(
        {
          success: false,
          error: usageCheck.message || 'Export limit exceeded',
          usage: {
            current: usageCheck.currentCount,
            limit: usageCheck.limit,
            percentageUsed: usageCheck.percentageUsed,
            resetsAt: usageCheck.resetsAt
          }
        },
        { status: 429 }
      )
    }

    // Rate limiting check
    const rateLimitResult = await checkRateLimit(userId, 'export', {
      maxRequests: 10,
      windowMs: 60000 // 1 minute
    })

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Export rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter
        },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { format, template, dateRange } = body

    // Validate request
    if (!format || !['pdf', 'csv', 'excel'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Must be pdf, csv, or excel' },
        { status: 400 }
      )
    }

    // Validate format is allowed for tier
    const formatAllowed = await exportUsageTrackingService.isFormatAllowed(userTier, format)
    if (!formatAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: `${format.toUpperCase()} export not available for ${userTier} tier. Upgrade to access this format.`
        },
        { status: 403 }
      )
    }

    if (!template || !['executive', 'technical', 'compliance', 'raw_data'].includes(template)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template. Must be executive, technical, compliance, or raw_data' },
        { status: 400 }
      )
    }

    if (!dateRange || !dateRange.start || !dateRange.end) {
      return NextResponse.json(
        { success: false, error: 'Date range required with start and end dates' },
        { status: 400 }
      )
    }

    // Validate Bangkok dataset date range (2018-2019)
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    const minDate = new Date('2018-01-01')
    const maxDate = new Date('2019-06-30')

    if (startDate < minDate || endDate > maxDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Date range must be within Bangkok study period (Jan 2018 - Jun 2019)'
        },
        { status: 400 }
      )
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { success: false, error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    // Create export job using ExportManager
    const exportManager = ExportManager.getInstance()
    const job = await exportManager.createExportJob(userId, format, template, dateRange)

    // Record job in database for usage tracking
    await exportUsageTrackingService.recordExportJob(
      job.id,
      userId,
      format,
      { template, dateRange },
      userTier
    )

    // Log export creation
    await exportUsageTrackingService.logExportAction(userId, job.id, 'created', {
      format,
      template,
      dateRange
    })

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        format: job.format,
        template: job.template,
        dateRange: job.dateRange,
        createdAt: job.createdAt
      }
    })

  } catch (error) {
    console.error('Export creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get export history for authenticated user
    const session = await getServerSession(authOptions)
    let userId: string

    if (session?.user) {
      // Web session authentication
      userId = session.user.id
      const userTier = session.user.subscriptionTier || 'FREE'

      if (userTier === 'FREE') {
        return NextResponse.json(
          { success: false, error: 'Professional subscription required' },
          { status: 403 }
        )
      }
    } else {
      // API key authentication
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const apiKey = authHeader.substring(7)
      const apiValidation = await validateAPIKey(apiKey)

      if (!apiValidation.valid) {
        return NextResponse.json(
          { success: false, error: 'Invalid API key' },
          { status: 401 }
        )
      }

      if (apiValidation.tier === 'FREE') {
        return NextResponse.json(
          { success: false, error: 'Professional subscription required' },
          { status: 403 }
        )
      }

      userId = apiValidation.userId
    }

    const exportManager = ExportManager.getInstance()
    const history = exportManager.getUserExportHistory(userId)

    return NextResponse.json({
      success: true,
      data: history
    })

  } catch (error) {
    console.error('Export history error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

