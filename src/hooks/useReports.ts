'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ReportTemplate,
  GeneratedReport,
  ReportSchedule,
  CreateReportTemplateRequest,
  UpdateReportTemplateRequest,
  GenerateReportRequest,
  CreateReportScheduleRequest,
  UseReportsReturn
} from '@/types/reports'

export function useReports(): UseReportsReturn {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([])
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch templates
  const fetchTemplates = useCallback(async (category?: string) => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()
      if (category) queryParams.set('category', category)

      const response = await fetch(`/api/reports/templates?${queryParams}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch templates')
      }

      const data = await response.json()
      setTemplates(data.templates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch generated reports
  const fetchGeneratedReports = useCallback(async (status?: string, format?: string) => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()
      if (status) queryParams.set('status', status)
      if (format) queryParams.set('format', format)

      const response = await fetch(`/api/reports/generate?${queryParams}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch reports')
      }

      const data = await response.json()
      setGeneratedReports(data.reports)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch schedules
  const fetchSchedules = useCallback(async (activeOnly = false) => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()
      if (activeOnly) queryParams.set('active', 'true')

      const response = await fetch(`/api/reports/schedules?${queryParams}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch schedules')
      }

      const data = await response.json()
      setSchedules(data.schedules)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Create template
  const createTemplate = useCallback(async (data: CreateReportTemplateRequest): Promise<ReportTemplate> => {
    setError(null)

    const response = await fetch('/api/reports/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create template')
    }

    const result = await response.json()
    setTemplates(prev => [result.template, ...prev])
    return result.template
  }, [])

  // Update template
  const updateTemplate = useCallback(async (
    id: string,
    data: UpdateReportTemplateRequest
  ): Promise<ReportTemplate> => {
    setError(null)

    const response = await fetch(`/api/reports/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update template')
    }

    const result = await response.json()
    setTemplates(prev => prev.map(template =>
      template.id === id ? result.template : template
    ))
    return result.template
  }, [])

  // Delete template
  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    setError(null)

    const response = await fetch(`/api/reports/templates/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete template')
    }

    setTemplates(prev => prev.filter(template => template.id !== id))
  }, [])

  // Generate report
  const generateReport = useCallback(async (data: GenerateReportRequest): Promise<GeneratedReport> => {
    setError(null)

    const response = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to generate report')
    }

    const result = await response.json()
    setGeneratedReports(prev => [result.report, ...prev])
    return result.report
  }, [])

  // Get report status
  const getReportStatus = useCallback(async (id: string): Promise<GeneratedReport> => {
    setError(null)

    const response = await fetch(`/api/reports/status/${id}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to get report status')
    }

    const result = await response.json()

    // Update the report in the list
    setGeneratedReports(prev => prev.map(report =>
      report.id === id ? result.report : report
    ))

    return result.report
  }, [])

  // Download report
  const downloadReport = useCallback(async (id: string): Promise<Blob> => {
    setError(null)

    const response = await fetch(`/api/reports/download/${id}`)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to download report')
    }

    return response.blob()
  }, [])

  // Create schedule
  const createSchedule = useCallback(async (data: CreateReportScheduleRequest): Promise<ReportSchedule> => {
    setError(null)

    const response = await fetch('/api/reports/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create schedule')
    }

    const result = await response.json()
    setSchedules(prev => [result.schedule, ...prev])
    return result.schedule
  }, [])

  // Update schedule
  const updateSchedule = useCallback(async (
    id: string,
    data: Partial<CreateReportScheduleRequest>
  ): Promise<ReportSchedule> => {
    setError(null)

    const response = await fetch(`/api/reports/schedules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update schedule')
    }

    const result = await response.json()
    setSchedules(prev => prev.map(schedule =>
      schedule.id === id ? result.schedule : schedule
    ))
    return result.schedule
  }, [])

  // Delete schedule
  const deleteSchedule = useCallback(async (id: string): Promise<void> => {
    setError(null)

    const response = await fetch(`/api/reports/schedules/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete schedule')
    }

    setSchedules(prev => prev.filter(schedule => schedule.id !== id))
  }, [])

  // Initialize data on mount
  useEffect(() => {
    fetchTemplates()
    fetchGeneratedReports()
    fetchSchedules()
  }, [fetchTemplates, fetchGeneratedReports, fetchSchedules])

  return {
    templates,
    generatedReports,
    schedules,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    generateReport,
    getReportStatus,
    downloadReport,
    createSchedule,
    updateSchedule,
    deleteSchedule
  }
}

export default useReports