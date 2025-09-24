/**
 * Alert Configuration Dialog Component
 * Story 4.1: Custom Alert Configuration
 *
 * Comprehensive interface for creating and managing custom alert configurations
 */

import React, { useState, useEffect } from 'react'
import type {
  AlertConfiguration,
  AlertRule,
  AlertCondition,
  NotificationSettings,
  EscalationPolicy,
  _AlertMetric,
  MetricType,
  ComparisonOperator,
  _ThresholdValue,
  _AlertPriority,
  _ChannelType,
  AlertValidation
} from '../../types/alerts'

interface AlertConfigurationDialogProps {
  isOpen: boolean
  onClose: () => void
  editingConfig?: AlertConfiguration
  onSave: (config: Partial<AlertConfiguration>) => Promise<void>
  onTest?: (configId: string) => void
}

export function AlertConfigurationDialog({
  isOpen,
  onClose,
  editingConfig,
  onSave,
  onTest
}: AlertConfigurationDialogProps) {
  const [currentStep, setCurrentStep] = useState<'basic' | 'rules' | 'notifications' | 'escalation' | 'review'>('basic')
  const [config, setConfig] = useState<Partial<AlertConfiguration>>({
    name: '',
    description: '',
    status: 'draft',
    rules: [],
    notification_settings: {
      channels: [],
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
    }
  })
  const [validation, setValidation] = useState<AlertValidation | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => {
    if (editingConfig) {
      setConfig(editingConfig)
    }
  }, [editingConfig])

  const handleBasicInfoChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const handleRuleChange = (ruleIndex: number, rule: AlertRule) => {
    setConfig(prev => ({
      ...prev,
      rules: prev.rules?.map((r, i) => i === ruleIndex ? rule : r) || []
    }))
  }

  const addRule = () => {
    const newRule: AlertRule = {
      id: `rule_${Date.now()}`,
      name: 'New Alert Rule',
      description: '',
      enabled: true,
      priority: 'medium',
      conditions: [],
      logical_operator: 'AND',
      evaluation_window: 5,
      cooldown_period: 15,
      suppress_duplicates: true,
      tags: []
    }

    setConfig(prev => ({
      ...prev,
      rules: [...(prev.rules || []), newRule]
    }))
  }

  const removeRule = (ruleIndex: number) => {
    setConfig(prev => ({
      ...prev,
      rules: prev.rules?.filter((_, i) => i !== ruleIndex) || []
    }))
  }

  const validateConfiguration = async () => {
    if (!config.name || !config.rules?.length) return

    setIsValidating(true)
    try {
      const response = await fetch('/api/alerts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      const result = await response.json()
      setValidation(result)
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    await validateConfiguration()
    if (validation?.is_valid) {
      await onSave(config)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingConfig ? 'Edit Alert Configuration' : 'Create Alert Configuration'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center mt-4 space-x-4 overflow-x-auto">
            {[
              { id: 'basic', label: 'Basic Info' },
              { id: 'rules', label: 'Alert Rules' },
              { id: 'notifications', label: 'Notifications' },
              { id: 'escalation', label: 'Escalation' },
              { id: 'review', label: 'Review' }
            ].map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep === step.id
                    ? 'bg-blue-600 text-white'
                    : index < ['basic', 'rules', 'notifications', 'escalation', 'review'].indexOf(currentStep)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {index + 1}
                </div>
                <span className={`ml-2 text-sm whitespace-nowrap ${
                  currentStep === step.id ? 'text-blue-600 font-medium' : 'text-gray-600'
                }`}>
                  {step.label}
                </span>
                {index < 4 && (
                  <div className={`w-8 h-0.5 mx-4 ${
                    index < ['basic', 'rules', 'notifications', 'escalation', 'review'].indexOf(currentStep)
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[60vh]">
          {currentStep === 'basic' && (
            <BasicInfoStep
              config={config}
              onChange={handleBasicInfoChange}
              onNext={() => setCurrentStep('rules')}
            />
          )}

          {currentStep === 'rules' && (
            <RulesStep
              rules={config.rules || []}
              onRuleChange={handleRuleChange}
              onAddRule={addRule}
              onRemoveRule={removeRule}
              onNext={() => setCurrentStep('notifications')}
              onBack={() => setCurrentStep('basic')}
            />
          )}

          {currentStep === 'notifications' && (
            <NotificationsStep
              notificationSettings={config.notification_settings!}
              onChange={(settings) => setConfig(prev => ({ ...prev, notification_settings: settings }))}
              onNext={() => setCurrentStep('escalation')}
              onBack={() => setCurrentStep('rules')}
            />
          )}

          {currentStep === 'escalation' && (
            <EscalationStep
              escalationPolicy={config.escalation_policy}
              onChange={(policy) => setConfig(prev => ({ ...prev, escalation_policy: policy }))}
              onNext={() => setCurrentStep('review')}
              onBack={() => setCurrentStep('notifications')}
            />
          )}

          {currentStep === 'review' && (
            <ReviewStep
              config={config}
              validation={validation}
              isValidating={isValidating}
              onValidate={validateConfiguration}
              onSave={handleSave}
              onTest={onTest}
              onBack={() => setCurrentStep('escalation')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Step Components
interface BasicInfoStepProps {
  config: Partial<AlertConfiguration>
  onChange: (field: string, value: string | boolean | number) => void
  onNext: () => void
}

function BasicInfoStep({ config, _onChange, onNext }: BasicInfoStepProps) {
  const canProceed = config.name && config.description

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Configuration Name *
            </label>
            <input
              type="text"
              value={config.name || ''}
              onChange={(e) => onChange('name', e.target.value)}
              placeholder="e.g., High Energy Consumption Alert"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={config.description || ''}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="Describe when this alert should trigger and its purpose"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={config.status || 'draft'}
              onChange={(e) => onChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="testing">Testing</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (optional)
            </label>
            <input
              type="text"
              placeholder="energy, hvac, critical (comma-separated)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`px-6 py-2 rounded-md ${
            canProceed
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue to Rules
        </button>
      </div>
    </div>
  )
}

interface RulesStepProps {
  rules: AlertRule[]
  onRuleChange: (index: number, rule: AlertRule) => void
  onAddRule: () => void
  onRemoveRule: (index: number) => void
  onNext: () => void
  onBack: () => void
}

function RulesStep({ rules, onRuleChange, onAddRule, onRemoveRule, onNext, onBack }: RulesStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Alert Rules</h3>
        <button
          onClick={onAddRule}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No rules configured yet</p>
          <p className="text-sm">Click &quot;Add Rule&quot; to create your first alert rule</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule, index) => (
            <AlertRuleCard
              key={rule.id}
              rule={rule}
              index={index}
              onChange={(updatedRule) => onRuleChange(index, updatedRule)}
              onRemove={() => onRemoveRule(index)}
            />
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={rules.length === 0}
          className={`px-6 py-2 rounded-md ${
            rules.length > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue to Notifications
        </button>
      </div>
    </div>
  )
}

interface AlertRuleCardProps {
  rule: AlertRule
  index: number
  onChange: (rule: AlertRule) => void
  onRemove: () => void
}

function AlertRuleCard({ rule, index, _onChange, onRemove }: AlertRuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateRule = (field: string, value: string | boolean | number) => {
    onChange({ ...rule, [field]: value })
  }

  const addCondition = () => {
    const newCondition: AlertCondition = {
      id: `condition_${Date.now()}`,
      metric: {
        type: 'energy_consumption',
        display_name: 'Energy Consumption',
        units: 'kWh'
      },
      operator: 'greater_than',
      threshold: { value: 100 },
      time_aggregation: {
        function: 'average',
        period: 5,
        minimum_data_points: 3
      },
      filters: []
    }

    onChange({
      ...rule,
      conditions: [...rule.conditions, newCondition]
    })
  }

  const updateCondition = (conditionIndex: number, condition: AlertCondition) => {
    const updatedConditions = rule.conditions.map((c, i) =>
      i === conditionIndex ? condition : c
    )
    onChange({ ...rule, conditions: updatedConditions })
  }

  const removeCondition = (conditionIndex: number) => {
    const updatedConditions = rule.conditions.filter((_, i) => i !== conditionIndex)
    onChange({ ...rule, conditions: updatedConditions })
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-500">Rule {index + 1}</span>
          <input
            type="text"
            value={rule.name}
            onChange={(e) => updateRule('name', e.target.value)}
            className="font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
          />
          <span className={`px-2 py-1 text-xs rounded-full ${
            rule.enabled
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {rule.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className={`w-5 h-5 transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className="text-red-400 hover:text-red-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={rule.priority}
                onChange={(e) => updateRule('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Evaluation Window (minutes)</label>
              <input
                type="number"
                value={rule.evaluation_window}
                onChange={(e) => updateRule('evaluation_window', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={rule.description}
              onChange={(e) => updateRule('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Conditions</h4>
              <button
                onClick={addCondition}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Condition
              </button>
            </div>

            {rule.conditions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No conditions defined</p>
            ) : (
              <div className="space-y-3">
                {rule.conditions.map((condition, conditionIndex) => (
                  <ConditionBuilder
                    key={condition.id}
                    condition={condition}
                    onChange={(updatedCondition) => updateCondition(conditionIndex, updatedCondition)}
                    onRemove={() => removeCondition(conditionIndex)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => updateRule('enabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enabled</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rule.suppress_duplicates}
                onChange={(e) => updateRule('suppress_duplicates', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Suppress duplicates</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

interface ConditionBuilderProps {
  condition: AlertCondition
  onChange: (condition: AlertCondition) => void
  onRemove: () => void
}

function ConditionBuilder({ condition, _onChange, onRemove }: ConditionBuilderProps) {
  const metricTypes: { value: MetricType, label: string }[] = [
    { value: 'energy_consumption', label: 'Energy Consumption' },
    { value: 'power_demand', label: 'Power Demand' },
    { value: 'temperature', label: 'Temperature' },
    { value: 'humidity', label: 'Humidity' },
    { value: 'pressure', label: 'Pressure' },
    { value: 'air_quality', label: 'Air Quality' },
    { value: 'efficiency_ratio', label: 'Efficiency Ratio' },
    { value: 'cost_per_hour', label: 'Cost per Hour' }
  ]

  const operators: { value: ComparisonOperator, label: string }[] = [
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than_or_equal', label: 'Greater than or equal' },
    { value: 'less_than_or_equal', label: 'Less than or equal' },
    { value: 'between', label: 'Between' },
    { value: 'percentage_change', label: 'Percentage change' },
    { value: 'anomaly_detected', label: 'Anomaly detected' }
  ]

  const updateCondition = (field: string, value: string | number) => {
    onChange({ ...condition, [field]: value })
  }

  const updateMetric = (field: string, value: string) => {
    onChange({
      ...condition,
      metric: { ...condition.metric, [field]: value }
    })
  }

  const updateThreshold = (field: string, value: number) => {
    onChange({
      ...condition,
      threshold: { ...condition.threshold, [field]: value }
    })
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">Condition</span>
        <button
          onClick={onRemove}
          className="text-red-400 hover:text-red-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Metric</label>
          <select
            value={condition.metric.type}
            onChange={(e) => updateMetric('type', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {metricTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Operator</label>
          <select
            value={condition.operator}
            onChange={(e) => updateCondition('operator', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {operators.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Threshold</label>
          <input
            type="number"
            value={condition.threshold.value}
            onChange={(e) => updateThreshold('value', parseFloat(e.target.value))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {condition.operator === 'between' && (
        <div className="mt-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Upper Threshold</label>
          <input
            type="number"
            value={condition.threshold.secondary_value || ''}
            onChange={(e) => updateThreshold('secondary_value', parseFloat(e.target.value))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  )
}

// Notification and Escalation steps would be implemented similarly...
interface NotificationsStepProps {
  notificationSettings: NotificationSettings
  onChange: (settings: NotificationSettings) => void
  onNext: () => void
  onBack: () => void
}

function NotificationsStep({ notificationSettings, _onChange, onNext, onBack }: NotificationsStepProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>

      {/* Simplified notification configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Recipients
          </label>
          <input
            type="text"
            placeholder="admin@company.com, manager@company.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Alerts per Hour
          </label>
          <input
            type="number"
            value={notificationSettings.frequency_limits.max_alerts_per_hour}
            onChange={(e) => onChange({
              ...notificationSettings,
              frequency_limits: {
                ...notificationSettings.frequency_limits,
                max_alerts_per_hour: parseInt(e.target.value)
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Continue to Escalation
        </button>
      </div>
    </div>
  )
}

interface EscalationStepProps {
  escalationPolicy?: EscalationPolicy
  onChange: (policy: EscalationPolicy) => void
  onNext: () => void
  onBack: () => void
}

function EscalationStep({ _escalationPolicy, _onChange, onNext, onBack }: EscalationStepProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Escalation Policy</h3>

      <div className="text-gray-600">
        <p>Escalation policies are optional but recommended for critical alerts.</p>
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Continue to Review
        </button>
      </div>
    </div>
  )
}

interface ReviewStepProps {
  config: Partial<AlertConfiguration>
  validation: AlertValidation | null
  isValidating: boolean
  onValidate: () => void
  onSave: () => void
  onTest?: (configId: string) => void
  onBack: () => void
}

function ReviewStep({ config, validation, isValidating, onValidate, onSave, onTest, onBack }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Review & Validate</h3>

      {/* Configuration Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">{config.name}</h4>
        <p className="text-gray-600 text-sm mb-3">{config.description}</p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Rules:</span>
            <span className="ml-2 font-medium">{config.rules?.length || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <span className="ml-2 font-medium capitalize">{config.status}</span>
          </div>
        </div>
      </div>

      {/* Validation */}
      {isValidating && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
            <span className="text-yellow-800">Validating configuration...</span>
          </div>
        </div>
      )}

      {validation && (
        <div className={`border rounded-md p-4 ${
          validation.is_valid
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <h4 className={`font-medium mb-2 ${
            validation.is_valid ? 'text-green-800' : 'text-red-800'
          }`}>
            {validation.is_valid ? 'Configuration Valid' : 'Validation Failed'}
          </h4>

          {validation.errors.length > 0 && (
            <div className="space-y-1">
              {validation.errors.map((error, index) => (
                <p key={index} className="text-red-700 text-sm">• {error.message}</p>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="space-y-1 mt-2">
              <h5 className="text-yellow-800 font-medium text-sm">Warnings:</h5>
              {validation.warnings.map((warning, index) => (
                <p key={index} className="text-yellow-700 text-sm">• {warning.message}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>

        <div className="space-x-3">
          <button
            onClick={onValidate}
            disabled={isValidating}
            className="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
          >
            Validate
          </button>

          {onTest && config.id && (
            <button
              onClick={() => onTest(config.id!)}
              className="px-4 py-2 text-green-600 border border-green-300 rounded-md hover:bg-green-50"
            >
              Test Alert
            </button>
          )}

          <button
            onClick={onSave}
            disabled={!validation?.is_valid}
            className={`px-6 py-2 rounded-md ${
              validation?.is_valid
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}