/**
 * Chart Export Button Component
 * Story 3.2: Interactive Time-Series Visualizations
 *
 * Features:
 * - PNG/PDF export options
 * - Professional tier verification
 * - Progress tracking and error handling
 * - Custom export configurations
 */

'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Download,
  FileImage,
  FileText,
  Settings,
  Crown,
  Loader2,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react'
import type { ChartConfiguration, ChartExportOptions, ExportRequest } from '@/types/analytics'

interface ChartExportButtonProps {
  chartConfig: ChartConfiguration
  onExportComplete?: (downloadUrl: string, filename: string) => void
  disabled?: boolean
  className?: string
}

interface ExportProgress {
  status: 'idle' | 'configuring' | 'exporting' | 'complete' | 'error'
  message: string
  progress: number
}

export default function ChartExportButton({
  chartConfig,
  onExportComplete,
  disabled = false,
  className = ''
}: ChartExportButtonProps) {
  const { data: session } = useSession()
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    status: 'idle',
    message: '',
    progress: 0
  })

  // Export configuration state
  const [exportConfig, setExportConfig] = useState<ChartExportOptions>({
    format: 'png',
    title: `Bangkok Time-Series Analysis - ${new Date().toLocaleDateString()}`,
    include_timestamp: true,
    include_data_range: true,
    quality: 'high',
    width: 1200,
    height: 800
  })

  // Check if user has export permissions
  const canExport = session?.user &&
    (session.user.subscriptionTier === 'professional')

  // Handle export initiation
  const handleExportClick = () => {
    if (!canExport) {
      setExportProgress({
        status: 'error',
        message: 'Professional subscription required for chart export',
        progress: 0
      })
      return
    }

    setShowExportModal(true)
    setExportProgress({
      status: 'configuring',
      message: 'Configure export settings',
      progress: 0
    })
  }

  // Execute the export
  const executeExport = async () => {
    setExportProgress({
      status: 'exporting',
      message: 'Generating chart export...',
      progress: 25
    })

    try {
      // Prepare export request
      const exportRequest: ExportRequest = {
        chart_config: chartConfig,
        export_options: exportConfig,
        title: exportConfig.title
      }

      // Update progress
      setExportProgress(prev => ({ ...prev, progress: 50, message: 'Processing chart data...' }))

      // Call export API
      const response = await fetch('/api/export/chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      })

      setExportProgress(prev => ({ ...prev, progress: 75, message: 'Finalizing export...' }))

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Export failed')
      }

      // Success
      setExportProgress({
        status: 'complete',
        message: `Export ready: ${result.data.filename}`,
        progress: 100
      })

      // Trigger download
      if (result.data.download_url) {
        // In a real implementation, this would trigger a file download
        console.log('Download URL:', result.data.download_url)
        onExportComplete?.(result.data.download_url, result.data.filename)
      }

      // Auto-close modal after success
      setTimeout(() => {
        setShowExportModal(false)
        setExportProgress({ status: 'idle', message: '', progress: 0 })
      }, 2000)

    } catch (error) {
      console.error('Export error:', error)
      setExportProgress({
        status: 'error',
        message: error instanceof Error ? error.message : 'Export failed',
        progress: 0
      })
    }
  }

  // Format file size estimation
  const getEstimatedFileSize = () => {
    const baseSize = exportConfig.width * exportConfig.height * 0.001 // Base calculation
    const qualityMultiplier = exportConfig.quality === 'high' ? 1.5 :
                             exportConfig.quality === 'medium' ? 1.0 : 0.6
    const formatMultiplier = exportConfig.format === 'pdf' ? 2.0 : 1.0

    const estimatedKB = Math.round(baseSize * qualityMultiplier * formatMultiplier)
    return estimatedKB > 1000 ? `${(estimatedKB / 1000).toFixed(1)}MB` : `${estimatedKB}KB`
  }

  return (
    <>
      {/* Export trigger button */}
      <button
        onClick={handleExportClick}
        disabled={disabled || exportProgress.status === 'exporting'}
        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          disabled || exportProgress.status === 'exporting'
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : canExport
            ? 'bg-green-100 hover:bg-green-200 text-green-700'
            : 'bg-orange-100 hover:bg-orange-200 text-orange-700'
        } ${className}`}
        title={canExport ? 'Export chart' : 'Professional subscription required'}
      >
        {exportProgress.status === 'exporting' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span>Export</span>
        {!canExport && <Crown className="h-4 w-4" />}
      </button>

      {/* Export configuration modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Export Chart</h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Export progress */}
              {exportProgress.status !== 'idle' && exportProgress.status !== 'configuring' && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {exportProgress.status === 'exporting' && (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    )}
                    {exportProgress.status === 'complete' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {exportProgress.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{exportProgress.message}</p>
                      {exportProgress.status === 'exporting' && (
                        <div className="mt-2 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${exportProgress.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Configuration form */}
              {exportProgress.status === 'idle' || exportProgress.status === 'configuring' ? (
                <div className="space-y-4">
                  {/* Format selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Export Format
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setExportConfig(prev => ({ ...prev, format: 'png' }))}
                        className={`flex items-center space-x-2 p-3 border rounded-lg text-left transition-colors ${
                          exportConfig.format === 'png'
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <FileImage className="h-5 w-5" />
                        <div>
                          <div className="font-medium">PNG</div>
                          <div className="text-xs text-gray-500">High quality image</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setExportConfig(prev => ({ ...prev, format: 'pdf' }))}
                        className={`flex items-center space-x-2 p-3 border rounded-lg text-left transition-colors ${
                          exportConfig.format === 'pdf'
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <FileText className="h-5 w-5" />
                        <div>
                          <div className="font-medium">PDF</div>
                          <div className="text-xs text-gray-500">Report format</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chart Title
                    </label>
                    <input
                      type="text"
                      value={exportConfig.title}
                      onChange={(e) => setExportConfig(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Enter chart title"
                    />
                  </div>

                  {/* Quality and dimensions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quality
                      </label>
                      <select
                        value={exportConfig.quality}
                        onChange={(e) => setExportConfig(prev => ({
                          ...prev,
                          quality: e.target.value as 'low' | 'medium' | 'high'
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Size
                      </label>
                      <select
                        value={`${exportConfig.width}x${exportConfig.height}`}
                        onChange={(e) => {
                          const [width, height] = e.target.value.split('x').map(Number)
                          setExportConfig(prev => ({ ...prev, width, height }))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="800x600">800×600</option>
                        <option value="1200x800">1200×800</option>
                        <option value="1600x1200">1600×1200</option>
                        <option value="1920x1080">1920×1080</option>
                      </select>
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Include
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={exportConfig.include_timestamp}
                          onChange={(e) => setExportConfig(prev => ({
                            ...prev,
                            include_timestamp: e.target.checked
                          }))}
                          className="rounded border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-600">Timestamp</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={exportConfig.include_data_range}
                          onChange={(e) => setExportConfig(prev => ({
                            ...prev,
                            include_data_range: e.target.checked
                          }))}
                          className="rounded border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-600">Date range</span>
                      </label>
                    </div>
                  </div>

                  {/* File size estimate */}
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <div className="flex items-center space-x-2 text-sm text-blue-800">
                      <Settings className="h-4 w-4" />
                      <span>Estimated file size: {getEstimatedFileSize()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={executeExport}
                      disabled={!exportConfig.title.trim()}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Export Chart
                    </button>
                    <button
                      onClick={() => setShowExportModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : exportProgress.status === 'error' ? (
                <div className="pt-4">
                  <button
                    onClick={() => setExportProgress({ status: 'configuring', message: '', progress: 0 })}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  )
}