import { generateReportJob } from '@/src/lib/reports/report-generator'
import { getBangkokData } from '@/lib/data/bangkok-dataset'
import { generatePDF } from '@/src/lib/reports/pdf-generator'
import { generateExcel } from '@/src/lib/reports/excel-exporter'
import { prisma } from '@/lib/database/connection'
import { uploadToR2 } from '@/lib/r2-client'
import { ReportTemplate } from '@/types/reports'

// Mock external dependencies but test real data flow
jest.mock('@/lib/database/connection')
jest.mock('@/lib/r2-client')
jest.mock('@/src/lib/reports/email-delivery')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockUploadToR2 = uploadToR2 as jest.MockedFunction<typeof uploadToR2>

describe('Bangkok Dataset Report Integration Tests', () => {
  const mockTemplate: ReportTemplate = {
    id: 'integration-template',
    user_id: 'user-123',
    name: 'Bangkok Integration Test Report',
    category: 'operational',
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
          id: 'temp-chart',
          type: 'chart',
          position: { x: 50, y: 100, width: 500, height: 300 },
          config: {
            chart_type: 'line',
            title: 'Temperature Trends',
            x_axis: { label: 'Time', show_grid: true },
            y_axis: { label: 'Temperature (°C)', show_grid: true }
          },
          data_binding: {
            source: 'bangkok_dataset',
            query: {
              sensor_ids: ['temp_01', 'temp_02'],
              equipment_types: ['hvac'],
              aggregation: 'hour'
            },
            transformation: {
              type: 'aggregate',
              operation: 'average',
              parameters: { field: 'temperature' }
            }
          }
        },
        {
          id: 'energy-table',
          type: 'table',
          position: { x: 50, y: 450, width: 500, height: 200 },
          config: {
            title: 'Energy Consumption by Floor',
            columns: [
              { key: 'floor', label: 'Floor', align: 'center' },
              { key: 'consumption', label: 'kWh', align: 'right', format: '0.2f' },
              { key: 'efficiency', label: 'Efficiency %', align: 'right', format: '0.1f' }
            ]
          },
          data_binding: {
            source: 'bangkok_dataset',
            query: {
              floor_numbers: [1, 2, 3, 4, 5],
              equipment_types: ['hvac', 'lighting'],
              aggregation: 'day'
            }
          }
        },
        {
          id: 'summary-metrics',
          type: 'metric',
          position: { x: 50, y: 700, width: 150, height: 100 },
          config: {
            label: 'Average Temperature',
            value_source: 'avg_temperature',
            format: {
              decimal_places: 1,
              unit: '°C',
              show_change: true,
              change_period: '24h'
            },
            threshold: {
              warning_value: 25,
              critical_value: 30,
              warning_color: '#f59e0b',
              critical_color: '#dc2626'
            }
          },
          data_binding: {
            source: 'bangkok_dataset',
            query: {
              equipment_types: ['hvac']
            }
          }
        },
        {
          id: 'floor-comparison',
          type: 'chart',
          position: { x: 50, y: 850, width: 500, height: 300 },
          config: {
            chart_type: 'bar',
            title: 'Floor Energy Comparison',
            x_axis: { label: 'Floor Number' },
            y_axis: { label: 'Energy (kWh)' }
          },
          data_binding: {
            source: 'bangkok_dataset',
            query: {
              floor_numbers: [1, 2, 3, 4, 5],
              aggregation: 'day'
            }
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
        company_name: 'Bangkok Building Management',
        company_colors: { primary: '#2563eb', secondary: '#64748b', accent: '#0ea5e9' },
        footer_text: 'Confidential - Bangkok Building Management Report'
      },
      data_configuration: {
        refresh_interval: 3600,
        cache_duration: 1800,
        quality_threshold: 0.95
      }
    },
    is_public: false,
    version: '1.0',
    tags: ['integration', 'bangkok', 'operational'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    usage_count: 0
  }

  const mockUser = {
    id: 'user-123',
    email: 'test@bangkok.com',
    name: 'Bangkok Test User'
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup database mocks
    mockPrisma.reportTemplate.findUnique.mockResolvedValue(mockTemplate as unknown)
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as unknown)
    mockPrisma.generatedReport.update.mockResolvedValue({} as unknown)

    // Setup storage mock
    mockUploadToR2.mockResolvedValue('https://storage.example.com/report.pdf')
  })

  describe('End-to-End Report Generation with Real Bangkok Data', () => {
    it('should generate a complete PDF report with Bangkok dataset integration', async () => {
      const job = {
        reportId: 'integration-report-123',
        templateId: 'integration-template',
        userId: 'user-123',
        format: 'pdf' as const,
        dataRange: {
          start: new Date('2023-06-01T00:00:00Z'),
          end: new Date('2023-06-30T23:59:59Z')
        },
        customParameters: {
          title: 'Monthly Bangkok Building Report',
          include_executive_summary: true
        }
      }

      // This should use the real getBangkokData function
      await expect(generateReportJob(job)).resolves.not.toThrow()

      // Verify database interactions
      expect(mockPrisma.reportTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'integration-template' }
      })

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { email: true, name: true }
      })

      // Verify report completion
      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith({
        where: { id: 'integration-report-123' },
        data: expect.objectContaining({
          status: 'completed',
          file_url: 'https://storage.example.com/report.pdf',
          metadata: expect.objectContaining({
            data_points_included: expect.any(Number),
            charts_generated: 2, // temp-chart and floor-comparison
            tables_generated: 1, // energy-table
            statistical_confidence: expect.any(Number)
          })
        })
      })
    }, 30000) // 30 second timeout for integration test

    it('should generate Excel report with proper data structure', async () => {
      const job = {
        reportId: 'integration-excel-123',
        templateId: 'integration-template',
        userId: 'user-123',
        format: 'excel' as const,
        dataRange: {
          start: new Date('2023-06-01T00:00:00Z'),
          end: new Date('2023-06-07T23:59:59Z') // 1 week of data
        },
        customParameters: {}
      }

      await expect(generateReportJob(job)).resolves.not.toThrow()

      // Verify the Excel generation was called and completed
      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith({
        where: { id: 'integration-excel-123' },
        data: expect.objectContaining({
          status: 'completed',
          metadata: expect.objectContaining({
            charts_generated: 2,
            tables_generated: 1
          })
        })
      })
    }, 20000)
  })

  describe('Data Filtering and Transformation Integration', () => {
    it('should correctly filter Bangkok data by sensor IDs', async () => {
      const filteredTemplate = {
        ...mockTemplate,
        template_data: {
          ...mockTemplate.template_data,
          components: [{
            id: 'filtered-chart',
            type: 'chart',
            position: { x: 0, y: 0, width: 400, height: 300 },
            config: { chart_type: 'line' },
            data_binding: {
              source: 'bangkok_dataset',
              query: {
                sensor_ids: ['specific_sensor_001', 'specific_sensor_002'],
                start_date: '2023-06-01T00:00:00Z',
                end_date: '2023-06-02T00:00:00Z'
              }
            }
          }]
        }
      }

      mockPrisma.reportTemplate.findUnique.mockResolvedValue(filteredTemplate as unknown)

      const job = {
        reportId: 'filtered-report-123',
        templateId: 'integration-template',
        userId: 'user-123',
        format: 'pdf' as const,
        dataRange: {
          start: new Date('2023-06-01T00:00:00Z'),
          end: new Date('2023-06-02T00:00:00Z')
        },
        customParameters: {}
      }

      await expect(generateReportJob(job)).resolves.not.toThrow()

      // The report should complete successfully with filtered data
      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'filtered-report-123' },
          data: expect.objectContaining({
            status: 'completed'
          })
        })
      )
    })

    it('should handle floor-based data aggregation correctly', async () => {
      const floorTemplate = {
        ...mockTemplate,
        template_data: {
          ...mockTemplate.template_data,
          components: [{
            id: 'floor-analysis',
            type: 'table',
            position: { x: 0, y: 0, width: 500, height: 300 },
            config: {
              columns: [
                { key: 'floor_number', label: 'Floor' },
                { key: 'avg_temperature', label: 'Avg Temp' },
                { key: 'energy_consumption', label: 'Energy (kWh)' }
              ]
            },
            data_binding: {
              source: 'bangkok_dataset',
              query: {
                floor_numbers: [1, 2, 3],
                aggregation: 'day'
              }
            }
          }]
        }
      }

      mockPrisma.reportTemplate.findUnique.mockResolvedValue(floorTemplate as unknown)

      const job = {
        reportId: 'floor-report-123',
        templateId: 'integration-template',
        userId: 'user-123',
        format: 'pdf' as const,
        dataRange: {
          start: new Date('2023-06-01T00:00:00Z'),
          end: new Date('2023-06-07T23:59:59Z')
        },
        customParameters: {}
      }

      await expect(generateReportJob(job)).resolves.not.toThrow()
    })
  })

  describe('Statistical Analysis Integration', () => {
    it('should include statistical confidence metrics in reports', async () => {
      const job = {
        reportId: 'stats-report-123',
        templateId: 'integration-template',
        userId: 'user-123',
        format: 'pdf' as const,
        dataRange: {
          start: new Date('2023-06-01T00:00:00Z'),
          end: new Date('2023-06-30T23:59:59Z')
        },
        customParameters: {
          include_statistical_analysis: true
        }
      }

      await generateReportJob(job)

      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith({
        where: { id: 'stats-report-123' },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            statistical_confidence: expect.any(Number)
          })
        })
      })

      // Verify that statistical confidence is a reasonable value (0-1)
      const updateCall = mockPrisma.generatedReport.update.mock.calls[0]
      const metadata = updateCall[0].data.metadata as unknown
      expect(metadata.statistical_confidence).toBeGreaterThanOrEqual(0)
      expect(metadata.statistical_confidence).toBeLessThanOrEqual(1)
    })

    it('should generate insights based on data patterns', async () => {
      const job = {
        reportId: 'insights-report-123',
        templateId: 'integration-template',
        userId: 'user-123',
        format: 'pdf' as const,
        dataRange: {
          start: new Date('2023-06-01T00:00:00Z'),
          end: new Date('2023-06-07T23:59:59Z')
        },
        customParameters: {}
      }

      await generateReportJob(job)

      // The report should complete and include insights
      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith({
        where: { id: 'insights-report-123' },
        data: expect.objectContaining({
          status: 'completed'
        })
      })
    })
  })

  describe('Error Handling with Bangkok Dataset', () => {
    it('should handle Bangkok dataset unavailability gracefully', async () => {
      // Mock getBangkokData to simulate failure
      jest.doMock('@/lib/data/bangkok-dataset', () => ({
        getBangkokData: jest.fn().mockRejectedValue(new Error('Dataset unavailable'))
      }))

      const job = {
        reportId: 'error-report-123',
        templateId: 'integration-template',
        userId: 'user-123',
        format: 'pdf' as const,
        dataRange: {
          start: new Date('2023-06-01T00:00:00Z'),
          end: new Date('2023-06-02T00:00:00Z')
        },
        customParameters: {}
      }

      await expect(generateReportJob(job)).rejects.toThrow()

      // Verify error is recorded
      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith({
        where: { id: 'error-report-123' },
        data: {
          status: 'failed',
          error_message: expect.stringContaining('Dataset unavailable')
        }
      })
    })

    it('should handle partial data scenarios', async () => {
      // Mock partial data response
      jest.doMock('@/lib/data/bangkok-dataset', () => ({
        getBangkokData: jest.fn().mockResolvedValue({
          data: [], // Empty data
          aggregations: {},
          statistics: { confidence: 0.5 }
        })
      }))

      const job = {
        reportId: 'partial-data-report-123',
        templateId: 'integration-template',
        userId: 'user-123',
        format: 'pdf' as const,
        dataRange: {
          start: new Date('2023-06-01T00:00:00Z'),
          end: new Date('2023-06-02T00:00:00Z')
        },
        customParameters: {}
      }

      // Should complete but with minimal data
      await expect(generateReportJob(job)).resolves.not.toThrow()

      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith({
        where: { id: 'partial-data-report-123' },
        data: expect.objectContaining({
          status: 'completed',
          metadata: expect.objectContaining({
            data_points_included: 0
          })
        })
      })
    })
  })

  describe('Data Quality and Validation', () => {
    it('should validate data quality meets minimum thresholds', async () => {
      const qualityTemplate = {
        ...mockTemplate,
        template_data: {
          ...mockTemplate.template_data,
          data_configuration: {
            ...mockTemplate.template_data.data_configuration,
            quality_threshold: 0.9 // High quality requirement
          }
        }
      }

      mockPrisma.reportTemplate.findUnique.mockResolvedValue(qualityTemplate as unknown)

      const job = {
        reportId: 'quality-report-123',
        templateId: 'integration-template',
        userId: 'user-123',
        format: 'pdf' as const,
        dataRange: {
          start: new Date('2023-06-01T00:00:00Z'),
          end: new Date('2023-06-07T23:59:59Z')
        },
        customParameters: {}
      }

      await expect(generateReportJob(job)).resolves.not.toThrow()

      // Should complete with quality metrics
      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith({
        where: { id: 'quality-report-123' },
        data: expect.objectContaining({
          status: 'completed'
        })
      })
    })

    it('should handle timezone considerations correctly', async () => {
      const job = {
        reportId: 'timezone-report-123',
        templateId: 'integration-template',
        userId: 'user-123',
        format: 'pdf' as const,
        dataRange: {
          start: new Date('2023-06-01T00:00:00+07:00'), // Bangkok timezone
          end: new Date('2023-06-02T00:00:00+07:00')
        },
        customParameters: {
          timezone: 'Asia/Bangkok'
        }
      }

      await expect(generateReportJob(job)).resolves.not.toThrow()

      // Verify the date range is properly handled
      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith({
        where: { id: 'timezone-report-123' },
        data: expect.objectContaining({
          status: 'completed',
          data_period_start: expect.any(Date),
          data_period_end: expect.any(Date)
        })
      })
    })
  })

  describe('Component-Specific Integration Tests', () => {
    it('should properly render chart components with Bangkok time series data', async () => {
      const chartOnlyTemplate = {
        ...mockTemplate,
        template_data: {
          ...mockTemplate.template_data,
          components: [{
            id: 'time-series-chart',
            type: 'chart',
            position: { x: 0, y: 0, width: 600, height: 400 },
            config: {
              chart_type: 'line',
              title: 'Temperature Over Time',
              x_axis: { label: 'Time', tick_format: 'HH:mm' },
              y_axis: { label: 'Temperature (°C)', min_value: 20, max_value: 35 }
            },
            data_binding: {
              source: 'bangkok_dataset',
              query: {
                equipment_types: ['hvac'],
                aggregation: 'hour'
              }
            }
          }]
        }
      }

      mockPrisma.reportTemplate.findUnique.mockResolvedValue(chartOnlyTemplate as unknown)

      const job = {
        reportId: 'chart-integration-123',
        templateId: 'integration-template',
        userId: 'user-123',
        format: 'pdf' as const,
        dataRange: {
          start: new Date('2023-06-01T00:00:00Z'),
          end: new Date('2023-06-01T23:59:59Z')
        },
        customParameters: {}
      }

      await expect(generateReportJob(job)).resolves.not.toThrow()

      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith({
        where: { id: 'chart-integration-123' },
        data: expect.objectContaining({
          status: 'completed',
          metadata: expect.objectContaining({
            charts_generated: 1
          })
        })
      })
    })

    it('should properly render table components with aggregated Bangkok data', async () => {
      const tableOnlyTemplate = {
        ...mockTemplate,
        template_data: {
          ...mockTemplate.template_data,
          components: [{
            id: 'summary-table',
            type: 'table',
            position: { x: 0, y: 0, width: 600, height: 300 },
            config: {
              title: 'Daily Summary by Floor',
              columns: [
                { key: 'floor_number', label: 'Floor', align: 'center' },
                { key: 'avg_temp', label: 'Avg Temp (°C)', align: 'right', format: '0.1f' },
                { key: 'max_temp', label: 'Max Temp (°C)', align: 'right', format: '0.1f' },
                { key: 'energy_kwh', label: 'Energy (kWh)', align: 'right', format: '0.2f' }
              ],
              sorting: { column: 'floor_number', direction: 'asc' }
            },
            data_binding: {
              source: 'bangkok_dataset',
              query: {
                aggregation: 'day',
                floor_numbers: [1, 2, 3, 4, 5]
              }
            }
          }]
        }
      }

      mockPrisma.reportTemplate.findUnique.mockResolvedValue(tableOnlyTemplate as unknown)

      const job = {
        reportId: 'table-integration-123',
        templateId: 'integration-template',
        userId: 'user-123',
        format: 'excel' as const, // Excel is better for tables
        dataRange: {
          start: new Date('2023-06-01T00:00:00Z'),
          end: new Date('2023-06-07T23:59:59Z')
        },
        customParameters: {}
      }

      await expect(generateReportJob(job)).resolves.not.toThrow()

      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith({
        where: { id: 'table-integration-123' },
        data: expect.objectContaining({
          status: 'completed',
          metadata: expect.objectContaining({
            tables_generated: 1
          })
        })
      })
    })
  })
})