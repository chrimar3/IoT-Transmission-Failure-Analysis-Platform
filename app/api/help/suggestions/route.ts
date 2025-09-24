import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

interface HelpSuggestion {
  id: string
  title: string
  description: string
  type: 'tutorial' | 'documentation' | 'feature' | 'best_practice' | 'troubleshooting'
  priority: number
  relevance_score: number
  action: {
    type: 'navigate' | 'open_modal' | 'start_tour' | 'open_docs'
    target: string
    text: string
  }
  tags: string[]
  estimated_time_minutes?: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)

    const _pageContext = searchParams.get('page') || 'dashboard'
    const userAction = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '5')

    // Get user preferences and behavior patterns
    let userPreferences = null
    let userBehaviorPattern = null
    const subscriptionTier = 'free'

    if (session?.user?.id) {
      try {
        // Load user preferences
        userPreferences = await prisma.userPreferences.findUnique({
          where: { user_id: session.user.id }
        })

        // Analyze user behavior patterns from help interactions and documentation usage
        userBehaviorPattern = await analyzeUserBehavior(session.user.id)

        // TODO: Get actual subscription tier
        // subscriptionTier = await getUserSubscriptionTier(session.user.id)
      } catch (err) {
        console.warn('Error loading user data:', err)
      }
    }

    // Generate smart suggestions based on context and user behavior
    const suggestions = await generateSmartSuggestions({
      _pageContext,
      userAction,
      userPreferences,
      userBehaviorPattern,
      subscriptionTier,
      limit
    })

    return NextResponse.json({
      suggestions,
      page_context: _pageContext,
      user_tier: subscriptionTier,
      personalization_applied: !!userPreferences,
      total_suggestions: suggestions.length
    })
  } catch (error) {
    console.error('Error generating help suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate help suggestions' },
      { status: 500 }
    )
  }
}

async function analyzeUserBehavior(userId: string) {
  try {
    // Get recent help interactions
    const helpInteractions = await prisma.helpInteractions.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: { created_at: 'desc' },
      take: 50
    })

    // Get documentation usage patterns
    const docUsage = await prisma.documentationUsage.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: { created_at: 'desc' },
      take: 50
    })

    // Analyze patterns
    const pageVisits = helpInteractions.reduce((acc, interaction) => {
      acc[interaction.page_context] = (acc[interaction.page_context] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const helpTopics = helpInteractions.map(i => i.help_content_id)
    const documentCategories = docUsage.map(d => d.document_slug.split('/')[0])

    const strugglingAreas = Object.entries(pageVisits)
      .filter(([_page, visits]) => visits > 3)
      .map(([page]) => page)

    const interestedTopics = [...new Set([...helpTopics, ...documentCategories])]

    return {
      most_visited_pages: Object.entries(pageVisits)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([page]) => page),
      struggling_areas: strugglingAreas,
      interested_topics: interestedTopics.slice(0, 5),
      help_seeking_frequency: helpInteractions.length,
      documentation_engagement: docUsage.length,
      average_session_duration: docUsage.reduce((sum, doc) =>
        sum + (doc.session_duration_seconds || 0), 0) / Math.max(docUsage.length, 1)
    }
  } catch (error) {
    console.error('Error analyzing user behavior:', error)
    return null
  }
}

async function generateSmartSuggestions({
  _pageContext,
  userAction,
  userPreferences,
  userBehaviorPattern,
  subscriptionTier,
  limit
}: {
  _pageContext: string
  userAction?: string | null
  userPreferences: unknown
  userBehaviorPattern: unknown
  subscriptionTier: string
  limit: number
}): Promise<HelpSuggestion[]> {

  const suggestions: HelpSuggestion[] = []

  // Context-specific suggestions
  const contextSuggestions = getContextSpecificSuggestions(_pageContext, subscriptionTier)
  suggestions.push(...contextSuggestions)

  // User behavior-based suggestions
  if (userBehaviorPattern) {
    const behaviorSuggestions = getBehaviorBasedSuggestions(userBehaviorPattern, subscriptionTier)
    suggestions.push(...behaviorSuggestions)
  }

  // Experience level-based suggestions
  if (userPreferences?.experience_level) {
    const experienceSuggestions = getExperienceBasedSuggestions(
      userPreferences.experience_level,
      _pageContext,
      subscriptionTier
    )
    suggestions.push(...experienceSuggestions)
  }

  // Goal-based suggestions
  if (userPreferences?.primary_goals) {
    const goalSuggestions = getGoalBasedSuggestions(userPreferences.primary_goals, _pageContext)
    suggestions.push(...goalSuggestions)
  }

  // Action-specific suggestions
  if (userAction) {
    const actionSuggestions = getActionSpecificSuggestions(userAction, _pageContext)
    suggestions.push(...actionSuggestions)
  }

  // Remove duplicates and calculate relevance scores
  const uniqueSuggestions = suggestions.reduce((acc, suggestion) => {
    const existing = acc.find(s => s.id === suggestion.id)
    if (existing) {
      existing.relevance_score += suggestion.relevance_score
    } else {
      acc.push({ ...suggestion })
    }
    return acc
  }, [] as HelpSuggestion[])

  // Sort by relevance score and priority, then limit results
  return uniqueSuggestions
    .sort((a, b) => {
      if (a.relevance_score !== b.relevance_score) {
        return b.relevance_score - a.relevance_score
      }
      return a.priority - b.priority
    })
    .slice(0, limit)
}

function getContextSpecificSuggestions(_pageContext: string, subscriptionTier: string): HelpSuggestion[] {
  const suggestions: HelpSuggestion[] = []

  switch (_pageContext) {
    case 'dashboard':
      suggestions.push({
        id: 'dashboard-overview-tutorial',
        title: 'Dashboard Overview Tutorial',
        description: 'Learn how to read your energy metrics and identify optimization opportunities',
        type: 'tutorial',
        priority: 1,
        relevance_score: 5,
        action: {
          type: 'start_tour',
          target: 'dashboard-tour',
          text: 'Start Tutorial'
        },
        tags: ['dashboard', 'basics', 'energy-metrics'],
        estimated_time_minutes: 5,
        difficulty: 'beginner'
      })

      if (subscriptionTier === 'free') {
        suggestions.push({
          id: 'upgrade-benefits',
          title: 'Unlock Advanced Analytics',
          description: 'Discover how Professional features can provide deeper insights into your building performance',
          type: 'feature',
          priority: 3,
          relevance_score: 3,
          action: {
            type: 'navigate',
            target: '/subscription',
            text: 'View Plans'
          },
          tags: ['upgrade', 'professional', 'analytics'],
          estimated_time_minutes: 2
        })
      }
      break

    case 'analytics':
      suggestions.push({
        id: 'statistical-concepts-guide',
        title: 'Understanding Statistical Concepts',
        description: 'Learn how to interpret confidence intervals, p-values, and statistical significance in facility management',
        type: 'documentation',
        priority: 1,
        relevance_score: 5,
        action: {
          type: 'open_docs',
          target: 'statistical-concepts/overview',
          text: 'Read Guide'
        },
        tags: ['statistics', 'confidence-intervals', 'analysis'],
        estimated_time_minutes: 10,
        difficulty: 'intermediate'
      })
      break

    case 'reports':
      if (subscriptionTier === 'professional') {
        suggestions.push({
          id: 'report-builder-tutorial',
          title: 'Create Your First Custom Report',
          description: 'Step-by-step guide to building professional reports with your branding',
          type: 'tutorial',
          priority: 1,
          relevance_score: 5,
          action: {
            type: 'start_tour',
            target: 'report-builder-tour',
            text: 'Start Building'
          },
          tags: ['reports', 'professional', 'branding'],
          estimated_time_minutes: 15,
          difficulty: 'intermediate'
        })
      }
      break
  }

  return suggestions
}

function getBehaviorBasedSuggestions(behaviorPattern: unknown, _subscriptionTier: string): HelpSuggestion[] {
  const suggestions: HelpSuggestion[] = []

  // If user is struggling with certain areas
  if (behaviorPattern.struggling_areas?.length > 0) {
    behaviorPattern.struggling_areas.forEach((area: string) => {
      if (area === 'analytics') {
        suggestions.push({
          id: 'analytics-troubleshooting',
          title: 'Analytics Troubleshooting Guide',
          description: 'Common issues with data interpretation and how to resolve them',
          type: 'troubleshooting',
          priority: 1,
          relevance_score: 4,
          action: {
            type: 'open_docs',
            target: 'troubleshooting/analytics-issues',
            text: 'Get Help'
          },
          tags: ['troubleshooting', 'analytics', 'data'],
          estimated_time_minutes: 8,
          difficulty: 'intermediate'
        })
      }
    })
  }

  // If user has low documentation engagement
  if (behaviorPattern.documentation_engagement < 3) {
    suggestions.push({
      id: 'getting-started-basics',
      title: 'Essential Getting Started Guide',
      description: 'Quick overview of key features every facility manager should know',
      type: 'documentation',
      priority: 2,
      relevance_score: 4,
      action: {
        type: 'open_docs',
        target: 'getting-started/essentials',
        text: 'Learn Basics'
      },
      tags: ['getting-started', 'basics', 'overview'],
      estimated_time_minutes: 12,
      difficulty: 'beginner'
    })
  }

  return suggestions
}

function getExperienceBasedSuggestions(
  experienceLevel: string,
  _pageContext: string,
  subscriptionTier: string
): HelpSuggestion[] {
  const suggestions: HelpSuggestion[] = []

  if (experienceLevel === 'beginner') {
    suggestions.push({
      id: 'facility-management-basics',
      title: 'Facility Management with Data Analytics',
      description: 'Learn how to apply building data insights to improve operations and reduce costs',
      type: 'best_practice',
      priority: 2,
      relevance_score: 3,
      action: {
        type: 'open_docs',
        target: 'best-practices/facility-management-basics',
        text: 'Learn Best Practices'
      },
      tags: ['best-practices', 'facility-management', 'basics'],
      estimated_time_minutes: 20,
      difficulty: 'beginner'
    })
  } else if (experienceLevel === 'advanced') {
    if (subscriptionTier === 'professional') {
      suggestions.push({
        id: 'api-integration-guide',
        title: 'Advanced API Integration',
        description: 'Connect your building management system with CU-BEMS for automated data flows',
        type: 'documentation',
        priority: 2,
        relevance_score: 3,
        action: {
          type: 'open_docs',
          target: 'api-documentation/advanced-integration',
          text: 'View API Docs'
        },
        tags: ['api', 'integration', 'advanced'],
        estimated_time_minutes: 30,
        difficulty: 'advanced'
      })
    }
  }

  return suggestions
}

function getGoalBasedSuggestions(primaryGoals: string[], _pageContext: string): HelpSuggestion[] {
  const suggestions: HelpSuggestion[] = []

  if (primaryGoals.includes('reduce_energy_costs')) {
    suggestions.push({
      id: 'cost-reduction-strategies',
      title: 'Energy Cost Reduction Strategies',
      description: 'Proven methods to identify and eliminate energy waste in your building',
      type: 'best_practice',
      priority: 1,
      relevance_score: 4,
      action: {
        type: 'open_docs',
        target: 'best-practices/cost-reduction',
        text: 'Learn Strategies'
      },
      tags: ['cost-reduction', 'energy-savings', 'optimization'],
      estimated_time_minutes: 15,
      difficulty: 'intermediate'
    })
  }

  if (primaryGoals.includes('compliance_reporting')) {
    suggestions.push({
      id: 'compliance-reporting-guide',
      title: 'Compliance Reporting Made Easy',
      description: 'Generate reports that meet regulatory requirements and demonstrate building performance',
      type: 'documentation',
      priority: 1,
      relevance_score: 4,
      action: {
        type: 'open_docs',
        target: 'best-practices/compliance-reporting',
        text: 'View Guide'
      },
      tags: ['compliance', 'reporting', 'regulations'],
      estimated_time_minutes: 18,
      difficulty: 'intermediate'
    })
  }

  return suggestions
}

function getActionSpecificSuggestions(userAction: string, _pageContext: string): HelpSuggestion[] {
  const suggestions: HelpSuggestion[] = []

  if (userAction === 'export_data') {
    suggestions.push({
      id: 'data-export-best-practices',
      title: 'Data Export Best Practices',
      description: 'Learn how to export and analyze your building data effectively',
      type: 'tutorial',
      priority: 1,
      relevance_score: 5,
      action: {
        type: 'open_docs',
        target: 'tutorials/data-export-guide',
        text: 'Learn Export Tips'
      },
      tags: ['export', 'data', 'analysis'],
      estimated_time_minutes: 8,
      difficulty: 'beginner'
    })
  }

  return suggestions
}