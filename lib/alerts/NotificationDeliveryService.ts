/**
 * Notification Delivery Service
 * Story 4.1: Custom Alert Configuration
 *
 * Multi-channel notification delivery system for alerts
 */

import type {
  NotificationSettings,
  NotificationChannel,
  ChannelType,
  AlertInstance,
  NotificationLog,
  NotificationRecipient,
  EscalationPolicy,
  EscalationStage
} from '../../types/alerts'

export interface NotificationTemplate {
  subject: string
  body: string
  html_body?: string
  variables: { [key: string]: string }
}

export interface DeliveryResult {
  success: boolean
  message_id?: string
  error?: string
  retry_after?: number
  delivery_time?: string
}

export interface WebhookPayload {
  alert_id: string
  alert_title: string
  severity: string
  triggered_at: string
  description: string
  metric_values: unknown[]
  dashboard_url?: string
  custom_fields?: { [key: string]: unknown }
}

export interface NotificationConfig {
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  retry_attempts?: number
  timeout?: number
  [key: string]: unknown
}

export interface SMSConfig {
  sender_id?: string
  country_code?: string
  service_provider?: string
  api_key?: string
  from_number?: string
}

export class NotificationDeliveryService {
  private emailProvider: EmailProvider
  private smsProvider: SMSProvider
  private webhookService: WebhookService
  private pushService: PushNotificationService
  private slackService: SlackService
  private teamsService: TeamsService
  private phoneService: PhoneCallService

  constructor() {
    this.emailProvider = new EmailProvider()
    this.smsProvider = new SMSProvider()
    this.webhookService = new WebhookService()
    this.pushService = new PushNotificationService()
    this.slackService = new SlackService()
    this.teamsService = new TeamsService()
    this.phoneService = new PhoneCallService()
  }

  /**
   * Send notifications for an alert through all configured channels
   */
  async sendAlertNotifications(
    settings: NotificationSettings,
    _alert: AlertInstance
  ): Promise<NotificationLog[]> {
    const notifications: NotificationLog[] = []

    // Check quiet hours
    if (this.isQuietHours(settings.quiet_hours, _alert)) {
      console.log(`Alert ${_alert.id} suppressed due to quiet hours`)
      return notifications
    }

    // Check frequency limits
    if (await this.exceedsFrequencyLimits(settings.frequency_limits, _alert)) {
      console.log(`Alert ${_alert.id} suppressed due to frequency limits`)
      return notifications
    }

    // Generate notification template
    const _template = this.generateNotificationTemplate(_alert)

    // Send through each enabled channel
    for (const channel of settings.channels) {
      if (!channel.enabled) continue

      // Check if channel should handle this severity
      if (!channel.priority_filter.includes(_alert.severity)) continue

      try {
        const channelNotifications = await this.sendChannelNotifications(
          channel,
          settings.recipients,
          _template,
          _alert
        )
        notifications.push(...channelNotifications)
      } catch (error) {
        console.error(`Failed to send notification via ${channel.type}:`, error)

        // Create failed notification log
        notifications.push({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          channel: channel.type,
          recipient: 'system',
          sent_at: new Date().toISOString(),
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          retry_count: 0
        })
      }
    }

    return notifications
  }

  /**
   * Send notifications through a specific channel
   */
  private async sendChannelNotifications(
    channel: NotificationChannel,
    recipients: NotificationRecipient[],
    _template: NotificationTemplate,
    _alert: AlertInstance
  ): Promise<NotificationLog[]> {
    const notifications: NotificationLog[] = []

    // Filter recipients based on alert severity and on-call schedule
    const eligibleRecipients = this.filterEligibleRecipients(recipients, _alert, channel.type)

    for (const recipient of eligibleRecipients) {
      const contactMethod = recipient.contact_methods.find(cm => cm.type === channel.type)
      if (!contactMethod || !contactMethod.verified) continue

      try {
        const result = await this.deliverNotification(
          channel.type,
          contactMethod.value,
          _template,
          _alert,
          channel.configuration
        )

        const notification: NotificationLog = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          channel: channel.type,
          recipient: contactMethod.value,
          sent_at: new Date().toISOString(),
          status: result.success ? 'sent' : 'failed',
          error_message: result.error,
          retry_count: 0
        }

        if (result.delivery_time) {
          notification.delivered_at = result.delivery_time
        }

        notifications.push(notification)

      } catch (error) {
        console.error(`Failed to deliver notification to ${contactMethod.value}:`, error)

        notifications.push({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          channel: channel.type,
          recipient: contactMethod.value,
          sent_at: new Date().toISOString(),
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Delivery failed',
          retry_count: 0
        })
      }
    }

    return notifications
  }

  /**
   * Deliver notification through specific channel
   */
  private async deliverNotification(
    channelType: ChannelType,
    recipient: string,
    _template: NotificationTemplate,
    _alert: AlertInstance,
    _config: NotificationConfig
  ): Promise<DeliveryResult> {
    switch (channelType) {
      case 'email':
        return await this.emailProvider.sendEmail(
          recipient,
          _template.subject,
          _template.body,
          _template.html_body,
          _config
        )

      case 'sms':
        return await this.smsProvider.sendSMS(
          recipient,
          _template.body,
          _config
        )

      case 'webhook':
        const payload = this.createWebhookPayload(_alert, _template)
        return await this.webhookService.sendWebhook(
          _config.webhook_url,
          payload,
          _config
        )

      case 'push':
        return await this.pushService.sendPush(
          recipient,
          template.subject,
          template._body,
          _alert,
          _config
        )

      case 'slack':
        return await this.slackService.sendSlackMessage(
          _config.slack_channel || recipient,
          _template,
          _alert,
          _config
        )

      case 'teams':
        return await this.teamsService.sendTeamsMessage(
          _config.teams_webhook_url,
          _template,
          _alert,
          _config
        )

      case 'phone':
        return await this.phoneService.makePhoneCall(
          recipient,
          template._body,
          _config
        )

      default:
        throw new Error(`Unsupported channel type: ${channelType}`)
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(quietHours: unknown, _alert: AlertInstance): boolean {
    if (!quietHours.enabled) return false

    // Check if alert is in exceptions list
    if (quietHours.exceptions.includes(_alert.id)) return false

    // Critical alerts may ignore quiet hours
    if (_alert.severity === 'critical' && !quietHours.exceptions.includes('all_critical')) {
      return false
    }

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = currentHour * 60 + currentMinute

    const [startHour, startMinute] = quietHours.start_time.split(':').map(Number)
    const [endHour, endMinute] = quietHours.end_time.split(':').map(Number)

    const startTime = startHour * 60 + startMinute
    const endTime = endHour * 60 + endMinute

    // Handle overnight quiet hours (e.g., 22:00 to 06:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime
    } else {
      return currentTime >= startTime && currentTime <= endTime
    }
  }

  /**
   * Check if alert exceeds frequency limits
   */
  private async exceedsFrequencyLimits(limits: unknown, _alert: AlertInstance): Promise<boolean> {
    // Get recent alerts count (would query database)
    const recentAlerts = await this.getRecentAlertsCount(alert.configuration_id)

    const hourlyCount = recentAlerts.lastHour
    const dailyCount = recentAlerts.lastDay

    if (hourlyCount >= limits.max_alerts_per_hour) {
      return true
    }

    if (dailyCount >= limits.max_alerts_per_day) {
      return true
    }

    // Check similar alert cooldown
    const lastSimilarAlert = await this.getLastSimilarAlert(_alert)
    if (lastSimilarAlert) {
      const timeDiff = new Date().getTime() - new Date(lastSimilarAlert.triggered_at).getTime()
      const minutesDiff = timeDiff / (1000 * 60)

      if (minutesDiff < limits.cooldown_between_similar) {
        return true
      }
    }

    return false
  }

  /**
   * Get count of recent alerts
   */
  private async getRecentAlertsCount(_configurationId: string): Promise<{lastHour: number, lastDay: number}> {
    // Mock implementation - would query actual database
    return {
      lastHour: Math.floor(Math.random() * 5),
      lastDay: Math.floor(Math.random() * 20)
    }
  }

  /**
   * Get last similar alert for cooldown checking
   */
  private async getLastSimilarAlert(_alert: AlertInstance): Promise<AlertInstance | null> {
    // Mock implementation - would query for similar alerts
    return null
  }

  /**
   * Filter recipients based on alert and on-call schedules
   */
  private filterEligibleRecipients(
    recipients: NotificationRecipient[],
    _alert: AlertInstance,
    channelType: ChannelType
  ): NotificationRecipient[] {
    const now = new Date()

    return recipients.filter(recipient => {
      // Check if recipient has contact method for this channel
      const hasContactMethod = recipient.contact_methods.some(cm =>
        cm.type === channelType && cm.verified
      )
      if (!hasContactMethod) return false

      // Check notification preferences
      const preferredChannels = recipient.notification_preferences.channels_by_priority[alert.severity] || []
      if (!preferredChannels.includes(channelType)) return false

      // Check on-call schedule if configured
      if (recipient.on_call_schedule) {
        return this.isRecipientOnCall(recipient, now)
      }

      return true
    })
  }

  /**
   * Check if recipient is currently on-call
   */
  private isRecipientOnCall(recipient: NotificationRecipient, currentTime: Date): boolean {
    if (!recipient.on_call_schedule) return true

    const schedule = recipient.on_call_schedule
    const dayOfWeek = currentTime.getDay()
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()
    const currentTimeMinutes = currentHour * 60 + currentMinute

    for (const period of schedule.schedules) {
      // Check if current day is in the schedule
      if (!period.days_of_week.includes(dayOfWeek)) continue

      // Check if current time is within the schedule period
      const [startHour, startMinute] = period.start_time.split(':').map(Number)
      const [endHour, endMinute] = period.end_time.split(':').map(Number)

      const startTimeMinutes = startHour * 60 + startMinute
      const endTimeMinutes = endHour * 60 + endMinute

      // Handle overnight schedules
      if (startTimeMinutes > endTimeMinutes) {
        if (currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes) {
          return true
        }
      } else {
        if (currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Generate notification template for alert
   */
  private generateNotificationTemplate(_alert: AlertInstance): NotificationTemplate {
    const variables = {
      alert_title: _alert.title,
      alert_description: _alert.description,
      severity: _alert.severity ? _alert.severity.toUpperCase() : 'UNKNOWN',
      triggered_at: new Date(_alert.triggered_at).toLocaleString(),
      alert_id: _alert.id,
      dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/alerts/${_alert.id}`
    }

    const subject = `🚨 ${variables.severity} Alert: ${variables.alert_title}`

    const body = `
Alert Details:
• Title: ${variables.alert_title}
• Severity: ${variables.severity}
• Triggered: ${variables.triggered_at}
• Description: ${variables.alert_description}

View in dashboard: ${variables.dashboard_url}

Alert ID: ${variables.alert_id}
    `.trim()

    const html_body = `
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
    <h2 style="color: #dc3545; margin: 0;">🚨 ${variables.severity} Alert</h2>
    <h3 style="margin: 10px 0;">${variables.alert_title}</h3>
  </div>

  <div style="padding: 20px 0;">
    <p><strong>Severity:</strong> <span style="color: #dc3545;">${variables.severity}</span></p>
    <p><strong>Triggered:</strong> ${variables.triggered_at}</p>
    <p><strong>Description:</strong> ${variables.alert_description}</p>
  </div>

  <div style="margin: 30px 0;">
    <a href="${variables.dashboard_url}"
       style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
      View in Dashboard
    </a>
  </div>

  <div style="font-size: 12px; color: #666; margin-top: 30px;">
    Alert ID: ${variables.alert_id}
  </div>
</div>
    `.trim()

    return {
      subject,
      body,
      html_body,
      variables
    }
  }

  /**
   * Create webhook payload for alert
   */
  private createWebhookPayload(_alert: AlertInstance, _template: NotificationTemplate): WebhookPayload {
    return {
      alert_id: alert.id,
      alert_title: alert.title,
      severity: alert.severity,
      triggered_at: alert.triggered_at,
      description: alert.description,
      metric_values: alert.metric_values,
      dashboard_url: template.variables.dashboard_url,
      custom_fields: {
        _configuration_id: alert.configuration_id,
        rule_id: alert.rule_id,
        escalation_level: alert.escalation_level
      }
    }
  }

  /**
   * Handle escalation based on escalation policy
   */
  async handleEscalation(
    _alert: AlertInstance,
    escalationPolicy: EscalationPolicy,
    currentLevel: number
  ): Promise<NotificationLog[]> {
    const notifications: NotificationLog[] = []

    if (currentLevel >= escalationPolicy.stages.length) {
      console.log(`Alert ${alert.id} has reached maximum escalation level`)
      return notifications
    }

    const stage = escalationPolicy.stages[currentLevel]

    // Check if enough time has passed for escalation
    const lastNotification = alert.notification_log
      .filter(log => log.status === 'sent')
      .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0]

    if (lastNotification) {
      const timeSinceLastNotification = new Date().getTime() - new Date(lastNotification.sent_at).getTime()
      const minutesSince = timeSinceLastNotification / (1000 * 60)

      if (minutesSince < stage.delay_minutes) {
        console.log(`Alert ${alert.id} not ready for escalation to level ${currentLevel + 1}`)
        return notifications
      }
    }

    // Send escalation notifications
    const _template = this.generateEscalationTemplate(_alert, stage, currentLevel + 1)

    for (const recipientId of stage.recipients) {
      for (const channelType of stage.channels) {
        try {
          const result = await this.deliverNotification(
            channelType,
            recipientId, // In real implementation, would resolve recipient details
            _template,
            _alert,
            {}
          )

          const notification: NotificationLog = {
            id: `escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            channel: channelType,
            recipient: recipientId,
            sent_at: new Date().toISOString(),
            status: result.success ? 'sent' : 'failed',
            error_message: result.error,
            retry_count: 0
          }

          notifications.push(notification)

        } catch (error) {
          console.error(`Escalation notification failed:`, error)
        }
      }
    }

    return notifications
  }

  /**
   * Generate escalation notification template
   */
  private generateEscalationTemplate(
    _alert: AlertInstance,
    stage: EscalationStage,
    level: number
  ): NotificationTemplate {
    const baseTemplate = this.generateNotificationTemplate(_alert)

    const escalationSubject = `🔥 ESCALATED (Level ${level}): ${baseTemplate.subject}`

    const escalationBody = `
*** ESCALATED ALERT - LEVEL ${level} ***

${baseTemplate._body}

This alert has been escalated due to lack of acknowledgment.
${stage.require_acknowledgment ? 'Acknowledgment required within ' + stage.acknowledgment_timeout + ' minutes.' : ''}

${stage.custom_message || ''}
    `.trim()

    return {
      subject: escalationSubject,
      body: escalationBody,
      html_body: baseTemplate.html_body?.replace(
        'Alert Details:',
        `<div style="background: #ff6b6b; color: white; padding: 10px; margin-bottom: 20px; border-radius: 4px;">
          <strong>⚠️ ESCALATED ALERT - LEVEL ${level}</strong>
        </div>
        Alert Details:`
      ),
      variables: {
        ...baseTemplate.variables,
        escalation_level: level.toString()
      }
    }
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(
    notificationLogs: NotificationLog[],
    maxRetries: number = 3
  ): Promise<NotificationLog[]> {
    const retryResults: NotificationLog[] = []

    const failedNotifications = notificationLogs.filter(
      log => log.status === 'failed' && log.retry_count < maxRetries
    )

    for (const notification of failedNotifications) {
      try {
        // Exponential backoff: wait 2^retry_count minutes
        const delayMinutes = Math.pow(2, notification.retry_count)
        const timeSinceFailure = new Date().getTime() - new Date(notification.sent_at).getTime()
        const minutesSinceFailure = timeSinceFailure / (1000 * 60)

        if (minutesSinceFailure < delayMinutes) {
          continue // Not ready for retry yet
        }

        // Attempt retry (simplified - would need original alert and _template)
        const retryResult: NotificationLog = {
          ...notification,
          id: `retry_${notification.id}_${notification.retry_count + 1}`,
          sent_at: new Date().toISOString(),
          retry_count: notification.retry_count + 1,
          status: 'sent' // Assume success for demo
        }

        retryResults.push(retryResult)

      } catch (error) {
        console.error(`Retry failed for notification ${notification.id}:`, error)
      }
    }

    return retryResults
  }
}

// Channel-specific service implementations
class EmailProvider {
  async sendEmail(
    recipient: string,
    subject: string,
    _body: string,
    _htmlBody?: string,
    _config?: NotificationConfig
  ): Promise<DeliveryResult> {
    // Mock email sending - would integrate with SendGrid, AWS SES, etc.
    console.log(`Sending email to ${recipient}: ${subject}`)

    // Simulate email delivery
    await new Promise(resolve => setTimeout(resolve, 100))

    return {
      success: true,
      message_id: `email_${Date.now()}`,
      delivery_time: new Date().toISOString()
    }
  }
}

class SMSProvider {
  async sendSMS(recipient: string, _message: string, _config?: SMSConfig): Promise<DeliveryResult> {
    // Mock SMS sending - would integrate with Twilio, AWS SNS, etc.
    console.log(`Sending SMS to ${recipient}: ${_message.substring(0, 50)}...`)

    await new Promise(resolve => setTimeout(resolve, 50))

    return {
      success: true,
      message_id: `sms_${Date.now()}`,
      delivery_time: new Date().toISOString()
    }
  }
}

class WebhookService {
  async sendWebhook(url: string, payload: WebhookPayload, config?: NotificationConfig): Promise<DeliveryResult> {
    try {
      const response = await fetch(url, {
        method: config?.webhook_method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config?.webhook_headers
        },
        _body: JSON.stringify(payload),
        signal: AbortSignal.timeout(config?.webhook_timeout || 30000)
      })

      if (response.ok) {
        return {
          success: true,
          message_id: `webhook_${Date.now()}`,
          delivery_time: new Date().toISOString()
        }
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook delivery failed'
      }
    }
  }
}

class PushNotificationService {
  async sendPush(
    recipient: string,
    title: string,
    _body: string,
    _alert: AlertInstance,
    _config?: NotificationConfig
  ): Promise<DeliveryResult> {
    // Mock push notification - would integrate with FCM, APNS, etc.
    console.log(`Sending push to ${recipient}: ${title}`)

    return {
      success: true,
      message_id: `push_${Date.now()}`,
      delivery_time: new Date().toISOString()
    }
  }
}

class SlackService {
  async sendSlackMessage(
    channel: string,
    _template: NotificationTemplate,
    _alert: AlertInstance,
    _config?: NotificationConfig
  ): Promise<DeliveryResult> {
    // Mock Slack integration - would use Slack Web API
    console.log(`Sending Slack message to ${channel}`)

    return {
      success: true,
      message_id: `slack_${Date.now()}`,
      delivery_time: new Date().toISOString()
    }
  }
}

class TeamsService {
  async sendTeamsMessage(
    _webhookUrl: string,
    _template: NotificationTemplate,
    _alert: AlertInstance,
    _config?: NotificationConfig
  ): Promise<DeliveryResult> {
    // Mock Teams integration - would send to Teams webhook
    console.log(`Sending Teams message via webhook`)

    return {
      success: true,
      message_id: `teams_${Date.now()}`,
      delivery_time: new Date().toISOString()
    }
  }
}

class PhoneCallService {
  async makePhoneCall(
    recipient: string,
    _message: string,
    _config?: NotificationConfig
  ): Promise<DeliveryResult> {
    // Mock phone call - would integrate with Twilio Voice API
    console.log(`Making phone call to ${recipient}`)

    return {
      success: true,
      message_id: `call_${Date.now()}`,
      delivery_time: new Date().toISOString()
    }
  }
}