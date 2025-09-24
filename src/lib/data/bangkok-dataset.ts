/**
 * Bangkok IoT Dataset Interface
 * Provides access to the Bangkok sensor dataset for analysis
 */

export interface SensorReading {
  sensorId: string
  timestamp: string
  value: number
  unit: string
  location: {
    lat: number
    lng: number
    district: string
  }
  metadata?: Record<string, unknown>
}

export interface SensorInfo {
  id: string
  name: string
  type: string
  location: {
    lat: number
    lng: number
    district: string
  }
  status: 'active' | 'inactive' | 'maintenance'
  installDate: string
}

export interface DatasetStats {
  totalSensors: number
  totalReadings: number
  dateRange: {
    from: string
    to: string
  }
  districts: string[]
}

export class BangkokDataset {
  private static instance: BangkokDataset

  static getInstance(): BangkokDataset {
    if (!BangkokDataset.instance) {
      BangkokDataset.instance = new BangkokDataset()
    }
    return BangkokDataset.instance
  }

  async getSensors(): Promise<SensorInfo[]> {
    // In a real implementation, this would fetch from database
    return [
      {
        id: 'BKK001',
        name: 'Bangkok District 1 Sensor',
        type: 'temperature',
        location: {
          lat: 13.7563,
          lng: 100.5018,
          district: 'Pathum Wan'
        },
        status: 'active',
        installDate: '2023-01-15'
      }
      // More sensors would be added here
    ]
  }

  async getReadings(
    _sensorIds?: string[],
    _startDate?: string,
    _endDate?: string
  ): Promise<SensorReading[]> {
    // In a real implementation, this would fetch from database
    return [
      {
        sensorId: 'BKK001',
        timestamp: new Date().toISOString(),
        value: 28.5,
        unit: '°C',
        location: {
          lat: 13.7563,
          lng: 100.5018,
          district: 'Pathum Wan'
        }
      }
      // More readings would be added here
    ]
  }

  async getStats(): Promise<DatasetStats> {
    return {
      totalSensors: 134,
      totalReadings: 1000000,
      dateRange: {
        from: '2023-01-01',
        to: new Date().toISOString().split('T')[0]
      },
      districts: [
        'Pathum Wan',
        'Bang Rak',
        'Sathorn',
        'Silom',
        'Sukhumvit'
      ]
    }
  }
}

// Export singleton instance
export const bangkokDataset = BangkokDataset.getInstance()

// Export convenience functions
export const getBangkokData = () => bangkokDataset
export const getSensors = () => bangkokDataset.getSensors()
export const getReadings = (_sensorIds?: string[], _startDate?: string, _endDate?: string) =>
  bangkokDataset.getReadings(_sensorIds, _startDate, _endDate)
export const getStats = () => bangkokDataset.getStats()

export default bangkokDataset