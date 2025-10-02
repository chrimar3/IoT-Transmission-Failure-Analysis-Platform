/**
 * TypeScript interfaces for Supabase database schema
 * Generated from supabase-schema.sql for type safety
 */

export type Database = {
  public: {
    Tables: {
      validation_sessions: {
        Row: ValidationSession;
        Insert: Omit<ValidationSession, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ValidationSession, 'id' | 'created_at'>>;
      };
      validated_insights: {
        Row: ValidatedInsight;
        Insert: Omit<ValidatedInsight, 'id' | 'created_at'>;
        Update: Partial<Omit<ValidatedInsight, 'id' | 'created_at'>>;
      };
      savings_scenarios: {
        Row: SavingsScenario;
        Insert: Omit<SavingsScenario, 'id' | 'created_at'>;
        Update: Partial<Omit<SavingsScenario, 'id' | 'created_at'>>;
      };
      savings_breakdown: {
        Row: SavingsBreakdown;
        Insert: Omit<SavingsBreakdown, 'id' | 'created_at'>;
        Update: Partial<Omit<SavingsBreakdown, 'id' | 'created_at'>>;
      };
      data_quality_metrics: {
        Row: DataQualityMetrics;
        Insert: Omit<DataQualityMetrics, 'id' | 'created_at'>;
        Update: Partial<Omit<DataQualityMetrics, 'id' | 'created_at'>>;
      };
      floor_performance: {
        Row: FloorPerformance;
        Insert: Omit<FloorPerformance, 'id' | 'created_at'>;
        Update: Partial<Omit<FloorPerformance, 'id' | 'created_at'>>;
      };
      equipment_performance: {
        Row: EquipmentPerformance;
        Insert: Omit<EquipmentPerformance, 'id' | 'created_at'>;
        Update: Partial<Omit<EquipmentPerformance, 'id' | 'created_at'>>;
      };
      calculation_audit: {
        Row: CalculationAudit;
        Insert: Omit<CalculationAudit, 'id' | 'created_at'>;
        Update: Partial<Omit<CalculationAudit, 'id' | 'created_at'>>;
      };
      hardcoded_replacements: {
        Row: HardcodedReplacement;
        Insert: Omit<HardcodedReplacement, 'id' | 'replacement_date'>;
        Update: Partial<Omit<HardcodedReplacement, 'id' | 'replacement_date'>>;
      };
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>;
      };
      access_log: {
        Row: AccessLog;
        Insert: Omit<AccessLog, 'id' | 'accessed_at'>;
        Update: Partial<Omit<AccessLog, 'id' | 'accessed_at'>>;
      };
      system_config: {
        Row: SystemConfig;
        Insert: Omit<SystemConfig, 'id' | 'updated_at'>;
        Update: Partial<Omit<SystemConfig, 'id'>>;
      };
    };
    Views: {
      latest_validation_summary: {
        Row: LatestValidationSummary;
      };
      hardcoded_replacement_progress: {
        Row: HardcodedReplacementProgress;
      };
    };
    Functions: {
      calculate_data_quality_score: {
        Args: {
          p_total_records: number;
          p_valid_records: number;
          p_missing_values?: number;
          p_duplicate_records?: number;
          p_outlier_count?: number;
        };
        Returns: number;
      };
    };
  };
};

// =============================================
// CORE METADATA TYPES
// =============================================

export interface ValidationSession {
  id: string;
  session_name: string;
  dataset_version: string;
  total_records: number;
  data_quality_score?: number;
  analysis_started_at: string;
  analysis_completed_at?: string;
  bmad_phase?: 'build' | 'measure' | 'analyze' | 'decide';
  status?: 'running' | 'completed' | 'failed' | 'cancelled';
  created_by?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ValidatedInsight {
  id: string;
  session_id: string;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  validation_status: 'validated' | 'estimated' | 'requires_more_data';
  confidence_level: number;
  p_value?: number;
  sample_size: number;
  standard_error?: number;
  margin_of_error?: number;
  confidence_interval_lower?: number;
  confidence_interval_upper?: number;
  calculation_method: string;
  data_source: string;
  baseline_value?: number;
  trend_direction?: 'increasing' | 'decreasing' | 'stable';
  trend_rate?: number;
  trend_significance?: number;
  business_category?: 'energy' | 'maintenance' | 'efficiency' | 'cost' | 'reliability';
  severity?: 'info' | 'warning' | 'critical';
  description?: string;
  recommendation?: string;
  business_impact?: string;
  created_at: string;
}

export interface SavingsScenario {
  id: string;
  session_id: string;
  scenario_id: string;
  scenario_name: string;
  scenario_description?: string;
  category?: 'energy_optimization' | 'maintenance_prevention' | 'operational_efficiency';
  annual_savings: number;
  implementation_cost: number;
  effort_level?: 'low' | 'medium' | 'high';
  timeframe?: string;
  risk_level?: 'low' | 'medium' | 'high';
  roi_percentage?: number;
  payback_months?: number;
  net_present_value?: number;
  validation_status: 'validated' | 'estimated' | 'requires_validation';
  confidence_level: number;
  confidence_interval_lower?: number;
  confidence_interval_upper?: number;
  created_at: string;
}

export interface SavingsBreakdown {
  id: string;
  scenario_id: string;
  component_name: string;
  component_savings: number;
  calculation_method: string;
  data_source: string;
  confidence_level: number;
  percentage_of_total?: number;
  created_at: string;
}

// =============================================
// DATA QUALITY & MONITORING TYPES
// =============================================

export interface DataQualityMetrics {
  id: string;
  session_id: string;
  data_source: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  missing_values?: number;
  duplicate_records?: number;
  outlier_count?: number;
  quality_score: number;
  completeness_score: number;
  consistency_score: number;
  accuracy_score: number;
  quality_issues?: string[];
  created_at: string;
}

export interface FloorPerformance {
  id: string;
  session_id: string;
  floor_number: number;
  total_sensors: number;
  avg_consumption: number;
  normalized_consumption: number;
  deviation_from_mean?: number;
  z_score?: number;
  outlier_status?: 'normal' | 'anomaly' | 'critical_anomaly';
  sample_size: number;
  confidence_level: number;
  efficiency_score?: number;
  maintenance_priority?: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export interface EquipmentPerformance {
  id: string;
  session_id: string;
  equipment_type: string;
  sensor_count: number;
  performance_score: number;
  degradation_rate?: number;
  failure_risk?: number;
  maintenance_urgency?: 'low' | 'medium' | 'high' | 'critical';
  cost_impact_estimate?: number;
  cost_confidence_lower?: number;
  cost_confidence_upper?: number;
  cost_validation_status?: 'validated' | 'estimated';
  avg_power_consumption?: number;
  reliability_percentage?: number;
  failure_frequency?: number;
  optimization_potential?: number;
  created_at: string;
}

// =============================================
// AUDIT TRAIL TYPES
// =============================================

export interface CalculationAudit {
  id: string;
  session_id: string;
  calculation_type: string;
  calculation_name: string;
  input_data: Record<string, unknown>;
  calculation_method: string;
  statistical_method?: string;
  result_value?: number;
  result_unit?: string;
  confidence_level?: number;
  p_value?: number;
  sample_size?: number;
  validation_status?: 'validated' | 'estimated' | 'failed';
  error_message?: string;
  execution_time_ms?: number;
  data_sources: string[];
  assumptions?: string[];
  peer_reviewed?: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  created_by?: string;
  created_at: string;
}

export interface HardcodedReplacement {
  id: string;
  original_value: number;
  original_location: string;
  replacement_method: string;
  validated_value?: number;
  validation_confidence?: number;
  replacement_date: string;
  validation_session_id?: string;
  status?: 'pending' | 'replaced' | 'validated' | 'rejected';
  notes?: string;
  replaced_by?: string;
}

// =============================================
// USER MANAGEMENT TYPES
// =============================================

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role?: 'viewer' | 'analyst' | 'admin' | 'super_admin';
  department?: string;
  permissions?: Record<string, boolean>;
  last_login_at?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessLog {
  id: string;
  user_id?: string;
  session_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  accessed_at: string;
}

// =============================================
// CONFIGURATION TYPES
// =============================================

export interface SystemConfig {
  id: string;
  config_key: string;
  config_value: unknown;
  config_type: string;
  description?: string;
  is_active?: boolean;
  updated_by?: string;
  updated_at: string;
}

// =============================================
// VIEW TYPES
// =============================================

export interface LatestValidationSummary {
  id: string;
  session_name: string;
  dataset_version: string;
  total_records: number;
  data_quality_score?: number;
  bmad_phase?: string;
  status?: string;
  analysis_started_at: string;
  analysis_completed_at?: string;
  insights_count: number;
  scenarios_count: number;
  total_annual_savings?: number;
  avg_confidence_level?: number;
}

export interface HardcodedReplacementProgress {
  total_hardcoded_values: number;
  replaced_count: number;
  validated_count: number;
  pending_count: number;
  replacement_progress: number;
  validation_progress: number;
}

// =============================================
// UTILITY TYPES FOR VALIDATION FRAMEWORK
// =============================================

export interface ValidationMetadata {
  sampleSize: number;
  confidenceLevel: number;
  pValue?: number;
  standardError?: number;
  marginOfError?: number;
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  metadata: ValidationMetadata;
  issues: string[];
  recommendations: string[];
}

export interface BusinessMetric {
  name: string;
  value: number;
  unit: string;
  category: 'energy' | 'maintenance' | 'efficiency' | 'cost' | 'reliability';
  validation: ValidationResult;
  calculationMethod: string;
  dataSource: string;
}

export interface SavingsPortfolio {
  totalValidatedSavings: number;
  totalEstimatedSavings: number;
  overallConfidence: number;
  riskAdjustedTotal: number;
  scenarios: SavingsScenario[];
  implementationTimeline: ImplementationPhase[];
}

export interface ImplementationPhase {
  phase: string;
  scenarios: string[];
  cumulativeSavings: number;
  timeframe: string;
}

// =============================================
// API REQUEST/RESPONSE TYPES
// =============================================

export interface CreateValidationSessionRequest {
  session_name: string;
  dataset_version: string;
  total_records: number;
  bmad_phase?: 'build' | 'measure' | 'analyze' | 'decide';
  metadata?: Record<string, unknown>;
}

export interface ValidateInsightsRequest {
  session_id: string;
  insights: Omit<ValidatedInsight, 'id' | 'session_id' | 'created_at'>[];
}

export interface CalculateSavingsRequest {
  session_id: string;
  scenarios: string[];
  energy_rate?: number;
  demand_charge_rate?: number;
  maintenance_base_cost?: number;
}

export interface AuditCalculationRequest {
  session_id: string;
  calculation_type: string;
  calculation_name: string;
  input_data: Record<string, unknown>;
  calculation_method: string;
  statistical_method?: string;
}

export interface ValidationFrameworkResponse {
  session: ValidationSession;
  insights: ValidatedInsight[];
  scenarios: SavingsScenario[];
  quality_metrics: DataQualityMetrics[];
  audit_trail: CalculationAudit[];
}

// Type guards for runtime validation
export const isValidationStatus = (status: string): status is ValidatedInsight['validation_status'] => {
  return ['validated', 'estimated', 'requires_more_data'].includes(status);
};

export const isBmadPhase = (phase: string): phase is ValidationSession['bmad_phase'] => {
  return ['build', 'measure', 'analyze', 'decide'].includes(phase);
};

export const isUserRole = (role: string): role is UserProfile['role'] => {
  return ['viewer', 'analyst', 'admin', 'super_admin'].includes(role);
};

export const isMaintenanceUrgency = (urgency: string): urgency is EquipmentPerformance['maintenance_urgency'] => {
  return ['low', 'medium', 'high', 'critical'].includes(urgency);
};