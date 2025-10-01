/**
 * Comprehensive tests for TimeSeriesChart component
 * Tests rendering, interactions, data handling, and performance
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import TimeSeriesChart from '@/app/dashboard/components/TimeSeriesChart'
import type { MultiSeriesData } from '@/types/analytics'

// Mock recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="line-chart" data-points={data?.length || 0}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: { dataKey: string; stroke: string }) => (
    <div data-testid={`line-${dataKey}`} style={{ color: stroke }} />
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Brush: ({ onChange }: { onChange?: (startIndex: number, endIndex: number) => void }) => (
    <div
      data-testid="brush"
      onClick={() => onChange?.(0, 10)}
    />
  )
}))

// Mock fetch for API calls
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const mockMultiSeriesData: MultiSeriesData[] = [
  {
    sensor_id: 'SENSOR_001',
    equipment_type: 'HVAC',
    floor_number: 1,
    unit: 'kWh',
    color: '#3B82F6',
    data: [
      {
        timestamp: '2025-01-01T00:00:00Z',
        value: 100.5,
        status: 'normal',
        sensor_id: 'SENSOR_001'
      },
      {
        timestamp: '2025-01-01T01:00:00Z',
        value: 105.2,
        status: 'normal',
        sensor_id: 'SENSOR_001'
      }
    ]
  },
  {
    sensor_id: 'SENSOR_002',
    equipment_type: 'Lighting',
    floor_number: 2,
    unit: 'kWh',
    color: '#10B981',
    data: [
      {
        timestamp: '2025-01-01T00:00:00Z',
        value: 45.3,
        status: 'normal',
        sensor_id: 'SENSOR_002'
      },
      {
        timestamp: '2025-01-01T01:00:00Z',
        value: 48.1,
        status: 'warning',
        sensor_id: 'SENSOR_002'
      }
    ]
  }
]

const mockSession = {
  user: {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    subscriptionTier: 'professional' as const
  },
  expires: '2025-12-31'
}

const renderWithSession = (component: React.ReactElement) => {
  return render(
    <SessionProvider session={mockSession}>
      {component}
    </SessionProvider>
  )
}

describe('TimeSeriesChart', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          series: mockMultiSeriesData,
          metadata: {
            total_points: 4,
            sensors_count: 2,
            date_range: {
              start: '2025-01-01T00:00:00Z',
              end: '2025-01-01T01:00:00Z'
            }
          }
        }
      })
    } as Response)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders chart with loading state initially', () => {
      renderWithSession(<TimeSeriesChart />)

      expect(screen.getByText('Loading time-series data...')).toBeInTheDocument()
      expect(screen.getByText('Processing 3 sensors')).toBeInTheDocument()
    })

    test('renders chart with data after loading', async () => {
      renderWithSession(<TimeSeriesChart />)

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      expect(screen.getByText('Time-Series Analysis')).toBeInTheDocument()
      expect(screen.getByText('Bangkok CU-BEMS Dataset')).toBeInTheDocument()
    })

    test('renders chart controls when showControls is true', async () => {
      renderWithSession(<TimeSeriesChart showControls={true} />)

      await waitFor(() => {
        expect(screen.getByTitle('Refresh data')).toBeInTheDocument()
      })
    })

    test('hides chart controls when showControls is false', async () => {
      renderWithSession(<TimeSeriesChart showControls={false} />)

      await waitFor(() => {
        expect(screen.queryByTitle('Refresh data')).not.toBeInTheDocument()
      })
    })
  })

  describe('Data Fetching', () => {
    test('fetches data with correct API parameters', async () => {
      const sensorIds = ['SENSOR_001', 'SENSOR_002']
      const startDate = '2025-01-01T00:00:00Z'
      const endDate = '2025-01-01T02:00:00Z'

      renderWithSession(
        <TimeSeriesChart
          sensorIds={sensorIds}
          startDate={startDate}
          endDate={endDate}
        />
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/readings/timeseries')
        )
      })

      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toContain('sensor_ids=SENSOR_001%2CSENSOR_002')
      expect(callUrl).toContain('start_date=2025-01-01T00%3A00%3A00Z')
      expect(callUrl).toContain('end_date=2025-01-01T02%3A00%3A00Z')
    })

    test('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      renderWithSession(<TimeSeriesChart />)

      await waitFor(() => {
        expect(screen.getByText('Error loading chart data')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    test('handles API response errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Internal server error'
        })
      } as Response)

      renderWithSession(<TimeSeriesChart />)

      await waitFor(() => {
        expect(screen.getByText('Error loading chart data')).toBeInTheDocument()
        expect(screen.getByText('API request failed: 500')).toBeInTheDocument()
      })
    })
  })

  describe('Chart Interactions', () => {
    test('handles zoom functionality', async () => {
      const onConfigChange = jest.fn()

      renderWithSession(
        <TimeSeriesChart onConfigChange={onConfigChange} />
      )

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      const brush = screen.getByTestId('brush')
      fireEvent.click(brush)

      expect(onConfigChange).toHaveBeenCalled()
    })

    test('handles reset zoom functionality', async () => {
      const onConfigChange = jest.fn()

      renderWithSession(
        <TimeSeriesChart
          onConfigChange={onConfigChange}
          startDate="2025-01-01T00:00:00Z"
          endDate="2025-01-01T02:00:00Z"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      // Simulate zoom first
      const brush = screen.getByTestId('brush')
      fireEvent.click(brush)

      await waitFor(() => {
        expect(screen.getByTitle('Reset zoom')).toBeInTheDocument()
      })

      const resetButton = screen.getByTitle('Reset zoom')
      fireEvent.click(resetButton)

      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          start_date: '2025-01-01T00:00:00Z',
          end_date: '2025-01-01T02:00:00Z'
        })
      )
    })

    test('handles refresh functionality', async () => {
      renderWithSession(<TimeSeriesChart showControls={true} />)

      await waitFor(() => {
        expect(screen.getByTitle('Refresh data')).toBeInTheDocument()
      })

      const refreshButton = screen.getByTitle('Refresh data')
      fireEvent.click(refreshButton)

      expect(mockFetch).toHaveBeenCalledTimes(2) // Initial + refresh
    })
  })

  describe('Auto-refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('auto-refreshes when enabled', async () => {
      renderWithSession(
        <TimeSeriesChart
          autoRefresh={true}
          refreshInterval={5000}
        />
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })

    test('does not auto-refresh when disabled', async () => {
      renderWithSession(
        <TimeSeriesChart
          autoRefresh={false}
          refreshInterval={5000}
        />
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000)

      // Should still only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Performance', () => {
    test('handles large datasets efficiently', async () => {
      // Mock large dataset
      const largeMockData = mockMultiSeriesData.map(series => ({
        ...series,
        data: Array.from({ length: 1000 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 60000).toISOString(),
          value: Math.random() * 100,
          status: 'normal' as const
        }))
      }))

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            series: largeMockData,
            metadata: {
              total_points: 2000,
              sensors_count: 2,
              date_range: {
                start: '2025-01-01T00:00:00Z',
                end: '2025-01-01T16:40:00Z'
              }
            }
          }
        })
      } as Response)

      const startTime = performance.now()

      renderWithSession(<TimeSeriesChart />)

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (< 1000ms)
      expect(renderTime).toBeLessThan(1000)
    })

    test('displays performance metrics', async () => {
      renderWithSession(<TimeSeriesChart showControls={true} />)

      await waitFor(() => {
        expect(screen.getByText(/points •/)).toBeInTheDocument()
        expect(screen.getByText(/ms$/)).toBeInTheDocument()
      })
    })
  })

  describe('Multi-sensor Support', () => {
    test('renders multiple sensor lines', async () => {
      renderWithSession(<TimeSeriesChart />)

      await waitFor(() => {
        expect(screen.getByTestId('line-SENSOR_001_value')).toBeInTheDocument()
        expect(screen.getByTestId('line-SENSOR_002_value')).toBeInTheDocument()
      })
    })

    test('displays sensor legend', async () => {
      renderWithSession(<TimeSeriesChart showControls={true} />)

      await waitFor(() => {
        expect(screen.getByText('SENSOR_001')).toBeInTheDocument()
        expect(screen.getByText('SENSOR_002')).toBeInTheDocument()
        expect(screen.getByText('(HVAC)')).toBeInTheDocument()
        expect(screen.getByText('(Lighting)')).toBeInTheDocument()
      })
    })
  })

  describe('Error States', () => {
    test('shows empty state when no sensors provided', async () => {
      renderWithSession(<TimeSeriesChart sensorIds={[]} />)

      await waitFor(() => {
        expect(screen.getByText('No Sensors Selected')).toBeInTheDocument()
      })
    })

    test('shows retry button on error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      renderWithSession(<TimeSeriesChart />)

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      // Test retry functionality
      mockFetch.mockClear()
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { series: mockMultiSeriesData, metadata: { total_points: 4 } }
        })
      } as Response)

      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA labels', async () => {
      renderWithSession(<TimeSeriesChart />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh data/i })).toBeInTheDocument()
      })
    })

    test('supports keyboard navigation', async () => {
      renderWithSession(<TimeSeriesChart showControls={true} />)

      await waitFor(() => {
        const refreshButton = screen.getByTitle('Refresh data')
        expect(refreshButton).toBeInTheDocument()

        refreshButton.focus()
        expect(document.activeElement).toBe(refreshButton)
      })
    })
  })
})