/**
 * Epic 2 Story 2.3: Export Functionality for Professional Tier
 * API endpoint for checking export job status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { ExportManager } from '@/src/lib/export/export-manager'
import { validateAPIKey } from '@/src/lib/api/authentication'

interface RouteParams {
  params: {
    jobId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = params

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      )
    }

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
          { success: false, error: 'Professional subscription required for export status' },
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
          { success: false, error: 'Professional API key required for export status' },
          { status: 403 }
        )
      }

      userId = apiValidation.userId
      userTier = apiValidation.tier
    }

    const exportManager = ExportManager.getInstance()
    const job = exportManager.getExportJob(jobId)

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Export job not found' },
        { status: 404 }
      )
    }

    // Verify job belongs to authenticated user
    if (job.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        format: job.format,
        template: job.template,
        dateRange: job.dateRange,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        downloadUrl: job.downloadUrl,
        error: job.error
      }
    })

  } catch (error) {
    console.error('Export status error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}