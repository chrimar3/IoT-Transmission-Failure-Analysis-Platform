'use client'

import { useSubscription } from '@/hooks/useSubscription'
import { TrendingUp, Download, AlertTriangle, CheckCircle } from 'lucide-react'

interface UsageIndicatorProps {
  type?: 'exports'
  className?: string
  showUpgradePrompt?: boolean
}

export function UsageIndicator({
  type: _type = 'exports',
  className = '',
  showUpgradePrompt = true
}: UsageIndicatorProps) {
  const { usage, isProfessional, goToPricing, loading } = useSubscription()

  if (loading || !usage) {
    return (
      <div className={`animate-pulse bg-gray-200 h-4 rounded ${className}`}></div>
    )
  }

  const { exportsThisMonth, exportsLimit } = usage
  const isUnlimited = exportsLimit === Infinity
  const percentage = isUnlimited ? 0 : Math.min((exportsThisMonth / exportsLimit) * 100, 100)
  const remaining = isUnlimited ? Infinity : Math.max(exportsLimit - exportsThisMonth, 0)

  const getStatusColor = () => {
    if (isUnlimited || percentage < 60) return 'text-green-600 bg-green-100'
    if (percentage < 80) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getProgressColor = () => {
    if (isUnlimited) return 'bg-green-500'
    if (percentage < 60) return 'bg-green-500'
    if (percentage < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusIcon = () => {
    if (isUnlimited) return CheckCircle
    if (percentage < 80) return TrendingUp
    return AlertTriangle
  }

  const StatusIcon = getStatusIcon()

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-900">Monthly Exports</span>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          <StatusIcon className="h-3 w-3" />
          {isProfessional ? 'Professional' : 'Free'}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Used this month</span>
          <span className="font-medium text-gray-900">
            {exportsThisMonth} / {isUnlimited ? '∞' : exportsLimit}
          </span>
        </div>

        {/* Progress Bar */}
        {!isUnlimited && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        )}

        {/* Status Message */}
        <div className="text-sm">
          {isUnlimited ? (
            <p className="text-green-600 font-medium">
              ✨ Unlimited exports with Professional
            </p>
          ) : remaining === 0 ? (
            <p className="text-red-600 font-medium">
              ⚠️ Export limit reached
            </p>
          ) : remaining <= 2 ? (
            <p className="text-yellow-600 font-medium">
              ⚡ {remaining} export{remaining !== 1 ? 's' : ''} remaining
            </p>
          ) : (
            <p className="text-gray-600">
              {remaining} export{remaining !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>

        {/* Upgrade Prompt */}
        {!isProfessional && showUpgradePrompt && (percentage >= 60 || remaining <= 2) && (
          <div className="pt-3 border-t border-gray-200">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 mb-2">
                {remaining === 0
                  ? 'Upgrade to Professional for unlimited exports'
                  : 'Running low? Get unlimited exports with Professional'}
              </p>
              <button
                onClick={goToPricing}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
              >
                Upgrade for €29/month
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}