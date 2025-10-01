/**
 * Tests for Export Usage Tracking Service
 * Story 3.4: Data Export and Reporting
 */

import { ExportUsageTrackingService, getDefaultTierLimits } from '@/src/lib/export/usage-tracking-service'

// Mock Supabase with proper method chaining support
const mockRpc = jest.fn()
const mockFrom = jest.fn()
const mockInsert = jest.fn().mockReturnValue({ error: null })

// Create a chainable mock for update().eq()
const createUpdateChain = () => {
  const chain = {
    eq: jest.fn().mockReturnValue({ error: null })
  }
  return chain
}

// Create a chainable mock for select().eq().eq().single()
const createSelectChain = () => {
  const chain = {
    single: jest.fn().mockReturnValue({ data: null, error: null }),
    eq: jest.fn()
  }
  // Make eq() return the chain itself to support multiple .eq() calls
  chain.eq.mockReturnValue(chain)
  return chain
}

const mockUpdate = jest.fn(() => createUpdateChain())
const mockSelect = jest.fn(() => createSelectChain())

mockFrom.mockReturnValue({
  insert: mockInsert,
  update: mockUpdate,
  select: mockSelect
})

jest.mock('@/src/lib/supabase', () => ({
  createServiceClient: jest.fn(() => ({
    rpc: mockRpc,
    from: mockFrom
  }))
}))

describe('ExportUsageTrackingService', () => {
  let trackingService: ExportUsageTrackingService

  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockReset()
    mockFrom.mockReset()
    mockInsert.mockReset()
    mockUpdate.mockReset()
    mockSelect.mockReset()

    // Re-setup default mock behavior with proper chaining
    mockInsert.mockReturnValue({ error: null })
    mockUpdate.mockImplementation(() => createUpdateChain())
    mockSelect.mockImplementation(() => createSelectChain())

    mockFrom.mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect
    })

    trackingService = ExportUsageTrackingService.getInstance()
  })

  describe('canUserExport', () => {
    it('should allow export when under limit', async () => {
      mockRpc.mockResolvedValue({
        data: [{
          can_export: true,
          current_count: 50,
          limit_count: 100,
          percentage_used: 50.0,
          resets_at: new Date('2025-11-01').toISOString()
        }],
        error: null
      })

      const result = await trackingService.canUserExport('user123', 'PROFESSIONAL')

      expect(result.canExport).toBe(true)
      expect(result.currentCount).toBe(50)
      expect(result.limit).toBe(100)
      expect(result.percentageUsed).toBe(50.0)
    })

    it('should deny export when limit exceeded', async () => {
      mockRpc.mockResolvedValue({
        data: [{
          can_export: false,
          current_count: 100,
          limit_count: 100,
          percentage_used: 100.0,
          resets_at: new Date('2025-11-01').toISOString()
        }],
        error: null
      })

      const result = await trackingService.canUserExport('user123', 'PROFESSIONAL')

      expect(result.canExport).toBe(false)
      expect(result.currentCount).toBe(100)
      expect(result.limit).toBe(100)
      expect(result.message).toContain('Export limit reached')
    })

    it('should allow unlimited exports for ENTERPRISE tier', async () => {
      mockRpc.mockResolvedValue({
        data: [{
          can_export: true,
          current_count: 0,
          limit_count: -1,
          percentage_used: 0.0,
          resets_at: new Date('2025-11-01').toISOString()
        }],
        error: null
      })

      const result = await trackingService.canUserExport('user123', 'ENTERPRISE')

      expect(result.canExport).toBe(true)
      expect(result.limit).toBe(-1)
    })

    it('should handle database errors gracefully', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      const result = await trackingService.canUserExport('user123', 'PROFESSIONAL')

      expect(result.canExport).toBe(false)
      expect(result.message).toContain('Unable to verify export quota')
    })
  })

  describe('recordExportJob', () => {
    it('should record export job successfully', async () => {
      mockFrom().insert.mockReturnValue({ error: null })

      const result = await trackingService.recordExportJob(
        'job123',
        'user123',
        'pdf',
        { template: 'executive', dateRange: {} },
        'PROFESSIONAL'
      )

      expect(result).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('export_jobs')
      expect(mockFrom().insert).toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      mockFrom().insert.mockReturnValue({
        error: { message: 'Insert failed' }
      })

      const result = await trackingService.recordExportJob(
        'job123',
        'user123',
        'pdf',
        {},
        'PROFESSIONAL'
      )

      expect(result).toBe(false)
    })
  })

  describe('updateExportJobStatus', () => {
    it('should update job status successfully', async () => {
      // No need to mock here, the default chain should work
      const result = await trackingService.updateExportJobStatus('job123', 'completed', {
        progressPercent: 100,
        fileUrl: 'https://example.com/file.pdf'
      })

      expect(result).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('export_jobs')
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('should automatically set completedAt for completed status', async () => {
      await trackingService.updateExportJobStatus('job123', 'completed', {})

      // Should have called update with completed_at
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  describe('getUserExportStats', () => {
    it('should return export statistics for user', async () => {
      const mockStats = [
        { month_year: '2025-10', export_count: 50, total_file_size_mb: 250.5, tier: 'PROFESSIONAL' },
        { month_year: '2025-09', export_count: 45, total_file_size_mb: 200.0, tier: 'PROFESSIONAL' }
      ]

      mockRpc.mockResolvedValue({
        data: mockStats,
        error: null
      })

      const result = await trackingService.getUserExportStats('user123')

      expect(result).toHaveLength(2)
      expect(result[0].monthYear).toBe('2025-10')
      expect(result[0].exportCount).toBe(50)
      expect(result[0].totalFileSizeMb).toBe(250.5)
    })

    it('should return empty array on error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' }
      })

      const result = await trackingService.getUserExportStats('user123')

      expect(result).toEqual([])
    })
  })

  describe('getTierLimits', () => {
    it('should return tier limits for PROFESSIONAL', async () => {
      const mockLimits = {
        tier: 'PROFESSIONAL',
        exports_per_month: 100,
        max_file_size_mb: 50,
        max_recipients_per_email: 10,
        scheduled_reports_limit: 10,
        share_links_per_month: 50,
        formats_allowed: ['csv', 'excel', 'pdf'],
        features_enabled: ['basic_export', 'excel_export', 'pdf_export']
      }

      // Create a custom chain for this test with resolved data
      const customChain = createSelectChain()
      customChain.single.mockResolvedValue({
        data: mockLimits,
        error: null
      })
      mockSelect.mockReturnValue(customChain)

      const result = await trackingService.getTierLimits('PROFESSIONAL')

      expect(result).toBeDefined()
      expect(result?.tier).toBe('PROFESSIONAL')
      expect(result?.exports_per_month).toBe(100)
    })

    it('should return null for invalid tier', async () => {
      // Create a custom chain for this test with error
      const customChain = createSelectChain()
      customChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      })
      mockSelect.mockReturnValue(customChain)

      const result = await trackingService.getTierLimits('INVALID')

      expect(result).toBeNull()
    })
  })

  describe('isFormatAllowed', () => {
    it('should return true for allowed format', async () => {
      const mockLimits = {
        tier: 'PROFESSIONAL',
        formats_allowed: ['csv', 'excel', 'pdf']
      }

      // Create a custom chain for this test
      const customChain = createSelectChain()
      customChain.single.mockResolvedValue({
        data: mockLimits,
        error: null
      })
      mockSelect.mockReturnValue(customChain)

      const result = await trackingService.isFormatAllowed('PROFESSIONAL', 'pdf')

      expect(result).toBe(true)
    })

    it('should return false for disallowed format', async () => {
      const mockLimits = {
        tier: 'FREE',
        formats_allowed: ['csv']
      }

      // Create a custom chain for this test
      const customChain = createSelectChain()
      customChain.single.mockResolvedValue({
        data: mockLimits,
        error: null
      })
      mockSelect.mockReturnValue(customChain)

      const result = await trackingService.isFormatAllowed('FREE', 'pdf')

      expect(result).toBe(false)
    })
  })

  describe('getCurrentMonthUsage', () => {
    it('should return current month usage', async () => {
      const mockUsage = {
        export_count: 25,
        total_file_size: 100 * 1024 * 1024, // 100MB in bytes
        tier: 'PROFESSIONAL'
      }

      // Create a custom chain with proper data
      const customChain = createSelectChain()
      customChain.single.mockResolvedValue({
        data: mockUsage,
        error: null
      })
      mockSelect.mockReturnValue(customChain)

      const result = await trackingService.getCurrentMonthUsage('user123')

      expect(result).toBeDefined()
      expect(result?.exportCount).toBe(25)
      expect(result?.totalFileSizeMb).toBe(100)
      expect(result?.tier).toBe('PROFESSIONAL')
    })

    it('should return zero usage for new user', async () => {
      // Create a custom chain with error (no usage found)
      const customChain = createSelectChain()
      customChain.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      })
      mockSelect.mockReturnValue(customChain)

      const result = await trackingService.getCurrentMonthUsage('user123')

      expect(result).toBeDefined()
      expect(result?.exportCount).toBe(0)
      expect(result?.totalFileSizeMb).toBe(0)
    })
  })

  describe('getDefaultTierLimits', () => {
    it('should return correct limits for FREE tier', () => {
      const limits = getDefaultTierLimits('FREE')

      expect(limits.tier).toBe('FREE')
      expect(limits.exports_per_month).toBe(5)
      expect(limits.formats_allowed).toEqual(['csv'])
    })

    it('should return correct limits for PROFESSIONAL tier', () => {
      const limits = getDefaultTierLimits('PROFESSIONAL')

      expect(limits.tier).toBe('PROFESSIONAL')
      expect(limits.exports_per_month).toBe(100)
      expect(limits.formats_allowed).toEqual(['csv', 'excel', 'pdf'])
    })

    it('should return correct limits for ENTERPRISE tier', () => {
      const limits = getDefaultTierLimits('ENTERPRISE')

      expect(limits.tier).toBe('ENTERPRISE')
      expect(limits.exports_per_month).toBe(-1) // Unlimited
      expect(limits.formats_allowed).toEqual(['csv', 'excel', 'pdf'])
    })

    it('should default to PROFESSIONAL for unknown tier', () => {
      const limits = getDefaultTierLimits('UNKNOWN')

      expect(limits.tier).toBe('PROFESSIONAL')
      expect(limits.exports_per_month).toBe(100)
    })
  })
})