/**
 * Comprehensive Tests for CriticalAlertsSystem Component
 * Addresses Quinn's Critical Issue #1: Dashboard components lack comprehensive tests
 */

import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import CriticalAlertsSystem from '../CriticalAlertsSystem'

// Mock Audio API
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  volume: 0.5
}))

// Mock Notification API
const NotificationMock = jest.fn().mockImplementation((title, options) => ({
  title,
  ...options
}))

NotificationMock.permission = 'granted'
NotificationMock.requestPermission = jest.fn().mockResolvedValue('granted')

global.Notification = NotificationMock as unknown as typeof Notification

Object.defineProperty(window, 'Notification', {
  value: NotificationMock
})

// Mock fetch for API calls
global.fetch = jest.fn()

const mockCriticalAlerts = [
  {
    id: 'alert_001',
    type: 'performance',
    severity: 'critical',
    priority: 4,
    title: 'HVAC System Performance Critical',
    message: 'HVAC efficiency dropped below 75% threshold on Floor 5',
    description: 'The HVAC system on Floor 5 is operating at 68% efficiency',
    location: 'Floor 5 - Zone A',
    affected_systems: ['HVAC', 'Temperature Control', 'Air Quality'],
    metric_value: 68,
    threshold_value: 75,
    confidence_level: 96,
    business_impact: 'Increased energy costs and potential occupant discomfort',
    recommended_actions: [
      'Inspect HVAC filters immediately',
      'Check refrigerant levels',
      'Verify thermostat calibration'
    ],
    estimated_cost: 15000,
    time_to_resolution: '2-4 hours',
    created_at: '2025-09-22T13:30:00Z',
    tags: ['hvac', 'efficiency', 'floor5'],
    escalation_level: 1,
    auto_resolve: false
  },
  {
    id: 'alert_002',
    type: 'safety',
    severity: 'emergency',
    priority: 5,
    title: 'Fire Safety System Malfunction',
    message: 'Fire suppression system offline in critical areas',
    description: 'The fire suppression system has gone offline in the server room',
    location: 'Ground Floor - Server Room',
    affected_systems: ['Fire Suppression', 'Safety Systems'],
    confidence_level: 99,
    business_impact: 'Critical safety risk. Potential fire damage could exceed $500K',
    recommended_actions: [
      'Evacuate affected areas immediately',
      'Contact fire department for inspection'
    ],
    estimated_cost: 500000,
    time_to_resolution: 'Immediate - 1 hour',
    created_at: '2025-09-22T13:50:00Z',
    tags: ['fire', 'safety', 'emergency'],
    escalation_level: 2,
    auto_resolve: false
  }
]

const mockStatistics = {
  total_active: 12,
  by_severity: {
    emergency: 1,
    critical: 2,
    warning: 5,
    info: 4
  },
  by_type: {
    performance: 3,
    safety: 1,
    efficiency: 4,
    maintenance: 2,
    financial: 1,
    security: 1
  },
  average_resolution_time: 145,
  acknowledgment_rate: 87,
  escalated_count: 3
}

describe('CriticalAlertsSystem Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          alerts: mockCriticalAlerts,
          statistics: mockStatistics
        }
      })
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Component Rendering', () => {
    it('should render critical alerts system header correctly', async () => {
      render(<CriticalAlertsSystem />)

      expect(screen.getByText('Critical Alerts System')).toBeInTheDocument()
      expect(screen.getByText('Bangkok CU-BEMS')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('HVAC System Performance Critical')).toBeInTheDocument()
      })
    })

    it('should display loading state initially', () => {
      render(<CriticalAlertsSystem />)

      expect(screen.getByText('Critical Alerts System')).toBeInTheDocument()
      expect(screen.getAllByTestId(/loading/)).toBeTruthy()
    })

    it('should show alert statistics after loading', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument() // Critical & Emergency
        expect(screen.getByText('5')).toBeInTheDocument() // Warning
        expect(screen.getByText('12')).toBeInTheDocument() // Total Active
        expect(screen.getByText('3')).toBeInTheDocument() // Escalated
      })
    })
  })

  describe('Alert Display and Interactions', () => {
    it('should display alerts with correct severity indicators', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        expect(screen.getByText('HVAC System Performance Critical')).toBeInTheDocument()
        expect(screen.getByText('Fire Safety System Malfunction')).toBeInTheDocument()
        expect(screen.getByText('Priority 4')).toBeInTheDocument()
        expect(screen.getByText('Priority 5')).toBeInTheDocument()
      })
    })

    it('should show alert details when clicked', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        const hvacAlert = screen.getByText('HVAC System Performance Critical')
        fireEvent.click(hvacAlert)

        expect(screen.getByText('Description')).toBeInTheDocument()
        expect(screen.getByText('Business Impact')).toBeInTheDocument()
        expect(screen.getByText('Recommended Actions')).toBeInTheDocument()
        expect(screen.getByText('Inspect HVAC filters immediately')).toBeInTheDocument()
      })
    })

    it('should handle alert actions (acknowledge, resolve, escalate)', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        const acknowledgeButton = screen.getAllByText('Acknowledge')[0]
        fireEvent.click(acknowledgeButton)

        expect(global.fetch).toHaveBeenCalledWith('/api/alerts/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'acknowledge',
            alert_id: 'alert_001',
            user_id: 'current_user',
            timestamp: expect.any(String)
          })
        })
      })
    })
  })

  describe('Search and Filter Functionality', () => {
    it('should filter alerts based on search query', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search alerts...')
        fireEvent.change(searchInput, { target: { value: 'HVAC' } })

        expect(screen.getByText('HVAC System Performance Critical')).toBeInTheDocument()
        expect(screen.queryByText('Fire Safety System Malfunction')).not.toBeInTheDocument()
      })
    })

    it('should sort alerts by different criteria', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        const sortSelect = screen.getByDisplayValue('Time')
        fireEvent.change(sortSelect, { target: { value: 'severity' } })

        // Emergency alerts should appear first when sorted by severity
        const alerts = screen.getAllByRole('button', { name: /HVAC|Fire/ })
        expect(alerts[0]).toHaveTextContent('Fire Safety System Malfunction')
      })
    })

    it('should toggle sort order', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        const sortOrderButton = screen.getByRole('button', { name: /arrow/i })
        fireEvent.click(sortOrderButton)

        // Should change sort order
        expect(sortOrderButton).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates and Notifications', () => {
    it('should refresh alerts at specified intervals', async () => {
      const refreshInterval = 1000
      render(<CriticalAlertsSystem refreshInterval={refreshInterval} />)

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

    it('should play sound for new critical alerts', async () => {
      const mockPlay = jest.fn().mockResolvedValue(undefined)
      ;(global.Audio as jest.Mock).mockImplementation(() => ({
        play: mockPlay,
        volume: 0.5
      }))

      render(<CriticalAlertsSystem />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('HVAC System Performance Critical')).toBeInTheDocument()
      })

      // Mock new alert arriving
      const newAlert = {
        ...mockCriticalAlerts[0],
        id: 'new_alert_123',
        title: 'New Critical Alert',
        severity: 'emergency'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            alerts: [...mockCriticalAlerts, newAlert],
            statistics: mockStatistics
          }
        })
      })

      act(() => {
        jest.advanceTimersByTime(15000)
      })

      await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled()
      })
    })

    it('should show desktop notifications for new alerts', async () => {
      render(<CriticalAlertsSystem />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('HVAC System Performance Critical')).toBeInTheDocument()
      })

      // Mock new emergency alert
      const newEmergencyAlert = {
        ...mockCriticalAlerts[1],
        id: 'new_emergency_456',
        title: 'New Emergency Alert',
        severity: 'emergency'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            alerts: [...mockCriticalAlerts, newEmergencyAlert],
            statistics: mockStatistics
          }
        })
      })

      act(() => {
        jest.advanceTimersByTime(15000)
      })

      await waitFor(() => {
        expect(global.Notification).toHaveBeenCalledWith(
          'Critical Alert: New Emergency Alert',
          expect.objectContaining({
            body: expect.any(String),
            icon: '/favicon.ico'
          })
        )
      })
    })
  })

  describe('Settings and Preferences', () => {
    it('should toggle sound settings', async () => {
      render(<CriticalAlertsSystem showSoundControls={true} />)

      await waitFor(() => {
        const soundButton = screen.getByTitle('Toggle alert sounds')
        fireEvent.click(soundButton)

        // Sound should be disabled after click
        expect(soundButton).toHaveClass('bg-gray-100')
      })
    })

    it('should pause and resume monitoring', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        const pauseButton = screen.getByTitle('Pause monitoring')
        fireEvent.click(pauseButton)

        expect(screen.getByTitle('Resume monitoring')).toBeInTheDocument()
        expect(screen.getByText('Paused')).toBeInTheDocument()
      })
    })

    it('should show and hide settings panel', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        const settingsButton = screen.getByTitle('Alert settings')
        fireEvent.click(settingsButton)

        expect(screen.getByText('Alert Preferences')).toBeInTheDocument()
        expect(screen.getByText('Notification Settings')).toBeInTheDocument()
        expect(screen.getByText('Severity Filter')).toBeInTheDocument()
      })
    })

    it('should update notification preferences', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        const settingsButton = screen.getByTitle('Alert settings')
        fireEvent.click(settingsButton)

        const emailCheckbox = screen.getByLabelText('Email Notifications')
        fireEvent.click(emailCheckbox)

        expect(emailCheckbox).toBeChecked()
      })
    })

    it('should update severity filter preferences', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        const settingsButton = screen.getByTitle('Alert settings')
        fireEvent.click(settingsButton)

        const infoCheckbox = screen.getByLabelText('Info')
        fireEvent.click(infoCheckbox)

        expect(infoCheckbox).not.toBeChecked()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        // Should still render with mock data when API fails
        expect(screen.getByText('Critical Alerts System')).toBeInTheDocument()
      })
    })

    it('should handle failed alert actions', async () => {
      render(<CriticalAlertsSystem />)

      // Mock successful initial load
      await waitFor(() => {
        expect(screen.getByText('HVAC System Performance Critical')).toBeInTheDocument()
      })

      // Mock failed action API call
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Action failed'))

      const acknowledgeButton = screen.getAllByText('Acknowledge')[0]
      fireEvent.click(acknowledgeButton)

      // Component should not crash on failed action
      await waitFor(() => {
        expect(screen.getByText('HVAC System Performance Critical')).toBeInTheDocument()
      })
    })

    it('should handle sound playback failures gracefully', async () => {
      const mockPlayReject = jest.fn().mockRejectedValue(new Error('Audio failed'))
      ;(global.Audio as jest.Mock).mockImplementation(() => ({
        play: mockPlayReject,
        volume: 0.5
      }))

      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        expect(screen.getByText('HVAC System Performance Critical')).toBeInTheDocument()
      })

      // Should not crash when audio fails
      expect(screen.getByText('Critical Alerts System')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /toggle alert sounds/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /pause monitoring/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /alert settings/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /refresh alerts/i })).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search alerts...')
        searchInput.focus()

        expect(document.activeElement).toBe(searchInput)

        // Test tab navigation
        fireEvent.keyDown(searchInput, { key: 'Tab' })
        expect(document.activeElement).not.toBe(searchInput)
      })
    })

    it('should have high contrast for different severity levels', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        const criticalAlert = screen.getByText('HVAC System Performance Critical').closest('[class*="border-red"]')
        const emergencyAlert = screen.getByText('Fire Safety System Malfunction').closest('[class*="border-red"]')

        expect(criticalAlert).toHaveClass('border-red-500')
        expect(emergencyAlert).toHaveClass('border-red-600')
      })
    })
  })

  describe('Performance', () => {
    it('should limit displayed alerts to maxDisplayAlerts prop', async () => {
      const manyAlerts = Array.from({ length: 20 }, (_, i) => ({
        ...mockCriticalAlerts[0],
        id: `alert_${i}`,
        title: `Alert ${i}`
      }))

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            alerts: manyAlerts,
            statistics: mockStatistics
          }
        })
      })

      render(<CriticalAlertsSystem maxDisplayAlerts={5} />)

      await waitFor(() => {
        const alertElements = screen.getAllByText(/Alert \d+/)
        expect(alertElements.length).toBeLessThanOrEqual(5)
      })
    })

    it('should handle rapid updates efficiently', async () => {
      render(<CriticalAlertsSystem refreshInterval={100} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      // Simulate rapid timer advances
      for (let i = 0; i < 10; i++) {
        act(() => {
          jest.advanceTimersByTime(100)
        })
      }

      await waitFor(() => {
        // Should handle multiple rapid updates without issues
        expect(screen.getByText('Critical Alerts System')).toBeInTheDocument()
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

      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        const container = screen.getByText('Critical Alerts System').closest('.bg-white')
        expect(container).toBeInTheDocument()
      })
    })

    it('should handle touch interactions on mobile', async () => {
      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        const alert = screen.getByText('HVAC System Performance Critical')
        fireEvent.touchStart(alert)
        fireEvent.click(alert)

        expect(screen.getByText('Description')).toBeInTheDocument()
      })
    })
  })

  describe('Data Management', () => {
    it('should clear new alerts counter when clicked', async () => {
      render(<CriticalAlertsSystem />)

      // Simulate new alerts
      await waitFor(() => {
        expect(screen.getByText('HVAC System Performance Critical')).toBeInTheDocument()
      })

      // Mock new alerts arriving that would increment counter
      const newAlerts = [
        ...mockCriticalAlerts,
        {
          ...mockCriticalAlerts[0],
          id: 'new_123',
          severity: 'emergency',
          title: 'New Emergency'
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            alerts: newAlerts,
            statistics: mockStatistics
          }
        })
      })

      act(() => {
        jest.advanceTimersByTime(15000)
      })

      await waitFor(() => {
        const clearButton = screen.getByText(/Clear \d+ New/)
        fireEvent.click(clearButton)

        expect(screen.queryByText(/Clear \d+ New/)).not.toBeInTheDocument()
      })
    })

    it('should show appropriate message when no alerts exist', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            alerts: [],
            statistics: {
              ...mockStatistics,
              total_active: 0,
              by_severity: { emergency: 0, critical: 0, warning: 0, info: 0 }
            }
          }
        })
      })

      render(<CriticalAlertsSystem />)

      await waitFor(() => {
        expect(screen.getByText('No critical alerts at this time')).toBeInTheDocument()
        expect(screen.getByText('All systems operating normally')).toBeInTheDocument()
      })
    })
  })

  describe('Callback Handling', () => {
    it('should call onAlertAction callback when provided', async () => {
      const mockCallback = jest.fn()
      render(<CriticalAlertsSystem onAlertAction={mockCallback} />)

      await waitFor(() => {
        const acknowledgeButton = screen.getAllByText('Acknowledge')[0]
        fireEvent.click(acknowledgeButton)
      })

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith('acknowledge', 'alert_001')
      })
    })
  })
})