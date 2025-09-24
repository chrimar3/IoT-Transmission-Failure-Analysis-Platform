/**
 * Executive Dashboard Type Definitions
 * Story 3.1: Executive Summary Dashboard
 *
 * Comprehensive TypeScript definitions for the executive analytics dashboard
 */

// Core dashboard data types
export interface ExecutiveDashboardData {
  summary: ExecutiveSummary
  kpis: KeyPerformanceIndicators
  buildingHealth: BuildingHealthScore
  alerts: AlertSystem
  energyMetrics: EnergyEfficiencyMetrics
  maintenance: MaintenancePredictions
  sustainability: SustainabilityMetrics
  benchmarking: IndustryBenchmarks
  forecasting: EnergyForecasting
  lastUpdated: string
  refreshRate: number
}

// Executive Summary Section
export interface ExecutiveSummary {
  overview: BuildingOverview
  criticalMetrics: CriticalMetrics
  trendAnalysis: TrendAnalysis
  recommendations: ExecutiveRecommendations
}

export interface BuildingOverview {
  buildingName: string
  buildingType: 'office' | 'residential' | 'mixed_use' | 'commercial' | 'industrial'
  totalFloors: number
  totalArea: number // square meters
  occupancyRate: number // percentage
  operationalStatus: 'normal' | 'warning' | 'critical' | 'maintenance'
  lastInspection: string
  certifications: string[]
}

export interface CriticalMetrics {
  energyEfficiency: {
    current: number
    target: number
    variance: number
    trend: 'improving' | 'stable' | 'declining'
    unit: 'kWh/m²/month'
  }
  costSavings: {
    monthToDate: number
    yearToDate: number
    projected: number
    currency: string
  }
  systemHealth: {
    overall: number // 0-100
    hvac: number
    lighting: number
    security: number
    sensors: number
  }
  occupantComfort: {
    score: number // 0-100
    temperature: number
    humidity: number
    airQuality: number
  }
}

export interface TrendAnalysis {
  energyConsumption: TrendData
  costs: TrendData
  efficiency: TrendData
  carbonFootprint: TrendData
  timeframe: '24h' | '7d' | '30d' | '90d' | '1y'
}

export interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  direction: 'up' | 'down' | 'stable'
  significance: 'high' | 'medium' | 'low'
}

export interface ExecutiveRecommendations {
  priority: RecommendationItem[]
  costSaving: RecommendationItem[]
  efficiency: RecommendationItem[]
  sustainability: RecommendationItem[]
}

export interface RecommendationItem {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: 'easy' | 'moderate' | 'complex'
  estimatedSavings: number
  paybackPeriod: number // months
  category: 'energy' | 'maintenance' | 'comfort' | 'sustainability'
  confidence: number // 0-100
  aiGenerated: boolean
}

// Key Performance Indicators
export interface KeyPerformanceIndicators {
  energy: EnergyKPIs
  financial: FinancialKPIs
  operational: OperationalKPIs
  environmental: EnvironmentalKPIs
  comfort: ComfortKPIs
  maintenance: MaintenanceKPIs
}

export interface EnergyKPIs {
  totalConsumption: KPIMetric
  peakDemand: KPIMetric
  loadFactor: KPIMetric
  energyIntensity: KPIMetric
  renewableRatio: KPIMetric
  gridDependency: KPIMetric
}

export interface FinancialKPIs {
  energyCosts: KPIMetric
  demandCharges: KPIMetric
  maintenanceCosts: KPIMetric
  operationalSavings: KPIMetric
  roi: KPIMetric
  costPerSquareMeter: KPIMetric
}

export interface OperationalKPIs {
  systemUptime: KPIMetric
  alertResolutionTime: KPIMetric
  equipmentEfficiency: KPIMetric
  spaceUtilization: KPIMetric
  automationLevel: KPIMetric
  dataQuality: KPIMetric
}

export interface EnvironmentalKPIs {
  carbonEmissions: KPIMetric
  waterUsage: KPIMetric
  wasteReduction: KPIMetric
  airQualityIndex: KPIMetric
  sustainabilityScore: KPIMetric
  greenCertificationLevel: KPIMetric
}

export interface ComfortKPIs {
  temperatureCompliance: KPIMetric
  humidityCompliance: KPIMetric
  lightingQuality: KPIMetric
  noiseLevel: KPIMetric
  occupantSatisfaction: KPIMetric
  indoorAirQuality: KPIMetric
}

export interface MaintenanceKPIs {
  predictiveMaintenanceScore: KPIMetric
  equipmentReliability: KPIMetric
  maintenanceEfficiency: KPIMetric
  failurePreventionRate: KPIMetric
  assetLifespan: KPIMetric
  maintenanceCostOptimization: KPIMetric
}

export interface KPIMetric {
  label: string
  value: number
  unit: string
  target?: number
  benchmark?: number
  trend: TrendData
  status: 'excellent' | 'good' | 'warning' | 'critical'
  description: string
  calculation: string
  dataSource: string[]
  lastCalculated: string
  confidence: number
  alerts?: KPIAlert[]
}

export interface KPIAlert {
  type: 'threshold' | 'trend' | 'anomaly'
  severity: 'info' | 'warning' | 'critical'
  message: string
  threshold?: number
  triggered: string
}

// Building Health Score System
export interface BuildingHealthScore {
  overall: HealthScore
  systems: SystemHealthScores
  factors: HealthFactors
  diagnostics: HealthDiagnostics
  recommendations: HealthRecommendations
  history: HealthScoreHistory[]
}

export interface HealthScore {
  score: number // 0-100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  confidence: number
  lastUpdated: string
  trendDirection: 'improving' | 'stable' | 'declining'
  trendStrength: number
}

export interface SystemHealthScores {
  hvac: HealthScore
  lighting: HealthScore
  security: HealthScore
  fireLife: HealthScore
  plumbing: HealthScore
  electrical: HealthScore
  building_automation: HealthScore
  sensors: HealthScore
}

export interface HealthFactors {
  energy_efficiency: HealthFactor
  equipment_performance: HealthFactor
  maintenance_status: HealthFactor
  occupant_comfort: HealthFactor
  environmental_impact: HealthFactor
  operational_costs: HealthFactor
  safety_compliance: HealthFactor
  technology_integration: HealthFactor
}

export interface HealthFactor {
  weight: number // importance in overall score
  score: number // 0-100
  impact: 'positive' | 'neutral' | 'negative'
  trend: 'improving' | 'stable' | 'declining'
  contributing_metrics: string[]
  description: string
}

export interface HealthDiagnostics {
  issues: HealthIssue[]
  opportunities: HealthOpportunity[]
  risks: HealthRisk[]
  predictions: HealthPrediction[]
}

export interface HealthIssue {
  id: string
  severity: 'minor' | 'moderate' | 'major' | 'critical'
  category: string
  title: string
  description: string
  impact: string
  resolution: string
  estimatedCost: number
  urgency: number // 1-10
  detected: string
  systemsAffected: string[]
}

export interface HealthOpportunity {
  id: string
  category: string
  title: string
  description: string
  potential_savings: number
  implementation_cost: number
  payback_period: number
  complexity: 'low' | 'medium' | 'high'
  confidence: number
}

export interface HealthRisk {
  id: string
  type: 'equipment_failure' | 'efficiency_loss' | 'cost_increase' | 'comfort_impact'
  probability: number // 0-100
  impact: number // 0-100
  timeframe: string
  description: string
  mitigation: string[]
}

export interface HealthPrediction {
  metric: string
  current_value: number
  predicted_value: number
  timeframe: string
  confidence: number
  methodology: string
  factors: string[]
}

export interface HealthRecommendations {
  immediate: RecommendationItem[]
  short_term: RecommendationItem[]
  long_term: RecommendationItem[]
  maintenance: RecommendationItem[]
  upgrades: RecommendationItem[]
}

export interface HealthScoreHistory {
  timestamp: string
  overall_score: number
  system_scores: { [system: string]: number }
  events: string[]
}

// Alert System
export interface AlertSystem {
  summary: AlertSummary
  active: Alert[]
  recent: Alert[]
  configuration: AlertConfiguration
  analytics: AlertAnalytics
}

export interface AlertSummary {
  total_active: number
  by_severity: {
    critical: number
    warning: number
    info: number
  }
  by_category: {
    energy: number
    equipment: number
    comfort: number
    security: number
    maintenance: number
  }
  trending: {
    new_24h: number
    resolved_24h: number
    escalated_24h: number
  }
}

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  category: AlertCategory
  title: string
  description: string
  source: {
    system: string
    component: string
    sensor_id?: string
    location: string
  }
  timestamps: {
    detected: string
    first_occurrence: string
    last_occurrence?: string
    acknowledged?: string
    resolved?: string
  }
  status: AlertStatus
  priority: number // 1-10
  impact: AlertImpact
  assignee?: string
  resolution?: AlertResolution
  escalation?: AlertEscalation
  related_alerts: string[]
  metadata: Record<string, any>
}

export type AlertType =
  | 'threshold_exceeded'
  | 'anomaly_detected'
  | 'equipment_failure'
  | 'maintenance_due'
  | 'energy_spike'
  | 'comfort_violation'
  | 'security_breach'
  | 'communication_loss'
  | 'system_degradation'

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertCategory = 'energy' | 'equipment' | 'comfort' | 'security' | 'maintenance' | 'environmental'
export type AlertStatus = 'active' | 'acknowledged' | 'investigating' | 'resolved' | 'suppressed'

export interface AlertImpact {
  business: 'high' | 'medium' | 'low'
  operational: 'high' | 'medium' | 'low'
  financial: number // estimated cost impact
  comfort: 'high' | 'medium' | 'low'
  safety: 'high' | 'medium' | 'low'
}

export interface AlertResolution {
  action_taken: string
  resolved_by: string
  resolution_time: number // minutes
  root_cause: string
  prevention_measures: string[]
}

export interface AlertEscalation {
  level: number
  escalated_to: string
  escalated_at: string
  reason: string
}

export interface AlertConfiguration {
  thresholds: AlertThreshold[]
  notification_rules: NotificationRule[]
  escalation_policies: EscalationPolicy[]
  suppression_rules: SuppressionRule[]
}

export interface AlertThreshold {
  metric: string
  condition: 'greater_than' | 'less_than' | 'equals' | 'change_rate'
  value: number
  time_window: number // minutes
  severity: AlertSeverity
  enabled: boolean
}

export interface NotificationRule {
  alert_types: AlertType[]
  severity_levels: AlertSeverity[]
  channels: NotificationChannel[]
  recipients: string[]
  conditions: string[]
}

export type NotificationChannel = 'email' | 'sms' | 'push' | 'webhook' | 'dashboard'

export interface EscalationPolicy {
  name: string
  stages: EscalationStage[]
  conditions: string[]
}

export interface EscalationStage {
  delay_minutes: number
  recipients: string[]
  channels: NotificationChannel[]
  actions: string[]
}

export interface SuppressionRule {
  conditions: string[]
  duration_minutes: number
  reason: string
  enabled: boolean
}

export interface AlertAnalytics {
  resolution_times: {
    average: number
    by_severity: { [severity: string]: number }
    by_category: { [category: string]: number }
  }
  frequency: {
    alerts_per_day: number
    by_type: { [type: string]: number }
    trending: TrendData
  }
  effectiveness: {
    false_positive_rate: number
    acknowledgment_rate: number
    resolution_rate: number
  }
}

// Energy Efficiency Metrics
export interface EnergyEfficiencyMetrics {
  consumption: EnergyConsumption
  efficiency: EfficiencyMetrics
  comparison: EnergyComparison
  optimization: OptimizationOpportunities
  forecasting: ConsumptionForecasting
}

export interface EnergyConsumption {
  total: ConsumptionData
  by_system: { [system: string]: ConsumptionData }
  by_floor: { [floor: string]: ConsumptionData }
  by_zone: { [zone: string]: ConsumptionData }
  by_time: TimeBasedConsumption
}

export interface ConsumptionData {
  current: number
  unit: string
  period: string
  trend: TrendData
  cost: number
  carbon_equivalent: number
}

export interface TimeBasedConsumption {
  hourly: number[]
  daily: number[]
  weekly: number[]
  monthly: number[]
  seasonal: { [season: string]: number }
}

export interface EfficiencyMetrics {
  energy_intensity: number // kWh/m²
  load_factor: number // percentage
  power_factor: number
  renewable_ratio: number // percentage
  grid_efficiency: number // percentage
  demand_response_effectiveness: number
}

export interface EnergyComparison {
  baseline: ComparisonData
  benchmark: ComparisonData
  peers: ComparisonData
  best_practice: ComparisonData
}

export interface ComparisonData {
  value: number
  variance: number
  percentile: number
  category: string
  source: string
}

export interface OptimizationOpportunities {
  immediate: OptimizationItem[]
  short_term: OptimizationItem[]
  long_term: OptimizationItem[]
  total_potential: number
}

export interface OptimizationItem {
  id: string
  category: string
  description: string
  potential_savings: number // kWh/year
  cost_savings: number // currency/year
  implementation_cost: number
  payback_period: number // months
  complexity: 'low' | 'medium' | 'high'
  confidence: number
}

export interface ConsumptionForecasting {
  short_term: ForecastData // next 7 days
  medium_term: ForecastData // next 30 days
  long_term: ForecastData // next 12 months
  scenarios: ForecastScenario[]
}

export interface ForecastData {
  predicted_consumption: number[]
  confidence_intervals: { upper: number[], lower: number[] }
  peak_predictions: PeakPrediction[]
  factors: string[]
}

export interface ForecastScenario {
  name: string
  assumptions: string[]
  consumption_change: number // percentage
  cost_impact: number
  carbon_impact: number
}

export interface PeakPrediction {
  timestamp: string
  predicted_demand: number
  confidence: number
  contributing_factors: string[]
  mitigation_suggestions: string[]
}

// Maintenance Predictions
export interface MaintenancePredictions {
  schedule: MaintenanceSchedule
  predictions: EquipmentPrediction[]
  optimization: MaintenanceOptimization
  costs: MaintenanceCosts
  performance: MaintenancePerformance
}

export interface MaintenanceSchedule {
  upcoming: MaintenanceTask[]
  overdue: MaintenanceTask[]
  completed_recent: MaintenanceTask[]
  predicted: PredictedMaintenanceTask[]
}

export interface MaintenanceTask {
  id: string
  equipment_id: string
  equipment_name: string
  task_type: MaintenanceType
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  scheduled_date: string
  estimated_duration: number // hours
  assigned_to: string
  cost_estimate: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  location: string
  safety_requirements: string[]
}

export type MaintenanceType =
  | 'preventive'
  | 'predictive'
  | 'corrective'
  | 'emergency'
  | 'inspection'
  | 'calibration'
  | 'replacement'

export interface PredictedMaintenanceTask extends MaintenanceTask {
  prediction_confidence: number
  failure_probability: number
  time_to_failure: number // days
  recommendation_reason: string
  ai_generated: boolean
}

export interface EquipmentPrediction {
  equipment_id: string
  equipment_name: string
  system: string
  health_score: number // 0-100
  remaining_useful_life: number // days
  failure_probability: {
    next_30_days: number
    next_90_days: number
    next_year: number
  }
  maintenance_recommendations: MaintenanceRecommendation[]
  cost_implications: CostImplication[]
  performance_trends: PerformanceTrend[]
}

export interface MaintenanceRecommendation {
  action: string
  urgency: 'immediate' | 'within_week' | 'within_month' | 'planned'
  expected_benefit: string
  cost_estimate: number
  effort_level: 'minimal' | 'moderate' | 'significant'
}

export interface CostImplication {
  scenario: 'preventive' | 'reactive' | 'replacement'
  cost: number
  timeline: string
  risk_level: 'low' | 'medium' | 'high'
}

export interface PerformanceTrend {
  metric: string
  current_value: number
  trend_direction: 'improving' | 'stable' | 'declining'
  rate_of_change: number
  impact_on_efficiency: number
}

export interface MaintenanceOptimization {
  schedule_optimization: ScheduleOptimization
  resource_optimization: ResourceOptimization
  cost_optimization: CostOptimization
}

export interface ScheduleOptimization {
  optimal_intervals: { [equipment: string]: number }
  grouping_opportunities: MaintenanceGrouping[]
  seasonal_adjustments: SeasonalAdjustment[]
}

export interface MaintenanceGrouping {
  equipment_ids: string[]
  cost_savings: number
  efficiency_gain: number
  recommended_schedule: string
}

export interface SeasonalAdjustment {
  season: 'spring' | 'summer' | 'fall' | 'winter'
  adjustments: { [equipment: string]: number }
  reasoning: string
}

export interface ResourceOptimization {
  technician_allocation: TechnicianAllocation[]
  parts_inventory: PartsOptimization
  contractor_vs_internal: ContractorAnalysis
}

export interface TechnicianAllocation {
  technician_id: string
  specialties: string[]
  workload: number // percentage
  optimization_suggestions: string[]
}

export interface PartsOptimization {
  critical_parts: PartInventory[]
  ordering_optimization: OrderingRecommendation[]
  cost_savings_opportunity: number
}

export interface PartInventory {
  part_id: string
  current_stock: number
  optimal_stock: number
  lead_time: number // days
  cost_per_unit: number
}

export interface OrderingRecommendation {
  parts: string[]
  recommended_quantity: number
  timing: string
  cost_savings: number
}

export interface ContractorAnalysis {
  tasks: string[]
  internal_cost: number
  contractor_cost: number
  recommendation: 'internal' | 'contractor' | 'hybrid'
  reasoning: string
}

export interface CostOptimization {
  current_costs: MaintenanceCostBreakdown
  optimized_costs: MaintenanceCostBreakdown
  savings_opportunities: SavingsOpportunity[]
}

export interface MaintenanceCostBreakdown {
  preventive: number
  corrective: number
  emergency: number
  parts: number
  labor: number
  contractor: number
  total: number
}

export interface SavingsOpportunity {
  category: string
  potential_savings: number
  implementation_effort: 'low' | 'medium' | 'high'
  timeline: string
  description: string
}

export interface MaintenanceCosts {
  budget: BudgetTracking
  actuals: CostTracking
  forecasting: CostForecasting
}

export interface BudgetTracking {
  annual_budget: number
  spent_to_date: number
  remaining: number
  projected_year_end: number
  variance: number
}

export interface CostTracking {
  by_category: MaintenanceCostBreakdown
  by_equipment: { [equipment: string]: number }
  by_month: number[]
  trending: TrendData
}

export interface CostForecasting {
  next_quarter: ForecastData
  next_year: ForecastData
  factors: string[]
  scenarios: CostScenario[]
}

export interface CostScenario {
  name: string
  assumptions: string[]
  cost_variance: number // percentage
  risk_level: 'low' | 'medium' | 'high'
}

export interface OptimizationForecasting {
  energy_efficiency: ForecastData
  cost_savings: ForecastData
  performance_improvements: ForecastData
  recommendations: OptimizationRecommendation[]
}

export interface OptimizationRecommendation {
  category: string
  description: string
  potential_savings: number
  implementation_cost: number
  payback_period: number // months
  priority: 'low' | 'medium' | 'high'
}

export interface MaintenancePerformance {
  kpis: MaintenanceKPIs
  efficiency: MaintenanceEfficiency
  quality: MaintenanceQuality
  benchmarking: MaintenanceBenchmarking
}

export interface MaintenanceEfficiency {
  planned_vs_unplanned_ratio: number
  schedule_compliance: number // percentage
  first_time_fix_rate: number // percentage
  average_repair_time: number // hours
  resource_utilization: number // percentage
}

export interface MaintenanceQuality {
  repeat_failure_rate: number // percentage
  warranty_claims: number
  customer_satisfaction: number // 1-10
  safety_incidents: number
  compliance_score: number // percentage
}

export interface MaintenanceBenchmarking {
  industry_average: MaintenanceMetrics
  best_in_class: MaintenanceMetrics
  peer_comparison: MaintenanceMetrics
  improvement_potential: number
}

export interface MaintenanceMetrics {
  cost_per_unit: number
  uptime_percentage: number
  mtbf: number // mean time between failures
  mttr: number // mean time to repair
  oee: number // overall equipment effectiveness
}

// Sustainability Metrics
export interface SustainabilityMetrics {
  carbon_footprint: CarbonFootprint
  resource_usage: ResourceUsage
  certifications: SustainabilityCertifications
  goals: SustainabilityGoals
  reporting: SustainabilityReporting
}

export interface CarbonFootprint {
  total_emissions: EmissionData
  by_source: { [source: string]: EmissionData }
  by_scope: {
    scope_1: EmissionData // direct emissions
    scope_2: EmissionData // electricity
    scope_3: EmissionData // indirect
  }
  intensity: CarbonIntensity
  reduction: CarbonReduction
}

export interface EmissionData {
  value: number
  unit: 'kg_co2e' | 'tons_co2e'
  period: string
  trend: TrendData
  benchmark: number
  target: number
}

export interface CarbonIntensity {
  per_area: number // kg CO2e/m²
  per_occupant: number // kg CO2e/person
  per_revenue: number // kg CO2e/$
  peer_comparison: number
}

export interface CarbonReduction {
  initiatives: CarbonInitiative[]
  total_reduction: number
  cost_avoidance: number
  progress_to_target: number // percentage
}

export interface CarbonInitiative {
  id: string
  name: string
  description: string
  status: 'planned' | 'in_progress' | 'completed'
  co2_reduction: number // tons/year
  cost: number
  roi: number
  timeline: string
}

export interface ResourceUsage {
  water: ResourceData
  waste: WasteData
  materials: MaterialData
  renewable_energy: RenewableEnergyData
}

export interface ResourceData {
  consumption: number
  unit: string
  efficiency: number
  cost: number
  reduction_target: number
  trend: TrendData
}

export interface WasteData {
  total_generated: number
  recycled: number
  composted: number
  landfill: number
  diversion_rate: number // percentage
  reduction_initiatives: string[]
}

export interface MaterialData {
  sustainable_sourcing: number // percentage
  local_sourcing: number // percentage
  recycled_content: number // percentage
  life_cycle_impact: string
}

export interface RenewableEnergyData {
  solar_generation: number
  wind_generation: number
  other_renewable: number
  total_renewable: number
  grid_renewable_percentage: number
  renewable_ratio: number // percentage of total consumption
}

export interface SustainabilityCertifications {
  current: Certification[]
  target: Certification[]
  progress: CertificationProgress[]
}

export interface Certification {
  name: string
  level: string
  issuer: string
  valid_until: string
  score: number
  requirements_met: number
  total_requirements: number
}

export interface CertificationProgress {
  certification: string
  completion_percentage: number
  next_milestones: string[]
  estimated_completion: string
  investment_required: number
}

export interface SustainabilityGoals {
  carbon_neutrality: Goal
  renewable_energy: Goal
  waste_reduction: Goal
  water_conservation: Goal
  green_building: Goal
}

export interface Goal {
  target: number
  target_date: string
  current_progress: number
  on_track: boolean
  milestones: Milestone[]
  initiatives: string[]
}

export interface Milestone {
  description: string
  target_date: string
  completion_percentage: number
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed'
}

export interface SustainabilityReporting {
  esg_score: ESGScore
  compliance: ComplianceStatus
  stakeholder_reporting: StakeholderReporting
}

export interface ESGScore {
  overall: number
  environmental: number
  social: number
  governance: number
  ranking: string
  peer_comparison: number
}

export interface ComplianceStatus {
  regulations: RegulationCompliance[]
  certifications: CertificationCompliance[]
  reporting_requirements: ReportingRequirement[]
}

export interface RegulationCompliance {
  regulation: string
  status: 'compliant' | 'non_compliant' | 'pending'
  last_audit: string
  next_audit: string
  risk_level: 'low' | 'medium' | 'high'
}

export interface CertificationCompliance {
  certification: string
  status: 'active' | 'expired' | 'pending'
  expiry_date: string
  renewal_required: boolean
}

export interface ReportingRequirement {
  report_type: string
  frequency: string
  next_due: string
  completion_status: 'completed' | 'in_progress' | 'not_started'
}

export interface StakeholderReporting {
  sustainability_report: ReportStatus
  carbon_disclosure: ReportStatus
  investor_reporting: ReportStatus
  tenant_reporting: ReportStatus
}

export interface ReportStatus {
  last_published: string
  next_due: string
  status: 'current' | 'overdue' | 'in_preparation'
  distribution_list: string[]
}

// Industry Benchmarks
export interface IndustryBenchmarks {
  energy: EnergyBenchmarks
  costs: CostBenchmarks
  sustainability: SustainabilityBenchmarks
  performance: PerformanceBenchmarks
  peer_comparison: PeerComparison
}

export interface EnergyBenchmarks {
  energy_intensity: BenchmarkData
  carbon_intensity: BenchmarkData
  renewable_percentage: BenchmarkData
  efficiency_rating: BenchmarkData
}

export interface CostBenchmarks {
  energy_cost_per_sqft: BenchmarkData
  maintenance_cost_ratio: BenchmarkData
  operational_cost_per_occupant: BenchmarkData
  total_cost_of_ownership: BenchmarkData
}

export interface SustainabilityBenchmarks {
  esg_score: BenchmarkData
  carbon_reduction_rate: BenchmarkData
  green_certification_level: BenchmarkData
  sustainability_investment: BenchmarkData
}

export interface PerformanceBenchmarks {
  uptime_percentage: BenchmarkData
  response_time: BenchmarkData
  user_satisfaction: BenchmarkData
  automation_level: BenchmarkData
}

export interface BenchmarkData {
  building_value: number
  industry_average: number
  top_quartile: number
  best_in_class: number
  percentile_rank: number
  improvement_potential: number
  data_source: string
  last_updated: string
}

export interface PeerComparison {
  peer_group: string
  total_peers: number
  ranking: number
  comparison_metrics: ComparisonMetric[]
  competitive_advantages: string[]
  improvement_opportunities: string[]
}

export interface ComparisonMetric {
  metric: string
  building_value: number
  peer_average: number
  rank: number
  variance: number
  significance: 'high' | 'medium' | 'low'
}

// Energy Forecasting
export interface EnergyForecasting {
  demand_forecasting: DemandForecasting
  cost_forecasting: CostForecasting
  optimization_forecasting: OptimizationForecasting
  weather_correlation: WeatherCorrelation
}

export interface DemandForecasting {
  hourly: HourlyForecast
  daily: DailyForecast
  weekly: WeeklyForecast
  monthly: MonthlyForecast
  seasonal: SeasonalForecast
}

export interface HourlyForecast {
  next_24_hours: ForecastPoint[]
  peak_hours: PeakForecast[]
  load_shape: LoadShape
  accuracy_metrics: AccuracyMetrics
}

export interface ForecastPoint {
  timestamp: string
  predicted_demand: number
  confidence_interval: { lower: number, upper: number }
  factors: string[]
}

export interface PeakForecast {
  timestamp: string
  predicted_peak: number
  probability: number
  duration: number // minutes
  mitigation_options: string[]
}

export interface LoadShape {
  baseload: number
  peak_factor: number
  load_factor: number
  demand_profile: number[]
}

export interface AccuracyMetrics {
  mape: number // Mean Absolute Percentage Error
  rmse: number // Root Mean Square Error
  mae: number // Mean Absolute Error
  last_updated: string
}

export interface DailyForecast {
  next_7_days: DailyForecastPoint[]
  consumption_pattern: ConsumptionPattern
  cost_implications: number[]
}

export interface DailyForecastPoint {
  date: string
  predicted_consumption: number
  predicted_cost: number
  weather_factors: WeatherFactor[]
  operational_factors: string[]
  confidence: number
}

export interface ConsumptionPattern {
  weekday_average: number
  weekend_average: number
  seasonal_variation: number
  trend_direction: 'increasing' | 'stable' | 'decreasing'
}

export interface WeeklyForecast {
  next_4_weeks: WeeklyForecastPoint[]
  monthly_projection: number
  budget_variance: number
}

export interface WeeklyForecastPoint {
  week_start: string
  predicted_consumption: number
  predicted_cost: number
  significant_events: string[]
  confidence: number
}

export interface MonthlyForecast {
  next_12_months: MonthlyForecastPoint[]
  annual_projection: number
  seasonal_adjustments: SeasonalAdjustment[]
}

export interface MonthlyForecastPoint {
  month: string
  predicted_consumption: number
  predicted_cost: number
  budget_impact: number
  key_assumptions: string[]
}

export interface SeasonalForecast {
  spring: SeasonalData
  summer: SeasonalData
  fall: SeasonalData
  winter: SeasonalData
}

export interface SeasonalData {
  average_consumption: number
  peak_demand: number
  cost_multiplier: number
  key_drivers: string[]
  optimization_opportunities: string[]
}

export interface WeatherCorrelation {
  temperature_correlation: CorrelationData
  humidity_correlation: CorrelationData
  solar_correlation: CorrelationData
  wind_correlation: CorrelationData
  weather_forecast_integration: WeatherIntegration
}

export interface CorrelationData {
  correlation_coefficient: number
  r_squared: number
  significance: 'high' | 'medium' | 'low'
  seasonal_variation: { [season: string]: number }
}

export interface WeatherFactor {
  factor: string
  impact: number // percentage change in consumption
  confidence: number
}

export interface WeatherIntegration {
  forecast_source: string
  update_frequency: string
  accuracy_rating: number
  integration_status: 'active' | 'inactive' | 'error'
}

// Dashboard Configuration and Preferences
export interface DashboardConfiguration {
  layout: DashboardLayout
  preferences: UserPreferences
  widgets: WidgetConfiguration[]
  refresh_settings: RefreshSettings
  alert_settings: AlertSettings
}

export interface DashboardLayout {
  theme: 'light' | 'dark' | 'auto'
  layout_type: 'grid' | 'flex' | 'masonry'
  columns: number
  responsive_breakpoints: ResponsiveBreakpoint[]
}

export interface ResponsiveBreakpoint {
  size: 'mobile' | 'tablet' | 'desktop' | 'ultrawide'
  min_width: number
  columns: number
  widget_sizing: 'compact' | 'normal' | 'expanded'
}

export interface UserPreferences {
  default_timeframe: string
  metric_units: 'metric' | 'imperial'
  currency: string
  timezone: string
  language: string
  accessibility: AccessibilitySettings
}

export interface AccessibilitySettings {
  high_contrast: boolean
  large_text: boolean
  reduced_motion: boolean
  screen_reader_optimized: boolean
}

export interface WidgetConfiguration {
  id: string
  type: WidgetType
  title: string
  position: { x: number, y: number }
  size: { width: number, height: number }
  visible: boolean
  configuration: Record<string, any>
  refresh_interval: number
}

export type WidgetType =
  | 'kpi_metric'
  | 'trend_chart'
  | 'alert_summary'
  | 'health_score'
  | 'energy_consumption'
  | 'cost_tracker'
  | 'sustainability_score'
  | 'maintenance_schedule'
  | 'weather_overlay'
  | 'benchmark_comparison'

export interface RefreshSettings {
  auto_refresh: boolean
  interval_seconds: number
  refresh_on_focus: boolean
  offline_mode: boolean
  data_staleness_warning: number // seconds
}

export interface AlertSettings {
  show_notifications: boolean
  notification_types: AlertType[]
  severity_filter: AlertSeverity[]
  sound_enabled: boolean
  badge_count: boolean
}