/**
 * Export Download API Endpoint
 * GET /api/export/download/[job_id] - Download completed export files
 */

import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: { job_id: string }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const jobId = parseInt(params.job_id)
    const userId = await getUserFromAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get export job and verify access
    const job = await getExportJob(jobId, userId)
    if (!job) {
      return NextResponse.json({ error: 'Export job not found' }, { status: 404 })
    }

    if (job.status !== 'completed') {
      return NextResponse.json({ error: 'Export not ready for download' }, { status: 400 })
    }

    // Stream file for download
    const fs = await import('fs')
    const fileStream = fs.createReadStream(job.file_path!)

    return new NextResponse(fileStream as ReadableStream, {
      headers: {
        'Content-Type': getContentType(job.export_format),
        'Content-Disposition': `attachment; filename="${getFileName(job)}"`,
        'Content-Length': job.file_size?.toString() || '0'
      }
    })

  } catch (_error) {
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}

async function getUserFromAuth(_request: NextRequest): Promise<string | null> {
  return 'mock-user-id'
}

async function getExportJob(jobId: number, userId: string): Promise<{ id: number; user_id: string; status: string; export_format: string; file_path: string; file_size: number; created_at: string }> {
  return {
    id: jobId,
    user_id: userId,
    status: 'completed',
    export_format: 'csv',
    file_path: `/tmp/export_${jobId}.csv`,
    file_size: 1024 * 1024,
    created_at: new Date().toISOString()
  }
}

function getContentType(format: string): string {
  const types = {
    csv: 'text/csv',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf'
  }
  return types[format as keyof typeof types] || 'application/octet-stream'
}

function getFileName(job: { id: number; export_format: string }): string {
  const ext = job.export_format === 'excel' ? 'xlsx' : job.export_format
  return `sensor_export_${job.id}.${ext}`
}