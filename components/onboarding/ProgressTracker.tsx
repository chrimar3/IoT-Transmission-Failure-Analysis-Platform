import React from 'react'
import useOnboarding from '@/src/hooks/useOnboarding'

interface ProgressTrackerProps {
  variant?: 'full' | 'minimal' | 'dots'
  className?: string
  showLabels?: boolean
  showPercentage?: boolean
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  variant = 'full',
  className = '',
  showLabels = true,
  showPercentage = true
}) => {
  const {
    config,
    progress,
    isActive,
    currentStep,
    isStepCompleted,
    canGoToStep,
    getProgressPercentage,
    goToStep
  } = useOnboarding()

  if (!config || !progress || !isActive) {
    return null
  }

  const progressPercentage = getProgressPercentage()
  const currentStepIndex = progress.current_step

  if (variant === 'dots') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {config.steps.map((step, index) => (
          <div
            key={step.id}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              index === currentStepIndex
                ? 'bg-blue-600 scale-125'
                : isStepCompleted(index)
                ? 'bg-blue-400'
                : 'bg-gray-300'
            }`}
          />
        ))}
        {showPercentage && (
          <span className="ml-3 text-sm font-medium text-gray-600">
            {progressPercentage}%
          </span>
        )}
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className={`${className}`}>
        <div className="flex justify-between items-center mb-2">
          {showLabels && (
            <span className="text-sm font-medium text-gray-700">
              Step {currentStepIndex + 1} of {config.total_steps}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-500">{progressPercentage}%</span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    )
  }

  // Full variant
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Onboarding Progress</h3>
        <span className="text-sm font-medium text-blue-600">
          {progressPercentage}% Complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-4">
        {config.steps.map((step, index) => {
          const isCompleted = isStepCompleted(index)
          const isCurrent = index === currentStepIndex
          const isClickable = canGoToStep(index)

          return (
            <div
              key={step.id}
              className={`flex items-start space-x-3 ${
                isClickable ? 'cursor-pointer hover:bg-gray-50' : ''
              } p-2 rounded-lg transition-colors`}
              onClick={isClickable ? () => goToStep(index) : undefined}
            >
              {/* Step indicator */}
              <div className="flex-shrink-0 mt-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-sm font-medium ${
                      isCurrent
                        ? 'text-blue-900'
                        : isCompleted
                        ? 'text-green-800'
                        : 'text-gray-700'
                    }`}
                  >
                    {step.title}
                  </h4>

                  {/* Status badge */}
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      isCompleted
                        ? 'bg-green-100 text-green-800'
                        : isCurrent
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Pending'}
                  </span>
                </div>

                {showLabels && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {step.description}
                  </p>
                )}

                {/* Tier indicator */}
                {step.tier_required && (
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        step.tier_required === 'professional'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {step.tier_required === 'professional' ? '👑 Professional' : 'Free'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Current step details */}
      {currentStep && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Current: {currentStep.title}
              </h4>
              <p className="text-sm text-blue-700">
                {currentStep.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          {progress.completed_steps.length} of {config.total_steps} steps completed
        </div>

        <div className="flex space-x-2">
          {progress.current_step > 0 && (
            <button
              onClick={() => goToStep(progress.current_step - 1)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Previous
            </button>
          )}

          {progress.current_step < config.total_steps - 1 && (
            <button
              onClick={() => goToStep(progress.current_step + 1)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProgressTracker