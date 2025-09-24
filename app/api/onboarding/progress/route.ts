import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const progress = await prisma.onboardingProgress.findFirst({
      where: {
        user_id: session.user.id
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    if (!progress) {
      return NextResponse.json({
        progress: {
          current_step: 0,
          completed_steps: [],
          completed_at: null,
          skipped_at: null,
          onboarding_version: '1.0'
        }
      })
    }

    return NextResponse.json({
      progress: {
        current_step: progress.current_step,
        completed_steps: progress.completed_steps,
        completed_at: progress.completed_at,
        skipped_at: progress.skipped_at,
        onboarding_version: progress.onboarding_version
      }
    })
  } catch (error) {
    console.error('Error fetching onboarding progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch onboarding progress' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { current_step, completed_steps, completed_at } = body

    if (typeof current_step !== 'number' || !Array.isArray(completed_steps)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      )
    }

    const progress = await prisma.onboardingProgress.upsert({
      where: {
        user_id: session.user.id
      },
      update: {
        current_step,
        completed_steps,
        completed_at: completed_at ? new Date(completed_at) : null,
        updated_at: new Date()
      },
      create: {
        user_id: session.user.id,
        onboarding_version: '1.0',
        current_step,
        completed_steps,
        completed_at: completed_at ? new Date(completed_at) : null
      }
    })

    return NextResponse.json({
      message: 'Onboarding progress updated successfully',
      progress: {
        current_step: progress.current_step,
        completed_steps: progress.completed_steps,
        completed_at: progress.completed_at,
        onboarding_version: progress.onboarding_version
      }
    })
  } catch (error) {
    console.error('Error updating onboarding progress:', error)
    return NextResponse.json(
      { error: 'Failed to update onboarding progress' },
      { status: 500 }
    )
  }
}