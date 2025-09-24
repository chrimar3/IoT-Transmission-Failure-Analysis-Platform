/**
 * Export Dialog Component
 * Story 3.4: Data Export and Reporting
 *
 * Main export interface for data download and reporting
 */

import React, { useState, useEffect, useCallback } from 'react'
import type {
  CreateExportRequest,
  ExportFormat,
  ExportFilters,
  DeliveryMethod,
  ExportValidation,
  _BrandingSettings
} from '../../types/export'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  defaultFilters?: Partial<ExportFilters>
  sensors: Array<{ id: string; name: string; location: string }>
}

export function ExportDialog({
  isOpen,
  onClose,
  defaultFilters = {},
  sensors = []
}: ExportDialogProps) {
  const [currentStep, setCurrentStep] = useState<'format' | 'filters' | 'options' | 'delivery'>('format')
  const [exportRequest, setExportRequest] = useState<Partial<CreateExportRequest>>({
    format: 'csv',
    delivery_method: 'download',
    filters: {
      sensor_ids: [],
      date_range: {
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      },
      ...defaultFilters
    }
  })
  const [validation, setValidation] = useState<ExportValidation | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const handleFormatSelect = (format: ExportFormat) => {
    setExportRequest(prev => ({ ...prev, format }))
    setCurrentStep('filters')
  }

  const handleFiltersUpdate = (filters: Partial<ExportFilters>) => {
    setExportRequest(prev => ({
      ...prev,
      filters: { ...prev.filters!, ...filters }
    }))
  }

  const validateRequest = useCallback(async () => {
    if (!exportRequest.format || !exportRequest.filters) return

    setIsValidating(true)
    try {
      const response = await fetch('/api/export/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: exportRequest.format,
          filters: exportRequest.filters
        })
      })

      const result = await response.json()
      setValidation(result)
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setIsValidating(false)
    }
  }, [exportRequest.format, exportRequest.filters])

  const handleCreateExport = async () => {
    try {
      const response = await fetch('/api/export/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportRequest)
      })

      const result = await response.json()

      if (result.success) {
        // Navigate to export status page or show success
        console.log('Export created:', result.job_id)
        onClose()
      } else {
        console.error('Export creation failed:', result.error)
      }
    } catch (error) {
      console.error('Export creation failed:', error)
    }
  }

  useEffect(() => {
    if (currentStep === 'options' && exportRequest.format && exportRequest.filters) {
      validateRequest()
    }
  }, [currentStep, exportRequest.format, exportRequest.filters, validateRequest])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Export Data</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center mt-4 space-x-4">
            {[
              { id: 'format', label: 'Format' },
              { id: 'filters', label: 'Data Selection' },
              { id: 'options', label: 'Export Options' },
              { id: 'delivery', label: 'Delivery' }
            ].map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep === step.id
                    ? 'bg-blue-600 text-white'
                    : index < ['format', 'filters', 'options', 'delivery'].indexOf(currentStep)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {index + 1}
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep === step.id ? 'text-blue-600 font-medium' : 'text-gray-600'
                }`}>
                  {step.label}
                </span>
                {index < 3 && (
                  <div className={`w-8 h-0.5 mx-4 ${
                    index < ['format', 'filters', 'options', 'delivery'].indexOf(currentStep)
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[60vh]">
          {currentStep === 'format' && (
            <FormatSelectionStep
              selectedFormat={exportRequest.format}
              onSelect={handleFormatSelect}
            />
          )}

          {currentStep === 'filters' && (
            <FiltersStep
              filters={exportRequest.filters!}
              sensors={sensors}
              onUpdate={handleFiltersUpdate}
              onNext={() => setCurrentStep('options')}
              onBack={() => setCurrentStep('format')}
            />
          )}

          {currentStep === 'options' && (
            <OptionsStep
              exportRequest={exportRequest}
              validation={validation}
              isValidating={isValidating}
              onUpdate={setExportRequest}
              onNext={() => setCurrentStep('delivery')}
              onBack={() => setCurrentStep('filters')}
            />
          )}

          {currentStep === 'delivery' && (
            <DeliveryStep
              exportRequest={exportRequest}
              validation={validation}
              onUpdate={setExportRequest}
              onCreate={handleCreateExport}
              onBack={() => setCurrentStep('options')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Step Components
interface FormatSelectionStepProps {
  selectedFormat?: ExportFormat
  onSelect: (format: ExportFormat) => void
}

function FormatSelectionStep({ selectedFormat, onSelect }: FormatSelectionStepProps) {
  const formats = [
    {
      id: 'csv' as ExportFormat,
      name: 'CSV (Comma Separated Values)',
      description: 'Best for data analysis and spreadsheet applications',
      icon: '📊',
      fileSize: 'Small',
      features: ['Fast export', 'Universal compatibility', 'Lightweight']
    },
    {
      id: 'excel' as ExportFormat,
      name: 'Excel Workbook (.xlsx)',
      description: 'Rich formatting with multiple sheets and charts',
      icon: '📈',
      fileSize: 'Medium',
      features: ['Multiple sheets', 'Charts included', 'Advanced formatting']
    },
    {
      id: 'pdf' as ExportFormat,
      name: 'PDF Report',
      description: 'Professional reports with charts and branding',
      icon: '📄',
      fileSize: 'Medium',
      features: ['Professional layout', 'Charts & graphs', 'Print-ready']
    }
  ]

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Choose Export Format</h3>
        <p className="text-gray-600">Select the format that best suits your needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {formats.map((format) => (
          <button
            key={format.id}
            onClick={() => onSelect(format.id)}
            className={`
              p-6 border-2 rounded-lg text-left transition-all hover:shadow-md
              ${selectedFormat === format.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="text-3xl mb-3">{format.icon}</div>
            <h4 className="font-medium text-gray-900 mb-2">{format.name}</h4>
            <p className="text-sm text-gray-600 mb-3">{format.description}</p>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">File Size: {format.fileSize}</div>
              <div className="flex flex-wrap gap-1">
                {format.features.map((feature) => (
                  <span
                    key={feature}
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

interface FiltersStepProps {
  filters: ExportFilters
  sensors: Array<{ id: string; name: string; location: string }>
  onUpdate: (filters: Partial<ExportFilters>) => void
  onNext: () => void
  onBack: () => void
}

function FiltersStep({ filters, sensors, onUpdate, onNext, onBack }: FiltersStepProps) {
  const [selectedSensors, setSelectedSensors] = useState<string[]>(filters.sensor_ids || [])
  const [dateRange, setDateRange] = useState(filters.date_range || {
    start_date: '',
    end_date: ''
  })

  const handleSensorToggle = (sensorId: string) => {
    const updated = selectedSensors.includes(sensorId)
      ? selectedSensors.filter(id => id !== sensorId)
      : [...selectedSensors, sensorId]

    setSelectedSensors(updated)
    onUpdate({ sensor_ids: updated })
  }

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    const updated = { ...dateRange, [field]: value }
    setDateRange(updated)
    onUpdate({ date_range: updated })
  }

  const canProceed = selectedSensors.length > 0 && dateRange.start_date && dateRange.end_date

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Data to Export</h3>

        {/* Date Range */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start_date}
                onChange={(e) => handleDateChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end_date}
                onChange={(e) => handleDateChange('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Sensor Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sensors ({selectedSensors.length} of {sensors.length} selected)
          </label>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            {sensors.map((sensor) => (
              <label
                key={sensor.id}
                className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selectedSensors.includes(sensor.id)}
                  onChange={() => handleSensorToggle(sensor.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">{sensor.name}</div>
                  <div className="text-xs text-gray-500">{sensor.location}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`px-6 py-2 rounded-md ${
            canProceed
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

interface OptionsStepProps {
  exportRequest: Partial<CreateExportRequest>
  validation: ExportValidation | null
  isValidating: boolean
  onUpdate: (request: Partial<CreateExportRequest>) => void
  onNext: () => void
  onBack: () => void
}

function OptionsStep({ exportRequest, validation, isValidating, onUpdate, onNext, onBack }: OptionsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Export Options</h3>

        {/* Validation Results */}
        {isValidating && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
              <span className="text-yellow-800">Validating export parameters...</span>
            </div>
          </div>
        )}

        {validation && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Export Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Estimated Records:</span>
                <span className="ml-2 font-medium">{validation.estimated_records?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">Estimated File Size:</span>
                <span className="ml-2 font-medium">{validation.estimated_file_size_mb?.toFixed(1)} MB</span>
              </div>
              <div>
                <span className="text-gray-600">Processing Time:</span>
                <span className="ml-2 font-medium">~{Math.ceil((validation.estimated_processing_time_seconds || 0) / 60)} minutes</span>
              </div>
            </div>

            {validation.warnings?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h5 className="text-sm font-medium text-yellow-800 mb-1">Warnings:</h5>
                {validation.warnings.map((warning, index) => (
                  <p key={index} className="text-sm text-yellow-700">{warning.message}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Custom Options */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Custom Filename (optional)</label>
            <input
              type="text"
              value={exportRequest.custom_filename || ''}
              onChange={(e) => onUpdate({ custom_filename: e.target.value })}
              placeholder="Leave empty for auto-generated filename"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {(exportRequest.format === 'excel' || exportRequest.format === 'pdf') && (
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportRequest.include_charts || false}
                  onChange={(e) => onUpdate({ include_charts: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Include charts and visualizations</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!validation?.is_valid}
          className={`px-6 py-2 rounded-md ${
            validation?.is_valid
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

interface DeliveryStepProps {
  exportRequest: Partial<CreateExportRequest>
  validation: ExportValidation | null
  onUpdate: (request: Partial<CreateExportRequest>) => void
  onCreate: () => void
  onBack: () => void
}

function DeliveryStep({ exportRequest, validation, onUpdate, onCreate, onBack }: DeliveryStepProps) {
  const [emailRecipients, setEmailRecipients] = useState<string>('')

  const handleDeliveryMethodChange = (method: DeliveryMethod) => {
    onUpdate({
      delivery_method: method,
      recipients: method === 'email' ? emailRecipients.split(',').map(e => e.trim()).filter(e => e) : undefined
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Method</h3>

        <div className="space-y-3">
          <label className="flex items-center p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="delivery"
              value="download"
              checked={exportRequest.delivery_method === 'download'}
              onChange={(e) => handleDeliveryMethodChange(e.target.value as DeliveryMethod)}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">Download File</div>
              <div className="text-xs text-gray-500">Download the export file directly to your device</div>
            </div>
          </label>

          <label className="flex items-center p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="delivery"
              value="email"
              checked={exportRequest.delivery_method === 'email'}
              onChange={(e) => handleDeliveryMethodChange(e.target.value as DeliveryMethod)}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">Email Delivery</div>
              <div className="text-xs text-gray-500">Send the export file via email attachment</div>
            </div>
          </label>
        </div>

        {exportRequest.delivery_method === 'email' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Recipients (comma-separated)
            </label>
            <input
              type="text"
              value={emailRecipients}
              onChange={(e) => setEmailRecipients(e.target.value)}
              placeholder="user@example.com, colleague@company.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Final Summary */}
      {validation && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="font-medium text-blue-900 mb-2">Ready to Export</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div>Format: {exportRequest.format?.toUpperCase()}</div>
            <div>Records: {validation.estimated_records?.toLocaleString()}</div>
            <div>File Size: ~{validation.estimated_file_size_mb?.toFixed(1)} MB</div>
            <div>Delivery: {exportRequest.delivery_method === 'email' ? 'Email' : 'Download'}</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onCreate}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Create Export
        </button>
      </div>
    </div>
  )
}