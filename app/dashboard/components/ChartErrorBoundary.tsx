/**
 * Error Boundary for Chart Components
 * Provides fallback UI and error recovery for chart failures
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, BarChart3, TrendingDown } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackComponent?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

export default class ChartErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error for monitoring
    console.error('Chart Error Boundary caught an error:', error, errorInfo)

    // Call optional error handler
    this.props.onError?.(error, errorInfo)

    // Report to error monitoring service (e.g., Sentry)
    if (typeof window !== 'undefined' && (window as unknown as { Sentry?: { captureException: (error: Error, context?: unknown) => void } }).Sentry) {
      (window as unknown as { Sentry: { captureException: (error: Error, context?: unknown) => void } }).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
            errorBoundary: 'ChartErrorBoundary'
          }
        }
      })
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback component if provided
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent
      }

      // Default fallback UI
      return (
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <div className="text-center">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <BarChart3 className="h-12 w-12 text-gray-300" />
                <AlertCircle className="h-6 w-6 text-red-500 absolute -top-1 -right-1" />
              </div>
            </div>

            {/* Error Message */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Chart Display Error
            </h3>

            <p className="text-gray-600 mb-4">
              We encountered an issue while rendering the chart. This could be due to:
            </p>

            <ul className="text-sm text-gray-500 mb-6 text-left max-w-md mx-auto">
              <li className="flex items-center space-x-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span>Large dataset causing memory issues</span>
              </li>
              <li className="flex items-center space-x-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span>Invalid or corrupted data format</span>
              </li>
              <li className="flex items-center space-x-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span>Browser compatibility issues</span>
              </li>
            </ul>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-4 bg-gray-50 p-3 rounded border">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Technical Details (Development)
                </summary>
                <div className="text-xs text-gray-600 font-mono">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  <div className="mb-2">
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap text-xs mt-1">
                      {this.state.error.stack}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap text-xs mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center space-x-3">
              {this.state.retryCount < this.maxRetries ? (
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>
                    Retry ({this.maxRetries - this.state.retryCount} attempts left)
                  </span>
                </button>
              ) : (
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reset Component</span>
                </button>
              )}

              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>Reload Page</span>
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 mt-4">
              If this problem persists, try reducing the date range or number of sensors.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// HOC for wrapping components with error boundary
export function withChartErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackComponent?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ChartErrorBoundary fallbackComponent={fallbackComponent}>
      <Component {...props} />
    </ChartErrorBoundary>
  )

  WrappedComponent.displayName = `withChartErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Lightweight error boundary for smaller components
export function ChartErrorWrapper({
  children,
  componentName = 'Chart Component'
}: {
  children: ReactNode
  componentName?: string
}) {
  return (
    <ChartErrorBoundary
      fallbackComponent={
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700">
            {componentName} failed to load
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-red-600 underline mt-1 hover:text-red-800"
          >
            Reload page
          </button>
        </div>
      }
    >
      {children}
    </ChartErrorBoundary>
  )
}