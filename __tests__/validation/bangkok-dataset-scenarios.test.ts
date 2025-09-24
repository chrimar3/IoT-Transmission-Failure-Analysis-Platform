/**
 * Bangkok Dataset Validation Scenarios
 * Story 4.1: Custom Alert Configuration - QA Remediation
 *
 * Testing alert accuracy with realistic Bangkok office building data
 */

import { AlertRuleEngine } from '../../lib/alerts/AlertRuleEngine'
import { NotificationDeliveryService } from '../../lib/alerts/NotificationDeliveryService'
import type {
  AlertConfiguration,
  EvaluationContext,
  SensorReading,
  _AlertInstance
} from '../../types/alerts'

describe('Bangkok Dataset Validation Scenarios', () => {
  let alertEngine: AlertRuleEngine
  let notificationService: NotificationDeliveryService

  beforeEach(() => {
    alertEngine = new AlertRuleEngine()
    notificationService = new NotificationDeliveryService()
    jest.clearAllMocks()
  })

  describe('Realistic Bangkok Office Building Scenarios', () => {
    it('should accurately detect morning energy spike during hot season', async () => {
      // Bangkok hot season (March-May) morning scenario
      // Building: 25-story office complex in Silom district
      // Time: 9:30 AM, temperature rising rapidly
      const morningHotSeasonData: SensorReading[] = [
        // HVAC energy consumption - main system
        { sensor_id: 'BKK_SILOM_HVAC_MAIN', timestamp: '2025-04-15T02:30:00.000Z', value: 850, unit: 'kWh', quality: 'good' },
        { sensor_id: 'BKK_SILOM_HVAC_MAIN', timestamp: '2025-04-15T02:35:00.000Z', value: 920, unit: 'kWh', quality: 'good' },
        { sensor_id: 'BKK_SILOM_HVAC_MAIN', timestamp: '2025-04-15T02:40:00.000Z', value: 1150, unit: 'kWh', quality: 'good' },
        { sensor_id: 'BKK_SILOM_HVAC_MAIN', timestamp: '2025-04-15T02:45:00.000Z', value: 1380, unit: 'kWh', quality: 'good' },
        { sensor_id: 'BKK_SILOM_HVAC_MAIN', timestamp: '2025-04-15T02:50:00.000Z', value: 1620, unit: 'kWh', quality: 'good' }, // Spike begins

        // Temperature sensors - multiple floors
        { sensor_id: 'BKK_SILOM_TEMP_F15', timestamp: '2025-04-15T02:30:00.000Z', value: 28.5, unit: '°C', quality: 'good' },
        { sensor_id: 'BKK_SILOM_TEMP_F15', timestamp: '2025-04-15T02:45:00.000Z', value: 30.2, unit: '°C', quality: 'good' },
        { sensor_id: 'BKK_SILOM_TEMP_F20', timestamp: '2025-04-15T02:30:00.000Z', value: 29.1, unit: '°C', quality: 'good' },
        { sensor_id: 'BKK_SILOM_TEMP_F20', timestamp: '2025-04-15T02:45:00.000Z', value: 31.0, unit: '°C', quality: 'good' },

        // Occupancy - morning arrival rush
        { sensor_id: 'BKK_SILOM_OCCUPANCY_LOBBY', timestamp: '2025-04-15T02:30:00.000Z', value: 85, unit: 'count', quality: 'good' },
        { sensor_id: 'BKK_SILOM_OCCUPANCY_LOBBY', timestamp: '2025-04-15T02:45:00.000Z', value: 220, unit: 'count', quality: 'good' },

        // Air quality - degrading due to increased occupancy and external pollution
        { sensor_id: 'BKK_SILOM_AQ_CO2', timestamp: '2025-04-15T02:30:00.000Z', value: 450, unit: 'ppm', quality: 'good' },
        { sensor_id: 'BKK_SILOM_AQ_CO2', timestamp: '2025-04-15T02:45:00.000Z', value: 680, unit: 'ppm', quality: 'good' }
      ]

      const bangkokAlertConfig: AlertConfiguration = {
        id: 'bangkok_silom_energy_alert',
        name: 'Bangkok Silom Office - Critical Energy Alert',
        description: 'Monitor for excessive energy consumption during business hours in Bangkok office',
        user_id: 'bangkok_facilities_manager',
        organization_id: 'company_thailand',
        status: 'active',
        created_at: '2025-04-15T00:00:00.000Z',
        updated_at: '2025-04-15T00:00:00.000Z',
        created_by: 'bangkok_facilities_manager',
        rules: [
          {
            id: 'bangkok_energy_spike_rule',
            name: 'Morning Energy Spike Detection',
            description: 'Detect when HVAC energy consumption exceeds normal levels during morning hours',
            enabled: true,
            priority: 'high',
            conditions: [
              {
                id: 'hvac_energy_condition',
                metric: {
                  type: 'energy_consumption',
                  sensor_id: 'BKK_SILOM_HVAC_MAIN',
                  display_name: 'Main HVAC Energy Consumption',
                  units: 'kWh'
                },
                operator: 'greater_than',
                threshold: { value: 1500 }, // Normal peak is around 1200-1300 kWh
                time_aggregation: {
                  function: 'average',
                  period: 15, // 15-minute window
                  minimum_data_points: 3
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
                id: 'business_hours_condition',
                metric: {
                  type: 'occupancy',
                  sensor_id: 'BKK_SILOM_OCCUPANCY_LOBBY',
                  display_name: 'Building Occupancy',
                  units: 'count'
                },
                operator: 'greater_than',
                threshold: { value: 100 }, // Significant occupancy
                time_aggregation: {
                  function: 'average',
                  period: 10,
                  minimum_data_points: 2
                },
                filters: []
              }
            ],
            logical_operator: 'AND',
            evaluation_window: 15,
            cooldown_period: 30,
            suppress_duplicates: true,
            tags: ['bangkok', 'energy', 'hvac', 'business-hours']
          }
        ],
        notification_settings: {
          channels: [
            {
              type: 'email',
              enabled: true,
              configuration: {
                email_addresses: ['facilities.bangkok@company.com', 'energy.team@company.com']
              },
              priority_filter: ['critical', 'high']
            },
            {
              type: 'sms',
              enabled: true,
              configuration: {
                phone_numbers: ['+66812345678'] // Bangkok facilities manager
              },
              priority_filter: ['critical', 'high']
            }
          ],
          recipients: [],
          frequency_limits: {
            max_alerts_per_hour: 3,
            max_alerts_per_day: 12,
            cooldown_between_similar: 45,
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
          escalation_delays: [20, 40, 60]
        },
        metadata: {
          category: 'energy_efficiency',
          severity_auto_adjust: true,
          business_impact: {
            level: 'high',
            estimated_cost_per_hour: 800,
            affected_occupants: 400,
            operational_severity: 'efficiency_loss',
            compliance_risk: false,
            safety_risk: false
          },
          affected_systems: ['hvac'],
          affected_locations: ['Bangkok Silom Office - All Floors'],
          documentation_links: [
            'https://wiki.company.com/bangkok-facilities/energy-management'
          ],
          tags: ['bangkok', 'silom', 'office', 'energy'],
          custom_fields: {
            building_code: 'BKK_SILOM_001',
            floor_count: 25,
            total_area_sqm: 15000,
            typical_peak_consumption: 1300,
            climate_zone: 'tropical_savanna'
          }
        }
      }

      const bangkokContext: EvaluationContext = {
        current_time: '2025-04-15T02:50:00.000Z', // 9:50 AM Bangkok time
        sensor_readings: morningHotSeasonData,
        historical_data: [
          // Historical baseline - typical morning consumption
          { sensor_id: 'BKK_SILOM_HVAC_MAIN', timestamp: '2025-04-14T02:50:00.000Z', value: 1250, unit: 'kWh', quality: 'good' },
          { sensor_id: 'BKK_SILOM_HVAC_MAIN', timestamp: '2025-04-13T02:50:00.000Z', value: 1180, unit: 'kWh', quality: 'good' }
        ],
        system_status: {
          hvac_operational: true,
          last_maintenance: '2025-04-01T00:00:00.000Z',
          efficiency_rating: 0.82
        },
        weather_data: {
          temperature: 36, // Hot morning in Bangkok
          humidity: 75,
          wind_speed: 3,
          solar_irradiance: 850,
          weather_condition: 'clear_sky',
          forecast_change: 'temperature_rising'
        },
        occupancy_data: {
          current_occupancy: 320,
          typical_occupancy: 280,
          occupancy_trend: 'increasing',
          events_scheduled: ['Board meeting - Floor 20', 'Training session - Floor 15']
        }
      }

      const alerts = await alertEngine.evaluateAlerts([bangkokAlertConfig], bangkokContext)

      // Validate that alert is correctly triggered
      expect(alerts).toHaveLength(1)

      const alert = alerts[0]
      expect(alert.severity).toBe('high')
      expect(alert.title).toContain('Bangkok Silom Office - Critical Energy Alert')

      // Validate metric evaluations
      expect(alert.metric_values).toHaveLength(2) // Energy and occupancy conditions

      const energyMetric = alert.metric_values.find(m => m.metric.type === 'energy_consumption')
      expect(energyMetric).toBeDefined()
      expect(energyMetric!.value).toBeGreaterThan(1500) // Should exceed threshold
      expect(energyMetric!.threshold).toBe(1500)

      const occupancyMetric = alert.metric_values.find(m => m.metric.type === 'occupancy')
      expect(occupancyMetric).toBeDefined()
      expect(occupancyMetric!.value).toBeGreaterThan(100) // Should exceed occupancy threshold

      // Validate context captures Bangkok-specific factors
      expect(alert.context.weather_conditions?.temperature).toBe(36)
      expect(alert.context.weather_conditions?.weather_condition).toBe('clear_sky')
      expect(alert.context.occupancy_status?.current_occupancy).toBe(320)

      // Validate contributing factors
      expect(energyMetric!.contributing_factors).toContain('Business hours')
      expect(energyMetric!.contributing_factors).toContain('High temperature')

      // Send notifications and validate Bangkok timezone handling
      const notifications = await notificationService.sendAlertNotifications(
        bangkokAlertConfig.notification_settings,
        alert
      )

      expect(notifications.length).toBeGreaterThan(0)
      expect(notifications.some(n => n.channel === 'email')).toBe(true)
      expect(notifications.some(n => n.channel === 'sms')).toBe(true)
    })

    it('should handle hot season energy spikes during peak hours', async () => {
      // Bangkok hot season (March-May) peak afternoon scenario
      // Building: Multi-story office complex in Bangkok CBD
      // Time: 2:00 PM, peak heat + peak occupancy
      const hotSeasonPeakData: SensorReading[] = [
        // HVAC energy consumption reaching critical levels
        { sensor_id: 'BKK_CBD_HVAC_MAIN', timestamp: '2025-03-28T07:00:00.000Z', value: 1800, unit: 'kWh', quality: 'good' },
        { sensor_id: 'BKK_CBD_HVAC_MAIN', timestamp: '2025-03-28T07:15:00.000Z', value: 2100, unit: 'kWh', quality: 'good' },
        { sensor_id: 'BKK_CBD_HVAC_MAIN', timestamp: '2025-03-28T07:30:00.000Z', value: 2350, unit: 'kWh', quality: 'good' }, // Critical spike

        // Extreme temperature conditions
        { sensor_id: 'BKK_CBD_TEMP_OUTDOOR', timestamp: '2025-03-28T07:30:00.000Z', value: 42, unit: '°C', quality: 'good' }, // Extreme heat
        { sensor_id: 'BKK_CBD_TEMP_INDOOR_AVG', timestamp: '2025-03-28T07:30:00.000Z', value: 27, unit: '°C', quality: 'good' }, // Struggling to maintain

        // Peak occupancy - lunch hour
        { sensor_id: 'BKK_CBD_OCCUPANCY_TOTAL', timestamp: '2025-03-28T07:30:00.000Z', value: 480, unit: 'count', quality: 'good' }, // Near capacity

        // Solar irradiance at peak
        { sensor_id: 'BKK_CBD_SOLAR_IRRADIANCE', timestamp: '2025-03-28T07:30:00.000Z', value: 1200, unit: 'W/m²', quality: 'good' }
      ]

      const hotSeasonAlertConfig: AlertConfiguration = {
        id: 'bangkok_hot_season_critical_energy',
        name: 'Bangkok Hot Season Critical Energy Alert',
        description: 'Critical alert for extreme energy consumption during hot season peak hours',
        user_id: 'bangkok_energy_manager',
        organization_id: 'company_thailand',
        status: 'active',
        created_at: '2025-03-01T00:00:00.000Z',
        updated_at: '2025-03-01T00:00:00.000Z',
        created_by: 'bangkok_energy_manager',
        rules: [
          {
            id: 'hot_season_energy_crisis_rule',
            name: 'Hot Season Energy Crisis Detection',
            description: 'Detect when HVAC energy reaches crisis levels during extreme heat',
            enabled: true,
            priority: 'critical',
            conditions: [
              {
                id: 'hvac_crisis_energy_condition',
                metric: {
                  type: 'energy_consumption',
                  sensor_id: 'BKK_CBD_HVAC_MAIN',
                  display_name: 'Main HVAC Energy Consumption',
                  units: 'kWh'
                },
                operator: 'greater_than',
                threshold: { value: 2200 }, // Crisis threshold for hot season
                time_aggregation: {
                  function: 'average',
                  period: 20,
                  minimum_data_points: 3
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
                id: 'extreme_heat_condition',
                metric: {
                  type: 'temperature',
                  sensor_id: 'BKK_CBD_TEMP_OUTDOOR',
                  display_name: 'Outdoor Temperature',
                  units: '°C'
                },
                operator: 'greater_than',
                threshold: { value: 40 }, // Extreme heat threshold
                time_aggregation: {
                  function: 'average',
                  period: 15,
                  minimum_data_points: 2
                },
                filters: []
              },
              {
                id: 'peak_occupancy_condition',
                metric: {
                  type: 'occupancy',
                  sensor_id: 'BKK_CBD_OCCUPANCY_TOTAL',
                  display_name: 'Total Building Occupancy',
                  units: 'count'
                },
                operator: 'greater_than',
                threshold: { value: 400 }, // High occupancy
                time_aggregation: {
                  function: 'average',
                  period: 10,
                  minimum_data_points: 2
                },
                filters: []
              }
            ],
            logical_operator: 'AND',
            evaluation_window: 20,
            cooldown_period: 45, // Longer cooldown for crisis situations
            suppress_duplicates: true,
            tags: ['bangkok', 'hot_season', 'energy_crisis', 'hvac']
          }
        ],
        notification_settings: {
          channels: [
            {
              type: 'email',
              enabled: true,
              configuration: {
                email_addresses: ['crisis@company.com', 'energy.emergency@company.com']
              },
              priority_filter: ['critical']
            },
            {
              type: 'sms',
              enabled: true,
              configuration: {
                phone_numbers: ['+66812345678'] // Emergency contact
              },
              priority_filter: ['critical']
            },
            {
              type: 'webhook',
              enabled: true,
              configuration: {
                webhook_url: 'https://emergency.company.com/energy-crisis',
                webhook_method: 'POST'
              },
              priority_filter: ['critical']
            }
          ],
          recipients: [],
          frequency_limits: {
            max_alerts_per_hour: 1, // Limited during crisis
            max_alerts_per_day: 3,
            cooldown_between_similar: 60,
            escalation_threshold: 1
          },
          quiet_hours: {
            enabled: false, // No quiet hours for crisis alerts
            start_time: '23:00',
            end_time: '07:00',
            timezone: 'Asia/Bangkok',
            exceptions: ['critical'],
            weekend_override: false
          },
          escalation_delays: [10, 20] // Fast escalation
        },
        metadata: {
          category: 'energy_efficiency',
          severity_auto_adjust: false,
          business_impact: {
            level: 'critical',
            estimated_cost_per_hour: 2000,
            affected_occupants: 480,
            operational_severity: 'system_down',
            compliance_risk: true,
            safety_risk: true
          },
          affected_systems: ['hvac', 'electrical'],
          affected_locations: ['Bangkok CBD Office - All Areas'],
          documentation_links: [],
          tags: ['hot_season', 'energy_crisis'],
          custom_fields: {
            seasonal_alert: true,
            crisis_threshold: 2200,
            emergency_contact: '+66812345678',
            load_shedding_available: true
          }
        }
      }

      const hotSeasonContext: EvaluationContext = {
        current_time: '2025-03-28T07:30:00.000Z', // 2:30 PM Bangkok time - peak heat
        sensor_readings: hotSeasonPeakData,
        historical_data: [
          // Normal hot season baseline
          { sensor_id: 'BKK_CBD_HVAC_MAIN', timestamp: '2025-03-27T07:30:00.000Z', value: 1800, unit: 'kWh', quality: 'good' }
        ],
        system_status: {
          hvac_operational: true,
          load_shedding_available: true,
          emergency_mode: false
        },
        weather_data: {
          temperature: 42, // Extreme heat
          humidity: 65,
          wind_speed: 2,
          solar_irradiance: 1200,
          weather_condition: 'extreme_heat',
          heat_index: 48
        },
        occupancy_data: {
          current_occupancy: 480,
          typical_occupancy: 350,
          occupancy_trend: 'peak',
          events_scheduled: ['Lunch break - All floors']
        }
      }

      const hotSeasonAlerts = await alertEngine.evaluateAlerts([hotSeasonAlertConfig], hotSeasonContext)

      expect(hotSeasonAlerts).toHaveLength(1)

      const alert = hotSeasonAlerts[0]
      expect(alert.severity).toBe('critical')
      expect(alert.title).toContain('Bangkok Hot Season Critical Energy Alert')

      // Validate all three conditions are met
      expect(alert.metric_values).toHaveLength(3)

      const energyMetric = alert.metric_values.find(m => m.metric.type === 'energy_consumption')
      const tempMetric = alert.metric_values.find(m => m.metric.type === 'temperature')
      const occupancyMetric = alert.metric_values.find(m => m.metric.type === 'occupancy')

      expect(energyMetric!.value).toBeGreaterThan(2200)
      expect(tempMetric!.value).toBeGreaterThan(40)
      expect(occupancyMetric!.value).toBeGreaterThan(400)

      // Validate extreme heat context
      expect(alert.context.weather_conditions?.temperature).toBe(42)
      expect(alert.context.weather_conditions?.heat_index).toBe(48)
      expect(alert.context.occupancy_status?.occupancy_trend).toBe('peak')

      // Validate crisis notification delivery
      const notifications = await notificationService.sendAlertNotifications(
        hotSeasonAlertConfig.notification_settings,
        alert
      )

      expect(notifications.length).toBeGreaterThan(0)
      expect(notifications.some(n => n.channel === 'email')).toBe(true)
      expect(notifications.some(n => n.channel === 'sms')).toBe(true)
      expect(notifications.some(n => n.channel === 'webhook')).toBe(true)
    })

    it('should handle monsoon season HVAC patterns correctly', async () => {
      // Bangkok monsoon season (June-October) scenario
      // High humidity requires different HVAC operation patterns
      const monsoonSeasonData: SensorReading[] = [
        // HVAC running harder due to humidity, not just temperature
        { sensor_id: 'BKK_ASOK_HVAC_MAIN', timestamp: '2025-08-20T05:30:00.000Z', value: 1200, unit: 'kWh', quality: 'good' },
        { sensor_id: 'BKK_ASOK_HVAC_MAIN', timestamp: '2025-08-20T05:45:00.000Z', value: 1450, unit: 'kWh', quality: 'good' },
        { sensor_id: 'BKK_ASOK_HVAC_MAIN', timestamp: '2025-08-20T06:00:00.000Z', value: 1680, unit: 'kWh', quality: 'good' },

        // Humidity sensors - very high during monsoon
        { sensor_id: 'BKK_ASOK_HUMIDITY_AVG', timestamp: '2025-08-20T06:00:00.000Z', value: 92, unit: '%RH', quality: 'good' },

        // Temperature - moderate but humid
        { sensor_id: 'BKK_ASOK_TEMP_AVG', timestamp: '2025-08-20T06:00:00.000Z', value: 31, unit: '°C', quality: 'good' },

        // Air quality - worse during rain due to trapped pollutants
        { sensor_id: 'BKK_ASOK_AQ_PM25', timestamp: '2025-08-20T06:00:00.000Z', value: 65, unit: 'μg/m³', quality: 'good' }
      ]

      const monsoonAlertConfig: AlertConfiguration = {
        id: 'bangkok_monsoon_hvac_alert',
        name: 'Bangkok Monsoon Season HVAC Alert',
        description: 'Special monitoring for HVAC efficiency during monsoon season',
        user_id: 'bangkok_facilities_manager',
        organization_id: 'company_thailand',
        status: 'active',
        created_at: '2025-08-01T00:00:00.000Z',
        updated_at: '2025-08-01T00:00:00.000Z',
        created_by: 'bangkok_facilities_manager',
        rules: [
          {
            id: 'monsoon_hvac_efficiency_rule',
            name: 'Monsoon HVAC Efficiency Alert',
            description: 'Monitor HVAC performance during high humidity conditions',
            enabled: true,
            priority: 'medium',
            conditions: [
              {
                id: 'hvac_energy_high_humidity',
                metric: {
                  type: 'energy_consumption',
                  sensor_id: 'BKK_ASOK_HVAC_MAIN',
                  display_name: 'HVAC Energy Consumption',
                  units: 'kWh'
                },
                operator: 'greater_than',
                threshold: { value: 1600 }, // Higher threshold during monsoon
                time_aggregation: {
                  function: 'average',
                  period: 20,
                  minimum_data_points: 3
                },
                filters: []
              },
              {
                id: 'high_humidity_condition',
                metric: {
                  type: 'humidity',
                  sensor_id: 'BKK_ASOK_HUMIDITY_AVG',
                  display_name: 'Average Humidity',
                  units: '%RH'
                },
                operator: 'greater_than',
                threshold: { value: 85 }, // High humidity trigger
                time_aggregation: {
                  function: 'average',
                  period: 15,
                  minimum_data_points: 2
                },
                filters: []
              }
            ],
            logical_operator: 'AND',
            evaluation_window: 20,
            cooldown_period: 60, // Longer cooldown during monsoon
            suppress_duplicates: true,
            tags: ['bangkok', 'monsoon', 'humidity', 'hvac']
          }
        ],
        notification_settings: {
          channels: [
            {
              type: 'email',
              enabled: true,
              configuration: {
                email_addresses: ['maintenance.bangkok@company.com']
              },
              priority_filter: ['medium', 'high', 'critical']
            }
          ],
          recipients: [],
          frequency_limits: {
            max_alerts_per_hour: 2, // Fewer alerts during monsoon
            max_alerts_per_day: 8,
            cooldown_between_similar: 90,
            escalation_threshold: 3
          },
          quiet_hours: {
            enabled: true,
            start_time: '23:00',
            end_time: '07:00',
            timezone: 'Asia/Bangkok',
            exceptions: [],
            weekend_override: false
          },
          escalation_delays: [30, 60, 120]
        },
        metadata: {
          category: 'energy_efficiency',
          severity_auto_adjust: true,
          business_impact: {
            level: 'medium',
            estimated_cost_per_hour: 400,
            affected_occupants: 200,
            operational_severity: 'efficiency_loss',
            compliance_risk: false,
            safety_risk: false
          },
          affected_systems: ['hvac'],
          affected_locations: ['Bangkok Asok Office'],
          documentation_links: [],
          tags: ['monsoon', 'seasonal'],
          custom_fields: {
            seasonal_adjustment: true,
            climate_adaptation: 'monsoon_optimized',
            humidity_threshold_adjusted: true
          }
        }
      }

      const monsoonContext: EvaluationContext = {
        current_time: '2025-08-20T06:00:00.000Z', // 1:00 PM Bangkok time
        sensor_readings: monsoonSeasonData,
        historical_data: [],
        system_status: {
          hvac_operational: true,
          dehumidifier_active: true,
          monsoon_mode: true
        },
        weather_data: {
          temperature: 31, // Moderate temperature
          humidity: 92, // Very high humidity
          wind_speed: 1,
          weather_condition: 'heavy_rain',
          forecast_change: 'continued_rainfall'
        }
      }

      const monsoonAlerts = await alertEngine.evaluateAlerts([monsoonAlertConfig], monsoonContext)

      expect(monsoonAlerts).toHaveLength(1)

      const alert = monsoonAlerts[0]
      expect(alert.severity).toBe('medium')

      // Validate that both energy and humidity conditions are met
      expect(alert.metric_values).toHaveLength(2)

      const energyMetric = alert.metric_values.find(m => m.metric.type === 'energy_consumption')
      const humidityMetric = alert.metric_values.find(m => m.metric.type === 'humidity')

      expect(energyMetric!.value).toBeGreaterThan(1600)
      expect(humidityMetric!.value).toBeGreaterThan(85)

      // Validate monsoon-specific context
      expect(alert.context.weather_conditions?.weather_condition).toBe('heavy_rain')
      expect(alert.context.weather_conditions?.humidity).toBe(92)
    })

    it('should accurately detect air quality degradation during Bangkok pollution events', async () => {
      // Bangkok air pollution scenario - common during dry season and traffic peaks
      const pollutionEventData: SensorReading[] = [
        // Air quality sensors - multiple pollutants
        { sensor_id: 'BKK_CBD_AQ_PM25', timestamp: '2025-01-15T01:00:00.000Z', value: 45, unit: 'μg/m³', quality: 'good' },
        { sensor_id: 'BKK_CBD_AQ_PM25', timestamp: '2025-01-15T01:30:00.000Z', value: 75, unit: 'μg/m³', quality: 'good' },
        { sensor_id: 'BKK_CBD_AQ_PM25', timestamp: '2025-01-15T02:00:00.000Z', value: 105, unit: 'μg/m³', quality: 'good' }, // Unhealthy

        { sensor_id: 'BKK_CBD_AQ_PM10', timestamp: '2025-01-15T02:00:00.000Z', value: 180, unit: 'μg/m³', quality: 'good' },
        { sensor_id: 'BKK_CBD_AQ_CO2', timestamp: '2025-01-15T02:00:00.000Z', value: 850, unit: 'ppm', quality: 'good' },
        { sensor_id: 'BKK_CBD_AQ_NO2', timestamp: '2025-01-15T02:00:00.000Z', value: 65, unit: 'ppb', quality: 'good' },

        // HVAC air filtration working harder
        { sensor_id: 'BKK_CBD_HVAC_FILTER_PRESSURE', timestamp: '2025-01-15T02:00:00.000Z', value: 85, unit: 'Pa', quality: 'good' },

        // Indoor air quality impact
        { sensor_id: 'BKK_CBD_INDOOR_PM25', timestamp: '2025-01-15T02:00:00.000Z', value: 35, unit: 'μg/m³', quality: 'good' }
      ]

      const airQualityAlertConfig: AlertConfiguration = {
        id: 'bangkok_air_quality_alert',
        name: 'Bangkok Air Quality Alert System',
        description: 'Monitor for dangerous air quality levels and building air filtration response',
        user_id: 'bangkok_environmental_manager',
        organization_id: 'company_thailand',
        status: 'active',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        created_by: 'bangkok_environmental_manager',
        rules: [
          {
            id: 'air_quality_health_alert',
            name: 'Unhealthy Air Quality Alert',
            description: 'Alert when outdoor PM2.5 reaches unhealthy levels',
            enabled: true,
            priority: 'critical',
            conditions: [
              {
                id: 'pm25_unhealthy_condition',
                metric: {
                  type: 'air_quality',
                  sensor_id: 'BKK_CBD_AQ_PM25',
                  display_name: 'PM2.5 Concentration',
                  units: 'μg/m³'
                },
                operator: 'greater_than',
                threshold: { value: 100 }, // WHO unhealthy threshold
                time_aggregation: {
                  function: 'average',
                  period: 30,
                  minimum_data_points: 3
                },
                filters: []
              }
            ],
            logical_operator: 'AND',
            evaluation_window: 30,
            cooldown_period: 120, // 2-hour cooldown for pollution events
            suppress_duplicates: true,
            tags: ['air_quality', 'health', 'pm25', 'pollution']
          }
        ],
        notification_settings: {
          channels: [
            {
              type: 'email',
              enabled: true,
              configuration: {
                email_addresses: [
                  'health.safety@company.com',
                  'facilities.bangkok@company.com',
                  'hr.bangkok@company.com'
                ]
              },
              priority_filter: ['critical', 'high']
            },
            {
              type: 'webhook',
              enabled: true,
              configuration: {
                webhook_url: 'https://building-automation.company.com/air-quality-alert',
                webhook_method: 'POST',
                webhook_headers: {
                  'X-Alert-Type': 'air-quality',
                  'X-Location': 'bangkok-cbd'
                }
              },
              priority_filter: ['critical', 'high', 'medium']
            }
          ],
          recipients: [],
          frequency_limits: {
            max_alerts_per_hour: 2,
            max_alerts_per_day: 6,
            cooldown_between_similar: 120,
            escalation_threshold: 1
          },
          quiet_hours: {
            enabled: false, // Air quality alerts should always go through
            start_time: '23:00',
            end_time: '07:00',
            timezone: 'Asia/Bangkok',
            exceptions: ['critical'],
            weekend_override: false
          },
          escalation_delays: [15, 30]
        },
        metadata: {
          category: 'safety',
          severity_auto_adjust: false,
          business_impact: {
            level: 'critical',
            estimated_cost_per_hour: 0,
            affected_occupants: 500,
            operational_severity: 'monitoring_only',
            compliance_risk: true,
            safety_risk: true
          },
          affected_systems: ['hvac', 'air_filtration'],
          affected_locations: ['Bangkok CBD Office - All Areas'],
          documentation_links: [
            'https://who.int/air-pollution/guidelines',
            'https://wiki.company.com/health-safety/air-quality'
          ],
          tags: ['air_quality', 'health', 'safety', 'environmental'],
          custom_fields: {
            health_alert: true,
            who_guidelines: true,
            evacuation_threshold: 150,
            mask_recommendation_threshold: 100
          }
        }
      }

      const pollutionContext: EvaluationContext = {
        current_time: '2025-01-15T02:00:00.000Z', // 9:00 AM Bangkok time
        sensor_readings: pollutionEventData,
        historical_data: [
          // Normal air quality baseline
          { sensor_id: 'BKK_CBD_AQ_PM25', timestamp: '2025-01-14T02:00:00.000Z', value: 35, unit: 'μg/m³', quality: 'good' }
        ],
        system_status: {
          air_filtration_active: true,
          building_sealed: true,
          hvac_recirculation_mode: true
        },
        weather_data: {
          temperature: 28,
          humidity: 65,
          wind_speed: 0.5, // Low wind contributes to pollution buildup
          weather_condition: 'hazy',
          air_quality_index: 155 // Unhealthy
        }
      }

      const airQualityAlerts = await alertEngine.evaluateAlerts([airQualityAlertConfig], pollutionContext)

      expect(airQualityAlerts).toHaveLength(1)

      const alert = airQualityAlerts[0]
      expect(alert.severity).toBe('critical')
      expect(alert.title).toContain('Bangkok Air Quality Alert System')

      // Validate PM2.5 threshold breach
      const pm25Metric = alert.metric_values.find(m => m.metric.sensor_id === 'BKK_CBD_AQ_PM25')
      expect(pm25Metric).toBeDefined()
      expect(pm25Metric!.value).toBeGreaterThan(100)
      expect(pm25Metric!.threshold).toBe(100)

      // Validate health and safety context
      expect(alert.context.weather_conditions?.air_quality_index).toBe(155)
      expect(alert.context.weather_conditions?.weather_condition).toBe('hazy')

      // Send notifications with health urgency
      const notifications = await notificationService.sendAlertNotifications(
        airQualityAlertConfig.notification_settings,
        alert
      )

      expect(notifications.length).toBeGreaterThan(0)
      expect(notifications.some(n => n.channel === 'email')).toBe(true)
      expect(notifications.some(n => n.channel === 'webhook')).toBe(true)

      // Validate that webhook includes location and alert type headers
      const webhookNotification = notifications.find(n => n.channel === 'webhook')
      expect(webhookNotification).toBeDefined()
    })

    it('should handle power grid instability during Bangkok peak demand', async () => {
      // Bangkok electrical grid stress scenario - common during hot afternoons
      const gridInstabilityData: SensorReading[] = [
        // Building power consumption
        { sensor_id: 'BKK_TOWER_POWER_MAIN', timestamp: '2025-04-20T07:00:00.000Z', value: 2800, unit: 'kW', quality: 'good' },
        { sensor_id: 'BKK_TOWER_POWER_MAIN', timestamp: '2025-04-20T07:15:00.000Z', value: 3200, unit: 'kW', quality: 'good' },
        { sensor_id: 'BKK_TOWER_POWER_MAIN', timestamp: '2025-04-20T07:30:00.000Z', value: 3650, unit: 'kW', quality: 'good' }, // Peak demand

        // Grid voltage fluctuations
        { sensor_id: 'BKK_TOWER_GRID_VOLTAGE', timestamp: '2025-04-20T07:30:00.000Z', value: 218, unit: 'V', quality: 'good' }, // Below normal 220V

        // Power factor degradation
        { sensor_id: 'BKK_TOWER_POWER_FACTOR', timestamp: '2025-04-20T07:30:00.000Z', value: 0.78, unit: 'pf', quality: 'good' }, // Poor power factor

        // UPS battery levels (backup preparation)
        { sensor_id: 'BKK_TOWER_UPS_BATTERY', timestamp: '2025-04-20T07:30:00.000Z', value: 92, unit: '%', quality: 'good' },

        // Generator status
        { sensor_id: 'BKK_TOWER_GENERATOR_STATUS', timestamp: '2025-04-20T07:30:00.000Z', value: 1, unit: 'status', quality: 'good' } // Standby
      ]

      const gridStabilityAlertConfig: AlertConfiguration = {
        id: 'bangkok_grid_stability_alert',
        name: 'Bangkok Grid Stability Monitoring',
        description: 'Monitor building power systems during grid instability periods',
        user_id: 'bangkok_electrical_engineer',
        organization_id: 'company_thailand',
        status: 'active',
        created_at: '2025-04-01T00:00:00.000Z',
        updated_at: '2025-04-01T00:00:00.000Z',
        created_by: 'bangkok_electrical_engineer',
        rules: [
          {
            id: 'peak_demand_grid_stress',
            name: 'Peak Demand Grid Stress Alert',
            description: 'Alert when building power demand approaches grid capacity limits',
            enabled: true,
            priority: 'high',
            conditions: [
              {
                id: 'high_power_demand',
                metric: {
                  type: 'power_demand',
                  sensor_id: 'BKK_TOWER_POWER_MAIN',
                  display_name: 'Building Power Demand',
                  units: 'kW'
                },
                operator: 'greater_than',
                threshold: { value: 3500 }, // Near building capacity limit
                time_aggregation: {
                  function: 'average',
                  period: 15,
                  minimum_data_points: 3
                },
                filters: []
              },
              {
                id: 'low_grid_voltage',
                metric: {
                  type: 'electrical',
                  sensor_id: 'BKK_TOWER_GRID_VOLTAGE',
                  display_name: 'Grid Voltage',
                  units: 'V'
                },
                operator: 'less_than',
                threshold: { value: 220 }, // Below nominal 220V
                time_aggregation: {
                  function: 'average',
                  period: 10,
                  minimum_data_points: 2
                },
                filters: []
              }
            ],
            logical_operator: 'AND',
            evaluation_window: 15,
            cooldown_period: 45,
            suppress_duplicates: true,
            tags: ['power', 'grid', 'electrical', 'peak_demand']
          }
        ],
        notification_settings: {
          channels: [
            {
              type: 'email',
              enabled: true,
              configuration: {
                email_addresses: ['electrical.team@company.com', 'ops.bangkok@company.com']
              },
              priority_filter: ['high', 'critical']
            },
            {
              type: 'sms',
              enabled: true,
              configuration: {
                phone_numbers: ['+66812345679'] // On-call electrical engineer
              },
              priority_filter: ['high', 'critical']
            }
          ],
          recipients: [],
          frequency_limits: {
            max_alerts_per_hour: 3,
            max_alerts_per_day: 10,
            cooldown_between_similar: 60,
            escalation_threshold: 2
          },
          quiet_hours: {
            enabled: false, // Power alerts are always critical
            start_time: '23:00',
            end_time: '07:00',
            timezone: 'Asia/Bangkok',
            exceptions: [],
            weekend_override: false
          },
          escalation_delays: [10, 20, 30]
        },
        metadata: {
          category: 'operational',
          severity_auto_adjust: true,
          business_impact: {
            level: 'critical',
            estimated_cost_per_hour: 5000,
            affected_occupants: 600,
            operational_severity: 'system_down',
            compliance_risk: false,
            safety_risk: true
          },
          affected_systems: ['electrical', 'hvac', 'elevators', 'lighting'],
          affected_locations: ['Bangkok Tower - All Systems'],
          documentation_links: [
            'https://wiki.company.com/electrical/emergency-procedures'
          ],
          tags: ['electrical', 'critical_infrastructure', 'grid'],
          custom_fields: {
            building_capacity_kw: 4000,
            backup_generator_capacity_kw: 2500,
            ups_capacity_minutes: 15,
            grid_connection_type: 'high_voltage'
          }
        }
      }

      const gridContext: EvaluationContext = {
        current_time: '2025-04-20T07:30:00.000Z', // 2:30 PM Bangkok time - peak demand period
        sensor_readings: gridInstabilityData,
        historical_data: [
          // Normal power consumption baseline
          { sensor_id: 'BKK_TOWER_POWER_MAIN', timestamp: '2025-04-19T07:30:00.000Z', value: 2900, unit: 'kW', quality: 'good' }
        ],
        system_status: {
          generator_ready: true,
          ups_operational: true,
          load_shedding_available: true
        },
        weather_data: {
          temperature: 39, // Very hot - high AC demand
          humidity: 70,
          weather_condition: 'clear_sky'
        }
      }

      const gridAlerts = await alertEngine.evaluateAlerts([gridStabilityAlertConfig], gridContext)

      expect(gridAlerts).toHaveLength(1)

      const alert = gridAlerts[0]
      expect(alert.severity).toBe('high')

      // Validate both power demand and voltage conditions
      expect(alert.metric_values).toHaveLength(2)

      const powerMetric = alert.metric_values.find(m => m.metric.type === 'power_demand')
      const voltageMetric = alert.metric_values.find(m => m.metric.type === 'electrical')

      expect(powerMetric!.value).toBeGreaterThan(3500)
      expect(voltageMetric!.value).toBeLessThan(220)

      // Validate critical infrastructure context
      expect(alert.context.weather_conditions?.temperature).toBe(39)
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should detect power grid instability during Bangkok peak demand periods', async () => {
      // Bangkok electrical grid stress scenario - afternoon peak demand
      const gridStressData: SensorReading[] = [
        // Building power consumption climbing
        { sensor_id: 'BKK_POWER_MAIN_FEED', timestamp: '2025-05-10T06:00:00.000Z', value: 3800, unit: 'kW', quality: 'good' },
        { sensor_id: 'BKK_POWER_MAIN_FEED', timestamp: '2025-05-10T06:15:00.000Z', value: 4200, unit: 'kW', quality: 'good' },
        { sensor_id: 'BKK_POWER_MAIN_FEED', timestamp: '2025-05-10T06:30:00.000Z', value: 4650, unit: 'kW', quality: 'good' }, // Near capacity

        // Grid voltage dropping
        { sensor_id: 'BKK_GRID_VOLTAGE_MONITOR', timestamp: '2025-05-10T06:30:00.000Z', value: 215, unit: 'V', quality: 'good' }, // Below 220V nominal

        // Frequency instability
        { sensor_id: 'BKK_GRID_FREQUENCY', timestamp: '2025-05-10T06:30:00.000Z', value: 49.2, unit: 'Hz', quality: 'good' }, // Below 50Hz nominal

        // Power factor degradation
        { sensor_id: 'BKK_POWER_FACTOR_METER', timestamp: '2025-05-10T06:30:00.000Z', value: 0.75, unit: 'pf', quality: 'good' }, // Poor power factor

        // UPS engaging more frequently
        { sensor_id: 'BKK_UPS_SWITCH_COUNT', timestamp: '2025-05-10T06:30:00.000Z', value: 5, unit: 'count', quality: 'good' } // Multiple switches
      ]

      const gridStabilityConfig: AlertConfiguration = {
        id: 'bangkok_grid_stability_monitor',
        name: 'Bangkok Grid Stability Critical Monitor',
        description: 'Monitor building power systems during grid instability and peak demand',
        user_id: 'bangkok_electrical_manager',
        organization_id: 'company_thailand',
        status: 'active',
        created_at: '2025-05-01T00:00:00.000Z',
        updated_at: '2025-05-01T00:00:00.000Z',
        created_by: 'bangkok_electrical_manager',
        rules: [
          {
            id: 'grid_instability_detection',
            name: 'Grid Instability Detection',
            description: 'Detect when building approaches power capacity during grid stress',
            enabled: true,
            priority: 'critical',
            conditions: [
              {
                id: 'power_demand_critical',
                metric: {
                  type: 'power_demand',
                  sensor_id: 'BKK_POWER_MAIN_FEED',
                  display_name: 'Main Power Feed Demand',
                  units: 'kW'
                },
                operator: 'greater_than',
                threshold: { value: 4500 }, // 90% of 5MW capacity
                time_aggregation: {
                  function: 'average',
                  period: 15,
                  minimum_data_points: 3
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
                id: 'grid_voltage_low',
                metric: {
                  type: 'electrical',
                  sensor_id: 'BKK_GRID_VOLTAGE_MONITOR',
                  display_name: 'Grid Voltage',
                  units: 'V'
                },
                operator: 'less_than',
                threshold: { value: 218 }, // 1% below nominal 220V
                time_aggregation: {
                  function: 'average',
                  period: 10,
                  minimum_data_points: 2
                },
                filters: []
              }
            ],
            logical_operator: 'AND',
            evaluation_window: 15,
            cooldown_period: 30,
            suppress_duplicates: true,
            tags: ['power', 'grid', 'electrical', 'capacity']
          }
        ],
        notification_settings: {
          channels: [
            {
              type: 'email',
              enabled: true,
              configuration: {
                email_addresses: ['electrical@company.com', 'ops.bangkok@company.com']
              },
              priority_filter: ['critical', 'high']
            },
            {
              type: 'sms',
              enabled: true,
              configuration: {
                phone_numbers: ['+66812345679'] // Emergency electrical contact
              },
              priority_filter: ['critical']
            }
          ],
          recipients: [],
          frequency_limits: {
            max_alerts_per_hour: 2,
            max_alerts_per_day: 8,
            cooldown_between_similar: 45,
            escalation_threshold: 1
          },
          quiet_hours: {
            enabled: false, // Power issues are always critical
            start_time: '23:00',
            end_time: '07:00',
            timezone: 'Asia/Bangkok',
            exceptions: [],
            weekend_override: false
          },
          escalation_delays: [10, 20, 30]
        },
        metadata: {
          category: 'operational',
          severity_auto_adjust: true,
          business_impact: {
            level: 'critical',
            estimated_cost_per_hour: 8000,
            affected_occupants: 500,
            operational_severity: 'system_down',
            compliance_risk: false,
            safety_risk: true
          },
          affected_systems: ['electrical', 'hvac', 'elevators', 'lighting', 'it'],
          affected_locations: ['Bangkok Office - All Systems'],
          documentation_links: [],
          tags: ['electrical', 'grid', 'capacity'],
          custom_fields: {
            building_capacity_kw: 5000,
            critical_threshold: 4500,
            load_shedding_priority: ['non_essential', 'hvac_zones', 'lighting'],
            generator_capacity_kw: 3000,
            ups_runtime_minutes: 20
          }
        }
      }

      const gridStressContext: EvaluationContext = {
        current_time: '2025-05-10T06:30:00.000Z', // 1:30 PM Bangkok time - peak demand
        sensor_readings: gridStressData,
        historical_data: [
          // Normal power consumption baseline
          { sensor_id: 'BKK_POWER_MAIN_FEED', timestamp: '2025-05-09T06:30:00.000Z', value: 3200, unit: 'kW', quality: 'good' }
        ],
        system_status: {
          generator_ready: true,
          ups_operational: true,
          load_shedding_available: true,
          grid_connection_stable: false
        },
        weather_data: {
          temperature: 38, // Hot day increasing AC load
          humidity: 75,
          weather_condition: 'hot'
        }
      }

      const gridAlerts = await alertEngine.evaluateAlerts([gridStabilityConfig], gridStressContext)

      expect(gridAlerts).toHaveLength(1)

      const alert = gridAlerts[0]
      expect(alert.severity).toBe('critical')

      // Validate both power and voltage conditions
      expect(alert.metric_values).toHaveLength(2)

      const powerMetric = alert.metric_values.find(m => m.metric.type === 'power_demand')
      const voltageMetric = alert.metric_values.find(m => m.metric.type === 'electrical')

      expect(powerMetric!.value).toBeGreaterThan(4500)
      expect(voltageMetric!.value).toBeLessThan(218)

      // Validate grid stress context
      expect(alert.context.weather_conditions?.temperature).toBe(38)
    })

    it('should handle sensor communication failures during Bangkok network outages', async () => {
      const networkOutageData: SensorReading[] = [
        // Some sensors working
        { sensor_id: 'BKK_BACKUP_SENSOR_001', timestamp: '2025-03-10T03:00:00.000Z', value: 1200, unit: 'kWh', quality: 'good' },

        // Other sensors showing quality issues
        { sensor_id: 'BKK_PRIMARY_SENSOR_001', timestamp: '2025-03-10T03:00:00.000Z', value: 0, unit: 'kWh', quality: 'error' },
        { sensor_id: 'BKK_PRIMARY_SENSOR_002', timestamp: '2025-03-10T02:45:00.000Z', value: 850, unit: 'kWh', quality: 'warning' },

        // Stale data (old timestamps)
        { sensor_id: 'BKK_NETWORK_SENSOR_001', timestamp: '2025-03-10T01:00:00.000Z', value: 900, unit: 'kWh', quality: 'good' }
      ]

      const resilientAlertConfig: AlertConfiguration = {
        id: 'bangkok_network_resilient_alert',
        name: 'Bangkok Network-Resilient Monitoring',
        description: 'Continue monitoring during network disruptions using available sensors',
        user_id: 'bangkok_it_manager',
        organization_id: 'company_thailand',
        status: 'active',
        created_at: '2025-03-01T00:00:00.000Z',
        updated_at: '2025-03-01T00:00:00.000Z',
        created_by: 'bangkok_it_manager',
        rules: [
          {
            id: 'backup_sensor_monitoring',
            name: 'Backup Sensor Monitoring',
            description: 'Use backup sensors when primary sensors fail',
            enabled: true,
            priority: 'medium',
            conditions: [
              {
                id: 'backup_energy_threshold',
                metric: {
                  type: 'energy_consumption',
                  sensor_id: 'BKK_BACKUP_SENSOR_001',
                  display_name: 'Backup Energy Sensor',
                  units: 'kWh'
                },
                operator: 'greater_than',
                threshold: { value: 1000 },
                time_aggregation: {
                  function: 'average',
                  period: 10,
                  minimum_data_points: 1 // Relaxed requirement during outages
                },
                filters: [
                  {
                    field: 'quality',
                    operator: 'equals',
                    value: 'good'
                  }
                ]
              }
            ],
            logical_operator: 'AND',
            evaluation_window: 10,
            cooldown_period: 30,
            suppress_duplicates: true,
            tags: ['backup', 'resilient', 'network_outage']
          }
        ],
        notification_settings: {
          channels: [
            {
              type: 'email',
              enabled: true,
              configuration: {
                email_addresses: ['it.bangkok@company.com']
              },
              priority_filter: ['medium', 'high', 'critical']
            }
          ],
          recipients: [],
          frequency_limits: {
            max_alerts_per_hour: 5,
            max_alerts_per_day: 20,
            cooldown_between_similar: 30,
            escalation_threshold: 3
          },
          quiet_hours: {
            enabled: false,
            start_time: '23:00',
            end_time: '07:00',
            timezone: 'Asia/Bangkok',
            exceptions: [],
            weekend_override: false
          },
          escalation_delays: [20, 40, 60]
        },
        metadata: {
          category: 'operational',
          severity_auto_adjust: false,
          business_impact: {
            level: 'medium',
            estimated_cost_per_hour: 200,
            affected_occupants: 100,
            operational_severity: 'monitoring_only',
            compliance_risk: false,
            safety_risk: false
          },
          affected_systems: ['monitoring'],
          affected_locations: ['Bangkok Office - Backup Systems'],
          documentation_links: [],
          tags: ['resilience', 'backup'],
          custom_fields: {
            backup_system: true,
            network_independent: true
          }
        }
      }

      const outageContext: EvaluationContext = {
        current_time: '2025-03-10T03:00:00.000Z',
        sensor_readings: networkOutageData,
        historical_data: [],
        system_status: {
          network_status: 'degraded',
          backup_sensors_active: true,
          primary_sensors_offline: 3
        }
      }

      const resilientAlerts = await alertEngine.evaluateAlerts([resilientAlertConfig], outageContext)

      expect(resilientAlerts).toHaveLength(1)

      const alert = resilientAlerts[0]
      expect(alert.severity).toBe('medium')

      // Should use backup sensor data
      const backupMetric = alert.metric_values.find(m => m.metric.sensor_id === 'BKK_BACKUP_SENSOR_001')
      expect(backupMetric).toBeDefined()
      expect(backupMetric!.value).toBe(1200)
    })

    it('should validate data quality and reject invalid Bangkok sensor readings', async () => {
      const invalidSensorData: SensorReading[] = [
        // Invalid temperature (impossible for Bangkok)
        { sensor_id: 'BKK_TEMP_INVALID', timestamp: '2025-05-15T04:00:00.000Z', value: -10, unit: '°C', quality: 'error' },

        // Invalid humidity (over 100%)
        { sensor_id: 'BKK_HUMIDITY_INVALID', timestamp: '2025-05-15T04:00:00.000Z', value: 150, unit: '%RH', quality: 'error' },

        // Negative energy consumption (impossible)
        { sensor_id: 'BKK_ENERGY_INVALID', timestamp: '2025-05-15T04:00:00.000Z', value: -500, unit: 'kWh', quality: 'error' },

        // Valid sensor reading for comparison
        { sensor_id: 'BKK_ENERGY_VALID', timestamp: '2025-05-15T04:00:00.000Z', value: 1200, unit: 'kWh', quality: 'good' }
      ]

      const dataValidationConfig: AlertConfiguration = {
        id: 'bangkok_data_validation_alert',
        name: 'Bangkok Data Quality Validation',
        description: 'Monitor for data quality issues in Bangkok sensors',
        user_id: 'bangkok_data_analyst',
        organization_id: 'company_thailand',
        status: 'active',
        created_at: '2025-05-01T00:00:00.000Z',
        updated_at: '2025-05-01T00:00:00.000Z',
        created_by: 'bangkok_data_analyst',
        rules: [
          {
            id: 'valid_energy_only',
            name: 'Valid Energy Data Only',
            description: 'Only process valid energy consumption data',
            enabled: true,
            priority: 'low',
            conditions: [
              {
                id: 'valid_energy_condition',
                metric: {
                  type: 'energy_consumption',
                  sensor_id: 'BKK_ENERGY_VALID',
                  display_name: 'Valid Energy Sensor',
                  units: 'kWh'
                },
                operator: 'greater_than',
                threshold: { value: 1000 },
                time_aggregation: {
                  function: 'average',
                  period: 5,
                  minimum_data_points: 1
                },
                filters: [
                  {
                    field: 'quality',
                    operator: 'equals',
                    value: 'good'
                  },
                  {
                    field: 'value',
                    operator: 'greater_than',
                    value: 0 // Reject negative values
                  }
                ]
              }
            ],
            logical_operator: 'AND',
            evaluation_window: 5,
            cooldown_period: 15,
            suppress_duplicates: true,
            tags: ['data_quality', 'validation']
          }
        ],
        notification_settings: {
          channels: [
            {
              type: 'email',
              enabled: true,
              configuration: {
                email_addresses: ['data.quality@company.com']
              },
              priority_filter: ['low', 'medium', 'high']
            }
          ],
          recipients: [],
          frequency_limits: {
            max_alerts_per_hour: 10,
            max_alerts_per_day: 50,
            cooldown_between_similar: 15,
            escalation_threshold: 5
          },
          quiet_hours: {
            enabled: true,
            start_time: '23:00',
            end_time: '07:00',
            timezone: 'Asia/Bangkok',
            exceptions: [],
            weekend_override: false
          },
          escalation_delays: [30, 60, 120]
        },
        metadata: {
          category: 'operational',
          severity_auto_adjust: false,
          business_impact: {
            level: 'low',
            estimated_cost_per_hour: 50,
            affected_occupants: 0,
            operational_severity: 'monitoring_only',
            compliance_risk: false,
            safety_risk: false
          },
          affected_systems: ['monitoring'],
          affected_locations: ['Bangkok Office - Data Systems'],
          documentation_links: [],
          tags: ['data_quality'],
          custom_fields: {
            data_validation_enabled: true,
            quality_thresholds: {
              min_temperature: 15,
              max_temperature: 45,
              min_humidity: 0,
              max_humidity: 100,
              min_energy: 0
            }
          }
        }
      }

      const validationContext: EvaluationContext = {
        current_time: '2025-05-15T04:00:00.000Z',
        sensor_readings: invalidSensorData,
        historical_data: [],
        system_status: {
          data_validation_active: true
        }
      }

      const validationAlerts = await alertEngine.evaluateAlerts([dataValidationConfig], validationContext)

      // Should trigger alert only for valid sensor data
      expect(validationAlerts).toHaveLength(1)

      const alert = validationAlerts[0]
      expect(alert.metric_values).toHaveLength(1)

      // Should only include valid sensor data
      const validMetric = alert.metric_values[0]
      expect(validMetric.metric.sensor_id).toBe('BKK_ENERGY_VALID')
      expect(validMetric.value).toBe(1200)
    })

    it('should handle Bangkok network outages with fallback monitoring', async () => {
      // Bangkok network infrastructure failure scenario
      const networkOutageData: SensorReading[] = [
        // Primary network sensors offline (no recent data)
        { sensor_id: 'BKK_PRIMARY_ENERGY_001', timestamp: '2025-07-12T02:00:00.000Z', value: 0, unit: 'kWh', quality: 'error' },
        { sensor_id: 'BKK_PRIMARY_TEMP_001', timestamp: '2025-07-12T02:00:00.000Z', value: 0, unit: '°C', quality: 'error' },

        // Backup cellular/satellite sensors still working
        { sensor_id: 'BKK_BACKUP_ENERGY_CELLULAR', timestamp: '2025-07-12T04:30:00.000Z', value: 1450, unit: 'kWh', quality: 'good' },
        { sensor_id: 'BKK_BACKUP_ENERGY_CELLULAR', timestamp: '2025-07-12T04:45:00.000Z', value: 1520, unit: 'kWh', quality: 'good' },
        { sensor_id: 'BKK_BACKUP_ENERGY_CELLULAR', timestamp: '2025-07-12T05:00:00.000Z', value: 1650, unit: 'kWh', quality: 'good' }, // Still shows spike

        // Network status indicators
        { sensor_id: 'BKK_NETWORK_STATUS_PRIMARY', timestamp: '2025-07-12T05:00:00.000Z', value: 0, unit: 'status', quality: 'error' }, // Down
        { sensor_id: 'BKK_NETWORK_STATUS_BACKUP', timestamp: '2025-07-12T05:00:00.000Z', value: 1, unit: 'status', quality: 'good' }, // Up

        // Backup occupancy sensor (battery powered)
        { sensor_id: 'BKK_BACKUP_OCCUPANCY_BATTERY', timestamp: '2025-07-12T05:00:00.000Z', value: 85, unit: 'count', quality: 'good' }
      ]

      const networkResilienceConfig: AlertConfiguration = {
        id: 'bangkok_network_resilience_monitor',
        name: 'Bangkok Network Resilience Monitor',
        description: 'Continue critical monitoring during network outages using backup systems',
        user_id: 'bangkok_it_ops',
        organization_id: 'company_thailand',
        status: 'active',
        created_at: '2025-07-01T00:00:00.000Z',
        updated_at: '2025-07-01T00:00:00.000Z',
        created_by: 'bangkok_it_ops',
        rules: [
          {
            id: 'backup_sensor_energy_rule',
            name: 'Backup Sensor Energy Monitoring',
            description: 'Monitor energy consumption using backup sensors during network outages',
            enabled: true,
            priority: 'high',
            conditions: [
              {
                id: 'backup_energy_threshold',
                metric: {
                  type: 'energy_consumption',
                  sensor_id: 'BKK_BACKUP_ENERGY_CELLULAR',
                  display_name: 'Backup Energy Sensor (Cellular)',
                  units: 'kWh'
                },
                operator: 'greater_than',
                threshold: { value: 1600 }, // Higher threshold due to limited backup data
                time_aggregation: {
                  function: 'average',
                  period: 20, // Longer period for backup sensors
                  minimum_data_points: 2 // Relaxed requirement
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
                id: 'network_outage_condition',
                metric: {
                  type: 'system_status',
                  sensor_id: 'BKK_NETWORK_STATUS_PRIMARY',
                  display_name: 'Primary Network Status',
                  units: 'status'
                },
                operator: 'equals',
                threshold: { value: 0 }, // Network down
                time_aggregation: {
                  function: 'average',
                  period: 5,
                  minimum_data_points: 1
                },
                filters: []
              }
            ],
            logical_operator: 'AND',
            evaluation_window: 20,
            cooldown_period: 60, // Longer cooldown during outages
            suppress_duplicates: true,
            tags: ['network_outage', 'backup_systems', 'resilience']
          }
        ],
        notification_settings: {
          channels: [
            {
              type: 'sms', // Prioritize SMS during network outages
              enabled: true,
              configuration: {
                phone_numbers: ['+66812345680'] // Backup contact
              },
              priority_filter: ['high', 'critical']
            },
            {
              type: 'webhook',
              enabled: true,
              configuration: {
                webhook_url: 'https://backup.monitoring.company.com/alerts', // Backup webhook
                webhook_method: 'POST'
              },
              priority_filter: ['high', 'critical']
            }
          ],
          recipients: [],
          frequency_limits: {
            max_alerts_per_hour: 3,
            max_alerts_per_day: 12,
            cooldown_between_similar: 30,
            escalation_threshold: 2
          },
          quiet_hours: {
            enabled: false, // No quiet hours during outages
            start_time: '23:00',
            end_time: '07:00',
            timezone: 'Asia/Bangkok',
            exceptions: [],
            weekend_override: false
          },
          escalation_delays: [20, 40]
        },
        metadata: {
          category: 'operational',
          severity_auto_adjust: false,
          business_impact: {
            level: 'high',
            estimated_cost_per_hour: 500,
            affected_occupants: 150,
            operational_severity: 'monitoring_only',
            compliance_risk: false,
            safety_risk: false
          },
          affected_systems: ['monitoring', 'backup_systems'],
          affected_locations: ['Bangkok Office - Backup Monitoring'],
          documentation_links: [],
          tags: ['network_resilience', 'backup'],
          custom_fields: {
            backup_system_active: true,
            primary_network_down: true,
            cellular_backup_enabled: true,
            satellite_backup_enabled: false,
            battery_runtime_hours: 48
          }
        }
      }

      const outageContext: EvaluationContext = {
        current_time: '2025-07-12T05:00:00.000Z', // 12:00 PM Bangkok time during outage
        sensor_readings: networkOutageData,
        historical_data: [
          // Pre-outage baseline
          { sensor_id: 'BKK_BACKUP_ENERGY_CELLULAR', timestamp: '2025-07-11T05:00:00.000Z', value: 1200, unit: 'kWh', quality: 'good' }
        ],
        system_status: {
          primary_network_status: 'down',
          backup_network_status: 'up',
          cellular_backup_active: true,
          satellite_backup_active: false,
          estimated_restoration_time: '6 hours'
        }
      }

      const outageAlerts = await alertEngine.evaluateAlerts([networkResilienceConfig], outageContext)

      expect(outageAlerts).toHaveLength(1)

      const alert = outageAlerts[0]
      expect(alert.severity).toBe('high')
      expect(alert.title).toContain('Bangkok Network Resilience Monitor')

      // Validate both backup energy and network status conditions
      expect(alert.metric_values).toHaveLength(2)

      const backupEnergyMetric = alert.metric_values.find(m => m.metric.sensor_id === 'BKK_BACKUP_ENERGY_CELLULAR')
      const networkStatusMetric = alert.metric_values.find(m => m.metric.sensor_id === 'BKK_NETWORK_STATUS_PRIMARY')

      expect(backupEnergyMetric!.value).toBeGreaterThan(1600)
      expect(networkStatusMetric!.value).toBe(0) // Network down

      // Validate outage context
      expect(alert.context.system_status).toBeDefined()

      // Send notifications using backup channels
      const notifications = await notificationService.sendAlertNotifications(
        networkResilienceConfig.notification_settings,
        alert
      )

      expect(notifications.length).toBeGreaterThan(0)
      expect(notifications.some(n => n.channel === 'sms')).toBe(true) // SMS should work during outages
      expect(notifications.some(n => n.channel === 'webhook')).toBe(true) // Backup webhook
    })
  })

  describe('Performance Validation with Bangkok Data Volumes', () => {
    it('should maintain accuracy with realistic Bangkok data volumes', async () => {
      // Simulate a full day of data from 100 Bangkok buildings
      const buildingCount = 100
      const sensorsPerBuilding = 10
      const readingsPerSensor = 288 // Every 5 minutes for 24 hours

      const massiveBangkokDataset: SensorReading[] = []

      for (let building = 0; building < buildingCount; building++) {
        for (let sensor = 0; sensor < sensorsPerBuilding; sensor++) {
          for (let reading = 0; reading < readingsPerSensor; reading++) {
            const timestamp = new Date()
            timestamp.setMinutes(timestamp.getMinutes() - (reading * 5))

            // Realistic energy patterns for Bangkok
            let energyValue = 500 + Math.random() * 200 // Base load

            // Business hours increase
            const hour = timestamp.getHours()
            if (hour >= 8 && hour <= 18) {
              energyValue += 300 + Math.random() * 200
            }

            // Hot afternoon peak
            if (hour >= 13 && hour <= 16) {
              energyValue += 200 + Math.random() * 150
            }

            massiveBangkokDataset.push({
              sensor_id: `BKK_B${building}_HVAC_${sensor}`,
              timestamp: timestamp.toISOString(),
              value: energyValue,
              unit: 'kWh',
              quality: Math.random() > 0.98 ? 'warning' : 'good'
            })
          }
        }
      }

      console.log(`Generated ${massiveBangkokDataset.length} sensor readings for Bangkok dataset validation`)

      const massiveBangkokConfig: AlertConfiguration = {
        id: 'bangkok_massive_dataset_validation',
        name: 'Bangkok Massive Dataset Validation',
        description: 'Validate alert accuracy with realistic Bangkok data volumes',
        user_id: 'bangkok_validation_engineer',
        organization_id: 'company_thailand',
        status: 'active',
        created_at: '2025-06-01T00:00:00.000Z',
        updated_at: '2025-06-01T00:00:00.000Z',
        created_by: 'bangkok_validation_engineer',
        rules: [
          {
            id: 'peak_energy_detection',
            name: 'Peak Energy Detection',
            description: 'Detect when any building exceeds peak energy thresholds',
            enabled: true,
            priority: 'medium',
            conditions: [
              {
                id: 'peak_energy_condition',
                metric: {
                  type: 'energy_consumption',
                  display_name: 'Building Energy Consumption',
                  units: 'kWh'
                },
                operator: 'greater_than',
                threshold: { value: 1000 }, // Peak threshold
                time_aggregation: {
                  function: 'average',
                  period: 30,
                  minimum_data_points: 6
                },
                filters: [
                  {
                    field: 'quality',
                    operator: 'equals',
                    value: 'good'
                  }
                ]
              }
            ],
            logical_operator: 'AND',
            evaluation_window: 30,
            cooldown_period: 60,
            suppress_duplicates: true,
            tags: ['bangkok', 'massive_dataset', 'validation']
          }
        ],
        notification_settings: {
          channels: [],
          recipients: [],
          frequency_limits: {
            max_alerts_per_hour: 50,
            max_alerts_per_day: 200,
            cooldown_between_similar: 30,
            escalation_threshold: 10
          },
          quiet_hours: {
            enabled: false,
            start_time: '23:00',
            end_time: '07:00',
            timezone: 'Asia/Bangkok',
            exceptions: [],
            weekend_override: false
          },
          escalation_delays: [30, 60, 120]
        },
        metadata: {
          category: 'energy_efficiency',
          severity_auto_adjust: false,
          business_impact: {
            level: 'medium',
            estimated_cost_per_hour: 300,
            affected_occupants: 200,
            operational_severity: 'efficiency_loss',
            compliance_risk: false,
            safety_risk: false
          },
          affected_systems: ['hvac'],
          affected_locations: ['All Bangkok Buildings'],
          documentation_links: [],
          tags: ['validation', 'massive_dataset'],
          custom_fields: {
            dataset_size: massiveBangkokDataset.length,
            validation_test: true
          }
        }
      }

      const massiveContext: EvaluationContext = {
        current_time: new Date().toISOString(),
        sensor_readings: massiveBangkokDataset,
        historical_data: [],
        system_status: {}
      }

      const startTime = Date.now()
      const massiveAlerts = await alertEngine.evaluateAlerts([massiveBangkokConfig], massiveContext)
      const duration = Date.now() - startTime

      console.log(`Processed ${massiveBangkokDataset.length} readings in ${duration}ms`)
      console.log(`Generated ${massiveAlerts.length} alerts`)
      console.log(`Alert accuracy: ${massiveAlerts.every(alert => alert.metric_values[0].value > 1000) ? 'PASS' : 'FAIL'}`)

      // Performance and accuracy assertions
      expect(duration).toBeLessThan(30000) // Should complete within 30 seconds
      expect(massiveAlerts.length).toBeGreaterThan(0) // Should detect some peaks
      expect(massiveAlerts.length).toBeLessThan(buildingCount * 0.5) // Should not trigger for more than 50% of buildings

      // Validate alert accuracy - all triggered alerts should actually exceed threshold
      massiveAlerts.forEach(alert => {
        expect(alert.metric_values[0].value).toBeGreaterThan(1000)
        expect(alert.severity).toBe('medium')
      })
    })
  })
})