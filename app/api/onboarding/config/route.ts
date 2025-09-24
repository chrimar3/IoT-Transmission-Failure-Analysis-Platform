import { _NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { getUserSubscription } from '@/lib/stripe/subscription'

interface OnboardingStep {
  id: string
  title: string
  description: string
  target: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  spotlight?: boolean
  tier_required?: 'free' | 'professional'
}

const FREE_TIER_ONBOARDING: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to CU-BEMS Analytics',
    description: 'Your comprehensive building energy management platform. Let\'s get you started with analyzing your facility\'s performance.',
    target: '[data-tour="dashboard-overview"]',
    placement: 'bottom',
    spotlight: true
  },
  {
    id: 'dashboard-navigation',
    title: 'Dashboard Navigation',
    description: 'This is your main dashboard where you can view real-time building performance metrics and key insights.',
    target: '[data-tour="main-dashboard"]',
    placement: 'bottom'
  },
  {
    id: 'analytics-intro',
    title: 'Analytics Overview',
    description: 'Explore your building\'s energy patterns with our Bangkok dataset. View statistical insights and confidence intervals.',
    target: '[data-tour="analytics-section"]',
    placement: 'top'
  },
  {
    id: 'data-interpretation',
    title: 'Understanding Your Data',
    description: 'Learn how to interpret confidence intervals and statistical significance for data-driven facility management.',
    target: '[data-tour="confidence-intervals"]',
    placement: 'left'
  },
  {
    id: 'mobile-access',
    title: 'Mobile Access',
    description: 'Access critical building data on your mobile device for emergency situations and remote monitoring.',
    target: '[data-tour="mobile-indicator"]',
    placement: 'top'
  },
  {
    id: 'help-resources',
    title: 'Get Help Anytime',
    description: 'Use our help system for quick answers, tutorials, and troubleshooting guides. We\'re here to help!',
    target: '[data-tour="help-widget"]',
    placement: 'left'
  },
  {
    id: 'professional-upgrade',
    title: 'Unlock Advanced Features',
    description: 'Upgrade to Professional for advanced analytics, custom reports, and API access. Perfect for facility managers.',
    target: '[data-tour="upgrade-prompt"]',
    placement: 'top'
  }
]

const PROFESSIONAL_TIER_ONBOARDING: OnboardingStep[] = [
  {
    id: 'professional-welcome',
    title: 'Welcome to CU-BEMS Professional',
    description: 'You now have access to advanced analytics, custom reports, and API integration. Let\'s explore your enhanced capabilities.',
    target: '[data-tour="dashboard-overview"]',
    placement: 'bottom',
    spotlight: true,
    tier_required: 'professional'
  },
  {
    id: 'advanced-analytics',
    title: 'Advanced Analytics Suite',
    description: 'Access deeper statistical insights, custom time ranges, and advanced pattern detection for comprehensive facility analysis.',
    target: '[data-tour="advanced-analytics"]',
    placement: 'bottom',
    tier_required: 'professional'
  },
  {
    id: 'custom-reports',
    title: 'Professional Report Builder',
    description: 'Create custom reports with your branding, schedule automated delivery, and export in multiple professional formats.',
    target: '[data-tour="report-builder"]',
    placement: 'top',
    tier_required: 'professional'
  },
  {
    id: 'api-access',
    title: 'API Integration',
    description: 'Integrate building data with your existing systems using our comprehensive API. Perfect for enterprise workflows.',
    target: '[data-tour="api-documentation"]',
    placement: 'left',
    tier_required: 'professional'
  },
  {
    id: 'priority-support',
    title: 'Priority Support Access',
    description: 'Get priority technical support, dedicated assistance, and access to facility management best practices.',
    target: '[data-tour="priority-support"]',
    placement: 'right',
    tier_required: 'professional'
  },
  {
    id: 'billing-management',
    title: 'Subscription Management',
    description: 'Manage your subscription, billing preferences, and access your usage analytics in the account settings.',
    target: '[data-tour="account-settings"]',
    placement: 'left',
    tier_required: 'professional'
  }
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await getUserSubscription(session.user.id)
    const isProfessional = subscription?.status === 'active' && subscription?.tier === 'professional'

    const onboardingSteps = isProfessional ? PROFESSIONAL_TIER_ONBOARDING : FREE_TIER_ONBOARDING

    return NextResponse.json({
      config: {
        version: '1.0',
        user_tier: isProfessional ? 'professional' : 'free',
        total_steps: onboardingSteps.length,
        steps: onboardingSteps,
        settings: {
          auto_start: true,
          show_progress: true,
          allow_skip: true,
          show_bullets: true,
          keyboard_navigation: true,
          overlay_opacity: 0.75,
          spotlight_padding: 8,
          next_button_text: 'Next',
          prev_button_text: 'Previous',
          skip_button_text: 'Skip Tour',
          done_button_text: 'Get Started'
        }
      }
    })
  } catch (error) {
    console.error('Error fetching onboarding config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch onboarding configuration' },
      { status: 500 }
    )
  }
}