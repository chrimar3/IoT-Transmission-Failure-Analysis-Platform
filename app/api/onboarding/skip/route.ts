import { _NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const progress = await prisma.onboardingProgress.upsert({
      where: {
        user_id: session.user.id
      },
      update: {
        skipped_at: new Date(),
        updated_at: new Date()
      },
      create: {
        user_id: session.user.id,
        onboarding_version: '1.0',
        current_step: 0,
        completed_steps: [],
        skipped_at: new Date()
      }
    })

    return NextResponse.json({
      message: 'Onboarding skipped successfully',
      progress: {
        skipped_at: progress.skipped_at,
        onboarding_version: progress.onboarding_version
      }
    })
  } catch (error) {
    console.error('Error skipping onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to skip onboarding' },
      { status: 500 }
    )
  }
}