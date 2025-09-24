/**
 * Pattern Summary Cards Component
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Dashboard summary cards showing pattern statistics and key metrics
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, TrendingUp, Activity, Shield, Clock, Target } from 'lucide-react'
import type { PatternSummary, PatternSeverity } from '@/types/patterns'

interface PatternSummaryCardsProps {
  summary: PatternSummary
}

export function PatternSummaryCards({ summary }: PatternSummaryCardsProps) {
  const getSeverityIcon = (severity: PatternSeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <TrendingUp className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Activity className="h-5 w-5 text-blue-500" />
      default:
        return <Shield className="h-5 w-5 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: PatternSeverity) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'warning': return 'default'
      case 'info': return 'secondary'
      default: return 'outline'
    }
  }

  const confidencePercentage = Math.round(summary.average_confidence)
  const highConfidencePercentage = summary.total_patterns > 0
    ? Math.round((summary.high_confidence_count / summary.total_patterns) * 100)
    : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Patterns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Patterns</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.total_patterns}</div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {highConfidencePercentage}% high confidence
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Severity Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">By Severity</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(summary.by_severity).map(([severity, count]) => (
              <div key={severity} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getSeverityIcon(severity as PatternSeverity)}
                  <span className="text-sm capitalize">{severity}</span>
                </div>
                <Badge variant={getSeverityColor(severity as PatternSeverity)}>
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pattern Types */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pattern Types</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(summary.by_type)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{type}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Confidence & Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Analysis Quality</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{confidencePercentage}%</div>
          <p className="text-xs text-muted-foreground mb-3">Average confidence</p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>High confidence patterns</span>
              <Badge variant="default">{summary.high_confidence_count}</Badge>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span>Actions required</span>
              <Badge variant={summary.critical_actions_required > 0 ? 'destructive' : 'secondary'}>
                {summary.critical_actions_required}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Summary */}
      {summary.recommendations_count > 0 && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Recommendations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {summary.recommendations_count}
                </div>
                <p className="text-xs text-muted-foreground">Total recommendations</p>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {summary.critical_actions_required}
                </div>
                <p className="text-xs text-muted-foreground">Critical actions</p>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {summary.high_confidence_count}
                </div>
                <p className="text-xs text-muted-foreground">High confidence patterns</p>
              </div>
            </div>

            {summary.critical_actions_required > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    {summary.critical_actions_required} critical action{summary.critical_actions_required > 1 ? 's' : ''} required
                  </span>
                </div>
                <p className="text-xs text-red-700 mt-1">
                  Immediate attention needed to prevent equipment failure
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}