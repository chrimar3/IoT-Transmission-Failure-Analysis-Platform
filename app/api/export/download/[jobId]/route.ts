/**
 * Epic 2 Story 2.3: Export Functionality for Professional Tier
 * API endpoint for downloading export files with security validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { ExportManager } from '@/src/lib/export/export-manager'
import { exportStorageService } from '@/src/lib/export/storage-service'
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
          { success: false, error: 'Professional subscription required for export downloads' },
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
          { success: false, error: 'Professional API key required for export downloads' },
          { status: 403 }
        )
      }

      userId = apiValidation.userId
      userTier = apiValidation.tier
    }

    // Get export job
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
        { success: false, error: 'Access denied - job belongs to different user' },
        { status: 403 }
      )
    }

    // Check job is completed
    if (job.status !== 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: `Export job is ${job.status}. Please wait for completion.`,
          status: job.status,
          progress: job.progress
        },
        { status: 400 }
      )
    }

    // Check if downloadUrl exists and is still valid
    if (!job.downloadUrl) {
      return NextResponse.json(
        { success: false, error: 'Download URL not available' },
        { status: 404 }
      )
    }

    // For jobs completed recently (within 7 days), return existing URL
    const completedAt = new Date(job.completedAt || job.createdAt)
    const now = new Date()
    const daysSinceCompletion = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceCompletion <= 7) {
      // Track download analytics
      console.log(`Export download: User ${userId}, Job ${jobId}, Format ${job.format}`)

      return NextResponse.json({
        success: true,
        data: {
          jobId: job.id,
          downloadUrl: job.downloadUrl,
          format: job.format,
          template: job.template,
          fileSize: job.downloadUrl.length, // Approximate
          expiresAt: new Date(completedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: job.createdAt,
          completedAt: job.completedAt
        }
      })
    } else {
      // File expired
      return NextResponse.json(
        {
          success: false,
          error: 'Export file has expired (older than 7 days). Please create a new export.',
          expiryInfo: {
            completedAt: job.completedAt,
            expiryDate: new Date(completedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        },
        { status: 410 } // HTTP 410 Gone
      )
    }

  } catch (error) {
    console.error('Export download error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint to regenerate expired download URL
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    if (session?.user) {
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

      if (!apiValidation.valid || apiValidation.tier === 'FREE') {
        return NextResponse.json(
          { success: false, error: 'Professional subscription required' },
          { status: 403 }
        )
      }

      userId = apiValidation.userId
    }

    // Get export job
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

    // Check if job has file key stored (for regenerating signed URL)
    // This would be stored in job metadata in production
    const body = await request.json()
    const fileKey = body.fileKey || job.downloadUrl

    if (!fileKey) {
      return NextResponse.json(
        { success: false, error: 'Cannot regenerate URL - file key not found' },
        { status: 404 }
      )
    }

    // Generate new signed URL
    const signedUrlResult = await exportStorageService.generateSignedUrl(fileKey)

    if (!signedUrlResult.success || !signedUrlResult.signedUrl) {
      return NextResponse.json(
        {
          success: false,
          error: signedUrlResult.error || 'Failed to generate signed URL'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        downloadUrl: signedUrlResult.signedUrl,
        expiresAt: signedUrlResult.expiresAt,
        format: job.format,
        template: job.template
      }
    })

  } catch (error) {
    console.error('Download URL regeneration error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}