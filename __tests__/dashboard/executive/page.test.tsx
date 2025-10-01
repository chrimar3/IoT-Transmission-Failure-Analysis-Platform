/**
 * Tests for Epic 2 Story 2.1: Executive Dashboard with Statistical Validation
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import ExecutiveStatisticalDashboard from '../../../app/dashboard/executive/page'

// Mock NextAuth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock fetch
global.fetch = jest.fn()

describe('ExecutiveStatisticalDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful API response
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          // Mock data structure would go here
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

      render(<ExecutiveStatisticalDashboard />)

      expect(screen.getByText('Loading Bangkok statistical insights...')).toBeInTheDocument()
    })

    it('should redirect to signin when unauthenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn()
      })

      render(<ExecutiveStatisticalDashboard />)

      expect(screen.getByText('Authentication required to access executive dashboard')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    })

    it('should load dashboard when authenticated', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: '2025-12-31'
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<ExecutiveStatisticalDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Executive Dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('Professional Tier Access Control', () => {
    it('should show upgrade prompts for free tier users', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'free' },
          expires: '2025-12-31'
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<ExecutiveStatisticalDashboard />)

      await waitFor(() => {
        const upgradeButtons = screen.getAllByText('Upgrade for €29/month')
        expect(upgradeButtons).toHaveLength(3) // Three statistical metric cards for FREE users
      })
    })

    it('should show professional badge for paid users', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: '2025-12-31'
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<ExecutiveStatisticalDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Professional')).toBeInTheDocument()
      })
    })

    it('should open upgrade modal when upgrade prompt clicked', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'free' },
          expires: '2025-12-31'
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<ExecutiveStatisticalDashboard />)

      await waitFor(() => {
        const upgradeButtons = screen.getAllByText('Upgrade for €29/month')
        fireEvent.click(upgradeButtons[0]) // Click first upgrade button
      })

      expect(screen.getByText('Upgrade to Professional')).toBeInTheDocument()
    })
  })

  describe('Statistical Validation Display', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: '2025-12-31'
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should display building health efficiency with confidence intervals', async () => {
      render(<ExecutiveStatisticalDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Building Health Efficiency')).toBeInTheDocument()
        expect(screen.getAllByText('95% Confidence Interval')).toHaveLength(3) // Three statistical cards show confidence intervals
      })
    })

    it('should display Bangkok dataset insights', async () => {
      render(<ExecutiveStatisticalDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Bangkok University Dataset/)).toBeInTheDocument()
        expect(screen.getByText(/124.9M records analyzed/)).toBeInTheDocument()
      })
    })

    it('should show regulatory validation status', async () => {
      render(<ExecutiveStatisticalDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Regulatory-Grade Statistical Validation')).toBeInTheDocument()
        expect(screen.getByText(/95% confidence intervals/)).toBeInTheDocument()
      })
    })

    it('should display floor performance rankings for professional users', async () => {
      render(<ExecutiveStatisticalDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Floor Performance Rankings')).toBeInTheDocument()
        expect(screen.getByText('7-Floor Comparative Analysis')).toBeInTheDocument()
      })
    })

    it('should show equipment failure risk analysis', async () => {
      render(<ExecutiveStatisticalDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Equipment Failure Risk Analysis')).toBeInTheDocument()
        expect(screen.getByText('HVAC Systems')).toBeInTheDocument()
        expect(screen.getByText('Power Systems')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: '2025-12-31'
        },
        status: 'authenticated',
        update: jest.fn()
      })

      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(<ExecutiveStatisticalDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/API Error/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
      })
    })

    it('should retry data fetch when retry button clicked', async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: '2025-12-31'
        },
        status: 'authenticated',
        update: jest.fn()
      })

      // First call fails, second call succeeds
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: {} })
        })

      render(<ExecutiveStatisticalDashboard />)

      // Wait for initial error to appear
      await waitFor(() => {
        expect(screen.getByText(/API Error/)).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByRole('button', { name: 'Retry' })
      fireEvent.click(retryButton)

      // Wait for retry to complete
      await waitFor(() => {
        expect(screen.getByText('Executive Dashboard')).toBeInTheDocument()
      })

      expect(global.fetch).toHaveBeenCalledTimes(2) // Initial failed call + retry success
    })
  })

  describe('Bangkok Dataset Integration', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: '2025-12-31'
        },
        status: 'authenticated',
        update: jest.fn()
      })
    })

    it('should fetch data from correct API endpoint', async () => {
      render(<ExecutiveStatisticalDashboard />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/readings/summary?executive=true&statistical=true')
      })
    })

    it('should display data quality score', async () => {
      render(<ExecutiveStatisticalDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/96.8% Data Quality/)).toBeInTheDocument()
      })
    })

    it('should show statistical methodology information', async () => {
      render(<ExecutiveStatisticalDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Wilson Score Confidence Intervals')).toBeInTheDocument()
        expect(screen.getByText('Bonferroni Correction')).toBeInTheDocument()
        expect(screen.getByText('Bootstrap Validation')).toBeInTheDocument()
      })
    })
  })

  describe('Performance Requirements', () => {
    it('should render within performance budget', async () => {
      const start = performance.now()

      mockUseSession.mockReturnValue({
        data: {
          user: { id: '1', subscriptionTier: 'professional' },
          expires: '2025-12-31'
        },
        status: 'authenticated',
        update: jest.fn()
      })

      render(<ExecutiveStatisticalDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Executive Dashboard')).toBeInTheDocument()
      })

      const renderTime = performance.now() - start
      expect(renderTime).toBeLessThan(100) // Should render quickly once data loaded
    })
  })
})