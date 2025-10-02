/**
 * Revenue Protection: Enhanced Feature Gate Component
 * Story 1.3 Critical Fix: User-Friendly Upgrade Prompts
 *
 * Provides clear value communication when Free tier users hit limitations
 */

'use client'

import React from 'react'
import { useSubscription } from '../../hooks/useSubscription'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { TrendingUpIcon, DatabaseIcon, BarChart3Icon, ShieldCheckIcon } from 'lucide-react'

interface RevenueProtectedFeatureGateProps {
  feature: 'bangkok_full_data' | 'advanced_analytics' | 'data_export' | 'premium_api_limits'
  fallbackComponent?: React.ComponentType
  upgradePromptIntensity?: 'subtle' | 'prominent' | 'blocking'
  children: React.ReactNode
  className?: string
}

const FEATURE_DEFINITIONS = {
  bangkok_full_data: {
    title: 'Complete Bangkok Dataset Access',
    description: 'Full 18-month historical data (124.9M sensor records)',
    benefits: [
      'Complete building performance history',
      'Long-term trend analysis',
      'Seasonal pattern detection',
      'Regulatory compliance data'
    ],
    icon: DatabaseIcon,
    savings: '€45,000+ annual savings potential',
    confidence: '95% statistical confidence'
  },
  advanced_analytics: {
    title: 'Professional Analytics Suite',
    description: 'Advanced statistical features and predictive insights',
    benefits: [
      'Predictive maintenance alerts',
      'Energy optimization recommendations',
      'Statistical confidence intervals',
      'Custom threshold configuration'
    ],
    icon: BarChart3Icon,
    savings: '€25,000+ in prevented failures',
    confidence: 'Regulatory-grade validation'
  },
  data_export: {
    title: 'Enterprise Data Export',
    description: 'CSV, PDF, and Excel exports for business integration',
    benefits: [
      'Executive presentation reports',
      'ERP system integration',
      'Compliance documentation',
      'Board meeting materials'
    ],
    icon: TrendingUpIcon,
    savings: '20+ hours monthly saved',
    confidence: 'Professional formatting'
  },
  premium_api_limits: {
    title: 'Production API Access',
    description: '10,000 requests/hour for enterprise applications',
    benefits: [
      '100x higher rate limits',
      'Bulk data processing',
      'Real-time integrations',
      'Priority support'
    ],
    icon: ShieldCheckIcon,
    savings: 'Enterprise-grade reliability',
    confidence: '99.9% uptime SLA'
  }
} as const

export function RevenueProtectedFeatureGate({
  _feature,
  fallbackComponent: FallbackComponent,
  upgradePromptIntensity = 'prominent',
  children,
  className = ''
}: RevenueProtectedFeatureGateProps) {
  const { subscription, loading } = useSubscription()

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-48 flex items-center justify-center">
        <span className="text-gray-500">Loading subscription status...</span>
      </div>
    )
  }

  // Professional tier users get full access
  if (subscription?.tier === 'professional') {
    return <>{children}</>
  }

  // Free tier users see upgrade prompts
  const featureConfig = FEATURE_DEFINITIONS[_feature]
  const IconComponent = featureConfig.icon

  if (upgradePromptIntensity === 'blocking') {
    return <BlockingUpgradePrompt feature={_feature} config={featureConfig} />
  }

  if (upgradePromptIntensity === 'subtle') {
    return (
      <div className={className}>
        {FallbackComponent ? <FallbackComponent /> : children}
        <SubtleUpgradePrompt feature={_feature} config={featureConfig} />
      </div>
    )
  }

  // Prominent upgrade prompt (default)
  return (
    <Card className={`p-6 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
            <IconComponent className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {featureConfig.title}
            </h3>
            <Badge variant="premium" className="bg-amber-100 text-amber-800">
              Professional Only
            </Badge>
          </div>

          <p className="text-gray-600 mb-3">
            {featureConfig.description}
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Professional Benefits:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {featureConfig.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-lg p-4 border border-amber-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600 mb-1">
                  €29/month
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Professional Tier
                </div>
                <div className="text-xs text-amber-700 font-medium">
                  {featureConfig.savings}
                </div>
                <div className="text-xs text-gray-500">
                  {featureConfig.confidence}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="premium"
              size="lg"
              onClick={() => window.location.href = `/subscription/upgrade?source=${_feature}&utm_campaign=feature_gate`}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Upgrade to Professional
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => window.location.href = `/demo?feature=${_feature}`}
              className="border-amber-600 text-amber-700 hover:bg-amber-50"
            >
              See Demo
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function BlockingUpgradePrompt({
  _feature,
  config
}: {
  _feature: string;
  config: typeof FEATURE_DEFINITIONS[keyof typeof FEATURE_DEFINITIONS]
}) {
  const IconComponent = config.icon

  return (
    <div className="min-h-[400px] flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-2 border-amber-200">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <IconComponent className="w-8 h-8 text-amber-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {config.title}
        </h2>

        <p className="text-gray-600 mb-6">
          This feature requires Professional tier for access to our complete Bangkok dataset
          and advanced analytics capabilities.
        </p>

        <div className="bg-white rounded-lg p-4 border border-amber-200 mb-6">
          <div className="text-lg font-bold text-amber-600 mb-1">
            €29/month
          </div>
          <div className="text-sm text-gray-600">
            {config.savings}
          </div>
        </div>

        <Button
          size="lg"
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          onClick={() => window.location.href = `/subscription/upgrade?source=${_feature}_blocking`}
        >
          Upgrade to Access This Feature
        </Button>
      </div>
    </div>
  )
}

function SubtleUpgradePrompt({
  _feature,
  config
}: {
  _feature: string;
  config: typeof FEATURE_DEFINITIONS[keyof typeof FEATURE_DEFINITIONS]
}) {
  return (
    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-amber-800">
            <span className="font-medium">Unlock {config.title}</span> with Professional tier
          </p>
          <p className="text-xs text-amber-600">
            {config.savings} • €29/month
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="border-amber-600 text-amber-700 hover:bg-amber-100"
          onClick={() => window.location.href = `/subscription/upgrade?source=${_feature}_subtle`}
        >
          Upgrade
        </Button>
      </div>
    </div>
  )
}

/**
 * Hook for programmatic access to revenue protection features
 */
export function useRevenueProtection() {
  const { subscription } = useSubscription()

  return {
    hasAccess: (_feature: keyof typeof FEATURE_DEFINITIONS) => {
      return subscription?.tier === 'professional'
    },

    getAccessLevel: () => subscription?.tier || 'free',

    getUpgradeUrl: (source: string) =>
      `/subscription/upgrade?source=${source}&utm_campaign=revenue_protection`
  }
}