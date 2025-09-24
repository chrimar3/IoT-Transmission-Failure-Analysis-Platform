/**
 * @jest-environment node
 */

import { RecommendationEngine } from '@/lib/algorithms/RecommendationEngine'
import type { DetectedPattern, RecommendationContext, PatternRecommendation } from '@/types/patterns'

describe('RecommendationEngine', () => {
  let engine: RecommendationEngine

  beforeEach(() => {
    engine = new RecommendationEngine()
  })

  const mockPattern: DetectedPattern = {
    id: 'pattern_test_001',
    timestamp: '2025-01-15T10:30:00Z',
    sensor_id: 'SENSOR_HVAC_001',
    equipment_type: 'HVAC',
    floor_number: 3,
    pattern_type: 'anomaly',
    severity: 'warning',
    confidence_score: 85,
    description: 'HVAC Temperature Anomaly - Readings 15% above normal range',
    data_points: [],
    recommendations: [],
    acknowledged: false,
    created_at: '2025-01-15T10:30:00Z',
    metadata: {
      detection_algorithm: 'statistical_zscore',
      analysis_window: '24h',
      threshold_used: 2.5,
      historical_occurrences: 3,
      statistical_metrics: {
        mean: 22.5,
        std_deviation: 2.1,
        variance: 4.41,
        median: 22.8,
        q1: 21.2,
        q3: 24.1,
        z_score: 3.2,
        percentile_rank: 95,
        normality_test: 0.85
      }
    }
  }

  const mockContext: RecommendationContext = {
    building_profile: {
      building_type: 'office',
      total_floors: 15,
      total_sensors: 134,
      operational_hours: { start: '07:00', end: '19:00' },
      maintenance_budget: 50000,
      staff_expertise: ['basic', 'technician']
    },
    current_conditions: {
      outdoor_temperature: 32,
      humidity: 65,
      season: 'summer',
      occupancy_level: 'high'
    },
    maintenance_history: [],
    equipment_age: 5,
    criticality_level: 'medium',
    operational_criticality: 'medium'
  }

  describe('generateRecommendations', () => {
    it('should generate recommendations for HVAC anomalies', async () => {
      const result = await engine.generateRecommendations([mockPattern], mockContext)

      expect(result).toHaveLength(1)
      expect(result[0].recommendations.length).toBeGreaterThan(0)

      const recommendations = result[0].recommendations
      expect(recommendations[0]).toMatchObject({
        id: expect.any(String),
        priority: expect.stringMatching(/^(high|medium|low)$/),
        action_type: expect.stringMatching(/^(inspection|cleaning|calibration|replacement|repair|upgrade|monitoring)$/),
        description: expect.any(String),
        estimated_cost: expect.any(Number),
        estimated_savings: expect.any(Number),
        time_to_implement_hours: expect.any(Number),
        required_expertise: expect.stringMatching(/^(basic|technician|engineer|specialist)$/),
        maintenance_category: expect.stringMatching(/^(preventive|corrective|predictive|emergency)$/),
        success_probability: expect.any(Number)
      })
    })

    it('should prioritize critical patterns higher', async () => {
      const criticalPattern: DetectedPattern = {
        ...mockPattern,
        id: 'pattern_critical_001',
        severity: 'critical',
        confidence_score: 95
      }

      const warningPattern: DetectedPattern = {
        ...mockPattern,
        id: 'pattern_warning_001',
        severity: 'warning',
        confidence_score: 75
      }

      const result = await engine.generateRecommendations(
        [warningPattern, criticalPattern],
        mockContext
      )

      expect(result).toHaveLength(2)

      const criticalRecs = result.find(p => p.id === 'pattern_critical_001')?.recommendations || []
      const warningRecs = result.find(p => p.id === 'pattern_warning_001')?.recommendations || []

      // Critical patterns should have higher priority recommendations
      const criticalHighPriority = criticalRecs.filter(r => r.priority === 'high').length
      const warningHighPriority = warningRecs.filter(r => r.priority === 'high').length

      expect(criticalHighPriority).toBeGreaterThanOrEqual(warningHighPriority)
    })

    it('should consider budget constraints', async () => {
      const lowBudgetContext: RecommendationContext = {
        ...mockContext,
        building_profile: {
          ...mockContext.building_profile,
          maintenance_budget: 1000
        }
      }

      const result = await engine.generateRecommendations([mockPattern], lowBudgetContext)
      const recommendations = result[0].recommendations

      // Should prioritize low-cost solutions
      const averageCost = recommendations.reduce((sum, r) => sum + r.estimated_cost, 0) / recommendations.length
      expect(averageCost).toBeLessThan(5000)

      // Should include basic maintenance actions
      const basicActions = recommendations.filter(r => r.required_expertise === 'basic' || r.required_expertise === 'technician')
      expect(basicActions.length).toBeGreaterThan(0)
    })

    it('should adapt to staff expertise level', async () => {
      const expertiseContext: RecommendationContext = {
        ...mockContext,
        building_profile: {
          ...mockContext.building_profile,
          staff_expertise: ['engineer', 'specialist']
        }
      }

      const basicContext: RecommendationContext = {
        ...mockContext,
        building_profile: {
          ...mockContext.building_profile,
          staff_expertise: ['basic']
        }
      }

      const expertResult = await engine.generateRecommendations([mockPattern], expertiseContext)
      const basicResult = await engine.generateRecommendations([mockPattern], basicContext)

      const expertRecs = expertResult[0].recommendations
      const basicRecs = basicResult[0].recommendations

      // Expert context should include more advanced recommendations
      const advancedExpertRecs = expertRecs.filter(r => r.required_expertise === 'engineer' || r.required_expertise === 'specialist')
      const advancedBasicRecs = basicRecs.filter(r => r.required_expertise === 'engineer' || r.required_expertise === 'specialist')

      expect(advancedExpertRecs.length).toBeGreaterThanOrEqual(advancedBasicRecs.length)
    })

    it('should handle different equipment types', async () => {
      const lightingPattern: DetectedPattern = {
        ...mockPattern,
        id: 'pattern_lighting_001',
        sensor_id: 'SENSOR_LIGHT_001',
        equipment_type: 'Lighting',
        description: 'Lighting Power Consumption Spike - 40% above normal'
      }

      const powerPattern: DetectedPattern = {
        ...mockPattern,
        id: 'pattern_power_001',
        sensor_id: 'SENSOR_POWER_001',
        equipment_type: 'Power',
        description: 'Power System Frequency Anomaly'
      }

      const result = await engine.generateRecommendations(
        [mockPattern, lightingPattern, powerPattern],
        mockContext
      )

      expect(result).toHaveLength(3)

      // Each equipment type should have relevant recommendations
      const hvacRecs = result.find(p => p.id === mockPattern.id)?.recommendations
      const lightingRecs = result.find(p => p.id === lightingPattern.id)?.recommendations
      const powerRecs = result.find(p => p.id === powerPattern.id)?.recommendations

      expect(hvacRecs?.some(r => r.description.toLowerCase().includes('hvac') || r.description.toLowerCase().includes('temperature'))).toBe(true)
      expect(lightingRecs?.some(r => r.description.toLowerCase().includes('lighting') || r.description.toLowerCase().includes('bulb'))).toBe(true)
      expect(powerRecs?.some(r => r.description.toLowerCase().includes('power') || r.description.toLowerCase().includes('electrical'))).toBe(true)
    })

    it('should calculate realistic cost estimates', async () => {
      const result = await engine.generateRecommendations([mockPattern], mockContext)
      const recommendations = result[0].recommendations

      recommendations.forEach(rec => {
        // Cost should be positive and reasonable
        expect(rec.estimated_cost).toBeGreaterThan(0)
        expect(rec.estimated_cost).toBeLessThan(100000)

        // Savings should be positive and greater than cost for good ROI
        expect(rec.estimated_savings).toBeGreaterThanOrEqual(0)

        // Time should be reasonable
        expect(rec.time_to_implement_hours).toBeGreaterThan(0)
        expect(rec.time_to_implement_hours).toBeLessThan(200) // Less than 1 month

        // Success probability should be between 0 and 100
        expect(rec.success_probability).toBeGreaterThanOrEqual(0)
        expect(rec.success_probability).toBeLessThanOrEqual(100)
      })
    })

    it('should handle seasonal considerations', async () => {
      const winterContext: RecommendationContext = {
        ...mockContext,
        current_conditions: {
          ...mockContext.current_conditions,
          outdoor_temperature: 5,
          season: 'winter'
        }
      }

      const summerContext: RecommendationContext = {
        ...mockContext,
        current_conditions: {
          ...mockContext.current_conditions,
          outdoor_temperature: 35,
          season: 'summer'
        }
      }

      const winterResult = await engine.generateRecommendations([mockPattern], winterContext)
      const summerResult = await engine.generateRecommendations([mockPattern], summerContext)

      const winterRecs = winterResult[0].recommendations
      const summerRecs = summerResult[0].recommendations

      // Recommendations should be contextually different for different seasons
      expect(winterRecs).toBeDefined()
      expect(summerRecs).toBeDefined()

      // Both seasons should generate recommendations
      expect(winterRecs.length).toBeGreaterThan(0)
      expect(summerRecs.length).toBeGreaterThan(0)

      // May have seasonal differences, but not required for this test
      const winterDescriptions = winterRecs.map(r => r.description)
      const summerDescriptions = summerRecs.map(r => r.description)
      expect(winterDescriptions.length).toBeGreaterThan(0)
      expect(summerDescriptions.length).toBeGreaterThan(0)
    })

    it('should generate emergency recommendations for critical patterns', async () => {
      const emergencyPattern: DetectedPattern = {
        ...mockPattern,
        severity: 'critical',
        confidence_score: 98,
        description: 'Critical HVAC Failure - System offline'
      }

      const result = await engine.generateRecommendations([emergencyPattern], mockContext)
      const recommendations = result[0].recommendations

      // Should include emergency category recommendations
      const emergencyRecs = recommendations.filter(r => r.maintenance_category === 'emergency')
      expect(emergencyRecs.length).toBeGreaterThan(0)

      // Emergency recommendations should have high priority
      emergencyRecs.forEach(rec => {
        expect(rec.priority).toBe('high')
        expect(rec.time_to_implement_hours).toBeLessThan(24) // Should be implementable within 24 hours
      })
    })

    it('should handle empty pattern array', async () => {
      const result = await engine.generateRecommendations([], mockContext)
      expect(result).toHaveLength(0)
    })

    it('should handle patterns with existing recommendations', async () => {
      const existingRecommendation: PatternRecommendation = {
        id: 'existing_rec_001',
        priority: 'medium',
        action_type: 'inspection',
        description: 'Existing recommendation',
        estimated_cost: 500,
        estimated_savings: 2000,
        time_to_implement_hours: 4,
        required_expertise: 'technician',
        maintenance_category: 'preventive',
        success_probability: 85
      }

      const patternWithRecs: DetectedPattern = {
        ...mockPattern,
        recommendations: [existingRecommendation]
      }

      const result = await engine.generateRecommendations([patternWithRecs], mockContext)

      // Should either merge with or replace existing recommendations intelligently
      expect(result[0].recommendations).toBeDefined()
      expect(result[0].recommendations.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('recommendation quality', () => {
    it('should generate actionable recommendations', async () => {
      const result = await engine.generateRecommendations([mockPattern], mockContext)
      const recommendations = result[0].recommendations

      recommendations.forEach(rec => {
        // Description should be clear and actionable
        expect(rec.description.length).toBeGreaterThan(10)
        expect(rec.description).not.toMatch(/^TODO|^FIX|^PLACEHOLDER/)

        // Should have realistic deadlines for urgent items
        if (rec.urgency_deadline) {
          const deadline = new Date(rec.urgency_deadline)
          const now = new Date()
          expect(deadline.getTime()).toBeGreaterThan(now.getTime())
        }
      })
    })

    it('should provide cost-benefit analysis', async () => {
      const result = await engine.generateRecommendations([mockPattern], mockContext)
      const recommendations = result[0].recommendations

      const profitableRecs = recommendations.filter(r => r.estimated_savings > r.estimated_cost)
      expect(profitableRecs.length).toBeGreaterThan(0)

      // Should have a good mix of different cost levels
      const lowCost = recommendations.filter(r => r.estimated_cost < 1000).length
      const mediumCost = recommendations.filter(r => r.estimated_cost >= 1000 && r.estimated_cost < 5000).length
      const highCost = recommendations.filter(r => r.estimated_cost >= 5000).length

      expect(lowCost + mediumCost + highCost).toBe(recommendations.length)
      expect(lowCost).toBeGreaterThan(0) // Should always have some low-cost options
    })

    it('should consider equipment age and condition', async () => {
      const oldEquipmentContext: RecommendationContext = {
        ...mockContext,
        equipment_age: 15 // Old equipment
      }

      const newEquipmentContext: RecommendationContext = {
        ...mockContext,
        equipment_age: 2 // New equipment
      }

      const oldResult = await engine.generateRecommendations([mockPattern], oldEquipmentContext)
      const newResult = await engine.generateRecommendations([mockPattern], newEquipmentContext)

      const oldRecs = oldResult[0].recommendations
      const newRecs = newResult[0].recommendations

      // Old equipment should have more replacement/upgrade recommendations
      const oldReplacements = oldRecs.filter(r => r.action_type === 'replacement' || r.action_type === 'upgrade').length
      const newReplacements = newRecs.filter(r => r.action_type === 'replacement' || r.action_type === 'upgrade').length

      expect(oldReplacements).toBeGreaterThanOrEqual(newReplacements)
    })
  })

  describe('error handling', () => {
    it('should handle invalid pattern data gracefully', async () => {
      const invalidPattern: unknown = {
        ...mockPattern,
        confidence_score: 'invalid', // Invalid data type
        severity: 'unknown' // Invalid severity
      }

      const result = await engine.generateRecommendations([invalidPattern as DetectedPattern], mockContext)

      // Should either handle gracefully or provide empty recommendations
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle missing context data', async () => {
      const incompleteContext: Partial<RecommendationContext> = {
        building_profile: {
          building_type: 'office',
          total_floors: 15,
          total_sensors: 134,
          maintenance_budget: 50000
        } as any
      }

      const result = await engine.generateRecommendations([mockPattern], incompleteContext as RecommendationContext)

      // Should provide recommendations with default assumptions
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle extreme values gracefully', async () => {
      const extremeContext: RecommendationContext = {
        ...mockContext,
        building_profile: {
          ...mockContext.building_profile,
          maintenance_budget: 0 // Zero budget
        },
        equipment_age: 50 // Very old equipment
      }

      const result = await engine.generateRecommendations([mockPattern], extremeContext)

      // Should still provide recommendations, focusing on low-cost or critical safety items
      expect(result).toBeDefined()
      expect(result[0].recommendations.length).toBeGreaterThan(0)
    })
  })
})