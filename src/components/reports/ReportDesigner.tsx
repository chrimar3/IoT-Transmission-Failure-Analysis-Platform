'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import {
  ReportTemplate,
  ReportComponent,
  ComponentType,
  DEFAULT_REPORT_LAYOUT,
  DEFAULT_COLOR_SCHEME,
  DEFAULT_TYPOGRAPHY
} from '../../types/reports'

interface ReportDesignerProps {
  template?: ReportTemplate
  onTemplateChange?: (_template: ReportTemplate) => void
  onSave?: (_template: ReportTemplate) => Promise<void>
  readOnly?: boolean
  className?: string
}

interface DragItem {
  type: string
  componentType?: ComponentType
  id?: string
  component?: ReportComponent
}

const COMPONENT_TYPES: Array<{ type: ComponentType; label: string; icon: string }> = [
  { type: 'chart', label: 'Chart', icon: '📊' },
  { type: 'table', label: 'Table', icon: '📋' },
  { type: 'text', label: 'Text', icon: '📝' },
  { type: 'metric', label: 'Metric', icon: '🔢' },
  { type: 'header', label: 'Header', icon: '📌' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'divider', label: 'Divider', icon: '➖' }
]

export default function ReportDesigner({
  _template,
  onTemplateChange,
  onSave,
  readOnly = false,
  className = ''
}: ReportDesignerProps) {
  const [currentTemplate, setCurrentTemplate] = useState<ReportTemplate>(
    template || createDefaultTemplate()
  )
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [_isPreviewMode, setIsPreviewMode] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Update template when prop changes
  useEffect(() => {
    if (_template) {
      setCurrentTemplate(_template)
      setIsDirty(false)
    }
  }, [_template])

  const updateTemplate = useCallback((updates: Partial<ReportTemplate>) => {
    const updatedTemplate = { ...currentTemplate, ...updates }
    setCurrentTemplate(updatedTemplate)
    setIsDirty(true)
    onTemplateChange?.(updatedTemplate)
  }, [currentTemplate, onTemplateChange])

  const addComponent = useCallback((type: ComponentType, position: { x: number; y: number }) => {
    const newComponent: ReportComponent = {
      id: `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      position: {
        x: Math.max(0, position.x),
        y: Math.max(0, position.y),
        width: getDefaultWidth(type),
        height: getDefaultHeight(type)
      },
      config: getDefaultConfig(type),
      styling: {
        background_color: DEFAULT_COLOR_SCHEME.surface,
        border_color: DEFAULT_COLOR_SCHEME.secondary,
        border_width: 1,
        border_radius: 4,
        padding: 16
      }
    }

    updateTemplate({
      template_data: {
        ...currentTemplate.template_data,
        components: [...currentTemplate.template_data.components, newComponent]
      }
    })

    setSelectedComponent(newComponent.id)
  }, [currentTemplate, updateTemplate])

  const updateComponent = useCallback((id: string, updates: Partial<ReportComponent>) => {
    const updatedComponents = currentTemplate.template_data.components.map(comp =>
      comp.id === id ? { ...comp, ...updates } : comp
    )

    updateTemplate({
      template_data: {
        ...currentTemplate.template_data,
        components: updatedComponents
      }
    })
  }, [currentTemplate, updateTemplate])

  const deleteComponent = useCallback((id: string) => {
    const updatedComponents = currentTemplate.template_data.components.filter(comp => comp.id !== id)

    updateTemplate({
      template_data: {
        ...currentTemplate.template_data,
        components: updatedComponents
      }
    })

    if (selectedComponent === id) {
      setSelectedComponent(null)
    }
  }, [currentTemplate, updateTemplate, selectedComponent])

  const handleSave = useCallback(async () => {
    if (onSave && isDirty) {
      try {
        await onSave(currentTemplate)
        setIsDirty(false)
      } catch (error) {
        console.error('Failed to save _template:', error)
        // Could add error notification here
      }
    }
  }, [onSave, isDirty, currentTemplate])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`flex h-full bg-gray-50 ${className}`}>
        {/* Component Palette */}
        {!readOnly && (
          <ComponentPalette
            components={COMPONENT_TYPES}
            disabled={_isPreviewMode}
          />
        )}

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <ReportToolbar
            template={currentTemplate}
            isDirty={isDirty}
            isPreviewMode={_isPreviewMode}
            onSave={handleSave}
            onPreviewToggle={() => setIsPreviewMode(!_isPreviewMode)}
            onTemplateChange={updateTemplate}
            readOnly={readOnly}
          />

          {/* Canvas */}
          <div className="flex-1 overflow-auto bg-white">
            <ReportCanvas
              ref={canvasRef}
              template={currentTemplate}
              selectedComponent={selectedComponent}
              isPreviewMode={_isPreviewMode}
              onComponentAdd={addComponent}
              onComponentUpdate={updateComponent}
              onComponentDelete={deleteComponent}
              onComponentSelect={setSelectedComponent}
              readOnly={readOnly}
            />
          </div>
        </div>

        {/* Properties Panel */}
        {!readOnly && selectedComponent && (
          <PropertiesPanel
            component={currentTemplate.template_data.components.find(c => c.id === selectedComponent)}
            template={currentTemplate}
            onComponentUpdate={updateComponent}
            onTemplateUpdate={updateTemplate}
          />
        )}
      </div>
    </DndProvider>
  )
}

// Component Palette for dragging new elements
function ComponentPalette({
  components,
  disabled
}: {
  components: Array<{ type: ComponentType; label: string; icon: string }>
  disabled: boolean
}) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Components</h3>
      <div className="space-y-2">
        {components.map((component) => (
          <DraggableComponent
            key={component.type}
            type={component.type}
            label={component.label}
            icon={component.icon}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

function DraggableComponent({
  type,
  label,
  icon,
  disabled
}: {
  type: ComponentType
  label: string
  icon: string
  disabled: boolean
}) {
  const [{ isDragging }, drag] = useDrag({
    type: 'component',
    item: { type: 'component', componentType: type } as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    canDrag: !disabled
  })

  return (
    <div
      ref={drag}
      className={`
        flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors
        ${disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
        }
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

// Toolbar with save, preview, and template options
function ReportToolbar({
  _template,
  isDirty,
  _isPreviewMode,
  onSave,
  onPreviewToggle,
  onTemplateChange,
  readOnly
}: {
  _template: ReportTemplate
  isDirty: boolean
  _isPreviewMode: boolean
  onSave: () => void
  onPreviewToggle: () => void
  onTemplateChange: (updates: Partial<ReportTemplate>) => void
  readOnly: boolean
}) {
  return (
    <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <input
          type="text"
          value={template.name}
          onChange={(e) => onTemplateChange({ name: e.target.value })}
          className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0"
          placeholder="Report Name"
          readOnly={readOnly}
        />
        {isDirty && (
          <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
            Unsaved changes
          </span>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={onPreviewToggle}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${isPreviewMode
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          {isPreviewMode ? 'Edit' : 'Preview'}
        </button>

        {!readOnly && (
          <button
            onClick={onSave}
            disabled={!isDirty}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${isDirty
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            Save
          </button>
        )}
      </div>
    </div>
  )
}

// Main canvas area with drop zone
const ReportCanvas = React.forwardRef<HTMLDivElement, {
  template: ReportTemplate
  selectedComponent: string | null
  isPreviewMode: boolean
  onComponentAdd: (type: ComponentType, position: { x: number; y: number }) => void
  onComponentUpdate: (id: string, updates: Partial<ReportComponent>) => void
  onComponentDelete: (id: string) => void
  onComponentSelect: (id: string | null) => void
  readOnly: boolean
}>(({
  _template,
  selectedComponent,
  _isPreviewMode,
  onComponentAdd,
  onComponentUpdate,
  onComponentDelete,
  onComponentSelect,
  readOnly
}, ref) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'component',
    drop: (item: DragItem, monitor) => {
      if (!monitor.didDrop() && item.componentType) {
        const clientOffset = monitor.getClientOffset()
        const canvasRect = (ref as React.RefObject<HTMLDivElement>).current?.getBoundingClientRect()

        if (clientOffset && canvasRect) {
          const x = clientOffset.x - canvasRect.left
          const y = clientOffset.y - canvasRect.top
          onComponentAdd(item.componentType, { x, y })
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  })

  const layout = template.template_data.layout || DEFAULT_REPORT_LAYOUT

  return (
    <div
      ref={(node) => {
        drop(node)
        if (ref && typeof ref === 'object') {
          ref.current = node
        }
      }}
      className={`
        relative mx-auto my-8 bg-white shadow-lg
        ${isOver && !readOnly ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
      `}
      style={{
        width: getPageWidth(layout.page_size),
        minHeight: getPageHeight(layout.page_size),
        padding: `${layout.margins.top}px ${layout.margins.right}px ${layout.margins.bottom}px ${layout.margins.left}px`
      }}
      onClick={() => !readOnly && onComponentSelect(null)}
    >
      {/* Grid overlay in edit mode */}
      {!isPreviewMode && !readOnly && (
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e5e7eb 1px, transparent 1px),
              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: `${100 / layout.grid_columns}% ${100 / layout.grid_rows}%`
          }}
        />
      )}

      {/* Components */}
      {template.template_data.components.map((component) => (
        <ReportComponentRenderer
          key={component.id}
          component={component}
          isSelected={selectedComponent === component.id}
          isPreviewMode={_isPreviewMode}
          onUpdate={onComponentUpdate}
          onDelete={onComponentDelete}
          onSelect={onComponentSelect}
          readOnly={readOnly}
        />
      ))}

      {/* Drop zone hint */}
      {isOver && !readOnly && template.template_data.components.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-lg">
          Drop a component here to get started
        </div>
      )}
    </div>
  )
})

ReportCanvas.displayName = 'ReportCanvas'

// Component renderer with selection and editing
function ReportComponentRenderer({
  component,
  isSelected,
  _isPreviewMode,
  _onUpdate,
  onDelete,
  onSelect,
  readOnly
}: {
  component: ReportComponent
  isSelected: boolean
  _isPreviewMode: boolean
  _onUpdate: (id: string, updates: Partial<ReportComponent>) => void
  onDelete: (id: string) => void
  onSelect: (id: string | null) => void
  readOnly: boolean
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!readOnly) {
      onSelect(component.id)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(component.id)
  }

  return (
    <div
      className={`
        absolute cursor-pointer transition-all duration-200
        ${isSelected && !isPreviewMode ? 'ring-2 ring-blue-500 ring-opacity-75' : ''}
        ${isPreviewMode ? 'cursor-default' : ''}
      `}
      style={{
        left: component.position.x,
        top: component.position.y,
        width: component.position.width,
        height: component.position.height,
        backgroundColor: component.styling?.background_color,
        borderColor: component.styling?.border_color,
        borderWidth: component.styling?.border_width,
        borderRadius: component.styling?.border_radius,
        padding: component.styling?.padding
      }}
      onClick={handleClick}
    >
      {/* Component content based on type */}
      <ComponentContent component={component} isPreviewMode={_isPreviewMode} />

      {/* Selection controls */}
      {isSelected && !isPreviewMode && !readOnly && (
        <div className="absolute -top-8 left-0 flex items-center space-x-1 bg-blue-600 text-white px-2 py-1 rounded text-xs">
          <span>{component.type}</span>
          <button
            onClick={handleDelete}
            className="ml-2 hover:bg-blue-700 rounded px-1"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

// Render component content based on type
function ComponentContent({
  component,
  _isPreviewMode
}: {
  component: ReportComponent
  _isPreviewMode: boolean
}) {
  switch (component.type) {
    case 'text':
      return (
        <div
          className="h-full w-full text-sm"
          style={{
            fontSize: component.styling?.font_size,
            fontWeight: component.styling?.font_weight,
            color: component.styling?.text_color,
            textAlign: component.styling?.text_align
          }}
        >
          {component.config.content || 'Text component'}
        </div>
      )

    case 'header':
      return (
        <div
          className="h-full w-full font-bold text-lg flex items-center"
          style={{
            fontSize: component.styling?.font_size || 18,
            color: component.styling?.text_color,
            textAlign: component.styling?.text_align
          }}
        >
          {component.config.content || 'Header'}
        </div>
      )

    case 'chart':
      return (
        <div className="h-full w-full bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500">
          📊 Chart ({component.config.chart_type || 'line'})
        </div>
      )

    case 'table':
      return (
        <div className="h-full w-full bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500">
          📋 Table
        </div>
      )

    case 'metric':
      return (
        <div className="h-full w-full flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-blue-600">123.45</div>
          <div className="text-sm text-gray-600">Sample Metric</div>
        </div>
      )

    case 'image':
      return (
        <div className="h-full w-full bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500">
          🖼️ Image
        </div>
      )

    case 'divider':
      return (
        <div className="h-full w-full flex items-center justify-center">
          <div className="w-full h-px bg-gray-300"></div>
        </div>
      )

    default:
      return (
        <div className="h-full w-full bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500">
          {component.type}
        </div>
      )
  }
}

// Properties panel for editing selected component
function PropertiesPanel({
  component,
  _template,
  onComponentUpdate,
  _onTemplateUpdate
}: {
  component?: ReportComponent
  _template: ReportTemplate
  onComponentUpdate: (id: string, updates: Partial<ReportComponent>) => void
  onTemplateUpdate: (updates: Partial<ReportTemplate>) => void
}) {
  if (!component) return null

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Properties</h3>

      {/* Component-specific properties will be implemented in separate components */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Component Type
          </label>
          <div className="text-sm text-gray-900">{component.type}</div>
        </div>

        {/* Position and Size */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Position & Size
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-gray-600">X</label>
              <input
                type="number"
                value={component.position.x}
                onChange={(e) => onComponentUpdate(component.id, {
                  position: { ...component.position, x: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-gray-600">Y</label>
              <input
                type="number"
                value={component.position.y}
                onChange={(e) => onComponentUpdate(component.id, {
                  position: { ...component.position, y: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-gray-600">Width</label>
              <input
                type="number"
                value={component.position.width}
                onChange={(e) => onComponentUpdate(component.id, {
                  position: { ...component.position, width: parseInt(e.target.value) || 100 }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-gray-600">Height</label>
              <input
                type="number"
                value={component.position.height}
                onChange={(e) => onComponentUpdate(component.id, {
                  position: { ...component.position, height: parseInt(e.target.value) || 100 }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Component-specific config */}
        {component.type === 'text' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={component.config.content || ''}
              onChange={(e) => onComponentUpdate(component.id, {
                config: { ...component.config, content: e.target.value }
              })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              rows={3}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Helper functions
function createDefaultTemplate(): ReportTemplate {
  return {
    id: '',
    user_id: '',
    name: 'New Report',
    category: 'custom',
    template_data: {
      layout: DEFAULT_REPORT_LAYOUT,
      components: [],
      styling: {
        color_scheme: DEFAULT_COLOR_SCHEME,
        typography: DEFAULT_TYPOGRAPHY,
        spacing: { component_margin: 16, section_padding: 24, element_spacing: 8 },
        borders: { default_width: 1, default_color: '#e5e7eb', default_style: 'solid' }
      },
      branding: {},
      data_configuration: {}
    },
    is_public: false,
    version: '1.0',
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    usage_count: 0
  }
}

function getDefaultWidth(type: ComponentType): number {
  switch (type) {
    case 'header': return 400
    case 'text': return 300
    case 'chart': return 400
    case 'table': return 500
    case 'metric': return 200
    case 'image': return 300
    case 'divider': return 400
    default: return 200
  }
}

function getDefaultHeight(type: ComponentType): number {
  switch (type) {
    case 'header': return 60
    case 'text': return 100
    case 'chart': return 300
    case 'table': return 200
    case 'metric': return 100
    case 'image': return 200
    case 'divider': return 20
    default: return 100
  }
}

function getDefaultConfig(type: ComponentType): unknown {
  switch (type) {
    case 'text':
      return { content: 'Lorem ipsum dolor sit amet...' }
    case 'header':
      return { content: 'Report Header' }
    case 'chart':
      return { chart_type: 'line' }
    case 'table':
      return { columns: [] }
    case 'metric':
      return { format: { decimal_places: 2, unit: '', prefix: '', suffix: '' } }
    case 'image':
      return { alt_text: 'Report image' }
    default:
      return {}
  }
}

function getPageWidth(pageSize: string): number {
  switch (pageSize) {
    case 'A4': return 794  // 210mm at 96 DPI
    case 'Letter': return 816  // 8.5in at 96 DPI
    case 'Legal': return 816   // 8.5in at 96 DPI
    case 'A3': return 1123  // 297mm at 96 DPI
    default: return 794
  }
}

function getPageHeight(pageSize: string): number {
  switch (pageSize) {
    case 'A4': return 1123  // 297mm at 96 DPI
    case 'Letter': return 1056  // 11in at 96 DPI
    case 'Legal': return 1344   // 14in at 96 DPI
    case 'A3': return 1587  // 420mm at 96 DPI
    default: return 1123
  }
}