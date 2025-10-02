/**
 * Epic 2 Story 2.4: Statistical Confidence UI Components
 * P-Value Indicator with Significance Badges and Plain English Explanations
 */

'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { HelpCircle, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'

interface PValueData {
  p_value: number
  test_statistic?: number
  degrees_of_freedom?: number
  test_type: string
  effect_direction: 'positive' | 'negative' | 'none'
  practical_significance: boolean
  sample_size: number
}

interface PValueIndicatorProps {
  data: PValueData
  metric_name: string
  comparison_context?: string
  className?: string
  variant?: 'badge' | 'detailed' | 'inline'
  show_education?: boolean
}

export default function PValueIndicator({
  data,
  metric_name,
  comparison_context,
  className = '',
  variant = 'detailed',
  show_education = true
}: PValueIndicatorProps) {
  const { data: session } = useSession()
  const [showEducation, setShowEducation] = useState(false)

  const isProfessional = session?.user?.subscriptionTier === 'PROFESSIONAL'

  const getSignificanceLevel = (p_value: number) => {
    if (p_value < 0.001) return {
      level: 'highly_significant',
      text: 'Highly Significant',
      description: 'Very strong evidence against null hypothesis',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon_color: 'text-green-600',
      confidence: 'Very High'
    }
    if (p_value < 0.01) return {
      level: 'very_significant',
      text: 'Very Significant',
      description: 'Strong evidence against null hypothesis',
      color: 'bg-green-100 text-green-700 border-green-200',
      icon_color: 'text-green-600',
      confidence: 'High'
    }
    if (p_value < 0.05) return {
      level: 'significant',
      text: 'Significant',
      description: 'Moderate evidence against null hypothesis',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon_color: 'text-yellow-600',
      confidence: 'Moderate'
    }
    if (p_value < 0.1) return {
      level: 'marginal',
      text: 'Marginally Significant',
      description: 'Weak evidence against null hypothesis',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon_color: 'text-orange-600',
      confidence: 'Low'
    }
    return {
      level: 'not_significant',
      text: 'Not Significant',
      description: 'No strong evidence against null hypothesis',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon_color: 'text-gray-600',
      confidence: 'Very Low'
    }
  }

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'positive':
        return <TrendingUp className="w-4 h-4" />
      case 'negative':
        return <TrendingDown className="w-4 h-4" />
      default:
        return <Minus className="w-4 h-4" />
    }
  }

  const formatPValue = (p: number): string => {
    if (p < 0.001) return '<0.001'
    if (p < 0.01) return `<0.01`
    return p.toFixed(3)
  }

  const getPlainEnglishExplanation = (significance: ReturnType<typeof getSignificanceLevel>, effect_direction: string) => {
    const base = significance.level === 'not_significant'
      ? "The observed difference could easily be due to random chance"
      : "The observed difference is unlikely to be due to random chance alone"

    const direction_text = effect_direction === 'positive'
      ? " and suggests a genuine improvement"
      : effect_direction === 'negative'
      ? " and suggests a genuine decline"
      : ""

    const confidence_text = `. We can be ${significance.confidence.toLowerCase()} confident in this finding`

    return base + direction_text + confidence_text + '.'
  }

  const significance = getSignificanceLevel(data.p_value)

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center space-x-1 ${className}`}>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${significance.color}`}>
          {significance.text}
        </span>
        {isProfessional && (
          <span className="text-xs text-gray-500">
            p={formatPValue(data.p_value)}
          </span>
        )}
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <div className={`${significance.icon_color}`}>
          {getDirectionIcon(data.effect_direction)}
        </div>
        <span className="text-sm font-medium text-gray-900">
          {significance.text}
        </span>
        {isProfessional && (
          <span className="text-xs text-gray-500">
            (p={formatPValue(data.p_value)})
          </span>
        )}
        {show_education && (
          <button
            onClick={() => setShowEducation(!showEducation)}
            className="text-blue-600 hover:text-blue-700"
            title="Learn about p-values"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  // Detailed variant
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-900">Statistical Significance</h3>
          {show_education && (
            <button
              onClick={() => setShowEducation(!showEducation)}
              className="text-blue-600 hover:text-blue-700"
              title="Learn about statistical significance"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full border ${significance.color}`}>
          <div className={significance.icon_color}>
            {getDirectionIcon(data.effect_direction)}
          </div>
          <span className="text-sm font-medium">
            {significance.text}
          </span>
        </div>
      </div>

      {/* Main P-Value Display */}
      <div className="mb-4">
        <div className="flex items-center space-x-4">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              p = {formatPValue(data.p_value)}
            </div>
            <div className="text-sm text-gray-600">
              {comparison_context || `${metric_name} analysis`}
            </div>
          </div>

          {!data.practical_significance && data.p_value < 0.05 && (
            <div className="flex items-center text-amber-600">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span className="text-xs">Statistically but not practically significant</span>
            </div>
          )}
        </div>
      </div>

      {/* Plain English Explanation */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">What This Means</h4>
        <p className="text-sm text-blue-800">
          {getPlainEnglishExplanation(significance, data.effect_direction)}
        </p>
      </div>

      {/* Professional Details */}
      {isProfessional && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Test Type:</span>
            <span className="ml-2 font-medium text-gray-900">{data.test_type}</span>
          </div>
          <div>
            <span className="text-gray-500">Sample Size:</span>
            <span className="ml-2 font-medium text-gray-900">{data.sample_size.toLocaleString()}</span>
          </div>
          {data.test_statistic && (
            <div>
              <span className="text-gray-500">Test Statistic:</span>
              <span className="ml-2 font-medium text-gray-900">{data.test_statistic.toFixed(3)}</span>
            </div>
          )}
          {data.degrees_of_freedom && (
            <div>
              <span className="text-gray-500">Degrees of Freedom:</span>
              <span className="ml-2 font-medium text-gray-900">{data.degrees_of_freedom}</span>
            </div>
          )}
        </div>
      )}

      {/* Educational Content */}
      {showEducation && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-2">Understanding P-Values</h4>
              <p className="text-sm text-blue-800">
                A p-value tells us how likely we would be to see results at least as extreme as what we
                observed, assuming there was actually no real difference (null hypothesis).
              </p>
            </div>

            <div>
              <h5 className="text-sm font-medium text-blue-900">Common Thresholds:</h5>
              <ul className="text-sm text-blue-800 space-y-1 mt-1">
                <li><strong>p &lt; 0.001:</strong> Very strong evidence of a real effect</li>
                <li><strong>p &lt; 0.01:</strong> Strong evidence of a real effect</li>
                <li><strong>p &lt; 0.05:</strong> Moderate evidence of a real effect (traditional threshold)</li>
                <li><strong>p ≥ 0.05:</strong> Insufficient evidence of a real effect</li>
              </ul>
            </div>

            <div>
              <h5 className="text-sm font-medium text-blue-900">Bangkok Dataset Context:</h5>
              <p className="text-sm text-blue-800">
                Our analysis uses 124.9M data points from Bangkok University&apos;s 18-month IoT study,
                providing exceptional statistical power to detect even small but meaningful differences.
              </p>
            </div>

            {!data.practical_significance && data.p_value < 0.05 && (
              <div className="bg-amber-50 p-2 rounded border border-amber-200">
                <h5 className="text-sm font-medium text-amber-900">Important Note:</h5>
                <p className="text-sm text-amber-800">
                  While this result is statistically significant, the practical significance should be
                  evaluated based on the actual magnitude of the effect and business context.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}