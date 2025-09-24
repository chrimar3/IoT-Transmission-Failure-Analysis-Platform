'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, CreditCard, Zap, BarChart3, Shield, Mail } from 'lucide-react'

interface SubscriptionData {
  subscription: {
    id: string
    tier: string
    status: string
  } | null
  usage: {
    exportsThisMonth: number
    exportsLimit: number
    tier: string
  }
}

export default function PricingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      fetchSubscriptionData()
    }
  }, [session])

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscriptionData(data)
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error)
    }
  }

  const handleCheckout = async () => {
    if (!session) {
      router.push('/auth/signin?callbackUrl=/subscription/pricing')
      return
    }

    setCheckoutLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier: 'professional' }),
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        const error = await response.json()
        alert(`Checkout failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Checkout failed. Please try again.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }

  const isProfessional = subscriptionData?.subscription?.tier === 'professional'
  const isSubscriptionActive = subscriptionData?.subscription?.status === 'active'

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Unlock the full potential of CU-BEMS IoT Platform with our Professional tier.
            Get unlimited exports, advanced analytics, and priority support.
          </p>
        </div>

        {/* Current Usage (if user is signed in) */}
        {session && subscriptionData && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">
                  Current Plan: {subscriptionData.subscription?.tier || 'Free'} Tier
                </h3>
                <p className="text-blue-700">
                  Exports this month: {subscriptionData.usage.exportsThisMonth} / {
                    subscriptionData.usage.exportsLimit === Infinity
                      ? 'Unlimited'
                      : subscriptionData.usage.exportsLimit
                  }
                </p>
              </div>
              {isProfessional && isSubscriptionActive && (
                <button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Manage Subscription
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Free Tier</h2>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                €0
                <span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600">Perfect for getting started</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <span>5 exports per month</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <span>Dashboard access</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <span>Basic analytics</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400">
                <span className="h-5 w-5 border border-gray-300 rounded-full"></span>
                <span>Email support</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400">
                <span className="h-5 w-5 border border-gray-300 rounded-full"></span>
                <span>Advanced analytics</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400">
                <span className="h-5 w-5 border border-gray-300 rounded-full"></span>
                <span>API access</span>
              </li>
            </ul>

            <button
              disabled
              className="w-full bg-gray-100 text-gray-400 py-3 px-6 rounded-lg cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>

          {/* Professional Tier */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-500 p-8 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Recommended
              </span>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional</h2>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                €29
                <span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600">For professionals and teams</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Unlimited exports</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <span>Dashboard access</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <span>Basic analytics</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-500" />
                <span>Email support</span>
              </li>
              <li className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <span>Advanced analytics</span>
              </li>
              <li className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-500" />
                <span>Priority support</span>
              </li>
              <li className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-blue-500" />
                <span>API access</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500" />
                <span>Custom reports</span>
              </li>
            </ul>

            {isProfessional && isSubscriptionActive ? (
              <button
                onClick={handleManageSubscription}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Current Plan - Manage
              </button>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Upgrade to Professional
              </button>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, MasterCard, American Express) through our secure Stripe payment system.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Do you offer refunds?
              </h3>
              <p className="text-gray-600">
                We offer a 30-day money-back guarantee. If you&apos;re not satisfied, contact our support team for a full refund.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Is my data secure?
              </h3>
              <p className="text-gray-600">
                Yes, we use industry-standard encryption and security measures to protect your data. Your payment information is securely processed by Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}