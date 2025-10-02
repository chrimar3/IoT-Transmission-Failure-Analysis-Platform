'use client'

import { useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { AlertTriangle, CreditCard, Loader2, CheckCircle, X } from 'lucide-react'

interface PaymentFailureAlertProps {
  className?: string
  onDismiss?: () => void
}

export function PaymentFailureAlert({ className = '', onDismiss }: PaymentFailureAlertProps) {
  const { subscription, openCustomerPortal, fetchSubscription } = useSubscription()
  const [retrying, setRetrying] = useState(false)
  const [retrySuccess, setRetrySuccess] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)

  // Only show for past_due or incomplete subscriptions
  const shouldShow = subscription?.status === 'past_due' || subscription?.status === 'incomplete'

  if (!shouldShow) {
    return null
  }

  const handleRetryPayment = async () => {
    setRetrying(true)
    setRetryError(null)

    try {
      const response = await fetch('/api/subscription/retry-payment', {
        method: 'POST',
      })

      if (response.ok) {
        setRetrySuccess(true)
        // Refresh subscription data
        await fetchSubscription()

        // Auto-dismiss after success
        setTimeout(() => {
          if (onDismiss) {
            onDismiss()
          }
        }, 3000)
      } else {
        const error = await response.json()
        setRetryError(error.message || 'Payment retry failed')
      }
    } catch (error) {
      setRetryError('Network error. Please try again.')
      console.error('Payment retry error:', error)
    } finally {
      setRetrying(false)
    }
  }

  const handleUpdatePaymentMethod = async () => {
    try {
      await openCustomerPortal()
    } catch (error) {
      console.error('Failed to open customer portal:', error)
    }
  }

  if (retrySuccess) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-900">
              Payment Successful
            </h3>
            <p className="text-sm text-green-700 mt-1">
              Your payment has been processed successfully. Your subscription is now active.
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-green-400 hover:text-green-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-900">
            Payment Required
          </h3>
          <p className="text-sm text-red-700 mt-1">
            {subscription?.status === 'past_due'
              ? 'Your payment is past due. Please update your payment method or retry payment to maintain access to Professional features.'
              : 'Your payment could not be processed. Please update your payment method to complete your subscription.'}
          </p>

          {retryError && (
            <p className="text-sm text-red-800 mt-2 font-medium">
              {retryError}
            </p>
          )}

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={handleRetryPayment}
              disabled={retrying}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {retrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {retrying ? 'Processing...' : 'Retry Payment'}
            </button>

            <button
              onClick={handleUpdatePaymentMethod}
              className="bg-white text-red-600 border border-red-300 px-4 py-2 rounded-lg hover:bg-red-50 text-sm"
            >
              Update Payment Method
            </button>
          </div>

          <div className="mt-3 p-3 bg-red-100 rounded-lg">
            <h4 className="text-sm font-medium text-red-900 mb-1">
              What happens if payment fails?
            </h4>
            <ul className="text-xs text-red-800 space-y-1">
              <li>• Your account will be downgraded to the free tier</li>
              <li>• Export limit will be reduced to 5 per month</li>
              <li>• Advanced features will be disabled</li>
              <li>• You can reactivate anytime by updating payment</li>
            </ul>
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}