/**
 * Pattern Configuration Modal Component
 * Story 3.3: Failure Pattern Detection Engine
 *
 * Configuration interface for pattern detection settings and filters
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Settings,
  Filter,
  _Clock,
  Target,
  AlertTriangle,
  Activity,
  TrendingUp,
  Zap,
  RefreshCw,
  Save,
  RotateCcw
} from 'lucide-react'
import type {
  PatternSeverity,
  PatternType,
  TimeWindow,
  AlgorithmType,
  OutlierHandling,
  ConfidenceMethod
} from '@/types/patterns'

interface PatternConfigModalProps {
  open: boolean
  onClose: () => void
  filters: {
    timeWindow: TimeWindow
    severityFilter: PatternSeverity[]
    patternTypes: PatternType[]
    confidenceThreshold: number
    selectedSensors: string[]
  }
  onFiltersChange: (filters: unknown) => void
  autoRefresh: boolean
  refreshInterval: number
  onAutoRefreshChange: (enabled: boolean) => void
  onRefreshIntervalChange: (interval: number) => void
}

interface AlgorithmConfig {
  algorithm_type: AlgorithmType
  sensitivity: number
  threshold_multiplier: number
  minimum_data_points: number
  lookback_period: string
  seasonal_adjustment: boolean
  outlier_handling: OutlierHandling
  confidence_method: ConfidenceMethod
}

export function PatternConfigModal({
  open,
  onClose,
  filters,
  onFiltersChange,
  autoRefresh,
  refreshInterval,
  onAutoRefreshChange,
  onRefreshIntervalChange
}: PatternConfigModalProps) {
  const [localFilters, setLocalFilters] = useState(filters)
  const [localAutoRefresh, setLocalAutoRefresh] = useState(autoRefresh)
  const [localRefreshInterval, setLocalRefreshInterval] = useState(refreshInterval)

  const [algorithmConfig, setAlgorithmConfig] = useState<AlgorithmConfig>({
    algorithm_type: 'statistical_zscore',
    sensitivity: 5,
    threshold_multiplier: 2.5,
    minimum_data_points: 100,
    lookback_period: '7d',
    seasonal_adjustment: true,
    outlier_handling: 'exclude',
    confidence_method: 'statistical'
  })

  const [availableSensors] = useState([
    'SENSOR_001', 'SENSOR_002', 'SENSOR_003', 'SENSOR_004', 'SENSOR_005',
    'SENSOR_HVAC_001', 'SENSOR_HVAC_002', 'SENSOR_LIGHT_001', 'SENSOR_LIGHT_002',
    'SENSOR_POWER_001', 'SENSOR_POWER_002', 'SENSOR_WATER_001', 'SENSOR_WATER_002'
  ])

  useEffect(() => {
    setLocalFilters(filters)
    setLocalAutoRefresh(autoRefresh)
    setLocalRefreshInterval(refreshInterval)
  }, [filters, autoRefresh, refreshInterval])

  const handleApply = () => {
    onFiltersChange(localFilters)
    onAutoRefreshChange(localAutoRefresh)
    onRefreshIntervalChange(localRefreshInterval)
    onClose()
  }

  const handleReset = () => {
    const defaultFilters = {
      timeWindow: '24h' as TimeWindow,
      severityFilter: [] as PatternSeverity[],
      patternTypes: [] as PatternType[],
      confidenceThreshold: 70,
      selectedSensors: [] as string[]
    }
    setLocalFilters(defaultFilters)
    setLocalAutoRefresh(true)
    setLocalRefreshInterval(300000)
    setAlgorithmConfig({
      algorithm_type: 'statistical_zscore',
      sensitivity: 5,
      threshold_multiplier: 2.5,
      minimum_data_points: 100,
      lookback_period: '7d',
      seasonal_adjustment: true,
      outlier_handling: 'exclude',
      confidence_method: 'statistical'
    })
  }

  const toggleSeverityFilter = (severity: PatternSeverity) => {
    setLocalFilters(prev => ({
      ...prev,
      severityFilter: prev.severityFilter.includes(severity)
        ? prev.severityFilter.filter(s => s !== severity)
        : [...prev.severityFilter, severity]
    }))
  }

  const togglePatternType = (type: PatternType) => {
    setLocalFilters(prev => ({
      ...prev,
      patternTypes: prev.patternTypes.includes(type)
        ? prev.patternTypes.filter(t => t !== type)
        : [...prev.patternTypes, type]
    }))
  }

  const toggleSensor = (sensorId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      selectedSensors: prev.selectedSensors.includes(sensorId)
        ? prev.selectedSensors.filter(s => s !== sensorId)
        : [...prev.selectedSensors, sensorId]
    }))
  }

  const getSeverityIcon = (severity: PatternSeverity) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />
      case 'warning': return <TrendingUp className="h-4 w-4" />
      case 'info': return <Activity className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getPatternTypeIcon = (type: PatternType) => {
    switch (type) {
      case 'anomaly': return <Zap className="h-4 w-4" />
      case 'trend': return <TrendingUp className="h-4 w-4" />
      case 'threshold': return <Target className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const formatInterval = (ms: number) => {
    if (ms < 60000) return `${ms / 1000}s`
    if (ms < 3600000) return `${ms / 60000}m`
    return `${ms / 3600000}h`
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pattern Detection Configuration
          </DialogTitle>
          <DialogDescription>
            Configure pattern detection algorithms, filters, and refresh settings
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <Tabs defaultValue="filters" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="algorithms">Algorithms</TabsTrigger>
              <TabsTrigger value="sensors">Sensors</TabsTrigger>
              <TabsTrigger value="refresh">Refresh</TabsTrigger>
            </TabsList>

            <TabsContent value="filters" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Detection Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Time Window */}
                  <div className="space-y-2">
                    <Label>Time Window</Label>
                    <Select
                      value={localFilters.timeWindow}
                      onValueChange={(value: TimeWindow) =>
                        setLocalFilters(prev => ({ ...prev, timeWindow: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">Last Hour</SelectItem>
                        <SelectItem value="6h">Last 6 Hours</SelectItem>
                        <SelectItem value="24h">Last 24 Hours</SelectItem>
                        <SelectItem value="7d">Last 7 Days</SelectItem>
                        <SelectItem value="30d">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Confidence Threshold */}
                  <div className="space-y-2">
                    <Label>Confidence Threshold: {localFilters.confidenceThreshold}%</Label>
                    <Slider
                      value={[localFilters.confidenceThreshold]}
                      onValueChange={([value]) =>
                        setLocalFilters(prev => ({ ...prev, confidenceThreshold: value }))
                      }
                      min={50}
                      max={95}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>50% (Lower precision)</span>
                      <span>95% (Higher precision)</span>
                    </div>
                  </div>

                  {/* Severity Filter */}
                  <div className="space-y-2">
                    <Label>Severity Levels</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['critical', 'warning', 'info'] as PatternSeverity[]).map(severity => (
                        <Badge
                          key={severity}
                          variant={localFilters.severityFilter.includes(severity) ? 'default' : 'outline'}
                          className="cursor-pointer flex items-center gap-1"
                          onClick={() => toggleSeverityFilter(severity)}
                        >
                          {getSeverityIcon(severity)}
                          {severity}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave empty to include all severity levels
                    </p>
                  </div>

                  {/* Pattern Types */}
                  <div className="space-y-2">
                    <Label>Pattern Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['anomaly', 'trend', 'correlation', 'seasonal', 'threshold', 'frequency'] as PatternType[]).map(type => (
                        <Badge
                          key={type}
                          variant={localFilters.patternTypes.includes(type) ? 'default' : 'outline'}
                          className="cursor-pointer flex items-center gap-1"
                          onClick={() => togglePatternType(type)}
                        >
                          {getPatternTypeIcon(type)}
                          {type}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave empty to include all pattern types
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="algorithms" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Algorithm Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure the statistical algorithms used for pattern detection
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Algorithm Type */}
                  <div className="space-y-2">
                    <Label>Detection Algorithm</Label>
                    <Select
                      value={algorithmConfig.algorithm_type}
                      onValueChange={(value: AlgorithmType) =>
                        setAlgorithmConfig(prev => ({ ...prev, algorithm_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="statistical_zscore">Statistical Z-Score</SelectItem>
                        <SelectItem value="modified_zscore">Modified Z-Score</SelectItem>
                        <SelectItem value="isolation_forest">Isolation Forest</SelectItem>
                        <SelectItem value="moving_average">Moving Average</SelectItem>
                        <SelectItem value="seasonal_decomposition">Seasonal Decomposition</SelectItem>
                        <SelectItem value="interquartile_range">Interquartile Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sensitivity */}
                  <div className="space-y-2">
                    <Label>Sensitivity: {algorithmConfig.sensitivity}</Label>
                    <Slider
                      value={[algorithmConfig.sensitivity]}
                      onValueChange={([value]) =>
                        setAlgorithmConfig(prev => ({ ...prev, sensitivity: value }))
                      }
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 (Less sensitive)</span>
                      <span>10 (More sensitive)</span>
                    </div>
                  </div>

                  {/* Threshold Multiplier */}
                  <div className="space-y-2">
                    <Label>Threshold Multiplier: {algorithmConfig.threshold_multiplier}</Label>
                    <Slider
                      value={[algorithmConfig.threshold_multiplier]}
                      onValueChange={([value]) =>
                        setAlgorithmConfig(prev => ({ ...prev, threshold_multiplier: value }))
                      }
                      min={1.5}
                      max={4.0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  {/* Minimum Data Points */}
                  <div className="space-y-2">
                    <Label>Minimum Data Points</Label>
                    <Input
                      type="number"
                      value={algorithmConfig.minimum_data_points}
                      onChange={(e) =>
                        setAlgorithmConfig(prev => ({
                          ...prev,
                          minimum_data_points: parseInt(e.target.value) || 100
                        }))
                      }
                      min={50}
                      max={1000}
                    />
                  </div>

                  {/* Advanced Options */}
                  <div className="space-y-4">
                    <Separator />
                    <h4 className="font-medium">Advanced Options</h4>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Seasonal Adjustment</Label>
                        <p className="text-xs text-muted-foreground">
                          Account for seasonal patterns in data
                        </p>
                      </div>
                      <Switch
                        checked={algorithmConfig.seasonal_adjustment}
                        onCheckedChange={(checked) =>
                          setAlgorithmConfig(prev => ({ ...prev, seasonal_adjustment: checked }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Outlier Handling</Label>
                      <Select
                        value={algorithmConfig.outlier_handling}
                        onValueChange={(value: OutlierHandling) =>
                          setAlgorithmConfig(prev => ({ ...prev, outlier_handling: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="include">Include outliers</SelectItem>
                          <SelectItem value="exclude">Exclude outliers</SelectItem>
                          <SelectItem value="cap">Cap outliers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Confidence Method</Label>
                      <Select
                        value={algorithmConfig.confidence_method}
                        onValueChange={(value: ConfidenceMethod) =>
                          setAlgorithmConfig(prev => ({ ...prev, confidence_method: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="statistical">Statistical</SelectItem>
                          <SelectItem value="historical">Historical</SelectItem>
                          <SelectItem value="ensemble">Ensemble</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sensors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sensor Selection</CardTitle>
                  <CardDescription>
                    Choose specific sensors to monitor for pattern detection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {localFilters.selectedSensors.length} of {availableSensors.length} sensors selected
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocalFilters(prev => ({ ...prev, selectedSensors: [] }))}
                        >
                          Clear All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocalFilters(prev => ({ ...prev, selectedSensors: [...availableSensors] }))}
                        >
                          Select All
                        </Button>
                      </div>
                    </div>

                    <ScrollArea className="h-[300px]">
                      <div className="grid gap-2">
                        {availableSensors.map(sensorId => (
                          <div
                            key={sensorId}
                            className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleSensor(sensorId)}
                          >
                            <span className="text-sm font-mono">{sensorId}</span>
                            <Badge variant={localFilters.selectedSensors.includes(sensorId) ? 'default' : 'outline'}>
                              {localFilters.selectedSensors.includes(sensorId) ? 'Selected' : 'Available'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <p className="text-xs text-muted-foreground">
                      Leave empty to monitor all available sensors
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="refresh" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Auto-Refresh Settings
                  </CardTitle>
                  <CardDescription>
                    Configure automatic pattern detection refresh
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Auto-Refresh</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically refresh pattern detection results
                      </p>
                    </div>
                    <Switch
                      checked={localAutoRefresh}
                      onCheckedChange={setLocalAutoRefresh}
                    />
                  </div>

                  {localAutoRefresh && (
                    <div className="space-y-2">
                      <Label>Refresh Interval: {formatInterval(localRefreshInterval)}</Label>
                      <Slider
                        value={[localRefreshInterval]}
                        onValueChange={([value]) => setLocalRefreshInterval(value)}
                        min={30000}
                        max={3600000}
                        step={30000}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>30s</span>
                        <span>1h</span>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Performance Impact</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>• Shorter intervals provide more real-time updates</div>
                      <div>• Longer intervals reduce server load and battery usage</div>
                      <div>• Recommended: 5 minutes for production monitoring</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              <Save className="h-4 w-4 mr-2" />
              Apply Configuration
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}