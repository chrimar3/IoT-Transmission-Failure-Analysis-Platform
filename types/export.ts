/**
 * Export and Reporting Type Definitions
 * Story 3.4: Data Export and Reporting
 *
 * Comprehensive type system for data export, report generation,
 * scheduled reporting, and usage tracking
 */

// Export formats supported
export type ExportFormat = 'csv' | 'excel' | 'pdf'

// Export job status progression
export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

// Delivery methods for exports
export type DeliveryMethod = 'download' | 'email'

// Schedule patterns for recurring reports
export type SchedulePattern = 'daily' | 'weekly' | 'monthly' | 'quarterly'

// Export data filters
export interface ExportFilters {
  sensor_ids: string[]
  date_range: {
    start_date: string
    end_date: string
  }
  equipment_types?: string[]
  floor_numbers?: number[]
  data_aggregation?: 'raw' | 'hourly' | 'daily' | 'weekly'
  status_filter?: string[]
}

// Export job creation request
export interface CreateExportRequest {
  format: ExportFormat
  filters: ExportFilters
  template_id?: string  // For PDF reports
  delivery_method: DeliveryMethod
  recipients?: string[] // For email delivery
  custom_filename?: string
  include_charts?: boolean  // For PDF reports
  branding_settings?: BrandingSettings
}

// Export job database model
export interface ExportJob {
  id: number
  user_id: string
  job_type: 'manual' | 'scheduled'
  export_format: ExportFormat
  status: ExportJobStatus
  file_path?: string
  file_size?: number
  file_url?: string
  parameters: ExportJobParameters
  progress_percent: number
  created_at: string
  completed_at?: string
  error_message?: string
  delivery_method: DeliveryMethod
  email_status?: EmailDeliveryStatus
}

// Export job parameters stored as JSONB
export interface ExportJobParameters {
  filters: ExportFilters
  template_id?: string
  recipients?: string[]
  custom_filename?: string
  include_charts?: boolean
  branding_settings?: BrandingSettings
  estimated_records: number
  optimization_settings?: OptimizationSettings
}

// Email delivery status tracking
export interface EmailDeliveryStatus {
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed'
  sent_at?: string
  delivered_at?: string
  bounce_reason?: string
  message_id?: string
  recipient_statuses: RecipientStatus[]
}

export interface RecipientStatus {
  email: string
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed'
  bounce_reason?: string
  delivered_at?: string
}

// Export optimization settings
export interface OptimizationSettings {
  chunk_size: number
  memory_limit_mb: number
  compression_enabled: boolean
  streaming_enabled: boolean
  parallel_processing: boolean
}

// Report template system
export interface ReportTemplate {
  id: string
  name: string
  description: string
  template_type: 'executive_summary' | 'detailed_analysis' | 'trend_report' | 'custom'
  is_custom: boolean
  is_default: boolean
  created_by?: string
  layout_config: TemplateLayout
  branding_settings: BrandingSettings
  chart_configurations: ChartConfiguration[]
  content_sections: ContentSection[]
  created_at: string
  updated_at: string
}

// Template layout configuration
export interface TemplateLayout {
  page_orientation: 'portrait' | 'landscape'
  page_size: 'A4' | 'letter' | 'legal'
  margins: {
    top: number
    bottom: number
    left: number
    right: number
  }
  header_height: number
  footer_height: number
  columns: number
  spacing: number
}

// Branding customization
export interface BrandingSettings {
  company_name?: string
  company_logo_url?: string
  primary_color?: string
  secondary_color?: string
  header_text?: string
  footer_text?: string
  watermark_text?: string
  show_generated_timestamp: boolean
}

// Chart configuration for reports
export interface ChartConfiguration {
  id: string
  chart_type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'heatmap'
  title: string
  data_source: string
  size: {
    width: number
    height: number
  }
  position: {
    x: number
    y: number
  }
  styling: ChartStyling
  filters?: ExportFilters
}

export interface ChartStyling {
  colors: string[]
  background_color?: string
  grid_enabled: boolean
  legend_position: 'top' | 'bottom' | 'left' | 'right' | 'none'
  axis_labels: {
    x_label?: string
    y_label?: string
  }
}

// Content section for reports
export interface ContentSection {
  id: string
  section_type: 'header' | 'summary' | 'chart' | 'table' | 'text' | 'footer'
  title?: string
  content?: string
  order: number
  styling: SectionStyling
  data_binding?: DataBinding
}

export interface SectionStyling {
  font_size: number
  font_weight: 'normal' | 'bold'
  text_align: 'left' | 'center' | 'right'
  background_color?: string
  border_enabled: boolean
  padding: number
  margin: number
}

export interface DataBinding {
  data_source: string
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'
  format?: 'number' | 'currency' | 'percentage' | 'date'
  filters?: ExportFilters
}

// Scheduled reports
export interface ScheduledReport {
  id: number
  user_id: string
  name: string
  description?: string
  template_id: string
  schedule_pattern: SchedulePattern
  schedule_config: ScheduleConfig
  recipients: string[]
  parameters: ScheduledReportParameters
  next_run_at: string
  last_run_at?: string
  last_job_id?: number
  is_active: boolean
  failure_count: number
  max_failures: number
  created_at: string
  updated_at: string
}

export interface ScheduleConfig {
  time_of_day: string  // HH:mm format
  day_of_week?: number  // 0-6 for weekly
  day_of_month?: number  // 1-31 for monthly
  timezone: string
  run_on_holidays: boolean
}

export interface ScheduledReportParameters {
  filters: ExportFilters
  export_format: ExportFormat
  branding_settings?: BrandingSettings
  email_subject?: string
  email_message?: string
  auto_update_filters: boolean  // Update date ranges automatically
}

// Report sharing
export interface ReportShare {
  id: number
  export_job_id: number
  share_token: string
  password_hash?: string
  expires_at: string
  access_count: number
  max_access_count?: number
  created_by: string
  created_at: string
  last_accessed_at?: string
  last_accessed_ip?: string
  is_active: boolean
}

// Share creation request
export interface CreateShareRequest {
  export_job_id: number
  expires_in_hours: number
  password?: string
  max_access_count?: number
  allow_download: boolean
  require_registration: boolean
}

// Share access response
export interface ShareAccessResponse {
  success: boolean
  report_info: {
    title: string
    format: ExportFormat
    file_size: number
    generated_at: string
    expires_at: string
  }
  download_url?: string
  preview_available: boolean
  access_remaining?: number
  error?: string
}

// Usage tracking
export interface ExportUsage {
  id: number
  user_id: string
  month_year: string  // YYYY-MM format
  export_count: number
  tier: string
  total_file_size: number
  email_count: number
  share_count: number
  created_at: string
  updated_at: string
}

// Usage limits by subscription tier
export interface UsageLimits {
  tier: string
  exports_per_month: number  // -1 for unlimited
  max_file_size_mb: number
  max_recipients_per_email: number
  scheduled_reports_limit: number
  share_links_per_month: number
  formats_allowed: ExportFormat[]
  features_enabled: ExportFeature[]
}

export type ExportFeature =
  | 'basic_export'
  | 'excel_export'
  | 'pdf_export'
  | 'email_delivery'
  | 'scheduled_reports'
  | 'custom_templates'
  | 'branding'
  | 'secure_sharing'
  | 'usage_analytics'

// API response types
export interface ExportStatusResponse {
  status: ExportJobStatus
  progress_percent: number
  estimated_completion_time?: string
  file_url?: string
  file_size?: number
  error_message?: string
  processing_info?: ProcessingInfo
}

export interface ProcessingInfo {
  records_processed: number
  total_records: number
  current_phase: string
  memory_usage_mb: number
  elapsed_time_seconds: number
}

export interface UsageResponse {
  export_count: number
  limit: number
  tier: string
  percentage_used: number
  resets_at: string
  features_available: ExportFeature[]
  can_export: boolean
  upgrade_required: boolean
}

// Error types
export interface ExportError {
  code: string
  message: string
  details?: unknown
  suggestions?: string[]
  retry_possible: boolean
}

// Export validation
export interface ExportValidation {
  is_valid: boolean
  estimated_records: number
  estimated_file_size_mb: number
  estimated_processing_time_seconds: number
  warnings: ValidationWarning[]
  errors: ValidationError[]
  subscription_check: SubscriptionValidation
}

export interface ValidationWarning {
  type: 'large_dataset' | 'long_processing' | 'subscription_limit' | 'email_quota'
  message: string
  recommended_action?: string
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface SubscriptionValidation {
  tier: string
  can_export: boolean
  format_allowed: boolean
  within_limits: boolean
  upgrade_required: boolean
  features_available: ExportFeature[]
}

// Export performance metrics
export interface ExportMetrics {
  job_id: number
  start_time: string
  end_time?: string
  records_processed: number
  file_size_bytes: number
  processing_time_seconds: number
  memory_peak_mb: number
  cpu_usage_percent: number
  optimization_applied: string[]
  performance_score: number  // 0-100
}

// File metadata
export interface ExportFileMetadata {
  filename: string
  size_bytes: number
  format: ExportFormat
  mime_type: string
  checksum: string
  compression_ratio?: number
  encoding: string
  created_at: string
  expires_at?: string
  download_count: number
}

// Email template system
export interface EmailTemplate {
  id: string
  name: string
  subject_template: string
  body_template: string
  variables: EmailVariable[]
  is_default: boolean
  created_by?: string
  created_at: string
}

export interface EmailVariable {
  name: string
  description: string
  example_value: string
  required: boolean
  type: 'string' | 'number' | 'date' | 'boolean'
}

// Email delivery configuration
export interface EmailDeliveryConfig {
  from_email: string
  from_name: string
  reply_to?: string
  template_id?: string
  custom_subject?: string
  custom_message?: string
  attachments: EmailAttachment[]
  tracking_enabled: boolean
  priority: 'low' | 'normal' | 'high'
}

export interface EmailAttachment {
  filename: string
  content_type: string
  file_path: string
  size_bytes: number
  inline: boolean
  content_id?: string
}

// Audit logging
export interface ExportAuditLog {
  id: number
  user_id: string
  action: 'export_created' | 'export_downloaded' | 'report_shared' | 'scheduled_report_created' | 'usage_exceeded'
  resource_type: 'export_job' | 'scheduled_report' | 'report_share'
  resource_id: string
  details: unknown
  ip_address?: string
  user_agent?: string
  timestamp: string
}

// Queue management
export interface ExportQueueStatus {
  position: number
  total_queued: number
  estimated_wait_time_seconds: number
  priority: 'low' | 'normal' | 'high'
  queue_name: string
}

// Export utilities and helpers
export interface ExportUtility {
  format: ExportFormat
  supports_streaming: boolean
  max_records: number
  memory_efficient: boolean
  chart_support: boolean
  compression_support: boolean
}

// Dashboard analytics
export interface ExportAnalytics {
  total_exports: number
  exports_by_format: Record<ExportFormat, number>
  exports_by_status: Record<ExportJobStatus, number>
  average_processing_time_seconds: number
  total_file_size_gb: number
  top_users: ExportUserStats[]
  usage_trends: UsageTrend[]
}

export interface ExportUserStats {
  user_id: string
  export_count: number
  total_file_size_mb: number
  tier: string
  most_used_format: ExportFormat
}

export interface UsageTrend {
  date: string
  export_count: number
  unique_users: number
  total_file_size_mb: number
  average_processing_time: number
}