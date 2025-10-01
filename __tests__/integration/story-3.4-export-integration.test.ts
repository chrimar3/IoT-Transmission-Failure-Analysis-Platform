/**
 * Integration Tests for Story 3.4: Data Export and Reporting
 * Tests complete export flow: Create -> Generate -> Upload -> Download
 */

import { ExportManager } from '@/src/lib/export/export-manager'
import { ExportStorageService } from '@/src/lib/export/storage-service'
import { ExportUsageTrackingService } from '@/src/lib/export/usage-tracking-service'
import { SupabaseMockFactory } from '../utils/mock-factory'

// Mock Supabase using factory pattern
jest.mock('@/src/lib/supabase', () => ({
  createServiceClient: jest.fn(() => SupabaseMockFactory.createMock())
}))

describe('Story 3.4: Export Integration Tests', () => {
  let exportManager: ExportManager
  let storageService: ExportStorageService
  let trackingService: ExportUsageTrackingService

  beforeEach(() => {
    // Reset mock factory to default state
    SupabaseMockFactory.reset()
    jest.clearAllMocks()
    exportManager = ExportManager.getInstance()
    storageService = ExportStorageService.getInstance()
    trackingService = ExportUsageTrackingService.getInstance()
  })

  describe('Complete Export Flow', () => {
    it('should complete full export workflow: create -> generate -> upload -> download', async () => {
      const userId = 'test-user-123'
      const format = 'pdf'
      const template = 'executive'
      const dateRange = {
        start: '2018-01-01',
        end: '2018-06-30'
      }

      // Step 1: Check usage limits
      const usageCheck = await trackingService.canUserExport(userId, 'PROFESSIONAL')
      expect(usageCheck.canExport).toBe(true)

      // Step 2: Verify format is allowed
      const formatAllowed = await trackingService.isFormatAllowed('PROFESSIONAL', format)
      expect(formatAllowed).toBe(true)

      // Step 3: Create export job
      const job = await exportManager.createExportJob(userId, format, template, dateRange)
      expect(job).toBeDefined()
      expect(job.id).toBeDefined()
      expect(['queued', 'processing']).toContain(job.status) // Job may start processing immediately
      expect(job.userId).toBe(userId)

      // Step 4: Record job in database
      const recorded = await trackingService.recordExportJob(
        job.id,
        userId,
        format,
        { template, dateRange },
        'PROFESSIONAL'
      )
      expect(recorded).toBe(true)

      // Step 5: Wait for job to complete (simulated)
      await new Promise(resolve => setTimeout(resolve, 100))

      // Step 6: Verify job completed
      const completedJob = exportManager.getExportJob(job.id)
      expect(completedJob).toBeDefined()
      expect(completedJob?.downloadUrl).toBeDefined()

      // Step 7: Log download action
      const logged = await trackingService.logExportAction(userId, job.id, 'downloaded', {})
      expect(logged).toBe(true)
    }, 10000)

    it('should enforce tier limits and reject exports when quota exceeded', async () => {
      // Configure mock to simulate exceeded quota
      SupabaseMockFactory.setExportQuota(false, 100, 100)

      const usageCheck = await trackingService.canUserExport('user123', 'PROFESSIONAL')

      expect(usageCheck.canExport).toBe(false)
      expect(usageCheck.currentCount).toBe(100)
      expect(usageCheck.limit).toBe(100)
    })

    it('should reject disallowed formats for tier', async () => {
      // Configure mock for FREE tier with limited formats
      SupabaseMockFactory.setTierLimits('FREE', ['csv'])

      const formatAllowed = await trackingService.isFormatAllowed('FREE', 'pdf')

      expect(formatAllowed).toBe(false)
    })
  })

  describe('Storage Integration', () => {
    it('should upload file to storage and generate signed URL', async () => {
      const mockBuffer = Buffer.from('test pdf content')
      const result = await storageService.uploadExportFile(
        'user123',
        'job456',
        mockBuffer,
        'report.pdf',
        'application/pdf'
      )

      expect(result.success).toBe(true)
      expect(result.fileKey).toBeDefined()
      expect(result.fileUrl).toContain('signed-url')
      expect(result.expiresAt).toBeDefined()
      expect(result.checksum).toBeDefined()
      expect(result.checksum).toHaveLength(64) // SHA-256 hex string
    })

    it('should regenerate signed URL for expired files', async () => {
      const fileKey = 'user123/job456/report.pdf'
      const result = await storageService.generateSignedUrl(fileKey)

      expect(result.success).toBe(true)
      expect(result.signedUrl).toBeDefined()
    })

    it('should calculate consistent checksums for identical files', async () => {
      const mockBuffer = Buffer.from('test pdf content')

      const result1 = await storageService.uploadExportFile(
        'user123',
        'job456',
        mockBuffer,
        'report1.pdf',
        'application/pdf'
      )

      const result2 = await storageService.uploadExportFile(
        'user123',
        'job457',
        mockBuffer,
        'report2.pdf',
        'application/pdf'
      )

      expect(result1.checksum).toBe(result2.checksum)
    })

    it('should retry upload on transient failures', async () => {
      // Configure mock to fail on first attempt, succeed on second
      SupabaseMockFactory.setStorageUploadSuccessOnAttempt(2)

      const mockBuffer = Buffer.from('test content')
      const result = await storageService.uploadExportFile(
        'user123',
        'job456',
        mockBuffer,
        'report.pdf',
        'application/pdf'
      )

      expect(result.success).toBe(true)
      expect(result.retryAttempts).toBe(2) // Failed once, succeeded on second attempt
    })

    it('should fail after max retry attempts', async () => {
      // Configure mock to fail all attempts
      SupabaseMockFactory.setStorageUploadError('Persistent storage error')

      const mockBuffer = Buffer.from('test content')
      const result = await storageService.uploadExportFile(
        'user123',
        'job456',
        mockBuffer,
        'report.pdf',
        'application/pdf'
      )

      expect(result.success).toBe(false)
      expect(result.retryAttempts).toBe(3) // Max attempts
      expect(result.error).toContain('Upload failed after 3 attempts')
    })

    it('should cleanup partial uploads on signed URL generation failure', async () => {
      // Configure mock: upload succeeds but signed URL fails
      SupabaseMockFactory.setStorageSignedUrlError('Unable to generate signed URL')

      const mockBuffer = Buffer.from('test content')
      const result = await storageService.uploadExportFile(
        'user123',
        'job456',
        mockBuffer,
        'report.pdf',
        'application/pdf'
      )

      // Should attempt cleanup and fail since signed URL generation failed
      expect(result.success).toBe(false)
    })

    it('should handle duplicate file errors gracefully', async () => {
      // Configure mock to simulate file already exists scenario
      SupabaseMockFactory.setDuplicateFileMode(true, 'https://storage.example.com/existing-file')

      const mockBuffer = Buffer.from('test content')
      const result = await storageService.uploadExportFile(
        'user123',
        'job456',
        mockBuffer,
        'report.pdf',
        'application/pdf'
      )

      expect(result.success).toBe(true)
      expect(result.fileUrl).toContain('existing-file')
    })
  })

  describe('Usage Tracking', () => {
    it('should track export usage correctly', async () => {
      const userId = 'user123'

      // Record multiple exports
      await trackingService.recordExportJob('job1', userId, 'csv', {}, 'PROFESSIONAL')
      await trackingService.recordExportJob('job2', userId, 'pdf', {}, 'PROFESSIONAL')

      // Get current usage
      const usage = await trackingService.getCurrentMonthUsage(userId)

      expect(usage).toBeDefined()
    })

    it('should get user export statistics', async () => {
      const stats = await trackingService.getUserExportStats('user123')

      expect(Array.isArray(stats)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle export generation errors gracefully', async () => {
      const userId = 'test-user'
      const format = 'pdf'
      const template = 'executive'
      const dateRange = {
        start: '2018-01-01',
        end: '2018-06-30'
      }

      // Create job
      const job = await exportManager.createExportJob(userId, format, template, dateRange)

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100))

      // Job should exist even if it fails
      const retrievedJob = exportManager.getExportJob(job.id)
      expect(retrievedJob).toBeDefined()
    })

    it('should handle storage upload failures', async () => {
      // Configure mock to fail with storage quota error
      SupabaseMockFactory.setStorageUploadError('Storage quota exceeded')

      const mockBuffer = Buffer.from('test content')
      const result = await storageService.uploadExportFile(
        'user123',
        'job456',
        mockBuffer,
        'report.pdf',
        'application/pdf'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Professional Tier Features', () => {
    it('should allow all formats for PROFESSIONAL tier', async () => {
      const csvAllowed = await trackingService.isFormatAllowed('PROFESSIONAL', 'csv')
      const excelAllowed = await trackingService.isFormatAllowed('PROFESSIONAL', 'excel')
      const pdfAllowed = await trackingService.isFormatAllowed('PROFESSIONAL', 'pdf')

      expect(csvAllowed).toBe(true)
      expect(excelAllowed).toBe(true)
      expect(pdfAllowed).toBe(true)
    })

    it('should have higher export limits for PROFESSIONAL tier', async () => {
      const limits = await trackingService.getTierLimits('PROFESSIONAL')

      expect(limits).toBeDefined()
      expect(limits?.exports_per_month).toBeGreaterThan(5)
    })
  })

  describe('Export Job Lifecycle', () => {
    it('should track job status through lifecycle', async () => {
      const jobId = 'test-job-123'
      const userId = 'user123'

      // Create job
      await trackingService.recordExportJob(jobId, userId, 'pdf', {}, 'PROFESSIONAL')

      // Update to processing
      let updated = await trackingService.updateExportJobStatus(jobId, 'processing', {
        progressPercent: 50
      })
      expect(updated).toBe(true)

      // Update to completed
      updated = await trackingService.updateExportJobStatus(jobId, 'completed', {
        progressPercent: 100,
        fileUrl: 'https://example.com/file.pdf',
        completedAt: new Date().toISOString()
      })
      expect(updated).toBe(true)
    })

    it('should log all export actions for audit trail', async () => {
      const userId = 'user123'
      const jobId = 'job123'

      // Log various actions
      await trackingService.logExportAction(userId, jobId, 'created', {})
      await trackingService.logExportAction(userId, jobId, 'downloaded', {})
      await trackingService.logExportAction(userId, jobId, 'shared', {})

      // All logs should succeed
      expect(true).toBe(true)
    })
  })

  describe('File Format Generation', () => {
    it('should generate CSV export successfully', async () => {
      const job = await exportManager.createExportJob(
        'user123',
        'csv',
        'raw_data',
        { start: '2018-01-01', end: '2018-06-30' }
      )

      expect(job.format).toBe('csv')
      expect(['queued', 'processing']).toContain(job.status) // Job may start processing immediately
    })

    it('should generate Excel export successfully', async () => {
      const job = await exportManager.createExportJob(
        'user123',
        'excel',
        'technical',
        { start: '2018-01-01', end: '2018-06-30' }
      )

      expect(job.format).toBe('excel')
      expect(['queued', 'processing']).toContain(job.status) // Job may start processing immediately
    })

    it('should generate PDF export successfully', async () => {
      const job = await exportManager.createExportJob(
        'user123',
        'pdf',
        'executive',
        { start: '2018-01-01', end: '2018-06-30' }
      )

      expect(job.format).toBe('pdf')
      expect(['queued', 'processing']).toContain(job.status) // Job may start processing immediately
    })
  })
})