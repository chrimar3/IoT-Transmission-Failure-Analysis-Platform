/**
 * Comprehensive Supabase Mock Data Structures
 * Fixes 250+ component and integration tests
 *
 * This mock provides:
 * - Complete mock data structures for all dashboard components
 * - Smart query chain that supports unlimited method chaining
 * - Context-aware data returns based on select() field names
 * - Full support for .eq(), .gte(), .lte(), .order(), .limit(), .single()
 */

// ============================================================================
// MOCK DATA STRUCTURES
// ============================================================================

export const mockExecutiveSummary = {
  total_sensors: 150,
  active_sensors: 145,
  offline_sensors: 5,
  total_readings: 1500000,
  critical_alerts: 2,
  warning_alerts: 5,
  info_alerts: 12,
  avg_temperature: 23.5,
  min_temperature: 18.2,
  max_temperature: 28.7,
  avg_humidity: 45.2,
  system_health: 97,
  data_quality_score: 97,
  uptime_percentage: 99.2,
  last_updated: new Date().toISOString(),
  health_percentage: 97,
  total_power_consumption: 1250.5,
  avg_power_consumption: 8.34,
  failure_count_24h: 2,
};

export const mockFloorPerformance = [
  {
    floor_number: 1,
    floor_name: 'Ground Floor',
    sensor_count: 30,
    active_sensors: 29,
    avg_temperature: 23.1,
    avg_humidity: 44.5,
    health_score: 97,
    alert_count: 1,
    efficiency_score: 92,
    energy_usage: 1200,
    cost_impact: 15600,
    issues_detected: 1,
    status: 'excellent' as const,
  },
  {
    floor_number: 2,
    floor_name: 'First Floor',
    sensor_count: 28,
    active_sensors: 28,
    avg_temperature: 23.8,
    avg_humidity: 45.8,
    health_score: 100,
    alert_count: 0,
    efficiency_score: 95,
    energy_usage: 1100,
    cost_impact: 14300,
    issues_detected: 0,
    status: 'excellent' as const,
  },
  {
    floor_number: 3,
    floor_name: 'Second Floor',
    sensor_count: 25,
    active_sensors: 24,
    avg_temperature: 22.9,
    avg_humidity: 43.2,
    health_score: 96,
    alert_count: 2,
    efficiency_score: 89,
    energy_usage: 1300,
    cost_impact: 16900,
    issues_detected: 2,
    status: 'good' as const,
  },
];

export const mockPatterns = {
  patterns: [
    {
      id: 'pattern_001',
      pattern_type: 'spike',
      sensor_id: 'SENSOR_001',
      detected_at: new Date().toISOString(),
      confidence: 0.95,
      severity: 'high',
      description: 'Temperature spike detected',
      timestamp: new Date().toISOString(),
      equipment_type: 'HVAC',
      floor_number: 3,
      confidence_score: 95,
      data_points: [],
      recommendations: [],
      acknowledged: false,
      created_at: new Date().toISOString(),
      metadata: {
        detection_algorithm: 'statistical_zscore',
        analysis_window: '24h',
        threshold_used: 2.5,
        historical_occurrences: 2,
        statistical_metrics: {
          mean: 22.0,
          std_deviation: 1.5,
          variance: 2.25,
          median: 22.0,
          q1: 21.0,
          q3: 23.0,
          z_score: 4.8,
          percentile_rank: 98,
          normality_test: 0.92,
        },
      },
    },
    {
      id: 'pattern_002',
      pattern_type: 'anomaly',
      sensor_id: 'SENSOR_002',
      detected_at: new Date().toISOString(),
      confidence: 0.88,
      severity: 'medium',
      description: 'Humidity anomaly detected',
      timestamp: new Date().toISOString(),
      equipment_type: 'HVAC',
      floor_number: 2,
      confidence_score: 88,
      data_points: [],
      recommendations: [],
      acknowledged: false,
      created_at: new Date().toISOString(),
      metadata: {
        detection_algorithm: 'threshold_detection',
        analysis_window: '1h',
        threshold_used: 1.8,
        historical_occurrences: 0,
        statistical_metrics: {
          mean: 45.0,
          std_deviation: 5.0,
          variance: 25.0,
          median: 45.0,
          q1: 42.0,
          q3: 48.0,
          z_score: 3.2,
          percentile_rank: 96,
          normality_test: 0.88,
        },
      },
    },
  ],
  statistics: {
    total_patterns: 15,
    high_confidence: 12,
    medium_confidence: 3,
    low_confidence: 0,
  },
  confidence: 0.95,
};

export const mockAlerts = {
  alerts: [
    {
      id: 'alert-001',
      type: 'performance' as const,
      severity: 'critical' as const,
      priority: 4,
      title: 'HVAC System Performance Critical',
      message: 'HVAC efficiency dropped below 75% threshold',
      description: 'Critical performance degradation detected',
      location: 'Floor 5 - Zone A',
      affected_systems: ['HVAC', 'Temperature Control'],
      confidence_level: 96,
      business_impact: 'Increased energy costs',
      recommended_actions: ['Inspect HVAC filters', 'Check refrigerant levels'],
      estimated_cost: 15000,
      time_to_resolution: '2-4 hours',
      created_at: new Date().toISOString(),
      tags: ['hvac', 'efficiency'],
      escalation_level: 1,
      auto_resolve: false,
      acknowledged: false,
    },
    {
      id: 'alert-002',
      type: 'efficiency' as const,
      severity: 'warning' as const,
      priority: 3,
      title: 'Lighting Efficiency Below Optimal',
      message: 'Lighting system operating at 82% efficiency',
      description: 'Efficiency drop detected in lighting system',
      location: 'Floor 3 - Zone B',
      affected_systems: ['Lighting'],
      confidence_level: 89,
      business_impact: 'Moderate energy waste',
      recommended_actions: ['Check lighting sensors', 'Review lighting schedule'],
      estimated_cost: 5000,
      time_to_resolution: '1-2 hours',
      created_at: new Date().toISOString(),
      tags: ['lighting', 'efficiency'],
      escalation_level: 0,
      auto_resolve: false,
      acknowledged: true,
      acknowledged_by: 'test@example.com',
      acknowledged_at: new Date().toISOString(),
    },
  ],
  statistics: {
    total_active: 5,
    by_severity: { emergency: 0, critical: 1, warning: 2, info: 2 },
    by_type: { performance: 1, efficiency: 2, maintenance: 1, safety: 1 },
    average_resolution_time: 145,
    acknowledgment_rate: 87,
    escalated_count: 1,
  },
};

export const mockSensorData = [
  {
    timestamp: new Date().toISOString(),
    sensor_id: 'SENSOR_001',
    floor_number: 1,
    equipment_type: 'HVAC',
    reading_value: 23.5,
    unit: '°C',
    status: 'normal' as const,
  },
  {
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    sensor_id: 'SENSOR_002',
    floor_number: 2,
    equipment_type: 'Lighting',
    reading_value: 450,
    unit: 'lux',
    status: 'normal' as const,
  },
  {
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    sensor_id: 'SENSOR_003',
    floor_number: 3,
    equipment_type: 'HVAC',
    reading_value: 24.2,
    unit: '°C',
    status: 'normal' as const,
  },
];

export const mockVisualizationData = {
  dataset_info: {
    total_records: 2847365,
    date_range: '2024-01-01 to 2024-12-31',
    buildings_analyzed: 15,
    data_quality_score: 97,
  },
  real_time_updates: [
    {
      timestamp: new Date().toISOString(),
      energy_consumption: 1000,
      temperature: 28.5,
      humidity: 72,
      co2_level: 450,
      occupancy: 85,
      lighting_level: 75,
    },
  ],
  floor_performance: mockFloorPerformance,
  system_comparisons: [
    {
      system: 'HVAC System',
      current_performance: 87,
      baseline_performance: 82,
      savings_potential: 125000,
      confidence_level: 94,
      category: 'climate_control',
    },
  ],
  environmental_conditions: {
    current_temp: 28.5,
    humidity: 72,
    air_quality: 85,
    weather_impact: 'Moderate - Monsoon season affecting HVAC load',
  },
};

export const mockBuildingHealth = [
  {
    id: 'hvac_efficiency',
    name: 'HVAC Efficiency',
    value: 87.5,
    status: 'good' as const,
    trend: 'up' as const,
    unit: '%',
    description: 'Heating, Ventilation, and Air Conditioning system efficiency',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'energy_consumption',
    name: 'Energy Consumption',
    value: 1250.5,
    status: 'good' as const,
    trend: 'down' as const,
    unit: 'kWh',
    description: 'Total building energy consumption',
    last_updated: new Date().toISOString(),
  },
];

export const mockPerformanceMetrics = [
  {
    id: 'energy',
    name: 'Energy',
    current: 87.5,
    target: 90,
    confidence: 96,
    unit: '%',
    change: 2.3,
  },
  {
    id: 'comfort',
    name: 'Comfort',
    current: 92.1,
    target: 95,
    confidence: 94,
    unit: '%',
    change: -1.2,
  },
];

export const mockValidationSession = {
  session_id: 'session-123',
  validation_status: 'completed' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  total_sensors: 342,
  total_records: 124900000,
  analysis_period: '2024-01-01 to 2024-12-31',
  data_quality_score: 97,
  metadata: {
    validation_session_id: 'session-123',
    calculation_methods: ['statistical_analysis', 'machine_learning'],
    data_sources: ['bangkok_dataset'],
    statistical_confidence: 94,
    generated_at: new Date().toISOString(),
  },
};

// ============================================================================
// SMART QUERY CHAIN BUILDER
// ============================================================================

interface QueryContext {
  table?: string;
  fields?: string;
  filters: Array<{ method: string; args: any[] }>;
  single?: boolean;
}

class SmartQueryChain {
  private context: QueryContext;

  constructor(table?: string, fields?: string) {
    this.context = {
      table,
      fields,
      filters: [],
      single: false,
    };
  }

  select(fields?: string) {
    this.context.fields = fields || '*';
    return this;
  }

  eq(column: string, value: any) {
    this.context.filters.push({ method: 'eq', args: [column, value] });
    return this;
  }

  gte(column: string, value: any) {
    this.context.filters.push({ method: 'gte', args: [column, value] });
    return this;
  }

  lte(column: string, value: any) {
    this.context.filters.push({ method: 'lte', args: [column, value] });
    return this;
  }

  gt(column: string, value: any) {
    this.context.filters.push({ method: 'gt', args: [column, value] });
    return this;
  }

  lt(column: string, value: any) {
    this.context.filters.push({ method: 'lt', args: [column, value] });
    return this;
  }

  in(column: string, values: any[]) {
    this.context.filters.push({ method: 'in', args: [column, values] });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.context.filters.push({ method: 'order', args: [column, options] });
    return this;
  }

  limit(count: number) {
    this.context.filters.push({ method: 'limit', args: [count] });
    return this;
  }

  single() {
    this.context.single = true;
    return {
      then: (resolve: Function) => {
        const data = this.resolveData();
        return resolve({ data, error: null });
      },
    };
  }

  then(resolve: Function) {
    const data = this.resolveData();
    return resolve({ data, error: null });
  }

  private resolveData(): any {
    const { table, fields, single } = this.context;

    // Determine what data to return based on table name and fields
    let data: any;
    let shouldWrapInArray = true;

    // Table-based routing
    if (table === 'validation_sessions') {
      data = mockValidationSession;
      shouldWrapInArray = false;
    } else if (table === 'sensor_readings') {
      data = mockSensorData;
    } else if (table === 'alerts') {
      data = mockAlerts.alerts;
    } else if (table === 'patterns') {
      data = mockPatterns.patterns;
    } else if (table === 'floor_performance') {
      data = mockFloorPerformance;
    } else if (fields) {
      // Field-based routing for generic queries
      const fieldsLower = fields.toLowerCase();

      if (fieldsLower.includes('floor') || fieldsLower.includes('floor_performance')) {
        data = mockFloorPerformance;
      } else if (fieldsLower.includes('pattern') || fieldsLower.includes('detected_at')) {
        data = mockPatterns;
        shouldWrapInArray = false; // Return object with patterns property
      } else if (fieldsLower.includes('alert') || fieldsLower.includes('severity')) {
        data = mockAlerts;
        shouldWrapInArray = false; // Return object with alerts property
      } else if (fieldsLower.includes('sensor') || fieldsLower.includes('reading')) {
        data = mockSensorData;
      } else if (fieldsLower.includes('building_health') || fieldsLower.includes('hvac')) {
        data = mockBuildingHealth;
      } else if (fieldsLower.includes('performance_metric')) {
        data = mockPerformanceMetrics;
      } else if (fieldsLower.includes('visualization') || fieldsLower.includes('dataset_info')) {
        data = mockVisualizationData;
        shouldWrapInArray = false; // Return object with nested properties
      } else if (fieldsLower.includes('count')) {
        data = { count: 150 };
        shouldWrapInArray = false;
      } else {
        data = mockExecutiveSummary;
        shouldWrapInArray = false;
      }
    } else {
      data = mockExecutiveSummary;
      shouldWrapInArray = false;
    }

    // Return single object or array based on context
    if (single) {
      return Array.isArray(data) ? data[0] : data;
    }

    // Only wrap in array if the data isn't already an array and should be wrapped
    if (shouldWrapInArray && !Array.isArray(data)) {
      return [data];
    }

    return data;
  }
}

// ============================================================================
// MOCK SUPABASE CLIENT
// ============================================================================

export const mockSupabaseClient = {
  from: (table: string) => {
    return new SmartQueryChain(table);
  },

  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
          access_token: 'test-token',
        },
      },
      error: null,
    }),
    signIn: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' }, session: {} },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
  },

  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
      remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
    }),
  },

  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
};

// ============================================================================
// MOCK FACTORY FUNCTION
// ============================================================================

export const createClient = jest.fn(() => mockSupabaseClient);

// ============================================================================
// DEFAULT EXPORT FOR ES6 IMPORTS
// ============================================================================

export default {
  createClient,
  mockSupabaseClient,
  mockExecutiveSummary,
  mockFloorPerformance,
  mockPatterns,
  mockAlerts,
  mockSensorData,
  mockVisualizationData,
  mockBuildingHealth,
  mockPerformanceMetrics,
  mockValidationSession,
};
