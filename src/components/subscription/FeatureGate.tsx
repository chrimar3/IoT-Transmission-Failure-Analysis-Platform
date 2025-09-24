'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { Loader2, Lock, CreditCard, ArrowRight } from 'lucide-react'

interface FeatureGateProps {
  feature: string
  fallback?: ReactNode
  children: ReactNode
  showUpgradePrompt?: boolean
  className?: string
}

export function FeatureGate({
  feature,
  fallback,
  children,
  showUpgradePrompt = true,
  className = ''
}: FeatureGateProps) {
  const { checkFeatureAccess, loading, goToPricing, isProfessional } = useSubscription()
  const [access, setAccess] = useState<{
    canAccess: boolean
    message?: string
    upgradeRequired?: boolean
  } | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      if (!loading) {
        try {
          const result = await checkFeatureAccess(feature)
          setAccess(result)
        } catch (error) {
          console.error('Feature access check failed:', error)
          setAccess({ canAccess: false, message: 'Failed to verify feature access' })
        } finally {
          setChecking(false)
        }
      }
    }

    checkAccess()
  }, [feature, loading, checkFeatureAccess])

  if (loading || checking) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!access) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <p className="text-gray-500">Unable to verify feature access</p>
      </div>
    )
  }

  if (access.canAccess) {
    return <>{children}</>
  }

  // Show fallback if provided and no upgrade prompt
  if (fallback && !showUpgradePrompt) {
    return <>{fallback}</>
  }

  // Show upgrade prompt
  if (showUpgradePrompt && access.upgradeRequired) {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 text-center ${className}`}>
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isProfessional ? 'Feature Unavailable' : 'Upgrade to Professional'}
        </h3>

        <p className="text-gray-600 mb-4">
          {access.message || 'This feature requires a Professional subscription.'}
        </p>

        {!isProfessional && (
          <div className="space-y-3">
            <button
              onClick={goToPricing}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
            >
              <CreditCard className="h-4 w-4" />
              Upgrade Now
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-sm text-gray-500">
              Starting at €29/month • Cancel anytime
            </p>
          </div>
        )}

        {fallback && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            {fallback}
          </div>
        )}
      </div>
    )
  }

  // Show simple message without upgrade prompt
  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
      <div className="flex justify-center mb-3">
        <Lock className="h-5 w-5 text-gray-400" />
      </div>

      <p className="text-gray-600">
        {access.message || 'This feature is not available with your current subscription.'}
      </p>

      {fallback && (
        <div className="mt-4">
          {fallback}
        </div>
      )}
    </div>
  )
}