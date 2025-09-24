'use client'

import { useRouter } from 'next/navigation'
import { XCircle, ArrowLeft, MessageCircle } from 'lucide-react'

export default function SubscriptionCanceledPage() {
  const router = useRouter()

  const handleBackToPricing = () => {
    router.push('/subscription/pricing')
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  const handleContactSupport = () => {
    // You can replace this with your preferred support contact method
    window.location.href = 'mailto:support@cu-bems.com?subject=Subscription Question'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg">
          {/* Canceled Icon */}
          <div className="flex justify-center mb-6">
            <XCircle className="h-16 w-16 text-gray-400" />
          </div>

          {/* Canceled Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Subscription Canceled
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            No worries! Your subscription process was canceled and no charges were made to your account.
          </p>

          {/* Reassurance */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">You can still enjoy:</h3>
            <ul className="text-left text-blue-800 space-y-2">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                5 free exports per month
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                Full dashboard access
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                Basic analytics and insights
              </li>
            </ul>
          </div>

          {/* Reasons for Professional */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              Why upgrade to Professional?
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Unlimited exports for comprehensive analysis</li>
              <li>• Advanced analytics with predictive insights</li>
              <li>• Priority support when you need help</li>
              <li>• Custom reports tailored to your needs</li>
              <li>• Full API access for integrations</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleBackToPricing}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Pricing
            </button>
            <button
              onClick={handleGoToDashboard}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200"
            >
              Continue with Free Plan
            </button>
          </div>

          {/* Support Section */}
          <div className="mt-6 border-t pt-6">
            <p className="text-sm text-gray-600 mb-3">
              Have questions about our plans or need help?
            </p>
            <button
              onClick={handleContactSupport}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mx-auto"
            >
              <MessageCircle className="h-4 w-4" />
              Contact Support
            </button>
          </div>

          {/* Money Back Guarantee */}
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-800">
              💡 Remember: We offer a 30-day money-back guarantee. Try Professional risk-free!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}