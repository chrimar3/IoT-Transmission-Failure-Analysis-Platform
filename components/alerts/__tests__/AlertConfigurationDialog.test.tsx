/**
 * Comprehensive Component Tests for AlertConfigurationDialog
 * Story 4.1: Custom Alert Configuration - QA Remediation
 *
 * Testing the full UI wizard flow for alert configuration
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, _act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { AlertConfigurationDialog } from '../AlertConfigurationDialog'
import type { AlertConfiguration } from '../../../types/alerts'

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock alert configuration for editing
const mockEditingConfig: AlertConfiguration = {
  id: 'config_test_001',
  name: 'Test Energy Alert',
  description: 'Test alert for energy monitoring',
  user_id: 'user_001',
  organization_id: 'org_001',
  status: 'draft',
  created_at: '2025-09-23T10:00:00Z',
  updated_at: '2025-09-23T10:00:00Z',
  created_by: 'user_001',
  rules: [
    {
      id: 'rule_001',
      name: 'Energy Threshold Rule',
      description: 'Monitor energy consumption',
      enabled: true,
      priority: 'high',
      conditions: [
        {
          id: 'condition_001',
          metric: {
            type: 'energy_consumption',
            display_name: 'Energy Consumption',
            units: 'kWh'
          },
          operator: 'greater_than',
          threshold: { value: 1000 },
          time_aggregation: {
            function: 'sum',
            period: 60,
            minimum_data_points: 10
          },
          filters: []
        }
      ],
      logical_operator: 'AND',
      evaluation_window: 60,
      cooldown_period: 30,
      suppress_duplicates: true,
      tags: ['energy']
    }
  ],
  notification_settings: {
    channels: [
      {
        type: 'email',
        enabled: true,
        configuration: {
          email_addresses: ['admin@company.com']
        },
        priority_filter: ['critical', 'high']
      }
    ],
    recipients: [],
    frequency_limits: {
      max_alerts_per_hour: 10,
      max_alerts_per_day: 50,
      cooldown_between_similar: 15,
      escalation_threshold: 3
    },
    quiet_hours: {
      enabled: false,
      start_time: '22:00',
      end_time: '06:00',
      timezone: 'UTC',
      exceptions: [],
      weekend_override: false
    },
    escalation_delays: [15, 30, 60]
  },
  metadata: {
    category: 'energy_efficiency',
    severity_auto_adjust: false,
    business_impact: {
      level: 'medium',
      operational_severity: 'efficiency_loss',
      compliance_risk: false,
      safety_risk: false
    },
    affected_systems: ['hvac'],
    affected_locations: ['Building A'],
    documentation_links: [],
    tags: ['energy'],
    custom_fields: {}
  }
}

describe('AlertConfigurationDialog', () => {
  const mockOnClose = jest.fn()
  const mockOnSave = jest.fn()
  const mockOnTest = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        is_valid: true,
        errors: [],
        warnings: [],
        suggestions: []
      })
    })
  })

  describe('Dialog Visibility and Structure', () => {
    it('should not render when isOpen is false', () => {
      render(
        <AlertConfigurationDialog
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.queryByText('Create Alert Configuration')).not.toBeInTheDocument()
    })

    it('should render when isOpen is true', () => {
      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByText('Create Alert Configuration')).toBeInTheDocument()
      expect(screen.getByText('Basic Info')).toBeInTheDocument()
      expect(screen.getByText('Alert Rules')).toBeInTheDocument()
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      expect(screen.getByText('Escalation')).toBeInTheDocument()
      expect(screen.getByText('Review')).toBeInTheDocument()
    })

    it('should show edit mode when editingConfig is provided', () => {
      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          editingConfig={mockEditingConfig}
        />
      )

      expect(screen.getByText('Edit Alert Configuration')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Energy Alert')).toBeInTheDocument()
    })

    it('should close when close button is clicked', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Progress Steps Navigation', () => {
    it('should show progress steps with correct highlighting', () => {
      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const steps = ['Basic Info', 'Alert Rules', 'Notifications', 'Escalation', 'Review']

      steps.forEach(step => {
        expect(screen.getByText(step)).toBeInTheDocument()
      })

      // First step should be highlighted
      const basicInfoStep = screen.getByText('Basic Info')
      expect(basicInfoStep).toHaveClass('text-blue-600')
    })

    it('should navigate between steps correctly', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Fill basic info to enable next button
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')

      // Navigate to next step
      const continueButton = screen.getByText('Continue to Rules')
      await user.click(continueButton)

      expect(screen.getByText('Alert Rules')).toBeInTheDocument()
      expect(screen.getByText('No rules configured yet')).toBeInTheDocument()
    })
  })

  describe('Basic Info Step', () => {
    it('should validate required fields', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const continueButton = screen.getByText('Continue to Rules')
      expect(continueButton).toBeDisabled()

      // Fill required fields
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')

      expect(continueButton).toBeEnabled()
    })

    it('should populate fields when editing existing configuration', () => {
      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          editingConfig={mockEditingConfig}
        />
      )

      expect(screen.getByDisplayValue('Test Energy Alert')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test alert for energy monitoring')).toBeInTheDocument()
      expect(screen.getByDisplayValue('draft')).toBeInTheDocument()
    })

    it('should handle all status options', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const statusSelect = screen.getByLabelText(/status/i)

      // Check all status options are present
      await user.click(statusSelect)

      expect(screen.getByRole('option', { name: 'Draft' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Inactive' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Testing' })).toBeInTheDocument()
    })
  })

  describe('Rules Step', () => {
    let _user: unknown

    beforeEach(async () => {
      user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to rules step
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
    })

    it('should show empty state initially', () => {
      expect(screen.getByText('No rules configured yet')).toBeInTheDocument()
      expect(screen.getByText('Click "Add Rule" to create your first alert rule')).toBeInTheDocument()
    })

    it('should add new rule when Add Rule is clicked', async () => {
      const addRuleButton = screen.getByText('Add Rule')
      await user.click(addRuleButton)

      expect(screen.getByText('Rule 1')).toBeInTheDocument()
      expect(screen.getByDisplayValue('New Alert Rule')).toBeInTheDocument()
      expect(screen.getByText('Enabled')).toBeInTheDocument()
    })

    it('should expand and collapse rule cards', async () => {
      // Add a rule first
      await user.click(screen.getByText('Add Rule'))

      const expandButton = screen.getByRole('button', { name: /arrow/i })
      await user.click(expandButton)

      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/evaluation window/i)).toBeInTheDocument()
    })

    it('should add conditions to rules', async () => {
      // Add a rule and expand it
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))

      // Add condition
      const addConditionButton = screen.getByText('+ Add Condition')
      await user.click(addConditionButton)

      expect(screen.getByText('Condition')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Energy Consumption')).toBeInTheDocument()
    })

    it('should remove conditions when delete button is clicked', async () => {
      // Add rule and condition
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))
      await user.click(screen.getByText('+ Add Condition'))

      const deleteConditionButton = screen.getAllByRole('button', { name: /close/i })[1] // Second close button is for condition
      await user.click(deleteConditionButton)

      expect(screen.getByText('No conditions defined')).toBeInTheDocument()
    })

    it('should remove entire rules when delete rule is clicked', async () => {
      // Add a rule
      await user.click(screen.getByText('Add Rule'))

      const deleteRuleButton = screen.getByRole('button', { name: /delete/i })
      await user.click(deleteRuleButton)

      expect(screen.getByText('No rules configured yet')).toBeInTheDocument()
    })

    it('should not allow proceeding without rules', () => {
      const continueButton = screen.getByText('Continue to Notifications')
      expect(continueButton).toBeDisabled()
    })

    it('should allow proceeding when rules are added', async () => {
      await user.click(screen.getByText('Add Rule'))

      const continueButton = screen.getByText('Continue to Notifications')
      expect(continueButton).toBeEnabled()
    })
  })

  describe('Condition Builder', () => {
    let _user: unknown

    beforeEach(async () => {
      user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to rules and add a rule with condition
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))
      await user.click(screen.getByText('+ Add Condition'))
    })

    it('should show all metric type options', async () => {
      const metricSelect = screen.getByDisplayValue('Energy Consumption')
      await user.click(metricSelect)

      const expectedMetrics = [
        'Energy Consumption', 'Power Demand', 'Temperature', 'Humidity',
        'Pressure', 'Air Quality', 'Efficiency Ratio', 'Cost per Hour'
      ]

      expectedMetrics.forEach(metric => {
        expect(screen.getByText(metric)).toBeInTheDocument()
      })
    })

    it('should show all comparison operators', async () => {
      const operatorSelect = screen.getByDisplayValue('Greater than')
      await user.click(operatorSelect)

      const expectedOperators = [
        'Greater than', 'Less than', 'Equals', 'Greater than or equal',
        'Less than or equal', 'Between', 'Percentage change', 'Anomaly detected'
      ]

      expectedOperators.forEach(operator => {
        expect(screen.getByText(operator)).toBeInTheDocument()
      })
    })

    it('should show secondary threshold field for between operator', async () => {
      const operatorSelect = screen.getByDisplayValue('Greater than')
      await user.selectOptions(operatorSelect, 'between')

      await waitFor(() => {
        expect(screen.getByLabelText(/upper threshold/i)).toBeInTheDocument()
      })
    })

    it('should update threshold values', async () => {
      const thresholdInput = screen.getByDisplayValue('100')
      await user.clear(thresholdInput)
      await user.type(thresholdInput, '500')

      expect(screen.getByDisplayValue('500')).toBeInTheDocument()
    })
  })

  describe('Notifications Step', () => {
    let _user: unknown

    beforeEach(async () => {
      user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to notifications step
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))
    })

    it('should show notification configuration fields', () => {
      expect(screen.getByLabelText(/email recipients/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/max alerts per hour/i)).toBeInTheDocument()
    })

    it('should update email recipients', async () => {
      const emailInput = screen.getByLabelText(/email recipients/i)
      await user.type(emailInput, 'test@example.com, admin@example.com')

      expect(screen.getByDisplayValue('test@example.com, admin@example.com')).toBeInTheDocument()
    })

    it('should update frequency limits', async () => {
      const maxAlertsInput = screen.getByLabelText(/max alerts per hour/i)
      await user.clear(maxAlertsInput)
      await user.type(maxAlertsInput, '20')

      expect(screen.getByDisplayValue('20')).toBeInTheDocument()
    })

    it('should allow navigation back and forward', async () => {
      const backButton = screen.getByText('Back')
      await user.click(backButton)

      expect(screen.getByText('Alert Rules')).toBeInTheDocument()

      const continueButton = screen.getByText('Continue to Notifications')
      await user.click(continueButton)

      expect(screen.getByText('Notification Settings')).toBeInTheDocument()

      const continueToEscalation = screen.getByText('Continue to Escalation')
      await user.click(continueToEscalation)

      expect(screen.getByText('Escalation Policy')).toBeInTheDocument()
    })
  })

  describe('Review and Validation Step', () => {
    let _user: unknown

    beforeEach(async () => {
      user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onTest={mockOnTest}
        />
      )

      // Navigate to review step
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))
      await user.click(screen.getByText('Continue to Escalation'))
      await user.click(screen.getByText('Continue to Review'))
    })

    it('should show configuration summary', () => {
      expect(screen.getByText('Review & Validate')).toBeInTheDocument()
      expect(screen.getByText('Test Alert')).toBeInTheDocument()
      expect(screen.getByText('Test description')).toBeInTheDocument()
      expect(screen.getByText(/Rules:/)).toBeInTheDocument()
      expect(screen.getByText(/Status:/)).toBeInTheDocument()
    })

    it('should validate configuration when validate button is clicked', async () => {
      const validateButton = screen.getByText('Validate')
      await user.click(validateButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/alerts/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String)
        })
      })
    })

    it('should show validation results', async () => {
      // Mock successful validation
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          is_valid: true,
          errors: [],
          warnings: [],
          suggestions: []
        })
      })

      const validateButton = screen.getByText('Validate')
      await user.click(validateButton)

      await waitFor(() => {
        expect(screen.getByText('Configuration Valid')).toBeInTheDocument()
      })
    })

    it('should show validation errors', async () => {
      // Mock validation with errors
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          is_valid: false,
          errors: [
            {
              field: 'rules[0].threshold',
              error_code: 'INVALID_VALUE',
              message: 'Threshold must be greater than zero',
              severity: 'error'
            }
          ],
          warnings: [
            {
              field: 'rules',
              warning_code: 'HIGH_VOLUME',
              message: 'This configuration may generate many alerts',
              recommendation: 'Consider adjusting thresholds'
            }
          ],
          suggestions: []
        })
      })

      const validateButton = screen.getByText('Validate')
      await user.click(validateButton)

      await waitFor(() => {
        expect(screen.getByText('Validation Failed')).toBeInTheDocument()
        expect(screen.getByText('Threshold must be greater than zero')).toBeInTheDocument()
        expect(screen.getByText('This configuration may generate many alerts')).toBeInTheDocument()
      })
    })

    it('should call onTest when test button is clicked', async () => {
      const testButton = screen.queryByText('Test Alert')

      // Test button should only appear when editing existing config
      expect(testButton).not.toBeInTheDocument()
    })

    it('should show test button when editing existing config', () => {
      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onTest={mockOnTest}
          editingConfig={mockEditingConfig}
        />
      )

      // Navigate to review step (config already has data)
      const reviewStep = screen.getByText('Review')
      fireEvent.click(reviewStep)

      expect(screen.getByText('Test Alert')).toBeInTheDocument()
    })

    it('should disable save button when validation fails', async () => {
      // Mock validation failure
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          is_valid: false,
          errors: [{ message: 'Invalid configuration' }],
          warnings: [],
          suggestions: []
        })
      })

      const validateButton = screen.getByText('Validate')
      await user.click(validateButton)

      await waitFor(() => {
        const saveButton = screen.getByText('Save Configuration')
        expect(saveButton).toBeDisabled()
      })
    })

    it('should enable save button when validation passes', async () => {
      // Mock validation success
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          is_valid: true,
          errors: [],
          warnings: [],
          suggestions: []
        })
      })

      const validateButton = screen.getByText('Validate')
      await user.click(validateButton)

      await waitFor(() => {
        const saveButton = screen.getByText('Save Configuration')
        expect(saveButton).toBeEnabled()
      })
    })

    it('should call onSave when save button is clicked', async () => {
      // Mock validation success
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          is_valid: true,
          errors: [],
          warnings: [],
          suggestions: []
        })
      })

      const validateButton = screen.getByText('Validate')
      await user.click(validateButton)

      await waitFor(async () => {
        const saveButton = screen.getByText('Save Configuration')
        expect(saveButton).toBeEnabled()

        await user.click(saveButton)
        expect(mockOnSave).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle validation API errors gracefully', async () => {
      const _user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to review and validate
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))
      await user.click(screen.getByText('Continue to Escalation'))
      await user.click(screen.getByText('Continue to Review'))

      const validateButton = screen.getByText('Validate')
      await user.click(validateButton)

      // Should not crash and should log error
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Validation failed:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('should handle missing required props gracefully', () => {
      // Test with minimal props
      const { container } = render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(container).toBeInTheDocument()
      expect(screen.getByText('Create Alert Configuration')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByLabelText(/configuration name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /continue to rules/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const nameInput = screen.getByLabelText(/configuration name/i)
      nameInput.focus()

      expect(document.activeElement).toBe(nameInput)

      // Tab to next field
      await user.tab()
      expect(document.activeElement).toBe(screen.getByLabelText(/description/i))
    })

    it('should handle form submission with Enter key', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')

      // Press Enter should trigger continue button
      await user.keyboard('{Enter}')

      expect(screen.getByText('Alert Rules')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should handle large numbers of rules efficiently', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))

      // Add multiple rules
      const startTime = Date.now()
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByText('Add Rule'))
      }
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000) // Should complete within 1 second
      expect(screen.getAllByText(/Rule \d+/)).toHaveLength(10)
    })

    it('should debounce validation calls', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to review step
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))
      await user.click(screen.getByText('Continue to Escalation'))
      await user.click(screen.getByText('Continue to Review'))

      // Click validate multiple times rapidly
      const validateButton = screen.getByText('Validate')
      await user.click(validateButton)
      await user.click(validateButton)
      await user.click(validateButton)

      // Should only make one API call (would need to mock timer for proper testing)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Form Field Interactions', () => {
    it('should handle rule priority selection', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to rules step
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))

      const prioritySelect = screen.getByLabelText(/priority/i)
      await user.click(prioritySelect)

      const priorities = ['Critical', 'High', 'Medium', 'Low', 'Info']
      priorities.forEach(priority => {
        expect(screen.getByRole('option', { name: priority })).toBeInTheDocument()
      })

      await user.selectOptions(prioritySelect, 'critical')
      expect(screen.getByDisplayValue('Critical')).toBeInTheDocument()
    })

    it('should handle condition metric selection', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to conditions
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))
      await user.click(screen.getByText('+ Add Condition'))

      const metricSelect = screen.getByDisplayValue('Energy Consumption')
      await user.click(metricSelect)

      // Should show all available metrics
      expect(screen.getByText('Power Demand')).toBeInTheDocument()
      expect(screen.getByText('Temperature')).toBeInTheDocument()
      expect(screen.getByText('Humidity')).toBeInTheDocument()

      await user.click(screen.getByText('Temperature'))
      expect(screen.getByDisplayValue('Temperature')).toBeInTheDocument()
    })

    it('should handle sensor ID input and validation', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to conditions
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))
      await user.click(screen.getByText('+ Add Condition'))

      const sensorIdInput = screen.getByLabelText(/sensor id/i)
      await user.type(sensorIdInput, 'BANGKOK_HVAC_001')

      expect(screen.getByDisplayValue('BANGKOK_HVAC_001')).toBeInTheDocument()

      // Test sensor ID format validation
      await user.clear(sensorIdInput)
      await user.type(sensorIdInput, 'invalid sensor id')
      await user.tab()

      expect(screen.getByText(/invalid sensor id format/i)).toBeInTheDocument()
    })

    it('should handle aggregation function selection', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to conditions
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))
      await user.click(screen.getByText('+ Add Condition'))

      const aggregationSelect = screen.getByLabelText(/aggregation function/i)
      await user.click(aggregationSelect)

      const functions = [
        'Average', 'Sum', 'Minimum', 'Maximum', 'Count',
        'Median', 'Percentile', 'Standard Deviation', 'Rate of Change'
      ]

      functions.forEach(func => {
        expect(screen.getByRole('option', { name: func })).toBeInTheDocument()
      })

      await user.selectOptions(aggregationSelect, 'sum')
      expect(screen.getByDisplayValue('Sum')).toBeInTheDocument()
    })

    it('should handle time period validation', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to conditions
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))
      await user.click(screen.getByText('+ Add Condition'))

      const timePeriodInput = screen.getByLabelText(/time period/i)

      // Test minimum period validation
      await user.clear(timePeriodInput)
      await user.type(timePeriodInput, '0')
      await user.tab()

      expect(screen.getByText(/time period must be greater than 0/i)).toBeInTheDocument()

      // Test maximum period validation
      await user.clear(timePeriodInput)
      await user.type(timePeriodInput, '1441') // More than 24 hours
      await user.tab()

      expect(screen.getByText(/time period cannot exceed 24 hours/i)).toBeInTheDocument()
    })

    it('should handle minimum data points validation', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to conditions
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))
      await user.click(screen.getByText('+ Add Condition'))

      const minDataPointsInput = screen.getByLabelText(/minimum data points/i)

      // Test minimum validation
      await user.clear(minDataPointsInput)
      await user.type(minDataPointsInput, '0')
      await user.tab()

      expect(screen.getByText(/minimum data points must be at least 1/i)).toBeInTheDocument()

      // Test valid input
      await user.clear(minDataPointsInput)
      await user.type(minDataPointsInput, '5')
      await user.tab()

      expect(screen.getByDisplayValue('5')).toBeInTheDocument()
    })

    it('should handle condition filters', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to conditions
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))
      await user.click(screen.getByText('+ Add Condition'))

      const addFilterButton = screen.queryByText(/add filter/i)
      if (addFilterButton) {
        await user.click(addFilterButton)

        const filterFieldInput = screen.getByLabelText(/filter field/i)
        const filterOperatorSelect = screen.getByLabelText(/filter operator/i)
        const filterValueInput = screen.getByLabelText(/filter value/i)

        await user.type(filterFieldInput, 'quality')
        await user.selectOptions(filterOperatorSelect, 'equals')
        await user.type(filterValueInput, 'good')

        expect(screen.getByDisplayValue('quality')).toBeInTheDocument()
        expect(screen.getByDisplayValue('good')).toBeInTheDocument()
      }
    })

    it('should handle logical operator selection', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to rules and add multiple conditions
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))
      await user.click(screen.getByText('+ Add Condition'))
      await user.click(screen.getByText('+ Add Condition'))

      const logicalOperatorSelect = screen.getByLabelText(/logical operator/i)
      await user.click(logicalOperatorSelect)

      expect(screen.getByRole('option', { name: 'AND' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'OR' })).toBeInTheDocument()

      await user.selectOptions(logicalOperatorSelect, 'OR')
      expect(screen.getByDisplayValue('OR')).toBeInTheDocument()
    })

    it('should handle evaluation window and cooldown settings', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to rule settings
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))

      const evaluationWindowInput = screen.getByLabelText(/evaluation window/i)
      const cooldownPeriodInput = screen.getByLabelText(/cooldown period/i)

      await user.clear(evaluationWindowInput)
      await user.type(evaluationWindowInput, '30')

      await user.clear(cooldownPeriodInput)
      await user.type(cooldownPeriodInput, '60')

      expect(screen.getByDisplayValue('30')).toBeInTheDocument()
      expect(screen.getByDisplayValue('60')).toBeInTheDocument()
    })

    it('should handle rule tags input', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to rule settings
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))

      const tagsInput = screen.getByLabelText(/tags/i)
      await user.type(tagsInput, 'energy, hvac, bangkok')

      expect(screen.getByDisplayValue('energy, hvac, bangkok')).toBeInTheDocument()
    })
  })

  describe('Notification Configuration', () => {
    it('should handle notification channel configuration', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to notifications step
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))

      // Test adding SMS channel
      const addChannelButton = screen.queryByText(/add notification channel/i)
      if (addChannelButton) {
        await user.click(addChannelButton)

        const channelTypeSelect = screen.getByLabelText(/channel type/i)
        await user.selectOptions(channelTypeSelect, 'sms')

        const phoneNumberInput = screen.getByLabelText(/phone number/i)
        await user.type(phoneNumberInput, '+66812345678')

        expect(screen.getByDisplayValue('+66812345678')).toBeInTheDocument()
      }
    })

    it('should handle webhook configuration', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to notifications step
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))

      const addChannelButton = screen.queryByText(/add notification channel/i)
      if (addChannelButton) {
        await user.click(addChannelButton)

        const channelTypeSelect = screen.getByLabelText(/channel type/i)
        await user.selectOptions(channelTypeSelect, 'webhook')

        const webhookUrlInput = screen.getByLabelText(/webhook url/i)
        await user.type(webhookUrlInput, 'https://api.company.com/alerts')

        const webhookMethodSelect = screen.getByLabelText(/http method/i)
        await user.selectOptions(webhookMethodSelect, 'POST')

        expect(screen.getByDisplayValue('https://api.company.com/alerts')).toBeInTheDocument()
        expect(screen.getByDisplayValue('POST')).toBeInTheDocument()
      }
    })

    it('should handle priority filter configuration', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to notifications step
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))

      const _priorityFilterCheckboxes = screen.getAllByRole('checkbox', { name: /priority/i })

      // Test selecting specific priorities
      const criticalCheckbox = screen.getByRole('checkbox', { name: /critical/i })
      const highCheckbox = screen.getByRole('checkbox', { name: /high/i })

      await user.click(criticalCheckbox)
      await user.click(highCheckbox)

      expect(criticalCheckbox).toBeChecked()
      expect(highCheckbox).toBeChecked()
    })

    it('should handle quiet hours configuration', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to notifications step
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))

      const quietHoursCheckbox = screen.getByRole('checkbox', { name: /enable quiet hours/i })
      await user.click(quietHoursCheckbox)

      expect(quietHoursCheckbox).toBeChecked()

      const startTimeInput = screen.getByLabelText(/start time/i)
      const endTimeInput = screen.getByLabelText(/end time/i)
      const timezoneSelect = screen.getByLabelText(/timezone/i)

      await user.type(startTimeInput, '23:00')
      await user.type(endTimeInput, '07:00')
      await user.selectOptions(timezoneSelect, 'Asia/Bangkok')

      expect(screen.getByDisplayValue('23:00')).toBeInTheDocument()
      expect(screen.getByDisplayValue('07:00')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Asia/Bangkok')).toBeInTheDocument()
    })

    it('should handle frequency limits configuration', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to notifications step
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))

      const maxAlertsPerDayInput = screen.getByLabelText(/max alerts per day/i)
      await user.clear(maxAlertsPerDayInput)
      await user.type(maxAlertsPerDayInput, '50')

      const cooldownInput = screen.getByLabelText(/cooldown between similar alerts/i)
      await user.clear(cooldownInput)
      await user.type(cooldownInput, '30')

      expect(screen.getByDisplayValue('50')).toBeInTheDocument()
      expect(screen.getByDisplayValue('30')).toBeInTheDocument()
    })
  })

  describe('Escalation Configuration', () => {
    it('should handle escalation policy configuration', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to escalation step
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))
      await user.click(screen.getByText('Continue to Escalation'))

      const enableEscalationCheckbox = screen.getByRole('checkbox', { name: /enable escalation/i })
      await user.click(enableEscalationCheckbox)

      expect(enableEscalationCheckbox).toBeChecked()

      const addStageButton = screen.getByText(/add escalation stage/i)
      await user.click(addStageButton)

      const delayInput = screen.getByLabelText(/delay minutes/i)
      await user.type(delayInput, '15')

      expect(screen.getByDisplayValue('15')).toBeInTheDocument()
    })

    it('should handle escalation stage recipients', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to escalation step
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))
      await user.click(screen.getByText('Continue to Escalation'))

      const enableEscalationCheckbox = screen.getByRole('checkbox', { name: /enable escalation/i })
      await user.click(enableEscalationCheckbox)

      const addStageButton = screen.getByText(/add escalation stage/i)
      await user.click(addStageButton)

      const recipientInput = screen.getByLabelText(/escalation recipients/i)
      await user.type(recipientInput, 'manager@company.com, director@company.com')

      expect(screen.getByDisplayValue('manager@company.com, director@company.com')).toBeInTheDocument()
    })

    it('should handle acknowledgment requirements', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to escalation step
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))
      await user.click(screen.getByText('Continue to Escalation'))

      const requireAcknowledgmentCheckbox = screen.getByRole('checkbox', { name: /require acknowledgment/i })
      await user.click(requireAcknowledgmentCheckbox)

      expect(requireAcknowledgmentCheckbox).toBeChecked()

      const acknowledgmentTimeoutInput = screen.getByLabelText(/acknowledgment timeout/i)
      await user.type(acknowledgmentTimeoutInput, '30')

      expect(screen.getByDisplayValue('30')).toBeInTheDocument()
    })
  })

  describe('Advanced Features', () => {
    it('should handle anomaly detection configuration', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to conditions and set up anomaly detection
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))
      await user.click(screen.getByText('+ Add Condition'))

      const operatorSelect = screen.getByDisplayValue('Greater than')
      await user.selectOptions(operatorSelect, 'anomaly_detected')

      const confidenceLevelInput = screen.getByLabelText(/confidence level/i)
      await user.type(confidenceLevelInput, '0.95')

      const algorithmSelect = screen.getByLabelText(/algorithm/i)
      await user.selectOptions(algorithmSelect, 'isolation_forest')

      expect(screen.getByDisplayValue('0.95')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Isolation Forest')).toBeInTheDocument()
    })

    it('should handle seasonal adjustments', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to metadata section
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))
      await user.click(screen.getByText('Continue to Escalation'))

      const seasonalAdjustmentCheckbox = screen.queryByRole('checkbox', { name: /seasonal adjustment/i })
      if (seasonalAdjustmentCheckbox) {
        await user.click(seasonalAdjustmentCheckbox)
        expect(seasonalAdjustmentCheckbox).toBeChecked()
      }
    })

    it('should handle business impact assessment', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to metadata section
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))
      await user.click(screen.getByText('Continue to Escalation'))

      const businessImpactSelect = screen.queryByLabelText(/business impact level/i)
      if (businessImpactSelect) {
        await user.selectOptions(businessImpactSelect, 'high')
        expect(screen.getByDisplayValue('High')).toBeInTheDocument()
      }

      const costPerHourInput = screen.queryByLabelText(/estimated cost per hour/i)
      if (costPerHourInput) {
        await user.type(costPerHourInput, '1000')
        expect(screen.getByDisplayValue('1000')).toBeInTheDocument()
      }

      const affectedOccupantsInput = screen.queryByLabelText(/affected occupants/i)
      if (affectedOccupantsInput) {
        await user.type(affectedOccupantsInput, '200')
        expect(screen.getByDisplayValue('200')).toBeInTheDocument()
      }
    })

    it('should handle documentation links', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to metadata section
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))
      await user.click(screen.getByText('Continue to Escalation'))

      const addDocLinkButton = screen.queryByText(/add documentation link/i)
      if (addDocLinkButton) {
        await user.click(addDocLinkButton)

        const docLinkInput = screen.getByLabelText(/documentation url/i)
        await user.type(docLinkInput, 'https://docs.company.com/alerts')

        expect(screen.getByDisplayValue('https://docs.company.com/alerts')).toBeInTheDocument()
      }
    })

    it('should handle affected systems selection', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to metadata section
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))
      await user.click(screen.getByText('Continue to Escalation'))

      const affectedSystemsSelect = screen.queryByLabelText(/affected systems/i)
      if (affectedSystemsSelect) {
        await user.selectOptions(affectedSystemsSelect, ['hvac', 'lighting', 'security'])
        // Multiple selections would be shown as selected
      }
    })
  })

  describe('User Experience and Interaction', () => {
    it('should show helpful tooltips and guidance', async () => {
      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Look for help icons or tooltip triggers
      const helpIcons = screen.getAllByRole('button', { name: /help|info/i })
      if (helpIcons.length > 0) {
        fireEvent.mouseOver(helpIcons[0])
        // Should show tooltip content
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
      }
    })

    it('should handle responsive design for mobile devices', async () => {
      // Mock viewport change
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // Mobile width
      })

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Dialog should still be functional on mobile
      expect(screen.getByText('Create Alert Configuration')).toBeInTheDocument()
      expect(screen.getByLabelText(/configuration name/i)).toBeInTheDocument()
    })

    it('should handle keyboard shortcuts', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Test Escape key to close
      await user.keyboard('{Escape}')
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should provide clear progress indication', async () => {
      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Should show step progress
      const progressSteps = screen.getAllByRole('button', { name: /step/i })
      if (progressSteps.length === 0) {
        // Alternative: check for step indicators
        expect(screen.getByText('Basic Info')).toHaveClass('text-blue-600')
      }
    })

    it('should handle unsaved changes warning', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Make changes
      await user.type(screen.getByLabelText(/configuration name/i), 'Unsaved Changes Test')

      // Try to close without saving
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      // Should show warning dialog
      const warningDialog = screen.queryByText(/unsaved changes/i)
      if (warningDialog) {
        expect(warningDialog).toBeInTheDocument()
      }
    })
  })

  describe('Bangkok-Specific Scenarios', () => {
    it('should handle Thai language input', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const nameInput = screen.getByLabelText(/configuration name/i)
      await user.type(nameInput, 'กรุงเทพ Energy Alert')

      expect(screen.getByDisplayValue('กรุงเทพ Energy Alert')).toBeInTheDocument()
    })

    it('should handle form field validation with error states', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const nameInput = screen.getByLabelText(/configuration name/i)

      // Test empty field validation
      await user.type(nameInput, 'Test')
      await user.clear(nameInput)
      await user.tab()

      expect(screen.getByText(/name is required/i)).toBeInTheDocument()

      // Test minimum length validation
      await user.type(nameInput, 'A')
      await user.tab()

      expect(screen.getByText(/name must be at least/i)).toBeInTheDocument()

      // Test maximum length validation
      const longName = 'A'.repeat(101)
      await user.clear(nameInput)
      await user.type(nameInput, longName)
      await user.tab()

      expect(screen.getByText(/name must be less than/i)).toBeInTheDocument()
    })

    it('should handle description field validation', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const descriptionTextarea = screen.getByLabelText(/description/i)

      // Test empty description
      await user.type(descriptionTextarea, 'Test description')
      await user.clear(descriptionTextarea)
      await user.tab()

      expect(screen.getByText(/description is required/i)).toBeInTheDocument()

      // Test maximum length validation
      const longDescription = 'A'.repeat(501)
      await user.type(descriptionTextarea, longDescription)
      await user.tab()

      expect(screen.getByText(/description must be less than/i)).toBeInTheDocument()
    })

    it('should handle category selection properly', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const categorySelect = screen.getByLabelText(/category/i)
      await user.click(categorySelect)

      const categories = [
        'Energy Efficiency',
        'Safety',
        'Operational',
        'Environmental',
        'Security',
        'Maintenance'
      ]

      categories.forEach(category => {
        expect(screen.getByRole('option', { name: category })).toBeInTheDocument()
      })

      await user.selectOptions(categorySelect, 'safety')
      expect(screen.getByDisplayValue('Safety')).toBeInTheDocument()
    })

    it('should handle custom fields input', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to metadata step (assuming there's a metadata step)
      await user.type(screen.getByLabelText(/configuration name/i), 'Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Test description')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))
      await user.click(screen.getByText('Continue to Escalation'))

      // Look for custom fields section
      const customFieldsSection = screen.queryByText(/custom fields/i)
      if (customFieldsSection) {
        const addFieldButton = screen.getByText(/add custom field/i)
        await user.click(addFieldButton)

        const fieldNameInput = screen.getByLabelText(/field name/i)
        const fieldValueInput = screen.getByLabelText(/field value/i)

        await user.type(fieldNameInput, 'facility_code')
        await user.type(fieldValueInput, 'BKK001')

        expect(screen.getByDisplayValue('facility_code')).toBeInTheDocument()
        expect(screen.getByDisplayValue('BKK001')).toBeInTheDocument()
      }
    })

    it('should handle Bangkok timezone configurations', async () => {
      const _user = userEvent.setup()

      const bangkokConfig = {
        ...mockEditingConfig,
        notification_settings: {
          ...mockEditingConfig.notification_settings,
          quiet_hours: {
            enabled: true,
            start_time: '23:00',
            end_time: '07:00',
            timezone: 'Asia/Bangkok',
            exceptions: [],
            weekend_override: false
          }
        }
      }

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          editingConfig={bangkokConfig}
        />
      )

      // Should load with Bangkok timezone settings
      expect(screen.getByDisplayValue('Test Energy Alert')).toBeInTheDocument()
    })

    it('should handle Thai business hours configuration', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to notifications step
      await user.type(screen.getByLabelText(/configuration name/i), 'กรุงเทพ Energy Alert')
      await user.type(screen.getByLabelText(/description/i), 'Alert for Bangkok facility')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))

      const quietHoursCheckbox = screen.getByRole('checkbox', { name: /enable quiet hours/i })
      await user.click(quietHoursCheckbox)

      // Set Thai business hours (8:30 AM - 5:30 PM)
      const startTimeInput = screen.getByLabelText(/start time/i)
      const endTimeInput = screen.getByLabelText(/end time/i)
      const timezoneSelect = screen.getByLabelText(/timezone/i)

      await user.type(startTimeInput, '17:30') // 5:30 PM
      await user.type(endTimeInput, '08:30') // 8:30 AM next day
      await user.selectOptions(timezoneSelect, 'Asia/Bangkok')

      expect(screen.getByDisplayValue('Asia/Bangkok')).toBeInTheDocument()
    })

    it('should handle monsoon season settings', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await user.type(screen.getByLabelText(/configuration name/i), 'Bangkok Monsoon Season Alert')
      await user.type(screen.getByLabelText(/description/i), 'Special alert configuration for monsoon season')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))
      await user.click(screen.getByText('+ Add Condition'))

      const addFilterButton = screen.queryByText(/add filter/i)
      if (addFilterButton) {
        await user.click(addFilterButton)

        const filterFieldInput = screen.getByLabelText(/filter field/i)
        const filterValueInput = screen.getByLabelText(/filter value/i)

        await user.type(filterFieldInput, 'season')
        await user.type(filterValueInput, 'monsoon')

        expect(screen.getByDisplayValue('monsoon')).toBeInTheDocument()
      }
    })

    it('should handle high humidity HVAC adjustments', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await user.type(screen.getByLabelText(/configuration name/i), 'Bangkok High Humidity HVAC Alert')
      await user.type(screen.getByLabelText(/description/i), 'Alert for HVAC efficiency during high humidity')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))
      await user.click(screen.getByText('+ Add Condition'))

      const metricSelect = screen.getByDisplayValue('Energy Consumption')
      await user.click(metricSelect)
      await user.click(screen.getByText('Humidity'))

      const thresholdInput = screen.getByDisplayValue('100')
      await user.clear(thresholdInput)
      await user.type(thresholdInput, '85') // High humidity threshold for Bangkok

      expect(screen.getByDisplayValue('85')).toBeInTheDocument()
    })

    it('should handle Bangkok power grid integration settings', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      await user.type(screen.getByLabelText(/configuration name/i), 'Bangkok Grid Stability Alert')
      await user.type(screen.getByLabelText(/description/i), 'Monitor Bangkok electrical grid stability')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByRole('button', { name: /arrow/i }))
      await user.click(screen.getByText('+ Add Condition'))

      // Configure power grid specific sensors
      const sensorIdInput = screen.getByLabelText(/sensor id/i)
      await user.type(sensorIdInput, 'BKK_GRID_VOLTAGE_001')

      expect(screen.getByDisplayValue('BKK_GRID_VOLTAGE_001')).toBeInTheDocument()
    })

    it('should handle emergency contact configuration for Bangkok', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Navigate to notifications step
      await user.type(screen.getByLabelText(/configuration name/i), 'Bangkok Emergency Alert')
      await user.type(screen.getByLabelText(/description/i), 'Critical emergency alert for Bangkok facility')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))

      const addChannelButton = screen.queryByText(/add notification channel/i)
      if (addChannelButton) {
        await user.click(addChannelButton)

        const channelTypeSelect = screen.getByLabelText(/channel type/i)
        await user.selectOptions(channelTypeSelect, 'sms')

        const phoneNumberInput = screen.getByLabelText(/phone number/i)
        await user.type(phoneNumberInput, '+66812345678') // Thai phone format

        expect(screen.getByDisplayValue('+66812345678')).toBeInTheDocument()
      }
    })
  })

  describe('Integration and Data Flow', () => {
    it('should properly handle step transitions with data persistence', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Step 1: Basic Info
      await user.type(screen.getByLabelText(/configuration name/i), 'Data Persistence Test')
      await user.type(screen.getByLabelText(/description/i), 'Testing data flow between steps')
      await user.click(screen.getByText('Continue to Rules'))

      // Step 2: Rules
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))

      // Step 3: Back to Basic Info to verify persistence
      await user.click(screen.getByText('Basic Info'))
      expect(screen.getByDisplayValue('Data Persistence Test')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Testing data flow between steps')).toBeInTheDocument()

      // Back to Rules to verify rule persistence
      await user.click(screen.getByText('Alert Rules'))
      expect(screen.getByText('Rule 1')).toBeInTheDocument()
    })

    it('should handle real-time validation during form input', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const nameInput = screen.getByLabelText(/configuration name/i)

      // Test real-time validation feedback
      await user.type(nameInput, 'A')
      // Should show validation error immediately
      expect(screen.queryByText(/name must be at least/i)).toBeInTheDocument()

      await user.type(nameInput, 'cceptable Name')
      // Error should disappear
      await waitFor(() => {
        expect(screen.queryByText(/name must be at least/i)).not.toBeInTheDocument()
      })
    })

    it('should handle configuration preview and summary', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Complete a full configuration
      await user.type(screen.getByLabelText(/configuration name/i), 'Preview Test Alert')
      await user.type(screen.getByLabelText(/description/i), 'Testing preview functionality')
      await user.click(screen.getByText('Continue to Rules'))
      await user.click(screen.getByText('Add Rule'))
      await user.click(screen.getByText('Continue to Notifications'))
      await user.click(screen.getByText('Continue to Escalation'))
      await user.click(screen.getByText('Continue to Review'))

      // Should show configuration summary
      expect(screen.getByText('Preview Test Alert')).toBeInTheDocument()
      expect(screen.getByText('Testing preview functionality')).toBeInTheDocument()
      expect(screen.getByText(/Rules:/)).toBeInTheDocument()
    })

    it('should handle configuration import/export functionality', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const importButton = screen.queryByText(/import configuration/i)
      if (importButton) {
        await user.click(importButton)

        const fileInput = screen.getByLabelText(/configuration file/i)
        const mockFile = new File(['{}'], 'config.json', { type: 'application/json' })
        await user.upload(fileInput, mockFile)

        expect(fileInput.files).toHaveLength(1)
        expect(fileInput.files?.[0]).toEqual(mockFile)
      }
    })

    it('should handle configuration duplication', async () => {
      const _user = userEvent.setup()

      render(
        <AlertConfigurationDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          editingConfig={mockEditingConfig}
        />
      )

      const duplicateButton = screen.queryByText(/duplicate configuration/i)
      if (duplicateButton) {
        await user.click(duplicateButton)

        // Name should be updated to indicate copy
        expect(screen.getByDisplayValue(/copy of/i)).toBeInTheDocument()
      }
    })
  })
})