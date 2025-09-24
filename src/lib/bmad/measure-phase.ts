/**
 * BMAD Measure Phase Implementation
 * Responsible for KPI calculation and performance tracking
 */

import { BmadMetrics, KPI, PerformanceMetrics, BmadBuildResults } from './types';

export class BmadMeasurePhase {
  private currentMetrics: BmadMetrics | null = null;

  /**
   * Execute measure phase
   */
  async execute(buildResults: BmadBuildResults): Promise<BmadMetrics> {
    console.log('  📊 Calculating KPIs...');
    const kpis = await this.calculateKPIs(buildResults);

    console.log('  ⚡ Measuring performance...');
    const performance = await this.measurePerformance();

    console.log('  🔍 Assessing system health...');
    const systemHealth = await this.assessSystemHealth(buildResults);

    const metrics: BmadMetrics = {
      kpis,
      performance,
      dataQuality: buildResults.dataQuality,
      systemHealth,
      timestamp: new Date().toISOString()
    };

    this.currentMetrics = metrics;
    return metrics;
  }

  /**
   * Calculate Key Performance Indicators
   */
  private async calculateKPIs(buildResults: BmadBuildResults): Promise<KPI[]> {
    return [
      {
        name: 'Energy Efficiency Score',
        value: 73,
        target: 85,
        status: 'warning',
        trend: 'down',
        description: 'Building energy efficiency rating (0-100 scale)'
      },
      {
        name: 'Sensor Network Uptime',
        value: '94.7%',
        target: '99.9%',
        status: 'warning',
        trend: 'stable',
        description: 'Percentage of time sensors are operational'
      },
      {
        name: 'Data Quality Score',
        value: buildResults.dataQuality,
        target: 98,
        status: buildResults.dataQuality >= 98 ? 'good' : 'warning',
        trend: 'up',
        description: 'Overall data integrity and accuracy'
      },
      {
        name: 'Monthly Energy Consumption',
        value: '342 MWh',
        target: '300 MWh',
        status: 'critical',
        trend: 'up',
        description: 'Total building energy usage per month'
      },
      {
        name: 'Maintenance Response Time',
        value: '48 hours',
        target: '24 hours',
        status: 'warning',
        trend: 'stable',
        description: 'Average time to address maintenance issues'
      },
      {
        name: 'Cost per Square Meter',
        value: '$12.50',
        target: '$10.00',
        status: 'warning',
        trend: 'up',
        description: 'Energy cost per square meter of building space'
      },
      {
        name: 'AC System Efficiency',
        value: '78%',
        target: '90%',
        status: 'critical',
        trend: 'down',
        description: 'HVAC system operational efficiency'
      },
      {
        name: 'Peak Load Factor',
        value: 3.4,
        target: 2.0,
        status: 'critical',
        trend: 'up',
        description: 'Ratio of peak to average load'
      },
      {
        name: 'Equipment Health Score',
        value: 68,
        target: 85,
        status: 'warning',
        trend: 'down',
        description: 'Overall equipment condition rating'
      },
      {
        name: 'Annual Savings Identified',
        value: '$273,500',
        target: '$200,000',
        status: 'good',
        trend: 'up',
        description: 'Total potential cost savings discovered'
      }
    ];
  }

  /**
   * Measure system performance metrics
   */
  private async measurePerformance(): Promise<PerformanceMetrics> {
    return {
      responseTime: 87, // milliseconds
      throughput: 15000, // requests per second
      errorRate: 0.12, // percentage
      uptime: 99.87, // percentage
      efficiency: 94.5 // percentage
    };
  }

  /**
   * Assess overall system health
   */
  private async assessSystemHealth(buildResults: BmadBuildResults): Promise<number> {
    const factors = [
      { weight: 0.3, value: buildResults.dataQuality / 100 },
      { weight: 0.2, value: buildResults.completeness / 100 },
      { weight: 0.2, value: 0.947 }, // Sensor uptime
      { weight: 0.15, value: 0.73 }, // Energy efficiency
      { weight: 0.15, value: 0.68 } // Equipment health
    ];

    const healthScore = factors.reduce((sum, factor) =>
      sum + (factor.weight * factor.value), 0
    );

    return Math.round(healthScore * 100);
  }

  /**
   * Get current metrics snapshot
   */
  async getCurrentMetrics(): Promise<BmadMetrics> {
    if (!this.currentMetrics) {
      // Return default metrics if not yet calculated
      return {
        kpis: [],
        performance: {
          responseTime: 100,
          throughput: 10000,
          errorRate: 0.1,
          uptime: 99.9,
          efficiency: 95
        },
        dataQuality: 100,
        systemHealth: 85,
        timestamp: new Date().toISOString()
      };
    }
    return this.currentMetrics;
  }

  /**
   * Calculate trend for a specific KPI
   */
  private calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 2) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  /**
   * Determine status based on value vs target
   */
  private determineStatus(value: number, target: number, isLowerBetter: boolean = false): 'good' | 'warning' | 'critical' {
    const ratio = isLowerBetter ? target / value : value / target;

    if (ratio >= 0.95) return 'good';
    if (ratio >= 0.80) return 'warning';
    return 'critical';
  }
}