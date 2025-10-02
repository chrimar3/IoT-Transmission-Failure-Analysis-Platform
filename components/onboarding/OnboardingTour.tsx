import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useOnboarding from '@/src/hooks/useOnboarding'

interface OnboardingTourProps {
  autoStart?: boolean
  className?: string
}

interface Position {
  top: number
  left: number
  width: number
  height: number
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({
  autoStart = true,
  className = ''
}) => {
  const {
    isLoading,
    error,
    config,
    progress,
    isActive,
    currentStep,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    startOnboarding,
    getProgressPercentage
  } = useOnboarding()

  const [_targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [targetPosition, setTargetPosition] = useState<Position | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<Position | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Find and position target element
  useEffect(() => {
    if (!isActive || !currentStep || !config) return

    const findTargetElement = () => {
      const element = document.querySelector(currentStep.target) as HTMLElement
      if (element) {
        const rect = element.getBoundingClientRect()
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

        setTargetElement(element)
        setTargetPosition({
          top: rect.top + scrollTop,
          left: rect.left + scrollLeft,
          width: rect.width,
          height: rect.height
        })

        // Calculate tooltip position
        calculateTooltipPosition(rect, currentStep.placement)
      }
    }

    // Try to find element immediately
    findTargetElement()

    // If not found, retry after a short delay
    const retryTimeout = setTimeout(findTargetElement, 100)

    return () => clearTimeout(retryTimeout)
  }, [isActive, currentStep, config])

  // Calculate tooltip position based on target and placement
  const calculateTooltipPosition = (targetRect: DOMRect, placement: string) => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
    const tooltipWidth = 320
    const tooltipHeight = 200
    const spacing = 20

    let top = 0
    let left = 0

    switch (placement) {
      case 'top':
        top = targetRect.top + scrollTop - tooltipHeight - spacing
        left = targetRect.left + scrollLeft + (targetRect.width / 2) - (tooltipWidth / 2)
        break
      case 'bottom':
        top = targetRect.bottom + scrollTop + spacing
        left = targetRect.left + scrollLeft + (targetRect.width / 2) - (tooltipWidth / 2)
        break
      case 'left':
        top = targetRect.top + scrollTop + (targetRect.height / 2) - (tooltipHeight / 2)
        left = targetRect.left + scrollLeft - tooltipWidth - spacing
        break
      case 'right':
        top = targetRect.top + scrollTop + (targetRect.height / 2) - (tooltipHeight / 2)
        left = targetRect.right + scrollLeft + spacing
        break
    }

    // Ensure tooltip stays within viewport
    const maxLeft = window.innerWidth - tooltipWidth - 20
    const maxTop = window.innerHeight + scrollTop - tooltipHeight - 20

    left = Math.max(20, Math.min(left, maxLeft))
    top = Math.max(scrollTop + 20, Math.min(top, maxTop))

    setTooltipPosition({
      top,
      left,
      width: tooltipWidth,
      height: tooltipHeight
    })
  }

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive || !config?.settings.keyboard_navigation) return

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'Enter':
          event.preventDefault()
          nextStep()
          break
        case 'ArrowLeft':
          event.preventDefault()
          previousStep()
          break
        case 'Escape':
          event.preventDefault()
          skipOnboarding()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, config, nextStep, previousStep, skipOnboarding])

  // Auto-start onboarding if enabled
  useEffect(() => {
    if (autoStart && config?.settings.auto_start && !progress?.completed_at && !progress?.skipped_at) {
      startOnboarding()
    }
  }, [autoStart, config, progress, startOnboarding])

  // Handle navigation actions
  const handleNext = () => {
    if (progress && config && progress.current_step >= config.total_steps - 1) {
      completeOnboarding()
    } else {
      nextStep()
    }
  }

  const handlePrevious = () => {
    if (progress && progress.current_step > 0) {
      previousStep()
    }
  }

  const handleSkip = () => {
    skipOnboarding()
  }

  // Get button text based on current step
  const getNextButtonText = () => {
    if (!config || !progress) return 'Next'

    if (progress.current_step >= config.total_steps - 1) {
      return config.settings.done_button_text
    }
    return config.settings.next_button_text
  }

  if (isLoading || error || !isActive || !currentStep || !config || !targetPosition || !tooltipPosition) {
    return null
  }

  const progressPercentage = getProgressPercentage()
  const currentStepNumber = (progress?.current_step || 0) + 1

  return createPortal(
    <div className={`fixed inset-0 z-50 ${className}`}>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{ opacity: config.settings.overlay_opacity }}
      />

      {/* Spotlight */}
      {currentStep.spotlight && (
        <div
          className="absolute bg-white rounded-lg shadow-2xl"
          style={{
            top: targetPosition.top - config.settings.spotlight_padding,
            left: targetPosition.left - config.settings.spotlight_padding,
            width: targetPosition.width + (config.settings.spotlight_padding * 2),
            height: targetPosition.height + (config.settings.spotlight_padding * 2),
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, ${config.settings.overlay_opacity})`
          }}
        />
      )}

      {/* Target highlight */}
      <div
        className="absolute border-2 border-blue-500 rounded-lg pointer-events-none animate-pulse"
        style={{
          top: targetPosition.top - 2,
          left: targetPosition.left - 2,
          width: targetPosition.width + 4,
          height: targetPosition.height + 4
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute bg-white rounded-lg shadow-2xl border border-gray-200 p-6 max-w-sm"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          width: tooltipPosition.width
        }}
      >
        {/* Progress indicator */}
        {config.settings.show_progress && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStepNumber} of {config.total_steps}
              </span>
              <span className="text-sm text-gray-500">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {currentStep.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            {/* Bullet indicators */}
            {config.settings.show_bullets && (
              <div className="flex space-x-1">
                {Array.from({ length: config.total_steps }, (_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                      index === progress?.current_step
                        ? 'bg-blue-600'
                        : index < (progress?.current_step || 0)
                        ? 'bg-blue-300'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            {/* Skip button */}
            {config.settings.allow_skip && (
              <button
                onClick={handleSkip}
                className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                {config.settings.skip_button_text}
              </button>
            )}

            {/* Previous button */}
            {progress && progress.current_step > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                {config.settings.prev_button_text}
              </button>
            )}

            {/* Next/Done button */}
            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              {getNextButtonText()}
            </button>
          </div>
        </div>

        {/* Pointer arrow */}
        <div
          className={`absolute w-3 h-3 bg-white border-gray-200 transform rotate-45 ${
            currentStep.placement === 'top'
              ? 'bottom-[-6px] left-1/2 -translate-x-1/2 border-b border-r'
              : currentStep.placement === 'bottom'
              ? 'top-[-6px] left-1/2 -translate-x-1/2 border-t border-l'
              : currentStep.placement === 'left'
              ? 'right-[-6px] top-1/2 -translate-y-1/2 border-t border-r'
              : 'left-[-6px] top-1/2 -translate-y-1/2 border-b border-l'
          }`}
        />
      </div>
    </div>,
    document.body
  )
}

export default OnboardingTour