/**
 * Epic 2 Story 2.4: Statistical Confidence UI Components
 * Confidence Interval Display Component with Visual Error Bars
 */

'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Info, HelpCircle, CheckCircle } from 'lucide-react'

export interface EnhancedConfidenceInterval {
  value: number
  lower: number
  upper: number
  confidence_level: number
  p_value: number
  sample_size: number
  effect_size?: number
  methodology: string
  display_options: {
    show_error_bars: boolean
    show_shaded_region: boolean
    show_range_text: boolean
    show_methodology: boolean
  }
  educational_content?: {
    explanation: string
    interpretation: string
    best_practices: string[]
  }
}

interface ConfidenceIntervalDisplayProps {
  data: EnhancedConfidenceInterval
  metric_name: string
  units?: string
  className?: string
  variant?: 'compact' | 'detailed' | 'professional'
  show_education?: boolean
}

export default function ConfidenceIntervalDisplay({
  data,
  metric_name,
  units = '%',
  className = '',
  variant = 'detailed',
  show_education = true
}: ConfidenceIntervalDisplayProps) {
  const { data: session } = useSession()
  const [showMethodology, setShowMethodology] = useState(false)
  const [showEducation, setShowEducation] = useState(false)

  const isProfessional = session?.user?.subscriptionTier === 'PROFESSIONAL'
  const range = data.upper - data.lower
  const margin_of_error = range / 2

  // Calculate visual representation percentages
  const total_range = Math.max(data.upper * 1.2, 100) - Math.min(data.lower * 0.8, 0)
  const bar_start = ((data.lower - Math.min(data.lower * 0.8, 0)) / total_range) * 100
  const bar_width = (range / total_range) * 100
  const value_position = ((data.value - Math.min(data.lower * 0.8, 0)) / total_range) * 100

  const getSignificanceColor = (p_value: number): string => {
    if (p_value < 0.001) return 'text-green-700'
    if (p_value < 0.01) return 'text-green-600'
    if (p_value < 0.05) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSignificanceBadge = (p_value: number): { text: string; color: string } => {
    if (p_value < 0.001) return { text: 'Highly Significant', color: 'bg-green-100 text-green-800' }
    if (p_value < 0.01) return { text: 'Very Significant', color: 'bg-green-100 text-green-700' }
    if (p_value < 0.05) return { text: 'Significant', color: 'bg-yellow-100 text-yellow-800' }
    return { text: 'Not Significant', color: 'bg-red-100 text-red-800' }
  }

  const significance = getSignificanceBadge(data.p_value)

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <span className="font-medium">
          {data.value.toFixed(1)}{units}
        </span>
        <span className="text-sm text-gray-500">
          (95% CI: {data.lower.toFixed(1)}-{data.upper.toFixed(1)}{units})
        </span>
        {isProfessional && (
          <span className={`text-xs px-2 py-1 rounded-full ${significance.color}`}>
            p&lt;{data.p_value.toFixed(3)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-900">{metric_name}</h3>
          {show_education && data.educational_content && (
            <button
              onClick={() => setShowEducation(!showEducation)}
              className="text-blue-600 hover:text-blue-700"
              title="Learn about this statistic"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-1 rounded-full ${significance.color}`}>
            {significance.text}
          </span>
          {isProfessional && (
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="text-gray-500 hover:text-gray-700"
              title="View methodology"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Value Display */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-gray-900">
          {data.value.toFixed(1)}
          <span className="text-lg font-medium text-gray-600 ml-1">{units}</span>
        </div>
        <div className="text-sm text-gray-600">
          {data.confidence_level}% Confidence Interval: {data.lower.toFixed(1)} - {data.upper.toFixed(1)}{units}
        </div>
        {isProfessional && (
          <div className="text-xs text-gray-500 mt-1">
            ±{margin_of_error.toFixed(1)}{units} margin of error • n={data.sample_size.toLocaleString()}
          </div>
        )}
      </div>

      {/* Visual Confidence Interval */}
      <div className="mb-4">
        <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
          {/* Shaded confidence region */}
          {data.display_options.show_shaded_region && (
            <div
              className="absolute top-0 h-full bg-blue-200 opacity-50"
              style={{
                left: `${bar_start}%`,
                width: `${bar_width}%`
              }}
            />
          )}

          {/* Confidence interval bar */}
          {data.display_options.show_error_bars && (
            <>
              <div
                className="absolute top-1/2 h-1 bg-blue-600 transform -translate-y-1/2"
                style={{
                  left: `${bar_start}%`,
                  width: `${bar_width}%`
                }}
              />
              {/* Error bar caps */}
              <div
                className="absolute top-1 bottom-1 w-0.5 bg-blue-600"
                style={{ left: `${bar_start}%` }}
              />
              <div
                className="absolute top-1 bottom-1 w-0.5 bg-blue-600"
                style={{ left: `${bar_start + bar_width}%` }}
              />
            </>
          )}

          {/* Point estimate marker */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-blue-800 rounded-full"
            style={{ left: `${value_position}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{Math.min(data.lower * 0.8, 0).toFixed(1)}{units}</span>
          <span>{Math.max(data.upper * 1.2, 100).toFixed(1)}{units}</span>
        </div>
      </div>

      {/* Statistical Details for Professional Users */}
      {isProfessional && variant === 'professional' && (
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-gray-500">P-value:</span>
            <span className={`ml-2 font-medium ${getSignificanceColor(data.p_value)}`}>
              {data.p_value < 0.001 ? '<0.001' : data.p_value.toFixed(3)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Sample size:</span>
            <span className="ml-2 font-medium text-gray-900">
              {data.sample_size.toLocaleString()}
            </span>
          </div>
          {data.effect_size && (
            <div>
              <span className="text-gray-500">Effect size:</span>
              <span className="ml-2 font-medium text-gray-900">
                {data.effect_size.toFixed(2)}
              </span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Confidence:</span>
            <span className="ml-2 font-medium text-gray-900">
              {data.confidence_level}%
            </span>
          </div>
        </div>
      )}

      {/* Educational Content */}
      {showEducation && data.educational_content && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Understanding This Statistic</h4>
              <p className="text-sm text-blue-800 mb-2">
                {data.educational_content.explanation}
              </p>
              <p className="text-sm text-blue-700 mb-2">
                <strong>What this means:</strong> {data.educational_content.interpretation}
              </p>
              {data.educational_content.best_practices.length > 0 && (
                <div>
                  <strong className="text-sm text-blue-900">Best Practices:</strong>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    {data.educational_content.best_practices.map((practice, index) => (
                      <li key={index} className="flex items-start space-x-1">
                        <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{practice}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Methodology Details for Professional Users */}
      {isProfessional && showMethodology && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-gray-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Statistical Methodology</h4>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Method:</strong> {data.methodology}
              </p>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Confidence Level:</strong> {data.confidence_level}% ({(1 - data.confidence_level/100).toFixed(3)} significance level)
              </p>
              <p className="text-sm text-gray-700">
                <strong>Bangkok Dataset Context:</strong> Analysis based on 124.9M sensor readings from
                Bangkok University&apos;s 18-month IoT study (January 2018 - June 2019).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}