/**
 * Epic 2 Story 2.3: Export Functionality for Professional Tier
 * Tests for export status API endpoint
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/export/status/[jobId]/route'

// Mock dependencies
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

jest.mock('@/lib/auth/config', () => ({
  authOptions: {}
}))

jest.mock('@/src/lib/export/export-manager', () => ({
  ExportManager: {
    getInstance: jest.fn(() => ({
      getExportJob: jest.fn()
    }))
  }
}))

jest.mock('@/src/lib/api/authentication', () => ({
  validateAPIKey: jest.fn()
}))

import { getServerSession } from 'next-auth/next'
import { ExportManager } from '@/src/lib/export/export-manager'
import { validateAPIKey } from '@/src/lib/api/authentication'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockValidateAPIKey = validateAPIKey as jest.MockedFunction<typeof validateAPIKey>

describe('/api/export/status/[jobId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockExportJob = {
    id: 'export_123_abc123',
    userId: 'user-123',
    format: 'pdf' as const,
    template: 'executive' as const,
    dateRange: { start: '2018-01-01', end: '2018-12-31' },
    status: 'completed' as const,
    progress: 100,
    createdAt: '2023-09-25T12:00:00Z',
    completedAt: '2023-09-25T12:05:00Z',
    downloadUrl: 'https://exports.cu-bems.com/downloads/report.pdf'
  }

  describe('Authentication', () => {
    const routeParams = { params: { jobId: 'export_123_abc123' } }

    it('should accept Professional tier web session', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-123',
          subscriptionTier: 'PROFESSIONAL'
        }
      })

      const mockExportManager = {
        getExportJob: jest.fn().mockReturnValue(mockExportJob)
      }
      ;(ExportManager.getInstance as jest.Mock).mockReturnValue(mockExportManager)

      const request = new NextRequest('http://localhost:3000/api/export/status/export_123_abc123')

      const response = await GET(request, routeParams)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.jobId).toBe(mockExportJob.id)
      expect(mockExportManager.getExportJob).toHaveBeenCalledWith('export_123_abc123')
    })

    it('should reject FREE tier web session', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-123',
          subscriptionTier: 'FREE'
        }
      })

      const request = new NextRequest('http://localhost:3000/api/export/status/export_123_abc123')

      const response = await GET(request, routeParams)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Professional subscription required')
    })

    it('should accept Professional tier API key', async () => {
      mockGetServerSession.mockResolvedValue(null)
      mockValidateAPIKey.mockResolvedValue({
        valid: true,
        tier: 'PROFESSIONAL',
        userId: 'user-123'
      })

      const mockExportManager = {
        getExportJob: jest.fn().mockReturnValue(mockExportJob)
      }
      ;(ExportManager.getInstance as jest.Mock).mockReturnValue(mockExportManager)

      const request = new NextRequest('http://localhost:3000/api/export/status/export_123_abc123', {
        headers: {
          'Authorization': 'Bearer professional-api-key'
        }
      })

      const response = await GET(request, routeParams)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.jobId).toBe(mockExportJob.id)
    })

    it('should reject FREE tier API key', async () => {
      mockGetServerSession.mockResolvedValue(null)
      mockValidateAPIKey.mockResolvedValue({
        valid: true,
        tier: 'FREE',
        userId: 'user-123'
      })

      const request = new NextRequest('http://localhost:3000/api/export/status/export_123_abc123', {
        headers: {
          'Authorization': 'Bearer free-api-key'
        }
      })

      const response = await GET(request, routeParams)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Professional API key required')
    })
  })

  describe('Job ID Validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-123',
          subscriptionTier: 'PROFESSIONAL'
        }
      })
    })

    it('should validate job ID presence', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/status/')

      const response = await GET(request, { params: { jobId: '' } })
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Job ID is required')
    })

    it('should handle non-existent job ID', async () => {
      const mockExportManager = {
        getExportJob: jest.fn().mockReturnValue(null)
      }
      ;(ExportManager.getInstance as jest.Mock).mockReturnValue(mockExportManager)

      const request = new NextRequest('http://localhost:3000/api/export/status/non-existent-job')

      const response = await GET(request, { params: { jobId: 'non-existent-job' } })
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Export job not found')
      expect(mockExportManager.getExportJob).toHaveBeenCalledWith('non-existent-job')
    })
  })

  describe('Job Ownership Verification', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-123',
          subscriptionTier: 'PROFESSIONAL'
        }
      })
    })

    it('should allow access to own export job', async () => {
      const mockExportManager = {
        getExportJob: jest.fn().mockReturnValue(mockExportJob)
      }
      ;(ExportManager.getInstance as jest.Mock).mockReturnValue(mockExportManager)

      const request = new NextRequest('http://localhost:3000/api/export/status/export_123_abc123')

      const response = await GET(request, { params: { jobId: 'export_123_abc123' } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.jobId).toBe(mockExportJob.id)
    })

    it('should deny access to other user\'s export job', async () => {
      const otherUserJob = {
        ...mockExportJob,
        userId: 'other-user-456'
      }

      const mockExportManager = {
        getExportJob: jest.fn().mockReturnValue(otherUserJob)
      }
      ;(ExportManager.getInstance as jest.Mock).mockReturnValue(mockExportManager)

      const request = new NextRequest('http://localhost:3000/api/export/status/export_123_abc123')

      const response = await GET(request, { params: { jobId: 'export_123_abc123' } })
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Access denied')
    })
  })

  describe('Job Status Response', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-123',
          subscriptionTier: 'PROFESSIONAL'
        }
      })
    })

    it('should return complete job information', async () => {
      const mockExportManager = {
        getExportJob: jest.fn().mockReturnValue(mockExportJob)
      }
      ;(ExportManager.getInstance as jest.Mock).mockReturnValue(mockExportManager)

      const request = new NextRequest('http://localhost:3000/api/export/status/export_123_abc123')

      const response = await GET(request, { params: { jobId: 'export_123_abc123' } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        jobId: mockExportJob.id,
        status: mockExportJob.status,
        progress: mockExportJob.progress,
        format: mockExportJob.format,
        template: mockExportJob.template,
        dateRange: mockExportJob.dateRange,
        createdAt: mockExportJob.createdAt,
        completedAt: mockExportJob.completedAt,
        downloadUrl: mockExportJob.downloadUrl,
        error: undefined
      })
    })

    it('should return processing job information', async () => {
      const processingJob = {
        ...mockExportJob,
        status: 'processing' as const,
        progress: 45,
        completedAt: undefined,
        downloadUrl: undefined
      }

      const mockExportManager = {
        getExportJob: jest.fn().mockReturnValue(processingJob)
      }
      ;(ExportManager.getInstance as jest.Mock).mockReturnValue(mockExportManager)

      const request = new NextRequest('http://localhost:3000/api/export/status/export_123_abc123')

      const response = await GET(request, { params: { jobId: 'export_123_abc123' } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        jobId: processingJob.id,
        status: 'processing',
        progress: 45,
        completedAt: undefined,
        downloadUrl: undefined
      })
    })

    it('should return failed job information with error', async () => {
      const failedJob = {
        ...mockExportJob,
        status: 'failed' as const,
        progress: 30,
        completedAt: '2023-09-25T12:03:00Z',
        downloadUrl: undefined,
        error: 'PDF generation failed'
      }

      const mockExportManager = {
        getExportJob: jest.fn().mockReturnValue(failedJob)
      }
      ;(ExportManager.getInstance as jest.Mock).mockReturnValue(mockExportManager)

      const request = new NextRequest('http://localhost:3000/api/export/status/export_123_abc123')

      const response = await GET(request, { params: { jobId: 'export_123_abc123' } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        jobId: failedJob.id,
        status: 'failed',
        progress: 30,
        error: 'PDF generation failed',
        downloadUrl: undefined
      })
    })

    it('should return queued job information', async () => {
      const queuedJob = {
        ...mockExportJob,
        status: 'queued' as const,
        progress: 0,
        completedAt: undefined,
        downloadUrl: undefined
      }

      const mockExportManager = {
        getExportJob: jest.fn().mockReturnValue(queuedJob)
      }
      ;(ExportManager.getInstance as jest.Mock).mockReturnValue(mockExportManager)

      const request = new NextRequest('http://localhost:3000/api/export/status/export_123_abc123')

      const response = await GET(request, { params: { jobId: 'export_123_abc123' } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        jobId: queuedJob.id,
        status: 'queued',
        progress: 0,
        completedAt: undefined,
        downloadUrl: undefined
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-123',
          subscriptionTier: 'PROFESSIONAL'
        }
      })
    })

    it('should handle export manager errors', async () => {
      const mockExportManager = {
        getExportJob: jest.fn().mockImplementation(() => {
          throw new Error('Database connection failed')
        })
      }
      ;(ExportManager.getInstance as jest.Mock).mockReturnValue(mockExportManager)

      const request = new NextRequest('http://localhost:3000/api/export/status/export_123_abc123')

      const response = await GET(request, { params: { jobId: 'export_123_abc123' } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
    })

    it('should handle authentication errors', async () => {
      mockGetServerSession.mockRejectedValue(new Error('Authentication service unavailable'))

      const request = new NextRequest('http://localhost:3000/api/export/status/export_123_abc123')

      const response = await GET(request, { params: { jobId: 'export_123_abc123' } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
    })
  })
})