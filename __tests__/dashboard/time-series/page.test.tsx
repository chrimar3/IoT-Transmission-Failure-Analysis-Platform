/**
 * Tests for Epic 2 Story 2.2: Interactive Time-Series Analytics
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import InteractiveTimeSeriesAnalytics from '../../../app/dashboard/time-series/page'

// Mock NextAuth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock Recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  Brush: () => <div />,
  ReferenceLine: () => <div />,
  ReferenceArea: () => <div />
}))

// Mock fetch
global.fetch = jest.fn()

describe('InteractiveTimeSeriesAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful API response
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          data: [],
          anomalies: [],
          statistics: [],
          seasonalPatterns: []
        }
      })
    })
  })

  describe('Authentication Requirements', () => {
    it('should show loading state during authentication', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn()
      })

      render(<InteractiveTimeSeriesAnalytics />)

      expect(screen.getByText('Loading Bangkok time-series data...')).toBeInTheDocument()
    })

    it('should redirect to signin when unauthenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn()
      })

      render(<InteractiveTimeSeriesAnalytics />)

      expect(screen.getByText('Authentication required to access time-series analytics')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    })

    it('should load time-series dashboard when authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Interactive Time-Series Analytics')).toBeInTheDocument()
      })
    })
  })

  describe('Time Range and Granularity Controls', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should display time range selector with day/week/month/all options', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        const dayButtons = screen.getAllByText('Day')
        expect(dayButtons.length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Week').length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('Month')).toBeInTheDocument()
        expect(screen.getByText('All')).toBeInTheDocument()
      })
    })

    it('should display granularity selector with hour/day/week options', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Hour')).toBeInTheDocument()
        const dayButtons = screen.getAllByText('Day')
        expect(dayButtons.length).toBeGreaterThan(0) // Day appears in both selectors
        const weekButtons = screen.getAllByText('Week')
        expect(weekButtons.length).toBeGreaterThan(0) // Week appears in both selectors
      })
    })

    it('should update selected time range when clicked', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        const allButton = screen.getByText('All')
        fireEvent.click(allButton)
        expect(allButton.closest('button')).toHaveClass('bg-blue-600')
      })
    })
  })

  describe('Sensor Selection', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should display all 5 sensor types for selection', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        // Use more specific selectors for sensor buttons
        expect(screen.getByRole('button', { name: /HVAC/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Lighting/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Power/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Security/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Elevators/ })).toBeInTheDocument()
      })
    })

    it('should toggle sensor visibility when clicked', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        const hvacButton = screen.getByRole('button', { name: /HVAC/ })
        expect(hvacButton).toHaveClass('bg-gray-900') // Initially enabled

        fireEvent.click(hvacButton)
        expect(hvacButton).toHaveClass('bg-gray-100') // Disabled after click
      })
    })

    it('should show anomaly toggle checkbox', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Show Anomalies/)).toBeInTheDocument()
      })
    })
  })

  describe('Professional Tier Export Features', () => {
    it('should show export buttons for Professional users', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('CSV')).toBeInTheDocument()
        expect(screen.getByText('PNG')).toBeInTheDocument()
        expect(screen.getByText('PDF')).toBeInTheDocument()
      })
    })

    it('should show export restriction for FREE tier users', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'free' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText(/Export requires Professional tier/)).toBeInTheDocument()
      })
    })

    it('should open upgrade modal when FREE user clicks export', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'free' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        const csvButton = screen.getByText('CSV')
        fireEvent.click(csvButton)
      })

      expect(screen.getByText('Upgrade to Professional')).toBeInTheDocument()
      expect(screen.getByText('Upgrade for €29/month')).toBeInTheDocument()
    })
  })

  describe('Chart Zoom Controls', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should display zoom in/out controls', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByTitle('Zoom In')).toBeInTheDocument()
        expect(screen.getByTitle('Zoom Out')).toBeInTheDocument()
        expect(screen.getByTitle('Reset Zoom')).toBeInTheDocument()
      })
    })

    it('should display zoom level percentage', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument()
      })
    })
  })

  describe('Statistics and Seasonal Patterns', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should display sensor statistics section', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Sensor Statistics')).toBeInTheDocument()
      })
    })

    it('should display seasonal patterns section', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Seasonal Patterns')).toBeInTheDocument()
      })
    })
  })

  describe('Bangkok Dataset Information', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should display Bangkok University dataset information', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText(/Bangkok University Dataset/)).toBeInTheDocument()
        expect(screen.getByText(/18-Month Study/)).toBeInTheDocument()
      })
    })

    it('should display 144 sensors information', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('144 sensors')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      })

      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText(/API Error/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
      })
    })

    it('should retry data fetch when retry button clicked', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      })

      // First call fails, second succeeds
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: {} })
        })

      render(<InteractiveTimeSeriesAnalytics />)

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/API Error/)).toBeInTheDocument()
      })

      // Click retry
      const retryButton = screen.getByRole('button', { name: 'Retry' })
      fireEvent.click(retryButton)

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText('Interactive Time-Series Analytics')).toBeInTheDocument()
      })

      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Performance Display', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should display data points loaded information', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText(/data points loaded/)).toBeInTheDocument()
      })
    })

    it('should fetch data from correct timeseries endpoint', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/readings/timeseries')
        )
      })
    })
  })

  describe('Anomaly Detection', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should include anomalies parameter in API call when enabled', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        const calls = (global.fetch as jest.Mock).mock.calls
        const lastCall = calls[calls.length - 1][0]
        expect(lastCall).toContain('anomalies=true')
      })
    })
  })
})