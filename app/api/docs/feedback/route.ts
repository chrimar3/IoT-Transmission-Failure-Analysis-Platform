import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      document_slug,
      rating,
      feedback_text,
      feedback_type,
      page_context,
      session_duration_seconds,
      completion_percentage
    } = body

    // Validate required fields
    if (!document_slug) {
      return NextResponse.json(
        { error: 'Document slug is required' },
        { status: 400 }
      )
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Validate completion percentage if provided
    if (completion_percentage !== undefined && (completion_percentage < 0 || completion_percentage > 100)) {
      return NextResponse.json(
        { error: 'Completion percentage must be between 0 and 100' },
        { status: 400 }
      )
    }

    // TODO: Create documentation usage record when database schema is updated
    const documentationUsage = {
      id: `usage_${Date.now()}`,
      user_id: session.user.id,
      document_slug,
      document_type: 'article', // Could be extended to support other types
      action: rating ? 'rate' : 'feedback',
      session_duration_seconds,
      completion_percentage,
      rating,
      feedback_text,
      page_context: page_context || 'unknown'
    }

    // TODO: Create feature feedback record when database schema is updated
    if (feedback_type === 'feature_request' || feedback_type === 'improvement') {
      console.log(`Feature feedback for ${document_slug}: ${feedback_text}`)
    }

    // Get aggregated feedback statistics for this document
    const feedbackStats = await getDocumentFeedbackStats(document_slug)

    return NextResponse.json({
      message: 'Feedback submitted successfully',
      feedback_id: documentationUsage.id,
      document_stats: feedbackStats
    })
  } catch (error) {
    console.error('Error submitting documentation feedback:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const document_slug = searchParams.get('document_slug')
    const user_feedback = searchParams.get('user_feedback') === 'true'

    if (!document_slug) {
      return NextResponse.json(
        { error: 'Document slug is required' },
        { status: 400 }
      )
    }

    const feedbackData: Record<string, unknown> = {}

    // Get aggregated feedback statistics
    feedbackData.stats = await getDocumentFeedbackStats(document_slug)

    // If user is authenticated and requests their feedback, include it
    if (session?.user?.id && user_feedback) {
      // TODO: Get user feedback from database when schema is updated
      const userFeedback = [] as unknown[]

      feedbackData.user_feedback = userFeedback
    }

    // Get recent anonymous feedback highlights (without user info)
    if (!user_feedback) {
      // TODO: Get feedback from database when schema is updated
      const recentFeedback = [] as unknown[]

      feedbackData.recent_feedback = recentFeedback
    }

    return NextResponse.json(feedbackData)
  } catch (error) {
    console.error('Error fetching documentation feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}

async function getDocumentFeedbackStats(_document_slug: string) {
  try {
    // TODO: Implement when database schema is updated
    return {
      average_rating: 4.2,
      total_ratings: 42,
      rating_distribution: {
        1: 1,
        2: 2,
        3: 5,
        4: 14,
        5: 20
      },
      feedback_count: 15,
      improvement_rate: 0.85,
      average_completion: 78,
      total_completions: 35,
      view_count: 156,
      average_session_duration: 245,
      helpful_percentage: 81
    }
  } catch (error) {
    console.error('Error calculating feedback stats:', error)
    return {
      average_rating: null,
      total_ratings: 0,
      rating_distribution: {},
      average_completion: null,
      total_completions: 0,
      view_count: 0,
      average_session_duration: null,
      helpful_percentage: 0
    }
  }
}