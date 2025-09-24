import { ReportTemplate, ReportFormat, _GeneratedReport } from '@/types/reports'
import { prisma } from '@/lib/database/connection'
import { getBangkokData } from '@/lib/data/bangkok-dataset'
import { generatePDF } from './pdf-generator'
import { generateExcel } from './excel-exporter'
import { generatePowerPoint } from './powerpoint-builder'
import { generateWord } from './word-generator'
import { sendReportEmail } from './email-delivery'
import { uploadToR2 } from '@/lib/r2-client'

interface ReportGenerationJob {
  reportId: string
  templateId: string
  userId: string
  format: ReportFormat
  dataRange: {
    start: Date
    end: Date
  }
  customParameters: Record<string, unknown>
}

export async function generateReportJob(job: ReportGenerationJob): Promise<void> {
  const startTime = Date.now()

  try {
    console.log(`Starting report generation for report ${job.reportId}`)

    // Get template and user info
    const [template, user] = await Promise.all([
      prisma.reportTemplate.findUnique({
        where: { id: job.templateId }
      }),
      prisma.user.findUnique({
        where: { id: job.userId },
        select: { email: true, name: true }
      })
    ])

    if (!template || !user) {
      throw new Error('Template or user not found')
    }

    // Fetch data based on template configuration
    const reportData = await fetchReportData(template, job.dataRange)

    // Generate report file based on format
    let fileBuffer: Buffer
    let fileName: string
    let mimeType: string

    switch (job.format) {
      case 'pdf':
        fileBuffer = await generatePDF(template, reportData, job.customParameters)
        fileName = `${template.name}_${new Date().toISOString().split('T')[0]}.pdf`
        mimeType = 'application/pdf'
        break

      case 'excel':
        fileBuffer = await generateExcel(template, reportData, job.customParameters)
        fileName = `${template.name}_${new Date().toISOString().split('T')[0]}.xlsx`
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        break

      case 'powerpoint':
        fileBuffer = await generatePowerPoint(template, reportData, job.customParameters)
        fileName = `${template.name}_${new Date().toISOString().split('T')[0]}.pptx`
        mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        break

      case 'word':
        fileBuffer = await generateWord(template, reportData, job.customParameters)
        fileName = `${template.name}_${new Date().toISOString().split('T')[0]}.docx`
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        break

      default:
        throw new Error(`Unsupported format: ${job.format}`)
    }

    // Upload to R2 storage
    const fileKey = `reports/${job.userId}/${job.reportId}/${fileName}`
    const fileUrl = await uploadToR2(fileBuffer, fileKey, mimeType)

    // Calculate metadata
    const generationTime = Date.now() - startTime
    const chartComponents = template.template_data.components.filter(c => c.type === 'chart')
    const tableComponents = template.template_data.components.filter(c => c.type === 'table')

    // Update report record
    await prisma.generatedReport.update({
      where: { id: job.reportId },
      data: {
        status: 'completed',
        file_url: fileUrl,
        file_size_bytes: fileBuffer.length,
        metadata: {
          template_version: template.version,
          file_version: '1.0',
          data_points_included: reportData.dataPoints.length,
          charts_generated: chartComponents.length,
          tables_generated: tableComponents.length,
          statistical_confidence: reportData.statisticalConfidence,
          generation_time_ms: generationTime
        },
        generation_date: new Date()
      }
    })

    // Send email notification
    await sendReportEmail({
      to: user.email!,
      userName: user.name || 'User',
      reportName: template.name,
      format: job.format,
      downloadUrl: fileUrl,
      generationTime: generationTime
    })

    console.log(`Report generation completed successfully for report ${job.reportId}`)

  } catch (error) {
    console.error(`Report generation failed for report ${job.reportId}:`, error)

    // Update report status to failed
    await prisma.generatedReport.update({
      where: { id: job.reportId },
      data: {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    // Send failure notification email
    try {
      const user = await prisma.user.findUnique({
        where: { id: job.userId },
        select: { email: true, name: true }
      })

      if (user?.email) {
        await sendReportEmail({
          to: user.email,
          userName: user.name || 'User',
          reportName: `Report ${job.reportId}`,
          format: job.format,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    } catch (emailError) {
      console.error('Failed to send error notification email:', emailError)
    }

    throw error
  }
}

interface ReportData {
  dataPoints: unknown[]
  aggregations: Record<string, unknown>
  statisticalConfidence: number
  insights: string[]
  charts: Record<string, unknown>
  tables: Record<string, unknown>
}

async function fetchReportData(
  template: ReportTemplate,
  dataRange: { start: Date; end: Date }
): Promise<ReportData> {
  const components = template.template_data.components

  // Fetch Bangkok dataset for the specified date range
  const bangkokData = await getBangkokData({
    startDate: dataRange.start,
    endDate: dataRange.end,
    includeAggregations: true,
    includeStatistics: true
  })

  // Process data for each component
  const charts: Record<string, unknown> = {}
  const tables: Record<string, unknown> = {}

  for (const component of components) {
    if (component.data_binding?.source === 'bangkok_dataset') {
      const query = component.data_binding.query

      // Filter data based on component query
      let filteredData = bangkokData.data

      if (query?.sensor_ids?.length) {
        filteredData = filteredData.filter(d => query.sensor_ids!.includes(d.sensor_id))
      }

      if (query?.floor_numbers?.length) {
        filteredData = filteredData.filter(d => query.floor_numbers!.includes(d.floor_number))
      }

      if (query?.equipment_types?.length) {
        filteredData = filteredData.filter(d => query.equipment_types!.includes(d.equipment_type))
      }

      // Process based on component type
      if (component.type === 'chart') {
        charts[component.id] = processChartData(filteredData, component.config)
      } else if (component.type === 'table') {
        tables[component.id] = processTableData(filteredData, component.config)
      }
    }
  }

  // Generate insights based on data patterns
  const insights = generateInsights(bangkokData.data, bangkokData.statistics)

  return {
    dataPoints: bangkokData.data,
    aggregations: bangkokData.aggregations || {},
    statisticalConfidence: bangkokData.statistics?.confidence || 0.95,
    insights,
    charts,
    tables
  }
}

interface ChartDataPoint {
  timestamp: string
  value: number
  equipment_type: string
  [key: string]: unknown
}

function processChartData(data: ChartDataPoint[], config: Record<string, unknown>): unknown {
  const chartType = config.chart_type || 'line'

  switch (chartType) {
    case 'line':
    case 'bar':
      return {
        labels: data.map(d => new Date(d.timestamp).toLocaleDateString()),
        datasets: [{
          label: config.series?.[0]?.name || 'Value',
          data: data.map(d => d.value),
          backgroundColor: config.series?.[0]?.color || '#2563eb'
        }]
      }

    case 'pie':
      const grouped = groupBy(data, 'equipment_type')
      return {
        labels: Object.keys(grouped),
        datasets: [{
          data: Object.values(grouped).map((items: unknown[]) => items.length),
          backgroundColor: generateColors(Object.keys(grouped).length)
        }]
      }

    default:
      return { labels: [], datasets: [] }
  }
}

function processTableData(data: ChartDataPoint[], config: Record<string, unknown>): unknown {
  const columns = config.columns || [
    { key: 'timestamp', label: 'Time' },
    { key: 'value', label: 'Value' },
    { key: 'equipment_type', label: 'Equipment' }
  ]

  return {
    columns,
    rows: data.slice(0, 1000) // Limit to 1000 rows for performance
  }
}

function generateInsights(data: ChartDataPoint[], statistics: Record<string, unknown>): string[] {
  const insights: string[] = []

  if (statistics?.mean !== undefined) {
    insights.push(`Average value: ${statistics.mean.toFixed(2)}`)
  }

  if (statistics?.trend) {
    const trend = statistics.trend > 0 ? 'increasing' : 'decreasing'
    insights.push(`Data shows ${trend} trend over the selected period`)
  }

  if (data.length > 0) {
    const equipmentTypes = [...new Set(data.map(d => d.equipment_type))]
    insights.push(`Analysis covers ${equipmentTypes.length} equipment types`)
  }

  return insights
}

function groupBy(array: Record<string, unknown>[], key: string): Record<string, unknown[]> {
  return array.reduce((groups: Record<string, unknown[]>, item: Record<string, unknown>) => {
    const value = item[key] as string
    groups[value] = groups[value] || []
    groups[value].push(item)
    return groups
  }, {} as Record<string, unknown[]>)
}

function generateColors(count: number): string[] {
  const baseColors = [
    '#2563eb', '#dc2626', '#16a34a', '#ea580c', '#7c3aed',
    '#0891b2', '#be123c', '#4338ca', '#059669', '#d97706'
  ]

  const colors = []
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length])
  }

  return colors
}