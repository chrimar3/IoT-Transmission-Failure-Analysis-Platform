const { AlertRuleEngine } = require('./lib/alerts/AlertRuleEngine');

// Simple test to debug AlertRuleEngine
async function debugAlertEngine() {
  console.log('🔍 Debugging AlertRuleEngine...');

  const engine = new AlertRuleEngine();

  // Simple alert configuration
  const testConfig = {
    id: 'test_config',
    name: 'Test Alert',
    description: 'Test alert configuration',
    user_id: 'test_user',
    organization_id: 'test_org',
    status: 'active',
    created_at: '2025-09-23T00:00:00Z',
    updated_at: '2025-09-23T00:00:00Z',
    created_by: 'test_user',
    rules: [{
      id: 'test_rule',
      name: 'Test Rule',
      description: 'Test rule',
      enabled: true,
      priority: 'critical',
      conditions: [{
        id: 'test_condition',
        metric: {
          type: 'energy_consumption',
          sensor_id: 'TEST_SENSOR',
          display_name: 'Test Sensor',
          units: 'kWh'
        },
        operator: 'greater_than',
        threshold: { value: 100 },
        time_aggregation: {
          function: 'sum',
          period: 60,
          minimum_data_points: 1
        },
        filters: []
      }],
      logical_operator: 'AND',
      evaluation_window: 60,
      cooldown_period: 30,
      suppress_duplicates: true,
      tags: ['test']
    }],
    notification_settings: {
      channels: [],
      recipients: [],
      frequency_limits: {
        max_alerts_per_hour: 10,
        max_alerts_per_day: 50,
        cooldown_between_similar: 30,
        escalation_threshold: 2
      },
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '06:00',
        timezone: 'UTC',
        exceptions: [],
        weekend_override: false
      },
      escalation_delays: [15, 30, 60]
    },
    metadata: {
      category: 'energy_efficiency',
      severity_auto_adjust: false,
      business_impact: {
        level: 'high',
        operational_severity: 'degraded_performance',
        compliance_risk: false,
        safety_risk: false
      },
      affected_systems: ['hvac'],
      affected_locations: ['Test Location'],
      documentation_links: [],
      tags: ['test'],
      custom_fields: {}
    }
  };

  // Simple context that should trigger the alert
  const testContext = {
    current_time: '2025-09-23T12:00:00Z',
    sensor_readings: [{
      sensor_id: 'TEST_SENSOR',
      timestamp: '2025-09-23T12:00:00Z',
      value: 150, // Above threshold of 100
      unit: 'kWh',
      quality: 'good'
    }],
    historical_data: [],
    system_status: {}
  };

  console.log('📋 Test Configuration:', JSON.stringify(testConfig, null, 2));
  console.log('📊 Test Context:', JSON.stringify(testContext, null, 2));

  try {
    console.log('⚡ Evaluating alerts...');
    const alerts = await engine.evaluateAlerts([testConfig], testContext);

    console.log('🎯 Result:', alerts.length, 'alerts triggered');
    if (alerts.length > 0) {
      console.log('✅ Alert details:', JSON.stringify(alerts[0], null, 2));
    } else {
      console.log('❌ No alerts triggered - debugging needed');
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

debugAlertEngine();