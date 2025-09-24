/**
 * Comprehensive Tests for ExecutiveSummary Component
 * Addresses Quinn's Critical Issue #1: Dashboard components lack comprehensive tests
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ExecutiveSummary from '../ExecutiveSummary'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: 'user-test',
        email: 'test@example.com',
        name: 'Test Executive',
        subscriptionTier: 'professional'
      }
    },
    status: 'authenticated'
  }))
}))

// Mock fetch for API calls
global.fetch = jest.fn()

const mockBuildingMetrics = [
  {
    id: 'hvac_efficiency',
    name: 'HVAC Efficiency',
    value: 87.5,
    status: 'good' as const,
    trend: 'up' as const,
    unit: '%',
    description: 'Heating, Ventilation, and Air Conditioning system efficiency',
    last_updated: '2025-09-22T14:00:00Z'
  },
  {
    id: 'energy_usage',
    name: 'Energy Usage',
    value: 245.8,
    status: 'excellent' as const,
    trend: 'down' as const,
    unit: 'kWh',
    description: 'Total building energy consumption',
    last_updated: '2025-09-22T14:00:00Z'
  }
]

const mockPerformanceMetrics = [
  {
    id: 'energy',
    name: 'Energy',
    current: 87.5,
    target: 90,
    confidence: 96,
    unit: '%',
    change: 2.3
  },
  {
    id: 'cost',
    name: 'Cost',
    current: 125000,
    target: 150000,
    confidence: 94,
    unit: '$',
    change: -15.2
  }
]

describe('ExecutiveSummary Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        buildingHealth: mockBuildingMetrics,
        performanceMetrics: mockPerformanceMetrics,
        overallScore: 87,
        lastUpdated: '2025-09-22T14:00:00Z'
      })
    })
  })

  describe('Component Rendering', () => {
    it('should render executive summary header correctly', async () => {
      render(<ExecutiveSummary />)

      expect(screen.getByText('Executive Summary')).toBeInTheDocument()
      expect(screen.getByText(/Bangkok CU-BEMS Facility/)).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('Building Health Overview')).toBeInTheDocument()
      })
    })

    it('should display building health metrics with proper status indicators', async () => {
      render(<ExecutiveSummary />)

      await waitFor(() => {
        expect(screen.getByText('HVAC Efficiency')).toBeInTheDocument()
        expect(screen.getByText('87.5%')).toBeInTheDocument()
        expect(screen.getByText('Energy Usage')).toBeInTheDocument()
        expect(screen.getByText('245.8 kWh')).toBeInTheDocument()
      })
    })

    it('should show performance metrics with confidence indicators', async () => {
      render(<ExecutiveSummary />)

      await waitFor(() => {
        expect(screen.getByText('96% confidence')).toBeInTheDocument()
        expect(screen.getByText('94% confidence')).toBeInTheDocument()
      })
    })
  })

  describe('Data Loading States', () => {
    it('should show loading state initially', () => {
      render(<ExecutiveSummary />)

      expect(screen.getByText('Loading building metrics...')).toBeInTheDocument()
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(<ExecutiveSummary />)

      await waitFor(() => {
        expect(screen.getByText(/Error loading metrics/)).toBeInTheDocument()
      })
    })

    it('should display retry button on error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'))

      render(<ExecutiveSummary />)

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i })
        expect(retryButton).toBeInTheDocument()
      })
    })
  })

  describe('Status Indicators', () => {
    it('should display correct status colors for different performance levels', async () => {
      render(<ExecutiveSummary />)

      await waitFor(() => {
        // Test status-based styling classes
        const hvacMetric = screen.getByText('HVAC Efficiency').closest('.metric-card')
        expect(hvacMetric).toHaveClass('status-good')

        const energyMetric = screen.getByText('Energy Usage').closest('.metric-card')
        expect(energyMetric).toHaveClass('status-excellent')
      })
    })

    it('should show correct trend indicators', async () => {
      render(<ExecutiveSummary />)

      await waitFor(() => {
        // Check for trend up/down indicators
        expect(screen.getByTestId('trend-up-hvac_efficiency')).toBeInTheDocument()
        expect(screen.getByTestId('trend-down-energy_usage')).toBeInTheDocument()
      })
    })
  })

  describe('Interactive Features', () => {
    it('should handle metric card clicks for drill-down', async () => {
      render(<ExecutiveSummary />)

      await waitFor(() => {
        const hvacCard = screen.getByText('HVAC Efficiency').closest('button')
        expect(hvacCard).toBeInTheDocument()

        fireEvent.click(hvacCard!)

        // Should show detailed view or navigate
        expect(screen.getByTestId('drill-down-hvac')).toBeInTheDocument()
      })
    })

    it('should refresh data when refresh button is clicked', async () => {
      render(<ExecutiveSummary />)

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i })
        fireEvent.click(refreshButton)

        expect(global.fetch).toHaveBeenCalledTimes(2) // Initial load + refresh
      })
    })

    it('should toggle between different view modes', async () => {
      render(<ExecutiveSummary />)

      await waitFor(() => {
        const detailButton = screen.getByRole('button', { name: /detailed view/i })
        fireEvent.click(detailButton)

        expect(screen.getByTestId('detailed-metrics-view')).toBeInTheDocument()
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

      render(<ExecutiveSummary />)

      await waitFor(() => {
        const container = screen.getByTestId('executive-summary-container')
        expect(container).toHaveClass('mobile-layout')
      })
    })

    it('should have touch-friendly button sizes on mobile', async () => {
      render(<ExecutiveSummary />)

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        buttons.forEach(button => {
          const styles = window.getComputedStyle(button)
          // Minimum 44px touch target
          expect(parseInt(styles.minHeight) || parseInt(styles.height)).toBeGreaterThanOrEqual(44)
        })
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<ExecutiveSummary />)

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument()
        expect(screen.getByRole('region', { name: 'Building Health Overview' })).toBeInTheDocument()
        expect(screen.getByRole('region', { name: 'Performance Metrics' })).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation', async () => {
      render(<ExecutiveSummary />)

      await waitFor(() => {
        const firstButton = screen.getAllByRole('button')[0]
        firstButton.focus()

        expect(document.activeElement).toBe(firstButton)

        // Test tab navigation
        fireEvent.keyDown(firstButton, { key: 'Tab' })
        expect(document.activeElement).not.toBe(firstButton)
      })
    })

    it('should have proper heading hierarchy', async () => {
      render(<ExecutiveSummary />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Executive Summary' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { level: 2, name: 'Building Health Overview' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { level: 2, name: 'Performance Metrics' })).toBeInTheDocument()
      })
    })
  })

  describe('Statistical Confidence Display', () => {
    it('should display confidence intervals with proper formatting', async () => {
      render(<ExecutiveSummary />)

      await waitFor(() => {
        expect(screen.getByText('96% confidence')).toBeInTheDocument()
        expect(screen.getByText('±2.1%')).toBeInTheDocument() // confidence interval
      })
    })

    it('should show statistical significance indicators', async () => {
      render(<ExecutiveSummary />)

      await waitFor(() => {
        expect(screen.getByText('Statistically Significant')).toBeInTheDocument()
        expect(screen.getByText('p < 0.01')).toBeInTheDocument()
      })
    })

    it('should provide business-friendly statistical explanations', async () => {
      render(<ExecutiveSummary />)

      await waitFor(() => {
        const helpIcon = screen.getByRole('button', { name: /statistical help/i })
        fireEvent.click(helpIcon)

        expect(screen.getByText(/These confidence levels indicate how reliable/)).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('should load within performance budget', async () => {
      const startTime = performance.now()

      render(<ExecutiveSummary />)

      await waitFor(() => {
        expect(screen.getByText('Building Health Overview')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const loadTime = endTime - startTime

      // Should load within 2 seconds (2000ms)
      expect(loadTime).toBeLessThan(2000)
    })

    it('should handle rapid successive API calls efficiently', async () => {
      const { rerender } = render(<ExecutiveSummary />)

      // Trigger multiple rapid re-renders
      for (let i = 0; i < 5; i++) {
        rerender(<ExecutiveSummary key={i} />)
      }

      await waitFor(() => {
        // Should not make more API calls than necessary (debouncing/throttling)
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Error Boundaries', () => {
    it('should handle component crashes gracefully', async () => {
      // Mock a component error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const ThrowError = () => {
        throw new Error('Component crashed')
      }

      const { container } = render(
        <div>
          <ExecutiveSummary />
          <ThrowError />
        </div>
      )

      // Should still render the executive summary despite other component errors
      await waitFor(() => {
        expect(container.querySelector('[data-testid="executive-summary-container"]')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })
})