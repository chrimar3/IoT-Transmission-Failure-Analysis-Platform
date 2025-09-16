/**
 * Database Types for CU-BEMS IoT Platform
 * Generated from database schema - do not edit manually
 */

// Core database types
export interface SensorReading {
  id: number
  timestamp: string
  sensor_id: string
  floor_number: number
  equipment_type: string | null
  reading_value: number | null
  unit: string | null
  status: 'normal' | 'warning' | 'error' | 'offline'
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  tier: 'free' | 'professional'
  stripe_subscription_id: string | null
  status: 'active' | 'cancelled' | 'past_due'
  created_at: string
  expires_at: string | null
  updated_at: string
}

export interface UserActivity {
  id: string
  user_id: string
  action_type: string
  resource_accessed: string | null
  timestamp: string
  ip_address: string | null
  user_agent: string | null
}

// Materialized view types
export interface DailyAggregate {
  date: string
  sensor_id: string
  floor_number: number
  equipment_type: string | null
  avg_value: number | null
  max_value: number | null
  min_value: number | null
  std_dev: number | null
  reading_count: number
  error_count: number
  warning_count: number
}

export interface HourlyAggregate {
  hour: string
  sensor_id: string
  floor_number: number
  equipment_type: string | null
  avg_value: number | null
  max_value: number | null
  min_value: number | null
  reading_count: number
  error_count: number
}

export interface SystemHealthSummary {
  date: string
  active_sensors: number
  total_readings: number
  avg_reading: number | null
  error_count: number
  warning_count: number
  offline_count: number
  health_percentage: number | null
}

export interface EquipmentPerformance {
  equipment_type: string | null
  floor_number: number
  sensor_count: number
  avg_value: number | null
  value_deviation: number | null
  error_count: number
  reliability_percentage: number | null
}

// API response types
export interface UserAccessSummary {
  user_id: string
  subscription_tier: string
  has_active_subscription: boolean
  data_access: 'full' | 'limited_7_days'
  rate_limits: {
    api_calls_per_hour: number
    exports_per_month: string | number
  }
  checked_at: string
}

// Query parameter types
export interface SensorReadingFilters {
  sensor_ids?: string[]
  floor_numbers?: number[]
  equipment_types?: string[]
  start_date?: string
  end_date?: string
  status?: SensorReading['status'][]
  limit?: number
  offset?: number
}

export interface DashboardMetrics {
  total_sensors: number
  active_sensors: number
  total_readings: number
  avg_reading: number
  health_percentage: number
  error_count: number
  warning_count: number
  last_updated: string
}

// Database function result types
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  reset_at: string
}

// Supabase database definition for type generation
export interface Database {
  public: {
    Tables: {
      sensor_readings: {
        Row: SensorReading
        Insert: Omit<SensorReading, 'id' | 'created_at'>
        Update: Partial<Omit<SensorReading, 'id' | 'created_at'>>
      }
      subscriptions: {
        Row: Subscription
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Subscription, 'id' | 'created_at'>>
      }
      user_activity: {
        Row: UserActivity
        Insert: Omit<UserActivity, 'id' | 'timestamp'>
        Update: Partial<Omit<UserActivity, 'id'>>
      }
      daily_aggregates: {
        Row: DailyAggregate
        Insert: never
        Update: never
      }
      hourly_aggregates: {
        Row: HourlyAggregate
        Insert: never
        Update: never
      }
      system_health_summary: {
        Row: SystemHealthSummary
        Insert: never
        Update: never
      }
      equipment_performance: {
        Row: EquipmentPerformance
        Insert: never
        Update: never
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_subscription_tier: {
        Args: { user_uuid: string }
        Returns: string
      }
      has_valid_subscription: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          user_uuid: string
          action_type: string
          time_window?: string
          max_actions?: number
        }
        Returns: boolean
      }
      log_user_activity: {
        Args: {
          user_uuid: string
          action_type: string
          resource_accessed?: string
          ip_address?: string
          user_agent?: string
        }
        Returns: boolean
      }
      get_user_access_summary: {
        Args: { user_uuid: string }
        Returns: UserAccessSummary
      }
      refresh_all_aggregates: {
        Args: Record<string, never>
        Returns: void
      }
    }
    Enums: {
      subscription_tier: 'free' | 'professional'
      subscription_status: 'active' | 'cancelled' | 'past_due'
      sensor_status: 'normal' | 'warning' | 'error' | 'offline'
    }
  }
}

// Type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]