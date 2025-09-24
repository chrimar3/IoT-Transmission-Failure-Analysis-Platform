/**
 * Comprehensive Unit Tests for NotificationDeliveryService
 * Story 4.1: Custom Alert Configuration - QA Remediation
 *
 * Testing notification delivery across all channels and scenarios
 */

import { NotificationDeliveryService } from '../NotificationDeliveryService'
import type {
  NotificationSettings,
  NotificationChannel as _NotificationChannel,
  NotificationRecipient as _NotificationRecipient,
  AlertInstance,
  NotificationLog,
  EscalationPolicy,
  EscalationStage,
  ChannelType
} from '../../../types/alerts'

// Mock global fetch
global.fetch = jest.fn()

describe('NotificationDeliveryService', () => {
  let notificationService: NotificationDeliveryService
  let mockAlertInstance: AlertInstance
  let mockNotificationSettings: NotificationSettings

  beforeEach(() => {
    notificationService = new NotificationDeliveryService()
    jest.clearAllMocks()

    mockAlertInstance = {
      id: 'alert_test_001',
      configuration_id: 'config_001',
      rule_id: 'rule_001',
      status: 'triggered',
      severity: 'critical',
      title: 'Critical HVAC System Alert',
      description: 'HVAC system efficiency has dropped below critical threshold',
      metric_values: [
        {
          metric: {
            type: 'energy_consumption',
            display_name: 'Energy Consumption',
            units: 'kWh'
          },
          value: 1500,
          threshold: 1000,
          timestamp: '2025-09-23T10:30:00Z',
          evaluation_window: '5 minutes',
          contributing_factors: ['High temperature', 'Business hours']
        }
      ],
      triggered_at: '2025-09-23T10:30:00Z',
      escalation_level: 0,
      false_positive: false,
      suppressed: false,
      notification_log: [],
      context: {
        sensor_data: [],
        system_status: [],
        recent_changes: [],
        related_alerts: []
      }
    }

    mockNotificationSettings = {
      channels: [
        {
          type: 'email',
          enabled: true,
          configuration: {
            email_addresses: ['admin@company.com', 'manager@company.com']
          },
          priority_filter: ['critical', 'high']
        },
        {
          type: 'sms',
          enabled: true,
          configuration: {
            phone_numbers: ['+1234567890']
          },
          priority_filter: ['critical', 'emergency']
        },
        {
          type: 'webhook',
          enabled: true,
          configuration: {
            webhook_url: 'https://api.company.com/alerts',
            webhook_method: 'POST',
            webhook_headers: { 'X-API-Key': 'test-key' }
          },
          priority_filter: ['critical', 'high', 'medium']
        }
      ],
      recipients: [
        {
          id: 'recipient_001',
          name: 'Admin User',
          contact_methods: [
            {
              type: 'email',
              value: 'admin@company.com',
              verified: true,
              primary: true
            },
            {
              type: 'sms',
              value: '+1234567890',
              verified: true,
              primary: false
            }
          ],
          role: 'administrator',
          department: 'IT',
          escalation_level: 1,
          notification_preferences: {
            channels_by_priority: {
              critical: ['email', 'sms'],
              high: ['email'],
              medium: ['email'],
              low: ['email'],
              info: ['email']
            },
            max_notifications_per_hour: 10,
            quiet_hours_enabled: true,
            weekend_notifications: true,
            vacation_mode: false
          }
        }
      ],
      frequency_limits: {
        max_alerts_per_hour: 20,
        max_alerts_per_day: 100,
        cooldown_between_similar: 30,
        escalation_threshold: 3
      },
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '06:00',
        timezone: 'UTC',
        exceptions: [],
        weekend_override: false
      },
      escalation_delays: [15, 30, 60]
    }
  })

  describe('Basic Notification Sending', () => {
    it('should send notifications through all enabled channels', async () => {
      const notifications = await notificationService.sendAlertNotifications(
        mockNotificationSettings,
        mockAlertInstance
      )

      expect(notifications.length).toBeGreaterThan(0)
      expect(notifications.some(n => n.channel === 'email')).toBe(true)
      expect(notifications.some(n => n.channel === 'sms')).toBe(true)
      expect(notifications.some(n => n.channel === 'webhook')).toBe(true)
    })

    it('should respect priority filters for channels', async () => {
      // Set alert to medium priority
      const mediumAlert = { ...mockAlertInstance, severity: 'medium' as const }

      const notifications = await notificationService.sendAlertNotifications(
        mockNotificationSettings,
        mediumAlert
      )

      // Should send email and webhook (both support medium), but not SMS (critical/emergency only)
      expect(notifications.some(n => n.channel === 'email')).toBe(true)
      expect(notifications.some(n => n.channel === 'webhook')).toBe(true)
      expect(notifications.some(n => n.channel === 'sms')).toBe(false)
    })

    it('should skip disabled channels', async () => {
      const settingsWithDisabledEmail = {
        ...mockNotificationSettings,
        channels: mockNotificationSettings.channels.map(channel =>
          channel.type === 'email'
            ? { ...channel, enabled: false }
            : channel
        )
      }

      const notifications = await notificationService.sendAlertNotifications(
        settingsWithDisabledEmail,
        mockAlertInstance
      )

      expect(notifications.some(n => n.channel === 'email')).toBe(false)
    })

    it('should generate proper notification template', () => {
      const template = (notificationService as unknown).generateNotificationTemplate(mockAlertInstance)

      expect(template.subject).toContain('🚨 CRITICAL Alert')
      expect(template.subject).toContain('Critical HVAC System Alert')
      expect(template.body).toContain('Severity: CRITICAL')
      expect(template.body).toContain('alert_test_001')
      expect(template.html_body).toContain('<div style="font-family: Arial')
      expect(template.variables.alert_id).toBe('alert_test_001')
    })
  })

  describe('Quiet Hours Handling', () => {
    it('should suppress alerts during quiet hours', async () => {
      const quietHoursSettings = {
        ...mockNotificationSettings,
        quiet_hours: {
          enabled: true,
          start_time: '22:00',
          end_time: '06:00',
          timezone: 'UTC',
          exceptions: [],
          weekend_override: false
        }
      }

      // Mock current time to be 2 AM (during quiet hours)
      const quietHoursAlert = {
        ...mockAlertInstance,
        triggered_at: '2025-09-23T02:00:00Z'
      }

      // Mock Date.now to return quiet hours time
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(2)

      const notifications = await notificationService.sendAlertNotifications(
        quietHoursSettings,
        quietHoursAlert
      )

      expect(notifications).toHaveLength(0)
    })

    it('should allow critical alerts during quiet hours', async () => {
      const quietHoursSettings = {
        ...mockNotificationSettings,
        quiet_hours: {
          enabled: true,
          start_time: '22:00',
          end_time: '06:00',
          timezone: 'UTC',
          exceptions: [],
          weekend_override: false
        }
      }

      const criticalAlert = {
        ...mockAlertInstance,
        severity: 'critical' as const,
        triggered_at: '2025-09-23T02:00:00Z'
      }

      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(2)

      const notifications = await notificationService.sendAlertNotifications(
        quietHoursSettings,
        criticalAlert
      )

      expect(notifications.length).toBeGreaterThan(0)
    })

    it('should respect alert exceptions during quiet hours', async () => {
      const quietHoursSettings = {
        ...mockNotificationSettings,
        quiet_hours: {
          enabled: true,
          start_time: '22:00',
          end_time: '06:00',
          timezone: 'UTC',
          exceptions: ['alert_test_001'],
          weekend_override: false
        }
      }

      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(2)

      const notifications = await notificationService.sendAlertNotifications(
        quietHoursSettings,
        mockAlertInstance
      )

      expect(notifications.length).toBeGreaterThan(0)
    })

    it('should handle overnight quiet hours correctly', () => {
      const _isQuietHours = (notificationService as unknown).isQuietHours(
        {
          enabled: true,
          start_time: '22:00',
          end_time: '06:00',
          timezone: 'UTC',
          exceptions: [],
          weekend_override: false
        },
        mockAlertInstance
      )

      // Mock different times
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23) // 11 PM
      expect((notificationService as unknown).isQuietHours(
        {
          enabled: true,
          start_time: '22:00',
          end_time: '06:00',
          timezone: 'UTC',
          exceptions: [],
          weekend_override: false
        },
        mockAlertInstance
      )).toBe(true)

      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(3) // 3 AM
      expect((notificationService as unknown).isQuietHours(
        {
          enabled: true,
          start_time: '22:00',
          end_time: '06:00',
          timezone: 'UTC',
          exceptions: [],
          weekend_override: false
        },
        mockAlertInstance
      )).toBe(true)

      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10) // 10 AM
      expect((notificationService as unknown).isQuietHours(
        {
          enabled: true,
          start_time: '22:00',
          end_time: '06:00',
          timezone: 'UTC',
          exceptions: [],
          weekend_override: false
        },
        mockAlertInstance
      )).toBe(false)
    })
  })

  describe('Frequency Limits', () => {
    it('should respect hourly alert limits', async () => {
      // Mock recent alerts count to exceed limit
      jest.spyOn(notificationService as unknown, 'getRecentAlertsCount')
        .mockResolvedValue({ lastHour: 25, lastDay: 50 })

      const settingsWithLowLimit = {
        ...mockNotificationSettings,
        frequency_limits: {
          ...mockNotificationSettings.frequency_limits,
          max_alerts_per_hour: 20
        }
      }

      const notifications = await notificationService.sendAlertNotifications(
        settingsWithLowLimit,
        mockAlertInstance
      )

      expect(notifications).toHaveLength(0)
    })

    it('should respect daily alert limits', async () => {
      jest.spyOn(notificationService as unknown, 'getRecentAlertsCount')
        .mockResolvedValue({ lastHour: 5, lastDay: 150 })

      const settingsWithLowDailyLimit = {
        ...mockNotificationSettings,
        frequency_limits: {
          ...mockNotificationSettings.frequency_limits,
          max_alerts_per_day: 100
        }
      }

      const notifications = await notificationService.sendAlertNotifications(
        settingsWithLowDailyLimit,
        mockAlertInstance
      )

      expect(notifications).toHaveLength(0)
    })

    it('should respect cooldown between similar alerts', async () => {
      // Mock last similar alert to be within cooldown period
      const recentSimilarAlert = {
        ...mockAlertInstance,
        triggered_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago
      }

      jest.spyOn(notificationService as unknown, 'getLastSimilarAlert')
        .mockResolvedValue(recentSimilarAlert)

      const settingsWithCooldown = {
        ...mockNotificationSettings,
        frequency_limits: {
          ...mockNotificationSettings.frequency_limits,
          cooldown_between_similar: 30 // 30 minutes
        }
      }

      const notifications = await notificationService.sendAlertNotifications(
        settingsWithCooldown,
        mockAlertInstance
      )

      expect(notifications).toHaveLength(0)
    })
  })

  describe('Recipient Filtering', () => {
    it('should filter recipients by notification preferences', async () => {
      const recipientWithNoEmailPref = {
        ...mockNotificationSettings.recipients[0],
        notification_preferences: {
          ...mockNotificationSettings.recipients[0].notification_preferences,
          channels_by_priority: {
            critical: ['sms'], // Only SMS for critical
            high: ['email'],
            medium: ['email'],
            low: ['email'],
            info: ['email']
          }
        }
      }

      const settingsWithFilteredRecipient = {
        ...mockNotificationSettings,
        recipients: [recipientWithNoEmailPref]
      }

      const notifications = await notificationService.sendAlertNotifications(
        settingsWithFilteredRecipient,
        mockAlertInstance
      )

      const emailNotifications = notifications.filter(n => n.channel === 'email')
      expect(emailNotifications).toHaveLength(0)
    })

    it('should check recipient contact method verification', async () => {
      const recipientWithUnverifiedEmail = {
        ...mockNotificationSettings.recipients[0],
        contact_methods: [
          {
            type: 'email' as ChannelType,
            value: 'unverified@company.com',
            verified: false,
            primary: true
          }
        ]
      }

      const settingsWithUnverifiedRecipient = {
        ...mockNotificationSettings,
        recipients: [recipientWithUnverifiedEmail]
      }

      const notifications = await notificationService.sendAlertNotifications(
        settingsWithUnverifiedRecipient,
        mockAlertInstance
      )

      expect(notifications.some(n =>
        n.channel === 'email' && n.recipient === 'unverified@company.com'
      )).toBe(false)
    })

    it('should handle on-call schedule filtering', async () => {
      const recipientWithSchedule = {
        ...mockNotificationSettings.recipients[0],
        on_call_schedule: {
          timezone: 'UTC',
          schedules: [
            {
              days_of_week: [1, 2, 3, 4, 5], // Monday-Friday
              start_time: '09:00',
              end_time: '17:00',
              effective_date_start: '2025-01-01',
              effective_date_end: '2025-12-31'
            }
          ],
          coverage_required: true
        }
      }

      // Mock current time to be Tuesday 2 PM (should be on-call)
      jest.spyOn(Date.prototype, 'getDay').mockReturnValue(2) // Tuesday
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14) // 2 PM

      const isOnCall = (notificationService as unknown).isRecipientOnCall(
        recipientWithSchedule,
        new Date()
      )

      expect(isOnCall).toBe(true)

      // Test outside schedule (Saturday)
      jest.spyOn(Date.prototype, 'getDay').mockReturnValue(6) // Saturday
      const isOnCallWeekend = (notificationService as unknown).isRecipientOnCall(
        recipientWithSchedule,
        new Date()
      )

      expect(isOnCallWeekend).toBe(false)
    })
  })

  describe('Channel-Specific Delivery', () => {
    it('should handle email delivery', async () => {
      const emailProvider = (notificationService as unknown).emailProvider
      const sendEmailSpy = jest.spyOn(emailProvider, 'sendEmail')
        .mockResolvedValue({
          success: true,
          message_id: 'email_123',
          delivery_time: new Date().toISOString()
        })

      const result = await (notificationService as unknown).deliverNotification(
        'email',
        'test@company.com',
        {
          subject: 'Test Alert',
          body: 'Test message',
          html_body: '<p>Test message</p>',
          variables: {}
        },
        mockAlertInstance,
        { email_template: 'default' }
      )

      expect(sendEmailSpy).toHaveBeenCalledWith(
        'test@company.com',
        'Test Alert',
        'Test message',
        '<p>Test message</p>',
        { email_template: 'default' }
      )
      expect(result.success).toBe(true)
    })

    it('should handle SMS delivery', async () => {
      const smsProvider = (notificationService as unknown).smsProvider
      const sendSMSSpy = jest.spyOn(smsProvider, 'sendSMS')
        .mockResolvedValue({
          success: true,
          message_id: 'sms_123',
          delivery_time: new Date().toISOString()
        })

      const result = await (notificationService as unknown).deliverNotification(
        'sms',
        '+1234567890',
        {
          subject: 'Test Alert',
          body: 'Test SMS message',
          variables: {}
        },
        mockAlertInstance,
        { sms_provider: 'twilio' }
      )

      expect(sendSMSSpy).toHaveBeenCalledWith(
        '+1234567890',
        'Test SMS message',
        { sms_provider: 'twilio' }
      )
      expect(result.success).toBe(true)
    })

    it('should handle webhook delivery', async () => {
      const webhookService = (notificationService as unknown).webhookService
      const sendWebhookSpy = jest.spyOn(webhookService, 'sendWebhook')
        .mockResolvedValue({
          success: true,
          message_id: 'webhook_123',
          delivery_time: new Date().toISOString()
        })

      const result = await (notificationService as unknown).deliverNotification(
        'webhook',
        'https://api.company.com/alerts',
        {
          subject: 'Test Alert',
          body: 'Test message',
          variables: {}
        },
        mockAlertInstance,
        {
          webhook_url: 'https://api.company.com/alerts',
          webhook_method: 'POST',
          webhook_headers: { 'X-API-Key': 'test-key' }
        }
      )

      expect(sendWebhookSpy).toHaveBeenCalledWith(
        'https://api.company.com/alerts',
        expect.objectContaining({
          alert_id: 'alert_test_001',
          alert_title: 'Critical HVAC System Alert',
          severity: 'critical'
        }),
        expect.objectContaining({
          webhook_url: 'https://api.company.com/alerts',
          webhook_method: 'POST'
        })
      )
      expect(result.success).toBe(true)
    })

    it('should create proper webhook payload', () => {
      const template = {
        subject: 'Test Alert',
        body: 'Test message',
        variables: { dashboard_url: 'https://app.com/dashboard' }
      }

      const payload = (notificationService as unknown).createWebhookPayload(mockAlertInstance, template)

      expect(payload).toEqual({
        alert_id: 'alert_test_001',
        alert_title: 'Critical HVAC System Alert',
        severity: 'critical',
        triggered_at: '2025-09-23T10:30:00Z',
        description: 'HVAC system efficiency has dropped below critical threshold',
        metric_values: mockAlertInstance.metric_values,
        dashboard_url: 'https://app.com/dashboard',
        custom_fields: {
          configuration_id: 'config_001',
          rule_id: 'rule_001',
          escalation_level: 0
        }
      })
    })
  })

  describe('Escalation Handling', () => {
    it('should handle alert escalation correctly', async () => {
      const escalationPolicy: EscalationPolicy = {
        id: 'escalation_001',
        name: 'Standard Escalation',
        description: 'Standard escalation policy',
        stages: [
          {
            level: 1,
            delay_minutes: 15,
            recipients: ['recipient_001'],
            channels: ['email'],
            require_acknowledgment: true,
            acknowledgment_timeout: 30,
            skip_if_acknowledged: false,
            custom_message: 'Level 1 escalation'
          },
          {
            level: 2,
            delay_minutes: 30,
            recipients: ['recipient_002'],
            channels: ['sms', 'email'],
            require_acknowledgment: true,
            acknowledgment_timeout: 15,
            skip_if_acknowledged: false,
            custom_message: 'Level 2 escalation - urgent'
          }
        ],
        max_escalations: 2,
        escalation_timeout: 60,
        auto_resolve: false,
        auto_resolve_timeout: 120
      }

      const alertWithNotificationLog = {
        ...mockAlertInstance,
        notification_log: [
          {
            id: 'notif_001',
            channel: 'email' as ChannelType,
            recipient: 'admin@company.com',
            sent_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 minutes ago
            status: 'sent' as const,
            retry_count: 0
          }
        ]
      }

      const escalationNotifications = await notificationService.handleEscalation(
        alertWithNotificationLog,
        escalationPolicy,
        0 // Level 0 (will escalate to level 1)
      )

      expect(escalationNotifications.length).toBeGreaterThan(0)
      expect(escalationNotifications[0].channel).toBe('email')
    })

    it('should not escalate if insufficient time has passed', async () => {
      const escalationPolicy: EscalationPolicy = {
        id: 'escalation_001',
        name: 'Standard Escalation',
        description: 'Standard escalation policy',
        stages: [
          {
            level: 1,
            delay_minutes: 30, // 30 minutes delay
            recipients: ['recipient_001'],
            channels: ['email'],
            require_acknowledgment: true,
            acknowledgment_timeout: 30,
            skip_if_acknowledged: false
          }
        ],
        max_escalations: 1,
        escalation_timeout: 60,
        auto_resolve: false,
        auto_resolve_timeout: 120
      }

      const alertWithRecentNotification = {
        ...mockAlertInstance,
        notification_log: [
          {
            id: 'notif_001',
            channel: 'email' as ChannelType,
            recipient: 'admin@company.com',
            sent_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
            status: 'sent' as const,
            retry_count: 0
          }
        ]
      }

      const escalationNotifications = await notificationService.handleEscalation(
        alertWithRecentNotification,
        escalationPolicy,
        0
      )

      expect(escalationNotifications).toHaveLength(0)
    })

    it('should generate escalation template correctly', () => {
      const stage: EscalationStage = {
        level: 2,
        delay_minutes: 30,
        recipients: ['recipient_002'],
        channels: ['email', 'sms'],
        require_acknowledgment: true,
        acknowledgment_timeout: 15,
        skip_if_acknowledged: false,
        custom_message: 'This is a level 2 escalation - urgent action required'
      }

      const escalationTemplate = (notificationService as unknown).generateEscalationTemplate(
        mockAlertInstance,
        stage,
        2
      )

      expect(escalationTemplate.subject).toContain('🔥 ESCALATED (Level 2)')
      expect(escalationTemplate.body).toContain('*** ESCALATED ALERT - LEVEL 2 ***')
      expect(escalationTemplate.body).toContain('This is a level 2 escalation - urgent action required')
      expect(escalationTemplate.variables.escalation_level).toBe('2')
    })
  })

  describe('Retry Mechanism', () => {
    it('should retry failed notifications with exponential backoff', async () => {
      const failedNotifications: NotificationLog[] = [
        {
          id: 'failed_001',
          channel: 'email',
          recipient: 'test@company.com',
          sent_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
          status: 'failed',
          error_message: 'SMTP server unavailable',
          retry_count: 1
        }
      ]

      const retryResults = await notificationService.retryFailedNotifications(
        failedNotifications,
        3
      )

      expect(retryResults).toHaveLength(1)
      expect(retryResults[0].retry_count).toBe(2)
      expect(retryResults[0].status).toBe('sent')
    })

    it('should not retry notifications that have reached max retries', async () => {
      const maxRetriedNotification: NotificationLog[] = [
        {
          id: 'failed_002',
          channel: 'email',
          recipient: 'test@company.com',
          sent_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
          status: 'failed',
          error_message: 'Permanent failure',
          retry_count: 3
        }
      ]

      const retryResults = await notificationService.retryFailedNotifications(
        maxRetriedNotification,
        3
      )

      expect(retryResults).toHaveLength(0)
    })

    it('should not retry notifications that are too recent', async () => {
      const recentFailedNotification: NotificationLog[] = [
        {
          id: 'failed_003',
          channel: 'email',
          recipient: 'test@company.com',
          sent_at: new Date(Date.now() - 30 * 1000).toISOString(), // 30 seconds ago
          status: 'failed',
          error_message: 'Temporary failure',
          retry_count: 0
        }
      ]

      const retryResults = await notificationService.retryFailedNotifications(
        recentFailedNotification,
        3
      )

      expect(retryResults).toHaveLength(0) // Should wait for exponential backoff delay
    })
  })

  describe('Error Handling', () => {
    it('should handle delivery errors gracefully', async () => {
      const emailProvider = (notificationService as unknown).emailProvider
      jest.spyOn(emailProvider, 'sendEmail')
        .mockRejectedValue(new Error('SMTP connection failed'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const notifications = await notificationService.sendAlertNotifications(
        mockNotificationSettings,
        mockAlertInstance
      )

      // Should still return notification logs even if delivery fails
      const failedEmailNotifications = notifications.filter(
        n => n.channel === 'email' && n.status === 'failed'
      )

      expect(failedEmailNotifications.length).toBeGreaterThan(0)
      expect(failedEmailNotifications[0].error_message).toBe('SMTP connection failed')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle unsupported channel types', async () => {
      await expect(
        (notificationService as unknown).deliverNotification(
          'unsupported_channel' as ChannelType,
          'recipient',
          { subject: 'Test', body: 'Test', variables: {} },
          mockAlertInstance,
          {}
        )
      ).rejects.toThrow('Unsupported channel type: unsupported_channel')
    })

    it('should continue processing other channels when one fails', async () => {
      // Mock email to fail but SMS to succeed
      const emailProvider = (notificationService as unknown).emailProvider
      const smsProvider = (notificationService as unknown).smsProvider

      jest.spyOn(emailProvider, 'sendEmail')
        .mockRejectedValue(new Error('Email service down'))
      jest.spyOn(smsProvider, 'sendSMS')
        .mockResolvedValue({ success: true, message_id: 'sms_123' })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const notifications = await notificationService.sendAlertNotifications(
        mockNotificationSettings,
        mockAlertInstance
      )

      // Should have both failed email and successful SMS notifications
      expect(notifications.some(n => n.channel === 'email' && n.status === 'failed')).toBe(true)
      expect(notifications.some(n => n.channel === 'sms' && n.status === 'sent')).toBe(true)

      consoleSpy.mockRestore()
    })
  })

  describe('Performance and Load Handling', () => {
    it('should handle high volume of notifications efficiently', async () => {
      // Create many recipients
      const manyRecipients = Array.from({ length: 100 }, (_, i) => ({
        id: `recipient_${i}`,
        name: `User ${i}`,
        contact_methods: [
          {
            type: 'email' as ChannelType,
            value: `user${i}@company.com`,
            verified: true,
            primary: true
          }
        ],
        role: 'user',
        department: 'test',
        escalation_level: 1,
        notification_preferences: {
          channels_by_priority: {
            critical: ['email'],
            high: ['email'],
            medium: ['email'],
            low: ['email'],
            info: ['email']
          },
          max_notifications_per_hour: 10,
          quiet_hours_enabled: false,
          weekend_notifications: true,
          vacation_mode: false
        }
      }))

      const highVolumeSettings = {
        ...mockNotificationSettings,
        recipients: manyRecipients
      }

      const startTime = Date.now()
      const notifications = await notificationService.sendAlertNotifications(
        highVolumeSettings,
        mockAlertInstance
      )
      const duration = Date.now() - startTime

      expect(notifications.length).toBeGreaterThan(50) // Should process most recipients
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle concurrent notification sending', async () => {
      const promises = Array.from({ length: 10 }, () =>
        notificationService.sendAlertNotifications(
          mockNotificationSettings,
          { ...mockAlertInstance, id: `alert_${Math.random()}` }
        )
      )

      const results = await Promise.all(promises)

      expect(results.every(notifications => notifications.length > 0)).toBe(true)
    })
  })
})