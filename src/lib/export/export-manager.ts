/**
 * Epic 2 Story 2.3: Export Functionality for Professional Tier
 * Export Manager for PDF, CSV, and Excel generation
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import ExcelJS from 'exceljs'

// Types
export interface ExportJob {
  id: string
  userId: string
  format: 'pdf' | 'csv' | 'excel'
  template: 'executive' | 'technical' | 'compliance' | 'raw_data'
  dateRange: { start: string; end: string }
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  downloadUrl?: string
  createdAt: string
  completedAt?: string
  error?: string
}

export interface BangkokExportData {
  summary: {
    buildingHealth: {
      value: number
      lower: number
      upper: number
      confidence: number
    }
    energySavings: {
      annual: number
      currency: string
    }
    dataQuality: number
    totalRecords: number
  }
  timeSeries: {
    timestamp: string
    HVAC: number
    Lighting: number
    Power: number
    Security: number
    Elevators: number
  }[]
  statistics: {
    sensor: string
    min: number
    max: number
    avg: number
    stdDev: number
    trend: string
  }[]
  seasonalPatterns: {
    season: string
    avgConsumption: number
    peakHours: string[]
  }[]
}

export class ExportManager {
  private static instance: ExportManager
  private jobs = new Map<string, ExportJob>()

  static getInstance(): ExportManager {
    if (!ExportManager.instance) {
      ExportManager.instance = new ExportManager()
    }
    return ExportManager.instance
  }

  /**
   * Create a new export job
   */
  async createExportJob(
    userId: string,
    format: 'pdf' | 'csv' | 'excel',
    template: 'executive' | 'technical' | 'compliance' | 'raw_data',
    dateRange: { start: string; end: string }
  ): Promise<ExportJob> {
    const job: ExportJob = {
      id: this.generateJobId(),
      userId,
      format,
      template,
      dateRange,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString()
    }

    this.jobs.set(job.id, job)

    // Start processing asynchronously
    this.processExportJob(job.id).catch(error => {
      console.error('Export job failed:', error)
      this.updateJobStatus(job.id, 'failed', undefined, error.message)
    })

    return job
  }

  /**
   * Get export job status
   */
  getExportJob(jobId: string): ExportJob | null {
    return this.jobs.get(jobId) || null
  }

  /**
   * Get user's export history
   */
  getUserExportHistory(userId: string): ExportJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  /**
   * Process export job
   */
  private async processExportJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job) throw new Error('Job not found')

    try {
      this.updateJobStatus(jobId, 'processing', 10)

      // Import storage and tracking services dynamically to avoid circular dependencies
      const { exportStorageService, getContentType } = await import('./storage-service')
      const { exportUsageTrackingService } = await import('./usage-tracking-service')

      // Update database job status
      await exportUsageTrackingService.updateExportJobStatus(jobId, 'processing', { progressPercent: 10 })

      // Fetch Bangkok data
      const data = await this.fetchBangkokData(job.dateRange)
      this.updateJobStatus(jobId, 'processing', 30)
      await exportUsageTrackingService.updateExportJobStatus(jobId, 'processing', { progressPercent: 30 })

      let fileBuffer: Buffer
      let filename: string

      // Generate file based on format
      switch (job.format) {
        case 'pdf':
          fileBuffer = await this.generatePDF(data, job.template)
          filename = `bangkok-report-${job.template}-${Date.now()}.pdf`
          break
        case 'csv':
          fileBuffer = await this.generateCSV(data)
          filename = `bangkok-data-${Date.now()}.csv`
          break
        case 'excel':
          fileBuffer = await this.generateExcel(data)
          filename = `bangkok-analysis-${Date.now()}.xlsx`
          break
        default:
          throw new Error('Unsupported format')
      }

      this.updateJobStatus(jobId, 'processing', 60)
      await exportUsageTrackingService.updateExportJobStatus(jobId, 'processing', { progressPercent: 60 })

      // Upload file to storage
      const contentType = getContentType(job.format)
      const uploadResult = await exportStorageService.uploadExportFile(
        job.userId,
        jobId,
        fileBuffer,
        filename,
        contentType
      )

      if (!uploadResult.success) {
        throw new Error(`Storage upload failed: ${uploadResult.error}`)
      }

      this.updateJobStatus(jobId, 'processing', 90)
      await exportUsageTrackingService.updateExportJobStatus(jobId, 'processing', { progressPercent: 90 })

      // Update job with download URL and file info
      this.updateJobStatus(jobId, 'completed', 100, undefined, uploadResult.fileUrl)

      // Update database with completion
      await exportUsageTrackingService.updateExportJobStatus(jobId, 'completed', {
        progressPercent: 100,
        fileKey: uploadResult.fileKey,
        fileSize: uploadResult.fileSize,
        fileUrl: uploadResult.fileUrl,
        completedAt: new Date().toISOString()
      })

      // Log completion
      await exportUsageTrackingService.logExportAction(job.userId, jobId, 'completed', {
        format: job.format,
        template: job.template,
        fileSize: uploadResult.fileSize,
        expiresAt: uploadResult.expiresAt
      })

    } catch (error) {
      console.error('Export job processing error:', error)

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.updateJobStatus(jobId, 'failed', undefined, errorMessage)

      // Update database with failure
      const { exportUsageTrackingService } = await import('./usage-tracking-service')
      await exportUsageTrackingService.updateExportJobStatus(jobId, 'failed', {
        errorMessage
      })

      throw error
    }
  }

  /**
   * Generate PDF report
   */
  private async generatePDF(data: BangkokExportData, template: string): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create()
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Add cover page
    const page = pdfDoc.addPage()
    const { height } = page.getSize()

    // Header with branding
    page.drawText('CU-BEMS IoT Platform', {
      x: 50,
      y: height - 100,
      size: 24,
      font: helveticaBoldFont,
      color: rgb(0.2, 0.4, 0.8)
    })

    page.drawText('Bangkok University Dataset Analysis Report', {
      x: 50,
      y: height - 140,
      size: 18,
      font: timesRomanFont,
      color: rgb(0.3, 0.3, 0.3)
    })

    // Executive summary based on template
    let yPosition = height - 200
    const lineHeight = 25

    if (template === 'executive') {
      page.drawText('Executive Summary', {
        x: 50,
        y: yPosition,
        size: 16,
        font: helveticaBoldFont
      })
      yPosition -= lineHeight * 2

      page.drawText(`Building Health Efficiency: ${data.summary.buildingHealth.value.toFixed(1)}%`, {
        x: 70,
        y: yPosition,
        size: 12,
        font: timesRomanFont
      })
      yPosition -= lineHeight

      page.drawText(`95% Confidence Interval: ${data.summary.buildingHealth.lower.toFixed(1)}% - ${data.summary.buildingHealth.upper.toFixed(1)}%`, {
        x: 70,
        y: yPosition,
        size: 12,
        font: timesRomanFont
      })
      yPosition -= lineHeight

      page.drawText(`Annual Energy Savings Potential: €${data.summary.energySavings.annual.toLocaleString()}`, {
        x: 70,
        y: yPosition,
        size: 12,
        font: timesRomanFont
      })
      yPosition -= lineHeight * 2

      page.drawText('Statistical Validation', {
        x: 50,
        y: yPosition,
        size: 16,
        font: helveticaBoldFont
      })
      yPosition -= lineHeight * 2

      page.drawText(`Data Quality: ${data.summary.dataQuality}%`, {
        x: 70,
        y: yPosition,
        size: 12,
        font: timesRomanFont
      })
      yPosition -= lineHeight

      page.drawText(`Total Records Analyzed: ${(data.summary.totalRecords / 1000000).toFixed(1)}M`, {
        x: 70,
        y: yPosition,
        size: 12,
        font: timesRomanFont
      })
      yPosition -= lineHeight

      page.drawText(`Analysis Period: January 2018 - June 2019 (18 months)`, {
        x: 70,
        y: yPosition,
        size: 12,
        font: timesRomanFont
      })
      yPosition -= lineHeight * 2

      // Sensor statistics
      page.drawText('Sensor Performance Analysis', {
        x: 50,
        y: yPosition,
        size: 16,
        font: helveticaBoldFont
      })
      yPosition -= lineHeight * 2

      data.statistics.forEach(stat => {
        page.drawText(`${stat.sensor}: Avg ${stat.avg.toFixed(1)} kWh, Trend: ${stat.trend}`, {
          x: 70,
          y: yPosition,
          size: 12,
          font: timesRomanFont
        })
        yPosition -= lineHeight
      })

      yPosition -= lineHeight

      // Seasonal patterns
      page.drawText('Seasonal Consumption Patterns', {
        x: 50,
        y: yPosition,
        size: 16,
        font: helveticaBoldFont
      })
      yPosition -= lineHeight * 2

      data.seasonalPatterns.forEach(pattern => {
        page.drawText(`${pattern.season}: ${pattern.avgConsumption.toFixed(1)} kWh/day`, {
          x: 70,
          y: yPosition,
          size: 12,
          font: timesRomanFont
        })
        yPosition -= lineHeight
      })
    }

    // Footer
    page.drawText(`Generated on ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: 50,
      size: 10,
      font: timesRomanFont,
      color: rgb(0.5, 0.5, 0.5)
    })

    page.drawText('CU-BEMS IoT Transmission Failure Analysis Platform', {
      x: 50,
      y: 35,
      size: 10,
      font: timesRomanFont,
      color: rgb(0.5, 0.5, 0.5)
    })

    return Buffer.from(await pdfDoc.save())
  }

  /**
   * Generate CSV export with statistical context
   */
  private async generateCSV(data: BangkokExportData): Promise<Buffer> {
    const lines: string[] = []

    // Header with metadata
    lines.push('# Bangkok University Dataset Export')
    lines.push(`# Generated: ${new Date().toISOString()}`)
    lines.push(`# Data Quality: ${data.summary.dataQuality}%`)
    lines.push(`# Total Records: ${data.summary.totalRecords}`)
    lines.push(`# Building Health: ${data.summary.buildingHealth.value}% (95% CI: ${data.summary.buildingHealth.lower}%-${data.summary.buildingHealth.upper}%)`)
    lines.push('')

    // Time series data
    lines.push('# Time Series Data')
    lines.push('timestamp,HVAC,Lighting,Power,Security,Elevators')

    data.timeSeries.forEach(point => {
      lines.push(`${point.timestamp},${point.HVAC},${point.Lighting},${point.Power},${point.Security},${point.Elevators}`)
    })

    lines.push('')

    // Statistical summary
    lines.push('# Statistical Summary')
    lines.push('sensor,min,max,avg,stdDev,trend')

    data.statistics.forEach(stat => {
      lines.push(`${stat.sensor},${stat.min},${stat.max},${stat.avg},${stat.stdDev},${stat.trend}`)
    })

    lines.push('')

    // Seasonal patterns
    lines.push('# Seasonal Patterns')
    lines.push('season,avgConsumption,peakHours')

    data.seasonalPatterns.forEach(pattern => {
      lines.push(`${pattern.season},${pattern.avgConsumption},"${pattern.peakHours.join(', ')}"`)
    })

    return Buffer.from(lines.join('\n'), 'utf8')
  }

  /**
   * Generate Excel workbook with charts
   */
  private async generateExcel(data: BangkokExportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Executive Summary')
    summarySheet.addRow(['CU-BEMS Bangkok Dataset Analysis'])
    summarySheet.addRow([])
    summarySheet.addRow(['Building Health Efficiency', `${data.summary.buildingHealth.value}%`])
    summarySheet.addRow(['95% Confidence Interval', `${data.summary.buildingHealth.lower}% - ${data.summary.buildingHealth.upper}%`])
    summarySheet.addRow(['Annual Energy Savings', `€${data.summary.energySavings.annual.toLocaleString()}`])
    summarySheet.addRow(['Data Quality', `${data.summary.dataQuality}%`])
    summarySheet.addRow(['Total Records', data.summary.totalRecords])

    // Style the header
    summarySheet.getCell('A1').font = { bold: true, size: 16 }
    summarySheet.getRow(1).height = 25

    // Time series data sheet
    const dataSheet = workbook.addWorksheet('Time Series Data')
    dataSheet.addRow(['Timestamp', 'HVAC', 'Lighting', 'Power', 'Security', 'Elevators'])

    // Add sample data (first 100 points to avoid large files)
    data.timeSeries.slice(0, 100).forEach(point => {
      dataSheet.addRow([
        point.timestamp,
        point.HVAC,
        point.Lighting,
        point.Power,
        point.Security,
        point.Elevators
      ])
    })

    // Statistics sheet
    const statsSheet = workbook.addWorksheet('Statistical Analysis')
    statsSheet.addRow(['Sensor', 'Min', 'Max', 'Average', 'Std Dev', 'Trend'])

    data.statistics.forEach(stat => {
      statsSheet.addRow([stat.sensor, stat.min, stat.max, stat.avg, stat.stdDev, stat.trend])
    })

    // Seasonal patterns sheet
    const seasonalSheet = workbook.addWorksheet('Seasonal Patterns')
    seasonalSheet.addRow(['Season', 'Avg Consumption', 'Peak Hours'])

    data.seasonalPatterns.forEach(pattern => {
      seasonalSheet.addRow([pattern.season, pattern.avgConsumption, pattern.peakHours.join(', ')])
    })

    return Buffer.from(await workbook.xlsx.writeBuffer())
  }

  /**
   * Fetch Bangkok dataset for export
   */
  private async fetchBangkokData(dateRange: { start: string; end: string }): Promise<BangkokExportData> {
    // Generate mock Bangkok data for export
    const timeSeries = []
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)

    // Generate sample time series data
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      timeSeries.push({
        timestamp: d.toISOString(),
        HVAC: 65 + Math.random() * 20,
        Lighting: 35 + Math.random() * 15,
        Power: 45 + Math.random() * 20,
        Security: 8 + Math.random() * 4,
        Elevators: 15 + Math.random() * 10
      })
    }

    return {
      summary: {
        buildingHealth: {
          value: 72.3,
          lower: 70.1,
          upper: 74.5,
          confidence: 95
        },
        energySavings: {
          annual: 45000,
          currency: 'EUR'
        },
        dataQuality: 96.8,
        totalRecords: 124900000
      },
      timeSeries,
      statistics: [
        { sensor: 'HVAC', min: 45.2, max: 92.1, avg: 68.7, stdDev: 8.3, trend: 'stable' },
        { sensor: 'Lighting', min: 25.1, max: 55.4, avg: 38.9, stdDev: 6.2, trend: 'decreasing' },
        { sensor: 'Power', min: 35.6, max: 78.9, avg: 52.1, stdDev: 9.1, trend: 'increasing' },
        { sensor: 'Security', min: 6.2, max: 14.8, avg: 9.7, stdDev: 1.8, trend: 'stable' },
        { sensor: 'Elevators', min: 8.3, max: 28.6, avg: 17.2, stdDev: 4.5, trend: 'stable' }
      ],
      seasonalPatterns: [
        { season: 'Winter (Jan-Mar)', avgConsumption: 185.3, peakHours: ['08:00-10:00', '18:00-20:00'] },
        { season: 'Spring (Apr-Jun)', avgConsumption: 195.7, peakHours: ['09:00-11:00', '14:00-16:00'] },
        { season: 'Summer (Jul-Sep)', avgConsumption: 225.4, peakHours: ['12:00-16:00', '20:00-22:00'] },
        { season: 'Fall (Oct-Dec)', avgConsumption: 190.2, peakHours: ['08:00-10:00', '17:00-19:00'] }
      ]
    }
  }

  /**
   * Upload file to storage (simulated)
   */
  private async uploadFile(fileBuffer: Buffer, filename: string): Promise<string> {
    // In real implementation, upload to S3/R2
    // For now, simulate with a download URL
    return `https://exports.cu-bems.com/downloads/${filename}`
  }

  /**
   * Update job status
   */
  private updateJobStatus(
    jobId: string,
    status: ExportJob['status'],
    progress?: number,
    error?: string,
    downloadUrl?: string
  ): void {
    const job = this.jobs.get(jobId)
    if (!job) return

    job.status = status
    if (progress !== undefined) job.progress = progress
    if (error) job.error = error
    if (downloadUrl) job.downloadUrl = downloadUrl
    if (status === 'completed' || status === 'failed') {
      job.completedAt = new Date().toISOString()
    }

    this.jobs.set(jobId, job)
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}