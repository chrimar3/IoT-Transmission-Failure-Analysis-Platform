/**
 * API Management Type Definitions
 * Professional tier API access types for CU-BEMS platform
 */

export type ApiKeyScope = 'read:data' | 'read:analytics' | 'read:exports' | 'write:webhooks'

export type RateLimitTier = 'free' | 'professional' | 'enterprise'

export type WebhookEvent = 'data.updated' | 'alert.triggered' | 'export.completed' | 'pattern.detected'

export type ExportFormat = 'json' | 'csv' | 'excel' | 'xml'

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed'

// API Key Management
export interface ApiKey {
  id: string
  user_id: string
  name: string
  key_prefix: string
  scopes: ApiKeyScope[]
  rate_limit_tier: RateLimitTier
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

export interface CreateApiKeyRequest {
  name: string
  scopes: ApiKeyScope[]
  expires_at?: string
}

export interface CreateApiKeyResponse {
  api_key: ApiKey
  key: string // Only returned once during creation
  warning: string
}

// API Usage Tracking
export interface ApiUsage {
  id: string
  api_key_id: string
  user_id: string
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  response_status: number
  response_time_ms: number
  request_size_bytes?: number
  response_size_bytes?: number
  ip_address: string
  user_agent?: string
  timestamp: string
  error_message?: string
  request_params?: Record<string, unknown>
}

export interface ApiUsageStats {
  total_requests: number
  successful_requests: number
  failed_requests: number
  average_response_time: number
  requests_by_endpoint: Record<string, number>
  requests_by_day: Array<{
    date: string
    count: number
  }>
  top_errors: Array<{
    error: string
    count: number
  }>
}

// Rate Limiting
export interface RateLimit {
  id: string
  api_key_id: string
  user_id: string
  window_start: string
  window_end: string
  request_count: number
  tier_limit: number
  remaining: number
  reset_at: string
}

export interface RateLimitConfig {
  free: {
    requests_per_hour: number
    burst_allowance: number
  }
  professional: {
    requests_per_hour: number
    burst_allowance: number
  }
  enterprise: {
    requests_per_hour: number
    burst_allowance: number
  }
}

// Webhook Management
export interface WebhookEndpoint {
  id: string
  user_id: string
  url: string
  events: WebhookEvent[]
  secret: string
  is_active: boolean
  created_at: string
  last_delivery_at?: string
  delivery_stats: {
    total_deliveries: number
    successful_deliveries: number
    failed_deliveries: number
    last_delivery_at?: string
  }
}

export interface CreateWebhookRequest {
  url: string
  events: WebhookEvent[]
}

export interface WebhookDelivery {
  id: string
  webhook_endpoint_id: string
  event_type: WebhookEvent
  payload: Record<string, unknown>
  response_status?: number
  response_body?: string
  delivery_attempts: number
  delivered_at?: string
  failed_at?: string
  next_retry_at?: string
  created_at: string
}

export interface WebhookTestRequest {
  event_type: WebhookEvent
  test_payload?: Record<string, unknown>
}

// Export Jobs
export interface ApiExportJob {
  id: string
  api_key_id: string
  user_id: string
  export_type: string
  parameters: {
    format: ExportFormat
    start_date?: string
    end_date?: string
    sensor_ids?: string[]
    floor_numbers?: number[]
    equipment_types?: string[]
    include_metadata?: boolean
    compression?: boolean
  }
  status: ExportStatus
  file_url?: string
  file_size_bytes?: number
  progress_percentage: number
  error_message?: string
  created_at: string
  started_at?: string
  completed_at?: string
  expires_at?: string
}

export interface CreateExportJobRequest {
  export_type: string
  format: ExportFormat
  parameters: {
    start_date?: string
    end_date?: string
    sensor_ids?: string[]
    floor_numbers?: number[]
    equipment_types?: string[]
    include_metadata?: boolean
    compression?: boolean
  }
}

// API Response Formats
export interface ApiResponse<T> {
  success: boolean
  data: T
  meta: {
    request_id: string
    timestamp: string
    processing_time_ms: number
    rate_limit: {
      remaining: number
      reset_at: string
      limit: number
    }
  }
  links?: {
    next?: string
    prev?: string
    first?: string
    last?: string
  }
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
    suggestions?: string[]
  }
  meta: {
    request_id: string
    timestamp: string
    rate_limit?: {
      remaining: number
      reset_at: string
      limit: number
    }
  }
}

// Data Export API Types
export interface TimeSeriesExportData {
  timestamp: string
  sensor_id: string
  floor_number: number
  equipment_type: string
  reading_value: number
  unit: string
  status: 'normal' | 'warning' | 'error' | 'offline'
}

export interface AnalyticsExportData {
  period: string
  floor_number?: number
  equipment_type?: string
  metrics: {
    average_consumption: number
    peak_consumption: number
    efficiency_score: number
    anomaly_count: number
    uptime_percentage: number
  }
  confidence_intervals: {
    consumption_ci_lower: number
    consumption_ci_upper: number
    confidence_level: number
  }
  statistical_significance: {
    p_value: number
    test_statistic: number
    is_significant: boolean
  }
}

export interface PatternExportData {
  pattern_id: string
  pattern_type: 'anomaly' | 'efficiency' | 'maintenance' | 'usage'
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence_score: number
  detected_at: string
  affected_sensors: string[]
  floor_numbers: number[]
  equipment_types: string[]
  description: string
  recommendations: string[]
  statistical_evidence: {
    z_score: number
    p_value: number
    sample_size: number
  }
}

// API Documentation Types
export interface ApiEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  summary: string
  description: string
  parameters: Array<{
    name: string
    in: 'query' | 'path' | 'header' | 'body'
    required: boolean
    type: string
    description: string
    example?: unknown
  }>
  responses: Record<string, {
    description: string
    schema?: unknown
    example?: unknown
  }>
  scopes_required: ApiKeyScope[]
  rate_limit_cost: number
}

export interface ApiDocumentation {
  version: string
  base_url: string
  authentication: {
    type: 'api_key' | 'oauth2'
    description: string
    examples: string[]
  }
  rate_limiting: RateLimitConfig
  endpoints: ApiEndpoint[]
  webhook_events: Array<{
    event: WebhookEvent
    description: string
    payload_schema: unknown
    example_payload: unknown
  }>
  error_codes: Record<string, {
    description: string
    resolution: string
  }>
}