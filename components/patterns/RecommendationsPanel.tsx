/**
 * Recommendations Panel Component
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Display and manage maintenance recommendations from pattern analysis
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  _AlertTriangle,
  Wrench,
  Clock,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Calendar,
  User,
  Target,
  ArrowRight,
  Filter
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type {
  DetectedPattern,
  _PatternRecommendation,
  RecommendationPriority,
  RecommendationActionType,
  ExpertiseLevel,
  MaintenanceCategory
} from '@/types/patterns'

interface RecommendationsPanelProps {
  patterns: DetectedPattern[]
  onImplementRecommendation: (patternId: string, recommendationId: string) => void
}

export function RecommendationsPanel({
  patterns,
  onImplementRecommendation
}: RecommendationsPanelProps) {
  const [priorityFilter, setPriorityFilter] = useState<RecommendationPriority | 'all'>('all')
  const [actionTypeFilter, setActionTypeFilter] = useState<RecommendationActionType | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<MaintenanceCategory | 'all'>('all')

  // Extract all recommendations from patterns
  const allRecommendations = patterns.flatMap(pattern =>
    pattern.recommendations.map(rec => ({
      ...rec,
      pattern_id: pattern.id,
      pattern_description: pattern.description,
      pattern_severity: pattern.severity,
      sensor_id: pattern.sensor_id,
      equipment_type: pattern.equipment_type
    }))
  )

  // Apply filters
  const filteredRecommendations = allRecommendations.filter(rec => {
    if (priorityFilter !== 'all' && rec.priority !== priorityFilter) return false
    if (actionTypeFilter !== 'all' && rec.action_type !== actionTypeFilter) return false
    if (categoryFilter !== 'all' && rec.maintenance_category !== categoryFilter) return false
    return true
  })

  // Sort by priority and estimated cost
  const sortedRecommendations = filteredRecommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (priorityDiff !== 0) return priorityDiff
    return a.estimated_cost - b.estimated_cost
  })

  const getPriorityColor = (priority: RecommendationPriority) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  const getActionTypeIcon = (actionType: RecommendationActionType) => {
    switch (actionType) {
      case 'inspection': return <Target className="h-4 w-4" />
      case 'cleaning': return <Wrench className="h-4 w-4" />
      case 'calibration': return <Target className="h-4 w-4" />
      case 'replacement': return <ArrowRight className="h-4 w-4" />
      case 'repair': return <Wrench className="h-4 w-4" />
      case 'upgrade': return <TrendingUp className="h-4 w-4" />
      case 'monitoring': return <Clock className="h-4 w-4" />
      default: return <Wrench className="h-4 w-4" />
    }
  }

  const getExpertiseColor = (level: ExpertiseLevel) => {
    switch (level) {
      case 'basic': return 'secondary'
      case 'technician': return 'default'
      case 'engineer': return 'outline'
      case 'specialist': return 'destructive'
      default: return 'outline'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const calculateROI = (cost: number, savings: number) => {
    if (cost === 0) return 0
    return Math.round(((savings - cost) / cost) * 100)
  }

  const totalCost = sortedRecommendations.reduce((sum, rec) => sum + rec.estimated_cost, 0)
  const totalSavings = sortedRecommendations.reduce((sum, rec) => sum + rec.estimated_savings, 0)
  const totalHours = sortedRecommendations.reduce((sum, rec) => sum + rec.time_to_implement_hours, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sortedRecommendations.length}</div>
            <div className="text-xs text-muted-foreground">
              {sortedRecommendations.filter(r => r.priority === 'high').length} high priority
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Implementation Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
            <div className="text-xs text-muted-foreground">
              Potential savings: {formatCurrency(totalSavings)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Implementation Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours}h</div>
            <div className="text-xs text-muted-foreground">
              ROI: {calculateROI(totalCost, totalSavings)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={priorityFilter} onValueChange={(value: unknown) => setPriorityFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action Type</label>
              <Select value={actionTypeFilter} onValueChange={(value: unknown) => setActionTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="calibration">Calibration</SelectItem>
                  <SelectItem value="replacement">Replacement</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="upgrade">Upgrade</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={(value: unknown) => setCategoryFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="predictive">Predictive</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Maintenance Recommendations</CardTitle>
          <CardDescription>
            AI-generated maintenance actions based on detected patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedRecommendations.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <h3 className="text-lg font-medium">No Recommendations</h3>
              <p className="text-muted-foreground">
                No maintenance actions required at this time
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {sortedRecommendations.map((recommendation) => (
                  <Card key={`${recommendation.pattern_id}_${recommendation.id}`} className="border">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getActionTypeIcon(recommendation.action_type)}
                          <div>
                            <CardTitle className="text-base">{recommendation.description}</CardTitle>
                            <CardDescription className="mt-1">
                              Related to: {recommendation.pattern_description}
                            </CardDescription>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant={getPriorityColor(recommendation.priority)}>
                            {recommendation.priority} priority
                          </Badge>
                          <Badge variant="outline">
                            {Math.round(recommendation.success_probability)}% success
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Cost
                            </span>
                            <span className="font-medium">{formatCurrency(recommendation.estimated_cost)}</span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Savings
                            </span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(recommendation.estimated_savings)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Time
                            </span>
                            <span className="font-medium">{recommendation.time_to_implement_hours}h</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Expertise
                            </span>
                            <Badge variant={getExpertiseColor(recommendation.required_expertise)}>
                              {recommendation.required_expertise}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              Category
                            </span>
                            <span className="font-medium capitalize">
                              {recommendation.maintenance_category}
                            </span>
                          </div>

                          {recommendation.urgency_deadline && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Deadline
                              </span>
                              <span className="font-medium text-red-600">
                                {new Date(recommendation.urgency_deadline).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Equipment: {recommendation.equipment_type} • Sensor: {recommendation.sensor_id}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-sm">
                            ROI: <span className="font-medium text-green-600">
                              {calculateROI(recommendation.estimated_cost, recommendation.estimated_savings)}%
                            </span>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => onImplementRecommendation(recommendation.pattern_id, recommendation.id)}
                          >
                            Implement
                          </Button>
                        </div>
                      </div>

                      {/* Success Probability Progress */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Success Probability</span>
                          <span>{Math.round(recommendation.success_probability)}%</span>
                        </div>
                        <Progress value={recommendation.success_probability} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}