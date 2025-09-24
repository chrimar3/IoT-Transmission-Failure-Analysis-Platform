/**
 * Date Range Picker Component
 * Story 3.2: Interactive Time-Series Visualizations
 *
 * Features:
 * - Predefined date ranges (hour, day, week, month)
 * - Custom date range selection
 * - Bangkok dataset date validation
 * - Real-time chart updates
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Calendar, Clock, ChevronDown, CalendarDays } from 'lucide-react'
import type { DateRangePreset } from '@/types/analytics'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onDateChange: (startDate: string, endDate: string) => void
  disabled?: boolean
  showCustomRange?: boolean
  maxDaysRange?: number
}

// Predefined date range presets for time-series analysis
const DATE_PRESETS: DateRangePreset[] = [
  {
    label: 'Last Hour',
    value: '1h',
    start_date: () => new Date(Date.now() - 60 * 60 * 1000),
    end_date: () => new Date()
  },
  {
    label: 'Last 6 Hours',
    value: '6h',
    start_date: () => new Date(Date.now() - 6 * 60 * 60 * 1000),
    end_date: () => new Date()
  },
  {
    label: 'Last 24 Hours',
    value: '24h',
    start_date: () => new Date(Date.now() - 24 * 60 * 60 * 1000),
    end_date: () => new Date()
  },
  {
    label: 'Last 3 Days',
    value: '3d',
    start_date: () => new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    end_date: () => new Date()
  },
  {
    label: 'Last Week',
    value: '7d',
    start_date: () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end_date: () => new Date()
  },
  {
    label: 'Last Month',
    value: '30d',
    start_date: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end_date: () => new Date()
  },
  {
    label: 'Bangkok Dataset 2018',
    value: '2018',
    start_date: () => new Date('2018-01-01T00:00:00Z'),
    end_date: () => new Date('2018-12-31T23:59:59Z')
  },
  {
    label: 'Bangkok Dataset 2019',
    value: '2019',
    start_date: () => new Date('2019-01-01T00:00:00Z'),
    end_date: () => new Date('2019-12-31T23:59:59Z')
  }
]

// Bangkok dataset constraints
const BANGKOK_DATASET_START = new Date('2018-01-01T00:00:00Z')
const BANGKOK_DATASET_END = new Date('2019-12-31T23:59:59Z')

export default function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  disabled = false,
  showCustomRange = true,
  maxDaysRange = 90
}: DateRangePickerProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customStartDate, setCustomStartDate] = useState(
    startDate ? new Date(startDate).toISOString().slice(0, 16) : ''
  )
  const [customEndDate, setCustomEndDate] = useState(
    endDate ? new Date(endDate).toISOString().slice(0, 16) : ''
  )
  const [selectedPreset, setSelectedPreset] = useState<string>('')

  // Validate date range against Bangkok dataset constraints
  const validateDateRange = useCallback((start: Date, end: Date) => {
    const errors: string[] = []

    // Check if dates are within Bangkok dataset range
    if (start < BANGKOK_DATASET_START) {
      errors.push(`Start date cannot be before ${BANGKOK_DATASET_START.toLocaleDateString()}`)
    }
    if (end > BANGKOK_DATASET_END) {
      errors.push(`End date cannot be after ${BANGKOK_DATASET_END.toLocaleDateString()}`)
    }

    // Check logical date order
    if (start >= end) {
      errors.push('Start date must be before end date')
    }

    // Check maximum range constraint
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    if (daysDiff > maxDaysRange) {
      errors.push(`Date range cannot exceed ${maxDaysRange} days`)
    }

    return errors
  }, [maxDaysRange])

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: DateRangePreset) => {
    const startDate = preset.start_date()
    const endDate = preset.end_date()

    const errors = validateDateRange(startDate, endDate)
    if (errors.length > 0) {
      console.warn('Date range validation errors:', errors)
      return
    }

    setSelectedPreset(preset.value)
    setShowCustomPicker(false)
    onDateChange(startDate.toISOString(), endDate.toISOString())
  }, [onDateChange, validateDateRange])

  // Handle custom date range application
  const handleCustomDateApply = useCallback(() => {
    if (!customStartDate || !customEndDate) {
      return
    }

    const startDate = new Date(customStartDate)
    const endDate = new Date(customEndDate)

    const errors = validateDateRange(startDate, endDate)
    if (errors.length > 0) {
      alert('Date range validation failed:\n' + errors.join('\n'))
      return
    }

    setSelectedPreset('custom')
    setShowCustomPicker(false)
    onDateChange(startDate.toISOString(), endDate.toISOString())
  }, [customStartDate, customEndDate, onDateChange, validateDateRange])

  // Format date for display
  const formatDateRange = useCallback(() => {
    if (!startDate || !endDate) return 'Select date range'

    const start = new Date(startDate)
    const end = new Date(endDate)
    const now = new Date()

    // Check if it's a recent relative range
    const diffMs = now.getTime() - end.getTime()
    if (diffMs < 60 * 60 * 1000) { // Within last hour
      const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60))
      if (hours <= 24) {
        return hours === 1 ? 'Last Hour' : `Last ${hours} Hours`
      }
    }

    // For longer ranges, show actual dates
    const startStr = start.toLocaleDateString()
    const endStr = end.toLocaleDateString()

    if (startStr === endStr) {
      return `${startStr} ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`
    }

    return `${startStr} - ${endStr}`
  }, [startDate, endDate])

  // Get the range description for context
  const getRangeDescription = useCallback(() => {
    if (!startDate || !endDate) return ''

    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} of data`
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} of data`
    }
  }, [startDate, endDate])

  return (
    <div className="relative">
      {/* Main trigger button */}
      <button
        onClick={() => setShowCustomPicker(!showCustomPicker)}
        disabled={disabled}
        className={`flex items-center space-x-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
        }`}
      >
        <Calendar className="h-4 w-4" />
        <span>{formatDateRange()}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {/* Range description */}
      {getRangeDescription() && (
        <p className="text-xs text-gray-500 mt-1">{getRangeDescription()}</p>
      )}

      {/* Dropdown panel */}
      {showCustomPicker && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <CalendarDays className="h-4 w-4 mr-2" />
              Select Date Range
            </h4>

            {/* Quick presets */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Ranges
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DATE_PRESETS.slice(0, 6).map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetSelect(preset)}
                    className={`px-3 py-2 text-sm rounded border text-left transition-colors ${
                      selectedPreset === preset.value
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'hover:bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bangkok dataset presets */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bangkok Dataset
              </label>
              <div className="grid grid-cols-1 gap-2">
                {DATE_PRESETS.slice(6).map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetSelect(preset)}
                    className={`px-3 py-2 text-sm rounded border text-left transition-colors ${
                      selectedPreset === preset.value
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'hover:bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date range */}
            {showCustomRange && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Range
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      min={BANGKOK_DATASET_START.toISOString().slice(0, 16)}
                      max={BANGKOK_DATASET_END.toISOString().slice(0, 16)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      min={BANGKOK_DATASET_START.toISOString().slice(0, 16)}
                      max={BANGKOK_DATASET_END.toISOString().slice(0, 16)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCustomDateApply}
                      disabled={!customStartDate || !customEndDate}
                      className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Apply Range
                    </button>
                    <button
                      onClick={() => setShowCustomPicker(false)}
                      className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Dataset info */}
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium">Bangkok Dataset Range</p>
                  <p>
                    {BANGKOK_DATASET_START.toLocaleDateString()} - {BANGKOK_DATASET_END.toLocaleDateString()}
                  </p>
                  <p className="mt-1 text-blue-600">
                    Maximum range: {maxDaysRange} days
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}