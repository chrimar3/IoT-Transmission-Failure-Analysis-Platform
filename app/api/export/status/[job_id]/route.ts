/**
 * Export Status API Endpoint
 * Story 3.4: Data Export and Reporting
 *
 * GET /api/export/status/[job_id]
 * Returns real-time status and progress of export jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import type {
  ExportStatusResponse,
  ExportJob,
  ProcessingInfo
} from '../../../../../types/export'

interface RouteParams {
  params: { job_id: string }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const jobId = parseInt(params.job_id)

    if (isNaN(jobId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid job ID' },
        { status: 400 }
      )
    }

    // Verify user has access to this job
    const userId = await getUserFromAuth(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get export job details
    const exportJob = await getExportJob(jobId, userId)
    if (!exportJob) {
      return NextResponse.json(
        { success: false, error: 'Export job not found' },
        { status: 404 }
      )
    }

    // Get real-time processing information
    const processingInfo = await getProcessingInfo(jobId)

    // Build status response
    const statusResponse: ExportStatusResponse = {
      status: exportJob.status,
      progress_percent: exportJob.progress_percent,
      estimated_completion_time: calculateEstimatedCompletion(exportJob, processingInfo),
      file_url: exportJob.status === 'completed' ? exportJob.file_url : undefined,
      file_size: exportJob.file_size,
      error_message: exportJob.error_message,
      processing_info: processingInfo
    }

    return NextResponse.json({
      success: true,
      job_id: jobId,
      ...statusResponse
    })

  } catch (error) {
    console.error('Status check failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

/**
 * Extract user ID from authentication
 */
async function getUserFromAuth(request: NextRequest): Promise<string | null> {
  // Mock implementation - would integrate with NextAuth.js
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return 'mock-user-id'
  }
  return null
}

/**
 * Get export job by ID and user
 */
async function getExportJob(jobId: number, userId: string): Promise<ExportJob | null> {
  // In real implementation, this would query the database:
  /*
  const result = await db.query(`
    SELECT
      id, user_id, job_type, export_format, status,
      file_path, file_size, file_url, parameters,
      progress_percent, created_at, completed_at,
      error_message, delivery_method, email_status
    FROM export_jobs
    WHERE id = $1 AND user_id = $2
  `, [jobId, userId])

  if (result.rows.length === 0) {
    return null
  }

  return result.rows[0]
  */

  // Mock implementation
  if (jobId === 404) {
    return null // Simulate not found
  }

  return {
    id: jobId,
    user_id: userId,
    job_type: 'manual',
    export_format: 'csv',
    status: jobId % 4 === 0 ? 'completed' : jobId % 3 === 0 ? 'processing' : jobId % 2 === 0 ? 'failed' : 'pending',
    file_path: jobId % 4 === 0 ? `/exports/job_${jobId}.csv` : undefined,
    file_size: jobId % 4 === 0 ? 1024 * 1024 * 2.5 : undefined, // 2.5MB
    file_url: jobId % 4 === 0 ? `https://storage.example.com/exports/job_${jobId}.csv` : undefined,
    parameters: {
      filters: {
        sensor_ids: ['SENSOR_001', 'SENSOR_002'],
        date_range: {
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        }
      },
      estimated_records: 25000
    },
    progress_percent: jobId % 4 === 0 ? 100 : jobId % 3 === 0 ? 65 : jobId % 2 === 0 ? 0 : 0,
    created_at: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    completed_at: jobId % 4 === 0 ? new Date().toISOString() : undefined,
    error_message: jobId % 2 === 0 && jobId % 4 !== 0 ? 'Database connection timeout' : undefined,
    delivery_method: 'download'
  }
}

/**
 * Get real-time processing information
 */
async function getProcessingInfo(jobId: number): Promise<ProcessingInfo | undefined> {
  // In real implementation, this would:
  // 1. Check job queue for processing status
  // 2. Query Redis for real-time metrics
  // 3. Get worker process information

  const job = await getExportJob(jobId, 'mock-user-id')
  if (!job || job.status !== 'processing') {
    return undefined
  }

  // Mock processing info
  return {
    records_processed: Math.floor((job.parameters.estimated_records || 0) * (job.progress_percent / 100)),
    total_records: job.parameters.estimated_records || 0,
    current_phase: getProcessingPhase(job.progress_percent),
    memory_usage_mb: 245 + Math.random() * 50, // Simulate fluctuating memory usage
    elapsed_time_seconds: Math.floor((Date.now() - new Date(job.created_at).getTime()) / 1000)
  }
}

/**
 * Determine current processing phase based on progress
 */
function getProcessingPhase(progressPercent: number): string {
  if (progressPercent < 5) return 'Initializing export job'
  if (progressPercent < 15) return 'Validating data filters'
  if (progressPercent < 25) return 'Querying sensor database'
  if (progressPercent < 60) return 'Processing sensor data'
  if (progressPercent < 80) return 'Generating export file'
  if (progressPercent < 95) return 'Applying formatting and compression'
  return 'Finalizing export'
}

/**
 * Calculate estimated completion time
 */
function calculateEstimatedCompletion(
  job: ExportJob,
  processingInfo?: ProcessingInfo
): string | undefined {
  if (job.status === 'completed' || job.status === 'failed') {
    return undefined
  }

  if (!processingInfo) {
    // Fallback estimation based on job type
    const baseEstimate = job.export_format === 'pdf' ? 300 : job.export_format === 'excel' ? 180 : 120 // seconds
    return new Date(Date.now() + baseEstimate * 1000).toISOString()
  }

  // Calculate based on current progress
  const { records_processed, total_records, elapsed_time_seconds } = processingInfo

  if (records_processed === 0 || elapsed_time_seconds === 0) {
    return undefined
  }

  const recordsPerSecond = records_processed / elapsed_time_seconds
  const remainingRecords = total_records - records_processed
  const estimatedRemainingSeconds = remainingRecords / recordsPerSecond

  // Add buffer for file generation and cleanup
  const bufferSeconds = job.export_format === 'pdf' ? 60 : 30
  const totalRemainingSeconds = estimatedRemainingSeconds + bufferSeconds

  return new Date(Date.now() + totalRemainingSeconds * 1000).toISOString()
}

/**
 * Update job progress (called by background workers)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const jobId = parseInt(params.job_id)
    const updates = await request.json()

    // Verify this is an internal request (would check API key or internal token)
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update job progress in database
    await updateJobProgress(jobId, updates)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Progress update failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * Update job progress in database
 */
interface JobProgressUpdate {
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  file_url?: string;
  error_message?: string;
  completed_at?: string;
}

async function updateJobProgress(jobId: number, updates: JobProgressUpdate): Promise<void> {
  // In real implementation, this would update the database:
  /*
  const updateFields = []
  const values = [jobId]
  let paramIndex = 2

  if (updates.status) {
    updateFields.push(`status = $${paramIndex}`)
    values.push(updates.status)
    paramIndex++
  }

  if (updates.progress_percent !== undefined) {
    updateFields.push(`progress_percent = $${paramIndex}`)
    values.push(updates.progress_percent)
    paramIndex++
  }

  if (updates.file_path) {
    updateFields.push(`file_path = $${paramIndex}`)
    values.push(updates.file_path)
    paramIndex++
  }

  if (updates.file_size) {
    updateFields.push(`file_size = $${paramIndex}`)
    values.push(updates.file_size)
    paramIndex++
  }

  if (updates.error_message) {
    updateFields.push(`error_message = $${paramIndex}`)
    values.push(updates.error_message)
    paramIndex++
  }

  if (updates.status === 'completed') {
    updateFields.push(`completed_at = NOW()`)
  }

  if (updateFields.length > 0) {
    await db.query(`
      UPDATE export_jobs
      SET ${updateFields.join(', ')}
      WHERE id = $1
    `, values)
  }
  */

  console.log(`Updated job ${jobId} progress:`, updates)
}

