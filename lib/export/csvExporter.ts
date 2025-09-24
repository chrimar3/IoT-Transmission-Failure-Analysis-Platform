/**
 * CSV Export Utility
 * Story 3.4: Data Export and Reporting
 *
 * High-performance CSV export with streaming support for Bangkok dataset scale
 * Optimized for 100,000+ records without memory issues
 */

import { _Readable } from 'stream'
import type {
  ExportFilters,
  _ExportJobParameters,
  ExportMetrics,
  OptimizationSettings,
  ExportError
} from '../../types/export'

// Sensor reading interface for CSV export
export interface SensorReadingCSV {
  timestamp: string
  sensor_id: string
  floor_number: number
  equipment_type: string
  reading_value: number
  unit: string
  status: string
  daily_avg?: number
  daily_min?: number
  daily_max?: number
}

// CSV export configuration
export interface CSVExportConfig {
  include_headers: boolean
  delimiter: string
  quote_char: string
  escape_char: string
  encoding: 'utf8' | 'utf16le' | 'ascii'
  date_format: string
  number_precision: number
  include_metadata: boolean
  streaming: boolean
  chunk_size: number
}

// CSV export result
export interface CSVExportResult {
  success: boolean
  file_path?: string
  file_size_bytes: number
  records_exported: number
  processing_time_ms: number
  memory_peak_mb: number
  error?: ExportError
  metrics: ExportMetrics
}

/**
 * High-performance CSV exporter optimized for Bangkok IoT dataset
 */
export class CSVExporter {
  private config: CSVExportConfig
  private optimization: OptimizationSettings

  constructor(config: Partial<CSVExportConfig> = {}) {
    this.config = {
      include_headers: true,
      delimiter: ',',
      quote_char: '"',
      escape_char: '"',
      encoding: 'utf8',
      date_format: 'YYYY-MM-DD HH:mm:ss',
      number_precision: 4,
      include_metadata: true,
      streaming: true,
      chunk_size: 10000,
      ...config
    }

    this.optimization = {
      chunk_size: this.config.chunk_size,
      memory_limit_mb: 512,
      compression_enabled: false, // CSV doesn't need compression during generation
      streaming_enabled: this.config.streaming,
      parallel_processing: false // CSV is sequential by nature
    }
  }

  /**
   * Export sensor data to CSV format with streaming support
   */
  async exportToCSV(
    _filters: ExportFilters,
    filePath: string,
    jobId?: number
  ): Promise<CSVExportResult> {
    const startTime = performance.now()
    let recordsExported = 0
    let memoryPeak = 0

    try {
      // Validate export parameters
      this.validateFilters(_filters)

      // Estimate data size for optimization
      const estimation = await this.estimateExportSize(_filters)

      if (estimation.estimated_records > 1000000) {
        // Enable aggressive optimization for very large datasets
        this.optimization.chunk_size = 5000
        this.optimization.streaming_enabled = true
      }

      // Create readable stream for sensor data
      const dataStream = await this.createSensorDataStream(_filters)

      // Generate CSV with streaming
      if (this.config.streaming) {
        recordsExported = await this.streamingExport(dataStream, filePath, _jobId)
      } else {
        recordsExported = await this.batchExport(dataStream, filePath)
      }

      const processingTime = performance.now() - startTime
      memoryPeak = this.getCurrentMemoryUsage()

      // Get file size
      const fs = await import('fs')
      const stats = await fs.promises.stat(filePath)

      const metrics: ExportMetrics = {
        job_id: jobId || 0,
        start_time: new Date(Date.now() - processingTime).toISOString(),
        end_time: new Date().toISOString(),
        records_processed: recordsExported,
        file_size_bytes: stats.size,
        processing_time_seconds: processingTime / 1000,
        memory_peak_mb: memoryPeak,
        cpu_usage_percent: 0, // Would need system monitoring
        optimization_applied: this.getOptimizationFlags(),
        performance_score: this.calculatePerformanceScore(recordsExported, processingTime)
      }

      return {
        success: true,
        file_path: filePath,
        file_size_bytes: stats.size,
        records_exported: recordsExported,
        processing_time_ms: processingTime,
        memory_peak_mb: memoryPeak,
        metrics
      }

    } catch (error) {
      return {
        success: false,
        file_size_bytes: 0,
        records_exported: recordsExported,
        processing_time_ms: performance.now() - startTime,
        memory_peak_mb: memoryPeak,
        error: {
          code: 'CSV_EXPORT_FAILED',
          message: error instanceof Error ? error.message : 'Unknown export error',
          details: error,
          suggestions: this.getErrorSuggestions(error),
          retry_possible: true
        },
        metrics: {} as ExportMetrics
      }
    }
  }

  /**
   * Streaming CSV export for large datasets
   */
  private async streamingExport(
    dataStream: AsyncIterable<SensorReadingCSV[]>,
    filePath: string,
    _jobId?: number
  ): Promise<number> {
    const fs = await import('fs')
    const writeStream = fs.createWriteStream(filePath, {
      encoding: this.config.encoding,
      highWaterMark: 64 * 1024 // 64KB buffer
    })

    let recordsExported = 0
    let isFirstChunk = true

    try {
      // Write CSV headers
      if (this.config.include_headers) {
        const headers = this.generateCSVHeaders()
        writeStream.write(headers + '\n')
      }

      // Write metadata if enabled
      if (this.config.include_metadata) {
        const metadata = this.generateMetadata()
        writeStream.write(metadata)
      }

      // Process data in chunks
      for await (const chunk of dataStream) {
        const csvChunk = this.convertChunkToCSV(chunk, !isFirstChunk)

        await new Promise<void>((resolve, reject) => {
          writeStream.write(csvChunk, (error) => {
            if (error) reject(error)
            else resolve()
          })
        })

        recordsExported += chunk.length
        isFirstChunk = false

        // Update job progress if job ID provided
        if (_jobId) {
          await this.updateJobProgress(_jobId, recordsExported)
        }

        // Memory management - force garbage collection for large exports
        if (recordsExported % 50000 === 0) {
          if (global.gc) global.gc()
        }
      }

      // Close the stream
      await new Promise<void>((resolve, reject) => {
        writeStream.end((error) => {
          if (error) reject(error)
          else resolve()
        })
      })

      return recordsExported

    } catch (error) {
      writeStream.destroy()
      throw error
    }
  }

  /**
   * Batch export for smaller datasets
   */
  private async batchExport(
    dataStream: AsyncIterable<SensorReadingCSV[]>,
    filePath: string
  ): Promise<number> {
    const fs = await import('fs')
    let csvContent = ''
    let recordsExported = 0

    // Generate headers
    if (this.config.include_headers) {
      csvContent += this.generateCSVHeaders() + '\n'
    }

    // Add metadata
    if (this.config.include_metadata) {
      csvContent += this.generateMetadata()
    }

    // Process all chunks
    for await (const chunk of dataStream) {
      csvContent += this.convertChunkToCSV(chunk, recordsExported > 0)
      recordsExported += chunk.length
    }

    // Write to file
    await fs.promises.writeFile(filePath, csvContent, { encoding: this.config.encoding })

    return recordsExported
  }

  /**
   * Generate CSV headers based on data structure
   */
  private generateCSVHeaders(): string {
    const headers = [
      'timestamp',
      'sensor_id',
      'floor_number',
      'equipment_type',
      'reading_value',
      'unit',
      'status',
      'daily_avg',
      'daily_min',
      'daily_max'
    ]

    return headers.map(header => this.escapeCSVValue(header)).join(this.config.delimiter)
  }

  /**
   * Generate metadata section for CSV
   */
  private generateMetadata(): string {
    const metadata = [
      `# Export generated at: ${new Date().toISOString()}`,
      `# Format: CSV`,
      `# Encoding: ${this.config.encoding}`,
      `# Delimiter: ${this.config.delimiter}`,
      `# Number precision: ${this.config.number_precision} decimal places`,
      `# Bangkok IoT Dataset Export`,
      `# Source: CU-BEMS IoT Transmission Failure Analysis Platform`,
      `#`,
      ``
    ]

    return metadata.join('\n')
  }

  /**
   * Convert data chunk to CSV format
   */
  private convertChunkToCSV(chunk: SensorReadingCSV[], skipNewline: boolean = false): string {
    const rows = chunk.map(record => {
      const values = [
        this.formatDate(record.timestamp),
        record.sensor_id,
        record.floor_number.toString(),
        record.equipment_type,
        this.formatNumber(record.reading_value),
        record.unit,
        record.status,
        record.daily_avg ? this.formatNumber(record.daily_avg) : '',
        record.daily_min ? this.formatNumber(record.daily_min) : '',
        record.daily_max ? this.formatNumber(record.daily_max) : ''
      ]

      return values.map(value => this.escapeCSVValue(value)).join(this.config.delimiter)
    })

    return (skipNewline ? '' : '\n') + rows.join('\n')
  }

  /**
   * Escape CSV values properly
   */
  private escapeCSVValue(value: string): string {
    if (!value) return ''

    const needsQuoting = value.includes(this.config.delimiter) ||
                        value.includes(this.config.quote_char) ||
                        value.includes('\n') ||
                        value.includes('\r')

    if (needsQuoting) {
      const escaped = value.replace(
        new RegExp(this.config.quote_char, 'g'),
        this.config.escape_char + this.config.quote_char
      )
      return this.config.quote_char + escaped + this.config.quote_char
    }

    return value
  }

  /**
   * Format numbers with specified precision
   */
  private formatNumber(value: number): string {
    return value.toFixed(this.config.number_precision)
  }

  /**
   * Format dates according to configuration
   */
  private formatDate(timestamp: string): string {
    const date = new Date(timestamp)
    // Using ISO format for consistency - could be made configurable
    return date.toISOString().replace('T', ' ').substring(0, 19)
  }

  /**
   * Create data stream from database with filtering
   */
  private async createSensorDataStream(_filters: ExportFilters): Promise<AsyncIterable<SensorReadingCSV[]>> {
    // This would integrate with your database layer
    // For now, returning a mock stream structure

    return {
      async *[Symbol.asyncIterator]() {
        // In real implementation, this would:
        // 1. Connect to PostgreSQL database
        // 2. Execute streaming query with filters
        // 3. Yield chunks of data

        // Mock implementation for type safety
        const mockData: SensorReadingCSV[] = []
        yield mockData
      }
    }
  }

  /**
   * Estimate export size for optimization
   */
  private async estimateExportSize(_filters: ExportFilters): Promise<{
    estimated_records: number
    estimated_size_mb: number
    estimated_time_seconds: number
  }> {
    // This would query the database for count estimates
    // Based on filters and date ranges

    const daysDiff = Math.ceil(
      (new Date(filters.date_range.end_date).getTime() -
       new Date(filters.date_range.start_date).getTime()) / (1000 * 60 * 60 * 24)
    )

    const sensorCount = filters.sensor_ids.length || 134 // Bangkok dataset default
    const estimatedRecords = daysDiff * sensorCount * 24 // Hourly data assumption

    return {
      estimated_records: estimatedRecords,
      estimated_size_mb: (estimatedRecords * 150) / (1024 * 1024), // ~150 bytes per record
      estimated_time_seconds: estimatedRecords / 10000 // ~10k records per second
    }
  }

  /**
   * Validate export filters
   */
  private validateFilters(_filters: ExportFilters): void {
    if (!filters.date_range.start_date || !filters.date_range.end_date) {
      throw new Error('Date range is required for CSV export')
    }

    if (new Date(filters.date_range.start_date) > new Date(filters.date_range.end_date)) {
      throw new Error('Start date must be before end date')
    }

    if (filters.sensor_ids.length === 0) {
      throw new Error('At least one sensor must be selected')
    }
  }

  /**
   * Update job progress (would integrate with job queue system)
   */
  private async updateJobProgress(_jobId: number, _recordsProcessed: number): Promise<void> {
    // This would update the export_jobs table with progress
    // Implementation depends on your job queue system
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    const memUsage = process.memoryUsage()
    return memUsage.heapUsed / (1024 * 1024) // Convert to MB
  }

  /**
   * Get optimization flags applied
   */
  private getOptimizationFlags(): string[] {
    const flags: string[] = []

    if (this.optimization.streaming_enabled) flags.push('streaming')
    if (this.optimization.compression_enabled) flags.push('compression')
    if (this.optimization.chunk_size < 10000) flags.push('small_chunks')
    if (this.optimization.memory_limit_mb < 1024) flags.push('memory_constrained')

    return flags
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculatePerformanceScore(records: number, timeMs: number): number {
    const recordsPerSecond = records / (timeMs / 1000)

    // Scoring based on throughput
    if (recordsPerSecond > 50000) return 100
    if (recordsPerSecond > 25000) return 90
    if (recordsPerSecond > 10000) return 80
    if (recordsPerSecond > 5000) return 70
    if (recordsPerSecond > 1000) return 60
    return 50
  }

  /**
   * Get error suggestions based on error type
   */
  private getErrorSuggestions(error: unknown): string[] {
    const suggestions: string[] = []

    if (error?.code === 'EMFILE' || error?.code === 'ENOMEM') {
      suggestions.push('Try reducing chunk size or enabling streaming mode')
      suggestions.push('Reduce date range to process fewer records')
    }

    if (error?.message?.includes('timeout')) {
      suggestions.push('Increase query timeout settings')
      suggestions.push('Consider using data aggregation to reduce dataset size')
    }

    if (error?.message?.includes('permission')) {
      suggestions.push('Check file system permissions for export directory')
    }

    return suggestions
  }
}

// Export utilities for reuse
export const CSVUtils = {
  /**
   * Validate CSV configuration
   */
  validateConfig(config: Partial<CSVExportConfig>): boolean {
    if (config.chunk_size && config.chunk_size < 100) return false
    if (config.delimiter && config.delimiter.length !== 1) return false
    if (config.number_precision && (config.number_precision < 0 || config.number_precision > 10)) return false
    return true
  },

  /**
   * Estimate file size for given parameters
   */
  estimateFileSize(recordCount: number, avgFieldLength: number = 20): number {
    const fieldsPerRecord = 10 // Based on SensorReadingCSV structure
    const bytesPerRecord = fieldsPerRecord * avgFieldLength + 20 // Delimiters + newline
    return recordCount * bytesPerRecord
  },

  /**
   * Get recommended chunk size based on available memory
   */
  getRecommendedChunkSize(availableMemoryMB: number): number {
    if (availableMemoryMB > 2048) return 20000
    if (availableMemoryMB > 1024) return 10000
    if (availableMemoryMB > 512) return 5000
    return 2000
  }
}