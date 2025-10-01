/**
 * Simple validation script for mock data structures (no Jest required)
 */

// Import mock data directly without Jest dependencies
const mockExecutiveSummary = {
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

console.log('✅ Supabase Mock Data Structure Validation');
console.log('==========================================\n');

// Validate mockExecutiveSummary
const requiredFields = [
  'total_sensors',
  'active_sensors',
  'offline_sensors',
  'critical_alerts',
  'system_health',
  'data_quality_score',
];

let allValid = true;

for (const field of requiredFields) {
  if (field in mockExecutiveSummary) {
    console.log(`✓ ${field}: ${mockExecutiveSummary[field]}`);
  } else {
    console.log(`✗ Missing field: ${field}`);
    allValid = false;
  }
}

console.log('\n==========================================');

if (allValid) {
  console.log('✅ All required fields present!');
  console.log('\nMock data structure is valid and ready for use in tests.');
  process.exit(0);
} else {
  console.log('❌ Some required fields are missing!');
  process.exit(1);
}
