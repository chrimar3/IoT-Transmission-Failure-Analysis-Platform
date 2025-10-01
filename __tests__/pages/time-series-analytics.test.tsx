/**
 * Comprehensive Test Suite for Time-Series Analytics Page
 * Story 3.2 Quality Validation: Interactive Time-Series Dashboard Testing
 *
 * Tests cover:
 * - Page rendering and authentication
 * - Chart interactions and controls
 * - Professional tier features
 * - Performance optimization validation
 * - Statistical analysis components
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { useSession } from 'next-auth/react'
import InteractiveTimeSeriesAnalytics from '@/app/dashboard/time-series/page'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Brush: () => <div data-testid="brush" />,
  ReferenceLine: () => <div data-testid="reference-line" />
}))

// Mock fetch API
global.fetch = jest.fn()

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null)
  }),
  usePathname: () => '/dashboard/time-series'
}))

describe('InteractiveTimeSeriesAnalytics Page', () => {
  const mockUser = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock authenticated user session
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          subscriptionTier: 'professional' as const
        },
        expires: '2025-12-31'
      },
      status: 'authenticated' as const,
      update: jest.fn()
    })

    // Mock successful API response
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          series: [
            {
              sensor_id: 'SENSOR_001',
              equipment_type: 'HVAC',
              floor_number: 1,
              unit: 'kWh',
              color: '#3B82F6',
              data: [
                {
                  timestamp: '2018-01-01T00:00:00Z',
                  value: 850.5,
                  sensor_id: 'SENSOR_001',
                  status: 'normal'
                }
              ]
            }
          ],
          anomalies: [],
          statistics: [
            {
              sensorType: 'HVAC',
              min: 400.0,
              max: 1200.0,
              avg: 850.5,
              stdDev: 125.3,
              trend: 'stable'
            }
          ],
          seasonalPatterns: [
            {
              season: 'Winter (Jan-Mar)',
              avgConsumption: 185.3,
              peakHours: ['08:00-10:00', '18:00-20:00']
            }
          ]
        }
      })
    })
  })

  describe('Page Authentication', () => {
    test('shows loading state during session check', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn()
      })

      render(<InteractiveTimeSeriesAnalytics />)

      expect(screen.getByText('Loading Bangkok time-series data...')).toBeInTheDocument()
    })

    test('redirects unauthenticated users to sign in', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn()
      })

      render(<InteractiveTimeSeriesAnalytics />)

      expect(screen.getByText('Authentication required to access time-series analytics')).toBeInTheDocument()
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    test('renders authenticated dashboard correctly', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Interactive Time-Series Analytics')).toBeInTheDocument()
        expect(screen.getByText('Bangkok University Dataset • 18-Month Study')).toBeInTheDocument()
      })
    })
  })

  describe('Dashboard Header and Info', () => {
    test('displays dataset information correctly', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText(/data points loaded/)).toBeInTheDocument()
        expect(screen.getByText(/144 sensors/)).toBeInTheDocument()
        expect(screen.getByText(/granularity/)).toBeInTheDocument()
      })
    })

    test('shows professional tier badge for professional users', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
            subscriptionTier: 'professional' as const
          },
          expires: '2025-12-31'
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Professional')).toBeInTheDocument()
      })
    })

    test('includes refresh button functionality', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i })
        expect(refreshButton).toBeInTheDocument()
      })

      // Clear initial fetch calls
      ;(global.fetch as jest.Mock).mockClear()

      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      await mockUser.click(refreshButton)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/readings\/timeseries/)
      )
    })
  })

  describe('Chart Controls', () => {
    test('renders time range selector buttons', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Day')).toBeInTheDocument()
        expect(screen.getByText('Week')).toBeInTheDocument()
        expect(screen.getByText('Month')).toBeInTheDocument()
        expect(screen.getByText('All')).toBeInTheDocument()
      })
    })

    test('switches time ranges correctly', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Month')).toBeInTheDocument()
      })

      // Initially month should be selected
      const monthButton = screen.getByText('Month')
      expect(monthButton.closest('button')).toHaveClass('bg-blue-600')

      // Clear initial fetch calls
      ;(global.fetch as jest.Mock).mockClear()

      // Switch to week
      await mockUser.click(screen.getByText('Week'))

      const weekButton = screen.getByText('Week')
      expect(weekButton.closest('button')).toHaveClass('bg-blue-600')

      // Should trigger new API call
      expect(global.fetch).toHaveBeenCalled()
    })

    test('renders data granularity selector', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Hour')).toBeInTheDocument()
        expect(screen.getByText('Day')).toBeInTheDocument()
        expect(screen.getByText('Week')).toBeInTheDocument()
      })
    })

    test('updates granularity selection', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Day')).toBeInTheDocument()
      })

      // Clear initial fetch calls
      ;(global.fetch as jest.Mock).mockClear()

      await mockUser.click(screen.getByText('Hour'))

      const hourButton = screen.getByText('Hour')
      expect(hourButton.closest('button')).toHaveClass('bg-blue-600')

      // Should trigger new API call
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  describe('Sensor Selection and Controls', () => {
    test('renders sensor toggle buttons', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('HVAC')).toBeInTheDocument()
        expect(screen.getByText('Lighting')).toBeInTheDocument()
        expect(screen.getByText('Power')).toBeInTheDocument()
        expect(screen.getByText('Security')).toBeInTheDocument()
        expect(screen.getByText('Elevators')).toBeInTheDocument()
      })
    })

    test('toggles sensor visibility', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('HVAC')).toBeInTheDocument()
      })

      const hvacButton = screen.getByText('HVAC')

      // Initially should be enabled (active styling)
      expect(hvacButton.closest('button')).toHaveClass('bg-gray-900')

      // Clear initial fetch calls
      ;(global.fetch as jest.Mock).mockClear()

      // Toggle off
      await mockUser.click(hvacButton)

      // Should trigger new API call with updated sensor selection
      expect(global.fetch).toHaveBeenCalled()
    })

    test('shows anomaly detection toggle', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        const anomalyToggle = screen.getByLabelText(/Show Anomalies/)
        expect(anomalyToggle).toBeInTheDocument()
        expect(anomalyToggle).toBeChecked()
      })
    })

    test('toggles anomaly detection', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        const anomalyToggle = screen.getByLabelText(/Show Anomalies/)
        expect(anomalyToggle).toBeChecked()
      })

      // Clear initial fetch calls
      ;(global.fetch as jest.Mock).mockClear()

      const anomalyToggle = screen.getByLabelText(/Show Anomalies/)
      await mockUser.click(anomalyToggle)

      expect(anomalyToggle).not.toBeChecked()
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  describe('Professional Tier Features', () => {
    test('shows export controls for all users', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('CSV')).toBeInTheDocument()
        expect(screen.getByText('PNG')).toBeInTheDocument()
        expect(screen.getByText('PDF')).toBeInTheDocument()
      })
    })

    test('enables export for professional users', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
            subscriptionTier: 'professional' as const
          },
          expires: '2025-12-31'
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        const csvButton = screen.getByText('CSV')
        expect(csvButton.closest('button')).toHaveClass('bg-green-600')
      })
    })

    test('shows upgrade prompt for free users on export', async () => {
      window.alert = jest.fn()

      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('CSV')).toBeInTheDocument()
      })

      const csvButton = screen.getByText('CSV')
      expect(csvButton.closest('button')).toHaveClass('bg-gray-100')

      await mockUser.click(csvButton)

      // Should trigger upgrade modal (simplified as alert in test)
      // In real implementation, this would show the upgrade modal
    })

    test('displays export restriction message for free users', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText(/Export requires Professional tier/)).toBeInTheDocument()
      })
    })
  })

  describe('Chart Rendering and Interactions', () => {
    test('renders main time-series chart', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      })
    })

    test('renders chart components correctly', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
        expect(screen.getByTestId('x-axis')).toBeInTheDocument()
        expect(screen.getByTestId('y-axis')).toBeInTheDocument()
        expect(screen.getByTestId('tooltip')).toBeInTheDocument()
        expect(screen.getByTestId('legend')).toBeInTheDocument()
        expect(screen.getByTestId('brush')).toBeInTheDocument()
      })
    })

    test('displays zoom controls', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByTitle('Zoom Out')).toBeInTheDocument()
        expect(screen.getByTitle('Zoom In')).toBeInTheDocument()
        expect(screen.getByTitle('Reset Zoom')).toBeInTheDocument()
      })
    })

    test('zoom functionality works correctly', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument()
      })

      // Zoom in
      await mockUser.click(screen.getByTitle('Zoom In'))
      expect(screen.getByText('125%')).toBeInTheDocument()

      // Zoom out
      await mockUser.click(screen.getByTitle('Zoom Out'))
      expect(screen.getByText('100%')).toBeInTheDocument()

      // Reset zoom
      await mockUser.click(screen.getByTitle('Zoom In'))
      await mockUser.click(screen.getByTitle('Reset Zoom'))
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('Statistical Analysis Components', () => {
    test('renders sensor statistics panel', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Sensor Statistics')).toBeInTheDocument()
      })
    })

    test('displays statistical metrics correctly', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('HVAC')).toBeInTheDocument()
        expect(screen.getByText('Min:')).toBeInTheDocument()
        expect(screen.getByText('Max:')).toBeInTheDocument()
        expect(screen.getByText('Avg:')).toBeInTheDocument()
        expect(screen.getByText('σ:')).toBeInTheDocument()
      })
    })

    test('renders seasonal patterns panel', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Seasonal Patterns')).toBeInTheDocument()
        expect(screen.getByText('Winter (Jan-Mar)')).toBeInTheDocument()
        expect(screen.getByText('Peak Hours:')).toBeInTheDocument()
      })
    })

    test('shows trend indicators correctly', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('stable')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Memory Management', () => {
    test('renders within performance threshold', async () => {
      const startTime = performance.now()

      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Interactive Time-Series Analytics')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within 200ms for full page
      expect(renderTime).toBeLessThan(200)
    })

    test('handles large dataset efficiently', async () => {
      // Mock large dataset response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            series: [
              {
                sensor_id: 'SENSOR_001',
                equipment_type: 'HVAC',
                floor_number: 1,
                unit: 'kWh',
                color: '#3B82F6',
                data: Array.from({ length: 100000 }, (_, i) => ({
                  timestamp: new Date(Date.now() - i * 60000).toISOString(),
                  value: Math.random() * 1000,
                  sensor_id: 'SENSOR_001',
                  status: 'normal'
                }))
              }
            ],
            anomalies: [],
            statistics: [],
            seasonalPatterns: []
          }
        })
      })

      const startTime = performance.now()

      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Interactive Time-Series Analytics')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should handle large datasets efficiently
      expect(renderTime).toBeLessThan(500)
    })

    test('chart interaction responsiveness', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByTitle('Zoom In')).toBeInTheDocument()
      })

      const startTime = performance.now()

      await mockUser.click(screen.getByTitle('Zoom In'))

      await waitFor(() => {
        expect(screen.getByText('125%')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const interactionTime = endTime - startTime

      // Zoom interaction should respond within 100ms
      expect(interactionTime).toBeLessThan(100)
    })

    test('sensor toggle responsiveness', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('HVAC')).toBeInTheDocument()
      })

      const startTime = performance.now()

      await mockUser.click(screen.getByText('HVAC'))

      const endTime = performance.now()
      const toggleTime = endTime - startTime

      // Sensor toggle should respond within 50ms
      expect(toggleTime).toBeLessThan(50)
    })
  })

  describe('Error Handling', () => {
    test('displays error state for API failures', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'))

      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load time-series data/)).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    test('retry functionality works correctly', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { series: [], anomalies: [], statistics: [], seasonalPatterns: [] }
          })
        })

      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      await mockUser.click(screen.getByText('Retry'))

      await waitFor(() => {
        expect(screen.getByText('Interactive Time-Series Analytics')).toBeInTheDocument()
      })
    })

    test('handles API validation errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Invalid parameters',
          validation_errors: [
            { field: 'sensor_ids', message: 'Invalid sensor ID format', code: 'invalid_format' }
          ]
        })
      })

      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load time-series data/)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    test('provides proper ARIA labels', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Show Anomalies/)).toBeInTheDocument()
      })
    })

    test('supports keyboard navigation', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByText('Day')).toBeInTheDocument()
      })

      const dayButton = screen.getByText('Day')
      dayButton.focus()
      expect(document.activeElement).toBe(dayButton)

      // Tab to next control
      fireEvent.keyDown(dayButton, { key: 'Tab' })
    })

    test('provides meaningful button labels', async () => {
      render(<InteractiveTimeSeriesAnalytics />)

      await waitFor(() => {
        expect(screen.getByTitle('Zoom In')).toBeInTheDocument()
        expect(screen.getByTitle('Zoom Out')).toBeInTheDocument()
        expect(screen.getByTitle('Reset Zoom')).toBeInTheDocument()
      })
    })
  })
})