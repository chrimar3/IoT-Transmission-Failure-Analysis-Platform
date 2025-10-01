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

      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('1/14/2025 - 1/15/2025')).toBeInTheDocument()
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

      expect(screen.getByText(/1\/15\/2025 9:00:00 AM - 5:00:00 PM/)).toBeInTheDocument()
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

      fireEvent.click(screen.getByRole('button'))

      expect(screen.getByText('Last Hour')).toBeInTheDocument()
      expect(screen.getByText('Last 6 Hours')).toBeInTheDocument()
      expect(screen.getByText('Last 24 Hours')).toBeInTheDocument()
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
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
        />
      )

      fireEvent.click(screen.getByRole('button'))
      fireEvent.click(screen.getByText('Last Hour'))

      expect(mockOnDateChange).toHaveBeenCalledWith(
        expect.stringMatching(/2025-01-15T11:00:00/),
        expect.stringMatching(/2025-01-15T12:00:00/)
      )
    })

    test('selects Bangkok dataset preset', () => {
      render(
        <DateRangePicker
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
        />
      )

      fireEvent.click(screen.getByRole('button'))
      fireEvent.click(screen.getByText('Bangkok Dataset 2018'))

      expect(mockOnDateChange).toHaveBeenCalledWith(
        '2018-01-01T00:00:00.000Z',
        '2018-12-31T23:59:59.000Z'
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
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
          showCustomRange={true}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      const startInput = screen.getByLabelText('Start Date & Time')
      const endInput = screen.getByLabelText('End Date & Time')

      fireEvent.change(startInput, { target: { value: '2018-06-01T10:00' } })
      fireEvent.change(endInput, { target: { value: '2018-06-02T14:00' } })

      fireEvent.click(screen.getByText('Apply Range'))

      expect(mockOnDateChange).toHaveBeenCalledWith(
        expect.stringMatching(/2018-06-01T10:00/),
        expect.stringMatching(/2018-06-02T14:00/)
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
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      expect(screen.getByText('Bangkok Dataset Range')).toBeInTheDocument()
      expect(screen.getByText('1/1/2018 - 12/31/2019')).toBeInTheDocument()
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
          startDate="2025-01-14T12:00:00Z"
          endDate="2025-01-15T12:00:00Z"
          onDateChange={mockOnDateChange}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      const lastDayButton = screen.getByText('Last 24 Hours')
      fireEvent.click(lastDayButton)

      // Reopen to check highlighting
      fireEvent.click(screen.getByRole('button'))

      const highlightedButton = screen.getByText('Last 24 Hours').closest('button')
      expect(highlightedButton).toHaveClass('bg-blue-50 border-blue-200 text-blue-700')
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