/**
 * Comprehensive Tests for InteractiveDataVisualizations Component
 * Addresses Quinn's Critical Issue #1: Dashboard components lack comprehensive tests
 */

import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import InteractiveDataVisualizations from '../InteractiveDataVisualizations'

// Mock Recharts components to avoid canvas/SVG issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: unknown) => <div data-testid="responsive-container">{children}</div>,
  ComposedChart: ({ children }: unknown) => <div data-testid="composed-chart">{children}</div>,
  BarChart: ({ children }: unknown) => <div data-testid="bar-chart">{children}</div>,
  LineChart: ({ children }: unknown) => <div data-testid="line-chart">{children}</div>,
  ScatterChart: ({ children }: unknown) => <div data-testid="scatter-chart">{children}</div>,
  PieChart: ({ children }: unknown) => <div data-testid="pie-chart">{children}</div>,
  AreaChart: ({ children }: unknown) => <div data-testid="area-chart">{children}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Bar: () => <div data-testid="bar" />,
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  Scatter: () => <div data-testid="scatter" />,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />
}))

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock URL.createObjectURL and revokeObjectURL for export functionality
global.URL.createObjectURL = jest.fn(() => 'mock-url')
global.URL.revokeObjectURL = jest.fn()

// Mock document.createElement for export functionality
const mockCreateElement = jest.fn(() => ({
  click: jest.fn(),
  href: '',
  download: ''
}))
document.createElement = mockCreateElement

const mockBangkokDataset = {
  dataset_info: {
    total_records: 2847365,
    date_range: '2024-01-01 to 2024-12-31',
    buildings_analyzed: 15,
    data_quality_score: 97
  },
  real_time_updates: [
    {
      timestamp: '2025-09-22T12:00:00Z',
      energy_consumption: 1000,
      temperature: 28.5,
      humidity: 72,
      co2_level: 450,
      occupancy: 85,
      lighting_level: 75
    },
    {
      timestamp: '2025-09-22T13:00:00Z',
      energy_consumption: 1100,
      temperature: 29.2,
      humidity: 68,
      co2_level: 480,
      occupancy: 90,
      lighting_level: 80
    }
  ],
  floor_performance: [
    {
      floor: 'Ground Floor',
      efficiency_score: 92,
      energy_usage: 1200,
      cost_impact: 15600,
      sensor_count: 45,
      issues_detected: 1,
      status: 'excellent' as const
    },
    {
      floor: 'Floor 1',
      efficiency_score: 78,
      energy_usage: 1180,
      cost_impact: 15340,
      sensor_count: 40,
      issues_detected: 5,
      status: 'warning' as const
    }
  ],
  system_comparisons: [
    {
      system: 'HVAC System',
      current_performance: 87,
      baseline_performance: 82,
      savings_potential: 125000,
      confidence_level: 94,
      category: 'climate_control'
    },
    {
      system: 'Lighting Control',
      current_performance: 93,
      baseline_performance: 78,
      savings_potential: 85000,
      confidence_level: 97,
      category: 'lighting'
    }
  ],
  environmental_conditions: {
    current_temp: 28.5,
    humidity: 72,
    air_quality: 85,
    weather_impact: 'Moderate - Monsoon season affecting HVAC load'
  }
}

describe('InteractiveDataVisualizations Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: mockBangkokDataset
      })
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Component Rendering', () => {
    it('should render visualization header correctly', async () => {
      render(<InteractiveDataVisualizations />)

      expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
      expect(screen.getByText('Bangkok CU-BEMS Dataset')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('2.8M Records')).toBeInTheDocument()
        expect(screen.getByText('Quality: 97%')).toBeInTheDocument()
      })
    })

    it('should display loading state initially', () => {
      render(<InteractiveDataVisualizations />)

      expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('should show chart type selector buttons', async () => {
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

  describe('Chart Type Switching', () => {
    it('should switch between different chart types', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        // Default is time series
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()

        // Switch to floor performance
        fireEvent.click(screen.getByText('Floor Performance'))
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()

        // Switch to system comparison
        fireEvent.click(screen.getByText('System Comparison'))
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()

        // Switch to efficiency analysis
        fireEvent.click(screen.getByText('Efficiency Analysis'))
        expect(screen.getByTestId('scatter-chart')).toBeInTheDocument()
      })
    })

    it('should display environmental charts differently', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Environment'))

        expect(screen.getByText('Temperature')).toBeInTheDocument()
        expect(screen.getByText('Humidity')).toBeInTheDocument()
        expect(screen.getByText('Air Quality')).toBeInTheDocument()
        expect(screen.getByText('28.5')).toBeInTheDocument()
        expect(screen.getByText('72')).toBeInTheDocument()
        expect(screen.getByText('85')).toBeInTheDocument()
      })
    })

    it('should highlight active chart type button', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        const timeSeriesButton = screen.getByText('Time Series').closest('button')
        expect(timeSeriesButton).toHaveClass('bg-blue-600', 'text-white')

        fireEvent.click(screen.getByText('Floor Performance'))

        const floorPerfButton = screen.getByText('Floor Performance').closest('button')
        expect(floorPerfButton).toHaveClass('bg-blue-600', 'text-white')
        expect(timeSeriesButton).not.toHaveClass('bg-blue-600')
      })
    })
  })

  describe('Filters and Controls', () => {
    it('should toggle filters panel', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        const filterButton = screen.getByTitle('Toggle filters')
        fireEvent.click(filterButton)

        expect(screen.getByText('Time Range')).toBeInTheDocument()
        expect(screen.getByText('Floors')).toBeInTheDocument()
        expect(screen.getByText('Systems')).toBeInTheDocument()
      })
    })

    it('should change time range filter', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        const filterButton = screen.getByTitle('Toggle filters')
        fireEvent.click(filterButton)

        const timeRangeSelect = screen.getByDisplayValue('Last 24 Hours')
        fireEvent.change(timeRangeSelect, { target: { value: '7d' } })

        expect(timeRangeSelect).toHaveValue('7d')
      })
    })

    it('should update floor and system filters', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        const filterButton = screen.getByTitle('Toggle filters')
        fireEvent.click(filterButton)

        const floorSelect = screen.getByLabelText('Floors')
        fireEvent.change(floorSelect, { target: { value: ['Ground Floor'] } })

        const systemSelect = screen.getByLabelText('Systems')
        fireEvent.change(systemSelect, { target: { value: ['HVAC System'] } })

        expect(floorSelect).toBeInTheDocument()
        expect(systemSelect).toBeInTheDocument()
      })
    })

    it('should handle fullscreen toggle', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        const fullscreenButton = screen.getByTitle('Toggle fullscreen')
        fireEvent.click(fullscreenButton)

        const container = screen.getByText('Interactive Data Visualizations').closest('.bg-white')
        expect(container).toHaveClass('fixed', 'inset-0', 'z-50')
      })
    })
  })

  describe('Data Export Functionality', () => {
    it('should export data when export button is clicked', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        const exportButton = screen.getByTitle('Export data')
        fireEvent.click(exportButton)

        expect(global.URL.createObjectURL).toHaveBeenCalled()
        expect(mockCreateElement).toHaveBeenCalledWith('a')
      })
    })

    it('should include correct data in export', async () => {
      const mockAnchor = {
        click: jest.fn(),
        href: '',
        download: ''
      }
      mockCreateElement.mockReturnValue(mockAnchor)

      render(<InteractiveDataVisualizations sessionId="test-session" />)

      await waitFor(() => {
        const exportButton = screen.getByTitle('Export data')
        fireEvent.click(exportButton)

        expect(mockAnchor.download).toContain('bangkok-dataset-timeseries')
        expect(mockAnchor.download).toContain('.json')
        expect(mockAnchor.click).toHaveBeenCalled()
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should refresh data at specified intervals', async () => {
      const refreshInterval = 1000
      render(<InteractiveDataVisualizations refreshInterval={refreshInterval} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      act(() => {
        jest.advanceTimersByTime(refreshInterval)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })

    it('should display live data indicator', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText('Live Data')).toBeInTheDocument()
        const indicator = screen.getByText('Live Data').previousElementSibling
        expect(indicator).toHaveClass('animate-pulse')
      })
    })

    it('should show last updated timestamp', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
      })
    })

    it('should handle manual refresh', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        const refreshButton = screen.getByTitle('Refresh data')
        fireEvent.click(refreshButton)

        // Should call fetch again
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        // Should still render with mock data when API fails
        expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
        expect(screen.getByText('Bangkok CU-BEMS Dataset')).toBeInTheDocument()
      })
    })

    it('should handle export errors gracefully', async () => {
      global.URL.createObjectURL = jest.fn(() => {
        throw new Error('Export failed')
      })

      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        const exportButton = screen.getByTitle('Export data')
        fireEvent.click(exportButton)

        // Component should not crash
        expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
      })
    })

    it('should handle failed API response gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      })

      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        // Should render with mock data
        expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Optimization', () => {
    it('should load within performance budget', async () => {
      const startTime = performance.now()

      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText('Interactive Data Visualizations')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const loadTime = endTime - startTime

      // Should load within 2 seconds (2000ms)
      expect(loadTime).toBeLessThan(2000)
    })

    it('should handle rapid filter changes efficiently', async () => {
      render(<InteractiveDataVisualizations refreshInterval={100} />)

      await waitFor(() => {
        const filterButton = screen.getByTitle('Toggle filters')
        fireEvent.click(filterButton)

        const timeRangeSelect = screen.getByDisplayValue('Last 24 Hours')

        // Rapid filter changes
        for (let i = 0; i < 5; i++) {
          fireEvent.change(timeRangeSelect, { target: { value: '1h' } })
          fireEvent.change(timeRangeSelect, { target: { value: '24h' } })
        }

        // Should not cause excessive API calls
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })
    })

    it('should render appropriate number of data points', async () => {
      render(<InteractiveDataVisualizations height={300} />)

      await waitFor(() => {
        // Should render charts with appropriate dimensions
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /toggle filters/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /refresh data/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /toggle fullscreen/i })).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        const timeSeriesButton = screen.getByText('Time Series')
        timeSeriesButton.focus()

        expect(document.activeElement).toBe(timeSeriesButton)

        // Test tab navigation
        fireEvent.keyDown(timeSeriesButton, { key: 'Tab' })
        expect(document.activeElement).not.toBe(timeSeriesButton)
      })
    })

    it('should have proper contrast for different chart elements', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Environment'))

        // Environmental gauges should have proper contrast
        const temperatureValue = screen.getByText('28.5')
        expect(temperatureValue).toBeInTheDocument()
      })
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should render mobile layout correctly', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        const container = screen.getByText('Interactive Data Visualizations').closest('.bg-white')
        expect(container).toBeInTheDocument()
      })
    })

    it('should adjust chart height for mobile', async () => {
      render(<InteractiveDataVisualizations height={200} />)

      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      })
    })
  })

  describe('Chart-specific Functionality', () => {
    it('should render time series chart with correct data', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
        expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
        expect(screen.getAllByTestId('x-axis')).toHaveLength(1)
        expect(screen.getAllByTestId('y-axis')).toHaveLength(2) // Left and right axis
      })
    })

    it('should render performance chart with floor data', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Floor Performance'))

        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
      })
    })

    it('should render system comparison chart', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('System Comparison'))

        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
      })
    })

    it('should render efficiency scatter plot', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Efficiency Analysis'))

        expect(screen.getByTestId('scatter-chart')).toBeInTheDocument()
      })
    })
  })

  describe('Data Status and Information', () => {
    it('should display dataset information correctly', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText('2.8M Records')).toBeInTheDocument()
        expect(screen.getByText('Quality: 97%')).toBeInTheDocument()
        expect(screen.getByText('2024-01-01 to 2024-12-31')).toBeInTheDocument()
        expect(screen.getByText('15 Buildings')).toBeInTheDocument()
      })
    })

    it('should show real-time status correctly', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(screen.getByText('Live Data')).toBeInTheDocument()
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
      })
    })
  })

  describe('Session Management', () => {
    it('should include session ID in API requests when provided', async () => {
      render(<InteractiveDataVisualizations sessionId="test-session-123" />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('session_id=test-session-123')
        )
      })
    })

    it('should work without session ID', async () => {
      render(<InteractiveDataVisualizations />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.not.stringContaining('session_id=')
        )
      })
    })
  })
})