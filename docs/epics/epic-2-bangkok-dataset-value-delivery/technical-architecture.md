# Technical Architecture

## Dashboard Data Flow
```typescript
// Dashboard API Integration
const useBangkokDashboard = () => {
  const { data: summary } = useSWR('/api/readings/summary', {
    refreshInterval: 300000, // 5 minutes
    revalidateOnFocus: false
  })

  const { data: timeseries } = useSWR(
    `/api/readings/timeseries?range=${dateRange}`,
    { revalidateOnFocus: false }
  )

  return { summary, timeseries, isLoading, error }
}
```

## Statistical Validation Components
```typescript
// Confidence Interval Display
interface ConfidenceInterval {
  value: number
  lower: number
  upper: number
  confidence_level: number
  p_value: number
}

const StatisticalMetric: React.FC<{metric: ConfidenceInterval}> = ({metric}) => (
  <div className="statistical-metric">
    <div className="value">{metric.value.toFixed(1)}%</div>
    <div className="confidence">
      95% CI: {metric.lower.toFixed(1)}% - {metric.upper.toFixed(1)}%
    </div>
    <div className="significance">
      p-value: {metric.p_value < 0.001 ? '<0.001' : metric.p_value.toFixed(3)}
    </div>
  </div>
)
```

## Export System Architecture
```typescript
// Export Job Management
export class ExportManager {
  async createExport(
    format: 'pdf' | 'csv' | 'excel',
    dateRange: DateRange,
    userId: string
  ): Promise<ExportJob> {
    // Validate Professional tier
    await validateSubscriptionTier(userId, 'professional')

    // Create export job
    const job = await createExportJob({
      format, dateRange, userId,
      status: 'queued'
    })

    // Queue processing
    await queueExportProcessing(job.id)

    return job
  }
}
```

---
