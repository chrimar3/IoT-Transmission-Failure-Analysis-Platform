'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSubscription } from '../../../src/hooks/useSubscription'
import useReports from '../../../src/hooks/useReports'
import ReportDesigner from '../../../src/components/reports/ReportDesigner'
import { ReportTemplate, GeneratedReport, ReportSchedule, GenerateReportRequest, CreateReportScheduleRequest } from '../../../src/types/reports'
import { FeatureGate } from '../../../src/components/subscription/FeatureGate'

export default function ReportsPage() {
  const { data: _session } = useSession()
  const _subscription = useSubscription()
  const {
    templates,
    generatedReports,
    schedules,
    loading,
    error,
    createTemplate,
    generateReport,
    createSchedule
  } = useReports()

  const [activeTab, setActiveTab] = useState<'builder' | 'templates' | 'generated' | 'schedules'>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [_isCreating, _setIsCreating] = useState(false)

  const handleCreateTemplate = async () => {
    try {
      const newTemplate = await createTemplate({
        name: 'New Report Template',
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
          components: [],
          styling: {
            color_scheme: {
              primary: '#2563eb',
              secondary: '#64748b',
              background: '#ffffff',
              surface: '#f8fafc',
              text_primary: '#1e293b',
              text_secondary: '#64748b',
              accent: '#0ea5e9',
              warning: '#f59e0b',
              error: '#dc2626',
              success: '#16a34a'
            },
            typography: {
              heading_font: 'Inter',
              body_font: 'Inter',
              heading_sizes: { h1: 24, h2: 20, h3: 18, h4: 16 },
              body_size: 14,
              line_height: 1.5
            },
            spacing: { component_margin: 16, section_padding: 24, element_spacing: 8 },
            borders: { default_width: 1, default_color: '#e5e7eb', default_style: 'solid' }
          },
          branding: {},
          data_configuration: {
            sensors: [],
            date_range: { start_date: '', end_date: '' },
            filters: {},
            aggregation: 'hourly'
          }
        }
      })
      setSelectedTemplate(newTemplate)
      setActiveTab('builder')
    } catch (err) {
      console.error('Failed to create template:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <FeatureGate
      feature="advanced_reports"
      fallback={
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Advanced Report Builder
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Create professional reports with drag-and-drop design, automated scheduling,
              and multiple export formats.
            </p>
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Professional Tier Required</h2>
              <p className="mb-6">
                Upgrade to Professional tier (€29/month) to access advanced reporting features:
              </p>
              <ul className="text-left space-y-2 mb-6">
                <li>• Drag-and-drop report designer</li>
                <li>• Automated report scheduling</li>
                <li>• Professional export formats (PDF, Excel, PowerPoint, Word)</li>
                <li>• Executive dashboards and compliance reports</li>
                <li>• Email delivery and collaboration features</li>
              </ul>
              <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100">
                Upgrade to Professional
              </button>
            </div>
          </div>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Advanced Report Builder
          </h1>
          <p className="text-gray-600">
            Create professional reports with drag-and-drop design and automated scheduling
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="text-red-400">⚠️</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'templates', label: 'Templates', count: templates.length },
              { id: 'builder', label: 'Designer', count: null },
              { id: 'generated', label: 'Generated Reports', count: generatedReports.length },
              { id: 'schedules', label: 'Schedules', count: schedules.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'builder' | 'templates' | 'generated' | 'schedules')}
                className={`
                  whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }
                `}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-900">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'templates' && (
          <TemplatesTab
            templates={templates}
            onCreateTemplate={handleCreateTemplate}
            onEditTemplate={(template) => {
              setSelectedTemplate(template)
              setActiveTab('builder')
            }}
            onGenerateReport={generateReport}
          />
        )}

        {activeTab === 'builder' && (
          <BuilderTab
            template={selectedTemplate}
            onSave={async (template) => {
              // Save logic handled by ReportDesigner
              console.log('Template saved:', template)
            }}
          />
        )}

        {activeTab === 'generated' && (
          <GeneratedReportsTab reports={generatedReports} />
        )}

        {activeTab === 'schedules' && (
          <SchedulesTab
            schedules={schedules}
            templates={templates}
            onCreateSchedule={createSchedule}
          />
        )}
      </div>
    </FeatureGate>
  )
}

function TemplatesTab({
  templates,
  onCreateTemplate,
  onEditTemplate,
  onGenerateReport
}: {
  templates: ReportTemplate[]
  onCreateTemplate: () => void
  onEditTemplate: (template: ReportTemplate) => void
  onGenerateReport: (data: GenerateReportRequest) => Promise<GeneratedReport>
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Report Templates</h2>
        <button
          onClick={onCreateTemplate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{template.category}</p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                v{template.version}
              </span>
            </div>

            {template.description && (
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
              <span>Components: {template.template_data.components.length}</span>
              <span>Used: {template.usage_count} times</span>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => onEditTemplate(template)}
                className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200"
              >
                Edit
              </button>
              <button
                onClick={() => onGenerateReport({
                  template_id: template.id,
                  format: 'pdf'
                })}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
              >
                Generate
              </button>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 mb-4">No templates yet</p>
            <button
              onClick={onCreateTemplate}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Create Your First Template
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function BuilderTab({
  template,
  onSave
}: {
  template: ReportTemplate | null
  onSave: (template: ReportTemplate) => Promise<void>
}) {
  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No template selected</p>
        <p className="text-sm text-gray-400">
          Select a template from the Templates tab or create a new one
        </p>
      </div>
    )
  }

  return (
    <div className="h-screen">
      <ReportDesigner
        template={template}
        onSave={onSave}
        className="h-full"
      />
    </div>
  )
}

function GeneratedReportsTab({ reports }: { reports: GeneratedReport[] }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Generated Reports</h2>

      {reports.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No reports generated yet</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {reports.map((report) => (
              <li key={report.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{report.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`
                        px-2 py-1 text-xs font-medium rounded
                        ${report.status === 'completed' ? 'bg-green-100 text-green-800' :
                          report.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'}
                      `}>
                        {report.status}
                      </span>
                      {report.status === 'completed' && (
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SchedulesTab({
  schedules,
  templates: _templates,
  onCreateSchedule: _onCreateSchedule
}: {
  schedules: ReportSchedule[]
  templates: ReportTemplate[]
  onCreateSchedule: (data: CreateReportScheduleRequest) => Promise<ReportSchedule>
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Report Schedules</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Create Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No schedules configured</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {schedules.map((schedule) => (
              <li key={schedule.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{schedule.name}</p>
                      <p className="text-sm text-gray-500">
                        {schedule.frequency} • Next run: {new Date(schedule.next_run_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`
                        px-2 py-1 text-xs font-medium rounded
                        ${schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      `}>
                        {schedule.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}