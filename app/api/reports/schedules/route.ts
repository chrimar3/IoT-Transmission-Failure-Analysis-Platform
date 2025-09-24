import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/database/connection'
import { validateSubscription } from '@/lib/middleware/subscription'
import { CreateReportScheduleRequest } from '@/types/reports'
import { scheduleReportJob, calculateNextRunTime } from '@/lib/reports/report-scheduler'
import { z } from 'zod'

const createScheduleSchema = z.object({
  template_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  schedule_config: z.object({
    day_of_week: z.number().min(0).max(6).optional(),
    day_of_month: z.number().min(1).max(31).optional(),
    time_of_day: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    timezone: z.string(),
    data_lag_hours: z.number().min(0).max(168).optional()
  }),
  email_recipients: z.array(z.string().email()).min(1).max(10)
})

const _updateScheduleSchema = createScheduleSchema.partial().extend({
  is_active: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate Professional tier subscription
    const hasAccess = await validateSubscription(session.user.id, 'Professional')
    if (!hasAccess) {
      return NextResponse.json({
        error: 'Professional tier subscription required for report scheduling'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('active')

    const schedules = await prisma.reportSchedule.findMany({
      where: {
        user_id: session.user.id,
        ...(isActive !== null && { is_active: isActive === 'true' })
      },
      include: {
        template: {
          select: {
            name: true,
            category: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({ schedules })

  } catch (error) {
    console.error('Error fetching report schedules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate Professional tier subscription
    const hasAccess = await validateSubscription(session.user.id, 'Professional')
    if (!hasAccess) {
      return NextResponse.json({
        error: 'Professional tier subscription required for report scheduling'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createScheduleSchema.parse(body) as CreateReportScheduleRequest

    // Verify template access
    const template = await prisma.reportTemplate.findFirst({
      where: {
        id: validatedData.template_id,
        OR: [
          { user_id: session.user.id },
          { is_public: true },
          {
            shared_templates: {
              some: { shared_with: session.user.id }
            }
          }
        ]
      }
    })

    if (!template) {
      return NextResponse.json({
        error: 'Template not found or access denied'
      }, { status: 404 })
    }

    // Check schedule limits (Professional tier: 20 active schedules)
    const activeScheduleCount = await prisma.reportSchedule.count({
      where: {
        user_id: session.user.id,
        is_active: true
      }
    })

    if (activeScheduleCount >= 20) {
      return NextResponse.json({
        error: 'Active schedule limit reached (20/user). Please deactivate unused schedules.'
      }, { status: 429 })
    }

    // Validate frequency-specific requirements
    if (validatedData.frequency === 'weekly' && validatedData.schedule_config.day_of_week === undefined) {
      return NextResponse.json({
        error: 'day_of_week is required for weekly schedules'
      }, { status: 400 })
    }

    if (validatedData.frequency === 'monthly' && validatedData.schedule_config.day_of_month === undefined) {
      return NextResponse.json({
        error: 'day_of_month is required for monthly schedules'
      }, { status: 400 })
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunTime(
      validatedData.frequency,
      validatedData.schedule_config
    )

    const schedule = await prisma.reportSchedule.create({
      data: {
        template_id: validatedData.template_id,
        user_id: session.user.id,
        name: validatedData.name,
        description: validatedData.description,
        frequency: validatedData.frequency,
        schedule_config: validatedData.schedule_config,
        email_recipients: validatedData.email_recipients,
        is_active: true,
        next_run_at: nextRunAt,
        failure_count: 0
      }
    })

    // Schedule the job
    try {
      await scheduleReportJob(schedule.id, nextRunAt)
    } catch (scheduleError) {
      // If scheduling fails, deactivate the schedule
      await prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: { is_active: false }
      })

      console.error('Error scheduling report job:', scheduleError)
      return NextResponse.json({
        error: 'Failed to schedule report generation'
      }, { status: 500 })
    }

    return NextResponse.json({ schedule }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating report schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}