/**
 * Mock for @supabase/supabase-js package
 * This ensures that all imports of @supabase/supabase-js use our comprehensive mock
 */

import {
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
} from '../supabase';

export {
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

export default {
  createClient,
};
