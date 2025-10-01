import { generateReportJob } from '@/src/lib/reports/report-generator'
import { generatePDF } from '@/src/lib/reports/pdf-generator'
import { generateExcel } from '@/src/lib/reports/excel-exporter'
import { getBangkokData } from '@/lib/data/bangkok-dataset'
import { ReportTemplate } from '@/types/reports'

// Mock dependencies but allow real performance testing
jest.mock('@/lib/database/connection')
jest.mock('@/lib/r2-client')
jest.mock('@/src/lib/reports/email-delivery')

// Partial mocks for performance testing
jest.mock('@/lib/data/bangkok-dataset', () => ({
  getBangkokData: jest.fn()
}))

const mockGetBangkokData = getBangkokData as jest.MockedFunction<typeof getBangkokData>

describe('Report Generation Performance Tests', () => {
  // Performance benchmarks (in milliseconds)
  const PERFORMANCE_TARGETS = {
    SMALL_DATASET_PDF: 5000,    // 5 seconds for <1K records
    MEDIUM_DATASET_PDF: 15000,  // 15 seconds for <10K records
    LARGE_DATASET_PDF: 30000,   // 30 seconds for <100K records
    SMALL_DATASET_EXCEL: 3000,  // 3 seconds for <1K records
    MEDIUM_DATASET_EXCEL: 10000, // 10 seconds for <10K records
    LARGE_DATASET_EXCEL: 20000,  // 20 seconds for <100K records
    MEMORY_LIMIT_MB: 512,       // 512MB memory limit
    FILE_SIZE_LIMIT_MB: 50      // 50MB file size limit
  }

  const createMockTemplate = (componentCount: number): ReportTemplate => ({
    id: 'perf-template',
    user_id: 'user-123',
    name: 'Performance Test Template',
    category: 'executive',
    template_data: {
      layout: {
        page_size: 'A4',
        orientation: 'portrait',
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
        header_height: 60,
        footer_height: 40,
        grid_columns: 12,
        grid_rows: 20
      },
      components: Array.from({ length: componentCount }, (_, i) => ({
        id: `component-${i}`,
        type: i % 3 === 0 ? 'chart' : i % 3 === 1 ? 'table' : 'text',
        position: { x: 50, y: 100 + (i * 150), width: 400, height: 100 },
        config: i % 3 === 0 ? { chart_type: 'line' } : {},
        data_binding: i % 3 !== 2 ? { source: 'bangkok_dataset' } : undefined
      })) as any,
      styling: {
        color_scheme: {
          primary: '#2563eb', secondary: '#64748b', background: '#ffffff',
          surface: '#f8fafc', text_primary: '#1e293b', text_secondary: '#64748b',
          accent: '#0ea5e9', warning: '#f59e0b', error: '#dc2626', success: '#16a34a'
        },
        typography: {
          heading_font: 'Inter', body_font: 'Inter',
          heading_sizes: { h1: 24, h2: 20, h3: 18, h4: 16 },
          body_size: 14, line_height: 1.5
        },
        spacing: { component_margin: 16, section_padding: 24, element_spacing: 8 },
        borders: { default_width: 1, default_color: '#e5e7eb', default_style: 'solid' }
      },
      branding: {},
      data_configuration: {}
    },
    is_public: false,
    version: '1.0',
    tags: [],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    usage_count: 0
  })

  const generateMockData = (recordCount: number) => {
    const records = Array.from({ length: recordCount }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      value: Math.random() * 100,
      sensor_id: `sensor-${Math.floor(i / 100)}`,
      floor_number: Math.floor(i / 1000) + 1,
      equipment_type: ['hvac', 'lighting', 'security'][i % 3]
    }))

    return {
      data: records,
      aggregations: {
        mean: records.reduce((sum, r) => sum + r.value, 0) / records.length,
        count: records.length,
        min: Math.min(...records.map(r => r.value)),
        max: Math.max(...records.map(r => r.value))
      },
      statistics: {
        confidence: 0.95,
        trend: Math.random() * 0.4 - 0.2
      }
    }
  }

  describe('PDF Generation Performance', () => {
    it('should generate PDF with small dataset within performance target', async () => {
      const template = createMockTemplate(5) // 5 components
      const data = generateMockData(1000) // 1K records
      mockGetBangkokData.mockResolvedValue(data)

      const startTime = Date.now()

      try {
        const buffer = await generatePDF(template, {
          dataPoints: data.data,
          aggregations: data.aggregations,
          statisticalConfidence: data.statistics.confidence,
          insights: ['Test insight'],
          charts: {},
          tables: {}
        }, {})

        const endTime = Date.now()
        const duration = endTime - startTime

        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.length).toBeGreaterThan(0)
        expect(duration).toBeLessThan(PERFORMANCE_TARGETS.SMALL_DATASET_PDF)

        // Verify file size is reasonable
        const fileSizeMB = buffer.length / (1024 * 1024)
        expect(fileSizeMB).toBeLessThan(PERFORMANCE_TARGETS.FILE_SIZE_LIMIT_MB)

        console.log(`Small PDF generation: ${duration}ms, Size: ${fileSizeMB.toFixed(2)}MB`)
      } catch (_error) {
        console.error('PDF generation failed:', _error)
        throw _error
      }
    }, PERFORMANCE_TARGETS.SMALL_DATASET_PDF + 5000)

    it('should generate PDF with medium dataset within performance target', async () => {
      const template = createMockTemplate(15) // 15 components
      const data = generateMockData(10000) // 10K records
      mockGetBangkokData.mockResolvedValue(data)

      const startTime = Date.now()

      const buffer = await generatePDF(template, {
        dataPoints: data.data,
        aggregations: data.aggregations,
        statisticalConfidence: data.statistics.confidence,
        insights: ['Test insight'],
        charts: {},
        tables: {}
      }, {})

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(buffer).toBeInstanceOf(Buffer)
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.MEDIUM_DATASET_PDF)

      const fileSizeMB = buffer.length / (1024 * 1024)
      expect(fileSizeMB).toBeLessThan(PERFORMANCE_TARGETS.FILE_SIZE_LIMIT_MB)

      console.log(`Medium PDF generation: ${duration}ms, Size: ${fileSizeMB.toFixed(2)}MB`)
    }, PERFORMANCE_TARGETS.MEDIUM_DATASET_PDF + 5000)

    it('should handle large dataset PDF generation', async () => {
      const template = createMockTemplate(25) // 25 components
      const data = generateMockData(50000) // 50K records (reduced from 100K for CI)
      mockGetBangkokData.mockResolvedValue(data)

      const startTime = Date.now()

      const buffer = await generatePDF(template, {
        dataPoints: data.data,
        aggregations: data.aggregations,
        statisticalConfidence: data.statistics.confidence,
        insights: ['Test insight'],
        charts: {},
        tables: {}
      }, {})

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(buffer).toBeInstanceOf(Buffer)
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.LARGE_DATASET_PDF)

      const fileSizeMB = buffer.length / (1024 * 1024)
      expect(fileSizeMB).toBeLessThan(PERFORMANCE_TARGETS.FILE_SIZE_LIMIT_MB)

      console.log(`Large PDF generation: ${duration}ms, Size: ${fileSizeMB.toFixed(2)}MB`)
    }, PERFORMANCE_TARGETS.LARGE_DATASET_PDF + 10000)
  })

  describe('Excel Generation Performance', () => {
    it('should generate Excel with small dataset within performance target', async () => {
      const template = createMockTemplate(5)
      const data = generateMockData(1000)

      const startTime = Date.now()

      const buffer = await generateExcel(template, {
        dataPoints: data.data,
        aggregations: data.aggregations,
        charts: {
          'component-0': {
            labels: ['A', 'B', 'C'],
            datasets: [{ label: 'Test', data: [1, 2, 3] }]
          }
        },
        tables: {
          'component-1': {
            columns: [{ key: 'value', label: 'Value' }],
            rows: data.data.slice(0, 100)
          }
        }
      }, {})

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(buffer).toBeInstanceOf(Buffer)
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.SMALL_DATASET_EXCEL)

      const fileSizeMB = buffer.length / (1024 * 1024)
      expect(fileSizeMB).toBeLessThan(PERFORMANCE_TARGETS.FILE_SIZE_LIMIT_MB)

      console.log(`Small Excel generation: ${duration}ms, Size: ${fileSizeMB.toFixed(2)}MB`)
    }, PERFORMANCE_TARGETS.SMALL_DATASET_EXCEL + 2000)

    it('should generate Excel with medium dataset within performance target', async () => {
      const template = createMockTemplate(10)
      const data = generateMockData(10000)

      const startTime = Date.now()

      const buffer = await generateExcel(template, {
        dataPoints: data.data,
        aggregations: data.aggregations,
        charts: {
          'component-0': {
            labels: data.data.slice(0, 50).map((_, i) => `Point ${i}`),
            datasets: [{ label: 'Values', data: data.data.slice(0, 50).map(d => d.value) }]
          }
        },
        tables: {
          'component-1': {
            columns: [
              { key: 'timestamp', label: 'Time' },
              { key: 'value', label: 'Value' },
              { key: 'sensor_id', label: 'Sensor' }
            ],
            rows: data.data.slice(0, 1000) // Limit for performance
          }
        }
      }, {})

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(buffer).toBeInstanceOf(Buffer)
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.MEDIUM_DATASET_EXCEL)

      console.log(`Medium Excel generation: ${duration}ms`)
    }, PERFORMANCE_TARGETS.MEDIUM_DATASET_EXCEL + 5000)
  })

  describe('Memory Usage Tests', () => {
    it('should not exceed memory limits during large report generation', async () => {
      const template = createMockTemplate(20)
      const data = generateMockData(25000) // 25K records

      const initialMemory = process.memoryUsage()

      await generatePDF(template, {
        dataPoints: data.data,
        aggregations: data.aggregations,
        statisticalConfidence: data.statistics.confidence,
        insights: ['Memory test'],
        charts: {},
        tables: {}
      }, {})

      const finalMemory = process.memoryUsage()
      const memoryIncreaseMB = (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024)

      expect(memoryIncreaseMB).toBeLessThan(PERFORMANCE_TARGETS.MEMORY_LIMIT_MB)

      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`)

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
    })

    it('should properly clean up resources after generation', async () => {
      const template = createMockTemplate(5)
      const data = generateMockData(5000)

      const runs = 5
      const memoryUsages: number[] = []

      for (let i = 0; i < runs; i++) {
        await generatePDF(template, {
          dataPoints: data.data,
          aggregations: data.aggregations,
          statisticalConfidence: data.statistics.confidence,
          insights: [`Run ${i}`],
          charts: {},
          tables: {}
        }, {})

        // Force garbage collection between runs
        if (global.gc) {
          global.gc()
        }

        memoryUsages.push(process.memoryUsage().heapUsed)
      }

      // Memory usage shouldn't grow significantly over multiple runs
      const firstRun = memoryUsages[0]
      const lastRun = memoryUsages[runs - 1]
      const memoryGrowthMB = (lastRun - firstRun) / (1024 * 1024)

      expect(memoryGrowthMB).toBeLessThan(100) // Less than 100MB growth

      console.log(`Memory growth over ${runs} runs: ${memoryGrowthMB.toFixed(2)}MB`)
    })
  })

  describe('Concurrent Generation Performance', () => {
    it('should handle multiple concurrent report generations', async () => {
      const template = createMockTemplate(8)
      const data = generateMockData(2000)
      mockGetBangkokData.mockResolvedValue(data)

      const concurrentReports = 3
      const startTime = Date.now()

      const promises = Array.from({ length: concurrentReports }, async (_, i) => {
        return generatePDF(template, {
          dataPoints: data.data,
          aggregations: data.aggregations,
          statisticalConfidence: data.statistics.confidence,
          insights: [`Concurrent report ${i}`],
          charts: {},
          tables: {}
        }, {})
      })

      const results = await Promise.all(promises)
      const endTime = Date.now()
      const duration = endTime - startTime

      expect(results).toHaveLength(concurrentReports)
      results.forEach(buffer => {
        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.length).toBeGreaterThan(0)
      })

      // Concurrent generation should not take more than 3x single generation time
      const maxExpectedTime = PERFORMANCE_TARGETS.SMALL_DATASET_PDF * 3
      expect(duration).toBeLessThan(maxExpectedTime)

      console.log(`${concurrentReports} concurrent reports: ${duration}ms`)
    }, PERFORMANCE_TARGETS.SMALL_DATASET_PDF * 4)
  })

  describe('Data Processing Performance', () => {
    it('should efficiently process and filter large datasets', async () => {
      const recordCount = 100000
      const data = generateMockData(recordCount)

      const startTime = Date.now()

      // Simulate data filtering operations that happen in report generation
      const filteredBySensor = data.data.filter(d => d.sensor_id.includes('sensor-1'))
      const filteredByFloor = data.data.filter(d => d.floor_number === 1)
      const aggregatedByType = data.data.reduce((acc, d) => {
        acc[d.equipment_type] = (acc[d.equipment_type] || 0) + d.value
        return acc
      }, {} as Record<string, number>)

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(filteredBySensor.length).toBeGreaterThan(0)
      expect(filteredByFloor.length).toBeGreaterThan(0)
      expect(Object.keys(aggregatedByType)).toHaveLength(3)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second

      console.log(`Data processing (${recordCount} records): ${duration}ms`)
    })

    it('should handle chart data generation efficiently', async () => {
      const data = generateMockData(50000)
      const startTime = Date.now()

      // Simulate chart data processing
      const chartData = {
        labels: data.data.slice(0, 100).map(d => new Date(d.timestamp).toLocaleDateString()),
        datasets: [{
          label: 'Temperature',
          data: data.data.slice(0, 100).map(d => d.value),
          backgroundColor: '#2563eb'
        }]
      }

      const groupedData = data.data.reduce((acc, d) => {
        const hour = new Date(d.timestamp).getHours()
        acc[hour] = (acc[hour] || []).concat(d)
        return acc
      }, {} as Record<number, any[]>)

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(chartData.labels).toHaveLength(100)
      expect(chartData.datasets[0].data).toHaveLength(100)
      expect(Object.keys(groupedData)).toHaveLength(24) // 24 hours
      expect(duration).toBeLessThan(500) // Should complete within 500ms

      console.log(`Chart data generation: ${duration}ms`)
    })
  })

  describe('Error Recovery Performance', () => {
    it('should fail fast on invalid data', async () => {
      const template = createMockTemplate(5)
      const invalidData = null

      const startTime = Date.now()

      try {
        await generatePDF(template, invalidData as any, {})
        throw new Error('Should have thrown an error')
      } catch (_error) {
        const endTime = Date.now()
        const duration = endTime - startTime

        expect(duration).toBeLessThan(1000) // Should fail within 1 second
        console.log(`Fast failure time: ${duration}ms`)
      }
    })

    it('should handle timeout scenarios gracefully', async () => {
      // This test would simulate a timeout scenario
      // In a real implementation, report generation should have timeouts
      const template = createMockTemplate(100) // Very complex template
      const data = generateMockData(1000)

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10000) // 10 second timeout
      })

      const generationPromise = generatePDF(template, {
        dataPoints: data.data,
        aggregations: data.aggregations,
        statisticalConfidence: data.statistics.confidence,
        insights: ['Timeout test'],
        charts: {},
        tables: {}
      }, {})

      // The generation should either complete or timeout
      await expect(Promise.race([generationPromise, timeoutPromise]))
        .rejects.toThrow() // Should timeout due to complexity
    })
  })
})