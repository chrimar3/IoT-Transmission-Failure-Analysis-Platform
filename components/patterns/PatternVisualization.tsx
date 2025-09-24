/**
 * Pattern Visualization Component
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Interactive charts and visualizations for pattern analysis
 */

'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ReferenceLine
} from 'recharts'
import {
  _TrendingUp,
  _Activity,
  _AlertTriangle,
  BarChart3,
  PieChart as _PieChartIcon,
  _Scatter3D,
  Download,
  _Settings
} from 'lucide-react'
import type { DetectedPattern, PatternSeverity, PatternType } from '@/types/patterns'

interface PatternVisualizationProps {
  patterns: DetectedPattern[]
  selectedPattern: DetectedPattern | null
  onPatternSelect: (pattern: DetectedPattern | null) => void
}

type VisualizationType = 'timeline' | 'scatter' | 'distribution' | 'equipment'

export function PatternVisualization({
  patterns,
  selectedPattern,
  onPatternSelect
}: PatternVisualizationProps) {
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('timeline')
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all')

  // Process data for timeline chart
  const timelineData = useMemo(() => {
    const filteredPatterns = equipmentFilter === 'all'
      ? patterns
      : patterns.filter(p => p.equipment_type === equipmentFilter)

    return filteredPatterns
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((pattern, index) => ({
        timestamp: new Date(pattern.timestamp).toLocaleDateString(),
        fullTimestamp: pattern.timestamp,
        confidence: pattern.confidence_score,
        severity: pattern.severity,
        patternType: pattern.pattern_type,
        equipmentType: pattern.equipment_type,
        id: pattern.id,
        description: pattern.description,
        index
      }))
  }, [patterns, equipmentFilter])

  // Process data for scatter plot (confidence vs severity)
  const scatterData = useMemo(() => {
    const severityValues = { info: 1, warning: 2, critical: 3 }

    return patterns.map(pattern => ({
      confidence: pattern.confidence_score,
      severity: severityValues[pattern.severity],
      severityLabel: pattern.severity,
      patternType: pattern.pattern_type,
      equipmentType: pattern.equipment_type,
      id: pattern.id,
      description: pattern.description
    }))
  }, [patterns])

  // Process data for pattern type distribution
  const distributionData = useMemo(() => {
    const typeCount = patterns.reduce((acc, pattern) => {
      acc[pattern.pattern_type] = (acc[pattern.pattern_type] || 0) + 1
      return acc
    }, {} as Record<PatternType, number>)

    return Object.entries(typeCount).map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / patterns.length) * 100)
    }))
  }, [patterns])

  // Process data for equipment breakdown
  const equipmentData = useMemo(() => {
    const equipmentStats = patterns.reduce((acc, pattern) => {
      const key = pattern.equipment_type
      if (!acc[key]) {
        acc[key] = {
          total: 0,
          critical: 0,
          warning: 0,
          info: 0,
          avgConfidence: 0
        }
      }
      acc[key].total += 1
      acc[key][pattern.severity] += 1
      acc[key].avgConfidence += pattern.confidence_score
      return acc
    }, {} as Record<string, {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      avgConfidence: number;
    }>)

    return Object.entries(equipmentStats).map(([equipment, stats]) => ({
      equipment,
      total: stats.total,
      critical: stats.critical,
      warning: stats.warning,
      info: stats.info,
      avgConfidence: Math.round(stats.avgConfidence / stats.total)
    }))
  }, [patterns])

  const equipmentTypes = [...new Set(patterns.map(p => p.equipment_type))]

  const getSeverityColor = (severity: PatternSeverity) => {
    switch (severity) {
      case 'critical': return '#ef4444'
      case 'warning': return '#f59e0b'
      case 'info': return '#3b82f6'
      default: return '#6b7280'
    }
  }

  const getPatternTypeColor = (type: PatternType) => {
    const colors = {
      anomaly: '#ef4444',
      trend: '#f59e0b',
      correlation: '#10b981',
      seasonal: '#3b82f6',
      threshold: '#8b5cf6',
      frequency: '#06b6d4'
    }
    return colors[type] || '#6b7280'
  }

  const exportVisualization = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      visualization_type: visualizationType,
      equipment_filter: equipmentFilter,
      data: {
        timeline: timelineData,
        scatter: scatterData,
        distribution: distributionData,
        equipment: equipmentData
      },
      patterns_count: patterns.length
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pattern-visualization-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const CustomTooltip = ({ active, payload, _label }: unknown) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.description}</p>
          <p className="text-sm text-muted-foreground">
            Equipment: {data.equipmentType}
          </p>
          <p className="text-sm">
            Confidence: {data.confidence}%
          </p>
          <p className="text-sm">
            Severity: <span className="capitalize">{data.severityLabel || data.severity}</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Pattern Visualization
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Equipment</SelectItem>
                  {equipmentTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={exportVisualization}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={visualizationType} onValueChange={(value: unknown) => setVisualizationType(value)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="scatter">Confidence Plot</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="equipment">Equipment</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pattern Timeline</CardTitle>
                  <CardDescription>
                    Chronological view of detected patterns with confidence scores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timestamp"
                          fontSize={12}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          domain={[0, 100]}
                          label={{ value: 'Confidence %', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="5 5" label="Min Confidence" />
                        <Line
                          type="monotone"
                          dataKey="confidence"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={(props: unknown) => {
                            const { payload } = props
                            return (
                              <circle
                                cx={props.cx}
                                cy={props.cy}
                                r={4}
                                fill={getSeverityColor(payload.severity)}
                                stroke="#fff"
                                strokeWidth={2}
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  const pattern = patterns.find(p => p.id === payload.id)
                                  if (pattern) onPatternSelect(pattern)
                                }}
                              />
                            )
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scatter" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Confidence vs Severity Analysis</CardTitle>
                  <CardDescription>
                    Relationship between pattern confidence and severity levels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart data={scatterData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="confidence"
                          type="number"
                          domain={[0, 100]}
                          label={{ value: 'Confidence %', position: 'insideBottom', offset: -10 }}
                        />
                        <YAxis
                          dataKey="severity"
                          type="number"
                          domain={[0.5, 3.5]}
                          tickFormatter={(value) => {
                            const labels = { 1: 'Info', 2: 'Warning', 3: 'Critical' }
                            return labels[value as keyof typeof labels] || ''
                          }}
                          label={{ value: 'Severity', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Scatter
                          dataKey="severity"
                          fill={(entry: unknown) => getSeverityColor(entry.severityLabel)}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="distribution" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pattern Type Distribution</CardTitle>
                    <CardDescription>
                      Breakdown of detected pattern types
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={distributionData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ type, percentage }) => `${type} (${percentage}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {distributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getPatternTypeColor(entry.type as PatternType)} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pattern Count by Type</CardTitle>
                    <CardDescription>
                      Frequency of different pattern types
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distributionData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="type" fontSize={12} />
                          <YAxis />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            fill={(entry: unknown) => getPatternTypeColor(entry.type)}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="equipment" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Equipment Analysis</CardTitle>
                  <CardDescription>
                    Pattern distribution and severity breakdown by equipment type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={equipmentData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="equipment" fontSize={12} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" />
                          <Bar dataKey="warning" stackId="a" fill="#f59e0b" name="Warning" />
                          <Bar dataKey="info" stackId="a" fill="#3b82f6" name="Info" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {equipmentData.map((item) => (
                        <Card key={item.equipment} className="border">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">{item.equipment}</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>Total Patterns</span>
                                <Badge variant="outline">{item.total}</Badge>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span>Avg Confidence</span>
                                <Badge variant="secondary">{item.avgConfidence}%</Badge>
                              </div>
                              <div className="space-y-1">
                                {item.critical > 0 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-red-600">Critical</span>
                                    <span>{item.critical}</span>
                                  </div>
                                )}
                                {item.warning > 0 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-yellow-600">Warning</span>
                                    <span>{item.warning}</span>
                                  </div>
                                )}
                                {item.info > 0 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-blue-600">Info</span>
                                    <span>{item.info}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Selected Pattern Details */}
      {selectedPattern && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-lg">Selected Pattern Details</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPatternSelect(null)}
              className="w-fit"
            >
              Clear Selection
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Pattern Information</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Description:</strong> {selectedPattern.description}</div>
                  <div><strong>Type:</strong> {selectedPattern.pattern_type}</div>
                  <div><strong>Severity:</strong> {selectedPattern.severity}</div>
                  <div><strong>Confidence:</strong> {selectedPattern.confidence_score}%</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Equipment Details</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Equipment:</strong> {selectedPattern.equipment_type}</div>
                  <div><strong>Sensor ID:</strong> {selectedPattern.sensor_id}</div>
                  <div><strong>Floor:</strong> {selectedPattern.floor_number}</div>
                  <div><strong>Timestamp:</strong> {new Date(selectedPattern.timestamp).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}