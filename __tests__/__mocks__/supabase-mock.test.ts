/**
 * Comprehensive tests for Supabase mock data structures
 * Validates that all mocks work correctly in Jest environment
 */

import { createClient } from '@supabase/supabase-js';
import {
  mockExecutiveSummary,
  mockFloorPerformance,
  mockPatterns,
  mockAlerts,
  mockSensorData,
  mockVisualizationData,
  mockBuildingHealth,
  mockPerformanceMetrics,
  mockValidationSession,
} from '@/__mocks__/supabase';

describe('Supabase Mock Data Structures', () => {
  describe('mockExecutiveSummary', () => {
    it('should have all required fields', () => {
      expect(mockExecutiveSummary).toHaveProperty('total_sensors');
      expect(mockExecutiveSummary).toHaveProperty('active_sensors');
      expect(mockExecutiveSummary).toHaveProperty('offline_sensors');
      expect(mockExecutiveSummary).toHaveProperty('critical_alerts');
      expect(mockExecutiveSummary).toHaveProperty('system_health');
      expect(mockExecutiveSummary).toHaveProperty('data_quality_score');
      expect(mockExecutiveSummary).toHaveProperty('uptime_percentage');
      expect(mockExecutiveSummary).toHaveProperty('last_updated');
    });

    it('should have realistic values', () => {
      expect(mockExecutiveSummary.total_sensors).toBeGreaterThan(0);
      expect(mockExecutiveSummary.active_sensors).toBeLessThanOrEqual(
        mockExecutiveSummary.total_sensors
      );
      expect(mockExecutiveSummary.system_health).toBeGreaterThanOrEqual(0);
      expect(mockExecutiveSummary.system_health).toBeLessThanOrEqual(100);
      expect(mockExecutiveSummary.data_quality_score).toBeGreaterThanOrEqual(0);
      expect(mockExecutiveSummary.data_quality_score).toBeLessThanOrEqual(100);
    });
  });

  describe('mockFloorPerformance', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(mockFloorPerformance)).toBe(true);
      expect(mockFloorPerformance.length).toBeGreaterThan(0);
    });

    it('should have all required fields in each item', () => {
      mockFloorPerformance.forEach((floor) => {
        expect(floor).toHaveProperty('floor_number');
        expect(floor).toHaveProperty('floor_name');
        expect(floor).toHaveProperty('sensor_count');
        expect(floor).toHaveProperty('active_sensors');
        expect(floor).toHaveProperty('health_score');
        expect(floor).toHaveProperty('alert_count');
      });
    });

    it('should have realistic values', () => {
      mockFloorPerformance.forEach((floor) => {
        expect(floor.active_sensors).toBeLessThanOrEqual(floor.sensor_count);
        expect(floor.health_score).toBeGreaterThanOrEqual(0);
        expect(floor.health_score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('mockPatterns', () => {
    it('should have patterns array and statistics', () => {
      expect(mockPatterns).toHaveProperty('patterns');
      expect(mockPatterns).toHaveProperty('statistics');
      expect(mockPatterns).toHaveProperty('confidence');
      expect(Array.isArray(mockPatterns.patterns)).toBe(true);
    });

    it('should have complete pattern objects', () => {
      mockPatterns.patterns.forEach((pattern) => {
        expect(pattern).toHaveProperty('id');
        expect(pattern).toHaveProperty('pattern_type');
        expect(pattern).toHaveProperty('sensor_id');
        expect(pattern).toHaveProperty('detected_at');
        expect(pattern).toHaveProperty('confidence');
        expect(pattern).toHaveProperty('severity');
        expect(pattern).toHaveProperty('metadata');
      });
    });

    it('should have complete statistics', () => {
      expect(mockPatterns.statistics).toHaveProperty('total_patterns');
      expect(mockPatterns.statistics).toHaveProperty('high_confidence');
      expect(mockPatterns.statistics).toHaveProperty('medium_confidence');
    });
  });

  describe('mockAlerts', () => {
    it('should have alerts array and statistics', () => {
      expect(mockAlerts).toHaveProperty('alerts');
      expect(mockAlerts).toHaveProperty('statistics');
      expect(Array.isArray(mockAlerts.alerts)).toBe(true);
    });

    it('should have complete alert objects', () => {
      mockAlerts.alerts.forEach((alert) => {
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('title');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('location');
        expect(alert).toHaveProperty('affected_systems');
        expect(alert).toHaveProperty('recommended_actions');
      });
    });

    it('should have complete statistics', () => {
      expect(mockAlerts.statistics).toHaveProperty('total_active');
      expect(mockAlerts.statistics).toHaveProperty('by_severity');
      expect(mockAlerts.statistics).toHaveProperty('by_type');
      expect(mockAlerts.statistics).toHaveProperty('average_resolution_time');
    });
  });

  describe('mockSensorData', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(mockSensorData)).toBe(true);
      expect(mockSensorData.length).toBeGreaterThan(0);
    });

    it('should have all required fields in each item', () => {
      mockSensorData.forEach((sensor) => {
        expect(sensor).toHaveProperty('timestamp');
        expect(sensor).toHaveProperty('sensor_id');
        expect(sensor).toHaveProperty('floor_number');
        expect(sensor).toHaveProperty('equipment_type');
        expect(sensor).toHaveProperty('reading_value');
        expect(sensor).toHaveProperty('unit');
        expect(sensor).toHaveProperty('status');
      });
    });
  });

  describe('mockVisualizationData', () => {
    it('should have all required nested objects', () => {
      expect(mockVisualizationData).toHaveProperty('dataset_info');
      expect(mockVisualizationData).toHaveProperty('real_time_updates');
      expect(mockVisualizationData).toHaveProperty('floor_performance');
      expect(mockVisualizationData).toHaveProperty('system_comparisons');
      expect(mockVisualizationData).toHaveProperty('environmental_conditions');
    });

    it('should have complete dataset_info', () => {
      expect(mockVisualizationData.dataset_info).toHaveProperty('total_records');
      expect(mockVisualizationData.dataset_info).toHaveProperty('date_range');
      expect(mockVisualizationData.dataset_info).toHaveProperty('buildings_analyzed');
      expect(mockVisualizationData.dataset_info).toHaveProperty('data_quality_score');
    });
  });
});

describe('Supabase Client Mock', () => {
  let supabase: any;

  beforeEach(() => {
    supabase = createClient('https://test.supabase.co', 'test-key');
  });

  describe('Query Chain', () => {
    it('should support basic select query', async () => {
      const { data, error } = await supabase.from('test_table').select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should support eq filter', async () => {
      const { data, error } = await supabase
        .from('test_table')
        .select('*')
        .eq('id', 1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should support gte filter', async () => {
      const { data, error } = await supabase
        .from('test_table')
        .select('*')
        .gte('value', 10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should support lte filter', async () => {
      const { data, error } = await supabase
        .from('test_table')
        .select('*')
        .lte('value', 100);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should support order', async () => {
      const { data, error } = await supabase
        .from('test_table')
        .select('*')
        .order('created_at');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should support limit', async () => {
      const { data, error } = await supabase
        .from('test_table')
        .select('*')
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should support chaining multiple filters', async () => {
      const { data, error } = await supabase
        .from('test_table')
        .select('*')
        .eq('status', 'active')
        .gte('value', 10)
        .lte('value', 100)
        .order('created_at')
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should support single() method', async () => {
      const { data, error } = await supabase
        .from('test_table')
        .select('*')
        .eq('id', 1)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(false);
    });
  });

  describe('Table-Based Data Routing', () => {
    it('should return mockValidationSession for validation_sessions table', async () => {
      const { data } = await supabase.from('validation_sessions').select('*').single();

      expect(data).toMatchObject({
        session_id: expect.any(String),
        validation_status: expect.any(String),
        total_sensors: expect.any(Number),
      });
    });

    it('should return mockSensorData for sensor_readings table', async () => {
      const { data } = await supabase.from('sensor_readings').select('*');

      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('sensor_id');
        expect(data[0]).toHaveProperty('reading_value');
      }
    });

    it('should return mockAlerts.alerts for alerts table', async () => {
      const { data } = await supabase.from('alerts').select('*');

      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('id');
        expect(data[0]).toHaveProperty('severity');
        expect(data[0]).toHaveProperty('title');
      }
    });

    it('should return mockPatterns.patterns for patterns table', async () => {
      const { data } = await supabase.from('patterns').select('*');

      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('pattern_type');
        expect(data[0]).toHaveProperty('confidence');
      }
    });

    it('should return mockFloorPerformance for floor_performance table', async () => {
      const { data } = await supabase.from('floor_performance').select('*');

      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('floor_number');
        expect(data[0]).toHaveProperty('floor_name');
      }
    });
  });

  describe('Field-Based Data Routing', () => {
    it('should return mockFloorPerformance when selecting floor fields', async () => {
      const { data } = await supabase
        .from('generic_table')
        .select('floor_number, floor_name');

      expect(Array.isArray(data)).toBe(true);
    });

    it('should return mockPatterns when selecting pattern fields', async () => {
      const { data } = await supabase
        .from('generic_table')
        .select('patterns, detected_at');

      expect(data).toHaveProperty('patterns');
    });

    it('should return mockAlerts when selecting alert fields', async () => {
      const { data } = await supabase
        .from('generic_table')
        .select('alerts, severity');

      expect(data).toHaveProperty('alerts');
    });
  });

  describe('Auth Mock', () => {
    it('should mock getSession', async () => {
      const { data, error } = await supabase.auth.getSession();

      expect(error).toBeNull();
      expect(data).toHaveProperty('session');
      expect(data.session).toHaveProperty('user');
    });

    it('should mock signIn', async () => {
      const { data, error } = await supabase.auth.signIn({
        email: 'test@example.com',
        password: 'password',
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('user');
    });

    it('should mock signOut', async () => {
      const { error } = await supabase.auth.signOut();

      expect(error).toBeNull();
    });
  });

  describe('Storage Mock', () => {
    it('should mock storage.from().upload()', async () => {
      const { data, error } = await supabase.storage
        .from('test-bucket')
        .upload('test.txt', new Blob(['test']));

      expect(error).toBeNull();
      expect(data).toHaveProperty('path');
    });

    it('should mock storage.from().download()', async () => {
      const { data, error } = await supabase.storage
        .from('test-bucket')
        .download('test.txt');

      expect(error).toBeNull();
      expect(data).toBeInstanceOf(Blob);
    });
  });
});

describe('Integration Tests', () => {
  it('should work with complex queries', async () => {
    const supabase = createClient('https://test.supabase.co', 'test-key');

    const { data, error } = await supabase
      .from('sensor_readings')
      .select('sensor_id, reading_value, timestamp')
      .eq('floor_number', 1)
      .gte('reading_value', 20)
      .lte('reading_value', 30)
      .order('timestamp', { ascending: false })
      .limit(10);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should work with single record queries', async () => {
    const supabase = createClient('https://test.supabase.co', 'test-key');

    const { data, error } = await supabase
      .from('validation_sessions')
      .select('*')
      .eq('session_id', 'session-123')
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(false);
    expect(data).toHaveProperty('session_id');
  });
});
