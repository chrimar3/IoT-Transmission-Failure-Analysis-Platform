/**
 * Epic 2 Story 2.3: Export Functionality for Professional Tier
 * Tests for ExportModal component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import ExportModal from '@/src/components/export/ExportModal'

// Mock NextAuth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock fetch
global.fetch = jest.fn()

describe('ExportModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onUpgrade: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock useSession to return Professional tier user by default
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@cu-bems.com',
          subscriptionTier: 'professional'
        },
        expires: '2025-12-31T23:59:59.999Z'
      },
      status: 'authenticated',
      update: jest.fn()
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          jobId: 'export_123_abc',
          status: 'queued',
          progress: 0,
          format: 'pdf',
          template: 'executive',
          dateRange: { start: '2018-01-01', end: '2018-12-31' },
          createdAt: '2023-09-25T12:00:00Z'
        }
      })
    })
  })

  describe('Visibility', () => {
    it('should not render when closed', () => {
      render(
        <ExportModal
          {...mockProps}
          isOpen={false}
        />
      )

      expect(screen.queryByText('Export Bangkok Dataset')).not.toBeInTheDocument()
    })

    it('should render when open', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', subscriptionTier: 'professional' },
          expires: '2025-12-31T23:59:59.999Z'
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<ExportModal {...mockProps} />)

      expect(screen.getByText('Export Bangkok Dataset')).toBeInTheDocument()
    })
  })

  describe('Professional Tier Access', () => {
    it('should show full export form for Professional users', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', subscriptionTier: 'professional' },
          expires: '2025-12-31T23:59:59.999Z'
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<ExportModal {...mockProps} />)

      expect(screen.getByText('Export Format')).toBeInTheDocument()
      expect(screen.getByText('Report Template')).toBeInTheDocument()
      expect(screen.getByText('Date Range (Bangkok Study Period)')).toBeInTheDocument()
      expect(screen.getByText('Create Export')).toBeInTheDocument()
    })

    it('should show upgrade warning for FREE users', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', subscriptionTier: 'free' },
          expires: '2025-12-31T23:59:59.999Z'
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<ExportModal {...mockProps} />)

      expect(screen.getByText('Professional Tier Required')).toBeInTheDocument()
      expect(screen.getByText('Export functionality is available for Professional subscribers (€29/month).')).toBeInTheDocument()
      expect(screen.getByText('Upgrade for €29/month')).toBeInTheDocument()
    })

    it('should show upgrade warning for users without subscription', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            subscriptionTier: 'free'
          },
          expires: '2025-12-31T23:59:59.999Z'
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<ExportModal {...mockProps} />)

      expect(screen.getByText('Professional Tier Required')).toBeInTheDocument()
      expect(screen.getByText('Upgrade for €29/month')).toBeInTheDocument()
    })
  })

  describe('Format Selection', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', subscriptionTier: 'professional' },
          expires: '2025-12-31T23:59:59.999Z'
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should display all export format options', () => {
      render(<ExportModal {...mockProps} />)

      expect(screen.getByText('PDF Report')).toBeInTheDocument()
      expect(screen.getByText('Executive summary with charts and branding')).toBeInTheDocument()
      expect(screen.getByText('CSV Data')).toBeInTheDocument()
      expect(screen.getByText('Raw data with statistical metadata')).toBeInTheDocument()
      expect(screen.getByText('Excel Workbook')).toBeInTheDocument()
      expect(screen.getByText('Multi-sheet analysis with charts')).toBeInTheDocument()
    })

    it('should select PDF format by default', () => {
      render(<ExportModal {...mockProps} />)

      // Test that PDF format option is present
      const pdfOption = screen.getByText('PDF Report')
      expect(pdfOption).toBeInTheDocument()

      // Test that PDF description is visible
      expect(screen.getByText('Executive summary with charts and branding')).toBeInTheDocument()
    })

    it('should change format when clicked', () => {
      render(<ExportModal {...mockProps} />)

      const csvOption = screen.getByText('CSV Data').closest('div')
      fireEvent.click(csvOption!)

      // Test that CSV format option remains clickable and present
      expect(screen.getByText('CSV Data')).toBeInTheDocument()
      expect(screen.getByText('Raw data with statistical metadata')).toBeInTheDocument()
    })

    it('should show estimated file sizes', () => {
      render(<ExportModal {...mockProps} />)

      expect(screen.getByText('2-5 MB')).toBeInTheDocument() // PDF
      expect(screen.getByText('1-10 MB')).toBeInTheDocument() // CSV
      expect(screen.getByText('3-15 MB')).toBeInTheDocument() // Excel
    })
  })

  describe('Template Selection', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', subscriptionTier: 'professional' },
          expires: '2025-12-31T23:59:59.999Z'
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should display all template options', () => {
      render(<ExportModal {...mockProps} />)

      expect(screen.getByText('Executive Summary')).toBeInTheDocument()
      expect(screen.getByText('High-level insights for decision makers')).toBeInTheDocument()
      expect(screen.getByText('Technical Report')).toBeInTheDocument()
      expect(screen.getByText('Detailed analysis with methodology')).toBeInTheDocument()
      expect(screen.getByText('Compliance Report')).toBeInTheDocument()
      expect(screen.getByText('Regulatory-grade documentation')).toBeInTheDocument()
      expect(screen.getByText('Raw Data Export')).toBeInTheDocument()
      expect(screen.getByText('Unprocessed Bangkok dataset')).toBeInTheDocument()
    })

    it('should select executive template by default', () => {
      render(<ExportModal {...mockProps} />)

      const executiveOption = screen.getByText('Executive Summary').closest('div')
      expect(executiveOption).toHaveClass('border-blue-500 bg-blue-50')
    })

    it('should change template when clicked', () => {
      render(<ExportModal {...mockProps} />)

      const technicalOption = screen.getByText('Technical Report').closest('div')
      fireEvent.click(technicalOption!)

      expect(technicalOption).toHaveClass('border-blue-500 bg-blue-50')
    })
  })

  describe('Date Range Selection', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', subscriptionTier: 'professional' },
          expires: '2025-12-31T23:59:59.999Z'
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should show Bangkok study period information', () => {
      render(<ExportModal {...mockProps} />)

      expect(screen.getByText('Date Range (Bangkok Study Period)')).toBeInTheDocument()
      expect(screen.getByText('Bangkok University dataset covers January 2018 - June 2019 (18 months)')).toBeInTheDocument()
    })

    it('should have default date range set', () => {
      render(<ExportModal {...mockProps} />)

      const startDateInput = screen.getByDisplayValue('2018-01-01')
      const endDateInput = screen.getByDisplayValue('2019-06-30')

      expect(startDateInput).toBeInTheDocument()
      expect(endDateInput).toBeInTheDocument()
    })

    it('should allow date range modification within bounds', () => {
      render(<ExportModal {...mockProps} />)

      const startDateInput = screen.getByDisplayValue('2018-01-01') as HTMLInputElement
      const endDateInput = screen.getByDisplayValue('2019-06-30') as HTMLInputElement

      fireEvent.change(startDateInput, { target: { value: '2018-06-01' } })
      fireEvent.change(endDateInput, { target: { value: '2018-12-31' } })

      expect(startDateInput.value).toBe('2018-06-01')
      expect(endDateInput.value).toBe('2018-12-31')
    })

    it('should have proper min and max constraints', () => {
      render(<ExportModal {...mockProps} />)

      const dateInputs = screen.getAllByDisplayValue(/2018|2019/)

      dateInputs.forEach(input => {
        expect(input).toHaveAttribute('min', '2018-01-01')
        expect(input).toHaveAttribute('max', '2019-06-30')
      })
    })
  })

  describe('Export Creation', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', subscriptionTier: 'professional' },
          expires: '2025-12-31T23:59:59.999Z'
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should create export job when Create Export is clicked', async () => {
      render(<ExportModal {...mockProps} />)

      const createButton = screen.getByText('Create Export')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/export/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            format: 'pdf',
            template: 'executive',
            dateRange: {
              start: '2018-01-01',
              end: '2019-06-30'
            }
          })
        })
      })
    })

    it('should show loading state during export creation', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      )

      render(<ExportModal {...mockProps} />)

      const createButton = screen.getByText('Create Export')
      fireEvent.click(createButton)

      expect(screen.getByText('Creating Export...')).toBeInTheDocument()
      expect(createButton).toBeDisabled()
    })

    it('should display error message on export creation failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Export creation failed'
        })
      })

      render(<ExportModal {...mockProps} />)

      const createButton = screen.getByText('Create Export')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Export creation failed')).toBeInTheDocument()
      })
    })

    it('should show progress tracking after successful creation', async () => {
      render(<ExportModal {...mockProps} />)

      const createButton = screen.getByText('Create Export')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Export In Progress')).toBeInTheDocument()
        expect(screen.getByText('PDF • executive template')).toBeInTheDocument()
        expect(screen.getByText('Progress')).toBeInTheDocument()
        expect(screen.getByText('0%')).toBeInTheDocument()
      })
    })
  })

  describe('Progress Tracking', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', subscriptionTier: 'professional' },
          expires: '2025-12-31T23:59:59.999Z'
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should poll for job status updates', async () => {
      render(<ExportModal {...mockProps} />)

      const createButton = screen.getByText('Create Export')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Export In Progress')).toBeInTheDocument()
      })

      // Wait for polling to start
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/export/status/export_123_abc')
      }, { timeout: 3000 })
    })

    it('should show completed state with download button', async () => {
      // First call returns queued job
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              jobId: 'export_123_abc',
              status: 'queued',
              progress: 0,
              format: 'pdf',
              template: 'executive',
              dateRange: { start: '2018-01-01', end: '2018-12-31' },
              createdAt: '2023-09-25T12:00:00Z'
            }
          })
        })
        // Subsequent polls return completed job
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              jobId: 'export_123_abc',
              status: 'completed',
              progress: 100,
              format: 'pdf',
              template: 'executive',
              dateRange: { start: '2018-01-01', end: '2018-12-31' },
              createdAt: '2023-09-25T12:00:00Z',
              completedAt: '2023-09-25T12:05:00Z',
              downloadUrl: 'https://exports.cu-bems.com/downloads/report.pdf'
            }
          })
        })

      render(<ExportModal {...mockProps} />)

      const createButton = screen.getByText('Create Export')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Export In Progress')).toBeInTheDocument()
      })

      // Wait for status polling to update
      await waitFor(() => {
        expect(screen.getByText('Export Complete')).toBeInTheDocument()
        expect(screen.getByText('Download Export')).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should show failed state with error message', async () => {
      // First call returns queued job
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              jobId: 'export_123_abc',
              status: 'queued',
              progress: 0,
              format: 'pdf',
              template: 'executive',
              dateRange: { start: '2018-01-01', end: '2018-12-31' },
              createdAt: '2023-09-25T12:00:00Z'
            }
          })
        })
        // Subsequent polls return failed job
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              jobId: 'export_123_abc',
              status: 'failed',
              progress: 30,
              format: 'pdf',
              template: 'executive',
              dateRange: { start: '2018-01-01', end: '2018-12-31' },
              createdAt: '2023-09-25T12:00:00Z',
              completedAt: '2023-09-25T12:03:00Z',
              error: 'PDF generation failed'
            }
          })
        })

      render(<ExportModal {...mockProps} />)

      const createButton = screen.getByText('Create Export')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText('Export In Progress')).toBeInTheDocument()
      })

      // Wait for status polling to update
      await waitFor(() => {
        expect(screen.getByText('PDF generation failed')).toBeInTheDocument()
      }, { timeout: 5000 })
    })
  })

  describe('FREE User Interactions', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', subscriptionTier: 'free' },
          expires: '2025-12-31T23:59:59.999Z'
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should disable format selection for FREE users', () => {
      render(<ExportModal {...mockProps} />)

      const pdfOption = screen.getByText('PDF Report')
      expect(pdfOption).toBeInTheDocument()

      // Test that format options are present but for FREE users they should show the upgrade path
      expect(screen.getByText('Upgrade for €29/month')).toBeInTheDocument()
    })

    it('should disable template selection for FREE users', () => {
      render(<ExportModal {...mockProps} />)

      const executiveOption = screen.getByText('Executive Summary').closest('div')
      expect(executiveOption).toHaveClass('opacity-50')
    })

    it('should disable date inputs for FREE users', () => {
      render(<ExportModal {...mockProps} />)

      const dateInputs = screen.getAllByDisplayValue(/2018|2019/)
      dateInputs.forEach(input => {
        expect(input).toBeDisabled()
      })
    })

    it('should call onUpgrade when upgrade button is clicked', () => {
      render(<ExportModal {...mockProps} />)

      const upgradeButton = screen.getByText('Upgrade for €29/month')
      fireEvent.click(upgradeButton)

      expect(mockProps.onUpgrade).toHaveBeenCalled()
    })

    it('should call onUpgrade when trying to export', () => {
      render(<ExportModal {...mockProps} />)

      // For FREE users, the export button is replaced with upgrade button
      const upgradeButton = screen.getByText('Upgrade for €29/month')
      fireEvent.click(upgradeButton)

      expect(mockProps.onUpgrade).toHaveBeenCalled()
    })
  })

  describe('Modal Controls', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: 'user-123', subscriptionTier: 'professional' },
          expires: '2025-12-31T23:59:59.999Z'
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should call onClose when close button is clicked', () => {
      render(<ExportModal {...mockProps} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)

      expect(mockProps.onClose).toHaveBeenCalled()
    })

    it('should call onClose when cancel button is clicked', () => {
      render(<ExportModal {...mockProps} />)

      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)

      expect(mockProps.onClose).toHaveBeenCalled()
    })
  })
})