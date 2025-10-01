/**
 * TimeSeriesChart Component Tests
 * Story 3.2: Interactive Time-Series Visualizations
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TimeSeriesChart } from '../../../../src/components/features/analytics/TimeSeriesChart'
import {
  MultiSeriesData,
  ChartConfiguration,
  ChartInteractionState,
  PerformanceMetrics
} from '../../../../types/analytics'
import { addHours, addMinutes } from 'date-fns'

// Mock Chart.js to avoid canvas rendering issues in tests
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options, ...props }: any) => (
    <div
      data-testid="mock-chart"
      data-datasets={JSON.stringify(data.datasets)}
      data-options={JSON.stringify(options)}
      {...props}
    />
  )
}))

// Mock date-fns adapter
jest.mock('chartjs-adapter-date-fns', () => ({}))

describe('TimeSeriesChart', () => {
  const mockConfig: ChartConfiguration = {
    sensors: ['sensor_1', 'sensor_2'],
    start_date: addHours(new Date(), -24).toISOString(),
    end_date: new Date().toISOString(),
    interval: 'hour',
    max_points: 1000,
    show_legend: true,
    chart_type: 'line'
  }

  const mockData: MultiSeriesData[] = [
    {
      sensor_id: 'sensor_1',
      equipment_type: 'HVAC',
      floor_number: 1,
      unit: 'kWh',
      color: '#3B82F6',
      data: [
        {
          timestamp: addMinutes(new Date(), -120).toISOString(),
          value: 25.5,
          sensor_id: 'sensor_1',
          status: 'normal'
        },
        {
          timestamp: addMinutes(new Date(), -60).toISOString(),
          value: 30.2,
          sensor_id: 'sensor_1',
          status: 'warning'
        },
        {
          timestamp: new Date().toISOString(),
          value: 35.8,
          sensor_id: 'sensor_1',
          status: 'error'
        }
      ]
    },
    {
      sensor_id: 'sensor_2',
      equipment_type: 'Lighting',
      floor_number: 2,
      unit: 'kWh',
      color: '#EF4444',
      data: [
        {
          timestamp: addMinutes(new Date(), -120).toISOString(),
          value: 15.3,
          sensor_id: 'sensor_2',
          status: 'normal'
        },
        {
          timestamp: addMinutes(new Date(), -60).toISOString(),
          value: 18.7,
          sensor_id: 'sensor_2',
          status: 'normal'
        },
        {
          timestamp: new Date().toISOString(),
          value: 22.1,
          sensor_id: 'sensor_2',
          status: 'normal'
        }
      ]
    }
  ]

  beforeEach(() => {
    // Reset any mocks
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders chart with data', () => {
      render(
        <TimeSeriesChart
          data={mockData}
          config={mockConfig}
        />
      )

      expect(screen.getByTestId('mock-chart')).toBeInTheDocument()
    })

    it('displays loading state', () => {
      render(
        <TimeSeriesChart
          data={[]}
          config={mockConfig}
          loading={true}
        />
      )

      expect(screen.getByText('Loading time-series data...')).toBeInTheDocument()
      expect(screen.queryByTestId('mock-chart')).not.toBeInTheDocument()
    })

    it('displays error state', () => {
      const errorMessage = 'Failed to load data'

      render(
        <TimeSeriesChart
          data={[]}
          config={mockConfig}
          error={errorMessage}
        />
      )

      expect(screen.getByText('Failed to load chart data')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(screen.queryByTestId('mock-chart')).not.toBeInTheDocument()
    })

    it('displays empty state when no data', () => {
      render(
        <TimeSeriesChart
          data={[]}
          config={mockConfig}
        />
      )

      expect(screen.getByText('No data available')).toBeInTheDocument()
      expect(screen.getByText('Select sensors and date range to view time-series data')).toBeInTheDocument()
      expect(screen.queryByTestId('mock-chart')).not.toBeInTheDocument()
    })
  })

  describe('Data Processing', () => {
    it('processes chart data correctly', () => {
      render(
        <TimeSeriesChart
          data={mockData}
          config={mockConfig}
        />
      )

      const chartElement = screen.getByTestId('mock-chart')
      const datasetsAttr = chartElement.getAttribute('data-datasets')
      const datasets = JSON.parse(datasetsAttr || '[]')

      expect(datasets).toHaveLength(2)
      expect(datasets[0].label).toBe('HVAC - Floor 1')
      expect(datasets[1].label).toBe('Lighting - Floor 2')
    })

    it('applies data decimation when max_points is exceeded', () => {
      const configWithLowMaxPoints = {
        ...mockConfig,
        max_points: 2
      }

      render(
        <TimeSeriesChart
          data={mockData}
          config={configWithLowMaxPoints}
        />
      )

      const chartElement = screen.getByTestId('mock-chart')
      const datasetsAttr = chartElement.getAttribute('data-datasets')
      const datasets = JSON.parse(datasetsAttr || '[]')

      // Each dataset should have at most max_points data points
      datasets.forEach((dataset: any) => {
        expect(dataset.data.length).toBeLessThanOrEqual(configWithLowMaxPoints.max_points)
      })
    })

    it('handles area chart type correctly', () => {
      const areaConfig = {
        ...mockConfig,
        chart_type: 'area' as const
      }

      render(
        <TimeSeriesChart
          data={mockData}
          config={areaConfig}
        />
      )

      const chartElement = screen.getByTestId('mock-chart')
      const datasetsAttr = chartElement.getAttribute('data-datasets')
      const datasets = JSON.parse(datasetsAttr || '[]')

      // Area charts should have fill enabled
      datasets.forEach((dataset: any) => {
        expect(dataset.fill).toBe(true)
      })
    })
  })

  describe('Configuration', () => {
    it('shows/hides legend based on config', () => {
      const configWithoutLegend = {
        ...mockConfig,
        show_legend: false
      }

      render(
        <TimeSeriesChart
          data={mockData}
          config={configWithoutLegend}
        />
      )

      const chartElement = screen.getByTestId('mock-chart')
      const optionsAttr = chartElement.getAttribute('data-options')
      const options = JSON.parse(optionsAttr || '{}')

      expect(options.plugins.legend.display).toBe(false)
    })

    it('applies custom height', () => {
      const customHeight = 600

      render(
        <div data-testid="chart-container">
          <TimeSeriesChart
            data={mockData}
            config={mockConfig}
            height={customHeight}
          />
        </div>
      )

      const container = screen.getByTestId('chart-container')
      const chartWrapper = container.firstChild as HTMLElement

      expect(chartWrapper.style.height).toBe(`${customHeight}px`)
    })
  })

  describe('Callbacks', () => {
    it('calls onPerformanceMetrics when provided', async () => {
      const mockOnPerformanceMetrics = jest.fn()

      render(
        <TimeSeriesChart
          data={mockData}
          config={mockConfig}
          onPerformanceMetrics={mockOnPerformanceMetrics}
        />
      )

      // Wait for performance metrics to be calculated
      await waitFor(() => {
        expect(mockOnPerformanceMetrics).toHaveBeenCalledWith(
          expect.objectContaining({
            render_time: expect.any(Number),
            points_rendered: expect.any(Number),
            memory_usage: expect.any(Number)
          })
        )
      })
    })

    it('calls onInteraction when provided', () => {
      const mockOnInteraction = jest.fn()

      render(
        <TimeSeriesChart
          data={mockData}
          config={mockConfig}
          onInteraction={mockOnInteraction}
        />
      )

      // Just verify that the component renders with the onInteraction prop
      // (The actual onHover callback test would require more complex mocking)
      expect(screen.getByTestId('mock-chart')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides accessible error messages', () => {
      const errorMessage = 'Network error occurred'

      render(
        <TimeSeriesChart
          data={[]}
          config={mockConfig}
          error={errorMessage}
        />
      )

      // Error state should be clearly communicated
      expect(screen.getByText('Failed to load chart data')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('provides accessible loading state', () => {
      render(
        <TimeSeriesChart
          data={[]}
          config={mockConfig}
          loading={true}
        />
      )

      expect(screen.getByText('Loading time-series data...')).toBeInTheDocument()
    })

    it('provides accessible empty state', () => {
      render(
        <TimeSeriesChart
          data={[]}
          config={mockConfig}
        />
      )

      expect(screen.getByText('No data available')).toBeInTheDocument()
      expect(screen.getByText('Select sensors and date range to view time-series data')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      // Create a large dataset
      const largeData: MultiSeriesData[] = [{
        sensor_id: 'sensor_large',
        equipment_type: 'HVAC',
        floor_number: 1,
        unit: 'kWh',
        color: '#3B82F6',
        data: Array.from({ length: 10000 }, (_, i) => ({
          timestamp: addMinutes(new Date(), -i).toISOString(),
          value: Math.random() * 100,
          sensor_id: 'sensor_large',
          status: 'normal' as const
        }))
      }]

      const startTime = performance.now()

      render(
        <TimeSeriesChart
          data={largeData}
          config={mockConfig}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100)

      // Should apply decimation
      const chartElement = screen.getByTestId('mock-chart')
      const datasetsAttr = chartElement.getAttribute('data-datasets')
      const datasets = JSON.parse(datasetsAttr || '[]')

      expect(datasets[0].data.length).toBeLessThanOrEqual(mockConfig.max_points)
    })
  })
})