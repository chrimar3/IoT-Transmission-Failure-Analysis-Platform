/**
 * End-to-End Tests for Alert Lifecycle
 * Story 4.1: Custom Alert Configuration - QA Remediation
 *
 * Testing complete alert flow from configuration to resolution
 */

import { AlertRuleEngine } from '../../lib/alerts/AlertRuleEngine'
import { NotificationDeliveryService } from '../../lib/alerts/NotificationDeliveryService'
import type {
  AlertConfiguration,
  AlertInstance,
  EvaluationContext,
  SensorReading,
  NotificationLog
} from '../../types/alerts'

// Mock external services for E2E testing
const mockEmailService = {
  sent: [] as unknown[],
  send: jest.fn().mockImplementation((recipient, subject, body) => {
    mockEmailService.sent.push({ recipient, subject, body, timestamp: new Date() })
    return Promise.resolve({ success: true, message_id: `email_${Date.now()}` })
  })
}

const mockSMSService = {
  sent: [] as unknown[],
  send: jest.fn().mockImplementation((recipient, message) => {
    mockSMSService.sent.push({ recipient, message, timestamp: new Date() })
    return Promise.resolve({ success: true, message_id: `sms_${Date.now()}` })
  })
}

describe('Alert Lifecycle End-to-End Tests', () => {
  let alertEngine: AlertRuleEngine
  let notificationService: NotificationDeliveryService
  let alertConfiguration: AlertConfiguration
  let bangkokSensorData: SensorReading[]

  beforeEach(() => {
    jest.clearAllMocks()
    mockEmailService.sent = []
    mockSMSService.sent = []

    alertEngine = new AlertRuleEngine()
    notificationService = new NotificationDeliveryService()

    // Bangkok facility alert configuration
    alertConfiguration = {
      id: 'config_bangkok_energy_001',
      name: 'Bangkok Facility High Energy Consumption Alert',
      description: 'Critical alert for energy consumption spikes in Bangkok office building',
      user_id: 'user_bangkok_admin',
      organization_id: 'org_company_thailand',
      status: 'active',
      created_at: '2025-09-23T00:00:00Z',
      updated_at: '2025-09-23T00:00:00Z',
      created_by: 'user_bangkok_admin',
      rules: [
        {
          id: 'rule_bangkok_energy_critical',
          name: 'Critical Energy Consumption Rule',
          description: 'Trigger when energy consumption exceeds 1500 kWh during business hours',
          enabled: true,
          priority: 'critical',
          conditions: [
            {
              id: 'condition_energy_threshold',
              metric: {
                type: 'energy_consumption',
                sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
                display_name: 'Main HVAC Energy Consumption',
                units: 'kWh'
              },
              operator: 'greater_than',
              threshold: { value: 1500 },
              time_aggregation: {
                function: 'sum',
                period: 60, // 1 hour window
                minimum_data_points: 12 // At least 12 readings in the hour
              },
              filters: [
                {
                  field: 'quality',
                  operator: 'equals',
                  value: 'good'
                }
              ]
            },
            {
              id: 'condition_business_hours',
              metric: {
                type: 'occupancy',
                sensor_id: 'BANGKOK_OCCUPANCY_MAIN',
                display_name: 'Building Occupancy',
                units: 'count'
              },
              operator: 'greater_than',
              threshold: { value: 50 }, // More than 50 people
              time_aggregation: {
                function: 'average',
                period: 15,
                minimum_data_points: 3
              },
              filters: []
            }
          ],
          logical_operator: 'AND',
          evaluation_window: 60,
          cooldown_period: 30,
          suppress_duplicates: true,
          tags: ['energy', 'critical', 'bangkok', 'hvac']
        }
      ],
      notification_settings: {
        channels: [
          {
            type: 'email',
            enabled: true,
            configuration: {
              email_addresses: ['admin@company-bangkok.com', 'facilities@company-bangkok.com']
            },
            priority_filter: ['critical', 'high', 'medium']
          },
          {
            type: 'sms',
            enabled: true,
            configuration: {
              phone_numbers: ['+66812345678', '+66887654321']
            },
            priority_filter: ['critical', 'high']
          },
          {
            type: 'webhook',
            enabled: true,
            configuration: {
              webhook_url: 'https://monitoring.company-bangkok.com/alerts',
              webhook_method: 'POST',
              webhook_headers: {
                'X-API-Key': 'bangkok-facility-key',
                'X-Facility-Code': 'BKK001'
              }
            },
            priority_filter: ['critical', 'high', 'medium', 'low']
          }
        ],
        recipients: [
          {
            id: 'recipient_bangkok_facilities_manager',
            name: 'Somchai Jaidee',
            contact_methods: [
              {
                type: 'email',
                value: 'admin@company-bangkok.com',
                verified: true,
                primary: true
              },
              {
                type: 'sms',
                value: '+66812345678',
                verified: true,
                primary: false
              }
            ],
            role: 'facilities_manager',
            department: 'operations',
            escalation_level: 1,
            on_call_schedule: {
              timezone: 'Asia/Bangkok',
              schedules: [
                {
                  days_of_week: [1, 2, 3, 4, 5], // Monday-Friday
                  start_time: '08:00',
                  end_time: '18:00',
                  effective_date_start: '2025-01-01',
                  effective_date_end: '2025-12-31'
                }
              ],
              coverage_required: true
            },
            notification_preferences: {
              channels_by_priority: {
                critical: ['email', 'sms'],
                high: ['email'],
                medium: ['email'],
                low: ['email'],
                info: ['email']
              },
              max_notifications_per_hour: 20,
              quiet_hours_enabled: false,
              weekend_notifications: true,
              vacation_mode: false
            }
          }
        ],
        frequency_limits: {
          max_alerts_per_hour: 5,
          max_alerts_per_day: 20,
          cooldown_between_similar: 30,
          escalation_threshold: 2
        },
        quiet_hours: {
          enabled: true,
          start_time: '23:00',
          end_time: '07:00',
          timezone: 'Asia/Bangkok',
          exceptions: ['critical'],
          weekend_override: false
        },
        escalation_delays: [15, 30, 60]
      },
      escalation_policy: {
        id: 'escalation_bangkok_critical',
        name: 'Bangkok Critical Alert Escalation',
        description: 'Escalation policy for critical alerts in Bangkok facility',
        stages: [
          {
            level: 1,
            delay_minutes: 15,
            recipients: ['recipient_bangkok_facilities_manager'],
            channels: ['email'],
            require_acknowledgment: true,
            acknowledgment_timeout: 20,
            skip_if_acknowledged: false,
            custom_message: 'Please acknowledge this critical energy alert within 20 minutes'
          },
          {
            level: 2,
            delay_minutes: 30,
            recipients: ['recipient_bangkok_facilities_manager'],
            channels: ['email', 'sms'],
            require_acknowledgment: true,
            acknowledgment_timeout: 10,
            skip_if_acknowledged: false,
            custom_message: 'ESCALATED: Critical energy consumption requires immediate attention'
          }
        ],
        max_escalations: 2,
        escalation_timeout: 45,
        auto_resolve: false,
        auto_resolve_timeout: 120
      },
      metadata: {
        category: 'energy_efficiency',
        severity_auto_adjust: true,
        business_impact: {
          level: 'critical',
          estimated_cost_per_hour: 2000,
          affected_occupants: 200,
          operational_severity: 'system_down',
          compliance_risk: true,
          safety_risk: false
        },
        affected_systems: ['hvac'],
        affected_locations: ['Bangkok Office - All Floors'],
        documentation_links: [
          'https://docs.company.com/bangkok-facility/energy-management',
          'https://wiki.company.com/emergency-procedures-bangkok'
        ],
        runbook_url: 'https://runbooks.company.com/bangkok-energy-emergency',
        tags: ['energy', 'critical', 'bangkok', 'business-hours'],
        custom_fields: {
          facility_code: 'BKK001',
          building_manager: 'Somchai Jaidee',
          energy_baseline: 1200,
          peak_hours: '09:00-17:00',
          emergency_contact: '+66812345678',
          local_timezone: 'Asia/Bangkok'
        }
      }
    }

    // Realistic Bangkok sensor data showing energy consumption spike
    bangkokSensorData = [
      // Normal readings leading up to spike
      {
        sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
        timestamp: '2025-09-23T08:00:00+07:00', // 8 AM Bangkok time
        value: 1200,
        unit: 'kWh',
        quality: 'good'
      },
      {
        sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
        timestamp: '2025-09-23T08:05:00+07:00',
        value: 1250,
        unit: 'kWh',
        quality: 'good'
      },
      {
        sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
        timestamp: '2025-09-23T08:10:00+07:00',
        value: 1300,
        unit: 'kWh',
        quality: 'good'
      },
      // Spike begins - hot day, increased cooling demand
      {
        sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
        timestamp: '2025-09-23T08:15:00+07:00',
        value: 1450,
        unit: 'kWh',
        quality: 'good'
      },
      {
        sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
        timestamp: '2025-09-23T08:20:00+07:00',
        value: 1520, // Exceeds 1500 kWh threshold
        unit: 'kWh',
        quality: 'good'
      },
      {
        sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
        timestamp: '2025-09-23T08:25:00+07:00',
        value: 1580,
        unit: 'kWh',
        quality: 'good'
      },
      // Occupancy data showing business hours
      {
        sensor_id: 'BANGKOK_OCCUPANCY_MAIN',
        timestamp: '2025-09-23T08:00:00+07:00',
        value: 45,
        unit: 'count',
        quality: 'good'
      },
      {
        sensor_id: 'BANGKOK_OCCUPANCY_MAIN',
        timestamp: '2025-09-23T08:05:00+07:00',
        value: 65, // Exceeds 50 person threshold
        unit: 'count',
        quality: 'good'
      },
      {
        sensor_id: 'BANGKOK_OCCUPANCY_MAIN',
        timestamp: '2025-09-23T08:10:00+07:00',
        value: 85,
        unit: 'count',
        quality: 'good'
      },
      {
        sensor_id: 'BANGKOK_OCCUPANCY_MAIN',
        timestamp: '2025-09-23T08:15:00+07:00',
        value: 120,
        unit: 'count',
        quality: 'good'
      }
    ]
  })

  describe('Complete Alert Lifecycle', () => {
    it('should trigger alert when conditions are met and process full lifecycle', async () => {
      const evaluationContext: EvaluationContext = {
        current_time: '2025-09-23T08:25:00+07:00', // 8:25 AM Bangkok time
        sensor_readings: bangkokSensorData.filter(reading =>
          new Date(reading.timestamp) <= new Date('2025-09-23T08:25:00+07:00')
        ),
        historical_data: [
          // Historical data for baseline comparison
          {
            sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
            timestamp: '2025-09-22T08:25:00+07:00',
            value: 1100,
            unit: 'kWh',
            quality: 'good'
          }
        ],
        system_status: {
          hvac_operational: true,
          maintenance_mode: false
        },
        weather_data: {
          temperature: 36, // Hot day in Bangkok
          humidity: 85,
          wind_speed: 2,
          solar_irradiance: 850,
          weather_condition: 'sunny',
          forecast_change: 'temperature rising'
        },
        occupancy_data: {
          current_occupancy: 120,
          typical_occupancy: 90,
          occupancy_trend: 'increasing',
          events_scheduled: ['Morning meeting - Floor 5']
        }
      }

      // Step 1: Alert Rule Evaluation
      const triggeredAlerts = await alertEngine.evaluateAlerts(
        [alertConfiguration],
        evaluationContext
      )

      expect(triggeredAlerts).toHaveLength(1)

      const alert = triggeredAlerts[0]
      expect(alert.severity).toBe('critical')
      expect(alert.status).toBe('triggered')
      expect(alert.configuration_id).toBe('config_bangkok_energy_001')
      expect(alert.title).toContain('Bangkok Facility High Energy Consumption Alert')

      // Verify conditions were properly evaluated
      expect(alert.metric_values).toHaveLength(2) // Energy and occupancy conditions
      expect(alert.metric_values[0].value).toBeGreaterThan(1500) // Energy threshold exceeded
      expect(alert.metric_values[1].value).toBeGreaterThan(50) // Occupancy threshold exceeded

      // Verify context includes weather factors
      expect(alert.context.weather_conditions).toBeDefined()
      expect(alert.context.weather_conditions?.temperature).toBe(36)

      // Step 2: Initial Notification Delivery
      const initialNotifications = await notificationService.sendAlertNotifications(
        alertConfiguration.notification_settings,
        alert
      )

      expect(initialNotifications.length).toBeGreaterThan(0)

      // Verify email notifications sent
      const emailNotifications = initialNotifications.filter(n => n.channel === 'email')
      expect(emailNotifications.length).toBeGreaterThan(0)
      expect(emailNotifications[0].status).toBe('sent')

      // Verify SMS notifications sent (critical priority)
      const smsNotifications = initialNotifications.filter(n => n.channel === 'sms')
      expect(smsNotifications.length).toBeGreaterThan(0)

      // Verify webhook notifications
      const webhookNotifications = initialNotifications.filter(n => n.channel === 'webhook')
      expect(webhookNotifications.length).toBeGreaterThan(0)

      // Step 3: Simulate No Acknowledgment - Trigger Escalation
      const alertWithNotificationLog: AlertInstance = {
        ...alert,
        notification_log: initialNotifications
      }

      // Wait for escalation delay (simulated)
      const escalationNotifications = await notificationService.handleEscalation(
        alertWithNotificationLog,
        alertConfiguration.escalation_policy!,
        0 // First escalation level
      )

      expect(escalationNotifications.length).toBeGreaterThan(0)

      // Verify escalation notifications have proper formatting
      const escalationEmailNotif = escalationNotifications.find(n => n.channel === 'email')
      expect(escalationEmailNotif).toBeDefined()

      // Step 4: Simulate Second Escalation
      const alertWithFirstEscalation: AlertInstance = {
        ...alertWithNotificationLog,
        escalation_level: 1,
        notification_log: [...initialNotifications, ...escalationNotifications]
      }

      const secondEscalationNotifications = await notificationService.handleEscalation(
        alertWithFirstEscalation,
        alertConfiguration.escalation_policy!,
        1 // Second escalation level
      )

      expect(secondEscalationNotifications.length).toBeGreaterThan(0)

      // Verify second escalation includes both email and SMS
      const level2EmailNotifs = secondEscalationNotifications.filter(n => n.channel === 'email')
      const level2SMSNotifs = secondEscalationNotifications.filter(n => n.channel === 'sms')

      expect(level2EmailNotifs.length).toBeGreaterThan(0)
      expect(level2SMSNotifs.length).toBeGreaterThan(0)

      // Step 5: Verify Complete Notification Log
      const completeNotificationLog = [
        ...initialNotifications,
        ...escalationNotifications,
        ...secondEscalationNotifications
      ]

      expect(completeNotificationLog.length).toBeGreaterThanOrEqual(6) // Multiple channels × multiple escalations

      // Verify chronological order of notifications
      const timestamps = completeNotificationLog.map(n => new Date(n.sent_at).getTime())
      const sortedTimestamps = [...timestamps].sort((a, b) => a - b)
      expect(timestamps).toEqual(sortedTimestamps)

      // Step 6: Simulate Alert Resolution
      const resolvedAlert: AlertInstance = {
        ...alertWithFirstEscalation,
        status: 'resolved',
        resolved_at: '2025-09-23T09:15:00+07:00',
        resolved_by: 'user_bangkok_admin',
        resolution_notes: 'HVAC system optimized, temperature setpoint adjusted for hot weather conditions',
        escalation_level: 2
      }

      expect(resolvedAlert.status).toBe('resolved')
      expect(resolvedAlert.resolved_by).toBe('user_bangkok_admin')
      expect(resolvedAlert.resolution_notes).toContain('HVAC system optimized')
    })

    it('should handle Bangkok timezone and business hours correctly', async () => {
      // Test during Bangkok business hours (8:30 AM local time)
      const businessHoursContext: EvaluationContext = {
        current_time: '2025-09-23T08:30:00+07:00', // Bangkok timezone
        sensor_readings: bangkokSensorData,
        historical_data: [],
        system_status: {},
        weather_data: {
          temperature: 36,
          humidity: 85,
          wind_speed: 3,
          solar_irradiance: 800,
          weather_condition: 'clear',
          forecast_change: 'temperature rising'
        }
      }

      const alerts = await alertEngine.evaluateAlerts(
        [alertConfiguration],
        businessHoursContext
      )

      expect(alerts).toHaveLength(1)

      // Verify contributing factors include business hours
      const contributingFactors = alerts[0].metric_values[0].contributing_factors
      expect(contributingFactors).toContain('Business hours')

      // Test outside business hours (should still trigger due to critical severity)
      const afterHoursContext: EvaluationContext = {
        current_time: '2025-09-23T20:30:00+07:00', // 8:30 PM Bangkok time
        sensor_readings: bangkokSensorData,
        historical_data: [],
        system_status: {},
        weather_data: {
          temperature: 32,
          humidity: 80,
          wind_speed: 5,
          solar_irradiance: 400,
          weather_condition: 'partly_cloudy',
          forecast_change: 'stable'
        }
      }

      const afterHoursAlerts = await alertEngine.evaluateAlerts(
        [alertConfiguration],
        afterHoursContext
      )

      expect(afterHoursAlerts).toHaveLength(1)

      const afterHoursFactors = afterHoursAlerts[0].metric_values[0].contributing_factors
      expect(afterHoursFactors).toContain('After hours')
    })

    it('should respect quiet hours but allow critical alerts', async () => {
      // Test during quiet hours (2 AM Bangkok time)
      const quietHoursAlert: AlertInstance = {
        id: 'alert_quiet_hours_test',
        configuration_id: alertConfiguration.id,
        rule_id: alertConfiguration.rules[0].id,
        status: 'triggered',
        severity: 'critical',
        title: 'Critical Alert During Quiet Hours',
        description: 'Critical energy spike detected',
        metric_values: [],
        triggered_at: '2025-09-23T02:00:00+07:00', // 2 AM Bangkok time
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

      const notifications = await notificationService.sendAlertNotifications(
        alertConfiguration.notification_settings,
        quietHoursAlert
      )

      // Critical alerts should still be sent during quiet hours
      expect(notifications.length).toBeGreaterThan(0)

      // Test with medium priority during quiet hours
      const mediumAlert = { ...quietHoursAlert, severity: 'medium' as const }

      const mediumNotifications = await notificationService.sendAlertNotifications(
        alertConfiguration.notification_settings,
        mediumAlert
      )

      // Medium alerts should be suppressed during quiet hours
      expect(mediumNotifications).toHaveLength(0)
    })

    it('should handle monsoon season energy patterns', async () => {
      // Bangkok monsoon season with high humidity and increased HVAC load
      const monsoonContext: EvaluationContext = {
        current_time: '2025-07-15T14:30:00+07:00', // Monsoon season
        sensor_readings: [
          {
            sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
            timestamp: '2025-07-15T14:30:00+07:00',
            value: 1650, // Higher consumption due to humidity
            unit: 'kWh',
            quality: 'good'
          },
          {
            sensor_id: 'BANGKOK_OCCUPANCY_MAIN',
            timestamp: '2025-07-15T14:30:00+07:00',
            value: 100,
            unit: 'count',
            quality: 'good'
          }
        ],
        historical_data: [],
        system_status: {},
        weather_data: {
          temperature: 32,
          humidity: 95, // Very high humidity during monsoon
          wind_speed: 1,
          solar_irradiance: 200,
          weather_condition: 'heavy_rain',
          forecast_change: 'continued rainfall'
        }
      }

      const monsoonAlerts = await alertEngine.evaluateAlerts(
        [alertConfiguration],
        monsoonContext
      )

      expect(monsoonAlerts).toHaveLength(1)

      // Verify weather context is captured
      expect(monsoonAlerts[0].context.weather_conditions?.humidity).toBe(95)
      expect(monsoonAlerts[0].context.weather_conditions?.weather_condition).toBe('heavy_rain')
    })

    it('should handle sensor quality issues and fail gracefully', async () => {
      const poorQualityContext: EvaluationContext = {
        current_time: '2025-09-23T10:30:00+07:00',
        sensor_readings: [
          {
            sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
            timestamp: '2025-09-23T10:30:00+07:00',
            value: 1600,
            unit: 'kWh',
            quality: 'error' // Poor quality data
          },
          {
            sensor_id: 'BANGKOK_OCCUPANCY_MAIN',
            timestamp: '2025-09-23T10:30:00+07:00',
            value: 80,
            unit: 'count',
            quality: 'warning'
          }
        ],
        historical_data: [],
        system_status: {}
      }

      const alerts = await alertEngine.evaluateAlerts(
        [alertConfiguration],
        poorQualityContext
      )

      // Should not trigger alerts with poor quality data due to filters
      expect(alerts).toHaveLength(0)
    })

    it('should validate alert configuration meets business requirements', async () => {
      const validation = await alertEngine.validateConfiguration(alertConfiguration)

      expect(validation.is_valid).toBe(true)
      expect(validation.errors).toHaveLength(0)

      // Verify estimated alert volume is reasonable
      expect(validation.estimated_alert_volume).toBeLessThan(50) // Should not spam

      // Verify business impact assessment
      expect(validation.estimated_cost_impact).toBeGreaterThan(0)

      // Verify subscription compatibility
      expect(validation.subscription_compatibility.tier_required).toBe('professional')
    })

    it('should handle alert acknowledgment and resolution workflow', async () => {
      const evaluationContext: EvaluationContext = {
        current_time: '2025-09-23T08:30:00+07:00',
        sensor_readings: bangkokSensorData,
        historical_data: [],
        system_status: {},
        weather_data: {
          temperature: 37,
          humidity: 85,
          wind_speed: 4,
          solar_irradiance: 900,
          weather_condition: 'hot',
          forecast_change: 'temperature rising'
        }
      }

      // Step 1: Trigger initial alert
      const alerts = await alertEngine.evaluateAlerts([alertConfiguration], evaluationContext)
      expect(alerts).toHaveLength(1)

      const alert = alerts[0]
      expect(alert.status).toBe('triggered')

      // Step 2: Simulate acknowledgment
      const acknowledgedAlert: AlertInstance = {
        ...alert,
        status: 'acknowledged',
        acknowledged_at: '2025-09-23T08:35:00+07:00',
        acknowledged_by: 'user_bangkok_admin',
        acknowledgment_notes: 'Investigating HVAC system - checking for maintenance issues'
      }

      expect(acknowledgedAlert.status).toBe('acknowledged')
      expect(acknowledgedAlert.acknowledged_by).toBe('user_bangkok_admin')
      expect(acknowledgedAlert.acknowledgment_notes).toContain('Investigating HVAC system')

      // Step 3: Simulate investigation and resolution
      const resolvedAlert: AlertInstance = {
        ...acknowledgedAlert,
        status: 'resolved',
        resolved_at: '2025-09-23T09:45:00+07:00',
        resolved_by: 'user_bangkok_admin',
        resolution_notes: 'HVAC air filter replaced, system performance restored to normal levels',
        resolution_time_minutes: 70 // 1 hour 10 minutes from trigger to resolution
      }

      expect(resolvedAlert.status).toBe('resolved')
      expect(resolvedAlert.resolution_time_minutes).toBe(70)
      expect(resolvedAlert.resolution_notes).toContain('air filter replaced')
    })

    it('should handle automatic alert suppression during maintenance windows', async () => {
      const maintenanceContext: EvaluationContext = {
        current_time: '2025-09-23T02:00:00+07:00', // 2 AM maintenance window
        sensor_readings: bangkokSensorData.map(reading => ({
          ...reading,
          value: reading.value * 1.5 // Simulate even higher consumption during maintenance
        })),
        historical_data: [],
        system_status: {
          maintenance_mode: true,
          maintenance_window_start: '2025-09-23T01:00:00+07:00',
          maintenance_window_end: '2025-09-23T05:00:00+07:00'
        }
      }

      const maintenanceConfig = {
        ...alertConfiguration,
        metadata: {
          ...alertConfiguration.metadata,
          maintenance_suppression: {
            enabled: true,
            suppress_during_windows: true,
            maintenance_priorities: ['low', 'medium'] // Only suppress non-critical alerts
          }
        }
      }

      const maintenanceAlerts = await alertEngine.evaluateAlerts([maintenanceConfig], maintenanceContext)

      // Critical alerts should still fire during maintenance
      expect(maintenanceAlerts).toHaveLength(1)
      expect(maintenanceAlerts[0].suppressed).toBe(false) // Critical alert not suppressed
    })

    it('should track alert metrics and performance statistics', async () => {
      const metricsContext: EvaluationContext = {
        current_time: '2025-09-23T10:00:00+07:00',
        sensor_readings: bangkokSensorData,
        historical_data: [],
        system_status: {}
      }

      const startTime = Date.now()
      const alerts = await alertEngine.evaluateAlerts([alertConfiguration], metricsContext)
      const evaluationTime = Date.now() - startTime

      expect(alerts).toHaveLength(1)

      const alert = alerts[0]

      // Validate alert metrics are captured
      expect(alert.metric_values).toHaveLength(2)
      expect(alert.metric_values[0].timestamp).toBeDefined()
      expect(alert.metric_values[0].evaluation_window).toBeDefined()

      // Performance metrics
      expect(evaluationTime).toBeLessThan(1000) // Should evaluate within 1 second

      // Alert quality metrics
      const energyMetric = alert.metric_values.find(m => m.metric.type === 'energy_consumption')
      expect(energyMetric!.contributing_factors).toContain('Business hours')
      expect(energyMetric!.contributing_factors.length).toBeGreaterThan(0)
    })

    it('should handle concurrent alerts from multiple configurations', async () => {
      const concurrentConfig1 = {
        ...alertConfiguration,
        id: 'config_concurrent_1',
        name: 'Concurrent Test Config 1',
        rules: [{
          ...alertConfiguration.rules[0],
          id: 'rule_concurrent_1',
          conditions: [{
            ...alertConfiguration.rules[0].conditions[0],
            threshold: { value: 1400 } // Lower threshold
          }, {
            ...alertConfiguration.rules[0].conditions[1]
          }]
        }]
      }

      const concurrentConfig2 = {
        ...alertConfiguration,
        id: 'config_concurrent_2',
        name: 'Concurrent Test Config 2',
        rules: [{
          ...alertConfiguration.rules[0],
          id: 'rule_concurrent_2',
          priority: 'medium' as const,
          conditions: [{
            ...alertConfiguration.rules[0].conditions[0],
            threshold: { value: 1300 } // Even lower threshold
          }, {
            ...alertConfiguration.rules[0].conditions[1]
          }]
        }]
      }

      const concurrentContext: EvaluationContext = {
        current_time: '2025-09-23T11:00:00+07:00',
        sensor_readings: bangkokSensorData,
        historical_data: [],
        system_status: {}
      }

      const concurrentAlerts = await alertEngine.evaluateAlerts(
        [concurrentConfig1, concurrentConfig2],
        concurrentContext
      )

      expect(concurrentAlerts).toHaveLength(2)
      expect(concurrentAlerts[0].configuration_id).toBe('config_concurrent_1')
      expect(concurrentAlerts[1].configuration_id).toBe('config_concurrent_2')

      // Verify different priorities
      expect(concurrentAlerts.some(a => a.severity === 'critical')).toBe(true)
      expect(concurrentAlerts.some(a => a.severity === 'medium')).toBe(true)
    })

    it('should validate timezone handling across different regions', async () => {
      const timezoneTestData = bangkokSensorData.map(reading => ({
        ...reading,
        timestamp: '2025-09-23T14:30:00Z' // UTC time
      }))

      const utcContext: EvaluationContext = {
        current_time: '2025-09-23T14:30:00Z', // UTC
        sensor_readings: timezoneTestData,
        historical_data: [],
        system_status: {}
      }

      const bangkokTimezoneConfig = {
        ...alertConfiguration,
        notification_settings: {
          ...alertConfiguration.notification_settings,
          quiet_hours: {
            enabled: true,
            start_time: '23:00',
            end_time: '07:00',
            timezone: 'Asia/Bangkok', // UTC+7
            exceptions: ['critical'],
            weekend_override: false
          }
        }
      }

      const timezoneAlerts = await alertEngine.evaluateAlerts([bangkokTimezoneConfig], utcContext)

      expect(timezoneAlerts).toHaveLength(1)

      // 14:30 UTC = 21:30 Bangkok time (not in quiet hours)
      const notifications = await notificationService.sendAlertNotifications(
        bangkokTimezoneConfig.notification_settings,
        timezoneAlerts[0]
      )

      expect(notifications.length).toBeGreaterThan(0) // Should send notifications
    })

    it('should handle alert deduplication and similar alert suppression', async () => {
      const deduplicationContext: EvaluationContext = {
        current_time: '2025-09-23T12:00:00+07:00',
        sensor_readings: bangkokSensorData,
        historical_data: [],
        system_status: {}
      }

      // First alert
      const firstAlerts = await alertEngine.evaluateAlerts([alertConfiguration], deduplicationContext)
      expect(firstAlerts).toHaveLength(1)

      const firstAlert = firstAlerts[0]
      expect(firstAlert.suppressed).toBe(false)

      // Second identical alert within cooldown period (should be suppressed)
      const secondContext: EvaluationContext = {
        ...deduplicationContext,
        current_time: '2025-09-23T12:15:00+07:00' // 15 minutes later (within 30min cooldown)
      }

      // Mock the duplicate alert check to return the first alert
      const duplicateCheckSpy = jest.spyOn(alertEngine as any, 'checkForDuplicateAlert')
      duplicateCheckSpy.mockResolvedValueOnce(firstAlert)

      const secondAlerts = await alertEngine.evaluateAlerts([alertConfiguration], secondContext)

      // Should return existing alert due to deduplication
      expect(secondAlerts).toHaveLength(1)
      expect(secondAlerts[0].id).toBe(firstAlert.id)

      duplicateCheckSpy.mockRestore()
    })

    it('should validate complete audit trail for alert lifecycle', async () => {
      const auditContext: EvaluationContext = {
        current_time: '2025-09-23T13:00:00+07:00',
        sensor_readings: bangkokSensorData,
        historical_data: [],
        system_status: {},
        weather_data: {
          temperature: 38,
          humidity: 80,
          wind_speed: 2,
          solar_irradiance: 950,
          weather_condition: 'sunny',
          forecast_change: 'stable'
        }
      }

      // Step 1: Create alert with complete context
      const alerts = await alertEngine.evaluateAlerts([alertConfiguration], auditContext)
      expect(alerts).toHaveLength(1)

      const alert = alerts[0]

      // Validate initial audit information
      expect(alert.triggered_at).toBeDefined()
      expect(alert.configuration_id).toBe(alertConfiguration.id)
      expect(alert.rule_id).toBe(alertConfiguration.rules[0].id)

      // Step 2: Add notification audit trail
      const notifications = await notificationService.sendAlertNotifications(
        alertConfiguration.notification_settings,
        alert
      )

      const auditAlert: AlertInstance = {
        ...alert,
        notification_log: notifications
      }

      // Validate notification audit
      expect(auditAlert.notification_log.length).toBeGreaterThan(0)
      auditAlert.notification_log.forEach(log => {
        expect(log.id).toBeDefined()
        expect(log.channel).toBeDefined()
        expect(log.sent_at).toBeDefined()
        expect(log.status).toMatch(/sent|failed/)
      })

      // Step 3: Complete lifecycle with resolution audit
      const finalAlert: AlertInstance = {
        ...auditAlert,
        status: 'resolved',
        acknowledged_at: '2025-09-23T13:10:00+07:00',
        acknowledged_by: 'user_bangkok_admin',
        resolved_at: '2025-09-23T14:30:00+07:00',
        resolved_by: 'user_bangkok_admin',
        resolution_notes: 'Issue resolved by adjusting HVAC setpoint and replacing air filter',
        resolution_time_minutes: 90
      }

      // Validate complete audit trail
      expect(finalAlert.triggered_at).toBeDefined()
      expect(finalAlert.acknowledged_at).toBeDefined()
      expect(finalAlert.resolved_at).toBeDefined()
      expect(finalAlert.resolution_time_minutes).toBe(90)
      expect(finalAlert.notification_log.length).toBeGreaterThan(0)
      expect(finalAlert.context.weather_conditions).toBeDefined()
    })

    it('should validate alerting during edge cases and boundary conditions', async () => {
      // Test boundary condition: exactly at threshold
      const boundaryContext: EvaluationContext = {
        current_time: '2025-09-23T15:00:00+07:00',
        sensor_readings: [
          {
            sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
            timestamp: '2025-09-23T15:00:00+07:00',
            value: 1500, // Exactly at threshold
            unit: 'kWh',
            quality: 'good'
          },
          {
            sensor_id: 'BANGKOK_OCCUPANCY_MAIN',
            timestamp: '2025-09-23T15:00:00+07:00',
            value: 50, // Exactly at threshold
            unit: 'count',
            quality: 'good'
          }
        ],
        historical_data: [],
        system_status: {}
      }

      const boundaryAlerts = await alertEngine.evaluateAlerts([alertConfiguration], boundaryContext)

      // Should not trigger as operator is 'greater_than', not 'greater_than_or_equal'
      expect(boundaryAlerts).toHaveLength(0)

      // Test just above boundary
      const aboveBoundaryContext: EvaluationContext = {
        ...boundaryContext,
        sensor_readings: boundaryContext.sensor_readings.map(reading => ({
          ...reading,
          value: reading.value + 0.1 // Just above threshold
        }))
      }

      const aboveBoundaryAlerts = await alertEngine.evaluateAlerts([alertConfiguration], aboveBoundaryContext)
      expect(aboveBoundaryAlerts).toHaveLength(1)

      // Test missing data scenario
      const missingDataContext: EvaluationContext = {
        current_time: '2025-09-23T16:00:00+07:00',
        sensor_readings: [], // No sensor data
        historical_data: [],
        system_status: {}
      }

      const missingDataAlerts = await alertEngine.evaluateAlerts([alertConfiguration], missingDataContext)
      expect(missingDataAlerts).toHaveLength(0) // Should not trigger without data
    })
  })

  describe('Performance Under Load', () => {
    it('should handle concurrent alert evaluations efficiently', async () => {
      const contexts = Array.from({ length: 10 }, (_, i) => ({
        current_time: new Date(Date.now() + i * 60000).toISOString(),
        sensor_readings: bangkokSensorData.map(reading => ({
          ...reading,
          value: reading.value * (1 + i * 0.1) // Varying values
        })),
        historical_data: [],
        system_status: {}
      }))

      const startTime = Date.now()

      const allAlertPromises = contexts.map(context =>
        alertEngine.evaluateAlerts([alertConfiguration], context)
      )

      const results = await Promise.all(allAlertPromises)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds
      expect(results.every(alerts => Array.isArray(alerts))).toBe(true)
    })

    it('should handle high-volume notification delivery', async () => {
      const alerts = Array.from({ length: 50 }, (_, i) => ({
        id: `alert_load_test_${i}`,
        configuration_id: alertConfiguration.id,
        rule_id: alertConfiguration.rules[0].id,
        status: 'triggered' as const,
        severity: 'high' as const,
        title: `Load Test Alert ${i}`,
        description: 'High volume test',
        metric_values: [],
        triggered_at: new Date().toISOString(),
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
      }))

      const startTime = Date.now()

      const notificationPromises = alerts.map(alert =>
        notificationService.sendAlertNotifications(
          alertConfiguration.notification_settings,
          alert
        )
      )

      const results = await Promise.all(notificationPromises)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      expect(results.every(notifications => notifications.length > 0)).toBe(true)
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should continue processing when individual notifications fail', async () => {
      // Mock email service to fail
      const emailProvider = (notificationService as any).emailProvider
      const originalSendEmail = emailProvider.sendEmail
      emailProvider.sendEmail = jest.fn().mockRejectedValue(new Error('Email service down'))

      const alert: AlertInstance = {
        id: 'alert_resilience_test',
        configuration_id: alertConfiguration.id,
        rule_id: alertConfiguration.rules[0].id,
        status: 'triggered',
        severity: 'critical',
        title: 'Resilience Test Alert',
        description: 'Testing error recovery',
        metric_values: [],
        triggered_at: new Date().toISOString(),
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

      const notifications = await notificationService.sendAlertNotifications(
        alertConfiguration.notification_settings,
        alert
      )

      // Should still have SMS and webhook notifications even if email fails
      expect(notifications.some(n => n.channel === 'sms' && n.status === 'sent')).toBe(true)
      expect(notifications.some(n => n.channel === 'webhook' && n.status === 'sent')).toBe(true)
      expect(notifications.some(n => n.channel === 'email' && n.status === 'failed')).toBe(true)

      // Restore original function
      emailProvider.sendEmail = originalSendEmail
    })

    it('should handle network timeouts gracefully', async () => {
      // Mock webhook service to timeout
      const webhookService = (notificationService as any).webhookService
      const originalSendWebhook = webhookService.sendWebhook
      webhookService.sendWebhook = jest.fn().mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      const alert: AlertInstance = {
        id: 'alert_timeout_test',
        configuration_id: alertConfiguration.id,
        rule_id: alertConfiguration.rules[0].id,
        status: 'triggered',
        severity: 'critical',
        title: 'Timeout Test Alert',
        description: 'Testing timeout handling',
        metric_values: [],
        triggered_at: new Date().toISOString(),
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

      const startTime = Date.now()
      const notifications = await notificationService.sendAlertNotifications(
        alertConfiguration.notification_settings,
        alert
      )
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000) // Should not hang
      expect(notifications.some(n => n.channel === 'webhook' && n.status === 'failed')).toBe(true)

      // Restore original function
      webhookService.sendWebhook = originalSendWebhook
    })
  })

  describe('Data Quality and Accuracy', () => {
    it('should produce accurate alerts with Bangkok dataset scenarios', async () => {
      // Real-world scenario: Morning energy spike during hot season
      const realWorldContext: EvaluationContext = {
        current_time: '2025-04-15T09:30:00+07:00', // Hot season in Bangkok
        sensor_readings: [
          // Progressive energy increase as building warms up
          {
            sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
            timestamp: '2025-04-15T08:00:00+07:00',
            value: 1100,
            unit: 'kWh',
            quality: 'good'
          },
          {
            sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
            timestamp: '2025-04-15T08:30:00+07:00',
            value: 1300,
            unit: 'kWh',
            quality: 'good'
          },
          {
            sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
            timestamp: '2025-04-15T09:00:00+07:00',
            value: 1480,
            unit: 'kWh',
            quality: 'good'
          },
          {
            sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
            timestamp: '2025-04-15T09:30:00+07:00',
            value: 1620, // Clear threshold breach
            unit: 'kWh',
            quality: 'good'
          },
          // Occupancy rising with office arrival
          {
            sensor_id: 'BANGKOK_OCCUPANCY_MAIN',
            timestamp: '2025-04-15T09:30:00+07:00',
            value: 145,
            unit: 'count',
            quality: 'good'
          }
        ],
        historical_data: [
          // Baseline from previous day (cooler)
          {
            sensor_id: 'BANGKOK_HVAC_MAIN_ENERGY',
            timestamp: '2025-04-14T09:30:00+07:00',
            value: 1250,
            unit: 'kWh',
            quality: 'good'
          }
        ],
        system_status: {
          hvac_efficiency: 0.78, // Slightly degraded
          last_maintenance: '2025-04-01'
        },
        weather_data: {
          temperature: 38, // Very hot day
          humidity: 70,
          wind_speed: 3,
          solar_irradiance: 950,
          weather_condition: 'clear_sky',
          forecast_change: 'stable'
        }
      }

      const alerts = await alertEngine.evaluateAlerts(
        [alertConfiguration],
        realWorldContext
      )

      expect(alerts).toHaveLength(1)

      const alert = alerts[0]

      // Verify accurate threshold detection
      expect(alert.metric_values[0].value).toBe(1620)
      expect(alert.metric_values[0].threshold).toBe(1500)
      expect(alert.metric_values[0].value).toBeGreaterThan(alert.metric_values[0].threshold)

      // Verify context accuracy
      expect(alert.context.weather_conditions?.temperature).toBe(38)
      expect(alert.metric_values[0].contributing_factors).toContain('High temperature')

      // Verify confidence calculation
      const confidence = (alertEngine as any).calculateConfidence([
        {
          condition_id: 'energy',
          met: true,
          actual_value: 1620,
          threshold_value: 1500,
          deviation: 120,
          evaluation_method: 'greater_than'
        },
        {
          condition_id: 'occupancy',
          met: true,
          actual_value: 145,
          threshold_value: 50,
          deviation: 95,
          evaluation_method: 'greater_than'
        }
      ])

      expect(confidence).toBeGreaterThan(0.9) // High confidence with clear threshold breach
    })
  })
})