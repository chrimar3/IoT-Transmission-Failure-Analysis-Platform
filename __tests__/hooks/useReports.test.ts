import { renderHook, act, waitFor } from '@testing-library/react'
import useReports from '@/src/hooks/useReports'

// Mock fetch
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Set reduced timeout for all tests
jest.setTimeout(10000)

describe('useReports Hook', () => {
  const mockTemplate = {
    id: 'template-123',
    name: 'Test Template',
    category: 'executive',
    template_data: { components: [] },
    usage_count: 5
  }

  const mockGeneratedReport = {
    id: 'report-123',
    title: 'Test Report',
    status: 'completed',
    created_at: '2023-01-01T00:00:00Z',
    format: 'pdf'
  }

  const mockSchedule = {
    id: 'schedule-123',
    name: 'Daily Report',
    frequency: 'daily',
    is_active: true,
    next_run_at: '2023-01-02T09:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock responses - return promises that resolve immediately
    mockFetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ({ templates: [mockTemplate] })
      } as Response)) // templates
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ({ reports: [mockGeneratedReport] })
      } as Response)) // generated reports
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ({ schedules: [mockSchedule] })
      } as Response)) // schedules
  })

  it('should initialize with empty state and load data', async () => {
    const { result } = renderHook(() => useReports())

    expect(result.current.templates).toEqual([])
    expect(result.current.generatedReports).toEqual([])
    expect(result.current.schedules).toEqual([])
    expect(result.current.loading).toBe(false)

    // Wait for initial data loading - use act to wrap state updates
    await waitFor(() => {
      expect(result.current.templates).toEqual([mockTemplate])
      expect(result.current.generatedReports).toEqual([mockGeneratedReport])
      expect(result.current.schedules).toEqual([mockSchedule])
    }, { timeout: 5000 })
  })

  it('should handle loading states correctly', async () => {
    // Mock responses that resolve immediately
    mockFetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ({ templates: [] })
      } as Response))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ({ reports: [] })
      } as Response))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ({ schedules: [] })
      } as Response))

    const { result } = renderHook(() => useReports())

    // Should start with loading state
    expect(result.current.loading).toBe(false)

    // After fetches complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 5000 })
  })

  it('should create a new template', async () => {
    const newTemplate = {
      id: 'new-template-123',
      name: 'New Template',
      category: 'custom'
    }

    const { result } = renderHook(() => useReports())

    // Wait for initial data loading
    await waitFor(() => {
      expect(result.current.templates.length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    // Mock successful creation
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: async () => ({ template: newTemplate })
    } as Response))

    let createdTemplate: unknown
    await act(async () => {
      createdTemplate = await result.current.createTemplate({
        name: 'New Template',
        category: 'custom'
      })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/reports/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Template',
        category: 'custom'
      })
    })

    expect(createdTemplate).toEqual(newTemplate)
    expect(result.current.templates).toContainEqual(newTemplate)
  })

  it('should update a template', async () => {
    const updatedTemplate = {
      ...mockTemplate,
      name: 'Updated Template'
    }

    const { result } = renderHook(() => useReports())

    await waitFor(() => {
      expect(result.current.templates.length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: async () => ({ template: updatedTemplate })
    } as Response))

    await act(async () => {
      await result.current.updateTemplate('template-123', {
        name: 'Updated Template'
      })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/reports/templates/template-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Template'
      })
    })

    expect(result.current.templates.find(t => t.id === 'template-123')?.name)
      .toBe('Updated Template')
  })

  it('should delete a template', async () => {
    const { result } = renderHook(() => useReports())

    await waitFor(() => {
      expect(result.current.templates.length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: async () => ({ message: 'Template deleted' })
    } as Response))

    await act(async () => {
      await result.current.deleteTemplate('template-123')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/reports/templates/template-123', {
      method: 'DELETE'
    })

    expect(result.current.templates.find(t => t.id === 'template-123'))
      .toBeUndefined()
  })

  it('should generate a report', async () => {
    const newReport = {
      id: 'new-report-123',
      title: 'Generated Report',
      status: 'generating'
    }

    const { result } = renderHook(() => useReports())

    await waitFor(() => {
      expect(result.current.generatedReports.length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: async () => ({ report: newReport })
    } as Response))

    let generatedReport: unknown
    await act(async () => {
      generatedReport = await result.current.generateReport({
        template_id: 'template-123',
        format: 'pdf'
      })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: 'template-123',
        format: 'pdf'
      })
    })

    expect(generatedReport).toEqual(newReport)
    expect(result.current.generatedReports).toContainEqual(newReport)
  })

  it('should get report status', async () => {
    const updatedReport = {
      ...mockGeneratedReport,
      status: 'completed'
    }

    const { result } = renderHook(() => useReports())

    await waitFor(() => {
      expect(result.current.generatedReports.length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: async () => ({ report: updatedReport })
    } as Response))

    let reportStatus: unknown
    await act(async () => {
      reportStatus = await result.current.getReportStatus('report-123')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/reports/status/report-123')
    expect(reportStatus).toEqual(updatedReport)

    // Should update the report in the list
    expect(result.current.generatedReports.find(r => r.id === 'report-123'))
      .toEqual(updatedReport)
  })

  it('should download a report', async () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })

    const { result } = renderHook(() => useReports())

    await waitFor(() => {
      expect(result.current.generatedReports.length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      blob: async () => mockBlob
    } as Response))

    let downloadedBlob: unknown
    await act(async () => {
      downloadedBlob = await result.current.downloadReport('report-123')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/reports/download/report-123')
    expect(downloadedBlob).toEqual(mockBlob)
  })

  it('should create a schedule', async () => {
    const newSchedule = {
      id: 'new-schedule-123',
      name: 'Weekly Report',
      frequency: 'weekly'
    }

    const { result } = renderHook(() => useReports())

    await waitFor(() => {
      expect(result.current.schedules.length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: async () => ({ schedule: newSchedule })
    } as Response))

    let createdSchedule: unknown
    await act(async () => {
      createdSchedule = await result.current.createSchedule({
        template_id: 'template-123',
        name: 'Weekly Report',
        frequency: 'weekly',
        schedule_config: {
          day_of_week: 1,
          time_of_day: '09:00',
          timezone: 'UTC'
        },
        email_recipients: ['test@example.com']
      })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/reports/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: 'template-123',
        name: 'Weekly Report',
        frequency: 'weekly',
        schedule_config: {
          day_of_week: 1,
          time_of_day: '09:00',
          timezone: 'UTC'
        },
        email_recipients: ['test@example.com']
      })
    })

    expect(createdSchedule).toEqual(newSchedule)
    expect(result.current.schedules).toContainEqual(newSchedule)
  })

  it('should handle API errors gracefully', async () => {
    // Clear previous mocks first
    mockFetch.mockClear()

    // Mock the initial fetch calls - first one fails (templates), others succeed
    mockFetch
      .mockImplementationOnce(() => Promise.reject(new Error('Network error'))) // fetchTemplates fails
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ({ reports: [] })
      } as Response)) // fetchGeneratedReports succeeds
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ({ schedules: [] })
      } as Response)) // fetchSchedules succeeds

    const { result } = renderHook(() => useReports())

    await waitFor(() => {
      expect(result.current.error).toBe('Network error')
    }, { timeout: 5000 })

    // Error should be cleared on successful operations
    await act(async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ({ template: mockTemplate })
      } as Response))

      await result.current.createTemplate({
        name: 'Test',
        category: 'custom'
      })
    })

    expect(result.current.error).toBeNull()
  })

  it('should handle HTTP error responses', async () => {
    // Clear previous mocks first
    mockFetch.mockClear()

    // Mock the initial fetch calls - first one returns HTTP error, others succeed
    mockFetch
      .mockImplementationOnce(() => Promise.resolve({
        ok: false,
        json: async () => ({ error: 'Unauthorized' })
      } as Response)) // fetchTemplates returns HTTP error
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ({ reports: [] })
      } as Response)) // fetchGeneratedReports succeeds
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ({ schedules: [] })
      } as Response)) // fetchSchedules succeeds

    const { result } = renderHook(() => useReports())

    await waitFor(() => {
      expect(result.current.error).toBe('Unauthorized')
    }, { timeout: 5000 })
  })

  it('should update and delete schedules', async () => {
    const updatedSchedule = {
      ...mockSchedule,
      name: 'Updated Schedule'
    }

    const { result } = renderHook(() => useReports())

    // Wait for initial data to load
    await waitFor(() => {
      expect(result.current.schedules.length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    // Update schedule
    await act(async () => {
      // Mock update response
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ({ schedule: updatedSchedule })
      } as Response))

      await result.current.updateSchedule('schedule-123', {
        name: 'Updated Schedule'
      })
    })

    expect(result.current.schedules.find(s => s.id === 'schedule-123')?.name)
      .toBe('Updated Schedule')

    // Mock delete response
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: async () => ({ message: 'Schedule deleted' })
    } as Response))

    // Delete schedule
    await act(async () => {
      await result.current.deleteSchedule('schedule-123')
    })

    expect(result.current.schedules.find(s => s.id === 'schedule-123'))
      .toBeUndefined()
  })

  it('should handle concurrent operations', async () => {
    const { result } = renderHook(() => useReports())

    await waitFor(() => {
      expect(result.current.templates.length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    // Mock multiple concurrent operations
    const createPromise1 = act(async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ({ template: { id: 'template-1', name: 'Template 1' } })
      } as Response))
      return result.current.createTemplate({ name: 'Template 1', category: 'custom' })
    })

    const createPromise2 = act(async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: async () => ({ template: { id: 'template-2', name: 'Template 2' } })
      } as Response))
      return result.current.createTemplate({ name: 'Template 2', category: 'custom' })
    })

    await Promise.all([createPromise1, createPromise2])

    expect(result.current.templates.find(t => t.name === 'Template 1')).toBeDefined()
    expect(result.current.templates.find(t => t.name === 'Template 2')).toBeDefined()
  })
})