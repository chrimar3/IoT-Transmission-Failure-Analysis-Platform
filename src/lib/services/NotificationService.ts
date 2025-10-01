/**
 * Notification Service
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Comprehensive notification system for pattern alerts and maintenance updates
 */

import type {
  DetectedPattern,
  PatternAlert,
  AlertChannel,
  AlertUrgency,
  PatternSeverity
} from '@/types/patterns'

// Notification configuration
export interface NotificationConfig {
  email: {
    enabled: boolean
    smtp_host?: string
    smtp_port?: number
    from_address?: string
    templates?: EmailTemplateConfig
  }
  sms: {
    enabled: boolean
    service_provider?: 'twilio' | 'aws_sns'
    api_key?: string
  }
  push: {
    enabled: boolean
    service_key?: string
  }
  webhook: {
    enabled: boolean
    endpoints: WebhookEndpoint[]
  }
  slack: {
    enabled: boolean
    webhook_url?: string
    channels: SlackChannelConfig[]
  }
}

export interface EmailTemplateConfig {
  critical_pattern: string
  warning_pattern: string
  info_pattern: string
  daily_summary: string
}

export interface WebhookEndpoint {
  url: string
  method: 'POST' | 'PUT'
  headers?: Record<string, string>
  auth?: {
    type: 'bearer' | 'basic'
    token: string
  }
  severity_filter?: PatternSeverity[]
}

export interface SlackChannelConfig {
  channel: string
  severity_filter?: PatternSeverity[]
  mention_users?: string[]
}

// Notification types
export interface NotificationMessage {
  id: string
  type: NotificationType
  recipient: string
  channel: AlertChannel
  subject?: string
  content: string
  priority: AlertUrgency
  pattern_id?: string
  created_at: string
  sent_at?: string
  delivery_status: DeliveryStatus
  retry_count: number
  metadata?: Record<string, unknown>
}

export type NotificationType =
  | 'pattern_detected'
  | 'critical_alert'
  | 'maintenance_reminder'
  | 'daily_summary'
  | 'system_status'

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'

// Recipient management
export interface NotificationRecipient {
  id: string
  name: string
  email?: string
  phone?: string
  slack_user_id?: string
  notification_preferences: NotificationPreferences
  escalation_rules: EscalationRule[]
  active: boolean
}

export interface NotificationPreferences {
  channels: AlertChannel[]
  severity_filter: PatternSeverity[]
  quiet_hours: {
    enabled: boolean
    start_time: string // HH:MM format
    end_time: string
    timezone: string
  }
  frequency_limits: {
    max_per_hour: number
    max_per_day: number
    cooldown_minutes: number
  }
  equipment_filter?: string[]
  floor_filter?: number[]
}

export interface EscalationRule {
  trigger_after_minutes: number
  escalate_to: string[] // Recipient IDs
  channels: AlertChannel[]
  message_template?: string
}

/**
 * Notification Service Class
 */
export class NotificationService {
  private config: NotificationConfig
  private recipients: Map<string, NotificationRecipient>
  private messageQueue: NotificationMessage[]
  private deliveryHistory: NotificationMessage[]

  constructor(config: NotificationConfig) {
    this.config = config
    this.recipients = new Map()
    this.messageQueue = []
    this.deliveryHistory = []

    this.initializeDefaultRecipients()
  }

  /**
   * Send notification for detected pattern
   */
  async sendPatternNotification(pattern: DetectedPattern): Promise<void> {
    console.log('Sending pattern notification:', pattern.id)

    // Get applicable recipients
    const recipients = this.getApplicableRecipients(pattern)

    for (const recipient of recipients) {
      // Check quiet hours and frequency limits
      if (this.isInQuietHours(recipient) || this.exceedsFrequencyLimit(recipient)) {
        continue
      }

      // Create notification messages for each preferred channel
      for (const channel of recipient.notification_preferences.channels) {
        const message = this.createPatternMessage(pattern, recipient, channel)
        this.messageQueue.push(message)
      }
    }

    // Process message queue
    await this.processMessageQueue()
  }

  /**
   * Send critical alert with escalation
   */
  async sendCriticalAlert(alert: PatternAlert, pattern: DetectedPattern): Promise<void> {
    console.log('Sending critical alert:', alert.id)

    // Get high-priority recipients
    const recipients = this.getApplicableRecipients(pattern, ['critical', 'warning'])

    for (const recipient of recipients) {
      // Critical alerts bypass quiet hours
      const message = this.createAlertMessage(alert, pattern, recipient)
      this.messageQueue.push(message)

      // Setup escalation if not acknowledged
      this.scheduleEscalation(alert, pattern, recipient)
    }

    await this.processMessageQueue()
  }

  /**
   * Send daily pattern summary
   */
  async sendDailySummary(patterns: DetectedPattern[]): Promise<void> {
    console.log('Sending daily summary for', patterns.length, 'patterns')

    const summaryRecipients = Array.from(this.recipients.values()).filter(r =>
      r.notification_preferences.channels.includes('email') && r.active
    )

    for (const recipient of summaryRecipients) {
      const summaryMessage = this.createSummaryMessage(patterns, recipient)
      this.messageQueue.push(summaryMessage)
    }

    await this.processMessageQueue()
  }

  /**
   * Add notification recipient
   */
  addRecipient(recipient: NotificationRecipient): void {
    this.recipients.set(recipient.id, recipient)
  }

  /**
   * Update recipient preferences
   */
  updateRecipientPreferences(
    recipientId: string,
    preferences: Partial<NotificationPreferences>
  ): boolean {
    const recipient = this.recipients.get(recipientId)
    if (!recipient) return false

    recipient.notification_preferences = {
      ...recipient.notification_preferences,
      ...preferences
    }

    return true
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStatistics(): {
    total_sent: number
    delivery_rate: number
    by_channel: Record<AlertChannel, number>
    recent_failures: NotificationMessage[]
  } {
    const totalSent = this.deliveryHistory.length
    const delivered = this.deliveryHistory.filter(msg => msg.delivery_status === 'delivered').length
    const deliveryRate = totalSent > 0 ? delivered / totalSent : 0

    const byChannel = this.deliveryHistory.reduce((acc, msg) => {
      acc[msg.channel] = (acc[msg.channel] || 0) + 1
      return acc
    }, {} as Record<AlertChannel, number>)

    const recentFailures = this.deliveryHistory
      .filter(msg => msg.delivery_status === 'failed' || msg.delivery_status === 'bounced')
      .slice(-10) // Last 10 failures

    return {
      total_sent: totalSent,
      delivery_rate: Math.round(deliveryRate * 100) / 100,
      by_channel: byChannel,
      recent_failures: recentFailures
    }
  }

  /**
   * Private helper methods
   */
  private initializeDefaultRecipients(): void {
    // Add default maintenance manager
    this.addRecipient({
      id: 'default_maintenance_manager',
      name: 'Maintenance Manager',
      email: 'maintenance@cu-bems.com',
      phone: '+66-2-123-4567',
      notification_preferences: {
        channels: ['dashboard', 'email', 'sms'],
        severity_filter: ['critical', 'warning'],
        quiet_hours: {
          enabled: true,
          start_time: '22:00',
          end_time: '06:00',
          timezone: 'Asia/Bangkok'
        },
        frequency_limits: {
          max_per_hour: 10,
          max_per_day: 50,
          cooldown_minutes: 15
        }
      },
      escalation_rules: [
        {
          trigger_after_minutes: 30,
          escalate_to: ['facility_director'],
          channels: ['email', 'sms']
        }
      ],
      active: true
    })

    // Add facility director for escalations
    this.addRecipient({
      id: 'facility_director',
      name: 'Facility Director',
      email: 'director@cu-bems.com',
      phone: '+66-2-123-4568',
      notification_preferences: {
        channels: ['email', 'sms'],
        severity_filter: ['critical'],
        quiet_hours: {
          enabled: false,
          start_time: '00:00',
          end_time: '00:00',
          timezone: 'Asia/Bangkok'
        },
        frequency_limits: {
          max_per_hour: 5,
          max_per_day: 20,
          cooldown_minutes: 30
        }
      },
      escalation_rules: [],
      active: true
    })
  }

  private getApplicableRecipients(
    pattern: DetectedPattern,
    severityFilter?: PatternSeverity[]
  ): NotificationRecipient[] {
    return Array.from(this.recipients.values()).filter(recipient => {
      if (!recipient.active) return false

      // Check severity filter
      const severities = severityFilter || recipient.notification_preferences.severity_filter
      if (!severities.includes(pattern.severity)) return false

      // Check equipment filter
      if (recipient.notification_preferences.equipment_filter &&
          !recipient.notification_preferences.equipment_filter.includes(pattern.equipment_type)) {
        return false
      }

      // Check floor filter
      if (recipient.notification_preferences.floor_filter &&
          !recipient.notification_preferences.floor_filter.includes(pattern.floor_number)) {
        return false
      }

      return true
    })
  }

  private isInQuietHours(recipient: NotificationRecipient): boolean {
    const { quiet_hours } = recipient.notification_preferences
    if (!quiet_hours.enabled) return false

    const now = new Date()
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: quiet_hours.timezone
    })

    return currentTime >= quiet_hours.start_time && currentTime <= quiet_hours.end_time
  }

  private exceedsFrequencyLimit(recipient: NotificationRecipient): boolean {
    const { frequency_limits } = recipient.notification_preferences
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    const recentMessages = this.deliveryHistory.filter(msg =>
      msg.recipient === recipient.id && new Date(msg.created_at).getTime() > oneDayAgo
    )

    const hourlyCount = recentMessages.filter(msg =>
      new Date(msg.created_at).getTime() > oneHourAgo
    ).length

    const dailyCount = recentMessages.length

    return hourlyCount >= frequency_limits.max_per_hour ||
           dailyCount >= frequency_limits.max_per_day
  }

  private createPatternMessage(
    pattern: DetectedPattern,
    recipient: NotificationRecipient,
    channel: AlertChannel
  ): NotificationMessage {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      id: messageId,
      type: 'pattern_detected',
      recipient: recipient.id,
      channel,
      subject: `[${pattern.severity.toUpperCase()}] Pattern Detected: ${pattern.equipment_type}`,
      content: this.formatPatternContent(pattern, channel),
      priority: pattern.severity === 'critical' ? 'critical' : 'high',
      pattern_id: pattern.id,
      created_at: new Date().toISOString(),
      delivery_status: 'pending',
      retry_count: 0,
      metadata: {
        pattern_type: pattern.pattern_type,
        equipment_type: pattern.equipment_type,
        floor_number: pattern.floor_number,
        confidence_score: pattern.confidence_score
      }
    }
  }

  private createAlertMessage(
    alert: PatternAlert,
    pattern: DetectedPattern,
    recipient: NotificationRecipient
  ): NotificationMessage {
    const messageId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      id: messageId,
      type: 'critical_alert',
      recipient: recipient.id,
      channel: 'email', // Critical alerts prioritize email
      subject: `🚨 CRITICAL ALERT: ${pattern.equipment_type} System`,
      content: this.formatAlertContent(alert, pattern),
      priority: 'critical',
      pattern_id: pattern.id,
      created_at: new Date().toISOString(),
      delivery_status: 'pending',
      retry_count: 0,
      metadata: {
        alert_id: alert.id,
        urgency: alert.urgency,
        expires_at: alert.expires_at
      }
    }
  }

  private createSummaryMessage(
    patterns: DetectedPattern[],
    recipient: NotificationRecipient
  ): NotificationMessage {
    const messageId = `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      id: messageId,
      type: 'daily_summary',
      recipient: recipient.id,
      channel: 'email',
      subject: `Daily Pattern Summary - ${patterns.length} patterns detected`,
      content: this.formatSummaryContent(patterns),
      priority: 'medium',
      created_at: new Date().toISOString(),
      delivery_status: 'pending',
      retry_count: 0,
      metadata: {
        pattern_count: patterns.length,
        critical_count: patterns.filter(p => p.severity === 'critical').length,
        warning_count: patterns.filter(p => p.severity === 'warning').length
      }
    }
  }

  private formatPatternContent(pattern: DetectedPattern, channel: AlertChannel): string {
    if (channel === 'sms') {
      return `${pattern.severity.toUpperCase()}: ${pattern.equipment_type} floor ${pattern.floor_number} - ${pattern.description.substring(0, 100)}...`
    }

    return `
Pattern Detection Alert

Equipment: ${pattern.equipment_type}
Location: Floor ${pattern.floor_number}
Severity: ${pattern.severity.toUpperCase()}
Confidence: ${pattern.confidence_score}%
Pattern Type: ${pattern.pattern_type}

Description:
${pattern.description}

Detected at: ${new Date(pattern.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}

Please review and take appropriate action.
    `.trim()
  }

  private formatAlertContent(alert: PatternAlert, pattern: DetectedPattern): string {
    return `
🚨 CRITICAL PATTERN ALERT

This is a critical alert requiring immediate attention.

Equipment: ${pattern.equipment_type}
Location: Floor ${pattern.floor_number}
Pattern: ${pattern.pattern_type}
Confidence: ${pattern.confidence_score}%

Alert Message:
${alert.message}

Detected: ${new Date(pattern.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}
Alert Expires: ${new Date(alert.expires_at!).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}

IMMEDIATE ACTION REQUIRED

Please acknowledge this alert and take corrective action immediately.
    `.trim()
  }

  private formatSummaryContent(patterns: DetectedPattern[]): string {
    const critical = patterns.filter(p => p.severity === 'critical').length
    const warning = patterns.filter(p => p.severity === 'warning').length
    const info = patterns.filter(p => p.severity === 'info').length

    const equipmentBreakdown = patterns.reduce((acc, p) => {
      acc[p.equipment_type] = (acc[p.equipment_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return `
Daily Pattern Detection Summary

Total Patterns Detected: ${patterns.length}
• Critical: ${critical}
• Warning: ${warning}
• Info: ${info}

Equipment Breakdown:
${Object.entries(equipmentBreakdown).map(([eq, count]) => `• ${eq}: ${count}`).join('\n')}

${critical > 0 ? '\n⚠️  Please review critical patterns immediately.' : ''}

Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}
    `.trim()
  }

  private scheduleEscalation(
    alert: PatternAlert,
    pattern: DetectedPattern,
    recipient: NotificationRecipient
  ): void {
    for (const rule of recipient.escalation_rules) {
      setTimeout(() => {
        // Check if alert is still unacknowledged
        if (!alert.acknowledged) {
          console.log(`Escalating alert ${alert.id} after ${rule.trigger_after_minutes} minutes`)
          // Would trigger escalation notifications here
        }
      }, rule.trigger_after_minutes * 60 * 1000)
    }
  }

  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!
      await this.sendMessage(message)
    }
  }

  private async sendMessage(message: NotificationMessage): Promise<void> {
    try {
      // Simulate message sending based on channel
      console.log(`Sending ${message.channel} notification to ${message.recipient}:`, message.subject)

      switch (message.channel) {
        case 'email':
          await this.sendEmail(message)
          break
        case 'sms':
          await this.sendSMS(message)
          break
        case 'dashboard':
          await this.sendDashboardNotification(message)
          break
        case 'webhook':
          await this.sendWebhook(message)
          break
      }

      message.delivery_status = 'delivered'
      message.sent_at = new Date().toISOString()

    } catch (error) {
      console.error('Failed to send message:', error)
      message.delivery_status = 'failed'
      message.retry_count++

      // Retry logic (max 3 retries)
      if (message.retry_count < 3) {
        setTimeout(() => {
          this.messageQueue.push(message)
        }, message.retry_count * 1000 * 60) // Exponential backoff
      }
    } finally {
      this.deliveryHistory.push(message)

      // Keep only last 1000 messages in history
      if (this.deliveryHistory.length > 1000) {
        this.deliveryHistory = this.deliveryHistory.slice(-1000)
      }
    }
  }

  private async sendEmail(message: NotificationMessage): Promise<void> {
    // Mock email sending
    console.log('📧 Email sent:', {
      to: this.recipients.get(message.recipient)?.email,
      subject: message.subject
    })
  }

  private async sendSMS(message: NotificationMessage): Promise<void> {
    // Mock SMS sending
    console.log('📱 SMS sent:', {
      to: this.recipients.get(message.recipient)?.phone,
      message: message.content.substring(0, 160)
    })
  }

  private async sendDashboardNotification(message: NotificationMessage): Promise<void> {
    // Mock dashboard notification
    console.log('🖥️ Dashboard notification sent:', {
      recipient: message.recipient,
      type: message.type
    })
  }

  private async sendWebhook(message: NotificationMessage): Promise<void> {
    // Mock webhook sending
    console.log('🔗 Webhook sent:', {
      recipient: message.recipient,
      pattern_id: message.pattern_id
    })
  }
}

// Export singleton instance
export const notificationService = new NotificationService({
  email: {
    enabled: true,
    from_address: 'noreply@cu-bems.com'
  },
  sms: {
    enabled: true,
    service_provider: 'twilio'
  },
  push: {
    enabled: false
  },
  webhook: {
    enabled: true,
    endpoints: []
  },
  slack: {
    enabled: false,
    channels: []
  }
})

export default notificationService