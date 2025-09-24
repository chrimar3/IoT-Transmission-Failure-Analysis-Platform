'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, FileText, Table, FileSpreadsheet, X, Filter, _Calendar } from 'lucide-react'

interface ExportFormat {
  id: string
  name: string
  description: string
  icon: React.ReactNode
}

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId?: string
}

export default function ExportModal({ isOpen, onClose, sessionId }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>('csv')
  const [selectedDataType, setSelectedDataType] = useState<string>('insights')
  const [filters, setFilters] = useState({
    confidence_threshold: 80,
    category: '',
    severity: '',
    date_range: {
      start: '',
      end: ''
    }
  })
  const [isExporting, setIsExporting] = useState(false)
  const [availableFormats, setAvailableFormats] = useState<ExportFormat[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchExportFormats()
      // Set default date range to last 30 days
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)

      setFilters(prev => ({
        ...prev,
        date_range: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      }))
    }
  }, [isOpen, fetchExportFormats])

  const fetchExportFormats = useCallback(async () => {
    try {
      const response = await fetch('/api/export/formats')
      const data = await response.json()

      if (data.success) {
        const formatsWithIcons = data.data.formats.map((format: unknown) => ({
          ...format,
          icon: getFormatIcon(format.id)
        }))
        setAvailableFormats(formatsWithIcons)
      }
    } catch (error) {
      console.error('Error fetching export formats:', error)
      // Fallback to default formats
      setAvailableFormats([
        { id: 'csv', name: 'CSV', description: 'Comma-separated values', icon: <Table className="h-5 w-5" /> },
        { id: 'json', name: 'JSON', description: 'JavaScript Object Notation', icon: <FileText className="h-5 w-5" /> },
        { id: 'excel', name: 'Excel', description: 'Microsoft Excel format', icon: <FileSpreadsheet className="h-5 w-5" /> }
      ])
    }
  }, [])

  const getFormatIcon = (formatId: string) => {
    switch (formatId) {
      case 'csv': return <Table className="h-5 w-5" />
      case 'json': return <FileText className="h-5 w-5" />
      case 'pdf': return <FileText className="h-5 w-5" />
      case 'excel': return <FileSpreadsheet className="h-5 w-5" />
      default: return <Download className="h-5 w-5" />
    }
  }

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const exportRequest = {
        format: selectedFormat,
        data_type: selectedDataType,
        session_id: sessionId,
        filters: {
          confidence_threshold: filters.confidence_threshold,
          ...(filters.category && { category: filters.category }),
          ...(filters.severity && { severity: filters.severity }),
          ...(filters.date_range.start && filters.date_range.end && {
            date_range: filters.date_range
          })
        }
      }

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      if (selectedFormat === 'json') {
        // For JSON, display the data or allow copy to clipboard
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
        downloadBlob(blob, data.metadata.filename)
      } else {
        // For other formats, download as file
        const blob = await response.blob()
        const filename = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'export'
        downloadBlob(blob, filename)
      }

      // Show success message
      alert('Export completed successfully!')
      onClose()

    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Export Data</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Export Format Selection */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Export Format</h3>
          <div className="grid grid-cols-2 gap-3">
            {availableFormats.map((format) => (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  selectedFormat === format.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {format.icon}
                  <span className="font-medium">{format.name}</span>
                </div>
                <p className="text-sm text-gray-600">{format.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Data Type Selection */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Data Type</h3>
          <div className="space-y-2">
            {[
              { id: 'insights', name: 'Insights', description: 'Business insights and recommendations' },
              { id: 'scenarios', name: 'Scenarios', description: 'Savings scenarios with ROI calculations' },
              { id: 'metrics', name: 'Metrics', description: 'Performance and quality metrics' },
              { id: 'complete', name: 'Complete Report', description: 'All data combined' }
            ].map((dataType) => (
              <label key={dataType.id} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="dataType"
                  value={dataType.id}
                  checked={selectedDataType === dataType.id}
                  onChange={(e) => setSelectedDataType(e.target.value)}
                  className="text-blue-600"
                />
                <div>
                  <span className="font-medium text-gray-900">{dataType.name}</span>
                  <p className="text-sm text-gray-600">{dataType.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Filter className="h-4 w-4 text-gray-600" />
            <h3 className="font-medium text-gray-900">Filters (Optional)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Confidence Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Confidence Level: {filters.confidence_threshold}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.confidence_threshold}
                onChange={(e) => setFilters(prev => ({ ...prev, confidence_threshold: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">All Categories</option>
                <option value="energy">Energy</option>
                <option value="efficiency">Efficiency</option>
                <option value="financial">Financial</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={filters.date_range.start}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    date_range: { ...prev.date_range, start: e.target.value }
                  }))}
                  className="flex-1 p-2 border rounded-lg text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={filters.date_range.end}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    date_range: { ...prev.date_range, end: e.target.value }
                  }))}
                  className="flex-1 p-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Export Summary */}
        <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Export Summary</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p>Format: <span className="font-medium">{availableFormats.find(f => f.id === selectedFormat)?.name}</span></p>
            <p>Data: <span className="font-medium">{selectedDataType}</span></p>
            <p>Min Confidence: <span className="font-medium">{filters.confidence_threshold}%</span></p>
            {sessionId && <p>Session: <span className="font-medium">{sessionId.slice(0, 8)}...</span></p>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Export</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}