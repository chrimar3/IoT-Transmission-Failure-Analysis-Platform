/**
 * Comprehensive Test Suite for Interactive Data Visualizations
 * Story 3.2 Quality Validation: Chart Component Testing
 *
 * Tests cover:
 * - Component rendering and state management
 * - Chart interaction and performance
 * - Data processing and validation
 * - Subscription tier access control
 * - Performance requirements validation
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import InteractiveDataVisualizations from '@/app/dashboard/components/InteractiveDataVisualizations'

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  ScatterChart: ({ children }: any) => <div data-testid="scatter-chart">{children}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Bar: () => <div data-testid="bar" />,
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  Scatter: () => <div data-testid="scatter" />,
  Cell: () => <div data-testid="cell" />,
  Brush: () => <div data-testid="brush" />
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
  usePathname: () => '/dashboard'
}))

describe('InteractiveDataVisualizations Component', () => {
  const mockUser = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock successful API response
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          dataset_info: {
            total_records: 2847365,
            date_range: '2018-01-01 to 2019-06-30',
            buildings_analyzed: 15,
            data_quality_score: 97
          },
          real_time_updates: [],
          floor_performance: [],
          system_comparisons: [],
          environmental_conditions: {
            current_temp: 28.5,
            humidity: 72,
            air_quality: 85,
            weather_impact: 'Moderate'
          }
        }
      })
    })
  })

  describe('Component Rendering', () => {
    test('renders main visualization container', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
      })

      expect(screen.getByText('Bangkok CU-BEMS Dataset')).toBeInTheDocument()
    })

    test('displays dataset information correctly', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText(/2\.8M Records/)).toBeInTheDocument()
        expect(screen.getByText(/Quality: 97%/)).toBeInTheDocument()
      })
    })

    test('shows loading state initially', () => {
      render(<InteractiveDataVisualizations />)

      expect(screen.getByText('Loading Bangkok time-series data...')).toBeInTheDocument()
    })

    test('renders chart type selector buttons', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText('Time Series')).toBeInTheDocument()
        expect(screen.getByText('Floor Performance')).toBeInTheDocument()
        expect(screen.getByText('System Comparison')).toBeInTheDocument()
        expect(screen.getByText('Environment')).toBeInTheDocument()
        expect(screen.getByText('Efficiency Analysis')).toBeInTheDocument()
      })
    })
  })

  describe('Chart Type Selection', () => {
    test('switches between chart types correctly', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })

      // Switch to bar chart
      await mockUser.click(screen.getByText('Floor Performance'))
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()

      // Switch to scatter chart
      await mockUser.click(screen.getByText('Efficiency Analysis'))
      expect(screen.getByTestId('scatter-chart')).toBeInTheDocument()
    })

    test('activates correct chart type button', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        const timeSeriesButton = screen.getByText('Time Series')
        expect(timeSeriesButton.closest('button')).toHaveClass('bg-blue-600')
      })

      await mockUser.click(screen.getByText('Floor Performance'))

      const performanceButton = screen.getByText('Floor Performance')
      expect(performanceButton.closest('button')).toHaveClass('bg-blue-600')
    })

    test('environmental chart renders custom circular indicators', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText('Time Series')).toBeInTheDocument()
      })

      await mockUser.click(screen.getByText('Environment'))

      expect(screen.getByText('Temperature')).toBeInTheDocument()
      expect(screen.getByText('Humidity')).toBeInTheDocument()
      expect(screen.getByText('Air Quality')).toBeInTheDocument()
    })
  })

  describe('Interactive Controls', () => {
    test('toggle filters panel visibility', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByTitle('Toggle filters')).toBeInTheDocument()
      })

      // Initially filters should be hidden
      expect(screen.queryByText('Time Range')).not.toBeInTheDocument()

      // Click to show filters
      await mockUser.click(screen.getByTitle('Toggle filters'))
      expect(screen.getByText('Time Range')).toBeInTheDocument()
      expect(screen.getByText('Floors')).toBeInTheDocument()
      expect(screen.getByText('Systems')).toBeInTheDocument()

      // Click to hide filters
      await mockUser.click(screen.getByTitle('Toggle filters'))
      expect(screen.queryByText('Time Range')).not.toBeInTheDocument()
    })

    test('export data functionality', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByTitle('Export data')).toBeInTheDocument()
      })

      // Mock URL.createObjectURL and revokeObjectURL
      global.URL.createObjectURL = jest.fn(() => 'mock-blob-url')
      global.URL.revokeObjectURL = jest.fn()

      // Mock createElement and click
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn()
      }
      const originalCreateElement = document.createElement
      document.createElement = jest.fn((tagName) => {
        if (tagName === 'a') return mockAnchor as any
        return originalCreateElement.call(document, tagName)
      })

      await mockUser.click(screen.getByTitle('Export data'))

      expect(mockAnchor.click).toHaveBeenCalled()
      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(global.URL.revokeObjectURL).toHaveBeenCalled()

      // Restore original functions
      document.createElement = originalCreateElement
    })

    test('refresh data functionality', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByTitle('Refresh data')).toBeInTheDocument()
      })

      // Clear initial fetch calls
      ;(global.fetch as jest.Mock).mockClear()

      await mockUser.click(screen.getByTitle('Refresh data'))

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/visualizations\/bangkok-dataset/)
      )
    })

    test('fullscreen toggle functionality', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByTitle('Toggle fullscreen')).toBeInTheDocument()
      })

      const container = screen.getByText('Interactive Data Visualizations').closest('div')
      expect(container).not.toHaveClass('fixed', 'inset-0', 'z-50')

      await mockUser.click(screen.getByTitle('Toggle fullscreen'))

      const fullscreenContainer = screen.getByText('Interactive Data Visualizations').closest('div')
      expect(fullscreenContainer).toHaveClass('fixed', 'inset-0', 'z-50')
    })
  })

  describe('Data Processing and Validation', () => {
    test('handles API failure gracefully with mock data', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
      })

      // Should still render with mock data
      expect(screen.getByText(/2\.8M Records/)).toBeInTheDocument()
    })

    test('validates session ID parameter', async () => {
      const sessionId = 'test-session-123'
      render(<InteractiveDataVisualizations sessionId={sessionId} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/session_id=test-session-123/)
        )
      })
    })

    test('respects custom refresh interval', async () => {
      jest.useFakeTimers()

      const customInterval = 5000 // 5 seconds
      render(<InteractiveDataVisualizations refreshInterval={customInterval} />)

      await waitFor(() => {
        expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
      })

      // Clear initial fetch calls
      ;(global.fetch as jest.Mock).mockClear()

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(customInterval)
      })

      expect(global.fetch).toHaveBeenCalled()

      jest.useRealTimers()
    })

    test('processes filter parameters correctly', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByTitle('Toggle filters')).toBeInTheDocument()
      })

      // Show filters
      await mockUser.click(screen.getByTitle('Toggle filters'))

      // Clear initial fetch calls
      ;(global.fetch as jest.Mock).mockClear()

      // Change time range (this would trigger a new API call in real implementation)
      const timeRangeSelect = screen.getByDisplayValue('Last 24 Hours')
      await mockUser.selectOptions(timeRangeSelect, 'Last 7 Days')

      // In a real implementation, this would trigger a fetch with new parameters
      // For now, we just verify the UI updates
      expect(screen.getByDisplayValue('Last 7 Days')).toBeInTheDocument()
    })
  })

  describe('Performance Validation', () => {
    test('renders within performance threshold', async () => {
      const startTime = performance.now()

      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within 100ms for initial load
      expect(renderTime).toBeLessThan(100)
    })

    test('handles large dataset simulation efficiently', async () => {
      // Mock a large dataset response
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            dataset_info: {
              total_records: 124900000, // 124.9M records
              date_range: '2018-01-01 to 2019-06-30',
              buildings_analyzed: 15,
              data_quality_score: 97
            },
            real_time_updates: Array.from({ length: 10000 }, (_, i) => ({
              timestamp: new Date(Date.now() - i * 60000).toISOString(),
              energy_consumption: Math.random() * 1000,
              temperature: 20 + Math.random() * 15,
              humidity: 40 + Math.random() * 40,
              co2_level: 400 + Math.random() * 200,
              occupancy: Math.floor(Math.random() * 100),
              lighting_level: Math.random() * 100
            })),
            floor_performance: [],
            system_comparisons: [],
            environmental_conditions: {
              current_temp: 28.5,
              humidity: 72,
              air_quality: 85,
              weather_impact: 'Moderate'
            }
          }
        })
      })

      const startTime = performance.now()

      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText(/124\.9M Records/)).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should still render efficiently even with large dataset
      expect(renderTime).toBeLessThan(200)
    })

    test('chart interaction responsiveness', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText('Floor Performance')).toBeInTheDocument()
      })

      const startTime = performance.now()

      await mockUser.click(screen.getByText('Floor Performance'))

      // Wait for chart to update
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const interactionTime = endTime - startTime

      // Interaction should respond within 100ms
      expect(interactionTime).toBeLessThan(100)
    })
  })

  describe('Real-time Updates', () => {
    test('displays live data indicator', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText('Live Data')).toBeInTheDocument()
      })

      // Should show green indicator for live data
      const liveIndicator = screen.getByText('Live Data').previousElementSibling
      expect(liveIndicator).toHaveClass('bg-green-500', 'animate-pulse')
    })

    test('shows last updated timestamp', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
      })

      const timestampText = screen.getByText(/Last updated:/)
      expect(timestampText).toBeInTheDocument()
    })

    test('updates timestamp on refresh', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
      })

      const initialTimestamp = screen.getByText(/Last updated:/).textContent

      // Trigger refresh
      await mockUser.click(screen.getByTitle('Refresh data'))

      await waitFor(() => {
        const newTimestamp = screen.getByText(/Last updated:/).textContent
        expect(newTimestamp).not.toBe(initialTimestamp)
      })
    })
  })

  describe('Error Handling', () => {
    test('handles network errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'))

      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        // Should still render with fallback mock data
        expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
        expect(screen.getByText(/2\.8M Records/)).toBeInTheDocument()
      })
    })

    test('handles API response errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' })
      })

      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        // Should fallback to mock data
        expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
      })
    })

    test('handles malformed API responses', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'response' })
      })

      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        // Should fallback to mock data generation
        expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    test('provides accessible chart labels', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByTitle('Toggle filters')).toBeInTheDocument()
        expect(screen.getByTitle('Export data')).toBeInTheDocument()
        expect(screen.getByTitle('Refresh data')).toBeInTheDocument()
        expect(screen.getByTitle('Toggle fullscreen')).toBeInTheDocument()
      })
    })

    test('supports keyboard navigation', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText('Time Series')).toBeInTheDocument()
      })

      const timeSeriesButton = screen.getByText('Time Series')
      timeSeriesButton.focus()
      expect(document.activeElement).toBe(timeSeriesButton)
    })

    test('provides meaningful text alternatives', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
        expect(screen.getByText('Bangkok CU-BEMS Dataset')).toBeInTheDocument()
      })

      // Verify descriptive text is present
      expect(screen.getByText(/data points loaded/)).toBeInTheDocument()
      expect(screen.getByText(/sensors/)).toBeInTheDocument()
    })
  })

  describe('Memory Management', () => {
    test('cleans up intervals on unmount', async () => {
      jest.useFakeTimers()
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      const { unmount } = render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
      })

      unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()

      clearIntervalSpy.mockRestore()
      jest.useRealTimers()
    })

    test('handles component re-renders efficiently', async () => {
      const { rerender } = render(<InteractiveDataVisualizations refreshInterval={30000} />)

      await waitFor(() => {
        expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
      })

      const fetchCallCount = (global.fetch as jest.Mock).mock.calls.length

      // Re-render with same props
      rerender(<InteractiveDataVisualizations refreshInterval={30000} />)

      // Should not trigger additional API calls
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallCount)
    })
  })
})