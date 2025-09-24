/**
 * Report Builder Type Definitions
 * Advanced report generation and management types for Professional tier
 */

export type ReportCategory = 'executive' | 'operational' | 'compliance' | 'custom'
export type ReportFormat = 'pdf' | 'excel' | 'powerpoint' | 'word'
export type ReportStatus = 'generating' | 'completed' | 'failed'
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly'
export type ComponentType = 'chart' | 'table' | 'text' | 'image' | 'metric' | 'divider' | 'header'
export type ChartType = 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'gauge'
export type PermissionLevel = 'view' | 'edit' | 'admin'

// Report Template Data Models
export interface ReportTemplate {
  id: string
  user_id: string
  name: string
  description?: string
  category: ReportCategory
  template_data: ReportTemplateData
  is_public: boolean
  version: string
  tags: string[]
  thumbnail_url?: string
  created_at: string
  updated_at: string
  shared_with?: ReportShare[]
  usage_count: number
  rating?: number
}

export interface ReportTemplateData {
  layout: ReportLayout
  components: ReportComponent[]
  styling: ReportStyling
  branding: ReportBranding
  data_configuration: DataConfiguration
}

export interface DataConfiguration {
  sensors: string[]
  date_range: {
    start_date: string
    end_date: string
  }
  filters: Record<string, unknown>
  aggregation: 'raw' | 'hourly' | 'daily' | 'weekly' | 'monthly'
}

export interface ReportLayout {
  page_size: 'A4' | 'Letter' | 'Legal' | 'A3'
  orientation: 'portrait' | 'landscape'
  margins: {
    top: number
    bottom: number
    left: number
    right: number
  }
  header_height: number
  footer_height: number
  grid_columns: number
  grid_rows: number
}

export interface ReportComponent {
  id: string
  type: ComponentType
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  config: ComponentConfig
  data_binding?: DataBinding
  styling?: ComponentStyling
  dependencies?: string[]
}

export interface ComponentConfig {
  // Chart specific
  chart_type?: ChartType
  x_axis?: AxisConfiguration
  y_axis?: AxisConfiguration
  series?: SeriesConfiguration[]

  // Table specific
  columns?: TableColumn[]
  sorting?: SortConfiguration
  filtering?: FilterConfiguration

  // Text specific
  content?: string
  markdown?: boolean
  variables?: TextVariable[]

  // Metric specific
  value_source?: string
  format?: MetricFormat
  threshold?: ThresholdConfiguration

  // Image specific
  source?: string
  alt_text?: string
  caption?: string
}

export interface DataBinding {
  source: 'bangkok_dataset' | 'api_endpoint' | 'static_data'
  query?: DataQuery
  transformation?: DataTransformation
  refresh_interval?: number
}

export interface DataQuery {
  start_date?: string
  end_date?: string
  sensor_ids?: string[]
  floor_numbers?: number[]
  equipment_types?: string[]
  aggregation?: 'hour' | 'day' | 'week' | 'month'
  filters?: QueryFilter[]
}

export interface DataTransformation {
  type: 'aggregate' | 'calculate' | 'format' | 'filter'
  operation: string
  parameters: Record<string, unknown>
}

export interface ReportStyling {
  color_scheme: ColorScheme
  typography: Typography
  spacing: SpacingConfig
  borders: BorderConfig
}

export interface ReportBranding {
  company_logo?: string
  company_name?: string
  company_colors?: {
    primary: string
    secondary: string
    accent: string
  }
  watermark?: string
  footer_text?: string
  header_text?: string
}

// Generated Report Models
export interface GeneratedReport {
  id: string
  template_id: string
  user_id: string
  title: string
  generation_date: string
  data_period_start: string
  data_period_end: string
  format: ReportFormat
  file_url: string
  file_size_bytes: number
  status: ReportStatus
  error_message?: string
  metadata: ReportMetadata
  created_at: string
  expires_at?: string
  download_count: number
}

export interface ReportMetadata {
  data_points_included: number
  charts_generated: number
  tables_generated: number
  statistical_confidence: number
  generation_time_ms: number
  file_version: string
  template_version: string
}

// Report Scheduling
export interface ReportSchedule {
  id: string
  template_id: string
  user_id: string
  name: string
  description?: string
  frequency: ReportFrequency
  schedule_config: ScheduleConfiguration
  email_recipients: string[]
  is_active: boolean
  next_run_at: string
  last_run_at?: string
  last_success_at?: string
  failure_count: number
  created_at: string
  updated_at: string
}

export interface ScheduleConfiguration {
  day_of_week?: number // 0-6 (Sunday=0)
  day_of_month?: number // 1-31
  time_of_day: string // HH:MM format
  timezone: string
  data_lag_hours?: number // Hours to wait for data completeness
}

// Collaboration and Sharing
export interface ReportShare {
  id: string
  template_id: string
  shared_by: string
  shared_with: string
  permission_level: PermissionLevel
  created_at: string
  expires_at?: string
}

export interface ReportComment {
  id: string
  template_id: string
  user_id: string
  content: string
  position?: {
    component_id: string
    x?: number
    y?: number
  }
  resolved: boolean
  created_at: string
  updated_at: string
  replies?: ReportComment[]
}

export interface ReportRevision {
  id: string
  template_id: string
  version: string
  changes: ChangeRecord[]
  created_by: string
  created_at: string
  is_published: boolean
  change_summary: string
}

export interface ChangeRecord {
  type: 'add' | 'edit' | 'delete' | 'move'
  component_id?: string
  field_path?: string
  old_value?: unknown
  new_value?: unknown
  timestamp: string
}

// Supporting Types
export interface ColorScheme {
  primary: string
  secondary: string
  background: string
  surface: string
  text_primary: string
  text_secondary: string
  accent: string
  warning: string
  error: string
  success: string
}

export interface Typography {
  heading_font: string
  body_font: string
  heading_sizes: {
    h1: number
    h2: number
    h3: number
    h4: number
  }
  body_size: number
  line_height: number
}

export interface SpacingConfig {
  component_margin: number
  section_padding: number
  element_spacing: number
}

export interface BorderConfig {
  default_width: number
  default_color: string
  default_style: 'solid' | 'dashed' | 'dotted'
}

export interface AxisConfiguration {
  label: string
  show_grid: boolean
  tick_format?: string
  min_value?: number
  max_value?: number
}

export interface SeriesConfiguration {
  name: string
  color: string
  data_field: string
  chart_type?: ChartType
  line_style?: 'solid' | 'dashed' | 'dotted'
  fill_opacity?: number
}

export interface TableColumn {
  key: string
  label: string
  width?: number
  align?: 'left' | 'center' | 'right'
  format?: string
  sortable?: boolean
  filterable?: boolean
}

export interface SortConfiguration {
  column: string
  direction: 'asc' | 'desc'
}

export interface FilterConfiguration {
  column: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between'
  value: unknown
}

export interface TextVariable {
  name: string
  source: string
  format?: string
  default_value?: string
}

export interface MetricFormat {
  decimal_places: number
  unit: string
  prefix?: string
  suffix?: string
  show_change?: boolean
  change_period?: string
}

export interface ThresholdConfiguration {
  warning_value: number
  critical_value: number
  warning_color: string
  critical_color: string
}

export interface QueryFilter {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like'
  value: unknown
}

export interface ComponentStyling {
  background_color?: string
  border_color?: string
  border_width?: number
  border_radius?: number
  padding?: number
  margin?: number
  font_size?: number
  font_weight?: 'normal' | 'bold'
  text_color?: string
  text_align?: 'left' | 'center' | 'right'
}

// API Request/Response Types
export interface CreateReportTemplateRequest {
  name: string
  description?: string
  category: ReportCategory
  template_data?: Partial<ReportTemplateData>
  is_public?: boolean
  tags?: string[]
}

export interface UpdateReportTemplateRequest {
  name?: string
  description?: string
  category?: ReportCategory
  template_data?: Partial<ReportTemplateData>
  is_public?: boolean
  tags?: string[]
}

export interface GenerateReportRequest {
  template_id: string
  format: ReportFormat
  data_period_start?: string
  data_period_end?: string
  custom_parameters?: Record<string, unknown>
}

export interface CreateReportScheduleRequest {
  template_id: string
  name: string
  description?: string
  frequency: ReportFrequency
  schedule_config: ScheduleConfiguration
  email_recipients: string[]
}

export interface ShareReportTemplateRequest {
  template_id: string
  shared_with: string
  permission_level: PermissionLevel
  expires_at?: string
}

export interface CreateReportCommentRequest {
  template_id: string
  content: string
  position?: {
    component_id: string
    x?: number
    y?: number
  }
  parent_comment_id?: string
}

// Hook Return Types
export interface UseReportsReturn {
  templates: ReportTemplate[]
  generatedReports: GeneratedReport[]
  schedules: ReportSchedule[]
  loading: boolean
  error: string | null
  createTemplate: (data: CreateReportTemplateRequest) => Promise<ReportTemplate>
  updateTemplate: (id: string, data: UpdateReportTemplateRequest) => Promise<ReportTemplate>
  deleteTemplate: (id: string) => Promise<void>
  generateReport: (data: GenerateReportRequest) => Promise<GeneratedReport>
  getReportStatus: (id: string) => Promise<GeneratedReport>
  downloadReport: (id: string) => Promise<Blob>
  createSchedule: (data: CreateReportScheduleRequest) => Promise<ReportSchedule>
  updateSchedule: (id: string, data: Partial<CreateReportScheduleRequest>) => Promise<ReportSchedule>
  deleteSchedule: (id: string) => Promise<void>
}

export interface UseReportBuilderReturn {
  template: ReportTemplate | null
  components: ReportComponent[]
  selectedComponent: ReportComponent | null
  isEditing: boolean
  isDirty: boolean
  addComponent: (type: ComponentType, position: { x: number; y: number }) => void
  updateComponent: (id: string, updates: Partial<ReportComponent>) => void
  deleteComponent: (id: string) => void
  selectComponent: (id: string | null) => void
  moveComponent: (id: string, position: { x: number; y: number }) => void
  resizeComponent: (id: string, size: { width: number; height: number }) => void
  duplicateComponent: (id: string) => void
  saveTemplate: () => Promise<void>
  loadTemplate: (id: string) => Promise<void>
  resetTemplate: () => void
  previewReport: () => Promise<string>
}

// Default configurations
export const DEFAULT_REPORT_LAYOUT: ReportLayout = {
  page_size: 'A4',
  orientation: 'portrait',
  margins: {
    top: 20,
    bottom: 20,
    left: 20,
    right: 20
  },
  header_height: 60,
  footer_height: 40,
  grid_columns: 12,
  grid_rows: 20
}

export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  primary: '#2563eb',
  secondary: '#64748b',
  background: '#ffffff',
  surface: '#f8fafc',
  text_primary: '#1e293b',
  text_secondary: '#64748b',
  accent: '#0ea5e9',
  warning: '#f59e0b',
  error: '#dc2626',
  success: '#16a34a'
}

export const DEFAULT_TYPOGRAPHY: Typography = {
  heading_font: 'Inter',
  body_font: 'Inter',
  heading_sizes: {
    h1: 24,
    h2: 20,
    h3: 18,
    h4: 16
  },
  body_size: 14,
  line_height: 1.5
}