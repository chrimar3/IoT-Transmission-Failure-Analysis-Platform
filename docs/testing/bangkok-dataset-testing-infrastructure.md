# Bangkok Dataset Scale Testing Infrastructure

**Purpose**: Establish comprehensive testing environment for Epic 3 performance validation  
**Dataset**: Bangkok CU-BEMS IoT data (134 sensors, 7 floors, 18 months, 13.4M data points)  
**Date**: 2025-01-11  

## 📊 TESTING DATA ENVIRONMENT SETUP

### **Dataset Structure Overview**
```
CU-BEMS Dataset/
├── 2018_energy_data.csv     # 215MB, ~6.5M records
├── 2019_energy_data.csv     # 483MB, ~6.9M records  
├── metadata/
│   ├── sensor_locations.json
│   ├── equipment_types.json
│   └── floor_layouts.json
└── synthetic/               # Generated test data
    ├── anomaly_patterns.csv
    ├── failure_events.csv
    └── performance_stress.csv
```

### **Test Database Configuration**
```sql
-- Test database schema for performance testing
CREATE DATABASE cu_bems_test;

-- Optimized sensor readings table for testing
CREATE TABLE test_sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    sensor_id VARCHAR(50) NOT NULL,
    floor_number INTEGER NOT NULL CHECK (floor_number BETWEEN 1 AND 7),
    equipment_type VARCHAR(100),
    reading_value DECIMAL(10,4),
    unit VARCHAR(20),
    status VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance-optimized indexes
CREATE INDEX CONCURRENTLY idx_sensor_readings_timestamp ON test_sensor_readings(timestamp);
CREATE INDEX CONCURRENTLY idx_sensor_readings_sensor_id ON test_sensor_readings(sensor_id);  
CREATE INDEX CONCURRENTLY idx_sensor_readings_floor ON test_sensor_readings(floor_number);
CREATE INDEX CONCURRENTLY idx_sensor_readings_composite ON test_sensor_readings(sensor_id, timestamp);

-- Test materialized views for performance validation
CREATE MATERIALIZED VIEW test_daily_aggregates AS
SELECT 
    DATE(timestamp) as date,
    sensor_id,
    floor_number,
    equipment_type,
    AVG(reading_value) as avg_value,
    MAX(reading_value) as max_value,
    MIN(reading_value) as min_value,
    STDDEV(reading_value) as deviation,
    COUNT(*) as reading_count
FROM test_sensor_readings
GROUP BY DATE(timestamp), sensor_id, floor_number, equipment_type;

CREATE UNIQUE INDEX ON test_daily_aggregates(date, sensor_id);
```

---

## 🛠️ TEST DATA SETUP AUTOMATION

### **Data Loading Scripts**

#### **Bangkok Dataset Loader**
```typescript
// scripts/setup-test-data.ts
import fs from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';

interface BangkokRecord {
  timestamp: string;
  sensor_id: string;
  floor_number: number;
  equipment_type: string;
  reading_value: number;
  unit: string;
  status: string;
}

export class BangkokDataLoader {
  private supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_ANON_KEY!
  );

  async loadBangkokDataset(options: {
    year?: '2018' | '2019' | 'both';
    limit?: number;
    sampleSize?: 'small' | 'medium' | 'large' | 'full';
  } = {}) {
    const { year = 'both', limit, sampleSize = 'full' } = options;
    
    console.log(`Loading Bangkok dataset: ${year}, sample: ${sampleSize}`);
    
    const sampleLimits = {
      small: 1000,      // 1K records for unit tests
      medium: 100000,   // 100K records for integration tests  
      large: 1000000,   // 1M records for performance tests
      full: null        // Full dataset for stress tests
    };
    
    const recordLimit = limit || sampleLimits[sampleSize];
    const files = this.getDataFiles(year);
    
    let totalRecords = 0;
    const batchSize = 1000;
    let batch: BangkokRecord[] = [];
    
    for (const filePath of files) {
      console.log(`Processing ${filePath}...`);
      
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', async (row: any) => {
            if (recordLimit && totalRecords >= recordLimit) {
              return resolve();
            }
            
            const record = this.transformRecord(row);
            batch.push(record);
            
            if (batch.length >= batchSize) {
              await this.insertBatch(batch);
              batch = [];
              totalRecords += batchSize;
              
              if (totalRecords % 10000 === 0) {
                console.log(`Loaded ${totalRecords} records...`);
              }
            }
          })
          .on('end', async () => {
            if (batch.length > 0) {
              await this.insertBatch(batch);
              totalRecords += batch.length;
            }
            console.log(`Completed ${filePath}: ${totalRecords} total records`);
            resolve();
          })
          .on('error', reject);
      });
    }
    
    // Refresh materialized views
    await this.refreshMaterializedViews();
    
    return {
      recordsLoaded: totalRecords,
      files: files,
      sampleSize: sampleSize
    };
  }

  private transformRecord(row: any): BangkokRecord {
    return {
      timestamp: new Date(row.timestamp || row.Timestamp).toISOString(),
      sensor_id: row.sensor_id || row['Sensor ID'] || `sensor_${row.id}`,
      floor_number: parseInt(row.floor_number || row.Floor || '1'),
      equipment_type: row.equipment_type || row['Equipment Type'] || 'HVAC',
      reading_value: parseFloat(row.reading_value || row.Value || '0'),
      unit: row.unit || row.Unit || 'kWh',
      status: row.status || row.Status || 'normal'
    };
  }

  private async insertBatch(records: BangkokRecord[]) {
    const { error } = await this.supabase
      .from('test_sensor_readings')
      .insert(records);
      
    if (error) {
      console.error('Batch insert error:', error);
      throw error;
    }
  }

  private async refreshMaterializedViews() {
    const { error } = await this.supabase.rpc('refresh_test_materialized_views');
    if (error) {
      console.error('Materialized view refresh error:', error);
    }
  }

  private getDataFiles(year: '2018' | '2019' | 'both'): string[] {
    const dataDir = './CU-BEMS dataset/';
    const files = [];
    
    if (year === '2018' || year === 'both') {
      files.push(`${dataDir}2018_energy_data.csv`);
    }
    if (year === '2019' || year === 'both') {
      files.push(`${dataDir}2019_energy_data.csv`);
    }
    
    return files;
  }
}

// CLI usage
if (require.main === module) {
  const loader = new BangkokDataLoader();
  
  const sampleSize = process.argv[2] as 'small' | 'medium' | 'large' | 'full' || 'medium';
  const year = process.argv[3] as '2018' | '2019' | 'both' || 'both';
  
  loader.loadBangkokDataset({ sampleSize, year })
    .then(result => {
      console.log('Dataset loading completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Dataset loading failed:', error);
      process.exit(1);
    });
}
```

#### **Synthetic Test Data Generator**
```typescript
// scripts/generate-synthetic-data.ts
export class SyntheticDataGenerator {
  generateAnomalyPatterns(sensorCount: number = 134, daysBack: number = 30) {
    const patterns = [];
    const now = new Date();
    
    for (let day = 0; day < daysBack; day++) {
      const date = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));
      
      // Generate 2-5 anomalies per day across random sensors
      const anomalyCount = Math.floor(Math.random() * 4) + 2;
      
      for (let i = 0; i < anomalyCount; i++) {
        const sensorId = `sensor_${Math.floor(Math.random() * sensorCount) + 1}`;
        const anomalyTime = new Date(date);
        anomalyTime.setHours(Math.floor(Math.random() * 24));
        anomalyTime.setMinutes(Math.floor(Math.random() * 60));
        
        patterns.push({
          timestamp: anomalyTime.toISOString(),
          sensor_id: sensorId,
          floor_number: Math.floor(Math.random() * 7) + 1,
          equipment_type: this.randomEquipmentType(),
          reading_value: this.generateAnomalyValue(),
          unit: 'kWh',
          status: 'anomaly',
          anomaly_type: this.randomAnomalyType(),
          severity: this.randomSeverity()
        });
      }
    }
    
    return patterns;
  }

  generatePerformanceStressData(recordCount: number = 1000000) {
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < recordCount; i++) {
      const timestamp = new Date(now.getTime() - (Math.random() * 365 * 24 * 60 * 60 * 1000));
      
      data.push({
        timestamp: timestamp.toISOString(),
        sensor_id: `stress_sensor_${(i % 134) + 1}`,
        floor_number: (i % 7) + 1,
        equipment_type: this.randomEquipmentType(),
        reading_value: Math.random() * 100,
        unit: 'kWh',
        status: Math.random() > 0.95 ? 'warning' : 'normal'
      });
    }
    
    return data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private randomEquipmentType(): string {
    const types = ['HVAC', 'Lighting', 'Power Distribution', 'Elevator', 'Water Pump', 'Server Room'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private generateAnomalyValue(): number {
    // Generate values that are clearly anomalous
    return Math.random() > 0.5 ? Math.random() * 500 + 200 : Math.random() * -50;
  }

  private randomAnomalyType(): string {
    const types = ['spike', 'drop', 'flatline', 'oscillation', 'drift'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private randomSeverity(): 'info' | 'warning' | 'critical' {
    const rand = Math.random();
    if (rand < 0.1) return 'critical';
    if (rand < 0.3) return 'warning';
    return 'info';
  }
}
```

---

## 🧪 PERFORMANCE TEST CONFIGURATIONS

### **Jest Performance Test Setup**
```javascript
// jest.performance.config.js
module.exports = {
  displayName: 'Performance Tests',
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/performance/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/performance-setup.ts'],
  
  // Performance-specific settings
  testTimeout: 60000, // 60 seconds for performance tests
  maxWorkers: 1,      // Single worker for consistent performance measurement
  
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json'
    }
  },
  
  // Coverage for performance-critical code only
  collectCoverageFrom: [
    'src/lib/decimation/**/*.ts',
    'src/lib/export/**/*.ts', 
    'src/components/features/analytics/**/*.tsx'
  ],
  
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
```

#### **Performance Test Utilities**
```typescript
// src/test/performance-setup.ts
import { BangkokDataLoader } from '../../scripts/setup-test-data';
import { performance } from 'perf_hooks';

// Global test data cache
global.testDataCache = new Map();

// Performance measurement utilities
global.measureAsync = async (fn: () => Promise<void>): Promise<number> => {
  const start = performance.now();
  await fn();
  return performance.now() - start;
};

global.measureSync = (fn: () => void): number => {
  const start = performance.now();
  fn();
  return performance.now() - start;
};

global.measureMemory = (fn: () => void): number => {
  const memBefore = (performance as any).memory?.usedJSHeapSize || 0;
  fn();
  const memAfter = (performance as any).memory?.usedJSHeapSize || 0;
  return memAfter - memBefore;
};

// Bangkok dataset test utilities
global.getBangkokTestData = async (size: 'small' | 'medium' | 'large' | 'full') => {
  if (global.testDataCache.has(size)) {
    return global.testDataCache.get(size);
  }
  
  const loader = new BangkokDataLoader();
  const data = await loader.loadBangkokDataset({ sampleSize: size });
  global.testDataCache.set(size, data);
  
  return data;
};

// Cleanup after tests
afterAll(() => {
  global.testDataCache.clear();
});
```

### **Playwright Mobile Testing Configuration**
```typescript
// playwright.mobile.config.ts
import { PlaywrightTestConfig, devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests/mobile',
  timeout: 30000,
  expect: { timeout: 10000 },
  
  // Run tests in parallel but limit for mobile testing
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  
  projects: [
    // Test on low-end mobile device (iPhone SE)
    {
      name: 'iPhone SE',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        // Throttle CPU to simulate older devices
        launchOptions: {
          args: ['--throttling.cpuSlowdownMultiplier=2']
        }
      }
    },
    
    // Test on mid-range Android (Pixel 5)
    {
      name: 'Pixel 5',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
        deviceScaleFactor: 2.75
      }
    },
    
    // Test on tablet (iPad)
    {
      name: 'iPad',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 }
      }
    }
  ],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
};

export default config;
```

---

## 📊 TEST EXECUTION SCRIPTS

### **Package.json Test Scripts**
```json
{
  "scripts": {
    "test:setup": "node scripts/setup-test-data.ts medium both",
    "test:performance": "jest --config=jest.performance.config.js",
    "test:dataset-full": "node scripts/setup-test-data.ts full both && npm run test:performance",
    "test:mobile": "playwright test --config=playwright.mobile.config.ts",
    "test:stress": "node scripts/stress-test.js",
    "test:memory": "node --expose-gc scripts/memory-test.js",
    
    "test:bangkok-small": "node scripts/setup-test-data.ts small both && jest --testNamePattern='Bangkok.*small'",
    "test:bangkok-medium": "node scripts/setup-test-data.ts medium both && jest --testNamePattern='Bangkok.*medium'", 
    "test:bangkok-large": "node scripts/setup-test-data.ts large both && jest --testNamePattern='Bangkok.*large'",
    "test:bangkok-full": "node scripts/setup-test-data.ts full both && jest --testNamePattern='Bangkok.*full'",
    
    "test:epic3": "npm run test:setup && npm run test:performance && npm run test:mobile"
  }
}
```

### **Continuous Integration Setup**
```yaml
# .github/workflows/epic-3-performance-tests.yml
name: Epic 3 Performance Tests

on:
  pull_request:
    paths:
      - 'src/components/features/analytics/**'
      - 'src/lib/decimation/**'
      - 'src/lib/export/**'
  
jobs:
  performance-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: cu_bems_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: |
          npm run db:migrate:test
          npm run test:setup
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/cu_bems_test
      
      - name: Run performance tests
        run: npm run test:performance
        env:
          NODE_OPTIONS: --max-old-space-size=4096
      
      - name: Run mobile tests
        run: npm run test:mobile
      
      - name: Upload performance results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: performance-results
          path: |
            coverage/
            test-results/
            playwright-report/

  bangkok-dataset-tests:
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.title, '[DATASET]')
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Download Bangkok dataset
        run: |
          # Download test dataset from secure location
          curl -o CU-BEMS-dataset.zip ${{ secrets.DATASET_URL }}
          unzip CU-BEMS-dataset.zip
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run full dataset tests
        run: npm run test:bangkok-full
        timeout-minutes: 30
        env:
          NODE_OPTIONS: --max-old-space-size=8192
```

---

## 🎯 TEST EXECUTION CHECKLIST

### **Pre-Epic 3 Sprint Setup**
- [ ] **Database Setup**: Test database created with optimized schema
- [ ] **Data Loading**: Bangkok dataset loaded in all sample sizes (small, medium, large, full)
- [ ] **Synthetic Data**: Anomaly patterns and stress test data generated
- [ ] **Performance Baselines**: Baseline measurements recorded for comparison
- [ ] **Mobile Devices**: Testing devices configured (iPhone SE, Pixel 5, iPad)

### **Sprint Testing Schedule**
- [ ] **Week 1**: Foundation performance tests (data decimation, streaming)
- [ ] **Week 2**: Chart rendering performance tests
- [ ] **Week 3**: Export functionality and mobile testing
- [ ] **Week 4**: Full integration and stress testing

### **Continuous Monitoring**
- [ ] **Performance Regression**: Automated alerts for performance degradation
- [ ] **Memory Monitoring**: Memory leak detection in long-running tests
- [ ] **Mobile Performance**: Regular testing on target devices
- [ ] **Dataset Validation**: Regular validation of Bangkok dataset integrity

This testing infrastructure ensures Epic 3 performance requirements are validated continuously throughout development, with Bangkok dataset scale testing as the foundation for all performance decisions.