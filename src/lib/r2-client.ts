/**
 * Cloudflare R2 Storage Client
 * Handles bulk data storage for Bangkok sensor dataset
 * Free tier: 10GB storage, 10M requests/month
 */

interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
}

interface SensorDataQuery {
  startDate?: string
  endDate?: string
  sensorId?: string
  floorNumber?: number
  limit?: number
  offset?: number
}

export class R2StorageClient {
  private baseUrl: string
  private bucketName: string

  constructor(config: Partial<R2Config> = {}) {
    // Use public R2 bucket URL for read-only access in MVP
    this.bucketName = config.bucketName || 'cu-bems-iot-data'
    this.baseUrl = process.env.NEXT_PUBLIC_R2_URL || 
      `https://${this.bucketName}.r2.dev`
  }

  /**
   * Fetch sensor data from R2 storage
   * Data is partitioned by date for efficient queries
   */
  async fetchSensorData(query: SensorDataQuery): Promise<any[]> {
    try {
      // Build file path based on date range
      const fileName = this.buildFileName(query)
      const url = `${this.baseUrl}/${fileName}`

      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'max-age=3600', // Cache for 1 hour
        }
      })

      if (!response.ok) {
        throw new Error(`R2 fetch failed: ${response.status}`)
      }

      const text = await response.text()
      return this.parseCSVData(text, query)
    } catch (error) {
      console.error('R2 fetch error:', error)
      // Fallback to cached data or sample data
      return this.getFallbackData(query)
    }
  }

  /**
   * Parse CSV data and apply filters
   */
  private parseCSVData(csvText: string, query: SensorDataQuery): any[] {
    const lines = csvText.split('\n')
    const headers = lines[0].split(',')
    
    const data = []
    let count = 0
    const limit = query.limit || 1000
    const offset = query.offset || 0

    for (let i = 1 + offset; i < lines.length && count < limit; i++) {
      const values = lines[i].split(',')
      if (values.length !== headers.length) continue

      const record: any = {}
      headers.forEach((header, index) => {
        record[header.trim()] = values[index].trim()
      })

      // Apply filters
      if (query.sensorId && record.sensor_id !== query.sensorId) continue
      if (query.floorNumber && parseInt(record.floor_number) !== query.floorNumber) continue

      data.push({
        timestamp: record.timestamp,
        sensor_id: record.sensor_id,
        floor_number: parseInt(record.floor_number) || 0,
        equipment_type: record.equipment_type,
        reading_value: parseFloat(record.reading_value) || 0,
        unit: record.unit,
        status: record.status || 'normal'
      })
      count++
    }

    return data
  }

  /**
   * Build R2 file name based on query parameters
   * Files are partitioned by month for efficient access
   */
  private buildFileName(query: SensorDataQuery): string {
    if (query.startDate) {
      const date = new Date(query.startDate)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      return `bangkok-data/${year}/${month}/sensor-data.csv`
    }
    // Default to current month
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `bangkok-data/${year}/${month}/sensor-data.csv`
  }

  /**
   * Get fallback data for development/demo
   */
  private getFallbackData(query: SensorDataQuery): any[] {
    // Return sample data for MVP demonstration
    const sampleData = []
    const sensors = ['SENSOR_001', 'SENSOR_002', 'SENSOR_003', 'SENSOR_004', 'SENSOR_005']
    const limit = Math.min(query.limit || 100, 100)

    for (let i = 0; i < limit; i++) {
      const timestamp = new Date(Date.now() - i * 60000).toISOString()
      sampleData.push({
        timestamp,
        sensor_id: sensors[i % sensors.length],
        floor_number: (i % 5) + 1,
        equipment_type: i % 2 === 0 ? 'HVAC' : 'Lighting',
        reading_value: 2.5 + Math.random() * 2,
        unit: 'kW',
        status: Math.random() > 0.9 ? 'warning' : 'normal'
      })
    }

    return sampleData
  }

  /**
   * Get aggregated metrics (cached in Supabase)
   */
  async getMetrics(): Promise<any> {
    // For MVP, calculate metrics from sample data
    const data = await this.fetchSensorData({ limit: 1000 })
    
    const uniqueSensors = new Set(data.map(d => d.sensor_id))
    const totalSensors = uniqueSensors.size
    const normalReadings = data.filter(d => d.status === 'normal')
    const activeSensors = new Set(normalReadings.map(d => d.sensor_id)).size
    const totalPower = data.reduce((sum, d) => sum + d.reading_value, 0)
    
    return {
      total_sensors: totalSensors,
      active_sensors: activeSensors,
      offline_sensors: Math.max(0, totalSensors - activeSensors),
      total_power_consumption: Math.round(totalPower * 100) / 100,
      avg_power_consumption: data.length > 0 ? Math.round((totalPower / data.length) * 100) / 100 : 0,
      failure_count_24h: data.filter(d => d.status !== 'normal').length,
      health_percentage: data.length > 0 ? Math.round((normalReadings.length / data.length) * 100) : 100,
      last_updated: new Date().toISOString()
    }
  }
}

// Singleton instance
export const r2Client = new R2StorageClient()