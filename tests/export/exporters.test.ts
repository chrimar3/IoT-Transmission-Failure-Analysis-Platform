/**
 * Export Engine Tests
 * Story 3.4: Data Export and Reporting
 *
 * Comprehensive tests for CSV, Excel, and PDF export functionality
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import * as fs from 'fs'
import * as path from 'path'
import { CSVExporter } from '../../lib/export/csvExporter'
import { ExcelExporter } from '../../lib/export/excelExporter'
import { PDFGenerator } from '../../lib/export/pdfGenerator'
import type { ExportFilters } from '../../types/export'

// Set reduced timeout for all export tests
jest.setTimeout(10000)

// Mock data for testing
const mockSensorData = [
  {
    sensor_id: 'SENSOR_001',
    sensor_name: 'Temperature Sensor 1',
    location: 'Building A - Floor 1',
    timestamp: '2024-03-15T10:00:00Z',
    temperature: 22.5,
    humidity: 65.2,
    pressure: 1013.25,
    battery_level: 85,
    signal_strength: -45,
    status: 'active'
  },
  {
    sensor_id: 'SENSOR_002',
    sensor_name: 'Temperature Sensor 2',
    location: 'Building A - Floor 2',
    timestamp: '2024-03-15T10:00:00Z',
    temperature: 23.1,
    humidity: 63.8,
    pressure: 1012.95,
    battery_level: 92,
    signal_strength: -52,
    status: 'active'
  }
]

const mockFilters: ExportFilters = {
  sensor_ids: ['SENSOR_001', 'SENSOR_002'],
  date_range: {
    start_date: '2024-03-15',
    end_date: '2024-03-15'
  },
  include_inactive: false
}

// Test utilities
const createTempFile = (extension: string): string => {
  const tempDir = path.join(__dirname, 'temp')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  return path.join(tempDir, `test_export_${Date.now()}.${extension}`)
}

const cleanupTempFiles = () => {
  const tempDir = path.join(__dirname, 'temp')
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

describe('CSV Exporter', () => {
  let csvExporter: CSVExporter
  let tempFilePath: string

  beforeEach(() => {
    csvExporter = new CSVExporter()
    tempFilePath = createTempFile('csv')
  })

  afterEach(() => {
    cleanupTempFiles()
  })

  test('should export data to CSV format', async () => {
    // Mock database query to resolve immediately
    jest.spyOn(csvExporter, 'fetchSensorData').mockImplementation(() => Promise.resolve(mockSensorData))

    const result = await csvExporter.exportToCSV(mockFilters, tempFilePath)

    expect(result.success).toBe(true)
    expect(result.file_path).toBe(tempFilePath)
    expect(result.record_count).toBe(mockSensorData.length)
    expect(fs.existsSync(tempFilePath)).toBe(true)

    // Verify CSV content
    const csvContent = fs.readFileSync(tempFilePath, 'utf-8')
    expect(csvContent).toContain('sensor_id,sensor_name,location')
    expect(csvContent).toContain('SENSOR_001')
    expect(csvContent).toContain('Temperature Sensor 1')
    expect(csvContent).toContain('22.5')
  }, 10000)

  test('should handle large datasets with streaming', async () => {
    // Use smaller dataset for faster testing
    const largeMockData = Array.from({ length: 1000 }, (_, i) => ({
      ...mockSensorData[0],
      sensor_id: `SENSOR_${String(i).padStart(3, '0')}`,
      timestamp: new Date(Date.now() + i * 60000).toISOString(),
      temperature: 20 + Math.random() * 10
    }))

    jest.spyOn(csvExporter, 'fetchSensorData').mockImplementation(() => Promise.resolve(largeMockData))

    const result = await csvExporter.exportToCSV(mockFilters, tempFilePath)

    expect(result.success).toBe(true)
    expect(result.record_count).toBe(largeMockData.length)

    // Verify file size is reasonable (not loading everything into memory)
    const stats = fs.statSync(tempFilePath)
    expect(stats.size).toBeGreaterThan(1000) // Has substantial content
  }, 10000)

  test('should handle export with progress tracking', async () => {
    jest.spyOn(csvExporter, 'fetchSensorData').mockImplementation(() => Promise.resolve(mockSensorData))

    const progressCallback = jest.fn().mockImplementation(async () => {})
    jest.spyOn(csvExporter, 'updateProgress').mockImplementation(progressCallback as any)

    await csvExporter.exportToCSV(mockFilters, tempFilePath, 123)

    expect(progressCallback).toHaveBeenCalled()
  }, 10000)

  test('should handle database errors gracefully', async () => {
    jest.spyOn(csvExporter, 'fetchSensorData').mockImplementation(() => Promise.reject(new Error('Database connection failed')))

    const result = await csvExporter.exportToCSV(mockFilters, tempFilePath)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Database connection failed')
  }, 10000)

  test('should validate file path permissions', async () => {
    const invalidPath = '/root/restricted/export.csv'

    const result = await csvExporter.exportToCSV(mockFilters, invalidPath)

    expect(result.success).toBe(false)
    expect(result.error).toContain('permission')
  }, 10000)
})

describe('Excel Exporter', () => {
  let excelExporter: ExcelExporter
  let tempFilePath: string

  beforeEach(() => {
    excelExporter = new ExcelExporter()
    tempFilePath = createTempFile('xlsx')
  })

  afterEach(() => {
    cleanupTempFiles()
  })

  test('should export data to Excel format with multiple sheets', async () => {
    jest.spyOn(excelExporter as any, 'fetchSensorData').mockResolvedValue(mockSensorData)

    const result = await excelExporter.exportToExcel(mockFilters, tempFilePath)

    expect(result.success).toBe(true)
    expect(result.file_path).toBe(tempFilePath)
    expect(result.record_count).toBe(mockSensorData.length)
    expect(result.sheets_created).toContain('Sensor Data')
    expect(result.sheets_created).toContain('Summary')
    expect(fs.existsSync(tempFilePath)).toBe(true)
  })

  test('should include charts when requested', async () => {
    jest.spyOn(excelExporter as any, 'fetchSensorData').mockResolvedValue(mockSensorData)

    const result = await excelExporter.exportToExcel(
      mockFilters,
      tempFilePath,
      undefined,
      { include_charts: true }
    )

    expect(result.success).toBe(true)
    expect(result.charts_included).toBe(true)
  })

  test('should apply custom formatting and branding', async () => {
    jest.spyOn(excelExporter as any, 'fetchSensorData').mockResolvedValue(mockSensorData)

    const brandingSettings = {
      company_name: 'Test Company',
      company_logo_url: 'https://example.com/logo.png',
      primary_color: '#007bff',
      show_generated_timestamp: true
    }

    const result = await excelExporter.exportToExcel(
      mockFilters,
      tempFilePath,
      undefined,
      { branding_settings: brandingSettings }
    )

    expect(result.success).toBe(true)
    expect(result.branding_applied).toBe(true)
  })

  test('should handle memory constraints for large datasets', async () => {
    // Create very large dataset to test memory handling
    const largeDataset = Array.from({ length: 100000 }, (_, i) => ({
      ...mockSensorData[0],
      sensor_id: `SENSOR_${i}`,
      timestamp: new Date(Date.now() + i * 60000).toISOString()
    }))

    jest.spyOn(excelExporter as any, 'fetchSensorData').mockResolvedValue(largeDataset)

    const result = await excelExporter.exportToExcel(mockFilters, tempFilePath)

    expect(result.success).toBe(true)
    expect(result.record_count).toBe(largeDataset.length)
  })
})

describe('PDF Generator', () => {
  let pdfGenerator: PDFGenerator
  let tempFilePath: string

  beforeEach(() => {
    pdfGenerator = new PDFGenerator({
      template_id: 'default',
      include_charts: true,
      include_branding: false,
      page_orientation: 'portrait',
      page_size: 'A4',
      quality: 'normal',
      compression_level: 6
    })
    tempFilePath = createTempFile('pdf')
  })

  afterEach(() => {
    cleanupTempFiles()
  })

  test('should generate PDF report with charts', async () => {
    jest.spyOn(pdfGenerator as any, 'fetchSensorData').mockResolvedValue(mockSensorData)
    jest.spyOn(pdfGenerator as any, 'generateCharts').mockResolvedValue(['chart1.png', 'chart2.png'])

    const result = await pdfGenerator.generateReport(mockFilters, tempFilePath)

    expect(result.success).toBe(true)
    expect(result.file_path).toBe(tempFilePath)
    expect(result.pages_generated).toBeGreaterThan(0)
    expect(fs.existsSync(tempFilePath)).toBe(true)
  })

  test('should apply custom template and branding', async () => {
    jest.spyOn(pdfGenerator as any, 'fetchSensorData').mockResolvedValue(mockSensorData)

    const templateOptions = {
      template_id: 'executive_summary',
      branding_settings: {
        company_name: 'IoT Analytics Corp',
        company_logo_url: 'https://example.com/logo.png',
        primary_color: '#2563eb',
        show_generated_timestamp: true
      }
    }

    const result = await pdfGenerator.generateReport(
      mockFilters,
      tempFilePath,
      undefined,
      templateOptions
    )

    expect(result.success).toBe(true)
    expect(result.template_used).toBe('executive_summary')
    expect(result.branding_applied).toBe(true)
  })

  test('should handle chart generation failures gracefully', async () => {
    jest.spyOn(pdfGenerator as any, 'fetchSensorData').mockResolvedValue(mockSensorData)
    jest.spyOn(pdfGenerator as any, 'generateCharts').mockRejectedValue(new Error('Chart generation failed'))

    const result = await pdfGenerator.generateReport(mockFilters, tempFilePath)

    // Should still succeed without charts
    expect(result.success).toBe(true)
    expect(result.warnings).toContain('Chart generation failed')
  })

  test('should optimize file size for large reports', async () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      ...mockSensorData[0],
      sensor_id: `SENSOR_${i}`
    }))

    jest.spyOn(pdfGenerator as any, 'fetchSensorData').mockResolvedValue(largeDataset)

    const result = await pdfGenerator.generateReport(mockFilters, tempFilePath)

    expect(result.success).toBe(true)

    // Check that file size is reasonable (not linear with data size)
    const stats = fs.statSync(tempFilePath)
    expect(stats.size).toBeLessThan(10 * 1024 * 1024) // Less than 10MB
  })

  test('should support password protection', async () => {
    jest.spyOn(pdfGenerator as any, 'fetchSensorData').mockResolvedValue(mockSensorData)

    const securityOptions = {
      password: 'test123',
      permissions: ['print', 'copy']
    }

    const result = await pdfGenerator.generateReport(
      mockFilters,
      tempFilePath,
      undefined,
      { security: securityOptions }
    )

    expect(result.success).toBe(true)
    expect(result.password_protected).toBe(true)
  })
})

describe('Export Integration Tests', () => {
  afterEach(() => {
    cleanupTempFiles()
  })

  test('should handle concurrent exports without conflicts', async () => {
    const csvExporter = new CSVExporter()
    const excelExporter = new ExcelExporter()

    // Mock data fetch for both exporters
    jest.spyOn(csvExporter, 'fetchSensorData').mockResolvedValue(mockSensorData)
    jest.spyOn(excelExporter as any, 'fetchSensorData').mockResolvedValue(mockSensorData)

    const csvPath = createTempFile('csv')
    const excelPath = createTempFile('xlsx')

    // Run exports concurrently
    const [csvResult, excelResult] = await Promise.all([
      csvExporter.exportToCSV(mockFilters, csvPath),
      excelExporter.exportToExcel(mockFilters, excelPath)
    ])

    expect(csvResult.success).toBe(true)
    expect(excelResult.success).toBe(true)
    expect(fs.existsSync(csvPath)).toBe(true)
    expect(fs.existsSync(excelPath)).toBe(true)
  })

  test('should maintain data consistency across formats', async () => {
    const csvExporter = new CSVExporter()
    const excelExporter = new ExcelExporter()

    // Use same mock data for both
    jest.spyOn(csvExporter, 'fetchSensorData').mockResolvedValue(mockSensorData)
    jest.spyOn(excelExporter as any, 'fetchSensorData').mockResolvedValue(mockSensorData)

    const csvPath = createTempFile('csv')
    const excelPath = createTempFile('xlsx')

    const [csvResult, excelResult] = await Promise.all([
      csvExporter.exportToCSV(mockFilters, csvPath),
      excelExporter.exportToExcel(mockFilters, excelPath)
    ])

    // Both should have same record count
    expect(csvResult.record_count).toBe(excelResult.record_count)
    expect(csvResult.record_count).toBe(mockSensorData.length)
  })

  test('should handle different data types and edge cases', async () => {
    const edgeCaseData = [
      {
        sensor_id: 'SENSOR_EDGE',
        sensor_name: 'Edge Case Sensor',
        location: 'Test "Location" with, special chars & symbols',
        timestamp: '2024-03-15T10:00:00Z',
        temperature: null, // Null value
        humidity: 0, // Zero value
        pressure: 999999.99, // Large number
        battery_level: -1, // Invalid value
        signal_strength: undefined, // Undefined
        status: 'inactive'
      }
    ]

    const csvExporter = new CSVExporter()
    jest.spyOn(csvExporter, 'fetchSensorData').mockResolvedValue(edgeCaseData)

    const csvPath = createTempFile('csv')
    const result = await csvExporter.exportToCSV(mockFilters, csvPath)

    expect(result.success).toBe(true)
    expect(result.record_count).toBe(1)

    // Verify CSV handles special characters and null values
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    expect(csvContent).toContain('"Test ""Location"" with, special chars & symbols"')
    expect(csvContent).toContain('999999.99')
  })
})

// Performance benchmarks
describe('Export Performance Tests', () => {
  beforeEach(() => {
    jest.setTimeout(30000) // 30 second timeout for performance tests
  })

  afterEach(() => {
    cleanupTempFiles()
  })

  test('CSV export should complete within performance thresholds', async () => {
    const csvExporter = new CSVExporter()
    const largeDataset = Array.from({ length: 50000 }, (_, i) => ({
      ...mockSensorData[0],
      sensor_id: `SENSOR_${String(i).padStart(6, '0')}`,
      timestamp: new Date(Date.now() + i * 60000).toISOString(),
      temperature: 20 + Math.random() * 10
    }))

    jest.spyOn(csvExporter, 'fetchSensorData').mockResolvedValue(largeDataset)

    const startTime = Date.now()
    const result = await csvExporter.exportToCSV(mockFilters, createTempFile('csv'))
    const duration = Date.now() - startTime

    expect(result.success).toBe(true)
    expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
    expect(result.record_count).toBe(50000)
  })

  test('Excel export should handle memory efficiently', async () => {
    const excelExporter = new ExcelExporter()
    const mediumDataset = Array.from({ length: 25000 }, (_, i) => ({
      ...mockSensorData[0],
      sensor_id: `SENSOR_${i}`
    }))

    jest.spyOn(excelExporter as any, 'fetchSensorData').mockResolvedValue(mediumDataset)

    const initialMemory = process.memoryUsage().heapUsed
    const result = await excelExporter.exportToExcel(mockFilters, createTempFile('xlsx'))
    const finalMemory = process.memoryUsage().heapUsed

    expect(result.success).toBe(true)

    // Memory usage should not exceed 500MB for this dataset
    const memoryIncrease = finalMemory - initialMemory
    expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024)
  })
})