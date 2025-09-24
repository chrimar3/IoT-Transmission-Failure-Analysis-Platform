import { useState, useEffect, useCallback } from 'react'

interface OnboardingStep {
  id: string
  title: string
  description: string
  target: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  spotlight?: boolean
  tier_required?: 'free' | 'professional'
}

interface OnboardingConfig {
  version: string
  user_tier: 'free' | 'professional'
  total_steps: number
  steps: OnboardingStep[]
  settings: {
    auto_start: boolean
    show_progress: boolean
    allow_skip: boolean
    show_bullets: boolean
    keyboard_navigation: boolean
    overlay_opacity: number
    spotlight_padding: number
    next_button_text: string
    prev_button_text: string
    skip_button_text: string
    done_button_text: string
  }
}

interface OnboardingProgress {
  current_step: number
  completed_steps: number[]
  completed_at: string | null
  skipped_at: string | null
  onboarding_version: string
}

interface UseOnboardingReturn {
  // State
  isLoading: boolean
  error: string | null
  config: OnboardingConfig | null
  progress: OnboardingProgress | null
  isActive: boolean
  currentStep: OnboardingStep | null

  // Actions
  startOnboarding: () => Promise<void>
  nextStep: () => Promise<void>
  previousStep: () => Promise<void>
  skipOnboarding: () => Promise<void>
  completeOnboarding: () => Promise<void>
  goToStep: (stepIndex: number) => Promise<void>

  // Utilities
  isStepCompleted: (stepIndex: number) => boolean
  canGoToStep: (stepIndex: number) => boolean
  getProgressPercentage: () => number
}

export default function useOnboarding(): UseOnboardingReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<OnboardingConfig | null>(null)
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [isActive, setIsActive] = useState(false)

  // Load onboarding configuration and progress
  const loadOnboardingData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [configResponse, progressResponse] = await Promise.all([
        fetch('/api/onboarding/config'),
        fetch('/api/onboarding/progress')
      ])

      if (!configResponse.ok || !progressResponse.ok) {
        throw new Error('Failed to load onboarding data')
      }

      const configData = await configResponse.json()
      const progressData = await progressResponse.json()

      setConfig(configData.config)
      setProgress(progressData.progress)

      // Auto-start onboarding if not completed or skipped
      const shouldAutoStart = configData.config.settings.auto_start &&
        !progressData.progress.completed_at &&
        !progressData.progress.skipped_at

      if (shouldAutoStart) {
        setIsActive(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initialize onboarding data on mount
  useEffect(() => {
    loadOnboardingData()
  }, [loadOnboardingData])

  // Update progress on server
  const updateProgress = useCallback(async (updates: Partial<OnboardingProgress>) => {
    if (!progress) return

    try {
      const updatedProgress = { ...progress, ...updates }

      const response = await fetch('/api/onboarding/progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedProgress)
      })

      if (!response.ok) {
        throw new Error('Failed to update onboarding progress')
      }

      const data = await response.json()
      setProgress(data.progress)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update progress')
    }
  }, [progress])

  // Start onboarding
  const startOnboarding = useCallback(async () => {
    setIsActive(true)
    if (progress && progress.current_step === 0) {
      await updateProgress({ current_step: 1 })
    }
  }, [progress, updateProgress])

  // Move to next step
  const nextStep = useCallback(async () => {
    if (!config || !progress) return

    const nextStepIndex = progress.current_step + 1
    const completedSteps = [...progress.completed_steps]

    if (!completedSteps.includes(progress.current_step)) {
      completedSteps.push(progress.current_step)
    }

    if (nextStepIndex >= config.total_steps) {
      // Complete onboarding
      await completeOnboarding()
    } else {
      await updateProgress({
        current_step: nextStepIndex,
        completed_steps: completedSteps
      })
    }
  }, [config, progress, updateProgress, completeOnboarding])

  // Move to previous step
  const previousStep = useCallback(async () => {
    if (!progress || progress.current_step <= 0) return

    await updateProgress({
      current_step: progress.current_step - 1
    })
  }, [progress, updateProgress])

  // Skip onboarding
  const skipOnboarding = useCallback(async () => {
    try {
      const response = await fetch('/api/onboarding/skip', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to skip onboarding')
      }

      const data = await response.json()
      setProgress(data.progress)
      setIsActive(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip onboarding')
    }
  }, [])

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    if (!progress) return

    const completedSteps = [...progress.completed_steps]
    if (!completedSteps.includes(progress.current_step)) {
      completedSteps.push(progress.current_step)
    }

    await updateProgress({
      completed_steps: completedSteps,
      completed_at: new Date().toISOString()
    })

    setIsActive(false)
  }, [progress, updateProgress])

  // Go to specific step
  const goToStep = useCallback(async (stepIndex: number) => {
    if (!config || stepIndex < 0 || stepIndex >= config.total_steps) return

    await updateProgress({
      current_step: stepIndex
    })
  }, [config, updateProgress])

  // Check if step is completed
  const isStepCompleted = useCallback((stepIndex: number) => {
    return progress?.completed_steps.includes(stepIndex) ?? false
  }, [progress])

  // Check if can go to step
  const canGoToStep = useCallback((stepIndex: number) => {
    if (!config || !progress) return false

    // Can always go to completed steps or current step
    if (isStepCompleted(stepIndex) || stepIndex === progress.current_step) {
      return true
    }

    // Can go to next step if current step is completed
    if (stepIndex === progress.current_step + 1 && isStepCompleted(progress.current_step)) {
      return true
    }

    return false
  }, [config, progress, isStepCompleted])

  // Get progress percentage
  const getProgressPercentage = useCallback(() => {
    if (!config || !progress) return 0
    return Math.round((progress.completed_steps.length / config.total_steps) * 100)
  }, [config, progress])

  // Get current step object
  const currentStep = config && progress ? config.steps[progress.current_step] || null : null

  return {
    // State
    isLoading,
    error,
    config,
    progress,
    isActive,
    currentStep,

    // Actions
    startOnboarding,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    goToStep,

    // Utilities
    isStepCompleted,
    canGoToStep,
    getProgressPercentage
  }
}