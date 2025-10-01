/**
 * Pattern Detection Type Definitions
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Comprehensive type system for anomaly detection, pattern classification,
 * and predictive maintenance recommendations
 */

// Core pattern detection types
export interface DetectedPattern {
  id: string;
  timestamp: string;
  sensor_id: string;
  equipment_type: string;
  floor_number: number;
  pattern_type: PatternType;
  severity: PatternSeverity;
  confidence_score: number; // 0-100%
  description: string;
  data_points: PatternDataPoint[];
  recommendations: PatternRecommendation[];
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
  metadata: PatternMetadata;
}

// Pattern type classification
export type PatternType =
  | 'anomaly' // Statistical outliers
  | 'trend' // Gradual degradation trends
  | 'correlation' // Cross-equipment correlations
  | 'seasonal' // Seasonal pattern anomalies
  | 'threshold' // Threshold violations
  | 'frequency'; // Frequency-based anomalies

// Three-tier severity system
export type PatternSeverity = 'critical' | 'warning' | 'info';

// Pattern data points for visualization
export interface PatternDataPoint {
  timestamp: string;
  value: number;
  expected_value?: number;
  deviation: number;
  is_anomaly: boolean;
  severity_score: number;
}

// Pattern metadata for analysis
export interface PatternMetadata {
  detection_algorithm: string;
  analysis_window: string;
  threshold_used: number;
  historical_occurrences: number;
  last_occurrence?: string;
  statistical_metrics: StatisticalMetrics;
  correlation_factors?: CorrelationFactor[];
}

// Statistical analysis metrics
export interface StatisticalMetrics {
  mean: number;
  std_deviation: number;
  variance: number;
  median: number;
  q1: number;
  q3: number;
  z_score: number;
  percentile_rank: number;
  normality_test: number;
  seasonality_strength?: number;
}

// Cross-equipment correlation factors
export interface CorrelationFactor {
  related_sensor_id: string;
  correlation_coefficient: number;
  time_lag_minutes: number;
  confidence: number;
}

// Actionable maintenance recommendations
export interface PatternRecommendation {
  id: string;
  priority: RecommendationPriority;
  action_type: RecommendationActionType;
  description: string;
  estimated_cost: number;
  estimated_savings: number;
  time_to_implement_hours: number;
  urgency_deadline?: string;
  required_expertise: ExpertiseLevel;
  maintenance_category: MaintenanceCategory;
  success_probability: number; // 0-100%
}

// Recommendation classification
export type RecommendationPriority = 'high' | 'medium' | 'low';
export type RecommendationActionType =
  | 'inspection'
  | 'cleaning'
  | 'calibration'
  | 'replacement'
  | 'repair'
  | 'upgrade'
  | 'monitoring';

export type ExpertiseLevel = 'basic' | 'technician' | 'engineer' | 'specialist';
export type MaintenanceCategory =
  | 'preventive'
  | 'corrective'
  | 'predictive'
  | 'emergency';

// API request/response types
export interface PatternDetectionRequest {
  sensor_ids: string[];
  time_window: TimeWindow;
  severity_filter?: PatternSeverity[];
  confidence_threshold?: number; // 0-100, default 70
  pattern_types?: PatternType[];
  include_recommendations?: boolean;
}

export type TimeWindow = '1h' | '6h' | '24h' | '7d' | '30d';

export interface PatternDetectionResponse {
  success: boolean;
  data: {
    patterns: DetectedPattern[];
    summary: PatternSummary;
    analysis_metadata: AnalysisMetadata;
  };
  error?: string;
  message?: string;
  warnings?: string[];
}

// Pattern analysis summary
export interface PatternSummary {
  total_patterns: number;
  by_severity: Record<PatternSeverity, number>;
  by_type: Record<PatternType, number>;
  high_confidence_count: number;
  average_confidence: number;
  recommendations_count: number;
  critical_actions_required: number;
}

// Analysis execution metadata
export interface AnalysisMetadata {
  analysis_duration_ms: number;
  sensors_analyzed: number;
  data_points_processed: number;
  algorithms_used: string[];
  confidence_calibration: ConfidenceCalibration;
  performance_metrics: AnalysisPerformanceMetrics;
}

// Confidence scoring calibration
export interface ConfidenceCalibration {
  historical_accuracy: number;
  sample_size: number;
  calibration_date: string;
  reliability_score: number;
}

// Performance tracking
export interface AnalysisPerformanceMetrics {
  cpu_usage_ms: number;
  memory_peak_mb: number;
  cache_hit_rate: number;
  algorithm_efficiency: number;
}

// Historical pattern correlation
export interface PatternHistory {
  pattern_id: string;
  historical_matches: HistoricalMatch[];
  trend_analysis: TrendAnalysis;
  seasonal_patterns: SeasonalPattern[];
  prediction_accuracy: PredictionAccuracy;
}

export interface HistoricalMatch {
  match_date: string;
  similarity_score: number;
  outcome: HistoricalOutcome;
  maintenance_action_taken?: string;
  effectiveness_score?: number;
}

export type HistoricalOutcome =
  | 'failure_prevented'
  | 'failure_occurred'
  | 'false_positive'
  | 'unknown';

// Trend analysis for degradation patterns
export interface TrendAnalysis {
  trend_direction: 'improving' | 'degrading' | 'stable' | 'volatile';
  trend_strength: number; // 0-1
  projected_failure_date?: string;
  confidence_interval: {
    lower_bound: string;
    upper_bound: string;
    confidence_level: number;
  };
  trend_components: TrendComponent[];
}

export interface TrendComponent {
  component_type: 'linear' | 'seasonal' | 'irregular';
  strength: number;
  period?: string;
  description: string;
}

// Seasonal pattern analysis
export interface SeasonalPattern {
  pattern_name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  strength: number;
  peak_periods: string[];
  historical_correlation: number;
}

// Prediction accuracy tracking
export interface PredictionAccuracy {
  total_predictions: number;
  correct_predictions: number;
  false_positives: number;
  false_negatives: number;
  precision: number;
  recall: number;
  f1_score: number;
  last_updated: string;
}

// Pattern acknowledgment tracking
export interface PatternAcknowledgment {
  pattern_id: string;
  acknowledged_by: string;
  acknowledged_at: string;
  notes?: string;
  action_taken?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  outcome?: AcknowledgmentOutcome;
}

export type AcknowledgmentOutcome =
  | 'resolved'
  | 'monitoring'
  | 'escalated'
  | 'false_positive';

// Real-time pattern alerts
export interface PatternAlert {
  id: string;
  pattern_id: string;
  alert_type: AlertType;
  urgency: AlertUrgency;
  message: string;
  created_at: string;
  expires_at?: string;
  channels: AlertChannel[];
  acknowledged: boolean;
}

export type AlertType = 'immediate' | 'scheduled' | 'reminder';
export type AlertUrgency = 'critical' | 'high' | 'medium' | 'low';
export type AlertChannel = 'dashboard' | 'email' | 'sms' | 'webhook';

// Recommendation generation context - comprehensive building context
export interface RecommendationContext {
  building_profile: {
    building_type: string;
    total_floors: number;
    total_sensors: number;
    operational_hours: { start: string; end: string };
    maintenance_budget: number;
    staff_expertise?: ExpertiseLevel[];
  };
  current_conditions: {
    outdoor_temperature: number;
    humidity: number;
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    occupancy_level: 'low' | 'medium' | 'high';
  };
  maintenance_history: MaintenanceRecord[];
  equipment_age: number;
  criticality_level: 'low' | 'medium' | 'high';
  operational_criticality: 'low' | 'medium' | 'high';
  equipment_age_months?: number;
  last_maintenance_date?: string;
  failure_history?: number;
  budget_constraints?: number;
  available_expertise?: ExpertiseLevel[];
  maintenance_window_hours?: number;
}

export interface MaintenanceRecord {
  date: string;
  action_type: string;
  cost: number;
  effectiveness: number;
  equipment_type: string;
}

// Algorithm configuration
export interface AnomalyDetectionConfig {
  algorithm_type: AlgorithmType;
  sensitivity: number; // 1-10 scale
  threshold_multiplier: number;
  minimum_data_points: number;
  lookback_period: string;
  seasonal_adjustment: boolean;
  outlier_handling: OutlierHandling;
  confidence_method: ConfidenceMethod;
}

export type AlgorithmType =
  | 'statistical_zscore'
  | 'modified_zscore'
  | 'isolation_forest'
  | 'moving_average'
  | 'seasonal_decomposition'
  | 'interquartile_range';

export type OutlierHandling = 'include' | 'exclude' | 'cap';
export type ConfidenceMethod = 'statistical' | 'historical' | 'ensemble';

// Equipment-specific thresholds
export interface EquipmentThresholds {
  equipment_type: string;
  normal_ranges: {
    min: number;
    max: number;
    optimal_min: number;
    optimal_max: number;
  };
  anomaly_sensitivity: number;
  critical_thresholds: {
    absolute_min: number;
    absolute_max: number;
    rate_of_change_limit: number;
  };
  maintenance_schedules: MaintenanceSchedule[];
}

export interface MaintenanceSchedule {
  action_type: string;
  frequency_days: number;
  last_performed?: string;
  next_due: string;
  priority: number;
}

// Bangkok-specific equipment mappings
export interface BangkokEquipmentMap {
  sensor_id: string;
  equipment_type: 'HVAC' | 'Lighting' | 'Power' | 'Water' | 'Security';
  floor_number: number;
  zone: string;
  installation_date: string;
  last_maintenance: string;
  operational_hours: number;
  efficiency_rating: number;
  failure_history: EquipmentFailure[];
}

export interface EquipmentFailure {
  failure_date: string;
  failure_type: string;
  downtime_hours: number;
  repair_cost: number;
  root_cause?: string;
  prevention_possible: boolean;
}

// API endpoint interfaces
export interface PatternHistoryRequest {
  sensor_id?: string;
  date_range: {
    start_date: string;
    end_date: string;
  };
  pattern_types?: PatternType[];
  include_correlations?: boolean;
}

export interface RecommendationRequest {
  pattern_id: string;
  include_cost_analysis?: boolean;
  maintenance_budget_limit?: number;
  available_expertise?: ExpertiseLevel[];
}

export interface PatternAcknowledgmentRequest {
  pattern_id: string;
  notes?: string;
  action_planned?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
}

// Chart/visualization data types
export interface PatternChartData {
  timestamps: string[];
  sensor_values: number[];
  expected_values: number[];
  anomaly_markers: AnomalyMarker[];
  confidence_bands: ConfidenceBand[];
  threshold_lines: ThresholdLine[];
}

export interface AnomalyMarker {
  timestamp: string;
  value: number;
  severity: PatternSeverity;
  confidence: number;
  pattern_type: PatternType;
}

export interface ConfidenceBand {
  timestamp: string;
  upper_bound: number;
  lower_bound: number;
  confidence_level: number;
}

export interface ThresholdLine {
  name: string;
  value: number;
  color: string;
  line_type: 'solid' | 'dashed' | 'dotted';
}

// Time series data interface for pattern analysis
export interface TimeSeriesData {
  sensor_id: string;
  timestamps: string[];
  values: number[];
  equipment_type: string;
  floor_number: number;
  unit: string;
}
