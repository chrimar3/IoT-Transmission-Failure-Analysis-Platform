/**
 * Maintenance Recommendation Engine
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Generates actionable maintenance recommendations based on detected patterns
 * Optimized for Bangkok IoT equipment types and operational constraints
 */

import type {
  DetectedPattern,
  PatternRecommendation,
  RecommendationPriority,
  RecommendationActionType,
  ExpertiseLevel,
  MaintenanceCategory,
  _PatternSeverity,
  PatternType
} from '@/types/patterns'

// Maintenance action database
export interface MaintenanceAction {
  id: string
  equipment_type: string
  pattern_types: PatternType[]
  action_type: RecommendationActionType
  description: string
  base_cost: number
  base_time_hours: number
  required_expertise: ExpertiseLevel
  effectiveness_score: number // 0-100%
  urgency_multiplier: number
  prevention_factor: number // How much failure probability it reduces
}

// Cost-benefit analysis configuration
export interface CostBenefitConfig {
  failure_cost_multipliers: Record<string, number>
  downtime_cost_per_hour: Record<string, number>
  labor_rates: Record<ExpertiseLevel, number>
  equipment_replacement_costs: Record<string, number>
}

// Recommendation generation context
export interface RecommendationContext {
  equipment_age_months?: number
  last_maintenance_date?: string
  failure_history?: number
  operational_criticality: 'low' | 'medium' | 'high'
  budget_constraints?: number
  available_expertise?: ExpertiseLevel[]
  maintenance_window_hours?: number
}

/**
 * Advanced Recommendation Engine for Predictive Maintenance
 */
export class RecommendationEngine {
  private maintenanceActions: MaintenanceAction[]
  private costBenefitConfig: CostBenefitConfig
  private bangkokOperationalRules: OperationalRules

  constructor() {
    this.maintenanceActions = this.initializeMaintenanceActions()
    this.costBenefitConfig = this.initializeCostBenefitConfig()
    this.bangkokOperationalRules = this.initializeBangkokRules()
  }

  /**
   * Generate comprehensive recommendations for detected patterns
   */
  async generateRecommendations(
    patterns: DetectedPattern[],
    _context: RecommendationContext = { operational_criticality: 'medium' }
  ): Promise<DetectedPattern[]> {
    const patternsWithRecommendations = []

    for (const pattern of patterns) {
      const recommendations = await this.generatePatternRecommendations(pattern, _context)

      patternsWithRecommendations.push({
        ...pattern,
        recommendations: recommendations.sort((a, b) => this.comparePriority(a, b))
      })
    }

    return patternsWithRecommendations
  }

  /**
   * Generate recommendations for a single pattern
   */
  private async generatePatternRecommendations(
    pattern: DetectedPattern,
    _context: RecommendationContext
  ): Promise<PatternRecommendation[]> {
    const recommendations: PatternRecommendation[] = []

    // Find applicable maintenance actions
    const applicableActions = this.findApplicableActions(pattern)

    for (const action of applicableActions) {
      const recommendation = await this.createRecommendation(pattern, action, _context)
      if (recommendation.success_probability >= 30) { // Minimum viability threshold
        recommendations.push(recommendation)
      }
    }

    // Add pattern-specific custom recommendations
    const customRecommendations = this.generateCustomRecommendations(pattern, _context)
    recommendations.push(...customRecommendations)

    // Apply Bangkok-specific operational rules
    return this.applyOperationalRules(recommendations, pattern, _context)
  }

  /**
   * Find maintenance actions applicable to the detected pattern
   */
  private findApplicableActions(pattern: DetectedPattern): MaintenanceAction[] {
    return this.maintenanceActions.filter(action => {
      // Equipment type match
      if (action.equipment_type !== 'all' && action.equipment_type !== pattern.equipment_type) {
        return false
      }

      // Pattern type compatibility
      if (!action.pattern_types.includes(pattern.pattern_type) && !action.pattern_types.includes('any' as PatternType)) {
        return false
      }

      return true
    })
  }

  /**
   * Create a recommendation from a maintenance action and pattern
   */
  private async createRecommendation(
    pattern: DetectedPattern,
    action: MaintenanceAction,
    _context: RecommendationContext
  ): Promise<PatternRecommendation> {
    // Calculate dynamic costs based on context
    const adjustedCost = this.calculateAdjustedCost(action, pattern, _context)
    const estimatedSavings = this.calculateEstimatedSavings(pattern, action, _context)
    const timeToImplement = this.calculateImplementationTime(action, pattern, _context)
    const priority = this.calculatePriority(pattern, action, _context)
    const successProbability = this.calculateSuccessProbability(pattern, action, _context)
    const urgencyDeadline = this.calculateUrgencyDeadline(pattern, action)

    const recommendation: PatternRecommendation = {
      id: `rec_${pattern.id}_${action.id}_${Date.now()}`,
      priority,
      action_type: action.action_type,
      description: this.generateRecommendationDescription(pattern, action, _context),
      estimated_cost: adjustedCost,
      estimated_savings: estimatedSavings,
      time_to_implement_hours: timeToImplement,
      urgency_deadline: urgencyDeadline,
      required_expertise: action.required_expertise,
      maintenance_category: this.determineMaintenanceCategory(pattern, action),
      success_probability: successProbability
    }

    return recommendation
  }

  /**
   * Generate pattern-specific custom recommendations
   */
  private generateCustomRecommendations(
    pattern: DetectedPattern,
    _context: RecommendationContext
  ): PatternRecommendation[] {
    const customRecs: PatternRecommendation[] = []

    // High confidence patterns get monitoring recommendations
    if (pattern.confidence_score >= 85) {
      customRecs.push({
        id: `custom_monitor_${pattern.id}`,
        priority: 'medium',
        action_type: 'monitoring',
        description: `Implement enhanced monitoring for ${pattern.equipment_type} on floor ${pattern.floor_number} due to high-confidence pattern detection`,
        estimated_cost: 50,
        estimated_savings: 800,
        time_to_implement_hours: 1,
        required_expertise: 'technician',
        maintenance_category: 'predictive',
        success_probability: 90
      })
    }

    // Critical patterns get immediate inspection recommendations
    if (pattern.severity === 'critical') {
      customRecs.push({
        id: `custom_emergency_${pattern.id}`,
        priority: 'high',
        action_type: 'inspection',
        description: `URGENT: Immediate inspection required for critical anomaly in ${pattern.equipment_type} system`,
        estimated_cost: 200,
        estimated_savings: 5000,
        time_to_implement_hours: 2,
        urgency_deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
        required_expertise: 'engineer',
        maintenance_category: 'emergency',
        success_probability: 85
      })
    }

    // Seasonal patterns get scheduling recommendations
    if (pattern.pattern_type === 'seasonal') {
      customRecs.push({
        id: `custom_seasonal_${pattern.id}`,
        priority: 'medium',
        action_type: 'cleaning',
        description: `Schedule seasonal maintenance for ${pattern.equipment_type} based on historical pattern analysis`,
        estimated_cost: 300,
        estimated_savings: 1200,
        time_to_implement_hours: 4,
        required_expertise: 'technician',
        maintenance_category: 'preventive',
        success_probability: 75
      })
    }

    return customRecs
  }

  /**
   * Apply Bangkok-specific operational rules
   */
  private applyOperationalRules(
    recommendations: PatternRecommendation[],
    pattern: DetectedPattern,
    _context: RecommendationContext
  ): PatternRecommendation[] {
    return recommendations.map(rec => {
      // Apply Bangkok climate considerations
      if (pattern.equipment_type === 'HVAC') {
        rec.description += ' Consider Bangkok tropical climate impact on HVAC performance.'
        rec.estimated_savings *= 1.2 // Higher savings due to climate efficiency
      }

      // Apply floor-specific considerations
      if (pattern.floor_number >= 6) {
        rec.time_to_implement_hours *= 1.1 // Higher floors take more time
        rec.estimated_cost += 50 // Additional access costs
      }

      // Apply business hours constraints
      if (pattern.equipment_type === 'Lighting' || pattern.equipment_type === 'Power') {
        rec.description += ' Schedule during off-hours to minimize business disruption.'
      }

      // Apply expertise availability in Bangkok
      if (rec.required_expertise === 'specialist' && pattern.equipment_type === 'HVAC') {
        rec.time_to_implement_hours *= 1.5 // Specialist may not be immediately available
        rec.estimated_cost += 200 // Premium for specialist in Bangkok
      }

      return rec
    })
  }

  /**
   * Calculate adjusted cost based on various factors
   */
  private calculateAdjustedCost(
    action: MaintenanceAction,
    pattern: DetectedPattern,
    _context: RecommendationContext
  ): number {
    let adjustedCost = action.base_cost

    // Severity multiplier
    const severityMultipliers = { critical: 1.5, warning: 1.2, info: 1.0 }
    adjustedCost *= severityMultipliers[pattern.severity]

    // Equipment type cost adjustment
    const equipmentMultipliers = { HVAC: 1.3, Power: 1.4, Lighting: 1.0, Water: 1.1, Security: 0.9 }
    adjustedCost *= equipmentMultipliers[pattern.equipment_type as keyof typeof equipmentMultipliers] || 1.0

    // Labor cost
    const laborRate = this.costBenefitConfig.labor_rates[action.required_expertise]
    const laborCost = laborRate * action.base_time_hours
    adjustedCost += laborCost

    // Context adjustments
    if (context.operational_criticality === 'high') {
      adjustedCost *= 1.2 // Priority service premium
    }

    return Math.round(adjustedCost)
  }

  /**
   * Calculate estimated savings from implementing recommendation
   */
  private calculateEstimatedSavings(
    pattern: DetectedPattern,
    action: MaintenanceAction,
    _context: RecommendationContext
  ): number {
    // Base failure cost
    const failureMultiplier = this.costBenefitConfig.failure_cost_multipliers[pattern.equipment_type] || 1.0
    const baseSavings = failureMultiplier * 1000

    // Confidence-based adjustment
    const confidenceMultiplier = pattern.confidence_score / 100
    let estimatedSavings = baseSavings * confidenceMultiplier

    // Prevention factor from action effectiveness
    estimatedSavings *= (action.prevention_factor || 0.7)

    // Downtime cost savings
    const downtimeCost = this.costBenefitConfig.downtime_cost_per_hour[pattern.equipment_type] || 100
    const preventedDowntimeHours = pattern.severity === 'critical' ? 24 : pattern.severity === 'warning' ? 8 : 2
    estimatedSavings += downtimeCost * preventedDowntimeHours

    // Operational criticality multiplier
    if (context.operational_criticality === 'high') {
      estimatedSavings *= 1.5
    }

    return Math.round(estimatedSavings)
  }

  /**
   * Calculate implementation time with context adjustments
   */
  private calculateImplementationTime(
    action: MaintenanceAction,
    pattern: DetectedPattern,
    _context: RecommendationContext
  ): number {
    let timeHours = action.base_time_hours

    // Complexity adjustment based on pattern confidence
    if (pattern.confidence_score < 70) {
      timeHours *= 1.3 // More investigation time needed
    }

    // Equipment accessibility adjustment
    if (pattern.floor_number >= 5) {
      timeHours += 0.5 // Additional access time
    }

    // Expertise availability adjustment
    if (action.required_expertise === 'specialist') {
      timeHours += 2 // Scheduling and coordination time
    }

    return Math.round(timeHours * 10) / 10 // Round to 1 decimal place
  }

  /**
   * Calculate recommendation priority
   */
  private calculatePriority(
    pattern: DetectedPattern,
    action: MaintenanceAction,
    _context: RecommendationContext
  ): RecommendationPriority {
    let priorityScore = 0

    // Severity contribution (40% weight)
    priorityScore += pattern.severity === 'critical' ? 40 : pattern.severity === 'warning' ? 25 : 10

    // Confidence contribution (30% weight)
    priorityScore += (pattern.confidence_score / 100) * 30

    // Action urgency contribution (20% weight)
    priorityScore += action.urgency_multiplier * 20

    // Context contribution (10% weight)
    priorityScore += context.operational_criticality === 'high' ? 10 : context.operational_criticality === 'medium' ? 5 : 2

    if (priorityScore >= 70) return 'high'
    if (priorityScore >= 40) return 'medium'
    return 'low'
  }

  /**
   * Calculate success probability
   */
  private calculateSuccessProbability(
    pattern: DetectedPattern,
    action: MaintenanceAction,
    _context: RecommendationContext
  ): number {
    let successProb = action.effectiveness_score

    // Adjust based on pattern confidence
    successProb *= (0.5 + (pattern.confidence_score / 200)) // 0.5 to 1.0 multiplier

    // Adjust based on expertise match
    if (context.available_expertise?.includes(action.required_expertise)) {
      successProb *= 1.1
    }

    // Equipment type reliability adjustment
    const reliabilityFactors = { HVAC: 0.95, Power: 0.9, Lighting: 1.0, Water: 0.95, Security: 1.05 }
    successProb *= reliabilityFactors[pattern.equipment_type as keyof typeof reliabilityFactors] || 1.0

    return Math.min(95, Math.max(30, Math.round(successProb)))
  }

  /**
   * Calculate urgency deadline
   */
  private calculateUrgencyDeadline(pattern: DetectedPattern, action: MaintenanceAction): string | undefined {
    if (pattern.severity === 'critical') {
      return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours
    }

    if (pattern.severity === 'warning' && action.action_type === 'inspection') {
      return new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours
    }

    if (action.urgency_multiplier >= 0.8) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week
    }

    return undefined
  }

  /**
   * Determine maintenance category
   */
  private determineMaintenanceCategory(pattern: DetectedPattern, action: MaintenanceAction): MaintenanceCategory {
    if (pattern.severity === 'critical') return 'emergency'
    if (pattern.pattern_type === 'trend' || pattern.pattern_type === 'correlation') return 'predictive'
    if (action.action_type === 'inspection' || action.action_type === 'cleaning') return 'preventive'
    return 'corrective'
  }

  /**
   * Generate human-readable recommendation description
   */
  private generateRecommendationDescription(
    pattern: DetectedPattern,
    action: MaintenanceAction,
    _context: RecommendationContext
  ): string {
    const baseDescription = action.description
      .replace('{equipment_type}', pattern.equipment_type)
      .replace('{floor_number}', pattern.floor_number.toString())

    // Add context-specific details
    let enhancedDescription = baseDescription

    if (pattern.confidence_score >= 90) {
      enhancedDescription += ' High-confidence detection algorithm recommends immediate attention.'
    }

    if (context.operational_criticality === 'high') {
      enhancedDescription += ' Critical operational equipment requires priority handling.'
    }

    if (pattern.pattern_type === 'seasonal') {
      enhancedDescription += ' Pattern analysis indicates seasonal maintenance opportunity.'
    }

    return enhancedDescription
  }

  /**
   * Compare recommendation priorities for sorting
   */
  private comparePriority(a: PatternRecommendation, b: PatternRecommendation): number {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const aPriority = priorityOrder[a.priority]
    const bPriority = priorityOrder[b.priority]

    if (aPriority !== bPriority) {
      return bPriority - aPriority // Higher priority first
    }

    // If same priority, sort by success probability
    return b.success_probability - a.success_probability
  }

  /**
   * Initialize maintenance action database
   */
  private initializeMaintenanceActions(): MaintenanceAction[] {
    return [
      // HVAC Actions
      {
        id: 'hvac_calibration',
        equipment_type: 'HVAC',
        pattern_types: ['anomaly', 'threshold'],
        action_type: 'calibration',
        description: 'Calibrate {equipment_type} sensors and control systems on floor {floor_number}',
        base_cost: 200,
        base_time_hours: 3,
        required_expertise: 'technician',
        effectiveness_score: 85,
        urgency_multiplier: 0.7,
        prevention_factor: 0.8
      },
      {
        id: 'hvac_cleaning',
        equipment_type: 'HVAC',
        pattern_types: ['seasonal', 'trend'],
        action_type: 'cleaning',
        description: 'Clean {equipment_type} filters and coils, check refrigerant levels',
        base_cost: 150,
        base_time_hours: 2,
        required_expertise: 'technician',
        effectiveness_score: 75,
        urgency_multiplier: 0.5,
        prevention_factor: 0.7
      },
      {
        id: 'hvac_inspection',
        equipment_type: 'HVAC',
        pattern_types: ['correlation', 'anomaly'],
        action_type: 'inspection',
        description: 'Comprehensive {equipment_type} system inspection for anomalous behavior',
        base_cost: 100,
        base_time_hours: 1.5,
        required_expertise: 'technician',
        effectiveness_score: 70,
        urgency_multiplier: 0.8,
        prevention_factor: 0.6
      },

      // Lighting Actions
      {
        id: 'lighting_replacement',
        equipment_type: 'Lighting',
        pattern_types: ['anomaly', 'threshold'],
        action_type: 'replacement',
        description: 'Replace faulty {equipment_type} fixtures showing abnormal power consumption',
        base_cost: 80,
        base_time_hours: 1,
        required_expertise: 'basic',
        effectiveness_score: 90,
        urgency_multiplier: 0.6,
        prevention_factor: 0.9
      },
      {
        id: 'lighting_inspection',
        equipment_type: 'Lighting',
        pattern_types: ['trend', 'frequency'],
        action_type: 'inspection',
        description: 'Inspect {equipment_type} circuits and control systems for degradation',
        base_cost: 60,
        base_time_hours: 1,
        required_expertise: 'technician',
        effectiveness_score: 75,
        urgency_multiplier: 0.4,
        prevention_factor: 0.7
      },

      // Power System Actions
      {
        id: 'power_monitoring',
        equipment_type: 'Power',
        pattern_types: ['anomaly', 'correlation'],
        action_type: 'monitoring',
        description: 'Install enhanced monitoring for {equipment_type} distribution anomalies',
        base_cost: 300,
        base_time_hours: 4,
        required_expertise: 'engineer',
        effectiveness_score: 85,
        urgency_multiplier: 0.9,
        prevention_factor: 0.8
      },
      {
        id: 'power_inspection',
        equipment_type: 'Power',
        pattern_types: ['threshold', 'trend'],
        action_type: 'inspection',
        description: 'Critical {equipment_type} system inspection for safety and performance',
        base_cost: 250,
        base_time_hours: 3,
        required_expertise: 'engineer',
        effectiveness_score: 90,
        urgency_multiplier: 1.0,
        prevention_factor: 0.85
      },

      // Generic Actions
      {
        id: 'generic_monitoring',
        equipment_type: 'all',
        pattern_types: ['any' as PatternType],
        action_type: 'monitoring',
        description: 'Implement enhanced monitoring for {equipment_type} equipment',
        base_cost: 100,
        base_time_hours: 1,
        required_expertise: 'technician',
        effectiveness_score: 60,
        urgency_multiplier: 0.3,
        prevention_factor: 0.5
      }
    ]
  }

  /**
   * Initialize cost-benefit configuration
   */
  private initializeCostBenefitConfig(): CostBenefitConfig {
    return {
      failure_cost_multipliers: {
        HVAC: 3.0,
        Power: 5.0,
        Lighting: 1.5,
        Water: 2.0,
        Security: 2.5
      },
      downtime_cost_per_hour: {
        HVAC: 200,
        Power: 500,
        Lighting: 100,
        Water: 150,
        Security: 300
      },
      labor_rates: {
        basic: 25,
        technician: 40,
        engineer: 60,
        specialist: 100
      },
      equipment_replacement_costs: {
        HVAC: 15000,
        Power: 25000,
        Lighting: 2000,
        Water: 8000,
        Security: 5000
      }
    }
  }

  /**
   * Initialize Bangkok-specific operational rules
   */
  private initializeBangkokRules(): OperationalRules {
    return {
      climate_factors: {
        humidity_impact: 1.2,
        temperature_impact: 1.15,
        monsoon_season_multiplier: 1.3
      },
      business_hours: {
        start: 8,
        end: 18,
        maintenance_window_start: 19,
        maintenance_window_end: 6
      },
      floor_accessibility: {
        high_floor_multiplier: 1.1,
        elevator_dependency: true,
        access_time_minutes: 10
      }
    }
  }
}

// Supporting interfaces
export interface OperationalRules {
  climate_factors: {
    humidity_impact: number
    temperature_impact: number
    monsoon_season_multiplier: number
  }
  business_hours: {
    start: number
    end: number
    maintenance_window_start: number
    maintenance_window_end: number
  }
  floor_accessibility: {
    high_floor_multiplier: number
    elevator_dependency: boolean
    access_time_minutes: number
  }
}

// Export utility functions
export const RecommendationUtils = {
  calculateROI: (estimatedSavings: number, estimatedCost: number): number => {
    return estimatedCost > 0 ? ((estimatedSavings - estimatedCost) / estimatedCost) * 100 : 0
  },

  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount)
  },

  calculatePaybackPeriod: (estimatedSavings: number, estimatedCost: number): number => {
    return estimatedSavings > 0 ? estimatedCost / estimatedSavings : Infinity
  }
}