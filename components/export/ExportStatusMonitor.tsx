/**
 * Export Status Monitor Component
 * Story 3.4: Data Export and Reporting
 *
 * Real-time monitoring of export job progress with download capabilities
 */

import React, { useState, useEffect, useCallback } from 'react'
import type {
  ExportStatusResponse,
  ExportJob,
  _ProcessingInfo
} from '../../types/export'

interface ExportStatusMonitorProps {
  jobId: number
  onComplete?: (job: ExportJob) => void
  onError?: (error: string) => void
  autoRefresh?: boolean
  refreshInterval?: number
}

export function ExportStatusMonitor({
  jobId,
  onComplete,
  onError,
  autoRefresh = true,
  refreshInterval = 2000
}: ExportStatusMonitorProps) {
  const [status, setStatus] = useState<ExportStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/export/status/${jobId}`)
      const result = await response.json()

      if (result.success) {
        setStatus(result)
        setError(null)

        // Handle completion
        if (result.status === 'completed' && onComplete) {
          onComplete(result)
        }

        // Handle errors
        if (result.status === 'failed' && result.error_message && onError) {
          onError(result.error_message)
        }
      } else {
        setError(result.error || 'Failed to fetch status')
        if (onError) {
          onError(result.error || 'Failed to fetch status')
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setError(errorMessage)
      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }, [jobId, onComplete, onError])

  useEffect(() => {
    fetchStatus()

    if (autoRefresh) {
      const interval = setInterval(() => {
        if (status?.status === 'processing' || status?.status === 'pending') {
          fetchStatus()
        }
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [fetchStatus, autoRefresh, refreshInterval, status?.status])

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/export/download/${jobId}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url

        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition')
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
        a.download = filenameMatch?.[1] || `export_${jobId}.${status?.file_url?.split('.').pop() || 'csv'}`

        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorResult = await response.json()
        setError(errorResult.error || 'Download failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    }
  }

  const getStatusIcon = () => {
    switch (status?.status) {
      case 'pending':
        return '⏳'
      case 'processing':
        return '⚙️'
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      default:
        return '❓'
    }
  }

  const getStatusColor = () => {
    switch (status?.status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'processing':
        return 'text-blue-600 bg-blue-100'
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatEstimatedTime = (isoString?: string) => {
    if (!isoString) return 'Unknown'

    const now = new Date()
    const estimatedTime = new Date(isoString)
    const diffMs = estimatedTime.getTime() - now.getTime()
    const diffMinutes = Math.ceil(diffMs / (1000 * 60))

    if (diffMinutes <= 0) return 'Any moment now'
    if (diffMinutes === 1) return '1 minute'
    if (diffMinutes < 60) return `${diffMinutes} minutes`

    const diffHours = Math.ceil(diffMinutes / 60)
    return diffHours === 1 ? '1 hour' : `${diffHours} hours`
  }

  const formatFileSize = (sizeBytes?: number) => {
    if (!sizeBytes) return 'Unknown'

    const sizeMB = sizeBytes / (1024 * 1024)
    if (sizeMB < 1) return `${Math.round(sizeBytes / 1024)} KB`
    if (sizeMB < 1000) return `${sizeMB.toFixed(1)} MB`

    const sizeGB = sizeMB / 1024
    return `${sizeGB.toFixed(1)} GB`
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading export status...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex items-center text-red-600">
          <span className="text-2xl mr-3">❌</span>
          <div>
            <h3 className="font-medium">Error Loading Status</h3>
            <p className="text-sm text-red-500 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <span className="text-2xl block mb-2">❓</span>
          <p>Export status not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{getStatusIcon()}</span>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Export Job #{jobId}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
            </span>
          </div>
        </div>

        {status.status === 'completed' && (
          <button
            onClick={handleDownload}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {(status.status === 'processing' || status.status === 'pending') && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{status.progress_percent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${status.progress_percent}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Status Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Export Details</h4>
          <div className="space-y-1 text-sm text-gray-600">
            {status.file_size && (
              <div>File Size: {formatFileSize(status.file_size)}</div>
            )}
            {status.estimated_completion_time && status.status === 'processing' && (
              <div>Estimated Completion: {formatEstimatedTime(status.estimated_completion_time)}</div>
            )}
          </div>
        </div>

        {status.processing_info && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Processing Info</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div>
                Records: {status.processing_info.records_processed?.toLocaleString()} of {status.processing_info.total_records?.toLocaleString()}
              </div>
              <div>Current Phase: {status.processing_info.current_phase}</div>
              <div>Memory Usage: {Math.round(status.processing_info.memory_usage_mb || 0)} MB</div>
              <div>Elapsed Time: {Math.floor((status.processing_info.elapsed_time_seconds || 0) / 60)}m {((status.processing_info.elapsed_time_seconds || 0) % 60)}s</div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {status.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <span className="text-red-400 text-xl mr-3">⚠️</span>
            <div>
              <h4 className="text-sm font-medium text-red-800">Export Failed</h4>
              <p className="text-sm text-red-700 mt-1">{status.error_message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Processing Phase Indicator */}
      {status.processing_info?.current_phase && status.status === 'processing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-800 text-sm font-medium">
              {status.processing_info.current_phase}
            </span>
          </div>
        </div>
      )}

      {/* Auto-refresh indicator */}
      {autoRefresh && (status.status === 'processing' || status.status === 'pending') && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Auto-refreshing every {refreshInterval / 1000} seconds</span>
            <button
              onClick={fetchStatus}
              className="text-blue-600 hover:text-blue-700"
            >
              Refresh now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Export List Component for managing multiple exports
interface ExportListProps {
  exports: Array<{ job_id: number; created_at: string; status: string; format: string }>
  onSelectExport?: (jobId: number) => void
}

export function ExportList({ exports, onSelectExport }: ExportListProps) {
  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString()
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Exports</h3>
      </div>

      <div className="divide-y divide-gray-200">
        {exports.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <span className="text-4xl block mb-2">📊</span>
            <p>No exports yet</p>
            <p className="text-sm">Create your first data export to get started</p>
          </div>
        ) : (
          exports.map((exportJob) => (
            <div
              key={exportJob.job_id}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelectExport?.(exportJob.job_id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900">
                      Export #{exportJob.job_id}
                    </span>
                    <span className="ml-2 text-sm text-gray-500 uppercase">
                      {exportJob.format}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Created {formatDate(exportJob.created_at)}
                  </div>
                </div>
                <div className="flex items-center">
                  {getStatusBadge(exportJob.status)}
                  <svg className="ml-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}