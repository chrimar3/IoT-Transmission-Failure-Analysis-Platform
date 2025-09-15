/**
 * API Response Types for CU-BEMS IoT Platform
 */

export interface SensorReading {
  timestamp: string
  sensor_id: string
  floor_number: number
  equipment_type: string
  reading_value: number
  unit: string
  status: 'normal' | 'warning' | 'critical' | 'offline'
}

export interface DashboardMetrics {
  total_sensors: number
  active_sensors: number
  offline_sensors: number
  avg_power_consumption: number
  total_power_consumption: number
  failure_count_24h: number
  health_percentage: number
  last_updated: string
}

export interface TimeSeriesResponse {
  data: SensorReading[]
  total_count: number
  date_range: {
    start: string
    end: string
  }
  pagination: {
    page: number
    limit: number
    total_pages: number
  }
}

export interface FailurePattern {
  pattern_id: string
  equipment_type: string
  floor_number?: number
  sensor_id?: string
  failure_frequency: number
  average_downtime_minutes: number
  estimated_cost_impact: number
  confidence_score: number
  detected_at: string
}

export interface PatternDetectionResponse {
  patterns: FailurePattern[]
  analysis_period: {
    start: string
    end: string
  }
  total_patterns_found: number
  total_estimated_impact: number
}

export interface ApiError {
  error: string
  message: string
  timestamp: string
  status: number
}

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
  success: boolean
}

// Request parameter types for API routes (matches URLSearchParams.get() return type)
export interface TimeSeriesQueryParams {
  start_date: string | null
  end_date: string | null
  sensor_id: string | null
  floor_number: string | null
  equipment_type: string | null
  limit: string | null
  offset: string | null
}

export interface PatternsQueryParams {
  start_date: string | null
  end_date: string | null
  min_confidence: string | null
  equipment_type: string | null
  floor_number: string | null
}

// Request validation helpers
export function validateDateString(date: string | null): Date | null {
  if (!date) return null
  const parsed = new Date(date)
  return isNaN(parsed.getTime()) ? null : parsed
}

export function validateNumericParam(param: string | null, defaultValue?: number): number | undefined {
  if (!param) return defaultValue
  const parsed = parseInt(param, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

export function validateFloatParam(param: string | null, defaultValue: number = 0): number {
  if (!param) return defaultValue
  const parsed = parseFloat(param)
  return isNaN(parsed) ? defaultValue : parsed
}

// Type guards for request validation
export function isValidEquipmentType(type: string): type is 'HVAC' | 'Lighting' | 'Security' {
  return ['HVAC', 'Lighting', 'Security'].includes(type)
}

export function isValidStatus(status: string): status is 'normal' | 'warning' | 'critical' | 'offline' {
  return ['normal', 'warning', 'critical', 'offline'].includes(status)
}