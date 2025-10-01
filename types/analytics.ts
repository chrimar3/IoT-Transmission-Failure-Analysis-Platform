/**
 * Analytics Type Definitions for Time-Series Visualizations
 * Supports Story 3.2: Interactive Time-Series Visualizations
 */

export interface SensorReading {
  id: string
  timestamp: string
  sensor_id: string
  floor_number: number
  equipment_type: string
  reading_value: number
  unit: string
  status: 'normal' | 'warning' | 'error'
}

export interface TimeSeriesDataPoint {
  timestamp: string
  value: number
  sensor_id: string
  status: 'normal' | 'warning' | 'error'
}

export interface MultiSeriesData {
  sensor_id: string
  equipment_type: string
  floor_number: number
  unit: string
  color: string
  data: TimeSeriesDataPoint[]
}

export interface SensorMetadata {
  sensor_id: string
  equipment_type: string
  floor_number: number
  location: string
  unit: string
  status: 'online' | 'offline' | 'maintenance'
  last_reading: string
}

export interface ChartConfiguration {
  sensors: string[]
  start_date: string
  end_date: string
  interval: 'minute' | 'hour' | 'day' | 'week'
  max_points: number
  show_legend: boolean
  chart_type: 'line' | 'area' | 'bar'
}

export interface DateRangePreset {
  label: string
  value: string
  start_date: () => Date
  end_date: () => Date
}

export interface ChartExportOptions {
  format: 'png' | 'pdf'
  title: string
  include_timestamp: boolean
  include_data_range: boolean
  quality: 'low' | 'medium' | 'high'
  width: number
  height: number
}

export interface TimeSeriesApiResponse {
  success: boolean
  data: {
    series: MultiSeriesData[]
    metadata: {
      total_points: number
      decimated: boolean
      query_time_ms: number
      cache_hit: boolean
    }
  }
  error?: string
}

export interface ChartZoomState {
  start_date: string
  end_date: string
  is_zoomed: boolean
}

export interface ChartInteractionState {
  hover_point: TimeSeriesDataPoint | null
  selected_sensors: string[]
  zoom_state: ChartZoomState
  pan_offset: number
}

export interface PerformanceMetrics {
  data_load_time: number
  render_time: number
  interaction_latency: number
  memory_usage: number
  points_rendered: number
}

export interface ChartTheme {
  colors: {
    primary: string[]
    secondary: string[]
    grid: string
    text: string
    background: string
    tooltip: string
  }
  fonts: {
    family: string
    size: {
      small: number
      medium: number
      large: number
    }
  }
  spacing: {
    margin: number
    padding: number
  }
}

// Bangkok Dataset Specific Types
export interface BangkokSensorData {
  sensor_id: string
  building_floor: number
  equipment_category: 'HVAC' | 'Lighting' | 'Power' | 'Water' | 'Security'
  location_zone: string
  readings: SensorReading[]
}

export interface BangkokDatasetMetrics {
  total_sensors: number
  total_readings: number
  date_range: {
    start: string
    end: string
  }
  data_quality_score: number
  coverage_percentage: number
}

// API Request/Response Types
export interface TimeSeriesRequest {
  sensor_ids: string[]
  start_date: string
  end_date: string
  interval?: 'minute' | 'hour' | 'day' | 'week'
  max_points?: number
  aggregation?: 'avg' | 'sum' | 'min' | 'max'
}

export interface ExportRequest {
  chart_config: ChartConfiguration
  export_options: ChartExportOptions
  title: string
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ApiError {
  error: string
  message: string
  validation_errors?: ValidationError[]
  status_code: number
}

// Chart.js Specific Type Definitions for Time-Series Charts
export interface ChartDataPoint {
  x: number // timestamp as number for Chart.js
  y: number // value
  status?: 'normal' | 'warning' | 'error'
  sensor_id?: string
}

export interface ChartDataset {
  label: string
  data: ChartDataPoint[]
  borderColor: string
  backgroundColor: string
  borderWidth: number
  pointRadius: number | ((context: any) => number)
  pointBackgroundColor: string | ((context: any) => string)
  fill: boolean
  tension: number
  spanGaps: boolean
}

export interface ChartLegendOptions {
  display: boolean
  position: 'top' | 'bottom' | 'left' | 'right'
  labels: {
    color: string
    font: {
      family: string
      size: number
    }
  }
}

export interface ChartTooltipOptions {
  backgroundColor: string
  titleColor: string
  bodyColor: string
  borderColor: string
  borderWidth: number
  callbacks: {
    title: (tooltipItems: any[]) => string
    label: (context: any) => string
  }
}

export interface ChartScaleOptions {
  type: 'time' | 'linear' | 'category'
  time?: {
    displayFormats: {
      minute: string
      hour: string
      day: string
      week: string
      month: string
    }
  }
  grid: {
    color: string
    drawBorder: boolean
  }
  ticks: {
    color: string
    font: {
      family: string
      size: number
    }
  }
}

export interface ChartAnimationOptions {
  duration: number
  easing?: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad'
}

export interface ChartInteractionOptions {
  mode: 'index' | 'nearest' | 'point' | 'dataset'
  intersect: boolean
}

export interface ChartPluginOptions {
  legend: ChartLegendOptions
  title: {
    display: boolean
    text?: string
  }
  tooltip: ChartTooltipOptions
}

export interface FullChartOptions {
  responsive: boolean
  maintainAspectRatio: boolean
  animation: ChartAnimationOptions
  interaction: ChartInteractionOptions
  parsing: boolean
  normalized: boolean
  plugins: ChartPluginOptions
  scales: {
    x: ChartScaleOptions
    y: ChartScaleOptions
  }
  onHover?: (event: any, activeElements: any[]) => void
  onClick?: (event: any, activeElements: any[]) => void
}

// Performance and Optimization Types
export interface DecimationConfig {
  enabled: boolean
  algorithm: 'lttb' | 'min-max' | 'auto'
  samples: number
  threshold: number
}

export interface ChartPerformanceConfig {
  maxDataPoints: number
  animationDuration: number
  decimation: DecimationConfig
  parsing: boolean
  normalized: boolean
  spanGaps: boolean
}

export interface RealTimeUpdateConfig {
  enabled: boolean
  interval: number // milliseconds
  maxDataAge: number // milliseconds
  bufferSize: number
  autoScroll: boolean
}