import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import ReportDesigner from '@/src/components/reports/ReportDesigner'
import { ReportTemplate } from '@/types/reports'

// Mock react-dnd for testing
jest.mock('react-dnd-html5-backend')

const mockTemplate: ReportTemplate = {
  id: 'test-template',
  user_id: 'user-123',
  name: 'Test Report',
  category: 'custom',
  template_data: {
    layout: {
      page_size: 'A4',
      orientation: 'portrait',
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
      header_height: 60,
      footer_height: 40,
      grid_columns: 12,
      grid_rows: 20
    },
    components: [
      {
        id: 'text-1',
        type: 'text',
        position: { x: 50, y: 100, width: 300, height: 100 },
        config: { content: 'Sample text' },
        styling: {
          background_color: '#ffffff',
          text_color: '#000000'
        }
      }
    ],
    styling: {
      color_scheme: {
        primary: '#2563eb', secondary: '#64748b', background: '#ffffff',
        surface: '#f8fafc', text_primary: '#1e293b', text_secondary: '#64748b',
        accent: '#0ea5e9', warning: '#f59e0b', error: '#dc2626', success: '#16a34a'
      },
      typography: {
        heading_font: 'Inter', body_font: 'Inter',
        heading_sizes: { h1: 24, h2: 20, h3: 18, h4: 16 },
        body_size: 14, line_height: 1.5
      },
      spacing: { component_margin: 16, section_padding: 24, element_spacing: 8 },
      borders: { default_width: 1, default_color: '#e5e7eb', default_style: 'solid' }
    },
    branding: {
      company_name: 'Test Company'
    },
    data_configuration: {
      sensors: ['SENSOR_001', 'SENSOR_002'],
      date_range: {
        start_date: '2023-01-01T00:00:00Z',
        end_date: '2023-01-31T23:59:59Z'
      },
      filters: {
        floor_numbers: [1, 2],
        equipment_types: ['HVAC', 'Lighting']
      },
      aggregation: 'daily'
    }
  },
  is_public: false,
  version: '1.0',
  tags: [],
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  usage_count: 0
}

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DndProvider backend={HTML5Backend}>
    {children}
  </DndProvider>
)

describe('ReportDesigner', () => {
  const mockOnTemplateChange = jest.fn()
  const mockOnSave = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the report designer interface', () => {
    render(
      <TestWrapper>
        <ReportDesigner
          template={mockTemplate}
          onTemplateChange={mockOnTemplateChange}
          onSave={mockOnSave}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Test Report')).toBeInTheDocument()
    expect(screen.getByText('Components')).toBeInTheDocument()
    expect(screen.getByText('Preview')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('should display component palette with all component types', () => {
    render(
      <TestWrapper>
        <ReportDesigner
          template={mockTemplate}
          onTemplateChange={mockOnTemplateChange}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Chart')).toBeInTheDocument()
    expect(screen.getByText('Table')).toBeInTheDocument()
    expect(screen.getByText('Text')).toBeInTheDocument()
    expect(screen.getByText('Metric')).toBeInTheDocument()
    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByText('Image')).toBeInTheDocument()
    expect(screen.getByText('Divider')).toBeInTheDocument()
  })

  it('should render existing components on canvas', () => {
    render(
      <TestWrapper>
        <ReportDesigner
          template={mockTemplate}
          onTemplateChange={mockOnTemplateChange}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Sample text')).toBeInTheDocument()
  })

  it('should toggle between edit and preview modes', () => {
    render(
      <TestWrapper>
        <ReportDesigner
          template={mockTemplate}
          onTemplateChange={mockOnTemplateChange}
        />
      </TestWrapper>
    )

    const previewButton = screen.getByText('Preview')
    fireEvent.click(previewButton)

    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('should enable save button when template is dirty', async () => {
    render(
      <TestWrapper>
        <ReportDesigner
          template={mockTemplate}
          onTemplateChange={mockOnTemplateChange}
        />
      </TestWrapper>
    )

    // Initially save should be disabled (no changes)
    const saveButton = screen.getByText('Save')
    expect(saveButton).toHaveClass('cursor-not-allowed')

    // Change template name to make it dirty
    const nameInput = screen.getByDisplayValue('Test Report')
    fireEvent.change(nameInput, { target: { value: 'Modified Report' } })

    await waitFor(() => {
      expect(mockOnTemplateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Modified Report'
        })
      )
    })
  })

  it('should call onSave when save button is clicked', async () => {
    mockOnSave.mockResolvedValue(undefined)

    render(
      <TestWrapper>
        <ReportDesigner
          template={mockTemplate}
          onTemplateChange={mockOnTemplateChange}
          onSave={mockOnSave}
        />
      </TestWrapper>
    )

    // Make template dirty first
    const nameInput = screen.getByDisplayValue('Test Report')
    fireEvent.change(nameInput, { target: { value: 'Modified Report' } })

    // Wait for state update and then click save
    await waitFor(() => {
      const saveButton = screen.getByText('Save')
      expect(saveButton).not.toHaveClass('cursor-not-allowed')
    })

    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)

    expect(mockOnSave).toHaveBeenCalled()
  })

  it('should handle component selection', () => {
    render(
      <TestWrapper>
        <ReportDesigner
          template={mockTemplate}
          onTemplateChange={mockOnTemplateChange}
        />
      </TestWrapper>
    )

    // Click on the text component
    const textComponent = screen.getByText('Sample text')
    fireEvent.click(textComponent)

    // Properties panel should appear (we'd need to check for properties panel content)
    expect(screen.getByText('Properties')).toBeInTheDocument()
  })

  it('should display component properties when selected', () => {
    render(
      <TestWrapper>
        <ReportDesigner
          template={mockTemplate}
          onTemplateChange={mockOnTemplateChange}
        />
      </TestWrapper>
    )

    // Click on the text component to select it
    const textComponent = screen.getByText('Sample text')
    fireEvent.click(textComponent)

    // Check for properties panel elements
    expect(screen.getByText('Properties')).toBeInTheDocument()
    expect(screen.getByText('Component Type')).toBeInTheDocument()
    expect(screen.getByText('Position & Size')).toBeInTheDocument()
  })

  it('should update component position through properties panel', async () => {
    render(
      <TestWrapper>
        <ReportDesigner
          template={mockTemplate}
          onTemplateChange={mockOnTemplateChange}
        />
      </TestWrapper>
    )

    // Select the component
    const textComponent = screen.getByText('Sample text')
    fireEvent.click(textComponent)

    // Find and update X position
    const xInput = screen.getByDisplayValue('50')
    fireEvent.change(xInput, { target: { value: '100' } })

    await waitFor(() => {
      expect(mockOnTemplateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          template_data: expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({
                id: 'text-1',
                position: expect.objectContaining({
                  x: 100
                })
              })
            ])
          })
        })
      )
    })
  })

  it('should update text component content', async () => {
    render(
      <TestWrapper>
        <ReportDesigner
          template={mockTemplate}
          onTemplateChange={mockOnTemplateChange}
        />
      </TestWrapper>
    )

    // Select the text component
    const textComponent = screen.getByText('Sample text')
    fireEvent.click(textComponent)

    // Find and update content textarea
    const contentTextarea = screen.getByDisplayValue('Sample text')
    fireEvent.change(contentTextarea, { target: { value: 'Updated text content' } })

    await waitFor(() => {
      expect(mockOnTemplateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          template_data: expect.objectContaining({
            components: expect.arrayContaining([
              expect.objectContaining({
                id: 'text-1',
                config: expect.objectContaining({
                  content: 'Updated text content'
                })
              })
            ])
          })
        })
      )
    })
  })

  it('should render in read-only mode', () => {
    render(
      <TestWrapper>
        <ReportDesigner
          template={mockTemplate}
          readOnly={true}
        />
      </TestWrapper>
    )

    // Component palette should not be visible
    expect(screen.queryByText('Components')).not.toBeInTheDocument()

    // Save button should not be visible
    expect(screen.queryByText('Save')).not.toBeInTheDocument()

    // Preview button should still be available
    expect(screen.getByText('Preview')).toBeInTheDocument()
  })

  it('should handle empty template', () => {
    const emptyTemplate = {
      ...mockTemplate,
      template_data: {
        ...mockTemplate.template_data,
        components: []
      }
    }

    render(
      <TestWrapper>
        <ReportDesigner
          template={emptyTemplate}
          onTemplateChange={mockOnTemplateChange}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Components')).toBeInTheDocument()
    // Should show empty canvas state
  })

  it('should handle component deletion', async () => {
    render(
      <TestWrapper>
        <ReportDesigner
          template={mockTemplate}
          onTemplateChange={mockOnTemplateChange}
        />
      </TestWrapper>
    )

    // Select the component first
    const textComponent = screen.getByText('Sample text')
    fireEvent.click(textComponent)

    // Find and click delete button (×)
    const deleteButton = screen.getByText('×')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockOnTemplateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          template_data: expect.objectContaining({
            components: []
          })
        })
      )
    })
  })

  it('should show unsaved changes indicator', () => {
    render(
      <TestWrapper>
        <ReportDesigner
          template={mockTemplate}
          onTemplateChange={mockOnTemplateChange}
        />
      </TestWrapper>
    )

    // Make a change
    const nameInput = screen.getByDisplayValue('Test Report')
    fireEvent.change(nameInput, { target: { value: 'Modified Report' } })

    // Should show unsaved changes indicator
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
  })

  it('should handle template prop updates', () => {
    const { rerender } = render(
      <TestWrapper>
        <ReportDesigner
          template={mockTemplate}
          onTemplateChange={mockOnTemplateChange}
        />
      </TestWrapper>
    )

    const updatedTemplate = {
      ...mockTemplate,
      name: 'Updated Template Name'
    }

    rerender(
      <TestWrapper>
        <ReportDesigner
          template={updatedTemplate}
          onTemplateChange={mockOnTemplateChange}
        />
      </TestWrapper>
    )

    expect(screen.getByDisplayValue('Updated Template Name')).toBeInTheDocument()
  })

  describe('Component Type Rendering', () => {
    const templateWithAllComponents = {
      ...mockTemplate,
      template_data: {
        ...mockTemplate.template_data,
        components: [
          { id: '1', type: 'text', position: { x: 0, y: 0, width: 100, height: 50 }, config: { content: 'Text' }, styling: {} },
          { id: '2', type: 'header', position: { x: 0, y: 60, width: 100, height: 50 }, config: { content: 'Header' }, styling: {} },
          { id: '3', type: 'chart', position: { x: 0, y: 120, width: 100, height: 50 }, config: { chart_type: 'bar' }, styling: {} },
          { id: '4', type: 'table', position: { x: 0, y: 180, width: 100, height: 50 }, config: {}, styling: {} },
          { id: '5', type: 'metric', position: { x: 0, y: 240, width: 100, height: 50 }, config: {}, styling: {} },
          { id: '6', type: 'image', position: { x: 0, y: 300, width: 100, height: 50 }, config: {}, styling: {} },
          { id: '7', type: 'divider', position: { x: 0, y: 360, width: 100, height: 50 }, config: {}, styling: {} }
        ] as any
      }
    }

    it('should render all component types correctly', () => {
      render(
        <TestWrapper>
          <ReportDesigner
            template={templateWithAllComponents}
            onTemplateChange={mockOnTemplateChange}
          />
        </TestWrapper>
      )

      expect(screen.getByText('Text')).toBeInTheDocument()
      expect(screen.getByText('Header')).toBeInTheDocument()
      expect(screen.getByText('📊 Chart (bar)')).toBeInTheDocument()
      expect(screen.getByText('📋 Table')).toBeInTheDocument()
      expect(screen.getByText('123.45')).toBeInTheDocument() // Metric component
      expect(screen.getByText('🖼️ Image')).toBeInTheDocument()
      // Divider would be rendered as a line, harder to test
    })
  })
})