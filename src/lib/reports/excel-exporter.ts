import * as XLSX from 'xlsx'
import { ReportTemplate, ReportComponent } from '@/types/reports'

export interface ExcelReportData {
  dataRange?: {
    start: string
    end: string
  }
  dataPoints?: unknown[]
  charts?: unknown[]
  summary?: Record<string, unknown>
  [key: string]: unknown
}

export async function generateExcel(
  template: ReportTemplate,
  data: unknown,
  _customParameters: Record<string, unknown>
): Promise<Buffer> {
  const workbook = XLSX.utils.book_new()

  // Add summary sheet
  addSummarySheet(workbook, template, data)

  // Add data sheets for each table component
  const tableComponents = template.template_data.components.filter(c => c.type === 'table')
  for (const component of tableComponents) {
    addTableSheet(workbook, component, data)
  }

  // Add chart data sheets
  const chartComponents = template.template_data.components.filter(c => c.type === 'chart')
  for (const component of chartComponents) {
    addChartDataSheet(workbook, component, data)
  }

  // Add raw data sheet
  if (data.dataPoints && data.dataPoints.length > 0) {
    addRawDataSheet(workbook, data.dataPoints)
  }

  // Convert to buffer
  const excelBuffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true
  })

  return Buffer.from(excelBuffer)
}

function addSummarySheet(workbook: XLSX.WorkBook, template: ReportTemplate, data: ExcelReportData) {
  const summaryData = [
    ['Report Summary'],
    [],
    ['Report Name', template.name],
    ['Category', template.category],
    ['Generated', new Date().toLocaleString()],
    ['Data Period Start', data.dataRange?.start || 'N/A'],
    ['Data Period End', data.dataRange?.end || 'N/A'],
    ['Total Data Points', data.dataPoints?.length || 0],
    ['Statistical Confidence', data.statisticalConfidence || 'N/A'],
    [],
    ['Key Metrics']
  ]

  // Add metric components to summary
  const metricComponents = template.template_data.components.filter(c => c.type === 'metric')
  metricComponents.forEach(component => {
    const value = getMetricValue(component, data) || 'N/A'
    summaryData.push([component.config.label || component.id, value])
  })

  // Add insights
  if (data.insights && data.insights.length > 0) {
    summaryData.push([])
    summaryData.push(['Key Insights'])
    data.insights.forEach((insight: string, index: number) => {
      summaryData.push([`${index + 1}.`, insight])
    })
  }

  const worksheet = XLSX.utils.aoa_to_sheet(summaryData)

  // Set column widths
  worksheet['!cols'] = [
    { width: 20 },
    { width: 40 }
  ]

  // Apply formatting to headers
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:B1')
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = worksheet[cellAddress]

      if (cell && (row === 0 || row === 10 || (row > 10 && col === 0))) {
        cell.s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'E5E7EB' } }
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary')
}

function addTableSheet(workbook: XLSX.WorkBook, component: ReportComponent, data: ExcelReportData) {
  const tableData = data.tables?.[component.id]

  if (!tableData || !tableData.columns || !tableData.rows) {
    return
  }

  // Create header row
  const headers = tableData.columns.map((col: unknown) => col.label)
  const sheetData = [headers]

  // Add data rows
  tableData.rows.forEach((row: unknown) => {
    const rowData = tableData.columns.map((col: unknown) => row[col.key] || '')
    sheetData.push(rowData)
  })

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

  // Set column widths based on content
  const columnWidths = tableData.columns.map((col: unknown) => ({
    width: Math.max(col.label.length, 15)
  }))
  worksheet['!cols'] = columnWidths

  // Style header row
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
    const cell = worksheet[cellAddress]
    if (cell) {
      cell.s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E5E7EB' } },
        border: {
          bottom: { style: 'thin', color: { rgb: '000000' } }
        }
      }
    }
  }

  const sheetName = component.config.title || `Table_${component.id.slice(-8)}`
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
}

function addChartDataSheet(workbook: XLSX.WorkBook, component: ReportComponent, data: ExcelReportData) {
  const chartData = data.charts?.[component.id]

  if (!chartData || !chartData.labels || !chartData.datasets) {
    return
  }

  const sheetData: unknown[][] = []

  // Add headers
  const headers = ['Label', ...chartData.datasets.map((ds: unknown) => ds.label || 'Series')]
  sheetData.push(headers)

  // Add data rows
  chartData.labels.forEach((label: string, index: number) => {
    const row = [label]
    chartData.datasets.forEach((dataset: unknown) => {
      row.push(dataset.data[index] || '')
    })
    sheetData.push(row)
  })

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

  // Set column widths
  worksheet['!cols'] = headers.map(() => ({ width: 15 }))

  // Style header row
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
    const cell = worksheet[cellAddress]
    if (cell) {
      cell.s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E5E7EB' } }
      }
    }
  }

  // Add Excel chart if possible
  try {
    addExcelChart(worksheet, chartData, component)
  } catch (error) {
    console.warn('Failed to add Excel chart:', error)
  }

  const sheetName = component.config.title || `Chart_${component.id.slice(-8)}`
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
}

function addRawDataSheet(workbook: XLSX.WorkBook, dataPoints: unknown[]) {
  if (dataPoints.length === 0) return

  // Get all unique keys from data points
  const allKeys = new Set<string>()
  dataPoints.forEach(point => {
    Object.keys(point).forEach(key => allKeys.add(key))
  })

  const headers = Array.from(allKeys)
  const sheetData = [headers]

  // Add data rows
  dataPoints.forEach(point => {
    const row = headers.map(header => point[header] || '')
    sheetData.push(row)
  })

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

  // Set column widths
  worksheet['!cols'] = headers.map(() => ({ width: 15 }))

  // Style header row
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
    const cell = worksheet[cellAddress]
    if (cell) {
      cell.s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E5E7EB' } },
        border: {
          bottom: { style: 'thin', color: { rgb: '000000' } }
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Raw Data')
}

function addExcelChart(worksheet: XLSX.WorkSheet, chartData: unknown, component: ReportComponent) {
  // Note: SheetJS doesn't support adding charts directly
  // This would require a more advanced library like exceljs
  // For now, we just ensure the data is formatted for manual chart creation

  // Add chart metadata as comments or additional rows
  const chartInfo = [
    [],
    ['Chart Information'],
    ['Type', component.config.chart_type || 'line'],
    ['Title', component.config.title || 'Chart'],
    ['X-Axis', component.config.x_axis?.label || 'X-Axis'],
    ['Y-Axis', component.config.y_axis?.label || 'Y-Axis']
  ]

  // Find the current range and append below
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')
  const startRow = range.e.r + 2

  chartInfo.forEach((row, index) => {
    row.forEach((cell, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: startRow + index, c: colIndex })
      worksheet[cellAddress] = { v: cell, t: 's' }
    })
  })

  // Update the worksheet range
  const newRange = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: startRow + chartInfo.length - 1, c: Math.max(range.e.c, 1) }
  })
  worksheet['!ref'] = newRange
}

function getMetricValue(component: ReportComponent, data: ExcelReportData): string | null {
  if (component.config.value_source && data.aggregations) {
    const value = data.aggregations[component.config.value_source]
    if (value !== undefined) {
      return formatMetricValue(value, component.config.format)
    }
  }
  return null
}

function formatMetricValue(value: unknown, format: unknown): string {
  const numValue = parseFloat(value)
  if (isNaN(numValue)) return value.toString()

  const prefix = format?.prefix || ''
  const suffix = format?.suffix || ''
  const unit = format?.unit || ''
  const decimalPlaces = format?.decimal_places ?? 2

  return `${prefix}${numValue.toFixed(decimalPlaces)}${unit}${suffix}`
}