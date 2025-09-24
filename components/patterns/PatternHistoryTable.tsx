/**
 * Pattern History Table Component
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Historical pattern analysis and acknowledgment tracking
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertTriangle,
  TrendingUp,
  Activity,
  CheckCircle,
  Clock,
  Search,
  Download,
  RefreshCw,
  Filter,
  Calendar
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type {
  PatternAcknowledgment,
  PatternSeverity,
  PatternType,
  TimeWindow,
  AcknowledgmentOutcome
} from '@/types/patterns'

interface PatternHistoryTableProps {
  timeWindow: TimeWindow
  severityFilter: PatternSeverity[]
}

interface HistoricalPattern extends PatternAcknowledgment {
  pattern_description: string
  pattern_type: PatternType
  severity: PatternSeverity
  confidence_score: number
  sensor_id: string
  equipment_type: string
  floor_number: number
}

// Mock data for demonstration - moved outside component to avoid dependency issues
const mockHistoricalPatterns: HistoricalPattern[] = [
  {
    pattern_id: 'pattern_SENSOR_001_1234567890_abc123',
    acknowledged_by: 'maintenance@cu-bems.com',
    acknowledged_at: '2025-01-15T10:30:00Z',
    notes: 'Inspected HVAC system, found minor calibration issue',
    action_taken: 'Recalibrated sensor threshold values',
    follow_up_required: false,
    outcome: 'resolved',
    pattern_description: 'HVAC Temperature Anomaly - Unexpected readings detected',
    pattern_type: 'anomaly',
    severity: 'warning',
    confidence_score: 87.5,
    sensor_id: 'SENSOR_001',
    equipment_type: 'HVAC',
    floor_number: 2
  },
  {
    pattern_id: 'pattern_SENSOR_045_1234567891_def456',
    acknowledged_by: 'facilities@cu-bems.com',
    acknowledged_at: '2025-01-14T14:20:00Z',
    notes: 'Critical power consumption spike during peak hours',
    action_taken: 'Scheduled equipment inspection for next maintenance window',
    follow_up_required: true,
    outcome: 'pending',
    pattern_description: 'Power Consumption Spike - 300% above baseline',
    pattern_type: 'spike',
    severity: 'critical',
    confidence_score: 94.2,
    sensor_id: 'SENSOR_045',
    equipment_type: 'Electrical',
    floor_number: 5
  },
  {
    pattern_id: 'pattern_SENSOR_023_1234567892_ghi789',
    acknowledged_by: 'security@cu-bems.com',
    acknowledged_at: '2025-01-13T09:15:00Z',
    notes: 'Motion sensor showing irregular patterns during off-hours',
    action_taken: 'Verified with security logs, no unauthorized access detected',
    follow_up_required: false,
    outcome: 'false_positive',
    pattern_description: 'Motion Anomaly - Unexpected movement patterns',
    pattern_type: 'anomaly',
    severity: 'info',
    confidence_score: 72.1,
    sensor_id: 'SENSOR_023',
    equipment_type: 'Security',
    floor_number: 1
  }
]

export function PatternHistoryTable({
  timeWindow,
  severityFilter
}: PatternHistoryTableProps) {
  const [patterns, setPatterns] = useState<HistoricalPattern[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<AcknowledgmentOutcome | 'all'>('all')
  const [_pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
    hasMore: false
  })

  const loadHistoricalPatterns = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Apply filters to mock data
      let filtered = mockHistoricalPatterns

      if (searchTerm) {
        filtered = filtered.filter(pattern =>
          pattern.pattern_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pattern.sensor_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pattern.equipment_type.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      if (severityFilter.length > 0) {
        filtered = filtered.filter(pattern => severityFilter.includes(pattern.severity))
      }

      if (outcomeFilter !== 'all') {
        filtered = filtered.filter(pattern => pattern.outcome === outcomeFilter)
      }

      setPatterns(filtered)
      setPagination(prev => ({
        ...prev,
        total: filtered.length,
        hasMore: filtered.length > prev.limit
      }))

    } catch (error) {
      console.error('Failed to load historical patterns:', error)
      setError('Failed to load historical data')
    } finally {
      setLoading(false)
    }
  }, [severityFilter, searchTerm, outcomeFilter])

  useEffect(() => {
    loadHistoricalPatterns()
  }, [loadHistoricalPatterns])

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

  const _getOutcomeColor = (outcome: AcknowledgmentOutcome) => {
    switch (outcome) {
      case 'resolved': return 'default'
      case 'monitoring': return 'secondary'
      case 'escalated': return 'destructive'
      case 'false_positive': return 'outline'
      default: return 'outline'
    }
  }

  const getOutcomeBadge = (outcome: AcknowledgmentOutcome) => {
    switch (outcome) {
      case 'resolved':
        return <Badge variant="default" className="text-green-700 bg-green-100"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>
      case 'monitoring':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Monitoring</Badge>
      case 'escalated':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Escalated</Badge>
      case 'false_positive':
        return <Badge variant="outline">False Positive</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const exportHistoricalData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      timeWindow,
      patterns: patterns,
      summary: {
        total: patterns.length,
        resolved: patterns.filter(p => p.outcome === 'resolved').length,
        monitoring: patterns.filter(p => p.outcome === 'monitoring').length,
        escalated: patterns.filter(p => p.outcome === 'escalated').length
      }
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pattern-history-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Historical Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search patterns, sensors, equipment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Outcome Filter</Label>
              <Select value={outcomeFilter} onValueChange={(value: unknown) => setOutcomeFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={loadHistoricalPatterns}
                disabled={loading}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Button
                onClick={exportHistoricalData}
                disabled={patterns.length === 0}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Patterns Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pattern History</CardTitle>
              <CardDescription>
                Historical patterns and their acknowledgment status
              </CardDescription>
            </div>
            <Badge variant="outline">
              {patterns.length} pattern{patterns.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Loading historical data...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                <h3 className="text-lg font-medium">Error Loading Data</h3>
                <p className="text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : patterns.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <h3 className="text-lg font-medium">No Historical Data</h3>
                <p className="text-muted-foreground">
                  No patterns found for the selected criteria
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Acknowledged By</TableHead>
                    <TableHead>Action Taken</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patterns.map((pattern) => (
                    <TableRow key={pattern.pattern_id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{pattern.pattern_description}</div>
                          <div className="text-sm text-muted-foreground">
                            {pattern.sensor_id} • {Math.round(pattern.confidence_score)}% confidence
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(pattern.severity)}
                          <Badge variant={getSeverityColor(pattern.severity)}>
                            {pattern.severity}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <div className="font-medium">{pattern.equipment_type}</div>
                          <div className="text-sm text-muted-foreground">
                            Floor {pattern.floor_number}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">{pattern.acknowledged_by}</div>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[200px]">
                          <div className="text-sm truncate" title={pattern.action_taken}>
                            {pattern.action_taken}
                          </div>
                          {pattern.notes && (
                            <div className="text-xs text-muted-foreground truncate" title={pattern.notes}>
                              Note: {pattern.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {pattern.outcome && getOutcomeBadge(pattern.outcome)}
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {formatTimestamp(pattern.acknowledged_at)}
                        </div>
                        {pattern.follow_up_required && pattern.follow_up_date && (
                          <div className="text-xs text-orange-600">
                            Follow-up: {new Date(pattern.follow_up_date).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}