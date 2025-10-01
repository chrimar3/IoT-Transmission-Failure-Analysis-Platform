/**
 * Tests for Export Storage Service
 * Story 3.4: Data Export and Reporting
 */

import { ExportStorageService } from '@/src/lib/export/storage-service'

// Mock Supabase
const mockUpload = jest.fn()
const mockCreateSignedUrl = jest.fn()
const mockRemove = jest.fn()
const mockList = jest.fn()

jest.mock('@/src/lib/supabase', () => ({
  createServiceClient: jest.fn(() => ({
    storage: {
      listBuckets: jest.fn().mockResolvedValue({ data: [], error: null }),
      createBucket: jest.fn().mockResolvedValue({ error: null }),
      from: jest.fn(() => ({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
        remove: mockRemove,
        list: mockList
      }))
    }
  }))
}))

describe('ExportStorageService', () => {
  let storageService: ExportStorageService
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    storageService = ExportStorageService.getInstance()

    // Get mock Supabase instance
    const { createServiceClient } = require('@/src/lib/supabase')
    mockSupabase = createServiceClient()
  })

  describe('uploadExportFile', () => {
    it('should upload file and return signed URL', async () => {
      const mockBuffer = Buffer.from('test data')
      const mockFileKey = 'user123/job456/report.pdf'
      const mockSignedUrl = 'https://storage.example.com/signed-url'

      mockUpload.mockResolvedValue({
        data: { path: mockFileKey },
        error: null
      })

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null
      })

      const result = await storageService.uploadExportFile(
        'user123',
        'job456',
        mockBuffer,
        'report.pdf',
        'application/pdf'
      )

      expect(result.success).toBe(true)
      expect(result.fileKey).toBe(mockFileKey)
      expect(result.fileUrl).toBe(mockSignedUrl)
      expect(result.fileSize).toBe(mockBuffer.length)
      expect(result.expiresAt).toBeDefined()
    })

    it('should handle upload errors gracefully', async () => {
      const mockBuffer = Buffer.from('test data')

      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' }
      })

      const result = await storageService.uploadExportFile(
        'user123',
        'job456',
        mockBuffer,
        'report.pdf',
        'application/pdf'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload failed after 3 attempts: Upload failed')
    })

    it('should handle signed URL generation errors', async () => {
      const mockBuffer = Buffer.from('test data')
      const mockFileKey = 'user123/job456/report.pdf'

      mockUpload.mockResolvedValue({
        data: { path: mockFileKey },
        error: null
      })

      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'Signed URL generation failed' }
      })

      const result = await storageService.uploadExportFile(
        'user123',
        'job456',
        mockBuffer,
        'report.pdf',
        'application/pdf'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Signed URL generation failed: Signed URL generation failed')
    })
  })

  describe('generateSignedUrl', () => {
    it('should generate signed URL for existing file', async () => {
      const mockFileKey = 'user123/job456/report.pdf'
      const mockSignedUrl = 'https://storage.example.com/new-signed-url'

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null
      })

      const result = await storageService.generateSignedUrl(mockFileKey)

      expect(result.success).toBe(true)
      expect(result.signedUrl).toBe(mockSignedUrl)
      expect(result.expiresAt).toBeDefined()
    })

    it('should respect custom expiry time', async () => {
      const mockFileKey = 'user123/job456/report.pdf'
      const mockSignedUrl = 'https://storage.example.com/signed-url'
      const customExpiry = 3600 // 1 hour

      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null
      })

      const result = await storageService.generateSignedUrl(mockFileKey, customExpiry)

      expect(result.success).toBe(true)
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        mockFileKey,
        customExpiry
      )
    })

    it('should handle errors when generating signed URL', async () => {
      const mockFileKey = 'user123/job456/report.pdf'

      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'File not found' }
      })

      const result = await storageService.generateSignedUrl(mockFileKey)

      expect(result.success).toBe(false)
      expect(result.error).toBe('File not found')
    })
  })

  describe('deleteExportFile', () => {
    it('should delete file successfully', async () => {
      const mockFileKey = 'user123/job456/report.pdf'

      mockRemove.mockResolvedValue({
        data: {},
        error: null
      })

      const result = await storageService.deleteExportFile(mockFileKey)

      expect(result).toBe(true)
      expect(mockRemove).toHaveBeenCalledWith([mockFileKey])
    })

    it('should return false on deletion error', async () => {
      const mockFileKey = 'user123/job456/report.pdf'

      mockRemove.mockResolvedValue({
        data: null,
        error: { message: 'Deletion failed' }
      })

      const result = await storageService.deleteExportFile(mockFileKey)

      expect(result).toBe(false)
    })
  })

  describe('listUserExports', () => {
    it('should list all exports for a user', async () => {
      const userId = 'user123'
      const mockFiles = [
        { name: 'job1/report.pdf' },
        { name: 'job2/data.csv' }
      ]

      mockList.mockResolvedValue({
        data: mockFiles,
        error: null
      })

      const result = await storageService.listUserExports(userId)

      expect(result).toHaveLength(2)
      expect(result[0]).toBe('user123/job1/report.pdf')
      expect(result[1]).toBe('user123/job2/data.csv')
    })

    it('should return empty array on error', async () => {
      const userId = 'user123'

      mockList.mockResolvedValue({
        data: null,
        error: { message: 'List failed' }
      })

      const result = await storageService.listUserExports(userId)

      expect(result).toEqual([])
    })
  })

  describe('getContentType', () => {
    it('should return correct content type for PDF', () => {
      const { getContentType } = require('@/src/lib/export/storage-service')
      expect(getContentType('pdf')).toBe('application/pdf')
    })

    it('should return correct content type for CSV', () => {
      const { getContentType } = require('@/src/lib/export/storage-service')
      expect(getContentType('csv')).toBe('text/csv')
    })

    it('should return correct content type for Excel', () => {
      const { getContentType } = require('@/src/lib/export/storage-service')
      expect(getContentType('excel')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    })
  })
})