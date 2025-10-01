/**
 * Bangkok Data Service
 * Mock service for testing Bangkok dataset operations
 */

export interface BangkokSensorData {
  sensor_id: string
  timestamp: string
  value: number
  unit: string
  equipment_type: string
}

export interface BangkokEquipmentInfo {
  equipment_id: string
  type: string
  location: string
  floor: number
  status: string
}

export class BangkokDataService {
  static async getSensorData(sensorIds: string[], _timeWindow: string): Promise<BangkokSensorData[]> {
    // Mock implementation for testing
    return sensorIds.map(sensorId => ({
      sensor_id: sensorId,
      timestamp: new Date().toISOString(),
      value: Math.random() * 1000,
      unit: 'kWh',
      equipment_type: 'HVAC'
    }))
  }

  static async getEquipmentInfo(equipmentIds: string[]): Promise<BangkokEquipmentInfo[]> {
    // Mock implementation for testing
    return equipmentIds.map(equipmentId => ({
      equipment_id: equipmentId,
      type: 'HVAC',
      location: 'Building A',
      floor: 1,
      status: 'operational'
    }))
  }
}