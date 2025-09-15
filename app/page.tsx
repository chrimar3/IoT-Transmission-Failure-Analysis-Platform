/**
 * CU-BEMS IoT Platform - Main Landing Page
 */

import Navigation from '../components/Navigation'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Hero Section */}
      <header className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              CU-BEMS IoT Analytics Platform
            </h1>
            <p className="mt-6 text-xl leading-8">
              Bangkok Building Energy Management System - 124.9M Sensor Records Analyzed
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/dashboard"
                className="rounded-md bg-white px-6 py-3 text-lg font-semibold text-blue-600 shadow-sm hover:bg-gray-100 transition-colors"
              >
                View Analytics Dashboard →
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Key Metrics Preview */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Platform Insights</h2>
            <p className="mt-4 text-lg text-gray-600">Real business value from IoT sensor data</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
              <div className="text-4xl font-bold text-green-600 mb-4">$273,500</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Annual Savings Identified</h3>
              <p className="text-gray-600">Potential cost reductions across energy and maintenance</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
              <div className="text-4xl font-bold text-blue-600 mb-4">144</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">IoT Sensors Analyzed</h3>
              <p className="text-gray-600">Across 7 floors with 18 months of data</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
              <div className="text-4xl font-bold text-purple-600 mb-4">100%</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Data Quality Score</h3>
              <p className="text-gray-600">124.9M validated sensor records</p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Findings */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Critical Findings</h2>
            <p className="mt-4 text-lg text-gray-600">Actionable insights from Bangkok building data</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center p-6 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <div className="text-2xl mr-4">🚨</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Floor 2 Energy Anomaly</h3>
                <p className="text-gray-700">Consuming 2.8x more energy than building average</p>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">$25-35K</div>
                <div className="text-sm text-gray-500">Savings potential</div>
              </div>
            </div>

            <div className="flex items-center p-6 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg">
              <div className="text-2xl mr-4">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">14 AC Units at Risk</h3>
                <p className="text-gray-700">Showing performance degradation requiring maintenance</p>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">$40-55K</div>
                <div className="text-sm text-gray-500">Prevention value</div>
              </div>
            </div>

            <div className="flex items-center p-6 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
              <div className="text-2xl mr-4">📈</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Energy Consumption Trend</h3>
                <p className="text-gray-700">12.3% year-over-year increase identified</p>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">$45-60K</div>
                <div className="text-sm text-gray-500">Impact if unchecked</div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Explore Full Analytics Dashboard
              <span className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Technical Foundation</h2>
            <p className="mt-4 text-lg text-gray-600">Enterprise-grade IoT analytics platform</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-3">🏗️</div>
              <h3 className="font-semibold text-gray-900">Hybrid Architecture</h3>
              <p className="text-sm text-gray-600 mt-2">R2 + Supabase for optimal performance</p>
            </div>

            <div className="text-center">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-semibold text-gray-900">&lt;500ms APIs</h3>
              <p className="text-sm text-gray-600 mt-2">Sub-second response times achieved</p>
            </div>

            <div className="text-center">
              <div className="text-3xl mb-3">🛡️</div>
              <h3 className="font-semibold text-gray-900">100% Data Integrity</h3>
              <p className="text-sm text-gray-600 mt-2">Lossless compression and validation</p>
            </div>

            <div className="text-center">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold text-gray-900">Real-time Insights</h3>
              <p className="text-sm text-gray-600 mt-2">89-99% confidence scoring</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">CU-BEMS IoT Analytics Platform</h3>
            <p className="text-gray-400 mb-6">
              Transforming 124.9M Bangkok building sensor records into actionable business intelligence
            </p>
            <div className="flex justify-center space-x-6 text-sm">
              <span>📡 144 Sensors</span>
              <span>🏢 7 Floors</span>
              <span>📅 18 Months Data</span>
              <span>💰 $273K Savings Identified</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}