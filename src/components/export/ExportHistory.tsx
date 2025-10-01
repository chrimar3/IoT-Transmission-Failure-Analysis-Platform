/**
 * Epic 2 Story 2.3: Export Functionality for Professional Tier
 * Export History Component showing user's past exports
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ExportJob } from '@/src/lib/export/export-manager'

interface ExportHistoryProps {
  onExportClick?: () => void
}

export default function ExportHistory({ onExportClick }: ExportHistoryProps) {
  const { data: session } = useSession()
  const [exports, setExports] = useState<ExportJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isProfessional = session?.user?.subscriptionTier === 'PROFESSIONAL'

  useEffect(() => {
    if (isProfessional) {
      fetchExportHistory()
    } else {
      setLoading(false)
    }
  }, [isProfessional])

  const fetchExportHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/export/create')
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch export history')
      }

      setExports(result.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exports')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (downloadUrl: string) => {
    window.open(downloadUrl, '_blank')
  }

  const formatFileSize = (job: ExportJob): string => {
    // Estimate file size based on format and date range
    const days = Math.ceil(
      (new Date(job.dateRange.end).getTime() - new Date(job.dateRange.start).getTime())
      / (1000 * 60 * 60 * 24)
    )

    let baseSize = days * 0.1 // Base size in MB

    switch (job.format) {
      case 'pdf':
        baseSize *= 0.5
        break
      case 'excel':
        baseSize *= 2
        break
      case 'csv':
        baseSize *= 1
        break
    }

    return baseSize < 1 ? `${Math.round(baseSize * 1000)} KB` : `${baseSize.toFixed(1)} MB`
  }

  const getStatusBadge = (status: ExportJob['status']) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"

    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'processing':
        return `${baseClasses} bg-blue-100 text-blue-800`
      case 'queued':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return '📄'
      case 'csv':
        return '📊'
      case 'excel':
        return '📈'
      default:
        return '📎'
    }
  }

  if (!isProfessional) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.134 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Professional Tier Required</h3>
            <p className="mt-1 text-sm text-gray-500">
              Export history is available for Professional subscribers.
            </p>
            <div className="mt-6">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upgrade to Professional
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 bg-gray-300 rounded w-32"></div>
              <div className="h-8 bg-gray-300 rounded w-24"></div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-gray-300 rounded"></div>
                    <div>
                      <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-32"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-300 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Exports</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button
                onClick={fetchExportHistory}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Export History</h2>
            <p className="text-sm text-gray-500">
              Your recent Bangkok dataset exports
            </p>
          </div>
          <button
            onClick={onExportClick}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Export
          </button>
        </div>

        {exports.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No exports yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first Bangkok dataset export to get started.
            </p>
            <div className="mt-6">
              <button
                onClick={onExportClick}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Create Export
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {exports.map((exportJob) => (
              <div
                key={exportJob.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{getFormatIcon(exportJob.format)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {exportJob.format.toUpperCase()} Export - {exportJob.template}
                      </h3>
                      <span className={getStatusBadge(exportJob.status)}>
                        {exportJob.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span>
                        {exportJob.dateRange.start} to {exportJob.dateRange.end}
                      </span>
                      <span>•</span>
                      <span>{formatFileSize(exportJob)}</span>
                      <span>•</span>
                      <span>{new Date(exportJob.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {exportJob.status === 'processing' && (
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${exportJob.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{exportJob.progress}%</span>
                    </div>
                  )}

                  {exportJob.status === 'completed' && exportJob.downloadUrl && (
                    <button
                      onClick={() => handleDownload(exportJob.downloadUrl!)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </button>
                  )}

                  {exportJob.status === 'failed' && (
                    <div className="flex items-center text-red-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs">Failed</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {exports.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Showing {exports.length} export{exports.length !== 1 ? 's' : ''}</span>
              <button
                onClick={fetchExportHistory}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}