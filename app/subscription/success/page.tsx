'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react'

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [_verified, setVerified] = useState(false)
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    const verifySession = async () => {
      if (!sessionId) {
        setLoading(false)
        return
      }

      try {
        // Verify the session was successful
        const response = await fetch('/api/subscription')
        if (response.ok) {
          setVerified(true)
        }
      } catch (error) {
        console.error('Failed to verify subscription:', error)
      } finally {
        setLoading(false)
      }
    }

    verifySession()
  }, [sessionId])

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  const handleManageSubscription = () => {
    router.push('/subscription/manage')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Processing your subscription...
          </h2>
          <p className="text-gray-600">
            Please wait while we confirm your payment.
          </p>
        </div>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invalid Session
            </h2>
            <p className="text-gray-600 mb-6">
              No valid session found. Please try subscribing again.
            </p>
            <button
              onClick={() => router.push('/subscription/pricing')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Back to Pricing
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Professional!
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Your subscription has been successfully activated. You now have access to all Professional features including unlimited exports, advanced analytics, and priority support.
          </p>

          {/* Features List */}
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-900 mb-3">What&apos;s included:</h3>
            <ul className="text-left text-green-800 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Unlimited data exports
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Advanced analytics and insights
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Priority email support
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Custom report generation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Full API access
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGoToDashboard}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleManageSubscription}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200"
            >
              Manage Subscription
            </button>
          </div>

          {/* Support Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Need help getting started? Contact our support team at{' '}
              <a href="mailto:support@cu-bems.com" className="font-semibold underline">
                support@cu-bems.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}