/**
 * Test validation script for Supabase mocks
 * This script validates that all mock data structures are complete
 */

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
  mockSupabaseClient,
  createClient,
} from './supabase';

// Validation functions
function validateExecutiveSummary() {
  const required = [
    'total_sensors',
    'active_sensors',
    'offline_sensors',
    'total_readings',
    'critical_alerts',
    'warning_alerts',
    'info_alerts',
    'avg_temperature',
    'system_health',
    'data_quality_score',
    'uptime_percentage',
    'last_updated',
  ];

  for (const field of required) {
    if (!(field in mockExecutiveSummary)) {
      throw new Error(`Missing field in mockExecutiveSummary: ${field}`);
    }
  }

  console.log('✓ mockExecutiveSummary validation passed');
}

function validateFloorPerformance() {
  if (!Array.isArray(mockFloorPerformance) || mockFloorPerformance.length === 0) {
    throw new Error('mockFloorPerformance must be a non-empty array');
  }

  const required = [
    'floor_number',
    'floor_name',
    'sensor_count',
    'active_sensors',
    'health_score',
    'alert_count',
  ];

  for (const floor of mockFloorPerformance) {
    for (const field of required) {
      if (!(field in floor)) {
        throw new Error(`Missing field in mockFloorPerformance item: ${field}`);
      }
    }
  }

  console.log('✓ mockFloorPerformance validation passed');
}

function validatePatterns() {
  if (!mockPatterns.patterns || !Array.isArray(mockPatterns.patterns)) {
    throw new Error('mockPatterns must have a patterns array');
  }

  if (!mockPatterns.statistics) {
    throw new Error('mockPatterns must have statistics object');
  }

  console.log('✓ mockPatterns validation passed');
}

function validateAlerts() {
  if (!mockAlerts.alerts || !Array.isArray(mockAlerts.alerts)) {
    throw new Error('mockAlerts must have an alerts array');
  }

  if (!mockAlerts.statistics) {
    throw new Error('mockAlerts must have statistics object');
  }

  console.log('✓ mockAlerts validation passed');
}

function validateSensorData() {
  if (!Array.isArray(mockSensorData) || mockSensorData.length === 0) {
    throw new Error('mockSensorData must be a non-empty array');
  }

  const required = ['timestamp', 'sensor_id', 'reading_value', 'unit', 'status'];

  for (const sensor of mockSensorData) {
    for (const field of required) {
      if (!(field in sensor)) {
        throw new Error(`Missing field in mockSensorData item: ${field}`);
      }
    }
  }

  console.log('✓ mockSensorData validation passed');
}

function validateVisualizationData() {
  const required = [
    'dataset_info',
    'real_time_updates',
    'floor_performance',
    'system_comparisons',
    'environmental_conditions',
  ];

  for (const field of required) {
    if (!(field in mockVisualizationData)) {
      throw new Error(`Missing field in mockVisualizationData: ${field}`);
    }
  }

  console.log('✓ mockVisualizationData validation passed');
}

function validateQueryChain() {
  const client = createClient();

  // Test basic query chain
  const chain = client.from('test_table').select('*').eq('id', 1).gte('value', 10).lte('value', 100).order('created_at').limit(10);

  if (!chain.then) {
    throw new Error('Query chain must support .then()');
  }

  console.log('✓ Query chain validation passed');
}

// Run all validations
async function runValidations() {
  try {
    console.log('Starting Supabase mock validations...\n');

    validateExecutiveSummary();
    validateFloorPerformance();
    validatePatterns();
    validateAlerts();
    validateSensorData();
    validateVisualizationData();
    validateQueryChain();

    console.log('\n✅ All validations passed successfully!');
    console.log('\nMock data structures are complete and ready for use.');
  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runValidations();
}

export { runValidations };
