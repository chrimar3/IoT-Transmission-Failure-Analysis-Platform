'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  Calendar,
  TrendingUp,
  Loader2,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Download,
  Shield
} from 'lucide-react'

interface SubscriptionData {
  subscription: {
    id: string
    tier: string
    status: string
    currentPeriodStart?: string
    currentPeriodEnd?: string
    stripeCustomerId?: string
  } | null
  usage: {
    exportsThisMonth: number
    exportsLimit: number
    tier: string
  }
}

export default function ManageSubscriptionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/subscription/manage')
      return
    }

    if (session?.user?.id) {
      fetchSubscriptionData()
    }
  }, [session, status, router])

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscriptionData(data)
      } else {
        console.error('Failed to fetch subscription data')
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerPortal = async () => {
    setActionLoading('portal')
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        const error = await response.json()
        alert(`Failed to open customer portal: ${error.error}`)
      }
    } catch (error) {
      console.error('Customer portal error:', error)
      alert('Failed to open customer portal. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpgrade = () => {
    router.push('/subscription/pricing')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { icon: CheckCircle, color: 'text-green-600 bg-green-100', text: 'Active' },
      canceled: { icon: XCircle, color: 'text-red-600 bg-red-100', text: 'Canceled' },
      past_due: { icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-100', text: 'Past Due' },
      incomplete: { icon: AlertTriangle, color: 'text-orange-600 bg-orange-100', text: 'Incomplete' },
      trialing: { icon: Calendar, color: 'text-blue-600 bg-blue-100', text: 'Trial' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-4 w-4" />
        {config.text}
      </span>
    )
  }

  const getUsagePercentage = () => {
    if (!subscriptionData) return 0
    const { exportsThisMonth, exportsLimit } = subscriptionData.usage
    if (exportsLimit === Infinity) return 0
    return Math.min((exportsThisMonth / exportsLimit) * 100, 100)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!subscriptionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            No Subscription Found
          </h2>
          <p className="text-gray-600 mb-6">
            You don&apos;t have an active subscription yet.
          </p>
          <button
            onClick={handleUpgrade}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            View Pricing Plans
          </button>
        </div>
      </div>
    )
  }

  const subscription = subscriptionData.subscription
  const usage = subscriptionData.usage
  const isProfessional = subscription?.tier === 'professional'
  const isActive = subscription?.status === 'active'
  const usagePercentage = getUsagePercentage()

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Subscription Management
          </h1>
          <p className="text-gray-600">
            Manage your CU-BEMS IoT Platform subscription and usage.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Current Plan */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Current Plan
                  </h2>
                  <p className="text-gray-600">
                    {isProfessional ? 'Professional Tier' : 'Free Tier'}
                  </p>
                </div>
              </div>
              {subscription?.status && getStatusBadge(subscription.status)}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {isProfessional ? '€29' : '€0'}
                </div>
                <div className="text-gray-600">per month</div>
              </div>

              {subscription?.currentPeriodEnd && (
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {formatDate(subscription.currentPeriodEnd)}
                  </div>
                  <div className="text-gray-600">Next billing date</div>
                </div>
              )}

              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {usage.exportsLimit === Infinity ? 'Unlimited' : usage.exportsLimit}
                </div>
                <div className="text-gray-600">Monthly exports</div>
              </div>
            </div>

            {isProfessional && isActive && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleCustomerPortal}
                  disabled={actionLoading === 'portal'}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading === 'portal' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Settings className="h-4 w-4" />
                  )}
                  Manage Payment & Billing
                </button>
              </div>
            )}
          </div>

          {/* Usage Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Usage This Month
                </h2>
                <p className="text-gray-600">
                  Track your monthly exports and feature usage.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Exports Usage */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Data Exports
                  </span>
                  <span className="text-sm text-gray-600">
                    {usage.exportsThisMonth} / {usage.exportsLimit === Infinity ? '∞' : usage.exportsLimit}
                  </span>
                </div>
                {usage.exportsLimit !== Infinity && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        usagePercentage >= 80 ? 'bg-red-500' : usagePercentage >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${usagePercentage}%` }}
                    ></div>
                  </div>
                )}
                {usagePercentage >= 80 && usage.exportsLimit !== Infinity && (
                  <p className="text-sm text-orange-600 mt-2">
                    You&apos;re approaching your monthly export limit. Consider upgrading to Professional for unlimited exports.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Features & Access
                </h2>
                <p className="text-gray-600">
                  Your current plan includes these features.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Download className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Data Exports</div>
                  <div className="text-sm text-gray-600">
                    {isProfessional ? 'Unlimited' : '5 per month'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Analytics</div>
                  <div className="text-sm text-gray-600">
                    {isProfessional ? 'Advanced' : 'Basic'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Support</div>
                  <div className="text-sm text-gray-600">
                    {isProfessional ? 'Priority email' : 'Community'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Settings className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">API Access</div>
                  <div className="text-sm text-gray-600">
                    {isProfessional ? 'Full access' : 'Not available'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade CTA (for free users) */}
          {!isProfessional && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    Upgrade to Professional
                  </h3>
                  <p className="text-blue-100">
                    Unlock unlimited exports, advanced analytics, and priority support for just €29/month.
                  </p>
                </div>
                <button
                  onClick={handleUpgrade}
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 whitespace-nowrap ml-4"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}