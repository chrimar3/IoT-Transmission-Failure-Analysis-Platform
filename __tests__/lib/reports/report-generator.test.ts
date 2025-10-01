import { generateReportJob } from '@/src/lib/reports/report-generator'
import { prisma } from '@/lib/database/connection'
import { getBangkokData } from '@/lib/data/bangkok-dataset'
import { uploadToR2 } from '@/lib/r2-client'
import { sendReportEmail } from '@/src/lib/reports/email-delivery'
import { generatePDF } from '@/src/lib/reports/pdf-generator'
import { generateExcel } from '@/src/lib/reports/excel-exporter'

// Mock dependencies
jest.mock('@/lib/database/connection')
jest.mock('@/src/lib/data/bangkok-dataset')
jest.mock('@/lib/r2-client')
jest.mock('@/src/lib/reports/email-delivery')
jest.mock('@/src/lib/reports/pdf-generator')
jest.mock('@/src/lib/reports/excel-exporter')
jest.mock('@/src/lib/reports/powerpoint-builder')
jest.mock('@/src/lib/reports/word-generator')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetBangkokData = getBangkokData as jest.MockedFunction<typeof getBangkokData>
const mockUploadToR2 = uploadToR2 as jest.MockedFunction<typeof uploadToR2>
const mockSendReportEmail = sendReportEmail as jest.MockedFunction<typeof sendReportEmail>
const mockGeneratePDF = generatePDF as jest.MockedFunction<typeof generatePDF>
const mockGenerateExcel = generateExcel as jest.MockedFunction<typeof generateExcel>

describe('Report Generation Engine', () => {
  const mockTemplate = {
    id: 'template-123',
    name: 'Test Report',
    version: '1.0',
    template_data: {
      components: [
        {
          id: 'chart-1',
          type: 'chart',
          config: { chart_type: 'line' },
          data_binding: { source: 'bangkok_dataset' }
        },
        {
          id: 'table-1',
          type: 'table',
          config: { columns: [] },
          data_binding: { source: 'bangkok_dataset' }
        }
      ]
    }
  }

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User'
  }

  const mockJob = {
    reportId: 'report-123',
    templateId: 'template-123',
    userId: 'user-123',
    format: 'pdf' as const,
    dataRange: {
      start: new Date('2023-01-01'),
      end: new Date('2023-01-31')
    },
    customParameters: {}
  }

  const mockBangkokData = {
    data: [
      {
        timestamp: '2023-01-01T00:00:00Z',
        value: 25.5,
        sensor_id: 'sensor-1',
        floor_number: 1,
        equipment_type: 'hvac'
      }
    ],
    aggregations: {
      mean: 25.5,
      count: 1
    },
    statistics: {
      confidence: 0.95,
      trend: 0.1
    }
  }

  beforeEach(() => {
    (jest as any).clearAllMocks()

    // Setup default mocks
    (mockPrisma.reportTemplate.findUnique as jest.MockedFunction<any>).mockResolvedValue(mockTemplate as any)
    (mockPrisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue(mockUser as any)
    (mockPrisma.generatedReport.update as jest.MockedFunction<any>).mockResolvedValue({} as any)

    (mockGetBangkokData as jest.MockedFunction<any>).mockResolvedValue(mockBangkokData as any)
    mockUploadToR2.mockResolvedValue({ url: 'https://example.com/report.pdf', size: 1024 })
    mockSendReportEmail.mockResolvedValue()

    mockGeneratePDF.mockResolvedValue(Buffer.from('mock-pdf-content'))
    mockGenerateExcel.mockResolvedValue(Buffer.from('mock-excel-content'))
  })

  describe('generateReportJob', () => {
    it('should successfully generate a PDF report', async () => {
      await generateReportJob(mockJob)

      expect(mockPrisma.reportTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-123' }
      })

      expect(mockGetBangkokData).toHaveBeenCalledWith({
        startDate: mockJob.dataRange.start,
        endDate: mockJob.dataRange.end,
        includeAggregations: true,
        includeStatistics: true
      })

      expect(mockGeneratePDF).toHaveBeenCalledWith(
        mockTemplate,
        expect.objectContaining({
          dataPoints: mockBangkokData.data,
          aggregations: mockBangkokData.aggregations,
          statisticalConfidence: 0.95
        }),
        {}
      )

      expect(mockUploadToR2).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringMatching(/reports\/user-123\/report-123\/.*\.pdf/),
        'application/pdf'
      )

      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: expect.objectContaining({
          status: 'completed',
          file_url: 'https://example.com/report.pdf',
          metadata: expect.objectContaining({
            data_points_included: 1,
            charts_generated: 1,
            tables_generated: 1,
            statistical_confidence: 0.95
          })
        })
      })

      expect(mockSendReportEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        userName: 'Test User',
        reportName: 'Test Report',
        format: 'pdf',
        downloadUrl: 'https://example.com/report.pdf',
        generationTime: expect.any(Number)
      })
    })

    it('should successfully generate an Excel report', async () => {
      const excelJob = { ...mockJob, format: 'excel' as const }

      await generateReportJob(excelJob)

      expect(mockGenerateExcel).toHaveBeenCalledWith(
        mockTemplate,
        expect.any(Object),
        {}
      )

      expect(mockUploadToR2).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringMatching(/.*\.xlsx/),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
    })

    it('should handle template not found error', async () => {
      (mockPrisma.reportTemplate.findUnique as jest.MockedFunction<any>).mockResolvedValue(null)

      await expect(generateReportJob(mockJob)).rejects.toThrow('Template or user not found')

      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: {
          status: 'failed',
          error_message: 'Template or user not found'
        }
      })
    })

    it('should handle user not found error', async () => {
      (mockPrisma.user.findUnique as jest.MockedFunction<any>).mockResolvedValue(null)

      await expect(generateReportJob(mockJob)).rejects.toThrow('Template or user not found')
    })

    it('should handle PDF generation failure', async () => {
      mockGeneratePDF.mockRejectedValue(new Error('PDF generation failed'))

      await expect(generateReportJob(mockJob)).rejects.toThrow('PDF generation failed')

      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: {
          status: 'failed',
          error_message: 'PDF generation failed'
        }
      })
    })

    it('should handle R2 upload failure', async () => {
      mockUploadToR2.mockRejectedValue(new Error('Upload failed'))

      await expect(generateReportJob(mockJob)).rejects.toThrow('Upload failed')
    })

    it('should handle unsupported format', async () => {
      const invalidJob = { ...mockJob, format: 'invalid' as any } as any

      await expect(generateReportJob(invalidJob)).rejects.toThrow('Unsupported format: invalid')
    })

    it('should send error notification email on failure', async () => {
      mockGeneratePDF.mockRejectedValue(new Error('Generation failed'))

      await expect(generateReportJob(mockJob)).rejects.toThrow()

      expect(mockSendReportEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        userName: 'Test User',
        reportName: 'Report report-123',
        format: 'pdf',
        error: 'Generation failed'
      })
    })

    it('should process custom parameters correctly', async () => {
      const jobWithParams = {
        ...mockJob,
        customParameters: {
          title: 'Custom Title',
          includeWatermark: true
        }
      }

      await generateReportJob(jobWithParams)

      expect(mockGeneratePDF).toHaveBeenCalledWith(
        mockTemplate,
        expect.any(Object),
        {
          title: 'Custom Title',
          includeWatermark: true
        }
      )
    })

    it('should calculate metadata correctly', async () => {
      const testTemplate: any = {
        id: 'template-123',
        name: 'Test Report',
        version: '1.0',
        template_data: {
          components: [
            { id: '1', type: 'chart', config: {} },
            { id: '2', type: 'chart', config: {} },
            { id: '3', type: 'table', config: {} },
            { id: '4', type: 'metric', config: {} }
          ]
        }
      }

      (mockPrisma.reportTemplate.findUnique as jest.MockedFunction<any>).mockResolvedValue(testTemplate)

      await generateReportJob(mockJob)

      expect(mockPrisma.generatedReport.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            charts_generated: 2,
            tables_generated: 1,
            data_points_included: 1,
            statistical_confidence: 0.95,
            generation_time_ms: expect.any(Number)
          })
        })
      })
    })
  })

  describe('Data Processing', () => {
    it('should filter data by sensor IDs when specified', async () => {
      const queryTemplate: any = {
        id: 'template-123',
        name: 'Test Report',
        version: '1.0',
        template_data: {
          components: [{
            id: 'chart-1',
            type: 'chart',
            data_binding: {
              source: 'bangkok_dataset',
              query: {
                sensor_ids: ['sensor-specific']
              }
            }
          }]
        }
      }

      (mockPrisma.reportTemplate.findUnique as jest.MockedFunction<any>).mockResolvedValue(queryTemplate)

      await generateReportJob(mockJob)

      expect(mockGetBangkokData).toHaveBeenCalledWith({
        startDate: mockJob.dataRange.start,
        endDate: mockJob.dataRange.end,
        includeAggregations: true,
        includeStatistics: true
      })
    })

    it('should generate insights from data patterns', async () => {
      const trendData: any = {
        data: mockBangkokData.data,
        aggregations: mockBangkokData.aggregations,
        statistics: {
          confidence: 0.95,
          trend: 0.2,
          mean: 24.5
        }
      }

      (mockGetBangkokData as jest.MockedFunction<any>).mockResolvedValue(trendData)

      await generateReportJob(mockJob)

      // Verify that insights are generated and passed to the PDF generator
      expect(mockGeneratePDF).toHaveBeenCalledWith(
        mockTemplate,
        expect.objectContaining({
          insights: expect.arrayContaining([
            expect.stringContaining('Average value: 24.50'),
            expect.stringContaining('increasing trend')
          ])
        }),
        {}
      )
    })
  })
})