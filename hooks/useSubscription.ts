'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

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

interface FeatureAccess {
  canAccess: boolean
  message?: string
  upgradeRequired?: boolean
}

export function useSubscription() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch subscription data
  const fetchSubscription = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscriptionData(data)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch subscription')
      }
    } catch (err) {
      setError('Network error fetching subscription')
      console.error('Subscription fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  // Initial load
  useEffect(() => {
    if (status !== 'loading') {
      fetchSubscription()
    }
  }, [status, fetchSubscription])

  // Check if user can access a specific feature
  const checkFeatureAccess = useCallback(async (feature: string): Promise<FeatureAccess> => {
    if (!subscriptionData) {
      return { canAccess: false, message: 'Subscription data not loaded' }
    }

    const subscription = subscriptionData.subscription
    const usage = subscriptionData.usage

    if (!subscription || subscription.status !== 'active') {
      return {
        canAccess: false,
        message: 'Active subscription required',
        upgradeRequired: true
      }
    }

    const tier = subscription.tier?.toLowerCase() || 'free'

    switch (feature) {
      case 'export':
        if (tier === 'professional') {
          return { canAccess: true }
        }

        if (usage.exportsThisMonth >= usage.exportsLimit) {
          return {
            canAccess: false,
            message: 'Monthly export limit reached. Upgrade to Professional for unlimited exports.',
            upgradeRequired: true
          }
        }

        return { canAccess: true }

      case 'advanced_analytics':
        if (tier === 'professional') {
          return { canAccess: true }
        }
        return {
          canAccess: false,
          message: 'Advanced analytics requires a Professional subscription.',
          upgradeRequired: true
        }

      case 'api_access':
        if (tier === 'professional') {
          return { canAccess: true }
        }
        return {
          canAccess: false,
          message: 'API access requires a Professional subscription.',
          upgradeRequired: true
        }

      case 'custom_reports':
        if (tier === 'professional') {
          return { canAccess: true }
        }
        return {
          canAccess: false,
          message: 'Custom reports require a Professional subscription.',
          upgradeRequired: true
        }

      case 'priority_support':
        if (tier === 'professional') {
          return { canAccess: true }
        }
        return {
          canAccess: false,
          message: 'Priority support requires a Professional subscription.',
          upgradeRequired: true
        }

      default:
        return { canAccess: true }
    }
  }, [subscriptionData])

  // Create checkout session
  const createCheckoutSession = useCallback(async (tier: 'professional') => {
    if (!session) {
      router.push('/auth/signin?callbackUrl=/subscription/pricing')
      return null
    }

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      })

      if (response.ok) {
        const { url } = await response.json()
        return url
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout session')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      throw err
    }
  }, [session, router])

  // Open customer portal
  const openCustomerPortal = useCallback(async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to open customer portal')
      }
    } catch (err) {
      console.error('Customer portal error:', err)
      throw err
    }
  }, [])

  // Upgrade to professional
  const upgradeToProfessional = useCallback(async () => {
    try {
      const url = await createCheckoutSession('professional')
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      console.error('Upgrade error:', err)
      throw err
    }
  }, [createCheckoutSession])

  // Navigate to pricing page
  const goToPricing = useCallback(() => {
    router.push('/subscription/pricing')
  }, [router])

  // Navigate to subscription management
  const goToManagement = useCallback(() => {
    router.push('/subscription/manage')
  }, [router])

  // Get usage percentage for display
  const getUsagePercentage = useCallback((type: 'exports' = 'exports') => {
    if (!subscriptionData) return 0

    switch (type) {
      case 'exports':
        const { exportsThisMonth, exportsLimit } = subscriptionData.usage
        if (exportsLimit === Infinity) return 0
        return Math.min((exportsThisMonth / exportsLimit) * 100, 100)
      default:
        return 0
    }
  }, [subscriptionData])

  // Check if user is on professional tier
  const isProfessional = subscriptionData?.subscription?.tier === 'professional'
  const isActive = subscriptionData?.subscription?.status === 'active'
  const isLoading = loading || status === 'loading'

  return {
    // Data
    subscription: subscriptionData?.subscription || null,
    usage: subscriptionData?.usage || null,
    loading: isLoading,
    error,

    // Status checks
    isProfessional,
    isActive,
    isAuthenticated: !!session,

    // Actions
    fetchSubscription,
    checkFeatureAccess,
    createCheckoutSession,
    openCustomerPortal,
    upgradeToProfessional,
    goToPricing,
    goToManagement,

    // Utilities
    getUsagePercentage,
  }
}