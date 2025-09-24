import { ReportFrequency, ScheduleConfiguration } from '@/types/reports'
import { prisma } from '@/lib/database/connection'
import { generateReportJob } from './report-generator'
import { sendScheduledReportEmail as _sendScheduledReportEmail } from './email-delivery'

export async function scheduleReportJob(scheduleId: string, nextRunTime: Date): Promise<void> {
  // In a real implementation, this would use a job queue like Bull, Agenda, or AWS EventBridge
  console.log(`Scheduling report job for schedule ${scheduleId} at ${nextRunTime}`)

  // Placeholder: In production, you would schedule this with your job queue
  // For now, we'll just log the scheduling
}

export function calculateNextRunTime(
  frequency: ReportFrequency,
  config: ScheduleConfiguration
): Date {
  const now = new Date()
  const [hours, minutes] = config.time_of_day.split(':').map(Number)

  const nextRun = new Date()
  nextRun.setHours(hours, minutes, 0, 0)

  // If the time has already passed today, start from tomorrow
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1)
  }

  switch (frequency) {
    case 'daily':
      // Already set correctly above
      break

    case 'weekly':
      const targetDayOfWeek = config.day_of_week || 1 // Default to Monday
      const currentDayOfWeek = nextRun.getDay()
      const daysUntilTarget = (targetDayOfWeek - currentDayOfWeek + 7) % 7
      if (daysUntilTarget === 0 && nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7)
      } else {
        nextRun.setDate(nextRun.getDate() + daysUntilTarget)
      }
      break

    case 'monthly':
      const targetDay = config.day_of_month || 1
      nextRun.setDate(targetDay)
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1)
        nextRun.setDate(targetDay)
      }
      break

    case 'quarterly':
      // Find next quarter
      const currentMonth = nextRun.getMonth()
      const quarterStartMonths = [0, 3, 6, 9] // Jan, Apr, Jul, Oct
      const nextQuarterStart = quarterStartMonths.find(month => month > currentMonth) || 12

      if (nextQuarterStart === 12) {
        nextRun.setFullYear(nextRun.getFullYear() + 1)
        nextRun.setMonth(0)
      } else {
        nextRun.setMonth(nextQuarterStart)
      }
      nextRun.setDate(config.day_of_month || 1)
      break

    default:
      throw new Error(`Unsupported frequency: ${frequency}`)
  }

  return nextRun
}

export async function executeScheduledReport(scheduleId: string): Promise<void> {
  try {
    console.log(`Executing scheduled report for schedule ${scheduleId}`)

    const schedule = await prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        template: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    if (!schedule || !schedule.is_active) {
      console.log(`Schedule ${scheduleId} not found or inactive`)
      return
    }

    if (!schedule.template) {
      throw new Error('Template not found for schedule')
    }

    // Calculate data range with lag
    const dataLagHours = schedule.schedule_config.data_lag_hours || 0
    const endDate = new Date(Date.now() - dataLagHours * 60 * 60 * 1000)

    let startDate: Date
    switch (schedule.frequency) {
      case 'daily':
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'weekly':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'monthly':
        startDate = new Date(endDate)
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case 'quarterly':
        startDate = new Date(endDate)
        startDate.setMonth(startDate.getMonth() - 3)
        break
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Create generated report record
    const generatedReport = await prisma.generatedReport.create({
      data: {
        template_id: schedule.template_id,
        user_id: schedule.user_id,
        title: `${schedule.template.name} - ${schedule.name} - ${new Date().toISOString().split('T')[0]}`,
        format: 'pdf', // Default format for scheduled reports
        status: 'generating',
        data_period_start: startDate,
        data_period_end: endDate,
        metadata: {
          template_version: schedule.template.version,
          file_version: '1.0',
          data_points_included: 0,
          charts_generated: 0,
          tables_generated: 0,
          statistical_confidence: 0,
          generation_time_ms: 0,
          scheduled_execution: true,
          schedule_id: scheduleId
        }
      }
    })

    // Generate the report
    await generateReportJob({
      reportId: generatedReport.id,
      templateId: schedule.template_id,
      userId: schedule.user_id,
      format: 'pdf',
      dataRange: {
        start: startDate,
        end: endDate
      },
      customParameters: {
        scheduled: true,
        schedule_name: schedule.name
      }
    })

    // Update schedule with last run time and calculate next run
    const nextRunAt = calculateNextRunTime(schedule.frequency, schedule.schedule_config)

    await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: {
        last_run_at: new Date(),
        last_success_at: new Date(),
        next_run_at: nextRunAt,
        failure_count: 0
      }
    })

    // Schedule next execution
    await scheduleReportJob(scheduleId, nextRunAt)

    console.log(`Scheduled report execution completed for schedule ${scheduleId}`)

  } catch (error) {
    console.error(`Failed to execute scheduled report for schedule ${scheduleId}:`, error)

    // Update failure count
    try {
      const schedule = await prisma.reportSchedule.findUnique({
        where: { id: scheduleId }
      })

      if (schedule) {
        const newFailureCount = schedule.failure_count + 1
        const shouldDeactivate = newFailureCount >= 5 // Deactivate after 5 consecutive failures

        await prisma.reportSchedule.update({
          where: { id: scheduleId },
          data: {
            failure_count: newFailureCount,
            is_active: shouldDeactivate ? false : schedule.is_active,
            last_run_at: new Date()
          }
        })

        if (shouldDeactivate) {
          console.log(`Schedule ${scheduleId} deactivated due to repeated failures`)
          // TODO: Send notification email to user about deactivation
        } else {
          // Calculate next run time for retry
          const nextRunAt = calculateNextRunTime(schedule.frequency, schedule.schedule_config)
          await scheduleReportJob(scheduleId, nextRunAt)
        }
      }
    } catch (updateError) {
      console.error(`Failed to update schedule after failure:`, updateError)
    }

    throw error
  }
}

export async function processScheduledReports(): Promise<void> {
  // This function would be called by a cron job or scheduled task
  console.log('Processing scheduled reports...')

  try {
    const dueSchedules = await prisma.reportSchedule.findMany({
      where: {
        is_active: true,
        next_run_at: {
          lte: new Date()
        }
      },
      include: {
        template: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    console.log(`Found ${dueSchedules.length} due schedules`)

    // Process each schedule
    for (const schedule of dueSchedules) {
      try {
        await executeScheduledReport(schedule.id)
      } catch (error) {
        console.error(`Failed to process schedule ${schedule.id}:`, error)
        // Continue with other schedules
      }
    }

    console.log('Scheduled report processing completed')

  } catch (error) {
    console.error('Error processing scheduled reports:', error)
    throw error
  }
}

export async function pauseSchedule(scheduleId: string): Promise<void> {
  await prisma.reportSchedule.update({
    where: { id: scheduleId },
    data: { is_active: false }
  })
}

export async function resumeSchedule(scheduleId: string): Promise<void> {
  const schedule = await prisma.reportSchedule.findUnique({
    where: { id: scheduleId }
  })

  if (!schedule) {
    throw new Error('Schedule not found')
  }

  const nextRunAt = calculateNextRunTime(schedule.frequency, schedule.schedule_config)

  await prisma.reportSchedule.update({
    where: { id: scheduleId },
    data: {
      is_active: true,
      next_run_at: nextRunAt,
      failure_count: 0
    }
  })

  await scheduleReportJob(scheduleId, nextRunAt)
}