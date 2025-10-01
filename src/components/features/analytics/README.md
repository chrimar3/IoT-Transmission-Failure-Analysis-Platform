# TimeSeriesChart Component - Interactive Time-Series Visualizations

## Overview

The TimeSeriesChart component provides high-performance interactive time-series visualizations for IoT sensor data. Built with Chart.js and optimized for large datasets (100K+ data points) through intelligent data decimation algorithms.

## Features

- **Performance Optimized**: Handles large datasets efficiently using data decimation
- **Interactive**: Hover, zoom, pan capabilities with real-time feedback
- **Multi-Sensor Support**: Display multiple sensor readings on the same chart
- **Status Indicators**: Visual indicators for normal, warning, and error states
- **Customizable**: Themes, colors, and chart types (line, area)
- **TypeScript**: Full type safety with comprehensive interfaces
- **Accessible**: WCAG compliant with proper ARIA labels and keyboard navigation

## Basic Usage

```tsx
import { TimeSeriesChart } from '@/components/features/analytics'
import { MultiSeriesData, ChartConfiguration } from '@/types/analytics'

const data: MultiSeriesData[] = [
  {
    sensor_id: 'hvac_01',
    equipment_type: 'HVAC',
    floor_number: 1,
    unit: 'kWh',
    color: '#3B82F6',
    data: [
      {
        timestamp: '2024-01-01T00:00:00Z',
        value: 25.5,
        sensor_id: 'hvac_01',
        status: 'normal'
      },
      // ... more data points
    ]
  }
]

const config: ChartConfiguration = {
  sensors: ['hvac_01'],
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2024-01-02T00:00:00Z',
  interval: 'hour',
  max_points: 1000,
  show_legend: true,
  chart_type: 'line'
}

function Dashboard() {
  return (
    <TimeSeriesChart
      data={data}
      config={config}
      height={400}
      onInteraction={(state) => console.log('Interaction:', state)}
      onPerformanceMetrics={(metrics) => console.log('Performance:', metrics)}
    />
  )
}
```

## Advanced Usage

### Data Decimation

```tsx
import { decimateTimeSeriesData } from '@/components/features/analytics'

// Custom decimation for performance
const decimatedResult = decimateTimeSeriesData(largeDataset, {
  maxPoints: 500,
  algorithm: 'lttb', // 'lttb' | 'minmax' | 'simple' | 'adaptive'
  preserveAnomalies: true,
  preserveEdges: true
})

console.log(`Reduced from ${decimatedResult.originalLength} to ${decimatedResult.decimatedLength} points`)
console.log(`Compression: ${decimatedResult.compressionRatio.toFixed(1)}%`)
```

### Custom Themes

```tsx
const customTheme: ChartTheme = {
  colors: {
    primary: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
    secondary: ['#FFE66D', '#95E1D3', '#A8E6CF'],
    grid: '#E5E7EB',
    text: '#374151',
    background: '#FFFFFF',
    tooltip: '#1F2937'
  },
  fonts: {
    family: 'Inter, sans-serif',
    size: { small: 12, medium: 14, large: 16 }
  },
  spacing: { margin: 16, padding: 12 }
}

<TimeSeriesChart
  data={data}
  config={config}
  theme={customTheme}
/>
```

### Performance Monitoring

```tsx
function MonitoredChart() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)

  return (
    <div>
      <TimeSeriesChart
        data={data}
        config={config}
        onPerformanceMetrics={setMetrics}
      />

      {metrics && (
        <div className="performance-stats">
          <p>Render Time: {metrics.render_time.toFixed(2)}ms</p>
          <p>Points Rendered: {metrics.points_rendered.toLocaleString()}</p>
          <p>Memory Usage: {(metrics.memory_usage / 1024 / 1024).toFixed(1)}MB</p>
        </div>
      )}
    </div>
  )
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `MultiSeriesData[]` | ✅ | - | Array of sensor data series |
| `config` | `ChartConfiguration` | ✅ | - | Chart configuration options |
| `theme` | `ChartTheme` | ❌ | `DEFAULT_THEME` | Custom theme configuration |
| `loading` | `boolean` | ❌ | `false` | Show loading state |
| `error` | `string \| null` | ❌ | `null` | Error message to display |
| `onInteraction` | `(state: ChartInteractionState) => void` | ❌ | - | Interaction callback |
| `onPerformanceMetrics` | `(metrics: PerformanceMetrics) => void` | ❌ | - | Performance metrics callback |
| `height` | `number` | ❌ | `400` | Chart height in pixels |
| `className` | `string` | ❌ | `''` | Additional CSS classes |

## Data Decimation Algorithms

### LTTB (Largest Triangle Three Buckets)
- **Best for**: Preserving visual shape and trends
- **Use case**: General purpose, maintains important peaks and valleys
- **Performance**: Good balance between quality and speed

### Min-Max
- **Best for**: Preserving extreme values
- **Use case**: When you need to see all highs and lows
- **Performance**: Fast, good for detecting anomalies

### Simple
- **Best for**: Uniform sampling
- **Use case**: Quick previews, stable data patterns
- **Performance**: Fastest, but may miss important features

### Adaptive
- **Best for**: Automatic algorithm selection
- **Use case**: Unknown data characteristics
- **Performance**: Chooses best algorithm based on data analysis

## Performance Guidelines

### Large Datasets (10K+ points)
- Use `max_points: 1000` or lower
- Enable `decimation` with `lttb` algorithm
- Set `animation.duration: 0` for instant rendering
- Consider `parsing: false` and `normalized: true`

### Real-time Updates
- Use `RealTimeUpdateConfig` for streaming data
- Implement data buffering with `bufferSize`
- Set appropriate `maxDataAge` to prevent memory leaks

### Memory Optimization
- Monitor `PerformanceMetrics.memory_usage`
- Clear old data points regularly
- Use `spanGaps: true` for sparse datasets

## Browser Support

- Modern browsers with Canvas support
- IE11+ (with polyfills)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Testing

The component includes comprehensive tests covering:
- Rendering states (loading, error, empty, data)
- Data processing and decimation
- Configuration options
- Performance with large datasets
- Accessibility features

Run tests:
```bash
npm test __tests__/components/features/analytics/TimeSeriesChart.test.tsx
```

## Contributing

When contributing to the TimeSeriesChart component:

1. Add tests for new features
2. Update type definitions in `types/analytics.ts`
3. Consider performance impact for large datasets
4. Ensure accessibility compliance
5. Update this documentation

## Related Components

- `TimeSeriesDemo` - Interactive demonstration component
- Data decimation utilities in `dataDecimation.ts`
- Analytics types in `types/analytics.ts`