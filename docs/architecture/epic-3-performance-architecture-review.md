# Architecture Review: Epic 3 Performance Foundation

**Review Type**: Technical Architecture Decision  
**Focus**: Streaming/Decimation Approach for Bangkok Dataset Scale  
**Date**: 2025-01-11  
**Reviewers**: Product Owner (Sarah), Development Team, QA (Quinn)  

## 📋 ARCHITECTURE REVIEW SCOPE

### **Problem Statement**
Epic 3 Core Analytics Dashboard must handle Bangkok dataset scale (13.4M data points) while maintaining:
- <2 second chart rendering
- <100ms user interaction latency
- Mobile device compatibility
- Professional tier revenue protection

### **Technical Constraints**
- Next.js 14+ App Router serverless architecture
- Supabase PostgreSQL with 500MB free tier storage
- Vercel serverless function 10-second execution limit
- Browser memory limitations (especially mobile)
- Professional tier differentiation requirements

---

## 🎯 RECOMMENDED ARCHITECTURE DECISIONS

### **Decision 1: Multi-Layer Data Decimation Strategy**

#### **Approved Approach**: Zoom-Adaptive Progressive Loading
```typescript
interface DataResolutionLayer {
  level: 'overview' | 'detailed' | 'precision';
  timeWindow: string;
  maxPointsPerSensor: number;
  compressionRatio: number;
  useCase: string;
}

const RESOLUTION_LAYERS: DataResolutionLayer[] = [
  {
    level: 'overview',
    timeWindow: '30d',
    maxPointsPerSensor: 120,    // 1 point per 6 hours
    compressionRatio: 0.003,    // 99.7% reduction
    useCase: 'Executive dashboard, mobile overview'
  },
  {
    level: 'detailed', 
    timeWindow: '7d',
    maxPointsPerSensor: 1008,   // 1 point per 10 minutes
    compressionRatio: 0.07,     // 93% reduction  
    useCase: 'Interactive analysis, pattern detection'
  },
  {
    level: 'precision',
    timeWindow: '24h',
    maxPointsPerSensor: 1440,   // 1 point per minute
    compressionRatio: 1.0,      // Full resolution
    useCase: 'Professional tier detailed analysis'
  }
];
```

#### **Implementation Strategy**:
1. **Server-Side Pre-computation**: Materialized views for each resolution layer
2. **API Endpoint Design**: `/api/analytics/timeseries?resolution=overview|detailed|precision`
3. **Client-Side Caching**: Progressive enhancement with higher resolution on demand
4. **Professional Tier**: Access to precision layer, Free tier limited to overview/detailed

#### **Database Schema Extension**:
```sql
-- Pre-computed resolution layers
CREATE MATERIALIZED VIEW sensor_data_overview AS
SELECT 
    sensor_id,
    DATE_TRUNC('hour', timestamp) + INTERVAL '6 hour' * FLOOR(EXTRACT(HOUR FROM timestamp) / 6) as time_bucket,
    AVG(reading_value) as avg_value,
    MIN(reading_value) as min_value,
    MAX(reading_value) as max_value,
    STDDEV(reading_value) as deviation,
    COUNT(*) as reading_count
FROM sensor_readings 
GROUP BY sensor_id, time_bucket
ORDER BY sensor_id, time_bucket;

-- Index for performance
CREATE INDEX idx_sensor_data_overview_lookup ON sensor_data_overview(sensor_id, time_bucket);
```

### **Decision 2: Streaming Export Architecture**

#### **Approved Approach**: Server-Side Streaming with Progress Tracking
```typescript
// API Route: /api/export/stream
export async function POST(request: NextRequest) {
  const { filters, format, userId } = await request.json();
  
  // Create export job for tracking
  const jobId = await createExportJob(userId, filters, format);
  
  // Stream processing in background
  const stream = new ReadableStream({
    async start(controller) {
      const query = buildStreamingQuery(filters);
      const batchSize = 1000;
      let processed = 0;
      
      for await (const batch of queryInBatches(query, batchSize)) {
        const csvChunk = convertToCSV(batch);
        controller.enqueue(csvChunk);
        
        processed += batch.length;
        await updateExportProgress(jobId, processed);
      }
      
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="bangkok-analytics-${Date.now()}.csv"`
    }
  });
}
```

#### **Key Components**:
1. **Job Queue System**: Track export progress and status
2. **Batch Processing**: 1000 records per batch to manage memory
3. **Progress API**: Real-time updates to client during export
4. **Format Handlers**: CSV, Excel, PDF with streaming support
5. **Error Recovery**: Resume failed exports from last processed batch

#### **File Structure**:
```
src/lib/export/
├── streaming-exporter.ts      # Core streaming logic
├── format-handlers/
│   ├── csv-stream.ts         # CSV streaming implementation
│   ├── excel-stream.ts       # Excel streaming with multiple sheets
│   └── pdf-stream.ts         # PDF generation with charts
├── job-queue.ts              # Export job management
└── progress-tracker.ts       # Real-time progress updates
```

### **Decision 3: Chart Performance Optimization**

#### **Approved Approach**: React-Charts with Canvas Rendering + Data Decimation
```typescript
interface OptimizedChartProps {
  data: SensorReading[];
  resolution: 'overview' | 'detailed' | 'precision';
  maxPoints?: number;
  enableInteractions?: boolean;
}

export const OptimizedTimeSeriesChart: React.FC<OptimizedChartProps> = ({
  data,
  resolution = 'detailed',
  maxPoints = 1000,
  enableInteractions = true
}) => {
  // Data decimation hook
  const decimatedData = useMemo(() => {
    return decimateData(data, { maxPoints, preserveAnomalies: true });
  }, [data, maxPoints]);
  
  // Canvas rendering for performance
  const chartConfig = useMemo(() => ({
    type: 'line',
    data: {
      datasets: formatDataForChart(decimatedData)
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false, // Disable animations for performance
      interaction: {
        mode: enableInteractions ? 'index' : false,
        intersect: false,
      },
      plugins: {
        decimation: {
          enabled: true,
          algorithm: 'lttb', // Largest-Triangle-Three-Buckets
          samples: maxPoints
        }
      }
    }
  }), [decimatedData, maxPoints, enableInteractions]);
  
  return (
    <div className="chart-container" style={{ height: '400px' }}>
      <Line {...chartConfig} />
    </div>
  );
};
```

#### **Chart Library Decision**: Chart.js with Canvas Backend
- **Rationale**: Better performance than SVG for large datasets
- **Canvas Rendering**: Hardware-accelerated rendering
- **LTTB Algorithm**: Industry-standard decimation preserving visual patterns
- **Mobile Optimization**: Touch gesture support built-in

#### **Alternative Considered**: D3.js with Custom Canvas
- **Rejected**: Higher development complexity, no clear performance advantage
- **Trade-off**: More customization vs faster implementation

### **Decision 4: Mobile-First Responsive Strategy**

#### **Approved Approach**: Progressive Web App (PWA) with Responsive Design
```typescript
// Mobile-optimized component structure
export const MobileDashboard: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { data } = useAnalytics({ 
    resolution: isMobile ? 'overview' : 'detailed' 
  });
  
  return (
    <div className="dashboard-grid">
      {isMobile ? (
        <MobileCardLayout data={data} />
      ) : (
        <DesktopGridLayout data={data} />
      )}
    </div>
  );
};

// Touch-optimized interactions
const useTouchOptimizedChart = () => {
  return {
    gestureHandling: 'auto',
    pinchToZoom: true,
    touchThreshold: 8, // Larger touch targets
    responsiveResize: true
  };
};
```

#### **Mobile Performance Requirements**:
- **Data Loading**: Overview resolution only (120 points per sensor)
- **Touch Interactions**: 8px minimum touch targets
- **Offline Support**: Service worker for cached data
- **Battery Optimization**: Reduce animation and refresh frequency

#### **PWA Features**:
```json
// manifest.json
{
  "name": "CU-BEMS Analytics",
  "short_name": "CU-BEMS",
  "start_url": "/dashboard",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#1f2937",
  "background_color": "#ffffff",
  "categories": ["business", "analytics"],
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

---

## 🧪 TESTING INFRASTRUCTURE REQUIREMENTS

### **Performance Testing Architecture**

#### **Bangkok Dataset Scale Testing Environment**
```bash
# Performance test configuration
# package.json scripts
{
  "test:performance": "jest --config=jest.performance.config.js",
  "test:dataset-full": "node scripts/test-bangkok-dataset.js --size=full",
  "test:mobile": "playwright test --config=playwright.mobile.config.ts",
  "test:memory": "node --expose-gc scripts/memory-test.js"
}
```

#### **Test Data Setup**:
```typescript
// scripts/setup-test-data.ts
export async function setupBangkokTestData() {
  const datasets = {
    sample: await loadBangkokData({ limit: 1000 }),      // 1k records
    medium: await loadBangkokData({ limit: 100000 }),    // 100k records  
    full: await loadBangkokData({ limit: null }),        // 13.4M records
    synthetic: await generateSyntheticData(1000000)      // 1M synthetic
  };
  
  // Pre-load into test database
  await seedTestDatabase(datasets);
  
  return datasets;
}
```

#### **Performance Benchmarks**:
```typescript
describe('Bangkok Dataset Performance Tests', () => {
  test('Chart renders full dataset within 2 seconds', async () => {
    const dataset = await getBangkokData('full');
    const startTime = performance.now();
    
    render(<OptimizedTimeSeriesChart data={dataset} resolution="overview" />);
    await waitFor(() => screen.getByTestId('chart-rendered'));
    
    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(2000);
  });
  
  test('Export streams 100k records without memory spike', async () => {
    const memoryBefore = process.memoryUsage().heapUsed;
    
    const response = await fetch('/api/export/stream', {
      method: 'POST',
      body: JSON.stringify({ 
        filters: { recordCount: 100000 },
        format: 'csv' 
      })
    });
    
    // Consume stream
    const reader = response.body?.getReader();
    while (reader && !(await reader.read()).done) {
      // Process chunks
    }
    
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryIncrease = memoryAfter - memoryBefore;
    
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // <50MB
  });
});
```

### **Mobile Testing Requirements**
```typescript
// playwright.mobile.config.ts
const config: PlaywrightTestConfig = {
  projects: [
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone SE'], // Test on low-end device
        viewport: { width: 375, height: 667 }
      }
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 }
      }
    }
  ],
  
  testDir: './tests/mobile',
  timeout: 30000, // 30 second timeout for mobile tests
  
  use: {
    // Throttle network for realistic mobile conditions
    launchOptions: {
      args: ['--throttling.cpuSlowdownMultiplier=2']
    }
  }
};
```

---

## 📊 IMPLEMENTATION TIMELINE

### **Phase 1: Foundation (Week 1)**
- [ ] **Day 1-2**: Implement data decimation algorithms and API endpoints
- [ ] **Day 3-4**: Set up streaming export architecture  
- [ ] **Day 5**: Create performance testing infrastructure
- [ ] **Weekend**: Bangkok dataset scale validation

### **Phase 2: Chart Implementation (Week 2)**
- [ ] **Day 1-2**: Implement OptimizedTimeSeriesChart with decimation
- [ ] **Day 3-4**: Mobile-responsive chart interactions
- [ ] **Day 5**: Pattern detection integration with performance monitoring

### **Phase 3: Export & Integration (Week 3)**
- [ ] **Day 1-2**: Streaming CSV/Excel export implementation
- [ ] **Day 3-4**: PDF generation with chart integration
- [ ] **Day 5**: Professional tier validation and testing

### **Phase 4: Optimization & Testing (Week 4)**
- [ ] **Day 1-2**: Performance optimization and tuning
- [ ] **Day 3-4**: Comprehensive testing with Bangkok dataset
- [ ] **Day 5**: User acceptance testing and final validation

---

## ✅ ARCHITECTURE APPROVAL CHECKLIST

### **Technical Validation**
- [ ] Data decimation algorithms preserve analytical value
- [ ] Streaming export handles Vercel 10-second function limit
- [ ] Chart performance meets <2 second rendering requirement
- [ ] Mobile PWA approach supports executive access patterns
- [ ] Professional tier differentiation maintains revenue model

### **Business Validation**  
- [ ] Architecture supports Executive Dashboard mobile usage
- [ ] Professional tier features justify $29/month pricing
- [ ] Performance improvements reduce user churn risk
- [ ] Implementation timeline fits Epic 3 sprint schedule

### **Risk Mitigation**
- [ ] Performance benchmarks address identified QA risks
- [ ] Mobile-first approach prevents 50% user base exclusion
- [ ] Streaming prevents server memory crashes
- [ ] Progressive loading maintains user experience during large data operations

---

## 🎯 SUCCESS CRITERIA

### **Performance KPIs**
- Chart rendering: <2 seconds for Bangkok dataset overview
- User interactions: <100ms response time
- Export streaming: <30 seconds for 100k records
- Mobile performance: Same features available on iPhone SE

### **Business KPIs**  
- Professional tier feature reliability: >99.5% uptime
- Mobile executive adoption: >70% of dashboard users
- Export feature utilization: >40% of Professional subscribers
- Performance-related support tickets: <5% of total tickets

**ARCHITECTURE APPROVED** ✅  
Ready for Epic 3 Sprint 1 implementation with performance foundation focus.