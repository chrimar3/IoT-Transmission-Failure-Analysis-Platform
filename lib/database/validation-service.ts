/**
 * Validation Service
 * Database service layer for storing and retrieving validation results
 * Integrates with DataValidationFramework and ValidatedSavingsCalculator
 */

import { createServerClient } from '../supabase-server';
import {
  _Database,
  ValidationSession,
  ValidatedInsight,
  SavingsScenario,
  _SavingsBreakdown,
  DataQualityMetrics,
  FloorPerformance,
  EquipmentPerformance,
  CalculationAudit,
  HardcodedReplacement,
  CreateValidationSessionRequest,
  _ValidateInsightsRequest,
  _CalculateSavingsRequest,
  AuditCalculationRequest,
  ValidationFrameworkResponse
} from './schema-types';
import { _DataValidationFramework, ValidatedInsight as FrameworkInsight } from '../validation/data-validation-framework';
import { _ValidatedSavingsCalculator, SavingsScenario as CalculatorScenario } from '../validation/savings-calculator';

export class ValidationService {
  private supabase = createServerClient();

  /**
   * Create a new validation session
   */
  async createValidationSession(request: CreateValidationSessionRequest): Promise<ValidationSession> {
    const { data, error } = await this.supabase
      .from('validation_sessions')
      .insert({
        session_name: request.session_name,
        dataset_version: request.dataset_version,
        total_records: request.total_records,
        bmad_phase: request.bmad_phase || 'build',
        status: 'running',
        metadata: request.metadata || {},
        created_by: (await this.supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create validation session: ${error.message}`);
    }

    return data;
  }

  /**
   * Complete a validation session
   */
  async completeValidationSession(
    sessionId: string,
    dataQualityScore: number
  ): Promise<ValidationSession> {
    const { data, error } = await this.supabase
      .from('validation_sessions')
      .update({
        status: 'completed',
        analysis_completed_at: new Date().toISOString(),
        data_quality_score: dataQualityScore
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to complete validation session: ${error.message}`);
    }

    return data;
  }

  /**
   * Store validated insights from framework
   */
  async storeValidatedInsights(
    sessionId: string,
    insights: FrameworkInsight[]
  ): Promise<ValidatedInsight[]> {
    const insightRecords = insights.map(insight => ({
      session_id: sessionId,
      metric_name: insight.metric,
      metric_value: insight.value,
      metric_unit: insight.unit,
      validation_status: insight.validationStatus,
      confidence_level: insight.confidence.confidenceLevel,
      p_value: insight.confidence.pValue,
      sample_size: insight.confidence.sampleSize,
      standard_error: insight.confidence.standardError,
      margin_of_error: insight.confidence.marginOfError,
      confidence_interval_lower: insight.confidence.confidenceInterval?.lower,
      confidence_interval_upper: insight.confidence.confidenceInterval?.upper,
      calculation_method: insight.calculationMethod,
      data_source: insight.dataSource,
      baseline_value: insight.baseline,
      trend_direction: insight.trend?.direction,
      trend_rate: insight.trend?.rate,
      trend_significance: insight.trend?.significance,
      description: `Validated insight for ${insight.metric}`,
      recommendation: `Analysis shows ${insight.validationStatus} result with ${insight.confidence.confidenceLevel}% confidence`
    }));

    const { data, error } = await this.supabase
      .from('validated_insights')
      .insert(insightRecords)
      .select();

    if (error) {
      throw new Error(`Failed to store validated insights: ${error.message}`);
    }

    return data;
  }

  /**
   * Store savings scenarios from calculator
   */
  async storeSavingsScenarios(
    sessionId: string,
    scenarios: CalculatorScenario[]
  ): Promise<SavingsScenario[]> {
    const scenarioRecords = scenarios.map(scenario => ({
      session_id: sessionId,
      scenario_id: scenario.id,
      scenario_name: scenario.name,
      scenario_description: scenario.description,
      category: scenario.category,
      annual_savings: scenario.savings.annual,
      implementation_cost: scenario.implementation.cost,
      effort_level: scenario.implementation.effort,
      timeframe: scenario.implementation.timeframe,
      risk_level: scenario.implementation.riskLevel,
      roi_percentage: scenario.roi.percentage,
      payback_months: scenario.roi.paybackMonths,
      net_present_value: scenario.roi.netPresentValue,
      validation_status: scenario.savings.validationStatus,
      confidence_level: scenario.savings.confidence.confidenceLevel,
      confidence_interval_lower: scenario.savings.confidence.confidenceInterval?.lower,
      confidence_interval_upper: scenario.savings.confidence.confidenceInterval?.upper
    }));

    const { data: scenarioData, error: scenarioError } = await this.supabase
      .from('savings_scenarios')
      .insert(scenarioRecords)
      .select();

    if (scenarioError) {
      throw new Error(`Failed to store savings scenarios: ${scenarioError.message}`);
    }

    // Store breakdown components for each scenario
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      const scenarioRecord = scenarioData[i];

      if (scenario.savings.breakdown) {
        const breakdownRecords = scenario.savings.breakdown.map(breakdown => ({
          scenario_id: scenarioRecord.id,
          component_name: breakdown.component,
          component_savings: breakdown.annualSavings,
          calculation_method: breakdown.calculationMethod,
          data_source: breakdown.dataSource,
          confidence_level: breakdown.confidence,
          percentage_of_total: (breakdown.annualSavings / scenario.savings.annual) * 100
        }));

        const { error: breakdownError } = await this.supabase
          .from('savings_breakdown')
          .insert(breakdownRecords);

        if (breakdownError) {
          console.error(`Failed to store breakdown for scenario ${scenario.id}:`, breakdownError);
        }
      }
    }

    return scenarioData;
  }

  /**
   * Store data quality metrics
   */
  async storeDataQualityMetrics(
    sessionId: string,
    dataSource: string,
    totalRecords: number,
    validRecords: number,
    qualityIssues: string[] = []
  ): Promise<DataQualityMetrics> {
    const invalidRecords = totalRecords - validRecords;

    // Calculate quality score using the database function
    const { data: qualityScore } = await this.supabase
      .rpc('calculate_data_quality_score', {
        p_total_records: totalRecords,
        p_valid_records: validRecords,
        p_missing_values: 0,
        p_duplicate_records: 0,
        p_outlier_count: 0
      });

    const { data, error } = await this.supabase
      .from('data_quality_metrics')
      .insert({
        session_id: sessionId,
        data_source: dataSource,
        total_records: totalRecords,
        valid_records: validRecords,
        invalid_records: invalidRecords,
        quality_score: qualityScore || 0,
        completeness_score: (validRecords / totalRecords) * 100,
        consistency_score: 95, // Simplified for now
        accuracy_score: (validRecords / totalRecords) * 100,
        quality_issues: qualityIssues
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store data quality metrics: ${error.message}`);
    }

    return data;
  }

  /**
   * Store floor performance metrics
   */
  async storeFloorPerformance(
    sessionId: string,
    floorMetrics: unknown[]
  ): Promise<FloorPerformance[]> {
    const floorRecords = floorMetrics.map(metric => ({
      session_id: sessionId,
      floor_number: metric.floorNumber,
      total_sensors: metric.sensorCount || 0,
      avg_consumption: metric.avgConsumption || 0,
      normalized_consumption: metric.normalizedConsumption || 0,
      deviation_from_mean: metric.deviationFromMean,
      z_score: metric.zScore,
      outlier_status: metric.outlierStatus,
      sample_size: metric.sampleSize,
      confidence_level: metric.confidenceLevel,
      efficiency_score: metric.efficiencyScore,
      maintenance_priority: metric.maintenancePriority
    }));

    const { data, error } = await this.supabase
      .from('floor_performance')
      .insert(floorRecords)
      .select();

    if (error) {
      throw new Error(`Failed to store floor performance: ${error.message}`);
    }

    return data;
  }

  /**
   * Store equipment performance metrics
   */
  async storeEquipmentPerformance(
    sessionId: string,
    equipmentMetrics: unknown[]
  ): Promise<EquipmentPerformance[]> {
    const equipmentRecords = equipmentMetrics.map(metric => ({
      session_id: sessionId,
      equipment_type: metric.equipmentType,
      sensor_count: metric.sensorCount || 0,
      performance_score: metric.performanceScore,
      degradation_rate: metric.degradationRate,
      failure_risk: metric.failureRisk,
      maintenance_urgency: metric.maintenanceUrgency,
      cost_impact_estimate: metric.costImpactEstimate?.value,
      cost_confidence_lower: metric.costImpactEstimate?.confidenceInterval?.[0],
      cost_confidence_upper: metric.costImpactEstimate?.confidenceInterval?.[1],
      cost_validation_status: metric.costImpactEstimate?.validationStatus,
      avg_power_consumption: metric.avgPowerConsumption,
      reliability_percentage: metric.reliabilityPercentage,
      failure_frequency: metric.failureFrequency,
      optimization_potential: metric.optimizationPotential
    }));

    const { data, error } = await this.supabase
      .from('equipment_performance')
      .insert(equipmentRecords)
      .select();

    if (error) {
      throw new Error(`Failed to store equipment performance: ${error.message}`);
    }

    return data;
  }

  /**
   * Audit a calculation for transparency
   */
  async auditCalculation(request: AuditCalculationRequest): Promise<CalculationAudit> {
    const { data, error } = await this.supabase
      .from('calculation_audit')
      .insert({
        session_id: request.session_id,
        calculation_type: request.calculation_type,
        calculation_name: request.calculation_name,
        input_data: request.input_data,
        calculation_method: request.calculation_method,
        statistical_method: request.statistical_method,
        validation_status: 'validated',
        data_sources: Array.isArray(request.input_data.dataSources)
          ? request.input_data.dataSources
          : ['bangkok_cu_bems_dataset'],
        assumptions: [],
        peer_reviewed: false,
        created_by: (await this.supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to audit calculation: ${error.message}`);
    }

    return data;
  }

  /**
   * Track hardcoded value replacement
   */
  async trackHardcodedReplacement(
    originalValue: number,
    originalLocation: string,
    replacementMethod: string,
    validatedValue?: number,
    validationConfidence?: number,
    sessionId?: string
  ): Promise<HardcodedReplacement> {
    const { data, error } = await this.supabase
      .from('hardcoded_replacements')
      .insert({
        original_value: originalValue,
        original_location: originalLocation,
        replacement_method: replacementMethod,
        validated_value: validatedValue,
        validation_confidence: validationConfidence,
        validation_session_id: sessionId,
        status: validatedValue ? 'replaced' : 'pending',
        replaced_by: (await this.supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to track hardcoded replacement: ${error.message}`);
    }

    return data;
  }

  /**
   * Get latest validation session summary
   */
  async getLatestValidationSummary() {
    const { data, error } = await this.supabase
      .from('latest_validation_summary')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is acceptable
      throw new Error(`Failed to get latest validation summary: ${error.message}`);
    }

    return data;
  }

  /**
   * Get hardcoded replacement progress
   */
  async getHardcodedReplacementProgress() {
    const { data, error } = await this.supabase
      .from('hardcoded_replacement_progress')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is acceptable
      throw new Error(`Failed to get hardcoded replacement progress: ${error.message}`);
    }

    return data;
  }

  /**
   * Get complete validation results for a session
   */
  async getValidationResults(sessionId: string): Promise<ValidationFrameworkResponse> {
    const [session, insights, scenarios, qualityMetrics, auditTrail] = await Promise.all([
      this.supabase.from('validation_sessions').select('*').eq('id', sessionId).single(),
      this.supabase.from('validated_insights').select('*').eq('session_id', sessionId),
      this.supabase.from('savings_scenarios').select('*').eq('session_id', sessionId),
      this.supabase.from('data_quality_metrics').select('*').eq('session_id', sessionId),
      this.supabase.from('calculation_audit').select('*').eq('session_id', sessionId)
    ]);

    if (session.error) {
      throw new Error(`Failed to get session: ${session.error.message}`);
    }

    return {
      session: session.data,
      insights: insights.data || [],
      scenarios: scenarios.data || [],
      quality_metrics: qualityMetrics.data || [],
      audit_trail: auditTrail.data || []
    };
  }

  /**
   * Get all validation sessions
   */
  async getValidationSessions(limit = 50) {
    const { data, error } = await this.supabase
      .from('validation_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get validation sessions: ${error.message}`);
    }

    return data;
  }

  /**
   * Get savings scenarios for a session with breakdown
   */
  async getSavingsScenarios(sessionId: string) {
    const { data: scenarios, error: scenariosError } = await this.supabase
      .from('savings_scenarios')
      .select(`
        *,
        savings_breakdown (*)
      `)
      .eq('session_id', sessionId)
      .order('annual_savings', { ascending: false });

    if (scenariosError) {
      throw new Error(`Failed to get savings scenarios: ${scenariosError.message}`);
    }

    return scenarios;
  }

  /**
   * Get system configuration
   */
  async getSystemConfig() {
    const { data, error } = await this.supabase
      .from('system_config')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to get system config: ${error.message}`);
    }

    // Convert to key-value object
    const config: Record<string, unknown> = {};
    data.forEach(item => {
      config[item.config_key] = item.config_value;
    });

    return config;
  }

  /**
   * Update system configuration
   */
  async updateSystemConfig(key: string, value: unknown, description?: string) {
    const { data, error } = await this.supabase
      .from('system_config')
      .upsert({
        config_key: key,
        config_value: value,
        config_type: 'calculation_params',
        description: description,
        updated_by: (await this.supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update system config: ${error.message}`);
    }

    return data;
  }

  /**
   * Log user access for audit trail
   */
  async logAccess(action: string, resourceType?: string, resourceId?: string) {
    const user = await this.supabase.auth.getUser();

    const { error } = await this.supabase
      .from('access_log')
      .insert({
        user_id: user.data.user?.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId
      });

    if (error) {
      console.error('Failed to log access:', error);
      // Don't throw error for logging failures
    }
  }
}

// Singleton instance
export const validationService = new ValidationService();