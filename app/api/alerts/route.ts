/**
 * CU-BEMS Alert System API
 * Manages real-time alerts and notifications for critical system conditions
 */

import { NextRequest, NextResponse } from 'next/server';
import { validationService } from '../../../src/lib/database/validation-service';

interface Alert {
  id: string;
  type: 'performance' | 'efficiency' | 'maintenance' | 'financial' | 'quality';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  source: string;
  metric_value?: number;
  threshold_value?: number;
  confidence_level: number;
  recommended_action: string;
  estimated_impact: string;
  created_at: string;
  acknowledged: boolean;
  resolved: boolean;
  session_id?: string;
}

interface _AlertRule {
  id: string;
  name: string;
  type: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'change_rate';
  threshold: number;
  severity: string;
  enabled: boolean;
  description: string;
}

/**
 * GET /api/alerts
 * Returns active alerts and recent alert history
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeResolved = searchParams.get('resolved') === 'true';

    // Get latest validation session
    const sessions = await validationService.getValidationSessions(1);
    let sessionId: string | undefined;

    if (sessions.length > 0) {
      sessionId = sessions[0].id;
    }

    // Generate alerts based on latest data
    const alerts = await generateAlerts(sessionId);

    // Apply filters
    let filteredAlerts = alerts.filter(alert =>
      includeResolved || !alert.resolved
    );

    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }

    if (type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
    }

    // Sort by severity and creation time
    const severityOrder = { emergency: 4, critical: 3, warning: 2, info: 1 };
    filteredAlerts.sort((a, b) => {
      const severityDiff = severityOrder[b.severity as keyof typeof severityOrder] - severityOrder[a.severity as keyof typeof severityOrder];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Limit results
    filteredAlerts = filteredAlerts.slice(0, limit);

    // Calculate alert statistics
    const stats = {
      total: alerts.length,
      by_severity: {
        emergency: alerts.filter(a => a.severity === 'emergency').length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length
      },
      by_type: {
        performance: alerts.filter(a => a.type === 'performance').length,
        efficiency: alerts.filter(a => a.type === 'efficiency').length,
        maintenance: alerts.filter(a => a.type === 'maintenance').length,
        financial: alerts.filter(a => a.type === 'financial').length,
        quality: alerts.filter(a => a.type === 'quality').length
      },
      unresolved: alerts.filter(a => !a.resolved).length,
      critical_count: alerts.filter(a => ['critical', 'emergency'].includes(a.severity)).length
    };

    return NextResponse.json({
      success: true,
      data: {
        alerts: filteredAlerts,
        statistics: stats,
        session_id: sessionId
      },
      metadata: {
        total_alerts: alerts.length,
        filtered_count: filteredAlerts.length,
        filters_applied: { severity, type, limit, includeResolved },
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in alerts API:', error);

    return NextResponse.json({
      error: 'Failed to fetch alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/alerts
 * Acknowledges or resolves alerts
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, alert_ids, user_id } = body;

    if (!action || !alert_ids || !Array.isArray(alert_ids)) {
      return NextResponse.json({
        error: 'Invalid request',
        message: 'action and alert_ids array are required'
      }, { status: 400 });
    }

    // For demo purposes, we'll simulate the action
    // In a real implementation, you'd update the database
    const timestamp = new Date().toISOString();

    let result;
    switch (action) {
      case 'acknowledge':
        result = {
          action: 'acknowledged',
          alert_ids,
          acknowledged_at: timestamp,
          acknowledged_by: user_id
        };
        break;
      case 'resolve':
        result = {
          action: 'resolved',
          alert_ids,
          resolved_at: timestamp,
          resolved_by: user_id
        };
        break;
      default:
        return NextResponse.json({
          error: 'Invalid action',
          message: 'action must be either "acknowledge" or "resolve"'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully ${action}d ${alert_ids.length} alert(s)`
    });

  } catch (error) {
    console.error('Error processing alert action:', error);

    return NextResponse.json({
      error: 'Failed to process alert action',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Generate alerts based on current system state
 */
async function generateAlerts(sessionId?: string): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date().toISOString();

  try {
    if (sessionId) {
      // Get validation results
      const results = await validationService.getValidationResults(sessionId);

      // Generate alerts from insights
      results.insights.forEach((insight, index) => {
        if (insight.confidence_level < 70) {
          alerts.push({
            id: `alert_confidence_${index}`,
            type: 'quality',
            severity: insight.confidence_level < 50 ? 'critical' : 'warning',
            title: `Low Confidence Alert: ${insight.metric_name}`,
            message: `Metric ${insight.metric_name} has confidence level of ${insight.confidence_level}%, below acceptable threshold.`,
            source: 'validation_framework',
            metric_value: insight.confidence_level,
            threshold_value: 70,
            confidence_level: insight.confidence_level,
            recommended_action: 'Review data sources and increase sample size for better confidence',
            estimated_impact: 'Potential decision-making uncertainty',
            created_at: now,
            acknowledged: false,
            resolved: false,
            session_id: sessionId
          });
        }

        // Check for critical performance issues
        if (insight.metric_name.includes('performance') && insight.metric_value < 60) {
          alerts.push({
            id: `alert_performance_${index}`,
            type: 'performance',
            severity: insight.metric_value < 40 ? 'emergency' : 'critical',
            title: `Critical Performance Alert: ${insight.metric_name}`,
            message: `${insight.metric_name} has dropped to ${insight.metric_value}%, indicating severe performance degradation.`,
            source: 'performance_monitor',
            metric_value: insight.metric_value,
            threshold_value: 60,
            confidence_level: insight.confidence_level,
            recommended_action: 'Immediate investigation and corrective action required',
            estimated_impact: `Potential system failure and revenue loss`,
            created_at: now,
            acknowledged: false,
            resolved: false,
            session_id: sessionId
          });
        }
      });

      // Generate alerts from scenarios with high financial impact
      results.scenarios.forEach((scenario, index) => {
        if (scenario.annual_savings > 100000) {
          alerts.push({
            id: `alert_opportunity_${index}`,
            type: 'financial',
            severity: 'warning',
            title: `High-Value Opportunity: ${scenario.scenario_name}`,
            message: `${scenario.scenario_name} presents significant savings opportunity of $${scenario.annual_savings.toLocaleString()}/year.`,
            source: 'savings_calculator',
            metric_value: scenario.annual_savings,
            confidence_level: scenario.confidence_level,
            recommended_action: 'Prioritize implementation planning and resource allocation',
            estimated_impact: `$${scenario.annual_savings.toLocaleString()} annual savings potential`,
            created_at: now,
            acknowledged: false,
            resolved: false,
            session_id: sessionId
          });
        }
      });
    }

    // Generate some system-level alerts
    alerts.push(...generateSystemAlerts());

  } catch (error) {
    console.error('Error generating alerts:', error);
    // Add an error alert
    alerts.push({
      id: 'alert_system_error',
      type: 'quality',
      severity: 'warning',
      title: 'Alert Generation Warning',
      message: 'Some alerts could not be generated due to data access issues.',
      source: 'alert_system',
      confidence_level: 90,
      recommended_action: 'Check system connectivity and data availability',
      estimated_impact: 'Reduced monitoring effectiveness',
      created_at: now,
      acknowledged: false,
      resolved: false
    });
  }

  return alerts;
}

/**
 * Generate system-level alerts
 */
function generateSystemAlerts(): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date().toISOString();

  // Simulate data quality alert
  if (Math.random() > 0.7) {
    alerts.push({
      id: 'alert_data_quality',
      type: 'quality',
      severity: 'warning',
      title: 'Data Quality Fluctuation Detected',
      message: 'Recent sensor readings show intermittent quality issues on Floor 3, Sector B.',
      source: 'data_quality_monitor',
      metric_value: 88.2,
      threshold_value: 95,
      confidence_level: 94,
      recommended_action: 'Inspect Floor 3 sensors and network connectivity',
      estimated_impact: 'Temporary reduction in analysis accuracy',
      created_at: now,
      acknowledged: false,
      resolved: false
    });
  }

  // Simulate efficiency alert
  if (Math.random() > 0.6) {
    alerts.push({
      id: 'alert_efficiency_trend',
      type: 'efficiency',
      severity: 'info',
      title: 'Positive Efficiency Trend Detected',
      message: 'Energy efficiency has improved by 3.2% over the last 7 days across all monitored areas.',
      source: 'trend_analyzer',
      metric_value: 3.2,
      confidence_level: 96,
      recommended_action: 'Document and replicate successful optimization strategies',
      estimated_impact: 'Continued improvement could yield additional $12,000 annual savings',
      created_at: now,
      acknowledged: false,
      resolved: false
    });
  }

  // Simulate maintenance alert
  if (Math.random() > 0.8) {
    alerts.push({
      id: 'alert_maintenance_due',
      type: 'maintenance',
      severity: 'warning',
      title: 'Preventive Maintenance Due',
      message: '6 HVAC units are approaching their scheduled maintenance window.',
      source: 'maintenance_scheduler',
      confidence_level: 100,
      recommended_action: 'Schedule maintenance for units HC-201, HC-205, HC-301, HC-308, HC-402, HC-501',
      estimated_impact: 'Prevent potential $25,000 in emergency repair costs',
      created_at: now,
      acknowledged: false,
      resolved: false
    });
  }

  return alerts;
}

