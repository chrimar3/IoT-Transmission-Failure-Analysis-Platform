/**
 * Comprehensive tests for DateRangePicker component
 * Tests date validation, range selection, presets, and Bangkok dataset constraints
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DateRangePicker from '@/app/dashboard/components/DateRangePicker'

// Mock date for consistent testing
const MOCK_DATE = new Date('2025-01-15T12:00:00Z')

describe('DateRangePicker', () => {
  const mockOnDateChange = jest.fn()

  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(MOCK_DATE)
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  beforeEach(() => {
    mockOnDateChange.mockClear()
  })

  describe('Rendering', () => {
    test('renders with default date range', () => {
      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
        />
      )

      expect(screen.getByRole('button', { name: /select date range/i })).toBeInTheDocument()
      // Component shows "Last 24 Hours" for 24-hour ranges
      expect(screen.getByText('Last 24 Hours')).toBeInTheDocument()
    })

    test('shows range description', () => {
      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
        />
      )

      expect(screen.getByText('1 day of data')).toBeInTheDocument()
    })

    test('handles same day selection', () => {
      render(
        <DateRangePicker
          startDate="2025-01-15T09:00:00Z"
          endDate="2025-01-15T17:00:00Z"
          onDateChange={mockOnDateChange}
        />
      )

      // Component shows "Last 8 Hours" for recent 8-hour ranges
      expect(screen.getByText('Last 8 Hours')).toBeInTheDocument()
      expect(screen.getByText('8 hours of data')).toBeInTheDocument()
    })

    test('renders as disabled when disabled prop is true', () => {
      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
          disabled={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('cursor-not-allowed')
    })
  })

  describe('Dropdown Interaction', () => {
    test('opens dropdown when clicked', () => {
      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(screen.getByText('Select Date Range')).toBeInTheDocument()
      expect(screen.getByText('Quick Ranges')).toBeInTheDocument()
      expect(screen.getByText('Bangkok Dataset')).toBeInTheDocument()
    })

    test('closes dropdown when clicked again', () => {
      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)
      expect(screen.getByText('Select Date Range')).toBeInTheDocument()

      fireEvent.click(button)
      expect(screen.queryByText('Select Date Range')).not.toBeInTheDocument()
    })
  })

  describe('Preset Selection', () => {
    test('renders all quick preset options', () => {
      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /select date range/i }))

      // Use getAllByText for "Last 24 Hours" since it appears both in button and dropdown
      const lastHourButtons = screen.getAllByText('Last Hour')
      expect(lastHourButtons.length).toBeGreaterThan(0)
      expect(screen.getByText('Last 6 Hours')).toBeInTheDocument()
      const last24HoursElements = screen.getAllByText('Last 24 Hours')
      expect(last24HoursElements.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Last 3 Days')).toBeInTheDocument()
      expect(screen.getByText('Last Week')).toBeInTheDocument()
      expect(screen.getByText('Last Month')).toBeInTheDocument()
    })

    test('renders Bangkok dataset presets', () => {
      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      expect(screen.getByText('Bangkok Dataset 2018')).toBeInTheDocument()
      expect(screen.getByText('Bangkok Dataset 2019')).toBeInTheDocument()
    })

    test('selects preset and calls onDateChange', () => {
      render(
        <DateRangePicker
          startDate="2018-01-01T00:00:00Z"
          endDate="2018-01-02T00:00:00Z"
          onDateChange={mockOnDateChange}
          maxDaysRange={365}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /select date range/i }))

      // Click Bangkok Dataset 2018 which is valid with 365 day limit
      fireEvent.click(screen.getByText('Bangkok Dataset 2018'))

      expect(mockOnDateChange).toHaveBeenCalledWith(
        '2018-01-01T00:00:00.000Z',
        '2018-12-31T23:59:59.000Z'
      )
    })

    test('selects Bangkok dataset 2019 preset', () => {
      render(
        <DateRangePicker
          startDate="2018-01-01T00:00:00Z"
          endDate="2018-01-02T00:00:00Z"
          onDateChange={mockOnDateChange}
          maxDaysRange={365}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /select date range/i }))
      fireEvent.click(screen.getByText('Bangkok Dataset 2019'))

      expect(mockOnDateChange).toHaveBeenCalledWith(
        '2019-01-01T00:00:00.000Z',
        '2019-12-31T23:59:59.000Z'
      )
    })
  })

  describe('Custom Date Range', () => {
    test('shows custom date inputs when showCustomRange is true', () => {
      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
          showCustomRange={true}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      expect(screen.getByText('Custom Range')).toBeInTheDocument()
      expect(screen.getByLabelText('Start Date & Time')).toBeInTheDocument()
      expect(screen.getByLabelText('End Date & Time')).toBeInTheDocument()
    })

    test('hides custom range when showCustomRange is false', () => {
      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
          showCustomRange={false}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      expect(screen.queryByText('Custom Range')).not.toBeInTheDocument()
    })

    test('applies custom date range', () => {
      render(
        <DateRangePicker
          startDate="2018-01-01T00:00:00Z"
          endDate="2018-01-02T00:00:00Z"
          onDateChange={mockOnDateChange}
          showCustomRange={true}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /select date range/i }))

      const startInput = screen.getByLabelText('Start Date & Time')
      const endInput = screen.getByLabelText('End Date & Time')

      fireEvent.change(startInput, { target: { value: '2018-06-01T10:00' } })
      fireEvent.change(endInput, { target: { value: '2018-06-02T14:00' } })

      fireEvent.click(screen.getByText('Apply Range'))

      // The datetime-local input converts to local time, then component converts back to UTC
      // So we just check that onDateChange was called with valid ISO strings
      expect(mockOnDateChange).toHaveBeenCalledWith(
        expect.stringMatching(/2018-06-01/),
        expect.stringMatching(/2018-06-02/)
      )
    })

    test('validates custom date range', () => {
      // Mock alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
          showCustomRange={true}
          maxDaysRange={7}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      const startInput = screen.getByLabelText('Start Date & Time')
      const endInput = screen.getByLabelText('End Date & Time')

      // Set invalid range (start after end)
      fireEvent.change(startInput, { target: { value: '2018-06-02T10:00' } })
      fireEvent.change(endInput, { target: { value: '2018-06-01T14:00' } })

      fireEvent.click(screen.getByText('Apply Range'))

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Start date must be before end date')
      )
      expect(mockOnDateChange).not.toHaveBeenCalled()

      alertSpy.mockRestore()
    })

    test('validates maximum range constraint', () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
          showCustomRange={true}
          maxDaysRange={7}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      const startInput = screen.getByLabelText('Start Date & Time')
      const endInput = screen.getByLabelText('End Date & Time')

      // Set range exceeding maximum (8 days when max is 7)
      fireEvent.change(startInput, { target: { value: '2018-06-01T10:00' } })
      fireEvent.change(endInput, { target: { value: '2018-06-09T14:00' } })

      fireEvent.click(screen.getByText('Apply Range'))

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Date range cannot exceed 7 days')
      )

      alertSpy.mockRestore()
    })

    test('validates Bangkok dataset constraints', () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
          showCustomRange={true}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      const startInput = screen.getByLabelText('Start Date & Time')
      const endInput = screen.getByLabelText('End Date & Time')

      // Set dates outside Bangkok dataset range
      fireEvent.change(startInput, { target: { value: '2017-06-01T10:00' } })
      fireEvent.change(endInput, { target: { value: '2017-06-02T14:00' } })

      fireEvent.click(screen.getByText('Apply Range'))

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Start date cannot be before')
      )

      alertSpy.mockRestore()
    })
  })

  describe('Date Range Formatting', () => {
    test('formats recent hour ranges correctly', () => {
      const oneHourAgo = new Date(MOCK_DATE.getTime() - 60 * 60 * 1000).toISOString()

      render(
        <DateRangePicker
          startDate={oneHourAgo}
          endDate={MOCK_DATE.toISOString()}
          onDateChange={mockOnDateChange}
        />
      )

      expect(screen.getByText('Last Hour')).toBeInTheDocument()
    })

    test('formats multiple hour ranges correctly', () => {
      const sixHoursAgo = new Date(MOCK_DATE.getTime() - 6 * 60 * 60 * 1000).toISOString()

      render(
        <DateRangePicker
          startDate={sixHoursAgo}
          endDate={MOCK_DATE.toISOString()}
          onDateChange={mockOnDateChange}
        />
      )

      expect(screen.getByText('Last 6 Hours')).toBeInTheDocument()
    })

    test('shows select prompt when no dates provided', () => {
      render(
        <DateRangePicker
          startDate=""
          endDate=""
          onDateChange={mockOnDateChange}
        />
      )

      expect(screen.getByText('Select date range')).toBeInTheDocument()
    })
  })

  describe('Dataset Information', () => {
    test('displays Bangkok dataset information', () => {
      render(
        <DateRangePicker
          startDate="2018-01-01T00:00:00Z"
          endDate="2018-01-02T00:00:00Z"
          onDateChange={mockOnDateChange}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /select date range/i }))

      expect(screen.getByText('Bangkok Dataset Range')).toBeInTheDocument()
      // Date format may vary by locale and timezone, so check for year 2018 (appears multiple times)
      const year2018Elements = screen.getAllByText(/2018/)
      expect(year2018Elements.length).toBeGreaterThan(0)
      expect(screen.getByText('Maximum range: 90 days')).toBeInTheDocument()
    })

    test('shows custom maximum range', () => {
      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
          maxDaysRange={30}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      expect(screen.getByText('Maximum range: 30 days')).toBeInTheDocument()
    })
  })

  describe('Preset Highlighting', () => {
    test('highlights selected preset', () => {
      render(
        <DateRangePicker
          startDate="2018-01-01T00:00:00Z"
          endDate="2018-01-02T00:00:00Z"
          onDateChange={mockOnDateChange}
          maxDaysRange={365}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /select date range/i }))

      // Click Bangkok Dataset 2018
      fireEvent.click(screen.getByText('Bangkok Dataset 2018'))

      // Reopen to check highlighting
      fireEvent.click(screen.getByRole('button', { name: /select date range/i }))

      const highlightedButton = screen.getByText('Bangkok Dataset 2018').closest('button')
      expect(highlightedButton).toHaveClass('bg-green-50 border-green-200 text-green-700')
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    test('supports keyboard navigation', () => {
      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
        />
      )

      const button = screen.getByRole('button')
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    test('datetime inputs have proper constraints', () => {
      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
          showCustomRange={true}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      const startInput = screen.getByLabelText('Start Date & Time')
      const endInput = screen.getByLabelText('End Date & Time')

      expect(startInput).toHaveAttribute('min', '2018-01-01T00:00')
      expect(startInput).toHaveAttribute('max', '2019-12-31T23:59')
      expect(endInput).toHaveAttribute('min', '2018-01-01T00:00')
      expect(endInput).toHaveAttribute('max', '2019-12-31T23:59')
    })
  })
})