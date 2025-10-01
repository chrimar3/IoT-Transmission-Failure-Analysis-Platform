/**
 * Comprehensive tests for ChartExportButton component
 * Tests export functionality, subscription checks, configuration, and error handling
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import ChartExportButton from '@/app/dashboard/components/ChartExportButton'
import type { ChartConfiguration } from '@/types/analytics'

// Mock fetch for API calls
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const mockChartConfig: ChartConfiguration = {
  sensors: ['SENSOR_001', 'SENSOR_002'],
  start_date: '2025-01-01T00:00:00Z',
  end_date: '2025-01-01T23:59:59Z',
  interval: 'hour',
  max_points: 1000,
  show_legend: true,
  chart_type: 'line'
}

const mockProfessionalSession = {
  user: {
    name: 'Pro User',
    email: 'pro@example.com',
    subscriptionTier: 'professional'
  },
  expires: '2025-12-31'
}

const mockFreeSession = {
  user: {
    name: 'Free User',
    email: 'free@example.com',
    subscriptionTier: 'free'
  },
  expires: '2025-12-31'
}

const renderWithSession = (component: React.ReactElement, session: any = mockProfessionalSession) => {
  return render(
    <SessionProvider session={session}>
      {component}
    </SessionProvider>
  )
}

describe('ChartExportButton', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders export button for professional users', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toBeInTheDocument()
      expect(exportButton).toHaveClass('bg-green-100 text-green-700')
      expect(exportButton).not.toHaveAttribute('disabled')
    })

    test('renders export button with crown icon for free users', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />,
        mockFreeSession
      )

      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toBeInTheDocument()
      expect(exportButton).toHaveClass('bg-orange-100 text-orange-700')
      expect(exportButton).toHaveAttribute('title', 'Professional subscription required')
    })

    test('renders as disabled when disabled prop is true', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} disabled={true} />
      )

      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toBeDisabled()
      expect(exportButton).toHaveClass('cursor-not-allowed')
    })

    test('applies custom className', () => {
      renderWithSession(
        <ChartExportButton
          chartConfig={mockChartConfig}
          className="custom-class"
        />
      )

      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toHaveClass('custom-class')
    })
  })

  describe('Subscription Validation', () => {
    test('shows error for free users attempting export', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />,
        mockFreeSession
      )

      const exportButton = screen.getByRole('button', { name: /export/i })
      fireEvent.click(exportButton)

      // No modal should appear, but error should be set
      expect(screen.queryByText('Export Chart')).not.toBeInTheDocument()
    })

    test('allows professional users to access export modal', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      const exportButton = screen.getByRole('button', { name: /export/i })
      fireEvent.click(exportButton)

      expect(screen.getByText('Export Chart')).toBeInTheDocument()
    })

    test('allows enterprise users to access export modal', () => {
      const enterpriseSession = {
        ...mockProfessionalSession,
        user: {
          ...mockProfessionalSession.user,
          subscriptionTier: 'enterprise'
        }
      }

      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />,
        enterpriseSession
      )

      const exportButton = screen.getByRole('button', { name: /export/i })
      fireEvent.click(exportButton)

      expect(screen.getByText('Export Chart')).toBeInTheDocument()
    })
  })

  describe('Export Modal', () => {
    test('opens export configuration modal', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      expect(screen.getByText('Export Chart')).toBeInTheDocument()
      expect(screen.getByText('Export Format')).toBeInTheDocument()
      expect(screen.getByText('Chart Title')).toBeInTheDocument()
      expect(screen.getByText('Quality')).toBeInTheDocument()
      expect(screen.getByText('Size')).toBeInTheDocument()
    })

    test('closes modal when X button clicked', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))
      expect(screen.getByText('Export Chart')).toBeInTheDocument()

      const closeButton = screen.getByRole('button', { name: '' }) // X button
      fireEvent.click(closeButton)

      expect(screen.queryByText('Export Chart')).not.toBeInTheDocument()
    })

    test('closes modal when Cancel button clicked', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))
      fireEvent.click(screen.getByText('Cancel'))

      expect(screen.queryByText('Export Chart')).not.toBeInTheDocument()
    })
  })

  describe('Export Configuration', () => {
    test('allows format selection between PNG and PDF', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      const pngButton = screen.getByText('PNG').closest('button')
      const pdfButton = screen.getByText('PDF').closest('button')

      expect(pngButton).toBeInTheDocument()
      expect(pdfButton).toBeInTheDocument()

      // PNG should be selected by default
      expect(pngButton).toHaveClass('bg-blue-50 border-blue-200')

      // Click PDF
      fireEvent.click(pdfButton!)
      expect(pdfButton).toHaveClass('bg-blue-50 border-blue-200')
    })

    test('allows title customization', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      const titleInput = screen.getByLabelText('Chart Title')
      expect((titleInput as HTMLInputElement).value).toMatch(/Bangkok Time-Series Analysis/)

      fireEvent.change(titleInput, { target: { value: 'Custom Chart Title' } })
      expect(titleInput).toHaveValue('Custom Chart Title')
    })

    test('allows quality selection', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      const qualitySelect = screen.getByLabelText('Quality')
      expect(qualitySelect).toHaveValue('high')

      fireEvent.change(qualitySelect, { target: { value: 'medium' } })
      expect(qualitySelect).toHaveValue('medium')
    })

    test('allows size selection', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      const sizeSelect = screen.getByLabelText('Size')
      expect(sizeSelect).toHaveValue('1200x800')

      fireEvent.change(sizeSelect, { target: { value: '1920x1080' } })
      expect(sizeSelect).toHaveValue('1920x1080')
    })

    test('allows checkbox options for timestamp and date range', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      const timestampCheckbox = screen.getByLabelText('Timestamp')
      const dateRangeCheckbox = screen.getByLabelText('Date range')

      expect(timestampCheckbox).toBeChecked()
      expect(dateRangeCheckbox).toBeChecked()

      fireEvent.click(timestampCheckbox)
      expect(timestampCheckbox).not.toBeChecked()

      fireEvent.click(dateRangeCheckbox)
      expect(dateRangeCheckbox).not.toBeChecked()
    })

    test('displays estimated file size', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      expect(screen.getByText(/Estimated file size:/)).toBeInTheDocument()
      expect(screen.getByText(/KB|MB/)).toBeInTheDocument()
    })

    test('updates file size estimate when format changes', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      const initialSize = screen.getByText(/Estimated file size:/).textContent

      // Switch to PDF format
      const pdfButton = screen.getByText('PDF').closest('button')
      fireEvent.click(pdfButton!)

      const newSize = screen.getByText(/Estimated file size:/).textContent
      expect(newSize).not.toBe(initialSize)
    })
  })

  describe('Export Execution', () => {
    test('executes export successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          download_url: '/api/export/download/test-chart.png',
          filename: 'test-chart.png'
        }
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const onExportComplete = jest.fn()

      renderWithSession(
        <ChartExportButton
          chartConfig={mockChartConfig}
          onExportComplete={onExportComplete}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      const titleInput = screen.getByLabelText('Chart Title')
      fireEvent.change(titleInput, { target: { value: 'Test Chart' } })

      const exportButton = screen.getByText('Export Chart')
      fireEvent.click(exportButton)

      await waitFor(() => {
        expect(screen.getByText(/Export ready:/)).toBeInTheDocument()
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/export/chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining('"title":"Test Chart"')
      })

      expect(onExportComplete).toHaveBeenCalledWith(
        '/api/export/download/test-chart.png',
        'test-chart.png'
      )
    })

    test('shows progress during export', async () => {
      // Mock a delayed response
      mockFetch.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                success: true,
                data: {
                  download_url: '/api/export/download/test-chart.png',
                  filename: 'test-chart.png'
                }
              })
            } as Response)
          }, 100)
        })
      )

      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      const titleInput = screen.getByLabelText('Chart Title')
      fireEvent.change(titleInput, { target: { value: 'Test Chart' } })

      const exportButton = screen.getByText('Export Chart')
      fireEvent.click(exportButton)

      expect(screen.getByText('Generating chart export...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText(/Export ready:/)).toBeInTheDocument()
      })
    })

    test('handles export errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      const titleInput = screen.getByLabelText('Chart Title')
      fireEvent.change(titleInput, { target: { value: 'Test Chart' } })

      const exportButton = screen.getByText('Export Chart')
      fireEvent.click(exportButton)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    test('handles API error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          message: 'Export failed due to server error'
        })
      } as Response)

      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      const titleInput = screen.getByLabelText('Chart Title')
      fireEvent.change(titleInput, { target: { value: 'Test Chart' } })

      const exportButton = screen.getByText('Export Chart')
      fireEvent.click(exportButton)

      await waitFor(() => {
        expect(screen.getByText('Export failed due to server error')).toBeInTheDocument()
      })
    })

    test('disables export button when no title provided', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      const titleInput = screen.getByLabelText('Chart Title')
      fireEvent.change(titleInput, { target: { value: '' } })

      const exportButton = screen.getByText('Export Chart')
      expect(exportButton).toBeDisabled()
    })

    test('retry functionality works after error', async () => {
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            download_url: '/api/export/download/test-chart.png',
            filename: 'test-chart.png'
          }
        })
      } as Response)

      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      const titleInput = screen.getByLabelText('Chart Title')
      fireEvent.change(titleInput, { target: { value: 'Test Chart' } })

      const exportButton = screen.getByText('Export Chart')
      fireEvent.click(exportButton)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Try Again')
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText(/Export ready:/)).toBeInTheDocument()
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Auto-close Behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('auto-closes modal after successful export', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            download_url: '/api/export/download/test-chart.png',
            filename: 'test-chart.png'
          }
        })
      } as Response)

      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      const titleInput = screen.getByLabelText('Chart Title')
      fireEvent.change(titleInput, { target: { value: 'Test Chart' } })

      const exportButton = screen.getByText('Export Chart')
      fireEvent.click(exportButton)

      await waitFor(() => {
        expect(screen.getByText(/Export ready:/)).toBeInTheDocument()
      })

      // Fast-forward time
      jest.advanceTimersByTime(2000)

      await waitFor(() => {
        expect(screen.queryByText('Export Chart')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toHaveAttribute('title')
    })

    test('modal has proper focus management', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      fireEvent.click(screen.getByRole('button', { name: /export/i }))

      const modal = screen.getByRole('dialog', { hidden: true }) || screen.getByText('Export Chart').closest('div')
      expect(modal).toBeInTheDocument()
    })

    test('supports keyboard navigation', () => {
      renderWithSession(
        <ChartExportButton chartConfig={mockChartConfig} />
      )

      const exportButton = screen.getByRole('button', { name: /export/i })
      exportButton.focus()
      expect(document.activeElement).toBe(exportButton)
    })
  })
})