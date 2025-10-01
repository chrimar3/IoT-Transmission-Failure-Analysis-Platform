/**
 * Epic 2 Story 2.3: Export Functionality for Professional Tier
 * Export Modal Component with format selection and progress tracking
 */

'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { ExportJob } from '@/src/lib/export/export-manager'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade?: () => void
}


const formatOptions = [
  {
    id: 'pdf' as const,
    name: 'PDF Report',
    description: 'Executive summary with charts and branding',
    icon: '📄',
    size: '2-5 MB'
  },
  {
    id: 'csv' as const,
    name: 'CSV Data',
    description: 'Raw data with statistical metadata',
    icon: '📊',
    size: '1-10 MB'
  },
  {
    id: 'excel' as const,
    name: 'Excel Workbook',
    description: 'Multi-sheet analysis with charts',
    icon: '📈',
    size: '3-15 MB'
  }
]

const templateOptions = [
  {
    id: 'executive' as const,
    name: 'Executive Summary',
    description: 'High-level insights for decision makers'
  },
  {
    id: 'technical' as const,
    name: 'Technical Report',
    description: 'Detailed analysis with methodology'
  },
  {
    id: 'compliance' as const,
    name: 'Compliance Report',
    description: 'Regulatory-grade documentation'
  },
  {
    id: 'raw_data' as const,
    name: 'Raw Data Export',
    description: 'Unprocessed Bangkok dataset'
  }
]

export default function ExportModal({ isOpen, onClose, onUpgrade }: ExportModalProps) {
  const { data: session } = useSession()
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf')
  const [selectedTemplate, setSelectedTemplate] = useState<'executive' | 'technical' | 'compliance' | 'raw_data'>('executive')
  const [dateRange, setDateRange] = useState({
    start: '2018-01-01',
    end: '2019-06-30'
  })
  const [isExporting, setIsExporting] = useState(false)
  const [exportJob, setExportJob] = useState<ExportJob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isProfessional = session?.user?.subscriptionTier?.toUpperCase() === 'PROFESSIONAL'

  const handleExport = async () => {
    if (!isProfessional) {
      onUpgrade?.()
      return
    }

    setIsExporting(true)
    setError(null)

    try {
      const response = await fetch('/api/export/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: selectedFormat,
          template: selectedTemplate,
          dateRange
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Export creation failed')
      }

      setExportJob(result.data)
      startPollingJobStatus(result.data.jobId)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const startPollingJobStatus = (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/export/status/${jobId}`)
        const result = await response.json()

        if (result.success && result.data) {
          setExportJob(result.data)

          if (result.data.status === 'completed') {
            clearInterval(pollInterval)
          } else if (result.data.status === 'failed') {
            clearInterval(pollInterval)
            setError(result.data.error || 'Export processing failed')
          }
        }
      } catch (err) {
        console.error('Failed to poll job status:', err)
      }
    }, 2000)

    // Clear interval after 5 minutes to prevent infinite polling
    setTimeout(() => clearInterval(pollInterval), 300000)
  }

  const handleDownload = () => {
    if (exportJob?.downloadUrl) {
      window.open(exportJob.downloadUrl, '_blank')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Export Bangkok Dataset
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!isProfessional && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Professional Tier Required
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Export functionality is available for Professional subscribers (€29/month).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {exportJob ? (
            <ExportProgress job={exportJob} onDownload={handleDownload} />
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Export Format
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {formatOptions.map((format) => (
                    <div
                      key={format.id}
                      className={`relative rounded-lg border p-4 cursor-pointer ${
                        selectedFormat === format.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      } ${!isProfessional ? 'opacity-50' : ''}`}
                      onClick={() => isProfessional && setSelectedFormat(format.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{format.icon}</span>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {format.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {format.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Est. size:</p>
                          <p className="text-sm font-medium text-gray-900">{format.size}</p>
                        </div>
                      </div>
                      {selectedFormat === format.id && (
                        <div className="absolute top-4 right-4">
                          <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                              <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z"/>
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Report Template
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {templateOptions.map((template) => (
                    <div
                      key={template.id}
                      className={`relative rounded-lg border p-3 cursor-pointer ${
                        selectedTemplate === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      } ${!isProfessional ? 'opacity-50' : ''}`}
                      onClick={() => isProfessional && setSelectedTemplate(template.id)}
                    >
                      <h3 className="text-sm font-medium text-gray-900">
                        {template.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {template.description}
                      </p>
                      {selectedTemplate === template.id && (
                        <div className="absolute top-2 right-2">
                          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Date Range (Bangkok Study Period)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      min="2018-01-01"
                      max="2019-06-30"
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      disabled={!isProfessional}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      min="2018-01-01"
                      max="2019-06-30"
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      disabled={!isProfessional}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Bangkok University dataset covers January 2018 - June 2019 (18 months)
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>

          {!exportJob && (
            <button
              onClick={isProfessional ? handleExport : onUpgrade}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isExporting && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isProfessional
                ? (isExporting ? 'Creating Export...' : 'Create Export')
                : 'Upgrade for €29/month'
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface ExportProgressProps {
  job: ExportJob
  onDownload: () => void
}

function ExportProgress({ job, onDownload }: ExportProgressProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'processing':
        return 'text-blue-600'
      default:
        return 'text-yellow-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      case 'processing':
        return '⏳'
      default:
        return '🔄'
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-2">{getStatusIcon(job.status)}</div>
        <h3 className="text-lg font-semibold text-gray-900">
          Export {job.status === 'completed' ? 'Complete' : 'In Progress'}
        </h3>
        <p className="text-sm text-gray-500">
          {job.format.toUpperCase()} • {job.template} template
        </p>
      </div>

      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{job.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${job.progress}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium ${getStatusColor(job.status)}`}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Created:</span>
          <span className="text-gray-900">
            {new Date(job.createdAt).toLocaleString()}
          </span>
        </div>
        {job.completedAt && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Completed:</span>
            <span className="text-gray-900">
              {new Date(job.completedAt).toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Date Range:</span>
          <span className="text-gray-900">
            {job.dateRange.start} to {job.dateRange.end}
          </span>
        </div>
      </div>

      {job.status === 'completed' && job.downloadUrl && (
        <div className="text-center">
          <button
            onClick={onDownload}
            className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Export
          </button>
        </div>
      )}

      {job.status === 'failed' && job.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{job.error}</p>
        </div>
      )}
    </div>
  )
}