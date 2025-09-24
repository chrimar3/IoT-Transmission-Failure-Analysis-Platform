import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

interface ContextualHelpContent {
  id: string
  title: string
  content: string
  type: 'tooltip' | 'overlay' | 'guide' | 'quick_tip'
  priority: number
  triggers: string[]
  conditions?: {
    user_experience?: 'beginner' | 'intermediate' | 'advanced'
    subscription_tier?: 'free' | 'professional'
    page_visits?: number
    feature_usage?: string[]
  }
  actions?: {
    primary?: { text: string; action: string }
    secondary?: { text: string; action: string }
  }
}

// Contextual help content organized by page context
const CONTEXTUAL_HELP_CONTENT: Record<string, ContextualHelpContent[]> = {
  'dashboard': [
    {
      id: 'dashboard-overview',
      title: 'Dashboard Overview',
      content: 'Your dashboard provides a real-time view of your building\'s energy performance. Key metrics show current consumption, efficiency trends, and any anomalies that need attention.',
      type: 'tooltip',
      priority: 1,
      triggers: ['first_visit', 'low_engagement'],
      conditions: { user_experience: 'beginner' },
      actions: {
        primary: { text: 'Take Tour', action: 'start_tour' },
        secondary: { text: 'Learn More', action: 'open_docs:getting-started/dashboard-basics' }
      }
    },
    {
      id: 'metrics-explanation',
      title: 'Understanding Your Metrics',
      content: 'Energy efficiency percentage shows how well your building performs compared to similar facilities. Values above 85% indicate excellent performance.',
      type: 'tooltip',
      priority: 2,
      triggers: ['hover_metric'],
      conditions: {},
      actions: {
        primary: { text: 'Learn About Metrics', action: 'open_docs:analytics-guide/key-metrics' }
      }
    },
    {
      id: 'professional-features',
      title: 'Unlock Advanced Analytics',
      content: 'Upgrade to Professional for detailed trend analysis, custom reports, and API access. Perfect for facility managers who need comprehensive insights.',
      type: 'overlay',
      priority: 3,
      triggers: ['feature_limit_reached'],
      conditions: { subscription_tier: 'free', page_visits: 5 },
      actions: {
        primary: { text: 'Upgrade Now', action: 'navigate:/subscription' },
        secondary: { text: 'Learn More', action: 'open_docs:getting-started/professional-features' }
      }
    }
  ],
  'analytics': [
    {
      id: 'confidence-intervals',
      title: 'Understanding Confidence Intervals',
      content: 'Confidence intervals show the reliability of your data. A 95% confidence interval means we\'re 95% certain the true value falls within this range. Narrower intervals indicate more reliable data.',
      type: 'tooltip',
      priority: 1,
      triggers: ['hover_confidence_interval'],
      conditions: {},
      actions: {
        primary: { text: 'Learn More', action: 'open_docs:statistical-concepts/confidence-intervals' }
      }
    },
    {
      id: 'statistical-significance',
      title: 'Statistical Significance Explained',
      content: 'P-values help determine if differences in your data are meaningful or just random variation. P < 0.05 typically indicates a significant finding worth investigating.',
      type: 'tooltip',
      priority: 2,
      triggers: ['hover_p_value'],
      conditions: {},
      actions: {
        primary: { text: 'Statistical Guide', action: 'open_docs:statistical-concepts/p-values' }
      }
    },
    {
      id: 'data-interpretation',
      title: 'Interpreting Your Building Data',
      content: 'Look for patterns in energy consumption that correlate with occupancy, weather, or equipment schedules. Unexpected spikes may indicate equipment issues or operational inefficiencies.',
      type: 'guide',
      priority: 3,
      triggers: ['low_data_confidence'],
      conditions: { user_experience: 'beginner' },
      actions: {
        primary: { text: 'Data Guide', action: 'open_docs:best-practices/data-interpretation' }
      }
    }
  ],
  'reports': [
    {
      id: 'report-builder-intro',
      title: 'Professional Report Builder',
      content: 'Create custom reports with your branding, schedule automated delivery, and export in multiple formats. Perfect for presenting insights to stakeholders.',
      type: 'overlay',
      priority: 1,
      triggers: ['first_visit'],
      conditions: { subscription_tier: 'professional' },
      actions: {
        primary: { text: 'Start Building', action: 'create_report' },
        secondary: { text: 'View Examples', action: 'open_docs:reports/examples' }
      }
    },
    {
      id: 'upgrade-for-reports',
      title: 'Custom Reports Available',
      content: 'Professional subscribers can create unlimited custom reports with advanced formatting, automated scheduling, and API integration.',
      type: 'overlay',
      priority: 2,
      triggers: ['feature_access_denied'],
      conditions: { subscription_tier: 'free' },
      actions: {
        primary: { text: 'Upgrade', action: 'navigate:/subscription' },
        secondary: { text: 'Learn More', action: 'open_docs:reports/professional-features' }
      }
    }
  ],
  'settings': [
    {
      id: 'api-access',
      title: 'API Integration',
      content: 'Connect your building management system to CU-BEMS using our REST API. Professional subscribers get full API access with comprehensive documentation.',
      type: 'tooltip',
      priority: 1,
      triggers: ['view_api_section'],
      conditions: { subscription_tier: 'professional' },
      actions: {
        primary: { text: 'API Docs', action: 'open_docs:api-documentation/getting-started' }
      }
    },
    {
      id: 'notification-setup',
      title: 'Smart Notifications',
      content: 'Set up alerts for energy spikes, equipment anomalies, or efficiency drops. Get notified when your building needs attention, even when you\'re away.',
      type: 'guide',
      priority: 2,
      triggers: ['notifications_disabled'],
      conditions: {},
      actions: {
        primary: { text: 'Setup Alerts', action: 'configure_notifications' }
      }
    }
  ]
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)

    const pageContext = searchParams.get('page') || 'dashboard'
    const element = searchParams.get('element')
    const trigger = searchParams.get('trigger')
    const _userAction = searchParams.get('action')

    // Get user preferences for personalization
    let userPreferences = null
    const subscriptionTier = 'free'

    if (session?.user?.id) {
      try {
        userPreferences = await prisma.userPreferences.findUnique({
          where: { user_id: session.user.id }
        })

        // TODO: Get actual subscription tier
        // subscriptionTier = await getUserSubscriptionTier(session.user.id)
      } catch (err) {
        console.warn('Error loading user preferences:', err)
      }
    }

    // Get help content for the current page context
    const pageContent = CONTEXTUAL_HELP_CONTENT[pageContext] || []

    // Filter content based on conditions and triggers
    const relevantContent = pageContent.filter(content => {
      // Check trigger conditions
      if (trigger && !content.triggers.includes(trigger)) {
        return false
      }

      // Check user experience level
      if (content.conditions?.user_experience && userPreferences) {
        if (content.conditions.user_experience !== userPreferences.experience_level) {
          return false
        }
      }

      // Check subscription tier
      if (content.conditions?.subscription_tier) {
        if (content.conditions.subscription_tier !== subscriptionTier) {
          return false
        }
      }

      // Check page visit count (simplified - would need user analytics)
      if (content.conditions?.page_visits) {
        // For now, show all content that has page visit requirements
        // In production, this would check actual user visit analytics
      }

      return true
    })

    // Sort by priority and limit results
    const sortedContent = relevantContent
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3) // Limit to top 3 most relevant items

    // Track help interaction if user is authenticated
    if (session?.user?.id && trigger) {
      try {
        await prisma.helpInteractions.create({
          data: {
            user_id: session.user.id,
            help_type: 'contextual',
            page_context: pageContext,
            help_content_id: trigger,
            interaction_type: 'view',
            target_element: element
          }
        })
      } catch (err) {
        console.warn('Error tracking help interaction:', err)
      }
    }

    return NextResponse.json({
      content: sortedContent,
      page_context: pageContext,
      user_tier: subscriptionTier,
      user_experience: userPreferences?.experience_level || 'intermediate',
      total_available: pageContent.length,
      filtered_count: sortedContent.length
    })
  } catch (error) {
    console.error('Error fetching contextual help:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contextual help' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      help_content_id,
      interaction_type,
      page_context,
      target_element,
      session_id
    } = body

    if (!help_content_id || !interaction_type || !page_context) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Valid interaction types
    const validInteractionTypes = ['view', 'click', 'dismiss', 'helpful', 'not_helpful', 'expand', 'collapse']
    if (!validInteractionTypes.includes(interaction_type)) {
      return NextResponse.json(
        { error: 'Invalid interaction type' },
        { status: 400 }
      )
    }

    // Create help interaction record
    const interaction = await prisma.helpInteractions.create({
      data: {
        user_id: session.user.id,
        help_type: 'contextual',
        page_context,
        help_content_id,
        interaction_type,
        target_element,
        session_id
      }
    })

    return NextResponse.json({
      message: 'Help interaction recorded successfully',
      interaction_id: interaction.id
    })
  } catch (error) {
    console.error('Error recording help interaction:', error)
    return NextResponse.json(
      { error: 'Failed to record help interaction' },
      { status: 500 }
    )
  }
}