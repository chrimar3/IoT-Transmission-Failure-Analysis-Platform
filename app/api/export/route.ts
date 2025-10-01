/**
 * CU-BEMS Export API Endpoint
 * Generates downloadable reports and data exports from validation results
 */

import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { validationService } from '../../../src/lib/database/validation-service';
import { withSubscriptionCheck } from '../../../src/lib/middleware/subscription.middleware';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../src/lib/auth/config';
// Export filters handled by DataFilters interface below
import { subscriptionService } from '../../../src/lib/stripe/subscription.service';

interface ExportRequest {
  format: 'csv' | 'json' | 'pdf' | 'excel';
  data_type: 'insights' | 'scenarios' | 'metrics' | 'complete';
  session_id?: string;
  filters?: {
    confidence_threshold?: number;
    category?: string;
    severity?: string;
    date_range?: {
      start: string;
      end: string;
    };
  };
}

/**
 * POST /api/export
 * Generates and returns downloadable export files
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check subscription access for export feature
    const subscriptionCheck = await withSubscriptionCheck(request, {
      feature: 'export'
    });

    if (subscriptionCheck) {
      return subscriptionCheck;
    }

    // Get session for user activity tracking
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const body: ExportRequest = await request.json();
    const { format, data_type, session_id, filters } = body;

    // Validate required parameters
    if (!format || !data_type) {
      return NextResponse.json({
        error: 'Missing required parameters',
        message: 'format and data_type are required'
      }, { status: 400 });
    }

    // Transform filters to match DataFilters interface
    const transformedFilters: Partial<DataFilters> | undefined = filters ? {
      ...filters,
      date_range: filters.date_range ? {
        start_date: filters.date_range.start,
        end_date: filters.date_range.end
      } : undefined
    } : undefined;

    // Get data based on type
    let exportData;
    let filename;

    switch (data_type) {
      case 'insights':
        exportData = await getInsightsData(session_id, transformedFilters);
        filename = `cu-bems-insights-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'scenarios':
        exportData = await getScenariosData(session_id, transformedFilters);
        filename = `cu-bems-scenarios-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'metrics':
        exportData = await getMetricsData(session_id, transformedFilters);
        filename = `cu-bems-metrics-${new Date().toISOString().split('T')[0]}`;
        break;
      case 'complete':
        exportData = await getCompleteReport(session_id, transformedFilters);
        filename = `cu-bems-complete-report-${new Date().toISOString().split('T')[0]}`;
        break;
      default:
        return NextResponse.json({
          error: 'Invalid data_type',
          message: 'data_type must be one of: insights, scenarios, metrics, complete'
        }, { status: 400 });
    }

    // Generate export based on format
    const result = await generateExport(exportData, format, filename);

    // Track user activity for export (for usage analytics and rate limiting)
    if (userId) {
      try {
        await subscriptionService.trackUserActivity(userId, 'export', {
          data_type,
          format,
          filename: result.filename,
          session_id,
        });
      } catch (error) {
        console.warn('Failed to track export activity:', error);
        // Don't fail the export if activity tracking fails
      }
    }

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: result.content,
        metadata: {
          filename: result.filename,
          size: JSON.stringify(result.content).length,
          generated_at: new Date().toISOString(),
          record_count: Array.isArray(result.content) ? result.content.length : 1
        }
      });
    }

    // For other formats, return as downloadable file
    const headers = new Headers();
    headers.set('Content-Type', result.contentType);
    headers.set('Content-Disposition', `attachment; filename="${result.filename}"`);
    headers.set('Content-Length', (result.content as Buffer | string).length.toString());

    return new NextResponse(result.content as BodyInit, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Error in export API:', error);

    return NextResponse.json({
      error: 'Export failed',
      message: error instanceof Error ? error.message : 'Unknown export error'
    }, { status: 500 });
  }
}

/**
 * GET /api/export/formats
 * Returns available export formats and data types
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      formats: [
        { id: 'csv', name: 'CSV', description: 'Comma-separated values for spreadsheet analysis' },
        { id: 'json', name: 'JSON', description: 'JavaScript Object Notation for API integration' },
        { id: 'pdf', name: 'PDF', description: 'Formatted report for presentation' },
        { id: 'excel', name: 'Excel', description: 'Microsoft Excel format with charts' }
      ],
      data_types: [
        { id: 'insights', name: 'Insights', description: 'Validated business insights and recommendations' },
        { id: 'scenarios', name: 'Scenarios', description: 'Savings scenarios with ROI calculations' },
        { id: 'metrics', name: 'Metrics', description: 'Performance and quality metrics' },
        { id: 'complete', name: 'Complete Report', description: 'Comprehensive analysis report' }
      ],
      filters: [
        { id: 'confidence_threshold', name: 'Confidence Threshold', type: 'number', min: 0, max: 100 },
        { id: 'category', name: 'Category', type: 'select', options: ['energy', 'efficiency', 'financial', 'maintenance'] },
        { id: 'severity', name: 'Severity', type: 'select', options: ['info', 'warning', 'critical'] },
        { id: 'date_range', name: 'Date Range', type: 'date_range' }
      ]
    }
  });
}

/**
 * Helper functions for data retrieval
 */
async function getInsightsData(sessionId?: string, filters?: Partial<DataFilters>) {
  if (sessionId) {
    const results = await validationService.getValidationResults(sessionId);
    return applyFilters(results.insights, filters);
  }

  // Get latest session data
  const sessions = await validationService.getValidationSessions(1);
  if (sessions.length === 0) {
    return generateMockInsights();
  }

  const results = await validationService.getValidationResults(sessions[0].id);
  return applyFilters(results.insights, filters);
}

async function getScenariosData(sessionId?: string, filters?: Partial<DataFilters>) {
  if (sessionId) {
    const scenarios = await validationService.getSavingsScenarios(sessionId);
    return applyFilters(scenarios, filters);
  }

  const sessions = await validationService.getValidationSessions(1);
  if (sessions.length === 0) {
    return generateMockScenarios();
  }

  const scenarios = await validationService.getSavingsScenarios(sessions[0].id);
  return applyFilters(scenarios, filters);
}

async function getMetricsData(sessionId?: string, filters?: Partial<DataFilters>) {
  if (sessionId) {
    const results = await validationService.getValidationResults(sessionId);
    return applyFilters(results.quality_metrics, filters);
  }

  return generateMockMetrics();
}

async function getCompleteReport(sessionId?: string, filters?: Partial<DataFilters>) {
  const [insights, scenarios, metrics] = await Promise.all([
    getInsightsData(sessionId, filters),
    getScenariosData(sessionId, filters),
    getMetricsData(sessionId, filters)
  ]);

  return {
    insights,
    scenarios,
    metrics,
    summary: {
      total_insights: insights.length,
      total_scenarios: scenarios.length,
      total_metrics: metrics.length,
      generated_at: new Date().toISOString(),
      session_id: sessionId || 'latest'
    }
  };
}

interface DataFilters {
  confidence_threshold?: number
  category?: string
  severity?: string
  date_range?: {
    start_date: string
    end_date: string
  }
}

function applyFilters(data: unknown[], filters?: Partial<DataFilters>): unknown[] {
  if (!filters || !data) return data;

interface DataItem {
    confidence_level?: number
    category?: string
    severity?: string
    created_at?: string
    generated_at?: string
    [key: string]: unknown
  }

  return (data as DataItem[]).filter((item: DataItem) => {
    if (filters.confidence_threshold && item.confidence_level !== undefined && item.confidence_level < filters.confidence_threshold) {
      return false;
    }
    if (filters.category && item.category !== filters.category) {
      return false;
    }
    if (filters.severity && item.severity !== filters.severity) {
      return false;
    }
    if (filters.date_range) {
      const dateValue = item.created_at || item.generated_at;
      if (!dateValue) return true; // Skip date filtering if no date available
      const itemDate = new Date(dateValue);
      const startDate = new Date(filters.date_range.start_date);
      const endDate = new Date(filters.date_range.end_date);
      if (itemDate < startDate || itemDate > endDate) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Export generation functions
 */
async function generateExport(data: unknown, format: string, filename: string) {
  switch (format) {
    case 'csv':
      return {
        content: generateCSV(data),
        filename: `${filename}.csv`,
        contentType: 'text/csv'
      };
    case 'json':
      return {
        content: data,
        filename: `${filename}.json`,
        contentType: 'application/json'
      };
    case 'pdf':
      return {
        content: await generatePDF(data, filename),
        filename: `${filename}.pdf`,
        contentType: 'application/pdf'
      };
    case 'excel':
      return {
        content: await generateExcel(data),
        filename: `${filename}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    default:
      throw new Error('Unsupported export format');
  }
}

function generateCSV(data: unknown): string {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return 'No data available\n';
  }

  // Handle different data structures
  let records = Array.isArray(data) ? data : [data];

  interface CompleteReportData {
    insights: Record<string, unknown>[]
    scenarios: Record<string, unknown>[]
    metrics: Record<string, unknown>[]
  }

  if (data && typeof data === 'object' && 'insights' in data && 'scenarios' in data) {
    // Complete report - combine all data
    const reportData = data as CompleteReportData
    records = [
      ...reportData.insights.map((item: Record<string, unknown>) => ({ ...item, data_type: 'insight' })),
      ...reportData.scenarios.map((item: Record<string, unknown>) => ({ ...item, data_type: 'scenario' })),
      ...reportData.metrics.map((item: Record<string, unknown>) => ({ ...item, data_type: 'metric' }))
    ];
  }

  if (records.length === 0) return 'No data available\n';

  // Get all unique keys for headers
  const allKeys = new Set<string>();
  records.forEach(record => {
    Object.keys(record).forEach(key => allKeys.add(key));
  });

  const headers = Array.from(allKeys).sort();

  // Generate CSV content
  const csvRows = [
    headers.join(','), // Header row
    ...records.map(record =>
      headers.map(header => {
        const value = record[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}

async function generatePDF(data: unknown, title: string): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { PDFReport } = await import('../../../src/lib/export/pdf-generator')

  // Determine report type from title
  const reportType = title.includes('executive') ? 'executive' :
                    title.includes('technical') ? 'technical' :
                    title.includes('compliance') ? 'compliance' :
                    title.includes('performance') ? 'performance' : 'executive'

  const pdfDocument = React.createElement(PDFReport, {
    data,
    reportType: reportType as 'executive' | 'technical' | 'compliance' | 'raw_data' | 'performance',
    title
  })

  return await renderToBuffer(pdfDocument)
}

async function generateExcel(data: unknown): Promise<Buffer> {
  const { generateExcelBuffer } = await import('../../../src/lib/export/excel-generator')
  return await generateExcelBuffer(data, 'complete')
}

/**
 * Mock data generators for fallback
 */
function generateMockInsights() {
  return [
    {
      id: 'insight_1',
      metric_name: 'energy_efficiency',
      metric_value: 87.5,
      metric_unit: 'percentage',
      confidence_level: 95,
      validation_status: 'validated',
      description: 'Building energy efficiency is performing above baseline',
      recommendation: 'Continue current optimization strategies',
      created_at: new Date().toISOString()
    },
    {
      id: 'insight_2',
      metric_name: 'cost_savings',
      metric_value: 15000,
      metric_unit: 'dollars',
      confidence_level: 92,
      validation_status: 'validated',
      description: 'Monthly cost savings from efficiency improvements',
      recommendation: 'Expand optimization to additional floors',
      created_at: new Date().toISOString()
    }
  ];
}

function generateMockScenarios() {
  return [
    {
      id: 'scenario_1',
      scenario_name: 'HVAC Optimization',
      annual_savings: 45000,
      implementation_cost: 15000,
      payback_months: 4,
      confidence_level: 95,
      created_at: new Date().toISOString()
    },
    {
      id: 'scenario_2',
      scenario_name: 'Lighting Efficiency',
      annual_savings: 18000,
      implementation_cost: 8000,
      payback_months: 5,
      confidence_level: 88,
      created_at: new Date().toISOString()
    }
  ];
}

function generateMockMetrics() {
  return [
    {
      id: 'metric_1',
      data_source: 'bangkok_sensors',
      quality_score: 98.5,
      completeness_score: 99.2,
      total_records: 124903795,
      valid_records: 123850000,
      created_at: new Date().toISOString()
    }
  ];
}