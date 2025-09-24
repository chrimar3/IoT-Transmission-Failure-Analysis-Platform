/**
 * Story 4.2: Professional API Access - Test Data Factory
 * Comprehensive test data generation for API testing
 */

import crypto from 'crypto'
import { faker } from '@faker-js/faker'

// Helper function for array element selection (faker compatibility)
const getRandomArrayElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)]
}

// Bangkok IoT Dataset Configuration
export const BANGKOK_DATASET_CONFIG = {
  building_floors: 7,
  sensors_per_floor: 8,
  equipment_types: ['HVAC', 'Lighting', 'Power', 'Water', 'Security'],
  data_start_date: '2024-01-01T00:00:00Z',
  data_end_date: '2024-09-23T23:59:59Z',
  total_sensors: 56, // 7 floors × 8 sensors
  measurement_interval_minutes: 15
}

// API Key Management Test Data
export class ApiKeyTestFactory {
  /**
   * Generate a realistic API key
   */
  static generateApiKey(): string {
    const prefix = 'sk_'
    const randomHex = crypto.randomBytes(32).toString('hex')
    return `${prefix}${randomHex}`
  }

  /**
   * Create API key hash for secure storage
   */
  static hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex')
  }

  /**
   * Generate API key prefix for identification
   */
  static getApiKeyPrefix(apiKey: string): string {
    return apiKey.slice(0, 11) // 'sk_' + first 8 hex chars
  }

  /**
   * Create mock API key record
   */
  static createApiKeyRecord(options: Partial<ApiKeyRecord> = {}): ApiKeyRecord {
    const apiKey = this.generateApiKey()

    return {
      id: crypto.randomUUID(),
      user_id: options.user_id || crypto.randomUUID(),
      name: options.name || faker.commerce.productName() + ' Integration',
      key_hash: this.hashApiKey(apiKey),
      key_prefix: this.getApiKeyPrefix(apiKey),
      scopes: options.scopes || ['read:data'],
      rate_limit_tier: options.rate_limit_tier || 'professional',
      created_at: options.created_at || new Date().toISOString(),
      expires_at: options.expires_at,
      last_used_at: options.last_used_at,
      is_active: options.is_active ?? true,
      usage_stats: options.usage_stats || {
        total_requests: 0,
        requests_this_month: 0,
        last_request_at: null
      },
      ...options
    }
  }

  /**
   * Create multiple API keys for testing
   */
  static createApiKeyBatch(count: number, baseOptions: Partial<ApiKeyRecord> = {}): ApiKeyRecord[] {
    return Array.from({ length: count }, () => this.createApiKeyRecord(baseOptions))
  }

  /**
   * Create API keys for different tiers
   */
  static createTieredApiKeys(userId: string): { free: ApiKeyRecord, professional: ApiKeyRecord, enterprise: ApiKeyRecord } {
    return {
      free: this.createApiKeyRecord({
        user_id: userId,
        name: 'Free Tier Key',
        rate_limit_tier: 'free',
        scopes: ['read:data']
      }),
      professional: this.createApiKeyRecord({
        user_id: userId,
        name: 'Professional Integration',
        rate_limit_tier: 'professional',
        scopes: ['read:data', 'read:analytics', 'read:exports']
      }),
      enterprise: this.createApiKeyRecord({
        user_id: userId,
        name: 'Enterprise System',
        rate_limit_tier: 'enterprise',
        scopes: ['read:data', 'read:analytics', 'read:exports', 'manage:webhooks']
      })
    }
  }
}

// User Test Data
export class UserTestFactory {
  /**
   * Create test user record
   */
  static createUser(options: Partial<UserRecord> = {}): UserRecord {
    return {
      id: crypto.randomUUID(),
      email: options.email || faker.internet.email(),
      name: options.name || faker.name?.fullName() || `${faker.name?.firstName()} ${faker.name?.lastName()}` || 'Test User',
      subscription_tier: options.subscription_tier || 'professional',
      stripe_customer_id: options.stripe_customer_id || `cus_${faker.datatype?.string?.(14) || faker.random?.alphaNumeric?.(14) || Math.random().toString(36).substring(2, 16)}`,
      created_at: options.created_at || new Date().toISOString(),
      updated_at: options.updated_at || new Date().toISOString(),
      is_active: options.is_active ?? true,
      ...options
    }
  }

  /**
   * Create users for each subscription tier
   */
  static createTieredUsers(): { free: UserRecord, professional: UserRecord, enterprise: UserRecord } {
    return {
      free: this.createUser({
        subscription_tier: 'free',
        email: 'free.user@example.com'
      }),
      professional: this.createUser({
        subscription_tier: 'professional',
        email: 'pro.user@example.com'
      }),
      enterprise: this.createUser({
        subscription_tier: 'enterprise',
        email: 'enterprise.user@example.com'
      })
    }
  }
}

// Bangkok IoT Sensor Data Factory
export class BangkokDataFactory {
  /**
   * Generate realistic sensor configuration
   */
  static createSensorConfig(sensorId: string, floorNumber: number): SensorConfig {
    const equipmentTypes = BANGKOK_DATASET_CONFIG.equipment_types
    const equipmentType = equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)]

    return {
      sensor_id: sensorId,
      equipment_type: equipmentType,
      floor_number: floorNumber,
      location: {
        building: 'Bangkok Office Complex',
        floor: floorNumber,
        zone: getRandomArrayElement(['North', 'South', 'East', 'West', 'Central']),
        room: getRandomArrayElement(['Office', 'Conference', 'Lobby', 'Storage', 'Utility'])
      },
      installation_date: faker.date.between({
        from: '2023-01-01',
        to: '2024-01-01'
      }).toISOString(),
      calibration_date: faker.date.recent({ days: 90 }).toISOString(),
      status: getRandomArrayElement(['active', 'maintenance', 'error']) as 'active' | 'maintenance' | 'error',
      unit: this.getUnitForEquipmentType(equipmentType),
      thresholds: this.getThresholdsForEquipmentType(equipmentType)
    }
  }

  /**
   * Generate time-series data points
   */
  static generateTimeSeriesData(sensorConfig: SensorConfig, options: TimeSeriesOptions = {}): TimeSeriesDataPoint[] {
    const startDate = new Date(options.startDate || BANGKOK_DATASET_CONFIG.data_start_date)
    const endDate = new Date(options.endDate || BANGKOK_DATASET_CONFIG.data_end_date)
    const interval = options.intervalMinutes || BANGKOK_DATASET_CONFIG.measurement_interval_minutes

    const dataPoints: TimeSeriesDataPoint[] = []
    const baseValue = this.getBaseValueForEquipment(sensorConfig.equipment_type)

    let currentTime = new Date(startDate)

    while (currentTime <= endDate) {
      const value = this.generateRealisticValue(
        sensorConfig.equipment_type,
        baseValue,
        currentTime,
        sensorConfig.floor_number
      )

      dataPoints.push({
        timestamp: currentTime.toISOString(),
        value: Math.round(value * 100) / 100,
        sensor_id: sensorConfig.sensor_id,
        status: this.getStatusForValue(sensorConfig.equipment_type, value, baseValue),
        metadata: {
          equipment_type: sensorConfig.equipment_type,
          floor_number: sensorConfig.floor_number,
          unit: sensorConfig.unit
        }
      })

      // Advance time by interval
      currentTime = new Date(currentTime.getTime() + interval * 60 * 1000)
    }

    return dataPoints
  }

  /**
   * Generate complete Bangkok dataset
   */
  static generateFullBangkokDataset(): BangkokDataset {
    const sensors: SensorConfig[] = []
    const timeSeriesData: { [sensorId: string]: TimeSeriesDataPoint[] } = {}

    // Generate sensors for each floor
    for (let floor = 1; floor <= BANGKOK_DATASET_CONFIG.building_floors; floor++) {
      for (let sensorNum = 1; sensorNum <= 8; sensorNum++) {
        const sensorId = `SENSOR_${String(floor).padStart(2, '0')}${String(sensorNum).padStart(2, '0')}`
        const sensorConfig = this.createSensorConfig(sensorId, floor)

        sensors.push(sensorConfig)
        timeSeriesData[sensorId] = this.generateTimeSeriesData(sensorConfig, {
          startDate: '2024-09-01T00:00:00Z',
          endDate: '2024-09-23T23:59:59Z',
          intervalMinutes: 15
        })
      }
    }

    return {
      metadata: {
        building_name: 'Bangkok Office Complex',
        total_sensors: sensors.length,
        total_floors: BANGKOK_DATASET_CONFIG.building_floors,
        data_period: {
          start: BANGKOK_DATASET_CONFIG.data_start_date,
          end: BANGKOK_DATASET_CONFIG.data_end_date
        },
        measurement_interval: BANGKOK_DATASET_CONFIG.measurement_interval_minutes,
        generated_at: new Date().toISOString()
      },
      sensors,
      time_series_data: timeSeriesData
    }
  }

  /**
   * Generate analytical insights for testing
   */
  static generateAnalyticalInsights(sensorId: string): AnalyticalInsights {
    return {
      sensor_id: sensorId,
      analysis_period: {
        start: '2024-09-01T00:00:00Z',
        end: '2024-09-23T23:59:59Z'
      },
      statistics: {
        mean: faker.number.float({ min: 100, max: 1000, multipleOf: 0.01 }),
        median: faker.number.float({ min: 100, max: 1000, multipleOf: 0.01 }),
        std_deviation: faker.number.float({ min: 10, max: 100, multipleOf: 0.01 }),
        min_value: faker.number.float({ min: 50, max: 200, multipleOf: 0.01 }),
        max_value: faker.number.float({ min: 800, max: 1500, multipleOf: 0.01 }),
        total_readings: faker.number.int({ min: 1000, max: 5000 })
      },
      patterns: {
        daily_peak_hours: [9, 10, 11, 14, 15, 16],
        weekly_patterns: ['higher_weekdays', 'lower_weekends'],
        seasonal_trends: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)],
        anomaly_count: faker.number.int({ min: 0, max: 10 })
      },
      confidence_intervals: {
        mean_95: {
          lower: faker.number.float({ min: 200, max: 300, multipleOf: 0.01 }),
          upper: faker.number.float({ min: 700, max: 800, multipleOf: 0.01 })
        },
        prediction_95: {
          lower: faker.number.float({ min: 150, max: 250, multipleOf: 0.01 }),
          upper: faker.number.float({ min: 750, max: 850, multipleOf: 0.01 })
        }
      }
    }
  }

  // Helper methods
  private static getUnitForEquipmentType(equipmentType: string): string {
    const units = {
      'HVAC': 'kWh',
      'Lighting': 'kWh',
      'Power': 'kWh',
      'Water': 'L/min',
      'Security': 'kWh'
    }
    return units[equipmentType as keyof typeof units] || 'kWh'
  }

  private static getThresholdsForEquipmentType(equipmentType: string): { warning: number, critical: number } {
    const thresholds = {
      'HVAC': { warning: 1100, critical: 1400 },
      'Lighting': { warning: 150, critical: 200 },
      'Power': { warning: 3000, critical: 4000 },
      'Water': { warning: 60, critical: 80 },
      'Security': { warning: 35, critical: 50 }
    }
    return thresholds[equipmentType as keyof typeof thresholds] || { warning: 100, critical: 200 }
  }

  private static getBaseValueForEquipment(equipmentType: string): number {
    const baseValues = {
      'HVAC': 850,
      'Lighting': 120,
      'Power': 2400,
      'Water': 45,
      'Security': 25
    }
    return baseValues[equipmentType as keyof typeof baseValues] || 100
  }

  private static generateRealisticValue(
    equipmentType: string,
    baseValue: number,
    timestamp: Date,
    floorNumber: number
  ): number {
    const hour = timestamp.getHours()
    const dayOfWeek = timestamp.getDay()
    const month = timestamp.getMonth()

    // Daily pattern multiplier
    const dailyPattern = this.getDailyPattern(equipmentType)
    const dailyMultiplier = dailyPattern[hour] || 1

    // Weekly pattern (lower on weekends)
    const weeklyMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1

    // Seasonal pattern (Bangkok climate)
    const seasonalMultiplier = this.getSeasonalMultiplier(month)

    // Floor variation
    const floorMultiplier = 1 + (floorNumber - 4) * 0.05

    // Random noise
    const noise = (Math.random() - 0.5) * 0.15

    return baseValue * dailyMultiplier * weeklyMultiplier * seasonalMultiplier * floorMultiplier * (1 + noise)
  }

  private static getDailyPattern(equipmentType: string): number[] {
    const patterns = {
      'HVAC': [0.6, 0.5, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.3, 1.2, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.5, 0.5],
      'Lighting': [0.3, 0.2, 0.2, 0.2, 0.3, 0.5, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.2, 1.4, 1.2, 0.8, 0.6, 0.4, 0.3],
      'Power': [0.4, 0.3, 0.3, 0.3, 0.4, 0.6, 0.8, 1.0, 1.2, 1.3, 1.4, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.4, 0.4],
      'Water': [0.2, 0.1, 0.1, 0.1, 0.3, 0.6, 0.8, 1.0, 1.2, 1.1, 1.0, 1.3, 1.4, 1.0, 0.9, 0.8, 0.7, 0.6, 0.4, 0.3, 0.2, 0.1, 0.1, 0.1],
      'Security': Array(24).fill(1.0)
    }
    return patterns[equipmentType as keyof typeof patterns] || Array(24).fill(1.0)
  }

  private static getSeasonalMultiplier(month: number): number {
    // Bangkok seasonal patterns (0-indexed months)
    if (month >= 2 && month <= 4) return 1.3 // Hot season (March-May)
    if (month >= 5 && month <= 9) return 1.1 // Wet season (June-October)
    return 0.9 // Cool season (November-February)
  }

  private static getStatusForValue(equipmentType: string, value: number, baseValue: number): 'normal' | 'warning' | 'error' {
    const ratio = value / baseValue

    if (equipmentType === 'HVAC') {
      if (ratio > 1.6 || ratio < 0.4) return 'error'
      if (ratio > 1.3 || ratio < 0.6) return 'warning'
    } else if (equipmentType === 'Power') {
      if (ratio > 1.8 || ratio < 0.2) return 'error'
      if (ratio > 1.4 || ratio < 0.5) return 'warning'
    } else {
      if (ratio > 1.5 || ratio < 0.3) return 'error'
      if (ratio > 1.2 || ratio < 0.7) return 'warning'
    }

    return 'normal'
  }
}

// Webhook Test Data Factory
export class WebhookTestFactory {
  /**
   * Create webhook endpoint record
   */
  static createWebhookEndpoint(options: Partial<WebhookEndpoint> = {}): WebhookEndpoint {
    return {
      id: crypto.randomUUID(),
      user_id: options.user_id || crypto.randomUUID(),
      url: options.url || `https://${faker.internet.domainName()}/webhooks/cu-bems`,
      events: options.events || ['data.updated', 'alert.triggered'],
      secret: options.secret || crypto.randomBytes(32).toString('hex'),
      is_active: options.is_active ?? true,
      created_at: options.created_at || new Date().toISOString(),
      delivery_stats: options.delivery_stats || {
        total_deliveries: 0,
        successful_deliveries: 0,
        failed_deliveries: 0,
        last_delivery_at: null
      },
      ...options
    }
  }

  /**
   * Create webhook delivery record
   */
  static createWebhookDelivery(webhookId: string, options: Partial<WebhookDelivery> = {}): WebhookDelivery {
    return {
      id: crypto.randomUUID(),
      webhook_id: webhookId,
      event_type: options.event_type || 'data.updated',
      payload: options.payload || { sensor_id: 'SENSOR_001', timestamp: new Date().toISOString() },
      signature: options.signature || crypto.randomBytes(32).toString('hex'),
      delivery_attempts: options.delivery_attempts || 1,
      status: options.status || 'delivered',
      response_status: options.response_status || 200,
      response_time_ms: options.response_time_ms || faker.number.int({ min: 50, max: 500 }),
      created_at: options.created_at || new Date().toISOString(),
      delivered_at: options.delivered_at || new Date().toISOString(),
      ...options
    }
  }
}

// API Usage Test Data Factory
export class ApiUsageTestFactory {
  /**
   * Create API usage record
   */
  static createUsageRecord(apiKeyId: string, options: Partial<ApiUsageRecord> = {}): ApiUsageRecord {
    return {
      id: crypto.randomUUID(),
      api_key_id: apiKeyId,
      user_id: options.user_id || crypto.randomUUID(),
      endpoint: options.endpoint || '/v1/data/timeseries',
      method: options.method || 'GET',
      response_status: options.response_status || 200,
      response_time_ms: options.response_time_ms || faker.number.int({ min: 50, max: 500 }),
      request_size_bytes: options.request_size_bytes || faker.number.int({ min: 100, max: 5000 }),
      response_size_bytes: options.response_size_bytes || faker.number.int({ min: 1000, max: 50000 }),
      ip_address: options.ip_address || faker.internet.ip(),
      user_agent: options.user_agent || faker.internet.userAgent(),
      timestamp: options.timestamp || new Date().toISOString(),
      ...options
    }
  }

  /**
   * Generate usage analytics summary
   */
  static generateUsageAnalytics(apiKeyId: string, timeframe: string): UsageAnalytics {
    const baseRequests = timeframe === '24_hours' ? 100 : timeframe === '7_days' ? 700 : 3000

    return {
      api_key_id: apiKeyId,
      timeframe,
      total_requests: baseRequests + faker.number.int({ min: -50, max: 200 }),
      successful_requests: Math.floor(baseRequests * 0.98),
      error_requests: Math.floor(baseRequests * 0.02),
      average_response_time: faker.number.float({ min: 200, max: 400, multipleOf: 0.1 }),
      p95_response_time: faker.number.float({ min: 400, max: 600, multipleOf: 0.1 }),
      top_endpoints: [
        { endpoint: '/v1/data/timeseries', requests: Math.floor(baseRequests * 0.4) },
        { endpoint: '/v1/data/summary', requests: Math.floor(baseRequests * 0.3) },
        { endpoint: '/v1/data/analytics', requests: Math.floor(baseRequests * 0.2) },
        { endpoint: '/v1/exports/create', requests: Math.floor(baseRequests * 0.1) }
      ],
      error_breakdown: {
        '400': Math.floor(baseRequests * 0.01),
        '401': Math.floor(baseRequests * 0.005),
        '429': Math.floor(baseRequests * 0.003),
        '500': Math.floor(baseRequests * 0.002)
      }
    }
  }
}

// Type Definitions
export interface ApiKeyRecord {
  id: string
  user_id: string
  name: string
  key_hash: string
  key_prefix: string
  scopes: string[]
  rate_limit_tier: 'free' | 'professional' | 'enterprise'
  created_at: string
  expires_at?: string
  last_used_at?: string
  is_active: boolean
  usage_stats: {
    total_requests: number
    requests_this_month: number
    last_request_at?: string
  }
}

export interface UserRecord {
  id: string
  email: string
  name: string
  subscription_tier: 'free' | 'professional' | 'enterprise'
  stripe_customer_id: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface SensorConfig {
  sensor_id: string
  equipment_type: string
  floor_number: number
  location: {
    building: string
    floor: number
    zone: string
    room: string
  }
  installation_date: string
  calibration_date: string
  status: 'active' | 'maintenance' | 'error'
  unit: string
  thresholds: {
    warning: number
    critical: number
  }
}

export interface TimeSeriesDataPoint {
  timestamp: string
  value: number
  sensor_id: string
  status: 'normal' | 'warning' | 'error'
  metadata: {
    equipment_type: string
    floor_number: number
    unit: string
  }
}

export interface TimeSeriesOptions {
  startDate?: string
  endDate?: string
  intervalMinutes?: number
}

export interface BangkokDataset {
  metadata: {
    building_name: string
    total_sensors: number
    total_floors: number
    data_period: {
      start: string
      end: string
    }
    measurement_interval: number
    generated_at: string
  }
  sensors: SensorConfig[]
  time_series_data: { [sensorId: string]: TimeSeriesDataPoint[] }
}

export interface AnalyticalInsights {
  sensor_id: string
  analysis_period: {
    start: string
    end: string
  }
  statistics: {
    mean: number
    median: number
    std_deviation: number
    min_value: number
    max_value: number
    total_readings: number
  }
  patterns: {
    daily_peak_hours: number[]
    weekly_patterns: string[]
    seasonal_trends: string
    anomaly_count: number
  }
  confidence_intervals: {
    mean_95: { lower: number, upper: number }
    prediction_95: { lower: number, upper: number }
  }
}

export interface WebhookEndpoint {
  id: string
  user_id: string
  url: string
  events: string[]
  secret: string
  is_active: boolean
  created_at: string
  delivery_stats: {
    total_deliveries: number
    successful_deliveries: number
    failed_deliveries: number
    last_delivery_at?: string
  }
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  event_type: string
  payload: unknown
  signature: string
  delivery_attempts: number
  status: 'pending' | 'delivered' | 'failed'
  response_status?: number
  response_time_ms?: number
  created_at: string
  delivered_at?: string
}

export interface ApiUsageRecord {
  id: string
  api_key_id: string
  user_id: string
  endpoint: string
  method: string
  response_status: number
  response_time_ms: number
  request_size_bytes?: number
  response_size_bytes?: number
  ip_address: string
  user_agent?: string
  timestamp: string
}

export interface UsageAnalytics {
  api_key_id: string
  timeframe: string
  total_requests: number
  successful_requests: number
  error_requests: number
  average_response_time: number
  p95_response_time: number
  top_endpoints: Array<{ endpoint: string, requests: number }>
  error_breakdown: { [status: string]: number }
}