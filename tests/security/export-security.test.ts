/**
 * Security Tests for Export Functionality (Story 3.4)
 * Tests access control, rate limiting, and security vulnerabilities
 */

import { NextRequest } from 'next/server'
import { GET as downloadGET } from '@/app/api/export/download/[jobId]/route'
import { GET as statusGET } from '@/app/api/export/status/[jobId]/route'
import { POST as createPOST } from '@/app/api/export/create/route'

// Mock dependencies
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

jest.mock('@/src/lib/api/authentication', () => ({
  validateAPIKey: jest.fn()
}))

jest.mock('@/src/lib/api/rate-limiting', () => ({
  checkRateLimit: jest.fn()
}))

jest.mock('@/src/lib/export/export-manager')
jest.mock('@/src/lib/export/storage-service')
jest.mock('@/src/lib/export/usage-tracking-service')

describe('Export Security Tests', () => {
  let mockSession: any
  let mockValidateAPIKey: any
  let mockCheckRateLimit: any
  let mockExportManager: any

  beforeEach(() => {
    jest.clearAllMocks()

    const { getServerSession } = require('next-auth/next')
    mockSession = getServerSession as jest.Mock

    const { validateAPIKey } = require('@/src/lib/api/authentication')
    mockValidateAPIKey = validateAPIKey as jest.Mock

    const { checkRateLimit } = require('@/src/lib/api/rate-limiting')
    mockCheckRateLimit = checkRateLimit as jest.Mock

    const { ExportManager } = require('@/src/lib/export/export-manager')
    mockExportManager = {
      getInstance: jest.fn(() => ({
        getExportJob: jest.fn(),
        createExportJob: jest.fn(),
        getUserExportHistory: jest.fn()
      }))
    }
    ExportManager.getInstance = mockExportManager.getInstance

    // Default mock for rate limiting
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      retryAfter: null
    })
  })

  describe('Critical: Job ID Access Control', () => {
    it('SECURITY-1: should prevent cross-user access to export jobs', async () => {
      // User A creates a job
      const userAId = 'user-a-12345'
      const userBId = 'user-b-67890'
      const jobId = 'job-abc123'

      // Mock User A session
      mockSession.mockResolvedValue({
        user: {
          id: userAId,
          subscriptionTier: 'PROFESSIONAL'
        }
      })

      // Mock export manager to return job owned by User A
      const mockGetExportJob = jest.fn(() => ({
        id: jobId,
        userId: userAId,
        status: 'completed',
        downloadUrl: 'https://storage.example.com/file.pdf',
        format: 'pdf',
        template: 'executive',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      }))

      mockExportManager.getInstance().getExportJob = mockGetExportJob

      // User B tries to access User A's export
      mockSession.mockResolvedValue({
        user: {
          id: userBId,
          subscriptionTier: 'PROFESSIONAL'
        }
      })

      const request = new NextRequest('http://localhost/api/export/download/job-abc123')
      const response = await downloadGET(request, { params: { jobId } })

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain('Access denied')
    })

    it('SECURITY-2: should validate job ownership in status endpoint', async () => {
      const ownerId = 'owner-123'
      const attackerId = 'attacker-456'
      const jobId = 'job-xyz789'

      // Mock job owned by different user
      const mockGetExportJob = jest.fn(() => ({
        id: jobId,
        userId: ownerId,
        status: 'completed'
      }))

      mockExportManager.getInstance().getExportJob = mockGetExportJob

      // Attacker tries to check status
      mockSession.mockResolvedValue({
        user: {
          id: attackerId,
          subscriptionTier: 'PROFESSIONAL'
        }
      })

      const request = new NextRequest('http://localhost/api/export/status/job-xyz789')
      const response = await statusGET(request, { params: { jobId } })

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain('Access denied')
    })

    it('SECURITY-3: should return 404 for non-existent jobs (no info leak)', async () => {
      const userId = 'user-123'
      const fakeJobId = 'job-does-not-exist'

      mockSession.mockResolvedValue({
        user: {
          id: userId,
          subscriptionTier: 'PROFESSIONAL'
        }
      })

      // Mock export manager to return null for non-existent job
      const mockGetExportJob = jest.fn(() => null)
      mockExportManager.getInstance().getExportJob = mockGetExportJob

      const request = new NextRequest(`http://localhost/api/export/download/${fakeJobId}`)
      const response = await downloadGET(request, { params: { jobId: fakeJobId } })

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe('Export job not found')

      // Should NOT leak information about whether job exists for different user
    })

    it('SECURITY-4: should validate API key ownership matches job owner', async () => {
      const ownerId = 'owner-123'
      const apiKeyUserId = 'different-user-456'
      const jobId = 'job-abc'

      // Mock API key authentication
      mockSession.mockResolvedValue(null) // No web session
      mockValidateAPIKey.mockResolvedValue({
        valid: true,
        userId: apiKeyUserId,
        tier: 'PROFESSIONAL'
      })

      // Mock job owned by different user
      const mockGetExportJob = jest.fn(() => ({
        id: jobId,
        userId: ownerId,
        status: 'completed'
      }))
      mockExportManager.getInstance().getExportJob = mockGetExportJob

      const request = new NextRequest(`http://localhost/api/export/download/${jobId}`, {
        headers: {
          authorization: 'Bearer fake-api-key'
        }
      })

      const response = await downloadGET(request, { params: { jobId } })

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain('Access denied')
    })
  })

  describe('Critical: Export Limit Enforcement', () => {
    it('LIMIT-1: should enforce 100/month limit for Professional tier', async () => {
      const userId = 'user-123'

      mockSession.mockResolvedValue({
        user: {
          id: userId,
          subscriptionTier: 'PROFESSIONAL'
        }
      })

      // Mock usage tracking to show limit exceeded
      const { exportUsageTrackingService } = require('@/src/lib/export/usage-tracking-service')
      exportUsageTrackingService.canUserExport = jest.fn().mockResolvedValue({
        canExport: false,
        currentCount: 100,
        limit: 100,
        percentageUsed: 100,
        resetsAt: new Date('2025-11-01').toISOString(),
        message: 'Export limit reached'
      })

      const request = new NextRequest('http://localhost/api/export/create', {
        method: 'POST',
        body: JSON.stringify({
          format: 'pdf',
          template: 'executive',
          dateRange: {
            start: '2018-01-01',
            end: '2018-06-30'
          }
        })
      })

      const response = await createPOST(request)

      expect(response.status).toBe(429)
      const body = await response.json()
      expect(body.error).toContain('Export limit')
      expect(body.usage).toBeDefined()
      expect(body.usage.current).toBe(100)
      expect(body.usage.limit).toBe(100)
    })

    it('LIMIT-2: should enforce 5/month limit for Free tier', async () => {
      const userId = 'free-user-123'

      mockSession.mockResolvedValue({
        user: {
          id: userId,
          subscriptionTier: 'FREE'
        }
      })

      const request = new NextRequest('http://localhost/api/export/create', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          template: 'raw_data',
          dateRange: {
            start: '2018-01-01',
            end: '2018-06-30'
          }
        })
      })

      const response = await createPOST(request)

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain('Professional subscription required')
    })

    it('LIMIT-3: should block FREE tier from accessing Professional endpoints', async () => {
      const userId = 'free-user-123'

      mockSession.mockResolvedValue({
        user: {
          id: userId,
          subscriptionTier: 'FREE'
        }
      })

      const request = new NextRequest('http://localhost/api/export/download/job-123')
      const response = await downloadGET(request, { params: { jobId: 'job-123' } })

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain('Professional subscription required')
    })

    it('LIMIT-4: should include reset date in limit exceeded response', async () => {
      const userId = 'user-123'
      const resetDate = new Date('2025-11-01').toISOString()

      mockSession.mockResolvedValue({
        user: {
          id: userId,
          subscriptionTier: 'PROFESSIONAL'
        }
      })

      const { exportUsageTrackingService } = require('@/src/lib/export/usage-tracking-service')
      exportUsageTrackingService.canUserExport = jest.fn().mockResolvedValue({
        canExport: false,
        currentCount: 100,
        limit: 100,
        percentageUsed: 100,
        resetsAt: resetDate,
        message: 'Export limit reached'
      })

      const request = new NextRequest('http://localhost/api/export/create', {
        method: 'POST',
        body: JSON.stringify({
          format: 'pdf',
          template: 'executive',
          dateRange: { start: '2018-01-01', end: '2018-06-30' }
        })
      })

      const response = await createPOST(request)

      expect(response.status).toBe(429)
      const body = await response.json()
      expect(body.usage.resetsAt).toBe(resetDate)
    })
  })

  describe('Authentication and Authorization', () => {
    it('AUTH-1: should require authentication for all export endpoints', async () => {
      mockSession.mockResolvedValue(null)
      mockValidateAPIKey.mockResolvedValue({ valid: false })

      const downloadRequest = new NextRequest('http://localhost/api/export/download/job-123')
      const downloadResponse = await downloadGET(downloadRequest, { params: { jobId: 'job-123' } })
      expect(downloadResponse.status).toBe(401)

      const statusRequest = new NextRequest('http://localhost/api/export/status/job-123')
      const statusResponse = await statusGET(statusRequest, { params: { jobId: 'job-123' } })
      expect(statusResponse.status).toBe(401)
    })

    it('AUTH-2: should accept valid API key authentication', async () => {
      const userId = 'user-123'

      mockSession.mockResolvedValue(null)
      mockValidateAPIKey.mockResolvedValue({
        valid: true,
        userId: userId,
        tier: 'PROFESSIONAL'
      })

      // Mock export job
      const mockGetExportJob = jest.fn(() => ({
        id: 'job-123',
        userId: userId,
        status: 'completed',
        downloadUrl: 'https://example.com/file.pdf'
      }))
      mockExportManager.getInstance().getExportJob = mockGetExportJob

      const request = new NextRequest('http://localhost/api/export/status/job-123', {
        headers: {
          authorization: 'Bearer valid-api-key'
        }
      })

      const response = await statusGET(request, { params: { jobId: 'job-123' } })

      expect(response.status).toBe(200)
      expect(mockValidateAPIKey).toHaveBeenCalledWith('valid-api-key')
    })

    it('AUTH-3: should reject invalid API keys', async () => {
      mockSession.mockResolvedValue(null)
      mockValidateAPIKey.mockResolvedValue({
        valid: false
      })

      const request = new NextRequest('http://localhost/api/export/download/job-123', {
        headers: {
          authorization: 'Bearer invalid-key'
        }
      })

      const response = await downloadGET(request, { params: { jobId: 'job-123' } })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toContain('Invalid API key')
    })

    it('AUTH-4: should require Bearer token format', async () => {
      mockSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/export/download/job-123', {
        headers: {
          authorization: 'Basic some-credentials' // Wrong format
        }
      })

      const response = await downloadGET(request, { params: { jobId: 'job-123' } })

      expect(response.status).toBe(401)
    })
  })

  describe('Rate Limiting', () => {
    it('RATE-1: should enforce rate limits on export creation', async () => {
      const userId = 'user-123'

      mockSession.mockResolvedValue({
        user: {
          id: userId,
          subscriptionTier: 'PROFESSIONAL'
        }
      })

      mockCheckRateLimit.mockResolvedValue({
        allowed: false,
        retryAfter: 30000 // 30 seconds
      })

      const { exportUsageTrackingService } = require('@/src/lib/export/usage-tracking-service')
      exportUsageTrackingService.canUserExport = jest.fn().mockResolvedValue({
        canExport: true,
        currentCount: 50,
        limit: 100
      })

      const request = new NextRequest('http://localhost/api/export/create', {
        method: 'POST',
        body: JSON.stringify({
          format: 'pdf',
          template: 'executive',
          dateRange: { start: '2018-01-01', end: '2018-06-30' }
        })
      })

      const response = await createPOST(request)

      expect(response.status).toBe(429)
      const body = await response.json()
      expect(body.error).toContain('rate limit')
      expect(body.retryAfter).toBe(30000)
    })
  })

  describe('Input Validation', () => {
    it('VALIDATE-1: should reject invalid export formats', async () => {
      mockSession.mockResolvedValue({
        user: {
          id: 'user-123',
          subscriptionTier: 'PROFESSIONAL'
        }
      })

      const request = new NextRequest('http://localhost/api/export/create', {
        method: 'POST',
        body: JSON.stringify({
          format: 'exe', // Invalid format
          template: 'executive',
          dateRange: { start: '2018-01-01', end: '2018-06-30' }
        })
      })

      const response = await createPOST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Invalid format')
    })

    it('VALIDATE-2: should reject invalid date ranges', async () => {
      mockSession.mockResolvedValue({
        user: {
          id: 'user-123',
          subscriptionTier: 'PROFESSIONAL'
        }
      })

      const request = new NextRequest('http://localhost/api/export/create', {
        method: 'POST',
        body: JSON.stringify({
          format: 'pdf',
          template: 'executive',
          dateRange: {
            start: '2018-06-30',
            end: '2018-01-01' // End before start
          }
        })
      })

      const response = await createPOST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Start date must be before end date')
    })

    it('VALIDATE-3: should enforce Bangkok dataset date boundaries', async () => {
      mockSession.mockResolvedValue({
        user: {
          id: 'user-123',
          subscriptionTier: 'PROFESSIONAL'
        }
      })

      const request = new NextRequest('http://localhost/api/export/create', {
        method: 'POST',
        body: JSON.stringify({
          format: 'pdf',
          template: 'executive',
          dateRange: {
            start: '2020-01-01', // Outside dataset range
            end: '2020-06-30'
          }
        })
      })

      const response = await createPOST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Bangkok study period')
    })
  })

  describe('Error Information Disclosure', () => {
    it('INFO-1: should not leak internal error details', async () => {
      mockSession.mockResolvedValue({
        user: {
          id: 'user-123',
          subscriptionTier: 'PROFESSIONAL'
        }
      })

      // Mock internal error
      const { ExportManager } = require('@/src/lib/export/export-manager')
      ExportManager.getInstance().getExportJob = jest.fn(() => {
        throw new Error('Internal database connection failed with credentials at /etc/db.conf')
      })

      const request = new NextRequest('http://localhost/api/export/status/job-123')
      const response = await statusGET(request, { params: { jobId: 'job-123' } })

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Internal server error')
      expect(body.error).not.toContain('database')
      expect(body.error).not.toContain('credentials')
      expect(body.error).not.toContain('/etc/')
    })
  })
})