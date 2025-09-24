/**
 * Pattern Detection Widget Component
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Real-time pattern detection display with acknowledgment functionality
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { _ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertTriangle,
  TrendingUp,
  Activity,
  CheckCircle,
  Clock,
  MapPin,
  Zap,
  ThermometerSun,
  Lightbulb,
  _MoreVertical,
  ExternalLink
} from 'lucide-react'
import type { DetectedPattern, PatternSeverity, PatternType } from '@/types/patterns'

interface PatternDetectionWidgetProps {
  patterns: DetectedPattern[]
  onPatternSelect: (pattern: DetectedPattern | null) => void
  onAcknowledge: (patternId: string, notes?: string, actionPlanned?: string) => Promise<void>
  loading: boolean
}

export function PatternDetectionWidget({
  patterns,
  onPatternSelect,
  onAcknowledge,
  loading
}: PatternDetectionWidgetProps) {
  const [acknowledgeModalOpen, setAcknowledgeModalOpen] = useState(false)
  const [selectedPattern, setSelectedPattern] = useState<DetectedPattern | null>(null)
  const [acknowledgeNotes, setAcknowledgeNotes] = useState('')
  const [actionPlanned, setActionPlanned] = useState('')
  const [acknowledging, setAcknowledging] = useState(false)

  const getSeverityIcon = (severity: PatternSeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <TrendingUp className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Activity className="h-4 w-4 text-blue-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
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

  const getPatternTypeIcon = (type: PatternType) => {
    switch (type) {
      case 'anomaly':
        return <Zap className="h-4 w-4" />
      case 'trend':
        return <TrendingUp className="h-4 w-4" />
      case 'threshold':
        return <ThermometerSun className="h-4 w-4" />
      case 'frequency':
        return <Activity className="h-4 w-4" />
      case 'correlation':
        return <Lightbulb className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getEquipmentIcon = (equipmentType: string) => {
    switch (equipmentType.toLowerCase()) {
      case 'hvac':
        return <ThermometerSun className="h-4 w-4" />
      case 'lighting':
        return <Lightbulb className="h-4 w-4" />
      case 'power':
        return <Zap className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const handleAcknowledgeClick = (pattern: DetectedPattern) => {
    setSelectedPattern(pattern)
    setAcknowledgeModalOpen(true)
    setAcknowledgeNotes('')
    setActionPlanned('')
  }

  const handleAcknowledgeSubmit = async () => {
    if (!selectedPattern) return

    setAcknowledging(true)
    try {
      await onAcknowledge(selectedPattern.id, acknowledgeNotes, actionPlanned)
      setAcknowledgeModalOpen(false)
      setSelectedPattern(null)
    } catch (error) {
      console.error('Failed to acknowledge pattern:', error)
    } finally {
      setAcknowledging(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-pulse" />
            <span>Analyzing patterns...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (patterns.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium">No Patterns Detected</h3>
            <p className="text-muted-foreground">
              All systems operating within normal parameters
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {patterns.map((pattern) => (
          <Card
            key={pattern.id}
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
              pattern.severity === 'critical' ? 'border-red-200 bg-red-50/50' : ''
            }`}
            onClick={() => onPatternSelect(pattern)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getSeverityIcon(pattern.severity)}
                  <div>
                    <CardTitle className="text-base">{pattern.description}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        {getEquipmentIcon(pattern.equipment_type)}
                        {pattern.equipment_type}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Floor {pattern.floor_number}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(pattern.timestamp)}
                      </span>
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={getSeverityColor(pattern.severity)}>
                    {pattern.severity}
                  </Badge>
                  <Badge variant="outline">
                    {Math.round(pattern.confidence_score)}% confidence
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getPatternTypeIcon(pattern.pattern_type)}
                    <span className="text-sm capitalize">{pattern.pattern_type}</span>
                  </div>

                  <Separator orientation="vertical" className="h-4" />

                  <div className="text-sm text-muted-foreground">
                    Sensor: {pattern.sensor_id}
                  </div>

                  {pattern.recommendations.length > 0 && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="text-sm text-blue-600">
                        {pattern.recommendations.length} recommendation{pattern.recommendations.length > 1 ? 's' : ''}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {pattern.acknowledged ? (
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Acknowledged
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAcknowledgeClick(pattern)
                      }}
                    >
                      Acknowledge
                    </Button>
                  )}

                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {pattern.data_points && pattern.data_points.length > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm font-medium mb-2">Recent Data Points</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {pattern.data_points.slice(-4).map((point, index) => (
                      <div key={index} className="text-center">
                        <div className={`font-medium ${point.is_anomaly ? 'text-red-600' : ''}`}>
                          {point.value.toFixed(2)}
                        </div>
                        <div className="text-muted-foreground">
                          {formatTimestamp(point.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Acknowledgment Modal */}
      <Dialog open={acknowledgeModalOpen} onOpenChange={setAcknowledgeModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Acknowledge Pattern</DialogTitle>
            <DialogDescription>
              Record your acknowledgment and planned actions for this detected pattern.
            </DialogDescription>
          </DialogHeader>

          {selectedPattern && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getSeverityIcon(selectedPattern.severity)}
                  <span className="font-medium">{selectedPattern.description}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedPattern.equipment_type} • Floor {selectedPattern.floor_number} •
                  {Math.round(selectedPattern.confidence_score)}% confidence
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any observations or additional context..."
                  value={acknowledgeNotes}
                  onChange={(e) => setAcknowledgeNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">Planned Action (Optional)</Label>
                <Input
                  id="action"
                  placeholder="e.g., Schedule maintenance inspection"
                  value={actionPlanned}
                  onChange={(e) => setActionPlanned(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAcknowledgeModalOpen(false)}
              disabled={acknowledging}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAcknowledgeSubmit}
              disabled={acknowledging}
            >
              {acknowledging ? 'Acknowledging...' : 'Acknowledge Pattern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}