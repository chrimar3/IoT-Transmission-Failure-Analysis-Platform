/**
 * Custom Alert Configuration System
 * Story 4.1: Custom Alert Configuration
 *
 * Comprehensive TypeScript definitions for configurable alert system
 */

// Core Alert Configuration Types
export interface AlertConfiguration {
  id: string
  name: string
  description: string
  user_id: string
  organization_id: string
  status: AlertConfigStatus
  created_at: string
  updated_at: string
  created_by: string
  rules: AlertRule[]
  notification_settings: NotificationSettings
  escalation_policy?: EscalationPolicy
  metadata: AlertMetadata
}

export type AlertConfigStatus = 'active' | 'inactive' | 'draft' | 'testing'

export interface AlertRule {
  id: string
  name: string
  description: string
  enabled: boolean
  priority: AlertPriority
  conditions: AlertCondition[]
  logical_operator: LogicalOperator
  evaluation_window: number // minutes
  cooldown_period: number // minutes
  suppress_duplicates: boolean
  tags: string[]
}

export type AlertPriority = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type LogicalOperator = 'AND' | 'OR'

// Alert Conditions and Metrics
export interface AlertCondition {
  id: string
  metric: AlertMetric
  operator: ComparisonOperator
  threshold: ThresholdValue
  time_aggregation: TimeAggregation
  filters: MetricFilter[]
  anomaly_detection?: AnomalyDetectionConfig
}

export interface AlertMetric {
  type: MetricType
  sensor_id?: string
  sensor_group?: string
  system_component?: SystemComponent
  calculation?: MetricCalculation
  units: string
  display_name: string
}

export type MetricType =
  | 'energy_consumption'
  | 'power_demand'
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'air_quality'
  | 'occupancy'
  | 'equipment_status'
  | 'efficiency_ratio'
  | 'cost_per_hour'
  | 'carbon_emissions'
  | 'system_health'
  | 'sensor_connectivity'
  | 'data_quality'

export type SystemComponent =
  | 'hvac'
  | 'lighting'
  | 'security'
  | 'elevators'
  | 'fire_safety'
  | 'plumbing'
  | 'electrical'
  | 'building_automation'
  | 'renewable_energy'

export type ComparisonOperator =
  | 'greater_than'
  | 'less_than'
  | 'equals'
  | 'not_equals'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'between'
  | 'outside_range'
  | 'percentage_change'
  | 'rate_of_change'
  | 'anomaly_detected'

export interface ThresholdValue {
  value: number
  secondary_value?: number // for range comparisons
  percentage?: boolean
  baseline_period?: string // for percentage/rate comparisons
  confidence_level?: number // for anomaly detection
}

export interface TimeAggregation {
  function: AggregationFunction
  period: number // minutes
  minimum_data_points: number
}

export type AggregationFunction =
  | 'average'
  | 'sum'
  | 'minimum'
  | 'maximum'
  | 'count'
  | 'median'
  | 'percentile'
  | 'standard_deviation'
  | 'rate_of_change'

export interface MetricFilter {
  field: string
  operator: string
  value: string | number | boolean
}

export interface MetricCalculation {
  formula: string
  variables: { [key: string]: AlertMetric }
  result_unit: string
}

export interface AnomalyDetectionConfig {
  algorithm: AnomalyAlgorithm
  sensitivity: number // 0-100
  training_period_days: number
  seasonal_adjustment: boolean
  exclude_weekends: boolean
  exclude_holidays: boolean
}

export type AnomalyAlgorithm =
  | 'isolation_forest'
  | 'statistical_outlier'
  | 'lstm_autoencoder'
  | 'seasonal_decomposition'
  | 'moving_average_deviation'

// Notification System
export interface NotificationSettings {
  channels: NotificationChannel[]
  recipients: NotificationRecipient[]
  frequency_limits: FrequencyLimits
  quiet_hours: QuietHours
  escalation_delays: number[] // minutes between escalation levels
  custom_message_template?: string
}

export interface NotificationChannel {
  type: ChannelType
  enabled: boolean
  configuration: ChannelConfiguration
  priority_filter: AlertPriority[]
}

export type ChannelType = 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'teams' | 'phone'

export interface ChannelConfiguration {
  // Email specific
  email_addresses?: string[]
  email_template?: string

  // SMS specific
  phone_numbers?: string[]
  sms_provider?: string

  // Webhook specific
  webhook_url?: string
  webhook_method?: 'POST' | 'PUT' | 'PATCH'
  webhook_headers?: { [key: string]: string }
  webhook_payload_template?: string
  webhook_timeout?: number
  webhook_retry_attempts?: number

  // Slack specific
  slack_channel?: string
  slack_webhook_url?: string
  slack_mention_users?: string[]

  // Teams specific
  teams_webhook_url?: string
  teams_mention_users?: string[]

  // Push notification specific
  push_topic?: string
  push_device_tokens?: string[]

  // Phone call specific
  phone_service_provider?: string
  phone_script_template?: string
}

export interface NotificationRecipient {
  id: string
  name: string
  contact_methods: ContactMethod[]
  role: string
  department: string
  escalation_level: number
  on_call_schedule?: OnCallSchedule
  notification_preferences: NotificationPreferences
}

export interface ContactMethod {
  type: ChannelType
  value: string // email, phone number, etc.
  verified: boolean
  primary: boolean
}

export interface OnCallSchedule {
  timezone: string
  schedules: SchedulePeriod[]
  coverage_required: boolean
}

export interface SchedulePeriod {
  days_of_week: number[] // 0=Sunday, 6=Saturday
  start_time: string // HH:mm format
  end_time: string // HH:mm format
  effective_date_start: string
  effective_date_end?: string
}

export interface NotificationPreferences {
  channels_by_priority: { [priority in AlertPriority]: ChannelType[] }
  max_notifications_per_hour: number
  quiet_hours_enabled: boolean
  weekend_notifications: boolean
  vacation_mode: boolean
}

export interface FrequencyLimits {
  max_alerts_per_hour: number
  max_alerts_per_day: number
  cooldown_between_similar: number // minutes
  escalation_threshold: number // alerts before escalation
}

export interface QuietHours {
  enabled: boolean
  start_time: string // HH:mm
  end_time: string // HH:mm
  timezone: string
  exceptions: string[] // alert IDs that ignore quiet hours
  weekend_override: boolean
}

// Escalation Policies
export interface EscalationPolicy {
  id: string
  name: string
  description: string
  stages: EscalationStage[]
  max_escalations: number
  escalation_timeout: number // minutes
  auto_resolve: boolean
  auto_resolve_timeout: number // minutes
}

export interface EscalationStage {
  level: number
  delay_minutes: number
  recipients: string[] // recipient IDs
  channels: ChannelType[]
  require_acknowledgment: boolean
  acknowledgment_timeout: number // minutes
  skip_if_acknowledged: boolean
  custom_message?: string
}

// Alert Metadata and Context
export interface AlertMetadata {
  category: AlertCategory
  severity_auto_adjust: boolean
  business_impact: BusinessImpact
  cost_impact_threshold?: number
  affected_systems: SystemComponent[]
  affected_locations: string[]
  documentation_links: string[]
  runbook_url?: string
  tags: string[]
  custom_fields: { [key: string]: unknown }
}

export type AlertCategory =
  | 'energy_efficiency'
  | 'equipment_health'
  | 'occupant_comfort'
  | 'security'
  | 'safety'
  | 'cost_optimization'
  | 'maintenance'
  | 'compliance'
  | 'sustainability'
  | 'operational'

export interface BusinessImpact {
  level: ImpactLevel
  estimated_cost_per_hour?: number
  affected_occupants?: number
  operational_severity: OperationalSeverity
  compliance_risk: boolean
  safety_risk: boolean
}

export type ImpactLevel = 'critical' | 'high' | 'medium' | 'low' | 'minimal'
export type OperationalSeverity = 'system_down' | 'degraded_performance' | 'efficiency_loss' | 'monitoring_only'

// Alert Instance and Lifecycle
export interface AlertInstance {
  id: string
  configuration_id: string
  rule_id: string
  status: AlertInstanceStatus
  severity: AlertPriority
  title: string
  description: string
  metric_values: MetricSnapshot[]
  triggered_at: string
  acknowledged_at?: string
  resolved_at?: string
  escalated_at?: string
  escalation_level: number
  acknowledged_by?: string
  resolved_by?: string
  resolution_notes?: string
  false_positive: boolean
  suppressed: boolean
  notification_log: NotificationLog[]
  context: AlertContext
}

export type AlertInstanceStatus =
  | 'triggered'
  | 'acknowledged'
  | 'investigating'
  | 'resolved'
  | 'suppressed'
  | 'expired'
  | 'false_positive'

export interface MetricSnapshot {
  metric: AlertMetric
  value: number
  threshold: number
  timestamp: string
  evaluation_window: string
  contributing_factors: string[]
}

export interface NotificationLog {
  id: string
  channel: ChannelType
  recipient: string
  sent_at: string
  delivered_at?: string
  acknowledged_at?: string
  status: NotificationStatus
  error_message?: string
  retry_count: number
}

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'acknowledged'

export interface AlertContext {
  sensor_data: SensorDataContext[]
  system_status: SystemStatus[]
  recent_changes: SystemChange[]
  related_alerts: string[]
  weather_conditions?: WeatherContext
  occupancy_status?: OccupancyContext
  energy_market_data?: EnergyMarketContext
}

export interface SensorDataContext {
  sensor_id: string
  sensor_name: string
  current_value: number
  historical_average: number
  trend: 'increasing' | 'decreasing' | 'stable'
  last_calibration: string
  health_status: 'healthy' | 'warning' | 'error'
}

export interface SystemStatus {
  system: SystemComponent
  status: 'operational' | 'degraded' | 'offline' | 'maintenance'
  uptime_percentage: number
  last_maintenance: string
  next_maintenance: string
}

export interface SystemChange {
  timestamp: string
  change_type: 'configuration' | 'maintenance' | 'upgrade' | 'repair'
  description: string
  affected_systems: SystemComponent[]
  performed_by: string
}

export interface WeatherContext {
  temperature: number
  humidity: number
  wind_speed: number
  solar_irradiance: number
  weather_condition: string
  forecast_change: string
}

export interface OccupancyContext {
  current_occupancy: number
  typical_occupancy: number
  occupancy_trend: string
  events_scheduled: string[]
}

export interface EnergyMarketContext {
  current_rate: number
  peak_rate_period: boolean
  demand_response_event: boolean
  grid_carbon_intensity: number
}

// Alert Analytics and Reporting
export interface AlertAnalytics {
  summary: AlertSummary
  trends: AlertTrends
  performance: AlertPerformance
  patterns: AlertPatterns
  recommendations: AlertRecommendations
}

export interface AlertSummary {
  total_alerts: number
  active_alerts: number
  resolved_alerts: number
  false_positives: number
  avg_resolution_time: number // minutes
  alert_velocity: number // alerts per day
  by_severity: { [severity in AlertPriority]: number }
  by_category: { [category in AlertCategory]: number }
  by_system: { [system in SystemComponent]: number }
}

export interface AlertTrends {
  daily_counts: { date: string, count: number }[]
  weekly_patterns: { day_of_week: number, avg_count: number }[]
  hourly_patterns: { hour: number, avg_count: number }[]
  seasonal_patterns: { month: number, avg_count: number }[]
  severity_trends: { [severity in AlertPriority]: TrendData }
}

export interface TrendData {
  current_period: number
  previous_period: number
  change_percentage: number
  trend_direction: 'increasing' | 'decreasing' | 'stable'
}

export interface AlertPerformance {
  response_times: ResponseTimeMetrics
  resolution_rates: ResolutionRateMetrics
  notification_effectiveness: NotificationEffectiveness
  escalation_metrics: EscalationMetrics
}

export interface ResponseTimeMetrics {
  avg_acknowledgment_time: number // minutes
  avg_resolution_time: number // minutes
  by_severity: { [severity in AlertPriority]: ResponseTimeData }
  by_category: { [category in AlertCategory]: ResponseTimeData }
}

export interface ResponseTimeData {
  avg_time: number
  median_time: number
  percentile_95: number
  target_time: number
  met_target_percentage: number
}

export interface ResolutionRateMetrics {
  overall_resolution_rate: number // percentage
  first_time_resolution_rate: number // percentage
  escalation_rate: number // percentage
  false_positive_rate: number // percentage
  by_assignee: { [assignee: string]: number }
}

export interface NotificationEffectiveness {
  delivery_success_rate: number // percentage
  acknowledgment_rate: number // percentage
  response_rate: number // percentage
  by_channel: { [channel in ChannelType]: ChannelEffectiveness }
}

export interface ChannelEffectiveness {
  delivery_rate: number
  acknowledgment_rate: number
  avg_response_time: number
  user_preference_score: number
}

export interface EscalationMetrics {
  escalation_rate: number // percentage
  avg_escalation_levels: number
  escalation_effectiveness: number // percentage resolved after escalation
  de_escalation_rate: number // percentage resolved before final escalation
}

export interface AlertPatterns {
  common_triggers: TriggerPattern[]
  correlation_analysis: CorrelationPattern[]
  temporal_patterns: TemporalPattern[]
  recurring_issues: RecurringIssue[]
}

export interface TriggerPattern {
  trigger_combination: string[]
  frequency: number
  avg_impact: ImpactLevel
  common_resolution: string
  prevention_suggestion: string
}

export interface CorrelationPattern {
  primary_metric: string
  correlated_metrics: string[]
  correlation_strength: number
  lead_time: number // minutes
  predictive_value: number
}

export interface TemporalPattern {
  pattern_type: 'daily' | 'weekly' | 'monthly' | 'seasonal'
  pattern_description: string
  peak_times: string[]
  contributing_factors: string[]
  mitigation_strategies: string[]
}

export interface RecurringIssue {
  issue_pattern: string
  frequency: string
  last_occurrence: string
  root_cause_analysis: string
  recommended_permanent_fix: string
  estimated_fix_cost: number
}

export interface AlertRecommendations {
  threshold_adjustments: ThresholdRecommendation[]
  new_alert_suggestions: NewAlertSuggestion[]
  consolidation_opportunities: ConsolidationOpportunity[]
  optimization_suggestions: OptimizationSuggestion[]
}

export interface ThresholdRecommendation {
  alert_id: string
  current_threshold: number
  recommended_threshold: number
  reasoning: string
  expected_reduction_in_noise: number // percentage
  risk_assessment: string
}

export interface NewAlertSuggestion {
  metric: AlertMetric
  suggested_threshold: number
  business_justification: string
  estimated_value: number
  implementation_effort: 'low' | 'medium' | 'high'
}

export interface ConsolidationOpportunity {
  alert_ids: string[]
  consolidation_strategy: string
  expected_noise_reduction: number // percentage
  maintained_coverage: number // percentage
}

export interface OptimizationSuggestion {
  type: 'threshold' | 'notification' | 'escalation' | 'suppression'
  description: string
  implementation_steps: string[]
  expected_benefit: string
  effort_required: 'minimal' | 'moderate' | 'significant'
}

// Testing and Simulation
export interface AlertTest {
  id: string
  name: string
  description: string
  alert_configuration_id: string
  test_type: AlertTestType
  test_data: TestData
  expected_results: ExpectedResults
  actual_results?: ActualResults
  status: TestStatus
  created_at: string
  executed_at?: string
  executed_by?: string
}

export type AlertTestType = 'threshold_test' | 'notification_test' | 'escalation_test' | 'integration_test'
export type TestStatus = 'draft' | 'ready' | 'running' | 'passed' | 'failed' | 'error'

export interface TestData {
  simulated_metrics: SimulatedMetric[]
  duration_minutes: number
  trigger_conditions: TriggerCondition[]
}

export interface SimulatedMetric {
  metric: AlertMetric
  values: TimestampedValue[]
  injection_method: 'replace' | 'add' | 'multiply'
}

export interface TimestampedValue {
  timestamp: string
  value: number
}

export interface TriggerCondition {
  condition_id: string
  should_trigger: boolean
  expected_trigger_time?: string
}

export interface ExpectedResults {
  should_trigger: boolean
  expected_severity: AlertPriority
  expected_notifications: ExpectedNotification[]
  expected_escalations: number
}

export interface ExpectedNotification {
  channel: ChannelType
  recipient: string
  expected_delay_minutes: number
}

export interface ActualResults {
  triggered: boolean
  trigger_time?: string
  severity?: AlertPriority
  notifications_sent: ActualNotification[]
  escalations_performed: number
  resolution_time?: number
  test_duration: number
}

export interface ActualNotification {
  channel: ChannelType
  recipient: string
  sent_at: string
  delay_minutes: number
  delivery_status: NotificationStatus
}

// Professional Tier Limits and Validation
export interface AlertLimits {
  max_active_alerts: number
  max_custom_rules: number
  max_notification_channels: number
  max_recipients_per_alert: number
  max_escalation_levels: number
  advanced_metrics_enabled: boolean
  anomaly_detection_enabled: boolean
  api_integration_enabled: boolean
  custom_webhooks_enabled: boolean
  priority_support: boolean
}

export interface AlertValidation {
  is_valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: ValidationSuggestion[]
  estimated_alert_volume: number
  estimated_cost_impact: number
  subscription_compatibility: SubscriptionCompatibility
}

export interface ValidationError {
  field: string
  error_code: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  field: string
  warning_code: string
  message: string
  recommendation: string
}

export interface ValidationSuggestion {
  category: string
  suggestion: string
  benefit: string
  implementation_effort: string
}

export interface SubscriptionCompatibility {
  tier_required: 'free' | 'professional' | 'enterprise'
  features_available: string[]
  features_blocked: string[]
  upgrade_benefits: string[]
  estimated_monthly_cost: number
}

// API Request/Response Types
export interface CreateAlertConfigRequest {
  name: string
  description: string
  rules: Omit<AlertRule, 'id'>[]
  notification_settings: NotificationSettings
  escalation_policy?: Omit<EscalationPolicy, 'id'>
  metadata: Omit<AlertMetadata, 'created_at' | 'updated_at'>
}

export interface UpdateAlertConfigRequest {
  name?: string
  description?: string
  status?: AlertConfigStatus
  rules?: AlertRule[]
  notification_settings?: NotificationSettings
  escalation_policy?: EscalationPolicy
  metadata?: AlertMetadata
}

export interface AlertConfigResponse {
  success: boolean
  data?: AlertConfiguration
  error?: string
  validation?: AlertValidation
}

export interface AlertConfigListResponse {
  success: boolean
  data?: {
    configurations: AlertConfiguration[]
    total_count: number
    page: number
    page_size: number
  }
  error?: string
}

export interface AlertInstanceResponse {
  success: boolean
  data?: AlertInstance
  error?: string
}

export interface AlertAnalyticsResponse {
  success: boolean
  data?: AlertAnalytics
  error?: string
}

export interface TestAlertRequest {
  configuration_id: string
  test_type: AlertTestType
  test_data: TestData
  expected_results: ExpectedResults
}

export interface TestAlertResponse {
  success: boolean
  data?: AlertTest
  error?: string
}