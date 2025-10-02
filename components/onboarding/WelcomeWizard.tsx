import React, { useState, _useEffect } from 'react'
import { useSession } from 'next-auth/react'
import useOnboarding from '@/src/hooks/useOnboarding'

interface WelcomeWizardProps {
  onComplete?: () => void
  className?: string
}

interface UserPreferences {
  role: 'facility_manager' | 'energy_analyst' | 'building_owner' | 'consultant' | 'other'
  building_type: 'office' | 'retail' | 'industrial' | 'residential' | 'mixed_use' | 'other'
  experience_level: 'beginner' | 'intermediate' | 'advanced'
  primary_goals: string[]
  notifications_enabled: boolean
  tour_preferences: 'full' | 'quick' | 'skip'
}

const ROLE_OPTIONS = [
  { value: 'facility_manager', label: 'Facility Manager', description: 'Manage building operations and maintenance' },
  { value: 'energy_analyst', label: 'Energy Analyst', description: 'Analyze energy consumption and efficiency' },
  { value: 'building_owner', label: 'Building Owner', description: 'Own or invest in building properties' },
  { value: 'consultant', label: 'Consultant', description: 'Provide advisory services to building operators' },
  { value: 'other', label: 'Other', description: 'Different role or multiple responsibilities' }
]

const BUILDING_TYPE_OPTIONS = [
  { value: 'office', label: 'Office Building', description: 'Commercial office spaces' },
  { value: 'retail', label: 'Retail Space', description: 'Shopping centers, stores, restaurants' },
  { value: 'industrial', label: 'Industrial Facility', description: 'Manufacturing, warehouses, distribution' },
  { value: 'residential', label: 'Residential', description: 'Apartments, condos, housing complexes' },
  { value: 'mixed_use', label: 'Mixed Use', description: 'Combination of different building types' },
  { value: 'other', label: 'Other', description: 'Specialized or unique building type' }
]

const GOAL_OPTIONS = [
  { value: 'reduce_energy_costs', label: 'Reduce Energy Costs' },
  { value: 'improve_efficiency', label: 'Improve Energy Efficiency' },
  { value: 'monitor_performance', label: 'Monitor Building Performance' },
  { value: 'identify_issues', label: 'Identify Equipment Issues' },
  { value: 'compliance_reporting', label: 'Compliance Reporting' },
  { value: 'tenant_satisfaction', label: 'Improve Tenant Satisfaction' },
  { value: 'sustainability_goals', label: 'Meet Sustainability Goals' },
  { value: 'data_analysis', label: 'Advanced Data Analysis' }
]

const WelcomeWizard: React.FC<WelcomeWizardProps> = ({
  onComplete,
  className = ''
}) => {
  const { data: _session } = useSession()
  const { _config, startOnboarding } = useOnboarding()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences>({
    role: 'facility_manager',
    building_type: 'office',
    experience_level: 'intermediate',
    primary_goals: [],
    notifications_enabled: true,
    tour_preferences: 'full'
  })

  const totalSteps = 4

  // Handle preference updates
  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  // Handle goal selection
  const toggleGoal = (goal: string) => {
    setPreferences(prev => ({
      ...prev,
      primary_goals: prev.primary_goals.includes(goal)
        ? prev.primary_goals.filter(g => g !== goal)
        : [...prev.primary_goals, goal]
    }))
  }

  // Save preferences and complete wizard
  const handleComplete = async () => {
    setIsLoading(true)

    try {
      // Save user preferences
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      // Start onboarding tour based on preferences
      if (preferences.tour_preferences === 'full' || preferences.tour_preferences === 'quick') {
        await startOnboarding()
      }

      onComplete?.()
    } catch (error) {
      console.error('Error completing welcome wizard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps))
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))

  const isLastStep = step === totalSteps
  const canProceed = step === 1 ||
    (step === 2 && preferences.building_type) ||
    (step === 3 && preferences.primary_goals.length > 0) ||
    step === 4

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${className}`}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Welcome to CU-BEMS</h1>
              <p className="text-blue-100 mt-1">Let&apos;s personalize your experience</p>
            </div>
            <div className="text-right">
              <div className="text-blue-100 text-sm">Step {step} of {totalSteps}</div>
              <div className="w-24 h-2 bg-blue-500 rounded-full mt-1">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Role Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">What&apos;s your role?</h2>
                <p className="text-gray-600">This helps us customize your dashboard and recommendations.</p>
              </div>

              <div className="space-y-3">
                {ROLE_OPTIONS.map(option => (
                  <label key={option.value} className="block">
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={preferences.role === option.value}
                      onChange={(e) => updatePreference('role', e.target.value as string)}
                      className="sr-only"
                    />
                    <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      preferences.role === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Building Type & Experience */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Tell us about your building</h2>
                <p className="text-gray-600">This helps us provide relevant insights and benchmarks.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Building Type</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BUILDING_TYPE_OPTIONS.map(option => (
                    <label key={option.value} className="block">
                      <input
                        type="radio"
                        name="building_type"
                        value={option.value}
                        checked={preferences.building_type === option.value}
                        onChange={(e) => updatePreference('building_type', e.target.value as string)}
                        className="sr-only"
                      />
                      <div className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                        preferences.building_type === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="font-medium text-gray-900 text-sm">{option.label}</div>
                        <div className="text-xs text-gray-600 mt-1">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Experience Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {['beginner', 'intermediate', 'advanced'].map(level => (
                    <label key={level} className="block">
                      <input
                        type="radio"
                        name="experience_level"
                        value={level}
                        checked={preferences.experience_level === level}
                        onChange={(e) => updatePreference('experience_level', e.target.value as string)}
                        className="sr-only"
                      />
                      <div className={`border-2 rounded-lg p-3 text-center cursor-pointer transition-all ${
                        preferences.experience_level === level
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="font-medium text-gray-900 text-sm capitalize">{level}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">What are your primary goals?</h2>
                <p className="text-gray-600">Select all that apply. We&apos;ll prioritize these in your dashboard.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {GOAL_OPTIONS.map(option => (
                  <label key={option.value} className="block">
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={preferences.primary_goals.includes(option.value)}
                      onChange={() => toggleGoal(option.value)}
                      className="sr-only"
                    />
                    <div className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      preferences.primary_goals.includes(option.value)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded border mr-3 flex-shrink-0 ${
                          preferences.primary_goals.includes(option.value)
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {preferences.primary_goals.includes(option.value) && (
                            <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{option.label}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Tour Preferences */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Choose your onboarding experience</h2>
                <p className="text-gray-600">We can guide you through the platform features.</p>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <input
                    type="radio"
                    name="tour_preferences"
                    value="full"
                    checked={preferences.tour_preferences === 'full'}
                    onChange={(e) => updatePreference('tour_preferences', e.target.value as string)}
                    className="sr-only"
                  />
                  <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    preferences.tour_preferences === 'full'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="font-medium text-gray-900">Full Guided Tour</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Complete walkthrough of all features and capabilities (recommended for new users)
                    </div>
                  </div>
                </label>

                <label className="block">
                  <input
                    type="radio"
                    name="tour_preferences"
                    value="quick"
                    checked={preferences.tour_preferences === 'quick'}
                    onChange={(e) => updatePreference('tour_preferences', e.target.value as string)}
                    className="sr-only"
                  />
                  <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    preferences.tour_preferences === 'quick'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="font-medium text-gray-900">Quick Overview</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Brief introduction to key features only
                    </div>
                  </div>
                </label>

                <label className="block">
                  <input
                    type="radio"
                    name="tour_preferences"
                    value="skip"
                    checked={preferences.tour_preferences === 'skip'}
                    onChange={(e) => updatePreference('tour_preferences', e.target.value as string)}
                    className="sr-only"
                  />
                  <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    preferences.tour_preferences === 'skip'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="font-medium text-gray-900">Skip Tour</div>
                    <div className="text-sm text-gray-600 mt-1">
                      I&apos;ll explore on my own (you can always access help later)
                    </div>
                  </div>
                </label>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.notifications_enabled}
                    onChange={(e) => updatePreference('notifications_enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Send me helpful tips and feature updates via email
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              step === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Previous
          </button>

          <button
            onClick={isLastStep ? handleComplete : nextStep}
            disabled={!canProceed || isLoading}
            className={`px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              canProceed && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Setting up...' : isLastStep ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default WelcomeWizard