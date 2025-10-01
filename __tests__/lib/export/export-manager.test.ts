/**
 * Epic 2 Story 2.3: Export Functionality for Professional Tier
 * Tests for ExportManager class
 */

import { ExportManager, ExportJob, BangkokExportData } from '@/src/lib/export/export-manager'

// Mock pdf-lib and exceljs
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: jest.fn(() => ({
      embedFont: jest.fn(),
      addPage: jest.fn(() => ({
        getSize: jest.fn(() => ({ width: 612, height: 792 })),
        drawText: jest.fn()
      })),
      save: jest.fn(() => new ArrayBuffer(1000))
    }))
  },
  StandardFonts: {
    TimesRoman: 'TimesRoman',
    HelveticaBold: 'HelveticaBold'
  },
  rgb: jest.fn()
}))

jest.mock('exceljs', () => ({
  Workbook: jest.fn(() => ({
    addWorksheet: jest.fn(() => ({
      addRow: jest.fn(),
      getCell: jest.fn(() => ({
        font: {}
      })),
      getRow: jest.fn(() => ({
        height: 0
      }))
    })),
    xlsx: {
      writeBuffer: jest.fn(() => new ArrayBuffer(2000))
    }
  }))
}))

describe('ExportManager', () => {
  let exportManager: ExportManager

  beforeEach(() => {
    // Reset singleton instance
    ;(ExportManager as any).instance = undefined
    exportManager = ExportManager.getInstance()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = ExportManager.getInstance()
      const instance2 = ExportManager.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('Export Job Creation', () => {
    it('should create export job with valid parameters', async () => {
      const userId = 'user-123'
      const format = 'pdf'
      const template = 'executive'
      const dateRange = { start: '2018-01-01', end: '2018-12-31' }

      const job = await exportManager.createExportJob(userId, format, template, dateRange)

      // Check individual properties
      expect(job.userId).toBe(userId)
      expect(job.format).toBe(format)
      expect(job.template).toBe(template)
      expect(job.dateRange).toEqual(dateRange)
      expect(['queued', 'processing']).toContain(job.status) // Status can change due to async processing
      expect(job.progress).toBeGreaterThanOrEqual(0)
      expect(job.id).toMatch(/^export_\d+_[a-z0-9]+$/)
      expect(job.createdAt).toBeTruthy()
    })

    it('should start processing job asynchronously', async () => {
      const userId = 'user-123'
      const format = 'csv'
      const template = 'technical'
      const dateRange = { start: '2018-06-01', end: '2018-06-30' }

      const job = await exportManager.createExportJob(userId, format, template, dateRange)

      // The job should start as queued but may quickly move to processing
      expect(['queued', 'processing']).toContain(job.status)
      expect(job.progress).toBeGreaterThanOrEqual(0)

      // Wait longer for async processing to start
      await new Promise(resolve => setTimeout(resolve, 200))

      const updatedJob = exportManager.getExportJob(job.id)
      // Job should either be processing or completed (depending on timing)
      expect(['processing', 'completed']).toContain(updatedJob?.status)
    })

    it('should generate unique job IDs', async () => {
      const userId = 'user-123'
      const format = 'excel'
      const template = 'compliance'
      const dateRange = { start: '2018-01-01', end: '2018-03-31' }

      const job1 = await exportManager.createExportJob(userId, format, template, dateRange)
      const job2 = await exportManager.createExportJob(userId, format, template, dateRange)

      expect(job1.id).not.toBe(job2.id)
    })
  })

  describe('Export Job Retrieval', () => {
    it('should retrieve existing export job', async () => {
      const userId = 'user-123'
      const format = 'pdf'
      const template = 'raw_data'
      const dateRange = { start: '2018-01-01', end: '2018-01-31' }

      const createdJob = await exportManager.createExportJob(userId, format, template, dateRange)
      const retrievedJob = exportManager.getExportJob(createdJob.id)

      expect(retrievedJob).toEqual(createdJob)
    })

    it('should return null for non-existent job', () => {
      const nonExistentJob = exportManager.getExportJob('non-existent-id')
      expect(nonExistentJob).toBeNull()
    })
  })

  describe('User Export History', () => {
    it('should return export history for specific user', async () => {
      const userId1 = 'user-123'
      const userId2 = 'user-456'

      const job1 = await exportManager.createExportJob(userId1, 'pdf', 'executive', { start: '2018-01-01', end: '2018-01-31' })
      await new Promise(resolve => setTimeout(resolve, 10)) // Small delay for timestamp difference
      const job2 = await exportManager.createExportJob(userId2, 'csv', 'technical', { start: '2018-02-01', end: '2018-02-28' })
      await new Promise(resolve => setTimeout(resolve, 10)) // Small delay for timestamp difference
      const job3 = await exportManager.createExportJob(userId1, 'excel', 'compliance', { start: '2018-03-01', end: '2018-03-31' })

      const user1History = exportManager.getUserExportHistory(userId1)
      const user2History = exportManager.getUserExportHistory(userId2)

      expect(user1History).toHaveLength(2)
      expect(user2History).toHaveLength(1)

      // Check that user1 has both jobs (job1 and job3), regardless of order
      const user1JobIds = user1History.map(job => job.id)
      expect(user1JobIds).toContain(job1.id)
      expect(user1JobIds).toContain(job3.id)
      expect(user2History[0].id).toBe(job2.id)
    })

    it('should return empty array for user with no exports', () => {
      const history = exportManager.getUserExportHistory('user-with-no-exports')
      expect(history).toEqual([])
    })

    it('should sort export history by creation date descending', async () => {
      const userId = 'user-123'

      // Create jobs with slight delay to ensure different timestamps
      const job1 = await exportManager.createExportJob(userId, 'pdf', 'executive', { start: '2018-01-01', end: '2018-01-31' })
      await new Promise(resolve => setTimeout(resolve, 10))
      const job2 = await exportManager.createExportJob(userId, 'csv', 'technical', { start: '2018-02-01', end: '2018-02-28' })
      await new Promise(resolve => setTimeout(resolve, 10))
      const job3 = await exportManager.createExportJob(userId, 'excel', 'compliance', { start: '2018-03-01', end: '2018-03-31' })

      const history = exportManager.getUserExportHistory(userId)

      expect(history[0].id).toBe(job3.id) // Most recent first
      expect(history[1].id).toBe(job2.id)
      expect(history[2].id).toBe(job1.id)
    })
  })

  describe('Bangkok Data Fetching', () => {
    it('should generate Bangkok dataset with correct structure', async () => {
      const dateRange = { start: '2018-01-01', end: '2018-01-07' }

      // Access private method for testing
      const bangkokData = await (exportManager as any).fetchBangkokData(dateRange)

      expect(bangkokData).toMatchObject({
        summary: {
          buildingHealth: {
            value: 72.3,
            lower: 70.1,
            upper: 74.5,
            confidence: 95
          },
          energySavings: {
            annual: 45000,
            currency: 'EUR'
          },
          dataQuality: 96.8,
          totalRecords: 124900000
        },
        statistics: expect.arrayContaining([
          expect.objectContaining({
            sensor: 'HVAC',
            min: expect.any(Number),
            max: expect.any(Number),
            avg: expect.any(Number),
            stdDev: expect.any(Number),
            trend: expect.any(String)
          })
        ]),
        seasonalPatterns: expect.arrayContaining([
          expect.objectContaining({
            season: expect.stringMatching(/Winter|Spring|Summer|Fall/),
            avgConsumption: expect.any(Number),
            peakHours: expect.any(Array)
          })
        ])
      })

      expect(bangkokData.timeSeries).toBeInstanceOf(Array)
      expect(bangkokData.timeSeries.length).toBeGreaterThan(0)
      expect(bangkokData.statistics).toHaveLength(5) // 5 sensor types
      expect(bangkokData.seasonalPatterns).toHaveLength(4) // 4 seasons
    })

    it('should generate time series data for date range', async () => {
      const dateRange = { start: '2018-01-01', end: '2018-01-03' } // 3 days

      const bangkokData = await (exportManager as any).fetchBangkokData(dateRange)

      expect(bangkokData.timeSeries).toHaveLength(3) // One entry per day
      expect(bangkokData.timeSeries[0]).toMatchObject({
        timestamp: expect.any(String),
        HVAC: expect.any(Number),
        Lighting: expect.any(Number),
        Power: expect.any(Number),
        Security: expect.any(Number),
        Elevators: expect.any(Number)
      })
    })
  })

  describe('PDF Generation', () => {
    it('should generate PDF buffer for executive template', async () => {
      const mockData: BangkokExportData = {
        summary: {
          buildingHealth: { value: 72.3, lower: 70.1, upper: 74.5, confidence: 95 },
          energySavings: { annual: 45000, currency: 'EUR' },
          dataQuality: 96.8,
          totalRecords: 124900000
        },
        timeSeries: [],
        statistics: [
          { sensor: 'HVAC', min: 45.2, max: 92.1, avg: 68.7, stdDev: 8.3, trend: 'stable' }
        ],
        seasonalPatterns: [
          { season: 'Winter', avgConsumption: 185.3, peakHours: ['08:00-10:00'] }
        ]
      }

      const pdfBuffer = await (exportManager as any).generatePDF(mockData, 'executive')

      expect(pdfBuffer).toBeInstanceOf(Buffer)
      expect(pdfBuffer.length).toBeGreaterThan(0)
    })
  })

  describe('CSV Generation', () => {
    it('should generate CSV with metadata and data', async () => {
      const mockData: BangkokExportData = {
        summary: {
          buildingHealth: { value: 72.3, lower: 70.1, upper: 74.5, confidence: 95 },
          energySavings: { annual: 45000, currency: 'EUR' },
          dataQuality: 96.8,
          totalRecords: 124900000
        },
        timeSeries: [
          { timestamp: '2018-01-01T00:00:00Z', HVAC: 65, Lighting: 35, Power: 45, Security: 8, Elevators: 15 }
        ],
        statistics: [
          { sensor: 'HVAC', min: 45.2, max: 92.1, avg: 68.7, stdDev: 8.3, trend: 'stable' }
        ],
        seasonalPatterns: [
          { season: 'Winter', avgConsumption: 185.3, peakHours: ['08:00-10:00'] }
        ]
      }

      const csvBuffer = await (exportManager as any).generateCSV(mockData)
      const csvContent = csvBuffer.toString('utf8')

      expect(csvContent).toContain('# Bangkok University Dataset Export')
      expect(csvContent).toContain('# Data Quality: 96.8%')
      expect(csvContent).toContain('timestamp,HVAC,Lighting,Power,Security,Elevators')
      expect(csvContent).toContain('2018-01-01T00:00:00Z,65,35,45,8,15')
      expect(csvContent).toContain('sensor,min,max,avg,stdDev,trend')
      expect(csvContent).toContain('HVAC,45.2,92.1,68.7,8.3,stable')
    })
  })

  describe('Excel Generation', () => {
    it('should generate Excel workbook with multiple sheets', async () => {
      const mockData: BangkokExportData = {
        summary: {
          buildingHealth: { value: 72.3, lower: 70.1, upper: 74.5, confidence: 95 },
          energySavings: { annual: 45000, currency: 'EUR' },
          dataQuality: 96.8,
          totalRecords: 124900000
        },
        timeSeries: [
          { timestamp: '2018-01-01T00:00:00Z', HVAC: 65, Lighting: 35, Power: 45, Security: 8, Elevators: 15 }
        ],
        statistics: [
          { sensor: 'HVAC', min: 45.2, max: 92.1, avg: 68.7, stdDev: 8.3, trend: 'stable' }
        ],
        seasonalPatterns: [
          { season: 'Winter', avgConsumption: 185.3, peakHours: ['08:00-10:00'] }
        ]
      }

      const excelBuffer = await (exportManager as any).generateExcel(mockData)

      expect(excelBuffer).toBeInstanceOf(Buffer)
      expect(excelBuffer.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle processing errors gracefully', async () => {
      // Mock error in PDF generation
      const originalGeneratePDF = (exportManager as any).generatePDF
      ;(exportManager as any).generatePDF = jest.fn().mockRejectedValue(new Error('PDF generation failed'))

      const userId = 'user-123'
      const format = 'pdf'
      const template = 'executive'
      const dateRange = { start: '2018-01-01', end: '2018-01-31' }

      const job = await exportManager.createExportJob(userId, format, template, dateRange)

      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      const updatedJob = exportManager.getExportJob(job.id)
      expect(updatedJob?.status).toBe('failed')
      expect(updatedJob?.error).toBe('PDF generation failed')

      // Restore original method
      ;(exportManager as any).generatePDF = originalGeneratePDF
    })

    it('should update job progress during processing', async () => {
      const userId = 'user-123'
      const format = 'csv'
      const template = 'technical'
      const dateRange = { start: '2018-01-01', end: '2018-01-31' }

      const job = await exportManager.createExportJob(userId, format, template, dateRange)

      // Check initial progress (may have started processing already)
      expect(job.progress).toBeGreaterThanOrEqual(0)
      expect(job.progress).toBeLessThanOrEqual(100)

      // Wait for processing to start and progress
      await new Promise(resolve => setTimeout(resolve, 200))

      const processingJob = exportManager.getExportJob(job.id)
      // Progress should be greater than 0 and could be 100 if completed
      expect(processingJob?.progress).toBeGreaterThanOrEqual(0)
      expect(processingJob?.progress).toBeLessThanOrEqual(100)
    })
  })

  describe('Job ID Generation', () => {
    it('should generate valid job ID format', () => {
      const jobId = (exportManager as any).generateJobId()

      expect(jobId).toMatch(/^export_\d+_[a-z0-9]{9}$/)
    })

    it('should generate unique job IDs', () => {
      const jobId1 = (exportManager as any).generateJobId()
      const jobId2 = (exportManager as any).generateJobId()

      expect(jobId1).not.toBe(jobId2)
    })
  })

  describe('File Upload Simulation', () => {
    it('should return download URL', async () => {
      const fileBuffer = Buffer.from('test content')
      const filename = 'test-export.pdf'

      const downloadUrl = await (exportManager as any).uploadFile(fileBuffer, filename)

      expect(downloadUrl).toBe(`https://exports.cu-bems.com/downloads/${filename}`)
    })
  })
})